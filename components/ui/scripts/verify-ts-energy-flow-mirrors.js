#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-energy-flow-mirrors.js
 *
 * Zweck:
 * Prüft die TS->JS-Spiegel für die Energiefluss-Resolver ohne TypeScript-Compiler.
 * Dieser Check darf in `publish:check` laufen und muss deshalb nur mit den bereits
 * eingecheckten Spiegeldateien arbeiten.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/utils/number.ts',
    mirrorRel: 'lib/ts-mirrors/energy-flow/utils/number.js',
    exports: ['toNumberOrNull', 'positiveWatt', 'percent'],
  },
  {
    sourceRel: 'src-ts/utils/energy-flow.ts',
    mirrorRel: 'lib/ts-mirrors/energy-flow/utils/energy-flow.js',
    exports: ['splitSignedStoragePower', 'resolveSplitStorageDps', 'calculateStorageFromBalance', 'splitSignedGridPower'],
  },
  {
    sourceRel: 'src-ts/resolvers/energy-flow-resolver.ts',
    mirrorRel: 'lib/ts-mirrors/energy-flow/resolvers/energy-flow-resolver.js',
    exports: ['resolveStorageFlow', 'resolveGridFlow', 'calculateBuildingLoadFromBalance', 'buildEnergyFlowSnapshot'],
  },
];

/** Code-Teil: fail — bricht den Check mit klarer Fehlermeldung ab. */
function fail(message) {
  console.error(`[verify-ts-energy-flow-mirrors] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: readRequired — liest Pflichtdateien und vereinheitlicht Zeilenenden. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/** Code-Teil: sourceHash — berechnet denselben Quellhash wie der Build. */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/** Code-Teil: requireContains — prüft wichtige Kommentar-/Strukturanker. */
function requireContains(rel, needle) {
  const text = readRequired(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

/**
 * Code-Teil: verifyHash
 * Zweck: Prüft, ob Spiegel und TypeScript-Quelle synchron sind.
 */
function verifyHash(spec) {
  const mirror = readRequired(spec.mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${spec.mirrorRel} enthält keinen Quell-Hash.`);
  const expected = sourceHash(spec.sourceRel);
  const actual = String(match[1]).toLowerCase();
  if (actual !== expected) fail(`${spec.mirrorRel} ist nicht synchron zu ${spec.sourceRel}. Bitte npm run sync:ts-energy-flow-mirrors ausführen.`);
}

/**
 * Code-Teil: verifyRuntimeExports
 *
 * Zweck:
 * Lädt die CommonJS-Spiegel und prüft kritische Energiefluss-Regeln:
 * - Split-DP mit 0 W bleibt gültig.
 * - Signed Speicher-DP wird korrekt auf Laden/Entladen verteilt.
 * - Fallback greift nur ohne echten Speicher-DP.
 * - Signed Netz-DP wird korrekt auf Bezug/Einspeisung verteilt.
 */
function verifyRuntimeExports(spec) {
  const mod = require(path.join(root, spec.mirrorRel));
  for (const name of spec.exports) {
    if (typeof mod[name] !== 'function') fail(`${spec.mirrorRel} exportiert ${name} nicht als Funktion.`);
  }
}

/** Code-Teil: verifyEnergyFlowBehavior — prüft fachliche Kernfälle gegen den generierten Resolver-Spiegel. */
function verifyEnergyFlowBehavior() {
  const resolver = require(path.join(root, 'lib/ts-mirrors/energy-flow/resolvers/energy-flow-resolver.js'));
  const utils = require(path.join(root, 'lib/ts-mirrors/energy-flow/utils/energy-flow.js'));

  const splitZero = resolver.resolveStorageFlow({ hasConfiguredSplitDp: true, chargeW: 0, dischargeW: 0, socPct: 44 });
  if (splitZero.source !== 'split-dp' || splitZero.chargeW !== 0 || splitZero.dischargeW !== 0 || splitZero.hasConfiguredStorageDp !== true) {
    fail('Split-Speicher-DP mit 0 W muss gültig bleiben und darf nicht Fallback werden.');
  }

  const signedCharge = resolver.resolveStorageFlow({ hasConfiguredSignedDp: true, signedW: -1800, signedConvention: 'positive-discharge' });
  if (signedCharge.chargeW !== 1800 || signedCharge.dischargeW !== 0 || signedCharge.source !== 'signed-dp') {
    fail('Signed Speicher-DP -1800 W muss als Laden 1800 W interpretiert werden.');
  }

  const configuredMissing = resolver.resolveStorageFlow({ hasConfiguredSignedDp: true, signedW: '', balance: { pvW: 5000, gridImportW: 0, gridExportW: 2500, additionalKnownLoadW: 1000 } });
  if (configuredMissing.source !== 'default-zero' || configuredMissing.chargeW !== 0 || configuredMissing.dischargeW !== 0) {
    fail('Konfigurierter aber leerer Speicher-DP darf keinen Bilanzfallback überschreiben.');
  }

  const calculated = resolver.resolveStorageFlow({ balance: { pvW: 5000, gridImportW: 0, gridExportW: 2000, additionalKnownLoadW: 1000 } });
  if (calculated.source !== 'calculated' || calculated.chargeW !== 2000 || calculated.dischargeW !== 0) {
    fail('Fallback ohne Speicher-DP muss aus Bilanz Laden 2000 W berechnen.');
  }

  const grid = resolver.resolveGridFlow({ hasConfiguredSignedDp: true, signedW: -2400, signedConvention: 'positive-import' });
  if (grid.importW !== 0 || grid.exportW !== 2400 || grid.source !== 'signed-dp') {
    fail('Signed Netz-DP -2400 W muss bei positive-import als Einspeisung 2400 W gelten.');
  }

  const snapshot = resolver.buildEnergyFlowSnapshot({
    ts: 1,
    pvW: 5000,
    buildingLoadW: 1000,
    grid: { hasConfiguredSplitDp: true, importW: 0, exportW: 2000 },
    storage: { balance: { pvW: 5000, gridImportW: 0, gridExportW: 2000, additionalKnownLoadW: 1000 } },
    evcsW: 0,
    heatingRodW: 0,
    thermalW: 0,
  });
  if (snapshot.storage.chargeW !== 2000 || snapshot.buildingLoadW !== 1000) {
    fail('EnergyFlowSnapshot muss Speicherfallback und direkten Gebäudeverbrauch konsistent übernehmen.');
  }

  const splitGridZero = utils.resolveSplitGridDps(0, 0, true, true);
  if (splitGridZero.source !== 'split-dp' || splitGridZero.importW !== 0 || splitGridZero.exportW !== 0) {
    fail('Split-Netz-DPs mit 0 W müssen gültig bleiben.');
  }
}

function main() {
  const pkg = JSON.parse(readRequired('package.json'));
  const scripts = pkg.scripts || {};
  for (const name of ['sync:ts-energy-flow-mirrors', 'check:ts-energy-flow-mirrors', 'test:energy-flow-mirrors']) {
    if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
  }

  requireContains('tsconfig.energy-flow-mirrors.json', 'src-ts/resolvers/energy-flow-resolver.ts');
  requireContains('scripts/build-ts-energy-flow-mirrors.js', 'Code-Teil: rewriteRelativeRequires');
  requireContains('scripts/build-ts-energy-flow-mirrors.js', 'Code-Teil: checkMirrorIsCurrent');

  for (const spec of mirrorSpecs) {
    requireContains(spec.sourceRel, 'Code-Teil:');
    requireContains(spec.mirrorRel, 'AUTO-GENERATED FILE');
    requireContains(spec.mirrorRel, 'Quell-Hash: sha256:');
    verifyHash(spec);
    verifyRuntimeExports(spec);
  }
  verifyEnergyFlowBehavior();

  console.log('[verify-ts-energy-flow-mirrors] OK: Energiefluss-TS->JS-Spiegel sind synchron und fachlich lauffähig.');
}

main();
