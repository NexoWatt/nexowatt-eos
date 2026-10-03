'use strict';
// Invoked by the setup UID only after its HTTPS server has stopped. An ordinary
// shutdown must retain an unfinished handoff. Root's completion decision is the
// sole authority to remove this fixed file; this is unlink, not secure erasure.
const fs = require('node:fs');
const path = require('node:path');
const { rootOwned } = require('../release/installed-check.cjs');
const { readFileLimited, trustedDirectory } = require('../release/bundle.cjs');
const storage = require('./state.cjs');
const { exact } = require('./policy.cjs');
const fail = () => { throw Object.assign(new Error('SETUP_CLEANUP_FAILED'), { code: 'SETUP_CLEANUP_FAILED' }); };
const canonicalPath = value => typeof value === 'string' && path.isAbsolute(value) && path.resolve(value) === value && !value.includes('\0');
function privateFile(file) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 ||
        process.platform !== 'win32' && (stat.uid !== process.getuid() || stat.mode & 0o077)) fail();
    return stat;
}

function cleanupCompleted(config, { ownerCheck = rootOwned } = {}) {
    // ownerCheck is injectable solely for tests with no root-owned fixture.
    // The production signal handler passes only its root-validated config.
    try {
        if (!config || !canonicalPath(config.stateDirectory) || !canonicalPath(config.completionFile) ||
            !/^[a-f0-9]{64}$/.test(config.releaseId || '')) fail();
        let markerStat;
        try { markerStat = fs.lstatSync(config.completionFile); }
        catch (error) { if (error.code === 'ENOENT') return { cleaned: false }; throw error; }
        if (!markerStat.isFile() || markerStat.isSymbolicLink() || markerStat.nlink !== 1) fail();
        trustedDirectory(path.dirname(config.completionFile));
        ownerCheck(config.completionFile);
        const complete = JSON.parse(readFileLimited(config.completionFile, 4096).bytes);
        if (!exact(complete, ['schemaVersion', 'releaseId', 'setupId', 'completedAt', 'licenseConfigured', 'physicalControlEnabled']) ||
            complete.schemaVersion !== 1 || complete.releaseId !== config.releaseId || !/^[a-f0-9]{32}$/.test(complete.setupId || '') ||
            typeof complete.licenseConfigured !== 'boolean' || complete.physicalControlEnabled !== false ||
            typeof complete.completedAt !== 'string' || new Date(complete.completedAt).toISOString() !== complete.completedAt) fail();
        trustedDirectory(config.stateDirectory); storage.directorySafe(config.stateDirectory);
        if (process.platform !== 'win32' && fs.lstatSync(config.stateDirectory).uid !== process.getuid()) fail();
        privateFile(path.join(config.stateDirectory, 'state.json'));
        const handoffFile = path.join(config.stateDirectory, 'handoff.json');
        const before = privateFile(handoffFile);
        const handoff = storage.readHandoff(config.stateDirectory, config.releaseId);
        if (handoff.setupId !== complete.setupId || complete.licenseConfigured !== (handoff.license.mode === 'activate')) fail();
        // readHandoff verifies committing state, null code hash, schema and the
        // state/handoff release + setup binding. It never logs parsed values.
        const current = privateFile(handoffFile);
        if (before.dev !== current.dev || before.ino !== current.ino || before.size !== current.size ||
            before.mtimeMs !== current.mtimeMs || before.ctimeMs !== current.ctimeMs) fail();
        fs.unlinkSync(handoffFile);
        storage.syncDirectory(config.stateDirectory);
        return { cleaned: true };
    } catch { fail(); }
}

module.exports = { cleanupCompleted };
