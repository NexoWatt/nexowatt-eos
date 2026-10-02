#!/usr/bin/env python3
"""Bind npm's actual-tree CycloneDX to a locked, installed test runtime.

No packages, hooks or network requests execute. The signed release file table must
cover artifact bytes separately: npm SRI values describe upstream archives, while
the manifest hashes below describe local package.json files only. This inventory
never represents an installed target device or a full operating system SBOM.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote

MAX_JSON = 32 * 1024 * 1024
NAME = r"(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*"
PACKAGE_PATH = re.compile(r"node_modules/" + NAME + r"(?:/node_modules/" + NAME + r")*\Z")

# Reviewed transport derivative; the parity regression binds these values to
# runtime/controller-profile/websocket-bound.cjs. Archive hashes remain only in
# pedigree.ancestors after this exact file has been changed locally.
WEBSOCKET_TRANSFORM = {
    "package": "@iobroker/ws-server", "version": "4.5.1",
    "file": "node_modules/@iobroker/ws-server/build/index.js",
    "original": "ad8e5d744cdc85ed2670312c528a4222ce3bc4872a8cfb7abe09b113b35096ae",
    "output": "f88d1bcf2344c1c3e404b47abc8f03fceffc8b236ca97f008bd2bbac635ba9e0",
}
ADMIN_PROFILE = {"package": "iobroker.eos-admin", "version": "7.10.11", "main": "build/main.js"}
PROFILE_PATH = "node_modules/iobroker.js-controller/eos-test-profile.json"


class EvidenceError(ValueError):
    """Bounded error identifiers; never echo package content or secrets."""


def _unique(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise EvidenceError("DUPLICATE_JSON_KEY")
        out[key] = value
    return out


def read_json(path):
    path = Path(path)
    if path.is_symlink() or not path.is_file():
        raise EvidenceError("INPUT_NOT_REGULAR")
    if path.stat().st_size > MAX_JSON:
        raise EvidenceError("INPUT_TOO_LARGE")
    raw = path.read_bytes()
    try:
        data = json.loads(raw, object_pairs_hook=_unique,
                          parse_constant=lambda _: (_ for _ in ()).throw(EvidenceError("NONFINITE_JSON")))
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise EvidenceError("INVALID_JSON") from exc
    if not isinstance(data, dict):
        raise EvidenceError("EXPECTED_OBJECT")
    return data, hashlib.sha256(raw).hexdigest()


def bind_inventory(app, npm_sbom, transform_evidence=None):
    """Validate lock/installed identities and dependency references, then bind evidence.

    Structural checks do not claim complete CycloneDX JSON-schema validation.
    Run schema validation independently against the corresponding spec version.
    """
    app = Path(app).resolve(strict=True)
    package, package_hash = read_json(app / "package.json")
    lock, lock_hash = read_json(app / "package-lock.json")
    bom, bom_hash = read_json(npm_sbom)
    if lock.get("lockfileVersion") not in (2, 3) or not isinstance(lock.get("packages"), dict):
        raise EvidenceError("UNSUPPORTED_LOCKFILE")
    root_lock = lock["packages"].get("")
    if not isinstance(root_lock, dict) or any(root_lock.get(k) != package.get(k) for k in ("name", "version")):
        raise EvidenceError("ROOT_IDENTITY_MISMATCH")
    if not all(isinstance(package.get(k), str) and package[k] for k in ("name", "version")):
        raise EvidenceError("INVALID_ROOT_IDENTITY")
    if bom.get("bomFormat") != "CycloneDX" or bom.get("specVersion") != "1.5":
        raise EvidenceError("UNSUPPORTED_SBOM_FORMAT")
    metadata = bom.get("metadata", {})
    if not isinstance(metadata, dict) or not isinstance(metadata.get("component"), dict):
        raise EvidenceError("INVALID_SBOM_METADATA")
    root_component = metadata["component"]
    if root_component.get("version") != package["version"]:
        raise EvidenceError("SBOM_ROOT_VERSION_MISMATCH")
    root_ref = root_component.get("bom-ref")
    if root_ref != package["name"] + "@" + package["version"]:
        raise EvidenceError("SBOM_ROOT_REFERENCE_MISMATCH")
    components = bom.get("components")
    if not isinstance(components, list) or not isinstance(root_ref, str):
        raise EvidenceError("INVALID_SBOM_COMPONENTS")
    refs = {root_ref}
    identities = set()
    aliases = {}
    for relative, entry in lock["packages"].items():
        if relative and isinstance(entry, dict) and isinstance(entry.get("name"), str):
            if not re.fullmatch(NAME, entry["name"]):
                raise EvidenceError("PACKAGE_ALIAS_IDENTITY_MISMATCH")
            label = relative.rsplit("node_modules/", 1)[-1]
            version = entry.get("version")
            if isinstance(version, str) and entry["name"] != label:
                aliases.setdefault((label, version), set()).add(entry["name"])
    for c in components:
        if not isinstance(c, dict) or not all(isinstance(c.get(k), str) and c[k] for k in ("name", "version", "bom-ref")):
            raise EvidenceError("INVALID_SBOM_COMPONENT")
        if c["bom-ref"] in refs:
            raise EvidenceError("DUPLICATE_SBOM_REFERENCE")
        # npm 11 sometimes labels a solely aliased component by its installation
        # name while keeping the real name in bom-ref and purl. Reconcile only
        # when both identifiers and an explicit lock entry agree. The installed
        # manifest is checked below; arbitrary name substitution is forbidden.
        alias_names = aliases.get((c["name"], c["version"]), set())
        if alias_names:
            if len(alias_names) != 1:
                raise EvidenceError("AMBIGUOUS_SBOM_ALIAS")
            real_name = next(iter(alias_names))
            if c["bom-ref"] != real_name + "@" + c["version"] or \
                    not isinstance(c.get("purl"), str) or unquote(c["purl"]) != "pkg:npm/" + real_name + "@" + c["version"]:
                raise EvidenceError("SBOM_ALIAS_REFERENCE_MISMATCH")
            c.setdefault("properties", []).append({"name": "eos:npm-original-alias-label", "value": c["name"]})
            c["name"] = real_name
        refs.add(c["bom-ref"])
        identities.add((c["name"], c["version"]))
    dependencies = bom.get("dependencies")
    if not isinstance(dependencies, list):
        raise EvidenceError("MISSING_DEPENDENCY_GRAPH")
    for d in dependencies:
        if not isinstance(d, dict) or not isinstance(d.get("ref"), str) or d["ref"] not in refs or not isinstance(d.get("dependsOn"), list):
            raise EvidenceError("INVALID_DEPENDENCY_GRAPH")
        if any(not isinstance(r, str) or r not in refs for r in d["dependsOn"]):
            raise EvidenceError("DANGLING_DEPENDENCY_REFERENCE")
    installed, omitted = [], []
    for relative, entry in sorted(lock["packages"].items()):
        if relative == "":
            continue
        if not isinstance(entry, dict) or not PACKAGE_PATH.fullmatch(relative) or entry.get("link"):
            raise EvidenceError("UNSUPPORTED_PACKAGE_PATH_OR_LINK")
        directory = app / relative
        # For the offline, quiescent build tree, reject every symlink component.
        cursor = app
        for part in Path(relative).parts:
            cursor /= part
            if cursor.is_symlink():
                raise EvidenceError("SYMLINK_PACKAGE_PATH")
        if not directory.exists():
            if entry.get("optional") is not True:
                raise EvidenceError("REQUIRED_PACKAGE_NOT_INSTALLED")
            omitted.append(relative)
            continue
        manifest, digest = read_json(directory / "package.json")
        if not all(isinstance(manifest.get(k), str) and manifest[k] for k in ("name", "version")):
            raise EvidenceError("INVALID_INSTALLED_MANIFEST_IDENTITY")
        identity = (manifest["name"], manifest["version"])
        if identity[1] != entry.get("version") or identity not in identities:
            raise EvidenceError("INSTALLED_PACKAGE_SBOM_LOCK_MISMATCH")
        installed_as = relative.rsplit("node_modules/", 1)[1]
        # npm aliases retain the real package identity in lock entry.name.
        # Never infer it from the directory or permit an unexplained mismatch.
        expected_name = entry.get("name", installed_as)
        if not isinstance(expected_name, str) or not re.fullmatch(NAME, expected_name) or identity[0] != expected_name:
            raise EvidenceError("PACKAGE_ALIAS_IDENTITY_MISMATCH")
        installed.append({"path": relative, "name": identity[0], "version": identity[1],
                          "installedAs": installed_as, "alias": installed_as != identity[0],
                          "manifestSha256": digest, "archiveIntegrity": entry.get("integrity"),
                          "archiveSource": "local-build-artifact" if str(entry.get("resolved", "")).startswith("file:") else
                                           "resolved-external-artifact" if entry.get("resolved") else "unspecified",
                          "upstreamArchiveIntegrity": None if str(entry.get("resolved", "")).startswith("file:") else entry.get("integrity")})
    if identities != {(r["name"], r["version"]) for r in installed}:
        raise EvidenceError("SBOM_COMPONENT_NOT_INSTALLED")
    props = {"eos:sbom:scope": "installed-test-runtime-npm-tree",
             "eos:sbom:package-lock-sha256": lock_hash,
             "eos:sbom:package-json-sha256": package_hash,
             "eos:sbom:input-npm-sbom-sha256": bom_hash,
             "eos:sbom:target-device-observed": "false",
             "eos:sbom:os-node-firmware-coverage": "not-included",
             "eos:sbom:product-release-approved": "false"}
    metadata.setdefault("properties", []).extend({"name": k, "value": v} for k, v in props.items())
    # npm 11 reports the directory basename for a private root; use package identity.
    root_component["name"] = package["name"]
    transform_binding = None
    if transform_evidence is not None:
        evidence, evidence_hash = read_json(transform_evidence)
        files = evidence.get("files")
        if evidence.get("schemaVersion") != 1 or evidence.get("kind") != "eos-controller-transform-evidence" or \
                evidence.get("controllerVersion") != "7.2.2" or evidence.get("productionApproved") is not False or \
                not isinstance(files, list) or not 1 <= len(files) <= 100:
            raise EvidenceError("INVALID_TRANSFORM_EVIDENCE")
        affected = set()
        transformed_files = {}
        seen_paths = set()
        for record in files:
            if not isinstance(record, dict) or not isinstance(record.get("relativePath"), str):
                raise EvidenceError("INVALID_TRANSFORM_FILE")
            relative = record["relativePath"]
            if relative in seen_paths or "\\" in relative or any(p in ("", ".", "..") for p in relative.split("/")) or \
                    not isinstance(record.get("sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", record["sha256"]):
                raise EvidenceError("INVALID_TRANSFORM_FILE")
            seen_paths.add(relative)
            owner = next((name for name in ("iobroker.js-controller", "@iobroker/js-controller-cli")
                          if relative.startswith("node_modules/" + name + "/")), None)
            if relative == WEBSOCKET_TRANSFORM["file"]:
                if record.get("originalSha256") != WEBSOCKET_TRANSFORM["original"] or \
                        record["sha256"] != WEBSOCKET_TRANSFORM["output"] or \
                        not any(row["path"] == "node_modules/" + WEBSOCKET_TRANSFORM["package"] and
                                row["name"] == WEBSOCKET_TRANSFORM["package"] and row["version"] == WEBSOCKET_TRANSFORM["version"]
                                for row in installed):
                    raise EvidenceError("WEBSOCKET_TRANSFORM_BINDING")
                owner = WEBSOCKET_TRANSFORM["package"]
            if owner is None:
                raise EvidenceError("UNKNOWN_TRANSFORM_COMPONENT")
            file = app / relative
            cursor = app
            for part in Path(relative).parts:
                cursor /= part
                if cursor.is_symlink():
                    raise EvidenceError("SYMLINK_TRANSFORM_PATH")
            if not file.is_file() or file.stat().st_size > MAX_JSON or hashlib.sha256(file.read_bytes()).hexdigest() != record["sha256"]:
                raise EvidenceError("TRANSFORM_FILE_HASH_MISMATCH")
            affected.add(owner)
            transformed_files.setdefault(owner, []).append({"relativePath": relative, "sha256": record["sha256"]})
        required = {"iobroker.js-controller", "@iobroker/js-controller-cli"}
        profile_file = app / PROFILE_PATH
        if profile_file.exists():
            profile, _ = read_json(profile_file)
            adapters = profile.get("adapters")
            if not isinstance(adapters, list) or len(adapters) > 128 or any(not isinstance(row, dict) for row in adapters):
                raise EvidenceError("INVALID_TRANSFORM_PROFILE")
            admin_rows = [row for row in adapters if row.get("package") == ADMIN_PROFILE["package"]]
            if admin_rows:
                if admin_rows != [ADMIN_PROFILE] or PROFILE_PATH not in seen_paths or \
                        not any(row["path"] == "node_modules/" + ADMIN_PROFILE["package"] and
                                row["name"] == ADMIN_PROFILE["package"] and row["version"] == ADMIN_PROFILE["version"]
                                for row in installed):
                    raise EvidenceError("WEBSOCKET_TRANSFORM_ADMIN_PROFILE")
                required.add(WEBSOCKET_TRANSFORM["package"])
        if affected != required:
            raise EvidenceError("INCOMPLETE_TRANSFORM_COMPONENT_SCOPE")
        for component in components:
            if component["name"] in affected and (component["name"] != WEBSOCKET_TRANSFORM["package"] or
                                                     component["version"] == WEBSOCKET_TRANSFORM["version"]):
                ancestor = {k: component[k] for k in ("type", "name", "version", "purl", "hashes") if k in component}
                component.pop("hashes", None)
                component["modified"] = True
                component["pedigree"] = {"ancestors": [ancestor], "notes": "Locally transformed EOS test profile; ancestor hashes describe upstream npm archives only."}
                # Bind the local derivative to exact per-component transform
                # rows, independent of a filesystem-specific evidence filename.
                table = sorted(transformed_files[component["name"]], key=lambda row: row["relativePath"])
                table_hash = hashlib.sha256(json.dumps(table, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
                component.setdefault("properties", []).extend([
                    {"name": "eos:transform:evidence", "value": "reports/test-base/controller-profile-transform.json"},
                    {"name": "eos:transform:evidence-sha256", "value": evidence_hash},
                    {"name": "eos:transform:file-table-sha256", "value": table_hash},
                    {"name": "eos:transform:local-artifact-integrity", "value": "Bound by signed release file table; no local package-archive hash claimed"},
                ])
        if not affected <= {c["name"] for c in components}:
            raise EvidenceError("TRANSFORM_COMPONENT_NOT_IN_SBOM")
        transform_binding = {"evidenceSha256": evidence_hash, "modifiedComponents": sorted(affected),
                             "localFileHashesVerified": len(files), "upstreamArchiveHashesScope": "pedigree.ancestors"}
    coverage = {"schemaVersion": 1, "kind": "eos-installed-test-runtime-sbom-binding",
                "packageLockSha256": lock_hash, "packageManifestSha256": package_hash,
                "npmSbomSha256": bom_hash, "installedPackageCount": len(installed),
                "uniqueComponentCount": len(identities), "omittedOptionalPaths": omitted,
                "installedPackages": installed, "targetDeviceObserved": False,
                "productReleaseApproved": False, "fullJsonSchemaValidated": False,
                "missingScope": ["os-packages", "node-executable", "firmware", "device-configuration",
                                 "separately-distributed-adapters", "first-party-tools-and-bootstrap-code-covered-by-release-file-table"],
                "transformation": transform_binding}
    return bom, coverage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, required=True)
    parser.add_argument("--npm-sbom", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--coverage", type=Path, required=True)
    parser.add_argument("--transform-evidence", type=Path)
    args = parser.parse_args()
    try:
        inputs = {(args.app / "package.json").resolve(), (args.app / "package-lock.json").resolve(), args.npm_sbom.resolve()}
        if args.transform_evidence is not None:
            inputs.add(args.transform_evidence.resolve())
        outputs = [args.out.resolve(), args.coverage.resolve()]
        if len(set(outputs)) != 2 or any(p in inputs for p in outputs):
            raise EvidenceError("OUTPUT_INPUT_COLLISION")
        bom, coverage = bind_inventory(args.app, args.npm_sbom, args.transform_evidence)
        for path, data in ((args.out, bom), (args.coverage, coverage)):
            if path.is_symlink():
                raise EvidenceError("SYMLINK_OUTPUT")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        print(json.dumps({"status": "verified", "installedPackages": coverage["installedPackageCount"],
                          "uniqueComponents": coverage["uniqueComponentCount"]}))
        return 0
    except (EvidenceError, OSError) as exc:
        print(str(exc) if isinstance(exc, EvidenceError) else "FILESYSTEM_ERROR", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
