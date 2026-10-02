#!/usr/bin/env python3
"""Bounded source and expanded test.2 archive pattern check; no matched bytes."""
import hashlib
import json
import re
import stat
import subprocess
import tarfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = 'reports/integration/postgresql-install/packaging-pattern-review.json'
PRIOR = 'reports/integration/debian13/packaging-pattern-review.json'
PRIOR_HASH = 'cbdeadfcbe5c07adcf4949a568ebeb71c2f0523468460cd0afd49ca64d2bf2f8'
NEW = 'delivery/test-pi-0.2.0-test.2/eos-0.2.0-test.2-linux-arm64.tar.gz'
NEW_HASH = 'abfbc0844a30f5614ba6220902af183d032537a10c451e6f5488640440e9c324'
RULES = {
    'complete_private_pem': re.compile(rb'-----BEGIN (?P<label>(?:RSA |EC |DSA |ENCRYPTED |OPENSSH )?PRIVATE KEY)-----[\s\S]{1,32768}?-----END (?P=label)-----'),
    'github_token': re.compile(rb'\b(?:gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{40,255})\b'),
    'aws_access_key': re.compile(rb'\b(?:AKIA|ASIA)[A-Z0-9]{16}\b'),
    'license_token': re.compile(rb'\b(?:NWL[0-9]|NW1)\.[A-Za-z0-9_-]{16,32768}\.[A-Za-z0-9_-]{16,4096}\b'),
    'jwt_token': re.compile(rb'\beyJ[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,8192}\.[A-Za-z0-9_-]{16,2048}\b'),
}
ARCHIVES = ('.tgz', '.tar', '.tar.gz', '.tar.xz', '.zip', '.gz', '.xz', '.bz2', '.7z', '.deb')
PUBLIC = {
    'delivery/test-pi-0.2.0-test.1/release-public.pem': 'e4e2465af8ae947574804f42c5ed17072ada8831b9839876f188c0e7c4c08cbe',
    'delivery/test-pi-0.2.0-test.2/release-public.pem': '432c1aabeeb35b4e28ac6aaef7d991275f7b1d667e4ad0269bb903bd13134f9a',
}
def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    prior_raw = (ROOT / PRIOR).read_bytes()
    if sha(prior_raw) != PRIOR_HASH:
        raise ValueError('PRIOR_REVIEW_INTEGRITY')
    prior = json.loads(prior_raw)
    known = {row['path']: row for row in prior['archives']}
    paths = sorted(set(subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')) - {'', OUTPUT})
    hits, errors, archives, files = [], [], [], []
    def scan(name, data):
        for rule, pattern in RULES.items():
            if pattern.search(data):
                hits.append({'path': name, 'rule': rule})
    for name in paths:
        file = ROOT / name
        info = file.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_size > 128 * 1024 ** 2 or info.st_mode & 0o6022:
            errors.append({'path': name, 'code': 'TYPE_SIZE_OR_MODE'}); continue
        data = file.read_bytes(); digest = sha(data)
        files.append({'path': name, 'bytes': len(data), 'sha256': digest})
        if name.lower().endswith(ARCHIVES):
            if name == NEW and digest == NEW_HASH:
                count, total, seen = 0, 0, set()
                with tarfile.open(file, mode='r:gz') as tar:
                    for entry in tar:
                        parts = PurePosixPath(entry.name).parts
                        if not parts or parts[0] != 'bundle' or entry.name.startswith('/') or '..' in parts or '\\' in entry.name or entry.name in seen:
                            raise ValueError('ARCHIVE_PATH')
                        seen.add(entry.name)
                        if entry.isdir():
                            continue
                        if not entry.isfile() or entry.mode & 0o6022 or entry.size > 128 * 1024 ** 2:
                            raise ValueError('ARCHIVE_TYPE_MODE_SIZE')
                        count += 1; total += entry.size
                        if count > 60000 or total > 1024 ** 3:
                            raise ValueError('ARCHIVE_LIMIT')
                        expanded = tar.extractfile(entry).read(128 * 1024 ** 2 + 1)
                        if len(expanded) != entry.size:
                            raise ValueError('ARCHIVE_READ')
                        scan(name + '!' + entry.name, expanded)
                archives.append({'path': name, 'sha256': digest, 'expandedFiles': count, 'expandedBytes': total, 'expandedNow': True, 'linksAndSpecialFiles': False})
            elif name in known and known[name]['sha256'] == digest:
                archives.append({**known[name], 'expandedNow': False, 'review': 'hash-identical prior expanded review'})
            else:
                errors.append({'path': name, 'code': 'UNREVIEWED_ARCHIVE'})
        else:
            scan(name, data)
        if file.suffix in {'.key', '.pem', '.env', '.sqlite', '.db', '.p12', '.pfx'} and PUBLIC.get(name) != digest:
            errors.append({'path': name, 'code': 'SENSITIVE_FILE_REVIEW'})
        if '__pycache__' in file.parts or file.suffix in {'.pyc', '.pyo'}:
            errors.append({'path': name, 'code': 'GENERATED_CACHE'})
    record = {'schemaVersion': 1, 'kind': 'postgresql-delivery-pattern-review', 'recordedAt': datetime.now(timezone.utc).isoformat(),
        'scope': 'all repository delivery files; new signed runtime expanded without extraction; historical archives hash-bound to previous expanded review',
        'priorReview': PRIOR, 'priorReviewSha256': PRIOR_HASH, 'rules': list(RULES), 'files': len(files),
        'hits': hits, 'errors': errors, 'archives': archives,
        'historicalArchiveHits': prior['hits'], 'historicalHitReview': prior['hitReview'],
        'sourceFileTableSha256': sha(json.dumps(files, sort_keys=True, separators=(',', ':')).encode()),
        'passed': not hits and not errors, 'completeSecretDetectionClaimed': False, 'vulnerabilityScan': False}
    (ROOT / OUTPUT).write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({key: record[key] for key in ['files', 'hits', 'errors', 'passed']}))
    return 0 if record['passed'] else 1

if __name__ == '__main__':
    raise SystemExit(main())
