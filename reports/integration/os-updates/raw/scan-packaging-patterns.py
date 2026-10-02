#!/usr/bin/env python3
"""Bounded, read-only repository scan; emits paths/rules, never matched bytes.

Run from the repository root with Python 3. No packages, imports from the
application, archive extraction, network access, or bytecode caches are used.
Known unchanged archives reuse their explicitly pinned expanded-content review.
Any changed/new archive is a review blocker, not silently accepted.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[4]
OUTPUT = "reports/integration/os-updates/packaging-pattern-review.json"
PRIOR = "reports/integration/debian13/packaging-pattern-review.json"
PRIOR_SHA256 = "cbdeadfcbe5c07adcf4949a568ebeb71c2f0523468460cd0afd49ca64d2bf2f8"
MAXIMUM = 128 * 1024 * 1024
EXCLUDED = {
    OUTPUT,
    "reports/integration/os-updates/repository-files.sha256.json",
    "reports/integration/os-updates/verification-summary.json",
}
RULES = {
    "complete_private_pem": re.compile(
        rb"-----BEGIN (?P<label>(?:RSA |EC |DSA |ENCRYPTED |OPENSSH )?PRIVATE KEY)-----"
        rb"[\s\S]{1,32768}?-----END (?P=label)-----"
    ),
    "github_token": re.compile(rb"\b(?:gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{40,255})\b"),
    "aws_access_key": re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "license_token": re.compile(rb"\b(?:NWL[0-9]|NW1)\.[A-Za-z0-9_-]{16,32768}\.[A-Za-z0-9_-]{16,4096}\b"),
    "jwt_token": re.compile(rb"\beyJ[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,8192}\.[A-Za-z0-9_-]{16,2048}\b"),
}
ARCHIVE_SUFFIXES = (".tgz", ".tar", ".tar.gz", ".tar.xz", ".zip", ".gz", ".xz", ".bz2", ".7z", ".deb")
SENSITIVE_SUFFIXES = {".key", ".pem", ".env", ".sqlite", ".db", ".p12", ".pfx", ".jks", ".pcap"}
PUBLIC_FILE = "delivery/test-pi-0.2.0-test.1/release-public.pem"
PUBLIC_FILE_SHA256 = "e4e2465af8ae947574804f42c5ed17072ada8831b9839876f188c0e7c4c08cbe"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def timestamp():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def inventory():
    raw = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT
    )
    return sorted(set(os.fsdecode(item) for item in raw.split(b"\0") if item) - EXCLUDED)


def read_regular(name):
    parts = Path(name).parts
    if Path(name).is_absolute() or ".." in parts:
        raise ValueError("UNSAFE_REPOSITORY_PATH")
    parent = ROOT
    for part in parts[:-1]:
        parent = parent / part
        if parent.is_symlink():
            raise ValueError("SYMLINK_PARENT")
    fd = os.open(ROOT / name, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode):
            raise ValueError("NONREGULAR_FILE")
        if before.st_size > MAXIMUM:
            raise ValueError("FILE_EXCEEDS_128MIB")
        with os.fdopen(fd, "rb", closefd=False) as stream:
            data = stream.read(MAXIMUM + 1)
        after = os.fstat(fd)
        if len(data) > MAXIMUM:
            raise ValueError("FILE_EXCEEDS_128MIB")
        raced = (before.st_size, before.st_mtime_ns, before.st_ctime_ns) != (
            after.st_size, after.st_mtime_ns, after.st_ctime_ns
        )
        return data, {
            "path": name, "sha256": digest(data), "bytes": len(data),
            "mode": oct(stat.S_IMODE(after.st_mode)), "changedDuringRead": raced,
        }
    finally:
        os.close(fd)


def error_row(name, error):
    return {"path": name, "error": str(error) if isinstance(error, ValueError) else type(error).__name__}


def self_check_rules():
    # Synthetic in-memory strings only; they are never persisted or printed.
    # This validates recognition, not cryptographic validity or every secret form.
    samples = {
        "complete_private_pem": (b"-----BEGIN " + b"PRIVATE KEY-----\nAAAA\n-----END " + b"PRIVATE KEY-----", b"-----BEGIN " + b"PRIVATE KEY-----\nAAAA"),
        "github_token": (b"gh" + b"p_" + b"A" * 36, b"gh" + b"p_short"),
        "aws_access_key": (b"AK" + b"IA" + b"A" * 16, b"AK" + b"IAshort"),
        "license_token": (b"NWL" + b"2." + b"A" * 20 + b"." + b"B" * 32, b"NWL" + b"2.short.short"),
        "jwt_token": (b"ey" + b"J" + b"A" * 12 + b"." + b"B" * 12 + b"." + b"C" * 24, b"ey" + b"Jshort.short"),
    }
    results = []
    for rule, (positive, negative) in samples.items():
        good = bool(RULES[rule].search(positive)) and not RULES[rule].search(negative)
        results.append({"rule": rule, "positiveAndNegativePassed": bool(good)})
    if not all(row["positiveAndNegativePassed"] for row in results):
        raise ValueError("SCANNER_RULE_SELF_CHECK_FAILED")
    return results


def main():
    started = timestamp()
    self_checks = self_check_rules()
    prior_data, _ = read_regular(PRIOR)
    if digest(prior_data) != PRIOR_SHA256:
        raise ValueError("PRIOR_REVIEW_INTEGRITY_MISMATCH")
    prior = json.loads(prior_data)
    known_archives = {row["path"]: row for row in prior["archives"]}
    first_names = inventory()
    records, hits, errors, archives, unexpected = [], [], [], [], []
    first = {}
    for name in first_names:
        try:
            data, row = read_regular(name)
            records.append(row)
            first[name] = row
            if int(row["mode"], 8) & 0o6002:
                errors.append({"path": name, "error": "SETID_OR_WORLD_WRITABLE_MODE"})
            for rule, pattern in RULES.items():
                if pattern.search(data):
                    hits.append({"path": name, "rule": rule})
            if name.lower().endswith(ARCHIVE_SUFFIXES):
                previous = known_archives.get(name)
                if previous and row["sha256"] == previous["sha256"]:
                    archives.append({**previous, "review": "reused-hash-identical-expanded-content-review",
                                     "expandedContentsRescannedNow": False, "rawBytesPatternScannedNow": True})
                else:
                    archives.append({"path": name, "sha256": row["sha256"], "review": "NEW_OR_CHANGED_ARCHIVE_REQUIRES_EXPANDED_REVIEW"})
                    errors.append({"path": name, "error": "ARCHIVE_REVIEW_REQUIRED"})
            if Path(name).suffix.lower() in SENSITIVE_SUFFIXES:
                approved = name == PUBLIC_FILE and row["sha256"] == PUBLIC_FILE_SHA256
                unexpected.append({"path": name, "sha256": row["sha256"],
                                   "classification": "known-public-release-verification-key" if approved else "requires-file-review"})
                if not approved:
                    errors.append({"path": name, "error": "SENSITIVE_FILE_REVIEW_REQUIRED"})
            if "__pycache__" in Path(name).parts or name.endswith((".pyc", ".pyo")):
                errors.append({"path": name, "error": "UNEXPECTED_PYTHON_BYTECODE"})
        except (OSError, ValueError) as error:
            errors.append(error_row(name, error))

    # Snapshot again: any named, byte, or mode difference is a final-delta gate.
    last_names = inventory()
    changed = []
    for name in sorted(set(first_names) & set(last_names)):
        try:
            _, final = read_regular(name)
            previous = first.get(name)
            if not previous or any(previous[key] != final[key] for key in ("sha256", "mode", "bytes")) or previous["changedDuringRead"] or final["changedDuringRead"]:
                changed.append({"path": name, "before": previous, "after": final})
        except (OSError, ValueError) as error:
            changed.append(error_row(name, error))
    added = sorted(set(last_names) - set(first_names))
    removed = sorted(set(first_names) - set(last_names))
    reused_paths = {row["path"] for row in archives if row.get("expandedContentsRescannedNow") is False}
    reused_hits = [row for row in prior["hits"] if row["path"].split("!", 1)[0] in reused_paths]
    reused_reviews = [row for row in prior["hitReview"] if row["path"].split("!", 1)[0] in reused_paths]
    reviewed = {row["path"] for row in reused_reviews if row.get("classification") == "public-npm-manual-example-not-a-parsable-private-key"}
    unresolved = len(hits) + sum(row["path"] not in reviewed for row in reused_hits)
    status = "PASS_BOUNDED_PATTERN_REVIEW" if not (unresolved or errors or changed or added or removed) else "REVIEW_REQUIRED"
    report = {
        "schemaVersion": 1, "kind": "bounded-repository-secret-pattern-and-file-review",
        "startedAt": started, "completedAt": timestamp(), "status": status,
        "scope": "All git-tracked plus nonignored new files, including scanner source, UI tests and screenshots; eight hash-identical archives reuse the pinned prior expanded-content review.",
        "command": "python3 reports/integration/os-updates/raw/scan-packaging-patterns.py",
        "maximumFileBytes": MAXIMUM, "rules": list(RULES),
        "inMemoryRuleSelfChecks": self_checks,
        "filesScanned": len(records), "bytesScanned": sum(row["bytes"] for row in records),
        "priorReview": {"path": PRIOR, "sha256": PRIOR_SHA256},
        "hits": hits, "reusedExpandedArchiveHits": reused_hits,
        "reusedHitReview": reused_reviews, "unresolvedHits": unresolved,
        "errors": errors, "archives": archives, "sensitiveFilenameReview": unexpected,
        "excludedAdditiveMetadata": sorted(EXCLUDED),
        "inventoryBeforeSha256": digest("\n".join(first_names).encode()),
        "inventoryAfterSha256": digest("\n".join(last_names).encode()),
        "finalDeltaRequired": {"added": added, "removed": removed, "changed": changed},
        "files": records,
        "limitations": [
            "Bounded patterns do not prove absence of all credentials; no entropy, semantic, OCR, malware or vulnerability scan is claimed.",
            "Binary image bytes are pattern-scanned, not visually/OCR inspected for secrets.",
            "Private-PEM body is bounded to 32768 bytes; token length and recognized formats are deliberately bounded in scanner source.",
            "Archive member/path/type and known manual-example classification are reused only for exact SHA256-identical archives; expanded contents were not rescanned now.",
            "Ignored files and data outside the repository are excluded. No private signing key outside the repository is accessed.",
            "Own report, final repository manifest and final verification summary require additive metadata review after generation; final ZIP/index byte integrity is separate.",
        ],
    }
    target = ROOT / OUTPUT
    with target.open("w", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps({key: report[key] for key in ("status", "filesScanned", "bytesScanned", "unresolvedHits", "errors", "hits", "finalDeltaRequired")}))
    return 0 if status == "PASS_BOUNDED_PATTERN_REVIEW" else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(json.dumps({"status": "SCANNER_FAILED", "error": str(error) if isinstance(error, ValueError) else type(error).__name__}))
        sys.exit(2)
