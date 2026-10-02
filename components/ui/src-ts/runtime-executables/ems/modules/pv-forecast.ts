// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verknüpft konfigurierte PV-Prognosequellen und die automatische Prognose mit den von Planung und Anzeige verwendeten Werten.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/pv-forecast.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/pv-forecast.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `ems/modules/pv-forecast.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

'use strict';

const { BaseModule } = require('./base');
const { PV_FORECAST_DIAGNOSTIC_STATES, buildPvForecastDiagnostics, publishPvForecastDiagnostics } = require('../services/open-meteo-pv-forecast');
/**
 * PV Forecast Manager
 *
 * Responsibilities:
 * - Read PV forecast JSON datapoints (today + tomorrow) mapped in App-Center
 * - Normalize a provider specific JSON into a simple power curve (segments)
 * - Provide aggregated metrics (kWh next 6/12/24h) for other modules
 * - Expose diagnostic states under `forecast.pv.*`
 *
 * Design goals:
 * - Provider-agnostic (supports common schemas like forecast.solar, Solcast, custom JSON)
 * - Fail-safe: if parsing fails, the EMS keeps working (forecast is simply marked invalid)
 */
class PvForecastModule extends BaseModule {
  /**
   * Code-Teil: constructor
   * Zweck: Bereitet eine Instanz vor, legt interne Felder an und verbindet spätere Methoden mit dem Objektzustand.
   * Zusammenhang: Gehört zu EMS-Modul (Regelungs-, Diagnose- oder Beratungslogik innerhalb der EMS-Engine) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
   * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
   */
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);

    /** @type {string} */
    this._lastCurveHash = '';

    /** @type {boolean} */
    this._warnedNoMapping = false;
  }

  /**
   * Code-Teil: Methode `init`
   * Zweck: initialisiert UI/Modul, bindet Events oder bereitet Startzustände vor.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: init
   * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async init() {
    // States (diagnostics)
    await this.adapter.setObjectNotExistsAsync('forecast', {
      type: 'channel',
      common: { name: 'Forecast' },
      native: {},
    });

    await this.adapter.setObjectNotExistsAsync('forecast.pv', {
      type: 'channel',
      common: { name: 'PV Forecast' },
      native: {},
    });

    /**
     * Code-Teil: Arrow-Funktion `mk`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mk
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mk = async (id, name, type, role) => {
      await this.adapter.setObjectNotExistsAsync(id, {
        type: 'state',
        common: { name, type, role, read: true, write: false },
        native: {},
      });
    };

    await mk('forecast.pv.valid', 'PV Forecast gültig', 'boolean', 'indicator');
    await mk('forecast.pv.points', 'PV Forecast Punkte (Segmente)', 'number', 'value');
    await mk('forecast.pv.ageMs', 'PV Forecast Alter (ms)', 'number', 'value');
    await mk('forecast.pv.kwhNext6h', 'PV Forecast Energie nächste 6h (kWh)', 'number', 'value');
    await mk('forecast.pv.kwhNext12h', 'PV Forecast Energie nächste 12h (kWh)', 'number', 'value');
    await mk('forecast.pv.kwhNext24h', 'PV Forecast Energie nächste 24h (kWh)', 'number', 'value');
    await mk('forecast.pv.peakWNext24h', 'PV Forecast Peak nächste 24h (W)', 'number', 'value.power');
    await mk('forecast.pv.statusText', 'PV Forecast Status', 'string', 'text');
    await mk('forecast.pv.curveJson', 'PV Forecast Kurve (JSON, gekürzt)', 'string', 'json');
    await mk('forecast.pv.source', 'PV Forecast Quelle', 'string', 'text');
    await mk('forecast.pv.fallbackActive', 'PV Forecast Fallback aktiv', 'boolean', 'indicator');
    await mk('forecast.pv.planningSafetyPct', 'PV Forecast Planungssicherheit (%)', 'number', 'value.percent');
    await mk('forecast.pv.confidencePct', 'PV Forecast Vertrauen (%)', 'number', 'value.percent');
    for (const [key, name, type, role] of PV_FORECAST_DIAGNOSTIC_STATES) await mk(`forecast.pv.${key}`, name, type, role);

    // Register mapped forecast datapoints (App-Center)
    if (this.dp && typeof this.dp.upsert === 'function') {
      const dps = (this.adapter && this.adapter.config && this.adapter.config.datapoints)
        ? this.adapter.config.datapoints
        : {};

      const todayId = String(dps.pvForecastTodayJson || '').trim();
      const tomorrowId = String(dps.pvForecastTomorrowJson || '').trim();

      if (todayId) {
        await this.dp.upsert({ key: 'pv.forecastTodayJson', objectId: todayId, dataType: 'string' });
      }
      if (tomorrowId) {
        await this.dp.upsert({ key: 'pv.forecastTomorrowJson', objectId: tomorrowId, dataType: 'string' });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Code-Teil: Methode `_safeJsonParse`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _safeJsonParse
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _safeJsonParse(v) {
    if (v === null || v === undefined) return { ok: false, value: null, err: 'empty' };
    if (typeof v === 'object') return { ok: true, value: v, err: null };
    const s = String(v || '').trim();
    if (!s) return { ok: false, value: null, err: 'empty' };
    try {
      return { ok: true, value: JSON.parse(s), err: null };
    } catch (e) {
      return { ok: false, value: null, err: (e && e.message) ? e.message : String(e) };
    }
  }

  /**
   * Code-Teil: Methode `_parseTimeMs`
   * Zweck: normalisiert Eingaben/Anzeigeformate und schützt gegen ungültige Werte.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _parseTimeMs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _parseTimeMs(x) {
    if (x === null || x === undefined) return null;
    if (typeof x === 'number' && Number.isFinite(x)) {
      // Heuristic: treat seconds as epoch seconds
      if (x > 1e12) return x;
      if (x > 1e9) return x * 1000;
      return x;
    }
    if (x instanceof Date) {
      const t = x.getTime();
      return Number.isFinite(t) ? t : null;
    }
    const s = String(x).trim();
    if (!s) return null;

    // Accept both "2026-01-18 11:00:00" and ISO
    const iso = s.includes('T') ? s : s.replace(' ', 'T');
    const t = Date.parse(iso);
    if (Number.isFinite(t)) return t;

    // pvforecast JSONTable often uses German localized formats like:
    // - "18.01. 10:00" / "18.01. 10:00:00"
    // - "18.01.2026 10:00" / "18.01.2026 10:00:00"
    // (without timezone -> treat as local time)
    {
      const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (m) {
        const day = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const hasYear = !!m[3];
        let year = hasYear ? parseInt(m[3], 10) : (new Date()).getFullYear();
        if (hasYear && String(m[3]).length === 2) year += 2000;

        const hour = parseInt(m[4], 10);
        const minute = parseInt(m[5], 10);
        const second = m[6] ? parseInt(m[6], 10) : 0;

        let dt = new Date(year, month - 1, day, hour, minute, second);
        let ts = dt.getTime();
        if (Number.isFinite(ts)) {
          // If year is missing, handle the edge case around New Year:
          // e.g. today is Dec 31 and forecast contains "01.01. 00:15".
          if (!hasYear) {
            const now = Date.now();
            const sixMonths = 180 * 24 * 3600 * 1000;
            if (ts < (now - sixMonths)) {
              dt = new Date(year + 1, month - 1, day, hour, minute, second);
              ts = dt.getTime();
            }
          }
          return Number.isFinite(ts) ? ts : null;
        }
      }
    }

    // Time-only formats like "10:00" (assume today, local time)
    {
      const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (m) {
        const now = new Date();
        const hour = parseInt(m[1], 10);
        const minute = parseInt(m[2], 10);
        const second = m[3] ? parseInt(m[3], 10) : 0;
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, second);
        const ts = dt.getTime();
        return Number.isFinite(ts) ? ts : null;
      }
    }

    return null;
  }

  /**
   * Code-Teil: Methode `_num`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _num
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _num(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      let s = v.trim();
      if (!s) return NaN;
      // Support German decimal comma
      if (s.includes(',')) s = s.replace(/\./g, '').replace(/,/g, '.');
      else s = s.replace(/,/g, '');
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  /**
   * Code-Teil: Methode `_powerToW`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _powerToW
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _powerToW(n, keyHint) {
    const v = Number(n);
    if (!Number.isFinite(v)) return NaN;
    const k = String(keyHint || '').toLowerCase();
    if (k.includes('pv_estimate')) return v * 1000; // Solcast uses kW
    if (k.includes('kw')) return v * 1000;
    // Otherwise assume it's already W.
    return v;
  }

  /**
   * Code-Teil: Methode `_extractSegmentsFromParsed`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _extractSegmentsFromParsed
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _extractSegmentsFromParsed(parsed) {
    if (parsed === null || parsed === undefined) return [];

    // 1) Direct array
    if (Array.isArray(parsed)) {
      return this._segmentsFromArray(parsed);
    }

    // 2) Known wrapper objects
    if (typeof parsed === 'object') {
      const p = parsed;

      // Solcast: { forecasts: [...] }
      if (Array.isArray(p.forecasts)) {
        return this._segmentsFromArray(p.forecasts);
      }

      // forecast.solar: { result: { watts: {...} } } or { result: { watt_hours: {...} } }
      if (p.result && typeof p.result === 'object') {
        if (p.result.watts && typeof p.result.watts === 'object') {
          return this._segmentsFromTimeMap(p.result.watts);
        }
        if (p.result.watt_hours && typeof p.result.watt_hours === 'object') {
          // watt_hours is energy per hour; convert to average power for that hour
          return this._segmentsFromEnergyMap(p.result.watt_hours, 3600000);
        }
      }

      // Alternative: { watts: {...} }
      if (p.watts && typeof p.watts === 'object') {
        return this._segmentsFromTimeMap(p.watts);
      }

      // Alternative: { watt_hours: {...} }
      if (p.watt_hours && typeof p.watt_hours === 'object') {
        return this._segmentsFromEnergyMap(p.watt_hours, 3600000);
      }

      // If it's a plain {time->value} map
      if (this._looksLikeTimeMap(p)) {
        return this._segmentsFromTimeMap(p);
      }
    }

    return [];
  }

  /**
   * Code-Teil: Methode `_looksLikeTimeMap`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _looksLikeTimeMap
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _looksLikeTimeMap(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = Object.keys(obj);
    if (!keys.length) return false;
    // Check a handful of keys
    const sample = keys.slice(0, Math.min(5, keys.length));
    let timeKeys = 0;
    for (const k of sample) {
      const t = this._parseTimeMs(k);
      if (t !== null) timeKeys++;
    }
    return timeKeys >= Math.max(1, Math.floor(sample.length / 2));
  }

  /**
   * Code-Teil: Methode `_segmentsFromArray`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _segmentsFromArray
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _segmentsFromArray(arr) {
    const out = [];
    if (!Array.isArray(arr)) return out;

    for (const it of arr) {
      if (!it || typeof it !== 'object') continue;

      const keys = Object.keys(it);

      /**
       * Code-Teil: Arrow-Funktion `pick`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: pick
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const pick = (candidates) => {
        for (const c of candidates) {
          if (Object.prototype.hasOwnProperty.call(it, c) && it[c] !== null && it[c] !== undefined) {
            return { key: c, val: it[c] };
          }
        }
        return { key: '', val: null };
      };

      const tStartPick = pick([
        'startsAt', 'start', 'from',
        'time', 'Time',
        'timestamp',
        'period_start', 'periodStart',
        't',
        'date', 'datetime',
        // pvforecast JSONTable (UI)
        'Uhrzeit', 'uhrzeit',
        'Zeit', 'zeit',
      ]);
      const tEndPick = pick(['endsAt', 'end', 'to', 'period_end', 'periodEnd']);

      let tStart = this._parseTimeMs(tStartPick.val);
      const tEnd = this._parseTimeMs(tEndPick.val);

      // Some providers only give period_end (Solcast). Use it as anchor.
      if (tStart === null && tEnd !== null) tStart = tEnd;
      if (tStart === null) continue;

      const valPick = pick([
        // Solcast
        'pv_estimate',
        'pv_estimate10',
        'pv_estimate90',
        // generic
        'powerW',
        'power',
        'watts',
        'w',
        'value',
        // pvforecast JSONTable
        'Total', 'total',
        'Gesamt', 'gesamt',
        'Summe', 'summe',
        'Watt', 'watt',
        'Leistung', 'leistung',
      ]);

      const n = this._num(valPick.val);
      if (!Number.isFinite(n)) continue;
      let w = this._powerToW(n, valPick.key);
      if (!Number.isFinite(w)) continue;
      if (w < 0) w = 0;

      if (tEnd !== null && tEnd > tStart && (tEnd - tStart) >= 5 * 60 * 1000) {
        out.push({ t: tStart, dtMs: (tEnd - tStart), w });
      } else {
        // Anchor point, dt inferred later
        out.push({ t: tStart, dtMs: 0, w });
      }
    }

    return this._inferDtForAnchors(out);
  }

  /**
   * Code-Teil: Methode `_segmentsFromTimeMap`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _segmentsFromTimeMap
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _segmentsFromTimeMap(mapObj) {
    const anchors = [];
    if (!mapObj || typeof mapObj !== 'object') return [];
    for (const [k, v] of Object.entries(mapObj)) {
      const t = this._parseTimeMs(k);
      if (t === null) continue;
      const n = this._num(v);
      if (!Number.isFinite(n)) continue;
      let w = this._powerToW(n, 'watts');
      if (!Number.isFinite(w)) continue;
      if (w < 0) w = 0;
      anchors.push({ t, dtMs: 0, w });
    }
    return this._inferDtForAnchors(anchors);
  }

  /**
   * Code-Teil: Methode `_segmentsFromEnergyMap`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _segmentsFromEnergyMap
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _segmentsFromEnergyMap(energyMapObj, defaultDtMs) {
    const anchors = [];
    if (!energyMapObj || typeof energyMapObj !== 'object') return [];
    const dtMs = (Number.isFinite(defaultDtMs) && defaultDtMs > 0) ? defaultDtMs : 3600000;

    for (const [k, v] of Object.entries(energyMapObj)) {
      const t = this._parseTimeMs(k);
      if (t === null) continue;
      const wh = this._num(v);
      if (!Number.isFinite(wh)) continue;
      // Convert Wh per interval to average W
      const w = Math.max(0, (wh * 3600000) / dtMs);
      anchors.push({ t, dtMs, w });
    }
    // If dt is already set for all, just sort and return.
    anchors.sort((a, b) => a.t - b.t);
    return anchors;
  }

  /**
   * Code-Teil: Methode `_inferDtForAnchors`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _inferDtForAnchors
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _inferDtForAnchors(list) {
    if (!Array.isArray(list) || !list.length) return [];
    const explicit = list.filter((p) => Number.isFinite(p.dtMs) && p.dtMs > 0);
    const anchors = list.filter((p) => !(Number.isFinite(p.dtMs) && p.dtMs > 0));

    // Preserve explicit segments
    const segs = explicit.map((p) => ({ t: p.t, dtMs: p.dtMs, w: p.w }));

    if (!anchors.length) {
      segs.sort((a, b) => a.t - b.t);
      return segs;
    }

    // Sort anchors
    anchors.sort((a, b) => a.t - b.t);

    // Infer a typical interval
    const diffs = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      const d = anchors[i + 1].t - anchors[i].t;
      if (Number.isFinite(d) && d >= 5 * 60 * 1000 && d <= 4 * 3600000) diffs.push(d);
    }
    diffs.sort((a, b) => a - b);
    const typical = diffs.length ? diffs[Math.floor(diffs.length / 2)] : 3600000;
    const typicalDt = (Number.isFinite(typical) && typical >= 5 * 60 * 1000 && typical <= 4 * 3600000) ? typical : 3600000;

    for (let i = 0; i < anchors.length; i++) {
      const cur = anchors[i];
      const next = anchors[i + 1];
      let dt = typicalDt;
      if (next && Number.isFinite(next.t)) {
        const d = next.t - cur.t;
        if (Number.isFinite(d) && d >= 5 * 60 * 1000 && d <= 4 * 3600000) dt = d;
      }
      segs.push({ t: cur.t, dtMs: dt, w: cur.w });
    }

    // Normalize: sort and drop invalid
    segs.sort((a, b) => a.t - b.t);
    return segs.filter((s) => Number.isFinite(s.t) && Number.isFinite(s.dtMs) && s.dtMs > 0 && Number.isFinite(s.w));
  }

  /**
   * Code-Teil: Methode `_integrateKwh`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _integrateKwh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _integrateKwh(segments, fromMs, toMs, clampW) {
    if (!Array.isArray(segments) || !segments.length) return 0;
    const a = Number(fromMs);
    const b = Number(toMs);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;

    let wh = 0;
    for (const s of segments) {
      const t0 = Number(s.t);
      const dt = Number(s.dtMs);
      if (!Number.isFinite(t0) || !Number.isFinite(dt) || dt <= 0) continue;
      const t1 = t0 + dt;
      if (t1 <= a || t0 >= b) continue;
      const ov0 = Math.max(a, t0);
      const ov1 = Math.min(b, t1);
      const ovMs = ov1 - ov0;
      if (!(ovMs > 0)) continue;

      let w = Number(s.w);
      if (!Number.isFinite(w)) continue;
      if (w < 0) w = 0;
      if (Number.isFinite(clampW) && clampW > 0) w = Math.min(w, clampW);

      wh += w * (ovMs / 3600000);
    }
    return wh / 1000;
  }

  /**
   * Code-Teil: Methode `_setIfChanged`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _setIfChanged
   * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  _syncForecastUiCache(id, value, ts = Date.now()) {
    try {
      const cached = this.adapter && this.adapter.stateCache ? this.adapter.stateCache[id] : null;
      if (cached && Object.is(cached.value, value)) return;
      if (this.adapter && typeof this.adapter.updateValue === 'function') {
        this.adapter.updateValue(id, value, ts, { raw: false });
      }
    } catch {
      // The ioBroker state remains authoritative if the UI cache is unavailable.
    }
  }

  async _setIfChanged(id, val) {
    const v = (val === undefined) ? null : val;
    try {
      const cur = await this.adapter.getStateAsync(id);
      const curVal = cur ? cur.val : null;
      // Persisted forecast states may already contain the same value after an
      // adapter restart. They still need to be primed into stateCache because
      // the customer frontend is served from /api/state, not directly from DB.
      // eslint-disable-next-line eqeqeq
      if (cur && curVal == v) {
        this._syncForecastUiCache(id, v, cur.ts || Date.now());
        return;
      }
      await this.adapter.setStateAsync(id, v, true);
      this._syncForecastUiCache(id, v, Date.now());
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Tick
  // ---------------------------------------------------------------------------

  /**
   * Code-Teil: Methode `tick`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt fachlich an Adapter-StateCache, Mapping/Datapoints und den EMS-Modulen; Änderungen können LIVE, History und Regelungslogik beeinflussen.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: tick
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von EMS-Modul: Regelung, Diagnose oder Beratung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async tick() {
    const now = Date.now();

    const cachedSetting = (key, fallback) => {
      try {
        const entry = this.adapter && this.adapter.stateCache && this.adapter.stateCache[`settings.${key}`];
        return entry && entry.value !== undefined && entry.value !== null ? entry.value : fallback;
      } catch (_e) { return fallback; }
    };
    const asBoolean = (value, fallback = false) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      const normalized = String(value ?? '').trim().toLowerCase();
      if (['true', '1', 'on', 'yes', 'ja', 'an', 'active', 'enabled'].includes(normalized)) return true;
      if (['false', '0', 'off', 'no', 'nein', 'aus', 'inactive', 'disabled'].includes(normalized)) return false;
      return fallback;
    };
    const sourceRaw = String(cachedSetting('forecastSourceMode', 'auto') || 'auto').trim().toLowerCase();
    const sourceMode = ['open-meteo', 'openmeteo', 'weather'].includes(sourceRaw)
      ? 'open-meteo'
      : (['datapoint', 'mapping', 'appcenter', 'app-center'].includes(sourceRaw)
        ? 'datapoint'
        : (['disabled', 'off', 'aus'].includes(sourceRaw) ? 'disabled' : 'auto'));
    const openMeteoEnabled = asBoolean(cachedSetting('openMeteoPvEnabled', false), false);
    const fallbackEnabled = asBoolean(cachedSetting('forecastFallbackToDatapoints', true), true);
    const integrated = this.adapter && this.adapter._openMeteoPvForecast && typeof this.adapter._openMeteoPvForecast === 'object'
      ? this.adapter._openMeteoPvForecast : null;
    const integratedAgeMs = integrated && Number.isFinite(Number(integrated.ts)) ? Math.max(0, now - Number(integrated.ts)) : Number.POSITIVE_INFINITY;
    const useIntegrated = sourceMode !== 'disabled' && sourceMode !== 'datapoint' && openMeteoEnabled
      && integrated && asBoolean(integrated.valid, false) && Array.isArray(integrated.curve) && integrated.curve.length > 0 && integratedAgeMs <= 2 * 3600000;
    if (sourceMode === 'disabled') {
      const diagnostic = buildPvForecastDiagnostics({ now: 0, mappedAgeMs: 0 });
      this.adapter._pvForecast = { ts: now, valid: false, ageMs: null, source: 'disabled', planningSafetyPct: 85, confidencePct: 0, points: 0, ...diagnostic, kwhNext6h: 0, kwhNext12h: 0, kwhNext24h: 0, peakWNext24h: 0, curve: [] };
      await this._setIfChanged('forecast.pv.valid', false); await this._setIfChanged('forecast.pv.source', 'disabled'); await this._setIfChanged('forecast.pv.fallbackActive', false); await this._setIfChanged('forecast.pv.statusText', 'PV-Prognose deaktiviert');
      await publishPvForecastDiagnostics((id, value) => this._setIfChanged(id, value), diagnostic);
      return;
    }

    let ageToday = Number.POSITIVE_INFINITY;
    let ageTomorrow = Number.POSITIVE_INFINITY;
    let segs = [];
    let parseErrs = [];
    let forecastSource = useIntegrated ? 'open-meteo-gti' : 'appcenter-mapping';
    let fallbackActive = false;
    let planningSafetyPct = useIntegrated ? Math.max(30, Math.min(100, Number(integrated.planningSafetyPct) || 85)) : 85;
    if (useIntegrated) {
      segs = integrated.curve.slice();
      ageToday = integratedAgeMs;
      ageTomorrow = integratedAgeMs;
    } else {
      let rawToday = null;
      let rawTomorrow = null;
      if (this.dp) {
        rawToday = this.dp.getRaw('pv.forecastTodayJson'); rawTomorrow = this.dp.getRaw('pv.forecastTomorrowJson');
        ageToday = this.dp.getAgeMs('pv.forecastTodayJson'); ageTomorrow = this.dp.getAgeMs('pv.forecastTomorrowJson');
      }
      const hasAnyMapping = rawToday !== null && rawToday !== undefined || rawTomorrow !== null && rawTomorrow !== undefined;
      const mayFallback = sourceMode !== 'open-meteo' && (sourceMode === 'datapoint' || fallbackEnabled);
      if (!hasAnyMapping || !mayFallback) {
        if (!this._warnedNoMapping) { this.adapter.log.info('[PvForecast] Keine nutzbare PV-Prognosequelle verfügbar.'); this._warnedNoMapping = true; }
        const integratedError = integrated ? String(integrated.error || integrated.statusText || '') : '';
        const noSourceText = openMeteoEnabled ? (integratedError || 'Open-Meteo nicht verfügbar und kein AppCenter-Forecast gemappt') : 'Kein PV Forecast gemappt';
        const diagnostic = buildPvForecastDiagnostics({ integrated, useIntegrated: !!integrated, now, error: integratedError });
        this.adapter._pvForecast = { ts: now, valid: false, ageMs: null, source: useIntegrated ? 'open-meteo-gti' : 'none', planningSafetyPct, confidencePct: 0, points: 0, ...diagnostic, kwhNext6h: 0, kwhNext12h: 0, kwhNext24h: 0, peakWNext24h: 0, curve: [] };
        await this._setIfChanged('forecast.pv.valid', false); await this._setIfChanged('forecast.pv.source', 'none'); await this._setIfChanged('forecast.pv.fallbackActive', sourceMode === 'auto'); await this._setIfChanged('forecast.pv.statusText', noSourceText); await this._setIfChanged('forecast.pv.curveJson', '[]');
        await publishPvForecastDiagnostics((id, value) => this._setIfChanged(id, value), diagnostic);
        return;
      }
      this._warnedNoMapping = false;
      fallbackActive = sourceMode === 'auto' && openMeteoEnabled;
      const strToday = typeof rawToday === 'string' ? rawToday : rawToday && typeof rawToday === 'object' ? JSON.stringify(rawToday) : '';
      const strTomorrow = typeof rawTomorrow === 'string' ? rawTomorrow : rawTomorrow && typeof rawTomorrow === 'object' ? JSON.stringify(rawTomorrow) : '';
      const parsedToday = this._safeJsonParse(strToday); const parsedTomorrow = this._safeJsonParse(strTomorrow);
      if (parsedToday.ok) segs = segs.concat(this._extractSegmentsFromParsed(parsedToday.value)); else if (strToday && parsedToday.err) parseErrs.push(`heute: ${parsedToday.err}`);
      if (parsedTomorrow.ok) segs = segs.concat(this._extractSegmentsFromParsed(parsedTomorrow.value)); else if (strTomorrow && parsedTomorrow.err) parseErrs.push(`morgen: ${parsedTomorrow.err}`);
    }

    // Normalize & sort
    segs = segs
      .filter((s) => s && Number.isFinite(s.t) && Number.isFinite(s.dtMs) && s.dtMs > 0 && Number.isFinite(s.w))
      .map((s) => ({ t: Number(s.t), dtMs: Number(s.dtMs), w: Math.max(0, Number(s.w)) }))
      .sort((a, b) => a.t - b.t);

    // Keep only a reasonable window (avoid huge JSON in memory)
    const maxKeepMs = 48 * 3600000;
    segs = segs.filter((s) => (s.t + s.dtMs) >= (now - 2 * 3600000) && s.t <= (now + maxKeepMs));

    // Heuristic: Some sources (notably pvforecast JSONTable) may provide kW values
    // without an explicit "kW" hint in the key. If the forecast peak is suspiciously
    // low (<200) but non-zero values exist, assume the unit is kW and scale to W.
    // This keeps PV-aware decisions usable out-of-the-box.
    let scaledFromKw = false;
    if (segs.length) {
      const nonZero = segs.filter((s) => s.w > 0);
      const maxNonZero = nonZero.reduce((m, s) => Math.max(m, s.w), 0);
      const hasFraction = nonZero.some((s) => Math.abs(s.w - Math.round(s.w)) > 1e-6);
      if (maxNonZero > 0 && maxNonZero < 200 && (hasFraction || maxNonZero < 50)) {
        segs = segs.map((s) => ({ t: s.t, dtMs: s.dtMs, w: s.w * 1000 }));
        scaledFromKw = true;
      }
    }

    // Compute metrics
    const t6 = now + 6 * 3600000;
    const t12 = now + 12 * 3600000;
    const t24 = now + 24 * 3600000;

    const kwh6 = this._integrateKwh(segs, now, t6);
    const kwh12 = this._integrateKwh(segs, now, t12);
    const kwh24 = this._integrateKwh(segs, now, t24);

    let peakW = 0;
    for (const s of segs) {
      const t0 = s.t;
      const t1 = s.t + s.dtMs;
      if (t1 <= now || t0 >= t24) continue;
      if (s.w > peakW) peakW = s.w;
    }
    const anyFuture = segs.some((s) => (s.t + s.dtMs) > now);
    const positivePoints = segs.filter((s) => s.w > 0 && (s.t + s.dtMs) > now).length;
    const currentSegment = segs.find((s) => s.t <= now && (s.t + s.dtMs) > now);
    const powerNowW = currentSegment ? Math.max(0, Number(currentSegment.w) || 0) : 0;
    // A complete all-zero radiation curve is still a valid forecast (night,
    // snow cover or polar winter). Validity describes data availability, not
    // whether the expected production is currently positive.
    const valid = anyFuture && segs.length > 0;

    const ageMs = Math.min(
      Number.isFinite(ageToday) ? ageToday : Number.POSITIVE_INFINITY,
      Number.isFinite(ageTomorrow) ? ageTomorrow : Number.POSITIVE_INFINITY,
    );
    const ageEff = Number.isFinite(ageMs) && ageMs !== Number.POSITIVE_INFINITY ? ageMs : null;

    // Build a short curve JSON for debugging (first ~48 points)
    const curveShort = segs.slice(0, 64).map((s) => ({ t: s.t, dtMs: s.dtMs, w: Math.round(s.w) }));
    const curveHash = JSON.stringify(curveShort);

    // Status text
    let statusText = '';
    if (!valid) {
      statusText = parseErrs.length
        ? `PV Forecast ungültig (${parseErrs.join('; ')})`
        : 'PV Forecast ungültig (keine Daten)';
    } else {
      const ageTxt = (ageEff !== null && ageEff > 0)
        ? (ageEff > 3600000 ? `${Math.round(ageEff / 3600000)}h alt` : `${Math.round(ageEff / 60000)}min alt`)
        : 'frisch';
      statusText = positivePoints > 0
        ? `PV Forecast ok [${forecastSource}]: ${kwh24.toFixed(1)} kWh/24h (Peak ${Math.round(peakW)} W), ${ageTxt}${scaledFromKw ? ' (kW erkannt)' : ''}`
        : `PV Forecast ok [${forecastSource}]: aktuell kein erwarteter PV-Ertrag im Planungshorizont, ${ageTxt}`;
    }

    // Publish snapshot for other modules (synchronous access)
    const confidencePct = ageEff === null ? 70 : Math.max(0, Math.min(100, Math.round(100 * Math.max(0, 1 - ageEff / (6 * 3600000)))));
    const diagnostic = buildPvForecastDiagnostics({ integrated, useIntegrated, now, mappedAgeMs: ageEff, positivePoints, powerNowW, error: useIntegrated ? String(integrated.error || '') : parseErrs.join('; ') });
    this.adapter._pvForecast = {
      ts: now,
      ...diagnostic,
      valid,
      ageMs: ageEff,
      source: forecastSource,
      fallbackActive,
      planningSafetyPct,
      confidencePct,
      points: segs.length,
      kwhNext6h: kwh6,
      kwhNext12h: kwh12,
      kwhNext24h: kwh24,
      peakWNext24h: peakW,
      curve: segs,
    };

    // Write states (only if changed)
    await this._setIfChanged('forecast.pv.valid', valid);
    await this._setIfChanged('forecast.pv.points', segs.length);
    await this._setIfChanged('forecast.pv.ageMs', ageEff);
    await this._setIfChanged('forecast.pv.kwhNext6h', Number.isFinite(kwh6) ? Number(kwh6.toFixed(3)) : 0);
    await this._setIfChanged('forecast.pv.kwhNext12h', Number.isFinite(kwh12) ? Number(kwh12.toFixed(3)) : 0);
    await this._setIfChanged('forecast.pv.kwhNext24h', Number.isFinite(kwh24) ? Number(kwh24.toFixed(3)) : 0);
    await this._setIfChanged('forecast.pv.peakWNext24h', Math.round(peakW));
    await this._setIfChanged('forecast.pv.statusText', statusText);
    await this._setIfChanged('forecast.pv.source', forecastSource);
    await this._setIfChanged('forecast.pv.fallbackActive', fallbackActive);
    await this._setIfChanged('forecast.pv.planningSafetyPct', planningSafetyPct);
    await this._setIfChanged('forecast.pv.confidencePct', confidencePct);
    await publishPvForecastDiagnostics((id, value) => this._setIfChanged(id, value), diagnostic);

    if (curveHash !== this._lastCurveHash) {
      this._lastCurveHash = curveHash;
      await this._setIfChanged('forecast.pv.curveJson', curveHash);
    }
  }
}

module.exports = { PvForecastModule };
