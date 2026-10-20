"""Filesystem/command fixtures; never install services or modify host networking."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location("network_install", Path(__file__).resolve().parents[2] / "tools/system/install-network-host.py")
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)
RID = "a" * 64


class InstallationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.calls = []
        self.identities = set()
        self.failure = None
        for tool in installer.TOOLS:
            target = self.at(tool)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("fixture\n")
            target.chmod(0o755)
        source = self.at(f"/opt/nexowatt/eos/releases/{RID}")
        for name in installer.CODE:
            target = source / "runtime/network" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("# reviewed source fixture\n")
        for name in installer.UNITS:
            target = source / "system/network" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("[Unit]\nDescription=Fixture\n")
        (source / installer.DROPIN_SOURCE).write_text("[Unit]\nRequires=nexowatt-eos-network.service\nAfter=nexowatt-eos-network.service\n")
        self.at("/etc/systemd/system").mkdir(parents=True)
        self.at("/var/lib").mkdir(parents=True)
        self.at("/usr/lib").mkdir(parents=True)
        self.subject = installer.Installer(RID, root=self.root, run=self.execute, probe=lambda: None)

    def tearDown(self):
        self.tmp.cleanup()

    def at(self, name):
        return self.root / name.lstrip("/")

    def execute(self, args):
        self.calls.append(args)
        if self.failure and self.failure(args):
            return 1, ""
        if args[:2] == ["/usr/bin/getent", "group"] and args[2] == "eos-runtime":
            return 0, "eos-runtime:x:991:\n"
        if args[0] == "/usr/bin/getent":
            return (0, "fixture") if tuple(args[1:]) in self.identities else (2, "")
        if args[0] == "/usr/sbin/groupadd":
            self.identities.add(("group", "eos-network-dhcp"))
        if args[0] == "/usr/sbin/useradd":
            self.identities.add(("passwd", "eos-network-dhcp"))
        return 0, ""

    def test_check_is_read_only(self):
        result = self.subject.check()
        self.assertEqual(result, {"ok": True, "operation": "check", "releaseId": RID, "configured": False})
        self.assertFalse(self.at(installer.JOURNAL_DIR).exists())
        self.assertTrue(all(row[0] == "/usr/bin/getent" for row in self.calls))

    def test_install_unconfigured_and_rollback_restores_owned_files_only(self):
        self.subject.install()
        self.assertEqual(json.loads(self.at(installer.JOURNAL).read_text())["phase"], "active")
        enabled = [c for c in self.calls if c[:3] == ["/usr/bin/systemctl", "enable", "--now"]]
        self.assertEqual(enabled[0][3:], list(installer.ENABLED))
        self.assertFalse(any("nexowatt-eos-network-dhcp.service" in c for c in enabled))
        unrelated = self.at("/etc/systemd/system/customer.service")
        unrelated.write_text("untouched")
        result = self.subject.rollback()
        self.assertTrue(result["ok"])
        self.assertEqual(unrelated.read_text(), "untouched")
        self.assertFalse(self.at("/usr/lib/nexowatt-eos-network/server.py").exists())
        self.assertFalse(self.at(installer.DROPIN).exists())
        self.assertEqual(json.loads(self.at(installer.JOURNAL).read_text())["phase"], "rolled-back")
        count = len(self.calls)
        self.subject.rollback()
        self.assertEqual(len(self.calls), count)
        self.assertFalse(any(row[0] in ("/usr/sbin/ip", "/usr/sbin/nft", "/usr/sbin/dnsmasq") for row in self.calls))

    def test_partial_install_has_persistent_rollback(self):
        self.failure = lambda args: args[:3] == ["/usr/bin/systemctl", "enable", "--now"]
        with self.assertRaises(installer.InstallError):
            self.subject.install()
        self.assertEqual(json.loads(self.at(installer.JOURNAL).read_text())["phase"], "files")
        self.failure = None
        self.subject.rollback()
        self.assertFalse(self.at("/etc/systemd/system/nexowatt-eos-network.service").exists())

    def test_missing_tool_no_mutation(self):
        self.at("/usr/sbin/nft").unlink()
        with self.assertRaisesRegex(installer.InstallError, "TOOL_MISSING"):
            self.subject.install()
        self.assertFalse(self.at(installer.JOURNAL).exists())

    def test_unknown_existing_unit_not_overwritten(self):
        target = self.at("/etc/systemd/system/nexowatt-eos-network.service")
        target.write_text("customer-owned")
        with self.assertRaisesRegex(installer.InstallError, "UNIT_EXISTS"):
            self.subject.install()
        self.assertEqual(target.read_text(), "customer-owned")

    def test_writable_or_symlink_source_denied(self):
        target = self.at(f"/opt/nexowatt/eos/releases/{RID}/runtime/network/policy.py")
        target.chmod(0o666)
        with self.assertRaisesRegex(installer.InstallError, "UNTRUSTED_PATH"):
            self.subject.check()
        target.unlink()
        target.symlink_to(self.at("/usr/sbin/ip"))
        with self.assertRaisesRegex(installer.InstallError, "UNTRUSTED_PATH"):
            self.subject.check()

    def test_foreign_dedicated_account_refused(self):
        self.identities.add(("passwd", "eos-network-dhcp"))
        with self.assertRaisesRegex(installer.InstallError, "ACCOUNT_EXISTS"):
            self.subject.install()

    def test_configured_network_is_not_removed_by_release_rollback(self):
        self.subject.install()
        self.at("/etc/nexowatt-eos-network/config.json").write_text("{}")
        with self.assertRaisesRegex(installer.InstallError, "ROLLBACK_CONFIGURED"):
            self.subject.rollback()
        self.assertTrue(self.at("/usr/lib/nexowatt-eos-network/server.py").exists())

    def test_changed_installed_code_not_deleted(self):
        self.subject.install()
        self.at("/usr/lib/nexowatt-eos-network/server.py").write_text("different")
        with self.assertRaisesRegex(installer.InstallError, "ROLLBACK_CHANGED"):
            self.subject.rollback()

    def test_journal_cannot_point_outside_owned_files(self):
        self.subject.install()
        record = json.loads(self.at(installer.JOURNAL).read_text())
        record["files"]["/etc/passwd"] = "a" * 64
        self.at(installer.JOURNAL).write_text(json.dumps(record))
        with self.assertRaisesRegex(installer.InstallError, "JOURNAL"):
            self.subject.rollback()

    def test_unknown_cli_paths_or_bypass_flags_rejected(self):
        for args in (["--install", "../../etc"], ["--root", "/tmp", "--install", RID], ["--force", RID]):
            with self.assertRaises(installer.InstallError):
                installer.main(args)


if __name__ == "__main__":
    unittest.main()
