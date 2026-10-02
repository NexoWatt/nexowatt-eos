#!/usr/bin/env python3
"""Pinned upstream source-fragment review; never run an installer or host tools.

Successful reproductions also confirm remaining weaknesses, not remediation.
Source must be supplied explicitly through EOS_UPSTREAM_INSTALLER_SOURCE.
"""
import hashlib
import os
from pathlib import Path
import subprocess
import unittest

EXPECTED_SHA256 = "ae08d35e8c69bcfcebef31baecb4429fc424bb06bb6860920a8ac865863e3853"


class UpstreamHardenedSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        source_dir = os.environ.get("EOS_UPSTREAM_INSTALLER_SOURCE")
        if not source_dir:
            raise RuntimeError("REVIEW_SOURCE_REQUIRED")
        raw = (Path(source_dir) / "installer_library.sh").read_bytes()
        if hashlib.sha256(raw).hexdigest() != EXPECTED_SHA256:
            raise RuntimeError("REVIEW_SOURCE_HASH_MISMATCH")
        cls.source = raw.decode("utf-8")
        cls.helpers = cls.source.split("function add2sudoers() {", 1)[1].split("create_user_linux() {", 1)[0]
        cls.helpers = "function add2sudoers() {" + cls.helpers
        linux = cls.source.split("create_user_linux() {", 1)[1].split("create_user_freebsd() {", 1)[0]
        # Execute only the policy construction block, before any file mutation.
        cls.policy_fragment = '    SUDOERS_FILE="/etc/sudoers.d/iobroker"' + linux.split('    SUDOERS_FILE="/etc/sudoers.d/iobroker"', 1)[1].split('    $SUDOX rm -f $SUDOERS_FILE', 1)[0]
        cls.groups = '    declare -a groups=(' + linux.split('    declare -a groups=(', 1)[1].rsplit("}", 1)[0]

    def shell(self, body, *args):
        # No inherited BASH_ENV, shell options, credentials or startup files.
        result = subprocess.run(
            ["/bin/bash", "--noprofile", "--norc", "-s", "--", *args],
            input=body, text=True, capture_output=True, timeout=5,
            env={"PATH": "/usr/bin:/bin", "LC_ALL": "C"},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def policy(self, hardened="true", marker_status="1"):
        preamble = r'''
IOB_HARDENED="$1"
MARKER_STATUS="$2"
SUDOX=fixture_privileged_read
username=iobroker
IOB_USER=iobroker
USER=fixture_operator
CONTROLLER_DIR=/fixture/iobroker/node_modules/iobroker.js-controller
# Only grep's status is simulated; no privileged command is invoked.
fixture_privileged_read() {
    [ "$1" = grep ] || return 99
    return "$MARKER_STATUS"
}
which() { printf '/fixture/bin/%s\n' "$1"; }
'''
        return self.shell(preamble + self.helpers + "\nconstruct_policy() {\n" + self.policy_fragment
                          + "\nprintf '%b' \"$SUDOERS_CONTENT\"\n}\nconstruct_policy\n",
                          hardened, marker_status)

    def test_default_mode_still_grants_broad_runtime_permissions(self):
        policy = self.policy("false")
        self.assertIn("iobroker ALL=(ALL) ALL", policy)
        self.assertIn("NOPASSWD: /fixture/bin/systemd-run", policy)
        self.assertIn("NOPASSWD: /fixture/bin/apt-get", policy)

    def test_hardened_policy_omits_general_root_tools(self):
        policy = self.policy()
        self.assertNotIn("iobroker ALL=(ALL) ALL", policy)
        for command in ("systemd-run", "apt-get", "dpkg", "mount", "docker", "setcap"):
            self.assertNotIn("NOPASSWD: /fixture/bin/" + command, policy)

    def test_hardened_service_rules_still_apply_to_iobroker_group(self):
        policy = self.policy()
        self.assertIn("%iobroker ALL=NOPASSWD: /fixture/bin/systemctl restart iobroker", policy)
        self.assertNotIn("\nALL ALL=", policy)
        self.assertIn("%iobroker ALL=(iobroker) NOPASSWD:", policy)

    def test_readable_marker_preserves_hardening_without_flag(self):
        policy = self.policy("false", "0")
        self.assertNotIn("iobroker ALL=(ALL) ALL", policy)
        self.assertIn("%iobroker ALL=NOPASSWD:", policy)

    def test_marker_read_error_is_not_distinguished_from_absence(self):
        # Exit 2 models grep/read failure; real sudoers replacement is not run.
        policy = self.policy("false", "2")
        self.assertIn("iobroker ALL=(ALL) ALL", policy)

    def test_explicit_flag_remains_hardened_despite_marker_read_error(self):
        policy = self.policy("true", "2")
        self.assertNotIn("iobroker ALL=(ALL) ALL", policy)

    def test_group_loop_does_not_propagate_failed_docker_removal(self):
        stubs = r'''
username=iobroker
hardened=true
SUDOX=fixture_group_command
removals=0
getent() { return 0; }
fixture_group_command() {
    case "$1" in
        gpasswd) removals=$((removals + 1)); return 1 ;;
        usermod) return 0 ;;
        *) return 99 ;;
    esac
}
'''
        result = self.shell(stubs + "\ncheck_groups() {\n" + self.groups
                            + "\n}\ncheck_groups\nstatus=$?\nprintf 'status=%s removals=%s\\n' \"$status\" \"$removals\"\n")
        self.assertIn("status=0 removals=1", result)


if __name__ == "__main__":
    unittest.main(verbosity=2)
