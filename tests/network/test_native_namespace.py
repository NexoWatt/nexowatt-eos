"""Harness control tests only; no namespace, network or host mutation."""
import errno
import importlib.util
import os
from pathlib import Path
import struct
import subprocess
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, Mock, patch

spec = importlib.util.spec_from_file_location("native_namespace", Path(__file__).with_name("native_namespace.py"))
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


class Clock:
    def __init__(self):
        self.value = 0.0

    def now(self):
        return self.value

    def sleep(self, seconds):
        self.value += seconds


class NativeHarnessTests(unittest.TestCase):
    @staticmethod
    def dhcp_reply(request, kind):
        bootp = bytearray(request[42:282])
        bootp[0] = 2
        bootp[16:20] = bytes([192, 168, 77, 20])
        gateway = bytes([192, 168, 77, 1])
        options = bytes([53, 1, kind, 54, 4]) + gateway + bytes([3, 4]) + gateway
        payload = bootp + options + bytes([6, 4, 1, 1, 1, 1, 255])
        udp = struct.pack("!HHHH", 67, 68, len(payload) + 8, 0) + payload
        ip = bytearray(request[14:34])
        ip[2:4] = struct.pack("!H", len(udp) + 20)
        return request[:14] + ip + udp

    def test_dhcp_waits_for_normal_conflict_probe_and_sends_valid_packets(self):
        clock, sock = Clock(), MagicMock()
        sock.__enter__.return_value = sock

        def receive(_size):
            request = sock.send.call_args.args[0]
            clock.sleep(3.1 if sock.send.call_count == 1 else 0.1)
            return self.dhcp_reply(request, 2 if sock.send.call_count == 1 else 5)

        sock.recv.side_effect = receive
        with patch.object(native, "isolation_guard"), patch.object(native.socket, "socket", return_value=sock), \
                patch.object(native.time, "monotonic", side_effect=clock.now):
            result = native.dhcp_exchange("dev0", native.TECH_MAC, True, "initial")
        self.assertTrue(result["offer"])
        self.assertEqual(result["offerElapsedSeconds"], 3.1)
        self.assertEqual(result["ip"], "192.168.77.20")
        self.assertTrue(all(call.args[0] >= 5 for call in sock.settimeout.call_args_list))
        for call, kind in zip(sock.send.call_args_list, (1, 3)):
            frame = call.args[0]
            self.assertEqual(frame[:6], b"\xff" * 6)
            self.assertEqual(frame[26:34], b"\0" * 4 + b"\xff" * 4)
            self.assertEqual(struct.unpack("!H", frame[16:18])[0], len(frame) - 14)
            self.assertEqual(struct.unpack("!HHHH", frame[34:42]), (68, 67, len(frame) - 34, 0))
            checksum = sum(struct.unpack("!10H", frame[14:34]))
            while checksum >> 16:
                checksum = (checksum & 65535) + (checksum >> 16)
            self.assertEqual(checksum, 65535)
            self.assertEqual(frame[52:54], b"\x80\0")
            self.assertEqual(native.packet_options(frame[42:])[53], bytes([kind]))

    def test_delayed_management_offer_is_a_failure(self):
        clock, sock = Clock(), MagicMock()
        sock.__enter__.return_value = sock

        def receive(_size):
            clock.sleep(3.1)
            return self.dhcp_reply(sock.send.call_args.args[0], 2)

        sock.recv.side_effect = receive
        with patch.object(native, "isolation_guard"), patch.object(native.socket, "socket", return_value=sock), \
                patch.object(native.time, "monotonic", side_effect=clock.now):
            with self.assertRaisesRegex(RuntimeError, "UNEXPECTED_MANAGEMENT_DHCP_OFFER"):
                native.dhcp_exchange("up0", native.TECH_MAC, False, "management")
        self.assertGreaterEqual(sock.settimeout.call_args.args[0], 5)

    def test_management_absence_requires_full_observation_window(self):
        clock, sock = Clock(), MagicMock()
        sock.__enter__.return_value = sock

        def receive(_size):
            clock.sleep(sock.settimeout.call_args.args[0])
            raise TimeoutError()

        sock.recv.side_effect = receive
        with patch.object(native, "isolation_guard"), patch.object(native.socket, "socket", return_value=sock), \
                patch.object(native.time, "monotonic", side_effect=clock.now):
            result = native.dhcp_exchange("up0", native.TECH_MAC, False, "management")
        self.assertFalse(result["offer"])
        self.assertEqual(result["offerElapsedSeconds"], 6.0)

    def test_process_diagnostics_are_bounded_and_never_wait_for_pipe_eof(self):
        reader, writer = os.pipe()
        self.addCleanup(os.close, writer)
        stderr = os.fdopen(reader, "rb", buffering=0)
        self.addCleanup(stderr.close)
        os.write(writer, b"x" * 4096)
        child = SimpleNamespace(args=["dnsmasq"], stderr=stderr, poll=lambda: None)
        with patch.object(native, "isolation_guard"):
            result = native.process_diagnostics([child])
            empty = native.process_diagnostics([child])
        self.assertEqual(len(result[0]["stderr"]), 4096)
        self.assertTrue(result[0]["stderrLimited"])
        self.assertEqual(empty[0]["stderr"], "")

    def test_readiness_requires_actual_positive_reply_after_transient_failure(self):
        clock, budgets = Clock(), []

        def probe(remaining):
            budgets.append(remaining)
            clock.sleep(0.2)
            return {"connected": len(budgets) == 3, "phase": "connect"}

        result = native.wait_for_fixture(probe, "connected", "fixture", clock=clock.now, sleep=clock.sleep)
        self.assertEqual(result["attempts"], 3)
        self.assertTrue(result["lastProbe"]["connected"])
        self.assertGreater(budgets[0], budgets[-1])
        self.assertLessEqual(clock.now(), native.FIXTURE_READY_SECONDS)

    def test_missing_route_exhausts_shared_deadline_and_retains_last_errno(self):
        clock = Clock()

        def probe(remaining):
            clock.sleep(min(0.7, remaining))
            return {"connected": False, "errno": errno.ENETUNREACH, "errorCode": "ENETUNREACH"}

        with self.assertRaises(native.FixtureReadinessError) as raised:
            native.wait_for_fixture(probe, "connected", "fixture_ipv6_route_positive",
                                    clock=clock.now, sleep=clock.sleep)
        self.assertEqual(str(raised.exception), "fixture_ipv6_route_positive_FAILED")
        self.assertEqual(raised.exception.details["lastProbe"]["errorCode"], "ENETUNREACH")
        self.assertLessEqual(clock.now(), native.FIXTURE_READY_SECONDS)

    def test_timed_out_helper_does_not_turn_into_success(self):
        clock = Clock()

        def probe(remaining):
            clock.sleep(remaining)
            raise subprocess.TimeoutExpired(["fixture-probe"], remaining)

        with self.assertRaises(native.FixtureReadinessError) as raised:
            native.wait_for_fixture(probe, "answered", "fixture_dns_route_positive",
                                    clock=clock.now, sleep=clock.sleep)
        self.assertEqual(raised.exception.details["attempts"], 1)
        self.assertEqual(raised.exception.details["lastProbe"]["errorCode"], "PROBE_PROCESS_TIMEOUT")

    def test_late_reply_cannot_pass_deadline(self):
        clock = Clock()

        def probe(remaining):
            clock.sleep(remaining + 0.01)
            return {"connected": True}

        with self.assertRaises(native.FixtureReadinessError):
            native.wait_for_fixture(probe, "connected", "fixture", clock=clock.now, sleep=clock.sleep)

    def test_probe_records_failure_phase_errno_and_selected_source(self):
        sock = Mock()
        sock.connect.side_effect = OSError(errno.ENETUNREACH, "Network is unreachable")
        sock.getsockname.return_value = ("fd77::20", 32450, 0, 0)
        with patch.object(native.socket, "socket", return_value=sock):
            result = native.connection_probe(native.PUBLIC6, 18080)
        self.assertFalse(result["connected"])
        self.assertEqual(result["phase"], "connect")
        self.assertEqual(result["errorCode"], "ENETUNREACH")
        self.assertEqual(result["source"][0], "fd77::20")
        sock.settimeout.assert_called_once_with(0.7)
        sock.close.assert_called_once()

    def test_wrong_echo_cannot_be_counted_as_a_blocked_connection(self):
        sock = Mock()
        sock.recv.return_value = b"wrong response"
        sock.getsockname.return_value = ("fd77::20", 32450, 0, 0)
        with patch.object(native.socket, "socket", return_value=sock):
            with self.assertRaisesRegex(RuntimeError, "ECHO_MISMATCH"):
                native.connection_probe(native.PUBLIC6, 18080)
        sock.close.assert_called_once()

    def test_failure_diagnostics_guard_every_read_and_bound_output(self):
        output = subprocess.CompletedProcess([], 0, stdout="x" * 10000, stderr="e" * 10000)
        with patch.object(native, "isolation_guard") as guard, \
                patch.object(native, "execute", return_value=output) as execute:
            result = native.failure_diagnostics({"router": 100, "technical": 101, "uplink": 102})
        guard.assert_called_once()
        self.assertEqual(execute.call_count, 12)
        for call in execute.call_args_list:
            self.assertEqual(call.args[0][0], "nsenter")
            self.assertIn(call.args[0][1], {"--net=/proc/100/ns/net", "--net=/proc/101/ns/net", "--net=/proc/102/ns/net"})
            self.assertLessEqual(call.kwargs["timeout"], 0.75)
        for fields in result.values():
            for field in fields.values():
                self.assertLessEqual(len(field["stdout"]), 3000)
                self.assertLessEqual(len(field["stderr"]), 500)

    def test_failure_diagnostics_reject_original_namespace_before_commands(self):
        with patch.object(native, "isolation_guard", side_effect=RuntimeError("CALLER_NETWORK_NAMESPACE_REFUSED")), \
                patch.object(native, "execute") as execute:
            with self.assertRaisesRegex(RuntimeError, "CALLER_NETWORK_NAMESPACE_REFUSED"):
                native.failure_diagnostics({"router": 100})
        execute.assert_not_called()


if __name__ == "__main__":
    unittest.main()
