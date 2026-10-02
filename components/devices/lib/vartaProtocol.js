'use strict';

/**
 * VARTA public Modbus table 14, document 14.0 / 2025-03-12 (user-supplied PDF).
 *
 * The first product column covers THREE selectable models. Do not merge these
 * into one UI entry, or give every model the union of the six product columns.
 * Only the nine SF registers are WR; they configure representation, NOT power.
 * Table numbers are used literally, with no inherited register-minus-one rule.
 */
const PROFILE_MODELS = Object.freeze({
  element: ['element', 'element'],
  oneL: ['one L', 'element'],
  oneXL: ['one XL', 'element'],
  elementBackup: ['element backup', 'backup'],
  pulse: ['pulse', 'pulse'],
  pulseNeo: ['pulse neo', 'neo'],
  link: ['link', 'link'],
  flexStorage: ['flex storage', 'flex'],
});
const TABLE_VERSION = 14;
const STATUS_NAMES = Object.freeze(['BUSY', 'RUN', 'CHARGE', 'DISCHARGE', 'STANDBY', 'ERROR', 'PASSIVE', 'ISLANDING']);
const ALL = ['element', 'backup', 'pulse', 'neo', 'link', 'flex'];
const DOMESTIC = ['element', 'backup', 'pulse', 'neo'];
const EXTENDED = ['backup', 'pulse', 'neo', 'flex'];
const SCALED = ['neo', 'flex'];

function row(id, address, dataType, length, unit, columns, options = {}) {
  return Object.freeze({ id, address, dataType, length, unit, columns: Object.freeze([...columns]), ...options });
}

// Names of the raw datapoints deliberately follow the adapter's established
// spelling. Engineering values keep the manufacturer's sign convention; only
// the EOS aliases below normalise charge/discharge and import/export signs.
const REGISTERS = Object.freeze([
  row('mANUFACTURER_TYPE', 975, 'string16', 25, '', ['backup'], { name: 'Manufacturer / Type', static: true }),
  row('sOFTWARE_VERSION_EMS', 1000, 'string16', 17, '', ALL.filter(x => x !== 'link'), { name: 'Software version EMS', static: true }),
  row('sOFTWARE_VERSION_ENS', 1017, 'string16', 17, '', DOMESTIC, { name: 'Software version ENS', static: true }),
  row('sOFTWARE_VERSION_INVERTER', 1034, 'string16', 17, '', DOMESTIC, { name: 'Software version inverter', static: true }),
  row('tABLE_VERSION', 1051, 'uint16', 1, '', ALL, { name: 'Modbus table version' }),
  row('tIMESTAMP', 1052, 'uint32', 2, 's', ALL, { name: 'Device Unix timestamp (lower word first)' }),
  row('sERIAL_NUMBER', 1054, 'string16', 10, '', ALL, { name: 'Serial number', static: true }),
  row('bATTERY_MODULES_INSTALLED', 1064, 'uint16', 1, '', ALL.filter(x => x !== 'flex'), { name: 'Installed battery modules', static: true }),
  row('sYSTEM_STATE', 1065, 'uint16', 1, '', ALL, { name: 'State (0 BUSY .. 7 ISLANDING)', core: true }),
  row('aCTIVE_POWER', 1066, 'int16', 1, 'W', ALL, { name: 'Active power (+ charge / - discharge)', sf: 'sF_ACTIVE_POWER', core: true }),
  row('aPPARENT_POWER', 1067, 'int16', 1, 'VA', ALL, { name: 'Apparent power (+ charge / - discharge)', sf: 'sF_APPARENT_POWER' }),
  row('sOC', 1068, 'uint16', 1, '%', ALL, { name: 'Total state of charge', core: true }),
  row('aCTIVE_CHARGE_ENERGY', 1069, 'uint32', 2, 'Wh', ALL, { name: 'AC to DC total charge energy (lower word first)', sf: 'sF_CHARGE_ENERGY' }),
  row('iNSTALLED_CAPACITY', 1071, 'uint16', 1, 'Wh', ALL, { name: 'Installed capacity (register unit 10 Wh)', scaleFactor: 1, sf: 'sF_CAPACITY' }),
  row('gRID_POWER', 1078, 'int16', 1, 'W', ALL, { name: 'Grid power (+ export / - import)', sf: 'sF_GRID_POWER' }),
  row('gRID_FREQUENCY', 1082, 'uint16', 1, 'Hz', EXTENDED, { name: 'Grid frequency', scaleFactor: -2 }),
  row('aLLOWED_CHARGE_POWER', 1083, 'uint16', 1, 'W', EXTENDED, { name: 'Available AC charging power (read only)', sf: 'sF_AVAILABLE_CHARGE_POWER' }),
  row('aLLOWED_DISCHARGE_POWER', 1084, 'uint16', 1, 'W', EXTENDED, { name: 'Available AC discharging power (read only)', sf: 'sF_AVAILABLE_DISCHARGE_POWER' }),
  row('uSABLE_CHARGE_ENERGY', 1085, 'uint16', 1, 'Wh', EXTENDED, { name: 'Usable energy for charging', sf: 'sF_USABLE_CHARGE_ENERGY' }),
  row('uSABLE_DISCHARGE_ENERGY', 1086, 'uint16', 1, 'Wh', EXTENDED, { name: 'Usable energy for discharging', sf: 'sF_USABLE_DISCHARGE_ENERGY' }),
  row('rEACTIVE_POWER', 1087, 'int16', 1, 'var', ['backup', 'pulse', 'neo'], { name: 'Reactive power at internal inverter' }),
  row('pV_POWER', 1102, 'uint16', 1, 'W', ['backup', 'pulse', 'neo'], { name: 'AC PV production measured by VARTA PV sensor' }),
  row('sF_ACTIVE_POWER', 2066, 'int16', 1, '', SCALED, { name: 'Active power scale exponent (NOT a power setpoint)', writable: true }),
  row('sF_APPARENT_POWER', 2067, 'int16', 1, '', SCALED, { name: 'Apparent power scale exponent', writable: true }),
  row('sF_CHARGE_ENERGY', 2069, 'int16', 1, '', SCALED, { name: 'Charge energy scale exponent', writable: true }),
  row('sF_CAPACITY', 2071, 'int16', 1, '', SCALED, { name: 'Capacity scale exponent', writable: true }),
  row('sF_GRID_POWER', 2078, 'int16', 1, '', SCALED, { name: 'Grid power scale exponent (NOT grid power)', writable: true }),
  row('sF_AVAILABLE_CHARGE_POWER', 2083, 'int16', 1, '', SCALED, { name: 'Available charging power scale exponent', writable: true }),
  row('sF_AVAILABLE_DISCHARGE_POWER', 2084, 'int16', 1, '', SCALED, { name: 'Available discharging power scale exponent', writable: true }),
  row('sF_USABLE_CHARGE_ENERGY', 2085, 'int16', 1, '', SCALED, { name: 'Usable charging energy scale exponent', writable: true }),
  row('sF_USABLE_DISCHARGE_ENERGY', 2086, 'int16', 1, '', SCALED, { name: 'Usable discharging energy scale exponent', writable: true }),
]);

function getVartaProfile(template) {
  const key = template?.driverHints?.vartaModbus?.product;
  const model = PROFILE_MODELS[key];
  if (!model || template?.id !== `ess.varta.${key}.modbusTcpV14` || template?.manufacturer !== 'VARTA') return null;
  return { key, model: model[0], column: model[1], scaled: SCALED.includes(model[1]), minIntervalMs: key === 'link' ? 5000 : 1000 };
}

function registersForProfile(profile) {
  return REGISTERS.filter(def => def.columns.includes(profile.column));
}

function decodeWords(words, def) {
  if (!Array.isArray(words) || words.length !== def.length || words.some(w => !Number.isInteger(w) || w < 0 || w > 65535)) {
    throw new Error(`VARTA invalid response for ${def.id}: expected ${def.length} unsigned 16-bit register(s)`);
  }
  if (def.dataType === 'string16') {
    // One character is stored as the VALUE of each register, not two packed
    // ASCII bytes. Stop only on a zero register; a leading zero byte is normal.
    const end = words.indexOf(0);
    return String.fromCharCode(...(end < 0 ? words : words.slice(0, end))).trimEnd();
  }
  if (def.dataType === 'uint32') return words[0] + words[1] * 65536;
  if (def.dataType === 'int16') return words[0] >= 32768 ? words[0] - 65536 : words[0];
  return words[0];
}

function scaleValue(raw, exponent, baseExponent = 0) {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || !Number.isInteger(exponent) || exponent < -32768 || exponent > 32767) return null;
  const factor = 10 ** (exponent + baseExponent);
  // Mantissas are integers (at most UINT32). Parse the decimal exponent once
  // to avoid an extra floating multiplication artefact such as 1512.3000000002.
  const value = Number(`${raw}e${exponent + baseExponent}`);
  // Missing/invalid SF must NEVER silently become exponent 0. Underflow is
  // rejected too, otherwise a corrupt SF can manufacture a plausible 0 W.
  if (!Number.isFinite(factor) || factor === 0 || !Number.isFinite(value) || (raw !== 0 && value === 0)) return null;
  return Object.is(value, -0) ? 0 : value;
}

function buildReadGroups(definitions, maxRegisters = 40) {
  const groups = [];
  for (const def of [...definitions].sort((a, b) => a.address - b.address)) {
    const last = groups[groups.length - 1];
    const end = def.address + def.length - 1;
    // Strictly adjacent/overlapping DOCUMENTED ranges only. Never span gaps
    // absent from this selection or flex storage's unsupported module 1064.
    if (last && def.address <= last.end + 1 && end - last.start + 1 <= maxRegisters) {
      last.end = Math.max(last.end, end);
      last.definitions.push(def);
    } else {
      groups.push({ start: def.address, end, definitions: [def] });
    }
  }
  return groups;
}

function buildVartaAliases(runtime) {
  if (!getVartaProfile(runtime.template)) return [];
  const result = [];
  const add = (path, dpId, name, unit, transform, type = 'number', role = 'value') => {
    if (!runtime.dpById.has(dpId)) return;
    result.push({ relId: runtime._aliasRelId(path), name, type, role, ...(unit ? { unit } : {}), rw: 'ro', kind: 'dp', dpId,
      replace: true, ...(transform ? { fromDevice: transform } : {}) });
  };
  const finite = fn => value => (typeof value === 'number' && Number.isFinite(value)) ? fn(value) : null;
  const negate = finite(value => value === 0 ? 0 : -value);
  add('r.soc', 'sOC', 'State of charge', '%', finite(v => v >= 0 && v <= 100 ? v : null), 'number', 'value.battery');
  add('r.power', 'aCTIVE_POWER', 'Battery power (+ discharge / - charge)', 'W', negate, 'number', 'value.power');
  add('r.powerAc', 'aCTIVE_POWER', 'Battery AC power (+ discharge / - charge)', 'W', negate, 'number', 'value.power');
  add('r.powerCharge', 'aCTIVE_POWER', 'Battery charge power', 'W', finite(v => Math.max(0, v)), 'number', 'value.power');
  add('r.powerDischarge', 'aCTIVE_POWER', 'Battery discharge power', 'W', finite(v => Math.max(0, -v)), 'number', 'value.power');
  add('r.gridPower', 'gRID_POWER', 'Grid power (+ import / - export)', 'W', negate, 'number', 'value.power');
  add('r.energyCharge', 'aCTIVE_CHARGE_ENERGY', 'Total AC to DC charge energy', 'Wh', null, 'number', 'value.energy');
  add('r.capacity', 'iNSTALLED_CAPACITY', 'Installed capacity', 'Wh', null, 'number', 'value.energy');
  add('r.allowedChargePower', 'aLLOWED_CHARGE_POWER', 'Available AC charging power', 'W', null, 'number', 'value.power');
  add('r.allowedDischargePower', 'aLLOWED_DISCHARGE_POWER', 'Available AC discharging power', 'W', null, 'number', 'value.power');
  add('r.usableChargeEnergy', 'uSABLE_CHARGE_ENERGY', 'Usable energy for charging', 'Wh', null, 'number', 'value.energy');
  add('r.usableDischargeEnergy', 'uSABLE_DISCHARGE_ENERGY', 'Usable energy for discharging', 'Wh', null, 'number', 'value.energy');
  add('r.gridFrequency', 'gRID_FREQUENCY', 'Grid frequency', 'Hz', null, 'number', 'value.frequency');
  add('r.pvPower', 'pV_POWER', 'VARTA PV sensor power', 'W', null, 'number', 'value.power');
  add('r.statusCode', 'sYSTEM_STATE', 'VARTA state code', '', null, 'number', 'indicator.status');
  add('r.statusText', 'sYSTEM_STATE', 'VARTA state', '', v => Number.isInteger(v) && STATUS_NAMES[v] ? STATUS_NAMES[v] : 'UNKNOWN', 'string', 'text');
  add('alarm.fault', 'sYSTEM_STATE', 'VARTA ERROR state', '', finite(v => v >= 0 && v <= 7 ? v === 5 : null), 'boolean', 'indicator.alarm');
  // These are software diagnostics, not a claim of undocumented vendor support.
  add('r.controlSupported', 'diagnostics.externalControlSupported', 'Model-specific control registers documented (not an absolute EOS setpoint)', '', null, 'boolean', 'indicator');
  return result;
}

module.exports = { PROFILE_MODELS, TABLE_VERSION, STATUS_NAMES, REGISTERS, getVartaProfile, registersForProfile, decodeWords, scaleValue, buildReadGroups, buildVartaAliases };
