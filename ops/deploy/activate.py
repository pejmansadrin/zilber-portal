#!/usr/bin/python3
"""Root-owned forced SSH command: receive and activate a standalone release."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request

ROOT = Path("/opt/zilber-portal")
UPSTREAM = Path("/etc/nginx/conf.d/zilber-portal-upstream.conf")
IMAGE = "zilber-portal-node-runtime:24-vips8.18.6"


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT).decode().strip()


def health(port, metadata):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=5) as response:
        result = json.load(response)
    return result.get("status") == "ok" and result.get("version") == metadata["version"] and result.get("commit") == metadata["commit"]


def activate(release, metadata):
    state_path = ROOT / "current.json"
    old = json.loads(state_path.read_text()) if state_path.exists() else None
    if old and old["version"] == metadata["version"] and old["commit"] == metadata["commit"] and health(old["port"], metadata):
        print(f"Release {metadata['version']} is already active and healthy")
        return
    port = 3302 if old and old["port"] == 3301 else 3301
    name = f"zilber-portal-{port}"
    subprocess.run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    run("docker", "run", "-d", "--name", name, "--restart", "unless-stopped", "--init",
        "--user", "1000:1000", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
        "--memory", "768m", "--cpus", "1.5", "--pids-limit", "150",
        "--log-opt", "max-size=10m", "--log-opt", "max-file=3",
        "--health-cmd", "node -e \"fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\"",
        "--health-interval", "30s", "--health-timeout", "10s", "--health-retries", "3", "--health-start-period", "30s",
        "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--tmpfs", "/app/.next/cache:rw,uid=1000,gid=1000,size=64m",
        "-p", f"127.0.0.1:{port}:3000", "--env-file", str(ROOT / "secrets/runtime.env"),
        "-e", "NODE_ENV=production", "-e", "NEXT_TELEMETRY_DISABLED=1", "-e", "HOSTNAME=0.0.0.0", "-e", "PORT=3000",
        "-e", f"PORTAL_VERSION={metadata['version']}", "-e", f"PORTAL_COMMIT={metadata['commit']}",
        "--mount", f"type=bind,src={release},dst=/app,readonly", "-w", "/app", IMAGE, "node", "server.js")
    try:
        for attempt in range(30):
            try:
                if health(port, metadata):
                    break
            except (OSError, ValueError):
                pass
            time.sleep(1)
        else:
            raise RuntimeError("Candidate health check failed")
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/login", timeout=15) as response:
            if response.status != 200:
                raise RuntimeError("Login smoke check failed")
        previous_upstream = UPSTREAM.read_bytes()
        UPSTREAM.write_text(f"upstream zilber_portal {{ server 127.0.0.1:{port}; keepalive 16; }}\n")
        try:
            run("nginx", "-t")
            run("systemctl", "reload", "nginx")
            result = json.loads(run("curl", "--fail", "--silent", "--show-error", "--max-time", "15",
                                    "--resolve", "portal.zilber.tech:443:127.0.0.1", "https://portal.zilber.tech/api/health"))
            if result.get("version") != metadata["version"] or result.get("commit") != metadata["commit"]:
                raise RuntimeError("HTTPS version verification failed")
        except Exception:
            UPSTREAM.write_bytes(previous_upstream)
            run("nginx", "-t")
            run("systemctl", "reload", "nginx")
            raise
        state = {**metadata, "port": port, "release": str(release), "previous": old}
        # Keep only one previous state; releases themselves remain on disk.
        if state["previous"]:
            state["previous"] = {k: v for k, v in old.items() if k != "previous"}
        temp = ROOT / "current.json.tmp"
        temp.write_text(json.dumps(state))
        temp.replace(state_path)
        print(f"Activated {metadata['version']} ({metadata['commit'][:12]}) on port {port}")
    except Exception:
        subprocess.run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        raise


def main():
    if os.geteuid() != 0:
        raise RuntimeError("Root-owned deployment helper required")
    with (ROOT / "deploy.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if sys.argv[1:] == ["--rollback"]:
            previous = json.loads((ROOT / "current.json").read_text()).get("previous")
            if not previous:
                raise RuntimeError("No previous release")
            activate(Path(previous["release"]), previous)
            return
        if sys.argv[1:]:
            raise RuntimeError("No deployment arguments accepted")
        with tempfile.TemporaryDirectory(prefix="incoming-", dir=ROOT) as tempdir:
            archive = Path(tempdir) / "release.tar.gz"
            size = 0
            with archive.open("wb") as target:
                while chunk := sys.stdin.buffer.read(1024 * 1024):
                    size += len(chunk)
                    if size > 200 * 1024 * 1024:
                        raise RuntimeError("Release archive too large")
                    target.write(chunk)
            unpack = Path(tempdir) / "app"
            unpack.mkdir()
            with tarfile.open(archive, "r:gz") as tar:
                members = tar.getmembers()
                if len(members) > 40000 or sum(m.size for m in members) > 800 * 1024 * 1024:
                    raise RuntimeError("Unpacked release exceeds limits")
                for member in members:
                    if not (member.isdir() or member.isfile() or member.issym()):
                        raise RuntimeError("Unsupported archive entry")
                    if any(part.startswith(".env") for part in Path(member.name).parts):
                        raise RuntimeError("Environment files forbidden in release")
                tar.extractall(unpack, filter="data")
            metadata = json.loads((unpack / "portal-release.json").read_text())
            if not re.fullmatch(r"v\d+\.\d+\.\d+", metadata.get("version", "")) or not re.fullmatch(r"[0-9a-f]{40}", metadata.get("commit", "")):
                raise RuntimeError("Invalid version or commit")
            if not (unpack / "server.js").is_file() or not (unpack / "public").is_dir():
                raise RuntimeError("Incomplete standalone artifact")
            release = ROOT / "releases" / f"{metadata['version']}-{metadata['commit'][:12]}"
            checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
            if release.exists():
                if (release / ".portal-artifact-sha256").read_text() != checksum:
                    raise RuntimeError("Immutable release differs; use a new version tag")
            else:
                shutil.move(unpack, release)
                (release / ".portal-artifact-sha256").write_text(checksum)
            for directory, dirs, files in os.walk(release):
                os.chmod(directory, 0o755)
                for name in files:
                    file = Path(directory) / name
                    if not file.is_symlink():
                        os.chmod(file, 0o644)
            activate(release, metadata)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Deployment failed: {error}", file=sys.stderr)
        sys.exit(1)
