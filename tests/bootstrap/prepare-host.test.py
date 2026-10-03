"""Isolated stdlib regressions; no APT, native systemd or device execution."""
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile
import tempfile
import unittest
from unittest import mock
import zipfile

SOURCE = Path(__file__).resolve().parents[2] / "tools/bootstrap/prepare-host.py"
SPEC = importlib.util.spec_from_file_location("eos_prepare_host", SOURCE)
subject = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(subject)


def config():
    return {"schemaVersion": 1, "baseUrl": "https://downloads.example.com/eos/test3-r2",
            "deliveryDirectory": subject.DELIVERY,
            "assets": [{"name": name, "bytes": 1, "sha256": subject.NODE_SHA256 if name == subject.NODE_ASSET else "a" * 64}
                       for name in subject.ASSETS]}


def kit_entries():
    return {"tools/bootstrap/first-start.cjs": b"'use strict';\n",
            "bootstrap.json": b"{}", "license-public-trust.json": b"{}",
            subject.DELIVERY + "/delivery.json": b"{}",
            subject.DELIVERY + "/release-public.pem": b"PUBLIC TEST FIXTURE"}


def write_zip(path, additions=None):
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in kit_entries().items():
            archive.writestr(name, content)
        for name, content in additions or []:
            archive.writestr(name, content)


def write_node_tar(path, *, machine=183, kind=tarfile.REGTYPE, duplicate=False):
    content = bytearray(96)
    content[:6] = b"\x7fELF\x02\x01"
    content[16:18] = (3).to_bytes(2, "little")
    content[18:20] = machine.to_bytes(2, "little")
    with tarfile.open(path, "w:xz") as archive:
        ignored = tarfile.TarInfo("node-v24.21.0-linux-arm64/bin/npm")
        ignored.type, ignored.linkname = tarfile.SYMTYPE, "../../outside-never-extracted"
        archive.addfile(ignored)
        for unused in range(2 if duplicate else 1):
            entry = tarfile.TarInfo(subject.NODE_MEMBER)
            entry.type, entry.size = kind, len(content) if kind == tarfile.REGTYPE else 0
            archive.addfile(entry, io.BytesIO(content) if entry.size else None)
    return bytes(content)


DEBIAN_PGP_SOURCES = (
    "Types: deb\nURIs: http://deb.debian.org/debian/\nSuites: trixie trixie-updates\n"
    "Components: main contrib non-free non-free-firmware\n"
    "Signed-By: /usr/share/keyrings/debian-archive-keyring.pgp\n\n"
    "Types: deb\nURIs: http://security.debian.org/debian-security/\nSuites: trixie-security\n"
    "Components: main contrib non-free non-free-firmware\n"
    "Signed-By: /usr/share/keyrings/debian-archive-keyring.pgp\n"
)
RASPBERRY_PI_PGP_SOURCE = (
    "Types: deb\nURIs: http://archive.raspberrypi.com/debian/\nSuites: trixie\n"
    "Components: main\nSigned-By: /usr/share/keyrings/raspberrypi-archive-keyring.pgp\n"
)


class HostPreparation(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="eos-bootstrap-test-")
        self.directory = Path(self.temporary.name)
        self.addCleanup(self.temporary.cleanup)

    def rejected(self, callback, code):
        with self.assertRaisesRegex(subject.Rejected, code):
            callback()

    def downloaded_fixture(self):
        write_zip(self.directory / "installer-kit.zip")
        write_node_tar(self.directory / subject.NODE_ASSET)
        (self.directory / subject.EOS_ASSET).write_bytes(b"opaque signed-runtime archive fixture")
        value = config()
        for asset in value["assets"]:
            data = (self.directory / asset["name"]).read_bytes()
            asset.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
        # The internal fixture pin binds the synthetic ELF tar, not a real Node
        # release. Production keeps the fixed upstream digest and no CLI hook.
        node_hash = next(asset["sha256"] for asset in value["assets"] if asset["name"] == subject.NODE_ASSET)
        self.enterContext(mock.patch.object(subject, "NODE_SHA256", node_hash))
        return value

    def test_config_requires_exact_three_assets_pinned_node_and_fixed_delivery(self):
        self.assertEqual(subject.validate_config(config()), config())
        malformed = []
        for field, value in (("schemaVersion", True), ("deliveryDirectory", "delivery/old"),
                             ("baseUrl", "http://downloads.example.com")):
            changed = config()
            changed[field] = value
            malformed.append(changed)
        changed = config()
        changed["assets"][1]["sha256"] = "b" * 64
        malformed.append(changed)
        changed = config()
        changed["assets"].append(changed["assets"][0])
        malformed.append(changed)
        changed = config()
        changed["assets"][0]["bytes"] = True
        malformed.append(changed)
        changed = config()
        changed["bypass"] = True
        malformed.append(changed)
        for changed in malformed:
            with self.subTest(config=changed):
                self.rejected(lambda: subject.validate_config(changed), "BOOTSTRAP_")
        self.rejected(lambda: json.loads('{"a":1,"a":2}', object_pairs_hook=subject.unique_object), "JSON_DUPLICATE")

    def test_download_origin_rejects_redirect_auth_traversal_and_url_parameters(self):
        for url in ("https://user:token@example.com/eos", "https://example.com/eos?q=x", "https://example.com/#x",
                    "https://example.com/a/../b", "https://example.com/%2e%2e", "https://example.com//eos",
                    "https://example.com:8443/eos", "https://example.com/white space", "https://example.com/./eos"):
            value = config()
            value["baseUrl"] = url
            self.rejected(lambda: subject.validate_config(value), "BASE_URL")

    def test_failed_download_hash_precedes_all_extraction_and_host_mutations(self):
        value = config()
        value["assets"][0]["bytes"] = 3

        def curl(arguments, **unused):
            self.assertEqual(arguments[0:4], ["/usr/bin/curl", "-q", "--proto", "=https"])
            self.assertNotIn("--location", arguments)
            Path(arguments[arguments.index("--output") + 1]).write_bytes(b"bad")
            return subprocess.CompletedProcess(arguments, 0)

        with mock.patch.object(subject, "preflight", return_value=False), mock.patch.object(subject, "run", side_effect=curl), \
                mock.patch.object(subject, "extract_kit") as extract, mock.patch.object(subject, "prepare_packages") as apt, \
                mock.patch.object(subject, "install_node") as node:
            self.rejected(lambda: subject.prepare(value, self.directory), "ASSET_HASH")
            extract.assert_not_called()
            apt.assert_not_called()
            node.assert_not_called()
        self.assertEqual((self.directory / "installer-kit.zip").read_bytes(), b"bad")

    def test_all_downloads_are_fixed_bounded_and_hash_verified(self):
        value = config()
        contents = {name: name.encode("ascii") for name in subject.ASSETS}
        for asset in value["assets"]:
            asset.update(bytes=len(contents[asset["name"]]), sha256=hashlib.sha256(contents[asset["name"]]).hexdigest())
        calls = []

        def curl(arguments, **unused):
            calls.append(arguments)
            target = Path(arguments[arguments.index("--output") + 1])
            target.write_bytes(contents[target.name])
            self.assertEqual(arguments[-1], value["baseUrl"] + "/" + target.name)
            self.assertEqual(arguments[arguments.index("--max-filesize") + 1], str(len(contents[target.name])))
            self.assertIn("--max-time", arguments)
            self.assertNotIn("--insecure", arguments)
            return subprocess.CompletedProcess(arguments, 0)

        with mock.patch.object(subject, "run", side_effect=curl):
            files = subject.download_assets(value, self.directory)
        self.assertEqual(set(files), set(subject.ASSETS))
        self.assertEqual(len(calls), 3)
        for asset in value["assets"]:
            subject.digest_file(files[asset["name"]], asset)

    def test_local_handoff_rehashes_last_asset_before_any_extraction_or_apt(self):
        value = self.downloaded_fixture()
        archive = self.directory / subject.EOS_ASSET
        original = archive.read_bytes()
        archive.write_bytes(bytes([original[0] ^ 1]) + original[1:])
        with mock.patch.object(subject, "preflight", return_value=False) as admission, \
                mock.patch.object(subject, "trusted_path"), mock.patch.object(subject, "digest_file", wraps=subject.digest_file) as digest, \
                mock.patch.object(subject, "extract_kit") as extract, mock.patch.object(subject, "prepare_packages") as apt, \
                mock.patch.object(subject, "install_node") as node, mock.patch.object(subject, "run") as command:
            self.rejected(lambda: subject.install_downloaded(value, self.directory), "ASSET_HASH")
            admission.assert_called_once_with(self.directory)
            self.assertEqual([call.args[0].name for call in digest.call_args_list], list(subject.ASSETS))
            extract.assert_not_called()
            apt.assert_not_called()
            node.assert_not_called()
            command.assert_not_called()
        self.assertFalse((self.directory / "kit").exists())

    def test_local_handoff_reuses_all_verified_assets_with_same_fixed_runner_and_no_download(self):
        value = self.downloaded_fixture()
        events = []
        original_digest = subject.digest_file

        def digest(path, asset):
            original_digest(path, asset)
            events.append(("hash", path.name))

        def apt(stage):
            self.assertEqual(stage, self.directory)
            self.assertEqual(events, [("hash", name) for name in subject.ASSETS])
            self.assertEqual((stage / "kit" / subject.DELIVERY / subject.EOS_ASSET).read_bytes(),
                             (stage / subject.EOS_ASSET).read_bytes())
            events.append(("apt",))

        with mock.patch.object(subject, "preflight", return_value=False), mock.patch.object(subject, "trusted_path"), \
                mock.patch.object(subject, "digest_file", side_effect=digest), \
                mock.patch.object(subject, "prepare_packages", side_effect=apt), mock.patch.object(subject, "install_node") as node, \
                mock.patch.object(subject, "download_assets") as download, \
                mock.patch.object(subject, "run", return_value=subprocess.CompletedProcess([], 0)) as command:
            subject.install_downloaded(value, self.directory)
            download.assert_not_called()
            node.assert_called_once_with(self.directory / "node.bin", False)
            self.assertEqual(command.call_count, 1)
            self.assertEqual(command.call_args.args[0], ["/usr/bin/node", str(self.directory / "kit/tools/bootstrap/first-start.cjs")])
            self.assertEqual(command.call_args.kwargs["cwd"], self.directory / "kit")

    def test_local_handoff_cannot_skip_schema_or_fresh_host_admission(self):
        value = self.downloaded_fixture()
        with mock.patch.object(subject, "preflight", side_effect=subject.Rejected("BOOTSTRAP_EXISTING_EOS")) as admission, \
                mock.patch.object(subject, "digest_file") as digest, mock.patch.object(subject, "prepare_packages") as apt:
            self.rejected(lambda: subject.install_downloaded(value, self.directory), "EXISTING_EOS")
            admission.assert_called_once_with(self.directory)
            digest.assert_not_called()
            apt.assert_not_called()
        value["bypass"] = True
        with mock.patch.object(subject, "preflight") as admission:
            self.rejected(lambda: subject.install_downloaded(value, self.directory), "BOOTSTRAP_CONFIG")
            admission.assert_not_called()

    def test_public_download_path_delegates_to_same_local_revalidation(self):
        value = config()
        events = []
        with mock.patch.object(subject, "preflight", side_effect=lambda stage: events.append("preflight")), \
                mock.patch.object(subject, "download_assets", side_effect=lambda cfg, stage: events.append("download")), \
                mock.patch.object(subject, "install_downloaded", side_effect=lambda cfg, stage: events.append("install_downloaded")) as handoff:
            subject.prepare(value, self.directory)
        self.assertEqual(events, ["preflight", "download", "install_downloaded"])
        handoff.assert_called_once_with(value, self.directory)

    def test_zip_data_only_roundtrip_and_nothing_else_executed(self):
        archive, target = self.directory / "kit.zip", self.directory / "kit"
        write_zip(archive)
        subject.extract_kit(archive, target)
        for name, content in kit_entries().items():
            self.assertEqual((target / name).read_bytes(), content)

    def test_zip_rejects_traversal_duplicates_links_types_collisions_before_writing(self):
        symlink = zipfile.ZipInfo("tools/escape")
        symlink.create_system = 3
        symlink.external_attr = (stat.S_IFLNK | 0o777) << 16
        special = zipfile.ZipInfo("tools/fifo")
        special.create_system = 3
        special.external_attr = (stat.S_IFIFO | 0o600) << 16
        cases = [[("../escape", b"x")], [("/absolute", b"x")], [("C:\\escape", b"x")],
                 [("tools//escape", b"x")], [("tools/./escape", b"x")],
                 [("bootstrap.json", b"duplicate")], [(symlink, b"/etc/passwd")], [(special, b"")],
                 [("parent", b"file"), ("parent/child", b"child")],
                 [(subject.DELIVERY + "/" + subject.EOS_ASSET, b"unexpected")]]
        for index, additions in enumerate(cases):
            archive, target = self.directory / f"bad{index}.zip", self.directory / f"bad{index}"
            with self.subTest(index=index):
                write_zip(archive, additions)
                self.rejected(lambda: subject.extract_kit(archive, target), "BOOTSTRAP_")
                self.assertFalse(target.exists())

    def test_node_extracts_only_fixed_regular_arm64_elf_member(self):
        archive, target = self.directory / "node.tar.xz", self.directory / "node.bin"
        expected = write_node_tar(archive)
        subject.extract_node(archive, target)
        self.assertEqual(target.read_bytes(), expected)
        self.assertEqual(sorted(path.name for path in self.directory.iterdir()), ["node.bin", "node.tar.xz"])
        for index, kwargs in enumerate(({"machine": 62}, {"kind": tarfile.SYMTYPE}, {"duplicate": True})):
            archive = self.directory / f"wrong{index}.tar.xz"
            write_node_tar(archive, **kwargs)
            self.rejected(lambda: subject.extract_node(archive, self.directory / f"wrong{index}"), "NODE_")

    def test_zip_rejects_nul_names_before_python_truncation_can_hide_suffix(self):
        archive, target = self.directory / "nul.zip", self.directory / "nul-kit"
        write_zip(archive, [("tools/evilXjunk", b"x")])
        archive.write_bytes(archive.read_bytes().replace(b"tools/evilXjunk", b"tools/evil\0junk"))
        self.rejected(lambda: subject.extract_kit(archive, target), "ZIP_ENTRY")
        self.assertFalse(target.exists())

    def test_existing_eos_data_aborts_before_commands_and_preserves_bytes(self):
        existing = self.directory / "existing"
        existing.write_bytes(b"preserve existing installation")
        with mock.patch.object(subject, "EOS_PATHS", (str(existing),)), mock.patch.object(subject, "run") as run:
            self.rejected(subject.check_existing_installation, "EXISTING_EOS")
            run.assert_not_called()
        self.assertEqual(existing.read_bytes(), b"preserve existing installation")

    def test_existing_cluster_data_is_never_deleted_or_adopted(self):
        data = self.directory / "postgresql"
        data.mkdir()
        preserved = data / "data"
        preserved.write_bytes(b"existing database")
        with mock.patch.object(subject, "CLUSTER_PATHS", (data,)), mock.patch.object(subject, "run") as run:
            self.rejected(subject.check_clusters, "EXISTING_CLUSTER_DATA")
            run.assert_not_called()
        self.assertEqual(preserved.read_bytes(), b"existing database")

    def test_unit_table_requires_successful_recognized_full_output(self):
        subject.check_units("ssh.service enabled enabled\nsystemd-journald.service static -\n")
        for text in ("", "0 unit files listed.\n", "broken", "ssh.service unknown enabled\n",
                     "nexowatt-eos-old.service disabled disabled\n", "iobroker@.service masked -\n"):
            self.rejected(lambda: subject.check_units(text), "BOOTSTRAP_")

    def test_official_sources_only_no_trust_bypass_or_custom_repositories(self):
        deb822 = ("Types: deb\nURIs: http://deb.debian.org/debian\nSuites: trixie trixie-updates\n"
                  "Components: main non-free-firmware\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n")
        self.assertEqual(subject.validate_apt_sources(deb822, deb822=True), 1)
        self.assertEqual(subject.validate_apt_sources("deb http://archive.raspberrypi.com/debian/ trixie main\n", deb822=False), 1)
        for text, mode in ((deb822 + "Trusted: yes\n", True),
                           (deb822.replace("deb.debian.org", "untrusted.example"), True),
                           (deb822.replace("trixie trixie-updates", "stable"), True),
                           ("deb [trusted=yes] http://deb.debian.org/debian trixie main", False),
                           ("deb https://deb.nodesource.com/node_24.x nodistro main", False)):
            self.rejected(lambda: subject.validate_apt_sources(text, deb822=mode), "BOOTSTRAP_APT_")

    def test_official_debian_deb822_pgp_sources_accept_both_release_stanzas(self):
        self.assertEqual(subject.validate_apt_sources(DEBIAN_PGP_SOURCES, deb822=True), 2)

    def test_official_raspberry_pi_deb822_pgp_source_is_accepted(self):
        self.assertEqual(subject.validate_apt_sources(RASPBERRY_PI_PGP_SOURCE, deb822=True), 1)

    def test_legacy_pgp_signed_by_with_arm64_remains_bounded(self):
        for name, uri in (("debian", "http://deb.debian.org/debian"),
                          ("raspberrypi", "http://archive.raspberrypi.com/debian/")):
            with self.subTest(repository=name):
                text = ("deb [arch=arm64 signed-by=/usr/share/keyrings/" + name
                        + "-archive-keyring.pgp] " + uri + " trixie main\n")
                self.assertEqual(subject.validate_apt_sources(text, deb822=False), 1)

    def test_pgp_keyring_cannot_escape_the_existing_protected_directory(self):
        for value in ("/tmp/vendor.pgp", "/etc/apt/keyrings/vendor.pgp", "/root/vendor.pgp",
                      "/usr/share/keyrings/../vendor.pgp", "/usr/share/keyrings/sub/vendor.pgp",
                      "/usr/share/keyrings/vendor.pgp/", "/usr/share/keyrings/vendor.pgp.backup",
                      "/usr/share/keyrings/vendor.pgp,other.pgp"):
            for mode in (True, False):
                with self.subTest(path=value, deb822=mode):
                    text = (RASPBERRY_PI_PGP_SOURCE.replace("/usr/share/keyrings/raspberrypi-archive-keyring.pgp", value)
                            if mode else "deb [signed-by=" + value + "] http://archive.raspberrypi.com/debian trixie main")
                    self.rejected(lambda: subject.validate_apt_sources(text, deb822=mode),
                                  "BOOTSTRAP_APT_SOURCE_OPTIONS")

    def test_older_gpg_and_asc_source_forms_are_preserved(self):
        for extension in ("gpg", "asc"):
            with self.subTest(extension=extension):
                self.assertEqual(subject.validate_apt_sources(
                    DEBIAN_PGP_SOURCES.replace(".pgp", "." + extension), deb822=True), 2)
                text = ("deb [signed-by=/usr/share/keyrings/debian-archive-keyring." + extension
                        + "] http://deb.debian.org/debian trixie main")
                self.assertEqual(subject.validate_apt_sources(text, deb822=False), 1)

    def test_pgp_support_preserves_signature_and_validity_bypass_rejections(self):
        for field in ("Trusted: yes", "Allow-Insecure: yes", "Check-Valid-Until: no",
                      "Allow-Weak: yes", "Allow-Downgrade-To-Insecure: yes"):
            with self.subTest(field=field):
                self.rejected(lambda: subject.validate_apt_sources(
                    RASPBERRY_PI_PGP_SOURCE + field + "\n", deb822=True),
                    "BOOTSTRAP_APT_SOURCE_OPTIONS_FIELDS")
        for option in ("trusted=yes", "allow-insecure=yes", "check-valid-until=no", "allow-weak=yes"):
            with self.subTest(option=option):
                text = ("deb [signed-by=/usr/share/keyrings/raspberrypi-archive-keyring.pgp "
                        + option + "] http://archive.raspberrypi.com/debian trixie main")
                self.rejected(lambda: subject.validate_apt_sources(text, deb822=False),
                              "BOOTSTRAP_APT_SOURCE_OPTIONS$")

    def test_deb822_option_diagnostics_use_only_fixed_reason_codes(self):
        cases = (
            (RASPBERRY_PI_PGP_SOURCE + "X-Secret-Value: do-not-print\n", "FIELDS"),
            (RASPBERRY_PI_PGP_SOURCE + "Enabled: do-not-print\n", "ENABLED"),
            (RASPBERRY_PI_PGP_SOURCE + "Architectures: arm64 armhf\n", "ARCHITECTURES"),
            (RASPBERRY_PI_PGP_SOURCE.replace("/usr/share/keyrings/raspberrypi-archive-keyring.pgp",
                                             "https://user:do-not-print@example.com/key.pgp"), "SIGNED_BY"),
            (RASPBERRY_PI_PGP_SOURCE.replace("Components: main", "Components: do-not-print"), "COMPONENTS"),
        )
        for text, reason in cases:
            with self.subTest(reason=reason):
                with self.assertRaises(subject.Rejected) as caught:
                    subject.validate_apt_sources(text, deb822=True)
                self.assertEqual(str(caught.exception), "BOOTSTRAP_APT_SOURCE_OPTIONS_" + reason)
                self.assertNotIn("do-not-print", str(caught.exception))

    def test_pgp_sources_still_require_fixed_official_origins_suites_and_architecture(self):
        for text in (RASPBERRY_PI_PGP_SOURCE.replace("archive.raspberrypi.com", "untrusted.example"),
                     RASPBERRY_PI_PGP_SOURCE.replace("archive.raspberrypi.com", "user:secret@archive.raspberrypi.com"),
                     RASPBERRY_PI_PGP_SOURCE.replace("Suites: trixie", "Suites: stable"),
                     RASPBERRY_PI_PGP_SOURCE.replace("Components: main", "Components: custom"),
                     RASPBERRY_PI_PGP_SOURCE + "Architectures: armhf\n",
                     RASPBERRY_PI_PGP_SOURCE + "Architectures: arm64 armhf\n"):
            with self.subTest(text=text):
                self.rejected(lambda: subject.validate_apt_sources(text, deb822=True), "BOOTSTRAP_APT_")
        text = ("deb [arch=arm64,armhf signed-by=/usr/share/keyrings/raspberrypi-archive-keyring.pgp] "
                "http://archive.raspberrypi.com/debian trixie main")
        self.rejected(lambda: subject.validate_apt_sources(text, deb822=False), "BOOTSTRAP_APT_SOURCE_OPTIONS$")

    def test_stock_createcluster_preserved_and_only_effective_setting_disabled(self):
        before = ("# default\ncreate_main_cluster = true\nssl = on\ncluster_name = '%v/%c'\n"
                  "add_include_dir = 'conf.d'\ninclude_dir '/etc/postgresql-common/createcluster.d'\n")
        after = subject.cluster_config(before, stock_include_empty=True)
        self.assertIn("# EOS preserved previous setting: create_main_cluster = true", after)
        self.assertTrue(after.endswith("create_main_cluster = false\n"))
        self.assertIn("ssl = on", after)
        for text, empty in ((before, False), ("include '/etc/other.conf'", True),
                            ("include_dir = '/other'", True), ("create_main_cluster = true\ncreate_main_cluster = false", True),
                            ("unknown shell syntax", True), ("create_main_cluster = 'true'", True)):
            self.rejected(lambda: subject.cluster_config(text, stock_include_empty=empty), "BOOTSTRAP_CLUSTER_")

    def test_apt_transactions_are_explicit_and_server_follows_cluster_suppression(self):
        events = []
        def command(arguments, **unused):
            events.append(arguments)
            return subprocess.CompletedProcess(arguments, 0)
        with mock.patch.object(subject, "check_existing_installation"), mock.patch.object(subject, "check_apt_sources"), \
                mock.patch.object(subject, "check_clusters"), mock.patch.object(subject, "run", side_effect=command), \
                mock.patch.object(subject, "disable_distribution_cluster", side_effect=lambda unused: events.append("disabled")):
            subject.prepare_packages(self.directory)
        self.assertEqual(events[0][-1], "update")
        self.assertIn("postgresql-common", events[1])
        self.assertNotIn("postgresql-17", events[1])
        self.assertEqual(events[2], "disabled")
        self.assertEqual(events[3][-2:], ["postgresql-17", "postgresql-client-17"])
        for command in (events[0], events[1], events[3]):
            self.assertEqual(command[0], "/usr/bin/apt-get")
            self.assertNotIn("upgrade", command)
            self.assertNotIn("--allow-unauthenticated", command)
            self.assertIn("APT::Get::AllowUnauthenticated=false", command)

    def test_ssh_environment_preserves_only_valid_connection_and_no_caller_overrides(self):
        self.assertEqual(subject.ssh_environment("192.168.1.5 50000 192.168.1.10 22")["SSH_CONNECTION"],
                         "192.168.1.5 50000 192.168.1.10 22")
        for value in ("127.0.0.1 0 127.0.0.1 22", "x 22 y 22", "1.2.3.4 123 4.3.2.1 22 extra"):
            self.assertNotIn("SSH_CONNECTION", subject.ssh_environment(value))
        self.assertNotIn("NODE_OPTIONS", subject.ssh_environment(""))
        self.assertNotIn("APT_CONFIG", subject.ssh_environment(""))


if __name__ == "__main__":
    unittest.main(verbosity=2)
