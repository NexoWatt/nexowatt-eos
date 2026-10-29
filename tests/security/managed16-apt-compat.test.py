#!/usr/bin/python3
"""Isolated APT admission/transaction tests; never install packages or use VPN."""
import contextlib
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import stat
import subprocess
import types
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("retire_apt_compat", ROOT / "tools/system/retire-r8-for-managed16.py")
retire = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(retire)
ENTRY = (ROOT / "delivery/managed16/install.sh").read_bytes()
TAILSCALE = ("# Tailscale packages for debian trixie\n"
            "deb [signed-by=/usr/share/keyrings/tailscale-archive-keyring.gpg] "
            "https://pkgs.tailscale.com/stable/debian trixie main\n")
DISTRO = ("Types: deb\nURIs: https://deb.debian.org/debian\nSuites: trixie\n"
          "Components: main non-free-firmware\nArchitectures: arm64\n"
          "Signed-By: /usr/share/keyrings/debian-archive-keyring.pgp\n")
NEW_PLAN = "Inst postgresql-17 (17.7-1 Debian:13 [arm64])\nConf postgresql-17 (17.7-1 Debian:13 [arm64])\n"


class Managed16AptCompatibility(unittest.TestCase):
    def setUp(self):
        self.prep, _, _ = retire.load_preparer(ENTRY)
        self.compat = retire.Managed16AptCompat(self.prep)

    @contextlib.contextmanager
    def sources(self, files=None):
        files = files or {"debian.sources": DISTRO, "tailscale.list": TAILSCALE}
        directory = Path("/etc/apt/sources.list.d")
        paths = {directory / path: text.encode() for path, text in files.items()}
        with patch.object(self.prep, "exists", side_effect=lambda path: Path(path) in paths or Path(path) == directory), \
                patch.object(self.prep, "trusted_path", side_effect=lambda path, **kwargs: Path(path)), \
                patch.object(self.prep, "private_file", side_effect=lambda path, limit: paths[Path(path)]), \
                patch.object(Path, "iterdir", return_value=iter(sorted(paths))):
            yield paths

    def ready(self):
        self.compat.folder = Path("/var/lib/eos-managed16-apt-fixture")
        self.compat.ready = True
        self.compat.allowed = frozenset({("postgresql-17", "17.7-1")})
        self.compat.check_snapshot = Mock()

    def test_exact_official_source_matches_reported_fingerprint_and_is_excluded(self):
        self.assertEqual(hashlib.sha256(TAILSCALE.encode()).hexdigest(), retire.TAILSCALE_SOURCE_SHA256)
        with self.sources():
            snapshots, admitted = self.compat.sources()
        self.assertEqual(len(snapshots), 2)
        self.assertEqual(len(admitted), 1)
        self.assertNotIn(b"tailscale", b"".join(data for _, data in admitted))
        self.assertTrue(self.compat.has_tailscale)

    def test_regular_distro_parser_is_unchanged(self):
        with self.sources({"debian.sources": DISTRO}):
            self.compat.check_sources()
        self.assertFalse(self.compat.has_tailscale)
        with self.assertRaisesRegex(self.prep.Rejected, "BOOTSTRAP_APT_SOURCE"):
            self.prep.validate_apt_sources(TAILSCALE, deb822=False)

    def test_tailscale_variants_are_not_generic_vendor_exception(self):
        variants = [TAILSCALE.replace("https:", "http:"), TAILSCALE.replace("stable", "unstable"),
                    TAILSCALE.replace("trixie main", "bookworm main"), TAILSCALE.replace(".gpg", ".asc"),
                    TAILSCALE + "# extra\n", TAILSCALE.replace("trixie main", "trixie main contrib"),
                    TAILSCALE.replace("pkgs.tailscale.com", "user:secret@pkgs.tailscale.com"),
                    TAILSCALE.replace("pkgs.tailscale.com", "pkgs.tailscale.com:443"),
                    TAILSCALE.replace("/stable/debian ", "/stable/debian?token=secret ")]
        for source in variants:
            with self.subTest(source=variants.index(source)), self.sources({"debian.sources": DISTRO, "tailscale.list": source}):
                with self.assertRaises(self.prep.Rejected):
                    self.compat.sources()

    def test_duplicate_official_vendor_files_rejected(self):
        with self.sources({"debian.sources": DISTRO, "one.list": TAILSCALE, "two.list": TAILSCALE}):
            with self.assertRaisesRegex(retire.Rejected, "APT_TAILSCALE_DUPLICATE"):
                self.compat.sources()

    def test_vendor_alone_does_not_supply_distribution(self):
        with self.sources({"tailscale.list": TAILSCALE}):
            with self.assertRaisesRegex(retire.Rejected, "BOOTSTRAP_APT_SOURCES_MISSING"):
                self.compat.sources()

    def test_source_comments_are_not_copied_into_public_cache(self):
        with self.sources({"debian.sources": "# PRIVATE_NOTE\n" + DISTRO}):
            snapshots, admitted = self.compat.sources()
        self.assertIn(b"PRIVATE_NOTE", snapshots[0][1])
        self.assertNotIn(b"PRIVATE_NOTE", admitted[0][1])

    def test_inline_list_comments_are_not_copied_into_public_cache(self):
        text = "deb [arch=arm64] https://deb.debian.org/debian trixie main # PRIVATE_NOTE\n"
        with self.sources({"debian.list": text}):
            snapshots, admitted = self.compat.sources()
        self.assertIn(b"PRIVATE_NOTE", snapshots[0][1])
        self.assertNotIn(b"PRIVATE_NOTE", admitted[0][1])
        self.prep.validate_apt_sources(admitted[0][1].decode(), deb822=False)

    def test_disabled_deb822_private_uri_is_not_copied_into_public_cache(self):
        disabled = ("Types: deb\nURIs: https://PRIVATE_USER:PRIVATE_PASSWORD@private.invalid/debian\n"
                    "Suites: private\nComponents: main\nEnabled: no\n")
        with self.sources({"debian.sources": disabled + "\n" + DISTRO}):
            snapshots, admitted = self.compat.sources()
        self.assertIn(b"PRIVATE_PASSWORD", snapshots[0][1])
        self.assertNotIn(b"PRIVATE_", admitted[0][1])
        self.assertNotIn(b"Enabled: no", admitted[0][1])
        self.assertEqual(self.prep.validate_apt_sources(admitted[0][1].decode(), deb822=True), 1)

    def test_snapshot_change_rejected(self):
        self.compat.inputs = ((('original', b'original'),), ())
        with self.sources():
            with self.assertRaisesRegex(retire.Rejected, "APT_CONFIGURATION_CHANGED"):
                self.compat.check_snapshot()

    def test_original_source_trust_bypass_rejected(self):
        with self.sources({"debian.list": "deb [trusted=yes] https://deb.debian.org/debian trixie main\n"}):
            with self.assertRaisesRegex(self.prep.Rejected, "BOOTSTRAP_APT_SOURCE_OPTIONS"):
                self.compat.sources()

    def test_plan_allows_new_postgresql(self):
        self.assertEqual(retire.apt_plan(NEW_PLAN), (('Inst', 'postgresql-17', '17.7-1'), ('Conf', 'postgresql-17', '17.7-1')))

    def test_plan_rejects_any_upgrade_not_only_transport_names(self):
        with self.assertRaisesRegex(retire.Rejected, "APT_EXISTING_PACKAGE_CHANGE"):
            retire.apt_plan("Inst otherwise-harmless [1.0] (2.0 Debian:13 [arm64])\n")

    def test_simulation_checks_actual_dpkg_status_including_configuration_only(self):
        self.compat.command = Mock(return_value=types.SimpleNamespace(stdout=NEW_PLAN.encode()))
        for status in (b'ii ', b'rc ', b'iU '):
            with self.subTest(status=status), patch.object(self.prep, 'run', return_value=types.SimpleNamespace(returncode=0, stdout=status)):
                with self.assertRaisesRegex(retire.Rejected, 'APT_EXISTING_PACKAGE_CHANGE'):
                    self.compat.simulate(('postgresql-17',))

    def test_simulation_admits_absent_package_and_unknown_uninstalled_record(self):
        self.compat.command = Mock(return_value=types.SimpleNamespace(stdout=NEW_PLAN.encode()))
        for code, status in ((1, b''), (0, b'un ')):
            with self.subTest(code=code), patch.object(self.prep, 'run', return_value=types.SimpleNamespace(returncode=code, stdout=status)):
                self.assertEqual(self.compat.simulate(('postgresql-17',)), retire.apt_plan(NEW_PLAN))

    def test_plan_rejects_every_transport_package_action_and_arch_qualifier(self):
        for package in retire.APT_PROTECTED:
            for action in ("Inst", "Conf"):
                with self.subTest(package=package, action=action):
                    with self.assertRaisesRegex(retire.Rejected, "APT_TRANSPORT_PACKAGE_CHANGE"):
                        retire.apt_plan(f"{action} {package}:arm64 (1.0 Debian:13 [arm64])\n")

    def test_plan_rejects_removal_and_unrecognized_action_syntax(self):
        for text in ("Remv example [1.0]", "Inst", "Conf corrupted", "Inst invalid/name (1.0)", "Inst package malformed"):
            with self.subTest(text=text), self.assertRaisesRegex(retire.Rejected, "APT_PLAN_ACTION"):
                retire.apt_plan(text)

    def test_configuration_isolates_sources_cache_preferences_and_hooks(self):
        self.ready()
        config = self.compat.configuration()
        for expected in ('Dir::Etc::parts "-";', 'Dir::Etc::main "-";', 'Dir::Etc::netrc "-";',
                         'Dir::Cache::pkgcache "";', 'Dir::Cache::srcpkgcache "";',
                         'Acquire::AllowInsecureRepositories "false";', 'APT::Update::Error-Mode "any";',
                         'DPkg::Pre-Install-Pkgs { "/usr/bin/python3 -I -B'):
            self.assertIn(expected, config)
        self.assertNotIn("/etc/apt/sources", config)
        self.assertNotIn("/var/lib/apt/lists", config)
        self.assertNotIn("pkgs.tailscale.com", config)

    def test_unsafe_configuration_folder_rejected(self):
        for folder in ("/root/x", '/var/lib/eos-managed16-apt-x";evil', "/var/lib/eos-managed16-apt-x/../other"):
            self.compat.folder = Path(folder)
            with self.assertRaisesRegex(retire.Rejected, "APT_PRIVATE_PATH"):
                self.compat.configuration()

    def test_command_uses_early_environment_config_not_original_global_overrides(self):
        self.ready()
        original = self.prep.APT_OPTIONS
        with patch.object(self.prep, "run", return_value=types.SimpleNamespace(returncode=0)) as run:
            self.compat.command(["update"])
        args, kwargs = run.call_args
        self.assertEqual(args[0], ["/usr/bin/apt-get", "update"])
        self.assertEqual(kwargs['env']['APT_CONFIG'], str(self.compat.folder / "apt.conf"))
        self.assertEqual(kwargs['env']['NEEDRESTART_MODE'], 'l')
        self.assertEqual(self.prep.APT_OPTIONS, original)
        self.assertNotIn("APT_CONFIG", self.prep.ENV)

    def test_binding_changes_only_two_admission_functions(self):
        before = vars(self.prep).copy()
        retire.bind_managed16_apt_compat(self.prep)
        changed = {name for name in before if before[name] is not vars(self.prep)[name]}
        self.assertEqual(changed, {'check_apt_sources', 'prepare_packages'})

    def test_prepare_downloads_simulates_full_plan_before_download_and_rechecks(self):
        calls = []
        self.compat.create_snapshot = Mock()
        self.compat.check_snapshot = Mock()
        self.compat.command = lambda args, **kwargs: calls.append(tuple(args))
        self.compat.simulate = Mock(return_value=retire.apt_plan(NEW_PLAN))
        self.compat.prepare_downloads(Path('/root/eos-download-fixture'))
        self.assertEqual(calls[0], ('update',))
        self.assertIn('--download-only', calls[1])
        self.assertIn('--no-upgrade', calls[1])
        self.assertIn('postgresql-17', calls[1])
        self.assertEqual(self.compat.simulate.call_count, 2)
        self.assertTrue(self.compat.ready)

    def test_preparation_plan_drift_never_marks_ready(self):
        self.compat.create_snapshot = Mock()
        self.compat.command = Mock()
        self.compat.simulate = Mock(side_effect=[retire.apt_plan(NEW_PLAN), ()])
        with self.assertRaisesRegex(retire.Rejected, "APT_PLAN_CHANGED"):
            self.compat.prepare_downloads(Path('/root/eos-download-fixture'))
        self.assertFalse(self.compat.ready)

    def test_apply_uses_offline_no_remove_no_upgrade_after_same_plan(self):
        self.ready()
        self.compat.simulate = Mock(return_value=retire.apt_plan(NEW_PLAN))
        self.compat.command = Mock()
        with patch.object(self.prep, 'private_file', return_value=b'dpkg-state'):
            self.compat.apply(('postgresql-17',))
        self.assertEqual(self.compat.command.call_args.args[0], ['--no-download', 'install', '-y', '--no-remove', '--no-upgrade', '--no-install-recommends', 'postgresql-17'])

    def test_apply_plan_drift_prevents_mutation(self):
        self.ready()
        self.compat.simulate = Mock(return_value=(('Inst', 'extra-package', '2.0'),))
        self.compat.command = Mock()
        with patch.object(self.prep, 'private_file', return_value=b'dpkg-state'):
            with self.assertRaisesRegex(retire.Rejected, "APT_PLAN_CHANGED"):
                self.compat.apply(('postgresql-17',))
        self.compat.command.assert_not_called()

    def test_apply_dpkg_state_drift_prevents_mutation(self):
        self.ready()
        self.compat.simulate = Mock(return_value=retire.apt_plan(NEW_PLAN))
        self.compat.command = Mock()
        with patch.object(self.prep, 'private_file', side_effect=[b'old', b'new']):
            with self.assertRaisesRegex(retire.Rejected, "APT_PACKAGE_STATE_CHANGED"):
                self.compat.apply(('postgresql-17',))
        self.compat.command.assert_not_called()

    def test_install_without_download_preparation_fails(self):
        with self.assertRaisesRegex(retire.Rejected, "APT_NOT_PREPARED"):
            self.compat.prepare_packages(Path('/root/eos-download-fixture'))

    def run_guard(self, package='postgresql-17', installed=False, path=None, metadata_error=False):
        folder = Path('/var/lib/eos-managed16-apt-fixture/archives')
        source = retire.apt_guard_source(folder)
        value = path or str(folder / 'package_1.0_arm64.deb')
        metadata = types.SimpleNamespace(returncode=1 if metadata_error else 0, stdout=(package+'\n').encode(), stderr=b'')
        status = types.SimpleNamespace(returncode=0 if installed else 1, stdout=b'ii ' if installed else b'', stderr=b'')
        with patch.object(retire.sys, 'stdin', types.SimpleNamespace(buffer=io.BytesIO((value+'\n').encode()))), \
                patch.object(Path, 'lstat', return_value=types.SimpleNamespace(st_mode=stat.S_IFREG | 0o644, st_nlink=1)), \
                patch.object(subprocess, 'run', side_effect=[metadata, status]), contextlib.redirect_stderr(io.StringIO()):
            exec(compile(source, 'isolated-apt-guard.py', 'exec'), {})

    def test_actual_preinstall_guard_accepts_new_eos_dependency(self):
        self.run_guard()

    def test_actual_preinstall_guard_rejects_protected_package(self):
        with self.assertRaises(SystemExit) as error:
            self.run_guard(package='tailscale')
        self.assertEqual(error.exception.code, 1)

    def test_actual_preinstall_guard_rejects_installed_non_transport_package(self):
        with self.assertRaises(SystemExit):
            self.run_guard(package='nontransport', installed=True)

    def test_actual_preinstall_guard_rejects_metadata_error(self):
        with self.assertRaises(SystemExit):
            self.run_guard(metadata_error=True)

    def test_actual_preinstall_guard_rejects_cache_escape(self):
        with self.assertRaises(SystemExit):
            self.run_guard(path='/tmp/package_1.0_arm64.deb')


if __name__ == '__main__':
    unittest.main()
