'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const native = require('../../runtime/native/serialport-contract.cjs');
const { normalize } = require('../../tools/integration/normalize-serialport-native.cjs');
const { checkRuntimeArchitecture } = require('../../tools/integration/check-runtime-architecture.cjs');
const { verifySbomBinding } = require('../../runtime/release/sbom-binding.cjs');
const { inventory } = require('../../runtime/release/bundle.cjs');
const ROOT = path.resolve(__dirname, '../..');
// Real upstream fixtures are supplied by the separately evidenced offline npm
// assembly. Every byte is checked against the reviewed archive inventory first.
// No native target code is executed on this test host.
const SOURCE = process.env.EOS_NATIVE_TEST_APP;
const options = { skip: !SOURCE && 'Set EOS_NATIVE_TEST_APP to an original, unnormalized offline app tree.' };
const goodHost = { platform: 'linux', arch: 'arm64', node: '24.21.0', napi: '10', uv: '1.51.0', glibc: '2.41' };
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-native-fixture-')), app = path.join(root, 'app');
    t.after(() => { assert.ok(root.startsWith(path.join(os.tmpdir(), 'eos-native-fixture-'))); fs.rmSync(root, { recursive: true, force: true }); });
    const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n'); };
    const rootManifest = { name: 'native-fixture', version: '1.0.0' };
    const lock = { lockfileVersion: 3, packages: { '': rootManifest, 'node_modules/modbus-serial': { version: '8.0.23' } } };
    write('app/package.json', rootManifest);
    write('app/node_modules/modbus-serial/package.json', { name: 'modbus-serial', version: '8.0.23' });
    for (const pin of native.policy.packages) {
        for (const row of pin.originalFiles) {
            const bytes = fs.readFileSync(path.join(SOURCE, pin.packagePath, row.path));
            assert.equal(bytes.length, row.bytes); assert.equal(native.sha(bytes), row.sha256);
            write(`app/${pin.packagePath}/${row.path}`, bytes);
        }
        lock.packages[pin.packagePath] = { version: pin.version, resolved: pin.archive, integrity: pin.integrity };
    }
    write('app/package-lock.json', lock);
    const check = () => checkRuntimeArchitecture({ app, platform: 'linux-arm64', nodeVersion: '24.21.0' });
    const run = () => normalize({ app, platform: 'linux-arm64', nodeVersion: '24.21.0' });
    return { root, app, lock, write, check, run };
}
function bomFor(f) {
    return { bomFormat: 'CycloneDX', specVersion: '1.5', metadata: { component: { name: 'native-fixture', version: '1.0.0', 'bom-ref': 'native-fixture@1.0.0' },
        properties: [{ name: 'eos:sbom:scope', value: 'installed-test-runtime-npm-tree' },
            { name: 'eos:sbom:package-json-sha256', value: native.sha(fs.readFileSync(path.join(f.app, 'package.json'))) },
            { name: 'eos:sbom:package-lock-sha256', value: native.sha(fs.readFileSync(path.join(f.app, 'package-lock.json'))) }] },
        components: [{ type: 'library', name: 'modbus-serial', version: '8.0.23', 'bom-ref': 'modbus-serial@8.0.23' },
            ...native.policy.packages.map(pin => ({ type: 'library', name: pin.package, version: pin.version, 'bom-ref': `${pin.package}@${pin.version}`,
                hashes: [{ alg: 'SHA-512', content: Buffer.from(pin.integrity.slice(7), 'base64').toString('hex') }] }))],
        dependencies: [{ ref: 'native-fixture@1.0.0', dependsOn: ['modbus-serial@8.0.23', ...native.policy.packages.map(pin => `${pin.package}@${pin.version}`)] }] };
}
function bindNative(f, bom, evidence) {
    f.write('input-bom.json', bom);
    if (evidence) f.write('native-transform.json', evidence);
    const script = "import importlib.util,json,sys;from pathlib import Path;s=importlib.util.spec_from_file_location('native_binder',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);p=Path(sys.argv[2]);b=json.loads((p/'input-bom.json').read_text());m.native_binding(p/'app',b,p/'native-transform.json' if sys.argv[3]=='yes' else None);(p/'sbom.cdx.json').write_text(json.dumps(b));print('BOUND')";
    return spawnSync(process.env.PYTHON || 'python', ['-B', '-c', script, path.join(ROOT, 'tools/integration/bind-sbom.py'), f.root, evidence ? 'yes' : 'no'], { encoding: 'utf8', timeout: 30000, windowsHide: true });
}
test('host contract rejects wrong OS, CPU, Node, musl, old glibc, NAPI, libuv and alternate runtimes', () => {
    assert.doesNotThrow(() => native.assertNativeHost(goodHost));
    for (const patch of [{ platform: 'win32' }, { arch: 'x64' }, { node: '24.20.0' }, { glibc: undefined }, { glibc: '2.27' },
        { glibc: '3.0' }, { napi: '7' }, { napi: '8junk' }, { uv: '2.0.0' }, { electron: '40' }, { nw: '1' }]) {
        assert.throws(() => native.assertNativeHost({ ...goodHost, ...patch }), { code: 'NATIVE_HOST_CONTRACT' });
    }
});
test('fixed loaders are deterministically pinned and have no selectable loading fallback', () => {
    for (const pin of native.policy.packages) {
        const source = native.loaderSource(pin);
        assert.equal(native.sha(source), pin.fixedLoaderSha256); assert.equal(Buffer.byteLength(source), pin.fixedLoaderBytes);
        assert.doesNotMatch(source, /process\.env|node-gyp-build|build\/Release|build\/Debug|execPath/);
        assert.match(source, /O_NOFOLLOW/); assert.match(source, /NATIVE_UNTRUSTED_PATH/);
        assert.match(source, /process\.dlopen\(module, file, require\('node:os'\)\.constants\.dlopen\.RTLD_NOW\)/);
        assert.equal(native.normalizedFiles(pin).filter(row => row.path.endsWith('.node')).length, 1);
    }
});
test('target probe fails on an incompatible host before inspecting an application or loading code', { skip: process.platform === 'linux' && process.arch === 'arm64' }, () => {
    const out = spawnSync(process.execPath, [path.join(ROOT, 'runtime/native/serialport-acceptance.cjs'), '--app', 'never-inspected'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
    assert.equal(out.status, 1); assert.equal(out.stdout, ''); assert.deepEqual(JSON.parse(out.stderr), { passed: false, code: 'NATIVE_TARGET_PROBE_FAILED' });
});
test('fixed loader verifies bytes and ownership before eager binding; environment cannot select a file', options, () => {
    for (const pin of native.policy.packages) {
        const original = fs.readFileSync(path.join(SOURCE, pin.packagePath, pin.native));
        for (const mode of ['good', 'tampered', 'writable', 'link', 'hardlink']) {
            const calls = [], closed = [], module = { exports: {} }, directory = path.join(os.tmpdir(), 'model-only-native-loader');
            const stat = { uid: 0, mode: mode === 'writable' ? 0o666 : 0o644, nlink: mode === 'hardlink' ? 2 : 1,
                size: original.length, isSymbolicLink: () => mode === 'link', isFile: () => true };
            const fakeFs = { constants: fs.constants, lstatSync: () => stat, fstatSync: () => stat,
                openSync: file => { assert.equal(file, path.join(directory, pin.native)); return 42; },
                readFileSync: () => mode === 'tampered' ? Buffer.alloc(original.length) : original,
                closeSync: fd => closed.push(fd) };
            const runtime = { platform: 'linux', arch: 'arm64', versions: { node: '24.21.0', napi: '10', uv: '1.51.0' },
                report: { getReport: () => ({ header: { glibcVersionRuntime: '2.41' } }) },
                dlopen: (receiver, file, flags) => { assert.equal(receiver, module); calls.push({ file, flags }); } };
            Object.defineProperty(runtime, 'env', { get() { throw new Error('ENV_MUST_NOT_SELECT_NATIVE'); } });
            const context = { module, __dirname: directory, process: runtime,
                require: name => { if (name === 'node:fs') return fakeFs; if (name === 'node:os') return { constants: { dlopen: { RTLD_NOW: 2 } } };
                    if (['node:path', 'node:crypto'].includes(name)) return require(name); throw new Error('UNEXPECTED_REQUIRE'); } };
            const action = () => vm.runInNewContext(native.loaderSource(pin), context, { timeout: 1000 });
            if (mode === 'good') { action(); assert.deepEqual(calls, [{ file: path.join(directory, pin.native), flags: 2 }]); }
            else { assert.throws(action, /NATIVE_/); assert.equal(calls.length, 0); }
            if (!['writable', 'link'].includes(mode)) assert.deepEqual(closed, [42]);
        }
    }
});
test('real original upstream packages are rejected; exact normalization admits only two fixed ARM64 libraries', options, t => {
    const f = fixture(t), before = f.check();
    assert.equal(before.passed, false); assert.ok(before.issues.some(row => row.code === 'ARCH_NODE_ADDON_ABI_UNREVIEWED'));
    const evidence = f.run(), after = f.check();
    assert.deepEqual(evidence, native.normalizationEvidence());
    assert.equal(after.passed, true, JSON.stringify(after.issues)); assert.equal(after.executedTargetCode, false); assert.equal(after.hardwareQualified, false);
    assert.equal(after.nativeFiles.length, 2); assert.ok(after.nativeFiles.every(row => row.disposition === 'target-pinned-node-api-library'));
    assert.equal(evidence.packages.flatMap(row => row.removedFiles).length, 21);
    assert.equal(evidence.targetLoadProbeRequired, true); assert.equal(evidence.hardwareAccepted, false);
});
test('one changed upstream package blocks all pruning before the first mutation', options, t => {
    const f = fixture(t), [a, b] = native.policy.packages;
    fs.appendFileSync(path.join(f.app, b.packagePath, b.loader), '\n// altered');
    assert.throws(f.run, { code: 'NATIVE_PACKAGE_CONTENT' });
    assert.equal(fs.existsSync(path.join(f.app, a.packagePath, 'eos-native-loader.cjs')), false);
    for (const row of a.originalFiles) assert.equal(native.sha(fs.readFileSync(path.join(f.app, a.packagePath, row.path))), row.sha256);
});
test('unknown original files and mismatched archive integrity cannot enter the native contract', options, t => {
    const f = fixture(t), pin = native.policy.packages[0];
    f.write(`app/${pin.packagePath}/extra.js`, 'unreviewed'); assert.throws(f.run, { code: 'NATIVE_PACKAGE_CONTENT' });
    fs.unlinkSync(path.join(f.app, pin.packagePath, 'extra.js'));
    f.lock.packages[pin.packagePath].integrity = 'sha512-' + 'A'.repeat(88); f.write('app/package-lock.json', f.lock);
    assert.throws(f.run, { code: 'NATIVE_PACKAGE_IDENTITY' });
});
test('normalization refuses already transformed sources rather than silently replacing evidence', options, t => {
    const f = fixture(t); f.run(); assert.throws(f.run, { code: 'NATIVE_PACKAGE_CONTENT' });
});
test('changed loader, changed binary and unreviewed package file each revoke native admission', options, t => {
    const f = fixture(t); f.run(); const pin = native.policy.packages[0];
    for (const relative of ['eos-native-loader.cjs', pin.native, pin.loader]) {
        const file = path.join(f.app, pin.packagePath, relative), original = fs.readFileSync(file);
        fs.appendFileSync(file, 'x'); assert.equal(f.check().passed, false); fs.writeFileSync(file, original);
    }
    f.write(`app/${pin.packagePath}/build/Release/binding.node`, 'unreviewed'); assert.equal(f.check().passed, false);
});
test('hardlinked files and unexpected symlink directories fail the whole package contract', options, t => {
    const f = fixture(t); f.run(); const pin = native.policy.packages[0], directory = path.join(f.app, pin.packagePath);
    const file = path.join(directory, 'LICENSE'), backup = fs.readFileSync(file);
    f.write('hardlink-source', backup); fs.unlinkSync(file); fs.linkSync(path.join(f.root, 'hardlink-source'), file);
    assert.throws(() => native.packageFiles(directory), { code: 'NATIVE_PACKAGE_LIMIT' });
    fs.unlinkSync(file); fs.writeFileSync(file, backup);
    fs.symlinkSync(path.join(f.root, 'app'), path.join(directory, 'unexpected-link'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => native.packageFiles(directory), { code: 'NATIVE_PACKAGE_LINK' });
});
test('normalization does not authorize another Node version, platform or an unknown addon', options, t => {
    const f = fixture(t); f.run();
    for (const config of [{ platform: 'linux-x64', nodeVersion: '24.21.0' }, { platform: 'linux-arm64', nodeVersion: '24.22.0' }]) {
        assert.equal(checkRuntimeArchitecture({ app: f.app, ...config }).passed, false);
    }
    const pin = native.policy.packages[0]; f.write('app/unreviewed.node', fs.readFileSync(path.join(f.app, pin.packagePath, pin.native)));
    assert.ok(f.check().issues.some(row => row.code === 'ARCH_NODE_ADDON_ABI_UNREVIEWED'));
});
test('Python native SBOM binding and runtime verifier agree on exact derivative and upstream provenance', options, t => {
    const f = fixture(t), evidence = f.run(), bom = bomFor(f), out = bindNative(f, bom, evidence);
    assert.equal(out.status, 0, out.stderr);
    const bound = JSON.parse(fs.readFileSync(path.join(f.root, 'sbom.cdx.json')));
    for (const c of bound.components.filter(row => row.name === '@serialport/bindings-cpp')) {
        assert.equal(c.modified, true); assert.equal(Object.hasOwn(c, 'hashes'), false); assert.equal(c.pedigree.ancestors[0].hashes[0].alg, 'SHA-512');
    }
    assert.equal(verifySbomBinding(f.root, inventory(f.root)).installedPackages, 3);
    const changed = bound.components.find(row => row.name === '@serialport/bindings-cpp');
    changed.properties.find(row => row.name === 'eos:native:normalized-tree-sha256').value = '0'.repeat(64);
    f.write('sbom.cdx.json', bound); assert.throws(() => verifySbomBinding(f.root, inventory(f.root)), { code: 'SBOM_NATIVE_BINDING' });
});
test('missing or falsified native evidence cannot produce a bound SBOM', options, t => {
    const f = fixture(t), evidence = f.run(), bom = bomFor(f);
    let out = bindNative(f, bom); assert.notEqual(out.status, 0); assert.match(out.stderr, /NATIVE_EVIDENCE_REQUIRED/);
    evidence.packages[0].removedFiles.pop(); out = bindNative(f, bom, evidence);
    assert.notEqual(out.status, 0); assert.match(out.stderr, /NATIVE_EVIDENCE_CONTENT/);
});
test('runtime verifier refuses unchanged upstream hash claims for normalized package bytes', options, t => {
    const f = fixture(t); f.run(); f.write('sbom.cdx.json', bomFor(f));
    assert.throws(() => verifySbomBinding(f.root, inventory(f.root)), { code: 'SBOM_NATIVE_BINDING' });
});
