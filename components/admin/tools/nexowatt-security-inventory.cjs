#!/usr/bin/env node
'use strict';

// Dependency-free inventory. This inventories declared lockfile packages, NOT an
// installed dependency tree and NOT the contents of an existing frontend bundle.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const TOOL_VERSION = '1.0.0';
const LIMITATION = 'Lockfile reference inventory only; no installed tree, bundle composition, CVE assessment, or deployed-device attestation.';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const posix = value => value.split(path.sep).join('/');

function packageName(location, entry) {
    if (typeof entry.name === 'string' && entry.name) return entry.name;
    return location.slice(location.lastIndexOf('node_modules/') + 'node_modules/'.length);
}

function npmPurl(name, version) {
    const parts = name.split('/');
    return `pkg:npm/${parts.map(part => encodeURIComponent(part)).join('/')}@${encodeURIComponent(version)}`;
}

function safeResolved(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
        return url.href;
    } catch { return null; }
}

function integrityHashes(integrity) {
    if (typeof integrity !== 'string') return [];
    const labels = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512', sha1: 'SHA-1' };
    const sizes = { sha256: 32, sha384: 48, sha512: 64, sha1: 20 };
    return integrity.trim().split(/\s+/).flatMap(part => {
        const match = /^(sha1|sha256|sha384|sha512)-([A-Za-z0-9+/]+={0,2})$/.exec(part);
        if (!match) return [];
        const bytes = Buffer.from(match[2], 'base64');
        if (bytes.length !== sizes[match[1]] || bytes.toString('base64') !== match[2]) return [];
        return [{ alg: labels[match[1]], content: bytes.toString('hex') }];
    });
}

function resolveLocation(packages, from, dependency) {
    let current = from;
    for (;;) {
        const candidate = `${current ? `${current}/` : ''}node_modules/${dependency}`;
        if (Object.hasOwn(packages, candidate)) return candidate;
        if (!current) return null;
        current = path.posix.dirname(current);
        if (current === '.') current = '';
        // Node's resolver never tries node_modules/node_modules/<name>.
        if (path.posix.basename(current) === 'node_modules') {
            current = path.posix.dirname(current);
            if (current === '.') current = '';
        }
    }
}

function manifestDrift(manifest, lock) {
    const root = lock.packages[''] || {};
    const problems = [];
    for (const key of ['name', 'version']) {
        if (manifest[key] !== root[key] || manifest[key] !== lock[key]) problems.push(`root-${key}-mismatch`);
    }
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        const declared = manifest[field] || {};
        const recorded = root[field] || {};
        for (const name of [...new Set([...Object.keys(declared), ...Object.keys(recorded)])].sort()) {
            if (declared[name] !== recorded[name]) problems.push(`${field}:${name}`);
        }
    }
    return problems;
}

function buildLockInventory(manifest, lock, label, inputHashes, timestamp) {
    if (![2, 3].includes(lock.lockfileVersion) || !lock.packages || typeof lock.packages !== 'object') {
        throw new Error(`Unsupported or absent packages map in ${label}`);
    }
    const rootRef = `nexowatt:${label}:root`;
    const root = lock.packages[''] || {};
    const locations = Object.keys(lock.packages).filter(p => p !== '').sort();
    const refs = new Map(locations.map(p => [p, `nexowatt:${label}:${p}`]));
    const unresolved = [];
    const components = locations.map(location => {
        const entry = lock.packages[location];
        const name = packageName(location, entry);
        const component = {
            type: 'library', 'bom-ref': refs.get(location), name,
            ...(entry.version ? { version: entry.version, purl: npmPurl(name, entry.version) } : {}),
            properties: [
                { name: 'nexowatt:lockfile:location', value: location },
                { name: 'nexowatt:lockfile:dev', value: String(Boolean(entry.dev)) },
                { name: 'nexowatt:lockfile:optional', value: String(Boolean(entry.optional)) },
                { name: 'nexowatt:lockfile:hasInstallScript', value: String(Boolean(entry.hasInstallScript)) },
            ],
        };
        if (entry.license && typeof entry.license === 'string') component.licenses = [{ license: { name: entry.license } }];
        const hashes = integrityHashes(entry.integrity);
        if (hashes.length) component.hashes = hashes;
        const resolved = safeResolved(entry.resolved);
        if (resolved) component.externalReferences = [{ type: 'distribution', url: resolved }];
        if (entry.link) component.properties.push({ name: 'nexowatt:lockfile:link', value: 'true' });
        return component;
    });
    const dependencies = ['', ...locations].map(location => {
        const entry = lock.packages[location];
        const fields = location ? ['dependencies', 'optionalDependencies', 'peerDependencies'] : ['dependencies', 'devDependencies', 'optionalDependencies'];
        const names = [...new Set(fields.flatMap(field => Object.keys(entry[field] || {})))].sort();
        const dependsOn = [];
        for (const name of names) {
            const found = resolveLocation(lock.packages, location, name);
            if (found) dependsOn.push(refs.get(found));
            else unresolved.push({ location, dependency: name, optional: Object.hasOwn(entry.optionalDependencies || {}, name) || Boolean(entry.peerDependenciesMeta?.[name]?.optional), peer: Object.hasOwn(entry.peerDependencies || {}, name) });
        }
        return { ref: location ? refs.get(location) : rootRef, dependsOn: [...new Set(dependsOn)].sort() };
    });
    const drift = manifestDrift(manifest, lock);
    const bom = {
        bomFormat: 'CycloneDX', specVersion: '1.5', version: 1,
        metadata: {
            timestamp,
            tools: [{ vendor: 'NexoWatt', name: 'nexowatt-security-inventory', version: TOOL_VERSION }],
            component: { type: 'application', 'bom-ref': rootRef, name: manifest.name, version: manifest.version, purl: npmPurl(manifest.name, manifest.version) },
            properties: [
                { name: 'nexowatt:inventory:scope', value: `${label}: npm lockfile reference packages` },
                { name: 'nexowatt:inventory:limitations', value: LIMITATION },
                { name: 'nexowatt:input:package-json-sha256', value: inputHashes.manifest },
                { name: 'nexowatt:input:package-lock-sha256', value: inputHashes.lock },
                { name: 'nexowatt:unresolved-edges', value: String(unresolved.length) },
            ],
        },
        components, dependencies,
    };
    const direct = Object.keys(manifest.dependencies || {}).sort().map(name => {
        const location = resolveLocation(lock.packages, '', name);
        const entry = location ? lock.packages[location] : null;
        return { name, declared: manifest.dependencies[name], locked: entry?.version || null, location };
    });
    return {
        bom,
        summary: {
            label, name: manifest.name, version: manifest.version, lockfileVersion: lock.lockfileVersion,
            inputHashes, limitations: LIMITATION, componentCount: components.length,
            lockNonDevCount: locations.filter(p => !lock.packages[p].dev).length,
            lockDevCount: locations.filter(p => lock.packages[p].dev).length,
            installScriptCount: locations.filter(p => lock.packages[p].hasInstallScript).length,
            withoutIntegrityCount: locations.filter(p => !integrityHashes(lock.packages[p].integrity).length).length,
            linksCount: locations.filter(p => lock.packages[p].link).length,
            manifestDrift: drift, directDependencies: direct, unresolvedEdges: unresolved,
            rootEngines: manifest.engines || {},
        },
    };
}

function walkFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
        const filename = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error('Symlink in inventoried runtime directory');
        if (entry.isDirectory()) return walkFiles(filename);
        return entry.isFile() ? [filename] : [];
    });
}

function generate(rootDirectory, outputDirectory, timestamp = new Date().toISOString()) {
    const summary = { tool: `nexowatt-security-inventory@${TOOL_VERSION}`, timestamp, environment: { node: process.version, platform: process.platform, arch: process.arch }, limitations: LIMITATION, inventories: [] };
    const artifacts = [];
    for (const [label, directory] of [['backend', ''], ['frontend', 'src-admin']]) {
        const manifestPath = path.join(rootDirectory, directory, 'package.json');
        const lockPath = path.join(rootDirectory, directory, 'package-lock.json');
        const result = buildLockInventory(readJSON(manifestPath), readJSON(lockPath), label, { manifest: hash(fs.readFileSync(manifestPath)), lock: hash(fs.readFileSync(lockPath)) }, timestamp);
        summary.inventories.push(result.summary);
        artifacts.push([`sbom-${label}-lock.cdx.json`, result.bom]);
    }
    const runtimeFiles = ['build', 'admin', 'adminWww', 'public'].flatMap(directory => walkFiles(path.join(rootDirectory, directory))).map(filename => ({ path: posix(path.relative(rootDirectory, filename)), size: fs.statSync(filename).size, sha256: hash(fs.readFileSync(filename)) })).sort((a, b) => a.path.localeCompare(b.path));
    const sourceFiles = walkFiles(path.join(rootDirectory, 'src')).map(filename => ({ path: posix(path.relative(rootDirectory, filename)), size: fs.statSync(filename).size, sha256: hash(fs.readFileSync(filename)) })).sort((a, b) => a.path.localeCompare(b.path));
    artifacts.push(['source-runtime-manifest.json', { schemaVersion: 1, timestamp, description: 'Byte-level hashes of source and prebuilt files. A file hash does not prove that a build was generated from the source or which dependency code a bundle contains.', sourceFiles, runtimeFiles }]);
    summary.runtimeFileCount = runtimeFiles.length;
    summary.sourceFileCount = sourceFiles.length;
    summary.vendoredPackageManifests = runtimeFiles.filter(file => path.posix.basename(file.path) === 'package.json').map(file => {
        const manifest = readJSON(path.join(rootDirectory, file.path));
        return { path: file.path, name: manifest.name, version: manifest.version, license: manifest.license || null, manifestSha256: file.sha256, limitation: 'Version is asserted by the shipped manifest; tarball authenticity and actual browser inclusion are not established.' };
    });
    summary.productionInstallExecuted = false;
    summary.frontendBuildExecuted = false;
    summary.cveScanExecuted = false;
    artifacts.push(['inventory-summary.json', summary]);
    fs.mkdirSync(outputDirectory, { recursive: true });
    for (const [filename, value] of artifacts) fs.writeFileSync(path.join(outputDirectory, filename), `${JSON.stringify(value, null, 2)}\n`);
    return summary;
}

if (require.main === module) {
    try {
        const root = path.resolve(__dirname, '..');
        const epoch = process.env.SOURCE_DATE_EPOCH;
        if (epoch !== undefined && !/^\d+$/.test(epoch)) throw new Error('SOURCE_DATE_EPOCH must contain integer seconds');
        const timestamp = epoch === undefined ? new Date().toISOString() : new Date(Number(epoch) * 1000).toISOString();
        const summary = generate(root, path.join(root, 'reports/security'), timestamp);
        for (const inventory of summary.inventories) console.log(`${inventory.label}: ${inventory.componentCount} lockfile components; ${inventory.manifestDrift.length} manifest mismatches; ${inventory.unresolvedEdges.length} unresolved references`);
        console.log(LIMITATION);
        if (summary.inventories.some(inventory => inventory.manifestDrift.length)) process.exitCode = 1;
    } catch (error) {
        console.error(`Inventory failed: ${error.message}`);
        process.exitCode = 1;
    }
}

module.exports = { buildLockInventory, generate, integrityHashes, manifestDrift, npmPurl, resolveLocation, safeResolved };
