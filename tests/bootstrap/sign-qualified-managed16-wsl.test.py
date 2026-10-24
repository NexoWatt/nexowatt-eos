#!/usr/bin/python3
"""Fixed Managed16 signer boundaries; no manufacturer key, download or release."""
import contextlib
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


signing = load("managed16_signing", ROOT / "tools/bootstrap/sign-qualified-managed16-wsl.py")
legacy = load("historical_signing_tests", ROOT / "tests/bootstrap/sign-qualified-r8-wsl.test.py")
# Reuse the actual archive/path/tmpfs contracts against the new isolated module.
# This is test-only Python injection, never a CLI, environment or product option.
legacy.signing = signing
READY = dict(UNSIGNED_SHA="a" * 64, NATIVE_SHA="b" * 64, TAR_SHA="c" * 64,
             UNSIGNED_BYTES=120, NATIVE_BYTES=80, TAR_BYTES=100,
             NATIVE_DIR="eos-own-adapters.ABCDEF12")


class QualificationTests(unittest.TestCase):
    def test_every_missing_or_bad_pin_stops_before_io_or_key_access(self):
        for name in READY:
            for value in (None, "", False):
                with self.subTest(name=name, value=value), patch.multiple(signing, **{**READY, name: value}), \
                        patch.object(signing, "run") as run, patch.object(signing.Path, "home") as home, \
                        patch.object(signing, "decrypted_key") as key:
                    with self.assertRaisesRegex(ValueError, "QUALIFICATION_PINS_PENDING"):
                        signing.main(["unsigned.zip", "native.zip"])
                    run.assert_not_called(); home.assert_not_called(); key.assert_not_called()

    def test_fixed_ready_contract_does_not_add_cli_bypasses_or_recovery(self):
        with patch.multiple(signing, **READY), patch.object(signing.Path, "home") as home:
            signing.qualification_pins()
            self.assertEqual(len(signing.native_members()), 8)
            for args in ([], ["--finish", "/work"], ["--skip-checks", "native.zip"],
                         ["u", "n", "--source"], ["u", "n", "/key", "--sequence", "15"]):
                with self.assertRaisesRegex(ValueError, "SIGNING_USAGE"):
                    signing.main(args)
            home.assert_not_called()
        self.assertEqual(signing.SEQUENCE, 16)
        self.assertEqual(signing.KEY_SHA, "518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40")

    def test_native_directory_and_sizes_cannot_escape_exact_artifact_layout(self):
        for changes in ({"NATIVE_DIR": "../eos-own-adapters.ABCDEF12"}, {"NATIVE_DIR": "eos-own-adapters.ABCDEF12/extra"},
                        {"NATIVE_BYTES": 65 * 1024**2}, {"TAR_BYTES": 513 * 1024**2}, {"TAR_SHA": "x" * 64}):
            with patch.multiple(signing, **{**READY, **changes}):
                with self.assertRaisesRegex(ValueError, "QUALIFICATION_PINS_PENDING"):
                    signing.native_members()


class DirectoryTests(unittest.TestCase):
    def test_default_is_exact_current_private_directory_and_no_other_key_is_inferred(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            expected = home / "nexowatt-signing-neu-ITuuaaOd"
            expected.mkdir(mode=0o700)
            self.assertEqual(signing.signing_directory(home), expected)
            expected.chmod(0o755)
            with self.assertRaises(ValueError):
                signing.signing_directory(home)

    def test_optional_directory_still_requires_private_owned_canonical_home_child(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp); home = base / "home"; home.mkdir()
            directory = home / "operator-choice"; directory.mkdir(mode=0o700)
            self.assertEqual(signing.signing_directory(home, str(directory)), directory)
            link = home / "alias"; link.symlink_to(directory, target_is_directory=True)
            for candidate in (home, base, link, "relative", directory / ".." / directory.name):
                with self.assertRaises(ValueError):
                    signing.signing_directory(home, candidate)


class QualifiedCheckoutTests(legacy.QualifiedCheckoutTests):
    DELIVERY_FILES = tuple("delivery/managed-test-16/" + name for name in signing.DELIVERY_FILES)

    def test_tracked_rename_to_allowlisted_delivery_path_is_rejected(self):
        (self.checkout / "delivery/managed-test-16").mkdir(parents=True)
        self.git("mv", "tracked.txt", self.DELIVERY_FILES[0])
        self.assert_rejected()

    def test_unexpected_untracked_files_are_rejected_without_mutation(self):
        for name in self.DELIVERY_FILES:
            self.write(name)
        for name in ("unexpected.txt", "delivery/private.pem", "delivery/managed-test-15/delivery.json",
                     "delivery/managed-test-17/delivery.json", "delivery/managed-test-16/private.pem",
                     "delivery/managed-test-160/delivery.json", "delivery/managed-test-16/delivery.json\n?? injected"):
            file = self.write(name)
            before = self.git("status", "--porcelain=v1", "-z", "--untracked-files=all")
            self.assert_rejected()
            self.assertEqual(before, self.git("status", "--porcelain=v1", "-z", "--untracked-files=all"))
            file.unlink()


class SigningOrderTests(unittest.TestCase):
    def test_failed_qualification_never_opens_key(self):
        paths = [Path("/fixture") / str(index) for index in range(8)]
        with patch.object(signing, "assert_qualified_checkout"), \
                patch.object(signing, "verify_inputs", side_effect=ValueError("fixture qualification failure")), \
                patch.object(signing, "decrypted_key") as key, patch.object(signing, "run") as run:
            with self.assertRaises(ValueError):
                signing.sign_and_prepare(*paths)
            key.assert_not_called(); run.assert_not_called()

    def test_key_lifetime_ends_before_fresh_download_and_only_sequence16_is_signed(self):
        events = []
        paths = [Path("/fixture") / str(index) for index in range(8)]
        @contextlib.contextmanager
        def key(*_):
            events.append("open")
            try:
                yield Path("/fixture/ephemeral-key")
            finally:
                events.append("close")
        def run(args, **_):
            args = [str(value) for value in args]
            if args[1].endswith("build-managed-test.cjs"):
                events.append("sign")
                self.assertEqual(args[args.index("--sequence") + 1], "16")
                self.assertEqual(args[args.index("--public-key-sha256") + 1], signing.KEY_SHA)
            else:
                events.append("download")
                self.assertTrue(args[1].endswith("build-managed-download.cjs"))
                self.assertNotIn("--private-key", args)
                self.assertIn(signing.release_url("a" * 64), args)
                self.assertIn(signing.LICENSE_TRUST_SHA, args)
        with patch.object(signing, "assert_qualified_checkout"), \
                patch.object(signing, "verify_inputs", side_effect=lambda *_: events.append("verify")), \
                patch.object(signing, "decrypted_key", side_effect=key), patch.object(signing, "run", side_effect=run), \
                patch.object(signing, "public_delivery", return_value={"releaseId": "a" * 64}), \
                patch.object(signing, "export_public", return_value={"published": False}):
            self.assertEqual(signing.sign_and_prepare(*paths), {"published": False})
        self.assertEqual(events, ["verify", "open", "sign", "close", "download"])


class PublicExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eos-managed16-export-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name); self.checkout = self.base / "checkout"
        self.delivery = self.checkout / "delivery/managed-test-16"
        self.delivery.mkdir(parents=True)
        self.public = self.base / "public"; self.public.mkdir()
        self.trust = self.base / "license-public-trust.json"; self.trust.write_bytes(b"t" * 140)
        self.patch = patch.multiple(signing, KEY_SHA=hashlib.sha256(b"p" * 113).hexdigest(),
                                    ARM_SHA=hashlib.sha256(b"node-fixture").hexdigest(), ARM_BYTES=12,
                                    LICENSE_TRUST_SHA=hashlib.sha256(self.trust.read_bytes()).hexdigest())
        self.patch.start(); self.addCleanup(self.patch.stop)
        (self.delivery / "release-public.pem").write_bytes(b"p" * 113)
        archive = b"synthetic archive fixture"
        (self.delivery / "eos-linux-arm64.tar.gz").write_bytes(archive)
        self.record = {"sourceCommit": signing.SOURCE, "releaseSequence": 16, "deliveryRevision": 13,
                       "signingPublicKeySha256": signing.KEY_SHA, "archiveReadbackVerified": True,
                       "productionReleaseApproved": False, "archive": "eos-linux-arm64.tar.gz",
                       "releaseId": "a" * 64, "sha256": hashlib.sha256(archive).hexdigest(), "bytes": len(archive)}
        (self.delivery / "delivery.json").write_text(json.dumps(self.record))
        contents = {"eos-linux-arm64.tar.gz": archive, signing.NODE_ARCHIVE: b"node-fixture", "installer-kit.zip": b"kit fixture"}
        for name, data in contents.items(): (self.public / name).write_bytes(data)
        script = b"#!/bin/bash\n# inert fixture\n"; (self.public / "install.sh").write_bytes(script)
        preparation = {"releaseSequence": 16, "releaseId": self.record["releaseId"], "releasePublicKeySha256": signing.KEY_SHA,
                       "licenseTrustSha256": signing.LICENSE_TRUST_SHA, "commandReady": False,
                       "entryPublicationRequired": True, "published": False,
                       "baseUrl": signing.release_url(self.record["releaseId"]), "bootstrapSha256": hashlib.sha256(script).hexdigest(),
                       "assets": [{"name": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name, data in contents.items()]}
        (self.public / "download-preparation.json").write_text(json.dumps(preparation))
        (self.base / "private-marker.txt").write_text("INERT_PRIVATE_MARKER_MUST_NOT_SHIP")

    def test_actual_metadata_zip_has_only_public_allowlist_no_command_or_private_work(self):
        summary = signing.export_public(self.checkout, self.public, self.trust)
        self.assertFalse(summary["published"]); self.assertFalse(summary["installCommandReady"])
        with zipfile.ZipFile(self.public / "eos-public-metadata.zip") as zipped:
            self.assertEqual(set(zipped.namelist()), set(signing.METADATA_FILES))
            for name in zipped.namelist():
                self.assertNotIn(b"INERT_PRIVATE_MARKER_MUST_NOT_SHIP", zipped.read(name))
                self.assertNotIn(str(self.base).encode(), zipped.read(name))
        self.assertFalse((self.public / "INSTALL_COMMAND.txt").exists())
        with self.assertRaises(ValueError): signing.export_public(self.checkout, self.public, self.trust)

    def test_wrong_source_sequence_or_key_rejects_before_summary(self):
        for changes in ({"sourceCommit": "b" * 40}, {"releaseSequence": 15}, {"deliveryRevision": 12},
                        {"signingPublicKeySha256": "c" * 64}, {"archiveReadbackVerified": False}):
            (self.delivery / "delivery.json").write_text(json.dumps({**self.record, **changes}))
            with self.assertRaises(ValueError): signing.export_public(self.checkout, self.public, self.trust)
            self.assertFalse((self.public / "summary.json").exists())

    def test_extra_public_file_or_changed_archive_is_not_exported(self):
        marker = self.public / "unexpected.pem"; marker.write_text("inert marker")
        with self.assertRaises(ValueError): signing.export_public(self.checkout, self.public, self.trust)
        marker.unlink()
        (self.public / "eos-linux-arm64.tar.gz").write_bytes(b"changed archive")
        with self.assertRaises(ValueError): signing.export_public(self.checkout, self.public, self.trust)
        self.assertFalse((self.public / "eos-public-metadata.zip").exists())


def load_tests(loader, _tests, _pattern):
    classes = (legacy.InputTests, legacy.PublicFileTests, legacy.KeyLifetimeTests,
               QualificationTests, DirectoryTests, QualifiedCheckoutTests, SigningOrderTests, PublicExportTests)
    return unittest.TestSuite(loader.loadTestsFromTestCase(cls) for cls in classes)


if __name__ == "__main__":
    unittest.main()
