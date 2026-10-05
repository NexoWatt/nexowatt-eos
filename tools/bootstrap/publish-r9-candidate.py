#!/usr/bin/env python3
"""Publish only new, source-bound R9 outputs from this build's CI artifact.

No candidate code is executed and no credentials are handled here. The workflow
performs a separate normal fast-forward push after comparing the remote head.
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

ROOT = Path(__file__).resolve().parents[2]
REPORT = 'reports/integration/installable-test3-r9-20261005'
DELIVERY = 'delivery/test-pi-0.2.0-test.3-r9'
ARCHIVE = 'eos-0.2.0-test.3-linux-arm64.tar.gz'
OUTPUTS = {
    DELIVERY + '/' + ARCHIVE,
    DELIVERY + '/release-public.pem', DELIVERY + '/delivery.json', DELIVERY + '/bundle.sha256',
    REPORT + '/runtime.cdx.json', REPORT + '/runtime-derivative-sbom.json',
    REPORT + '/signed-source-binding.json', REPORT + '/build-verification.json', REPORT + '/delivery.json',
    REPORT + '/r9-native.tap', REPORT + '/r9-native-prepared.json',
    REPORT + '/r9-native-evidence.json', REPORT + '/native-workflow.json',
}
HEX = re.compile(r'[a-f0-9]{64}')


def require(value):
    if not value:
        raise ValueError('R9_PUBLICATION_REJECTED')


def digest(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def read_json(file):
    require(file.stat().st_size <= 16 * 1024 * 1024)
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result)
            result[key] = value
        return result
    def invalid_constant(_):
        raise ValueError('R9_PUBLICATION_REJECTED')
    return json.loads(file.read_bytes(), object_pairs_hook=unique_pairs, parse_constant=invalid_constant)


def passed_tap(file):
    require(file.stat().st_size <= 4 * 1024 * 1024)
    text = file.read_text(encoding='utf-8')
    require(text.startswith('TAP version 13\n') and not re.search(r'^not ok\b', text, re.M))
    counts = {}
    for field in ('tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'):
        values = re.findall(r'^# ' + field + r' ([0-9]+)$', text, re.M)
        require(len(values) == 1)
        counts[field] = int(values[0])
    require(counts['tests'] > 0 and counts['tests'] == counts['pass'])
    require(all(counts[field] == 0 for field in ('fail', 'cancelled', 'skipped', 'todo')))


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
        target = root / name
        # A report can repeat tracked builder/tests unchanged. No candidate code
        # can replace the reviewed source, and no arbitrary new report is accepted.
        repeated_source = name.startswith(REPORT + '/') and target.is_file() and not target.is_symlink()
        require(name in OUTPUTS or repeated_source)
        require(all(part not in ('', '.', '..') for part in name.split('/')))
        if target.exists() or target.is_symlink():
            require(repeated_source and digest(file) == digest(target))
        for parent in target.parents:
            if parent == root:
                break
            require(not parent.is_symlink())
        result.append((name, file, target))
    require(OUTPUTS.issubset({name for name, _, _ in result}))
    return result


def validate_candidate(candidate, root, expected_commit):
    require(re.fullmatch(r'[a-f0-9]{40}', expected_commit))
    require(not (root / DELIVERY).exists() and not (root / DELIVERY).is_symlink())
    files = candidate_files(candidate, root)
    build = read_json(candidate / REPORT / 'build-verification.json')
    require(build.get('sourceCommit') == expected_commit and build.get('deliveryRevision') == 9 and build.get('releaseSequence') == 12)
    for field in ('previousSignatureVerified', 'finalSignatureVerified', 'sourceBindingPassed',
                  'signedArchiveReadbackPassed', 'exactOverlayDeltaChecked', 'dependenciesUnchanged'):
        require(build.get(field) is True)
    for field in ('nativeTargetExecutionPerformed', 'piUpdatePerformed', 'hardwareTested', 'productionReleaseApproved'):
        require(build.get(field) is False)
    require(type(build.get('historicalDeliveryFilesUnchanged')) is int and build['historicalDeliveryFilesUnchanged'] > 0)
    delivery = read_json(candidate / DELIVERY / 'delivery.json')
    require(delivery == read_json(candidate / REPORT / 'delivery.json'))
    require(delivery.get('deliveryRevision') == 9 and delivery.get('releaseSequence') == 12 and
            delivery.get('platform') == 'linux-arm64' and delivery.get('runtimeVersion') == '0.2.0-test.3' and
            delivery.get('productionReleaseApproved') is False and delivery.get('physicalControlEnabled') is False and
            delivery.get('privateKeyPersisted') is False and delivery.get('archiveReadbackVerified') is True and
            delivery.get('archive') == ARCHIVE and delivery.get('sourceCommit') == expected_commit)
    require(HEX.fullmatch(delivery.get('releaseId', '')))
    archive = candidate / DELIVERY / ARCHIVE
    key = candidate / DELIVERY / 'release-public.pem'
    archive_hash, key_hash = digest(archive), digest(key)
    require(type(delivery.get('bytes')) is int and archive_hash == delivery.get('sha256') and archive.stat().st_size == delivery['bytes'])
    require(key_hash == delivery.get('signingPublicKeySha256'))
    checksums = (candidate / DELIVERY / 'bundle.sha256').read_text().splitlines()
    require(len(checksums) == 2 and set(checksums) == {archive_hash + '  ' + ARCHIVE, key_hash + '  release-public.pem'})
    binding = read_json(candidate / REPORT / 'signed-source-binding.json')
    require(binding.get('allMatched') is True and binding.get('sourceCommit') == expected_commit and
            binding.get('releaseId') == delivery['releaseId'] and binding.get('archiveSha256') == archive_hash and
            binding.get('signingPublicKeySha256') == key_hash and binding.get('unchangedThirdPartyContentReused') is True and
            binding.get('npmResolutionPerformed') is False and binding.get('sourceTranspilationPerformed') is False and
            type(binding.get('overlays')) is list and len(binding['overlays']) > 0)
    require(build.get('archiveSha256') == archive_hash and build.get('signingPublicKeySha256') == key_hash)
    passed_tap(candidate / REPORT / 'r9-native.tap')
    native = read_json(candidate / REPORT / 'r9-native-evidence.json')
    require(native.get('passed') is True and native.get('sourceCommit') == expected_commit and native.get('signed') is False)
    workflow = read_json(candidate / REPORT / 'native-workflow.json')
    require(set(workflow) == {'schemaVersion', 'repository', 'workflowPath', 'runId', 'runAttempt', 'headSha', 'event', 'conclusion'})
    require(workflow['schemaVersion'] == 1 and workflow['repository'] == 'NexoWatt/nexowatt-eos' and
            workflow['workflowPath'] == '.github/workflows/security-review.yml' and workflow['headSha'] == expected_commit and
            workflow['event'] == 'push' and workflow['conclusion'] == 'success' and
            type(workflow['runId']) is int and workflow['runId'] > 0 and type(workflow['runAttempt']) is int and workflow['runAttempt'] > 0)
    return files


def main(candidate, expected_commit):
    require(re.fullmatch(r'[a-f0-9]{40}', expected_commit))
    observed = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True, capture_output=True, check=True, timeout=10)
    require(observed.stdout.strip() == expected_commit)
    status = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=normal'], cwd=ROOT,
                            text=True, capture_output=True, check=True, timeout=10)
    require(status.stdout == '')
    candidate = Path(candidate)
    require(candidate.is_absolute() and not candidate.is_symlink())
    candidate = candidate.resolve(strict=True)
    files = validate_candidate(candidate, ROOT, expected_commit)
    # The trusted checkout rereads signatures and binds signed bytes to this
    # source before any privileged publication copy. Never run candidate code.
    node = shutil.which('node')
    require(node is not None)
    subprocess.run([node, str(ROOT / REPORT / 'verify-candidate.cjs'), str(candidate), expected_commit,
                    '--native-evidence', str(candidate / REPORT)],
                   cwd=ROOT, check=True, timeout=300)
    # All checks precede writes. Existing source and historical outputs are immutable.
    copied = 0
    for name, source, target in files:
        if target.exists():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with source.open('rb') as incoming, target.open('xb') as outgoing:
            shutil.copyfileobj(incoming, outgoing)
        os.chmod(target, 0o644)
        require(digest(source) == digest(target))
        copied += 1
    print(json.dumps({'ok': True, 'copiedFiles': copied, 'sourceCommit': expected_commit,
                      'deliveryRevision': 9, 'productionReleaseApproved': False}))


if __name__ == '__main__':
    try:
        require(len(sys.argv) == 3)
        main(sys.argv[1], sys.argv[2])
    except Exception:
        print('R9_PUBLICATION_REJECTED', file=sys.stderr)
        raise SystemExit(1)
