#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const adminRoot = path.join(root, 'adminWww');
const assetsDir = path.join(adminRoot, 'assets');
const info = JSON.parse(fs.readFileSync(path.join(root, 'NEXOWATT_EOS_BUILD_INFO.json'), 'utf8'));
const runtime = info.runtimeEntry;
const runtimeNo = Number(String(runtime).replace(/^v/, ''));
const failures = [];

const importPatterns = [
  /\bimport\s*["'](\.[^"']+)["']/g,
  /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
  /\bfrom\s*["'](\.[^"']+)["']/g,
  /\bexport\s+(?:\*|\{[^}]*\})\s+from\s*["'](\.[^"']+)["']/g,
];

function resolveReference(file, specifier) {
  let target = path.resolve(path.dirname(file), specifier);
  if (!path.extname(target)) target += '.js';
  return target;
}

function inspectModule(file) {
  const text = fs.readFileSync(file, 'utf8');
  const refs = new Set();
  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) refs.add(match[1]);
  }

  // Vite preload dependency arrays are real network dependencies even though
  // they are not normal import declarations.
  const mapPattern = /m\.f\|\|\(m\.f=\[([\s\S]*?)\]\)/g;
  let map;
  while ((map = mapPattern.exec(text))) {
    const quoted = /["'](\.{1,2}\/[^"']+)["']/g;
    let match;
    while ((match = quoted.exec(map[1]))) refs.add(match[1]);
  }

  for (const specifier of refs) {
    const target = resolveReference(file, specifier);
    if (!fs.existsSync(target)) {
      failures.push(`${path.relative(adminRoot, file)} -> ${specifier}`);
    }
    const version = specifier.match(/-v(\d+)\.js(?:$|[?#])/i);
    if (version && Number(version[1]) !== runtimeNo) {
      failures.push(`${path.relative(adminRoot, file)} references stale runtime ${specifier}`);
    }
  }
}

for (const name of fs.readdirSync(assetsDir).filter(name => name.endsWith('.js'))) {
  inspectModule(path.join(assetsDir, name));
}
for (const name of fs.readdirSync(adminRoot).filter(name => /^remoteEntry(?:-v\d+)?\.js$/.test(name))) {
  inspectModule(path.join(adminRoot, name));
}

const compatibility = {
  'assets/bootstrap-COulQZax.js': `bootstrap-COulQZax-${runtime}.js`,
  'assets/index-D2ymscJA.js': `index-D2ymscJA-${runtime}.js`,
  'assets/index-CQZugZ1z.js': `index-CQZugZ1z-${runtime}.js`,
  'assets/Objects-DPan0bzw.js': `Objects-DPan0bzw-${runtime}.js`,
  'assets/hostInit-OBG53iVO.js': `hostInit-${runtime}.js`,
  'remoteEntry.js': `remoteEntry-${runtime}.js`,
};
for (const [rel, expected] of Object.entries(compatibility)) {
  const file = path.join(adminRoot, rel);
  if (!fs.existsSync(file)) failures.push(`missing compatibility entry ${rel}`);
  else if (!fs.readFileSync(file, 'utf8').includes(expected)) failures.push(`${rel} does not point to ${expected}`);
}

if (failures.length) {
  console.error(`[NexoWatt EOS import integrity] ${failures.length} failure(s):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('[NexoWatt EOS import integrity] OK');
