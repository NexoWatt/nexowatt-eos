// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-npm-registry-version.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-npm-registry-version.js
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
 * Original-Hash: 6aab608b5c400b461eb588db5c7ac5ea5db01466435212eeec892a3a76192cfb
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
 * NexoWatt Release Guard
 *
 * Zweck:
 *   Prüft nach `npm publish`, ob die Paketversion wirklich in der npm/private
 *   Registry sichtbar ist. Erst danach darf die ioBroker/NexoWatt-EOS
 *   Repository-Metadatei auf diese Version zeigen.
 *
 * Hintergrund:
 *   Wenn das Repository bereits `nexowatt-ui@x.y.z` ausweist, npm diese Version
 *   aber noch nicht liefert, bricht `iobroker upgrade nexowatt-ui@x.y.z` mit
 *   `ETARGET` ab. Genau diesen Fehler soll dieser Guard vor dem Freigeben
 *   des Adapter-Repositorys sichtbar machen.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageName = process.env.NEXOWATT_NPM_PACKAGE || pkg.name;
const expectedVersion = process.env.NEXOWATT_NPM_VERSION || pkg.version;
const maxAttempts = Math.max(1, Math.min(30, Number(process.env.NEXOWATT_NPM_VERIFY_ATTEMPTS || 12) || 12));
const waitMs = Math.max(1000, Math.min(30000, Number(process.env.NEXOWATT_NPM_VERIFY_WAIT_MS || 5000) || 5000));

/**
 * Code-Teil: sleep
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Code-Teil: readVersions
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function readVersions() {
  const out = execFileSync('npm', ['view', packageName, 'versions', '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const parsed = JSON.parse(out || '[]');
  return Array.isArray(parsed) ? parsed : [String(parsed)];
}

let lastError = '';
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    const versions = readVersions();
    if (versions.includes(expectedVersion)) {
      console.log(`[npm-registry] OK: ${packageName}@${expectedVersion} ist in der Registry sichtbar.`);
      process.exit(0);
    }
    lastError = `Version fehlt. Sichtbar ist zuletzt: ${versions.slice(-8).join(', ')}`;
  } catch (err) {
    lastError = String((err && err.message) || err);
  }

  if (attempt < maxAttempts) {
    console.log(`[npm-registry] Warte auf ${packageName}@${expectedVersion} (${attempt}/${maxAttempts}) ... ${lastError}`);
    sleep(waitMs);
  }
}

console.error(`[npm-registry] FEHLER: ${packageName}@${expectedVersion} ist nicht in der npm/private Registry sichtbar.`);
console.error(`[npm-registry] Letzter Status: ${lastError}`);
console.error('[npm-registry] Repository-Freigabe noch NICHT auf diese Version setzen, sonst schlägt das Upgrade mit ETARGET fehl.');
process.exit(1);
