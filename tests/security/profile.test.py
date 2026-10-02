#!/usr/bin/env python3
"""Isolated behavior tests for EOS profile functions; never runs host maintenance.

Only source function definitions, truncated entry-point preflights, and explicitly
path-mapped helpers with privileged executables replaced by inert fixtures run.
No test executes the body of the installer/fixer or contacts an energy device.
"""
import configparser
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
PROFILE = REPO / 'security/profile-common.sh'
CLEAN_ENV = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': '/nonexistent', 'LANG': 'C'}


def bash(script, args=()):
    return subprocess.run(['/bin/bash', '--noprofile', '--norc', '-c', script,
                           'profile-test', *args], env=CLEAN_ENV, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=8)


def environment_stubs(os_name='Linux', init='systemd', user='fixture-admin'):
    return '\n'.join([
        'uname() { printf "%s\\n" ' + shlex.quote(os_name) + '; }',
        'ps() { printf "%s\\n" ' + shlex.quote(init) + '; }',
        'id() { printf "%s\\n" ' + shlex.quote(user) + '; }',
    ]) + '\n'


class ProfileTest(unittest.TestCase):
    def preflight(self, args=(), os_name='Linux', init='systemd', user='fixture-admin', before=''):
        script = ('source ' + shlex.quote(str(PROFILE)) + '\n' + before + '\n' +
                  environment_stubs(os_name, init, user) + 'eos_preflight "$@"\n')
        return bash(script, args)

    def assert_rejected(self, result, reason):
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(reason, result.stderr)

    def test_linux_systemd_os_administrator_passes(self):
        result = self.preflight()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_runtime_account_cannot_start_maintenance(self):
        self.assert_rejected(self.preflight(user='iobroker'), 'OS administrator')

    def test_non_linux_rejected(self):
        self.assert_rejected(self.preflight(os_name='FreeBSD'), 'requires Linux with systemd')

    def test_non_systemd_rejected(self):
        self.assert_rejected(self.preflight(init='init'), 'requires Linux with systemd')

    def test_legacy_force_initd_rejected(self):
        self.assert_rejected(self.preflight(before='IOB_FORCE_INITD=true'), 'OS administrator')

    def test_plaintext_redis_option_rejected(self):
        self.assert_rejected(self.preflight(args=('--redis',)), 'Legacy --redis provisioning is disabled')

    def test_redis_equals_forms_rejected(self):
        for option in ('--redis=true', '--redis=false', '--redis='):
            with self.subTest(option=option):
                self.assert_rejected(self.preflight(args=(option,)), 'Legacy --redis provisioning is disabled')

    def test_non_redis_arguments_not_accidentally_rejected(self):
        result = self.preflight(args=('--silent', '--redistribution', '--automated-run'))
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_preflight_clears_injection_environment_and_sets_private_umask(self):
        injected = ['NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'LD_LIBRARY_PATH', 'BASH_ENV', 'ENV', 'CDPATH']
        # Set only after Bash starts; these inert labels must never reach child programs.
        before = '\n'.join('export ' + key + '=fixture-untrusted' for key in injected)
        script = ('source ' + shlex.quote(str(PROFILE)) + '\n' + before + '\n' +
                  environment_stubs() + 'umask 022\neos_preflight || exit 1\n' +
                  'for key in ' + ' '.join(injected) + '; do [[ ! -v "$key" ]] || exit 42; done\n' +
                  'printf "%s\\n%s\\n" "$PATH" "$IOB_NO_SETCAP"\numask\n')
        result = bash(script)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.splitlines(), ['/usr/sbin:/usr/bin:/sbin:/bin', 'true', '0077'])

    @unittest.skipUnless(os.geteuid() == 0, 'root branch only; no real credential switch')
    def test_runtime_launcher_scrubs_environment_before_stubbed_runuser(self):
        with tempfile.TemporaryDirectory(prefix='eos-profile-runtime-') as dirname:
            root = Path(dirname)
            stub = root / 'inert-runuser'
            stub.write_text('#!' + sys.executable + '\nimport os,json,sys\n'
                            'print(json.dumps({"args":sys.argv[1:],"env":dict(os.environ)}))\n')
            stub.chmod(0o700)
            source = PROFILE.read_text().replace('/usr/sbin/runuser', str(stub))
            script = source + '\nexport NODE_OPTIONS=fixture-injection NODE_PATH=fixture-path UNRELATED=fixture\n'
            script += 'eos_run_as_runtime /fixture/program "one argument"\n'
            result = bash(script)
            self.assertEqual(result.returncode, 0, result.stderr)
            observed = json.loads(result.stdout)
            self.assertEqual(observed['args'], ['--user', 'iobroker', '--', '/fixture/program', 'one argument'])
            self.assertEqual(observed['env']['HOME'], '/home/iobroker')
            self.assertEqual(observed['env']['IOB_NO_SETCAP'], 'true')
            for key in ('NODE_OPTIONS', 'NODE_PATH', 'UNRELATED'):
                self.assertNotIn(key, observed['env'])

    @unittest.skipUnless(os.geteuid() == 0, 'helper requires root; all target paths mapped to temp')
    def test_service_has_privilege_limits_tls_guard_and_stays_disabled(self):
        with tempfile.TemporaryDirectory(prefix='eos-profile-service-') as dirname:
            root = Path(dirname)
            units = root / 'units'
            units.mkdir()
            calls = root / 'systemctl-calls.jsonl'
            stub = root / 'inert-systemctl'
            stub.write_text('#!' + sys.executable + '\nimport json,sys\n'
                            'with open(' + repr(str(calls)) + ',"a") as log: '
                            'log.write(json.dumps(sys.argv[1:])+"\\n")\n')
            stub.chmod(0o700)
            source = PROFILE.read_text().replace('/etc/systemd/system', str(units))
            source = source.replace('/usr/bin/systemctl', str(stub))
            # The production directory validator is tested separately. Here it may
            # permit exactly the mapped unit directory, never a real system path.
            script = source + '\neos_cli_secure_directory() { [[ "$1" == ' + shlex.quote(str(units)) + ' ]]; }\n'
            result = bash(script + 'eos_install_service\n')
            self.assertEqual(result.returncode, 0, result.stderr)
            config = configparser.ConfigParser(interpolation=None, strict=False)
            config.optionxform = str
            config.read(units / 'iobroker.service')
            service = config['Service']
            self.assertEqual(service['User'], 'iobroker')
            self.assertEqual(service['Group'], 'iobroker')
            self.assertEqual(service['NoNewPrivileges'], 'true')
            self.assertEqual(service['CapabilityBoundingSet'], '')
            self.assertEqual(service['AmbientCapabilities'], '')
            self.assertEqual(service['RestrictSUIDSGID'], 'true')
            self.assertEqual(service['UMask'], '0077')
            self.assertEqual(service['ExecStartPre'], '/usr/bin/node /usr/local/libexec/nexowatt-eos/verify-runtime-tls.cjs /opt/iobroker/iobroker-data/iobroker.json')
            self.assertEqual(service['ExecStart'], '/usr/bin/node /opt/iobroker/node_modules/iobroker.js-controller/controller.js')
            self.assertEqual([json.loads(line) for line in calls.read_text().splitlines()],
                             [['daemon-reload'], ['disable', 'iobroker.service']])
            self.assertEqual(list(units.iterdir()), [units / 'iobroker.service'])

    def test_installer_and_fixer_stop_at_rejected_preflight(self):
        marker = 'eos_preflight "$@" || exit 1'
        for name in ('installer.sh', 'fix_installation.sh'):
            with self.subTest(entrypoint=name):
                source = (REPO / name).read_text()
                self.assertEqual(source.count(marker), 1, 'locate one real preflight boundary')
                prelude = source[:source.index(marker) + len(marker)]
                # Preserve imports and actual preflight; override only script path
                # because the safe truncated script is passed via Bash -c.
                lines = prelude.splitlines()
                for i, line in enumerate(lines):
                    if line.startswith('SCRIPT_DIR='):
                        lines[i] = 'SCRIPT_DIR=' + shlex.quote(str(REPO))
                prelude = '\n'.join(lines)
                result = bash(environment_stubs(init='fixture-no-systemd') + prelude + '\nprintf UNREACHABLE\n')
                self.assert_rejected(result, 'requires Linux with systemd')
                self.assertNotIn('UNREACHABLE', result.stdout)


if __name__ == '__main__':
    unittest.main(verbosity=2)
