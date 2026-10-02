// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-nexowatt-eos-branding-rc44.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-nexowatt-eos-branding-rc44.js
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
 * Original-Hash: 74989c529c00220ac16b360e360afbb37b389a66a547ce2439f352c9b05b4501
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

/**
 * Code-Teil: walk
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
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
