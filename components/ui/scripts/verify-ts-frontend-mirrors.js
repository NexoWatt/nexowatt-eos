#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-frontend-mirrors.js
 *
 * Zweck:
 * Prüft die Frontend-TS->MJS-Spiegelstrategie ohne TypeScript-Compiler.
 * Dadurch kann dieser Check in `publish:check` laufen, auch wenn lokal noch
 * kein `npm install` ausgeführt wurde.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');
const mirrorSpecs = [
  {
    sourceRel: 'src-ts/frontend/display-format.ts',
    mirrorRel: 'www/static/ts-mirrors/frontend/display-format.mjs',
    exports: ['formatPowerValue', 'formatEnergyValue', 'formatPercentValue', 'formatPowerW'],
  },
  {
    sourceRel: 'src-ts/frontend/live-dashboard-format.ts',
    mirrorRel: 'www/static/ts-mirrors/frontend/live-dashboard-format.mjs',
    exports: ['formatDashboardPower', 'formatDashboardPowerSigned', 'formatDashboardEnergyKwh', 'formatDashboardFlowPower', 'runLiveDashboardFormatSmoke'],
  },
  {
    sourceRel: 'src-ts/frontend/display-format-canary.ts',
    mirrorRel: 'www/static/ts-mirrors/frontend/display-format-canary.mjs',
    exports: ['runDisplayFormatterCanary', 'normalizeDisplayTextForCanary'],
    valueExports: ['defaultDisplayFormatterCanaryCases'],
  },
  {
    sourceRel: 'src-ts/frontend/customer-feature-visibility.ts',
    mirrorRel: 'www/static/ts-mirrors/frontend/customer-feature-visibility.mjs',
    exports: ['hasRealEvcsProof', 'hasRealStorageFarmProof', 'decideEvcsVisibility', 'decideStorageFarmVisibility', 'explainCustomerFeatureVisibility', 'buildCustomerFeatureVisibility'],
  },
  {
    sourceRel: 'src-ts/frontend/feature-visibility-diagnostics.ts',
    mirrorRel: 'www/static/ts-mirrors/frontend/feature-visibility-diagnostics.mjs',
    exports: ['buildCustomerFeatureDiagnostics'],
  },
  {
    sourceRel: 'src-ts/frontend/history-controls.ts',
    mirrorRel: 'www/static/ts-mirrors/frontend/history-controls.mjs',
    exports: ['buildHistoryToolbarState'],
  },
  {
    sourceRel: 'src-ts/frontend/runtime-shadow.ts',
    mirrorRel: 'www/static/ts-mirrors/frontend/runtime-shadow.mjs',
    exports: ['normalizeMirrorBaseUrl', 'shouldRunFrontendTsMirrorShadow', 'runFrontendTsMirrorShadowCheck'],
  },
  {
    sourceRel: 'src-ts/frontend/feature-visibility-shadow-compare.ts',
    mirrorRel: 'www/static/ts-mirrors/frontend/feature-visibility-shadow-compare.mjs',
    exports: ['compareFeatureVisibility', 'hasBlockingVisibilityMismatch', 'formatFeatureVisibilityShadowLog'],
  },
];

/**
 * Code-Teil: fail
 * Zweck: Bricht den Check mit klarer Fehlermeldung ab.
 */
function fail(message) {
  console.error(`[verify-ts-frontend-mirrors] ERROR: ${message}`);
  process.exit(1);
}

/**
 * Code-Teil: readRequired
 * Zweck: Liest eine Pflichtdatei und vereinheitlicht Zeilenenden.
 */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Code-Teil: sourceHash
 * Zweck: Berechnet denselben Hash, den der Build in den MJS-Spiegel schreibt.
 */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/**
 * Code-Teil: requireContains
 * Zweck: Prüft wichtige Kommentar- und Vertragsanker.
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
 * Vergleicht den im MJS-Spiegel gespeicherten Quell-Hash mit der aktuellen TS-Quelle.
 * So erkennen wir ohne Compiler, ob ein Spiegel veraltet ist.
 */
function verifyHash(spec) {
  const mirror = readRequired(spec.mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${spec.mirrorRel} enthält keinen Quell-Hash.`);
  const expected = sourceHash(spec.sourceRel);
  const actual = String(match[1]).toLowerCase();
  if (actual !== expected) fail(`${spec.mirrorRel} ist nicht synchron zu ${spec.sourceRel}. Bitte npm run sync:ts-frontend-mirrors ausführen.`);
}

/**
 * Code-Teil: verifyModuleExports
 *
 * Zweck:
 * Importiert die erzeugten MJS-Spiegel mit Node und prüft die erwarteten Exporte.
 * Damit merken wir früh, wenn der Spiegel zwar existiert, aber nicht lauffähig ist.
 */
async function verifyModuleExports(spec) {
  const file = path.join(root, spec.mirrorRel);
  const mod = await import(pathToFileURL(file).href);
  for (const name of spec.exports) {
    if (!(name in mod)) fail(`${spec.mirrorRel} exportiert ${name} nicht.`);
  }
  if (spec.mirrorRel.endsWith('display-format.mjs')) {
    const formatted = mod.formatPowerValue(0);
    if (!formatted || formatted.text !== '0 W') fail('display-format.mjs muss 0 W als gültigen Wert formatieren.');
  }
  if (spec.mirrorRel.endsWith('live-dashboard-format.mjs')) {
    if (mod.formatDashboardPower(0, 'W') !== '0 W') fail('live-dashboard-format.mjs muss 0 W als gültige Leistung formatieren.');
    if (mod.formatDashboardPower(1500, 'kW') !== '1.50 kW') fail('live-dashboard-format.mjs muss kW-Einstellung kompatibel abbilden.');
    if (mod.formatDashboardPowerSigned(-120, 'W') !== '-120 W') fail('live-dashboard-format.mjs muss negative Werte signiert formatieren.');
    if (mod.runLiveDashboardFormatSmoke() !== true) fail('live-dashboard-format.mjs Smoke-Test fehlgeschlagen.');
  }
  if (spec.mirrorRel.includes('customer-feature-visibility')) {
    const state = mod.buildCustomerFeatureVisibility({ evcsProofs: [], storageFarmEnabled: false, storageFarmProofs: [] });
    if (!state || state.hasEvcs !== false || state.hasStorageFarm !== false) fail('customer-feature-visibility.mjs muss nicht konfigurierte Features ausblenden.');
    const explanation = mod.explainCustomerFeatureVisibility({ evcsProofs: [], storageFarmEnabled: false, storageFarmProofs: [] });
    if (!explanation || !Array.isArray(explanation.decisions)) fail('customer-feature-visibility.mjs muss erklärende Entscheidungen liefern.');
  }
  if (spec.mirrorRel.includes('history-controls')) {
    const toolbar = mod.buildHistoryToolbarState({ mode: 'day', hasEvcs: false, hasTariff: true, canLoad: true });
    const evcs = toolbar.actions.find((x) => x.key === 'evcsPdf');
    if (!evcs || evcs.visible !== false) fail('history-controls.mjs muss EVCS PDF ohne Wallbox ausblenden.');
  }
  if (spec.mirrorRel.includes('runtime-shadow')) {
    if (mod.shouldRunFrontendTsMirrorShadow('?tsMirror=1') !== true) fail('runtime-shadow.mjs muss ?tsMirror=1 akzeptieren.');
    if (mod.shouldRunFrontendTsMirrorShadow('?tsMirror=0') !== false) fail('runtime-shadow.mjs darf ?tsMirror=0 nicht aktivieren.');
  }
  if (spec.mirrorRel.includes('feature-visibility-shadow-compare')) {
    const result = mod.compareFeatureVisibility({ hasEvcs: true }, { hasEvcs: false });
    if (!result || result.matches !== false || !Array.isArray(result.mismatches) || result.mismatches.length !== 1) fail('feature-visibility-shadow-compare.mjs muss EVCS-Abweichungen erkennen.');
  }
}

async function main() {
  const pkg = JSON.parse(readRequired('package.json'));
  const scripts = pkg.scripts || {};
  for (const name of ['sync:ts-frontend-mirrors', 'check:ts-frontend-mirrors', 'test:ts-frontend-mirrors']) {
    if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
  }
  requireContains('tsconfig.frontend-mirrors.json', 'src-ts/frontend/display-format.ts');
  requireContains('scripts/build-ts-frontend-mirrors.js', 'Code-Teil: checkMirrorIsCurrent');
  requireContains('scripts/build-ts-frontend-mirrors.js', 'Code-Teil: writeRuntimeMirror');

  for (const spec of mirrorSpecs) {
    requireContains(spec.sourceRel, 'Code-Teil:');
    requireContains(spec.mirrorRel, 'AUTO-GENERATED FILE');
    requireContains(spec.mirrorRel, 'Quell-Hash: sha256:');
    verifyHash(spec);
    await verifyModuleExports(spec);
  }

  requireFrontendMirrorRuntimeCheck();
console.log('[verify-ts-frontend-mirrors] OK: Frontend-TS->MJS-Spiegel sind synchron und importierbar.');
}

main().catch((err) => fail(err && err.stack ? err.stack : String(err)));

/**
 * Code-Teil: requireFrontendMirrorRuntimeCheck
 *
 * Zweck:
 * Prüft, ob der Runtime-Importcheck für die MJS-Spiegel vorhanden ist.
 *
 * Zusammenhang:
 * Reine Existenz- und Hash-Prüfungen reichen nicht aus. Dieser zusätzliche Check
 * importiert die generierten `.mjs`-Dateien wirklich und schützt uns vor kaputten
 * Browser-Spiegeln, bevor wir sie später produktiv nutzen.
 */
function requireFrontendMirrorRuntimeCheck() {
  const rel = 'scripts/verify-ts-frontend-mirror-runtime.js';
  if (!fs.existsSync(path.join(root, rel))) fail(`${rel} fehlt.`);
}
