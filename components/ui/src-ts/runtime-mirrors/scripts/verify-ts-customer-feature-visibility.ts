// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-customer-feature-visibility.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-customer-feature-visibility.js
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
 * Original-Hash: c429898097dd7b8fed0b8dd30751288ea1823206f36dcb322fce61d2d8efe77a
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
 * Datei: scripts/verify-ts-customer-feature-visibility.js
 *
 * Zweck:
 * Prüft, ob die TypeScript-Vorbereitung für die kundenseitige Feature-Sichtbarkeit
 * vollständig vorhanden ist.
 *
 * Zusammenhang:
 * Dieser Check läuft ohne `tsc` und kann deshalb auch in `publish:check` genutzt
 * werden. Der eigentliche Runtime-Test läuft separat über den TypeScript-Build.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

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
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/**
 * Code-Teil: requireFile
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function requireFile(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Pflichtdatei fehlt: ${rel}`);
  }
  return read(rel);
}

/**
 * Code-Teil: requireContains
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function requireContains(text, needle, rel) {
  if (!text.includes(needle)) {
    throw new Error(`Erwarteter Inhalt fehlt in ${rel}: ${needle}`);
  }
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Prüft Datei- und Kommentaranker der Feature-Visibility-Migrationsvorbereitung.
 */
function main() {
  const source = requireFile('src-ts/frontend/customer-feature-visibility.ts');
  const cases = requireFile('src-ts/quality/customer-feature-visibility-cases.ts');
  const runtime = requireFile('src-ts/tests/customer-feature-visibility-runtime.ts');
  requireFile('tsconfig.customer-feature-visibility.json');

  for (const fn of ['hasRealEvcsProof', 'hasRealStorageFarmProof', 'buildCustomerFeatureVisibility']) {
    requireContains(source, `export function ${fn}`, 'src-ts/frontend/customer-feature-visibility.ts');
  }
  for (const anchor of ['Code-Teil: customerFeatureVisibilityCases', 'ohne Wallbox', 'Speicherfarm']) {
    requireContains(cases, anchor, 'src-ts/quality/customer-feature-visibility-cases.ts');
  }
  for (const anchor of ['runCustomerFeatureVisibilityRuntimeTest', 'Sichtbarkeitsfälle']) {
    requireContains(runtime, anchor, 'src-ts/tests/customer-feature-visibility-runtime.ts');
  }
  console.log('[ts-customer-feature-visibility-check] OK: Feature-Visibility-Vorbereitung vorhanden.');
}

main();
