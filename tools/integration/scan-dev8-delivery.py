#!/usr/bin/env python3
"""Bounded secret-pattern/delta review. Inherits hash-identical dev7 review only."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'reports/integration/adapter-channel/delivery-pattern-review.json'
PATTERNS = {
    'private-key': re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----'),
    'github-token': re.compile(rb'\b(?:gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{40,255})\b'),
    'aws-key': re.compile(rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
    'license-token': re.compile(rb'\b(?:NWL[0-9]|NW1)\.[A-Za-z0-9_-]{16,32768}\.[A-Za-z0-9_-]{16,4096}\b'),
    'jwt-token': re.compile(rb'\beyJ[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,8192}\.[A-Za-z0-9_-]{16,2048}\b'),
}
def sha(data): return hashlib.sha256(data).hexdigest()
def main(baseline):
    manifest = json.loads(baseline.read_text()); known = {row['path']: row['sha256'] for row in manifest['files']}
    prior_path = 'reports/integration/postgresql-install/packaging-pattern-review.json'
    prior_bytes = (ROOT / prior_path).read_bytes()
    if sha(prior_bytes) != known[prior_path] or json.loads(prior_bytes)['passed'] is not True:
        raise ValueError('BASELINE_REVIEW_MISMATCH')
    rows, hits, errors, archives = [], [], [], []; inherited = 0; scanned = 0
    def inspect(name, data):
        for rule, pattern in PATTERNS.items():
            if pattern.search(data): hits.append({'path': name, 'rule': rule})
    for file in sorted(ROOT.rglob('*')):
        relative = file.relative_to(ROOT).as_posix()
        if '.git' in file.relative_to(ROOT).parts or file == OUTPUT or file.is_dir(): continue
        st = file.lstat()
        if not file.is_file() or file.is_symlink() or st.st_size > 128 * 1024 * 1024 or st.st_mode & 0o6022:
            errors.append({'path': relative, 'reason': 'file type, size or mode'}); continue
        if '__pycache__' in file.parts or file.suffix == '.pyc':
            errors.append({'path': relative, 'reason': 'generated cache'}); continue
        data = file.read_bytes(); digest = sha(data); rows.append({'path': relative, 'sha256': digest, 'bytes': len(data)})
        if known.get(relative) == digest: inherited += 1; continue
        scanned += 1; inspect(relative, data)
        if file.name.endswith(('.tgz', '.tar.gz')):
            count = 0; total = 0
            with tarfile.open(file, 'r:gz') as archive:
                for member in archive:
                    if member.isdir(): continue
                    if not member.isfile() or member.size > 128 * 1024 * 1024 or PurePosixPath(member.name).is_absolute() or '..' in PurePosixPath(member.name).parts:
                        raise ValueError('NEW_ARCHIVE_ENTRY')
                    count += 1; total += member.size
                    if count > 60000 or total > 1024 ** 3: raise ValueError('NEW_ARCHIVE_BOUNDS')
                    payload = archive.extractfile(member).read(member.size + 1)
                    if len(payload) != member.size: raise ValueError('NEW_ARCHIVE_LENGTH')
                    inspect(relative + '!' + member.name, payload)
            archives.append({'path': relative, 'sha256': digest, 'expandedFiles': count, 'expandedBytes': total})
        elif file.name.endswith(('.zip', '.tar', '.xz', '.gz', '.deb')):
            errors.append({'path': relative, 'reason': 'new unsupported archive requires review'})
    result = {'schemaVersion': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(), 'sourceVersion': '0.2.0-dev.8',
              'baselineArchiveSha256': manifest['sha256'], 'baselineReview': prior_path, 'baselineReviewSha256': sha(prior_bytes),
              'hashIdenticalFilesInheritedFromPassedReview': inherited, 'changedOrNewFilesScanned': scanned, 'patterns': list(PATTERNS),
              'archivesExpanded': archives, 'hits': hits, 'errors': errors, 'passed': not hits and not errors,
              'fileTableSha256': sha(json.dumps(rows, sort_keys=True, separators=(',', ':')).encode()),
              'completeSecretDetectionClaimed': False, 'productVulnerabilityScan': False}
    OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ['passed', 'changedOrNewFilesScanned', 'hashIdenticalFilesInheritedFromPassedReview', 'hits', 'errors']}))
    return 0 if result['passed'] else 1
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--baseline', type=Path, required=True)
    raise SystemExit(main(parser.parse_args().baseline))
