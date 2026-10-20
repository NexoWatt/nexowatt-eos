#!/usr/bin/env python3
"""Real DHCP/nftables tests in disposable Linux network namespaces only.

Run on an isolated Linux CI runner with iproute2, util-linux, nftables and
dnsmasq-base installed:
  sudo env EOS_NETWORK_NAMESPACE_TEST=disposable python3 tests/network/native_namespace.py --require

No network interfaces, routes, sysctls or nftables rules in the caller's network
namespace are changed. Every mutation verifies the network namespace boundary.
The only filesystem writes are to a newly-created temporary test directory.
Missing tools/capabilities produce JSON SKIP and exit 77 (exit 1 with --require).
This is a kernel/DHCP integration test, not Pi/systemd/product acceptance.
"""
from __future__ import annotations

import argparse
import errno
import importlib.util
import json
import os
from pathlib import Path
import secrets
import select
import shutil
import signal
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time

ROOT = Path(__file__).resolve().parents[2]
SELF = str(Path(__file__).resolve())
TECH_MAC = "02:00:00:00:77:20"
ROUTER_MAC = "02:00:00:00:77:01"
UPLINK_MAC = "02:00:00:00:50:02"
PUBLIC = "93.184.216.34"
PUBLIC6 = "2001:4860:4860::8844"
TIMEOUT = 0.7
FIXTURE_READY_SECONDS = 5.0
FIXTURE_READY_ATTEMPTS = 12


class FixtureReadinessError(RuntimeError):
    def __init__(self, name, details):
        super().__init__(name + "_FAILED")
        self.details = details


def wait_for_fixture(probe, key, name, *, clock=time.monotonic, sleep=time.sleep):
    """Retry only pre-policy positive controls, with a real successful reply.

    A listener's READY line proves bind/listen, not that IPv6 neighbour discovery
    and source/route selection can already carry a connection through all peers.
    The caller bounds each subprocess by the remaining shared deadline.
    """
    started = clock()
    deadline = started + FIXTURE_READY_SECONDS
    attempts, result = 0, {}
    while attempts < FIXTURE_READY_ATTEMPTS:
        remaining = deadline - clock()
        if remaining <= 0:
            break
        attempts += 1
        try:
            result = probe(remaining)
        except subprocess.TimeoutExpired:
            result = {key: False, "errorCode": "PROBE_PROCESS_TIMEOUT"}
        elapsed = clock() - started
        details = {"attempts": attempts, "elapsedSeconds": round(elapsed, 3), "lastProbe": result}
        if result.get(key) is True and elapsed <= FIXTURE_READY_SECONDS:
            return details
        remaining = deadline - clock()
        if remaining > 0:
            sleep(min(0.1, remaining))
    raise FixtureReadinessError(name, {"attempts": attempts,
                                      "elapsedSeconds": round(clock() - started, 3),
                                      "lastProbe": result})


def namespace_inode():
    return os.stat("/proc/self/ns/net").st_ino


def isolation_guard():
    """Independent child check: the original wrapper must still exist outside."""
    marker = os.environ.get("EOS_NETWORK_TEST_MARKER")
    if not marker or os.environ.get("EOS_NETWORK_NAMESPACE_TEST") != "disposable":
        raise RuntimeError("ISOLATION_MARKER_REQUIRED")
    proof = json.loads(Path(marker).read_text())
    original = os.stat(f'/proc/{proof["wrapperPid"]}/ns/net').st_ino
    if original != proof["networkNamespace"] or namespace_inode() == original:
        raise RuntimeError("CALLER_NETWORK_NAMESPACE_REFUSED")


def execute(args, *, input_text=None, timeout=10, check=True):
    isolation_guard()
    return subprocess.run(args, input=input_text, text=True, capture_output=True,
                          timeout=timeout, check=check)


def in_namespace(pid, args):
    return ["nsenter", "--net=/proc/%d/ns/net" % pid, "--", *args]


def emit(value):
    print(json.dumps(value, sort_keys=True), flush=True)


def packet_options(packet):
    if len(packet) < 240 or packet[236:240] != b"\x63\x82\x53\x63":
        return {}
    result, pos = {}, 240
    while pos < len(packet):
        key = packet[pos]
        pos += 1
        if key == 255:
            break
        if key == 0:
            continue
        if pos >= len(packet):
            break
        length = packet[pos]
        pos += 1
        if pos + length > len(packet):
            break
        result[key] = packet[pos:pos + length]
        pos += length
    return result


def dhcp_exchange(interface, mac, expect_offer, client_suffix):
    """Perform an actual DHCPv4 DORA; no dhclient scripts or host config edits."""
    isolation_guard()
    xid = secrets.randbits(32)
    hardware = bytes.fromhex(mac.replace(":", ""))
    fixed = struct.pack("!BBBBIHH4s4s4s4s16s64s128s", 1, 1, 6, 0, xid, 0, 0x8000,
                        b"\0" * 4, b"\0" * 4, b"\0" * 4, b"\0" * 4,
                        hardware.ljust(16, b"\0"), b"\0" * 64, b"\0" * 128)
    client = b"\x01" + hardware + client_suffix.encode("ascii")

    def send(sock, kind, extra=b""):
        options = bytes([53, 1, kind, 61, len(client)]) + client + b"\x37\x03\x01\x03\x06" + extra + b"\xff"
        payload = (fixed + b"\x63\x82\x53\x63" + options).ljust(300, b"\0")
        udp = struct.pack("!HHHH", 68, 67, len(payload) + 8, 0) + payload
        header = struct.pack("!BBHHHBBH4s4s", 0x45, 0, len(udp) + 20, 0, 0, 64, 17, 0,
                             b"\0" * 4, b"\xff" * 4)
        checksum = sum(struct.unpack("!10H", header))
        while checksum >> 16:
            checksum = (checksum & 0xffff) + (checksum >> 16)
        header = header[:10] + struct.pack("!H", (~checksum) & 0xffff) + header[12:]
        sock.send(b"\xff" * 6 + hardware + b"\x08\x00" + header + udp)

    def receive(sock, expected_kind, seconds=2.0):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            sock.settimeout(max(0.01, deadline - time.monotonic()))
            try:
                frame = sock.recv(4096)
            except TimeoutError:
                return None
            if len(frame) < 42 or frame[12:14] != b"\x08\x00" or frame[23] != 17:
                continue
            ip_size = (frame[14] & 0x0f) * 4
            udp_start = 14 + ip_size
            if ip_size < 20 or len(frame) < udp_start + 8:
                continue
            source_port, target_port = struct.unpack("!HH", frame[udp_start:udp_start + 4])
            if source_port != 67 or target_port != 68:
                continue
            data = frame[udp_start + 8:]
            if len(data) >= 240 and data[0] == 2 and struct.unpack("!I", data[4:8])[0] == xid:
                opts = packet_options(data)
                if opts.get(53) == bytes([expected_kind]):
                    return data, opts
        return None

    # AF_PACKET avoids requiring a route/address before DHCP has assigned one.
    with socket.socket(socket.AF_PACKET, socket.SOCK_RAW, socket.htons(0x0800)) as sock:
        sock.bind((interface, 0))
        send(sock, 1)
        offered = receive(sock, 2)
        if not expect_offer:
            if offered is not None:
                raise RuntimeError("UNEXPECTED_MANAGEMENT_DHCP_OFFER")
            return {"offer": False}
        if offered is None:
            raise RuntimeError("TECHNICAL_DHCP_OFFER_MISSING")
        data, opts = offered
        address, server = data[16:20], opts.get(54)
        if not server or len(server) != 4:
            raise RuntimeError("DHCP_SERVER_IDENTIFIER_MISSING")
        send(sock, 3, b"\x32\x04" + address + b"\x36\x04" + server)
        ack = receive(sock, 5)
        if ack is None or ack[0][16:20] != address:
            raise RuntimeError("DHCP_ACK_MISSING")
        return {"offer": True, "ip": socket.inet_ntoa(address),
                "router": socket.inet_ntoa(ack[1][3]),
                "dns": socket.inet_ntoa(ack[1][6][:4])}


def dns_server():
    isolation_guard()
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.bind(("1.1.1.1", 53))
        print("READY", flush=True)
        while True:
            request, peer = sock.recvfrom(512)
            if len(request) < 12:
                continue
            response = request[:2] + b"\x81\x80\x00\x01\x00\x01\x00\x00\x00\x00" + request[12:]
            response += b"\xc0\x0c\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\xc0\x00\x02\x01"
            sock.sendto(response, peer)


def dns_probe():
    isolation_guard()
    query = b"\x45\x4f\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x07example\x07invalid\x00\x00\x01\x00\x01"
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.settimeout(TIMEOUT)
        try:
            sock.sendto(query, ("1.1.1.1", 53))
            response, peer = sock.recvfrom(512)
            return peer == ("1.1.1.1", 53) and response[:4] == b"\x45\x4f\x81\x80" and response[-4:] == b"\xc0\x00\x02\x01"
        except (OSError, TimeoutError):
            return False


def connection_probe(address, port):
    family = socket.AF_INET6 if ":" in address else socket.AF_INET
    sock = socket.socket(family, socket.SOCK_STREAM)
    sock.settimeout(TIMEOUT)
    result = {"connected": False, "family": "IPv6" if family == socket.AF_INET6 else "IPv4",
              "destination": address, "port": port, "phase": "connect"}
    try:
        sock.connect((address, port))
        result["phase"] = "send"
        sock.sendall(b"EOS-network-probe")
        result["phase"] = "echo"
        if sock.recv(128) != b"EOS-network-probe":
            # A malformed echo proves transport reachability. Never count it
            # as a blocked connection in a later negative assertion.
            raise RuntimeError("ECHO_MISMATCH")
        result["connected"] = True
    except (OSError, TimeoutError) as error:
        result["errno"] = error.errno
        result["errorCode"] = ("SOCKET_TIMEOUT" if isinstance(error, TimeoutError)
                               else errno.errorcode.get(error.errno, "SOCKET_ERROR"))
    finally:
        try:
            result["source"] = list(sock.getsockname())
        except OSError:
            pass
        sock.close()
    return result


def connect(address, port):
    return connection_probe(address, port)["connected"]


def failure_diagnostics(namespaces):
    """Read only synthetic namespace state; cap time and every output field."""
    isolation_guard()
    result = {}
    deadline = time.monotonic() + 6.0
    route_queries = {
        "router": ["ip", "-j", "-6", "route", "get", PUBLIC6, "from", "fd77::20", "iif", "tech0"],
        "technical": ["ip", "-j", "-6", "route", "get", PUBLIC6],
        "uplink": ["ip", "-j", "-6", "route", "get", "fd77::20", "from", PUBLIC6],
    }
    commands = [("addresses", ["ip", "-j", "address", "show"]),
                ("ipv6Routes", ["ip", "-j", "-6", "route", "show", "table", "all"]),
                ("ipv6Neighbours", ["ip", "-j", "-6", "neigh", "show"])]
    for name, pid in namespaces.items():
        fields = result[name] = {}
        for field, command in [*commands, ("ipv6RouteSelection", route_queries[name])]:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                fields["incomplete"] = "DIAGNOSTIC_DEADLINE"
                return result
            try:
                output = execute(in_namespace(pid, command), timeout=min(0.75, remaining), check=False)
                fields[field] = {"returncode": output.returncode,
                                 "stdout": output.stdout[:3000], "stderr": output.stderr[:500]}
            except subprocess.TimeoutExpired:
                fields[field] = {"errorCode": "DIAGNOSTIC_COMMAND_TIMEOUT"}
    return result


def echo_server(address, port):
    isolation_guard()
    family = socket.AF_INET6 if ":" in address else socket.AF_INET
    with socket.socket(family, socket.SOCK_STREAM) as listener:
        listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        listener.bind((address, port))
        listener.listen(8)
        print("READY", flush=True)

        def serve(client):
            with client:
                client.settimeout(15)
                try:
                    while True:
                        data = client.recv(4096)
                        if not data:
                            return
                        client.sendall(data)
                except (OSError, TimeoutError):
                    pass

        while True:
            client, _ = listener.accept()
            threading.Thread(target=serve, args=(client,), daemon=True).start()


def stream_expiry(address, port, seconds):
    isolation_guard()
    started = time.monotonic()
    received = 0
    with socket.create_connection((address, port), timeout=TIMEOUT) as sock:
        sock.settimeout(TIMEOUT)
        while time.monotonic() - started <= seconds + 2:
            try:
                sock.sendall(b"live")
                if sock.recv(4) != b"live":
                    break
                received += 1
            except (OSError, TimeoutError):
                break
            time.sleep(0.1)
    elapsed = time.monotonic() - started
    if received < 3 or not 1 <= elapsed <= seconds + 1.5:
        raise RuntimeError("ESTABLISHED_STREAM_DID_NOT_EXPIRE")
    return {"receivedBeforeExpiry": received, "elapsedSeconds": round(elapsed, 3)}


def isolated_suite(directory):
    isolation_guard()
    spec = importlib.util.spec_from_file_location("eos_network_policy", ROOT / "runtime/network/policy.py")
    policy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(policy)
    policy.LEASE_FILE = str(directory / "dhcp.leases")
    processes, tests = [], []
    namespaces = {"router": os.getpid()}

    def record(name, details=None):
        tests.append({"name": name, "status": "PASS", **({"details": details} if details else {})})

    def spawn(args, ready=False):
        isolation_guard()
        child = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        processes.append(child)
        if ready:
            if not select.select([child.stdout], [], [], 5)[0] or child.stdout.readline().strip() != "READY":
                raise RuntimeError("FIXTURE_PROCESS_NOT_READY")
        return child

    def ns_command(pid, *args):
        return execute(in_namespace(pid, list(args)))

    def helper(pid, *args, timeout=20):
        result = execute(in_namespace(pid, [sys.executable, SELF, *args]), timeout=timeout)
        return json.loads(result.stdout)

    def expect_probe(pid, address, port, allowed, name):
        result = helper(pid, "--probe", address, str(port))
        if result["connected"] is not allowed:
            raise RuntimeError(name + "_FAILED")
        record(name)

    def expect_dns(pid, allowed, name):
        result = helper(pid, "--dns-probe")
        if result["answered"] is not allowed:
            raise RuntimeError(name + "_FAILED")
        record(name)

    def apply_policy(config, inventory, grants=None, replace=False):
        rules = policy.render_nftables(config, inventory, grants, replace=replace)
        execute(["nft", "--check", "-f", "-"], input_text=rules)
        execute(["nft", "-f", "-"], input_text=rules)

    def start_dhcp(config):
        path = directory / "dnsmasq.conf"
        path.write_text(policy.render_dnsmasq(config))
        execute(["dnsmasq", "--test", "--conf-file=" + str(path)])
        child = spawn(["dnsmasq", "--keep-in-foreground", "--user=root", "--group=root",
                       "--pid-file=" + str(directory / "dnsmasq.pid"), "--log-facility=-",
                       "--conf-file=" + str(path)])
        # Readiness is a real DHCP exchange below; this bounded delay only lets
        # the process bind its socket before sending the first broadcast.
        time.sleep(0.15)
        if child.poll() is not None:
            raise RuntimeError("DNSMASQ_START_FAILED")
        return child

    try:
        execute(["ip", "link", "set", "lo", "up"])
        tech = spawn(["unshare", "--net", "--", sys.executable, SELF, "--hold"], ready=True)
        up = spawn(["unshare", "--net", "--", sys.executable, SELF, "--hold"], ready=True)
        namespaces.update(technical=tech.pid, uplink=up.pid)
        for router_name, peer_name, child, router_mac, peer_mac in (
                ("tech0", "dev0", tech, ROUTER_MAC, TECH_MAC),
                ("wan0", "up0", up, UPLINK_MAC, "02:00:00:00:50:01")):
            execute(["ip", "link", "add", router_name, "type", "veth", "peer", "name", peer_name])
            execute(["ip", "link", "set", peer_name, "netns", str(child.pid)])
            execute(["ip", "link", "set", router_name, "address", router_mac, "up"])
            ns_command(child.pid, "ip", "link", "set", "lo", "up")
            ns_command(child.pid, "ip", "link", "set", peer_name, "address", peer_mac, "up")
        for device, addr in (("tech0", "192.168.77.1/24"), ("wan0", "192.168.50.2/24"),
                             ("tech0", "fd77::1/64"), ("wan0", "fd50::2/64")):
            execute(["ip", "addr", "add", addr, "dev", device, "nodad"] if ":" in addr
                    else ["ip", "addr", "add", addr, "dev", device])
        execute(["ip", "route", "add", "default", "via", "192.168.50.1", "dev", "wan0"])
        execute(["ip", "-6", "route", "add", "default", "via", "fd50::1", "dev", "wan0"])
        for path in ("/proc/sys/net/ipv4/ip_forward", "/proc/sys/net/ipv6/conf/all/forwarding"):
            isolation_guard()
            Path(path).write_text("1\n")
        for child, device, addresses in (
                (tech, "dev0", ["192.168.77.20/24", "fd77::20/64"]),
                (up, "up0", ["192.168.50.1/24", "fd50::1/64"])):
            for addr in addresses:
                args = ["ip", "addr", "add", addr, "dev", device] + (["nodad"] if ":" in addr else [])
                ns_command(child.pid, *args)
        ns_command(tech.pid, "ip", "route", "add", "default", "via", "192.168.77.1")
        ns_command(tech.pid, "ip", "-6", "route", "add", "default", "via", "fd77::1")
        ns_command(up.pid, "ip", "route", "add", "192.168.77.0/24", "via", "192.168.50.2")
        ns_command(up.pid, "ip", "-6", "route", "add", "fd77::/64", "via", "fd50::2")
        for addr in (PUBLIC + "/32", "192.168.50.100/32", "1.1.1.1/32", PUBLIC6 + "/128"):
            ns_command(up.pid, "ip", "addr", "add", addr, "dev", "lo", *(["nodad"] if ":" in addr else []))
        for child, addr, port in ((up, PUBLIC, 18080), (up, PUBLIC6, 18080),
                                  (up, "192.168.50.100", 18080), (tech, "0.0.0.0", 1502)):
            spawn(in_namespace(child.pid, [sys.executable, SELF, "--echo", addr, str(port)]), ready=True)
        spawn([sys.executable, SELF, "--echo", "0.0.0.0", "8188"], ready=True)
        spawn([sys.executable, SELF, "--echo", "0.0.0.0", "1883"], ready=True)
        spawn(in_namespace(up.pid, [sys.executable, SELF, "--dns-server"]), ready=True)
        # These real positive controls must succeed before loading any policy.
        # Negative assertions and the grant expiry check below remain one-shot.
        for address, name in ((PUBLIC, "fixture_ipv4_route_positive"),
                              (PUBLIC6, "fixture_ipv6_route_positive"),
                              ("192.168.50.100", "fixture_customer_route_positive")):
            record(name, wait_for_fixture(
                lambda remaining: helper(tech.pid, "--probe", address, "18080", timeout=remaining),
                "connected", name))
        record("fixture_dns_route_positive", wait_for_fixture(
            lambda remaining: helper(tech.pid, "--dns-probe", timeout=remaining),
            "answered", "fixture_dns_route_positive"))

        ifindices = {row["ifname"]: row["ifindex"] for row in json.loads(execute(["ip", "-j", "link", "show"]).stdout)}
        config = {"interface": "tech0", "mac": ROUTER_MAC, "address": "192.168.77.1", "prefixLength": 24,
                  "dhcpStart": "192.168.77.20", "dhcpEnd": "192.168.77.200", "dnsServers": ["1.1.1.1"],
                  "reservations": [], "listeners": [{"protocol": "tcp", "port": 1883}]}
        inventory = {"uplink": "wan0", "managementInterfaces": ["wan0"], "interfaces": [
            {"name": "tech0", "mac": ROUTER_MAC, "permanentMac": ROUTER_MAC, "ifindex": ifindices["tech0"],
             "kind": "ether", "managed": "eos", "defaultRoute": False, "master": None,
             "addresses": [{"address": "192.168.77.1", "prefixLength": 24}]},
            {"name": "wan0", "mac": UPLINK_MAC, "ifindex": ifindices["wan0"], "kind": "ether", "managed": True,
             "defaultRoute": True, "master": None, "addresses": [{"address": "192.168.50.2", "prefixLength": 24}]}],
            "routes": [{"destination": "192.168.77.0/24", "interface": "tech0"},
                       {"destination": "192.168.50.0/24", "interface": "wan0"},
                       {"destination": "default", "interface": "wan0"}]}
        # Earlier unrelated accepts must not bypass the EOS guard's later drops.
        execute(["nft", "-f", "-"], input_text="""table inet eos_test_unrelated {
    chain forward {
        type filter hook forward priority -20; policy accept;
        ct state established,related accept
    }
}
""")
        apply_policy(config, inventory)
        expect_probe(tech.pid, PUBLIC, 18080, False, "internet_closed_initially")
        expect_dns(tech.pid, False, "dns_closed_initially")
        expect_probe(tech.pid, PUBLIC6, 18080, False, "ipv6_forwarding_blocked")
        expect_probe(tech.pid, "192.168.77.1", 8188, False, "technical_admin_blocked")
        expect_probe(up.pid, "192.168.50.2", 8188, True, "management_admin_preserved")
        expect_probe(tech.pid, "192.168.77.1", 1883, True, "explicit_device_listener_allowed")
        if not connect("192.168.77.20", 1502):
            raise RuntimeError("EOS_INITIATED_DEVICE_CONNECTION_BROKEN")
        record("eos_initiated_device_connection_preserved")

        ns_command(tech.pid, "ip", "addr", "del", "192.168.77.20/24", "dev", "dev0")
        dhcp = start_dhcp(config)
        lease = helper(tech.pid, "--dhcp", "dev0", TECH_MAC, "yes", "initial")
        if lease["router"] != config["address"] or lease["dns"] != "1.1.1.1":
            raise RuntimeError("DHCP_OPTIONS_WRONG")
        record("technical_dhcp_dora_and_explicit_options", lease)
        helper(up.pid, "--dhcp", "up0", "02:00:00:00:50:01", "no", "management")
        record("management_receives_no_dhcp_offer")
        dhcp.terminate()
        dhcp.wait(timeout=3)
        config["reservations"] = [{"mac": TECH_MAC, "ip": lease["ip"]}]
        # Remove dynamic state to prove assignment comes from the reservation.
        Path(policy.LEASE_FILE).write_text("")
        dhcp = start_dhcp(config)
        second = helper(tech.pid, "--dhcp", "dev0", TECH_MAC, "yes", "changed-client-id")
        if second["ip"] != lease["ip"]:
            raise RuntimeError("MAC_RESERVATION_NOT_PRESERVED")
        observed = policy.parse_leases(Path(policy.LEASE_FILE).read_text(), time.time(), config)
        if not any(row["mac"] == TECH_MAC and row["ip"] == lease["ip"] and row["reserved"] for row in observed):
            raise RuntimeError("RESERVATION_LEASE_READBACK_MISSING")
        record("reservation_survives_daemon_restart_and_changed_client_id")
        ns_command(tech.pid, "ip", "addr", "add", lease["ip"] + "/24", "dev", "dev0")
        ns_command(tech.pid, "ip", "route", "replace", "default", "via", "192.168.77.1")
        grants = [{"mac": TECH_MAC, "ip": lease["ip"], "remainingSeconds": 10}]
        apply_policy(config, inventory, grants, replace=True)
        expect_probe(tech.pid, "192.168.50.100", 18080, False, "customer_lan_blocked_during_grant")
        expect_probe(tech.pid, PUBLIC6, 18080, False, "ipv6_blocked_during_ipv4_grant")
        expect_dns(tech.pid, True, "dns_forwarded_during_grant")
        result = helper(tech.pid, "--stream", PUBLIC, "18080", "10")
        record("established_tcp_stream_expires_in_kernel", result)
        expect_probe(tech.pid, PUBLIC, 18080, False, "new_connections_blocked_after_expiry")
        expect_dns(tech.pid, False, "dns_blocked_after_expiry")
        apply_policy(config, inventory, grants, replace=True)
        ns_command(tech.pid, "ip", "link", "set", "dev0", "address", "02:00:00:00:77:99")
        expect_probe(tech.pid, PUBLIC, 18080, False, "wrong_mac_cannot_use_ip_grant")
        ns_command(tech.pid, "ip", "link", "set", "dev0", "address", TECH_MAC)
        apply_policy(config, inventory, [], replace=True)
        expect_probe(tech.pid, PUBLIC, 18080, False, "reload_without_grants_is_closed")
        execute(["nft", "list", "table", "inet", "eos_test_unrelated"])
        record("unrelated_firewall_table_preserved")
        versions = {tool: execute([tool, "--version"]).stdout.splitlines()[0] for tool in ("nft", "dnsmasq")}
        return {"status": "PASS", "scope": "isolated Linux network namespaces; no systemd or Pi acceptance",
                "tests": tests, "versions": versions, "hostNamespaceUntouched": True}
    except Exception as error:
        detail = str(error)
        if isinstance(error, subprocess.CalledProcessError):
            detail = (error.stderr or error.stdout or str(error))[:2000]
        failure = {"status": "FAIL", "tests": tests, "error": detail, "hostNamespaceUntouched": True}
        if isinstance(error, FixtureReadinessError):
            failure["failedProbe"] = error.details
        try:
            failure["diagnostics"] = failure_diagnostics(namespaces)
        except Exception as diagnostic_error:
            failure["diagnosticError"] = type(diagnostic_error).__name__
        return failure
    finally:
        for child in reversed(processes):
            if child.poll() is None:
                child.terminate()
        for child in reversed(processes):
            try:
                child.wait(timeout=2)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--require", action="store_true", help="Treat missing test capabilities as failure")
    parser.add_argument("--isolated", metavar="TEMP_DIR", help=argparse.SUPPRESS)
    parser.add_argument("--hold", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--echo", nargs=2, help=argparse.SUPPRESS)
    parser.add_argument("--probe", nargs=2, help=argparse.SUPPRESS)
    parser.add_argument("--stream", nargs=3, help=argparse.SUPPRESS)
    parser.add_argument("--dhcp", nargs=4, help=argparse.SUPPRESS)
    parser.add_argument("--dns-server", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--dns-probe", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if any((args.isolated, args.hold, args.echo, args.probe, args.stream, args.dhcp, args.dns_server, args.dns_probe)):
        isolation_guard()
        if args.hold:
            print("READY", flush=True)
            time.sleep(180)
        elif args.echo:
            echo_server(args.echo[0], int(args.echo[1]))
        elif args.probe:
            emit(connection_probe(args.probe[0], int(args.probe[1])))
        elif args.stream:
            emit(stream_expiry(args.stream[0], int(args.stream[1]), int(args.stream[2])))
        elif args.dhcp:
            emit(dhcp_exchange(args.dhcp[0], args.dhcp[1], args.dhcp[2] == "yes", args.dhcp[3]))
        elif args.dns_server:
            dns_server()
        elif args.dns_probe:
            emit({"answered": dns_probe()})
        else:
            result = isolated_suite(Path(args.isolated))
            emit(result)
            return 0 if result["status"] == "PASS" else 1
        return 0

    missing = [name for name in ("ip", "nft", "dnsmasq", "unshare", "nsenter") if not shutil.which(name)]
    reason = "DISPOSABLE_ENV_MARKER_REQUIRED" if os.environ.get("EOS_NETWORK_NAMESPACE_TEST") != "disposable" else None
    if sys.platform != "linux" or os.geteuid() != 0:
        reason = "LINUX_ROOT_REQUIRED"
    if missing:
        reason = "MISSING_TOOLS"
    if reason is None:
        capability = subprocess.run(["unshare", "--net", "--", "true"], capture_output=True, text=True)
        if capability.returncode:
            reason = "NETWORK_NAMESPACE_CAPABILITY_UNAVAILABLE"
    if reason:
        emit({"status": "SKIP", "reason": reason, "missingTools": missing,
              "tests": [], "hardwareAcceptance": "OPEN"})
        return 1 if args.require else 77
    with tempfile.TemporaryDirectory(prefix="eos-network-native-") as temp:
        directory = Path(temp)
        marker = directory / "isolation.json"
        marker.write_text(json.dumps({"wrapperPid": os.getpid(), "networkNamespace": namespace_inode()}))
        os.chmod(marker, 0o600)
        environment = {**os.environ, "EOS_NETWORK_TEST_MARKER": str(marker)}
        child = subprocess.Popen(["unshare", "--net", "--", sys.executable, SELF, "--isolated", temp],
                                 env=environment, start_new_session=True)
        try:
            return child.wait(timeout=150)
        except subprocess.TimeoutExpired:
            emit({"status": "FAIL", "error": "NAMESPACE_SUITE_DEADLINE", "tests": []})
            return 1
        finally:
            # A new session/process group contains only this disposable test.
            # Also reap children if the orchestrator crashes before its finally.
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            child.wait(timeout=3)


if __name__ == "__main__":
    raise SystemExit(main())
