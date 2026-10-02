#!/usr/bin/env python3
"""Isolated source-catalogue tests; no repository fetching or product execution."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("component_sources", ROOT / "tools/sbom/component_sources.py")
TOOL = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TOOL)


def fixture():
    components = []
    for identity in sorted(TOOL.COMPONENT_IDS):
        observed = identity != "nexowatt-ui"
        components.append({
            "id": identity, "moduleId": "eos-core", "repository": "https://github.com/NexoWatt/" + identity,
            "sourceRef": "main" if observed else None,
            "provenance": {"kind": "git-commit" if observed else "unresolved",
                           "commit": "a" * 40 if observed else None, "archiveSha256": None},
            "packageName": "iobroker." + identity if observed else None,
            "observedVersion": "1.2.3" if observed else None,
            "manifestSha256": "b" * 64 if observed else None,
            "licenseDeclared": "MIT" if observed else None,
            "sourceStatus": "source-observed" if observed else "access-unresolved",
            "sourceScope": "selected-files" if observed else "not-accessible",
            "installedVersion": None, "approved": False,
            "reviewDocument": "docs/security/SOURCE_REVIEW.md",
        })
    return {"schemaVersion": 2, "kind": "eos-component-source-inventory", "date": "2026-09-30",
            "baseCommit": "c" * 40, "releaseApproved": False, "runtimeIntegrated": False,
            "installedInventoryVerified": False, "hardwareProfile": "system/hardware/rpi5-profile.json",
            "components": components}


class ComponentSourceTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="eos-components-test-")
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.inventory_path = self.directory / "inventory.json"
        self.inventory = fixture()

    def write(self):
        self.inventory_path.write_text(json.dumps(self.inventory), encoding="utf-8")

    def prepare(self):
        self.write()
        return TOOL.prepare(self.inventory_path)

    def observed(self):
        return next(c for c in self.inventory["components"] if c["sourceStatus"] == "source-observed")

    def missing(self):
        return next(c for c in self.inventory["components"] if c["sourceStatus"] == "access-unresolved")

    def add_archive(self):
        archive = self.missing()
        archive.update(sourceStatus="source-observed", sourceScope="complete-archive", sourceRef=None,
                       packageName="iobroker.nexowatt-ui", observedVersion="1.0.21",
                       manifestSha256="d" * 64, licenseDeclared=None,
                       provenance={"kind": "user-uploaded-archive", "commit": None, "archiveSha256": "e" * 64})
        return archive

    def run_cli(self, *arguments):
        return subprocess.run([sys.executable, str(ROOT / "tools/sbom/component_sources.py"),
                               "--inventory", str(self.inventory_path), *arguments],
                              capture_output=True, text=True, timeout=15)

    def reject(self):
        with self.assertRaises(TOOL.EvidenceError):
            self.prepare()

    def test_official_schema_valid_prebuild_incomplete(self):
        document = self.prepare()
        TOOL.SHARED.schema_validator().validate(document)
        self.assertEqual(document["metadata"]["lifecycles"], [{"phase": "pre-build"}])
        self.assertEqual(document["compositions"][0]["aggregate"], "incomplete")
        self.assertEqual(len(document["components"]), 8)
        self.assertNotIn("version", document["metadata"]["component"])

    def test_missing_ui_explicit_without_invented_component(self):
        document = self.prepare()
        props = {p["name"]: p["value"] for p in document["metadata"]["properties"]}
        self.assertEqual(json.loads(props["eos:sbom:unobserved-component-ids"]), ["nexowatt-ui"])
        self.assertEqual(props["eos:product:installed-inventory-verified"], "false")
        self.assertFalse(any(c["name"] == "iobroker.nexowatt-ui" for c in document["components"]))

    def test_manifest_hash_is_property_not_package_hash(self):
        document = self.prepare()
        for component in document["components"]:
            self.assertNotIn("hashes", component)
            properties = {p["name"]: p["value"] for p in component["properties"]}
            self.assertEqual(properties["eos:source:manifest-sha256"], "b" * 64)
            self.assertEqual(properties["eos:source:manifest-hash-scope"], "package.json-only-not-package-artifact")
        for key in ("dependencies", "services", "vulnerabilities", "declarations"):
            self.assertNotIn(key, document)

    def test_controller_cannot_be_omitted_or_replaced(self):
        self.inventory["components"] = [c for c in self.inventory["components"] if c["id"] != "js-controller"]
        self.reject()
        self.inventory = fixture()
        next(c for c in self.inventory["components"] if c["id"] == "js-controller")["id"] = "unknown"
        self.reject()

    def test_duplicate_ids_rejected(self):
        self.inventory["components"][0]["id"] = self.inventory["components"][1]["id"]
        self.reject()

    def test_semver_ranges_and_malformed_versions_rejected(self):
        for version in ("^1.2.3", "~1.2.3", "latest", "1.2", "01.2.3", "1.2.3-01", "1.2.3-a..b", "v1.2.3", "1.2.3\n", True, None):
            with self.subTest(version=version):
                self.observed()["observedVersion"] = version
                self.reject()

    def test_exact_prerelease_and_build_metadata_accepted(self):
        self.observed()["observedVersion"] = "1.2.3-rc.1+build.02"
        self.assertTrue(self.prepare())

    def test_url_credentials_protocol_paths_and_fragments_rejected(self):
        for repository in ("http://github.com/NexoWatt/test", "https://user:password@github.com/NexoWatt/test",
                           "https://github.com.evil.invalid/NexoWatt/test", "https://github.com:443/NexoWatt/test",
                           "https://github.com/NexoWatt/../secret", "https://github.com/NexoWatt/%2e%2e",
                           "https://github.com/NexoWatt/test?token=secret", "https://github.com/NexoWatt/test#main"):
            with self.subTest(repository=repository):
                self.observed()["repository"] = repository
                self.reject()

    def test_review_path_traversal_and_absolute_paths_rejected(self):
        for path in ("../secret.md", "/etc/private.md", "docs/../secret.md", "docs//secret.md",
                     "C:\\secret.md", "docs/%2e%2e/secret.md", "docs/review.txt", "docs/review.md\n"):
            with self.subTest(path=path):
                self.observed()["reviewDocument"] = path
                self.reject()

    def test_source_ref_rejects_shell_and_traversal_values(self):
        for ref in ("$(touch marker)", "../main", "main//secret", "main\n", "main/..", "main/"):
            with self.subTest(ref=ref):
                self.observed()["sourceRef"] = ref
                self.reject()

    def test_missing_source_metadata_must_be_null(self):
        for field, value in (("packageName", "invented"), ("observedVersion", "1.2.3"),
                             ("manifestSha256", "b" * 64), ("licenseDeclared", "MIT")):
            with self.subTest(field=field):
                self.inventory = fixture()
                self.missing()[field] = value
                self.reject()

    def test_observed_missing_or_invalid_evidence_rejected(self):
        for field, value in (("manifestSha256", None), ("manifestSha256", "b" * 63),
                             ("packageName", None), ("sourceScope", "not-accessible")):
            with self.subTest(field=field, value=value):
                self.inventory = fixture()
                self.observed()[field] = value
                self.reject()

    def test_unknown_fields_and_modules_rejected(self):
        self.inventory["privateToken"] = "fixture-secret"
        self.reject()
        self.inventory = fixture()
        self.observed()["config"] = {"password": "fixture-secret"}
        self.reject()
        self.inventory = fixture()
        self.observed()["moduleId"] = "not-a-module"
        self.reject()

    def test_release_and_installed_claims_rejected(self):
        for field in ("releaseApproved", "runtimeIntegrated", "installedInventoryVerified"):
            for value in (True, 0, None, "false"):
                with self.subTest(field=field, value=value):
                    self.inventory = fixture()
                    self.inventory[field] = value
                    self.reject()
        for field, value in (("approved", True), ("approved", 0), ("installedVersion", "1.2.3")):
            self.inventory = fixture()
            self.observed()[field] = value
            self.reject()

    def test_shape_date_schema_and_hardware_reference_rejected(self):
        for field, value in (("schemaVersion", True), ("schemaVersion", 1), ("date", "2026-02-30"), ("date", "20260930"),
                             ("baseCommit", "main"), ("hardwareProfile", "../../secret"), ("components", {})):
            with self.subTest(field=field):
                self.inventory = fixture()
                self.inventory[field] = value
                self.reject()

    def test_archive_has_no_invented_git_ref_or_package_artifact_hash(self):
        self.add_archive()
        document = self.prepare()
        TOOL.SHARED.schema_validator().validate(document)
        self.assertEqual(len(document["components"]), 9)
        ui = next(c for c in document["components"] if c["name"] == "iobroker.nexowatt-ui")
        properties = {p["name"]: p["value"] for p in ui["properties"]}
        self.assertEqual(properties["eos:source:archive-sha256"], "e" * 64)
        self.assertEqual(properties["eos:source:archive-hash-scope"], "original-uploaded-zip")
        self.assertEqual(properties["eos:source:manifest-sha256"], "d" * 64)
        self.assertEqual(properties["eos:source:repository-origin-verified"], "false")
        self.assertNotIn("externalReferences", ui)
        self.assertNotIn("hashes", ui)
        self.assertNotIn("eos:source:git-commit", properties)
        self.assertNotIn("eos:source:ref-description", properties)
        metadata = {p["name"]: p["value"] for p in document["metadata"]["properties"]}
        self.assertEqual(json.loads(metadata["eos:sbom:unobserved-component-ids"]), [])
        self.assertEqual(document["compositions"][0]["aggregate"], "incomplete")

    def test_mixed_archive_provenance_rejected(self):
        for field, value in (("commit", "a" * 40), ("archiveSha256", None), ("archiveSha256", "g" * 64),
                             ("archiveSha256", "a" * 63), ("archiveSha256", True), ("kind", "git-commit")):
            with self.subTest(field=field, value=value):
                self.inventory = fixture()
                self.add_archive()["provenance"][field] = value
                self.reject()
        for field, value in (("sourceRef", "main"), ("sourceScope", "complete-checkout")):
            self.inventory = fixture()
            self.add_archive()[field] = value
            self.reject()

    def test_git_provenance_preserves_commit_reference_and_rejects_archive_mix(self):
        document = self.prepare()
        for component in document["components"]:
            properties = {p["name"]: p["value"] for p in component["properties"]}
            source = next(c for c in self.inventory["components"]
                          if c["id"] == properties["eos:source:component-id"])
            self.assertEqual(component["externalReferences"][0]["url"], source["repository"])
            self.assertIn("Declared VCS origin", component["externalReferences"][0]["comment"])
            self.assertEqual(properties["eos:source:git-commit"], "a" * 40)
            self.assertEqual(properties["eos:source:remote-commit-availability"], "unverified-by-generator")
        for field, value in (("commit", None), ("commit", "main"), ("commit", "a" * 39),
                             ("archiveSha256", "e" * 64), ("kind", "unresolved")):
            with self.subTest(field=field, value=value):
                self.inventory = fixture()
                self.observed()["provenance"][field] = value
                self.reject()

    def test_git_semantic_validator_rejects_invented_remote_tree_reference(self):
        document = self.prepare()
        document["components"][0]["externalReferences"][0]["url"] += "/tree/" + "a" * 40
        with self.assertRaises(TOOL.EvidenceError):
            TOOL.validate_document(document, self.inventory, self.inventory_path.read_bytes())

    def test_unresolved_and_malformed_provenance_rejected(self):
        for provenance in (None, {}, {"kind": "unresolved", "commit": "a" * 40, "archiveSha256": None},
                           {"kind": "unresolved", "commit": None, "archiveSha256": "e" * 64},
                           {"kind": "unresolved", "commit": None, "archiveSha256": None, "token": "secret"}):
            with self.subTest(provenance=provenance):
                self.inventory = fixture()
                self.missing()["provenance"] = provenance
                self.reject()
        self.inventory = fixture()
        self.observed()["commit"] = "a" * 40
        self.reject()

    def test_archive_semantic_validator_rejects_fabricated_vcs_and_hash_promotion(self):
        self.add_archive()
        document = self.prepare()
        for field, value in (("externalReferences", [{"type": "vcs", "url": "https://github.com/NexoWatt/nexowatt-ui/tree/" + "a" * 40}]),
                             ("hashes", [{"alg": "SHA-256", "content": "e" * 64}])):
            changed = copy.deepcopy(document)
            ui = next(c for c in changed["components"] if c["name"] == "iobroker.nexowatt-ui")
            ui[field] = value
            with self.assertRaises(TOOL.EvidenceError):
                TOOL.validate_document(changed, self.inventory, self.inventory_path.read_bytes())

    def test_no_network_shell_or_git_execution(self):
        self.write()
        with patch.object(socket, "socket", side_effect=AssertionError("network forbidden")), \
                patch.object(subprocess, "run", side_effect=AssertionError("process forbidden")), \
                patch.object(subprocess, "Popen", side_effect=AssertionError("process forbidden")), \
                patch.object(os, "system", side_effect=AssertionError("shell forbidden")):
            document = TOOL.prepare(self.inventory_path)
            TOOL.validate_document(document, self.inventory, self.inventory_path.read_bytes())

    def test_semantic_validation_rejects_complete_installed_and_artifact_claims(self):
        document = self.prepare()
        for mutation in (lambda d: d["compositions"][0].update(aggregate="complete"),
                         lambda d: d["metadata"].update(lifecycles=[{"phase": "operations"}]),
                         lambda d: d["metadata"]["component"].update(version="1.0.0"),
                         lambda d: d.update(dependencies=[]),
                         lambda d: d["components"][0].update(hashes=[{"alg": "SHA-256", "content": "b" * 64}]),
                         lambda d: d["components"][0].update(version="9.9.9")):
            with self.subTest(mutation=mutation):
                changed = copy.deepcopy(document)
                mutation(changed)
                with self.assertRaises(TOOL.EvidenceError):
                    TOOL.validate_document(changed, self.inventory, self.inventory_path.read_bytes())

    def test_duplicate_nonfinite_and_oversized_json_rejected(self):
        for value in ('{"components":[],"components":[]}', '{"x":NaN}', '[1]', '{',
                      ' ' * (TOOL.SHARED.MAX_JSON_BYTES + 1), '[' * 1100 + '0' + ']' * 1100):
            with self.subTest(length=len(value)):
                self.inventory_path.write_text(value)
                with self.assertRaises(TOOL.EvidenceError):
                    TOOL.prepare(self.inventory_path)

    def test_final_input_symlink_and_fifo_rejected_without_wait(self):
        self.write()
        alias = self.directory / "alias.json"
        alias.symlink_to(self.inventory_path)
        with self.assertRaises(OSError):
            TOOL.prepare(alias)
        fifo = self.directory / "input.fifo"
        os.mkfifo(fifo)
        with self.assertRaises(TOOL.EvidenceError):
            TOOL.prepare(fifo)

    def test_check_only_is_readonly_and_deterministic(self):
        self.write()
        before = self.inventory_path.read_bytes()
        result = self.run_cli("--check-only")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.inventory_path.read_bytes(), before)
        self.assertEqual(list(self.directory.iterdir()), [self.inventory_path])
        self.assertEqual(TOOL.prepare(self.inventory_path), TOOL.prepare(self.inventory_path))

    def test_output_is_new_private_file_and_not_overwritten(self):
        self.write()
        output = self.directory / "new.json"
        result = self.run_cli("--output", str(output))
        self.assertEqual(result.returncode, 0, result.stderr)
        original = output.read_bytes()
        self.assertEqual(output.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.run_cli("--output", str(output)).returncode, 2)
        self.assertEqual(output.read_bytes(), original)

    def test_symlink_output_and_parent_do_not_change_target(self):
        self.write()
        target = self.directory / "target"
        target.write_text("preserve")
        alias = self.directory / "alias"
        alias.symlink_to(target)
        self.assertEqual(self.run_cli("--output", str(alias)).returncode, 2)
        self.assertEqual(target.read_text(), "preserve")
        directory_alias = self.directory / "dir-alias"
        directory_alias.symlink_to(self.directory, target_is_directory=True)
        self.assertEqual(self.run_cli("--output", str(directory_alias / "new.json")).returncode, 2)
        self.assertFalse((self.directory / "new.json").exists())

    def test_cli_errors_are_sanitized_and_conflicting_modes_rejected(self):
        self.write()
        output = self.directory / "new.json"
        self.assertEqual(self.run_cli("--check-only", "--output", str(output)).returncode, 2)
        self.assertEqual(self.run_cli().returncode, 2)
        sentinel = "fixture-secret-not-a-real-credential"
        self.observed()["repository"] = "https://user:" + sentinel + "@github.com/NexoWatt/test"
        self.write()
        result = self.run_cli("--output", str(output))
        self.assertEqual(result.returncode, 2)
        self.assertNotIn(sentinel, result.stdout + result.stderr)
        self.assertFalse(output.exists())
        result = self.run_cli("--" + sentinel)
        self.assertNotIn(sentinel, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
