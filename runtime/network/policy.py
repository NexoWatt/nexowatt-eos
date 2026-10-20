"""Validated EOS technical-LAN configuration; pure functions, no host mutation.

A MAC reservation allocates addresses; it does not authenticate a device. The
first supported profile is an IPv4 /24 on an explicitly selected Ethernet NIC.
The privileged host service supplies a fresh trusted inventory and computes
remaining grant lifetime from a monotonic clock before every render.
"""
from __future__ import annotations

import ipaddress
import math
import re

TABLE = "eos_technical"
MAX_GRANT_SECONDS = 3600
MAX_RESERVATIONS = 253
MAX_LISTENERS = 5
ALLOWED_LISTENERS = frozenset({("tcp", 1883), ("tcp", 8883), ("tcp", 4712),
                               ("tcp", 9220), ("udp", 5353)})
MAX_LEASE_BYTES = 1024 * 1024
MAX_LEASE_ROWS = 4096
LEASE_FILE = "/var/lib/nexowatt-eos-dhcp/leases"
# Never expose local management, databases or DNS through the device-service UI.
FORBIDDEN_LISTENER_PORTS = frozenset({22, 53, 80, 443, 5432, 6379, 8081, 8188,
                                    8443, 16379, 16380, 18081, 18800, 18801})
# Explicit ranges make the policy independent of Python's evolving is_global.
BLOCKED_IPV4 = (
    "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8",
    "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24",
    "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15",
    "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
)
PRIVATE_IPV4 = tuple(ipaddress.ip_network(x) for x in
                     ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"))


class PolicyError(ValueError):
    """Public, non-sensitive validation code, never an interpolated input."""
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def _reject(code):
    raise PolicyError(code)


def _object(value, allowed, required, code):
    if not isinstance(value, dict) or set(value) - set(allowed) or not set(required) <= set(value):
        _reject(code)


def _list(value, limit, code):
    if not isinstance(value, list) or len(value) > limit:
        _reject(code)
    return value


def _interface(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,14}", value) or value == "lo":
        _reject("NETWORK_INTERFACE_INVALID")
    return value


def normalize_mac(value):
    if not isinstance(value, str) or not re.fullmatch(r"(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}", value):
        _reject("NETWORK_MAC_INVALID")
    result = value.lower()
    if result == "00:00:00:00:00:00" or int(result[:2], 16) & 1:
        _reject("NETWORK_MAC_INVALID")
    return result


def _ipv4(value, code="NETWORK_IPV4_INVALID"):
    if not isinstance(value, str):
        _reject(code)
    try:
        result = ipaddress.IPv4Address(value)
    except (ValueError, TypeError):
        _reject(code)
    if str(result) != value:
        _reject(code)
    return result


def _network(config):
    address = _ipv4(config.get("address"))
    if type(config.get("prefixLength")) is not int or config["prefixLength"] != 24:
        _reject("NETWORK_PREFIX_UNSUPPORTED")
    network = ipaddress.IPv4Network(f"{address}/24", strict=False)
    if not any(network.subnet_of(private) for private in PRIVATE_IPV4):
        _reject("NETWORK_PRIVATE_SUBNET_REQUIRED")
    if address in (network.network_address, network.broadcast_address):
        _reject("NETWORK_GATEWAY_INVALID")
    return address, network


def _host_ip(value, gateway, network):
    address = _ipv4(value)
    if address not in network or address in (gateway, network.network_address, network.broadcast_address):
        _reject("NETWORK_CLIENT_ADDRESS_INVALID")
    return address


def _inventory_addresses(entry):
    output = []
    for address in _list(entry.get("addresses", []), 64, "NETWORK_INVENTORY_INVALID"):
        if not isinstance(address, dict) or not isinstance(address.get("address"), str) or type(address.get("prefixLength")) is not int:
            _reject("NETWORK_INVENTORY_INVALID")
        try:
            output.append(ipaddress.ip_interface(f'{address["address"]}/{address["prefixLength"]}'))
        except ValueError:
            _reject("NETWORK_INVENTORY_INVALID")
    return output


def _inventory(config, inventory):
    if not isinstance(inventory, dict):
        _reject("NETWORK_INVENTORY_REQUIRED")
    interfaces = _list(inventory.get("interfaces"), 128, "NETWORK_INVENTORY_INVALID")
    names, macs = set(), []
    selected = uplink_entry = None
    uplink = _interface(inventory.get("uplink"))
    for entry in interfaces:
        if not isinstance(entry, dict):
            _reject("NETWORK_INVENTORY_INVALID")
        name = _interface(entry.get("name")) if entry.get("name") != "lo" else "lo"
        if name in names:
            _reject("NETWORK_INVENTORY_INVALID")
        names.add(name)
        if name == config["interface"]:
            selected = entry
        if name == uplink:
            uplink_entry = entry
        # Tunnel/loopback devices may legitimately have no Ethernet address.
        # Their IP routes still enter the blocked-destination inventory.
        if isinstance(entry.get("mac"), str) and re.fullmatch(r"(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}", entry["mac"]):
            if entry["mac"] != "00:00:00:00:00:00":
                macs.append((name, entry["mac"].lower()))
        _inventory_addresses(entry)
    if selected is None or uplink_entry is None:
        _reject("NETWORK_INTERFACE_MISSING")
    protected = _list(inventory.get("managementInterfaces", []), 128, "NETWORK_INVENTORY_INVALID")
    if any(not isinstance(name, str) for name in protected):
        _reject("NETWORK_INVENTORY_INVALID")
    if selected["name"] == uplink or selected.get("defaultRoute") is True or selected["name"] in protected:
        _reject("NETWORK_MANAGEMENT_INTERFACE_PROTECTED")
    if selected.get("kind") != "ether" or selected.get("master"):
        _reject("NETWORK_ETHERNET_REQUIRED")
    if selected.get("managed") not in (False, "eos"):
        _reject("NETWORK_INTERFACE_MANAGER_CONFLICT")
    current = normalize_mac(selected.get("mac"))
    permanent = normalize_mac(selected.get("permanentMac") or selected.get("mac"))
    if current != config["mac"] or permanent != config["mac"]:
        _reject("NETWORK_INTERFACE_IDENTITY_CHANGED")
    if any(name != selected["name"] and mac == current for name, mac in macs):
        _reject("NETWORK_INTERFACE_IDENTITY_AMBIGUOUS")
    for address in _inventory_addresses(selected):
        if selected.get("managed") != "eos" and not (address.version == 6 and address.ip.is_link_local):
            _reject("NETWORK_INTERFACE_IN_USE")
    if uplink_entry.get("master") or not uplink_entry.get("defaultRoute"):
        _reject("NETWORK_UPLINK_INVALID")
    return interfaces, selected, uplink


def _route_networks(inventory):
    result = []
    for route in _list(inventory.get("routes", []), 2048, "NETWORK_INVENTORY_INVALID"):
        if not isinstance(route, dict) or not isinstance(route.get("destination"), str):
            _reject("NETWORK_INVENTORY_INVALID")
        destination = route["destination"]
        if destination == "default":
            continue
        try:
            network = ipaddress.ip_network(destination, strict=False)
        except ValueError:
            _reject("NETWORK_INVENTORY_INVALID")
        if network.prefixlen:
            result.append((network, route.get("interface")))
    return result


def validate_config(config, inventory=None):
    """Validate strict client configuration and optionally its current NIC inventory."""
    keys = {"interface", "mac", "address", "prefixLength", "dhcpStart", "dhcpEnd",
            "dnsServers", "reservations", "listeners"}
    _object(config, keys, keys - {"reservations", "listeners"}, "NETWORK_CONFIG_INVALID")
    result = {"interface": _interface(config["interface"]), "mac": normalize_mac(config["mac"]),
              "address": config["address"], "prefixLength": config["prefixLength"]}
    gateway, network = _network(result)
    first, last = _host_ip(config["dhcpStart"], gateway, network), _host_ip(config["dhcpEnd"], gateway, network)
    if first > last or first <= gateway <= last:
        _reject("NETWORK_DHCP_RANGE_INVALID")
    result.update(dhcpStart=str(first), dhcpEnd=str(last))
    dns = _list(config["dnsServers"], 3, "NETWORK_DNS_INVALID")
    if not dns:
        _reject("NETWORK_DNS_INVALID")
    deny = tuple(ipaddress.ip_network(item) for item in BLOCKED_IPV4)
    dns_addresses = [_ipv4(item, "NETWORK_DNS_INVALID") for item in dns]
    if len(set(dns_addresses)) != len(dns_addresses) or any(any(address in blocked for blocked in deny) for address in dns_addresses):
        _reject("NETWORK_PUBLIC_DNS_REQUIRED")
    result["dnsServers"] = [str(address) for address in dns_addresses]
    reservations = []
    used_macs, used_ips = set(), set()
    for reservation in _list(config.get("reservations", []), MAX_RESERVATIONS, "NETWORK_RESERVATIONS_INVALID"):
        _object(reservation, {"mac", "ip"}, {"mac", "ip"}, "NETWORK_RESERVATION_INVALID")
        mac, address = normalize_mac(reservation["mac"]), str(_host_ip(reservation["ip"], gateway, network))
        if mac in used_macs or address in used_ips or mac == result["mac"]:
            _reject("NETWORK_RESERVATION_CONFLICT")
        used_macs.add(mac)
        used_ips.add(address)
        reservations.append({"mac": mac, "ip": address})
    result["reservations"] = sorted(reservations, key=lambda item: int(ipaddress.ip_address(item["ip"])))
    listeners, used_listeners = [], set()
    for listener in _list(config.get("listeners", []), MAX_LISTENERS, "NETWORK_LISTENERS_INVALID"):
        _object(listener, {"protocol", "port"}, {"protocol", "port"}, "NETWORK_LISTENER_INVALID")
        protocol, port = listener["protocol"], listener["port"]
        if not isinstance(protocol, str) or type(port) is not int or (protocol, port) not in ALLOWED_LISTENERS:
            _reject("NETWORK_LISTENER_FORBIDDEN")
        if (protocol, port) in used_listeners:
            _reject("NETWORK_LISTENER_DUPLICATE")
        used_listeners.add((protocol, port))
        listeners.append({"protocol": protocol, "port": port})
    result["listeners"] = sorted(listeners, key=lambda item: (item["protocol"], item["port"]))
    if inventory is not None:
        interfaces, selected, _ = _inventory(result, inventory)
        for entry in interfaces:
            if entry["name"] == selected["name"]:
                continue
            for address in _inventory_addresses(entry):
                if address.version == 4 and network.overlaps(address.network):
                    _reject("NETWORK_SUBNET_OVERLAP")
        for route, interface in _route_networks(inventory):
            if route.version == 4 and network.overlaps(route):
                if interface != selected["name"] or selected.get("managed") != "eos":
                    _reject("NETWORK_SUBNET_OVERLAP")
        blocked = blocked_destinations(inventory)
        if any(any(address in item for item in blocked) for address in dns_addresses):
            _reject("NETWORK_DNS_ROUTE_BLOCKED")
    return result


def blocked_destinations(inventory):
    """All special, connected and routed IPv4 ranges, including public customer LANs."""
    blocked = [ipaddress.ip_network(value) for value in BLOCKED_IPV4]
    for entry in _list(inventory.get("interfaces"), 128, "NETWORK_INVENTORY_INVALID"):
        blocked.extend(address.network for address in _inventory_addresses(entry) if address.version == 4)
    blocked.extend(network for network, _ in _route_networks(inventory) if network.version == 4)
    return list(ipaddress.collapse_addresses(blocked))


def render_dnsmasq(config):
    config = validate_config(config)
    return "\n".join([
        "# Generated by NexoWatt EOS; DHCP only, no DNS proxy, no external config includes.",
        "port=0", "bind-interfaces", f'interface={config["interface"]}', "except-interface=lo",
        "dhcp-authoritative", "dhcp-ignore-clid", "no-hosts", "no-resolv",
        f'dhcp-range={config["dhcpStart"]},{config["dhcpEnd"]},255.255.255.0,12h',
        f'dhcp-option=option:router,{config["address"]}',
        "dhcp-option=option:dns-server," + ",".join(config["dnsServers"]),
        f"dhcp-leasefile={LEASE_FILE}", "dhcp-lease-max=253",
        *[f'dhcp-host={item["mac"]},id:*,{item["ip"]}' for item in config["reservations"]],
        "",
    ])


def _grants(config, grants):
    gateway, network = _network(config)
    result, macs, ips = [], set(), set()
    for grant in _list(grants, MAX_RESERVATIONS, "NETWORK_GRANTS_INVALID"):
        _object(grant, {"mac", "ip", "remainingSeconds"}, {"mac", "ip", "remainingSeconds"}, "NETWORK_GRANT_INVALID")
        mac, ip = normalize_mac(grant["mac"]), str(_host_ip(grant["ip"], gateway, network))
        seconds = grant["remainingSeconds"]
        if type(seconds) is not int or not 0 <= seconds <= MAX_GRANT_SECONDS:
            _reject("NETWORK_GRANT_DURATION_INVALID")
        if not seconds:
            continue
        if mac in macs or ip in ips or mac == config["mac"]:
            _reject("NETWORK_GRANT_CONFLICT")
        macs.add(mac)
        ips.add(ip)
        result.append({"mac": mac, "ip": ip, "remainingSeconds": seconds})
    return result


def render_nftables(config, inventory, grants=None, replace=False):
    """An atomic transaction for our table only; caller must run nft --check first.

    remainingSeconds MUST be floor(expiry_monotonic - time.monotonic()). No
    global established accept precedes technical-network checks. Both packet
    directions require a live kernel timeout element, so expiry closes streams.
    """
    config = validate_config(config, inventory)
    grants = _grants(config, [] if grants is None else grants)
    if type(replace) is not bool:
        _reject("NETWORK_REPLACE_INVALID")
    tech, uplink = config["interface"], inventory["uplink"]
    indices = {}
    for entry in inventory["interfaces"]:
        if entry["name"] not in (tech, uplink):
            continue
        index = entry.get("ifindex")
        if type(index) is not int or not 1 <= index <= 2147483647:
            _reject("NETWORK_INTERFACE_INDEX_REQUIRED")
        indices[entry["name"]] = index
    if len(set(indices.values())) != 2:
        _reject("NETWORK_INTERFACE_INDEX_REQUIRED")
    tech_index, uplink_index = indices[tech], indices[uplink]
    gateway, network = _network(config)
    blocked = ", ".join(str(value) for value in blocked_destinations(inventory))
    clients = ", ".join(f'{item["ip"]} . {item["mac"]} timeout {item["remainingSeconds"]}s' for item in grants)
    returns = ", ".join(f'{item["ip"]} timeout {item["remainingSeconds"]}s' for item in grants)
    lines = ["# Generated EOS technical-LAN policy; no changes to unrelated tables."]
    if replace:
        lines.append(f"delete table inet {TABLE}")
    lines.extend([
        f"table inet {TABLE} {{",
        '  comment "NexoWatt EOS technical network v1"',
        f"  set blocked_v4 {{ type ipv4_addr; flags interval; elements = {{ {blocked} }}; }}",
        "  set internet_clients { type ipv4_addr . ether_addr; flags timeout;" + (f" elements = {{ {clients} }};" if clients else "") + " }",
        "  set internet_return { type ipv4_addr; flags timeout;" + (f" elements = {{ {returns} }};" if returns else "") + " }",
        "  chain input { type filter hook input priority -10; policy accept;",
        f'    iifname "{tech}" meta iif != {tech_index} drop',
        f'    iifname "{tech}" meta nfproto ipv6 drop',
        f'    iifname "{tech}" ct state invalid drop',
        f'    iifname "{tech}" ip saddr {{ 0.0.0.0, {network} }} ip daddr {{ 255.255.255.255, {gateway} }} udp sport 68 udp dport 67 accept',
        f'    iifname "{tech}" ip saddr != {network} drop',
        f'    iifname "{tech}" ct direction reply ct state established,related accept',
    ])
    for listener in config["listeners"]:
        destination = f"{{ {gateway}, 224.0.0.251 }}" if (listener["protocol"], listener["port"]) == ("udp", 5353) else str(gateway)
        ttl = " ip ttl 255" if (listener["protocol"], listener["port"]) == ("udp", 5353) else ""
        lines.append(f'    iifname "{tech}" ip daddr {destination}{ttl} {listener["protocol"]} dport {listener["port"]} accept')
    lines.extend([
        f'    iifname "{tech}" drop',
        "  }",
        "  chain forward { type filter hook forward priority -10; policy accept;",
        f'    iifname "{tech}" meta iif != {tech_index} drop',
        f'    oifname "{tech}" meta oif != {tech_index} drop',
        f'    iifname "{uplink}" oifname "{tech}" meta iif != {uplink_index} drop',
        f'    iifname "{tech}" oifname "{uplink}" meta oif != {uplink_index} drop',
        f'    iifname "{tech}" meta nfproto ipv6 drop',
        f'    oifname "{tech}" meta nfproto ipv6 drop',
        f'    iifname "{tech}" ct state invalid drop',
        f'    oifname "{tech}" ct state invalid drop',
        f'    iifname "{tech}" ip daddr @blocked_v4 drop',
        f'    oifname "{tech}" ip saddr @blocked_v4 drop',
        f'    iifname "{tech}" ip saddr != {network} drop',
        f'    oifname "{tech}" ip daddr != {network} drop',
        f'    iifname "{tech}" oifname "{uplink}" ip saddr . ether saddr @internet_clients meta l4proto {{ tcp, udp, icmp }} accept',
        f'    iifname "{uplink}" oifname "{tech}" ip daddr @internet_return ct state established,related accept',
        f'    iifname "{tech}" drop',
        f'    oifname "{tech}" drop',
        "  }",
        "  chain output { type filter hook output priority -10; policy accept;",
        f'    oifname "{tech}" meta oif != {tech_index} drop',
        f'    oifname "{tech}" meta nfproto ipv6 drop',
        "  }",
        "  chain postrouting { type nat hook postrouting priority srcnat; policy accept;",
        f'    iifname "{tech}" meta iif {tech_index} oifname "{uplink}" meta oif {uplink_index} ip saddr @internet_return masquerade',
        "  }",
        "}", "",
    ])
    flag = inventory.get("uplinkForwardingWasDisabled", False)
    if type(flag) is not bool:
        _reject("NETWORK_INVENTORY_INVALID")
    if flag:
        index = lines.index("  chain forward { type filter hook forward priority -10; policy accept;") + 1
        lines.insert(index, f'    iifname "{uplink}" oifname != "{tech}" drop')
    return "\n".join(lines)


def parse_leases(text, now, config=None):
    """Return bounded lease observations. A lease is not a reachability proof."""
    if not isinstance(text, str) or len(text.encode("utf-8")) > MAX_LEASE_BYTES:
        _reject("NETWORK_LEASES_TOO_LARGE")
    if isinstance(now, bool) or not isinstance(now, (int, float)) or not math.isfinite(now) or now < 0:
        _reject("NETWORK_CLOCK_INVALID")
    lines = text.splitlines()
    if len(lines) > MAX_LEASE_ROWS:
        _reject("NETWORK_LEASES_TOO_LARGE")
    normalized = validate_config(config) if config is not None else None
    reserved = {(item["mac"], item["ip"]) for item in normalized["reservations"]} if normalized else set()
    result, observed = [], set()
    for line in lines:
        parts = line.split()
        if len(parts) != 5 or len(line) > 512:
            continue
        expiry, mac, ip, hostname, _ = parts
        try:
            if not re.fullmatch(r"[0-9]{1,12}", expiry):
                continue
            expiry = int(expiry)
            mac = normalize_mac(mac)
            address = _ipv4(ip)
            if normalized:
                gateway, network = _network(normalized)
                _host_ip(ip, gateway, network)
            if len(hostname) > 63 or not re.fullmatch(r"[A-Za-z0-9_.-]{1,63}|\*", hostname):
                hostname = ""
        except PolicyError:
            continue
        if (mac, ip) in observed:
            continue
        observed.add((mac, ip))
        result.append({"mac": mac, "ip": str(address), "hostname": "" if hostname == "*" else hostname,
                       "expiresAt": expiry, "active": expiry == 0 or expiry > now,
                       "reserved": (mac, ip) in reserved})
    return sorted(result, key=lambda item: (int(ipaddress.IPv4Address(item["ip"])), item["mac"]))
