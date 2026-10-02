#!/usr/bin/env python3
"""Offline CycloneDX source observations, not a release or installed inventory.

Only the reviewed local inventory is read. Repository URLs are data, never fetch
targets. Shared schema and safe-output helpers are imported from this repository,
not from input-controlled paths. No package, Git or shell commands are executed.
"""
from __future__ import annotations

import argparse
from datetime import date
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys


def _shared_tool():
    path = Path(__file__).resolve().with_name("source_sbom.py")
    spec = importlib.util.spec_from_file_location("_eos_source_sbom_shared", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SHARED = _shared_tool()
EvidenceError = SHARED.EvidenceError
VERSION = "0.2.1"
ROOT_KEYS = {"schemaVersion", "kind", "date", "baseCommit", "releaseApproved",
             "runtimeIntegrated", "installedInventoryVerified", "hardwareProfile", "components"}
COMPONENT_KEYS = {"id", "moduleId", "repository", "sourceRef", "provenance", "packageName",
                  "observedVersion", "manifestSha256", "licenseDeclared", "sourceStatus",
                  "sourceScope", "installedVersion", "approved", "reviewDocument"}
COMPONENT_IDS = {"eos-installer", "js-controller", "adapter-core", "eos-admin", "nexowatt-ui",
                 "nexowatt-devices", "eebus", "ocpp21", "nexowatt-backitup"}
MODULE_IDS = {"os-base", "eos-core", "eos-admin", "nexowatt-ui", "nexowatt-devices",
              "nexowatt-backitup", "eebus", "identity-license", "secure-bus", "data-store",
              "update-agent", "audit-health"}
COMMIT = re.compile(r"[0-9a-f]{40}\Z")
DIGEST = re.compile(r"[0-9a-f]{64}\Z")
REPOSITORY = re.compile(r"https://github\.com/[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\Z")
REF = re.compile(r"[A-Za-z0-9][A-Za-z0-9._/-]{0,199}\Z")
SEGMENT = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,99}\Z")
LICENSE_TEXT = re.compile(r"[A-Za-z0-9][A-Za-z0-9 .()+:_/-]{0,255}\Z")
NUMBER = r"(?:0|[1-9][0-9]*)"
SEMVER = re.compile(NUMBER + r"\." + NUMBER + r"\." + NUMBER +
                    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
                    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?\Z")


def _matches(pattern, value):
    return isinstance(value, str) and pattern.fullmatch(value) is not None


def _exact_semver(value):
    if not isinstance(value, str) or len(value) > 128:
        return False
    match = SEMVER.fullmatch(value)
    return bool(match) and not any(part.isdigit() and len(part) > 1 and part.startswith("0")
                                  for part in (match.group(1) or "").split("."))


def _repo_document(value):
    return (isinstance(value, str) and len(value) <= 512 and value.endswith(".md")
            and all(_matches(SEGMENT, part) for part in value.split("/")))


def validate_inventory(inventory):
    """Enforce the narrow source-only contract; unknown fields fail closed."""
    if not isinstance(inventory, dict) or set(inventory) != ROOT_KEYS:
        raise EvidenceError("INVALID_INVENTORY_SHAPE")
    if type(inventory["schemaVersion"]) is not int or inventory["schemaVersion"] != 2:
        raise EvidenceError("INVALID_INVENTORY_SCHEMA_VERSION")
    if inventory["kind"] != "eos-component-source-inventory":
        raise EvidenceError("INVALID_INVENTORY_KIND")
    when = inventory["date"]
    if not isinstance(when, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", when):
        raise EvidenceError("INVALID_INVENTORY_DATE")
    try:
        date.fromisoformat(when)
    except ValueError as exc:
        raise EvidenceError("INVALID_INVENTORY_DATE") from exc
    if not _matches(COMMIT, inventory["baseCommit"]):
        raise EvidenceError("INVALID_BASE_COMMIT")
    if any(inventory[field] is not False for field in
           ("releaseApproved", "runtimeIntegrated", "installedInventoryVerified")):
        raise EvidenceError("UNSUPPORTED_PRODUCT_CLAIM")
    if inventory["hardwareProfile"] != "system/hardware/rpi5-profile.json":
        raise EvidenceError("INVALID_HARDWARE_PROFILE_REFERENCE")
    records = inventory["components"]
    if not isinstance(records, list) or len(records) != len(COMPONENT_IDS):
        raise EvidenceError("INCOMPLETE_COMPONENT_SCOPE")
    seen = set()
    for component in records:
        if not isinstance(component, dict) or set(component) != COMPONENT_KEYS:
            raise EvidenceError("INVALID_COMPONENT_SHAPE")
        identity = component["id"]
        if not isinstance(identity, str) or identity not in COMPONENT_IDS or identity in seen:
            raise EvidenceError("INVALID_OR_DUPLICATE_COMPONENT_ID")
        seen.add(identity)
        if not isinstance(component["moduleId"], str) or component["moduleId"] not in MODULE_IDS:
            raise EvidenceError("UNKNOWN_MODULE_ID")
        if not _matches(REPOSITORY, component["repository"]):
            raise EvidenceError("INVALID_REPOSITORY_URL")
        reference = component["sourceRef"]
        if reference is not None and (not _matches(REF, reference) or ".." in reference
                                      or "//" in reference or reference.endswith("/")):
            raise EvidenceError("INVALID_SOURCE_REFERENCE")
        if not _repo_document(component["reviewDocument"]):
            raise EvidenceError("INVALID_REVIEW_DOCUMENT")
        if component["approved"] is not False or component["installedVersion"] is not None:
            raise EvidenceError("UNSUPPORTED_COMPONENT_CLAIM")
        provenance = component["provenance"]
        if not isinstance(provenance, dict) or set(provenance) != {"kind", "commit", "archiveSha256"}:
            raise EvidenceError("INVALID_PROVENANCE_SHAPE")
        if component["sourceStatus"] == "access-unresolved":
            if (provenance != {"kind": "unresolved", "commit": None, "archiveSha256": None}
                    or component["sourceScope"] != "not-accessible" or any(component[field] is not None for field in
                    ("packageName", "observedVersion", "manifestSha256", "licenseDeclared"))):
                raise EvidenceError("UNOBSERVED_COMPONENT_METADATA")
        elif component["sourceStatus"] == "source-observed":
            if provenance["kind"] == "git-commit":
                if (not _matches(COMMIT, provenance["commit"]) or provenance["archiveSha256"] is not None
                        or component["sourceScope"] not in ("complete-checkout", "selected-files")):
                    raise EvidenceError("INVALID_GIT_PROVENANCE")
            elif provenance["kind"] == "user-uploaded-archive":
                if (provenance["commit"] is not None or not _matches(DIGEST, provenance["archiveSha256"])
                        or component["sourceScope"] != "complete-archive" or component["sourceRef"] is not None):
                    raise EvidenceError("INVALID_ARCHIVE_PROVENANCE")
            else:
                raise EvidenceError("INVALID_OBSERVED_PROVENANCE")
            if not _matches(DIGEST, component["manifestSha256"]):
                raise EvidenceError("INVALID_SOURCE_EVIDENCE_REFERENCE")
            if not _matches(SHARED.PACKAGE_NAME, component["packageName"]) or len(component["packageName"]) > 214:
                raise EvidenceError("INVALID_PACKAGE_NAME")
            if not _exact_semver(component["observedVersion"]):
                raise EvidenceError("INVALID_EXACT_PACKAGE_VERSION")
            license_text = component["licenseDeclared"]
            if license_text is not None and not _matches(LICENSE_TEXT, license_text):
                raise EvidenceError("INVALID_LICENSE_DECLARATION")
        else:
            raise EvidenceError("INVALID_SOURCE_STATUS")
    # Exact scope keeps the controller and unavailable UI visible instead of
    # silently shrinking the product under review when a source cannot be read.
    if seen != COMPONENT_IDS:
        raise EvidenceError("INCOMPLETE_COMPONENT_SCOPE")


def _properties(values):
    return [{"name": key, "value": value} for key, value in sorted(values.items())]


def prepare(inventory_path: Path):
    if ".." in inventory_path.parts:
        raise EvidenceError("INPUT_PARENT_TRAVERSAL")
    inventory, raw = SHARED.read_json(inventory_path)
    validate_inventory(inventory)
    document = _build_document(inventory, raw)
    validate_document(document, inventory, raw)
    return document


def _build_document(inventory, raw):
    missing = sorted(c["id"] for c in inventory["components"] if c["sourceStatus"] == "access-unresolved")
    selected = sorted(c["id"] for c in inventory["components"] if c["sourceScope"] == "selected-files")
    components = []
    for source in sorted(inventory["components"], key=lambda c: c["id"]):
        if source["sourceStatus"] != "source-observed":
            continue
        properties = {
            "eos:source:component-id": source["id"],
            "eos:source:module-id": source["moduleId"],
            "eos:source:scope": source["sourceScope"],
            "eos:source:manifest-sha256": source["manifestSha256"],
            "eos:source:manifest-hash-scope": "package.json-only-not-package-artifact",
            "eos:source:review-document": source["reviewDocument"],
            "eos:source:license-verified": "false",
            "eos:source:installed-version": "not-observed",
            "eos:source:approved": "false",
        }
        provenance = source["provenance"]
        properties["eos:source:provenance-kind"] = provenance["kind"]
        if provenance["kind"] == "git-commit":
            properties["eos:source:git-commit"] = provenance["commit"]
            properties["eos:source:remote-commit-availability"] = "unverified-by-generator"
            source_identity = provenance["commit"]
        else:
            # The supplied archive is the evidence object. Its declared upstream
            # URL is not a verified VCS origin and must not create a fake Git ref.
            properties["eos:source:archive-sha256"] = provenance["archiveSha256"]
            properties["eos:source:archive-hash-scope"] = "original-uploaded-zip"
            properties["eos:source:repository-declared"] = source["repository"]
            properties["eos:source:repository-origin-verified"] = "false"
            source_identity = "archive-sha256:" + provenance["archiveSha256"]
        if source["sourceRef"] is not None:
            properties["eos:source:ref-description"] = source["sourceRef"]
        if source["licenseDeclared"] is not None:
            properties["eos:source:license-declared"] = source["licenseDeclared"]
        component = {
            "type": "application" if source["id"] == "eos-installer" else "library",
            "bom-ref": "urn:nexowatt:eos:source:" + source["id"] + ":" + source_identity,
            "name": source["packageName"], "version": source["observedVersion"],
            "description": "Source manifest observation only; no built or installed artifact verified.",
            "properties": _properties(properties),
        }
        if provenance["kind"] == "git-commit":
            # A recorded local commit need not exist in the declared remote.
            # Keep origin and commit separate; never invent a reachable tree URL.
            component["externalReferences"] = [{
                "type": "vcs", "url": source["repository"],
                "comment": "Declared VCS origin; commit availability is not verified by this generator.",
            }]
        components.append(component)
    properties = {
        "eos:sbom:scope": "declared-component-source-observations-only",
        "eos:sbom:completeness": "partial",
        "eos:sbom:dependency-resolution": "not-performed",
        "eos:sbom:vulnerability-scan": "not-performed",
        "eos:sbom:source-authenticity-verification": "not-performed-by-generator",
        "eos:sbom:unobserved-component-ids": json.dumps(missing, separators=(",", ":")),
        "eos:sbom:selected-files-component-ids": json.dumps(selected, separators=(",", ":")),
        "eos:sbom:missing-runtime-scopes": "nodejs,operating-system,firmware,resolved-dependencies,device-inventory",
        "eos:source:inventory-sha256": hashlib.sha256(raw).hexdigest(),
        "eos:source:inventory-date": inventory["date"],
        "eos:source:architecture-base-commit": inventory["baseCommit"],
        "eos:product:release-approved": "false",
        "eos:product:runtime-integrated": "false",
        "eos:product:installed-inventory-verified": "false",
    }
    reference = "urn:nexowatt:eos:component-source-observations"
    document = {
        "$schema": "http://cyclonedx.org/schema/bom-1.7.schema.json",
        "bomFormat": "CycloneDX", "specVersion": "1.7", "version": 1,
        "metadata": {
            "lifecycles": [{"phase": "pre-build"}],
            "tools": {"components": [{"type": "application", "name": "nexowatt-eos-component-sources", "version": VERSION}]},
            "component": {"type": "application", "bom-ref": reference,
                          "name": "NexoWatt EOS component source observations",
                          "description": "Incomplete development evidence, not a product release or operational inventory."},
            "properties": _properties(properties),
        },
        "components": components,
        "compositions": [{"aggregate": "incomplete", "assemblies": [reference]}],
    }
    return document


def validate_document(document, inventory, raw):
    """Schema validation is not an evidence check: also require exact source scope.

    The document must match the bounded, source-only catalogue interpretation.
    Neither this equality check nor schema validation authenticates that catalogue.
    """
    validate_inventory(inventory)
    if next(SHARED.schema_validator().iter_errors(document), None) is not None:
        raise EvidenceError("INVALID_CYCLONEDX_1_7")
    if document != _build_document(inventory, raw):
        raise EvidenceError("UNSUPPORTED_SBOM_EVIDENCE_CLAIM")


class _Arguments(argparse.ArgumentParser):
    def error(self, message):
        # Paths and unexpected CLI values may contain secrets; do not repeat them.
        self.exit(2, "COMPONENT_SBOM_ARGUMENT_ERROR\n")


def main(argv=None):
    parser = _Arguments(description=__doc__)
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.check_only == bool(args.output):
            raise EvidenceError("OUTPUT_OR_CHECK_ONLY_REQUIRED")
        document = prepare(args.inventory)
        if args.check_only:
            print("PARTIAL_COMPONENT_SOURCE_INVENTORY_VALID")
        else:
            SHARED.write_new(args.output, document)
            print("PARTIAL_COMPONENT_SOURCE_SBOM_CREATED")
        return 0
    except (EvidenceError, OSError, ValueError, TypeError, RecursionError):
        print("COMPONENT_SOURCE_SBOM_REJECTED", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
