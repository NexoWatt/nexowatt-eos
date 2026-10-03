import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('publish_candidate', Path(__file__).with_name('publish-candidate.py'))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class CandidateScope(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'checkout'
        self.candidate = Path(self.temp.name) / 'candidate'
        self.root.mkdir()
        for i in range(20):
            file = self.candidate / publisher.REPORT / f'fixture-{i}.json'
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('{}\n')

    def test_accepts_expected_new_files_and_exact_source_repetition(self):
        source = self.candidate / publisher.REPORT / 'fixture-0.json'
        target = self.root / publisher.REPORT / 'fixture-0.json'
        target.parent.mkdir(parents=True)
        target.write_bytes(source.read_bytes())
        self.assertEqual(len(publisher.candidate_files(self.candidate, self.root)), 20)

    def test_rejects_outside_scope_before_copying_any_file(self):
        extra = self.candidate / '.github/workflows/unreviewed.yml'
        extra.parent.mkdir(parents=True)
        extra.write_text('unreviewed')
        with self.assertRaises(ValueError):
            publisher.candidate_files(self.candidate, self.root)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_rejects_source_overwrite(self):
        existing = self.root / publisher.REPORT / 'fixture-0.json'
        existing.parent.mkdir(parents=True)
        existing.write_text('reviewed source')
        with self.assertRaises(ValueError):
            publisher.candidate_files(self.candidate, self.root)
        self.assertEqual(existing.read_text(), 'reviewed source')

    def test_rejects_symlink_in_artifact(self):
        (self.candidate / publisher.REPORT / 'link').symlink_to(self.root)
        with self.assertRaises(ValueError):
            publisher.candidate_files(self.candidate, self.root)


if __name__ == '__main__':
    unittest.main()
