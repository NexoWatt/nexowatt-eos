#!/usr/bin/env python3
"""Run only PostgreSQL contract doubles, bind evidence to unchanged source.

Set EOS_PG_TEST_NODE and EOS_PG_TEST_NODE_PATH to the already prepared, pinned
Node executable and module tree. This does not install or connect to a database.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[4]
REPORT = ROOT / "reports/integration/postgresql"
TESTS = ["store.test.cjs", "store-review.test.cjs", "objects.test.cjs",
         "states.test.cjs", "controller-profile.test.cjs"]


def bind(path):
    data = path.read_bytes()
    return {"path": str(path.relative_to(ROOT)), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def main():
    node = Path(os.environ["EOS_PG_TEST_NODE"]).resolve(strict=True)
    module_path = os.environ["EOS_PG_TEST_NODE_PATH"]
    files = sorted(p for p in (ROOT / "runtime/postgresql").rglob("*") if p.is_file())
    files += [ROOT / "tests/postgresql" / name for name in TESTS]
    files += [Path(__file__).resolve()]
    before = [bind(p) for p in files]
    command = [str(node), "--test", "--test-reporter=tap"]
    command += [str((ROOT / "tests/postgresql" / name).relative_to(ROOT)) for name in TESTS]
    env = dict(os.environ, NODE_PATH=module_path)
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    run = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, timeout=90)
    stdout = REPORT / "raw/contracts-final.tap"
    stderr = REPORT / "raw/contracts-final.stderr.log"
    stdout.write_bytes(run.stdout)
    stderr.write_bytes(run.stderr)
    after = [bind(p) for p in files]
    counts = {key: int(value) for key, value in re.findall(
        rb"^# (tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$", run.stdout, re.M)}
    counts = {key.decode(): value for key, value in counts.items()}
    passed = (run.returncode == 0 and before == after and counts.get("fail") == 0
              and counts.get("pass", 0) > 0 and counts.get("skipped") == 0)
    result = {"schemaVersion": 1, "kind": "source-bound-contract-double-tests",
        "startedAt": started, "completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "PASS" if passed else "REVIEW_REQUIRED", "exitCode": run.returncode,
        "command": command, "nodeVersion": subprocess.check_output([str(node), "--version"], text=True).strip(),
        "nodeSha256": hashlib.sha256(node.read_bytes()).hexdigest(), "modulePath": module_path,
        "counts": counts, "sourceUnchangedDuringRun": before == after,
        "sourceBindings": before, "evidenceBindings": [bind(stdout), bind(stderr)],
        "scope": "Five suites: Store SQL responses, independent Store review doubles, actual 7.2.2 Objects domain class with FakeStore, States FakeStore, offline controller assembly fixtures. Repeats the same focused cases from component reports; counts are not additional to them.",
        "limitations": ["No native PostgreSQL server or socket", "No TLS handshake", "No full controller process", "No Pi or physical adapter", "Not a penetration test or CRA/IEC conformity proof"]}
    (REPORT / "contracts-final.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"status": result["status"], "counts": counts, "sourceUnchanged": before == after}))
    raise SystemExit(0 if passed else 1)


if __name__ == "__main__":
    main()
