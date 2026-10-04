#!/usr/bin/env node
'use strict';
// Deterministic cache namespace for the reviewed prebuilt Admin hotfix. A Vite
// rebuild normally hashes modules; the inherited prebuilt names were unchanged.
// Version the reverse dependency closure, including dynamic-import preload maps,
// so cached feature chunks cannot re-import an old bootstrap module identity.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const REPO = path.resolve(__dirname, '../..');
const VERSION = '20261004';
const SEEDS = ['index-CQZugZ1z-v84.js', 'bootstrap-COulQZax-v84.js'];
const LOCAL_JS = /(["'])((?:\.\/)?[A-Za-z0-9_.-]+\.js)(?:\?[^"']*)?\1/g;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function closure(modules) {
    const affected = new Set(SEEDS);
    for (const seed of SEEDS) if (!modules.has(seed)) throw new Error('CACHE_SEED_MISSING');
    let more = true;
    while (more) {
        more = false;
        for (const [name, source] of modules) {
            if (affected.has(name)) continue;
            const references = [...source.matchAll(LOCAL_JS)].map(match => path.basename(match[2]));
            if (references.some(dependency => affected.has(dependency))) { affected.add(name); more = true; }
        }
    }
    return affected;
}

function versionSource(source, affected) {
    return source.replace(LOCAL_JS, (whole, quote, specifier) => affected.has(path.basename(specifier))
        ? `${quote}${specifier}?eos=${VERSION}${quote}` : whole);
}

function apply(repository = REPO) {
    const assets = path.join(repository, 'components/admin/adminWww/assets');
    const modules = new Map(fs.readdirSync(assets).filter(name => name.endsWith('.js'))
        .map(name => [name, fs.readFileSync(path.join(assets, name), 'utf8')]));
    const affected = closure(modules), changes = [], stableLibraries = [];
    for (const [name, source] of modules) {
        const updated = versionSource(source, affected);
        if (source !== updated) { fs.writeFileSync(path.join(assets, name), updated); changes.push(`components/admin/adminWww/assets/${name}`); }
        if (!affected.has(name)) stableLibraries.push({ name, sha256: digest(source) });
    }
    for (const relative of ['components/admin/adminWww/index.html', 'components/admin/src-admin/index.html']) {
        const filename = path.join(repository, relative), source = fs.readFileSync(filename, 'utf8');
        let updated = source.replace(/(data-eos-entry=")([^"?]+)(?:\?[^"]*)?("[-\s>])/g,
            (_, start, entry, end) => `${start}${entry}?eos=${VERSION}${end}`);
        // Product-owned shell scripts/styles: a shared query also refreshes a
        // previously cached role bootstrap before it reads the new entry URL.
        updated = updated.replace(/((?:src|href)=")((?:\.\/)?(?:js\/(?:eos-|nexowatt-)[^"?]+\.js|css\/(?:eos-|nexowatt-)[^"?]+\.css))(?:\?[^"]*)?(")/g,
            (_, start, resource, end) => `${start}${resource}?eos=${VERSION}${end}`);
        if (!updated.includes(`name="nexowatt-eos-asset-version"`)) {
            updated = updated.replace('<head>', `<head>\n        <meta name="nexowatt-eos-asset-version" content="${VERSION}" />`);
        }
        if (source !== updated) { fs.writeFileSync(filename, updated); changes.push(relative); }
    }
    return { schemaVersion: 1, version: VERSION, affectedModules: [...affected].sort(),
        changedFiles: changes.sort(), stableLibraryHashes: stableLibraries.sort((a, b) => a.name.localeCompare(b.name)) };
}

module.exports = { VERSION, SEEDS, LOCAL_JS, closure, versionSource, apply };
if (require.main === module) {
    if (process.argv.length !== 2) throw new Error('CACHE_USAGE');
    const report = apply();
    const directory = path.join(REPO, 'reports/integration/admin-browser-cache-20261004');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'asset-versioning.json'), `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`EOS Admin ${VERSION}: ${report.affectedModules.length} application modules, ${report.changedFiles.length} changed files, library contents preserved.\n`);
}
