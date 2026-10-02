#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const { inspect } = require('./nexowatt-lock-provenance-check.cjs');
const manifest = { name: 'fixture', version: '1.0.0', dependencies: { sample: '1.0.0' } };
const entry = { version: '1.0.0', resolved: 'https://registry.npmjs.org/sample/-/sample-1.0.0.tgz', integrity: `sha512-${Buffer.alloc(64).toString('base64')}` };
const lock = value => ({ ...manifest, lockfileVersion: 3, packages: { '': manifest, 'node_modules/sample': { ...entry, ...value } } });
assert.deepEqual(inspect(manifest, lock({})), []);
assert(inspect(manifest, lock({ integrity: `sha1-${Buffer.alloc(20).toString('base64')}` })).some(x => x.code === 'STRONG_INTEGRITY_MISSING'));
for (const resolved of ['http://registry.npmjs.org/a.tgz', 'https://registry.npmjs.org.attacker.invalid/a.tgz', 'https://name:fixture@registry.npmjs.org/a.tgz', 'https://registry.npmjs.org/a.tgz?token=fixture', 'https://127.0.0.1/a.tgz', undefined]) {
    const result = inspect(manifest, lock({ resolved }));
    assert(result.some(x => x.code === 'REGISTRY_ORIGIN_UNVERIFIED'));
    assert(!JSON.stringify(result).includes('fixture@'), 'candidate URLs never emitted');
}
assert(inspect(manifest, lock({ link: true })).some(x => x.code === 'LINK_REQUIRES_REVIEW'));
assert(inspect({ ...manifest, version: '1.0.1' }, lock({})).some(x => x.code === 'MANIFEST_DRIFT'));
assert.deepEqual(inspect(manifest, {}), [{ code: 'LOCK_STRUCTURE' }]);
console.log('[NexoWatt lock provenance] OK (11 admission/denial cases; no network or package execution)');
