"""Test the nginx transition without Docker, network or production writes."""
import importlib.util
import json
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("activate", Path(__file__).resolve().parents[1] / "deploy/activate.py")
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
metadata = {"version": "v0.1.2", "commit": "a" * 40}
new = json.dumps({"status": "ok", **metadata})
old = json.dumps({"status": "ok", "version": "v0.1.1", "commit": "b" * 40})

with patch.object(helper, "run", side_effect=[old, "invalid JSON", new]) as run, patch.object(helper.time, "sleep"):
    helper.verify_https(metadata)
    assert run.call_count == 3
    assert "--resolve" in run.call_args.args
    assert "--insecure" not in run.call_args.args

with patch.object(helper, "run", return_value=old), patch.object(helper.time, "sleep"), patch.object(helper.time, "monotonic", side_effect=[0, 0, 16]):
    try:
        helper.verify_https(metadata)
        raise AssertionError("An old release must not be accepted")
    except RuntimeError as error:
        assert str(error) == "HTTPS version verification failed"

print("PASS: nginx worker transition retries, strict release identity, bounded deadline and TLS verification.")
