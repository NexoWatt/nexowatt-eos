#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-script-mirrors.js
 *
 * Zweck:
 * Prüft die TS->JS-Spiegelstrategie für Wartungsskripte ohne selbst TypeScript
 * zu bauen. Dadurch kann dieser Check auch in schnellen Git-/ZIP-Prüfungen und
 * in `publish:check` laufen, ohne dass vorher `npm install` ausgeführt wurde.
 *
 * Zusammenhang:
 * - `src-ts/scripts/publish-check-rules.ts` ist die TypeScript-Quelle.
 * - `scripts/publish-check-rules.js` ist der generierte JavaScript-Spiegel.
 * - `scripts/verify-publish.js` nutzt den JS-Spiegel direkt.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRel = 'src-ts/scripts/publish-check-rules.ts';
const mirrorRel = 'scripts/publish-check-rules.js';
const sourcePath = path.join(root, sourceRel);
const mirrorPath = path.join(root, mirrorRel);

/**
 * Code-Teil: fail
 * Zweck: Bricht mit klarer Fehlermeldung ab, damit CI/Git sofort rot wird.
 */
function fail(message) {
  console.error(`[verify-ts-script-mirrors] ERROR: ${message}`);
  process.exit(1);
}

/**
 * Code-Teil: readRequired
 *
 * Zweck:
 * Liest eine Pflichtdatei. Wenn sie fehlt, ist die TS-Migrationsstruktur kaputt
 * und der Check muss fehlschlagen.
 */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: sourceHash
 *
 * Zweck:
 * Berechnet denselben Hash, den `scripts/build-ts-script-mirrors.js` in die
 * generierte JS-Spiegeldatei schreibt. So erkennen wir ohne TypeScript-Compiler,
 * ob die JS-Datei noch zur TypeScript-Quelle passt.
 */
function sourceHash() {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: requireContains
 * Zweck: Prüft wichtige Textanker, damit Buildvertrag und Kommentarstandard nicht verloren gehen.
 */
function requireContains(rel, needle) {
  const text = readRequired(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

/**
 * Code-Teil: verifyMirrorHash
 *
 * Zweck:
 * Vergleicht den Hash im generierten JS-Spiegel mit der aktuellen TypeScript-
 * Quelle. Wenn jemand die TS-Datei ändert und den Spiegel nicht neu baut, wird
 * das hier sofort sichtbar.
 */
function verifyMirrorHash() {
  const mirror = readRequired(mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${mirrorRel} enthält keinen Quell-Hash. Bitte npm run build:script-mirrors ausführen.`);
  const expected = sourceHash();
  const actual = String(match[1]).toLowerCase();
  if (actual !== expected) {
    fail(`${mirrorRel} ist nicht synchron zu ${sourceRel}. Erwartet ${expected}, gefunden ${actual}. Bitte npm run build:script-mirrors ausführen.`);
  }
}

/**
 * Code-Teil: verifyRuntimeExports
 *
 * Zweck:
 * Prüft, ob der JS-Spiegel weiterhin die API bereitstellt, die `verify-publish.js`
 * erwartet. Damit erkennen wir Generator-/Compilerfehler auch ohne kompletten
 * ioBroker-Start.
 */
function verifyRuntimeExports() {
  const mod = require(mirrorPath);
  if (!mod || typeof mod.collectPublishRuleErrors !== 'function') {
    fail(`${mirrorRel} exportiert collectPublishRuleErrors nicht.`);
  }
  const errors = mod.collectPublishRuleErrors(
    { name: 'iobroker.nexowatt-ui', version: '0.7.66', engines: { node: '>=22' } },
    { common: { name: 'nexowatt-ui', version: '0.7.66', type: 'energy', connectionType: 'local', dataSource: 'poll', authors: ['NexoWatt'], adminUI: { config: 'json' }, tier: 3, dependencies: [{}], globalDependencies: [{}], licenseInformation: {}, news: {} } }
  );
  if (!Array.isArray(errors)) fail('collectPublishRuleErrors muss ein Array zurückgeben.');
  if (errors.length) fail(`Beispielkonfiguration sollte fehlerfrei sein, lieferte aber: ${errors.join('; ')}`);
}

const pkg = JSON.parse(readRequired('package.json'));
requireContains('tsconfig.scripts-mirror.json', 'src-ts/scripts/publish-check-rules.ts');
requireContains('scripts/build-ts-script-mirrors.js', 'Code-Teil: buildMirrorText');
requireContains('scripts/build-ts-script-mirrors.js', 'Code-Teil: checkMirrorIsCurrent');
requireContains(mirrorRel, 'AUTO-GENERATED FILE');
requireContains(mirrorRel, 'Quell-Hash: sha256:');
requireContains(mirrorRel, 'exports.collectPublishRuleErrors');
requireContains(sourceRel, 'Code-Teil: collectPublishRuleErrors');

const scripts = pkg.scripts || {};
for (const name of ['sync:ts-scripts', 'check:ts-scripts', 'test:ts-script-mirrors']) {
  if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
}

verifyMirrorHash();
verifyRuntimeExports();

console.log('[verify-ts-script-mirrors] OK: TS->JS-Spiegelstrategie für Wartungsskripte ist synchron.');
