#!/usr/bin/env python3
"""Exercise extracted original logging functions; no updater or npm runs."""

import os
from pathlib import Path
import re
import shlex
import shutil
import stat
import subprocess
import tempfile
import unittest


SOURCE = Path(__file__).resolve().parents[2] / "node-update.sh"
TEXT = SOURCE.read_text(encoding="utf-8")


def function_source(name):
    match = re.search(rf"^{re.escape(name)}\(\) \{{\n.*?^\}}", TEXT, re.M | re.S)
    if match is None:
        raise AssertionError(f"Missing original function: {name}")
    return match.group(0)


FUNCTIONS = "\n".join(function_source(name) for name in
                      ("log", "init_logging", "cleanup", "compatibility_check"))


class PrivateUpdateLogs(unittest.TestCase):
    def setUp(self):
        self.case_dir = Path(tempfile.mkdtemp(prefix="eos-log-test-"))
        self.runtime_dir = self.case_dir / "runtime"
        self.runtime_dir.mkdir()
        self.victim = self.case_dir / "untouched.txt"
        self.victim.write_text("UNCHANGED\n", encoding="utf-8")
        self.original_stat = self.victim.stat()
        (self.runtime_dir / "iob-nodejs-update-2000-01-01_00-00-00.log").symlink_to(self.victim)
        self.old_log = self.runtime_dir / "iob-nodejs-update-old.log"
        self.old_log.write_text("KEEP OLD LOG\n", encoding="utf-8")
        os.utime(self.old_log, (1, 1))
        self.private_dirs = []

    def tearDown(self):
        # Delete only directories explicitly created by this test's mktemp calls.
        for directory in self.private_dirs:
            if directory.parent == Path("/tmp") and directory.name.startswith("iob-nodejs-update."):
                shutil.rmtree(directory)
        shutil.rmtree(self.case_dir)

    def run_functions(self, body, setup=""):
        metadata = self.case_dir / "metadata"
        script = f"""set -euo pipefail
umask 022
CASE_DIR={shlex.quote(str(self.case_dir))}
IOB_DIR={shlex.quote(str(self.runtime_dir))}
LOG_DIR="$IOB_DIR"
LOG_FILE=""
IOB_USER=iobroker
SUDOX=sudo
DRY_RUN=false
NODE_MAJOR=24
sudo() {{ printf '%s\\n' "sudo $*" >> "$CASE_DIR/calls"; return 0; }}
touch() {{ printf 'FORBIDDEN touch\\n' >> "$CASE_DIR/calls"; return 91; }}
chown() {{ printf 'FORBIDDEN chown\\n' >> "$CASE_DIR/calls"; return 92; }}
sed() {{ printf 'FORBIDDEN sed\\n' >> "$CASE_DIR/calls"; return 93; }}
find() {{ printf 'FORBIDDEN find\\n' >> "$CASE_DIR/calls"; return 94; }}
date() {{ printf '2000-01-01_00-00-00\\n'; }}
npm() {{ printf 'MOCK_NPM_OUTPUT\\n'; return 2; }}
{FUNCTIONS}
{setup}
{body}
"""
        result = subprocess.run(["bash", "-c", script], text=True, capture_output=True,
                                env={"PATH": "/usr/bin:/bin", "TMPDIR": str(self.runtime_dir)}, timeout=10)
        if metadata.exists():
            lines = metadata.read_text(encoding="utf-8").splitlines()
            self.private_dirs.append(Path(lines[0]))
            self.assertEqual(lines[1], "0022", "logging must preserve caller umask")
        return result

    def successful_init(self, extra=""):
        previous_count = len(self.private_dirs)
        result = self.run_functions("""init_logging
printf '%s\\n%s\\n' "$LOG_DIR" "$(umask)" > "$CASE_DIR/metadata"
printf 'STDOUT_MARKER\\n'
printf 'STDERR_MARKER\\n' >&2
""" + extra)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.private_dirs), previous_count + 1)
        directory = self.private_dirs[-1]
        self.assertEqual(directory.parent, Path("/tmp"))
        self.assertRegex(directory.name, r"^iob-nodejs-update\.[A-Za-z0-9]{10}$")
        self.assertEqual(stat.S_IMODE(directory.stat().st_mode), 0o700)
        self.assertEqual(stat.S_IMODE((directory / "update.log").stat().st_mode), 0o600)
        self.assertEqual(directory.stat().st_uid, os.geteuid())
        output = (directory / "update.log").read_text(encoding="utf-8")
        self.assertIn("STDOUT_MARKER", output)
        self.assertIn("STDERR_MARKER", output)
        self.assertIn("STDOUT_MARKER", result.stdout)
        self.assertIn("STDERR_MARKER", result.stdout)
        return directory, result

    def test_private_directory_file_permissions_and_mirrored_output(self):
        self.successful_init()
        self.assertFalse((self.case_dir / "calls").exists(), "logging must call no privileged or cleanup commands")

    def test_prepared_runtime_symlink_tmpdir_and_old_logs_remain_untouched(self):
        self.successful_init()
        self.assertEqual(self.victim.read_text(), "UNCHANGED\n")
        current = self.victim.stat()
        self.assertEqual(current.st_mtime_ns, self.original_stat.st_mtime_ns)
        self.assertEqual(current.st_uid, self.original_stat.st_uid)
        self.assertEqual(self.old_log.read_text(), "KEEP OLD LOG\n")
        self.assertEqual(len(list(self.runtime_dir.iterdir())), 2)

    def test_cleanup_keeps_private_raw_log_and_does_not_process_runtime_logs(self):
        directory, _ = self.successful_init("cleanup\n")
        self.assertTrue((directory / "update.log").is_file())
        self.assertIn("\x1b[", (directory / "update.log").read_text(), "raw ANSI output is retained")
        calls = (self.case_dir / "calls").read_text()
        self.assertEqual(calls, "sudo rm -f /usr/share/keyrings/nodesource.gpg.new\n")
        self.assertEqual(self.victim.read_text(), "UNCHANGED\n")

    def test_compatibility_output_uses_private_directory(self):
        directory, result = self.successful_init("compatibility_check\n")
        side_log = directory / "npm-dryrun.log"
        self.assertEqual(side_log.read_text(), "MOCK_NPM_OUTPUT\n")
        self.assertEqual(stat.S_IMODE(side_log.stat().st_mode), 0o600)
        self.assertIn(str(side_log), result.stdout)
        self.assertNotIn("/tmp/npm_dryrun.log", function_source("compatibility_check"))

    def test_mktemp_failure_aborts_without_a_log_or_privileged_fallback(self):
        result = self.run_functions("init_logging\nprintf 'MUST_NOT_CONTINUE\\n'\n",
                                    setup="mktemp() { return 1; }")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("MUST_NOT_CONTINUE", result.stdout)
        self.assertIn("Could not create a private update log directory", result.stderr)
        self.assertFalse((self.case_dir / "calls").exists())
        self.assertEqual(self.victim.read_text(), "UNCHANGED\n")

    def test_compatibility_without_logging_is_rejected(self):
        result = self.run_functions("LOG_DIR=''\ncompatibility_check\n")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must be initialized", result.stderr)

    def test_separate_runs_do_not_reuse_directory(self):
        first, _ = self.successful_init()
        first_log = (first / "update.log").read_text()
        second, _ = self.successful_init()
        self.assertNotEqual(first, second)
        self.assertEqual((first / "update.log").read_text(), first_log)


if __name__ == "__main__":
    unittest.main(verbosity=2)
