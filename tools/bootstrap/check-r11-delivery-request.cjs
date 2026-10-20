'use strict';
const fs = require('node:fs');
const https = require('node:https');
const WORKFLOWS = Object.freeze({ security: '.github/workflows/security-review.yml', network: '.github/workflows/eos-network.yml' });
const { spawnSync } = require('node:child_process');
const MARKER = '.github/eos-r11-build-request.json';
const REPOSITORY = 'NexoWatt/nexowatt-eos';
const DELIVERY = 'delivery/test-pi-0.2.0-test.3-r11';
const fail = () => { throw new Error('R11_BUILD_REQUEST_REJECTED'); };
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
            !Object.values(WORKFLOWS).includes(run.path) || !Number.isSafeInteger(run.id) || run.id < 1 ||
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
    if (request.schemaVersion !== 1 || request.deliveryRevision !== 11 || request.sourceCommit !== parents[1] ||
        raw !== JSON.stringify({ schemaVersion: 1, deliveryRevision: 11, sourceCommit: parents[1] }, null, 2)) fail();
    return { eligible: false, build: false, sourceCommit, requestValidated: true, queryRuns: eventName === 'workflow_run' };
}
// Each API request has one bounded deadline, and both requests run concurrently.
function requestRuns(kind, sourceCommit, token, sharedDeadline) {
    if (!Object.hasOwn(WORKFLOWS, kind) || !/^[a-f0-9]{40}$/.test(sourceCommit || '') ||
        typeof token !== 'string' || token.length < 8 || token.length > 16384 || /[\r\n]/.test(token)) fail();
    const budget = sharedDeadline === undefined ? 5000 : Math.min(5000, sharedDeadline - Date.now());
    if (!Number.isFinite(budget) || budget <= 0) fail();
    return new Promise((resolve, reject) => {
        let request, response, done = false;
        const finish = value => { if (done) return; done = true; clearTimeout(timer); request?.destroy(); response?.destroy();
            if (value instanceof Error) reject(new Error('R11_BUILD_REQUEST_REJECTED')); else resolve(value); };
        const timer = setTimeout(() => finish(new Error('deadline')), budget);
        try {
            request = https.get({ hostname: 'api.github.com', port: 443,
                path: `/repos/NexoWatt/nexowatt-eos/actions/workflows/${WORKFLOWS[kind].split('/').pop()}/runs?head_sha=${sourceCommit}&branch=main&event=push&per_page=100`,
                rejectUnauthorized: true, minVersion: 'TLSv1.2', maxHeaderSize: 16384, agent: false,
                headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'NexoWatt-EOS-R11', 'X-GitHub-Api-Version': '2022-11-28' } }, incoming => {
                response = incoming;
                if (incoming.statusCode !== 200 || !/^application\/json(?:\s*;|$)/i.test(incoming.headers['content-type'] || '')) return finish(new Error('response'));
                let total = 0; const chunks = [];
                incoming.on('data', chunk => { total += chunk.length; if (total > 1024 * 1024) finish(new Error('size')); else chunks.push(chunk); });
                incoming.once('error', () => finish(new Error('transport'))); incoming.once('aborted', () => finish(new Error('transport')));
                incoming.once('end', () => { try { finish(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { finish(new Error('json')); } });
            });
            request.once('error', () => finish(new Error('transport')));
        } catch { finish(new Error('transport')); }
    });
}
function selectRun(value, sourceCommit, kind) {
    if (!Object.hasOwn(WORKFLOWS, kind) || !/^[a-f0-9]{40}$/.test(sourceCommit || '') ||
        !Number.isSafeInteger(value?.total_count) || value.total_count < 0 || value.total_count > 100 ||
        !Array.isArray(value.workflow_runs) || value.workflow_runs.length !== value.total_count) fail();
    if (!value.total_count) return null;
    for (const row of value.workflow_runs) {
        if (row?.repository?.full_name !== REPOSITORY || row.head_repository?.full_name !== REPOSITORY ||
            row.head_sha !== sourceCommit || row.head_branch !== 'main' || row.event !== 'push' || row.path !== WORKFLOWS[kind] ||
            !Number.isSafeInteger(row.id) || row.id < 1 || !Number.isSafeInteger(row.run_attempt) || row.run_attempt < 1) fail();
    }
    if (new Set(value.workflow_runs.map(row => row.id)).size !== value.total_count) fail();
    const latest = [...value.workflow_runs].sort((a, b) => b.id - a.id)[0];
    return latest.status === 'completed' && latest.conclusion === 'success' ? latest : null;
}
async function qualify(result, token, lookup = requestRuns) {
    if (!result.queryRuns) return result;
    const deadline = Date.now() + 5000;
    const values = await Promise.all(['security', 'network'].map(async kind => selectRun(await lookup(kind, result.sourceCommit, token, deadline), result.sourceCommit, kind)));
    if (values.some(value => value === null)) return result;
    return { ...result, eligible: true, build: true, securityRunId: String(values[0].id), securityRunAttempt: String(values[0].run_attempt),
        networkRunId: String(values[1].id), networkRunAttempt: String(values[1].run_attempt) };
}
module.exports = { evaluate, MARKER, WORKFLOWS, requestRuns, selectRun, qualify };
if (require.main === module) {
    (async () => {
        if (process.argv.length !== 2) fail();
        const stat = fs.lstatSync(process.env.GITHUB_EVENT_PATH);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) fail();
        const result = await qualify(evaluate(process.cwd(), process.env.GITHUB_EVENT_NAME, JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH)), process.env.EOS_SOURCE_COMMIT), process.env.EOS_ARTIFACT_TOKEN);
        if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
            `eligible=${result.eligible}\nbuild=${result.build}\nsource_commit=${result.sourceCommit}\nsecurity_run_id=${result.securityRunId || ''}\nsecurity_run_attempt=${result.securityRunAttempt || ''}\nnetwork_run_id=${result.networkRunId || ''}\nnetwork_run_attempt=${result.networkRunAttempt || ''}\n`);
        console.log(JSON.stringify(result));
    })().catch(() => { console.error('R11_BUILD_REQUEST_REJECTED'); process.exitCode = 1; });
}
