"""Isolated downloader tests. No network credentials, APT or native Linux install."""
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import ssl
import stat
import tempfile
import types
import unittest
from unittest import mock

SOURCE = Path(__file__).resolve().parents[2] / "tools/bootstrap/github-download.py"
SPEC = importlib.util.spec_from_file_location("eos_github_download", SOURCE)
subject = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(subject)
TOKEN = b"github_pat_PUBLIC_TEST_FIXTURE_ONLY_123456789"


def item(data, name=None):
    result = {"blob": hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest(),
              "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    if name is not None:
        result["name"] = name
    return result


def fixture():
    code = b'''import hashlib
import json
def preflight(staging):
    assert not (staging / "installer-kit.zip").exists()
def install_downloaded(config, staging):
    for asset in config["assets"]:
        content = (staging / asset["name"]).read_bytes()
        assert len(content) == asset["bytes"]
        assert hashlib.sha256(content).hexdigest() == asset["sha256"]
    (staging / "fixture-finished.json").write_text(json.dumps(config))
'''
    content = {name: ("fixture bytes: " + name).encode("ascii") for name in subject.ASSETS}
    manifest = {"schemaVersion": 1, "kind": subject.KIND, "repository": subject.REPOSITORY,
                "ready": True, "deliveryDirectory": subject.DELIVERY,
                "prepareHost": item(code), "assets": [item(data, name) for name, data in content.items()]}
    raw = json.dumps(manifest, separators=(",", ":")).encode("ascii")
    blobs = {item(data)["blob"]: data for data in [code, raw, *content.values()]}
    return manifest, raw, blobs


class Response:
    def __init__(self, data, status=200, headers=None):
        self.data = io.BytesIO(data)
        self.status = status
        self.headers = {"Content-Length": str(len(data))} if headers is None else headers
        self.reads = 0

    def getheader(self, name, default=None):
        return self.headers.get(name, default)

    def read(self, size):
        self.reads += 1
        return self.data.read(size)


class Connection:
    def __init__(self, response=None, blobs=None):
        self.response, self.blobs = response, blobs
        self.requests, self.closed = [], False

    def request(self, method, path, headers):
        self.requests.append((method, path, headers))
        if self.blobs is not None:
            self.response = Response(self.blobs[path.rsplit("/", 1)[1]])

    def getresponse(self):
        return self.response

    def close(self):
        self.closed = True


class GithubDownloader(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="eos-github-fixture-")
        self.directory = Path(self.temporary.name)
        self.addCleanup(self.temporary.cleanup)

    def rejected(self, callback, code):
        with self.assertRaisesRegex(subject.Rejected, code):
            callback()

    def transport(self, response):
        connection = Connection(response)
        self.enterContext(mock.patch.object(subject, "_connection", return_value=connection))
        return connection

    def fetch(self, data, **kwargs):
        expected = item(data)
        return subject.fetch_blob(expected["blob"], expected["sha256"], bytearray(TOKEN),
                                  limit=subject.MANIFEST_LIMIT, **kwargs)

    def test_cli_accepts_only_public_pins_and_never_echoes_unknown_secret_argument(self):
        self.assertEqual(subject.parse_arguments(["--manifest-blob", "a" * 40, "--manifest-sha256", "b" * 64]),
                         ("a" * 40, "b" * 64))
        for arguments in (["--token", TOKEN.decode()], ["--manifest-blob", "A" * 40, "--manifest-sha256", "b" * 64],
                          ["--manifest-blob", "a" * 40, "--manifest-sha256", "b" * 64, "--host", "attacker.invalid"]):
            with self.subTest(arguments=arguments):
                self.rejected(lambda: subject.parse_arguments(arguments), "GITHUB_USAGE")

    def test_fd3_is_noninheritable_bounded_ascii_and_always_closed(self):
        for chunks, accepted in (([TOKEN + b"\n", b""], True), ([TOKEN[:20], TOKEN[20:], b""], True),
                                 ([TOKEN + b"\r\n", b""], False), ([TOKEN + b"\nextra", b""], False),
                                 ([b"x" * (subject.TOKEN_LIMIT + 2)], False), ([b"short", b""], False),
                                 ([TOKEN + b"\xff", b""], False)):
            with self.subTest(accepted=accepted, size=sum(map(len, chunks))):
                with mock.patch.object(subject.os, "read", side_effect=chunks) as read, \
                     mock.patch.object(subject.os, "set_inheritable") as inherited, \
                     mock.patch.object(subject.os, "close") as close, \
                     mock.patch.object(subject.select, "select", return_value=([3], [], [])):
                    if accepted:
                        self.assertEqual(subject.read_token(), TOKEN)
                    else:
                        self.rejected(subject.read_token, "GITHUB_TOKEN_INPUT")
                    inherited.assert_called_once_with(3, False)
                    close.assert_called_once_with(3)
                    self.assertTrue(all(call.args[0] == 3 and call.args[1] <= subject.TOKEN_LIMIT + 2 for call in read.call_args_list))

    def test_fd3_timeout_closes_descriptor_without_read(self):
        with mock.patch.object(subject.os, "set_inheritable"), mock.patch.object(subject.os, "close") as close, \
             mock.patch.object(subject.os, "read") as read, mock.patch.object(subject.select, "select", return_value=([], [], [])):
            self.rejected(subject.read_token, "GITHUB_TOKEN_INPUT")
            read.assert_not_called()
            close.assert_called_once_with(3)

    def test_tls_connection_is_fixed_verified_and_ignores_proxy_environment(self):
        context = ssl.create_default_context()
        def protected_info(path):
            return types.SimpleNamespace(st_uid=0, st_mode=(stat.S_IFREG | 0o644) if path == subject.SYSTEM_CA else (stat.S_IFDIR | 0o755),
                                         st_nlink=1, st_size=1000)
        with mock.patch.dict(os.environ, {"HTTPS_PROXY": "http://untrusted.invalid", "SSL_CERT_FILE": "untrusted.pem"}), \
             mock.patch.object(Path, "lstat", protected_info), \
             mock.patch.object(subject.ssl, "create_default_context", return_value=context) as tls, \
             mock.patch.object(subject.http.client, "HTTPSConnection") as constructor:
            subject._connection()
        tls.assert_called_once_with(cafile=str(subject.SYSTEM_CA))
        args, keywords = constructor.call_args
        self.assertEqual(args, (subject.HOST, 443))
        self.assertEqual(keywords["timeout"], 30)
        self.assertEqual(keywords["context"].verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(keywords["context"].check_hostname)
        self.assertGreaterEqual(keywords["context"].minimum_version, ssl.TLSVersion.TLSv1_2)

    def test_system_ca_cannot_be_symlink_or_writable_by_nonroot(self):
        for mode in (stat.S_IFLNK | 0o777, stat.S_IFDIR | 0o777):
            with mock.patch.object(Path, "lstat", return_value=types.SimpleNamespace(st_uid=0, st_mode=mode)), \
                 mock.patch.object(subject.ssl, "create_default_context") as tls:
                self.rejected(subject._connection, "GITHUB_SYSTEM_CA_REJECTED")
                tls.assert_not_called()

    def test_valid_blob_checks_git_object_sha_and_sha256_and_fixed_request(self):
        data = b"small public pinned manifest fixture"
        connection = self.transport(Response(data))
        self.assertEqual(self.fetch(data), data)
        method, path, headers = connection.requests[0]
        self.assertEqual((method, path), ("GET", subject.API_PREFIX + item(data)["blob"]))
        self.assertEqual(headers["Accept"], "application/vnd.github.raw+json")
        self.assertEqual(headers["Authorization"], "Bearer " + TOKEN.decode())
        self.assertEqual(headers["Accept-Encoding"], "identity")
        self.assertTrue(connection.closed)

    def test_redirect_and_access_errors_never_read_error_body_or_follow_location(self):
        for status in (301, 302, 307, 308, 401, 403, 404, 429, 500):
            with self.subTest(status=status):
                response = Response(TOKEN, status, {"Location": "https://attacker.invalid/" + TOKEN.decode()})
                connection = Connection(response)
                with mock.patch.object(subject, "_connection", return_value=connection):
                    self.rejected(lambda: self.fetch(b"expected"), "GITHUB_(REDIRECT|ACCESS|HTTP)_REJECTED")
                self.assertEqual(response.reads, 0)
                self.assertEqual(len(connection.requests), 1)
                self.assertTrue(connection.closed)

    def test_wrong_sha256_or_git_sha_is_rejected_even_when_other_digest_matches(self):
        data = b"authenticated bytes"
        for change in ("sha256", "blob"):
            expected = item(data)
            expected[change] = "0" * len(expected[change])
            with self.subTest(change=change), mock.patch.object(subject, "_connection", return_value=Connection(Response(data))):
                self.rejected(lambda: subject.fetch_blob(expected["blob"], expected["sha256"], bytearray(TOKEN), limit=100), "GITHUB_BLOB_HASH")

    def test_response_limits_truncation_and_encoding_fail_before_any_execution(self):
        data = b"abc"
        cases = ((Response(data, headers={"Content-Length": "100000"}), "SIZE"),
                 (Response(data, headers={"Content-Length": "3, 3"}), "SIZE"),
                 (Response(data, headers={"Content-Length": "4"}), "SIZE"),
                 (Response(data, headers={"Content-Encoding": "gzip"}), "ENCODING"),
                 (Response(b"x" * 101, headers={}), "SIZE"), (Response(b"", headers={}), "SIZE"))
        for response, code in cases:
            with self.subTest(code=code), mock.patch.object(subject, "_connection", return_value=Connection(response)):
                self.rejected(lambda: subject.fetch_blob(item(data)["blob"], item(data)["sha256"], bytearray(TOKEN), limit=100), "GITHUB_RESPONSE_" + code)

    def test_download_deadline_closes_connection_without_reading_or_leaking_exception(self):
        response = Response(b"abc")
        connection = self.transport(response)
        with mock.patch.object(subject.time, "monotonic", side_effect=[0, 61]):
            self.rejected(lambda: self.fetch(b"abc"), "GITHUB_DOWNLOAD_TIMEOUT")
        self.assertTrue(connection.closed)
        self.assertEqual(response.reads, 0)

    def test_streaming_does_not_buffer_large_assets_and_enforces_expected_length(self):
        data = b"0123456789" * 40000
        expected, output = item(data), io.BytesIO()
        self.transport(Response(data))
        self.assertIsNone(subject.fetch_blob(expected["blob"], expected["sha256"], bytearray(TOKEN),
                                            limit=len(data) + 1, expected_bytes=len(data), output=output))
        self.assertEqual(output.getvalue(), data)
        self.rejected(lambda: subject.fetch_blob(expected["blob"], expected["sha256"], bytearray(TOKEN), limit=len(data)), "GITHUB_BLOB_INPUT")

    def test_manifest_rejects_wrong_repository_custom_paths_extras_types_and_large_assets(self):
        manifest, unused, blobs = fixture()
        self.assertEqual(subject.validate_manifest(manifest), manifest)
        changes = []
        for field, value in (("repository", "attacker/repo"), ("schemaVersion", True), ("ready", 1),
                             ("deliveryDirectory", "delivery/test-pi-0.2.0-test.3"), ("token", TOKEN.decode())):
            changed = copy.deepcopy(manifest)
            changed[field] = value
            changes.append(changed)
        for field, value in (("name", "../../escape"), ("bytes", True), ("bytes", 200 * 1024**2),
                             ("url", "https://attacker.invalid"), ("blob", "../path")):
            changed = copy.deepcopy(manifest)
            changed["assets"][0][field] = value
            changes.append(changed)
        changed = copy.deepcopy(manifest)
        changed["assets"][2] = changed["assets"][0]
        changes.append(changed)
        for changed in changes:
            self.rejected(lambda: subject.validate_manifest(changed), "GITHUB_MANIFEST")
        self.rejected(lambda: json.loads('{"ready":true,"ready":false}', object_pairs_hook=subject.unique_object), "GITHUB_MANIFEST_DUPLICATE")

    def isolated_main(self, raw, blobs, **patches):
        token, connections = bytearray(TOKEN), []
        def connect():
            connection = Connection(blobs=blobs)
            connections.append(connection)
            return connection
        self.enterContext(mock.patch.object(subject, "read_token", return_value=token))
        self.enterContext(mock.patch.object(subject, "check_host"))
        self.enterContext(mock.patch.object(subject, "create_staging", return_value=self.directory))
        # Windows cannot evidence POSIX ownership/mode. Only this check is stubbed;
        # real exclusive creation, content, hashes and helper import are exercised.
        self.enterContext(mock.patch.object(subject, "_check_private_file"))
        self.enterContext(mock.patch.object(subject, "_connection", side_effect=connect))
        for name, replacement in patches.items():
            self.enterContext(mock.patch.object(subject, name, replacement))
        return token, connections, ["--manifest-blob", item(raw)["blob"], "--manifest-sha256", item(raw)["sha256"]]

    def test_full_download_authenticates_helper_and_all_assets_before_import_and_install(self):
        manifest, raw, blobs = fixture()
        token, connections, arguments = self.isolated_main(raw, blobs)
        original_load = subject.load_prepare
        def checked_load(path, expected):
            module = original_load(path, expected)
            original_install = module.install_downloaded
            def checked_install(config, staging):
                self.assertEqual(token, bytearray(len(TOKEN)))
                self.assertTrue(all(connection.closed for connection in connections))
                self.assertNotIn(TOKEN.decode(), json.dumps(config))
                return original_install(config, staging)
            module.install_downloaded = checked_install
            return module
        with mock.patch.object(subject, "load_prepare", side_effect=checked_load), mock.patch.object(subject.os, "close") as close:
            subject.main(arguments)
            close.assert_not_called()  # Never close an unrelated reused FD 3 later.
        self.assertEqual(len(connections), 5)
        installed = json.loads((self.directory / "fixture-finished.json").read_text())
        self.assertEqual(installed["deliveryDirectory"], subject.DELIVERY)
        self.assertEqual(installed["baseUrl"], "https://api.github.com/repos/NexoWatt/nexowatt-eos")
        for path in self.directory.iterdir():
            self.assertNotIn(TOKEN, path.read_bytes())
        self.assertFalse((self.directory / "__pycache__").exists())

    def test_blocked_manifest_fails_before_staging_helper_or_host_install(self):
        raw = json.dumps({"schemaVersion": 1, "kind": subject.KIND, "repository": subject.REPOSITORY,
                          "ready": False, "reason": "manufacturer-license-trust-missing"}).encode()
        token, connections, arguments = self.isolated_main(raw, {item(raw)["blob"]: raw})
        with mock.patch.object(subject, "create_staging") as staging, mock.patch.object(subject, "load_prepare") as helper:
            self.rejected(lambda: subject.main(arguments), "BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING")
            staging.assert_not_called()
            helper.assert_not_called()
        self.assertEqual(token, bytearray(len(TOKEN)))
        self.assertEqual(len(connections), 1)

    def test_forged_helper_never_imports_or_runs_and_clears_token(self):
        manifest, raw, blobs = fixture()
        blobs[manifest["prepareHost"]["blob"]] = b"raise RuntimeError('never execute')"
        token, unused, arguments = self.isolated_main(raw, blobs)
        with mock.patch.object(subject, "load_prepare") as helper:
            self.rejected(lambda: subject.main(arguments), "GITHUB_RESPONSE_SIZE|GITHUB_BLOB_HASH")
            helper.assert_not_called()
        self.assertEqual(token, bytearray(len(TOKEN)))

    def test_forged_asset_never_reaches_install_and_clears_token(self):
        manifest, raw, blobs = fixture()
        bad = manifest["assets"][2]
        blobs[bad["blob"]] = b"x" * bad["bytes"]
        helper = types.SimpleNamespace(preflight=mock.Mock(), install_downloaded=mock.Mock())
        token, unused, arguments = self.isolated_main(raw, blobs, load_prepare=mock.Mock(return_value=helper))
        self.rejected(lambda: subject.main(arguments), "GITHUB_BLOB_HASH")
        helper.preflight.assert_called_once()
        helper.install_downloaded.assert_not_called()
        self.assertEqual(token, bytearray(len(TOKEN)))

    def test_download_exclusive_fixed_filenames_prevent_overwrite_or_path_injection(self):
        (self.directory / "installer-kit.zip").write_bytes(b"preserved")
        with self.assertRaises(FileExistsError):
            subject.download_file(self.directory, "installer-kit.zip", item(b"new"), bytearray(TOKEN), 100)
        self.assertEqual((self.directory / "installer-kit.zip").read_bytes(), b"preserved")
        self.rejected(lambda: subject.download_file(self.directory, "../escape", item(b"new"), bytearray(TOKEN), 100), "GITHUB_STAGING_NAME")

    def test_changed_helper_between_download_and_import_is_rejected(self):
        path = self.directory / "prepare-host.py"
        expected = item(b"x = 1\n")
        path.write_bytes(b"x = 2\n")
        with mock.patch.object(subject, "_check_private_file"), mock.patch.object(subject.importlib.util, "spec_from_file_location") as load:
            self.rejected(lambda: subject.load_prepare(path, expected), "GITHUB_PREPARER_HASH")
            load.assert_not_called()

    def test_private_file_requires_root_regular_single_link_and_exact_mode(self):
        valid = dict(st_mode=stat.S_IFREG | 0o600, st_uid=0, st_nlink=1)
        for field, value in (("st_mode", stat.S_IFLNK | 0o600), ("st_mode", stat.S_IFREG | 0o644),
                             ("st_uid", 1000), ("st_nlink", 2)):
            with mock.patch.object(subject.os, "fstat", return_value=types.SimpleNamespace(**{**valid, field: value})):
                self.rejected(lambda: subject._check_private_file(7), "GITHUB_STAGING_FILE")
        with mock.patch.object(subject.os, "fstat", return_value=types.SimpleNamespace(**valid)):
            subject._check_private_file(7)

    def test_early_host_refuses_nonlinux_nonroot_and_non_tty_without_install(self):
        with mock.patch.object(subject.sys, "platform", "win32"):
            self.rejected(subject.check_host, "GITHUB_LINUX_ROOT_REQUIRED")
        with mock.patch.object(subject.sys, "platform", "linux"), mock.patch.object(subject.os, "geteuid", return_value=1000, create=True):
            self.rejected(subject.check_host, "GITHUB_LINUX_ROOT_REQUIRED")
        with mock.patch.object(subject.sys, "platform", "linux"), mock.patch.object(subject.os, "geteuid", return_value=0, create=True), \
             mock.patch.object(subject.os, "O_NOFOLLOW", 0, create=True), mock.patch.object(subject.os, "O_NOCTTY", 0, create=True), \
             mock.patch.object(subject.os, "open", return_value=9), mock.patch.object(subject.os, "close") as close, \
             mock.patch.object(subject.os, "fstat", return_value=types.SimpleNamespace(st_mode=stat.S_IFREG | 0o600)):
            self.rejected(subject.check_host, "GITHUB_CONTROLLING_TTY_REQUIRED")
            close.assert_called_once_with(9)

    def test_public_errors_never_expose_response_exception_or_token(self):
        for error in (RuntimeError(TOKEN.decode()), OSError("https://example.invalid/" + TOKEN.decode()),
                      subject.Rejected("GITHUB_" + TOKEN.decode()), subject.Rejected("bad\n" + TOKEN.decode())):
            self.assertNotIn(TOKEN.decode(), subject.error_message(error))
            self.assertNotIn("https://", subject.error_message(error))
        self.assertIn("oeffentliche Hersteller-Lizenzschluessel", subject.error_message(subject.Rejected("BOOTSTRAP_MANUFACTURER_LICENSE_TRUST_MISSING")))


if __name__ == "__main__":
    unittest.main(verbosity=2)
