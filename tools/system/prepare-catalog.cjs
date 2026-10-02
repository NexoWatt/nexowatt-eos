'use strict';
// Inventory is never approval. Every generated entry stays pending until the
// manufacturer records a real review and signs the resulting release bundle.
const fs = require('node:fs');
const path = require('node:path');
const { inventory, readFileLimited } = require('../../runtime/release/bundle.cjs');
const { validateCatalog, componentTreeDigest } = require('../../runtime/policy/admission.cjs');
function prepareCatalog(appDirectory) {
    const app = JSON.parse(readFileLimited(path.join(appDirectory, 'package.json')).bytes);
    if (!app.dependencies || Object.keys(app.dependencies).length > 128) throw new Error('CATALOG_DEPENDENCIES');
    const entries = Object.entries(app.dependencies).map(([name, version]) => {
        if (!/^iobroker\.[a-z0-9][a-z0-9_-]*$/.test(name) || !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error('CATALOG_PACKAGE');
        const directory = path.join(appDirectory, 'node_modules', name);
        const pkg = JSON.parse(readFileLimited(path.join(directory, 'package.json')).bytes);
        if (pkg.name !== name || pkg.version !== version) throw new Error('CATALOG_IDENTITY');
        const rows = inventory(directory).map(({ path, size, sha256 }) => ({ path, size, sha256 }));
        return { id: name === 'iobroker.js-controller' ? 'js-controller' : name.slice('iobroker.'.length).replaceAll('_', '-'),
            package: name, version, sha256: componentTreeDigest(rows), digestKind: 'tree-sha256-v1',
            kind: name === 'iobroker.js-controller' ? 'core' : 'adapter', required: name === 'iobroker.js-controller',
            review: { status: 'pending', evidenceId: null },
            permissions: { capabilities: [], protocols: [], network: 'none', shellExec: false, additionalNpmModules: [], arbitraryCode: false },
            communication: 'legacy-unintegrated' };
    });
    return validateCatalog({ schemaVersion: 1, kind: 'eos-adapter-admission', catalogRevision: 1, entries });
}
module.exports = { prepareCatalog };
if (require.main === module) {
    try {
        if (process.argv.length !== 6 || process.argv[2] !== '--app' || process.argv[4] !== '--output') throw new Error('CATALOG_USAGE');
        const catalog = prepareCatalog(path.resolve(process.argv[3]));
        fs.writeFileSync(path.resolve(process.argv[5]), `${JSON.stringify(catalog, null, 2)}\n`, { flag: 'wx', mode: 0o644 });
        process.stdout.write(`${JSON.stringify({ ok: true, entries: catalog.entries.length, approval: 'pending' })}\n`);
    } catch { process.stderr.write('{"ok":false,"code":"CATALOG_PREPARATION_FAILED"}\n'); process.exitCode = 1; }
}
