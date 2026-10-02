#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.105:
 * - Die EVCS-Infrastrukturgrenze summiert alle aktivierten, steuerbaren Ladepunkte.
 * - Gemeinsame Stationslimits reduzieren nur die betroffene Stationssumme.
 * - Ein alter 11-kW-Einzelwert begrenzt den Engine-Modus nicht mehr global.
 * - Reicht das bereits NVP-/Phasen-/§14a-sichere Budget für alle technischen
 *   Mindestleistungen, bleiben alle Auto-/Boost-/Min+PV-Ladepunkte aktiv.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {
  EmsEngine,
  computeChargingInfrastructureCapacity,
} = require(path.join(root, 'ems/engine'));
const {
  computeChargingMinimumServicePlan,
} = require(path.join(root, 'ems/modules/charging-management'));
const {
  resolveAcChargingLimits,
  deriveChargingConnectorCapacityW,
} = require(path.join(root, 'ems/charging-budget-helpers'));

function connector(index, options = {}) {
  return {
    index,
    name: options.name || `LP${index}`,
    enabled: options.enabled !== false,
    phases: options.phases === 1 ? 1 : 3,
    voltageV: options.voltageV || 230,
    minCurrentA: options.minCurrentA === undefined ? 6 : options.minCurrentA,
    maxCurrentA: options.maxCurrentA === undefined ? 16 : options.maxCurrentA,
    maxPowerW: options.maxPowerW || 0,
    stationKey: options.stationKey || '',
    controlPreference: options.controlPreference || 'currentA',
    setCurrentAId: options.setCurrentAId === false ? '' : `test.lp${index}.setA`,
    setPowerWId: options.setPowerWId || '',
  };
}

function buildEngineConfig({ wallboxes, stationGroups = [], chargingManagement = {}, ratedKw = 11 }) {
  const adapter = {
    config: {
      settingsConfig: { evcsMaxPowerKw: ratedKw, stationGroups },
      chargingManagement,
      datapoints: {},
    },
    evcsList: wallboxes,
  };
  return EmsEngine.prototype._buildChargingConfig.call({
    adapter,
    _gridPowerId: 'nexowatt-ui.0.ems.gridPowerW',
  }).chargingCfg;
}

// Vier unabhängige 11-kW-Ladepunkte ergeben eine Gesamtinfrastruktur von rund 44 kW.
{
  const wallboxes = [1, 2, 3, 4].map((index) => connector(index));
  const cfg = buildEngineConfig({
    wallboxes,
    // Legacy-Rest aus alten Installationen: darf im Engine-Modus nicht mehr
    // die gesamte Ladeinfrastruktur auf einen Port begrenzen.
    chargingManagement: { totalBudgetMode: 'engine', staticMaxChargingPowerW: 11000 },
  });
  assert.strictEqual(cfg.infrastructureWallboxCount, 4);
  assert.strictEqual(cfg.infrastructureRawCapacityW, 44160);
  assert.strictEqual(cfg.infrastructureCapacityW, 44160);
  assert.strictEqual(cfg.staticMaxChargingPowerW, 44160);
}

// Ohne explizite Portgrenze wird die AppCenter-Nennleistung je Ladepunkt verwendet.
{
  const wallboxes = [1, 2, 3, 4].map((index) => connector(index, {
    maxCurrentA: 0,
    maxPowerW: 0,
  }));
  const cfg = buildEngineConfig({ wallboxes, ratedKw: 11 });
  assert.strictEqual(cfg.infrastructureRawCapacityW, 44000);
  assert.strictEqual(cfg.staticMaxChargingPowerW, 44000);
}

// Alte controlPreference=none/off-Einträge dürfen einen vorhandenen
// Sollwert-DP nicht länger als versteckte Deaktivierung behandeln. Die sichtbare
// Checkbox "Aktiv (Regelung)" bleibt der einzige Abschalter.
{
  const wallboxes = [connector(1, { controlPreference: 'none' })];
  const cfg = buildEngineConfig({ wallboxes, ratedKw: 11 });
  assert.strictEqual(cfg.infrastructureWallboxCount, 1);
  assert.strictEqual(cfg.infrastructureCapacityW, 11040);
  assert.notStrictEqual(cfg.wallboxes[0].controlBasis, 'none');
}

// AppCenter-Maximalstrom und -Maximalleistung sind gleichwertige lokale
// Obergrenzen. Bei beiden Angaben gilt die strengere; bei nur einer Angabe wird
// die jeweils andere Größe sauber abgeleitet.
{
  const powerOnly = resolveAcChargingLimits({ phases: 3, voltageV: 230, maxPowerW: 11000, defaultMaxA: 32, defaultMinA: 6, controlBasis: 'currentA' });
  assert.strictEqual(Math.round(powerOnly.maxPowerW), 11000);
  assert(Math.abs(powerOnly.maxA - (11000 / 690)) < 0.001);

  const currentOnly = resolveAcChargingLimits({ phases: 3, voltageV: 230, maxA: 16, defaultMaxA: 32, defaultMinA: 6, controlBasis: 'currentA' });
  assert.strictEqual(Math.round(currentOnly.maxPowerW), 11040);

  const powerTighter = deriveChargingConnectorCapacityW({
    enabled: true,
    chargerType: 'ac',
    controlBasis: 'currentA',
    setCurrentAId: 'test.lp.setA',
    phases: 3,
    voltageV: 230,
    maxA: 32,
    maxPowerW: 11000,
  }, 22000);
  assert.strictEqual(powerTighter, 11000, 'Infrastruktur ignoriert die strengere Maximalleistung.');

  const currentTighter = deriveChargingConnectorCapacityW({
    enabled: true,
    chargerType: 'ac',
    controlBasis: 'currentA',
    setCurrentAId: 'test.lp.setA',
    phases: 3,
    voltageV: 230,
    maxA: 10,
    maxPowerW: 11000,
  }, 22000);
  assert.strictEqual(currentTighter, 6900, 'Infrastruktur ignoriert den strengeren Maximalstrom.');
}

// Zwei 22-kW-Ports teilen sich eine 22-kW-Station; zwei weitere 11-kW-Ports
// bleiben unabhängig. Roh = 66 kW, wirksam = 44 kW.
{
  const wallboxes = [
    connector(1, { maxCurrentA: 32, maxPowerW: 22000, stationKey: 'station_a', setPowerWId: 'test.lp1.setW', setCurrentAId: false }),
    connector(2, { maxCurrentA: 32, maxPowerW: 22000, stationKey: 'station_a', setPowerWId: 'test.lp2.setW', setCurrentAId: false }),
    connector(3, { maxPowerW: 11000, setPowerWId: 'test.lp3.setW', setCurrentAId: false }),
    connector(4, { maxPowerW: 11000, setPowerWId: 'test.lp4.setW', setCurrentAId: false }),
  ];
  const capacity = computeChargingInfrastructureCapacity({
    wallboxes: buildEngineConfig({ wallboxes, stationGroups: [{ stationKey: 'station_a', maxPowerKw: 22 }] }).wallboxes,
    stationGroups: [{ stationKey: 'station_a', maxPowerW: 22000 }],
    fallbackPerConnectorW: 11000,
  });
  assert.deepStrictEqual(
    { raw: capacity.rawCapacityW, effective: capacity.effectiveCapacityW, count: capacity.wallboxCount },
    { raw: 66000, effective: 44000, count: 4 },
  );
}

// Ein bewusst gewählter Static-Modus darf weiterhin eine feste Gesamtgrenze setzen.
{
  const wallboxes = [1, 2, 3, 4].map((index) => connector(index));
  const cfg = buildEngineConfig({
    wallboxes,
    chargingManagement: { totalBudgetMode: 'static', staticMaxChargingPowerW: 11000 },
  });
  assert.strictEqual(cfg.staticMaxChargingPowerW, 11000);
}

function normalizedWallbox(safe, mode, stationKey = '', stationMaxPowerW = 0) {
  return {
    safe,
    enabled: true,
    online: true,
    vehiclePlugged: true,
    controlBasis: 'currentA',
    effectiveMode: mode,
    minPW: 4140,
    maxPW: 11040,
    stationKey,
    stationMaxPowerW,
  };
}

function simulateMinimumFirst(wallboxes, budgetW, stationCaps = new Map()) {
  const plan = computeChargingMinimumServicePlan({ wallboxes, totalBudgetW: budgetW, stationCaps });
  let remainingW = budgetW;
  const stationRemaining = new Map(stationCaps);
  const targets = [];
  for (const wallbox of wallboxes) {
    const isBoost = String(wallbox.effectiveMode || '').toLowerCase() === 'boost';
    const preserveFutureMinimum = plan.preserveAll && !isBoost;
    const futureW = preserveFutureMinimum ? (plan.futureMinimumBySafe.get(wallbox.safe) || 0) : 0;
    const futureStationW = preserveFutureMinimum ? (plan.futureStationMinimumBySafe.get(wallbox.safe) || 0) : 0;
    const totalAvailW = Math.max(0, remainingW - futureW);
    const stationAvailRawW = wallbox.stationKey && stationRemaining.has(wallbox.stationKey)
      ? stationRemaining.get(wallbox.stationKey)
      : Number.POSITIVE_INFINITY;
    const stationAvailW = Number.isFinite(stationAvailRawW)
      ? Math.max(0, stationAvailRawW - futureStationW)
      : Number.POSITIVE_INFINITY;
    const rawTargetW = Math.min(totalAvailW, stationAvailW, wallbox.maxPW);
    const targetW = rawTargetW + 1e-6 >= wallbox.minPW ? rawTargetW : 0;
    targets.push(targetW);
    remainingW = Math.max(0, remainingW - targetW);
    if (wallbox.stationKey && stationRemaining.has(wallbox.stationKey)) {
      stationRemaining.set(wallbox.stationKey, Math.max(0, stationRemaining.get(wallbox.stationKey) - targetW));
    }
  }
  return { plan, targets };
}

// Feldszenario: 40-kW-NVP, ca. 5,6-kW-Grundlast => rund 34,4 kW EVCS-Headroom.
// Vier verbundene Ladepunkte: Boost erhält zuerst seine volle lokale Leistung.
// Reicht der verbleibende harte Grant danach noch für die anderen technischen
// Minima, bleiben diese ebenfalls aktiv.
{
  const wallboxes = [
    normalizedWallbox('lp1', 'boost'),
    normalizedWallbox('lp2', 'minpv'),
    normalizedWallbox('lp3', 'auto'),
    normalizedWallbox('lp4', 'minpv'),
  ];
  const { plan, targets } = simulateMinimumFirst(wallboxes, 34400);
  assert.strictEqual(plan.preserveAll, true);
  assert.strictEqual(plan.totalMinimumW, 16560);
  assert.strictEqual(targets.reduce((sum, value) => sum + value, 0), 34400);
  assert.strictEqual(targets[0], 11040, 'Boost erreicht trotz ausreichendem Hard-Grant nicht die konfigurierte Ladepunktleistung.');
  for (const targetW of targets) {
    assert(targetW >= 4140, `Ladepunkt wurde trotz ausreichendem NVP-Budget abgeschaltet: ${targets.join(', ')}`);
  }
}

// Stationslimits bleiben gleichzeitig verbindlich. Boost nutzt innerhalb der
// gemeinsamen Station zuerst den maximal zulässigen Stationsgrant; ein weiterer
// Port derselben Station bleibt dann bei 0, während ein unabhängiger Port sein
// verbleibendes Gesamtbudget erhält.
{
  const wallboxes = [
    normalizedWallbox('station_lp1', 'boost', 'station_a', 9000),
    normalizedWallbox('station_lp2', 'minpv', 'station_a', 9000),
    normalizedWallbox('free_lp3', 'auto'),
  ];
  const stationCaps = new Map([['station_a', 9000]]);
  const { plan, targets } = simulateMinimumFirst(wallboxes, 20000, stationCaps);
  assert.strictEqual(plan.preserveAll, true);
  assert.strictEqual(targets[0], 9000, `Boost nutzt das Stationslimit nicht vollständig: ${targets.join(', ')}`);
  assert.strictEqual(targets[1], 0, `Niedriger priorisierter Port überschreitet das bereits von Boost belegte Stationslimit: ${targets.join(', ')}`);
  assert(targets[2] >= 4140, `Unabhängiger Ladepunkt verliert trotz Restbudget seine Mindestversorgung: ${targets.join(', ')}`);
  assert(targets[0] + targets[1] <= 9000, 'Stationslimit wurde überschritten.');
  assert(targets.reduce((sum, value) => sum + value, 0) <= 20000, 'Gesamtbudget wurde überschritten.');
}

// Aus und reines PV-Laden dürfen keine Netz-/Mindestreservierung erhalten.
{
  const plan = computeChargingMinimumServicePlan({
    totalBudgetW: 11000,
    wallboxes: [
      normalizedWallbox('off_lp', 'off'),
      normalizedWallbox('pv_lp', 'pv'),
      normalizedWallbox('auto_lp', 'auto'),
    ],
  });
  assert.strictEqual(plan.eligibleCount, 1);
  assert.strictEqual(plan.minimumBySafe.get('off_lp'), 0);
  assert.strictEqual(plan.minimumBySafe.get('pv_lp'), 0);
  assert.strictEqual(plan.minimumBySafe.get('auto_lp'), 4140);
}

// Ist das sichere Budget kleiner als die Summe aller Minima, darf keine
// Scheinsicherheit entstehen. Dann bleibt die bestehende Prioritätsabschaltung aktiv.
{
  const wallboxes = [
    normalizedWallbox('lp1', 'boost'),
    normalizedWallbox('lp2', 'minpv'),
    normalizedWallbox('lp3', 'auto'),
    normalizedWallbox('lp4', 'minpv'),
  ];
  const plan = computeChargingMinimumServicePlan({ wallboxes, totalBudgetW: 15000 });
  assert.strictEqual(plan.preserveAll, false);
}

// Quellvertrag: Die produktive Runtime muss die faire Restleistung tatsächlich
// vor Min+PV/Auto/Boost anwenden und die Infrastrukturdiagnose veröffentlichen.
{
  const chargingSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/charging-management.ts'), 'utf8');
  const engineSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/engine.ts'), 'utf8');
  assert(chargingSource.includes('const fairTotalAvailW = Number.isFinite(totalAvailW)'));
  assert(chargingSource.includes('totalAvailableW: fairTotalAvailW'));
  assert(chargingSource.includes('minimumServicePreserved'));
  assert(chargingSource.includes('minimumServicePlan.preserveAll && !isBoost'), 'Boost bewahrt weiterhin spätere Mindestreservierungen und erreicht dadurch nicht seinen maximalen Hard-Grant.');
  assert(chargingSource.includes('resolveAcChargingLimits({'), 'Produktive Runtime löst Maximalstrom und Maximalleistung nicht gemeinsam auf.');
  assert(engineSource.includes('computeChargingInfrastructureCapacity'));
  assert(engineSource.includes("controlBasis = (setCurrentAId || setPowerWId) ? 'auto' : 'none'"), 'Legacy controlPreference=none wird trotz Sollwert-DP weiterhin als nicht steuerbar gezählt.');
  assert(engineSource.includes('staticMaxChargingPowerW: infrastructureCapacityW'));
}

console.log('[charging-infrastructure-budget] OK: Portsumme, Stationscaps, NVP-Headroom und Mindestversorgung arbeiten gemeinsam.');
