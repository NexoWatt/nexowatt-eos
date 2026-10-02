#!/usr/bin/env python3
"""Bind dev8 source/test dependency inventory and the uninstalled JS review artifact."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'reports/integration/adapter-channel'
def sha(p):
    with p.open('rb') as s:
        return hashlib.file_digest(s, 'sha256').hexdigest()

def record(modules, javascript):
    modules, javascript = modules.resolve(), javascript.resolve()
    entries = []
    for directory in ['store', 'db-states-postgresql', 'db-objects-postgresql']:
        p = ROOT / 'runtime/postgresql/packages' / directory / 'package.json'
        package = json.loads(p.read_text())
        entries.append({'type': 'library', 'bom-ref': package['name'], 'name': package['name'], 'version': package['version'],
                        'hashes': [{'alg': 'SHA-256', 'content': sha(p)}],
                        'properties': [{'name': 'eos:scope', 'value': 'development-source-overlay; not a signed installed runtime'}, {'name': 'eos:hash-scope', 'value': 'package.json'}]})
    for p in sorted((modules / '@nexowatt/eos-postgresql-store/node_modules').glob('*/package.json')):
        package = json.loads(p.read_text())
        entries.append({'type': 'library', 'bom-ref': package['name'], 'name': package['name'], 'version': package['version'],
                        'purl': f'pkg:npm/{package["name"]}@{package["version"]}', 'hashes': [{'alg': 'SHA-256', 'content': sha(p)}],
                        'properties': [{'name': 'eos:scope', 'value': 'actual local pg test dependency tree extracted from test.2'}, {'name': 'eos:hash-scope', 'value': 'package.json'}]})
    tgz = REPORT / 'upstream/iobroker.javascript-10.3.0.tgz'
    entries.append({'type': 'application', 'bom-ref': 'review:iobroker.javascript@10.3.0', 'name': 'iobroker.javascript', 'version': '10.3.0',
                    'purl': 'pkg:npm/iobroker.javascript@10.3.0', 'hashes': [{'alg': 'SHA-256', 'content': sha(tgz)}],
                    'properties': [{'name': 'eos:scope', 'value': 'reviewed upstream tarball only; not installed or executed'}]})
    bom = {'bomFormat': 'CycloneDX', 'specVersion': '1.5', 'version': 1,
           'metadata': {'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                        'component': {'type': 'application', 'name': 'nexowatt-eos-adapter-channel-assessment', 'version': '0.2.0-dev.8'},
                        'properties': [{'name': 'eos:scope', 'value': 'source overlays, actual pg test packages, and uninstalled JS review artifact; not a product runtime SBOM'},
                                       {'name': 'eos:gateway-npm-dependencies', 'value': 'none; Node built-ins and existing EOS policy parser'}]}, 'components': entries}
    (REPORT / 'assessment.cdx.json').write_text(json.dumps(bom, indent=2) + '\n')
    source = {name: sha(javascript / name) for name in ['package.json', 'io-package.json', 'build/main.js', 'build/lib/sandbox.js', 'build/lib/secrets.js']}
    review = {'package': 'iobroker.javascript', 'version': '10.3.0', 'retrievedAt': '2026-10-02',
              'artifactSha256': sha(tgz), 'npmMetadataSha256': sha(REPORT / 'upstream/javascript-npm-metadata.json'),
              'npmSha512Verified': True, 'executed': False, 'installed': False, 'sources': source,
              'scope': 'source review of shipped npm code; not a full dependency or penetration assessment',
              'findings': ['child_process exposed through mods', 'free require fallbacks', 'vm is not OS isolation', 'enableSecrets defaults to true', 'dynamic module installation'],
              'activationAccepted': False}
    (REPORT / 'javascript-source-review.json').write_text(json.dumps(review, indent=2) + '\n')
    advisories = json.loads((REPORT / 'pg-public-advisories.json').read_text())
    audit = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'source': 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk',
             'inputSha256': sha(REPORT / 'pg-public-audit-input.json'), 'resultSha256': sha(REPORT / 'pg-public-advisories.json'),
             'checkedPublicPackageNames': len(json.loads((REPORT / 'pg-public-audit-input.json').read_text())),
             'packagesWithReturnedAdvisories': len(advisories), 'scope': 'actual public pg driver packages only; not Node, PostgreSQL server, full EOS or JS dependency audit',
             'absenceOfAdvisoriesIsNotSecurityProof': True}
    (REPORT / 'dependency-check.json').write_text(json.dumps(audit, indent=2) + '\n')
    print(json.dumps({'sbomComponents': len(entries), 'javascriptSourceFiles': len(source), 'pgAdvisoryPackages': len(advisories)}))

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--modules', type=Path, required=True); p.add_argument('--javascript', type=Path, required=True)
    a = p.parse_args(); record(a.modules, a.javascript)
