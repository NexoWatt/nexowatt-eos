#!/usr/bin/env node
'use strict';
// Admission gate for a future clean build, not evidence that package bytes or
// upstream publishers were verified. Existing incomplete locks intentionally fail.
const fs = require('node:fs');
const path = require('node:path');
const { integrityHashes, manifestDrift } = require('./nexowatt-security-inventory.cjs');
function inspect(manifest, lock) {
    const issues = [];
    if (![2, 3].includes(lock?.lockfileVersion) || !lock.packages || Array.isArray(lock.packages)) return [{ code: 'LOCK_STRUCTURE' }];
    for (const issue of manifestDrift(manifest, lock)) issues.push({ code: 'MANIFEST_DRIFT', item: issue });
    for (const [location, entry] of Object.entries(lock.packages)) {
        if (!location) continue;
        if (entry?.link) { issues.push({ code: 'LINK_REQUIRES_REVIEW', location }); continue; }
        if (!integrityHashes(entry?.integrity).some(hash => ['SHA-256', 'SHA-384', 'SHA-512'].includes(hash.alg))) issues.push({ code: 'STRONG_INTEGRITY_MISSING', location });
        let trustedOrigin = false;
        try {
            const url = new URL(entry?.resolved);
            trustedOrigin = url.protocol === 'https:' && url.hostname === 'registry.npmjs.org'
                && !url.port && !url.username && !url.password && !url.search && !url.hash
                && url.pathname.endsWith('.tgz');
        } catch { /* Report only package locations, never credential-bearing URLs. */ }
        if (!trustedOrigin) issues.push({ code: 'REGISTRY_ORIGIN_UNVERIFIED', location });
    }
    return issues;
}
function run(root = path.resolve(__dirname, '..')) {
    const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), status: 'PASS',
        limitations: 'Lock metadata admission only; not a downloaded-byte verification, CVE scan or publisher attestation.', scopes: [] };
    for (const [name, folder] of [['backend', ''], ['frontend', 'src-admin']]) {
        const read = file => JSON.parse(fs.readFileSync(path.join(root, folder, file), 'utf8'));
        const issues = inspect(read('package.json'), read('package-lock.json'));
        report.scopes.push({ name, issues });
        if (issues.length) report.status = 'BLOCKED';
    }
    return report;
}
if (require.main === module) {
    try { const report = run(); console.log(JSON.stringify(report, null, 2)); if (report.status !== 'PASS') process.exitCode = 1; }
    catch { console.error('Lock provenance gate could not inspect required manifests.'); process.exitCode = 1; }
}
module.exports = { inspect, run };
