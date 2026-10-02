#!/usr/bin/env python3
"""Isolated SBOM preparation tests. No npm, network or installed EOS required."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import shutil

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("source_sbom", ROOT / "tools/sbom/source_sbom.py")
SBOM = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SBOM)


class SourceSbomTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="eos-sbom-test-")
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name) / "repo"
        self.repo.mkdir()
        self.package = {"name": "@nexowatt/test-installer", "version": "1.2.3",
                        "dependencies": {"example-library": "^2.0.0"},
                        "optionalDependencies": {"example-optional": "~3.4.0"}}
        self.write_package()
        for command in [["init", "-q"], ["add", "package.json"],
                        ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "test fixture"]]:
            subprocess.run(["git", "-C", str(self.repo), *command], check=True, capture_output=True,
                           env={"PATH": os.defpath, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull})

    def write_package(self):
        (self.repo / "package.json").write_text(json.dumps(self.package), encoding="utf-8")

    def test_valid_official_cyclonedx_17(self):
        document, coverage = SBOM.prepare(self.repo)
        SBOM.schema_validator().validate(document)
        SBOM.validate(document)
        self.assertEqual(document["specVersion"], "1.7")
        self.assertEqual(document["metadata"]["component"]["version"], "1.2.3")
        self.assertEqual(coverage["source"]["packageJsonSha256"], hashlib.sha256((self.repo / "package.json").read_bytes()).hexdigest())

    def test_dependency_ranges_are_not_resolved_components(self):
        document, coverage = SBOM.prepare(self.repo)
        self.assertEqual([entry["name"] for entry in document["components"]], ["package.json"])
        self.assertNotIn("dependencies", document)
        self.assertFalse(coverage["complete"])
        self.assertEqual(len(coverage["declaredButUnresolvedDependencies"]), 2)
        self.assertEqual(coverage["declaredButUnresolvedDependencies"][0]["declaredRange"], "^2.0.0")
        self.assertIn("operating-system-kernel-and-firmware", coverage["missingScopes"])
        self.assertIn("eos-admin-production-admin-7", coverage["missingScopes"])

    def test_complete_claim_rejected(self):
        document, _ = SBOM.prepare(self.repo)
        document["compositions"][0]["aggregate"] = "complete"
        with self.assertRaises(SBOM.EvidenceError):
            SBOM.validate(document)

    def test_operational_lifecycle_rejected(self):
        document, _ = SBOM.prepare(self.repo)
        document["metadata"]["lifecycles"] = [{"phase": "operations"}]
        with self.assertRaises(SBOM.EvidenceError):
            SBOM.validate(document)

    def test_tampered_metadata_rejected(self):
        document, _ = SBOM.prepare(self.repo)
        for prop in document["metadata"]["properties"]:
            if prop["name"] == "eos:sbom:completeness":
                prop["value"] = "complete"
        with self.assertRaises(SBOM.EvidenceError):
            SBOM.validate(document)

    def test_fabricated_inventory_rejected(self):
        document, _ = SBOM.prepare(self.repo)
        document["components"].append({"type": "operating-system", "name": "invented-os", "version": "123"})
        with self.assertRaises(SBOM.EvidenceError):
            SBOM.validate(document)

    def test_inconsistent_manifest_hash_rejected(self):
        document, _ = SBOM.prepare(self.repo)
        document["components"][0]["hashes"][0]["content"] = "0" * 64
        with self.assertRaises(SBOM.EvidenceError):
            SBOM.validate(document)

    def test_schema_tamper_rejected(self):
        schemas = Path(self.temporary.name) / "schemas"
        shutil.copytree(SBOM.SCHEMA_DIRECTORY, schemas)
        (schemas / "bom-1.7.schema.json").write_text("{}")
        with patch.object(SBOM, "SCHEMA_DIRECTORY", schemas):
            with self.assertRaisesRegex(SBOM.EvidenceError, "SCHEMA_HASH_MISMATCH"):
                SBOM.prepare(self.repo)

    def test_validation_has_no_network_dependency(self):
        document, _ = SBOM.prepare(self.repo)
        with patch("socket.socket", side_effect=AssertionError("network forbidden")):
            SBOM.validate(document)

    def test_malformed_json_and_duplicate_keys_rejected(self):
        for value in ["{", '{"name":"one","name":"two"}', "[]", '{"number":NaN}']:
            with self.subTest(value=value):
                (self.repo / "package.json").write_text(value)
                with self.assertRaises(SBOM.EvidenceError):
                    SBOM.prepare(self.repo)

    def test_missing_package_rejected(self):
        (self.repo / "package.json").unlink()
        with self.assertRaises(OSError):
            SBOM.prepare(self.repo)

    def test_invalid_metadata_and_declared_dependencies_rejected(self):
        for field, value in [("name", "bad/name/secret"), ("version", "latest"),
                             ("version", True), ("dependencies", ["not-object"]),
                             ("dependencies", {"test": 17})]:
            with self.subTest(field=field, value=value):
                original = copy.deepcopy(self.package)
                self.package[field] = value
                self.write_package()
                with self.assertRaises(SBOM.EvidenceError):
                    SBOM.prepare(self.repo)
                self.package = original

    def test_secret_metadata_and_url_values_not_exported(self):
        sentinel = "test-secret-sentinel-not-a-real-credential"
        self.package["token"] = sentinel
        self.package["config"] = {"password": sentinel}
        self.package["repository"] = "https://user:" + sentinel + "@example.invalid/repo"
        self.package["dependencies"]["url-package"] = self.package["repository"]
        self.write_package()
        document, coverage = SBOM.prepare(self.repo)
        self.assertNotIn(sentinel, json.dumps([document, coverage]))
        redacted = next(item for item in coverage["declaredButUnresolvedDependencies"] if item["name"] == "url-package")
        self.assertTrue(redacted["nonSemverValueRedacted"])
        self.assertIsNone(redacted["declaredRange"])

    def test_deterministic_manifest_scope_and_head_comparison(self):
        first = SBOM.prepare(self.repo)
        self.assertTrue(first[1]["source"]["manifestMatchesHead"])
        self.assertEqual(first, SBOM.prepare(self.repo))
        # An unrelated private file is neither inventoried nor read into output.
        (self.repo / "private.key").write_text("fixture-content")
        self.assertEqual(first, SBOM.prepare(self.repo))
        self.package["version"] = "1.2.4"
        self.write_package()
        changed = SBOM.prepare(self.repo)
        self.assertFalse(changed[1]["source"]["manifestMatchesHead"])
        self.assertNotEqual(first[1]["source"]["packageJsonSha256"], changed[1]["source"]["packageJsonSha256"])

    def test_git_clean_filter_not_executed(self):
        marker = Path(self.temporary.name) / "filter-was-run"
        (self.repo / ".gitattributes").write_text("package.json filter=danger\n")
        subprocess.run(["git", "-C", str(self.repo), "config", "filter.danger.clean", "touch " + str(marker)], check=True)
        self.package["description"] = "changed"
        self.write_package()
        SBOM.prepare(self.repo)
        self.assertFalse(marker.exists())

    def test_oversized_and_symlink_package_rejected(self):
        package = self.repo / "package.json"
        package.write_bytes(b" " * (SBOM.MAX_JSON_BYTES + 1))
        with self.assertRaises(SBOM.EvidenceError):
            SBOM.prepare(self.repo)
        package.unlink()
        other = self.repo / "other.json"
        other.write_text(json.dumps(self.package))
        package.symlink_to(other)
        with self.assertRaises(OSError):
            SBOM.prepare(self.repo)

    def test_existing_output_and_symlink_target_unchanged(self):
        target = Path(self.temporary.name) / "existing.json"
        target.write_text("preserve-me")
        with self.assertRaises(OSError):
            SBOM.write_new(target, {"replacement": True})
        self.assertEqual(target.read_text(), "preserve-me")
        alias = Path(self.temporary.name) / "alias.json"
        alias.symlink_to(target)
        with self.assertRaises(OSError):
            SBOM.write_new(alias, {"replacement": True})
        self.assertEqual(target.read_text(), "preserve-me")
        self.assertEqual(list(target.parent.glob(".eos-sbom-*")), [])

    def test_symlink_output_parent_rejected(self):
        alias = Path(self.temporary.name) / "alias"
        alias.symlink_to(self.repo, target_is_directory=True)
        with self.assertRaises(OSError):
            SBOM.write_new(alias / "output.json", {})
        self.assertFalse((self.repo / "output.json").exists())

    def test_new_output_is_private_valid_json(self):
        destination = Path(self.temporary.name) / "output.json"
        SBOM.write_new(destination, {"valid": True})
        self.assertEqual(json.loads(destination.read_text()), {"valid": True})
        self.assertEqual(destination.stat().st_mode & 0o777, 0o600)

    def test_cli_generation_and_validation(self):
        output = Path(self.temporary.name) / "bom.json"
        coverage = Path(self.temporary.name) / "coverage.json"
        command = [sys.executable, str(ROOT / "tools/sbom/source_sbom.py")]
        generated = subprocess.run(command + ["--repo", str(self.repo), "--output", str(output), "--coverage", str(coverage)], capture_output=True, text=True)
        self.assertEqual(generated.returncode, 0, generated.stderr)
        validated = subprocess.run(command + ["--validate", str(output)], capture_output=True, text=True)
        self.assertEqual(validated.returncode, 0, validated.stderr)

    def test_cli_errors_do_not_echo_input_secrets(self):
        sentinel = "secret-invalid-package-fixture"
        self.package["version"] = sentinel
        self.write_package()
        result = subprocess.run([sys.executable, str(ROOT / "tools/sbom/source_sbom.py"), "--repo", str(self.repo),
                                 "--output", str(self.repo / "out.json"), "--coverage", str(self.repo / "coverage.json")], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertNotIn(sentinel, result.stdout + result.stderr)
        self.assertFalse((self.repo / "out.json").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
