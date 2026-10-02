'use strict';
const utils = require('@iobroker/adapter-core');
const { OcppRpcServer } = require('./ocpp/server');
const {
  sanitizeStationIdentity,
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
  selectCachedStatesForRepublish,
  takeRotatingItems,
  parseDeviceModelValue,
} = require('./ocpp/freshness');
const {
  compactKeyFromLegacyAggregate,
  measurementCommon,
  measurementDefinition,
  sanitizeFlatKey,
  canonicalPhase,
  aggregatePhaseValues,
  deterministicChargingProfileIds,
  normalizeChargingLimit,
  chargingLimitChanged,
} = require('./ocpp/compact');

class NexoWattOcppAdapter extends utils.Adapter {
  constructor(options) {
    super({ ...options, name: 'ocpp21' });
    this.server = null;
    this.runtimeIndex = new Map();

    // Runtime caches to avoid excessive object creation overhead
    this._dpObjCache = new Set();
    this._dpCounts = new Map();
    this._aliasDone = new Set();
    this._dmIndex = new Map(); // stateId -> { protocol, component, variable, attributeType }
    this._rawToStateIdentity = new Map();
    this._stateToRawIdentity = new Map();
    this._freshStateCache = new Map(); // identity -> Map(stateId, { val, ack, category, updatedAt })
    this._phaseMetricCache = new Map();
    this._identityStructureReady = new Set();
    this._connectorStructureReady = new Set();
    this._connectorCleanupDone = new Set();
    this._advancedStructureReady = new Set();
    this._legacyCleanupDone = new Set();
    this._legacySubfolderCleanupDone = new Set();
    this._measurementAliasCleanupDone = new Set();
    this._watchdogTimer = null;
    this._watchdogRunning = false;
    this._shuttingDown = false;

    this.on('ready', this.onReady.bind(this));
    this.on('unload', this.onUnload.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
  }

  _stripNs(id) { return id.startsWith(this.namespace + '.') ? id.slice(this.namespace.length + 1) : id; }

  _sanitizeSeg(seg) {
    return String(seg || '')
      .trim()
      .replace(/[^A-Za-z0-9_\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      || 'x';
  }

  resolveStationIdentity(rawIdentity) {
    const raw = String(rawIdentity ?? '').trim();
    if (this._rawToStateIdentity.has(raw)) return this._rawToStateIdentity.get(raw);
    let stateId = sanitizeStationIdentity(raw);
    const existingRaw = this._stateToRawIdentity.get(stateId);
    if (existingRaw && existingRaw !== raw) {
      let suffix = 2;
      const base = stateId;
      while (this._stateToRawIdentity.has(`${base}_${suffix}`)) suffix++;
      stateId = `${base}_${suffix}`;
    }
    this._rawToStateIdentity.set(raw, stateId);
    this._stateToRawIdentity.set(stateId, raw);
    return stateId;
  }

  _identityFromStateId(id) {
    const rel = this._stripNs(String(id || ''));
    return rel.split('.')[0] || '';
  }

  _cacheFreshState(id, val, ack, category) {
    if (!category || ['payload', 'health', 'control', 'dm'].includes(category)) return;
    const rel = this._stripNs(id);
    const identity = this._identityFromStateId(rel);
    if (!identity) return;
    if (!this._freshStateCache.has(identity)) this._freshStateCache.set(identity, new Map());
    this._freshStateCache.get(identity).set(rel, { val, ack: !!ack, category, updatedAt: Date.now() });
  }

  async _setStateFreshAsync(id, val, ack = true, category = 'status') {
    const rel = this._stripNs(id);
    await this.setStateAsync(rel, { val, ack: !!ack });
    this._cacheFreshState(rel, val, ack, category);
  }

  _metricCategoryFromId(id) {
    if (isCounterMetricId(id)) return 'counter';
    if (/(?:^|\.)(?:SoC|soc(?:Percent)?)(?:_|\.|$)/.test(String(id || ''))) return 'soc';
    if (isRealtimeMetricId(id)) return 'realtime';
    return 'status';
  }

  _indexClient(identity, proto, client, rawIdentity) {
    const now = Date.now();
    const old = this.runtimeIndex.get(identity);
    if (old && old.client !== client) {
      this.log.warn(`Charging station identity ${rawIdentity || identity} connected again; the newer connection replaces the old runtime session.`);
      if (old.client && typeof old.client.close === 'function') {
        Promise.resolve(old.client.close({ code: 1008, reason: 'Superseded by a newer connection' })).catch(() => undefined);
      }
    }
    // Never carry realtime timestamps or phase fragments across OCPP sessions.
    this._freshStateCache.delete(identity);
    for (const key of [...this._phaseMetricCache.keys()]) if (key.startsWith(`${identity}|`)) this._phaseMetricCache.delete(key);
    this.runtimeIndex.set(identity, {
      proto,
      client,
      rawIdentity: rawIdentity || identity,
      connectedAt: now,
      socketConnected: true,
      lastMessageAt: now,
      lastAction: 'Connect',
      lastHeartbeatAt: 0,
      lastMeterAt: 0,
      lastPowerAt: 0,
      lastExportPowerAt: 0,
      lastCurrentAt: 0,
      lastSocAt: 0,
      lastStatusAt: 0,
      heartbeatIntervalSec: Math.max(10, Number(this.config.heartbeatIntervalSec) || 300),
      connectors: new Set(['1:1']),
      statuses: new Map(),
      transactionActive: false,
      chargingState: '',
      refreshInFlight: false,
      nextRefreshAt: now,
      triggerSupport: { MeterValues: 'unknown', StatusNotification: 'unknown' },
      triggerRetryAt: { MeterValues: 0, StatusNotification: 0 },
      lastTriggerAt: 0,
      lastTriggerMessage: '',
      refreshSuppressedUntil: old ? Math.max(0, Number(old.refreshSuppressedUntil) || 0) : 0,
      refreshSuppressedReason: old ? String(old.refreshSuppressedReason || '') : '',
      refreshRelatedDisconnects: old ? Math.max(0, Number(old.refreshRelatedDisconnects) || 0) : 0,
      lastRefreshAttemptAt: 0,
      lastRefreshSuccessAt: 0,
      lastRefreshError: '',
      lastStateRepublishAt: 0,
      republishCursor: 0,
      refreshConnectorCursor: 0,
      safeZeroAt: 0,
      safeZeroReason: '',
      booted: false,
      deferredTail: Promise.resolve(),
      deferredDepth: 0,
      deferredMaxDepth: 0,
      deferredDropped: 0,
      deferredErrors: 0,
      lastDeferredError: '',
      reconnectCount: old ? Math.max(0, Number(old.reconnectCount) || 0) + 1 : 0,
      disconnectCount: old ? Math.max(0, Number(old.disconnectCount) || 0) : 0,
      lastDisconnectAt: old ? old.lastDisconnectAt || 0 : 0,
      lastDisconnectCode: old ? old.lastDisconnectCode || 0 : 0,
      lastDisconnectReason: old ? old.lastDisconnectReason || '' : '',
      outboundCallCount: old ? Math.max(0, Number(old.outboundCallCount) || 0) : 0,
      outboundErrorCount: old ? Math.max(0, Number(old.outboundErrorCount) || 0) : 0,
      lastOutboundMethod: '',
      lastOutboundAt: 0,
      smartChargingTail: Promise.resolve(),
      smartChargingGeneration: 0,
      smartChargingPending: 0,
      lastSmartCharging: old ? old.lastSmartCharging : undefined,
      lastSmartChargingAt: old ? old.lastSmartChargingAt || 0 : 0,
    });
  }

  _unindexClient(identity, client) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry || (client && entry.client !== client)) return false;
    // Retain the runtime diagnostics while the station is offline. This lets us
    // distinguish a clean reconnect from a brand-new station and preserves the
    // deferred processing counters used to diagnose intermittent disconnects.
    entry.client = null;
    entry.socketConnected = false;
    entry.booted = false;
    entry.refreshInFlight = false;
    return true;
  }

  _deferStationTask(identity, label, task, options = {}) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry || this._shuttingDown) return false;
    const maxDepth = Math.max(25, Number(this.config.maxDeferredTasks) || 250);
    const droppable = options.droppable === true;
    if (droppable && entry.deferredDepth >= maxDepth) {
      entry.deferredDropped++;
      entry.lastDeferredError = `Dropped ${label}: deferred queue reached ${maxDepth}`;
      return false;
    }
    entry.deferredDepth++;
    entry.deferredMaxDepth = Math.max(entry.deferredMaxDepth || 0, entry.deferredDepth);
    const run = async () => {
      try {
        if (this.runtimeIndex.get(identity) !== entry && options.allowAfterReconnect !== true) {
          entry.deferredDropped++;
          entry.lastDeferredError = `Dropped ${label}: OCPP session was superseded`;
          return;
        }
        await task();
      } catch (error) {
        entry.deferredErrors++;
        entry.lastDeferredError = `${label}: ${error && error.message || error}`;
        this.log.warn(`Deferred OCPP processing failed (${identity}, ${label}): ${error && error.stack || error}`);
      } finally {
        entry.deferredDepth = Math.max(0, entry.deferredDepth - 1);
      }
    };
    entry.deferredTail = Promise.resolve(entry.deferredTail).then(run, run);
    return true;
  }

  async _noteDisconnect(identity, client, details = {}) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry || (client && entry.client !== client)) return;
    const now = Date.now();
    entry.socketConnected = false;
    entry.disconnectCount = Math.max(0, Number(entry.disconnectCount) || 0) + 1;
    entry.lastDisconnectAt = now;
    entry.lastDisconnectCode = Number(details.code) || 0;
    entry.lastDisconnectReason = String(details.reason || 'socket-closed');
    // Some station firmwares disconnect shortly after an actively requested
    // TriggerMessage. Treat this as a correlation signal (not proof), suppress
    // further active refresh for six hours and keep passive push telemetry
    // running. This prevents a diagnostic refresh loop from repeatedly
    // interrupting an otherwise stable charge.
    if (entry.lastTriggerAt && now - entry.lastTriggerAt <= 30_000) {
      entry.refreshRelatedDisconnects = Math.max(0, Number(entry.refreshRelatedDisconnects) || 0) + 1;
      entry.refreshSuppressedUntil = now + 6 * 60 * 60 * 1000;
      entry.refreshSuppressedReason = `disconnect-after-${entry.lastTriggerMessage || 'TriggerMessage'}`;
      entry.triggerRetryAt.MeterValues = entry.refreshSuppressedUntil;
      entry.triggerRetryAt.StatusNotification = entry.refreshSuppressedUntil;
    }
    try {
      await this.ensureStructure(identity);
      await this._setStateFreshAsync(`${identity}.health.lastDisconnectAt`, new Date(now).toISOString(), true, 'health');
      await this._setStateFreshAsync(`${identity}.health.lastDisconnectCode`, entry.lastDisconnectCode, true, 'health');
      await this._setStateFreshAsync(`${identity}.health.lastDisconnectReason`, entry.lastDisconnectReason, true, 'health');
      await this._setStateFreshAsync(`${identity}.health.disconnectCount`, entry.disconnectCount, true, 'health');
      await this._setStateFreshAsync(`${identity}.health.refreshRelatedDisconnects`, entry.refreshRelatedDisconnects || 0, true, 'health');
      await this._setStateFreshAsync(`${identity}.health.refreshSuppressedUntil`, entry.refreshSuppressedUntil ? new Date(entry.refreshSuppressedUntil).toISOString() : '', true, 'health');
      await this._setStateFreshAsync(`${identity}.health.refreshSuppressedReason`, entry.refreshSuppressedReason || '', true, 'health');
    } catch (error) {
      this.log.debug(`Could not persist disconnect diagnostics for ${identity}: ${error && error.message || error}`);
    }
  }

  _noteMessage(identity, action) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry) return;
    const now = Date.now();
    entry.lastMessageAt = now;
    entry.lastAction = String(action || '');
  }

  _noteBoot(identity, intervalSec) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry) return;
    const now = Date.now();
    entry.booted = true;
    entry.heartbeatIntervalSec = Math.max(10, Number(intervalSec) || entry.heartbeatIntervalSec || 300);
    entry.lastHeartbeatAt = now;
    entry.lastMessageAt = Math.max(entry.lastMessageAt || 0, now);
    entry.nextRefreshAt = now + Math.max(30, Number(this.config.activeRefreshIntervalSec) || 60) * 1000;
    entry.lastBootAt = now;
  }

  _noteHeartbeat(identity, timestamp) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry) return;
    // Heartbeat freshness is based on local receipt time. The remote clock is
    // retained only for display and must not make an old connection appear new.
    const now = Date.now();
    entry.lastHeartbeatAt = now;
    entry.lastMessageAt = Math.max(entry.lastMessageAt || 0, now);
    entry.lastHeartbeatSourceTimestamp = timestamp || '';
  }

  async _noteStatus(identity, evseId, connectorId, status) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry) return;
    const now = Date.now();
    entry.lastStatusAt = now;
    entry.connectors.add(`${Math.max(0, Number(evseId) || 0)}:${Math.max(0, Number(connectorId) || 0)}`);
    entry.statuses.set(`${evseId}:${connectorId}`, String(status || ''));
    if (isChargingState(status)) {
      entry.safeZeroAt = 0;
      entry.safeZeroReason = '';
    }
    if (this.config.zeroPowerWhenIdle !== false && statusImpliesZero(entry.proto, status)) {
      await this._zeroActualFlow(identity, `status:${status}`, evseId, connectorId);
    }
  }

  async _noteMeterValue(identity, evseId, connectorId, timestamp, flags = {}) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry) return;
    // Freshness is based on local receipt time. A station clock can be wrong,
    // in the future or far in the past and must not falsify EOS data quality.
    const now = Date.now();
    entry.lastMeterAt = Math.max(entry.lastMeterAt || 0, now);
    if (flags.hasPower) entry.lastPowerAt = Math.max(entry.lastPowerAt || 0, now);
    if (flags.hasExportPower) entry.lastExportPowerAt = Math.max(entry.lastExportPowerAt || 0, now);
    if (flags.hasCurrent) entry.lastCurrentAt = Math.max(entry.lastCurrentAt || 0, now);
    entry.connectors.add(`${Math.max(0, Number(evseId) || 0)}:${Math.max(0, Number(connectorId) || 0)}`);
    // A valid, non-zero actual-flow sample contradicts a previously derived
    // idle zero. Counter-only, SoC-only or zero-valued samples do not: an
    // unchanged Available/Idle protocol state remains authoritative while the
    // station is online.
    if (flags.hasNonZeroActualFlow) {
      entry.safeZeroAt = 0;
      entry.safeZeroReason = '';
    }
    await this.ensureStructure(identity, evseId, connectorId);
    await this._setStateFreshAsync(`${identity}.health.lastMeterValue`, new Date(entry.lastMeterAt).toISOString(), true, 'health');
    if (flags.hasPower) await this._setStateFreshAsync(`${identity}.health.lastPowerValue`, new Date(entry.lastPowerAt).toISOString(), true, 'health');
    if (flags.hasExportPower) await this._setStateFreshAsync(`${identity}.health.lastExportPowerValue`, new Date(entry.lastExportPowerAt).toISOString(), true, 'health');
    if (flags.hasCurrent) await this._setStateFreshAsync(`${identity}.health.lastCurrentValue`, new Date(entry.lastCurrentAt).toISOString(), true, 'health');
  }

  async _noteSoc(identity, timestamp) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry) return;
    // As with meter freshness, use receipt time rather than the EV/station
    // timestamp so clock skew cannot falsify health.socFresh.
    const now = Date.now();
    entry.lastSocAt = Math.max(entry.lastSocAt || 0, now);
    await this.ensureStructure(identity);
    await this._setStateFreshAsync(`${identity}.health.lastSoc`, new Date(entry.lastSocAt).toISOString(), true, 'health');
  }

  _recordPhaseMetric(identity, evseId, connectorId, measurand, phase, value, unit, ts) {
    const phaseKey = canonicalPhase(phase);
    if (!phaseKey) return;
    const key = `${identity}|${evseId}|${connectorId}|${measurand}`;
    if (!this._phaseMetricCache.has(key)) this._phaseMetricCache.set(key, new Map());
    this._phaseMetricCache.get(key).set(phaseKey, { value: Number(value), unit: unit || '', ts: Number(ts) || Date.now() });
  }

  _getPhaseMetricTotal(identity, evseId, connectorId, measurand) {
    const key = `${identity}|${evseId}|${connectorId}|${measurand}`;
    const values = this._phaseMetricCache.get(key);
    if (!values) return undefined;
    const maxAgeMs = Math.max(15, Number(this.config.telemetryMaxAgeSec) || 90) * 1000;
    const cutoff = Date.now() - maxAgeMs;
    const samples = [];
    let unit = '';
    for (const [phase, sample] of values.entries()) {
      if (!sample || sample.ts < cutoff || !Number.isFinite(sample.value)) {
        values.delete(phase);
        continue;
      }
      samples.push(sample.value);
      unit = unit || sample.unit || '';
    }
    const value = aggregatePhaseValues(measurand, samples);
    return Number.isFinite(value) ? { value, unit, phaseCount: samples.length } : undefined;
  }

  async _noteTransaction(identity, evt) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry) return;
    if (evt.type === 'Start') entry.transactionActive = true;
    if (evt.type === 'Stop') entry.transactionActive = false;
    if (evt.chargingState !== undefined) entry.chargingState = String(evt.chargingState || '');
    if (evt.type === 'Start' || (isChargingState(evt.chargingState) && !chargingStateImpliesZero(evt.chargingState))) {
      entry.safeZeroAt = 0;
      entry.safeZeroReason = '';
    }
    if (evt.evseId !== undefined || evt.connectorId !== undefined) {
      entry.connectors.add(`${Math.max(0, Number(evt.evseId) || 1)}:${Math.max(0, Number(evt.connectorId) || 1)}`);
    }
    if (this.config.zeroPowerWhenIdle !== false && (evt.type === 'Stop' || chargingStateImpliesZero(evt.chargingState))) {
      await this._zeroActualFlow(identity, evt.type === 'Stop' ? 'transaction-ended' : `charging-state:${evt.chargingState}`, evt.evseId, evt.connectorId);
    }
  }

  async _zeroActualFlow(identity, reason, evseId, connectorId) {
    await this.ensureStructure(identity, evseId || 1, connectorId || 1);
    const now = Date.now();
    const entry = this.runtimeIndex.get(identity);
    const ids = new Set([
      `${identity}.measurements.powerW`,
      `${identity}.measurements.powerExportW`,
      `${identity}.measurements.currentA`,
      `${identity}.measurements.currentExportA`,
    ]);
    const cache = this._freshStateCache.get(identity);
    if (cache) {
      for (const stateId of cache.keys()) if (isActualPowerOrCurrentId(stateId)) ids.add(stateId);
    }
    if (this.config.connectorDetails === true && evseId !== undefined && connectorId !== undefined) {
      const base = this._connectorBase(identity, evseId, connectorId);
      ids.add(`${base}.powerW`);
      ids.add(`${base}.powerExportW`);
      ids.add(`${base}.currentA`);
      ids.add(`${base}.currentExportA`);
    }
    for (const stateId of ids) {
      const key = stateId.split('.').pop();
      if (stateId.includes('.measurements.')) await this.ensureMeasurement(identity, key, key.toLowerCase().includes('current') ? 'A' : 'W');
      await this._setStateFreshAsync(stateId, 0, true, 'safeZero');
    }
    for (const key of [...this._phaseMetricCache.keys()]) if (key.startsWith(`${identity}|`)) this._phaseMetricCache.delete(key);
    if (entry) {
      entry.safeZeroAt = now;
      entry.safeZeroReason = reason;
    }
    await this._setStateFreshAsync(`${identity}.health.safeZeroApplied`, true, true, 'health');
    await this._setStateFreshAsync(`${identity}.health.safeZeroReason`, reason, true, 'health');
  }

  async _touchCachedStates(identity, safeZero, now = Date.now(), cursor = 0) {
    const cache = this._freshStateCache.get(identity);
    if (!cache || cache.size === 0) return 0;
    const maxStates = Math.max(25, Number(this.config.maxRepublishedStates) || 250);
    const selection = selectCachedStatesForRepublish(cache.entries(), {
      cursor,
      limit: maxStates,
      now,
      telemetryMaxAgeSec: this.config.telemetryMaxAgeSec,
      socMaxAgeSec: this.config.socMaxAgeSec,
      safeZero,
    });
    for (const [stateId, item] of selection.entries) {
      await this.setStateAsync(stateId, { val: item.val, ack: item.ack });
    }
    return selection.nextCursor;
  }

  async _callClient(identity, method, payload, options = {}) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry || !entry.client) throw new Error(`No connected charging station for ${identity}`);
    const timeoutMs = commandTimeoutMs(this.config.callTimeoutSec);
    entry.outboundCallCount = Math.max(0, Number(entry.outboundCallCount) || 0) + 1;
    entry.lastOutboundMethod = String(method || '');
    entry.lastOutboundAt = Date.now();
    const captureEnabled = options.capture !== false && this.config.captureRawMessages === true;
    if (captureEnabled) {
      this._deferStationTask(identity, `capture-out:${method}`, () => this.captureOcppPayload(identity, entry.proto, 'out', method, payload), { droppable: true });
    }
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${method} timeout after ${timeoutMs} ms`)), timeoutMs);
      });
      const response = await Promise.race([entry.client.call(method, payload), timeout]);
      // A CALLRESULT is valid OCPP application activity as well. It keeps
      // activityFresh/health.online alive without pretending that a Heartbeat
      // was received.
      if (this.runtimeIndex.get(identity) === entry) {
        entry.lastMessageAt = Date.now();
        entry.lastAction = `${method}Response`;
      }
      if (captureEnabled) {
        this._deferStationTask(identity, `capture-out:${method}Response`, () => this.captureOcppPayload(identity, entry.proto, 'out', `${method}Response`, response), { droppable: true });
      }
      return response;
    } catch (error) {
      entry.outboundErrorCount = Math.max(0, Number(entry.outboundErrorCount) || 0) + 1;
      if (captureEnabled) {
        this._deferStationTask(identity, `capture-out:${method}Error`, () => this.captureOcppPayload(identity, entry.proto, 'out', `${method}Error`, { error: String(error && error.message || error) }), { droppable: true });
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  _assertCallAccepted(method, response) {
    if (!response || typeof response !== 'object' || typeof response.status !== 'string') return response;
    const status = response.status.trim();
    const accepted = new Set(['accepted', 'scheduled', 'rebootrequired', 'ok']);
    if (!accepted.has(status.toLowerCase())) throw new Error(`${method} returned status ${status}`);
    return response;
  }

  _stringifyControlValue(value) {
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value); } catch (e) { return String(value); }
  }

  async _recordControlResult(identity, method, response, error) {
    await this.ensureStructure(identity);
    const now = new Date().toISOString();
    const errorText = error ? String(error && error.message || error) : '';
    await this._setStateFreshAsync(`${identity}.control.lastCommand`, String(method || ''), true, 'control');
    await this._setStateFreshAsync(`${identity}.control.lastCommandAt`, now, true, 'control');
    await this._setStateFreshAsync(`${identity}.control.lastResponse`, errorText ? '' : this._stringifyControlValue(response), true, 'control');
    await this._setStateFreshAsync(`${identity}.control.lastError`, errorText, true, 'control');
    await this._setStateFreshAsync(`${identity}.control.lastSuccess`, !errorText, true, 'control');
  }

  _buildChargingProfileCall(protocol, limit, rateUnit, phases, identity, functionKey = 'eos-charge-limit') {
    const connectorId = Math.max(0, Number(this.config.smartChargingConnectorId) || 1);
    const scope = protocol === 'ocpp1.6' ? `connector-${connectorId}` : 'charging-station';
    const { chargingProfileId, scheduleId } = deterministicChargingProfileIds(identity, functionKey, scope);
    if (protocol === 'ocpp1.6') {
      return {
        method: 'SetChargingProfile',
        payload: {
          connectorId,
          csChargingProfiles: {
            chargingProfileId,
            stackLevel: 0,
            chargingProfilePurpose: 'TxDefaultProfile',
            chargingProfileKind: 'Absolute',
            chargingSchedule: {
              chargingRateUnit: rateUnit,
              chargingSchedulePeriod: [{ startPeriod: 0, limit, numberPhases: phases }],
            },
          },
        },
      };
    }
    return {
      method: 'SetChargingProfile',
      payload: {
        evseId: 0,
        chargingProfile: {
          id: chargingProfileId,
          stackLevel: 0,
          chargingProfilePurpose: 'ChargingStationMaxProfile',
          chargingProfileKind: 'Absolute',
          chargingSchedule: [{
            id: scheduleId,
            chargingRateUnit: rateUnit,
            chargingSchedulePeriod: [{ startPeriod: 0, limit, numberPhases: phases }],
          }],
        },
      },
    };
  }

  _buildClearChargingProfileCall(protocol, identity, functionKey = 'eos-charge-limit') {
    const connectorId = Math.max(0, Number(this.config.smartChargingConnectorId) || 1);
    const scope = protocol === 'ocpp1.6' ? `connector-${connectorId}` : 'charging-station';
    const { chargingProfileId } = deterministicChargingProfileIds(identity, functionKey, scope);
    if (protocol === 'ocpp1.6') {
      return { method: 'ClearChargingProfile', payload: { id: chargingProfileId } };
    }
    return { method: 'ClearChargingProfile', payload: { chargingProfileId } };
  }

  async _persistSmartChargingResult(identity, result) {
    await this.ensureStructure(identity);
    await this._setStateFreshAsync(`${identity}.control.requestedChargeLimit`, Number(result.requestedLimit) || 0, true, 'control');
    await this._setStateFreshAsync(`${identity}.control.appliedChargeLimit`, Number.isFinite(Number(result.effectiveLimit)) ? Number(result.effectiveLimit) : 0, true, 'control');
    await this._setStateFreshAsync(`${identity}.control.chargeLimitReason`, String(result.reason || ''), true, 'control');
    await this._setStateFreshAsync(`${identity}.control.chargeLimitClamped`, Number.isFinite(Number(result.effectiveLimit)) && Number(result.effectiveLimit) !== Number(result.requestedLimit), true, 'control');
  }

  async _applySmartCharging(identity, requestedLimit, rateUnit, phases, isCurrent = () => true) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry || !entry.client) throw new Error('Charging station is not connected');
    const normalized = normalizeChargingLimit(requestedLimit, rateUnit, phases, {
      minimumChargingCurrentA: this.config.minimumChargingCurrentA,
      nominalVoltageV: this.config.nominalVoltageV,
      zeroLimitBehavior: this.config.zeroLimitBehavior,
    }, entry.lastSmartCharging);

    // EOS may write a new setpoint while an older one is still waiting for the
    // OCPP command slot. Never send a queued value that has already been
    // superseded by a newer control cycle.
    if (!isCurrent()) return { status: 'Superseded', ...normalized };

    if (normalized.action === 'hold') {
      await this._persistSmartChargingResult(identity, normalized);
      entry.lastSmartCharging = { ...entry.lastSmartCharging, requestedLimit: normalized.requestedLimit, reason: normalized.reason, action: 'hold' };
      return { status: 'Held', ...normalized };
    }

    if (!chargingLimitChanged(entry.lastSmartCharging, normalized, {
      smartChargingDeadbandA: this.config.smartChargingDeadbandA,
      smartChargingDeadbandW: this.config.smartChargingDeadbandW,
    })) {
      normalized.reason = 'unchanged-within-deadband';
      await this._persistSmartChargingResult(identity, normalized);
      return { status: 'Unchanged', ...normalized };
    }

    const minIntervalMs = Math.max(1000, Number(this.config.smartChargingMinIntervalMs) || 5000);
    const waitMs = Math.max(0, minIntervalMs - (Date.now() - (entry.lastSmartChargingAt || 0)));
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    if (!isCurrent()) return { status: 'Superseded', ...normalized };

    const call = normalized.action === 'clear'
      ? this._buildClearChargingProfileCall(entry.proto, identity)
      : this._buildChargingProfileCall(entry.proto, normalized.effectiveLimit, normalized.rateUnit, normalized.phases, identity);
    const response = await this._callClient(identity, call.method, call.payload);
    this._assertCallAccepted(call.method, response);
    entry.lastSmartChargingAt = Date.now();
    entry.lastSmartCharging = { ...normalized };
    await this._persistSmartChargingResult(identity, normalized);
    return { status: 'Applied', method: call.method, response, ...normalized };
  }

  _queueSmartCharging(identity, requestedLimit, rateUnit, phases) {
    const entry = this.runtimeIndex.get(identity);
    if (!entry || !entry.client) return Promise.reject(new Error('Charging station is not connected'));
    const generation = (entry.smartChargingGeneration || 0) + 1;
    entry.smartChargingGeneration = generation;
    entry.smartChargingPending = Math.max(0, Number(entry.smartChargingPending) || 0) + 1;
    const run = async () => {
      try {
        return await this._applySmartCharging(
          identity,
          requestedLimit,
          rateUnit,
          phases,
          () => this.runtimeIndex.get(identity) === entry && entry.client && entry.smartChargingGeneration === generation,
        );
      } finally {
        entry.smartChargingPending = Math.max(0, (Number(entry.smartChargingPending) || 1) - 1);
      }
    };
    entry.smartChargingTail = Promise.resolve(entry.smartChargingTail).then(run, run);
    return entry.smartChargingTail;
  }

  async _requestFreshData(identity, entry) {
    if (!entry || !entry.client || entry.refreshInFlight || this.config.activeRefresh === false) return;
    if ((entry.smartChargingPending || 0) > 0) return;
    if ((entry.deferredDepth || 0) > Math.max(10, Number(this.config.maxDeferredTasks) || 250) / 2) return;
    const now = Date.now();
    if (entry.refreshSuppressedUntil && now < entry.refreshSuppressedUntil) return;
    if (entry.refreshSuppressedUntil && now >= entry.refreshSuppressedUntil) {
      entry.refreshSuppressedUntil = 0;
      entry.refreshSuppressedReason = '';
    }
    if (now < (entry.nextRefreshAt || 0)) return;
    entry.refreshInFlight = true;
    entry.lastRefreshAttemptAt = now;
    if (entry.lastOutboundAt && now - entry.lastOutboundAt < 5000) {
      entry.nextRefreshAt = now + 10000;
      entry.refreshInFlight = false;
      return;
    }
    entry.nextRefreshAt = now + Math.max(30, Number(this.config.activeRefreshIntervalSec) || 60) * 1000;
    const connectorSelection = takeRotatingItems(
      entry.connectors,
      entry.refreshConnectorCursor,
      Math.max(1, Number(this.config.maxConnectorsPerRefresh) || 8),
    );
    const connectors = connectorSelection.items;
    entry.refreshConnectorCursor = connectorSelection.nextCursor;
    let accepted = 0;
    let attempted = 0;
    let skippedFresh = 0;
    let skippedBackoff = 0;
    const errors = [];
    try {
      await this._setStateFreshAsync(`${identity}.health.refreshLastAttempt`, new Date(now).toISOString(), true, 'health');
      for (const key of connectors.length ? connectors : ['1:1']) {
        const [evseId, connectorId] = key.split(':').map(Number);
        for (const requestedMessage of ['MeterValues', 'StatusNotification']) {
          if (requestedMessage === 'MeterValues' && this.config.refreshMeterValues === false) continue;
          if (requestedMessage === 'StatusNotification' && this.config.refreshStatusNotification === false) continue;
          // MeterValues refresh is driven by active-import power freshness,
          // not by unrelated counters, SoC or temperature samples.
          const freshAt = requestedMessage === 'MeterValues' ? entry.lastPowerAt : entry.lastStatusAt;
          const refreshIntervalMs = Math.max(30, Number(this.config.activeRefreshIntervalSec) || 60) * 1000;
          if (freshAt && now - freshAt < Math.max(3000, refreshIntervalMs * 0.8)) {
            skippedFresh++;
            continue;
          }
          if (entry.triggerRetryAt[requestedMessage] && now < entry.triggerRetryAt[requestedMessage]) {
            skippedBackoff++;
            continue;
          }
          attempted++;
          try {
            entry.lastTriggerAt = Date.now();
            entry.lastTriggerMessage = requestedMessage;
            const response = await this._callClient(identity, 'TriggerMessage', buildTriggerPayload(entry.proto, requestedMessage, evseId, connectorId), { capture: false });
            const status = String(response && response.status || 'Unknown');
            entry.triggerSupport[requestedMessage] = status;
            if (isTriggerAccepted(response)) {
              accepted++;
              entry.triggerRetryAt[requestedMessage] = 0;
            } else if (isTriggerUnsupported(response)) {
              entry.triggerRetryAt[requestedMessage] = now + 6 * 60 * 60 * 1000;
            } else if (isTriggerRejected(response)) {
              entry.triggerRetryAt[requestedMessage] = now + 10 * 60 * 1000;
            } else {
              entry.triggerRetryAt[requestedMessage] = now + 10 * 60 * 1000;
              errors.push(`${requestedMessage}: unexpected status ${status}`);
            }
          } catch (e) {
            entry.triggerSupport[requestedMessage] = 'error';
            entry.triggerRetryAt[requestedMessage] = now + 10 * 60 * 1000;
            errors.push(`${requestedMessage}: ${e && e.message || e}`);
          }
        }
      }
      if (accepted > 0) entry.lastRefreshSuccessAt = Date.now();
      entry.lastRefreshError = errors.join('; ');
      let refreshStatus = 'not-run';
      if (accepted > 0) refreshStatus = 'requested';
      else if (errors.length) refreshStatus = 'error/backoff';
      else if (attempted === 0 && skippedFresh > 0) refreshStatus = 'fresh-no-request';
      else if (attempted === 0 && skippedBackoff > 0) refreshStatus = 'backoff';
      else if (attempted > 0) refreshStatus = 'not-accepted/backoff';
      await this._setStateFreshAsync(`${identity}.health.refreshStatus`, refreshStatus, true, 'health');
      await this._setStateFreshAsync(`${identity}.health.refreshSupport`, JSON.stringify(entry.triggerSupport), true, 'health');
      await this._setStateFreshAsync(`${identity}.health.refreshLastError`, entry.lastRefreshError, true, 'health');
      if (entry.lastRefreshSuccessAt) await this._setStateFreshAsync(`${identity}.health.refreshLastSuccess`, new Date(entry.lastRefreshSuccessAt).toISOString(), true, 'health');
    } finally {
      entry.refreshInFlight = false;
    }
  }

  async _watchdogCycle() {
    if (this._watchdogRunning || this._shuttingDown) return;
    this._watchdogRunning = true;
    try {
      const now = Date.now();
      for (const [identity, entry] of this.runtimeIndex.entries()) {
        await this.ensureStructure(identity);
        const connectionHealth = deriveConnectionHealth({
          now,
          socketConnected: entry.socketConnected,
          connectedAt: entry.connectedAt,
          lastMessageAt: entry.lastMessageAt,
          lastHeartbeatAt: entry.lastHeartbeatAt,
          heartbeatIntervalSec: entry.heartbeatIntervalSec,
          heartbeatTimeoutFactor: this.config.heartbeatTimeoutFactor,
          activityTimeoutSec: this.config.activityTimeoutSec,
        });
        const lastActivityAt = connectionHealth.lastActivityAt;
        const messageAgeSec = entry.lastMessageAt ? Math.max(0, (now - entry.lastMessageAt) / 1000) : -1;
        const heartbeatAgeSec = entry.lastHeartbeatAt ? Math.max(0, (now - entry.lastHeartbeatAt) / 1000) : -1;
        const meterAgeSec = entry.lastMeterAt ? Math.max(0, (now - entry.lastMeterAt) / 1000) : -1;
        const powerAgeSec = entry.lastPowerAt ? Math.max(0, (now - entry.lastPowerAt) / 1000) : -1;
        const exportPowerAgeSec = entry.lastExportPowerAt ? Math.max(0, (now - entry.lastExportPowerAt) / 1000) : -1;
        const currentAgeSec = entry.lastCurrentAt ? Math.max(0, (now - entry.lastCurrentAt) / 1000) : -1;
        const statusAgeSec = entry.lastStatusAt ? Math.max(0, (now - entry.lastStatusAt) / 1000) : -1;
        const socAgeSec = entry.lastSocAt ? Math.max(0, (now - entry.lastSocAt) / 1000) : -1;
        const socketConnected = connectionHealth.socketConnected;
        const activityFresh = connectionHealth.activityFresh;
        const online = connectionHealth.online;
        const heartbeatAlive = connectionHealth.heartbeatAlive;
        const telemetryMaxAgeSec = Math.max(15, Number(this.config.telemetryMaxAgeSec) || 90);
        const meterFresh = entry.lastMeterAt > 0 && meterAgeSec <= telemetryMaxAgeSec;
        const powerFresh = entry.lastPowerAt > 0 && powerAgeSec <= telemetryMaxAgeSec;
        const exportPowerFresh = entry.lastExportPowerAt > 0 && exportPowerAgeSec <= telemetryMaxAgeSec;
        const currentFresh = entry.lastCurrentAt > 0 && currentAgeSec <= telemetryMaxAgeSec;
        const socFresh = entry.lastSocAt > 0 && socAgeSec <= Math.max(30, Number(this.config.socMaxAgeSec) || 300);
        // safeZeroAt is cleared immediately by a charging event or a
        // contradictory non-zero actual-flow sample. Therefore a previously
        // confirmed idle/end state remains valid across later counter, SoC or
        // zero-only MeterValues messages.
        const safeZero = entry.safeZeroAt > 0;
        // EOS data freshness is tied to the canonical active-import power or a
        // protocol-derived safe zero. Heartbeat/current/reactive power alone do
        // not make an old power datapoint suitable for closed-loop control.
        const dataFresh = dataFreshForEos(online, powerFresh, safeZero);
        let staleReason = '';
        if (!socketConnected) staleReason = 'socket-disconnected';
        else if (!online) staleReason = 'no-ocpp-activity';
        else if (!dataFresh && exportPowerFresh) staleReason = 'export-power-only-no-import-power';
        else if (!dataFresh && !entry.lastPowerAt) staleReason = 'awaiting-power-or-idle-status';
        else if (!dataFresh) staleReason = 'power-values-stale';

        // ioBroker's conventional info.connection flag represents the real
        // transport connection. Activity and heartbeat quality stay in health.*
        // so a delayed Heartbeat cannot make EOS believe the socket vanished.
        await this._setStateFreshAsync(`${identity}.info.connection`, socketConnected, true, 'status');
        await this._setStateFreshAsync(`${identity}.info.socketConnected`, socketConnected, true, 'status');
        await this._setStateFreshAsync(`${identity}.health.online`, online, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.activityFresh`, activityFresh, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.socketConnected`, socketConnected, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.heartbeatAlive`, heartbeatAlive, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.meterFresh`, meterFresh, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.powerFresh`, powerFresh, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.exportPowerFresh`, exportPowerFresh, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.currentFresh`, currentFresh, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.dataFresh`, dataFresh, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.socFresh`, socFresh, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.staleReason`, staleReason, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.messageAgeSec`, Math.round(messageAgeSec), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.activityAgeSec`, lastActivityAt ? Math.round(Math.max(0, (now - lastActivityAt) / 1000)) : -1, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.activityTimeoutSec`, Math.round(connectionHealth.activityWindowMs / 1000), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.heartbeatTimeoutSec`, Math.round(connectionHealth.heartbeatWindowMs / 1000), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.heartbeatAgeSec`, Math.round(heartbeatAgeSec), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.meterAgeSec`, Math.round(meterAgeSec), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.powerAgeSec`, Math.round(powerAgeSec), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.exportPowerAgeSec`, Math.round(exportPowerAgeSec), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.currentAgeSec`, Math.round(currentAgeSec), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.statusAgeSec`, Math.round(statusAgeSec), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.socAgeSec`, Math.round(socAgeSec), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.safeZeroApplied`, safeZero, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.safeZeroReason`, entry.safeZeroReason || '', true, 'health');
        await this._setStateFreshAsync(`${identity}.health.lastSeenMs`, entry.lastMessageAt || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.lastSeen`, entry.lastMessageAt ? new Date(entry.lastMessageAt).toISOString() : '', true, 'health');
        await this._setStateFreshAsync(`${identity}.health.lastAction`, entry.lastAction || '', true, 'health');
        await this._setStateFreshAsync(`${identity}.health.lastHeartbeatMs`, entry.lastHeartbeatAt || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.heartbeat`, entry.lastHeartbeatAt ? new Date(entry.lastHeartbeatAt).toISOString() : '', true, 'health');
        await this._setStateFreshAsync(`${identity}.info.lastHeartbeat`, entry.lastHeartbeatAt ? new Date(entry.lastHeartbeatAt).toISOString() : '', true, 'status');
        if (entry.lastBootAt) await this._setStateFreshAsync(`${identity}.health.lastBoot`, new Date(entry.lastBootAt).toISOString(), true, 'health');
        await this._setStateFreshAsync(`${identity}.health.reconnectCount`, entry.reconnectCount || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.disconnectCount`, entry.disconnectCount || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.queueDepth`, entry.deferredDepth || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.queueMaxDepth`, entry.deferredMaxDepth || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.queueDropped`, entry.deferredDropped || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.queueErrors`, entry.deferredErrors || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.queueLastError`, entry.lastDeferredError || '', true, 'health');
        await this._setStateFreshAsync(`${identity}.health.outboundCallCount`, entry.outboundCallCount || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.outboundErrorCount`, entry.outboundErrorCount || 0, true, 'health');
        await this._setStateFreshAsync(`${identity}.health.lastOutboundMethod`, entry.lastOutboundMethod || '', true, 'health');
        await this._setStateFreshAsync(`${identity}.health.lastOutboundAt`, entry.lastOutboundAt ? new Date(entry.lastOutboundAt).toISOString() : '', true, 'health');
        await this._setStateFreshAsync(`${identity}.health.refreshSuppressedUntil`, entry.refreshSuppressedUntil ? new Date(entry.refreshSuppressedUntil).toISOString() : '', true, 'health');
        await this._setStateFreshAsync(`${identity}.health.refreshSuppressedReason`, entry.refreshSuppressedReason || '', true, 'health');
        await this._setStateFreshAsync(`${identity}.health.refreshRelatedDisconnects`, entry.refreshRelatedDisconnects || 0, true, 'health');

        const republishMs = Math.max(5, Number(this.config.stateRefreshIntervalSec) || 10) * 1000;
        if (online && now - (entry.lastStateRepublishAt || 0) >= republishMs) {
          entry.republishCursor = await this._touchCachedStates(identity, safeZero, now, entry.republishCursor || 0);
          entry.lastStateRepublishAt = now;
          await this._setStateFreshAsync(`${identity}.health.lastRepublish`, new Date(now).toISOString(), true, 'health');
        }
        if (online && entry.booted) {
          // Active refresh may wait for a slow or non-compliant station. Do not
          // block health processing for this or any other connected station.
          this._requestFreshData(identity, entry).catch((e) => {
            this.log.warn(`Active refresh failed for ${identity}: ${e && e.message || e}`);
          });
        }
      }
    } catch (e) {
      this.log.warn(`NexoWatt OCPP freshness watchdog failed: ${e && e.stack || e}`);
    } finally {
      this._watchdogRunning = false;
    }
  }

  _looksLikeIsoTime(s) {
    if (typeof s !== 'string') return false;
    // very lightweight ISO-8601 date-time heuristic
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s);
  }

  async _setObjectNotExistsCached(id, obj) {
    if (this._dpObjCache.has(id)) return;
    await this.setObjectNotExistsAsync(id, obj);
    this._dpObjCache.add(id);
  }

  _flattenJson(value, out, path, depth, maxDepth, maxArray) {
    if (depth > maxDepth) {
      out.push({ path, value: JSON.stringify(value), kind: 'json' });
      return;
    }
    if (value === null || value === undefined) {
      out.push({ path, value: null, kind: 'null' });
      return;
    }
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      out.push({ path, value, kind: t });
      return;
    }
    if (Array.isArray(value)) {
      const len = value.length;
      const n = Math.min(len, maxArray);
      for (let i = 0; i < n; i++) {
        this._flattenJson(value[i], out, path.concat(String(i)), depth + 1, maxDepth, maxArray);
      }
      if (len > maxArray) {
        out.push({ path: path.concat('_truncated'), value: `array(${len}) truncated to ${maxArray}`, kind: 'string' });
      }
      return;
    }
    if (t === 'object') {
      for (const [k, v] of Object.entries(value)) {
        this._flattenJson(v, out, path.concat(String(k)), depth + 1, maxDepth, maxArray);
      }
      return;
    }
    // fallback
    out.push({ path, value: String(value), kind: 'string' });
  }

  async _ensureAdvancedStructure(identity) {
    if (this._advancedStructureReady.has(identity)) return;
    await this._setObjectNotExistsCached(`${identity}.advanced`, {
      type: 'channel',
      common: { name: { en: 'Advanced OCPP diagnostics', de: 'Erweiterte OCPP-Diagnose' } },
      native: {},
    });
    const states = {
      lastIncoming: ['string', 'json', ''],
      lastOutgoing: ['string', 'json', ''],
      lastIncomingAction: ['string', 'text', ''],
      lastOutgoingAction: ['string', 'text', ''],
      lastProtocol: ['string', 'text', ''],
      lastTimestamp: ['string', 'value.time', ''],
      incomingCount: ['number', 'value', 0],
      outgoingCount: ['number', 'value', 0],
      lastMessageBytes: ['number', 'value', 0],
      lastMessageTruncated: ['boolean', 'indicator', false],
      deviceModelReport: ['string', 'json', ''],
      deviceModelReportAt: ['string', 'value.time', ''],
    };
    for (const [key, [type, role, def]] of Object.entries(states)) {
      await this._setObjectNotExistsCached(`${identity}.advanced.${key}`, {
        type: 'state',
        common: { name: key, type, role, read: true, write: false, def },
        native: {},
      });
    }
    this._advancedStructureReady.add(identity);
  }

  async captureOcppPayload(identity, protocol, direction, action, payload) {
    if (this.config.captureRawMessages !== true) return;
    await this._ensureAdvancedStructure(identity);
    const dir = String(direction || '').toLowerCase() === 'out' ? 'Outgoing' : 'Incoming';
    const countKey = dir === 'Outgoing' ? 'outgoingCount' : 'incomingCount';
    const rawKey = dir === 'Outgoing' ? 'lastOutgoing' : 'lastIncoming';
    const actionKey = dir === 'Outgoing' ? 'lastOutgoingAction' : 'lastIncomingAction';
    const counterMapKey = `${identity}|advanced|${countKey}`;
    const count = (this._dpCounts.get(counterMapKey) || 0) + 1;
    this._dpCounts.set(counterMapKey, count);

    let raw;
    try { raw = JSON.stringify(payload ?? {}); } catch (error) { raw = JSON.stringify({ serializationError: String(error && error.message || error) }); }
    const bytes = Buffer.byteLength(raw, 'utf8');
    const maxBytes = Math.max(4096, Number(this.config.maxRawPayloadBytes) || 65536);
    let truncated = false;
    if (bytes > maxBytes) {
      raw = `${raw.slice(0, maxBytes)}…[truncated ${bytes - maxBytes} bytes]`;
      truncated = true;
    }
    const now = new Date().toISOString();
    await this._setStateFreshAsync(`${identity}.advanced.${rawKey}`, raw, true, 'payload');
    await this._setStateFreshAsync(`${identity}.advanced.${actionKey}`, String(action || ''), true, 'payload');
    await this._setStateFreshAsync(`${identity}.advanced.lastProtocol`, String(protocol || ''), true, 'payload');
    await this._setStateFreshAsync(`${identity}.advanced.lastTimestamp`, now, true, 'payload');
    await this._setStateFreshAsync(`${identity}.advanced.${countKey}`, count, true, 'payload');
    await this._setStateFreshAsync(`${identity}.advanced.lastMessageBytes`, bytes, true, 'payload');
    await this._setStateFreshAsync(`${identity}.advanced.lastMessageTruncated`, truncated, true, 'payload');
  }

  async ingestNotifyReport(identity, protocol, params) {
    const reportData = Array.isArray(params && params.reportData) ? params.reportData : [];
    if (this.config.captureDeviceModelReport === true) {
      await this._ensureAdvancedStructure(identity);
      let raw = '';
      try { raw = JSON.stringify(params || {}); } catch (error) { raw = JSON.stringify({ serializationError: String(error && error.message || error) }); }
      const maxBytes = Math.max(4096, Number(this.config.maxRawPayloadBytes) || 65536);
      if (Buffer.byteLength(raw, 'utf8') > maxBytes) raw = `${raw.slice(0, maxBytes)}…[truncated]`;
      await this._setStateFreshAsync(`${identity}.advanced.deviceModelReport`, raw, true, 'payload');
      await this._setStateFreshAsync(`${identity}.advanced.deviceModelReportAt`, new Date().toISOString(), true, 'payload');
    }

    // Only operationally relevant Device Model values are mirrored into the
    // compact tree. The complete report remains available as one JSON state.
    for (const rd of reportData) {
      const componentName = String(rd && rd.component && rd.component.name || '').toLowerCase();
      const variableName = String(rd && rd.variable && rd.variable.name || '').toLowerCase();
      if (componentName !== 'connectedev' || variableName !== 'stateofcharge') continue;
      const characteristics = rd.variableCharacteristics || {};
      const attrs = Array.isArray(rd.variableAttribute) ? rd.variableAttribute : [];
      for (const attribute of attrs) {
        if (String(attribute && attribute.type || 'Actual').toLowerCase() !== 'actual') continue;
        const parsed = parseDeviceModelValue(attribute && attribute.value, characteristics.dataType || 'decimal');
        if (typeof parsed.val !== 'number' || !Number.isFinite(parsed.val)) continue;
        const socId = await this.ensureMeasurement(identity, 'socPercent', '%', {
          name: { en: 'Vehicle state of charge', de: 'Fahrzeug-Ladezustand' },
          role: 'value.battery',
        });
        await this._setStateFreshAsync(socId, parsed.val, true, 'soc');
        await this._noteSoc(identity, new Date().toISOString());
      }
    }
  }

  async ensureAliases(identity) {
    if (this._aliasDone.has(identity)) return;
    const roots = [{
      root: `alias.0.nexowatt.ocpp.${this.instance}.${identity}`,
      parents: [
        ['alias.0.nexowatt', 'NexoWatt'],
        ['alias.0.nexowatt.ocpp', 'NexoWatt OCPP'],
        [`alias.0.nexowatt.ocpp.${this.instance}`, `NexoWatt OCPP instance ${this.instance}`],
      ],
    }];
    if (this.config.createTechnicalAliases === true) {
      roots.push({
        root: `alias.0.ocpp21.${this.instance}.${identity}`,
        parents: [
          ['alias.0.ocpp21', 'NexoWatt OCPP technical compatibility'],
          [`alias.0.ocpp21.${this.instance}`, `NexoWatt OCPP instance ${this.instance}`],
        ],
      });
    }

    const connector1 = this._connectorBase(identity, 1, 1);
    const aliases = [
      ['connected', `${identity}.info.connection`, 'boolean', 'indicator.connected', false],
      ['socketConnected', `${identity}.info.socketConnected`, 'boolean', 'indicator.connected', false],
      ['activityFresh', `${identity}.health.activityFresh`, 'boolean', 'indicator.connected', false],
      ['heartbeatAlive', `${identity}.health.heartbeatAlive`, 'boolean', 'indicator.connected', false],
      ['dataFresh', `${identity}.health.dataFresh`, 'boolean', 'indicator', false],
      ['powerFresh', `${identity}.health.powerFresh`, 'boolean', 'indicator', false],
      ['socFresh', `${identity}.health.socFresh`, 'boolean', 'indicator', false],
      ['status', `${identity}.info.status`, 'string', 'indicator.status', false],
      ['protocol', `${identity}.info.protocol`, 'string', 'text', false],
      ['rfid', `${identity}.info.rfid`, 'string', 'text', false],
      ['powerW', `${identity}.measurements.powerW`, 'number', 'value.power', false],
      ['powerExportW', `${identity}.measurements.powerExportW`, 'number', 'value.power', false],
      ['currentTotalA', `${identity}.measurements.currentA`, 'number', 'value.current', false],
      ['energyWh', `${identity}.measurements.energyWh`, 'number', 'value.energy', false],
      ['energyKWh', `${identity}.measurements.energyKWh`, 'number', 'value.energy', false],
      ['soc', `${identity}.measurements.socPercent`, 'number', 'value.battery', false],
      ['voltageL1', `${identity}.measurements.voltageVL1`, 'number', 'value.voltage', false],
      ['voltageL2', `${identity}.measurements.voltageVL2`, 'number', 'value.voltage', false],
      ['voltageL3', `${identity}.measurements.voltageVL3`, 'number', 'value.voltage', false],
      ['currentL1', `${identity}.measurements.currentAL1`, 'number', 'value.current', false],
      ['currentL2', `${identity}.measurements.currentAL2`, 'number', 'value.current', false],
      ['currentL3', `${identity}.measurements.currentAL3`, 'number', 'value.current', false],
      ['powerL1', `${identity}.measurements.powerWL1`, 'number', 'value.power', false],
      ['powerL2', `${identity}.measurements.powerWL2`, 'number', 'value.power', false],
      ['powerL3', `${identity}.measurements.powerWL3`, 'number', 'value.power', false],
      ['frequencyHz', `${identity}.measurements.frequencyHz`, 'number', 'value.frequency', false],
      ['txActive', `${identity}.transactions.transactionActive`, 'boolean', 'indicator.working', false],
      ['chargingState', `${identity}.transactions.chargingState`, 'string', 'indicator.status', false],
      ['txId', `${identity}.transactions.lastId`, 'string', 'text', false],
      ['txEnergyKWh', `${identity}.transactions.lastTransactionConsumption_kWh`, 'number', 'value.energy', false],
      ['chargeLimit', `${identity}.control.chargeLimit`, 'number', 'value.power', true],
      ['numberPhases', `${identity}.control.numberOfPhases`, 'number', 'value', true],
      ['availability', `${identity}.control.availability`, 'boolean', 'switch.power', true],
    ];
    if (this.config.connectorDetails === true) {
      aliases.push(
        ['connector1Status', `${connector1}.status`, 'string', 'indicator.status', false],
        ['connector1EnergyKWh', `${connector1}.energyKWh`, 'number', 'value.energy', false],
      );
    }

    try {
      for (const definition of roots) {
        for (const [parent, name] of definition.parents) {
          await this.setForeignObjectNotExistsAsync(parent, { type: 'channel', common: { name }, native: {} });
        }
        await this.setForeignObjectNotExistsAsync(definition.root, {
          type: 'channel',
          common: { name: this._stateToRawIdentity.get(identity) || identity },
          native: {},
        });
        for (const [name, target, type, role, write] of aliases) {
          const aliasId = `${definition.root}.${name}`;
          const object = {
            type: 'state',
            common: { name, type, role, read: true, write: !!write, alias: { id: `${this.namespace}.${target}` } },
            native: {},
          };
          await this.setForeignObjectNotExistsAsync(aliasId, object);
          // Existing aliases from 0.3.x pointed to the old deep tree. Update
          // them in place so EOS mappings continue to work after migration.
          if (typeof this.extendForeignObjectAsync === 'function') await this.extendForeignObjectAsync(aliasId, object);
        }
        if (this.config.connectorDetails !== true && typeof this.delForeignObjectAsync === 'function') {
          for (const staleName of ['connector1Status', 'connector1EnergyKWh']) {
            try { await this.delForeignObjectAsync(`${definition.root}.${staleName}`); } catch (error) { /* already absent */ }
          }
        }
      }
      this._aliasDone.add(identity);
    } catch (error) {
      this.log.debug(`Alias creation will be retried (${identity}): ${error}`);
    }
  }

  _connectorBase(identity, evseId = 1, connectorId = 1) {
    const evse = Math.max(0, Math.trunc(Number(evseId) || 0));
    const connector = Math.max(0, Math.trunc(Number(connectorId) || 0));
    return `${identity}.connectors.${evse}_${connector}`;
  }

  async ensureMeasurement(identity, key, unit, options = {}) {
    const cleanKey = sanitizeFlatKey(key);
    await this._setObjectNotExistsCached(`${identity}.measurements`, {
      type: 'channel',
      common: { name: { en: 'Measurements', de: 'Messwerte' } },
      native: {},
    });
    const id = `${identity}.measurements.${cleanKey}`;
    await this._setObjectNotExistsCached(id, {
      type: 'state',
      common: measurementCommon(cleanKey, unit, options),
      native: {},
    });
    return id;
  }

  async ensureTextMeasurement(identity, key, name, role = 'text') {
    const cleanKey = sanitizeFlatKey(key);
    await this._setObjectNotExistsCached(`${identity}.measurements`, {
      type: 'channel',
      common: { name: { en: 'Measurements', de: 'Messwerte' } },
      native: {},
    });
    const id = `${identity}.measurements.${cleanKey}`;
    await this._setObjectNotExistsCached(id, {
      type: 'state',
      common: { name: name || cleanKey, type: 'string', role, read: true, write: false, def: '' },
      native: {},
    });
    return id;
  }

  async ensureConnectorStructure(identity, evseId = 1, connectorId = 1) {
    if (this.config.connectorDetails !== true) return undefined;
    const evse = Math.max(0, Math.trunc(Number(evseId) || 0));
    const connector = Math.max(0, Math.trunc(Number(connectorId) || 0));
    const connectorKey = `${identity}|${evse}|${connector}`;
    const base = this._connectorBase(identity, evse, connector);
    if (this._connectorStructureReady.has(connectorKey)) return base;

    await this._setObjectNotExistsCached(`${identity}.connectors`, {
      type: 'channel',
      common: { name: { en: 'Connectors', de: 'Ladeanschlüsse' } },
      native: {},
    });
    await this._setObjectNotExistsCached(base, {
      type: 'channel',
      common: { name: { en: `EVSE ${evse}, connector ${connector}`, de: `EVSE ${evse}, Anschluss ${connector}` } },
      native: { evseId: evse, connectorId: connector },
    });

    const states = {
      status: { name: { en: 'Connector status', de: 'Anschlussstatus' }, type: 'string', role: 'indicator.status', def: '' },
      errorCode: { name: { en: 'Error code', de: 'Fehlercode' }, type: 'string', role: 'text', def: '' },
      info: { name: { en: 'Status information', de: 'Statusinformation' }, type: 'string', role: 'text', def: '' },
      vendorErrorCode: { name: { en: 'Vendor error code', de: 'Hersteller-Fehlercode' }, type: 'string', role: 'text', def: '' },
      vendorId: { name: { en: 'Vendor identifier', de: 'Herstellerkennung' }, type: 'string', role: 'text', def: '' },
      lastUpdate: { name: { en: 'Last connector update', de: 'Letzte Anschlussaktualisierung' }, type: 'string', role: 'value.time', def: '' },
      energyWh: { name: { en: 'Charged energy total', de: 'Geladene Energie gesamt' }, type: 'number', role: 'value.energy', unit: 'Wh', def: 0 },
      energyKWh: { name: { en: 'Charged energy total', de: 'Geladene Energie gesamt' }, type: 'number', role: 'value.energy', unit: 'kWh', def: 0 },
    };
    for (const [key, common] of Object.entries(states)) {
      await this._setObjectNotExistsCached(`${base}.${key}`, {
        type: 'state',
        common: { ...common, read: true, write: false },
        native: {},
      });
    }
    this._connectorStructureReady.add(connectorKey);
    return base;
  }

  async _cleanupDisabledConnectorDetails(identity) {
    if (this.config.connectorDetails === true || this._connectorCleanupDone.has(identity)) return;
    if (typeof this.delObjectAsync === 'function') {
      try {
        const branchId = `${identity}.connectors`;
        const exists = typeof this.getObjectAsync === 'function' ? await this.getObjectAsync(branchId) : true;
        if (exists) {
          await this.delObjectAsync(branchId, { recursive: true });
          this.log.info(`Optional connector detail branch removed for ${identity}; station-level measurements remain available.`);
        }
      } catch (error) {
        this.log.debug(`Connector detail cleanup skipped (${identity}): ${error && error.message || error}`);
      }
    }
    for (const key of [...this._connectorStructureReady]) if (key.startsWith(`${identity}|`)) this._connectorStructureReady.delete(key);
    this._connectorCleanupDone.add(identity);
  }

  async _cleanupLegacySubfolders(identity) {
    if (this.config.cleanupLegacyObjects === false || this._legacySubfolderCleanupDone.has(identity)) return;
    if (typeof this.delObjectAsync !== 'function') {
      this._legacySubfolderCleanupDone.add(identity);
      return;
    }

    const candidates = [
      { id: `${identity}.control.hardReset`, keepState: true },
      { id: `${identity}.control.softReset`, keepState: true },
      { id: `${identity}.control.rpc`, keepState: false },
      { id: `${identity}.control.requestStartTransaction`, keepState: false },
      { id: `${identity}.control.requestStopTransaction`, keepState: false },
      { id: `${identity}.transactions.last`, keepState: false },
    ];

    for (const candidate of candidates) {
      try {
        let object;
        if (typeof this.getObjectAsync === 'function') object = await this.getObjectAsync(candidate.id);
        else if (typeof this.getForeignObjectAsync === 'function') object = await this.getForeignObjectAsync(`${this.namespace}.${candidate.id}`);
        if (!object) continue;
        if (candidate.keepState && object.type === 'state') continue;
        await this.delObjectAsync(candidate.id, { recursive: true });
        this.log.info(`Removed obsolete OCPP subfolder ${candidate.id}.`);
      } catch (error) {
        this.log.debug(`Legacy OCPP subfolder cleanup skipped (${candidate.id}): ${error && error.message || error}`);
      }
    }
    this._legacySubfolderCleanupDone.add(identity);
  }

  async _cleanupKnownMeasurementAliases(identity) {
    if (this.config.cleanupLegacyObjects === false || this._measurementAliasCleanupDone.has(identity)) return;
    if (typeof this.delObjectAsync !== 'function') {
      this._measurementAliasCleanupDone.add(identity);
      return;
    }

    // Early compact-tree candidates could expose manufacturer spellings as
    // separate states. They are now normalised into measurements.powerW. Remove
    // only the known duplicates/typo so the compact folder does not keep an
    // obsolete "ActivePowerInport" datapoint after an update.
    const obsoleteKeys = [
      'ActivePowerInport',
      'activePowerInport',
      'activepowerinport',
      'extra_ActivePowerInport',
      'extra_activePowerInport',
      'extra_activepowerinport',
      'Power_Active_Inport',
      'extra_Power_Active_Inport',
    ];
    for (const key of obsoleteKeys) {
      const stateId = `${identity}.measurements.${key}`;
      try {
        let object;
        if (typeof this.getObjectAsync === 'function') object = await this.getObjectAsync(stateId);
        else if (typeof this.getForeignObjectAsync === 'function') object = await this.getForeignObjectAsync(`${this.namespace}.${stateId}`);
        if (!object) continue;
        await this.delObjectAsync(stateId, { recursive: true });
        this._dpObjCache.delete(stateId);
        this.log.info(`Removed obsolete OCPP measurement alias ${stateId}; use ${identity}.measurements.powerW.`);
      } catch (error) {
        this.log.debug(`Obsolete OCPP measurement cleanup skipped (${stateId}): ${error && error.message || error}`);
      }
    }
    this._measurementAliasCleanupDone.add(identity);
  }

  async _cleanupLegacyObjects(identity) {
    if (this.config.cleanupLegacyObjects === false || this._legacyCleanupDone.has(identity)) return;
    const legacyBranches = [
      `${identity}.main`,
      `${identity}.meterValues`,
      `${identity}.evse`,
      `${identity}.evChargingNeeds`,
      `${identity}.ocpp`,
      `${identity}.dm`,
    ];
    let removed = 0;
    for (const branch of legacyBranches) {
      try {
        if (typeof this.delObjectAsync === 'function') {
          await this.delObjectAsync(branch, { recursive: true });
          removed++;
        }
      } catch (error) {
        // The branch usually does not exist on a new installation.
        this.log.debug(`Legacy OCPP branch cleanup skipped (${branch}): ${error && error.message || error}`);
      }
    }
    if (this.config.createTechnicalAliases !== true && typeof this.delForeignObjectAsync === 'function') {
      try {
        await this.delForeignObjectAsync(`alias.0.ocpp21.${this.instance}.${identity}`, { recursive: true });
      } catch (error) {
        this.log.debug(`Technical alias cleanup skipped (${identity}): ${error && error.message || error}`);
      }
    }
    this._legacyCleanupDone.add(identity);
    if (removed > 0) this.log.info(`Compact OCPP datapoint structure activated for ${identity}; obsolete technical branches were removed.`);
  }

  async ensureStructure(identity, evseId = 1, connectorId = 1) {
    const rawIdentity = this._stateToRawIdentity.get(identity) || identity;
    const state = async (id, common, native = {}) => this._setObjectNotExistsCached(id, { type: 'state', common, native });
    const channel = async (id, name, type = 'channel') => this._setObjectNotExistsCached(id, { type, common: { name }, native: {} });

    if (!this._identityStructureReady.has(identity)) {
      await channel(identity, rawIdentity, 'device');
      await channel(`${identity}.info`, { en: 'Information', de: 'Informationen' });
      await channel(`${identity}.health`, { en: 'Connection and data health', de: 'Verbindungs- und Datenstatus' });
      await channel(`${identity}.measurements`, { en: 'Measurements', de: 'Messwerte' });
      if (this.config.connectorDetails === true) await channel(`${identity}.connectors`, { en: 'Connectors', de: 'Ladeanschlüsse' });
      await channel(`${identity}.vehicle`, { en: 'Vehicle charging needs', de: 'Fahrzeug und Ladebedarf' });
      await channel(`${identity}.transactions`, { en: 'Transactions', de: 'Ladevorgänge' });
      await channel(`${identity}.control`, { en: 'Control', de: 'Steuerung' });
      await this._cleanupLegacySubfolders(identity);
      await this._cleanupKnownMeasurementAliases(identity);

      const info = {
        identity: ['string', 'text', ''],
        stateIdentity: ['string', 'text', ''],
        connection: ['boolean', 'indicator.connected', false],
        socketConnected: ['boolean', 'indicator.connected', false],
        status: ['string', 'indicator.status', ''],
        errorCode: ['string', 'text', ''],
        statusInfo: ['string', 'text', ''],
        vendorErrorCode: ['string', 'text', ''],
        vendorId: ['string', 'text', ''],
        protocol: ['string', 'text', ''],
        vendor: ['string', 'text', ''],
        model: ['string', 'text', ''],
        firmware: ['string', 'text', ''],
        serialNumber: ['string', 'text', ''],
        vin: ['string', 'text', ''],
        rfid: ['string', 'text', ''],
        rfidType: ['string', 'text', ''],
        chargePointSerialNumber: ['string', 'text', ''],
        chargeBoxSerialNumber: ['string', 'text', ''],
        iccid: ['string', 'text', ''],
        imsi: ['string', 'text', ''],
        meterType: ['string', 'text', ''],
        meterSerialNumber: ['string', 'text', ''],
        heartbeatInterval: ['number', 'value.interval', 0, 's'],
        lastHeartbeat: ['string', 'value.time', ''],
        firmwareStatus: ['string', 'text', ''],
        diagnosticsStatus: ['string', 'text', ''],
        logStatus: ['string', 'text', ''],
      };
      for (const [key, [type, role, def, unit]] of Object.entries(info)) {
        await state(`${identity}.info.${key}`, { name: key, type, role, read: true, write: false, def, unit });
      }

      const health = {
        online: ['boolean', 'indicator.connected', false],
        activityFresh: ['boolean', 'indicator.connected', false],
        socketConnected: ['boolean', 'indicator.connected', false],
        heartbeatAlive: ['boolean', 'indicator.connected', false],
        meterFresh: ['boolean', 'indicator', false],
        powerFresh: ['boolean', 'indicator', false],
        exportPowerFresh: ['boolean', 'indicator', false],
        currentFresh: ['boolean', 'indicator', false],
        dataFresh: ['boolean', 'indicator', false],
        socFresh: ['boolean', 'indicator', false],
        staleReason: ['string', 'text', ''],
        heartbeat: ['string', 'value.time', ''],
        lastHeartbeatMs: ['number', 'value.time', 0],
        lastSeen: ['string', 'value.time', ''],
        lastSeenMs: ['number', 'value.time', 0],
        lastAction: ['string', 'text', ''],
        lastBoot: ['string', 'value.time', ''],
        lastMeterValue: ['string', 'value.time', ''],
        lastPowerValue: ['string', 'value.time', ''],
        lastExportPowerValue: ['string', 'value.time', ''],
        lastCurrentValue: ['string', 'value.time', ''],
        lastSoc: ['string', 'value.time', ''],
        messageAgeSec: ['number', 'value.interval', -1, 's'],
        activityAgeSec: ['number', 'value.interval', -1, 's'],
        activityTimeoutSec: ['number', 'value.interval', 90, 's'],
        heartbeatTimeoutSec: ['number', 'value.interval', 0, 's'],
        heartbeatAgeSec: ['number', 'value.interval', -1, 's'],
        meterAgeSec: ['number', 'value.interval', -1, 's'],
        powerAgeSec: ['number', 'value.interval', -1, 's'],
        exportPowerAgeSec: ['number', 'value.interval', -1, 's'],
        currentAgeSec: ['number', 'value.interval', -1, 's'],
        statusAgeSec: ['number', 'value.interval', -1, 's'],
        socAgeSec: ['number', 'value.interval', -1, 's'],
        refreshStatus: ['string', 'text', 'not-run'],
        refreshSupport: ['string', 'json', '{}'],
        refreshLastAttempt: ['string', 'value.time', ''],
        refreshLastSuccess: ['string', 'value.time', ''],
        refreshLastError: ['string', 'text', ''],
        refreshSuppressedUntil: ['string', 'value.time', ''],
        refreshSuppressedReason: ['string', 'text', ''],
        refreshRelatedDisconnects: ['number', 'value', 0],
        lastRepublish: ['string', 'value.time', ''],
        safeZeroApplied: ['boolean', 'indicator', false],
        safeZeroReason: ['string', 'text', ''],
        lastDisconnectAt: ['string', 'value.time', ''],
        lastDisconnectCode: ['number', 'value', 0],
        lastDisconnectReason: ['string', 'text', ''],
        reconnectCount: ['number', 'value', 0],
        disconnectCount: ['number', 'value', 0],
        queueDepth: ['number', 'value', 0],
        queueMaxDepth: ['number', 'value', 0],
        queueDropped: ['number', 'value', 0],
        queueErrors: ['number', 'value', 0],
        queueLastError: ['string', 'text', ''],
        outboundCallCount: ['number', 'value', 0],
        outboundErrorCount: ['number', 'value', 0],
        lastOutboundMethod: ['string', 'text', ''],
        lastOutboundAt: ['string', 'value.time', ''],
        lastTransactionStopReason: ['string', 'text', ''],
      };
      for (const [key, [type, role, def, unit]] of Object.entries(health)) {
        await state(`${identity}.health.${key}`, { name: key, type, role, read: true, write: false, def, unit });
      }

      const vehicle = {
        evseId: ['number', 'value', 0],
        lastUpdate: ['string', 'value.time', ''],
        energyTransferMode: ['string', 'text', ''],
        departureTime: ['string', 'value.time', ''],
        socPercent: ['number', 'value.battery', 0, '%'],
        targetSocPercent: ['number', 'value.battery', 0, '%'],
        fullSocPercent: ['number', 'value.battery', 0, '%'],
        bulkSocPercent: ['number', 'value.battery', 0, '%'],
        energyRequestWh: ['number', 'value.energy', 0, 'Wh'],
        batteryCapacityWh: ['number', 'value.energy', 0, 'Wh'],
        maxPowerW: ['number', 'value.power', 0, 'W'],
        maxCurrentA: ['number', 'value.current', 0, 'A'],
        maxVoltageV: ['number', 'value.voltage', 0, 'V'],
        maxScheduleTuples: ['number', 'value', 0],
      };
      for (const [key, [type, role, def, unit]] of Object.entries(vehicle)) {
        await state(`${identity}.vehicle.${key}`, { name: key, type, role, read: true, write: false, def, unit });
      }

      const measurementSeeds = [
        ['Power.Active.Import', ''], ['Power.Active.Export', ''], ['Power.Offered', ''],
        ['Current.Import', ''], ['Current.Export', ''],
        ['Energy.Active.Import.Register', ''], ['Energy.Active.Export.Register', ''],
        ['SoC', ''], ['Voltage', ''], ['Frequency', ''], ['Temperature', ''],
        ['Power.Active.Import', 'L1'], ['Power.Active.Import', 'L2'], ['Power.Active.Import', 'L3'],
        ['Current.Import', 'L1'], ['Current.Import', 'L2'], ['Current.Import', 'L3'],
        ['Voltage', 'L1'], ['Voltage', 'L2'], ['Voltage', 'L3'],
      ];
      for (const [measurand, phase] of measurementSeeds) {
        const definition = measurementDefinition(measurand, phase);
        await this.ensureMeasurement(identity, definition.key, definition.unit, definition);
        if (definition.kwhKey) {
          await this.ensureMeasurement(identity, definition.kwhKey, 'kWh', {
            ...definition,
            key: definition.kwhKey,
            kwhKey: undefined,
            unit: 'kWh',
          });
        }
      }
      await this.ensureTextMeasurement(identity, 'lastUpdate', { en: 'Last measurement update', de: 'Letzte Messwertaktualisierung' }, 'value.time');

      const controls = {
        availability: { name: { en: 'Charging station available', de: 'Ladestation verfügbar' }, type: 'boolean', role: 'switch.power', write: true, def: true },
        hardReset: { name: { en: 'Hard reset', de: 'Harter Neustart' }, type: 'boolean', role: 'button', write: true, def: false },
        softReset: { name: { en: 'Soft reset', de: 'Sanfter Neustart' }, type: 'boolean', role: 'button', write: true, def: false },
        chargeLimit: { name: { en: 'Requested charging limit', de: 'Angeforderte Ladegrenze' }, type: 'number', role: 'value.power', write: true, def: 0, unit: 'W', min: 0 },
        chargeLimitType: { name: { en: 'Charging limit unit', de: 'Einheit der Ladegrenze' }, type: 'string', role: 'text', write: true, def: 'W', states: { W: 'W', A: 'A' } },
        numberOfPhases: { name: { en: 'Number of phases', de: 'Anzahl Phasen' }, type: 'number', role: 'value', write: true, def: 3, min: 1, max: 3 },
        requestedChargeLimit: { name: { en: 'Last requested charging limit', de: 'Zuletzt angeforderte Ladegrenze' }, type: 'number', role: 'value', write: false, def: 0 },
        appliedChargeLimit: { name: { en: 'Applied charging limit', de: 'Angewendete Ladegrenze' }, type: 'number', role: 'value', write: false, def: 0 },
        chargeLimitReason: { name: { en: 'Charging limit decision', de: 'Entscheidung zur Ladegrenze' }, type: 'string', role: 'text', write: false, def: '' },
        chargeLimitClamped: { name: { en: 'Charging limit was clamped', de: 'Ladegrenze wurde angehoben' }, type: 'boolean', role: 'indicator', write: false, def: false },
        lastCommand: { name: { en: 'Last OCPP command', de: 'Letzter OCPP-Befehl' }, type: 'string', role: 'text', write: false, def: '' },
        lastCommandAt: { name: { en: 'Last command timestamp', de: 'Zeit des letzten Befehls' }, type: 'string', role: 'value.time', write: false, def: '' },
        lastResponse: { name: { en: 'Last command response', de: 'Letzte Befehlsantwort' }, type: 'string', role: 'json', write: false, def: '' },
        lastError: { name: { en: 'Last command error', de: 'Letzter Befehlsfehler' }, type: 'string', role: 'text', write: false, def: '' },
        lastSuccess: { name: { en: 'Last command successful', de: 'Letzter Befehl erfolgreich' }, type: 'boolean', role: 'indicator', write: false, def: false },
        rpcMethod: { name: 'OCPP method/action', type: 'string', role: 'text', write: true, def: '' },
        rpcPayload: { name: 'OCPP payload (JSON)', type: 'string', role: 'json', write: true, def: '' },
        rpcExecute: { name: 'Execute generic OCPP call', type: 'boolean', role: 'button', write: true, def: false },
        rpcLastResponse: { name: 'Generic OCPP response', type: 'string', role: 'json', write: false, def: '' },
        rpcLastError: { name: 'Generic OCPP error', type: 'string', role: 'text', write: false, def: '' },
        startIdToken: { name: 'Start idToken / idTag', type: 'string', role: 'text', write: true, def: '' },
        startIdTokenType: { name: 'Start idToken type (2.x)', type: 'string', role: 'text', write: true, def: 'Central' },
        startEvseId: { name: 'Start EVSE / connector ID', type: 'number', role: 'value', write: true, def: 1, min: 0 },
        startRemoteStartId: { name: 'Start remoteStartId (2.x)', type: 'number', role: 'value', write: true, def: 1, min: 1 },
        startChargingProfile: { name: 'Optional start chargingProfile JSON', type: 'string', role: 'json', write: true, def: '' },
        startTrigger: { name: 'Start transaction', type: 'boolean', role: 'button', write: true, def: false },
        startLastResponse: { name: 'Start response', type: 'string', role: 'json', write: false, def: '' },
        startLastError: { name: 'Start error', type: 'string', role: 'text', write: false, def: '' },
        stopTransactionId: { name: 'Stop transactionId (empty = last)', type: 'string', role: 'text', write: true, def: '' },
        stopTrigger: { name: 'Stop transaction', type: 'boolean', role: 'button', write: true, def: false },
        stopLastResponse: { name: 'Stop response', type: 'string', role: 'json', write: false, def: '' },
        stopLastError: { name: 'Stop error', type: 'string', role: 'text', write: false, def: '' },
      };
      for (const [key, common] of Object.entries(controls)) {
        await state(`${identity}.control.${key}`, { ...common, read: true, write: !!common.write });
      }

      const txStates = {
        idTag: ['string', 'text', ''],
        idTagType: ['string', 'text', ''],
        transactionActive: ['boolean', 'indicator.working', false],
        chargingState: ['string', 'indicator.status', ''],
        triggerReason: ['string', 'text', ''],
        seqNo: ['number', 'value', 0],
        transactionStartMeter: ['number', 'value.energy', 0, 'Wh'],
        transactionStartMeter_kWh: ['number', 'value.energy', 0, 'kWh'],
        transactionEndMeter: ['number', 'value.energy', 0, 'Wh'],
        transactionEndMeter_kWh: ['number', 'value.energy', 0, 'kWh'],
        lastTransactionConsumption: ['number', 'value.energy', 0, 'Wh'],
        lastTransactionConsumption_kWh: ['number', 'value.energy', 0, 'kWh'],
        numberPhases: ['number', 'value', 0],
        lastType: ['string', 'text', ''],
        lastId: ['string', 'text', ''],
        lastEvseId: ['number', 'value', 0],
        lastConnectorId: ['number', 'value', 0],
        lastIdTag: ['string', 'text', ''],
        lastMeterStartWh: ['number', 'value.energy', 0, 'Wh'],
        lastMeterStartKWh: ['number', 'value.energy', 0, 'kWh'],
        lastMeterStopWh: ['number', 'value.energy', 0, 'Wh'],
        lastMeterStopKWh: ['number', 'value.energy', 0, 'kWh'],
        lastReason: ['string', 'text', ''],
        lastTimestamp: ['string', 'value.time', ''],
      };
      for (const [key, [type, role, def, unit]] of Object.entries(txStates)) {
        await state(`${identity}.transactions.${key}`, { name: key, type, role, read: true, write: false, def, unit });
      }

      this._identityStructureReady.add(identity);
      await this._cleanupLegacyObjects(identity);
    }

    if (this.config.connectorDetails === true) await this.ensureConnectorStructure(identity, evseId, connectorId);
    else await this._cleanupDisabledConnectorDetails(identity);
    if (!this._aliasDone.has(identity)) await this.ensureAliases(identity);
  }

  async ensureMetric(identity, evseId, connectorId, key, unit, meta = {}) {
    if (this.config.connectorDetails !== true) return undefined;
    await this.ensureStructure(identity, evseId, connectorId);
    const base = this._connectorBase(identity, evseId, connectorId);
    const definition = meta && meta.definition;
    const compactKey = definition && !definition.extra
      ? sanitizeFlatKey(definition.key)
      : `extra_${sanitizeFlatKey(key)}`;
    const id = `${base}.${compactKey}`;
    const options = definition || {};
    await this._setObjectNotExistsCached(id, {
      type: 'state',
      common: measurementCommon(compactKey, unit, options),
      native: {
        measurand: meta && meta.measurand,
        phase: meta && meta.phase,
      },
    });
    return id;
  }

  async ensureAgg(identity, key, unit) {
    const compactKey = compactKeyFromLegacyAggregate(key);
    return this.ensureMeasurement(identity, compactKey, unit);
  }

  async _setDisconnectedHealth(identity, reason) {
    await this.ensureStructure(identity);
    const writes = {
      [`${identity}.info.connection`]: false,
      [`${identity}.info.socketConnected`]: false,
      [`${identity}.health.online`]: false,
      [`${identity}.health.activityFresh`]: false,
      [`${identity}.health.socketConnected`]: false,
      [`${identity}.health.heartbeatAlive`]: false,
      [`${identity}.health.meterFresh`]: false,
      [`${identity}.health.powerFresh`]: false,
      [`${identity}.health.exportPowerFresh`]: false,
      [`${identity}.health.currentFresh`]: false,
      [`${identity}.health.socFresh`]: false,
      [`${identity}.health.dataFresh`]: false,
      [`${identity}.health.safeZeroApplied`]: false,
      [`${identity}.health.safeZeroReason`]: '',
      [`${identity}.health.messageAgeSec`]: -1,
      [`${identity}.health.activityAgeSec`]: -1,
      [`${identity}.health.heartbeatAgeSec`]: -1,
      [`${identity}.health.meterAgeSec`]: -1,
      [`${identity}.health.powerAgeSec`]: -1,
      [`${identity}.health.exportPowerAgeSec`]: -1,
      [`${identity}.health.currentAgeSec`]: -1,
      [`${identity}.health.statusAgeSec`]: -1,
      [`${identity}.health.socAgeSec`]: -1,
      [`${identity}.health.refreshStatus`]: 'offline',
      [`${identity}.health.staleReason`]: String(reason || 'socket-disconnected'),
    };
    for (const [id, value] of Object.entries(writes)) {
      await this._setStateFreshAsync(id, value, true, id.includes('.health.') ? 'health' : 'status');
    }
  }

  async _resetPersistedHealth() {
    const identities = new Set();
    const queries = [];
    if (typeof this.getStatesAsync === 'function') {
      queries.push(['getStatesAsync', '*.health.online'], ['getStatesAsync', '*.info.connection']);
    }
    if (typeof this.getForeignStatesAsync === 'function') {
      queries.push(
        ['getForeignStatesAsync', `${this.namespace}.*.health.online`],
        ['getForeignStatesAsync', `${this.namespace}.*.info.connection`],
      );
    }
    for (const [method, pattern] of queries) {
      try {
        const states = await this[method](pattern);
        for (const id of Object.keys(states || {})) {
          const rel = this._stripNs(id);
          const suffix = rel.endsWith('.health.online') ? '.health.online' : rel.endsWith('.info.connection') ? '.info.connection' : '';
          if (suffix) identities.add(rel.slice(0, -suffix.length));
        }
      } catch (e) {
        this.log.debug(`Could not inspect persisted OCPP health states (${pattern}): ${e && e.message || e}`);
      }
    }
    for (const identity of identities) {
      if (!identity) continue;
      try {
        await this._setDisconnectedHealth(identity, 'adapter-restarted-awaiting-station');
      } catch (e) {
        this.log.warn(`Could not reset persisted health for ${identity}: ${e && e.message || e}`);
      }
    }
  }

  async onReady() {
    // Never leave persisted online/fresh flags true after an unclean restart.
    await this._resetPersistedHealth();

    const allowlist = Array.isArray(this.config.identityAllowlist)
      ? this.config.identityAllowlist.map(String).map((v) => v.trim()).filter(Boolean)
      : String(this.config.identityAllowlist || '').split(',').map((v) => v.trim()).filter(Boolean);

    const ctx = {
      log: this.log,
      config: {
        ...this.config,
        port: Math.max(1, Math.min(65535, Number(this.config.port) || 9220)),
        enable16: this.config.enable16 !== false,
        enable201: this.config.enable201 !== false,
        enable21: this.config.enable21 !== false,
        heartbeatIntervalSec: Math.max(10, Number(this.config.heartbeatIntervalSec) || 300),
        identityAllowlist: allowlist,
        callTimeoutSec: Math.max(5, Number(this.config.callTimeoutSec) || 20),
      },
      states: {
        setConnection: async (id, online, meta = {}) => {
          await this.ensureStructure(id);
          const entry = this.runtimeIndex.get(id);
          const socketConnected = meta.socketConnected !== undefined ? !!meta.socketConnected : !!online;
          if (entry) entry.socketConnected = socketConnected;
          await this._setStateFreshAsync(`${id}.info.connection`, socketConnected, true, 'status');
          await this._setStateFreshAsync(`${id}.info.socketConnected`, socketConnected, true, 'status');
          await this._setStateFreshAsync(`${id}.health.online`, !!online && socketConnected, true, 'health');
          await this._setStateFreshAsync(`${id}.health.activityFresh`, !!online && socketConnected, true, 'health');
          await this._setStateFreshAsync(`${id}.health.socketConnected`, socketConnected, true, 'health');
          if (!socketConnected) {
            await this._setDisconnectedHealth(id, 'socket-disconnected');
          } else {
            for (const key of ['heartbeatAlive', 'meterFresh', 'powerFresh', 'exportPowerFresh', 'currentFresh', 'dataFresh', 'socFresh', 'safeZeroApplied']) {
              await this._setStateFreshAsync(`${id}.health.${key}`, false, true, 'health');
            }
            await this._setStateFreshAsync(`${id}.health.safeZeroReason`, '', true, 'health');
            await this._setStateFreshAsync(`${id}.health.staleReason`, 'awaiting-power-or-idle-status', true, 'health');
          }
          if (meta.rawIdentity !== undefined) {
            await this._setStateFreshAsync(`${id}.info.identity`, String(meta.rawIdentity), true, 'static');
            await this._setStateFreshAsync(`${id}.info.stateIdentity`, id, true, 'static');
          }
          if (meta.protocol !== undefined) await this._setStateFreshAsync(`${id}.info.protocol`, String(meta.protocol), true, 'static');
        },
        upsertIdentityMeta: async (id, meta) => {
          await this.ensureStructure(id);
          const infoKeys = ['protocol', 'vendor', 'model', 'firmwareVersion', 'serialNumber', 'chargePointSerialNumber', 'chargeBoxSerialNumber', 'iccid', 'imsi', 'meterType', 'meterSerialNumber'];
          const map = { firmwareVersion: 'firmware' };
          for (const key of infoKeys) {
            if (meta[key] !== undefined && meta[key] !== null) {
              await this._setStateFreshAsync(`${id}.info.${map[key] || key}`, meta[key], true, 'static');
            }
          }
          const rawIdentity = this._stateToRawIdentity.get(id) || id;
          await this._setStateFreshAsync(`${id}.info.identity`, rawIdentity, true, 'static');
          await this._setStateFreshAsync(`${id}.info.stateIdentity`, id, true, 'static');
        },
        upsertEvseState: async (id, evseId, connectorId, patch) => {
          await this.ensureStructure(id, evseId, connectorId);
          const base = await this.ensureConnectorStructure(id, evseId, connectorId);
          if (patch.status !== undefined) await this._setStateFreshAsync(`${id}.info.status`, patch.status, true, 'status');
          if (patch.errorCode !== undefined) await this._setStateFreshAsync(`${id}.info.errorCode`, patch.errorCode, true, 'status');
          if (patch.info !== undefined) await this._setStateFreshAsync(`${id}.info.statusInfo`, patch.info, true, 'status');
          if (patch.vendorErrorCode !== undefined) await this._setStateFreshAsync(`${id}.info.vendorErrorCode`, patch.vendorErrorCode, true, 'status');
          if (patch.vendorId !== undefined) await this._setStateFreshAsync(`${id}.info.vendorId`, patch.vendorId, true, 'status');
          if (!base) return;
          if (patch.status !== undefined) await this._setStateFreshAsync(`${base}.status`, patch.status, true, 'status');
          if (patch.errorCode !== undefined) await this._setStateFreshAsync(`${base}.errorCode`, patch.errorCode, true, 'status');
          if (patch.timestamp !== undefined) await this._setStateFreshAsync(`${base}.lastUpdate`, patch.timestamp, true, 'status');
          if (patch.info !== undefined) await this._setStateFreshAsync(`${base}.info`, patch.info, true, 'status');
          if (patch.vendorErrorCode !== undefined) await this._setStateFreshAsync(`${base}.vendorErrorCode`, patch.vendorErrorCode, true, 'status');
          if (patch.vendorId !== undefined) await this._setStateFreshAsync(`${base}.vendorId`, patch.vendorId, true, 'status');
        },
        pushTransactionEvent: async (id, evt) => {
          await this.ensureStructure(id, evt.evseId || 1, evt.connectorId || 1);
          const base = `${id}.transactions`;
          if (evt.type !== undefined) await this._setStateFreshAsync(`${base}.lastType`, evt.type, true, 'transaction');
          if (evt.txId !== undefined) await this._setStateFreshAsync(`${base}.lastId`, String(evt.txId), true, 'transaction');
          if (evt.evseId !== undefined) await this._setStateFreshAsync(`${base}.lastEvseId`, Number(evt.evseId), true, 'transaction');
          if (evt.connectorId !== undefined) await this._setStateFreshAsync(`${base}.lastConnectorId`, Number(evt.connectorId), true, 'transaction');
          if (evt.idTag !== undefined) {
            await this._setStateFreshAsync(`${base}.lastIdTag`, evt.idTag, true, 'transaction');
            await this._setStateFreshAsync(`${id}.transactions.idTag`, evt.idTag, true, 'transaction');
            await this._setStateFreshAsync(`${id}.info.rfid`, evt.idTag, true, 'status');
          }
          if (evt.idTokenType !== undefined) {
            await this._setStateFreshAsync(`${id}.transactions.idTagType`, String(evt.idTokenType), true, 'transaction');
            await this._setStateFreshAsync(`${id}.info.rfidType`, String(evt.idTokenType), true, 'status');
          }
          if (evt.meterStart !== undefined && Number.isFinite(Number(evt.meterStart))) {
            const wh = Number(evt.meterStart);
            await this._setStateFreshAsync(`${base}.lastMeterStartWh`, wh, true, 'counter');
            await this._setStateFreshAsync(`${base}.lastMeterStartKWh`, wh / 1000, true, 'counter');
            await this._setStateFreshAsync(`${id}.transactions.transactionStartMeter`, wh, true, 'counter');
            await this._setStateFreshAsync(`${id}.transactions.transactionStartMeter_kWh`, wh / 1000, true, 'counter');
          }
          if (evt.meterStop !== undefined && Number.isFinite(Number(evt.meterStop))) {
            const whStop = Number(evt.meterStop);
            await this._setStateFreshAsync(`${base}.lastMeterStopWh`, whStop, true, 'counter');
            await this._setStateFreshAsync(`${base}.lastMeterStopKWh`, whStop / 1000, true, 'counter');
            await this._setStateFreshAsync(`${id}.transactions.transactionEndMeter`, whStop, true, 'counter');
            await this._setStateFreshAsync(`${id}.transactions.transactionEndMeter_kWh`, whStop / 1000, true, 'counter');
            const startWh = Number((await this.getStateAsync(`${id}.transactions.transactionStartMeter`))?.val);
            if (Number.isFinite(startWh)) {
              const consumptionWh = Math.max(0, whStop - startWh);
              await this._setStateFreshAsync(`${id}.transactions.lastTransactionConsumption`, consumptionWh, true, 'counter');
              await this._setStateFreshAsync(`${id}.transactions.lastTransactionConsumption_kWh`, consumptionWh / 1000, true, 'counter');
            }
          }
          if (evt.reason !== undefined) {
            await this._setStateFreshAsync(`${base}.lastReason`, evt.reason, true, 'transaction');
            if (evt.type === 'Stop') await this._setStateFreshAsync(`${id}.health.lastTransactionStopReason`, String(evt.reason || ''), true, 'health');
          }
          if (evt.ts !== undefined) await this._setStateFreshAsync(`${base}.lastTimestamp`, evt.ts, true, 'transaction');
          if (evt.chargingState !== undefined) await this._setStateFreshAsync(`${id}.transactions.chargingState`, String(evt.chargingState || ''), true, 'status');
          if (evt.triggerReason !== undefined) await this._setStateFreshAsync(`${id}.transactions.triggerReason`, String(evt.triggerReason || ''), true, 'transaction');
          if (evt.seqNo !== undefined && Number.isFinite(Number(evt.seqNo))) await this._setStateFreshAsync(`${id}.transactions.seqNo`, Number(evt.seqNo), true, 'transaction');
          if (evt.type === 'Start') await this._setStateFreshAsync(`${id}.transactions.transactionActive`, true, true, 'status');
          if (evt.type === 'Stop') await this._setStateFreshAsync(`${id}.transactions.transactionActive`, false, true, 'status');
          await this._noteTransaction(id, evt);
        },
        setRfid: async (id, token, tokenType) => {
          await this.ensureStructure(id);
          if (token !== undefined && token !== null && String(token).length) {
            await this._setStateFreshAsync(`${id}.info.rfid`, String(token), true, 'status');
            await this._setStateFreshAsync(`${id}.transactions.idTag`, String(token), true, 'transaction');
          }
          if (tokenType !== undefined && tokenType !== null && String(tokenType).length) {
            await this._setStateFreshAsync(`${id}.info.rfidType`, String(tokenType), true, 'status');
            await this._setStateFreshAsync(`${id}.transactions.idTagType`, String(tokenType), true, 'transaction');
          }
        },
        connectorBase: this._connectorBase.bind(this),
        ensureConnectorStructure: this.ensureConnectorStructure.bind(this),
        ensureMeasurementState: this.ensureMeasurement.bind(this),
        ensureTextMeasurementState: this.ensureTextMeasurement.bind(this),
        ensureMetricState: this.ensureMetric.bind(this),
        ensureAggState: this.ensureAgg.bind(this),
        ensureStructure: this.ensureStructure.bind(this),
      },
      runtime: {
        resolveIdentity: this.resolveStationIdentity.bind(this),
        indexClient: this._indexClient.bind(this),
        unindexClient: this._unindexClient.bind(this),
        noteDisconnect: this._noteDisconnect.bind(this),
        getClient: (id) => (this.runtimeIndex.get(id) || {}).client,
        noteMessage: this._noteMessage.bind(this),
        noteBoot: this._noteBoot.bind(this),
        noteHeartbeat: this._noteHeartbeat.bind(this),
        noteStatus: this._noteStatus.bind(this),
        noteMeterValue: this._noteMeterValue.bind(this),
        noteSoc: this._noteSoc.bind(this),
        recordPhaseMetric: this._recordPhaseMetric.bind(this),
        getPhaseMetricTotal: this._getPhaseMetricTotal.bind(this),
      },
      defer: this._deferStationTask.bind(this),
      dp: { capture: this.captureOcppPayload.bind(this) },
      dm: { ingestNotifyReport: this.ingestNotifyReport.bind(this) },
      setStateChangedAsync: this.setStateChangedAsync.bind(this),
      setStateFreshAsync: this._setStateFreshAsync.bind(this),
    };

    const protocols = []
      .concat(ctx.config.enable16 ? ['ocpp1.6'] : [])
      .concat(ctx.config.enable201 ? ['ocpp2.0.1'] : [])
      .concat(ctx.config.enable21 ? ['ocpp2.1'] : []);
    if (protocols.length === 0) throw new Error('At least one OCPP protocol must be enabled');

    this.server = new OcppRpcServer(ctx, { port: ctx.config.port, protocols, strictMode: false });
    await this.server.listen();
    this.subscribeStates('*');

    const healthCheckMs = Math.max(2, Number(this.config.healthCheckIntervalSec) || 5) * 1000;
    this._watchdogTimer = setInterval(() => this._watchdogCycle(), healthCheckMs);
    await this._watchdogCycle();
    this.log.info('NexoWatt OCPP adapter ready for NexoWatt EOS');
  }

  async onStateChange(id, state) {
    if (!state || state.ack || this._shuttingDown) return;
    const rel = this._stripNs(id);
    const match = (patterns) => {
      for (const pattern of Array.isArray(patterns) ? patterns : [patterns]) {
        const found = rel.match(pattern);
        if (found) return found;
      }
      return null;
    };

    const mHard = match([/^([^\.]+)\.control\.hardReset$/, /^([^\.]+)\.control\.hardReset\.trigger$/]);
    const mSoft = match([/^([^\.]+)\.control\.softReset$/, /^([^\.]+)\.control\.softReset\.trigger$/]);
    const mAvail = match(/^([^\.]+)\.control\.availability$/);
    const mLimit = match(/^([^\.]+)\.control\.chargeLimit$/);
    const mLimitType = match(/^([^\.]+)\.control\.chargeLimitType$/);
    const mPhases = match(/^([^\.]+)\.control\.numberOfPhases$/);
    const mRpcExec = match([/^([^\.]+)\.control\.rpcExecute$/, /^([^\.]+)\.control\.rpc\.execute$/]);
    const mRpcMethod = match([/^([^\.]+)\.control\.rpcMethod$/, /^([^\.]+)\.control\.rpc\.method$/]);
    const mRpcPayload = match([/^([^\.]+)\.control\.rpcPayload$/, /^([^\.]+)\.control\.rpc\.payload$/]);
    const mReqStartTrigger = match([/^([^\.]+)\.control\.startTrigger$/, /^([^\.]+)\.control\.requestStartTransaction\.trigger$/]);
    const mReqStartIdToken = match([/^([^\.]+)\.control\.startIdToken$/, /^([^\.]+)\.control\.requestStartTransaction\.idToken$/]);
    const mReqStartIdTokenType = match([/^([^\.]+)\.control\.startIdTokenType$/, /^([^\.]+)\.control\.requestStartTransaction\.idTokenType$/]);
    const mReqStartEvseId = match([/^([^\.]+)\.control\.startEvseId$/, /^([^\.]+)\.control\.requestStartTransaction\.evseId$/]);
    const mReqStartRemoteStartId = match([/^([^\.]+)\.control\.startRemoteStartId$/, /^([^\.]+)\.control\.requestStartTransaction\.remoteStartId$/]);
    const mReqStartProfile = match([/^([^\.]+)\.control\.startChargingProfile$/, /^([^\.]+)\.control\.requestStartTransaction\.chargingProfile$/]);
    const mReqStopTrigger = match([/^([^\.]+)\.control\.stopTrigger$/, /^([^\.]+)\.control\.requestStopTransaction\.trigger$/]);
    const mReqStopTxId = match([/^([^\.]+)\.control\.stopTransactionId$/, /^([^\.]+)\.control\.requestStopTransaction\.transactionId$/]);

    const matches = [mHard, mSoft, mAvail, mLimit, mLimitType, mPhases, mRpcExec, mRpcMethod, mRpcPayload,
      mReqStartTrigger, mReqStartIdToken, mReqStartIdTokenType, mReqStartEvseId, mReqStartRemoteStartId,
      mReqStartProfile, mReqStopTrigger, mReqStopTxId];
    const identityMatch = matches.find(Boolean);
    if (!identityMatch) return;
    const identity = identityMatch[1];

    const ack = async (value) => this._setStateFreshAsync(rel, value, true, 'control');
    const ackIfStillCurrent = async () => {
      const current = await this.getStateAsync(rel);
      if (!current || current.ack) return;
      const currentVal = current.val;
      const originalVal = state.val;
      const same = (typeof currentVal === 'number' || typeof originalVal === 'number')
        ? Number.isFinite(Number(currentVal)) && Number.isFinite(Number(originalVal)) && Number(currentVal) === Number(originalVal)
        : String(currentVal) === String(originalVal);
      if (same) await ack(currentVal);
    };
    const readControl = async (flatKey, legacyPath, fallback = undefined) => {
      const flat = await this.getStateAsync(`${identity}.control.${flatKey}`);
      if (flat && flat.val !== undefined && flat.val !== null && flat.val !== '') return flat.val;
      if (legacyPath) {
        const legacy = await this.getStateAsync(`${identity}.control.${legacyPath}`);
        if (legacy && legacy.val !== undefined && legacy.val !== null && legacy.val !== '') return legacy.val;
      }
      return fallback;
    };
    const setSpecificResult = async (section, response, error) => {
      if (!section) return;
      const keys = section === 'rpc'
        ? ['rpcLastResponse', 'rpcLastError']
        : section === 'start'
          ? ['startLastResponse', 'startLastError']
          : ['stopLastResponse', 'stopLastError'];
      const errorText = error ? String(error && error.message || error) : '';
      await this._setStateFreshAsync(`${identity}.control.${keys[0]}`, errorText ? '' : this._stringifyControlValue(response), true, 'control');
      await this._setStateFreshAsync(`${identity}.control.${keys[1]}`, errorText, true, 'control');
    };
    const succeed = async (method, response, ackValue, section) => {
      await this._recordControlResult(identity, method, response, undefined);
      await setSpecificResult(section, response, undefined);
      await ack(ackValue);
    };
    const fail = async (method, error, ackValue, section) => {
      this.log.warn(`NexoWatt OCPP control failed (${identity}, ${method}): ${error && error.message || error}`);
      await this._recordControlResult(identity, method, undefined, error);
      await setSpecificResult(section, undefined, error);
      await ack(ackValue);
    };

    // These are local input states. They are acknowledged without issuing a
    // protocol command until their matching trigger or limit state is written.
    if (mRpcMethod || mRpcPayload || mLimitType || mReqStartIdToken || mReqStartIdTokenType
      || mReqStartEvseId || mReqStartRemoteStartId || mReqStartProfile || mReqStopTxId) {
      await ack(state.val);
      return;
    }

    const entry = this.runtimeIndex.get(identity);
    const proto = entry && entry.proto;
    const call = (method, payload) => this._callClient(identity, method, payload);
    const action = mHard || mSoft ? 'Reset'
      : mAvail ? 'ChangeAvailability'
        : mLimit || mPhases ? 'SetChargingProfile'
          : mRpcExec ? 'RPC'
            : mReqStartTrigger ? (proto === 'ocpp1.6' ? 'RemoteStartTransaction' : 'RequestStartTransaction')
              : mReqStopTrigger ? (proto === 'ocpp1.6' ? 'RemoteStopTransaction' : 'RequestStopTransaction')
                : 'Control';
    const section = mRpcExec ? 'rpc' : mReqStartTrigger ? 'start' : mReqStopTrigger ? 'stop' : undefined;

    let offlineAckValue = state.val;
    if (mHard || mSoft || mRpcExec || mReqStartTrigger || mReqStopTrigger) offlineAckValue = false;
    if (mAvail) offlineAckValue = !!state.val;
    if (mLimit) offlineAckValue = Math.max(0, Number.isFinite(Number(state.val)) ? Number(state.val) : 0);
    if (mPhases) offlineAckValue = Math.max(1, Math.min(3, Math.round(Number(state.val) || 3)));

    if (!entry || !entry.client) {
      await fail(action, new Error('Charging station is not connected'), offlineAckValue, section);
      return;
    }

    try {
      if (mRpcExec) {
        if (!state.val) { await ack(false); return; }
        const method = String(await readControl('rpcMethod', 'rpc.method', '') || '').trim();
        const payloadText = String(await readControl('rpcPayload', 'rpc.payload', '') || '').trim();
        if (!method) throw new Error('Missing OCPP method/action');
        let payload = {};
        if (payloadText) {
          try { payload = JSON.parse(payloadText); } catch (error) { throw new Error(`Payload is not valid JSON: ${error.message}`); }
        }
        const response = await call(method, payload);
        await succeed(method, response, false, 'rpc');
        return;
      }

      if (mReqStartTrigger) {
        if (!state.val) { await ack(false); return; }
        const idToken = String(await readControl('startIdToken', 'requestStartTransaction.idToken', '') || '').trim();
        const idTokenType = String(await readControl('startIdTokenType', 'requestStartTransaction.idTokenType', 'Central') || 'Central').trim() || 'Central';
        const evseId = Math.max(0, Number(await readControl('startEvseId', 'requestStartTransaction.evseId', 1) || 1));
        let remoteStartId = Number(await readControl('startRemoteStartId', 'requestStartTransaction.remoteStartId', 0) || 0);
        if (!Number.isFinite(remoteStartId) || remoteStartId <= 0) remoteStartId = Math.floor(Math.random() * 0x7ffffffe) + 1;
        if (!idToken) throw new Error('Missing idToken/idTag');

        let response;
        if (proto === 'ocpp1.6') {
          response = await call('RemoteStartTransaction', { connectorId: evseId || 1, idTag: idToken });
          this._assertCallAccepted('RemoteStartTransaction', response);
        } else {
          const payload = { idToken: { idToken, type: idTokenType }, remoteStartId };
          if (evseId > 0) payload.evseId = evseId;
          const profileText = String(await readControl('startChargingProfile', 'requestStartTransaction.chargingProfile', '') || '').trim();
          if (profileText) {
            try { payload.chargingProfile = JSON.parse(profileText); } catch (error) { throw new Error(`chargingProfile is not valid JSON: ${error.message}`); }
          }
          response = await call('RequestStartTransaction', payload);
          this._assertCallAccepted('RequestStartTransaction', response);
        }
        await this._setStateFreshAsync(`${identity}.control.startRemoteStartId`, remoteStartId, true, 'control');
        await succeed(proto === 'ocpp1.6' ? 'RemoteStartTransaction' : 'RequestStartTransaction', response, false, 'start');
        return;
      }

      if (mReqStopTrigger) {
        if (!state.val) { await ack(false); return; }
        let transactionId = String(await readControl('stopTransactionId', 'requestStopTransaction.transactionId', '') || '').trim();
        if (!transactionId) transactionId = String((await this.getStateAsync(`${identity}.transactions.lastId`))?.val || '').trim();
        if (!transactionId) throw new Error('Missing transactionId and no last transaction is known');
        const response = proto === 'ocpp1.6'
          ? await call('RemoteStopTransaction', { transactionId: Number.isFinite(Number(transactionId)) ? Number(transactionId) : transactionId })
          : await call('RequestStopTransaction', { transactionId });
        this._assertCallAccepted(proto === 'ocpp1.6' ? 'RemoteStopTransaction' : 'RequestStopTransaction', response);
        await this._setStateFreshAsync(`${identity}.control.stopTransactionId`, transactionId, true, 'control');
        await succeed(proto === 'ocpp1.6' ? 'RemoteStopTransaction' : 'RequestStopTransaction', response, false, 'stop');
        return;
      }

      if (mHard || mSoft) {
        if (!state.val) { await ack(false); return; }
        const type = proto === 'ocpp1.6' ? (mHard ? 'Hard' : 'Soft') : (mHard ? 'Immediate' : 'OnIdle');
        const response = await call('Reset', { type });
        this._assertCallAccepted('Reset', response);
        await succeed('Reset', response, false);
        return;
      }

      if (mAvail) {
        const available = !!state.val;
        const response = proto === 'ocpp1.6'
          ? await call('ChangeAvailability', { connectorId: 0, type: available ? 'Operative' : 'Inoperative' })
          : await call('ChangeAvailability', { operationalStatus: available ? 'Operative' : 'Inoperative' });
        this._assertCallAccepted('ChangeAvailability', response);
        await succeed('ChangeAvailability', response, available);
        return;
      }

      if (mPhases) {
        const phases = Math.max(1, Math.min(3, Math.round(Number(state.val) || 3)));
        const currentLimit = Math.max(0, Number((await this.getStateAsync(`${identity}.control.chargeLimit`))?.val || 0));
        if (currentLimit <= 0) {
          await succeed('numberOfPhases', { stored: true, profileReapplied: false, reason: 'no-active-limit' }, phases);
          return;
        }
        const rawUnit = String((await this.getStateAsync(`${identity}.control.chargeLimitType`))?.val || 'W').trim().toUpperCase();
        const rateUnit = rawUnit === 'A' ? 'A' : 'W';
        const result = await this._queueSmartCharging(identity, currentLimit, rateUnit, phases);
        if (result.status === 'Superseded') {
          await ackIfStillCurrent();
          return;
        }
        await succeed(result.method || 'SetChargingProfile', result, phases);
        return;
      }

      if (mLimit) {
        const limit = Math.max(0, Number.isFinite(Number(state.val)) ? Number(state.val) : 0);
        const rawUnit = String((await this.getStateAsync(`${identity}.control.chargeLimitType`))?.val || 'W').trim().toUpperCase();
        const rateUnit = rawUnit === 'A' ? 'A' : 'W';
        const phases = Math.max(1, Math.min(3, Math.round(Number((await this.getStateAsync(`${identity}.control.numberOfPhases`))?.val || 3))));
        const result = await this._queueSmartCharging(identity, limit, rateUnit, phases);
        if (result.status === 'Superseded') {
          await ackIfStillCurrent();
          return;
        }
        await succeed(result.method || (result.action === 'clear' ? 'ClearChargingProfile' : 'SetChargingProfile'), result, limit);
      }
    } catch (error) {
      await fail(action, error, offlineAckValue, section);
    }
  }

  async onUnload(cb) {
    this._shuttingDown = true;
    if (this._watchdogTimer) {
      clearInterval(this._watchdogTimer);
      this._watchdogTimer = null;
    }
    const identities = [...this.runtimeIndex.keys()];
    try {
      if (this.server) await this.server.close();
      for (const identity of identities) {
        try { await this._setDisconnectedHealth(identity, 'adapter-stopped'); } catch (e) { /* best effort during shutdown */ }
      }
    } catch (e) {
      this.log.warn(`NexoWatt OCPP shutdown warning: ${e && e.message || e}`);
    } finally {
      this.server = null;
      cb();
    }
  }
}
if (module && require.main === module) { (() => new NexoWattOcppAdapter())(); }
module.exports = (options) => new NexoWattOcppAdapter(options);
