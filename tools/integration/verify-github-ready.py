#!/usr/bin/env python3
"""Read back the real private-GitHub TEST packet without network or host execution."""
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
DELIVERY = "delivery/test-pi-0.2.0-test.3-r3"
RELEASE_SEQUENCE = 6
TRUST_SHA = "470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f"
DER_SHA = "144e9b8328f4ad52a66617347efaae14c28ffc40011f56a7cc9a7377ec00a411"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def identity(file):
    info = file.lstat()
    require(stat.S_ISREG(info.st_mode) and not file.is_symlink(), "regular file required")
    digest = hashlib.sha256()
    blob = hashlib.sha1(b"blob " + str(info.st_size).encode("ascii") + b"\0")
    total = 0
    with file.open("rb") as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b""):
            total += len(data)
            digest.update(data)
            blob.update(data)
    require(total == info.st_size, "file changed while reading")
    return {"blob": blob.hexdigest(), "sha256": digest.hexdigest(), "bytes": total}


def source_hash(file):
    return {"path": file.relative_to(ROOT).as_posix(), **identity(file)}


def read_json(file):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, "duplicate JSON member")
            result[key] = value
        return result
    return json.loads(file.read_bytes(), object_pairs_hook=unique)


def verify(packet):
    preparation = read_json(packet / "preparation.json")
    manifest = read_json(packet / "github-manifest.json")
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location("eos_github_validation_only", ROOT / "tools/bootstrap/github-download.py")
    loader = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loader)  # Definitions only; main/check_host/download are never called.
    require(loader.validate_manifest(manifest) is manifest and manifest["ready"] is True, "ready manifest required")
    require(manifest["deliveryDirectory"] == DELIVERY, "delivery mismatch")
    pins = {}
    for name, field in (("github-download.py", "driver"), ("prepare-host.py", "prepareHost"),
                        ("github-manifest.json", "manifest")):
        pins[field] = identity(packet / name)
        require(pins[field] == preparation[field], "preparation pin mismatch: " + name)
        if name.endswith(".py"):
            require((packet / name).read_bytes() == (ROOT / "tools/bootstrap" / name).read_bytes(), "reviewed source mismatch")
    require(pins["prepareHost"] == manifest["prepareHost"], "helper pin mismatch")
    require(preparation["assets"] == manifest["assets"], "preparation asset mismatch")
    trust = (packet / "license-public-trust.json").read_bytes()
    require(hashlib.sha256(trust).hexdigest() == TRUST_SHA and b"PRIVATE KEY" not in trust, "public trust mismatch")
    keys = read_json(packet / "license-public-trust.json")
    require(set(keys) == {"nexowattEOS"}, "issuer id mismatch")
    pem = keys["nexowattEOS"]
    require(isinstance(pem, str) and pem.startswith("-----BEGIN PUBLIC KEY-----\n")
            and pem.endswith("\n-----END PUBLIC KEY-----\n"), "public SPKI envelope")
    encoded = "".join(pem.splitlines()[1:-1])
    der = base64.b64decode(encoded, validate=True)
    require(base64.b64encode(der).decode("ascii") == encoded, "canonical base64")
    require(der.startswith(bytes.fromhex("302a300506032b6570032100")) and len(der) == 44, "Ed25519 SPKI required")
    require(hashlib.sha256(der).hexdigest() == DER_SHA, "issuer DER mismatch")
    metadata = read_json(ROOT / DELIVERY / "delivery.json")
    require(preparation["licenseTrustSha256"] == TRUST_SHA, "preparation trust mismatch")
    require(preparation["releaseId"] == metadata["releaseId"] and preparation["releaseSequence"] == RELEASE_SEQUENCE,
            "release metadata mismatch")
    require(preparation["releasePublicKeySha256"] == metadata["signingPublicKeySha256"], "release trust mismatch")
    for flag in ("tokenStored", "published", "targetInstallationExecuted", "productionReleaseApproved", "fleetUpdaterImplemented"):
        require(preparation[flag] is False, "preparation claim mismatch")
    require(preparation["hardwareAcceptance"] == "OPEN", "hardware claim mismatch")
    sources = {"installer-kit.zip": packet / "installer-kit.zip",
               "node-v24.21.0-linux-arm64.tar.xz": ROOT / "delivery/test-pi-0.2.0-test.1/node-v24.21.0-linux-arm64.tar.xz",
               metadata["archive"]: ROOT / DELIVERY / metadata["archive"]}
    assets = []
    for row in manifest["assets"]:
        measured = {"name": row["name"], **identity(sources[row["name"]])}
        require(measured == row, "asset bytes/hash mismatch")
        assets.append(measured)

    expected = {}
    for folder in ("runtime", "tools/system", "licenses"):
        for source in (ROOT / folder).rglob("*"):
            require(not source.is_symlink(), "source symlink")
            if source.is_file():
                expected[source.relative_to(ROOT).as_posix()] = source.read_bytes()
    for name in ("tools/bootstrap/first-start.cjs", "tools/integration/test-archive.py",
                 "tools/integration/check-runtime-architecture.cjs", "security/verify-runtime-tls.cjs",
                 "LICENSE", "THIRD_PARTY_NOTICES.md", "docs/history/UPSTREAM_README.md",
                 DELIVERY + "/delivery.json", DELIVERY + "/release-public.pem"):
        expected[name] = (ROOT / name).read_bytes()
    expected["license-public-trust.json"] = trust
    config = {"schemaVersion": 1, "releasePublicKeySha256": metadata["signingPublicKeySha256"], "licenseTrustSha256": TRUST_SHA}
    signed_manifest = None
    with tarfile.open(sources[metadata["archive"]], "r|gz") as archive:
        for entry in archive:
            if entry.name == "bundle/manifest.json":
                require(entry.isfile() and 0 < entry.size <= 16 * 1024**2, "release manifest entry")
                signed_manifest = json.loads(archive.extractfile(entry).read(16 * 1024**2 + 1))
                break
    require(signed_manifest is not None and signed_manifest["sequence"] == RELEASE_SEQUENCE, "release manifest missing")
    signed = [row for row in signed_manifest["files"] if row["path"].startswith(("runtime/", "tools/system/"))
              or row["path"] in ("tools/integration/check-runtime-architecture.cjs", "security/verify-runtime-tls.cjs")]
    values, total = {}, 0
    with zipfile.ZipFile(packet / "installer-kit.zip") as archive:
        rows = archive.infolist()
        require(len(rows) == 96 and len({row.filename for row in rows}) == len(rows), "kit file count/duplicates")
        require(set(archive.namelist()) == set(expected) | {"bootstrap.json"}, "kit member set")
        for row in rows:
            name = PurePosixPath(row.filename)
            require(row.orig_filename == row.filename and not name.is_absolute() and ".." not in name.parts
                    and str(name) == row.filename and "\\" not in row.filename, "kit member path")
            require(stat.S_ISREG(row.external_attr >> 16) and (row.external_attr >> 16) & 0o7777 == 0o644,
                    "kit member mode")
            require(row.date_time == (1980, 1, 1, 0, 0, 0) and row.flag_bits & 1 == 0, "kit member canonical form")
            require(row.file_size <= 16 * 1024**2, "kit member size")
            data = archive.read(row)
            total += len(data)
            require(len(data) == row.file_size and total <= 64 * 1024**2, "kit data size")
            values[row.filename] = data
            require(json.loads(data) == config if row.filename == "bootstrap.json" else data == expected[row.filename],
                    "kit source byte mismatch: " + row.filename)
    for row in signed:
        data = values[row["path"]]
        require(len(data) == row["size"] and hashlib.sha256(data).hexdigest() == row["sha256"], "signed source binding")
    require(all(name in {row["path"] for row in signed} for name in values if name.startswith("runtime/")), "unsigned runtime source")
    require(len(signed) == preparation["sourceFilesBound"] == 83, "signed source count")
    require(preparation["kit"] == {"files": len(values), "bytes": total, "readbackVerified": True}, "kit report mismatch")

    command = (packet / "INSTALL_COMMAND.txt").read_text(encoding="utf-8").rstrip()
    node = shutil.which("node")
    require(node is not None, "Node required for command renderer comparison")
    rendered = subprocess.run([node, "-e", "const fs=require('node:fs');const b=require(process.argv[1]);const p=JSON.parse(fs.readFileSync(process.argv[2]));process.stdout.write(b.installCommand(p.driver,p.manifest));",
                               str(ROOT / "tools/bootstrap/build-github-download.cjs"), str(packet / "preparation.json")],
                              check=True, capture_output=True, text=True, timeout=30)
    require(command == rendered.stdout, "exact command renderer mismatch")
    require(command.count("GitHub-Token") == 1, "single token prompt")
    for field in ("driver", "manifest"):
        require(pins[field]["blob"] in command and pins[field]["sha256"] in command, "command pins missing")
    for unsafe in ("PRIVATE KEY", "--insecure", "--location", "credential.helper", "skip-signature", "skip-license"):
        require(unsafe not in command, "unsafe command option")
    bash = Path("C:/Program Files/Git/bin/bash.exe") if os.name == "nt" else Path("/bin/bash")
    require(bash.is_file(), "real Bash required")
    work = ROOT / ".work"
    require(work.is_dir() and not work.is_symlink(), "workspace scratch parent required")
    scratch = Path(tempfile.mkdtemp(prefix="github-ready-syntax-", dir=work))
    syntax = []
    for name, text in (("outer.sh", command), ("body.sh", "\n".join(command.splitlines()[1:-1]))):
        file = scratch / name
        with file.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(text + "\n")
        checked = subprocess.run([str(bash), "-n", str(file)], capture_output=True, text=True, timeout=15)
        require(checked.returncode == 0, "Bash syntax rejected")
        syntax.append({"part": name, "exitCode": checked.returncode, "sha256": identity(file)["sha256"]})
    pending = ROOT / "delivery/bootstrap-test3-r2-pending-trust/github-manifest.json"
    require(read_json(pending)["ready"] is False, "historical pending manifest changed")
    return {"schemaVersion": 1, "kind": "eos-private-github-ready-artifact-verification", "ok": True,
            "packet": packet.relative_to(ROOT).as_posix(), "manifestValidated": True, "reviewedCopiesEqual": True,
            "pins": pins, "assets": assets, "publicTrust": {"kid": "nexowattEOS", "sha256": TRUST_SHA,
            "spkiDerSha256": DER_SHA, "ed25519Validated": True, "privateKeyPresent": False},
            "kit": {"files": len(values), "bytes": total, "allMembersReadAndCompared": True,
                    "sourceFilesBound": len(signed), "releaseSequence": RELEASE_SEQUENCE, "bootstrapPinsVerified": True},
            "releaseSignatureCheck": "NOT_REPEATED: manufacturer builder verifies signature; this check reads manifest data and compares source bytes",
            "command": {"exactRendererMatch": True, "pinsPresent": True, "singleHiddenTokenPrompt": True,
                        "unsafeOptionsAbsent": True, "bashSyntax": syntax},
            "historicalPendingManifest": {"ready": False, **identity(pending)},
            "sources": [source_hash(ROOT / name) for name in ("tools/integration/verify-github-ready.py",
                        "tools/bootstrap/build-github-download.cjs", "tools/bootstrap/build-download.cjs",
                        "tools/bootstrap/github-download.py", "tools/bootstrap/prepare-host.py", "tools/bootstrap/first-start.cjs")],
            "networkAccessed": False, "vaultAccessed": False, "credentialsAccessed": False,
            "targetInstallationExecuted": False, "hardwareAcceptance": "OPEN", "genuineLicenseIssuanceExecuted": False}


def main():
    require(len(sys.argv) == 3, "usage: verify-github-ready.py ABSOLUTE_PACKET ABSOLUTE_FRESH_REPORT")
    packet, report = map(Path, sys.argv[1:])
    require(packet.is_absolute() and report.is_absolute(), "absolute paths required")
    require(packet.is_dir() and not packet.is_symlink() and packet.resolve().parent == ROOT / "delivery", "packet path scope")
    require(report.parent.is_dir() and not report.exists() and report.suffix == ".json", "fresh report in existing directory required")
    report.parent.resolve().relative_to(ROOT / "reports/integration")
    result = verify(packet.resolve())
    with report.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(result, stream, indent=2)
        stream.write("\n")
    print(json.dumps({"ok": True, "report": str(report), "kitFiles": result["kit"]["files"],
                      "sourceFilesBound": result["kit"]["sourceFilesBound"], "hardwareAcceptance": "OPEN"}))


if __name__ == "__main__":
    main()
