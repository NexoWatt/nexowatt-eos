// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/clean-ts-output.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/clean-ts-output.js
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
 * Original-Hash: 9b605c467c30189dce491deca04d5b9ead9df4916405533837cc725a0dc1af1f
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
 * Code-Teil: TypeScript-Build-Ausgabe löschen.
 * Zweck: Entfernt den rein technischen Ordner dist-ts, damit lokale Builds
 *        keine alten Typdateien liegen lassen.
 * Zusammenhang: Wird von npm run clean:ts und vor npm run build:ts genutzt.
 * Wichtig: Dieser Ordner enthält nur generierte Deklarationen und keine
 *          produktive Adapterlogik. ioBroker startet weiterhin main.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'dist-ts');
fs.rmSync(outDir, { recursive: true, force: true });
console.log('[clean-ts-output] removed dist-ts');
