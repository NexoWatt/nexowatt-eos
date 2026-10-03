#!/usr/bin/env python3
"""Isolated publication-boundary tests; synthetic archive, no release claim."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('r5_publication', Path(__file__).with_name('publish-candidate.py'))
P = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(P)
COMMIT = 'a' * 40


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'source'
        self.candidate = Path(self.tmp.name) / 'candidate'
        self.root.mkdir(); self.candidate.mkdir()
        for name in P.OUTPUTS:
            target = self.candidate / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text('{}\n')
        archive = self.candidate / P.DELIVERY / P.ARCHIVE
        archive.write_bytes(b'synthetic-publication-fixture')
        key = self.candidate / P.DELIVERY / 'release-public.pem'
        key.write_text('synthetic-public-key-fixture\n')
        ah, kh = P.digest(archive), P.digest(key)
        self.delivery = dict(deliveryRevision=5, releaseSequence=8, platform='linux-arm64', runtimeVersion='0.2.0-test.3',
            productionReleaseApproved=False, physicalControlEnabled=False, privateKeyPersisted=False,
            archiveReadbackVerified=True, archive=P.ARCHIVE, releaseId='b'*64,
            sha256=ah, bytes=archive.stat().st_size, signingPublicKeySha256=kh)
        self.build = dict(sourceCommit=COMMIT, deliveryRevision=5, releaseSequence=8,
            previousSignatureVerified=True, finalSignatureVerified=True, sourceBindingPassed=True,
            signedArchiveReadbackPassed=True, exactOverlayDeltaChecked=True, historicalDeliveryFilesUnchanged=42,
            nativeTargetExecutionPerformed=False, piUpdatePerformed=False, hardwareTested=False,
            productionReleaseApproved=False, archiveSha256=ah, signingPublicKeySha256=kh)
        self.binding = dict(allMatched=True, sourceCommit=COMMIT, releaseId='b'*64,
                            archiveSha256=ah, signingPublicKeySha256=kh)
        self.write(P.DELIVERY + '/delivery.json', self.delivery)
        self.write(P.REPORT + '/delivery.json', self.delivery)
        self.write(P.REPORT + '/build-verification.json', self.build)
        self.write(P.REPORT + '/signed-source-binding.json', self.binding)
        (self.candidate / P.DELIVERY / 'bundle.sha256').write_text(ah+'  '+P.ARCHIVE+'\n'+kh+'  release-public.pem\n')

    def write(self, name, data):
        (self.candidate / name).write_text(json.dumps(data)+'\n')

    def validate(self):
        return P.validate_candidate(self.candidate, self.root, COMMIT)

    def test_exact_candidate_and_repeated_source(self):
        name = P.REPORT + '/build-revision.cjs'
        target = self.root / name; target.parent.mkdir(parents=True); target.write_text('trusted-source\n')
        (self.candidate / name).write_text('trusted-source\n')
        self.assertEqual(len(self.validate()), len(P.OUTPUTS)+1)
        self.assertFalse((self.root / P.DELIVERY).exists())

    def test_arbitrary_new_code_or_document_is_rejected(self):
        for name in ['README.md', P.REPORT+'/unexpected.js']:
            with self.subTest(name=name):
                target = self.candidate / name; target.write_text('unreviewed')
                with self.assertRaises(ValueError): self.validate()
                target.unlink()

    def test_reviewed_source_cannot_be_replaced(self):
        name = P.REPORT + '/build-revision.cjs'
        target = self.root / name; target.parent.mkdir(parents=True); target.write_text('trusted')
        (self.candidate / name).write_text('replaced')
        with self.assertRaises(ValueError): self.validate()

    def test_existing_delivery_is_never_overwritten(self):
        (self.root / P.DELIVERY).mkdir(parents=True)
        with self.assertRaises(ValueError): self.validate()

    def test_links_and_missing_outputs_are_rejected(self):
        target = self.candidate / P.REPORT / 'runtime.cdx.json'
        target.unlink()
        with self.assertRaises(ValueError): self.validate()
        target.symlink_to(self.candidate / P.REPORT / 'delivery.json')
        with self.assertRaises(ValueError): self.validate()

    def test_bad_hash_and_source_bindings_are_rejected(self):
        for key, value in [('sourceCommit','c'*40),('archiveSha256','c'*64),('signingPublicKeySha256','c'*64),('allMatched',False)]:
            with self.subTest(key=key):
                self.write(P.REPORT+'/signed-source-binding.json', {**self.binding, key:value})
                with self.assertRaises(ValueError): self.validate()
        self.write(P.REPORT+'/signed-source-binding.json', self.binding)
        with (self.candidate / P.DELIVERY / P.ARCHIVE).open('ab') as stream: stream.write(b'tamper')
        with self.assertRaises(ValueError): self.validate()

    def test_unperformed_target_checks_cannot_be_claimed(self):
        for key in ['nativeTargetExecutionPerformed','piUpdatePerformed','hardwareTested','productionReleaseApproved']:
            with self.subTest(key=key):
                self.write(P.REPORT+'/build-verification.json', {**self.build,key:True})
                with self.assertRaises(ValueError): self.validate()

    def test_failed_or_missing_build_gates_block_publication(self):
        for key in ['previousSignatureVerified','finalSignatureVerified','sourceBindingPassed','signedArchiveReadbackPassed','exactOverlayDeltaChecked']:
            with self.subTest(key=key):
                self.write(P.REPORT+'/build-verification.json', {**self.build,key:False})
                with self.assertRaises(ValueError): self.validate()


if __name__ == '__main__': unittest.main()
