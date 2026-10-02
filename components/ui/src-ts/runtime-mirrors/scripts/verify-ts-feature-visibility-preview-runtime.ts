// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-feature-visibility-preview-runtime.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-feature-visibility-preview-runtime.js
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
 * Original-Hash: c62a933dae5cd8c117c372983bf436d81d4d31a294e5590ffe34acf49c25d63a
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
 * Datei: scripts/verify-ts-feature-visibility-preview-runtime.js
 *
 * Zweck:
 * Prüft den neuen 0.7.73-Zwischenschritt der TypeScript-Migration.
 *
 * Zusammenhang:
 * In main.js wird der TypeScript-Spiegel für Feature-Sichtbarkeit zunächst nur
 * als Diagnose und ab 0.7.74 als autoritative Sichtbarkeit mit Fallback geladen.
 * Diese Prüfung stellt sicher, dass der Preview-Codeanker weiterhin vorhanden ist.
 */

const fs = require('fs');
const path = require('path');

/** Prüft, ob ein erwarteter Marker in einer Datei steht. */
function requireMarker(file, marker, label) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(marker)) {
    throw new Error(`[feature-visibility-preview] Missing marker: ${label}`);
  }
}

const root = path.join(__dirname, '..');
const mainFile = path.join(root, 'main.js');
const mirrorFile = path.join(root, 'lib', 'ts-mirrors', 'backend', 'feature-visibility', 'feature-visibility.js');

requireMarker(mainFile, 'const featureVisibilityTsPreview = (() => {', 'preview calculation in main.js');
requireMarker(mainFile, "require('./lib/ts-mirrors/backend/feature-visibility/feature-visibility')", 'backend mirror require');
requireMarker(mainFile, 'featureVisibilityTsPreview,', 'preview field in /config response');
requireMarker(mainFile, '0.7.74 macht diesen Spiegel für die Feature-Sichtbarkeit autoritativ', 'German migration comment');
requireMarker(mirrorFile, 'exports.buildFeatureVisibilityState', 'backend feature visibility mirror export');

console.log('[feature-visibility-preview] OK: TS preview runtime markers present.');
