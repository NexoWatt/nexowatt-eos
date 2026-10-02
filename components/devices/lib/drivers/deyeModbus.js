'use strict';

const { ModbusDriver } = require('./modbus');
const { getDeyeProfile, registersForProfile, decode, readGroups } = require('../deyeProtocol');
const error = (code, text) => Object.assign(new Error(text), { code });
const optionalException = e => [1, 2, 3].includes(Number(e?.modbusCode ?? e?.exceptionCode));
const NOTE = 'Preliminary DEYE family map; SKU/firmware coverage awaits manufacturer confirmation. Remote power control is blocked. Reg.590 scaling/sign and multi-battery aggregation require confirmation.';

class DeyeModbusDriver extends ModbusDriver {
  constructor(adapter, device, template, globalConfig) {
    super(adapter, device, template, globalConfig);
    this.profile = getDeyeProfile(template);
    if (!this.profile || device.protocol !== 'modbusRtu') throw error('E_DEYE_PROFILE', 'DEYE requires the matching Modbus RTU family template');
    this.registers = registersForProfile(this.profile);
    this.byId = new Map(this.registers.map(d => [d.id, d]));
    const uid = device.connection?.unitId;
    this.unitId = uid === undefined || uid === null || uid === '' ? 1 : Number(uid);
    if (!Number.isInteger(this.unitId) || this.unitId < 1 || this.unitId > 247) throw error('E_DEYE_UNIT_ID', 'DEYE RTU slave address must be 1..247; broadcast writes are prohibited');
    this.manualUnitId = this.unitId;
    this.manualAddressOffset = this.autoAddressOffset = 0;
    this.disableAddressFallbackOffsets = this._disableAddressFallbackOffsets = true;
    this._autoSunSpec = false;
    this._tail = Promise.resolve();
    this._epoch = 0;
    this._stopped = false;
    this._pendingWrites = 0;
    this._readPending = null;
  }
  _active(epoch) {
    if (this._stopped || epoch !== this._epoch) throw error('E_DEYE_CANCELLED', 'DEYE operation cancelled after stop/reset; no command replay');
  }
  async connect() {
    const epoch = this._epoch;
    this._active(epoch);
    await super.connect();
    if (this._stopped || epoch !== this._epoch) { await super.disconnect(); this._active(epoch); }
  }
  async resetTransport() { this._epoch++; this._readPending = null; await super.disconnect(); }
  async disconnect() { this._stopped = true; this._epoch++; await super.disconnect(); }
  _transaction(fn) {
    const epoch = this._epoch;
    const run = this._tail.catch(() => {}).then(async () => {
      this._active(epoch);
      await this.ensureConnected();
      this._active(epoch);
      return fn(epoch);
    });
    this._tail = run.catch(() => {});
    return run;
  }
  async _words(address, length, epoch) {
    this._active(epoch);
    const response = await super._mbReadHoldingRegisters(address, length, this.unitId);
    this._active(epoch);
    if (!Array.isArray(response?.data) || response.data.length !== length || response.data.some(w => !Number.isInteger(w) || w < 0 || w > 65535)) throw error('E_DEYE_RESPONSE', `DEYE invalid FC3 response at ${address}`);
    return response.data;
  }
  async _identity(epoch) {
    const w = await this._words(0, 8, epoch);
    const serial = decode(w.slice(3), this.byId.get('identity.serial'));
    if (!this.profile.types.includes(w[0])) return { type: w[0], unitId: w[1], version: w[2], serial, phases: 0, topology: 0, matched: false };
    const phases = (await this._words(this.profile.single ? 18 : 22, 1, epoch))[0];
    const topology = this.profile.single ? 0 : (await this._words(25, 1, epoch))[0];
    return { type: w[0], unitId: w[1], version: w[2], serial, phases, topology,
      matched: this.profile.types.includes(w[0]) && (phases & 255) === (this.profile.single ? 1 : 3) && topology === 0 };
  }
  async readDatapoints(datapoints) {
    if (this._readPending) return this._readPending;
    // Read a complete family snapshot even for a fast/subset request: derived
    // values must never mix old battery counts, MPPT counts or high words.
    const pending = this._transaction(epoch => this._snapshot(epoch));
    this._readPending = pending;
    try { return await pending; } finally { if (this._readPending === pending) this._readPending = null; }
  }
  async _snapshot(epoch) {
    const out = Object.fromEntries(this.registers.map(d => [d.id, null]));
    for (const key of ['soc', 'batteryPower', 'gridPower', 'pvPower']) out[`canonical.${key}`] = null;
    const identity = await this._identity(epoch);
    Object.assign(out, { 'identity.deviceType': identity.type, 'identity.unitId': identity.unitId, 'identity.protocolVersion': identity.version, 'identity.serial': identity.serial,
      'identity.mpptAndPhases': identity.phases, 'diagnostics.familyMatched': identity.matched,
      'diagnostics.externalControlSupported': false, 'diagnostics.configurationWritesEnabled': identity.matched && this.device.deyeAllowConfigurationWrites === true });
    const notes = [NOTE];
    if (!identity.matched) {
      out['diagnostics.note'] = `Family/phase mismatch: type 0x${identity.type.toString(16)}, phases ${identity.phases & 255}, topology ${identity.topology}. Measurements and writes blocked. ${NOTE}`;
      return out;
    }
    const mppts = identity.phases >> 8;
    const selected = this.registers.filter(d => d.addresses[0] > 7 && (!d.remote || this.device.deyeReadRemoteRegisters === true) && (!d.mppt || d.mppt <= mppts));
    const raw = new Map();
    // An optional battery-2 register must not make mandatory battery-1 SOC fail
    // merely because the addresses happen to be adjacent.
    const groups = [...readGroups(selected.filter(d => d.core)), ...readGroups(selected.filter(d => !d.core))];
    for (const g of groups) {
      try {
        const words = await this._words(g.start, g.end - g.start + 1, epoch);
        words.forEach((w, i) => raw.set(g.start + i, w));
      } catch (e) {
        if (!optionalException(e) || selected.some(d => d.core && d.addresses.some(a => a >= g.start && a <= g.end))) throw e;
        notes.push(`Optional FC3 ${g.start}-${g.end} unavailable; affected values are null.`);
      }
    }
    for (const d of selected) if (d.addresses.every(a => raw.has(a))) out[d.id] = decode(d.addresses.map(a => raw.get(a)), d);
    const singleBattery = this.profile.single || [0, 1].includes(out['identity.batteryInputs']);
    if (singleBattery) out['canonical.soc'] = out['battery1.soc'];
    const sign = this.device.deyeBatteryPowerSign;
    const scale = this.profile.single ? 1 : Number(this.device.deyeBatteryPowerScale);
    if (singleBattery && ['positiveDischarge', 'positiveCharge'].includes(sign) && [1, 10].includes(scale) && out['battery.powerRaw'] !== null) {
      out['canonical.batteryPower'] = out['battery.powerRaw'] * scale * (sign === 'positiveDischarge' ? 1 : -1);
    }
    const gridSign = this.profile.single ? 'positiveImport' : this.device.deyeGridPowerSign;
    if (['positiveImport', 'positiveExport'].includes(gridSign) && out['grid.power'] !== null) out['canonical.gridPower'] = out['grid.power'] * (gridSign === 'positiveImport' ? 1 : -1);
    const pv = Array.from({ length: Math.min(mppts, 4) }, (_, i) => out[`pv.power${i + 1}`]);
    if (mppts >= 1 && mppts <= 4 && pv.every(v => typeof v === 'number' && Number.isFinite(v))) out['canonical.pvPower'] = pv.reduce((a, b) => a + b, 0);
    if (!singleBattery) notes.push('Multiple/unknown battery inputs: no aggregate SOC or battery-power alias interpretation.');
    if (out['canonical.batteryPower'] === null) notes.push('Battery power alias unavailable until single-input scaling and direction are confirmed in device settings.');
    if (out['canonical.gridPower'] === null) notes.push('Grid power direction awaits commissioning confirmation.');
    out['diagnostics.note'] = notes.join(' ');
    return out;
  }
  async writeDatapoint(dp, value) {
    const d = this.byId.get(String(dp?.id || ''));
    // Match only our immutable allowlist by ID. Never trust edited datapoint
    // source/write addresses, generic unlock hints or dynamic-control aliases.
    if (!d?.writable) throw error('E_DEYE_WRITE_UNSUPPORTED', 'DEYE write blocked: only the four documented configuration limits are supported; no remote power commands');
    if (this.device.deyeAllowConfigurationWrites !== true) throw error('E_DEYE_WRITE_LOCKED', 'DEYE configuration writes require explicit device opt-in');
    const n = typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) ? Number(value) : NaN;
    const raw = n / (10 ** d.exponent);
    if (!Number.isFinite(n) || n < d.min || n > d.max || !Number.isInteger(raw)) throw error('E_DEYE_WRITE_VALUE', `DEYE ${d.id}: expected ${d.min}..${d.max} ${d.unit} in steps of ${10 ** d.exponent}`);
    if (this._pendingWrites >= 8) throw error('E_DEYE_BUSY', 'DEYE configuration queue full');
    this._pendingWrites++;
    try {
      return await this._transaction(async epoch => {
        if (this.device.deyeAllowConfigurationWrites !== true) throw error('E_DEYE_WRITE_LOCKED', 'DEYE configuration permission revoked');
        const id = await this._identity(epoch);
        if (!id.matched || id.unitId !== this.unitId || !/^[A-Z0-9]{10}$/.test(id.serial)) throw error('E_DEYE_IDENTITY', 'DEYE write blocked: family, phase, address or serial identity mismatch');
        await this._words(d.addresses[0], 1, epoch);
        this._active(epoch);
        if (this.device.deyeAllowConfigurationWrites !== true) throw error('E_DEYE_WRITE_LOCKED', 'DEYE configuration permission revoked');
        await super._mbWriteRegisters(d.addresses[0], [raw], this.unitId); // exactly one FC16
        this._active(epoch);
        const actual = decode(await this._words(d.addresses[0], 1, epoch), d);
        if (actual !== n) throw error('E_DEYE_VERIFY', `DEYE readback differs from ${n}; no automatic retry`);
        return { effectiveValue: actual };
      });
    } finally { this._pendingWrites--; }
  }
}
module.exports = { DeyeModbusDriver };
