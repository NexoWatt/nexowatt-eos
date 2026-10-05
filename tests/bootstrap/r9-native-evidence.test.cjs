'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { CHECKS, appHash, validate, passedTap } = require('../../tools/bootstrap/verify-r9-native-evidence.cjs');
const { selectArtifact } = require('../../tools/bootstrap/find-r9-native-artifact.cjs');
const sourceCommit = 'a'.repeat(40), appContentSha256 = 'b'.repeat(64);
const tap = 'TAP version 13\nok 1 - fixture\n1..1\n# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
function fixture() { return { sourceCommit, appContentSha256, tap,
    preparation: { schemaVersion: 1, kind: 'unsigned-r9-native-preparation', signed: false, sequence: 12, nodeVersion: '24.21.0', sourceCommit, appContentSha256,
        previousSignatureVerified: true, previousReleaseId: 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7' },
    evidence: { schemaVersion: 1, kind: 'eos-r9-native-management', passed: true, signed: false, sequence: 12, nodeVersion: '24.21.0', sourceCommit, licenseFormat: 'NWL3',
        appContentSha256, hardwareTested: false, productionReleaseApproved: false, checks: Object.fromEntries(CHECKS.map(name => [name, true])) } }; }
test('native gate requires exact source and unsigned app content before signing', () => { assert.equal(validate(fixture()).ok, true); });
test('failed, absent, skipped, ambiguous or unrelated source evidence blocks signing', () => {
    for (const change of [v => { v.sourceCommit = 'c'.repeat(40); }, v => { v.appContentSha256 = 'd'.repeat(64); },
        v => { v.evidence.passed = false; }, v => { v.evidence.signed = true; }, v => { v.evidence.hardwareTested = true; },
        v => { v.preparation.previousSignatureVerified = false; }, v => { v.evidence.productionReleaseApproved = true; },
        v => { v.evidence.sequence = 11; }, v => { v.evidence.nodeVersion = '24.19.0'; },
        v => { v.evidence.licenseFormat = 'NWL2'; }, v => { delete v.evidence.licenseFormat; }]) {
        const value = fixture(); change(value); assert.throws(() => validate(value));
    }
    for (const check of CHECKS) { const value = fixture(); value.evidence.checks[check] = false; assert.throws(() => validate(value)); }
    for (const bad of ['', tap + '# tests 1\n', tap.replace('ok 1', 'not ok 1'), tap.replace('# skipped 0', '# skipped 1'),
        tap.replace('# pass 1', '# pass 0')]) assert.throws(() => passedTap(bad));
});
test('app inventory binds each size/hash/path, ignores only root fixture modes and uses deterministic ASCII ordering', () => {
    const rows = [{ path: 'app/z', size: 2, sha256: 'd'.repeat(64), mode: 420 }, { path: 'app/a', size: 1, sha256: 'e'.repeat(64), mode: 420 }];
    const original = appHash(rows);
    assert.equal(appHash(rows.toReversed().map(row => ({ ...row, mode: 256 }))), original);
    assert.equal(appHash(rows.map(row => ({ ...row, path: row.path.slice(4) })), ''), original);
    for (const key of ['size', 'sha256', 'path']) { const other = structuredClone(rows); other[0][key] = key === 'size' ? 3 : key === 'path' ? 'app/y' : 'f'.repeat(64); assert.notEqual(appHash(other), original); }
    assert.throws(() => appHash([...rows, rows[0]])); assert.throws(() => appHash([]));
});
function artifact() { return { total_count: 1, artifacts: [{ id: 7, name: `eos-r9-native-${sourceCommit}`, expired: false, size_in_bytes: 1024,
    digest: 'sha256:' + 'b'.repeat(64), workflow_run: { id: 123, head_sha: sourceCommit, head_branch: 'main' } }] }; }
test('native artifact metadata binds exact run/source/digest and bounds download size', () => { assert.equal(selectArtifact(artifact(), sourceCommit, 123).artifactId, 7); });
test('expired, duplicate, oversized or foreign native artifacts are rejected before download', () => {
    for (const change of [v => { v.artifacts[0].expired = true; }, v => { v.artifacts[0].size_in_bytes = 13 * 1024 * 1024; },
        v => { v.artifacts[0].workflow_run.id++; }, v => { v.artifacts[0].workflow_run.head_sha = 'c'.repeat(40); },
        v => { v.artifacts[0].digest = ''; }, v => { v.total_count = 2; v.artifacts.push(v.artifacts[0]); }]) {
        const value = artifact(); change(value); assert.throws(() => selectArtifact(value, sourceCommit, 123));
    }
});

test('native artifact HTTPS lookup aborts the live request at one five-second deadline and bounds response bytes', async () => {
    const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
    const { EventEmitter } = require('node:events');
    const source = fs.readFileSync(path.resolve(__dirname, '../../tools/bootstrap/find-r9-native-artifact.cjs'), 'utf8');
    for (const mode of ['timeout', 'oversize', 'redirect']) {
        const request = new EventEmitter(); let destroyed = false, responseDestroyed = false, requestedTimeout;
        request.destroy = () => { destroyed = true; };
        const module = { exports: {} };
        vm.runInNewContext(source, { module, exports: module.exports, Buffer,
            setTimeout(callback, ms) { requestedTimeout = ms; return setTimeout(callback, 5); }, clearTimeout,
            require(name) {
                if (name === 'node:fs') return {};
                assert.equal(name, 'node:https');
                return { get(options, callback) {
                    assert.equal(options.hostname, 'api.github.com'); assert.equal(options.rejectUnauthorized, true);
                    assert.equal(options.agent, false); assert.equal(options.maxHeaderSize, 16384);
                    if (mode !== 'timeout') queueMicrotask(() => {
                        const response = new EventEmitter(); response.statusCode = mode === 'redirect' ? 302 : 200;
                        response.headers = { 'content-type': 'application/json' }; response.destroy = () => { responseDestroyed = true; };
                        callback(response);
                        if (mode === 'oversize') response.emit('data', Buffer.alloc(1024 * 1024 + 1));
                    });
                    return request;
                } };
            },
        });
        await assert.rejects(module.exports.requestArtifacts(123, 'non-secret-test-fixture'), /R9_NATIVE_ARTIFACT_REJECTED/);
        assert.equal(requestedTimeout, 5000); assert.equal(destroyed, true);
        if (mode !== 'timeout') assert.equal(responseDestroyed, true);
    }
});
