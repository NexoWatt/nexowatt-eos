"""Execute the complete shared host-boundary suite against the fixed new profile.

All host/APT effects are explicit doubles; temporary archives are real files.
No privileged installation, distribution transaction or target execution occurs.
"""
import importlib.util
from pathlib import Path
import subprocess
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
        self.assertEqual(subject.NODE_VERSION, "24.22.1")
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

    def test_release_redirects_allow_only_fixed_release_and_https_github_asset_cdn(self):
        release = "https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-" + "a" * 64
        self.assertTrue(subject.github_release_asset(release + "/eos-linux-arm64.tar.gz"))
        self.assertTrue(subject.github_redirect("https://release-assets.githubusercontent.com/github-production-release-asset/1/a-b?sig=fixture%2Bvalue"))
        for url in [release.replace("managed-test-15", "latest") + "/asset", release.replace("NexoWatt", "other") + "/asset"]:
            self.assertFalse(subject.github_release_asset(url))
        for url in [None, "http://release-assets.githubusercontent.com/a", "https://example.com/a",
                    "https://release-assets.githubusercontent.com.evil.example/a", "https://user@release-assets.githubusercontent.com/a",
                    "https://release-assets.githubusercontent.com:443/a", "https://release-assets.githubusercontent.com/a#x",
                    "https://release-assets.githubusercontent.com/../a", "https://release-assets.githubusercontent.com/a\r\nx:y"]:
            self.assertFalse(subject.github_redirect(url))

    def test_release_download_follows_bounded_redirect_then_exact_ranges(self):
        release = "https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-" + "a" * 64 + "/eos-linux-arm64.tar.gz"
        cdn = "https://release-assets.githubusercontent.com/production/1/asset?signature=fixture"
        data = b"x" * (1024**2) + b"last"
        destination = self.directory / "download"
        destination.touch()
        requests = []

        def response(args, **kwargs):
            requests.append(args)
            self.assertNotIn("--location", args)
            self.assertGreater(float(args[args.index("--max-time") + 1]), 0)
            self.assertLessEqual(float(args[args.index("--max-time") + 1]), 5)
            header, chunk = Path(args[args.index("--dump-header") + 1]), Path(args[args.index("--output") + 1])
            if len(requests) == 1:
                header.write_bytes(("HTTP/2 302\r\nLocation: " + cdn + "\r\n\r\n").encode())
                chunk.write_bytes(b"")
                return subprocess.CompletedProcess(args, 0, b"302")
            self.assertEqual(args[-1], cdn)
            start, end = map(int, args[args.index("--range") + 1].split("-"))
            header.write_bytes(f"HTTP/2 206\r\nContent-Range: bytes {start}-{end}/{len(data)}\r\n\r\n".encode())
            chunk.write_bytes(data[start:end + 1])
            return subprocess.CompletedProcess(args, 0, b"206")

        with mock.patch.object(subject, "run", side_effect=response):
            subject.download_github_asset(release, destination, len(data))
        self.assertEqual(destination.read_bytes(), data)
        self.assertEqual(len(requests), 3)
        self.assertEqual(list(self.directory.iterdir()), [destination])

    def test_release_download_rejects_untrusted_redirect_and_incorrect_range(self):
        release = "https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-" + "a" * 64 + "/asset"
        destination = self.directory / "download"
        destination.touch()
        for header, data, status, code in [
            ("HTTP/2 302\r\nLocation: https://example.com/asset\r\n\r\n", b"", b"302", "BOOTSTRAP_DOWNLOAD_REDIRECT"),
            ("HTTP/2 206\r\nContent-Range: bytes 1-4/4\r\n\r\n", b"test", b"206", "BOOTSTRAP_DOWNLOAD_RANGE"),
            ("HTTP/2 206\r\nContent-Range: bytes 0-3/4\r\n\r\n", b"test!", b"206", "BOOTSTRAP_DOWNLOAD_SIZE"),
            ("HTTP/2 206\r\nContent-Range: bytes 0-3/4\r\n\r\n", b"tes", b"206", "BOOTSTRAP_DOWNLOAD_RANGE"),
            ("HTTP/2 206\r\nContent-Range: bytes 0-3/4\r\n\r\n", b"test", b"200", "BOOTSTRAP_DOWNLOAD_HEADERS")]:
            with self.subTest(code=code, data=data):
                def response(args, **kwargs):
                    Path(args[args.index("--dump-header") + 1]).write_bytes(header.encode())
                    Path(args[args.index("--output") + 1]).write_bytes(data)
                    return subprocess.CompletedProcess(args, 0, status)
                with mock.patch.object(subject, "run", side_effect=response) as run:
                    self.rejected(lambda: subject.download_github_asset(release, destination, 4), code)
                    self.assertEqual(run.call_count, 1)
                self.assertEqual(destination.read_bytes(), b"")

    def test_release_download_deadline_and_redirect_loop_are_bounded(self):
        release = "https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-" + "a" * 64 + "/asset"
        destination = self.directory / "download"
        destination.touch()
        with mock.patch.object(subject.time, "monotonic", side_effect=[0, 6]), mock.patch.object(subject, "run") as run:
            self.rejected(lambda: subject.download_github_asset(release, destination, 4), "BOOTSTRAP_DOWNLOAD_TIMEOUT")
            run.assert_not_called()
        def response(args, **kwargs):
            Path(args[args.index("--dump-header") + 1]).write_bytes(
                b"HTTP/2 302\r\nLocation: https://release-assets.githubusercontent.com/asset\r\n\r\n")
            Path(args[args.index("--output") + 1]).write_bytes(b"")
            return subprocess.CompletedProcess(args, 0, b"302")
        with mock.patch.object(subject, "run", side_effect=response) as run:
            self.rejected(lambda: subject.download_github_asset(release, destination, 4), "BOOTSTRAP_DOWNLOAD_REDIRECT")
            self.assertEqual(run.call_count, 3)

    def test_download_header_parser_rejects_ambiguity_links_and_large_headers(self):
        header = self.directory / "headers"
        for data in [b"HTTP/2 302\r\nLocation: /a\r\nLocation: /b\r\n\r\n", b"invalid\r\n\r\n", b"x" * 65537]:
            header.write_bytes(data)
            self.rejected(lambda: subject.response_headers(header), "BOOTSTRAP_DOWNLOAD_(HEADERS|SIZE)")
        header.unlink()
        target = self.directory / "target"
        target.write_bytes(b"HTTP/2 200\r\n\r\n")
        header.symlink_to(target)
        self.rejected(lambda: subject.response_headers(header), "BOOTSTRAP_DOWNLOAD_SIZE")


def load_tests(loader, tests, pattern):
    shared = loader.loadTestsFromTestCase(HostPreparation)
    own = unittest.TestSuite(ManagedProfile(name) for name in ManagedProfile.__dict__ if name.startswith("test_"))
    return unittest.TestSuite([shared, own])


if __name__ == "__main__":
    unittest.main(verbosity=2)
