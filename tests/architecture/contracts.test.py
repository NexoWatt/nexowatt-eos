#!/usr/bin/env python3
"""Contract fixtures and parser tests only. No running EOS/device is exercised."""

import importlib.util
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
TOOL = ROOT / "tools" / "architecture" / "validate-contracts.py"
SPEC = importlib.util.spec_from_file_location("eos_contract_validator", TOOL)
validator = importlib.util.module_from_spec(SPEC)
sys.dont_write_bytecode = True
SPEC.loader.exec_module(validator)


def example(name):
    return validator.load_json(ROOT / "system" / "contracts" / "examples" / (name + ".json"))


class ContractTests(unittest.TestCase):
    def assert_valid(self, name, value):
        self.assertEqual(validator.validate(name, value), [])

    def assert_invalid(self, name, value):
        self.assertTrue(validator.validate(name, value))

    def test_all_examples_and_schemas_valid(self):
        for name in validator.CONTRACTS:
            with self.subTest(contract=name):
                self.assert_valid(name, example(name))

    def test_all_top_level_objects_closed(self):
        for name in validator.CONTRACTS:
            with self.subTest(contract=name):
                value = example(name)
                value["unexpected"] = "must be rejected"
                self.assert_invalid(name, value)

    def test_command_backup_valid_and_profile_is_not_a_path(self):
        value = example("service-command")
        value.update(source="eos-admin", target="nexowatt-backitup", action="backup.create",
                     payload={"profileId": "nightly", "reason": "scheduled-policy"})
        self.assert_valid("service-command", value)
        for profile in ("../../etc/shadow", "https://attacker.invalid/backup", "a\n", "$(id)"):
            with self.subTest(profile=repr(profile)):
                value["payload"]["profileId"] = profile
                self.assert_invalid("service-command", value)

    def test_command_license_valid_and_subject_bound(self):
        value = example("service-command")
        value.update(source="nexowatt-ui", target="identity-license", action="license.getEntitlements",
                     payload={"subject": "nexowatt-ui", "systemId": value["payload"]["deviceId"]})
        self.assert_valid("service-command", value)
        value["payload"]["subject"] = "eebus"
        self.assert_invalid("service-command", value)

    def test_command_action_routes_are_restricted(self):
        for field, content in (("action", "shell.exec"), ("source", "nexowatt-ui"),
                               ("target", "os-base"), ("source", "unregistered-module")):
            with self.subTest(field=field, content=content):
                value = example("service-command")
                value[field] = content
                self.assert_invalid("service-command", value)

    def test_command_payload_objects_closed(self):
        for level in ("payload", "activePower"):
            with self.subTest(level=level):
                value = example("service-command")
                node = value["payload"] if level == "payload" else value["payload"]["activePower"]
                node["script"] = "dangerous command"
                self.assert_invalid("service-command", value)

    def test_power_no_coercion_and_unit_required(self):
        for content in (True, False, None, "4200", [], {}, 1000000001, -1000000001):
            with self.subTest(content=content):
                value = example("service-command")
                value["payload"]["activePower"]["value"] = content
                self.assert_invalid("service-command", value)
        value = example("service-command")
        value["payload"]["activePower"]["unit"] = "kW"
        self.assert_invalid("service-command", value)

    def test_finite_signed_power_and_syntax_boundaries(self):
        for watts in (0, -4200.5, 1000000000, -1000000000):
            with self.subTest(watts=watts):
                value = example("service-command")
                value["payload"]["activePower"]["value"] = watts
                self.assert_valid("service-command", value)

    def test_sequence_rejects_types_negative_and_overflow(self):
        for content in (-1, True, None, "1", 1.5):
            with self.subTest(content=content):
                value = example("service-command")
                value["sequence"] = content
                self.assert_invalid("service-command", value)
        value["sequence"] = 9007199254740992
        with self.assertRaisesRegex(validator.ContractError, "INTEGER_RANGE"):
            validator.validate("service-command", value)

    def test_timestamp_semantics_calendar_timezone_and_precision(self):
        for time in ("2026-02-30T12:00:00Z", "2026-09-30T19:00:60Z", "2026-09-30T19:00:00+00:00",
                     "2026-09-30T19:00:00.001Z", "2026-09-30T19:00:00Z\n", "not-a-date"):
            with self.subTest(time=time):
                value = example("service-command")
                value["issuedAt"] = time
                self.assert_invalid("service-command", value)

    def test_deadline_order_and_maximum(self):
        pairs = (("service-command", "2026-09-30T19:00:31Z"),
                 ("entitlement-response", "2026-09-30T19:05:01Z"),
                 ("update-manifest", "2026-11-01T19:00:00Z"))
        for name, late in pairs:
            for expiry in ("2026-09-30T18:59:59Z", "2026-09-30T19:00:00Z", late):
                with self.subTest(contract=name, expiry=expiry):
                    value = example(name)
                    value["expiresAt"] = expiry
                    self.assert_invalid(name, value)

    def test_uuid_canonical_required(self):
        for content in ("../secret", "00000000-0000-0000-0000-000000000000",
                        "719A20F5-5EF6-4CC7-8A8A-25415B9B46EA", "719a20f55ef64cc78a8a25415b9b46ea"):
            with self.subTest(content=content):
                value = example("service-command")
                value["requestId"] = content
                self.assert_invalid("service-command", value)

    def test_entitlement_deny_contains_no_grants(self):
        value = example("entitlement-response")
        value.update(decision="deny", reason="unavailable", rights=[],
                     limits={"chargePoints": 0, "storageSystems": 0})
        self.assert_valid("entitlement-response", value)
        value["rights"] = ["ui.access"]
        self.assert_invalid("entitlement-response", value)
        value["rights"] = []
        value["limits"]["chargePoints"] = 1
        self.assert_invalid("entitlement-response", value)

    def test_entitlement_allows_only_subject_rights_and_matching_audience(self):
        for field, content in (("rights", ["admin.manage"]), ("rights", ["ui.access", "ui.access"]),
                               ("rights", []), ("rights", "ui.access"),
                               ("audience", "eos-admin"), ("reason", "expired"),
                               ("issuer", "nexowatt-ui")):
            with self.subTest(field=field, content=content):
                value = example("entitlement-response")
                value[field] = content
                self.assert_invalid("entitlement-response", value)

    def test_entitlement_no_license_or_keys(self):
        for field in ("licensePlaintext", "privateKey", "password", "token"):
            with self.subTest(field=field):
                value = example("entitlement-response")
                value[field] = "not-a-secret-test-sentinel"
                self.assert_invalid("entitlement-response", value)
        value = example("entitlement-response")
        value["limits"]["unknown"] = 1
        self.assert_invalid("entitlement-response", value)

    def test_manifest_exact_hash_size_and_version(self):
        for field, content in (("sha256", "a" * 63), ("sha256", "G" * 64),
                               ("sha256", "a" * 63 + "\n"), ("sizeBytes", 0),
                               ("sizeBytes", True), ("sizeBytes", 17179869185)):
            with self.subTest(field=field, content=content):
                value = example("update-manifest")
                value["artifacts"][0][field] = content
                self.assert_invalid("update-manifest", value)
        for version in ("latest", "stable", "1.01.0", "1.0", "1.0.0;id", "1.0.0-01", "1.0.0\n"):
            with self.subTest(version=version):
                value = example("update-manifest")
                value["version"] = version
                self.assert_invalid("update-manifest", value)

    def test_manifest_no_urls_scripts_or_paths(self):
        for field in ("url", "installScript", "destination", "signature"):
            with self.subTest(field=field):
                value = example("update-manifest")
                value["artifacts"][0][field] = "untrusted value"
                self.assert_invalid("update-manifest", value)
        value = example("update-manifest")
        value["artifacts"][0]["artifactId"] = "../image"
        self.assert_invalid("update-manifest", value)

    def test_manifest_hardware_and_required_verification(self):
        for field, content in (("osFamily", "windows"), ("architecture", "unknown"),
                               ("hardwareProfileId", "any*"), ("hardwareProfileId", "")):
            with self.subTest(field=field):
                value = example("update-manifest")
                value["target"][field] = content
                self.assert_invalid("update-manifest", value)
        value = example("update-manifest")
        value["requiresVerifiedTufMetadata"] = False
        self.assert_invalid("update-manifest", value)

    def test_manifest_arrays_and_artifact_links(self):
        mutations = ([], {}, "image", [None, None])
        for artifacts in mutations:
            with self.subTest(artifacts=artifacts):
                value = example("update-manifest")
                value["artifacts"] = artifacts
                self.assert_invalid("update-manifest", value)
        value = example("update-manifest")
        value["artifacts"][1]["artifactId"] = value["artifacts"][0]["artifactId"]
        self.assert_invalid("update-manifest", value)
        value = example("update-manifest")
        value["sbomArtifactId"] = "missing-artifact"
        self.assert_invalid("update-manifest", value)
        value["sbomArtifactId"] = "example-image"
        self.assert_invalid("update-manifest", value)
        value = example("update-manifest")
        value["artifacts"] *= 5
        self.assert_invalid("update-manifest", value)

    def test_schema_does_not_authenticate_or_check_current_time(self):
        # Explicitly document the boundary: a forged but well-shaped request
        # can pass offline checks; no transport identity or current time is known.
        value = example("service-command")
        value["issuedAt"] = "2000-01-01T00:00:00Z"
        value["expiresAt"] = "2000-01-01T00:00:01Z"
        self.assert_valid("service-command", value)


class ParserAndCliTests(unittest.TestCase):
    def parse(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.json"
            path.write_bytes(content)
            return validator.load_json(path)

    def test_duplicate_keys_rejected_including_nested(self):
        for document in (b'{"a":1,"a":2}', b'{"payload":{"a":1,"a":2}}'):
            with self.subTest(document=document):
                with self.assertRaisesRegex(validator.ContractError, "DUPLICATE_KEY"):
                    self.parse(document)

    def test_nonfinite_numbers_rejected(self):
        for value in (b"NaN", b"Infinity", b"-Infinity", b"1e999"):
            with self.subTest(value=value):
                with self.assertRaisesRegex(validator.ContractError, "NON_FINITE_NUMBER"):
                    self.parse(b'{"value":' + value + b'}')
        for value in (math.nan, math.inf, -math.inf):
            with self.assertRaisesRegex(validator.ContractError, "NON_FINITE_NUMBER"):
                validator.check_tree({"value": value})

    def test_invalid_json_unicode_and_bom_rejected(self):
        for document in (b'{"bad":', b'{"a":"\xff"}', b'\xef\xbb\xbf{}', b'{"a":"\\ud800"}'):
            with self.subTest(document=document):
                with self.assertRaises(validator.ContractError):
                    self.parse(document)

    def test_size_limit(self):
        with self.assertRaisesRegex(validator.ContractError, "INPUT_TOO_LARGE"):
            self.parse(b" " * (validator.MAX_BYTES + 1))

    def test_depth_and_node_count_limits(self):
        with self.assertRaisesRegex(validator.ContractError, "STRUCTURE_LIMIT"):
            self.parse(b"[" * 30 + b"0" + b"]" * 30)
        with self.assertRaisesRegex(validator.ContractError, "STRUCTURE_LIMIT"):
            self.parse(json.dumps([0] * validator.MAX_NODES).encode())

    def test_huge_integer_rejected(self):
        with self.assertRaisesRegex(validator.ContractError, "INTEGER_RANGE"):
            self.parse(b"9007199254740992")

    def test_fifos_and_symlinks_rejected_without_reading(self):
        with tempfile.TemporaryDirectory() as directory:
            fifo = Path(directory) / "fifo"
            os.mkfifo(fifo)
            with self.assertRaisesRegex(validator.ContractError, "INPUT_NOT_REGULAR"):
                validator.load_json(fifo)
            target = Path(directory) / "file.json"
            target.write_text("{}")
            link = Path(directory) / "link"
            link.symlink_to(target)
            with self.assertRaisesRegex(validator.ContractError, "INPUT_UNREADABLE"):
                validator.load_json(link)

    def test_remote_schema_retrieval_is_refused(self):
        with self.assertRaises(validator.NoSuchResource):
            validator.refuse_remote_schema("https://attacker.invalid/schema")

    def test_cli_examples_pass_and_output_is_json(self):
        result = subprocess.run([sys.executable, str(TOOL), "--examples"], capture_output=True,
                                text=True, check=False, timeout=10)
        self.assertEqual(result.returncode, 0)
        self.assertTrue(json.loads(result.stdout)["ok"])
        self.assertEqual(result.stderr, "")

    def test_cli_invalid_values_keys_and_filenames_never_printed(self):
        sentinel = "DO-NOT-PRINT-TEST-VALUE"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / (sentinel + ".json")
            value = example("entitlement-response")
            value[sentinel] = sentinel
            value["subject"] = sentinel
            path.write_text(json.dumps(value))
            result = subprocess.run([sys.executable, str(TOOL), "--contract", "entitlement-response",
                                     "--input", str(path)], capture_output=True, text=True,
                                    check=False, timeout=10)
        self.assertEqual(result.returncode, 1)
        self.assertFalse(json.loads(result.stdout)["ok"])
        self.assertNotIn(sentinel, result.stdout + result.stderr)
        self.assertNotIn("Traceback", result.stdout + result.stderr)

    def test_cli_bad_arguments_do_not_echo_values(self):
        result = subprocess.run([sys.executable, str(TOOL), "--contract", "DO-NOT-PRINT-TEST-VALUE"],
                                capture_output=True, text=True, check=False, timeout=10)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)["code"], "ARGUMENT_ERROR")
        self.assertNotIn("DO-NOT-PRINT", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
