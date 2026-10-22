"""Real archive parsing/tamper tests; synthetic bytes, no Node execution."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('node_archive', ROOT / 'tools/integration/node-runtime-archive.py')
subject = importlib.util.module_from_spec(spec)
spec.loader.exec_module(subject)


class NodeArchive(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)

    def archive(self, name='node.tar.xz', *, machine=183, binary_kind=tarfile.REGTYPE, duplicate=False, license=True):
        file = self.root / name
        binary = bytearray(64)
        binary[:7] = b'\x7fELF\x02\x01\x01'
        binary[16:18] = (3).to_bytes(2, 'little')
        binary[18:20] = machine.to_bytes(2, 'little')
        with tarfile.open(file, 'w:xz') as archive:
            # npm links and unrelated contents are never materialized.
            link = tarfile.TarInfo('node-v24.22.1-linux-arm64/bin/npm')
            link.type, link.linkname = tarfile.SYMTYPE, '../../outside'
            archive.addfile(link)
            for unused in range(2 if duplicate else 1):
                entry = tarfile.TarInfo('node-v24.22.1-linux-arm64/bin/node')
                entry.type, entry.size = binary_kind, len(binary) if binary_kind == tarfile.REGTYPE else 0
                if entry.issym(): entry.linkname = '/untrusted/node'
                archive.addfile(entry, io.BytesIO(binary) if entry.size else None)
            if license:
                entry = tarfile.TarInfo('node-v24.22.1-linux-arm64/LICENSE')
                entry.size = 15
                archive.addfile(entry, io.BytesIO(b'License fixture'))
        return file, hashlib.sha256(file.read_bytes()).hexdigest(), bytes(binary)

    def test_exact_selected_binary_and_complete_license_with_metadata(self):
        source, digest, binary = self.archive()
        target = self.root / 'node-runtime'
        result = subject.extract(source, target, '24.22.1', 'linux-arm64', digest)
        self.assertEqual((target / 'bin/node').read_bytes(), binary)
        self.assertEqual((target / 'LICENSE').read_bytes(), b'License fixture')
        self.assertEqual(result['binarySha256'], hashlib.sha256(binary).hexdigest())
        self.assertEqual(result['archiveSha256'], digest)
        self.assertEqual(json.loads((target / 'runtime.json').read_text()), result)
        self.assertEqual((target / 'bin/node').stat().st_mode & 0o777, 0o755)
        self.assertEqual(sorted(p.relative_to(target).as_posix() for p in target.rglob('*') if p.is_file()), ['LICENSE', 'bin/node', 'runtime.json'])

    def test_hash_mismatch_fails_before_output(self):
        source, unused, binary = self.archive()
        target = self.root / 'node-runtime'
        with self.assertRaises(ValueError): subject.extract(source, target, '24.22.1', 'linux-arm64', '0' * 64)
        self.assertFalse(target.exists())

    def test_wrong_architecture_links_duplicates_missing_license_remove_partial_output(self):
        for index, values in enumerate([{'machine': 62}, {'binary_kind': tarfile.SYMTYPE}, {'duplicate': True}, {'license': False}]):
            with self.subTest(values=values):
                source, digest, unused = self.archive(str(index) + '.tar.xz', **values)
                target = self.root / ('node-runtime-' + str(index))
                with self.assertRaises(ValueError): subject.extract(source, target, '24.22.1', 'linux-arm64', digest)
                self.assertFalse(target.exists())

    def test_existing_destination_and_archive_links_are_preserved_and_rejected(self):
        source, digest, unused = self.archive()
        target = self.root / 'existing'
        target.mkdir()
        (target / 'keep').write_text('unchanged')
        with self.assertRaises(ValueError): subject.extract(source, target, '24.22.1', 'linux-arm64', digest)
        self.assertEqual((target / 'keep').read_text(), 'unchanged')
        link = self.root / 'linked.tar.xz'
        link.symlink_to(source)
        with self.assertRaises(ValueError): subject.extract(link, self.root / 'out', '24.22.1', 'linux-arm64', digest)

    def test_production_cli_accepts_only_reviewed_policy_pins(self):
        source, unused, binary = self.archive()
        for version in ['24.22.1', '24.99.0', '26.0.0']:
            with self.subTest(version=version), self.assertRaises((ValueError, KeyError)):
                subject.main(['--archive', str(source), '--output', str(self.root / 'out'), '--version', version, '--platform', 'linux-arm64'])
        self.assertFalse((self.root / 'out').exists())


if __name__ == '__main__':
    unittest.main()
