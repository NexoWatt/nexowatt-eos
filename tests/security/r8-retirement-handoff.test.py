#!/usr/bin/python3
"""Execute main + retire control flow against an in-memory host boundary model.

The real hash-pinned entry loader is exercised; package/installer operations,
files, descriptors, accounts and services are models. No APT, service action or
host file mutation occurs. This is not a Pi installation or VPN reachability test.
"""
from collections import Counter
from contextlib import ExitStack, redirect_stderr, redirect_stdout
import copy
import importlib.util
import io
from pathlib import Path
import stat
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('r8_handoff_retirement', ROOT / 'tools/system/retire-r8-for-managed16.py')
r = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(r)


class Host:
    STAGING = Path('/root/eos-download-Test')
    QUARANTINE = Path('/root/eos-r8-retired-Test')
    COORDINATOR = 900
    LOCKS = (901, 902, 903, 904)

    def __init__(self, *, canonical_tailscale=True, fault=None):
        self.events, self.counts = [], Counter()
        self.fault, self.canonical_tailscale = fault, canonical_tailscale
        self.open_locks, self.writes, self.moves = set(), {}, []
        self.records, self.commands = [], []
        self.stopped = self.renamed = False
        self.state = None
        self.stdout, self.stderr = io.StringIO(), io.StringIO()
        self.private_vpn = {'private': 'PRIVATE_VPN_CANARY'}
        self.entry = (ROOT / 'delivery/managed16/install.sh').read_bytes()
        self.prep, self.config, self.blocks = r.load_preparer(self.entry)
        self.original_config = copy.deepcopy(self.config)
        self.original_blocks = tuple(self.blocks)
        # Only host effects are replaced, before main runs. Main must retain
        # this exact prepared installer object and the authenticated inputs.
        self.install_boundary = self.install
        self.prep.download_assets = self.download_assets
        self.prep.preflight = self.fresh_preflight
        self.prep.install_downloaded = self.install_boundary
        self.compat = types.SimpleNamespace(has_tailscale=False,
            prepare_downloads=self.prepare_downloads, check_snapshot=self.source_snapshot)
        self.real_retire = r.retire

    def event(self, name):
        self.events.append(name)
        self.counts[name] += 1
        if self.fault in (name, name + ':' + str(self.counts[name])):
            raise r.Rejected('MODEL_HANDOFF_REJECTED')

    def load_preparer(self, data):
        self.event('authenticated-entry')
        if data != self.entry:
            raise AssertionError('Changed entry passed to pinned loader')
        # Exercise authentication again at main's real admission boundary.
        _module, config, blocks = r.load_preparer_original(data)
        if config != self.config or tuple(blocks) != self.original_blocks:
            raise AssertionError('Changed authenticated installation inputs')
        return self.prep, self.config, self.blocks

    def bind(self, prep):
        if prep is not self.prep:
            raise AssertionError('Wrong preparer')
        self.event('bind-apt-compatibility')
        return self.compat

    def host_preflight(self, prep):
        if prep is not self.prep:
            raise AssertionError('Wrong preflight preparer')
        self.event('host-preflight')
        self.compat.has_tailscale = self.canonical_tailscale

    def download_assets(self, config, staging):
        self.check_install_inputs(config, staging)
        self.event('asset-download')

    def prepare_downloads(self, staging):
        if staging != self.STAGING or self.stopped:
            raise AssertionError('Packages must be prepared while R8 is running')
        self.event('apt-prepare')

    def source_snapshot(self):
        if self.open_locks != set(self.LOCKS):
            raise AssertionError('Source recheck must hold package locks')
        self.event('apt-source-recheck')

    def snapshot(self):
        if not self.canonical_tailscale:
            raise AssertionError('VPN inspection without canonical Tailscale profile')
        self.event('vpn-snapshot')
        return self.private_vpn

    def check_vpn(self, previous):
        if previous is not self.private_vpn:
            raise AssertionError('VPN snapshot was replaced')
        self.event('vpn-recheck')

    def package_locks(self):
        self.event('package-locks-acquired')
        self.open_locks.update(self.LOCKS)
        return list(self.LOCKS)

    def close(self, fd):
        if fd not in self.open_locks:
            raise AssertionError('Unexpected descriptor close')
        self.open_locks.remove(fd)
        self.event('package-lock-closed')

    def open(self, path, flags, mode):
        if path != '/root/.eos-r8-retirement.lock' or mode != 0o600 or not flags & r.os.O_NOFOLLOW:
            raise AssertionError('Unexpected host open')
        return self.COORDINATOR

    def fstat(self, fd):
        if fd != self.COORDINATOR:
            raise AssertionError('Unexpected descriptor stat')
        return types.SimpleNamespace(st_mode=stat.S_IFREG | 0o600, st_uid=0, st_nlink=1)

    def flock(self, fd, operation):
        if fd != self.COORDINATOR or operation != r.fcntl.LOCK_EX | r.fcntl.LOCK_NB:
            raise AssertionError('Unexpected coordinator locking')

    def info(self, path):
        if str(path) != '/root':
            raise AssertionError('Unexpected host inventory')
        return types.SimpleNamespace(st_mode=stat.S_IFDIR | 0o700, st_uid=0)

    def mkdtemp(self, *, prefix, dir):
        if dir != '/root':
            raise AssertionError('Unexpected staging root')
        if prefix == 'eos-download-':
            return str(self.STAGING)
        if prefix == 'eos-r8-retired-':
            self.event('quarantine-created')
            return str(self.QUARANTINE)
        raise AssertionError('Unexpected temporary directory')

    def read(self, path, limit):
        if path != self.STAGING / 'install.sh' or limit != r.ENTRY_SIZE:
            raise AssertionError('Unexpected host read')
        return self.entry

    def run(self, args, **kwargs):
        self.commands.append(tuple(args))
        if args[0] == '/usr/bin/curl':
            if r.ENTRY_URL not in args or args[-2:] != ['-o', str(self.STAGING / 'install.sh')]:
                raise AssertionError('Changed pinned entry download')
            self.event('entry-download')
            return 0, ''
        if args[:2] == ['/usr/bin/systemctl', 'daemon-reload'] and len(args) == 2:
            self.event('eos-daemon-reload')
            return 0, ''
        if args == ['/usr/bin/systemctl', 'reset-failed', *r.UNITS]:
            self.event('eos-reset-failed')
            return 0, ''
        raise AssertionError('Unmodelled command could modify the host')

    def write(self, path, data):
        path = str(path)
        if path == r.GUARD:
            self.event('guard-created')
        elif path == str(self.STAGING / 'prepare-host.py'):
            if data != self.original_blocks[0]:
                raise AssertionError('Authenticated preparer changed')
        elif path == str(self.STAGING / 'download.json'):
            if data != self.original_blocks[1]:
                raise AssertionError('Authenticated download descriptor changed')
        else:
            raise AssertionError('Unexpected host write')
        self.writes[path] = data

    def fingerprint(self, path):
        if path not in r.MOVES:
            raise AssertionError('Unexpected move inventory')
        return [1, r.MOVES.index(path) + 1, 0, 0, stat.S_IFREG | 0o600]

    def journal(self, q, state, phase=None):
        if q != self.QUARANTINE:
            raise AssertionError('Wrong private journal')
        if phase:
            state['phase'] = phase
        self.state = state
        self.records.append(copy.deepcopy(state))
        self.event('journal:' + state['phase'])

    def retire(self, q, state):
        self.event('retire-enter')
        return self.real_retire(q, state)

    def stop(self):
        if r.GUARD not in self.writes or self.open_locks != set(self.LOCKS):
            raise AssertionError('EOS stop requires guard and package locks')
        self.event('eos-stop')
        self.stopped = True

    def safe_move(self, source, destination, fingerprint):
        if not self.stopped or source not in r.MOVES or destination != self.QUARANTINE / 'original' / source.lstrip('/'):
            raise AssertionError('Unexpected EOS move')
        if fingerprint != self.fingerprint(source):
            raise AssertionError('Original move inventory changed')
        self.moves.append(source)
        self.event('eos-move')

    def rename(self, *, q, state):
        if q != self.QUARANTINE or state is not self.state or self.moves != list(r.MOVES):
            raise AssertionError('Account rename before complete scoped move')
        self.event('eos-accounts-renamed')
        self.renamed = True

    def accounts(self, *, preserved):
        if not preserved or not self.renamed:
            raise AssertionError('Preserved account identity missing')
        self.event('preserved-accounts-checked')

    def fresh_preflight(self, staging):
        if staging != self.STAGING or not self.renamed or self.state['phase'] != 'RETIRED':
            raise AssertionError('Fresh-host admission before retirement completed')
        self.event('fresh-preflight')

    def check_install_inputs(self, config, staging):
        if config is not self.config or config != self.original_config or staging != self.STAGING:
            raise AssertionError('Signed installer handoff changed inputs')

    def install(self, config, staging):
        self.check_install_inputs(config, staging)
        if self.open_locks or self.state['phase'] != 'INSTALLING_MANAGED16' or not self.renamed:
            raise AssertionError('Installer started outside completed handoff')
        if self.prep.install_downloaded is not self.install_boundary:
            raise AssertionError('Main replaced installer callable')
        self.event('signed-install')

    def patch(self):
        stack = ExitStack()
        stack.enter_context(patch.object(r, 'load_preparer_original', r.load_preparer, create=True))
        functions = {'info': self.info, 'read': self.read, 'run': self.run, 'load_preparer': self.load_preparer,
                     'bind_managed16_apt_compat': self.bind, 'preflight': self.host_preflight,
                     'vpn_snapshot': self.snapshot, 'check_vpn_snapshot': self.check_vpn,
                     'package_locks': self.package_locks, 'fingerprint': self.fingerprint,
                     'journal': self.journal, 'write_new': self.write, 'retire': self.retire,
                     'stop_eos': self.stop, 'safe_move': self.safe_move,
                     'rename_accounts': self.rename, 'check_accounts': self.accounts}
        for name, callback in functions.items():
            stack.enter_context(patch.object(r, name, side_effect=callback))
        for name in ('check_ports', 'check_mounts', 'process_check', 'check_identity'):
            stack.enter_context(patch.object(r, name, side_effect=lambda *a, _name=name, **kw: self.event(_name)))
        stack.enter_context(patch.object(r.os, 'geteuid', return_value=0))
        stack.enter_context(patch.object(r.os, 'umask', return_value=0o022))
        stack.enter_context(patch.object(r.os, 'urandom', return_value=b'\x01' * 32))
        stack.enter_context(patch.object(r.os, 'open', side_effect=self.open))
        stack.enter_context(patch.object(r.os, 'fstat', side_effect=self.fstat))
        stack.enter_context(patch.object(r.os, 'close', side_effect=self.close))
        stack.enter_context(patch.object(r.fcntl, 'flock', side_effect=self.flock))
        stack.enter_context(patch.object(r.tempfile, 'mkdtemp', side_effect=self.mkdtemp))
        stack.enter_context(patch.object(r.sys, 'argv', ['retire']))
        stack.enter_context(patch('builtins.open', side_effect=AssertionError('Unmodelled file access')))
        stack.enter_context(patch.object(r.Path, 'open', side_effect=AssertionError('Unmodelled path access')))
        for name in ('mkdir', 'rmdir', 'unlink', 'remove', 'rename', 'replace', 'chmod', 'chown', 'link', 'symlink'):
            stack.enter_context(patch.object(r.os, name, side_effect=AssertionError('Unmodelled filesystem mutation')))
        for name in ('Popen', 'run'):
            stack.enter_context(patch.object(r.subprocess, name, side_effect=AssertionError('No real subprocess')))
        stack.enter_context(redirect_stdout(self.stdout))
        stack.enter_context(redirect_stderr(self.stderr))
        return stack


class Handoff(unittest.TestCase):
    def assert_no_retirement(self, host):
        for event in ('retire-enter', 'guard-created', 'eos-stop', 'eos-move',
                      'eos-accounts-renamed', 'signed-install', 'quarantine-created'):
            self.assertNotIn(event, host.events)
        self.assertFalse(host.records)
        self.assertNotIn(r.GUARD, host.writes)

    def execute_failure(self, host):
        with host.patch(), self.assertRaisesRegex(r.Rejected, '^MODEL_HANDOFF_REJECTED$'):
            r.main()
        self.assertNotIn('PRIVATE_VPN_CANARY', host.stdout.getvalue() + host.stderr.getvalue())

    def test_asset_or_apt_preparation_failure_precedes_guard_journal_and_stop(self):
        for fault in ('asset-download', 'apt-prepare'):
            host = Host(fault=fault)
            with self.subTest(fault=fault):
                self.execute_failure(host)
                self.assert_no_retirement(host)
                self.assertNotIn('package-locks-acquired', host.events)
                self.assertFalse(host.writes)

    def test_vpn_drift_after_downloads_aborts_before_any_retirement(self):
        host = Host(fault='vpn-recheck:1')
        self.execute_failure(host)
        self.assert_no_retirement(host)
        self.assertIn('apt-prepare', host.events)
        self.assertNotIn('package-locks-acquired', host.events)

    def test_locked_vpn_or_source_recheck_failure_closes_locks_without_stop(self):
        for fault in ('vpn-recheck:2', 'apt-source-recheck', 'host-preflight:2'):
            host = Host(fault=fault)
            with self.subTest(fault=fault):
                self.execute_failure(host)
                self.assert_no_retirement(host)
                self.assertEqual(host.counts['package-lock-closed'], len(host.LOCKS))
                self.assertFalse(host.open_locks)

    def test_success_keeps_authentic_handoff_and_orders_gates_before_stop(self):
        host = Host()
        with host.patch():
            r.main()
        order = ['authenticated-entry', 'bind-apt-compatibility', 'host-preflight', 'vpn-snapshot',
                 'asset-download', 'apt-prepare', 'vpn-recheck', 'package-locks-acquired',
                 'apt-source-recheck', 'quarantine-created', 'journal:PREPARED', 'retire-enter',
                 'journal:STOPPING', 'guard-created', 'eos-stop', 'journal:MOVING',
                 'eos-move', 'eos-accounts-renamed', 'journal:RETIRED', 'fresh-preflight',
                 'package-lock-closed', 'journal:INSTALLING_MANAGED16', 'signed-install',
                 'journal:MANAGED16_INSTALLER_FINISHED']
        positions = [host.events.index(event) for event in order]
        self.assertEqual(positions, sorted(positions))
        checks = [i for i, event in enumerate(host.events) if event == 'vpn-recheck']
        self.assertEqual(len(checks), 4)
        self.assertLess(checks[1], host.events.index('retire-enter'))
        self.assertGreater(checks[2], host.events.index('journal:RETIRED'))
        self.assertGreater(checks[3], host.events.index('signed-install'))
        self.assertEqual(host.moves, list(r.MOVES))
        self.assertEqual(host.config, host.original_config)
        self.assertEqual(tuple(host.blocks), host.original_blocks)
        self.assertFalse(host.open_locks)
        self.assertEqual(host.state['phase'], 'MANAGED16_INSTALLER_FINISHED')
        self.assertNotIn('PRIVATE_VPN_CANARY', repr(host.records) + host.stdout.getvalue() + host.stderr.getvalue())
        self.assertFalse(any('tailscale' in arg for command in host.commands for arg in command))

    def test_absent_canonical_tailscale_skips_only_vpn_queries(self):
        host = Host(canonical_tailscale=False)
        with host.patch():
            r.main()
        self.assertNotIn('vpn-snapshot', host.events)
        self.assertNotIn('vpn-recheck', host.events)
        self.assertIn('apt-prepare', host.events)
        self.assertIn('apt-source-recheck', host.events)
        self.assertIn('fresh-preflight', host.events)
        self.assertIn('signed-install', host.events)
        self.assertFalse(host.open_locks)

    def test_vpn_drift_or_fresh_admission_failure_after_retirement_blocks_installer(self):
        for fault in ('vpn-recheck:3', 'fresh-preflight'):
            host = Host(fault=fault)
            with self.subTest(fault=fault):
                self.execute_failure(host)
                self.assertEqual(host.state['phase'], 'RETIRED')
                self.assertNotIn('signed-install', host.events)
                self.assertNotIn('journal:INSTALLING_MANAGED16', host.events)
                self.assertFalse(host.open_locks)
                self.assertIn('Keine automatische Wiederaktivierung', host.stdout.getvalue())

    def test_install_failure_cannot_publish_finished_journal_or_success(self):
        host = Host(fault='signed-install')
        self.execute_failure(host)
        self.assertEqual(host.state['phase'], 'INSTALLING_MANAGED16')
        self.assertNotIn('journal:MANAGED16_INSTALLER_FINISHED', host.events)
        self.assertNotIn('EOS: R16-Installer beendet.', host.stdout.getvalue())
        self.assertFalse(host.open_locks)

    def test_post_install_vpn_drift_cannot_claim_completed_handoff(self):
        host = Host(fault='vpn-recheck:4')
        self.execute_failure(host)
        self.assertIn('signed-install', host.events)
        self.assertEqual(host.state['phase'], 'INSTALLING_MANAGED16')
        self.assertNotIn('journal:MANAGED16_INSTALLER_FINISHED', host.events)
        self.assertNotIn('EOS: R16-Installer beendet.', host.stdout.getvalue())


if __name__ == '__main__':
    unittest.main()
