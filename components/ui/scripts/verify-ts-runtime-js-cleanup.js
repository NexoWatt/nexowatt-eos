#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-runtime-js-cleanup.js
 *
 * Zweck:
 * Prüft den letzten JS-Aufräumschritt der TypeScript-Umstellung: Entfernte Legacy-
 * Doppelbäume dürfen nicht wieder auftauchen, und ausgelieferte Runtime-JS-Dateien
 * müssen weiterhin klar als aus TypeScript erzeugte Artefakte markiert sein.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let failed = false;

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function fail(message) {
  console.error('[runtime-js-cleanup] ERROR: ' + message);
  failed = true;
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assertAbsent(rel, reason) {
  if (exists(rel)) fail(`${rel} ist wieder vorhanden (${reason}).`);
}

function assertGeneratedRuntime(rel) {
  if (!exists(rel)) {
    fail(`Runtime-Artefakt fehlt: ${rel}`);
    return;
  }
  const text = read(rel);
  if (!text.includes('AUTO-GENERATED RUNTIME FILE')) fail(`${rel} ist nicht als generiertes Runtime-Artefakt markiert.`);
  if (!text.includes('Quelle: src-ts/runtime-executables/')) fail(`${rel} enthält keinen src-ts/runtime-executables-Quellhinweis.`);
  if (!text.includes('Quell-Hash: sha256:')) fail(`${rel} enthält keinen Quell-Hash.`);
}

function checkNoRuntimeRequiresRetiredTree() {
  const scanRoots = ['main.js', 'ems', 'www', 'lib'];
  for (const item of scanRoots) {
    const abs = path.join(root, item);
    const files = fs.statSync(abs).isDirectory() ? walk(abs) : [abs];
    for (const file of files) {
      if (!/\.(js|json|html|ts|tsx)$/.test(file)) continue;
      const rel = toPosix(path.relative(root, file));
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes("require('./.nwcore") || text.includes("require('../.nwcore") || text.includes('.nwcore/')) {
        fail(`${rel} referenziert den entfernten .nwcore-Baum.`);
      }
    }
  }
}

function checkAdminReactBundles() {
  const indexRel = 'admin/react/index.html';
  const assetsRel = 'admin/react/assets';
  if (!exists(indexRel) || !exists(assetsRel)) return;
  const index = read(indexRel);
  const jsFiles = fs.readdirSync(path.join(root, assetsRel)).filter((name) => name.endsWith('.js'));
  const referenced = jsFiles.filter((name) => index.includes('assets/' + name) || index.includes(name));
  const stale = jsFiles.filter((name) => !referenced.includes(name));
  if (referenced.length !== 1) fail(`admin/react/index.html sollte genau ein JS-Bundle referenzieren, gefunden: ${referenced.length}.`);
  for (const name of stale) fail(`Unbenutztes Admin-React-Bundle vorhanden: ${assetsRel}/${name}`);
}

function main() {
  assertAbsent('.nwcore', 'retired Legacy-JS-Doppelbaum; Paket nutzt ems/**');
  assertAbsent('src-ts/runtime-executables/nwcore', 'retired kanonische Quelle für .nwcore-Doppelbaum');
  assertAbsent('src-ts/runtime-mirrors/nwcore', 'retired TS-Spiegel für .nwcore-Doppelbaum');

  assertGeneratedRuntime('main.js');
  assertGeneratedRuntime('ems/engine.js');
  assertGeneratedRuntime('ems/modules/charging-management.js');
  assertGeneratedRuntime('www/app.js');
  assertGeneratedRuntime('www/ems-apps.js');
  assertGeneratedRuntime('www/sw.js');

  checkNoRuntimeRequiresRetiredTree();
  checkAdminReactBundles();

  if (failed) process.exit(1);
  console.log('[runtime-js-cleanup] OK: Legacy-JS-Doppelbäume entfernt, Runtime-JS bleibt generiertes TypeScript-Artefakt.');
}

main();
