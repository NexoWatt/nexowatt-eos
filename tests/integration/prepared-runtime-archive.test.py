import importlib.util
import gzip
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('prepared_archive', ROOT / 'tools/integration/prepared-runtime-archive.py')
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)

class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.source = self.base / 'source'
        self.source.mkdir()
        (self.source / 'app').mkdir()
        (self.source / 'app/main.js').write_text('module.exports = 1;\n')
        for name in archive.FILES | archive.NODE_FILES:
            (self.source / name).parent.mkdir(parents=True, exist_ok=True)
            (self.source / name).write_text('{}\n')
        (self.source / 'do-not-ship-secret.txt').write_text('excluded fixture marker')

    def tearDown(self):
        self.temp.cleanup()

    def test_deterministic_allowlist_and_safe_roundtrip(self):
        one, two = self.base / 'one.tar.gz', self.base / 'two.tar.gz'
        first = archive.pack(self.source, one)
        self.assertFalse(first['signed'])
        archive.pack(self.source, two)
        self.assertEqual(one.read_bytes(), two.read_bytes())
        target = self.base / 'restored'
        archive.extract(one, target)
        self.assertEqual((target / 'app/main.js').read_bytes(), (self.source / 'app/main.js').read_bytes())
        self.assertFalse((target / 'do-not-ship-secret.txt').exists())
        self.assertEqual(set(archive.read_members(one)), {'app/main.js', *archive.FILES, *archive.NODE_FILES})

    def test_links_missing_files_and_output_collision_fail(self):
        (self.source / 'app/link').symlink_to(self.source / 'runtime-build.json')
        with self.assertRaises(ValueError):
            archive.pack(self.source, self.base / 'bad.tar.gz')
        (self.source / 'app/link').unlink()
        (self.source / 'catalog.json').unlink()
        with self.assertRaises(ValueError):
            archive.pack(self.source, self.base / 'missing.tar.gz')

    def test_node_only_transport_keeps_actual_sources_without_inventing_fresh_npm_inputs(self):
        record = {'nodeOnlyUpdate': {'kind': 'retained-signed-runtime-node-update-v1'}}
        (self.source / 'runtime-build.json').write_text(json.dumps(record))
        for name in archive.FILES - archive.NODE_ONLY_FILES:
            (self.source / name).unlink()
        source = self.base / 'node-only.tar.gz'
        archive.pack(self.source, source)
        target = self.base / 'node-only-restored'
        archive.extract(source, target)
        self.assertEqual(set(archive.read_members(source)), {'app/main.js', *archive.NODE_ONLY_FILES, *archive.NODE_FILES})
        self.assertEqual(json.loads((target / 'runtime-build.json').read_text()), record)
        self.assertFalse((target / 'runtime.npm.cdx.json').exists())
        (self.source / 'runtime-build.json').write_text('{}')
        with self.assertRaises(ValueError):
            archive.pack(self.source, self.base / 'unmarked.tar.gz')

    def test_node_only_transport_rejects_unknown_provenance_and_missing_lock(self):
        (self.source / 'runtime-build.json').write_text('{"nodeOnlyUpdate":{"kind":"unknown"}}')
        with self.assertRaises(ValueError):
            archive.pack(self.source, self.base / 'unknown.tar.gz')
        (self.source / 'runtime-build.json').write_text('{"nodeOnlyUpdate":{"kind":"retained-signed-runtime-node-update-v1"}}')
        (self.source / 'resolution-lock.json').unlink()
        with self.assertRaises(ValueError):
            archive.pack(self.source, self.base / 'node-no-lock.tar.gz')

    def test_oversized_pax_and_malformed_transport_metadata_are_rejected_before_output(self):
        oversized = self.base / 'oversized-pax.tar.gz'
        pax = tarfile.TarInfo('PaxHeader')
        pax.type, pax.size = tarfile.XHDTYPE, 1024 * 1024 * 1024
        with gzip.open(oversized, 'wb') as target:
            target.write(pax.tobuf(format=tarfile.PAX_FORMAT))
        with self.assertRaises(ValueError):
            archive.extract(oversized, self.base / 'pax-output')
        self.assertFalse((self.base / 'pax-output').exists())
        valid = self.base / 'valid-metadata.tar.gz'
        archive.pack(self.source, valid)
        with tarfile.open(valid, 'r:gz') as source:
            rows = [(item, source.extractfile(item).read()) for item in source]
        for changed in [{'schemaVersion': True}, {'schemaVersion': 2}, {'extra': True}]:
            target = self.base / ('metadata-' + str(len(changed)) + '-' + str(next(iter(changed.values()))) + '.tar.gz')
            metadata = json.loads(rows[0][1])
            metadata.update(changed)
            with tarfile.open(target, 'w:gz') as tar:
                for index, (item, data) in enumerate(rows):
                    if index == 0:
                        data = json.dumps(metadata).encode()
                        item.size = len(data)
                    tar.addfile(item, io.BytesIO(data))
            output = self.base / (target.stem + '-output')
            with self.assertRaises(ValueError):
                archive.extract(target, output)
            self.assertFalse(output.exists())

    def test_archive_member_tampering_is_rejected_before_output(self):
        source = self.base / 'valid.tar.gz'
        archive.pack(self.source, source)
        with tarfile.open(source, 'r:gz') as tar:
            rows = [(item, tar.extractfile(item).read()) for item in tar]
        for variant in ['traversal', 'symlink', 'changed', 'extra', 'missing']:
            destination = self.base / (variant + '.tar.gz')
            with tarfile.open(destination, 'w:gz') as tar:
                for index, (item, data) in enumerate(rows):
                    item = tarfile.TarInfo(item.name)
                    item.mode = 0o644; item.size = len(data); item.mtime = archive.contract.MTIME
                    if index == 1:
                        if variant == 'traversal': item.name = '../escaped'
                        if variant == 'symlink': item.type = tarfile.SYMTYPE; item.linkname = '/etc/passwd'; item.size = 0; data = b''
                        if variant == 'changed': data = b'X' * len(data)
                        if variant == 'missing': continue
                    tar.addfile(item, io.BytesIO(data))
                if variant == 'extra':
                    extra = tarfile.TarInfo('app/extra.js'); extra.size = 1; extra.mode = 0o644
                    tar.addfile(extra, io.BytesIO(b'x'))
            output = self.base / ('out-' + variant)
            with self.assertRaises(ValueError):
                archive.extract(destination, output)
            self.assertFalse(output.exists())

if __name__ == '__main__':
    unittest.main()
