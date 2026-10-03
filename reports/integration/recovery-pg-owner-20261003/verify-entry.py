#!/usr/bin/env python3
"""Build-host byte/syntax check; never execute the installation entry."""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
ENTRY = ROOT / "delivery/public-entry-test3-r4-recovery2"


def identity(data):
    return {"blob": hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest(),
            "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}


def main():
    report = json.loads((ENTRY / "preparation.json").read_bytes())
    script = (ENTRY / "install.sh").read_bytes()
    assert identity(script) == report["installer"]
    assert report["entryRevision"] == 2
    text = script.decode("utf-8")
    decoded = {}
    for marker in ("EOS_PYTHON_BASE64", "EOS_RECOVERY_BASE64", "EOS_CONFIG_BASE64"):
        encoded = text.split("<<'" + marker + "'\n")[1].split("\n" + marker)[0]
        decoded[marker] = base64.b64decode(encoded.replace("\n", ""), validate=True)
    preparer = (ROOT / "delivery/bootstrap-test3-r4/prepare-host.py").read_bytes()
    recovery = (ROOT / "tools/bootstrap/recover-sudo-abort.py").read_bytes()
    assert decoded["EOS_PYTHON_BASE64"] == preparer
    assert decoded["EOS_RECOVERY_BASE64"] == recovery
    assert identity(preparer) == report["preparer"]
    assert identity(recovery) == report["recovery"]
    assert hashlib.sha256(preparer).hexdigest() == "3832bfcc5ddd5dfc13d4314e1119f9eb9fb76e7b5e534a3ab07ad6627b78ccff"
    spec = importlib.util.spec_from_file_location("preparer", ROOT / "delivery/bootstrap-test3-r4/prepare-host.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    config = json.loads(decoded["EOS_CONFIG_BASE64"])
    module.validate_config(config)
    assert config == report["config"]
    subprocess.run(["/bin/bash", "-n"], input=script, check=True)
    old = (ROOT / "delivery/public-entry-test3-r4/install.sh").read_bytes()
    assert hashlib.sha256(old).hexdigest() == "f6ad2f72f5c50d99dc91097867a83b83790512290fd4a64e1c3c80744e968c84"
    command = ENTRY / "INSTALL_COMMAND.txt"
    if command.exists():
        subprocess.run(["/bin/bash", "-n"], input=command.read_bytes(), check=True)
    print(json.dumps({"schemaVersion": 1, "entryRevision": 2, "entryBytesAndSyntaxPassed": True,
        "embeddedPreparerAndRecoveryExact": True, "actualPreparerAcceptsConfig": True,
        "previousPublishedInstallerUnchanged": True, "commandSyntaxChecked": command.exists(),
        "installer": identity(script), "preparer": identity(preparer), "recovery": identity(recovery),
        "installationExecuted": False, "productionReleaseApproved": False}, indent=2))


if __name__ == "__main__":
    main()
