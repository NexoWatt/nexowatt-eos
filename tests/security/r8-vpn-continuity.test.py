#!/usr/bin/python3
"""Read-only VPN continuity boundary; mocked host queries, no live networking.

The tests establish refusal on observed daemon/package/SSH return-path changes.
They do not establish uninterrupted remote access or actual Pi installation.
"""
from contextlib import ExitStack, redirect_stderr, redirect_stdout
import copy
import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('r8_vpn_retirement', ROOT / 'tools/system/retire-r8-for-managed16.py')
r = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(r)


class Host:
    def __init__(self):
        self.service = {'LoadState': 'loaded', 'ActiveState': 'active', 'SubState': 'running',
                        'MainPID': '1234', 'ControlPID': '0'}
        self.start = b'10000'
        self.version = '1.2.3'
        self.connection = '100.64.0.110 51234 100.64.0.2 22'
        self.addresses = [
            {'ifname': 'eth0', 'ifindex': 2, 'flags': ['UP', 'LOWER_UP'],
             'addr_info': [{'family': 'inet', 'local': '192.0.2.10', 'prefixlen': 24}]},
            {'ifname': 'tailscale0', 'ifindex': 5, 'flags': ['UP', 'POINTOPOINT'],
             'addr_info': [{'family': 'inet', 'local': '100.64.0.2', 'prefixlen': 32}]}]
        self.routes = [{'dst': '100.64.0.110', 'from': '100.64.0.2', 'dev': 'tailscale0',
                        'table': 52, 'uid': 0, 'cache': []}]
        self.raw_addresses = self.raw_routes = None
        self.calls = []
        self.package_reads = self.daemon_reads = 0
        self.change_during_daemon = self.change_during_package = False

    def unit(self, name):
        self.assert_unit(name)
        self.daemon_reads += 1
        if self.change_during_daemon and self.daemon_reads == 2:
            self.start = b'10001'
        return dict(self.service)

    @staticmethod
    def assert_unit(name):
        if name != 'tailscaled.service':
            raise AssertionError('Unexpected service query')

    def process(self, path):
        if str(path) != '/proc/' + self.service['MainPID']:
            raise AssertionError('Unexpected process query')
        return self.start

    def output(self, args):
        self.calls.append(tuple(args))
        if args == ['/usr/bin/dpkg-query', '-W', '-f=${db:Status-Status}\\t${Version}\\n', 'tailscale']:
            self.package_reads += 1
            version = '1.2.4' if self.change_during_package and self.package_reads == 2 else self.version
            return 'installed\t' + version + '\n'
        if args == ['/usr/sbin/ip', '-j', 'address', 'show']:
            return self.raw_addresses if self.raw_addresses is not None else json.dumps(self.addresses)
        remote, remote_port, local, local_port = self.connection.split()
        family = '-6' if ':' in local else '-4'
        if args == ['/usr/sbin/ip', '-j', family, 'route', 'get', remote, 'from', local,
                    'ipproto', 'tcp', 'sport', local_port, 'dport', remote_port]:
            return self.raw_routes if self.raw_routes is not None else json.dumps(self.routes)
        raise AssertionError('Unexpected command')

    def patch(self):
        stack = ExitStack()
        stack.enter_context(patch.object(r, 'output', side_effect=self.output))
        stack.enter_context(patch.object(r, 'unit_state', side_effect=self.unit))
        stack.enter_context(patch.object(r, 'process_identity', side_effect=self.process))
        stack.enter_context(patch.dict(r.os.environ, {'SSH_CONNECTION': self.connection}))
        stack.enter_context(patch.object(r, 'run', side_effect=AssertionError('No direct command execution')))
        stack.enter_context(patch.object(r, 'write_new', side_effect=AssertionError('No file writes')))
        return stack


class VPNContinuity(unittest.TestCase):
    def test_same_active_daemon_package_and_return_path_pass_without_output(self):
        host = Host()
        stdout, stderr = io.StringIO(), io.StringIO()
        with host.patch(), redirect_stdout(stdout), redirect_stderr(stderr):
            before = r.vpn_snapshot()
            self.assertIsNone(r.check_vpn_snapshot(before))
        self.assertEqual(stdout.getvalue(), '')
        self.assertEqual(stderr.getvalue(), '')
        self.assertEqual(before['daemon'], ('1234', b'10000'))
        self.assertEqual(before['version'], '1.2.3')
        self.assertTrue(all(call[0] in ('/usr/bin/dpkg-query', '/usr/sbin/ip') for call in host.calls))

    def test_console_still_requires_stable_running_tailscale(self):
        host = Host()
        host.connection = ''
        with host.patch():
            before = r.vpn_snapshot()
            self.assertIsNone(before['ssh'])
            r.check_vpn_snapshot(before)
        self.assertTrue(all(call[0] == '/usr/bin/dpkg-query' for call in host.calls))

    def test_service_inactive_reloading_missing_or_invalid_pid_rejected(self):
        for field, value in [('LoadState', 'not-found'), ('ActiveState', 'inactive'),
                             ('SubState', 'auto-restart'), ('ControlPID', '7'),
                             ('MainPID', '0'), ('MainPID', '1234;PRIVATE_TEST_CANARY')]:
            host = Host()
            host.service[field] = value
            with self.subTest(field=field, value=value), host.patch(), self.assertRaises(r.Rejected) as error:
                r.vpn_snapshot()
            self.assertNotIn('PRIVATE_TEST_CANARY', str(error.exception))

    def test_pid_reuse_restart_and_package_upgrade_are_detected(self):
        for change in ('pid', 'start', 'package'):
            host = Host()
            with self.subTest(change=change), host.patch():
                before = r.vpn_snapshot()
                if change == 'pid':
                    host.service['MainPID'] = '1235'
                elif change == 'start':
                    host.start = b'10001'
                else:
                    host.version = '1.2.4'
                with self.assertRaisesRegex(r.Rejected, '^VPN_CONTINUITY_CHANGED$'):
                    r.check_vpn_snapshot(before)

    def test_changed_observation_during_single_snapshot_is_rejected(self):
        for field in ('change_during_daemon', 'change_during_package'):
            host = Host()
            setattr(host, field, True)
            with self.subTest(field=field), host.patch(), self.assertRaisesRegex(
                    r.Rejected, '^VPN_CHANGED_DURING_INSPECTION$'):
                r.vpn_snapshot()

    def test_local_address_prefix_interface_identity_and_link_changes_detected(self):
        for change in ('address', 'prefix', 'index', 'down', 'duplicate'):
            host = Host()
            with self.subTest(change=change), host.patch():
                before = r.vpn_snapshot()
                iface = host.addresses[1]
                if change == 'address':
                    iface['addr_info'][0]['local'] = '100.64.0.3'
                elif change == 'prefix':
                    iface['addr_info'][0]['prefixlen'] = 24
                elif change == 'index':
                    iface['ifindex'] = 7
                elif change == 'down':
                    iface['flags'] = []
                else:
                    host.addresses[0]['addr_info'].append(copy.deepcopy(iface['addr_info'][0]))
                with self.assertRaises(r.Rejected):
                    r.check_vpn_snapshot(before)

    def test_return_route_device_table_gateway_source_changes_detected(self):
        for field, value in [('dev', 'eth0'), ('table', 53), ('gateway', '100.64.0.1'),
                             ('prefsrc', '100.64.0.3')]:
            host = Host()
            with self.subTest(field=field), host.patch():
                before = r.vpn_snapshot()
                host.routes[0][field] = value
                with self.assertRaisesRegex(r.Rejected, '^VPN_CONTINUITY_CHANGED$'):
                    r.check_vpn_snapshot(before)

    def test_dynamic_cache_lifetime_and_uid_do_not_create_false_change(self):
        host = Host()
        with host.patch():
            before = r.vpn_snapshot()
            host.routes[0].update(cache=[{'expires': 120}], uid=1000)
            host.addresses[1]['addr_info'][0].update(valid_life_time=120, preferred_life_time=100)
            r.check_vpn_snapshot(before)

    def test_ipv6_connection_preserves_canonical_local_binding_and_route(self):
        host = Host()
        host.connection = 'fd7a:115c:a1e0::10 51234 fd7a:115c:a1e0::2 22'
        host.addresses[1]['addr_info'] = [{'family': 'inet6', 'local': 'fd7a:115c:a1e0::2', 'prefixlen': 128}]
        host.routes = [{'dst': 'fd7a:115c:a1e0::10', 'from': 'fd7a:115c:a1e0::2', 'dev': 'tailscale0', 'table': 52}]
        with host.patch():
            before = r.vpn_snapshot()
            r.check_vpn_snapshot(before)
        self.assertTrue(any(call[2:5] == ('-6', 'route', 'get') for call in host.calls if call[0] == '/usr/sbin/ip'))

    def test_unparseable_or_injected_ssh_input_is_rejected_before_ip(self):
        for connection in ['PRIVATE_TEST_CANARY 22 100.64.0.2 22', '--help 22 100.64.0.2 22',
                           '100.64.0.110 0 100.64.0.2 22', '100.64.0.110 22 100.64.0.2 99999',
                           '100.64.0.110 22 100.64.0.2 22 extra',
                           'fd7a:115c:a1e0::10%tailscale0 22 fd7a:115c:a1e0::2 22']:
            host = Host()
            host.connection = connection
            with self.subTest(connection=connection), host.patch(), self.assertRaisesRegex(r.Rejected, '^VPN_SSH_INPUT$'):
                r.vpn_snapshot()
            self.assertTrue(all(call[0] != '/usr/sbin/ip' for call in host.calls))

    def test_duplicate_or_invalid_json_and_unbounded_inventories_are_rejected(self):
        for field, value in [('raw_addresses', 'PRIVATE_TEST_CANARY'),
                             ('raw_addresses', '[{"ifindex":1,"ifindex":2}]'),
                             ('raw_routes', '[{"dst":"100.64.0.110","dev":"tailscale0","dev":"eth0"}]'),
                             ('addresses', [{}] * 129), ('routes', []), ('routes', [{}] * 2)]:
            host = Host()
            setattr(host, field, value)
            with self.subTest(field=field), host.patch(), self.assertRaises(r.Rejected) as error:
                r.vpn_snapshot()
            self.assertNotIn('PRIVATE_TEST_CANARY', str(error.exception))

    def test_route_must_be_live_unicast_host_return_path(self):
        for patch_value in [{'type': 'unreachable'}, {'dst': '100.64.0.0/10'}, {'dst': '100.64.0.111'},
                            {'dev': 'unknown'}, {'table': 'PRIVATE_TEST_CANARY;touch /tmp/x'}]:
            host = Host()
            host.routes[0].update(patch_value)
            with self.subTest(fields=tuple(patch_value)), host.patch(), self.assertRaises(r.Rejected) as error:
                r.vpn_snapshot()
            self.assertNotIn('PRIVATE_TEST_CANARY', str(error.exception))

    def test_missing_process_and_package_errors_have_no_private_details(self):
        host = Host()
        with host.patch(), patch.object(r, 'process_identity', side_effect=FileNotFoundError('PRIVATE_TEST_CANARY')):
            with self.assertRaisesRegex(r.Rejected, '^VPN_INSPECTION_FAILED$'):
                r.vpn_snapshot()
        host.version = 'PRIVATE_TEST_CANARY'
        with host.patch(), self.assertRaisesRegex(r.Rejected, '^VPN_PACKAGE_NOT_READY$'):
            r.vpn_snapshot()

    def test_missing_previous_snapshot_cannot_bypass_check(self):
        for previous in (None, {}, {'daemon': ('1234', b'10000')}, []):
            with self.subTest(previous=previous), patch.object(r, 'vpn_snapshot') as inspect:
                with self.assertRaisesRegex(r.Rejected, '^VPN_SNAPSHOT_REQUIRED$'):
                    r.check_vpn_snapshot(previous)
                inspect.assert_not_called()


if __name__ == '__main__':
    unittest.main()
