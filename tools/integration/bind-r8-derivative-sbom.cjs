'use strict';
// R8 changes host readiness/recovery only. Rebind the authenticated R7 SBOM
// metadata while retaining every actual application byte, mode and component.
const { inventory, sha256 } = require('../../runtime/release/bundle.cjs');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function appRows(manifest) {
    return manifest.files.filter(row => row.path.startsWith('app/'))
        .map(row => ({ path: row.path.slice(4), size: row.size, sha256: row.sha256, mode: row.mode }));
}
function assertUnchangedApp(before, after) {
    if (!Array.isArray(before) || !before.length || !Array.isArray(after) ||
        new Set(before.map(row => row.path)).size !== before.length || new Set(after.map(row => row.path)).size !== after.length ||
        JSON.stringify(before) !== JSON.stringify(after)) fail('R8_APP_CHANGE_NOT_AUTHORIZED');
}
const digestRows = rows => sha256(Buffer.from(JSON.stringify(rows)));
function bindDerivative({ app, previousManifest, previousSbom, previousReleaseId, sourceCommit, timestamp }) {
    if (!/^[a-f0-9]{64}$/.test(previousReleaseId || '') || !/^[a-f0-9]{40}$/.test(sourceCommit || '') ||
        !Number.isFinite(Date.parse(timestamp)) || previousSbom?.bomFormat !== 'CycloneDX' || previousSbom.specVersion !== '1.5' ||
        !previousSbom.metadata || !Array.isArray(previousSbom.components)) fail('R8_SBOM_INPUT');
    const before = appRows(previousManifest), after = inventory(app).map(({ path, size, sha256, mode }) => ({ path, size, sha256, mode }));
    assertUnchangedApp(before, after);
    const contentDigest = digestRows(after.map(({ mode, ...row }) => row)), modeDigest = digestRows(after);
    const bom = structuredClone(previousSbom); delete bom.serialNumber;
    bom.version = 1; bom.metadata.timestamp = timestamp;
    const additions = { 'eos:sbom:base-release-id': previousReleaseId, 'eos:sbom:source-commit': sourceCommit,
        'eos:sbom:assembly': 'authenticated-r7-app-unchanged-with-host-only-source-update',
        'eos:sbom:actual-app-file-table-sha256': contentDigest, 'eos:sbom:actual-app-mode-table-sha256': modeDigest,
        'eos:sbom:application-unchanged': 'true', 'eos:sbom:fresh-npm-resolution': 'false', 'eos:sbom:fresh-vulnerability-scan': 'false' };
    bom.metadata.properties = (bom.metadata.properties || []).filter(row => !Object.hasOwn(additions, row.name));
    bom.metadata.properties.push(...Object.entries(additions).map(([name, value]) => ({ name, value })));
    return { bom, evidence: { schemaVersion: 1, kind: 'eos-r8-authenticated-host-only-sbom', previousReleaseId, sourceCommit,
        previousSbomCanonicalJsonSha256: sha256(Buffer.from(JSON.stringify(previousSbom))),
        actualAppFileTableSha256: contentDigest, actualAppModeTableSha256: modeDigest, appFiles: after.length,
        applicationUnchanged: true, componentDeclarationsUnchanged: true, changed: [], derivatives: [],
        npmResolutionPerformed: false, dependencyLockUnchanged: true, vulnerabilityScanPerformed: false,
        operatingSystemInventoryIncluded: false, hardwareTested: false, productionReleaseApproved: false } };
}
module.exports = { bindDerivative, appRows, assertUnchangedApp, digestRows };
