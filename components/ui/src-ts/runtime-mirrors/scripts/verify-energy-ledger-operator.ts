// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-energy-ledger-operator.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-energy-ledger-operator.js
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
 * Original-Hash: e9ed6b1c6d54d9193fe5b2bb610660a2c4ec9f948e08bc535a34c6480ba29ef3
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
function read(path) { return fs.readFileSync(path, 'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) {
    console.error(`[FAIL] ${label}: missing ${needle} in ${path}`);
    process.exit(1);
  }
  console.log(`[OK] ${label}`);
}
/**
 * Code-Teil: file
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function file(path) {
  if (!fs.existsSync(path)) {
    console.error(`[FAIL] missing ${path}`);
    process.exit(1);
  }
  console.log(`[OK] ${path}`);
}
file('src-ts/runtime-executables/ems/modules/energy-ledger.ts');
file('src-ts/runtime-executables/www/energy-ledger.ts');
file('src-ts/runtime-executables/www/energy-origin-ledger-view.ts');
file('src-ts/runtime-executables/lib/energy-origin-api.ts');
file('www/energy-ledger.html');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'buildKwhSourceMix', 'Quelle je kWh helper');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'energyLedger.operator.viewJson', 'Betreiberansicht state');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'energyLedger.walletBridge.summaryJson', 'Energy Wallet Bridge state');
must('src-ts/runtime-executables/ems/modules/energy-ledger.ts', 'csvFoundationForPeriod', 'Monats-/Jahres-Exportbasis helper');
must('src-ts/runtime-executables/main.ts', '/api/ledger/local-kwh.csv', 'CSV API route');
must('src-ts/runtime-executables/main.ts', '/ledger/local-kwh', 'Betreiberansicht route');
must('src-ts/runtime-executables/main.ts', 'keine doppelte Zählung', 'No-duplicate comment');
must('src-ts/runtime-executables/www/energy-origin-ledger-view.ts', '/api/ledger/energy-origin?period=', 'Operator view origin API usage');
must('src-ts/runtime-executables/lib/energy-origin-api.ts', '/api/ledger/energy-origin.csv', 'Origin CSV API route');
must('src-ts/runtime-executables/lib/energy-origin-api.ts', 'cp.energyKwh !== undefined ? cp.energyKwh : cp.totalKwh', 'Origin CSV charge-point energy field');
must('src-ts/runtime-executables/lib/energy-origin-api.ts', '/ledger/energy-origin', 'Origin operator route');
console.log('Energy Ledger operator/export checks passed.');
