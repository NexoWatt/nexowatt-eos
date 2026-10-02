#!/usr/bin/env node
'use strict';

/**
 * RC38 regression: Fehlende/leere/strukturelle Datenpunktwerte duerfen nicht
 * durch JavaScript-Zahlkoerzierung als reale 0 in Regelungen gelangen.
 */
const assert = require('node:assert/strict');
const { DatapointRegistry } = require('../ems/datapoints');

(async () => {
  const adapter = {
    log: { debug() {}, info() {}, warn() {}, error() {} },
    async getForeignObjectAsync() { return { type: 'state', common: { type: 'number', unit: 'W' }, native: {} }; },
    async getForeignStateAsync() { return null; },
    async subscribeForeignStatesAsync() {},
    async setForeignStateAsync() {},
  };
  const dp = new DatapointRegistry(adapter, [{
    key: 'test.powerW',
    name: 'Testleistung',
    objectId: 'test.0.power',
    dataType: 'number',
    direction: 'in',
    unit: 'W',
  }]);
  await dp.init();

  const set = (val, ts = Date.now()) => {
    dp.handleStateChange('test.0.power', { val, ack: true, ts, lc: ts });
  };

  for (const invalid of [null, undefined, '', '   ', true, false, {}, [], ['1'], Number.NaN, Number.POSITIVE_INFINITY]) {
    set(invalid);
    assert.equal(dp.getNumber('test.powerW', 77), 77,
      `${JSON.stringify(invalid)} must use fallback instead of becoming a real numeric measurement`);
    assert.equal(dp.getNumberFresh('test.powerW', 5000, 88), 88,
      `${JSON.stringify(invalid)} must also be rejected by the fresh-number accessor`);
  }

  for (const [raw, expected] of [
    [0, 0],
    // Das Vorzeichen von IEEE-754 -0 ist fuer physikalische Leistung ohne
    // Bedeutung; entscheidend ist, dass der Messwert als echte 0 erhalten bleibt.
    [-0, 0],
    [42.5, 42.5],
    ['0', 0],
    ['31,5', 31.5],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    [' -250 ', -250],
  ]) {
    set(raw);
    assert.equal(Number(dp.getNumber('test.powerW', 77)), expected, `${String(raw)} must remain a valid finite measurement`);
  }

  set('100', Date.now() - 10_000);
  assert.equal(dp.getNumber('test.powerW', null), 100, 'raw numeric value remains readable for diagnostics');
  assert.equal(dp.getNumberFresh('test.powerW', 1000, null), null, 'stale numeric value must not pass fresh-number access');

  console.log('[datapoint-strict-numbers] OK: null, empty strings, booleans, objects, arrays and non-finite values cannot become physical 0 measurements.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
