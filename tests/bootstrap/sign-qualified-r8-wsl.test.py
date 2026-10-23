#!/usr/bin/python3
"""Local signing boundary fixtures; no downloads, real keys or Pi operations."""
import hashlib
import importlib.util
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
