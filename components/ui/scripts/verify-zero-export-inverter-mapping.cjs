#!/usr/bin/env node
'use strict';

/**
 * WR-Zuordnungen: echte Gruppen-/EVU-Writer mit registrierten Testausgängen.
 * Prüft Konfigurationsbereitschaft getrennt von Hardwarewirkung, eindeutige
 * Sollwertziele, ausbleibende positive Befehle bei Fehlern und den ersten
 * Einspeisedeckel im NVP-Totband. Es wird keine reale Hardware angesprochen.
 */
const assert = require('node:assert/strict');
const { GridConstraintsModule } = require('../ems/modules/grid-constraints');

function config(rows, extra = {}) {
  return {
    zeroExportEnabled: true, exportLimitInstallerApproved: true,
    exportLimitRunMode: 'active', exportLimitMaxFeedInW: 0,
    zeroExportBiasW: 80, zeroExportDeadbandW: 50,
    pvCurtailInvertersZero: rows, ...extra,
  };
}

function runtime(cfg, options = {}) {
  const writes = [];
  const entries = new Map();
  const states = new Map();
  const register = (key, objectId) => {
    if (!objectId) return;
    entries.set(key, { key, objectId, dataType: 'number', direction: 'out', scale: 1, offset: 0 });
  };
  for (const [group, field] of [['zero', 'pvCurtailInvertersZero'], ['evu', 'pvCurtailInvertersEvu']]) {
    (cfg[field] || []).forEach((row, i) => {
      register(`pv.${group}.${i}.feedInLimitW`, row?.feedInLimitWId);
      register(`pv.${group}.${i}.limitW`, row?.pvLimitWId);
      register(`pv.${group}.${i}.limitPct`, row?.pvLimitPctId);
    });
  }
  register('pv.feedInLimitW', cfg.pvFeedInLimitWId);
  register('pv.limitW', cfg.pvLimitWId);
  register('pv.limitPct', cfg.pvLimitPctId);
  const adapter = {
    config: { enableGridConstraints: true, gridConstraints: cfg }, stateCache: {},
    log: { info() {}, warn() {}, debug() {}, error() {} },
    async setStateAsync(id, value) { states.set(id, value?.val ?? value); },
    async getStateAsync(id) { return states.has(id) ? { val: states.get(id), ts: Date.now(), ack: true } : null; },
    async getForeignObjectAsync(id) {
      if (options.unknownObjects) return null;
      const obj = options.objects?.[id] || {};
      return { ...obj, common: { type: 'number', write: true, ...(obj.common || {}) } };
    },
  };
  const dp = {
    getEntry: key => entries.get(key),
    getNumber: (_key, fallback) => fallback,
    getNumberFresh: (key, _age, fallback) => key === 'ps.pvW' ? 20000 : fallback,
    getBoolean: (key, fallback) => key === 'pv.evu.relay0' ? options.evuStop === true : fallback,
    async writeNumber(key, value) {
      const entry = entries.get(key);
      if (!entry) return false;
      writes.push({ key, objectId: entry.objectId, value });
      if (options.onWrite) await options.onWrite({ adapter, key, value, writes });
      return options.rejectWrites ? false : true;
    },
  };
  const module = new GridConstraintsModule(adapter, dp);
  const ready = Promise.all([...entries.values()].map(e => module._rememberPvWriteTarget(e.objectId)));
  return { module, adapter, entries, states, writes, ready };
}

async function tick(rt, cfg, gridW = -7000, stale = false) {
  await rt.ready;
  return rt.module._tickZeroExportGroup(Date.now(), gridW, cfg, stale);
}

(async () => {
  let count = 0;
  const rows = () => [{ name: 'WR A', kwp: 5, pvLimitWId: 'wr.a.limit' }, { name: 'WR B', kwp: 15, pvLimitWId: 'wr.b.limit' }];
  {
    const cfg = config(rows()); const rt = runtime(cfg);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, true);
    await tick(rt, cfg);
    assert.deepEqual(rt.writes.map(w => w.value), [3230, 9690]);
    count++;
  }
  for (const invalid of [0, '', -1, 'n/a', Infinity]) {
    const wrs = rows(); wrs[0].kwp = invalid;
    const cfg = config(wrs); const rt = runtime(cfg);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, false);
    const result = await tick(rt, cfg);
    assert.equal(result.action, 'invalid_mapping');
    assert.deepEqual(rt.writes.map(w => w.value), [0, 0]);
    count++;
  }
  {
    const wrs = rows(); delete wrs[0].pvLimitWId;
    const cfg = config(wrs); const rt = runtime(cfg);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, false);
    await tick(rt, cfg);
    assert.deepEqual(rt.writes.map(w => w.value), [0]); count++;
  }
  {
    const cfg = config([{ kwp: '5,5', pvLimitWId: 'wr.a.limit' }]); const rt = runtime(cfg);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, true);
    await tick(rt, cfg); assert(rt.writes.some(w => w.value > 0)); count++;
  }
  for (const wrs of [
    [{ kwp: 5, pvLimitWId: 'same.target', pvLimitPctId: 'same.target' }],
    [{ kwp: 5, pvLimitWId: 'same.target' }, { kwp: 5, pvLimitWId: 'same.target' }],
  ]) {
    const cfg = config(wrs); const rt = runtime(cfg);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, false);
    await tick(rt, cfg);
    assert.deepEqual(rt.writes.map(w => w.value), [0]); count++;
  }
  {
    const cfg = config([{ kwp: 5, pvLimitWId: 'same.target' }], {
      pvEvuEnabled: true, pvCurtailInvertersEvu: [{ kwp: 5, pvLimitPctId: 'same.target' }],
    });
    const rt = runtime(cfg, { evuStop: true });
    await rt.ready;
    await rt.module._tickPvEvu(Date.now(), cfg); await tick(rt, cfg);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, false);
    assert(rt.writes.length >= 2); assert(rt.writes.every(w => w.value === 0)); count++;
    cfg.pvEvuEnabled = false; rt.writes.length = 0;
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, true);
    await tick(rt, cfg); assert(rt.writes.some(w => w.value > 0)); count++;
  }
  {
    const cfg = config([{ kwp: 5, pvLimitWId: 'alias.zero' }], {
      pvEvuEnabled: true, pvCurtailInvertersEvu: [{ kwp: 5, pvLimitPctId: 'alias.evu' }],
    });
    const rt = runtime(cfg, { objects: {
      'alias.zero': { common: { alias: { id: { read: 'unrelated.read', write: 'alias.inner' } } } },
      'alias.inner': { common: { alias: { id: 'physical.target' } } },
      'alias.evu': { common: { alias: { id: 'physical.target' } } },
    } });
    await rt.module._rememberPvWriteTarget('alias.zero'); await rt.module._rememberPvWriteTarget('alias.evu');
    await rt.ready;
    await rt.module._tickPvEvu(Date.now(), cfg); await tick(rt, cfg);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, false);
    assert(rt.writes.every(w => w.value === 0)); count++;
  }
  {
    const cfg = config([], { pvLimitWId: 'same.target', pvEvuEnabled: true, pvCurtailInvertersEvu: [{ kwp: 5, pvLimitWId: 'same.target' }] });
    const rt = runtime(cfg);
    await rt.ready;
    await rt.ready;
    await rt.module._tickPvEvu(Date.now(), cfg);
    await rt.module._tickZeroExport(Date.now(), -7000, cfg, false);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'pvLimitW').writable, false);
    assert(rt.writes.every(w => w.value === 0)); count++;
  }
  for (const maxExport of [0, 3000]) {
    const wrs = rows(); wrs.forEach((r, i) => { r.feedInLimitWId = `wr.${i}.export`; });
    const cfg = config(wrs, { exportLimitMaxFeedInW: maxExport }); const rt = runtime(cfg);
    await tick(rt, cfg, 80 - maxExport);
    assert.deepEqual(rt.writes.map(w => [w.key, w.value]), [['pv.zero.0.feedInLimitW', maxExport / 4], ['pv.zero.1.feedInLimitW', maxExport * 3 / 4]]);
    count++;
  }
  {
    const cfg = config(rows()); const rt = runtime(cfg);
    await tick(rt, cfg, 80);
    assert.equal(rt.writes.length, 0, 'Totband ohne Einspeiselimit gibt keinen neuen PV-Sollwert frei'); count++;
    await tick(rt, cfg, 0, true);
    assert.deepEqual(rt.writes.map(w => w.value), [0, 0]); count++;
  }
  {
    const cfg = config(rows()); const rt = runtime(cfg, { onWrite({ adapter, writes }) {
      if (writes.length === 1) adapter.config.gridConstraints = { ...cfg, exportLimitInstallerApproved: false };
    } });
    await tick(rt, cfg);
    assert.equal(rt.writes.filter(w => w.value > 0).length, 1, 'Nach Configwechsel kein alter positiver Folgebefehl'); count++;
  }
  {
    const cfg = config(rows()); const rt = runtime(cfg, { onWrite({ writes }) {
      if (writes.length === 1) cfg.pvCurtailInvertersZero[1].pvLimitWId = 'wr.a.limit';
    } });
    await tick(rt, cfg);
    assert.equal(rt.writes.filter(w => w.value > 0).length, 1, 'Neue doppelte Belegung verwirft vorbereiteten Folgebefehl'); count++;
  }
  for (const unsafe of [{ min: 100 }, { offset: 10 }, { invert: true }, { direction: 'in' }, { dataType: 'string' }]) {
    const cfg = config([{ kwp: 0, pvLimitWId: 'invalid.target' }]); const rt = runtime(cfg);
    Object.assign(rt.entries.get('pv.zero.0.limitW'), unsafe);
    await tick(rt, cfg);
    assert.equal(rt.writes.length, 0, 'Kein Blindschreiben auf unpassend normalisiertes Ziel'); count++;
  }
  for (const options of [
    { unknownObjects: true },
    { objects: { 'invalid.target': { common: { alias: { id: 'hardware.limit', write: '100-val' } } } } },
    { objects: { 'invalid.target': { common: { min: 0, max: 1, alias: { id: 'hardware.limit' } } }, 'hardware.limit': { common: { min: 50, max: 100 } } } },
    { objects: { 'invalid.target': { common: { alias: { id: { read: 'read.only' } } } } } },
  ]) {
    const cfg = config([{ kwp: 0, pvLimitPctId: 'invalid.target' }]); const rt = runtime(cfg, options);
    await tick(rt, cfg);
    assert.equal(rt.writes.length, 0, 'Unbekannte oder transformierende Aliase erhalten keinen blinden Nullbefehl'); count++;
  }
  {
    const cfg = config(rows()); const rt = runtime({ ...cfg, zeroExportEnabled: false });
    await tick(rt, cfg);
    assert.equal(rt.writes.length, 0, 'Schon bei Eintritt veraltete Konfiguration erhält keine positiven Befehle'); count++;
  }
  {
    const cfg = config(rows()); const rt = runtime(cfg);
    rt.entries.get('pv.zero.0.limitW').objectId = 'old.output';
    await tick(rt, cfg);
    assert(!rt.writes.some(w => w.objectId === 'old.output'), 'Neue Konfiguration darf nie über veraltete Registry schreiben'); count++;
  }
  {
    const cfg = config([{ kwp: 0, pvLimitWId: 'wr.limit' }]); const rt = runtime(cfg, { rejectWrites: true });
    const result = await tick(rt, cfg); assert.equal(result.applied, false); count++;
  }
  {
    const cfg = config([{ kwp: 5, pvLimitWId: 'same.target' }], {
      exportLimitRunMode: 'diagnostic', pvEvuEnabled: true, pvCurtailInvertersEvu: [{ kwp: 5, pvLimitWId: 'same.target' }],
    });
    const rt = runtime(cfg);
    assert.equal(rt.module._exportWriteDiagnostics(cfg, 'group').writable, false, 'Diagnose erkennt spätere Aktivkollision');
    await rt.ready;
    await rt.module._tickPvEvu(Date.now(), cfg);
    assert(rt.writes.some(w => w.value > 0), 'EVU bleibt aktiv, solange Export Guard nur diagnostiziert');
    const before = rt.writes.length;
    assert.equal(await rt.module._writeValidatedPvLimit('pv.zero.0.limitW', 2000, cfg, true), false);
    assert.equal(rt.writes.length, before); count++;
  }
  console.log(`[zero-export-inverter-mapping] OK: ${count} Konfigurations-, Konflikt-, Alias-, Totband- und Writer-Fälle bestanden.`);
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
