'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareCatalogPayload } = require('../../tools/integration/package-postgresql-test.cjs');
const { inventory } = require('../../runtime/release/bundle.cjs');
const { componentTreeDigest } = require('../../runtime/policy/admission.cjs');
const { componentRows } = require('../../tools/system/build-bundle.cjs');

test('catalog hashes the actual prepared payload while preserving three nested npm helpers in source', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-catalog-payload-'));
    t.after(() => { assert.ok(path.resolve(root).startsWith(path.join(os.tmpdir(), 'eos-catalog-payload-'))); fs.rmSync(root, { recursive: true, force: true }); });
    const app = path.join(root, 'app'), payload = path.join(root, 'payload'), name = 'iobroker.nexowatt-ui';
    function write(relative, data) { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data)); }
    write('app/package.json', { name: 'fixture', version: '1.0.0' });
    write('app/package-lock.json', { lockfileVersion: 3, packages: {} });
    write(`app/node_modules/${name}/package.json`, { name, version: '1.0.21', main: 'main.js' });
    write(`app/node_modules/${name}/main.js`, 'module.exports = "exact-runtime-fixture";');
    write(`app/node_modules/${name}/node_modules/mime/package.json`, { name: 'mime', version: '3.0.0' });
    write(`app/node_modules/${name}/node_modules/mime/index.js`, 'module.exports = "required-library";');
    for (const file of ['mime', 'mime.cmd', 'mime.ps1']) write(`app/node_modules/${name}/node_modules/.bin/${file}`, 'not-a-runtime-entrypoint');
    write('sbom.json', { bomFormat: 'CycloneDX', components: [] });
    const sourceBefore = inventory(app), relativeRows = sourceBefore.filter(row => row.path.startsWith(`node_modules/${name}/`))
        .map(row => ({ path: row.path.slice(`node_modules/${name}/`.length), size: row.size, sha256: row.sha256 }));
    const catalog = { schemaVersion: 1, kind: 'fixture', entries: [{ package: name, sha256: '', review: { status: 'pending' } }] };
    const catalogFile = path.join(root, 'catalog.json'), sbomFile = path.join(root, 'sbom.json');
    const result = prepareCatalogPayload({ app, payload, catalogFile, sbomFile, catalog });
    const delivered = componentRows(inventory(payload), name);
    assert.equal(relativeRows.length, 7); assert.equal(delivered.length, 4);
    assert.ok(delivered.some(row => row.path === 'node_modules/mime/index.js'));
    assert.ok(!delivered.some(row => row.path.includes('/.bin/')));
    assert.equal(result.entries[0].sha256, componentTreeDigest(delivered));
    assert.notEqual(result.entries[0].sha256, componentTreeDigest(relativeRows));
    assert.deepEqual(inventory(app), sourceBefore);
    assert.deepEqual(fs.readFileSync(catalogFile), fs.readFileSync(path.join(payload, 'catalog.json')));
    assert.equal(catalog.entries[0].sha256, ''); assert.deepEqual(result.entries[0].review, { status: 'pending' });
    fs.appendFileSync(path.join(payload, 'app/node_modules', name, 'main.js'), '\n// changed after catalog');
    assert.notEqual(result.entries[0].sha256, componentTreeDigest(componentRows(inventory(payload), name)));
    assert.throws(() => prepareCatalogPayload({ app, payload, catalogFile, sbomFile, catalog }), { code: 'EEXIST' });
});
