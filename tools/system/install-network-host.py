"""R11 host-addon installer; invoked only by the authenticated release transaction.

No package download, network configuration, arbitrary root/path, or shell mode.
The service is installed UNCONFIGURED. Technical networking requires a later
authenticated Admin operation. A partial install has an on-disk rollback journal.
"""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
import sys
import tempfile

UNITS = ("nexowatt-eos-network.service", "nexowatt-eos-network-guard.service",
         "nexowatt-eos-network-guard.timer", "nexowatt-eos-network-dhcp.service")
ENABLED = (UNITS[0], UNITS[2])
CODE = ("policy.py", "host.py", "server.py")
DROPIN_SOURCE = "system/network/nexowatt-eos-controller-network.conf"
DROPIN_DIRECTORY = "/etc/systemd/system/nexowatt-eos-controller.service.d"
DROPIN = DROPIN_DIRECTORY + "/50-eos-network.conf"
JOURNAL_DIR = "/var/lib/nexowatt-eos-network-install"
JOURNAL = JOURNAL_DIR + "/install.json"
TOOLS = ("/usr/bin/python3", "/usr/sbin/ip", "/usr/bin/systemctl", "/usr/sbin/nft",
         "/usr/sbin/dnsmasq", "/usr/bin/getent", "/usr/sbin/groupadd", "/usr/sbin/useradd")


class InstallError(Exception):
    pass


def fail(code):
    raise InstallError(code)


def command(argv):
    try:
        result = subprocess.run(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, timeout=15, check=False,
                                env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LC_ALL": "C"})
    except (OSError, subprocess.TimeoutExpired):
        fail("NETWORK_INSTALL_COMMAND")
    if len(result.stdout) > 65536 or len(result.stderr) > 65536:
        fail("NETWORK_INSTALL_COMMAND_SIZE")
    return result.returncode, result.stdout.decode("utf8", "strict")


class Installer:
    def __init__(self, release_id, root=Path("/"), run=command, probe=None):
        if not isinstance(release_id, str) or not re.fullmatch(r"[0-9a-f]{64}", release_id):
            fail("NETWORK_INSTALL_RELEASE")
        self.release_id, self.root, self.run = release_id, Path(root), run
        self.source = f"/opt/nexowatt/eos/releases/{release_id}"
        self.probe = probe or self._probe

    def path(self, value):
        return self.root / value.lstrip("/")

    def trusted(self, value, required=True, directory=False):
        path = self.path(value)
        relative = path.relative_to(self.root)
        current = self.root
        for part in relative.parts:
            current /= part
            try:
                info = current.lstat()
            except FileNotFoundError:
                if required:
                    fail("NETWORK_INSTALL_PATH_MISSING")
                return path
            if stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
                fail("NETWORK_INSTALL_UNTRUSTED_PATH")
            if current != path and not stat.S_ISDIR(info.st_mode):
                fail("NETWORK_INSTALL_UNTRUSTED_PATH")
        if directory and not path.is_dir():
            fail("NETWORK_INSTALL_PATH_TYPE")
        return path

    def read(self, value, limit=1048576):
        path = self.trusted(value)
        with path.open("rb") as stream:
            data = stream.read(limit + 1)
        if len(data) > limit or not path.is_file():
            fail("NETWORK_INSTALL_FILE_SIZE")
        return data

    def call(self, *argv, allow=(0,)):
        code, stdout = self.run(list(argv))
        if code not in allow:
            fail("NETWORK_INSTALL_COMMAND")
        return code, stdout

    def mkdir(self, value, mode=0o755):
        path = self.trusted(value, required=False)
        path.mkdir(mode=mode, parents=True, exist_ok=True)
        self.trusted(value, directory=True)
        os.chmod(path, mode)

    def atomic(self, value, data, mode=0o600):
        path = self.trusted(value, required=False)
        self.trusted(str(Path(value).parent), directory=True)
        descriptor, temporary = tempfile.mkstemp(prefix=".eos-network-", dir=path.parent)
        try:
            with os.fdopen(descriptor, "wb") as stream:
                os.fchmod(stream.fileno(), mode)
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
            descriptor = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)

    def files(self):
        pairs = [(f"runtime/network/{name}", f"/usr/lib/nexowatt-eos-network/{name}") for name in CODE]
        pairs += [(f"system/network/{name}", f"/etc/systemd/system/{name}") for name in UNITS]
        pairs.append((DROPIN_SOURCE, DROPIN))
        return [(source, destination, self.read(f"{self.source}/{source}")) for source, destination in pairs]

    def journal(self, record):
        self.atomic(JOURNAL, (json.dumps(record, sort_keys=True) + "\n").encode())

    def load_journal(self):
        try:
            record = json.loads(self.read(JOURNAL, 16384))
        except (ValueError, OSError):
            fail("NETWORK_INSTALL_JOURNAL")
        expected = {destination: hashlib.sha256(data).hexdigest() for _, destination, data in self.files()}
        if not isinstance(record, dict) or set(record) != {"schemaVersion", "releaseId", "phase", "files"} or \
                record["schemaVersion"] != 1 or record["releaseId"] != self.release_id or \
                record["phase"] not in ("prepared", "files", "active", "rolling-back", "rolled-back") or record["files"] != expected:
            fail("NETWORK_INSTALL_JOURNAL")
        return record

    def check(self):
        self.trusted(self.source, directory=True)
        self.files()
        for name in TOOLS:
            # Debian /usr/bin/python3 is a distribution-owned interpreter link.
            # Resolve tool links but verify the final path and every ancestor.
            tool = self.path(name)
            self.trusted(str(Path(name).parent), directory=True)
            if not tool.exists():
                fail("NETWORK_INSTALL_TOOL_MISSING")
            if tool.lstat().st_uid != 0:
                fail("NETWORK_INSTALL_UNTRUSTED_TOOL")
            resolved = tool.resolve()
            try:
                relative = "/" + str(resolved.relative_to(self.root))
            except ValueError:
                fail("NETWORK_INSTALL_UNTRUSTED_TOOL")
            self.trusted(relative)
            if not resolved.is_file() or not os.access(resolved, os.X_OK):
                fail("NETWORK_INSTALL_UNTRUSTED_TOOL")
        if self.run(["/usr/bin/getent", "group", "eos-runtime"])[0] != 0:
            fail("NETWORK_INSTALL_RUNTIME_GROUP")
        for name in ("/usr/lib/nexowatt-eos-network", "/etc/nexowatt-eos-network",
                     "/var/lib/nexowatt-eos-network", JOURNAL_DIR, "/var/lib/nexowatt-eos-dhcp"):
            self.trusted(name, required=False)
            if self.path(name).exists():
                fail("NETWORK_INSTALL_ALREADY_PRESENT")
        for unit in UNITS:
            if self.path(f"/etc/systemd/system/{unit}").exists() or self.path(f"/etc/systemd/system/{unit}").is_symlink():
                fail("NETWORK_INSTALL_UNIT_EXISTS")
        self.trusted(DROPIN_DIRECTORY, required=False)
        if self.path(DROPIN).exists() or self.path(DROPIN).is_symlink():
            fail("NETWORK_INSTALL_UNIT_EXISTS")
        # Existing dedicated identities may indicate an unmanaged prior install.
        if self.run(["/usr/bin/getent", "passwd", "eos-network-dhcp"])[0] == 0 or \
                self.run(["/usr/bin/getent", "group", "eos-network-dhcp"])[0] == 0:
            fail("NETWORK_INSTALL_ACCOUNT_EXISTS")
        return {"ok": True, "operation": "check", "releaseId": self.release_id, "configured": False}

    def _probe(self):
        client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        client.settimeout(5)
        try:
            client.connect(str(self.path("/run/nexowatt-eos-network/control.sock")))
            client.sendall(b'{"operation":"status"}\n')
            data = b""
            while b"\n" not in data and len(data) <= 65536:
                block = client.recv(4096)
                if not block:
                    break
                data += block
            result = json.loads(data)
            if result.get("ok") is not True or result.get("configured") is not False or result.get("pending"):
                fail("NETWORK_INSTALL_SERVICE_STATE")
        except (OSError, ValueError):
            fail("NETWORK_INSTALL_SERVICE_STATE")
        finally:
            client.close()

    def install(self):
        self.check()
        self.mkdir(JOURNAL_DIR, 0o700)
        record = {"schemaVersion": 1, "releaseId": self.release_id, "phase": "prepared",
                  "files": {destination: hashlib.sha256(data).hexdigest() for _, destination, data in self.files()}}
        self.journal(record)
        self.call("/usr/sbin/groupadd", "--system", "eos-network-dhcp")
        self.call("/usr/sbin/useradd", "--system", "--gid", "eos-network-dhcp", "--home-dir", "/nonexistent",
                  "--no-create-home", "--shell", "/usr/sbin/nologin", "eos-network-dhcp")
        self.mkdir("/usr/lib/nexowatt-eos-network")
        self.mkdir(DROPIN_DIRECTORY)
        for name in ("/etc/nexowatt-eos-network", "/var/lib/nexowatt-eos-network"):
            self.mkdir(name, 0o700)
        for _, destination, data in self.files():
            self.atomic(destination, data, 0o644)
        record["phase"] = "files"
        self.journal(record)
        self.call("/usr/bin/systemctl", "daemon-reload")
        self.call("/usr/bin/systemctl", "enable", "--now", *ENABLED)
        self.probe()
        record["phase"] = "active"
        self.journal(record)
        return {"ok": True, "operation": "install", "releaseId": self.release_id, "configured": False}

    def rollback(self):
        if not self.path(JOURNAL).exists():
            # Failure before a prepared journal made no addon change.
            return {"ok": True, "operation": "rollback", "releaseId": self.release_id, "configured": False}
        record = self.load_journal()
        if record["phase"] == "rolled-back":
            return {"ok": True, "operation": "rollback", "releaseId": self.release_id, "configured": False}
        # An operator-configured network is outside the unconfigured release trial.
        for directory in ("/etc/nexowatt-eos-network", "/var/lib/nexowatt-eos-network"):
            if self.path(directory).exists():
                self.trusted(directory, directory=True)
                if any(p.name != "control.lock" for p in self.path(directory).iterdir()):
                    fail("NETWORK_INSTALL_ROLLBACK_CONFIGURED")
        for destination, digest in record["files"].items():
            if self.path(destination).exists() and hashlib.sha256(self.read(destination)).hexdigest() != digest:
                fail("NETWORK_INSTALL_ROLLBACK_CHANGED")
        record["phase"] = "rolling-back"
        self.journal(record)
        for unit in UNITS:
            # Missing/not-loaded unit is harmless during partial installation.
            if self.path(f"/etc/systemd/system/{unit}").exists():
                self.call("/usr/bin/systemctl", "disable", "--now", unit)
        for destination in record["files"]:
            path = self.trusted(destination, required=False)
            if path.exists():
                path.unlink()
        self.call("/usr/bin/systemctl", "daemon-reload")
        record["phase"] = "rolled-back"
        self.journal(record)
        # Preserve no-login account and transaction evidence; no userdel/rm -rf.
        return {"ok": True, "operation": "rollback", "releaseId": self.release_id, "configured": False}


def main(argv):
    if len(argv) != 2 or argv[0] not in ("--check", "--install", "--rollback") or os.geteuid() != 0 or sys.platform != "linux":
        fail("NETWORK_INSTALL_USAGE")
    installer = Installer(argv[1])
    # Parent R11 coordinator serializes release transitions. A separate lock
    # prevents repeated manufacturer invocations from racing its file journal.
    lock_path = installer.trusted("/run/nexowatt-eos-network-install.lock", required=False)
    descriptor = os.open(lock_path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o077:
            fail("NETWORK_INSTALL_LOCK")
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            fail("NETWORK_INSTALL_BUSY")
        return getattr(installer, argv[0][2:])()
    finally:
        os.close(descriptor)


if __name__ == "__main__":
    try:
        print(json.dumps(main(sys.argv[1:])))
    except Exception as error:
        code = str(error) if isinstance(error, InstallError) and re.fullmatch(r"NETWORK_INSTALL_[A-Z_]+", str(error)) else "NETWORK_INSTALL_FAILED"
        print(json.dumps({"ok": False, "error": code}))
        sys.exit(1)
