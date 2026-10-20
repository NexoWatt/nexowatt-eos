"""Harness control tests only; no namespace, network or host mutation."""
import errno
import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import Mock, patch

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
