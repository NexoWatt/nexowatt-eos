'use strict';
// Exercise the actual workflow's Python request gate in disposable Git repos.
// No GitHub API, push, signing, network, credentials or system services are used.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const workflow = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/eos-r8-test-delivery.yml'), 'utf8');
const start = workflow.indexOf("          python3 -I -B - <<'PY'\n");
assert.ok(start > 0);
const script = workflow.slice(start + "          python3 -I -B - <<'PY'\n".length, workflow.indexOf('\n          PY', start)).split('\n').map(line => line.slice(10)).join('\n');
const marker = 'reports/integration/installable-test3-r8-20261004/BUILD_REQUEST.json';
function git(root, ...args) {
    const run = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 10000 });
    assert.equal(run.status, 0, run.stderr); return run.stdout.trim();
}
function commit(root, parents) {
    if (parents) {
        const tree = git(root, 'write-tree');
        const result = spawnSync('git', ['-C', root, 'commit-tree', tree, ...parents.flatMap(parent => ['-p', parent]), '-m', 'fixture merge'], {
            encoding: 'utf8', timeout: 10000, env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' },
        });
        assert.equal(result.status, 0, result.stderr); git(root, 'reset', '--hard', result.stdout.trim());
    } else git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'isolated fixture');
    return git(root, 'rev-parse', 'HEAD');
}
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r8-request-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    git(root, 'init', '-q'); fs.writeFileSync(path.join(root, 'source.cjs'), '// reviewed source\n'); git(root, 'add', 'source.cjs');
    const source = commit(root); fs.mkdirSync(path.dirname(path.join(root, marker)), { recursive: true });
    return { root, source };
}
function request(root, source, transform = value => JSON.stringify(value)) {
    fs.writeFileSync(path.join(root, marker), transform({ schemaVersion: 1, deliveryRevision: 8, sourceCommit: source }));
    git(root, 'add', marker);
}
function gate(root, event = 'push', sha = git(root, 'rev-parse', 'HEAD')) {
    return spawnSync('/usr/bin/python3', ['-I', '-B', '-c', script], { cwd: root, encoding: 'utf8', timeout: 10000,
        env: { PATH: process.env.PATH, GITHUB_EVENT_NAME: event, GITHUB_SHA: sha } });
}
test('automatic R8 delivery accepts the exact source-parent-bound request-only commit', t => {
    const { root, source } = fixture(t); request(root, source); commit(root);
    const result = gate(root); assert.equal(result.status, 0, result.stderr);
});
test('request gate rejects wrong parent, wrong revision, duplicate JSON keys and extra fields', t => {
    for (const transform of [value => JSON.stringify({ ...value, sourceCommit: 'a'.repeat(40) }),
        value => JSON.stringify({ ...value, deliveryRevision: 7 }), value => JSON.stringify({ ...value, extra: true }),
        value => JSON.stringify(value).replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1')]) {
        const { root, source } = fixture(t); request(root, source, transform); commit(root); assert.notEqual(gate(root).status, 0);
    }
});
test('request gate rejects unrelated source edits in the request commit and mismatched event head', t => {
    const { root, source } = fixture(t); request(root, source); fs.appendFileSync(path.join(root, 'source.cjs'), '// unreviewed\n');
    git(root, 'add', 'source.cjs'); commit(root); assert.notEqual(gate(root).status, 0);
    assert.notEqual(gate(root, 'push', source).status, 0);
});
test('request gate rejects a merge even when its request names one parent', t => {
    const { root, source } = fixture(t); fs.writeFileSync(path.join(root, 'second'), 'fixture'); git(root, 'add', 'second'); const second = commit(root);
    request(root, second); commit(root, [second, source]); assert.notEqual(gate(root).status, 0);
});
test('request-only marker refresh binds the new immediate source parent', t => {
    const { root, source } = fixture(t); request(root, source); const oldRequest = commit(root);
    request(root, oldRequest); commit(root); assert.equal(gate(root).status, 0);
});
test('manual dispatch cannot start a new unsigned delivery and only admits the later archive-authenticated resume phase', t => {
    const { root } = fixture(t); assert.notEqual(gate(root, 'workflow_dispatch').status, 0);
    const delivery = 'delivery/test-pi-0.2.0-test.3-r8'; fs.mkdirSync(path.join(root, delivery), { recursive: true });
    // Presence passes only this request gate. The later immutable publication
    // phase must verify real signatures, complete bytes and signed helper pins.
    for (const name of ['eos-0.2.0-test.3-linux-arm64.tar.gz', 'release-public.pem', 'delivery.json', 'bundle.sha256'])
        fs.writeFileSync(path.join(root, delivery, name), 'inert fixture bytes, not an accepted archive');
    git(root, 'add', delivery); commit(root); assert.equal(gate(root, 'workflow_dispatch').status, 0);
});
