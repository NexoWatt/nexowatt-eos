#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fail = message => {
    console.error(`[NexoWatt EOS merge update selftest] ${message}`);
    process.exit(1);
};
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));

for (const file of [
    'MERGE_UPDATE.ps1',
    'MERGE_UPDATE.cmd',
    'MERGE_UPDATE.sh',
    'MERGE_UPDATE_README_V7.10.7.md',
    'tools/nexowatt-apply-ems-overview.cjs',
    'tools/nexowatt-sync-release-version.cjs',
    'tools/nexowatt-version-sync-selftest.cjs',
]) {
    if (!exists(file)) fail(`${file} is missing`);
}

const ps = read('MERGE_UPDATE.ps1');
for (const marker of [
    '$PSScriptRoot',
    'nexowatt-apply-ems-overview.cjs',
    'nexowatt-sync-release-version.cjs',
    'npm run clean:eos-runtime',
    'npm run check:eos-package',
    'npm run check:eos-stability',
    'npm pack --dry-run',
]) {
    if (!ps.includes(marker)) fail(`MERGE_UPDATE.ps1 is missing ${marker}`);
}
if (/npm\s+publish/i.test(ps)) fail('MERGE_UPDATE.ps1 must never publish automatically');

const cmd = read('MERGE_UPDATE.cmd');
if (!cmd.includes('MERGE_UPDATE.ps1') || !/ExecutionPolicy\s+Bypass/i.test(cmd)) {
    fail('MERGE_UPDATE.cmd does not start the guarded PowerShell verifier');
}

const sh = read('MERGE_UPDATE.sh');
for (const marker of [
    'set -euo pipefail',
    'nexowatt-apply-ems-overview.cjs',
    'npm run sync:eos-version',
    'npm run clean:eos-runtime',
    'npm run check:eos-package',
    'npm run check:eos-stability',
    'npm pack --dry-run',
]) {
    if (!sh.includes(marker)) fail(`MERGE_UPDATE.sh is missing ${marker}`);
}
if (/npm\s+publish/i.test(sh)) fail('MERGE_UPDATE.sh must never publish automatically');

const pkg = JSON.parse(read('package.json'));
if (pkg.scripts['sync:eos-version'] !== 'node tools/nexowatt-sync-release-version.cjs') {
    fail('sync:eos-version script is not canonical');
}
if (!pkg.scripts['precheck:eos-package']?.startsWith('npm run sync:eos-version')) {
    fail('package validation does not self-heal stale merged version files');
}
if (!pkg.scripts.prepublishOnly?.startsWith('npm run sync:eos-version')) {
    fail('npm publishing does not self-heal stale merged version files');
}
if (/\b(?:tsc|tsx)\b|build:(?:backend|frontend)|\bnpx\b|npm\s+(?:i|install|ci)\b/i.test(pkg.scripts.prepublishOnly || '')) {
    fail('npm publishing must not require local development dependencies');
}
if (!pkg.scripts.prepack?.includes('nexowatt-prebuilt-release-selftest.cjs')) {
    fail('npm packaging does not verify the sealed prebuilt release');
}

console.log('[NexoWatt EOS merge update selftest] OK (flat overwrite + EMS merge + version repair + guarded verification)');
