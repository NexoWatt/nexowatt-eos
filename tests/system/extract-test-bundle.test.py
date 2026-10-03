#!/usr/bin/env python3
import hashlib
import gzip
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('extract_test_bundle', ROOT / 'tools/system/extract-test-bundle.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(prefix='eos-checkout-extract-')
        self.root = Path(self.scratch.name)
        self.archive = self.root / 'input.tar.gz'
        self.target = self.root / 'unpacked'

    def tearDown(self):
        self.scratch.cleanup()

    def write(self, extra=None):
        with tarfile.open(self.archive, 'w:gz') as tar:
            for name, content in [('bundle/manifest.json', b'{}'), ('bundle/manifest.sig', b'x' * 64),
                                  ('bundle/payload/app/entry.cjs', b'fixture-only')]:
                row = tarfile.TarInfo(name)
                row.mode, row.uid, row.gid, row.size = 0o644, 0, 0, len(content)
                tar.addfile(row, io.BytesIO(content))
            if extra:
                row, content = extra
                row.size = len(content)
                tar.addfile(row, io.BytesIO(content))
        return hashlib.sha256(self.archive.read_bytes()).hexdigest()

    def test_regular_members_are_data_only_and_exact(self):
        result = module.extract(self.archive, self.target, self.write())
        self.assertEqual(result['files'], 3)
        self.assertFalse(result['signatureVerified'])
        self.assertFalse(result['codeExecuted'])
        self.assertEqual((self.target / 'bundle/payload/app/entry.cjs').read_bytes(), b'fixture-only')

    def test_bad_pin_or_existing_destination_preserves_existing_data(self):
        digest = self.write()
        with self.assertRaises(ValueError): module.extract(self.archive, self.target, '0' * 64)
        self.assertFalse(self.target.exists())
        self.target.mkdir()
        (self.target / 'keep').write_bytes(b'keep')
        with self.assertRaises(ValueError): module.extract(self.archive, self.target, digest)
        self.assertEqual((self.target / 'keep').read_bytes(), b'keep')

    def test_traversal_absolute_duplicate_and_unrelated_members_fail_before_writes(self):
        for name in ['../escape', '/root/escape', 'bundle/payload/../escape', 'bundle\\payload\\escape',
                     'bundle/manifest.json', 'bundle/payload/app', 'bundle/unknown', 'other/file',
                     'bundle/payload/prototype/escape', 'bundle/payload/x:y']:
            with self.subTest(name=name):
                row = tarfile.TarInfo(name); row.mode = 0o644
                digest = self.write((row, b'attack'))
                with self.assertRaises(ValueError): module.extract(self.archive, self.target, digest)
                self.assertFalse(self.target.exists())

    def test_links_devices_and_unsafe_permissions_rejected_before_writes(self):
        for kind, mode, uid in [(tarfile.SYMTYPE, 0o644, 0), (tarfile.LNKTYPE, 0o644, 0),
                                (tarfile.FIFOTYPE, 0o644, 0), (tarfile.CHRTYPE, 0o644, 0),
                                (tarfile.REGTYPE, 0o666, 0), (tarfile.REGTYPE, 0o4755, 0),
                                (tarfile.REGTYPE, 0o644, 1000)]:
            with self.subTest(kind=kind, mode=mode, uid=uid):
                row = tarfile.TarInfo('bundle/payload/evil')
                row.type, row.mode, row.uid, row.linkname = kind, mode, uid, '/outside'
                digest = self.write((row, b''))
                with self.assertRaises(ValueError): module.extract(self.archive, self.target, digest)
                self.assertFalse(self.target.exists())

    def test_oversized_pax_is_bounded_before_parser_or_writes(self):
        row = tarfile.TarInfo('PaxHeader')
        row.type, row.size = tarfile.XHDTYPE, 128 * 1024 ** 2
        with gzip.open(self.archive, 'wb') as stream:
            stream.write(row.tobuf())
        digest = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        with self.assertRaises(ValueError): module.extract(self.archive, self.target, digest)
        self.assertFalse(self.target.exists())

    def test_pax_metadata_cannot_override_size_or_ownership(self):
        row = tarfile.TarInfo('bundle/payload/extra'); row.mode = 0o644
        row.pax_headers = {'uid': '0'}
        digest = self.write((row, b'extra'))
        with self.assertRaises(ValueError): module.extract(self.archive, self.target, digest)
        self.assertFalse(self.target.exists())


if __name__ == '__main__':
    unittest.main()
