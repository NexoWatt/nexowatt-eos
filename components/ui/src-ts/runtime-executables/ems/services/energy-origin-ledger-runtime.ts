// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bindet Herkunftsbilanz und Ledger-Fortschreibung in den Adapter-Lebenszyklus ein.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/energy-origin-ledger-runtime.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/services/energy-origin-ledger-runtime.js
 *
 * Read-only Laufzeit für die App „Energieherkunft & Ladebilanz“.
 * Die Klasse liest ausschließlich kumulierte Fremd-Zähler, schließt
 * 15-Minuten-Intervalle, pflegt das Speicher-Herkunftskonto und publiziert
 * kompakte Journal-/Diagnose-States. Sie enthält keinen Hardware-Write-Pfad.
 */
'use strict';

const {
  ORIGIN_LEDGER_VERSION,
  normalizeEdition,
  normalizeOriginConfig,
  emptyStorageInventory,
  normalizeInventory,
  meterSampleFromState,
  interpolateCumulativeSample,
  calculateOriginInterval,
  aggregateIntervals,
  intervalBounds,
} = require('./energy-origin-accounting');

type AnyRecord = Record<string, any>;

class EnergyOriginLedgerRuntime {
  adapter: AnyRecord;
  _primed: boolean;
  _configHash: string;
  _currentInterval: AnyRecord | null;
  _recentIntervals: AnyRecord[];
  _previousHash: string;
  _storageInventory: AnyRecord;
  _configHistory: AnyRecord[];

  constructor(adapter: AnyRecord) {
    this.adapter = adapter;
    this._primed = false;
    this._configHash = '';
    this._currentInterval = null;
    this._recentIntervals = [];
    this._previousHash = '';
    this._storageInventory = emptyStorageInventory();
    this._configHistory = [];
  }

  _rawConfig(): AnyRecord {
    const cfg = this.adapter && this.adapter.config && this.adapter.config.energyLedger;
    return cfg && typeof cfg === 'object' ? cfg : {};
  }

  _edition(): string {
    try {
      if (this.adapter && typeof this.adapter._nwCurrentLicenseEdition === 'function') {
        return normalizeEdition(this.adapter._nwCurrentLicenseEdition());
      }
    } catch (_eEdition) {}
    const info = this.adapter && this.adapter._nwLicenseInfo && typeof this.adapter._nwLicenseInfo === 'object'
      ? this.adapter._nwLicenseInfo
      : {};
    return normalizeEdition(info.edition || (this.adapter && this.adapter._nwLicenseOk ? 'eos' : 'none'));
  }

  _config(): AnyRecord {
    return normalizeOriginConfig(this._rawConfig(), this._edition());
  }

  async init(): Promise<void> {
    await this._ensureStates();
    await this._primeFromStates();
    await this._process('init');
  }

  async tick(): Promise<void> {
    await this._process('tick');
  }

  async _ensureStates(): Promise<void> {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;
    const channel = async (id: string, name: string): Promise<unknown> => a.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
    const mk = async (id: string, name: string, type: string, role: string, unit: string, def: unknown): Promise<void> => {
      const common: AnyRecord = { name, type, role, read: true, write: false };
      if (unit) common.unit = unit;
      if (def !== undefined) common.def = def;
      await a.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };
    await channel('energyLedger.origin', 'Energieherkunft & Ladebilanz');
    await channel('energyLedger.origin.export', 'Energieherkunft Exporte');
    await channel('energyLedger.origin.diagnostics', 'Energieherkunft Diagnose');
    await mk('energyLedger.origin.enabled', 'Energieherkunftsbilanz aktiv', 'boolean', 'indicator', '', false);
    await mk('energyLedger.origin.status', 'Bilanzstatus', 'string', 'text', '', 'init');
    await mk('energyLedger.origin.version', 'Bilanzschema', 'string', 'text', '', ORIGIN_LEDGER_VERSION);
    await mk('energyLedger.origin.edition', 'Lizenzprofil', 'string', 'text', '', 'none');
    await mk('energyLedger.origin.siteId', 'Standort-ID', 'string', 'text', '', 'site_1');
    await mk('energyLedger.origin.siteName', 'Standortname', 'string', 'text', '', 'Standort 1');
    await mk('energyLedger.origin.configHash', 'Konfigurations-Hash', 'string', 'text', '', '');
    await mk('energyLedger.origin.hashHead', 'Journal Hash-Kopf', 'string', 'text', '', '');
    await mk('energyLedger.origin.lastUpdate', 'Letzte Bilanzaktualisierung', 'number', 'value.time', '', 0);
    await mk('energyLedger.origin.lastIntervalEnd', 'Letztes abgeschlossenes Intervall', 'number', 'value.time', '', 0);
    await mk('energyLedger.origin.lastIntervalQuality', 'Qualität letztes Intervall', 'string', 'text', '', 'none');
    await mk('energyLedger.origin.evidenceReady', 'Nachweiskandidat grundsätzlich bereit', 'boolean', 'indicator', '', false);
    await mk('energyLedger.origin.unassignedKwh', 'Nicht eindeutig zugeordnete Energie', 'number', 'value.energy', 'kWh', 0);
    await mk('energyLedger.origin.legalNote', 'Nachweishinweis', 'string', 'text', '', 'Nachweiskandidat; keine automatische behördliche Anerkennung oder Vergütungszusage.');
    await mk('energyLedger.origin.currentIntervalJson', 'Laufendes Intervall JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.origin.lastIntervalJson', 'Letztes Intervall JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.origin.intervalsRecentJson', 'Letzte 15-Minuten-Intervalle JSON', 'string', 'json', '', '[]');
    await mk('energyLedger.origin.summaryJson', 'Energieherkunft Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.origin.storageInventoryJson', 'Speicher-Herkunftskonto JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.origin.meterStatusJson', 'Zählerstatus JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.origin.configJson', 'Normalisierte Konfiguration JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.origin.configHistoryJson', 'Konfigurationshistorie JSON', 'string', 'json', '', '[]');
    await mk('energyLedger.origin.export.jsonUrl', 'JSON Export URL', 'string', 'text', '', '/api/ledger/energy-origin.json');
    await mk('energyLedger.origin.export.csvUrl', 'CSV Export URL', 'string', 'text', '', '/api/ledger/energy-origin.csv');
    await mk('energyLedger.origin.export.operatorUrl', 'Betreiberansicht URL', 'string', 'text', '', '/ledger/energy-origin');
    await mk('energyLedger.origin.diagnostics.lastError', 'Letzter Bilanzfehler', 'string', 'text', '', '');
    await mk('energyLedger.origin.diagnostics.lastTickJson', 'Letzte Bilanzprüfung JSON', 'string', 'json', '', '{}');
  }

  async _readJsonState<T>(id: string, fallback: T): Promise<T> {
    try {
      const st = await this.adapter.getStateAsync(id);
      if (!st || st.val === undefined || st.val === null || st.val === '') return fallback;
      const parsed = (typeof st.val === 'string' ? JSON.parse(st.val) : st.val) as T | null | undefined;
      return parsed === undefined || parsed === null ? fallback : parsed;
    } catch (_e) {
      return fallback;
    }
  }

  async _readStringState(id: string, fallback = ''): Promise<string> {
    try {
      const st = await this.adapter.getStateAsync(id);
      return st && st.val !== undefined && st.val !== null ? String(st.val) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  async _primeFromStates(): Promise<void> {
    if (this._primed) return;
    this._primed = true;
    this._currentInterval = await this._readJsonState('energyLedger.origin.currentIntervalJson', null);
    this._recentIntervals = await this._readJsonState('energyLedger.origin.intervalsRecentJson', []);
    if (!Array.isArray(this._recentIntervals)) this._recentIntervals = [];
    this._previousHash = await this._readStringState('energyLedger.origin.hashHead', '');
    this._configHash = await this._readStringState('energyLedger.origin.configHash', '');
    this._storageInventory = normalizeInventory(
      await this._readJsonState('energyLedger.origin.storageInventoryJson', {}),
      this._config().storage,
    );
    this._configHistory = await this._readJsonState('energyLedger.origin.configHistoryJson', []);
    if (!Array.isArray(this._configHistory)) this._configHistory = [];
  }

  async _readForeignStateSafe(dpId: unknown): Promise<AnyRecord | null> {
    const id = String(dpId || '').trim();
    if (!id) return null;
    try {
      if (this.adapter && typeof this.adapter.getForeignStateAsync === 'function') return await this.adapter.getForeignStateAsync(id);
      if (this.adapter && typeof this.adapter.getStateAsync === 'function') return await this.adapter.getStateAsync(id);
    } catch (_eRead) {}
    return null;
  }

  async _readSamples(config: AnyRecord, now = Date.now()): Promise<{ samples: Record<string, AnyRecord>; statusRows: AnyRecord[] }> {
    const samples: Record<string, AnyRecord> = {};
    const statusRows: AnyRecord[] = [];
    for (const meter of config.meters || []) {
      const state = await this._readForeignStateSafe(meter.dpId);
      const sample = meterSampleFromState(meter, state, now);
      const ageMs = sample && sample.ts ? Math.max(0, now - sample.ts) : null;
      const fresh = !!(sample && sample.valid && ageMs !== null && ageMs <= config.staleSeconds * 1000);
      samples[meter.id] = { ...sample, fresh };
      statusRows.push({
        meterId: meter.id,
        role: meter.role,
        chargePointId: meter.chargePointId || '',
        dpId: meter.dpId,
        valid: !!sample.valid,
        fresh,
        valueKwh: sample.valid ? Number(sample.valueKwh) : null,
        ts: sample.ts || 0,
        ageMs,
        ack: sample.ack !== false,
        serial: meter.serial || '',
        meterClass: meter.meterClass || 'none',
        declaredCompliant: meter.declaredCompliant === true,
      });
    }
    return { samples, statusRows };
  }

  _intervalState(config: AnyRecord, bounds: AnyRecord, startSamples: AnyRecord, lastSamples: AnyRecord, now: number, extra: AnyRecord = {}): AnyRecord {
    return {
      schema: 'nexowatt.energy-origin-current-interval.v1',
      siteId: config.siteId,
      configHash: config.configHash,
      startTs: bounds.startTs,
      endTs: bounds.endTs,
      intervalMinutes: bounds.intervalMinutes,
      startedAt: Number(extra.startedAt || now),
      lastUpdatedAt: now,
      startSamples: startSamples || {},
      lastSamples: lastSamples || {},
      gapDetected: extra.gapDetected === true,
      configChanged: extra.configChanged === true,
    };
  }

  _boundarySamples(meters: AnyRecord[], previousSamples: AnyRecord, currentSamples: AnyRecord, boundaryTs: number): AnyRecord {
    const out: AnyRecord = {};
    for (const meter of meters || []) {
      const prev = previousSamples && previousSamples[meter.id];
      const cur = currentSamples && currentSamples[meter.id];
      const sample = interpolateCumulativeSample(prev, cur, boundaryTs) || cur || prev || null;
      if (sample) out[meter.id] = { ...sample, ts: boundaryTs };
    }
    return out;
  }

  _recordConfig(config: AnyRecord, reason = 'configuration-changed'): void {
    const last = this._configHistory.length ? this._configHistory[0] : null;
    if (last && last.configHash === config.configHash) return;
    this._configHistory.unshift({
      schema: 'nexowatt.energy-origin-config-event.v1',
      ts: Date.now(),
      reason,
      configHash: config.configHash,
      siteId: config.siteId,
      edition: config.edition,
      intervalMinutes: config.intervalMinutes,
      meterBindings: (config.meters || []).map((m: any) => ({ meterId: m.id, role: m.role, dpId: m.dpId, chargePointId: m.chargePointId || '' })),
    });
    this._configHistory = this._configHistory.slice(0, 200);
  }

  async _finalizeInterval(config: AnyRecord, current: AnyRecord, boundarySamples: AnyRecord): Promise<AnyRecord | null> {
    const startTs = Number(current && current.startTs) || 0;
    const endTs = Number(current && current.endTs) || 0;
    if (!startTs || !endTs || endTs <= startTs) return null;
    const result = calculateOriginInterval({
      config,
      startSamples: current.startSamples || {},
      endSamples: boundarySamples || {},
      storageInventory: this._storageInventory,
      previousHash: this._previousHash,
      startTs,
      endTs,
      edition: config.edition,
    });
    const interval = result && result.interval;
    if (!interval) return null;
    this._storageInventory = normalizeInventory(result.storageInventory, config.storage);
    this._previousHash = String(interval.hash || '');
    this._recentIntervals.unshift(interval);
    this._recentIntervals = this._recentIntervals.slice(0, config.recentIntervalLimit);
    return interval;
  }

  _evidenceReady(config: AnyRecord, lastInterval: AnyRecord | null | undefined): boolean {
    if (!lastInterval || !lastInterval.evidence) return false;
    if (config.country === 'DE') return lastInterval.evidence.de && lastInterval.evidence.de.ready === true;
    if (config.country === 'NL') return lastInterval.evidence.nl && lastInterval.evidence.nl.ready === true;
    return !!((lastInterval.evidence.de && lastInterval.evidence.de.ready) || (lastInterval.evidence.nl && lastInterval.evidence.nl.ready));
  }

  async _publish(config: AnyRecord, status: string, meterStatus: AnyRecord[], lastInterval: AnyRecord | null, now: number, error: unknown = ''): Promise<void> {
    const a = this.adapter;
    if (!a) return;
    const summary = aggregateIntervals(this._recentIntervals);
    const evidenceReady = this._evidenceReady(config, lastInterval || this._recentIntervals[0]);
    const current = this._currentInterval || {};
    const currentPublic = {
      schema: current.schema || 'nexowatt.energy-origin-current-interval.v1',
      siteId: current.siteId || config.siteId,
      configHash: current.configHash || config.configHash,
      startTs: current.startTs || 0,
      endTs: current.endTs || 0,
      intervalMinutes: current.intervalMinutes || config.intervalMinutes,
      startedAt: current.startedAt || 0,
      lastUpdatedAt: current.lastUpdatedAt || 0,
      meterCount: Object.keys(current.lastSamples || {}).length,
      gapDetected: current.gapDetected === true,
      configChanged: current.configChanged === true,
    };
    const tickDiag = {
      ts: now,
      status,
      edition: config.edition,
      siteId: config.siteId,
      configHash: config.configHash,
      meterCount: (config.meters || []).length,
      chargePointCount: (config.chargePoints || []).length,
      currentInterval: currentPublic,
      lastIntervalEnd: lastInterval && lastInterval.endTs || 0,
      lastIntervalQuality: lastInterval && lastInterval.quality && lastInterval.quality.status || 'none',
      hashHead: this._previousHash,
      error: String(error || ''),
    };
    const state = (id: string, val: unknown): Promise<unknown> => a.setStateAsync(id, { val, ack: true });
    await state('energyLedger.origin.enabled', config.enabled === true);
    await state('energyLedger.origin.status', status);
    await state('energyLedger.origin.version', ORIGIN_LEDGER_VERSION);
    await state('energyLedger.origin.edition', config.edition);
    await state('energyLedger.origin.siteId', config.siteId);
    await state('energyLedger.origin.siteName', config.siteName);
    await state('energyLedger.origin.configHash', config.configHash);
    await state('energyLedger.origin.hashHead', this._previousHash);
    await state('energyLedger.origin.lastUpdate', now);
    await state('energyLedger.origin.lastIntervalEnd', lastInterval && lastInterval.endTs || 0);
    await state('energyLedger.origin.lastIntervalQuality', lastInterval && lastInterval.quality && lastInterval.quality.status || 'none');
    await state('energyLedger.origin.evidenceReady', evidenceReady);
    await state('energyLedger.origin.unassignedKwh', Number(summary.unknownKwh || 0));
    await state('energyLedger.origin.currentIntervalJson', JSON.stringify(this._currentInterval || {}));
    await state('energyLedger.origin.lastIntervalJson', JSON.stringify(lastInterval || this._recentIntervals[0] || {}));
    await state('energyLedger.origin.intervalsRecentJson', JSON.stringify(this._recentIntervals));
    await state('energyLedger.origin.summaryJson', JSON.stringify(summary));
    await state('energyLedger.origin.storageInventoryJson', JSON.stringify(this._storageInventory));
    await state('energyLedger.origin.meterStatusJson', JSON.stringify({ ts: now, staleSeconds: config.staleSeconds, rows: meterStatus || [] }));
    await state('energyLedger.origin.configJson', JSON.stringify(config || {}));
    await state('energyLedger.origin.configHistoryJson', JSON.stringify(this._configHistory));
    await state('energyLedger.origin.diagnostics.lastError', String(error || ''));
    await state('energyLedger.origin.diagnostics.lastTickJson', JSON.stringify(tickDiag));
  }

  async _process(_trigger = 'tick'): Promise<void> {
    await this._primeFromStates();
    const now = Date.now();
    const config = this._config();
    if (!config.enabled || (config.edition !== 'home' && config.edition !== 'pro')) {
      this._currentInterval = null;
      await this._publish(config, config.enabled ? 'license-blocked' : 'disabled', [], null, now);
      return;
    }
    if (!(config.meters || []).length) {
      await this._publish(config, 'configuration-incomplete', [], null, now, 'Keine kumulierten Energiezähler zugeordnet.');
      return;
    }
    try {
      const { samples, statusRows } = await this._readSamples(config, now);
      const bounds = intervalBounds(now, config.intervalMinutes);
      const configChanged = this._configHash !== config.configHash;
      if (configChanged) {
        this._recordConfig(config, this._configHash ? 'configuration-changed' : 'configuration-initialized');
        this._configHash = config.configHash;
        this._currentInterval = this._intervalState(config, bounds, samples, samples, now, { configChanged: true });
        if (!this._storageInventory || !this._storageInventory.schema) this._storageInventory = emptyStorageInventory(config.storage);
        await this._publish(config, 'collecting', statusRows, null, now);
        return;
      }
      if (!this._currentInterval || this._currentInterval.configHash !== config.configHash) {
        this._currentInterval = this._intervalState(config, bounds, samples, samples, now);
        await this._publish(config, 'collecting', statusRows, null, now);
        return;
      }
      let lastInterval = null;
      const current = this._currentInterval;
      if (now >= Number(current.endTs || 0)) {
        const boundarySamples = this._boundarySamples(config.meters, current.lastSamples || current.startSamples || {}, samples, Number(current.endTs));
        lastInterval = await this._finalizeInterval(config, current, boundarySamples);
        const nextBounds = intervalBounds(now, config.intervalMinutes);
        const gapDetected = nextBounds.startTs > Number(current.endTs || 0);
        const startSamples = gapDetected
          ? this._boundarySamples(config.meters, current.lastSamples || boundarySamples, samples, nextBounds.startTs)
          : boundarySamples;
        this._currentInterval = this._intervalState(config, nextBounds, startSamples, samples, now, { gapDetected });
      } else {
        this._currentInterval = { ...current, lastSamples: samples, lastUpdatedAt: now, configChanged: false };
      }
      const invalid = statusRows.filter((row: any) => !row.valid || !row.fresh);
      const status = lastInterval
        ? (lastInterval.quality && lastInterval.quality.status === 'complete' ? 'ok' : `interval-${lastInterval.quality && lastInterval.quality.status || 'incomplete'}`)
        : (invalid.length ? 'collecting-with-meter-warnings' : 'collecting');
      await this._publish(config, status, statusRows, lastInterval, now);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      await this._publish(config, 'error', [], null, now, message);
      if (this.adapter && this.adapter.log && typeof this.adapter.log.warn === 'function') this.adapter.log.warn(`[energy-origin-ledger] ${message}`);
    }
  }
}

module.exports = { EnergyOriginLedgerRuntime };
