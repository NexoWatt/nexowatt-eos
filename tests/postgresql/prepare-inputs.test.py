import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('inputs', Path(__file__).resolve().parents[2] / 'tools/system/prepare-inputs.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Inputs(unittest.TestCase):
    def test_password_bounds(self):
        for value in ['', 'short', 'x' * 129, 'x' * 14 + '\n', '😀' * 65]:
            self.assertFalse(module.valid_password(value))
        self.assertTrue(module.valid_password('fixture-only-password-123'))
        self.assertTrue(module.valid_password('ä' * 128))

    def test_reserved_and_injected_names(self):
        for value in ['admin', 'nexowatt', 'root', '../x', 'abc;ls', 'a', 'Uppercase']:
            self.assertFalse(module.valid_name(value))
        self.assertTrue(module.valid_name('installateur_1'))

    def test_private_exclusive_output(self):
        with tempfile.TemporaryDirectory(prefix='eos-input-test-') as tmp:
            file = Path(tmp) / 'input.json'
            module.write_new(file, '{}\n')
            self.assertEqual(file.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(FileExistsError):
                module.write_new(file, 'replacement')
            self.assertEqual(file.read_text(), '{}\n')

if __name__ == '__main__':
    unittest.main()
