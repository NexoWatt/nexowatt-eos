// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verknüpft die Energiebilanz-/Ledger-Funktion mit dem Laufzeitkontext und den dafür veröffentlichten Werten.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/energy-ledger.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/energy-ledger.js
 *
 * Zweck:
 * Lokales kWh-Ledger als EOS-Grundlage. Das Modul macht aus den bereits
 * neutralisierten NexoWatt-Sessiondaten kompakte Ledger-Einträge mit Herkunft,
 * Nutzung, Solar-/Netzanteil und Wert. Es ist bewusst read-only und schreibt
 * keine Hardware-Sollwerte.
 *
 * Wichtig für die Produktstrategie:
 * - Energieherkunft & Ladebilanz steht in Home und Pro zur Verfügung.
 * - Die Quelle ist herstellerneutral. DC-Station-Displays, OCPP, Modbus, MQTT,
 *   REST, Herstelleradapter und NexoWatt-Devices können später Daten liefern.
 * - In 0.8.26 nutzt die Grundlage zunächst die persistierten DC-Station-Display-
 *   Last-Session-Daten (`chargeKiosk.stations.*.lastSessionsByLpJson`).
 * - Detaildaten werden kompakt als JSON-Listen/Summenstates gehalten. Es werden
 *   keine tausenden Einzel-States pro kWh erzeugt.
 *
 * Nachweisgrenze:
 * Das Modul erstellt eine prüfbare Mess- und Herkunftsbilanz sowie technische
 * Nachweiskandidaten. Eichrechts- oder Behördenanerkennung entsteht nur durch
 * das konkrete Messsystem, Messkonzept und das jeweils gültige Verfahren.
 *
 * 0.8.27:
 * - CSV-API, Betreiberansicht, Monats-/Jahres-Exportbasis und Energy-Wallet-Bridge
 *   lesen dieselben bestehenden Ledger-Summen und denselben Entry-Puffer.
 * - Es wird bewusst kein zweiter Ledger aufgebaut und keine Session doppelt gezählt.
 * - Quelle je kWh wird als kompakter Quellenmix je Entry ergänzt, nicht als Masse
 *   einzelner ioBroker-kWh-States.
 */
'use strict';

const { BaseModule } = require('./base');
const { EnergyOriginLedgerRuntime } = require('../services/energy-origin-ledger-runtime');

const LEDGER_VERSION = 'nexowatt.local-kwh-ledger.v2';
const LEDGER_EXPORT_VERSION = 'nexowatt.local-kwh-ledger-export.v2';
const LEDGER_OPERATOR_VIEW_VERSION = 'nexowatt.local-kwh-ledger-operator-view.v1';
const LEDGER_WALLET_BRIDGE_VERSION = 'nexowatt.energy-wallet-ledger-bridge.v1';
const DEFAULT_RECENT_LIMIT = 200;
const DEFAULT_PROCESSED_LIMIT = 2000;

function safeId(input, fallback = 'item') {
  const s = String(input || '').trim().toLowerCase();
  return (s || fallback)
    .replace(/[^a-z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || fallback;
}

function normalizeLp(input) {
  const s = String(input || '').trim().toLowerCase();
  const m = s.match(/^(?:lp|ladepunkt|connector|evcs)?\s*([0-9]+)$/i) || s.match(/^lp([0-9]+)$/i);
  return m ? `lp${Math.max(1, Math.round(Number(m[1]) || 1))}` : safeId(s, 'lp');
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value, digits = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, Math.max(0, Math.min(6, Math.round(Number(digits) || 0))));
  return Math.round(n * f) / f;
}

function localDayKey(ms = Date.now()) {
  const d = new Date(Number(ms) || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localMonthKey(ms = Date.now()) {
  const d = new Date(Number(ms) || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function localYearKey(ms = Date.now()) {
  const d = new Date(Number(ms) || Date.now());
  return String(d.getFullYear());
}

function emptyPeriod() {
  return {
    entryCount: 0,
    totalKwh: 0,
    localKwh: 0,
    solarKwh: 0,
    gridKwh: 0,
    valueEur: 0,
    dcSessionKwh: 0,
    stationIds: [],
    lpIds: [],
  };
}

function uniquePush(list, value) {
  const s = String(value || '').trim();
  if (!s) return list;
  if (!list.includes(s)) list.push(s);
  return list;
}

function addToPeriod(acc, entry) {
  if (!acc || !entry) return;
  acc.entryCount += 1;
  acc.totalKwh = round(acc.totalKwh + num(entry.totalKwh, 0), 3);
  acc.localKwh = round(acc.localKwh + num(entry.localKwh, 0), 3);
  acc.solarKwh = round(acc.solarKwh + num(entry.solarKwh, 0), 3);
  acc.gridKwh = round(acc.gridKwh + num(entry.gridKwh, 0), 3);
  acc.valueEur = round(acc.valueEur + num(entry.valueEur, 0), 2);
  acc.dcSessionKwh = round(acc.dcSessionKwh + num(entry.totalKwh, 0), 3);
  uniquePush(acc.stationIds, entry.stationId);
  uniquePush(acc.lpIds, `${entry.stationId}.${entry.lp}`);
}

function buildKwhSourceMix(totalKwh, solarKwh, gridKwh, valueEur = 0) {
  const total = Math.max(0, round(totalKwh, 3));
  const solar = Math.max(0, Math.min(total, round(solarKwh, 3)));
  const grid = Math.max(0, Math.min(Math.max(0, total - solar), round(gridKwh, 3)));
  const unknown = Math.max(0, round(total - solar - grid, 3));
  const value = Math.max(0, round(valueEur, 2));
  const part = (source, label, kwh, local) => ({
    source,
    label,
    kwh: round(kwh, 3),
    local: !!local,
    sharePercent: total > 0 ? Math.max(0, Math.min(100, Math.round((Number(kwh || 0) / Math.max(total, 0.0001)) * 100))) : 0,
    valueEur: total > 0 ? round(value * Number(kwh || 0) / Math.max(total, 0.0001), 2) : 0,
  });
  const rows = [];
  if (solar > 0) rows.push(part('local-solar', 'Lokaler PV-/Solarstrom', solar, true));
  if (grid > 0) rows.push(part('grid-import', 'Netzstrom', grid, false));
  if (unknown > 0) rows.push(part('unknown-balance', 'Nicht eindeutig zugeordnet', unknown, false));
  if (!rows.length) rows.push(part('none', 'Keine kWh-Zuordnung', 0, false));
  return {
    schema: 'nexowatt.local-kwh-source-mix.v1',
    totalKwh: total,
    localKwh: solar,
    solarKwh: solar,
    gridKwh: grid,
    unknownKwh: unknown,
    rows,
    label: rows.filter(r => r.kwh > 0).map(r => `${r.label}: ${r.kwh.toFixed(3)} kWh`).join(' · ') || 'Keine kWh-Zuordnung',
  };
}

function addEntrySourceFields(entry) {
  const e = entry && typeof entry === 'object' ? { ...entry } : {};
  const mix = e.kwhSourceMix && typeof e.kwhSourceMix === 'object'
    ? e.kwhSourceMix
    : buildKwhSourceMix(e.totalKwh, e.solarKwh ?? e.localKwh, e.gridKwh, e.valueEur);
  e.kwhSourceMix = mix;
  e.kwhSources = mix.rows || [];
  e.sourceLabel = mix.label || '';
  return e;
}

function filterEntriesByPeriod(entries, period, keys) {
  const p = String(period || 'recent').trim().toLowerCase();
  const list = Array.isArray(entries) ? entries : [];
  if (p === 'today' || p === 'day') return list.filter(e => e && e.dayKey === keys.dayKey);
  if (p === 'month') return list.filter(e => e && e.monthKey === keys.monthKey);
  if (p === 'year') return list.filter(e => e && e.yearKey === keys.yearKey);
  if (p === 'all') return list.slice();
  return list.slice(0, 200);
}

function sourceSummaryFromEntries(entries) {
  const bySource = Object.create(null);
  const byStation = Object.create(null);
  for (const raw of Array.isArray(entries) ? entries : []) {
    const entry = addEntrySourceFields(raw);
    for (const part of entry.kwhSources || []) {
      const key = String(part.source || 'unknown');
      if (!bySource[key]) bySource[key] = { source: key, label: part.label || key, kwh: 0, valueEur: 0, local: !!part.local };
      bySource[key].kwh += Number(part.kwh) || 0;
      bySource[key].valueEur += Number(part.valueEur) || 0;
    }
    const stationId = safeId(entry.stationId, 'station');
    if (!byStation[stationId]) byStation[stationId] = { stationId, stationName: entry.stationName || stationId, totalKwh: 0, localKwh: 0, gridKwh: 0, valueEur: 0, sessions: 0 };
    byStation[stationId].totalKwh += Number(entry.totalKwh) || 0;
    byStation[stationId].localKwh += Number(entry.localKwh ?? entry.solarKwh) || 0;
    byStation[stationId].gridKwh += Number(entry.gridKwh) || 0;
    byStation[stationId].valueEur += Number(entry.valueEur) || 0;
    byStation[stationId].sessions += 1;
  }
  const roundRow = row => {
    const out = { ...row };
    for (const key of ['kwh', 'totalKwh', 'localKwh', 'gridKwh']) if (Object.prototype.hasOwnProperty.call(out, key)) out[key] = round(out[key], 3);
    if (Object.prototype.hasOwnProperty.call(out, 'valueEur')) out.valueEur = round(out.valueEur, 2);
    return out;
  };
  return {
    schema: 'nexowatt.local-kwh-ledger-source-summary.v1',
    bySource: Object.values(bySource).map(roundRow),
    byStation: Object.values(byStation).map(roundRow),
  };
}

function csvFoundationForPeriod(period, entries, summary) {
  const s = summary && typeof summary === 'object' ? summary : {};
  const keys = { dayKey: s.today && s.today.key, monthKey: s.month && s.month.key, yearKey: s.year && s.year.key };
  const filtered = filterEntriesByPeriod(entries, period, keys).map(addEntrySourceFields);
  return {
    schema: LEDGER_EXPORT_VERSION,
    period: String(period || 'recent'),
    generatedAt: Date.now(),
    csvUrl: `/api/ledger/local-kwh.csv?period=${encodeURIComponent(String(period || 'recent'))}`,
    columns: ['period','dayKey','monthKey','yearKey','stationId','stationName','lp','sessionId','sourceLabel','totalKwh','localKwh','solarKwh','gridKwh','solarSharePercent','valueEur','priceEurPerKwh','protocolHint'],
    rows: filtered.map(e => [String(period || 'recent'), e.dayKey, e.monthKey, e.yearKey, e.stationId, e.stationName, e.lp, e.sessionId, e.sourceLabel, e.totalKwh, e.localKwh, e.solarKwh, e.gridKwh, e.solarSharePercent, e.valueEur, e.priceEurPerKwh, e.protocolHint]),
    entries: filtered,
  };
}

function buildWalletBridge(summary, sourceSummary) {
  const s = summary && typeof summary === 'object' ? summary : {};
  return {
    schema: LEDGER_WALLET_BRIDGE_VERSION,
    generatedAt: Date.now(),
    status: s.enabled ? 'ready' : 'disabled',
    relation: 'ledger-is-operator-session-subset',
    note: 'Das Ledger liefert belegte Lade-/Betreiber-Sessionwerte. Das Energie-Wertkonto bewertet weiterhin die Gesamtanlage.',
    today: s.today || {},
    month: s.month || {},
    year: s.year || {},
    sourceSummary,
  };
}

function buildOperatorView(summary, entries, sourceSummary) {
  const s = summary && typeof summary === 'object' ? summary : {};
  return {
    schema: LEDGER_OPERATOR_VIEW_VERSION,
    generatedAt: Date.now(),
    summary: s,
    sourceSummary,
    recentEntries: (Array.isArray(entries) ? entries : []).slice(0, 50).map(addEntrySourceFields),
    exportUrls: {
      todayCsv: '/api/ledger/local-kwh.csv?period=today',
      monthCsv: '/api/ledger/local-kwh.csv?period=month',
      yearCsv: '/api/ledger/local-kwh.csv?period=year',
      recentCsv: '/api/ledger/local-kwh.csv?period=recent',
      allCsv: '/api/ledger/local-kwh.csv?period=all',
    },
    note: 'Betreiberansicht aus vorhandenen Ledger-Summen und Entry-Puffer. Kein zweiter Ledger, keine doppelte Zählung.',
  };
}


function normalizeSessionEntry(station, lpRaw, row) {
  const session = row && typeof row === 'object' ? row : null;
  if (!session) return null;
  const lp = normalizeLp(lpRaw || session.lp || session.connector || session.chargepoint);
  const stationId = safeId(station && station.id, 'station');
  const stationName = String((station && station.name) || stationId);
  const endTs = Math.max(0, Math.round(num(session.endTs || session.endedAt || session.ts || session.startTs, 0)));
  const startTs = Math.max(0, Math.round(num(session.startTs || session.startedAt || 0, 0)));
  const totalKwh = Math.max(0, round(session.energyKwh !== undefined ? session.energyKwh : (session.totalKwh !== undefined ? session.totalKwh : session.kwh), 3));
  if (!endTs || totalKwh <= 0) return null;

  let solarKwh = Math.max(0, round(session.solarKwh !== undefined ? session.solarKwh : session.localKwh, 3));
  let gridKwh = Math.max(0, round(session.gridKwh, 3));
  if (solarKwh <= 0 && gridKwh <= 0) {
    const share = Math.max(0, Math.min(100, Math.round(num(session.solarSharePercent, 0))));
    solarKwh = round(totalKwh * share / 100, 3);
    gridKwh = round(totalKwh - solarKwh, 3);
  }
  if (solarKwh + gridKwh > totalKwh + 0.002) {
    const scale = totalKwh / Math.max(0.0001, solarKwh + gridKwh);
    solarKwh = round(solarKwh * scale, 3);
    gridKwh = round(gridKwh * scale, 3);
  }
  if (gridKwh <= 0) gridKwh = Math.max(0, round(totalKwh - solarKwh, 3));

  const solarSharePercent = totalKwh > 0 ? Math.max(0, Math.min(100, Math.round((solarKwh / Math.max(0.0001, totalKwh)) * 100))) : 0;
  const sessionId = String(session.id || session.sessionId || `${stationId}-${lp}-${startTs || endTs}-${Math.round(totalKwh * 1000)}`);
  const entryId = `${stationId}:${lp}:${sessionId}:${endTs}`;

  return {
    id: entryId,
    ledgerVersion: LEDGER_VERSION,
    source: 'dcStationDisplay',
    origin: 'solar-grid-split',
    usage: 'charge-session',
    stationId,
    stationName,
    lp,
    sessionId,
    startTs,
    endTs,
    durationSec: Math.max(0, Math.round(num(session.durationSec, startTs && endTs ? (endTs - startTs) / 1000 : 0))),
    dayKey: localDayKey(endTs),
    monthKey: localMonthKey(endTs),
    yearKey: localYearKey(endTs),
    totalKwh,
    localKwh: solarKwh,
    solarKwh,
    gridKwh,
    solarSharePercent,
    valueEur: Math.max(0, round(session.costEur !== undefined ? session.costEur : session.valueEur, 2)),
    priceEurPerKwh: Math.max(0, round(session.priceEurPerKwh, 4)),
    protocolHint: String(session.protocolHint || (station && station.protocolHint) || 'manufacturer-open'),
    createdAt: Date.now(),
    // Quelle je kWh: kompakter Quellenmix pro Entry. Das ersetzt keinen Messwert
    // und erzeugt bewusst keine Einzel-kWh-States, sondern macht Herkunft im Export
    // und in der Betreiberansicht transparent.
    kwhSourceMix: buildKwhSourceMix(totalKwh, solarKwh, gridKwh, Math.max(0, round(session.costEur !== undefined ? session.costEur : session.valueEur, 2))),
  };
}

function sanitizeStations(cfg) {
  const ck = cfg && cfg.chargeKiosk && typeof cfg.chargeKiosk === 'object' ? cfg.chargeKiosk : {};
  const rows = Array.isArray(ck.stations) ? ck.stations : [];
  return rows.map((row, idx) => {
    const r = row && typeof row === 'object' ? row : {};
    return {
      id: safeId(r.id || r.key || r.stationId || `dc_station_${idx + 1}`, `dc_station_${idx + 1}`),
      name: String(r.name || r.label || `DC Ladestation ${idx + 1}`),
      enabled: r.enabled !== false,
      protocolHint: String(r.protocolHint || r.protocol || 'manufacturer-open'),
    };
  }).filter(s => s && s.id);
}

class EnergyLedgerModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    this._dayKey = localDayKey();
    this._monthKey = localMonthKey();
    this._yearKey = localYearKey();
    this._primed = false;
    this._processed = new Set();
    this._recentEntries = [];
    this._today = emptyPeriod();
    this._month = emptyPeriod();
    this._year = emptyPeriod();

    this._originLedger = new EnergyOriginLedgerRuntime(adapter);
  }

  _cfg() {
    return this.adapter && this.adapter.config && this.adapter.config.energyLedger && typeof this.adapter.config.energyLedger === 'object'
      ? this.adapter.config.energyLedger
      : {};
  }

  _recentLimit() {
    const n = Number(this._cfg().recentEntryLimit);
    return Number.isFinite(n) ? Math.max(20, Math.min(1000, Math.round(n))) : DEFAULT_RECENT_LIMIT;
  }

  _processedLimit() {
    const n = Number(this._cfg().processedSessionLimit);
    return Number.isFinite(n) ? Math.max(100, Math.min(10000, Math.round(n))) : DEFAULT_PROCESSED_LIMIT;
  }

  _isEnabled() {
    const cfg = this._cfg();
    if (cfg.enabled === false) return false;
    // Legacy-Session-Ledger bleibt kompatibel. Das neue Herkunftsmodul wird
    // separat über energyLedger.origin.enabled aktiviert.
    const ck = this.adapter && this.adapter.config && this.adapter.config.chargeKiosk;
    return cfg.enabled === true || !!(ck && ck.enabled === true);
  }


  async init() {
    await this._ensureStates();
    await this._primeFromStates();
    await this._publish('init', { newEntries: 0, candidateCount: 0 });
    await this._originLedger.init();
  }

  async tick() {
    await this._ensurePeriodRollovers();
    if (this._isEnabled()) {
      const scan = await this._scanChargeKioskSessions();
      await this._publish('ok', scan);
    } else {
      await this._publish('disabled', { newEntries: 0, candidateCount: 0, warning: 'Legacy-Session-Ledger ist deaktiviert.' });
    }
    await this._originLedger.tick();
  }

  async _ensureStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;
    const channel = async (id, name) => a.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
    const mk = async (id, name, type, role, unit, def) => {
      const common = { name, type, role, read: true, write: false };
      if (unit) common.unit = unit;
      if (def !== undefined) common.def = def;
      await a.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };

    await channel('energyLedger', 'EOS Local kWh Ledger');
    await channel('energyLedger.today', 'Local kWh Ledger heute');
    await channel('energyLedger.month', 'Local kWh Ledger aktueller Monat');
    await channel('energyLedger.year', 'Local kWh Ledger aktuelles Jahr');
    await channel('energyLedger.sources', 'Local kWh Ledger Quellen');
    await channel('energyLedger.export', 'Local kWh Ledger Exportbasis');
    await channel('energyLedger.operator', 'Local kWh Ledger Betreiberansicht');
    await channel('energyLedger.walletBridge', 'Local kWh Ledger Verbindung Energie-Wertkonto');
    await channel('energyLedger.diagnostics', 'Local kWh Ledger Diagnose');

    await mk('energyLedger.enabled', 'Local kWh Ledger aktiv', 'boolean', 'indicator', '', false);
    await mk('energyLedger.version', 'Ledger-Schema', 'string', 'text', '', LEDGER_VERSION);
    await mk('energyLedger.status', 'Status', 'string', 'text', '', 'init');
    await mk('energyLedger.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time', '', 0);
    await mk('energyLedger.legalNote', 'Hinweis Abrechnung', 'string', 'text', '', 'Betreiber-/Optimierungsbasis, keine eichrechtsverbindliche Abrechnung.');
    await mk('energyLedger.lastEntryJson', 'Letzter Ledger-Eintrag JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.entriesRecentJson', 'Letzte Ledger-Einträge JSON', 'string', 'json', '', '[]');
    await mk('energyLedger.processedSessionKeysJson', 'Verarbeitete Session-Schlüssel JSON', 'string', 'json', '', '[]');
    await mk('energyLedger.summaryJson', 'Ledger-Zusammenfassung JSON', 'string', 'json', '', '{}');

    await this._ensurePeriodStates('energyLedger.today', 'Tag', mk);
    await this._ensurePeriodStates('energyLedger.month', 'Monat', mk);
    await this._ensurePeriodStates('energyLedger.year', 'Jahr', mk);

    await mk('energyLedger.sources.chargeKioskStationCount', 'Charge-Kiosk Stationen', 'number', 'value', '', 0);
    await mk('energyLedger.sources.sessionCandidateCount', 'Session-Kandidaten', 'number', 'value', '', 0);
    await mk('energyLedger.sources.newEntryCount', 'Neue Ledger-Einträge letzter Tick', 'number', 'value', '', 0);
    await mk('energyLedger.sources.lastSourceJson', 'Letzte Quellenprüfung JSON', 'string', 'json', '', '{}');

    await mk('energyLedger.export.schema', 'Export-Schema', 'string', 'text', '', LEDGER_VERSION);
    await mk('energyLedger.export.todayCsvJson', 'CSV-Exportbasis heute JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.export.recentEntriesJson', 'Export letzte Einträge JSON', 'string', 'json', '', '[]');
    await mk('energyLedger.export.ready', 'Exportbasis bereit', 'boolean', 'indicator', '', false);
    await mk('energyLedger.export.todayCsvUrl', 'CSV API heute', 'string', 'text', '', '/api/ledger/local-kwh.csv?period=today');
    await mk('energyLedger.export.monthCsvUrl', 'CSV API Monat', 'string', 'text', '', '/api/ledger/local-kwh.csv?period=month');
    await mk('energyLedger.export.yearCsvUrl', 'CSV API Jahr', 'string', 'text', '', '/api/ledger/local-kwh.csv?period=year');
    await mk('energyLedger.export.periodsJson', 'Periodenexport JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.operator.url', 'Betreiberansicht URL', 'string', 'text', '', '/ledger/local-kwh');
    await mk('energyLedger.operator.viewJson', 'Betreiberansicht JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.operator.summaryJson', 'Betreiber-Summen JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.operator.sourceBreakdownJson', 'Quelle je kWh JSON', 'string', 'json', '', '{}');
    await mk('energyLedger.walletBridge.status', 'Energy-Wallet-Bridge Status', 'string', 'text', '', 'init');
    await mk('energyLedger.walletBridge.summaryJson', 'Energy-Wallet-Bridge JSON', 'string', 'json', '', '{}');

    await mk('energyLedger.diagnostics.warning', 'Diagnosehinweis', 'string', 'text', '', '');
    await mk('energyLedger.diagnostics.lastScanJson', 'Letzter Scan JSON', 'string', 'json', '', '{}');

  }

  async _ensurePeriodStates(prefix, label, mk) {
    await mk(`${prefix}.key`, `${label} Schlüssel`, 'string', 'text', '', '');
    await mk(`${prefix}.entryCount`, `${label} Ledger-Einträge`, 'number', 'value', '', 0);
    await mk(`${prefix}.totalKwh`, `${label} Energie gesamt`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.localKwh`, `${label} lokal/solar zugeordnet`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.solarKwh`, `${label} Solarenergie`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.gridKwh`, `${label} Netzenergie`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.solarSharePercent`, `${label} Solaranteil`, 'number', 'value.percent', '%', 0);
    await mk(`${prefix}.valueEur`, `${label} Wert`, 'number', 'value.currency', '€', 0);
    await mk(`${prefix}.dcSessionKwh`, `${label} DC-Session-Energie`, 'number', 'value.energy', 'kWh', 0);
    await mk(`${prefix}.stationCount`, `${label} Stationen`, 'number', 'value', '', 0);
    await mk(`${prefix}.lpCount`, `${label} Ladepunkte`, 'number', 'value', '', 0);
    await mk(`${prefix}.stationIdsJson`, `${label} Stationen JSON`, 'string', 'json', '', '[]');
    await mk(`${prefix}.lpIdsJson`, `${label} LPs JSON`, 'string', 'json', '', '[]');
  }

  async _primeFromStates() {
    if (this._primed) return;
    this._primed = true;
    this._processed = new Set(await this._readJsonState('energyLedger.processedSessionKeysJson', []));
    this._recentEntries = await this._readJsonState('energyLedger.entriesRecentJson', []);
    if (!Array.isArray(this._recentEntries)) this._recentEntries = [];
    this._today = await this._readPeriod('energyLedger.today', this._dayKey);
    this._month = await this._readPeriod('energyLedger.month', this._monthKey);
    this._year = await this._readPeriod('energyLedger.year', this._yearKey);
  }

  async _readJsonState(id, fallback) {
    try {
      const st = await this.adapter.getStateAsync(id);
      if (!st || st.val === undefined || st.val === null || st.val === '') return fallback;
      const parsed = typeof st.val === 'string' ? JSON.parse(st.val) : st.val;
      return parsed === undefined || parsed === null ? fallback : parsed;
    } catch (_e) {
      return fallback;
    }
  }

  async _readNumberState(id, fallback = 0) {
    try {
      const st = await this.adapter.getStateAsync(id);
      const n = Number(st && st.val);
      return Number.isFinite(n) ? n : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  async _readStringState(id, fallback = '') {
    try {
      const st = await this.adapter.getStateAsync(id);
      return st && st.val !== undefined && st.val !== null ? String(st.val) : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  async _readPeriod(prefix, expectedKey) {
    const key = await this._readStringState(`${prefix}.key`, '');
    if (key !== expectedKey) return emptyPeriod();
    const acc = emptyPeriod();
    acc.entryCount = Math.max(0, Math.round(await this._readNumberState(`${prefix}.entryCount`, 0)));
    acc.totalKwh = await this._readNumberState(`${prefix}.totalKwh`, 0);
    acc.localKwh = await this._readNumberState(`${prefix}.localKwh`, 0);
    acc.solarKwh = await this._readNumberState(`${prefix}.solarKwh`, 0);
    acc.gridKwh = await this._readNumberState(`${prefix}.gridKwh`, 0);
    acc.valueEur = await this._readNumberState(`${prefix}.valueEur`, 0);
    acc.dcSessionKwh = await this._readNumberState(`${prefix}.dcSessionKwh`, 0);
    acc.stationIds = await this._readJsonState(`${prefix}.stationIdsJson`, []);
    acc.lpIds = await this._readJsonState(`${prefix}.lpIdsJson`, []);
    if (!Array.isArray(acc.stationIds)) acc.stationIds = [];
    if (!Array.isArray(acc.lpIds)) acc.lpIds = [];
    return acc;
  }

  async _ensurePeriodRollovers() {
    const now = Date.now();
    const d = localDayKey(now);
    const m = localMonthKey(now);
    const y = localYearKey(now);
    if (d !== this._dayKey) { this._dayKey = d; this._today = emptyPeriod(); }
    if (m !== this._monthKey) { this._monthKey = m; this._month = emptyPeriod(); }
    if (y !== this._yearKey) { this._yearKey = y; this._year = emptyPeriod(); }
  }

  async _scanChargeKioskSessions() {
    const stations = sanitizeStations(this.adapter && this.adapter.config ? this.adapter.config : {});
    let candidateCount = 0;
    let newEntries = 0;
    const added = [];
    for (const station of stations) {
      if (!station.enabled) continue;
      const base = `chargeKiosk.stations.${safeId(station.id)}`;
      const lastByLp = await this._readJsonState(`${base}.lastSessionsByLpJson`, {});
      if (!lastByLp || typeof lastByLp !== 'object') continue;
      for (const [lp, session] of Object.entries(lastByLp)) {
        candidateCount += 1;
        const entry = normalizeSessionEntry(station, lp, session);
        if (!entry || this._processed.has(entry.id)) continue;
        this._acceptEntry(entry);
        added.push(entry);
        newEntries += 1;
      }
    }
    return {
      newEntries,
      candidateCount,
      added,
      stationCount: stations.length,
      warning: stations.length ? '' : 'Keine DC-Stationen als Ledger-Quelle konfiguriert.',
    };
  }

  _acceptEntry(entry) {
    entry = addEntrySourceFields(entry);
    this._processed.add(entry.id);
    const processed = Array.from(this._processed);
    const maxKeys = this._processedLimit();
    this._processed = new Set(processed.slice(Math.max(0, processed.length - maxKeys)));

    this._recentEntries.unshift(entry);
    this._recentEntries = this._recentEntries.slice(0, this._recentLimit());

    if (entry.dayKey === this._dayKey) addToPeriod(this._today, entry);
    if (entry.monthKey === this._monthKey) addToPeriod(this._month, entry);
    if (entry.yearKey === this._yearKey) addToPeriod(this._year, entry);
  }

  _periodSummary(acc, key) {
    const total = Math.max(0, num(acc.totalKwh, 0));
    const solar = Math.max(0, num(acc.solarKwh, 0));
    return {
      key,
      entryCount: Math.max(0, Math.round(num(acc.entryCount, 0))),
      totalKwh: round(total, 3),
      localKwh: round(acc.localKwh, 3),
      solarKwh: round(solar, 3),
      gridKwh: round(acc.gridKwh, 3),
      solarSharePercent: total > 0 ? Math.round((solar / Math.max(0.0001, total)) * 100) : 0,
      valueEur: round(acc.valueEur, 2),
      dcSessionKwh: round(acc.dcSessionKwh, 3),
      stationCount: Array.isArray(acc.stationIds) ? acc.stationIds.length : 0,
      lpCount: Array.isArray(acc.lpIds) ? acc.lpIds.length : 0,
      stationIds: Array.isArray(acc.stationIds) ? acc.stationIds : [],
      lpIds: Array.isArray(acc.lpIds) ? acc.lpIds : [],
    };
  }

  async _publish(status, scan = {}) {
    const a = this.adapter;
    if (!a) return;
    const enabled = this._isEnabled();
    const now = Date.now();
    const today = this._periodSummary(this._today, this._dayKey);
    const month = this._periodSummary(this._month, this._monthKey);
    const year = this._periodSummary(this._year, this._yearKey);
    const entries = (this._recentEntries || []).map(addEntrySourceFields);
    const lastEntry = entries && entries.length ? entries[0] : {};
    const summary = {
      ts: now,
      enabled,
      status,
      version: LEDGER_VERSION,
      sourcePrinciple: 'manufacturer-open',
      source: 'chargeKiosk.lastSessionsByLpJson',
      today,
      month,
      year,
      recentCount: Array.isArray(entries) ? entries.length : 0,
      processedCount: this._processed ? this._processed.size : 0,
    };
    const sourceSummary = sourceSummaryFromEntries(entries);
    summary.sourceSummary = sourceSummary;
    summary.operatorViewUrl = '/ledger/local-kwh';
    summary.exportUrls = {
      todayCsv: '/api/ledger/local-kwh.csv?period=today',
      monthCsv: '/api/ledger/local-kwh.csv?period=month',
      yearCsv: '/api/ledger/local-kwh.csv?period=year',
      recentCsv: '/api/ledger/local-kwh.csv?period=recent',
      allCsv: '/api/ledger/local-kwh.csv?period=all',
    };
    const walletBridge = buildWalletBridge(summary, sourceSummary);
    summary.energyWalletBridge = walletBridge;
    const operatorView = buildOperatorView(summary, entries, sourceSummary);
    const csvFoundation = csvFoundationForPeriod('today', entries, summary);
    const periodExports = {
      schema: LEDGER_EXPORT_VERSION,
      today: csvFoundation,
      month: csvFoundationForPeriod('month', entries, summary),
      year: csvFoundationForPeriod('year', entries, summary),
      recent: csvFoundationForPeriod('recent', entries, summary),
    };

    await this._writePeriod('energyLedger.today', today);
    await this._writePeriod('energyLedger.month', month);
    await this._writePeriod('energyLedger.year', year);
    await a.setStateAsync('energyLedger.enabled', { val: !!enabled, ack: true });
    await a.setStateAsync('energyLedger.version', { val: LEDGER_VERSION, ack: true });
    await a.setStateAsync('energyLedger.status', { val: status, ack: true });
    await a.setStateAsync('energyLedger.lastUpdate', { val: now, ack: true });
    await a.setStateAsync('energyLedger.lastEntryJson', { val: JSON.stringify(lastEntry), ack: true });
    await a.setStateAsync('energyLedger.entriesRecentJson', { val: JSON.stringify(entries.slice(0, this._recentLimit())), ack: true });
    await a.setStateAsync('energyLedger.processedSessionKeysJson', { val: JSON.stringify(Array.from(this._processed || [])), ack: true });
    await a.setStateAsync('energyLedger.summaryJson', { val: JSON.stringify(summary), ack: true });
    await a.setStateAsync('energyLedger.sources.chargeKioskStationCount', { val: Number(scan.stationCount) || 0, ack: true });
    await a.setStateAsync('energyLedger.sources.sessionCandidateCount', { val: Number(scan.candidateCount) || 0, ack: true });
    await a.setStateAsync('energyLedger.sources.newEntryCount', { val: Number(scan.newEntries) || 0, ack: true });
    await a.setStateAsync('energyLedger.sources.lastSourceJson', { val: JSON.stringify({ ts: now, ...scan, added: undefined }), ack: true });
    await a.setStateAsync('energyLedger.export.schema', { val: LEDGER_EXPORT_VERSION, ack: true });
    await a.setStateAsync('energyLedger.export.todayCsvJson', { val: JSON.stringify(csvFoundation), ack: true });
    await a.setStateAsync('energyLedger.export.recentEntriesJson', { val: JSON.stringify(entries.slice(0, 200)), ack: true });
    await a.setStateAsync('energyLedger.export.ready', { val: entries.length > 0, ack: true });
    await a.setStateAsync('energyLedger.export.todayCsvUrl', { val: '/api/ledger/local-kwh.csv?period=today', ack: true });
    await a.setStateAsync('energyLedger.export.monthCsvUrl', { val: '/api/ledger/local-kwh.csv?period=month', ack: true });
    await a.setStateAsync('energyLedger.export.yearCsvUrl', { val: '/api/ledger/local-kwh.csv?period=year', ack: true });
    await a.setStateAsync('energyLedger.export.periodsJson', { val: JSON.stringify(periodExports), ack: true });
    await a.setStateAsync('energyLedger.operator.url', { val: '/ledger/local-kwh', ack: true });
    await a.setStateAsync('energyLedger.operator.viewJson', { val: JSON.stringify(operatorView), ack: true });
    await a.setStateAsync('energyLedger.operator.summaryJson', { val: JSON.stringify({ schema: 'nexowatt.local-kwh-ledger-operator-summary.v1', today, month, year }), ack: true });
    await a.setStateAsync('energyLedger.operator.sourceBreakdownJson', { val: JSON.stringify(sourceSummary), ack: true });
    await a.setStateAsync('energyLedger.walletBridge.status', { val: walletBridge.status || 'ready', ack: true });
    await a.setStateAsync('energyLedger.walletBridge.summaryJson', { val: JSON.stringify(walletBridge), ack: true });
    await a.setStateAsync('energyLedger.diagnostics.warning', { val: String(scan.warning || ''), ack: true });
    await a.setStateAsync('energyLedger.diagnostics.lastScanJson', { val: JSON.stringify({ ts: now, status, candidateCount: scan.candidateCount || 0, newEntries: scan.newEntries || 0, stationCount: scan.stationCount || 0 }), ack: true });
  }

  async _writePeriod(prefix, data) {
    const a = this.adapter;
    await a.setStateAsync(`${prefix}.key`, { val: data.key, ack: true });
    await a.setStateAsync(`${prefix}.entryCount`, { val: data.entryCount, ack: true });
    await a.setStateAsync(`${prefix}.totalKwh`, { val: data.totalKwh, ack: true });
    await a.setStateAsync(`${prefix}.localKwh`, { val: data.localKwh, ack: true });
    await a.setStateAsync(`${prefix}.solarKwh`, { val: data.solarKwh, ack: true });
    await a.setStateAsync(`${prefix}.gridKwh`, { val: data.gridKwh, ack: true });
    await a.setStateAsync(`${prefix}.solarSharePercent`, { val: data.solarSharePercent, ack: true });
    await a.setStateAsync(`${prefix}.valueEur`, { val: data.valueEur, ack: true });
    await a.setStateAsync(`${prefix}.dcSessionKwh`, { val: data.dcSessionKwh, ack: true });
    await a.setStateAsync(`${prefix}.stationCount`, { val: data.stationCount, ack: true });
    await a.setStateAsync(`${prefix}.lpCount`, { val: data.lpCount, ack: true });
    await a.setStateAsync(`${prefix}.stationIdsJson`, { val: JSON.stringify(data.stationIds || []), ack: true });
    await a.setStateAsync(`${prefix}.lpIdsJson`, { val: JSON.stringify(data.lpIds || []), ack: true });
  }
}

module.exports = { EnergyLedgerModule, normalizeSessionEntry };
