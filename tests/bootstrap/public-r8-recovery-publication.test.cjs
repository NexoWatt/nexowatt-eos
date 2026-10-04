'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { compare, checkStage, commandReport, validateReadback, STAGES } = require('../../tools/bootstrap/prepare-public-r8-recovery-publication.cjs');
const { commandFor, configFor, OUTPUT, ARCHIVE, BASELINES, RETAINED_R7, SCOPE } = require('../../tools/bootstrap/build-public-r8-recovery-entry.cjs');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r8-recovery-publish-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}
function git(root, args) {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}
function commit(root) {
    git(root, ['-c', 'user.name=EOS fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'isolated fixture']);
    return git(root, ['rev-parse', 'HEAD']);
}
function repository(t) {
    const directory = fixture(t); git(directory, ['init', '-q']); fs.writeFileSync(path.join(directory, 'source.cjs'), '// reviewed source\n');
    git(directory, ['add', 'source.cjs']); const head = commit(directory);
    fs.mkdirSync(path.join(directory, OUTPUT), { recursive: true }); return { directory, head };
}
function stage(root, which) {
    for (const name of STAGES[which]) fs.writeFileSync(path.join(root, OUTPUT, name), '{}\n');
    git(root, ['add', '--', ...STAGES[which].map(name => `${OUTPUT}/${name}`)]);
}
test('public readback accepts only byte-identical regular files and independently checked pins', t => {
    const directory = fixture(t), local = path.join(directory, 'local'), remote = path.join(directory, 'remote');
    const bytes = Buffer.from('public release fixture\n'); fs.writeFileSync(local, bytes); fs.writeFileSync(remote, bytes);
    const expected = { bytes: bytes.length, sha256: sha(bytes) };
    assert.deepEqual(compare(local, remote, expected), expected);
    assert.throws(() => compare(local, remote, { ...expected, bytes: bytes.length + 1 }));
    assert.throws(() => compare(local, remote, { ...expected, sha256: 'a'.repeat(64) }));
    fs.writeFileSync(remote, Buffer.alloc(bytes.length, 65)); assert.throws(() => compare(local, remote, expected));
    fs.unlinkSync(remote); fs.symlinkSync(local, remote); assert.throws(() => compare(local, remote, expected));
    fs.unlinkSync(remote); fs.linkSync(local, remote); assert.throws(() => compare(local, remote, expected));
});
test('publication permits only all three new entry files at the exact source commit', t => {
    const { directory, head } = repository(t); stage(directory, 'entry');
    assert.equal(checkStage(directory, 'entry', head).ok, true);
    assert.throws(() => checkStage(directory, 'entry', 'a'.repeat(40)), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
    assert.throws(() => checkStage(directory, 'unknown', head), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
});
test('publication rejects an unrelated untracked file', t => {
    const { directory, head } = repository(t); stage(directory, 'entry'); fs.writeFileSync(path.join(directory, 'extra'), 'unreviewed');
    assert.throws(() => checkStage(directory, 'entry', head), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
});
test('publication rejects a staged source change', t => {
    const { directory, head } = repository(t); stage(directory, 'entry'); fs.writeFileSync(path.join(directory, 'source.cjs'), '// changed\n');
    git(directory, ['add', 'source.cjs']);
    assert.throws(() => checkStage(directory, 'entry', head), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
});
test('publication rejects missing generated files and local modification after staging', t => {
    const { directory, head } = repository(t); stage(directory, 'entry');
    git(directory, ['reset', '-q', 'HEAD', '--', `${OUTPUT}/remote-readback.json`]);
    assert.throws(() => checkStage(directory, 'entry', head), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
    git(directory, ['add', '--', `${OUTPUT}/remote-readback.json`]);
    fs.appendFileSync(path.join(directory, OUTPUT, 'recover.sh'), '# unreviewed\n');
    assert.throws(() => checkStage(directory, 'entry', head), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
});
test('publication rejects symlink entries rather than following them', t => {
    const { directory, head } = repository(t); stage(directory, 'entry');
    const file = path.join(directory, OUTPUT, 'recover.sh'); fs.unlinkSync(file); fs.symlinkSync('../../source.cjs', file);
    git(directory, ['add', '--', `${OUTPUT}/recover.sh`]);
    assert.throws(() => checkStage(directory, 'entry', head), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
});
function readbackFixture(assetCommit = 'c'.repeat(40), script = Buffer.from('#!/bin/bash\nexit 0\n')) {
    const key = Buffer.from(crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'pem', type: 'spki' }));
    const metadata = { schemaVersion: 1, runtimeVersion: '0.2.0-test.3', deliveryRevision: 8, releaseSequence: 11,
        platform: 'linux-arm64', archive: ARCHIVE, bytes: 321, sha256: 'a'.repeat(64), releaseId: 'b'.repeat(64),
        signingPublicKeySha256: sha(key), productionReleaseApproved: false, physicalControlEnabled: false };
    const config = configFor(assetCommit, metadata, key), serialized = Buffer.from(JSON.stringify(metadata));
    const preparation = { schemaVersion: 1, assetCommit, config, recoveryScope: SCOPE, acceptedBaselines: BASELINES, retainedTrial: RETAINED_R7, releaseId: config.releaseId, releaseSequence: 11, deliveryRevision: 8,
        installer: { bytes: script.length, sha256: sha(script) }, deliveryMetadata: { bytes: serialized.length, sha256: sha(serialized) },
        archiveSignatureVerified: true, archiveReadbackVerified: true };
    const remote = { schemaVersion: 1, kind: 'eos-r8-public-asset-readback', assetCommit, recoveryScope: SCOPE, repository: 'NexoWatt/nexowatt-eos', releaseId: config.releaseId,
        allExactBytesEqual: true, publicHttpsDownloadExecuted: true, redirectsAllowed: false, targetRecoveryExecuted: false, productionReleaseApproved: false,
        assets: [config.archive, config.key, { name: 'delivery.json', ...preparation.deliveryMetadata }].map(asset => ({ ...asset, url: `${config.baseUrl}/${asset.name}`, exactBytesEqual: true })) };
    return { preparation, remote };
}
function committedEntry(t) {
    const { directory, head } = repository(t), script = Buffer.from('#!/bin/bash\nexit 0\n');
    fs.writeFileSync(path.join(directory, OUTPUT, 'recover.sh'), script);
    const { preparation, remote } = readbackFixture(head, script);
    fs.writeFileSync(path.join(directory, OUTPUT, 'preparation.json'), JSON.stringify(preparation));
    fs.writeFileSync(path.join(directory, OUTPUT, 'remote-readback.json'), JSON.stringify(remote));
    git(directory, ['add', '--', OUTPUT]); const entryCommit = commit(directory);
    fs.writeFileSync(path.join(directory, OUTPUT, 'RECOVERY_COMMAND.txt'), commandFor(entryCommit, script));
    return { directory, entryCommit, script };
}
test('command report binds the committed entry and only the two new command files publish', t => {
    const { directory, entryCommit } = committedEntry(t);
    const report = commandReport(directory, entryCommit);
    assert.equal(report.entryCommit, entryCommit); assert.equal(report.commandMatchesPinnedEntry, true);
    assert.equal(report.targetRecoveryExecuted, false);
    git(directory, ['add', '--', `${OUTPUT}/RECOVERY_COMMAND.txt`, `${OUTPUT}/command-verification.json`]);
    assert.equal(checkStage(directory, 'command', entryCommit).ok, true);
});
test('command report rejects a mutable or mismatched command without writing evidence', t => {
    const { directory, entryCommit } = committedEntry(t);
    fs.writeFileSync(path.join(directory, OUTPUT, 'RECOVERY_COMMAND.txt'), 'curl https://example.invalid/main | bash\n');
    assert.throws(() => commandReport(directory, entryCommit), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
    assert.equal(fs.existsSync(path.join(directory, OUTPUT, 'command-verification.json')), false);
});

test('R8 recovery command requires full remote asset readback rather than a bare success flag', () => {
    const { preparation, remote } = readbackFixture(); assert.equal(validateReadback(remote, preparation), true);
    for (const mutate of [r => { r.assets.pop(); }, r => { r.assets[1] = r.assets[0]; }, r => { r.assets[0].sha256 = 'e'.repeat(64); },
        r => { r.assets[0].url = 'https://example.invalid/other'; }, r => { r.redirectsAllowed = true; }, r => { r.publicHttpsDownloadExecuted = false; },
        r => { r.assetCommit = 'd'.repeat(40); }, r => { r.assets[0].bytes++; }, r => { r.assets[1].exactBytesEqual = false; }]) {
        const candidate = structuredClone(remote); mutate(candidate);
        assert.throws(() => validateReadback(candidate, preparation), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
    }
    for (const mutate of [p => { p.acceptedBaselines.push({ revision: 5 }); }, p => { p.recoveryScope = 'all-existing'; }, p => { p.config.recoveryScope = 'all-existing'; },
        p => { p.retainedTrial.phase = 'ACTIVE'; }, p => { delete p.retainedTrial; }, p => { p.retainedTrial.publicKeySha256 = 'a'.repeat(64); }]) {
        const candidate = structuredClone(preparation); mutate(candidate);
        assert.throws(() => validateReadback(remote, candidate), /PUBLIC_R8_RECOVERY_PUBLICATION_REJECTED/);
    }
});
