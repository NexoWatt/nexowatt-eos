#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const entry = path.join(root, 'build', 'main.js');
const packageFile = path.join(root, 'package.json');
const failures = [];
const visited = new Set();
const runtimeFiles = new Set();

function fail(message) {
    failures.push(message);
}

function normalize(relative) {
    return String(relative).replace(/\\/g, '/').replace(/^\.\//, '');
}

function resolveLocal(fromFile, specifier) {
    const base = path.resolve(path.dirname(fromFile), specifier);
    const candidates = [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')];
    if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
        const packageJsonFile = path.join(base, 'package.json');
        if (fs.existsSync(packageJsonFile)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, 'utf8'));
                if (packageJson.main) candidates.unshift(path.resolve(base, packageJson.main));
            } catch (error) {
                fail(`${normalize(path.relative(root, packageJsonFile))} is invalid JSON: ${error.message}`);
            }
        }
    }
    return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

function inspect(file) {
    const absolute = path.resolve(file);
    if (visited.has(absolute)) return;
    visited.add(absolute);
    runtimeFiles.add(absolute);

    if (!fs.existsSync(absolute)) {
        fail(`missing runtime file ${normalize(path.relative(root, absolute))}`);
        return;
    }
    if (!absolute.endsWith('.js')) return;

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
                fail(`${normalize(path.relative(root, absolute))} -> ${specifier} cannot be resolved`);
                continue;
            }
            inspect(target);
        }
    }
}

function packageRules() {
    if (!fs.existsSync(packageFile)) {
        fail('package.json is missing');
        return [];
    }
    try {
        const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
        if (!Array.isArray(pkg.files) || pkg.files.length === 0) {
            fail('package.json files whitelist is missing');
            return [];
        }
        return pkg.files
            .map(rule => normalize(rule).replace(/\/+$/, ''))
            .filter(Boolean);
    } catch (error) {
        fail(`package.json is invalid JSON: ${error.message}`);
        return [];
    }
}

function isDeclaredForPackage(relative, rules) {
    const value = normalize(relative);
    return rules.some(rule => value === rule || value.startsWith(`${rule}/`));
}

if (!fs.existsSync(entry)) fail('build/main.js is missing');
else inspect(entry);

for (const file of runtimeFiles) {
    if (!file.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', file], {
        encoding: 'utf8',
        windowsHide: true,
    });
    if (result.error) {
        fail(`${normalize(path.relative(root, file))} syntax check could not start: ${result.error.message}`);
    } else if (result.status !== 0) {
        fail(`${normalize(path.relative(root, file))} does not parse: ${(result.stderr || result.stdout || '').trim()}`);
    }
}

// Do not start a nested `npm pack` process here. This self-test runs from
// prepublishOnly, and spawning npm.cmd from a Node child process is unreliable
// on Windows and can also re-enter npm lifecycle hooks. The final npm artifact
// is still verified externally by `npm publish --dry-run`; this check proves
// that every reachable local backend dependency is covered by package.json's
// explicit files whitelist without requiring npm, tsc, tsx or node_modules.
const rules = packageRules();
for (const file of runtimeFiles) {
    const relative = normalize(path.relative(root, file));
    if (!isDeclaredForPackage(relative, rules)) {
        fail(`runtime dependency is not declared for the npm package: ${relative}`);
    }
}

for (const required of [
    'build/main.js',
    'build/lib/web.js',
    'build/lib/eosAutoUpdate.js',
    'build/lib/eosRequestSecurity.js',
]) {
    if (!runtimeFiles.has(path.join(root, required))) {
        fail(`entrypoint closure does not include required module ${required}`);
    }
}

if (failures.length) {
    console.error(`[NexoWatt EOS backend runtime] ${failures.length} failure(s):\n${failures.join('\n')}`);
    process.exit(1);
}

console.log(
    `[NexoWatt EOS backend runtime] OK (${runtimeFiles.size} local runtime files resolve, parse and are declared by the npm files whitelist; dependency-free on Windows)`,
);
