"""Offline R8 Admin repair contracts; no real services or database are contacted."""
import ast
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'tools/system/complete-r8-admin-setup.py'
SQL = SOURCE.with_suffix('.sql')
spec = importlib.util.spec_from_file_location('complete_r8_admin_setup', SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
REAL_PATH = Path
SECRET = 'PRIVATE_DATABASE_DIAGNOSTIC_FIXTURE_DO_NOT_OUTPUT'


def state():
    return {'schemaVersion': 1, 'sequence': 11, 'releaseId': m.RELEASE,
            'publicKeySha256': m.KEY}


def completion():
    return {'schemaVersion': 1, 'releaseId': m.RELEASE, 'setupId': 'ab' * 16,
            'completedAt': '2026-10-05T17:36:00.000Z',
            'licenseConfigured': True, 'physicalControlEnabled': False}


class PureContracts(unittest.TestCase):
    def test_published_r8_and_sibling_sql_pins(self):
        self.assertEqual(m.RELEASE, 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7')
        self.assertEqual(m.KEY, 'bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5')
        self.assertEqual(m.SQL_SHA256, hashlib.sha256(SQL.read_bytes()).hexdigest())

    def test_strict_release_and_completed_marker(self):
        m.validate_records(state(), completion())
        bad_states = [{'releaseId': '00' * 32}, {'publicKeySha256': '00' * 32},
                      {'sequence': 10}, {'schemaVersion': True}]
        for change in bad_states:
            with self.subTest(change=change), self.assertRaises(ValueError):
                m.validate_records({**state(), **change}, completion())
        bad_completions = [{'releaseId': '00' * 32}, {'physicalControlEnabled': True},
                           {'setupId': ''}, {'setupId': 'unbound'}, {'setupId': 'AB' * 16},
                           {'schemaVersion': True}, {'licenseConfigured': 'true'},
                           {'completedAt': 'not-a-date'}]
        for change in bad_completions:
            with self.subTest(change=change), self.assertRaises(ValueError):
                m.validate_records(state(), {**completion(), **change})

    def test_trusted_rejects_symlink_writable_or_foreign_owner(self):
        safe = types.SimpleNamespace(st_mode=stat.S_IFDIR | 0o755, st_uid=0)
        for bad in [types.SimpleNamespace(st_mode=stat.S_IFLNK | 0o777, st_uid=0),
                    types.SimpleNamespace(st_mode=stat.S_IFDIR | 0o777, st_uid=0),
                    types.SimpleNamespace(st_mode=stat.S_IFDIR | 0o755, st_uid=1000)]:
            with patch.object(REAL_PATH, 'lstat', side_effect=lambda p=None: bad):
                with self.assertRaisesRegex(ValueError, 'ADMIN_SETUP_OWNER'):
                    m.trusted('/protected/file')
        with patch.object(REAL_PATH, 'lstat', return_value=safe):
            self.assertIs(m.trusted('/protected/file'), safe)
            with self.assertRaisesRegex(ValueError, 'ADMIN_SETUP_PATH'):
                m.trusted('relative')

    def test_run_uses_fixed_environment_timeout_no_shell_and_private_output(self):
        with patch.object(m.subprocess, 'run') as execute:
            m.run(['/fixed/tool'], input=b'fixture SQL')
        self.assertEqual(execute.call_args.args, (['/fixed/tool'],))
        self.assertEqual(execute.call_args.kwargs, {
            'env': {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LC_ALL': 'C'},
            'capture_output': True, 'timeout': 30, 'check': False, 'input': b'fixture SQL'})


class Workflow(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='eos-admin-r8-contract-')
        self.base = REAL_PATH(self.tmp.name)
        self.directory = self.base / 'etc/nexowatt-eos'
        self.directory.mkdir(parents=True)
        self.release_dir = self.base / 'opt/nexowatt/eos/releases' / m.RELEASE
        self.release_dir.mkdir(parents=True)
        self.current = self.release_dir.parent.parent / 'current'
        self.current.symlink_to('/opt/nexowatt/eos/releases/' + m.RELEASE)
        self.script = self.base / 'private/complete-r8-admin-setup.py'
        self.script.parent.mkdir(mode=0o700)
        self.script.write_bytes(SOURCE.read_bytes())
        self.script.with_suffix('.sql').write_bytes(SQL.read_bytes())
        self.sql_bytes = SQL.read_bytes()
        self.write_json('release-state.json', state())
        self.write_json('first-start-complete.json', completion())
        self.lock = self.directory / '.activation.lock'
        self.calls = []
        self.database_result = subprocess.CompletedProcess([], 0, b'EOS_R8_ADMIN_SETUP_COMPLETE\n', b'')
        self.real_lstat = REAL_PATH.lstat
        self.patches = [
            patch.object(m, 'DIRECTORY', self.directory),
            patch.object(m, '__file__', str(self.script)),
            patch.object(m, 'SQL_SHA256', hashlib.sha256(self.sql_bytes).hexdigest()),
            patch.object(m, 'Path', side_effect=self.remap),
            patch.object(m, 'trusted', side_effect=self.trusted_fixture),
            patch.object(REAL_PATH, 'lstat', autospec=True, side_effect=self.lstat_fixture),
            patch.object(m.os, 'geteuid', return_value=0),
            patch.object(m.os, 'umask'), patch.object(m.signal, 'signal'),
            patch.object(sys, 'argv', [str(self.script)]),
            patch.object(m, 'run', side_effect=self.command),
        ]
        for item in self.patches:
            item.start()
        self.addCleanup(self.cleanup)

    def cleanup(self):
        for item in reversed(self.patches):
            item.stop()
        self.tmp.cleanup()

    def remap(self, value):
        value = REAL_PATH(value)
        if str(value).startswith('/opt/nexowatt/eos/'):
            return self.base / str(value).lstrip('/')
        return value

    def trusted_fixture(self, value):
        value = self.remap(value)
        if str(value).startswith('/usr/'):
            return types.SimpleNamespace(st_mode=stat.S_IFREG | 0o755, st_uid=0)
        info = value.lstat()
        # Ownership/trust is independently covered above. Main-flow tests operate
        # in disposable files without depending on the executor's account UID.
        return info

    def lstat_fixture(self, value, *args, **kwargs):
        info = self.real_lstat(value, *args, **kwargs)
        if REAL_PATH(value) == self.current:
            fields = list(info)
            fields[4] = 0
            return os.stat_result(fields)
        return info

    def write_json(self, name, value):
        (self.directory / name).write_text(json.dumps(value), encoding='utf8')

    def command(self, args, **kwargs):
        self.calls.append((args, kwargs))
        if args[0] == '/usr/bin/systemctl':
            return subprocess.CompletedProcess(args, 0, b'active\nactive\n', b'')
        self.assertTrue(self.lock.exists())
        self.assertEqual(stat.S_IMODE(self.lock.stat().st_mode), 0o600)
        self.assertEqual(kwargs, {'input': self.sql_bytes})
        return self.database_result

    def database_calls(self):
        return [call for call in self.calls if call[0][0] == '/usr/sbin/runuser']

    def invoke_entry(self):
        # Execute the real CLI exception handler with mocked main dependencies;
        # do not implement a second version of its error sanitization here.
        tree = ast.parse(SOURCE.read_text())
        guard = tree.body[-1]
        self.assertIsInstance(guard, ast.If)
        namespace = vars(m).copy()
        namespace['__name__'] = '__main__'
        out, err = io.StringIO(), io.StringIO()
        status = 0
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            try:
                exec(compile(ast.Module(body=[guard], type_ignores=[]), str(SOURCE), 'exec'), namespace)
            except SystemExit as result:
                status = result.code
        return status, out.getvalue(), err.getvalue()

    def test_success_changes_no_release_records_and_removes_only_own_lock(self):
        before = {p.name: p.read_bytes() for p in self.directory.iterdir()}
        status, out, err = self.invoke_entry()
        self.assertEqual(status, 0)
        self.assertEqual(json.loads(out), {'ok': True, 'status': 'ADMIN_SETUP_COMPLETED', 'restartRequired': False})
        self.assertEqual(err, '')
        self.assertFalse(self.lock.exists())
        self.assertEqual({p.name: p.read_bytes() for p in self.directory.iterdir()}, before)
        self.assertEqual(len(self.database_calls()), 1)
        args = self.database_calls()[0][0]
        self.assertEqual(args, ['/usr/sbin/runuser', '-u', 'eos-postgres', '--',
            '/usr/lib/postgresql/17/bin/psql', '-X', '-w', '-q', '-t', '-A',
            '--set=ON_ERROR_STOP=1', '-h', '/run/nexowatt-eos-postgresql',
            '-p', '15432', '-U', 'eos_bootstrap', '-d', 'eos'])

    def test_foreign_release_or_incomplete_marker_stops_before_commands(self):
        for name, value in [('release-state.json', {**state(), 'sequence': 10}),
                            ('release-state.json', {**state(), 'releaseId': '00' * 32}),
                            ('release-state.json', {**state(), 'publicKeySha256': '00' * 32}),
                            ('first-start-complete.json', {**completion(), 'physicalControlEnabled': True}),
                            ('first-start-complete.json', {**completion(), 'setupId': ''})]:
            with self.subTest(name=name, value=value):
                self.write_json('release-state.json', state())
                self.write_json('first-start-complete.json', completion())
                self.write_json(name, value)
                status, out, err = self.invoke_entry()
                self.assertEqual(status, 1)
                self.assertEqual(out, '')
                self.assertFalse(json.loads(err)['ok'])
                self.assertEqual(self.calls, [])
                self.assertFalse(self.lock.exists())

    def test_missing_completion_stops_before_commands(self):
        (self.directory / 'first-start-complete.json').unlink()
        status, _, err = self.invoke_entry()
        self.assertEqual(status, 1)
        self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_FAILED')
        self.assertEqual(self.calls, [])

    def test_maintenance_file_and_dangling_symlink_are_preserved(self):
        permit = self.directory / 'maintenance-start.json'
        for symlink in (False, True):
            with self.subTest(symlink=symlink):
                if symlink:
                    permit.symlink_to(self.base / 'missing-permit')
                else:
                    permit.write_text('retained maintenance')
                status, _, err = self.invoke_entry()
                self.assertEqual(status, 1)
                self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_MAINTENANCE')
                self.assertTrue(os.path.lexists(permit))
                self.assertEqual(self.calls, [])
                self.assertFalse(self.lock.exists())
                permit.unlink()

    def test_wrong_current_pointer_stops_before_commands(self):
        self.current.unlink()
        self.current.symlink_to('/opt/nexowatt/eos/releases/' + '00' * 32)
        status, _, err = self.invoke_entry()
        self.assertEqual(status, 1)
        self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_R8_POINTER')
        self.assertEqual(self.calls, [])

    def test_existing_lock_regular_directory_and_symlink_are_never_removed(self):
        for kind in ('file', 'directory', 'symlink'):
            with self.subTest(kind=kind):
                if kind == 'file': self.lock.write_text('prior lock')
                elif kind == 'directory': self.lock.mkdir()
                else: self.lock.symlink_to(self.base / 'missing-lock-target')
                identity = self.lock.lstat()
                status, _, _ = self.invoke_entry()
                self.assertEqual(status, 1)
                self.assertEqual(self.database_calls(), [])
                self.assertEqual(self.lock.lstat().st_ino, identity.st_ino)
                if kind == 'directory': self.lock.rmdir()
                else: self.lock.unlink()

    def test_database_error_removes_own_lock_and_never_prints_diagnostics(self):
        self.database_result = subprocess.CompletedProcess([], 1, SECRET.encode(), SECRET.encode())
        status, out, err = self.invoke_entry()
        self.assertEqual(status, 1)
        self.assertEqual(out, '')
        self.assertEqual(json.loads(err), {'ok': False, 'code': 'ADMIN_SETUP_DATABASE_REJECTED'})
        self.assertNotIn(SECRET, out + err)
        self.assertFalse(self.lock.exists())

    def test_success_exit_without_expected_database_marker_does_not_claim_success(self):
        self.database_result = subprocess.CompletedProcess([], 0, SECRET.encode(), b'')
        status, out, err = self.invoke_entry()
        self.assertEqual(status, 1)
        self.assertEqual(out, '')
        self.assertFalse(json.loads(err)['ok'])
        self.assertNotIn(SECRET, err)
        self.assertFalse(self.lock.exists())

    def test_database_timeout_removes_own_lock_and_uses_fixed_error(self):
        original = self.command
        def timeout(args, **kwargs):
            if args[0] == '/usr/sbin/runuser':
                raise subprocess.TimeoutExpired(SECRET, 30, SECRET.encode(), SECRET.encode())
            return original(args, **kwargs)
        with patch.object(m, 'run', side_effect=timeout):
            status, out, err = self.invoke_entry()
        self.assertEqual(status, 1)
        self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_FAILED')
        self.assertNotIn(SECRET, out + err)
        self.assertFalse(self.lock.exists())

    def test_replaced_lock_is_retained_even_after_database_success(self):
        original = self.command
        def replace(args, **kwargs):
            result = original(args, **kwargs)
            if args[0] == '/usr/sbin/runuser':
                self.lock.rename(self.base / 'original-owned-lock')
                self.lock.write_text('other operation')
            return result
        with patch.object(m, 'run', side_effect=replace):
            status, out, err = self.invoke_entry()
        self.assertEqual(status, 1)
        self.assertEqual(out, '')
        self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_LOCK_CHANGED')
        self.assertEqual(self.lock.read_text(), 'other operation')

    def test_release_change_after_lock_stops_before_database_and_cleans_owned_lock(self):
        original = self.command
        def change(args, **kwargs):
            result = original(args, **kwargs)
            if len(self.calls) == 1:
                self.write_json('release-state.json', {**state(), 'changed': True})
            return result
        with patch.object(m, 'run', side_effect=change):
            status, _, err = self.invoke_entry()
        self.assertEqual(status, 1)
        self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_RELEASE_CHANGED')
        self.assertEqual(self.database_calls(), [])
        self.assertFalse(self.lock.exists())

    def test_stopped_services_and_wrong_sql_hash_do_not_reach_database(self):
        with patch.object(m, 'run', return_value=subprocess.CompletedProcess([], 3, b'active\ninactive\n', b'')):
            status, _, err = self.invoke_entry()
            self.assertEqual(status, 1)
            self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_SERVICES_REQUIRED')
            self.assertFalse(self.lock.exists())
        self.script.with_suffix('.sql').write_bytes(self.sql_bytes + b'-- modified\n')
        status, _, err = self.invoke_entry()
        self.assertEqual(status, 1)
        self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_SQL_HASH')
        self.assertEqual(self.calls, [])

    def test_requires_root_and_no_arguments_before_any_read(self):
        for uid, argv in [(1000, [str(self.script)]), (0, [str(self.script), '--force'])]:
            with self.subTest(uid=uid), patch.object(m.os, 'geteuid', return_value=uid), \
                    patch.object(sys, 'argv', argv), patch.object(m, 'read') as reader:
                status, _, err = self.invoke_entry()
                self.assertEqual(status, 1)
                self.assertEqual(json.loads(err)['code'], 'ADMIN_SETUP_ROOT_NO_ARGUMENTS')
                reader.assert_not_called()
                self.assertEqual(self.calls, [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
