#!/usr/bin/python3
"""Retire the diagnosed R8 TEST host, retaining private data and numeric owners.

No target-root, force, key, shell, or release override. The unchanged, pinned
Managed16 preparer supplies download and fresh-host admission; installed EOS
code is never imported/executed by this helper. Root must not run another host
maintenance operation concurrently. See R8_ENTFERNUNG_VORBEREITEN_DE.md.
"""
import base64
import fcntl
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import selectors
import shutil
import socket
import stat
import subprocess
import sys
import tempfile
import time
import types

R8 = "eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7"
R8_KEY = "bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5"
ENTRY_URL = "https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/1707dfcb5a12c92ec472899ea1f554ed6850ec02/delivery/managed16/install.sh"
ENTRY_SHA = "cf930e26fb6d45235017e0bba55bd43ef74214d06cb465719ecdbf4a1515431f"
ENTRY_SIZE = 49985
NODE = "/opt/nexowatt-node/node-v24.21.0-linux-arm64/bin/node"
ROOTS = ("/opt/nexowatt/eos", "/etc/nexowatt-eos", "/var/lib/nexowatt-eos",
         "/var/log/nexowatt-eos", "/etc/nexowatt-eos-os-updates", "/var/lib/nexowatt-eos-os-updates")
ACCOUNTS = {"eos-runtime": (997, 984), "eos-postgres": (996, 983), "eos-setup": (995, 982)}
UNITS = tuple("nexowatt-eos-" + name for name in (
    "setup-finalize.path", "controller.service", "initialize.service", "os-updates.service",
    "pg-certificates.service", "postgresql.service", "setup-finalize.service",
    "setup-license.service", "setup.service", "upload.service", "setup.target",
    "os-updates.timer", "pg-certificates.timer")) + ("nexowatt-eos.target",)
LINKS = ("/etc/systemd/system/multi-user.target.wants/nexowatt-eos.target",
         "/etc/systemd/system/timers.target.wants/nexowatt-eos-os-updates.timer",
         "/etc/systemd/system/timers.target.wants/nexowatt-eos-pg-certificates.timer")
UNIT_PATHS = tuple("/etc/systemd/system/" + name for name in UNITS)
MOVES = LINKS + UNIT_PATHS + ("/usr/bin/node",) + ROOTS
GUARDS = ("maintenance-start.json", ".r8-managed.guard", "r8-managed-status.json",
          "r8-managed-plan.json", "r8-managed-host-plan.json", "managed-update-status.json")
GUARD = "/etc/nexowatt-eos/.activation.lock"
ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LC_ALL": "C"}
PACKAGE_LOCKS = ("/var/lib/dpkg/lock-frontend", "/var/lib/dpkg/lock",
                 "/var/lib/apt/lists/lock", "/var/cache/apt/archives/lock")
POLICIES = ("/usr/sbin/policy-rc.d", "/etc/apt/apt.conf.d/90nexowatt-eos-managed")


class Rejected(Exception):
    pass


def require(condition, code):
    if not condition:
        raise Rejected(code)


def exists(path):
    return os.path.lexists(path)


def parent_fd(path):
    parts = str(path).split("/")
    require(str(path).startswith("/") and all(p not in ("", ".", "..") for p in parts[1:]), "PATH")
    fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in parts[1:-1]:
            nxt = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = nxt
            s = os.fstat(fd)
            require(s.st_uid == 0 and not s.st_mode & 0o022, "PARENT")
        return fd, parts[-1]
    except BaseException:
        os.close(fd)
        raise


def info(path):
    fd, name = parent_fd(path)
    try:
        return os.stat(name, dir_fd=fd, follow_symlinks=False)
    finally:
        os.close(fd)


def read(path, limit=65536):
    parent, name = parent_fd(path)
    try:
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
    finally:
        os.close(parent)
    with os.fdopen(fd, "rb") as stream:
        s = os.fstat(stream.fileno())
        require(stat.S_ISREG(s.st_mode) and s.st_uid == 0 and s.st_nlink == 1
                and not s.st_mode & 0o022 and s.st_size <= limit, "FILE")
        data = stream.read(limit + 1)
        after = os.fstat(stream.fileno())
        require(len(data) == s.st_size and (s.st_mtime_ns, s.st_ctime_ns, s.st_size)
                == (after.st_mtime_ns, after.st_ctime_ns, after.st_size), "FILE_CHANGED")
        return data


def unique(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "JSON_DUPLICATE")
        result[key] = value
    return result


def decoded(data):
    return json.loads(data, object_pairs_hook=unique)


def run(args, *, allowed=(0,), timeout=20):
    """Bound stdout/stderr while reading; never expose command output on failure."""
    binary = Path(args[0]).resolve(strict=True)
    s = info(binary)
    require(stat.S_ISREG(s.st_mode) and s.st_uid == 0 and not s.st_mode & 0o6022, "TOOL")
    result = [bytearray(), bytearray()]
    with subprocess.Popen(args, env=ENV, stdin=subprocess.DEVNULL,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE) as child:
        try:
            with selectors.DefaultSelector() as select:
                select.register(child.stdout, selectors.EVENT_READ, 0)
                select.register(child.stderr, selectors.EVENT_READ, 1)
                end = time.monotonic() + timeout
                while select.get_map():
                    require(time.monotonic() < end, "COMMAND_TIMEOUT")
                    for key, _ in select.select(min(0.25, max(0, end - time.monotonic()))):
                        block = os.read(key.fileobj.fileno(), 8192)
                        if not block:
                            select.unregister(key.fileobj)
                        else:
                            result[key.data].extend(block)
                            require(len(result[key.data]) <= 1024 * 1024, "COMMAND_OUTPUT")
                child.wait(timeout=max(0.01, end - time.monotonic()))
        except BaseException:
            child.kill()  # only this helper's bounded query/client, never APT/PG.
            child.wait()
            raise
        require(child.returncode in allowed, "COMMAND_FAILED")
        return child.returncode, bytes(result[0]).decode("utf-8", errors="strict")


def output(args):
    return run(args)[1]


def fsync_dir(path):
    fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def write_new(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    fsync_dir(Path(path).parent)


def journal(q, state, phase=None):
    if phase:
        state["phase"] = phase
    fd, name = tempfile.mkstemp(prefix=".journal-", dir=q)
    temporary = Path(name)
    with os.fdopen(fd, "wb") as stream:
        stream.write((json.dumps(state, sort_keys=True) + "\n").encode())
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, q / "journal.json")
    fsync_dir(q)


def fingerprint(path):
    s = info(path)
    return [s.st_dev, s.st_ino, s.st_uid, s.st_gid, s.st_mode]


def protected_makedirs(path):
    parts = str(path).split("/")
    require(str(path).startswith("/") and all(p not in ("", ".", "..") for p in parts[1:]), "PATH")
    fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in parts[1:]:
            try:
                os.mkdir(part, mode=0o700, dir_fd=fd)
                os.fsync(fd)
            except FileExistsError:
                pass
            nxt = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = nxt
            s = os.fstat(fd)
            require(s.st_uid == 0 and not s.st_mode & 0o022, "PARENT")
    finally:
        os.close(fd)


def safe_move(source, destination, expected):
    require(fingerprint(source) == expected and not exists(destination), "MOVE_CHANGED")
    destination = Path(destination)
    protected_makedirs(destination.parent)
    srcfd, srcname = parent_fd(source)
    dstfd = None
    try:
        dstfd, dstname = parent_fd(destination)
        require(os.fstat(srcfd).st_dev == os.fstat(dstfd).st_dev, "MOVE_FILESYSTEM")
        require(not exists(destination) and fingerprint(source) == expected, "MOVE_CHANGED")
        os.rename(srcname, dstname, src_dir_fd=srcfd, dst_dir_fd=dstfd)
        os.fsync(srcfd)
        os.fsync(dstfd)
    finally:
        os.close(srcfd)
        if dstfd is not None:
            os.close(dstfd)


def unit_state(unit):
    keys = ("Id", "LoadState", "ActiveState", "SubState", "FragmentPath", "DropInPaths", "NeedDaemonReload")
    if unit.endswith(".service"):
        keys += ("MainPID", "ControlPID")
    text = output(["/usr/bin/systemctl", "show", unit, "--no-pager", "--property=" + ",".join(keys)])
    rows = [line.split("=", 1) for line in text.splitlines()]
    require(all(len(row) == 2 for row in rows) and len(rows) == len(keys), "UNIT_OUTPUT")
    value = unique(rows)
    require(set(value) == set(keys) and value["Id"] == unit, "UNIT_OUTPUT")
    if not unit.endswith(".service"):
        value.update(MainPID="0", ControlPID="0")
    return value


def package_locks():
    held = []
    try:
        for path in PACKAGE_LOCKS:
            s = info(path)
            require(stat.S_ISREG(s.st_mode) and s.st_uid == 0 and s.st_nlink == 1
                    and not s.st_mode & 0o022, "PACKAGE_LOCK_FILE")
            fd = os.open(path, os.O_RDWR | os.O_NOFOLLOW)
            held.append(fd)
            require(os.fstat(fd).st_ino == s.st_ino, "PACKAGE_LOCK_CHANGED")
            try:
                fcntl.lockf(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise Rejected("PACKAGE_BUSY") from None
        return held
    except BaseException:
        for fd in held:
            os.close(fd)
        raise


def check_mounts(paths):
    # Includes bind mounts, even when st_dev matches the root filesystem.
    with open("/proc/self/mountinfo", "rb") as stream:
        data = stream.read(1024 * 1024 + 1)
    require(len(data) <= 1024 * 1024, "MOUNT_OUTPUT")
    for row in data.decode().splitlines():
        fields = row.split()
        require(len(fields) >= 10, "MOUNT_OUTPUT")
        mount = re.sub(r"\\([0-7]{3})", lambda m: chr(int(m[1], 8)), fields[4])
        require(not any(mount == p or mount.startswith(p + "/") for p in paths), "MOUNT_PRESENT")


def process_identity(entry):
    with open(entry / "stat", "rb") as stream:
        data = stream.read(8193)
    require(len(data) <= 8192 and data.startswith(entry.name.encode() + b" (") and b") " in data, "PROCESS_STAT")
    fields = data.rsplit(b") ", 1)[1].split()
    require(len(fields) >= 20 and fields[19].isdigit(), "PROCESS_STAT")
    return fields[19]


def process_check(*, stopped):
    known_uids = {uid for uid, _ in ACCOUNTS.values()}
    node_stat = os.stat(NODE)
    count, deadline = 0, time.monotonic() + 30
    for entry in Path("/proc").iterdir():
        if not entry.name.isdecimal():
            continue
        count += 1
        require(count <= 16384 and time.monotonic() < deadline, "PROCESS_SCAN_LIMIT")
        try:
            identity = process_identity(entry)
            with open(entry / "status", "rb") as stream:
                raw = stream.read(65537)
            require(len(raw) <= 65536, "PROCESS_OUTPUT")
            match = re.search(rb"^Uid:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$", raw, re.M)
            require(match is not None, "PROCESS_UID")
            uids = {int(value) for value in match.groups()}
            require(not stopped or not uids & known_uids, "EOS_PROCESS_BUSY")
            if uids & known_uids:
                with open(entry / "cgroup", "rb") as stream:
                    cgroup = stream.read(8193)
                require(len(cgroup) <= 8192 and any(
                    cgroup == ("0::/system.slice/" + unit + "\n").encode()
                    for unit in UNITS if unit.endswith(".service")), "EOS_PROCESS_OUTSIDE_UNIT")
            try:
                exe = os.stat(entry / "exe")
            except FileNotFoundError:
                continue  # exited process / kernel thread / zombie
            is_old_node = (exe.st_dev, exe.st_ino) == (node_stat.st_dev, node_stat.st_ino)
            require(not is_old_node or (not stopped and uids <= known_uids), "NODE_IN_USE")
            require(process_identity(entry) == identity, "PROCESS_CHANGED")
        except (FileNotFoundError, ProcessLookupError):
            continue


def check_accounts(*, preserved=False):
    users = [row.split(":") for row in output(["/usr/bin/getent", "passwd"]).splitlines()]
    groups = [row.split(":") for row in output(["/usr/bin/getent", "group"]).splitlines()]
    require(all(len(r) == 7 for r in users) and all(len(r) == 4 for r in groups), "ACCOUNT_OUTPUT")
    for original, (uid, gid) in ACCOUNTS.items():
        name = original.replace("eos-", "eos-r8-", 1) if preserved else original
        other = original if preserved else original.replace("eos-", "eos-r8-", 1)
        u = [r for r in users if r[0] == name or r[2] == str(uid)]
        g = [r for r in groups if r[0] == name or r[2] == str(gid)]
        require(len(u) == len(g) == 1 and u[0][0] == g[0][0] == name
                and u[0][2:4] == [str(uid), str(gid)] and g[0][2] == str(gid)
                and u[0][5:] == ["/nonexistent", "/usr/sbin/nologin"]
                and not g[0][3] and not any(r[0] == other for r in users + groups)
                and sum(r[3] == str(gid) for r in users) == 1
                and not any(name in r[3].split(",") for r in groups), "ACCOUNT_SHARED_OR_CHANGED")
        require(output(["/usr/bin/id", "-G", name]).strip() == str(gid), "ACCOUNT_GROUPS")
        # local entries must equal NSS; remote/NSS-only identities are excluded.
        require(u[0] in [r.split(":") for r in read("/etc/passwd").decode().splitlines()]
                and g[0] in [r.split(":") for r in read("/etc/group").decode().splitlines()], "ACCOUNT_NOT_LOCAL")
        shadow = output(["/usr/bin/getent", "shadow", name]).strip().split(":")
        require(len(shadow) == 9 and shadow[0] == name and shadow[1].startswith(("!", "*")), "ACCOUNT_NOT_LOCKED")
        for directory in ("/var/spool/cron/crontabs", "/var/mail", "/var/spool/mail"):
            require(not exists(Path(directory) / name), "ACCOUNT_EXTERNAL_SPOOL")
    for name in ("eos-network-dhcp", "iobroker"):
        for table in ("passwd", "group"):
            code, text = run(["/usr/bin/getent", table, name], allowed=(0, 2))
            require(code == 2 and not text, "OTHER_ACCOUNT")


def check_identity():
    state = decoded(read("/etc/nexowatt-eos/release-state.json"))
    expected = {"schemaVersion": 1, "releaseId": R8, "sequence": 11, "nodeVersion": "24.21.0",
                "publicKeySha256": R8_KEY, "profile": "test"}
    require(state == expected and type(state.get("sequence")) is int
            and type(state.get("schemaVersion")) is int, "R8_IDENTITY")
    complete = decoded(read("/etc/nexowatt-eos/first-start-complete.json"))
    require(isinstance(complete, dict) and complete.get("releaseId") == R8
            and complete.get("physicalControlEnabled") is False, "PHYSICAL_CONTROL_OR_COMPLETION")
    require(os.readlink("/opt/nexowatt/eos/current") == "/opt/nexowatt/eos/releases/" + R8, "CURRENT")
    manifest_bytes = read("/opt/nexowatt/eos/verified/" + R8 + "/manifest.json", 16 * 1024**2)
    # The independently fixed release ID authenticates these exact manifest bytes.
    require(hashlib.sha256(manifest_bytes).hexdigest() == R8, "R8_MANIFEST_PIN")
    manifest = decoded(manifest_bytes)
    require(manifest.get("sequence") == 11 and manifest.get("nodeVersion") == "24.21.0"
            and manifest.get("profile") == "test", "R8_MANIFEST")
    rows = manifest["files"]
    require(isinstance(rows, list) and len(rows) <= 50000, "R8_MANIFEST")
    pins = unique([(row["path"], row["sha256"]) for row in rows])
    for unit in UNITS:
        path = "/etc/systemd/system/" + unit
        require(hashlib.sha256(read(path)).hexdigest() == pins.get("system/postgresql-test/systemd/" + unit), "UNIT_PIN")
        require(stat.S_IMODE(info(path).st_mode) == 0o644, "UNIT_MODE")


def check_units():
    text = output(["/usr/bin/systemctl", "list-unit-files", "--no-legend", "--no-pager", "--full"])
    found = {r.split()[0] for r in text.splitlines() if r.split() and r.split()[0].startswith(("nexowatt-eos", "iobroker"))}
    require(found == set(UNITS), "UNKNOWN_UNITS")
    loaded = output(["/usr/bin/systemctl", "list-units", "--all", "--plain", "--no-legend", "--no-pager", "--full"])
    loaded_eos = {r.split()[0] for r in loaded.splitlines() if r.split() and r.split()[0].startswith(("nexowatt-eos", "iobroker"))}
    require(loaded_eos <= set(UNITS) | {"nexowatt-eos-r8-managed-update.service"}, "UNKNOWN_LOADED_UNITS")
    active_allowed = {"nexowatt-eos-controller.service", "nexowatt-eos-postgresql.service", "nexowatt-eos.target",
                      "nexowatt-eos-os-updates.timer", "nexowatt-eos-pg-certificates.timer"}
    for unit in UNITS:
        s = unit_state(unit)
        require(s["LoadState"] == "loaded" and s["FragmentPath"] == "/etc/systemd/system/" + unit
                and not s["DropInPaths"] and s["NeedDaemonReload"] == "no", "UNIT_OVERRIDE")
        require(s["ActiveState"] in ("active", "inactive", "failed"), "UNIT_BUSY")
        if unit not in active_allowed:
            require(s["ActiveState"] in ("inactive", "failed") and s["MainPID"] == s["ControlPID"] == "0", "HELPER_BUSY")
    jobs = output(["/usr/bin/systemctl", "list-jobs", "--no-legend", "--no-pager"])
    require(not any(name in jobs for name in ("nexowatt-eos", "iobroker")), "UNIT_JOB_BUSY")
    for unit in ("apt-daily.service", "apt-daily-upgrade.service", "nexowatt-eos-r8-managed-update.service"):
        s = unit_state(unit)
        require(s["ActiveState"] in ("inactive", "failed") and s["MainPID"] == s["ControlPID"] == "0", "MAINTENANCE_BUSY")
    # No unknown enablement/alias/override may survive the fixed removal list.
    count, deadline = 0, time.monotonic() + 15
    for directory in ("/etc/systemd/system", "/run/systemd/system", "/usr/lib/systemd/system"):
        for base, dirs, files in os.walk(directory, followlinks=False):
            for name in dirs + files:
                count += 1
                require(count <= 20000 and time.monotonic() < deadline, "UNIT_SCAN_LIMIT")
                path = str(Path(base) / name)
                if "nexowatt-eos" in name or name.startswith("iobroker"):
                    require(path in UNIT_PATHS + LINKS, "UNIT_FILE_SCOPE")
    for path in LINKS:
        s = info(path)
        require(stat.S_ISLNK(s.st_mode) and s.st_uid == 0
                and os.readlink(path) == "/etc/systemd/system/" + Path(path).name, "ENABLE_LINK")


def check_base(prep):
    require(sys.platform == "linux" and os.geteuid() == 0 and platform.machine() == "aarch64", "ARM64_ROOT_REQUIRED")
    require(Path("/run/systemd/system").is_dir(), "SYSTEMD_REQUIRED")
    release = read(Path("/etc/os-release").resolve(), 16384).decode()
    require(re.search(r'^ID=(?:"debian"|debian)$', release, re.M)
            and re.search(r'^VERSION_ID=(?:"13"|13)$', release, re.M), "DEBIAN13_REQUIRED")
    terminal = os.open("/dev/tty", os.O_RDONLY | os.O_NOCTTY)
    try:
        require(os.isatty(terminal), "TTY_REQUIRED")
    finally:
        os.close(terminal)
    manager = output(["/usr/bin/systemctl", "show", "--property=Version", "--property=SystemState"])
    version = re.search(r"^Version=(\d+)", manager, re.M)
    require(version is not None and int(version[1]) >= 257
            and re.search(r"^SystemState=(running|degraded)$", manager, re.M), "SYSTEMD_VERSION")
    require(shutil.disk_usage("/").free >= 6 * 1024**3, "SPACE_REQUIRED")
    for directory in ("/opt", "/opt/nexowatt-node"):
        prep.trusted_path(directory, directory=True)
        require(info(directory).st_mode & 0o001, "NODE_PARENT_MODE")
    prep.check_apt_sources()
    prep.check_clusters()
    require(not any(exists(p) for p in POLICIES), "HOST_POLICY_CHANGED")
    cluster = read("/etc/postgresql-common/createcluster.conf")
    require(hashlib.sha256(cluster).hexdigest() == "4234006841b26dd8e96e96c23dc8da3c9b6df2ed0c2046d34dc4e8eff88a5dab", "CLUSTER_POLICY_CHANGED")
    include = Path("/etc/postgresql-common/createcluster.d")
    require(not exists(include) or (not include.is_symlink() and include.is_dir() and not any(include.iterdir())), "CLUSTER_INCLUDE")
    require(not output(["/usr/bin/dpkg", "--audit"]).strip(), "DPKG_AUDIT")
    require(not exists("/opt/nexowatt-node/node-v24.22.1-linux-arm64"), "NEW_NODE_ALREADY_PRESENT")


def preflight(prep):
    check_base(prep)
    check_identity()
    check_accounts()
    check_units()
    require(not any(exists("/etc/nexowatt-eos/" + name) for name in GUARDS) and not exists(GUARD), "MAINTENANCE_GUARD")
    for path in prep.EOS_PATHS:
        if path not in ROOTS and path != "/run/nexowatt-eos-postgresql":
            require(not exists(path), "OTHER_EOS_PATH")
    root_device = info("/root").st_dev
    for path in ROOTS:
        s = info(path)
        uid, gid, mode = (997, 984, 0o700) if path == "/var/log/nexowatt-eos" else (0, 0, 0o755)
        require(stat.S_ISDIR(s.st_mode) and (s.st_uid, s.st_gid, stat.S_IMODE(s.st_mode)) == (uid, gid, mode)
                and s.st_dev == root_device, "ROOT_SCOPE")
    for path in MOVES:
        require(info(path).st_dev == root_device and info(Path(path).parent).st_dev == root_device, "MOVE_FILESYSTEM")
    check_mounts(MOVES)
    require(stat.S_ISLNK(info("/usr/bin/node").st_mode) and info("/usr/bin/node").st_uid == 0
            and os.readlink("/usr/bin/node") == NODE, "NODE_LINK")
    target = info(NODE)
    require(stat.S_ISREG(target.st_mode) and target.st_uid == target.st_gid == 0
            and target.st_nlink == 1 and stat.S_IMODE(target.st_mode) == 0o755, "NODE_FILE")
    require(not output(["/usr/sbin/getcap", NODE]).strip(), "NODE_CAPABILITIES")
    for path in ("/usr/bin/node", NODE):
        code, text = run(["/usr/bin/dpkg-query", "-S", path], allowed=(0, 1))
        require(code == 1 and not text, "NODE_PACKAGE_OWNED")
    process_check(stopped=False)


def load_preparer(entry_bytes):
    require(len(entry_bytes) == ENTRY_SIZE and hashlib.sha256(entry_bytes).hexdigest() == ENTRY_SHA, "ENTRY_PIN")
    blocks = []
    for marker in ("EOS_PYTHON_BASE64", "EOS_CONFIG_BASE64"):
        matches = re.findall(rb"<<'" + marker.encode() + rb"'\n([A-Za-z0-9+/=\n]+)\n" + marker.encode() + rb"\n", entry_bytes)
        require(len(matches) == 1, "ENTRY_FORMAT")
        blocks.append(base64.b64decode(matches[0].replace(b"\n", b""), validate=True))
    module = types.ModuleType("eos_pinned_managed16_preparer")
    exec(compile(blocks[0], "pinned-managed16-prepare-host.py", "exec"), module.__dict__)
    config = module.validate_config(decoded(blocks[1]))
    return module, config, blocks


def stop_eos():
    triggers = [u for u in UNITS if u.endswith((".timer", ".path", ".target"))]
    for units in (triggers, list(UNITS)):
        run(["/usr/bin/systemctl", "stop", "--no-block", *units])
        deadline = time.monotonic() + 190
        while True:
            states = [unit_state(u) for u in units]
            if all(s["ActiveState"] in ("inactive", "failed") and s["MainPID"] == s["ControlPID"] == "0" for s in states):
                break
            require(time.monotonic() < deadline, "STOP_TIMEOUT")
            time.sleep(1)
    process_check(stopped=True)
    require(not exists("/var/lib/nexowatt-eos/postgresql/postmaster.pid"), "POSTGRES_NOT_STOPPED")
    # RuntimeDirectory belongs to systemd; it must have been removed on stop.
    require(not exists("/run/nexowatt-eos-postgresql"), "POSTGRES_RUNTIME_REMAINS")


def check_ports():
    for port in (15432, 8081, 8188, 8443):
        for family, address in ((socket.AF_INET, "0.0.0.0"), (socket.AF_INET6, "::")):
            with socket.socket(family, socket.SOCK_STREAM) as probe:
                probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                if family == socket.AF_INET6:
                    probe.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
                try:
                    probe.bind((address, port))
                except OSError:
                    raise Rejected("INSTALL_PORT_BUSY") from None


def check_account_transitions():
    """Allow only the exact old/preserved identity on either side of each rename."""
    tables = {}
    local = {}
    for table, file in (("passwd", "/etc/passwd"), ("group", "/etc/group")):
        tables[table] = [r.split(":") for r in output(["/usr/bin/getent", table]).splitlines()]
        local[table] = [r.split(":") for r in read(file).decode().splitlines()]
        require(all(len(r) == (7 if table == "passwd" else 4) for r in tables[table]), "ACCOUNT_OUTPUT")
    for original, (uid, gid) in ACCOUNTS.items():
        names = {original, original.replace("eos-", "eos-r8-", 1)}
        rows = {}
        for table, identifier in (("passwd", uid), ("group", gid)):
            found = [r for r in tables[table] if r[0] in names or r[2] == str(identifier)]
            require(len(found) == 1 and found[0][0] in names and found[0][2] == str(identifier)
                    and found[0] in local[table], "ACCOUNT_RENAME_STATE")
            rows[table] = found[0]
        user, group = rows["passwd"], rows["group"]
        require(user[3] == str(gid) and user[5:] == ["/nonexistent", "/usr/sbin/nologin"]
                and not group[3] and sum(r[3] == str(gid) for r in tables["passwd"]) == 1
                and not any(names.intersection(r[3].split(",")) for r in tables["group"]), "ACCOUNT_RENAME_SHARED")
        shadow = output(["/usr/bin/getent", "shadow", user[0]]).strip().split(":")
        require(len(shadow) == 9 and shadow[0] == user[0] and shadow[1].startswith(("!", "*")), "ACCOUNT_NOT_LOCKED")


def rename_accounts(*, restore=False, q=None, state=None):
    check_account_transitions()
    for name in ACCOUNTS:
        saved = name.replace("eos-", "eos-r8-", 1)
        before, after = (saved, name) if restore else (name, saved)
        for table, binary in (("group", "/usr/sbin/groupmod"), ("passwd", "/usr/sbin/usermod")):
            check_account_transitions()
            code, _ = run(["/usr/bin/getent", table, before], allowed=(0, 2))
            after_code, row = run(["/usr/bin/getent", table, after], allowed=(0, 2))
            if code == 2:
                require(after_code == 0 and row.split(":")[2] == str(ACCOUNTS[name][table == "group"]), "ACCOUNT_RENAME_STATE")
                continue
            require(after_code == 2, "ACCOUNT_RENAME_COLLISION")
            if q is not None:
                state["next"] = table + ":" + before + ":" + after
                journal(q, state)
            run([binary, "--new-name" if table == "group" else "--login", after, before])
            check_account_transitions()


def retire(q, state):
    journal(q, state, "STOPPING")
    write_new(GUARD, (state["token"] + "\n").encode())
    stop_eos()
    check_ports()
    check_mounts(MOVES)
    process_check(stopped=True)
    check_identity()
    journal(q, state, "MOVING")
    for path in MOVES:
        state["next"] = path
        journal(q, state)
        safe_move(path, q / "original" / path.lstrip("/"), state["originals"][path])
        if path == UNIT_PATHS[-1]:
            run(["/usr/bin/systemctl", "daemon-reload"])
    journal(q, state, "ACCOUNTS")
    rename_accounts(q=q, state=state)
    check_accounts(preserved=True)
    run(["/usr/bin/systemctl", "reset-failed", *UNITS], allowed=(0, 1))
    run(["/usr/bin/systemctl", "daemon-reload"])
    journal(q, state, "RETIRED")


def restore_stopped(q, state):
    require(state.get("phase") in ("STOPPING", "MOVING", "ACCOUNTS", "RETIRED", "RESTORING"), "RESTORE_INSTALL_ALREADY_STARTED")
    require(state.get("schemaVersion") == 1 and state.get("releaseId") == R8
            and set(state.get("originals", {})) == set(MOVES)
            and re.fullmatch(r"[a-f0-9]{64}", state.get("token", "")), "RESTORE_JOURNAL")
    # Preflight all paths before restoring anything. Never overwrite a new install.
    for path in MOVES:
        saved = q / "original" / path.lstrip("/")
        require(exists(path) != exists(saved), "RESTORE_PATH_CONFLICT")
        require(fingerprint(path if exists(path) else saved) == state["originals"][path], "RESTORE_PATH_CHANGED")
    guard = Path(GUARD) if exists(GUARD) else q / "original" / GUARD.lstrip("/")
    if exists(guard):
        require(read(guard) == (state["token"] + "\n").encode(), "RESTORE_GUARD_CHANGED")
    else:
        require(state["phase"] == "RESTORING" and all(exists(p) for p in MOVES if p not in LINKS), "RESTORE_GUARD_CHANGED")
    for unit in UNITS:
        s = unit_state(unit)
        require(s["ActiveState"] in ("inactive", "failed") and s["MainPID"] == s["ControlPID"] == "0", "RESTORE_UNIT_BUSY")
    process_check(stopped=True)
    check_mounts(MOVES + (str(q),))
    check_account_transitions()
    journal(q, state, "RESTORING")
    rename_accounts(restore=True, q=q, state=state)
    check_accounts()
    # Enablement links stay quarantined: recovery never re-enables boot/start.
    for path in LINKS:
        if exists(path):
            safe_move(path, q / "original" / path.lstrip("/"), state["originals"][path])
    for path in reversed(MOVES):
        saved = q / "original" / path.lstrip("/")
        if path not in LINKS and exists(saved):
            safe_move(saved, Path(path), state["originals"][path])
    if exists(GUARD):
        require(read(GUARD) == (state["token"] + "\n").encode(), "RESTORE_GUARD_CHANGED")
        os.unlink(GUARD)
        fsync_dir(Path(GUARD).parent)
    run(["/usr/bin/systemctl", "daemon-reload"])
    journal(q, state, "RESTORED_STOPPED")


def main():
    require(os.geteuid() == 0, "ROOT_REQUIRED")
    require(len(sys.argv) == 1 or (len(sys.argv) == 3 and sys.argv[1] == "--restore-stopped"), "USAGE")
    os.umask(0o077)
    root = info("/root")
    require(stat.S_ISDIR(root.st_mode) and root.st_uid == 0 and not root.st_mode & 0o022, "ROOT_DIRECTORY")
    # A new private coordinator; no existing OS/EOS lock is removed or replaced.
    coordinator = os.open("/root/.eos-r8-retirement.lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    s = os.fstat(coordinator)
    require(stat.S_ISREG(s.st_mode) and s.st_uid == 0 and s.st_nlink == 1 and not s.st_mode & 0o077, "COORDINATOR_FILE")
    fcntl.flock(coordinator, fcntl.LOCK_EX | fcntl.LOCK_NB)
    if len(sys.argv) == 3 and sys.argv[1] == "--restore-stopped":
        q = Path(sys.argv[2])
        require(q.parent == Path("/root") and re.fullmatch(r"eos-r8-retired-[A-Za-z0-9_-]+", q.name), "RESTORE_PATH")
        require(stat.S_ISDIR(info(q).st_mode) and info(q).st_uid == 0
                and stat.S_IMODE(info(q).st_mode) == 0o700, "RESTORE_PRIVATE")
        restore_stopped(q, decoded(read(q / "journal.json")))
        print('EOS: R8-Dateien und Konten wiederhergestellt; Dienste bleiben gestoppt und ohne Autostart.')
        return
    require(len(sys.argv) == 1, "USAGE")
    staging = Path(tempfile.mkdtemp(prefix="eos-download-", dir="/root"))
    entry = staging / "install.sh"
    run(["/usr/bin/curl", "-q", "--proto", "=https", "--tlsv1.2", "--fail", "--silent", "--show-error",
         "--connect-timeout", "20", "--max-time", "120", "--max-filesize", str(ENTRY_SIZE), ENTRY_URL, "-o", str(entry)], timeout=125)
    prep, config, blocks = load_preparer(read(entry, ENTRY_SIZE))
    preflight(prep)
    print("EOS: R8 erkannt. Lade und pruefe R16 vollstaendig vor der Stilllegung.", flush=True)
    prep.download_assets(config, staging)
    write_new(staging / "prepare-host.py", blocks[0])
    write_new(staging / "download.json", blocks[1])
    locks = package_locks()
    q = None
    state = None
    try:
        preflight(prep)
        q = Path(tempfile.mkdtemp(prefix="eos-r8-retired-", dir="/root"))
        state = {"schemaVersion": 1, "releaseId": R8, "token": os.urandom(32).hex(),
                 "phase": "PREPARED", "originals": {path: fingerprint(path) for path in MOVES}}
        journal(q, state)
        print("EOS: Private R8-Rueckfallablage (nicht hochladen): " + str(q), flush=True)
        retire(q, state)
        prep.preflight(staging)  # the original, unchanged fresh-host admission
    except BaseException:
        if q is not None and state is not None and state["phase"] != "PREPARED":
            print("EOS: Angehalten. Private Rueckfallablage: " + str(q), flush=True)
            print("EOS: R16 wurde noch nicht gestartet. Keine automatische Wiederaktivierung von R8.", flush=True)
        raise
    finally:
        for fd in locks:
            os.close(fd)
    journal(q, state, "INSTALLING_MANAGED16")
    print("EOS: R8 stillgelegt; unveraenderte R16-Neuinstallation startet.", flush=True)
    prep.install_downloaded(config, staging)
    journal(q, state, "MANAGED16_INSTALLER_FINISHED")
    print("EOS: R16-Installer beendet. Pi-Funktionspruefung steht noch aus. R8-Ablage: " + str(q), flush=True)


if __name__ == "__main__":
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        code = str(error) if isinstance(error, Rejected) else "RETIREMENT_STOPPED"
        if type(error).__module__ == "eos_pinned_managed16_preparer" and re.fullmatch(r"BOOTSTRAP_[A-Z_]+", str(error)):
            code = str(error)
        print("EOS: Abbruch: " + code + ". Vorhandene Ablagen bleiben erhalten.", file=sys.stderr)
        sys.exit(1)
