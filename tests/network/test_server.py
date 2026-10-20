"""Real socketpair tests for bounded local IPC; no TCP or host service needed."""
import importlib.util
import json
import os
from pathlib import Path
import socket
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("network_server", ROOT / "runtime/network/server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class Manager:
    def __init__(self):
        self.calls = []

    def dispatch(self, request):
        self.calls.append(request)
        return {"configured": False}


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.client, self.connection = socket.socketpair()
        self.addCleanup(self.client.close)
        self.addCleanup(self.connection.close)
        self.manager = Manager()

    def exchange(self, data, allowed=None):
        self.client.sendall(data)
        self.client.shutdown(socket.SHUT_WR)
        server.handle_connection(self.connection, self.manager,
                                 allowed_uids={os.getuid()} if allowed is None else allowed)
        self.client.settimeout(1)
        return json.loads(self.client.recv(65537))

    def test_actual_peer_credentials_allow_known_uid(self):
        response = self.exchange(b'{"operation":"status"}\n')
        self.assertEqual(response, {"ok": True, "configured": False})
        self.assertEqual(self.manager.calls, [{"operation": "status"}])

    def test_actual_peer_credentials_reject_other_uid_before_dispatch(self):
        response = self.exchange(b'{"operation":"status"}\n', allowed={os.getuid() + 1})
        self.assertEqual(response["error"], "NETWORK_PEER_FORBIDDEN")
        self.assertEqual(self.manager.calls, [])

    def test_duplicate_json_keys_are_rejected(self):
        response = self.exchange(b'{"operation":"status","operation":"apply"}\n')
        self.assertEqual(response["error"], "NETWORK_REQUEST_INVALID")
        self.assertEqual(self.manager.calls, [])

    def test_unbounded_request_is_rejected_before_json(self):
        response = self.exchange(b" " * 65537 + b"\n")
        self.assertEqual(response["error"], "NETWORK_REQUEST_TOO_LARGE")
        self.assertEqual(self.manager.calls, [])

    def test_trailing_second_request_is_rejected(self):
        response = self.exchange(b'{"operation":"status"}\n{"operation":"apply"}\n')
        self.assertEqual(response["error"], "NETWORK_REQUEST_INVALID")
        self.assertEqual(self.manager.calls, [])

    def test_missing_newline_is_rejected(self):
        response = self.exchange(b'{"operation":"status"}')
        self.assertEqual(response["error"], "NETWORK_REQUEST_INCOMPLETE")

    def test_non_object_is_rejected(self):
        response = self.exchange(b'[]\n')
        self.assertEqual(response["error"], "NETWORK_REQUEST_INVALID")

    def test_nan_is_rejected(self):
        response = self.exchange(b'{"operation":"grant","durationSeconds":NaN}\n')
        self.assertEqual(response["error"], "NETWORK_REQUEST_INVALID")

    def test_invalid_utf8_is_rejected(self):
        response = self.exchange(b'{"operation":"\xff"}\n')
        self.assertEqual(response["error"], "NETWORK_REQUEST_INVALID")

    def test_private_exception_text_is_not_disclosed(self):
        def fail(_request):
            raise RuntimeError("private path and secret must not be serialized")
        self.manager.dispatch = fail
        response = self.exchange(b'{"operation":"status"}\n')
        self.assertEqual(response, {"ok": False, "error": "NETWORK_HOST_OPERATION_FAILED"})

    def test_response_size_is_bounded(self):
        self.manager.dispatch = lambda _: {"large": "x" * 65536}
        response = self.exchange(b'{"operation":"status"}\n')
        self.assertEqual(response, {"ok": False, "error": "NETWORK_RESPONSE_TOO_LARGE"})

    def test_request_has_fixed_total_deadline(self):
        class SlowConnection:
            def getsockopt(self, *_):
                return server.struct.pack("3i", 1, os.getuid(), 1)
            def settimeout(self, value):
                self.timeout = value
            def recv(self, _):
                return b" "
        times = iter([10, 10.5, 11.5, 12.1])
        with self.assertRaises(server.host.NetworkError) as raised:
            server.read_request(SlowConnection(), allowed_uids={os.getuid()}, now=lambda: next(times))
        self.assertEqual(raised.exception.code, "NETWORK_REQUEST_TIMEOUT")


if __name__ == "__main__":
    unittest.main()
