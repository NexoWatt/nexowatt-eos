import importlib.util
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
                    item.mode = 0o644; item.size = len(data)
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
