'use strict';

const { performance } = require('node:perf_hooks');
const { ModbusDriver } = require('./modbus');
const { TABLE_VERSION, getVartaProfile, registersForProfile, decodeWords, scaleValue, buildReadGroups } = require('../vartaProtocol');
const { extendedRegistersForProfile, tokenResponse, encodeEngineering } = require('../vartaExtendedProtocol');

// A VARTA server accepts arbitrary Unit-IDs. Multiple configured devices at one
// host must therefore share pacing AND transaction ordering, not merely a UID.
// Other manufacturers keep their existing Modbus driver entirely unchanged.
const endpoints = new Map();
const NOTE = 'Public table 14 documents monitoring and scale-factor configuration only; no charge/discharge setpoint or external enable.';
const EXTENDED_NOTE = 'Extended table 14: limits and additive Pextra are separate controls; Pextra is not an absolute power target. No automatic command refresh or frequency-control heartbeat. Encrypted discharge energy requires separate vendor keys and is not reported as Wh.';
function error(code, message) { return Object.assign(new Error(message), { code }); }
function isRegisterException(e) {
  const code = Number(e && (e.modbusCode ?? e.exceptionCode));
  return [1, 2, 3].includes(code) || /illegal (data )?(address|value|function)|modbus exception [123]\b/i.test(String(e?.message || ''));
}

/**
 * Dedicated table-14 implementation; inherits only the proven TCP transport,
 * reconnect/backoff and hard timeouts. No generic password unlock, SunSpec scan,
 * off-by-one probing, FC16 fallback or automatic control writes are used here.
 */
class VartaModbusDriver extends ModbusDriver {
  constructor(adapter, device, template, globalConfig) {
    super(adapter, device, template, globalConfig);
    this.profile = getVartaProfile(template);
    if (!this.profile || device.protocol !== 'modbusTcp') throw error('E_VARTA_PROFILE', 'VARTA public table 14 requires its matching Modbus TCP profile');
    this.registers = [...registersForProfile(this.profile), ...extendedRegistersForProfile(this.profile)];
    this.byId = new Map(this.registers.map(def => [def.id, def]));
    this.manualAddressOffset = 0;
    this.autoAddressOffset = 0;
    this._autoSunSpec = false;
    this.disableAddressFallbackOffsets = true;
    this._disableAddressFallbackOffsets = true;
    // The per-endpoint scheduler below enforces the vendor minimum even if the
    // user enters 0 ms. Waiting is OUTSIDE the TCP operation hard timeout.
    this.minRequestIntervalMs = Math.max(this.profile.minIntervalMs, Number(this.minCommandIntervalMs) || 0);
    this.minCommandIntervalMs = 0;
    this.commandMaxAgeMs = this.profile.key === 'link' ? 60000 : 30000;
    this.maxReadRegs = Math.max(25, Math.min(125, Math.trunc(this.maxReadRegs || 40)));
    const configuredUnit = device.connection?.unitId;
    if (configuredUnit !== undefined && configuredUnit !== null && configuredUnit !== '' && (!Number.isInteger(Number(configuredUnit)) || Number(configuredUnit) < 1 || Number(configuredUnit) > 255)) {
      throw error('E_VARTA_UNIT_ID', 'VARTA Modbus TCP Unit-ID must be an integer from 1 to 255 (recommended: 255)');
    }
    this.unitId = configuredUnit === undefined || configuredUnit === null || configuredUnit === '' ? 255 : Number(configuredUnit);
    this.manualUnitId = this.unitId;
    this._endpointKey = `${String(device.connection?.host || '').trim().toLowerCase()}:${Number(device.connection?.port || 502)}`;
    let endpoint = endpoints.get(this._endpointKey);
    if (!endpoint) {
      endpoint = { tail: Promise.resolve(), lastAt: null, lastInterval: 0, refs: 0, pending: 0 };
      endpoints.set(this._endpointKey, endpoint);
    }
    endpoint.refs += 1;
    this._endpoint = endpoint;
    this._stopped = false;
    this._epoch = 0;
    this._activeEpoch = 0;
    this._sleepCancels = new Set();
    this._pendingWrites = 0;
    this._readPending = null;
    this._lastDiagnostic = '';
  }

  _assertActive(epoch = this._epoch) {
    if (this._stopped) throw error('E_VARTA_STOPPED', 'VARTA operation cancelled: device runtime stopped');
    if (epoch !== this._epoch) throw error('E_VARTA_RESET', 'VARTA operation cancelled after transport reset; no queued command replay');
  }

  _now() { return performance.now(); }
  _delay(ms) {
    return new Promise((resolve, reject) => {
      const cancel = reason => { clearTimeout(timer); this._sleepCancels.delete(cancel); reject(reason || error('E_VARTA_STOPPED', 'VARTA pacing wait cancelled')); };
      const timer = setTimeout(() => { this._sleepCancels.delete(cancel); resolve(); }, ms);
      this._sleepCancels.add(cancel);
    });
  }

  _releaseEndpointIfUnused() {
    if (!this._endpoint.refs && !this._endpoint.pending && endpoints.get(this._endpointKey) === this._endpoint) endpoints.delete(this._endpointKey);
  }

  async connect() {
    const epoch = this._epoch;
    this._assertActive(epoch);
    await super.connect();
    if (this._stopped || epoch !== this._epoch) {
      await super.disconnect();
      this._assertActive(epoch);
    }
  }

  async resetTransport() {
    // DeviceRuntime uses this on a transport fault. Unlike terminal disconnect,
    // it MUST preserve the driver for the next automatic poll/reconnect. Drop
    // commands queued before the reset instead of replaying expert SF writes.
    this._epoch += 1;
    this._readPending = null;
    const reason = error('E_VARTA_RESET', 'VARTA pacing wait cancelled after transport reset');
    for (const cancel of [...this._sleepCancels]) cancel(reason);
    await super.disconnect();
  }

  async disconnect() {
    if (!this._stopped) {
      this._stopped = true;
      for (const cancel of [...this._sleepCancels]) cancel();
      this._endpoint.refs -= 1;
      this._releaseEndpointIfUnused();
    }
    await super.disconnect();
  }

  _transaction(fn) {
    this._assertActive();
    const ep = this._endpoint;
    const epoch = this._epoch;
    ep.pending += 1;
    const run = ep.tail.catch(() => {}).then(async () => {
      this._assertActive(epoch);
      await this.ensureConnected();
      this._assertActive(epoch);
      this._activeEpoch = epoch;
      return fn();
    });
    const settled = run.finally(() => { ep.pending -= 1; this._releaseEndpointIfUnused(); });
    ep.tail = settled.catch(() => {});
    return settled;
  }

  async _request(fn) {
    const epoch = this._activeEpoch;
    this._assertActive(epoch);
    const ep = this._endpoint;
    // Also respect the preceding request's limit (e.g. link + another profile
    // accidentally configured against the same endpoint).
    const interval = Math.max(this.minRequestIntervalMs, ep.lastInterval);
    while (ep.lastAt !== null && this._now() < ep.lastAt + interval) {
      await this._delay(Math.max(1, Math.ceil(ep.lastAt + interval - this._now())));
      this._assertActive(epoch);
    }
    ep.lastAt = this._now();
    ep.lastInterval = this.minRequestIntervalMs;
    const result = await fn();
    this._assertActive(epoch);
    return result;
  }

  async _readWords(address, length) {
    const response = await this._request(() => super._mbReadHoldingRegisters(address, length, this.unitId));
    const words = response?.data;
    if (!Array.isArray(words) || words.length !== length || words.some(w => !Number.isInteger(w) || w < 0 || w > 65535)) {
      throw error('E_VARTA_RESPONSE', `VARTA short/invalid FC3 response at ${address}: expected ${length} registers`);
    }
    return words;
  }

  _diagnostics(out, notes, supported, scalingValid) {
    out['diagnostics.tableSupported'] = supported;
    out['diagnostics.scalingValid'] = supported && scalingValid;
    out['diagnostics.externalControlSupported'] = supported && this.device.vartaExtendedEnabled !== false;
    out['diagnostics.controlWritesEnabled'] = supported && this.device.vartaExtendedEnabled !== false && this.device.vartaAllowControlWrites === true;
    out['diagnostics.frequencyControlEnabled'] = supported && this.device.vartaExtendedEnabled !== false && this.device.vartaFrequencyControlEnabled === true && ['neo', 'flex'].includes(this.profile.column);
    out['diagnostics.tokenMode'] = this.device.vartaLegacyUnpaddedToken === true ? 'legacy-unpadded' : 'documented-4-digit-hex';
    out['diagnostics.scaleFactorWritesEnabled'] = this.profile.scaled && this.device.vartaAllowScaleFactorWrites === true;
    out['diagnostics.note'] = [...notes, this.device.vartaExtendedEnabled === false ? NOTE : EXTENDED_NOTE].join(' ');
    const diagnostic = notes.join(' ');
    if (diagnostic !== this._lastDiagnostic) {
      this._lastDiagnostic = diagnostic;
      if (diagnostic) this.adapter.log.warn(`[${this.device.id}] VARTA: ${diagnostic}`);
    }
    return out;
  }

  async readDatapoints(datapoints) {
    // Coalesce duplicate read callers rather than building an unbounded poll
    // queue or returning an empty snapshot that looks like fresh device data.
    if (this._readPending) return this._readPending;
    const promise = this._transaction(() => this._readSnapshot(datapoints));
    this._readPending = promise;
    try { return await promise; } finally { if (this._readPending === promise) this._readPending = null; }
  }

  async _readSnapshot(datapoints) {
    const requestedIds = new Set((datapoints || this.template.datapoints).map(dp => String(dp.id)));
    const requested = this.registers.filter(def => requestedIds.has(def.id));
    const enabled = def => !def.extended || (this.device.vartaExtendedEnabled !== false && (!def.frequency || this.device.vartaFrequencyControlEnabled === true));
    const selected = requested.filter(enabled);
    const out = {};
    for (const def of requested) if (!enabled(def)) out[def.id] = null;
    const notes = [];
    // Read the table version from the literal documented address before using
    // the map. The PDF explicitly does not guarantee backwards compatibility.
    const version = (await this._readWords(1051, 1))[0];
    out.tABLE_VERSION = version;
    if (version !== TABLE_VERSION) {
      // Null ALL measurements, not just requested ones, to retire an old good
      // snapshot immediately after a firmware/table change. Do not guess a map.
      for (const def of this.registers) if (def.id !== 'tABLE_VERSION') out[def.id] = null;
      return this._diagnostics(out, [`Unsupported table version ${version}; expected 14. Measurement interpretation and all writes are blocked.`], false, false);
    }

    const readDefs = new Map(selected.filter(def => def.id !== 'tABLE_VERSION').map(def => [def.id, def]));
    for (const def of selected) {
      if (def.sf && this.profile.scaled && this.byId.has(def.sf)) readDefs.set(def.sf, this.byId.get(def.sf));
    }
    const raw = { tABLE_VERSION: version };
    // Keep optional extension blocks apart from the public measurements. An
    // older firmware may reject e.g. 1072 without invalidating charge energy
    // 1069..1071. Vendor-activated frequency registers form their own group.
    const groups = [
      [...readDefs.values()].filter(def => !def.extended),
      [...readDefs.values()].filter(def => def.extended && !def.frequency),
      [...readDefs.values()].filter(def => def.extended && def.frequency),
    ].flatMap(defs => buildReadGroups(defs, this.maxReadRegs));
    for (const group of groups) {
      try {
        const words = await this._readWords(group.start, group.end - group.start + 1);
        for (const def of group.definitions) {
          const offset = def.address - group.start;
          raw[def.id] = decodeWords(words.slice(offset, offset + def.length), def);
        }
      } catch (e) {
        // An unsupported optional register is visible as null, never fabricated
        // zero or an old cached SF. Core failures and all transport/short-frame
        // errors fail the poll, so the normal runtime connection failsafe acts.
        if (!isRegisterException(e) || group.definitions.some(def => def.core)) throw e;
        for (const def of group.definitions) raw[def.id] = null;
        notes.push(`FC3 ${group.start}-${group.end} unavailable (${group.definitions.map(def => def.id).join(', ')}).`);
      }
    }
    let scalingValid = true;
    for (const def of readDefs.values()) {
      const value = raw[def.id];
      if (value === undefined || value === null) {
        out[def.id] = null;
        if (def.isScaleFactor || (!def.extended && def.writable)) scalingValid = false;
      } else if (def.dataType === 'string16' || def.isScaleFactor || (!def.extended && def.writable)) {
        out[def.id] = value;
      } else {
        const exponent = def.sf && this.profile.scaled ? raw[def.sf] : 0;
        out[def.id] = scaleValue(value, exponent, def.scaleFactor || 0);
        if (out[def.id] === null) {
          scalingValid = false;
          notes.push(`Invalid/missing scale exponent for ${def.id}; value unavailable.`);
        }
        if (def.id === 'sOC' && out[def.id] !== null && (out[def.id] < 0 || out[def.id] > 100)) {
          out[def.id] = null;
          notes.push('SOC outside documented 0..100 percent; value unavailable.');
        }
      }
    }
    return this._diagnostics(out, notes, true, scalingValid);
  }

  async writeDatapoint(dp, value) {
    // Authoritative model-specific allowlist, NOT a caller-provided FC/address.
    // Only explicitly selected SF configuration writes are permitted.
    const def = this.byId.get(String(dp?.id || ''));
    if (def?.extended) return this._writeExtended(def, value);
    if (!def?.writable || !this.profile.scaled) throw error('E_VARTA_READ_ONLY', `VARTA ${dp?.id || 'datapoint'} is not a documented writable scale-factor register`);
    if (this.device.vartaAllowScaleFactorWrites !== true) throw error('E_VARTA_WRITE_LOCKED', 'VARTA scale-factor writes are locked. Explicitly enable the expert option; these registers do not control charging.');
    const numericString = typeof value === 'string' && /^[+-]?\d+$/.test(value.trim());
    const number = typeof value === 'number' || numericString ? Number(value) : NaN;
    if (!Number.isInteger(number) || number < -32768 || number > 32767) throw error('E_VARTA_WRITE_VALUE', 'VARTA scale factor requires a signed 16-bit integer (-32768..32767)');
    // Full SINT16 is documented. Do not invent a narrower vendor range; invalid
    // engineering exponents are instead clearly rejected by the read decoder.
    if (this._pendingWrites >= 8) throw error('E_VARTA_WRITE_BUSY', 'VARTA scale-factor configuration queue is full; wait for readback before issuing another write');
    this._pendingWrites += 1;
    try {
      return await this._transaction(async () => {
        // Recheck the opt-in when dequeued, not only when originally submitted.
        if (this.device.vartaAllowScaleFactorWrites !== true) throw error('E_VARTA_WRITE_LOCKED', 'VARTA scale-factor write permission was revoked');
        const identity = await this._readWords(1051, 13); // table + timestamp + serial only; supported on every model
        const serial = decodeWords(identity.slice(3, 13), this.byId.get('sERIAL_NUMBER'));
        if (identity[0] !== TABLE_VERSION || !/^\d{9}$/.test(serial)) {
          throw error('E_VARTA_WRITE_IDENTITY', `VARTA write blocked: expected table 14 and a 9-digit serial number at FC3@1051/1054; got table ${identity[0]} and ${JSON.stringify(serial)}`);
        }
        await this._readWords(def.address, 1); // target must exist; never scan neighbouring addresses
        const encoded = number < 0 ? number + 65536 : number;
        await this._request(() => {
          if (this.device.vartaAllowScaleFactorWrites !== true) throw error('E_VARTA_WRITE_LOCKED', 'VARTA scale-factor write permission was revoked');
          return super._mbWriteRegister(def.address, encoded, this.unitId); // FC6 ONLY
        });
        const actual = decodeWords(await this._readWords(def.address, 1), def);
        if (actual !== number) throw error('E_VARTA_WRITE_VERIFY', `VARTA FC6@${def.address} readback mismatch: requested ${number}, read ${actual}; no automatic retry`);
        // No scale cache exists: the next snapshot re-reads every needed SF and
        // mantissa together. Runtime acknowledges only after this confirmation.
      });
    } finally {
      this._pendingWrites -= 1;
    }
  }

  _assertExtendedWrite(def, submittedAt) {
    this._assertActive(this._activeEpoch);
    if (this.device.vartaExtendedEnabled === false) throw error('E_VARTA_WRITE_LOCKED', 'VARTA extended protocol is disabled');
    if (def.frequency && this.device.vartaFrequencyControlEnabled !== true) throw error('E_VARTA_FREQUENCY_LOCKED', 'VARTA must activate frequency-control registers before this option can be enabled');
    if (def.isScaleFactor) {
      if (this.device.vartaAllowScaleFactorWrites !== true) throw error('E_VARTA_WRITE_LOCKED', 'VARTA scale-factor writes are locked');
    } else {
      if (this.device.vartaAllowControlWrites !== true) throw error('E_VARTA_WRITE_LOCKED', 'VARTA control writes are locked');
      if (this._now() - submittedAt >= this.commandMaxAgeMs) throw error('E_VARTA_COMMAND_EXPIRED', `VARTA command is older than ${this.commandMaxAgeMs / 1000} seconds; submit a fresh command after readback`);
    }
  }

  async _writeExtendedWord(def, word, submittedAt, extraGuard) {
    // Check age and authorization AFTER pacing, immediately before the actual
    // FC6. A queued command may expire while identity/scale reads are pending.
    return this._request(() => {
      this._assertExtendedWrite(def, submittedAt);
      if (extraGuard) extraGuard();
      return super._mbWriteRegister(def.address, word, this.unitId);
    });
  }

  async _verifyIdentity() {
    const identity = await this._readWords(1051, 13);
    const serial = decodeWords(identity.slice(3, 13), this.byId.get('sERIAL_NUMBER'));
    if (identity[0] !== TABLE_VERSION || !/^\d{9}$/.test(serial)) {
      throw error('E_VARTA_WRITE_IDENTITY', 'VARTA write blocked: expected table 14 and a 9-digit serial number');
    }
  }

  async _authenticatePextra(submittedAt) {
    const before = (await this._readWords(1073, 1))[0];
    const beforeAt = this._now();
    if (before > 120) throw error('E_VARTA_AUTH', 'VARTA control timer is outside the documented 0..120 seconds');
    const challenge = (await this._readWords(1076, 1))[0];
    const response = tokenResponse(challenge, this.device.vartaLegacyUnpaddedToken === true);
    const tokenDef = this.byId.get('pEXTRA_TOKEN');
    await this._writeExtendedWord(tokenDef, response, submittedAt);
    const writtenAt = this._now();
    const remaining = (await this._readWords(1073, 1))[0];
    const checkedAt = this._now();
    // The document disagrees on token readback after an answer. The timer is
    // the authority: it must show a newly refreshed 120-second lease, not the
    // countdown left by an earlier accepted command. Allow one second of
    // countdown quantization in the conservative old-timer upper bound.
    const oldUpper = Math.max(0, before - Math.max(0, Math.floor((checkedAt - beforeAt) / 1000) - 1));
    const freshLower = Math.max(1, 120 - Math.ceil((checkedAt - writtenAt) / 1000) - 1);
    if (remaining > 120 || remaining < freshLower || remaining <= oldUpper) {
      throw error('E_VARTA_AUTH', 'VARTA Pextra token did not prove a fresh 120-second control timer; target was not written');
    }
    return checkedAt + Math.max(0, remaining - 1) * 1000;
  }

  async _writeExtended(def, value) {
    if (!def.writable || def.id === 'pEXTRA_TOKEN') throw error('E_VARTA_READ_ONLY', `VARTA ${def.id} is not a writable command`);
    const submittedAt = this._now();
    // Initial rejection is deliberately free of network side effects. Epoch
    // is checked again by the transaction and each physical write.
    if (this._stopped) this._assertActive();
    if (this.device.vartaExtendedEnabled === false || (def.isScaleFactor ? this.device.vartaAllowScaleFactorWrites !== true : this.device.vartaAllowControlWrites !== true)) {
      throw error('E_VARTA_WRITE_LOCKED', 'VARTA extended write permission is disabled');
    }
    if (def.frequency && this.device.vartaFrequencyControlEnabled !== true) throw error('E_VARTA_FREQUENCY_LOCKED', 'VARTA frequency-control registers require vendor activation and explicit opt-in');
    const numeric = typeof value === 'number' || (typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) ? Number(value) : NaN;
    if (!Number.isFinite(numeric)) throw error('E_VARTA_WRITE_VALUE', 'VARTA command must be a finite number');
    if (def.id === 'dISCHARGE_LIMIT' || def.id === 'cHARGE_LIMIT') {
      if ((def.id === 'dISCHARGE_LIMIT' && numeric > 0) || (def.id === 'cHARGE_LIMIT' && numeric < 0)) throw error('E_VARTA_WRITE_VALUE', 'VARTA UG must be negative or zero; OG must be positive or zero');
      if (numeric !== 0) {
        const minimum = { residential: 500, commercial: 5000 }[this.device.vartaLimitClass];
        if (!minimum) throw error('E_VARTA_LIMIT_CLASS', 'Select the confirmed residential (500 W) or commercial (5000 W) limit class before writing nonzero UG/OG');
        if (Math.abs(numeric) < minimum) throw error('E_VARTA_WRITE_VALUE', `VARTA ignores nonzero UG/OG limits below ${minimum} W`);
      }
    }
    if (def.id === 'pOWER_FRACTION' && (numeric < -100 || numeric > 100)) throw error('E_VARTA_WRITE_VALUE', 'VARTA pulse PSP must be between -100 and 100 percent');
    if (def.id === 'fREQUENCY_ACTIVE' && ![0, 1].includes(numeric)) throw error('E_VARTA_WRITE_VALUE', 'VARTA frequency-control enable accepts only 0 or 1');
    if (def.isScaleFactor) encodeEngineering(value, def, 0);
    if (this._pendingWrites >= 8) throw error('E_VARTA_WRITE_BUSY', 'VARTA command queue is full; wait for readback');
    this._pendingWrites += 1;
    try {
      return await this._transaction(async () => {
        this._assertExtendedWrite(def, submittedAt);
        await this._verifyIdentity();
        let exponent = 0;
        if (def.sf && this.profile.scaled) {
          const sf = this.byId.get(def.sf);
          if (!sf) throw error('E_VARTA_WRITE_VALUE', 'VARTA scale-factor definition is missing');
          exponent = decodeWords(await this._readWords(sf.address, 1), sf);
        }
        const encoded = encodeEngineering(value, def, exponent);
        await this._readWords(def.address, 1);
        if (def.id === 'fREQUENCY_POWER' || (def.id === 'fREQUENCY_ACTIVE' && numeric === 1)) {
          if ((await this._readWords(1300, 1))[0] !== 1) throw error('E_VARTA_NOT_READY', 'VARTA frequency control is not ready; command was not written');
        }
        let leaseEnd = null;
        if (def.id === 'aDDITIONAL_POWER') leaseEnd = await this._authenticatePextra(submittedAt);
        await this._writeExtendedWord(def, encoded, submittedAt, leaseEnd === null ? null : () => {
          if (this._now() >= leaseEnd) throw error('E_VARTA_AUTH', 'VARTA Pextra authorization expired before the command could be written');
        });
        const actual = (await this._readWords(def.address, 1))[0];
        if (actual !== encoded) throw error('E_VARTA_WRITE_VERIFY', `VARTA FC6@${def.address} readback mismatch; no automatic retry`);
        if (def.id === 'dISCHARGE_LIMIT' || def.id === 'cHARGE_LIMIT') {
          const remaining = (await this._readWords(1073, 1))[0];
          if (remaining < 1 || remaining > 120) throw error('E_VARTA_LIMIT_INACTIVE', 'VARTA limit register matches but countdown is not active; manufacturer timer-refresh behavior is unconfirmed');
        }
        if (def.id === 'fREQUENCY_ALIVE' && (await this._readWords(1303, 1))[0] !== encoded) {
          throw error('E_VARTA_WRITE_VERIFY', 'VARTA frequency-control alive mirror did not acknowledge the written value; no automatic retry');
        }
      });
    } finally { this._pendingWrites -= 1; }
  }
}

module.exports = { VartaModbusDriver };
