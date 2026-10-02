'use strict';

const { getVartaProfile } = require('./vartaProtocol');

// VARTA VS-Modbus V14.0, supplied XLSX dated 2025-03-12, sheet "print".
// Each product flag follows columns K:P, including omissions and unsupported
// cells. The first column covers element, one L and one XL, not all products.
const ALL = ['element', 'backup', 'pulse', 'neo', 'link', 'flex'];
const DIRECT = ALL.filter(column => column !== 'link');
const SCALED = ['neo', 'flex'];
const row = (id, address, dataType, unit, columns, options = {}) => Object.freeze({
  id, address, dataType, length: 1, unit, columns: Object.freeze([...columns]), extended: true, ...options,
});
const sf = (id, address, name, columns = SCALED, options = {}) => row(id, address, 'int16', '', columns,
  { name, writable: true, isScaleFactor: true, ...options });

const EXTENDED_REGISTERS = Object.freeze([
  row('eRROR_CODE', 1072, 'uint16', '', ALL.filter(column => column !== 'flex'), { name: 'VARTA error code' }),
  row('cONTROL_REMAINING_S', 1073, 'uint16', 's', ALL, { name: 'UG/OG and Pextra control time remaining' }),
  row('dISCHARGE_LIMIT', 1074, 'int16', 'W', ALL, { name: 'UG: maximum discharge power (negative, 0 disables discharge)', writable: true, max: 0, sf: 'sF_DISCHARGE_LIMIT' }),
  row('cHARGE_LIMIT', 1075, 'uint16', 'W', ALL, { name: 'OG: maximum charge power', writable: true, sf: 'sF_CHARGE_LIMIT' }),
  // FC06 authentication is owned by the driver. The challenge register is not
  // a freely writable user datapoint and must not bypass the handshake.
  row('pEXTRA_TOKEN', 1076, 'uint16', '', DIRECT, { name: 'Pextra authentication challenge (driver managed)' }),
  row('aDDITIONAL_POWER', 1077, 'int16', 'W', DIRECT, { name: 'Pextra additional power (VARTA native sign; not an absolute target)', writable: true, sf: 'sF_ADDITIONAL_POWER' }),
  // Sheet "counter encryption": the actual XOR key AND validation salt are
  // deliberately absent. The example key is not a production key. Do not give
  // ciphertext an energy unit or an energy alias, or infer its scale factor.
  row('eNCRYPTED_DISCHARGE_ENERGY', 1079, 'uint32', '', DIRECT, { name: 'Encrypted discharge counter (raw, not Wh)', length: 2 }),
  row('eNCRYPTION_KEY_VALIDATION', 1081, 'uint16', '', DIRECT, { name: 'Discharge counter key validation (raw)' }),
  // The pulse cell M47 is empty: that is not documented support.
  row('eNVIRONMENT_TEMPERATURE', 1088, 'int16', '°C', SCALED, { name: 'Environment temperature', scaleFactor: -1 }),
  // Q48 explicitly says neo/flex have no PSP functionality despite a register.
  row('pOWER_FRACTION', 1089, 'int16', '%', ['pulse'], { name: 'PSP power percentage (VARTA native sign)', writable: true, scaleFactor: -1, min: -100, max: 100 }),
  row('nOMINAL_CHARGE_POWER', 1090, 'uint16', 'W', ['pulse', 'neo'], { name: 'Nominal AC charge power' }),
  row('nOMINAL_DISCHARGE_POWER', 1091, 'uint16', 'W', ['pulse', 'neo'], { name: 'Nominal AC discharge power' }),
  row('eXTERNAL_PV_POWER', 1100, 'uint16', 'W', ALL, { name: 'External PV production for VARTA visualisation (not a power limit)', writable: true, sf: 'sF_EXTERNAL_PV_POWER' }),
  row('eXTERNAL_PV_ENERGY', 1101, 'uint16', 'Wh', ALL, { name: 'External PV energy produced today for VARTA visualisation', writable: true, scaleFactor: 1, sf: 'sF_EXTERNAL_PV_ENERGY' }),
  row('fORECAST_CHARGE_POWER', 1200, 'uint16', 'W', ['flex'], { name: 'Nonbinding forecast of possible charge power' }),
  row('fORECAST_DISCHARGE_POWER', 1201, 'uint16', 'W', ['flex'], { name: 'Nonbinding forecast of possible discharge power' }),
  // Frequency registers require activation by VARTA (print!J56). No watchdog
  // interval or communication-loss fallback is specified in this workbook.
  row('fREQUENCY_READY', 1300, 'int16', '', SCALED, { name: 'Frequency control ready', frequency: true }),
  row('fREQUENCY_CHARGE_ENERGY', 1301, 'uint16', 'Wh', ['flex'], { name: 'Frequency control usable charge energy', frequency: true, sf: 'sF_FREQUENCY_CHARGE_ENERGY' }),
  row('fREQUENCY_DISCHARGE_ENERGY', 1302, 'uint16', 'Wh', ['flex'], { name: 'Frequency control usable discharge energy', frequency: true, sf: 'sF_FREQUENCY_DISCHARGE_ENERGY' }),
  row('fREQUENCY_ALIVE_MIRROR', 1303, 'int16', '', SCALED, { name: 'Frequency control mirrored alive signal', frequency: true }),
  row('fREQUENCY_ACTIVE', 1304, 'int16', '', SCALED, { name: 'Frequency control active (0 off, 1 follows target)', frequency: true, writable: true, min: 0, max: 1 }),
  row('fREQUENCY_POWER', 1305, 'int16', 'W', SCALED, { name: 'Frequency control target (+ charge / - discharge)', frequency: true, writable: true, sf: 'sF_FREQUENCY_POWER' }),
  row('fREQUENCY_ALIVE', 1306, 'int16', '', SCALED, { name: 'Frequency control alive signal', frequency: true, writable: true }),
  sf('sF_DISCHARGE_LIMIT', 2074, 'UG scale exponent'),
  sf('sF_CHARGE_LIMIT', 2075, 'OG scale exponent'),
  sf('sF_ADDITIONAL_POWER', 2077, 'Pextra scale exponent'),
  sf('sF_EXTERNAL_PV_POWER', 2100, 'External PV power scale exponent'),
  sf('sF_EXTERNAL_PV_ENERGY', 2101, 'External PV energy scale exponent'),
  sf('sF_FREQUENCY_CHARGE_ENERGY', 2301, 'Frequency charge energy scale exponent', ['flex'], { frequency: true }),
  sf('sF_FREQUENCY_DISCHARGE_ENERGY', 2302, 'Frequency discharge energy scale exponent', ['flex'], { frequency: true }),
  sf('sF_FREQUENCY_POWER', 2305, 'Frequency target power scale exponent', SCALED, { frequency: true }),
]);

function extendedRegistersForProfile(profile) {
  return profile ? EXTENDED_REGISTERS.filter(def => def.columns.includes(profile.column)) : [];
}

function tokenResponse(challenge, legacyUnpadded = false) {
  if (!Number.isInteger(challenge) || challenge < 0 || challenge > 65535) throw new Error('VARTA challenge must be an unsigned 16-bit integer');
  const hex = challenge.toString(16).toUpperCase();
  const phrase = '+Jq@GH/#5@x@' + (legacyUnpadded ? hex : hex.padStart(4, '0'));
  let crc = 0xFFFF;
  for (const byte of Buffer.from(phrase, 'ascii')) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? ((crc >>> 1) ^ 0xA001) : (crc >>> 1);
  }
  return crc;
}

function valueError(message) {
  return Object.assign(new Error(message), { code: 'E_VARTA_WRITE_VALUE' });
}

function numericText(value) {
  if (typeof value !== 'number' && typeof value !== 'string') throw valueError('VARTA value must be a finite number or decimal numeric string');
  const text = String(value).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text))) {
    throw valueError('VARTA value must be a finite number or decimal numeric string');
  }
  return text;
}

function encodeEngineering(value, def, exponent = 0) {
  const text = numericText(value);
  if (!def || !['int16', 'uint16'].includes(def.dataType)) throw valueError('VARTA writes require a documented 16-bit register');
  if (!Number.isInteger(exponent) || exponent < -32768 || exponent > 32767) throw valueError('VARTA invalid scale exponent');
  const base = def.scaleFactor ?? 0;
  if (!Number.isInteger(base)) throw valueError('VARTA invalid base scale exponent');
  const factor = 10 ** (exponent + base);
  if (!Number.isFinite(factor) || factor === 0) throw valueError('VARTA unusable scale exponent');
  const number = Number(text);
  if ((def.min !== undefined && number < def.min) || (def.max !== undefined && number > def.max)) throw valueError(`VARTA ${def.id} outside documented range`);

  // Decimal arithmetic avoids both rounding an unrepresentable request and
  // rejecting a valid one merely because 0.3 / 0.1 is 2.9999999999999996.
  const [mantissa, expText = '0'] = text.toLowerCase().split('e');
  const negative = mantissa.startsWith('-');
  const unsigned = mantissa.replace(/^[+-]/, '');
  const [whole, fraction = ''] = unsigned.split('.');
  const digits = (whole + fraction).replace(/^0+/, '') || '0';
  let raw = BigInt(digits);
  const shift = Number(expText) - fraction.length - exponent - base;
  if (raw !== 0n) {
    if (!Number.isSafeInteger(shift)) throw valueError('VARTA value is not representable');
    if (shift >= 0) {
      if (shift > 5) throw valueError('VARTA value exceeds 16-bit register range');
      raw *= 10n ** BigInt(shift);
    } else {
      if (-shift > digits.length) throw valueError('VARTA value is not representable at the active scale');
      const divisor = 10n ** BigInt(-shift);
      if (raw % divisor !== 0n) throw valueError('VARTA value is not representable at the active scale');
      raw /= divisor;
    }
  }
  if (negative) raw = -raw;
  const min = def.dataType === 'int16' ? -32768n : 0n;
  const max = def.dataType === 'int16' ? 32767n : 65535n;
  if (raw < min || raw > max) throw valueError('VARTA value exceeds 16-bit register range');
  return Number(raw < 0n ? raw + 65536n : raw);
}

function buildVartaExtendedAliases(runtime) {
  const profile = getVartaProfile(runtime.template);
  const cfg = runtime.cfg || {};
  if (!profile || cfg.vartaExtendedEnabled === false) return [];
  const allowed = new Map(extendedRegistersForProfile(profile).map(def => [def.id, def]));
  const result = [];
  const finite = fn => value => typeof value === 'number' && Number.isFinite(value) ? fn(value) : null;
  const nonnegative = value => {
    const n = Number(numericText(value));
    if (n < 0) throw valueError('VARTA power limit alias requires a nonnegative value');
    return n;
  };
  const negate = finite(value => value === 0 ? 0 : -value);
  const flag = value => value === 0 ? false : value === 1 ? true : null;
  const flagWrite = value => {
    if (typeof value === 'boolean') return value ? 1 : 0;
    const n = Number(numericText(value));
    if (n !== 0 && n !== 1) throw valueError('VARTA flag must be 0 or 1');
    return n;
  };
  const add = (path, dpId, name, unit = '', options = {}) => {
    const def = allowed.get(dpId);
    if (!def || !runtime.dpById.has(dpId) || (def.frequency && cfg.vartaFrequencyControlEnabled !== true)) return;
    const control = path.startsWith('ctrl.');
    if (control && (!def.writable || cfg.vartaAllowControlWrites !== true)) return;
    const { type = 'number', fromDevice, toDevice } = options;
    result.push({ relId: runtime._aliasRelId(path), dpId, name, unit, type,
      role: control ? (type === 'boolean' ? 'switch' : 'level') : (type === 'boolean' ? 'indicator' : 'value'),
      rw: control ? 'rw' : 'ro', kind: 'dp', replace: true,
      ...(control ? { writeDpId: dpId } : {}), ...(fromDevice ? { fromDevice } : {}), ...(toDevice ? { toDevice } : {}) });
  };
  const pair = (path, dpId, name, unit = '', options = {}) => {
    add(`r.${path}`, dpId, name, unit, options);
    add(`ctrl.${path}`, dpId, name, unit, options);
  };
  add('r.temperature', 'eNVIRONMENT_TEMPERATURE', 'Environment temperature', '°C');
  add('r.errorCode', 'eRROR_CODE', 'VARTA error code');
  add('r.controlRemainingS', 'cONTROL_REMAINING_S', 'VARTA control timer remaining', 's');
  pair('maxDischargePowerW', 'dISCHARGE_LIMIT', 'Maximum discharge power (nonnegative limit)', 'W', { fromDevice: negate, toDevice: value => -nonnegative(value) || 0 });
  pair('maxChargePowerW', 'cHARGE_LIMIT', 'Maximum charge power (nonnegative limit)', 'W', { toDevice: nonnegative });
  pair('additionalPowerW', 'aDDITIONAL_POWER', 'Pextra additional power (VARTA native sign; not absolute)', 'W');
  pair('powerFractionPct', 'pOWER_FRACTION', 'PSP power percentage (VARTA native sign)', '%');
  pair('externalPvPowerW', 'eXTERNAL_PV_POWER', 'External PV power for VARTA visualisation', 'W');
  pair('externalPvEnergyWh', 'eXTERNAL_PV_ENERGY', 'External PV energy today for VARTA visualisation', 'Wh');
  add('r.nominalChargePowerW', 'nOMINAL_CHARGE_POWER', 'Nominal AC charge power', 'W');
  add('r.nominalDischargePowerW', 'nOMINAL_DISCHARGE_POWER', 'Nominal AC discharge power', 'W');
  add('r.forecastChargePowerW', 'fORECAST_CHARGE_POWER', 'Nonbinding charge power forecast', 'W');
  add('r.forecastDischargePowerW', 'fORECAST_DISCHARGE_POWER', 'Nonbinding discharge power forecast', 'W');
  add('r.frequencyReady', 'fREQUENCY_READY', 'VARTA frequency control ready', '', { type: 'boolean', fromDevice: flag });
  add('r.frequencyChargeEnergyWh', 'fREQUENCY_CHARGE_ENERGY', 'Frequency control usable charge energy', 'Wh');
  add('r.frequencyDischargeEnergyWh', 'fREQUENCY_DISCHARGE_ENERGY', 'Frequency control usable discharge energy', 'Wh');
  add('r.frequencyAliveMirror', 'fREQUENCY_ALIVE_MIRROR', 'Frequency control mirrored alive signal');
  pair('frequencyActive', 'fREQUENCY_ACTIVE', 'VARTA frequency control active', '', { type: 'boolean', fromDevice: flag, toDevice: flagWrite });
  pair('frequencyPowerW', 'fREQUENCY_POWER', 'Frequency target (VARTA: + charge / - discharge)', 'W');
  pair('frequencyAlive', 'fREQUENCY_ALIVE', 'Frequency control alive signal');
  return result;
}

module.exports = { EXTENDED_REGISTERS, extendedRegistersForProfile, tokenResponse, encodeEngineering, buildVartaExtendedAliases };
