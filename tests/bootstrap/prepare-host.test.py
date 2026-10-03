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


class HostPreparation(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="eos-bootstrap-test-")
        self.directory = Path(self.temporary.name)
        self.addCleanup(self.temporary.cleanup)

    def rejected(self, callback, code):
        with self.assertRaisesRegex(subject.Rejected, code):
            callback()

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
