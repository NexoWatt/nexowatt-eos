#!/usr/bin/python3
"""Privacy and unchanged-parser evidence using fixtures, never host APT sources."""
import contextlib
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import types
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[2] / "tools/system/inspect-managed16-apt.py"
ENTRY = SOURCE.parents[2] / "delivery/managed16/install.sh"
ENTRY_BYTES = ENTRY.read_bytes()
SPEC = importlib.util.spec_from_file_location("managed16_apt_inspection", SOURCE)
diagnostic = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(diagnostic)


def deb822(uri="https://deb.debian.org/debian", suites="trixie", extra=""):
    return (f"Types: deb\nURIs: {uri}\nSuites: {suites}\nComponents: main non-free-firmware\n"
            "Signed-By: /usr/share/keyrings/debian-archive-keyring.pgp\n" + extra + "\n")


class AptInspection(unittest.TestCase):
    def setUp(self):
        self.prep = diagnostic.load_preparer(ENTRY_BYTES)

    @contextlib.contextmanager
    def sources(self, files):
        paths = {Path(path): text.encode() for path, text in files.items()}
        directory = Path("/etc/apt/sources.list.d")

        def exists(path):
            return Path(path) in paths or Path(path) == directory

        def private_file(path, limit):
            self.assertLessEqual(len(paths[Path(path)]), limit)
            return paths[Path(path)]

        with patch.object(self.prep, "exists", side_effect=exists), \
                patch.object(self.prep, "trusted_path", side_effect=lambda path, **kwargs: Path(path)), \
                patch.object(self.prep, "private_file", side_effect=private_file), \
                patch.object(self.prep.Path, "iterdir", return_value=iter(p for p in paths if p.parent == directory)):
            yield

    def inspect_source(self, text, suffix=".sources"):
        emitted = []
        with self.sources({"/etc/apt/sources.list.d/PRIVATE_FILENAME" + suffix: text}):
            diagnostic.inspect(self.prep, emitted.append)
        self.assertNotIn("PRIVATE_", json.dumps(emitted))
        return emitted

    def test_valid_pinned_source_passes_without_host_changes(self):
        emitted = self.inspect_source(deb822())
        self.assertEqual(emitted, [{"kind": "result", "code": "APT_SOURCE_CHECK_PASSED", "hostChanged": False}])

    def test_valid_one_line_source_uses_original_parser(self):
        emitted = self.inspect_source("deb [arch=arm64] https://deb.debian.org/debian trixie main\n", ".list")
        self.assertEqual(emitted[-1]["code"], "APT_SOURCE_CHECK_PASSED")

    def test_every_url_predicate_matches_the_gate(self):
        cases = [
            ("ftp://deb.debian.org/debian", ["trixie"], "schemeAllowed"),
            ("https://PRIVATE_HOST.invalid/debian", ["trixie"], "hostAllowed"),
            ("https://deb.debian.org/PRIVATE_PATH", ["trixie"], "pathAllowedForHost"),
            ("https://PRIVATE_USER:PRIVATE_PASSWORD@deb.debian.org/debian", ["trixie"], "credentialsAbsent"),
            ("https://deb.debian.org:443/debian", ["trixie"], "explicitPortAbsent"),
            ("https://deb.debian.org/debian?token=PRIVATE_QUERY", ["trixie"], "queryAbsent"),
            ("https://deb.debian.org/debian#PRIVATE_FRAGMENT", ["trixie"], "fragmentAbsent"),
            ("https://deb.debian.org/debian", [], "suitesPresent"),
            ("https://deb.debian.org/debian", ["PRIVATE_SUITE"], "suitesAllowed"),
        ]
        for uri, suites, predicate in cases:
            with self.subTest(predicate=predicate):
                with self.assertRaisesRegex(self.prep.Rejected, "^BOOTSTRAP_APT_SOURCE$"):
                    self.prep.check_repo_url(uri, suites)
                value = diagnostic.classify(self.prep, uri, suites)
                self.assertIs(value[predicate], False)
                self.assertNotIn("PRIVATE_", json.dumps(value))

    def test_all_allowed_predicates_are_true(self):
        uri, suites = "https://deb.debian.org/debian/", ["trixie", "trixie-updates"]
        self.prep.check_repo_url(uri, suites)
        value = diagnostic.classify(self.prep, uri, suites)
        self.assertTrue(all(v for v in value.values() if type(v) is bool))
        self.assertEqual(value["path"], "/debian")
        self.assertEqual(value["host"], "deb.debian.org")

    def test_rejected_credentials_query_fragment_never_appear(self):
        emitted = self.inspect_source(deb822("https://PRIVATE_USER:PRIVATE_PASSWORD@deb.debian.org/debian?PRIVATE_QUERY#PRIVATE_FRAGMENT"))
        self.assertEqual(emitted[-1]["code"], "BOOTSTRAP_APT_SOURCE")
        detail = emitted[0]
        self.assertFalse(detail["credentialsAbsent"])
        self.assertFalse(detail["queryAbsent"])
        self.assertFalse(detail["fragmentAbsent"])
        self.assertEqual(detail["host"], "deb.debian.org")

    def test_unknown_host_path_suite_are_redacted(self):
        emitted = self.inspect_source(deb822("https://PRIVATE_HOST.invalid/PRIVATE_PATH", "PRIVATE_SUITE"))
        self.assertEqual(emitted[0]["host"], "OTHER_REDACTED")
        self.assertEqual(emitted[0]["path"], "OTHER_REDACTED")
        self.assertEqual(emitted[0]["suites"], ["OTHER_REDACTED"])
        self.assertEqual(emitted[-1]["code"], "BOOTSTRAP_APT_SOURCE")

    def test_known_public_but_disallowed_suite_is_named_without_approval(self):
        emitted = self.inspect_source(deb822(suites="bookworm"))
        self.assertEqual(emitted[0]["suites"], ["bookworm"])
        self.assertFalse(emitted[0]["suitesAllowed"])
        self.assertEqual(emitted[-1]["code"], "BOOTSTRAP_APT_SOURCE")

    def test_malformed_port_and_url_emit_no_input(self):
        for uri in ("https://deb.debian.org:PRIVATE_PORT/debian", "https://[PRIVATE_HOST/debian"):
            with self.subTest(uri=uri):
                self.assertEqual(diagnostic.classify(self.prep, uri, ["trixie"]), {"urlParseable": False})
                with self.assertRaisesRegex(self.prep.Rejected, "^BOOTSTRAP_APT_SOURCE$"):
                    self.prep.check_repo_url(uri, ["trixie"])

    def test_suite_output_is_bounded(self):
        value = diagnostic.classify(self.prep, "https://deb.debian.org/debian", ["PRIVATE_SUITE"] * 50)
        self.assertEqual(value["suiteCount"], 50)
        self.assertEqual(value["suites"], ["OTHER_REDACTED"] * 8)

    def test_disabled_stanza_is_skipped_by_real_parser(self):
        text = deb822("https://PRIVATE_HOST.invalid/PRIVATE_PATH", "PRIVATE_SUITE", "Enabled: no\n") + deb822()
        emitted = self.inspect_source(text)
        self.assertEqual(emitted[-1]["code"], "APT_SOURCE_CHECK_PASSED")
        self.assertFalse(any(row["kind"] == "rejected-source" for row in emitted))

    def test_only_disabled_sources_still_fail_missing_sources_gate(self):
        emitted = self.inspect_source(deb822("https://PRIVATE_HOST.invalid", extra="Enabled: no\n"))
        self.assertEqual(emitted[-1]["code"], "BOOTSTRAP_APT_SOURCES_MISSING")

    def test_duplicate_deb822_field_is_rejected_without_content(self):
        emitted = self.inspect_source(deb822(extra="URIs: https://PRIVATE_HOST.invalid/PRIVATE_PATH\n"))
        self.assertEqual(emitted[-1]["code"], "BOOTSTRAP_APT_SOURCE_SYNTAX")
        self.assertFalse(any(row["kind"] == "rejected-source" for row in emitted))

    def test_unrecognized_deb822_field_is_rejected_without_content(self):
        emitted = self.inspect_source(deb822(extra="PRIVATE-FIELD: PRIVATE_VALUE\n"))
        self.assertEqual(emitted[-1]["code"], "BOOTSTRAP_APT_SOURCE_OPTIONS_FIELDS")

    def test_one_line_trust_bypass_remains_rejected(self):
        emitted = self.inspect_source("deb [trusted=yes] https://PRIVATE_HOST.invalid trixie main\n", ".list")
        self.assertEqual(emitted[-1]["code"], "BOOTSTRAP_APT_SOURCE_OPTIONS")

    def test_wrappers_restore_original_parser_after_rejection(self):
        original_read, original_check = self.prep.private_file, self.prep.check_repo_url
        self.inspect_source(deb822(suites="PRIVATE_SUITE"))
        self.assertIs(self.prep.private_file, original_read)
        self.assertIs(self.prep.check_repo_url, original_check)
        with self.assertRaisesRegex(self.prep.Rejected, "^BOOTSTRAP_APT_SOURCE$"):
            self.prep.check_repo_url("https://deb.debian.org/debian", ["PRIVATE_SUITE"])

    def test_stops_at_first_rejection_with_source_ordinal_and_fingerprint(self):
        first, second = deb822(), deb822(suites="PRIVATE_SUITE")
        emitted = []
        files = {"/etc/apt/sources.list.d/a.sources": first, "/etc/apt/sources.list.d/b.sources": second,
                 "/etc/apt/sources.list.d/c.sources": deb822("https://PRIVATE_OTHER_HOST.invalid")}
        with self.sources(files):
            diagnostic.inspect(self.prep, emitted.append)
        self.assertEqual(len(emitted), 2)
        self.assertEqual(emitted[0]["sourceFileOrdinal"], 2)
        self.assertEqual(emitted[0]["sourceFileSha256"], hashlib.sha256(second.encode()).hexdigest())
        self.assertEqual(emitted[0]["sourceFormat"], "deb822")
        self.assertNotIn("PRIVATE_", json.dumps(emitted))

    def test_inspection_opens_no_extra_files_or_network_and_runs_no_commands(self):
        with self.sources({"/etc/apt/sources.list.d/a.sources": deb822(suites="PRIVATE_SUITE")}), \
                patch("builtins.open", side_effect=AssertionError("unexpected file I/O")), \
                patch.object(os, "open", side_effect=AssertionError("unexpected file I/O")), \
                patch.object(subprocess, "Popen", side_effect=AssertionError("unexpected command")), \
                patch.object(socket, "socket", side_effect=AssertionError("unexpected network")):
            emitted = []
            diagnostic.inspect(self.prep, emitted.append)
        self.assertEqual(emitted[-1]["code"], "BOOTSTRAP_APT_SOURCE")

    def test_bad_entry_hash_is_rejected_before_compile_or_exec(self):
        changed = bytes([ENTRY_BYTES[0] ^ 1]) + ENTRY_BYTES[1:]
        with patch("builtins.compile") as compile_source, patch("builtins.exec") as execute:
            with self.assertRaisesRegex(diagnostic.Rejected, "^ENTRY_PIN$"):
                diagnostic.load_preparer(changed)
        compile_source.assert_not_called()
        execute.assert_not_called()

    def test_valid_entry_load_does_not_run_main_or_commands(self):
        with patch("builtins.open", side_effect=AssertionError("unexpected file I/O")), \
                patch.object(os, "open", side_effect=AssertionError("unexpected file I/O")), \
                patch.object(subprocess, "Popen", side_effect=AssertionError("unexpected command")), \
                patch.object(socket, "socket", side_effect=AssertionError("unexpected network")):
            prep = diagnostic.load_preparer(ENTRY_BYTES)
        self.assertEqual(prep.__name__, "eos_apt_diagnostic_pinned_preparer")
        self.assertEqual(prep.NODE_VERSION, "24.22.1")

    def test_candidate_search_reads_only_expected_names_and_continues_after_bad_hash(self):
        names = ["PRIVATE_ROOT_FILENAME", "eos-download-a", "eos-download-b", "eos-download-bad.name"]
        entries = [types.SimpleNamespace(name=name) for name in names]
        with patch.object(os, "scandir", return_value=contextlib.nullcontext(iter(entries))), \
                patch.object(diagnostic, "read_entry", side_effect=[diagnostic.Rejected("ENTRY_PIN"), ENTRY_BYTES]) as read:
            prep = diagnostic.find_preparer()
        self.assertEqual([str(call.args[0]) for call in read.call_args_list],
                         ["/root/eos-download-a/install.sh", "/root/eos-download-b/install.sh"])
        self.assertEqual(prep.NODE_VERSION, "24.22.1")


@unittest.skipUnless(os.geteuid() == 0, "root-owned pinned-entry fixtures require root")
class EntryFiles(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="eos-download-", dir="/root")
        self.directory = Path(self.tmp.name)
        self.entry = self.directory / "install.sh"
        self.entry.write_bytes(ENTRY_BYTES)
        self.entry.chmod(0o600)

    def tearDown(self):
        self.tmp.cleanup()

    def test_protected_exact_entry_passes(self):
        self.assertEqual(diagnostic.read_entry(self.entry), ENTRY_BYTES)

    def test_bad_hash_entry_is_rejected(self):
        self.entry.write_bytes(bytes([ENTRY_BYTES[0] ^ 1]) + ENTRY_BYTES[1:])
        with self.assertRaisesRegex(diagnostic.Rejected, "^ENTRY_PIN$"):
            diagnostic.read_entry(self.entry)

    def test_final_symlink_is_never_followed(self):
        self.entry.unlink()
        self.entry.symlink_to(ENTRY)
        with self.assertRaises(OSError):
            diagnostic.read_entry(self.entry)

    def test_parent_symlink_is_never_followed(self):
        link = Path(tempfile.mkdtemp(prefix="eos-download-", dir="/root"))
        link.rmdir()
        try:
            link.symlink_to(self.directory, target_is_directory=True)
            with self.assertRaises(OSError):
                diagnostic.read_entry(link / "install.sh")
        finally:
            link.unlink()

    def test_unsafe_parent_is_rejected(self):
        self.directory.chmod(0o777)
        with self.assertRaisesRegex(diagnostic.Rejected, "^ENTRY_PARENT$"):
            diagnostic.read_entry(self.entry)

    def test_hardlinked_entry_is_rejected(self):
        os.link(self.entry, self.directory / "alias")
        with self.assertRaisesRegex(diagnostic.Rejected, "^ENTRY_FILE$"):
            diagnostic.read_entry(self.entry)

    def test_fifo_is_rejected_without_blocking(self):
        self.entry.unlink()
        os.mkfifo(self.entry, 0o600)
        with self.assertRaisesRegex(diagnostic.Rejected, "^ENTRY_FILE$"):
            diagnostic.read_entry(self.entry)


if __name__ == "__main__":
    unittest.main()
