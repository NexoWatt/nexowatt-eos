#!/usr/bin/python3
"""Restricted host implementation for the optional EOS technical network.

No caller-controlled executable, pathname, shell text, firewall expression or
service name is accepted. The public interface is dispatch(); dependencies are
injectable only to allow isolated, non-privileged regression tests.
"""
from __future__ import annotations

import contextlib
import fcntl
import importlib.util
import ipaddress
import json
import math
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys
import time

_spec = importlib.util.spec_from_file_location("eos_network_policy", Path(__file__).with_name("policy.py"))
policy = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(policy)

MAX_JSON = 65536
DHCP_SERVICE = "nexowatt-eos-network-dhcp.service"
TABLE_COMMENT = "NexoWatt EOS technical network v1"
IFACE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,14}$")
MAC = re.compile(r"^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$")
SYSCTLS = frozenset(("forwarding", "disable_ipv6", "accept_redirects", "send_redirects", "accept_source_route"))


class NetworkError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def fail(code):
    raise NetworkError(code)


def exact(value, required, optional=()):
    if not isinstance(value, dict) or set(value) - set(required) - set(optional) or set(required) - set(value):
        fail("NETWORK_REQUEST_INVALID")


def command(argv, *, input=None, timeout=3):
    """Only fixed executable calls supplied by this module reach this function."""
    try:
        result = subprocess.run(argv, input=input, capture_output=True, text=True,
                                timeout=timeout, check=False,
                                env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LC_ALL": "C"})
    except (OSError, subprocess.TimeoutExpired):
        fail("NETWORK_HOST_COMMAND_FAILED")
    if len(result.stdout) + len(result.stderr) > 2 * 1024 * 1024:
        fail("NETWORK_HOST_OUTPUT_TOO_LARGE")
    return result


class Paths:
    def __init__(self, root="/"):
        self.root = Path(root)
        self.config = self.root / "etc/nexowatt-eos-network"
        self.state = self.root / "var/lib/nexowatt-eos-network"
        self.run = self.root / "run/nexowatt-eos-network"
        self.leases = self.root / "var/lib/nexowatt-eos-dhcp/leases"

    def at(self, path):
        return self.root / path.lstrip("/")


def _check_path(path, *, file=False, private=True):
    for parent in reversed(path.parents):
        if not parent.exists():
            continue
        st = parent.lstat()
        if stat.S_ISLNK(st.st_mode) or not stat.S_ISDIR(st.st_mode) or st.st_uid != 0 or st.st_mode & 0o022:
            fail("NETWORK_UNSAFE_PATH")
    if path.exists() or path.is_symlink():
        st = path.lstat()
        if stat.S_ISLNK(st.st_mode) or st.st_uid != 0 or st.st_mode & (0o077 if private else 0o022):
            fail("NETWORK_UNSAFE_PATH")
        if file and not stat.S_ISREG(st.st_mode):
            fail("NETWORK_UNSAFE_PATH")


def atomic_write(path, content, mode=0o600):
    _check_path(path, file=True, private=(mode == 0o600))
    temp = path.with_name(f".{path.name}.{secrets.token_hex(12)}")
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, "wb") as handle:
            handle.write(content.encode() if isinstance(content, str) else content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, path)
        dfd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(dfd)
        finally:
            os.close(dfd)
    finally:
        with contextlib.suppress(FileNotFoundError):
            temp.unlink()


class HostManager:
    def __init__(self, *, paths=None, executor=command, clock=time.monotonic,
                 wall=time.time, inventory=None):
        self.paths = paths or Paths()
        self.execute = executor
        self.clock, self.wall = clock, wall
        self.inventory_provider = inventory
        self.grants = []  # monotonic deadlines; deliberately NEVER serialized
        self.pending_deadline = None
        self.last_fault = None

    def run(self, argv, **kwargs):
        result = self.execute(argv, **kwargs)
        if result.returncode:
            fail("NETWORK_HOST_COMMAND_FAILED")
        return result.stdout

    def _json_command(self, argv, **kwargs):
        try:
            value = json.loads(self.run(argv, **kwargs))
            if not isinstance(value, list) or len(value) > 4096:
                fail("NETWORK_HOST_INVENTORY_INVALID")
            return value
        except (ValueError, TypeError):
            fail("NETWORK_HOST_INVENTORY_INVALID")

    @contextlib.contextmanager
    def lock(self):
        _check_path(self.paths.state, private=True)
        lock = self.paths.state / "control.lock"
        _check_path(lock, file=True)
        fd = os.open(lock, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        try:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                fail("NETWORK_BUSY")
            yield
        finally:
            os.close(fd)

    def read_state(self):
        path = self.paths.state / "state.json"
        if not path.exists():
            return {"version": 1, "confirmed": None, "pending": None, "baseline": None, "topology": None, "fault": None}
        _check_path(path, file=True)
        data = path.read_bytes()
        if len(data) > MAX_JSON:
            fail("NETWORK_STATE_INVALID")
        try:
            value = json.loads(data)
        except ValueError:
            fail("NETWORK_STATE_INVALID")
        exact(value, ["version", "confirmed", "pending", "baseline", "topology", "fault"])
        if value["version"] != 1:
            fail("NETWORK_STATE_INVALID")
        return value

    def save_state(self, state):
        atomic_write(self.paths.state / "state.json", json.dumps(state, separators=(",", ":")) + "\n")

    def inventory(self, config=None):
        if self.inventory_provider:
            return self.inventory_provider(config)
        deadline = self.clock() + 4
        def budget(maximum=3):
            remaining = deadline - self.clock()
            if remaining <= 0:
                fail("NETWORK_INVENTORY_TIMEOUT")
            return min(maximum, remaining)
        addresses = self._json_command(["/usr/sbin/ip", "-j", "address", "show"], timeout=budget())
        routes = self._json_command(["/usr/sbin/ip", "-j", "-4", "route", "show", "table", "all"], timeout=budget())
        if len(addresses) > 128 or len(routes) > 2048:
            fail("NETWORK_HOST_INVENTORY_TOO_LARGE")
        defaults = [r for r in routes if r.get("dst") == "default" and r.get("type", "unicast") == "unicast" and r.get("table", "main") == "main"]
        uplinks = {r.get("dev") for r in defaults if isinstance(r.get("dev"), str)}
        uplink = next(iter(uplinks)) if len(uplinks) == 1 else None
        nm_status = self.execute(["/usr/bin/systemctl", "is-active", "--quiet", "NetworkManager.service"], timeout=budget(1))
        if nm_status.returncode not in (0, 3, 4) or nm_status.stderr.strip():
            fail("NETWORK_MANAGER_INSPECTION_FAILED")
        nm_running = nm_status.returncode == 0
        interfaces = []
        for item in addresses:
            budget()
            name = item.get("ifname", "")
            if not IFACE.fullmatch(name):
                continue
            mac = str(item.get("address", "")).lower()
            perm = str(item.get("permaddr", mac)).lower()
            kind = item.get("link_type", "unknown")
            if item.get("linkinfo", {}).get("info_kind"):
                kind = item["linkinfo"]["info_kind"]
            # A hardware-backed Ethernet NIC is required. Virtual/veth/tun and
            # unidentified devices cannot become a new privileged gateway.
            if not self.paths.at(f"/sys/class/net/{name}/device").exists():
                kind = "virtual"
            managed = False
            link_file = self.paths.at(f"/run/systemd/netif/links/{item.get('ifindex', 0)}")
            if link_file.is_file():
                content = link_file.read_text()[:65536]
                if re.search(r"^NETWORK_FILE=.+", content, re.M) or re.search(r"^ADMIN_STATE=(?!unmanaged$).+", content, re.M):
                    managed = "networkd"
            if nm_running:
                if not self.paths.at("/usr/bin/nmcli").is_file():
                    managed = "unknown-networkmanager"
                else:
                    result = self.execute(["/usr/bin/nmcli", "-g", "GENERAL.STATE", "device", "show", name], timeout=budget(1))
                    if result.returncode or not result.stdout.startswith("10 "):
                        managed = "networkmanager"
            ip_addresses = [{"address": a.get("local"), "prefixLength": a.get("prefixlen")}
                            for a in item.get("addr_info", []) if a.get("family") == "inet"]
            if config and config.get("interface") == name and config.get("mac") == perm and not managed:
                # Only already-validated root-owned journal entries can account
                # for an address during a partially completed subnet change.
                state = self.read_state()
                owned = [state.get("confirmed"), state.get("pending", {}).get("candidate") if state.get("pending") else None]
                allowed = {c["address"] for c in owned if c and c["interface"] == name and c["mac"] == perm}
                if all(a["address"] in allowed and a["prefixLength"] == 24 for a in ip_addresses):
                    managed = "eos"
            has_ipv6_global = any(a.get("family") == "inet6" and a.get("scope") == "global" for a in item.get("addr_info", []))
            interfaces.append({"name": name, "mac": mac, "permanentMac": perm,
                               "kind": kind, "master": item.get("master"), "managed": managed,
                               "addresses": ip_addresses, "defaultRoute": name in uplinks,
                               "ifindex": item.get("ifindex"), "up": "UP" in item.get("flags", []),
                               "hasGlobalIPv6": has_ipv6_global})
        route_data = []
        for r in routes:
            dst = r.get("dst")
            if dst and dst != "default" and r.get("type", "unicast") == "unicast":
                try:
                    route_data.append({"destination": str(ipaddress.IPv4Network(dst, strict=False)), "interface": r.get("dev")})
                except ValueError:
                    fail("NETWORK_HOST_INVENTORY_INVALID")
        return {"interfaces": interfaces, "routes": route_data, "uplink": uplink,
                "managementInterfaces": list(uplinks)}

    def validate(self, config, inventory):
        try:
            result = policy.validate_config(config, inventory)
        except Exception as exc:
            code = getattr(exc, "code", None) or str(exc)
            if not isinstance(code, str) or not re.fullmatch(r"[A-Z][A-Z0-9_]{2,80}", code):
                code = "NETWORK_CONFIG_INVALID"
            fail(code)
        chosen = next((i for i in inventory["interfaces"] if i["name"] == config["interface"]), None)
        if not chosen or chosen.get("hasGlobalIPv6"):
            fail("NETWORK_INTERFACE_IN_USE")
        return result if isinstance(result, dict) else config

    def _table_exists(self):
        result = self.execute(["/usr/sbin/nft", "-j", "list", "table", "inet", "eos_technical"])
        if result.returncode:
            if result.returncode == 1 and "No such file or directory" in result.stderr:
                return False
            fail("NETWORK_FIREWALL_INSPECTION_FAILED")
        try:
            records = json.loads(result.stdout)["nftables"]
            tables = [r["table"] for r in records if "table" in r]
            if len(tables) != 1 or tables[0].get("comment") != TABLE_COMMENT:
                fail("NETWORK_FIREWALL_TABLE_NOT_OWNED")
        except (ValueError, KeyError, TypeError):
            fail("NETWORK_FIREWALL_INSPECTION_FAILED")
        return True

    def _remaining_grants(self):
        now = self.clock()
        self.grants = [g for g in self.grants if int(g["deadline"] - now) > 0]
        return [{"mac": g["mac"], "ip": g["ip"], "remainingSeconds": int(g["deadline"] - now)} for g in self.grants]

    def firewall(self, config, inventory, *, closed=False):
        exists = self._table_exists()
        grants = [] if closed else self._remaining_grants()
        script = policy.render_nftables(config, inventory, grants, replace=exists)
        self.run(["/usr/sbin/nft", "--check", "--file", "-"], input=script)
        # Recalculate after checking; reserve the full bounded application
        # command budget so a queued/repeated apply cannot prolong a grant.
        grants = [] if closed else [{**g, "remainingSeconds": g["remainingSeconds"] - 3}
                                    for g in self._remaining_grants() if g["remainingSeconds"] > 3]
        script = policy.render_nftables(config, inventory, grants, replace=exists)
        self.run(["/usr/sbin/nft", "--file", "-"], input=script)

    def _read_sysctl(self, interface, name):
        if not IFACE.fullmatch(interface) or name not in SYSCTLS:
            fail("NETWORK_INTERFACE_INVALID")
        family = "ipv6" if name == "disable_ipv6" else "ipv4"
        value = self.paths.at(f"/proc/sys/net/{family}/conf/{interface}/{name}").read_text().strip()
        if value not in ("0", "1"):
            fail("NETWORK_HOST_INVENTORY_INVALID")
        return value

    def _write_sysctl(self, interface, name, value):
        if not IFACE.fullmatch(interface) or name not in SYSCTLS or str(value) not in ("0", "1"):
            fail("NETWORK_INTERFACE_INVALID")
        family = "ipv6" if name == "disable_ipv6" else "ipv4"
        self.paths.at(f"/proc/sys/net/{family}/conf/{interface}/{name}").write_text(str(value) + "\n")

    def _topology(self, config, inventory):
        uplink = next((i for i in inventory["interfaces"] if i["name"] == inventory["uplink"]), None)
        chosen = next((i for i in inventory["interfaces"] if i["name"] == config["interface"]), None)
        if not uplink or not chosen or not MAC.fullmatch(uplink.get("mac", "")):
            fail("NETWORK_UPLINK_UNAVAILABLE")
        return {"uplink": uplink["name"], "uplinkMac": uplink["mac"],
                "interface": chosen["name"], "mac": chosen["permanentMac"],
                "interfaceIndex": chosen["ifindex"], "uplinkIndex": uplink["ifindex"],
                "protectedRoutes": sorted([r["destination"], r.get("interface") or ""] for r in inventory.get("routes", []) if r.get("interface") != config["interface"]),
                "protectedAddresses": sorted([i["name"], a["address"], a["prefixLength"]] for i in inventory["interfaces"] if i["name"] != config["interface"] for a in i.get("addresses", []))}

    @staticmethod
    def _same_identity(previous, current):
        return previous is not None and all(previous[key] == current[key] for key in ("uplink", "uplinkMac", "interface", "mac"))

    def _baseline(self, config, inventory):
        chosen = next(i for i in inventory["interfaces"] if i["name"] == config["interface"])
        if chosen.get("addresses"):
            fail("NETWORK_INTERFACE_IN_USE")
        return {"interface": config["interface"], "mac": config["mac"], "up": bool(chosen.get("up")),
                "forwarding": self._read_sysctl(config["interface"], "forwarding"),
                "disableIPv6": self._read_sysctl(config["interface"], "disable_ipv6"),
                "acceptRedirects": self._read_sysctl(config["interface"], "accept_redirects"),
                "sendRedirects": self._read_sysctl(config["interface"], "send_redirects"),
                "acceptSourceRoute": self._read_sysctl(config["interface"], "accept_source_route"),
                "uplink": inventory["uplink"], "uplinkForwarding": self._read_sysctl(inventory["uplink"], "forwarding")}

    def _effective_inventory(self, state, inventory):
        value = dict(inventory)
        value["uplinkForwardingWasDisabled"] = bool(state.get("baseline") and state["baseline"]["uplinkForwarding"] == "0")
        return value

    def _apply_os(self, config, old, state, *, restore=False):
        inventory = self.inventory(old or config)
        config = self.validate(config, inventory)
        current_topology = self._topology(config, inventory)
        if not self._same_identity(state["topology"], current_topology):
            fail("NETWORK_TOPOLOGY_CHANGED")
        inventory = self._effective_inventory(state, inventory)
        # Firewall goes first, including when restoring after an interrupted apply.
        self.firewall(config, inventory, closed=True)
        self.run(["/usr/bin/systemctl", "stop", DHCP_SERVICE])
        self._write_sysctl(config["interface"], "disable_ipv6", "1")
        for name in ("accept_redirects", "send_redirects", "accept_source_route"):
            self._write_sysctl(config["interface"], name, "0")
        current = next(i for i in inventory["interfaces"] if i["name"] == config["interface"])
        if old and old["address"] != config["address"] and any(a["address"] == old["address"] and a["prefixLength"] == 24 for a in current.get("addresses", [])):
            self.run(["/usr/sbin/ip", "address", "del", f"{old['address']}/24", "dev", old["interface"]])
        if not any(a["address"] == config["address"] and a["prefixLength"] == 24 for a in current.get("addresses", [])):
            self.run(["/usr/sbin/ip", "address", "add", f"{config['address']}/24", "dev", config["interface"]])
        self.run(["/usr/sbin/ip", "link", "set", "dev", config["interface"], "up"])
        self._write_sysctl(config["interface"], "forwarding", "1")
        self._write_sysctl(inventory["uplink"], "forwarding", "1")
        content = policy.render_dnsmasq(config)
        atomic_write(self.paths.run / "dhcp.conf", content, 0o644)
        self.run(["/usr/sbin/dnsmasq", "--test", f"--conf-file={self.paths.run / 'dhcp.conf'}"])
        self.run(["/usr/bin/systemctl", "start", DHCP_SERVICE])
        self.grants = []
        state["topology"] = current_topology
        state["fault"] = None
        self.last_fault = None
        self.save_state(state)

    def _restore_empty(self, candidate, state):
        self.run(["/usr/bin/systemctl", "stop", DHCP_SERVICE])
        baseline = state["baseline"]
        inventory = self.inventory(candidate)
        actual = next((i for i in inventory["interfaces"] if i["name"] == candidate["interface"]), None)
        # Never mutate a replacement NIC that inherited the same name.
        if actual and actual.get("permanentMac") == candidate["mac"]:
            if any(a.get("address") == candidate["address"] and a.get("prefixLength") == 24 for a in actual.get("addresses", [])):
                self.run(["/usr/sbin/ip", "address", "del", f"{candidate['address']}/24", "dev", candidate["interface"]])
            self._write_sysctl(candidate["interface"], "forwarding", baseline["forwarding"])
            self._write_sysctl(candidate["interface"], "disable_ipv6", baseline["disableIPv6"])
            for name, key in (("accept_redirects", "acceptRedirects"), ("send_redirects", "sendRedirects"), ("accept_source_route", "acceptSourceRoute")):
                self._write_sysctl(candidate["interface"], name, baseline[key])
            if not baseline["up"]:
                self.run(["/usr/sbin/ip", "link", "set", "dev", candidate["interface"], "down"])
        uplink = next((i for i in inventory["interfaces"] if i["name"] == baseline["uplink"]), None)
        if uplink and uplink.get("mac") == state["topology"]["uplinkMac"]:
            self._write_sysctl(baseline["uplink"], "forwarding", baseline["uplinkForwarding"])
        # Keep the closed table if restoration fails earlier. Remove only our
        # authenticated table after forwarding has returned to its old state.
        if self._table_exists():
            self.run(["/usr/sbin/nft", "delete", "table", "inet", "eos_technical"])
        with contextlib.suppress(FileNotFoundError):
            (self.paths.run / "dhcp.conf").unlink()

    def rollback(self, state):
        pending = state.get("pending")
        if not pending:
            return
        self.grants = []
        if state["confirmed"]:
            self._apply_os(state["confirmed"], pending["candidate"], state, restore=True)
        else:
            self._restore_empty(pending["candidate"], state)
            state["baseline"] = state["topology"] = None
        state["pending"] = None
        state["fault"] = None
        self.last_fault = None
        self.pending_deadline = None
        self.save_state(state)

    def bootstrap(self):
        with self.lock():
            state = self.read_state()
            self.grants = []
            if state["pending"]:
                self.rollback(state)
            if state["confirmed"]:
                self._apply_os(state["confirmed"], state["confirmed"], state, restore=True)

    def quarantine(self, state, code):
        """Close the kernel grants before relying on daemon/UI availability."""
        self.grants = []
        state["fault"] = code
        self.last_fault = code
        self.save_state(state)
        first_error = None
        try:
            if self._table_exists():
                script = "flush set inet eos_technical internet_clients\nflush set inet eos_technical internet_return\n"
                self.run(["/usr/sbin/nft", "--check", "--file", "-"], input=script)
                self.run(["/usr/sbin/nft", "--file", "-"], input=script)
        except Exception as exc:
            first_error = exc
        try:
            self.run(["/usr/bin/systemctl", "stop", DHCP_SERVICE])
        except Exception as exc:
            first_error = first_error or exc
        if first_error:
            raise first_error

    def emergency_close(self, state, code):
        """Boot-only recovery: prove technical traffic closed before app startup.

        A fresh inventory must prove the name is not now a management port.
        Missing technical hardware can remain denied by name, but a replacement
        or reassigned interface is never modified from a stale saved binding.
        """
        config = state["pending"]["candidate"] if state.get("pending") else state.get("confirmed")
        if not config:
            fail("NETWORK_BOOT_RECOVERY_REQUIRED")
        config = policy.validate_config(config)
        tech = config["interface"]
        topology = state.get("topology")
        if not topology or topology.get("interface") != tech or topology.get("mac") != config["mac"] or topology.get("uplink") == tech:
            fail("NETWORK_STATE_INVALID")
        inventory = self.inventory()
        current = next((i for i in inventory["interfaces"] if i["name"] == tech), None)
        if tech == inventory.get("uplink") or tech in inventory.get("managementInterfaces", []):
            fail("NETWORK_MANAGEMENT_INTERFACE_PROTECTED")
        if current and (current.get("defaultRoute") or current.get("master") or current.get("kind") != "ether" or
                        current.get("mac") != config["mac"] or current.get("permanentMac") != config["mac"] or
                        current.get("managed") not in (False, "eos")):
            fail("NETWORK_EMERGENCY_IDENTITY_UNPROVEN")
        owned_configs = [state.get("confirmed"), state["pending"]["candidate"] if state.get("pending") else None]
        owned_addresses = {item["address"] for item in owned_configs
                           if item and item["interface"] == tech and item["mac"] == config["mac"]}
        if current and (current.get("hasGlobalIPv6") or any(
                address.get("address") not in owned_addresses or address.get("prefixLength") != 24
                for address in current.get("addresses", []))):
            fail("NETWORK_EMERGENCY_IDENTITY_UNPROVEN")
        exists = self._table_exists()
        script = ("delete table inet eos_technical\n" if exists else "") + f'''table inet eos_technical {{
  comment "{TABLE_COMMENT}"
  set internet_clients {{ type ipv4_addr . ether_addr; flags timeout; }}
  set internet_return {{ type ipv4_addr; flags timeout; }}
  chain input {{ type filter hook input priority -10; policy accept; iifname "{tech}" drop; }}
  chain forward {{ type filter hook forward priority -10; policy accept; iifname "{tech}" drop; oifname "{tech}" drop; }}
  chain output {{ type filter hook output priority -10; policy accept; oifname "{tech}" drop; }}
}}
'''
        self.run(["/usr/sbin/nft", "--check", "--file", "-"], input=script)
        self.run(["/usr/sbin/nft", "--file", "-"], input=script)
        self.run(["/usr/bin/systemctl", "stop", DHCP_SERVICE])
        self.grants = []
        state["fault"] = code
        self.last_fault = code
        self.save_state(state)

    def guard(self, *, force_pending=False):
        with self.lock():
            state = self.read_state()
            pending = state.get("pending")
            if pending and (force_pending or self.wall() >= pending["expiresAt"] or
                            self.clock() >= pending["expiresMonotonic"] or
                            self._boot_id() != pending["bootId"]):
                self.rollback(state)
                return {"rolledBack": True}
            config = pending["candidate"] if pending else state["confirmed"]
            if config:
                try:
                    inventory = self.inventory(config)
                    self.validate(config, inventory)
                    if self._topology(config, inventory) != state["topology"]:
                        fail("NETWORK_TOPOLOGY_CHANGED")
                except Exception:
                    self.quarantine(state, "NETWORK_TOPOLOGY_CHANGED")
                    return {"rolledBack": False, "quarantined": True}
            return {"rolledBack": False}

    def _boot_id(self):
        value = self.paths.at("/proc/sys/kernel/random/boot_id").read_text().strip()
        if not re.fullmatch(r"[a-f0-9-]{36}", value):
            fail("NETWORK_BOOT_ID_INVALID")
        return value

    def _leases(self, config):
        if not config:
            return []
        try:
            fd = os.open(self.paths.leases, os.O_RDONLY | os.O_NOFOLLOW)
            with os.fdopen(fd, "rb") as handle:
                st = os.fstat(handle.fileno())
                if not stat.S_ISREG(st.st_mode) or st.st_size > MAX_JSON:
                    fail("NETWORK_LEASES_INVALID")
                content = handle.read(MAX_JSON + 1)
                if len(content) > MAX_JSON:
                    fail("NETWORK_LEASES_INVALID")
                return policy.parse_leases(content.decode("utf-8", errors="strict"), int(self.wall()), config)
        except FileNotFoundError:
            return []

    def _known_device(self, config, mac, ip):
        if not isinstance(mac, str) or not MAC.fullmatch(mac) or not isinstance(ip, str):
            fail("NETWORK_DEVICE_INVALID")
        leases = self._leases(config)
        if not any(l.get("active") and l.get("mac") == mac and l.get("ip") == ip for l in leases):
            fail("NETWORK_CURRENT_LEASE_REQUIRED")
        if any(l.get("active") and l.get("ip") == ip and l.get("mac") != mac for l in leases):
            fail("NETWORK_LEASE_CONFLICT")

    def status(self, state):
        config = state["pending"]["candidate"] if state["pending"] else state["confirmed"]
        inventory = self.inventory(config)
        interfaces = []
        for item in inventory["interfaces"]:
            reason = None
            if item["name"] == inventory.get("uplink") or item.get("defaultRoute"):
                reason = "NETWORK_MANAGEMENT_INTERFACE"
            elif item.get("kind") != "ether" or item.get("master"):
                reason = "NETWORK_INTERFACE_NOT_ETHERNET"
            elif item.get("managed") not in (False, "eos"):
                reason = "NETWORK_INTERFACE_MANAGED"
            elif item.get("hasGlobalIPv6") or (item.get("addresses") and (not config or item["name"] != config["interface"])):
                reason = "NETWORK_INTERFACE_IN_USE"
            interfaces.append({"name": item["name"], "mac": item.get("permanentMac", item.get("mac")),
                               "eligible": reason is None, "reason": reason,
                               "addresses": item.get("addresses", [])})
        pending = None if not state["pending"] else {"transactionId": state["pending"]["transactionId"], "expiresAt": state["pending"]["expiresAt"]}
        if state["fault"]:
            self.grants = []
        remaining = self._remaining_grants()
        return {"configured": bool(config), "config": config, "interfaces": interfaces,
                "leases": self._leases(config), "pending": pending,
                "grants": [{"mac": g["mac"], "ip": g["ip"], "expiresAt": int(self.wall()) + g["remainingSeconds"]} for g in remaining],
                "capabilities": {"available": True, "canApply": pending is None, "canGrant": bool(state["confirmed"]) and pending is None and not state["fault"]},
                "fault": state["fault"] or self.last_fault}

    def dispatch(self, request):
        if not isinstance(request, dict) or not isinstance(request.get("operation"), str):
            fail("NETWORK_REQUEST_INVALID")
        op = request["operation"]
        if op not in ("status", "preview", "apply", "confirm", "reservation", "grant", "revoke"):
            fail("NETWORK_OPERATION_UNKNOWN")
        with self.lock():
            state = self.read_state()
            if op == "status":
                exact(request, ["operation"])
                return self.status(state)
            if op in ("preview", "apply"):
                exact(request, ["operation", "config"])
                if state["pending"]:
                    fail("NETWORK_CONFIRMATION_PENDING")
                inventory = self.inventory(state["confirmed"])
                config = self.validate(request["config"], inventory)
                if state["confirmed"] and (config["interface"] != state["confirmed"]["interface"] or config["mac"] != state["confirmed"]["mac"]):
                    fail("NETWORK_INTERFACE_CHANGE_UNSUPPORTED")
                if op == "preview":
                    policy.render_dnsmasq(config)
                    policy.render_nftables(config, inventory, [], replace=False)
                    return {"config": config, "summary": "TECHNICAL_NETWORK_ONLY", "warnings": ["NETWORK_REQUIRES_CONFIRMATION", "NETWORK_DHCP_LEASE_IS_NOT_ONLINE_PROOF"]}
                if not state["baseline"]:
                    state["baseline"] = self._baseline(config, inventory)
                    state["topology"] = self._topology(config, inventory)
                state["pending"] = {"transactionId": secrets.token_hex(16), "candidate": config,
                                    "expiresAt": int(self.wall()) + 90,
                                    "expiresMonotonic": self.clock() + 90, "bootId": self._boot_id()}
                # Journal BEFORE first host mutation. Independent systemd guard
                # and daemon bootstrap restore it even after daemon failure.
                self.save_state(state)
                self.pending_deadline = self.clock() + 90
                try:
                    self._apply_os(config, state["confirmed"], state)
                except Exception:
                    try:
                        self.rollback(state)
                    except Exception:
                        self.last_fault = "NETWORK_ROLLBACK_REQUIRED"
                    raise
                return {"pending": {"transactionId": state["pending"]["transactionId"], "expiresAt": state["pending"]["expiresAt"]}}
            if op == "confirm":
                exact(request, ["operation", "transactionId"])
                if not state["pending"] or request["transactionId"] != state["pending"]["transactionId"]:
                    fail("NETWORK_TRANSACTION_INVALID")
                if self.wall() >= state["pending"]["expiresAt"] or self.pending_deadline is None or self.clock() >= self.pending_deadline:
                    self.rollback(state)
                    fail("NETWORK_CONFIRMATION_EXPIRED")
                config = state["pending"]["candidate"]
                inventory = self.inventory(config)
                self.validate(config, inventory)
                if self._topology(config, inventory) != state["topology"]:
                    fail("NETWORK_TOPOLOGY_CHANGED")
                state["confirmed"], state["pending"] = config, None
                self.save_state(state)
                self.pending_deadline = None
                return {"confirmed": True}
            if state["pending"] or not state["confirmed"]:
                fail("NETWORK_CONFIRMED_CONFIG_REQUIRED")
            if state["fault"]:
                fail("NETWORK_REAPPLY_REQUIRED")
            config = state["confirmed"]
            inventory = self.inventory(config)
            self.validate(config, inventory)
            if self._topology(config, inventory) != state["topology"]:
                fail("NETWORK_TOPOLOGY_CHANGED")
            if op == "reservation":
                exact(request, ["operation", "mac", "ip", "reserved"])
                if not isinstance(request["reserved"], bool):
                    fail("NETWORK_REQUEST_INVALID")
                if request["reserved"]:
                    self._known_device(config, request["mac"], request["ip"])
                elif not any(r["mac"] == request["mac"] and r["ip"] == request["ip"] for r in config["reservations"]):
                    fail("NETWORK_RESERVATION_NOT_FOUND")
                new_config = json.loads(json.dumps(config))
                new_config["reservations"] = [r for r in config["reservations"] if r["mac"] != request["mac"]]
                if request["reserved"]:
                    new_config["reservations"].append({"mac": request["mac"], "ip": request["ip"]})
                self.validate(new_config, inventory)
                content = policy.render_dnsmasq(new_config)
                old = policy.render_dnsmasq(config)
                try:
                    atomic_write(self.paths.run / "dhcp.conf", content, 0o644)
                    self.run(["/usr/sbin/dnsmasq", "--test", f"--conf-file={self.paths.run / 'dhcp.conf'}"])
                    self.run(["/usr/bin/systemctl", "restart", DHCP_SERVICE])
                    state["confirmed"] = new_config
                    self.save_state(state)
                except Exception:
                    atomic_write(self.paths.run / "dhcp.conf", old, 0o644)
                    self.run(["/usr/bin/systemctl", "restart", DHCP_SERVICE])
                    raise
                return {"reserved": request["reserved"]}
            if op == "grant":
                exact(request, ["operation", "mac", "ip", "durationSeconds"])
                duration = request["durationSeconds"]
                if type(duration) is not int or not 60 <= duration <= 3600:
                    fail("NETWORK_GRANT_DURATION_INVALID")
                self._known_device(config, request["mac"], request["ip"])
                old = list(self.grants)
                self.grants = [g for g in self.grants if g["mac"] != request["mac"] and g["ip"] != request["ip"]]
                if len(self.grants) >= 128:
                    fail("NETWORK_GRANT_LIMIT")
                self.grants.append({"mac": request["mac"], "ip": request["ip"], "deadline": self.clock() + duration})
                try:
                    self.firewall(config, self._effective_inventory(state, inventory))
                except Exception:
                    self.grants = old
                    raise
                return {"expiresAt": int(self.wall()) + duration}
            if op == "revoke":
                exact(request, ["operation", "mac", "ip"])
                if not MAC.fullmatch(str(request["mac"])):
                    fail("NETWORK_DEVICE_INVALID")
                old = list(self.grants)
                self.grants = [g for g in self.grants if g["mac"] != request["mac"] or g["ip"] != request["ip"]]
                try:
                    self.firewall(config, self._effective_inventory(state, inventory))
                except Exception:
                    self.grants = old
                    raise
                return {"revoked": True}
            fail("NETWORK_OPERATION_UNKNOWN")


def main():
    if os.geteuid() != 0 or sys.argv[1:] != ["guard"]:
        raise SystemExit("NETWORK_ROOT_GUARD_ONLY")
    try:
        HostManager().guard()
    except NetworkError as exc:
        if exc.code != "NETWORK_BUSY":
            print(exc.code, file=sys.stderr)
            raise SystemExit(1)


if __name__ == "__main__":
    main()
