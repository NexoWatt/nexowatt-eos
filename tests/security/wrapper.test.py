#!/usr/bin/env python3
"""Isolated CLI control-flow / filesystem tests. No host install or real sudo.

Fixed production paths are rewritten into temporary fixtures. id, sudo,
runuser, systemctl, pgrep and Node are test doubles. stat uses real file metadata
below each fixture and models its workspace ancestors as protected. This tests
argument/identity routing, not real Linux privilege transitions or systemd.
"""
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
NODE = os.environ.get("CODEX_PRIMARY_RUNTIME_NODE") or shutil.which("node")


@unittest.skipUnless(os.geteuid() == 0, "scratch ownership fixtures need uid 0; no host writes are performed")
class WrapperTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="cli-fixture-", dir=ROOT / "tests/security")
        self.base = Path(self.temp.name)
        # Cleanup also runs when setUp fails; verify removal instead of silently
        # leaving copied executables/configuration in the repository tree.
        self.addCleanup(self.cleanup_fixture)
        self.audit = self.base / "calls.jsonl"
        self.settings = self.base / "settings.json"
        self.tools = self.base / "tools"
        self.tools.mkdir()
        (self.base / "usr/bin").mkdir(parents=True)
        (self.base / "usr/local").mkdir()
        (self.base / "opt/iobroker").mkdir(parents=True)
        self.configure(uid=0, runtime_uid=1001, service="inactive", service_code=3, pgrep_code=1)
        self.stub("id", "s=json.loads(settings.read_text()); print(s['runtime_uid'] if 'iobroker' in sys.argv else s['uid'])")
        self.stub("systemctl", "s=json.loads(settings.read_text()); print(s['service']); sys.exit(s['service_code'] if 'is-active' in sys.argv else 0)")
        self.stub("pgrep", "sys.exit(json.loads(settings.read_text())['pgrep_code'])")
        self.stub("node", f"sys.exit(subprocess.call([{NODE!r}, *sys.argv[1:]]) if '--check' in sys.argv else 0)")
        self.stub("runuser", "sys.exit(subprocess.call(sys.argv[sys.argv.index('--')+1:]))")
        self.stub("sudo", "sys.exit(subprocess.call(sys.argv[sys.argv.index('--')+1:]))")
        # The container's /workspace is 0777; model ONLY fixture ancestors as a
        # protected OS root. All files/directories/symlinks in the fixture retain
        # their real metadata, including negative test cases.
        ancestors = [str(p) for p in self.base.parents]
        self.stub("stat", "p=Path(sys.argv[-1]); m=p.lstat(); protected=" + repr(ancestors) + "; uid=1001 if p.name=='node' and json.loads(settings.read_text()).get('node_nonroot_owner') else m.st_uid; print('0 755' if str(p) in protected else f'{uid} {stat.S_IMODE(m.st_mode):o}')", log=False)
        self.wrapper = self.base / "wrapper"
        self.wrapper.write_text(self.render((ROOT / "security/eos-cli.sh").read_text()))
        self.wrapper.chmod(0o755)
        self.helper = self.base / "install-helper.sh"
        self.helper.write_text(self.render((ROOT / "security/install-cli.sh").read_text()))

    def cleanup_fixture(self):
        self.temp.cleanup()
        self.assertFalse(self.base.exists(), "Temporary CLI fixture was not removed")

    def configure(self, **kwargs):
        settings = json.loads(self.settings.read_text()) if self.settings.exists() else {}
        settings.update(kwargs)
        self.settings.write_text(json.dumps(settings))

    def stub(self, name, body, log=True):
        script = "#!/usr/bin/python3\nimport json, os, stat, subprocess, sys\nfrom pathlib import Path\n"
        script += f"audit=Path({str(self.audit)!r}); settings=Path({str(self.settings)!r})\n"
        if log:
            script += "with audit.open('a') as stream: stream.write(json.dumps({'tool':Path(sys.argv[0]).name,'args':sys.argv[1:],'env':dict(os.environ),'cwd':os.getcwd()})+'\\n')\n"
        script += body + "\n"
        target = self.tools / name
        target.write_text(script)
        target.chmod(0o755)

    def render(self, source):
        tools = ["id", "env", "readlink", "stat", "node", "systemctl", "sudo", "pgrep", "install", "mktemp", "rm", "mv", "ln"]
        replacements = {"/usr/bin/" + name: str(self.tools / name) if (self.tools / name).exists() else "/usr/bin/" + name for name in tools}
        replacements["/usr/sbin/runuser"] = str(self.tools / "runuser")
        # Do not replace interpreter paths or real coreutils. Protect those
        # literals before mapping installation destinations into the fixture.
        for index, path in enumerate(sorted(replacements, key=len, reverse=True)):
            source = source.replace(path, f"@@TOOL{index}@@")
        source = re.sub(r"/usr/local|/usr/bin|/opt", lambda match: str(self.base) + match[0], source)
        for index, path in enumerate(sorted(replacements, key=len, reverse=True)):
            source = source.replace(f"@@TOOL{index}@@", replacements[path])
        return source

    def calls(self, name=None):
        data = [json.loads(line) for line in self.audit.read_text().splitlines()] if self.audit.exists() else []
        return [item for item in data if item["tool"] == name] if name else data

    def run_cli(self, *args, extra_env=None):
        env = dict(os.environ)
        env.update(extra_env or {})
        return subprocess.run(["/bin/bash", str(self.wrapper), *args], env=env, capture_output=True, text=True)

    def install(self, stopped=True):
        env = dict(os.environ, EOS_CLI_TEMPLATE=self.wrapper.read_text(), EOS_CLI_INSTALL_STOPPED=str(stopped).lower())
        return subprocess.run(["/bin/bash", "-c", 'source "$1"; eos_install_cli', "test", str(self.helper)], env=env, capture_output=True, text=True)

    def install_guard(self, source):
        env = dict(os.environ, EOS_TLS_VALIDATOR_SOURCE=source, EOS_CLI_INSTALL_STOPPED="true")
        return subprocess.run(["/bin/bash", "-c", 'source "$1"; eos_install_runtime_guard', "test", str(self.helper)], env=env, capture_output=True, text=True)

    def test_root_uses_runuser_and_literal_arguments(self):
        arg = "$(touch INJECTION); spaces * and quotes '"
        result = self.run_cli("status", arg, "--allow-root")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls("runuser")[0]["args"][:3], ["--user", "iobroker", "--"])
        node = self.calls("node")[0]
        self.assertEqual(node["args"][-3:], ["status", arg, "--allow-root"])
        self.assertEqual(node["cwd"], "/")
        self.assertEqual(node["env"]["IOB_NO_SETCAP"], "true")

    def test_operator_uses_sudo_as_service_user(self):
        self.configure(uid=1000)
        result = self.run_cli("status")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls("sudo")[0]["args"][:5], ["-H", "-u", "iobroker", "--", "/usr/bin/env"])
        self.assertFalse(self.calls("runuser"))

    def test_runtime_runs_without_sudo(self):
        self.configure(uid=1001)
        result = self.run_cli("status")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls("node")), 1)
        self.assertFalse(self.calls("sudo") or self.calls("runuser"))

    def test_node_environment_is_clean(self):
        result = self.run_cli("status", extra_env={"NODE_OPTIONS": "--require=/tmp/hostile.js", "NODE_PATH": "/tmp/hostile", "PATH": "/tmp/hostile", "SECRET_UNRELATED": "sentinel"})
        self.assertEqual(result.returncode, 0, result.stderr)
        env = self.calls("node")[0]["env"]
        self.assertNotIn("NODE_OPTIONS", env)
        self.assertNotIn("NODE_PATH", env)
        self.assertNotIn("SECRET_UNRELATED", env)

    def test_maintenance_shortcuts_refuse_without_executing_node(self):
        for cmd in ["fix", "nodejs-update", "diag"]:
            with self.subTest(cmd=cmd):
                result = self.run_cli(cmd)
                self.assertEqual(result.returncode, 69)
        self.assertFalse(self.calls("node") or self.calls("sudo") or self.calls("runuser"))

    def test_runtime_cannot_control_system_service(self):
        self.configure(uid=1001)
        for cmd in ["start", "stop", "restart"]:
            self.assertEqual(self.run_cli(cmd).returncode, 77)
        self.assertFalse(self.calls("systemctl") or self.calls("node"))

    def test_service_command_cannot_bypass_routing_with_extra_arguments(self):
        for command in ["start", "stop", "restart"]:
            self.assertEqual(self.run_cli(command, "--anything").returncode, 64)
        self.configure(uid=1001)
        self.assertEqual(self.run_cli("start", "--anything").returncode, 77)
        self.assertFalse(self.calls("node") or self.calls("systemctl"))

    def test_root_service_control_has_fixed_unit(self):
        result = self.run_cli("restart")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls("systemctl")[0]["args"], ["restart", "iobroker.service"])
        self.assertFalse(self.calls("node"))

    def test_operator_service_control_requires_sudo(self):
        self.configure(uid=1000)
        result = self.run_cli("stop")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.calls("sudo")[0]["args"], ["--", str(self.tools / "systemctl"), "stop", "iobroker.service"])

    def test_unprotected_node_and_ancestor_are_rejected(self):
        (self.tools / "node").chmod(0o777)
        self.assertEqual(self.run_cli("status").returncode, 77)
        (self.tools / "node").chmod(0o755)
        self.tools.chmod(0o777)
        self.assertEqual(self.run_cli("status").returncode, 77)
        self.tools.chmod(0o755)
        self.assertFalse(self.calls("node"))

    def test_node_symlink_to_untrusted_target_is_rejected(self):
        hostile = self.base / "hostile"
        hostile.write_text("#!/bin/sh\nexit 0\n")
        hostile.chmod(0o777)
        (self.tools / "node").unlink()
        (self.tools / "node").symlink_to(hostile)
        self.assertEqual(self.run_cli("status").returncode, 77)

    def test_nonroot_owned_node_metadata_is_rejected(self):
        # This workspace cannot chown to unmapped UIDs. Model the stat result.
        self.configure(node_nonroot_owner=True)
        self.assertEqual(self.run_cli("status").returncode, 77)
        self.assertFalse(self.calls("node"))

    def test_install_creates_protected_wrapper_and_all_links(self):
        result = self.install()
        self.assertEqual(result.returncode, 0, result.stderr)
        target = self.base / "usr/local/libexec/nexowatt-eos/iobroker"
        self.assertEqual(target.read_text(), self.wrapper.read_text() + "\n")
        self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o755)
        self.assertEqual(target.stat().st_uid, 0)
        for parent in ["usr/bin", "usr/local/bin", "opt/iobroker"]:
            for name in ["iob", "iobroker"]:
                self.assertEqual((self.base / parent / name).readlink(), target)
        self.assertEqual(len(self.calls("runuser")), 2)

    def test_install_replaces_leaf_symlink_without_touching_target(self):
        sentinel = self.base / "sentinel"
        sentinel.write_text("unchanged")
        (self.base / "usr/bin/iobroker").symlink_to(sentinel)
        result = self.install()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(sentinel.read_text(), "unchanged")

    def test_install_rejects_directory_symlink(self):
        outside = self.base / "outside"
        outside.mkdir()
        (self.base / "usr/local/libexec").symlink_to(outside)
        result = self.install()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(list(outside.iterdir()), [])

    def test_install_rejects_writable_directory(self):
        (self.base / "usr/local").chmod(0o777)
        self.assertNotEqual(self.install().returncode, 0)

    def test_install_rejects_active_service_or_runtime_processes(self):
        for state, code in [("active", 0), ("activating", 0), ("deactivating", 3), ("failed", 3), ("", 1)]:
            self.configure(service=state, service_code=code)
            self.assertNotEqual(self.install().returncode, 0)
        self.configure(service="inactive", service_code=3, pgrep_code=0)
        self.assertNotEqual(self.install().returncode, 0)
        self.configure(pgrep_code=2)
        self.assertNotEqual(self.install().returncode, 0)

    def test_install_rejects_missing_window_or_root(self):
        self.assertNotEqual(self.install(stopped=False).returncode, 0)
        self.configure(uid=1000)
        self.assertNotEqual(self.install().returncode, 0)

    def test_install_unknown_uninstalled_unit_is_accepted(self):
        self.configure(service="unknown", service_code=4)
        result = self.install()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_install_does_not_evaluate_template_data(self):
        marker = self.base / "MUST_NOT_EXIST"
        self.wrapper.write_text(self.wrapper.read_text() + f"\n# $(touch '{marker}')\n")
        result = self.install()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(marker.exists())

    def test_guard_replaces_only_after_syntax_check(self):
        self.assertEqual(self.install().returncode, 0)
        source = "'use strict'; process.exit(0);"
        result = self.install_guard(source)
        self.assertEqual(result.returncode, 0, result.stderr)
        target = self.base / "usr/local/libexec/nexowatt-eos/verify-runtime-tls.cjs"
        self.assertEqual(target.read_text(), source + "\n")
        self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o644)
        self.assertNotEqual(self.install_guard("function broken( {").returncode, 0)
        self.assertEqual(target.read_text(), source + "\n")
        self.assertNotEqual(self.install_guard("").returncode, 0)
        self.assertEqual(target.read_text(), source + "\n")

    def test_guard_source_is_parsed_without_execution(self):
        self.assertEqual(self.install().returncode, 0)
        marker = self.base / "MUST_NOT_EXIST"
        result = self.install_guard(f"require('node:fs').writeFileSync({json.dumps(str(marker))}, 'executed');")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(marker.exists())

    def test_sourcing_helper_does_not_install(self):
        result = subprocess.run(["/bin/bash", "-c", 'source "$1"', "test", str(self.helper)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.calls())
        self.assertFalse((self.base / "usr/local/libexec").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
