/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/tariff-provider.ts
 * Quell-Hash: sha256:7e2eff0dbb3039403a5fa2415ede971c78ac4025ed75d156f9272851ffe8bae1
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/tariff-provider.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Lädt Tarifdaten über die registrierten Anbieter und stellt sie der weiteren Tarifverarbeitung bereit.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/tariff-provider.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/tariff-provider.js
 *
 * Direct dynamic-tariff provider integration. This module only reads provider APIs
 * and publishes normalized price states; all storage/EVCS decisions remain in tariff-vis.
 */
'use strict';

const { BaseModule } = require('./base');
const {
    fetchProvider,
    splitTodayTomorrow,
    currentAndAverage,
    publicRegistry,
} = require('../services/tariff-provider-registry');

class TariffProviderModule extends BaseModule {
    constructor(adapter, dpRegistry) {
        super(adapter, dpRegistry);
        this._intervals = [];
        this._lastFetchMs = 0;
        this._lastSuccessMs = 0;
        this._nextFetchMs = 0;
        this._lastCurrentKey = '';
        this._fetchPromise = null;
        this._lastError = '';
        this._consecutiveErrors = 0;
        this._effectiveRefreshMinutes = 0;
    }

    async init() {
        await this.adapter.setObjectNotExistsAsync('tariffProvider', {
            type: 'channel',
            common: { name: 'Dynamischer Tarifprovider' },
            native: {},
        });
        const mk = async (id, name, type, role, unit = '') => {
            const common = { name, type, role, read: true, write: false };
            if (unit) common.unit = unit;
            await this.adapter.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
        };
        await mk('tariffProvider.enabled', 'Tarifprovider aktiv', 'boolean', 'indicator');
        await mk('tariffProvider.providerId', 'Tarifprovider', 'string', 'text');
        await mk('tariffProvider.sourceId', 'Preisquelle', 'string', 'text');
        await mk('tariffProvider.status', 'Tarifprovider Status', 'string', 'text');
        await mk('tariffProvider.quality', 'Tarifdaten Qualität', 'string', 'text');
        await mk('tariffProvider.currentPriceEurPerKwh', 'Aktueller Preis', 'number', 'value', '€/kWh');
        await mk('tariffProvider.averagePriceEurPerKwh', 'Durchschnittspreis', 'number', 'value', '€/kWh');
        await mk('tariffProvider.pricesTodayJson', 'Preise heute JSON', 'string', 'json');
        await mk('tariffProvider.pricesTomorrowJson', 'Preise morgen JSON', 'string', 'json');
        await mk('tariffProvider.normalizedJson', 'Normalisierte Preiszeitreihe JSON', 'string', 'json');
        await mk('tariffProvider.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time');
        await mk('tariffProvider.lastSuccess', 'Letzter erfolgreicher Abruf', 'number', 'value.time');
        await mk('tariffProvider.nextUpdate', 'Nächster Abruf', 'number', 'value.time');
        await mk('tariffProvider.fresh', 'Tarifdaten frisch', 'boolean', 'indicator');
        await mk('tariffProvider.error', 'Tarifprovider Fehler', 'string', 'text');
        await mk('tariffProvider.intervalCount', 'Anzahl Preisintervalle', 'number', 'value');
        await mk('tariffProvider.effectiveRefreshMinutes', 'Effektives Abrufintervall', 'number', 'value', 'min');
        await mk('tariffProvider.consecutiveErrors', 'Aufeinanderfolgende Abruffehler', 'number', 'value');
        await mk('tariffProvider.statusJson', 'Tarifprovider Diagnose JSON', 'string', 'json');
    }

    _cfg() {
        const raw = this.adapter && this.adapter.config && this.adapter.config.tariffProvider;
        const cfg = raw && typeof raw === 'object' ? raw : {};
        return {
            enabled: cfg.enabled === true,
            providerId: String(cfg.providerId || 'manual-dp'),
            sourceId: String(cfg.sourceId || cfg.providerId || 'manual-dp'),
            activateTariffLogic: cfg.activateTariffLogic !== false,
            automaticMode: cfg.automaticMode !== false,
            autoCoupleDatapoints: cfg.autoCoupleDatapoints !== false,
            refreshMinutes: Math.max(5, Math.min(360, Math.round(Number(cfg.refreshMinutes) || 15))),
            maxStaleMinutes: Math.max(30, Math.min(4320, Math.round(Number(cfg.maxStaleMinutes) || 180))),
            resolutionMinutes: [15, 30, 60].includes(Number(cfg.resolutionMinutes)) ? Number(cfg.resolutionMinutes) : 15,
            country: String(cfg.country || this.adapter?.config?.countryProfile?.country || 'DE').toUpperCase() === 'NL' ? 'NL' : 'DE',
            timeZone: String(cfg.timeZone || (String(cfg.country || '').toUpperCase() === 'NL' ? 'Europe/Amsterdam' : 'Europe/Berlin')),
            timeoutMs: Math.max(3000, Math.min(60000, Math.round(Number(cfg.timeoutMs) || 15000))),
            ...cfg,
        };
    }

    async _set(id, val) {
        try { await this.adapter.setStateAsync(id, { val, ack: true }); } catch (_e) {}
    }

    _providerSourceId(cfg) {
        const providerId = String(cfg && cfg.providerId || 'manual-dp');
        return providerId === 'market-profile'
            ? String(cfg && cfg.sourceId || (String(cfg && cfg.country || '').toUpperCase() === 'NL' ? 'energyzero' : 'entsoe'))
            : providerId;
    }

    _localHour(nowMs, timeZone) {
        try {
            return Number(new Intl.DateTimeFormat('en-GB', {
                timeZone: String(timeZone || 'Europe/Berlin'),
                hour: '2-digit',
                hourCycle: 'h23',
            }).format(new Date(nowMs)));
        } catch (_e) {
            return new Date(nowMs).getUTCHours();
        }
    }

    _stableJitterFactor(seed) {
        // Provider APIs should not be hit by every NexoWatt installation at the
        // same second. A deterministic +/-10 % jitter keeps tests reproducible
        // while distributing real installations over the polling window.
        let hash = 2166136261;
        const text = String(seed || 'nexowatt');
        for (let i = 0; i < text.length; i += 1) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return 0.9 + ((hash >>> 0) % 2001) / 10000;
    }

    _baseRefreshMinutes(cfg, nowMs) {
        const requested = Math.max(5, Math.min(360, Math.round(Number(cfg && cfg.refreshMinutes) || 15)));
        const provider = this._providerSourceId(cfg);
        if (provider === 'tibber') {
            const split = splitTodayTomorrow(this._intervals, nowMs, cfg && cfg.timeZone);
            const hour = this._localHour(nowMs, cfg && cfg.timeZone);
            // Tibber recommends caching today/tomorrow and avoiding frequent
            // price requests. Once tomorrow is available, four refreshes per day
            // are sufficient. During the expected publication window we retry
            // hourly until tomorrow prices are present.
            if (split.tomorrow.length) return Math.max(requested, 360);
            if (hour >= 12 && hour <= 20) return Math.max(requested, 60);
            return Math.max(requested, 180);
        }
        if (provider === 'ostrom') return Math.max(requested, 60);
        if (provider === 'energyzero' || provider === 'entsoe') return Math.max(requested, 30);
        return requested;
    }

    _scheduleNextFetch(cfg, nowMs, success) {
        const baseMinutes = this._baseRefreshMinutes(cfg, nowMs);
        const errorFactor = success ? 1 : Math.pow(2, Math.min(5, Math.max(1, this._consecutiveErrors)));
        const effectiveMinutes = Math.min(720, Math.max(5, baseMinutes * errorFactor));
        const provider = this._providerSourceId(cfg);
        const dayKey = Math.floor(Number(nowMs) / (24 * 60 * 60 * 1000));
        const jitter = this._stableJitterFactor(`${this.adapter && this.adapter.namespace || 'nexowatt-ui'}:${provider}:${dayKey}:${this._consecutiveErrors}`);
        this._effectiveRefreshMinutes = Math.round(effectiveMinutes * 100) / 100;
        this._nextFetchMs = Math.round(Number(nowMs) + effectiveMinutes * 60 * 1000 * jitter);
        return this._nextFetchMs;
    }

    async _setTariffSettings(cfg) {
        if (!cfg.enabled || cfg.providerId === 'manual-dp' || !cfg.activateTariffLogic) return;
        const ns = String(this.adapter.namespace || `nexowatt-ui.${this.adapter.instance || 0}`);
        try {
            const dynId = `${ns}.settings.dynamicTariff`;
            const modeId = `${ns}.settings.tariffMode`;
            const dyn = await this.adapter.getForeignStateAsync(dynId).catch(() => null);
            if (!dyn || dyn.val !== true) await this.adapter.setForeignStateAsync(dynId, true, true);
            if (cfg.automaticMode) {
                const mode = await this.adapter.getForeignStateAsync(modeId).catch(() => null);
                if (!mode || Number(mode.val) !== 2) await this.adapter.setForeignStateAsync(modeId, 2, true);
            }
        } catch (e) {
            try { this.adapter.log.debug(`[TariffProvider] settings coupling skipped: ${String(e && e.message || e)}`); } catch (_e) {}
        }
    }

    async _publish(cfg, nowMs, statusOverride = '') {
        const split = splitTodayTomorrow(this._intervals, nowMs, cfg.timeZone);
        const ca = currentAndAverage(this._intervals, nowMs);
        const staleAge = this._lastSuccessMs ? nowMs - this._lastSuccessMs : Number.POSITIVE_INFINITY;
        const fresh = this._lastSuccessMs > 0 && staleAge <= cfg.maxStaleMinutes * 60 * 1000 && this._intervals.some((row) => Date.parse(row.endsAt) > nowMs);
        const status = statusOverride || (fresh ? 'ok' : (this._intervals.length ? 'stale' : 'waiting'));
        const quality = this._intervals[0] ? String(this._intervals[0].quality || 'unknown') : 'missing';
        // Never refresh the tariff-control datapoints with stale provider data.
        // tariff-vis uses state timestamps as its safety/freshness contract; writing
        // old prices every EMS tick would incorrectly make an expired curve look new.
        const current = fresh && Number.isFinite(ca.current) ? ca.current : null;
        const average = fresh && Number.isFinite(ca.average) ? ca.average : null;
        const currentKey = this._intervals.find((row) => Date.parse(row.startsAt) <= nowMs && Date.parse(row.endsAt) > nowMs)?.startsAt || '';

        await this._set('tariffProvider.enabled', cfg.enabled);
        await this._set('tariffProvider.providerId', cfg.providerId);
        await this._set('tariffProvider.sourceId', cfg.sourceId);
        await this._set('tariffProvider.status', status);
        await this._set('tariffProvider.quality', quality);
        await this._set('tariffProvider.currentPriceEurPerKwh', current);
        await this._set('tariffProvider.averagePriceEurPerKwh', average);
        // Curves are intentionally refreshed on every provider tick. Their ioBroker state timestamp
        // is the freshness contract consumed by tariff-vis.
        if (fresh && (this._lastCurrentKey !== currentKey || statusOverride)) {
            await this._set('tariffProvider.pricesTodayJson', JSON.stringify(split.today));
            await this._set('tariffProvider.pricesTomorrowJson', JSON.stringify(split.tomorrow));
            await this._set('tariffProvider.normalizedJson', JSON.stringify(this._intervals));
            this._lastCurrentKey = currentKey;
        } else if (!fresh) {
            // Explicitly clear the operational curves once their provider freshness
            // expires. The in-memory cache remains available for diagnostics, but no
            // new storage/EVCS tariff action may be started from it.
            await this._set('tariffProvider.pricesTodayJson', '[]');
            await this._set('tariffProvider.pricesTomorrowJson', '[]');
        }
        await this._set('tariffProvider.lastUpdate', nowMs);
        await this._set('tariffProvider.lastSuccess', this._lastSuccessMs || 0);
        await this._set('tariffProvider.nextUpdate', this._nextFetchMs || 0);
        await this._set('tariffProvider.fresh', fresh);
        await this._set('tariffProvider.error', this._lastError || '');
        await this._set('tariffProvider.intervalCount', this._intervals.length);
        await this._set('tariffProvider.effectiveRefreshMinutes', this._effectiveRefreshMinutes || 0);
        await this._set('tariffProvider.consecutiveErrors', this._consecutiveErrors || 0);
        const snapshot = {
            ts: nowMs,
            enabled: cfg.enabled,
            providerId: cfg.providerId,
            sourceId: cfg.sourceId,
            status,
            quality,
            fresh,
            currentPriceEurPerKwh: current,
            averagePriceEurPerKwh: average,
            intervalCount: this._intervals.length,
            todayCount: split.today.length,
            tomorrowCount: split.tomorrow.length,
            lastFetchMs: this._lastFetchMs,
            lastSuccessMs: this._lastSuccessMs,
            nextFetchMs: this._nextFetchMs,
            requestedRefreshMinutes: cfg.refreshMinutes,
            effectiveRefreshMinutes: this._effectiveRefreshMinutes || 0,
            consecutiveErrors: this._consecutiveErrors || 0,
            error: this._lastError || '',
        };
        await this._set('tariffProvider.statusJson', JSON.stringify(snapshot));
        try { this.adapter._tariffProviderSnapshot = snapshot; } catch (_e) {}
    }

    async _refresh(cfg, nowMs) {
        this._lastFetchMs = nowMs;
        try {
            const result = await fetchProvider(cfg);
            const intervals = Array.isArray(result && result.intervals) ? result.intervals : [];
            if (!intervals.length) throw new Error('provider_returned_no_intervals');
            this._intervals = intervals;
            this._lastSuccessMs = Date.now();
            this._lastError = '';
            this._consecutiveErrors = 0;
            this._scheduleNextFetch(cfg, this._lastSuccessMs, true);
            await this._publish(cfg, this._lastSuccessMs, 'ok');
        } catch (e) {
            const failedAt = Date.now();
            this._consecutiveErrors += 1;
            this._lastError = String(e && e.message || e || 'provider_error').slice(0, 500);
            this._scheduleNextFetch(cfg, failedAt, false);
            try { this.adapter.log.warn(`[TariffProvider] ${cfg.providerId}: ${this._lastError}`); } catch (_e) {}
            await this._publish(cfg, failedAt, this._intervals.length ? 'degraded' : 'error');
        }
    }

    async tick() {
        const cfg = this._cfg();
        const nowMs = Date.now();
        if (!cfg.enabled || cfg.providerId === 'manual-dp') {
            this._intervals = [];
            this._lastError = '';
            this._consecutiveErrors = 0;
            this._effectiveRefreshMinutes = 0;
            this._nextFetchMs = 0;
            await this._set('tariffProvider.enabled', cfg.enabled);
            await this._set('tariffProvider.providerId', cfg.providerId);
            await this._set('tariffProvider.sourceId', cfg.sourceId);
            await this._set('tariffProvider.status', cfg.enabled ? 'manual-datapoints' : 'disabled');
            await this._set('tariffProvider.fresh', false);
            await this._set('tariffProvider.currentPriceEurPerKwh', null);
            await this._set('tariffProvider.averagePriceEurPerKwh', null);
            await this._set('tariffProvider.pricesTodayJson', '[]');
            await this._set('tariffProvider.pricesTomorrowJson', '[]');
            await this._set('tariffProvider.normalizedJson', '[]');
            return;
        }

        await this._setTariffSettings(cfg);
        if (!this._fetchPromise && (!this._lastFetchMs || nowMs >= this._nextFetchMs || !this._intervals.length)) {
            this._fetchPromise = this._refresh(cfg, nowMs).finally(() => { this._fetchPromise = null; });
            await this._fetchPromise;
            return;
        }
        await this._publish(cfg, nowMs);
    }
}

module.exports = { TariffProviderModule, publicRegistry };
