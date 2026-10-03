#!/usr/bin/python3
"""Preserve only the diagnosed r2 sudo-abort state; never reset an installation.

No download, package install, account deletion, sudoers edit, service start, or
installer execution occurs here. --check is the default and does not write.
An interrupted recovery is deliberately not resumed automatically: the durable
private journal describes the last completed step and the next intended step.
There is no CLI target-root, alternate release, UID, GID or admission override.
"""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import stat
import subprocess
import sys
import tempfile

RELEASE = "f8791884897defb86c07bd58114ef3df4abf5c9bda053694e4406d6ac7e779ef"
SIGNATURE_SHA256 = "94108bc5a369e4afa3b193db3e33af9c3551f6713e518fb8ea7722768b0f2001"
PUBLIC_KEY_SHA256 = "552aea62599485fecc4d34d2d2973913b4fa3a76d6cfbebe0e75282065908b60"
PARENT = Path("/opt/nexowatt")
STAGE = PARENT / "eos"
QUARANTINE_PREFIX = ".eos-r2-abort-"
ACCOUNT = "eos-runtime"
PRESERVED_ACCOUNT = "eos-aborted-runtime"
UID, GID = 999, 985
ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C", "LC_ALL": "C"}
EOS_PATHS = ("/etc/nexowatt-eos", "/var/lib/nexowatt-eos", "/var/log/nexowatt-eos",
             "/opt/nexowatt-eos", "/opt/iobroker", "/etc/nexowatt-eos-os-updates",
             "/var/lib/nexowatt-eos-os-updates", "/run/nexowatt-eos-postgresql")
FORBIDDEN_ACCOUNTS = {"eos-postgres", "eos-setup", "iobroker", PRESERVED_ACCOUNT}
UNIT_ROW = re.compile(r"^((?:[A-Za-z0-9:_.@-]|\\x[0-9a-fA-F]{2})+\.(?:service|socket|device|mount|automount|swap|target|path|timer|slice|scope))"
                      r"[ \t]+(?:enabled|enabled-runtime|linked|linked-runtime|alias|masked|masked-runtime|static|disabled|indirect|generated|transient|bad)"
                      r"[ \t]+(?:enabled|disabled|ignored|unknown|n/a|-)[ \t]*$")


class Rejected(Exception):
    pass


def fail(code):
    raise Rejected(code)


def unique_object(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            fail("RECOVERY_JSON_DUPLICATE")
        value[key] = item
    return value


def parse_json(data):
    try:
        return json.loads(data, object_pairs_hook=unique_object)
    except (ValueError, UnicodeError):
        fail("RECOVERY_JSON")


def metadata(path, mode, directory=False):
    info = Path(path).lstat()
    good_type = stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)
    if (not good_type or info.st_uid != 0 or info.st_gid != 0
            or stat.S_IMODE(info.st_mode) != mode
            or not directory and info.st_nlink != 1):
        fail("RECOVERY_TREE_METADATA")
    return info


def trusted_path(path, *, executable=False, allow_setuid=False):
    """Protect lexical and resolved distro paths, including merged-/usr links."""
    path = Path(path)
    if not path.is_absolute() or ".." in path.parts:
        fail("RECOVERY_TRUSTED_PATH")
    pending, checked = [path], set()
    while pending:
        current = pending.pop()
        for item in (*reversed(current.parents), current):
            if item in checked:
                continue
            checked.add(item)
            if len(checked) > 128:
                fail("RECOVERY_PATH_DEPTH")
            info = item.lstat()
            if info.st_uid != 0:
                fail("RECOVERY_PATH_OWNER")
            if stat.S_ISLNK(info.st_mode):
                pending.append(item.resolve(strict=True))
            elif (not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode))
                  or info.st_mode & 0o022
                  or stat.S_ISREG(info.st_mode) and info.st_mode & 0o6000
                  and not (allow_setuid and item == path)):
                fail("RECOVERY_PATH_MODE")
    info = path.stat()
    if executable and (not stat.S_ISREG(info.st_mode) or info.st_mode & 0o005 != 0o005):
        fail("RECOVERY_TOOL")
    return path


def read_regular(path, limit, mode=0o644):
    before = metadata(path, mode)
    if before.st_size > limit:
        fail("RECOVERY_FILE_SIZE")
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(descriptor, "rb") as stream:
        opened = os.fstat(stream.fileno())
        if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
            fail("RECOVERY_FILE_CHANGED")
        data = stream.read(limit + 1)
    if len(data) != before.st_size or len(data) > limit:
        fail("RECOVERY_FILE_CHANGED")
    return data


def digest(data):
    return hashlib.sha256(data).hexdigest()


def command(arguments, timeout=30):
    trusted_path(arguments[0], executable=True, allow_setuid=arguments[0] == "/usr/bin/sudo")
    try:
        result = subprocess.run(arguments, env=ENV, stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired):
        fail("RECOVERY_COMMAND_FAILED")
    if (result.returncode != 0 or result.stderr or len(result.stdout) > 4 * 1024**2):
        fail("RECOVERY_COMMAND_REJECTED")
    try:
        return result.stdout.decode("utf-8", errors="strict")
    except UnicodeError:
        fail("RECOVERY_COMMAND_ENCODING")


def require_children(path, expected):
    metadata(path, 0o755, True)
    if {item.name for item in Path(path).iterdir()} != set(expected):
        fail("RECOVERY_TREE_LAYOUT")


def verify_payload(root, manifest):
    """Read every file and reject extra files, empty directories and all links."""
    if (not isinstance(manifest, dict) or manifest.get("schemaVersion") != 1
            or manifest.get("product") != "nexowatt-eos"
            or manifest.get("releaseVersion") != "0.2.0-test.3"
            or manifest.get("sequence") != 5 or manifest.get("profile") != "test"
            or manifest.get("nodeVersion") != "24.21.0"
            or manifest.get("platforms") != ["linux-arm64"]):
        fail("RECOVERY_MANIFEST_PROFILE")
    rows = manifest.get("files")
    if not isinstance(rows, list) or not 1 <= len(rows) <= 30000:
        fail("RECOVERY_MANIFEST_FILES")
    files, directories = {}, {""}
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"path", "size", "sha256", "mode"}:
            fail("RECOVERY_MANIFEST_ENTRY")
        name = row["path"]
        if (not isinstance(name, str) or not name or "\\" in name or "\x00" in name
                or PurePosixPath(name).is_absolute() or ":" in name
                or any(part in ("", ".", "..") for part in name.split("/"))
                or name in files or len(name) > 2048
                or type(row["size"]) is not int or not 0 <= row["size"] <= 256 * 1024**2
                or type(row["mode"]) is not int or row["mode"] not in (0o644, 0o755)
                or not isinstance(row["sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", row["sha256"])):
            fail("RECOVERY_MANIFEST_ENTRY")
        files[name] = row
        for parent in PurePosixPath(name).parents:
            if str(parent) != ".":
                directories.add(str(parent))
    if set(files) & directories:
        fail("RECOVERY_MANIFEST_COLLISION")
    found_files, found_directories, pending = set(), set(), [Path(root)]
    device = metadata(root, 0o755, True).st_dev
    while pending:
        path = pending.pop()
        name = path.relative_to(root).as_posix()
        if name == ".":
            name = ""
        info = path.lstat()
        if info.st_dev != device:
            fail("RECOVERY_TREE_FILESYSTEM")
        if stat.S_ISDIR(info.st_mode):
            metadata(path, 0o755, True)
            if name not in directories:
                fail("RECOVERY_TREE_EXTRA_DIRECTORY")
            found_directories.add(name)
            pending.extend(path.iterdir())
        else:
            row = files.get(name)
            if row is None:
                fail("RECOVERY_TREE_EXTRA_FILE")
            data = read_regular(path, row["size"], row["mode"])
            if len(data) != row["size"] or digest(data) != row["sha256"]:
                fail("RECOVERY_TREE_HASH")
            found_files.add(name)
    if found_files != set(files) or found_directories != directories:
        fail("RECOVERY_TREE_MISSING")
    return len(files)


def validate_native(data):
    value = parse_json(data)
    if (not isinstance(value, dict) or value.get("schemaVersion") != 1
            or value.get("kind") != "eos-serialport-native-target-probe"
            or value.get("passed") is not True or value.get("platform") != "linux-arm64"
            or value.get("node") != "24.21.0" or value.get("deviceIoPerformed") is not False
            or value.get("hardwareAccepted") is not False
            or not isinstance(value.get("bindings"), list) or len(value["bindings"]) != 2
            or any(not isinstance(row, dict) or row.get("targetProbePassed") is not True for row in value["bindings"])):
        fail("RECOVERY_NATIVE_EVIDENCE")
    # This is preserved unsigned historical evidence, not a repeated native test.
    return digest(data)


def verify_stage(stage=STAGE):
    initial = metadata(stage, 0o755, True)
    require_children(stage, ("releases", "verified"))
    require_children(stage / "releases", (RELEASE,))
    require_children(stage / "verified", (RELEASE,))
    evidence = stage / "verified" / RELEASE
    require_children(evidence, ("manifest.json", "manifest.sig", "release-public.pem", "native-acceptance.json"))
    raw = read_regular(evidence / "manifest.json", 8 * 1024**2)
    signature = read_regular(evidence / "manifest.sig", 64)
    public_key = read_regular(evidence / "release-public.pem", 1024)
    if (digest(raw) != RELEASE or digest(signature) != SIGNATURE_SHA256
            or digest(public_key) != PUBLIC_KEY_SHA256):
        fail("RECOVERY_R2_PIN")
    # Detached signature is already raw Ed25519, not base64. The key and exact
    # raw manifest/signature hashes above are independently fixed in this helper.
    command(["/usr/bin/openssl", "pkeyutl", "-verify", "-pubin", "-inkey", str(evidence / "release-public.pem"),
             "-rawin", "-in", str(evidence / "manifest.json"), "-sigfile", str(evidence / "manifest.sig")])
    manifest = parse_json(raw)
    if len(manifest.get("files", [])) != 22202:
        fail("RECOVERY_R2_INVENTORY")
    count = verify_payload(stage / "releases" / RELEASE, manifest)
    native_sha256 = validate_native(read_regular(evidence / "native-acceptance.json", 65536))
    final = metadata(stage, 0o755, True)
    if (initial.st_dev, initial.st_ino) != (final.st_dev, final.st_ino):
        fail("RECOVERY_STAGING_CHANGED")
    return {"releaseId": RELEASE, "filesVerified": count, "nativeEvidenceSha256": native_sha256,
            "stageDevice": initial.st_dev, "stageInode": initial.st_ino}


def parse_table(text, columns):
    rows = []
    for line in text.splitlines():
        row = line.split(":")
        if len(row) != columns or not row[0]:
            fail("RECOVERY_ACCOUNT_TABLE")
        rows.append(row)
    if not rows or len({row[0] for row in rows}) != len(rows):
        fail("RECOVERY_ACCOUNT_TABLE")
    return rows


def validate_postgres_identity(passwd_text, group_text):
    """Bind the directory exception to the real, unaliased package account."""
    users, groups = parse_table(passwd_text, 7), parse_table(group_text, 4)
    target = [row for row in users if row[0] == "postgres"]
    target_group = [row for row in groups if row[0] == "postgres"]
    if (len(target) != 1 or len(target_group) != 1
            or any(not re.fullmatch(r"[0-9]{1,10}", row[2])
                   or not re.fullmatch(r"[0-9]{1,10}", row[3]) for row in users)
            or any(not re.fullmatch(r"[0-9]{1,10}", row[2]) for row in groups)):
        fail("RECOVERY_POSTGRES_IDENTITY")
    user, group = target[0], target_group[0]
    uid, gid = int(user[2]), int(group[2])
    if (not 0 < uid < 2**32 - 1 or not 0 < gid < 2**32 - 1
            or uid == UID or gid == GID or int(user[3]) != gid
            or sum(int(row[2]) == uid for row in users) != 1
            or sum(int(row[2]) == gid for row in groups) != 1):
        fail("RECOVERY_POSTGRES_IDENTITY")
    return user, group


def postgres_identity():
    for path in ("/etc/passwd", "/etc/group"):
        trusted_path(path)
    local = validate_postgres_identity(Path("/etc/passwd").read_text(encoding="utf-8"),
                                       Path("/etc/group").read_text(encoding="utf-8"))
    resolved = validate_postgres_identity(command(["/usr/bin/getent", "passwd"]),
                                          command(["/usr/bin/getent", "group"]))
    if local != resolved:
        fail("RECOVERY_POSTGRES_IDENTITY")
    return int(local[0][2]), int(local[1][2])


def check_empty_postgresql_directory(path, identity):
    """Only PG's empty container directories may use its package UID/GID.

    No files inside these directories are trusted or read. Tool, account-file
    and ancestor ownership checks remain root-only. Neither path is changed.
    """
    path = Path(path)
    trusted_path(path.parent)
    before = path.lstat()
    if (not stat.S_ISDIR(before.st_mode) or before.st_mode & 0o7022
            or (before.st_uid, before.st_gid) not in {(0, 0), identity}):
        fail("RECOVERY_POSTGRES_DIRECTORY")
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        opened = os.fstat(descriptor)
        expected = (before.st_dev, before.st_ino, before.st_mode, before.st_uid, before.st_gid)
        if (opened.st_dev, opened.st_ino, opened.st_mode, opened.st_uid, opened.st_gid) != expected:
            fail("RECOVERY_POSTGRES_DIRECTORY_CHANGED")
        with os.scandir(descriptor) as entries:
            if next(entries, None) is not None:
                fail("RECOVERY_EXISTING_CLUSTER_DATA")
        after = path.lstat()
        if (after.st_dev, after.st_ino, after.st_mode, after.st_uid, after.st_gid) != expected:
            fail("RECOVERY_POSTGRES_DIRECTORY_CHANGED")
    finally:
        os.close(descriptor)


def check_postgresql_directories():
    paths = [path for path in (Path("/etc/postgresql"), Path("/var/lib/postgresql"))
             if os.path.lexists(path)]
    if paths:
        identity = postgres_identity()
        for path in paths:
            check_empty_postgresql_directory(path, identity)


def validate_accounts(passwd_text, group_text, shadow_text, *, account=ACCOUNT, group=ACCOUNT):
    users, groups = parse_table(passwd_text, 7), parse_table(group_text, 4)
    target = [row for row in users if row[0] == account]
    target_group = [row for row in groups if row[0] == group]
    if (target != [[account, "x", str(UID), str(GID), "", "/nonexistent", "/usr/sbin/nologin"]]
            or target_group != [[group, "x", str(GID), ""]]):
        fail("RECOVERY_ACCOUNT_IDENTITY")
    for row in users:
        if (not row[2].isdigit() or not row[3].isdigit()
                or row[0] != account and (int(row[2]) == UID or int(row[3]) == GID)
                or row[0] not in {account} and (row[0].startswith("eos-") or row[0] in FORBIDDEN_ACCOUNTS)):
            fail("RECOVERY_ACCOUNT_COLLISION")
    for row in groups:
        if (not row[2].isdigit() or row[0] != group and int(row[2]) == GID
                or account in row[3].split(",")
                or row[0] != group and (row[0].startswith("eos-") or row[0] in FORBIDDEN_ACCOUNTS)):
            fail("RECOVERY_GROUP_COLLISION")
    shadow = [row for row in parse_table(shadow_text, 9) if row[0] == account]
    if len(shadow) != 1 or not shadow[0][1].startswith(("!", "*")):
        fail("RECOVERY_ACCOUNT_NOT_LOCKED")


def check_accounts(*, account=ACCOUNT, group=ACCOUNT):
    # Only the validation result leaves this function; shadow contents are never
    # printed, journalled, embedded in exceptions or passed to another process.
    for path in ("/etc/passwd", "/etc/group", "/etc/shadow"):
        trusted_path(path)
    passwd = Path("/etc/passwd").read_text(encoding="utf-8")
    groups = Path("/etc/group").read_text(encoding="utf-8")
    shadow = Path("/etc/shadow").read_text(encoding="utf-8")
    validate_accounts(passwd, groups, shadow, account=account, group=group)
    validate_accounts(command(["/usr/bin/getent", "passwd"]), command(["/usr/bin/getent", "group"]),
                      shadow, account=account, group=group)
    if command(["/usr/bin/id", "-G", account]).strip() != str(GID):
        fail("RECOVERY_SUPPLEMENTARY_GROUPS")
    response = command(["/usr/bin/sudo", "-n", "-l", "-U", account])
    if not re.fullmatch(r"User " + re.escape(account) + r" is not allowed to run sudo on [A-Za-z0-9][A-Za-z0-9_.-]{0,252}\.\n", response):
        fail("RECOVERY_SUDO_POLICY")


def validate_process_status(text):
    fields = {}
    for line in text.splitlines():
        key, separator, value = line.partition(":")
        if separator and key in ("Uid", "Gid", "Groups"):
            if key in fields or any(not part.isdigit() for part in value.split()):
                fail("RECOVERY_PROCESS_TABLE")
            fields[key] = [int(part) for part in value.split()]
    if set(fields) != {"Uid", "Gid", "Groups"} or len(fields["Uid"]) != 4 or len(fields["Gid"]) != 4:
        fail("RECOVERY_PROCESS_TABLE")
    if UID in fields["Uid"] or GID in fields["Gid"] or GID in fields["Groups"]:
        fail("RECOVERY_ACCOUNT_PROCESS")


def check_processes():
    for entry in Path("/proc").iterdir():
        if entry.name.isdigit():
            try:
                validate_process_status((entry / "status").read_text(encoding="ascii"))
            except FileNotFoundError:
                # A process disappearing during the scan cannot retain the ID.
                continue


def check_mounts(text, stage=STAGE):
    found = False
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 10 or "-" not in parts or len(parts[4]) > 4096:
            fail("RECOVERY_MOUNT_TABLE")
        mount = re.sub(r"\\([0-7]{3})", lambda match: chr(int(match[1], 8)), parts[4])
        if not mount.startswith("/"):
            fail("RECOVERY_MOUNT_TABLE")
        found = True
        if mount == str(stage) or mount.startswith(str(stage) + "/"):
            fail("RECOVERY_STAGING_MOUNT")
    if not found:
        fail("RECOVERY_MOUNT_TABLE")


def check_current_mounts(stage):
    check_mounts(Path("/proc/self/mountinfo").read_text(encoding="utf-8"), stage)


def check_units(text):
    rows = text.splitlines()
    if not rows:
        fail("RECOVERY_UNIT_TABLE")
    for row in rows:
        match = UNIT_ROW.fullmatch(row)
        if not match:
            fail("RECOVERY_UNIT_TABLE")
        if match[1].startswith(("nexowatt-eos", "iobroker")):
            fail("RECOVERY_EXISTING_UNIT")


def validate_os_release(text):
    identifiers = re.findall(r"^ID=(.*)$", text, re.M)
    versions = re.findall(r"^VERSION_ID=(.*)$", text, re.M)
    if (len(identifiers) != 1 or identifiers[0] not in ("debian", '"debian"', "raspbian", '"raspbian"')
            or len(versions) != 1 or versions[0] not in ("13", '"13"')):
        fail("RECOVERY_DEBIAN_13_REQUIRED")


def preflight():
    if os.geteuid() != 0 or platform.system() != "Linux" or platform.machine() != "aarch64":
        fail("RECOVERY_ROOT_DEBIAN_ARM64_REQUIRED")
    trusted_path("/etc/os-release")
    validate_os_release(Path("/etc/os-release").read_text(encoding="utf-8"))
    for tool in ("/usr/bin/openssl", "/usr/bin/systemctl", "/usr/bin/getent", "/usr/bin/id",
                 "/usr/bin/pg_lsclusters", "/usr/sbin/groupmod", "/usr/sbin/usermod"):
        trusted_path(tool, executable=True)
    manager = command(["/usr/bin/systemctl", "show", "--property=Version", "--property=SystemState"])
    if not re.search(r"^Version=\S+$", manager, re.M) or not re.search(r"^SystemState=(?:running|degraded)$", manager, re.M):
        fail("RECOVERY_SYSTEMD_REQUIRED")
    # Unlike tool paths, the staging ancestors must not use symlinks.
    for path in (*reversed(PARENT.parents), PARENT):
        info = path.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or info.st_gid != 0 or info.st_mode & 0o022:
            fail("RECOVERY_STAGING_ANCESTOR")
    if any(path.name.startswith(QUARANTINE_PREFIX) for path in PARENT.iterdir()):
        fail("RECOVERY_PRIOR_JOURNAL_REQUIRES_REVIEW")
    for path in EOS_PATHS:
        if os.path.lexists(path):
            fail("RECOVERY_EXISTING_EOS_DATA")
    check_postgresql_directories()
    if command(["/usr/bin/pg_lsclusters", "--no-header"]).strip():
        fail("RECOVERY_EXISTING_CLUSTER")
    check_units(command(["/usr/bin/systemctl", "list-unit-files", "--no-legend", "--no-pager", "--full"]))
    check_accounts()
    check_processes()
    check_current_mounts(STAGE)
    return verify_stage()


def fsync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def write_journal(quarantine, report, *, completed, next_action):
    value = {"schemaVersion": 1, "kind": "eos-r2-sudo-abort-preservation", "releaseId": RELEASE,
             "originalAccount": ACCOUNT, "preservedAccount": PRESERVED_ACCOUNT, "uid": UID, "gid": GID,
             "completed": completed, "nextAction": next_action, "stageSource": str(STAGE),
             "stageDestination": str(quarantine / "eos"), "verification": report,
             "automaticResumeAllowed": False, "installationExecuted": False,
             "piInstallationAndHardwareAcceptance": "OPEN"}
    target = quarantine / "journal.next"
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as stream:
        stream.write((json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8"))
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(target, quarantine / "journal.json")
    fsync_directory(quarantine)


def recover(report):
    """Called only after complete preflight; a failure never triggers rollback."""
    quarantine = Path(tempfile.mkdtemp(prefix=QUARANTINE_PREFIX, dir=PARENT))
    os.chmod(quarantine, 0o700)
    metadata(quarantine, 0o700, True)
    fsync_directory(PARENT)
    # Print the preservation location before any rename so even an I/O error
    # preventing the first journal write has a visible, non-secret location.
    print("EOS: Geschuetzte Sicherung: " + str(quarantine), flush=True)
    write_journal(quarantine, report, completed="checks-passed", next_action="rename-staging")
    check_processes()
    check_current_mounts(STAGE)
    before = metadata(STAGE, 0o755, True)
    if ((before.st_dev, before.st_ino) != (report.get("stageDevice"), report.get("stageInode"))
            or before.st_dev != PARENT.lstat().st_dev or before.st_dev != quarantine.lstat().st_dev):
        fail("RECOVERY_STAGING_CHANGED")
    os.rename(STAGE, quarantine / "eos")
    fsync_directory(PARENT)
    fsync_directory(quarantine)
    write_journal(quarantine, report, completed="staging-preserved", next_action="rename-group")
    check_processes()
    command(["/usr/sbin/groupmod", "--new-name", PRESERVED_ACCOUNT, ACCOUNT])
    check_accounts(account=ACCOUNT, group=PRESERVED_ACCOUNT)
    write_journal(quarantine, report, completed="group-preserved", next_action="rename-account")
    check_processes()
    command(["/usr/sbin/usermod", "--login", PRESERVED_ACCOUNT, ACCOUNT])
    check_accounts(account=PRESERVED_ACCOUNT, group=PRESERVED_ACCOUNT)
    check_processes()
    if os.path.lexists(STAGE):
        fail("RECOVERY_STAGING_REAPPEARED")
    preserved = metadata(quarantine / "eos", 0o755, True)
    if (preserved.st_dev, preserved.st_ino) != (report["stageDevice"], report["stageInode"]):
        fail("RECOVERY_STAGING_CHANGED")
    write_journal(quarantine, report, completed="recovery-complete", next_action="operator-may-run-current-installer")
    print("EOS: R2-Abbruch gesichert; UID 999 und GID 985 bleiben erhalten. Keine Installation ausgefuehrt.", flush=True)
    return quarantine


def main(argv):
    if argv not in ([], ["--check"], ["--recover"]):
        fail("RECOVERY_USAGE_CHECK_OR_RECOVER")
    report = preflight()
    print("EOS: Bekannter R2-Abbruch vollstaendig geprueft (22202 Dateien).", flush=True)
    if argv == ["--recover"]:
        recover(report)
    else:
        print("EOS: Nur geprueft; keine Aenderung. --recover sichert den bestaetigten Abbruchzustand.", flush=True)


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except (Rejected, OSError, RuntimeError) as error:
        # Raw OS errors may include unexpected filenames; publish only our code.
        code = str(error) if isinstance(error, Rejected) else "RECOVERY_OS_OPERATION_FAILED"
        print("EOS: Sicherung angehalten: " + code + ". Daten und Konten wurden nicht geloescht. "
              "Vorhandene .eos-r2-abort-Verzeichnisse und deren Journal vor weiteren Schritten pruefen.", file=sys.stderr)
        sys.exit(1)
