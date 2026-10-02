#!/usr/bin/env node
'use strict';

/**
 * RC78 / 0.8.203: Die Netzanschlussgrenze gilt ausschließlich für Bezug.
 * Einspeisung am signierten NVP erhöht die nutzbare Lastfreigabe; ein
 * Überbezug reduziert bereits laufende flexible Verbraucher aktiv.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const typedCore = require(path.join(root, 'lib/ts-mirrors/ems/core-limits/core-runtime.js'));

function read(p) { return fs.readFileSync(p, 'utf8'); }
function must(file, needle, label) {
  const source = read(file);
  if (!source.includes(needle)) {
    console.error(`[grid-cap-sanity] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(file, needle, label) {
  const source = read(file);
  if (source.includes(needle)) {
    console.error(`[grid-cap-sanity] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const cm = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
const core = 'src-ts/runtime-executables/ems/modules/core-limits.ts';
const typedCoreSource = 'src-ts/ems/core-limits/core-runtime.ts';

must(cm, 'gridBaseLoadRawW = gridW - gridEvcsActualForCapW;', 'rohe Grundlastdiagnose');
must(cm, 'derived.core.building.loadRestW', 'Energiefluss-Grundlastdiagnose');
must(cm, 'gridLocalSupportW = Math.max(0, gridBaseLoadW - gridBaseLoadRawW);', 'lokale Deckung inkl. Export');
must(cm, 'hardLimitW: gridImportLimitEffW', 'wirksame Hard-Importgrenze');
must(cm, 'gridIncrementHeadroomW = gridEnvelope.progressiveIncrementW;', 'progressiver NVP-Inkrement-Headroom');
must(cm, 'gridCapEvcsW = clamp(gridEnvelope.maxControlledLoadW, 0, 1e12);', 'EVCS-Gesamtzielcap');
must(cm, 'resolveCurrentNvpSnapshot(', 'kanonischer NVP-Snapshot');
must(core, "'chargingManagement.control.actualW'", 'frische EVCS-Istleistung');
must(core, "'thermal.summary.appliedTotalW'", 'Thermik-Istleistung');
must(core, "'heatingRod.summary.currentHeatingRodW'", 'Heizstab-Istleistung');
must(core, 'const currentControlledLoadW = Math.max(0, flexActualW + storageControlledChargeW);', 'aktuelle geregelte Last');
must(core, 'gridLimitW > 0 ? gridLimitW - gridControlW : Number.POSITIVE_INFINITY', 'signierter zentraler Inkrement-Headroom');
must(core, 'gridLimitW > 0 ? Math.max(0, currentControlledLoadW + gridIncrementHeadroomW) : Number.POSITIVE_INFINITY', 'zentrales Gesamtzielbudget');
must(typedCoreSource, 'gridLimitW > 0 ? gridLimitW - gridW : Number.POSITIVE_INFINITY', 'typisierter signierter Inkrement-Headroom');
must(typedCoreSource, 'currentControlledLoadW + gridIncrementHeadroomW', 'typisiertes Gesamtzielbudget');
mustNot(cm, 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW);', 'alter harte Cap auf Anschlusswert');
mustNot(core, 'gridLimitW - gridImportW + flexUsedW', 'alte Import-only-Verlustformel');
mustNot(core, 'Math.min(gridLimitW, gridHeadroomRawW)', 'alter Deckel auf Anschlusswert');

// Feldfall aus dem Screenshot: 30 kW Bezugsgrenze, 10,1 kW Einspeisung,
// aktuell 0 W flexible Istlast. Die EVCS-Freigabe muss 40,1 kW betragen.
const screenshotLimitW = 30000;
const screenshotNvpW = -10100;
const screenshotEvcsActualW = 0;
const screenshotIncrementW = screenshotLimitW - screenshotNvpW;
const screenshotEvcsCapW = clamp(screenshotEvcsActualW + screenshotIncrementW, 0, 1e12);
if (screenshotIncrementW !== 40100 || screenshotEvcsCapW !== 40100) {
  console.error('[grid-cap-sanity] Einspeise-Feldfall fehlgeschlagen', { screenshotIncrementW, screenshotEvcsCapW });
  process.exit(1);
}

// Zentrales Gesamtbudget: 11,0 kW EVCS-Reservierung + 9,3 kW
// Speicherreservierung werden erst danach abgezogen.
const currentControlledLoadW = 0;
const totalControlledAllowanceW = Math.max(0, currentControlledLoadW + screenshotIncrementW);
const remainingW = totalControlledAllowanceW - 11000 - 9300;
if (totalControlledAllowanceW !== 40100 || remainingW !== 19800) {
  console.error('[grid-cap-sanity] Zentrales Feldbudget fehlgeschlagen', { totalControlledAllowanceW, remainingW });
  process.exit(1);
}

// Der produktive typisierte Core muss denselben Feldfall rechnen; bloße
// Textprüfung reicht für diese sicherheitsrelevante Korrektur nicht aus.
const fieldSnapshot = typedCore.buildCoreRuntimeBudgetSnapshot({
  ts: 1,
  grid: {
    netW: screenshotNvpW,
    usable: true,
    status: 'ok',
    source: 'rc78-field-test',
    importLimitW: screenshotLimitW,
  },
  pv: { measuredW: 10800, measuredFresh: true, reserveW: 0 },
  storage: {
    chargeW: 0,
    dischargeW: 0,
    writerActive: true,
    eligible: true,
    maxChargeW: 30000,
    socPct: 100,
    maxSocPct: 100,
  },
  consumers: {
    evcsUsedW: 11000,
    evcsActualW: 0,
    evcsPvUsedW: 0,
    thermalUsedW: 0,
    thermalActualW: 0,
    heatingRodUsedW: 0,
    heatingRodActualW: 0,
  },
  allocation: { enabled: true, mode: 'both', evcsSharePct: 50 },
});
assert.strictEqual(fieldSnapshot.raw.gridW, -10100);
assert.strictEqual(fieldSnapshot.raw.gridImportW, 0);
assert.strictEqual(fieldSnapshot.raw.gridExportW, 10100);
assert.strictEqual(fieldSnapshot.raw.currentControlledLoadW, 0);
assert.strictEqual(fieldSnapshot.gates.grid.incrementHeadroomW, 40100);
assert.strictEqual(fieldSnapshot.gates.grid.headroomW, 40100);
assert.strictEqual(fieldSnapshot.gates.total.effectiveW, 40100);
assert.strictEqual(fieldSnapshot.gates.total.binding, 'grid-monitor');

const reservationState = typedCore.createCoreRuntimeReservationState(fieldSnapshot);
const reservationSequence = typedCore.applyCoreRuntimeReservationSequence(reservationState, [
  { key: 'evcs', app: 'evcs', requestedW: 11000, reserveW: 11000, actualW: 0 },
  { key: 'storage', app: 'storage', requestedW: 9300, reserveW: 9300, actualW: 0 },
], 2);
assert.strictEqual(reservationSequence.state.remainingTotalW, 19800);
assert.strictEqual(reservationSequence.flexUsedW, 20300);

// Überbezug: 32 kW NVP, 10 kW laufende flexible Istlast, 30 kW Grenze.
// Der Zielwert muss auf 8 kW sinken und damit 2 kW Last abwerfen.
const overImportAllowanceW = Math.max(0, 10000 + 30000 - 32000);
if (overImportAllowanceW !== 8000) {
  console.error('[grid-cap-sanity] Überbezugsabbau fehlgeschlagen', { overImportAllowanceW });
  process.exit(1);
}
const overImportSnapshot = typedCore.buildCoreRuntimeBudgetSnapshot({
  ts: 3,
  grid: { netW: 32000, usable: true, status: 'ok', source: 'rc78-over-import', importLimitW: 30000 },
  pv: { measuredW: 0, measuredFresh: true, reserveW: 0 },
  storage: { chargeW: 0, dischargeW: 0, writerActive: false },
  consumers: { evcsUsedW: 10000, evcsActualW: 10000 },
  allocation: { enabled: true, mode: 'both', evcsSharePct: 50 },
});
assert.strictEqual(overImportSnapshot.gates.grid.incrementHeadroomW, -2000);
assert.strictEqual(overImportSnapshot.gates.total.effectiveW, 8000);

console.log('[grid-cap-sanity] OK: NVP-Einspeisung erhöht die Lastfreigabe; die Anschlussgrenze begrenzt ausschließlich Netzbezug.');
