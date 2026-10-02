'use strict';

// Read-only build gate. It never requires app code or executes target binaries.
// A matching header is architecture evidence, not a native-runtime/ABI test.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const LIMITS = Object.freeze({ files: 50000, directories: 15000, depth: 40, bytes: 512 * 1024 ** 2,
    manifestBytes: 1024 ** 2, lockBytes: 8 * 1024 ** 2, nativeBytes: 32 * 1024 ** 2, prefixBytes: 65536, issues: 256 });
const BARE = Object.freeze({ 'bare-fs': '4.8.2', 'bare-url': '2.5.4', 'bare-path': '3.1.2' });
const BARE_VARIANTS = new Set(['android-x64', 'win32-arm64', 'darwin-arm64', 'ios-arm64', 'darwin-x64',
    'linux-arm64', 'android-arm', 'linux-x64', 'ios-arm64-simulator', 'ios-x64-simulator', 'win32-x64', 'android-arm64', 'android-ia32']);
const DISKUSAGE_LOADER_SHA256 = 'c87aa357fc676205fa60a6c0215738b0a261f7f7b1fb1f836231de38ef2d2abf';
const CPU = Object.freeze({ x64: { elf: 62, bits: 64, pe: 0x8664, mach: 0x01000007 },
    arm64: { elf: 183, bits: 64, pe: 0xaa64, mach: 0x0100000c },
    arm: { elf: 40, bits: 32 }, ia32: { elf: 3, bits: 32 } });
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
function reject(code) { const error = new Error(code); error.code = code; throw error; }
function within(root, file) { return file === root || file.startsWith(`${root}${path.sep}`); }
function packagePathMatches(packagePath, name) {
    return packagePath === `node_modules/${name}` || packagePath.endsWith(`/node_modules/${name}`);
}
function platformAllows(value, declared) {
    if (declared === undefined) return true;
    const list = typeof declared === 'string' ? [declared] : declared;
    if (!Array.isArray(list) || list.length > 32 || list.some(item => typeof item !== 'string' || !/^!?[a-z0-9_-]{1,32}$/.test(item))) reject('ARCH_MANIFEST_PLATFORM_SHAPE');
    if (list.length === 1 && list[0] === 'any') return true;
    if (list.includes(`!${value}`)) return false;
    const positive = list.filter(item => !item.startsWith('!'));
    return !positive.length || positive.includes(value);
}
function readRegular(file, maximum) {
    const before = fs.lstatSync(file);
    if (!before.isFile() || before.size > maximum) reject('ARCH_INPUT_LIMIT');
    const descriptor = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
        const stat = fs.fstatSync(descriptor);
        if (stat.dev !== before.dev || stat.ino !== before.ino || stat.size !== before.size) reject('ARCH_INPUT_CHANGED');
        const data = Buffer.alloc(before.size);
        let read = 0;
        while (read < data.length) {
            const count = fs.readSync(descriptor, data, read, data.length - read, read);
            if (!count) reject('ARCH_INPUT_CHANGED');
            read += count;
        }
        const after = fs.fstatSync(descriptor);
        if (data.length !== before.size || stat.size !== after.size || stat.mtimeMs !== after.mtimeMs || stat.ctimeMs !== after.ctimeMs) reject('ARCH_INPUT_CHANGED');
        return data;
    } finally { fs.closeSync(descriptor); }
}
function readJson(file, maximum) {
    let value;
    try { value = JSON.parse(readRegular(file, maximum)); } catch (error) {
        if (error.code?.startsWith('ARCH_')) throw error;
        reject('ARCH_JSON_INVALID');
    }
    if (!plain(value)) reject('ARCH_JSON_INVALID');
    return value;
}
function binaryHeader(data, fileSize = data.length) {
    if (data.length >= 4 && data.subarray(0, 4).equals(Buffer.from([127, 69, 76, 70]))) {
        const bits = data[4] === 2 ? 64 : data[4] === 1 ? 32 : 0;
        if (!bits || data.length < (bits === 64 ? 64 : 52) || data[5] !== 1 || data[6] !== 1) reject('ARCH_ELF_HEADER');
        const headerSize = bits === 64 ? 64 : 52;
        if (data.readUInt16LE(bits === 64 ? 52 : 40) !== headerSize || data.readUInt32LE(20) !== 1) reject('ARCH_ELF_HEADER');
        const type = data.readUInt16LE(16), machine = data.readUInt16LE(18);
        if (![2, 3].includes(type) || ![0, 3].includes(data[7])) reject('ARCH_ELF_ABI');
        const count = data.readUInt16LE(bits === 64 ? 56 : 44);
        const entrySize = data.readUInt16LE(bits === 64 ? 54 : 42);
        const offsetBig = bits === 64 ? data.readBigUInt64LE(32) : BigInt(data.readUInt32LE(28));
        if (offsetBig > BigInt(Number.MAX_SAFE_INTEGER)) reject('ARCH_ELF_TABLE');
        const offset = Number(offsetBig), expectedEntrySize = bits === 64 ? 56 : 32;
        if (!count || count > 128 || offset < headerSize || entrySize !== expectedEntrySize || offset + count * entrySize > Math.min(data.length, fileSize)) reject('ARCH_ELF_TABLE');
        let interpreter = null, dynamic = false;
        for (let i = 0; i < count; i++) {
            const at = offset + i * entrySize, kind = data.readUInt32LE(at);
            if (kind === 2) dynamic = true;
            if (kind !== 3) continue;
            const startBig = bits === 64 ? data.readBigUInt64LE(at + 8) : BigInt(data.readUInt32LE(at + 4));
            const sizeBig = bits === 64 ? data.readBigUInt64LE(at + 32) : BigInt(data.readUInt32LE(at + 16));
            if (startBig > BigInt(data.length) || sizeBig > 256n || sizeBig < 2n || interpreter !== null) reject('ARCH_ELF_INTERPRETER');
            const start = Number(startBig), size = Number(sizeBig);
            if (start + size > Math.min(data.length, fileSize) || data[start + size - 1] !== 0) reject('ARCH_ELF_INTERPRETER');
            interpreter = data.subarray(start, start + size - 1).toString('ascii');
            if (!/^\/[a-zA-Z0-9_./+-]{1,254}$/.test(interpreter)) reject('ARCH_ELF_INTERPRETER');
        }
        return { format: 'ELF', bits, machine, endianness: 'little', osAbi: data[7], type, dynamic, interpreter };
    }
    if (data.length >= 2 && data.subarray(0, 2).toString('ascii') === 'MZ') {
        if (data.length < 64) reject('ARCH_PE_HEADER');
        const at = data.readUInt32LE(60);
        if (at < 64 || at + 26 > Math.min(data.length, fileSize) || data.readUInt32LE(at) !== 0x00004550) reject('ARCH_PE_HEADER');
        const magic = data.readUInt16LE(at + 24);
        if (![0x10b, 0x20b].includes(magic)) reject('ARCH_PE_HEADER');
        return { format: 'PE', bits: magic === 0x20b ? 64 : 32, machine: data.readUInt16LE(at + 4), endianness: 'little' };
    }
    if (data.length >= 4 && ['cffaedfe', 'cefaedfe', 'feedfacf', 'feedface', 'cafebabe', 'bebafeca'].includes(data.subarray(0, 4).toString('hex'))) {
        if (data.length < 32 || data.readUInt32LE(0) !== 0xfeedfacf) reject('ARCH_MACH_HEADER');
        return { format: 'Mach-O', bits: 64, machine: data.readUInt32LE(4), endianness: 'little' };
    }
    return null;
}
function headerMatches(header, cpu, os) {
    const expected = CPU[cpu];
    if (!expected || header.bits !== expected.bits) return false;
    if (os === 'linux' || os === 'android') return header.format === 'ELF' && header.machine === expected.elf;
    if (os === 'win32') return header.format === 'PE' && header.machine === expected.pe;
    if (os === 'darwin' || os === 'ios') return header.format === 'Mach-O' && header.machine === expected.mach;
    return false;
}
function checkRuntimeArchitecture(options) {
    if (!plain(options) || !['linux-x64', 'linux-arm64'].includes(options.platform) || typeof options.app !== 'string') reject('ARCH_ARGUMENT');
    if (options.nodeVersion !== undefined && !/^24\.\d{1,3}\.\d{1,3}$/.test(options.nodeVersion)) reject('ARCH_NODE_CONTRACT');
    const root = path.resolve(options.app);
    if (!fs.lstatSync(root).isDirectory() || fs.realpathSync(root) !== root) reject('ARCH_APP_DIRECTORY');
    const cpu = options.platform.slice(6), files = new Map(), links = [], packages = new Map();
    const report = { schemaVersion: 1, kind: 'eos-runtime-architecture-static-check', platform: options.platform,
        target: { os: 'linux', cpu, bits: 64, endianness: 'little', nodeVersion: options.nodeVersion || null, nodeRuntimeIncluded: false, libc: 'glibc' },
        checkedAt: new Date().toISOString(), executedTargetCode: false, hardwareQualified: false,
        scan: { files: 0, directories: 0, bytes: 0 }, packageConstraints: [], nativeFiles: [], exceptions: [], issues: [], limits: LIMITS };
    function issue(code, file) { if (report.issues.length >= LIMITS.issues) reject('ARCH_ISSUE_LIMIT'); report.issues.push({ code, path: file }); }
    function walk(dir, depth) {
        if (depth > LIMITS.depth || ++report.scan.directories > LIMITS.directories) reject('ARCH_SCAN_LIMIT');
        // Bound directory enumeration before sorting, including maliciously large directories.
        const entries = [], directory = fs.opendirSync(dir);
        try {
            for (let entry; (entry = directory.readSync());) {
                entries.push(entry);
                if (entries.length > LIMITS.files + LIMITS.directories) reject('ARCH_SCAN_LIMIT');
            }
        } finally { directory.closeSync(); }
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            const absolute = path.join(dir, entry.name), relative = path.relative(root, absolute).split(path.sep).join('/');
            if (relative.length > 1024 || /[\x00-\x1f\x7f]/.test(relative)) reject('ARCH_PATH');
            const stat = fs.lstatSync(absolute);
            if (stat.isSymbolicLink()) { links.push(relative); if (links.length > LIMITS.files) reject('ARCH_SCAN_LIMIT'); }
            else if (stat.isDirectory()) walk(absolute, depth + 1);
            else if (stat.isFile()) {
                if (++report.scan.files > LIMITS.files || (report.scan.bytes += stat.size) > LIMITS.bytes) reject('ARCH_SCAN_LIMIT');
                files.set(relative, stat.size);
            } else reject('ARCH_SPECIAL_FILE');
        }
    }
    walk(root, 0);
    for (const relative of links) {
        const absolute = path.join(root, relative), destination = fs.readlinkSync(absolute);
        try {
            const resolved = fs.realpathSync(absolute);
            if (!/(?:^|\/)node_modules\/\.bin\/[^/]+$/.test(relative) || path.isAbsolute(destination) || !within(root, resolved) || !fs.statSync(resolved).isFile()) issue('ARCH_UNSAFE_LINK', relative);
        } catch { issue('ARCH_UNSAFE_LINK', relative); }
    }
    const lock = readJson(path.join(root, 'package-lock.json'), LIMITS.lockBytes);
    if (lock.lockfileVersion !== 3 || !plain(lock.packages) || Object.keys(lock.packages).length > 5000) reject('ARCH_LOCK');
    report.packageLockSha256 = sha(readRegular(path.join(root, 'package-lock.json'), LIMITS.lockBytes));
    report.packageJsonSha256 = sha(readRegular(path.join(root, 'package.json'), LIMITS.manifestBytes));
    for (const [relative] of files) {
        if (relative !== 'package.json' && !/(?:^|\/)node_modules\/(?:@[^/]+\/)?[^/]+\/package\.json$/.test(relative)) continue;
        const manifest = readJson(path.join(root, relative), LIMITS.manifestBytes), packagePath = relative === 'package.json' ? '' : path.posix.dirname(relative);
        if (!plain(lock.packages[packagePath]) || lock.packages[packagePath].link || lock.packages[packagePath].version !== manifest.version) issue('ARCH_PACKAGE_LOCK_MISMATCH', relative);
        if (typeof manifest.name !== 'string' || manifest.name.length > 214 || typeof manifest.version !== 'string' || manifest.version.length > 80) reject('ARCH_MANIFEST_IDENTITY');
        packages.set(packagePath, manifest);
        if (manifest.cpu !== undefined || manifest.os !== undefined || manifest.libc !== undefined) {
            report.packageConstraints.push({ path: packagePath, name: manifest.name, version: manifest.version, cpu: manifest.cpu, os: manifest.os, libc: manifest.libc });
            if (!platformAllows(cpu, manifest.cpu) || !platformAllows('linux', manifest.os) || !platformAllows('glibc', manifest.libc)) issue('ARCH_PACKAGE_PLATFORM_MISMATCH', relative);
        }
        if (manifest.gypfile) {
            const loader = `${packagePath}/index.js`;
            if (manifest.name !== 'diskusage' || !packagePathMatches(packagePath, 'diskusage') || manifest.version !== '1.2.0' || !files.has(loader) || sha(readRegular(path.join(root, loader), LIMITS.manifestBytes)) !== DISKUSAGE_LOADER_SHA256) issue('ARCH_UNREVIEWED_NATIVE_BUILD', relative);
            else report.exceptions.push({ package: manifest.name, version: manifest.version, path: loader, sha256: DISKUSAGE_LOADER_SHA256,
                reason: 'Reviewed fs.statfs branch for the supported Node 24.x host contract; external host API validation remains required. No native Node addon included or approved.' });
        }
    }
    function ownerOf(relative) {
        let current = path.posix.dirname(relative);
        while (current !== '.') { if (packages.has(current)) return [current, packages.get(current)]; current = path.posix.dirname(current); }
        return ['', packages.get('')];
    }
    for (const [relative, size] of files) {
        const absolute = path.join(root, relative), before = fs.lstatSync(absolute);
        if (!before.isFile() || before.size !== size) reject('ARCH_INPUT_CHANGED');
        const descriptor = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
        let prefix;
        try {
            const initial = fs.fstatSync(descriptor);
            if (initial.dev !== before.dev || initial.ino !== before.ino || initial.size !== size) reject('ARCH_INPUT_CHANGED');
            prefix = Buffer.alloc(Math.min(size, LIMITS.prefixBytes));
            let actual = 0;
            while (actual < prefix.length) {
                const count = fs.readSync(descriptor, prefix, actual, prefix.length - actual, actual);
                if (!count) reject('ARCH_INPUT_CHANGED');
                actual += count;
            }
            const after = fs.fstatSync(descriptor);
            if (after.size !== size || initial.mtimeMs !== after.mtimeMs || initial.ctimeMs !== after.ctimeMs) reject('ARCH_INPUT_CHANGED');
        }
        finally { fs.closeSync(descriptor); }
        let header;
        try { header = binaryHeader(prefix, size); } catch (error) { issue(error.code || 'ARCH_NATIVE_HEADER', relative); continue; }
        const nativeExtension = /\.(?:node|bare|so(?:\.\d+)*|dll|dylib|exe|a|o)$/i.test(relative);
        if (!header && !nativeExtension) continue;
        if (!header) { issue('ARCH_UNKNOWN_NATIVE_FORMAT', relative); continue; }
        if (size > LIMITS.nativeBytes) reject('ARCH_NATIVE_LIMIT');
        const [packagePath, manifest] = ownerOf(relative), local = path.posix.relative(packagePath || '.', relative);
        const item = { path: relative, package: manifest?.name || null, version: manifest?.version || null, ...header,
            bytes: size, sha256: sha(readRegular(absolute, LIMITS.nativeBytes)), disposition: 'unreviewed' };
        if (/\.node$/i.test(relative)) issue('ARCH_NODE_ADDON_ABI_UNREVIEWED', relative);
        else if (manifest?.name === `@esbuild/linux-${cpu}` && local === 'bin/esbuild') {
            if (!packagePathMatches(packagePath, manifest.name) || JSON.stringify(manifest.cpu) !== JSON.stringify([cpu]) || JSON.stringify(manifest.os) !== '["linux"]') issue('ARCH_ESBUILD_PACKAGE_CONTRACT', relative);
            else if (!headerMatches(header, cpu, 'linux') || header.dynamic || header.interpreter) issue('ARCH_ESBUILD_ABI_MISMATCH', relative);
            else item.disposition = 'target-static-native-executable';
        } else if (manifest && BARE[manifest.name] === manifest.version) {
            const match = local.match(/^prebuilds\/(linux|android|win32|darwin|ios)-(x64|arm64|arm|ia32)(?:-simulator)?\/([^/]+)\.bare$/);
            if (!packagePathMatches(packagePath, manifest.name) || !match || !BARE_VARIANTS.has(local.split('/')[1]) || match[3] !== manifest.name || !headerMatches(header, match[2], match[1])) issue('ARCH_BARE_PREBUILD_MISMATCH', relative);
            else item.disposition = 'bundled-bare-runtime-variant-not-node-addon';
        } else issue('ARCH_UNREVIEWED_NATIVE', relative);
        report.nativeFiles.push(item);
    }
    function resolvePackage(from, name) {
        let dir = from;
        for (;;) {
            const candidate = path.posix.join(dir, 'node_modules', name);
            if (packages.has(candidate)) return [candidate, packages.get(candidate)];
            if (!dir || dir === '.') return null;
            dir = path.posix.dirname(dir); if (dir === '.') dir = '';
        }
    }
    for (const [packagePath, manifest] of packages) {
        if (manifest.name !== 'esbuild') continue;
        const name = `@esbuild/linux-${cpu}`, selected = resolvePackage(packagePath, name);
        if (!selected || manifest.optionalDependencies?.[name] !== manifest.version || selected[1].version !== manifest.version ||
            !report.nativeFiles.some(item => item.path === `${selected[0]}/bin/esbuild` && item.disposition === 'target-static-native-executable')) {
            issue('ARCH_ESBUILD_TARGET_BINARY_MISSING', `${packagePath}/package.json`);
        }
    }
    report.installedPackageCount = packages.size;
    report.symlinkCount = links.length;
    report.passed = report.issues.length === 0;
    report.limitations = ['No target binary executed; target OS/kernel/libc/Node/Redis and hardware validation remain required.',
        'Headers cannot prove native Node ABI compatibility. All .node addons fail pending explicit ABI contract.',
        'Known .bare variants are retained as other-runtime assets, not approved Node addons; no claim they are mathematically unreachable.',
        'The input tree must be quiescent and access-controlled; this is not a filesystem snapshot or concurrent-writer isolation mechanism.',
        'Recognized executable headers and native suffixes are scanned; opaque, encrypted or embedded payload discovery is outside this gate.',
        'This architecture gate does not replace dependency integrity, SBOM, vulnerability or signed artifact checks.'];
    return report;
}
function main(argv) {
    const options = {};
    if (![4, 6].includes(argv.length)) reject('ARCH_ARGUMENT');
    for (let i = 0; i < argv.length; i += 2) {
        const key = argv[i] === '--node-version' ? 'nodeVersion' : argv[i].slice(2);
        if (!['--app', '--platform', '--node-version'].includes(argv[i]) || Object.hasOwn(options, key)) reject('ARCH_ARGUMENT');
        options[key] = argv[i + 1];
    }
    const report = checkRuntimeArchitecture(options);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.passed ? 0 : 1;
}
if (require.main === module) {
    try { main(process.argv.slice(2)); } catch (error) {
        process.stderr.write(`${error.code?.startsWith('ARCH_') ? error.code : 'ARCH_IO_FAILURE'}\n`); process.exitCode = 1;
    }
}
module.exports = { checkRuntimeArchitecture, binaryHeader, headerMatches, platformAllows, LIMITS };
