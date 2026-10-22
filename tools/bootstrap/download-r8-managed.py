#!/usr/bin/python3
"""Transport-only R8 migration download, embedded in the hash-pinned public entry.

Reuse the reviewed managed release range transport, never its fresh-host or APT
operations. Only the exact archive pinned by the manufacturer is accepted.
"""
import importlib.util
import json
import os
from pathlib import Path
import re
import sys

_spec = importlib.util.spec_from_file_location("eos_managed_transport", Path(__file__).with_name("prepare-managed-host.py"))
_host = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_host)


def validate(value):
    if (not isinstance(value, dict) or set(value) != {"schemaVersion", "releaseId", "url", "bytes", "sha256"}
            or type(value.get("schemaVersion")) is not int or value["schemaVersion"] != 1
            or not isinstance(value.get("releaseId"), str) or not re.fullmatch(r"[a-f0-9]{64}", value["releaseId"])
            or value.get("url") != "https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-"
            + value["releaseId"] + "/eos-linux-arm64.tar.gz"
            or type(value.get("bytes")) is not int or not 0 < value["bytes"] <= 256 * 1024**2
            or not isinstance(value.get("sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", value["sha256"])):
        _host.fail("R8_MANAGED_DOWNLOAD_CONFIG")
    return value


def download(config_file):
    if sys.platform != "linux" or os.geteuid() != 0:
        _host.fail("R8_MANAGED_DOWNLOAD_ROOT")
    config_file = Path(config_file)
    value = validate(json.loads(_host.private_file(config_file, 8192), object_pairs_hook=_host.unique_object))
    parent = config_file.parent
    _host.trusted_path(parent, directory=True)
    if parent.parent != Path("/root") or not re.fullmatch(r"eos-r8-managed-[A-Za-z0-9]{8}", parent.name):
        _host.fail("R8_MANAGED_DOWNLOAD_STAGE")
    destination = parent / "eos-linux-arm64.tar.gz"
    with open(destination, "xb"):
        pass
    os.chmod(destination, 0o600)
    _host.download_github_asset(value["url"], destination, value["bytes"])
    _host.digest_file(destination, {"bytes": value["bytes"], "sha256": value["sha256"]})
    os.chmod(destination, 0o400)
    return {"ok": True, "archiveHashVerified": True, "signatureVerified": False, "hostChanged": False}


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            _host.fail("R8_MANAGED_DOWNLOAD_USAGE")
        print(json.dumps(download(sys.argv[1])))
    except Exception:
        # No paths, redirected signed URLs, inherited environment or raw errors.
        print(json.dumps({"ok": False, "code": "R8_MANAGED_DOWNLOAD_FAILED"}))
        raise SystemExit(1)
