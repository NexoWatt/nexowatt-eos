'use strict';
// Trusted signing/publication gate. Evidence never executes code or changes a host.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readFileLimited } = require('../../runtime/release/bundle.cjs');
const CHECKS = Object.freeze(['postgresqlMtls', 'platformDeniesUnadmittedProcess', 'initiallyUnlicensed',
    'adminHttpsLogin', 'uiHttpsLogin', 'homeActivation', 'homeQuotas', 'rootOwnedEosAdmission',
    'centralRevocation', 'proReactivation', 'proQuotas', 'restart', 'unchangedApp', 'noPhysicalAdapters']);
const fail = () => { throw new Error('R9_NATIVE_EVIDENCE_REJECTED'); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function appHash(files, appPrefix = 'app/') {
    if (!Array.isArray(files)) fail();
    const rows = files.filter(row => row.path.startsWith(appPrefix)).map(row => {
        const name = row.path.slice(appPrefix.length);
        if (!name || path.isAbsolute(name) || name.split('/').some(piece => !piece || piece === '.' || piece === '..') || name.includes('\\') ||
            !Number.isSafeInteger(row.size) || row.size < 0 || !/^[a-f0-9]{64}$/.test(row.sha256 || '')) fail();
        return { path: name, size: row.size, sha256: row.sha256 };
    }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    if (!rows.length || new Set(rows.map(row => row.path)).size !== rows.length) fail();
    return hash(JSON.stringify(rows));
}
function passedTap(text) {
    if (typeof text !== 'string' || !text.startsWith('TAP version 13\n') || /^\s*not ok\b/m.test(text)) fail();
    const counts = {};
    for (const name of ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']) {
        const rows = [...text.matchAll(new RegExp('^# ' + name + ' ([0-9]+)$', 'gm'))];
        if (rows.length !== 1) fail(); counts[name] = Number(rows[0][1]);
    }
    if (counts.tests < 1 || counts.tests !== counts.pass || ['fail', 'cancelled', 'skipped', 'todo'].some(name => counts[name] !== 0)) fail();
    return counts.tests;
}
function validate({ preparation, evidence, tap, sourceCommit, appContentSha256 }) {
    if (!/^[a-f0-9]{40}$/.test(sourceCommit || '') || !/^[a-f0-9]{64}$/.test(appContentSha256 || '') ||
        preparation?.schemaVersion !== 1 || preparation.kind !== 'unsigned-r9-native-preparation' || preparation.signed !== false ||
        preparation.sequence !== 12 || preparation.nodeVersion !== '24.21.0' || preparation.sourceCommit !== sourceCommit ||
        preparation.appContentSha256 !== appContentSha256 || preparation.previousSignatureVerified !== true ||
        preparation.previousReleaseId !== 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7' ||
        evidence?.schemaVersion !== 1 || evidence.kind !== 'eos-r9-native-management' || evidence.passed !== true || evidence.signed !== false ||
        evidence.sequence !== 12 || evidence.nodeVersion !== '24.21.0' || evidence.sourceCommit !== sourceCommit || evidence.licenseFormat !== 'NWL3' ||
        evidence.appContentSha256 !== appContentSha256 || evidence.hardwareTested !== false || evidence.productionReleaseApproved !== false ||
        !evidence.checks || Object.keys(evidence.checks).length !== CHECKS.length || CHECKS.some(name => evidence.checks[name] !== true)) fail();
    const tests = passedTap(tap);
    return { ok: true, sourceCommit, appContentSha256, nativeTestsPassed: tests, licenseFormat: 'NWL3', signed: false, hardwareTested: false, productionReleaseApproved: false };
}
function verifyNativeEvidence({ directory, sourceCommit, files, appPrefix = 'app/' }) {
    if (!path.isAbsolute(directory || '') || fs.lstatSync(directory).isSymbolicLink()) fail();
    const load = name => readFileLimited(path.join(directory, name), 4 * 1024 * 1024).bytes;
    return validate({ preparation: JSON.parse(load('r9-native-prepared.json')), evidence: JSON.parse(load('r9-native-evidence.json')),
        tap: load('r9-native.tap').toString('utf8'), sourceCommit, appContentSha256: appHash(files, appPrefix) });
}
module.exports = { CHECKS, appHash, passedTap, validate, verifyNativeEvidence };
