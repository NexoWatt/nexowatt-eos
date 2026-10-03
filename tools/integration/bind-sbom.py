#!/usr/bin/env python3
"""Bind actual npm tree and explicitly inventoried embedded package directories."""
import argparse
import base64
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

def native_binding(app, bom, evidence_path):
    """Attribute exactly reviewed derivative native packages, never upstream bytes."""
    policy, _ = base.read_json(ROOT / 'runtime/native/serialport-policy.json')
    present = any((app / pin['packagePath'] / 'eos-native-loader.cjs').exists() for pin in policy['packages'])
    if evidence_path is None:
        if present: raise base.EvidenceError('NATIVE_EVIDENCE_REQUIRED')
        return []
    evidence, evidence_hash = base.read_json(evidence_path)
    if not present or evidence.get('schemaVersion') != 1 or evidence.get('kind') != 'eos-serialport-native-normalization' or \
       evidence.get('profile') != policy['profile'] or evidence.get('platform') != policy['target']['platform'] or \
       evidence.get('nodeVersion') != policy['target']['nodeVersion'] or evidence.get('hardwareAccepted') is not False or \
       evidence.get('targetLoadProbeRequired') is not True or len(evidence.get('packages', [])) != len(policy['packages']):
        raise base.EvidenceError('NATIVE_EVIDENCE_IDENTITY')
    lock, _ = base.read_json(app / 'package-lock.json')
    compact_hash = lambda rows: hashlib.sha256(json.dumps(rows, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
    result = []
    for pin, record in zip(policy['packages'], evidence['packages']):
        original = pin['originalFiles']
        removed = [row for row in original if row['path'].endswith('.node') and row['path'] != pin['native']]
        added = {'path': 'eos-native-loader.cjs', 'bytes': pin['fixedLoaderBytes'], 'sha256': pin['fixedLoaderSha256']}
        expected = [({'path': row['path'], 'bytes': pin['patchedLoaderBytes'], 'sha256': pin['patchedLoaderSha256']}
                     if row['path'] == pin['loader'] else row) for row in original if row not in removed] + [added]
        expected.sort(key=lambda row: row['path'])
        original_hash, normalized_hash = compact_hash(original), compact_hash(expected)
        identity = {'profile': policy['profile'], 'packagePath': pin['packagePath'], 'package': pin['package'], 'version': pin['version'],
            'upstreamArchive': pin['archive'], 'upstreamIntegrity': pin['integrity'], 'upstreamArchiveSha256': pin['archiveSha256'],
            'originalTreeSha256': original_hash, 'normalizedTreeSha256': normalized_hash,
            'selectedNative': pin['packagePath'] + '/' + pin['native'], 'nativeSha256': pin['nativeSha256'],
            'napi': pin['napi'], 'targetProbeRequired': True, 'hardwareAccepted': False,
            'removedFiles': removed, 'addedFiles': [added], 'modifiedFiles': [{'path': pin['loader'],
                'originalSha256': next(row['sha256'] for row in original if row['path'] == pin['loader']), 'sha256': pin['patchedLoaderSha256']}],
            'lifecycleScriptsExecuted': False, 'targetCodeExecuted': False}
        if record != identity: raise base.EvidenceError('NATIVE_EVIDENCE_CONTENT')
        entry = lock['packages'].get(pin['packagePath'], {})
        if entry.get('version') != pin['version'] or entry.get('resolved') != pin['archive'] or entry.get('integrity') != pin['integrity'] or entry.get('link'):
            raise base.EvidenceError('NATIVE_LOCK_IDENTITY')
        directory = app / pin['packagePath']
        cursor = app
        for part in Path(pin['packagePath']).parts:
            cursor /= part
            if cursor.is_symlink(): raise base.EvidenceError('NATIVE_PATH_LINK')
        files = []
        # Every file is accounted for. Nested npm dependencies are inventoried
        # by the main lock-tree binder and are not part of this npm archive.
        def walk(directory, relative=''):
            for item in sorted(directory.iterdir()):
                if item.is_symlink(): raise base.EvidenceError('NATIVE_PATH_LINK')
                if item.name == 'node_modules' and item.is_dir(): continue
                name = (relative + '/' if relative else '') + item.name
                if item.is_dir(): walk(item, name); continue
                stat = item.stat()
                if not item.is_file() or stat.st_nlink != 1 or stat.st_size > 8 * 1024 * 1024 or len(files) >= 256:
                    raise base.EvidenceError('NATIVE_FILE_LIMIT')
                files.append({'path': name, 'bytes': stat.st_size, 'sha256': hashlib.sha256(item.read_bytes()).hexdigest()})
        walk(directory)
        files.sort(key=lambda row: row['path'])
        if files != expected: raise base.EvidenceError('NATIVE_PACKAGE_CONTENT')
        matches = [c for c in bom['components'] if c['name'] == pin['package'] and c['version'] == pin['version']]
        if len(matches) != 1: raise base.EvidenceError('NATIVE_COMPONENT')
        component = matches[0]
        upstream_hash = [{'alg': 'SHA-512', 'content': base64.b64decode(pin['integrity'][7:], validate=True).hex()}]
        if component.get('modified') or component.get('pedigree') or component.get('hashes') != upstream_hash:
            raise base.EvidenceError('NATIVE_UPSTREAM_HASH')
        ancestor = {k: component[k] for k in ['type', 'name', 'version', 'purl', 'hashes'] if k in component}
        component.pop('hashes')
        component['modified'] = True
        component['pedigree'] = {'ancestors': [ancestor], 'notes': 'EOS TEST derivative: only pinned ARM64/glibc prebuild retained; fixed verified loader; target dlopen required; hardware not accepted.'}
        claims = {'profile': policy['profile'], 'installed-path': pin['packagePath'], 'original-tree-sha256': original_hash,
                  'normalized-tree-sha256': normalized_hash, 'evidence-sha256': evidence_hash, 'target-load-probe-required': 'true'}
        component.setdefault('properties', []).extend({'name': 'eos:native:' + name, 'value': value} for name, value in claims.items())
        result.append({'packagePath': pin['packagePath'], 'version': pin['version'], **claims})
    return result

def bind(app, npm_sbom, transform=None, native_evidence=None):
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
    coverage['nativeTransformation'] = native_binding(app, bom, native_evidence)
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
    p.add_argument('--native-evidence', type=Path)
    a = p.parse_args()
    inputs = {(a.app/'package.json').resolve(), (a.app/'package-lock.json').resolve(), a.npm_sbom.resolve()}
    if a.transform_evidence: inputs.add(a.transform_evidence.resolve())
    if a.native_evidence: inputs.add(a.native_evidence.resolve())
    if a.out.resolve() == a.coverage.resolve() or a.out.resolve() in inputs or a.coverage.resolve() in inputs: raise base.EvidenceError('OUTPUT_COLLISION')
    bom, coverage = bind(a.app, a.npm_sbom, a.transform_evidence, a.native_evidence)
    for target, value in [(a.out, bom), (a.coverage, coverage)]:
        if target.is_symlink(): raise base.EvidenceError('OUTPUT_LINK')
        target.write_text(json.dumps(value, indent=2) + '\n')
    print(json.dumps({'installedNpmPackages': coverage['installedPackageCount'], 'embeddedPackages': len(coverage['embeddedPackages']), 'productReleaseApproved': False}))
