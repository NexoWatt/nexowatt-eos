#!/usr/bin/env python3
"""Manufacturer readback only; normal Git credential helper, never prints secrets.

Does not install, publish, or read credential-store files. Uses the existing Git
authentication for exactly NexoWatt/nexowatt-eos. Downloaded bytes are streamed
through the same fixed-host, no-redirect implementation used by the installer.
"""
import argparse
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import ssl
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("eos_github", ROOT / "tools/bootstrap/github-download.py")
transport = importlib.util.module_from_spec(spec)
sys.dont_write_bytecode = True
spec.loader.exec_module(transport)


def manufacturer_connection():
    # This readback runs on Windows too. The target's explicit Debian CA path is
    # not available here; use this manufacturer's OS trust store with TLS checks.
    reject_ca_environment()
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.load_default_certs()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    return http.client.HTTPSConnection(transport.HOST, 443, timeout=30, context=context)


transport._connection = manufacturer_connection


def reject_ca_environment():
    if any(name in os.environ for name in ("SSL_CERT_FILE", "SSL_CERT_DIR")):
        raise ValueError("READBACK_CA_ENVIRONMENT_REJECTED")


class Discard:
    def write(self, data):
        return len(data)


def identity(path):
    data = path.read_bytes()
    return {"blob": hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest(),
            "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}


def run(paths):
    reject_ca_environment()
    rows = []
    for name in paths:
        file = (ROOT / name).resolve()
        if not file.is_relative_to(ROOT / "delivery") or not file.is_file():
            raise ValueError("READBACK_SCOPE")
        rows.append({"path": file.relative_to(ROOT).as_posix(), **identity(file)})
    # Standard credential-helper resolution; stdout is captured in process only.
    result = subprocess.run(["git", "-c", "credential.interactive=never", "credential", "fill"],
                            input=b"protocol=https\nhost=github.com\npath=NexoWatt/nexowatt-eos.git\n\n",
                            cwd=ROOT, capture_output=True, timeout=45,
                            env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "never"})
    if result.returncode != 0:
        raise ValueError("READBACK_EXISTING_GIT_AUTH_UNAVAILABLE")
    credentials = dict(line.split(b"=", 1) for line in result.stdout.splitlines() if b"=" in line)
    token = bytearray(credentials.get(b"password", b""))
    credentials.clear()
    del result
    if not token:
        raise ValueError("READBACK_EXISTING_GIT_AUTH_UNAVAILABLE")
    try:
        for row in rows:
            started = time.monotonic()
            transport.fetch_blob(row["blob"], row["sha256"], token, limit=row["bytes"],
                                 expected_bytes=row["bytes"], output=Discard())
            row["verifiedAgainstRemoteBytes"] = True
            row["seconds"] = round(time.monotonic() - started, 3)
    finally:
        token[:] = b"\0" * len(token)
    return {"schemaVersion": 1, "kind": "authenticated-private-github-blob-readback",
            "repository": transport.REPOSITORY, "rows": rows, "tokenPrintedOrPersisted": False,
            "tlsTrust": "manufacturer-OS-default-store; target Debian CA path not tested here",
            "targetInstallationExecuted": False, "hardwareAcceptance": "OPEN"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+")
    parser.add_argument("--report", help="new report beneath reports/integration")
    args = parser.parse_args()
    try:
        report_path = Path(args.report).resolve() if args.report else None
        if report_path and (not report_path.is_relative_to(ROOT / "reports/integration") or report_path.exists()):
            raise ValueError("READBACK_REPORT_SCOPE")
        report = run(args.paths)
        encoded = json.dumps(report, indent=2) + "\n"
        if report_path:
            with report_path.open("x", encoding="utf-8", newline="\n") as stream:
                stream.write(encoded)
        print(encoded, end="")
    except Exception as error:
        code = str(error) if isinstance(error, (ValueError, transport.Rejected)) else "READBACK_FAILED"
        if not __import__("re").fullmatch(r"[A-Z_]{1,80}", code):
            code = "READBACK_FAILED"
        print(json.dumps({"ok": False, "code": code}))
        sys.exit(1)
