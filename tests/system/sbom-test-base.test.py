#!/usr/bin/env python3
"""Positive/negative evidence-binding tests; no external packages or networking."""
import importlib.util
import json
import hashlib
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import subprocess

MODULE = Path(__file__).resolve().parents[2] / 'tools/sbom/test_base.py'
spec = importlib.util.spec_from_file_location('test_base_sbom', MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class BindingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.app = self.root / 'app'
        (self.app / 'node_modules/example').mkdir(parents=True)
        self.package = {'name': 'eos-test', 'version': '0.1.0-test.1'}
        self.lock = {'lockfileVersion': 3, 'packages': {'': self.package,
                     'node_modules/example': {'version': '1.2.3'},
                     'node_modules/optional': {'version': '2.0.0', 'optional': True}}}
        self.bom = {'bomFormat': 'CycloneDX', 'specVersion': '1.5', 'metadata': {'component': {
            'name': 'app', 'version': '0.1.0-test.1', 'bom-ref': 'eos-test@0.1.0-test.1'}},
            'components': [{'name': 'example', 'version': '1.2.3', 'bom-ref': 'example@1.2.3'}],
            'dependencies': [{'ref': 'eos-test@0.1.0-test.1', 'dependsOn': ['example@1.2.3']},
                             {'ref': 'example@1.2.3', 'dependsOn': []}]}
        self.write('package.json', self.package)
        self.write('node_modules/example/package.json', {'name': 'example', 'version': '1.2.3'})
    def tearDown(self): self.temp.cleanup()
    def write(self, name, data): (self.app / name).write_text(json.dumps(data))
    def bind(self):
        self.write('package-lock.json', self.lock)
        (self.root / 'npm.json').write_text(json.dumps(self.bom))
        return module.bind_inventory(self.app, self.root / 'npm.json')
    def test_bound_actual_tree_with_explicit_platform_omission(self):
        bom, coverage = self.bind()
        self.assertEqual(coverage['installedPackageCount'], 1)
        self.assertEqual(coverage['omittedOptionalPaths'], ['node_modules/optional'])
        self.assertFalse(coverage['targetDeviceObserved'])
        self.assertFalse(coverage['productReleaseApproved'])
        self.assertEqual(bom['metadata']['component']['name'], 'eos-test')
    def test_rejects_changed_installed_version(self):
        self.write('node_modules/example/package.json', {'name': 'example', 'version': '1.2.4'})
        with self.assertRaisesRegex(module.EvidenceError, 'INSTALLED_PACKAGE_SBOM_LOCK_MISMATCH'): self.bind()
    def test_rejects_required_package_missing(self):
        self.lock['packages']['node_modules/optional']['optional'] = False
        with self.assertRaisesRegex(module.EvidenceError, 'REQUIRED_PACKAGE_NOT_INSTALLED'): self.bind()
    def test_rejects_path_escape(self):
        self.lock['packages']['node_modules/../../external'] = {'version': '1.0.0'}
        with self.assertRaisesRegex(module.EvidenceError, 'UNSUPPORTED_PACKAGE_PATH'): self.bind()
    def test_rejects_symlink(self):
        (self.app / 'node_modules/optional').symlink_to(self.app / 'node_modules/example')
        with self.assertRaisesRegex(module.EvidenceError, 'SYMLINK_PACKAGE_PATH'): self.bind()
    def test_rejects_uninstalled_sbom_component(self):
        self.bom['components'].append({'name': 'fabricated', 'version': '1.0.0', 'bom-ref': 'fabricated@1.0.0'})
        with self.assertRaisesRegex(module.EvidenceError, 'SBOM_COMPONENT_NOT_INSTALLED'): self.bind()
    def test_rejects_dangling_graph(self):
        self.bom['dependencies'][0]['dependsOn'].append('unobserved@1.0.0')
        with self.assertRaisesRegex(module.EvidenceError, 'DANGLING_DEPENDENCY_REFERENCE'): self.bind()
    def test_rejects_malformed_manifest_identity(self):
        self.write('node_modules/example/package.json', {'name': {}, 'version': '1.2.3'})
        with self.assertRaisesRegex(module.EvidenceError, 'INVALID_INSTALLED_MANIFEST_IDENTITY'): self.bind()
    def transformed_fixture(self):
        records = []
        for name in ('iobroker.js-controller', '@iobroker/js-controller-cli'):
            directory = self.app / 'node_modules' / name
            directory.mkdir(parents=True)
            self.write('node_modules/' + name + '/package.json', {'name': name, 'version': '7.2.2'})
            self.lock['packages']['node_modules/' + name] = {'version': '7.2.2'}
            self.bom['components'].append({'type': 'library', 'name': name, 'version': '7.2.2',
                'bom-ref': name + '@7.2.2', 'purl': 'pkg:npm/' + name + '@7.2.2',
                'hashes': [{'alg': 'SHA-512', 'content': 'a' * 128}]})
            file = directory / 'test-profile.cjs'
            file.write_text('module.exports = {};\n')
            records.append({'relativePath': str(file.relative_to(self.app)), 'originalSha256': None,
                            'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
        evidence = {'schemaVersion': 1, 'kind': 'eos-controller-transform-evidence', 'controllerVersion': '7.2.2',
                    'productionApproved': False, 'files': records}
        target = self.root / 'transform.json'
        target.write_text(json.dumps(evidence))
        self.bind()
        return target, evidence
    def test_modified_components_have_original_hashes_in_ancestor_only(self):
        target, evidence = self.transformed_fixture()
        bom, coverage = module.bind_inventory(self.app, self.root / 'npm.json', target)
        modified = [c for c in bom['components'] if c.get('modified')]
        self.assertEqual(len(modified), 2)
        for component in modified:
            self.assertNotIn('hashes', component)
            self.assertEqual(component['pedigree']['ancestors'][0]['hashes'][0]['content'], 'a' * 128)
            table = [{'relativePath': row['relativePath'], 'sha256': row['sha256']} for row in evidence['files']
                     if row['relativePath'].startswith('node_modules/' + component['name'] + '/')]
            table.sort(key=lambda row: row['relativePath'])
            digest = hashlib.sha256(json.dumps(table, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
            self.assertIn({'name': 'eos:transform:file-table-sha256', 'value': digest}, component['properties'])
        self.assertEqual(coverage['transformation']['localFileHashesVerified'], 2)
        self.assertIn('first-party-tools-and-bootstrap-code-covered-by-release-file-table', coverage['missingScope'])
    def test_modified_file_requires_exact_hash(self):
        target, evidence = self.transformed_fixture()
        (self.app / evidence['files'][0]['relativePath']).write_text('changed')
        with self.assertRaisesRegex(module.EvidenceError, 'TRANSFORM_FILE_HASH_MISMATCH'):
            module.bind_inventory(self.app, self.root / 'npm.json', target)
    def test_python_transform_digest_is_accepted_by_javascript_release_gate(self):
        target, evidence = self.transformed_fixture()
        bom, _ = module.bind_inventory(self.app, self.root / 'npm.json', target)
        (self.root / 'sbom.cdx.json').write_text(json.dumps(bom))
        profile = {'schemaVersion': 1, 'kind': 'eos-controller-profile-verification',
                   'controllerVersion': '7.2.2', 'productionApproved': False, 'files': evidence['files']}
        release = MODULE.parents[2] / 'runtime/release'
        script = ('const fs=require("node:fs");const {verifySbomBinding}=require(process.argv[1]);'
                  'const {inventory}=require(process.argv[2]);const root=process.argv[3];'
                  'const profile=JSON.parse(fs.readFileSync(0,"utf8"));'
                  'process.stdout.write(JSON.stringify(verifySbomBinding(root,inventory(root),profile)));')
        result = subprocess.run(['node', '-e', script, str(release / 'sbom-binding.cjs'),
                                 str(release / 'bundle.cjs'), str(self.root)], input=json.dumps(profile),
                                check=True, capture_output=True, text=True, timeout=10)
        self.assertEqual(json.loads(result.stdout)['installedPackages'], 3)
    def test_both_transformed_components_must_be_reported(self):
        target, evidence = self.transformed_fixture()
        evidence['files'].pop()
        target.write_text(json.dumps(evidence))
        with self.assertRaisesRegex(module.EvidenceError, 'INCOMPLETE_TRANSFORM_COMPONENT_SCOPE'):
            module.bind_inventory(self.app, self.root / 'npm.json', target)
    def test_transform_rejects_path_traversal(self):
        target, evidence = self.transformed_fixture()
        evidence['files'][0]['relativePath'] = 'node_modules/../outside'
        target.write_text(json.dumps(evidence))
        with self.assertRaisesRegex(module.EvidenceError, 'INVALID_TRANSFORM_FILE'):
            module.bind_inventory(self.app, self.root / 'npm.json', target)
    def websocket_fixture(self):
        target, evidence = self.transformed_fixture()
        for name, version in [('iobroker.eos-admin', '7.10.11'), ('@iobroker/ws-server', '4.5.1')]:
            directory = self.app / 'node_modules' / name
            directory.mkdir(parents=True)
            self.write('node_modules/' + name + '/package.json', {'name': name, 'version': version})
            self.lock['packages']['node_modules/' + name] = {'version': version}
            self.bom['components'].append({'type': 'library', 'name': name, 'version': version,
                'bom-ref': name + '@' + version, 'hashes': [{'alg': 'SHA-512', 'content': 'b' * 128}]})
        # Synthetic bytes isolate the binder contract. Actual transport bytes
        # are verified by the later build integration, never claimed here.
        output = b'const MAX_PAYLOAD = 1048576;\n'
        file = self.app / module.WEBSOCKET_TRANSFORM['file']
        file.parent.mkdir(); file.write_bytes(output)
        digest = hashlib.sha256(output).hexdigest()
        evidence['files'].append({'relativePath': module.WEBSOCKET_TRANSFORM['file'],
            'originalSha256': module.WEBSOCKET_TRANSFORM['original'], 'sha256': digest})
        self.write(module.PROFILE_PATH, {'schemaVersion': 1, 'kind': 'eos-controller-test-profile',
            'controllerVersion': '7.2.2', 'adapters': [dict(module.ADMIN_PROFILE)]})
        evidence['files'].append({'relativePath': module.PROFILE_PATH, 'originalSha256': None,
            'sha256': hashlib.sha256((self.app / module.PROFILE_PATH).read_bytes()).hexdigest()})
        target.write_text(json.dumps(evidence)); self.bind()
        return target, evidence, digest
    def bind_websocket_fixture(self, target, digest):
        with patch.dict(module.WEBSOCKET_TRANSFORM, {'output': digest}):
            return module.bind_inventory(self.app, self.root / 'npm.json', target)
    def test_websocket_reviewed_constants_match_runtime_transform(self):
        contract = MODULE.parents[2] / 'runtime/controller-profile/websocket-bound.cjs'
        actual = json.loads(subprocess.run(['node', '-e',
            'const m=require(process.argv[1]); process.stdout.write(JSON.stringify({file:m.FILE,original:m.ORIGINAL,output:m.OUTPUT}));',
            str(contract)], check=True, capture_output=True, text=True).stdout)
        for key, value in actual.items(): self.assertEqual(module.WEBSOCKET_TRANSFORM[key], value)
    def test_exact_transport_binding_marks_ancestor_without_weakening_core_scope(self):
        target, _, digest = self.websocket_fixture()
        bom, coverage = self.bind_websocket_fixture(target, digest)
        ws = next(row for row in bom['components'] if row['name'] == '@iobroker/ws-server')
        self.assertTrue(ws['modified']); self.assertNotIn('hashes', ws)
        self.assertEqual(ws['pedigree']['ancestors'][0]['hashes'][0]['content'], 'b' * 128)
        self.assertEqual(coverage['transformation']['modifiedComponents'],
            ['@iobroker/js-controller-cli', '@iobroker/ws-server', 'iobroker.js-controller'])
    def test_transport_binding_rejects_unreviewed_original(self):
        target, evidence, digest = self.websocket_fixture()
        evidence['files'][2]['originalSha256'] = 'f' * 64; target.write_text(json.dumps(evidence))
        with self.assertRaisesRegex(module.EvidenceError, 'WEBSOCKET_TRANSFORM_BINDING'):
            self.bind_websocket_fixture(target, digest)
    def test_transport_binding_rejects_unreviewed_output(self):
        target, _, _ = self.websocket_fixture()
        with self.assertRaisesRegex(module.EvidenceError, 'WEBSOCKET_TRANSFORM_BINDING'):
            module.bind_inventory(self.app, self.root / 'npm.json', target)
    def test_transport_binding_rejects_wrong_package_version(self):
        target, _, digest = self.websocket_fixture()
        self.write('node_modules/@iobroker/ws-server/package.json', {'name': '@iobroker/ws-server', 'version': '4.5.0'})
        self.lock['packages']['node_modules/@iobroker/ws-server']['version'] = '4.5.0'
        next(row for row in self.bom['components'] if row['name'] == '@iobroker/ws-server')['version'] = '4.5.0'
        self.bind()
        with self.assertRaisesRegex(module.EvidenceError, 'WEBSOCKET_TRANSFORM_BINDING'):
            self.bind_websocket_fixture(target, digest)
    def test_transport_requires_bound_admin_profile(self):
        target, evidence, digest = self.websocket_fixture()
        evidence['files'].pop(); target.write_text(json.dumps(evidence))
        with self.assertRaisesRegex(module.EvidenceError, 'WEBSOCKET_TRANSFORM_ADMIN_PROFILE'):
            self.bind_websocket_fixture(target, digest)
    def test_admin_profile_requires_transport_record(self):
        target, evidence, digest = self.websocket_fixture()
        evidence['files'].pop(2); target.write_text(json.dumps(evidence))
        with self.assertRaisesRegex(module.EvidenceError, 'INCOMPLETE_TRANSFORM_COMPONENT_SCOPE'):
            self.bind_websocket_fixture(target, digest)
    def test_transport_without_admin_admission_is_rejected(self):
        target, evidence, digest = self.websocket_fixture()
        self.write(module.PROFILE_PATH, {'adapters': []})
        evidence['files'][-1]['sha256'] = hashlib.sha256((self.app / module.PROFILE_PATH).read_bytes()).hexdigest()
        target.write_text(json.dumps(evidence))
        with self.assertRaisesRegex(module.EvidenceError, 'INCOMPLETE_TRANSFORM_COMPONENT_SCOPE'):
            self.bind_websocket_fixture(target, digest)
    def test_transport_cannot_replace_required_core_component(self):
        target, evidence, digest = self.websocket_fixture()
        evidence['files'].pop(1); target.write_text(json.dumps(evidence))
        with self.assertRaisesRegex(module.EvidenceError, 'INCOMPLETE_TRANSFORM_COMPONENT_SCOPE'):
            self.bind_websocket_fixture(target, digest)
    def test_transport_rejects_arbitrary_second_file(self):
        target, evidence, digest = self.websocket_fixture()
        evidence['files'].append({**evidence['files'][2], 'relativePath': 'node_modules/@iobroker/ws-server/build/other.js'})
        target.write_text(json.dumps(evidence))
        with self.assertRaisesRegex(module.EvidenceError, 'UNKNOWN_TRANSFORM_COMPONENT'):
            self.bind_websocket_fixture(target, digest)
    def test_local_archive_integrity_is_not_labeled_upstream(self):
        self.lock['packages']['node_modules/example'].update({'resolved': 'file:../packages/example.tgz', 'integrity': 'sha512-example'})
        _, coverage = self.bind()
        row = coverage['installedPackages'][0]
        self.assertEqual(row['archiveSource'], 'local-build-artifact')
        self.assertEqual(row['archiveIntegrity'], 'sha512-example')
        self.assertIsNone(row['upstreamArchiveIntegrity'])
    def test_rejects_duplicate_json(self):
        (self.root / 'duplicate.json').write_text('{"x":1,"x":2}')
        with self.assertRaisesRegex(module.EvidenceError, 'DUPLICATE_JSON_KEY'): module.read_json(self.root / 'duplicate.json')
    def test_exact_lock_alias_is_reported_without_inventing_new_component(self):
        self.lock['packages']['node_modules/example']['name'] = 'actual-package'
        self.write('node_modules/example/package.json', {'name': 'actual-package', 'version': '1.2.3'})
        self.bom['components'][0]['name'] = 'actual-package'
        _, coverage = self.bind()
        row = coverage['installedPackages'][0]
        self.assertEqual(row['name'], 'actual-package')
        self.assertEqual(row['installedAs'], 'example')
        self.assertTrue(row['alias'])
    def test_alias_requires_explicit_matching_lock_identity(self):
        self.write('node_modules/example/package.json', {'name': 'actual-package', 'version': '1.2.3'})
        self.bom['components'][0]['name'] = 'actual-package'
        with self.assertRaisesRegex(module.EvidenceError, 'PACKAGE_ALIAS_IDENTITY_MISMATCH'): self.bind()
    def test_npm_alias_label_requires_matching_real_purl_and_reference(self):
        self.lock['packages']['node_modules/example']['name'] = 'actual-package'
        self.write('node_modules/example/package.json', {'name': 'actual-package', 'version': '1.2.3'})
        c = self.bom['components'][0]
        c['bom-ref'] = 'actual-package@1.2.3'
        c['purl'] = 'pkg:npm/actual-package@1.2.3'
        self.bom['dependencies'][0]['dependsOn'] = [c['bom-ref']]
        self.bom['dependencies'][1]['ref'] = c['bom-ref']
        bom, _ = self.bind()
        self.assertEqual(bom['components'][0]['name'], 'actual-package')
        self.assertIn({'name': 'eos:npm-original-alias-label', 'value': 'example'}, bom['components'][0]['properties'])
        c['purl'] = 'pkg:npm/unrelated@1.2.3'
        with self.assertRaisesRegex(module.EvidenceError, 'SBOM_ALIAS_REFERENCE_MISMATCH'): self.bind()
    def test_malformed_lock_alias_is_rejected(self):
        self.lock['packages']['node_modules/example']['name'] = '../example'
        with self.assertRaisesRegex(module.EvidenceError, 'PACKAGE_ALIAS_IDENTITY_MISMATCH'): self.bind()

if __name__ == '__main__': unittest.main()
