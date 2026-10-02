'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkRuntimeArchitecture, binaryHeader, platformAllows, headerMatches, LIMITS } = require('../../tools/integration/check-runtime-architecture.cjs');

function fixture(t) {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-arch-'));
    t.after(() => fs.rmSync(app, { recursive: true, force: true }));
    const packages = { '': { name: 'fixture', version: '1.0.0' } };
    const write = (relative, value) => { const file = path.join(app, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)); };
    const lock = () => write('package-lock.json', { lockfileVersion: 3, packages });
    const pkg = (name, version, extra = {}, location = `node_modules/${name}`) => { write(`${location}/package.json`, { name, version, ...extra }); packages[location] = { version }; lock(); return location; };
    write('package.json', packages['']); lock();
    return { app, write, pkg, packages, lock, check: (platform = 'linux-arm64') => checkRuntimeArchitecture({ app, platform, nodeVersion: '24.21.0' }) };
}
function elf(cpu = 'arm64', { dynamic = false, interpreter = null, bits = 64 } = {}) {
    const b = Buffer.alloc(512), width = bits === 64 ? 56 : 32, start = bits === 64 ? 64 : 52;
    Buffer.from([127, 69, 76, 70, bits === 64 ? 2 : 1, 1, 1, 0]).copy(b);
    b.writeUInt16LE(2, 16); b.writeUInt16LE({ arm64: 183, x64: 62, arm: 40, ia32: 3 }[cpu], 18); b.writeUInt32LE(1, 20);
    if (bits === 64) b.writeBigUInt64LE(BigInt(start), 32); else b.writeUInt32LE(start, 28);
    b.writeUInt16LE(start, bits === 64 ? 52 : 40); b.writeUInt16LE(width, bits === 64 ? 54 : 42);
    b.writeUInt16LE(1 + (dynamic ? 1 : 0) + (interpreter ? 1 : 0), bits === 64 ? 56 : 44); b.writeUInt32LE(1, start);
    let at = start + width;
    if (dynamic) { b.writeUInt32LE(2, at); at += width; }
    if (interpreter) {
        b.writeUInt32LE(3, at);
        if (bits === 64) { b.writeBigUInt64LE(384n, at + 8); b.writeBigUInt64LE(BigInt(interpreter.length + 1), at + 32); }
        else { b.writeUInt32LE(384, at + 4); b.writeUInt32LE(interpreter.length + 1, at + 16); }
        b.write(`${interpreter}\0`, 384);
    }
    return b;
}
function esbuild(f, cpu = 'arm64', { version = '0.28.2', parentVersion = version, binary = elf(cpu), declaredCpu = cpu } = {}) {
    f.pkg('esbuild', parentVersion, { optionalDependencies: { [`@esbuild/linux-${cpu}`]: parentVersion } });
    const dir = f.pkg(`@esbuild/linux-${cpu}`, version, { os: ['linux'], cpu: [declaredCpu] });
    if (binary) f.write(`${dir}/bin/esbuild`, binary);
}
function issues(result) { return result.issues.map(issue => issue.code); }

test('architecture-independent tree has no executed target code or included Node claim', t => {
    const f = fixture(t), r = f.check();
    assert.equal(r.passed, true); assert.equal(r.executedTargetCode, false); assert.equal(r.hardwareQualified, false);
    assert.equal(r.target.nodeRuntimeIncluded, false); assert.equal(r.target.nodeVersion, '24.21.0');
});
test('separate matching ARM64 and x64 esbuild trees pass static header checks', t => {
    for (const cpu of ['arm64', 'x64']) { const f = fixture(t); esbuild(f, cpu); const r = f.check(`linux-${cpu}`); assert.equal(r.passed, true); assert.equal(r.nativeFiles[0].disposition, 'target-static-native-executable'); }
});
test('x64 optional package cannot be relabeled as an ARM64 delivery', t => {
    const f = fixture(t); esbuild(f, 'x64'); const r = f.check();
    assert.equal(r.passed, false); assert.ok(issues(r).includes('ARCH_PACKAGE_PLATFORM_MISMATCH')); assert.ok(issues(r).includes('ARCH_ESBUILD_TARGET_BINARY_MISSING'));
});
test('ARM64 package with a mislabeled x64 binary fails', t => {
    const f = fixture(t); esbuild(f, 'arm64', { binary: elf('x64') }); assert.ok(issues(f.check()).includes('ARCH_ESBUILD_ABI_MISMATCH'));
});
test('native allow rules require exact package paths and explicit esbuild platform metadata', t => {
    const f = fixture(t); esbuild(f); f.write('node_modules/@esbuild/linux-arm64/package.json', { name: '@esbuild/linux-arm64', version: '0.28.2' });
    assert.ok(issues(f.check()).includes('ARCH_ESBUILD_PACKAGE_CONTRACT'));
    const g = fixture(t); g.pkg('bare-fs', '4.8.2', {}, 'node_modules/pretend');
    g.write('node_modules/pretend/prebuilds/linux-arm64/bare-fs.bare', elf());
    assert.ok(issues(g.check()).includes('ARCH_BARE_PREBUILD_MISMATCH'));
    const h = fixture(t); h.pkg('bare-fs', '4.8.2'); h.write('node_modules/bare-fs/prebuilds/linux-arm64-simulator/bare-fs.bare', elf());
    assert.ok(issues(h.check()).includes('ARCH_BARE_PREBUILD_MISMATCH'));
});
test('wrong ELF width or big-endian content fails even with matching manifest', t => {
    const f = fixture(t); esbuild(f, 'arm64', { binary: elf('arm', { bits: 32 }) }); assert.equal(f.check().passed, false);
    const b = elf(); b[5] = 2; assert.throws(() => binaryHeader(b), /ARCH_ELF_HEADER/);
});
test('missing or version-mismatched optional target esbuild cannot silently pass', t => {
    const f = fixture(t); esbuild(f, 'arm64', { binary: null }); assert.ok(issues(f.check()).includes('ARCH_ESBUILD_TARGET_BINARY_MISSING'));
    const g = fixture(t); esbuild(g, 'arm64', { parentVersion: '0.28.1' }); assert.ok(issues(g.check()).includes('ARCH_ESBUILD_TARGET_BINARY_MISSING'));
});
test('dynamic esbuild or an unexpected interpreter requires explicit new ABI review', t => {
    for (const binary of [elf('arm64', { dynamic: true }), elf('arm64', { interpreter: '/lib/ld-linux-aarch64.so.1' })]) {
        const f = fixture(t); esbuild(f, 'arm64', { binary }); assert.ok(issues(f.check()).includes('ARCH_ESBUILD_ABI_MISMATCH'));
    }
});
test('unknown native executable and Node ABI add-on fail closed', t => {
    const f = fixture(t); f.pkg('unknown', '1.0.0'); f.write('node_modules/unknown/run', elf()); f.write('node_modules/unknown/addon.node', elf());
    const r = f.check(); assert.ok(issues(r).includes('ARCH_UNREVIEWED_NATIVE')); assert.ok(issues(r).includes('ARCH_NODE_ADDON_ABI_UNREVIEWED'));
});
test('native suffix with unrecognized or truncated bytes fails', t => {
    const f = fixture(t); f.write('mystery.node', 'not a native binary'); f.write('truncated', Buffer.from([127, 69, 76, 70]));
    assert.ok(issues(f.check()).includes('ARCH_UNKNOWN_NATIVE_FORMAT')); assert.ok(issues(f.check()).includes('ARCH_ELF_HEADER'));
});
test('reviewed Bare versions preserve foreign variants with honest other-runtime disposition', t => {
    const f = fixture(t); f.pkg('bare-fs', '4.8.2'); f.write('node_modules/bare-fs/prebuilds/linux-x64/bare-fs.bare', elf('x64'));
    const r = f.check(); assert.equal(r.passed, true); assert.equal(r.nativeFiles[0].disposition, 'bundled-bare-runtime-variant-not-node-addon');
});
test('Bare path/header mismatch or unreviewed version is rejected', t => {
    const f = fixture(t); f.pkg('bare-fs', '4.8.2'); f.write('node_modules/bare-fs/prebuilds/linux-arm64/bare-fs.bare', elf('x64'));
    assert.ok(issues(f.check()).includes('ARCH_BARE_PREBUILD_MISMATCH'));
    const g = fixture(t); g.pkg('bare-fs', '99.0.0'); g.write('node_modules/bare-fs/prebuilds/linux-arm64/bare-fs.bare', elf());
    assert.ok(issues(g.check()).includes('ARCH_UNREVIEWED_NATIVE'));
});
test('ELF program-header and interpreter offsets are bounded before reads', () => {
    const b = elf(); b.writeBigUInt64LE(2n ** 63n, 32); assert.throws(() => binaryHeader(b), /ARCH_ELF_TABLE/);
    const c = elf(); c.writeUInt16LE(65535, 56); assert.throws(() => binaryHeader(c), /ARCH_ELF_TABLE/);
    const d = elf('arm64', { interpreter: '/lib/loader' }); d.writeBigUInt64LE(100000n, 64 + 56 + 8); assert.throws(() => binaryHeader(d), /ARCH_ELF_INTERPRETER/);
});
test('known PE and Mach-O headers are classified but not accepted as Linux esbuild', t => {
    const pe = Buffer.alloc(256); pe.write('MZ'); pe.writeUInt32LE(128, 60); pe.writeUInt32LE(0x4550, 128); pe.writeUInt16LE(0xaa64, 132); pe.writeUInt16LE(0x20b, 152);
    const mach = Buffer.alloc(32); mach.writeUInt32LE(0xfeedfacf, 0); mach.writeUInt32LE(0x0100000c, 4);
    assert.equal(headerMatches(binaryHeader(pe), 'arm64', 'win32'), true); assert.equal(headerMatches(binaryHeader(mach), 'arm64', 'darwin'), true);
    const f = fixture(t); esbuild(f, 'arm64', { binary: pe }); assert.equal(f.check().passed, false);
});
test('npm platform constraints honor deny lists, any, libc and malformed metadata', t => {
    assert.equal(platformAllows('arm64', ['!x64']), true); assert.equal(platformAllows('arm64', ['!arm64', 'arm64']), false);
    assert.equal(platformAllows('arm64', ['any']), true); assert.throws(() => platformAllows('arm64', [null]), /ARCH_MANIFEST_PLATFORM_SHAPE/);
    const f = fixture(t); f.pkg('musl-only', '1.0.0', { libc: ['musl'] }); assert.ok(issues(f.check()).includes('ARCH_PACKAGE_PLATFORM_MISMATCH'));
});
test('unreviewed gyp build dependency and changed diskusage loader are blocked', t => {
    const f = fixture(t); f.pkg('addon-builder', '1.0.0', { gypfile: true }); assert.ok(issues(f.check()).includes('ARCH_UNREVIEWED_NATIVE_BUILD'));
    const g = fixture(t); g.pkg('diskusage', '1.2.0', { gypfile: true }); g.write('node_modules/diskusage/index.js', 'require("./fallback")'); assert.ok(issues(g.check()).includes('ARCH_UNREVIEWED_NATIVE_BUILD'));
});
test('lock drift is rejected for an actual installed package', t => {
    const f = fixture(t); f.pkg('sample', '1.0.0'); f.packages['node_modules/sample'].version = '2.0.0'; f.lock(); assert.ok(issues(f.check()).includes('ARCH_PACKAGE_LOCK_MISMATCH'));
});
test('internal npm file links are accepted; external, cyclic and directory links fail', t => {
    const f = fixture(t); f.write('node_modules/tool/bin.js', '#!/usr/bin/env node\n'); fs.mkdirSync(path.join(f.app, 'node_modules/.bin'));
    fs.symlinkSync('../tool/bin.js', path.join(f.app, 'node_modules/.bin/tool')); assert.equal(f.check().passed, true);
    fs.symlinkSync('/etc/passwd', path.join(f.app, 'escape')); fs.symlinkSync('cycle', path.join(f.app, 'cycle')); fs.symlinkSync('node_modules', path.join(f.app, 'dir-link'));
    fs.symlinkSync('node_modules/tool/bin.js', path.join(f.app, 'pretend.node'));
    assert.equal(issues(f.check()).filter(code => code === 'ARCH_UNSAFE_LINK').length, 4);
});
test('target, metadata, file-size and depth limits fail before execution', t => {
    const f = fixture(t); assert.throws(() => f.check('darwin-arm64'), /ARCH_ARGUMENT/);
    assert.throws(() => checkRuntimeArchitecture({ app: f.app, platform: 'linux-arm64', nodeVersion: '18.0.0' }), /ARCH_NODE_CONTRACT/);
    f.write('package.json', 'x'.repeat(LIMITS.manifestBytes + 1)); assert.throws(() => f.check(), /ARCH_INPUT_LIMIT/);
    const g = fixture(t); fs.mkdirSync(path.join(g.app, ...Array(42).fill('d')), { recursive: true }); assert.throws(() => g.check(), /ARCH_SCAN_LIMIT/);
});
