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
KEY_SHA = "518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40"
PREVIOUS_KEY_SHA = "95151b5f26aa09a95c2f0cb5215fdfc7a7fc3066da9e670937d1e8b50c701248"
ENTRY_TOOL = "tools/bootstrap/build-public-r8-managed-entry.cjs"
ENTRY_ORIGINAL_SHA256 = "4709a10de3330ea7de740dda7cbf7f5e45d898c0cf16da470cb681ed4efa2278"
ENTRY_REPLACED_SHA256 = "9a5cb7980c45ed1d3f812f70790b682c28f53f36050298c903587d74310ec388"
UNSIGNED_SHA = "bc3965b3b1b4489199533c82e4bcc25ac98ab365f4bcf2b2bda62ac4ec11079c"
NATIVE_SHA = "6ff9a62ccb0a6b8b6fec788cff77d982faf6f89c943ba3353b43bcd12e439ab3"
TAR_SHA = "f3164a04ee70860bfd113ad4df4c4f967c0c0830f7c47b4456c68ac04d7b7378"
ARM_SHA = "dbabf7a1cbf947e6059ffad2c27b80041db97dea1e553b62afdee7f13fca336e"
DELIVERY_FILES = ("eos-linux-arm64.tar.gz", "release-public.pem", "delivery.json")
# Public identities reported by the operator for the interrupted signed run.
# Recovery must verify these bytes and their signatures; it never opens a key.
RECOVERY_RELEASE = "95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534"
RECOVERY_ARCHIVE_SHA = "dee6181281241c04c9f1a1526685c45a0d4de347d088312a1ce9fe647d82ac44"
RECOVERY_ARCHIVE_BYTES = 134278673
RECOVERY_DELIVERY_SHA = "bd16e1cd02cf5816c869030686d5aec2a7d9f796a30aa4fd3c2d0d1048675d43"
RECOVERY_ENTRY_SHA = "42a66e9aa3a1a5f71a438d6606ffeebfdef5e55de4884bb906f8559e58293d67"
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


def assert_qualified_checkout(checkout, *, allow_delivery=False):
    def git(*args):
        return run(["/usr/bin/git", *args], cwd=checkout, capture=True, timeout=30)
    if git("rev-parse", "HEAD").strip().decode() != SOURCE:
        raise ValueError("Qualifizierter Quellcommit stimmt nicht")
    status = git("status", "--porcelain=v1", "-z", "--untracked-files=all")
    allowed = {("?? delivery/managed-test-15/" + name).encode("ascii")
               for name in DELIVERY_FILES} if allow_delivery else set()
    if any(row not in allowed for row in status.split(b"\0") if row):
        raise ValueError("Qualifizierter Quellstand hat unerwartete Aenderungen")


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


def export_public(work, public, *, expected_delivery=None):
    delivery_dir = work / "checkout/delivery/managed-test-15"
    for name in DELIVERY_FILES:
        copy_public(delivery_dir / name, public / name,
                    256 * 1024 ** 2 if name == "eos-linux-arm64.tar.gz" else 65536)
    if expected_delivery is not None:
        check_file(public / "delivery.json", *expected_delivery)
    delivery = json.loads((public / "delivery.json").read_text())
    if (delivery.get("sourceCommit") != SOURCE or delivery.get("releaseSequence") != 15
            or delivery.get("signingPublicKeySha256") != KEY_SHA):
        raise ValueError("Oeffentlicher Export passt nicht zur qualifizierten Lieferung")
    check_file(public / "eos-linux-arm64.tar.gz", delivery["bytes"], delivery["sha256"])
    check_file(public / "release-public.pem", 113, KEY_SHA)
    summary = {name: delivery[name] for name in ("releaseId", "releaseSequence", "sourceCommit", "sha256", "bytes", "signingPublicKeySha256", "archiveReadbackVerified")}
    summary.update({"published": False, "physicalPiTested": False})
    summary["entryTool"] = {"path": ENTRY_TOOL, "qualifiedSha256": ENTRY_ORIGINAL_SHA256,
                            "replacementSha256": ENTRY_REPLACED_SHA256, "qualifiedSourceRestored": True}
    with (public / "summary.json").open("x") as output:
        output.write(json.dumps(summary, indent=2) + "\n")
    # Explicit public allowlist: never recursively archive work or signing keys.
    with zipfile.ZipFile(public / "eos-public-metadata.zip", "x", zipfile.ZIP_DEFLATED) as output:
        for name in ("release-public.pem", "delivery.json", "test.json", "summary.json", "r8-entry/update.sh", "r8-entry/preparation.json"):
            protected_file(public / name, 1024 ** 2)
            output.write(public / name, name)
    print("\nSIGNIERUNG ERFOLGREICH — noch nicht veroeffentlicht oder auf dem Pi installiert.")
    print("Oeffentliche Dateien: " + str(public))
    print(json.dumps(summary, indent=2))


def finish_existing(home, work, node):
    work = Path(work)
    if work.parent != home or not work.name.startswith("eos-sign-15-"):
        raise ValueError("Fortsetzung erwartet den bisherigen Signier-Arbeitsordner unter /home")
    protected_directory(work, private=True)
    checkout = protected_directory(work / "checkout")
    protected_directory(checkout / ".git")
    protected_directory(checkout / "delivery")
    delivery_dir = protected_directory(checkout / "delivery/managed-test-15")
    public = protected_directory(work / "public")
    protected_directory(public / "r8-entry")
    if set(path.name for path in delivery_dir.iterdir()) != set(DELIVERY_FILES):
        raise ValueError("Lieferordner enthaelt unerwartete Dateien")
    assert_qualified_checkout(checkout, allow_delivery=True)
    entry_path = checkout / ENTRY_TOOL
    entry_sources(entry_path)
    for name, size, digest in (
            ("eos-linux-arm64.tar.gz", RECOVERY_ARCHIVE_BYTES, RECOVERY_ARCHIVE_SHA),
            ("release-public.pem", 113, KEY_SHA),
            ("delivery.json", 2632, RECOVERY_DELIVERY_SHA)):
        check_file(protected_file(delivery_dir / name, size), size, digest)
    check_file(protected_file(public / "r8-entry/update.sh", 81554), 81554, RECOVERY_ENTRY_SHA)
    protected_file(public / "r8-entry/preparation.json", 65536)
    protected_file(public / "test.json", 65536)
    public_identities = {}
    for name in ("test.json", "r8-entry/update.sh", "r8-entry/preparation.json"):
        data = (public / name).read_bytes()
        public_identities[name] = (len(data), hashlib.sha256(data).hexdigest())
    target = work / "public-finished"
    if target.exists() or target.is_symlink():
        raise ValueError("Der abgeschlossene Exportordner existiert bereits; nichts ueberschrieben")
    print("Pruefe vorhandenes signiertes Paket, Kanal und R8-Einstieg ohne privaten Schluessel ...", flush=True)
    script = """
const [root, publicDir, output, sourceCommit, releaseId] = process.argv.slice(1);
const fs = require('node:fs');
const bundle = require(root + '/runtime/release/bundle.cjs');
const delivery = JSON.parse(bundle.readFileLimited(root + '/delivery/managed-test-15/delivery.json', 65536).bytes);
if (delivery.sourceCommit !== sourceCommit || delivery.releaseId !== releaseId || delivery.releaseSequence !== 15)
  throw Error('RECOVERY_DELIVERY_BINDING');
const key = bundle.readFileLimited(root + '/delivery/managed-test-15/release-public.pem', 16384).bytes;
const feed = require(root + '/runtime/updates/channel.cjs').verifyFeed(bundle.readFileLimited(publicDir + '/test.json', 65536).bytes, key);
if (feed.releases.length !== 0) throw Error('RECOVERY_CHANNEL_BINDING');
require(root + '/tools/bootstrap/build-public-r8-managed-entry.cjs').build(output);
for (const name of ['update.sh', 'preparation.json']) {
  const expected = bundle.readFileLimited(output + '/' + name, 1024 * 1024).bytes;
  const observed = bundle.readFileLimited(publicDir + '/r8-entry/' + name, 1024 * 1024).bytes;
  if (!expected.equals(observed)) throw Error('RECOVERY_ENTRY_BINDING');
}
console.log('Archivsignatur, vollstaendige Ruecklesepruefung, Kanal und R8-Einstieg: OK');
"""
    try:
        with tempfile.TemporaryDirectory(prefix="eos-entry-readback-", dir=work) as temporary:
            with replacement_entry_tool(entry_path):
                run([node, "-e", script, checkout, public, Path(temporary) / "r8-entry",
                     SOURCE, RECOVERY_RELEASE], timeout=300)
    finally:
        assert_qualified_checkout(checkout, allow_delivery=True)
    # Create a separate immutable public export only after all checks pass.
    target.mkdir(mode=0o700)
    (target / "r8-entry").mkdir()
    for name in ("test.json", "r8-entry/update.sh", "r8-entry/preparation.json"):
        copy_public(public / name, target / name, 1024 ** 2)
        check_file(target / name, *public_identities[name])
    export_public(work, target, expected_delivery=(2632, RECOVERY_DELIVERY_SHA))


def signing_directory(home, argument=None):
    home = Path(home)
    directory = Path(argument) if argument is not None else home / "nexowatt-signing"
    if (not directory.is_absolute() or directory.resolve() != directory
            or directory == home or not directory.is_relative_to(home)
            or not directory.is_dir()):
        raise ValueError("Schluesselordner muss ein kanonisches Verzeichnis unter dem Linux-Heimverzeichnis sein")
    return directory


def entry_sources(path):
    """Bind the only authorized entry-tool change; never change runtime inputs."""
    path = Path(path)
    info = path.lstat()
    if (not path.is_absolute() or path.resolve() != path or not stat.S_ISREG(info.st_mode)
            or info.st_uid != os.getuid() or info.st_nlink != 1
            or stat.S_IMODE(info.st_mode) != 0o644 or info.st_size > 256 * 1024):
        raise ValueError("R8-Einstiegswerkzeug: ungueltiger Pfad/Dateityp/Rechte")
    original = path.read_bytes()
    if (hashlib.sha256(original).hexdigest() != ENTRY_ORIGINAL_SHA256
            or original.count(PREVIOUS_KEY_SHA.encode("ascii")) != 1):
        raise ValueError("R8-Einstiegswerkzeug passt nicht zum qualifizierten Quellstand")
    replacement = original.replace(PREVIOUS_KEY_SHA.encode("ascii"), KEY_SHA.encode("ascii"), 1)
    if hashlib.sha256(replacement).hexdigest() != ENTRY_REPLACED_SHA256:
        raise ValueError("R8-Einstiegswerkzeug passt nicht zur geprueften Schluesselersetzung")
    return original, replacement


def _write_entry_atomically(path, data):
    fd, name = tempfile.mkstemp(prefix=".eos-entry-", dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            os.fchmod(stream.fileno(), 0o644)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


@contextlib.contextmanager
def replacement_entry_tool(path):
    # Caller must finish package/feed signing and private-key cleanup first.
    # Both full tool versions are pinned. Restore the qualified checkout even
    # if the separate public entry preparation fails or is interrupted.
    path = Path(path)
    original, replacement = entry_sources(path)
    try:
        _write_entry_atomically(path, replacement)
        yield
    finally:
        _write_entry_atomically(path, original)


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
    if len(argv) not in (2, 3):
        raise ValueError("Aufruf: sign-qualified-r8-wsl.py UNSIGNED.zip NATIVE.zip [ABS_SCHLUESSELORDNER] oder --finish ABS_ARBEITSORDNER")
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
    if argv[0] == "--finish":
        if len(argv) != 2:
            raise ValueError("Fortsetzung erwartet genau --finish ABS_ARBEITSORDNER")
        finish_existing(home, Path(argv[1]), node)
        return
    signing = signing_directory(home, argv[2] if len(argv) == 3 else None)
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
    # Precheck the narrowly authorized manufacturer-key replacement before the
    # encrypted key is opened. Signing itself still uses a clean SOURCE tree.
    entry_path = checkout / ENTRY_TOOL
    entry_sources(entry_path)
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
    print("Bereite den R8-Einstieg mit dem bestaetigten Ersatz-Pruefschluessel vor.", flush=True)
    try:
        with replacement_entry_tool(entry_path):
            run([node, entry_path, "--output", public / "r8-entry"], timeout=300)
    finally:
        assert_qualified_checkout(checkout, allow_delivery=True)
    export_public(work, public)


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
