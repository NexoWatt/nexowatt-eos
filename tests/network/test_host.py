"""Host regression tests: synthetic filesystem/netlink/commands; no host changes."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("network_host", ROOT / "runtime/network/host.py")
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)

CONFIG = {"interface": "enx001122334455", "mac": "02:11:22:33:44:55",
          "address": "192.168.250.1", "prefixLength": 24,
          "dhcpStart": "192.168.250.100", "dhcpEnd": "192.168.250.199",
          "dnsServers": ["9.9.9.9"], "reservations": [], "listeners": []}
CLIENT = {"mac": "02:aa:bb:cc:dd:ee", "ip": "192.168.250.100"}


class Fixture:
    def __init__(self, directory):
        self.paths = host.Paths(directory)
        for path in [self.paths.state, self.paths.config, self.paths.run, self.paths.leases.parent]:
            path.mkdir(parents=True, mode=0o700)
        self.time, self.wall = 10000.0, 1800000000.0
        self.table = False
        self.calls, self.firewalls = [], []
        self.fail_next = None
        self.addresses = [
            {"ifname": "eth0", "ifindex": 2, "address": "02:10:20:30:40:50", "link_type": "ether", "flags": ["UP"],
             "addr_info": [{"family": "inet", "local": "192.168.1.20", "prefixlen": 24}]},
            {"ifname": CONFIG["interface"], "ifindex": 3, "address": CONFIG["mac"], "link_type": "ether", "flags": [], "addr_info": []}]
        self.routes = [{"dst": "default", "dev": "eth0", "gateway": "192.168.1.1"},
                       {"dst": "192.168.1.0/24", "dev": "eth0"}]
        for name in ["eth0", CONFIG["interface"]]:
            self.paths.at(f"/sys/class/net/{name}/device").mkdir(parents=True)
            for family, key in [("ipv4", "forwarding"), ("ipv6", "disable_ipv6"),
                                ("ipv4", "accept_redirects"), ("ipv4", "send_redirects"), ("ipv4", "accept_source_route")]:
                file = self.paths.at(f"/proc/sys/net/{family}/conf/{name}/{key}")
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text("0\n")
        boot = self.paths.at("/proc/sys/kernel/random/boot_id")
        boot.parent.mkdir(parents=True)
        boot.write_text("11111111-2222-3333-4444-555555555555\n")
        self.manager = host.HostManager(paths=self.paths, executor=self.execute,
                                        clock=lambda: self.time, wall=lambda: self.wall)

    def execute(self, argv, **kwargs):
        self.calls.append((list(argv), kwargs))
        if self.fail_next and self.fail_next in argv:
            self.fail_next = None
            return SimpleNamespace(returncode=1, stdout="", stderr="fixture failure")
        result = SimpleNamespace(returncode=0, stdout="", stderr="")
        if argv == ["/usr/sbin/ip", "-j", "address", "show"]:
            result.stdout = json.dumps(self.addresses)
        elif argv == ["/usr/sbin/ip", "-j", "-4", "route", "show", "table", "all"]:
            result.stdout = json.dumps(self.routes)
        elif "is-active" in argv:
            result.returncode = 3
        elif argv[:3] == ["/usr/sbin/ip", "address", "add"]:
            interface = next(i for i in self.addresses if i["ifname"] == argv[-1])
            address, prefix = argv[3].split("/")
            interface["addr_info"].append({"family": "inet", "local": address, "prefixlen": int(prefix)})
        elif argv[:3] == ["/usr/sbin/ip", "address", "del"]:
            interface = next(i for i in self.addresses if i["ifname"] == argv[-1])
            address = argv[3].split("/")[0]
            interface["addr_info"] = [a for a in interface["addr_info"] if a["local"] != address]
        elif argv[:4] == ["/usr/sbin/ip", "link", "set", "dev"]:
            interface = next(i for i in self.addresses if i["ifname"] == argv[4])
            interface["flags"] = ["UP"] if argv[5] == "up" else []
        elif argv[:3] == ["/usr/sbin/nft", "-j", "list"]:
            if self.table:
                result.stdout = json.dumps({"nftables": [{"table": {"name": "eos_technical", "comment": host.TABLE_COMMENT}}]})
            else:
                result.returncode, result.stderr = 1, "No such file or directory"
        elif argv == ["/usr/sbin/nft", "--file", "-"]:
            self.firewalls.append(kwargs["input"])
            self.table = True
        elif argv[:3] == ["/usr/sbin/nft", "delete", "table"]:
            self.table = False
        return result

    def apply(self):
        return self.manager.dispatch({"operation": "apply", "config": copy.deepcopy(CONFIG)})

    def confirm(self):
        result = self.apply()
        self.manager.dispatch({"operation": "confirm", "transactionId": result["pending"]["transactionId"]})

    def lease(self, expiry=None, mac=CLIENT["mac"], ip=CLIENT["ip"]):
        self.paths.leases.write_text(f"{int(expiry or self.wall + 3600)} {mac} {ip} storage *\n")


@unittest.skipUnless(os.geteuid() == 0, "Root-owned FILE fixture only; run this test with sudo. No host network is used.")
class HostTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.mkdtemp(prefix="eos-network-test-", dir="/root")
        self.fixture = Fixture(self.directory)
        self.manager = self.fixture.manager

    def tearDown(self):
        shutil.rmtree(self.directory)

    def assert_code(self, code, request):
        with self.assertRaises(host.NetworkError) as raised:
            self.manager.dispatch(request)
        self.assertEqual(raised.exception.code, code)

    def test_unconfigured_boot_is_noop(self):
        self.manager.bootstrap()
        self.assertEqual(self.fixture.calls, [])
        self.assertFalse((self.fixture.paths.state / "state.json").exists())

    def test_status_and_preview_never_mutate_network(self):
        self.assertFalse(self.manager.dispatch({"operation": "status"})["configured"])
        self.manager.dispatch({"operation": "preview", "config": CONFIG})
        self.assertTrue(all("-j" in args or "is-active" in args for args, _ in self.fixture.calls))
        self.assertFalse((self.fixture.paths.state / "state.json").exists())

    def test_apply_then_confirm_preserves_owned_interface(self):
        self.fixture.confirm()
        state = self.manager.read_state()
        self.assertEqual(state["confirmed"], CONFIG)
        self.assertIsNone(state["pending"])
        status = self.manager.dispatch({"operation": "status"})
        self.assertTrue(status["capabilities"]["canGrant"])

    def test_journal_precedes_first_mutation(self):
        original = self.fixture.execute
        observed = []
        def executor(argv, **kwargs):
            if argv == ["/usr/sbin/nft", "--file", "-"]:
                observed.append(self.manager.read_state()["pending"] is not None)
            return original(argv, **kwargs)
        self.manager.execute = executor
        self.fixture.apply()
        self.assertEqual(observed, [True])
        calls = [args for args, _ in self.fixture.calls]
        self.assertLess(calls.index(["/usr/sbin/nft", "--file", "-"]), calls.index(["/usr/bin/systemctl", "start", host.DHCP_SERVICE]))

    def test_apply_failure_restores_original_interface(self):
        self.fixture.fail_next = "start"
        with self.assertRaises(host.NetworkError):
            self.fixture.apply()
        self.assertFalse(self.fixture.table)
        self.assertEqual(self.fixture.addresses[1]["addr_info"], [])
        self.assertIsNone(self.manager.read_state()["pending"])

    def test_subnet_reconfigure_rolls_back_partial_address_change(self):
        self.fixture.confirm()
        changed = copy.deepcopy(CONFIG)
        for key in ("address", "dhcpStart", "dhcpEnd"):
            changed[key] = changed[key].replace("250", "251")
        result = self.manager.dispatch({"operation": "apply", "config": changed})
        self.fixture.time += 91
        self.manager.guard()
        self.assertEqual(self.manager.read_state()["confirmed"], CONFIG)
        self.assertEqual(self.fixture.addresses[1]["addr_info"][0]["local"], CONFIG["address"])

    def test_independent_guard_uses_monotonic_when_wall_clock_moves_back(self):
        self.fixture.apply()
        self.fixture.time += 91
        self.fixture.wall -= 86400
        other = host.HostManager(paths=self.fixture.paths, executor=self.fixture.execute,
                                 clock=lambda: self.fixture.time, wall=lambda: self.fixture.wall)
        self.assertTrue(other.guard()["rolledBack"])
        self.assertIsNone(other.read_state()["pending"])

    def test_guard_rolls_back_pending_from_different_boot(self):
        self.fixture.apply()
        self.fixture.paths.at("/proc/sys/kernel/random/boot_id").write_text("aaaaaaaa-2222-3333-4444-555555555555\n")
        self.assertTrue(self.manager.guard()["rolledBack"])

    def test_daemon_restart_rolls_back_unconfirmed_and_restarts_confirmed_closed(self):
        self.fixture.confirm()
        self.fixture.lease()
        self.manager.dispatch({"operation": "grant", **CLIENT, "durationSeconds": 300})
        fresh = host.HostManager(paths=self.fixture.paths, executor=self.fixture.execute,
                                 clock=lambda: self.fixture.time, wall=lambda: self.fixture.wall)
        fresh.bootstrap()
        self.assertEqual(fresh.grants, [])
        self.assertNotIn("timeout 297s", self.fixture.firewalls[-1])

    def test_mac_name_replacement_quarantines_and_never_mutates_replacement(self):
        self.fixture.confirm()
        self.fixture.addresses[1]["address"] = "02:99:88:77:66:55"
        self.fixture.addresses[1]["ifindex"] = 4
        self.fixture.calls = []
        result = self.manager.guard()
        self.assertTrue(result["quarantined"])
        self.assertFalse(any(args[0] == "/usr/sbin/ip" and "-j" not in args for args, _ in self.fixture.calls))
        self.assertIn("flush set inet eos_technical internet_clients", self.fixture.firewalls[-1])

    def test_route_change_clears_grants_and_requires_reapply(self):
        self.fixture.confirm()
        self.fixture.routes.append({"dst": "8.20.0.0/16", "dev": "eth0"})
        self.assertTrue(self.manager.guard()["quarantined"])
        self.assert_code("NETWORK_REAPPLY_REQUIRED", {"operation": "grant", **CLIENT, "durationSeconds": 60})

    def test_boot_failure_emergency_rule_blocks_technical_port_before_ready(self):
        self.fixture.confirm()
        self.fixture.addresses = [self.fixture.addresses[0]]
        with self.assertRaises(host.NetworkError):
            self.manager.bootstrap()
        state = self.manager.read_state()
        self.manager.emergency_close(state, "NETWORK_INTERFACE_MISSING")
        script = self.fixture.firewalls[-1]
        self.assertIn(f'iifname "{CONFIG["interface"]}" drop', script)
        self.assertIn(f'oifname "{CONFIG["interface"]}" drop', script)
        self.assertNotIn('iifname "eth0"', script)
        self.assertEqual(self.manager.read_state()["fault"], "NETWORK_INTERFACE_MISSING")

    def test_dhcp_config_stays_readable_under_service_umask(self):
        old_mask = os.umask(0o077)
        try:
            self.fixture.confirm()
        finally:
            os.umask(old_mask)
        self.assertEqual((self.fixture.paths.run / "dhcp.conf").stat().st_mode & 0o777, 0o644)

    def test_emergency_rule_refuses_now_management_or_replaced_interface(self):
        self.fixture.confirm()
        state = self.manager.read_state()
        self.fixture.routes[0]["dev"] = CONFIG["interface"]
        before = len(self.fixture.firewalls)
        with self.assertRaises(host.NetworkError) as raised:
            self.manager.emergency_close(state, "NETWORK_TOPOLOGY_CHANGED")
        self.assertEqual(raised.exception.code, "NETWORK_MANAGEMENT_INTERFACE_PROTECTED")
        self.assertEqual(len(self.fixture.firewalls), before)
        self.fixture.routes[0]["dev"] = "eth0"
        self.fixture.addresses[1]["address"] = "02:99:88:77:66:55"
        with self.assertRaises(host.NetworkError) as raised:
            self.manager.emergency_close(state, "NETWORK_TOPOLOGY_CHANGED")
        self.assertEqual(raised.exception.code, "NETWORK_EMERGENCY_IDENTITY_UNPROVEN")
        self.assertEqual(len(self.fixture.firewalls), before)

    def test_network_manager_inspection_failure_is_not_unmanaged(self):
        original = self.fixture.execute
        def executor(argv, **kwargs):
            if "is-active" in argv:
                return SimpleNamespace(returncode=1, stdout="", stderr="Failed to connect to bus")
            return original(argv, **kwargs)
        self.manager.execute = executor
        self.assert_code("NETWORK_MANAGER_INSPECTION_FAILED", {"operation": "status"})

    def test_emergency_rule_refuses_foreign_static_ipv4_or_global_ipv6(self):
        self.fixture.confirm()
        state = self.manager.read_state()
        original = copy.deepcopy(self.fixture.addresses[1]["addr_info"])
        for address in ({"family": "inet", "local": "192.168.40.1", "prefixlen": 24},
                        {"family": "inet6", "local": "2001:db8::1", "prefixlen": 64, "scope": "global"}):
            with self.subTest(address=address["family"]):
                self.fixture.addresses[1]["addr_info"] = original + [address]
                before = len(self.fixture.firewalls)
                with self.assertRaises(host.NetworkError) as raised:
                    self.manager.emergency_close(state, "NETWORK_INTERFACE_IN_USE")
                self.assertEqual(raised.exception.code, "NETWORK_EMERGENCY_IDENTITY_UNPROVEN")
                self.assertEqual(len(self.fixture.firewalls), before)

    def test_inventory_has_total_deadline(self):
        original = self.fixture.execute
        def executor(argv, **kwargs):
            self.fixture.time += 2.1
            return original(argv, **kwargs)
        self.manager.execute = executor
        self.assert_code("NETWORK_INVENTORY_TIMEOUT", {"operation": "status"})

    def test_inventory_size_is_bounded_before_per_interface_queries(self):
        self.fixture.addresses *= 65
        self.assert_code("NETWORK_HOST_INVENTORY_TOO_LARGE", {"operation": "status"})

    def test_source_routing_and_redirects_disabled_only_on_technical_port(self):
        tech = CONFIG["interface"]
        for name in ("accept_redirects", "send_redirects", "accept_source_route"):
            self.fixture.paths.at(f"/proc/sys/net/ipv4/conf/{tech}/{name}").write_text("1\n")
            self.fixture.paths.at(f"/proc/sys/net/ipv4/conf/eth0/{name}").write_text("1\n")
        self.fixture.apply()
        for name in ("accept_redirects", "send_redirects", "accept_source_route"):
            self.assertEqual(self.fixture.paths.at(f"/proc/sys/net/ipv4/conf/{tech}/{name}").read_text().strip(), "0")
            self.assertEqual(self.fixture.paths.at(f"/proc/sys/net/ipv4/conf/eth0/{name}").read_text().strip(), "1")
        self.fixture.time += 91
        self.manager.guard()
        for name in ("accept_redirects", "send_redirects", "accept_source_route"):
            self.assertEqual(self.fixture.paths.at(f"/proc/sys/net/ipv4/conf/{tech}/{name}").read_text().strip(), "1")

    def test_management_interface_rejected_without_mutation(self):
        config = {**CONFIG, "interface": "eth0", "mac": "02:10:20:30:40:50"}
        self.assert_code("NETWORK_MANAGEMENT_INTERFACE_PROTECTED", {"operation": "apply", "config": config})
        self.assertFalse(self.fixture.table)

    def test_networkd_managed_interface_rejected(self):
        entry = self.fixture.paths.at("/run/systemd/netif/links/3")
        entry.parent.mkdir(parents=True)
        entry.write_text("NETWORK_FILE=/etc/systemd/network/20-wired.network\n")
        self.assert_code("NETWORK_INTERFACE_MANAGER_CONFLICT", {"operation": "apply", "config": CONFIG})

    def test_reservation_persists_and_duplicate_ip_rejected(self):
        self.fixture.confirm()
        self.fixture.lease()
        self.manager.dispatch({"operation": "reservation", **CLIENT, "reserved": True})
        state = self.manager.read_state()
        self.assertEqual(state["confirmed"]["reservations"], [CLIENT])
        self.assertIn(f"dhcp-host={CLIENT['mac']},id:*,{CLIENT['ip']}", (self.fixture.paths.run / "dhcp.conf").read_text())
        self.fixture.lease(mac="02:00:00:00:00:01")
        self.assert_code("NETWORK_RESERVATION_CONFLICT", {"operation": "reservation", "mac": "02:00:00:00:00:01", "ip": CLIENT["ip"], "reserved": True})

    def test_expired_leases_never_authorize_reservation_or_grant(self):
        self.fixture.confirm()
        self.fixture.lease(expiry=self.fixture.wall - 1)
        self.assert_code("NETWORK_CURRENT_LEASE_REQUIRED", {"operation": "grant", **CLIENT, "durationSeconds": 300})
        self.assert_code("NETWORK_CURRENT_LEASE_REQUIRED", {"operation": "reservation", **CLIENT, "reserved": True})

    def test_saved_reservation_can_be_removed_offline(self):
        self.fixture.confirm()
        self.fixture.lease()
        self.manager.dispatch({"operation": "reservation", **CLIENT, "reserved": True})
        self.fixture.paths.leases.unlink()
        self.manager.dispatch({"operation": "reservation", **CLIENT, "reserved": False})
        self.assertEqual(self.manager.read_state()["confirmed"]["reservations"], [])

    def test_grants_not_serialized_and_unrelated_rewrite_does_not_renew(self):
        self.fixture.confirm()
        self.fixture.lease()
        self.manager.dispatch({"operation": "grant", **CLIENT, "durationSeconds": 300})
        self.assertIn("timeout 297s", self.fixture.firewalls[-1])
        self.assertNotIn(CLIENT["mac"], (self.fixture.paths.state / "state.json").read_text())
        self.assertNotIn("grants", self.manager.read_state())
        self.fixture.time += 100
        self.manager.dispatch({"operation": "revoke", "mac": "02:00:00:00:00:01", "ip": "192.168.250.101"})
        self.assertIn("timeout 197s", self.fixture.firewalls[-1])
        self.fixture.time += 201
        self.assertEqual(self.manager.dispatch({"operation": "status"})["grants"], [])

    def test_unknown_field_and_boolean_duration_rejected(self):
        self.assert_code("NETWORK_REQUEST_INVALID", {"operation": "status", "shell": "id"})
        self.fixture.confirm()
        self.assert_code("NETWORK_GRANT_DURATION_INVALID", {"operation": "grant", **CLIENT, "durationSeconds": True})

    def test_unknown_operation_rejected_before_state_work(self):
        self.assert_code("NETWORK_OPERATION_UNKNOWN", {"operation": "shell", "command": "id"})
        self.assertEqual(self.fixture.calls, [])

    def test_symlink_state_cannot_be_followed(self):
        (self.fixture.paths.state / "state.json").symlink_to("/etc/passwd")
        self.assert_code("NETWORK_UNSAFE_PATH", {"operation": "status"})

    def test_active_pending_blocks_second_apply_and_grants(self):
        self.fixture.apply()
        self.assert_code("NETWORK_CONFIRMATION_PENDING", {"operation": "apply", "config": CONFIG})
        self.assert_code("NETWORK_CONFIRMED_CONFIG_REQUIRED", {"operation": "grant", **CLIENT, "durationSeconds": 60})

    def test_unknown_transaction_cannot_confirm(self):
        self.fixture.apply()
        self.assert_code("NETWORK_TRANSACTION_INVALID", {"operation": "confirm", "transactionId": "a" * 32})


if __name__ == "__main__":
    unittest.main()
