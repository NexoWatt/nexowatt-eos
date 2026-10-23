#!/usr/bin/python3
"""Local signing boundary fixtures; no downloads, real keys or Pi operations."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest
import warnings
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "qualified_signing", ROOT / "tools/bootstrap/sign-qualified-r8-wsl.py")
signing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signing)


class InputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eos-signing-input-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)

    def archive(self, entries):
        file = self.base / "input.zip"
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)  # Deliberate duplicate fixture.
            with zipfile.ZipFile(file, "w", zipfile.ZIP_DEFLATED) as output:
                for name, data in entries:
                    output.writestr(name, data)
        return file

    def test_size_digest_and_regular_file_admission(self):
        file = self.base / "input.bin"
        file.write_bytes(b"qualified bytes")
        size = file.stat().st_size
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        signing.check_file(file, size, digest)
        with self.assertRaises(ValueError):
            signing.check_file(file, size + 1, digest)
        file.write_bytes(b"corrupted bytes")  # Same length: the digest must decide.
        self.assertEqual(file.stat().st_size, size)
        with self.assertRaises(ValueError):
            signing.check_file(file, size, digest)
        link = self.base / "link.bin"
        link.symlink_to(file)
        with self.assertRaises(ValueError):
            signing.check_file(link, size, hashlib.sha256(file.read_bytes()).hexdigest())

    def test_allowlisted_zip_roundtrip_and_no_destination_overwrite(self):
        file = self.archive([("runtime/input.tar.gz", b"runtime"), ("evidence.json", b"{}")])
        expected = {"runtime/input.tar.gz": 7, "evidence.json": 2}
        output = self.base / "output"
        signing.extract_zip(file, output, expected)
        self.assertEqual((output / "runtime/input.tar.gz").read_bytes(), b"runtime")
        self.assertEqual((output / "evidence.json").read_bytes(), b"{}")
        self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o700)
        with self.assertRaises(FileExistsError):
            signing.extract_zip(file, output, expected)
        self.assertEqual((output / "evidence.json").read_bytes(), b"{}")

    def test_unexpected_missing_duplicate_and_oversized_members_fail_before_output(self):
        cases = [
            ([("wanted", b"ok"), ("extra", b"no")], {"wanted": 2}),
            ([("wanted", b"ok")], {"wanted": 2, "missing": 2}),
            ([("wanted", b"ok"), ("wanted", b"ok")], {"wanted": 2}),
            ([("wanted", b"big")], {"wanted": 2}),
        ]
        for index, (entries, expected) in enumerate(cases):
            with self.subTest(index=index):
                output = self.base / ("rejected-" + str(index))
                with self.assertRaises(ValueError):
                    signing.extract_zip(self.archive(entries), output, expected)
                self.assertFalse(output.exists())

    def test_paths_are_rejected_even_if_allowlist_contains_them(self):
        names = ["../escaped", "nested/../../escaped", "/absolute", "nested\\escaped",
                 "nested/./escaped", "nested//escaped", "directory/"]
        for index, name in enumerate(names):
            with self.subTest(name=name):
                output = self.base / ("path-" + str(index))
                with self.assertRaises(ValueError):
                    signing.extract_zip(self.archive([(name, b"no")]), output, {name: 2})
                self.assertFalse(output.exists())

    def test_unix_symlink_and_special_member_fail_before_output(self):
        for index, kind in enumerate((stat.S_IFLNK, stat.S_IFIFO, stat.S_IFCHR)):
            with self.subTest(kind=kind):
                entry = zipfile.ZipInfo("wanted")
                entry.create_system = 3
                entry.external_attr = (kind | 0o600) << 16
                output = self.base / ("special-" + str(index))
                with self.assertRaises(ValueError):
                    signing.extract_zip(self.archive([(entry, b"no")]), output, {"wanted": 2})
                self.assertFalse(output.exists())


class SigningDirectoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eos-signing-directory-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.home = self.base / "home"
        self.home.mkdir()
        self.default = self.home / "nexowatt-signing"
        self.default.mkdir(mode=0o700)
        self.replacement = self.home / "nexowatt-signing-neu-fixture"
        self.replacement.mkdir(mode=0o700)

    def test_default_is_fixed_and_replacement_requires_explicit_path(self):
        self.assertEqual(signing.signing_directory(self.home), self.default)
        self.assertEqual(signing.signing_directory(self.home, str(self.replacement)), self.replacement)
        self.default.rmdir()
        with self.assertRaises(ValueError):
            signing.signing_directory(self.home)
        self.assertTrue(self.replacement.is_dir())

    def test_rejects_relative_outside_home_and_noncanonical_paths(self):
        outside = self.base / "home-other"
        outside.mkdir()
        link = self.home / "key-alias"
        link.symlink_to(self.replacement, target_is_directory=True)
        file = self.home / "not-a-directory"
        file.write_bytes(b"fixture")
        candidates = ["nexowatt-signing-neu-fixture", self.home, outside, link,
                      self.home / "missing", file,
                      self.replacement / ".." / self.replacement.name]
        for candidate in candidates:
            with self.subTest(path=str(candidate)):
                with self.assertRaises(ValueError):
                    signing.signing_directory(self.home, str(candidate))


class QualifiedCheckoutTests(unittest.TestCase):
    DELIVERY_FILES = (
        "delivery/managed-test-15/eos-linux-arm64.tar.gz",
        "delivery/managed-test-15/release-public.pem",
        "delivery/managed-test-15/delivery.json",
    )

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eos-qualified-checkout-test-")
        self.addCleanup(self.temp.cleanup)
        self.checkout = Path(self.temp.name)
        self.write("tracked.txt", b"qualified source fixture\n")
        self.write(".gitignore", b"/.work/\n")
        self.git("init", "-q")
        self.git("config", "core.hooksPath", "/dev/null")
        self.git("add", "tracked.txt", ".gitignore")
        self.git("commit", "-qm", "Disposable qualified fixture")
        self.source = self.git("rev-parse", "HEAD").strip().decode("ascii")
        source_pin = patch.object(signing, "SOURCE", self.source)
        source_pin.start()
        self.addCleanup(source_pin.stop)

    def git(self, *args):
        return subprocess.check_output([
            "/usr/bin/git", "-C", str(self.checkout),
            "-c", "user.name=EOS fixture", "-c", "user.email=fixture@invalid",
            "-c", "commit.gpgsign=false",
            *args], stderr=subprocess.PIPE)

    def write(self, relative, data=b"public delivery fixture\n"):
        file = self.checkout / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)
        return file

    def assert_rejected(self):
        for allow_delivery in (False, True):
            with self.subTest(allow_delivery=allow_delivery):
                with self.assertRaises(ValueError):
                    signing.assert_qualified_checkout(
                        self.checkout, allow_delivery=allow_delivery)

    def test_strict_clean_before_build_and_exact_untracked_delivery_after_build(self):
        self.write(".work/ignored-build-output", b"temporary fixture\n")
        signing.assert_qualified_checkout(self.checkout)
        for name in self.DELIVERY_FILES:
            self.write(name)
        with self.assertRaises(ValueError):
            signing.assert_qualified_checkout(self.checkout)
        signing.assert_qualified_checkout(self.checkout, allow_delivery=True)
        self.assertEqual(self.git("rev-parse", "HEAD").strip().decode("ascii"), self.source)

    def test_each_allowlisted_delivery_path_is_untracked_and_requires_explicit_mode(self):
        for name in self.DELIVERY_FILES:
            with self.subTest(name=name):
                file = self.write(name)
                with self.assertRaises(ValueError):
                    signing.assert_qualified_checkout(self.checkout)
                signing.assert_qualified_checkout(self.checkout, allow_delivery=True)
                file.unlink()

    def test_unexpected_untracked_files_are_rejected_without_mutation(self):
        for name in self.DELIVERY_FILES:
            self.write(name)
        extras = [
            "unexpected.txt",
            "delivery/private.pem",
            "delivery/managed-test-15/private.pem",
            "delivery/managed-test-15/eos-linux-arm64.tar.gz.extra",
            "delivery/managed-test-15/nested/delivery.json",
            "delivery/managed-test-150/delivery.json",
            "delivery/managed-test-16/delivery.json",
            "delivery/managed-test-15/delivery.json\n?? injected",
        ]
        for name in extras:
            with self.subTest(name=name):
                file = self.write(name, b"must not be accepted or removed\n")
                before = self.git("status", "--porcelain=v1", "-z", "--untracked-files=all")
                self.assert_rejected()
                self.assertEqual(self.git("status", "--porcelain=v1", "-z", "--untracked-files=all"), before)
                self.assertEqual(file.read_bytes(), b"must not be accepted or removed\n")
                file.unlink()

    def test_tracked_modified_source_is_rejected_even_with_allowed_delivery(self):
        for name in self.DELIVERY_FILES:
            self.write(name)
        self.write("tracked.txt", b"modified source fixture\n")
        self.assert_rejected()

    def test_staged_modified_source_is_rejected(self):
        self.write("tracked.txt", b"staged source fixture\n")
        self.git("add", "tracked.txt")
        self.assert_rejected()

    def test_staged_delivery_is_rejected_even_at_an_allowlisted_path(self):
        self.write(self.DELIVERY_FILES[0])
        self.git("add", self.DELIVERY_FILES[0])
        self.assert_rejected()

    def test_tracked_deletion_is_rejected(self):
        (self.checkout / "tracked.txt").unlink()
        self.assert_rejected()

    def test_tracked_rename_to_allowlisted_delivery_path_is_rejected(self):
        (self.checkout / "delivery/managed-test-15").mkdir(parents=True)
        self.git("mv", "tracked.txt", self.DELIVERY_FILES[0])
        self.assert_rejected()

    def test_clean_different_head_is_rejected(self):
        self.git("commit", "--allow-empty", "-qm", "Different unqualified fixture")
        self.assertFalse(self.git("status", "--porcelain=v1", "-z", "--untracked-files=all"))
        self.assertNotEqual(self.git("rev-parse", "HEAD").strip().decode("ascii"), self.source)
        self.assert_rejected()


class PublicFileTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eos-public-file-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.file = self.base / "public.bin"
        self.file.write_bytes(b"public fixture")
        self.file.chmod(0o600)

    def test_protected_file_accepts_owned_nonempty_regular_file_within_limit(self):
        for mode in (0o600, 0o644):
            with self.subTest(mode=oct(mode)):
                self.file.chmod(mode)
                self.assertEqual(signing.protected_file(self.file, self.file.stat().st_size), self.file)

    def test_protected_file_rejects_empty_oversized_foreign_owned_or_writable_file(self):
        with self.assertRaises(ValueError):
            signing.protected_file(self.file, self.file.stat().st_size - 1)
        uid = os.getuid()
        with patch.object(signing.os, "getuid", return_value=uid + 1):
            with self.assertRaises(ValueError):
                signing.protected_file(self.file, 100)
        for mode in (0o620, 0o602, 0o666):
            with self.subTest(mode=oct(mode)):
                self.file.chmod(mode)
                with self.assertRaises(ValueError):
                    signing.protected_file(self.file, 100)
        self.file.chmod(0o600)
        self.file.write_bytes(b"")
        with self.assertRaises(ValueError):
            signing.protected_file(self.file, 100)

    def test_protected_file_rejects_links_noncanonical_paths_and_directories(self):
        link = self.base / "link.bin"
        link.symlink_to(self.file)
        for candidate in (link, self.base, self.base / ".." / self.base.name / self.file.name):
            with self.subTest(path=str(candidate)):
                with self.assertRaises(ValueError):
                    signing.protected_file(candidate, 100)
        link.unlink()
        os.link(self.file, link)
        for candidate in (self.file, link):
            with self.subTest(hardlink=str(candidate)):
                with self.assertRaises(ValueError):
                    signing.protected_file(candidate, 100)

    def test_copy_public_is_byte_exact_and_never_overwrites(self):
        output = self.base / "copied.bin"
        signing.copy_public(self.file, output, 100)
        self.assertEqual(output.read_bytes(), self.file.read_bytes())
        output.write_bytes(b"preserved existing destination")
        with self.assertRaises(FileExistsError):
            signing.copy_public(self.file, output, 100)
        self.assertEqual(output.read_bytes(), b"preserved existing destination")
        self.assertEqual(self.file.read_bytes(), b"public fixture")

    def test_copy_public_rejects_unsafe_source_before_creating_destination(self):
        self.file.chmod(0o666)
        output = self.base / "must-not-exist.bin"
        with self.assertRaises(ValueError):
            signing.copy_public(self.file, output, 100)
        self.assertFalse(output.exists())

    def test_copy_public_detects_real_source_shrink_or_growth_after_size_check(self):
        original = self.file.read_bytes()
        real_open = Path.open
        for index, changed in enumerate((original[:-3], original + b"extra")):
            with self.subTest(changed_size=len(changed)):
                self.file.write_bytes(original)
                output = self.base / ("changed-" + str(index))
                def changed_before_read(path, mode="r", *args, **kwargs):
                    if path == self.file and mode == "rb":
                        with real_open(path, "wb") as stream:
                            stream.write(changed)
                    return real_open(path, mode, *args, **kwargs)
                with patch.object(Path, "open", new=changed_before_read):
                    with self.assertRaises(ValueError):
                        signing.copy_public(self.file, output, 100)


class PublicExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eos-public-export-test-")
        self.addCleanup(self.temp.cleanup)
        self.work = Path(self.temp.name)
        self.delivery = self.work / "checkout/delivery/managed-test-15"
        self.delivery.mkdir(parents=True)
        self.public = self.work / "public-finished"
        (self.public / "r8-entry").mkdir(parents=True)
        archive = b"unsigned fixture; export boundary test only\n"
        self.metadata = {"releaseId": "a" * 64, "releaseSequence": 15,
                         "sourceCommit": signing.SOURCE, "sha256": hashlib.sha256(archive).hexdigest(),
                         "bytes": len(archive), "signingPublicKeySha256": signing.KEY_SHA,
                         "archiveReadbackVerified": False}
        self.write(self.delivery / "eos-linux-arm64.tar.gz", archive)
        public_key = (ROOT / "docs/security/release-trust/manufacturer-20261023-2.pem").read_bytes()
        self.write(self.delivery / "release-public.pem", public_key)
        self.write(self.delivery / "delivery.json", json.dumps(self.metadata).encode())
        for name in ("test.json", "r8-entry/update.sh", "r8-entry/preparation.json"):
            self.write(self.public / name, b"public export fixture only\n")

    @staticmethod
    def write(file, data):
        file.write_bytes(data)
        file.chmod(0o600)

    def test_export_contains_exact_public_allowlist_without_recursive_private_inputs(self):
        excluded = b"excluded sentinel fixture; not a real key\n"
        self.write(self.work / "release-private.encrypted.pem", excluded)
        self.write(self.delivery / "private.pem", excluded)
        self.write(self.public / "private.pem", excluded)
        delivery_bytes = (self.delivery / "delivery.json").read_bytes()
        with patch("builtins.print"):
            signing.export_public(self.work, self.public,
                                  expected_delivery=(len(delivery_bytes), hashlib.sha256(delivery_bytes).hexdigest()))
        for name in signing.DELIVERY_FILES:
            self.assertEqual((self.public / name).read_bytes(), (self.delivery / name).read_bytes())
        expected = {"release-public.pem", "delivery.json", "test.json", "summary.json",
                    "r8-entry/update.sh", "r8-entry/preparation.json"}
        with zipfile.ZipFile(self.public / "eos-public-metadata.zip") as output:
            self.assertEqual(set(output.namelist()), expected)
            self.assertEqual(len(output.namelist()), len(expected))
            for name in expected:
                self.assertEqual(output.read(name), (self.public / name).read_bytes())
                self.assertNotIn(excluded, output.read(name))
        summary = json.loads((self.public / "summary.json").read_text())
        self.assertFalse(summary["published"])
        self.assertFalse(summary["physicalPiTested"])
        self.assertFalse(summary["archiveReadbackVerified"])
        self.assertEqual(summary["signingPublicKeySha256"], signing.KEY_SHA)

    def test_export_does_not_overwrite_existing_delivery_output(self):
        existing = self.public / "eos-linux-arm64.tar.gz"
        self.write(existing, b"preserve previous export")
        with self.assertRaises(FileExistsError):
            signing.export_public(self.work, self.public)
        self.assertEqual(existing.read_bytes(), b"preserve previous export")
        self.assertFalse((self.public / "summary.json").exists())
        self.assertFalse((self.public / "eos-public-metadata.zip").exists())

    def assert_unfinished(self, public=None):
        public = self.public if public is None else public
        self.assertFalse((public / "summary.json").exists())
        self.assertFalse((public / "eos-public-metadata.zip").exists())

    def test_export_rejects_copied_archive_digest_mismatch_before_summary(self):
        archive = self.delivery / "eos-linux-arm64.tar.gz"
        original = archive.read_bytes()
        self.write(archive, bytes([original[0] ^ 1]) + original[1:])
        with self.assertRaises(ValueError):
            signing.export_public(self.work, self.public)
        self.assert_unfinished()

    def test_export_rejects_copied_archive_size_mismatch_before_summary(self):
        self.metadata["bytes"] += 1
        self.write(self.delivery / "delivery.json", json.dumps(self.metadata).encode())
        with self.assertRaises(ValueError):
            signing.export_public(self.work, self.public)
        self.assert_unfinished()

    def test_export_rejects_former_public_key_before_summary(self):
        former = (ROOT / "docs/security/release-trust/manufacturer-20261023.pem").read_bytes()
        self.write(self.delivery / "release-public.pem", former)
        with self.assertRaises(ValueError):
            signing.export_public(self.work, self.public)
        self.assert_unfinished()

    def test_export_rejects_unqualified_source_sequence_or_trust_before_summary(self):
        cases = [{"sourceCommit": "b" * 40}, {"releaseSequence": 14},
                 {"signingPublicKeySha256": "0" * 64}]
        for index, change in enumerate(cases):
            with self.subTest(change=change):
                public = self.work / ("rejected-export-" + str(index))
                public.mkdir(mode=0o700)
                self.write(self.delivery / "delivery.json", json.dumps({**self.metadata, **change}).encode())
                with self.assertRaises(ValueError):
                    signing.export_public(self.work, public)
                self.assert_unfinished(public)

    def test_export_rejects_changed_recovery_delivery_pin_before_summary(self):
        size = (self.delivery / "delivery.json").stat().st_size
        with self.assertRaises(ValueError):
            signing.export_public(self.work, self.public, expected_delivery=(size, "0" * 64))
        self.assert_unfinished()


class RecoveryPreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eos-recovery-preflight-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.home = self.base / "home"
        self.home.mkdir(mode=0o700)
        self.work = self.home / "eos-sign-15-fixture"
        self.work.mkdir(mode=0o700)
        for name in ("checkout/.git", "checkout/delivery/managed-test-15", "public/r8-entry"):
            (self.work / name).mkdir(parents=True, mode=0o700)

    def assert_rejected_before_execution(self, work):
        with patch.object(signing, "run", side_effect=AssertionError("Preflight must not execute a child")) as run:
            with patch.object(signing, "decrypted_key", side_effect=AssertionError("Recovery must not open a key")) as key:
                with self.assertRaises(ValueError):
                    signing.finish_existing(self.home, work, Path("/unused-fixture-node"))
                run.assert_not_called()
                key.assert_not_called()
        self.assertFalse((self.work / "public-finished").exists())

    def test_recovery_rejects_wrong_home_prefix_and_relative_path_before_execution(self):
        for candidate in (self.base / "eos-sign-15-outside", self.home / "other-name", Path(self.work.name)):
            with self.subTest(path=str(candidate)):
                self.assert_rejected_before_execution(candidate)

    def test_recovery_rejects_nonprivate_or_symlinked_work_directory_before_execution(self):
        self.work.chmod(0o755)
        self.assert_rejected_before_execution(self.work)
        self.work.chmod(0o700)
        link = self.home / "eos-sign-15-link"
        link.symlink_to(self.work, target_is_directory=True)
        self.assert_rejected_before_execution(link)

    def test_recovery_rejects_extra_delivery_files_before_any_child_execution(self):
        directory = self.work / "checkout/delivery/managed-test-15"
        for name in signing.DELIVERY_FILES:
            (directory / name).write_bytes(b"not-yet-verified fixture\n")
        (directory / "private.pem").write_bytes(b"excluded sentinel fixture\n")
        self.assert_rejected_before_execution(self.work)


class EntryToolTests(unittest.TestCase):
    OLD_KEY = b"95151b5f26aa09a95c2f0cb5215fdfc7a7fc3066da9e670937d1e8b50c701248"
    NEW_KEY = b"518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40"
    ORIGINAL_SHA = "4709a10de3330ea7de740dda7cbf7f5e45d898c0cf16da470cb681ed4efa2278"
    REPLACED_SHA = "9a5cb7980c45ed1d3f812f70790b682c28f53f36050298c903587d74310ec388"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eos-entry-tool-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.replacement = (ROOT / "tools/bootstrap/build-public-r8-managed-entry.cjs").read_bytes()
        self.original = self.replacement.replace(self.NEW_KEY, self.OLD_KEY)
        self.file = self.base / "entry.cjs"
        self.file.write_bytes(self.original)
        self.file.chmod(0o644)

    def assert_restored(self):
        self.assertEqual(self.file.read_bytes(), self.original)
        self.assertEqual(stat.S_IMODE(self.file.stat().st_mode), 0o644)
        self.assertEqual(list(self.base.glob(".eos-entry-*")), [])

    def test_full_pins_bind_qualified_source_and_actual_replacement_module(self):
        self.assertEqual(signing.PREVIOUS_KEY_SHA.encode("ascii"), self.OLD_KEY)
        self.assertEqual(signing.KEY_SHA.encode("ascii"), self.NEW_KEY)
        self.assertEqual(signing.ENTRY_ORIGINAL_SHA256, self.ORIGINAL_SHA)
        self.assertEqual(signing.ENTRY_REPLACED_SHA256, self.REPLACED_SHA)
        self.assertEqual(hashlib.sha256(self.original).hexdigest(), self.ORIGINAL_SHA)
        self.assertEqual(hashlib.sha256(self.replacement).hexdigest(), self.REPLACED_SHA)
        self.assertEqual(self.original.count(self.OLD_KEY), 1)
        self.assertEqual(self.replacement.count(self.NEW_KEY), 1)
        self.assertEqual(signing.entry_sources(self.file), (self.original, self.replacement))
        self.assert_restored()

    def test_scoped_replacement_then_byte_exact_restoration(self):
        with signing.replacement_entry_tool(self.file):
            self.assertEqual(self.file.read_bytes(), self.replacement)
            self.assertEqual(stat.S_IMODE(self.file.stat().st_mode), 0o644)
            self.assertEqual(self.file.stat().st_nlink, 1)
            self.assertEqual(list(self.base.glob(".eos-entry-*")), [])
        self.assert_restored()

    def test_body_failure_and_interrupt_restore_source_and_permissions(self):
        for error in (RuntimeError, KeyboardInterrupt):
            with self.subTest(error=error.__name__):
                with self.assertRaises(error):
                    with signing.replacement_entry_tool(self.file):
                        self.assertEqual(self.file.read_bytes(), self.replacement)
                        raise error("disposable entry fixture interrupted")
                self.assert_restored()

    def test_modified_source_and_wrong_replacement_pin_fail_before_write(self):
        corrupt = self.original + b"\n// unexpected source change\n"
        self.file.write_bytes(corrupt)
        inode = self.file.stat().st_ino
        with self.assertRaises(ValueError):
            with signing.replacement_entry_tool(self.file):
                self.fail("Modified original was accepted")
        self.assertEqual(self.file.read_bytes(), corrupt)
        self.assertEqual(self.file.stat().st_ino, inode)
        self.file.write_bytes(self.original)
        with patch.object(signing, "ENTRY_REPLACED_SHA256", "0" * 64):
            with self.assertRaises(ValueError):
                with signing.replacement_entry_tool(self.file):
                    self.fail("Unbound replacement was applied")
        self.assertEqual(self.file.stat().st_ino, inode)
        self.assert_restored()

    def test_symlink_hardlink_foreign_owner_and_unsafe_modes_are_rejected(self):
        link = self.base / "symlink.cjs"
        link.symlink_to(self.file)
        with self.assertRaises(ValueError):
            with signing.replacement_entry_tool(link):
                self.fail("Symlink was followed")
        self.assert_restored()
        link.unlink()
        os.link(self.file, link)
        for candidate in (self.file, link):
            with self.subTest(hardlink=str(candidate)):
                with self.assertRaises(ValueError):
                    with signing.replacement_entry_tool(candidate):
                        self.fail("Multiply linked source was accepted")
                self.assert_restored()
        link.unlink()
        uid = os.getuid()
        with patch.object(signing.os, "getuid", return_value=uid + 1):
            with self.assertRaises(ValueError):
                with signing.replacement_entry_tool(self.file):
                    self.fail("Foreign-owned source was accepted")
        for mode in (0o600, 0o664, 0o755):
            with self.subTest(mode=oct(mode)):
                self.file.chmod(mode)
                with self.assertRaises(ValueError):
                    with signing.replacement_entry_tool(self.file):
                        self.fail("Noncanonical source mode was accepted")
                self.assertEqual(self.file.read_bytes(), self.original)
                self.assertEqual(stat.S_IMODE(self.file.stat().st_mode), mode)
                self.assertEqual(list(self.base.glob(".eos-entry-*")), [])
        self.file.chmod(0o644)
        self.assert_restored()


@unittest.skipUnless(Path("/usr/bin/openssl").is_file() and Path("/dev/shm").is_dir(),
                     "Linux OpenSSL and /dev/shm required for disposable crypto fixture")
class KeyLifetimeTests(unittest.TestCase):
    def setUp(self):
        if subprocess.check_output(["/usr/bin/stat", "-f", "-c", "%T", "/dev/shm"]).strip() != b"tmpfs":
            self.skipTest("Key fixture requires actual tmpfs")
        self.temp = tempfile.TemporaryDirectory(prefix="eos-key-fixture-", dir="/dev/shm")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.encrypted = self.base / "encrypted.pem"
        # Generated per test. No fixture private-key bytes or durable secret are
        # embedded, printed, committed or passed to the real manufacturer trust.
        subprocess.run(["/usr/bin/openssl", "genpkey", "-algorithm", "ED25519", "-aes-256-cbc",
                        "-pass", "pass:disposable-test-passphrase", "-out", str(self.encrypted)],
                       check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.encrypted.chmod(0o600)
        public = subprocess.check_output([
            "/usr/bin/openssl", "pkey", "-in", str(self.encrypted),
            "-passin", "pass:disposable-test-passphrase", "-pubout"])
        self.public_hash = hashlib.sha256(public).hexdigest()
        self.original_encrypted = self.encrypted.read_bytes()
        self.real_run = signing.run
        self.temporary_keys = []

    def fixture_run(self, args, **kwargs):
        command = [str(value) for value in args]
        if command[:2] == ["/usr/bin/openssl", "pkey"] and "-out" in command:
            self.temporary_keys.append(Path(command[command.index("-out") + 1]))
            command.extend(["-passin", "pass:disposable-test-passphrase"])
        return self.real_run(command, **kwargs)

    def assert_cleaned(self):
        self.assertTrue(self.temporary_keys)
        for file in self.temporary_keys:
            self.assertFalse(file.exists())
            self.assertFalse(file.parent.exists())
        self.assertEqual(self.encrypted.read_bytes(), self.original_encrypted)

    def test_success_yields_restricted_real_key_then_removes_temporary_directory(self):
        with patch.object(signing, "run", side_effect=self.fixture_run):
            with signing.decrypted_key(self.encrypted, self.public_hash) as file:
                self.assertEqual(file.parent.parent, Path("/dev/shm"))
                self.assertEqual(stat.S_IMODE(file.stat().st_mode), 0o600)
                self.assertEqual(stat.S_IMODE(file.parent.stat().st_mode), 0o700)
                public = subprocess.check_output(["/usr/bin/openssl", "pkey", "-in", str(file), "-pubout"])
                self.assertEqual(hashlib.sha256(public).hexdigest(), self.public_hash)
        self.assert_cleaned()

    def test_body_exception_and_interrupt_remove_decrypted_key(self):
        for error in (RuntimeError, KeyboardInterrupt):
            with self.subTest(error=error.__name__):
                with patch.object(signing, "run", side_effect=self.fixture_run):
                    with self.assertRaises(error):
                        with signing.decrypted_key(self.encrypted, self.public_hash):
                            raise error("fixture interruption")
                self.assert_cleaned()

    def test_wrong_public_trust_never_yields_and_removes_decrypted_key(self):
        with patch.object(signing, "run", side_effect=self.fixture_run):
            with self.assertRaises(ValueError):
                with signing.decrypted_key(self.encrypted, "0" * 64):
                    self.fail("A key with the wrong public identity was admitted")
        self.assert_cleaned()

    def test_failed_decryption_removes_partial_key(self):
        def failing_run(args, **kwargs):
            command = [str(value) for value in args]
            if command[:2] == ["/usr/bin/openssl", "pkey"] and "-out" in command:
                file = Path(command[command.index("-out") + 1])
                self.temporary_keys.append(file)
                file.write_bytes(b"partial fixture content")
                raise subprocess.CalledProcessError(1, command)
            return self.real_run(command, **kwargs)
        with patch.object(signing, "run", side_effect=failing_run):
            with self.assertRaises(subprocess.CalledProcessError):
                with signing.decrypted_key(self.encrypted, self.public_hash):
                    self.fail("Failed decryption yielded a key")
        self.assert_cleaned()


if __name__ == "__main__":
    unittest.main()
