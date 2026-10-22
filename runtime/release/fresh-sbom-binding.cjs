'use strict';
// The new complete runtime is not an R9 derivative. Its actual installed tree,
// exact transforms and source-bound preparation are independently mandatory.
const { isDeepStrictEqual: equal } = require('node:util');
const { sha256 } = require('./bundle.cjs');
const ASSEMBLY = 'fresh-security-refresh-runtime-20261021';
const NODE = '24.22.1';
const CONTROLLER = '7.2.5';
const OWNERS = Object.freeze(['iobroker.js-controller', '@iobroker/js-controller-cli', '@iobroker/js-controller-adapter', '@iobroker/js-controller-common-db', '@iobroker/ws-server']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const content = rows => rows.map(({ path, size, sha256 }) => ({ path, size, sha256 }));
const digest = rows => sha256(Buffer.from(JSON.stringify(rows)));
function nodeComponent(record) {
    const node = record?.nodeRuntime;
    if (!node || Object.keys(node).sort().join('|') !== ['schemaVersion', 'version', 'platform', 'archiveSha256', 'binarySha256', 'licenseSha256'].sort().join('|') ||
        node.schemaVersion !== 1 || node.version !== record.nodeVersion || node.platform !== 'linux-arm64' ||
        !require('../updates/node-policy.cjs').supportedVersion(node.version) ||
        ['archiveSha256', 'binarySha256', 'licenseSha256'].some(k => !/^[a-f0-9]{64}$/.test(node[k] || ''))) fail('FRESH_SBOM_NODE');
    return { type: 'application', name: 'node', version: node.version,
        'bom-ref': `eos-node-runtime:${node.version}:${node.platform}`,
        hashes: [{ alg: 'SHA-256', content: node.binarySha256 }],
        properties: [{ name: 'eos:scope', value: 'signed-node-runtime' },
            { name: 'eos:installed-path', value: 'node-runtime/bin/node' },
            { name: 'eos:archive-sha256', value: node.archiveSha256 },
            { name: 'eos:metadata-sha256', value: sha256(Buffer.from(JSON.stringify(node, null, 2) + '\n')) },
            { name: 'eos:license-path', value: 'node-runtime/LICENSE' },
            { name: 'eos:license-sha256', value: node.licenseSha256 }] };
}
function verifyNodeComponent(bom, files, record) {
    const expected = nodeComponent(record);
    const entries = bom.components.filter(row => propMap(row.properties)['eos:scope'] === 'signed-node-runtime');
    if (entries.length !== 1 || !equal(entries[0], expected)) fail('FRESH_SBOM_NODE');
    const props = propMap(expected.properties), rows = files.filter(row => row.path.startsWith('node-runtime/'));
    const required = [['node-runtime/bin/node', record.nodeRuntime.binarySha256, 0o755],
        ['node-runtime/runtime.json', props['eos:metadata-sha256'], 0o644],
        ['node-runtime/LICENSE', record.nodeRuntime.licenseSha256, 0o644]];
    if (rows.length !== required.length || required.some(([name, hash, mode]) => {
        const row = rows.find(x => x.path === name);
        return !row || row.sha256 !== hash || row.mode !== mode || !Number.isSafeInteger(row.size) || row.size < 1;
    })) fail('FRESH_SBOM_NODE');
    return true;
}
function propMap(rows) {
    const result = Object.create(null);
    for (const row of rows || []) {
        if (!row || typeof row.name !== 'string' || typeof row.value !== 'string' || Object.hasOwn(result, row.name)) fail('FRESH_SBOM_PROPERTIES');
        result[row.name] = row.value;
    }
    return result;
}
function transformTable(profile, files) {
    if (profile?.schemaVersion !== 1 || profile.kind !== 'eos-controller-profile-verification' ||
        profile.controllerVersion !== CONTROLLER || profile.productionApproved !== false ||
        !Array.isArray(profile.files) || !profile.files.length || profile.files.length > 100) fail('FRESH_SBOM_PROFILE');
    const actual = new Map(files.map(row => [row.path, row])), result = new Map(), seen = new Set();
    for (const row of profile.files) {
        const owner = OWNERS.find(name => row?.relativePath?.startsWith(`node_modules/${name}/`));
        if (!owner || seen.has(row.relativePath) || !/^[a-f0-9]{64}$/.test(row.sha256 || '') || actual.get(row.relativePath)?.sha256 !== row.sha256) fail('FRESH_SBOM_PROFILE');
        seen.add(row.relativePath);
        if (!result.has(owner)) result.set(owner, []);
        result.get(owner).push({ relativePath: row.relativePath, sha256: row.sha256 });
    }
    for (const name of OWNERS) if (!result.has(name)) fail('FRESH_SBOM_PROFILE');
    for (const rows of result.values()) rows.sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
    return result;
}
function bindFreshSbom({ bom, files, profile, record, sequence }) {
    if (!Number.isSafeInteger(sequence) || sequence < 15 || record.controllerVersion !== CONTROLLER) fail('FRESH_SBOM_SEQUENCE');
    const copy = structuredClone(bom), tables = transformTable(profile, files);
    for (const [name, table] of tables) {
        const matches = copy.components.filter(row => row.name === name);
        if (matches.length !== 1) fail('FRESH_SBOM_COMPONENT');
        const component = matches[0];
        if (component.modified || component.pedigree) fail('FRESH_SBOM_ALREADY_TRANSFORMED');
        const ancestor = Object.fromEntries(['type', 'name', 'version', 'purl', 'hashes'].filter(k => Object.hasOwn(component, k)).map(k => [k, component[k]]));
        if (!ancestor.hashes?.length) fail('FRESH_SBOM_UPSTREAM_INTEGRITY');
        delete component.hashes;
        component.modified = true;
        component.pedigree = { ancestors: [ancestor], notes: 'Exact EOS security-refresh transformations; ancestor hashes describe upstream archives only.' };
        component.properties ||= [];
        component.properties.push({ name: 'eos:transform:file-table-sha256', value: digest(table) });
    }
    if (copy.components.some(row => propMap(row.properties)['eos:scope'] === 'signed-node-runtime')) fail('FRESH_SBOM_NODE');
    const node = nodeComponent(record);
    copy.components.push(node);
    copy.dependencies ||= [];
    copy.dependencies.push({ ref: node['bom-ref'], dependsOn: [] });
    const root = copy.dependencies.find(row => row.ref === copy.metadata?.component?.['bom-ref']);
    if (root) root.dependsOn.push(node['bom-ref']);
    const properties = {
        'eos:sbom:assembly': ASSEMBLY, 'eos:sbom:target-sequence': String(sequence),
        'eos:sbom:source-commit': record.sourceCommit, 'eos:sbom:fresh-npm-resolution': 'true',
        'eos:sbom:execution-scope': 'security-refresh-test', 'eos:sbom:actual-app-file-table-sha256': digest(content(files)),
        'eos:sbom:actual-app-mode-table-sha256': digest(files),
        'eos:sbom:build-record-sha256': sha256(Buffer.from(JSON.stringify(record, null, 2) + '\n')),
        'eos:sbom:hardware-tested': 'false', 'eos:sbom:production-approved': 'false'
    };
    copy.metadata.properties ||= [];
    if (copy.metadata.properties.some(row => Object.hasOwn(properties, row.name))) fail('FRESH_SBOM_DUPLICATE_BINDING');
    copy.metadata.properties.push(...Object.entries(properties).map(([name, value]) => ({ name, value })));
    return copy;
}
function verifyFreshSbom({ bom, files, profile, release, record }) {
    const props = propMap(bom.metadata?.properties), appRows = files.filter(row => row.path.startsWith('app/')).map(row => ({ ...row, path: row.path.slice(4) }));
    if (!Number.isSafeInteger(release?.sequence) || release.sequence < 15 || props['eos:sbom:assembly'] !== ASSEMBLY ||
        props['eos:sbom:target-sequence'] !== String(release.sequence) || props['eos:sbom:fresh-npm-resolution'] !== 'true' ||
        props['eos:sbom:execution-scope'] !== 'security-refresh-test' || props['eos:sbom:hardware-tested'] !== 'false' ||
        props['eos:sbom:production-approved'] !== 'false' || !/^[a-f0-9]{40}$/.test(props['eos:sbom:source-commit'] || '') ||
        props['eos:sbom:actual-app-file-table-sha256'] !== digest(content(appRows)) ||
        props['eos:sbom:actual-app-mode-table-sha256'] !== digest(appRows)) fail('FRESH_SBOM_BINDING');
    const row = files.find(row => row.path === 'runtime-build.json');
    if (!row || props['eos:sbom:build-record-sha256'] !== row.sha256 ||
        record?.schemaVersion !== 1 || record.kind !== ASSEMBLY || record.sourceCommit !== props['eos:sbom:source-commit'] ||
        record.sourceTreeClean !== true || !require('../updates/node-policy.cjs').supportedVersion(record.nodeVersion) ||
        (release.nodeVersion !== undefined && record.nodeVersion !== release.nodeVersion) || record.npmVersion !== '11.19.0' ||
        record.controllerVersion !== CONTROLLER || record.platform !== 'linux-arm64' || record.sequence !== release.sequence ||
        record.signed !== false || record.lifecycleScriptsExecuted !== false || record.productionReleaseApproved !== false ||
        record.appContentSha256 !== digest(content(appRows)) || record.appModeSha256 !== digest(appRows) ||
        record.packageLockSha256 !== files.find(row => row.path === 'app/package-lock.json')?.sha256) fail('FRESH_SBOM_BUILD_RECORD');
    const clients = bom.components.filter(row => row.name === '@nexowatt/eos-license-client');
    if (clients.length !== 6 || clients.some(row => row.version !== '1.0.2' ||
        propMap(row.properties)['eos:scope'] !== 'embedded-package-files-observed-in-runtime-tree') ||
        new Set(clients.map(row => propMap(row.properties)['eos:tree-sha256'])).size !== 1 ||
        clients.some(row => !/^[a-f0-9]{64}$/.test(propMap(row.properties)['eos:tree-sha256'] || ''))) fail('FRESH_SBOM_LICENSE_CLIENTS');
    const tables = transformTable(profile, appRows);
    for (const [name, table] of tables) {
        const matches = bom.components.filter(row => row.name === name);
        if (matches.length !== 1) fail('FRESH_SBOM_COMPONENT');
        const component = matches[0], ancestors = component.pedigree?.ancestors;
        if (component.modified !== true || Object.hasOwn(component, 'hashes') || !Array.isArray(ancestors) || ancestors.length !== 1 ||
            ancestors[0].name !== name || ancestors[0].version !== component.version || !ancestors[0].hashes?.length ||
            propMap(component.properties)['eos:transform:file-table-sha256'] !== digest(table)) fail('FRESH_SBOM_TRANSFORM');
    }
    if (!equal(record.controllerProfile, profile)) fail('FRESH_SBOM_PROFILE_BINDING');
    verifyNodeComponent(bom, files, record);
    return true;
}
module.exports = { ASSEMBLY, NODE, CONTROLLER, OWNERS, content, digest, transformTable, nodeComponent, verifyNodeComponent, bindFreshSbom, verifyFreshSbom };
