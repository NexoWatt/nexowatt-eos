#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const bad = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','build-ts','.git'].includes(e.name)) continue;
    const abs = path.join(dir, e.name);
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (e.isDirectory()) walk(abs);
    else if (/\.(zip|tgz)$/i.test(e.name)) bad.push(rel);
  }
}
walk(root);
if (bad.length) {
  console.error('[no-release-artifacts] Release-Artefakte dürfen nicht im Repository/Paketbaum liegen:');
  for (const rel of bad) console.error(' - ' + rel);
  process.exit(1);
}
console.log('[no-release-artifacts] OK: Keine ZIP/TGZ-Artefakte im Paketbaum.');
