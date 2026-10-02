#!/usr/bin/env node
'use strict';
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
const files = [
  'src-ts/runtime-executables/ems/modules/mesh-microgrid.ts',
  'src-ts/runtime-executables/ems/module-manager.ts',
  'src-ts/runtime-executables/www/ems-apps.ts',
  'src-ts/runtime-executables/main.ts',
  'src-ts/runtime-executables/ems/services/feature-flags.ts',
];
for (const f of files) {
  if (!fs.existsSync(f)) throw new Error(`Missing ${f}`);
}
const mod = read(files[0]);
const mm = read(files[1]);
const ui = read(files[2]);
const main = read(files[3]);
const flags = read(files[4]);
const must = [
  ['module export', mod.includes('MeshMicrogridModule') && mod.includes('module.exports')],
  ['read-only comment', /read-only/i.test(mod) && mod.includes('keine Hardware')],
  ['own states namespace', mod.includes('meshMicrogrid.')],
  ['module-manager registration', mm.includes("key: 'meshMicrogrid'") && mm.includes('enableMeshMicrogrid')],
  ['app catalog', ui.includes("id: 'meshMicrogrid'") && ui.includes('EOS Mesh/Microgrid')],
  ['installer config save', ui.includes('patch.meshMicrogrid') && ui.includes('[data-mesh-node-row]')],
  ['main normalize app', main.includes("id: 'meshMicrogrid'") && main.includes('enableMeshMicrogrid')],
  ['feature flag', flags.includes("meshMicrogrid: 'meshMicrogrid'") && flags.includes("'meshMicrogrid'")],
];
let ok = true;
for (const [name, pass] of must) {
  if (!pass) { console.error(`FAIL mesh-microgrid: ${name}`); ok = false; }
}
if (!ok) process.exit(1);
console.log('OK mesh-microgrid: separate EOS app, TS source, read-only data model and installer wiring present.');
