#!/usr/bin/env python3
"""Inventory retained test logs and delivery sources; no test-time binding claim."""
import hashlib
import json
from pathlib import Path
import platform
import re
import subprocess
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'reports/integration/first-start'
GROUPS = [
    ('onboarding', 'reports/integration/first-start/raw/onboarding.tap', 'https-local-and-memory-store'),
    ('product-build-contract', 'reports/integration/first-start/raw/installation-product-build-r6-complete.tap', 'source-and-build-contract'),
    ('accounts-and-control', 'reports/onboarding/admin-accounts-and-control.tap', 'admin-modules-and-local-tls'),
    ('service-contract', 'reports/onboarding/cross-service-contracts.tap', 'unit-contract-and-simulated-host-effects'),
    ('invitation-parser', 'reports/onboarding/admin-invitation-parser.tap', 'actual-express-parser-route-harness'),
    ('first-start-license', 'reports/onboarding/first-start-license.tap', 'actual-license-core-and-encrypted-store; simulated-descriptor-ownership'),
    ('first-start-cleanup', 'reports/onboarding/first-start-cleanup.tap', 'real-temporary-files; simulated-root-marker-ownership'),
    ('security-regression', 'reports/integration/first-start/raw/security-regression.tap', 'baseline-tls-and-sftp-regression'),
    ('security-initial-path-missing', 'reports/integration/first-start/raw/security-regression-path-missing.tap', 'platform-limited-failed-attempt'),
    ('legacy-release-windows', 'reports/integration/first-start/raw/installation-release-windows.tap', 'platform-limited-failed-attempt'),
    ('legacy-web-systemd-windows', 'reports/integration/first-start/raw/installation-web-systemd-windows.tap', 'platform-limited-failed-attempt'),
]


def sha(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def output(name, value):
    (REPORT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    groups = []
    for name, relative, scope in GROUPS:
        file = ROOT / relative
        raw = file.read_bytes()
        text = raw.decode('utf-16' if raw.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig')
        counts = {}
        for field in ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']:
            rows = re.findall(r'^# ' + field + r' (\d+)\s*$', text, re.MULTILINE)
            if len(rows) != 1:
                raise ValueError('MISSING_OR_DUPLICATE_TAP_SUMMARY:' + relative)
            counts[field] = int(rows[0])
        groups.append({'name': name, 'raw': relative, 'sha256': sha(file), 'scope': scope,
                       'counts': counts, 'passedWithoutFailure': counts['fail'] == counts['cancelled'] == 0,
                       'hardwareExecuted': False})
    files = set()
    for folder in ['runtime/onboarding', 'runtime/product', 'runtime/bootstrap', 'tests/onboarding']:
        files.update(p for p in (ROOT / folder).rglob('*') if p.is_file())
    changes = subprocess.check_output(['git', 'diff', 'HEAD', '--name-only', '-z'], cwd=ROOT).decode().split('\0')
    changes += subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
    for relative in changes:
        if relative.startswith(('runtime/', 'tools/', 'tests/', 'system/', 'components/')):
            p = ROOT / relative
            if p.is_file() and not relative.endswith('.map'):
                files.add(p)
    rows = [{'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)}
            for p in sorted(files) if '__pycache__' not in p.parts and p.suffix != '.pyc']
    output('delivery-sources.json', {'kind': 'delivery-source-snapshot', 'sourceBindingVerifiedAtTestTime': False, 'files': rows})
    bom = {'bomFormat': 'CycloneDX', 'specVersion': '1.5', 'version': 1,
           'metadata': {'component': {'type': 'application', 'name': 'nexowatt-eos-first-start-source', 'version': '0.2.0-dev.9'},
                        'properties': [{'name': 'eos:scope', 'value': 'first-party changed source and test input hashes; not installed runtime'},
                                       {'name': 'eos:onboarding-external-npm-dependencies', 'value': 'none; Node built-ins and existing EOS bootstrap modules'}]},
           'components': [{'type': 'file', 'bom-ref': 'eos-source:' + row['path'], 'name': row['path'],
                           'hashes': [{'alg': 'SHA-256', 'content': row['sha256']}]} for row in rows]}
    output('first-party-source.cdx.json', bom)
    public = [g for g in groups if g['scope'] != 'platform-limited-failed-attempt']
    build = REPORT / 'build-status.json'
    build_status = json.loads(build.read_text(encoding='utf-8')) if build.exists() else {'newSignedRuntimeBuilt': False, 'status': 'not-complete'}
    summary = {'schemaVersion': 1, 'sourceVersion': '0.2.0-dev.9', 'requirement': 'EOS-REQ-ONBOARD-20261002',
               'recordedAt': datetime.now(timezone.utc).isoformat(),
               'environment': {'platform': platform.platform(), 'architecture': platform.machine(),
                               'node': subprocess.check_output(['node', '--version'], text=True).strip(), 'python': platform.python_version()},
               'groups': groups, 'focusedTestsPassed': sum(g['counts']['pass'] for g in public),
               'focusedTestsSkipped': sum(g['counts']['skipped'] for g in public),
               'focusedSuitesHaveNoFailures': all(g['passedWithoutFailure'] for g in public),
               'allAttemptedSuitesPassed': all(g['passedWithoutFailure'] for g in groups),
               'retainedLegacyFailures': sum(g['counts']['fail'] for g in groups if g['scope'] == 'platform-limited-failed-attempt'),
               'sourceBinding': 'reports/integration/first-start/delivery-sources.json', 'sourceBindingSha256': sha(REPORT / 'delivery-sources.json'),
               'sourceBindingKind': 'delivery-source-snapshot', 'sourceBindingVerifiedAtTestTime': False,
               'pythonSecurityRegression': json.loads((REPORT / 'python-security-regression.json').read_text(encoding='utf-8')),
               'build': build_status, 'targetHardwareTested': False, 'nativePostgresqlTested': False, 'nativeSystemdTested': False,
               'graphicalBrowserTested': False, 'fullAdminTypecheckExecuted': False,
               'physicalControlReleased': False, 'productionReleaseApproved': False,
               'legacyTest2Verification': 'user-reported signed-bundle check only; not a host installation; not rerun as hardware evidence',
               'limitations': ['Real local HTTPS/TLS is distinct from simulated database and systemd effects.',
                               'Delivery hashes are recorded after test execution; retained logs do not establish a cryptographic test-time source binding.',
                               'Initial Node security attempt lacked OpenSSL in PATH; its failed log is retained beside the successful rerun.',
                               'Python host security suites failed on Windows/Git Bash: missing POSIX geteuid, tools and /tmp permissions; these are not passes.',
                               'Legacy POSIX permission, /root and Linux-manifest checks failed on Windows; retained in raw logs.',
                               'The browser runtime reported no available browser; DOM tests are not visual browser acceptance.',
                               'License and device-plan forms are implemented; actual device communication, live measurements and engineering acceptance of plant values remain open.',
                               'Interrupted multi-object commits stay blocked and require controlled host recovery; no distributed transaction claimed.']}
    output('verification-summary.json', summary)
    print(json.dumps({key: summary[key] for key in ['focusedTestsPassed', 'focusedTestsSkipped', 'focusedSuitesHaveNoFailures', 'retainedLegacyFailures', 'targetHardwareTested']}))


if __name__ == '__main__':
    main()
