// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-shadow-bridges.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-shadow-bridges.js
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
 * Original-Hash: 51b8ad5087b343272355aa67f59d9cb558eb7faa11440b6ace9cc637476ec45c
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
 * Datei: scripts/verify-ts-shadow-bridges.js
 *
 * Zweck:
 * Prüft die TypeScript-Shadow-Bridge ohne TypeScript-Compiler. Dadurch kann dieser
 * Check in `publish:check` laufen, auch wenn lokal noch kein `npm install` ausgeführt wurde.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRel = 'src-ts/bridges/feature-visibility-shadow.ts';
const mirrorRel = 'lib/ts-mirrors/bridges/feature-visibility-shadow.js';

/** Code-Teil: fail — bricht mit klarer Fehlermeldung ab. */
function fail(message) {
  console.error(`[verify-ts-shadow-bridges] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: readRequired — liest Pflichtdateien und vereinheitlicht Zeilenenden. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/** Code-Teil: sourceHash — muss mit dem Hash im generierten Spiegel übereinstimmen. */
function sourceHash() {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/** Code-Teil: verifyHash — erkennt veraltete JS-Spiegel ohne tsc-Build. */
function verifyHash() {
  const mirror = readRequired(mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${mirrorRel} enthält keinen Quell-Hash.`);
  if (String(match[1]).toLowerCase() !== sourceHash()) fail(`${mirrorRel} ist nicht synchron zu ${sourceRel}. Bitte npm run sync:ts-shadow-bridges ausführen.`);
}

/**
 * Code-Teil: verifyRuntimeBehavior
 *
 * Zweck:
 * Lädt den JS-Spiegel mit Node und prüft zwei kritische Fälle: Gleichstand ohne
 * Abweichung und EVCS-Abweichung, wenn die alte Runtime EVCS fälschlich anzeigen würde.
 */
function verifyRuntimeBehavior() {
  const mod = require(path.join(root, mirrorRel));
  for (const name of ['normalizeFeatureVisibilityState', 'compareFeatureVisibility', 'buildFeatureVisibilityShadowReport']) {
    if (typeof mod[name] !== 'function') fail(`${mirrorRel} exportiert ${name} nicht als Funktion.`);
  }

  const noFeatureReport = mod.buildFeatureVisibilityShadowReport({}, {});
  if (noFeatureReport.isMatch !== true || noFeatureReport.mismatches.length !== 0) {
    fail('Shadow-Bericht ohne Features muss ohne Abweichung sein.');
  }

  const evcsMismatch = mod.buildFeatureVisibilityShadowReport(
    { evcsEnabled: false, evcsProofs: [] },
    { hasEvcs: true }
  );
  if (evcsMismatch.isMatch !== false || evcsMismatch.mismatches.length !== 1 || evcsMismatch.mismatches[0].key !== 'hasEvcs') {
    fail('Shadow-Bericht muss falsche EVCS-Sichtbarkeit erkennen.');
  }
}

/**
 * Code-Teil: main
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function main() {
  const pkg = JSON.parse(readRequired('package.json'));
  const scripts = pkg.scripts || {};
  for (const name of ['sync:ts-shadow-bridges', 'check:ts-shadow-bridges', 'test:shadow-bridges']) {
    if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
  }
  const source = readRequired(sourceRel);
  if (!source.includes('Code-Teil: buildFeatureVisibilityShadowReport')) fail(`${sourceRel} enthält den erwarteten Code-Kommentar nicht.`);
  const mirror = readRequired(mirrorRel);
  if (!mirror.includes('AUTO-GENERATED FILE')) fail(`${mirrorRel} enthält keinen Generator-Hinweis.`);
  verifyHash();
  verifyRuntimeBehavior();
  console.log('[verify-ts-shadow-bridges] OK: Shadow-Bridge-Spiegel ist synchron und lauffähig.');
}

main();
