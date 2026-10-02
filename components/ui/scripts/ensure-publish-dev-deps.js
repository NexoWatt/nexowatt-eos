#!/usr/bin/env node
'use strict';

/**
 * Publish-Umgebungsprüfung.
 *
 * Der Release-Check darf keine Abhängigkeiten nachinstallieren und keine Runtime-
 * Dateien verändern. Ein reproduzierbarer Publish beginnt immer mit `npm ci`.
 * Dieses Skript prüft deshalb ausschließlich, ob der lokal installierte
 * TypeScript-Compiler exakt der in package.json festgelegten Version entspricht.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const expected = String(pkg.devDependencies && pkg.devDependencies.typescript || '').trim();
const localPackage = path.join(root, 'node_modules', 'typescript', 'package.json');

function fail(message) {
  console.error(`[publish-dev-deps] ERROR: ${message}`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(expected)) {
  fail(`TypeScript muss in devDependencies exakt gepinnt sein; gefunden: "${expected || 'fehlt'}".`);
}

if (!fs.existsSync(localPackage)) {
  fail('Lokaler TypeScript-Compiler fehlt. Bitte im sauberen Projektordner zuerst `npm ci` ausführen.');
}

let installed;
try {
  installed = String(JSON.parse(fs.readFileSync(localPackage, 'utf8')).version || '').trim();
} catch (error) {
  fail(`Lokale TypeScript-Installation ist nicht lesbar: ${error && error.message ? error.message : error}`);
}

if (installed !== expected) {
  fail(`Falsche TypeScript-Version installiert: erwartet ${expected}, gefunden ${installed}. ` +
    'Bitte node_modules löschen und anschließend `npm ci` ausführen.');
}

console.log(`[publish-dev-deps] OK: lokaler TypeScript-Compiler ${installed} entspricht dem exakten Release-Pin.`);
