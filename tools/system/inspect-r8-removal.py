#!/usr/bin/python3
"""Read-only, redacted facts for planning R8 retirement. Never authorizes removal."""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

R8 = "eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7"
NODE = "/opt/nexowatt-node/node-v24.21.0-linux-arm64/bin/node"
ACCOUNTS = ("eos-runtime", "eos-postgres", "eos-setup", "eos-network-dhcp", "iobroker")
UNITS = tuple("nexowatt-eos-" + name for name in (
    "setup-finalize.path", "controller.service", "initialize.service", "os-updates.service",
    "pg-certificates.service", "postgresql.service", "setup-finalize.service",
    "setup-license.service", "setup.service", "upload.service", "setup.target",
    "os-updates.timer", "pg-certificates.timer")) + ("nexowatt-eos.target",)
ROOTS = ("/opt/nexowatt/eos", "/etc/nexowatt-eos", "/var/lib/nexowatt-eos",
         "/var/log/nexowatt-eos", "/etc/nexowatt-eos-os-updates", "/var/lib/nexowatt-eos-os-updates")
EXTRA = ("/opt/iobroker", "/opt/nexowatt-eos", "/etc/nexowatt-eos-network",
         "/var/lib/nexowatt-eos-network", "/var/lib/nexowatt-eos-network-install",
         "/usr/lib/nexowatt-eos-network", "/var/lib/nexowatt-eos-dhcp",
         "/run/nexowatt-eos-network", "/run/nexowatt-eos-network-install.lock",
         "/var/lib/nexowatt-eos-updates", "/run/nexowatt-eos-updates")
GUARDS = (".activation.lock", "maintenance-start.json", ".r8-managed.guard",
          "r8-managed-status.json", "r8-managed-plan.json", "r8-managed-host-plan.json",
          "first-start-recovery-r7.json", "first-start-recovery-r8.json",
          "managed-update-status.json")
ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LC_ALL": "C"}


def parent_fd(path):
    """Walk fixed absolute paths without traversing any symbolic-link ancestor."""
    parts = str(path).split("/")
    if not str(path).startswith("/") or any(p in ("", ".", "..") for p in parts[1:]):
        raise ValueError("PATH")
    fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in parts[1:-1]:
            nxt = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = nxt
        return fd, parts[-1]
    except BaseException:
        os.close(fd)
        raise


def read_regular(path, maximum=65536):
    parent, name = parent_fd(path)
    try:
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
    finally:
        os.close(parent)
    with os.fdopen(fd, "rb") as stream:
        before = os.fstat(stream.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_size > maximum:
            raise ValueError("FILE")
        data = stream.read(maximum + 1)
        after = os.fstat(stream.fileno())
        if len(data) != before.st_size or len(data) > maximum or (
                before.st_size, before.st_mtime_ns, before.st_ctime_ns) != (
                after.st_size, after.st_mtime_ns, after.st_ctime_ns):
            raise ValueError("CHANGED")
        return data


def metadata(path, digest=False):
    try:
        parent, name = parent_fd(path)
        try:
            s = os.stat(name, dir_fd=parent, follow_symlinks=False)
        finally:
            os.close(parent)
        kind = "directory" if stat.S_ISDIR(s.st_mode) else "file" if stat.S_ISREG(s.st_mode) else "symlink" if stat.S_ISLNK(s.st_mode) else "other"
        result = {"type": kind, "uid": s.st_uid, "gid": s.st_gid, "mode": oct(stat.S_IMODE(s.st_mode)), "links": s.st_nlink}
        if digest and kind == "file":
            result["sha256"] = hashlib.sha256(read_regular(path)).hexdigest()
        return result
    except FileNotFoundError:
        return {"type": "absent"}
    except (OSError, ValueError):
        return {"type": "unreadable-or-unsafe"}


def link_matches(path, expected):
    try:
        parent, name = parent_fd(path)
        try:
            return os.readlink(name, dir_fd=parent) == expected
        finally:
            os.close(parent)
    except OSError:
        return False


def child_count(path):
    try:
        parent, name = parent_fd(path)
        try:
            fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)
        finally:
            os.close(parent)
        try:
            count = 0
            with os.scandir(fd) as rows:
                for _ in rows:
                    count += 1
                    if count > 256:
                        return "more-than-256"
            return count
        finally:
            os.close(fd)
    except FileNotFoundError:
        return 0
    except OSError:
        return "unreadable-or-unsafe"


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("DUPLICATE")
        result[key] = value
    return result


def identity(path, completion=False):
    try:
        value = json.loads(read_regular(path, 32768), object_pairs_hook=unique_object)
        if not isinstance(value, dict):
            raise ValueError("OBJECT")
        result = {"validObject": True, "knownR8Release": value.get("releaseId") == R8}
        if completion:
            result["physicalControlExplicitlyDisabled"] = value.get("physicalControlEnabled") is False
        else:
            result.update(sequence11=type(value.get("sequence")) is int and value["sequence"] == 11,
                          testProfile=value.get("profile") == "test", node24210=value.get("nodeVersion") == "24.21.0")
        return result
    except (OSError, ValueError, UnicodeError):
        return {"validObject": False}


def query(arguments):
    # Only fixed OS queries; no shell, runtime code, config sourcing or network.
    try:
        r = subprocess.run(arguments, env=ENV, capture_output=True, timeout=5, check=False)
        if len(r.stdout) > 131072 or len(r.stderr) > 65536:
            return None
        return r.returncode, r.stdout.decode("utf-8", errors="strict")
    except (OSError, subprocess.TimeoutExpired, UnicodeError):
        return None


def package_owner(path):
    r = query(["/usr/bin/dpkg-query", "-S", path])
    return "owned" if r and r[0] == 0 and r[1].strip() else "unowned" if r and r[0] == 1 and not r[1] else "unknown"


def accounts():
    try:
        users = [row.split(":") for row in read_regular("/etc/passwd").decode().splitlines()]
        groups = [row.split(":") for row in read_regular("/etc/group").decode().splitlines()]
        if any(len(row) != 7 for row in users) or any(len(row) != 4 for row in groups):
            raise ValueError("ACCOUNT")
        result = {}
        for name in ACCOUNTS:
            found = [u for u in users if u[0] == name]
            own_groups = [g for g in groups if g[0] == name]
            if not found:
                result[name] = {"userPresent": False, "groupPresent": bool(own_groups)}
                continue
            if len(found) != 1 or not found[0][2].isdigit() or not found[0][3].isdigit():
                raise ValueError("ACCOUNT")
            u = found[0]
            result[name] = {"uid": int(u[2]), "gid": int(u[3]), "dedicatedHome": u[5] == "/nonexistent",
                            "nologin": u[6] == "/usr/sbin/nologin", "sharedUid": sum(x[2] == u[2] for x in users) != 1,
                            "otherPrimaryUsers": sum(x[3] == u[3] and x[0] != name for x in users),
                            "ownGroup": len(own_groups) == 1 and own_groups[0][2] == u[3],
                            "foreignGroupMembers": sum(m != name for g in own_groups for m in g[3].split(",") if m),
                            "extraGroups": sum(name in g[3].split(",") and g[0] != name for g in groups)}
        return result
    except (OSError, ValueError, UnicodeError):
        return {"status": "unreadable-or-invalid"}


def inspect():
    units = {}
    for unit in UNITS:
        p = "/etc/systemd/system/" + unit
        units[unit] = {**metadata(p, digest=True), "dropIns": child_count(p + ".d")}
    services = query(["/usr/bin/systemctl", "show", "apt-daily.service", "apt-daily-upgrade.service",
                      "nexowatt-eos-os-updates.service", "nexowatt-eos-r8-managed-update.service",
                      "--property=Id,ActiveState", "--no-pager"])
    states = []
    if services and services[0] == 0:
        for section in services[1].strip().split("\n\n"):
            fields = dict(line.split("=", 1) for line in section.splitlines() if "=" in line)
            if fields.get("Id") in ("apt-daily.service", "apt-daily-upgrade.service", "nexowatt-eos-os-updates.service", "nexowatt-eos-r8-managed-update.service"):
                state = fields.get("ActiveState")
                states.append({"unit": fields["Id"], "state": state if state in ("active", "inactive", "failed", "activating", "deactivating") else "other"})
    audit = query(["/usr/bin/dpkg", "--audit"])
    return {
        "schemaVersion": 1, "kind": "eos-r8-removal-readonly-inventory", "hostChanged": False, "removalApproved": False,
        "release": identity("/etc/nexowatt-eos/release-state.json"),
        "completion": identity("/etc/nexowatt-eos/first-start-complete.json", True),
        "currentPointsToR8": link_matches("/opt/nexowatt/eos/current", "/opt/nexowatt/eos/releases/" + R8),
        "node": {**metadata("/usr/bin/node"), "exactEos24210Link": link_matches("/usr/bin/node", NODE),
                 "usrBinPackageOwner": package_owner("/usr/bin/node"), "targetPackageOwner": package_owner(NODE), "target": metadata(NODE)},
        "roots": {p: metadata(p) for p in ROOTS}, "additionalPaths": {p: metadata(p) for p in EXTRA},
        "postgresqlOtherData": {p: child_count(p) for p in ("/etc/postgresql", "/var/lib/postgresql")},
        "hostPolicy": {p: metadata(p, digest=True) for p in ("/usr/sbin/policy-rc.d", "/etc/apt/apt.conf.d/90nexowatt-eos-managed", "/etc/postgresql-common/createcluster.conf")},
        "clusterIncludeEntries": child_count("/etc/postgresql-common/createcluster.d"),
        "guards": {p: metadata("/etc/nexowatt-eos/" + p) for p in GUARDS}, "accounts": accounts(), "unitFiles": units,
        "maintenanceServices": states or "query-unavailable",
        "dpkgAudit": "clean" if audit and audit[0] == 0 and not audit[1].strip() else "attention-or-unavailable",
        "limits": "Planning only: no signature attestation, mount/process/lock safety or permission to remove; recheck before mutation. No config values, usernames outside fixed EOS accounts, logs or credentials emitted."
    }


def main():
    if len(sys.argv) != 1 or sys.platform != "linux" or os.geteuid() != 0:
        print("R8_INSPECT_LINUX_ROOT_NO_ARGUMENTS_REQUIRED")
        return 1
    try:
        result = inspect()
        for key, value in result.items():
            print(json.dumps({key: value}, ensure_ascii=True, separators=(",", ":")))
        return 0
    except Exception:
        print("R8_INSPECT_FAILED")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
