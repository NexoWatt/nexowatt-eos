#!/usr/bin/env python3
"""Isolated publication-boundary tests; synthetic archive, no release claim."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
from types import SimpleNamespace
import subprocess

SPEC = importlib.util.spec_from_file_location('r8_publication', Path(__file__).with_name('publish-candidate.py'))
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
        self.delivery = dict(deliveryRevision=8, releaseSequence=11, platform='linux-arm64', runtimeVersion='0.2.0-test.3',
            productionReleaseApproved=False, physicalControlEnabled=False, privateKeyPersisted=False,
            archiveReadbackVerified=True, archive=P.ARCHIVE, releaseId='b'*64, sourceCommit=COMMIT,
            sha256=ah, bytes=archive.stat().st_size, signingPublicKeySha256=kh)
        self.build = dict(sourceCommit=COMMIT, deliveryRevision=8, releaseSequence=11,
            previousSignatureVerified=True, finalSignatureVerified=True, sourceBindingPassed=True,
            signedArchiveReadbackPassed=True, exactOverlayDeltaChecked=True, applicationUnchanged=True, historicalDeliveryFilesUnchanged=42, postgresqlRuntimeAndAppIdentical=True,
            nativeTargetExecutionPerformed=False, piUpdatePerformed=False, hardwareTested=False,
            productionReleaseApproved=False, archiveSha256=ah, signingPublicKeySha256=kh)
        self.binding = dict(allMatched=True, sourceCommit=COMMIT, releaseId='b'*64,
                            archiveSha256=ah, signingPublicKeySha256=kh, applicationUnchanged=True, overlays=[])
        self.write(P.DELIVERY + '/delivery.json', self.delivery)
        self.write(P.REPORT + '/delivery.json', self.delivery)
        self.write(P.REPORT + '/build-verification.json', self.build)
        self.write(P.REPORT + '/signed-source-binding.json', self.binding)
        for name in ['assembled-admin-oauth.tap', 'assembled-objects-lifecycle.tap', 'assembled-host-object.tap']:
            (self.candidate / P.REPORT / name).write_text('TAP version 13\nok 1 - synthetic contract\n1..1\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n')
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

    def test_application_change_or_missing_identity_claim_is_rejected(self):
        self.write(P.REPORT+'/build-verification.json', {**self.build, 'applicationUnchanged':False})
        with self.assertRaises(ValueError): self.validate()
        self.write(P.REPORT+'/build-verification.json', self.build)
        self.write(P.REPORT+'/signed-source-binding.json', {**self.binding, 'overlays':[{'target':'app/code.js'}]})
        with self.assertRaises(ValueError): self.validate()

    def test_failed_trusted_checkout_verification_prevents_every_copy(self):
        results = [SimpleNamespace(stdout=COMMIT+'\n'), SimpleNamespace(stdout=''),
                   subprocess.CalledProcessError(1, ['trusted-verifier'])]
        with mock.patch.object(P, 'ROOT', self.root), mock.patch.object(P.shutil, 'which', return_value='/pinned/node'), \
                mock.patch.object(P.subprocess, 'run', side_effect=results) as call:
            with self.assertRaises(subprocess.CalledProcessError): P.main(str(self.candidate), COMMIT)
        verifier = call.call_args_list[2].args[0]
        self.assertEqual(verifier, ['/pinned/node', str(self.root/P.REPORT/'verify-candidate.cjs'), str(self.candidate), COMMIT])
        self.assertFalse((self.root/P.DELIVERY).exists())
        self.assertFalse((self.root/P.REPORT).exists())

    def test_failed_or_missing_build_gates_block_publication(self):
        for key in ['previousSignatureVerified','finalSignatureVerified','sourceBindingPassed','signedArchiveReadbackPassed','exactOverlayDeltaChecked','postgresqlRuntimeAndAppIdentical']:
            with self.subTest(key=key):
                self.write(P.REPORT+'/build-verification.json', {**self.build,key:False})
                with self.assertRaises(ValueError): self.validate()

    def test_failed_empty_skipped_or_ambiguous_tap_is_rejected(self):
        target = self.candidate / P.REPORT / 'assembled-host-object.tap'
        good = target.read_text()
        for value in ['', '{}\n', good.replace('# pass 1', '# pass 0'),
                      good.replace('# tests 1', '# tests 0').replace('# pass 1', '# pass 0'),
                      good.replace('# skipped 0', '# skipped 1'),
                      good.replace('# todo 0', '# todo 1'),
                      good.replace('# cancelled 0', '# cancelled 1'),
                      good.replace('ok 1 -', 'not ok 1 -'), good + '# tests 1\n']:
            with self.subTest(value=value):
                target.write_text(value)
                with self.assertRaises(ValueError): self.validate()

    def test_duplicate_keys_and_nonfinite_json_are_rejected(self):
        target = self.candidate / P.REPORT / 'build-verification.json'
        for value in ['{"sourceCommit":"a","sourceCommit":"b"}', '{"bad":NaN}', '{"bad":Infinity}']:
            with self.subTest(value=value):
                target.write_text(value)
                with self.assertRaises(ValueError): self.validate()

    def test_hardlinked_candidate_file_is_rejected(self):
        target = self.candidate / P.REPORT / 'runtime.cdx.json'
        link = Path(self.tmp.name) / 'shared-content'
        import os
        os.link(target, link)
        with self.assertRaises(ValueError): self.validate()

    def test_publication_target_parent_symlink_is_rejected(self):
        elsewhere = Path(self.tmp.name) / 'elsewhere'; elsewhere.mkdir()
        (self.root / 'delivery').symlink_to(elsewhere, target_is_directory=True)
        with self.assertRaises(ValueError): self.validate()
        self.assertEqual(list(elsewhere.iterdir()), [])

    def test_duplicate_checksum_lines_are_rejected(self):
        target = self.candidate / P.DELIVERY / 'bundle.sha256'
        with target.open('a') as stream: stream.write(target.read_text().splitlines()[0] + '\n')
        with self.assertRaises(ValueError): self.validate()

    def test_wrong_head_or_dirty_checkout_blocks_verifier_and_copy(self):
        for responses in [[SimpleNamespace(stdout='c'*40+'\n')],
                          [SimpleNamespace(stdout=COMMIT+'\n'), SimpleNamespace(stdout=' M runtime/example.cjs\n')]]:
            with self.subTest(responses=responses), mock.patch.object(P, 'ROOT', self.root), \
                    mock.patch.object(P.subprocess, 'run', side_effect=responses) as call:
                with self.assertRaises(ValueError): P.main(str(self.candidate), COMMIT)
                self.assertEqual(call.call_count, len(responses))
                self.assertFalse((self.root / P.DELIVERY).exists())

    def test_success_copies_only_generated_files_after_trusted_verification(self):
        name = P.REPORT + '/build-revision.cjs'
        target = self.root / name; target.parent.mkdir(parents=True); target.write_text('trusted-source\n')
        (self.candidate / name).write_text('trusted-source\n')
        results = [SimpleNamespace(stdout=COMMIT+'\n'), SimpleNamespace(stdout=''), SimpleNamespace(stdout='{}\n')]
        with mock.patch.object(P, 'ROOT', self.root), mock.patch.object(P.shutil, 'which', return_value='/pinned/node'), \
                mock.patch.object(P.subprocess, 'run', side_effect=results):
            P.main(str(self.candidate), COMMIT)
        for name in P.OUTPUTS:
            self.assertEqual(P.digest(self.root / name), P.digest(self.candidate / name))
            self.assertEqual((self.root / name).stat().st_mode & 0o777, 0o644)
        self.assertEqual(target.read_text(), 'trusted-source\n')


if __name__ == '__main__': unittest.main()
