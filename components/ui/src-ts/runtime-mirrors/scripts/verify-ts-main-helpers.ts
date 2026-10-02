// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-ts-main-helpers.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-ts-main-helpers.js
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
 * Original-Hash: f6779d7ab6f9f4e9e6b98596cb1d7b02daf2e7c5f11ffc05e28ecab9e736882d
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
 * Datei: scripts/verify-ts-main-helpers.js
 *
 * Zweck:
 * Prüft die neuen TypeScript-Main-Helfer und ihre CommonJS-Spiegel ohne produktive
 * Runtime-Änderung.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/main/state-cache.ts',
    mirrorRel: 'lib/ts-mirrors/main/state-cache.js',
    exports: ['normalizeMainState', 'hasPresentMainValue', 'isMainStateFresh', 'readMainNumber', 'readMainBoolean', 'readMainString'],
  },
  {
    sourceRel: 'src-ts/main/api-state.ts',
    mirrorRel: 'lib/ts-mirrors/main/api-state.js',
    exports: ['toMainApiStateEntry', 'buildMainApiStateResponse'],
  },
  {
    sourceRel: 'src-ts/main/api-set.ts',
    mirrorRel: 'lib/ts-mirrors/main/api-set.js',
    exports: ['normalizeMainApiSetValue', 'buildMainSettingsWritePlan'],
  },
  {
    sourceRel: 'src-ts/main/api-shadow.ts',
    mirrorRel: 'lib/ts-mirrors/main/api-shadow.js',
    exports: ['buildMainApiStateShadowSummary', 'buildMainApiSetShadowSummary'],
  },
  {
    sourceRel: 'src-ts/main/info-connection.ts',
    mirrorRel: 'lib/ts-mirrors/main/info-connection.js',
    exports: ['buildMainInfoConnectionWritePlan'],
  },
  {
    sourceRel: 'src-ts/main/license-key.ts',
    mirrorRel: 'lib/ts-mirrors/main/license-key.js',
    exports: ['normalizeMainLicenseInput', 'isMainMaskedLicenseValue', 'analyzeMainLicenseInput'],
  },
  {
    sourceRel: 'src-ts/main/index.ts',
    mirrorRel: 'lib/ts-mirrors/main/index.js',
    exports: [],
  },
];

/**
 * Code-Teil: fail
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fail(message) {
  console.error(`[verify-ts-main-helpers] ERROR: ${message}`);
  process.exit(1);
}

/**
 * Code-Teil: readRequired
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: sourceHash
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
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
function requireContains(rel, needle) {
  const text = readRequired(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

/**
 * Code-Teil: verifyHash
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function verifyHash(spec) {
  const mirror = readRequired(spec.mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${spec.mirrorRel} enthält keinen Quell-Hash.`);
  const actual = String(match[1]).toLowerCase();
  const expected = sourceHash(spec.sourceRel);
  if (actual !== expected) fail(`${spec.mirrorRel} ist nicht synchron zu ${spec.sourceRel}. Bitte npm run sync:ts-main-helpers ausführen.`);
}

/**
 * Code-Teil: verifyRuntimeBehavior
 *
 * Zweck:
 * Lädt die JS-Spiegel und prüft die wichtigsten fachlichen Schutzregeln:
 * 0/false bleiben gültig, settings-Werte werden korrekt normalisiert, maskierte Lizenzkeys
 * werden nicht speicherbar und info.connection bekommt einen eindeutigen Schreibplan.
 */
function verifyRuntimeBehavior() {
  const stateCache = require(path.join(root, 'lib/ts-mirrors/main/state-cache.js'));
  const apiState = require(path.join(root, 'lib/ts-mirrors/main/api-state.js'));
  const apiSet = require(path.join(root, 'lib/ts-mirrors/main/api-set.js'));
  const apiShadow = require(path.join(root, 'lib/ts-mirrors/main/api-shadow.js'));
  const conn = require(path.join(root, 'lib/ts-mirrors/main/info-connection.js'));
  const lic = require(path.join(root, 'lib/ts-mirrors/main/license-key.js'));

  const cache = {
    zeroW: { value: 0, ts: 1 },
    boolFalse: { value: false, ts: 1 },
    strEmpty: { value: '', ts: 1 },
  };
  if (stateCache.readMainNumber(cache, ['zeroW'], null) !== 0) fail('StateCache-Helfer muss 0 als gültigen Zahlenwert lesen.');
  if (stateCache.readMainBoolean(cache, ['boolFalse'], true) !== false) fail('StateCache-Helfer muss false als gültigen Boolean lesen.');
  if (apiState.buildMainApiStateResponse(cache).states.zeroW.value !== 0) fail('/api/state-Helfer muss 0 W ausgeben.');

  const boolPlan = apiSet.buildMainSettingsWritePlan({ scope: 'settings', key: 'aiAdvisorEnabled', value: 'false' });
  if (!boolPlan.ok || boolPlan.plan.value !== false) fail('/api/set-Helfer muss "false" korrekt zu false normalisieren.');
  const numPlan = apiSet.buildMainSettingsWritePlan({ scope: 'settings', key: 'aiAdvisorEvTargetSocPct', value: '150' });
  if (!numPlan.ok || numPlan.plan.value !== 100) fail('/api/set-Helfer muss Zahlenbereiche begrenzen.');

  const apiStateShadow = apiShadow.buildMainApiStateShadowSummary(cache, 1234);
  if (!apiStateShadow.ok || apiStateShadow.mismatchCount !== 0) fail('/api/state-Shadow muss 0/false ohne Abweichung vergleichen.');
  const apiSetShadow = apiShadow.buildMainApiSetShadowSummary({ scope: 'settings', key: 'aiAdvisorEnabled', value: 'false' }, 1234);
  if (!apiSetShadow.ok || !apiSetShadow.supported || !apiSetShadow.plan || apiSetShadow.plan.value !== false) fail('/api/set-Shadow muss settings-Schreibplan korrekt vorbereiten.');

  const online = conn.buildMainInfoConnectionWritePlan(true, 'webserver-started', 123);
  if (online.stateId !== 'info.connection' || online.value !== true || online.ack !== true) fail('info.connection-Helfer liefert keinen gültigen Online-Schreibplan.');

  if (lic.analyzeMainLicenseInput('********').shouldStore !== false) fail('Lizenz-Helfer darf maskierten Wert nicht speichern.');
  if (lic.analyzeMainLicenseInput('NW-REAL-KEY').shouldStore !== true) fail('Lizenz-Helfer muss echten Key speicherbar bewerten.');
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
  for (const name of ['sync:ts-main-helpers', 'check:ts-main-helpers', 'test:main-helpers']) {
    if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
  }
  requireContains('tsconfig.main-helpers.json', 'src-ts/main/**/*.ts');
  requireContains('scripts/build-ts-main-helpers.js', 'Code-Teil: checkMirrorIsCurrent');
  for (const spec of mirrorSpecs) {
    requireContains(spec.sourceRel, 'Code-Teil:');
    requireContains(spec.mirrorRel, 'AUTO-GENERATED FILE');
    verifyHash(spec);
    const mod = require(path.join(root, spec.mirrorRel));
    for (const name of spec.exports) {
      if (typeof mod[name] !== 'function') fail(`${spec.mirrorRel} exportiert ${name} nicht als Funktion.`);
    }
  }
  verifyRuntimeBehavior();
  console.log('[verify-ts-main-helpers] OK: Main-TS-Helfer sind synchron und fachlich plausibel.');
}

main();
