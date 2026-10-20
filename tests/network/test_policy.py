"""Negative and positive policy tests; no socket, firewall or host mutation."""
import copy
import importlib.util
from pathlib import Path
import unittest

SOURCE = Path(__file__).resolve().parents[2] / "runtime/network/policy.py"
spec = importlib.util.spec_from_file_location("eos_network_policy", SOURCE)
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)


def config():
    return {
        "interface": "enx020000000001", "mac": "02:00:00:00:00:01",
        "address": "192.168.77.1", "prefixLength": 24,
        "dhcpStart": "192.168.77.20", "dhcpEnd": "192.168.77.200",
        "dnsServers": ["1.1.1.1", "9.9.9.9"],
        "reservations": [], "listeners": [],
    }


def inventory():
    return {
        "interfaces": [
            {"name": "lo", "mac": "00:00:00:00:00:00", "kind": "loopback", "addresses": [{"address": "127.0.0.1", "prefixLength": 8}]},
            {"name": "eth0", "ifindex": 2, "mac": "02:00:00:00:01:01", "kind": "ether", "defaultRoute": True,
             "managed": True, "addresses": [{"address": "192.168.1.2", "prefixLength": 24}]},
            {"name": "enx020000000001", "ifindex": 3, "mac": "02:00:00:00:00:01", "permanentMac": "02:00:00:00:00:01",
             "kind": "ether", "defaultRoute": False, "master": None, "managed": False, "addresses": []},
        ],
        "routes": [{"destination": "default", "interface": "eth0"}, {"destination": "192.168.1.0/24", "interface": "eth0"}],
        "uplink": "eth0", "managementInterfaces": ["eth0"],
    }


class PolicyTests(unittest.TestCase):
    def assert_code(self, code, fn, *args, **kwargs):
        with self.assertRaises(policy.PolicyError) as ctx:
            fn(*args, **kwargs)
        self.assertEqual(ctx.exception.code, code)
        # All surfaced diagnostics remain fixed codes, not attacker data.
        self.assertEqual(str(ctx.exception), code)

    def test_normalization_does_not_modify_source(self):
        cfg = config()
        cfg["reservations"] = [{"mac": "02:AB:CD:EF:00:02", "ip": "192.168.77.22"}]
        original = copy.deepcopy(cfg)
        result = policy.validate_config(cfg, inventory())
        self.assertEqual(cfg, original)
        self.assertEqual(result["reservations"][0]["mac"], "02:ab:cd:ef:00:02")

    def test_unknown_configuration_keys_reject_arbitrary_commands(self):
        for key in ("command", "nft", "dhcpOption", "path", "__proto__"):
            cfg = config()
            cfg[key] = "arbitrary"
            self.assert_code("NETWORK_CONFIG_INVALID", policy.validate_config, cfg, inventory())

    def test_interface_injection_and_reserved_names_rejected(self):
        for name in ("eth1\ninterface=eth0", "eth1;flush ruleset", "../eth0", "lo", "x" * 16, "", "eth0:1"):
            cfg = config()
            cfg["interface"] = name
            self.assert_code("NETWORK_INTERFACE_INVALID", policy.validate_config, cfg, inventory())

    def test_non_private_subnets_and_bad_prefixes_rejected(self):
        for address in ("8.8.8.1", "100.64.1.1", "169.254.4.1", "127.0.0.1", "192.0.2.1", "224.0.0.1"):
            cfg = config()
            cfg["address"] = address
            self.assert_code("NETWORK_PRIVATE_SUBNET_REQUIRED", policy.validate_config, cfg)
        for prefix in (16, 25, "24", True, 24.0):
            cfg = config()
            cfg["prefixLength"] = prefix
            self.assert_code("NETWORK_PREFIX_UNSUPPORTED", policy.validate_config, cfg)

    def test_gateway_and_pool_exclusions(self):
        for address in ("192.168.77.0", "192.168.77.255"):
            cfg = config()
            cfg["address"] = address
            self.assert_code("NETWORK_GATEWAY_INVALID", policy.validate_config, cfg)
        for address in ("192.168.77.0", "192.168.77.255", "192.168.77.1", "192.168.78.20"):
            cfg = config()
            cfg["dhcpStart"] = address
            self.assert_code("NETWORK_CLIENT_ADDRESS_INVALID", policy.validate_config, cfg)
        cfg = config()
        cfg["dhcpStart"], cfg["dhcpEnd"] = "192.168.77.200", "192.168.77.20"
        self.assert_code("NETWORK_DHCP_RANGE_INVALID", policy.validate_config, cfg)
        cfg = config()
        cfg["address"] = "192.168.77.50"
        self.assert_code("NETWORK_DHCP_RANGE_INVALID", policy.validate_config, cfg)

    def test_noncanonical_ipv4_rejected(self):
        for address in ("192.168.077.1", "3232255233", "192.168.77.1\n", None, 0, "::1"):
            cfg = config()
            cfg["address"] = address
            self.assert_code("NETWORK_IPV4_INVALID", policy.validate_config, cfg)

    def test_non_unicast_macs_and_secret_injection_rejected(self):
        for mac in ("ff:ff:ff:ff:ff:ff", "00:00:00:00:00:00", "01:00:5e:00:00:01", "02:00:00:00:00:01\n", "--secret"):
            cfg = config()
            cfg["mac"] = mac
            self.assert_code("NETWORK_MAC_INVALID", policy.validate_config, cfg)

    def test_duplicate_reservations_and_gateway_conflicts(self):
        cases = [
            [{"mac": "02:00:00:00:00:20", "ip": "192.168.77.20"}, {"mac": "02:00:00:00:00:21", "ip": "192.168.77.20"}],
            [{"mac": "02:00:00:00:00:20", "ip": "192.168.77.20"}, {"mac": "02:00:00:00:00:20", "ip": "192.168.77.21"}],
            [{"mac": config()["mac"], "ip": "192.168.77.20"}],
        ]
        for reservations in cases:
            cfg = config()
            cfg["reservations"] = reservations
            self.assert_code("NETWORK_RESERVATION_CONFLICT", policy.validate_config, cfg)
        cfg = config()
        cfg["reservations"] = [{"mac": "02:00:00:00:00:20", "ip": "192.168.77.1"}]
        self.assert_code("NETWORK_CLIENT_ADDRESS_INVALID", policy.validate_config, cfg)

    def test_reservation_outside_dynamic_pool_supported(self):
        cfg = config()
        cfg["reservations"] = [{"mac": "02:00:00:00:00:20", "ip": "192.168.77.10"}]
        self.assertEqual(policy.validate_config(cfg)["reservations"], cfg["reservations"])

    def test_public_dns_only_and_no_duplicate_resolvers(self):
        for servers in (["192.168.1.1"], ["127.0.0.1"], ["100.64.0.1"], ["224.0.0.1"], ["1.1.1.1", "1.1.1.1"]):
            cfg = config()
            cfg["dnsServers"] = servers
            self.assert_code("NETWORK_PUBLIC_DNS_REQUIRED", policy.validate_config, cfg)
        for servers in ([], "1.1.1.1", ["1.1.1.1"] * 4):
            cfg = config()
            cfg["dnsServers"] = servers
            self.assert_code("NETWORK_DNS_INVALID", policy.validate_config, cfg)

    def test_management_interfaces_and_default_routes_protected(self):
        for field in ("uplink", "defaultRoute", "managementInterfaces"):
            inv = inventory()
            if field == "uplink":
                inv["uplink"] = config()["interface"]
            elif field == "defaultRoute":
                inv["interfaces"][2]["defaultRoute"] = True
            else:
                inv["managementInterfaces"].append(config()["interface"])
            self.assert_code("NETWORK_MANAGEMENT_INTERFACE_PROTECTED", policy.validate_config, config(), inv)

    def test_interface_must_be_present_and_identity_must_match(self):
        inv = inventory()
        inv["interfaces"].pop()
        self.assert_code("NETWORK_INTERFACE_MISSING", policy.validate_config, config(), inv)
        for key in ("mac", "permanentMac"):
            inv = inventory()
            inv["interfaces"][2][key] = "02:00:00:00:00:09"
            self.assert_code("NETWORK_INTERFACE_IDENTITY_CHANGED", policy.validate_config, config(), inv)
        inv = inventory()
        inv["interfaces"][1]["mac"] = config()["mac"]
        self.assert_code("NETWORK_INTERFACE_IDENTITY_AMBIGUOUS", policy.validate_config, config(), inv)

    def test_bridge_bond_vlans_and_foreign_network_managers_rejected(self):
        for key, value, code in (("master", "br0", "NETWORK_ETHERNET_REQUIRED"), ("kind", "vlan", "NETWORK_ETHERNET_REQUIRED"),
                                 ("managed", True, "NETWORK_INTERFACE_MANAGER_CONFLICT"),
                                 ("managed", "NetworkManager", "NETWORK_INTERFACE_MANAGER_CONFLICT")):
            inv = inventory()
            inv["interfaces"][2][key] = value
            self.assert_code(code, policy.validate_config, config(), inv)

    def test_in_use_candidate_rejected_but_owned_technical_network_accepted(self):
        inv = inventory()
        inv["interfaces"][2]["addresses"] = [{"address": "192.168.77.1", "prefixLength": 24}]
        self.assert_code("NETWORK_INTERFACE_IN_USE", policy.validate_config, config(), inv)
        inv["interfaces"][2]["managed"] = "eos"
        inv["routes"].append({"destination": "192.168.77.0/24", "interface": config()["interface"]})
        self.assertEqual(policy.validate_config(config(), inv), config())

    def test_link_local_ipv6_candidate_allowed_to_be_disabled_by_host(self):
        inv = inventory()
        inv["interfaces"][2]["addresses"] = [{"address": "fe80::2", "prefixLength": 64}]
        self.assertEqual(policy.validate_config(config(), inv), config())

    def test_overlapping_other_interfaces_and_vpn_routes_rejected(self):
        inv = inventory()
        inv["interfaces"][1]["addresses"] = [{"address": "192.168.77.2", "prefixLength": 24}]
        self.assert_code("NETWORK_SUBNET_OVERLAP", policy.validate_config, config(), inv)
        inv = inventory()
        inv["routes"].append({"destination": "192.168.0.0/16", "interface": "tun0"})
        self.assert_code("NETWORK_SUBNET_OVERLAP", policy.validate_config, config(), inv)

    def test_public_customer_routes_block_even_if_not_rfc1918(self):
        inv = inventory()
        inv["routes"].append({"destination": "8.8.4.0/24", "interface": "eth0"})
        rendered = policy.render_nftables(config(), inv)
        self.assertIn("8.8.4.0/24", rendered)
        inv["routes"].append({"destination": "1.1.1.0/24", "interface": "eth0"})
        self.assert_code("NETWORK_DNS_ROUTE_BLOCKED", policy.validate_config, config(), inv)

    def test_unrelated_tunnel_without_ethernet_mac_retains_route_isolation(self):
        inv = inventory()
        inv["interfaces"].append({"name": "sit0", "kind": "sit", "mac": "0.0.0.0", "addresses": []})
        inv["routes"].append({"destination": "8.8.4.0/24", "interface": "sit0"})
        rendered = policy.render_nftables(config(), inv)
        self.assertIn("8.8.4.0/24", rendered)

    def test_inventory_routes_and_names_cannot_inject_nft(self):
        inv = inventory()
        inv["routes"].append({"destination": '8.8.4.0/24 }; flush ruleset', "interface": "eth0"})
        self.assert_code("NETWORK_INVENTORY_INVALID", policy.render_nftables, config(), inv)
        inv = inventory()
        inv["uplink"] = 'eth0";'
        self.assert_code("NETWORK_INTERFACE_INVALID", policy.render_nftables, config(), inv)

    def test_service_port_limits_protect_management_and_databases(self):
        for port in list(policy.FORBIDDEN_LISTENER_PORTS) + [0, 1023, 65536, True, "1883", 8082, 9000, 5433, 18081]:
            cfg = config()
            cfg["listeners"] = [{"protocol": "tcp", "port": port}]
            self.assert_code("NETWORK_LISTENER_FORBIDDEN", policy.validate_config, cfg)
        cfg = config()
        cfg["listeners"] = [{"protocol": "tcp", "port": 1883}, {"protocol": "udp", "port": 5353}]
        self.assertEqual(policy.validate_config(cfg)["listeners"], cfg["listeners"])
        cfg["listeners"].append(cfg["listeners"][0].copy())
        self.assert_code("NETWORK_LISTENER_DUPLICATE", policy.validate_config, cfg)

    def test_discovery_listener_is_protocol_and_destination_scoped(self):
        cfg = config()
        cfg["listeners"] = [{"protocol": "udp", "port": 5353}]
        rendered = policy.render_nftables(cfg, inventory())
        self.assertIn('ip daddr { 192.168.77.1, 224.0.0.251 } ip ttl 255 udp dport 5353 accept', rendered)
        cfg["listeners"] = [{"protocol": "tcp", "port": 5353}]
        self.assert_code("NETWORK_LISTENER_FORBIDDEN", policy.validate_config, cfg)
        cfg["listeners"] = [{"protocol": "udp", "port": 9220}]
        self.assert_code("NETWORK_LISTENER_FORBIDDEN", policy.validate_config, cfg)

    def test_dnsmasq_no_dns_proxy_exact_binding_explicit_gateway_and_mac_identity(self):
        cfg = config()
        cfg["reservations"] = [{"mac": "02:00:00:00:00:20", "ip": "192.168.77.20"}]
        rendered = policy.render_dnsmasq(cfg)
        self.assertIn("port=0\n", rendered)
        self.assertIn("bind-interfaces\ninterface=enx020000000001\n", rendered)
        self.assertIn("dhcp-option=option:router,192.168.77.1\n", rendered)
        self.assertIn("dhcp-option=option:dns-server,1.1.1.1,9.9.9.9\n", rendered)
        self.assertIn("dhcp-host=02:00:00:00:00:20,id:*,192.168.77.20\n", rendered)
        self.assertIn("dhcp-ignore-clid\n", rendered)
        self.assertNotIn("conf-dir=", rendered)
        self.assertNotIn("eth0", rendered)

    def test_firewall_owns_only_its_table_and_starts_without_grants(self):
        first = policy.render_nftables(config(), inventory())
        replacement = policy.render_nftables(config(), inventory(), replace=True)
        self.assertNotIn("flush ruleset", first + replacement)
        self.assertNotIn("delete table", first)
        self.assertEqual(replacement.count("delete table inet eos_technical"), 1)
        self.assertIn('comment "NexoWatt EOS technical network v1"', first)
        self.assertIn("set internet_clients { type ipv4_addr . ether_addr; flags timeout; }", first)
        self.assertIn("set internet_return { type ipv4_addr; flags timeout; }", first)

    def test_kernel_timeouts_in_both_directions_and_no_established_bypass(self):
        grant = {"mac": "02:00:00:00:00:20", "ip": "192.168.77.20", "remainingSeconds": 17}
        rendered = policy.render_nftables(config(), inventory(), [grant])
        self.assertIn("192.168.77.20 . 02:00:00:00:00:20 timeout 17s", rendered)
        self.assertIn("192.168.77.20 timeout 17s", rendered)
        forward = rendered.split("chain forward", 1)[1].split("chain output", 1)[0]
        accepted = [line for line in forward.splitlines() if line.strip().endswith("accept")]
        self.assertEqual(len(accepted), 2)
        self.assertIn("@internet_clients", accepted[0])
        self.assertIn("@internet_return", accepted[1])
        self.assertLess(forward.index("ip daddr @blocked_v4 drop"), forward.index("@internet_clients"))
        self.assertLess(forward.index("ip saddr @blocked_v4 drop"), forward.index("@internet_return"))

    def test_residual_grant_lifetime_is_not_replaced_with_original_duration(self):
        grant = {"mac": "02:00:00:00:00:20", "ip": "192.168.77.20", "remainingSeconds": 3}
        cfg = config()
        cfg["reservations"] = [{"mac": "02:00:00:00:00:21", "ip": "192.168.77.21"}]
        rendered = policy.render_nftables(cfg, inventory(), [grant])
        self.assertEqual(rendered.count("timeout 3s"), 2)
        self.assertNotIn("timeout 3600s", rendered)
        grant["remainingSeconds"] = 0
        self.assertNotIn("192.168.77.20", policy.render_nftables(cfg, inventory(), [grant]))

    def test_grants_are_bounded_nonzero_unique_client_only(self):
        base = {"mac": "02:00:00:00:00:20", "ip": "192.168.77.20", "remainingSeconds": 60}
        for seconds in (-1, 3601, True, 1.5, "60"):
            grant = dict(base, remainingSeconds=seconds)
            self.assert_code("NETWORK_GRANT_DURATION_INVALID", policy.render_nftables, config(), inventory(), [grant])
        self.assert_code("NETWORK_GRANT_CONFLICT", policy.render_nftables, config(), inventory(), [base, base])
        self.assert_code("NETWORK_CLIENT_ADDRESS_INVALID", policy.render_nftables, config(), inventory(), [dict(base, ip="192.168.1.2")])

    def test_nat_cannot_apply_to_unrelated_interface_spoofed_source(self):
        rendered = policy.render_nftables(config(), inventory())
        nat = rendered.split("chain postrouting", 1)[1]
        self.assertIn('iifname "enx020000000001" meta iif 3 oifname "eth0" meta oif 2 ip saddr @internet_return masquerade', nat)

    def test_ipv6_transit_block_and_input_allows_only_host_initiated_returns(self):
        rendered = policy.render_nftables(config(), inventory())
        self.assertEqual(rendered.count('iifname "enx020000000001" meta nfproto ipv6 drop'), 2)
        self.assertEqual(rendered.count('oifname "enx020000000001" meta nfproto ipv6 drop'), 2)
        self.assertIn("ct direction reply ct state established,related accept", rendered)
        self.assertNotIn('iifname "enx020000000001" ct state established,related accept', rendered)

    def test_interface_replacement_closed_by_index_before_accepts(self):
        rendered = policy.render_nftables(config(), inventory())
        self.assertEqual(rendered.count('iifname "enx020000000001" meta iif != 3 drop'), 2)
        self.assertEqual(rendered.count('oifname "enx020000000001" meta oif != 3 drop'), 2)
        self.assertIn('iifname "eth0" oifname "enx020000000001" meta iif != 2 drop', rendered)
        for value in (None, True, "3", 0, -1, 2):
            inv = inventory()
            inv["interfaces"][2]["ifindex"] = value
            self.assert_code("NETWORK_INTERFACE_INDEX_REQUIRED", policy.render_nftables, config(), inv)

    def test_enabling_uplink_forwarding_never_enables_customer_to_vpn_transit(self):
        inv = inventory()
        inv["uplinkForwardingWasDisabled"] = True
        rendered = policy.render_nftables(config(), inv)
        self.assertIn('iifname "eth0" oifname != "enx020000000001" drop', rendered)
        inv["uplinkForwardingWasDisabled"] = False
        self.assertNotIn('iifname "eth0" oifname !=', policy.render_nftables(config(), inv))

    def test_leases_are_observations_and_expiry_is_preserved(self):
        text = "2000 02:00:00:00:00:20 192.168.77.20 inverter 01:foo\n900 02:00:00:00:00:21 192.168.77.21 * *\n0 02:00:00:00:00:22 192.168.77.22 battery *\n"
        cfg = config()
        cfg["reservations"] = [{"mac": "02:00:00:00:00:20", "ip": "192.168.77.20"}]
        result = policy.parse_leases(text, 1000, cfg)
        self.assertEqual([x["active"] for x in result], [True, False, True])
        self.assertEqual([x["reserved"] for x in result], [True, False, False])
        self.assertNotIn("online", result[0])
        self.assertEqual(result[1]["hostname"], "")

    def test_malformed_untrusted_leases_filtered_without_xss_or_foreign_ips(self):
        valid = "2000 02:00:00:00:00:20 192.168.77.20 <script> *\n"
        text = valid + valid + "2000 --secret 192.168.77.21 test *\n2000 02:00:00:00:00:22 192.168.1.2 foreign *\ninvalid\n"
        result = policy.parse_leases(text, 1000, config())
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["hostname"], "")

    def test_lease_input_resource_limits_and_clock_validation(self):
        self.assert_code("NETWORK_LEASES_TOO_LARGE", policy.parse_leases, "a" * (policy.MAX_LEASE_BYTES + 1), 1000)
        self.assert_code("NETWORK_LEASES_TOO_LARGE", policy.parse_leases, "\n" * (policy.MAX_LEASE_ROWS + 1), 1000)
        for now in (float("inf"), float("nan"), -1, True, "1000"):
            self.assert_code("NETWORK_CLOCK_INVALID", policy.parse_leases, "", now)


if __name__ == "__main__":
    unittest.main(verbosity=2)
