'use strict';

// Preliminary, family-specific maps from the supplied DEYE single-phase V118
// PDF and three-phase V105.4 DOC. See docs/DEYE_MODBUS_RTU_0.5.165.md for
// ambiguities. These are NOT a promise of support for every DEYE SKU/firmware.
const PROFILES = Object.freeze({
  singlePhase: { model: 'Hybrid einphasig', types: [0x0300], single: true, hv: false },
  threePhaseLv: { model: 'Hybrid dreiphasig LV', types: [0x0500], single: false, hv: false },
  threePhaseHv: { model: 'Hybrid dreiphasig HV', types: [0x0600, 0x0601], single: false, hv: true },
});
function getDeyeProfile(template) {
  const key = template?.driverHints?.deyeModbus?.profile;
  if (!PROFILES[key] || template?.manufacturer !== 'DEYE' || template.id !== `ess.deye.${key}.modbusRtu`) return null;
  return { key, ...PROFILES[key] };
}
function registersForProfile(p) {
  const defs = [];
  const add = (id, address, unit = '', exponent = 0, options = {}) => defs.push({ id, addresses: [address], unit, exponent, ...options });
  const pair = (id, low, high, unit, exponent = 0, signed = false) => add(id, low, unit, exponent, { addresses: [low, high], signed });
  add('identity.deviceType', 0);
  add('identity.unitId', 1);
  add('identity.protocolVersion', 2);
  add('identity.serial', 3, '', 0, { addresses: [3, 4, 5, 6, 7], text: true });
  add('identity.controlFirmware', p.single ? 13 : 15);
  add('identity.communicationFirmware', p.single ? 14 : 18);
  pair('identity.ratedPower', p.single ? 16 : 20, p.single ? 17 : 21, 'W', -1);
  add('identity.mpptAndPhases', p.single ? 18 : 22, '', 0, { core: true });
  if (!p.single) {
    add('identity.batteryInputs', 24);
    add('identity.outputTopology', 25, '', 0, { core: true });
  }
  add('status', p.single ? 59 : 500, '', 0, { core: true, min: 0, max: p.single ? 4 : 5 });
  add('battery1.soc', p.single ? 184 : 588, '%', 0, { core: true, min: 0, max: 100 });
  add('battery1.voltage', p.single ? 183 : 587, 'V', p.hv ? -1 : -2);
  add('battery1.current', p.single ? 191 : 591, 'A', -2, { signed: true });
  // Reg.590 has "H:1W H:10W". Preserve the signed raw value until the
  // commissioning user confirms scaling; never quietly assume LV/HV meaning.
  add('battery.powerRaw', p.single ? 190 : 590, '', 0, { signed: true });
  if (p.single) add('battery1.temperature', 182, '°C', -1, { offset: -1000 });
  else {
    add('battery1.temperatureRaw', 586);
    add('battery2.soc', 589, '%', 0, { min: 0, max: 100 });
    add('battery2.voltage', 593, 'V', p.hv ? -1 : -2);
    add('battery2.currentRaw', 594);
    add('battery2.powerRaw', 595);
    add('battery2.temperatureRaw', 596);
  }
  const energy = [
    ['battery.chargeToday', 70, 514], ['battery.dischargeToday', 71, 515],
    ['grid.importToday', 76, 520], ['grid.exportToday', 77, 521],
    ['load.energyToday', 84, 526], ['pv.energyToday', 108, 529],
  ];
  for (const [id, s, t] of energy) add(id, p.single ? s : t, 'Wh', 2);
  for (const [id, s, t] of [
    ['battery.chargeTotal', 72, 516], ['battery.dischargeTotal', 74, 518],
    ['grid.importTotal', 78, 522], ['grid.exportTotal', 80, 524], ['load.energyTotal', 85, 527],
  ]) { const a = p.single ? s : t; pair(id, a, a + 1, 'Wh', 2); }
  if (p.single) pair('pv.energyTotal', 96, 97, 'Wh', 2);
  // Three-phase high words are NOT adjacent to the low words (added in V104).
  if (p.single) {
    for (const [id, a] of [['grid.power', 169], ['inverter.power', 175], ['load.power', 178]]) add(id, a, 'W', 0, { signed: true });
  } else {
    for (const [id, lo, hi] of [['grid.power', 625, 690], ['inverter.power', 636, 694], ['load.power', 653, 659]]) pair(id, lo, hi, 'W', 0, true);
    for (let i = 0; i < 3; i++) {
      pair(`grid.phase${i + 1}Power`, 622 + i, 687 + i, 'W', 0, true);
      add(`grid.phase${i + 1}Voltage`, 598 + i, 'V', -1);
    }
  }
  add('inverter.frequency', p.single ? 193 : 638, 'Hz', -2);
  for (let i = 0; i < 4; i++) add(`pv.power${i + 1}`, (p.single ? 186 : 672) + i, 'W', p.hv ? 1 : 0, { mppt: i + 1 });
  for (let i = 0; i < 2; i++) add(`warning.word${i + 1}`, (p.single ? 101 : 553) + i);
  for (let i = 0; i < 4; i++) add(`fault.word${i + 1}`, (p.single ? 103 : 555) + i);
  for (const [id, s, t] of [['settings.maxChargeCurrent', 210, 108], ['settings.maxDischargeCurrent', 211, 109], ['settings.gridChargeCurrent', 230, 128]]) {
    add(id, p.single ? s : t, 'A', 0, { writable: true, min: 0, max: 185 });
  }
  add('settings.maxExportPower', p.single ? 245 : 143, 'W', p.hv ? 1 : 0, { writable: true, min: 0, max: p.hv ? 80000 : 8000 });
  // Read-only preparation of the remote interface. Missing meanings, reference
  // power, watchdog trigger and contradictory ranges prohibit active writes.
  if (!p.single) for (const [id, a, unit, exponent, signed] of [
    ['mode', 1100, '', 0], ['watchdogSeconds', 1101, 's', 0],
    ['outputControlMode', 1104, '', 0], ['batteryControlMode', 1105, '', 0],
    ['batteryPowerPercent', 1109, '%', -1, true], ['targetSoc', 1110, '%', -1],
    ['inverterPowerPercent', 1111, '%', -1, true],
  ]) add(`remote.${id}`, a, unit, exponent, { signed: !!signed, remote: true });
  return defs;
}
function decode(words, def) {
  if (words.length !== def.addresses.length || words.some(w => !Number.isInteger(w) || w < 0 || w > 65535)) throw new Error(`DEYE invalid words for ${def.id}`);
  if (def.text) return Buffer.from(words.flatMap(w => [w >> 8, w & 255])).toString('latin1').replace(/\0+$/, '');
  let raw = words[0] + (words.length === 2 ? words[1] * 65536 : 0);
  if (def.signed && raw >= (words.length === 2 ? 2147483648 : 32768)) raw -= words.length === 2 ? 4294967296 : 65536;
  const value = Number(`${raw + (def.offset || 0)}e${def.exponent || 0}`);
  return (def.min !== undefined && value < def.min) || (def.max !== undefined && value > def.max) ? null : value;
}
function readGroups(defs, limit = 24) {
  const addresses = [...new Set(defs.flatMap(d => d.addresses))].sort((a, b) => a - b);
  const groups = [];
  for (const a of addresses) {
    const g = groups.at(-1);
    if (g && g.end + 1 === a && a - g.start < limit) g.end = a;
    else groups.push({ start: a, end: a });
  }
  return groups;
}
const DIAGNOSTICS = {
  'diagnostics.familyMatched': 'boolean', 'diagnostics.externalControlSupported': 'boolean',
  'diagnostics.configurationWritesEnabled': 'boolean', 'diagnostics.note': 'string',
  'canonical.soc': 'number', 'canonical.batteryPower': 'number', 'canonical.gridPower': 'number', 'canonical.pvPower': 'number',
};
function buildDeyeAliases(runtime) {
  if (!getDeyeProfile(runtime.template)) return [];
  const defs = [];
  const add = (path, dpId, name, unit = '', type = 'number', transform) => {
    if (runtime.dpById.has(dpId)) defs.push({ relId: runtime._aliasRelId(path), dpId, name, unit, type, role: type === 'boolean' ? 'indicator' : type === 'string' ? 'text' : 'value', rw: 'ro', kind: 'dp', replace: true, ...(transform ? { fromDevice: transform } : {}) });
  };
  add('r.soc', 'canonical.soc', 'Battery SOC (single battery input)', '%');
  add('r.power', 'canonical.batteryPower', 'Battery power (+ discharge / - charge)', 'W');
  add('r.powerCharge', 'canonical.batteryPower', 'Battery charge power', 'W', 'number', v => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, -v) : null);
  add('r.powerDischarge', 'canonical.batteryPower', 'Battery discharge power', 'W', 'number', v => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : null);
  add('r.gridPower', 'canonical.gridPower', 'Grid power (+ import / - export)', 'W');
  add('r.pvPower', 'canonical.pvPower', 'PV power (documented MPPT inputs)', 'W');
  add('r.energyCharge', 'battery.chargeTotal', 'Battery charge energy', 'Wh');
  add('r.energyDischarge', 'battery.dischargeTotal', 'Battery discharge energy', 'Wh');
  add('r.statusCode', 'status', 'DEYE operating state');
  add('r.controlSupported', 'diagnostics.externalControlSupported', 'External power control available', '', 'boolean');
  add('alarm.fault', 'status', 'DEYE fault state', '', 'boolean', v => Number.isInteger(v) && v >= 0 && v <= 5 ? v === 4 : null);
  return defs;
}
module.exports = { PROFILES, DIAGNOSTICS, getDeyeProfile, registersForProfile, decode, readGroups, buildDeyeAliases };
