'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { verifyBundle } = require('../release/bundle.cjs');
const { atomicWrite } = require('../../tools/system/activate-release.cjs');
const { DIRECTORY, TRUST, load, readState, code } = require('./service.cjs');
const { verifyFeed, selectRelease, fail, exact } = require('./channel.cjs');
const { downloadArchive } = require('./transport.cjs');
const { update } = require('../../tools/system/update-managed-release.cjs');
const maintenanceLease = require('./maintenance-lease.cjs');
const automaticNode = require('./automatic-node.cjs');
function validateJobRequest(request, operationId) {
    if (!exact(request, ['operationId', 'releaseId', 'mode']) || request.operationId !== operationId
        || !['manual', 'automatic-node'].includes(request.mode) || !/^[a-f0-9]{64}$/.test(request.releaseId || '')) fail('UPDATE_JOB');
    return request;
}
function failurePhase(error, locked) {
    if (error?.restoredPreviousActive === true) return 'ROLLED_BACK';
    return locked || ['REPAIR_RECOVERY_REQUIRED', 'REPAIR_TRIAL_FAILED_RESTORED_STOPPED'].includes(error?.code)
        ? 'RECOVERY_REQUIRED' : 'FAILED';
}
function extract(archive, destination, sha256) {
    return new Promise((resolve, reject) => {
        const child = spawn('/usr/bin/python3', ['-I', path.resolve(__dirname, '../../tools/system/extract-test-bundle.py'),
            '--archive', archive, '--destination', destination, '--sha256', sha256],
        { stdio: 'ignore', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
        const timer = setTimeout(() => child.kill('SIGKILL'), 180000);
        child.once('error', () => { clearTimeout(timer); reject(Object.assign(new Error('UPDATE_EXTRACT'), { code: 'UPDATE_EXTRACT' })); });
        child.once('exit', status => { clearTimeout(timer); status === 0 ? resolve() : reject(Object.assign(new Error('UPDATE_EXTRACT'), { code: 'UPDATE_EXTRACT' })); });
    });
}
async function run(operationId) {
    if (process.getuid?.() !== 0 || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(operationId || '')) fail('UPDATE_JOB');
    const directory = path.join(DIRECTORY, 'jobs', operationId);
    let lease;
    const report = (phase, error = null, extra = {}) => atomicWrite(path.join(directory, 'result.json'),
        JSON.stringify({ operationId, phase, error, ...extra }) + '\n');
    try {
        const trust = load(TRUST, 16384), request = validateJobRequest(JSON.parse(load(path.join(directory, 'request.json'), 1024)), operationId);
        const automaticNodeUpdate = request.mode === 'automatic-node';
        if (automaticNodeUpdate && !automaticNode.windowAt(Date.now()).open) fail('UPDATE_AUTOMATIC_WINDOW');
        const release = selectRelease(verifyFeed(load(path.join(directory, 'feed.json')), trust), readState(), { automaticNodeUpdate });
        if (!release || release.releaseId !== request.releaseId) fail('UPDATE_CANDIDATE_CHANGED');
        // Avoid downloading a full release while Debian security maintenance
        // already owns the host. The same lease spans download and activation.
        lease = await maintenanceLease.acquire();
        const archive = path.join(directory, 'archive.tar.gz'), extracted = path.join(directory, 'extracted');
        report('DOWNLOADING');
        await downloadArchive(release, archive, { progress: (downloadedBytes, totalBytes) => { lease.assert(); report('DOWNLOADING', null, { downloadedBytes, totalBytes }); } });
        report('VERIFYING'); await extract(archive, extracted, release.sha256);
        const bundleDirectory = path.join(extracted, 'bundle');
        const verified = verifyBundle({ bundleDirectory, publicKey: trust, minimumSequence: readState().sequence,
            platform: 'linux-arm64', nodeVersion: release.nodeVersion });
        if (verified.releaseId !== release.releaseId || verified.manifest.sequence !== release.sequence) fail('UPDATE_RELEASE_BINDING');
        report('INSTALLING');
        const result = await update({ bundleDirectory, publicKeyFile: TRUST, expectedReleaseId: release.releaseId,
            expectedKeySha256: crypto.createHash('sha256').update(trust).digest('hex'),
            ...(automaticNodeUpdate ? { automaticNodeUpdate: true } : {}) }, { acquireMaintenanceLease: async () => lease });
        if (!result.ok || result.releaseId !== release.releaseId) fail('UPDATE_ACTIVATION');
        report('SUCCEEDED', null, { nodeVersion: result.nodeVersion, previousNodeVersion: result.previousNodeVersion });
        try { fs.unlinkSync(archive); fs.rmSync(extracted, { recursive: true }); } catch { /* bounded retained staging; active result stays true */ }
    } catch (error) {
        const locked = fs.existsSync('/etc/nexowatt-eos/.activation.lock');
        report(failurePhase(error, locked),
            /^REPAIR_[A-Z0-9_]+$/.test(error?.code || '') ? error.code : code(error));
        process.exitCode = 1;
    } finally { lease?.release(); }
}
module.exports = { run, extract, failurePhase, validateJobRequest };
if (require.main === module) {
    if (process.argv.length !== 3) process.exitCode = 2;
    else run(process.argv[2]).catch(() => { process.exitCode = 1; });
}
