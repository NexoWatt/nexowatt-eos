#!/usr/bin/env python3
"""Check actual built installer inputs and preflight without running installation.

Run `node tasks --create` first. Only the generated prefix through the single
eos_preflight call is evaluated. The entire installer/fixer body is excluded even
if a regression wrongly permits an unsupported host. uname, ps and id are inert
fixtures; these tests do not prove real OS privileges or full installation.
"""
from pathlib import Path
import shlex
import subprocess
import unittest


REPO = Path(__file__).resolve().parents[2]
MARKER = 'eos_preflight "$@" || exit 1'
ARTIFACTS = ('install.sh', 'fix.sh')
EMBEDDED = {
    'EOS_VERSIONS_JSON': 'versions.json',
    'EOS_CLI_INSTALLER_SOURCE': 'security/install-cli.sh',
    'EOS_CLI_TEMPLATE': 'security/eos-cli.sh',
    'EOS_PROFILE_SOURCE': 'security/profile-common.sh',
    'EOS_TLS_VALIDATOR_SOURCE': 'security/verify-runtime-tls.cjs',
}
CLEAN_ENV = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': '/nonexistent', 'LANG': 'C'}
LIBRARY_BANNER = 'library: loaded\n'


def prefix(artifact, include_preflight=True):
    source = (REPO / 'dist' / artifact).read_text()
    if source.count(MARKER) != 1:
        raise AssertionError('Expected exactly one generated preflight boundary')
    boundary = source.index(MARKER)
    return source[:boundary + (len(MARKER) if include_preflight else 0)] + '\n'


def run_prefix(artifact, *, os_name='Linux', init='systemd', user='fixture-admin', args=(), before='', after='printf "PREFLIGHT_PASSED\\n"\n'):
    probes = '\n'.join([
        'uname() { printf "%s\\n" ' + shlex.quote(os_name) + '; }',
        'ps() { printf "%s\\n" ' + shlex.quote(init) + '; }',
        'id() { printf "%s\\n" ' + shlex.quote(user) + '; }',
    ]) + '\n'
    script = before + '\n' + probes + prefix(artifact) + after
    return subprocess.run(['/bin/bash', '--noprofile', '--norc', '-c', script, 'built-preflight', *args],
                          cwd=REPO, env=CLEAN_ENV, capture_output=True, text=True, timeout=10)


class BuiltArtifactTest(unittest.TestCase):
    def test_source_and_generated_shell_syntax(self):
        scripts = [REPO / name for name in ('installer.sh', 'installer_library.sh', 'fix_installation.sh', 'node-update.sh', 'diag.sh')]
        scripts += sorted((REPO / 'security').glob('*.sh'))
        scripts += [REPO / 'dist' / name for name in ('install.sh', 'fix.sh', 'node-update.sh', 'diag.sh')]
        for script in scripts:
            with self.subTest(script=script.relative_to(REPO)):
                result = subprocess.run(['/bin/bash', '--noprofile', '--norc', '-n', str(script)],
                                        env=CLEAN_ENV, capture_output=True, text=True, timeout=10)
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_embedded_inputs_match_reviewed_local_files_byte_for_byte(self):
        for artifact in ARTIFACTS:
            with self.subTest(artifact=artifact):
                definitions = prefix(artifact, include_preflight=False)
                self.assertIn((REPO / 'installer_library.sh').read_text(), definitions)
                self.assertNotIn('source "$SCRIPT_DIR/', definitions)
                variables = ' '.join('"$' + name + '"' for name in EMBEDDED)
                result = subprocess.run(['/bin/bash', '--noprofile', '--norc', '-c',
                                         definitions + '\nprintf "%s\\0" ' + variables],
                                        cwd=REPO, env=CLEAN_ENV, capture_output=True, timeout=10)
                self.assertEqual(result.returncode, 0, result.stderr)
                # Shell command substitution intentionally removes trailing LF.
                expected = [(REPO / name).read_bytes().rstrip(b'\n') for name in EMBEDDED.values()]
                self.assertTrue(result.stdout.startswith(LIBRARY_BANNER.encode()))
                self.assertEqual(result.stdout[len(LIBRARY_BANNER):].split(b'\0'), expected + [b''])

    def test_linux_systemd_administrator_passes_actual_generated_preflight(self):
        for artifact in ARTIFACTS:
            with self.subTest(artifact=artifact):
                result = run_prefix(artifact, args=('--silent', '--no-autostart'))
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, LIBRARY_BANNER + 'PREFLIGHT_PASSED\n')
                self.assertEqual(result.stderr, '')

    def test_generated_preflight_scrubs_environment_and_sets_private_umask(self):
        variables = ('NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'LD_LIBRARY_PATH', 'BASH_ENV', 'ENV', 'CDPATH')
        # Export inert labels only after Bash starts, never to its process loader.
        before = '\n'.join('export ' + name + '=fixture-untrusted' for name in variables) + '\numask 022\n'
        after = 'for key in ' + ' '.join(variables) + '; do [[ ! -v "$key" ]] || exit 42; done\n'
        after += 'printf "%s\\n%s\\n" "$PATH" "$IOB_NO_SETCAP"\numask\n'
        for artifact in ARTIFACTS:
            with self.subTest(artifact=artifact):
                result = run_prefix(artifact, before=before, after=after)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout.splitlines(), ['library: loaded', '/usr/sbin:/usr/bin:/sbin:/bin', 'true', '0077'])

    def test_generated_preflight_rejects_runtime_account(self):
        for artifact in ARTIFACTS:
            with self.subTest(artifact=artifact):
                result = run_prefix(artifact, user='iobroker')
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertEqual(result.stderr, 'Run reviewed maintenance as an OS administrator with systemd.\n')
                self.assertEqual(result.stdout, LIBRARY_BANNER)

    def test_generated_preflight_rejects_every_legacy_redis_option(self):
        for artifact in ARTIFACTS:
            for option in ('--redis', '--redis=true', '--redis=false', '--redis='):
                with self.subTest(artifact=artifact, option=option):
                    result = run_prefix(artifact, args=(option,))
                    self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                    self.assertEqual(result.stderr, 'Legacy --redis provisioning is disabled. See docs/security/RUNTIME_TLS.md.\n')
                    self.assertEqual(result.stdout, LIBRARY_BANNER)


class UnsupportedPlatformTest(unittest.TestCase):
    def assert_rejected(self, *, os_name, init):
        for artifact in ARTIFACTS:
            with self.subTest(artifact=artifact, os_name=os_name, init=init):
                result = run_prefix(artifact, os_name=os_name, init=init, args=('--silent',))
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertEqual(result.stderr, 'This EOS hardening profile requires Linux with systemd; no legacy fallback.\n')
                self.assertEqual(result.stdout, LIBRARY_BANNER, 'rejected host must not reach the post-preflight sentinel')

    def test_freebsd_rejected(self):
        self.assert_rejected(os_name='FreeBSD', init='init')

    def test_macos_rejected(self):
        self.assert_rejected(os_name='Darwin', init='launchd')

    def test_linux_without_systemd_rejected(self):
        self.assert_rejected(os_name='Linux', init='init')


if __name__ == '__main__':
    unittest.main(verbosity=2)
