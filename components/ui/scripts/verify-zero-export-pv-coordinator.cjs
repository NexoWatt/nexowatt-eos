#!/usr/bin/env node
'use strict';

/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft die zentrale Nulleinspeise-Prüflast mit zeitlich zusammenhängenden Anlagenfällen.
 * Daten und Wirkung: Simuliert frische NVP-/PV-/Batteriewerte in W und deterministische Zeit in ms. Lädt die maßgebliche Runtimequelle; keine Hardware, Timer oder Fremddienste werden angesprochen.
 * Bei Änderungen: Grenzen, Prioritäten, Fremdenergie und Übergabe an das physikalische Budget gemeinsam testen. Eine erteilte Prüflast ist ausdrücklich kein PV-Nachweis.
 * Verknüpfungen: src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts; docs/NULL_EINSPEISUNG_PV_STRATEGIE_DE.md
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// Die maßgebliche Quelle ist bewusst auch vor dem Spiegel-Build prüfbar.
const source = path.resolve(__dirname, '../src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts');
const loaded = new Module(source, module);
loaded.filename = source;
loaded.paths = Module._nodeModulePaths(path.dirname(source));
loaded._compile(fs.readFileSync(source, 'utf8'), source);
const {
  ZeroExportPvCoordinator, readZeroExportMode, updateZeroExportProbe, requestZeroExportProbe,
  collectZeroExportSample, unconfirmedZeroExportW,
} = loaded.exports;

let passed = 0;
const failed = [];
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`[zero-export-pv] PASS ${name}`);
  } catch (error) {
    failed.push(name);
    console.error(`[zero-export-pv] FAIL ${name}: ${error.message}`);
  }
}

/** Anlagenmodell: 2 kW Hauslast werden tagsüber vollständig von abgeregelter PV versorgt. */
class Site {
  constructor(overrides = {}) {
    this.now = 100000;
    this.c = new ZeroExportPvCoordinator();
    this.sample = {
      mode: { enabled: true, active: true, reason: 'ready', maxProbeW: 4200, importBiasW: 80 },
      gridW: 0, pvW: 2000, storageDischargeW: 0,
      gridFresh: true, pvFresh: true, storageFresh: true, safetyReady: true,
      externalBlocked: false, tariffCurtail: false,
      ...overrides,
    };
    this.tick(0);
  }

  tick(elapsedMs = 1000, changes = {}) {
    this.now += elapsedMs;
    this.sample = { ...this.sample, ...changes, now: this.now };
    return this.c.update(this.sample);
  }

  ask(changes = {}) {
    return this.c.request({
      now: this.now, key: 'ev:1', priority: 10, eligible: true,
      actualFresh: true, actualW: 0, baseW: 0, nextW: 1380,
      technicalMinW: 1380, maxW: 11000,
      ...changes,
    });
  }

  start(changes = {}) {
    assert.equal(this.ask(changes).granted, false, 'Prioritätsrunde muss zunächst gesammelt werden');
    this.tick();
    const result = this.ask(changes);
    assert.equal(result.granted, true, `Prüflast erwartet, erhalten: ${result.reason}`);
    return result;
  }
}

test('Nulleinspeisung tagsüber: EV erhält seine echte einphasige Mindestlast', () => {
  const site = new Site();
  const lease = site.start();
  assert.equal(lease.extraW, 1380);
  assert.equal(lease.targetW, 1380);
  assert.ok(lease.validUntil > site.now);
  assert.equal(site.c.snapshot().owner, 'ev:1');
});

test('PV-Reaktion allein reicht nicht: erst das physikalische Budget übernimmt', () => {
  const site = new Site();
  site.start();
  for (let second = 1; second <= 4; second += 1) {
    site.tick(1000, { pvW: 3380 });
    const result = site.ask({ actualW: 1380 });
    assert.equal(result.granted, true);
    assert.equal(result.extraW, 1380);
  }
  assert.equal(site.c.snapshot().status, 'confirming-budget');
  const confirmed = site.ask({ actualW: 1380, baseW: 1380 });
  assert.equal(confirmed.granted, false);
  assert.equal(confirmed.extraW, 0);
  assert.equal(confirmed.targetW, 1380);
  assert.equal(site.c.snapshot().reason, 'pv-delivery-confirmed');
});

test('Zufällige Nullbilanz ohne PV-Anstieg bestätigt keine neue Solarleistung', () => {
  const site = new Site();
  site.start();
  for (let second = 1; second <= 10; second += 1) {
    site.tick();
    site.ask({ actualW: 1380, baseW: 1380 });
  }
  assert.notEqual(site.c.snapshot().reason, 'pv-delivery-confirmed');
});

test('PV wird gemeinsames Budget: vorherige Prüflast erhält keinen doppelten Leistungsanspruch', () => {
  const site = new Site();
  site.start();
  for (let second = 1; second <= 4; second += 1) {
    site.tick(1000, { pvW: 3380 });
    site.ask({ actualW: 1380 });
  }
  site.tick();
  assert.equal(site.c.snapshot().owner, '');
  const previousOwner = site.ask({ actualW: 1380, baseW: 0 });
  assert.equal(previousOwner.granted, false);
  assert.equal(previousOwner.extraW, 0, 'Nach Übergabe darf keine alte Lease parallel zum gemeinsamen PV-Budget weiterwirken');
  const newOwner = site.ask({ key: 'rod:1', priority: 1, baseW: 1380, nextW: 1380, technicalMinW: 0 });
  assert.equal(newOwner.extraW + previousOwner.extraW, 0);
  assert.equal(newOwner.targetW, 1380);
});

for (const [name, power] of [
  ['Netzbezug', { gridW: 1380 }],
  ['Batterieentladung bei 0 W NVP', { gridW: 0, storageDischargeW: 1380 }],
]) {
  test(`${name}: kein dauerhafter PV-Versuch und gemeinsamer Wiederholschutz`, () => {
    const site = new Site();
    site.start();
    for (let second = 1; second <= 4; second += 1) {
      site.tick(1000, power);
      if (second < 4) site.ask({ actualW: 1380 });
    }
    assert.equal(site.c.snapshot().reason, 'grid-or-battery-supply');
    assert.equal(site.c.snapshot().owner, '');
    site.tick(1000, { gridW: 0, storageDischargeW: 0 });
    assert.equal(site.ask({ key: 'rod:1', nextW: 1000, technicalMinW: 0 }).granted, false);
    assert.equal(site.ask().reason, 'probe-cooldown');
  });
}

test('Bereits vorhandener Netzbezug oder Batterieentladung verhindert einen Start', () => {
  for (const power of [{ gridW: 1000 }, { storageDischargeW: 1000 }]) {
    const site = new Site(power);
    assert.equal(site.ask().granted, false);
    site.tick();
    assert.equal(site.ask().reason, 'existing-grid-or-battery-supply');
  }
});

test('Ein Versuch gleichzeitig: EV und Heizstab addieren ihre Prüflasten nicht', () => {
  const site = new Site();
  site.ask({ key: 'rod:1', priority: 30, nextW: 1000, technicalMinW: 0 });
  site.ask();
  site.tick();
  assert.equal(site.ask({ key: 'rod:1', priority: 30, nextW: 1000, technicalMinW: 0 }).granted, false);
  assert.equal(site.ask().granted, true);
  assert.equal(site.ask({ key: 'rod:1', priority: 30, nextW: 1000, technicalMinW: 0 }).reason, 'other-consumer-probing');
  assert.equal(site.c.snapshot().owner, 'ev:1');
});

for (const [name, invalid] of [
  ['bereits physikalisch versorgte Last', { baseW: 1380 }],
  ['DC-Mindestleistung oberhalb Prüflastgrenze', { nextW: 10000, technicalMinW: 10000, maxW: 50000 }],
  ['lokales Leistungslimit unter Mindestlast', { maxW: 1000 }],
]) {
  test(`Priorität: ${name} blockiert keinen zulässigen Heizstab`, () => {
    const site = new Site();
    const rod = { key: 'rod:1', priority: 30, nextW: 1000, technicalMinW: 0 };
    site.ask(invalid);
    site.ask(rod);
    site.tick();
    assert.equal(site.ask(invalid).granted, false);
    assert.equal(site.ask(rod).granted, true, 'Nicht ausführbare Anforderungen dürfen die Prioritätswarteschlange nicht belegen');
    assert.equal(site.c.snapshot().owner, 'rod:1');
  });
}

test('DC: definierte Mindestleistung wird gewährt, niemals durch AC-6-A-Werte ersetzt', () => {
  const site = new Site();
  const dc = { key: 'dc:1', nextW: 3000, technicalMinW: 3000, maxW: 12000 };
  const result = site.start(dc);
  assert.equal(result.targetW, 3000);
  site.tick();
  const limited = site.ask({ ...dc, maxW: 2500 });
  assert.equal(limited.granted, false);
  assert.equal(limited.extraW, 0);
});

test('DC: Mindestleistung, Gesamtlimit und Zusatzleistungsgrenze gelten gleichzeitig', () => {
  for (const constraints of [
    { nextW: 3000, technicalMinW: 4000, maxW: 10000 },
    { nextW: 5000, technicalMinW: 5000, maxW: 10000 },
    { nextW: 3000, technicalMinW: 3000, maxW: 2999 },
  ]) {
    const site = new Site();
    assert.equal(site.ask(constraints).granted, false);
    site.tick();
    assert.equal(site.ask(constraints).granted, false);
  }
  const site = new Site();
  const result = site.start({ nextW: 6000, baseW: 3000, technicalMinW: 6000, maxW: 10000 });
  assert.equal(result.extraW, 3000, 'Nur die zusätzliche Leistung wird als Prüflast begrenzt');
  site.tick();
  assert.equal(site.ask({ nextW: 6000, baseW: 3000, technicalMinW: 6000, maxW: 10000 }).granted, true,
    'Bereits physikalisch zugewiesene Leistung bleibt erlaubt, auch bevor das Fahrzeug sie abnimmt');
});

test('Geänderte technische Mindestleistung entzieht eine inzwischen unzulässige Lease', () => {
  const site = new Site();
  site.start();
  site.tick();
  const result = site.ask({ nextW: 4140, technicalMinW: 4140 });
  assert.equal(result.granted, false, 'Eine alte 1.380-W-Freigabe ist bei aktueller 4.140-W-Mindestlast ungültig');
  assert.equal(site.c.snapshot().owner, '');
});

for (const [name, unavailable, expected] of [
  ['NVP veraltet', { gridFresh: false }, 'nvp-stale'],
  ['PV veraltet', { pvFresh: false }, 'pv-missing-stale-or-dark'],
  ['Nacht', { pvW: 0 }, 'pv-missing-stale-or-dark'],
  ['Batteriemessung fehlt', { storageFresh: false }, 'battery-measurement-required'],
  ['Schutzhülle sperrt', { safetyReady: false }, 'safety-envelope-blocked'],
  ['externe Autorität sperrt', { externalBlocked: true }, 'external-authority-blocked'],
  ['Tarifabregelung', { tariffCurtail: true }, 'tariff-curtailment'],
]) {
  test(`${name}: aktive Lease wird sofort aufgehoben`, () => {
    const site = new Site();
    site.start();
    site.tick(1000, unavailable);
    assert.equal(site.c.snapshot().owner, '');
    assert.equal(site.ask().reason, expected);
    assert.equal(site.ask().extraW, 0);
  });
}

test('Veralteter Core-Snapshot und fehlende Verbraucherrückmeldung geben keine Leistung frei', () => {
  const site = new Site();
  site.start();
  const stale = site.ask({ now: site.now + 5001 });
  assert.equal(stale.granted, false);
  assert.equal(stale.reason, 'core-sample-expired');
  const unresponsive = new Site();
  unresponsive.start();
  unresponsive.tick(5001);
  assert.equal(unresponsive.c.snapshot().reason, 'consumer-feedback-expired');
  assert.equal(unresponsive.c.snapshot().owner, '');
});

test('Wiederholte Anforderungen verlängern keine Lease', () => {
  const site = new Site();
  const initial = site.start();
  const deadline = site.c.snapshot().validUntil;
  for (let second = 1; second <= 30; second += 1) {
    site.tick();
    const result = site.ask({ actualW: 1380 });
    if (second < 30) {
      assert.equal(result.leaseId, initial.leaseId);
      assert.equal(site.c.snapshot().validUntil, deadline);
    }
  }
  assert.equal(site.c.snapshot().owner, '');
  assert.equal(site.c.snapshot().reason, 'probe-timeout');
});

test('Keine Reaktion des Fahrzeugs: begrenzter Versuch statt Dauerfreigabe', () => {
  const site = new Site();
  site.start();
  for (let second = 1; second <= 21; second += 1) {
    site.tick();
    site.ask();
  }
  assert.equal(site.c.snapshot().reason, 'no-consumer-response');
  assert.equal(site.c.snapshot().owner, '');
});

test('Phasenumschaltung: STOP-/Schaltwartezeit gilt nicht als neue PV-Last', () => {
  const site = new Site({ pvW: 3380 });
  const phase = { baseW: 1380, actualW: 1380, nextW: 4140, technicalMinW: 4140, phaseProbe: true, phaseTransition: 'prepare' };
  site.start(phase);
  for (let second = 1; second <= 40; second += 1) {
    site.tick(1000, { pvW: 2000 });
    const result = site.ask({ ...phase, actualW: 0, phaseTransition: 'switching' });
    assert.equal(result.granted, true, 'Regulärer STOP/Settle darf keinen voreiligen Fahrzeug-Timeout auslösen');
    assert.equal(result.phaseProbe, true);
  }
  for (let second = 1; second <= 4; second += 1) {
    site.tick(1000, { pvW: 6140 });
    site.ask({ ...phase, actualW: 4140, phaseTransition: 'ready', baseW: second === 4 ? 4140 : 1380 });
  }
  assert.equal(site.c.snapshot().reason, 'pv-delivery-confirmed');
});

test('Phasenumschaltung verliert bei veraltetem Lastwert sofort ihre Prüffreigabe', () => {
  const site = new Site();
  const phase = { nextW: 4140, technicalMinW: 4140, phaseProbe: true, phaseTransition: 'prepare' };
  site.start(phase);
  site.tick();
  assert.equal(site.ask({ ...phase, actualFresh: false }).granted, false);
  assert.equal(site.c.snapshot().owner, '');
});

test('Phasenumschaltung hängt: auch laufende Rückmeldungen verlängern 90 s Wartezeit nicht', () => {
  const site = new Site();
  const phase = { nextW: 4140, technicalMinW: 4140, phaseProbe: true, phaseTransition: 'switching' };
  site.start(phase);
  for (let second = 1; second <= 90; second += 1) {
    site.tick();
    if (second < 90) assert.equal(site.ask(phase).granted, true);
  }
  assert.equal(site.c.snapshot().owner, '');
  assert.equal(site.c.snapshot().reason, 'phase-transition-timeout');
});

test('Auch während Phasen-STOP werden 20 Wh Fremdenergie begrenzt', () => {
  const site = new Site();
  const phase = { nextW: 4140, technicalMinW: 4140, phaseProbe: true, phaseTransition: 'switching' };
  site.start(phase);
  for (let second = 1; second <= 20; second += 1) {
    site.tick(1000, { gridW: 3680 });
    if (second < 20) assert.equal(site.ask(phase).granted, true);
  }
  assert.equal(site.c.snapshot().owner, '');
  assert.equal(site.c.snapshot().reason, 'probe-energy-limit');
  assert.ok(site.c.snapshot().energyWh >= 20);
});

test('Uhr-Rücksprung hebt aktive Prüflast auf und verhindert sofortige Neufreigabe', () => {
  const site = new Site();
  site.start();
  site.tick(-500);
  assert.equal(site.c.snapshot().owner, '');
  assert.equal(site.c.snapshot().reason, 'clock-rollback');
  assert.equal(site.ask().granted, false);
});

/** Nach echtem PV-Anstieg darf nur der konfigurierte, getrennte Importanteil dauerhaft verbleiben. */
function confirmMargin(site, marginW = 80, demand = {}) {
  const targetW = demand.nextW || 1380;
  site.start(demand);
  const baselinePvW = site.sample.pvW;
  let result;
  for (let second = 1; second <= 4; second += 1) {
    site.tick(1000, { pvW: baselinePvW + targetW - marginW, gridW: marginW });
    result = site.ask({ ...demand, actualW: targetW, baseW: second === 4 ? targetW - marginW : 0 });
  }
  assert.equal(result.reason, 'confirmed-import-bias');
  assert.equal(result.extraW, marginW);
  assert.equal(site.c.snapshot().owner, '');
  return result;
}

test('80 W Importbias: bestätigte 1.380-W-Mindestlast bleibt bei 1.300 W PV stabil', () => {
  const site = new Site();
  confirmMargin(site);
  for (let second = 1; second <= 10; second += 1) {
    site.tick();
    const result = site.ask({ actualW: 1380, baseW: 1300 });
    assert.equal(result.targetW, 1380);
    assert.equal(result.extraW, 80);
    assert.equal(result.reason, 'confirmed-import-bias');
    assert.equal(site.c.snapshot().operatingMarginW, 80);
  }
});

test('Importbias wird erst nach Übergabe an den nächsten Core-Zyklus separat gehalten', () => {
  const site = new Site();
  site.start();
  for (let second = 1; second <= 4; second += 1) {
    site.tick(1000, { pvW: 3300, gridW: 80 });
    site.ask({ actualW: 1380, baseW: 0 });
  }
  site.tick();
  assert.equal(site.c.snapshot().owner, '');
  const held = site.ask({ actualW: 1380, baseW: 1300 });
  assert.equal(held.reason, 'confirmed-import-bias');
  assert.equal(held.targetW, 1380);
  assert.equal(held.extraW, 80);
  assert.equal(site.c.snapshot().operatingMarginW, 80);
});

test('Importbias hält nur bestätigte Leistung; größerer Sollwert benötigt eigenen Prüfschritt', () => {
  const site = new Site();
  confirmMargin(site);
  site.tick();
  const result = site.ask({ actualW: 1380, baseW: 1300, nextW: 1610 });
  assert.equal(result.targetW, 1380, 'Eine Haltefreigabe darf nicht unbemerkt zur Leistungssteigerung werden');
  assert.equal(result.extraW, 80);
  assert.equal(site.c.snapshot().owner, '');
});

test('Importbias ist kein Batterieanteil und übersteht weder Laststopp noch veraltete Messung', () => {
  for (const changes of [{ storageDischargeW: 100 }, { gridW: 500 }, { pvFresh: false }]) {
    const site = new Site();
    confirmMargin(site);
    site.tick(1000, changes);
    assert.equal(site.ask({ actualW: 1380, baseW: 1300 }).granted, false);
    assert.equal(site.c.snapshot().operatingMarginW, 0);
  }
  const site = new Site();
  confirmMargin(site);
  site.tick();
  assert.equal(site.ask({ actualW: 0, baseW: 1300 }).granted, false);
  assert.equal(site.c.snapshot().operatingMarginW, 0);
});

test('Importbias: eine gehaltene EV-Mindestlast blockiert keine spätere Heizstab-Prüfung', () => {
  const site = new Site();
  confirmMargin(site, 40);
  const ev = { actualW: 1380, baseW: 1340 };
  const rod = { key: 'rod:1', priority: 30, nextW: 1000, technicalMinW: 0 };
  for (let second = 1; second <= 5; second += 1) {
    site.tick();
    site.ask(ev);
    site.ask(rod);
  }
  site.tick();
  site.ask(ev);
  assert.equal(site.ask(rod).granted, true, 'Halteanteil des EV ist kein Kandidat für eine neue Prüfung');
  for (let second = 1; second <= 4; second += 1) {
    site.tick(1000, { pvW: 4300, gridW: 80 });
    site.ask(ev);
    site.ask({ ...rod, actualW: 1000, baseW: second === 4 ? 960 : 0 });
  }
  assert.equal(site.c.snapshot().owner, '');
  assert.equal(site.c.snapshot().operatingMarginW, 80);
  assert.equal(site.ask(ev).extraW + site.ask({ ...rod, actualW: 1000, baseW: 960 }).extraW, 80);
});

test('Importbias wird beim Halten nicht über die konfigurierte Summe ausgedehnt', () => {
  const site = new Site();
  confirmMargin(site);
  site.tick();
  const result = site.ask({ actualW: 1380, baseW: 1299 });
  assert.equal(result.granted, false, '81 W dürfen nicht aus einem globalen 80-W-Haltebudget freigegeben werden');
  assert.ok(site.c.snapshot().operatingMarginW <= 80);
});

test('Importbias: zwei bestätigte Verbraucher bekommen zusammen höchstens 80 W', () => {
  const site = new Site();
  confirmMargin(site, 40);
  const ev = { actualW: 1380, baseW: 1340 };
  const rod = { key: 'rod:1', priority: 30, nextW: 1000, technicalMinW: 0 };
  for (let second = 1; second <= 6; second += 1) {
    site.tick();
    site.ask(ev);
    site.ask(rod);
  }
  assert.equal(site.c.snapshot().owner, 'rod:1');
  for (let second = 1; second <= 5; second += 1) {
    site.tick(1000, { pvW: 4280, gridW: 100 });
    site.ask(ev);
    const result = site.ask({ ...rod, actualW: 1000, baseW: 940 });
    assert.notEqual(result.reason, 'confirmed-import-bias', '40 W EV + 60 W Heizstab überschreiten das globale 80-W-Budget');
    assert.ok(site.c.snapshot().operatingMarginW <= 80);
  }
  assert.equal(site.c.snapshot().owner, '');
});

test('Importbias hebt geänderte technische Mindestleistung nicht auf', () => {
  const site = new Site();
  confirmMargin(site);
  site.tick();
  const result = site.ask({ actualW: 1380, baseW: 1300, nextW: 4140, technicalMinW: 4140 });
  assert.equal(result.granted, false);
  assert.equal(site.c.snapshot().operatingMarginW, 0);
});

test('Uhr-Rücksprung entzieht auch den zuvor bestätigten Import-Halteanteil', () => {
  const site = new Site();
  confirmMargin(site);
  site.tick(-500);
  assert.equal(site.c.snapshot().operatingMarginW, 0);
  assert.equal(site.ask({ actualW: 1380, baseW: 1300 }).granted, false);
});

test('Diagnose und ausgeschaltete Strategie bleiben auch bei guten Messungen passiv', () => {
  for (const gridConstraints of [
    { zeroExportEnabled: false },
    { zeroExportEnabled: true, exportLimitRunMode: 'diagnostic' },
    { zeroExportEnabled: true, exportLimitRunMode: 'simulation' },
    { zeroExportEnabled: true, exportLimitInstallerApproved: false },
    { zeroExportEnabled: true, exportLimitMaxFeedInW: 1000 },
    { zeroExportEnabled: true, zeroExportProbeMaxW: 0 },
  ]) {
    const mode = readZeroExportMode({ config: { gridConstraints } });
    const site = new Site({ mode });
    assert.equal(site.ask().granted, false);
    site.tick();
    assert.equal(site.ask().granted, false);
  }
});

test('Abschalten zwischen Core-Ticks entzieht beim Writer die bestehende Freigabe', () => {
  const adapter = { config: { gridConstraints: { zeroExportEnabled: true } } };
  const site = new Site();
  updateZeroExportProbe(adapter, site.sample);
  const demand = { key: 'ev:1', priority: 10, eligible: true, actualFresh: true,
    actualW: 0, baseW: 0, nextW: 1380, technicalMinW: 1380, maxW: 11000 };
  requestZeroExportProbe(adapter, { ...demand, now: site.now });
  site.tick();
  updateZeroExportProbe(adapter, site.sample);
  assert.equal(requestZeroExportProbe(adapter, { ...demand, now: site.now }).granted, true);
  adapter.config.gridConstraints.zeroExportEnabled = false;
  assert.equal(requestZeroExportProbe(adapter, { ...demand, now: site.now }).granted, false);
  assert.equal(adapter._zeroExportPvCoordinator.snapshot().owner, '');
});

/** Reale Quellenstruktur ohne Hardware: jeder direkte Messwert besitzt seine ursprüngliche Messzeit. */
function measuredSite() {
  const now = 100000;
  return { now, adapter: {
    config: { datapoints: { pvPower: 'inverter.power' } },
    stateCache: { pvPower: { value: 2000, ts: now } },
    _nvpFreshnessSnapshot: { usable: true, netW: 0, ts: now, measurementAgeMs: 100 },
    _emsSafetyEnvelope: { valid: true, forceZero: false, emergencyStop: false, expiresAt: now + 5000 },
  } };
}

test('Quellenprüfung: echte PV und NVP genügen bei Anlage ohne Speicher', () => {
  const { adapter, now } = measuredSite();
  const sample = collectZeroExportSample(adapter, null, {}, now);
  assert.equal(sample.pvW, 2000);
  assert.equal(sample.pvFresh, true);
  assert.equal(sample.gridFresh, true);
  assert.equal(sample.storageFresh, true);
  assert.equal(sample.safetyReady, true);
});

test('Quellenprüfung: Forecast oder neu veröffentlichte Bilanz macht alte PV nicht frisch', () => {
  const { adapter, now } = measuredSite();
  adapter.stateCache.pvPower.ts = now - 5001;
  adapter.stateCache['derived.core.pv.totalW'] = { value: 9000, ts: now };
  adapter.stateCache['pvForecast.powerW'] = { value: 9000, ts: now };
  const sample = collectZeroExportSample(adapter, null, {}, now);
  assert.equal(sample.pvFresh, false);
  assert.equal(sample.pvW, 0);
});

test('Quellenprüfung: frische 0-W-PV bleibt 0 W; fehlender Wert wird nicht als frisch behandelt', () => {
  const { adapter, now } = measuredSite();
  adapter.stateCache.pvPower.value = 0;
  const zero = collectZeroExportSample(adapter, null, {}, now);
  assert.equal(zero.pvFresh, true);
  assert.equal(zero.pvW, 0);
  assert.equal(new Site(zero).ask().granted, false);
  adapter.stateCache.pvPower.value = null;
  assert.equal(collectZeroExportSample(adapter, null, {}, now).pvFresh, false);
  delete adapter.stateCache.pvPower;
  assert.equal(collectZeroExportSample(adapter, null, {}, now).pvFresh, false);
});

test('Quellenprüfung: NVP-Alter addiert Originalmessung und Snapshot-Verzögerung', () => {
  const { adapter, now } = measuredSite();
  adapter._nvpFreshnessSnapshot.ts = now - 3000;
  adapter._nvpFreshnessSnapshot.measurementAgeMs = 3000;
  assert.equal(collectZeroExportSample(adapter, null, {}, now).gridFresh, false);
});

test('Quellenprüfung: aktive Batterie verlangt echten gerichteten Leistungsnachweis', () => {
  const { adapter, now } = measuredSite();
  adapter.config.enableStorageControl = true;
  adapter.config.datapoints.storageSoc = 'battery.soc';
  assert.equal(collectZeroExportSample(adapter, null, {}, now).storageFresh, false);
  adapter.config.datapoints.batteryPower = 'battery.power';
  adapter._nwResolveBatteryFlowFromCache = () => ({
    src: 'batteryPower', derived: true, dischargeW: 0, staleMs: { batteryPower: 0 },
  });
  assert.equal(collectZeroExportSample(adapter, null, {}, now).storageFresh, false);
  adapter._nwResolveBatteryFlowFromCache = () => ({
    src: 'batteryPower', derived: false, dischargeW: 400, staleMs: { batteryPower: 0 },
  });
  const measured = collectZeroExportSample(adapter, null, {}, now);
  assert.equal(measured.storageFresh, true);
  assert.equal(measured.storageDischargeW, 400);
});

test('Quellenprüfung: ein einzelner Lade-Kanal schließt Batterieentladung nicht aus', () => {
  const { adapter, now } = measuredSite();
  adapter.config.datapoints.storageChargePower = 'battery.charge';
  adapter._nwResolveBatteryFlowFromCache = () => ({
    src: 'storageChargePower', derived: false, dischargeW: 0, staleMs: { storageChargePower: 0 },
  });
  assert.equal(collectZeroExportSample(adapter, null, {}, now).storageFresh, false);
});

test('Quellenprüfung: Speicherfarm-Netto-Laden darf Entladung eines zweiten Speichers nicht verbergen', () => {
  const { adapter, now } = measuredSite();
  adapter._nwGetStorageControlAuthority = () => ({ selectedTopology: 'farm' });
  adapter._nwResolveBatteryFlowFromCache = () => ({
    src: 'storageFarmNet', chargeW: 1000, dischargeW: 0, grossDischargeW: 600,
    staleMs: { farmPower: 0, farmCharge: 0, farmDischarge: 0 },
  });
  const sample = collectZeroExportSample(adapter, null, {}, now);
  assert.equal(sample.storageFresh, true);
  assert.equal(sample.storageDischargeW, 600);
  const site = new Site(sample);
  assert.equal(site.ask().granted, false);
});

test('Quellenprüfung: ausstehende oder überholte externe Netzvorgabe sperrt Prüflast', () => {
  const { adapter, now } = measuredSite();
  adapter.config.netOperatorInterface = { enabled: true, mode: 'active', commissioned: true, installerApproved: true };
  assert.equal(collectZeroExportSample(adapter, null, {}, now).externalBlocked, true);
  adapter._netOperatorEnvelope = { valid: true, fresh: true, commOk: true, validUntil: now - 1 };
  assert.equal(collectZeroExportSample(adapter, null, {}, now).externalBlocked, true);
  adapter._netOperatorEnvelope.validUntil = now + 5000;
  assert.equal(collectZeroExportSample(adapter, null, {}, now).externalBlocked, false);
  adapter._netOperatorEnvelope.command = { action: 'trip' };
  assert.equal(collectZeroExportSample(adapter, null, {}, now).externalBlocked, true);
});

test('Unbestätigte Prüflast bleibt von einem zweiten PV-Budget ausgeschlossen', () => {
  const site = new Site();
  const adapter = { _zeroExportPvCoordinator: site.c };
  site.start();
  site.tick(1000, { pvW: 3380 });
  site.ask({ actualW: 1380 });
  assert.equal(unconfirmedZeroExportW(adapter), 1380);
  for (let second = 1; second <= 3; second += 1) {
    site.tick();
    site.ask({ actualW: 1380 });
  }
  assert.equal(unconfirmedZeroExportW(adapter), 0, 'Erst bestätigte PV-Reaktion darf in die zentrale Bilanz zurückkehren');
});

test('Teilweise zugewiesene laufende Last reserviert den gesamten erworbenen Prüflastanteil', () => {
  // Die laufende Last nimmt schon 1.000 W auf, bekommt aktuell aber nur 500 W
  // physikalisches Budget zugeteilt. Ziel 1.500 W braucht deshalb 1.000 W
  // exklusive Prüffreigabe, obwohl der reine Istleistungssprung nur 500 W ist.
  const site = new Site({ pvW: 3000 });
  const adapter = { _zeroExportPvCoordinator: site.c };
  const demand = { actualW: 1000, baseW: 500, nextW: 1500, technicalMinW: 1000 };
  const acquired = site.start(demand);
  assert.equal(acquired.extraW, 1000);
  assert.equal(unconfirmedZeroExportW(adapter), 1000,
    'Bereits bei Erteilung müssen volle 1.000 W exklusiv bleiben; nur 500 W Leistungsanstieg zu reservieren verteilt die andere Hälfte doppelt');
  for (let second = 1; second <= 3; second += 1) {
    site.tick(1000, { pvW: 3500 });
    site.ask({ ...demand, actualW: 1500 });
    assert.equal(unconfirmedZeroExportW(adapter), 1000,
      'Ein gemessener Anstieg um 500 W ersetzt vor Bestätigung nicht die erworbene Zusatzfreigabe von 1.000 W');
  }
  site.tick();
  site.ask({ ...demand, actualW: 1500 });
  assert.equal(unconfirmedZeroExportW(adapter), 0, 'Erst bestätigte PV-Reaktion hebt die exklusive Reservierung auf');
});

console.log(`[zero-export-pv] ${passed} passed, ${failed.length} failed`);
if (failed.length) process.exitCode = 1;
