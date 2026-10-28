#!/usr/bin/python3
"""Retirement host boundaries: mocked /proc and private temporary lock files only."""
import contextlib
import fcntl
import importlib.util
import io
import multiprocessing
import os
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[2] / "tools/system/retire-r8-for-managed16.py"
SPEC = importlib.util.spec_from_file_location("r8_retirement_host", SOURCE)
helper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(helper)


def hold_posix_lock(path, ready, finish):
    with open(path, "r+b") as stream:
        fcntl.lockf(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        ready.set()
        finish.wait(5)


def process_stat(ticks=b"12345", command=b"node (worker)"):
    return b"123 (" + command + b") " + b" ".join([b"S"] + [b"0"] * 18 + [ticks]) + b"\n"


class HostBoundaries(unittest.TestCase):
    @contextlib.contextmanager
    def process(self, *, uid=997, old_node=True, cgroup=None, ticks=None, exe_error=None):
        node = types.SimpleNamespace(st_dev=8, st_ino=123)
        other = types.SimpleNamespace(st_dev=8, st_ino=456)
        stat_rows = iter(ticks or [b"12345", b"12345"])
        status = f"Name:\tPRIVATE_PROCESS_NAME\nUid:\t{uid}\t{uid}\t{uid}\t{uid}\n".encode()
        group = cgroup if cgroup is not None else b"0::/system.slice/nexowatt-eos-controller.service\n"

        def fake_open(path, mode):
            self.assertEqual(mode, "rb")
            values = {"status": status, "cgroup": group}
            content = process_stat(next(stat_rows)) if Path(path).name == "stat" else values[Path(path).name]
            return io.BytesIO(content)

        def fake_stat(path):
            if str(path) == helper.NODE:
                return node
            self.assertEqual(str(path), "/proc/123/exe")
            if exe_error is not None:
                raise exe_error
            return node if old_node else other

        with patch.object(helper.Path, "iterdir", return_value=iter([Path("/proc/123")])), \
                patch("builtins.open", side_effect=fake_open), patch.object(helper.os, "stat", side_effect=fake_stat):
            yield

    def test_eos_node_in_exact_service_is_permitted_before_stop(self):
        with self.process():
            helper.process_check(stopped=False)

    def test_eos_process_outside_fixed_service_is_rejected(self):
        with self.process(cgroup=b"0::/user.slice/PRIVATE_FOREIGN_SCOPE\n"):
            with self.assertRaisesRegex(helper.Rejected, "^EOS_PROCESS_OUTSIDE_UNIT$"):
                helper.process_check(stopped=False)

    def test_foreign_user_cannot_keep_old_node_running(self):
        with self.process(uid=1000):
            with self.assertRaisesRegex(helper.Rejected, "^NODE_IN_USE$"):
                helper.process_check(stopped=False)

    def test_root_cannot_keep_old_node_running(self):
        with self.process(uid=0):
            with self.assertRaisesRegex(helper.Rejected, "^NODE_IN_USE$"):
                helper.process_check(stopped=True)

    def test_after_stop_any_eos_process_is_rejected(self):
        with self.process(old_node=False):
            with self.assertRaisesRegex(helper.Rejected, "^EOS_PROCESS_BUSY$"):
                helper.process_check(stopped=True)

    def test_unrelated_binary_and_account_are_preserved(self):
        with self.process(uid=1000, old_node=False):
            helper.process_check(stopped=True)

    def test_pid_reuse_during_scan_is_rejected(self):
        with self.process(ticks=[b"12345", b"99999"]):
            with self.assertRaisesRegex(helper.Rejected, "^PROCESS_CHANGED$"):
                helper.process_check(stopped=False)

    def test_exited_process_without_executable_is_tolerated(self):
        with self.process(uid=1000, exe_error=FileNotFoundError()):
            helper.process_check(stopped=True)

    def test_unreadable_executable_fails_closed(self):
        with self.process(uid=1000, exe_error=PermissionError("PRIVATE_PATH")):
            with self.assertRaises(PermissionError):
                helper.process_check(stopped=True)

    def test_process_stat_handles_parentheses_in_comm(self):
        with patch("builtins.open", return_value=io.BytesIO(process_stat(command=b"odd ) ( name"))):
            self.assertEqual(helper.process_identity(Path("/proc/123")), b"12345")

    def test_process_stat_requires_matching_pid(self):
        with patch("builtins.open", return_value=io.BytesIO(process_stat())):
            with self.assertRaisesRegex(helper.Rejected, "^PROCESS_STAT$"):
                helper.process_identity(Path("/proc/124"))

    def mount(self, target, paths=("/var/lib/nexowatt-eos",)):
        content = f"20 1 8:1 / {target} rw - ext4 /dev/root rw\n".encode()
        with patch("builtins.open", return_value=io.BytesIO(content)):
            helper.check_mounts(paths)

    def test_exact_mount_is_rejected(self):
        with self.assertRaisesRegex(helper.Rejected, "^MOUNT_PRESENT$"):
            self.mount("/var/lib/nexowatt-eos")

    def test_descendant_bind_mount_is_rejected(self):
        with self.assertRaisesRegex(helper.Rejected, "^MOUNT_PRESENT$"):
            self.mount("/var/lib/nexowatt-eos/postgresql")

    def test_similar_sibling_mount_is_not_in_scope(self):
        self.mount("/var/lib/nexowatt-eos-other")

    def test_octal_mount_path_is_decoded_before_comparison(self):
        with self.assertRaisesRegex(helper.Rejected, "^MOUNT_PRESENT$"):
            self.mount("/private\\040data/store", ("/private data",))

    def test_mountinfo_capture_is_bounded(self):
        with patch("builtins.open", return_value=io.BytesIO(b"x" * (1024 * 1024 + 1))):
            with self.assertRaisesRegex(helper.Rejected, "^MOUNT_OUTPUT$"):
                helper.check_mounts(helper.MOVES)

    def test_target_unit_has_no_service_pid_properties(self):
        name = "nexowatt-eos.target"
        text = f"Id={name}\nLoadState=loaded\nActiveState=inactive\nSubState=dead\nFragmentPath=/etc/systemd/system/{name}\nDropInPaths=\nNeedDaemonReload=no\n"
        with patch.object(helper, "output", return_value=text) as query:
            value = helper.unit_state(name)
        self.assertEqual(value["MainPID"], "0")
        self.assertNotIn("MainPID", query.call_args.args[0][-1])

    def test_service_unit_requires_real_pid_properties(self):
        name = "nexowatt-eos-controller.service"
        text = f"Id={name}\nLoadState=loaded\nActiveState=inactive\nSubState=dead\nFragmentPath=/etc/systemd/system/{name}\nDropInPaths=\nNeedDaemonReload=no\n"
        with patch.object(helper, "output", return_value=text):
            with self.assertRaisesRegex(helper.Rejected, "^UNIT_OUTPUT$"):
                helper.unit_state(name)

    def test_pinned_entry_loads_as_module_without_running_main(self):
        entry = SOURCE.parents[2] / "delivery/managed16/install.sh"
        with patch.object(helper.subprocess, "Popen", side_effect=AssertionError("no commands during module load")):
            module, config, blocks = helper.load_preparer(entry.read_bytes())
        self.assertEqual(module.__name__, "eos_pinned_managed16_preparer")
        self.assertEqual(module.NODE_VERSION, "24.22.1")
        self.assertIn("/releases/download/managed-test-16-", config["baseUrl"])
        self.assertEqual(len(blocks), 2)

    def test_modified_entry_is_rejected_before_module_execution(self):
        entry = SOURCE.parents[2] / "delivery/managed16/install.sh"
        original = entry.read_bytes()
        changed = bytes([original[0] ^ 1]) + original[1:]
        with self.assertRaisesRegex(helper.Rejected, "^ENTRY_PIN$"):
            helper.load_preparer(changed)


@unittest.skipUnless(os.geteuid() == 0, "protected lock fixtures require root")
class PackageLockBoundaries(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="eos-retirement-lock-test-", dir="/root")
        self.path = Path(self.tmp.name) / "lock"
        self.path.touch(mode=0o600)

    def tearDown(self):
        self.tmp.cleanup()

    def test_free_posix_package_lock_is_held_until_caller_closes(self):
        with patch.object(helper, "PACKAGE_LOCKS", (str(self.path),)):
            descriptors = helper.package_locks()
        self.assertEqual(len(descriptors), 1)
        try:
            self.assertEqual(os.fstat(descriptors[0]).st_ino, self.path.stat().st_ino)
        finally:
            for fd in descriptors:
                os.close(fd)

    def test_lock_held_by_other_process_blocks_without_unlink(self):
        context = multiprocessing.get_context("fork")
        ready, finish = context.Event(), context.Event()
        child = context.Process(target=hold_posix_lock, args=(str(self.path), ready, finish))
        inode = self.path.stat().st_ino
        child.start()
        try:
            self.assertTrue(ready.wait(3), "fixture process failed to acquire its lock")
            with patch.object(helper, "PACKAGE_LOCKS", (str(self.path),)):
                with self.assertRaisesRegex(helper.Rejected, "^PACKAGE_BUSY$"):
                    helper.package_locks()
            self.assertEqual(self.path.stat().st_ino, inode)
        finally:
            finish.set()
            child.join(3)
            if child.is_alive():
                child.terminate()
                child.join(3)

    def test_symlink_lock_is_rejected_without_following(self):
        link = Path(self.tmp.name) / "link"
        link.symlink_to(self.path)
        with patch.object(helper, "PACKAGE_LOCKS", (str(link),)):
            with self.assertRaisesRegex(helper.Rejected, "^PACKAGE_LOCK_FILE$"):
                helper.package_locks()

    def test_hardlinked_lock_is_rejected(self):
        os.link(self.path, Path(self.tmp.name) / "alias")
        with patch.object(helper, "PACKAGE_LOCKS", (str(self.path),)):
            with self.assertRaisesRegex(helper.Rejected, "^PACKAGE_LOCK_FILE$"):
                helper.package_locks()


if __name__ == "__main__":
    unittest.main()
