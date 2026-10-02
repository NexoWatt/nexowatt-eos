#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { buildLockInventory, integrityHashes, manifestDrift, npmPurl, resolveLocation, safeResolved } = require('./nexowatt-security-inventory.cjs');
const digest = crypto.createHash('sha512').update('fixture').digest('base64');
assert.deepEqual(integrityHashes(`sha512-${digest}`), [{ alg: 'SHA-512', content: Buffer.from(digest, 'base64').toString('hex') }]);
assert.deepEqual(integrityHashes('sha512-AAAA'), []);
assert.equal(safeResolved('https://registry.npmjs.org/example/-/example-1.0.0.tgz'), 'https://registry.npmjs.org/example/-/example-1.0.0.tgz');
for (const url of ['https://name:private@example.test/a', 'https://example.test/a?token=private', 'http://example.test/a', 'file:///private/a']) assert.equal(safeResolved(url), null);
assert.equal(npmPurl('@scope/name', '1.0.0'), 'pkg:npm/%40scope/name@1.0.0');
const manifest = { name: 'fixture', version: '1.0.0', dependencies: { example: '^1.0.0' } };
const lock = { name: 'fixture', version: '1.0.0', lockfileVersion: 3, packages: {
    '': manifest,
    'node_modules/example': { version: '1.0.0', integrity: `sha512-${digest}`, dependencies: { '@scope/child': '^2.0.0' } },
    'node_modules/@scope/child': { version: '2.0.0' },
    'node_modules/example/node_modules/@scope/child': { version: '2.1.0', optionalDependencies: { 'not-on-platform': '1.0.0' } },
} };
assert.equal(resolveLocation(lock.packages, 'node_modules/example', '@scope/child'), 'node_modules/example/node_modules/@scope/child');
assert.equal(resolveLocation(lock.packages, 'node_modules/example/node_modules/@scope/child', 'example'), 'node_modules/example');
assert.equal(resolveLocation(lock.packages, '', 'absent'), null);
assert.deepEqual(manifestDrift(manifest, lock), []);
assert.deepEqual(manifestDrift({ ...manifest, version: '2.0.0' }, lock), ['root-version-mismatch']);
const result = buildLockInventory(manifest, lock, 'fixture', { manifest: 'a'.repeat(64), lock: 'b'.repeat(64) }, '2026-09-30T00:00:00.000Z');
assert.equal(result.summary.componentCount, 3);
assert.equal(result.summary.unresolvedEdges.length, 1);
assert.equal(result.summary.unresolvedEdges[0].optional, true);
const refs = new Set([result.bom.metadata.component['bom-ref'], ...result.bom.components.map(component => component['bom-ref'])]);
for (const dependency of result.bom.dependencies) {
    assert(refs.has(dependency.ref));
    for (const ref of dependency.dependsOn) assert(refs.has(ref));
}
assert.deepEqual(result, buildLockInventory(manifest, lock, 'fixture', { manifest: 'a'.repeat(64), lock: 'b'.repeat(64) }, '2026-09-30T00:00:00.000Z'));
console.log('PASS: inventory SRI conversion, safe distribution references, npm scope encoding, nested resolution, drift detection, graph referential integrity, deterministic output.');
