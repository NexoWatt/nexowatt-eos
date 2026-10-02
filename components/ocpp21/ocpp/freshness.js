'use strict';

const crypto = require('node:crypto');

function sanitizeStationIdentity(rawIdentity) {
  const raw = String(rawIdentity ?? '').trim();
  const sanitized = raw
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'station';
  // Keep ordinary identities readable. Add a deterministic suffix only when characters had to be changed.
  if (sanitized === raw) return sanitized;
  const digest = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 8);
  return `${sanitized}_${digest}`;
}

function heartbeatTimeoutMs(intervalSec, factor = 2.5) {
  const interval = Math.max(10, Number(intervalSec) || 300);
  const safeFactor = Math.min(10, Math.max(1.2, Number(factor) || 2.5));
  return Math.round(interval * safeFactor * 1000);
}

/**
 * OCPP application activity must not expire earlier than an otherwise valid
 * heartbeat cadence. A minimum window protects fast-heartbeat stations from
 * brief scheduling/network jitter, while the heartbeat-derived window keeps
 * slow (for example 300 s) heartbeat configurations usable.
 */
function activityTimeoutMs(intervalSec, heartbeatFactor = 2.5, minimumSec = 90) {
  const minimum = Math.min(3600, Math.max(90, Number(minimumSec) || 90)) * 1000;
  return Math.max(minimum, heartbeatTimeoutMs(intervalSec, heartbeatFactor));
}

/**
 * Derive the three deliberately separate connection states used by EOS:
 *
 * - socketConnected: the physical WebSocket exists
 * - activityFresh / online: recent OCPP application traffic was observed
 * - heartbeatAlive: a Heartbeat arrived within its own expected window
 *
 * A late heartbeat therefore cannot turn a still-open socket into a physical
 * disconnect. Any OCPP request/response can keep activityFresh true without
 * falsifying heartbeatAlive.
 */
function deriveConnectionHealth(options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const socketConnected = options.socketConnected === true;
  const lastActivityAt = Math.max(
    0,
    Number(options.connectedAt) || 0,
    Number(options.lastMessageAt) || 0,
    Number(options.lastHeartbeatAt) || 0,
  );
  const heartbeatWindowMs = heartbeatTimeoutMs(options.heartbeatIntervalSec, options.heartbeatTimeoutFactor);
  const activityWindowMs = activityTimeoutMs(
    options.heartbeatIntervalSec,
    options.heartbeatTimeoutFactor,
    options.activityTimeoutSec,
  );
  const activityFresh = socketConnected && lastActivityAt > 0 && now - lastActivityAt <= activityWindowMs;
  const heartbeatAlive = socketConnected
    && Number(options.lastHeartbeatAt) > 0
    && now - Number(options.lastHeartbeatAt) <= heartbeatWindowMs;

  return {
    socketConnected,
    activityFresh,
    online: socketConnected && activityFresh,
    heartbeatAlive,
    lastActivityAt,
    activityWindowMs,
    heartbeatWindowMs,
  };
}

function commandTimeoutMs(timeoutSec) {
  const seconds = Math.min(120, Math.max(5, Number(timeoutSec) || 20));
  return Math.round(seconds * 1000);
}

function isTriggerAccepted(response) {
  return !!response && String(response.status || '').toLowerCase() === 'accepted';
}

function isTriggerUnsupported(response) {
  const status = response && String(response.status || '').toLowerCase();
  return status === 'notimplemented' || status === 'notsupported';
}

function isTriggerRejected(response) {
  return !!response && String(response.status || '').toLowerCase() === 'rejected';
}

function buildTriggerPayload(protocol, requestedMessage, evseId = 1, connectorId = 1) {
  if (protocol === 'ocpp1.6') {
    const payload = { requestedMessage };
    if (requestedMessage === 'MeterValues' || requestedMessage === 'StatusNotification') {
      payload.connectorId = Math.max(0, Number(connectorId) || 0);
    }
    return payload;
  }
  const payload = { requestedMessage };
  if (requestedMessage === 'MeterValues' || requestedMessage === 'StatusNotification' || requestedMessage === 'TransactionEvent') {
    payload.evse = {
      id: Math.max(0, Number(evseId) || 0),
      connectorId: Math.max(0, Number(connectorId) || 0),
    };
  }
  return payload;
}

function isChargingState(state) {
  const s = String(state || '').toLowerCase();
  return s === 'charging' || s === 'occupied' || s === 'evconnected' || s === 'suspendedev' || s === 'suspendedevse';
}

function statusImpliesZero(protocol, status) {
  const s = String(status || '').toLowerCase();
  if (protocol === 'ocpp1.6') {
    return ['available', 'preparing', 'finishing', 'suspendedev', 'suspendedevse', 'reserved', 'unavailable', 'faulted'].includes(s);
  }
  // In OCPP 2.x ConnectorStatus does not tell us whether an occupied connector is drawing power.
  // Only states that definitely cannot be charging are zeroed here.
  return ['available', 'reserved', 'unavailable', 'faulted'].includes(s);
}

function chargingStateImpliesZero(chargingState) {
  const s = String(chargingState || '').toLowerCase();
  return ['idle', 'evconnected', 'suspendedev', 'suspendedevse'].includes(s);
}

function isRealtimeMetricId(id) {
  const s = String(id || '');
  return /(?:^|\.)(?:Power_(?:Active|Reactive)_(?:Import|Export)|Current_(?:Import|Export)|Voltage(?:_|$)|Frequency(?:_|$)|Temperature(?:_|$)|SoC(?:_|$))/.test(s)
    || /\.meter\.(?:Power[._]|Current[._]|Voltage[._]|Frequency(?:_|$)|Temperature(?:_|$)|SoC(?:_|$))/.test(s)
    || /\.(?:measurements|connectors\.[^.]+)\.(?:powerW(?:L[123])?|powerExportW(?:L[123])?|currentA(?:L[123])?|currentExportA(?:L[123])?|voltageV(?:L[123])?|frequencyHz|temperatureC|socPercent)$/.test(s);
}

function isCounterMetricId(id) {
  const s = String(id || '');
  return /(?:Energy_|\.lastWh$|\.lastKWh$|TransactionConsumption|meterStart|meterStop)/i.test(s)
    || /\.(?:measurements|connectors\.[^.]+)\.(?:energy(?:Export)?(?:Interval)?(?:Wh|KWh)(?:L[123])?)$/.test(s);
}

function isActualPowerOrCurrentId(id) {
  const s = String(id || '');
  // Do not reset offered power/current limits; only measured import/export flow.
  return /(?:^|\.)(?:Power_Active_(?:Import|Export)|Power_Reactive_(?:Import|Export)|Current_(?:Import|Export))(?:_|$)/.test(s)
    || /\.meter\.(?:Power\.(?:Active|Reactive)\.(?:Import|Export)|Current\.(?:Import|Export))(?:_|$)/.test(s)
    || /\.(?:measurements|connectors\.[^.]+)\.(?:powerW(?:L[123])?|powerExportW(?:L[123])?|currentA(?:L[123])?|currentExportA(?:L[123])?)$/.test(s);
}

/**
 * EOS load-management freshness is deliberately tied to the canonical active
 * import power, not merely to an alive socket or an unrelated MeterValues field.
 * A protocol-derived safe zero is the only accepted substitute.
 */
function dataFreshForEos(online, powerFresh, safeZero) {
  return Boolean(online && (powerFresh || safeZero));
}

/**
 * Decide whether a cached datapoint may receive a timestamp refresh.
 * Realtime and SoC datapoints are evaluated per datapoint using the time at
 * which that exact value was received. This prevents a fresh current sample
 * from making an old power value look fresh.
 */
function shouldRepublishCachedState(item, options = {}) {
  if (!item || typeof item !== 'object') return false;
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const telemetryMaxAgeMs = Math.max(15, Number(options.telemetryMaxAgeSec) || 90) * 1000;
  const socMaxAgeMs = Math.max(30, Number(options.socMaxAgeSec) || 300) * 1000;
  const updatedAt = Number(item.updatedAt) || 0;

  if (item.category === 'safeZero') return Boolean(options.safeZero);
  if (item.category === 'realtime') return updatedAt > 0 && now - updatedAt <= telemetryMaxAgeMs;
  if (item.category === 'soc') return updatedAt > 0 && now - updatedAt <= socMaxAgeMs;
  return true;
}

/**
 * Select cached datapoints fairly across repeated republish cycles.
 *
 * A fixed "first N" slice would permanently starve datapoints that were
 * inserted later than the configured per-cycle limit. The cursor advances by
 * every inspected entry (including stale entries), so all currently eligible
 * datapoints eventually receive a fresh ioBroker timestamp.
 */
function selectCachedStatesForRepublish(entries, options = {}) {
  const list = Array.from(entries || []);
  if (list.length === 0) return { entries: [], nextCursor: 0 };

  const rawCursor = Math.trunc(Number(options.cursor) || 0);
  const start = ((rawCursor % list.length) + list.length) % list.length;
  const limit = Math.max(1, Math.min(list.length, Math.trunc(Number(options.limit) || list.length)));
  const selected = [];
  let visited = 0;
  let index = start;

  while (visited < list.length && selected.length < limit) {
    const entry = list[index];
    if (entry && shouldRepublishCachedState(entry[1], options)) selected.push(entry);
    index = (index + 1) % list.length;
    visited++;
  }

  return { entries: selected, nextCursor: index };
}

/**
 * Return a rotating slice of an iterable. Used for active refresh on stations
 * with more connectors than the per-cycle request limit.
 */
function takeRotatingItems(items, cursor = 0, limit = Number.MAX_SAFE_INTEGER) {
  const list = Array.from(items || []);
  if (list.length === 0) return { items: [], nextCursor: 0 };

  const rawCursor = Math.trunc(Number(cursor) || 0);
  const start = ((rawCursor % list.length) + list.length) % list.length;
  const count = Math.max(1, Math.min(list.length, Math.trunc(Number(limit) || list.length)));
  const selected = [];
  for (let i = 0; i < count; i++) selected.push(list[(start + i) % list.length]);
  return { items: selected, nextCursor: (start + count) % list.length };
}

function parseDeviceModelValue(value, dataType) {
  const raw = value === undefined || value === null ? '' : String(value).trim();
  switch (String(dataType || '').toLowerCase()) {
    case 'boolean': {
      const normalized = raw.toLowerCase();
      if (normalized === 'true' || normalized === '1') return { type: 'boolean', val: true };
      if (normalized === 'false' || normalized === '0') return { type: 'boolean', val: false };
      return { type: 'boolean', val: undefined };
    }
    case 'integer': {
      if (!raw) return { type: 'number', val: undefined };
      const n = Number(raw);
      return { type: 'number', val: Number.isFinite(n) && Number.isInteger(n) ? n : undefined };
    }
    case 'decimal': {
      if (!raw) return { type: 'number', val: undefined };
      const n = Number(raw);
      return { type: 'number', val: Number.isFinite(n) ? n : undefined };
    }
    case 'datetime':
      return { type: 'string', val: raw };
    default:
      return { type: 'string', val: raw };
  }
}

module.exports = {
  sanitizeStationIdentity,
  heartbeatTimeoutMs,
  activityTimeoutMs,
  deriveConnectionHealth,
  commandTimeoutMs,
  isTriggerAccepted,
  isTriggerUnsupported,
  isTriggerRejected,
  buildTriggerPayload,
  isChargingState,
  statusImpliesZero,
  chargingStateImpliesZero,
  isRealtimeMetricId,
  isCounterMetricId,
  isActualPowerOrCurrentId,
  dataFreshForEos,
  shouldRepublishCachedState,
  selectCachedStatesForRepublish,
  takeRotatingItems,
  parseDeviceModelValue,
};
