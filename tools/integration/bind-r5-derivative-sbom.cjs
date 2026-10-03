'use strict';
// Rebind an authenticated R4 inventory after explicit, dependency-neutral
// source overlays. This is not npm resolution, a new scan or frontend rebuild.
const fs = require('node:fs');
const path = require('node:path');
const { inventory, sha256, readFileLimited } = require('../../runtime/release/bundle.cjs');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const sorted = rows => rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const digestRows = rows => sha256(Buffer.from(JSON.stringify(sorted(rows))));
const props = (object, additions) => {
    object.properties ||= [];
    object.properties = object.properties.filter(row => !Object.hasOwn(additions, row.name));
    object.properties.push(...Object.entries(additions).map(([name, value]) => ({ name, value: String(value) })));
};
function appRows(manifest) {
    return manifest.files.filter(row => row.path.startsWith('app/'))
        .map(row => ({ path: row.path.slice(4), size: row.size, sha256: row.sha256 }));
}
function bindDerivative({ app, previousManifest, previousSbom, previousReleaseId, sourceCommit, timestamp }) {
    if (!/^[a-f0-9]{64}$/.test(previousReleaseId || '') || !/^[a-f0-9]{40}$/.test(sourceCommit || '') ||
        !Number.isFinite(Date.parse(timestamp)) || previousSbom?.bomFormat !== 'CycloneDX' || previousSbom.specVersion !== '1.5') fail('R5_SBOM_INPUT');
    const before = appRows(previousManifest), after = inventory(app).map(({ path, size, sha256 }) => ({ path, size, sha256 }));
    const oldRows = new Map(before.map(row => [row.path, row])), newRows = new Map(after.map(row => [row.path, row]));
    for (const file of ['package.json', 'package-lock.json']) if (JSON.stringify(oldRows.get(file)) !== JSON.stringify(newRows.get(file))) fail('R5_SBOM_DEPENDENCY_CHANGE');
    const changed = sorted([...new Set([...oldRows.keys(), ...newRows.keys()])].flatMap(name => {
        const a = oldRows.get(name), b = newRows.get(name);
        return JSON.stringify(a) === JSON.stringify(b) ? [] : [{ path: name, before: a || null, after: b || null }];
    }));
    const owners = new Set();
    for (const row of changed) {
        const match = /^node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(row.path);
        if (!match || row.path.slice(match[0].length).startsWith('node_modules/') ||
            row.path.slice(match[0].length).includes('/node_modules/')) fail('R5_SBOM_OVERLAY_SCOPE');
        owners.add(match[1]);
    }
    if (!changed.length) fail('R5_SBOM_DERIVATIVE_EMPTY');
    const bom = structuredClone(previousSbom), derivatives = [];
    // The old serial number must not claim that changed content is the old BOM.
    delete bom.serialNumber;
    bom.version = 1; bom.metadata.timestamp = timestamp;
    props(bom.metadata, { 'eos:sbom:base-release-id': previousReleaseId,
        'eos:sbom:source-commit': sourceCommit, 'eos:sbom:assembly': 'authenticated-r4-tree-with-explicit-source-overlays',
        'eos:sbom:actual-app-file-table-sha256': digestRows(after),
        'eos:sbom:fresh-npm-resolution': 'false', 'eos:sbom:fresh-vulnerability-scan': 'false' });
    for (const name of [...owners].sort()) {
        const prefix = 'node_modules/' + name + '/';
        const manifest = JSON.parse(readFileLimited(path.join(app, prefix, 'package.json')).bytes);
        const matches = bom.components.filter(row => row.name === name && row.version === manifest.version);
        if (matches.length !== 1 || manifest.name !== name) fail('R5_SBOM_COMPONENT_IDENTITY');
        const component = matches[0], tree = after.filter(row => row.path.startsWith(prefix));
        const changes = changed.filter(row => row.path.startsWith(prefix));
        const ancestor = Object.fromEntries(['type', 'name', 'version', 'purl', 'hashes'].filter(key => Object.hasOwn(component, key)).map(key => [key, component[key]]));
        const existingPedigree = component.pedigree;
        delete component.hashes;
        component.modified = true;
        component.pedigree = existingPedigree || { ancestors: [ancestor] };
        component.pedigree.notes = (component.pedigree.notes ? component.pedigree.notes + ' ' : '') +
            'R5 TEST derivative of the authenticated R4 package. Ancestor archive hashes do not identify the modified installed tree; signed file inventory and derivative tree digest bind its bytes.';
        const treeSha256 = digestRows(tree), changeTableSha256 = sha256(Buffer.from(JSON.stringify(changes)));
        props(component, { 'eos:derivative:base-release-id': previousReleaseId, 'eos:derivative:source-commit': sourceCommit,
            'eos:derivative:tree-sha256': treeSha256, 'eos:derivative:change-table-sha256': changeTableSha256,
            'eos:derivative:local-archive-integrity': 'not-claimed; authenticated signed-file-table is authoritative' });
        derivatives.push({ package: name, version: manifest.version, treeSha256, changeTableSha256, changedFiles: changes.length });
    }
    for (const component of bom.components) {
        const values = Object.fromEntries((component.properties || []).map(row => [row.name, row.value]));
        if (values['eos:scope'] !== 'embedded-package-files-observed-in-runtime-tree') continue;
        const relative = values['eos:installed-path'];
        if (!/^node_modules\/(?:@[^/]+\/)?[^/]+\//.test(relative || '')) fail('R5_SBOM_EMBEDDED_PATH');
        const prefix = relative + '/', tree = after.filter(row => row.path.startsWith(prefix))
            .map(row => ({ path: row.path.slice(prefix.length), size: row.size, sha256: row.sha256 }));
        const manifest = newRows.get(prefix + 'package.json');
        if (!manifest || !tree.length) fail('R5_SBOM_EMBEDDED_MISSING');
        props(component, { 'eos:manifest-sha256': manifest.sha256, 'eos:tree-sha256': digestRows(tree) });
    }
    return { bom, evidence: { schemaVersion: 1, kind: 'eos-r5-authenticated-runtime-derivative-sbom', previousReleaseId,
        sourceCommit, previousSbomCanonicalJsonSha256: sha256(Buffer.from(JSON.stringify(previousSbom))),
        actualAppFileTableSha256: digestRows(after), changed, derivatives,
        npmResolutionPerformed: false, dependencyLockUnchanged: true, vulnerabilityScanPerformed: false,
        operatingSystemInventoryIncluded: false, hardwareTested: false, productionReleaseApproved: false } };
}
module.exports = { bindDerivative, appRows, digestRows };
