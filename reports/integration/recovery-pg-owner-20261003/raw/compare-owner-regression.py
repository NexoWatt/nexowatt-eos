#!/usr/bin/python3
"""Replay one modelled preflight fixture against exact old and current source.

Usage: python3 compare-owner-regression.py /path/to/original/recover-sudo-abort.py
The original helper can be obtained from repository commit
966b5d52751a81925e3572dc5d65f3a772539f33, tools/bootstrap/recover-sudo-abort.py.
This is a local regression, not execution on the user's Pi.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[4]
BEFORE_SHA = "66104780fda7c92368e21d5baf88528ba7788a8055ccfc091d919c3a161efce4"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    if len(sys.argv) != 2:
        raise SystemExit("expected exact original helper path")
    before = Path(sys.argv[1])
    after = ROOT / "tools/bootstrap/recover-sudo-abort.py"
    if hashlib.sha256(before.read_bytes()).hexdigest() != BEFORE_SHA:
        raise SystemExit("original helper SHA-256 mismatch")
    fixture = load("regression_fixture", ROOT / "tests/bootstrap/recover-sudo-abort.test.py")
    results = []
    for label, source, expected in (("before", before, "RECOVERY_PATH_OWNER"),
                                    ("after", after, "REACHED_CLUSTER_CHECK")):
        helper = load("recovery_" + label, source)
        try:
            fixture.observed_preflight_until_cluster_check(helper)
        except fixture.ReachedClusterCheck:
            outcome = "REACHED_CLUSTER_CHECK"
        except helper.Rejected as error:
            outcome = str(error)
        else:
            outcome = "UNEXPECTED_RETURN"
        results.append({"source": label, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                        "expected": expected, "actual": outcome, "passed": outcome == expected})
    print(json.dumps({"kind": "eos-pg-owner-preflight-regression", "results": results,
                      "modelledMetadata": {"paths": ["/etc/postgresql", "/var/lib/postgresql"],
                                           "uid": 102, "gid": 106, "mode": "0755", "empty": True},
                      "osCommandsExecuted": False, "accountMutationsExecuted": False,
                      "piInstallationExecuted": False}, indent=2))
    return 0 if all(row["passed"] for row in results) else 1


if __name__ == "__main__":
    sys.exit(main())
