'use strict';

const PATCH_FLAG = Symbol.for('nexowatt.sungrowFastFeedbackPatch.v1');
const DRIVER_WRAP_FLAG = Symbol.for('nexowatt.sungrowFastFeedbackDriverWrap.v1');
const ONE_SECOND_POLL_MS = 1000;
const SUNGROW_TCP_COMMAND_GAP_MS = 200;
const CONTROL_DP_IDS = new Set([
  'sET_ACTIVE_POWER',
  'sET_CHARGE_POWER',
  'sET_DISCHARGE_POWER',
]);

function finiteMs(value, fallback, min, max) {
  const n = Number(value);
  const v = Number.isFinite(n) && n > 0 ? n : fallback;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function isSungrowResidentialRuntime(runtime) {
  const template = runtime && runtime.template ? runtime.template : {};
  const cfg = runtime && runtime.cfg ? runtime.cfg : {};
  const id = String(template.id || cfg.templateId || '').toLowerCase();
  const manufacturer = String(template.manufacturer || cfg.manufacturer || '').toLowerCase();
  const model = String(template.model || '').toLowerCase();

  return manufacturer === 'sungrow' && (
    id === 'ess.sungrow.residentialhybridv119' ||
    id.includes('residentialhybrid') ||
    model.includes('residential hybrid')
  );
}

function configureSungrowRuntime(runtime) {
  if (!isSungrowResidentialRuntime(runtime)) return false;

  const template = runtime.template;
  const runtimeCfg = runtime.cfg || (runtime.cfg = {});
  template.driverHints = template.driverHints || {};
  template.driverHints.modbus = template.driverHints.modbus || {};
  template.driverHints.polling = template.driverHints.polling || {};
  const modbus = template.driverHints.modbus;
  const polling = template.driverHints.polling;

  // Sungrow is used in a closed-loop NVP controller. A 2 s nominal interval together
  // with four Modbus read groups and completion-based scheduling produced an effective
  // feedback age of several seconds. Enforce a real one-second target cadence here,
  // even when an older device/global poll setting is slower.
  polling.fastIntervalMs = ONE_SECOND_POLL_MS;
  polling.forceFastIntervalMs = ONE_SECOND_POLL_MS;
  polling.fixedFastCadence = true;
  polling.fixedCadence = true;

  const configuredPollMs = Number(runtimeCfg.pollIntervalMs);
  if (!Number.isFinite(configuredPollMs) || configuredPollMs <= 0 || configuredPollMs > ONE_SECOND_POLL_MS) {
    runtimeCfg.pollIntervalMs = ONE_SECOND_POLL_MS;
  }

  // The old cadence loop awaited a complete multi-group poll before it could flush
  // a newly queued power command. A dedicated write loop lets the Modbus driver's
  // per-operation IO queue interleave a write between two read groups.
  modbus.commandCadenceMs = 0;
  modbus.writeThrottleMs = Math.min(
    finiteMs(modbus.writeThrottleMs || modbus.writeIntervalMs, 250, 250, 1000),
    250,
  );
  modbus.writeMaxPerTick = 1;

  // The fast Sungrow set contains four Modbus register groups. Modbus TCP therefore
  // needs a shorter operation gap than 1 s to complete all groups inside a 1 s cycle.
  // Keep RTU installations unchanged; the aggressive cadence is TCP-only.
  const protocol = String(runtimeCfg.protocol || '').toLowerCase();
  if (protocol === 'modbustcp') {
    runtimeCfg.connection = runtimeCfg.connection || {};
    runtimeCfg.connection.minCommandIntervalMs = SUNGROW_TCP_COMMAND_GAP_MS;
    modbus.minCommandIntervalMs = SUNGROW_TCP_COMMAND_GAP_MS;
  }

  const feedback = Object.assign({}, modbus.sungrowFastFeedback || {});
  feedback.enabled = true;
  feedback.intervalMs = ONE_SECOND_POLL_MS;
  feedback.retryBusyMs = 200;
  feedback.firstReadDelayMs = 150;
  feedback.activeWindowMs = 30000;
  feedback.idleCheckMs = 5000;
  // Normal Sungrow fast polling now runs every second. Keep only one immediate
  // post-command read here to avoid a duplicate continuous read loop.
  feedback.afterWriteOnly = true;
  modbus.sungrowFastFeedback = feedback;

  return true;
}

function getFeedbackConfig(runtime) {
  const cfg = runtime?.template?.driverHints?.modbus?.sungrowFastFeedback || {};
  return {
    enabled: cfg.enabled !== false,
    intervalMs: finiteMs(cfg.intervalMs, ONE_SECOND_POLL_MS, 1000, 5000),
    retryBusyMs: finiteMs(cfg.retryBusyMs, 200, 100, 1000),
    firstReadDelayMs: finiteMs(cfg.firstReadDelayMs, 150, 50, 1000),
    activeWindowMs: finiteMs(cfg.activeWindowMs, 30000, 5000, 120000),
    idleCheckMs: finiteMs(cfg.idleCheckMs, 5000, 1000, 30000),
    afterWriteOnly: cfg.afterWriteOnly !== false,
  };
}

function getBatteryPowerDatapoint(runtime) {
  if (!runtime) return null;
  if (typeof runtime._getDpById === 'function') {
    const exact = runtime._getDpById('bATTERY_POWER');
    if (exact) return exact;
  }

  const dps = typeof runtime.getDatapoints === 'function'
    ? runtime.getDatapoints()
    : Array.from(runtime.dpById?.values?.() || []);

  return (dps || []).find(dp => {
    if (!dp) return false;
    const id = String(dp.id || '');
    return /^battery[_-]?power$/i.test(id) || /battery.*(active\s*)?power/i.test(id);
  }) || null;
}

function mergeReadSource(dp) {
  const root = dp && dp.source;
  if (!root || root.kind !== 'modbus') return null;
  const read = root.read || root;
  if (!read || read.fc == null) return null;
  return Object.assign({}, root, read, { kind: 'modbus' });
}

function normalizeWordOrder(value) {
  const s = String(value || '').toLowerCase();
  return ['le', 'little', 'little_endian', 'lswmsw', 'lsw_msw'].includes(s) ? 'le' : 'be';
}

function normalizeByteOrder(value) {
  const s = String(value || '').toLowerCase();
  return ['le', 'little', 'little_endian'].includes(s) ? 'le' : 'be';
}

function registersToBuffer(registers, wordOrder, byteOrder) {
  const words = Array.isArray(registers) ? registers.slice() : [];
  if (normalizeWordOrder(wordOrder) === 'le') words.reverse();

  const buffer = Buffer.alloc(words.length * 2);
  for (let i = 0; i < words.length; i += 1) {
    buffer.writeUInt16BE(Number(words[i]) & 0xffff, i * 2);
  }

  if (normalizeByteOrder(byteOrder) === 'le') {
    for (let i = 0; i + 1 < buffer.length; i += 2) {
      const a = buffer[i];
      buffer[i] = buffer[i + 1];
      buffer[i + 1] = a;
    }
  }

  return buffer;
}

function decodeBuffer(buffer, dataType) {
  const type = String(dataType || 'uint16').toLowerCase();
  if (type === 'bool' || type === 'boolean') return buffer.readUInt16BE(0) !== 0;
  if (type === 'int16') return buffer.readInt16BE(0);
  if (type === 'uint16') return buffer.readUInt16BE(0);
  if (type === 'int32') return buffer.readInt32BE(0);
  if (type === 'uint32') return buffer.readUInt32BE(0);
  if (type === 'float32') return buffer.readFloatBE(0);
  if (type === 'int64') return buffer.readBigInt64BE(0);
  if (type === 'uint64') return buffer.readBigUInt64BE(0);
  if (type === 'float64') return buffer.readDoubleBE(0);
  return buffer.readUInt16BE(0);
}

async function readBatteryPowerDirect(runtime, dp) {
  const driver = runtime && runtime.driver;
  const src = mergeReadSource(dp);
  if (!driver || !src) return undefined;

  const fc = Number(src.fc);
  if (fc !== 3 && fc !== 4) return undefined;

  const length = Math.max(1, Math.trunc(Number(src.length || 1)));
  const address = typeof driver._addr === 'function' ? driver._addr(src) : Number(src.address);
  const unitId = typeof driver._sourceUnitId === 'function' ? driver._sourceUnitId(src) : undefined;
  if (!Number.isFinite(address)) return undefined;

  let response;
  if (fc === 4 && typeof driver._mbReadInputRegisters === 'function') {
    response = await driver._mbReadInputRegisters(address, length, unitId);
  } else if (fc === 3 && typeof driver._mbReadHoldingRegisters === 'function') {
    response = await driver._mbReadHoldingRegisters(address, length, unitId);
  } else {
    return undefined;
  }

  const registers = response && Array.isArray(response.data) ? response.data : [];
  if (registers.length < length) return undefined;

  const buffer = registersToBuffer(
    registers.slice(0, length),
    src.wordOrder || driver.wordOrder,
    src.byteOrder || driver.byteOrder,
  );
  let value = decodeBuffer(buffer, src.dataType);
  if (typeof driver._applyTransforms === 'function') value = driver._applyTransforms(value, src);
  return value;
}

function roundRuntimeValue(runtime, dp, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  const decimals = typeof runtime._getRoundingDecimals === 'function'
    ? runtime._getRoundingDecimals(dp)
    : null;
  if (!Number.isFinite(decimals) || decimals < 0 || decimals > 10) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function updateBatteryPowerStates(runtime, dp, rawValue) {
  const value = roundRuntimeValue(runtime, dp, rawValue);
  const values = { [dp.id]: value };

  if (typeof runtime._setStateCached === 'function' && typeof runtime.relStateId === 'function') {
    await runtime._setStateCached(runtime.relStateId(dp), value, true);
  }

  for (const def of runtime.aliasDefs || []) {
    if (!def || !def.relId) continue;
    let aliasValue;

    if (def.kind === 'dp' && String(def.dpId || '') === String(dp.id)) {
      aliasValue = typeof def.fromDevice === 'function' ? def.fromDevice(value) : value;
    } else if (
      def.kind === 'computed' &&
      typeof def.get === 'function' &&
      /\.aliases\.r\.(power|powerCharge|powerDischarge)$/.test(String(def.relId))
    ) {
      try {
        aliasValue = def.get(values, { connected: true, lastError: '' });
      } catch (_) {
        aliasValue = undefined;
      }
    } else {
      continue;
    }

    if (aliasValue !== undefined && typeof runtime._setStateCached === 'function') {
      await runtime._setStateCached(def.relId, aliasValue, true);
    }
  }

  if (typeof runtime._tickHeartbeatFromIncomingData === 'function') {
    await runtime._tickHeartbeatFromIncomingData().catch(() => {});
  }

  runtime._sungrowFastFeedbackLastValue = value;
  runtime._sungrowFastFeedbackLastAt = Date.now();
  return value;
}

async function pollSungrowFeedbackOnce(runtime) {
  if (!isSungrowResidentialRuntime(runtime)) return false;
  if (!runtime.started || runtime.cfg?.enabled === false || !runtime.driver) return false;
  if (runtime._sungrowFastFeedbackBusy) return false;

  const dp = getBatteryPowerDatapoint(runtime);
  if (!dp) return false;

  runtime._sungrowFastFeedbackBusy = true;
  try {
    const value = await readBatteryPowerDirect(runtime, dp);
    if (value === undefined || value === null) return false;
    await updateBatteryPowerStates(runtime, dp, value);
    return true;
  } catch (error) {
    const now = Date.now();
    const last = Number(runtime._sungrowFastFeedbackErrorLogAt || 0);
    if (!last || now - last > 60000) {
      runtime._sungrowFastFeedbackErrorLogAt = now;
      try {
        runtime.adapter?.log?.debug?.(
          `[${runtime.cfg?.id || 'sungrow'}] Sungrow priority feedback read delayed: ${error?.message || error}`,
        );
      } catch (_) {
        // ignore diagnostics failure
      }
    }
    return false;
  } finally {
    runtime._sungrowFastFeedbackBusy = false;
  }
}

function requestFeedback(runtime, delayMs) {
  if (!runtime || runtime._sungrowFastFeedbackStopped) return;
  const delay = Math.max(0, Math.trunc(Number(delayMs) || 0));
  const dueAt = Date.now() + delay;

  if (
    runtime._sungrowFastFeedbackTimer &&
    Number(runtime._sungrowFastFeedbackDueAt || 0) > 0 &&
    runtime._sungrowFastFeedbackDueAt <= dueAt
  ) {
    return;
  }

  if (runtime._sungrowFastFeedbackTimer) clearTimeout(runtime._sungrowFastFeedbackTimer);
  runtime._sungrowFastFeedbackDueAt = dueAt;
  runtime._sungrowFastFeedbackTimer = setTimeout(async () => {
    runtime._sungrowFastFeedbackTimer = null;
    runtime._sungrowFastFeedbackDueAt = 0;

    const cfg = getFeedbackConfig(runtime);
    if (!cfg.enabled || runtime._sungrowFastFeedbackStopped || !runtime.started) return;

    const now = Date.now();
    const lastCommandAt = Number(runtime._sungrowFastFeedbackLastCommandAt || 0);
    const active = lastCommandAt > 0 && now - lastCommandAt <= cfg.activeWindowMs;

    if (!active) {
      if (!cfg.afterWriteOnly) requestFeedback(runtime, cfg.idleCheckMs);
      return;
    }

    const ok = await pollSungrowFeedbackOnce(runtime);
    if (!cfg.afterWriteOnly) requestFeedback(runtime, ok ? cfg.intervalMs : cfg.retryBusyMs);
  }, delay);
  runtime._sungrowFastFeedbackTimer.unref?.();
}

function wrapSungrowDriver(runtime) {
  const driver = runtime && runtime.driver;
  if (!driver || driver[DRIVER_WRAP_FLAG] || typeof driver.writeDatapoint !== 'function') return;

  const originalWriteDatapoint = driver.writeDatapoint.bind(driver);
  driver.writeDatapoint = async (dp, value) => {
    const result = await originalWriteDatapoint(dp, value);
    if (CONTROL_DP_IDS.has(String(dp && dp.id || ''))) {
      // Keep zero as a real stop command. Never use truthy/fallback expressions here;
      // a valid 0 W command must not turn into a 500 W fallback.
      const requested = Number(value);
      runtime._sungrowFastFeedbackLastCommandW = Number.isFinite(requested) ? requested : value;
      runtime._sungrowFastFeedbackLastCommandAt = Date.now();
      requestFeedback(runtime, getFeedbackConfig(runtime).firstReadDelayMs);
    }
    return result;
  };
  driver[DRIVER_WRAP_FLAG] = true;
}

function startSungrowFeedback(runtime) {
  if (runtime._sungrowFastFeedbackStarted) return;
  const cfg = getFeedbackConfig(runtime);
  if (!cfg.enabled) return;

  runtime._sungrowFastFeedbackStarted = true;
  runtime._sungrowFastFeedbackStopped = false;
  wrapSungrowDriver(runtime);
  if (!cfg.afterWriteOnly) requestFeedback(runtime, cfg.idleCheckMs);

  try {
    const protocol = String(runtime.cfg?.protocol || '').toLowerCase();
    const effectiveGapMs = Number(runtime.driver?.minCommandIntervalMs || runtime.cfg?.connection?.minCommandIntervalMs || 0);
    runtime.adapter?.log?.info?.(
      `[${runtime.cfg?.id || 'sungrow'}] Sungrow 1 s live polling active: fixed 1000 ms fast cadence, ${protocol || 'modbus'} command gap ${effectiveGapMs || 'default'} ms, and immediate battery-power readback after EMS writes.`,
    );
  } catch (_) {
    // ignore diagnostics failure
  }
}

function stopSungrowFeedback(runtime) {
  if (!runtime) return;
  runtime._sungrowFastFeedbackStarted = false;
  runtime._sungrowFastFeedbackStopped = true;
  if (runtime._sungrowFastFeedbackTimer) clearTimeout(runtime._sungrowFastFeedbackTimer);
  runtime._sungrowFastFeedbackTimer = null;
  runtime._sungrowFastFeedbackDueAt = 0;
}

function install() {
  const { DeviceRuntime } = require('./deviceRuntime');
  if (!DeviceRuntime || !DeviceRuntime.prototype || DeviceRuntime.prototype[PATCH_FLAG]) return false;

  const originalStart = DeviceRuntime.prototype.start;
  const originalStop = DeviceRuntime.prototype.stop;

  DeviceRuntime.prototype.start = async function patchedStart(...args) {
    const enabled = configureSungrowRuntime(this);
    const result = await originalStart.apply(this, args);
    if (enabled && this.started && this.cfg?.enabled !== false && this.driver) {
      startSungrowFeedback(this);
    }
    return result;
  };

  DeviceRuntime.prototype.stop = async function patchedStop(...args) {
    stopSungrowFeedback(this);
    return originalStop.apply(this, args);
  };

  DeviceRuntime.prototype[PATCH_FLAG] = true;
  return true;
}

module.exports = {
  install,
  isSungrowResidentialRuntime,
  configureSungrowRuntime,
  getBatteryPowerDatapoint,
  readBatteryPowerDirect,
  updateBatteryPowerStates,
  pollSungrowFeedbackOnce,
};
