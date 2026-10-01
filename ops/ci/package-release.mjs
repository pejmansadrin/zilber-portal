import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = ".next/standalone";
fs.cpSync("public", `${root}/public`, { recursive: true });
fs.cpSync(".next/static", `${root}/.next/static`, { recursive: true });
// Environment files can be traced by Next; configuration belongs on the host.
for (const name of fs.readdirSync(root)) if (name.startsWith(".env")) fs.rmSync(`${root}/${name}`);
fs.writeFileSync(`${root}/portal-release.json`, JSON.stringify({
  version: process.env.CI_COMMIT_TAG || "main",
  commit: process.env.CI_COMMIT_SHA,
  pipeline: process.env.CI_PIPELINE_ID,
}));
execFileSync("tar", ["-czf", "portal-release.tar.gz", "-C", root, "."]);
const hash = createHash("sha256").update(fs.readFileSync("portal-release.tar.gz")).digest("hex");
fs.writeFileSync("portal-release.tar.gz.sha256", `${hash}  portal-release.tar.gz\n`);
console.log("Standalone release packaged with public assets and checksum");
