'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EXTENDED_REGISTERS, extendedRegistersForProfile, tokenResponse, encodeEngineering, buildVartaExtendedAliases } = require('../lib/vartaExtendedProtocol');
const { getVartaProfile, decodeWords, scaleValue } = require('../lib/vartaProtocol');
const template = key => ({ id: `ess.varta.${key}.modbusTcpV14`, manufacturer: 'VARTA', driverHints: { vartaModbus: { product: key } } });
const def = id => EXTENDED_REGISTERS.find(row => row.id === id);

test('VARTA extended matrix matches independent XLSX columns K:P for all eight profiles', () => {
  const common = [1073, 1074, 1075, 1100, 1101];
  const auth = [1076, 1077, 1079, 1081];
  const scaled = [2074, 2075, 2077, 2100, 2101];
  const frequency = [1300, 1303, 1304, 1305, 1306, 2305];
  const expected = {
    element: [...common, 1072, ...auth],
    oneL: [...common, 1072, ...auth],
    oneXL: [...common, 1072, ...auth],
    elementBackup: [...common, 1072, ...auth],
    pulse: [...common, 1072, ...auth, 1089, 1090, 1091],
    pulseNeo: [...common, 1072, ...auth, 1088, 1090, 1091, ...scaled, ...frequency],
    link: [...common, 1072],
    flexStorage: [...common, ...auth, 1088, 1200, 1201, ...scaled, ...frequency, 1301, 1302, 2301, 2302],
  };
  for (const [key, addresses] of Object.entries(expected)) {
    const rows = extendedRegistersForProfile(getVartaProfile(template(key)));
    assert.deepEqual(rows.map(row => row.address).sort((a, b) => a - b), addresses.sort((a, b) => a - b), key);
    assert.ok(rows.every(row => row.extended === true), key);
  }
  assert.deepEqual(extendedRegistersForProfile(null), []);
});

test('VARTA extended writable register whitelist excludes token and encrypted data', () => {
  const writes = EXTENDED_REGISTERS.filter(row => row.writable).map(row => row.address);
  assert.deepEqual(writes, [1074, 1075, 1077, 1089, 1100, 1101, 1304, 1305, 1306, 2074, 2075, 2077, 2100, 2101, 2301, 2302, 2305]);
  assert.ok(!def('pEXTRA_TOKEN').writable);
  assert.equal(def('eNCRYPTED_DISCHARGE_ENERGY').unit, '');
  assert.equal(def('eNCRYPTED_DISCHARGE_ENERGY').sf, undefined);
  assert.equal(decodeWords([0x3DC8, 0x525E], def('eNCRYPTED_DISCHARGE_ENERGY')), 0x525E3DC8);
  assert.ok(EXTENDED_REGISTERS.filter(row => row.address >= 2000).every(row => row.isScaleFactor));
  assert.ok(EXTENDED_REGISTERS.filter(row => [1300, 1301, 1302, 1303, 1304, 1305, 1306, 2301, 2302, 2305].includes(row.address)).every(row => row.frequency));
});

test('VARTA Pextra CRC matches all four manufacturer vectors, including leading-zero challenge', () => {
  for (const [challenge, response] of [[0x7CED, 0xFCD6], [0xCDB1, 0x1ABF], [0x099A, 0x9216], [0x4955, 0x8512]]) {
    assert.equal(tokenResponse(challenge), response);
  }
  // C50 documents a Linux EMS bug; compatibility mode must be explicit.
  assert.equal(tokenResponse(0x099A, true), 0x7756);
  assert.notEqual(tokenResponse(0x099A), tokenResponse(0x099A, true));
  assert.equal(tokenResponse(0x7CED, true), 0xFCD6);
  for (const invalid of [-1, 65536, 1.5, NaN, Infinity, null, true, '1234']) assert.throws(() => tokenResponse(invalid));
});

test('VARTA engineering encoding uses correct two-complement and unsigned ranges', () => {
  assert.equal(encodeEngineering(-500, def('dISCHARGE_LIMIT')), 65036);
  assert.equal(encodeEngineering(-32768, def('dISCHARGE_LIMIT')), 32768);
  assert.equal(encodeEngineering(0, def('dISCHARGE_LIMIT')), 0);
  assert.equal(encodeEngineering(65535, def('cHARGE_LIMIT')), 65535);
  assert.equal(encodeEngineering('-5000', def('dISCHARGE_LIMIT'), 1), 65036);
  assert.equal(encodeEngineering(' 5e3 ', def('cHARGE_LIMIT'), 1), 500);
  for (const [value, row, sf] of [[-32769, 'dISCHARGE_LIMIT', 0], [500, 'dISCHARGE_LIMIT', 0], [-1, 'cHARGE_LIMIT', 0], [65536, 'cHARGE_LIMIT', 0], [5001, 'dISCHARGE_LIMIT', 1]]) {
    assert.throws(() => encodeEngineering(value, def(row), sf), { code: 'E_VARTA_WRITE_VALUE' });
  }
});

test('VARTA percentage and energy encoding preserves base units and decimal precision', () => {
  assert.equal(encodeEngineering(100, def('pOWER_FRACTION')), 1000);
  assert.equal(encodeEngineering(-100, def('pOWER_FRACTION')), 64536);
  assert.equal(encodeEngineering(0.3, def('pOWER_FRACTION')), 3);
  assert.equal(encodeEngineering('1.2e1', def('pOWER_FRACTION')), 120);
  assert.equal(encodeEngineering(12340, def('eXTERNAL_PV_ENERGY')), 1234);
  assert.equal(encodeEngineering(123400, def('eXTERNAL_PV_ENERGY'), 1), 1234);
  assert.equal(scaleValue(decodeWords([0xFF9C], def('eNVIRONMENT_TEMPERATURE')), 0, -1), -10);
  for (const [value, row, sf] of [[100.1, 'pOWER_FRACTION', 0], [-100.1, 'pOWER_FRACTION', 0], [0.31, 'pOWER_FRACTION', 0], ['0.30000000000000001', 'pOWER_FRACTION', 0], [12341, 'eXTERNAL_PV_ENERGY', 0], [5001, 'cHARGE_LIMIT', 1]]) {
    assert.throws(() => encodeEngineering(value, def(row), sf), { code: 'E_VARTA_WRITE_VALUE' });
  }
});

test('VARTA encoding rejects coercions, nonfinite values, invalid SF and unsupported writes', () => {
  for (const value of [true, false, null, undefined, [], {}, '', ' ', NaN, Infinity, -Infinity, 'NaN', 'Infinity', '0x20', '1,5', '1W']) {
    assert.throws(() => encodeEngineering(value, def('cHARGE_LIMIT')), { code: 'E_VARTA_WRITE_VALUE' });
  }
  for (const exponent of [NaN, Infinity, 0.1, '0', -32769, 32768, 309, -324]) {
    assert.throws(() => encodeEngineering(0, def('cHARGE_LIMIT'), exponent), { code: 'E_VARTA_WRITE_VALUE' });
  }
  assert.throws(() => encodeEngineering(1, def('eNCRYPTED_DISCHARGE_ENERGY')), { code: 'E_VARTA_WRITE_VALUE' });
  assert.throws(() => encodeEngineering(2, def('fREQUENCY_ACTIVE')), { code: 'E_VARTA_WRITE_VALUE' });
});

function aliases(key, cfg = {}, missing = []) {
  // Deliberately inject every product's datapoints: product filtering must
  // still protect against stale or manually added unsupported registers.
  return buildVartaExtendedAliases({ template: template(key), cfg, _aliasRelId: id => id,
    dpById: new Map(EXTENDED_REGISTERS.filter(row => !missing.includes(row.id)).map(row => [row.id, row])) });
}

test('VARTA aliases advertise only explicitly enabled controls and product-supported functions', () => {
  assert.ok(aliases('pulseNeo').every(alias => alias.rw === 'ro'));
  assert.ok(aliases('pulseNeo').every(alias => !alias.relId.includes('frequency')));
  assert.deepEqual(aliases('pulseNeo', { vartaExtendedEnabled: false, vartaAllowControlWrites: true }), []);
  const enabled = aliases('pulseNeo', { vartaAllowControlWrites: true, vartaFrequencyControlEnabled: true });
  const paths = enabled.map(alias => alias.relId);
  for (const path of ['ctrl.maxChargePowerW', 'ctrl.maxDischargePowerW', 'ctrl.additionalPowerW', 'ctrl.externalPvPowerW', 'ctrl.externalPvEnergyWh', 'ctrl.frequencyPowerW', 'ctrl.frequencyActive', 'ctrl.frequencyAlive']) assert.ok(paths.includes(path), path);
  for (const path of ['ctrl.power', 'ctrl.powerW', 'ctrl.run', 'ctrl.enable', 'r.energyDischarge', 'ctrl.powerFractionPct']) assert.ok(!paths.includes(path), path);
  assert.ok(!aliases('link', { vartaAllowControlWrites: true, vartaFrequencyControlEnabled: true }).some(alias => /additional|frequency|powerFraction|temperature/.test(alias.relId)));
  assert.ok(aliases('pulse', { vartaAllowControlWrites: true }).some(alias => alias.relId === 'ctrl.powerFractionPct'));
  assert.ok(!aliases('pulse', { vartaAllowControlWrites: true }).some(alias => alias.relId === 'r.temperature'));
  assert.ok(!aliases('flexStorage', { vartaAllowControlWrites: true }).some(alias => alias.relId === 'r.errorCode'));
  assert.ok(!aliases('pulseNeo', { vartaAllowControlWrites: true }, ['cHARGE_LIMIT']).some(alias => alias.relId === 'ctrl.maxChargePowerW'));
});

test('VARTA limit aliases map nonnegative limits and preserve native specialty control semantics', () => {
  const map = new Map(aliases('pulseNeo', { vartaAllowControlWrites: true, vartaFrequencyControlEnabled: true }).map(alias => [alias.relId, alias]));
  const discharge = map.get('ctrl.maxDischargePowerW');
  assert.equal(discharge.toDevice(500), -500);
  assert.equal(discharge.toDevice('500'), -500);
  assert.equal(discharge.toDevice(0), 0);
  assert.equal(discharge.fromDevice(-500), 500);
  assert.equal(discharge.fromDevice(null), null);
  for (const value of [-500, true, null, '']) assert.throws(() => discharge.toDevice(value));
  assert.equal(map.get('ctrl.additionalPowerW').toDevice, undefined);
  assert.equal(map.get('ctrl.frequencyPowerW').toDevice, undefined);
  assert.match(map.get('ctrl.frequencyPowerW').name, /\+ charge \/ - discharge/);
  const active = map.get('ctrl.frequencyActive');
  assert.equal(active.toDevice(true), 1);
  assert.equal(active.toDevice(false), 0);
  assert.equal(active.fromDevice(1), true);
  assert.equal(active.fromDevice(0), false);
  assert.equal(active.fromDevice(2), null);
  assert.throws(() => active.toDevice(2));
});
