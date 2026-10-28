#!/usr/bin/python3
"""Retirement boundaries with real temporary files and modelled host accounts.

Never invokes main(), systemd, usermod, groupmod, APT or the installer. Root-only
filesystem cases use a disposable private directory under /root so the actual
root-owned ancestor and no-follow checks run unchanged. Other cases need no root.
These tests do not establish ARM64, systemd shutdown or power-loss acceptance.
"""
from contextlib import ExitStack
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('r8_retirement', ROOT / 'tools/system/retire-r8-for-managed16.py')
r = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(r)


class Accounts:
    """In-memory passwd/group/NSS model; commands never reach the operating system."""
    def __init__(self):
        self.users = [['root', 'x', '0', '0', 'root', '/root', '/bin/bash']]
        self.groups = [['root', 'x', '0', '']]
        self.locked = True
        self.commands = []
        self.interrupt_after = None
        self.mutations = 0
        for name, (uid, gid) in r.ACCOUNTS.items():
            self.users.append([name, 'x', str(uid), str(gid), '', '/nonexistent', '/usr/sbin/nologin'])
            self.groups.append([name, 'x', str(gid), ''])

    def table(self, table):
        return self.users if table == 'passwd' else self.groups

    def text(self, table):
        return ''.join(':'.join(row) + '\n' for row in self.table(table))

    def output(self, args):
        if args[0] == '/usr/bin/id':
            return next(row[3] + '\n' for row in self.users if row[0] == args[-1])
        if args[:2] == ['/usr/bin/getent', 'shadow']:
            return args[-1] + (':!:1:0:99999:7:::\n' if self.locked else ':PRIVATE_TEST_CANARY:1:0:99999:7:::\n')
        return self.run(args)[1]

    def run(self, args, **kwargs):
        self.commands.append(tuple(args))
        if args[0] == '/usr/bin/systemctl':
            return 0, ''
        if args[0] == '/usr/bin/getent':
            rows = self.table(args[1])
            if len(args) == 3:
                rows = [row for row in rows if row[0] == args[2]]
            return (0, ''.join(':'.join(row) + '\n' for row in rows)) if rows else (2, '')
        if args[0] in ('/usr/sbin/groupmod', '/usr/sbin/usermod'):
            table = 'group' if args[0].endswith('groupmod') else 'passwd'
            row = next(row for row in self.table(table) if row[0] == args[3])
            row[0] = args[2]
            self.mutations += 1
            if self.mutations == self.interrupt_after:
                raise KeyboardInterrupt('injected after account mutation')
            return 0, ''
        raise AssertionError('Unexpected command: ' + repr(args))

    def read(self, path, *args):
        if str(path) in ('/etc/passwd', '/etc/group'):
            return self.text(Path(path).name).encode()
        raise AssertionError('Unexpected account read: ' + str(path))

    def patch(self, filesystem_read=None):
        stack = ExitStack()
        stack.enter_context(patch.object(r, 'output', side_effect=self.output))
        stack.enter_context(patch.object(r, 'run', side_effect=self.run))
        def read(path, *args):
            if str(path) in ('/etc/passwd', '/etc/group'):
                return self.read(path)
            if filesystem_read is not None:
                return filesystem_read(path, *args)
            raise AssertionError('Unexpected read: ' + str(path))
        stack.enter_context(patch.object(r, 'read', side_effect=read))
        real_exists = r.exists
        stack.enter_context(patch.object(r, 'exists', side_effect=lambda p: False if str(p).startswith(
            ('/var/spool/cron/', '/var/mail/', '/var/spool/mail/')) else real_exists(p)))
        return stack


class PureBoundaries(unittest.TestCase):
    def test_duplicate_json_keys_rejected(self):
        with self.assertRaisesRegex(r.Rejected, 'JSON_DUPLICATE'):
            r.decoded(b'{"phase":"MOVING","phase":"RETIRED"}')

    def test_unknown_cli_rejected_before_open_or_command(self):
        with patch.object(r.os, 'geteuid', return_value=0), patch.object(r.sys, 'argv', ['retire', '--force']), \
                patch.object(r.os, 'open') as opened, patch.object(r, 'run') as command:
            with self.assertRaisesRegex(r.Rejected, 'USAGE'):
                r.main()
        opened.assert_not_called()
        command.assert_not_called()

    def test_real_managed16_entry_loads_only_the_fixed_preparer(self):
        data = (ROOT / 'delivery/managed16/install.sh').read_bytes()
        self.assertEqual(len(data), r.ENTRY_SIZE)
        self.assertEqual(hashlib.sha256(data).hexdigest(), r.ENTRY_SHA)
        with patch.object(r.subprocess, 'Popen', side_effect=AssertionError('No subprocess at import')):
            prep, config, blocks = r.load_preparer(data)
        self.assertEqual(prep.__name__, 'eos_pinned_managed16_preparer')
        self.assertIn('/managed-test-16-', config['baseUrl'])
        self.assertEqual(len(config['assets']), 3)
        self.assertEqual(json.loads(blocks[1]), config)
        self.assertTrue(callable(prep.download_assets) and callable(prep.preflight) and callable(prep.install_downloaded))

    def test_changed_and_truncated_entry_never_create_executable_module(self):
        data = (ROOT / 'delivery/managed16/install.sh').read_bytes()
        for bad in (data[:-1], bytes([data[0] ^ 1]) + data[1:], data + b'\n'):
            with self.subTest(length=len(bad)), patch.object(r.types, 'ModuleType') as module:
                with self.assertRaisesRegex(r.Rejected, 'ENTRY_PIN'):
                    r.load_preparer(bad)
                module.assert_not_called()

    def test_restore_forbidden_after_installer_started_before_path_access(self):
        for phase in ('INSTALLING_MANAGED16', 'MANAGED16_INSTALLER_FINISHED', 'UNKNOWN'):
            with self.subTest(phase=phase), patch.object(r, 'exists') as exists:
                with self.assertRaisesRegex(r.Rejected, 'RESTORE_INSTALL_ALREADY_STARTED'):
                    r.restore_stopped(Path('/unused'), {'phase': phase})
                exists.assert_not_called()

    def test_invalid_restore_journal_rejected_before_path_access(self):
        state = {'phase': 'RETIRED', 'schemaVersion': 1, 'releaseId': r.R8,
                 'originals': {path: [] for path in r.MOVES}, 'token': 'a' * 64}
        for field, value in (('releaseId', 'other'), ('originals', {}), ('token', 'invalid')):
            with self.subTest(field=field), patch.object(r, 'exists') as exists:
                with self.assertRaisesRegex(r.Rejected, 'RESTORE_JOURNAL'):
                    r.restore_stopped(Path('/unused'), {**state, field: value})
                exists.assert_not_called()

    def test_trigger_stop_precedes_service_stop_and_never_forces_kill(self):
        events = []
        stopped = {'ActiveState': 'inactive', 'MainPID': '0', 'ControlPID': '0'}
        with patch.object(r, 'run', side_effect=lambda args, **kw: events.append(tuple(args))), \
                patch.object(r, 'unit_state', return_value=stopped), \
                patch.object(r, 'exists', return_value=False), \
                patch.object(r, 'process_check', side_effect=lambda **kw: events.append(('process', kw['stopped']))):
            r.stop_eos()
        self.assertEqual(events[0][:3], ('/usr/bin/systemctl', 'stop', '--no-block'))
        self.assertTrue(all(name.endswith(('.timer', '.path', '.target')) for name in events[0][3:]))
        self.assertEqual(set(events[1][3:]), set(r.UNITS))
        self.assertEqual(events[-1], ('process', True))
        self.assertFalse(any('kill' in str(item) for item in events))

    def test_postgres_pid_or_runtime_directory_blocks_after_stop(self):
        stopped = {'ActiveState': 'inactive', 'MainPID': '0', 'ControlPID': '0'}
        for path, code in (('/var/lib/nexowatt-eos/postgresql/postmaster.pid', 'POSTGRES_NOT_STOPPED'),
                           ('/run/nexowatt-eos-postgresql', 'POSTGRES_RUNTIME_REMAINS')):
            with self.subTest(path=path), patch.object(r, 'run'), patch.object(r, 'process_check'), \
                    patch.object(r, 'unit_state', return_value=stopped), \
                    patch.object(r, 'exists', side_effect=lambda p: str(p) == path):
                with self.assertRaisesRegex(r.Rejected, code):
                    r.stop_eos()


class AccountBoundaries(unittest.TestCase):
    def test_exact_dedicated_locked_accounts_pass_without_mutation(self):
        model = Accounts()
        with model.patch():
            r.check_accounts()
            r.check_account_transitions()
        self.assertEqual(model.mutations, 0)

    def test_reserved_name_collision_rejected_before_any_rename(self):
        for table in ('passwd', 'group'):
            model = Accounts()
            row = ['eos-r8-runtime', 'x', '12345', '12345', '', '/nonexistent', '/usr/sbin/nologin'] if table == 'passwd' else ['eos-r8-runtime', 'x', '12345', '']
            model.table(table).append(row)
            with self.subTest(table=table), model.patch(), self.assertRaises(r.Rejected):
                r.rename_accounts()
            self.assertEqual(model.mutations, 0)

    def test_changed_uid_alias_membership_shell_and_unlocked_account_rejected(self):
        for change in ('uid', 'alias', 'membership', 'shell', 'unlocked'):
            model = Accounts()
            if change == 'uid':
                model.users[1][2] = '12345'
            elif change == 'alias':
                model.users.append(['alias', 'x', '997', '12345', '', '/nonexistent', '/usr/sbin/nologin'])
            elif change == 'membership':
                model.groups.append(['external', 'x', '12345', 'eos-runtime'])
            elif change == 'shell':
                model.users[1][6] = '/bin/bash'
            else:
                model.locked = False
            with self.subTest(change=change), model.patch(), self.assertRaises(r.Rejected) as error:
                r.rename_accounts(restore=True)
            self.assertNotIn('PRIVATE_TEST_CANARY', str(error.exception))
            self.assertEqual(model.mutations, 0)

    def test_rename_preserves_numeric_owners_and_reconciles_every_interruption(self):
        original = Accounts()
        for interruption in range(1, 7):
            model = Accounts()
            model.interrupt_after = interruption
            with self.subTest(after=interruption), model.patch():
                with self.assertRaises(KeyboardInterrupt):
                    r.rename_accounts()
                r.check_account_transitions()
                model.interrupt_after = None
                r.rename_accounts(restore=True)
                r.check_accounts()
            self.assertEqual(model.users, original.users)
            self.assertEqual(model.groups, original.groups)

    def test_full_preserved_state_passes_and_second_rename_is_idempotent(self):
        model = Accounts()
        with model.patch():
            r.rename_accounts()
            r.check_accounts(preserved=True)
            r.rename_accounts()
        self.assertEqual(model.mutations, 6)
        self.assertEqual([(row[2], row[3]) for row in model.users[1:]],
                         [(str(uid), str(gid)) for uid, gid in r.ACCOUNTS.values()])


@unittest.skipUnless(os.geteuid() == 0, 'Actual root-owned no-follow filesystem fixtures require root')
class FilesystemBoundaries(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='eos-retirement-test-', dir='/root')
        self.base = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)

    def write(self, name, data=b'PRIVATE_FIXTURE_CANARY'):
        path = self.base / name
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        path.write_bytes(data)
        path.chmod(0o600)
        return path

    def test_move_preserves_actual_inode_content_mode_and_numeric_ownership(self):
        source = self.write('source/private')
        expected = r.fingerprint(source)
        destination = self.base / 'quarantine/original/private'
        r.safe_move(source, destination, expected)
        self.assertFalse(source.exists())
        self.assertEqual(r.fingerprint(destination), expected)
        self.assertEqual(destination.read_bytes(), b'PRIVATE_FIXTURE_CANARY')
        self.assertEqual(stat.S_IMODE(destination.parent.stat().st_mode), 0o700)

    def test_directory_move_preserves_children_without_copy_or_reownership(self):
        child = self.write('source/database')
        inode = child.stat().st_ino
        source = child.parent
        destination = self.base / 'quarantine/root'
        r.safe_move(source, destination, r.fingerprint(source))
        self.assertEqual((destination / 'database').stat().st_ino, inode)
        self.assertEqual((destination / 'database').read_bytes(), b'PRIVATE_FIXTURE_CANARY')

    def test_symlink_is_retired_without_following_its_target(self):
        target = self.write('private-target')
        source = self.base / 'node-link'
        source.symlink_to(target)
        destination = self.base / 'quarantine/link'
        r.safe_move(source, destination, r.fingerprint(source))
        self.assertTrue(destination.is_symlink())
        self.assertEqual(os.readlink(destination), str(target))
        self.assertEqual(target.read_bytes(), b'PRIVATE_FIXTURE_CANARY')

    def test_collision_and_replaced_source_do_not_overwrite_either_file(self):
        source = self.write('source')
        destination = self.write('destination', b'KEEP_DESTINATION')
        with self.assertRaisesRegex(r.Rejected, 'MOVE_CHANGED'):
            r.safe_move(source, destination, r.fingerprint(source))
        self.assertEqual(destination.read_bytes(), b'KEEP_DESTINATION')
        expected = r.fingerprint(source)
        source.chmod(0o640)
        destination.unlink()
        with self.assertRaisesRegex(r.Rejected, 'MOVE_CHANGED'):
            r.safe_move(source, destination, expected)
        self.assertTrue(source.exists())
        self.assertFalse(destination.exists())

    def test_destination_symlink_ancestor_causes_no_outside_directory_creation(self):
        source = self.write('source')
        outside = self.base / 'outside'
        outside.mkdir(mode=0o700)
        link = self.base / 'quarantine'
        link.symlink_to(outside, target_is_directory=True)
        with self.assertRaises((r.Rejected, OSError)):
            r.safe_move(source, link / 'unexpected' / 'file', r.fingerprint(source))
        self.assertEqual(list(outside.iterdir()), [])
        self.assertTrue(source.exists())

    def test_failed_destination_open_releases_source_directory_descriptor(self):
        source = self.write('source')
        expected = r.fingerprint(source)
        opened = []
        original = r.parent_fd
        def parent(path):
            if str(path) == str(self.base / 'destination'):
                raise PermissionError('injected destination rejection')
            result = original(path)
            opened.append(result[0])
            return result
        with patch.object(r, 'parent_fd', side_effect=parent), self.assertRaises(PermissionError):
            r.safe_move(source, self.base / 'destination', expected)
        for fd in set(opened):
            with self.assertRaises(OSError):
                os.fstat(fd)

    def test_read_rejects_symlink_hardlink_and_group_writable_file(self):
        file = self.write('private')
        alias = self.base / 'alias'
        alias.symlink_to(file)
        with self.assertRaises(OSError):
            r.read(alias)
        alias.unlink()
        os.link(file, alias)
        with self.assertRaisesRegex(r.Rejected, 'FILE'):
            r.read(file)
        alias.unlink()
        file.chmod(0o620)
        with self.assertRaisesRegex(r.Rejected, 'FILE'):
            r.read(file)

    def test_journal_preserves_previous_version_on_interrupted_replace(self):
        q = self.base / 'quarantine'
        q.mkdir(mode=0o700)
        state = {'phase': 'MOVING', 'next': '/fixture/one'}
        r.journal(q, state)
        before = (q / 'journal.json').read_bytes()
        with patch.object(r.os, 'replace', side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):
                r.journal(q, state, 'ACCOUNTS')
        self.assertEqual((q / 'journal.json').read_bytes(), before)
        pending = [path for path in q.iterdir() if path.name != 'journal.json']
        self.assertEqual(len(pending), 1)
        self.assertEqual(r.decoded(pending[0].read_bytes())['phase'], 'ACCOUNTS')
        r.journal(q, state, 'RESTORING')
        self.assertEqual(r.decoded((q / 'journal.json').read_bytes())['phase'], 'RESTORING')
        self.assertTrue(pending[0].exists())  # Interrupted evidence is not deleted.

    def fixture_restore(self, moved=0):
        q = self.base / 'quarantine'
        q.mkdir(mode=0o700)
        unit = self.write('live/system/fixture.service', b'[Unit]\nDescription=fixture\n')
        link = self.base / 'live/system/default.target.wants/fixture.service'
        link.parent.mkdir(mode=0o700)
        link.symlink_to(unit)
        node = self.base / 'live/node'
        node.symlink_to('/fixture/unexecuted/node')
        config = self.write('live/config/private-config')
        guard = config.parent / '.activation.lock'
        guard.write_text('a' * 64 + '\n')
        guard.chmod(0o600)
        paths = tuple(map(str, (link, unit, node, config.parent)))
        state = {'schemaVersion': 1, 'releaseId': r.R8, 'phase': 'MOVING', 'token': 'a' * 64,
                 'originals': {p: r.fingerprint(p) for p in paths}}
        r.journal(q, state)
        for path in paths[:moved]:
            state['next'] = path
            r.journal(q, state)
            r.safe_move(path, q / 'original' / path.lstrip('/'), state['originals'][path])
        return q, state, paths, str(guard)

    def patch_restore(self, paths, guard, accounts):
        stack = ExitStack()
        stack.enter_context(patch.object(r, 'MOVES', paths))
        stack.enter_context(patch.object(r, 'LINKS', (paths[0],)))
        stack.enter_context(patch.object(r, 'GUARD', guard))
        stack.enter_context(patch.object(r, 'UNITS', ('fixture.service',)))
        stack.enter_context(patch.object(r, 'unit_state', return_value={
            'ActiveState': 'inactive', 'MainPID': '0', 'ControlPID': '0'}))
        stack.enter_context(patch.object(r, 'process_check'))
        stack.enter_context(patch.object(r, 'check_mounts'))
        stack.enter_context(accounts.patch(filesystem_read=r.read))
        return stack

    def test_each_interrupted_move_restores_files_and_accounts_but_not_autostart(self):
        for moved in range(5):
            with self.subTest(moved=moved):
                isolated = self.base / str(moved)
                isolated.mkdir(mode=0o700)
                old_base, self.base = self.base, isolated
                try:
                    q, state, paths, guard = self.fixture_restore(moved)
                    accounts = Accounts()
                    with self.patch_restore(paths, guard, accounts):
                        r.rename_accounts()
                        r.restore_stopped(q, state)
                    self.assertEqual(state['phase'], 'RESTORED_STOPPED')
                    self.assertFalse(os.path.lexists(paths[0]))
                    self.assertTrue(os.path.lexists(q / 'original' / paths[0].lstrip('/')))
                    for path in paths[1:]:
                        self.assertEqual(r.fingerprint(path), state['originals'][path])
                    self.assertFalse(os.path.lexists(guard))
                    self.assertEqual(accounts.users, Accounts().users)
                    self.assertFalse(any(cmd[:2] in (('/usr/bin/systemctl', 'start'),
                        ('/usr/bin/systemctl', 'enable')) for cmd in accounts.commands))
                finally:
                    self.base = old_base

    def test_restore_collision_refuses_before_account_or_filesystem_mutation(self):
        q, state, paths, guard = self.fixture_restore(4)
        collision = Path(paths[1])
        collision.write_bytes(b'NEW_INSTALL_CANARY')
        accounts = Accounts()
        with self.patch_restore(paths, guard, accounts), self.assertRaisesRegex(r.Rejected, 'RESTORE_PATH_CONFLICT'):
            r.restore_stopped(q, state)
        self.assertEqual(accounts.mutations, 0)
        self.assertEqual(collision.read_bytes(), b'NEW_INSTALL_CANARY')
        self.assertEqual(state['phase'], 'MOVING')

    def test_changed_guard_refuses_before_restoring_accounts_or_paths(self):
        q, state, paths, guard = self.fixture_restore(4)
        saved_guard = q / 'original' / guard.lstrip('/')
        saved_guard.write_text('UNKNOWN_GUARD_CANARY\n')
        accounts = Accounts()
        with self.patch_restore(paths, guard, accounts), self.assertRaisesRegex(r.Rejected, 'RESTORE_GUARD_CHANGED'):
            r.restore_stopped(q, state)
        self.assertEqual(accounts.mutations, 0)
        self.assertTrue(saved_guard.exists())
        self.assertFalse(os.path.lexists(paths[1]))

    def test_restore_resumes_after_each_actual_file_rename(self):
        for interruption in range(1, 4):
            with self.subTest(after=interruption):
                isolated = self.base / str(interruption)
                isolated.mkdir(mode=0o700)
                old_base, self.base = self.base, isolated
                try:
                    q, state, paths, guard = self.fixture_restore(4)
                    accounts = Accounts()
                    real_move = r.safe_move
                    count = 0
                    def interrupted_move(*args):
                        nonlocal count
                        real_move(*args)
                        count += 1
                        if count == interruption:
                            raise KeyboardInterrupt('after actual restore rename')
                    with self.patch_restore(paths, guard, accounts):
                        with patch.object(r, 'safe_move', side_effect=interrupted_move):
                            with self.assertRaises(KeyboardInterrupt):
                                r.restore_stopped(q, state)
                        persisted = r.decoded((q / 'journal.json').read_bytes())
                        self.assertEqual(persisted['phase'], 'RESTORING')
                        r.restore_stopped(q, persisted)
                    self.assertEqual(persisted['phase'], 'RESTORED_STOPPED')
                    self.assertFalse(os.path.lexists(paths[0]))
                    self.assertFalse(os.path.lexists(guard))
                finally:
                    self.base = old_base

    def test_restore_resumes_after_own_guard_removal_before_final_journal(self):
        q, state, paths, guard = self.fixture_restore(4)
        accounts = Accounts()
        fail = True
        def run(args, **kwargs):
            nonlocal fail
            if args == ['/usr/bin/systemctl', 'daemon-reload'] and fail:
                fail = False
                raise KeyboardInterrupt('after guard removal')
            return accounts.run(args, **kwargs)
        with self.patch_restore(paths, guard, accounts), patch.object(r, 'run', side_effect=run):
            with self.assertRaises(KeyboardInterrupt):
                r.restore_stopped(q, state)
            persisted = r.decoded((q / 'journal.json').read_bytes())
            self.assertEqual(persisted['phase'], 'RESTORING')
            self.assertFalse(os.path.lexists(guard))
            r.restore_stopped(q, persisted)
        self.assertEqual(persisted['phase'], 'RESTORED_STOPPED')
        self.assertFalse(os.path.lexists(paths[0]))

    def test_active_unit_refuses_restore_before_any_identity_mutation(self):
        q, state, paths, guard = self.fixture_restore(4)
        accounts = Accounts()
        with self.patch_restore(paths, guard, accounts), patch.object(r, 'unit_state', return_value={
                'ActiveState': 'active', 'MainPID': '101', 'ControlPID': '0'}):
            with self.assertRaisesRegex(r.Rejected, 'RESTORE_UNIT_BUSY'):
                r.restore_stopped(q, state)
        self.assertEqual(accounts.mutations, 0)
        self.assertFalse(os.path.lexists(paths[1]))

    def test_complete_retirement_and_restore_keep_order_and_private_tree(self):
        """All 24 real moves, 14 manifest-bound units, six roots and journal phases.

        OS services/accounts/processes/mounts are models. Identity files use a
        small fixture manifest with its actual SHA-256 as the fixture release ID;
        production release pins and installed code are never executed/changed.
        """
        live = self.base / 'live'
        q = self.base / 'quarantine'
        q.mkdir(mode=0o700)
        original_moves, original_links, original_units = r.MOVES, r.LINKS, r.UNIT_PATHS
        def mapped(path):
            value = str(path)
            return live / value.lstrip('/') if value.startswith(('/opt/nexowatt/eos/',
                '/etc/nexowatt-eos/', '/etc/systemd/system/')) else Path(path)
        for root in r.ROOTS:
            directory = live / root.lstrip('/')
            directory.mkdir(parents=True, mode=0o700)
            (directory / 'fixture-private').write_bytes(b'PRIVATE_FIXTURE_CANARY')
        files = []
        for unit in r.UNITS:
            path = live / 'etc/systemd/system' / unit
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            data = ('[Unit]\nDescription=fixture ' + unit + '\n').encode()
            path.write_bytes(data)
            path.chmod(0o644)
            files.append({'path': 'system/postgresql-test/systemd/' + unit,
                          'sha256': hashlib.sha256(data).hexdigest()})
        manifest = json.dumps({'sequence': 11, 'nodeVersion': '24.21.0', 'profile': 'test', 'files': files}).encode()
        release = hashlib.sha256(manifest).hexdigest()
        verified = live / 'opt/nexowatt/eos/verified' / release
        verified.mkdir(parents=True, mode=0o700)
        (verified / 'manifest.json').write_bytes(manifest)
        (live / 'opt/nexowatt/eos/current').symlink_to('/opt/nexowatt/eos/releases/' + release)
        config = live / 'etc/nexowatt-eos'
        (config / 'release-state.json').write_text(json.dumps({'schemaVersion': 1, 'releaseId': release,
            'sequence': 11, 'nodeVersion': '24.21.0', 'publicKeySha256': r.R8_KEY, 'profile': 'test'}))
        (config / 'first-start-complete.json').write_text(json.dumps({'releaseId': release,
            'physicalControlEnabled': False}))
        for link in original_links:
            path = live / link.lstrip('/')
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            path.symlink_to('/etc/systemd/system/' + path.name)
        node = live / 'usr/bin/node'
        node.parent.mkdir(parents=True, mode=0o700)
        node.symlink_to(r.NODE)
        moves = tuple(str(live / p.lstrip('/')) for p in original_moves)
        links = tuple(str(live / p.lstrip('/')) for p in original_links)
        units = tuple(str(live / p.lstrip('/')) for p in original_units)
        guard = str(config / '.activation.lock')
        state = {'schemaVersion': 1, 'releaseId': release, 'token': 'a' * 64, 'phase': 'PREPARED',
                 'originals': {p: r.fingerprint(p) for p in moves}}
        r.journal(q, state)
        events = []
        accounts = Accounts()
        actual_read, actual_info, actual_link, actual_move = r.read, r.info, os.readlink, r.safe_move
        account_run = accounts.run
        def command(args, **kwargs):
            if args[0] in ('/usr/sbin/groupmod', '/usr/sbin/usermod'):
                events.append(('account', args[0]))
            elif args == ['/usr/bin/systemctl', 'daemon-reload']:
                events.append(('reload',))
            return account_run(args, **kwargs)
        accounts.run = command
        def move(source, destination, expected):
            events.append(('move', str(source)))
            actual_move(source, destination, expected)
        with patch.object(r, 'R8', release), patch.object(r, 'MOVES', moves), \
                patch.object(r, 'LINKS', links), patch.object(r, 'UNIT_PATHS', units), \
                patch.object(r, 'GUARD', guard), \
                patch.object(r, 'info', side_effect=lambda p: actual_info(mapped(p))), \
                patch.object(r.os, 'readlink', side_effect=lambda p: actual_link(mapped(p))), \
                patch.object(r, 'stop_eos', side_effect=lambda: events.append(('stopped',))), \
                patch.object(r, 'check_mounts'), patch.object(r, 'process_check'), \
                patch.object(r, 'unit_state', return_value={'ActiveState': 'inactive', 'MainPID': '0', 'ControlPID': '0'}), \
                accounts.patch(filesystem_read=lambda p, *args: actual_read(mapped(p), *args)), \
                patch.object(r, 'safe_move', side_effect=move):
            r.retire(q, state)
            self.assertEqual(state['phase'], 'RETIRED')
            self.assertEqual(events[0], ('stopped',))
            last_unit = events.index(('move', units[-1]))
            first_root = events.index(('move', str(live / r.ROOTS[0].lstrip('/'))))
            self.assertLess(last_unit, events.index(('reload',)))
            self.assertLess(events.index(('reload',)), first_root)
            last_move = max(i for i, event in enumerate(events) if event[0] == 'move')
            self.assertGreater(next(i for i, event in enumerate(events) if event[0] == 'account'), last_move)
            for path in moves:
                self.assertFalse(os.path.lexists(path))
                self.assertEqual(r.fingerprint(q / 'original' / path.lstrip('/')), state['originals'][path])
            self.assertEqual((q / 'original' / guard.lstrip('/')).read_text(), 'a' * 64 + '\n')
            r.check_accounts(preserved=True)
            r.restore_stopped(q, state)
            r.check_identity()
        self.assertEqual(state['phase'], 'RESTORED_STOPPED')
        self.assertFalse(os.path.lexists(guard))
        self.assertTrue(all(not os.path.lexists(path) for path in links))
        self.assertTrue(all(os.path.lexists(path) for path in moves if path not in links))
        self.assertEqual(accounts.users, Accounts().users)


if __name__ == '__main__':
    unittest.main()
