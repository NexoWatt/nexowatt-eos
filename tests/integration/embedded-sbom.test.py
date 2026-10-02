#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

file = Path(__file__).resolve().parents[2] / 'tools/integration/bind-sbom.py'
spec = importlib.util.spec_from_file_location('embedded_sbom', file)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class EmbeddedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.app = self.root / 'app'
        self.admin = self.app / 'node_modules/iobroker.eos-admin'; self.admin.mkdir(parents=True)
        self.write(self.app / 'package.json', {'name': 'eos', 'version': '1.0.0'})
        self.write(self.app / 'package-lock.json', {'lockfileVersion': 3, 'packages': {'': {'name': 'eos', 'version': '1.0.0'}, 'node_modules/iobroker.eos-admin': {'version': '7.10.11'}}})
        self.write(self.admin / 'package.json', {'name': 'iobroker.eos-admin', 'version': '7.10.11'})
        self.npm = self.root / 'npm.json'
        self.write(self.npm, {'bomFormat': 'CycloneDX', 'specVersion': '1.5', 'metadata': {'component': {'name': 'eos', 'version': '1.0.0', 'bom-ref': 'eos@1.0.0'}}, 'components': [{'type': 'application', 'name': 'iobroker.eos-admin', 'version': '7.10.11', 'bom-ref': 'admin'}], 'dependencies': [{'ref': 'eos@1.0.0', 'dependsOn': ['admin']}, {'ref': 'admin', 'dependsOn': []}]})
        self.embedded = self.admin / 'adminWww/lib/js/crypto-js'
        self.embedded.mkdir(parents=True)
        self.write(self.embedded / 'package.json', {'name': 'crypto-js', 'version': '4.2.0'})
        (self.embedded / 'index.js').write_text('fixture')
    def write(self, p, v): p.write_text(json.dumps(v))
    def test_vendored_package_is_separate_and_bound_to_actual_files(self):
        bom, coverage = module.bind(self.app, self.npm)
        self.assertEqual(coverage['embeddedPackageCount'], 1)
        self.assertEqual(coverage['embeddedPackages'][0]['files'], 2)
        self.assertEqual(len(bom['components']), 2)
        self.assertIn('bundled-frontend-dependency-attribution-beyond-explicit-embedded-packages', coverage['missingScope'])
    def add_ui_client(self):
        ui = self.app / 'node_modules/iobroker.nexowatt-ui'; ui.mkdir()
        self.write(ui / 'package.json', {'name': 'iobroker.nexowatt-ui', 'version': '1.0.21'})
        lock = json.loads((self.app / 'package-lock.json').read_text())
        lock['packages']['node_modules/iobroker.nexowatt-ui'] = {'version': '1.0.21'}
        self.write(self.app / 'package-lock.json', lock)
        bom = json.loads(self.npm.read_text())
        bom['components'].append({'type': 'application', 'name': 'iobroker.nexowatt-ui', 'version': '1.0.21', 'bom-ref': 'ui'})
        bom['dependencies'][0]['dependsOn'].append('ui')
        bom['dependencies'].append({'ref': 'ui', 'dependsOn': []})
        self.write(self.npm, bom)
        client = ui / 'packages/eos-license-client'; client.mkdir(parents=True)
        self.write(client / 'package.json', {'name': '@nexowatt/eos-license-client', 'version': '1.0.1'})
        (client / 'index.js').write_text('ui fixture')
        return client
    def test_ui_vendored_client_binds_to_ui_parent_not_admin(self):
        client = self.add_ui_client()
        bom, coverage = module.bind(self.app, self.npm)
        ref = 'eos-embedded:' + client.relative_to(self.app).as_posix()
        self.assertIn(ref, next(row for row in bom['dependencies'] if row['ref'] == 'ui')['dependsOn'])
        self.assertNotIn(ref, next(row for row in bom['dependencies'] if row['ref'] == 'admin')['dependsOn'])
        self.assertEqual(coverage['embeddedPackageCount'], 2)
        self.assertEqual(coverage['uniqueEmbeddedPackageCount'], 2)
        self.assertEqual(next(row for row in coverage['embeddedPackages'] if row['path'] == client.relative_to(self.app).as_posix())['parentPackage'], 'iobroker.nexowatt-ui')
    def test_identical_embedded_identity_preserves_both_file_instances(self):
        client = self.add_ui_client()
        admin_client = self.admin / 'packages/eos-license-client'; admin_client.mkdir(parents=True)
        (admin_client / 'package.json').write_bytes((client / 'package.json').read_bytes())
        (admin_client / 'index.js').write_text('different admin fixture')
        bom, coverage = module.bind(self.app, self.npm)
        clients = [row for row in coverage['embeddedPackages'] if row['name'] == '@nexowatt/eos-license-client']
        self.assertEqual(len(clients), 2)
        self.assertEqual(coverage['embeddedPackageCount'], 3)
        self.assertEqual(coverage['uniqueEmbeddedPackageCount'], 2)
        self.assertNotEqual(clients[0]['treeSha256'], clients[1]['treeSha256'])
        self.assertEqual(len({row['bom-ref'] for row in bom['components']}), len(bom['components']))
    def test_vendored_identity_tamper_rejected(self):
        self.write(self.embedded / 'package.json', {'name': 'other', 'version': '4.2.0'})
        with self.assertRaisesRegex(module.base.EvidenceError, 'EMBEDDED_IDENTITY'): module.bind(self.app, self.npm)
    def test_vendored_symlink_rejected(self):
        (self.embedded / 'escape').symlink_to('/etc/passwd')
        with self.assertRaisesRegex(module.base.EvidenceError, 'EMBEDDED_PATH_LINK'): module.bind(self.app, self.npm)
    def test_unknown_embedded_dependencies_are_not_silently_omitted(self):
        self.write(self.embedded / 'package.json', {'name': 'crypto-js', 'version': '4.2.0', 'dependencies': {'unknown': '*'}})
        with self.assertRaisesRegex(module.base.EvidenceError, 'EMBEDDED_DEPENDENCIES_UNINVENTORIED'): module.bind(self.app, self.npm)

if __name__ == '__main__': unittest.main()
