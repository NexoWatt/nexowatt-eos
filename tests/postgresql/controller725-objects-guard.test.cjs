'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { assertRuntime } = require('./controller725-objects-guard.cjs');
function fixture(t) {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-objects725-guard-'));
    t.after(() => fs.rmSync(app, { recursive: true, force: true }));
    function add(name, version = '7.2.5', prefix = app) {
        const directory = path.join(prefix, 'node_modules', name);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name, version, main: 'index.cjs' }));
        fs.writeFileSync(path.join(directory, 'index.cjs'), 'throw new Error("fixture must only be resolved");\n');
        return directory;
    }
    for (const name of ['@iobroker/db-objects-redis', '@iobroker/db-base', '@iobroker/js-controller-common-db', 'iobroker.js-controller']) add(name);
    return { app, add, verify: () => assertRuntime(app, path.join(app, 'source-backend.cjs')) };
}
test('Objects 7.2.5 harness follows canonical actual resolution without executing guard fixtures', t => {
    assert.deepEqual(fixture(t).verify(), { controllerVersion: '7.2.5', canonicalPackages: 4 });
});
for (const version of ['7.2.2', '8.0.0']) test(`Objects 7.2.5 harness rejects ${version} before loading the shared suite`, t => {
    const f = fixture(t); f.add('@iobroker/db-base', version);
    assert.throws(f.verify, { code: 'OBJECTS725_VERSION' });
});
test('Objects 7.2.5 harness rejects a same-version nested domain dependency', t => {
    const f = fixture(t);
    f.add('@iobroker/db-base', '7.2.5', path.join(f.app, 'node_modules/@iobroker/db-objects-redis'));
    assert.throws(f.verify, { code: 'OBJECTS725_RESOLUTION' });
});
