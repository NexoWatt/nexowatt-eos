#!/usr/bin/python3
"""One bounded JSON request per authenticated local connection; no TCP listener."""
from __future__ import annotations

import contextlib
import grp
import importlib.util
import json
import os
from pathlib import Path
import pwd
import re
import selectors
import signal
import socket
import stat
import struct
import sys
import time

_spec = importlib.util.spec_from_file_location("eos_network_host", Path(__file__).with_name("host.py"))
host = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(host)
MAX_REQUEST = 65536


def error_code(exc):
    value = getattr(exc, "code", "NETWORK_HOST_OPERATION_FAILED")
    return value if isinstance(value, str) and re.fullmatch(r"[A-Z][A-Z0-9_]{2,80}", value) else "NETWORK_HOST_OPERATION_FAILED"


def reject_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise host.NetworkError("NETWORK_REQUEST_INVALID")
        result[key] = value
    return result


def read_request(connection, *, allowed_uids, now=time.monotonic):
    credentials = connection.getsockopt(socket.SOL_SOCKET, socket.SO_PEERCRED, struct.calcsize("3i"))
    _, uid, _ = struct.unpack("3i", credentials)
    if uid not in allowed_uids:
        raise host.NetworkError("NETWORK_PEER_FORBIDDEN")
    deadline = now() + 2
    data = bytearray()
    while b"\n" not in data:
        remaining = deadline - now()
        if remaining <= 0:
            raise host.NetworkError("NETWORK_REQUEST_TIMEOUT")
        connection.settimeout(remaining)
        chunk = connection.recv(min(4096, MAX_REQUEST + 1 - len(data)))
        if not chunk:
            raise host.NetworkError("NETWORK_REQUEST_INCOMPLETE")
        data.extend(chunk)
        if len(data) > MAX_REQUEST:
            raise host.NetworkError("NETWORK_REQUEST_TOO_LARGE")
    raw, rest = bytes(data).split(b"\n", 1)
    if rest:
        raise host.NetworkError("NETWORK_REQUEST_INVALID")
    try:
        value = json.loads(raw, object_pairs_hook=reject_duplicates,
                           parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
    except (ValueError, UnicodeDecodeError, RecursionError):
        raise host.NetworkError("NETWORK_REQUEST_INVALID") from None
    if not isinstance(value, dict):
        raise host.NetworkError("NETWORK_REQUEST_INVALID")
    return value


def handle_connection(connection, manager, *, allowed_uids):
    try:
        request = read_request(connection, allowed_uids=allowed_uids)
        response = {"ok": True, **manager.dispatch(request)}
    except (socket.timeout, TimeoutError):
        response = {"ok": False, "error": "NETWORK_REQUEST_TIMEOUT"}
    except Exception as exc:
        response = {"ok": False, "error": error_code(exc)}
    encoded = (json.dumps(response, separators=(",", ":"), allow_nan=False) + "\n").encode()
    if len(encoded) > MAX_REQUEST:
        encoded = b'{"ok":false,"error":"NETWORK_RESPONSE_TOO_LARGE"}\n'
    connection.settimeout(1)
    with contextlib.suppress(OSError):
        connection.sendall(encoded)


def systemd_ready():
    address = os.environ.get("NOTIFY_SOCKET")
    if not address or not address.startswith(("/", "@")):
        raise host.NetworkError("NETWORK_SYSTEMD_NOTIFY_REQUIRED")
    if address.startswith("@"):
        address = "\0" + address[1:]
    with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as notification:
        notification.settimeout(1)
        notification.connect(address)
        notification.sendall(b"READY=1\nSTATUS=Technical network control ready")


def serve(manager, *, socket_path, runtime_uid, runtime_gid, should_stop=lambda: False, ready=lambda: None):
    path = Path(socket_path)
    host._check_path(path.parent, private=False)
    if path.exists() or path.is_symlink():
        current = path.lstat()
        if not stat.S_ISSOCK(current.st_mode) or current.st_uid != 0:
            raise host.NetworkError("NETWORK_UNSAFE_SOCKET")
        path.unlink()
    listener = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        listener.bind(str(path))
        os.chown(path, 0, runtime_gid)
        os.chmod(path, 0o660)
        listener.listen(8)
        listener.settimeout(1)
        ready()
        last_guard = time.monotonic()
        while not should_stop():
            try:
                connection, _ = listener.accept()
            except socket.timeout:
                connection = None
            if connection is not None:
                with connection:
                    handle_connection(connection, manager, allowed_uids={0, runtime_uid})
            if time.monotonic() - last_guard >= 5:
                try:
                    manager.guard()
                except host.NetworkError as exc:
                    manager.last_fault = error_code(exc)
                last_guard = time.monotonic()
    finally:
        listener.close()
        with contextlib.suppress(FileNotFoundError):
            path.unlink()


def main():
    if os.geteuid() != 0 or len(sys.argv) != 1:
        raise SystemExit("NETWORK_ROOT_SERVICE_ONLY")
    runtime = pwd.getpwnam("eos-runtime")
    runtime_gid = grp.getgrnam("eos-runtime").gr_gid
    manager = host.HostManager()
    try:
        manager.bootstrap()
    except Exception as exc:
        # The dependent controller must not start on an unprotected technical
        # port. Expose recovery status ONLY after a real drop-only transaction.
        manager.last_fault = error_code(exc)
        print(manager.last_fault, file=sys.stderr)
        try:
            with manager.lock():
                manager.emergency_close(manager.read_state(), manager.last_fault)
        except Exception:
            raise SystemExit("NETWORK_BOOT_FIREWALL_NOT_READY") from None
    stopped = False
    def stop(_signum, _frame):
        nonlocal stopped
        stopped = True
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    serve(manager, socket_path="/run/nexowatt-eos-network/control.sock", runtime_uid=runtime.pw_uid,
          runtime_gid=runtime_gid, should_stop=lambda: stopped, ready=systemd_ready)


if __name__ == "__main__":
    main()
