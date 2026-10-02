// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-publish.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-publish.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 8ee36c3d6bed65207d0adb8fddde7723c1b7c414fa8637fedc1c3fb7bf3c3104
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: scripts/verify-publish.js
 * Rolle im Projekt: Build-/Wartungsskript.
 * Zweck: Hilfsskript für Versionierung, Publish-Prüfung, Hooks oder Sicherheit im Releaseprozess.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Wartungs-/Release-Skript für Versionierung, Prüfung oder Sicherheits-/Publish-Aufgaben.
 * Zusammenhänge:
 * - Wird über npm scripts oder Release-Prozess aufgerufen.
 * - Prüft bzw. verändert Metadaten, aber keine EMS-Laufzeitlogik.
 * Wartungshinweise:
 * - Skripte müssen auf Windows und Linux robust laufen.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { collectPublishRuleErrors } = require('./publish-check-rules');

const root = path.resolve(__dirname, '..');
const conflictRe = /^(<<<<<<<|=======|>>>>>>>)(\s|$)/;
const skipDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'build-ts', '.cache', '.nwcore']);
const skipExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.zip', '.tgz', '.gz', '.br', '.pdf', '.woff', '.woff2', '.ttf', '.eot', '.map']);
/**
 * Code-Teil: fail
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function fail(msg) {
  console.error(`[publish-check] ERROR: ${msg}`);
  process.exitCode = 1;
}
/**
 * Code-Teil: warn
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function warn(msg) {
  console.warn(`[publish-check] WARN: ${msg}`);
}
/**
 * Code-Teil: readJson
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function readJson(rel) {
  const file = path.join(root, rel);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    fail(`${rel} ist kein gültiges JSON: ${err.message}`);
    return null;
  }
}
/**
 * Code-Teil: walk
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const ent of entries) {
    if (skipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.isFile()) out.push(full);
  }
  return out;
}
/**
 * Code-Teil: hasNativeProtection
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function hasNativeProtection(io, key) {
  return Array.isArray(io && io[key]) && io[key].includes('licenseKey');
}
/**
 * Code-Teil: ensureScriptSyntax
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Build-/Prüfskript; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function ensureScriptSyntax(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return;
  const res = require('./check-javascript-syntax.cjs').checkJavaScriptSyntax(full);
  if (res.status !== 0) {
    const stderr = String(res.stderr || res.error || '');
    fail(`Syntaxfehler in ${rel}: ${stderr.trim().split('\n').slice(0, 4).join(' ')}`);
  }
}

console.log('[publish-check] Checking package metadata...');
const pkg = readJson('package.json');
const io = readJson('io-package.json');
const manifest = readJson('www/manifest.webmanifest');

if (pkg && io) {
  const common = io.common || {};
  const pkgVer = String(pkg.version || '');
  const ioVer = String(common.version || io.version || '');

  if (!pkgVer) fail('package.json enthält keine version.');
  if (!ioVer) fail('io-package.json enthält keine common.version.');
  if (pkgVer && ioVer && pkgVer !== ioVer) fail(`Versionskonflikt: package.json=${pkgVer}, io-package.json=${ioVer}`);
  if (manifest && String(manifest.version || '') !== pkgVer) fail(`Versionskonflikt: manifest.webmanifest=${manifest.version}, package.json=${pkgVer}`);

  /**
   * Code-Teil: typisierte Publish-Regeln auslagern.
   * Zweck: Erste reale JS→TS-Migration in den Wartungsskripten. Die Regeln
   *        liegen typisiert in `src-ts/scripts/publish-check-rules.ts` und als
   *        Node-kompatible Spiegeldatei in `scripts/publish-check-rules.js`.
   * Zusammenhang: `publish:check` bleibt ohne TypeScript-Build lauffähig, aber
   *        neue Prüfregeln werden bereits in TypeScript vorbereitet.
   */
  for (const err of collectPublishRuleErrors(pkg, io)) fail(err);

  if (common.compact !== true) warn('io-package.json common.compact ist nicht true.');

  // 0.7.51: licenseKey protection/encryption is intentionally not enforced here.
  // It caused an ioBroker/Admin regression where masked placeholders could be
  // returned to the custom license UI and overwrite valid existing keys.
  // Runtime save now rejects masked placeholders; native encryption can be
  // re-enabled later once the Admin flow has been fully verified end-to-end.
  if (hasNativeProtection(io, 'protectedNative')) warn('io-package.json protectedNative enthält licenseKey; bitte License-UI-Maskierung erneut komplett testen.');
  if (hasNativeProtection(io, 'encryptedNative')) warn('io-package.json encryptedNative enthält licenseKey; bitte Runtime-/Admin-Entschlüsselung erneut komplett testen.');
  if (!io.native || !Object.prototype.hasOwnProperty.call(io.native, 'ip')) fail('io-package.json native.ip fehlt.');

  const inst = Array.isArray(io.instanceObjects) ? io.instanceObjects : [];
  if (!inst.some(o => o && o._id === 'info.connection')) fail('io-package.json instanceObjects.info.connection fehlt.');

  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  if (/process\.exit\s*\(/.test(main)) fail('main.js darf process.exit() nicht verwenden; adapter.terminate()/Unload verwenden.');
}

console.log('[publish-check] Scanning selected files for conflict markers...');
const conflictCheckFiles = [
  'package.json',
  'package-lock.json',
  'io-package.json',
  'docs/README.md',
  'docs/CHANGELOG.md',
  'main.js',
  'www/app.js',
  'www/ems-apps.js',
  'www/history.js',
  'www/smarthome.js',
  'www/sw.js',
  'ems/modules/core-limits.js',
  'ems/modules/heating-rod-control.js',
  'ems/modules/ai-advisor.js',
  'scripts/verify-publish.js',
  'scripts/publish-check-rules.js',
  'scripts/build-ts-script-mirrors.js',
  'scripts/verify-ts-script-mirrors.js',
  'scripts/build-ts-frontend-mirrors.js',
  'scripts/verify-ts-frontend-mirrors.js',
  'tsconfig.scripts-mirror.json',
  'scripts/verify-ts-contracts.js',
  'scripts/verify-ts-scaffold.js',
  'scripts/verify-typescript-scaffold.js',
  'src-ts/contracts/index.ts',
  'src-ts/contracts/energy-flow.ts',
  'src-ts/contracts/testing.ts',
];
for (const rel of conflictCheckFiles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let txt = '';
  try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { continue; }
  const lines = txt.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (conflictRe.test(lines[i])) {
      fail(`ungelöster Git-Konfliktmarker in ${rel}:${i + 1}: ${lines[i].slice(0, 80)}`);
      break;
    }
  }
}

// Syntaxprüfung ausgewählter Laufzeit-/Wartungsdateien. CommonJS wird ohne
// Programmausführung in diesem Node-Prozess kompiliert; ESM/Fehler gehen an
// node --check. Der Paket-Smoke prüft zusätzlich sämtliche ausgelieferten JS-Dateien.
console.log('[publish-check] Checking selected JavaScript syntax...');
const syntaxCheckFiles = [
  'main.js',
  'www/app.js',
  'www/ems-apps.js',
  'www/history.js',
  'www/smarthome.js',
  'www/sw.js',
  'ems/modules/core-limits.js',
  'ems/modules/heating-rod-control.js',
  'ems/modules/ai-advisor.js',
  'scripts/verify-publish.js',
  'scripts/publish-check-rules.js',
  'scripts/build-ts-script-mirrors.js',
  'scripts/verify-ts-script-mirrors.js',
  'scripts/build-ts-frontend-mirrors.js',
  'scripts/verify-ts-frontend-mirrors.js',
  'scripts/verify-ts-contracts.js',
  'scripts/verify-ts-scaffold.js',
  'scripts/verify-typescript-scaffold.js',
  'scripts/clean-ts-build.js',
];
let checkedJs = 0;
for (const rel of syntaxCheckFiles) {
  ensureScriptSyntax(rel);
  checkedJs++;
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`[publish-check] JS syntax checked: ${checkedJs}`);
console.log('[publish-check] OK: JSON, ioBroker metadata, conflict markers and JS syntax look good.');
