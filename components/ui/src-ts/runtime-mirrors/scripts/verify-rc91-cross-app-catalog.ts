// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-rc91-cross-app-catalog.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-rc91-cross-app-catalog.js
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
 * Original-Hash: 21efeddbb791637e459645ee3ec77ee789c9f1347806f4cb36da6b2d2da4b4bc
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
 * RC91-Cross-App-Katalogregression.
 *
 * Der AppCenter führt drei Darstellungen des App-Katalogs:
 * 1. den sichtbaren Browser-Katalog,
 * 2. den Normalisierungskatalog beim Adapterstart und
 * 3. den Installer-HTTP-Roundtrip-Katalog.
 *
 * Fehlt eine ID in einem Backend-Katalog, kann ein späterer Speichervorgang den
 * Installiert-/Aktiv-Zustand stillschweigend entfernen. Der Test prüft deshalb
 * Kataloggleichheit und den Erhalt absichtlich verborgener Apps wie chargeKiosk.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

/**
 * Code-Teil: sliceBetween
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function sliceBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: Startmarker fehlt`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label}: Endmarker fehlt`);
  return source.slice(start, end);
}

/**
 * Code-Teil: idsFromCatalog
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function idsFromCatalog(block, label) {
  const ids = [...block.matchAll(/\{\s*id:\s*'([^']+)'/g)].map((match) => match[1]);
  assert.ok(ids.length > 0, `${label}: keine App-IDs gefunden`);
  assert.equal(new Set(ids).size, ids.length, `${label}: doppelte App-ID gefunden`);
  return ids;
}

const mainTs = read('src-ts/runtime-executables/main.ts');
const appTs = read('src-ts/runtime-executables/www/ems-apps.ts');
const ioPackage = read('io-package.json');

const visibleBlock = sliceBetween(appTs, 'const APP_CATALOG = [', '\n  ];', 'Browserkatalog');
const classMethod = sliceBetween(mainTs, 'nwNormalizeEmsApps(nativeObj)', '\n  nwApplyEmsAppsToLegacyFlags(nativeObj)', 'Adapter-Normalisierung');
const classBlock = sliceBetween(classMethod, 'const CATALOG = [', '\n    ];', 'Adapterkatalog');
const httpBlock = sliceBetween(mainTs, 'const _nwAppCatalog = [', '\n    ];', 'HTTP-Katalog');

const visibleIds = idsFromCatalog(visibleBlock, 'Browserkatalog');
const classIds = idsFromCatalog(classBlock, 'Adapterkatalog');
const httpIds = idsFromCatalog(httpBlock, 'HTTP-Katalog');

for (const id of visibleIds) {
  assert.ok(classIds.includes(id), `Sichtbare App ${id} fehlt in der Adapter-Normalisierung`);
  assert.ok(httpIds.includes(id), `Sichtbare App ${id} fehlt im Installer-HTTP-Roundtrip`);
}

// chargeKiosk wird absichtlich im Reiter Ladepunkte konfiguriert. Beide Backend-Kataloge
// müssen den Zustand trotzdem erhalten, obwohl keine zusätzliche Apps-Karte sichtbar ist.
assert.equal(visibleIds.includes('chargeKiosk'), false, 'chargeKiosk darf nicht doppelt als Apps-Karte erscheinen');
assert.ok(classIds.includes('chargeKiosk'), 'chargeKiosk fehlt in der Adapter-Normalisierung');
assert.ok(httpIds.includes('chargeKiosk'), 'chargeKiosk fehlt im HTTP-Roundtrip');
assert.match(httpBlock, /id:\s*'chargeKiosk'[\s\S]*?hidden:\s*true/, 'chargeKiosk muss als absichtlich verborgen dokumentiert sein');

for (const id of ['energyLedger', 'meshMicrogrid']) {
  assert.ok(visibleIds.includes(id), `${id} muss im AppCenter sichtbar sein`);
  assert.ok(classIds.includes(id), `${id} muss beim Adapterstart erhalten bleiben`);
  assert.ok(httpIds.includes(id), `${id} muss einen Installer-Save überleben`);
}

assert.match(classBlock, /id:\s*'energyLedger',\s*enableFlag:\s*'enableEnergyLedger'/, 'Energy Ledger braucht den Legacy-Kompatibilitätsflag');
assert.match(httpBlock, /id:\s*'energyLedger'[\s\S]*?enableFlag:\s*'enableEnergyLedger'/, 'HTTP-Normalisierung braucht den Energy-Ledger-Flag');
assert.match(ioPackage, /\"enableEnergyLedger\":\s*false/, 'io-package native braucht einen expliziten Energy-Ledger-Default');
assert.match(mainTs, /enableEnergyLedger:\s*\(typeof n\.enableEnergyLedger === 'boolean'\)/, 'Installer-GET muss enableEnergyLedger liefern');
assert.match(mainTs, /energyLedger:\s*\(n\.energyLedger && typeof n\.energyLedger === 'object'\)/, 'Installer-GET muss energyLedger-Konfiguration liefern');
assert.equal((mainTs.match(/'enableEnergyLedger'/g) || []).length >= 5, true, 'Energy-Ledger-Flag fehlt in Save-/Backup-Allowlisten');
assert.equal((mainTs.match(/'aiAdvisor','energyWallet','energyLedger','chargeKiosk','meshMicrogrid'/g) || []).length, 2, 'Energy-Ledger-Konfiguration fehlt in Save oder Backup');

assert.match(mainTs, /\['energyLedger', 'energyLedger'\][\s\S]*?\['chargeKiosk', 'chargeKiosk'\][\s\S]*?\['meshMicrogrid', 'meshMicrogrid'\]/, 'Nested enabled-Synchronisierung für Cross-App-Module fehlt');
assert.match(appTs, /patch\.energyLedger\.enabled\s*=\s*!!\(ledgerAppState && ledgerAppState\.installed && ledgerAppState\.enabled\)/, 'Browser muss Energy Ledger aus dem App-Zustand speichern');

// main.ts ist eine textstabile Runtime-Quelle. TypeScript-only Assertions würden
// unverändert nach main.js kopiert und den Adapter bereits vor onReady() stoppen.
assert.equal(mainTs.includes('this as any'), false, 'main.ts darf keine TypeScript-only Assertion in der textstabilen Runtime enthalten');
const syntax = spawnSync(process.execPath, ['--check', path.join(root, 'main.js')], { encoding: 'utf8' });
assert.equal(syntax.status, 0, `main.js Syntaxfehler: ${syntax.stderr || syntax.stdout}`);

// Microgrid hat genau eine Betriebsfreigabe im AppCenter; kein zweiter Detail-Schalter.
assert.match(appTs, /patch\.meshMicrogrid\.enabled\s*=\s*!!\(meshAppState && meshAppState\.installed && meshAppState\.enabled\)/, 'Mesh-Aktivzustand muss ausschließlich dem AppCenter folgen');
assert.doesNotMatch(appTs, /patch\.meshMicrogrid\.enabled\s*=\s*meshEnabledEl/, 'Legacy-Detailfeld darf den App-Schalter nicht übersteuern');

console.log(`[rc91-cross-app-catalog] OK: ${visibleIds.length} sichtbare Apps und ${classIds.length} Backend-Apps bleiben über Start, Save und Backup konsistent.`);
