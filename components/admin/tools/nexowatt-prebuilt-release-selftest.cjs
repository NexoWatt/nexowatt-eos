#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const manifestFile = path.join(root, 'NEXOWATT_EOS_PREBUILT_MANIFEST.json');
const packageFile = path.join(root, 'package.json');
const trackedRoots = [
    'src',
    'build',
    'src-admin/src',
    'src-admin/public',
    'adminWww',
    'admin',
    'public',
    'tools',
    'packages/eos-license-client',
    'test',
];
const trackedFiles = [
    // Dependency/package metadata belongs to the exact reviewed artifact too.
    // Lifecycle checks alone would not bind a changed resolved dependency tree.
    'package.json',
    'package-lock.json',
    'io-package.json',
    'tasks.mts',
    'tsconfig.json',
    'tsconfig.build.json',
];
const expectedPrepublishOnly =
    'npm run sync:eos-version && npm run prepare:eos-release-defaults && npm run clean:eos-runtime && npm run check:eos-publish-channel && npm run check:eos-package && npm run check:eos-stability';
const expectedPrepack =
    'node tools/nexowatt-sync-release-version.cjs --quiet && node tools/nexowatt-ensure-release-defaults.cjs && node tools/nexowatt-clean-legacy-runtime.cjs --quiet && node tools/nexowatt-prebuilt-release-selftest.cjs';

function normalize(relative) {
    return relative.replace(/\\/g, '/');
}

function walk(relative, output) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
        throw new Error(`symbolic links are not allowed in the sealed release: ${normalize(relative)}`);
    }
    if (stat.isFile()) {
        output.push(normalize(relative));
        return;
    }
    if (!stat.isDirectory()) return;
    for (const name of fs.readdirSync(absolute).sort()) {
        walk(path.join(relative, name), output);
    }
}

function collectTrackedFiles() {
    const files = [];
    for (const relative of trackedRoots) walk(relative, files);
    for (const relative of trackedFiles) {
        const absolute = path.join(root, relative);
        if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
            throw new Error(`tracked release input is missing: ${relative}`);
        }
        files.push(normalize(relative));
    }
    return [...new Set(files)].sort();
}

function sha256(relative) {
    return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
}

function createManifest() {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    const files = collectTrackedFiles();
    const hashes = {};
    for (const relative of files) hashes[relative] = sha256(relative);
    return {
        format: 1,
        package: pkg.name,
        version: pkg.version,
        algorithm: 'sha256',
        fileCount: files.length,
        trackedRoots,
        trackedFiles,
        files: hashes,
    };
}

function writeManifest() {
    const manifest = createManifest();
    fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`[NexoWatt EOS prebuilt release] sealed ${manifest.fileCount} source/runtime file(s) for ${manifest.version}`);
}

function resolveLocal(fromFile, specifier) {
    const base = path.resolve(path.dirname(fromFile), specifier);
    const candidates = [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')];
    if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
        const nestedPackage = path.join(base, 'package.json');
        if (fs.existsSync(nestedPackage)) {
            try {
                const value = JSON.parse(fs.readFileSync(nestedPackage, 'utf8'));
                if (value.main) candidates.unshift(path.resolve(base, value.main));
            } catch {
                // The normal package validator reports malformed JSON in detail.
            }
        }
    }
    return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

function inspectRuntimeClosure(failures) {
    const entry = path.join(root, 'build', 'main.js');
    const visited = new Set();
    const runtimeFiles = new Set();

    function inspect(file) {
        const absolute = path.resolve(file);
        if (visited.has(absolute)) return;
        visited.add(absolute);
        runtimeFiles.add(absolute);
        if (!fs.existsSync(absolute)) {
            failures.push(`missing runtime file ${normalize(path.relative(root, absolute))}`);
            return;
        }
        if (!absolute.endsWith('.js')) return;

        const parsed = spawnSync(process.execPath, ['--check', absolute], {
            encoding: 'utf8',
            windowsHide: true,
        });
        if (parsed.status !== 0) {
            failures.push(
                `${normalize(path.relative(root, absolute))} does not parse: ${(parsed.stderr || parsed.stdout || '').trim()}`,
            );
        }

        const text = fs.readFileSync(absolute, 'utf8');
        const patterns = [
            /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
            /\brequire\.resolve\(\s*['"]([^'"]+)['"]\s*\)/g,
            /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
        ];
        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(text))) {
                const specifier = match[1];
                if (!specifier.startsWith('.')) continue;
                const target = resolveLocal(absolute, specifier);
                if (!target) {
                    failures.push(`${normalize(path.relative(root, absolute))} -> ${specifier} cannot be resolved`);
                    continue;
                }
                inspect(target);
            }
        }
    }

    inspect(entry);
    for (const required of [
        'build/main.js',
        'build/lib/web.js',
        'build/lib/eosAutoUpdate.js',
        'build/lib/eosRequestSecurity.js',
    ]) {
        if (!runtimeFiles.has(path.join(root, required))) {
            failures.push(`entrypoint closure does not include required module ${required}`);
        }
    }
    return runtimeFiles.size;
}

function verifyManifest(failures) {
    if (!fs.existsSync(manifestFile)) {
        failures.push('NEXOWATT_EOS_PREBUILT_MANIFEST.json is missing');
        return 0;
    }
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch (error) {
        failures.push(`prebuilt manifest is invalid JSON: ${error.message}`);
        return 0;
    }
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    if (manifest.format !== 1) failures.push(`unsupported prebuilt manifest format ${manifest.format}`);
    if (manifest.package !== pkg.name) failures.push(`prebuilt manifest package ${manifest.package} does not match ${pkg.name}`);
    if (manifest.version !== pkg.version) failures.push(`prebuilt manifest version ${manifest.version} does not match ${pkg.version}`);
    if (manifest.algorithm !== 'sha256') failures.push(`prebuilt manifest algorithm must be sha256, got ${manifest.algorithm}`);

    let currentFiles = [];
    try {
        currentFiles = collectTrackedFiles();
    } catch (error) {
        failures.push(error.message);
        return 0;
    }
    const sealedFiles = Object.keys(manifest.files || {}).sort();
    const currentSet = new Set(currentFiles);
    const sealedSet = new Set(sealedFiles);
    for (const relative of currentFiles) {
        if (!sealedSet.has(relative)) failures.push(`unsealed release file: ${relative}`);
    }
    for (const relative of sealedFiles) {
        if (!currentSet.has(relative)) failures.push(`sealed release file is missing: ${relative}`);
    }
    for (const relative of sealedFiles) {
        if (!currentSet.has(relative)) continue;
        const actual = sha256(relative);
        if (actual !== manifest.files[relative]) failures.push(`sealed release file changed after validation: ${relative}`);
    }
    if (manifest.fileCount !== sealedFiles.length) {
        failures.push(`prebuilt manifest fileCount ${manifest.fileCount} does not match ${sealedFiles.length}`);
    }
    return sealedFiles.length;
}

function verifyLifecycle(failures) {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    const scripts = pkg.scripts || {};
    if (scripts.prepublishOnly !== expectedPrepublishOnly) {
        failures.push('prepublishOnly is not the canonical dependency-free direct-publish workflow');
    }
    if (scripts.prepack !== expectedPrepack) {
        failures.push('prepack is not the canonical dependency-free prebuilt-artifact verifier');
    }
    if (scripts['check:eos-prebuilt-release'] !== 'node tools/nexowatt-prebuilt-release-selftest.cjs') {
        failures.push('check:eos-prebuilt-release script is missing or incorrect');
    }
    if (scripts['seal:eos-prebuilt-release'] !== 'node tools/nexowatt-prebuilt-release-selftest.cjs --write') {
        failures.push('seal:eos-prebuilt-release script is missing or incorrect');
    }
    for (const [name, command] of [
        ['prepublishOnly', scripts.prepublishOnly || ''],
        ['prepack', scripts.prepack || ''],
    ]) {
        for (const forbidden of [
            /(?:^|\s)tsc(?:\s|$)/i,
            /(?:^|\s)tsx(?:\s|$)/i,
            /build:backend/i,
            /build:frontend/i,
            /(?:^|\s)npx(?:\s|$)/i,
            /npm\s+(?:i|install|ci)(?:\s|$)/i,
        ]) {
            if (forbidden.test(command)) failures.push(`${name} must not require local development dependencies: ${command}`);
        }
    }
    const backendRuntimeSelftestFile = path.join(root, 'tools', 'nexowatt-backend-runtime-selftest.cjs');
    if (!fs.existsSync(backendRuntimeSelftestFile)) {
        failures.push('tools/nexowatt-backend-runtime-selftest.cjs is missing');
    } else {
        const backendRuntimeSelftest = fs.readFileSync(backendRuntimeSelftestFile, 'utf8');
        if (!backendRuntimeSelftest.includes('dependency-free on Windows')) {
            failures.push('backend runtime selftest is missing the cross-platform publish marker');
        }
        if (/const\s+npm\s*=\s*process\.platform|spawnSync\(\s*npm\s*,|['"]npm\.cmd['"]/.test(backendRuntimeSelftest)) {
            failures.push('backend runtime selftest must not spawn a nested npm process');
        }
    }
    const packageFiles = new Set((pkg.files || []).map(value => String(value).replace(/\\/g, '/')));
    if (![...packageFiles].some(value => value.replace(/\/+$/, '') === 'build')) {
        failures.push('package.json files must include the complete build directory');
    }
    for (const required of [
        'tools/nexowatt-prebuilt-release-selftest.cjs',
        'NEXOWATT_EOS_PREBUILT_MANIFEST.json',
    ]) {
        if (!packageFiles.has(required)) failures.push(`package.json files is missing ${required}`);
    }
}

if (process.argv.includes('--write')) {
    try {
        writeManifest();
    } catch (error) {
        console.error(`[NexoWatt EOS prebuilt release] ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
    process.exit(0);
}

const failures = [];
verifyLifecycle(failures);
const sealedCount = verifyManifest(failures);
const runtimeCount = inspectRuntimeClosure(failures);

if (failures.length) {
    console.error(`[NexoWatt EOS prebuilt release] ${failures.length} failure(s):\n${failures.join('\n')}`);
    process.exit(1);
}
console.log(
    `[NexoWatt EOS prebuilt release] OK (${sealedCount} sealed source/runtime files; ${runtimeCount} backend runtime files; no tsc/tsx required for npm publish)`,
);
