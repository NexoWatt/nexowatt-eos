'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { snapshot, normalizeRoot, build } = require('../../tools/integration/build-runtime.cjs');
const { copyRuntimeLicenses } = require('../../tools/system/build-bundle.cjs');
test('target package selection is explicit and rejects unsupported platforms', () => {
 const { targetArguments } = require('../../tools/integration/build-runtime.cjs');
 assert.deepEqual(targetArguments('linux-arm64'), ['--os=linux', '--cpu=arm64', '--libc=glibc']);
 assert.deepEqual(targetArguments('linux-x64'), ['--os=linux', '--cpu=x64', '--libc=glibc']);
 for (const value of ['linux-arm', 'win32-x64', '--force', undefined, null]) assert.throws(() => targetArguments(value), /BUILD_TARGET_PLATFORM/);
});
function dir(t) { const p = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-build-')); t.after(() => fs.rmSync(p, { force: true, recursive: true })); return p; }
function json(p, v) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)); }
function fixture(t) {
 const p = dir(t); const name = 'iobroker.test';
 json(path.join(p, 'package.json'), { dependencies: { [name]: 'file:../packages/test.tgz' } });
 json(path.join(p, 'node_modules', name, 'package.json'), { name, version: '1.2.3' });
 const lock = { lockfileVersion: 3, packages: { '': { dependencies: { [name]: 'file:../packages/test.tgz' } }, ['node_modules/' + name]: { version: '1.2.3', resolved: 'file:../packages/test.tgz', integrity: 'sha512-YWJjZA==' } } };
 json(path.join(p, 'package-lock.json'), lock); return { p, lock };
}
test('exact root normalization preserves archive integrity and local provenance', t => { const { p } = fixture(t); normalizeRoot(p); const lock = JSON.parse(fs.readFileSync(path.join(p, 'package-lock.json'))); assert.equal(lock.packages[''].dependencies['iobroker.test'], '1.2.3'); assert.equal(lock.packages['node_modules/iobroker.test'].resolved, 'file:../packages/test.tgz'); });
test('normalization rejects mismatched actual installed identity', t => { const { p } = fixture(t); json(path.join(p, 'node_modules/iobroker.test/package.json'), { name: 'iobroker.other', version: '1.2.3' }); assert.throws(() => normalizeRoot(p), /BUILD_IDENTITY/); });
test('normalization rejects missing artifact integrity', t => { const { p, lock } = fixture(t); delete lock.packages['node_modules/iobroker.test'].integrity; json(path.join(p, 'package-lock.json'), lock); assert.throws(() => normalizeRoot(p), /BUILD_ARCHIVE_INTEGRITY/); });
test('normalization rejects traversal archive references', t => { const { p, lock } = fixture(t); lock.packages['node_modules/iobroker.test'].resolved = 'file:../../private/secret.tgz'; json(path.join(p, 'package-lock.json'), lock); assert.throws(() => normalizeRoot(p), /BUILD_ARCHIVE_INTEGRITY/); });
test('source snapshot skips execution dependencies and rejects links', t => { const p = dir(t), source = path.join(p, 'source'); fs.mkdirSync(source); fs.mkdirSync(path.join(source, 'node_modules')); fs.writeFileSync(path.join(source, 'entry.js'), 'safe'); const out = path.join(p, 'copy'); snapshot(source, out); assert.equal(fs.existsSync(path.join(out, 'node_modules')), false); fs.symlinkSync('/etc/passwd', path.join(source, 'escape')); assert.throws(() => snapshot(source, path.join(p, 'copy2')), /BUILD_SOURCE_LINK/); });
test('existing output directories and duplicate components rejected before npm', t => { const p = dir(t); assert.throws(() => build({ output: p }), /BUILD_FRESH_EXTERNAL_DIRECTORY_REQUIRED/); assert.throws(() => build({ output: path.join(p, 'fresh'), components: ['ui', 'ui'] }), /BUILD_COMPONENTS/); });
test('build itself rejects omitted target before creating output or invoking npm', t => {
 const output = path.join(dir(t), 'missing-platform');
 assert.throws(() => build({ output, components: ['ui'] }), /BUILD_TARGET_PLATFORM/);
 assert.equal(fs.existsSync(output), false);
});
test('aggregate root preserves compatible component overrides', () => {
 const { mergeOverrides } = require('../../tools/integration/build-runtime.cjs');
 const value = mergeOverrides([{ parent: { child: '2.0.1' } }, { parent: { other: '3.0.0' } }]);
 assert.equal(value.parent.child, '2.0.1'); assert.equal(value.parent.other, '3.0.0');
});
test('conflicting or prototype-mutating component overrides fail before installation', () => {
 const { mergeOverrides } = require('../../tools/integration/build-runtime.cjs');
 assert.throws(() => mergeOverrides([{ child: '2.0.1' }, { child: '2.0.2' }]), /BUILD_OVERRIDE_CONFLICT/);
 assert.throws(() => mergeOverrides([JSON.parse('{"__proto__":{"polluted":"1"}}')]), /BUILD_OVERRIDE_SHAPE/);
 assert.throws(() => mergeOverrides([{ child: null }]), /BUILD_OVERRIDE_SHAPE/);
});
test('runtime app includes intact proprietary and upstream license texts with runtime notice locations', t => {
 const app = dir(t), repo = path.resolve(__dirname, '../..');
 copyRuntimeLicenses(app);
 for (const file of ['LICENSE', 'licenses/upstream/LICENSE.ioBroker-Installer.txt']) {
  assert.deepEqual(fs.readFileSync(path.join(app, file)), fs.readFileSync(path.join(repo, file)));
 }
 assert.deepEqual(fs.readFileSync(path.join(app, 'licenses/upstream/README.ioBroker-Installer.md')),
  fs.readFileSync(path.join(repo, 'docs/history/UPSTREAM_README.md')));
 const notices = fs.readFileSync(path.join(app, 'THIRD_PARTY_NOTICES.md'), 'utf8');
 assert.match(notices, /\]\(node_modules\/iobroker\.eos-admin\/THIRD_PARTY_NOTICES\.md\)/);
 assert.match(notices, /\]\(node_modules\/iobroker\.ocpp21\/LICENSES\/PREVIOUS-MIT\.txt\)/);
 for (const name of ['@nexowatt/eos-postgresql-store', '@iobroker/db-objects-postgresql', '@iobroker/db-states-postgresql']) {
  assert.ok(notices.includes(`node_modules/${name}/LICENSE`));
 }
 assert.ok(notices.includes('../sbom.cdx.json'));
 assert.doesNotMatch(notices, /components\/|runtime\/postgresql\/packages\/|reports\/integration\/|docs\/history\//);
 assert.match(notices, /früher wirksam eingeräumte MIT-Rechte/);
 assert.throws(() => copyRuntimeLicenses(app), { code: 'EEXIST' });
});
