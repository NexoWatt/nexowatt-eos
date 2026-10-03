"""Filesystem/guard tests; POSIX metadata is modelled on Windows explicitly.

These tests do not run usermod/groupmod, sudo, systemd or a Pi installation.
The real published r2 signature is separately verified with local OpenSSL when
available. Native UID/GID, crash durability and ARM64 hardware acceptance OPEN.
"""
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import tarfile
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("recovery", ROOT / "tools/bootstrap/recover-sudo-abort.py")
r = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(r)


def fixture_manifest():
    return {"schemaVersion": 1, "product": "nexowatt-eos", "releaseVersion": "0.2.0-test.3",
            "sequence": 5, "profile": "test", "nodeVersion": "24.21.0", "platforms": ["linux-arm64"],
            "files": [{"path": "app/example.txt", "size": 7, "sha256": r.digest(b"example"), "mode": 0o644},
                      {"path": "run.sh", "size": 9, "sha256": r.digest(b"#!/bin/sh"), "mode": 0o755}]}


def accounts(account=r.ACCOUNT, group=r.ACCOUNT):
    return ("root:x:0:0:root:/root:/bin/bash\n" + f"{account}:x:999:985::/nonexistent:/usr/sbin/nologin\n",
            "root:x:0:\n" + f"{group}:x:985:\n", "root:!:1:0:99999:7:::\n" + f"{account}:!:1::::::\n")


class PosixFixture(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.modes, self.overrides = {}, {}
        original = Path.lstat

        def synthetic_lstat(path):
            info = original(path)
            mode = self.modes.get(str(path), 0o755 if stat.S_ISDIR(info.st_mode) else 0o644)
            value = types.SimpleNamespace(st_mode=stat.S_IFMT(info.st_mode) | mode, st_uid=0, st_gid=0,
                                          st_nlink=info.st_nlink, st_size=info.st_size,
                                          st_dev=info.st_dev, st_ino=info.st_ino)
            for key, item in self.overrides.get(str(path), {}).items():
                setattr(value, key, item)
            return value

        self.metadata_patch = patch.object(Path, "lstat", synthetic_lstat)
        self.metadata_patch.start()
        self.addCleanup(self.metadata_patch.stop)
        self.addCleanup(self.directory.cleanup)

    def payload(self):
        (self.root / "app").mkdir()
        (self.root / "app/example.txt").write_bytes(b"example")
        (self.root / "run.sh").write_bytes(b"#!/bin/sh")
        self.modes[str(self.root / "run.sh")] = 0o755
        return fixture_manifest()


class PayloadTests(PosixFixture):
    def test_exact_real_tree_contents_pass(self):
        self.assertEqual(r.verify_payload(self.root, self.payload()), 2)

    def test_changed_file_rejected(self):
        manifest = self.payload()
        (self.root / "app/example.txt").write_bytes(b"tampered")
        with self.assertRaises(r.Rejected):
            r.verify_payload(self.root, manifest)

    def test_missing_file_rejected(self):
        manifest = self.payload()
        (self.root / "app/example.txt").unlink()
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_TREE_MISSING"):
            r.verify_payload(self.root, manifest)

    def test_extra_file_rejected(self):
        manifest = self.payload()
        (self.root / "data.db").write_bytes(b"real-data")
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_TREE_EXTRA_FILE"):
            r.verify_payload(self.root, manifest)

    def test_extra_empty_directory_rejected(self):
        manifest = self.payload()
        (self.root / "unlisted").mkdir()
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_TREE_EXTRA_DIRECTORY"):
            r.verify_payload(self.root, manifest)

    def test_mode_owner_group_link_and_filesystem_changes_rejected(self):
        manifest = self.payload()
        file = self.root / "app/example.txt"
        for change in ({"st_uid": 999}, {"st_gid": 985}, {"st_nlink": 2},
                       {"st_mode": stat.S_IFREG | 0o666}, {"st_mode": stat.S_IFLNK | 0o777},
                       {"st_dev": 987654321}):
            with self.subTest(change=change):
                self.overrides[str(file)] = change
                with self.assertRaises(r.Rejected):
                    r.verify_payload(self.root, manifest)
        self.overrides.clear()

    def test_directory_metadata_rejected(self):
        manifest = self.payload()
        self.modes[str(self.root / "app")] = 0o777
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_TREE_METADATA"):
            r.verify_payload(self.root, manifest)

    def test_manifest_paths_and_duplicate_entries_rejected(self):
        manifest = self.payload()
        for name in ("/etc/shadow", "../escape", "app/../escape", "app//file", "app\\escape", "C:escape", "app/./file"):
            with self.subTest(name=name):
                bad = copy.deepcopy(manifest)
                bad["files"][0]["path"] = name
                with self.assertRaisesRegex(r.Rejected, "RECOVERY_MANIFEST_ENTRY"):
                    r.verify_payload(self.root, bad)
        manifest["files"].append(manifest["files"][0])
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_MANIFEST_ENTRY"):
            r.verify_payload(self.root, manifest)

    def test_manifest_profile_and_entry_types_rejected(self):
        manifest = self.payload()
        for key, value in (("sequence", 6), ("nodeVersion", "22.0.0"), ("profile", "production"),
                           ("platforms", ["linux-x64"])):
            bad = {**manifest, key: value}
            with self.subTest(key=key), self.assertRaisesRegex(r.Rejected, "RECOVERY_MANIFEST_PROFILE"):
                r.verify_payload(self.root, bad)
        for key, value in (("mode", 0o777), ("size", True), ("sha256", "bad")):
            bad = copy.deepcopy(manifest)
            bad["files"][0][key] = value
            with self.subTest(key=key), self.assertRaisesRegex(r.Rejected, "RECOVERY_MANIFEST_ENTRY"):
                r.verify_payload(self.root, bad)

    def test_exact_stage_layout_rejects_current_pointer(self):
        for name in ("releases", "verified"):
            (self.root / name).mkdir()
        (self.root / "current").write_bytes(b"unexpected")
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_TREE_LAYOUT"):
            r.verify_stage(self.root)

    def test_unpinned_manifest_rejected_before_openssl_or_payload(self):
        for name in ("releases", "verified"):
            (self.root / name / r.RELEASE).mkdir(parents=True)
        evidence = self.root / "verified" / r.RELEASE
        for name in ("manifest.json", "manifest.sig", "release-public.pem", "native-acceptance.json"):
            (evidence / name).write_bytes(b"{}")
        with patch.object(r, "command") as command, self.assertRaisesRegex(r.Rejected, "RECOVERY_R2_PIN"):
            r.verify_stage(self.root)
        command.assert_not_called()


class GuardTests(unittest.TestCase):
    def test_supported_debian_and_raspberry_pi_os_13_only(self):
        for text in ('ID=debian\nVERSION_ID="13"\n', 'ID=raspbian\nVERSION_ID=13\n',
                     'ID="raspbian"\nVERSION_ID="13"\n'):
            with self.subTest(text=text):
                r.validate_os_release(text)
        for text in ('ID=ubuntu\nVERSION_ID="13"\n', 'ID=debian\nVERSION_ID="12"\n',
                     'ID=debian\nID=raspbian\nVERSION_ID=13\n', 'ID=debian\n'):
            with self.subTest(text=text), self.assertRaisesRegex(r.Rejected, "RECOVERY_DEBIAN_13_REQUIRED"):
                r.validate_os_release(text)

    def test_exact_accounts_pass_in_all_rename_phases(self):
        for account, group in ((r.ACCOUNT, r.ACCOUNT), (r.ACCOUNT, r.PRESERVED_ACCOUNT),
                               (r.PRESERVED_ACCOUNT, r.PRESERVED_ACCOUNT)):
            with self.subTest(account=account, group=group):
                r.validate_accounts(*accounts(account, group), account=account, group=group)

    def test_unlocked_shadow_and_uid_alias_rejected_without_secret_output(self):
        passwd, group, shadow = accounts()
        for values in ((passwd, group, shadow.replace("eos-runtime:!:", "eos-runtime:secret-test-hash:")),
                       (passwd + "alias:x:999:999::/nonexistent:/usr/sbin/nologin\n", group, shadow),
                       (passwd + "alias:x:1001:985::/nonexistent:/usr/sbin/nologin\n", group, shadow)):
            with self.subTest(case=values[0][-40:]), self.assertRaises(r.Rejected) as caught:
                r.validate_accounts(*values)
            self.assertNotIn("secret-test-hash", str(caught.exception))

    def test_extra_account_group_or_supplementary_membership_rejected(self):
        passwd, group, shadow = accounts()
        for values in ((passwd + "eos-setup:x:998:984::/nonexistent:/usr/sbin/nologin\n", group, shadow),
                       (passwd, group + "sudo:x:27:eos-runtime\n", shadow),
                       (passwd, group + "eos-setup:x:984:\n", shadow),
                       (passwd, group + "alias:x:985:\n", shadow)):
            with self.subTest(case=values[1]), self.assertRaises(r.Rejected):
                r.validate_accounts(*values)

    def test_changed_login_shell_home_and_ids_rejected(self):
        passwd, group, shadow = accounts()
        for replacement in ((":999:985:", ":998:985:"), ("/nonexistent", "/home/eos"),
                            ("/usr/sbin/nologin", "/bin/bash")):
            with self.subTest(replacement=replacement), self.assertRaises(r.Rejected):
                r.validate_accounts(passwd.replace(*replacement), group, shadow)

    def test_process_real_effective_saved_and_supplementary_ids_rejected(self):
        clean = "Name:\ttest\nUid:\t0\t0\t0\t0\nGid:\t0\t0\t0\t0\nGroups:\t0\n"
        r.validate_process_status(clean)
        for field in ("Uid", "Gid", "Groups"):
            bad = clean.replace(field + ":\t0", field + ":\t" + str(r.UID if field == "Uid" else r.GID))
            with self.subTest(field=field), self.assertRaisesRegex(r.Rejected, "RECOVERY_ACCOUNT_PROCESS"):
                r.validate_process_status(bad)

    def test_unreadable_or_incomplete_process_table_rejected(self):
        for text in ("", "Uid:\t0 0 0 0\nGid:\t0 0 0 0\n", "Uid:\tx\nGid:\t0\nGroups:\t0\n"):
            with self.subTest(text=text), self.assertRaises(r.Rejected):
                r.validate_process_status(text)

    def test_mounts_below_stage_and_stage_itself_rejected(self):
        template = "21 1 8:1 / {} rw - ext4 /dev/root rw\n"
        r.check_mounts(template.format("/"))
        stage = PurePosixPath("/opt/nexowatt/eos")
        for path in (str(stage), str(stage / "releases")):
            with self.subTest(path=path), self.assertRaisesRegex(r.Rejected, "RECOVERY_STAGING_MOUNT"):
                r.check_mounts(template.format(path), stage)
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_MOUNT_TABLE"):
            r.check_mounts("")

    def test_unit_table_requires_complete_successful_rows_and_no_eos(self):
        r.check_units("ssh.service enabled enabled\npostgresql.service enabled enabled\n")
        for text in ("", "0 unit files listed.\n", "ssh.service enabled\n", "iobroker.service disabled enabled\n",
                     "nexowatt-eos-setup.target disabled disabled\n"):
            with self.subTest(text=text), self.assertRaises(r.Rejected):
                r.check_units(text)

    def test_native_evidence_is_preserved_as_non_hardware_test(self):
        value = {"schemaVersion": 1, "kind": "eos-serialport-native-target-probe", "passed": True,
                 "platform": "linux-arm64", "node": "24.21.0", "deviceIoPerformed": False,
                 "hardwareAccepted": False, "bindings": [{"targetProbePassed": True}] * 2}
        raw = json.dumps(value).encode()
        self.assertEqual(r.validate_native(raw), r.digest(raw))
        for key in ("deviceIoPerformed", "hardwareAccepted"):
            with self.subTest(key=key), self.assertRaisesRegex(r.Rejected, "RECOVERY_NATIVE_EVIDENCE"):
                r.validate_native(json.dumps({**value, key: True}).encode())

    def test_duplicate_json_keys_rejected(self):
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_JSON_DUPLICATE"):
            r.parse_json(b'{"x":1,"x":2}')

    def test_check_is_default_and_never_mutates(self):
        with patch.object(r, "preflight", return_value={}) as check, patch.object(r, "recover") as mutation, patch("sys.stdout", io.StringIO()):
            r.main([])
            r.main(["--check"])
        self.assertEqual(check.call_count, 2)
        mutation.assert_not_called()

    def test_recover_requires_exact_flag_and_passed_checks(self):
        with patch.object(r, "preflight", side_effect=r.Rejected("denied")), patch.object(r, "recover") as mutation:
            with self.assertRaises(r.Rejected):
                r.main(["--recover"])
        mutation.assert_not_called()
        for argv in (["--root", "/tmp"], ["--force"], ["--recover", "--check"], ["--uid", "0"]):
            with self.subTest(argv=argv), patch.object(r, "preflight") as check, self.assertRaisesRegex(r.Rejected, "RECOVERY_USAGE"):
                r.main(argv)
            check.assert_not_called()

    def test_failed_commands_and_stderr_are_not_accepted(self):
        for result in (subprocess.CompletedProcess([], 1, b"", b""),
                       subprocess.CompletedProcess([], 0, b"okay", b"warning")):
            with self.subTest(result=result), patch.object(r, "trusted_path"), patch.object(r.subprocess, "run", return_value=result):
                with self.assertRaisesRegex(r.Rejected, "RECOVERY_COMMAND_REJECTED"):
                    r.command(["/usr/bin/getent", "passwd"])


class MutationTests(PosixFixture):
    def setUp(self):
        super().setUp()
        self.stage = self.root / "eos"
        self.stage.mkdir()
        (self.stage / "preserved-evidence").write_bytes(b"never-delete")
        info = self.stage.lstat()
        self.report = {"filesVerified": 2, "stageDevice": info.st_dev, "stageInode": info.st_ino}
        self.operations = []
        self.host_account, self.host_group = r.ACCOUNT, r.ACCOUNT
        self.failure = None
        self.real_mkdtemp = tempfile.mkdtemp

        def make_directory(*args, **kwargs):
            path = self.real_mkdtemp(*args, **kwargs)
            self.modes[path] = 0o700
            return path

        def command(argv):
            self.operations.append(argv)
            if self.failure == argv[0]:
                r.fail("RECOVERY_COMMAND_REJECTED")
            if argv[0] == "/usr/sbin/groupmod":
                self.host_group = r.PRESERVED_ACCOUNT
            elif argv[0] == "/usr/sbin/usermod":
                self.host_account = r.PRESERVED_ACCOUNT
            else:
                self.fail("unexpected mutation tool")
            return ""

        def check_accounts(*, account=r.ACCOUNT, group=r.ACCOUNT):
            self.assertEqual(account, self.host_account)
            self.assertEqual(group, self.host_group)
            r.validate_accounts(*accounts(account, group), account=account, group=group)

        for item in (patch.object(r, "PARENT", self.root), patch.object(r, "STAGE", self.stage),
                     patch.object(r.tempfile, "mkdtemp", side_effect=make_directory),
                     patch.object(r, "command", side_effect=command), patch.object(r, "check_accounts", side_effect=check_accounts),
                     patch.object(r, "check_processes"), patch.object(r, "check_current_mounts"), patch.object(r, "fsync_directory"),
                     patch("sys.stdout", io.StringIO())):
            item.start()
            self.addCleanup(item.stop)

    def journal(self):
        quarantines = list(self.root.glob(r.QUARANTINE_PREFIX + "*"))
        self.assertEqual(len(quarantines), 1)
        self.assertEqual((quarantines[0] / "eos/preserved-evidence").read_bytes(), b"never-delete")
        return json.loads((quarantines[0] / "journal.json").read_text())

    def test_success_preserves_files_uid_gid_and_renames_user_last(self):
        quarantine = r.recover(self.report)
        self.assertFalse(self.stage.exists())
        self.assertEqual([entry[0] for entry in self.operations], ["/usr/sbin/groupmod", "/usr/sbin/usermod"])
        self.assertEqual(self.journal()["completed"], "recovery-complete")
        self.assertEqual(self.journal()["uid"], 999)
        self.assertEqual(self.journal()["gid"], 985)
        self.assertFalse(self.journal()["automaticResumeAllowed"])
        self.assertEqual(self.modes[str(quarantine)], 0o700)

    def test_group_failure_leaves_original_account_and_staging_evidence(self):
        self.failure = "/usr/sbin/groupmod"
        with self.assertRaises(r.Rejected):
            r.recover(self.report)
        self.assertEqual(self.host_account, r.ACCOUNT)
        self.assertEqual(self.host_group, r.ACCOUNT)
        self.assertEqual(self.journal()["completed"], "staging-preserved")
        self.assertEqual(self.journal()["nextAction"], "rename-group")

    def test_user_failure_keeps_original_account_and_exact_pending_step(self):
        self.failure = "/usr/sbin/usermod"
        with self.assertRaises(r.Rejected):
            r.recover(self.report)
        self.assertEqual(self.host_account, r.ACCOUNT)
        self.assertEqual(self.host_group, r.PRESERVED_ACCOUNT)
        self.assertEqual(self.journal()["completed"], "group-preserved")
        self.assertEqual(self.journal()["nextAction"], "rename-account")

    def test_journal_failure_prevents_following_account_mutations(self):
        original = r.write_journal

        def write(*args, **kwargs):
            if kwargs["completed"] == "staging-preserved":
                raise OSError("modelled storage failure")
            return original(*args, **kwargs)

        with patch.object(r, "write_journal", side_effect=write), self.assertRaises(OSError):
            r.recover(self.report)
        self.assertEqual(self.operations, [])
        # Intent was durable before the rename. A crash can leave completion
        # uncertain; the helper never interprets this as permission to retry.
        self.assertEqual(self.journal()["completed"], "checks-passed")
        self.assertEqual(self.journal()["nextAction"], "rename-staging")

    def test_process_detected_before_rename_preserves_original_tree(self):
        with patch.object(r, "check_processes", side_effect=r.Rejected("RECOVERY_ACCOUNT_PROCESS")), self.assertRaises(r.Rejected):
            r.recover(self.report)
        self.assertEqual((self.stage / "preserved-evidence").read_bytes(), b"never-delete")
        self.assertEqual(self.operations, [])

    def test_stage_identity_change_stops_before_rename(self):
        wrong = {**self.report, "stageInode": self.report["stageInode"] + 1}
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_STAGING_CHANGED"):
            r.recover(wrong)
        self.assertTrue(self.stage.exists())
        self.assertEqual(self.operations, [])

    def test_new_mount_stops_before_rename(self):
        with patch.object(r, "check_current_mounts", side_effect=r.Rejected("RECOVERY_STAGING_MOUNT")):
            with self.assertRaisesRegex(r.Rejected, "RECOVERY_STAGING_MOUNT"):
                r.recover(self.report)
        self.assertTrue(self.stage.exists())
        self.assertEqual(self.operations, [])


class ArchivedPinTests(unittest.TestCase):
    def test_pins_match_actual_archived_r2_manifest_signature_and_public_key(self):
        delivery = ROOT / "delivery/test-pi-0.2.0-test.3-r2"
        with tarfile.open(delivery / "eos-0.2.0-test.3-linux-arm64.tar.gz") as archive:
            manifest = archive.extractfile("bundle/manifest.json").read()
            signature = archive.extractfile("bundle/manifest.sig").read()
        key = (delivery / "release-public.pem").read_bytes()
        self.assertEqual(hashlib.sha256(manifest).hexdigest(), r.RELEASE)
        self.assertEqual(hashlib.sha256(signature).hexdigest(), r.SIGNATURE_SHA256)
        self.assertEqual(hashlib.sha256(key).hexdigest(), r.PUBLIC_KEY_SHA256)
        self.assertEqual(len(json.loads(manifest)["files"]), 22202)
        openssl = shutil.which("openssl")
        if openssl is None and Path("C:/Program Files/Git/usr/bin/openssl.exe").is_file():
            openssl = "C:/Program Files/Git/usr/bin/openssl.exe"
        if openssl is None:
            self.skipTest("r2 hash pins checked; local detached OpenSSL signature verification OPEN")
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            (base / "manifest.json").write_bytes(manifest)
            (base / "manifest.sig").write_bytes(signature)
            (base / "public.pem").write_bytes(key)
            result = subprocess.run([openssl, "pkeyutl", "-verify", "-pubin", "-inkey", str(base / "public.pem"),
                                     "-rawin", "-in", str(base / "manifest.json"), "-sigfile", str(base / "manifest.sig")],
                                    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
            self.assertEqual(result.returncode, 0, result.stderr.decode(errors="replace"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
