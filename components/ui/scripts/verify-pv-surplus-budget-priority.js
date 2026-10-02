#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.94: Gemeinsame PV-Ueberschuss-Prioritaet fuer Speicher und EVCS.
 *
 * Der Test stellt sicher, dass die Kundenauswahl ausschliesslich innerhalb der
 * zentralen EMS-Budgetlogik wirkt und keine zweite Parallelregelung entsteht.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { buildPvSurplusAllocation, normalizePvSurplusPriority, computePvBudgetFlowRawW } = require('../ems/modules/core-limits');
const { SpeicherRegelungModule } = require('../ems/modules/storage-control');

assert.strictEqual(normalizePvSurplusPriority('Speicher'), 'storage');
assert.strictEqual(normalizePvSurplusPriority('wallbox'), 'emobility');
assert.strictEqual(normalizePvSurplusPriority('unbekannt'), 'both');


// Das zentrale PV-Budget muss den signierten NVP verwenden. Bei 5,9 kW
// Netzbezug duerfen 8,1 kW EVCS + 8,4 kW Speicherladung nicht als 16,5 kW
// PV-Ueberschuss gelten; der Netzbezug wird abgezogen und es bleiben 10,6 kW.
assert.strictEqual(computePvBudgetFlowRawW({
  gridW: 5900,
  flexUsedW: 8100,
  storageChargeW: 8400,
  storageDischargeW: 0,
}), 10600, 'Netzbezug muss aus dem rekonstruierten PV-Budget herausgerechnet werden');
assert.strictEqual(computePvBudgetFlowRawW({
  gridW: -2500,
  flexUsedW: 8100,
  storageChargeW: 0,
  storageDischargeW: 0,
}), 10600, 'NVP-Export plus EVCS-PV-Nutzung muss denselben physikalischen PV-Ueberschuss ergeben');
assert.strictEqual(computePvBudgetFlowRawW({
  gridW: 10000,
  flexUsedW: 10000,
  storageChargeW: 0,
  storageDischargeW: 0,
}), 0, 'Reiner Netzbezug darf kein PV-Budget erzeugen');

const storageFirst = buildPvSurplusAllocation(10000, 'storage', 50, {
  storageEligible: true,
  storageMaxChargeW: 6000,
});
assert.strictEqual(storageFirst.storageGuaranteedW, 6000, 'Speicher zuerst muss die ladbare Speicherleistung reservieren');
assert.strictEqual(storageFirst.evcsCapW, 4000, 'EVCS bekommt bei Speicher zuerst den physikalischen Rest');

const evFirst = buildPvSurplusAllocation(10000, 'emobility', 50, {
  storageEligible: true,
  storageMaxChargeW: 6000,
});
assert.strictEqual(evFirst.storageGuaranteedW, 0, 'E-Mobilitaet zuerst darf vorab keinen Speicheranteil blockieren');
assert.strictEqual(evFirst.evcsCapW, 10000, 'E-Mobilitaet zuerst muss das volle PV-Budget sehen');

const shared = buildPvSurplusAllocation(10000, 'both', 40, {
  storageEligible: true,
  storageMaxChargeW: 10000,
});
assert.strictEqual(shared.evcsCapW, 4000, '40 Prozent E-Mobilitaet muessen 4 kW EVCS-Cap ergeben');
assert.strictEqual(shared.storageGuaranteedW, 6000, 'der verbleibende Anteil muss dem Speicher offenstehen');

const unavailableStorage = buildPvSurplusAllocation(10000, 'storage', 50, {
  storageEligible: false,
  storageMaxChargeW: 6000,
});
assert.strictEqual(unavailableStorage.evcsCapW, 10000, 'nicht ladbarer Speicher darf PV nicht vor der Wallbox blockieren');
assert.strictEqual(unavailableStorage.storageGuaranteedW, 0);

const limitedStorage = buildPvSurplusAllocation(10000, 'both', 40, {
  storageEligible: true,
  storageMaxChargeW: 2000,
});
assert.strictEqual(limitedStorage.storageGuaranteedW, 2000, 'Speicherlimit muss den garantierten Speicheranteil begrenzen');
assert.strictEqual(limitedStorage.evcsCapW, 8000, 'nicht nutzbarer Speicheranteil muss der E-Mobilitaet zugutekommen');


/**
 * Code-Teil: FakeDp / runStorageBudgetTick
 * Zweck: Fuehrt den echten Speicher-Tick mit einem begrenzten zentralen
 * PV-Restbudget aus. Damit prueft der Regressionstest nicht nur Textmuster,
 * sondern auch den produktiven Cap- und Reservierungspfad.
 */
class FakeDp {
  constructor(entries) {
    this.entries = entries || {};
    this.writes = [];
  }
  getEntry(key) { return this.entries[key] || null; }
  getAgeMs(key) {
    const rec = this.entries[key];
    return rec && typeof rec.ts === 'number' ? Math.max(0, Date.now() - rec.ts) : null;
  }
  getNumberFresh(key, staleMs, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const age = this.getAgeMs(key);
    if (age !== null && Number.isFinite(Number(staleMs)) && age > Number(staleMs)) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getNumber(key, fallback = null) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    const n = Number(rec.val);
    return Number.isFinite(n) ? n : fallback;
  }
  getBoolean(key, fallback = false) {
    const rec = this.entries[key];
    if (!rec) return fallback;
    return rec.val === true || rec.val === 1 || rec.val === '1' || rec.val === 'true';
  }
  async writeNumber(key, value) {
    this.writes.push({ key, value: Number(value) });
    return true;
  }
  async writeBoolean(key, value) {
    this.writes.push({ key, value: !!value });
    return true;
  }
  lastTarget() {
    const rows = this.writes.filter((row) => row.key === 'st.targetPowerW');
    return rows.length ? rows[rows.length - 1].value : null;
  }
}

function testEntry(val, objectId) {
  return { val, objectId, ts: Date.now() };
}

async function runStorageBudgetTick({ gridW, remainingPvW, lastTargetW = null, lastSource = '' }) {
  const reservations = [];
  const states = new Map();
  const adapter = {
    config: {
      enableStorageControl: true,
      enableStorageFarm: false,
      enableMultiUse: false,
      enablePeakShaving: false,
      enableGridConstraints: false,
      storage: {
        controlMode: 'targetPower',
        staleTimeoutSec: 15,
        maxDeltaWPerTick: 10000,
        pvMaxDeltaWPerTick: 10000,
        stepW: 1,
        pvEnabled: true,
        pvExportThresholdW: 50,
        selfTargetGridImportW: 50,
        selfImportThresholdW: 50,
        selfMinSocPct: 20,
        selfMaxSocPct: 100,
      },
    },
    stateCache: {},
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async setObjectNotExistsAsync() {},
    async setStateAsync(id, val) { states.set(id, { val, ts: Date.now() }); },
    async getStateAsync(id) { return states.get(id) || null; },
    _nwGetNumberFromCache() { return null; },
    _emsBudget: {
      ts: Date.now(),
      gates: { pvAllocation: { mode: 'both', evcsSharePct: 50 } },
      remainingPvW,
      getPvGrant(req = {}) {
        const requestedW = Number.isFinite(Number(req.requestedW)) ? Math.max(0, Number(req.requestedW)) : Number.MAX_SAFE_INTEGER;
        return { grantW: Math.min(requestedW, Math.max(0, Number(this.remainingPvW) || 0)), source: 'central-ems-budget' };
      },
      reserve(req) {
        reservations.push({ ...req });
        this.remainingPvW = Math.max(0, Number(this.remainingPvW || 0) - Math.max(0, Number(req && req.pvReserveW) || 0));
      },
    },
  };
  const dp = new FakeDp({
    'grid.powerW': testEntry(gridW, 'grid.filtered'),
    'grid.powerRawW': testEntry(gridW, 'grid.raw'),
    'st.socPct': testEntry(50, 'storage.soc'),
    'st.targetPowerW': testEntry(0, 'storage.target'),
  });
  const mod = new SpeicherRegelungModule(adapter, dp);
  if (lastTargetW !== null) mod._lastTargetW = lastTargetW;
  mod._lastSource = lastSource;
  await mod.tick();
  return { targetW: dp.lastTarget(), reservations, states };
}

const html = fs.readFileSync(path.join(root, 'www/settings.html'), 'utf8');
assert(html.includes('data-settings-page-target="pv-surplus"'), 'Kundeneinstellungen brauchen einen eigenen PV-Ueberschuss-Reiter');
assert(html.includes('data-settings-panel="pv-surplus"'), 'PV-Ueberschuss-Panel fehlt');
assert(html.includes('data-key="pvSurplusPriority"'), 'Prioritaetsauswahl fehlt');
assert(html.includes('data-key="pvSurplusEvcsSharePct"'), 'EVCS-Anteil fuer gemeinsame Verteilung fehlt');

const coreSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/core-limits.ts'), 'utf8');
assert(coreSource.includes('gates: {'), 'zentraler Budget-Snapshot fehlt');
assert(coreSource.includes('computePvBudgetFlowRawW({'), 'PV-Budget muss den signierten NVP ueber die gemeinsame Rekonstruktionsfunktion beruecksichtigen');
assert(coreSource.includes('pvAllocation: pvAllocationGate'), 'PV-Verteilung muss im zentralen Gate liegen');
assert(coreSource.includes("for (const key of ['evcs', 'storage', 'thermal', 'heatingRod', 'generic'])"), 'Speicher muss als zentraler Budgetverbraucher registriert sein');

const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
assert(chargingSource.includes('(-gridW) + pvEvcsUsedW + storageChargeNowW - storageDischargeNowW'), 'EVCS-PV-Rekonstruktion muss laufende Speicherladung zurueckrechnen');
assert(chargingSource.includes('resolveChargingPvBudgetControl'), 'Wallbox-Regelung muss das zentrale Budget als autoritative Quelle aufloesen');
assert(chargingSource.includes('getPvGrant'), 'Wallbox-Regelung muss den zentralen EVCS-PV-Grant verwenden');
assert(chargingSource.includes('pvCapAllocatedW'), 'Wallbox-PV-Cap muss durch die Kundenauswahl begrenzt werden');
assert(chargingSource.includes("typeof this.adapter._nwGetStorageControlAuthority === 'function'"), 'Wallbox-PV-Rekonstruktion muss die zentrale Speichertopologie verwenden');
assert(chargingSource.includes("this.adapter._nwResolveBatteryFlowFromCache({ maxAgeMs: storageFlowMaxAgeMs, deadbandW: 25 })"), 'Wallbox-PV-Rekonstruktion muss den zentralen Speicherfluss verwenden');
assert(!chargingSource.includes("getFirstDpNumber(['st.batteryPowerW', 'ps.batteryW'])"), 'Peak-Shaving-DP darf nicht mehr als topologieblinder Speicherfallback dienen');

const storageSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
assert(storageSource.includes("key: 'storage'"), 'Speicher muss seinen PV-Anteil zentral reservieren');
assert(storageSource.includes('zentrales PV-Restbudget'), 'Speicherladung muss auf das nach EVCS verbleibende PV-Budget begrenzt sein');

const mainSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/main.ts'), 'utf8');
assert(mainSource.includes("pvSurplusPriority: { type: 'string', role: 'text', def: 'both' }"), 'Default-State fuer PV-Prioritaet fehlt');
assert(mainSource.includes("pvSurplusEvcsSharePct: { type: 'number', role: 'value.percent', def: 50 }"), 'Default-State fuer EVCS-Anteil fehlt');

(async () => {
  const capped = await runStorageBudgetTick({ gridW: -5000, remainingPvW: 2000 });
  assert.strictEqual(capped.targetW, -2000, `Speicher muss auf das nach EVCS verbleibende PV-Budget begrenzt werden: ${capped.targetW}`);
  assert.strictEqual(capped.reservations.length, 1, 'Speicher muss den final genutzten PV-Anteil zentral reservieren');
  assert.strictEqual(capped.reservations[0].key, 'storage');
  assert.strictEqual(capped.reservations[0].pvReserveW, 2000);

  const heldButShared = await runStorageBudgetTick({
    gridW: 50,
    remainingPvW: 1500,
    lastTargetW: -5000,
    lastSource: 'pv',
  });
  assert.strictEqual(heldButShared.targetW, -1500, 'NVP-Hold darf die zentrale PV-Verteilung nicht uebergehen');

  console.log('[pv-surplus-budget-priority] OK: Speicher und E-Mobilitaet teilen PV-Ueberschuss ueber das zentrale EMS-Budget und die Kundeneinstellungen.');
})().catch((err) => {
  console.error('[pv-surplus-budget-priority] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
