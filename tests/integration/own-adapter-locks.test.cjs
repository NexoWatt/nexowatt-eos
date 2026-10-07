'use strict';
// Dependency-free preflight: never replace a missing lock with npm install in CI.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const components = ['ui', 'eebus', 'ocpp21', 'backitup'];

function validate(pkg, lock) {
    assert.equal(lock.lockfileVersion, 3, 'reviewed npm v3 lock required');
    assert.equal(lock.name, pkg.name);
    assert.equal(lock.version, pkg.version);
    assert.ok(lock.packages && lock.packages[''], 'root package missing');
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        assert.deepEqual(lock.packages[''][field] || {}, pkg[field] || {}, field + ' differ from package.json');
    }
    for (const [name, item] of Object.entries(lock.packages)) {
        if (!name) continue;
        assert.equal(item.link, undefined, name + ': unexpected linked dependency');
        const source = new URL(item.resolved);
        assert.equal(source.protocol, 'https:', name + ': HTTPS archive required');
        assert.equal(source.username + source.password, '', name + ': credentials forbidden');
        assert.match(item.integrity, /^sha(?:512|384|256|1)-[A-Za-z0-9+/]+={0,2}$/, name + ': integrity digest missing');
    }
}

for (const component of components) {
    test(component + ' has a complete integrity-locked npm ci input', () => {
        const directory = path.join(root, 'components', component);
        validate(JSON.parse(fs.readFileSync(path.join(directory, 'package.json'))),
            JSON.parse(fs.readFileSync(path.join(directory, 'package-lock.json'))));
    });
}

test('lock preflight rejects drift, missing hashes and untrusted transport', () => {
    const pkg = { name: 'fixture', version: '1.0.0', dependencies: { example: '^1.0.0' } };
    const original = { name: pkg.name, version: pkg.version, lockfileVersion: 3, packages: {
        '': { dependencies: pkg.dependencies },
        'node_modules/example': { resolved: 'https://registry.npmjs.org/example/-/example-1.0.0.tgz', integrity: 'sha512-YWJjZA==' },
    } };
    validate(pkg, original);
    for (const change of [
        lock => { delete lock.packages['']; },
        lock => { lock.packages[''].dependencies.example = '^2.0.0'; },
        lock => { delete lock.packages['node_modules/example'].integrity; },
        lock => { lock.packages['node_modules/example'].resolved = 'http://registry.npmjs.org/example.tgz'; },
        lock => { lock.packages['node_modules/example'].resolved = 'https://user:secret@example.invalid/example.tgz'; },
        lock => { lock.packages['node_modules/example'].link = true; },
    ]) {
        const invalid = structuredClone(original); change(invalid);
        assert.throws(() => validate(pkg, invalid));
    }
});
