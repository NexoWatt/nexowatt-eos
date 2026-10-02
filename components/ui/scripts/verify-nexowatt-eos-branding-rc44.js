#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, predicate, out);
    else if (entry.isFile() && predicate(abs)) out.push(abs);
  }
  return out;
}

const staticFiles = [
  ...walk(path.join(root, 'www'), (p) => /\.(html|json|webmanifest)$/.test(p)),
  ...walk(path.join(root, 'admin'), (p) => /\.(html|json)$/.test(p)),
];
const visibleLegacy = /io\s*broker|NexoWatt UI|NexoWatt EMS|NexoWatt SmartHome|NexoWatt EVCS|NexoWatt\s+[–-]\s+/i;
const failures = [];
for (const abs of staticFiles) {
  const rel = path.relative(root, abs).replace(/\\/g, '/');
  const text = fs.readFileSync(abs, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  if (visibleLegacy.test(text)) failures.push(rel);
}
assert.deepStrictEqual(failures, [], `legacy visible branding remains in: ${failures.join(', ')}`);

const ioPackage = JSON.parse(fs.readFileSync(path.join(root, 'io-package.json'), 'utf8'));
const webManifest = JSON.parse(fs.readFileSync(path.join(root, 'www/manifest.webmanifest'), 'utf8'));
assert.strictEqual(ioPackage.common.title, 'NexoWatt EOS');
assert.strictEqual(webManifest.name, 'NexoWatt EOS');
assert.strictEqual(webManifest.short_name, 'NexoWatt EOS');

const main = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
assert.doesNotMatch(main, /starten Sie den ioBroker-Adapter neu/i);
assert.doesNotMatch(main, /downstream ioBroker adapter/i);

console.log('[nexowatt-eos-branding-rc44] OK: customer-visible branding uses NexoWatt EOS; platform package identifiers remain technical only.');
