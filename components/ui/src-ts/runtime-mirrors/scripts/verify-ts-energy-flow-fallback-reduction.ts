// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-energy-flow-fallback-reduction.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-energy-flow-fallback-reduction.js
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
 * Original-Hash: e0ab28efe56766e64511787883ae7e642b41a73a3cfec146d81ac5bdceeb84d2
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
 * Datei: scripts/verify-ts-energy-flow-fallback-reduction.js
 *
 * Zweck:
 * Prüft 0.7.102: Der Energiefluss-TS-Kandidat darf bei reinen Anlagen-Warmup-Gründen
 * produktiv bleiben, harte Blocker bleiben aber JS-Fallback.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
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
function need(marker, label) {
  if (!main.includes(marker)) {
    console.error(`[energy-flow-fallback-reduction] ERROR: fehlt ${label}: ${marker}`);
    process.exit(1);
  }
}
need('_nwIsEnergyFlowPlantGateWarmupOnly', 'Warmup-only Helper');
need('plantGateWarmupOnly', 'Warmup-only Variable');
need('plantEvaluationSoftReleased', 'Diagnoseflag für weich freigegebene Anlagenbewertung');
need("normalized.includes('samples gesammelt')", 'Sample-Warmup-Erkennung');
need("normalized.includes('ok-samples in folge')", 'OK-Folge-Warmup-Erkennung');
need('blockerCount > 0 || mismatchCount > 0', 'harte Blocker bleiben blockierend');
console.log('[energy-flow-fallback-reduction] OK: TS-Energiefluss reduziert JS-Fallback nur bei reinen Warmup-Gründen.');
