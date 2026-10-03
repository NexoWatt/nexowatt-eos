"""Filesystem/guard tests; POSIX metadata is modelled on Windows explicitly.

These tests do not run usermod/groupmod, sudo, systemd or a Pi installation.
The real published r2 signature is separately verified with local OpenSSL when
available. Native UID/GID, crash durability and ARM64 hardware acceptance OPEN.
"""
import copy
from contextlib import ExitStack, nullcontext
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


def postgres_accounts(uid=102, gid=106):
    passwd, groups, _ = accounts()
    return (passwd + f"postgres:x:{uid}:{gid}:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash\n",
            groups + f"postgres:x:{gid}:\nssl-cert:x:105:postgres\n")


class ReachedClusterCheck(Exception):
    pass


def observed_preflight_until_cluster_check(recovery):
    """Model the reported Pi metadata, stopping before any recovery mutation.

    This same fixture can be run against the archived original helper to
    demonstrate RECOVERY_PATH_OWNER, then against the corrected source.
    No host accounts, systemd commands, mounts or real target files are used.
    """
    pg_paths = {"/etc/postgresql": 41, "/var/lib/postgresql": 42}
    directories = {"/", "/etc", "/var", "/var/lib", "/opt", "/opt/nexowatt", "/usr", "/usr/bin", "/usr/sbin"}
    account_text = postgres_accounts()

    def info(path, *args, **kwargs):
        name = str(path)
        pg = name in pg_paths
        return types.SimpleNamespace(st_mode=(stat.S_IFDIR if pg or name in directories else stat.S_IFREG) | 0o755,
                                     st_uid=102 if pg else 0, st_gid=106 if pg else 0,
                                     st_dev=1, st_ino=pg_paths.get(name, 1))

    def read(path, *args, **kwargs):
        return {"/etc/os-release": 'ID=debian\nVERSION_ID="13"\n',
                "/etc/passwd": account_text[0], "/etc/group": account_text[1]}[str(path)]

    def command(argv):
        if argv == ["/usr/bin/systemctl", "show", "--property=Version", "--property=SystemState"]:
            return "Version=257\nSystemState=running\n"
        if argv[:2] == ["/usr/bin/getent", "passwd"]:
            return account_text[0]
        if argv[:2] == ["/usr/bin/getent", "group"]:
            return account_text[1]
        if argv == ["/usr/bin/pg_lsclusters", "--no-header"]:
            raise ReachedClusterCheck("passed observed owner guard; no cluster or mutation command executed")
        raise AssertionError("unexpected command: " + repr(argv))

    with ExitStack() as stack:
        for item in (patch.object(recovery.os, "geteuid", return_value=0),
                     patch.object(recovery.platform, "system", return_value="Linux"),
                     patch.object(recovery.platform, "machine", return_value="aarch64"),
                     patch.object(Path, "lstat", info), patch.object(Path, "stat", info),
                     patch.object(Path, "read_text", read), patch.object(Path, "iterdir", return_value=iter(())),
                     patch.object(recovery.os.path, "lexists", side_effect=lambda path: str(path) in pg_paths),
                     patch.object(recovery, "command", side_effect=command),
                     patch.object(recovery.os, "open", side_effect=lambda path, flags: pg_paths[str(path)]),
                     patch.object(recovery.os, "fstat", side_effect=lambda fd: info(next(path for path, inode in pg_paths.items() if inode == fd))),
                     patch.object(recovery.os, "scandir", side_effect=lambda fd: nullcontext(iter(()))),
                     patch.object(recovery.os, "close")):
            stack.enter_context(item)
        recovery.preflight()


class PostgresIdentityTests(unittest.TestCase):
    def test_observed_and_different_package_ids_are_accepted(self):
        for uid, gid in ((102, 106), (110, 117)):
            with self.subTest(uid=uid, gid=gid):
                user, group = r.validate_postgres_identity(*postgres_accounts(uid, gid))
                self.assertEqual((int(user[2]), int(group[2])), (uid, gid))

    def test_root_and_eos_identity_collisions_are_rejected(self):
        for uid, gid in ((0, 106), (102, 0), (999, 106), (102, 985), (2**32 - 1, 106)):
            with self.subTest(uid=uid, gid=gid), self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_IDENTITY"):
                r.validate_postgres_identity(*postgres_accounts(uid, gid))

    def test_missing_alias_malformed_or_mismatched_identity_is_rejected(self):
        passwd, groups = postgres_accounts()
        variants = ((accounts()[0], groups), (passwd, accounts()[1]),
                    (passwd + "alias:x:102:107::/nonexistent:/usr/sbin/nologin\n", groups),
                    (passwd, groups + "alias:x:106:\n"),
                    (passwd.replace(":102:106:", ":102:107:"), groups),
                    (passwd.replace(":102:106:", ":bad:106:"), groups),
                    (passwd, groups.replace("postgres:x:106:", "postgres:x:bad:")))
        for values in variants:
            with self.subTest(values=values), self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_IDENTITY"):
                r.validate_postgres_identity(*values)

    def test_local_and_nss_identity_must_match(self):
        local = postgres_accounts()
        for resolved in (local, postgres_accounts(110, 117)):
            with patch.object(r, "trusted_path") as trust, patch.object(Path, "read_text", side_effect=local), \
                    patch.object(r, "command", side_effect=resolved) as command:
                if resolved == local:
                    self.assertEqual(r.postgres_identity(), (102, 106))
                else:
                    with self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_IDENTITY"):
                        r.postgres_identity()
                self.assertEqual([call.args[0] for call in trust.call_args_list], ["/etc/passwd", "/etc/group"])
                self.assertEqual([call.args[0] for call in command.call_args_list],
                                 [["/usr/bin/getent", "passwd"], ["/usr/bin/getent", "group"]])

    def test_exception_is_applied_only_to_existing_fixed_pg_paths(self):
        with patch.object(r.os.path, "lexists", return_value=True), \
                patch.object(r, "postgres_identity", return_value=(102, 106)), \
                patch.object(r, "check_empty_postgresql_directory") as check:
            r.check_postgresql_directories()
        self.assertEqual([call.args for call in check.call_args_list],
                         [(Path("/etc/postgresql"), (102, 106)), (Path("/var/lib/postgresql"), (102, 106))])
        with patch.object(r.os.path, "lexists", return_value=False), \
                patch.object(r, "postgres_identity") as identity:
            r.check_postgresql_directories()
        identity.assert_not_called()


class PostgresDirectoryTests(PosixFixture):
    """Real directory contents/FD operations with explicitly modelled POSIX IDs."""
    def setUp(self):
        super().setUp()
        self.pg = self.root / "postgresql"
        self.pg.mkdir()
        self.overrides[str(self.pg)] = {"st_uid": 102, "st_gid": 106}
        original_fstat = os.fstat

        def synthetic_fstat(fd):
            info = original_fstat(fd)
            leaf = self.pg.lstat()
            return leaf if (info.st_dev, info.st_ino) == (leaf.st_dev, leaf.st_ino) else info

        item = patch.object(r.os, "fstat", side_effect=synthetic_fstat)
        item.start()
        self.addCleanup(item.stop)

    def test_observed_empty_postgres_owned_directory_passes(self):
        r.check_empty_postgresql_directory(self.pg, (102, 106))
        self.assertEqual(list(self.pg.iterdir()), [])
        self.assertEqual((self.pg.lstat().st_uid, self.pg.lstat().st_gid), (102, 106))

    def test_preflight_observed_pg_ownership_reaches_cluster_check(self):
        with self.assertRaises(ReachedClusterCheck):
            observed_preflight_until_cluster_check(r)

    def test_root_owned_and_alternate_postgres_identity_pass(self):
        for uid, gid, mode in ((0, 0, 0o755), (110, 117, 0o750), (110, 117, 0o700)):
            with self.subTest(uid=uid, gid=gid, mode=mode):
                self.overrides[str(self.pg)] = {"st_uid": uid, "st_gid": gid}
                self.modes[str(self.pg)] = mode
                r.check_empty_postgresql_directory(self.pg, (110, 117))

    def test_unrelated_or_mixed_owners_and_special_or_writable_modes_fail(self):
        changes = ({"st_uid": 103}, {"st_gid": 107}, {"st_uid": 0}, {"st_gid": 0})
        for change in changes:
            with self.subTest(change=change), self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_DIRECTORY"):
                self.overrides[str(self.pg)] = {"st_uid": 102, "st_gid": 106, **change}
                r.check_empty_postgresql_directory(self.pg, (102, 106))
        self.overrides[str(self.pg)] = {"st_uid": 102, "st_gid": 106}
        for mode in (0o775, 0o757, 0o4755, 0o2755, 0o1755):
            with self.subTest(mode=oct(mode)), self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_DIRECTORY"):
                self.modes[str(self.pg)] = mode
                r.check_empty_postgresql_directory(self.pg, (102, 106))

    def test_nonempty_directory_and_hidden_file_fail_without_removal(self):
        for name in ("17", ".hidden"):
            child = self.pg / name
            child.write_bytes(b"preserve")
            with self.subTest(name=name), self.assertRaisesRegex(r.Rejected, "RECOVERY_EXISTING_CLUSTER_DATA"):
                r.check_empty_postgresql_directory(self.pg, (102, 106))
            self.assertEqual(child.read_bytes(), b"preserve")
            child.unlink()

    def test_symlink_and_regular_file_are_rejected(self):
        self.pg.rmdir()
        self.pg.symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_DIRECTORY"):
            r.check_empty_postgresql_directory(self.pg, (102, 106))
        self.pg.unlink()
        self.pg.write_bytes(b"preserve")
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_DIRECTORY"):
            r.check_empty_postgresql_directory(self.pg, (102, 106))
        self.assertEqual(self.pg.read_bytes(), b"preserve")

    def test_unsafe_parent_and_generic_postgres_tool_path_still_fail(self):
        with self.assertRaisesRegex(r.Rejected, "RECOVERY_PATH_OWNER"):
            r.trusted_path(self.pg)
        for change in ({"st_uid": 102}, {"st_mode": stat.S_IFDIR | 0o777}):
            self.overrides[str(self.root)] = change
            with self.subTest(change=change), self.assertRaisesRegex(r.Rejected, "RECOVERY_PATH_(OWNER|MODE)"):
                r.check_empty_postgresql_directory(self.pg, (102, 106))

    def test_opened_directory_change_is_rejected_and_fd_closed(self):
        before = self.pg.lstat()
        changed = types.SimpleNamespace(**vars(before))
        changed.st_ino += 1
        with patch.object(r.os, "fstat", return_value=changed), patch.object(r.os, "close", wraps=os.close) as close:
            with self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_DIRECTORY_CHANGED"):
                r.check_empty_postgresql_directory(self.pg, (102, 106))
        close.assert_called_once()

    def test_path_substitution_after_scan_is_rejected(self):
        before = self.pg.lstat()
        changed = types.SimpleNamespace(**vars(before))
        changed.st_ino += 1
        original = Path.lstat
        leaf_calls = 0

        def substitute(path):
            nonlocal leaf_calls
            if path == self.pg:
                leaf_calls += 1
                # First leaf read is lstat, second is the modelled FD metadata,
                # third is the final path check after scanning the open FD.
                return changed if leaf_calls >= 3 else before
            return original(path)

        with patch.object(Path, "lstat", substitute), patch.object(r.os, "close", wraps=os.close) as close:
            with self.assertRaisesRegex(r.Rejected, "RECOVERY_POSTGRES_DIRECTORY_CHANGED"):
                r.check_empty_postgresql_directory(self.pg, (102, 106))
        close.assert_called_once()


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
