#!/usr/bin/env python3
"""Offline, source-only CycloneDX preparation; never an installed product inventory.

Reads only root package.json and Git identity. Does not execute npm, fetch URLs,
read credentials/configuration, resolve packages, or claim a complete dependency
graph. See docs/security/SBOM_PIPELINE.md for the STRIDE model and limits.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
import sys
from urllib.parse import quote

from jsonschema import Draft7Validator, FormatChecker
from referencing import Registry, Resource

VERSION = "0.1.0"
MAX_JSON_BYTES = 1024 * 1024
SCHEMA_DIRECTORY = Path(__file__).parent / "vendor" / "cyclonedx-1.7"
PACKAGE_NAME = re.compile(r"(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*\Z")
SEMVER = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\Z")
SAFE_RANGE = re.compile(r"[0-9xX*^~<>=][0-9A-Za-zxX*^~<>=| .+\-]{0,199}\Z")
MISSING_SCOPES = [
    "resolved-direct-and-transitive-dependencies",
    "eos-admin-production-admin-7",
    "nexowatt-ui",
    "eos-devices",
    "nexowatt-backitup",
    "eebus",
    "js-controller",
    "nodejs-runtime",
    "operating-system-kernel-and-firmware",
    "deployed-device-inventory",
]


class EvidenceError(ValueError):
    """Controlled error; diagnostics must not include package data or secrets."""


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise EvidenceError("DUPLICATE_JSON_KEY")
        result[key] = value
    return result


def read_json(path: Path):
    """Bounded regular-file input, without following a final symlink."""
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        if not stat.S_ISREG(os.fstat(descriptor).st_mode):
            raise EvidenceError("INPUT_NOT_REGULAR")
        with os.fdopen(descriptor, "rb", closefd=False) as stream:
            data = stream.read(MAX_JSON_BYTES + 1)
        if len(data) > MAX_JSON_BYTES:
            raise EvidenceError("INPUT_TOO_LARGE")
        try:
            value = json.loads(data.decode("utf-8"), object_pairs_hook=unique_object,
                               parse_constant=lambda _: (_ for _ in ()).throw(EvidenceError("NONFINITE_JSON")))
        except (UnicodeError, json.JSONDecodeError, RecursionError) as error:
            raise EvidenceError("INVALID_JSON") from error
        if not isinstance(value, dict):
            raise EvidenceError("EXPECTED_JSON_OBJECT")
        return value, data
    finally:
        os.close(descriptor)


def schema_validator():
    """All schema refs resolve from pinned local files; no network retrieval."""
    manifest, _ = read_json(SCHEMA_DIRECTORY / "PROVENANCE.json")
    resources = []
    schema = None
    for entry in manifest["files"]:
        name = entry["path"]
        if Path(name).name != name:
            raise EvidenceError("INVALID_SCHEMA_MANIFEST")
        data = (SCHEMA_DIRECTORY / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise EvidenceError("SCHEMA_HASH_MISMATCH")
        if name.endswith(".json"):
            document = json.loads(data)
            resources.append((document["$id"], Resource.from_contents(document)))
            if name == "bom-1.7.schema.json":
                schema = document
    if schema is None:
        raise EvidenceError("MISSING_SCHEMA")
    registry = Registry().with_resources(resources)
    return Draft7Validator(schema, registry=registry, format_checker=FormatChecker())


def validate(document):
    """Official schema plus this generator's deliberately narrow evidence scope."""
    if next(schema_validator().iter_errors(document), None) is not None:
        raise EvidenceError("INVALID_CYCLONEDX_1_7")
    try:
        metadata = document["metadata"]
        props = {p["name"]: p["value"] for p in metadata["properties"]}
        if len(props) != len(metadata["properties"]):
            raise EvidenceError("DUPLICATE_METADATA_PROPERTY")
        source = metadata["component"]
        expected = {
            "eos:sbom:scope": "observed-root-package-json-only",
            "eos:sbom:completeness": "partial",
            "eos:sbom:dependency-resolution": "not-performed",
            "eos:sbom:vulnerability-scan": "not-performed",
        }
        if any(props.get(key) != value for key, value in expected.items()):
            raise EvidenceError("INVALID_SOURCE_SCOPE")
        if metadata["lifecycles"] != [{"phase": "pre-build"}]:
            raise EvidenceError("INVALID_SOURCE_SCOPE")
        if document["compositions"] != [{"aggregate": "incomplete", "assemblies": [source["bom-ref"]]}]:
            raise EvidenceError("INVALID_SOURCE_SCOPE")
        if any(key in document for key in ["dependencies", "services", "vulnerabilities", "declarations"]):
            raise EvidenceError("UNOBSERVED_INVENTORY")
        if len(document["components"]) != 1 or document["components"][0]["name"] != "package.json":
            raise EvidenceError("UNOBSERVED_INVENTORY")
        if document["components"][0]["type"] != "file":
            raise EvidenceError("UNOBSERVED_INVENTORY")
        digest = props.get("eos:source:package-json-sha256", "")
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise EvidenceError("INVALID_MANIFEST_HASH")
        if document["components"][0].get("hashes") != [{"alg": "SHA-256", "content": digest}]:
            raise EvidenceError("INCONSISTENT_MANIFEST_HASH")
        if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", props.get("eos:source:git-head", "")):
            raise EvidenceError("INVALID_GIT_COMMIT")
        if props.get("eos:source:manifest-matches-head") not in ("true", "false"):
            raise EvidenceError("INVALID_SOURCE_SCOPE")
        if props.get("eos:source:remaining-working-tree") != "not-inventoried":
            raise EvidenceError("INVALID_SOURCE_SCOPE")
    except (KeyError, TypeError, IndexError) as error:
        raise EvidenceError("INVALID_SOURCE_SCOPE") from error


def git_identity(repository: Path, digest: str):
    # Git read operations only: no shell, hooks, local commands or remote fetch.
    # Remove caller-controlled GIT_* settings, credential configuration, and
    # global config from these identity reads. Output never includes filenames.
    env = {"PATH": os.defpath, "LC_ALL": "C", "GIT_CONFIG_NOSYSTEM": "1",
           "GIT_CONFIG_GLOBAL": os.devnull, "GIT_OPTIONAL_LOCKS": "0"}
    def run(arguments):
        result = subprocess.run(["git", "--no-replace-objects", "-C", str(repository), *arguments],
                                env=env, capture_output=True, timeout=10, check=False)
        if result.returncode != 0:
            raise EvidenceError("GIT_IDENTITY_UNAVAILABLE")
        return result.stdout
    commit = run(["rev-parse", "--verify", "HEAD"]).decode("ascii").strip()
    if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", commit):
        raise EvidenceError("INVALID_GIT_COMMIT")
    # Do not use git status/diff: user-defined clean filters can execute during
    # worktree comparison. A raw committed blob read runs no package/filter code.
    blob = commit + ":package.json"
    blob_size = run(["cat-file", "-s", blob]).decode("ascii").strip()
    if not re.fullmatch(r"[0-9]{1,8}", blob_size) or int(blob_size) > MAX_JSON_BYTES:
        raise EvidenceError("COMMITTED_MANIFEST_TOO_LARGE")
    committed_manifest = run(["show", "--no-textconv", blob])
    return commit, hashlib.sha256(committed_manifest).hexdigest() == digest


def prepare(repository: Path):
    repository = repository.resolve(strict=True)
    package, raw = read_json(repository / "package.json")
    name, version = package.get("name"), package.get("version")
    if not isinstance(name, str) or len(name) > 214 or not PACKAGE_NAME.fullmatch(name):
        raise EvidenceError("INVALID_PACKAGE_NAME")
    if not isinstance(version, str) or len(version) > 128 or not SEMVER.fullmatch(version):
        raise EvidenceError("INVALID_PACKAGE_VERSION")
    digest = hashlib.sha256(raw).hexdigest()
    commit, manifest_matches_head = git_identity(repository, digest)
    reference = "pkg:npm/" + quote(name, safe="/") + "@" + quote(version, safe="")
    declarations = []
    for section in ["dependencies", "optionalDependencies", "devDependencies", "peerDependencies"]:
        entries = package.get(section, {})
        if not isinstance(entries, dict) or len(entries) > 5000:
            raise EvidenceError("INVALID_DEPENDENCY_DECLARATIONS")
        for dependency, specification in sorted(entries.items()):
            if not isinstance(dependency, str) or len(dependency) > 214 or not PACKAGE_NAME.fullmatch(dependency):
                raise EvidenceError("INVALID_DEPENDENCY_NAME")
            if not isinstance(specification, str) or len(specification) > 8192:
                raise EvidenceError("INVALID_DEPENDENCY_SPECIFICATION")
            safe = bool(SAFE_RANGE.fullmatch(specification))
            declarations.append({"name": dependency, "declarationType": section,
                                 "declaredRange": specification if safe else None,
                                 "status": "unresolved", "nonSemverValueRedacted": not safe})
    properties = {
        "eos:sbom:scope": "observed-root-package-json-only",
        "eos:sbom:completeness": "partial",
        "eos:sbom:dependency-resolution": "not-performed",
        "eos:sbom:vulnerability-scan": "not-performed",
        "eos:source:git-head": commit,
        "eos:source:manifest-matches-head": str(manifest_matches_head).lower(),
        "eos:source:remaining-working-tree": "not-inventoried",
        "eos:source:package-json-sha256": digest,
    }
    document = {
        "$schema": "http://cyclonedx.org/schema/bom-1.7.schema.json",
        "bomFormat": "CycloneDX", "specVersion": "1.7", "version": 1,
        "metadata": {
            "lifecycles": [{"phase": "pre-build"}],
            "tools": {"components": [{"type": "application", "name": "nexowatt-eos-source-sbom", "version": VERSION}]},
            "component": {"type": "application", "bom-ref": reference, "name": name, "version": version,
                          "purl": reference,
                          "description": "Observed installer source manifest; not a built, installed or complete EOS system."},
            "properties": [{"name": key, "value": value} for key, value in sorted(properties.items())],
        },
        "components": [{"type": "file", "bom-ref": "source-file:package.json", "name": "package.json",
                        "hashes": [{"alg": "SHA-256", "content": digest}]}],
        "compositions": [{"aggregate": "incomplete", "assemblies": [reference]}],
    }
    coverage = {
        "schemaVersion": 1, "generator": {"name": "nexowatt-eos-source-sbom", "version": VERSION},
        "sourceScope": "observed-root-package-json-only", "complete": False,
        "source": {"gitHead": commit, "manifestMatchesHead": manifest_matches_head,
                   "remainingWorkingTree": "not-inventoried", "packageJsonSha256": digest},
        "observedPackage": {"name": name, "version": version},
        "declaredButUnresolvedDependencies": declarations,
        "missingScopes": MISSING_SCOPES,
        "notPerformed": ["package-installation", "dependency-resolution", "vulnerability-scan", "license-verification", "runtime-discovery"],
        "note": "No dependency edge or resolved version is asserted from a package range. This is not the release or device SBOM.",
    }
    validate(document)
    return document, coverage


def write_new(path: Path, value):
    """Atomically publish a NEW file in an existing, symlink-free directory.

    Directory FDs bind path traversal; O_EXCL/hard-link publication refuses
    existing targets, including symlinks. No chmod/chown or elevated privileges.
    """
    absolute = Path(os.path.abspath(path))
    if ".." in path.parts:
        raise EvidenceError("OUTPUT_PARENT_TRAVERSAL")
    descriptor = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    temporary = None
    try:
        for part in absolute.parent.parts[1:]:
            next_descriptor = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = next_descriptor
        temporary = ".eos-sbom-" + secrets.token_hex(16)
        file_descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                                  0o600, dir_fd=descriptor)
        with os.fdopen(file_descriptor, "wb") as stream:
            stream.write((json.dumps(value, ensure_ascii=True, sort_keys=True, indent=2) + "\n").encode("utf-8"))
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, absolute.name, src_dir_fd=descriptor, dst_dir_fd=descriptor, follow_symlinks=False)
        os.fsync(descriptor)
    finally:
        if temporary is not None:
            os.unlink(temporary, dir_fd=descriptor)
        os.close(descriptor)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--coverage", type=Path)
    parser.add_argument("--validate", type=Path)
    args = parser.parse_args()
    try:
        if args.validate:
            if args.repo or args.output or args.coverage:
                raise EvidenceError("VALIDATE_ARGUMENT_CONFLICT")
            validate(read_json(args.validate)[0])
            print("SOURCE_SBOM_VALID")
        else:
            if not (args.repo and args.output and args.coverage):
                raise EvidenceError("REPO_OUTPUT_COVERAGE_REQUIRED")
            document, coverage = prepare(args.repo)
            write_new(args.coverage, coverage)
            write_new(args.output, document)
            print("PARTIAL_SOURCE_SBOM_CREATED")
        return 0
    except (EvidenceError, OSError, subprocess.SubprocessError, UnicodeError) as error:
        # Never echo untrusted package values, paths, Git stderr or raw schemas.
        print(str(error) if isinstance(error, EvidenceError) else "SBOM_IO_OR_GIT_ERROR", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
