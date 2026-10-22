#!/usr/bin/env python3
"""Local manufacturer signing of the fixed, qualified sequence-15 inputs.

No publication, package resolution, sudo or target-host operations. The helper
stays outside its separate immutable signing checkout. See WINDOWS_SIGNIERRECHNER_DE.md.
"""
import contextlib
import datetime
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import resource
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import zipfile

SOURCE = "f353dd08bf8ac5897e9b1c357994d4047a82ed6d"
KEY_SHA = "95151b5f26aa09a95c2f0cb5215fdfc7a7fc3066da9e670937d1e8b50c701248"
UNSIGNED_SHA = "bc3965b3b1b4489199533c82e4bcc25ac98ab365f4bcf2b2bda62ac4ec11079c"
NATIVE_SHA = "6ff9a62ccb0a6b8b6fec788cff77d982faf6f89c943ba3353b43bcd12e439ab3"
TAR_SHA = "f3164a04ee70860bfd113ad4df4c4f967c0c0830f7c47b4456c68ac04d7b7378"
ARM_SHA = "dbabf7a1cbf947e6059ffad2c27b80041db97dea1e553b62afdee7f13fca336e"
NATIVE_DIR = "eos-own-adapters.YWMeq1tR"
NATIVE_MEMBERS = {name: 16 * 1024 * 1024 for name in (
    NATIVE_DIR + "/own-adapters-native-evidence.json",
    NATIVE_DIR + "/own-adapters-native-prepared.json",
    NATIVE_DIR + "/own-adapters-native.tap",
    NATIVE_DIR + "/own-adapters-source-binding.json",
    "eos-refresh-runtime/runtime-build.json", "eos-refresh-runtime/runtime.cdx.json",
    "eos-refresh-runtime/app/package-lock.json", "eos-refresh-audit.json")}


def run(args, *, cwd=None, capture=False, timeout=300):
    return subprocess.run([str(arg) for arg in args], cwd=cwd, check=True,
                          stdout=subprocess.PIPE if capture else None,
                          timeout=timeout).stdout


def check_file(path, size, sha256):
    path = Path(path)
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_size != size:
        raise ValueError("Dateityp/Groesse ungueltig: " + path.name)
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != sha256:
        raise ValueError("SHA-256 stimmt nicht: " + path.name)


def extract_zip(archive, output, expected_members):
    output = Path(output)
    with zipfile.ZipFile(archive) as source:
        rows = source.infolist()
        names = [row.filename for row in rows]
        if len(names) != len(set(names)) or set(names) != set(expected_members):
            raise ValueError("ZIP-Inhalt weicht von der Freigabe ab")
        for row in rows:
            name = PurePosixPath(row.filename)
            kind = stat.S_IFMT(row.external_attr >> 16)
            if (name.is_absolute() or ".." in name.parts or "\\" in row.filename
                    or str(name) != row.filename or kind not in (0, stat.S_IFREG)
                    or row.is_dir() or row.flag_bits & 1
                    or row.file_size > expected_members[row.filename]):
                raise ValueError("Unsicherer ZIP-Eintrag")
        output.mkdir(mode=0o700)
        for row in rows:
            target = output / row.filename
            target.parent.mkdir(parents=True, exist_ok=True)
            with source.open(row) as incoming, target.open("xb") as outgoing:
                remaining = row.file_size
                while remaining:
                    block = incoming.read(min(1024 * 1024, remaining))
                    if not block:
                        raise ValueError("Verkuerzter ZIP-Eintrag")
                    outgoing.write(block)
                    remaining -= len(block)
                if incoming.read(1):
                    raise ValueError("ZIP-Eintrag zu gross")


@contextlib.contextmanager
def decrypted_key(encrypted_path, expected_pub_hash):
    # /dev/shm is tmpfs on the supported Ubuntu/WSL host. No disk fallback.
    if run(["/usr/bin/stat", "-f", "-c", "%T", "/dev/shm"], capture=True).strip() != b"tmpfs":
        raise ValueError("/dev/shm ist kein tmpfs")
    with tempfile.TemporaryDirectory(prefix="eos-signing-", dir="/dev/shm") as directory:
        key = Path(directory) / "private.pem"
        fd = os.open(key, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        os.close(fd)
        try:
            run(["/usr/bin/openssl", "pkey", "-in", encrypted_path, "-out", key])
            public = run(["/usr/bin/openssl", "pkey", "-in", key, "-pubout"], capture=True)
            if hashlib.sha256(public).hexdigest() != expected_pub_hash:
                raise ValueError("Entschluesselter Schluessel gehoert nicht zur Freigabe")
            yield key
        finally:
            key.unlink(missing_ok=True)


def verify_inputs(node, checkout, prepared, native, arm):
    script = """
const [root, directory, evidence, archive, sourceCommit] = process.argv.slice(1);
const fresh = require(root + '/tools/integration/prepare-security-refresh.cjs');
const native = require(root + '/tools/integration/verify-security-refresh-native.cjs');
const bundle = require(root + '/runtime/release/bundle.cjs');
const fs = require('node:fs');
const value = fresh.verifyPrepared({directory, sourceCommit, sequence: 15});
native.verifyNativeEvidence({directory: evidence, sourceCommit, files: value.files,
  record: value.record, runtimeBuildSha256: bundle.sha256(fs.readFileSync(value.recordFile))});
const nodeArchive = require(root + '/tools/integration/prepare-node-runtime.cjs').verifyArchive(archive, value.record.nodeVersion);
if (nodeArchive.sha256 !== value.record.nodeRuntime.archiveSha256) throw Error('NODE_BINDING');
console.log('Laufzeit, native CI-Nachweise und ARM64-Node: OK');
"""
    run([node, "-e", script, checkout, prepared, native, arm, SOURCE])


def main(argv):
    if len(argv) != 2:
        raise ValueError("Aufruf: python3 -I -B sign-qualified-r8-wsl.py UNSIGNED.zip NATIVE.zip")
    home = Path.home()
    if (os.geteuid() == 0 or platform.system() != "Linux" or platform.machine() != "x86_64"
            or not str(home).startswith("/home/") or home.resolve() != home):
        raise ValueError("Als normaler Ubuntu/WSL-Benutzer unter /home ausfuehren")
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    # Deterministic public file modes; all work remains below a private parent.
    os.umask(0o022)
    os.environ["PATH"] = "/usr/bin:/bin"
    for name in ("NODE_OPTIONS", "NODE_PATH", "OPENSSL_CONF", "OPENSSL_MODULES"):
        os.environ.pop(name, None)
    node = home / "nexowatt-build/node-v24.22.1-linux-x64/bin/node"
    if run([node, "--version"], capture=True).strip() != b"v24.22.1":
        raise ValueError("Der vorbereitete Node 24.22.1 fehlt")
    signing = home / "nexowatt-signing"
    encrypted = signing / "release-private.encrypted.pem"
    for item in (signing, encrypted):
        info = item.lstat()
        if (item.resolve() != item or info.st_uid != os.getuid() or info.st_mode & 0o077
                or (item == encrypted and (not stat.S_ISREG(info.st_mode) or info.st_nlink != 1))):
            raise ValueError("Private Schluesselablage/Rechte ungueltig")
    check_file(signing / "release-public.pem", 113, KEY_SHA)
    # Check the encrypted container marker without printing its contents.
    with encrypted.open("rb") as stream:
        if stream.readline(80).strip() != b"-----BEGIN ENCRYPTED PRIVATE KEY-----":
            raise ValueError("Verschluesselten PKCS8-Masterschluessel erwartet")
    check_file(argv[0], 134045451, UNSIGNED_SHA)
    check_file(argv[1], 218143, NATIVE_SHA)
    work = Path(tempfile.mkdtemp(prefix="eos-sign-15-", dir=home)).resolve()
    print("Arbeitsordner: " + str(work), flush=True)
    if shutil.disk_usage(work).free < 5 * 1024 ** 3:
        raise ValueError("Mindestens 5 GiB freier Platz im Ubuntu-Dateisystem erforderlich")
    unsigned = work / "unsigned.zip"
    native_zip = work / "native.zip"
    shutil.copyfile(argv[0], unsigned)
    shutil.copyfile(argv[1], native_zip)
    check_file(unsigned, 134045451, UNSIGNED_SHA)
    check_file(native_zip, 218143, NATIVE_SHA)
    extract_zip(unsigned, work / "unsigned", {"eos-security-refresh-unsigned.tar.gz": 134045265})
    extract_zip(native_zip, work / "native", NATIVE_MEMBERS)
    tar = work / "unsigned/eos-security-refresh-unsigned.tar.gz"
    check_file(tar, 134045265, TAR_SHA)
    checkout = work / "checkout"
    print("Lade den festgelegten Quellstand ...", flush=True)
    run(["/usr/bin/git", "clone", "--filter=blob:none", "--no-checkout", "--depth=1",
         "https://github.com/NexoWatt/nexowatt-eos.git", checkout])
    def git(*args, capture=False):
        return run(["/usr/bin/git", *args], cwd=checkout, capture=capture)
    git("config", "core.autocrlf", "false")
    git("config", "core.hooksPath", "/dev/null")
    git("fetch", "--filter=blob:none", "--depth=1", "origin", SOURCE)
    git("sparse-checkout", "set", "--cone", "runtime", "tools", "system", "security", "licenses", "docs/history")
    git("checkout", "--detach", SOURCE)
    if git("rev-parse", "HEAD", capture=True).strip().decode() != SOURCE or git("status", "--porcelain", capture=True).strip():
        raise ValueError("Quellstand nicht sauber/gebunden")
    (checkout / "delivery").mkdir()
    arm = work / "node-v24.22.1-linux-arm64.tar.xz"
    run(["/usr/bin/curl", "--fail", "--location", "--proto", "=https", "--proto-redir", "=https",
         "--connect-timeout", "5", "--max-time", "180", "--output", arm,
         "https://nodejs.org/dist/v24.22.1/" + arm.name], timeout=190)
    check_file(arm, 30978868, ARM_SHA)
    prepared = work / "prepared"
    run(["/usr/bin/python3", "-I", "-B", checkout / "tools/integration/prepared-runtime-archive.py", "extract", tar, prepared])
    native = work / "native" / NATIVE_DIR
    verify_inputs(node, checkout, prepared, native, arm)
    public = work / "public"
    public.mkdir()
    now = datetime.datetime.now(datetime.timezone.utc)
    def iso(value):
        return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")
    feed = work / "channel-input.json"
    feed.write_text(json.dumps({"schemaVersion": 1, "channel": "eos-managed-test-v1",
        "issuedAt": iso(now), "expiresAt": iso(now + datetime.timedelta(days=30)), "releases": []}) + "\n")
    print("Alle Eingaben geprueft. Jetzt das lokale Schluesselpasswort eingeben.", flush=True)
    with decrypted_key(encrypted, KEY_SHA) as key:
        run([node, checkout / "tools/bootstrap/build-managed-test.cjs", "--prepared-runtime", prepared,
             "--native-evidence", native, "--private-key", key, "--public-key-sha256", KEY_SHA,
             "--sequence", "15", "--node-archive", arm], timeout=900)
        run([node, checkout / "tools/bootstrap/sign-managed-channel.cjs", "--input", feed,
             "--private-key", key, "--public-key-sha256", KEY_SHA, "--output", public / "test.json"])
    print("Temporaere entschluesselte Schluesseldatei entfernt.", flush=True)
    run([node, checkout / "tools/bootstrap/build-public-r8-managed-entry.cjs", "--output", public / "r8-entry"], timeout=300)
    delivery_dir = checkout / "delivery/managed-test-15"
    for name in ("eos-linux-arm64.tar.gz", "release-public.pem", "delivery.json"):
        shutil.copyfile(delivery_dir / name, public / name)
    delivery = json.loads((public / "delivery.json").read_text())
    summary = {name: delivery[name] for name in ("releaseId", "releaseSequence", "sourceCommit", "sha256", "bytes", "signingPublicKeySha256", "archiveReadbackVerified")}
    summary.update({"published": False, "physicalPiTested": False})
    (public / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    # Explicit public allowlist: never recursively archive work or signing keys.
    with zipfile.ZipFile(public / "eos-public-metadata.zip", "x", zipfile.ZIP_DEFLATED) as output:
        for name in ("release-public.pem", "delivery.json", "test.json", "summary.json", "r8-entry/update.sh", "r8-entry/preparation.json"):
            output.write(public / name, name)
    print("\nSIGNIERUNG ERFOLGREICH — noch nicht veroeffentlicht oder auf dem Pi installiert.")
    print("Oeffentliche Dateien: " + str(public))
    print(json.dumps(summary, indent=2))


def interrupted(_signum, _frame):
    raise KeyboardInterrupt


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupted)
    try:
        main(sys.argv[1:])
    except KeyboardInterrupt:
        sys.exit("Signierung abgebrochen; temporaere Schluesseldatei aufgeraeumt.")
    except (OSError, ValueError, subprocess.SubprocessError, zipfile.BadZipFile) as error:
        sys.exit("Signierung angehalten: " + str(error))
