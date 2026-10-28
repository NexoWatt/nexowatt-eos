#!/usr/bin/python3
"""Privacy and read-only boundaries of the planning probe; no real Pi mutation."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[2] / 'tools/system/inspect-r8-removal.py'
SPEC = importlib.util.spec_from_file_location('r8_inspection', SOURCE)
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class Inspection(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, text):
        file = self.base / 'input'
        file.write_text(text)
        return file

    def test_valid_identity_selects_only_public_boolean_facts(self):
        p = self.write(json.dumps({'releaseId': probe.R8, 'sequence': 11, 'profile': 'test',
                                  'nodeVersion': '24.21.0', 'password': 'CANARY_PRIVATE_VALUE'}))
        value = probe.identity(p)
        self.assertTrue(all(value.values()))
        self.assertNotIn('CANARY', json.dumps(value))

    def test_boolean_sequence_is_not_an_integer_sequence(self):
        p = self.write(json.dumps({'releaseId': probe.R8, 'sequence': True}))
        self.assertFalse(probe.identity(p)['sequence11'])

    def test_unknown_identity_is_not_echoed(self):
        value = probe.identity(self.write('{"releaseId":"PRIVATE_UNKNOWN_ID"}'))
        self.assertFalse(value['knownR8Release'])
        self.assertNotIn('PRIVATE_UNKNOWN_ID', json.dumps(value))

    def test_duplicate_keys_rejected(self):
        self.assertEqual(probe.identity(self.write('{"sequence":11,"sequence":16}')), {'validObject': False})

    def test_json_type_rejected(self):
        self.assertEqual(probe.identity(self.write('[]')), {'validObject': False})

    def test_completion_requires_explicit_false(self):
        p = self.write(json.dumps({'releaseId': probe.R8, 'physicalControlEnabled': False}))
        self.assertTrue(probe.identity(p, True)['physicalControlExplicitlyDisabled'])
        p.write_text(json.dumps({'releaseId': probe.R8, 'physicalControlEnabled': 0}))
        self.assertFalse(probe.identity(p, True)['physicalControlExplicitlyDisabled'])

    def test_final_symlink_is_not_read(self):
        target = self.write('PRIVATE_CANARY')
        link = self.base / 'link'
        link.symlink_to(target)
        self.assertEqual(probe.identity(link), {'validObject': False})
        self.assertEqual(probe.metadata(link, True)['type'], 'symlink')

    def test_symlink_ancestor_is_not_followed(self):
        real = self.base / 'real'
        real.mkdir()
        (real / 'secret').write_text('PRIVATE_CANARY')
        link = self.base / 'link'
        link.symlink_to(real, target_is_directory=True)
        self.assertEqual(probe.metadata(link / 'secret', True)['type'], 'unreadable-or-unsafe')

    def test_hardlinked_content_is_not_read(self):
        p = self.write('{}')
        os.link(p, self.base / 'alias')
        self.assertEqual(probe.identity(p), {'validObject': False})

    def test_oversize_content_rejected(self):
        with self.assertRaises(ValueError):
            probe.read_regular(self.write('A' * 100), 99)

    def test_fifo_never_blocks_or_reads(self):
        p = self.base / 'pipe'
        os.mkfifo(p)
        with self.assertRaises(ValueError):
            probe.read_regular(p)

    def test_metadata_never_prints_content(self):
        p = self.write('PRIVATE_CANARY')
        value = probe.metadata(p, True)
        self.assertEqual(len(value['sha256']), 64)
        self.assertNotIn('PRIVATE_CANARY', json.dumps(value))

    def test_links_report_only_exact_equality(self):
        p = self.base / 'link'
        p.symlink_to('/private/operator/path')
        self.assertFalse(probe.link_matches(p, probe.NODE))

    def test_child_count_is_bounded_and_omits_names(self):
        for i in range(257):
            (self.base / str(i)).touch()
        self.assertEqual(probe.child_count(self.base), 'more-than-256')

    def test_account_fields_redact_foreign_users_and_gecos(self):
        users = b'eos-runtime:x:500:500:PRIVATE_GECOS:/nonexistent:/usr/sbin/nologin\nforeign-person:x:501:500:PRIVATE_GECOS:/private/home:/bin/bash\n'
        groups = b'eos-runtime:x:500:foreign-person\nother:x:501:eos-runtime\n'
        with patch.object(probe, 'read_regular', side_effect=[users, groups]):
            result = probe.accounts()
        self.assertEqual(result['eos-runtime']['otherPrimaryUsers'], 1)
        self.assertEqual(result['eos-runtime']['foreignGroupMembers'], 1)
        self.assertEqual(result['eos-runtime']['extraGroups'], 1)
        self.assertNotIn('PRIVATE', json.dumps(result))
        self.assertNotIn('foreign-person', json.dumps(result))

    def test_package_query_failure_does_not_mean_unowned(self):
        with patch.object(probe, 'query', return_value=None):
            self.assertEqual(probe.package_owner('/usr/bin/node'), 'unknown')

    def test_timeout_does_not_echo_subprocess_error(self):
        with patch.object(probe.subprocess, 'run', side_effect=probe.subprocess.TimeoutExpired('PRIVATE_COMMAND', 5)):
            self.assertIsNone(probe.query(['/usr/bin/dpkg', '--audit']))

    def test_queries_use_fixed_environment_and_timeout(self):
        with patch.object(probe.subprocess, 'run', return_value=probe.subprocess.CompletedProcess([], 0, b'OK', b'')) as run:
            self.assertEqual(probe.query(['/usr/bin/dpkg', '--audit']), (0, 'OK'))
        self.assertEqual(run.call_args.kwargs['timeout'], 5)
        self.assertNotIn('HOME', run.call_args.kwargs['env'])
        self.assertNotIn('shell', run.call_args.kwargs)

    def test_cli_rejects_mutation_or_alternate_root_arguments(self):
        with patch.object(probe.sys, 'argv', ['inspect-r8-removal.py', '--apply']), patch('builtins.print') as out:
            self.assertEqual(probe.main(), 1)
        self.assertEqual(out.call_args.args, ('R8_INSPECT_LINUX_ROOT_NO_ARGUMENTS_REQUIRED',))


if __name__ == '__main__':
    unittest.main()
