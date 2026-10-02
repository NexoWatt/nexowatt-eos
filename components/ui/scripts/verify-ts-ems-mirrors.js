#!/usr/bin/env node
'use strict';

/**
 * Datei: scripts/verify-ts-ems-mirrors.js
 *
 * Zweck:
 * Prüft die EMS-TS->JS-Spiegelstrategie ohne produktive Runtime-Umschaltung.
 * Der Check stellt sicher, dass Core-Budget- und Heizstab-Entscheidungs-Spiegel
 * vorhanden, synchron und mit Node importierbar sind.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const mirrorSpecs = [
  {
    sourceRel: 'src-ts/utils/number.ts',
    mirrorRel: 'lib/ts-mirrors/utils/number.js',
    exports: ['toNumberOrNull', 'positiveWatt', 'clampNumber'],
  },
  {
    sourceRel: 'src-ts/ems/core-limits/core-budget.ts',
    mirrorRel: 'lib/ts-mirrors/ems/core-limits/core-budget.js',
    exports: ['isStorageReserveActive', 'calculatePvBudgetGate', 'calculateGridBudgetGate', 'buildCoreBudgetSnapshot', 'computeCoreBudgetReservation', 'buildCoreBudgetConsumersList', 'calculateCoreBudgetFlexUsedW'],
  },
  {
    sourceRel: 'src-ts/ems/core-limits/core-runtime.ts',
    mirrorRel: 'lib/ts-mirrors/ems/core-limits/core-runtime.js',
    exports: ['computeCorePvBudgetFlowRawW', 'resolveCorePvBudgetPhysicalCap', 'normalizeCorePvAllocationMode', 'buildCorePvAllocation', 'computeCoreCentralBudgetGrant', 'buildCoreRuntimeBudgetSnapshot', 'compareCoreRuntimeBudgetSnapshots'],
  },
  {
    sourceRel: 'src-ts/ems/heating-rod/heating-rod-decision.ts',
    mirrorRel: 'lib/ts-mirrors/ems/heating-rod/heating-rod-decision.js',
    exports: ['chooseLargestStageWithinBudget', 'isHeatingRodStorageReserveActive', 'evaluateHeatingRodDecision', 'buildHeatingRodLegacyRemovalPlan'],
  },
];

/** Code-Teil: fail — bricht mit klarer Fehlermeldung ab. */
function fail(message) {
  console.error(`[verify-ts-ems-mirrors] ERROR: ${message}`);
  process.exit(1);
}

/** Code-Teil: readRequired — liest Pflichtdateien und vereinheitlicht Zeilenenden. */
function readRequired(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Pflichtdatei fehlt: ${rel}`);
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/** Code-Teil: sourceHash — berechnet denselben Hash, den der Build in den Spiegel schreibt. */
function sourceHash(sourceRel) {
  return crypto.createHash('sha256').update(readRequired(sourceRel)).digest('hex');
}

/** Code-Teil: requireContains — prüft wichtige Kommentar- und Vertragsanker. */
function requireContains(rel, needle) {
  const text = readRequired(rel);
  if (!text.includes(needle)) fail(`${rel} enthält erwarteten Inhalt nicht: ${needle}`);
  return text;
}

/**
 * Code-Teil: verifyHash
 * Zweck: Prüft, ob der Spiegel zum aktuellen TypeScript-Quellstand passt.
 */
function verifyHash(spec) {
  const mirror = readRequired(spec.mirrorRel);
  const match = mirror.match(/Quell-Hash:\s*sha256:([a-f0-9]{64})/i);
  if (!match) fail(`${spec.mirrorRel} enthält keinen Quell-Hash.`);
  const expected = sourceHash(spec.sourceRel);
  const actual = String(match[1]).toLowerCase();
  if (actual !== expected) fail(`${spec.mirrorRel} ist nicht synchron zu ${spec.sourceRel}. Bitte npm run sync:ts-ems-mirrors ausführen.`);
}

/**
 * Code-Teil: verifyRuntimeExports
 *
 * Zweck:
 * Lädt die CommonJS-Spiegel mit Node und prüft kritische Fachregeln:
 * Speicherreserve reduziert PV-Budget, 0 W bleibt gültig und Heizstabstufen werden
 * ohne Rückfall auf falsche Defaults ausgewählt.
 */
function verifyRuntimeExports(spec) {
  const mod = require(path.join(root, spec.mirrorRel));
  for (const name of spec.exports) {
    if (typeof mod[name] !== 'function') fail(`${spec.mirrorRel} exportiert ${name} nicht als Funktion.`);
  }

  if (spec.mirrorRel.includes('utils/number')) {
    if (mod.toNumberOrNull('0') !== 0) fail('number Spiegel muss String "0" als Zahl 0 lesen.');
    if (mod.positiveWatt(-25) !== 0) fail('number Spiegel muss negative Watt-Werte auf 0 begrenzen.');
    if (mod.clampNumber(120, 0, 100) !== 100) fail('number Spiegel muss Werte begrenzen.');
  }

  if (spec.mirrorRel.endsWith('/core-budget.js')) {
    const snap = mod.buildCoreBudgetSnapshot({
      ts: 1,
      pvSurplusW: 5000,
      storageReserveW: 1000,
      alreadyReservedW: 500,
      storageSocPct: 20,
      storageReserveSocPct: 30,
      allowStorageDischarge: true,
      gridImportW: 5000,
      gridImportLimitW: 30000,
      allowGridImport: true,
    });
    if (snap.storageReserveActive !== true) fail('core-budget Spiegel muss aktive Speicherreserve erkennen.');
    if (snap.pv.effectiveW !== 3500) fail(`core-budget Spiegel erwartet PV effektiv 3500 W, ist ${snap.pv.effectiveW}.`);
    if (snap.grid.effectiveW !== 25000) fail(`core-budget Spiegel erwartet Grid effektiv 25000 W, ist ${snap.grid.effectiveW}.`);
    const zero = mod.calculatePvBudgetGate({ pvSurplusW: 0, storageReserveW: 0, alreadyReservedW: 0, allowStorageDischarge: true });
    if (zero.effectiveW !== 0 || zero.reason !== 'pv-surplus') fail('core-budget Spiegel muss 0 W PV-Budget als gültig behandeln.');
    const reservation = mod.computeCoreBudgetReservation({ remainingTotalW: 3000, remainingPvW: 2000, consumers: {}, order: [] }, { key: 'heatingRod', requestedW: 2500, reserveW: 2500, pvReserveW: 1500, pvOnly: true, mode: 'pvAuto' }, 10);
    if (!reservation || !reservation.entry || reservation.entry.grantW !== 2000) fail('core-reservation Spiegel muss PV-only Grant auf PV-Restbudget begrenzen.');
    if (reservation.nextRemainingTotalW !== 500 || reservation.nextRemainingPvW !== 500) fail('core-reservation Spiegel muss Restbudgets korrekt reduzieren.');
    if (reservation.flexUsedW !== 2500) fail('core-reservation Spiegel muss flexUsedW aus usedW berechnen.');
  }

  if (spec.mirrorRel.endsWith('/core-runtime.js')) {
    const flowW = mod.computeCorePvBudgetFlowRawW({ gridW: -3000, flexUsedW: 1000, storageChargeW: 2000 });
    if (flowW !== 6000) fail(`core-runtime Spiegel erwartet PV-Flow 6000 W, ist ${flowW}.`);
    const allocation = mod.buildCorePvAllocation({ totalW: 10000, mode: 'both', evcsSharePct: 80, storageEligible: true });
    if (allocation.evcsCapW !== 8000 || allocation.storageGuaranteedW !== 2000) fail('core-runtime Spiegel muss 80/20-PV-Aufteilung korrekt berechnen.');
    const grant = mod.computeCoreCentralBudgetGrant({
      remainingTotalW: 10000,
      remainingPvW: 9000,
      gates: { pvAllocation: { mode: 'both', evcsCapW: 8000 } },
    }, { key: 'evcs', requestedW: 10000, pvOnly: true });
    if (grant.grantW !== 8000 || grant.source !== 'ts-core-runtime-grant') fail('core-runtime Spiegel muss zentralen EVCS-Grant begrenzen.');
    const snapshot = mod.buildCoreRuntimeBudgetSnapshot({
      ts: 1,
      grid: { netW: -5000, usable: true, status: 'ok', source: 'signed', importLimitW: 40000 },
      pv: { measuredW: 12000, measuredFresh: true, reserveW: 500 },
      storage: { chargeW: 2000, dischargeW: 0, eligible: true, maxChargeW: 10000, socPct: 50, maxSocPct: 100 },
      consumers: { evcsUsedW: 3000, evcsPvUsedW: 3000 },
      allocation: { enabled: true, mode: 'both', evcsSharePct: 50 },
    });
    if (!snapshot.typedRuntime || snapshot.typedRuntime.productive !== true) fail('core-runtime Spiegel muss produktiven typisierten Snapshot markieren.');
    if (snapshot.gates.pv.effectiveW !== 9500) fail(`core-runtime Spiegel erwartet PV effektiv 9500 W, ist ${snapshot.gates.pv.effectiveW}.`);
  }

  if (spec.mirrorRel.includes('heating-rod')) {
    const device = {
      id: 'rod1',
      enabled: true,
      mode: 'auto',
      storageReserveW: 1000,
      storageReserveSocPct: 20,
      allowGridImport: false,
      allowStorageDischarge: true,
      stages: [
        { stage: 1, powerW: 1000 },
        { stage: 2, powerW: 2000 },
        { stage: 3, powerW: 3000 },
      ],
    };
    const decision = mod.evaluateHeatingRodDecision({ ts: 1, device, availablePvW: 2500, availableTotalW: 10000, storageSocPct: 55 });
    if (decision.targetStage !== 2 || decision.targetPowerW !== 2000) fail('heating-rod Spiegel muss größte passende Stufe wählen.');
    const blocked = mod.evaluateHeatingRodDecision({ ts: 1, device, availablePvW: 5000, availableTotalW: 10000, storageSocPct: 10 });
    if (blocked.targetStage !== 0 || blocked.reason !== 'storage-reserve') fail('heating-rod Spiegel muss bei Speicherreserve blockieren.');
  }
}

function main() {
  const pkg = JSON.parse(readRequired('package.json'));
  const scripts = pkg.scripts || {};
  for (const name of ['sync:ts-ems-mirrors', 'check:ts-ems-mirrors', 'test:ems-mirrors']) {
    if (!scripts[name]) fail(`package.json scripts.${name} fehlt.`);
  }
  requireContains('tsconfig.ems-mirrors.json', 'src-ts/ems/core-limits/core-budget.ts');
  requireContains('tsconfig.ems-mirrors.json', 'src-ts/ems/core-limits/core-runtime.ts');
  requireContains('scripts/build-ts-ems-mirrors.js', 'Code-Teil: checkMirrorIsCurrent');
  requireContains('scripts/build-ts-ems-mirrors.js', 'Code-Teil: writeRuntimeMirror');

  for (const spec of mirrorSpecs) {
    requireContains(spec.sourceRel, 'Code-Teil:');
    requireContains(spec.mirrorRel, 'AUTO-GENERATED FILE');
    requireContains(spec.mirrorRel, 'Quell-Hash: sha256:');
    verifyHash(spec);
    verifyRuntimeExports(spec);
  }

  console.log('[verify-ts-ems-mirrors] OK: EMS-TS->JS-Spiegel sind synchron und lauffähig.');
}

main();
