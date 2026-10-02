#!/usr/bin/env python3
"""Bind actual npm tree and explicitly inventoried embedded package directories."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('test_base_sbom', ROOT / 'tools/sbom/test_base.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
EMBEDDED = {
    'node_modules/iobroker.eos-admin/adminWww/lib/js/crypto-js': 'crypto-js',
    'node_modules/iobroker.eos-admin/packages/eos-license-client': '@nexowatt/eos-license-client',
    'node_modules/iobroker.nexowatt-ui/packages/eos-license-client': '@nexowatt/eos-license-client',
}

def bind(app, npm_sbom, transform=None):
    bom, coverage = base.bind_inventory(app, npm_sbom, transform)
    local = {(row['name'], row['version']) for row in coverage['installedPackages'] if row['archiveSource'] == 'local-build-artifact'}
    for component in bom['components']:
        if (component['name'], component['version']) in local:
            component.setdefault('properties', []).extend([
                {'name': 'eos:artifact-origin', 'value': 'locally-packed-development-source'},
                {'name': 'eos:registry-version-equivalence', 'value': 'not-claimed; use the local archive hash and build record'},
            ])
    if transform is not None:
        try:
            reference = Path(transform).resolve().relative_to(ROOT).as_posix()
        except ValueError:
            reference = Path(transform).name
        for component in bom['components']:
            for prop in component.get('properties', []):
                if prop.get('name') == 'eos:transform:evidence':
                    prop['value'] = reference
    embedded = []
    app = Path(app).resolve(strict=True)
    for relative, expected_name in EMBEDDED.items():
        directory = app / relative
        if not directory.exists():
            continue
        cursor = app
        for part in Path(relative).parts:
            cursor /= part
            if cursor.is_symlink(): raise base.EvidenceError('EMBEDDED_PATH_LINK')
        manifest, manifest_hash = base.read_json(directory / 'package.json')
        if manifest.get('name') != expected_name or not isinstance(manifest.get('version'), str):
            raise base.EvidenceError('EMBEDDED_IDENTITY')
        # Any separately declared dependencies need another evidence source.
        if manifest.get('dependencies') or manifest.get('optionalDependencies'):
            raise base.EvidenceError('EMBEDDED_DEPENDENCIES_UNINVENTORIED')
        files, total = [], 0
        for item in sorted(directory.rglob('*')):
            if item.is_symlink(): raise base.EvidenceError('EMBEDDED_PATH_LINK')
            if item.is_dir(): continue
            if not item.is_file(): raise base.EvidenceError('EMBEDDED_SPECIAL_FILE')
            total += item.stat().st_size
            if item.stat().st_size > 32 * 1024 * 1024 or total > 64 * 1024 * 1024 or len(files) > 10000:
                raise base.EvidenceError('EMBEDDED_SIZE_LIMIT')
            files.append({'path': item.relative_to(directory).as_posix(), 'size': item.stat().st_size, 'sha256': hashlib.sha256(item.read_bytes()).hexdigest()})
        tree_hash = hashlib.sha256(json.dumps(files, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
        ref = 'eos-embedded:' + relative
        bom['components'].append({'type': 'library', 'bom-ref': ref, 'name': manifest['name'], 'version': manifest['version'],
            'properties': [{'name': 'eos:scope', 'value': 'embedded-package-files-observed-in-runtime-tree'},
                           {'name': 'eos:installed-path', 'value': relative},
                           {'name': 'eos:manifest-sha256', 'value': manifest_hash},
                           {'name': 'eos:tree-sha256', 'value': tree_hash},
                           {'name': 'eos:tree-hash-format', 'value': 'sha256 UTF-8 compact JSON sorted path,size,sha256 rows; separate from archive SRI'}]})
        # Explicit inventory paths bind each copy to its actual owning adapter.
        # Identical name/version in two vendored directories is not proof that
        # the bytes, location or dependency parent are the same instance.
        parent_relative = '/'.join(relative.split('/')[:2])
        parent_manifest, _ = base.read_json(app / parent_relative / 'package.json')
        parent = next((c for c in bom['components'] if c['name'] == parent_manifest['name'] and
                       c['version'] == parent_manifest['version']), None)
        dep = next((d for d in bom['dependencies'] if parent and d['ref'] == parent['bom-ref']), None)
        if dep is None: raise base.EvidenceError('EMBEDDED_PARENT_UNBOUND')
        dep['dependsOn'].append(ref)
        bom['dependencies'].append({'ref': ref, 'dependsOn': []})
        embedded.append({'path': relative, 'name': manifest['name'], 'version': manifest['version'], 'files': len(files), 'treeSha256': tree_hash, 'manifestSha256': manifest_hash, 'parentPackage': parent_manifest['name'], 'parentVersion': parent_manifest['version']})
    coverage['embeddedPackages'] = embedded
    coverage['embeddedPackageCount'] = len(embedded)
    coverage['uniqueEmbeddedPackageCount'] = len({(row['name'], row['version']) for row in embedded})
    coverage['missingScope'].append('bundled-frontend-dependency-attribution-beyond-explicit-embedded-packages')
    bom['metadata']['properties'].append({'name': 'eos:embedded-scope', 'value': 'explicit vendored packages only; not full frontend bundle dependency reconstruction'})
    return bom, coverage

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for k in ['app', 'npm-sbom', 'out', 'coverage']: p.add_argument('--' + k, required=True, type=Path)
    p.add_argument('--transform-evidence', type=Path)
    a = p.parse_args()
    inputs = {(a.app/'package.json').resolve(), (a.app/'package-lock.json').resolve(), a.npm_sbom.resolve()}
    if a.transform_evidence: inputs.add(a.transform_evidence.resolve())
    if a.out.resolve() == a.coverage.resolve() or a.out.resolve() in inputs or a.coverage.resolve() in inputs: raise base.EvidenceError('OUTPUT_COLLISION')
    bom, coverage = bind(a.app, a.npm_sbom, a.transform_evidence)
    for target, value in [(a.out, bom), (a.coverage, coverage)]:
        if target.is_symlink(): raise base.EvidenceError('OUTPUT_LINK')
        target.write_text(json.dumps(value, indent=2) + '\n')
    print(json.dumps({'installedNpmPackages': coverage['installedPackageCount'], 'embeddedPackages': len(coverage['embeddedPackages']), 'productReleaseApproved': False}))
