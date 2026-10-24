#!/usr/bin/env python3
"""Protected local signing of the separately qualified Managed-16 fresh basis.

Release-disabled until the exact CI ZIP/tar pins below have been independently
verified. No publication, npm resolution, target installation, recovery or wipe.
This helper stays outside the immutable qualified source checkout.
"""
import contextlib
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import resource
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import zipfile

SOURCE = "f2ea9a7ba67ef46a7de8a4f0ef05eaa672ca38f4"
SEQUENCE = 16
KEY_SHA = "518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40"
DEFAULT_SIGNING_DIRECTORY = "nexowatt-signing-neu-ITuuaaOd"
# CI run 40069294296: exact source, downloaded ZIPs and inner members verified.
# Missing/malformed pins still fail closed before any I/O; there is no override.
UNSIGNED_SHA = "9dfb4bac5dc501ca5815cefb5f862234b2dd2515a62f56bab24909fb5ae6c12d"
UNSIGNED_BYTES = 134047653
NATIVE_SHA = "37f871a1fe5df44d4d9dee67351a239c7abba2e523a105d1879e87dae2be1f3e"
NATIVE_BYTES = 218396
TAR_SHA = "734a6b296cdfec50bc084e722c1b8eb5eb838969813b311200eae9071cd73bb9"
TAR_BYTES = 134047467
NATIVE_DIR = "eos-own-adapters.trlC30cd"
ARM_SHA = "dbabf7a1cbf947e6059ffad2c27b80041db97dea1e553b62afdee7f13fca336e"
ARM_BYTES = 30978868
NODE_ARCHIVE = "node-v24.22.1-linux-arm64.tar.xz"
LICENSE_TRUST_SOURCE = "delivery/bootstrap-test3-r4/license-public-trust.json"
LICENSE_TRUST_SHA = "470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f"
DELIVERY_FILES = ("eos-linux-arm64.tar.gz", "release-public.pem", "delivery.json")
DOWNLOAD_FILES = ("eos-linux-arm64.tar.gz", NODE_ARCHIVE, "installer-kit.zip", "install.sh", "download-preparation.json")
METADATA_FILES = ("release-public.pem", "delivery.json", "license-public-trust.json", "install.sh", "download-preparation.json", "summary.json")


def qualification_pins():
    hashes = (UNSIGNED_SHA, NATIVE_SHA, TAR_SHA)
    sizes = (UNSIGNED_BYTES, NATIVE_BYTES, TAR_BYTES)
    if (any(not isinstance(value, str) or not re.fullmatch(r"[a-f0-9]{64}", value) for value in hashes)
            or any(type(value) is not int or not 0 < value <= 512 * 1024**2 for value in sizes)
            or NATIVE_BYTES > 64 * 1024**2
            or not isinstance(NATIVE_DIR, str)
            or not re.fullmatch(r"eos-own-adapters\.[A-Za-z0-9]{8}", NATIVE_DIR)):
        raise ValueError("QUALIFICATION_PINS_PENDING")


def run(args, *, cwd=None, capture=False, timeout=300):
    # No inherited Node/OpenSSL/Git configuration or curl configuration changes
    # this fixed signing operation. OpenSSL reads its passphrase from the TTY.
    env = {"PATH": "/usr/bin:/bin", "LC_ALL": "C", "HOME": str(Path.home()),
           "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_TERMINAL_PROMPT": "0"}
    return subprocess.run([str(arg) for arg in args], cwd=cwd, check=True, env=env,
                          stdout=subprocess.PIPE if capture else None,
                          timeout=timeout).stdout


def check_file(path, size, sha256):
    path = Path(path)
    info = path.lstat()
    if (not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size != size
            or path.is_symlink()):
        raise ValueError("INPUT_FILE_REJECTED")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != sha256:
        raise ValueError("INPUT_HASH_REJECTED")


def assert_qualified_checkout(checkout, *, allow_delivery=False):
    def git(*args):
        return run(["/usr/bin/git", *args], cwd=checkout, capture=True, timeout=30)
    if git("rev-parse", "HEAD").strip().decode() != SOURCE:
        raise ValueError("QUALIFIED_SOURCE_REJECTED")
    status = git("status", "--porcelain=v1", "-z", "--untracked-files=all")
    allowed = {("?? delivery/managed-test-16/" + name).encode("ascii")
               for name in DELIVERY_FILES} if allow_delivery else set()
    if any(row not in allowed for row in status.split(b"\0") if row):
        raise ValueError("QUALIFIED_SOURCE_CHANGED")


def signing_directory(home, argument=None):
    home = Path(home)
    directory = Path(argument) if argument is not None else home / DEFAULT_SIGNING_DIRECTORY
    if (not directory.is_absolute() or directory.resolve() != directory
            or directory == home or not directory.is_relative_to(home)):
        raise ValueError("SIGNING_DIRECTORY_REJECTED")
    return protected_directory(directory, private=True)


def native_members():
    qualification_pins()
    return {name: 16 * 1024**2 for name in (
        NATIVE_DIR + "/own-adapters-native-evidence.json",
        NATIVE_DIR + "/own-adapters-native-prepared.json",
        NATIVE_DIR + "/own-adapters-native.tap",
        NATIVE_DIR + "/own-adapters-source-binding.json",
        "eos-refresh-runtime/runtime-build.json", "eos-refresh-runtime/runtime.cdx.json",
        "eos-refresh-runtime/app/package-lock.json", "eos-refresh-audit.json")}


def protected_directory(path, *, private=False):
    path = Path(path)
    info = path.lstat()
    if (not path.is_absolute() or path.resolve() != path or not stat.S_ISDIR(info.st_mode)
            or info.st_uid != os.getuid() or info.st_mode & 0o022
            or (private and stat.S_IMODE(info.st_mode) != 0o700)):
        raise ValueError("Ungueltiger Arbeitsordner")
    return path

def protected_file(path, maximum):
    path = Path(path)
    info = path.lstat()
    if (not path.is_absolute() or path.resolve() != path or not stat.S_ISREG(info.st_mode)
            or info.st_uid != os.getuid() or info.st_nlink != 1 or info.st_mode & 0o022
            or not 0 < info.st_size <= maximum):
        raise ValueError("Ungueltige oeffentliche Datei: " + path.name)
    return path

def copy_public(source, target, maximum):
    source = protected_file(source, maximum)
    size = source.stat().st_size
    digest = hashlib.sha256()
    with source.open("rb") as incoming, Path(target).open("xb") as outgoing:
        remaining = size
        while remaining:
            block = incoming.read(min(1024 * 1024, remaining))
            if not block:
                raise ValueError("Oeffentliche Quelldatei wurde beim Kopieren verkuerzt")
            outgoing.write(block)
            digest.update(block)
            remaining -= len(block)
        if incoming.read(1):
            raise ValueError("Oeffentliche Quelldatei wurde beim Kopieren vergroessert")
    check_file(target, size, digest.hexdigest())

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


def verify_inputs(node, checkout, prepared, native, arm, trust):
    script = """
const [root, directory, evidence, archive, trustFile, sourceCommit, trustHash] = process.argv.slice(1);
const fresh = require(root + '/tools/integration/prepare-security-refresh.cjs');
const native = require(root + '/tools/integration/verify-security-refresh-native.cjs');
const bundle = require(root + '/runtime/release/bundle.cjs');
const fs = require('node:fs');
const value = fresh.verifyPrepared({directory, sourceCommit, sequence: 16});
native.verifyNativeEvidence({directory: evidence, sourceCommit, files: value.files,
  record: value.record, runtimeBuildSha256: bundle.sha256(fs.readFileSync(value.recordFile))});
const nodeArchive = require(root + '/tools/integration/prepare-node-runtime.cjs').verifyArchive(archive, value.record.nodeVersion);
if (nodeArchive.sha256 !== value.record.nodeRuntime.archiveSha256) throw Error('NODE_BINDING');
const entry = require(root + '/tools/system/install-managed-from-checkout.cjs');
if (entry.RELEASE_SEQUENCE !== 16 || entry.DELIVERY_REVISION !== 13 || entry.DELIVERY_DIRECTORY !== 'delivery/managed-test-16')
  throw Error('FRESH_ENTRY_BINDING');
require(root + '/tools/bootstrap/build-managed-download.cjs').licenseTrust(fs.readFileSync(trustFile), trustHash);
console.log('Laufzeit, native CI-Nachweise, ARM64-Node und oeffentlicher Lizenztrust: OK');
"""
    run([node, "-e", script, checkout, prepared, native, arm, trust, SOURCE, LICENSE_TRUST_SHA])


def public_delivery(checkout):
    directory = protected_directory(checkout / "delivery/managed-test-16")
    if set(item.name for item in directory.iterdir()) != set(DELIVERY_FILES):
        raise ValueError("DELIVERY_ALLOWLIST_REJECTED")
    delivery = json.loads(protected_file(directory / "delivery.json", 65536).read_text())
    if (delivery.get("sourceCommit") != SOURCE or delivery.get("releaseSequence") != 16
            or delivery.get("deliveryRevision") != 13 or delivery.get("signingPublicKeySha256") != KEY_SHA
            or delivery.get("archive") != "eos-linux-arm64.tar.gz"
            or delivery.get("archiveReadbackVerified") is not True
            or delivery.get("productionReleaseApproved") is not False
            or not re.fullmatch(r"[a-f0-9]{64}", delivery.get("releaseId", ""))
            or type(delivery.get("bytes")) is not int or not 0 < delivery["bytes"] <= 256 * 1024**2):
        raise ValueError("DELIVERY_BINDING_REJECTED")
    check_file(directory / "release-public.pem", 113, KEY_SHA)
    check_file(directory / delivery["archive"], delivery["bytes"], delivery["sha256"])
    return delivery


def export_public(checkout, public, trust):
    public = protected_directory(public)
    if set(item.name for item in public.iterdir()) != set(DOWNLOAD_FILES):
        raise ValueError("PUBLIC_ALLOWLIST_REJECTED")
    delivery = public_delivery(checkout)
    preparation = json.loads(protected_file(public / "download-preparation.json", 65536).read_text())
    if (preparation.get("releaseSequence") != 16 or preparation.get("releaseId") != delivery["releaseId"]
            or preparation.get("releasePublicKeySha256") != KEY_SHA
            or preparation.get("licenseTrustSha256") != LICENSE_TRUST_SHA
            or preparation.get("commandReady") is not False or preparation.get("entryPublicationRequired") is not True
            or preparation.get("published") is not False
            or preparation.get("baseUrl") != release_url(delivery["releaseId"])):
        raise ValueError("PUBLIC_PREPARATION_REJECTED")
    check_file(public / "eos-linux-arm64.tar.gz", delivery["bytes"], delivery["sha256"])
    check_file(public / NODE_ARCHIVE, ARM_BYTES, ARM_SHA)
    assets = preparation.get("assets")
    if (not isinstance(assets, list) or len(assets) != 3
            or {row.get("name") for row in assets} != {"eos-linux-arm64.tar.gz", NODE_ARCHIVE, "installer-kit.zip"}):
        raise ValueError("PUBLIC_ASSETS_REJECTED")
    for row in assets:
        check_file(protected_file(public / row["name"], 256 * 1024**2), row["bytes"], row["sha256"])
    script = protected_file(public / "install.sh", 512 * 1024).read_bytes()
    if hashlib.sha256(script).hexdigest() != preparation.get("bootstrapSha256"):
        raise ValueError("PUBLIC_ENTRY_REJECTED")
    for name in ("release-public.pem", "delivery.json"):
        copy_public(checkout / "delivery/managed-test-16" / name, public / name, 65536)
    check_file(trust, 140, LICENSE_TRUST_SHA)
    copy_public(trust, public / "license-public-trust.json", 140)
    summary = {name: delivery[name] for name in ("releaseId", "releaseSequence", "sourceCommit", "sha256", "bytes", "signingPublicKeySha256", "archiveReadbackVerified")}
    summary.update({"schemaVersion": 1, "kind": "eos-managed16-public-signing-export",
                    "assets": assets, "licenseTrustSha256": LICENSE_TRUST_SHA,
                    "published": False, "publicReadbackPerformed": False,
                    "installCommandReady": False, "physicalPiTested": False})
    with (public / "summary.json").open("x") as stream:
        stream.write(json.dumps(summary, indent=2) + "\n")
    # Explicit public files only: neither work, private key nor source checkout.
    with zipfile.ZipFile(public / "eos-public-metadata.zip", "x", zipfile.ZIP_DEFLATED) as output:
        for name in METADATA_FILES:
            output.write(protected_file(public / name, 1024**2), name)
    expected = set(DOWNLOAD_FILES) | set(METADATA_FILES) | {"eos-public-metadata.zip"}
    if {item.name for item in public.iterdir()} != expected:
        raise ValueError("PUBLIC_ALLOWLIST_REJECTED")
    return summary


def release_url(release_id):
    if not isinstance(release_id, str) or not re.fullmatch(r"[a-f0-9]{64}", release_id):
        raise ValueError("DELIVERY_BINDING_REJECTED")
    return "https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-16-" + release_id


def sign_and_prepare(node, checkout, prepared, native, arm, encrypted, trust, public):
    # All qualification gates precede opening the encrypted manufacturer key.
    assert_qualified_checkout(checkout)
    verify_inputs(node, checkout, prepared, native, arm, trust)
    assert_qualified_checkout(checkout)
    print("Alle Eingaben geprueft. Jetzt das lokale Schluesselpasswort eingeben.", flush=True)
    with decrypted_key(encrypted, KEY_SHA) as key:
        run([node, checkout / "tools/bootstrap/build-managed-test.cjs", "--prepared-runtime", prepared,
             "--native-evidence", native, "--private-key", key, "--public-key-sha256", KEY_SHA,
             "--sequence", "16", "--node-archive", arm], timeout=900)
    print("Temporaere entschluesselte Schluesseldatei entfernt.", flush=True)
    assert_qualified_checkout(checkout, allow_delivery=True)
    delivery = public_delivery(checkout)
    run([node, checkout / "tools/bootstrap/build-managed-download.cjs", "--base-url", release_url(delivery["releaseId"]),
         "--license-trust", trust, "--license-trust-sha256", LICENSE_TRUST_SHA,
         "--release-public-key-sha256", KEY_SHA, "--output", public, "--node-archive", arm], timeout=600)
    assert_qualified_checkout(checkout, allow_delivery=True)
    summary = export_public(checkout, public, trust)
    assert_qualified_checkout(checkout, allow_delivery=True)
    return summary


def main(argv):
    # This is deliberately first: incomplete public pins cannot trigger I/O,
    # downloads, subprocesses, passphrase prompts or any manufacturer-key access.
    qualification_pins()
    if len(argv) not in (2, 3) or any(value.startswith("--") for value in argv):
        raise ValueError("SIGNING_USAGE")
    home = Path.home()
    if (os.geteuid() == 0 or platform.system() != "Linux" or platform.machine() != "x86_64"
            or not str(home).startswith("/home/") or home.resolve() != home):
        raise ValueError("WSL_USER_REQUIRED")
    protected_directory(home)
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    # Public files remain below this private parent; private key is tmpfs only.
    os.umask(0o022)
    node = protected_file(home / "nexowatt-build/node-v24.22.1-linux-x64/bin/node", 128 * 1024**2)
    if run([node, "--version"], capture=True).strip() != b"v24.22.1":
        raise ValueError("NODE_VERSION_REJECTED")
    signing = signing_directory(home, argv[2] if len(argv) == 3 else None)
    encrypted = protected_file(signing / "release-private.encrypted.pem", 16384)
    if encrypted.stat().st_mode & 0o077:
        raise ValueError("PRIVATE_KEY_MODE_REJECTED")
    check_file(signing / "release-public.pem", 113, KEY_SHA)
    with encrypted.open("rb") as stream:
        if stream.readline(80).strip() != b"-----BEGIN ENCRYPTED PRIVATE KEY-----":
            raise ValueError("ENCRYPTED_MASTER_REQUIRED")
    check_file(argv[0], UNSIGNED_BYTES, UNSIGNED_SHA)
    check_file(argv[1], NATIVE_BYTES, NATIVE_SHA)
    work = Path(tempfile.mkdtemp(prefix="eos-sign-16-", dir=home)).resolve()
    protected_directory(work, private=True)
    print("Arbeitsordner: " + str(work), flush=True)
    if shutil.disk_usage(work).free < 5 * 1024**3:
        raise ValueError("DISK_SPACE_REQUIRED")
    unsigned, native_zip = work / "unsigned.zip", work / "native.zip"
    shutil.copyfile(argv[0], unsigned)
    shutil.copyfile(argv[1], native_zip)
    check_file(unsigned, UNSIGNED_BYTES, UNSIGNED_SHA)
    check_file(native_zip, NATIVE_BYTES, NATIVE_SHA)
    extract_zip(unsigned, work / "unsigned", {"eos-security-refresh-unsigned.tar.gz": TAR_BYTES})
    extract_zip(native_zip, work / "native", native_members())
    tar = work / "unsigned/eos-security-refresh-unsigned.tar.gz"
    check_file(tar, TAR_BYTES, TAR_SHA)
    checkout = work / "checkout"
    print("Lade den festgelegten qualifizierten Quellstand ...", flush=True)
    run(["/usr/bin/git", "-c", "core.hooksPath=/dev/null", "clone", "--filter=blob:none", "--no-checkout", "--depth=1",
         "https://github.com/NexoWatt/nexowatt-eos.git", checkout])
    def git(*args, capture=False):
        return run(["/usr/bin/git", *args], cwd=checkout, capture=capture)
    git("config", "core.autocrlf", "false")
    git("config", "core.hooksPath", "/dev/null")
    git("fetch", "--filter=blob:none", "--depth=1", "origin", SOURCE)
    git("sparse-checkout", "set", "--cone", "runtime", "tools", "system", "security", "licenses",
        "docs/history", "components/admin/build/lib")
    git("checkout", "--detach", SOURCE)
    assert_qualified_checkout(checkout)
    (checkout / "delivery").mkdir(exist_ok=True)
    trust = work / "license-public-trust.json"
    data = git("show", SOURCE + ":" + LICENSE_TRUST_SOURCE, capture=True)
    with trust.open("xb") as output:
        output.write(data)
    check_file(trust, 140, LICENSE_TRUST_SHA)
    arm = work / NODE_ARCHIVE
    run(["/usr/bin/curl", "-q", "--fail", "--proto", "=https", "--tlsv1.2", "--connect-timeout", "5",
         "--max-time", "180", "--max-filesize", str(ARM_BYTES), "--output", arm,
         "https://nodejs.org/dist/v24.22.1/" + NODE_ARCHIVE], timeout=190)
    check_file(arm, ARM_BYTES, ARM_SHA)
    prepared = work / "prepared"
    run(["/usr/bin/python3", "-I", "-B", checkout / "tools/integration/prepared-runtime-archive.py", "extract", tar, prepared])
    public = work / "public"
    summary = sign_and_prepare(node, checkout, prepared, work / "native" / NATIVE_DIR, arm, encrypted, trust, public)
    print("SIGNIERUNG ERFOLGREICH — noch nicht veroeffentlicht oder auf dem Pi installiert.")
    print("Oeffentliche Dateien: " + str(public))
    print(json.dumps(summary, indent=2))


def interrupted(_signum, _frame):
    raise KeyboardInterrupt


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupted)
    try:
        main(sys.argv[1:])
    except KeyboardInterrupt:
        sys.exit("SIGNING_INTERRUPTED")
    except (OSError, ValueError, subprocess.SubprocessError, zipfile.BadZipFile) as error:
        code = str(error) if isinstance(error, ValueError) and re.fullmatch(r"[A-Z][A-Z0-9_]{1,80}", str(error)) else "SIGNING_FAILED"
        sys.exit(code)
