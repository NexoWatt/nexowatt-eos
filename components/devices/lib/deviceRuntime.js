'use strict';

const path = require('path');
const { roundTo, normalizeValueByUnit } = require('./utils');
const {
  SCHEMA_VERSION: ALIAS_SCHEMA_VERSION,
  STANDARD_NAMESPACE: ALIAS_STANDARD_NAMESPACE,
  getDeviceClass: getAliasDeviceClass,
  canonicalAliasPath,
  legacyAliasPath,
  cloneStandardDefinition,
  buildStandardAliasDefinitions,
  buildManifest: buildAliasManifest,
  mergeStandardDefinition,
} = require('./aliasContract');
const { ModbusDriver } = require('./drivers/modbus');
const { VartaModbusDriver } = require('./drivers/vartaModbus');
const { DeyeModbusDriver } = require('./drivers/deyeModbus');
const { getDeyeProfile, buildDeyeAliases } = require('./deyeProtocol');
const { getVartaProfile, buildVartaAliases } = require('./vartaProtocol');
const { buildVartaExtendedAliases } = require('./vartaExtendedProtocol');
const { MqttDriver } = require('./drivers/mqtt');
const { CanbusDriver } = require('./drivers/canbus');
const { HttpDriver } = require('./drivers/http');
const { UdpDriver } = require('./drivers/udp');
const { SpeedwireDriver } = require('./drivers/speedwire');
const { OneWireDriver } = require('./drivers/onewire');
const { MbusDriver } = require('./drivers/mbus');
const { KostalTcpDriver } = require('./drivers/kostalTcp');
const { KostalRs485Driver } = require('./drivers/kostalRs485');
const { TaCmiDriver } = require('./drivers/taCmi');

const ABL_EMH1_LIVE_ALIAS_PATHS = new Set([
  'r.currentL1',
  'r.currentL2',
  'r.currentL3',
  'r.currentA',
  'r.currentTotalA',
  'r.currentPhaseSumA',
  'r.power',
  'r.powerEstimated',
]);

// Safety-relevant EV charger feedback must remain temporally fresh even when the
// value itself does not change. Idle chargers commonly report 0 W / false for
// hours. ioBroker otherwise keeps the old state timestamp because _setStateCached
// suppresses identical writes, which can make an upstream load-management
// failsafe classify a healthy charger as stale.
//
// Keep the scope deliberately narrow: only operational readback/status aliases
// of the canonical evCharger class are periodically re-published, and only after
// a real successful device snapshot. Static metadata, energy counters and command
// aliases remain change-only to avoid unnecessary state/history traffic.
const EV_CHARGER_FRESHNESS_ALIAS_PATHS = new Set([
  'comm.connected',
  'alarm.offline',
  'r.status',
  'r.statusCode',
  'r.statusText',
  'r.available',
  'r.vehicleConnected',
  'r.charging',
  'r.soc',
  'r.power',
  'r.powerEstimated',
  'r.currentA',
  'r.currentTotalA',
  'r.currentPhaseSumA',
  'r.currentL1',
  'r.currentL2',
  'r.currentL3',
  'r.mode3Code',
  'r.mode3State',
  'r.evState',
]);

const DEFAULT_EV_CHARGER_FRESHNESS_REFRESH_MS = 5000;
const MIN_EV_CHARGER_FRESHNESS_REFRESH_MS = 1000;
const MAX_EV_CHARGER_FRESHNESS_REFRESH_MS = 10000;

class DeviceRuntime {
  constructor(adapter, deviceConfig, template, globalConfig) {
    this.adapter = adapter;
    this.cfg = deviceConfig;
    this.template = template;
    this.global = globalConfig || {};

    this.baseId = `devices.${this.cfg.id}`;
    this.dpByStateRelId = new Map(); // relId -> dpDef
    this.dpById = new Map(); // dpId -> dpDef
    this.dynamicDatapoints = []; // runtime-discovered datapoints (e.g. TA CMI JSON API)

    // Alias states: stable datapoint names across different manufacturers/templates.
    // These are created under: devices.<id>.aliases.*
    this.aliasByStateRelId = new Map(); // relId -> aliasDef
    this.aliasDefs = []; // list of aliasDef

    // Alias Contract v1: versioned, manufacturer-independent interface for the
    // NexoWatt UI and future integration adapters. Legacy aliases remain available.
    this.aliasDeviceClass = getAliasDeviceClass(this.template, this.cfg);
    this.aliasContractInfo = {
      schemaVersion: ALIAS_SCHEMA_VERSION,
      namespace: ALIAS_STANDARD_NAMESPACE,
      deviceClass: this.aliasDeviceClass,
      capabilities: [],
      missingRequired: [],
    };
    this._aliasMetadataRefreshTimer = null;

    this.driver = null;
    this.pollTimer = null;
    this._pollLoopActive = false;

    // Stop optional write loop and clear queued writes
    try {
      this._writeQueueEnabled = false;
      this._stopWriteLoop();
      if (this._writeQueue) this._writeQueue.clear();
      this._writeBusy = false;
    } catch (e) {
      // ignore
    }
    this.watchdogTimer = null;
    this.watchdogStartTimer = null;
    this._watchdogCounter = 0;
    this._watchdogBusy = false;
    this._connOk = false;

    // Optional Modbus setpoint keepalive: some devices (e.g. EV chargers) expose
    // control setpoints with a *valid time*. If the setpoint is not refreshed before
    // it expires, the device falls back to its safe/default value.
    // Enabled per template via: driverHints.modbus.setpointKeepalive
    this._setpointKeepaliveTimer = null;
    this._setpointKeepaliveBusy = false;
    this._setpointKeepaliveLastWriteByDpId = new Map();

    // Optional Sungrow External EMS/VPP heartbeat refresh. Sungrow treats the
    // heartbeat register as a timeout value in seconds, not as a changing counter.
    // Keep this separate from power-setpoint keepalive so a single EMS power DP
    // can trigger the full control block once while the adapter refreshes only
    // the lightweight heartbeat cyclically.
    this._sungrowHeartbeatTimer = null;
    this._sungrowHeartbeatStartTimer = null;
    this._sungrowHeartbeatBusy = false;
    this._setpointKeepaliveUnsupportedUntilByDpId = new Map();
    this._unsupportedWriteSkipLogTsByDpId = new Map();

    // Optional post-write confirmation repeat. Some chargers, especially Alfen ACE,
    // need a freshly changed EMS command to be sent again after the command stream
    // has been quiet for a few seconds.
    this._postWriteRepeatTimersByDpId = new Map();

    // Optional Modbus setpoint restore (on start/reconnect): some devices reset their control setpoints
    // after a reboot or communication outage (e.g. PV export limit goes back to 100%).
    // Enabled per template via: template.driverHints.modbus.restoreSetpointsOnStart
    this._restoreCfg = null;
    this._restoreDpIds = new Set();
    this._restoreFallback = new Map(); // dpId -> last known value (captured from dp state before first poll)
    this._restoreTimer = null;
    this._restoreBusy = false;

    // Persisted setpoint memory states live under: devices.<id>.info.setpoints.<dpId>
    this._setpointsInfoReady = false;


    // Track recent writes to datapoints. This enables safe watchdog behavior
    // where watchdog values are only refreshed while an external controller
    // is actively sending setpoints.
    this._lastWriteByDpId = new Map(); // dpId -> unix ms
    // Last values that were successfully commanded by this adapter.  Readback registers on
    // some devices are not stable command mirrors (Alfen ACE socket control can expose the
    // accepted command at an alternate address and adjacent/read-only registers may otherwise
    // decode as 0 A / 1 phase).  Keep command aliases and watchdog refreshes tied to the last
    // known successful command instead of volatile readback.
    this._lastCommandedValueByDpId = new Map(); // dpId -> last successfully written engineering value
    // ABL eMH1 uses 100 % PWM as the normal "no current available" command. Preserve
    // the last active 10..96 % value so ctrl.run/ctrl.chargeEnable can resume charging
    // without abusing the service-state register 0x0005.
    this._ablLastActiveDutyPctByDpId = new Map(); // write dpId -> last active PWM duty cycle

    // Fail-safe control flags for watchdog-managed "VK" interfaces (e.g. TESVOLT).
    this._autoWatchdogControlEverActive = false;
    this._autoWatchdogControlDisabled = false;
    // Error log throttling (avoid log spam on persistent comm errors)
    this._lastErrorLogMsg = '';
    this._lastErrorLogTs = 0;

    // Optional write throttling / coalescing (needed for devices that require >=1s between Modbus commands).
    // Enabled via template driverHints.modbus.writeThrottleMs.
    this._writeThrottleMs = 0;
    this._writeQueueMaxPerTick = 1;
    this._writeQueue = new Map(); // dpId -> { dp, deviceValue, ackByRelId, attempts, isPreWrite, preWriteTriggerDpId }
    this._writeLoopActive = false;
    this._writeTimer = null;
    this._writeLoopBusy = false;

    // Pre-write throttling: remember when a preWrite sequence for a trigger datapoint was last executed.
    this._preWriteLastTsByTrigger = new Map();

    // Optional command cadence scheduler: on each cadence tick we perform either a poll (if due) or one queued write.
    // Enabled via template driverHints.modbus.commandCadenceMs (e.g. SolaX recommends >=1s between instructions).
    this._commandCadenceMs = 0;

    // --- Heartbeat / Liveness (safety-critical) ---
    // Always exposed via stable alias states:
    //   devices.<id>.aliases.r.heartbeat    (number counter)
    //   devices.<id>.aliases.r.lastSeenMs   (unix ms)
    //   devices.<id>.aliases.r.online       (boolean)
    // Updated ONLY on real incoming data:
    // - polling protocols: successful read cycle
    // - speedwire: only when a new telegram arrives (not when serving cached values)
    // - mqtt/canbus: incoming messages/frames
    this._hbCounter = 0;
    this._hbLastSeen = 0;
    this._hbOnline = false;
    this._hbTimeoutMs = 0;
    this._hbLastWriteAt = 0;
    this._hbCheckTimer = null;
    this._hbLastSourceStamp = 0;

    // Cache last adapter-written values per state. This avoids flooding ioBroker with
    // unchanged setState() calls on every poll cycle. Safety-critical EV charger
    // aliases can opt into a bounded periodic refresh so their ioBroker timestamp
    // proves that a new device snapshot was actually received.
    this._stateCache = new Map(); // relId -> { val, ack, writtenAt }
    this._liveAliasRefreshMs = 0;

    this.started = false;
  }

  getDatapoints() {
    const base = (this.template && Array.isArray(this.template.datapoints)) ? this.template.datapoints : [];
    if (!Array.isArray(this.dynamicDatapoints) || !this.dynamicDatapoints.length) return base;
    return base.concat(this.dynamicDatapoints);
  }

  relStateId(dp) {
    return `${this.baseId}.${dp.id}`;
  }

  async _ensureDatapointPathChannels(stateRelId) {
    const parts = String(stateRelId || '').split('.').filter(Boolean);
    if (parts.length < 2) return;

    // baseId itself is already a channel. Create every parent below it so nested
    // dynamic ids such as nodes.1.inputs.1.value are displayed cleanly in ioBroker.
    const baseParts = String(this.baseId).split('.');
    for (let i = baseParts.length; i < parts.length - 1; i++) {
      const rel = parts.slice(0, i + 1).join('.');
      const name = parts[i];
      await this.adapter.setObjectNotExistsAsync(rel, {
        type: 'channel',
        common: { name },
        native: {
          deviceId: this.cfg.id,
          templateId: this.cfg.templateId,
          dynamicContainer: true,
        }
      });
    }
  }

  _datapointCommon(dp) {
    const common = {
      name: dp.name || dp.id,
      type: dp.type || 'number',
      role: dp.role || 'value',
      read: dp.rw !== 'wo',
      write: dp.rw === 'rw' || dp.rw === 'wo',
    };
    if (dp.unit !== undefined && dp.unit !== null && dp.unit !== '') common.unit = dp.unit;
    if (dp.states && typeof dp.states === 'object') common.states = dp.states;
    if ((common.type || '').toString().toLowerCase() === 'number') {
      const dec = this._getRoundingDecimals(dp);
      if (typeof dec === 'number' && Number.isFinite(dec) && dec >= 0 && dec <= 10) common.decimals = dec;
    }
    return common;
  }

  async registerDynamicDatapoint(dp) {
    if (!dp || !dp.id) return null;
    const id = String(dp.id);
    const existing = this.dpById.get(id);
    const effective = existing || Object.assign({}, dp);
    if (existing) Object.assign(existing, dp);

    const relId = this.relStateId(effective);
    await this._ensureDatapointPathChannels(relId);
    const common = this._datapointCommon(effective);
    const src = effective.source || {};

    await this.adapter.setObjectNotExistsAsync(relId, {
      type: 'state',
      common,
      native: {
        deviceId: this.cfg.id,
        templateId: this.cfg.templateId,
        datapointId: id,
        source: src,
        dynamic: true,
      }
    });
    await this.adapter.extendObjectAsync(relId, {
      common,
      native: {
        deviceId: this.cfg.id,
        templateId: this.cfg.templateId,
        datapointId: id,
        source: src,
        dynamic: true,
      }
    }).catch(() => {});

    if (!existing) this.dynamicDatapoints.push(effective);
    this.dpById.set(id, effective);
    this.dpByStateRelId.set(relId, effective);
    return effective;
  }

  async initObjects() {
    await this.adapter.setObjectNotExistsAsync(this.baseId, {
      type: 'channel',
      common: { name: this.cfg.name || this.cfg.id },
      native: {
        deviceId: this.cfg.id,
        templateId: this.cfg.templateId,
        category: this.cfg.category,
        manufacturer: this.cfg.manufacturer,
        aliasSchemaVersion: ALIAS_SCHEMA_VERSION,
        aliasNamespace: ALIAS_STANDARD_NAMESPACE,
        deviceClass: this.aliasDeviceClass,
      }
    });

    await this.adapter.setObjectNotExistsAsync(`${this.baseId}.info`, {
      type: 'channel',
      common: { name: 'Info' },
      native: {}
    });

    await this.adapter.setObjectNotExistsAsync(`${this.baseId}.info.connection`, {
      type: 'state',
      common: {
        name: 'Connection',
        type: 'boolean',
        role: 'indicator.connected',
        read: true,
        write: false,
        def: false
      },
      native: {}
    });

    await this.adapter.setObjectNotExistsAsync(`${this.baseId}.info.lastError`, {
      type: 'state',
      common: {
        name: 'Last error',
        type: 'string',
        role: 'text',
        read: true,
        write: false,
        def: ''
      },
      native: {}
    });

    if (this.template?.driverHints?.oemModbusV1003) {
      await this.adapter.setObjectNotExistsAsync(`${this.baseId}.info.depowerControl`, {
        type: 'state',
        common: { name: 'DEPower requested limit and Modbus readback', type: 'string', role: 'json', read: true, write: false, def: '{}' },
        native: {},
      });
      await this._setStateCached(`${this.baseId}.info.depowerControl`, JSON.stringify({ status: 'no_command', requestedW: null, readbackW: null }), true);
    }

    const dps = this.getDatapoints();
    for (const dp of dps) {
      const relId = this.relStateId(dp);

      const src = dp.source || {};
      const common = {
        name: dp.name || dp.id,
        type: dp.type || 'number',
        role: dp.role || 'value',
        read: dp.rw !== 'wo',
        write: dp.rw === 'rw' || dp.rw === 'wo',
      };

      // Keep units consistent across protocols (important for alias normalization).
      if (dp.unit !== undefined && dp.unit !== null && dp.unit !== '') {
        common.unit = dp.unit;
      }

      // Provide deterministic display formatting in ioBroker front-ends.
      // (Value rounding is applied on every poll; this is the corresponding meta-data.)
      if ((common.type || '').toString().toLowerCase() === 'number') {
        const dec = this._getRoundingDecimals(dp);
        if (typeof dec === 'number' && Number.isFinite(dec) && dec >= 0 && dec <= 10) {
          common.decimals = dec;
        }
      }

      await this.adapter.setObjectNotExistsAsync(relId, {
        type: 'state',
        common,
        native: {
          deviceId: this.cfg.id,
          templateId: this.cfg.templateId,
          datapointId: dp.id,
          source: src,
        }
      });

      // Keep object meta-data (e.g. unit/role) in sync when templates evolve.
      // This is important for consistent units (e.g. kW instead of W) without forcing users to delete objects.
      await this.adapter.extendObjectAsync(relId, {
        common,
        native: {
          deviceId: this.cfg.id,
          templateId: this.cfg.templateId,
          datapointId: dp.id,
          source: src,
        }
      }).catch(() => {});

      this.dpByStateRelId.set(relId, dp);
      this.dpById.set(dp.id, dp);
    }

    // Create stable alias states (optional per template/category).
    try {
      await this._initAliasObjects();
    } catch (e) {
      // Alias creation must never break device start.
      this.adapter.log.debug(`[${this.cfg.id}] alias init failed: ${e && e.message ? e.message : e}`);
    }

    // Heartbeat alias states are always available for every device/template.
    // These are used by safety-critical higher-level logic (e.g. charge management fail-safe).
    try {
      await this._initHeartbeatAliasObjects();
    } catch (e) {
      this.adapter.log.debug(`[${this.cfg.id}] heartbeat alias init failed: ${e && e.message ? e.message : e}`);
    }

    try {
      await this._initAliasContractMetadata();
    } catch (e) {
      this.adapter.log.debug(`[${this.cfg.id}] alias contract metadata init failed: ${e && e.message ? e.message : e}`);
    }
  }

  _getDpByRole(role) {
    const dps = this.getDatapoints();
    for (const dp of dps) {
      if (!dp || !dp.role) continue;
      if (dp.role === role) return dp;
    }
    return null;
  }

  _getDpById(id) {
    if (!id) return null;
    return this.dpById.get(id) || null;
  }

  _findFirstDatapoint(predicate) {
    const dps = this.getDatapoints();
    for (const dp of dps) {
      if (!dp) continue;
      try {
        if (predicate(dp)) return dp;
      } catch (e) {
        // ignore
      }
    }
    return null;
  }
  _getRoundingDecimals(dp) {
    // VARTA already applies explicit per-register exponents. Preserve fractional
    // W/Wh values rather than rounding away an intentionally selected SF.
    if (getVartaProfile(this.template) || getDeyeProfile(this.template)) return null;
    // Preserve sub-10 Wh increments before the kWh -> Wh alias conversion.
    if (this.template?.driverHints?.oemModbusV1003 && dp?.source?.depowerEnergyCounter) return 4;
    // Adapter-wide rounding policy to keep state values readable and to avoid
    // Modbus/MQTT floating point artefacts (e.g. 0.30000000004).
    //
    // Rules:
    // - SoC (battery/storage): 1 decimal
    // - SoC (EV connector): 0 decimals
    // - Power: kW/kVA/kvar -> 2 decimals, W/VA/var -> 0 decimals
    // - Energy: kWh -> 2 decimals, Wh -> 0 decimals
    // - Everything else numeric: 2 decimals (default), except status-like unitless values -> 0

    if (!dp) return null;

    const unit = (dp.unit ?? '').toString().trim();
    const unitLower = unit.toLowerCase();
    const roleLower = (dp.role ?? '').toString().toLowerCase();

    const id = (dp.id ?? '').toString();
    const name = (dp.name ?? '').toString();

    // --- SoC ---
    const looksLikeSoc =
      /(^|[^a-z0-9])soc([^a-z0-9]|$)/i.test(id) ||
      /(^|[^a-z0-9])soc([^a-z0-9]|$)/i.test(name) ||
      roleLower === 'value.battery';

    const looksLikeEvConnectorSoc =
      /^c\d+_soc$/i.test(id) ||
      /connector\s*\d*\s*soc/i.test(name) ||
      /ev\s*connector/i.test(name);

    if (looksLikeSoc) {
      if (looksLikeEvConnectorSoc) return 0;
      return 1;
    }

    // --- Power ---
    const looksLikePower =
      roleLower.includes('power') ||
      ['w', 'kw', 'va', 'kva', 'var', 'kvar'].includes(unitLower);

    if (looksLikePower) {
      if (['w', 'va', 'var'].includes(unitLower)) return 0;
      if (['kw', 'kva', 'kvar'].includes(unitLower)) return 2;
      return 2;
    }

    // --- Energy ---
    const looksLikeEnergy =
      roleLower.includes('energy') ||
      ['wh', 'kwh'].includes(unitLower);

    if (looksLikeEnergy) {
      if (unitLower === 'wh') return 0;
      if (unitLower === 'kwh') return 2;
      return 2;
    }

    // --- Status / enums (unitless) ---
    const looksLikeStatus =
      roleLower.startsWith('indicator.') ||
      roleLower.includes('status') ||
      /status|state|mode|code|fault|error/i.test(id) ||
      /status|state|mode|code|fault|error/i.test(name);

    if (looksLikeStatus && !unitLower) return 0;

    // Default: 2 decimals for all other numeric values.
    return 2;
  }

  _aliasRelId(aliasPath) {
    // Always place aliases under: devices.<id>.aliases.<...>
    return `${this.baseId}.aliases.${aliasPath}`;
  }

  _standardAliasRelId(aliasPath) {
    return this._aliasRelId(`${ALIAS_STANDARD_NAMESPACE}.${aliasPath}`);
  }

  // --- Heartbeat alias helpers ---
  _hbRelId(name) {
    return this._aliasRelId(`r.${name}`);
  }

  _hbRelIds(name) {
    return [
      this._hbRelId(name),
      this._standardAliasRelId(`r.${name}`),
    ];
  }

  _normalizeMs(v) {
    const n = Number(v);
    return (Number.isFinite(n) && n > 0) ? Math.trunc(n) : 0;
  }

  _parseNumberWithUnits(v) {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') {
      const s = v.trim().replace(',', '.');
      if (!s) return undefined;
      const direct = Number(s);
      if (Number.isFinite(direct)) return direct;
      // Accept user/front-end strings such as "6 A", "3 phases", "4.2 kW".
      const m = s.match(/[-+]?\d+(?:\.\d+)?/);
      if (!m) return undefined;
      const n = Number(m[0]);
      return Number.isFinite(n) ? n : undefined;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  _sameStateValue(a, b) {
    if (a === b) return true;
    if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
    return false;
  }

  _stateTypeHintForRelId(relId) {
    const key = String(relId || '');
    try {
      const aliasDef = this.aliasByStateRelId && this.aliasByStateRelId.get(key);
      if (aliasDef && aliasDef.type) return String(aliasDef.type).toLowerCase();
    } catch (_) {}
    try {
      const dp = this.dpByStateRelId && this.dpByStateRelId.get(key);
      if (dp && dp.type) return String(dp.type).toLowerCase();
    } catch (_) {}

    // Built-in adapter states that are not part of the template maps yet.
    if (/\.(online|connection|connected|offline)$/i.test(key)) return 'boolean';
    if (/\.(lastError|statusText|mode3State|mode3Code)$/i.test(key)) return 'string';
    if (/\.(heartbeat|lastSeenMs)$/i.test(key)) return 'number';
    return '';
  }

  _coerceStateValueForRelId(relId, val) {
    const type = this._stateTypeHintForRelId(relId);
    if (!type || val === null || val === undefined) return val;

    if (type === 'boolean') {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') {
        if (Number.isNaN(val)) return null;
        return val !== 0;
      }
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        if (!s) return false;
        if (['true', '1', 'on', 'yes', 'y', 'ja', 'an'].includes(s)) return true;
        if (['false', '0', 'off', 'no', 'n', 'nein', 'aus'].includes(s)) return false;
      }
      return !!val;
    }

    if (type === 'number') {
      if (typeof val === 'number') return Number.isNaN(val) ? null : val;
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'string') {
        const n = this._parseNumberWithUnits(val);
        return Number.isFinite(n) ? n : null;
      }
      const n = this._parseNumberWithUnits(val);
      return Number.isFinite(n) ? n : null;
    }

    if (type === 'string') {
      return (val === null || val === undefined) ? '' : String(val);
    }

    return val;
  }

  async _setStateCached(relId, val, ack = true, options = undefined) {
    if (!relId) return false;
    const key = String(relId);
    const nextAck = !!ack;
    const nextVal = this._coerceStateValueForRelId(key, val);
    const prev = this._stateCache.get(key);
    const now = Date.now();
    const refreshAfterRaw = Number(options && options.refreshAfterMs);
    const refreshAfterMs = Number.isFinite(refreshAfterRaw) && refreshAfterRaw > 0
      ? Math.max(1, Math.floor(refreshAfterRaw))
      : 0;
    const unchanged = !!(prev && prev.ack === nextAck && this._sameStateValue(prev.val, nextVal));

    if (unchanged) {
      const writtenAt = Number(prev.writtenAt) || 0;
      const refreshDue = refreshAfterMs > 0 && (writtenAt <= 0 || (now - writtenAt) >= refreshAfterMs);
      if (!refreshDue) return false;
    }

    try {
      await this.adapter.setStateAsync(key, { val: nextVal, ack: nextAck });
      this._stateCache.set(key, { val: nextVal, ack: nextAck, writtenAt: now });
      return true;
    } catch (_) {
      return false;
    }
  }

  _computeLiveAliasRefreshMs({ fastIntervalMs, isEventDriven } = {}) {
    if (this.aliasDeviceClass !== 'evCharger') return 0;

    const candidates = [
      this.cfg && this.cfg.liveStatusRefreshMs,
      this.cfg && this.cfg.liveAliasRefreshMs,
      this.cfg && this.cfg.connection && this.cfg.connection.liveStatusRefreshMs,
      this.template && this.template.driverHints && this.template.driverHints.liveStatusRefreshMs,
      this.template && this.template.driverHints && this.template.driverHints.liveAliasRefreshMs,
    ];
    let requested = 0;
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value) && value > 0) {
        requested = value;
        break;
      }
    }

    if (!(requested > 0)) {
      const poll = Number(fastIntervalMs);
      if (Number.isFinite(poll) && poll > 0) {
        requested = poll;
      } else if (isEventDriven) {
        requested = DEFAULT_EV_CHARGER_FRESHNESS_REFRESH_MS;
      } else {
        requested = DEFAULT_EV_CHARGER_FRESHNESS_REFRESH_MS;
      }
    }

    return Math.max(
      MIN_EV_CHARGER_FRESHNESS_REFRESH_MS,
      Math.min(MAX_EV_CHARGER_FRESHNESS_REFRESH_MS, Math.floor(requested)),
    );
  }

  _isEvChargerFreshnessAlias(relId) {
    if (this.aliasDeviceClass !== 'evCharger') return false;
    const path = legacyAliasPath(relId);
    return !!path && EV_CHARGER_FRESHNESS_ALIAS_PATHS.has(path);
  }

  _liveAliasRefreshOptions(relId, values, ctx) {
    if (!(this._liveAliasRefreshMs > 0)) return undefined;
    if (!this._isEvChargerFreshnessAlias(relId)) return undefined;
    if (ctx && ctx.connected === false) return undefined;
    if (!values || typeof values !== 'object' || Object.keys(values).length === 0) return undefined;
    return { refreshAfterMs: this._liveAliasRefreshMs };
  }

  async _initHeartbeatAliasObjects() {
    // Legacy heartbeat objects are intentionally kept byte-for-byte compatible
    // with releases before Alias Contract v1. Existing installations therefore
    // keep the same IDs, types, roles and native metadata.
    await this._ensureAliasPathChannels(this._hbRelId('heartbeat'));

    const legacyDefs = [
      {
        relId: this._hbRelId('heartbeat'),
        name: 'Heartbeat counter',
        role: 'value',
        type: 'number',
        def: 0,
      },
      {
        relId: this._hbRelId('lastSeenMs'),
        name: 'Last seen (unix ms)',
        role: 'value.time',
        type: 'number',
        def: 0,
      },
      {
        relId: this._hbRelId('online'),
        name: 'Online (heartbeat)',
        role: 'indicator.connected',
        type: 'boolean',
        def: false,
      },
    ];

    for (const def of legacyDefs) {
      const common = {
        name: def.name,
        type: def.type,
        role: def.role,
        read: true,
        write: false,
        def: def.def,
      };
      const native = {
        deviceId: this.cfg.id,
        templateId: this.cfg.templateId,
        isAlias: true,
        aliasKind: 'heartbeat',
      };

      await this.adapter.setObjectNotExistsAsync(def.relId, {
        type: 'state',
        common,
        native,
      });
      await this.adapter.extendObjectAsync(def.relId, {
        common,
        native,
      }).catch(() => {});
    }

    // Alias Contract v1 is additive and lives only below aliases.v1.*.
    const standardDefs = [
      { name: 'heartbeat', displayName: 'Heartbeat counter', role: 'value', type: 'number', def: 0 },
      { name: 'lastSeenMs', displayName: 'Last seen (unix ms)', role: 'value.time', type: 'number', unit: 'ms', def: 0 },
      { name: 'online', displayName: 'Online (heartbeat)', role: 'indicator.connected', type: 'boolean', def: false },
    ];

    for (const def of standardDefs) {
      const relId = this._standardAliasRelId(`r.${def.name}`);
      await this._ensureAliasPathChannels(relId);
      const common = {
        name: def.displayName,
        type: def.type,
        role: def.role,
        read: true,
        write: false,
        def: def.def,
      };
      if (def.unit) common.unit = def.unit;
      const native = {
        deviceId: this.cfg.id,
        templateId: this.cfg.templateId,
        isAlias: true,
        aliasKind: 'heartbeat',
        aliasContractVersion: ALIAS_SCHEMA_VERSION,
        aliasContractPath: `r.${def.name}`,
        capability: `read.${def.name}`,
        deviceClass: this.aliasDeviceClass,
      };
      await this.adapter.setObjectNotExistsAsync(relId, { type: 'state', common, native });
      await this.adapter.extendObjectAsync(relId, { common, native }).catch(() => {});
    }
  }

  _computeHeartbeatTimeoutMs({ fastIntervalMs, isEventDriven } = {}) {
    // Priority:
    //  1) per-device override: cfg.heartbeatTimeoutMs
    //  2) template hint: driverHints.heartbeatTimeoutMs
    //  3) protocol-derived default
    const cfgMs = this._normalizeMs(this.cfg?.heartbeatTimeoutMs);
    if (cfgMs > 0) return cfgMs;

    const tplMs = this._normalizeMs(this.template?.driverHints?.heartbeatTimeoutMs);
    if (tplMs > 0) return tplMs;

    const proto = String(this.cfg?.protocol || '').toLowerCase();
    const isSpeedwire = proto === 'speedwire';

    if (isEventDriven || proto === 'mqtt' || proto === 'canbus') {
      return 30000;
    }

    if (isSpeedwire) {
      const stale = this._normalizeMs(this.cfg?.connection?.staleTimeoutMs) || 30000;
      return Math.max(stale, 30000);
    }

    const poll = this._normalizeMs(fastIntervalMs);
    if (poll > 0) return Math.max(3 * poll, 15000);
    return 30000;
  }

  async _loadHeartbeatStateFromDb() {
    // Best-effort: keep heartbeat counter monotonic across adapter restarts.
    try {
      const [hb, lastSeen] = await Promise.all([
        this.adapter.getStateAsync(this._hbRelId('heartbeat')).catch(() => null),
        this.adapter.getStateAsync(this._hbRelId('lastSeenMs')).catch(() => null),
      ]);

      const hbVal = hb && hb.val !== undefined ? Number(hb.val) : 0;
      if (Number.isFinite(hbVal) && hbVal >= 0) this._hbCounter = Math.trunc(hbVal);

      const lsVal = lastSeen && lastSeen.val !== undefined ? Number(lastSeen.val) : 0;
      if (Number.isFinite(lsVal) && lsVal > 0) this._hbLastSeen = Math.trunc(lsVal);
    } catch (_) {
      // ignore
    }
  }

  _isAblEmh1EvccTemplate() {
    return String(this.template?.id || this.cfg?.templateId || '').toLowerCase() ===
      'evcs.abl.emh1.evcc2_3.modbusascii';
  }

  _isAblEmh1LiveMeasurementAlias(relId) {
    if (!this._isAblEmh1EvccTemplate()) return false;
    const text = String(relId || '');
    const marker = '.aliases.';
    const index = text.indexOf(marker);
    if (index < 0) return false;
    let path = text.slice(index + marker.length);
    if (path.startsWith(`${ALIAS_STANDARD_NAMESPACE}.`)) {
      path = path.slice(ALIAS_STANDARD_NAMESPACE.length + 1);
    }
    return ABL_EMH1_LIVE_ALIAS_PATHS.has(path);
  }

  _shouldResetAblEmh1LiveMeasurements(values, ctx) {
    if (!this._isAblEmh1EvccTemplate()) return false;
    if (ctx && ctx.connected === false) return true;

    const snapshot = (values && typeof values === 'object') ? values : {};
    const currentIds = ['cURRENT_L1', 'cURRENT_L2', 'cURRENT_L3'];
    const hasCurrentField = currentIds.some(id => Object.prototype.hasOwnProperty.call(snapshot, id));

    // The EVCC2/3 full-current response uses state A/B/E/F for non-charging operation.
    // C2, C3 and C4 are the only states in which a positive charging-current/power
    // value is valid. This also clears a previous current immediately when the vehicle
    // disconnects and the phase-current registers change to the documented null sentinel.
    if (Object.prototype.hasOwnProperty.call(snapshot, 'eVSE_STATE')) {
      const rawState = Number(snapshot.eVSE_STATE);
      if (Number.isFinite(rawState)) {
        const stateCode = Math.trunc(rawState) & 0xFF;
        if (![0xC2, 0xC3, 0xC4].includes(stateCode)) return true;
      }
    }

    // A successful poll without the atomic R5 current group, or a group containing only
    // null/NaN values, must fail safe to zero instead of preserving the previous load.
    if (!hasCurrentField) return true;
    const hasFiniteCurrent = currentIds.some(id => {
      if (!Object.prototype.hasOwnProperty.call(snapshot, id)) return false;
      const raw = snapshot[id];
      if (raw === null || raw === undefined || raw === '') return false;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0;
    });
    return !hasFiniteCurrent;
  }

  async _resetAblEmh1LiveMeasurements() {
    if (!this._isAblEmh1EvccTemplate() || !Array.isArray(this.aliasDefs)) return;
    for (const def of this.aliasDefs) {
      if (!def || !this._isAblEmh1LiveMeasurementAlias(def.relId)) continue;
      await this._setStateCached(def.relId, 0, true);
    }
  }

  async _setHeartbeatOnline(nextOnline, offlineReason) {
    const b = !!nextOnline;
    if (!b) await this._resetAblEmh1LiveMeasurements();

    // MQTT devices are push-driven. When their heartbeat expires, let the driver
    // actively clear template-declared live power values before updating aliases.
    // This prevents a stale storage/charger power from remaining visible forever.
    if (!b && String(this.cfg?.protocol || '').toLowerCase() === 'mqtt' && this.driver && typeof this.driver.handleOffline === 'function') {
      await this.driver.handleOffline(String(offlineReason || 'MQTT heartbeat timeout')).catch(() => {});
    }

    if (String(this.cfg?.protocol || '').toLowerCase() === 'mqtt') {
      await this._setStateCached(`${this.baseId}.info.connection`, b, true);
    }

    if (b === this._hbOnline) return;
    this._hbOnline = b;
    for (const relId of this._hbRelIds('online')) {
      await this._setStateCached(relId, b, true);
    }
  }

  async _tickHeartbeatFromIncomingData(sourceStamp) {
    // sourceStamp: optional monotonic marker that only changes when *new* data arrived
    // (e.g., Speedwire lastSeen timestamp). If provided, we only tick when it changes.
    if (!this.started) return;
    const now = Date.now();

    if (sourceStamp !== undefined && sourceStamp !== null) {
      const s = Number(sourceStamp) || 0;
      if (s <= 0) return;
      if (s === this._hbLastSourceStamp) {
        // No fresh data since last tick (e.g. Speedwire soft-stale serving cached values)
        this._hbLastSeen = Math.max(this._hbLastSeen, s);
        return;
      }
      this._hbLastSourceStamp = s;
      this._hbLastSeen = s;
    } else {
      this._hbLastSeen = now;
    }

    // Flip online immediately when we see the device alive
    if (!this._hbOnline) {
      await this._setHeartbeatOnline(true);
    }

    // Throttle writes to max 1 Hz per device
    if (this._hbLastWriteAt && (now - this._hbLastWriteAt) < 1000) return;
    this._hbLastWriteAt = now;

    this._hbCounter = (Number.isFinite(this._hbCounter) ? this._hbCounter : 0) + 1;
    if (this._hbCounter > 2147480000) this._hbCounter = 1;

    for (const relId of this._hbRelIds('heartbeat')) {
      await this._setStateCached(relId, this._hbCounter, true);
    }
    for (const relId of this._hbRelIds('lastSeenMs')) {
      await this._setStateCached(relId, this._hbLastSeen || now, true);
    }

    // Keep the online state timestamp fresh for EV chargers as an additional
    // liveness signal. This is still tied to real incoming data; no timer fabricates
    // freshness while communication is down.
    if (this.aliasDeviceClass === 'evCharger' && this._liveAliasRefreshMs > 0) {
      for (const relId of this._hbRelIds('online')) {
        await this._setStateCached(relId, true, true, { refreshAfterMs: this._liveAliasRefreshMs });
      }
    }
  }

  _startHeartbeatChecker() {
    if (this._hbCheckTimer) {
      try { clearInterval(this._hbCheckTimer); } catch (_) {}
      this._hbCheckTimer = null;
    }

    if (!this._hbTimeoutMs || this._hbTimeoutMs <= 0) return;

    this._hbCheckTimer = setInterval(() => {
      try {
        if (!this.started) return;
        const now = Date.now();
        const last = Number(this._hbLastSeen) || 0;
        const age = last > 0 ? (now - last) : Number.POSITIVE_INFINITY;
        const nextOnline = (last > 0) && (age <= this._hbTimeoutMs);
        if (nextOnline !== this._hbOnline) {
          this._setHeartbeatOnline(nextOnline).catch(() => {});
        }
      } catch (_) {
        // ignore
      }
    }, 1000);
  }

  async _ensureChannel(relId, name) {
    await this.adapter.setObjectNotExistsAsync(relId, {
      type: 'channel',
      common: { name: name || relId.split('.').slice(-1)[0] },
      native: {
        deviceId: this.cfg.id,
        templateId: this.cfg.templateId,
        isAliasContainer: true,
      }
    });
  }

  async _ensureAliasPathChannels(stateRelId) {
    // Example: devices.<id>.aliases.ctrl.powerLimitPct
    // Create channels for: devices.<id>.aliases and devices.<id>.aliases.ctrl
    const parts = String(stateRelId).split('.');
    // Find index of "aliases" in the path
    const idx = parts.indexOf('aliases');
    if (idx < 0) return;

    const channels = [];
    // Build incremental channel ids up to the parent of the state
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (p === '') continue;
      const rel = parts.slice(0, i + 1).join('.');
      if (i >= idx) channels.push(rel);
    }

    // Ensure base aliases channel has a friendly name
    for (const ch of channels) {
      const chName = ch.endsWith('.aliases') ? 'Aliases' : ch.split('.').slice(-1)[0];
      await this._ensureChannel(ch, chName);
    }
  }

  _buildAliasDefinitions() {
    const defs = [];
    // Canonical-only source definitions are converted into aliases.v1.* but are
    // deliberately not published below the legacy aliases.* namespace.
    const standardOnlyDefs = [];
    const relIds = new Set();
    const add = (def) => {
      if (!def || !def.relId) return;
      if (relIds.has(def.relId)) {
        // Most generic aliases are added early. A few manufacturer-specific integrations
        // need to replace a generic alias with a safer computed one (for example Alfen
        // meter-only installations where the socket status/control register block is not exposed).
        if (def.replace === true) {
          const idx = defs.findIndex(x => x && x.relId === def.relId);
          if (idx >= 0) defs[idx] = def;
        }
        return;
      }
      relIds.add(def.relId);
      defs.push(def);
    };
    const addStandardSource = (def) => {
      if (!def || !def.relId) return;
      standardOnlyDefs.push(def);
    };

    const cat = (this.template && this.template.category) ? String(this.template.category) : '';
    const chargerCats = new Set(['EVCS', 'EVSE', 'CHARGER', 'DC_CHARGER']);

    const findByIdRe = (re) => this._findFirstDatapoint(dp => re.test(String(dp && dp.id ? dp.id : '')));
    const findByIdOrNameRe = (re) => this._findFirstDatapoint(dp =>
      re.test(String(dp && dp.id ? dp.id : '')) || re.test(String(dp && dp.name ? dp.name : ''))
    );

    const getAnyById = (...ids) => {
      for (const id of ids) {
        const dp = this._getDpById(id);
        if (dp) return dp;
      }
      return null;
    };

    const findById = (id) => this._getDpById(id);

    // --- Always available (communication) ---
    add({
      relId: this._aliasRelId('comm.connected'),
      name: 'Device communication connected',
      role: 'indicator.connected',
      type: 'boolean',
      rw: 'ro',
      kind: 'computed',
      get: (_values, ctx) => !!(ctx && ctx.connected),
    });

    add({
      relId: this._aliasRelId('comm.lastError'),
      name: 'Device communication last error',
      role: 'text',
      type: 'string',
      rw: 'ro',
      kind: 'computed',
      get: (_values, ctx) => (ctx && typeof ctx.lastError === 'string') ? ctx.lastError : '',
    });

    add({
      relId: this._aliasRelId('alarm.offline'),
      name: 'Device offline',
      role: 'indicator.alarm',
      type: 'boolean',
      rw: 'ro',
      kind: 'computed',
      get: (_values, ctx) => !(ctx && ctx.connected),
    });

    // --- Generic role-based aliases (best-effort) ---
    // Only use these for categories where roles are typically reliable and where "first match wins" is acceptable.
    // For meters, chargers, batteries and ESS we create dedicated alias mapping further below.
    const allowGenericRoleAliases = !chargerCats.has(cat) && !['METER', 'BATTERY', 'ESS', 'BATTERY_INVERTER'].includes(cat);

    if (allowGenericRoleAliases) {
      const powerDp = getAnyById('W') || this._findFirstDatapoint(dp => dp.role === 'value.power' && dp.rw !== 'wo');
      if (powerDp) {
        add({
          relId: this._aliasRelId('r.power'),
          name: 'Active power',
          role: 'value.power',
          type: 'number',
          unit: powerDp.unit || 'W',
          rw: 'ro',
          kind: 'dp',
          dpId: powerDp.id,
        });
      }

      const energyDp = getAnyById('WH', 'TotWhOut') || this._findFirstDatapoint(dp => dp.role === 'value.energy' && dp.rw !== 'wo');
      if (energyDp) {
        add({
          relId: this._aliasRelId('r.energyTotal'),
          name: 'Total energy',
          role: 'value.energy',
          type: 'number',
          unit: energyDp.unit || 'Wh',
          rw: 'ro',
          kind: 'dp',
          dpId: energyDp.id,
        });
      }

      const statusDp = getAnyById('Health', 'St') || this._findFirstDatapoint(dp => dp.role === 'indicator.status' && dp.rw !== 'wo');
      if (statusDp) {
        add({
          relId: this._aliasRelId('r.statusCode'),
          name: 'Status code',
          role: 'indicator.status',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: statusDp.id,
        });
      }
    }



    // --- HEAT aliases (heat pumps / heating systems) ---
    // Provide a stable API for heat pumps so that higher-level control adapters can link
    // against consistent alias names even if manufacturers label datapoints differently.
    if (cat === 'HEAT') {
      const asNumber = (v) => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string') {
          const s = v.trim();
          if (s !== '' && !Number.isNaN(Number(s))) return Number(s);
        }
        return undefined;
      };

      // Temperatures (best effort)
      const ambientTempDp = getAnyById(
        'ambient.actualAmbientTemp',
        'ambient.calculatedAmbientTemp',
        'ambient.avgAmbientTemp1h'
      ) || findByIdOrNameRe(/ambient.*temp|outside.*temp|outdoor.*temp|au[ßs]en.*temp/i);

      if (ambientTempDp) {
        add({
          relId: this._aliasRelId('r.ambientTemp'),
          name: 'Ambient temperature',
          role: 'value.temperature',
          type: 'number',
          unit: ambientTempDp.unit || '°C',
          rw: 'ro',
          kind: 'dp',
          dpId: ambientTempDp.id,
        });
      }

      const flowTempDp = getAnyById(
        'hc.flowTemp',
        'hp.sinkLineTemp',
        'buffer.tempHigh'
      ) || findByIdOrNameRe(/flow.*temp|vorlauf.*temp|supply.*temp/i);

      if (flowTempDp) {
        add({
          relId: this._aliasRelId('r.flowTemp'),
          name: 'Flow / supply temperature',
          role: 'value.temperature',
          type: 'number',
          unit: flowTempDp.unit || '°C',
          rw: 'ro',
          kind: 'dp',
          dpId: flowTempDp.id,
        });
      }

      const returnTempDp = getAnyById(
        'hc.returnTemp',
        'hp.sinkReturnLineTemp',
        'buffer.tempLow'
      ) || findByIdOrNameRe(/return.*temp|ruecklauf.*temp|rücklauf.*temp/i);

      if (returnTempDp) {
        add({
          relId: this._aliasRelId('r.returnTemp'),
          name: 'Return temperature',
          role: 'value.temperature',
          type: 'number',
          unit: returnTempDp.unit || '°C',
          rw: 'ro',
          kind: 'dp',
          dpId: returnTempDp.id,
        });
      }

      const roomTempDp = getAnyById('hc.roomTemp') || findByIdOrNameRe(/room.*temp|raum.*temp/i);
      if (roomTempDp) {
        add({
          relId: this._aliasRelId('r.roomTemp'),
          name: 'Room temperature',
          role: 'value.temperature',
          type: 'number',
          unit: roomTempDp.unit || '°C',
          rw: 'ro',
          kind: 'dp',
          dpId: roomTempDp.id,
        });
      }

      const bufferTempDp = getAnyById(
        'buffer.tempHigh',
        'buffer.tempMedium',
        'buffer.tempLow'
      ) || findByIdOrNameRe(/buffer.*temp|puffer.*temp/i);

      if (bufferTempDp) {
        add({
          relId: this._aliasRelId('r.bufferTemp'),
          name: 'Buffer temperature',
          role: 'value.temperature',
          type: 'number',
          unit: bufferTempDp.unit || '°C',
          rw: 'ro',
          kind: 'dp',
          dpId: bufferTempDp.id,
        });
      }

      // Controls (best effort)
      const operatingModeDp = getAnyById('hc.operatingMode') || this._findFirstDatapoint(dp =>
        /operatingMode|betriebsmodus/i.test(String(dp && dp.id ? dp.id : '')) && (dp.rw === 'rw' || dp.rw === 'wo')
      );

      if (operatingModeDp) {
        add({
          relId: this._aliasRelId('ctrl.operatingMode'),
          name: 'Set operating mode',
          role: 'level',
          type: 'number',
          rw: 'rw',
          kind: 'dp',
          dpId: operatingModeDp.id,
          writeDpId: operatingModeDp.id,
        });
      }

      const flowSetpointDp = getAnyById(
        'hc.setFlowTempRequest',
        'hp.requestFlowLineTemp',
        'buffer.requestFlowLineTemp'
      ) || this._findFirstDatapoint(dp =>
        /setFlow|flow.*request|vorlauf.*request/i.test(String(dp && dp.id ? dp.id : '')) && (dp.rw === 'rw' || dp.rw === 'wo')
      );

      if (flowSetpointDp) {
        add({
          relId: this._aliasRelId('ctrl.flowSetpoint'),
          name: 'Set flow/supply setpoint',
          role: 'level.temperature',
          type: 'number',
          unit: flowSetpointDp.unit || '°C',
          rw: 'rw',
          kind: 'dp',
          dpId: flowSetpointDp.id,
          writeDpId: flowSetpointDp.id,
        });
      }

      const roomHeatSpDp = getAnyById('hc.roomSetpointHeating') || this._findFirstDatapoint(dp =>
        /roomSetpointHeating|raum.*heizen/i.test(String(dp && dp.id ? dp.id : '')) && (dp.rw === 'rw' || dp.rw === 'wo')
      );

      if (roomHeatSpDp) {
        add({
          relId: this._aliasRelId('ctrl.roomSetpointHeating'),
          name: 'Set room setpoint (heating)',
          role: 'level.temperature',
          type: 'number',
          unit: roomHeatSpDp.unit || '°C',
          rw: 'rw',
          kind: 'dp',
          dpId: roomHeatSpDp.id,
          writeDpId: roomHeatSpDp.id,
        });
      }

      const roomCoolSpDp = getAnyById('hc.roomSetpointCooling') || this._findFirstDatapoint(dp =>
        /roomSetpointCooling|raum.*kuehlen|raum.*kühlen/i.test(String(dp && dp.id ? dp.id : '')) && (dp.rw === 'rw' || dp.rw === 'wo')
      );

      if (roomCoolSpDp) {
        add({
          relId: this._aliasRelId('ctrl.roomSetpointCooling'),
          name: 'Set room setpoint (cooling)',
          role: 'level.temperature',
          type: 'number',
          unit: roomCoolSpDp.unit || '°C',
          rw: 'rw',
          kind: 'dp',
          dpId: roomCoolSpDp.id,
          writeDpId: roomCoolSpDp.id,
        });
      }

      const heatingCapacityDp = getAnyById('buffer.requestHeatingCapacity') || this._findFirstDatapoint(dp =>
        /heatingCapacity|heizleistung/i.test(String(dp && dp.id ? dp.id : '')) && (dp.rw === 'rw' || dp.rw === 'wo')
      );

      if (heatingCapacityDp) {
        add({
          relId: this._aliasRelId('ctrl.requestHeatingCapacity'),
          name: 'Set requested heating capacity',
          role: 'level.power',
          type: 'number',
          unit: heatingCapacityDp.unit || 'kW',
          rw: 'rw',
          kind: 'dp',
          dpId: heatingCapacityDp.id,
          writeDpId: heatingCapacityDp.id,
        });
      }

      // Optional: feed an external power signal into the heat pump's energy manager module
      const externalPowerDp = getAnyById('emanager.actualPowerInputOrExcess') || this._findFirstDatapoint(dp =>
        /inputOrExcess|excess/i.test(String(dp && dp.id ? dp.id : '')) && (dp.rw === 'rw' || dp.rw === 'wo')
      );

      if (externalPowerDp) {
        add({
          relId: this._aliasRelId('ctrl.externalPower'),
          name: 'Set external power signal (input/excess)',
          role: 'level.power',
          type: 'number',
          unit: externalPowerDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: externalPowerDp.id,
          writeDpId: externalPowerDp.id,
        });
      }

      // Fault alarm: best-effort based on any error number/state datapoints
      const errorDps = this.getDatapoints().filter(dp => dp && dp.id && /error(Number|State)$/i.test(String(dp.id)) && dp.rw !== 'wo');
      if (errorDps.length) {
        add({
          relId: this._aliasRelId('alarm.fault'),
          name: 'Device fault',
          role: 'indicator.alarm',
          type: 'boolean',
          rw: 'ro',
          kind: 'computed',
          get: (values) => {
            for (const dp of errorDps) {
              const v = values[dp.id];
              const n = asNumber(v);
              if (n === undefined) continue;
              if (/errorState$/i.test(String(dp.id))) {
                if (n >= 4) return true;
              } else if (n !== 0) {
                return true;
              }
            }
            return false;
          },
        });
      }
    }
    // --- IO aliases (digital inputs/outputs/counters) ---
    // Provide a stable API for I/O components so that other adapters can link against
    // consistent alias names even if manufacturers label channels differently.
    //
    // Aliases created:
    //  - devices.<id>.aliases.r.inputs.in0..inN
    //  - devices.<id>.aliases.r.outputs.out0..outN
    //  - devices.<id>.aliases.ctrl.outputs.out0..outN (write)
    //  - devices.<id>.aliases.r.counters.count0..countN (optional)
    if (cat === 'IO') {
      const boolFrom = (v) => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v !== 0;
        if (typeof v === 'string') {
          const s = v.trim().toLowerCase();
          if (s === 'true' || s === 'on' || s === '1') return true;
          if (s === 'false' || s === 'off' || s === '0') return false;
        }
        return undefined;
      };

      const boolTo = (v) => {
        const b = boolFrom(v);
        if (b === undefined) return false;
        return b;
      };

      const inputs = [];
      const outputs = [];
      const counters = [];

      const dps = this.getDatapoints();
      for (const dp of dps) {
        if (!dp || !dp.id) continue;
        const id = String(dp.id);

        // Input patterns (0-based preferred)
        let m = id.match(/^(?:Input|IN|input|in)[_ ]?(\d+)$/i) || id.match(/^(?:DI|Din)[_ ]?(\d+)$/i);
        if (m && (dp.type === 'boolean' || dp.type === 'bool')) {
          const idx = Number(m[1]);
          if (Number.isFinite(idx)) inputs.push({ idx, dp });
          continue;
        }

        // Output patterns
        m = id.match(/^(?:Output|OUT|output|out)[_ ]?(\d+)$/i) || id.match(/^(?:DO|Dout)[_ ]?(\d+)$/i);
        if (m && (dp.type === 'boolean' || dp.type === 'bool')) {
          const idx = Number(m[1]);
          if (Number.isFinite(idx)) outputs.push({ idx, dp });
          continue;
        }

        // Relay patterns: rELAY_1..rELAY_N (1-based -> map to 0-based)
        m = id.match(/^rELAY_(\d+)$/i);
        if (m && (dp.type === 'boolean' || dp.type === 'bool')) {
          const idx = Number(m[1]);
          if (Number.isFinite(idx) && idx > 0) outputs.push({ idx: idx - 1, dp });
          continue;
        }

        // Counter patterns
        m = id.match(/^Counter[_ ]?(\d+)$/i) || id.match(/^counter[_ ]?(\d+)$/i);
        if (m && (dp.type === 'number' || dp.type === 'string')) {
          const idx = Number(m[1]);
          if (Number.isFinite(idx)) counters.push({ idx, dp });
          continue;
        }
      }

      inputs.sort((a, b) => a.idx - b.idx);
      outputs.sort((a, b) => a.idx - b.idx);
      counters.sort((a, b) => a.idx - b.idx);

      for (const it of inputs) {
        add({
          relId: this._aliasRelId(`r.inputs.in${it.idx}`),
          name: `Digital input ${it.idx}`,
          role: 'sensor',
          type: 'boolean',
          rw: 'ro',
          kind: 'dp',
          dpId: it.dp.id,
          fromDevice: boolFrom,
        });
      }

      for (const it of outputs) {
        // readback
        add({
          relId: this._aliasRelId(`r.outputs.out${it.idx}`),
          name: `Digital output ${it.idx}`,
          role: 'switch',
          type: 'boolean',
          rw: 'ro',
          kind: 'dp',
          dpId: it.dp.id,
          fromDevice: boolFrom,
        });

        // control
        if (it.dp.rw === 'rw' || it.dp.rw === 'wo') {
          add({
            relId: this._aliasRelId(`ctrl.outputs.out${it.idx}`),
            name: `Set digital output ${it.idx}`,
            role: 'switch',
            type: 'boolean',
            rw: 'rw',
            kind: 'dp',
            dpId: it.dp.id,
            writeDpId: it.dp.id,
            toDevice: boolTo,
            fromDevice: boolFrom,
          });
        }
      }

      for (const it of counters) {
        add({
          relId: this._aliasRelId(`r.counters.count${it.idx}`),
          name: `Counter ${it.idx}`,
          role: 'value',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: it.dp.id,
        });
      }
    }

    // --- PV inverter specific controls & alarms ---
    if (cat === 'PV_INVERTER') {
      // grid state (raw)
      const gridStateDp = getAnyById('PVConn', 'PvGriConn', 'GriSwStt');
      if (gridStateDp) {
        add({
          relId: this._aliasRelId('r.gridConnectionState'),
          name: 'Grid connection state (raw)',
          role: 'indicator',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: gridStateDp.id,
        });
      }

      // grid connected (boolean) - computed from known SMA codes where possible
      add({
        relId: this._aliasRelId('r.gridConnected'),
        name: 'Grid connected',
        role: 'indicator.connected',
        type: 'boolean',
        rw: 'ro',
        kind: 'computed',
        get: (values) => {
          if (!values) return undefined;
          if (typeof values.PvGriConn === 'number') return values.PvGriConn === 1780;
          if (typeof values.GriSwStt === 'number') return values.GriSwStt === 51;
          if (typeof values.PVConn === 'number') return values.PVConn !== 0;
          return undefined;
        }
      });

      // power limit percent setpoint
      const limitPctDp = getAnyById('WMaxLimPct', 'WLimPct') || this._findFirstDatapoint(dp =>
        (dp.unit === '%' || dp.unit === ' %' || dp.unit === '% ') &&
        (dp.rw === 'rw' || dp.rw === 'wo') &&
        /lim/i.test(String(dp.id))
      );
      if (limitPctDp) {
        add({
          relId: this._aliasRelId('ctrl.powerLimitPct'),
          name: 'Active power limit (%)',
          role: 'level',
          type: 'number',
          unit: '%',
          // Expose as read+write even if the underlying register is write-only.
          // In that case we keep the last commanded value until the device provides a readable feedback register.
          rw: 'rw',
          kind: 'dp',
          dpId: limitPctDp.id,
          // allow writes through the alias even if the underlying datapoint is write-only
          writeDpId: limitPctDp.id,
        });
      }

      // power limit enable
      const limitEnaDp = getAnyById('WMaxLim_Ena') || this._findFirstDatapoint(dp =>
        (dp.type === 'boolean') &&
        (dp.rw === 'rw') &&
        /lim/i.test(String(dp.id)) &&
        /ena/i.test(String(dp.id))
      );
      if (limitEnaDp) {
        add({
          relId: this._aliasRelId('ctrl.powerLimitEnable'),
          name: 'Active power limit enable',
          role: 'switch',
          type: 'boolean',
          rw: 'rw',
          kind: 'dp',
          dpId: limitEnaDp.id,
          writeDpId: limitEnaDp.id,
        });
      }

      // run/stop command
      // Preference order:
      //  1) boolean "Conn" (true/false)
      //  2) "FstStop" (fast shut-down command, often Start=1467 / Stop=381)
      //  3) "OpMod" (operating mode codes)
      const connDp = getAnyById('Conn');
      const fstStopDp = getAnyById('FstStop');
      const opModDp = getAnyById('OpMod');
      let runAliasAdded = false;
      if (connDp && (connDp.rw === 'rw' || connDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.run'),
          name: 'Run (connect/start)',
          role: 'switch',
          type: 'boolean',
          rw: 'rw',
          kind: 'dp',
          dpId: connDp.id,
          writeDpId: connDp.id,
          toDevice: (v) => !!v,
          fromDevice: (v) => !!v,
        });
        runAliasAdded = true;
      } else if (fstStopDp && (fstStopDp.rw === 'rw' || fstStopDp.rw === 'wo')) {
        // Some SMA devices expose a "Fast shut-down" command that doubles as start/stop control.
        // Typical codes:
        //  - 1467: Start
        //  - 381 : Stop
        //  - 1749: Full stop
        add({
          relId: this._aliasRelId('ctrl.run'),
          name: 'Run (start/stop)',
          role: 'switch',
          type: 'boolean',
          rw: 'rw',
          kind: 'dp',
          dpId: fstStopDp.id,
          writeDpId: fstStopDp.id,
          toDevice: (v) => (v ? 1467 : 381),
          fromDevice: (v) => {
            if (v === 1467) return true;
            if (v === 381 || v === 1749) return false;
            return undefined;
          }
        });
        runAliasAdded = true;
      } else if (opModDp && (opModDp.rw === 'rw' || opModDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.run'),
          name: 'Run (start/stop)',
          role: 'switch',
          type: 'boolean',
          rw: 'rw',
          kind: 'dp',
          dpId: opModDp.id,
          writeDpId: opModDp.id,
          toDevice: (v) => (v ? 1467 : 381),
          fromDevice: (v) => {
            if (v === 1467) return true;
            if (v === 381) return false;
            return undefined;
          }
        });
        runAliasAdded = true;
      }

      // Vendor specific ON/OFF command register (e.g., SolaX X3-MEGA/X3-FORTH: 0xAF=start, 0xAE=stop)
      if (!runAliasAdded) {
        const cmdOnOffDp = getAnyById('CmdOnOff', 'CMD_ON_OFF', 'COMMAND_ON_OFF');
        if (cmdOnOffDp && (cmdOnOffDp.rw === 'rw' || cmdOnOffDp.rw === 'wo')) {
          const onValueRaw = Number(cmdOnOffDp.onValue ?? cmdOnOffDp.trueValue ?? 0xAF);
          const offValueRaw = Number(cmdOnOffDp.offValue ?? cmdOnOffDp.falseValue ?? 0xAE);
          const onValue = Number.isFinite(onValueRaw) ? onValueRaw : 0xAF;
          const offValue = Number.isFinite(offValueRaw) ? offValueRaw : 0xAE;
          add({
            relId: this._aliasRelId('ctrl.run'),
            name: 'Run (start/stop)',
            role: 'switch',
            type: 'boolean',
            rw: 'rw',
            kind: 'dp',
            dpId: cmdOnOffDp.id,
            writeDpId: cmdOnOffDp.id,
            toDevice: (v) => (v ? onValue : offValue),
            fromDevice: (v) => {
              const n = Number(v);
              if (!Number.isFinite(n)) return undefined;
              if (n === onValue) return true;
              if (n === offValue) return false;
              return undefined;
            }
          });
        }
      }

      // alarm.fault / alarm.warning (best-effort)
      add({
        relId: this._aliasRelId('alarm.fault'),
        name: 'Fault active',
        role: 'indicator.alarm',
        type: 'boolean',
        rw: 'ro',
        kind: 'computed',
        get: (values) => {
          // Offline should not automatically equal "fault"; keep separate.
          if (!values) return false;
          let fault = false;
          if (typeof values.Health === 'number') fault = fault || (values.Health === 35);
          if (typeof values.St === 'number') fault = fault || (values.St === 7);
          if (typeof values.Evt1 === 'number') fault = fault || (values.Evt1 !== 0);
          return fault;
        }
      });

      add({
        relId: this._aliasRelId('alarm.warning'),
        name: 'Warning active',
        role: 'indicator.alarm',
        type: 'boolean',
        rw: 'ro',
        kind: 'computed',
        get: (values) => {
          if (!values) return false;
          if (typeof values.Health === 'number') return values.Health === 455;
          return false;
        }
      });
    }

    // --- Battery / ESS aliases (BATTERY, ESS, BATTERY_INVERTER) ---
    // These categories often use vendor-specific datapoint IDs and generic ioBroker roles are not reliable.
    // We therefore derive a stable alias API primarily from datapoint IDs (best-effort).
    const batteryCats = new Set(['BATTERY', 'ESS', 'BATTERY_INVERTER']);
    if (batteryCats.has(cat) && !getVartaProfile(this.template) && !getDeyeProfile(this.template)) {
      const asNumber = (v) => (typeof v === 'number' && Number.isFinite(v)) ? v : undefined;
      const asBool01 = (v) => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'number') return v !== 0;
        return undefined;
      };

      // --- Core read signals ---
      // SoC is a common pain point: some devices expose multiple SoC datapoints where one may be stale
      // or return sentinel values (e.g. 0xFFFF). Therefore we pick the first *valid* SoC at runtime.
      const socCandidateDps = [];
      const pushSoc = (dp) => {
        if (!dp || !dp.id) return;
        if (socCandidateDps.find(x => x.id === dp.id)) return;
        socCandidateDps.push(dp);
      };

      // Prefer "instant" SoC inputs if available (e.g. *_SOC_IN)
      [
        'eSS_SOC_IN',
        'bATTERY_SOC_IN',
        'sOC_IN',
        'bATTERY_SOC',
        'bATTERY_TOTAL_SOC',
        'sOC',
      ].forEach((id) => pushSoc(findById(id)));

      // Regex fallbacks (best-effort)
      pushSoc(findByIdRe(/(^|_)soc_in($|_)/i));
      pushSoc(findByIdRe(/(^|_)soc($|_)/i));
      if (!socCandidateDps.length) {
        pushSoc(this._findFirstDatapoint(dp => /soc/i.test(String(dp.id || ''))));
      }

      if (socCandidateDps.length) {
        add({
          relId: this._aliasRelId('r.soc'),
          name: 'State of charge',
          role: 'value.battery',
          type: 'number',
          unit: socCandidateDps[0].unit || '%',
          rw: 'ro',
          kind: 'computed',
          get: (values) => {
            for (const dp of socCandidateDps) {
              const n = asNumber(values[dp.id]);
              if (n === undefined) continue;

              // Standard percent
              if (n >= 0 && n <= 100) return n;

              // Some devices report SoC as 0..1 fraction
              if (n >= 0 && n <= 1) return Math.round(n * 10000) / 100;
            }
            return null;
          },
        });
      }

      const sohDp =
        getAnyById('sOH') ||
        findByIdRe(/(^|_)soh($|_)/i) ||
        this._findFirstDatapoint(dp => /soh/i.test(String(dp.id || '')));

      if (sohDp) {
        add({
          relId: this._aliasRelId('r.soh'),
          name: 'State of health',
          role: 'value',
          type: 'number',
          unit: sohDp.unit || '%',
          rw: 'ro',
          kind: 'dp',
          dpId: sohDp.id,
        });
      }

      const battVoltDp =
        getAnyById('bATTERY_VOLTAGE', 'dC_BATTERY_VOLTAGE', 'vOLTAGE', 'lINK_VOLTAGE', 'iNTERNAL_VOLTAGE') ||
        this._findFirstDatapoint(dp => /battery_.*voltage/i.test(String(dp.id || ''))) ||
        this._findFirstDatapoint(dp => /voltage/i.test(String(dp.id || '')) && !/grid_/i.test(String(dp.id || '')));

      if (battVoltDp) {
        add({
          relId: this._aliasRelId('r.voltage'),
          name: 'Battery voltage',
          role: 'value.voltage',
          type: 'number',
          unit: battVoltDp.unit || 'V',
          rw: 'ro',
          kind: 'dp',
          dpId: battVoltDp.id,
        });
      }

      const battCurrDp =
        getAnyById('bATTERY_CURRENT', 'dC_BATTERY_CURRENT', 'cURRENT') ||
        this._findFirstDatapoint(dp => /battery_.*current/i.test(String(dp.id || ''))) ||
        this._findFirstDatapoint(dp => /current/i.test(String(dp.id || '')) && !/input_/i.test(String(dp.id || '')) && !/output_/i.test(String(dp.id || '')));

      if (battCurrDp) {
        add({
          relId: this._aliasRelId('r.current'),
          name: 'Battery current',
          role: 'value.current',
          type: 'number',
          unit: battCurrDp.unit || 'A',
          rw: 'ro',
          kind: 'dp',
          dpId: battCurrDp.id,
        });
      }

      const battTempDp =
        getAnyById('bATTERY_TEMPERATURE', 'aVG_BATTERY_TEMPERATURE') ||
        this._findFirstDatapoint(dp => /^bATTERY_.*tEMPERATURE$/i.test(String(dp.id || ''))) ||
        this._findFirstDatapoint(dp => /battery_.*temperature/i.test(String(dp.id || '')));

      if (battTempDp) {
        add({
          relId: this._aliasRelId('r.temperature'),
          name: 'Battery temperature',
          role: 'value.temperature',
          type: 'number',
          unit: battTempDp.unit || '°C',
          rw: 'ro',
          kind: 'dp',
          dpId: battTempDp.id,
        });
      }

      // --- Power (W): prefer explicit charge/discharge power, else measured net power, else compute from V*I ---
      const chargePowerDp = getAnyById('bATTERY_CHARGE_POWER');
      const dischargePowerDp = getAnyById('bATTERY_DISCHARGE_POWER');
      const isFeneconHomeEss =
        String(this.template?.manufacturer || '').toUpperCase() === 'FENECON' &&
        String(this.template?.model || '').toLowerCase() === 'home.ess';
      const feneconHybridPowerDp = isFeneconHomeEss ? getAnyById('bATTERY_POWER') : undefined;
      const feneconAcPowerDp = isFeneconHomeEss ? getAnyById('bATTERY_AC_POWER') : undefined;
      const feneconCalcPowerDp = isFeneconHomeEss ? getAnyById('eSS0_ACTIVE_POWER') : undefined;
      const activePowerDp =
        feneconAcPowerDp ||
        feneconCalcPowerDp ||
        getAnyById('bATTERY_POWER', 'aCTIVE_POWER', 'eSS0_ACTIVE_POWER') ||
        this._findFirstDatapoint(dp => /^bATTERY_.*pOWER$/i.test(String(dp.id || '')) && dp.rw !== 'wo') ||
        this._findFirstDatapoint(dp => /^aCTIVE_POWER$/i.test(String(dp.id || '')) && dp.rw !== 'wo');

      // Some SMA batteries provide separate charge/discharge currents (unsigned). Use these when present.
      const chargeCurrentDp = getAnyById('cUR_BAT_CHA');
      const dischargeCurrentDp = getAnyById('cUR_BAT_DSCH');

      // Per-phase active power (common in ESS/battery inverter)
      const pL1 = getAnyById('aCTIVE_POWER_L1');
      const pL2 = getAnyById('aCTIVE_POWER_L2');
      const pL3 = getAnyById('aCTIVE_POWER_L3');

      // Hybrid/ESS signals
      const pvPowerDp =
        getAnyById('pV_POWER', 'pV_POWER_SUM') ||
        this._findFirstDatapoint(dp => /^pV_.*pOWER/i.test(String(dp.id || '')) && dp.rw !== 'wo') ||
        this._findFirstDatapoint(dp => /pv.*power/i.test(String(dp.id || '')) && dp.rw !== 'wo');

      const powerUnit =
        (feneconAcPowerDp && feneconAcPowerDp.unit) ||
        (chargePowerDp && chargePowerDp.unit) ||
        (dischargePowerDp && dischargePowerDp.unit) ||
        (activePowerDp && activePowerDp.unit) ||
        (pL1 && pL1.unit) ||
        (pL2 && pL2.unit) ||
        (pL3 && pL3.unit) ||
        'W';

      const hybridPowerUnit =
        (feneconHybridPowerDp && feneconHybridPowerDp.unit) ||
        powerUnit ||
        'W';

      const getAbsPowerValue = (dp, values) => {
        if (!dp || !values) return undefined;
        const v = asNumber(values[dp.id]);
        if (v === undefined) return undefined;
        return Math.abs(v);
      };

      const computeFeneconHomeEssAcPowerW = (values) => {
        if (!isFeneconHomeEss || !values || !feneconAcPowerDp) return undefined;

        const measured = asNumber(values[feneconAcPowerDp.id]);
        if (measured === undefined) return undefined;

        // _sum/EssDischargePower is the real AC-side storage power. If its sign is not
        // explicitly available, harmonize it with ess0/ActivePower (same charge/discharge convention).
        if (measured < 0) return measured;

        const signRef = feneconCalcPowerDp ? asNumber(values[feneconCalcPowerDp.id]) : undefined;
        if (signRef !== undefined && signRef < 0) return -Math.abs(measured);

        return measured;
      };

      const computeFeneconHomeEssHybridPowerW = (values) => {
        if (!isFeneconHomeEss || !values || !feneconHybridPowerDp) return undefined;
        const v = asNumber(values[feneconHybridPowerDp.id]);
        return v === undefined ? undefined : v;
      };

      const computeBatteryAcPowerWFallback = (values) => {
        if (!values) return undefined;

        const feneconAcPower = computeFeneconHomeEssAcPowerW(values);
        if (feneconAcPower !== undefined) return feneconAcPower;

        // Prefer explicit measured net power datapoint
        if (activePowerDp) {
          const v = asNumber(values[activePowerDp.id]);
          if (v !== undefined) return v;
        }

        // Sum per-phase active powers if present
        const v1 = pL1 ? asNumber(values[pL1.id]) : undefined;
        const v2 = pL2 ? asNumber(values[pL2.id]) : undefined;
        const v3 = pL3 ? asNumber(values[pL3.id]) : undefined;
        if (v1 !== undefined || v2 !== undefined || v3 !== undefined) return (v1 || 0) + (v2 || 0) + (v3 || 0);

        // If we have separate charge/discharge currents and a battery voltage, compute net power.
        if (battVoltDp && (chargeCurrentDp || dischargeCurrentDp)) {
          const u = asNumber(values[battVoltDp.id]);
          const icha = chargeCurrentDp ? asNumber(values[chargeCurrentDp.id]) : undefined;
          const idsch = dischargeCurrentDp ? asNumber(values[dischargeCurrentDp.id]) : undefined;
          if (u !== undefined && (icha !== undefined || idsch !== undefined)) {
            const pCharge = (icha || 0) * u;
            const pDischarge = (idsch || 0) * u;
            // Convention: discharge positive, charge negative
            return pDischarge - pCharge;
          }
        }

        // Fallback: compute from signed battery current * voltage
        if (battVoltDp && battCurrDp) {
          const u = asNumber(values[battVoltDp.id]);
          const i = asNumber(values[battCurrDp.id]);
          if (u !== undefined && i !== undefined) return u * i;
        }

        return undefined;
      };

      const computeBatteryAcSplitPower = (values) => {
        if (!values) return { charge: undefined, discharge: undefined };

        if (isFeneconHomeEss) {
          const feneconAcPower = computeFeneconHomeEssAcPowerW(values);
          if (feneconAcPower !== undefined) {
            return {
              charge: feneconAcPower < 0 ? Math.abs(feneconAcPower) : 0,
              discharge: feneconAcPower > 0 ? feneconAcPower : 0,
            };
          }
        }

        // Prefer explicit charge/discharge datapoints when present.
        const pCharge = getAbsPowerValue(chargePowerDp, values);
        const pDischarge = getAbsPowerValue(dischargePowerDp, values);
        if (pCharge !== undefined || pDischarge !== undefined) {
          return {
            charge: pCharge !== undefined ? pCharge : 0,
            discharge: pDischarge !== undefined ? pDischarge : 0,
          };
        }

        const p = computeBatteryAcPowerWFallback(values);
        if (p === undefined) return { charge: undefined, discharge: undefined };
        return {
          charge: p < 0 ? Math.abs(p) : 0,
          discharge: p > 0 ? p : 0,
        };
      };

      const computeBatteryAcPowerW = (values) => {
        const split = computeBatteryAcSplitPower(values);
        if (split.charge === undefined && split.discharge === undefined) return undefined;
        return (split.discharge || 0) - (split.charge || 0);
      };

      if (isFeneconHomeEss) {
        add({
          relId: this._aliasRelId('r.powerAc'),
          name: 'Battery power (AC-side, real)',
          role: 'value.power',
          type: 'number',
          unit: powerUnit || 'W',
          rw: 'ro',
          kind: 'computed',
          get: (values) => computeBatteryAcPowerW(values),
        });

        add({
          relId: this._aliasRelId('r.powerBalance'),
          name: 'Battery power (hybrid incl. DC surplus, signed)',
          role: 'value.power',
          type: 'number',
          unit: hybridPowerUnit || 'W',
          rw: 'ro',
          kind: 'computed',
          get: (values) => computeFeneconHomeEssHybridPowerW(values),
        });
      }

      add({
        relId: this._aliasRelId('r.power'),
        name: 'Battery power (net)',
        role: 'value.power',
        type: 'number',
        unit: powerUnit || 'W',
        rw: 'ro',
        kind: 'computed',
        get: (values) => computeBatteryAcPowerW(values),
      });

      // Split into charge/discharge power (absolute)
      add({
        relId: this._aliasRelId('r.powerCharge'),
        name: 'Battery charge power',
        role: 'value.power',
        type: 'number',
        unit: powerUnit || 'W',
        rw: 'ro',
        kind: 'computed',
        get: (values) => computeBatteryAcSplitPower(values).charge,
      });

      add({
        relId: this._aliasRelId('r.powerDischarge'),
        name: 'Battery discharge power',
        role: 'value.power',
        type: 'number',
        unit: powerUnit || 'W',
        rw: 'ro',
        kind: 'computed',
        get: (values) => computeBatteryAcSplitPower(values).discharge,
      });

      if (pvPowerDp) {
        add({
          relId: this._aliasRelId('r.pvPower'),
          name: 'PV power',
          role: 'value.power',
          type: 'number',
          unit: pvPowerDp.unit || 'W',
          rw: 'ro',
          kind: 'dp',
          dpId: pvPowerDp.id,
        });
      }

      // --- Energy counters (Wh) ---
      const chargeEnergyDp =
        getAnyById('aCTIVE_CHARGE_ENERGY', 'dC_CHARGED_ENERGY', 'dC_CHARGE_ENERGY', 'aCT_BAT_CHRG') ||
        this._findFirstDatapoint(dp => /charge.*energy/i.test(String(dp.id || '')) && !/parameter/i.test(String(dp.id || '')));

      const dischargeEnergyDp =
        getAnyById('aCTIVE_DISCHARGE_ENERGY', 'dC_DISCHARGED_ENERGY', 'dC_DISCHARGE_ENERGY', 'aCT_BAT_DSCH') ||
        this._findFirstDatapoint(dp => /discharge.*energy/i.test(String(dp.id || '')) && !/parameter/i.test(String(dp.id || '')));

      const safeU64ToNumber = (raw) => {
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        if (typeof raw === 'string') {
          const n = Number(raw);
          if (Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER) return n;
        }
        return undefined;
      };

      if (chargeEnergyDp) {
        add({
          relId: this._aliasRelId('r.energyCharge'),
          name: 'Charge energy (total)',
          role: 'value.energy',
          type: 'number',
          unit: chargeEnergyDp.unit || 'Wh',
          rw: 'ro',
          kind: 'dp',
          dpId: chargeEnergyDp.id,
          fromDevice: (v) => safeU64ToNumber(v),
        });
      }

      if (dischargeEnergyDp) {
        add({
          relId: this._aliasRelId('r.energyDischarge'),
          name: 'Discharge energy (total)',
          role: 'value.energy',
          type: 'number',
          unit: dischargeEnergyDp.unit || 'Wh',
          rw: 'ro',
          kind: 'dp',
          dpId: dischargeEnergyDp.id,
          fromDevice: (v) => safeU64ToNumber(v),
        });
      }

      // --- BMS allow charge/discharge (read) ---
      const allowChargeDp = getAnyById('bP_CHARGE_BMS', 'vE_BUS_BMS_ALLOW_BATTERY_CHARGE');
      if (allowChargeDp) {
        add({
          relId: this._aliasRelId('r.allowCharge'),
          name: 'BMS allows charge',
          role: 'indicator',
          type: 'boolean',
          rw: 'ro',
          kind: 'dp',
          dpId: allowChargeDp.id,
          fromDevice: (v) => asBool01(v),
        });
      }

      const allowDischargeDp = getAnyById('bP_DISCHARGE_BMS', 'vE_BUS_BMS_ALLOW_BATTERY_DISCHARGE');
      if (allowDischargeDp) {
        add({
          relId: this._aliasRelId('r.allowDischarge'),
          name: 'BMS allows discharge',
          role: 'indicator',
          type: 'boolean',
          rw: 'ro',
          kind: 'dp',
          dpId: allowDischargeDp.id,
          fromDevice: (v) => asBool01(v),
        });
      }

      // --- Allowed charge/discharge power (W) ---
      const allowedChargePowerDp = getAnyById('aLLOWED_CHARGE_POWER', 'oRIGINAL_ALLOWED_CHARGE_POWER');
      if (allowedChargePowerDp) {
        add({
          relId: this._aliasRelId('r.allowedChargePower'),
          name: 'Allowed charge power',
          role: 'value.power',
          type: 'number',
          unit: allowedChargePowerDp.unit || 'W',
          rw: 'ro',
          kind: 'dp',
          dpId: allowedChargePowerDp.id,
        });
      }

      const allowedDischargePowerDp = getAnyById('aLLOWED_DISCHARGE_POWER', 'oRIGINAL_ALLOWED_DISCHARGE_POWER', 'eSS_MAX_DISCHARGE_POWER');
      if (allowedDischargePowerDp) {
        add({
          relId: this._aliasRelId('r.allowedDischargePower'),
          name: 'Allowed discharge power',
          role: 'value.power',
          type: 'number',
          unit: allowedDischargePowerDp.unit || 'W',
          rw: 'ro',
          kind: 'dp',
          dpId: allowedDischargePowerDp.id,
        });
      }

      // --- Control: active power setpoint (W) ---
      const setActivePowerDp =
        getAnyById('sET_ACTIVE_POWER') ||
        this._findFirstDatapoint(dp => /^sET_ACTIVE_POWER$/i.test(String(dp.id || '')) && (dp.rw === 'rw' || dp.rw === 'wo')) ||
        this._findFirstDatapoint(dp => /^sET_ACTIVE_POWER(_6_\d+)?$/i.test(String(dp.id || '')) && (dp.rw === 'rw' || dp.rw === 'wo'));

      if (setActivePowerDp) {
        add({
          relId: this._aliasRelId('ctrl.powerSetpointW'),
          name: 'Active power setpoint (battery/ESS)',
          role: 'level.power',
          type: 'number',
          unit: setActivePowerDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: setActivePowerDp.id,
          writeDpId: setActivePowerDp.id,
        });

        // Convenience aliases: split-direction power setpoints.
        // Standard: charge power is written as positive value and mapped to a NEGATIVE setpoint,
        // discharge power is written as positive value and mapped to a POSITIVE setpoint.
        // This is especially useful for devices like SolaX where one register controls both directions.
        add({
          relId: this._aliasRelId('ctrl.chargePowerW'),
          name: 'Charge power setpoint',
          role: 'level.power',
          type: 'number',
          unit: setActivePowerDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: setActivePowerDp.id,
          writeDpId: setActivePowerDp.id,
          toDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return v;
            return -Math.abs(n);
          },
          fromDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return undefined;
            return n < 0 ? Math.abs(n) : 0;
          }
        });

        add({
          relId: this._aliasRelId('ctrl.dischargePowerW'),
          name: 'Discharge power setpoint',
          role: 'level.power',
          type: 'number',
          unit: setActivePowerDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: setActivePowerDp.id,
          writeDpId: setActivePowerDp.id,
          toDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return v;
            return Math.abs(n);
          },
          fromDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return undefined;
            return n > 0 ? Math.abs(n) : 0;
          }
        });
      }


      // --- Control: PV power limit/target (W) (optional, mainly for hybrid ESS that support PV curtailment) ---
      const setPvPowerDp =
        getAnyById('sET_PV_POWER', 'sET_PV_ACTIVE_POWER', 'pV_W_TARGET', 'pV_POWER_TARGET') ||
        this._findFirstDatapoint(dp =>
          (dp.rw === 'rw' || dp.rw === 'wo') &&
          /^sET_?pV_?.*pOWER/i.test(String(dp.id || ''))
        );

      if (setPvPowerDp) {
        add({
          relId: this._aliasRelId('ctrl.pvPowerLimitW'),
          name: 'PV power limit/target',
          role: 'level.power',
          type: 'number',
          unit: setPvPowerDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: setPvPowerDp.id,
          writeDpId: setPvPowerDp.id,
        });
      }


      // --- Control: max charge/discharge power limits (optional) ---
      const maxDischargePowerDp =
        getAnyById('sET_MAX_DISCHARGE_POWER', 'sET_MAX_DISCHARGE_POWER_W', 'sET_MAX_DISCHARGE', 'sET_DISCHARGE_LIMIT') ||
        this._findFirstDatapoint(dp =>
          (dp.rw === 'rw' || dp.rw === 'wo') &&
          /(max|limit).*(discharge|dsch|entlad).*power/i.test(String(dp.id || ''))
        );

      if (maxDischargePowerDp) {
        add({
          relId: this._aliasRelId('ctrl.maxDischargePowerW'),
          name: 'Max discharge power limit',
          role: 'level.power',
          type: 'number',
          unit: maxDischargePowerDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: maxDischargePowerDp.id,
          writeDpId: maxDischargePowerDp.id,
          toDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return v;
            return Math.abs(n);
          },
          fromDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return undefined;
            return Math.abs(n);
          }
        });
      }

      const maxChargePowerDp =
        getAnyById('sET_MAX_CHARGE_POWER', 'sET_MAX_CHARGE_POWER_W', 'sET_MAX_CHARGE', 'sET_CHARGE_LIMIT') ||
        this._findFirstDatapoint(dp =>
          (dp.rw === 'rw' || dp.rw === 'wo') &&
          /(max|limit).*(charge|cha|belad).*power/i.test(String(dp.id || ''))
        );

      if (maxChargePowerDp) {
        add({
          relId: this._aliasRelId('ctrl.maxChargePowerW'),
          name: 'Max charge power limit',
          role: 'level.power',
          type: 'number',
          unit: maxChargePowerDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: maxChargePowerDp.id,
          writeDpId: maxChargePowerDp.id,
          toDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return v;
            return Math.abs(n);
          },
          fromDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return undefined;
            return Math.abs(n);
          }
        });
      }

      // Per-phase setpoints (if available)
      const setPL1 = getAnyById('sET_ACTIVE_POWER_L1');
      const setPL2 = getAnyById('sET_ACTIVE_POWER_L2');
      const setPL3 = getAnyById('sET_ACTIVE_POWER_L3');
      if (setPL1 && (setPL1.rw === 'rw' || setPL1.rw === 'wo')) add({ relId: this._aliasRelId('ctrl.powerSetpointL1'), name: 'Active power setpoint L1', role: 'level.power', type: 'number', unit: setPL1.unit || 'W', rw: 'rw', kind: 'dp', dpId: setPL1.id, writeDpId: setPL1.id });
      if (setPL2 && (setPL2.rw === 'rw' || setPL2.rw === 'wo')) add({ relId: this._aliasRelId('ctrl.powerSetpointL2'), name: 'Active power setpoint L2', role: 'level.power', type: 'number', unit: setPL2.unit || 'W', rw: 'rw', kind: 'dp', dpId: setPL2.id, writeDpId: setPL2.id });
      if (setPL3 && (setPL3.rw === 'rw' || setPL3.rw === 'wo')) add({ relId: this._aliasRelId('ctrl.powerSetpointL3'), name: 'Active power setpoint L3', role: 'level.power', type: 'number', unit: setPL3.unit || 'W', rw: 'rw', kind: 'dp', dpId: setPL3.id, writeDpId: setPL3.id });

      // Control: control mode (vendor-specific but stable location)
      const controlModeDp = getAnyById('sET_CONTROL_MODE');
      if (controlModeDp && (controlModeDp.rw === 'rw' || controlModeDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.controlMode'),
          name: 'Control mode',
          role: 'level',
          type: 'number',
          rw: 'rw',
          kind: 'dp',
          dpId: controlModeDp.id,
          writeDpId: controlModeDp.id,
        });
      }


      // Control: start/stop (hybrid inverters / energy systems that expose a boolean Conn datapoint)
      const essConnDp = getAnyById('Conn');
      if (essConnDp && (essConnDp.rw === 'rw' || essConnDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.run'),
          name: 'Run (start/stop)',
          role: 'switch',
          type: 'boolean',
          rw: 'rw',
          kind: 'dp',
          dpId: essConnDp.id,
          writeDpId: essConnDp.id,
          toDevice: (v) => !!v,
          fromDevice: (v) => {
            if (typeof v === 'boolean') return v;
            const n = Number(v);
            if (!Number.isFinite(n)) return undefined;
            if (n === 0xCF || n === 1) return true;
            if (n === 0xCE || n === 0) return false;
            return undefined;
          }
        });
      }

      // --- Grid / NAP power & setpoints (Energy Managers / Hybrid systems) ---
      // Some systems (e.g., TESVOLT Energy Manager Vermarkter-Schnittstelle) expose the grid connection point as "NAP".
      // We provide a stable read alias for the current grid/NAP power and a stable write alias for the grid/NAP setpoint.
      const gridPowerDp =
        getAnyById('gRID_POWER', 'nAP_POWER') ||
        this._findFirstDatapoint(dp => /(^|_)(grid|nap).*power/i.test(String(dp.id || '')) && dp.rw !== 'wo');

      if (gridPowerDp) {
        add({
          relId: this._aliasRelId('r.gridPower'),
          name: 'Grid / NAP power',
          role: 'value.power',
          type: 'number',
          unit: gridPowerDp.unit || 'W',
          rw: 'ro',
          kind: 'dp',
          dpId: gridPowerDp.id,
        });
      }

      const gridSetpointDp =
        getAnyById('nAP_POWER_SETPOINT', 'sET_NAP_POWER', 'gRID_POWER_SETPOINT') ||
        this._findFirstDatapoint(dp =>
          (dp.rw === 'rw' || dp.rw === 'wo') &&
          /(nap|grid).*(set|target|limit).*power/i.test(String(dp.id || ''))
        );

      if (gridSetpointDp) {
        add({
          relId: this._aliasRelId('ctrl.gridSetpointW'),
          name: 'Grid / NAP power setpoint',
          role: 'level.power',
          type: 'number',
          unit: gridSetpointDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: gridSetpointDp.id,
          writeDpId: gridSetpointDp.id,
        });

        // Synonym (more explicit)
        add({
          relId: this._aliasRelId('ctrl.napSetpointW'),
          name: 'NAP power setpoint',
          role: 'level.power',
          type: 'number',
          unit: gridSetpointDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: gridSetpointDp.id,
          writeDpId: gridSetpointDp.id,
        });
      }

      // FENECON ctrlBalancing0/SetGridActivePower is a write-only command that
      // shifts the grid-connection balancing target. Keep it out of the historic
      // aliases.* namespace so running installations remain byte-for-byte
      // compatible, but expose it through the canonical Alias Contract v1.
      const feneconGridActivePowerDp = getAnyById('sET_GRID_ACTIVE_POWER');
      if (feneconGridActivePowerDp && (feneconGridActivePowerDp.rw === 'rw' || feneconGridActivePowerDp.rw === 'wo')) {
        for (const [aliasPath, aliasName] of [
          ['ctrl.gridSetpointW', 'Grid connection active-power target'],
          ['ctrl.napSetpointW', 'NAP active-power target'],
        ]) {
          addStandardSource({
            relId: this._aliasRelId(aliasPath),
            name: aliasName,
            role: 'level.power',
            type: 'number',
            unit: feneconGridActivePowerDp.unit || 'W',
            rw: 'rw',
            kind: 'dp',
            dpId: feneconGridActivePowerDp.id,
            writeDpId: feneconGridActivePowerDp.id,
            commandOnlyAlias: true,
            preferCommandValue: true,
          });
        }
      }



      // --- PV / export power limiting (best-effort) ---
      const exportPowerPctDp = getAnyById('eXPORT_POWER_PERCENTAGE', 'wMaxLimPct', 'wMAXLIMPCT');
      if (exportPowerPctDp && (exportPowerPctDp.rw === 'rw' || exportPowerPctDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.powerLimitPct'),
          name: 'PV/export power limit (%)',
          role: 'level',
          type: 'number',
          unit: exportPowerPctDp.unit || '%',
          rw: 'rw',
          kind: 'dp',
          dpId: exportPowerPctDp.id,
          writeDpId: exportPowerPctDp.id,
        });

        // More explicit synonym (useful when multiple device categories are merged downstream)
        add({
          relId: this._aliasRelId('ctrl.exportLimitPct'),
          name: 'Export power limit (%)',
          role: 'level',
          type: 'number',
          unit: exportPowerPctDp.unit || '%',
          rw: 'rw',
          kind: 'dp',
          dpId: exportPowerPctDp.id,
          writeDpId: exportPowerPctDp.id,
        });
      }

      const exportPowerLimitDp = getAnyById('eXPORT_POWER_LIMIT', 'wMaxLim', 'wMAXLIM');
      if (exportPowerLimitDp && (exportPowerLimitDp.rw === 'rw' || exportPowerLimitDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.powerLimitW'),
          name: 'PV/export power limit (W)',
          role: 'level.power',
          type: 'number',
          unit: exportPowerLimitDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: exportPowerLimitDp.id,
          writeDpId: exportPowerLimitDp.id,
        });

        add({
          relId: this._aliasRelId('ctrl.exportLimitW'),
          name: 'Export power limit (W)',
          role: 'level.power',
          type: 'number',
          unit: exportPowerLimitDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: exportPowerLimitDp.id,
          writeDpId: exportPowerLimitDp.id,
        });
      }

      // Control: charge enable (best-effort)
      const disableChargeDp = getAnyById('eSS_DISABLE_CHARGE_FLAG');
      if (disableChargeDp && (disableChargeDp.rw === 'rw' || disableChargeDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.chargeEnable'),
          name: 'Charge enable',
          role: 'switch',
          type: 'boolean',
          rw: 'rw',
          kind: 'dp',
          dpId: disableChargeDp.id,
          writeDpId: disableChargeDp.id,
          toDevice: (v) => (v ? 0 : 1),
          fromDevice: (v) => {
            const b = asBool01(v);
            if (b === undefined) return undefined;
            // dp is DISABLE flag -> invert
            return !b;
          }
        });
      }

      // --- Status & alarms (best-effort, conservative) ---
      const statusDp =
        getAnyById('bAT_STATUS', 'bATTERY_STATE', 'bATTERY_WORK_STATE', 'sYSTEM_STATE', 'cLUSTER_RUN_STATE', 'sYSTEM_RUNNING_STATE', 'vE_BUS_STATE', 'sWITCH_POSITION') ||
        this._findFirstDatapoint(dp => /(^|_)(state|status|health)($|_)/i.test(String(dp.id || '')) && !/parameter/i.test(String(dp.id || '')));

      if (statusDp) {
        add({
          relId: this._aliasRelId('r.statusCode'),
          name: 'Status code',
          role: 'indicator.status',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: statusDp.id,
        });
      }

      const errorCodeDp =
        getAnyById('vE_BUS_ERROR', 'vE_BUS_BMS_ERROR', 'iNSULATION_RESISTANCE_ERROR_LEVEL') ||
        this._findFirstDatapoint(dp => /(^|_)(error|fault)($|_)/i.test(String(dp.id || '')) && !/parameter/i.test(String(dp.id || '')));

      if (errorCodeDp) {
        add({
          relId: this._aliasRelId('r.errorCode'),
          name: 'Error code',
          role: 'indicator',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: errorCodeDp.id,
        });
      }

      // Conservative fault detection: explicit error codes or active alarm/protect flag registers (non-zero)
      const faultFlagDps = this.getDatapoints().filter(dp => {
        const id = String(dp && dp.id ? dp.id : '');
        if (!id) return false;
        // exclude configuration thresholds
        if (/(parameter|limit|recover|threshold)/i.test(id)) return false;
        return /(vE_BUS_ERROR|vE_BUS_BMS_ERROR|ALARM_FLAG_REGISTER|PROTECT_FLAG_REGISTER|SYSTEM_FAULT_COUNTERS|INSULATION_RESISTANCE_ERROR_LEVEL)/i.test(id);
      });

      add({
        relId: this._aliasRelId('alarm.fault'),
        name: 'Fault active',
        role: 'indicator.alarm',
        type: 'boolean',
        rw: 'ro',
        kind: 'computed',
        get: (values) => {
          if (!values) return false;

          // EMS1000: System operating status uses 4 = Failure
          // (1 = On-grid, 2 = Off-grid, 3 = Standby, 4 = Failure)
          if (typeof values.sYSTEM_OPERATING_STATUS === 'number' && values.sYSTEM_OPERATING_STATUS === 4) {
            return true;
          }
          // explicit error code
          if (errorCodeDp) {
            const v = values[errorCodeDp.id];
            if (typeof v === 'number') return v !== 0;
          }

          for (const dp of faultFlagDps) {
            const v = values[dp.id];
            if (typeof v === 'boolean' && v) return true;
            if (typeof v === 'number' && v !== 0) return true;
          }
          return false;
        }
      });

      // Warning (best-effort): look for active warning registers (exclude parameters)
      const warnFlagDps = this.getDatapoints().filter(dp => {
        const id = String(dp && dp.id ? dp.id : '');
        if (!id) return false;
        if (/(parameter|limit|recover|threshold)/i.test(id)) return false;
        return /(warning|warn)/i.test(id);
      });

      if (warnFlagDps && warnFlagDps.length) {
        add({
          relId: this._aliasRelId('alarm.warning'),
          name: 'Warning active',
          role: 'indicator.alarm',
          type: 'boolean',
          rw: 'ro',
          kind: 'computed',
          get: (values) => {
            if (!values) return false;
            for (const dp of warnFlagDps) {
              const v = values[dp.id];
              if (typeof v === 'boolean' && v) return true;
              if (typeof v === 'number' && v !== 0) return true;
            }
            return false;
          }
        });
      }
    }

    // --- Meter aliases (read-only, stable API) ---
    if (cat === 'METER') {
      // Identify datapoints (best-effort)
      const netPowerDp =
        getAnyById('aCTIVE_POWER') ||
        findByIdRe(/^aCTIVE_POWER$/i);

      const importPowerDp =
        getAnyById('aCTIVE_CONSUMPTION_POWER') ||
        findByIdRe(/^aCTIVE_CONSUMPTION_POWER(?!_L[123])/i);

      const exportPowerDp =
        getAnyById('aCTIVE_PRODUCTION_POWER') ||
        findByIdRe(/^aCTIVE_PRODUCTION_POWER(?!_L[123])/i);

      const posPowerDp =
        getAnyById('aCTIVE_POWER_POS') ||
        findByIdRe(/^aCTIVE_POWER_POS$/i);

      const negPowerDp =
        getAnyById('aCTIVE_POWER_NEG') ||
        findByIdRe(/^aCTIVE_POWER_NEG$/i);

      const pL1 = getAnyById('aCTIVE_POWER_L1');
      const pL2 = getAnyById('aCTIVE_POWER_L2');
      const pL3 = getAnyById('aCTIVE_POWER_L3');

      const importEnergyDp =
        getAnyById('aCTIVE_CONSUMPTION_ENERGY') ||
        findByIdRe(/^aCTIVE_CONSUMPTION_ENERGY(?!_L[123])/i);

      const exportEnergyDp =
        getAnyById('aCTIVE_PRODUCTION_ENERGY') ||
        findByIdRe(/^aCTIVE_PRODUCTION_ENERGY(?!_L[123])/i);

      const importEnergyL1 = findByIdRe(/^aCTIVE_CONSUMPTION_ENERGY_L1/i) || getAnyById('aCTIVE_CONSUMPTION_ENERGY_L1');
      const importEnergyL2 = findByIdRe(/^aCTIVE_CONSUMPTION_ENERGY_L2/i) || getAnyById('aCTIVE_CONSUMPTION_ENERGY_L2');
      const importEnergyL3 = findByIdRe(/^aCTIVE_CONSUMPTION_ENERGY_L3/i) || getAnyById('aCTIVE_CONSUMPTION_ENERGY_L3');

      const exportEnergyL1 = findByIdRe(/^aCTIVE_PRODUCTION_ENERGY_L1/i) || getAnyById('aCTIVE_PRODUCTION_ENERGY_L1');
      const exportEnergyL2 = findByIdRe(/^aCTIVE_PRODUCTION_ENERGY_L2/i) || getAnyById('aCTIVE_PRODUCTION_ENERGY_L2');
      const exportEnergyL3 = findByIdRe(/^aCTIVE_PRODUCTION_ENERGY_L3/i) || getAnyById('aCTIVE_PRODUCTION_ENERGY_L3');

      const asNumber = (v) => (typeof v === 'number' && Number.isFinite(v)) ? v : undefined;

      const computeNetPower = (values) => {
        if (!values) return undefined;

        const pNet = netPowerDp ? asNumber(values[netPowerDp.id]) : undefined;
        if (pNet !== undefined) return pNet;

        const imp = importPowerDp ? asNumber(values[importPowerDp.id]) : undefined;
        const exp = exportPowerDp ? asNumber(values[exportPowerDp.id]) : undefined;
        if (imp !== undefined || exp !== undefined) return (imp || 0) - (exp || 0);

        const pos = posPowerDp ? asNumber(values[posPowerDp.id]) : undefined;
        const neg = negPowerDp ? asNumber(values[negPowerDp.id]) : undefined;
        if (pos !== undefined || neg !== undefined) return (pos || 0) - (neg || 0);

        const p1 = pL1 ? asNumber(values[pL1.id]) : undefined;
        const p2 = pL2 ? asNumber(values[pL2.id]) : undefined;
        const p3 = pL3 ? asNumber(values[pL3.id]) : undefined;
        if (p1 !== undefined || p2 !== undefined || p3 !== undefined) return (p1 || 0) + (p2 || 0) + (p3 || 0);

        return undefined;
      };

      const computeImportPower = (values) => {
        if (!values) return undefined;

        const imp = importPowerDp ? asNumber(values[importPowerDp.id]) : undefined;
        if (imp !== undefined) return imp;

        const pos = posPowerDp ? asNumber(values[posPowerDp.id]) : undefined;
        if (pos !== undefined) return pos;

        const net = computeNetPower(values);
        if (net === undefined) return undefined;
        return net > 0 ? net : 0;
      };

      const computeExportPower = (values) => {
        if (!values) return undefined;

        const exp = exportPowerDp ? asNumber(values[exportPowerDp.id]) : undefined;
        if (exp !== undefined) return exp;

        const neg = negPowerDp ? asNumber(values[negPowerDp.id]) : undefined;
        if (neg !== undefined) return neg;

        const net = computeNetPower(values);
        if (net === undefined) return undefined;
        return net < 0 ? Math.abs(net) : 0;
      };

      const computeImportEnergy = (values) => {
        if (!values) return undefined;
        const e = importEnergyDp ? asNumber(values[importEnergyDp.id]) : undefined;
        if (e !== undefined) return e;

        const e1 = importEnergyL1 ? asNumber(values[importEnergyL1.id]) : undefined;
        const e2 = importEnergyL2 ? asNumber(values[importEnergyL2.id]) : undefined;
        const e3 = importEnergyL3 ? asNumber(values[importEnergyL3.id]) : undefined;
        if (e1 !== undefined || e2 !== undefined || e3 !== undefined) return (e1 || 0) + (e2 || 0) + (e3 || 0);

        return undefined;
      };

      const computeExportEnergy = (values) => {
        if (!values) return undefined;
        const e = exportEnergyDp ? asNumber(values[exportEnergyDp.id]) : undefined;
        if (e !== undefined) return e;

        const e1 = exportEnergyL1 ? asNumber(values[exportEnergyL1.id]) : undefined;
        const e2 = exportEnergyL2 ? asNumber(values[exportEnergyL2.id]) : undefined;
        const e3 = exportEnergyL3 ? asNumber(values[exportEnergyL3.id]) : undefined;
        if (e1 !== undefined || e2 !== undefined || e3 !== undefined) return (e1 || 0) + (e2 || 0) + (e3 || 0);

        return undefined;
      };

      const hasAnyPower = !!(netPowerDp || importPowerDp || exportPowerDp || posPowerDp || negPowerDp || pL1 || pL2 || pL3);

      // net power (W) - prefer direct active power, else compute from available signals
      if (hasAnyPower) {
        if (netPowerDp) {
          add({
            relId: this._aliasRelId('r.power'),
            name: 'Net active power',
            role: 'value.power',
            type: 'number',
            unit: netPowerDp.unit || 'W',
            rw: 'ro',
            kind: 'dp',
            dpId: netPowerDp.id,
          });
        } else {
          add({
            relId: this._aliasRelId('r.power'),
            name: 'Net active power',
            role: 'value.power',
            type: 'number',
            unit: 'W',
            rw: 'ro',
            kind: 'computed',
            get: (values) => computeNetPower(values),
          });
        }

        // powerImport (W)
        if (importPowerDp || posPowerDp) {
          const dp = importPowerDp || posPowerDp;
          add({
            relId: this._aliasRelId('r.powerImport'),
            name: 'Import power',
            role: 'value.power',
            type: 'number',
            unit: dp.unit || 'W',
            rw: 'ro',
            kind: 'dp',
            dpId: dp.id,
          });
        } else {
          add({
            relId: this._aliasRelId('r.powerImport'),
            name: 'Import power',
            role: 'value.power',
            type: 'number',
            unit: 'W',
            rw: 'ro',
            kind: 'computed',
            get: (values) => computeImportPower(values),
          });
        }

        // powerExport (W)
        if (exportPowerDp || negPowerDp) {
          const dp = exportPowerDp || negPowerDp;
          add({
            relId: this._aliasRelId('r.powerExport'),
            name: 'Export power',
            role: 'value.power',
            type: 'number',
            unit: dp.unit || 'W',
            rw: 'ro',
            kind: 'dp',
            dpId: dp.id,
          });
        } else {
          add({
            relId: this._aliasRelId('r.powerExport'),
            name: 'Export power',
            role: 'value.power',
            type: 'number',
            unit: 'W',
            rw: 'ro',
            kind: 'computed',
            get: (values) => computeExportPower(values),
          });
        }
      }

      // energy import/export (Wh) - use totals when available, else sum per phase
      const hasAnyEnergy = !!(importEnergyDp || exportEnergyDp || importEnergyL1 || importEnergyL2 || importEnergyL3 || exportEnergyL1 || exportEnergyL2 || exportEnergyL3);

      if (hasAnyEnergy) {
        if (importEnergyDp) {
          add({
            relId: this._aliasRelId('r.energyImport'),
            name: 'Import energy',
            role: 'value.energy',
            type: 'number',
            unit: importEnergyDp.unit || 'Wh',
            rw: 'ro',
            kind: 'dp',
            dpId: importEnergyDp.id,
          });
        } else {
          add({
            relId: this._aliasRelId('r.energyImport'),
            name: 'Import energy',
            role: 'value.energy',
            type: 'number',
            unit: 'Wh',
            rw: 'ro',
            kind: 'computed',
            get: (values) => computeImportEnergy(values),
          });
        }

        if (exportEnergyDp) {
          add({
            relId: this._aliasRelId('r.energyExport'),
            name: 'Export energy',
            role: 'value.energy',
            type: 'number',
            unit: exportEnergyDp.unit || 'Wh',
            rw: 'ro',
            kind: 'dp',
            dpId: exportEnergyDp.id,
          });
        } else {
          add({
            relId: this._aliasRelId('r.energyExport'),
            name: 'Export energy',
            role: 'value.energy',
            type: 'number',
            unit: 'Wh',
            rw: 'ro',
            kind: 'computed',
            get: (values) => computeExportEnergy(values),
          });
        }
      }

      // Phase voltages/currents (V/A) and frequency (Hz)
      const vL1 = getAnyById('vOLTAGE_L1') || getAnyById('vOLTAGE');
      const vL2 = getAnyById('vOLTAGE_L2');
      const vL3 = getAnyById('vOLTAGE_L3');

      const cL1 = getAnyById('cURRENT_L1') || getAnyById('cURRENT');
      const cL2 = getAnyById('cURRENT_L2');
      const cL3 = getAnyById('cURRENT_L3');

      if (vL1) add({ relId: this._aliasRelId('r.voltageL1'), name: 'Voltage L1', role: 'value.voltage', type: 'number', unit: vL1.unit || 'V', rw: 'ro', kind: 'dp', dpId: vL1.id });
      if (vL2) add({ relId: this._aliasRelId('r.voltageL2'), name: 'Voltage L2', role: 'value.voltage', type: 'number', unit: vL2.unit || 'V', rw: 'ro', kind: 'dp', dpId: vL2.id });
      if (vL3) add({ relId: this._aliasRelId('r.voltageL3'), name: 'Voltage L3', role: 'value.voltage', type: 'number', unit: vL3.unit || 'V', rw: 'ro', kind: 'dp', dpId: vL3.id });

      if (cL1) add({ relId: this._aliasRelId('r.currentL1'), name: 'Current L1', role: 'value.current', type: 'number', unit: cL1.unit || 'A', rw: 'ro', kind: 'dp', dpId: cL1.id });
      if (cL2) add({ relId: this._aliasRelId('r.currentL2'), name: 'Current L2', role: 'value.current', type: 'number', unit: cL2.unit || 'A', rw: 'ro', kind: 'dp', dpId: cL2.id });
      if (cL3) add({ relId: this._aliasRelId('r.currentL3'), name: 'Current L3', role: 'value.current', type: 'number', unit: cL3.unit || 'A', rw: 'ro', kind: 'dp', dpId: cL3.id });

      const freqDp = getAnyById('fREQUENCY');
      if (freqDp) {
        add({
          relId: this._aliasRelId('r.frequency'),
          name: 'Frequency',
          role: 'value.frequency',
          type: 'number',
          unit: freqDp.unit || 'Hz',
          rw: 'ro',
          kind: 'dp',
          dpId: freqDp.id,
        });
      }
    }

    // --- Canonical-only solar / DC charger aliases (CHARGER / DC_CHARGER) ---
    // The old aliases.* namespace remains exactly as it was before Alias Contract v1.
    // Additional solar-charger discovery paths are therefore generated only for v1.
    if (cat === 'CHARGER' || cat === 'DC_CHARGER') {
      const powerDp =
        getAnyById('aCTUAL_POWER', 'pV_POWER', 'cHARGE_POWER', 'oUTPUT_POWER') ||
        this._findFirstDatapoint(dp => dp && dp.rw !== 'wo' && dp.role === 'value.power');
      if (powerDp) {
        addStandardSource({
          relId: this._aliasRelId('r.power'),
          name: 'Charger power',
          role: 'value.power',
          type: 'number',
          unit: powerDp.unit || 'W',
          rw: 'ro',
          kind: 'dp',
          dpId: powerDp.id,
        });
      }

      const energyDp =
        getAnyById('aCTUAL_ENERGY', 'eNERGY_TOTAL', 'tOTAL_ENERGY', 'yIELD_TODAY') ||
        this._findFirstDatapoint(dp => dp && dp.rw !== 'wo' && dp.role === 'value.energy');
      if (energyDp) {
        addStandardSource({
          relId: this._aliasRelId('r.energyTotal'),
          name: 'Charger energy',
          role: 'value.energy',
          type: 'number',
          unit: energyDp.unit || 'Wh',
          rw: 'ro',
          kind: 'dp',
          dpId: energyDp.id,
        });
      }

      const voltageDp =
        getAnyById('vOLTAGE', 'pV_VOLTAGE', 'bATTERY_VOLTAGE') ||
        findByIdOrNameRe(/(^|_)(pv|charger|output).*voltage|^voltage$/i);
      if (voltageDp) {
        addStandardSource({
          relId: this._aliasRelId('r.voltage'),
          name: 'Charger voltage',
          role: 'value.voltage',
          type: 'number',
          unit: voltageDp.unit || 'V',
          rw: 'ro',
          kind: 'dp',
          dpId: voltageDp.id,
        });
      }

      const currentDp =
        getAnyById('cURRENT', 'pV_CURRENT', 'bATTERY_CURRENT') ||
        findByIdOrNameRe(/(^|_)(pv|charger|output).*current|^current$/i);
      if (currentDp) {
        addStandardSource({
          relId: this._aliasRelId('r.current'),
          name: 'Charger current',
          role: 'value.current',
          type: 'number',
          unit: currentDp.unit || 'A',
          rw: 'ro',
          kind: 'dp',
          dpId: currentDp.id,
        });
      }

      const temperatureDp =
        getAnyById('bATTERY_TEMPERATURE', 'cHARGER_TEMPERATURE', 'tEMPERATURE') ||
        findByIdOrNameRe(/temperature|temperatur/i);
      if (temperatureDp) {
        addStandardSource({
          relId: this._aliasRelId('r.temperature'),
          name: 'Charger temperature',
          role: 'value.temperature',
          type: 'number',
          unit: temperatureDp.unit || '°C',
          rw: 'ro',
          kind: 'dp',
          dpId: temperatureDp.id,
        });
      }

      const statusDp =
        getAnyById('cHARGE_STATE', 'cHARGER_STATE', 'sTATUS', 'sTATE') ||
        findByIdOrNameRe(/charge.*state|charger.*state|status/i);
      if (statusDp) {
        addStandardSource({
          relId: this._aliasRelId('r.statusCode'),
          name: 'Charger status code',
          role: 'indicator.status',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: statusDp.id,
        });
      }

      const errorDp =
        getAnyById('eRROR_CODE', 'fAULT_CODE') ||
        findByIdOrNameRe(/error.*code|fault.*code/i);
      if (errorDp) {
        addStandardSource({
          relId: this._aliasRelId('r.errorCode'),
          name: 'Charger error code',
          role: 'indicator',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: errorDp.id,
        });
        addStandardSource({
          relId: this._aliasRelId('alarm.fault'),
          name: 'Charger fault',
          role: 'indicator.alarm',
          type: 'boolean',
          rw: 'ro',
          kind: 'computed',
          get: (values) => {
            const n = Number(values && values[errorDp.id]);
            return Number.isFinite(n) ? n !== 0 : false;
          },
        });
      }
    }

    // --- Charging station aliases (EVCS/EVSE/CHARGER/DC_CHARGER) ---
    if (chargerCats.has(cat)) {
      // Read: power
      const chargingPowerDp =
        getAnyById('aCTIVE_POWER') ||
        findByIdRe(/charging_power/i) ||
        findByIdRe(/power_W$/i) ||
        this._findFirstDatapoint(dp => dp.role === 'value.power' && dp.rw !== 'wo' && !/^station_/i.test(String(dp.id))) ||
        this._findFirstDatapoint(dp => dp.role === 'value.power' && dp.rw !== 'wo');

      if (chargingPowerDp) {
        add({
          relId: this._aliasRelId('r.power'),
          name: 'Charging power',
          role: 'value.power',
          type: 'number',
          unit: chargingPowerDp.unit || 'W',
          rw: 'ro',
          kind: 'dp',
          dpId: chargingPowerDp.id,
        });
      }

      // Read: energy session / total
      const makeEvcsEnergyAlias = (dp, aliasPath, name) => {
        if (!dp) return null;
        const srcUnit = String(dp.unit || '').trim();
        const unitLower = srcUnit.toLowerCase().replace(/\s+/g, '');

        // Frontend/charge-management API convention: EVCS energy aliases are exposed in kWh.
        // A number of Modbus wallboxes (MENNEKES AMTRON, KEBA P40, etc.) report native energy
        // counters in Wh/0.1Wh.  Keep vendor datapoints faithful to the template, but normalize
        // aliases so dashboards do not render Wh values as kWh.
        let factor = 1;
        let aliasUnit = srcUnit || 'kWh';
        if (unitLower === 'wh') {
          factor = 1 / 1000;
          aliasUnit = 'kWh';
        } else if (unitLower === '0.1wh' || unitLower === '0,1wh') {
          factor = 1 / 10000;
          aliasUnit = 'kWh';
        } else if (!srcUnit) {
          aliasUnit = 'kWh';
        }

        const def = {
          relId: this._aliasRelId(aliasPath),
          name,
          role: 'value.energy',
          type: 'number',
          unit: aliasUnit,
          rw: 'ro',
          kind: 'dp',
          dpId: dp.id,
        };

        if (factor !== 1) {
          def.fromDevice = (v) => {
            if (v === null || v === undefined) return v;
            const n = Number(v);
            if (!Number.isFinite(n)) return undefined;
            return roundTo(n * factor, 3);
          };
        }
        return def;
      };

      const energySessionDp =
        getAnyById('eNERGY_SESSION', 'lAST_ENERGY_SESSION') ||
        findByIdRe(/charged_energy_session/i) ||
        findByIdRe(/energy.*session/i) ||
        findByIdOrNameRe(/energy.*session/i);

      if (energySessionDp) {
        add(makeEvcsEnergyAlias(energySessionDp, 'r.energySession', 'Energy (session)'));
      }

      const energyTotalDp =
        findByIdRe(/total.*charged.*energy/i) ||
        findByIdRe(/total_charged_energy/i) ||
        findByIdRe(/total.*energy/i) ||
        getAnyById('aCTIVE_PRODUCTION_ENERGY') ||
        this._findFirstDatapoint(dp => dp.role === 'value.energy' && dp.rw !== 'wo' && !/session/i.test(String(dp.id || '') + ' ' + String(dp.name || '')));

      if (energyTotalDp) {
        add(makeEvcsEnergyAlias(energyTotalDp, 'r.energyTotal', 'Energy (total)'));
      }

      // --- Alfen NG9xx/ACE special aliases ---
      // Alfen exposes live socket control mainly through the "Modbus Server Max Current"
      // setpoint. There is no dedicated start/stop boolean in the Modbus map: charging is
      // released by writing a valid current (normally >= 6 A) and blocked by writing 0 A.
      try {
        const tplIdLower = String(this.template?.id || '').toLowerCase();
        const mfrLower = String(this.template?.manufacturer || '').toLowerCase();
        const isAlfenAce = mfrLower === 'alfen' || tplIdLower.includes('alfen.ng9xx') || tplIdLower.includes('alfen');
        if (isAlfenAce) {
          const toNum = (v) => {
            if (typeof this._parseNumberWithUnits === 'function') return this._parseNumberWithUnits(v);
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'string') {
              const n = Number(v.trim().replace(',', '.'));
              return Number.isFinite(n) ? n : undefined;
            }
            return undefined;
          };

          const commandNumber = (v) => toNum(v);

          const cleanMode3 = (v) => String(v ?? '')
            .replace(/\u0000/g, '')
            .trim()
            .toUpperCase();

          const mode3Map = {
            A:  { code: 0, label: 'No vehicle' },
            B1: { code: 1, label: 'Vehicle connected, not ready' },
            B2: { code: 2, label: 'Vehicle connected, ready' },
            C1: { code: 3, label: 'Vehicle connected, waiting for charging' },
            C2: { code: 4, label: 'Charging' },
            D1: { code: 5, label: 'Vehicle connected, ventilation required' },
            D2: { code: 6, label: 'Charging, ventilation required' },
            E:  { code: 7, label: 'Error' },
            F:  { code: 8, label: 'Error' },
          };

          const mode3StateCodeStates = {
            0: 'No vehicle (A)',
            1: 'Vehicle connected, not ready (B1)',
            2: 'Vehicle connected, ready (B2)',
            3: 'Vehicle connected, waiting for charging (C1)',
            4: 'Charging (C2)',
            5: 'Vehicle connected, ventilation required (D1)',
            6: 'Charging, ventilation required (D2)',
            7: 'Error (E)',
            8: 'Error (F)',
          };

          const mode3Info = (v) => {
            const sMode = cleanMode3(v);
            if (!sMode) return null;
            const base = mode3Map[sMode];
            if (base) return { raw: sMode, code: base.code, label: base.label, text: `${base.label} (${sMode})` };
            return { raw: sMode, code: undefined, label: sMode, text: sMode };
          };

          const mode3Code = (v) => {
            const info = mode3Info(v);
            return info && Number.isFinite(info.code) ? info.code : undefined;
          };

          const mode3Text = (v) => {
            const info = mode3Info(v);
            return info ? info.text : 'Unknown';
          };

          const isVehicleConnectedMode = (v) => {
            const sMode = cleanMode3(v);
            return ['B1', 'B2', 'C1', 'C2', 'D1', 'D2'].includes(sMode);
          };

          const isChargingMode = (v) => {
            const sMode = cleanMode3(v);
            return sMode === 'C2' || sMode === 'D2';
          };

          const availabilityDp = getAnyById('eVSE_STATE');
          const mode3Dp = getAnyById('mODE3_STATE');
          const setCurrentDp = getAnyById('sET_CHARGING_CURRENT');
          const appliedCurrentDp = getAnyById('aCTUAL_APPLIED_MAX_CURRENT');
          const validTimeDp = getAnyById('mODBUS_MAX_CURRENT_VALID_TIME');
          const safeCurrentDp = getAnyById('aCTIVE_LOAD_BALANCING_SAFE_CURRENT');
          const accountedDp = getAnyById('sETPOINT_ACCOUNTED_FOR');
          const phasesDp = getAnyById('cHARGE_USING_PHASES');
          const scnAllCurrentDp = getAnyById('sCN_MAX_CURRENT');
          const scnCurrentL1Dp = getAnyById('sCN_MAX_CURRENT_L1');
          const scnCurrentL2Dp = getAnyById('sCN_MAX_CURRENT_L2');
          const scnCurrentL3Dp = getAnyById('sCN_MAX_CURRENT_L3');
          const scnActualCurrentL1Dp = getAnyById('sCN_ACTUAL_MAX_CURRENT_L1');
          const scnActualCurrentL2Dp = getAnyById('sCN_ACTUAL_MAX_CURRENT_L2');
          const scnActualCurrentL3Dp = getAnyById('sCN_ACTUAL_MAX_CURRENT_L3');
          const scnValidTimeL1Dp = getAnyById('sCN_REMAINING_VALID_TIME_L1');
          const scnValidTimeL2Dp = getAnyById('sCN_REMAINING_VALID_TIME_L2');
          const scnValidTimeL3Dp = getAnyById('sCN_REMAINING_VALID_TIME_L3');
          const scnEnableDp = getAnyById('sCN_MAX_CURRENT_ENABLE');
          const scnRemainingValidTimeL1Dp = getAnyById('sCN_REMAINING_VALID_TIME_L1');
          const scnSafeCurrentDp = getAnyById('sCN_SAFE_CURRENT');
          const scnMaxCurrentEnableDp = getAnyById('sCN_MAX_CURRENT_ENABLE');

          const alfenHints = this._getAlfenHints ? this._getAlfenHints() : {};
          const runCurrentRaw = Number(alfenHints.runCurrentA ?? alfenHints.defaultEnableCurrentA ?? 6);
          const runCurrentA = Number.isFinite(runCurrentRaw) && runCurrentRaw > 0 ? runCurrentRaw : 6;
          const stopCurrentRaw = Number(alfenHints.stopCurrentA ?? 0);
          const stopCurrentA = Number.isFinite(stopCurrentRaw) && stopCurrentRaw >= 0 ? stopCurrentRaw : 0;
          const powerThresholdWRaw = Number(alfenHints.chargingPowerThresholdW ?? 50);
          const powerThresholdW = Number.isFinite(powerThresholdWRaw) && powerThresholdWRaw >= 0 ? powerThresholdWRaw : 50;
          const minRunCurrentRaw = Number(alfenHints.minRunCurrentA ?? alfenHints.positiveCurrentMinA ?? alfenHints.minimumRunCurrentA ?? 6);
          const minRunCurrentA = Number.isFinite(minRunCurrentRaw) && minRunCurrentRaw > 0 ? Math.round(minRunCurrentRaw) : 6;
          const normalizeAlfenCurrentCommand = (amp) => {
            const n = Number(amp);
            if (!Number.isFinite(n)) return undefined;
            const rounded = Math.round(n);
            if (rounded <= 0) return 0;
            if (rounded < minRunCurrentA) return minRunCurrentA;
            if (rounded > 80) return 80;
            return rounded;
          };
          const alfenControlMode = String(alfenHints.controlMode || '').toLowerCase();
          const preferScnControl = !!(scnAllCurrentDp && (alfenControlMode === 'scn' || alfenHints.scnPrimaryControl === true || tplIdLower.includes('.scn.')));
          const primaryCurrentWriteDp = preferScnControl ? scnAllCurrentDp : setCurrentDp;
          // Readback and command are separate on Alfen. In Socket mode 1206..1207 is the
          // applied socket max current and 1210..1211 is the writable socket setpoint.
          // In SCN/Station mode the effective current is the SCN Actual Max Current
          // registers 1411..1416 and the writable setpoint is SCN Max Current 1417..1422.
          const primaryCurrentReadDp = preferScnControl ? (scnActualCurrentL1Dp || appliedCurrentDp || scnAllCurrentDp) : (appliedCurrentDp || setCurrentDp);
          const primaryValidTimeDp = preferScnControl ? (scnRemainingValidTimeL1Dp || validTimeDp) : validTimeDp;
          const primarySafeCurrentDp = preferScnControl ? (scnSafeCurrentDp || safeCurrentDp) : safeCurrentDp;
          const primaryAccountedDp = preferScnControl ? (scnMaxCurrentEnableDp || accountedDp) : accountedDp;

          // Alfen All-IDs templates expose Socket-1, Socket-2 and Station/SCN data in one
          // object tree.  Socket-1 remains the stable primary control path unless the
          // template explicitly asks for SCN control.  These helpers must be defined before
          // aliases are built; otherwise the Alfen-specific alias block silently aborts and
          // falls back to generic aliases, which makes manual writes look accepted while the
          // 5 s watchdog does not actually hold the intended command.
          const allIdsControl = !!(
            alfenControlMode === 'allidssocketprimary' ||
            alfenControlMode === 'all-ids' ||
            alfenControlMode === 'allids' ||
            String(alfenHints.safeDefaultMode || '').toLowerCase() === 'all-ids' ||
            tplIdLower.includes('.station.') ||
            String(this.template?.model || '').toLowerCase().includes('all ids')
          );

          const normalizeAlfenValidTimeS = (v) => {
            const n = toNum(v);
            if (!Number.isFinite(n) || n < 0) return undefined;
            // Alfen default is 60 s.  Field logs showed 26214 s when the register was
            // not really usable for the active control mode; do not use such values to
            // mark the charger as released.  Native DP stays untouched; only the alias is
            // normalized for EOS/UI decisions.
            if (n > 3600) return undefined;
            return Math.trunc(n);
          };

          const scnEnabledValue = (values) => {
            const n = scnMaxCurrentEnableDp ? toNum(values && values[scnMaxCurrentEnableDp.id]) : undefined;
            return Number.isFinite(n) && Math.trunc(n) === 1;
          };

          const scnActualLimitValue = (values) => {
            const vals = [scnActualCurrentL1Dp, scnActualCurrentL2Dp, scnActualCurrentL3Dp]
              .map(dp => dp ? toNum(values && values[dp.id]) : undefined)
              .filter(Number.isFinite);
            if (!vals.length) return undefined;
            return Math.min(...vals);
          };

          const scnRemainingValidTimeValue = (values) => {
            const vals = [scnValidTimeL1Dp, scnValidTimeL2Dp, scnValidTimeL3Dp]
              .map(dp => dp ? normalizeAlfenValidTimeS(values && values[dp.id]) : undefined)
              .filter(Number.isFinite);
            if (!vals.length) return undefined;
            return Math.min(...vals);
          };

          const getChargingPowerW = (values) => {
            if (!chargingPowerDp || !values) return undefined;
            const p = toNum(values[chargingPowerDp.id]);
            return Number.isFinite(p) ? p : undefined;
          };
          const isChargingByPower = (values) => {
            const p = getChargingPowerW(values);
            return Number.isFinite(p) ? p > powerThresholdW : undefined;
          };

          // Some Alfen/ACE installations with newer/limited meters expose only a subset of the
          // socket measurement map. Keep the stable total-energy alias useful by taking the first
          // finite value from the two relevant meter counters instead of binding it to one DP only.
          const energyDeliveredSumDp = getAnyById('tOTAL_CHARGED_ENERGY');
          const energyConsumedSumDp = getAnyById('eNERGY_CONSUMED_SUM');
          if (energyDeliveredSumDp || energyConsumedSumDp) {
            add({
              relId: this._aliasRelId('r.energyTotal'),
              name: 'Energy (total)',
              role: 'value.energy',
              type: 'number',
              // Alfen ACE meter energy counters are documented as Wh. EOS/frontends
              // expect EVCS energy aliases in kWh, so normalize here instead of
              // exposing raw Wh through the alias layer.
              unit: 'kWh',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const normalizeEnergyToKwh = (dp, v) => {
                  const n = toNum(v);
                  if (!Number.isFinite(n)) return undefined;
                  const u = String(dp && dp.unit || '').trim().toLowerCase().replace(/\s+/g, '');
                  if (u === 'wh') return roundTo(n / 1000, 3);
                  if (u === '0.1wh' || u === '0,1wh') return roundTo(n / 10000, 3);
                  // Alfen template datapoints are already scaled to kWh as of 0.5.116.
                  return roundTo(n, 3);
                };
                const delivered = energyDeliveredSumDp ? normalizeEnergyToKwh(energyDeliveredSumDp, values && values[energyDeliveredSumDp.id]) : undefined;
                if (Number.isFinite(delivered)) return delivered;
                const consumed = energyConsumedSumDp ? normalizeEnergyToKwh(energyConsumedSumDp, values && values[energyConsumedSumDp.id]) : undefined;
                if (Number.isFinite(consumed)) return consumed;
                return undefined;
              },
            });
          }

          if (mode3Dp) {
            add({
              relId: this._aliasRelId('r.mode3State'),
              name: 'Mode 3 state',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'dp',
              dpId: mode3Dp.id,
              fromDevice: (v) => mode3Text(v),
            });

            add({
              relId: this._aliasRelId('r.mode3Code'),
              name: 'Mode 3 code',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'dp',
              dpId: mode3Dp.id,
              fromDevice: (v) => cleanMode3(v),
            });

            add({
              relId: this._aliasRelId('r.statusCode'),
              name: 'Status code',
              role: 'indicator.status',
              type: 'number',
              states: mode3StateCodeStates,
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values, ctx) => {
                const n = mode3Code(values && values[mode3Dp.id]);
                if (Number.isFinite(n)) return n;
                const a = availabilityDp ? toNum(values && values[availabilityDp.id]) : undefined;
                if (Number.isFinite(a)) return a;
                const chg = isChargingByPower(values);
                if (chg === true) return 4; // C2-like: charging, derived from measured power
                if (chg === false && ctx && ctx.connected) return 1; // online/idle fallback
                return undefined;
              },
            });

            const getAlfenStatusText = (values, ctx) => {
              const raw = values && values[mode3Dp.id];
              const sMode = cleanMode3(raw);

              // Alfen exposes whether the received socket setpoint is accounted for.
              // If it is false while an active current command exists, the charger is
              // not using our socket/EMS command (common reasons: Socket vs SCN mode
              // mismatch, Enable sockets/SCN disabled, or another controller/backoffice
              // wins). Surface that instead of hiding it behind a generic charging state.
              const accounted = accountedDp ? toNum(values && values[accountedDp.id]) : undefined;
              const cmdKey = primaryCurrentWriteDp && primaryCurrentWriteDp.id ? String(primaryCurrentWriteDp.id) : '';
              const cmdVal = cmdKey && this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(cmdKey)
                ? toNum(this._lastCommandedValueByDpId.get(cmdKey))
                : undefined;
              if (Number.isFinite(cmdVal) && cmdVal > 0.1 && accounted === 0) {
                const applied = appliedCurrentDp ? toNum(values && values[appliedCurrentDp.id]) : undefined;
                const suffix = Number.isFinite(applied) ? `; applied ${roundTo(applied, 2)} A` : '';
                return `Charging / EMS setpoint not accounted${suffix}`;
              }

              if (sMode) return mode3Text(sMode);
              const a = availabilityDp ? toNum(values && values[availabilityDp.id]) : undefined;
              if (a === 1) return 'Operative';
              if (a === 0) return 'Inoperative';
              const chg = isChargingByPower(values);
              if (chg === true) return 'Charging (derived from power)';
              if (chg === false && ctx && ctx.connected) return 'Online / idle (derived from power)';
              return undefined;
            };

            add({
              relId: this._aliasRelId('r.statusText'),
              name: 'Status text',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: getAlfenStatusText,
            });

            // A few dashboards look for aliases.r.status instead of aliases.r.statusText.
            // Keep both in sync and make both human-readable (not just IEC code "A").
            add({
              relId: this._aliasRelId('r.status'),
              name: 'Status',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: getAlfenStatusText,
            });

            add({
              relId: this._aliasRelId('r.vehicleConnected'),
              name: 'Vehicle connected',
              role: 'indicator.connected',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const raw = values && values[mode3Dp.id];
                const sMode = cleanMode3(raw);
                if (sMode) return isVehicleConnectedMode(sMode);
                const chg = isChargingByPower(values);
                // Without Mode3 we cannot distinguish "car connected but idle" from "no car".
                // A positive measured charging power is, however, a safe indicator for connected.
                return chg === true ? true : undefined;
              },
            });

            add({
              relId: this._aliasRelId('r.charging'),
              name: 'Charging active',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const raw = values && values[mode3Dp.id];
                const sMode = cleanMode3(raw);
                if (sMode) return isChargingMode(sMode);
                return isChargingByPower(values);
              },
            });
          }

          if (availabilityDp) {
            add({
              relId: this._aliasRelId('r.available'),
              name: 'EVSE available / operative',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              get: (values, ctx) => {
                const n = availabilityDp ? toNum(values && values[availabilityDp.id]) : undefined;
                if (Number.isFinite(n)) return n === 1;
                // Some ACE profiles expose meter values but not the socket status/control
                // block 1200..1215. Keep the alias useful by falling back to connectivity.
                return !!(ctx && ctx.connected);
              },
            });
          }

          if (primaryCurrentReadDp) {
            add({
              relId: this._aliasRelId('r.appliedCurrentLimitA'),
              name: allIdsControl ? 'Effective actual applied max current' : (preferScnControl ? 'SCN actual applied max current' : 'Actual applied max current'),
              role: 'value.current',
              type: 'number',
              unit: primaryCurrentReadDp.unit || 'A',
              rw: 'ro',
              kind: allIdsControl ? 'computed' : 'dp',
              dpId: allIdsControl ? undefined : primaryCurrentReadDp.id,
              replace: true,
              get: allIdsControl ? ((values) => {
                // In All-IDs mode the charger may be configured either for Socket control
                // or SCN control. If SCN Max Current is enabled, the socket-level
                // setpoint-accounted flag can remain false even though the SCN limit is the
                // real effective limit. Prefer SCN actual current when the SCN enable flag is set.
                const scn = scnEnabledValue(values) ? scnActualLimitValue(values) : undefined;
                if (Number.isFinite(scn)) return roundTo(scn, 2);
                const socket = primaryCurrentReadDp ? toNum(values && values[primaryCurrentReadDp.id]) : undefined;
                return Number.isFinite(socket) ? roundTo(socket, 2) : undefined;
              }) : undefined,
            });
          }

          if (primaryValidTimeDp) {
            add({
              relId: this._aliasRelId('r.currentLimitValidTimeS'),
              name: allIdsControl ? 'Effective current-limit valid time remaining' : (preferScnControl ? 'SCN current-limit valid time remaining' : 'Current-limit valid time remaining'),
              role: 'value',
              type: 'number',
              unit: primaryValidTimeDp.unit || 's',
              rw: 'ro',
              kind: allIdsControl ? 'computed' : 'dp',
              dpId: allIdsControl ? undefined : primaryValidTimeDp.id,
              replace: true,
              fromDevice: allIdsControl ? undefined : normalizeAlfenValidTimeS,
              get: allIdsControl ? ((values) => {
                const scn = scnEnabledValue(values) ? scnRemainingValidTimeValue(values) : undefined;
                if (Number.isFinite(scn)) return scn;
                return normalizeAlfenValidTimeS(primaryValidTimeDp ? values && values[primaryValidTimeDp.id] : undefined);
              }) : undefined,
            });
          }

          if (primarySafeCurrentDp) {
            add({
              relId: this._aliasRelId('r.safeCurrentA'),
              name: preferScnControl ? 'SCN safe current' : 'Active Load Balancing safe current',
              role: 'value.current',
              type: 'number',
              unit: primarySafeCurrentDp.unit || 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: primarySafeCurrentDp.id,
              replace: true,
            });
          }

          if (primaryAccountedDp) {
            add({
              relId: this._aliasRelId('r.setpointAccountedFor'),
              name: preferScnControl ? 'SCN max-current enabled/accounted' : 'Setpoint accounted for',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'dp',
              dpId: primaryAccountedDp.id,
              replace: true,
              fromDevice: (v) => {
                const n = toNum(v);
                return Number.isFinite(n) ? n !== 0 : undefined;
              },
            });
          }

          if ((preferScnControl || allIdsControl) && accountedDp) {
            add({
              relId: this._aliasRelId('r.socketSetpointAccountedFor'),
              name: 'Socket setpoint accounted for',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'dp',
              dpId: accountedDp.id,
              fromDevice: (v) => {
                const n = toNum(v);
                return Number.isFinite(n) ? n !== 0 : undefined;
              },
            });
          }

          if ((preferScnControl || allIdsControl) && scnMaxCurrentEnableDp) {
            add({
              relId: this._aliasRelId('r.scnMaxCurrentEnabled'),
              name: 'SCN max-current enabled',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'dp',
              dpId: scnMaxCurrentEnableDp.id,
              fromDevice: (v) => {
                const n = toNum(v);
                return Number.isFinite(n) ? n !== 0 : undefined;
              },
            });
          }

          if (allIdsControl && (accountedDp || scnMaxCurrentEnableDp)) {
            add({
              relId: this._aliasRelId('r.controlAccepted'),
              name: 'EMS control accepted by active Alfen mode',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const socketAcc = accountedDp ? toNum(values && values[accountedDp.id]) : undefined;
                const scnEn = scnMaxCurrentEnableDp ? toNum(values && values[scnMaxCurrentEnableDp.id]) : undefined;
                if (Number.isFinite(scnEn) && Math.trunc(scnEn) === 1) return true;
                if (Number.isFinite(socketAcc)) return Math.trunc(socketAcc) !== 0;
                return undefined;
              },
            });
          }

          if (phasesDp) {
            add({
              relId: this._aliasRelId('ctrl.phaseMode'),
              name: 'Charge using phases',
              role: 'level',
              type: 'number',
              unit: phasesDp.unit || 'phases',
              rw: 'rw',
              kind: 'dp',
              dpId: phasesDp.id,
              writeDpId: phasesDp.id,
              preferCommandValue: true,
              commandOnlyAlias: true,
              toDevice: (v) => {
                // Safety: only explicit 1 or 3 are valid Alfen phase commands.
                // Accept UI strings such as "3 phases" / "3-phasig" as well,
                // but do NOT coerce false/0/undefined/NaN to 3 phases.
                if (typeof v === 'string') {
                  const m = v.trim().match(/^([13])(?:\D|$)/);
                  if (m) return Number(m[1]);
                }
                const parsed = commandNumber(v);
                const n = Math.trunc(Number(parsed));
                if (n === 1) return 1;
                if (n === 3) return 3;
                return undefined;
              },
              fromDevice: (v) => {
                const n = Math.trunc(Number(v));
                return n === 1 ? 1 : (n === 3 ? 3 : undefined);
              },
            });
          }

          if (primaryCurrentWriteDp && (primaryCurrentWriteDp.rw === 'rw' || primaryCurrentWriteDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.currentLimitA'),
              name: preferScnControl ? 'SCN charging current limit' : 'Charging current limit',
              role: 'level.current',
              type: 'number',
              unit: primaryCurrentWriteDp.unit || 'A',
              rw: 'rw',
              kind: 'dp',
              dpId: (primaryCurrentReadDp && primaryCurrentReadDp.id) || primaryCurrentWriteDp.id,
              writeDpId: primaryCurrentWriteDp.id,
              preferCommandValue: true,
              commandOnlyAlias: true,
              toDevice: (v) => {
                const n = commandNumber(v);
                return normalizeAlfenCurrentCommand(n);
              },
              fromDevice: (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : undefined;
              },
            });

            if (primaryCurrentWriteDp) {
              const nominalVoltage = Number(alfenHints.nominalVoltageV ?? 230);
              const voltageV = Number.isFinite(nominalVoltage) && nominalVoltage > 0 ? nominalVoltage : 230;
              const resolvePhaseForPowerCommand = () => {
                const phaseKey = phasesDp && phasesDp.id ? String(phasesDp.id) : '';
                const lastPhase = phaseKey && this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(phaseKey)
                  ? Math.trunc(Number(this._lastCommandedValueByDpId.get(phaseKey)))
                  : NaN;
                if (lastPhase === 1 || lastPhase === 3) return lastPhase;
                return Math.trunc(Number(alfenHints.defaultPhaseMode ?? 3)) === 1 ? 1 : 3;
              };
              add({
                relId: this._aliasRelId('ctrl.powerLimitW'),
                name: preferScnControl ? 'SCN charging power limit' : 'Charging power limit',
                role: 'level.power',
                type: 'number',
                unit: 'W',
                rw: 'rw',
                kind: 'dp',
                dpId: (primaryCurrentReadDp && primaryCurrentReadDp.id) || primaryCurrentWriteDp.id,
                writeDpId: primaryCurrentWriteDp.id,
                preferCommandValue: true,
                commandOnlyAlias: true,
                toDevice: (v) => {
                  const w = commandNumber(v);
                  if (!Number.isFinite(w)) return undefined;
                  if (w <= 0) return 0;
                  const phases = resolvePhaseForPowerCommand();
                  const amp = Math.round(w / (voltageV * phases));
                  return normalizeAlfenCurrentCommand(amp);
                },
                fromDevice: (v) => {
                  const a = Number(v);
                  if (!Number.isFinite(a)) return undefined;
                  const phases = resolvePhaseForPowerCommand();
                  return Math.round(a * voltageV * phases);
                },
              });
            }

            const runAlias = {
              name: preferScnControl ? 'Run / SCN charging release' : 'Run / charging release',
              role: 'switch',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: (primaryCurrentReadDp && primaryCurrentReadDp.id) || primaryCurrentWriteDp.id,
              writeDpId: primaryCurrentWriteDp.id,
              preferCommandValue: true,
              commandOnlyAlias: true,
              toDevice: (v) => {
                const asBool = (typeof v === 'boolean') ? v : (Number.isFinite(commandNumber(v)) ? commandNumber(v) !== 0 : undefined);
                if (asBool === false) return stopCurrentA;
                if (asBool === true) {
                  // For Alfen the release switch must not overwrite an already commanded
                  // dynamic current limit.  Min+PV/PV modes often write 6 A first and then
                  // set run=true; returning a hard-coded 16 A here would cancel that 6 A
                  // command.  Reuse the latest desired current if present, otherwise fall
                  // back to the configured release current.
                  const key = String(primaryCurrentWriteDp.id);
                  const lastCmd = this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(key)
                    ? Number(this._lastCommandedValueByDpId.get(key))
                    : NaN;
                  if (Number.isFinite(lastCmd) && lastCmd > 0.1) return normalizeAlfenCurrentCommand(lastCmd);
                  return normalizeAlfenCurrentCommand(runCurrentA);
                }
                return v;
              },
              fromDevice: (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n > 0.1 : undefined;
              },
            };

            add({ relId: this._aliasRelId('ctrl.run'), ...runAlias });
            add({ relId: this._aliasRelId('ctrl.chargeEnable'), ...runAlias, name: preferScnControl ? 'SCN charging release' : 'Charging release' });
            add({
              relId: this._aliasRelId('r.chargingReleased'),
              name: preferScnControl ? 'Charging released by SCN current setpoint' : 'Charging released by current setpoint',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                // This alias must describe the charger-side state, not merely the
                // command requested by EOS.  For Socket mode Alfen register 1214
                // (sETPOINT_ACCOUNTED_FOR) is the decisive readback.  If it is false,
                // the charger is deliberately not applying the Modbus setpoint, even if
                // the remaining-valid-time register contains a non-zero or bogus value.
                const accounted = primaryAccountedDp ? toNum(values && values[primaryAccountedDp.id]) : (accountedDp ? toNum(values && values[accountedDp.id]) : undefined);
                if (Number.isFinite(accounted)) return accounted !== 0;

                const validSRaw = primaryValidTimeDp ? (values && values[primaryValidTimeDp.id]) : (validTimeDp ? values && values[validTimeDp.id] : undefined);
                const validS = normalizeAlfenValidTimeS(validSRaw);
                if (Number.isFinite(validS) && validS > 0) return true;

                const applied = primaryCurrentReadDp ? toNum(values && values[primaryCurrentReadDp.id]) : (appliedCurrentDp ? toNum(values && values[appliedCurrentDp.id]) : undefined);
                if (Number.isFinite(applied)) return applied > 0.1;

                const cmd = this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(String(primaryCurrentWriteDp.id))
                  ? toNum(this._lastCommandedValueByDpId.get(String(primaryCurrentWriteDp.id)))
                  : undefined;
                return Number.isFinite(cmd) ? cmd > 0.1 : undefined;
              },
            });
          }
        }
      } catch (e) {
        // Never break generic EVCS alias generation due to Alfen-specific helpers.
      }

      // --- KEBA KeContact P40 Modbus special aliases ---
      // KEBA P40 exposes write registers in mA and uses a fixed Modbus/TCP Unit-ID 255.
      // P40 releases charging by writing the Max Current register (5004, mA); 0 mA blocks charging.
      try {
        const tplIdLower = String(this.template?.id || '').toLowerCase();
        const mfrLower = String(this.template?.manufacturer || '').toLowerCase();
        const modelLower = String(this.template?.model || '').toLowerCase();
        const isKebaP40 = (mfrLower === 'keba' || tplIdLower.includes('keba')) && (tplIdLower.includes('keba') || modelLower.includes('p40'));
        if (isKebaP40) {
          const toNum = (v) => {
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'string') {
              const n = Number(v.trim());
              return Number.isFinite(n) ? n : undefined;
            }
            return undefined;
          };

          const kebaStatusDp = getAnyById('cHARGING_STATE');
          const kebaCableDp = getAnyById('cABLE_STATE');
          const kebaErrorDp = getAnyById('eRROR_CODE');
          const kebaFastChargingStateDp = getAnyById('fAST_CHARGING_STATE');
          const kebaPhaseStateDp = getAnyById('pHASE_SWITCH_STATE');
          const kebaSetCurrentDp = getAnyById('sET_CHARGING_CURRENT');
          const kebaSetEnableDp = getAnyById('sET_ENABLE');
          const kebaSetUnlockDp = getAnyById('sET_UNLOCK_PLUG');
          const kebaSetPhaseSourceDp = getAnyById('sET_PHASE_SWITCH_SOURCE');
          const kebaSetPhaseTriggerDp = getAnyById('sET_TRIGGER_PHASE_SWITCH');
          const kebaSetFailsafeCurrentDp = getAnyById('sET_FAILSAFE_CURRENT');
          const kebaSetFailsafeTimeoutDp = getAnyById('sET_FAILSAFE_TIMEOUT') || getAnyById('wRITE_FAILSAFE_TIMEOUT');
          const kebaActivateFastChargingDp = getAnyById('aCTIVATE_FAST_CHARGING');
          const kebaFailsafeCurrentDp = getAnyById('fAILSAFE_CURRENT_SETTING');
          const kebaFailsafeTimeoutDp = getAnyById('fAILSAFE_TIMEOUT_SETTING');
          const kebaMaxCurrentDp = getAnyById('mAX_CHARGING_CURRENT');
          const kebaMaxSupportedCurrentDp = getAnyById('mAX_SUPPORTED_CURRENT');
          const kebaCurrentL1Dp = getAnyById('currentL1');
          const kebaCurrentL2Dp = getAnyById('currentL2');
          const kebaCurrentL3Dp = getAnyById('currentL3');
          const kebaVoltageL1Dp = getAnyById('voltageL1');
          const kebaVoltageL2Dp = getAnyById('voltageL2');
          const kebaVoltageL3Dp = getAnyById('voltageL3');
          const kebaPowerFactorDp = getAnyById('pOWER_FACTOR');

          const kebaCurrentDpIsAmp = (dp) => {
            if (!dp) return false;
            const unit = String(dp.unit || '').trim().toLowerCase();
            if (unit === 'a' || unit === 'amp' || unit === 'ampere') return true;
            const sf = Number(dp.source && dp.source.scaleFactor);
            return Number.isFinite(sf) && sf === -3;
          };
          const kebaCurrentFromDp = (dp, v) => {
            const n = toNum(v);
            if (!Number.isFinite(n)) return undefined;
            return kebaCurrentDpIsAmp(dp) ? n : (n / 1000);
          };
          const kebaCurrentToDp = (dp, v, opts = {}) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return v;
            let a = n;
            if (a <= 0) a = 0;
            else {
              const minA = Number(opts.minA ?? 6);
              const maxA = Number(opts.maxA ?? 32);
              if (Number.isFinite(minA) && a < minA) a = minA;
              if (Number.isFinite(maxA) && a > maxA) a = maxA;
            }
            return kebaCurrentDpIsAmp(dp) ? a : Math.round(a * 1000);
          };

          const statusText = (n) => ({
            0: 'Starting',
            1: 'Not ready for charging',
            2: 'Ready for charging / waiting for EV',
            3: 'Charging',
            4: 'Error',
            5: 'Charging interrupted / rejected',
          })[Math.trunc(n)] || `Unknown (${Math.trunc(n)})`;

          if (kebaStatusDp) {
            add({
              relId: this._aliasRelId('r.statusCode'),
              name: 'Status code',
              role: 'indicator.status',
              type: 'number',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaStatusDp.id,
              replace: true,
            });
            add({
              relId: this._aliasRelId('r.statusText'),
              name: 'Status text',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const n = toNum(values && values[kebaStatusDp.id]);
                return Number.isFinite(n) ? statusText(n) : '';
              }
            });
            add({
              relId: this._aliasRelId('r.charging'),
              name: 'Charging active',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const n = toNum(values && values[kebaStatusDp.id]);
                if (Number.isFinite(n)) return Math.trunc(n) === 3;
                const p = chargingPowerDp ? toNum(values && values[chargingPowerDp.id]) : undefined;
                return Number.isFinite(p) ? p > 50 : undefined;
              }
            });
            add({
              relId: this._aliasRelId('r.available'),
              name: 'EVCS available / ready',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const n = toNum(values && values[kebaStatusDp.id]);
                if (!Number.isFinite(n)) return undefined;
                const c = Math.trunc(n);
                return c === 2 || c === 3;
              }
            });
          }

          if (kebaCableDp) {
            add({
              relId: this._aliasRelId('r.cableState'),
              name: 'Cable state',
              role: 'indicator',
              type: 'number',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaCableDp.id,
            });
            add({
              relId: this._aliasRelId('r.vehicleConnected'),
              name: 'Vehicle connected',
              role: 'indicator.connected',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const n = toNum(values && values[kebaCableDp.id]);
                if (!Number.isFinite(n)) return undefined;
                return [5, 7].includes(Math.trunc(n));
              }
            });
          }

          if (kebaCurrentL1Dp) {
            add({ relId: this._aliasRelId('r.currentL1'), name: 'Current L1', role: 'value.current', type: 'number', unit: 'A', rw: 'ro', kind: 'dp', dpId: kebaCurrentL1Dp.id, fromDevice: (v) => kebaCurrentFromDp(kebaCurrentL1Dp, v), replace: true });
          }
          if (kebaCurrentL2Dp) {
            add({ relId: this._aliasRelId('r.currentL2'), name: 'Current L2', role: 'value.current', type: 'number', unit: 'A', rw: 'ro', kind: 'dp', dpId: kebaCurrentL2Dp.id, fromDevice: (v) => kebaCurrentFromDp(kebaCurrentL2Dp, v), replace: true });
          }
          if (kebaCurrentL3Dp) {
            add({ relId: this._aliasRelId('r.currentL3'), name: 'Current L3', role: 'value.current', type: 'number', unit: 'A', rw: 'ro', kind: 'dp', dpId: kebaCurrentL3Dp.id, fromDevice: (v) => kebaCurrentFromDp(kebaCurrentL3Dp, v), replace: true });
          }

          if (kebaVoltageL1Dp) {
            add({ relId: this._aliasRelId('r.voltageL1'), name: 'Voltage L1', role: 'value.voltage', type: 'number', unit: 'V', rw: 'ro', kind: 'dp', dpId: kebaVoltageL1Dp.id, replace: true });
          }
          if (kebaVoltageL2Dp) {
            add({ relId: this._aliasRelId('r.voltageL2'), name: 'Voltage L2', role: 'value.voltage', type: 'number', unit: 'V', rw: 'ro', kind: 'dp', dpId: kebaVoltageL2Dp.id, replace: true });
          }
          if (kebaVoltageL3Dp) {
            add({ relId: this._aliasRelId('r.voltageL3'), name: 'Voltage L3', role: 'value.voltage', type: 'number', unit: 'V', rw: 'ro', kind: 'dp', dpId: kebaVoltageL3Dp.id, replace: true });
          }
          if (kebaPowerFactorDp) {
            add({ relId: this._aliasRelId('r.powerFactor'), name: 'Power factor', role: 'value', type: 'number', unit: '%', rw: 'ro', kind: 'dp', dpId: kebaPowerFactorDp.id, replace: true });
          }

          if (kebaMaxCurrentDp) {
            add({
              relId: this._aliasRelId('r.currentLimitA'),
              name: 'Charging current limit',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaMaxCurrentDp.id,
              fromDevice: (v) => kebaCurrentFromDp(kebaMaxCurrentDp, v),
              replace: true,
            });
          }

          if (kebaMaxSupportedCurrentDp) {
            add({
              relId: this._aliasRelId('r.maxSupportedCurrentA'),
              name: 'Maximum supported current',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaMaxSupportedCurrentDp.id,
              fromDevice: (v) => kebaCurrentFromDp(kebaMaxSupportedCurrentDp, v),
            });
          }

          if (kebaErrorDp) {
            add({
              relId: this._aliasRelId('r.errorCode'),
              name: 'EVSE error code',
              role: 'indicator.status',
              type: 'number',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaErrorDp.id,
              replace: true,
            });
          }

          if (kebaFastChargingStateDp) {
            add({
              relId: this._aliasRelId('r.fastCharging'),
              name: 'Fast charging active',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaFastChargingStateDp.id,
              fromDevice: (v) => {
                const n = toNum(v);
                return Number.isFinite(n) ? Math.trunc(n) === 1 : undefined;
              },
            });
          }

          if (kebaPhaseStateDp) {
            add({
              relId: this._aliasRelId('r.phaseMode'),
              name: 'Charge using phases',
              role: 'value',
              type: 'number',
              unit: 'phases',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaPhaseStateDp.id,
              states: { 1: '1 phase', 3: '3 phases' },
            });
          }

          if (kebaFailsafeCurrentDp) {
            add({
              relId: this._aliasRelId('r.failsafeCurrentA'),
              name: 'Failsafe current',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaFailsafeCurrentDp.id,
              fromDevice: (v) => kebaCurrentFromDp(kebaFailsafeCurrentDp, v),
            });
          }

          if (kebaFailsafeTimeoutDp) {
            add({
              relId: this._aliasRelId('r.failsafeTimeoutS'),
              name: 'Failsafe timeout',
              role: 'value',
              type: 'number',
              unit: 's',
              rw: 'ro',
              kind: 'dp',
              dpId: kebaFailsafeTimeoutDp.id,
            });
          }

          if (kebaSetEnableDp && (kebaSetEnableDp.rw === 'rw' || kebaSetEnableDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.stationEnable'),
              name: 'Enable / disable charging station',
              role: 'switch',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: kebaSetEnableDp.id,
              writeDpId: kebaSetEnableDp.id,
              toDevice: (v) => (v ? 1 : 0),
              fromDevice: (v) => {
                if (typeof v === 'boolean') return v;
                const n = toNum(v);
                return Number.isFinite(n) ? Math.trunc(n) !== 0 : undefined;
              },
              preferCommandValue: true,
              commandOnlyAlias: true,
            });
          }

          if (kebaSetUnlockDp && (kebaSetUnlockDp.rw === 'rw' || kebaSetUnlockDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.unlockPlug'),
              name: 'Unlock plug',
              role: 'button',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: kebaSetUnlockDp.id,
              writeDpId: kebaSetUnlockDp.id,
              // KEBA P40 register 5012 supports only value 0 = unlock plug. This is a
              // one-shot command; after a successful command the button alias returns to false.
              toDevice: (v) => (v ? 0 : undefined),
              fromDevice: () => false,
              preferCommandValue: true,
              commandOnlyAlias: true,
            });
          }

          if (kebaSetPhaseTriggerDp && (kebaSetPhaseTriggerDp.rw === 'rw' || kebaSetPhaseTriggerDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.phaseMode'),
              name: 'Charge using phases',
              role: 'level',
              type: 'number',
              unit: 'phases',
              rw: 'rw',
              kind: 'dp',
              dpId: kebaPhaseStateDp ? kebaPhaseStateDp.id : kebaSetPhaseTriggerDp.id,
              writeDpId: kebaSetPhaseTriggerDp.id,
              states: { 1: '1 phase', 3: '3 phases' },
              toDevice: (v) => {
                const n = Math.trunc(Number(v));
                if (n === 1) return 0;
                if (n === 3) return 1;
                return v;
              },
              fromDevice: (v) => {
                const n = toNum(v);
                return Number.isFinite(n) ? Math.trunc(n) : undefined;
              },
              preferCommandValue: true,
            });
          }

          if (kebaSetFailsafeCurrentDp && (kebaSetFailsafeCurrentDp.rw === 'rw' || kebaSetFailsafeCurrentDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.failsafeCurrentA'),
              name: 'Failsafe current',
              role: 'level.current',
              type: 'number',
              unit: 'A',
              rw: 'rw',
              kind: 'dp',
              dpId: kebaFailsafeCurrentDp ? kebaFailsafeCurrentDp.id : kebaSetFailsafeCurrentDp.id,
              writeDpId: kebaSetFailsafeCurrentDp.id,
              toDevice: (v) => kebaCurrentToDp(kebaSetFailsafeCurrentDp, v),
              fromDevice: (v) => kebaCurrentFromDp(kebaFailsafeCurrentDp || kebaSetFailsafeCurrentDp, v),
              preferCommandValue: true,
            });
          }

          if (kebaSetFailsafeTimeoutDp && (kebaSetFailsafeTimeoutDp.rw === 'rw' || kebaSetFailsafeTimeoutDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.failsafeTimeoutS'),
              name: 'Failsafe timeout',
              role: 'level',
              type: 'number',
              unit: 's',
              rw: 'rw',
              kind: 'dp',
              dpId: kebaFailsafeTimeoutDp ? kebaFailsafeTimeoutDp.id : kebaSetFailsafeTimeoutDp.id,
              writeDpId: kebaSetFailsafeTimeoutDp.id,
              preferCommandValue: true,
            });
          }

          if (kebaActivateFastChargingDp && (kebaActivateFastChargingDp.rw === 'rw' || kebaActivateFastChargingDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.fastCharge'),
              name: 'Activate fast charging',
              role: 'button',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: kebaActivateFastChargingDp.id,
              writeDpId: kebaActivateFastChargingDp.id,
              // KEBA P40 register 5200 supports only value 1 = activate fast charging. This is a
              // one-shot command; use aliases.r.fastCharging for the actual readback state.
              toDevice: (v) => (v ? 1 : undefined),
              fromDevice: () => false,
              preferCommandValue: true,
              commandOnlyAlias: true,
            });
          }

          if (kebaSetCurrentDp && (kebaSetCurrentDp.rw === 'rw' || kebaSetCurrentDp.rw === 'wo')) {
            const toKebaMilliAmp = (v) => kebaCurrentToDp(kebaSetCurrentDp, v);
            const fromKebaMilliAmp = (v) => kebaCurrentFromDp(kebaMaxCurrentDp || kebaSetCurrentDp, v);
            add({
              relId: this._aliasRelId('ctrl.currentLimitA'),
              name: 'Charging current limit',
              role: 'level.current',
              type: 'number',
              unit: 'A',
              rw: 'rw',
              kind: 'dp',
              dpId: kebaMaxCurrentDp ? kebaMaxCurrentDp.id : kebaSetCurrentDp.id,
              writeDpId: kebaSetCurrentDp.id,
              toDevice: toKebaMilliAmp,
              fromDevice: fromKebaMilliAmp,
              preferCommandValue: true,
              replace: true,
            });
          }

          if (kebaSetCurrentDp && (kebaSetCurrentDp.rw === 'rw' || kebaSetCurrentDp.rw === 'wo')) {
            const defaultRunCurrentA = Number(this.template?.driverHints?.keba?.runCurrentA ?? 16);
            const stopCurrentA = Number(this.template?.driverHints?.keba?.stopCurrentA ?? 0);
            const toRunMilliAmp = (v) => {
              const runA = Number.isFinite(defaultRunCurrentA) && defaultRunCurrentA > 0 ? defaultRunCurrentA : 16;
              const stopA = Number.isFinite(stopCurrentA) && stopCurrentA >= 0 ? stopCurrentA : 0;
              if (typeof v === 'boolean') return kebaCurrentToDp(kebaSetCurrentDp, v ? runA : stopA);
              const n = Number(v);
              return Number.isFinite(n) ? kebaCurrentToDp(kebaSetCurrentDp, n ? runA : stopA) : v;
            };
            const runAlias = {
              name: 'Run / charging release',
              role: 'switch',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: kebaMaxCurrentDp ? kebaMaxCurrentDp.id : kebaSetCurrentDp.id,
              writeDpId: kebaSetCurrentDp.id,
              toDevice: toRunMilliAmp,
              fromDevice: (v) => {
                const n = kebaCurrentFromDp(kebaMaxCurrentDp || kebaSetCurrentDp, v);
                return Number.isFinite(n) ? n > 0.1 : undefined;
              },
              preferCommandValue: true,
              replace: true,
            };
            add({ relId: this._aliasRelId('ctrl.run'), ...runAlias });
            add({ relId: this._aliasRelId('ctrl.chargeEnable'), ...runAlias, name: 'Charging release' });
          }
        }
      } catch (e) {
        // Never break generic EVCS alias generation due to KEBA-specific helpers.
      }

      // Read: status code (best-effort)
      const statusDp =
        getAnyById('eVSE_STATE', 'cHARGE_POINT_STATE', 'gOE_STATE') ||
        this._findFirstDatapoint(dp => /(^state$|_state$)/i.test(String(dp.id || '')) && dp.rw !== 'wo' && !/^station_/i.test(String(dp.id))) ||
        getAnyById('station_state') ||
        this._findFirstDatapoint(dp => /state/i.test(String(dp.id || '')) && dp.rw !== 'wo');

      if (statusDp) {
        add({
          relId: this._aliasRelId('r.statusCode'),
          name: 'Status code',
          role: 'indicator.status',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: statusDp.id,
        });
      }

      // Read: error code -> alarm.fault
      const errorDp =
        getAnyById('eVSE_ERROR_CODE', 'eRROR_CODE') ||
        findByIdRe(/error_code/i) ||
        this._findFirstDatapoint(dp => /error/i.test(String(dp.id || '')) && dp.rw !== 'wo');

      // Some devices expose several error-code words/blocks (e.g. Mennekes: 4 x uint32).
      // Use the first one for r.errorCode, but treat any non-zero block as fault.
      const errorDpsForFault = [];
      const pushErrorDp = (dp) => {
        if (!dp || !dp.id) return;
        if (errorDpsForFault.find(x => x.id === dp.id)) return;
        errorDpsForFault.push(dp);
      };
      pushErrorDp(errorDp);
      for (const dp of this.getDatapoints()) {
        if (!dp || !dp.id || dp.rw === 'wo') continue;
        const id = String(dp.id || '');
        if (/^eRROR_CODE(_\d+)?$/i.test(id) || /error_code/i.test(id)) pushErrorDp(dp);
      }

      if (errorDp) {
        add({
          relId: this._aliasRelId('r.errorCode'),
          name: 'Error code',
          role: 'indicator',
          type: 'number',
          rw: 'ro',
          kind: 'dp',
          dpId: errorDp.id,
        });

        add({
          relId: this._aliasRelId('alarm.fault'),
          name: 'Fault active',
          role: 'indicator.alarm',
          type: 'boolean',
          rw: 'ro',
          kind: 'computed',
          get: (values) => {
            if (!values) return false;
            for (const edp of errorDpsForFault) {
              const v = values[edp.id];
              if (typeof v === 'number' && v !== 0) return true;
            }
            return false;
          }
        });
      }


      // --- DEPower Modbus V10.03 AC/DC charge-point aliases ---
      // The stable legacy template IDs still contain `oem` for installed-device compatibility.
      // The supplied register workbook uses one common map for AC wallboxes and DC
      // charging stations. GUN_TYPE selects AC 1-phase, AC 3-phase or DC at runtime.
      // Start/stop is not a 0/1 flag: register Charge command requires 1=start, 2=stop.
      try {
        const tplIdLower = String(this.template?.id || '').toLowerCase();
        const isOemModbusV1003 = tplIdLower.includes('evcs.oem.modbusv1003.connector');
        if (isOemModbusV1003) {
          const toNum = (value) => {
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            if (typeof value === 'boolean') return value ? 1 : 0;
            if (typeof value === 'string') {
              const text = value.trim().replace(',', '.');
              if (!text) return undefined;
              const parsed = Number(text);
              return Number.isFinite(parsed) ? parsed : undefined;
            }
            return undefined;
          };
          const readNumber = (values, dp) => dp ? toNum(values && values[dp.id]) : undefined;

          const gunTypeDp = getAnyById('gUN_TYPE');
          const connectorStateDp = getAnyById('eVSE_STATE');
          const universalStateDp = getAnyById('uNIVERSAL_CONNECTOR_STATE');
          const stationStatusDp = getAnyById('sTATION_STATUS');
          const plugStateDp = getAnyById('pLUG_STATE') || getAnyById('uNIVERSAL_CABLE_STATE');
          const errorCodeDp = getAnyById('eRROR_CODE');
          const universalErrorDp = getAnyById('uNIVERSAL_ERROR_CODE');
          const powerDp = getAnyById('aCTIVE_POWER');
          const dcCurrentDp = getAnyById('dC_CURRENT');
          const currentL1Dp = getAnyById('cURRENT_L1');
          const currentL2Dp = getAnyById('cURRENT_L2');
          const currentL3Dp = getAnyById('cURRENT_L3');
          const voltageL1Dp = getAnyById('vOLTAGE_L1');
          const voltageL2Dp = getAnyById('vOLTAGE_L2');
          const voltageL3Dp = getAnyById('vOLTAGE_L3');
          const maxCurrentDp = getAnyById('mAX_SUPPORTED_CURRENT');
          const sessionTimeDp = getAnyById('cHARGING_DURATION');
          const cableCurrentDp = getAnyById('cABLE_CURRENT_LIMIT');
          const setPowerDp = getAnyById('eV_SET_CHARGE_POWER_LIMIT');
          const chargeCommandDp = getAnyById('cHARGE_COMMAND');
          const chargingSocDp = getAnyById('cHARGING_SOC');
          const thresholdRaw = Number(this.template?.driverHints?.oemModbusV1003?.statePowerThresholdW ?? 50);
          const powerThresholdW = Number.isFinite(thresholdRaw) && thresholdRaw >= 0 ? thresholdRaw : 50;

          const connectorState = (values) => {
            const direct = readNumber(values, connectorStateDp);
            if (Number.isFinite(direct)) return Math.trunc(direct);
            const fallback = readNumber(values, universalStateDp);
            return Number.isFinite(fallback) ? Math.trunc(fallback) : undefined;
          };
          const errorCode = (values) => {
            const direct = readNumber(values, errorCodeDp);
            if (Number.isFinite(direct)) return Math.trunc(direct);
            const fallback = readNumber(values, universalErrorDp);
            return Number.isFinite(fallback) ? Math.trunc(fallback) : undefined;
          };
          const stateLabel = (state) => ({
            0: 'Idle',
            1: 'Prepare',
            2: 'Charging',
            3: 'Suspended by EV',
            4: 'Finished',
            5: 'Fault',
            6: 'Reserved',
            7: 'Unavailable',
            8: 'Suspended by EVSE',
          })[state] || `Unknown (${state})`;

          add({
            relId: this._aliasRelId('r.statusCode'),
            name: 'Connector status code',
            role: 'indicator.status',
            type: 'number',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => connectorState(values),
          });
          add({
            relId: this._aliasRelId('r.statusText'),
            name: 'Connector status',
            role: 'text',
            type: 'string',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const state = connectorState(values);
              return Number.isFinite(state) ? stateLabel(state) : '';
            },
          });
          add({
            relId: this._aliasRelId('r.available'),
            name: 'Connector available',
            role: 'indicator.available',
            type: 'boolean',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const station = readNumber(values, stationStatusDp);
              const state = connectorState(values);
              if (Number.isFinite(station) && Math.trunc(station) !== 0) return false;
              if (Number.isFinite(state)) return ![5, 7].includes(Math.trunc(state));
              return Number.isFinite(station) ? Math.trunc(station) === 0 : undefined;
            },
          });
          add({
            relId: this._aliasRelId('r.vehicleConnected'),
            name: 'Vehicle connected',
            role: 'indicator.connected',
            type: 'boolean',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const plug = readNumber(values, plugStateDp);
              if (Number.isFinite(plug)) return Math.trunc(plug) === 1;
              const state = connectorState(values);
              return Number.isFinite(state) ? [1, 2, 3, 4, 8].includes(Math.trunc(state)) : undefined;
            },
          });
          add({
            relId: this._aliasRelId('r.charging'),
            name: 'Charging active',
            role: 'indicator',
            type: 'boolean',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const state = connectorState(values);
              if (Number.isFinite(state)) return Math.trunc(state) === 2;
              const power = readNumber(values, powerDp);
              return Number.isFinite(power) ? power > powerThresholdW : undefined;
            },
          });
          add({
            relId: this._aliasRelId('r.chargingReleased'),
            name: 'Charging released by connector state',
            role: 'indicator',
            type: 'boolean',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const state = connectorState(values);
              // Prepare only confirms that the EV/connector handshake has started. It is
              // not a positive release acknowledgement. Treat Charging and SuspendEV as
              // released; SuspendEVSE remains blocked by the station/EMS.
              return Number.isFinite(state) ? [2, 3].includes(Math.trunc(state)) : undefined;
            },
          });
          add({
            relId: this._aliasRelId('r.errorCode'),
            name: 'Connector error code',
            role: 'indicator',
            type: 'number',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => errorCode(values),
          });
          add({
            relId: this._aliasRelId('alarm.fault'),
            name: 'Connector fault',
            role: 'indicator.alarm',
            type: 'boolean',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const error = errorCode(values);
              if (Number.isFinite(error) && error !== 0) return true;
              const state = connectorState(values);
              if (Number.isFinite(state) && Math.trunc(state) === 5) return true;
              const station = readNumber(values, stationStatusDp);
              return Number.isFinite(station) ? Math.trunc(station) === 2 : false;
            },
          });
          for (const [pathName, phaseDp, label] of [
            ['r.voltageL1', voltageL1Dp, 'Voltage L1'],
            ['r.voltageL2', voltageL2Dp, 'Voltage L2'],
            ['r.voltageL3', voltageL3Dp, 'Voltage L3'],
          ]) {
            if (!phaseDp) continue;
            add({
              relId: this._aliasRelId(pathName),
              name: label,
              role: 'value.voltage',
              type: 'number',
              unit: 'V',
              rw: 'ro',
              kind: 'dp',
              dpId: phaseDp.id,
              replace: true,
            });
          }
          for (const [pathName, phaseDp, label] of [
            ['r.currentL1', currentL1Dp, 'Current L1'],
            ['r.currentL2', currentL2Dp, 'Current L2'],
            ['r.currentL3', currentL3Dp, 'Current L3'],
          ]) {
            if (!phaseDp) continue;
            add({
              relId: this._aliasRelId(pathName),
              name: label,
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: phaseDp.id,
              replace: true,
            });
          }

          add({
            relId: this._aliasRelId('r.currentA'),
            name: 'Actual charging current',
            role: 'value.current',
            type: 'number',
            unit: 'A',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const gunType = readNumber(values, gunTypeDp);
              const dc = readNumber(values, dcCurrentDp);
              const phaseValues = [currentL1Dp, currentL2Dp, currentL3Dp]
                .map((dp) => readNumber(values, dp))
                .filter((value) => Number.isFinite(value) && value >= 0);
              if (Math.trunc(gunType) === 3 && Number.isFinite(dc)) return Math.max(0, dc);
              if ([1, 2].includes(Math.trunc(gunType)) && phaseValues.length) return Math.max(...phaseValues);
              const all = phaseValues.slice();
              if (Number.isFinite(dc) && dc >= 0) all.push(dc);
              return all.length ? Math.max(...all) : undefined;
            },
          });

          if (chargingSocDp) {
            add({
              relId: this._aliasRelId('r.soc'),
              name: 'Vehicle state of charge',
              role: 'value.battery',
              type: 'number',
              unit: '%',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const n = readNumber(values, chargingSocDp);
                if (!Number.isFinite(n)) return null;
                const soc = Math.round(n);
                // Keep the raw register visible for diagnostics, but do not pass
                // Modbus sentinel/out-of-range values into the NexoWatt UI alias.
                return soc >= 0 && soc <= 100 ? soc : null;
              },
            });
          }

          if (maxCurrentDp) {
            add({
              relId: this._aliasRelId('r.maxSupportedCurrentA'),
              name: 'Maximum supported current',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: maxCurrentDp.id,
              replace: true,
            });
          }
          if (sessionTimeDp) {
            add({
              relId: this._aliasRelId('r.sessionTimeS'),
              name: 'Charging session time',
              role: 'value.interval',
              type: 'number',
              unit: 's',
              rw: 'ro',
              kind: 'dp',
              dpId: sessionTimeDp.id,
              replace: true,
            });
          }
          if (cableCurrentDp) {
            add({
              relId: this._aliasRelId('r.proximityCurrentA'),
              name: 'Cable current limit',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: cableCurrentDp.id,
              replace: true,
            });
          }
          if (plugStateDp) {
            add({
              relId: this._aliasRelId('r.cableState'),
              name: 'Plug state',
              role: 'indicator',
              type: 'number',
              rw: 'ro',
              kind: 'dp',
              dpId: plugStateDp.id,
              replace: true,
            });
          }

          if (setPowerDp && (setPowerDp.rw === 'rw' || setPowerDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('r.powerLimitW'),
              name: 'Connector power limit',
              role: 'value.power',
              type: 'number',
              unit: 'W',
              rw: 'ro',
              kind: 'dp',
              dpId: setPowerDp.id,
              replace: true,
            });
            add({
              relId: this._aliasRelId('ctrl.powerLimitW'),
              name: 'Connector charging power limit',
              role: 'level.power',
              type: 'number',
              unit: 'W',
              rw: 'rw',
              kind: 'dp',
              dpId: setPowerDp.id,
              writeDpId: setPowerDp.id,
              commandOnlyAlias: true,
              preferCommandValue: true,
              replace: true,
              toDevice: (value) => {
                const n = toNum(value);
                return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
              },
              fromDevice: (value) => {
                const n = toNum(value);
                return Number.isFinite(n) ? n : undefined;
              },
            });
          }

          if (chargeCommandDp && (chargeCommandDp.rw === 'rw' || chargeCommandDp.rw === 'wo')) {
            const runAlias = {
              role: 'switch',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: chargeCommandDp.id,
              writeDpId: chargeCommandDp.id,
              commandOnlyAlias: true,
              preferCommandValue: true,
              replace: true,
              toDevice: (value) => {
                if (typeof value === 'boolean') return value ? 1 : 2;
                if (typeof value === 'string') {
                  const text = value.trim().toLowerCase();
                  if (['true', 'on', 'start', 'enable', 'enabled'].includes(text)) return 1;
                  if (['false', 'off', 'stop', 'disable', 'disabled'].includes(text)) return 2;
                }
                const n = toNum(value);
                if (!Number.isFinite(n)) return undefined;
                if (Math.trunc(n) === 1) return 1;
                if (Math.trunc(n) === 2 || Math.trunc(n) === 0) return 2;
                return undefined;
              },
              // Command-only aliases are updated from the last command value (1/2),
              // never from the connector state. This prevents Stop=2 from being treated
              // as truthy by a generic 0/1 conversion.
              fromDevice: (value) => {
                const n = toNum(value);
                if (!Number.isFinite(n)) return undefined;
                if (Math.trunc(n) === 1) return true;
                if (Math.trunc(n) === 2) return false;
                return undefined;
              },
            };
            add({ relId: this._aliasRelId('ctrl.run'), name: 'Run / start charging', ...runAlias });
            add({ relId: this._aliasRelId('ctrl.chargeEnable'), name: 'Charging release', ...runAlias });
          }
        }
      } catch (e) {
        // Never break generic EVCS alias generation due to the OEM V10.03 mapping.
      }

      // --- MENNEKES AMTRON 4You 500 / 4Business 700 special aliases ---
      // The charging-point-network EMS limit consists of three registers (L1/L2/L3).
      // Expose a single user-friendly alias that writes all three registers with one FC16 block.
      try {
        const tplIdLower = String(this.template?.id || '').toLowerCase();
        const mfrLower = String(this.template?.manufacturer || '').toLowerCase();
        const isMennekesAmtron = (mfrLower === 'mennekes') || tplIdLower.includes('mennekes.amtron4you500');
        if (isMennekesAmtron) {
          const toNum = (v) => {
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'string') {
              const n = Number(v.trim());
              return Number.isFinite(n) ? n : undefined;
            }
            return undefined;
          };

          const ocppStatusDp = getAnyById('cHARGE_POINT_STATE');
          if (ocppStatusDp) {
            add({
              relId: this._aliasRelId('r.statusText'),
              name: 'Status text',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const n = toNum(values && values[ocppStatusDp.id]);
                if (!Number.isFinite(n)) return '';
                return ({
                  0: 'Undefined',
                  1: 'Available',
                  2: 'Preparing',
                  3: 'Charging',
                  4: 'SuspendedEVSE',
                  5: 'SuspendedEV',
                  6: 'Finishing',
                  7: 'Reserved',
                  8: 'Unavailable',
                  9: 'Faulted',
                })[Math.trunc(n)] || `Unknown (${Math.trunc(n)})`;
              }
            });
          }

          const vehicleStateDp = getAnyById('vEHICLE_STATE');
          if (vehicleStateDp) {
            add({
              relId: this._aliasRelId('r.vehicleStateText'),
              name: 'Vehicle state text',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const n = toNum(values && values[vehicleStateDp.id]);
                if (!Number.isFinite(n)) return '';
                return ({
                  1: 'A - no EV connected',
                  2: 'B - EV connected, not charging',
                  3: 'C - EV charging',
                  4: 'D - ventilation required',
                  5: 'E - error',
                })[Math.trunc(n)] || `Unknown (${Math.trunc(n)})`;
              }
            });
          }

          const netWriteDp = getAnyById('cHARGING_POINT_NETWORK_EMS_CURRENT_LIMIT');
          const netL1 = getAnyById('cHARGING_POINT_NETWORK_EMS_CURRENT_LIMIT_L1');
          const netL2 = getAnyById('cHARGING_POINT_NETWORK_EMS_CURRENT_LIMIT_L2');
          const netL3 = getAnyById('cHARGING_POINT_NETWORK_EMS_CURRENT_LIMIT_L3');
          if (netWriteDp && (netWriteDp.rw === 'rw' || netWriteDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.networkCurrentLimitA'),
              name: 'Charging point network EMS current limit',
              role: 'level.current',
              type: 'number',
              unit: 'A',
              rw: 'rw',
              kind: 'computed',
              writeDpId: netWriteDp.id,
              get: (values) => {
                const vals = [netL1, netL2, netL3]
                  .map(dp => dp ? toNum(values && values[dp.id]) : undefined)
                  .filter(v => Number.isFinite(v));
                if (!vals.length) return undefined;
                return Math.min(...vals);
              }
            });
          }

          const currentLimitDp = getAnyById('sET_CHARGING_CURRENT') || getAnyById('hEMS_CURRENT_LIMIT_A') || getAnyById('hEMS_CURRENT_LIMIT_LEGACY_0_1A') || getAnyById('hEMS_CURRENT_LIMIT_LEGACY_A');
          const powerLimitDp = getAnyById('eV_SET_CHARGE_POWER_LIMIT') || getAnyById('hEMS_POWER_LIMIT_LEGACY');
          const availabilityDp = getAnyById('cHARGE_POINT_AVAILABILITY');
          const chargingPowerAliasDp = chargingPowerDp || getAnyById('aCTIVE_POWER');
          const mennekesHints = (this.template && this.template.driverHints && this.template.driverHints.mennekes) || {};
          const runCurrentRaw = Number(mennekesHints.runCurrentA ?? mennekesHints.defaultEnableCurrentA ?? 16);
          const runCurrentA = Number.isFinite(runCurrentRaw) && runCurrentRaw > 0 ? runCurrentRaw : 16;
          const stopCurrentRaw = Number(mennekesHints.stopCurrentA ?? 0);
          const stopCurrentA = Number.isFinite(stopCurrentRaw) && stopCurrentRaw >= 0 ? stopCurrentRaw : 0;
          const powerThresholdWRaw = Number(mennekesHints.chargingPowerThresholdW ?? 50);
          const powerThresholdW = Number.isFinite(powerThresholdWRaw) && powerThresholdWRaw >= 0 ? powerThresholdWRaw : 50;

          if (currentLimitDp && (currentLimitDp.rw === 'rw' || currentLimitDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.currentLimitA'),
              name: 'HEMS current limit',
              role: 'level.current',
              type: 'number',
              unit: currentLimitDp.unit || 'A',
              rw: 'rw',
              kind: 'dp',
              dpId: currentLimitDp.id,
              writeDpId: currentLimitDp.id,
            });

            const runAlias = {
              name: 'Charging release',
              role: 'switch',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: currentLimitDp.id,
              writeDpId: currentLimitDp.id,
              toDevice: (v) => {
                const asBool = (typeof v === 'boolean') ? v : (Number.isFinite(Number(v)) ? Number(v) !== 0 : undefined);
                if (asBool === false) return stopCurrentA;
                if (asBool === true) {
                  // For Alfen the release switch must not overwrite an already commanded
                  // dynamic current limit.  Min+PV/PV modes often write 6 A first and then
                  // set run=true; returning a hard-coded 16 A here would cancel that 6 A
                  // command.  Reuse the latest desired current if present, otherwise fall
                  // back to the configured release current.
                  const key = String(primaryCurrentWriteDp.id);
                  const lastCmd = this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(key)
                    ? Number(this._lastCommandedValueByDpId.get(key))
                    : NaN;
                  if (Number.isFinite(lastCmd) && lastCmd > 0.1) return Math.round(lastCmd);
                  return runCurrentA;
                }
                return v;
              },
              fromDevice: (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n > 0.1 : undefined;
              },
            };
            add({ relId: this._aliasRelId('ctrl.run'), ...runAlias });
            add({ relId: this._aliasRelId('ctrl.chargeEnable'), ...runAlias, name: 'Charge enable' });
            add({
              relId: this._aliasRelId('r.chargingReleased'),
              name: 'Charging released by HEMS current limit',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'dp',
              dpId: currentLimitDp.id,
              fromDevice: (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n > 0.1 : undefined;
              },
            });
            add({
              relId: this._aliasRelId('r.currentLimitA'),
              name: 'HEMS current limit',
              role: 'value.current',
              type: 'number',
              unit: currentLimitDp.unit || 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: currentLimitDp.id,
            });
          }

          if (powerLimitDp && (powerLimitDp.rw === 'rw' || powerLimitDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.powerLimitW'),
              name: 'HEMS power limit',
              role: 'level.power',
              type: 'number',
              unit: powerLimitDp.unit || 'W',
              rw: 'rw',
              kind: 'dp',
              dpId: powerLimitDp.id,
              writeDpId: powerLimitDp.id,
            });
            add({
              relId: this._aliasRelId('r.powerLimitW'),
              name: 'HEMS power limit',
              role: 'value.power',
              type: 'number',
              unit: powerLimitDp.unit || 'W',
              rw: 'ro',
              kind: 'dp',
              dpId: powerLimitDp.id,
            });
          }

          if (vehicleStateDp) {
            add({
              relId: this._aliasRelId('r.vehicleConnected'),
              name: 'Vehicle connected',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const n = toNum(values && values[vehicleStateDp.id]);
                if (!Number.isFinite(n)) return undefined;
                const c = Math.trunc(n);
                return c >= 2 && c <= 4;
              },
            });
          }

          add({
            relId: this._aliasRelId('r.charging'),
            name: 'Charging active',
            role: 'indicator',
            type: 'boolean',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const status = ocppStatusDp ? toNum(values && values[ocppStatusDp.id]) : undefined;
              if (status === 3) return true;
              const veh = vehicleStateDp ? toNum(values && values[vehicleStateDp.id]) : undefined;
              if (veh === 3) return true;
              const p = chargingPowerAliasDp ? toNum(values && values[chargingPowerAliasDp.id]) : undefined;
              if (Number.isFinite(p)) return p > powerThresholdW;
              if (Number.isFinite(status)) return false;
              return undefined;
            },
          });

          if (availabilityDp || ocppStatusDp) {
            add({
              relId: this._aliasRelId('r.available'),
              name: 'Charge point available',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const a = availabilityDp ? toNum(values && values[availabilityDp.id]) : undefined;
                if (Number.isFinite(a)) return Math.trunc(a) === 1;
                const s = ocppStatusDp ? toNum(values && values[ocppStatusDp.id]) : undefined;
                if (Number.isFinite(s)) return ![8, 9].includes(Math.trunc(s));
                return undefined;
              },
            });
          }

          const safeCurrentDp = getAnyById('sAFE_CURRENT');
          if (safeCurrentDp && (safeCurrentDp.rw === 'rw' || safeCurrentDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.safeCurrentA'),
              name: 'Safe current on HEMS timeout',
              role: 'level.current',
              type: 'number',
              unit: safeCurrentDp.unit || 'A',
              rw: 'rw',
              kind: 'dp',
              dpId: safeCurrentDp.id,
              writeDpId: safeCurrentDp.id,
            });
          }

          const timeoutDp = getAnyById('cOMMUNICATION_TIMEOUT');
          if (timeoutDp && (timeoutDp.rw === 'rw' || timeoutDp.rw === 'wo')) {
            add({
              relId: this._aliasRelId('ctrl.communicationTimeoutS'),
              name: 'HEMS communication timeout',
              role: 'level.timer',
              type: 'number',
              unit: timeoutDp.unit || 's',
              rw: 'rw',
              kind: 'dp',
              dpId: timeoutDp.id,
              writeDpId: timeoutDp.id,
            });
          }

          const hemsConfigDp = getAnyById('hEMS_CONFIGURATION');
          if (hemsConfigDp) {
            add({
              relId: this._aliasRelId('r.hemsReadWriteEnabled'),
              name: 'HEMS read/write enabled',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              get: (values) => toNum(values && values[hemsConfigDp.id]) === 2,
            });
          }

          const hemsCommDp = getAnyById('hEMS_COMMUNICATION_STATUS');
          if (hemsCommDp) {
            add({
              relId: this._aliasRelId('r.hemsCommunicationTimeout'),
              name: 'HEMS communication timeout active',
              role: 'indicator.alarm',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              get: (values) => toNum(values && values[hemsCommDp.id]) === 1,
            });
          }


        }
      } catch (e) {
        // Never break alias generation due to special-case logic
      }


      // --- ABL EVCC2/3 (eMH1) special aliases (Modbus ASCII) ---
      // The EVCC2/3 API does not accept an ampere value at register 0x0014. It accepts
      // IEC 61851 PWM duty cycle in 0.1 % units. NexoWatt therefore keeps amperes at
      // the stable EOS alias and converts them before writing sET_ICMAX_DUTY_CYCLE_PCT.
      // 100 % is the documented normal pause/wait command ("no current available").
      // Register 0x0005 remains an expert/service state-transition command only.
      try {
        const tplIdLower = String(this.template?.id || '').toLowerCase();
        const mfrLower = String(this.template?.manufacturer || '').toLowerCase();
        const isAbl = (mfrLower === 'abl') || tplIdLower.startsWith('evcs.abl.');
        if (isAbl) {
          const icmaxDutyPctDp = getAnyById('iCMAX_DUTY_CYCLE_PCT');
          const setIcmaxDutyPctDp = getAnyById('sET_ICMAX_DUTY_CYCLE_PCT');

          const evseStateDpAbl = getAnyById('eVSE_STATE');

          const toNum = (v) => {
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (typeof v === 'string') {
              const normalized = v.trim().replace(',', '.');
              if (!normalized) return undefined;
              const direct = Number(normalized);
              if (Number.isFinite(direct)) return direct;
              const match = normalized.match(/[-+]?\d+(?:\.\d+)?/);
              if (!match) return undefined;
              const n = Number(match[0]);
              return Number.isFinite(n) ? n : undefined;
            }
            return undefined;
          };
          const round1 = (v) => {
            if (typeof v !== 'number' || !Number.isFinite(v)) return v;
            return Math.round((v + 1e-9) * 10) / 10;
          };
          // Truncate, rather than round up, so the advertised maximum current never
          // exceeds the ampere limit requested by the EMS. This also reproduces the
          // vendor example 10 A -> 16.6 % -> raw register value 166 exactly.
          const floor1 = (v) => {
            if (typeof v !== 'number' || !Number.isFinite(v)) return v;
            return Math.floor((v + 1e-9) * 10) / 10;
          };

          const isAblActiveDutyPct = (value) => {
            const pct = toNum(value);
            return Number.isFinite(pct) && pct >= 10 && pct <= 96;
          };

          // Safe direct-PWM alias normalization. Normal analogue charging is 10..96 %;
          // 100 % means no current available. Values in the reserved gaps are mapped to
          // pause instead of accidentally releasing an undefined current.
          const normalizeAblDutyPct = (value) => {
            const pctIn = toNum(value);
            if (!Number.isFinite(pctIn)) return value;
            if (pctIn < 10 || pctIn > 96) return 100;
            return floor1(pctIn);
          };

          // IEC 61851 current -> PWM conversion used by ABL register 0x0014.
          // 0 A or any sub-6-A request is represented as 100 % (wait/pause).
          const ablCurrentToDutyPct = (value) => {
            const aIn = toNum(value);
            if (!Number.isFinite(aIn)) return value;
            if (aIn < 6) return 100;

            const a = Math.min(80, aIn);
            if (a <= 51) {
              return Math.min(85, Math.max(10, floor1(a / 0.6)));
            }

            const highPct = (a / 2.5) + 64;
            // IEC 61851 has a discontinuity between the two formula ranges. For a
            // request below 52.75 A, 85.1 % would advertise more current than requested;
            // hold at the safe 51-A boundary (85 %) until the high range is reachable.
            if (highPct <= 85) return 85;
            return Math.min(96, floor1(highPct));
          };

          const ablDutyPctToCurrentA = (value) => {
            const pctIn = toNum(value);
            if (!Number.isFinite(pctIn)) return value;
            if (!isAblActiveDutyPct(pctIn)) return 0;

            // 85 % belongs to the 0.6 A/% range. The high-current formula starts
            // strictly above 85 %.
            const a = (pctIn > 85)
              ? (2.5 * (pctIn - 64))
              : (0.6 * pctIn);
            return round1(Math.max(0, a));
          };

          const getAblResumeDutyPct = () => {
            if (!setIcmaxDutyPctDp) return 10;
            const key = String(setIcmaxDutyPctDp.id);
            const candidates = [
              this._ablLastActiveDutyPctByDpId && this._ablLastActiveDutyPctByDpId.get(key),
              this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.get(key),
            ];
            for (const candidate of candidates) {
              if (isAblActiveDutyPct(candidate)) return floor1(toNum(candidate));
            }
            // Safe minimum charging release: 10 % = 6 A.
            return 10;
          };

          const ablRunToDutyPct = (value) => {
            if (typeof value === 'boolean') return value ? getAblResumeDutyPct() : 100;
            if (typeof value === 'string') {
              const normalized = value.trim().toLowerCase();
              if (['true', 'on', 'yes', 'ein', '1'].includes(normalized)) return getAblResumeDutyPct();
              if (['false', 'off', 'no', 'aus', '0'].includes(normalized)) return 100;
            }
            const n = toNum(value);
            if (Number.isFinite(n)) return n > 0 ? getAblResumeDutyPct() : 100;
            return value;
          };

          // Expose a readable state string for UIs / scripts
          if (evseStateDpAbl) {
            add({
              relId: this._aliasRelId('r.statusText'),
              name: 'Status text',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                if (!values) return '';
                const n = toNum(values[evseStateDpAbl.id]);
                if (!Number.isFinite(n)) return '';
                const code = (Math.trunc(n) & 0xFF);
                const map = {
                  0xA1: 'A1 Waiting for EV',
                  0xB1: 'B1 EV is asking for charging',
                  0xB2: 'B2 EV has the permission to charge',
                  0xC2: 'C2 EV is charged/charging',
                  0xC3: 'C3 Reduced current (error)',
                  0xC4: 'C4 Reduced current (imbalance)',
                  0xE0: 'E0 Outlet disabled',
                  0xE1: 'E1 Production test',
                  0xE2: 'E2 EVCC setup mode',
                  0xE3: 'E3 Bus idle',
                  0xF1: 'F1 Welding (contactor)',
                  0xF2: 'F2 Internal error',
                  0xF3: 'F3 DC residual current detected',
                  0xF4: 'F4 Upstream communication timeout',
                  0xF5: 'F5 Lock of socket failed',
                  0xF6: 'F6 CS out of range',
                  0xF7: 'F7 State D requested by EV',
                  0xF8: 'F8 CP out of range',
                  0xF9: 'F9 Overcurrent detected',
                  0xFA: 'F10 Temperature outside limits',
                  0xFB: 'F11 Unintended opened contact',
                };
                const label = map[code];
                const hex = code.toString(16).toUpperCase().padStart(2, '0');
                return label ? label : `Unknown (0x${hex})`;
              }
            });
          }

          const modbusSettingsRawDp = getAnyById('mODBUS_SETTINGS_RAW');

          if (modbusSettingsRawDp) {
            add({
              relId: this._aliasRelId('r.modbusSettingsRaw'),
              name: 'Modbus settings raw',
              role: 'value',
              type: 'number',
              rw: 'ro',
              kind: 'dp',
              dpId: modbusSettingsRawDp.id,
            });

            const decodeAblModbusSettings = (values) => {
              if (!values) return null;
              const rawNum = toNum(values[modbusSettingsRawDp.id]);
              if (!Number.isFinite(rawNum)) return null;
              const raw = Math.trunc(rawNum) & 0xFFFF;
              const stopBitsCode = (raw >>> 6) & 0x03;
              const parityCode = (raw >>> 4) & 0x03;
              const baudCode = raw & 0x0F;

              const stopBits = (stopBitsCode === 0) ? 1 : ((stopBitsCode === 3) ? 2 : null);
              const parity = ({ 0: 'none', 1: 'odd', 2: 'even' })[parityCode] || 'invalid';
              const baudRate = ({ 5: 9600, 6: 19200, 7: 38400, 8: 57600 })[baudCode] || null;

              return { raw, stopBitsCode, parityCode, baudCode, stopBits, parity, baudRate };
            };

            add({
              relId: this._aliasRelId('r.modbusStopBits'),
              name: 'Modbus stop bits',
              role: 'value',
              type: 'number',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const decoded = decodeAblModbusSettings(values);
                return decoded ? decoded.stopBits : undefined;
              }
            });

            add({
              relId: this._aliasRelId('r.modbusBaudRate'),
              name: 'Modbus baud rate',
              role: 'value',
              type: 'number',
              unit: 'Bd',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const decoded = decodeAblModbusSettings(values);
                return decoded ? decoded.baudRate : undefined;
              }
            });

            add({
              relId: this._aliasRelId('r.modbusParity'),
              name: 'Modbus parity',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const decoded = decodeAblModbusSettings(values);
                return decoded ? decoded.parity : '';
              }
            });

            add({
              relId: this._aliasRelId('r.modbusSettingsText'),
              name: 'Modbus settings',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const decoded = decodeAblModbusSettings(values);
                if (!decoded) return '';
                const baud = decoded.baudRate ?? `code:${decoded.baudCode}`;
                const stop = decoded.stopBits ?? `code:${decoded.stopBitsCode}`;
                const parity = decoded.parity || `code:${decoded.parityCode}`;
                return `${baud} / ${parity} / 8 / ${stop}`;
              }
            });
          }

          const currentL1Dp = getAnyById('cURRENT_L1');
          const currentL2Dp = getAnyById('cURRENT_L2');
          const currentL3Dp = getAnyById('cURRENT_L3');
          const currentDpsAbl = [currentL1Dp, currentL2Dp, currentL3Dp].filter(Boolean);
          const nominalPhaseVoltageV = 230;
          const getPhaseCurrentsA = (values) => {
            if (!values || !currentDpsAbl.length) return undefined;
            let seenAnyProperty = false;
            const currentsA = [];
            for (const dp of currentDpsAbl) {
              if (!Object.prototype.hasOwnProperty.call(values, dp.id)) continue;
              seenAnyProperty = true;
              const n = toNum(values[dp.id]);
              if (Number.isFinite(n) && n >= 0) currentsA.push(n);
            }
            if (!seenAnyProperty || currentsA.length === 0) return undefined;
            return currentsA;
          };
          const getPhaseCurrentSumA = (values) => {
            const currentsA = getPhaseCurrentsA(values);
            if (!currentsA) return undefined;
            return round1(currentsA.reduce((sum, value) => sum + value, 0));
          };
          const getActualChargingCurrentA = (values) => {
            const currentsA = getPhaseCurrentsA(values);
            if (!currentsA) return undefined;
            // ABL/IEC current limits are specified per phase. For one- and three-phase
            // vehicles the highest measured phase is therefore the comparable live value.
            return round1(Math.max(...currentsA));
          };

          if (currentDpsAbl.length) {
            if (currentL1Dp) add({
              relId: this._aliasRelId('r.currentL1'),
              name: 'Current L1',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: currentL1Dp.id,
              replace: true,
            });
            if (currentL2Dp) add({
              relId: this._aliasRelId('r.currentL2'),
              name: 'Current L2',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: currentL2Dp.id,
              replace: true,
            });
            if (currentL3Dp) add({
              relId: this._aliasRelId('r.currentL3'),
              name: 'Current L3',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: currentL3Dp.id,
              replace: true,
            });

            add({
              relId: this._aliasRelId('r.currentA'),
              name: 'Actual charging current (highest phase)',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'computed',
              get: (values) => getActualChargingCurrentA(values),
            });

            // Compatibility alias: this used to add L1+L2+L3 and therefore showed
            // 16.5 A for a balanced 3 x 5.5 A charge. Amperes must not be summed when
            // comparing the live current with the per-phase charging-current setpoint.
            add({
              relId: this._aliasRelId('r.currentTotalA'),
              name: 'Actual charging current (highest phase)',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => getActualChargingCurrentA(values),
            });

            // Keep the arithmetic phase-current sum available only as a diagnostic and
            // as the basis for the estimated power calculation below.
            add({
              relId: this._aliasRelId('r.currentPhaseSumA'),
              name: 'Phase-current sum (power calculation)',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'computed',
              get: (values) => getPhaseCurrentSumA(values),
            });
          }

          // The ABL EVCC2/3 API subset exposes current per phase, but no direct power register.
          // Derive a stable charging-power alias from the summed phase currents using 230 V per phase.
          // This matches single-phase and 3-phase AC charging well enough for UI/display purposes.
          if (!chargingPowerDp && currentDpsAbl.length) {
            add({
              relId: this._aliasRelId('r.power'),
              name: 'Charging power',
              role: 'value.power',
              type: 'number',
              unit: 'W',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const phaseSumA = getPhaseCurrentSumA(values);
                if (!Number.isFinite(phaseSumA)) return undefined;
                return Math.round(phaseSumA * nominalPhaseVoltageV);
              }
            });

            add({
              relId: this._aliasRelId('r.powerEstimated'),
              name: 'Charging power (estimated)',
              role: 'value.power',
              type: 'number',
              unit: 'W',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const phaseSumA = getPhaseCurrentSumA(values);
                if (!Number.isFinite(phaseSumA)) return undefined;
                return Math.round(phaseSumA * nominalPhaseVoltageV);
              }
            });
          }

          // Control: EOS provides amperes; the runtime writes PWM duty cycle to 0x0014.
          if (icmaxDutyPctDp && setIcmaxDutyPctDp) {
            add({
              relId: this._aliasRelId('r.currentLimitPct'),
              name: 'Applied PWM current limit',
              role: 'value',
              type: 'number',
              unit: '%',
              rw: 'ro',
              kind: 'dp',
              dpId: icmaxDutyPctDp.id,
              replace: true,
            });

            add({
              relId: this._aliasRelId('r.currentLimitA'),
              name: 'Applied charging current limit',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: icmaxDutyPctDp.id,
              fromDevice: ablDutyPctToCurrentA,
              replace: true,
            });

            add({
              relId: this._aliasRelId('r.waitingForCurrent'),
              name: 'Waiting for current release',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const pct = toNum(values && values[icmaxDutyPctDp.id]);
                return Number.isFinite(pct) ? pct >= 99.9 : undefined;
              },
            });

            add({
              relId: this._aliasRelId('r.chargingReleased'),
              name: 'Charging current released',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const pct = toNum(values && values[icmaxDutyPctDp.id]);
                return Number.isFinite(pct) ? isAblActiveDutyPct(pct) : undefined;
              },
            });

            // Expert/direct control in duty-cycle percent. The raw datapoint remains
            // available, but this stable alias accepts only 10..96 % or 100 % pause.
            add({
              relId: this._aliasRelId('ctrl.currentLimitPct'),
              name: 'Charging current limit (PWM duty cycle)',
              role: 'level',
              type: 'number',
              unit: '%',
              rw: 'rw',
              kind: 'dp',
              dpId: icmaxDutyPctDp.id,
              writeDpId: setIcmaxDutyPctDp.id,
              toDevice: normalizeAblDutyPct,
              preferCommandValue: true,
              replace: true,
            });

            // Primary NexoWatt EOS interface: write amperes, convert to ABL PWM percent.
            // Examples: 0 A -> 100 %, 6 A -> 10 %, 10 A -> 16.6 %, 16 A -> 26.6 %.
            add({
              relId: this._aliasRelId('ctrl.currentLimitA'),
              name: 'Charging current limit',
              role: 'level.current',
              type: 'number',
              unit: 'A',
              rw: 'rw',
              kind: 'dp',
              dpId: icmaxDutyPctDp.id,
              writeDpId: setIcmaxDutyPctDp.id,
              toDevice: ablCurrentToDutyPct,
              fromDevice: ablDutyPctToCurrentA,
              preferCommandValue: true,
              replace: true,
            });

            // Normal pause/resume is performed through Icmax, not through the service
            // state register 0x0005: false -> 100 %, true -> restore last active duty.
            const runAlias = {
              role: 'switch',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: icmaxDutyPctDp.id,
              writeDpId: setIcmaxDutyPctDp.id,
              toDevice: ablRunToDutyPct,
              fromDevice: (value) => isAblActiveDutyPct(value),
              preferCommandValue: true,
              replace: true,
            };

            add({
              relId: this._aliasRelId('ctrl.run'),
              name: 'Run / current release',
              ...runAlias,
            });
            add({
              relId: this._aliasRelId('ctrl.chargeEnable'),
              name: 'Charging current release',
              ...runAlias,
            });
          }
        }
      } catch (e) {
        // Never break alias generation due to special-case logic
      }

      // --- Weidmüller Charge Wallbox Business CH-W-B special aliases ---
      // The documented control interface separates the requested Ethernet release
      // (coil 400) from the actual aggregate release state (coil 436).  Keep those
      // paths separate so aliases.ctrl.run reports the charger-side result instead
      // of merely echoing the last command.
      try {
        const tplIdLower = String(this.template?.id || '').toLowerCase();
        const manufacturerLower = String(this.template?.manufacturer || '').toLowerCase();
        const modelLower = String(this.template?.model || '').toLowerCase();
        const isWeidmuellerBusiness =
          tplIdLower.includes('evcs.weidmueller.chargewallboxbusiness') ||
          ((manufacturerLower.includes('weidmüller') || manufacturerLower.includes('weidmueller')) &&
            modelLower.includes('charge wallbox business'));

        if (isWeidmuellerBusiness) {
          const evStateDp = getAnyById('eVSE_STATE');
          const proximityDp = getAnyById('pROXIMITY_CURRENT');
          const chargingTimeDp = getAnyById('cHARGING_TIME');
          const voltageL1Dp = getAnyById('vOLTAGE_L1');
          const voltageL2Dp = getAnyById('vOLTAGE_L2');
          const voltageL3Dp = getAnyById('vOLTAGE_L3');
          const currentL1Dp = getAnyById('cURRENT_L1');
          const currentL2Dp = getAnyById('cURRENT_L2');
          const currentL3Dp = getAnyById('cURRENT_L3');
          const pwmCurrentDp = getAnyById('pWM_CURRENT');
          const setCurrentDp = getAnyById('sET_CHARGING_CURRENT');
          const releaseCommandDp = getAnyById('sET_ENABLE');
          const releasedDp = getAnyById('cHARGING_RELEASED');
          const rfidReaderDp = getAnyById('rFID_READER_ENABLE');
          const rfidUidDp = getAnyById('rFID_CARD_UID');
          const firmwareDp = getAnyById('fIRMWARE_VERSION');

          const toNumber = (value) => {
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            if (typeof value === 'boolean') return value ? 1 : 0;
            if (typeof value === 'string') {
              const normalized = value.trim().replace(',', '.');
              if (!normalized) return undefined;
              const direct = Number(normalized);
              if (Number.isFinite(direct)) return direct;
              const match = normalized.match(/[-+]?\d+(?:\.\d+)?/);
              if (match) {
                const parsed = Number(match[0]);
                if (Number.isFinite(parsed)) return parsed;
              }
            }
            return undefined;
          };

          const evStateLetter = (value) => {
            if (typeof value === 'string') {
              const match = value.toUpperCase().match(/[A-F]/);
              if (match) return match[0];
            }
            const n = toNumber(value);
            if (!Number.isFinite(n)) return '';
            const raw = Math.trunc(n) & 0xFFFF;
            const low = raw & 0xFF;
            const high = (raw >>> 8) & 0xFF;
            if (low >= 65 && low <= 70) return String.fromCharCode(low);
            if (high >= 65 && high <= 70) return String.fromCharCode(high);
            if (raw >= 0 && raw <= 5) return String.fromCharCode(65 + raw);
            return '';
          };

          const stateInfoByLetter = {
            A: { code: 0, text: 'A - No vehicle connected', connected: false, charging: false, available: true, fault: false },
            B: { code: 1, text: 'B - Vehicle connected, not charging', connected: true, charging: false, available: true, fault: false },
            C: { code: 2, text: 'C - Vehicle charging', connected: true, charging: true, available: true, fault: false },
            D: { code: 3, text: 'D - Vehicle charging, ventilation required', connected: true, charging: true, available: true, fault: false },
            E: { code: 4, text: 'E - Error', connected: false, charging: false, available: false, fault: true },
            F: { code: 5, text: 'F - Error', connected: false, charging: false, available: false, fault: true },
          };

          const statusStates = {
            0: 'A - No vehicle connected',
            1: 'B - Vehicle connected, not charging',
            2: 'C - Vehicle charging',
            3: 'D - Vehicle charging, ventilation required',
            4: 'E - Error',
            5: 'F - Error',
          };

          const stateInfo = (values) => {
            if (!evStateDp || !values) return null;
            const letter = evStateLetter(values[evStateDp.id]);
            return letter && stateInfoByLetter[letter] ? { letter, ...stateInfoByLetter[letter] } : null;
          };

          if (evStateDp) {
            add({
              relId: this._aliasRelId('r.statusCode'),
              name: 'EV status code',
              role: 'indicator.status',
              type: 'number',
              states: statusStates,
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const info = stateInfo(values);
                return info ? info.code : undefined;
              },
            });

            add({
              relId: this._aliasRelId('r.statusText'),
              name: 'EV status',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const info = stateInfo(values);
                return info ? info.text : 'Unknown';
              },
            });

            add({
              relId: this._aliasRelId('r.evState'),
              name: 'IEC 61851 EV state',
              role: 'text',
              type: 'string',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const info = stateInfo(values);
                return info ? info.letter : '';
              },
            });

            add({
              relId: this._aliasRelId('r.vehicleConnected'),
              name: 'Vehicle connected',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const info = stateInfo(values);
                return info ? info.connected : undefined;
              },
            });

            add({
              relId: this._aliasRelId('r.available'),
              name: 'Wallbox available',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              get: (values) => {
                const info = stateInfo(values);
                return info ? info.available : undefined;
              },
            });

            add({
              relId: this._aliasRelId('alarm.fault'),
              name: 'Wallbox fault',
              role: 'indicator.alarm',
              type: 'boolean',
              rw: 'ro',
              kind: 'computed',
              replace: true,
              get: (values) => {
                const info = stateInfo(values);
                return info ? info.fault : undefined;
              },
            });
          }

          add({
            relId: this._aliasRelId('r.charging'),
            name: 'Charging active',
            role: 'indicator',
            type: 'boolean',
            rw: 'ro',
            kind: 'computed',
            replace: true,
            get: (values) => {
              const info = stateInfo(values);
              if (info && info.charging) return true;
              const power = chargingPowerDp ? toNumber(values && values[chargingPowerDp.id]) : undefined;
              if (Number.isFinite(power)) return power > 50;
              return info ? info.charging : undefined;
            },
          });

          if (proximityDp) {
            add({ relId: this._aliasRelId('r.proximityCurrentA'), name: 'Proximity cable current', role: 'value.current', type: 'number', unit: 'A', rw: 'ro', kind: 'dp', dpId: proximityDp.id });
          }
          if (chargingTimeDp) {
            add({ relId: this._aliasRelId('r.sessionTimeS'), name: 'Charging session time', role: 'value.interval', type: 'number', unit: 's', rw: 'ro', kind: 'dp', dpId: chargingTimeDp.id });
          }

          if (voltageL1Dp) add({ relId: this._aliasRelId('r.voltageL1'), name: 'Voltage L1', role: 'value.voltage', type: 'number', unit: 'V', rw: 'ro', kind: 'dp', dpId: voltageL1Dp.id, replace: true });
          if (voltageL2Dp) add({ relId: this._aliasRelId('r.voltageL2'), name: 'Voltage L2', role: 'value.voltage', type: 'number', unit: 'V', rw: 'ro', kind: 'dp', dpId: voltageL2Dp.id, replace: true });
          if (voltageL3Dp) add({ relId: this._aliasRelId('r.voltageL3'), name: 'Voltage L3', role: 'value.voltage', type: 'number', unit: 'V', rw: 'ro', kind: 'dp', dpId: voltageL3Dp.id, replace: true });
          if (currentL1Dp) add({ relId: this._aliasRelId('r.currentL1'), name: 'Current L1', role: 'value.current', type: 'number', unit: 'A', rw: 'ro', kind: 'dp', dpId: currentL1Dp.id, replace: true });
          if (currentL2Dp) add({ relId: this._aliasRelId('r.currentL2'), name: 'Current L2', role: 'value.current', type: 'number', unit: 'A', rw: 'ro', kind: 'dp', dpId: currentL2Dp.id, replace: true });
          if (currentL3Dp) add({ relId: this._aliasRelId('r.currentL3'), name: 'Current L3', role: 'value.current', type: 'number', unit: 'A', rw: 'ro', kind: 'dp', dpId: currentL3Dp.id, replace: true });

          const currentReadDp = pwmCurrentDp || setCurrentDp;
          if (currentReadDp) {
            add({
              relId: this._aliasRelId('r.currentLimitA'),
              name: 'Applied charging current limit',
              role: 'value.current',
              type: 'number',
              unit: 'A',
              rw: 'ro',
              kind: 'dp',
              dpId: currentReadDp.id,
              fromDevice: (value) => toNumber(value),
              replace: true,
            });
          }

          if (setCurrentDp) {
            const normalizeCurrentCommand = (value) => {
              const n = toNumber(value);
              if (!Number.isFinite(n)) return value;
              if (n <= 0) return 0;
              const clamped = Math.min(32, Math.max(6, n));
              return Math.round(clamped * 10) / 10;
            };
            add({
              relId: this._aliasRelId('ctrl.currentLimitA'),
              name: 'Charging current limit',
              role: 'level.current',
              type: 'number',
              unit: 'A',
              rw: 'rw',
              kind: 'dp',
              dpId: currentReadDp ? currentReadDp.id : setCurrentDp.id,
              writeDpId: setCurrentDp.id,
              toDevice: normalizeCurrentCommand,
              fromDevice: (value) => toNumber(value),
              replace: true,
            });
          }

          if (releasedDp) {
            add({
              relId: this._aliasRelId('r.chargingReleased'),
              name: 'Charging released by wallbox',
              role: 'indicator',
              type: 'boolean',
              rw: 'ro',
              kind: 'dp',
              dpId: releasedDp.id,
              fromDevice: (value) => !!value,
              replace: true,
            });
          }

          if (releaseCommandDp && releasedDp) {
            const releaseAlias = {
              role: 'switch',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: releasedDp.id,
              writeDpId: releaseCommandDp.id,
              toDevice: (value) => !!value,
              fromDevice: (value) => !!value,
              replace: true,
            };
            add({ relId: this._aliasRelId('ctrl.run'), name: 'Run / charging release', ...releaseAlias });
            add({ relId: this._aliasRelId('ctrl.chargeEnable'), name: 'Charging release', ...releaseAlias });
          }

          if (rfidReaderDp) {
            add({
              relId: this._aliasRelId('ctrl.rfidReaderEnabled'),
              name: 'Enable RFID reader',
              role: 'switch',
              type: 'boolean',
              rw: 'rw',
              kind: 'dp',
              dpId: rfidReaderDp.id,
              writeDpId: rfidReaderDp.id,
              commandOnlyAlias: true,
              preferCommandValue: true,
              toDevice: (value) => !!value,
              fromDevice: (value) => !!value,
            });
          }

          if (rfidUidDp) {
            add({ relId: this._aliasRelId('r.rfidCardUid'), name: 'Last RFID card UID', role: 'text', type: 'string', rw: 'ro', kind: 'dp', dpId: rfidUidDp.id });
          }
          if (firmwareDp) {
            add({ relId: this._aliasRelId('r.firmwareVersion'), name: 'Firmware version', role: 'text', type: 'string', rw: 'ro', kind: 'dp', dpId: firmwareDp.id });
          }
        }
      } catch (e) {
        // Never break generic EVCS alias generation because of a vendor-specific mapping.
      }

      // Control: current limit (A) (best-effort)
      // The OEM V10.03 protocol exposes a real connector power setpoint but no
      // connector-current command. Its universal FALLBACK_CURRENT register is only
      // the safety value used after a communication timeout and must never be exposed
      // as the live EOS charging-current setpoint.
      const currentTemplateIdLower = String(this.template?.id || '').toLowerCase();
      const suppressGenericCurrentLimit = currentTemplateIdLower.includes('evcs.oem.modbusv1003.connector');
      const currentLimitDp = suppressGenericCurrentLimit ? null : (
        getAnyById('sET_CHARGING_CURRENT', 'cHARGE_CURRENT', 'cHARGING_CURRENT', 'currentUser_mA', 'aPPLY_CHARGE_CURRENT_LIMIT') ||
        this._findFirstDatapoint(dp =>
          (dp.rw === 'rw' || dp.rw === 'wo') &&
          /current/i.test(String(dp.id || '')) &&
          !/timeout/i.test(String(dp.id || '')) &&
          !/failsafe/i.test(String(dp.id || ''))
        )
      );

      if (currentLimitDp) {
        const unit = (currentLimitDp.unit === 'mA') ? 'A' : (currentLimitDp.unit || 'A');
        const isMilliAmp = currentLimitDp.unit === 'mA';

        add({
          relId: this._aliasRelId('ctrl.currentLimitA'),
          name: 'Charging current limit',
          role: 'level.current',
          type: 'number',
          unit,
          rw: 'rw',
          kind: 'dp',
          dpId: currentLimitDp.id,
          writeDpId: currentLimitDp.id,
          toDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return v;
            return isMilliAmp ? Math.round(n * 1000) : n;
          },
          fromDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return v;
            return isMilliAmp ? (n / 1000) : n;
          }
        });
      }

      // Control: power limit (W) (best-effort)
      const powerLimitDp =
        getAnyById('eV_SET_CHARGE_POWER_LIMIT', 'aPPLY_CHARGE_POWER_LIMIT', 'set_station_max_power') ||
        findByIdRe(/set_c\d+_max_power/i) ||
        findByIdRe(/set_.*max_power/i);

      if (powerLimitDp && (powerLimitDp.rw === 'rw' || powerLimitDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.powerLimitW'),
          name: 'Charging power limit',
          role: 'level.power',
          type: 'number',
          unit: powerLimitDp.unit || 'W',
          rw: 'rw',
          kind: 'dp',
          dpId: powerLimitDp.id,
          writeDpId: powerLimitDp.id,
        });
      }
      // Control: run/stop (enable/disable) (best-effort)
      // Some EV chargers use a "control_command" holding register where:
      //  3 = stop charging, 4 = start charging.
      // In that case we expose ctrl.run as boolean and map to those command values.
      const controlCommandDp =
        getAnyById('cONTROL_COMMAND', 'control_command') ||
        findByIdRe(/control_command/i);

      if (controlCommandDp && statusDp) {
        add({
          relId: this._aliasRelId('ctrl.run'),
          name: 'Run (enable/start)',
          role: 'switch',
          type: 'boolean',
          rw: 'rw',
          kind: 'dp',
          // Read from status code (more accurate), write to control command register
          dpId: statusDp.id,
          writeDpId: controlCommandDp.id,
          toDevice: (v) => {
            if (typeof v === 'boolean') return v ? 4 : 3;
            return v;
          },
          fromDevice: (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return undefined;
            // EVSE_State (SolaX HAC): 1=Preparing,2=Charging,7/8=Suspended,11=StartDelay,12=Pause,13=Stopping
            return [1, 2, 7, 8, 11, 12, 13].includes(n);
          }
        });
      } else {
        const enableDp =
          getAnyById('sET_ENABLE', 'enableUser', 'sTART_CANCEL_CHARGING_SESSION') ||
          this._findFirstDatapoint(dp =>
            (dp.rw === 'rw' || dp.rw === 'wo') &&
            (/enable/i.test(String(dp.id || '')) || /start/i.test(String(dp.id || '')) || /stop/i.test(String(dp.id || '')))
          );

        if (enableDp) {
          add({
            relId: this._aliasRelId('ctrl.run'),
            name: 'Run (enable/start)',
            role: 'switch',
            type: 'boolean',
            rw: 'rw',
            kind: 'dp',
            dpId: enableDp.id,
            writeDpId: enableDp.id,
            toDevice: (v) => {
              // Many EVCS implementations use 0/1 integer flags for enable/start.
              if (typeof v === 'boolean') return v ? 1 : 0;
              return v;
            },
            fromDevice: (v) => {
              if (typeof v === 'number') return v !== 0;
              if (typeof v === 'boolean') return v;
              return undefined;
            }
          });
        }
      }

      // Control: unlock plug (best-effort)

      const unlockDp = getAnyById('sET_UNLOCK_PLUG');
      if (unlockDp && (unlockDp.rw === 'rw' || unlockDp.rw === 'wo')) {
        add({
          relId: this._aliasRelId('ctrl.unlockPlug'),
          name: 'Unlock plug',
          role: 'switch',
          type: 'boolean',
          rw: 'rw',
          kind: 'dp',
          dpId: unlockDp.id,
          writeDpId: unlockDp.id,
          toDevice: (v) => (v ? 1 : 0),
          fromDevice: (v) => {
            if (typeof v === 'number') return v !== 0;
            if (typeof v === 'boolean') return v;
            return undefined;
          }
        });
      }
    }

    // Canonical current fallback for EV chargers. Some legacy templates expose
    // only per-phase currents; v1 still needs one comparable current value without
    // creating a new state in the old aliases.* namespace.
    if (this.aliasDeviceClass === 'evCharger') {
      const legacyPathOf = (def) => {
        const marker = '.aliases.';
        const text = String(def && def.relId || '');
        const pos = text.indexOf(marker);
        return pos >= 0 ? text.slice(pos + marker.length) : '';
      };
      const alreadyHasCurrent = defs.some(def => {
        const path = legacyPathOf(def);
        return path === 'r.currentA' || path === 'r.currentTotalA';
      });
      if (!alreadyHasCurrent) {
        const phaseDefs = ['r.currentL1', 'r.currentL2', 'r.currentL3']
          .map(path => defs.find(def => legacyPathOf(def) === path))
          .filter(Boolean);
        if (phaseDefs.length) {
          addStandardSource({
            relId: this._aliasRelId('r.currentA'),
            name: 'Actual current (highest phase)',
            role: 'value.current',
            type: 'number',
            unit: 'A',
            rw: 'ro',
            kind: 'computed',
            get: (values) => {
              const candidates = [];
              for (const def of phaseDefs) {
                if (!def || def.kind !== 'dp' || !def.dpId) continue;
                if (!values || !Object.prototype.hasOwnProperty.call(values, def.dpId)) continue;
                let value = values[def.dpId];
                if (typeof def.fromDevice === 'function') value = def.fromDevice(value);
                const n = Number(value);
                if (Number.isFinite(n) && n >= 0) candidates.push(n);
              }
              return candidates.length ? Math.max(...candidates) : undefined;
            },
          });
        }
      }
    }

    // VARTA raw values use opposite power signs to EOS. Override only these
    // eight new profiles; existing manufacturer definitions stay unchanged.
    for (const def of buildVartaAliases(this)) add(def);
    for (const def of buildVartaExtendedAliases(this)) add(def);
    for (const def of buildDeyeAliases(this)) add(def);

    // Build the strict, versioned Alias Contract v1 namespace. Unlike the historic aliases,
    // aliases.v1 has fixed paths, types, roles and SI-oriented units. The NexoWatt UI should
    // use this namespace for automatic discovery and mapping.
    const standard = buildStandardAliasDefinitions({
      baseId: this.baseId,
      template: this.template,
      cfg: this.cfg,
      legacyDefs: defs.concat(standardOnlyDefs),
      getDpById: (id) => this._getDpById(id),
    });
    this.aliasContractInfo = standard;
    this.aliasDeviceClass = standard.deviceClass;
    for (const def of standard.definitions) add(def);

    return defs;
  }




  async registerDynamicAlias(def, options = {}) {
    if (!def || !def.relId) return null;
    const relId = String(def.relId);
    const existing = this.aliasByStateRelId.get(relId);
    if (existing) return existing;

    await this._ensureAliasPathChannels(relId);
    const common = {
      name: def.name || relId.split('.').slice(-1)[0],
      type: def.type || 'string',
      role: def.role || 'state',
      read: def.rw !== 'wo',
      write: def.rw === 'rw' || def.rw === 'wo',
    };
    if (def.unit) common.unit = def.unit;
    if (def.states && typeof def.states === 'object') common.states = def.states;

    const native = {
      deviceId: this.cfg.id,
      templateId: this.cfg.templateId,
      isAlias: true,
      dynamic: true,
      aliasKind: def.kind,
      dpId: def.dpId,
      writeDpId: def.writeDpId,
    };
    if (def.aliasContractVersion) {
      native.aliasContractVersion = def.aliasContractVersion;
      native.aliasContractPath = def.aliasContractPath;
      native.capability = def.capability;
      native.deviceClass = this.aliasDeviceClass;
    }

    await this.adapter.setObjectNotExistsAsync(relId, { type: 'state', common, native });
    await this.adapter.extendObjectAsync(relId, { common, native }).catch(() => {});

    this.aliasByStateRelId.set(relId, def);
    this.aliasDefs.push(def);

    if (def.aliasContractVersion) {
      mergeStandardDefinition(this.aliasContractInfo, def);
      this._scheduleAliasContractMetadataRefresh();
    } else if (!options.skipStandardMirror) {
      const sourcePath = legacyAliasPath(relId);
      if (sourcePath && !sourcePath.startsWith('meta.')) {
        const canonicalPath = canonicalAliasPath(this.aliasDeviceClass, sourcePath);
        const sourceForStandard = {
          ...def,
          relId: this._aliasRelId(canonicalPath),
        };
        const standardDef = cloneStandardDefinition(sourceForStandard, {
          baseId: this.baseId,
          deviceClass: this.aliasDeviceClass,
          getDpById: (id) => this._getDpById(id),
          standardNamespace: ALIAS_STANDARD_NAMESPACE,
          canonicalPath,
        });
        if (standardDef) {
          await this.registerDynamicAlias(standardDef, { skipStandardMirror: true });
        }
      }
    }

    return def;
  }

  _scheduleAliasContractMetadataRefresh() {
    if (this._aliasMetadataRefreshTimer) {
      try { clearTimeout(this._aliasMetadataRefreshTimer); } catch (_) {}
    }
    this._aliasMetadataRefreshTimer = setTimeout(() => {
      this._aliasMetadataRefreshTimer = null;
      this._initAliasContractMetadata().catch((error) => {
        this.adapter.log.debug(
          `[${this.cfg.id}] alias contract metadata refresh failed: ${error && error.message ? error.message : error}`
        );
      });
    }, 50);
  }

  async _initAliasObjects() {
    // Build and validate alias definitions
    const defs = this._buildAliasDefinitions();
    if (!Array.isArray(defs) || !defs.length) return;

    for (const def of defs) {
      if (!def || !def.relId) continue;
      await this._ensureAliasPathChannels(def.relId);

      const common = {
        name: def.name || def.relId.split('.').slice(-1)[0],
        type: def.type || 'string',
        role: def.role || 'state',
        read: def.rw !== 'wo',
        write: def.rw === 'rw' || def.rw === 'wo',
      };
      if (def.unit) common.unit = def.unit;
      if (def.states && typeof def.states === 'object') common.states = def.states;

      const native = {
        deviceId: this.cfg.id,
        templateId: this.cfg.templateId,
        isAlias: true,
        aliasKind: def.kind,
        dpId: def.dpId,
        writeDpId: def.writeDpId,
      };
      if (def.aliasContractVersion) {
        native.aliasContractVersion = def.aliasContractVersion;
        native.aliasContractPath = def.aliasContractPath;
        native.capability = def.capability;
        native.deviceClass = this.aliasDeviceClass;
      }

      await this.adapter.setObjectNotExistsAsync(def.relId, { type: 'state', common, native });

      // Keep alias object meta-data (e.g. unit/role) in sync across updates.
      // Otherwise users would have to delete alias objects manually when templates change.
      await this.adapter.extendObjectAsync(def.relId, { common, native }).catch(() => {});

      this.aliasByStateRelId.set(def.relId, def);
      this.aliasDefs.push(def);
    }
  }

  async _initAliasContractMetadata() {
    const info = this.aliasContractInfo || {
      schemaVersion: ALIAS_SCHEMA_VERSION,
      namespace: ALIAS_STANDARD_NAMESPACE,
      deviceClass: this.aliasDeviceClass,
      capabilities: [],
      missingRequired: [],
    };
    const manifest = buildAliasManifest(info, this.template, this.cfg);
    const capabilitiesJson = JSON.stringify(manifest.capabilities || []);
    const missingRequiredJson = JSON.stringify(manifest.missingRequired || []);
    const manifestJson = JSON.stringify(manifest);

    const states = [
      { path: 'schemaVersion', name: 'Alias schema version', type: 'number', role: 'value', value: ALIAS_SCHEMA_VERSION },
      { path: 'deviceClass', name: 'Canonical device class', type: 'string', role: 'text', value: manifest.deviceClass },
      { path: 'namespace', name: 'Canonical alias namespace', type: 'string', role: 'text', value: ALIAS_STANDARD_NAMESPACE },
      { path: 'capabilities', name: 'Capabilities (JSON)', type: 'string', role: 'json', value: capabilitiesJson },
      { path: 'capabilityCount', name: 'Capability count', type: 'number', role: 'value', value: manifest.capabilities.length },
      { path: 'missingRequired', name: 'Missing required aliases (JSON)', type: 'string', role: 'json', value: missingRequiredJson },
      { path: 'templateId', name: 'Template ID', type: 'string', role: 'text', value: manifest.templateId },
      { path: 'category', name: 'Template category', type: 'string', role: 'text', value: manifest.category },
      { path: 'manufacturer', name: 'Manufacturer', type: 'string', role: 'text', value: manifest.manufacturer },
      { path: 'model', name: 'Model', type: 'string', role: 'text', value: manifest.model },
      { path: 'manifest', name: 'Alias Contract manifest (JSON)', type: 'string', role: 'json', value: manifestJson },
    ];

    for (const state of states) {
      const relId = this._aliasRelId(`meta.${state.path}`);
      await this._ensureAliasPathChannels(relId);
      const common = {
        name: state.name,
        type: state.type,
        role: state.role,
        read: true,
        write: false,
      };
      const native = {
        deviceId: this.cfg.id,
        templateId: this.cfg.templateId,
        isAliasMetadata: true,
        aliasContractVersion: ALIAS_SCHEMA_VERSION,
        deviceClass: manifest.deviceClass,
      };
      await this.adapter.setObjectNotExistsAsync(relId, { type: 'state', common, native });
      await this.adapter.extendObjectAsync(relId, { common, native }).catch(() => {});
      await this._setStateCached(relId, state.value, true);
    }

    const nativeContract = {
      aliasSchemaVersion: ALIAS_SCHEMA_VERSION,
      aliasNamespace: ALIAS_STANDARD_NAMESPACE,
      aliasStandardPath: `aliases.${ALIAS_STANDARD_NAMESPACE}`,
      deviceClass: manifest.deviceClass,
      capabilities: manifest.capabilities,
      missingRequiredAliases: manifest.missingRequired,
    };
    await this.adapter.extendObjectAsync(this.baseId, { native: nativeContract }).catch(() => {});
    await this.adapter.extendObjectAsync(`${this.baseId}.aliases`, { native: nativeContract }).catch(() => {});
    await this.adapter.extendObjectAsync(`${this.baseId}.aliases.${ALIAS_STANDARD_NAMESPACE}`, {
      common: { name: `Alias Contract v${ALIAS_SCHEMA_VERSION}` },
      native: nativeContract,
    }).catch(() => {});

    if (manifest.missingRequired.length) {
      this.adapter.log.warn(
        `[${this.cfg.id}] Alias Contract v${ALIAS_SCHEMA_VERSION} is missing required aliases for ${manifest.deviceClass}: ${manifest.missingRequired.join(', ')}`
      );
    }
  }

  async _updateDepowerControlDiagnostic(values, ctx = {}) {
    const profile = this.template?.driverHints?.oemModbusV1003;
    if (!profile) return;
    const id = profile.connectorPowerDpId || 'eV_SET_CHARGE_POWER_LIMIT';
    const readback = values && values[id];
    if (ctx.connected === false || typeof readback !== 'number' || !Number.isFinite(readback)) return;
    const requested = this._lastCommandedValueByDpId?.get(id);
    const requestedW = typeof requested === 'number' && Number.isFinite(requested) ? requested : null;
    const pending = this._writeQueue?.has(id) === true;
    const status = requestedW === null ? 'no_command'
      : pending ? 'pending' : readback === requestedW ? 'readback_matches' : 'readback_differs';
    await this._setStateCached(`${this.baseId}.info.depowerControl`, JSON.stringify({
      status, requestedW, readbackW: readback,
      lastWriteAt: this._lastWriteByDpId?.get(id) || null,
      readbackAt: Date.now(),
    }), true);
  }

  async _updateAliases(values, ctx) {
    await this._updateDepowerControlDiagnostic(values, ctx);
    if (!Array.isArray(this.aliasDefs) || !this.aliasDefs.length) return;
    const v = values || {};
    const c = ctx || {};

    // On communication errors the caller intentionally passes an empty values object.
    // Do not recompute live data aliases (SOC, power, temperatures, alarms, ...) from an
    // empty snapshot, otherwise a short Modbus timeout turns the last valid value into null.
    // Communication aliases still have to update so the UI can show the real connection state.
    const noValues = !v || Object.keys(v).length === 0;
    const connectionOnlyUpdate = (c.connected === false) && noValues;
    const isConnectionAlias = (relId) => {
      const id = String(relId || '');
      return /\.aliases(?:\.[^.]+)?\.comm\.(connected|lastError)$/.test(id) ||
        /\.aliases(?:\.[^.]+)?\.alarm\.offline$/.test(id);
    };
    const resetAblEmh1LiveMeasurements = this._shouldResetAblEmh1LiveMeasurements(v, c);

    for (const def of this.aliasDefs) {
      if (!def || !def.relId) continue;
      if (resetAblEmh1LiveMeasurements && this._isAblEmh1LiveMeasurementAlias(def.relId)) {
        await this._setStateCached(
          def.relId,
          0,
          true,
          this._liveAliasRefreshOptions(def.relId, v, c),
        );
        continue;
      }
      if (connectionOnlyUpdate && !isConnectionAlias(def.relId)) continue;
      // DEPower command memory is filled when a request is queued. Polling must
      // never turn an unsent/rejected request into a successful acknowledgement.
      if (this.template?.driverHints?.oemModbusV1003 && def.commandOnlyAlias === true) continue;

      let outVal;

      if (def.kind === 'dp') {
        if (!def.dpId) continue;

        let raw;
        const commandKey = String(def.writeDpId || def.dpId);
        const hasCommandValue = !!(def.preferCommandValue && this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(commandKey));
        if (hasCommandValue) {
          raw = this._lastCommandedValueByDpId.get(commandKey);
        } else {
          if (def.commandOnlyAlias === true) {
            // Command aliases represent the value we want to send, not necessarily the
            // charger's volatile readback.  Do not overwrite them from polling with
            // adjacent/default read values such as 0 A or 1 phase.
            continue;
          }
          if (!Object.prototype.hasOwnProperty.call(v, def.dpId)) {
            // Write-only datapoints won't be present in the poll result. In this case we keep
            // the last commanded value (state stays as-is).
            continue;
          }
          raw = v[def.dpId];
        }

        if (typeof def.fromDevice === 'function') {
          outVal = def.fromDevice(raw);
          if (outVal === undefined) continue;
        } else {
          outVal = raw;
        }
      } else if (def.kind === 'computed') {
        if (typeof def.get !== 'function') continue;
        try {
          outVal = def.get(v, c);
        } catch (e) {
          // Never let one broken computed alias kill the device update loop
          if (!this._aliasErrTs) this._aliasErrTs = {};
          const now = Date.now();
          const last = this._aliasErrTs[def.relId] || 0;
          if (now - last > 60000) {
            this._aliasErrTs[def.relId] = now;
            const msg = (e && e.message) ? e.message : String(e);
            this.adapter.log.warn(`[${this.cfg.id}] Alias compute failed for ${def.relId}: ${msg}`);
          }
          continue;
        }
        if (outVal === undefined) continue;
      } else {
        continue;
      }

      await this._setStateCached(
        def.relId,
        outVal,
        true,
        this._liveAliasRefreshOptions(def.relId, v, c),
      );
    }
  }

  async _handleMqttSnapshot(values, meta) {
    const context = meta || {};
    if (context.diagnosticsOnly === true) {
      // Metadata and error envelopes can change aliases without proving live
      // telemetry. Preserve transport errors and the existing heartbeat state.
      const lastError = String(this._stateCache.get(`${this.baseId}.info.lastError`)?.val || '');
      await this._updateAliases(values || {}, { connected: this._hbOnline === true, lastError }).catch(() => {});
      return;
    }
    const connected = context.connected !== false;
    const explicitError = String(context.error || '').trim();
    const lastError = explicitError || (connected ? '' : 'MQTT data stale or disconnected');

    await this._setStateCached(`${this.baseId}.info.connection`, connected, true);
    if (lastError) {
      // A broker can accept the MQTT connection while denying subscriptions or
      // while the gateway publishes no data. Preserve those protocol-level
      // diagnostics even though the TCP/MQTT transport itself is connected.
      await this._setStateCached(`${this.baseId}.info.lastError`, lastError, true);
    } else {
      await this._setStateCached(`${this.baseId}.info.lastError`, '', true);
    }

    await this._updateAliases(values || {}, { connected, lastError }).catch(() => {});
  }

  async _handleMqttConnectionState(connected, errorMessage) {
    const isConnected = !!connected;
    if (isConnected) {
      await this._setStateCached(`${this.baseId}.info.connection`, true, true);
      await this._setStateCached(`${this.baseId}.info.lastError`, '', true);
      // Transport connectivity and data freshness are separate: heartbeat/online is
      // raised only by an actual MQTT message in _tickHeartbeatFromIncomingData().
      await this._updateAliases({}, { connected: true, lastError: '' }).catch(() => {});
      return;
    }

    const message = String(errorMessage || 'MQTT disconnected');
    await this._setStateCached(`${this.baseId}.info.connection`, false, true);
    await this._setStateCached(`${this.baseId}.info.lastError`, message, true);
    await this._setHeartbeatOnline(false, message).catch(() => {});
    await this._updateAliases({}, { connected: false, lastError: message }).catch(() => {});
  }

  _createDriver() {
    const proto = this.cfg.protocol;
    if (getDeyeProfile(this.template)) return new DeyeModbusDriver(this.adapter, this.cfg, this.template, this.global);
    if (getVartaProfile(this.template)) {
      return new VartaModbusDriver(this.adapter, this.cfg, this.template, this.global);
    }
    if (proto === 'modbusTcp' || proto === 'modbusRtu' || proto === 'modbusAscii') {
      return new ModbusDriver(this.adapter, this.cfg, this.template, this.global);
    }
    if (proto === 'mbus') {
      return new MbusDriver(this.adapter, this.cfg, this.template, this.global);
    }
    if (proto === 'onewire') {
      return new OneWireDriver(this.adapter, this.cfg, this.template, this.global);
    }
    if (proto === 'speedwire') {
      return new SpeedwireDriver(this.adapter, this.cfg, this.template, this.global);
    }
    if (proto === 'mqtt') {
      // MQTT driver needs mapping dp -> state id
      return new MqttDriver(
        this.adapter,
        this.cfg,
        this.template,
        this.global,
        (dp) => this.relStateId(dp),
        (dp) => this._getRoundingDecimals(dp),
        () => { this._tickHeartbeatFromIncomingData().catch(() => {}); },
        (values, meta) => this._handleMqttSnapshot(values, meta),
        (connected, errorMessage) => this._handleMqttConnectionState(connected, errorMessage)
      );
    }
    if (proto === 'canbus') {
      // CANbus driver needs mapping dp -> state id + baseId for info.* states
      return new CanbusDriver(
        this.adapter,
        this.cfg,
        this.template,
        this.global,
        (dp) => this.relStateId(dp),
        (dp) => this._getRoundingDecimals(dp),
        this.baseId,
        () => { this._tickHeartbeatFromIncomingData().catch(() => {}); }
      );
    }
    if (proto === 'kostalTcp') {
      return new KostalTcpDriver(this.adapter, this.cfg, this.template, this.global);
    }
    if (proto === 'kostalRs485') {
      return new KostalRs485Driver(this.adapter, this.cfg, this.template, this.global);
    }
    if (proto === 'http') {
      return new HttpDriver(this.adapter, this.cfg, this.template, this.global);
    }
    if (proto === 'taCmi') {
      return new TaCmiDriver(this.adapter, this.cfg, this.template, this.global, this);
    }
    if (proto === 'udp') {
      return new UdpDriver(this.adapter, this.cfg, this.template, this.global);
    }
    throw new Error(`Unsupported protocol: ${proto}`);
  }

  async start() {
    if (this.started) return;
    this.started = true;

    if (this.cfg.enabled === false) {
      this.adapter.log.info(`[${this.cfg.id}] disabled - skipping`);
      return;
    }

    this.driver = this._createDriver();

    // Heartbeat session init: start "offline" until we receive *real* data.
    // (We still keep the counter monotonic across restarts.)
    await this._loadHeartbeatStateFromDb().catch(() => {});
    this._hbLastSeen = 0;
    this._hbLastSourceStamp = 0;
    this._hbLastWriteAt = 0;
    this._hbOnline = false;
    await this._setStateCached(this._hbRelId('online'), false, true);
    await this._setStateCached(this._hbRelId('lastSeenMs'), 0, true);
    await this._resetAblEmh1LiveMeasurements();

    // Event-driven protocols (no polling)
    if (this.cfg.protocol === 'mqtt' || this.cfg.protocol === 'canbus') {
      this._liveAliasRefreshMs = this._computeLiveAliasRefreshMs({ isEventDriven: true });
      // Initialize before connect: the driver may already report a connection,
      // subscription failure or live values while connect() is still resolving.
      // Never overwrite those results with a synthetic success/empty error.
      await this._setStateCached(`${this.baseId}.info.connection`, false, true);
      await this._setStateCached(`${this.baseId}.info.lastError`, '', true);
      await this._updateAliases({}, { connected: false, lastError: '' }).catch(() => {});
      try {
        await this.driver.connect(this.getDatapoints());
      } catch (e) {
        await this._setError(e);
      }

      // Heartbeat timeout for push protocols
      this._hbTimeoutMs = this._computeHeartbeatTimeoutMs({ isEventDriven: true });
      this._startHeartbeatChecker();

      // Both event-driven drivers own their actual transport status; heartbeat
      // remains tied to received device data.
      return;
    }

    // polling (most protocols)
    const allDps = this.getDatapoints();

    const normMs = (v) => {
      const n = Number(v);
      return (Number.isFinite(n) && n > 0) ? n : 0;
    };

    // Highest priority: per-device UI override
    const cfgPollMs = normMs(this.cfg.pollIntervalMs);

    // Template-specific recommendation (useful when global poll interval is slow)
    const tplPollMs =
      normMs(this.template?.driverHints?.pollIntervalMs) ||
      normMs(this.template?.pollIntervalMs) ||
      0;

    // Global default from adapter instance
    const globalPollMs = normMs(this.global.pollIntervalMs);

    // Optional split polling: fast subset every X ms + full refresh every Y ms.
    // This keeps key control signals (e.g. PV/grid/battery power) highly responsive
    // without spamming the device with a full register map on every cycle.
    const tplPolling = (this.template && this.template.driverHints) ? this.template.driverHints.polling : null;

    let fastIntervalMs = cfgPollMs || normMs(tplPolling && tplPolling.fastIntervalMs) || tplPollMs || globalPollMs || 5000;
    const forcedFastIntervalMs = normMs(tplPolling && (
      tplPolling.forceFastIntervalMs ??
      tplPolling.enforcedFastIntervalMs ??
      tplPolling.fixedFastIntervalMs
    ));
    if (forcedFastIntervalMs > 0) fastIntervalMs = forcedFastIntervalMs;
    const fixedFastCadence = !!(tplPolling && (
      tplPolling.fixedFastCadence === true ||
      tplPolling.fixedCadence === true ||
      tplPolling.startToStartCadence === true
    ));
    let slowIntervalMs = normMs(tplPolling && tplPolling.slowIntervalMs);

    let fastDps = allDps;
    let slowDps = allDps;
    let useSplitPolling = false;

    if (tplPolling && Array.isArray(tplPolling.fastDpIds) && tplPolling.fastDpIds.length) {
      const idSet = new Set(tplPolling.fastDpIds.map(x => String(x)));
      fastDps = allDps.filter(dp => dp && idSet.has(String(dp.id)));
      useSplitPolling = (fastDps.length > 0) && (slowIntervalMs > 0);
    }

    // Optional safe slow subset. Templates with very large register maps can keep fast live
    // values stable and avoid optional/reserved register ranges that some devices reject.
    if (tplPolling && Array.isArray(tplPolling.slowDpIds) && tplPolling.slowDpIds.length) {
      const slowIdSet = new Set(tplPolling.slowDpIds.map(x => String(x)));
      const filteredSlowDps = allDps.filter(dp => dp && slowIdSet.has(String(dp.id)));
      if (filteredSlowDps.length > 0) slowDps = filteredSlowDps;
    }

    const clampInterval = (ms) => {
      const n = normMs(ms);
      return Math.max(250, n || 0);
    };

    fastIntervalMs = clampInterval(fastIntervalMs);
    if (useSplitPolling) slowIntervalMs = clampInterval(slowIntervalMs);
    this._liveAliasRefreshMs = this._computeLiveAliasRefreshMs({ fastIntervalMs, isEventDriven: false });

    // Heartbeat timeout derived from polling interval (unless overridden).
    this._hbTimeoutMs = this._computeHeartbeatTimeoutMs({ fastIntervalMs, isEventDriven: false });
    this._startHeartbeatChecker();

    // Optional write throttling & command cadence scheduling (template hinted).
    //
    // SolaX Modbus specs recommend a minimum 1s interval between instructions; enabling a 1Hz command cadence
    // lets us interleave reads (e.g. every 3s) and writes (1Hz) without overloading or locking up the device.
    const tplModbusHints = this.template?.driverHints?.modbus;

    const writeThrottleMs = normMs(tplModbusHints && (tplModbusHints.writeThrottleMs || tplModbusHints.writeIntervalMs));
    const writeMaxPerTickRaw = Number(tplModbusHints && tplModbusHints.writeMaxPerTick);

    this._writeThrottleMs = (writeThrottleMs > 0) ? clampInterval(writeThrottleMs) : 0;
    this._writeQueueEnabled = this._writeThrottleMs > 0;
    this._writeQueueMaxPerTick = (Number.isFinite(writeMaxPerTickRaw) && writeMaxPerTickRaw > 0) ? Math.max(1, Math.floor(writeMaxPerTickRaw)) : 1;

    const isModbus = String(this.cfg.protocol || '').startsWith('modbus');
    const commandCadenceRaw = normMs(tplModbusHints && tplModbusHints.commandCadenceMs);
    this._commandCadenceMs = (isModbus && commandCadenceRaw > 0) ? clampInterval(commandCadenceRaw) : 0;
    this._useCommandCadenceScheduler = this._commandCadenceMs > 0;

    // Reset per-start runtime state
    this._writeQueue.clear();
    this._writeBusy = false;

    // Optional: restore last control setpoints on start/reconnect (template hinted).
    // We capture the current dp state values *before* the first poll overwrites them,
    // so upgrades keep their last setpoint even if the device rebooted.
    try {
      this._restoreCfg = this._getRestoreSetpointsConfig();
      const ids = (this._restoreCfg && Array.isArray(this._restoreCfg.dpIds)) ? this._restoreCfg.dpIds : [];
      this._restoreDpIds = new Set((ids || []).map(v => String(v)).filter(v => v && v.trim()));
      this._restoreFallback = new Map();

      if (this._restoreCfg && this._restoreDpIds.size) {
        for (const dpId of this._restoreDpIds) {
          const dp = this._getDpById(dpId);
          if (!dp) continue;
          const st = await this.adapter.getStateAsync(this.relStateId(dp)).catch(() => null);
          if (st && st.val !== null && st.val !== undefined) {
            this._restoreFallback.set(String(dp.id), st.val);
          }
        }
      }
    } catch (e) {
      this.adapter.log.debug(`[${this.cfg.id}] restore-setpoints init failed: ${e && e.message ? e.message : e}`);
      this._restoreCfg = null;
      this._restoreDpIds = new Set();
      this._restoreFallback = new Map();
    }


    const doPoll = async (dps) => {
      if (!this.driver) return;
      const pollDps = Array.isArray(dps) ? dps : allDps;
      try {
        const wasOk = this._connOk;
        const values = await this.driver.readDatapoints(pollDps);
        const hasData = values && typeof values === 'object' && Object.entries(values).some(([id, value]) =>
          this.dpById.has(id) && value !== null && value !== undefined &&
          (typeof value !== 'number' || Number.isFinite(value))
        );
        if (!hasData) throw new Error('Read completed without usable device datapoints');
        this._connOk = true;

        // Restore persistent control setpoints once after a successful (re)connect.
        // This helps if the device resets its setpoints after a reboot (e.g. PV export limit).
        if (!wasOk) {
          try { this._scheduleRestoreSetpoints('reconnect'); } catch (_) {}
        }

        await this._setStateCached(`${this.baseId}.info.connection`, true, true);
        await this._setStateCached(`${this.baseId}.info.lastError`, '', true);

        // Heartbeat tick: mark device alive only when we received real data.
        // Special case Speedwire: only tick when a NEW telegram arrived (driver.lastSeen changed).
        try {
          const proto = String(this.cfg?.protocol || '').toLowerCase();
          if (proto === 'speedwire') {
            const stamp = Number(this.driver?.lastSeen || 0);
            const staleMs = Number(this.driver?.staleTimeoutMs || this.cfg?.connection?.staleTimeoutMs || 30000);
            const age = stamp > 0 ? (Date.now() - stamp) : Number.POSITIVE_INFINITY;
            // Only tick if the telegram is still considered fresh.
            if (stamp > 0 && (!Number.isFinite(staleMs) || staleMs <= 0 || age <= staleMs)) {
              await this._tickHeartbeatFromIncomingData(stamp);
            }
          } else {
            await this._tickHeartbeatFromIncomingData();
          }
        } catch (_) {
          // ignore
        }

        for (const [dpId, rawVal] of Object.entries(values)) {
          const dp = this.dpById.get(dpId);
          if (!dp) continue;

          let val = rawVal;

          // Unit-specific normalization (no address changes, only value formatting)
          // VARTA public 14 has an explicit 0.01 Hz unit. Do not run generic
          // frequency auto-correction over already decoded manufacturer data.
          if (!getVartaProfile(this.template) && !getDeyeProfile(this.template)) val = normalizeValueByUnit(val, dp);

          // Rounding of numeric values (avoid Modbus scaling artefacts, keep consistent UI output).
          const decimals = this._getRoundingDecimals(dp);
          if (typeof val === 'number' && Number.isFinite(val) && typeof decimals === 'number' && decimals >= 0 && decimals <= 10) {
            val = roundTo(val, decimals);
          }

          // Ensure aliases get the same processed value (unit conversion happens in the driver, rounding here).
          values[dpId] = val;

          const relId = this.relStateId(dp);
          await this._setStateCached(relId, val, true);
        }

        await this._updateAliases(values, { connected: true, lastError: '' });
      } catch (e) {
        await this._setError(e);
      }
    };

    // Initial poll: by default refresh the slow/full set once.
    // Some devices close the Modbus session on optional/unsupported registers; templates can
    // start with the fast set first so core data comes online immediately.
    const initialFastOnly = !!(tplPolling && (tplPolling.initialFastOnly === true || String(tplPolling.initialFastOnly).toLowerCase() === 'true'));
    await doPoll(initialFastOnly ? fastDps : slowDps);

    // Self-scheduling poll loop (prevents overlaps/backlog and keeps cadence stable).
    this._pollLoopActive = true;

    const self = this;
    let nextFastAt = Date.now() + fastIntervalMs;
    let nextSlowAt = useSplitPolling ? (Date.now() + slowIntervalMs) : Number.POSITIVE_INFINITY;

    let loopFn = null;

    function scheduleNext(delay) {
      if (!self._pollLoopActive) return;
      const d = Math.max(0, Number(delay) || 0);
      if (self.pollTimer) {
        clearTimeout(self.pollTimer);
        self.pollTimer = null;
      }
      self.pollTimer = setTimeout(() => {
        if (loopFn) loopFn().catch(() => {});
      }, Math.max(fixedFastCadence ? 25 : 250, d));
    }

    async function pollLoop() {
      if (!self._pollLoopActive || !self.driver) return;

      const cycleStartedAt = Date.now();
      const now = cycleStartedAt;
      const runSlow = useSplitPolling && now >= nextSlowAt;

      // Default profiles schedule from completion to avoid catch-up loops. Fast closed-loop
      // profiles may opt into a fixed start-to-start cadence. If a poll overruns its target,
      // the self-scheduling loop still never overlaps; it simply continues as soon as safe.
      if (runSlow) {
        await doPoll(slowDps);
      } else {
        await doPoll(fastDps);
      }

      const finishedAt = Date.now();
      const nextFastBaseAt = fixedFastCadence ? cycleStartedAt : finishedAt;
      if (runSlow) {
        nextSlowAt = finishedAt + slowIntervalMs;
        nextFastAt = Math.max(finishedAt, nextFastBaseAt + fastIntervalMs);
      } else {
        nextFastAt = Math.max(finishedAt, nextFastBaseAt + fastIntervalMs);
      }

      if (!self._pollLoopActive || !self.driver) return;

      const nextAt = Math.min(nextFastAt, nextSlowAt);
      scheduleNext(nextAt - Date.now());
    }

    async function cadenceLoop() {
      if (!self._pollLoopActive || !self.driver) return;

      const cycleStartedAt = Date.now();
      const now = cycleStartedAt;
      const runSlow = useSplitPolling && now >= nextSlowAt;
      const runFast = now >= nextFastAt;

      const hasQueuedWrites = !!(self._writeQueue && self._writeQueue.size > 0);

      // Prioritise queued control writes over a due poll tick. Storage dispatch must
      // reach the inverter promptly; the next read cycle can then confirm the result.
      if (hasQueuedWrites) {
        const maxWrites = Math.max(1, Number(self._writeQueueMaxPerTick || 1));
        for (let i = 0; i < maxWrites; i++) {
          await self._flushWriteQueueOnce();
          if (!self._writeQueue || self._writeQueue.size === 0) break;
        }
      } else if (runSlow) {
        await doPoll(slowDps);
        const finishedAt = Date.now();
        const nextFastBaseAt = fixedFastCadence ? cycleStartedAt : finishedAt;
        nextSlowAt = finishedAt + slowIntervalMs;
        nextFastAt = Math.max(finishedAt, nextFastBaseAt + fastIntervalMs);
      } else if (runFast) {
        await doPoll(fastDps);
        const finishedAt = Date.now();
        const nextFastBaseAt = fixedFastCadence ? cycleStartedAt : finishedAt;
        nextFastAt = Math.max(finishedAt, nextFastBaseAt + fastIntervalMs);
      }

      if (!self._pollLoopActive || !self.driver) return;
      scheduleNext(self._commandCadenceMs);
    }

    // Decide which scheduler to use
    loopFn = self._useCommandCadenceScheduler ? cadenceLoop : pollLoop;

    if (self._useCommandCadenceScheduler) {
      // Tick-based cadence scheduler (e.g., 1000ms) to stay within strict Modbus timing constraints.
      scheduleNext(self._commandCadenceMs);
    } else {
      // Start after the fast interval (initial full refresh has already happened).
      scheduleNext(nextFastAt - Date.now());

      // If writes are throttled via queue and we do not use the cadence scheduler, start the write loop.
      if (self._writeQueueEnabled) self._startWriteLoop();
    }

    // Optional template-defined Modbus watchdog auto-writes (e.g., TESVOLT VK interface).
    await this._startAutoWatchdogs();
    // Seed watchdog/keepalive command memory from persistent command aliases after restarts.
    await this._seedSetpointKeepaliveFromCommandAliases().catch(e => {
      this.adapter.log.debug(`[${this.cfg.id}] SetpointKeepalive seed failed: ${e && e.message ? e.message : e}`);
    });
    await this._startSetpointKeepalive();
    await this._startSungrowExternalEmsHeartbeat();
  }

  async _setError(e) {
    const err = e || {};
    const code = (err && err.code) ? String(err.code) : '';
    let msg = (err && err.message) ? err.message : String(err);
    const lower = String(msg).toLowerCase();

    if (this._isSuppressedUnsupportedWriteError(err)) {
      try { this._handleSuppressedUnsupportedWrite(err, err && err.nexowattDpId ? String(err.nexowattDpId) : ''); } catch (_) {}
      await this._setStateCached(`${this.baseId}.info.connection`, !!this._connOk, true);
      await this._setStateCached(`${this.baseId}.info.lastError`, msg, true);
      return;
    }

    const tplIdLowerForError = String(this.template?.id || '').toLowerCase();
    const mfrLowerForError = String(this.template?.manufacturer || '').toLowerCase();
    const isAlfenForError = mfrLowerForError === 'alfen' || tplIdLowerForError.includes('alfen');

    const transportCodes = new Set([
      'ECONNREFUSED',
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'ENOTFOUND',
      'ERR_SOCKET_CLOSED',
      'E_MODBUS_OPERATION_TIMEOUT',
      'E_MODBUS_CONNECT_TIMEOUT',
      'E_MODBUS_BUSY_STALE',
    ]);
    const isTransport = transportCodes.has(code) || lower.includes('port not open') || lower.includes('timed out') || lower.includes('timeout');
    const isWriteOperation = String(err && (err.nexowattOperation || err.operation || '')).toLowerCase() === 'write';
    if (isWriteOperation && !isTransport && this._looksLikePermanentModbusWriteReject(msg)) {
      try { this._markWriteTemporarilyUnsupported(err && err.nexowattDpId ? String(err.nexowattDpId) : '', msg); } catch (_) {}
    }
    const readErrorGraceMs = this._normalizeMs(
      this.template?.driverHints?.modbus?.readErrorGraceMs ??
      this.template?.driverHints?.readErrorGraceMs ??
      this.cfg?.connection?.readErrorGraceMs
    );
    const recentHeartbeat = readErrorGraceMs > 0 && this._hbLastSeen > 0 && (Date.now() - Number(this._hbLastSeen)) <= readErrorGraceMs;
    const keepConnectionState = (isWriteOperation && !isTransport) || (!isWriteOperation && !isTransport && recentHeartbeat);

    // A rejected write value/register is not the same as a lost TCP/Modbus connection.
    // Likewise, a single non-transport read rejection shortly after a successful heartbeat
    // should not make a busy wallbox flap online/offline. Transport errors still mark the
    // device offline immediately, and repeated read failures go offline once the grace expires.
    if (!keepConnectionState) this._connOk = false;

    const host = this.cfg?.connection?.host;
    const port = Number(this.cfg?.connection?.port || 502);

    const addHint = (hint) => {
      if (!hint) return;
      // Avoid hint duplication on repeated retries.
      if (msg.includes(`| Hint:`) && msg.includes(hint)) return;
      msg = `${msg} | Hint: ${hint}`;
    };

    // --- Transport-layer hints ---
    if (code === 'ECONNREFUSED') {
      if (isAlfenForError) {
        addHint(
          `TCP connection to ${host || 'device'}:${port} was refused. ` +
          `For Alfen ACE this usually means the Modbus server is disabled/restarting, Active Load Balancing/EMS is not active, ` +
          `the charger temporarily refuses additional clients, or another Modbus client still holds one of the limited TCP sessions.`
        );
      } else {
        addHint(
          `TCP connection to ${host || 'device'}:${port} was refused. ` +
          `This usually means the Modbus TCP server is disabled on the device, the IP/port is wrong, ` +
          `or a firewall/ACL actively rejects the connection. ` +
          `For SMA: ensure SMA Modbus/SunSpec Modbus is enabled and verify whether you must connect to a Data Manager instead of the inverter.`
        );
      }
    } else if (code === 'ETIMEDOUT') {
      addHint(
        `TCP connection timed out (no response). This typically indicates packet filtering (firewall), wrong IP/route, ` +
        `or that port ${port} is not reachable from the ioBroker host.`
      );
    } else if (code === 'ENOTFOUND') {
      addHint(`Host name could not be resolved. Check the Host/IP field.`);
    } else if (code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
      addHint(`Network unreachable. Check routing/VLAN/gateway and that the device is powered on.`);
    }

    // --- Modbus-layer hints (best-effort) ---

    // modbus-serial commonly reports this when the underlying TCP socket/serial port is closed
    if (lower.includes('port not open')) {
      addHint(
        `The Modbus client port is not open (socket/serial closed). ` +
        `If this is Modbus TCP, the device or network likely closed the connection; the adapter will reconnect automatically. ` +
        `If this is Modbus RTU, check the serial path/permissions and whether the USB/RS485 adapter is still present.`
      );
    }
    if (lower.includes('illegal data address') || lower.includes('exception code') || lower.includes('illegal function')) {
      const isAlfen = isAlfenForError;

      if (isAlfen) {
        addHint(
          `Alfen-specific: the canonical template uses the official ACE protocol addresses (document register minus 1) and fixed Unit-IDs. ` +
          `After exception 2 the driver also probes the direct table-address compatibility layout (for Max Current: UID1/2 FC16@1210). ` +
          `If both @1209 and @1210 are rejected, the charger is answering but maximum-current writes are not exposed/enabled in the current ACE configuration.`
        );
        if (lower.includes('set_charging_current') || lower.includes('fc16@1209') || lower.includes('fc16@1210') || lower.includes('1199-1214')) {
          addHint(
            `Open ACE Advanced Settings, enable Allow writing maximum currents and Enable sockets, keep Active Load Balancing/Data Source=Energy Management System, and set TCP/IP EMS Control Mode=Socket for Unit-ID 1. ` +
            `If the charger firmware/profile does not support these registers, the adapter can read meter power but cannot release/control charging through Modbus.`
          );
        }
      } else {
        const mfr = String(this.cfg?.manufacturer || this.template?.manufacturer || '').toUpperCase();
        const tpl = String(this.template?.id || this.cfg?.templateId || '');
        if (getVartaProfile(this.template)) {
          addHint(
            `VARTA table 14: verify the selected model, table version and extended-register support. ` +
            `Frequency-control registers require activation by VARTA. Only documented FC3/FC6 addresses are used; ` +
            `no address-offset probing or FC16 fallback. Pextra is additional power, not an absolute power setpoint.`
          );
        } else if (getDeyeProfile(this.template)) {
          addHint('DEYE: verify hybrid family, firmware, RTU address and 9600 8N1. Literal addresses only; no offset probing. Remote power commands remain unavailable.');
        } else if (mfr === 'KEBA' || /keba/i.test(tpl)) {
          addHint(
            `KEBA-specific: P40 Modbus TCP normally uses Unit-ID 255. ` +
            `The P40 also rejects reads that cross unsupported register gaps, so use the KEBA P40 safe template/profile and keep Address-Offset at 0.`
          );
        } else if (mfr === 'FENECON' || /fenecon/i.test(tpl)) {
          addHint(
            `FENECON-specific: the TCP connection is working, but this register group is not supported by the selected FENECON profile. ` +
            `Verify Home/Commercial/Mini/DESS template, Unit-ID and Address-Offset 0.`
          );
        } else {
          addHint(
            `Modbus responded but the register address/function is invalid. ` +
            `Check Address-Offset (often -1 vs 0), ensure the correct vendor template/profile, and verify Unit-ID.`
          );
        }
      }
    }
    if (lower.includes('illegal data value') || lower.includes('exception 3')) {
      if (getVartaProfile(this.template)) {
        addHint(`VARTA FC6: check the selected model, write permissions, live scale factor and register value range. UG is negative and OG positive; nonzero limits must meet the confirmed residential/commercial minimum. No alternate write function or automatic retry is used.`);
      } else addHint(
        `Modbus accepted the connection but rejected the written value/register combination. ` +
        `Check the writable mode on the device, value range, Unit-ID, and whether 32-bit values are written as one complete FC16 block.`
      );
    }
    if (lower.includes('timed out') && code !== 'ETIMEDOUT') {
      addHint(
        `Modbus timeout. If TCP connects but reads time out, check Unit-ID, allowed Modbus clients, and whether another client (e.g., Data Manager/SCADA) is already connected.`
      );
    }

    // --- Speedwire (UDP multicast) hints ---
    if (code === 'E_SPEEDWIRE_NO_DATA' || code === 'E_SPEEDWIRE_STALE' || lower.includes('speedwire')) {
      addHint(
        `Speedwire uses UDP multicast (typically 239.12.255.254:9522). ` +
        `Ensure the ioBroker host is in the same L2 network, multicast is not blocked, and your switch/router supports IGMP (v2). ` +
        `In virtualized setups (Docker/LXC/VM), ensure multicast traffic reaches the container/VM (bridge/host-networking).`
      );
    }

    // SMA Energy Meter note (common pitfall): it is Speedwire-based, not Modbus TCP on port 502.
    if (code === 'ECONNREFUSED' && String(this.cfg?.manufacturer || '').toUpperCase() === 'SMA' && String(this.cfg?.category || '').toUpperCase() === 'METER') {
      addHint(
        `If this is an SMA Energy Meter: it usually does NOT provide a Modbus TCP server on port 502. ` +
        `Use the Speedwire (UDP) protocol/template instead, or connect to Sunny Home Manager/Data Manager if you need Modbus.`
      );
    }

    
    // For transport layer errors we proactively close the driver so the next poll triggers a clean reconnect.
    try {
      if (isTransport && this.driver && typeof this.driver.disconnect === 'function') {
        // Force-close the stale transport before the next poll schedules a reconnect. Awaiting here
        // avoids races where a late disconnect closes a freshly opened TCP socket.
        if (getVartaProfile(this.template) || getDeyeProfile(this.template)) {
          // Dedicated drivers: terminal disconnect cancels the endpoint scheduler. A transient
          // network failure must reset only transport, retaining poll/reconnect.
          await this.driver.resetTransport().catch(() => {});
        } else {
          await this.driver.disconnect().catch(() => {});
        }

        // If we lost transport, re-apply any required pre-writes after reconnect.
        if (this._preWriteLastTsByTrigger) this._preWriteLastTsByTrigger.clear();
      }
    } catch (_) {
      // ignore
    }

    // Throttle repetitive error logs (same message) to avoid flooding the log.
    const now = Date.now();
    const throttleMs = Number(this.global.errorLogThrottleMs || 30000);
    const shouldLog = (msg !== this._lastErrorLogMsg) || (!this._lastErrorLogTs) || ((now - this._lastErrorLogTs) > throttleMs);
    if (shouldLog) {
      this._lastErrorLogMsg = msg;
      this._lastErrorLogTs = now;
      this.adapter.log.warn(`[${this.cfg.id}] ${msg}`);
    }

    await this._setStateCached(`${this.baseId}.info.connection`, !!this._connOk, true);
    await this._setStateCached(`${this.baseId}.info.lastError`, msg, true);
    await this._updateAliases({}, { connected: !!this._connOk, lastError: msg }).catch(() => {});
  }

  async stop() {
    this._pollLoopActive = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.watchdogStartTimer) {
      clearTimeout(this.watchdogStartTimer);
      this.watchdogStartTimer = null;
    }

    // Stop optional setpoint keepalive
    if (this._setpointKeepaliveTimer) {
      try { clearInterval(this._setpointKeepaliveTimer); } catch (_) {}
      this._setpointKeepaliveTimer = null;
    }
    this._setpointKeepaliveBusy = false;

    // Stop optional Sungrow External-EMS heartbeat auto-refresh
    if (this._sungrowHeartbeatTimer) {
      try { clearInterval(this._sungrowHeartbeatTimer); } catch (_) {}
      this._sungrowHeartbeatTimer = null;
    }
    if (this._sungrowHeartbeatStartTimer) {
      try { clearTimeout(this._sungrowHeartbeatStartTimer); } catch (_) {}
      this._sungrowHeartbeatStartTimer = null;
    }
    this._sungrowHeartbeatBusy = false;

    // Stop optional post-write confirmation repeats
    if (this._postWriteRepeatTimersByDpId && this._postWriteRepeatTimersByDpId.size) {
      for (const timer of this._postWriteRepeatTimersByDpId.values()) {
        try { clearTimeout(timer); } catch (_) {}
      }
      this._postWriteRepeatTimersByDpId.clear();
    }

    // Stop optional setpoint restore scheduler
    if (this._restoreTimer) {
      try { clearTimeout(this._restoreTimer); } catch (_) {}
      this._restoreTimer = null;
    }
    this._restoreBusy = false;


    // Stop heartbeat checker
    if (this._hbCheckTimer) {
      try { clearInterval(this._hbCheckTimer); } catch (_) {}
      this._hbCheckTimer = null;
    }
    if (this._aliasMetadataRefreshTimer) {
      try { clearTimeout(this._aliasMetadataRefreshTimer); } catch (_) {}
      this._aliasMetadataRefreshTimer = null;
    }
    // Mark offline on stop (fail-safe)
    for (const relId of this._hbRelIds('online')) {
      await this._setStateCached(relId, false, true);
    }
    this._hbOnline = false;

    // Stop optional write loop and clear queued writes
    try {
      this._writeQueueEnabled = false;
      this._stopWriteLoop();
      if (this._writeQueue) this._writeQueue.clear();
      this._writeBusy = false;
    } catch (e) {
      // ignore
    }
    if (this.driver) {
      try { await this.driver.disconnect(); } catch (e) { /* ignore */ }
      this.driver = null;
    }
    this.started = false;
  }

  _recordWrite(dpId, opts = {}) {
    if (!dpId) return;
    const key = String(dpId);
    const now = Date.now();
    try {
      this._lastWriteByDpId.set(key, now);
      // A successful direct/user write already refreshes the device-side validity timer.
      // Let the cyclic keepalive count from that real write; otherwise the adapter can
      // write again too early and then leave a gap that is too long for a charger watchdog.
      if (this._setpointKeepaliveLastWriteByDpId) this._setpointKeepaliveLastWriteByDpId.set(key, now);
    } catch (e) {
      // ignore
    }

    // Mutually exclusive setpoints (e.g. Sungrow signed/charge/discharge helpers)
    // must not let an older delayed repeat overwrite the newest user command.
    try { this._cancelExclusiveSetpointPeerPostRepeats(key); } catch (_) {}

    if (!opts || opts.skipPostWriteRepeat !== true) {
      try { this._schedulePostWriteRepeat(key); } catch (_) {}
    }
  }

  _looksLikePermanentModbusWriteReject(msg) {
    return /modbus\s+exception\s+(2|3)\b|illegal\s+data\s+(address|value)|register\s+not\s+supported|cannot\s+be\s+written/i.test(String(msg || ''));
  }

  _isSuppressedUnsupportedWriteError(e) {
    if (!e) return false;
    const code = String(e.code || '');
    return code === 'E_NEXOWATT_WRITE_UNSUPPORTED' || e.nexowattSuppressWarn === true || e.nexowattUnsupportedWrite === true;
  }

  _isAlfenTemplate() {
    const tplId = String(this.template?.id || '').toLowerCase();
    const mfr = String(this.template?.manufacturer || this.cfg?.manufacturer || '').toLowerCase();
    return mfr === 'alfen' || tplId.includes('alfen');
  }


  _getAlfenHints() {
    const top = (this.template && this.template.alfen && typeof this.template.alfen === 'object') ? this.template.alfen : {};
    const driver = (this.template && this.template.driverHints && this.template.driverHints.alfen && typeof this.template.driverHints.alfen === 'object') ? this.template.driverHints.alfen : {};
    const modbus = (this.template && this.template.driverHints && this.template.driverHints.modbus && this.template.driverHints.modbus.alfen && typeof this.template.driverHints.modbus.alfen === 'object') ? this.template.driverHints.modbus.alfen : {};
    return Object.assign({}, top, driver, modbus);
  }

  _handleAlfenRejectedControlWrite(e, dpId) {
    const msg = (e && e.message) ? String(e.message) : String(e);
    const id = String(dpId || e?.nexowattDpId || '');
    if (id) this._markWriteTemporarilyUnsupported(id, msg);
    if (id) this._logSkippedUnsupportedWrite(id);
    // Keep Alfen meter polling clean: unsupported/not-enabled EMS control is a feature
    // state of the charger, not a transport error and not a reason to flood warn logs.
  }

  _handleSuppressedUnsupportedWrite(e, dpId) {
    const id = String(dpId || e?.nexowattDpId || '');
    if (id) this._markWriteTemporarilyUnsupported(id, e && e.message ? e.message : String(e));
    if (id) this._logSkippedUnsupportedWrite(id);
  }

  _unsupportedWriteCooldownMs() {
    const modHints = this.template?.driverHints?.modbus || {};
    const raw = Number(modHints.unsupportedWriteCooldownMs ?? modHints.writeRejectBackoffMs ?? modHints.setpointKeepaliveUnsupportedBackoffMs ?? 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }

  _markWriteTemporarilyUnsupported(dpId, msg) {
    if (!dpId) return;
    const cooldownMs = this._unsupportedWriteCooldownMs();
    if (!cooldownMs) return;
    try {
      this._setpointKeepaliveUnsupportedUntilByDpId.set(String(dpId), Date.now() + cooldownMs);
    } catch (_) {}
  }

  _clearWriteTemporarilyUnsupported(dpId) {
    if (!dpId) return;
    try {
      this._setpointKeepaliveUnsupportedUntilByDpId.delete(String(dpId));
    } catch (_) {}
  }

  _isWriteTemporarilyUnsupported(dpId) {
    if (!dpId) return false;
    try {
      const until = Number(this._setpointKeepaliveUnsupportedUntilByDpId.get(String(dpId)) || 0);
      return !!(until && Date.now() < until);
    } catch (_) {
      return false;
    }
  }

  _logSkippedUnsupportedWrite(dpId) {
    if (!dpId) return;
    const now = Date.now();
    const key = String(dpId);
    const last = Number(this._unsupportedWriteSkipLogTsByDpId.get(key) || 0);
    if (last && (now - last) < 60000) return;
    this._unsupportedWriteSkipLogTsByDpId.set(key, now);
    const until = Number(this._setpointKeepaliveUnsupportedUntilByDpId.get(key) || 0);
    const remainS = until > now ? Math.ceil((until - now) / 1000) : 0;
    this.adapter.log.debug(`[${this.cfg.id}] Write ${key} skipped temporarily because the device rejected this register/value recently${remainS ? `; retry in ~${remainS}s` : ''}.`);
  }

  _isWriteQueueEnabled() {
    return !!(this._writeQueueEnabled && this._writeThrottleMs > 0);
  }

  _alfenMirrorCommandDpIds(dpId) {
    if (!this._isAlfenTemplate || !this._isAlfenTemplate()) return [];
    // 0.5.124: do not mirror user command memory automatically.  Field data showed
    // UID2 and UID200 are often not enabled (SCN_MAX_CURRENT_ENABLE=0, Socket-2
    // returns illegal address).  Mirroring kept stale 16 A / 1-phase values alive and
    // produced misleading warning spam.  Socket-2 and SCN datapoints remain manually
    // writable; only the public aliases now control the selected primary socket.
    return [];
  }

  _rememberAlfenMirrorCommandValues(dpId, valueToRemember, opts = {}) {
    if (!this._isAlfenTemplate || !this._isAlfenTemplate()) return;
    const mirrors = this._alfenMirrorCommandDpIds(dpId);
    if (!mirrors.length) return;
    const now = Date.now();
    const markEverWritten = opts.markEverWritten !== false;
    for (const mirrorId of mirrors) {
      try {
        const mirrorDp = this._getDpById(mirrorId);
        if (!mirrorDp || !(mirrorDp.rw === 'rw' || mirrorDp.rw === 'wo')) continue;
        const key = String(mirrorDp.id);
        if (this._lastCommandedValueByDpId) this._lastCommandedValueByDpId.set(key, valueToRemember);
        // For All-IDs mode the physical primary write may only be Socket 1, while
        // the device actually accounts for SCN values. Mark mirror targets as
        // eligible for watchdog refresh as soon as the primary command exists; the
        // write itself is still best-effort and unsupported IDs back off normally.
        if (markEverWritten && this._lastWriteByDpId) this._lastWriteByDpId.set(key, now - 60000);
        if (this._setpointKeepaliveLastWriteByDpId) this._setpointKeepaliveLastWriteByDpId.set(key, 0);
      } catch (_) {
        // ignore one broken optional mirror target
      }
    }
  }

  _rememberCommandedValue(dpId, deviceValue) {
    if (!dpId) return;
    const key = String(dpId);
    try {
      let valueToRemember = deviceValue;
      // Normalize numeric command strings like "16 A" / "3 phases" before they are
      // used by the Alfen watchdog.  Non-numeric strings remain unchanged.
      const n = (typeof this._parseNumberWithUnits === 'function') ? this._parseNumberWithUnits(deviceValue) : undefined;
      if (Number.isFinite(n)) valueToRemember = n;
      if (this._lastCommandedValueByDpId) this._lastCommandedValueByDpId.set(key, valueToRemember);

      // Preserve only an active ABL Icmax PWM command. A later 100 % pause must not
      // erase the value that ctrl.run/ctrl.chargeEnable should restore on resume.
      try {
        const tplIdLower = String(this.template?.id || '').toLowerCase();
        const mfrLower = String(this.template?.manufacturer || '').toLowerCase();
        const isAblEmh1 = (mfrLower === 'abl') || tplIdLower.startsWith('evcs.abl.');
        if (isAblEmh1 && key.toLowerCase() === 'set_icmax_duty_cycle_pct') {
          const pct = Number(valueToRemember);
          if (Number.isFinite(pct) && pct >= 10 && pct <= 96 && this._ablLastActiveDutyPctByDpId) {
            this._ablLastActiveDutyPctByDpId.set(key, Math.floor((pct + 1e-9) * 10) / 10);
          }
        }
      } catch (_) {}

      // A new user command must be picked up by watchdog immediately, even if the
      // physical Modbus write is queued or has to be retried.
      if (this._setpointKeepaliveLastWriteByDpId) this._setpointKeepaliveLastWriteByDpId.set(key, 0);
      this._rememberAlfenMirrorCommandValues(key, valueToRemember, { markEverWritten: true });
    } catch (_) {
      // ignore
    }
  }


  _enqueuePreWritesForDp(dpId) {
    // In throttled mode we enqueue pre-writes as separate queued writes, so we keep a strict
    // one-modbus-command-per-cadence behaviour (SolaX doc: >=1s between instructions).
    const plan = this._getPreWritesForDp(dpId);
    if (!plan.length) return;

    const triggerKey = String(dpId).toLowerCase();
    const now = Date.now();
    const cooldownMs = plan.reduce((m, s) => Math.max(m, Number(s.cooldownMs || 0)), 0);

    const lastTs = this._preWriteLastTsByTrigger.get(triggerKey) || 0;
    if (cooldownMs > 0 && lastTs && now - lastTs < cooldownMs) return;

    for (const step of plan) {
      const stepId = String(step.dpId);
      const stepDp = this._getDpById(stepId);
      if (!stepDp) continue;
      if (!(stepDp.rw === 'rw' || stepDp.rw === 'wo')) continue;

      // Don't override an already queued user-write for the same datapoint.
      if (this._writeQueue.has(String(stepDp.id))) continue;

      this._writeQueue.set(String(stepDp.id), {
        dp: stepDp,
        deviceValue: step.value,
        ackByRelId: new Map(),
        attempts: 0,
        meta: {
          isPreWrite: true,
          preWriteTriggerKey: triggerKey,
          preWriteCooldownMs: cooldownMs,
        },
      });
    }
  }

  _enqueueWrite(ackRelId, dp, deviceValue, ackVal, meta = {}) {
    if (!dp || !dp.id) return;

    const bypassUnsupportedCooldown = !!(meta && meta.bypassUnsupportedCooldown === true);
    if (!bypassUnsupportedCooldown && this._isWriteTemporarilyUnsupported(dp.id)) {
      this._logSkippedUnsupportedWrite(dp.id);
      return;
    }

    const key = String(dp.id);
    const isAutomaticRefresh = !!(meta && (meta.isSetpointKeepalive === true || meta.isPostWriteRepeat === true || meta.isPreWrite === true));

    // A new manual command in a mutually exclusive setpoint group invalidates older
    // queued/repeat commands from the other members of the group. This prevents a
    // previous Sungrow charge setpoint from firing a few seconds later and overwriting
    // a fresh discharge command (and vice versa).
    if (!isAutomaticRefresh) {
      try { this._dropQueuedExclusiveSetpointPeers(key); } catch (_) {}
      try { this._cancelExclusiveSetpointPeerPostRepeats(key); } catch (_) {}
    }

    // Treat user/script commands as the authoritative desired value immediately, even when
    // the real Modbus write is queued/throttled.  Without this, an Alfen watchdog refresh can
    // still repeat the previous 16 A command and overwrite a newly queued Min+PV 6 A command
    // before the queue has flushed it to the charger.
    if (!isAutomaticRefresh) {
      this._rememberCommandedValue(key, deviceValue);
    }

    // Ensure required pre-writes are queued first (if any).
    this._enqueuePreWritesForDp(dp.id);

    let entry = this._writeQueue.get(key);
    if (!entry) {
      entry = {
        dp,
        deviceValue,
        ackByRelId: new Map(),
        attempts: 0,
        meta: Object.assign({}, meta || {}),
      };
      this._writeQueue.set(key, entry);
    } else {
      const existingMeta = entry.meta || {};
      const existingAutomatic = !!(existingMeta.isSetpointKeepalive || existingMeta.isPostWriteRepeat || existingMeta.isPreWrite);
      const incomingAutomatic = !!isAutomaticRefresh;
      const incomingUserCommand = !!(meta && meta.isUserCommand === true);
      const existingUserCommand = !!(existingMeta && existingMeta.isUserCommand === true);

      // Never let an automatic watchdog/pre-write replace a still queued manual alias write.
      // This was visible on Alfen as: user writes phaseMode=3/currentLimit=6, then the next
      // keepalive tick re-queued stale phase=1 or 16 A before the user write had reached Modbus.
      if (incomingAutomatic && (existingUserCommand || !existingAutomatic)) {
        return;
      }

      // An in-flight writer owns the previous entry. Replacing it by identity
      // keeps a newer command alive even when the older I/O later succeeds/fails.
      entry = {
        dp,
        deviceValue,
        ackByRelId: new Map(),
        attempts: 0,
        meta: Object.assign({}, meta || {}, {
          isUserCommand: existingUserCommand || incomingUserCommand,
        }),
      };
      this._writeQueue.set(key, entry);
    }

    if (ackRelId) {
      entry.ackByRelId.set(String(ackRelId), ackVal);
    }

    // If we are NOT using a command-cadence poll loop, start a dedicated write loop.
    if (this._isWriteQueueEnabled() && !this._useCommandCadenceScheduler) {
      this._startWriteLoop();
    }
  }

  _pickNextQueuedWrite() {
    if (!this._writeQueue || this._writeQueue.size === 0) return null;

    // Priority: pre-writes first
    for (const [k, v] of this._writeQueue.entries()) {
      if (v?.meta?.isPreWrite) return [k, v];
    }

    const it = this._writeQueue.entries().next();
    if (it.done) return null;
    return it.value;
  }

  async _flushWriteQueueOnce() {
    if (!this._isWriteQueueEnabled() || this._writeBusy) return;
    if (!this.driver || typeof this.driver.writeDatapoint !== 'function') return;
    if (!this._writeQueue || this._writeQueue.size === 0) return;

    this._writeBusy = true;
    let picked = null;
    try {
      picked = this._pickNextQueuedWrite();
      if (!picked) return;
      const [key, entry] = picked;
      if (!entry || !entry.dp) {
        this._writeQueue.delete(key);
        return;
      }

      const result = await this.driver.writeDatapoint(entry.dp, entry.deviceValue);
      this._recordWrite(entry.dp.id, { skipPostWriteRepeat: entry.meta?.skipPostWriteRepeat === true });
      const isCurrent = () => this._writeQueue.get(key) === entry;
      if (!isCurrent()) return;
      const effectiveValue = result && Object.prototype.hasOwnProperty.call(result, 'effectiveValue')
        ? result.effectiveValue : entry.deviceValue;

      // Persist last setpoint for restore-on-start/reconnect (best-effort)
      await this._persistSetpointValueIfNeeded(entry.dp, effectiveValue).catch(() => {});
      if (!isCurrent()) return;

      // Best-effort: keep underlying datapoint + other alias states in sync.
      await this._ackWrittenValue(entry.dp, effectiveValue, isCurrent);

      // Ack any states that were written by a user/script (dp state and/or alias state).
      if (entry.ackByRelId && entry.ackByRelId.size) {
        for (const [relId, val] of entry.ackByRelId.entries()) {
          if (!isCurrent()) return;
          // _ackWrittenValue already applies the alias conversion to a clamped
          // effective value. Do not overwrite that with the original request.
          if (effectiveValue === entry.deviceValue) await this._setStateCached(relId, val, true);
        }
      }

      // Mark prewrite as done (to avoid repeating it too often).
      if (entry.meta?.isPreWrite && entry.meta.preWriteTriggerKey) {
        this._preWriteLastTsByTrigger.set(String(entry.meta.preWriteTriggerKey), Date.now());
      }

      if (isCurrent()) this._writeQueue.delete(key);
    } catch (e) {
      // A failed old transaction must not remove or penalize its replacement.
      if (picked && this._writeQueue.get(picked[0]) !== picked[1]) {
        await this._setError(e);
        return;
      }
      if (this._isSuppressedUnsupportedWriteError(e)) {
        if (picked) {
          const [key, entry] = picked;
          if (entry && entry.dp) this._handleSuppressedUnsupportedWrite(e, entry.dp.id);
          if (this._writeQueue) this._writeQueue.delete(key);
        }
        return;
      }
      if (picked) {
        const [key, entry] = picked;
        if (entry) {
          entry.attempts = (entry.attempts || 0) + 1;
          const msg = (e && e.message) ? String(e.message) : String(e);
          const looksPermanent = /modbus\s+exception\s+(2|3)\b|illegal\s+data\s+(address|value)|register\s+not\s+supported|cannot\s+be\s+written/i.test(msg);
          if (this._isAlfenTemplate() && looksPermanent) {
            this._writeQueue.delete(key);
            if (entry.dp && entry.dp.id) this._handleAlfenRejectedControlWrite(e, entry.dp.id);
            // Automatic validity refreshes remain quiet, but a manual command must leave
            // a visible diagnostic in info.lastError. Previously Alfen FC16 exception 2/3
            // was swallowed here, so ioBroker looked as if the command had been accepted.
            if (entry.meta && entry.meta.isUserCommand === true) {
              await this._setError(e).catch(() => {});
            }
            return;
          }
          const modHints = this.template?.driverHints?.modbus || {};
          const permanentAttemptsRaw = Number(modHints.permanentWriteErrorRetryAttempts ?? 1);
          const permanentAttempts = Number.isFinite(permanentAttemptsRaw) && permanentAttemptsRaw > 0 ? permanentAttemptsRaw : 1;
          const maxAttempts = looksPermanent ? permanentAttempts : 10;
          if (entry.attempts >= maxAttempts) {
            this._writeQueue.delete(key);
            if (looksPermanent) {
              const cooldownMsRaw = Number(modHints.unsupportedWriteCooldownMs ?? 0);
              const cooldownMs = Number.isFinite(cooldownMsRaw) && cooldownMsRaw > 0 ? cooldownMsRaw : 0;
              if (cooldownMs > 0 && entry.dp && entry.dp.id) {
                this._markWriteTemporarilyUnsupported(entry.dp.id, msg);
              }
            }
          }
        }
      }
      await this._setError(e);
    } finally {
      this._writeBusy = false;
    }
  }

  _startWriteLoop() {
    if (this._writeTimer || !this._isWriteQueueEnabled() || this._useCommandCadenceScheduler) return;
    const intervalMs = this._writeThrottleMs;
    if (!intervalMs || intervalMs < 250) return;

    const self = this;
    const loop = async () => {
      if (!self._isWriteQueueEnabled() || self._useCommandCadenceScheduler) return;
      await self._flushWriteQueueOnce().catch(() => {});
      self._writeTimer = setTimeout(loop, intervalMs);
    };
    this._writeTimer = setTimeout(loop, intervalMs);
  }

  _stopWriteLoop() {
    if (this._writeTimer) {
      clearTimeout(this._writeTimer);
      this._writeTimer = null;
    }
  }

  async handleStateChange(fullId, state) {
    if (!state || state.ack) return;
    // Convert full id -> relative id
    const relPrefix = this.adapter.namespace + '.';
    const relId = fullId.startsWith(relPrefix) ? fullId.substring(relPrefix.length) : fullId;

    // An external/user write changed the state to ack=false. Drop the cached value so the
    // follow-up ack=true write is not suppressed as "unchanged".
    try { this._stateCache.delete(relId); } catch (_) {}

    // 1) alias write handling (stable interface)
    const aliasDef = this.aliasByStateRelId.get(relId);
    if (aliasDef) {
      if (!(aliasDef.rw === 'rw' || aliasDef.rw === 'wo')) return;
      if (!this.driver || typeof this.driver.writeDatapoint !== 'function') return;

      // Keep the alias target outside the try block.  A later direct datapoint variable named
      // "dp" exists in this function; referencing it from the alias catch block hits the JS
      // temporal-dead-zone and crashed the adapter on rejected alias writes.
      let aliasTargetDp = null;
      try {
        const targetId = aliasDef.writeDpId || aliasDef.dpId;
        aliasTargetDp = this._getDpById(targetId);
        if (!aliasTargetDp) throw new Error(`Alias target datapoint not found: ${targetId}`);

        // Direct user/script writes must not be suppressed by a previous automatic
        // keepalive rejection.  Especially with Alfen ACE this caused writable aliases
        // to appear dead for the cooldown window.
        const toDev = (typeof aliasDef.toDevice === 'function') ? aliasDef.toDevice(state.val) : state.val;
        if (toDev === undefined || toDev === null) {
          // Command-button aliases can intentionally ignore the inactive/false edge
          // (e.g. KEBA P40 fast charging can only be activated, not deactivated, via Modbus).
          await this._setStateCached(relId, state.val, true);
          return;
        }

        let mirrorSignedDp = null;
        let mirrorSignedVal;
        if (aliasDef.mirrorSignedDpId) {
          mirrorSignedDp = this._getDpById(aliasDef.mirrorSignedDpId);
          if (mirrorSignedDp) {
            mirrorSignedVal = (typeof aliasDef.toMirrorDevice === 'function') ? aliasDef.toMirrorDevice(state.val) : toDev;
            this._rememberCommandedValue(mirrorSignedDp.id, mirrorSignedVal);
          }
        }

        // Alfen ACE: remember the command before it is sent so the 5s watchdog cannot
        // overwrite a freshly typed alias value with an older restored value while the
        // Modbus write is still pending. This is especially important for phaseMode,
        // where stale info.setpoints.cHARGE_USING_PHASES=1 previously forced 1-phase
        // operation again after a manual 3-phase command.
        if (this._isAlfenTemplate() && aliasTargetDp && (String(aliasTargetDp.id) === 'sET_CHARGING_CURRENT' || String(aliasTargetDp.id) === 'cHARGE_USING_PHASES')) {
          try {
            this._lastCommandedValueByDpId.set(String(aliasTargetDp.id), toDev);
            this._clearWriteTemporarilyUnsupported(aliasTargetDp.id);
          } catch (_) {}
        }

        // For sensitive devices (e.g. SolaX), coalesce/throttle writes instead of sending them immediately.
        this._rememberCommandedValue(aliasTargetDp.id, toDev);

        if (this._isWriteQueueEnabled()) {
          this._enqueueWrite(relId, aliasTargetDp, toDev, state.val, { bypassUnsupportedCooldown: true, isUserCommand: true });
          return;
        }

        // Optional pre-writes (template hinted), e.g. writing a control mode before an active power setpoint.
        await this._maybeExecutePreWritesForDp(aliasTargetDp.id);
        const writeResult = await this.driver.writeDatapoint(aliasTargetDp, toDev);
        const effectiveToDev = writeResult && writeResult.effectiveValue !== undefined
          ? writeResult.effectiveValue
          : toDev;
        this._rememberCommandedValue(aliasTargetDp.id, effectiveToDev);

        // Track that this datapoint was actively written (used for watchdog fail-safe).
        this._recordWrite(aliasTargetDp.id);

        // Persist last setpoint for restore-on-start/reconnect (best-effort)
        await this._persistSetpointValueIfNeeded(aliasTargetDp, effectiveToDev).catch(() => {});

        // Most drivers apply the requested value unchanged. A driver may return an
        // effective/clamped engineering value (TESVOLT dynamic power limits). In that
        // case acknowledge the actual command while preserving alias direction semantics.
        let aliasAckValue = state.val;
        if (writeResult && writeResult.effectiveValue !== undefined && !Object.is(effectiveToDev, toDev)) {
          if (typeof aliasDef.fromDevice === 'function') aliasAckValue = aliasDef.fromDevice(effectiveToDev);
          else if (typeof aliasDef.toDevice !== 'function') aliasAckValue = effectiveToDev;
        }
        await this._setStateCached(relId, aliasAckValue, true);

        // best-effort: keep underlying datapoint + other alias states in sync with the written raw value
        await this._ackWrittenValue(aliasTargetDp, effectiveToDev);
        if (mirrorSignedDp) {
          await this._ackWrittenValue(mirrorSignedDp, mirrorSignedVal);
        }

        return;
      } catch (e) {
        if (this._isSuppressedUnsupportedWriteError(e)) {
          this._handleSuppressedUnsupportedWrite(e, aliasTargetDp && aliasTargetDp.id ? aliasTargetDp.id : undefined);
          return;
        }
        const msg = (e && e.message) ? String(e.message) : String(e);
        if (this._isAlfenTemplate() && this._looksLikePermanentModbusWriteReject(msg)) {
          this._handleAlfenRejectedControlWrite(e, aliasTargetDp && aliasTargetDp.id ? aliasTargetDp.id : undefined);
          // Surface explicit user-command failures. Keepalive/post-repeat failures are
          // handled separately and remain throttled to avoid log flooding.
          await this._setError(e).catch(() => {});
          return;
        }
        if (this._looksLikePermanentModbusWriteReject(msg)) {
          this._markWriteTemporarilyUnsupported(aliasTargetDp && aliasTargetDp.id ? aliasTargetDp.id : undefined, msg);
        }
        await this._setError(e).catch(() => {});
        return;
      }
    }

    // 2) regular datapoint write handling
    const dp = this.dpByStateRelId.get(relId);
    if (!dp) return;
    if (!(dp.rw === 'rw' || dp.rw === 'wo')) return;
    if (!this.driver || typeof this.driver.writeDatapoint !== 'function') return;

    try {
      // Direct user/script writes must not be suppressed by a previous automatic
      // keepalive rejection. Let the actual device response decide.
      this._rememberCommandedValue(dp.id, state.val);

      // For sensitive devices (e.g. SolaX), coalesce/throttle writes instead of sending them immediately.
      if (this._isWriteQueueEnabled()) {
        this._enqueueWrite(relId, dp, state.val, state.val, { bypassUnsupportedCooldown: true, isUserCommand: true });
        return;
      }

      // Optional pre-writes (template hinted), e.g. writing a control mode before an active power setpoint.
      await this._maybeExecutePreWritesForDp(dp.id);
      const writeResult = await this.driver.writeDatapoint(dp, state.val);
      const effectiveValue = writeResult && writeResult.effectiveValue !== undefined
        ? writeResult.effectiveValue
        : state.val;
      this._rememberCommandedValue(dp.id, effectiveValue);

      // Track that this datapoint was actively written (used for watchdog fail-safe).
      this._recordWrite(dp.id);

      // Persist last setpoint for restore-on-start/reconnect (best-effort)
      await this._persistSetpointValueIfNeeded(dp, effectiveValue).catch(() => {});

      // ack the written value
      await this._setStateCached(relId, effectiveValue, true);
    } catch (e) {
      if (this._isSuppressedUnsupportedWriteError(e)) {
        this._handleSuppressedUnsupportedWrite(e, dp && dp.id ? dp.id : undefined);
        return;
      }
      const msg = (e && e.message) ? String(e.message) : String(e);
      if (this._isAlfenTemplate() && this._looksLikePermanentModbusWriteReject(msg)) {
        this._handleAlfenRejectedControlWrite(e, dp && dp.id ? dp.id : undefined);
        await this._setError(e).catch(() => {});
        return;
      }
      if (this._looksLikePermanentModbusWriteReject(msg)) this._markWriteTemporarilyUnsupported(dp && dp.id ? dp.id : undefined, msg);
      await this._setError(e).catch(() => {});
    }
  }


  _getAutoWatchdogConfig() {
    const hints = this.template?.driverHints?.modbus;
    const cfg = hints?.autoWatchdog || hints?.autoWatchdogs || hints?.watchdog;
    if (!cfg) return null;

    if (cfg === true) {
      // Boolean true is ambiguous without dpIds; require explicit list
      return null;
    }

    const enabled = (cfg.enabled !== false);
    if (!enabled) return null;

    const periodMs = Number(cfg.periodMs ?? cfg.intervalMs ?? 60000);
    const startDelayMs = Number(cfg.startDelayMs ?? 1000);
    const sequenceMin = Number(cfg.sequenceMin ?? 1);
    const sequenceMax = Number(cfg.sequenceMax ?? 1000);

    const activeForMsRaw = Number(cfg.activeForMs ?? cfg.activeWindowMs ?? cfg.activeAfterWriteMs ?? 0);
    const activeForMs = (Number.isFinite(activeForMsRaw) && activeForMsRaw > 0) ? activeForMsRaw : null;

    const globalActivation = Array.isArray(cfg.activateOnWriteDpIds || cfg.activationDpIds)
      ? (cfg.activateOnWriteDpIds || cfg.activationDpIds)
      : [];
    const globalActivationDpIds = globalActivation.map(v => String(v)).filter(v => v && v.trim());

    // Targets can be defined as:
    //  - cfg.targets: [ { dpId, activateOnWriteDpIds }, ... ]
    //  - cfg.dpIds: [ 'DP1', 'DP2', ... ] (legacy)
    //  - cfg as array: [ 'DP1', ... ] (legacy)
    const rawTargets = Array.isArray(cfg.targets)
      ? cfg.targets
      : Array.isArray(cfg.dpIds)
        ? cfg.dpIds
        : Array.isArray(cfg)
          ? cfg
          : [];

    const targets = [];
    for (const t of rawTargets) {
      if (!t) continue;
      if (typeof t === 'string' || typeof t === 'number') {
        const dpId = String(t);
        if (!dpId.trim()) continue;
        targets.push({ dpId, activationDpIds: globalActivationDpIds });
        continue;
      }
      if (typeof t === 'object') {
        const dpId = String(t.dpId ?? t.watchdogDpId ?? t.id ?? '');
        if (!dpId.trim()) continue;
        const act = Array.isArray(t.activateOnWriteDpIds || t.activationDpIds || t.activeOnWriteDpIds)
          ? (t.activateOnWriteDpIds || t.activationDpIds || t.activeOnWriteDpIds)
          : globalActivationDpIds;
        const activationDpIds = (act || []).map(v => String(v)).filter(v => v && v.trim());
        targets.push({ dpId, activationDpIds });
      }
    }
    if (!targets.length) return null;

    // Optional: Disable a control register when setpoints are no longer refreshed (fail-safe).
    let disable = null;
    const disableWhenInactive = cfg.disableWhenInactive === true;
    if (disableWhenInactive) {
      const disableDpId = String(cfg.disableDpId ?? '').trim();
      const disableValue = (cfg.disableValue !== undefined) ? cfg.disableValue : 0;
      const disableAfterMsRaw = Number(cfg.disableAfterMs ?? activeForMsRaw ?? 0);
      const disableAfterMs = (Number.isFinite(disableAfterMsRaw) && disableAfterMsRaw > 0) ? disableAfterMsRaw : null;
      const disableActRaw = Array.isArray(cfg.disableActivationDpIds)
        ? cfg.disableActivationDpIds
        : [];
      const disableActivationDpIds = disableActRaw.map(v => String(v)).filter(v => v && v.trim());
      if (disableDpId && disableAfterMs && disableActivationDpIds.length) {
        disable = {
          dpId: disableDpId,
          value: disableValue,
          afterMs: disableAfterMs,
          activationDpIds: disableActivationDpIds,
        };
      }
    }

    return {
      periodMs: Number.isFinite(periodMs) ? periodMs : 60000,
      startDelayMs: Number.isFinite(startDelayMs) ? startDelayMs : 1000,
      sequenceMin: Number.isFinite(sequenceMin) ? sequenceMin : 1,
      sequenceMax: Number.isFinite(sequenceMax) ? sequenceMax : 1000,
      activeForMs,
      targets,
      disable,
    };
  }

  async _startAutoWatchdogs() {
    // Only applies to Modbus devices
    const proto = this.cfg?.protocol;
    if (proto !== 'modbusTcp' && proto !== 'modbusRtu') return;

    const cfg = this._getAutoWatchdogConfig();
    if (!cfg) return;

    if (this.watchdogTimer || this.watchdogStartTimer) return;

    // Resolve writable watchdog datapoints
    const targets = [];
    for (const t of cfg.targets) {
      const dpId = t?.dpId;
      if (!dpId) continue;
      const dp = this._getDpById(dpId);
      if (!dp) {
        this.adapter.log.debug(`[${this.cfg.id}] AutoWatchdog: datapoint not found: ${dpId}`);
        continue;
      }
      if (!(dp.rw === 'rw' || dp.rw === 'wo')) {
        this.adapter.log.debug(`[${this.cfg.id}] AutoWatchdog: datapoint not writable: ${dpId}`);
        continue;
      }
      targets.push({ dp, activationDpIds: Array.isArray(t.activationDpIds) ? t.activationDpIds : [] });
    }

    if (!targets.length) return;

    // Optional fail-safe: disable a control register when setpoints are no longer refreshed.
    let disable = null;
    if (cfg.disable && cfg.disable.dpId) {
      const dp = this._getDpById(cfg.disable.dpId);
      if (dp && (dp.rw === 'rw' || dp.rw === 'wo')) {
        disable = {
          dp,
          value: cfg.disable.value,
          afterMs: cfg.disable.afterMs,
          activationDpIds: Array.isArray(cfg.disable.activationDpIds) ? cfg.disable.activationDpIds : [],
        };
      }
    }

    const periodMs = Math.max(10000, Number(cfg.periodMs || 60000));
    const startDelayMs = Math.max(0, Number(cfg.startDelayMs || 1000));

    const minVal = Math.trunc(Number(cfg.sequenceMin || 1));
    const maxValRaw = Math.trunc(Number(cfg.sequenceMax || 1000));
    const maxVal = Number.isFinite(maxValRaw) && maxValRaw >= minVal ? maxValRaw : 1000;

    // Initialize counter so the first tick yields minVal
    if (!Number.isFinite(this._watchdogCounter) || this._watchdogCounter < minVal || this._watchdogCounter > maxVal) {
      this._watchdogCounter = minVal - 1;
    }

    const tick = async () => {
      if (this._watchdogBusy) return;
      this._watchdogBusy = true;
      try {
        if (!this.driver || typeof this.driver.writeDatapoint !== 'function') return;
        if (!this._connOk) return; // only when connected

        // Avoid colliding with ongoing read polls
        if (this.driver && this.driver._busy) return;

        const now = Date.now();

        // Fail-safe: disable VK control if no recent setpoint updates (and if it was ever used).
        if (disable && disable.afterMs && disable.activationDpIds.length) {
          const hasEver = disable.activationDpIds.some(id => this._lastWriteByDpId.has(String(id)));
          const recent = disable.activationDpIds.some(id => {
            const ts = this._lastWriteByDpId.get(String(id));
            return ts && (now - ts) <= disable.afterMs;
          });

          if (hasEver && recent) {
            this._autoWatchdogControlEverActive = true;
            this._autoWatchdogControlDisabled = false;
          }

          if (hasEver && this._autoWatchdogControlEverActive && !recent && !this._autoWatchdogControlDisabled) {
            try {
              await this.driver.writeDatapoint(disable.dp, disable.value);
              this._recordWrite(disable.dp.id);
              await this._ackWrittenValue(disable.dp, disable.value);
              this._autoWatchdogControlDisabled = true;
              this.adapter.log.info(`[${this.cfg.id}] AutoWatchdog fail-safe: wrote ${disable.dp.id}=${disable.value}`);
            } catch (e) {
              this.adapter.log.debug(`[${this.cfg.id}] AutoWatchdog fail-safe write error: ${e && e.message ? e.message : e}`);
            }
          }
        }

        // Determine which watchdogs are active.
        const activeTargets = [];
        for (const t of targets) {
          const activationDpIds = t.activationDpIds || [];
          if (!cfg.activeForMs || !activationDpIds.length) {
            activeTargets.push(t);
            continue;
          }
          let isActive = false;
          for (const id of activationDpIds) {
            const ts = this._lastWriteByDpId.get(String(id));
            if (ts && (now - ts) <= cfg.activeForMs) {
              isActive = true;
              break;
            }
          }
          if (isActive) activeTargets.push(t);
        }

        if (!activeTargets.length) return;

        // Ramp min..max (loop)
        let next = this._watchdogCounter + 1;
        if (next > maxVal) next = minVal;
        this._watchdogCounter = next;

        for (const t of activeTargets) {
          await this.driver.writeDatapoint(t.dp, next);
          this._recordWrite(t.dp.id);
          await this._ackWrittenValue(t.dp, next);
        }
        this.adapter.log.debug(`[${this.cfg.id}] AutoWatchdog tick -> ${next} (targets=${activeTargets.map(x => x.dp.id).join(',')})`);
      } catch (e) {
        // Best-effort: do not spam warnings; poll loop will surface transport errors.
        this.adapter.log.debug(`[${this.cfg.id}] AutoWatchdog error: ${e && e.message ? e.message : e}`);
      } finally {
        this._watchdogBusy = false;
      }
    };

    // Fire once shortly after start, then periodically
    this.watchdogStartTimer = setTimeout(() => { tick(); }, startDelayMs);
    this.watchdogTimer = setInterval(() => { tick(); }, periodMs);

    this.adapter.log.info(`[${this.cfg.id}] AutoWatchdog enabled: dpIds=[${targets.map(t => t.dp.id).join(', ')}], periodMs=${periodMs}, activeForMs=${cfg.activeForMs || 0}`);
  }


  _getRestoreSetpointsConfig() {
    const proto = this.cfg?.protocol;
    if (proto !== 'modbusTcp' && proto !== 'modbusRtu' && proto !== 'modbusAscii') return null;

    const hints = this.template?.driverHints?.modbus;
    if (!hints) return null;

    let cfg = hints.restoreSetpointsOnStart || hints.restoreSetpoints || hints.restoreOnStart || null;
    if (!cfg) return null;

    // Allow boolean shorthand: true => enabled with defaults
    if (cfg === true) cfg = {};

    if (!cfg || typeof cfg !== 'object') return null;
    if (cfg.enabled === false) return null;

    const dpIdsRaw = Array.isArray(cfg.dpIds)
      ? cfg.dpIds
      : Array.isArray(cfg.targets)
        ? cfg.targets
        : [];

    const dpIds = (dpIdsRaw || []).map(v => String(v)).filter(v => v && v.trim());
    if (!dpIds.length) return null;

    const delayMsRaw = Number(cfg.delayMs ?? cfg.startDelayMs ?? 1500);
    const delayMs = Number.isFinite(delayMsRaw) ? Math.max(0, delayMsRaw) : 1500;

    const storeOnWrite = (cfg.storeOnWrite !== false);
    const useFallbackFromDpState = (cfg.useFallbackFromDpState !== false);

    const maxRetriesRaw = Number(cfg.maxRetries ?? 6);
    const maxRetries = Number.isFinite(maxRetriesRaw) ? Math.max(0, Math.trunc(maxRetriesRaw)) : 6;

    const retryMsRaw = Number(cfg.retryMs ?? cfg.retryIntervalMs ?? 5000);
    const retryMs = Number.isFinite(retryMsRaw) ? Math.max(1000, retryMsRaw) : 5000;

    const logLevel = String(cfg.logLevel ?? cfg.restoreLogLevel ?? 'info').toLowerCase();

    return {
      dpIds,
      delayMs,
      storeOnWrite,
      useFallbackFromDpState,
      maxRetries,
      retryMs,
      logLevel,
      exclusiveGroups: this._normalizeExclusiveSetpointGroups(cfg.exclusiveGroups || cfg.exclusiveSetpointGroups || []),
    };
  }

  _setpointMemoryRelId(dpId) {
    return `${this.baseId}.info.setpoints.${String(dpId)}`;
  }

  async _ensureSetpointMemoryObjects(dp) {
    if (!dp || !dp.id) return;

    // Ensure channel exists once
    if (!this._setpointsInfoReady) {
      await this.adapter.setObjectNotExistsAsync(`${this.baseId}.info.setpoints`, {
        type: 'channel',
        common: { name: 'Setpoints' },
        native: {},
      }).catch(() => {});
      this._setpointsInfoReady = true;
    }

    const id = this._setpointMemoryRelId(dp.id);

    // Determine ioBroker type (fallback to number for setpoints)
    const t = (dp.type === 'boolean') ? 'boolean' : (dp.type === 'string') ? 'string' : 'number';

    await this.adapter.setObjectNotExistsAsync(id, {
      type: 'state',
      common: {
        name: dp.name ? `Last setpoint: ${dp.name}` : `Last setpoint: ${dp.id}`,
        type: t,
        role: 'state',
        read: true,
        write: false,
        unit: dp.unit || undefined,
      },
      native: {
        dpId: dp.id,
      },
    }).catch(() => {});
  }

  async _persistSetpointValueIfNeeded(dp, deviceValue) {
    const cfg = this._restoreCfg;
    if (!cfg || cfg.storeOnWrite === false) return;
    if (!dp || !dp.id) return;
    if (!this._restoreDpIds || !this._restoreDpIds.has(String(dp.id))) return;

    if (deviceValue === null || deviceValue === undefined) return;

    // Normalize values to keep ioBroker state type stable
    let out = deviceValue;
    if (dp.type === 'boolean') {
      out = !!deviceValue;
    } else if (dp.type === 'string') {
      out = String(deviceValue);
    } else {
      const n = Number(deviceValue);
      if (!Number.isFinite(n)) return;
      out = n;
    }

    await this._ensureSetpointMemoryObjects(dp);
    await this._setStateCached(this._setpointMemoryRelId(dp.id), out, true);
  }

  _scheduleRestoreSetpoints(reason = '') {
    const cfg = this._restoreCfg;
    if (!cfg || !Array.isArray(cfg.dpIds) || !cfg.dpIds.length) return;

    // Avoid stacking timers
    if (this._restoreTimer) return;

    const delayMs = Math.max(0, Number(cfg.delayMs || 0));
    const maxRetries = Math.max(0, Number(cfg.maxRetries || 0));
    const retryMs = Math.max(1000, Number(cfg.retryMs || 5000));

    let attempts = 0;

    const run = async () => {
      // Don't collide with ongoing restore attempt
      if (this._restoreBusy) return;

      // Wait until we are connected
      if (!this._connOk) {
        attempts++;
        if (attempts <= maxRetries) {
          this._restoreTimer = setTimeout(() => {
            this._restoreTimer = null;
            run().catch(() => {});
          }, retryMs);
        }
        return;
      }

      await this._restoreSetpointsOnce(reason).catch(() => {});
    };

    this._restoreTimer = setTimeout(() => {
      this._restoreTimer = null;
      run().catch(() => {});
    }, delayMs);
  }

  _normalizeExclusiveSetpointGroups(rawGroups) {
    if (!Array.isArray(rawGroups)) return [];
    const groups = [];
    for (const group of rawGroups) {
      const arr = Array.isArray(group)
        ? group
        : (group && typeof group === 'object' && Array.isArray(group.dpIds))
          ? group.dpIds
          : (group && typeof group === 'object' && Array.isArray(group.targets))
            ? group.targets
            : [];
      const ids = arr.map(v => String(v || '').trim()).filter(Boolean);
      const uniq = [];
      for (const id of ids) if (!uniq.includes(id)) uniq.push(id);
      if (uniq.length > 1) groups.push(uniq);
    }
    return groups;
  }

  _applyExclusiveSetpointGroupsToCandidates(candidates, groups) {
    if (!Array.isArray(candidates) || !candidates.length || !Array.isArray(groups) || !groups.length) return candidates;

    const byId = new Map();
    for (const c of candidates) {
      if (!c || !c.dp || !c.dp.id) continue;
      byId.set(String(c.dp.id), c);
    }

    const drop = new Set();
    for (const group of groups) {
      const present = group.map(id => byId.get(String(id))).filter(Boolean);
      if (present.length <= 1) continue;

      // Restore/refresh only the newest setpoint in a mutually exclusive control group.
      // This is important for chargers like MENNEKES where current-limit, power-limit,
      // legacy and network-limit registers are alternative control paths. Restoring all
      // old states after reconnect can overwrite the intended active mode.
      let keep = present[0];
      for (const c of present.slice(1)) {
        const ts = Number(c.ts || 0);
        const keepTs = Number(keep.ts || 0);
        if (ts > keepTs) keep = c;
      }
      for (const c of present) {
        if (c !== keep) drop.add(String(c.dp.id));
      }
    }

    if (!drop.size) return candidates;
    return candidates.filter(c => c && c.dp && !drop.has(String(c.dp.id)));
  }

  _applyExclusiveSetpointGroupsToKeepaliveTargets(targets, groups) {
    if (!Array.isArray(targets) || !targets.length || !Array.isArray(groups) || !groups.length) return targets;

    const byId = new Map();
    for (const t of targets) {
      if (!t || !t.setpointDpId) continue;
      byId.set(String(t.setpointDpId), t);
    }

    const drop = new Set();
    for (const group of groups) {
      const present = group.map(id => byId.get(String(id))).filter(Boolean);
      if (present.length <= 1) continue;

      let keep = null;
      let keepTs = -1;
      for (const t of present) {
        const ts = Number(this._lastWriteByDpId.get(String(t.setpointDpId)) || 0);
        // Only a datapoint that was actually written can become the active refresh target.
        if (ts > keepTs) {
          keepTs = ts;
          keep = t;
        }
      }

      // If nothing in this group was ever written, keep the group untouched. The existing
      // requireEverWritten check will skip all targets without making this look unsupported.
      if (!keep || keepTs <= 0) continue;

      for (const t of present) {
        if (t !== keep) drop.add(String(t.setpointDpId));
      }
    }

    if (!drop.size) return targets;
    return targets.filter(t => t && !drop.has(String(t.setpointDpId)));
  }


  _getRuntimeExclusiveSetpointGroups() {
    const hints = this.template?.driverHints?.modbus || {};
    const raw = hints.exclusiveSetpointGroups ||
      hints.mutuallyExclusiveSetpointGroups ||
      hints.exclusiveControlGroups ||
      (hints.restoreSetpointsOnStart && (hints.restoreSetpointsOnStart.exclusiveGroups || hints.restoreSetpointsOnStart.exclusiveSetpointGroups)) ||
      (hints.restoreSetpoints && (hints.restoreSetpoints.exclusiveGroups || hints.restoreSetpoints.exclusiveSetpointGroups)) ||
      [];
    return this._normalizeExclusiveSetpointGroups(raw);
  }

  _getExclusiveSetpointPeers(dpId) {
    const key = String(dpId || '');
    if (!key) return [];
    const groups = this._getRuntimeExclusiveSetpointGroups();
    const peers = [];
    for (const group of groups) {
      if (!Array.isArray(group) || !group.includes(key)) continue;
      for (const id of group) {
        const s = String(id || '');
        if (s && s !== key && !peers.includes(s)) peers.push(s);
      }
    }
    return peers;
  }

  _cancelExclusiveSetpointPeerPostRepeats(dpId) {
    const peers = this._getExclusiveSetpointPeers(dpId);
    if (!peers.length || !this._postWriteRepeatTimersByDpId) return;
    for (const peer of peers) {
      try {
        const timer = this._postWriteRepeatTimersByDpId.get(peer);
        if (timer) clearTimeout(timer);
        this._postWriteRepeatTimersByDpId.delete(peer);
      } catch (_) {}
    }
  }

  _dropQueuedExclusiveSetpointPeers(dpId) {
    const peers = this._getExclusiveSetpointPeers(dpId);
    if (!peers.length || !this._writeQueue) return;
    for (const peer of peers) {
      try { this._writeQueue.delete(peer); } catch (_) {}
    }
  }

  async _restoreSetpointsOnce(reason = '') {
    const cfg = this._restoreCfg;
    if (!cfg || !Array.isArray(cfg.dpIds) || !cfg.dpIds.length) return;
    if (this._restoreBusy) return;

    this._restoreBusy = true;
    try {
      if (!this.driver || typeof this.driver.writeDatapoint !== 'function') return;
      if (!this._connOk) return;
      if (this.driver && this.driver._busy) return; // avoid colliding with ongoing read polls

      let candidates = [];

      for (const rawId of cfg.dpIds) {
        const dpId = String(rawId || '');
        if (!dpId) continue;

        const dp = this._getDpById(dpId);
        if (!dp) continue;
        if (!(dp.rw === 'rw' || dp.rw === 'wo')) continue;

        // Prefer persisted memory (info.setpoints.*). Fallback to pre-poll captured dp state if configured.
        let val = undefined;
        let ts = 0;

        const mem = await this.adapter.getStateAsync(this._setpointMemoryRelId(dp.id)).catch(() => null);
        if (mem && mem.val !== null && mem.val !== undefined) {
          val = mem.val;
          ts = Number(mem.ts || mem.lc || 0) || 0;
        }

        if ((val === undefined) && cfg.useFallbackFromDpState !== false) {
          if (this._restoreFallback && this._restoreFallback.has(String(dp.id))) {
            val = this._restoreFallback.get(String(dp.id));
            const st = await this.adapter.getStateAsync(this.relStateId(dp)).catch(() => null);
            ts = Number(st && (st.ts || st.lc) || 0) || 0;
          }
        }

        if (val === null || val === undefined) continue;

        // Normalize
        if (dp.type === 'boolean') {
          val = !!val;
        } else if (dp.type === 'string') {
          val = String(val);
        } else {
          const n = Number(val);
          if (!Number.isFinite(n)) continue;
          val = n;
        }

        candidates.push({ dp, val, ts });
      }

      candidates = this._applyExclusiveSetpointGroupsToCandidates(candidates, cfg.exclusiveGroups || []);

      const actions = [];
      const queueing = this._isWriteQueueEnabled();
      for (const c of candidates) {
        const { dp, val } = c;
        // Write (best-effort)
        if (queueing) {
          this._enqueueWrite(null, dp, val, val);
        } else {
          await this.driver.writeDatapoint(dp, val);
          this._recordWrite(dp.id);
          await this._ackWrittenValue(dp, val);
        }

        await this._persistSetpointValueIfNeeded(dp, val).catch(() => {});
        actions.push(`${dp.id}=${val}`);
      }

      if (actions.length) {
        const prefix = queueing ? 'Queued setpoint restore' : 'Restored setpoints';
        const msg = `[${this.cfg.id}] ${prefix}${reason ? ` (${reason})` : ''}: ${actions.join(', ')}`;
        const lvl = String(cfg.logLevel || 'info').toLowerCase();
        if (lvl === 'silent' || lvl === 'none' || lvl === 'off') {
          // intentionally quiet
        } else if (lvl === 'debug') {
          this.adapter.log.debug(msg);
        } else if (lvl === 'warn' || lvl === 'warning') {
          this.adapter.log.warn(msg);
        } else {
          this.adapter.log.info(msg);
        }
      } else {
        this.adapter.log.debug(`[${this.cfg.id}] No setpoints to restore${reason ? ` (${reason})` : ''}.`);
      }
    } catch (e) {
      this.adapter.log.debug(`[${this.cfg.id}] Restore setpoints error: ${e && e.message ? e.message : e}`);
    } finally {
      this._restoreBusy = false;
    }
  }

  _getPostWriteRepeatConfig() {
    const proto = this.cfg?.protocol;
    if (proto !== 'modbusTcp' && proto !== 'modbusRtu' && proto !== 'modbusAscii') return null;

    const hints = this.template?.driverHints?.modbus;
    if (!hints) return null;

    let cfg = hints.postWriteRepeat || hints.repeatAfterWrite || hints.confirmWriteAfterIdle || null;
    if (!cfg) return null;
    if (cfg === true) cfg = {};
    if (!cfg || typeof cfg !== 'object') return null;
    if (cfg.enabled === false) return null;

    const rawTargets = Array.isArray(cfg.targets)
      ? cfg.targets
      : Array.isArray(cfg.dpIds)
        ? cfg.dpIds
        : (cfg.dpId || cfg.setpointDpId)
          ? [cfg]
          : [];

    const targets = [];
    for (const raw of rawTargets) {
      const t = (raw && typeof raw === 'object') ? raw : { dpId: raw };
      const dpId = String(t.dpId || t.setpointDpId || '').trim();
      if (!dpId) continue;
      const delayRaw = Number(t.delayMs ?? t.repeatAfterMs ?? t.idleMs ?? cfg.delayMs ?? cfg.repeatAfterMs ?? cfg.idleMs ?? 5000);
      const delayMs = Number.isFinite(delayRaw) && delayRaw > 0 ? Math.max(1000, delayRaw) : 5000;
      targets.push({
        dpId,
        delayMs,
        useLastCommandValue: (t.useLastCommandValue !== false && cfg.useLastCommandValue !== false),
        logLevel: String(t.logLevel ?? cfg.logLevel ?? 'debug').toLowerCase(),
      });
    }

    if (!targets.length) return null;
    return { targets };
  }

  _getPostWriteRepeatTarget(dpId) {
    const cfg = this._getPostWriteRepeatConfig();
    if (!cfg || !Array.isArray(cfg.targets)) return null;
    const key = String(dpId || '');
    return cfg.targets.find(t => String(t.dpId) === key) || null;
  }

  _schedulePostWriteRepeat(dpId) {
    const target = this._getPostWriteRepeatTarget(dpId);
    if (!target) return;

    const key = String(dpId);
    if (!key) return;

    if (this._postWriteRepeatTimersByDpId && this._postWriteRepeatTimersByDpId.has(key)) {
      try { clearTimeout(this._postWriteRepeatTimersByDpId.get(key)); } catch (_) {}
      this._postWriteRepeatTimersByDpId.delete(key);
    }

    const baseTs = Number(this._lastWriteByDpId.get(key) || Date.now());
    const delayMs = Math.max(1000, Number(target.delayMs || 5000));

    const timer = setTimeout(async () => {
      try {
        if (this._postWriteRepeatTimersByDpId) this._postWriteRepeatTimersByDpId.delete(key);
        if (!this.driver || typeof this.driver.writeDatapoint !== 'function') return;
        if (!this._connOk) return;
        if (this._isWriteTemporarilyUnsupported(key)) return;

        // Only repeat if no newer write for this datapoint has happened since the timer was armed.
        const latestTs = Number(this._lastWriteByDpId.get(key) || 0);
        if (latestTs && latestTs !== baseTs) return;

        const dp = this._getDpById(key);
        if (!dp || !(dp.rw === 'rw' || dp.rw === 'wo')) return;

        let val;
        if (target.useLastCommandValue !== false && this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(key)) {
          val = this._lastCommandedValueByDpId.get(key);
        } else {
          const st = await this.adapter.getStateAsync(this.relStateId(dp)).catch(() => null);
          if (!st || st.val === undefined || st.val === null) return;
          val = st.val;
        }

        if (val === undefined || val === null) return;
        if (dp.type !== 'boolean' && dp.type !== 'string') {
          const n = Number(val);
          if (!Number.isFinite(n)) return;
          val = n;
        } else if (dp.type === 'boolean') {
          val = !!val;
        }

        if (this._isWriteQueueEnabled()) {
          this._enqueueWrite(null, dp, val, val, { skipPostWriteRepeat: true, isPostWriteRepeat: true });
        } else {
          await this.driver.writeDatapoint(dp, val);
          this._recordWrite(dp.id, { skipPostWriteRepeat: true });
          await this._ackWrittenValue(dp, val);
        }

        const msg = `[${this.cfg.id}] PostWriteRepeat: repeated ${key}=${val} after ${delayMs} ms idle`;
        const lvl = String(target.logLevel || 'debug').toLowerCase();
        if (lvl === 'info') this.adapter.log.info(msg);
        else if (lvl === 'warn' || lvl === 'warning') this.adapter.log.warn(msg);
        else if (lvl !== 'silent' && lvl !== 'none' && lvl !== 'off') this.adapter.log.debug(msg);
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        if (this._isSuppressedUnsupportedWriteError(e)) {
          this._handleSuppressedUnsupportedWrite(e, key);
          return;
        }
        if (this._isAlfenTemplate() && this._looksLikePermanentModbusWriteReject(msg)) {
          this._handleAlfenRejectedControlWrite(e, key);
          return;
        }
        this.adapter.log.debug(`[${this.cfg.id}] PostWriteRepeat error for ${key}: ${msg}`);
      }
    }, delayMs);

    if (this._postWriteRepeatTimersByDpId) this._postWriteRepeatTimersByDpId.set(key, timer);
  }

  _getSetpointKeepaliveConfig() {
    const proto = this.cfg?.protocol;
    if (proto !== 'modbusTcp' && proto !== 'modbusRtu' && proto !== 'modbusAscii') return null;

    const hints = this.template?.driverHints?.modbus;
    if (!hints) return null;
    const cfg = hints.setpointKeepalive || hints.setpointRefresh || null;
    if (!cfg) return null;
    if (cfg.enabled === false) return null;

    // Support either a single target or an array.
    // Two modes are supported:
    //  1) remainingTimeDpId-based refresh: write when remaining valid time drops below threshold.
    //  2) interval-based refresh: write the last setpoint every N ms. This is needed for
    //     devices such as MENNEKES AMTRON, where HEMS communication can fall back after
    //     a configured timeout but no dedicated "remaining seconds" register exists.
    const targetsRaw = Array.isArray(cfg.targets)
      ? cfg.targets
      : (cfg.setpointDpId || cfg.dpId)
        ? [cfg]
        : [];

    const normalizeSources = (raw) => {
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return arr.map(src => {
        if (!src) return null;
        if (typeof src === 'string') return { relId: src };
        if (typeof src !== 'object') return null;
        const out = Object.assign({}, src);
        if (out.relId !== undefined) out.relId = String(out.relId || '').trim();
        if (out.aliasRelId !== undefined && !out.relId) out.relId = String(out.aliasRelId || '').trim();
        if (out.dpId !== undefined) out.dpId = String(out.dpId || '').trim();
        if (out.setpointDpId !== undefined && !out.dpId) out.dpId = String(out.setpointDpId || '').trim();
        return out;
      }).filter(Boolean);
    };

    const targets = [];
    for (const t of targetsRaw) {
      if (!t) continue;
      const setpointDpId = (t.setpointDpId || t.dpId || '').toString();
      const remainingTimeDpId = (t.remainingTimeDpId || t.validTimeDpId || '').toString();
      const intervalMsRaw = Number(t.intervalMs ?? t.refreshIntervalMs ?? t.periodMs ?? cfg.intervalMs ?? cfg.refreshIntervalMs ?? 0);
      const intervalMs = Number.isFinite(intervalMsRaw) && intervalMsRaw > 0 ? intervalMsRaw : 0;
      if (!setpointDpId) continue;
      if (!remainingTimeDpId && !intervalMs) continue;
      targets.push({
        setpointDpId,
        remainingTimeDpId,
        refreshBelowS: Number(t.refreshBelowS ?? t.refreshBelowSec ?? cfg.refreshBelowS ?? 15),
        minWriteIntervalMs: Number(t.minWriteIntervalMs ?? cfg.minWriteIntervalMs ?? 1000),
        unsupportedBackoffMs: Number(t.unsupportedBackoffMs ?? t.writeRejectBackoffMs ?? t.disableOnErrorMs ?? cfg.unsupportedBackoffMs ?? cfg.writeRejectBackoffMs ?? cfg.disableOnErrorMs ?? hints.setpointKeepaliveUnsupportedBackoffMs ?? 300000),
        intervalMs,
        useLastCommandValue: (t.useLastCommandValue === true || cfg.useLastCommandValue === true || t.commandValue === true),
        requireEverWritten: (t.requireEverWritten !== undefined) ? (t.requireEverWritten !== false) : undefined,
        fallbackCommandSources: normalizeSources(t.fallbackCommandSources || t.commandSources || t.fallbackAliasRelIds || t.commandAliasRelIds),
        // Optional safety gate for watchdog refreshes. Example: Alfen phase-mode
        // refresh should only run while a positive current command is active; otherwise
        // a stale phase command can wake the charger's EMS path even though charging is
        // supposed to be disabled.
        activeIfCommandDpId: String(t.activeIfCommandDpId || t.activeIfDpId || '').trim(),
        activeIfCommandValueGt: Number(t.activeIfCommandValueGt ?? t.activeIfGreaterThan ?? t.activeIfGt ?? NaN),
        activeIfCommandSources: normalizeSources(t.activeIfCommandSources || t.activeIfSources || t.activeIfAliasRelIds),
      });
    }

    if (!targets.length) return null;

    return {
      checkPeriodMs: Number(cfg.checkPeriodMs ?? cfg.periodMs ?? 5000),
      targets,
      exclusiveGroups: this._normalizeExclusiveSetpointGroups(cfg.exclusiveGroups || cfg.exclusiveSetpointGroups || []),
      // If a charger answers "illegal data address/value" for a setpoint, pause only the
      // automatic keepalive for that target. Direct user writes still surface the real error.
      unsupportedBackoffMs: Number(cfg.unsupportedBackoffMs ?? cfg.writeRejectBackoffMs ?? cfg.disableOnErrorMs ?? hints.setpointKeepaliveUnsupportedBackoffMs ?? 300000),
      // Only start refreshing after the setpoint was written at least once by the adapter.
      requireEverWritten: (cfg.requireEverWritten !== false),
      logLevel: String(cfg.logLevel ?? cfg.keepaliveLogLevel ?? 'info').toLowerCase(),
      allowDuringPoll: (cfg.allowDuringPoll === true || cfg.allowWhilePolling === true || cfg.allowDuringRead === true),
    };
  }


  async _seedSetpointKeepaliveFromCommandAliases() {
    const cfg = this._getSetpointKeepaliveConfig();
    if (!cfg || !Array.isArray(cfg.targets) || !cfg.targets.length) return;

    const modHints = this.template?.driverHints?.modbus || {};
    const alfenHints = this._getAlfenHints ? this._getAlfenHints() : ((modHints && modHints.alfen && typeof modHints.alfen === 'object') ? modHints.alfen : {});
    const enabled = (modHints.seedSetpointKeepaliveFromAliases === true) ||
      (modHints.seedKeepaliveFromAliases === true) ||
      (cfg.seedFromCommandAliases === true) ||
      (this._isAlfenTemplate() && alfenHints.seedKeepaliveFromCommandAliases !== false);
    if (!enabled) return;

    const targets = new Set(cfg.targets.map(t => String(t && t.setpointDpId || '')).filter(Boolean));
    if (!targets.size) return;

    const readState = async (relId) => {
      if (!relId) return undefined;
      const st = await this.adapter.getStateAsync(relId).catch(() => null);
      if (!st || st.val === null || st.val === undefined) return undefined;
      return st.val;
    };
    const readAlias = async (aliasPath) => readState(this._aliasRelId(aliasPath));
    const readDp = async (dpId) => {
      const dp = this._getDpById(dpId);
      return dp ? readState(this.relStateId(dp)) : undefined;
    };
    const toNum = (v) => {
      if (typeof this._parseNumberWithUnits === 'function') return this._parseNumberWithUnits(v);
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') {
        const s = v.trim().replace(',', '.');
        const direct = Number(s);
        if (Number.isFinite(direct)) return direct;
        const m = s.match(/[-+]?\d+(?:\.\d+)?/);
        if (!m) return undefined;
        const n = Number(m[0]);
        return Number.isFinite(n) ? n : undefined;
      }
      if (typeof v === 'boolean') return v ? 1 : 0;
      return undefined;
    };
    const toBool = (v) => {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number' && Number.isFinite(v)) return v !== 0;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        if (['true', '1', 'yes', 'on', 'an', 'ein'].includes(s)) return true;
        if (['false', '0', 'no', 'off', 'aus', 'nein'].includes(s)) return false;
      }
      return undefined;
    };
    const seedDp = async (dpId, value, sourceLabel) => {
      const dp = this._getDpById(dpId);
      if (!dp || !(dp.rw === 'rw' || dp.rw === 'wo')) return false;
      if (value === null || value === undefined) return false;
      let val = value;
      if (dp.type === 'boolean') {
        val = !!val;
      } else if (dp.type === 'string') {
        val = String(val);
      } else {
        const n = Number(val);
        if (!Number.isFinite(n)) return false;
        val = n;
      }

      const now = Date.now();
      // Mark it as known/active without claiming a write happened right now.  The cyclic
      // keepalive will therefore send the first real refresh on its first tick.
      this._lastCommandedValueByDpId.set(String(dp.id), val);
      this._lastWriteByDpId.set(String(dp.id), now - 60000);
      this._setpointKeepaliveLastWriteByDpId.set(String(dp.id), 0);
      this._rememberAlfenMirrorCommandValues(String(dp.id), val, { markEverWritten: true });
      await this._persistSetpointValueIfNeeded(dp, val).catch(() => {});
      if (!this._seededKeepaliveLogTsByDpId) this._seededKeepaliveLogTsByDpId = new Map();
      const lastLog = Number(this._seededKeepaliveLogTsByDpId.get(String(dp.id)) || 0);
      if (!lastLog || (now - lastLog) > 60000) {
        this._seededKeepaliveLogTsByDpId.set(String(dp.id), now);
        this.adapter.log.info(`[${this.cfg.id}] SetpointKeepalive seeded ${dp.id}=${val}${sourceLabel ? ` from ${sourceLabel}` : ''}; first watchdog refresh will be sent on next keepalive tick.`);
      }
      return true;
    };

    // Alfen ACE: after adapter restart ioBroker keeps the command aliases as ack=true states,
    // but the runtime maps (_lastCommandedValueByDpId/_lastWriteByDpId) are empty.  Without
    // seeding, requireEverWritten=true prevents the watchdog from refreshing the EMS registers.
    if (this._isAlfenTemplate()) {
      const runCurrentRaw = Number(alfenHints.runCurrentA ?? alfenHints.defaultEnableCurrentA ?? 6);
      const runCurrentA = Number.isFinite(runCurrentRaw) && runCurrentRaw > 0 ? Math.round(runCurrentRaw) : 6;
      const stopCurrentRaw = Number(alfenHints.stopCurrentA ?? 0);
      const stopCurrentA = Number.isFinite(stopCurrentRaw) && stopCurrentRaw >= 0 ? Math.round(stopCurrentRaw) : 0;
      const minRunCurrentRaw = Number(alfenHints.minRunCurrentA ?? alfenHints.positiveCurrentMinA ?? alfenHints.minimumRunCurrentA ?? 6);
      const minRunCurrentA = Number.isFinite(minRunCurrentRaw) && minRunCurrentRaw > 0 ? Math.round(minRunCurrentRaw) : 6;
      const normalizeCurrentSeed = (amp) => {
        const n = Number(amp);
        if (!Number.isFinite(n)) return undefined;
        let v = Math.round(n);
        if (v <= 0) return stopCurrentA;
        if (v < minRunCurrentA) v = minRunCurrentA;
        if (v > 80) v = 80;
        return v;
      };

      let currentSeed;
      let currentSource = '';
      if (targets.has('sET_CHARGING_CURRENT')) {
        const memoryCurrent = toNum(await readState(this._setpointMemoryRelId('sET_CHARGING_CURRENT')));
        const aliasCurrent = toNum(await readAlias('ctrl.currentLimitA'));
        const runAlias = toBool(await readAlias('ctrl.run'));
        const enableAlias = toBool(await readAlias('ctrl.chargeEnable'));
        const applied = toNum(await readAlias('r.appliedCurrentLimitA'));
        const released = toBool(await readAlias('r.chargingReleased'));
        const nativeSetpoint = toNum(await readDp('sET_CHARGING_CURRENT'));

        if (Number.isFinite(aliasCurrent) && aliasCurrent > 0.1) {
          currentSeed = Math.round(aliasCurrent);
          currentSource = 'aliases.ctrl.currentLimitA';
        } else if (runAlias === true || enableAlias === true) {
          currentSeed = runCurrentA;
          currentSource = runAlias === true ? 'aliases.ctrl.run' : 'aliases.ctrl.chargeEnable';
        } else if (Number.isFinite(memoryCurrent) && memoryCurrent > 0.1) {
          currentSeed = Math.round(memoryCurrent);
          currentSource = 'info.setpoints.sET_CHARGING_CURRENT';
        } else if (Number.isFinite(nativeSetpoint) && nativeSetpoint > 0.1) {
          currentSeed = Math.round(nativeSetpoint);
          currentSource = 'sET_CHARGING_CURRENT state';
        } else if (Number.isFinite(applied) && applied > 0.1 && released !== false) {
          currentSeed = Math.round(applied);
          currentSource = 'aliases.r.appliedCurrentLimitA';
        } else if ((Number.isFinite(aliasCurrent) && aliasCurrent <= 0.1) || runAlias === false || enableAlias === false) {
          currentSeed = stopCurrentA;
          currentSource = 'disabled command alias';
        }

        if (Number.isFinite(currentSeed)) {
          currentSeed = normalizeCurrentSeed(currentSeed);
          await seedDp('sET_CHARGING_CURRENT', currentSeed, currentSource);
          // Keep the user-facing command aliases coherent.  This also fixes the visible
          // "run=true but currentLimitA=0" state after restarts/upgrades.
          await this._setStateCached(this._aliasRelId('ctrl.currentLimitA'), currentSeed, true);
          await this._setStateCached(this._aliasRelId('ctrl.run'), currentSeed > 0.1, true);
          await this._setStateCached(this._aliasRelId('ctrl.chargeEnable'), currentSeed > 0.1, true);
        }
      }

      if (targets.has('cHARGE_USING_PHASES')) {
        // Alfen ACE phase mode is a write command. Do not seed it from the native readback or
        // from old info.setpoints memory, because earlier builds persisted stale value 1 and
        // forced the charger back to single-phase after every restart/keepalive tick.
        const allowSeedOne = alfenHints.allowSeedOnePhaseFromAlias === true;
        let phaseSeed = toNum(await readAlias('ctrl.phaseMode'));
        let phaseSource = 'aliases.ctrl.phaseMode';
        if (phaseSeed === 1 && !allowSeedOne) {
          phaseSeed = undefined;
        }
        if (!(phaseSeed === 1 || phaseSeed === 3)) {
          const defPhase = Math.trunc(Number(alfenHints.defaultPhaseMode ?? 3));
          phaseSeed = defPhase === 1 ? 1 : 3;
          phaseSource = 'alfen defaultPhaseMode';
        }
        if (phaseSeed === 1 || phaseSeed === 3) {
          await seedDp('cHARGE_USING_PHASES', phaseSeed, phaseSource);
          await this._setStateCached(this._aliasRelId('ctrl.phaseMode'), phaseSeed, true);
        }
      }
      return;
    }

    // Generic opt-in behavior: seed keepalive targets from command-only aliases that write
    // to the same datapoint.  This is intentionally conservative and only used by templates
    // that explicitly enable seedSetpointKeepaliveFromAliases.
    for (const t of cfg.targets) {
      const dpId = String(t && t.setpointDpId || '');
      if (!dpId) continue;
      if (this._lastCommandedValueByDpId.has(dpId) || this._lastWriteByDpId.has(dpId)) continue;
      const aliases = (this.aliasDefs || []).filter(def => def && def.commandOnlyAlias === true && String(def.writeDpId || def.dpId || '') === dpId);
      for (const def of aliases) {
        const raw = await readState(def.relId);
        if (raw === undefined) continue;
        const val = typeof def.toDevice === 'function' ? def.toDevice(raw) : raw;
        if (val === undefined || val === null) continue;
        if (await seedDp(dpId, val, def.relId)) break;
      }
    }
  }

  async _readRelativeStateValue(relId) {
    const rel = String(relId || '').trim();
    if (!rel) return undefined;
    const fullRel = rel.startsWith('devices.') ? rel : `${this.baseId}.${rel}`;
    const st = await this.adapter.getStateAsync(fullRel).catch(() => null);
    if (!st || st.val === null || st.val === undefined) return undefined;
    return st.val;
  }

  async _resolveWatchdogSourceValue(src, setDp = null) {
    if (!src || typeof src !== 'object') return undefined;

    let val;
    if (src.dpId) {
      const dp = this._getDpById(String(src.dpId));
      if (!dp) return undefined;
      const st = await this.adapter.getStateAsync(this.relStateId(dp)).catch(() => null);
      if (!st || st.val === null || st.val === undefined) return undefined;
      val = st.val;
    } else if (src.relId) {
      val = await this._readRelativeStateValue(src.relId);
      if (val === undefined) return undefined;
    } else if (src.value !== undefined) {
      val = src.value;
    } else {
      return undefined;
    }

    if (typeof val === 'boolean') {
      if (val === true && src.trueValue !== undefined) val = src.trueValue;
      else if (val === false && src.falseValue !== undefined) val = src.falseValue;
      else val = val ? 1 : 0;
    } else if (typeof val === 'string') {
      const st = val.trim();
      if (!st) return undefined;
      const lower = st.toLowerCase();
      if ((lower === 'true' || lower === 'on' || lower === 'yes' || lower === 'an') && src.trueValue !== undefined) val = src.trueValue;
      else if ((lower === 'false' || lower === 'off' || lower === 'no' || lower === 'aus') && src.falseValue !== undefined) val = src.falseValue;
      else {
        const n = Number(st);
        if (Number.isFinite(n)) val = n;
        else return undefined;
      }
    }

    let n = Number(val);
    if (!Number.isFinite(n)) return undefined;

    if (src.integer === true || src.round === true) n = Math.round(n);
    if (Number.isFinite(Number(src.minValue)) && n < Number(src.minValue)) {
      if (src.skipIfBelowMin === true || src.skipIfOutOfRange === true) return undefined;
      n = Number(src.minValue);
    }
    if (Number.isFinite(Number(src.maxValue)) && n > Number(src.maxValue)) {
      if (src.skipIfAboveMax === true || src.skipIfOutOfRange === true) return undefined;
      n = Number(src.maxValue);
    }
    if (Number.isFinite(Number(src.minValueExclusive)) && !(n > Number(src.minValueExclusive))) return undefined;
    if (Number.isFinite(Number(src.gt)) && !(n > Number(src.gt))) return undefined;
    if (Number.isFinite(Number(src.gte)) && !(n >= Number(src.gte))) return undefined;
    if (src.skipZero === true && Math.abs(n) < 1e-9) return undefined;

    if (Array.isArray(src.allowedValues) && src.allowedValues.length) {
      const allowed = src.allowedValues.map(x => Number(x)).filter(Number.isFinite);
      if (allowed.length && !allowed.includes(n)) return undefined;
    }

    const writeSrc = setDp ? ((setDp.source && setDp.source.write) || (setDp.source && setDp.source.fc ? setDp.source : null)) : null;
    if (writeSrc) {
      if (Number.isFinite(Number(writeSrc.minValue)) && n < Number(writeSrc.minValue)) n = Number(writeSrc.minValue);
      if (Number.isFinite(Number(writeSrc.maxValue)) && n > Number(writeSrc.maxValue)) n = Number(writeSrc.maxValue);
      if (writeSrc.integer === true || writeSrc.round === true) n = Math.round(n);
      if (Array.isArray(writeSrc.allowedValues) && writeSrc.allowedValues.length) {
        const allowed = writeSrc.allowedValues.map(x => Number(x)).filter(Number.isFinite);
        if (allowed.length && !allowed.includes(n)) return undefined;
      }
    }

    return n;
  }

  async _resolveWatchdogFallbackCommandValue(target, setDp) {
    const sources = Array.isArray(target && target.fallbackCommandSources) ? target.fallbackCommandSources : [];
    if (!sources.length) return undefined;
    for (const src of sources) {
      const v = await this._resolveWatchdogSourceValue(src, setDp);
      if (v !== undefined && v !== null && Number.isFinite(Number(v))) return Number(v);
    }
    return undefined;
  }

  async _watchdogActiveGatePasses(target) {
    const activeIfCommandDpId = String(target && target.activeIfCommandDpId || '').trim();
    if (!activeIfCommandDpId && !(Array.isArray(target && target.activeIfCommandSources) && target.activeIfCommandSources.length)) return true;

    let gateVal = NaN;
    if (activeIfCommandDpId && this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(activeIfCommandDpId)) {
      gateVal = Number(this._lastCommandedValueByDpId.get(activeIfCommandDpId));
    }
    if (!Number.isFinite(gateVal) && Array.isArray(target.activeIfCommandSources) && target.activeIfCommandSources.length) {
      for (const src of target.activeIfCommandSources) {
        const v = await this._resolveWatchdogSourceValue(src, this._getDpById(activeIfCommandDpId));
        if (v !== undefined && v !== null && Number.isFinite(Number(v))) {
          gateVal = Number(v);
          break;
        }
      }
    }

    const gateGt = Number(target.activeIfCommandValueGt);
    if (!Number.isFinite(gateVal)) return false;
    if (Number.isFinite(gateGt) && !(gateVal > gateGt)) return false;
    return true;
  }

  async _startSetpointKeepalive() {
    const cfg = this._getSetpointKeepaliveConfig();
    if (!cfg) return;
    if (this._setpointKeepaliveTimer) return;

    const periodMs = Math.max(1000, Number(cfg.checkPeriodMs || 5000));

    const tick = async () => {
      if (this._setpointKeepaliveBusy) return;
      this._setpointKeepaliveBusy = true;
      try {
        if (!this.driver || typeof this.driver.writeDatapoint !== 'function') return;
        if (!this._connOk) return; // only when connected
        // The Modbus driver serializes operations internally. For strict write-watchdog
        // devices such as Alfen ACE, skipping keepalive while a poll is running can starve
        // the watchdog; allow templates to queue the refresh during reads.
        if (this.driver && this.driver._busy && cfg.allowDuringPoll !== true) return;

        const now = Date.now();
        const activeTargets = this._applyExclusiveSetpointGroupsToKeepaliveTargets(cfg.targets, cfg.exclusiveGroups || []);

        for (const t of activeTargets) {
          const setDp = this._getDpById(t.setpointDpId);
          const timeDp = t.remainingTimeDpId ? this._getDpById(t.remainingTimeDpId) : null;
          if (!setDp) continue;
          if (t.remainingTimeDpId && !timeDp) continue;
          if (!(setDp.rw === 'rw' || setDp.rw === 'wo')) continue;

          const unsupportedUntil = Number(this._setpointKeepaliveUnsupportedUntilByDpId.get(String(setDp.id)) || 0);
          if (unsupportedUntil && now < unsupportedUntil) continue;

          if (!(await this._watchdogActiveGatePasses(t))) continue;

          const hasFallbackSources = Array.isArray(t.fallbackCommandSources) && t.fallbackCommandSources.length > 0;
          const targetRequiresEverWritten = (t.requireEverWritten !== false) && (cfg.requireEverWritten !== false);
          if (targetRequiresEverWritten && !hasFallbackSources) {
            const hasEver = this._lastWriteByDpId.has(String(setDp.id));
            if (!hasEver) continue;
          }

          // Throttle repeated refresh writes
          const last = Number(this._setpointKeepaliveLastWriteByDpId.get(String(setDp.id)) || 0);
          const minWriteMs = Number.isFinite(t.minWriteIntervalMs) ? Math.max(250, t.minWriteIntervalMs) : 1000;
          if (last && (now - last) < minWriteMs) continue;

          let reason = '';
          if (timeDp) {
            // Remaining valid time (seconds)
            const timeState = await this.adapter.getStateAsync(this.relStateId(timeDp)).catch(() => null);
            const remainingS = timeState && timeState.val !== undefined ? Number(timeState.val) : NaN;
            if (!Number.isFinite(remainingS)) continue;

            const thresh = Number.isFinite(t.refreshBelowS) ? t.refreshBelowS : 15;
            if (remainingS > thresh) continue;
            reason = `remainingS=${remainingS}`;
          } else {
            const intervalMs = Number.isFinite(t.intervalMs) ? Math.max(1000, t.intervalMs) : 0;
            if (!intervalMs) continue;
            if (last && (now - last) < intervalMs) continue;
            reason = `intervalMs=${intervalMs}`;
          }

          // Use the last successfully commanded value when requested.  This is important
          // for Alfen ACE: the watchdog must repeat the commanded Max Current, not a
          // transient/wrong readback that may decode as 0 A before the adaptive address
          // variant is cached.
          let setVal = NaN;
          if (t.useLastCommandValue && this._lastCommandedValueByDpId && this._lastCommandedValueByDpId.has(String(setDp.id))) {
            setVal = Number(this._lastCommandedValueByDpId.get(String(setDp.id)));
          }
          if (!Number.isFinite(setVal)) {
            const fallbackVal = await this._resolveWatchdogFallbackCommandValue(t, setDp);
            if (fallbackVal !== undefined && fallbackVal !== null && Number.isFinite(Number(fallbackVal))) {
              setVal = Number(fallbackVal);
            }
          }
          if (!Number.isFinite(setVal)) {
            const setState = await this.adapter.getStateAsync(this.relStateId(setDp)).catch(() => null);
            setVal = setState && setState.val !== undefined ? Number(setState.val) : NaN;
          }
          if (!Number.isFinite(setVal)) continue;

          // Send refresh write (best-effort). Respect write throttling if enabled.
          // Handle errors per target so one unsupported Alfen/EVCS setpoint does not stop
          // the watchdog refresh of other supported setpoints.
          try {
            if (this._isWriteQueueEnabled()) {
              this._enqueueWrite(null, setDp, setVal, setVal, { skipPostWriteRepeat: true, isSetpointKeepalive: true });
            } else {
              await this.driver.writeDatapoint(setDp, setVal);
              this._recordWrite(setDp.id, { skipPostWriteRepeat: true });
              await this._ackWrittenValue(setDp, setVal);
            }

            this._setpointKeepaliveLastWriteByDpId.set(String(setDp.id), now);
            const refreshMsg = `[${this.cfg.id}] SetpointKeepalive: refreshed ${setDp.id}=${setVal}${reason ? ` (${reason})` : ''}`;
            if (this._isAlfenTemplate && this._isAlfenTemplate()) {
              if (!this._alfenKeepaliveInfoCountByDpId) this._alfenKeepaliveInfoCountByDpId = new Map();
              const c = Number(this._alfenKeepaliveInfoCountByDpId.get(String(setDp.id)) || 0);
              if (c < 3) {
                this._alfenKeepaliveInfoCountByDpId.set(String(setDp.id), c + 1);
                this.adapter.log.info(refreshMsg);
              } else {
                this.adapter.log.debug(refreshMsg);
              }
            } else {
              this.adapter.log.debug(refreshMsg);
            }
          } catch (e) {
            if (this._isSuppressedUnsupportedWriteError(e)) {
              this._handleSuppressedUnsupportedWrite(e, setDp.id);
              continue;
            }
            const msg = (e && e.message) ? e.message : String(e);
            const lower = msg.toLowerCase();
            if (this._isAlfenTemplate() && this._looksLikePermanentModbusWriteReject(msg)) {
              this._handleAlfenRejectedControlWrite(e, setDp.id);
              continue;
            }
            if (lower.includes('illegal data address') || lower.includes('illegal data value') || lower.includes('exception 2') || lower.includes('exception 3')) {
              const targetBackoffMs = Number(t.unsupportedBackoffMs);
              const backoffMs = Number.isFinite(targetBackoffMs) && targetBackoffMs > 0
                ? targetBackoffMs
                : (Number.isFinite(cfg.unsupportedBackoffMs) && cfg.unsupportedBackoffMs > 0 ? cfg.unsupportedBackoffMs : 300000);
              this._setpointKeepaliveUnsupportedUntilByDpId.set(String(setDp.id), Date.now() + backoffMs);
              this.adapter.log.debug(`[${this.cfg.id}] SetpointKeepalive: ${setDp.id} is currently not accepted by the device; pausing automatic refresh for ${backoffMs} ms. ${msg}`);
              continue;
            }
            throw e;
          }
        }
      } catch (e) {
        // Best-effort: do not spam; poll loop will surface transport errors.
        this.adapter.log.debug(`[${this.cfg.id}] SetpointKeepalive error: ${e && e.message ? e.message : e}`);
      } finally {
        this._setpointKeepaliveBusy = false;
      }
    };

    // Slightly delayed first check, then periodically
    setTimeout(() => { tick().catch(() => {}); }, 2000);
    this._setpointKeepaliveTimer = setInterval(() => { tick().catch(() => {}); }, periodMs);
    const enabledMsg = `[${this.cfg.id}] SetpointKeepalive enabled: targets=[${cfg.targets.map(t => t.setpointDpId).join(', ')}], periodMs=${periodMs}`;
    const keepaliveLogLevel = String(cfg.logLevel || 'info').toLowerCase();
    if (keepaliveLogLevel === 'silent' || keepaliveLogLevel === 'none' || keepaliveLogLevel === 'off') {
      // intentionally quiet
    } else if (keepaliveLogLevel === 'debug') {
      this.adapter.log.debug(enabledMsg);
    } else if (keepaliveLogLevel === 'warn' || keepaliveLogLevel === 'warning') {
      this.adapter.log.warn(enabledMsg);
    } else {
      this.adapter.log.info(enabledMsg);
    }
  }


  _getSungrowSignedPowerControlConfigs() {
    const hints = this.template?.driverHints?.modbus || {};
    const raw = hints.sungrowSignedPowerControls || hints.sungrowSignedPowerControl || hints.sungrowPowerControl;
    const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? [raw] : []);
    return arr.filter(cfg => cfg && cfg.enabled !== false && (cfg.heartbeatAutoRefresh === true || cfg.autoRefreshHeartbeat === true) && String(cfg.heartbeatDpId || '').trim());
  }

  _getSungrowHeartbeatIntervalMs(configs) {
    let interval = 0;
    const values = Array.isArray(configs) ? configs : [];
    for (const cfg of values) {
      const explicit = Number(
        cfg.heartbeatRefreshIntervalMs ??
        cfg.heartbeatIntervalMs ??
        cfg.heartbeatEveryMs ??
        cfg.heartbeatCycleMs ??
        0
      );
      if (Number.isFinite(explicit) && explicit > 0) {
        interval = interval > 0 ? Math.min(interval, explicit) : explicit;
        continue;
      }

      // Sungrow recommends refreshing the timeout value at roughly half of the
      // configured heartbeat timeout (e.g. 20s -> write 20 every ~10s).
      const hbSeconds = Number(cfg.heartbeatValue ?? cfg.heartbeatDefaultValue ?? cfg.heartbeatFixedValue ?? 20);
      const fromTimeout = Number.isFinite(hbSeconds) && hbSeconds > 0 ? (hbSeconds * 500) : 10000;
      interval = interval > 0 ? Math.min(interval, fromTimeout) : fromTimeout;
    }

    if (!Number.isFinite(interval) || interval <= 0) interval = 10000;

    // Do not write faster than the configured minimum interval plus a small guard.
    let minGuard = 1000;
    for (const cfg of values) {
      const min = Number(cfg.heartbeatMinIntervalMs ?? cfg.heartbeatWriteMinIntervalMs ?? 0);
      if (Number.isFinite(min) && min > 0) minGuard = Math.max(minGuard, min + 500);
    }

    return Math.max(1000, Math.round(Math.max(interval, minGuard)));
  }

  async _startSungrowExternalEmsHeartbeat() {
    if (this._sungrowHeartbeatTimer) return;
    const configs = this._getSungrowSignedPowerControlConfigs();
    if (!configs.length) return;
    if (!this.driver || typeof this.driver.refreshSungrowSignedPowerControlHeartbeats !== 'function') return;

    const intervalMs = this._getSungrowHeartbeatIntervalMs(configs);

    const tick = async () => {
      if (this._sungrowHeartbeatBusy) return;
      this._sungrowHeartbeatBusy = true;
      try {
        if (!this.started) return;
        if (!this.driver || typeof this.driver.refreshSungrowSignedPowerControlHeartbeats !== 'function') return;
        if (!this._connOk) return;
        await this.driver.refreshSungrowSignedPowerControlHeartbeats({ reason: 'external-ems-heartbeat' });
      } catch (e) {
        // Heartbeat refresh is best-effort. Transport errors will also surface via the poll loop.
        this.adapter.log.debug(`[${this.cfg.id}] Sungrow External EMS heartbeat refresh error: ${e && e.message ? e.message : e}`);
      } finally {
        this._sungrowHeartbeatBusy = false;
      }
    };

    // Start slightly after the first successful poll/control restore so we do not
    // bunch heartbeat writes with initial read/write commands.
    this._sungrowHeartbeatStartTimer = setTimeout(() => {
      this._sungrowHeartbeatStartTimer = null;
      tick().catch(() => {});
    }, Math.min(3000, intervalMs));
    this._sungrowHeartbeatTimer = setInterval(() => { tick().catch(() => {}); }, intervalMs);
    this.adapter.log.debug(`[${this.cfg.id}] Sungrow External EMS heartbeat auto-refresh enabled: intervalMs=${intervalMs}`);
  }

  _getPreWritesForDp(dpId) {
    const id = (dpId ?? '').toString();
    if (!id) return [];
    const hints = this.template?.driverHints?.modbus;
    const cfg = hints?.preWrites;
    if (!Array.isArray(cfg) || !cfg.length) return [];

    const wanted = id.toLowerCase();
    const out = [];
    for (const rule of cfg) {
      if (!rule) continue;
      const trig = (rule.triggerDpId ?? rule.onWriteDpId ?? '').toString().toLowerCase();
      if (!trig || trig !== wanted) continue;

      const cooldownMsRaw = Number(rule.cooldownMs ?? rule.throttleMs ?? rule.minIntervalMs ?? 0);
      const cooldownMs = Number.isFinite(cooldownMsRaw) && cooldownMsRaw > 0 ? cooldownMsRaw : 0;

      const writes = Array.isArray(rule.writes) ? rule.writes : [];
      for (const w of writes) {
        if (!w || !w.dpId) continue;
        if (w.value === undefined) continue;
        out.push({ dpId: String(w.dpId), value: w.value, triggerDpId: wanted, cooldownMs });
      }
    }
    return out;
  }

  async _maybeExecutePreWritesForDp(dpId) {
    if (!this.driver || typeof this.driver.writeDatapoint !== 'function') return;
    const plan = this._getPreWritesForDp(dpId);
    if (!plan.length) return;

    const triggerKey = (dpId ?? '').toString().toLowerCase();
    const cooldownMs = plan.reduce((m, s) => Math.max(m, Number(s.cooldownMs || 0)), 0);
    if (cooldownMs > 0) {
      const lastTs = this._preWriteLastTsByTrigger.get(triggerKey) || 0;
      const now = Date.now();
      if (lastTs && now - lastTs < cooldownMs) return;
    }

    for (const step of plan) {
      try {
        const dp = this._getDpById(step.dpId);
        if (!dp) continue;
        if (!(dp.rw === 'rw' || dp.rw === 'wo')) continue;
        await this.driver.writeDatapoint(dp, step.value);
        // Track pre-write activity as well (important for fail-safe logic).
        this._recordWrite(dp.id);
        await this._ackWrittenValue(dp, step.value);
      } catch (e) {
        // Pre-write failure should surface clearly (it affects the main command).
        throw e;
      }
    }

    if (cooldownMs > 0) this._preWriteLastTsByTrigger.set(triggerKey, Date.now());
  }

  async _ackWrittenValue(dp, rawValue, isCurrent = () => true) {
    if (!dp || !dp.id || !isCurrent()) return;

    try {
      if (this._lastCommandedValueByDpId) this._lastCommandedValueByDpId.set(String(dp.id), rawValue);
    } catch (_) {}

    // Update underlying datapoint state
    const dpRelId = this.relStateId(dp);
    await this._setStateCached(dpRelId, rawValue, true);

    // Update all alias states that reference this datapoint (best-effort).
    // Some control aliases intentionally use a different readback dpId than writeDpId
    // (Alfen ACE: ctrl.currentLimitA writes Modbus Server Max Current but reads the
    // separate Actual Applied Max Current register).  For these command-only aliases,
    // also acknowledge the alias when the writeDpId matches, otherwise the UI can snap
    // back to a volatile readback/default value after a successful command.
    if (!Array.isArray(this.aliasDefs) || !this.aliasDefs.length) return;
    const writtenKey = String(dp.id);
    for (const def of this.aliasDefs) {
      try {
        if (!isCurrent()) return;
        if (!def || def.kind !== 'dp') continue;
        // A Modbus write response confirms transmission, not the charger's
        // applied limit. Keep DEPower readback aliases tied to real polling.
        if (this.template?.driverHints?.oemModbusV1003 && def.rw !== 'rw' && def.rw !== 'wo') continue;
        const readsWrittenDp = String(def.dpId || '') === writtenKey;
        const writesWrittenDp = String(def.writeDpId || '') === writtenKey;
        if (!readsWrittenDp && !(writesWrittenDp && def.commandOnlyAlias === true)) continue;

        let outVal = rawValue;
        if (typeof def.fromDevice === 'function') {
          outVal = def.fromDevice(rawValue);
          if (outVal === undefined) continue;
        }
        await this._setStateCached(def.relId, outVal, true);
      } catch (_) {
        // ignore
      }
    }
  }
}

module.exports = {
  DeviceRuntime,
};
