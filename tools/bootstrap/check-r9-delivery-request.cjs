'use strict';
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const MARKER = '.github/eos-r9-build-request.json';
const REPOSITORY = 'NexoWatt/nexowatt-eos';
const DELIVERY = 'delivery/test-pi-0.2.0-test.3-r9';
const fail = () => { throw new Error('R9_BUILD_REQUEST_REJECTED'); };
function git(root, ...args) {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
    if (result.error || result.status !== 0) fail(); return result.stdout.trim();
}
function evaluate(root, eventName, event, sourceCommit) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || git(root, 'rev-parse', 'HEAD') !== sourceCommit || event.repository?.full_name !== REPOSITORY) fail();
    if (eventName === 'workflow_dispatch') {
        for (const name of ['eos-0.2.0-test.3-linux-arm64.tar.gz', 'release-public.pem', 'delivery.json', 'bundle.sha256']) {
            if (!/^100644 blob [a-f0-9]{40}\t/.test(git(root, 'ls-tree', 'HEAD', '--', `${DELIVERY}/${name}`))) fail();
        }
        return { eligible: true, build: false, sourceCommit, securityRunId: '', securityRunAttempt: '' };
    }
    if (!['push', 'workflow_run'].includes(eventName)) fail();
    let run;
    if (eventName === 'workflow_run') {
        run = event.workflow_run;
        if (run?.repository?.full_name !== REPOSITORY || run.head_repository?.full_name !== REPOSITORY || run.head_branch !== 'main' ||
            run.event !== 'push' || run.conclusion !== 'success' || run.status !== 'completed' || run.head_sha !== sourceCommit ||
            run.path !== '.github/workflows/security-review.yml' || !Number.isSafeInteger(run.id) || run.id < 1 ||
            !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) fail();
    }
    const parents = git(root, 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ');
    const changed = git(root, 'diff-tree', '--no-commit-id', '--name-status', '-r', 'HEAD').split('\n');
    if (parents.length !== 2 || changed.length !== 1 || ![`A\t${MARKER}`, `M\t${MARKER}`].includes(changed[0])) {
        if (eventName === 'workflow_run') return { eligible: false, build: false, sourceCommit }; // Ordinary source/report pushes never request a delivery.
        fail();
    }
    if (!/^100644 blob [a-f0-9]{40}\t/.test(git(root, 'ls-tree', 'HEAD', '--', MARKER))) fail();
    const raw = git(root, 'show', `HEAD:${MARKER}`);
    // A fixed canonical form also excludes duplicate JSON keys and extra fields.
    const request = JSON.parse(raw);
    if (request.schemaVersion !== 1 || request.deliveryRevision !== 9 || request.sourceCommit !== parents[1] ||
        raw !== JSON.stringify({ schemaVersion: 1, deliveryRevision: 9, sourceCommit: parents[1] }, null, 2)) fail();
    return { eligible: eventName === 'workflow_run', build: eventName === 'workflow_run', sourceCommit,
        securityRunId: run ? String(run.id) : '', securityRunAttempt: run ? String(run.run_attempt) : '' };
}
module.exports = { evaluate, MARKER };
if (require.main === module) {
    try {
        if (process.argv.length !== 2) fail();
        const stat = fs.lstatSync(process.env.GITHUB_EVENT_PATH);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) fail();
        const result = evaluate(process.cwd(), process.env.GITHUB_EVENT_NAME, JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH)), process.env.EOS_SOURCE_COMMIT);
        if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
            `eligible=${result.eligible}\nbuild=${result.build}\nsource_commit=${result.sourceCommit}\nsecurity_run_id=${result.securityRunId || ''}\nsecurity_run_attempt=${result.securityRunAttempt || ''}\n`);
        console.log(JSON.stringify(result));
    } catch { console.error('R9_BUILD_REQUEST_REJECTED'); process.exitCode = 1; }
}
