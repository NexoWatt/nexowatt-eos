#!/usr/bin/env python3
"""Source/lock inventory only. Never treat as the installed runtime SBOM."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
IDS = ['admin', 'ui', 'devices', 'eebus', 'ocpp21', 'backitup']
MAX = 32 * 1024 * 1024

def read(path):
    if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX:
        raise ValueError('SOURCE_INPUT')
    raw = path.read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()

def inventory(root=ROOT, product_version='0.2.0-dev.3'):
    if not isinstance(product_version, str) or not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?', product_version):
        raise ValueError('SOURCE_PRODUCT_VERSION')
    rows, components = [], []
    for key in IDS:
        directory = root / 'components' / key
        package, digest = read(directory / 'package.json')
        name, version = package['name'], package['version']
        ref = f'eos-source:{key}:{version}'
        component = {'type': 'application', 'bom-ref': ref, 'name': name, 'version': version,
                     'properties': [{'name': 'eos:scope', 'value': 'source-checkout-not-runtime'},
                                    {'name': 'eos:package-json-sha256', 'value': digest}]}
        components.append(component)
        row = {'id': key, 'package': name, 'version': version, 'sourceDirectory': f'components/{key}',
               'sourceManifestSha256': digest, 'sourcePresent': True,
               'mainPresentInSource': (directory / package.get('main', '')).is_file(),
               'admission': 'pending', 'deviceTest': 'not-executed',
               'declaredDependencies': package.get('dependencies', {}),
               'lifecycleScriptsPresent': sorted(k for k in package.get('scripts', {}) if k in ['preinstall', 'install', 'postinstall', 'prepare', 'prepack', 'postpack', 'prepublishOnly']),
               'locks': []}
        for lock_path in sorted(directory.rglob('package-lock.json')):
            if 'node_modules' in lock_path.parts or '.git' in lock_path.parts:
                continue
            lock, lock_hash = read(lock_path)
            rel = lock_path.relative_to(root).as_posix()
            lock_root = lock.get('packages', {}).get('', {})
            records = lock.get('packages', {})
            source_pkg, _ = read(lock_path.parent / 'package.json')
            status = all(lock_root.get(x) == source_pkg.get(x) for x in ['name', 'version', 'dependencies', 'devDependencies', 'optionalDependencies'])
            row['locks'].append({'path': rel, 'sha256': lock_hash, 'lockfileVersion': lock.get('lockfileVersion'), 'entries': len(records), 'rootMatchesAdjacentManifest': status})
            for module_path, entry in sorted(records.items()):
                if not module_path or not isinstance(entry, dict) or not isinstance(entry.get('version'), str):
                    continue
                npm_name = entry.get('name') or module_path.rsplit('node_modules/', 1)[-1]
                if not re.fullmatch(r'(?:@[a-z0-9._-]+/)?[a-z0-9._-]+', npm_name):
                    raise ValueError('SOURCE_LOCK_PACKAGE_NAME')
                child_ref = 'eos-lock:' + hashlib.sha256(f'{rel}:{module_path}'.encode()).hexdigest()
                components.append({'type': 'library', 'bom-ref': child_ref, 'name': npm_name, 'version': entry['version'],
                    'properties': [{'name': 'eos:scope', 'value': 'declared-lock-entry-not-proven-installed-or-bundled'},
                                   {'name': 'eos:lockfile', 'value': rel},
                                   {'name': 'eos:lock-entry-path', 'value': module_path},
                                   {'name': 'eos:lockfile-sha256', 'value': lock_hash},
                                   {'name': 'eos:development-entry', 'value': str(entry.get('dev', False)).lower()}]})
        # Lock entries are an inventory, not a proven direct-dependency graph.
        # Do not invent adapter-to-every-transitive-package relationships.
        rows.append(row)
    bom = {'bomFormat': 'CycloneDX', 'specVersion': '1.5', 'version': 1,
           'metadata': {'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
              'component': {'type': 'application', 'bom-ref': 'eos-source-inventory', 'name': 'nexowatt-eos-source-assessment', 'version': product_version},
              'properties': [{'name': 'eos:scope', 'value': 'source-and-lock-inventory; not installed tree; not bundled frontend proof; includes dev dependencies'},
                             {'name': 'eos:product-release-approved', 'value': 'false'}]},
           'components': components,
           'dependencies': [{'ref': 'eos-source-inventory', 'dependsOn': [f'eos-source:{r["id"]}:{r["version"]}' for r in rows]}]}
    register = {'schemaVersion': 1, 'kind': 'eos-source-component-register', 'productVersion': product_version,
                'sourceInventoryIsNotApproval': True, 'productReleaseApproved': False,
                'runtimeController': {'package': 'iobroker.js-controller', 'version': '7.2.2', 'scope': 'separate-installed-runtime-sbom'},
                'components': rows}
    return register, bom

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--register', type=Path, required=True)
    p.add_argument('--sbom', type=Path, required=True)
    p.add_argument('--product-version', default='0.2.0-dev.3')
    a = p.parse_args()
    register, bom = inventory(product_version=a.product_version)
    for target, value in [(a.register, register), (a.sbom, bom)]:
        if target.is_symlink(): raise ValueError('OUTPUT_LINK')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'sourceComponents': len(register['components']), 'lockComponents': len(bom['components']) - len(register['components']), 'runtimeInventory': False}))
