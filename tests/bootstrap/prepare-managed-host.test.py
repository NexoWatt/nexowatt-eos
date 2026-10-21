"""Execute the complete shared host-boundary suite against the fixed new profile.

All host/APT effects are explicit doubles; temporary archives are real files.
No privileged installation, distribution transaction or target execution occurs.
"""
import importlib.util
from pathlib import Path
import unittest
from unittest import mock
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


legacy = load("shared_eos_host_tests", ROOT / "tests/bootstrap/prepare-host.test.py")
subject = load("eos_managed_host", ROOT / "tools/bootstrap/prepare-managed-host.py")
legacy.subject = subject
legacy.FIRST_START = "tools/bootstrap/first-start-managed.cjs"
original_entries = legacy.kit_entries


def managed_entries():
    return {**original_entries(), "tools/bootstrap/first-start.cjs": b"'use strict';\n",
            "tools/system/install-managed-from-checkout.cjs": b"'use strict';\n"}


legacy.kit_entries = managed_entries
HostPreparation = legacy.HostPreparation


class ManagedProfile(legacy.HostPreparation):
    # Do not inherit/repeat the whole shared suite a second time here.
    @classmethod
    def setUpClass(cls):
        pass

    def test_new_profile_has_exact_assets_and_no_legacy_release_selection(self):
        self.assertEqual(subject.DELIVERY, "delivery/managed-test-15")
        self.assertEqual(subject.EOS_ASSET, "eos-linux-arm64.tar.gz")
        self.assertEqual(subject.NODE_VERSION, "24.21.0")
        value = legacy.config()
        value["deliveryDirectory"] = "delivery/test-pi-0.2.0-test.3-r4"
        self.rejected(lambda: subject.validate_config(value), "BOOTSTRAP_CONFIG")
        value = legacy.config()
        value["assets"][2]["name"] = "eos-0.2.0-test.3-linux-arm64.tar.gz"
        self.rejected(lambda: subject.validate_config(value), "BOOTSTRAP_ASSET")

    def test_network_packages_include_binary_only_dnsmasq_and_no_global_daemon(self):
        self.assertIn("nftables", subject.PACKAGES)
        self.assertIn("dnsmasq-base", subject.PACKAGES)
        self.assertNotIn("dnsmasq", subject.PACKAGES)
        self.assertIn("eos-network-dhcp", subject.ACCOUNTS)
        self.assertIn("/var/lib/nexowatt-eos-updates", subject.EOS_PATHS)
        self.assertIn("/var/lib/nexowatt-eos-network-install", subject.EOS_PATHS)

    def test_managed_state_left_by_an_interrupted_install_stops_before_commands(self):
        for state in ["/var/lib/nexowatt-eos-updates", "/etc/nexowatt-eos-network"]:
            with self.subTest(state=state), mock.patch.object(subject, "exists", side_effect=lambda p: str(p) == state), \
                    mock.patch.object(subject, "run") as run:
                self.rejected(subject.check_existing_installation, "BOOTSTRAP_EXISTING_EOS")
                run.assert_not_called()

    def test_incomplete_managed_kit_is_rejected_before_extraction(self):
        for omitted in [legacy.FIRST_START, "tools/bootstrap/first-start.cjs", "tools/system/install-managed-from-checkout.cjs"]:
            archive = self.directory / ("missing-" + Path(omitted).name + ".zip")
            with zipfile.ZipFile(archive, "w") as output:
                for name, contents in managed_entries().items():
                    if name != omitted:
                        output.writestr(name, contents)
            destination = self.directory / (archive.stem + "-out")
            self.rejected(lambda: subject.extract_kit(archive, destination), "BOOTSTRAP_KIT_LAYOUT")
            self.assertFalse(destination.exists())


def load_tests(loader, tests, pattern):
    shared = loader.loadTestsFromTestCase(HostPreparation)
    own = unittest.TestSuite(ManagedProfile(name) for name in ManagedProfile.__dict__ if name.startswith("test_"))
    return unittest.TestSuite([shared, own])


if __name__ == "__main__":
    unittest.main(verbosity=2)
