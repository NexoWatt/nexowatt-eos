'use strict';
// Exact, reviewed TEST contract; not a general native-addon allowlist.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const policy = require('./serialport-policy.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const compare = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
function assertNativeHost(host) {
    if (host.platform !== 'linux' || host.arch !== 'arm64' || host.node !== '24.21.0' ||
        !Number.isInteger(Number(host.napi)) || Number(host.napi) < 8 || !/^1\.[0-9]+\.[0-9]+$/.test(host.uv || '') ||
        !/^2\.[0-9]+$/.test(host.glibc || '') || Number(host.glibc.split('.')[1]) < 28 || host.electron || host.nw) {
        const error = new Error('NATIVE_HOST_CONTRACT'); error.code = error.message; throw error;
    }
}
function hostIdentity(runtime = process) {
    return { platform: runtime.platform, arch: runtime.arch, node: runtime.versions.node,
        napi: runtime.versions.napi, uv: runtime.versions.uv, electron: runtime.versions.electron,
        nw: runtime.versions.nw, glibc: runtime.report?.getReport()?.header?.glibcVersionRuntime };
}
function loaderSource(pin) {
    // No node-gyp-build, build/Release, nearby executable or environment-selected
    // path remains. The signed package loads one root-owned exact binary only.
    return `'use strict';\n// EOS fixed native TEST loader; upstream MIT license remains in LICENSE.\n` +
        `const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');\n` +
        `const assertNativeHost = ${assertNativeHost.toString().replace(/\r\n/g, '\n')};\nconst hostIdentity = ${hostIdentity.toString().replace(/\r\n/g, '\n')};\n` +
        `assertNativeHost(hostIdentity());\n` +
        `const file = path.join(__dirname, ${JSON.stringify(pin.native)});\n` +
        `for (let current = file;; current = path.dirname(current)) {\n` +
        ` const stat = fs.lstatSync(current);\n` +
        ` if (stat.isSymbolicLink() || stat.uid !== 0 || stat.mode & 0o022) throw new Error('NATIVE_UNTRUSTED_PATH');\n` +
        ` if (current === path.dirname(current)) break;\n}\n` +
        `const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);\n` +
        `try { const stat = fs.fstatSync(fd);\n` +
        ` if (!stat.isFile() || stat.nlink !== 1 || stat.size !== ${pin.nativeBytes} ||\n` +
        `  crypto.createHash('sha256').update(fs.readFileSync(fd)).digest('hex') !== ${JSON.stringify(pin.nativeSha256)}) throw new Error('NATIVE_CONTENT');\n` +
        `} finally { fs.closeSync(fd); }\n` +
        `// Resolve imported libuv/C++/glibc symbols now, without any device calls.\n` +
        `process.dlopen(module, file, require('node:os').constants.dlopen.RTLD_NOW);\n`;
}
function patchedLoader(original, pin) {
    const expected = pin.originalFiles.find(row => row.path === pin.loader);
    if (sha(Buffer.from(original)) !== expected?.sha256) fail('NATIVE_ORIGINAL_LOADER');
    const marker = '// EOS fixed Linux/ARM64 loader; upstream MIT license remains applicable.\n';
    let result;
    if (pin.version === '12.0.1') {
        result = original.replace('const node_gyp_build_1 = __importDefault(require("node-gyp-build"));\n', marker)
            .replace('const path_1 = require("path");\n', '')
            .replace("const binding = (0, node_gyp_build_1.default)((0, path_1.join)(__dirname, '../'));", "const binding = require('../eos-native-loader.cjs');");
    } else if (pin.version === '13.0.0') {
        result = '"use strict";\n' + marker + 'Object.defineProperty(exports, "__esModule", { value: true });\n' +
            "exports.binding = require('../eos-native-loader.cjs');\n";
    } else fail('NATIVE_VERSION');
    if (result === original || result.includes('node-gyp-build')) fail('NATIVE_LOADER_TRANSFORM');
    return result;
}
function packageFiles(directory) {
    directory = path.resolve(directory);
    if (fs.realpathSync(directory) !== directory || !fs.lstatSync(directory).isDirectory()) fail('NATIVE_PACKAGE_PATH');
    const rows = []; let entries = 0, total = 0;
    function walk(relative) {
        for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
            if (++entries > 256) fail('NATIVE_PACKAGE_LIMIT');
            if (entry.name === 'node_modules' && entry.isDirectory()) continue;
            const name = relative ? `${relative}/${entry.name}` : entry.name;
            const file = path.join(directory, name), before = fs.lstatSync(file);
            if (before.isSymbolicLink()) fail('NATIVE_PACKAGE_LINK');
            if (before.isDirectory()) { walk(name); continue; }
            if (!before.isFile() || before.nlink !== 1 || before.size > 8 * 1024 * 1024 || (total += before.size) > 32 * 1024 * 1024) fail('NATIVE_PACKAGE_LIMIT');
            const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
            try {
                const opened = fs.fstatSync(fd), bytes = fs.readFileSync(fd), after = fs.fstatSync(fd);
                if (opened.ino !== before.ino || opened.dev !== before.dev || opened.size !== before.size ||
                    after.size !== before.size || bytes.length !== before.size || opened.mtimeMs !== after.mtimeMs || opened.ctimeMs !== after.ctimeMs) fail('NATIVE_PACKAGE_CHANGED');
                rows.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
            } finally { fs.closeSync(fd); }
        }
    }
    walk(''); return rows.sort(compare);
}
function normalizedFiles(pin) {
    if (!/^[a-f0-9]{64}$/.test(pin.patchedLoaderSha256 || '') || !Number.isSafeInteger(pin.patchedLoaderBytes)) fail('NATIVE_POLICY_INCOMPLETE');
    const rows = pin.originalFiles.filter(row => !row.path.endsWith('.node') || row.path === pin.native)
        .map(row => row.path === pin.loader ? { path: row.path, bytes: pin.patchedLoaderBytes, sha256: pin.patchedLoaderSha256 } : { ...row });
    const loader = Buffer.from(loaderSource(pin));
    if (sha(loader) !== pin.fixedLoaderSha256 || loader.length !== pin.fixedLoaderBytes) fail('NATIVE_POLICY_LOADER');
    rows.push({ path: 'eos-native-loader.cjs', bytes: loader.length, sha256: sha(loader) });
    return rows.sort(compare);
}
function treeDigest(rows) { return sha(Buffer.from(JSON.stringify(rows))); }
function packageReport(pin) {
    return { profile: policy.profile, packagePath: pin.packagePath, package: pin.package, version: pin.version,
        originalTreeSha256: treeDigest(pin.originalFiles), normalizedTreeSha256: treeDigest(normalizedFiles(pin)),
        selectedNative: `${pin.packagePath}/${pin.native}`, nativeSha256: pin.nativeSha256,
        napi: pin.napi, targetProbeRequired: true, hardwareAccepted: false };
}
function normalizationEvidence() {
    const packages = policy.packages.map(pin => ({ ...packageReport(pin), upstreamArchive: pin.archive,
        upstreamIntegrity: pin.integrity, upstreamArchiveSha256: pin.archiveSha256,
        removedFiles: pin.originalFiles.filter(row => row.path.endsWith('.node') && row.path !== pin.native),
        modifiedFiles: [{ path: pin.loader, originalSha256: pin.originalFiles.find(row => row.path === pin.loader).sha256,
            sha256: pin.patchedLoaderSha256 }], addedFiles: normalizedFiles(pin).filter(row => row.path === 'eos-native-loader.cjs'),
        lifecycleScriptsExecuted: false, targetCodeExecuted: false }));
    return { schemaVersion: 1, kind: 'eos-serialport-native-normalization', profile: policy.profile,
        platform: policy.target.platform, nodeVersion: policy.target.nodeVersion,
        packages, hardwareAccepted: false, targetLoadProbeRequired: true };
}
function assertPackage({ app, pin, lockEntry, platform, nodeVersion, normalized = true }) {
    if (platform !== policy.target.platform || nodeVersion !== policy.target.nodeVersion ||
        lockEntry?.version !== pin.version || lockEntry.resolved !== pin.archive || lockEntry.integrity !== pin.integrity || lockEntry.link) fail('NATIVE_PACKAGE_IDENTITY');
    const rows = packageFiles(path.join(app, pin.packagePath)), expected = normalized ? normalizedFiles(pin) : pin.originalFiles;
    if (JSON.stringify(rows) !== JSON.stringify(expected)) fail('NATIVE_PACKAGE_CONTENT');
    return packageReport(pin);
}
module.exports = { policy, sha, assertNativeHost, hostIdentity, loaderSource, patchedLoader,
    packageFiles, normalizedFiles, treeDigest, packageReport, normalizationEvidence, assertPackage };
