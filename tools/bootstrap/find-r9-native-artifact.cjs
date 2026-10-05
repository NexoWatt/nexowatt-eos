'use strict';
// Bounded metadata request for one artifact from the already authenticated Security run.
const https = require('node:https');
const fs = require('node:fs');
const fail = () => { throw new Error('R9_NATIVE_ARTIFACT_REJECTED'); };
function selectArtifact(value, sourceCommit, runId) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !Number.isSafeInteger(runId) || runId < 1 ||
        !value || !Number.isSafeInteger(value.total_count) || value.total_count < 1 || value.total_count > 100 ||
        !Array.isArray(value.artifacts) || value.artifacts.length !== value.total_count) fail();
    const rows = value.artifacts.filter(row => row?.name === `eos-r9-native-${sourceCommit}`);
    if (rows.length !== 1) fail(); const row = rows[0];
    if (!Number.isSafeInteger(row.id) || row.id < 1 || row.expired !== false || !Number.isSafeInteger(row.size_in_bytes) ||
        row.size_in_bytes < 1 || row.size_in_bytes > 12 * 1024 * 1024 || !/^sha256:[a-f0-9]{64}$/.test(row.digest || '') ||
        row.workflow_run?.id !== runId || row.workflow_run.head_sha !== sourceCommit || row.workflow_run.head_branch !== 'main') fail();
    return { artifactId: row.id, bytes: row.size_in_bytes, digest: row.digest };
}
function requestArtifacts(runId, token) {
    if (!Number.isSafeInteger(runId) || runId < 1 || typeof token !== 'string' || token.length < 8 || token.length > 16384 || /[\r\n]/.test(token)) fail();
    return new Promise((resolve, reject) => {
        let request, response, done = false;
        const finish = value => { if (done) return; done = true; clearTimeout(timer); request?.destroy(); response?.destroy();
            if (value instanceof Error) reject(new Error('R9_NATIVE_ARTIFACT_REJECTED')); else resolve(value); };
        const timer = setTimeout(() => finish(new Error('deadline')), 5000);
        try {
            request = https.get({ hostname: 'api.github.com', port: 443,
                path: `/repos/NexoWatt/nexowatt-eos/actions/runs/${runId}/artifacts?per_page=100`,
                rejectUnauthorized: true, minVersion: 'TLSv1.2', maxHeaderSize: 16384, agent: false,
                headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'NexoWatt-EOS-R9', 'X-GitHub-Api-Version': '2022-11-28' } }, incoming => {
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
module.exports = { selectArtifact, requestArtifacts };
if (require.main === module) {
    (async () => {
        if (process.argv.length !== 2 || !/^[1-9][0-9]{0,15}$/.test(process.env.EOS_SECURITY_RUN_ID || '')) fail();
        const runId = Number(process.env.EOS_SECURITY_RUN_ID);
        const result = selectArtifact(await requestArtifacts(runId, process.env.EOS_ARTIFACT_TOKEN), process.env.EOS_SOURCE_COMMIT, runId);
        if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `artifact_id=${result.artifactId}\n`);
        console.log(JSON.stringify(result));
    })().catch(() => { console.error('R9_NATIVE_ARTIFACT_REJECTED'); process.exitCode = 1; });
}
