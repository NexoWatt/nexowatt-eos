'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { createGuard, validateProfile } = require('../../runtime/controller-profile/guard.cjs');
const transform = require('../../runtime/controller-profile/transform.cjs');

const fixtureDir = path.join(__dirname, 'controller-profile-fixtures');
const spec = { package: 'iobroker.eos-test-probe', version: '0.0.0-test.1', main: 'main.js' };
const profile = adapters => ({ schemaVersion: 1, kind: 'eos-controller-test-profile', controllerVersion: '7.2.2', adapters });
const instance = () => ({ _id: 'system.adapter.eos-test-probe.0', common: {
    name: 'eos-test-probe', version: '0.0.0-test.1', mode: 'daemon', nodeProcessParams: [] }, native: {} });
const guard = () => createGuard(profile([spec]), '/synthetic/node_modules');
function errorCode(code, fn) { assert.throws(fn, error => error.code === code); }
function original(relative, source = false) {
    const flavor = source ? 'source' : relative.includes('/cjs/') ? 'cjs' : 'esm';
    return fs.readFileSync(path.join(fixtureDir, `${flavor}-${path.basename(relative).split('.')[0]}.original.txt`));
}
function patched(relative) { return transform.transformFile(relative, original(relative)).content; }
function functionText(source, name) {
    const start = source.indexOf(`async function ${name}(`) >= 0 ? source.indexOf(`async function ${name}(`) : source.indexOf(`function ${name}(`);
    assert.ok(start >= 0);
    const end = source.indexOf('\n}', start);
    assert.ok(end >= start);
    return source.slice(start, end + 2);
}
function executeFunction(source, name, context) {
    return vm.runInNewContext(`(${functionText(source, name)})`, context, { timeout: 1000 });
}
function withBuild(action) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-profile-build-'));
    try {
        for (const relative of Object.keys(transform.HASHES)) {
            const target = path.join(dir, relative); fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, original(relative));
        }
        for (const packageName of ['iobroker.js-controller', '@iobroker/js-controller-cli'])
            fs.writeFileSync(path.join(dir, 'node_modules', packageName, 'package.json'), JSON.stringify({ name: packageName, version: '7.2.2' }));
        return action(dir);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

for (const flavor of ['cjs', 'esm', 'source']) test(`Node version transition never grants executable capabilities (${flavor})`, async () => {
    const relative = flavor === 'source' ? 'packages/controller/src/main.ts' : `node_modules/iobroker.js-controller/build/${flavor}/main.js`;
    const text = transform.transformFile(relative, original(relative, flavor === 'source'), flavor === 'source').content;
    const disabled = text.indexOf('// EOS: executable capabilities are controlled');
    const start = text.lastIndexOf('const nodeVersion =', disabled);
    const state = text.indexOf('await states.setState(`${hostObjectPrefix}.nodeVersion`', disabled);
    const end = text.indexOf('});', state) + 3;
    assert.ok(disabled > start && state > disabled && end > state);
    const writes = []; let hostMutations = 0;
    const tools = { setExecutableCapabilities: () => { hostMutations++; } };
    const context = { process: { version: 'v24.19.0', execPath: '/usr/bin/node', env: { IOB_NO_SETCAP: 'false' } },
        hostObjectPrefix: 'system.host.test', hostLogPrefix: 'test', logger: { info() {}, debug() {} },
        states: { getStateAsync: async () => null, setState: async (id, value) => writes.push({ id, value }) },
        tools, os: { platform: () => 'linux' }, import_node_os: { default: { platform: () => 'linux' } }, import_js_controller_common: { tools } };
    await vm.runInNewContext(`(async () => { ${text.slice(start, end)} })()`, context, { timeout: 1000 });
    assert.equal(hostMutations, 0); assert.equal(writes.length, 1);
    assert.equal(writes[0].id, 'system.host.test.nodeVersion'); assert.equal(writes[0].value.val, '24.19.0');
});

test('core-only default refuses adapter activation and admits no arbitrary package', () => {
    errorCode('EOS_PROFILE_NOT_ADMITTED', () => createGuard(profile([]), '/synthetic').assertInstance(instance()));
    assert.equal(guard().assertInstance(instance()).package, spec.package);
});
test('immutable admitted package/version and main must match current instance', () => {
    for (const [field, value, expected] of [
        ['name', 'javascript', 'EOS_PROFILE_NOT_ADMITTED'], ['version', '0.0.0-test.2', 'EOS_PROFILE_NOT_ADMITTED'],
        ['main', '/tmp/evil.js', 'EOS_PROFILE_MAIN'], ['main', '../evil.js', 'EOS_PROFILE_MAIN']]) {
        const i = instance(); i.common[field] = value; errorCode(expected, () => guard().assertInstance(i));
    }
});
test('Node injection flags are forbidden regardless of test profile environment switches', () => {
    for (const value of [['--require=/tmp/evil.js'], ['--import=data:text/javascript,0'], ['--eval=1'], ['--inspect=0.0.0.0'], '--require=x', null]) {
        const i = instance(); i.common.nodeProcessParams = value;
        errorCode('EOS_PROFILE_NODE_ARGS', () => guard().assertInstance(i));
    }
    assert.equal(guard().blockHostCommand('cmdExec'), true);
});
test('dynamic modules, exec, compact and extension starts are blocked', () => {
    for (const field of ['additionalNpmModules', 'additionalNpmPackages', 'npmLibs', 'libraries']) {
        const i = instance(); i.native[field] = ['unexpected'];
        errorCode('EOS_PROFILE_DYNAMIC_NPM', () => guard().assertInstance(i));
    }
    for (const field of ['exec', 'enableExec', 'allowExec', 'allowShellCommands']) {
        const i = instance(); i.native[field] = true; errorCode('EOS_PROFILE_SHELL', () => guard().assertInstance(i));
    }
    for (const value of [true, 'false', 'true', 1, null]) {
        const compact = instance(); compact.common.runAsCompactMode = value;
        errorCode('EOS_PROFILE_EXECUTION_MODE', () => guard().assertInstance(compact));
    }
    const extension = instance(); extension.common.mode = 'extension';
    errorCode('EOS_PROFILE_EXECUTION_MODE', () => guard().assertInstance(extension));
});
test('host environment and configuration cannot enable preload/shell/compact/plugins', () => {
    const g = guard();
    g.assertEnvironment({}, { system: { compact: false, allowShellCommands: false }, plugins: { sentry: { enabled: false } } });
    for (const key of ['NODE_OPTIONS', 'NODE_PATH']) errorCode('EOS_PROFILE_NODE_ENV', () => g.assertEnvironment({ [key]: '/tmp' }, {}));
    for (const key of ['compact', 'allowShellCommands']) for (const value of [true, 'false', 'true', 0, null, undefined])
        errorCode('EOS_PROFILE_HOST_CONFIG', () => g.assertEnvironment({}, { system: { compact: false, allowShellCommands: false, [key]: value } }));
    for (const plugins of [{ sentry: { enabled: true } }, { hostile: {} }, { sentry: { enabled: false, path: '/tmp' } }])
        errorCode('EOS_PROFILE_PLUGINS', () => g.assertEnvironment({}, { system: { compact: false, allowShellCommands: false }, plugins }));
});
test('profile rejects JavaScript adapter, duplicates, unknown fields and escaped main paths', () => {
    errorCode('EOS_PROFILE_PACKAGE', () => validateProfile(profile([{ ...spec, package: 'iobroker.javascript' }])));
    errorCode('EOS_PROFILE_DUPLICATE', () => validateProfile(profile([spec, spec])));
    errorCode('EOS_PROFILE_FORMAT', () => validateProfile({ ...profile([]), bypass: true }));
    for (const main of ['/tmp/main.js', '../main.js', 'nested/../main.js', 'a\\b.js', 'entry.ts'])
        errorCode('EOS_PROFILE_VERSION_OR_MAIN', () => validateProfile(profile([{ ...spec, main }])));
});
test('entry check accepts real admitted file and rejects symlink/entry/package-version substitutions', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-entry-')), packageDir = path.join(dir, spec.package);
    fs.mkdirSync(packageDir); fs.writeFileSync(path.join(packageDir, 'main.js'), '// synthetic fixture\n');
    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: spec.package, version: spec.version }));
    const g = createGuard(profile([spec]), dir), main = path.join(packageDir, 'main.js');
    try {
        assert.equal(g.assertEntry(instance(), packageDir, main), true);
        errorCode('EOS_PROFILE_ENTRY_PATH', () => g.assertEntry(instance(), packageDir, path.join(dir, 'outside.js')));
        fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: spec.package, version: '9.0.0' }));
        errorCode('EOS_PROFILE_PACKAGE_VERSION', () => g.assertEntry(instance(), packageDir, main));
        fs.renameSync(main, path.join(dir, 'external.js')); fs.symlinkSync(path.join(dir, 'external.js'), main);
        errorCode('EOS_PROFILE_ENTRY_PATH', () => g.assertEntry(instance(), packageDir, main));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('all six original executable inputs and three source mirrors are bound to actual SHA256', () => {
    for (const [source, hashes] of [[false, transform.HASHES], [true, transform.SOURCE_HASHES]]) {
        for (const relative of Object.keys(hashes)) {
            const bytes = original(relative, source);
            const result = transform.transformFile(relative, bytes, source);
            assert.notEqual(result.sha256, result.originalSha256);
            const changed = Buffer.concat([bytes, Buffer.from('\n')]);
            errorCode('EOS_TRANSFORM_SOURCE_HASH', () => transform.transformFile(relative, changed, source));
        }
    }
    errorCode('EOS_TRANSFORM_SOURCE_HASH', () => transform.transformFile('unknown.js', Buffer.from('')));
});
test('all transformed executable variants pass the real Node parser', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-profile-syntax-'));
    try {
        for (const relative of Object.keys(transform.HASHES)) {
            const file = path.join(dir, relative.includes('/esm/') ? 'test.mjs' : 'test.cjs');
            fs.writeFileSync(file, patched(relative));
            const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 3000 });
            assert.equal(result.status, 0, result.stderr);
        }
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('mandatory build gate rejects unpatched artifacts, modified helper and missing profile', () => withBuild(dir => {
    errorCode('EOS_PROFILE_BUILD_HASH', () => transform.verifyBuildProfile(dir));
    transform.applyToBuild(dir);
    assert.equal(transform.verifyBuildProfile(dir).files.length, 9);
    const helper = path.join(dir, 'node_modules/iobroker.js-controller/eos-test-profile.cjs');
    const bytes = fs.readFileSync(helper); fs.appendFileSync(helper, '\n// modification');
    errorCode('EOS_PROFILE_BUILD_HASH', () => transform.verifyBuildProfile(dir)); fs.writeFileSync(helper, bytes);
    fs.unlinkSync(path.join(dir, 'node_modules/iobroker.js-controller/eos-test-profile.json'));
    errorCode('EOS_TRANSFORM_INPUT_FILE', () => transform.verifyBuildProfile(dir));
}));
test('mandatory gate rejects controller version drift, extra profile packages and bad UTF8', () => withBuild(dir => {
    transform.applyToBuild(dir);
    const pkg = path.join(dir, 'node_modules/iobroker.js-controller/package.json');
    const bytes = fs.readFileSync(pkg); fs.writeFileSync(pkg, JSON.stringify({ name: 'iobroker.js-controller', version: '7.2.3' }));
    errorCode('EOS_PROFILE_PACKAGE_VERSION', () => transform.verifyBuildProfile(dir)); fs.writeFileSync(pkg, bytes);
    const file = path.join(dir, 'node_modules/iobroker.js-controller/eos-test-profile.json');
    fs.writeFileSync(file, JSON.stringify(profile([spec])));
    errorCode('EOS_PROFILE_CATALOG_MISMATCH', () => transform.verifyBuildProfile(dir, []));
    assert.equal(transform.verifyBuildProfile(dir, [{ package: spec.package, version: spec.version }]).admittedAdapters.length, 1);
    errorCode('EOS_PROFILE_CATALOG_MISMATCH', () => transform.verifyBuildProfile(dir, [{ ...spec, main: 'other.js' }]));
    fs.writeFileSync(file, Buffer.from([0xc0, 0xaf]));
    errorCode('EOS_PROFILE_JSON_ENCODING', () => transform.verifyBuildProfile(dir));
}));
test('mandatory gate rejects symlink code/profile and unexpected catalogue fields', () => withBuild(dir => {
    transform.applyToBuild(dir);
    errorCode('EOS_PROFILE_EXPECTED_ADAPTERS', () => transform.verifyBuildProfile(dir, [{ ...spec, url: 'unsafe' }]));
    const file = path.join(dir, 'node_modules/iobroker.js-controller/eos-test-profile.json');
    fs.renameSync(file, file + '.original'); fs.symlinkSync(file + '.original', file);
    errorCode('EOS_TRANSFORM_INPUT_FILE', () => transform.verifyBuildProfile(dir));
    fs.unlinkSync(file); fs.renameSync(file + '.original', file);
    const directory = path.join(dir, 'node_modules/iobroker.js-controller/build');
    fs.renameSync(directory, directory + '-external'); fs.symlinkSync(directory + '-external', directory);
    errorCode('EOS_PROFILE_BUILD_PATH', () => transform.verifyBuildProfile(dir));
}));
for (const flavor of ['cjs', 'esm']) {
    const relative = `node_modules/iobroker.js-controller/build/${flavor}/main.js`;
    test(`${flavor}: real patched processMessage denies privileged actions before their original bodies`, async () => {
        const sent = [], logs = [], g = guard();
        const fn = executeFunction(patched(relative), 'processMessage', { eosTestProfile: g,
            logger: { warn: value => logs.push(value) }, sendTo: async (...args) => sent.push(args) });
        for (const command of ['cmdExec', 'shell', 'upgradeController', 'upgradeAdapterWithWebserver', 'rebuildAdapter',
            'upgradeOsPackages', 'writeBaseSettings', 'readBaseSettings', 'writeDirAsZip', 'writeObjectsAsZip', 'updateMultihost']) {
            await fn({ command, message: { data: 'url https://invalid.example' }, callback: {}, from: 'synthetic' });
        }
        assert.equal(sent.length, 11); assert.equal(logs.length, 11);
        assert.ok(sent.every(row => row[2].error === 'EOS_PROFILE_HOST_COMMAND_DENIED'));
    });
    test(`${flavor}: ordinary getInterfaces still passes original command route`, async () => {
        const sent = [], fakeOs = { networkInterfaces: () => ({ test: [] }) };
        const fn = executeFunction(patched(relative), 'processMessage', { eosTestProfile: guard(), isStopping: false,
            hostLogPrefix: 'synthetic', logger: { debug() {}, error() {} }, os: fakeOs,
            import_node_os: { default: fakeOs }, sendTo: (...args) => sent.push(args) });
        await fn({ command: 'getInterfaces', callback: {}, from: 'synthetic' });
        assert.equal(sent.length, 1); assert.deepEqual(sent[0][2].result, { test: [] });
    });
    test(`${flavor}: real normal start denies Node preload before adapter lookup or fork`, async () => {
        const i = instance(); i.common.nodeProcessParams = ['--require=/tmp/payload.js'];
        const errors = [];
        const fn = executeFunction(patched(relative), 'startInstance', { eosTestProfile: guard(), isStopping: false,
            connected: true, objects: {}, procs: { [i._id]: { config: i } }, logger: { error: x => errors.push(x) } });
        await fn(i._id); assert.deepEqual(errors, ['EOS_PROFILE_INSTANCE_DENIED']);
    });
    test(`${flavor}: real scheduled start rechecks altered instance before fork`, async () => {
        const i = instance(); i.common.nodeProcessParams = ['--import=/tmp/payload.js'];
        const errors = [], timers = [];
        const fn = executeFunction(patched(relative), 'startScheduledInstance', { eosTestProfile: guard(),
            scheduledInstances: { [i._id]: { adapterDir: '/synthetic', fileNameFull: '/tmp/payload.js' } },
            procs: { [i._id]: { config: i } }, config: { system: {} }, logger: { error: x => errors.push(x) },
            setTimeout: (...args) => timers.push(args) });
        await fn(); assert.deepEqual(errors, ['EOS_PROFILE_SCHEDULE_DENIED']); assert.equal(timers.length, 1);
    });
    test(`${flavor}: real automatic install/upgrade functions produce no installer action`, async () => {
        const installQueue = [{ id: 'unapproved' }], logs = [];
        executeFunction(patched(relative), 'installAdapters', { installQueue, logger: { warn: value => logs.push(value) } })();
        assert.equal(installQueue.length, 0); assert.deepEqual(logs, ['EOS_PROFILE_RUNTIME_INSTALL_DENIED']);
        await executeFunction(patched(relative), 'autoUpgradeAdapters', {})();
    });
    test(`${flavor}: real CLI dispatch denies aliases and installation commands before DB/installer access`, async () => {
        const file = `node_modules/@iobroker/js-controller-cli/build/${flavor}/lib/setup.js`;
        const errors = [], exits = [];
        const fn = executeFunction(patched(file), 'processCommand', { console: { error: x => errors.push(x) } });
        for (const command of ['url', 'add', 'a', 'install', 'i', 'upgrade', 'rebuild', 'restore', 'debug', 'vendor', 'plugin'])
            await fn(command, ['malicious'], {}, code => exits.push(code));
        assert.equal(exits.length, 11); assert.ok(exits.every(code => code === 1));
        assert.ok(errors.every(x => x === 'EOS_PROFILE_CLI_COMMAND_DENIED'));
    });
    test(`${flavor}: real Install._npmInstall method rejects directly invoked package install`, async () => {
        const file = `node_modules/@iobroker/js-controller-cli/build/${flavor}/lib/setup/setupInstall.js`;
        const text = patched(file), start = text.indexOf('async _npmInstall(installOptions) {');
        const end = text.indexOf(flavor === 'cjs' ? '\n  }' : '\n    }', start);
        const method = text.slice(start, end + (flavor === 'cjs' ? 4 : 6)).replace('async _npmInstall(', 'async function(');
        const fn = vm.runInNewContext(`(${method})`, {}, { timeout: 1000 });
        await assert.rejects(fn({ npmUrl: 'arbitrary' }), /EOS_PROFILE_RUNTIME_NPM_DENIED/);
    });
}
