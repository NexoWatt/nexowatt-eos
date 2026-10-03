#!/usr/bin/env python3
"""Copy only verified R4 build outputs into a clean same-commit checkout.

No network, Git authentication, service mutation or code execution from the
candidate. The separate workflow performs a normal compare-before-push commit.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
REPORT = 'reports/integration/installable-test3-r4-20261003'
DELIVERY = 'delivery/test-pi-0.2.0-test.3-r4'
BOOTSTRAP = 'delivery/bootstrap-test3-r4'
ALLOWED = (REPORT + '/', DELIVERY + '/', BOOTSTRAP + '/')
GENERATED_DOCUMENTS = ('README.md', 'system/product.json')
TRUST_SHA256 = '470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f'


def require(value):
    if not value:
        raise ValueError('REVISION_PUBLICATION_REJECTED')


def digest(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def read_json(file):
    require(file.stat().st_size <= 2 * 1024 * 1024)
    return json.loads(file.read_bytes())


def candidate_files(candidate, root):
    require(candidate.is_dir() and not candidate.is_symlink())
    result = []
    for file in sorted(candidate.rglob('*')):
        info = file.lstat()
        require(not file.is_symlink())
        if stat.S_ISDIR(info.st_mode):
            continue
        require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_size < 100 * 1024 * 1024)
        name = file.relative_to(candidate).as_posix()
        require((name.startswith(ALLOWED) or name in GENERATED_DOCUMENTS) and
                all(part not in ('', '.', '..') for part in name.split('/')))
        target = root / name
        # Existing report scripts/documentation belong to the source commit.
        # The artifact may repeat their bytes; it must never modify them.
        if target.exists() or target.is_symlink():
            require(target.is_file() and not target.is_symlink() and
                    (name in GENERATED_DOCUMENTS or digest(file) == digest(target)))
        result.append((name, file, target))
    require(len(result) >= 20)
    return result


def main(candidate, expected_commit):
    require(re.fullmatch(r'[a-f0-9]{40}', expected_commit))
    observed = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True, capture_output=True, check=True, timeout=10)
    require(observed.stdout.strip() == expected_commit)
    status = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=normal'], cwd=ROOT, text=True, capture_output=True, check=True, timeout=10)
    require(status.stdout == '')
    require(not (ROOT / DELIVERY).exists() and not (ROOT / BOOTSTRAP).exists())
    candidate = Path(candidate).resolve(strict=True)
    files = candidate_files(candidate, ROOT)
    build = read_json(candidate / REPORT / 'build-verification.json')
    require(build.get('sourceCommit') == expected_commit and build.get('completedBuildPassed') is True and
            build.get('signedArchiveReadbackPassed') is True and build.get('publishedR3AppUnchanged') is True and
            build.get('historicalDeliveriesUnchanged') is True and build.get('productionReleaseApproved') is False)
    delivery = read_json(candidate / DELIVERY / 'delivery.json')
    require(delivery.get('deliveryRevision') == 4 and delivery.get('releaseSequence') == 7 and
            delivery.get('platform') == 'linux-arm64' and delivery.get('runtimeVersion') == '0.2.0-test.3' and
            delivery.get('productionReleaseApproved') is False and delivery.get('physicalControlEnabled') is False and
            delivery.get('privateKeyPersisted') is False and delivery.get('archiveReadbackVerified') is True and
            delivery.get('archive') == 'eos-0.2.0-test.3-linux-arm64.tar.gz')
    archive = candidate / DELIVERY / delivery['archive']
    require(digest(archive) == delivery['sha256'] and archive.stat().st_size == delivery['bytes'])
    require(digest(candidate / DELIVERY / 'release-public.pem') == delivery['signingPublicKeySha256'])
    require(digest(candidate / BOOTSTRAP / 'license-public-trust.json') == TRUST_SHA256)
    binding = read_json(candidate / REPORT / 'signed-source-binding.json')
    require(binding.get('allMatched') is True and binding.get('releaseId') == delivery['releaseId'] and
            binding.get('archiveSha256') == delivery['sha256'])
    require((candidate / BOOTSTRAP / 'INSTALL_ONE_COMMAND.txt').is_file())
    require((candidate / BOOTSTRAP / 'one-command-verification.json').is_file())
    before_readme = (ROOT / 'README.md').read_text()
    after_readme = (candidate / 'README.md').read_text()
    begin, end = '<!-- EOS_PRIVATE_GITHUB_INSTALL_START -->', '<!-- EOS_PRIVATE_GITHUB_INSTALL_END -->'
    for value in (before_readme, after_readme):
        require(value.count(begin) == value.count(end) == 1)
    require(before_readme.split(begin)[0] == after_readme.split(begin)[0] and
            before_readme.split(end)[1] == after_readme.split(end)[1])
    command = (candidate / BOOTSTRAP / 'INSTALL_ONE_COMMAND.txt').read_text().strip()
    require(command in after_readme)
    product = read_json(candidate / 'system/product.json')
    require(product.get('currentRuntimeArtifact') == DELIVERY + '/delivery.json' and
            product.get('currentBuildStatus') == REPORT + '/build-verification.json' and
            product.get('productionReleaseApproved') is False and product.get('targetHardwareAccepted') is False)
    # All checks precede the first write. Only the two generated documentation
    # files may replace existing bytes; historical deliveries/source stay intact.
    for name, source, target in files:
        if target.exists() and name not in GENERATED_DOCUMENTS:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with source.open('rb') as incoming, target.open('wb' if name in GENERATED_DOCUMENTS else 'xb') as outgoing:
            shutil.copyfileobj(incoming, outgoing)
        os.chmod(target, 0o644)
        require(digest(source) == digest(target))
    print(json.dumps({'ok': True, 'copiedFiles': len(files), 'sourceCommit': expected_commit,
                      'deliveryRevision': 4, 'productionReleaseApproved': False}))


if __name__ == '__main__':
    try:
        require(len(sys.argv) == 3)
        main(sys.argv[1], sys.argv[2])
    except Exception:
        print('REVISION_PUBLICATION_REJECTED', file=sys.stderr)
        raise SystemExit(1)
