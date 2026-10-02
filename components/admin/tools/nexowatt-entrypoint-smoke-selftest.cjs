#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const adminRoot = path.join(root, 'adminWww');
const indexPath = path.join(adminRoot, 'index.html');
const info = JSON.parse(fs.readFileSync(path.join(root, 'NEXOWATT_EOS_BUILD_INFO.json'), 'utf8'));
const runtime = String(info.runtimeEntry || '');
const runtimeNo = Number(runtime.replace(/^v/, ''));
const failures = [];

const fail = message => failures.push(message);
const read = file => fs.readFileSync(file, 'utf8');
const exists = rel => fs.existsSync(path.join(adminRoot, rel));

if (!runtime || !Number.isFinite(runtimeNo)) fail(`invalid runtimeEntry ${runtime}`);
if (!fs.existsSync(indexPath)) fail('adminWww/index.html is missing');

const html = fs.existsSync(indexPath) ? read(indexPath) : '';
const scriptRefs = [...html.matchAll(/<script\b([^>]*)\bsrc=["']\.\/([^"'?#]+)(?:\?[^"']*)?["'][^>]*>/gi)]
  .map(match => ({ attrs: match[1], file: match[2], module: /\btype=["']module["']/i.test(match[1]) }));
const styleRefs = [...html.matchAll(/<link\b[^>]*\bhref=["']\.\/([^"'?#]+)(?:\?[^"']*)?["'][^>]*>/gi)].map(match => match[1]);
const roleBootstrapMatch = html.match(/<script\b[^>]*\bsrc=["']\.\/js\/eos-role-bootstrap\.js(?:\?[^"']*)?["'][^>]*\bdata-eos-entry=["']\.\/([^"']+)["'][^>]*>/i);
const dynamicEntryRef = roleBootstrapMatch ? roleBootstrapMatch[1].split('?')[0] : '';

for (const { file } of scriptRefs) if (!exists(file)) fail(`index references missing script ${file}`);
for (const file of styleRefs) if (!exists(file)) fail(`index references missing stylesheet/resource ${file}`);
if (!roleBootstrapMatch) fail('role bootstrap does not declare data-eos-entry');
if (dynamicEntryRef && !exists(dynamicEntryRef)) fail(`role bootstrap references missing application entry ${dynamicEntryRef}`);
if (dynamicEntryRef !== `assets/index-CQZugZ1z-${runtime}.js`) {
  fail(`role bootstrap application entry must be assets/index-CQZugZ1z-${runtime}.js, got ${dynamicEntryRef || 'none'}`);
}

const requiredOrder = [
  `js/eos-manual-write-policy.js`,
  `assets/hostInit-${runtime}.js`,
  `js/eos-role-bootstrap.js`,
  `js/eos-policy-client.js`,
  `js/nexowatt-native-shell.js`,
  `js/eos-native-security.js`,
  `js/eos-basic-settings.js`,
  `js/eos-role-ui.js`,
  `js/eos-auto-update.js`,
];
let last = -1;
for (const file of requiredOrder) {
  const pos = scriptRefs.findIndex(entry => entry.file === file);
  if (pos < 0) fail(`index does not load required entry ${file}`);
  else if (pos <= last) fail(`entrypoint order is invalid at ${file}`);
  last = Math.max(last, pos);
}

for (const { file, module } of scriptRefs) {
  if (/-v\d+\.js$/i.test(file)) {
    const version = Number((file.match(/-v(\d+)\.js$/i) || [])[1]);
    if (version !== runtimeNo) fail(`index references stale runtime file ${file}`);
  }
  if (module && !file.endsWith('.js')) fail(`module script is not JavaScript: ${file}`);
}

const mfPath = path.join(adminRoot, 'mf-manifest.json');
if (!fs.existsSync(mfPath)) fail('mf-manifest.json is missing');
else {
  const mf = read(mfPath);
  if (!mf.includes(`remoteEntry-${runtime}.js`)) fail(`mf-manifest does not reference remoteEntry-${runtime}.js`);
  if (!mf.includes(`index-D2ymscJA-${runtime}.js`)) fail(`mf-manifest does not reference index-D2ymscJA-${runtime}.js`);
  const stale = [...mf.matchAll(/-v(\d+)\.js/g)].map(m => Number(m[1])).filter(v => v !== runtimeNo);
  if (stale.length) fail(`mf-manifest contains stale runtime versions: ${[...new Set(stale)].join(', ')}`);
}

const bootstrapPath = path.join(adminRoot, 'assets', `bootstrap-COulQZax-${runtime}.js`);
if (!fs.existsSync(bootstrapPath)) fail(`active bootstrap is missing: ${path.basename(bootstrapPath)}`);
else {
  const bootstrap = read(bootstrapPath);
  if (/},\s*const\s+NEXOWATT_NATIVE_SHELL_VERSION/.test(bootstrap)) fail('active bootstrap contains invalid ",const" statement boundary');
  if (!bootstrap.includes('NEXOWATT_NATIVE_SHELL_VERSION')) fail('active bootstrap lacks native-shell marker');
}

// Parse the exact browser entry modules as ES modules. This is deliberately
// separate from the all-assets syntax check so the startup chain is explicit.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-entrypoint-smoke-'));
try {
  const entriesToParse = [...scriptRefs];
  if (dynamicEntryRef) entriesToParse.push({ file: dynamicEntryRef, module: true });
  for (const { file, module } of entriesToParse) {
    const source = path.join(adminRoot, file);
    if (!fs.existsSync(source) || !file.endsWith('.js')) continue;
    const target = path.join(temp, `${path.basename(file)}.${module ? 'mjs' : 'cjs'}`);
    fs.copyFileSync(source, target);
    const checked = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    if (checked.status !== 0) fail(`entry script does not parse (${file}): ${(checked.stderr || checked.stdout || '').trim()}`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`[NexoWatt EOS entrypoint smoke] ${failures.length} failure(s):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`[NexoWatt EOS entrypoint smoke] OK (${scriptRefs.length} scripts + role-bootstrapped app entry, runtime ${runtime})`);
