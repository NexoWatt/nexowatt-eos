#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

file = Path(__file__).resolve().parents[2] / 'tools/integration/source-inventory.py'
spec = importlib.util.spec_from_file_location('source_inventory', file)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SourceInventoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for key in module.IDS:
            p = self.root / 'components' / key
            p.mkdir(parents=True)
            self.write(p / 'package.json', {'name': 'iobroker.' + key, 'version': '1.0.0', 'main': 'main.js', 'dependencies': {'example': '^2.0.0'}, 'scripts': {'prepack': 'untrusted-command'}})
            (p / 'main.js').write_text('not executed')
    def write(self, file, value): file.write_text(json.dumps(value))
    def test_source_presence_never_approves_or_implies_device_test(self):
        register, bom = module.inventory(self.root)
        self.assertFalse(register['productReleaseApproved'])
        self.assertEqual(len(bom['components']), 6)
        for row in register['components']:
            self.assertEqual(row['admission'], 'pending')
            self.assertEqual(row['deviceTest'], 'not-executed')
            self.assertEqual(row['lifecycleScriptsPresent'], ['prepack'])
    def test_stale_lock_root_recorded_instead_of_silently_trusted(self):
        self.write(self.root / 'components/eebus/package-lock.json', {'lockfileVersion': 3, 'packages': {'': {'name': 'iobroker.eebus', 'version': '0.0.1'}, 'node_modules/example': {'version': '2.3.4', 'dev': True}}})
        register, bom = module.inventory(self.root)
        row = next(r for r in register['components'] if r['id'] == 'eebus')
        self.assertFalse(row['locks'][0]['rootMatchesAdjacentManifest'])
        c = next(c for c in bom['components'] if c['name'] == 'example')
        self.assertIn({'name': 'eos:scope', 'value': 'declared-lock-entry-not-proven-installed-or-bundled'}, c['properties'])
        self.assertEqual(c['version'], '2.3.4')
    def test_manifest_symlink_rejected(self):
        target = self.root / 'components/ui/package.json'
        data = target.read_bytes(); target.unlink()
        other = self.root / 'foreign.json'; other.write_bytes(data)
        target.symlink_to(other)
        with self.assertRaisesRegex(ValueError, 'SOURCE_INPUT'): module.inventory(self.root)
    def test_missing_compiled_main_not_reported_as_ready(self):
        (self.root / 'components/eebus/main.js').unlink()
        register, _ = module.inventory(self.root)
        self.assertFalse(next(r for r in register['components'] if r['id'] == 'eebus')['mainPresentInSource'])
    def test_explicit_product_version_is_bound_and_validated(self):
        register, bom = module.inventory(self.root, product_version='0.2.0-dev.7')
        self.assertEqual(register['productVersion'], '0.2.0-dev.7')
        self.assertEqual(bom['metadata']['component']['version'], '0.2.0-dev.7')
        with self.assertRaisesRegex(ValueError, 'SOURCE_PRODUCT_VERSION'):
            module.inventory(self.root, product_version='not-a-release\n')

if __name__ == '__main__': unittest.main()
