'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { selectArtifact } = require('../../tools/bootstrap/find-r11-native-artifact.cjs');
const sourceCommit = 'a'.repeat(40);
function artifact() { return { total_count: 1, artifacts: [{ id: 7, name: `eos-own-adapters-native-${sourceCommit}`, expired: false, size_in_bytes: 1024,
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
    const source = fs.readFileSync(path.resolve(__dirname, '../../tools/bootstrap/find-r11-native-artifact.cjs'), 'utf8');
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
        await assert.rejects(module.exports.requestArtifacts(123, 'non-secret-test-fixture'), /R11_NATIVE_ARTIFACT_REJECTED/);
        assert.equal(requestedTimeout, 5000); assert.equal(destroyed, true);
        if (mode !== 'timeout') assert.equal(responseDestroyed, true);
    }
});

test('network artifact must have its own exact source-bound name and cannot be substituted by component evidence', () => {
    const value=artifact();
    assert.throws(()=>selectArtifact(value,sourceCommit,123,'network'));
    value.artifacts[0].name=`eos-network-native-${sourceCommit}`;
    assert.equal(selectArtifact(value,sourceCommit,123,'network').artifactId,7);
    assert.throws(()=>selectArtifact(value,sourceCommit,123,'own'));
    assert.throws(()=>selectArtifact(value,sourceCommit,123,'arbitrary'));
});
