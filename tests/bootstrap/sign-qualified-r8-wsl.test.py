#!/usr/bin/python3
"""Local signing boundary fixtures; no downloads, real keys or Pi operations."""
import hashlib
import importlib.util
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
