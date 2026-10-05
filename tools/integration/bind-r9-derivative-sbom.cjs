'use strict';
// The caller authenticates the R8 sequence-11 release before invoking this
// offline derivative binder. No npm resolution or advisory scan occurs here.
const path = require('node:path');
const { isDeepStrictEqual: equal } = require('node:util');
const { inventory, sha256, readFileLimited } = require('../../runtime/release/bundle.cjs');
const { EMBEDDED } = require('../../runtime/release/sbom-binding.cjs');
const OWNERS = Object.freeze(require('../../runtime/product/scope.cjs').SPECS.filter(spec => spec.source));
const ASSEMBLY = 'authenticated-r8-tree-with-six-own-adapter-source-overlays';
const CLIENT = '@nexowatt/eos-license-client';
const EOS_NODE_RANGE = '>=22.0.0 <23 || >=24.0.0 <25';
const R8_EEBUS_SOURCE_LOCK = Object.freeze({ sourceCommit: 'f35789c8453be7ce9bca0bbbf3be870e0ed0a836',
    path: 'components/eebus/package-lock.json', sha256: '7173b59b716b239bc695de87bbdedf6f6df2c4583a4dd5623a99ebbf0eb0f77f' });
const fail = code => { throw Object.assign(new Error(code), { code }); };
const sorted = rows => [...rows].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const digestRows = rows => sha256(Buffer.from(JSON.stringify(sorted(rows))));
const contentRows = rows => rows.map(({ path, size, sha256 }) => ({ path, size, sha256 }));
const props = (object, additions) => {
    object.properties = (object.properties || []).filter(row => !Object.hasOwn(additions, row.name));
    object.properties.push(...Object.entries(additions).map(([name, value]) => ({ name, value: String(value) })));
};
const values = object => Object.fromEntries((object.properties || []).map(row => [row.name, row.value]));
function appRows(manifest) {
    if (!Array.isArray(manifest?.files)) fail('R9_SBOM_INPUT');
    const rows = manifest.files.filter(row => row.path.startsWith('app/'))
        .map(row => ({ path: row.path.slice(4), size: row.size, sha256: row.sha256, mode: row.mode }));
    if (!rows.length || new Set(rows.map(row => row.path)).size !== rows.length ||
        rows.some(row => !Number.isSafeInteger(row.size) || row.size < 0 || !/^[a-f0-9]{64}$/.test(row.sha256) ||
            ![0o644, 0o755].includes(row.mode))) fail('R9_SBOM_INPUT');
    return sorted(rows);
}
function boundJson(directory, relative, rows) {
    const row = rows.get(relative);
    if (!row) fail('R9_SBOM_MANIFEST_MISSING');
    const { bytes, mode } = readFileLimited(path.join(directory, relative), 16 * 1024 * 1024);
    if (bytes.length !== row.size || sha256(bytes) !== row.sha256 || (mode & 0o111 ? 0o755 : 0o644) !== row.mode) fail('R9_SBOM_BASE_CHANGED');
    return JSON.parse(bytes);
}
function checkPackage(before, after, spec, loadPrevious) {
    if (before.name !== spec.package || after.name !== spec.package || before.version !== spec.version ||
        after.version !== spec.version || before.main !== spec.main || after.main !== spec.main) fail('R9_SBOM_COMPONENT_IDENTITY');
    const oldContract = structuredClone(before), newContract = structuredClone(after), exceptions = [];
    for (const key of ['files', 'scripts']) { delete oldContract[key]; delete newContract[key]; }
    if (!equal(before.engines, after.engines)) {
        if (!['iobroker.eebus', 'iobroker.ocpp21'].includes(spec.package) ||
            !equal(before.engines, { node: '>=20' }) || !equal(after.engines, { node: EOS_NODE_RANGE })) fail('R9_SBOM_ENGINE_CHANGE');
        delete oldContract.engines; delete newContract.engines;
        exceptions.push('node-engine-narrowed-to-reviewed-eos-22-and-24-range');
    }
    if (spec.package === 'iobroker.eebus' && before.devDependencies?.mocha === undefined && after.devDependencies?.mocha === '11.8.0') {
        const oldLock = loadPrevious(`node_modules/${spec.package}/package-lock.json`);
        if (oldLock.packages?.['node_modules/mocha']?.version !== '11.8.0') fail('R9_SBOM_SOURCE_DEVDEPENDENCY');
        delete newContract.devDependencies.mocha;
        exceptions.push('source-devdependency-mocha-11.8.0-already-present-in-bound-r8-source-lock');
    }
    // Every other field, including prod/optional/peer deps, overrides, name,
    // version, entry points, exports and all other dev dependencies is fixed.
    if (!equal(oldContract, newContract)) fail('R9_SBOM_PACKAGE_CONTRACT');
    return exceptions;
}
function ancestor(component) {
    return Object.fromEntries(['type', 'name', 'version', 'purl', 'hashes', 'properties', 'pedigree', 'modified']
        .filter(key => Object.hasOwn(component, key)).map(key => [key, structuredClone(component[key])]));
}
function bindDerivative({ app, previousApp, previousManifest, previousSbom, previousReleaseId, sourceCommit, timestamp, previousEebusSourceLock }) {
    if (typeof previousApp !== 'string' || previousManifest?.sequence !== 11 ||
        !/^[a-f0-9]{64}$/.test(previousReleaseId || '') || !/^[a-f0-9]{40}$/.test(sourceCommit || '') ||
        !Number.isFinite(Date.parse(timestamp)) || previousSbom?.bomFormat !== 'CycloneDX' || previousSbom.specVersion !== '1.5' ||
        !previousSbom.metadata || !Array.isArray(previousSbom.components) || !Array.isArray(previousSbom.dependencies)) fail('R9_SBOM_INPUT');
    const before = appRows(previousManifest), after = inventory(app).map(({ path, size, sha256, mode }) => ({ path, size, sha256, mode }));
    const oldRows = new Map(before.map(row => [row.path, row])), newRows = new Map(after.map(row => [row.path, row]));
    const oldJson = relative => boundJson(previousApp, relative, oldRows);
    const newJson = relative => boundJson(app, relative, newRows);
    const authenticatedSbom = boundJson(path.dirname(previousApp), 'sbom.cdx.json',
        new Map(previousManifest.files.map(row => [row.path, row])));
    if (!equal(authenticatedSbom, previousSbom)) fail('R9_SBOM_BASE_CHANGED');
    const sourceLockEvidence = [];
    const oldSourceJson = relative => {
        if (oldRows.has(relative)) return oldJson(relative);
        // R8 shipped no EEBUS source lock. Its signed SBOM binds the source
        // commit; the exact Git blob is a separate source-only provenance pin.
        // This is never represented as an installed dependency lock.
        if (relative !== 'node_modules/iobroker.eebus/package-lock.json' || !Buffer.isBuffer(previousEebusSourceLock) ||
            values(previousSbom.metadata)['eos:sbom:source-commit'] !== R8_EEBUS_SOURCE_LOCK.sourceCommit ||
            sha256(previousEebusSourceLock) !== R8_EEBUS_SOURCE_LOCK.sha256) fail('R9_SBOM_SOURCE_LOCK_EVIDENCE');
        sourceLockEvidence.push({ ...R8_EEBUS_SOURCE_LOCK, scope: 'source-build-lock-only; not installed dependency resolution' });
        return JSON.parse(previousEebusSourceLock);
    };
    for (const file of ['package.json', 'package-lock.json']) {
        if (!oldRows.has(file) || !equal(oldRows.get(file), newRows.get(file))) fail('R9_SBOM_DEPENDENCY_CHANGE');
        oldJson(file); newJson(file);
    }
    const changed = sorted([...new Set([...oldRows.keys(), ...newRows.keys()])].flatMap(name => {
        const a = oldRows.get(name), b = newRows.get(name);
        return equal(a, b) ? [] : [{ path: name, before: a || null, after: b || null }];
    }));
    const changedOwners = new Set();
    for (const row of changed) {
        const match = /^node_modules\/((?:@[^/]+\/)?[^/]+)\/(.+)$/.exec(row.path);
        if (!match || !OWNERS.some(spec => spec.package === match[1])) fail('R9_SBOM_PACKAGE_SCOPE');
        if (match[2].split('/').includes('node_modules')) fail('R9_SBOM_NESTED_DEPENDENCY_CHANGE');
        if (Object.entries(EMBEDDED).some(([relative, name]) => name !== CLIENT && row.path.startsWith(relative + '/'))) fail('R9_SBOM_THIRD_PARTY_CHANGE');
        changedOwners.add(match[1]);
    }
    if (!changed.length) fail('R9_SBOM_DERIVATIVE_EMPTY');
    if (changedOwners.size !== OWNERS.length) fail('R9_SBOM_OWNER_SCOPE');
    const bom = structuredClone(previousSbom), derivatives = [], embeddedPackages = [];
    delete bom.serialNumber; bom.version = 1; bom.metadata.timestamp = timestamp;
    const actualAppFileTableSha256 = digestRows(contentRows(after)), actualAppModeTableSha256 = digestRows(after);
    props(bom.metadata, { 'eos:sbom:base-release-id': previousReleaseId, 'eos:sbom:source-commit': sourceCommit,
        'eos:sbom:assembly': ASSEMBLY, 'eos:sbom:actual-app-file-table-sha256': actualAppFileTableSha256,
        'eos:sbom:actual-app-mode-table-sha256': actualAppModeTableSha256, 'eos:sbom:application-unchanged': 'false',
        'eos:sbom:fresh-npm-resolution': 'false', 'eos:sbom:fresh-vulnerability-scan': 'false' });
    for (const spec of OWNERS) {
        const relative = `node_modules/${spec.package}`, prefix = relative + '/';
        const manifest = newJson(prefix + 'package.json');
        if (!newRows.has(prefix + spec.main)) fail('R9_SBOM_COMPONENT_IDENTITY');
        const metadataExceptions = checkPackage(oldJson(prefix + 'package.json'), manifest, spec, oldSourceJson);
        const lockChange = changed.find(row => row.path === prefix + 'package-lock.json');
        if (lockChange?.after) {
            const lock = newJson(lockChange.path);
            if (lock.lockfileVersion !== 3 || lock.name !== manifest.name || lock.version !== manifest.version ||
                ['name', 'version', 'dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta', 'engines']
                    .some(key => !equal(lock.packages?.['']?.[key], manifest[key]))) fail('R9_SBOM_SOURCE_LOCK_CONTRACT');
        }
        const matches = bom.components.filter(row => row.name === spec.package && row.version === spec.version && values(row)['eos:scope'] !== 'embedded-package-files-observed-in-runtime-tree');
        if (matches.length !== 1) fail('R9_SBOM_COMPONENT_IDENTITY');
        const component = matches[0], tree = after.filter(row => row.path.startsWith(prefix));
        const changes = changed.filter(row => row.path.startsWith(prefix));
        const previousComponent = ancestor(component);
        delete component.hashes; component.modified = true;
        component.pedigree = { ancestors: [previousComponent], notes: 'R9 TEST derivative of authenticated R8. Preserved ancestry describes earlier artifacts; current installed bytes and modes are bound by the signed file table and derivative digests. No fresh npm resolution or vulnerability scan.' };
        const treeSha256 = digestRows(contentRows(tree)), modeTreeSha256 = digestRows(tree), changeTableSha256 = digestRows(changes);
        props(component, { 'eos:derivative:base-release-id': previousReleaseId, 'eos:derivative:source-commit': sourceCommit,
            'eos:derivative:installed-path': relative, 'eos:derivative:tree-sha256': treeSha256,
            'eos:derivative:mode-tree-sha256': modeTreeSha256, 'eos:derivative:change-table-sha256': changeTableSha256,
            'eos:derivative:local-archive-integrity': 'not-claimed; authenticated signed-file-table is authoritative' });
        derivatives.push({ package: spec.package, version: spec.version, treeSha256, modeTreeSha256, changeTableSha256, changedFiles: changes.length, metadataExceptions });
    }
    let clientTree;
    for (const [relative, name] of Object.entries(EMBEDDED)) {
        const prefix = relative + '/', rows = after.filter(row => row.path.startsWith(prefix));
        const existing = bom.components.filter(row => values(row)['eos:installed-path'] === relative && values(row)['eos:scope'] === 'embedded-package-files-observed-in-runtime-tree');
        if (existing.length > 1 || !rows.length && (existing.length || name === CLIENT)) fail('R9_SBOM_EMBEDDED_MISSING');
        if (!rows.length) continue;
        const manifest = newJson(prefix + 'package.json');
        if (manifest.name !== name || typeof manifest.version !== 'string' || name === CLIENT && manifest.version !== '1.0.2' ||
            ['dependencies', 'optionalDependencies', 'peerDependencies'].some(key => Object.keys(manifest[key] || {}).length)) fail('R9_SBOM_EMBEDDED_IDENTITY');
        const tree = contentRows(rows).map(row => ({ ...row, path: row.path.slice(prefix.length) }));
        const treeSha256 = digestRows(tree), ref = `eos-embedded:${relative}`;
        if (name === CLIENT) {
            if (clientTree && clientTree !== treeSha256) fail('R9_SBOM_CLIENT_COPY_DRIFT');
            clientTree = treeSha256;
        }
        const component = existing[0] || { type: 'library', 'bom-ref': ref, name, version: manifest.version };
        if (component['bom-ref'] !== ref || component.name !== name) fail('R9_SBOM_EMBEDDED_IDENTITY');
        if (existing.length && (component.version !== manifest.version || values(component)['eos:tree-sha256'] !== treeSha256)) {
            const previous = ancestor(component); delete component.hashes; component.modified = true;
            component.pedigree = { ancestors: [previous], notes: 'R9 embedded source copy replaces the authenticated R8 embedded copy; current manifest and tree digests identify this instance.' };
        }
        component.version = manifest.version;
        props(component, { 'eos:scope': 'embedded-package-files-observed-in-runtime-tree', 'eos:installed-path': relative,
            'eos:manifest-sha256': newRows.get(prefix + 'package.json').sha256, 'eos:tree-sha256': treeSha256,
            'eos:tree-hash-format': 'sha256 UTF-8 compact JSON sorted path,size,sha256 rows; separate from archive SRI' });
        if (!existing.length) bom.components.push(component);
        const owner = OWNERS.find(spec => relative.startsWith(`node_modules/${spec.package}/`));
        const parent = bom.components.find(row => row.name === owner.package && row.version === owner.version);
        const edges = bom.dependencies.filter(row => row.ref === parent['bom-ref']);
        if (edges.length !== 1 || !Array.isArray(edges[0].dependsOn)) fail('R9_SBOM_EMBEDDED_PARENT');
        edges[0].dependsOn = [...new Set([...edges[0].dependsOn, ref])];
        const childEdges = bom.dependencies.filter(row => row.ref === ref);
        if (childEdges.length > 1 || childEdges.some(row => !Array.isArray(row.dependsOn) || row.dependsOn.length)) fail('R9_SBOM_EMBEDDED_PARENT');
        if (!childEdges.length) bom.dependencies.push({ ref, dependsOn: [] });
        embeddedPackages.push({ path: relative, name, version: manifest.version, treeSha256, files: tree.length, parentPackage: owner.package });
    }
    return { bom, evidence: { schemaVersion: 1, kind: 'eos-r9-authenticated-six-adapter-derivative-sbom', previousReleaseId, sourceCommit,
        previousSbomCanonicalJsonSha256: sha256(Buffer.from(JSON.stringify(previousSbom))), actualAppFileTableSha256, actualAppModeTableSha256,
        changed, derivatives, embeddedPackages, sourceLockEvidence, npmResolutionPerformed: false, dependencyLockUnchanged: true,
        thirdPartyInstalledBytesAndModesUnchanged: true, vulnerabilityScanPerformed: false, operatingSystemInventoryIncluded: false,
        hardwareTested: false, productionReleaseApproved: false } };
}
module.exports = { bindDerivative, appRows, digestRows, checkPackage, OWNERS, ASSEMBLY, R8_EEBUS_SOURCE_LOCK };
