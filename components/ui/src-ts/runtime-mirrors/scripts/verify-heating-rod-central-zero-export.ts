// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-heating-rod-central-zero-export.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-heating-rod-central-zero-export.js
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
 * Original-Hash: d19347e4d0af0094b7b3be4d76542f811ac10984dfb7f8636bd10f7aaac2502c
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
 * Prüft die Heizstab-Anbindung an den zentralen 0-Einspeise-Coordinator.
 * Isolierte Gerätefälle verwenden eine kontrollierte Freigabe-Attrappe;
 * der Coordinator und dessen reale Messwert-/Zeitgrenzen werden separat geprüft.
 * Gelesen wird die kanonische Quelle, damit keine veraltete Generierung grün wird.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const sourceFile = path.join(root, 'src-ts/runtime-executables/ems/modules/heating-rod-control.ts');
const runtimeFile = path.join(root, 'ems/modules/heating-rod-control.js');
const source = fs.readFileSync(sourceFile, 'utf8');
const loaded = new Module(runtimeFile, module);
loaded.filename = runtimeFile;
loaded.paths = Module._nodeModulePaths(path.dirname(runtimeFile));
const normalRequire = Module.createRequire(runtimeFile);
const coordinator = {
  readZeroExportMode: adapter => adapter._zeroMode || { enabled: false, active: false, reason: 'off' },
  isZeroExportGrantValid: (adapter, _key, leaseId) => adapter._zeroMode.active === true && adapter._grantStillValid === true && leaseId === 'live-test-grant',
  requestZeroExportProbe(adapter, request) {
    adapter._probeRequests.push(request);
    if (adapter._realCoordinator) return adapter._realCoordinator.request(request);
    const granted = request.eligible === true && adapter._grant === true;
    return {
      active: granted, granted,
      targetW: granted ? (adapter._targetW ?? request.nextW) : request.baseW,
      reason: granted ? 'probe' : 'blocked', validUntil: granted ? request.now + 20000 : 0,
    };
  },
};
loaded.require = name => name === '../services/zero-export-pv-coordinator' ? coordinator : normalRequire(name);
loaded._compile(source, runtimeFile);
const { HeatingRodControlModule } = loaded.exports;

/**
 * Code-Teil: fixture
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function fixture() {
  const adapter = {
    namespace: 'nexowatt-ui.0', stateCache: {}, _probeRequests: [], _grant: true,
    _zeroMode: { enabled: true, active: true, reason: 'active' },
    config: { enableHeatingRodControl: true, heatingRod: { autoMode: 'pvSurplus' } },
    log: { warn() {}, error() {}, info() {}, debug() {} },
  };
  const mod = new HeatingRodControlModule(adapter, null);
  const device = {
    id: 'rod1', enabled: true, stageCount: 3, wiredStages: 3, maxPowerW: 6000,
    stages: [1, 2, 3].map(index => ({ index, powerW: 2000, writeKey: `rod.s${index}` })),
  };
  const pv = { gridKnown: true, availableW: 0, pvNowW: 2500, budgetGateRemainingW: 6000, gateCfg: { cooldownAfterOffSec: 0, stageUpDelaySec: 0 } };
  const options = { now: 50000, baseW: 0, maxW: 6000, actualW: 0, actualFresh: true, eligible: true };
  return { mod, adapter, device, pv, options };
}

// Der globale Schalter aktiviert die zentrale Anbindung auch beim alten PV-Auto.
{
  const { mod, adapter, pv } = fixture();
  const info = mod._computeZeroExportInfo(pv);
  assert.equal(info.central, true);
  assert.equal(info.cfg.autoMode, 'zeroExportCentral');
  assert.equal(info.canProbe, false, 'Info/Forecast allein darf keine Probe erlauben');
  assert.equal(mod._getBudgetGateCfg().budgetSafetyReserveW, 0);
  adapter.config.heatingRod.autoMode = 'zeroExportForecast';
  adapter._zeroMode.active = false;
  assert.equal(mod._computeZeroExportInfo(pv).canProbe, false, 'Blockierter Zentralmodus darf alte Probe nicht aktivieren');
  assert.equal(mod._getBudgetGateCfg().budgetSafetyReserveW, 200, 'Normaler Reservewert bleibt erhalten');
}

// Exakt eine reale Stufe, nie nominelle Phantom-PV oder beliebige Bruchleistung.
{
  const { mod, adapter, device, pv, options } = fixture();
  const result = mod._applyCentralZeroExportStageStrategy(device, 0, pv, options);
  assert.equal(result.targetStage, 1);
  assert.equal(adapter._probeRequests[0].nextW, 2000);
  assert.equal(adapter._probeRequests[0].baseW, 0);
  assert.equal(pv.availableW, 0, 'Probe darf das physikalische Budget nicht mutieren');
}

// Eine Teilfreigabe und eine zu kleine Gesamt-/§14a-/Strategiegrenze bleiben AUS.
for (const variant of ['partial', 'total-cap']) {
  const { mod, adapter, device, pv, options } = fixture();
  if (variant === 'partial') adapter._targetW = 1999;
  else options.maxW = 1999;
  const result = mod._applyCentralZeroExportStageStrategy(device, 0, pv, options);
  assert.equal(result.targetStage, 0, variant);
  if (variant === 'total-cap') assert.equal(adapter._probeRequests[0].eligible, false);
}

// Ein Gerätemaximum macht zwei physische Relais nicht zu einer Teilstufe.
{
  const { mod, adapter, device, pv, options } = fixture();
  device.maxPowerW = 4000;
  device.stages.forEach(stage => { stage.powerW = 3000; });
  adapter._grant = false;
  const result = mod._applyCentralZeroExportStageStrategy(device, 0, pv,
    { ...options, baseW: 4000, maxW: 4000 });
  assert.equal(result.targetStage, 1);
  assert.equal(adapter._probeRequests[0].nextW, 6000);
  assert.equal(adapter._probeRequests[0].eligible, false);
}

// Nur frische Leistung bestätigt einen Verbraucher. Relais-/Schreibwert genügt nicht.
{
  const { mod, adapter, device, pv, options } = fixture();
  const result = mod._applyCentralZeroExportStageStrategy(device, 0, pv, { ...options, actualFresh: false });
  assert.equal(result.targetStage, 0);
  assert.equal(adapter._probeRequests[0].eligible, false);
  device.pWKey = 'rod.power';
  mod.dp = { getEntry: () => ({}), getNumber: () => 2000 };
  assert.equal(mod._readZeroExportActualW(device, 5000), null);
  mod.dp.getNumberFresh = () => 0;
  assert.equal(mod._readZeroExportActualW(device, 5000), null, 'Ohne Alter der Originalmessung ist ein Fresh-Getter kein Nachweis');
  mod.dp.getMeasurementAgeMs = () => 0;
  assert.equal(mod._readZeroExportActualW(device, 5000), 0, 'Frische 0 W ist ein Messwert');
  mod.dp.getMeasurementAgeMs = () => 6000;
  mod.dp.isStale = () => false;
  mod.dp.getAgeMs = () => 0;
  assert.equal(mod._readZeroExportActualW(device, 5000), null, 'Frischer Heartbeat darf eine 6s alte Leistung nicht bestätigen');
  for (const invalidAge of [NaN, Infinity, -1, null]) {
    mod.dp.getMeasurementAgeMs = () => invalidAge;
    assert.equal(mod._readZeroExportActualW(device, 5000), null);
  }
  mod.dp.getMeasurementAgeMs = () => 0;
  mod.dp.getNumberFresh = () => null;
  assert.equal(mod._readZeroExportActualW(device, 5000), null);
}

// Zurückgenommene Freigabe darf nicht von Mindestlaufzeit/Hysterese gehalten werden.
{
  const { mod, adapter, device, pv, options } = fixture();
  mod._stageCtl.set(device.id, { targetStage: 1, lastIncreaseMs: options.now - 1000 });
  adapter._grant = false;
  const result = mod._applyCentralZeroExportStageStrategy(device, 1, pv, { ...options, actualW: 2000 });
  assert.equal(result.targetStage, 0);
  assert.equal(result.stageCap, 0);
  assert.equal(result.reduceNow, true);
}

// Bereits real gedeckte Stufen benötigen keine neue Testfreigabe; harte Grenzen bleiben.
{
  const { mod, adapter, device, pv, options } = fixture();
  adapter._grant = false;
  const result = mod._applyCentralZeroExportStageStrategy(device, 1, pv,
    { ...options, baseW: 2000, actualW: 2000, maxW: 2000 });
  assert.equal(result.targetStage, 1);
  const blocked = mod._applyCentralZeroExportStageStrategy(device, 1, pv,
    { ...options, actualW: 2000, budgetProtection: { hardOff: true } });
  assert.equal(blocked.targetStage, 0);
  assert.equal(blocked.hardOff, true);
}

// Doppelt abgebildete virtuelle Stufen dürfen kein zweites identisches Relais testen.
{
  const { mod, adapter, device, pv, options } = fixture();
  device.stages[1].writeKey = device.stages[0].writeKey;
  mod._applyCentralZeroExportStageStrategy(device, 1, pv, { ...options, baseW: 2000, actualW: 2000 });
  assert.equal(adapter._probeRequests[0].nextW, 4000);
}

// Integration-Anker schützen den Deckel hinter Timing und TS-Fallback sowie Abbruchpfade.
assert(source.includes('targetStage = Math.min(targetStage, zeroDecision.stageCap)'));
assert(source.includes("effectiveMode !== 'pvAuto' || !pvAutomationActive"));
assert(source.includes('nightPvAutoLock.active || d.consumerType'));

// Nur reale Auto-Eigentümerschaft darf den zentralen flexiblen PV-Anteil erhöhen.
{
  const { mod, adapter, device } = fixture();
  mod._setStageCtlTarget(device.id, 1, 0);
  mod._markAutoOwnership(device, true, 1, 'pvAuto');
  assert.equal(adapter._zeroExportPvOwnedHeatingRod[device.id].owned, true);
  assert(adapter._zeroExportPvOwnedHeatingRod[device.id].ts > 0);
  mod._getAutoOwnership(device, 2, 4000, { appliedPowerW: 4000 });
  assert.equal(adapter._zeroExportPvOwnedHeatingRod[device.id].owned, false, 'Externe zusätzliche Stufe ist Hauslast');
  mod._markAutoOwnership(device, false, 1, 'manual_mode');
  assert.equal(adapter._zeroExportPvOwnedHeatingRod[device.id].owned, false);
  mod._markAutoOwnership(device, true, 1, 'boost');
  assert.equal(adapter._zeroExportPvOwnedHeatingRod[device.id].source, 'boost', 'Core muss BOOST zusätzlich am effektiven Modus ausschließen');
  mod._publishZeroExportOwnership(device, false, 'module-disabled');
  assert.equal(adapter._zeroExportPvOwnedHeatingRod[device.id].owned, false);
}

// Ablauf mit der echten zentralen Zustandsmaschine: Arbitration -> Last ->
// nachgewiesener PV-Anstieg -> normales PV-Budget. Kein Eigen-Nachweis im Heizstab.
{
  const servicePath = path.join(root, 'src-ts/runtime-executables/ems/services/zero-export-pv-coordinator.ts');
  const service = new Module(servicePath, module);
  service._compile(fs.readFileSync(servicePath, 'utf8'), servicePath);
  const { mod, adapter, device, pv, options } = fixture();
  adapter._realCoordinator = new service.exports.ZeroExportPvCoordinator();
/**
 * Code-Teil: sample
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const sample = (now, pvW) => adapter._realCoordinator.update({
    now, mode: { ...adapter._zeroMode, maxProbeW: 4200, importBiasW: 80 },
    gridW: 0, gridFresh: true, pvW, pvFresh: true,
    storageFresh: true, storageDischargeW: 0, safetyReady: true,
  });
  sample(50000, 1000);
  assert.equal(mod._applyCentralZeroExportStageStrategy(device, 0, pv, options).targetStage, 0);
  sample(51000, 1000);
  const granted = mod._applyCentralZeroExportStageStrategy(device, 0, pv, { ...options, now: 51000 });
  assert.equal(granted.targetStage, 1);
  mod._setStageCtlTarget(device.id, 1, 0);
  sample(52000, 3000);
  assert.equal(mod._applyCentralZeroExportStageStrategy(device, 1, pv,
    { ...options, now: 52000, actualW: 2000 }).targetStage, 1);
  sample(55000, 3000);
  const confirmed = mod._applyCentralZeroExportStageStrategy(device, 1, pv,
    { ...options, now: 55000, actualW: 2000, baseW: 2000, maxW: 2000 });
  assert.equal(confirmed.targetStage, 1);
  assert.equal(confirmed.probe.reason, 'pv-delivery-confirmed');
  assert.equal(adapter._realCoordinator.lease, null);
}

// Ein verzögerter Writer darf eine inzwischen entzogene Freigabe nicht behalten.
// Nach Widerruf werden auch bereits geschriebene Stufen unmittelbar AUS gesetzt.
(async () => {
  for (const revokeDuringWrite of [false, true]) {
    const { mod, adapter, device } = fixture();
    const feedback = { anyKnown: true, currentStage: 0, states: [false, false, false], appliedPowerW: 0 };
    const writes = [];
    adapter._grantStillValid = revokeDuringWrite;
    mod._publishHeatingContract = async () => {};
    mod._readStageFeedback = () => feedback;
    mod._writeBoolForce = async (key, value) => {
      writes.push({ key, value });
      if (value) {
        // Bildet einen Moduswechsel während der wartenden Relais-Antwort ab.
        await Promise.resolve();
        adapter._zeroMode.active = false;
        adapter._grantStillValid = false;
      }
      return true;
    };
    const result = await mod._applyStageState(device, 1, feedback, {
      force: true, zeroExportGrant: { leaseId: 'live-test-grant' },
    });
    assert.equal(result.targetStage, 0);
    if (!revokeDuringWrite) assert(writes.every(write => write.value === false));
    assert.deepEqual(writes.slice(-3).map(write => write.value), [false, false, false]);
  }
  console.log('[heating-rod-central-zero-export] OK: zentrale Freigabe, reale Stufen, Frische, Grenzen, Rücknahme und finaler Writer-Guard.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
