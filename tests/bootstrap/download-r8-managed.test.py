#!/usr/bin/python3
"""Transport fixtures only; no network, APT, systemd or target migration."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import unittest
import uuid
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("r8download", ROOT / "tools/bootstrap/download-r8-managed.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def config():
    return {"schemaVersion": 1, "releaseId": "b" * 64,
            "url": "https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-" + "b" * 64 + "/eos-linux-arm64.tar.gz",
            "bytes": 3, "sha256": hashlib.sha256(b"abc").hexdigest()}


def staging():
    directory = Path("/root") / ("eos-r8-managed-" + uuid.uuid4().hex[:8])
    directory.mkdir(mode=0o700)
    return directory


class DownloadTests(unittest.TestCase):
    def test_fixed_archive_contract(self):
        self.assertEqual(module.validate(config()), config())
        for patch_value in [{"bytes": True}, {"bytes": 0}, {"bytes": 257 * 1024**2}, {"sha256": "no"},
                            {"releaseId": "a" * 64}, {"extra": "private"}, {"url": config()["url"] + "?x=1"},
                            {"url": config()["url"].replace("github.com", "evil.test")}]:
            with self.assertRaises(module._host.Rejected):
                module.validate({**config(), **patch_value})

    @unittest.skipUnless(os.geteuid() == 0, "protected /root staging fixture requires local root")
    def test_actual_digest_and_exclusive_destination_with_stubbed_network(self):
        # Fixed production staging admission is retained; this local fixture
        # only creates temporary files. The network function is substituted.
        directory = staging()
        self.addCleanup(shutil.rmtree, directory)
        file = directory / "download.json"
        file.write_text(json.dumps(config()))
        os.chmod(file, 0o600)
        def receive(url, destination, size):
            self.assertEqual(url, config()["url"])
            self.assertEqual(size, 3)
            destination.write_bytes(b"abc")
        with patch.object(module._host, "download_github_asset", receive):
            report = module.download(str(file))
            self.assertEqual(report, {"ok": True, "archiveHashVerified": True, "signatureVerified": False, "hostChanged": False})
            self.assertEqual((directory / "eos-linux-arm64.tar.gz").read_bytes(), b"abc")
            with self.assertRaises(FileExistsError):
                module.download(str(file))

    @unittest.skipUnless(os.geteuid() == 0, "protected /root staging fixture requires local root")
    def test_corrupt_archive_and_duplicate_config_fail(self):
        directory = staging()
        self.addCleanup(shutil.rmtree, directory)
        file = directory / "download.json"
        file.write_text(json.dumps(config()))
        os.chmod(file, 0o600)
        with patch.object(module._host, "download_github_asset", lambda _u, p, _n: p.write_bytes(b"bad")):
            with self.assertRaises(module._host.Rejected):
                module.download(str(file))
        file.write_text('{"schemaVersion":1,"schemaVersion":1}')
        with patch.object(module._host, "download_github_asset") as download:
            with self.assertRaises(module._host.Rejected):
                module.download(str(file))
            download.assert_not_called()


if __name__ == "__main__":
    unittest.main()
