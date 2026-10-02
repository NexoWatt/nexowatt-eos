'use strict';
// Offline release gate. A signed but stale SBOM must not describe another tree.
// This verifies installed npm identities and explicitly vendored directories;
// it does not reconstruct frontend bundles or claim OS/firmware coverage.
const path = require('node:path');
const { readFileLimited, sha256 } = require('./bundle.cjs');
const PACKAGE = '(?:@[a-z0-9._~-]+/)?[a-z0-9._~-]+';
const PACKAGE_PATH = new RegExp(`^(?:node_modules/${PACKAGE}/)*node_modules/${PACKAGE}$`);
const PACKAGE_OWNER = new RegExp(`^((?:node_modules/${PACKAGE}/)*node_modules/${PACKAGE})(?:/|$)`);
const EMBEDDED = Object.freeze({
    'node_modules/iobroker.eos-admin/adminWww/lib/js/crypto-js': 'crypto-js',
    'node_modules/iobroker.eos-admin/packages/eos-license-client': '@nexowatt/eos-license-client',
    'node_modules/iobroker.nexowatt-ui/packages/eos-license-client': '@nexowatt/eos-license-client',
});
function reject(code) { const error = new Error(code); error.code = code; throw error; }
function properties(rows) {
    const out = Object.create(null);
    if (!Array.isArray(rows)) reject('SBOM_PROPERTIES');
    for (const row of rows) {
        if (!row || typeof row.name !== 'string' || typeof row.value !== 'string') reject('SBOM_PROPERTIES');
        // CycloneDX allows duplicate properties generally; these EOS contracts
        // have exactly one value so conflicting claims cannot be hidden.
        if (row.name.startsWith('eos:')) {
            if (Object.hasOwn(out, row.name)) reject('SBOM_PROPERTIES');
            out[row.name] = row.value;
        }
    }
    return out;
}
function verifySbomBinding(payload, files, profile) {
    const rows = new Map(files.map(row => [row.path, row]));
    function load(relative) {
        if (!rows.has(relative)) reject('SBOM_FILE_MISSING');
        const bytes = readFileLimited(path.join(payload, relative), 16 * 1024 * 1024).bytes;
        if (sha256(bytes) !== rows.get(relative).sha256) reject('SBOM_FILE_CHANGED');
        return JSON.parse(bytes);
    }
    const bom = load('sbom.cdx.json'), app = load('app/package.json'), lock = load('app/package-lock.json');
    if (bom.bomFormat !== 'CycloneDX' || bom.specVersion !== '1.5' || !Array.isArray(bom.components) ||
        !Array.isArray(bom.dependencies) || bom.components.length > 10000) reject('SBOM_FORMAT');
    const root = bom.metadata?.component;
    if (!app.name || !app.version || root?.name !== app.name || root?.version !== app.version ||
        root?.['bom-ref'] !== `${app.name}@${app.version}` ||
        lock.packages?.['']?.name !== app.name || lock.packages?.['']?.version !== app.version) reject('SBOM_ROOT');
    const props = properties(bom.metadata?.properties);
    if (props['eos:sbom:scope'] !== 'installed-test-runtime-npm-tree' ||
        props['eos:sbom:package-json-sha256'] !== rows.get('app/package.json').sha256 ||
        props['eos:sbom:package-lock-sha256'] !== rows.get('app/package-lock.json').sha256) reject('SBOM_ROOT_BINDING');
    const identities = new Set(), installed = new Set(), refs = new Set([root['bom-ref']]);
    const embedded = new Map();
    for (const component of bom.components) {
        if (!component || typeof component.name !== 'string' || !component.name ||
            typeof component.version !== 'string' || !component.version || typeof component['bom-ref'] !== 'string' ||
            !component['bom-ref'] || refs.has(component['bom-ref'])) reject('SBOM_COMPONENT');
        refs.add(component['bom-ref']);
        const cp = properties(component.properties || []);
        if (cp['eos:scope'] === 'embedded-package-files-observed-in-runtime-tree') {
            const relative = cp['eos:installed-path'];
            if (!Object.hasOwn(EMBEDDED, relative || '') || embedded.has(relative) ||
                component.name !== EMBEDDED[relative] || component['bom-ref'] !== `eos-embedded:${relative}`) reject('SBOM_EMBEDDED');
            embedded.set(relative, { component, props: cp });
        } else identities.add(`${component.name}@${component.version}`);
    }
    for (const dep of bom.dependencies) {
        if (!refs.has(dep?.ref) || !Array.isArray(dep.dependsOn) || dep.dependsOn.some(ref => !refs.has(ref))) reject('SBOM_GRAPH');
    }
    let count = 0;
    for (const [relative, entry] of Object.entries(lock.packages)) {
        if (!relative) continue;
        if (!PACKAGE_PATH.test(relative) || !entry || entry.link) reject('SBOM_LOCK_PATH');
        const filename = `app/${relative}/package.json`;
        if (!rows.has(filename)) { if (entry.optional !== true) reject('SBOM_PACKAGE_MISSING'); continue; }
        const manifest = load(filename), label = relative.split('node_modules/').at(-1);
        const name = entry.name || label;
        if (manifest.name !== name || manifest.version !== entry.version ||
            !identities.has(`${name}@${entry.version}`)) reject('SBOM_PACKAGE_IDENTITY');
        installed.add(`${name}@${entry.version}`); count++;
    }
    for (const filename of rows.keys()) {
        if (!filename.startsWith('app/node_modules/') || filename === 'app/node_modules/.package-lock.json') continue;
        // Node can load index.js or a bare .js file without any package.json.
        // Attribute all files at npm resolution boundaries, not just manifests.
        const relative = filename.slice(4), owner = PACKAGE_OWNER.exec(relative)?.[1];
        // Node also resolves lib/node_modules/name from code in lib/. A
        // canonical lock owner must not hide an additional resolution boundary.
        if (!owner || relative.slice(owner.length).includes('/node_modules/') ||
            !Object.hasOwn(lock.packages, owner) || !rows.has(`app/${owner}/package.json`)) reject('SBOM_UNLISTED_PACKAGE');
    }
    if (identities.size !== installed.size || [...identities].some(id => !installed.has(id))) reject('SBOM_COMPONENT_NOT_INSTALLED');
    for (const [relative, name] of Object.entries(EMBEDDED)) {
        const filename = `app/${relative}/package.json`, declared = embedded.get(relative);
        const present = files.some(row => row.path.startsWith(`app/${relative}/`));
        if (!rows.has(filename)) { if (declared || present) reject('SBOM_EMBEDDED'); continue; }
        const manifest = load(filename);
        const tree = files.filter(row => row.path.startsWith(`app/${relative}/`))
            .map(row => ({ path: row.path.slice(relative.length + 5), size: row.size, sha256: row.sha256 }));
        if (!declared || manifest.name !== name || manifest.version !== declared.component.version ||
            declared.props['eos:manifest-sha256'] !== rows.get(filename).sha256 ||
            declared.props['eos:tree-sha256'] !== sha256(Buffer.from(JSON.stringify(tree)))) reject('SBOM_EMBEDDED');
    }
    if (profile !== undefined) {
        // The release caller supplies verifyBuildProfile's independently
        // checked output. Identity alone cannot bind a pre-transform SBOM to
        // locally hardened code whose npm version and lock remain unchanged.
        if (profile?.schemaVersion !== 1 || profile.kind !== 'eos-controller-profile-verification' ||
            profile.controllerVersion !== '7.2.2' || profile.productionApproved !== false ||
            !Array.isArray(profile.files) || !profile.files.length || profile.files.length > 100) reject('SBOM_TRANSFORM_PROFILE');
        const transformed = new Map(), seen = new Set();
        for (const row of profile.files) {
            const owner = ['iobroker.js-controller', '@iobroker/js-controller-cli', '@iobroker/ws-server']
                .find(name => typeof row?.relativePath === 'string' && row.relativePath.startsWith(`node_modules/${name}/`));
            if (!owner || seen.has(row.relativePath) || !/^[a-f0-9]{64}$/.test(row.sha256 || '') ||
                rows.get(`app/${row.relativePath}`)?.sha256 !== row.sha256) reject('SBOM_TRANSFORM_PROFILE');
            seen.add(row.relativePath);
            if (!transformed.has(owner)) transformed.set(owner, []);
            transformed.get(owner).push({ relativePath: row.relativePath, sha256: row.sha256 });
        }
        for (const [name, records] of transformed) {
            const manifest = load(`app/node_modules/${name}/package.json`);
            const components = bom.components.filter(row => row.name === name && row.version === manifest.version);
            const table = records.sort((a, b) => a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0);
            const digest = sha256(Buffer.from(JSON.stringify(table)));
            if (components.length !== 1) reject('SBOM_TRANSFORM_COMPONENT');
            const component = components[0], ancestors = component.pedigree?.ancestors;
            if (component.modified !== true || Object.hasOwn(component, 'hashes') ||
                !Array.isArray(ancestors) || ancestors.length !== 1 ||
                ancestors[0]?.name !== name || ancestors[0]?.version !== manifest.version ||
                properties(component.properties || [])['eos:transform:file-table-sha256'] !== digest) reject('SBOM_TRANSFORM_BINDING');
        }
    }
    return { installedPackages: count, uniqueNpmComponents: installed.size, embeddedPackages: embedded.size,
        scope: 'npm-and-explicit-vendored-packages', fullOperatingSystemInventory: false };
}
module.exports = { verifySbomBinding };
