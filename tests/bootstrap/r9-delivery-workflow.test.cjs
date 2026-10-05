'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { evaluate, MARKER } = require('../../tools/bootstrap/check-r9-delivery-request.cjs');
const workflow = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/eos-r9-test-delivery.yml'), 'utf8');
function git(root, ...args) { const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); }
function commit(root) { git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'isolated request fixture'); return git(root, 'rev-parse', 'HEAD'); }
function fixture(t, transform = value => JSON.stringify(value, null, 2)) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r9-request-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    git(root, 'init', '-q'); fs.writeFileSync(path.join(root, 'source'), 'reviewed'); git(root, 'add', 'source'); const parent = commit(root);
    fs.mkdirSync(path.dirname(path.join(root, MARKER)), { recursive: true });
    fs.writeFileSync(path.join(root, MARKER), transform({ schemaVersion: 1, deliveryRevision: 9, sourceCommit: parent }));
    git(root, 'add', MARKER); const head = commit(root); return { root, parent, head };
}
function event(head) { return { repository: { full_name: 'NexoWatt/nexowatt-eos' }, workflow_run: { id: 123, run_attempt: 1,
    repository: { full_name: 'NexoWatt/nexowatt-eos' }, head_repository: { full_name: 'NexoWatt/nexowatt-eos' },
    head_branch: 'main', head_sha: head, event: 'push', conclusion: 'success', status: 'completed', path: '.github/workflows/security-review.yml' } }; }
test('marker-only push requests but only its exact successful Security run permits signing', t => {
    const { root, head } = fixture(t);
    assert.equal(evaluate(root, 'push', event(head), head).eligible, false);
    const result = evaluate(root, 'workflow_run', event(head), head);
    assert.equal(result.eligible, true); assert.equal(result.sourceCommit, head); assert.equal(result.securityRunId, '123');
});
test('ordinary source and generated delivery commits never request another R9', t => {
    const { root, head } = fixture(t); fs.writeFileSync(path.join(root, 'source'), 'new source'); git(root, 'add', 'source'); const next = commit(root);
    assert.equal(evaluate(root, 'workflow_run', event(next), next).eligible, false);
    assert.throws(() => evaluate(root, 'workflow_run', event(head), next));
});
test('wrong source parent, duplicate marker keys, extra fields and wrong revision are refused', t => {
    for (const change of [v => JSON.stringify({ ...v, sourceCommit: 'a'.repeat(40) }, null, 2),
        v => JSON.stringify({ ...v, deliveryRevision: 8 }, null, 2), v => JSON.stringify({ ...v, extra: true }, null, 2),
        v => JSON.stringify(v, null, 2).replace('"schemaVersion": 1', '"schemaVersion": 1, "schemaVersion": 1')]) {
        const { root, head } = fixture(t, change); assert.throws(() => evaluate(root, 'workflow_run', event(head), head));
    }
});
test('foreign repo, wrong workflow, run type, branch, result or tested source cannot approve delivery', t => {
    const { root, head } = fixture(t);
    for (const change of [e => { e.workflow_run.repository.full_name = 'other/repo'; }, e => { e.workflow_run.head_repository.full_name = 'fork/repo'; },
        e => { e.workflow_run.path = '.github/workflows/other.yml'; }, e => { e.workflow_run.event = 'pull_request'; },
        e => { e.workflow_run.conclusion = 'failure'; }, e => { e.workflow_run.status = 'in_progress'; },
        e => { e.workflow_run.head_sha = 'b'.repeat(40); }, e => { e.workflow_run.head_branch = 'work'; }, e => { e.workflow_run.id = '123'; }]) {
        const value = event(head); change(value); assert.throws(() => evaluate(root, 'workflow_run', value, head));
    }
});
test('dispatch is limited to an already tracked immutable complete four-file R9 delivery', t => {
    const { root, head } = fixture(t); assert.throws(() => evaluate(root, 'workflow_dispatch', event(head), head));
    const delivery = path.join(root, 'delivery/test-pi-0.2.0-test.3-r9'); fs.mkdirSync(delivery, { recursive: true });
    for (const name of ['eos-0.2.0-test.3-linux-arm64.tar.gz', 'release-public.pem', 'delivery.json', 'bundle.sha256']) fs.writeFileSync(path.join(delivery, name), 'inert presence fixture');
    git(root, 'add', 'delivery'); const next = commit(root); assert.equal(evaluate(root, 'workflow_dispatch', event(next), next).build, false);
});
test('workflow only downloads a pinned-run digest artifact and signs after mandatory native comparison', () => {
    assert.match(workflow, /workflows: \[EOS security regression\]/);
    assert.match(workflow, /paths: \[\.github\/eos-r9-build-request\.json\]/);
    assert.match(workflow, /run-id: \$\{\{ needs.request.outputs.security_run_id \}\}/);
    assert.match(workflow, /artifact-ids: \$\{\{ steps.native-artifact.outputs.artifact_id \}\}/);
    assert.match(workflow, /digest-mismatch: error/); assert.match(workflow, /build-revision.cjs --native-evidence/);
    assert.match(workflow, /fetch-depth: 0/); assert.doesNotMatch(workflow, /recover-r4|--force|refs\/heads\/(?!main)/);
});
