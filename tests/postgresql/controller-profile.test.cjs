'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { inventoryTree, copyVerifiedTree, validateExperimentalProfile, stageLaboratory } = require('../../runtime/postgresql/integration.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-pg-assembly-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, value) => { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
  write('base/package.json', { name: 'unit-fixture', private: true });
  write('base/package-lock.json', { lockfileVersion: 3 });
  write('base/node_modules/iobroker.js-controller/package.json', { name: 'iobroker.js-controller', version: '7.2.2' });
  write('driver/package-lock.json', { lockfileVersion: 3, packages: { '': {}, 'node_modules/pg': { version: '8.23.1', integrity: 'sha512-fixture' } } });
  write('driver/node_modules/pg/package.json', { name: 'pg', version: '8.23.1' });
  for (const [folder, name] of [['store', '@nexowatt/eos-postgresql-store'], ['db-objects-postgresql', '@iobroker/db-objects-postgresql'], ['db-states-postgresql', '@iobroker/db-states-postgresql']]) {
    write(`packages/${folder}/package.json`, { name, version: '0.1.0-dev.1', private: true, main: 'index.cjs' });
    write(`packages/${folder}/index.cjs`, 'exports.Client = class Client {};\n');
  }
  return { root, write, options: { baseApp: path.join(root, 'base'), pgClientRoot: path.join(root, 'driver'), packageRoot: path.join(root, 'packages'), directory: path.join(root, 'lab'),
    expectedBaseLockSha256: hash(fs.readFileSync(path.join(root, 'base/package-lock.json'))), expectedPgLockSha256: hash(fs.readFileSync(path.join(root, 'driver/package-lock.json'))) } };
}

test('laboratory assembly copies exact base and plugin bytes without modifying source', t => {
  const { options } = fixture(t), before = inventoryTree(options.baseApp);
  const result = stageLaboratory(options);
  assert.deepEqual(inventoryTree(options.baseApp), before);
  assert.deepEqual(result.manifest.baseManifest, before);
  assert.equal(result.manifest.releaseApproved, false);
  assert.equal(result.manifest.upstreamAuthenticityProvenByThisCopy, false);
  assert.equal(result.manifest.lifecycleScriptsExecuted, false);
  assert.equal(fs.statSync(options.directory).mode & 0o777, 0o700);
  assert.equal(fs.existsSync(path.join(result.app, 'node_modules/@nexowatt/eos-postgresql-store/node_modules/pg/package.json')), true);
});

test('existing destination and paths under source are never changed', t => {
  const { options, write } = fixture(t); write('lab/keep.txt', 'unchanged');
  assert.throws(() => stageLaboratory(options), { code: 'PG_LAB_FRESH_DESTINATION_REQUIRED' });
  assert.equal(fs.readFileSync(path.join(options.directory, 'keep.txt'), 'utf8'), 'unchanged');
  assert.throws(() => stageLaboratory({ ...options, directory: path.join(options.baseApp, 'lab') }), { code: 'PG_LAB_FRESH_DESTINATION_REQUIRED' });
});

test('a writable shared destination parent is rejected before any copy', t => {
  const { options, root } = fixture(t);
  const parent = path.join(root, 'shared'); fs.mkdirSync(parent, { mode: 0o777 }); fs.chmodSync(parent, 0o777);
  assert.throws(() => stageLaboratory({ ...options, directory: path.join(parent, 'lab') }), { code: 'PG_LAB_TRUSTED_PARENT_REQUIRED' });
  assert.deepEqual(fs.readdirSync(parent), []);
});

test('changed driver lock and installed version cannot pass admission', t => {
  const { options, write } = fixture(t);
  assert.throws(() => stageLaboratory({ ...options, expectedPgLockSha256: '0'.repeat(64) }), { code: 'PG_LAB_LOCK_HASH_MISMATCH' });
  write('driver/node_modules/pg/package.json', { name: 'pg', version: '0.0.0' });
  assert.throws(() => stageLaboratory(options), { code: 'PG_LAB_DRIVER_TREE_MISMATCH' });
  assert.equal(fs.existsSync(options.directory), false);
});

test('lock-listed omitted optional packages are explicitly reported as absent', t => {
  const { options, write } = fixture(t);
  write('driver/package-lock.json', { lockfileVersion: 3, packages: { 'node_modules/pg': { version: '8.23.1', integrity: 'sha512-fixture' }, 'node_modules/pg-cloudflare': { version: '1.4.1', integrity: 'sha512-fixture', optional: true } } });
  options.expectedPgLockSha256 = hash(fs.readFileSync(path.join(options.pgClientRoot, 'package-lock.json')));
  assert.deepEqual(stageLaboratory(options).manifest.omittedOptionalPackages, ['node_modules/pg-cloudflare']);
});

test('unlocked installed driver packages fail admission', t => {
  const { options, write } = fixture(t);
  write('driver/node_modules/untracked/package.json', { name: 'untracked', version: '1.0.0' });
  assert.throws(() => stageLaboratory(options), { code: 'PG_LAB_UNTRACKED_DRIVER_PACKAGE' });
  assert.equal(fs.existsSync(options.directory), false);
});

test('wrong controller, package identity or fictitious embedded Server fail closed', t => {
  const { options, write } = fixture(t);
  write('base/node_modules/iobroker.js-controller/package.json', { name: 'iobroker.js-controller', version: '7.2.1' });
  assert.throws(() => stageLaboratory(options), { code: 'PG_LAB_CONTROLLER_VERSION' });
  write('base/node_modules/iobroker.js-controller/package.json', { name: 'iobroker.js-controller', version: '7.2.2' });
  write('packages/db-states-postgresql/index.cjs', 'exports.Client = class Client {}; exports.Server = class Server {};');
  assert.throws(() => stageLaboratory(options), { code: 'PG_LAB_PLUGIN_EXPORTS' });
  assert.equal(fs.existsSync(options.directory), false);
});

test('lifecycle metadata is rejected and partial copy removed', t => {
  const { options, write } = fixture(t);
  write('packages/store/package.json', { name: '@nexowatt/eos-postgresql-store', version: '0.1.0-dev.1', private: true, scripts: { postinstall: 'untrusted-command' } });
  assert.throws(() => stageLaboratory(options), { code: 'PG_LAB_PACKAGE_IDENTITY' });
  assert.equal(fs.existsSync(options.directory), false);
});

test('tree copier preserves internal symlinks but rejects escaping links', t => {
  const { root, options } = fixture(t);
  fs.symlinkSync('package.json', path.join(options.baseApp, 'internal.json'));
  copyVerifiedTree(options.baseApp, path.join(root, 'copy'));
  assert.equal(fs.readlinkSync(path.join(root, 'copy/internal.json')), 'package.json');
  fs.symlinkSync('../driver/package-lock.json', path.join(options.baseApp, 'escape.json'));
  assert.throws(() => inventoryTree(options.baseApp), { code: 'PG_LAB_SYMLINK_ESCAPE' });
});

function profile() { return { system: { compact: false, allowShellCommands: false, hostname: 'eos-postgresql-lab' }, multihostService: { enabled: false }, plugins: { sentry: { enabled: false } }, objects: { type: 'postgresql' }, states: { type: 'postgresql' } }; }
test('separate experimental profile requires both encrypted store validations without release claims', () => {
  const called = [];
  const result = validateExperimentalProfile(profile(), (connection, domain) => called.push(domain));
  assert.deepEqual(called, ['objects', 'states']);
  assert.equal(result.encryptedConnectionVerified, false);
  assert.equal(result.installerEnabled, false);
  for (const mutate of [c => { c.objects.type = 'redis'; }, c => { c.states.type = 'jsonl'; }, c => { c.system.allowShellCommands = true; }, c => { c.plugins.example = {}; }, c => { c.multihostService.enabled = true; }]) {
    const config = profile(); mutate(config); assert.throws(() => validateExperimentalProfile(config, () => {}));
  }
  assert.throws(() => validateExperimentalProfile(profile(), () => { throw new Error('TLS verification rejected'); }), /TLS verification rejected/);
});
