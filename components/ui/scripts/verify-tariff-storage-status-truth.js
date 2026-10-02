#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.127: Tarifabsicht, finaler Speicher-Sollwert, Gate-/Write-
 * Ergebnis und Istwert-Rückmeldung müssen getrennt sichtbar bleiben.
 * `tarif.statusText` bleibt kompakt für den LIVE-Energiefluss. Die vollständige
 * Kette steht in `tarif.detailStatusText`. Beide dürfen Laden/Entladen nur bei
 * frischer bestätigender Istleistung behaupten.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  TariffStatusModule,
  classifyTariffStorageStatus,
} = require('../ems/modules/tariff-status');

class FakeAdapter {
  constructor(tariff = {}) {
    this.config = {
      storage: { staleTimeoutSec: 30 },
      tariffStatus: { readbackDeadbandW: 100, readbackGraceSec: 20, readbackMaxAgeSec: 30 },
    };
    this.log = { debug() {}, info() {}, warn() {}, error() {} };
    this._states = new Map();
    this._tarifVis = {
      ts: Date.now(),
      aktiv: true,
      tarifAktiv: true,
      modus: 2,
      state: 'teuer',
      preisAktuell: 0.36,
      netFeeEnabled: false,
      netFeeMode: 'off',
      speicherSollW: 3000,
      storageTopology: 'single',
      storageWriterAvailable: true,
      storageAuthorityReason: 'single-active',
      storageIntentStatus: 'discharge',
      storageIntentReason: 'Teurer Tarif – Speicherentladung gewünscht',
      ...tariff,
    };
  }

  async setObjectNotExistsAsync() {}

  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val')
      ? value.val
      : value;
    this._states.set(String(id), { val, ack: value && typeof value === 'object' ? value.ack : !!ack, ts: Date.now(), lc: Date.now() });
  }

  async getStateAsync(id) {
    return this._states.get(String(id)) || null;
  }

  put(id, value) {
    this._states.set(String(id), { val: value, ack: true, ts: Date.now(), lc: Date.now() });
  }

  value(id) {
    const state = this._states.get(String(id));
    return state ? state.val : undefined;
  }
}

function putStorageChain(adapter, values = {}) {
  const defaults = {
    topology: 'single',
    topologyReason: 'single-active',
    requestW: 900,
    requestSource: 'tarif/eigenverbrauch',
    requestReason: 'Netzbezug ausgleichen',
    finalW: 900,
    finalSource: 'eigenverbrauch',
    finalReason: 'NVP-Zielwert',
    writeOk: true,
    commandEffective: true,
    requestSatisfied: true,
    partiallyAccepted: false,
    acceptedW: 900,
    writeStatus: 'geschrieben',
    actualW: 870,
    actualAgeMs: 500,
    actualTrusted: true,
    farmRequestedW: null,
    farmPlannedW: null,
    farmAcceptedW: null,
    farmFailedW: null,
    farmUnservedW: null,
    farmStatus: '',
    farmDispatch: null,
  };
  const v = { ...defaults, ...values };
  adapter.put('tarif.aktiv', true);
  adapter.put('speicher.regelung.topologie', v.topology);
  adapter.put('speicher.regelung.topologieGrund', v.topologyReason);
  adapter.put('speicher.regelung.requestW', v.requestW);
  adapter.put('speicher.regelung.requestQuelle', v.requestSource);
  adapter.put('speicher.regelung.requestGrund', v.requestReason);
  adapter.put('speicher.regelung.sollW', v.finalW);
  adapter.put('speicher.regelung.acceptedSollW', Object.prototype.hasOwnProperty.call(values, 'acceptedW') ? v.acceptedW : v.finalW);
  adapter.put('speicher.regelung.quelle', v.finalSource);
  adapter.put('speicher.regelung.grund', v.finalReason);
  adapter.put('speicher.regelung.schreibOk', v.writeOk);
  adapter.put('speicher.regelung.commandEffective', Object.prototype.hasOwnProperty.call(values, 'commandEffective') ? v.commandEffective : (v.writeOk || v.writeStatus === 'unverändert'));
  adapter.put('speicher.regelung.requestSatisfied', Object.prototype.hasOwnProperty.call(values, 'requestSatisfied') ? v.requestSatisfied : (v.writeOk || v.writeStatus === 'unverändert'));
  adapter.put('speicher.regelung.partiallyAccepted', Object.prototype.hasOwnProperty.call(values, 'partiallyAccepted') ? v.partiallyAccepted : false);
  adapter.put('speicher.regelung.schreibStatus', v.writeStatus);
  adapter.put('speicher.regelung.batteryPowerFeedbackMeasuredW', v.actualW);
  adapter.put('speicher.regelung.batteryPowerFeedbackAgeMs', v.actualAgeMs);
  adapter.put('speicher.regelung.batteryPowerBalanceTrusted', v.actualTrusted);
  adapter.put('speicher.regelung.batteryPowerTrusted', v.actualTrusted);
  adapter.put('speicher.regelung.zeroWriteFirewallAction', 'pass');
  adapter.put('speicher.regelung.zeroWriteFirewallReason', 'non-zero');
  adapter.put('speicher.regelung.zeroWriteFirewallExplicitStop', v.finalW === 0);
  if (v.topology === 'farm') {
    const dispatch = v.farmDispatch || {};
    adapter.put('speicher.regelung.farmRequestedW', v.farmRequestedW ?? dispatch.requestedW ?? dispatch.targetW ?? v.finalW);
    adapter.put('speicher.regelung.farmPlannedW', v.farmPlannedW ?? dispatch.plannedDeliveredW ?? dispatch.deliveredW ?? null);
    adapter.put('speicher.regelung.farmAcceptedW', v.farmAcceptedW ?? dispatch.acceptedDeliveredW ?? dispatch.deliveredW ?? null);
    adapter.put('speicher.regelung.farmFailedW', v.farmFailedW ?? dispatch.failedW ?? 0);
    adapter.put('speicher.regelung.farmUnservedW', v.farmUnservedW ?? dispatch.unservedW ?? 0);
    adapter.put('speicher.regelung.farmStatus', v.farmStatus || v.writeStatus || 'farm');
  }
  if (v.farmDispatch) adapter.put('storageFarm.lastDispatchJson', JSON.stringify({ ts: Date.now(), ...v.farmDispatch }));
}

async function runScenario({ tariff = {}, storage = {}, ageTargetMs = 0 } = {}) {
  const adapter = new FakeAdapter(tariff);
  putStorageChain(adapter, storage);
  const module = new TariffStatusModule(adapter, null);
  await module.init();
  if (ageTargetMs > 0) {
    const topology = storage.topology || 'single';
    const finalW = Object.prototype.hasOwnProperty.call(storage, 'finalW') ? storage.finalW : 900;
    const acceptedW = Object.prototype.hasOwnProperty.call(storage, 'acceptedW') ? storage.acceptedW : finalW;
    const writeOk = Object.prototype.hasOwnProperty.call(storage, 'writeOk') ? storage.writeOk : true;
    const commandEffective = Object.prototype.hasOwnProperty.call(storage, 'commandEffective') ? storage.commandEffective : writeOk;
    const partiallyAccepted = Object.prototype.hasOwnProperty.call(storage, 'partiallyAccepted') ? storage.partiallyAccepted : false;
    const writeStatus = storage.writeStatus || 'geschrieben';
    const lower = String(writeStatus || '').toLowerCase();
    const phase = commandEffective || writeOk || lower === 'unverändert'
      ? 'effective'
      : ((lower.includes('no-write') || lower.includes('hold')) ? 'hold' : (lower.includes('blocked') || lower.includes('blockiert') || lower.includes('authority') ? 'blocked' : 'not-effective'));
    const statusTargetW = commandEffective && acceptedW !== null ? acceptedW : finalW;
    const direction = statusTargetW < 0 ? 'charge' : (statusTargetW > 0 ? 'discharge' : 'idle');
    module._lastTargetSignature = `${topology}|${direction}|${Math.round(statusTargetW)}|${phase}|${partiallyAccepted ? 'partial' : 'full'}`;
    module._targetSinceMs = Date.now() - ageTargetMs;
  }
  await module.tick();
  return { adapter, module };
}

(async () => {
  // 1) Bestätigte Entladung darf als tatsächliche Entladung erscheinen.
  {
    const { adapter } = await runScenario();
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharging');
    assert.strictEqual(adapter.value('tarif.speicherFinalW'), 900);
    assert.strictEqual(adapter.value('tarif.speicherReadbackW'), 870);
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'confirmed-discharging');
    assert.match(adapter.value('tarif.statusText'), /Speicher entlädt/);
    assert.match(adapter.value('tarif.statusText'), /EVCS Netzladen freigegeben/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /870 W|Tarifwunsch|Quelle|Farm-Dispatch/);
    assert.match(adapter.value('tarif.detailStatusText'), /Speicher entlädt 870 W/);
    assert.match(adapter.value('tarif.detailStatusText'), /Tarifwunsch Entladen 3000 W/);
    assert.match(adapter.value('tarif.detailStatusText'), /Soll 900 W; Richtung bestätigt/);
  }

  // 2) Gegenläufiger Istwert innerhalb der Einschwingzeit ist nur eine Anforderung.
  {
    const { adapter } = await runScenario({ storage: { actualW: -450, actualTrusted: true } });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharge-requested');
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'pending-discharging');
    assert.match(adapter.value('tarif.statusText'), /Speicher-Entladen angefordert/);
    assert.match(adapter.value('tarif.detailStatusText'), /Entladen 900 W wirksam – Rückmeldung ausstehend/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 3) Nach Ablauf der Einschwingzeit wird die Gegenrichtung als Abweichung gemeldet.
  {
    const { adapter } = await runScenario({ storage: { actualW: -450, actualTrusted: true }, ageTargetMs: 30000 });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'mismatch');
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'opposite-direction');
    assert.match(adapter.value('tarif.statusText'), /Speicher-Rückmeldung abweichend/);
    assert.match(adapter.value('tarif.detailStatusText'), /bestätigt die Richtung nicht/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 4) Bestätigtes Laden nutzt die negative Vorzeichenkonvention korrekt.
  {
    const { adapter } = await runScenario({
      tariff: {
        state: 'guenstig',
        speicherSollW: -2500,
        storageIntentStatus: 'charge',
        storageIntentReason: 'Günstiger Tarif – Speicherladen gewünscht',
      },
      storage: {
        requestW: -1800,
        finalW: -1500,
        actualW: -1420,
        finalSource: 'tarif',
        finalReason: 'Günstiges Preisfenster',
      },
    });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'charging');
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'confirmed-charging');
    assert.match(adapter.value('tarif.statusText'), /Speicher lädt/);
    assert.match(adapter.value('tarif.detailStatusText'), /Speicher lädt 1420 W/);
  }

  // 5) 0 W ist ein echter Warte-/Stoppzustand und keine Lade-/Entladeaussage.
  {
    const { adapter } = await runScenario({
      tariff: {
        state: 'guenstig',
        speicherSollW: -2500,
        storageIntentStatus: 'charge',
        storageIntentReason: 'Günstiger Tarif – Speicherladen gewünscht',
      },
      storage: {
        requestW: -2500,
        finalW: 0,
        actualW: 35,
        finalSource: 'sicherheit',
        finalReason: 'SoC-Maximum erreicht',
        writeOk: true,
        writeStatus: 'geschrieben',
      },
    });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'waiting');
    assert.strictEqual(adapter.value('tarif.speicherReadbackStatus'), 'confirmed-stop');
    assert.match(adapter.value('tarif.statusText'), /Speicher wartet/);
    assert.match(adapter.value('tarif.detailStatusText'), /Speicher wartet\/ruht \(0 W bestätigt/);
    assert.match(adapter.value('tarif.detailStatusText'), /SoC-Maximum erreicht/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher lädt|Speicher entlädt/);
  }

  // 6) Ein Gate-/Authority-Block darf nie als laufende Entladung erscheinen.
  {
    const { adapter } = await runScenario({
      storage: {
        topology: 'farm',
        topologyReason: 'farm-active',
        acceptedW: 0,
        commandEffective: false,
        requestSatisfied: false,
        partiallyAccepted: false,
        writeOk: false,
        writeStatus: 'farm-nicht-moeglich:blocked-by-actuator-authority',
        actualW: 0,
        actualTrusted: true,
        farmDispatch: {
          targetW: 900,
          deliveredW: 0,
          unservedW: 900,
          results: [{ authorityBlocked: true }],
        },
      },
    });
    assert.strictEqual(adapter.value('tarif.speicherGateStatus'), 'blocked');
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'blocked');
    assert.match(adapter.value('tarif.statusText'), /Speicher gesperrt/);
    assert.match(adapter.value('tarif.detailStatusText'), /Speicherbefehl blockiert/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 7) Farm-Teilverteilung bleibt sichtbar, ohne den Readback mit Dispatch zu verwechseln.
  {
    const { adapter } = await runScenario({
      storage: {
        topology: 'farm',
        topologyReason: 'farm-active',
        finalW: 900,
        acceptedW: 600,
        commandEffective: true,
        requestSatisfied: false,
        partiallyAccepted: true,
        actualW: 560,
        actualTrusted: true,
        writeOk: false,
        writeStatus: 'farm-partial',
        farmRequestedW: 900,
        farmPlannedW: 900,
        farmAcceptedW: 600,
        farmFailedW: 0,
        farmUnservedW: 300,
        farmStatus: 'farm-partial',
        farmDispatch: {
          requestedW: 900,
          targetW: 900,
          plannedDeliveredW: 900,
          acceptedDeliveredW: 600,
          deliveredW: 600,
          failedW: 0,
          unservedW: 300,
          results: [{ authorityBlocked: false }],
        },
      },
    });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharging');
    assert.strictEqual(adapter.value('tarif.speicherAcceptedW'), 600);
    assert.strictEqual(adapter.value('tarif.speicherGateStatus'), 'partial');
    assert.strictEqual(adapter.value('tarif.speicherPartiallyAccepted'), true);
    assert.strictEqual(adapter.value('tarif.speicherRequestSatisfied'), false);
    assert.strictEqual(adapter.value('tarif.speicherFarmPlannedW'), 900);
    assert.strictEqual(adapter.value('tarif.speicherFarmDeliveredW'), 600);
    assert.strictEqual(adapter.value('tarif.speicherFarmFailedW'), 0);
    assert.strictEqual(adapter.value('tarif.speicherFarmUnservedW'), 300);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Farm-Dispatch|600 W|900 W|300 W/);
    assert.match(adapter.value('tarif.detailStatusText'), /angefordert 900 W, akzeptiert 600 W/);
    assert.match(adapter.value('tarif.detailStatusText'), /Farm angefordert 900 W, geplant 900 W, akzeptiert 600 W, nicht verteilbar 300 W/);
  }

  // 8) Stale Tarifabsicht darf eine unabhängige Eigenverbrauchsreaktion nicht als Tarifaktion ausgeben.
  {
    const { adapter } = await runScenario({
      tariff: {
        state: 'unbekannt',
        dynamicTariffStale: true,
        speicherSollW: 0,
        storageIntentStatus: 'wait',
        storageIntentReason: 'Tarifdaten sind zu alt – keine neue Tarifaktion',
      },
      storage: {
        requestW: 1007,
        finalW: 1007,
        actualW: 920,
        finalSource: 'eigenverbrauch',
        finalReason: 'NVP-Netzbezug ausgleichen',
      },
    });
    assert.match(adapter.value('tarif.statusText'), /Speicher entlädt/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Tarifwunsch|Tarifdaten sind zu alt|920 W|Quelle/);
    assert.match(adapter.value('tarif.detailStatusText'), /Tarifwunsch Warten/);
    assert.match(adapter.value('tarif.detailStatusText'), /Tarifdaten sind zu alt/);
    assert.match(adapter.value('tarif.detailStatusText'), /Speicher entlädt 920 W/);
    assert.match(adapter.value('tarif.detailStatusText'), /Quelle eigenverbrauch/);
  }

  // 9) Ohne frische Rückmeldung bleibt es bei einer angeforderten Aktion.
  {
    const { adapter } = await runScenario({ storage: { actualW: null, actualAgeMs: null, actualTrusted: false } });
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharge-requested');
    assert.strictEqual(adapter.value('tarif.speicherReadbackFresh'), false);
    assert.match(adapter.value('tarif.statusText'), /Speicher-Entladen angefordert/);
    assert.match(adapter.value('tarif.detailStatusText'), /keine frische Istwert-Rückmeldung/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 10) Ein veralteter Modul-Snapshot darf keine alte Tarifabsicht als live ausgeben.
  {
    const { adapter } = await runScenario({
      tariff: { ts: Date.now() - 30000, speicherSollW: -5000, storageIntentStatus: 'charge' },
      storage: { finalW: 900, actualW: 860, finalSource: 'eigenverbrauch' },
    });
    assert.strictEqual(adapter.value('tarif.intentSnapshotFresh'), false);
    assert.strictEqual(adapter.value('tarif.speicherIntentW'), 0);
    assert.strictEqual(adapter.value('tarif.speicherIntentStatus'), 'stale');
    assert.match(adapter.value('tarif.statusText'), /Tarifstatus veraltet/);
    assert.match(adapter.value('tarif.statusText'), /Speicher entlädt/);
    assert.match(adapter.value('tarif.detailStatusText'), /Speicher entlädt 860 W/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Tarifwunsch Laden 5000 W/);
  }

  // 11) Reine Klassifikation: no-writer und bewusster No-Write-Hold sind getrennt.
  {
    const noWriter = classifyTariffStorageStatus({ active: true, topology: 'none', finalW: 0, writeStatus: 'kein-aktiver-speicher-ausgang' });
    const hold = classifyTariffStorageStatus({ active: true, topology: 'single', finalW: 700, writeStatus: 'storage:no-write-hold', actualW: 650, actualAgeMs: 1000, actualTrusted: true });
    assert.strictEqual(noWriter.status, 'no-writer');
    assert.strictEqual(hold.status, 'hold');
    assert.strictEqual(hold.gateStatus, 'hold');
  }

  // 12) Ein echter Write-Fehler hat Vorrang vor einem noch laufenden alten Istwert.
  {
    const { adapter } = await runScenario({ storage: { acceptedW: 0, commandEffective: false, requestSatisfied: false, writeOk: false, writeStatus: 'io-write-fehler', actualW: 870, actualTrusted: true } });
    assert.strictEqual(adapter.value('tarif.speicherGateStatus'), 'write-failed');
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'write-failed');
    assert.strictEqual(adapter.value('tarif.speicherCommandEffective'), false);
    assert.match(adapter.value('tarif.statusText'), /Speicher-Schreiben fehlgeschlagen/);
    assert.match(adapter.value('tarif.detailStatusText'), /Speicherbefehl nicht geschrieben/);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Speicher entlädt/);
  }

  // 13) `unverändert` hält einen bereits wirksamen Befehl und ist kein Write-Fehler.
  {
    const { adapter } = await runScenario({ storage: { acceptedW: 900, commandEffective: true, requestSatisfied: true, writeOk: false, writeStatus: 'unverändert', actualW: 860, actualTrusted: true } });
    assert.strictEqual(adapter.value('tarif.speicherGateStatus'), 'accepted');
    assert.strictEqual(adapter.value('tarif.speicherCommandEffective'), true);
    assert.strictEqual(adapter.value('tarif.speicherStatus'), 'discharging');
  }

  // 14) Ein alter Farm-Dispatch darf nicht als aktuelle Verteilung erscheinen.
  {
    const { adapter } = await runScenario({ storage: { topology: 'farm', writeStatus: 'farm', actualW: 860, farmDispatch: { ts: Date.now() - 60000, targetW: 900, deliveredW: 600, unservedW: 300 } } });
    assert.strictEqual(adapter.value('tarif.speicherFarmDeliveredW'), null);
    assert.strictEqual(adapter.value('tarif.speicherFarmUnservedW'), null);
    assert.doesNotMatch(adapter.value('tarif.statusText'), /Farm-Dispatch/);
    assert.doesNotMatch(adapter.value('tarif.detailStatusText'), /Farm-Dispatch/);
  }

  // 15) Architekturvertrag: TarifVis schreibt nur die Absicht; Finalizer kommt nach StorageControl.
  {
    const root = path.resolve(__dirname, '..');
    const tariffSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/modules/tarif-vis.ts'), 'utf8');
    const managerSource = fs.readFileSync(path.join(root, 'src-ts/runtime-executables/ems/module-manager.ts'), 'utf8');
    assert(!tariffSource.includes("_setIfChanged('tarif.statusText'"), 'TarifVis darf den sichtbaren finalen Status nicht mehr vorzeitig schreiben');
    const storageIndex = managerSource.indexOf("key: 'speicherRegelung'");
    const finalizerIndex = managerSource.indexOf("key: 'tariffStatus'");
    assert(storageIndex >= 0 && finalizerIndex > storageIndex, 'TariffStatus muss nach SpeicherRegelung laufen');
  }

  console.log('[tariff-storage-status-truth] OK: Tarifabsicht, Resolver, Gate/Write, Farm-Dispatch und frischer Istwert sind getrennt; Laden/Entladen wird nur bei bestätigtem Readback angezeigt.');
})().catch((error) => {
  console.error('[tariff-storage-status-truth] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
