// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-ledger-foundation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-energy-ledger-foundation.js
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
 * Original-Hash: e3119c3643980811c63220b6bbdc5c018c46b900b97ba54373f358a4cf9b01a4
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
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
/**
 * Code-Teil: need
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function need(rel, needle, msg) {
  const text = read(rel);
  if (!text.includes(needle)) {
    console.error(`[energy-ledger] FEHLER: ${msg || needle} fehlt in ${rel}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: match
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function match(rel, regex, msg) {
  const text = read(rel);
  if (!regex.test(text)) {
    console.error(`[energy-ledger] FEHLER: ${msg || regex} fehlt in ${rel}`);
    process.exit(1);
  }
}

/** Vergleicht Paketversionen numerisch und unterstützt damit auch Patch-Versionen ab 100. */
function requirePackageVersionAtLeast(minVersion, message) {
  const pkg = JSON.parse(read('package.json'));
/**
 * Code-Teil: parse
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const parse = value => {
    const match = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    return match ? match.slice(1).map(Number) : null;
  };
  const actual = parse(pkg.version);
  const minimum = parse(minVersion);
  let valid = Boolean(actual && minimum);
  if (valid) {
    valid = false;
    for (let index = 0; index < actual.length; index += 1) {
      if (actual[index] === minimum[index]) continue;
      valid = actual[index] > minimum[index];
      break;
    }
    if (actual.every((part, index) => part === minimum[index])) valid = true;
  }
  if (!valid) {
    console.error(`[energy-ledger] FEHLER: ${message || `Paketversion >= ${minVersion}`} (ist ${pkg.version || 'unbekannt'})`);
    process.exit(1);
  }
}

need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'nexowatt.local-kwh-ledger.v2', 'Ledger-Schema v2');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'chargeKiosk.stations.*.lastSessionsByLpJson', 'Charge-Kiosk-Sessionquelle dokumentiert');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'OCPP, Modbus, MQTT', 'Hersteller-/Protokolloffenheit dokumentiert');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'processedSessionKeysJson', 'Deduplikation der Sessions');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'entriesRecentJson', 'kompakte Ledger-Eintragsliste');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'todayCsvJson', 'CSV-Exportbasis');
need('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'keine eichrechtsverbindliche Abrechnung', 'rechtlicher Hinweis');
need('src-ts/runtime-executables/ems/module-manager.ts', 'EnergyLedgerModule', 'ModuleManager registriert EnergyLedgerModule');
need('src-ts/runtime-executables/ems/module-manager.ts', "this._licenseAllowsApp('energyLedger')", 'Home/Pro-Lizenzgate für Ledger');
need('src-ts/runtime-executables/www/ems-apps.ts', "id: 'energyLedger'", 'App-Center führt Energieherkunft & Ladebilanz');
need('src-ts/runtime-executables/www/ems-apps.ts', 'schreibt aber niemals auf Hardware', 'Installer-Hinweis: read-only');
need('src-ts/runtime-executables/ems/services/feature-flags.ts', "'energyLedger',", 'Energy Ledger ist im Home-App-/Featureumfang enthalten');
need('src-ts/runtime-executables/ems/services/energy-origin-accounting.ts', 'nexowatt.energy-origin-ledger.v1', '15-Minuten Herkunftsledger vorhanden');
need('src-ts/runtime-executables/main.ts', "ensurePlainObj('energyLedger'", 'Default-Config energyLedger');
requirePackageVersionAtLeast('0.8.27', 'Paketversion >= 0.8.27');
console.log('[energy-ledger] OK: Legacy-Ledger und Home/Pro-Energieherkunftsgrundlage sind statisch abgesichert.');
