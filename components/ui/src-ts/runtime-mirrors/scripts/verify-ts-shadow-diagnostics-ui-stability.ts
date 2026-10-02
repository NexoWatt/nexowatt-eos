// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-shadow-diagnostics-ui-stability.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-shadow-diagnostics-ui-stability.js
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
 * Original-Hash: 0777b0119d871511df6303ee7220c82c70792fb2fbd8cb35556b24052d26da5a
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
 * Code-Teil: verify-ts-shadow-diagnostics-ui-stability
 *
 * Zweck:
 * Prüft, dass die TS-Shadow-Diagnose im App-Center verständliche Texte nutzt und
 * der JSON-Dialog außerhalb des automatischen Rerenders stabil geöffnet werden kann.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'www', 'ems-apps.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'www', 'styles.css'), 'utf8');
const required = [
  '_shadowDecodeDisplayText',
  '_shadowEscape',
  '_openShadowJsonDialog',
  'Eine Shadow-Abweichung bedeutet nicht automatisch einen Produktfehler',
  'JSON dauerhaft öffnen',
];
const missing = required.filter((needle) => !js.includes(needle));
if (missing.length) {
  console.error('[shadow-diagnostics-ui-stability] Missing JS anchors:', missing.join(', '));
  process.exit(1);
}
if (!css.includes('App-Center TS-Shadow-Diagnose verständlicher')) {
  console.error('[shadow-diagnostics-ui-stability] Missing CSS anchor.');
  process.exit(1);
}
console.log('[shadow-diagnostics-ui-stability] OK');
