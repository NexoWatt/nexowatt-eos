#!/usr/bin/env python3
"""Read-only EOS contract checks. NOT authentication, licensing, or an updater.

Only reviewed, repository-local schemas are loaded. Untrusted JSON is bounded,
duplicate keys and non-finite numbers are rejected, and diagnostics omit values.
Schema acceptance never authorizes a command or establishes signature validity.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import re
import stat
import sys
from uuid import UUID

try:
    from jsonschema import Draft202012Validator, FormatChecker
    from referencing import Registry
    from referencing.exceptions import NoSuchResource
except ImportError:
    print(json.dumps({"ok": False, "code": "DEPENDENCY_MISSING"}))
    raise SystemExit(2) from None


ROOT = Path(__file__).resolve().parents[2]
CONTRACT_DIR = ROOT / "system" / "contracts"
CONTRACTS = ("service-command", "entitlement-response", "update-manifest")
MAX_BYTES = 65536
MAX_DEPTH = 24
MAX_NODES = 4096
MAX_ERRORS = 16
MAX_SAFE_INTEGER = 9007199254740991
UTC_PATTERN = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z\Z")
UUID_PATTERN = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\Z")
FORMATS = FormatChecker(formats=[])


class ContractError(ValueError):
    """The message is a fixed diagnostic code, never an untrusted input value."""


@FORMATS.checks("date-time")
def valid_timestamp(value):
    if not isinstance(value, str):
        return True  # JSON Schema 'type' performs type validation.
    if not UTC_PATTERN.fullmatch(value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return False
    return True


@FORMATS.checks("uuid")
def valid_uuid(value):
    if not isinstance(value, str):
        return True
    if not UUID_PATTERN.fullmatch(value):
        return False
    try:
        return str(UUID(value)) == value
    except ValueError:
        return False


def reject_constant(_value):
    raise ContractError("NON_FINITE_NUMBER")


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ContractError("DUPLICATE_KEY")
        result[key] = value
    return result


def check_tree(value):
    """Bound parsed trees too; never coerce strings, booleans, or null to numbers."""
    stack = [(value, 0)]
    count = 0
    while stack:
        item, depth = stack.pop()
        count += 1
        if depth > MAX_DEPTH or count > MAX_NODES:
            raise ContractError("STRUCTURE_LIMIT")
        if isinstance(item, float) and not math.isfinite(item):
            raise ContractError("NON_FINITE_NUMBER")
        if isinstance(item, int) and not isinstance(item, bool) and abs(item) > MAX_SAFE_INTEGER:
            raise ContractError("INTEGER_RANGE")
        if isinstance(item, str) and any(0xD800 <= ord(c) <= 0xDFFF for c in item):
            raise ContractError("INVALID_UNICODE")
        if isinstance(item, dict):
            stack.extend((key, depth + 1) for key in item)
            stack.extend((child, depth + 1) for child in item.values())
        elif isinstance(item, list):
            stack.extend((child, depth + 1) for child in item)


def load_json(path):
    try:
        # Avoid hanging on FIFOs/devices and following a replaced symlink.
        fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW)
        try:
            if not stat.S_ISREG(os.fstat(fd).st_mode):
                raise ContractError("INPUT_NOT_REGULAR")
            with os.fdopen(fd, "rb", closefd=False) as stream:
                data = stream.read(MAX_BYTES + 1)
        finally:
            os.close(fd)
    except OSError:
        raise ContractError("INPUT_UNREADABLE") from None
    if len(data) > MAX_BYTES:
        raise ContractError("INPUT_TOO_LARGE")
    try:
        value = json.loads(data.decode("utf-8"), object_pairs_hook=unique_object,
                           parse_constant=reject_constant)
    except (UnicodeError, json.JSONDecodeError, RecursionError, ValueError) as error:
        if isinstance(error, ContractError):
            raise
        raise ContractError("INVALID_JSON") from None
    check_tree(value)
    return value


def refuse_remote_schema(uri):
    # A schema $ref must never become a network request or local file read.
    raise NoSuchResource(ref=uri)


def validator_for(contract):
    if contract not in CONTRACTS:
        raise ContractError("UNKNOWN_CONTRACT")
    schema = load_json(CONTRACT_DIR / (contract + ".schema.json"))
    try:
        Draft202012Validator.check_schema(schema)
    except Exception:
        raise ContractError("INVALID_SCHEMA") from None
    return Draft202012Validator(schema, format_checker=FORMATS,
                                registry=Registry(retrieve=refuse_remote_schema))


def semantic_errors(contract, value):
    """Offline cross-field consistency only, with no notion of current device time."""
    issued = datetime.strptime(value["issuedAt"], "%Y-%m-%dT%H:%M:%SZ")
    expires = datetime.strptime(value["expiresAt"], "%Y-%m-%dT%H:%M:%SZ")
    duration = (expires - issued).total_seconds()
    maximum = {"service-command": 30, "entitlement-response": 300,
               "update-manifest": 2592000}[contract]
    if not 0 < duration <= maximum:
        yield {"code": "DEADLINE_INTERVAL"}
    if contract == "service-command" and value["action"] == "license.getEntitlements":
        if value["source"] != value["payload"]["subject"]:
            yield {"code": "SUBJECT_BINDING"}
    if contract == "entitlement-response":
        if value["audience"] != value["subject"]:
            yield {"code": "SUBJECT_BINDING"}
    if contract == "update-manifest":
        ids = [artifact["artifactId"] for artifact in value["artifacts"]]
        if len(ids) != len(set(ids)):
            yield {"code": "DUPLICATE_ARTIFACT_ID"}
        by_id = {artifact["artifactId"]: artifact for artifact in value["artifacts"]}
        sbom = by_id.get(value["sbomArtifactId"])
        if not sbom or sbom["purpose"] != "sbom":
            yield {"code": "SBOM_REFERENCE"}


def validate(contract, value):
    check_tree(value)
    errors = []
    for error in validator_for(contract).iter_errors(value):
        # error.message, paths and context may contain supplied values or keys.
        # Only the trusted schema keyword is suitable for these diagnostics.
        errors.append({"code": "SCHEMA_VIOLATION", "keyword": str(error.validator)})
        if len(errors) == MAX_ERRORS:
            break
    if not errors:
        errors.extend(semantic_errors(contract, value))
    return errors


class SafeArgumentParser(argparse.ArgumentParser):
    def error(self, _message):
        print(json.dumps({"ok": False, "code": "ARGUMENT_ERROR"}))
        raise SystemExit(2)


def main(argv=None):
    parser = SafeArgumentParser(description=__doc__)
    parser.add_argument("--contract", choices=CONTRACTS)
    parser.add_argument("--input", type=Path)
    parser.add_argument("--examples", action="store_true")
    args = parser.parse_args(argv)
    if args.examples and not args.contract and not args.input:
        jobs = [(name, CONTRACT_DIR / "examples" / (name + ".json")) for name in CONTRACTS]
    elif not args.examples and args.contract and args.input:
        jobs = [(args.contract, args.input)]
    else:
        parser.error("invalid selection")
    results = []
    try:
        for contract, path in jobs:
            errors = validate(contract, load_json(path))
            results.append({"contract": contract, "ok": not errors, "errors": errors})
    except ContractError as error:
        print(json.dumps({"ok": False, "code": str(error)}))
        return 1
    except Exception:
        # A damaged local schema/dependency must fail closed without a traceback
        # containing the document being validated. Investigate in dev separately.
        print(json.dumps({"ok": False, "code": "VALIDATOR_FAILURE"}))
        return 2
    ok = all(result["ok"] for result in results)
    print(json.dumps({"ok": ok, "scope": "offline-contract-validation", "results": results}))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
