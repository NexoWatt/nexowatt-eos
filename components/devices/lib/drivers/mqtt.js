'use strict';

const { assertLicensedControl, runLicensedControl } = require('../licenseControl');

const fs = require('node:fs');
const mqtt = require('mqtt');
const { getByJsonPath, applyNumericTransforms, coerceBoolean } = require('../utils');

let ADAPTER_VERSION = 'unknown';
try {
  ADAPTER_VERSION = String(require('../../package.json').version || 'unknown');
} catch (_) {
  // Keep runtime independent from package metadata in unusual test/install layouts.
}

function hasOwn(object, key) {
  return !!object && Object.prototype.hasOwnProperty.call(object, key);
}

function applyValueMap(value, valueMap, defaultValue) {
  if (!valueMap || typeof valueMap !== 'object') return value;
  const key = String(value);
  if (hasOwn(valueMap, key)) return valueMap[key];
  if (defaultValue !== undefined) return defaultValue;
  return value;
}

function parseJsonValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

function sameStateValue(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  return false;
}

function sanitizeClientIdPart(value, fallback) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function redactMqttUrl(rawUrl) {
  const text = String(rawUrl || '').trim();
  if (!text) return '';
  try {
    const parsed = new URL(text);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString().replace(/\/$/, parsed.pathname && parsed.pathname !== '/' ? '/' : '');
  } catch (_) {
    // Best effort for malformed/legacy URLs: remove user-info without changing
    // the host/port text that helps the installer diagnose the connection.
    return text.replace(/^(\w+:\/\/)[^/@]+@/, '$1');
  }
}

function numericMqttReasonCode(error) {
  const candidates = [
    error && error.reasonCode,
    error && error.returnCode,
    error && error.connack && error.connack.reasonCode,
    error && error.connack && error.connack.returnCode,
    error && error.packet && error.packet.reasonCode,
    error && error.packet && error.packet.returnCode,
    error && typeof error.code === 'number' ? error.code : undefined,
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isInteger(value) && value >= 0 && value <= 255) return value;
  }
  return null;
}

function mqttReasonLabel(reasonCode) {
  const labels = {
    4: 'bad username or password (MQTT 3.1.1)',
    5: 'not authorized (MQTT 3.1.1)',
    134: 'bad username or password (MQTT 5)',
    135: 'not authorized (MQTT 5)',
  };
  return labels[reasonCode] || '';
}

function classifyMqttError(error) {
  const originalMessage = error && error.message ? String(error.message) : String(error || 'Unknown MQTT error');
  const lower = originalMessage.toLowerCase();
  const reasonCode = numericMqttReasonCode(error);
  const code = (error && typeof error.code === 'string') ? error.code : '';
  const badCredentials = reasonCode === 4 || reasonCode === 134 ||
    /bad\s+(user\s*name|username).*password|bad\s+password/i.test(originalMessage);
  const notAuthorized = reasonCode === 5 || reasonCode === 135 ||
    /not\s+authori[sz]ed|unauthori[sz]ed|authorization\s+failed/i.test(originalMessage);
  const tls = /certificate|self[- ]signed|tls|ssl|wrong version number|unable to verify|hostname.*match/i.test(originalMessage);
  const timeout = /connack.*timeout|connect.*timeout|timed out/i.test(originalMessage);
  const refused = code === 'ECONNREFUSED' || /connection refused/i.test(originalMessage);

  let category = 'transport';
  if (badCredentials) category = 'bad_credentials';
  else if (notAuthorized) category = 'not_authorized';
  else if (tls) category = 'tls';
  else if (timeout) category = 'timeout';
  else if (refused) category = 'refused';

  return {
    category,
    originalMessage,
    reasonCode,
    reasonLabel: reasonCode === null ? '' : mqttReasonLabel(reasonCode),
    code,
  };
}

class MqttDriver {
  constructor(
    adapter,
    deviceCfg,
    template,
    globalCfg,
    relStateIdFn,
    roundingDecimalsFn,
    onAliveFn,
    onValuesFn,
    onConnectionFn,
  ) {
    this.adapter = adapter;
    this.device = deviceCfg || {};
    this.template = template || {};
    this.global = globalCfg || {};
    this.relStateId = relStateIdFn;
    this.roundingDecimals = roundingDecimalsFn;

    // Optional callbacks supplied by DeviceRuntime.
    this.onAlive = (typeof onAliveFn === 'function') ? onAliveFn : null;
    this.onValues = (typeof onValuesFn === 'function') ? onValuesFn : null;
    this.onConnection = (typeof onConnectionFn === 'function') ? onConnectionFn : null;

    this.client = null;
    this.connected = false;

    this.hints = (this.template.driverHints && this.template.driverHints.mqtt) || {};
    this.isTesvolt = this.template.id === 'ess.tesvolt.iotGateway.mqttV2';
    const connection = this.device.connection || {};
    this.tesvoltTopicMode = String(connection.tesvoltTopicMode || 'auto');
    if (this.isTesvolt && !['auto', 'ems', 'v2'].includes(this.tesvoltTopicMode)) {
      throw new Error('Invalid TESVOLT topic mode; use auto, ems or v2');
    }
    this.tesvoltControlEnabled = connection.tesvoltControlEnabled === true;
    this.activeTopicPrefix = this.tesvoltTopicMode === 'ems' ? 'EMS/'
      : this.tesvoltTopicMode === 'v2' ? 'EMS/V2/' : '';
    this._lastSelectedTesvoltPrefix = this.activeTopicPrefix;
    this._messageQueue = Promise.resolve();
    this._pendingTesvoltMessages = new Map();
    this._pendingTesvoltRawPrefixes = new Map();

    // A single MQTT JSON object commonly contains many values. Keep all datapoints
    // for a topic instead of the previous one-topic/one-datapoint cache.
    this.dpsByTopic = new Map();
    // Compatibility alias for older tests/integrations that may inspect the property.
    this.dpByTopic = this.dpsByTopic;
    this.dpById = new Map();

    // Last successfully parsed engineering values. This full snapshot is passed back
    // to DeviceRuntime so canonical aliases can be updated for event-driven protocols.
    this.valueCache = Object.create(null);
    this.updatedAtByDpId = new Map();
    this.commandCache = new Map();
    this.lastStateWriteByDpId = new Map();
    this.lastSourceTimestampByTopic = new Map();

    this._offlineApplied = false;
    this._lastConnectionNotification = null;

    // Template-driven cyclic write groups (used by the TESVOLT MQTT V2 EMS
    // interface). The gateway expects recurring setpoints and otherwise marks
    // the external EMS offline. State is kept only in memory and is never
    // restored as a non-zero command after a reconnect or adapter restart.
    this.writeGroupStates = new Map();
    this.writeGroupTimers = new Map();
    this._disconnecting = false;

    // Connection diagnostics. TESVOLT gateways can restrict both credentials
    // and MQTT Client-ID through their local broker ACL. Keep the effective
    // Client-ID stable and preserve the primary CONNACK/TLS error so a later
    // generic close/heartbeat event cannot hide the real root cause.
    this.effectiveClientId = '';
    this.safeConnectionUrl = '';
    this._lastPrimaryConnectionError = '';
    this._lastPrimaryConnectionErrorAt = 0;
    this._lastConnectionErrorLogKey = '';
    this._lastConnectionErrorLogAt = 0;

    // MQTT protocol diagnostics. A successful CONNACK only proves that the
    // broker accepted the client. It does not prove that topic subscriptions
    // were granted or that the gateway is publishing telemetry.
    this.subscriptionResults = new Map();
    this.messageCount = 0;
    this.gatewayMessageCount = 0;
    this.telemetryMessageCount = 0;
    this.liveTelemetryCount = 0;
    this.unknownTopicCount = 0;
    this.discoveredTopics = new Set();
    this.lastMessageAt = 0;
    this._noDataTimer = null;
    this._bootstrapPublished = false;
  }

  _resolveClientId(connection) {
    const explicit = String(connection && connection.clientId || '').trim();
    if (explicit) return explicit;

    const deviceId = sanitizeClientIdPart(this.device && this.device.id, 'device');
    const namespace = sanitizeClientIdPart(this.adapter && this.adapter.namespace, 'nexowatt-devices');
    const instance = sanitizeClientIdPart(
      this.adapter && this.adapter.instance !== undefined ? this.adapter.instance : namespace.split('-').at(-1),
      '0',
    );
    const configuredTemplate = String(this.hints.defaultClientId || '').trim();
    if (configuredTemplate) {
      return configuredTemplate
        .replace(/\{\{?deviceId\}?\}/g, deviceId)
        .replace(/\{\{?instance\}?\}/g, instance)
        .replace(/\{\{?namespace\}?\}/g, namespace);
    }

    // Deterministic fallback. The former random suffix made broker ACLs and
    // reconnect diagnostics unnecessarily difficult and could be rejected by
    // gateways that whitelist a fixed Client-ID.
    return `nexowatt-${instance}-${deviceId}`;
  }

  _rememberPrimaryConnectionError(message) {
    const text = String(message || '').trim();
    if (!text) return;
    this._lastPrimaryConnectionError = text;
    this._lastPrimaryConnectionErrorAt = Date.now();
  }

  _clearPrimaryConnectionError() {
    this._lastPrimaryConnectionError = '';
    this._lastPrimaryConnectionErrorAt = 0;
  }

  _effectiveOfflineReason(fallback) {
    const age = Date.now() - Number(this._lastPrimaryConnectionErrorAt || 0);
    if (this._lastPrimaryConnectionError && age >= 0 && age <= 120000) {
      return this._lastPrimaryConnectionError;
    }
    return String(fallback || 'MQTT disconnected');
  }

  _formatConnectionError(error) {
    const diagnostics = classifyMqttError(error);
    const clientId = this.effectiveClientId || '<unknown>';
    const url = this.safeConnectionUrl || '<unknown broker>';
    const usernameState = String((this.device.connection || {}).username || '') ? 'configured' : 'not configured';
    const reasonCodeText = diagnostics.reasonCode === null
      ? ''
      : `; CONNACK/reason=${diagnostics.reasonCode}${diagnostics.reasonLabel ? ` (${diagnostics.reasonLabel})` : ''}`;

    if (diagnostics.category === 'not_authorized') {
      return `MQTT authorization rejected${reasonCodeText}: broker=${url}; clientId="${clientId}"; username=${usernameState}. ` +
        'The broker is reachable. Check the TESVOLT IoT Gateway user/password and its MQTT ACL/allowed Client-ID.';
    }
    if (diagnostics.category === 'bad_credentials') {
      return `MQTT username/password rejected${reasonCodeText}: broker=${url}; clientId="${clientId}"; username=${usernameState}.`;
    }
    if (diagnostics.category === 'tls') {
      return `MQTT TLS connection failed: broker=${url}; clientId="${clientId}"; ${diagnostics.originalMessage}. ` +
        'Check mqtts://, CA certificate, certificate verification and TLS server name/SNI.';
    }
    if (diagnostics.category === 'timeout') {
      return `MQTT CONNACK/connect timeout: broker=${url}; clientId="${clientId}"; ${diagnostics.originalMessage}`;
    }
    if (diagnostics.category === 'refused') {
      return `MQTT TCP connection refused: broker=${url}; clientId="${clientId}"; ${diagnostics.originalMessage}`;
    }
    return `MQTT connection error: broker=${url}; clientId="${clientId}"${reasonCodeText}; ${diagnostics.originalMessage}`;
  }

  _logConnectionError(message) {
    const text = String(message || 'MQTT connection error');
    const now = Date.now();
    const same = text === this._lastConnectionErrorLogKey;
    if (same && (now - this._lastConnectionErrorLogAt) < 60000) {
      this.adapter.log.debug(`[${this.device.id}] ${text}`);
      return;
    }
    this._lastConnectionErrorLogKey = text;
    this._lastConnectionErrorLogAt = now;
    this.adapter.log.warn(`[${this.device.id}] ${text}`);
  }

  _diagnosticDatapoint(dpId) {
    return this.dpById.get(String(dpId || '')) || null;
  }

  async _setDiagnostic(dpId, value, forceWrite) {
    const dp = this._diagnosticDatapoint(dpId);
    if (!dp) return false;
    return this._setDatapointValue(dp, value, Date.now(), {
      markFresh: true,
      forceWrite: forceWrite === true,
    });
  }

  _subscriptionDefinitions() {
    if (this.isTesvolt) {
      if (this.tesvoltTopicMode === 'auto') {
        return [{ topic: 'EMS/#', qos: 0, required: true, fallbackExactPrefix: 'EMS/' }];
      }
      const prefix = this.activeTopicPrefix;
      return [
        { topic: 'EMS/APIVersion', qos: 0, required: this.tesvoltTopicMode === 'v2' && this.tesvoltControlEnabled },
        { topic: `${prefix}#`, qos: 0, required: true, fallbackExactPrefix: prefix },
      ];
    }
    const configured = Array.isArray(this.hints.subscriptionFilters)
      ? this.hints.subscriptionFilters
      : [];
    const source = configured.length ? configured : [...this.dpsByTopic.keys()];
    const byTopic = new Map();

    for (const item of source) {
      const definition = typeof item === 'string' ? { topic: item } : (item || {});
      const topic = String(definition.topic || '').trim();
      if (!topic) continue;
      const qosCandidate = Number(definition.qos);
      const qos = Number.isFinite(qosCandidate) ? Math.max(0, Math.min(2, qosCandidate)) : 0;
      const existing = byTopic.get(topic);
      byTopic.set(topic, {
        topic,
        qos: existing ? Math.max(existing.qos, qos) : qos,
        required: existing ? (existing.required || definition.required !== false) : definition.required !== false,
        fallbackExactPrefix: String(definition.fallbackExactPrefix || (existing && existing.fallbackExactPrefix) || ''),
      });
    }

    return [...byTopic.values()];
  }

  _assertTesvoltWriteEnabled() {
    if (!this.tesvoltControlEnabled) {
      throw new Error('TESVOLT monitoring only: power control is disabled (parallel TEM reading)');
    }
    if (this.tesvoltTopicMode === 'auto') {
      throw new Error('TESVOLT control requires an explicit topic format: EMS or EMS/V2');
    }
  }

  _resolveWriteTopic(topic) {
    return this.isTesvolt && this.tesvoltTopicMode === 'ems'
      ? topic.replace(/^EMS\/V2\//, 'EMS/') : topic;
  }

  async _updateTesvoltDiagnostics() {
    if (!this.isTesvolt) return;
    await this._setDiagnostic('mQTT_ACTIVE_TOPIC_PREFIX', this.activeTopicPrefix || 'waiting for telemetry');
    await this._setDiagnostic('mQTT_CONTROL_ENABLED', this.tesvoltControlEnabled);
    let status = 'monitoring_only';
    if (this.tesvoltControlEnabled) {
      try {
        this._assertTesvoltWriteEnabled();
        if (!this.connected) throw new Error('MQTT disconnected');
        const dp = this.dpById.get(String((this.hints.powerControl || {}).dpId || ''));
        if (!dp) throw new Error('Power command datapoint missing');
        this._normalizePowerCommand(dp, 1, true);
        this._normalizePowerCommand(dp, -1, true);
        status = 'ready: commands remain subject to current directional limits';
      } catch (error) {
        status = `blocked: ${error.message || error}`;
      }
    }
    await this._setDiagnostic('mQTT_CONTROL_STATUS', status);
  }

  _subscriptionGrant(granted, topic) {
    const list = Array.isArray(granted) ? granted : [];
    const entry = list.find((candidate) => candidate && String(candidate.topic || '') === String(topic)) || list[0] || null;
    if (!entry) return { denied: false, code: null, details: '' };

    const reasonCode = Number(entry.reasonCode);
    const qosCode = Number(entry.qos);
    const code = Number.isFinite(reasonCode) ? reasonCode : (Number.isFinite(qosCode) ? qosCode : null);
    const denied = Number.isFinite(code) && code >= 128;
    return {
      denied,
      code,
      details: JSON.stringify(entry),
    };
  }

  _subscribeOne(definition) {
    const topic = String(definition && definition.topic || '');
    const qos = Number.isFinite(Number(definition && definition.qos))
      ? Math.max(0, Math.min(2, Number(definition.qos)))
      : 0;

    return new Promise((resolve) => {
      if (!this.client || !topic) {
        resolve({ ...definition, ok: false, error: 'MQTT client/topic missing' });
        return;
      }

      try {
        this.client.subscribe(topic, { qos }, (error, granted) => {
          const grant = this._subscriptionGrant(granted, topic);
          if (error || grant.denied) {
            const message = error
              ? String(error.message || error)
              : `broker denied subscription${grant.code === null ? '' : ` (reason/qos=${grant.code})`}`;
            resolve({ ...definition, qos, ok: false, error: message, grant });
            return;
          }
          resolve({ ...definition, qos, ok: true, grant });
        });
      } catch (error) {
        resolve({ ...definition, qos, ok: false, error: String(error && error.message || error) });
      }
    });
  }

  async _setSubscriptionDiagnostics(results) {
    const items = Array.isArray(results) ? results : [];
    const requiredFailures = items.filter((item) => item && item.required !== false && !item.ok);
    const successful = items.filter((item) => item && item.ok);
    const ok = requiredFailures.length === 0 && successful.length > 0;
    const statusSuccesses = successful.filter((item) => !item.fallbackFor);
    const successLabels = statusSuccesses.map((item) => item.fallback
      ? `${item.topic} (exact-topic fallback)`
      : item.topic);
    const actualGrantedCount = successful.filter((item) => !item.fallback).length;
    const optionalFailures = items.filter((item) => item && item.required === false && !item.ok);
    const partialStatus = optionalFailures.length
      ? `; unavailable topics: ${optionalFailures.map((item) => `${item.topic} (${item.error || 'unknown'})`).join(', ')}`
      : '';
    const status = ok
      ? `granted: ${successLabels.join(', ')}${partialStatus}`
      : `denied/failed: ${requiredFailures.map((item) => `${item.topic} (${item.error || 'unknown'})`).join(', ') || 'no subscription granted'}`;

    await this._setDiagnostic('mQTT_SUBSCRIPTION_OK', ok, true);
    await this._setDiagnostic('mQTT_SUBSCRIPTION_STATUS', status, true);
    await this._setDiagnostic('mQTT_SUBSCRIPTION_COUNT', actualGrantedCount, true);

    if (ok) {
      this.adapter.log.info(`[${this.device.id}] MQTT subscriptions granted: ${successLabels.join(', ')}`);
      if (optionalFailures.length) {
        this.adapter.log.warn(`[${this.device.id}] MQTT partial data access${partialStatus}`);
      }
    } else {
      const message = `MQTT connected, but required subscriptions were not granted: ${status}. ` +
        'Check read/subscribe ACL for the selected TESVOLT topics (EMS/# or EMS/V2/#).';
      this._rememberPrimaryConnectionError(message);
      this._logConnectionError(message);
      await this._notifyValues({ connected: true, error: message, subscriptionError: true });
    }
    return { ok, status, requiredFailures, optionalFailures, successful };
  }

  _buildBootstrapPayload(profile) {
    const connection = this.device.connection || {};
    if (String(profile || '') !== 'tesvoltEmsParameters') return null;

    const deviceId = sanitizeClientIdPart(this.device && this.device.id, 'device');
    const serialNumber = String(connection.tesvoltEmsSerialNumber || '').trim() || `NEXOWATT-${deviceId}`;
    const softwareVersion = String(connection.tesvoltEmsSoftwareVersion || '').trim() || ADAPTER_VERSION;
    return {
      ts_create: new Date().toISOString(),
      SerialNumber: serialNumber,
      SoftwareVersion: softwareVersion,
    };
  }

  async _publishBootstrapMessages() {
    // The unversioned Parameters topic belongs to the running TEM. Never
    // overwrite its retained identity, even when unversioned control is enabled.
    if (this.isTesvolt && (!this.tesvoltControlEnabled || this.tesvoltTopicMode !== 'v2')) {
      await this._setDiagnostic('mQTT_BOOTSTRAP_STATUS', 'disabled: monitoring or unversioned EMS profile', true);
      await this._setDiagnostic('mQTT_EMS_PARAMETERS_PUBLISHED', false, true);
      return { ok: true, attempted: false };
    }
    const entries = Array.isArray(this.hints.bootstrapPublishes) ? this.hints.bootstrapPublishes : [];
    if (!entries.length || !this.connected || !this.client) return { ok: true, attempted: false };

    let ok = true;
    let attempted = false;
    for (const entry of entries) {
      const topic = String(entry && entry.topic || '').trim();
      if (!topic) continue;
      const payload = this._buildBootstrapPayload(entry.profile);
      if (!payload) continue;
      attempted = true;
      const qosCandidate = Number(entry.qos);
      const qos = Number.isFinite(qosCandidate) ? Math.max(0, Math.min(2, qosCandidate)) : 0;
      const retain = entry.retain === true;

      try {
        await this._publish(topic, JSON.stringify(payload), { qos, retain }, true);
        this._bootstrapPublished = true;
        const status = `${topic} published${retain ? ' retained' : ''}`;
        await this._setDiagnostic('mQTT_BOOTSTRAP_STATUS', status, true);
        await this._setDiagnostic('mQTT_EMS_PARAMETERS_PUBLISHED', true, true);
        this.adapter.log.info(
          `[${this.device.id}] MQTT EMS identity published: topic=${topic}; ` +
          `SerialNumber=${payload.SerialNumber}; SoftwareVersion=${payload.SoftwareVersion}; retain=${retain}`,
        );
      } catch (error) {
        this._bootstrapPublished = false;
        ok = false;
        const message = `MQTT EMS identity publish failed for ${topic}: ${error && error.message ? error.message : error}. ` +
          'The TESVOLT user needs publish permission for EMS/V2/Parameters.';
        await this._setDiagnostic('mQTT_BOOTSTRAP_STATUS', message, true);
        await this._setDiagnostic('mQTT_EMS_PARAMETERS_PUBLISHED', false, true);
        this._rememberPrimaryConnectionError(message);
        this._logConnectionError(message);
        await this._notifyValues({ connected: true, error: message, bootstrapError: true });
      }
    }
    return { ok, attempted };
  }

  _stopNoDataWatch() {
    if (!this._noDataTimer) return;
    try { clearTimeout(this._noDataTimer); } catch (_) {}
    this._noDataTimer = null;
  }

  _startNoDataWatch() {
    this._stopNoDataWatch();
    const timeoutCandidate = Number(this.hints.noDataTimeoutMs);
    const timeoutMs = Number.isFinite(timeoutCandidate) && timeoutCandidate > 0
      ? Math.max(1000, timeoutCandidate)
      : 10000;
    const baselineCount = this.isTesvolt ? this.liveTelemetryCount : this.telemetryMessageCount;
    this._noDataTimer = setTimeout(() => {
      this._noDataTimer = null;
      const currentCount = this.isTesvolt ? this.liveTelemetryCount : this.telemetryMessageCount;
      if (!this.connected || currentCount !== baselineCount) return;
      const message = `MQTT connection and subscriptions are active, but no usable live EMS telemetry was received within ${timeoutMs} ms. ` +
        'Check the selected topic format and read/subscribe ACL for EMS/# or EMS/V2/#. Broker login alone does not prove telemetry access.';
      this._logConnectionError(message);
      // Keep the bootstrap diagnostic focused on the retained EMS identity.
      // The no-data condition remains visible in info.lastError and the
      // dedicated message/topic counters.
      this._notifyValues({ connected: true, error: message, noData: true }).catch(() => {});
    }, timeoutMs);
    if (this._noDataTimer && typeof this._noDataTimer.unref === 'function') this._noDataTimer.unref();
  }

  _isOutboundOnlyTopic(topic) {
    const normalized = String(topic || '');
    if (this.isTesvolt && /^EMS\/(?:V2\/)?(?:Parameters|Inverter\/Control|Battery\/Control)$/.test(normalized)) return true;
    const bootstrapTopics = Array.isArray(this.hints.bootstrapPublishes)
      ? this.hints.bootstrapPublishes.map((entry) => String(entry && entry.topic || ''))
      : [];
    if (bootstrapTopics.includes(normalized)) return true;
    for (const group of Object.values(this._writeGroups())) {
      if (String(group && group.topic || '') === normalized) return true;
    }
    return false;
  }

  async _recordIncomingTopic(topic) {
    const normalized = String(topic || '');
    const outboundOnly = this._isOutboundOnlyTopic(normalized);
    const isNew = !this.discoveredTopics.has(normalized);
    this.discoveredTopics.add(normalized);
    this.messageCount += 1;
    if (!outboundOnly) this.gatewayMessageCount += 1;
    const telemetry = !outboundOnly && (this.isTesvolt
      ? /^EMS\/(?:V2\/)?(?:Inverter\/|Battery\/|Bifi$|TesvoltIoTGateway$)/.test(normalized)
      : normalized.startsWith('EMS/V2/'));
    if (telemetry) this.telemetryMessageCount += 1;
    this.lastMessageAt = Date.now();
    if (telemetry && !this.isTesvolt) this._stopNoDataWatch();

    await this._setDiagnostic('mQTT_LAST_TOPIC', normalized, true);
    await this._setDiagnostic('mQTT_LAST_MESSAGE_MS', this.lastMessageAt, true);
    await this._setDiagnostic('mQTT_MESSAGE_COUNT', this.messageCount, true);
    await this._setDiagnostic('mQTT_GATEWAY_MESSAGE_COUNT', this.gatewayMessageCount, true);
    await this._setDiagnostic('mQTT_TELEMETRY_MESSAGE_COUNT', this.telemetryMessageCount, true);
    await this._setDiagnostic('mQTT_DISCOVERED_TOPICS_JSON', JSON.stringify([...this.discoveredTopics].sort()), true);
    return { isNew, outboundOnly, telemetry };
  }

  async connect() {
    const connection = this.device.connection || {};
    const url = String(connection.url || '').trim();
    if (!url) throw new Error('Missing MQTT url');

    this.effectiveClientId = this._resolveClientId(connection);
    this.safeConnectionUrl = redactMqttUrl(url);

    const options = {
      username: connection.username || undefined,
      password: connection.password || undefined,
      clientId: this.effectiveClientId,
      reconnectPeriod: Number.isFinite(Number(connection.reconnectPeriodMs))
        ? Math.max(0, Number(connection.reconnectPeriodMs))
        : 5000,
      connectTimeout: Number.isFinite(Number(connection.connectTimeoutMs))
        ? Math.max(1000, Number(connection.connectTimeoutMs))
        : 10000,
      keepalive: Number.isFinite(Number(connection.keepaliveSeconds))
        ? Math.max(5, Number(connection.keepaliveSeconds))
        : 30,
      clean: connection.cleanSession !== false,
    };

    // mqtts:// works with the normal mqtt package. Username/password provide
    // authentication; transport encryption is provided only by mqtts/TLS.
    if (connection.rejectUnauthorized === false) throw new Error('EOS_MQTT_TLS_VERIFICATION_REQUIRED');
    options.rejectUnauthorized = true;
    options.minVersion = 'TLSv1.3';
    if (connection.servername) options.servername = String(connection.servername).trim();

    const caFile = String(connection.caFile || '').trim();
    const caCertificate = String(connection.caCertificate || connection.ca || '').trim();
    if (caFile) {
      try {
        options.ca = fs.readFileSync(caFile);
      } catch (error) {
        throw new Error(`Cannot read MQTT TLS CA file ${caFile}: ${error && error.message ? error.message : error}`);
      }
    } else if (caCertificate) {
      // Allow both literal PEM and JSON-configured strings containing escaped newlines.
      options.ca = caCertificate.replace(/\\n/g, '\n');
    }

    const secureTransport = /^(mqtts|wss):\/\//i.test(url);
    const verifyCertificate = secureTransport ? options.rejectUnauthorized !== false : false;
    this.adapter.log.info(
      `[${this.device.id}] MQTT connecting: broker=${this.safeConnectionUrl}; clientId="${this.effectiveClientId}"; ` +
      `username=${options.username ? 'configured' : 'not configured'}; TLS=${secureTransport ? 'enabled' : 'disabled'}; ` +
      `verifyCertificate=${verifyCertificate}`,
    );

    this.client = mqtt.connect(url, options);

    this.client.on('connect', (connack) => {
      this.connected = true;
      this._disconnecting = false;
      this._offlineApplied = false;
      this._clearPrimaryConnectionError();
      if (this.isTesvolt) {
        // Retained samples and capabilities from a previous session must not
        // authorize a new command or mix two protocol namespaces.
        this.updatedAtByDpId.clear();
        this.lastSourceTimestampByTopic.clear();
        this._pendingTesvoltMessages.clear();
        this._pendingTesvoltRawPrefixes.clear();
        for (const id of ['aPI_VERSION', 'iNVERTER_SUPPORTED_CONTROL']) delete this.valueCache[id];
        this.activeTopicPrefix = this.tesvoltTopicMode === 'ems' ? 'EMS/'
          : this.tesvoltTopicMode === 'v2' ? 'EMS/V2/' : '';
      }
      const sessionPresent = connack && connack.sessionPresent === true;
      this.adapter.log.info(
        `[${this.device.id}] MQTT connected: broker=${this.safeConnectionUrl}; clientId="${this.effectiveClientId}"; ` +
        `sessionPresent=${sessionPresent}`,
      );
      const subscriptionPromise = this._subscribeAll();
      this._markWriteGroupsConnected();
      this._notifyConnection(true, '');
      Promise.resolve(subscriptionPromise)
        .then(async (subscriptionStatus) => {
          const bootstrapStatus = await this._publishBootstrapMessages();
          // Do not replace a precise subscription/bootstrap error with the
          // secondary generic no-data warning.
          if (subscriptionStatus && subscriptionStatus.ok && (!bootstrapStatus || bootstrapStatus.ok !== false)) {
            this._startNoDataWatch();
          }
        })
        .catch((error) => {
          const message = `MQTT subscription/bootstrap failed: ${error && error.message ? error.message : error}`;
          this._logConnectionError(message);
          this._notifyValues({ connected: true, error: message, subscriptionError: true }).catch(() => {});
        });
    });

    this.client.on('reconnect', () => {
      this.adapter.log.debug(`[${this.device.id}] MQTT reconnecting`);
    });

    this.client.on('offline', () => {
      this.connected = false;
      this._stopNoDataWatch();
      const reason = this._effectiveOfflineReason('MQTT offline');
      this._markWriteGroupsDisconnected(reason);
      this._notifyConnection(false, reason);
    });

    this.client.on('close', () => {
      this.connected = false;
      this._stopNoDataWatch();
      const reason = this._effectiveOfflineReason('MQTT connection closed');
      if (!this._disconnecting) this._markWriteGroupsDisconnected(reason);
      this._notifyConnection(false, reason);
    });

    this.client.on('error', (error) => {
      const message = this._formatConnectionError(error);
      if (!this.connected) this._rememberPrimaryConnectionError(message);
      this._logConnectionError(message);
      if (!this.connected) this._notifyConnection(false, message);
    });

    this.client.on('message', (topic, payload, packet) => {
      // Preserve broker arrival order across asynchronous state writes.
      this._messageQueue = this._messageQueue.then(() => this._handleMessage(topic, payload, packet)).catch((error) => {
        const message = error && error.message ? error.message : String(error);
        this.adapter.log.warn(`[${this.device.id}] MQTT message handling failed for ${topic}: ${message}`);
      });
    });
  }

  _notifyConnection(connected, errorMessage) {
    if (!this.onConnection) return;
    const next = !!connected;
    if (this._lastConnectionNotification === next && !errorMessage) return;
    this._lastConnectionNotification = next;
    try {
      const result = this.onConnection(next, errorMessage || '');
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {
      // Connection notifications must never crash the MQTT client.
    }
  }

  async _subscribeAll() {
    if (!this.client) return { ok: false, status: 'MQTT client missing' };

    this.dpsByTopic.clear();
    this.dpById.clear();
    this.subscriptionResults.clear();

    const datapoints = Array.isArray(this.template.datapoints) ? this.template.datapoints : [];
    for (const dp of datapoints) {
      if (!dp || !dp.id) continue;
      this.dpById.set(String(dp.id), dp);

      const source = dp.source || {};
      if (source.kind !== 'mqtt' || !source.topic) continue;
      // Write-only command topics are not subscribed unless explicitly requested.
      if (dp.rw === 'wo' && source.subscribe !== true) continue;
      if (source.subscribe === false) continue;

      let topics = [String(source.topic)];
      if (this.isTesvolt && source.topic.startsWith('EMS/V2/')) {
        const legacy = source.topic.replace('EMS/V2/', 'EMS/');
        topics = this.tesvoltTopicMode === 'ems' ? [legacy]
          : this.tesvoltTopicMode === 'v2' ? topics : [...topics, legacy];
      }
      if (this.isTesvolt && source.tesvoltUnversionedOnly && this.tesvoltTopicMode === 'v2') topics = [];
      for (const topic of topics) {
        if (!this.dpsByTopic.has(topic)) this.dpsByTopic.set(topic, []);
        this.dpsByTopic.get(topic).push(dp);
      }
    }

    // Keep write-group state initialization synchronous for compatibility with
    // existing event-driven tests and runtimes.
    this._initializeWriteGroupStates();
    await this._updateTesvoltDiagnostics();

    const definitions = this._subscriptionDefinitions();
    const primaryResults = await Promise.all(definitions.map((definition) => this._subscribeOne(definition)));
    const allResults = [...primaryResults];

    // Some broker ACLs reject wildcard subscription filters even though the
    // corresponding concrete topics are allowed. TESVOLT V2 uses EMS/V2/# in
    // the specification, but an exact-topic fallback keeps the adapter usable
    // with stricter/manual gateway ACL configurations.
    for (const result of primaryResults) {
      if (result.ok || !result.fallbackExactPrefix) continue;
      const prefix = String(result.fallbackExactPrefix);
      const exactDefinitions = [...this.dpsByTopic.keys()]
        .filter((topic) => String(topic).startsWith(prefix))
        .map((topic) => ({ topic, qos: result.qos, required: !this.isTesvolt, fallbackFor: result.topic }));
      if (!exactDefinitions.length) continue;

      this.adapter.log.info(
        `[${this.device.id}] MQTT wildcard subscription ${result.topic} was not granted; trying ${exactDefinitions.length} exact TESVOLT topics`,
      );
      const exactResults = await Promise.all(exactDefinitions.map((definition) => this._subscribeOne(definition)));
      allResults.push(...exactResults);
      const fallbackOk = this.isTesvolt
        ? exactResults.some((entry) => entry.ok && /\/(?:Inverter|Battery)\//.test(entry.topic) && !entry.topic.endsWith('/Control'))
        : exactResults.every((entry) => entry.ok);
      if (fallbackOk) {
        result.ok = true;
        result.error = '';
        result.fallback = true;
        result.fallbackTopics = exactDefinitions.map((entry) => entry.topic);
      }
    }

    for (const result of allResults) {
      if (result && result.topic) this.subscriptionResults.set(String(result.topic), result);
    }
    return this._setSubscriptionDiagnostics(allResults);
  }

  async disconnect() {
    this._disconnecting = true;
    this._stopNoDataWatch();
    try {
      if (this.client && this.connected) {
        await this._sendSafeWriteGroupsOnDisconnect();
      }
      this._stopWriteGroupTimers();
      if (this.client) {
        await new Promise((resolve) => this.client.end(false, {}, resolve));
      }
    } catch (_) {
      // ignore
    } finally {
      this.connected = false;
      this.client = null;
      this._pendingTesvoltMessages.clear();
      this._pendingTesvoltRawPrefixes.clear();
      this._disconnecting = false;
      this._notifyConnection(false, 'MQTT disconnected');
    }
  }

  _extractSourceTimestamp(parsedJson) {
    if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) return 0;
    const field = String(this.hints.timestampField || 'ts_create');
    const raw = parsedJson[field];
    if (typeof raw !== 'string' || !raw.trim()) return 0;
    const timestamp = Date.parse(raw);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  async _clearPreviousTesvoltNamespaceValues(timestamp) {
    const clearedIds = [];
    for (const dp of this.dpById.values()) {
      const source = dp.source || {};
      if (source.kind !== 'mqtt' || !String(source.topic || '').startsWith('EMS/') || dp.rw === 'wo') continue;
      // APIVersion is shared by both namespaces. Preserve only a version that
      // actually arrived in this connection (freshness is cleared on connect).
      if (source.topic === 'EMS/APIVersion' && this.updatedAtByDpId.has(dp.id)) continue;
      await this._setDatapointValue(dp, null, timestamp, { markFresh: false, forceWrite: true });
      clearedIds.push(dp.id);
      this.updatedAtByDpId.delete(dp.id);
    }
    this.lastSourceTimestampByTopic.clear();
    await this._evaluateDerivedDatapoints(timestamp);
    // Send an explicit null snapshot once so direct aliases are cleared too;
    // simply omitting a datapoint would preserve its previous alias value.
    await this._notifyValues({ connected: this.connected, diagnosticsOnly: true, namespaceChanged: true });
    for (const dpId of clearedIds) delete this.valueCache[dpId];
  }

  async _handleMessage(topic, payload, packet, replay) {
    const receivedAt = replay ? replay.receivedAt : Date.now();
    const incoming = replay ? replay.incoming : await this._recordIncomingTopic(topic);
    const datapoints = this.dpsByTopic.get(topic);
    if (!datapoints || !datapoints.length) {
      if (!incoming.outboundOnly) {
        this.unknownTopicCount += 1;
        await this._setDiagnostic('mQTT_UNKNOWN_TOPIC_COUNT', this.unknownTopicCount, true);
        if (incoming.isNew) {
          this.adapter.log.info(`[${this.device.id}] MQTT discovered unhandled TESVOLT topic: ${topic}`);
        }
        if (!this.isTesvolt) {
          try {
            const alive = this.onAlive && this.onAlive();
            if (alive && typeof alive.catch === 'function') alive.catch(() => {});
          } catch (_) {}
        }
        await this._notifyValues({ connected: true, topic, receivedAt, unknownTopic: true, diagnosticsOnly: this.isTesvolt });
      }
      return;
    }

    let parsedJson;
    const needsJson = datapoints.some((dp) => {
      const source = dp.source || {};
      return String(source.format || '').toLowerCase() === 'json' || !!source.jsonPath;
    });

    if (needsJson) {
      try {
        parsedJson = JSON.parse(payload.toString('utf8'));
      } catch (error) {
        throw new Error(`Invalid JSON: ${error.message || error}`);
      }
    }

    const sourceTimestamp = this._extractSourceTimestamp(parsedJson);
    const dynamicTopic = this.isTesvolt && /\/(Measurements|Limits|Energy|Electrical|SystemState|State)$/.test(topic);
    const timestampField = String(this.hints.timestampField || 'ts_create');
    const invalidTimestamp = dynamicTopic && hasOwn(parsedJson, timestampField) && !sourceTimestamp;
    if (dynamicTopic && sourceTimestamp > receivedAt + 5000) {
      this.adapter.log.debug(`[${this.device.id}] MQTT ignored future telemetry timestamp for ${topic}`);
      return;
    }
    const freshTelemetry = dynamicTopic && !invalidTimestamp &&
      (sourceTimestamp > 0 ? Date.now() - sourceTimestamp <= this._telemetryFreshnessMs(5000)
        : !(packet && packet.retain));
    const parsedEntries = [];
    for (const dp of datapoints) {
      try {
        const value = this._parsePayload(dp, payload, parsedJson);
        if (value !== undefined) parsedEntries.push({ dp, value });
      } catch (error) {
        this.adapter.log.warn(`[${this.device.id}] MQTT parse failed for ${topic}/${dp.id}: ${error.message || error}`);
      }
    }
    // Complete JSON envelopes are useful diagnostics, but a timestamp-only,
    // unsupported or null payload must not look like a usable device sample.
    const usableEntries = parsedEntries.filter(({ dp, value }) =>
      String((dp.source || {}).jsonPath || '').trim() !== '$' && value !== null);

    if (this.isTesvolt && /^EMS\/(?!APIVersion$)/.test(topic)) {
      const prefix = topic.startsWith('EMS/V2/') ? 'EMS/V2/' : 'EMS/';
      if (this.activeTopicPrefix && this.activeTopicPrefix !== prefix) return;
      // Retained metadata can outlive the gateway's active interface. Wait for
      // usable live telemetry before binding automatic mode to one namespace.
      // Buffer metadata so an earlier Parameters packet is not lost, and keep
      // complete received objects inspectable even while waiting for live data.
      if (!this.activeTopicPrefix && (!freshTelemetry || !usableEntries.length || incoming.outboundOnly)) {
        this._pendingTesvoltMessages.set(topic, { payload: Buffer.from(payload), packet, receivedAt, incoming });
        for (const { dp, value } of parsedEntries) {
          if (String((dp.source || {}).jsonPath || '').trim() === '$') {
            await this._setDatapointValue(dp, value, receivedAt, { markFresh: false, forceWrite: true });
            this._pendingTesvoltRawPrefixes.set(dp.id, prefix);
          }
        }
        return;
      }
      if (!this.activeTopicPrefix) {
        if (this._lastSelectedTesvoltPrefix && this._lastSelectedTesvoltPrefix !== prefix) {
          // A gateway can change interface versions across reconnects. Optional
          // fields absent from the new stream must not survive from the old one.
          await this._clearPreviousTesvoltNamespaceValues(receivedAt);
        }
        this.activeTopicPrefix = prefix;
        this._lastSelectedTesvoltPrefix = prefix;
        this.adapter.log.info(`[${this.device.id}] TESVOLT topic format detected: ${prefix}; control=${this.tesvoltControlEnabled}`);
        // A diagnostic captured while both namespaces were candidates must not
        // remain labelled as data from the selected namespace afterwards.
        for (const [dpId, rawPrefix] of this._pendingTesvoltRawPrefixes) {
          if (rawPrefix === prefix) continue;
          await this._setDatapointValue(this.dpById.get(dpId), null, receivedAt, { markFresh: false, forceWrite: true });
          delete this.valueCache[dpId];
          this.updatedAtByDpId.delete(dpId);
        }
        this._pendingTesvoltRawPrefixes.clear();
        const pending = [...this._pendingTesvoltMessages.entries()];
        this._pendingTesvoltMessages.clear();
        for (const [pendingTopic, message] of pending) {
          const pendingPrefix = pendingTopic.startsWith('EMS/V2/') ? 'EMS/V2/' : 'EMS/';
          if (pendingPrefix === prefix) {
            await this._handleMessage(pendingTopic, message.payload, message.packet, message);
          }
        }
      }
    }

    if (sourceTimestamp > 0) {
      const previous = Number(this.lastSourceTimestampByTopic.get(topic)) || 0;
      if (previous > 0 && (sourceTimestamp < previous || (dynamicTopic && sourceTimestamp === previous))) {
        this.adapter.log.debug(
          `[${this.device.id}] MQTT ignored older message for ${topic}: ${sourceTimestamp} < ${previous}`,
        );
        return;
      }
      this.lastSourceTimestampByTopic.set(topic, sourceTimestamp);
    }

    let parsedCount = 0;
    for (const { dp, value } of parsedEntries) {
      // Preserve historical MQTT behaviour: every received sample updates the raw
      // ioBroker state timestamp even when its value is unchanged. Freshness-sensitive
      // existing installations may rely on the state timestamp.
      const freshAt = dynamicTopic && sourceTimestamp > 0 ? Math.min(receivedAt, sourceTimestamp)
        : dynamicTopic && (invalidTimestamp || (packet && packet.retain)) ? 1 : receivedAt;
      await this._setDatapointValue(dp, value, freshAt, { markFresh: true, forceWrite: true });
      parsedCount += 1;
    }

    const derivedCount = await this._evaluateDerivedDatapoints(receivedAt);
    const staleCount = await this._applyStaleValues(receivedAt, false);
    const trackingCount = await this._evaluateControlTracking(receivedAt);
    await this._maybeSendPendingSafeValues();
    await this._updateTesvoltDiagnostics();

    // Generic MQTT keeps its established valid-JSON heartbeat behavior. TESVOLT
    // requires a fresh mapped scalar sample, excluding metadata and raw envelopes.
    const validKnownMessage = needsJson ? parsedJson !== undefined : parsedCount > 0;
    const liveSample = !this.isTesvolt || (!replay && usableEntries.length > 0 && freshTelemetry);
    if (!incoming.outboundOnly && liveSample && (parsedCount > 0 || derivedCount > 0 || staleCount > 0 || trackingCount > 0 || validKnownMessage)) {
      this.liveTelemetryCount += 1;
      this._stopNoDataWatch();
      this._offlineApplied = false;
      try {
        const alive = this.onAlive && this.onAlive();
        if (alive && typeof alive.catch === 'function') alive.catch(() => {});
      } catch (_) {
        // ignore
      }

      await this._notifyValues({
        connected: true,
        topic,
        receivedAt,
        sourceTimestamp,
      });
    } else if (this.isTesvolt && (parsedCount > 0 || derivedCount > 0 || staleCount > 0 || trackingCount > 0)) {
      // Errors/identity/diagnostic payloads must reach aliases immediately, but
      // cannot revive a stale device or clear an outstanding transport error.
      await this._notifyValues({ connected: this.connected, topic, receivedAt, sourceTimestamp, diagnosticsOnly: true });
    }
  }

  async _notifyValues(meta) {
    if (!this.onValues) return;
    try {
      await this.onValues({ ...this.valueCache }, meta || {});
    } catch (error) {
      this.adapter.log.debug(
        `[${this.device.id}] MQTT alias snapshot callback failed: ${error && error.message ? error.message : error}`,
      );
    }
  }

  _parsePayload(dp, payload, parsedJson) {
    const source = dp.source || {};
    const format = String(source.format || dp.type || 'string').toLowerCase();
    const expectedType = String(dp.type || '').toLowerCase();
    const text = payload.toString('utf8');

    const needsJson = String(source.format || '').toLowerCase() === 'json' || !!source.jsonPath;
    let value;

    if (needsJson) {
      const object = parsedJson !== undefined ? parsedJson : JSON.parse(text);
      value = source.jsonPath ? getByJsonPath(object, source.jsonPath) : object;
    } else if (format === 'number' || format === 'float' || format === 'int') {
      const numberValue = Number(text);
      if (!Number.isFinite(numberValue)) throw new Error(`Not a number: ${text}`);
      value = this.isTesvolt && Object.is(numberValue, -0) ? 0 : numberValue;
    } else if (format === 'boolean' || format === 'bool') {
      if (text === '1' || text.toLowerCase() === 'true' || text.toLowerCase() === 'on') value = true;
      else if (text === '0' || text.toLowerCase() === 'false' || text.toLowerCase() === 'off') value = false;
      else value = !!text;
    } else {
      value = text;
    }

    // An absent optional field must remain absent. A value-map fallback only
    // applies to an actually supplied value, not a missing State field.
    if (value === undefined) return undefined;

    // Normalize valid numeric JSON strings before sign/scaling transforms.
    // In particular Number('1e3') must not bypass an invert/scale operation.
    if (expectedType === 'number' && !source.readValueMap && value !== null) {
      if ((typeof value !== 'number' && typeof value !== 'string') ||
          (typeof value === 'string' && !value.trim()) || !Number.isFinite(Number(value))) {
        throw new Error(`Expected numeric value, received ${JSON.stringify(value)}`);
      }
      value = Number(value);
    }

    if (value !== null && source.readValueMap && typeof source.readValueMap === 'object') {
      value = applyValueMap(value, source.readValueMap, source.readValueMapDefault);
    }

    // Apply numeric transforms (scaleFactor, multiplier, divisor, offset, invert, ...)
    value = applyNumericTransforms(value, source);

    if (value === undefined) return undefined;

    if (expectedType === 'boolean') {
      value = coerceBoolean(value);
    } else if (expectedType === 'number') {
      // Preserve explicit null from the source instead of turning it into 0.
      if (value === null) return null;
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        throw new Error(`Expected numeric value, received ${JSON.stringify(value)}`);
      }
      value = this.isTesvolt && Object.is(numberValue, -0) ? 0 : numberValue;
    } else if (expectedType === 'string' && value && typeof value === 'object') {
      value = JSON.stringify(value);
    }

    const decimals = this.roundingDecimals ? this.roundingDecimals(dp) : null;
    if (typeof value === 'number' && decimals !== null && decimals !== undefined) {
      const factor = Math.pow(10, decimals);
      value = Math.round(value * factor) / factor;
    }

    return value;
  }

  async _setDatapointValue(dp, value, timestamp, options) {
    if (!dp || !dp.id) return false;
    const id = String(dp.id);
    const opts = options || {};

    if (opts.markFresh !== false) this.updatedAtByDpId.set(id, timestamp || Date.now());
    this.valueCache[id] = value;

    const previous = this.lastStateWriteByDpId.get(id);
    if (sameStateValue(previous, value) && opts.forceWrite !== true) return false;
    this.lastStateWriteByDpId.set(id, value);

    const stateId = this.relStateId ? this.relStateId(dp) : dp.id;
    await this.adapter.setStateAsync(stateId, { val: value, ack: true }).catch(() => {});
    return true;
  }

  _collectionLength(value) {
    const parsed = parseJsonValue(value);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === 'object') return Object.keys(parsed).length;
    return 0;
  }

  _computeDerivedValue(source) {
    const operation = String(source.op || '').toLowerCase();
    const inputs = Array.isArray(source.inputs) ? source.inputs : [];

    if (operation === 'anyequals') {
      return inputs.some((input) => {
        if (!input || !input.dpId) return false;
        return String(this.valueCache[input.dpId]) === String(input.equals);
      }) ? 1 : 0;
    }

    if (operation === 'arraylengthsum') {
      return inputs.reduce((sum, input) => {
        if (!input || !input.dpId) return sum;
        return sum + this._collectionLength(this.valueCache[input.dpId]);
      }, 0);
    }

    if (operation === 'alltruthy') {
      return inputs.every((input) => input && input.dpId && coerceBoolean(this.valueCache[input.dpId])) ? 1 : 0;
    }

    return undefined;
  }

  async _evaluateDerivedDatapoints(timestamp) {
    let changes = 0;
    const datapoints = Array.isArray(this.template.datapoints) ? this.template.datapoints : [];
    for (const dp of datapoints) {
      const source = dp && dp.source ? dp.source : {};
      if (source.kind !== 'mqttDerived') continue;
      const value = this._computeDerivedValue(source);
      if (value === undefined) continue;
      if (await this._setDatapointValue(dp, value, timestamp, { markFresh: true })) changes += 1;
    }
    return changes;
  }

  async _applyStaleValues(now, forceOffline) {
    let changes = 0;
    const offlineIds = new Set(
      Array.isArray(this.hints.zeroOnOfflineDpIds)
        ? this.hints.zeroOnOfflineDpIds.map((value) => String(value))
        : [],
    );

    const datapoints = Array.isArray(this.template.datapoints) ? this.template.datapoints : [];
    for (const dp of datapoints) {
      if (!dp || !dp.id) continue;
      const source = dp.source || {};
      if (source.kind !== 'mqtt') continue;

      const forceThis = !!forceOffline && (source.zeroOnOffline === true || offlineIds.has(String(dp.id)));
      const staleAfterMs = Number(source.staleAfterMs);
      const lastUpdate = Number(this.updatedAtByDpId.get(String(dp.id))) || 0;
      const timedOut = !forceOffline && Number.isFinite(staleAfterMs) && staleAfterMs > 0 &&
        lastUpdate > 0 && (now - lastUpdate) > staleAfterMs;

      if (!forceThis && !timedOut) continue;
      const staleValue = source.staleValue !== undefined ? source.staleValue : 0;
      if (await this._setDatapointValue(dp, staleValue, now, { markFresh: false })) changes += 1;
    }
    return changes;
  }

  async handleOffline(reason) {
    if (this._offlineApplied) return;
    this._offlineApplied = true;
    const effectiveReason = this._effectiveOfflineReason(reason || 'MQTT heartbeat timeout');
    await this._applyStaleValues(Date.now(), true);
    await this._evaluateDerivedDatapoints(Date.now());
    await this._setControlTrackingStatus('offline', false, 0, Date.now());
    await this._updateTesvoltDiagnostics();
    await this._notifyValues({ connected: false, stale: true, error: effectiveReason });
  }

  _connectionNumber(name, fallback) {
    const connection = this.device.connection || {};
    const value = Number(connection[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  _groupRefreshIntervalMs(group) {
    const configured = this._connectionNumber('tesvoltSetpointIntervalMs', 0);
    const templateValue = Number(group && group.refreshIntervalMs);
    const value = configured > 0 ? configured : templateValue;
    return Number.isFinite(value) && value > 0 ? Math.max(1000, value) : 0;
  }

  _groupCommandFreshnessMs(group) {
    const configured = this._connectionNumber('tesvoltCommandSourceTimeoutMs', 0);
    const templateValue = Number(group && group.commandFreshnessMs);
    const value = configured > 0 ? configured : templateValue;
    return Number.isFinite(value) && value > 0 ? Math.max(1000, value) : 0;
  }

  _telemetryFreshnessMs(defaultValue) {
    return this._connectionNumber('tesvoltTelemetryStaleMs', defaultValue);
  }

  _trackingDelayMs(defaultValue) {
    return this._connectionNumber('tesvoltTrackingDelayMs', defaultValue);
  }

  _writeGroups() {
    if (this.isTesvolt && (!this.tesvoltControlEnabled || this.tesvoltTopicMode === 'auto')) return {};
    return (this.hints.writeGroups && typeof this.hints.writeGroups === 'object')
      ? this.hints.writeGroups
      : {};
  }

  _writeGroupCommandDp(group) {
    const fields = group && group.fields && typeof group.fields === 'object' ? group.fields : {};
    const preferred = String((this.hints.powerControl || {}).dpId || '');
    for (const field of Object.values(fields)) {
      if (field && field.dpId && String(field.dpId) === preferred) return this.dpById.get(preferred) || null;
    }
    for (const field of Object.values(fields)) {
      if (field && field.dpId) return this.dpById.get(String(field.dpId)) || null;
    }
    return null;
  }

  _initializeWriteGroupStates() {
    for (const [groupName, group] of Object.entries(this._writeGroups())) {
      if (!group || this._groupRefreshIntervalMs(group) <= 0) continue;
      let state = this.writeGroupStates.get(groupName);
      const dp = this._writeGroupCommandDp(group);
      if (!dp) continue;
      if (!state) {
        const safeValue = Number.isFinite(Number(group.safeValue)) ? Number(group.safeValue) : 0;
        state = {
          groupName,
          dp,
          requestedValue: safeValue,
          effectiveValue: safeValue,
          lastExternalWriteAt: 0,
          lastSentAt: 0,
          lastSentValue: null,
          lastCommandChangedAt: 0,
          requiresFreshCommand: group.safeOnInitialConnect !== false,
          refreshBusy: false,
          staleLogged: false,
          blockLogged: false,
        };
        this.writeGroupStates.set(groupName, state);
      } else {
        state.dp = dp;
      }
      this._scheduleWriteGroupRefresh(groupName, group, state);
    }
  }

  _scheduleWriteGroupRefresh(groupName, group, state) {
    const intervalMs = this._groupRefreshIntervalMs(group);
    if (intervalMs <= 0 || this.writeGroupTimers.has(groupName)) return;
    const timer = setInterval(() => {
      this._refreshWriteGroup(groupName, 'interval').catch((error) => {
        this.adapter.log.debug(
          `[${this.device.id}] MQTT cyclic write ${groupName} skipped: ${error && error.message ? error.message : error}`,
        );
      });
    }, intervalMs);
    if (timer && typeof timer.unref === 'function') timer.unref();
    this.writeGroupTimers.set(groupName, timer);
  }

  suspendLicensedControl() {
    this._licensedCommandRequired = true;
    this._stopWriteGroupTimers();
    for (const state of this.writeGroupStates.values()) {
      state.requiresFreshCommand = true;
      state.lastExternalWriteAt = 0;
    }
  }

  _stopWriteGroupTimers() {
    for (const timer of this.writeGroupTimers.values()) {
      try { clearInterval(timer); } catch (_) {}
    }
    this.writeGroupTimers.clear();
  }

  _markWriteGroupsConnected() {
    this._initializeWriteGroupStates();
    for (const [groupName, state] of this.writeGroupStates.entries()) {
      const group = this._writeGroups()[groupName] || {};
      if (group.requireFreshCommandAfterReconnect !== false) state.requiresFreshCommand = true;
      state.lastSentAt = 0;
      state.staleLogged = false;
      state.blockLogged = false;
    }
    this._maybeSendPendingSafeValues().catch(() => {});
  }

  _markWriteGroupsDisconnected(reason) {
    for (const [groupName, state] of this.writeGroupStates.entries()) {
      const group = this._writeGroups()[groupName] || {};
      if (group.requireFreshCommandAfterReconnect !== false) state.requiresFreshCommand = true;
      state.lastSentAt = 0;
    }
    this._setControlTrackingStatus('offline', false, 0, Date.now()).catch(() => {});
    if (reason) this.adapter.log.debug(`[${this.device.id}] MQTT cyclic control paused: ${reason}`);
  }

  async _maybeSendPendingSafeValues() {
    if (!this.connected || !this.client) return;
    for (const [groupName, state] of this.writeGroupStates.entries()) {
      const group = this._writeGroups()[groupName] || {};
      if (!state.requiresFreshCommand || group.safeOnInitialConnect === false) continue;
      const intervalMs = this._groupRefreshIntervalMs(group) || 5000;
      if (state.lastSentAt > 0 && (Date.now() - state.lastSentAt) < intervalMs) continue;
      try {
        await this._publishWriteGroupValue(state, group, Number(group.safeValue || 0), 'safe_connect');
      } catch (_) {
        // Retained API/capability messages may not have arrived yet. The cyclic
        // timer retries without flooding the warning log.
      }
    }
  }

  async _sendSafeWriteGroupsOnDisconnect() {
    for (const [groupName, state] of this.writeGroupStates.entries()) {
      const group = this._writeGroups()[groupName] || {};
      if (group.safeOnDisconnect !== true) continue;
      try {
        await this._publishWriteGroupValue(state, group, Number(group.safeValue || 0), 'safe_disconnect');
      } catch (_) {
        // A best-effort 0 W command is useful on a controlled shutdown, but a
        // broken MQTT link must never block adapter termination.
      }
    }
  }

  async _refreshWriteGroup(groupName, reason) {
    const state = this.writeGroupStates.get(groupName);
    const group = this._writeGroups()[groupName];
    if (!state || !group || !this.connected || !this.client || state.refreshBusy) return;

    state.refreshBusy = true;
    try {
      const safeValue = Number.isFinite(Number(group.safeValue)) ? Number(group.safeValue) : 0;
      if (state.requiresFreshCommand) {
        await this._publishWriteGroupValue(state, group, safeValue, 'safe_reconnect');
        return;
      }

      const freshnessMs = this._groupCommandFreshnessMs(group);
      const commandAge = state.lastExternalWriteAt > 0 ? (Date.now() - state.lastExternalWriteAt) : Number.POSITIVE_INFINITY;
      if (freshnessMs > 0 && commandAge > freshnessMs) {
        if (!state.staleLogged) {
          state.staleLogged = true;
          this.adapter.log.warn(
            `[${this.device.id}] MQTT control setpoint is stale (${Math.round(commandAge)} ms); sending safe ${safeValue} W`,
          );
        }
        await this._publishWriteGroupValue(state, group, safeValue, 'safe_stale');
        return;
      }

      state.staleLogged = false;
      try {
        await this._publishWriteGroupValue(state, group, state.requestedValue, reason || 'refresh');
        state.blockLogged = false;
      } catch (error) {
        if (!state.blockLogged) {
          state.blockLogged = true;
          this.adapter.log.warn(
            `[${this.device.id}] MQTT cyclic control blocked; sending safe ${safeValue} W: ${error && error.message ? error.message : error}`,
          );
        }
        if (group.safeOnValidationFailure !== false) {
          await this._publishWriteGroupValue(state, group, safeValue, 'safe_blocked');
        }
      }
    } finally {
      state.refreshBusy = false;
    }
  }

  async _publishWriteGroupValue(...args) {
    return runLicensedControl(this.adapter, () => this._publishAuthorizedWriteGroupValue(...args));
  }

  async _publishAuthorizedWriteGroupValue(state, group, requestedValue, origin) {
    if (!state || !state.dp) throw new Error('Missing MQTT write-group command datapoint');
    if (!this.connected || !this.client) throw new Error('MQTT not connected');

    let effectiveValue = requestedValue;
    if (String((this.hints.powerControl || {}).dpId || '') === String(state.dp.id || '')) {
      effectiveValue = this._normalizePowerCommand(state.dp, requestedValue);
    }
    this.commandCache.set(String(state.dp.id), effectiveValue);

    const payloadObject = this._buildWriteGroupPayload(state.dp, effectiveValue, group);
    const source = state.dp.source || {};
    const topic = this._resolveWriteTopic(String(group.topic || source.topic || ''));
    if (!topic) throw new Error(`Missing MQTT write-group topic for ${state.groupName}`);
    const qos = Number.isFinite(Number(group.qos)) ? Math.max(0, Math.min(2, Number(group.qos))) : 0;
    const retain = group.retain === true;
    await this._publish(topic, JSON.stringify(payloadObject), { qos, retain }, true);

    const now = Date.now();
    const commandChanged = !sameStateValue(state.lastSentValue, effectiveValue);
    state.effectiveValue = effectiveValue;
    state.lastSentAt = now;
    state.lastSentValue = effectiveValue;
    if (commandChanged || !state.lastCommandChangedAt) state.lastCommandChangedAt = now;
    await this._recordControlCommand(effectiveValue, now, origin || 'external', commandChanged);

    return { effectiveValue, topic, payload: payloadObject };
  }

  _controlStatusDp(configKey) {
    const id = String((this.hints.powerControl || {})[configKey] || '');
    return id ? this.dpById.get(id) || null : null;
  }

  async _setControlTrackingValue(configKey, value, timestamp) {
    const dp = this._controlStatusDp(configKey);
    if (!dp) return false;
    return this._setDatapointValue(dp, value, timestamp || Date.now(), { markFresh: true });
  }

  async _setControlTrackingStatus(status, ok, errorW, timestamp) {
    let changes = 0;
    if (await this._setControlTrackingValue('trackingStatusDpId', String(status), timestamp)) changes += 1;
    if (await this._setControlTrackingValue('trackingOkDpId', !!ok, timestamp)) changes += 1;
    if (await this._setControlTrackingValue('trackingErrorDpId', Number.isFinite(Number(errorW)) ? Number(errorW) : 0, timestamp)) changes += 1;
    return changes;
  }

  async _recordControlCommand(effectiveValue, timestamp, origin, commandChanged) {
    let changes = 0;
    if (await this._setControlTrackingValue('commandedPowerDpId', Number(effectiveValue), timestamp)) changes += 1;
    if (await this._setControlTrackingValue('lastSentMsDpId', Number(timestamp), timestamp)) changes += 1;
    const safeOrigin = String(origin || '').startsWith('safe_');
    if (safeOrigin) {
      changes += await this._setControlTrackingStatus(String(origin), false, 0, timestamp);
    } else if (commandChanged) {
      changes += await this._setControlTrackingStatus('pending', false, 0, timestamp);
    }
    return changes;
  }

  _activePowerWriteGroupState() {
    const dpId = String((this.hints.powerControl || {}).dpId || '');
    for (const state of this.writeGroupStates.values()) {
      if (state && state.dp && String(state.dp.id) === dpId) return state;
    }
    return null;
  }

  async _evaluateControlTracking(now) {
    const config = this.hints.powerControl || {};
    const measurementDpId = String(config.measurementDpId || '');
    if (!measurementDpId) return 0;
    const state = this._activePowerWriteGroupState();
    if (!state || !state.lastSentAt) return this._setControlTrackingStatus('idle', false, 0, now);

    const measurementFreshnessMs = this._telemetryFreshnessMs(Number(config.measurementFreshnessMs || 5000));
    if (!this._isFresh(measurementDpId, measurementFreshnessMs)) {
      return this._setControlTrackingStatus('measurement_stale', false, 0, now);
    }

    const measured = Number(this.valueCache[measurementDpId]);
    const commanded = Number(state.lastSentValue);
    if (!Number.isFinite(measured) || !Number.isFinite(commanded)) {
      return this._setControlTrackingStatus('measurement_invalid', false, 0, now);
    }

    const errorW = measured - commanded;
    await this._setControlTrackingValue('trackingErrorDpId', errorW, now);
    const delayMs = this._trackingDelayMs(Number(config.trackingDelayMs || 3000));
    const commandChangedAt = Number(state.lastCommandChangedAt || state.lastSentAt || 0);
    if ((now - commandChangedAt) < delayMs) {
      return this._setControlTrackingStatus('pending', false, errorW, now);
    }

    const fixedTolerance = Math.max(0, Number(config.trackingToleranceW || 500));
    const percentageTolerance = Math.max(0, Number(config.trackingTolerancePct || 10));
    const tolerance = Math.max(fixedTolerance, Math.abs(commanded) * percentageTolerance / 100);
    const following = Math.abs(errorW) <= tolerance;
    return this._setControlTrackingStatus(following ? 'following' : 'deviating', following, errorW, now);
  }

  _formatPayload(dp, value) {
    const source = dp.source || {};
    const format = String(source.format || dp.type || 'string').toLowerCase();

    let mapped = applyValueMap(value, source.valueMap);
    if (source.writeInvert && typeof mapped === 'number') mapped = -mapped;
    if (source.writeMultiplier !== undefined && Number.isFinite(Number(source.writeMultiplier))) {
      mapped = Number(mapped) * Number(source.writeMultiplier);
    }
    if (source.writeDivisor !== undefined && Number.isFinite(Number(source.writeDivisor)) && Number(source.writeDivisor) !== 0) {
      mapped = Number(mapped) / Number(source.writeDivisor);
    }
    if (source.writeOffset !== undefined && Number.isFinite(Number(source.writeOffset))) {
      mapped = Number(mapped) + Number(source.writeOffset);
    }

    if (format === 'json') return JSON.stringify(mapped);
    if (format === 'boolean' || format === 'bool') return mapped ? '1' : '0';
    if (format === 'number' || format === 'float' || format === 'int') return String(Number(mapped));
    return String(mapped);
  }

  _parseStringArrayFromCache(dpId) {
    const parsed = parseJsonValue(this.valueCache[dpId]);
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
  }

  _isFresh(dpId, maxAgeMs) {
    const timestamp = Number(this.updatedAtByDpId.get(String(dpId))) || 0;
    if (!timestamp) return false;
    return (Date.now() - timestamp) <= maxAgeMs;
  }

  _normalizePowerCommand(dp, requestedValue, quiet) {
    const config = this.hints.powerControl || {};
    if (!config || String(config.dpId || '') !== String(dp.id || '')) return Number(requestedValue);

    const requested = Number(requestedValue);
    if (!Number.isFinite(requested)) throw new Error(`Invalid TESVOLT power setpoint: ${requestedValue}`);
    if (this.isTesvolt) this._assertTesvoltWriteEnabled();

    const apiVersionDpId = String(config.apiVersionDpId || '');
    const requiredApiVersion = String(config.requiredApiVersion || '');
    if (apiVersionDpId && requiredApiVersion && !(this.isTesvolt && this.tesvoltTopicMode === 'ems')) {
      const actual = String(this.valueCache[apiVersionDpId] || '');
      if (actual !== requiredApiVersion) {
        throw new Error(`TESVOLT MQTT API ${requiredApiVersion} required, received ${actual || 'no version yet'}`);
      }
    }

    // After API V2 is confirmed, 0 W is always allowed as a stop request. It does
    // not depend on dynamic limits or the current battery state.
    if (requested === 0) return 0;

    const supportedControlDpId = String(config.supportedControlDpId || '');
    if (supportedControlDpId) {
      const controls = this._parseStringArrayFromCache(supportedControlDpId);
      if (!controls.includes('Power')) {
        throw new Error('TESVOLT inverter does not advertise Power in supported_control');
      }
    }

    const inverterStateDpId = String(config.inverterStateDpId || '');
    const blockedInverterStates = Array.isArray(config.blockedInverterStates)
      ? config.blockedInverterStates.map((state) => String(state))
      : ['fault'];
    const inverterStateFreshnessMs = this._telemetryFreshnessMs(Number(config.inverterStateFreshnessMs || 5000));
    if (inverterStateDpId) {
      if (!this._isFresh(inverterStateDpId, inverterStateFreshnessMs)) {
        throw new Error(`TESVOLT inverter state is stale or missing (>${inverterStateFreshnessMs} ms)`);
      }
      const state = String(this.valueCache[inverterStateDpId] || '');
      if (!state) throw new Error('TESVOLT inverter state is empty');
      if (blockedInverterStates.includes(state)) {
        throw new Error(`TESVOLT inverter state ${state} blocks power control`);
      }
    }

    const batteryStateDpId = String(config.batteryStateDpId || '');
    const allowedBatteryStates = Array.isArray(config.allowedBatteryStates)
      ? config.allowedBatteryStates.map((state) => String(state))
      : ['normal'];
    const stateFreshnessMs = this._telemetryFreshnessMs(Number(config.stateFreshnessMs || 5000));
    if (batteryStateDpId) {
      if (!this._isFresh(batteryStateDpId, stateFreshnessMs)) {
        throw new Error(`TESVOLT battery state is stale or missing (>${stateFreshnessMs} ms)`);
      }
      const state = String(this.valueCache[batteryStateDpId] || '');
      if (!allowedBatteryStates.includes(state)) {
        throw new Error(`TESVOLT battery state ${state || 'unknown'} does not allow a non-zero power command`);
      }
    }

    const limitsFreshnessMs = this._telemetryFreshnessMs(Number(config.limitsFreshnessMs || 5000));
    const chargeLimitDpId = String(config.chargeLimitDpId || '');
    const dischargeLimitDpId = String(config.dischargeLimitDpId || '');
    const relevantLimitDpId = requested < 0 ? chargeLimitDpId : dischargeLimitDpId;

    if (relevantLimitDpId) {
      if (!this._isFresh(relevantLimitDpId, limitsFreshnessMs)) {
        throw new Error(`TESVOLT power limit ${relevantLimitDpId} is stale or missing (>${limitsFreshnessMs} ms)`);
      }
      const limit = Number(this.valueCache[relevantLimitDpId]);
      if (!Number.isFinite(limit) || limit < 0) {
        throw new Error(`TESVOLT power limit ${relevantLimitDpId} is invalid: ${this.valueCache[relevantLimitDpId]}`);
      }

      const magnitude = Math.abs(requested);
      if (magnitude > limit) {
        const clamped = requested < 0 ? -limit : limit;
        if (!quiet) this.adapter.log.warn(
          `[${this.device.id}] TESVOLT power setpoint ${requested} W limited to ${clamped} W by ${relevantLimitDpId}`,
        );
        return clamped;
      }
    }

    return requested;
  }

  _transformWriteFieldValue(value, field) {
    let transformed = value;
    if (field && field.invert && typeof transformed === 'number') transformed = -transformed;
    if (field && field.multiplier !== undefined && Number.isFinite(Number(field.multiplier))) {
      transformed = Number(transformed) * Number(field.multiplier);
    }
    if (field && field.divisor !== undefined && Number.isFinite(Number(field.divisor)) && Number(field.divisor) !== 0) {
      transformed = Number(transformed) / Number(field.divisor);
    }
    if (field && field.offset !== undefined && Number.isFinite(Number(field.offset))) {
      transformed = Number(transformed) + Number(field.offset);
    }
    return transformed;
  }

  _buildWriteGroupPayload(dp, value, group) {
    const supportedControlDpId = String((this.hints.powerControl || {}).supportedControlDpId || '');
    const supportedControls = supportedControlDpId ? this._parseStringArrayFromCache(supportedControlDpId) : [];
    const supportedKnown = supportedControls.length > 0;
    const fields = group && group.fields && typeof group.fields === 'object' ? group.fields : {};
    const payload = {};

    for (const [jsonKey, fieldDefinition] of Object.entries(fields)) {
      const field = fieldDefinition || {};
      if (field.includeIfSupported) {
        const capability = String(field.includeIfSupported);
        if (supportedKnown && !supportedControls.includes(capability)) continue;
        if (!supportedKnown && field.includeIfUnknown === false) continue;
      }

      let fieldValue;
      if (field.dpId) {
        const fieldDpId = String(field.dpId);
        if (fieldDpId === String(dp.id)) fieldValue = value;
        else if (this.commandCache.has(fieldDpId)) fieldValue = this.commandCache.get(fieldDpId);
        else if (field.default !== undefined) fieldValue = field.default;
      } else if (field.value !== undefined) {
        fieldValue = field.value;
      } else if (field.default !== undefined) {
        fieldValue = field.default;
      }

      if (fieldValue === undefined) {
        if (field.required) throw new Error(`Missing MQTT write-group field ${jsonKey}`);
        continue;
      }

      payload[jsonKey] = this._transformWriteFieldValue(fieldValue, field);
    }

    return payload;
  }

  async _publish(topic, payload, options, requireConnected) {
    if (this._licensedCommandRequired) throw new Error('EOS license requires a fresh MQTT command');
    if (this.isTesvolt) {
      this._assertTesvoltWriteEnabled();
      const controlTopic = this._resolveWriteTopic('EMS/V2/Inverter/Control');
      if (topic !== controlTopic && !(this.tesvoltTopicMode === 'v2' && topic === 'EMS/V2/Parameters')) {
        throw new Error(`TESVOLT publish topic is not enabled: ${topic}`);
      }
    }
    if (!this.client) throw new Error('MQTT not connected');
    if (requireConnected && !this.connected) throw new Error('MQTT not connected');
    await new Promise((resolve, reject) => {
      assertLicensedControl(this.adapter);
      this.client.publish(topic, payload, options, (error) => error ? reject(error) : resolve());
    });
  }

  async readDatapoints(/* datapoints */) {
    // MQTT is event-driven; nothing to poll here.
    return {};
  }

  async writeDatapoint(...args) {
    return runLicensedControl(this.adapter, () => this._writeAuthorizedDatapoint(...args));
  }

  async _writeAuthorizedDatapoint(dp, value) {
    assertLicensedControl(this.adapter);
    this._licensedCommandRequired = false;
    if (this.isTesvolt) this._assertTesvoltWriteEnabled();
    const source = dp.source || {};
    if (!this.client) throw new Error('MQTT not connected');

    const writeGroupName = source.writeGroup ? String(source.writeGroup) : '';
    if (writeGroupName) {
      if (!this.connected) throw new Error('MQTT not connected');
      const writeGroups = this._writeGroups();
      const group = writeGroups[writeGroupName];
      if (!group) throw new Error(`Unknown MQTT write group: ${writeGroupName}`);

      this._initializeWriteGroupStates();
      let state = this.writeGroupStates.get(writeGroupName);
      if (!state) {
        state = {
          groupName: writeGroupName,
          dp,
          requestedValue: value,
          effectiveValue: value,
          lastExternalWriteAt: 0,
          lastSentAt: 0,
          lastSentValue: null,
          lastCommandChangedAt: 0,
          requiresFreshCommand: false,
          refreshBusy: false,
          staleLogged: false,
          blockLogged: false,
        };
        this.writeGroupStates.set(writeGroupName, state);
      }
      state.dp = dp;

      // Publish first. Only a successfully transmitted external command becomes
      // the command that the cyclic refresh loop is allowed to keep alive.
      const result = await this._publishWriteGroupValue(state, group, value, 'external');
      state.requestedValue = value;
      state.effectiveValue = result.effectiveValue;
      state.lastExternalWriteAt = Date.now();
      state.requiresFreshCommand = false;
      state.staleLogged = false;
      state.blockLogged = false;
      this._scheduleWriteGroupRefresh(writeGroupName, group, state);
      return result;
    }

    const topic = String(source.topic || '');
    if (!topic) throw new Error('Missing topic');

    const payload = this._formatPayload(dp, value);
    const qos = Number.isFinite(Number(source.qos)) ? Math.max(0, Math.min(2, Number(source.qos))) : 0;
    const retain = source.retain === true;
    await this._publish(topic, payload, { qos, retain }, false);
    return { effectiveValue: value, topic, payload };
  }
}

module.exports = {
  MqttDriver,
  applyValueMap,
};
