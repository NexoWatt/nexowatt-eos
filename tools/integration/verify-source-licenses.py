#!/usr/bin/env python3
"""Check the scoped license amendment and offline npm pack contents, not legal compliance."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'reports/integration/licensing-20261003'
BASELINE_SHA256 = '769fe314bca1363ea720908d4d4d2507d816a81a0d68b4734d7758257ae8bada'
PACKAGES = ['.', 'components/ocpp21', 'components/backitup',
            'runtime/postgresql/packages/store', 'runtime/postgresql/packages/db-objects-postgresql',
            'runtime/postgresql/packages/db-states-postgresql']


def sha(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main(baseline):
    baseline = Path(baseline)
    if sha(baseline) != BASELINE_SHA256:
        raise ValueError('UNEXPECTED_PRIOR_DELIVERY')
    REPORT.mkdir(parents=True, exist_ok=True)
    checks, packs = [], []

    def check(name, passed):
        checks.append({'name': name, 'passed': bool(passed)})

    def current(relative):
        return (ROOT / relative).read_bytes()

    with zipfile.ZipFile(baseline) as archive:
        def prior(relative):
            return archive.read('NexoWatt_EOS/' + relative)

        for old, saved in [
            ('LICENSE', 'licenses/upstream/LICENSE.ioBroker-Installer.txt'),
            ('components/ocpp21/LICENSE', 'components/ocpp21/LICENSES/PREVIOUS-MIT.txt'),
            ('components/backitup/LICENSE', 'components/backitup/LICENSES/PREVIOUS-MIT.txt'),
            ('runtime/postgresql/packages/db-states-postgresql/package.json',
             'runtime/postgresql/packages/db-states-postgresql/LICENSES/PREVIOUS-package.json')]:
            check('original-bytes-preserved:' + saved, prior(old) == current(saved))
        for relative in [
            'components/ocpp21/ocpp/schemas/ocpp2_0_1_official.json',
            'components/ocpp21/ocpp/schemas/ocpp2_1_official.json',
            'components/admin/LICENSE', 'components/admin/THIRD_PARTY_NOTICES.md',
            'components/ui/LICENSE', 'components/devices/LICENSE', 'components/eebus/LICENSE']:
            check('existing-license-or-schema-unchanged:' + relative, prior(relative) == current(relative))
        for folder in ['runtime/onboarding', 'runtime/postgresql/packages']:
            files = sorted((ROOT / folder).rglob('*.cjs'))
            check('functional-code-unchanged:' + folder,
                  bool(files) and all(prior(p.relative_to(ROOT).as_posix()) == p.read_bytes() for p in files))
        for package in PACKAGES:
            relative = (Path(package) / 'package.json').as_posix()
            before, after = json.loads(prior(relative)), json.loads(current(relative))
            allowed = {'license', 'licenses', 'files', 'private', 'publishConfig'}
            check('only-licensing-manifest-fields-changed:' + package,
                  {k: v for k, v in before.items() if k not in allowed} ==
                  {k: v for k, v in after.items() if k not in allowed})
            check('proprietary-manifest-reference:' + package, after.get('license') == 'SEE LICENSE IN LICENSE')
            check('license-present:' + package, (ROOT / package / 'LICENSE').is_file())
    root_package = json.loads(current('package.json'))
    check('root-publication-disabled', root_package.get('private') is True and 'publishConfig' not in root_package)
    for component in ['ocpp21', 'backitup']:
        common = json.loads(current(f'components/{component}/io-package.json'))['common']
        check('adapter-limited-license:' + component,
              common.get('licenseInformation', {}).get('license', common.get('license')) == 'SEE LICENSE IN LICENSE'
              and common['licenseInformation']['type'] == 'limited')
    lock = json.loads(current('components/backitup/package-lock.json'))
    check('backup-lock-root-license', lock['packages']['']['license'] == 'SEE LICENSE IN LICENSE')
    for relative in ['components/admin/package-lock.json', 'components/admin/src-admin/package-lock.json',
                     'components/ui/package-lock.json', 'components/ui/src-admin-tab/package-lock.json',
                     'components/devices/package-lock.json', 'components/eebus/package-lock.json',
                     'components/backitup/package-lock.json', 'components/backitup/src-admin/package-lock.json',
                     'components/backitup/src-tab/package-lock.json', 'system/test-base/app/package-lock.json']:
        listed = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '--', relative], cwd=ROOT, text=True).splitlines()
        check('source-lock-in-delivery:' + relative, relative in listed)

    node = shutil.which('node')
    if not node:
        raise ValueError('NODE_REQUIRED')
    npm = Path(node).parent / 'node_modules/npm/bin/npm-cli.js'
    for index, package in enumerate(PACKAGES):
        command = [node, str(npm), 'pack', '--dry-run', '--ignore-scripts', '--offline', '--json',
                   '--cache', str(ROOT / '.work/license-npm-cache')]
        run = subprocess.run(command, cwd=ROOT / package, capture_output=True, text=True, encoding='utf-8', timeout=120)
        logfile = REPORT / f'pack-{index}.json'
        logfile.write_text(run.stdout, encoding='utf-8')
        (REPORT / f'pack-{index}.stderr.txt').write_text(run.stderr, encoding='utf-8')
        check('npm-pack-dry-run:' + package, run.returncode == 0)
        entries = json.loads(run.stdout)[0]['files'] if run.returncode == 0 else []
        names = {entry['path'] for entry in entries}
        required = {'LICENSE', 'package.json'}
        if package == '.':
            required.update({'THIRD_PARTY_NOTICES.md', 'licenses/upstream/LICENSE.ioBroker-Installer.txt'})
        else:
            required.add('NOTICE.md')
        if package in ['components/ocpp21', 'components/backitup']:
            required.add('LICENSES/PREVIOUS-MIT.txt')
        if package.endswith('db-states-postgresql'):
            required.add('LICENSES/PREVIOUS-package.json')
        check('npm-pack-includes-required-notices:' + package, required <= names)
        packs.append({'package': package, 'exitCode': run.returncode, 'files': len(entries),
                      'requiredNotices': sorted(required), 'missingNotices': sorted(required - names),
                      'log': logfile.relative_to(ROOT).as_posix(), 'logSha256': sha(logfile),
                      'lifecycleScriptsExecuted': False, 'networkMode': 'offline-only', 'archiveCreated': False})
    result = {'schemaVersion': 1, 'kind': 'scoped-proprietary-license-source-and-pack-check',
              'recordedAt': datetime.now(timezone.utc).isoformat(), 'baselineSourceArchiveSha256': BASELINE_SHA256,
              'checks': checks, 'allChecksPassed': all(row['passed'] for row in checks), 'npmPackDryRuns': packs,
              'legalComplianceCertification': False, 'completeThirdPartyLicenseAudit': False,
              'runtimeRebuilt': False, 'targetHardwareTested': False,
              'limitations': ['Scoped notice preservation, metadata and package-content checks only.',
                              'Earlier functional tests and runtime assembly remain evidence for their recorded sources.',
                              'No permissions already validly granted under an earlier license are revoked.']}
    (REPORT / 'source-license-checks.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'checks': len(checks), 'passed': sum(row['passed'] for row in checks),
                      'failures': [row['name'] for row in checks if not row['passed']]}))
    return 0 if result['allChecksPassed'] else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-archive', required=True)
    raise SystemExit(main(parser.parse_args().baseline_archive))
