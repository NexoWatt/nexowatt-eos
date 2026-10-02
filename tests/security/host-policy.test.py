#!/usr/bin/env python3
"""Isolated policy-generator tests. All privileged operations are command stubs.

No installation, network, service change, real sudo or capability operation occurs.
Run: python3 tests/security/host-policy.test.py
"""
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
SOURCE = (REPO / 'installer_library.sh').read_text()
HELPERS = SOURCE[SOURCE.index('linux_sudo_policy_content() {'):SOURCE.index('\ncreate_user_freebsd() {')]
LEGACY = '''iobroker ALL=(ALL) ALL
iobroker ALL=(ALL) NOPASSWD: /usr/bin/systemd-run
iobroker ALL=(ALL) NOPASSWD: /usr/sbin/setcap
iobroker ALL=(ALL) NOPASSWD: /usr/bin/systemctl start
ALL ALL=NOPASSWD: /usr/bin/systemctl start iobroker
ALL ALL=NOPASSWD: /usr/bin/systemctl stop iobroker
ALL ALL=NOPASSWD: /usr/bin/systemctl restart iobroker
ALL ALL=(iobroker) NOPASSWD: /usr/bin/node /opt/iobroker/node_modules/iobroker.js-controller/iobroker.js *
'''
STUBS = r'''
SUDOX=privileged
ROOT_GROUP=root
CONTROLLER_DIR=/opt/iobroker/node_modules/iobroker.js-controller
IOB_USER=iobroker
USER=operator
IS_ROOT=false
id() {
    case "$1" in
        -u) printf '%s\n' "${MOCK_RUNTIME_UID:-1001}" ;;
        -gn) printf '%s\n' iobroker ;;
        -nG) printf '%s\n' "${MOCK_GROUPS:-iobroker}" ;;
        iobroker) return 0 ;;
        *) return 90 ;;
    esac
}
privileged() {
    local operation="$1" item
    shift
    printf '%s\n' "$operation $*" >> "$TEST_ROOT/operations.log"
    local mapped=()
    for item in "$@"; do
        case "$item" in
            /etc/sudoers.d*) item="$TEST_ROOT/policy${item#/etc/sudoers.d}" ;;
        esac
        mapped+=("$item")
    done
    case "$operation" in
        getcap) [ -z "${MOCK_CAPS:-}" ] || printf '%s %s\n' "$1" "$MOCK_CAPS" ;;
        setcap|chown|useradd|usermod|gpasswd) return 0 ;;
        setfacl) [ "${MOCK_ACL_FAIL:-false}" != true ] ;;
        visudo) [ "${MOCK_VISUDO_FAIL:-false}" != true ] ;;
        test) builtin test "${mapped[@]}" ;;
        cat|tee|mktemp|chmod|mv|rm) command "$operation" "${mapped[@]}" ;;
        *) printf 'UNEXPECTED PRIVILEGED COMMAND %s\n' "$operation" >&2; return 91 ;;
    esac
}
'''


class HostPolicyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='iob-policy-test-')
        self.root = Path(self.temp.name)
        (self.root / 'policy').mkdir()
        (self.root / 'bin').mkdir()
        fake_node = self.root / 'bin/node'
        fake_node.write_text('#!/bin/sh\nexit 99\n')
        fake_node.chmod(0o700)
        self.policy = self.root / 'policy/iobroker'

    def tearDown(self):
        self.temp.cleanup()

    def run_shell(self, body, **variables):
        env = dict(os.environ, TEST_ROOT=str(self.root), PATH=f'{self.root}/bin:{os.environ["PATH"]}')
        env.update(variables)
        return subprocess.run(['bash', '-s'], input=STUBS + HELPERS + '\n' + body,
                              text=True, capture_output=True, env=env, cwd=self.root)

    def operations(self):
        path = self.root / 'operations.log'
        return path.read_text() if path.exists() else ''

    def test_new_policy_grants_no_privileges_or_device_groups(self):
        result = self.run_shell('create_user_linux iobroker')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(all(not line or line.startswith('#') for line in self.policy.read_text().splitlines()))
        self.assertNotIn('setcap ', self.operations())
        self.assertNotIn('gpasswd ', self.operations())
        self.assertNotIn('usermod ', self.operations())
        self.assertNotIn('usermod -a -G docker', self.operations())

    def test_legacy_policy_replaced_and_unsafe_memberships_removed(self):
        self.policy.write_text(LEGACY)
        result = self.run_shell('create_user_linux iobroker', MOCK_GROUPS='iobroker docker redis dialout')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn('NOPASSWD', self.policy.read_text())
        self.assertIn('gpasswd -d iobroker docker', self.operations())
        self.assertIn('gpasswd -d iobroker redis', self.operations())
        self.assertNotIn('gpasswd -d iobroker dialout', self.operations())

    def test_existing_managed_policy_is_idempotent(self):
        self.assertEqual(self.run_shell('create_user_linux iobroker').returncode, 0)
        before = self.policy.read_bytes()
        self.assertEqual(self.run_shell('create_user_linux iobroker').returncode, 0)
        self.assertEqual(self.policy.read_bytes(), before)

    def test_custom_policy_aborts_without_replacing_or_stripping_caps(self):
        custom = LEGACY + 'operator ALL=(ALL) NOPASSWD: ALL\n'
        self.policy.write_text(custom)
        result = self.run_shell('create_user_linux iobroker', MOCK_CAPS='cap_net_bind_service,cap_net_raw=eip')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.policy.read_text(), custom)
        self.assertNotIn('mv ', self.operations())
        self.assertNotIn('setcap ', self.operations())

    def test_policy_symlink_is_rejected_without_target_change(self):
        target = self.root / 'target'
        target.write_text(LEGACY)
        self.policy.symlink_to(target)
        self.assertNotEqual(self.run_shell('create_user_linux iobroker').returncode, 0)
        self.assertEqual(target.read_text(), LEGACY)
        self.assertTrue(self.policy.is_symlink())

    def test_validation_failure_preserves_old_policy(self):
        self.policy.write_text(LEGACY)
        result = self.run_shell('create_user_linux iobroker', MOCK_VISUDO_FAIL='true')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.policy.read_text(), LEGACY)
        self.assertFalse(list((self.root / 'policy').glob('.iobroker-policy.*')))

    def test_both_known_legacy_capability_sets_are_removed(self):
        for caps in ('cap_net_bind_service,cap_net_admin,cap_net_raw=eip',
                     'cap_net_raw,cap_net_bind_service=eip'):
            with self.subTest(caps=caps):
                result = self.run_shell('create_user_linux iobroker', MOCK_CAPS=caps)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('setcap -r ', self.operations())

    def test_unexpected_capabilities_abort_before_policy_change(self):
        self.policy.write_text(LEGACY)
        result = self.run_shell('create_user_linux iobroker', MOCK_CAPS='cap_sys_admin=ep')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.policy.read_text(), LEGACY)
        self.assertNotIn('setcap ', self.operations())
        self.assertNotIn('mv ', self.operations())

    def test_old_policy_with_unexpected_command_is_not_recognized(self):
        self.policy.write_text(LEGACY + 'iobroker ALL=(ALL) NOPASSWD: /tmp/make\n')
        self.assertNotEqual(self.run_shell('create_user_linux iobroker').returncode, 0)
        self.assertIn('/tmp/make', self.policy.read_text())

    def test_standalone_custom_service_rule_is_not_treated_as_generated(self):
        content = 'iobroker ALL=(ALL) ALL\n'
        self.policy.write_text(content)
        self.assertNotEqual(self.run_shell('create_user_linux iobroker').returncode, 0)
        self.assertEqual(self.policy.read_text(), content)

    def test_runtime_account_with_uid_zero_is_rejected_before_policy_write(self):
        result = self.run_shell('create_user_linux iobroker', MOCK_RUNTIME_UID='0')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.policy.exists())
        self.assertNotIn('mv ', self.operations())

    def test_permissions_propagate_owner_and_acl_failures(self):
        definition = re.search(r'^fix_dir_permissions\(\) \{\n.*?^\}', SOURCE, re.M | re.S).group(0)
        for owner_fails, acl_fails in ((True, False), (False, True), (False, False)):
            with self.subTest(owner_fails=owner_fails, acl_fails=acl_fails):
                body = '''IOB_DIR="$TEST_ROOT/runtime"
FIXER_VERSION=""
change_owner() { return ''' + ('1' if owner_fails else '0') + '''; }
''' + definition + '\nfix_dir_permissions'
                result = self.run_shell(body, MOCK_ACL_FAIL=str(acl_fails).lower())
                self.assertEqual(result.returncode == 0, not (owner_fails or acl_fails), result.stderr)
                self.assertNotIn('tee ', self.operations())
                self.assertNotIn('usermod ', self.operations())

    def test_redis_helpers_refuse_without_host_operations(self):
        for name in ('install_redis', 'configure_iobroker_redis'):
            with self.subTest(helper=name):
                definition = re.search(r'^' + name + r'\(\) \{\n.*?^\}', SOURCE, re.M | re.S).group(0)
                result = self.run_shell(definition + '\n' + name)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.operations(), '')
                self.assertFalse(self.policy.exists())

    def test_version_policy_uses_supplied_json_without_network(self):
        header = SOURCE[:SOURCE.index('function get_lib_version()')]
        script = '''curl() { printf UNEXPECTED_NETWORK >&2; return 91; }
''' + header + '''\nprintf 'NODE=%s ACCEPTED=%s\\n' "$NODE_MAJOR" "$NODE_ACCEPTED"\n'''
        result = self.run_shell(script, EOS_VERSIONS_JSON='{"nodeJsRecommended":24,"nodeJsAccepted":[22,24,26]}')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('NODE=24 ACCEPTED=22 24 26', result.stdout)
        self.assertNotIn('UNEXPECTED_NETWORK', result.stderr)

    def test_npm_wrappers_preserve_literal_arguments_and_directory_boundary(self):
        fake = self.root / 'bin/npm'
        fake.write_text('#!/bin/bash\nprintf "<%s>\\n" "$@"\n')
        fake.chmod(0o700)
        for name in ('change_npm_command_user', 'change_npm_command_root'):
            with self.subTest(wrapper=name):
                function = SOURCE[SOURCE.index(name + '() {'):]
                assignment = re.search(r'    NPM_COMMAND_FIX=\$\(\n.*?\n    \)', function, re.S).group(0)
                script = '''IOB_DIR="$TEST_ROOT/runtime"
IOB_USER=iobroker
mkdir -p "$IOB_DIR" "$TEST_ROOT/runtime-other"
sudo() { printf 'SUDO_BRANCH\\n'; shift 4; "$@"; }
''' + assignment + '''
printf '%s\\n' "$NPM_COMMAND_FIX" > "$TEST_ROOT/npm-wrapper"
source "$TEST_ROOT/npm-wrapper"
cd "$TEST_ROOT/runtime-other"
npm view 'pkg; printf INJECTED_MARKER' 'a b'
cd "$IOB_DIR"
npm view 'pkg; printf INJECTED_MARKER' 'a b'
'''
                # Stub removes -H -u iobroker -- (four tokens); executable is retained.
                result = self.run_shell(script)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout.count('SUDO_BRANCH'), 1)
                self.assertEqual(result.stdout.count('<pkg; printf INJECTED_MARKER>'), 2)
                self.assertEqual(result.stdout.count('<a b>'), 2)
                self.assertNotIn('\nINJECTED_MARKER', result.stdout)


if __name__ == '__main__':
    unittest.main(verbosity=2)
