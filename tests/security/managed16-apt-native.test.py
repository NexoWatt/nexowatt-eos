#!/usr/bin/python3
"""Native APT configuration and metadata-hook checks; never install packages.

Only disposable, uniquely named /var/lib fixtures are written. apt-config dump,
dpkg-deb --build/--field and dpkg-query are used; apt-get is never run and no
network request is made. This is not Debian 13/ARM64 or VPN acceptance.
"""
import importlib.util
import os
from pathlib import Path
import shutil
import stat
import subprocess
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "managed16_native_review", ROOT / "tools/system/retire-r8-for-managed16.py")
r = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(r)
ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C", "LC_ALL": "C"}
TOOLS = ("/usr/bin/apt-config", "/usr/bin/dpkg-deb", "/usr/bin/dpkg-query")


@unittest.skipUnless(os.geteuid() == 0 and all(Path(p).is_file() for p in TOOLS),
                     "Native APT fixture requires root and distribution APT/dpkg tools")
class NativeAptIsolation(unittest.TestCase):
    def setUp(self):
        prep, _, _ = r.load_preparer((ROOT / "delivery/managed16/install.sh").read_bytes())
        self.compat = r.Managed16AptCompat(prep)
        source = b"deb https://deb.debian.org/debian trixie main\n"
        sources = ((("/etc/apt/sources.list", source),), ((".list", source),))
        # Use the real snapshot writer and generated configuration; never read
        # the review host's source/preference files.
        with patch.object(self.compat, "sources", return_value=sources), \
                patch.object(self.compat, "preferences", return_value=()):
            try:
                self.compat.create_snapshot()
            except BaseException:
                if self.compat.folder is not None:
                    self.clean_fixture()
                raise
        self.folder = self.compat.folder

    def tearDown(self):
        self.clean_fixture()

    def clean_fixture(self):
        folder = self.compat.folder
        self.assertEqual(folder.parent, Path("/var/lib"))
        self.assertRegex(folder.name, r"^eos-managed16-apt-[A-Za-z0-9_-]+$")
        self.assertFalse(folder.is_symlink())
        self.assertEqual(folder.stat().st_uid, 0)
        shutil.rmtree(folder)

    def native(self, args, *, data=None, env=None):
        return subprocess.run(args, input=data, capture_output=True,
                              env=env or ENV, timeout=20, check=False)

    def test_effective_configuration_excludes_host_hooks_and_all_shared_caches(self):
        host = self.folder / "fake-host-apt"
        host.mkdir(mode=0o700)
        (host / "apt.conf.d").mkdir(mode=0o700)
        (host / "apt.conf").write_text('EOSReview::MainCanary "loaded";\n')
        (host / "apt.conf.d/99canary").write_text(
            'EOSReview::PartsCanary "loaded";\nDPkg::Pre-Invoke { "false"; };\n')
        config = self.folder / "review.conf"
        config.write_text(f'Dir::Etc "{host}";\n' + self.compat.configuration())
        result = self.native(["/usr/bin/apt-config", "dump"],
                             env={**ENV, "APT_CONFIG": str(config)})
        self.assertEqual(result.returncode, 0)
        text = result.stdout.decode("utf-8")
        for marker in ("MainCanary", "PartsCanary", "DPkg::Pre-Invoke"):
            self.assertNotIn(marker, text)
        lines = dict(line.split(" ", 1) for line in text.splitlines() if " " in line)
        expected = {
            "Dir::Etc::sourcelist": str(self.folder / "empty.list"),
            "Dir::Etc::sourceparts": str(self.folder / "sources"),
            "Dir::Etc::preferences": str(self.folder / "empty.preferences"),
            "Dir::Etc::preferencesparts": str(self.folder / "preferences"),
            "Dir::State::lists": str(self.folder / "lists"),
            "Dir::Cache::archives": str(self.folder / "archives"),
            "Dir::Cache::pkgcache": "",
            "Dir::Cache::srcpkgcache": "",
            "Dir::Etc::netrc": "-",
            "Dir::Etc::netrcparts": "-",
        }
        for key, value in expected.items():
            with self.subTest(key=key):
                self.assertEqual(lines[key], f'"{value}";')
        hooks = [line for line in text.splitlines() if line.startswith("DPkg::Pre-Install-Pkgs:: ")]
        self.assertEqual(hooks, [
            f'DPkg::Pre-Install-Pkgs:: "/usr/bin/python3 -I -B {self.folder}/guard.py";'])
        for option in ("Acquire::https::Verify-Peer", "Acquire::https::Verify-Host",
                       "Acquire::Check-Date", "Acquire::Check-Valid-Until"):
            self.assertEqual(lines[option], '"true";')

    def test_snapshot_modes_allow_acquisition_traversal_but_keep_preferences_private(self):
        self.assertEqual(stat.S_IMODE(self.folder.stat().st_mode), 0o711)
        for ancestor in (Path("/"), Path("/var"), Path("/var/lib"), self.folder):
            self.assertTrue(ancestor.stat().st_mode & 0o001)
        for name in ("sources", "lists", "archives"):
            self.assertEqual(stat.S_IMODE((self.folder / name).stat().st_mode), 0o755)
        self.assertEqual(stat.S_IMODE((self.folder / "apt.conf").stat().st_mode), 0o644)
        self.assertEqual(stat.S_IMODE((self.folder / "sources/000.list").stat().st_mode), 0o644)
        self.assertEqual(stat.S_IMODE((self.folder / "preferences").stat().st_mode), 0o700)
        for name in ("guard.py", "empty.preferences"):
            self.assertEqual(stat.S_IMODE((self.folder / name).stat().st_mode), 0o600)

    def build_deb(self, package):
        self.assertRegex(package, r"^[a-z0-9][a-z0-9+.-]*$")
        control = self.folder / package / "DEBIAN"
        control.mkdir(parents=True)
        (control / "control").write_text(
            f"Package: {package}\nVersion: 1.0\nArchitecture: all\n"
            "Maintainer: EOS Review <review@example.invalid>\n"
            "Description: Disposable metadata-only guard fixture\n")
        archive = self.folder / "archives" / (package + "_1.0_all.deb")
        result = self.native(["/usr/bin/dpkg-deb", "--build", str(control.parent), str(archive)])
        self.assertEqual(result.returncode, 0)
        archive.chmod(0o644)
        return archive

    def guard(self, text):
        return self.native(["/usr/bin/python3", "-I", "-B", str(self.folder / "guard.py")],
                           data=text.encode("utf-8"))

    def test_native_hook_accepts_new_package_metadata_without_installing_it(self):
        package = "eos-managed16-native-guard-fixture-tests"
        before = self.native(["/usr/bin/dpkg-query", "-W", "-f=${db:Status-Abbrev}", package])
        self.assertEqual(before.returncode, 1, "Fixture name must not already exist on test host")
        result = self.guard(str(self.build_deb(package)) + "\n")
        self.assertEqual(result.returncode, 0)
        after = self.native(["/usr/bin/dpkg-query", "-W", "-f=${db:Status-Abbrev}", package])
        self.assertEqual(after.returncode, 1)

    def test_native_hook_rejects_installed_package_and_tailscale_metadata(self):
        for package in ("dpkg", "tailscale"):
            with self.subTest(package=package):
                result = self.guard(str(self.build_deb(package)) + "\n")
                self.assertEqual(result.returncode, 1)
                self.assertEqual(result.stderr, b"EOS: APT_TRANSPORT_GUARD\n")
                self.assertEqual(result.stdout, b"")

    def test_native_hook_rejects_nonarchive_and_outside_paths_without_leaking_them(self):
        for path in ("/private-review-canary.deb", str(self.folder / "guard.py")):
            with self.subTest(kind="outside or nonarchive"):
                result = self.guard(path + "\n")
                self.assertEqual(result.returncode, 1)
                self.assertEqual(result.stderr, b"EOS: APT_TRANSPORT_GUARD\n")
                self.assertEqual(result.stdout, b"")


if __name__ == "__main__":
    unittest.main()
