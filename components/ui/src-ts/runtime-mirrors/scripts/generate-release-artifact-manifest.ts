// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/generate-release-artifact-manifest.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/generate-release-artifact-manifest.js
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
 * Original-Hash: 3a0a72e1c4851b697453746cb5ff5cade165178c62e6ab5c024fac79cceae9d9
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

/**
 * Generates the immutable npm artifact contract exclusively from
 * `package.json.files`.
 *
 * Repository-only files such as release reports, tsconfig files, .npmignore,
 * build output or local tooling may exist in the repo ZIP, but can never leak
 * into the npm manifest unless they are explicitly listed in package.json.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const ioPath = path.join(root, 'io-package.json');
const targetPath = path.join(root, 'scripts', 'release-artifact-manifest.json');

/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(message) {
  console.error(`[release-manifest] ERROR: ${message}`);
  process.exit(1);
}
/**
 * Code-Teil: normalize
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}
/**
 * Code-Teil: sha256
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

let pkg;
let ioPackage;
try {
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  ioPackage = JSON.parse(fs.readFileSync(ioPath, 'utf8'));
} catch (error) {
  fail(`Paketmetadaten nicht lesbar: ${error && error.message ? error.message : error}`);
}

if (pkg.name !== 'iobroker.nexowatt-ui') fail(`Unerwarteter Paketname: ${pkg.name || '<leer>'}`);
if (!pkg.version || pkg.version !== ioPackage.common?.version) {
  fail(`Versionskonflikt: package.json=${pkg.version || '<leer>'}, io-package.json=${ioPackage.common?.version || '<leer>'}`);
}
if (!Array.isArray(pkg.files) || pkg.files.length === 0) fail('package.json files ist leer.');

const normalized = pkg.files.map(normalize);
if (new Set(normalized).size !== normalized.length) fail('package.json files enthält doppelte Pfade.');

const files = normalized.map((relativePath) => {
  const absolutePath = path.join(root, relativePath);
  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch (_error) {
    fail(`Paketdatei fehlt: ${relativePath}`);
  }
  if (!stat.isFile()) fail(`Paketpfad ist keine Datei: ${relativePath}`);
  const data = fs.readFileSync(absolutePath);
  return { path: relativePath, size: data.length, sha256: sha256(data) };
});

const manifest = {
  schema: 'nexowatt.release-artifact.v1',
  package: pkg.name,
  version: pkg.version,
  files,
};
fs.writeFileSync(targetPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[release-manifest] OK: ${pkg.name}@${pkg.version}, ${files.length} Paketdateien.`);
