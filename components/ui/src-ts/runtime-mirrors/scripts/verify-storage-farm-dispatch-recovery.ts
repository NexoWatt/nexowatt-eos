// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-farm-dispatch-recovery.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * scripts/verify-storage-farm-dispatch-recovery.js
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
 * Original-Hash: 212dce62308f6c0885f02c2c6599f2d8f723df038b2b8dd1bb5fc806e7c38488
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
 * Regression 0.8.122: Eine aktive Speicherfarm startet die Basis-
 * Eigenverbrauchsoptimierung und verteilt den zentralen Sollwert anhand stabiler
 * Hardware-IDs. Ein leeres/veraltetes Status-JSON muss vor dem Dispatch neu
 * aufgebaut werden; nackte Array-Indizes dürfen die Speicher nicht vertauschen.
 */

const assert = require('assert');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');

const now = Date.now();
const internal = new Map();
const foreign = new Map();
const writes = [];
const writeAttempts = [];

/**
 * Code-Teil: AdapterStub
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class AdapterStub extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = options.name || 'nexowatt-ui';
    this.namespace = `${this.name}.0`;
    this.config = {};
    this.stateCache = {};
    this.blockedForeignIds = new Set();
    this.log = { debug() {}, info() {}, warn() {}, error() {}, silly() {} };
  }
  async setObjectNotExistsAsync() {}
  async getStateAsync(id) { return internal.get(String(id)) || null; }
  async setStateAsync(id, value, ack) {
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    const rec = { val, ack: value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'ack') ? value.ack : !!ack, ts: Date.now(), lc: Date.now() };
    internal.set(String(id), rec);
    this.stateCache[String(id)] = { value: val, ts: rec.ts, lc: rec.lc, ack: rec.ack };
  }
  async getForeignStateAsync(id) { return foreign.get(String(id)) || null; }
  async getForeignObjectAsync(id) {
    const sid = String(id || '');
    const unit = sid.endsWith('.soc') ? '%' : 'W';
    return { type: 'state', common: { unit, write: sid.endsWith('.set') }, native: {} };
  }
  async setForeignStateAsync(id, value) {
    const sid = String(id);
    const val = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val') ? value.val : value;
    writeAttempts.push({ id: sid, val: Number(val), blocked: this.blockedForeignIds.has(sid) });
    if (this.blockedForeignIds.has(sid)) {
      return {
        __nexowattActuatorAuthorityBlocked: true,
        objectId: sid,
        requestedOwner: 'storageFarm.test',
        blockedByOwner: 'safety.test-owner',
      };
    }
    writes.push({ id: sid, val: Number(val) });
    foreign.set(sid, { val, ack: false, ts: Date.now(), lc: Date.now() });
    return undefined;
  }
  setTimeout(fn, ms) { return setTimeout(fn, ms); }
  setInterval(fn, ms) { return setInterval(fn, ms); }
  clearTimeout(ref) { clearTimeout(ref); }
  clearInterval(ref) { clearInterval(ref); }
}

/**
 * Code-Teil: expressStub
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function expressStub() {
  return { use() {}, get() {}, post() {}, put() {}, delete() {}, listen() { return null; } };
}
expressStub.json = () => (_req, _res, next) => { if (typeof next === 'function') next(); };
expressStub.static = () => (_req, _res, next) => { if (typeof next === 'function') next(); };

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@iobroker/adapter-core') return { Adapter: AdapterStub };
  if (request === 'express') return expressStub;
  if (request === '@iobroker/type-detector') {
    const err = new Error('optional dependency intentionally absent in test');
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }
  return originalLoad.call(this, request, parent, isMain);
};

(async () => {
  try {
    const factory = require(path.join(__dirname, '..', 'main.js'));
    const adapter = factory({});
    adapter._nwLicenseOk = true;
    adapter._nwLicenseInfo = { ok: true, edition: 'eos' };
    adapter.scheduleDerivedFlowUpdate = () => {};
    adapter.updateValue = function updateValue(key, value, ts) {
      this.stateCache[String(key)] = { value, ts: Number(ts) || Date.now(), lc: Number(ts) || Date.now(), ack: true };
    };

    const rows = [
      {
        enabled: true,
        name: 'Farm A',
        socId: 'farm.a.soc',
        signedPowerId: 'farm.a.actual',
        setSignedPowerId: 'farm.a.set',
        capacityKWh: 10,
        maxChargeW: 1000,
        maxDischargeW: 1000,
      },
      {
        enabled: true,
        name: 'Farm B',
        socId: 'farm.b.soc',
        signedPowerId: 'farm.b.actual',
        setSignedPowerId: 'farm.b.set',
        capacityKWh: 20,
        maxChargeW: 5000,
        maxDischargeW: 5000,
      },
    ];

    adapter.config = {
      emsApps: { apps: { storagefarm: { installed: true, enabled: true } } },
      storageFarm: { mode: 'pool', schedulerIntervalMs: 2000, storages: rows },
    };
    internal.set('storageFarm.configJson', { val: JSON.stringify(rows), ack: true, ts: now, lc: now });
    adapter.stateCache['storageFarm.configJson'] = { value: JSON.stringify(rows), ts: now, lc: now, ack: true };
    adapter.stateCache['settings.deviceStaleTimeoutSec'] = { value: 300, ts: now, lc: now, ack: true };

    for (const [id, val] of [
      ['farm.a.soc', 50], ['farm.a.actual', 0],
      ['farm.b.soc', 60], ['farm.b.actual', 0],
    ]) {
      foreign.set(id, { val, ack: true, ts: now, lc: now });
    }

    await adapter.ensureStorageFarmStates();
    await adapter.updateStorageFarmDerived('regression-initial');

    const statusInitial = JSON.parse(String((internal.get('storageFarm.storagesStatusJson') || {}).val || '[]'));
    assert.strictEqual(statusInitial.length, 2, 'Farm-Aggregation muss zwei Statuszeilen erzeugen');
    assert.ok(statusInitial.every((row) => String(row.dispatchKey || '').startsWith('set-signed:')), 'Statuszeilen brauchen stabile Setpoint-DispatchKeys');
    assert.ok(statusInitial.every((row) => row.chargeDispatchAvailable === true), 'beide Farm-Speicher muessen ladedispatchbar sein');

    // Status-Reihenfolge absichtlich vertauschen: Die Verteilung muss weiterhin
    // anhand dispatchKey und nicht anhand des Array-Index erfolgen.
    internal.set('storageFarm.storagesStatusJson', { val: JSON.stringify(statusInitial.slice().reverse()), ack: true, ts: Date.now(), lc: Date.now() });
    writes.length = 0;
    let result = await adapter.applyStorageFarmTargetW(-5000, { source: 'pv' });
    assert.strictEqual(result.applied, true, `Farm-Dispatch muss schreiben: ${result.reason}`);
    assert.strictEqual(result.reason, 'farm');
    assert.strictEqual(result.status, 'farm');
    assert.strictEqual(result.writeOk, true);
    assert.strictEqual(result.requestSatisfied, true);
    const byId = new Map(writes.map((row) => [row.id, row.val]));
    assert.strictEqual(byId.get('farm.a.set'), -1000, 'Farm A muss durch ihr eigenes 1-kW-Limit begrenzt werden');
    assert.strictEqual(byId.get('farm.b.set'), -4000, 'Farm B muss den verbleibenden 4-kW-Anteil erhalten');
    assert.ok(result.results.every((row) => row.statusMatch === 'dispatch-key'), 'Status muss ueber stabile Keys zugeordnet sein');

    // Direkter Richtungswechsel: Auf eine laufende Beladung folgt im naechsten
    // Dispatcher-Aufruf sofort die Entladevorgabe. Es darf keine zusaetzliche
    // Farm-Runde mit 0 W dazwischen erzeugt werden.
    writes.length = 0;
    result = await adapter.applyStorageFarmTargetW(3000, { source: 'eigenverbrauch' });
    assert.strictEqual(result.applied, true, `Direkter Farm-Richtungswechsel muss schreiben: ${result.reason}`);
    const reverseWrites = writes.filter((row) => row.id === 'farm.a.set' || row.id === 'farm.b.set');
    assert.strictEqual(reverseWrites.length, 2, 'Direkter Farm-Richtungswechsel muss genau beide zugeordneten Signed-DPs schreiben');
    assert.ok(reverseWrites.every((row) => row.val > 0), `Farm darf beim Richtungswechsel keinen 0-W-Zwischenschritt senden: ${JSON.stringify(reverseWrites)}`);
    assert.strictEqual(reverseWrites.reduce((sum, row) => sum + row.val, 0), 3000, 'Farm muss den positiven Gesamt-Sollwert vollstaendig verteilen');

    // Leerer/veralteter Status darf keinen dauerhaften No-Write erzeugen. Der
    // Dispatcher muss die Aggregation einmal aktualisieren und danach verteilen.
    internal.set('storageFarm.storagesStatusJson', { val: '[]', ack: true, ts: Date.now() - 60000, lc: Date.now() - 60000 });
    writes.length = 0;
    result = await adapter.applyStorageFarmTargetW(-3000, { source: 'pv' });
    assert.strictEqual(result.applied, true, `Preflight-Refresh muss Farm-Dispatch wiederherstellen: ${result.reason}`);
    assert.ok(result.results.every((row) => row.statusMatch !== 'missing'), 'nach Refresh darf kein Farmstatus fehlen');
    assert.strictEqual(Math.round(Math.abs(result.deliveredW)), 3000);

    // Teilfehler: Nur die wirklich akzeptierte Leistung darf als Farmwirkung
    // veröffentlicht werden. Der fehlgeschlagene Anteil bleibt separat sichtbar.
    adapter.blockedForeignIds = new Set(['farm.b.set']);
    adapter._sfLastSetpoints.clear();
    adapter._sfLastSetpointsTs.clear();
    writes.length = 0;
    writeAttempts.length = 0;
    result = await adapter.applyStorageFarmTargetW(3000, { source: 'eigenverbrauch' });
    assert.strictEqual(result.applied, true, 'Ein akzeptierter Teilwrite muss als teilweise wirksam sichtbar bleiben');
    assert.strictEqual(result.commandEffective, true);
    assert.strictEqual(result.writeOk, false);
    assert.strictEqual(result.requestSatisfied, false);
    assert.strictEqual(result.partiallyAccepted, true);
    assert.strictEqual(result.reason, 'farm-partial');
    assert.strictEqual(result.status, 'farm-partial');
    assert.strictEqual(result.requestedW, 3000);
    assert.strictEqual(result.plannedDeliveredW, 3000);
    assert.ok(result.acceptedDeliveredW > 0 && result.acceptedDeliveredW < result.plannedDeliveredW, `Akzeptierter Teil muss zwischen 0 und Planung liegen: ${JSON.stringify(result)}`);
    assert.strictEqual(result.failedW, result.plannedDeliveredW - result.acceptedDeliveredW);
    assert.strictEqual(result.unservedW, 0);

    // Ein zentraler Safety-/Authority-Block darf niemals als erfolgreicher
    // Hardware-Write oder als aktualisierter Keepalive-Cache gelten.
    adapter.blockedForeignIds = new Set(['farm.a.set', 'farm.b.set']);
    adapter._sfLastSetpoints.clear();
    adapter._sfLastSetpointsTs.clear();
    writes.length = 0;
    writeAttempts.length = 0;
    result = await adapter.applyStorageFarmTargetW(-2000, { source: 'pv' });
    assert.strictEqual(result.applied, false, 'Authority-blockierte Farmwrites duerfen nicht als angewendet gelten');
    assert.strictEqual(result.reason, 'blocked-by-actuator-authority');
    assert.strictEqual(result.authorityBlockedCount, 2);
    assert.deepStrictEqual(result.blockedByOwners, ['safety.test-owner']);
    assert.strictEqual(writes.length, 0, 'Blockierte Farmwrites duerfen die simulierte Hardware nicht erreichen');
    assert.strictEqual(writeAttempts.filter((row) => row.blocked).length, 2, 'Beide Farm-Ausgaenge muessen durch den Gate-Pfad laufen');
    assert.strictEqual(adapter._sfLastSetpoints.size, 0, 'Blockierte Writes duerfen den Keepalive-Cache nicht fortschreiben');
    assert.ok(result.results.every((row) => Object.values(row.writes || {}).some((wr) => wr && wr.blocked === true)));
    const blockedDiag = JSON.parse(String((internal.get('storageFarm.lastDispatchJson') || {}).val || '{}'));
    assert.ok(blockedDiag.results.every((row) => row.authorityBlocked === true), 'Diagnose muss den Gate-Block pro Speicher sichtbar machen');
    assert.ok(blockedDiag.results.every((row) => Array.isArray(row.blockedByOwners) && row.blockedByOwners.includes('safety.test-owner')));

    // Der Speicherregler muss die aktive Farm als exklusive Schreibtopologie
    // auswählen, ohne den Einzel-Speicher-App-Haken zu benoetigen.
    const storageSource = require('fs').readFileSync(path.join(__dirname, '..', 'src-ts/runtime-executables/ems/modules/storage-control.ts'), 'utf8');
    assert.ok(storageSource.includes('const enabled = !!storageAuthorityEarly.writerActive;'));
    assert.ok(storageSource.includes("const farmEnabledEarly = storageAuthorityEarly.selectedTopology === 'farm';"));
    assert.ok(storageSource.includes("aktivAutoSpeicherfarm', farmAppPolicyActive"));

    console.log('[storage-farm-dispatch-recovery] OK: Farm-Steuerhoheit, Status-Refresh, direkter Richtungswechsel und stabile Hardwarezuordnung schreiben die zugeordneten Sollwerte.');
  } finally {
    Module._load = originalLoad;
  }
})().catch((err) => {
  Module._load = originalLoad;
  console.error('[storage-farm-dispatch-recovery] ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
});
