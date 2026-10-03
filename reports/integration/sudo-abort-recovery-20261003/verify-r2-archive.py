#!/usr/bin/env python3
"""Read the actual historical archive; no extraction or target-code execution."""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[3]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("recovery", ROOT / "tools/bootstrap/recover-sudo-abort.py")
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)
directory = ROOT / "delivery/test-pi-0.2.0-test.3-r2"
delivery = json.loads((directory / "delivery.json").read_bytes())
archive_path = directory / delivery["archive"]
with archive_path.open("rb") as stream:
    assert hashlib.file_digest(stream, "sha256").hexdigest() == delivery["sha256"]
raw = {}
observed = {}
with tarfile.open(archive_path, "r|gz") as archive:
    for entry in archive:
        if entry.isdir():
            continue
        assert entry.isfile(), "Unexpected archive entry"
        with archive.extractfile(entry) as stream:
            if entry.name in ("bundle/manifest.json", "bundle/manifest.sig"):
                raw[entry.name] = stream.read()
            else:
                assert entry.name.startswith("bundle/payload/"), "Unexpected non-payload file"
                name = entry.name.removeprefix("bundle/payload/")
                assert name not in observed
                observed[name] = {"path": name, "size": entry.size, "mode": entry.mode,
                                  "sha256": hashlib.file_digest(stream, "sha256").hexdigest()}
manifest_bytes = raw["bundle/manifest.json"]
signature = raw["bundle/manifest.sig"]
key = (directory / "release-public.pem").read_bytes()
assert recovery.digest(manifest_bytes) == recovery.RELEASE == delivery["releaseId"]
assert recovery.digest(signature) == recovery.SIGNATURE_SHA256
assert recovery.digest(key) == recovery.PUBLIC_KEY_SHA256 == delivery["signingPublicKeySha256"]
manifest = json.loads(manifest_bytes)
assert manifest["files"] == [observed[name] for name in sorted(observed)]
assert len(observed) == 22202 == delivery["signedFiles"]
assert manifest["sequence"] == 5 and manifest["platforms"] == ["linux-arm64"]
check = subprocess.run(["node", "-e", "const fs=require('node:fs'),c=require('node:crypto');"
                        "const a=JSON.parse(fs.readFileSync(0,'utf8'));"
                        "if(!c.verify(null,Buffer.from(a.manifest,'base64'),a.key,"
                        "Buffer.from(a.signature,'base64')))process.exit(1);"],
                       input=json.dumps({"key": key.decode("ascii"),
                                         "manifest": base64.b64encode(manifest_bytes).decode("ascii"),
                                         "signature": base64.b64encode(signature).decode("ascii")}).encode(),
                       capture_output=True, check=True)
assert not check.stdout and not check.stderr
print(json.dumps({"ok": True, "releaseId": recovery.RELEASE, "signedFilesReadAndVerified": len(observed),
                  "signatureVerifiedUsing": "manufacturer Node built-in Ed25519; no target code loaded",
                  "helperManifestSignatureAndKeyPinsMatch": True, "archiveSha256": delivery["sha256"],
                  "targetRecoveryExecuted": False, "hardwareAcceptance": "OPEN"}))
