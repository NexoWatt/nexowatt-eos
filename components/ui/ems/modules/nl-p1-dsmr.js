/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/modules/nl-p1-dsmr.ts
 * Quell-Hash: sha256:4ec772bd2ab03e7fa22b4631358dafd63f84d161814732f48da6e16376b211f0
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/nl-p1-dsmr.js.
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
 * Aufgabe: Bindet die P1-/DSMR-bezogenen Zählerdaten und deren Konfiguration in den EMS-Kontext ein.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/nl-p1-dsmr.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/nl-p1-dsmr.js
 *
 * Zweck:
 * Niederlande-Basis für P1/DSMR-Zähler, Netafname/Teruglevering und Saldering-Exit.
 * Das Modul normalisiert vorhandene ioBroker-Datenpunkte aus beliebigen P1-/DSMR-
 * Adaptern in NexoWatt-States. Es ist bewusst hersteller- und adapteroffen:
 * OCPP spielt hier keine Rolle, P1 kann z. B. aus DSMR-, MQTT-, Modbus-, REST- oder
 * NexoWatt-Device-Adapterdaten kommen.
 *
 * Sicherheit:
 * Dieses Modul ist read-only. Es schreibt keine Geräte- oder Wechselrichter-Sollwerte.
 * Einspeisebegrenzung bleibt im Export Guard und benötigt weiterhin Installerfreigabe.
 */
'use strict';

const { BaseModule } = require('./base');
const profileSvc = require('../services/country-profile-service');

function num(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round(v, digits = 3) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, Math.max(0, Math.min(6, Number(digits) || 0)));
  return Math.round(n * f) / f;
}

function clamp(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function dayKeyLocal(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function monthKeyLocal(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function yearKeyLocal(date = new Date()) {
  return String(date.getFullYear());
}

function normalizePrice(value, fallback) {
  const n = num(value, fallback);
  if (!Number.isFinite(n)) return fallback;
  const abs = Math.abs(n);
  const eur = abs > 2 && abs <= 500 ? n / 100 : n;
  if (!Number.isFinite(eur) || eur < -5 || eur > 5) return fallback;
  return eur;
}

function emptyPeriod() {
  return {
    importKwh: 0,
    exportKwh: 0,
    returnValueEur: 0,
    returnCostEur: 0,
    salderingExitRiskEur: 0,
  };
}

class NlP1DsmrModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    const now = new Date();
    this._lastTs = 0;
    this._dayKey = dayKeyLocal(now);
    this._monthKey = monthKeyLocal(now);
    this._yearKey = yearKeyLocal(now);
    this._today = emptyPeriod();
    this._month = emptyPeriod();
    this._year = emptyPeriod();
    this._lastImportCounter = null;
    this._lastExportCounter = null;
    this._lastHash = '';
  }

  _cfg() {
    const cfg = this.adapter && this.adapter.config && typeof this.adapter.config === 'object' ? this.adapter.config : {};
    const nl = cfg.nlP1 && typeof cfg.nlP1 === 'object' ? cfg.nlP1 : {};
    return nl;
  }

  _country() {
    try {
      const profile = profileSvc.getConfiguredCountryProfile(this.adapter.config || {});
      return String(profile.country || 'DE').toUpperCase() === 'NL' ? 'NL' : 'DE';
    } catch (_e) {
      return 'DE';
    }
  }

  _datapoints() {
    const cfg = this._cfg();
    return cfg.datapoints && typeof cfg.datapoints === 'object' ? cfg.datapoints : {};
  }

  _isEnabled() {
    const cfg = this._cfg();
    const dps = this._datapoints();
    const hasMapping = Object.keys(dps).some((k) => typeof dps[k] === 'string' && dps[k].trim());
    // NL P1 läuft automatisch, wenn das Länderprofil NL ist und P1-Datenpunkte gemappt sind.
    // Der explizite Schalter kann es auch in Testanlagen aktivieren. Das Modul bleibt read-only.
    return cfg.enabled === true || (this._country() === 'NL' && hasMapping);
  }

  _staleMs() {
    const cfg = this._cfg();
    const sec = clamp(Number(cfg.staleTimeoutSec || 300), 30, 86400);
    return Math.round(sec * 1000);
  }

  async init() {
    await this._ensureStates();
    await this._registerDatapoints();
    await this._primeFromStates();
    await this._publish('init', this._emptySnapshot('init'));
  }

  async _registerDatapoints() {
    if (!this.dp || typeof this.dp.upsert !== 'function') return;
    const d = this._datapoints();
    const map = [
      ['nl.importPowerW', d.importPowerW, 'W'],
      ['nl.exportPowerW', d.exportPowerW, 'W'],
      ['nl.netPowerW', d.netPowerW, 'W'],
      ['nl.importEnergyKwh', d.importEnergyKwh, 'kWh'],
      ['nl.exportEnergyKwh', d.exportEnergyKwh, 'kWh'],
      ['nl.gasM3', d.gasM3, 'm³'],
      ['nl.activeTariff', d.activeTariff, ''],
    ];
    for (const [key, id, unit] of map) {
      const objectId = typeof id === 'string' ? id.trim() : '';
      if (!objectId) continue;
      await this.dp.upsert({ key, objectId, dataType: key === 'nl.activeTariff' ? 'string' : 'number', direction: 'in', unit, useAliveForStale: true });
    }
  }

  async _ensureStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;
    const ch = async (id, name) => a.setObjectNotExistsAsync(id, { type: 'channel', common: { name }, native: {} });
    const mk = async (id, name, type, role, unit, def) => {
      const common = { name, type, role, read: true, write: false };
      if (unit) common.unit = unit;
      if (def !== undefined) common.def = def;
      await a.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };

    await ch('nl', 'Niederlande / Marktprofil');
    await ch('nl.p1', 'P1 / DSMR normalisiert');
    await ch('nl.p1.today', 'P1 / DSMR heute');
    await ch('nl.p1.month', 'P1 / DSMR aktueller Monat');
    await ch('nl.p1.year', 'P1 / DSMR aktuelles Jahr');
    await ch('nl.teruglevering', 'Teruglevering / Rücklieferung');
    await ch('nl.saldering', 'Saldering-Exit Basis');

    await mk('nl.p1.enabled', 'NL P1/DSMR aktiv', 'boolean', 'indicator', '', false);
    await mk('nl.p1.status', 'NL P1/DSMR Status', 'string', 'text', '', 'init');
    await mk('nl.p1.country', 'Länderprofil', 'string', 'text', '', 'DE');
    await mk('nl.p1.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time', '', 0);
    await mk('nl.p1.importPowerW', 'Netafname Leistung', 'number', 'value.power', 'W', 0);
    await mk('nl.p1.exportPowerW', 'Teruglevering Leistung', 'number', 'value.power', 'W', 0);
    await mk('nl.p1.netPowerW', 'Netzleistung normalisiert (Bezug + / Rücklieferung -)', 'number', 'value.power', 'W', 0);
    await mk('nl.p1.importEnergyKwhTotal', 'Netafname Zählerstand', 'number', 'value.energy', 'kWh', 0);
    await mk('nl.p1.exportEnergyKwhTotal', 'Teruglevering Zählerstand', 'number', 'value.energy', 'kWh', 0);
    await mk('nl.p1.gasM3Total', 'Gas Zählerstand optional', 'number', 'value', 'm³', 0);
    await mk('nl.p1.activeTariff', 'Aktiver P1-Tarif optional', 'string', 'text', '', '');
    await mk('nl.p1.dataQualityPercent', 'Datenqualität P1', 'number', 'value.percent', '%', 0);
    await mk('nl.p1.warning', 'P1 Hinweis', 'string', 'text', '', '');
    await mk('nl.p1.sourcesJson', 'P1 Quellen JSON', 'string', 'json', '', '{}');
    await mk('nl.p1.summaryJson', 'P1 Zusammenfassung JSON', 'string', 'json', '', '{}');

    for (const [prefix, label] of [['nl.p1.today', 'heute'], ['nl.p1.month', 'Monat'], ['nl.p1.year', 'Jahr']]) {
      await mk(`${prefix}.key`, `Periodenschlüssel ${label}`, 'string', 'text', '', '');
      await mk(`${prefix}.importKwh`, `Netafname ${label}`, 'number', 'value.energy', 'kWh', 0);
      await mk(`${prefix}.exportKwh`, `Teruglevering ${label}`, 'number', 'value.energy', 'kWh', 0);
      await mk(`${prefix}.returnValueEur`, `Rücklieferwert ${label}`, 'number', 'value.money', '€', 0);
      await mk(`${prefix}.returnCostEur`, `Rücklieferkosten ${label}`, 'number', 'value.money', '€', 0);
      await mk(`${prefix}.salderingExitRiskEur`, `Saldering-Exit Risiko ${label}`, 'number', 'value.money', '€', 0);
    }

    await mk('nl.teruglevering.returnValueEurPerKwh', 'Teruglevering Wert', 'number', 'value.price', '€/kWh', 0.08);
    await mk('nl.teruglevering.returnCostEurPerKwh', 'Teruglevering Kosten/Vorbereitung', 'number', 'value.price', '€/kWh', 0);
    await mk('nl.teruglevering.valueTodayEur', 'Teruglevering Wert heute', 'number', 'value.money', '€', 0);
    await mk('nl.teruglevering.costTodayEur', 'Teruglevering Kosten heute', 'number', 'value.money', '€', 0);
    await mk('nl.teruglevering.netValueTodayEur', 'Teruglevering Netto heute', 'number', 'value.money', '€', 0);
    await mk('nl.teruglevering.summaryJson', 'Teruglevering JSON', 'string', 'json', '', '{}');

    await mk('nl.saldering.status', 'Saldering Status', 'string', 'text', '', 'init');
    await mk('nl.saldering.directUseKwhToday', 'Eigen verbruik heute', 'number', 'value.energy', 'kWh', 0);
    await mk('nl.saldering.returnedKwhToday', 'Teruglevering heute', 'number', 'value.energy', 'kWh', 0);
    await mk('nl.saldering.netAfnameKwhToday', 'Netafname heute', 'number', 'value.energy', 'kWh', 0);
    await mk('nl.saldering.localUsePotentialKwhToday', 'Lokales Nutzungspotenzial heute', 'number', 'value.energy', 'kWh', 0);
    await mk('nl.saldering.exitRiskEurToday', 'Saldering-Exit Risikowert heute', 'number', 'value.money', '€', 0);
    await mk('nl.saldering.note', 'Saldering Hinweis', 'string', 'text', '', '');
    await mk('nl.saldering.summaryJson', 'Saldering Zusammenfassung JSON', 'string', 'json', '', '{}');
  }

  async _primeFromStates() {
    const a = this.adapter;
    if (!a || typeof a.getStateAsync !== 'function') return;
    const read = async (id) => {
      try { const st = await a.getStateAsync(id); return st ? num(st.val, 0) : 0; } catch (_e) { return 0; }
    };
    this._today.importKwh = await read('nl.p1.today.importKwh');
    this._today.exportKwh = await read('nl.p1.today.exportKwh');
    this._month.importKwh = await read('nl.p1.month.importKwh');
    this._month.exportKwh = await read('nl.p1.month.exportKwh');
    this._year.importKwh = await read('nl.p1.year.importKwh');
    this._year.exportKwh = await read('nl.p1.year.exportKwh');
  }

  _readStateNumber(ids, fallback = null) {
    const a = this.adapter;
    const cache = a && a.stateCache && typeof a.stateCache === 'object' ? a.stateCache : null;
    for (const id of ids) {
      try {
        let raw = null;
        if (cache && Object.prototype.hasOwnProperty.call(cache, id)) raw = cache[id] && typeof cache[id] === 'object' && 'value' in cache[id] ? cache[id].value : cache[id];
        else if (cache && a.namespace && Object.prototype.hasOwnProperty.call(cache, `${a.namespace}.${id}`)) raw = cache[`${a.namespace}.${id}`].value;
        const n = num(raw, null);
        if (Number.isFinite(n)) return n;
      } catch (_e) {}
    }
    return fallback;
  }

  _emptySnapshot(status) {
    return {
      status,
      country: this._country(),
      enabled: this._isEnabled(),
      importPowerW: 0,
      exportPowerW: 0,
      netPowerW: 0,
      importEnergyKwhTotal: 0,
      exportEnergyKwhTotal: 0,
      gasM3Total: 0,
      activeTariff: '',
      dataQualityPercent: 0,
      warning: '',
      sources: {},
      prices: this._prices(),
      directUseKwhToday: this._readStateNumber(['energyWallet.today.localUseKwh'], 0) || 0,
    };
  }

  _prices() {
    const cfg = this._cfg();
    const retVal = this._readStateNumber(['settings.energyWalletFeedInEurPerKwh'], null);
    const retCost = this._readStateNumber(['settings.nlTerugleverCostEurPerKwh', 'settings.energyWalletTerugleverCostEurPerKwh'], null);
    const grid = this._readStateNumber(['energyWallet.configuredPrices.gridImportEurPerKwh', 'settings.energyWalletFixedImportEurPerKwh', 'settings.price'], null);
    const returnValue = normalizePrice(retVal !== null ? retVal : (cfg.returnValueEurPerKwh !== undefined ? cfg.returnValueEurPerKwh : cfg.feedInEurPerKwh), 0.08);
    const returnCost = normalizePrice(retCost !== null ? retCost : cfg.returnCostEurPerKwh, 0);
    const gridImport = normalizePrice(grid, 0.35);
    return { returnValueEurPerKwh: returnValue, returnCostEurPerKwh: returnCost, gridImportEurPerKwh: gridImport };
  }

  _readDp(key, staleMs, positive) {
    if (!this.dp || !this.dp.getEntry(key)) return { found: false, stale: false, value: null, ageSec: 0 };
    const stale = this.dp.isStale(key, staleMs);
    const val = stale ? null : this.dp.getNumber(key, null);
    let out = val;
    if (positive && Number.isFinite(Number(out))) out = Math.max(0, Number(out));
    return { found: !stale && Number.isFinite(Number(out)), stale, value: out, ageSec: Math.round((this.dp.getAgeMs(key) || 0) / 1000) };
  }

  _snapshot() {
    const staleMs = this._staleMs();
    const sources = {};
    const imp = this._readDp('nl.importPowerW', staleMs, true); sources.importPowerW = imp;
    const exp = this._readDp('nl.exportPowerW', staleMs, true); sources.exportPowerW = exp;
    const net = this._readDp('nl.netPowerW', staleMs, false); sources.netPowerW = net;
    const impE = this._readDp('nl.importEnergyKwh', staleMs, true); sources.importEnergyKwh = impE;
    const expE = this._readDp('nl.exportEnergyKwh', staleMs, true); sources.exportEnergyKwh = expE;
    const gas = this._readDp('nl.gasM3', staleMs, true); sources.gasM3 = gas;
    const tariffRaw = this.dp && this.dp.getEntry('nl.activeTariff') && !this.dp.isStale('nl.activeTariff', staleMs) ? this.dp.getRaw('nl.activeTariff') : '';

    let importPowerW = imp.found ? Number(imp.value) : 0;
    let exportPowerW = exp.found ? Number(exp.value) : 0;
    if (net.found && (!imp.found || !exp.found)) {
      const n = Number(net.value);
      importPowerW = imp.found ? importPowerW : Math.max(0, n);
      exportPowerW = exp.found ? exportPowerW : Math.max(0, -n);
    }
    const netPowerW = importPowerW - exportPowerW;
    const hasPower = imp.found || exp.found || net.found;
    const hasEnergy = impE.found || expE.found;
    let quality = 100;
    const warnings = [];
    if (!hasPower && !hasEnergy) { quality -= 80; warnings.push('Keine frischen P1 Leistungs- oder Energiezählerwerte gemappt.'); }
    if (this._country() !== 'NL') { quality -= 10; warnings.push('Länderprofil ist nicht NL; P1/DSMR läuft nur als Diagnose.'); }
    quality = clamp(quality, 0, 100);

    return {
      status: this._isEnabled() ? (quality >= 50 ? 'ok' : 'waiting-data') : 'disabled',
      country: this._country(),
      enabled: this._isEnabled(),
      importPowerW,
      exportPowerW,
      netPowerW,
      importEnergyKwhTotal: impE.found ? Number(impE.value) : 0,
      exportEnergyKwhTotal: expE.found ? Number(expE.value) : 0,
      gasM3Total: gas.found ? Number(gas.value) : 0,
      activeTariff: tariffRaw == null ? '' : String(tariffRaw),
      dataQualityPercent: round(quality, 0),
      warning: warnings.join(' '),
      sources,
      prices: this._prices(),
      directUseKwhToday: this._readStateNumber(['energyWallet.today.localUseKwh'], 0) || 0,
    };
  }

  async tick() {
    await this._registerDatapoints();
    const now = Date.now();
    const date = new Date(now);
    const dk = dayKeyLocal(date), mk = monthKeyLocal(date), yk = yearKeyLocal(date);
    if (yk !== this._yearKey) { this._yearKey = yk; this._year = emptyPeriod(); }
    if (mk !== this._monthKey) { this._monthKey = mk; this._month = emptyPeriod(); }
    if (dk !== this._dayKey) { this._dayKey = dk; this._today = emptyPeriod(); this._lastImportCounter = null; this._lastExportCounter = null; }

    const snap = this._snapshot();
    const dtMs = this._lastTs ? Math.max(0, Math.min(10 * 60 * 1000, now - this._lastTs)) : 0;
    this._lastTs = now;

    if (snap.enabled && snap.status !== 'disabled' && dtMs > 0) {
      let importDelta = 0;
      let exportDelta = 0;
      if (Number.isFinite(snap.importEnergyKwhTotal) && snap.importEnergyKwhTotal > 0) {
        if (this._lastImportCounter !== null && snap.importEnergyKwhTotal >= this._lastImportCounter) importDelta = snap.importEnergyKwhTotal - this._lastImportCounter;
        this._lastImportCounter = snap.importEnergyKwhTotal;
      } else {
        importDelta = snap.importPowerW / 1000 * (dtMs / 3600000);
      }
      if (Number.isFinite(snap.exportEnergyKwhTotal) && snap.exportEnergyKwhTotal > 0) {
        if (this._lastExportCounter !== null && snap.exportEnergyKwhTotal >= this._lastExportCounter) exportDelta = snap.exportEnergyKwhTotal - this._lastExportCounter;
        this._lastExportCounter = snap.exportEnergyKwhTotal;
      } else {
        exportDelta = snap.exportPowerW / 1000 * (dtMs / 3600000);
      }
      this._addEnergy(importDelta, exportDelta, snap.prices);
    }

    await this._publish('tick', snap);
  }

  _addEnergy(importKwh, exportKwh, prices) {
    const imp = Math.max(0, Number(importKwh) || 0);
    const exp = Math.max(0, Number(exportKwh) || 0);
    const rv = exp * prices.returnValueEurPerKwh;
    const rc = exp * Math.max(0, prices.returnCostEurPerKwh);
    const risk = exp * Math.max(0, prices.gridImportEurPerKwh - prices.returnValueEurPerKwh + Math.max(0, prices.returnCostEurPerKwh));
    for (const p of [this._today, this._month, this._year]) {
      p.importKwh += imp;
      p.exportKwh += exp;
      p.returnValueEur += rv;
      p.returnCostEur += rc;
      p.salderingExitRiskEur += risk;
    }
  }

  _periodSummary(period, key) {
    return {
      key,
      importKwh: round(period.importKwh, 3),
      exportKwh: round(period.exportKwh, 3),
      returnValueEur: round(period.returnValueEur, 2),
      returnCostEur: round(period.returnCostEur, 2),
      netReturnValueEur: round(period.returnValueEur - period.returnCostEur, 2),
      salderingExitRiskEur: round(period.salderingExitRiskEur, 2),
    };
  }

  async _publish(reason, snap) {
    const a = this.adapter;
    if (!a || typeof a.setStateAsync !== 'function') return;
    const today = this._periodSummary(this._today, this._dayKey);
    const month = this._periodSummary(this._month, this._monthKey);
    const year = this._periodSummary(this._year, this._yearKey);
    const localPotential = Math.max(0, today.exportKwh);
    const saldering = {
      status: snap.status,
      directUseKwhToday: round(snap.directUseKwhToday, 3),
      returnedKwhToday: today.exportKwh,
      netAfnameKwhToday: today.importKwh,
      localUsePotentialKwhToday: localPotential,
      exitRiskEurToday: today.salderingExitRiskEur,
      note: snap.country === 'NL'
        ? 'NL-Basis: P1/DSMR normalisiert Netafname/Teruglevering. Einspeisebegrenzung bleibt separat im Export Guard mit Installerfreigabe.'
        : 'P1/DSMR läuft nur als Diagnose, weil das Länderprofil nicht NL ist.',
    };
    const terug = {
      returnValueEurPerKwh: snap.prices.returnValueEurPerKwh,
      returnCostEurPerKwh: snap.prices.returnCostEurPerKwh,
      returnedKwhToday: today.exportKwh,
      valueTodayEur: today.returnValueEur,
      costTodayEur: today.returnCostEur,
      netValueTodayEur: today.netReturnValueEur,
    };
    const summary = {
      version: '0.8.31',
      reason,
      status: snap.status,
      country: snap.country,
      enabled: snap.enabled,
      p1: {
        importPowerW: round(snap.importPowerW, 0),
        exportPowerW: round(snap.exportPowerW, 0),
        netPowerW: round(snap.netPowerW, 0),
        importEnergyKwhTotal: round(snap.importEnergyKwhTotal, 3),
        exportEnergyKwhTotal: round(snap.exportEnergyKwhTotal, 3),
        gasM3Total: round(snap.gasM3Total, 3),
        activeTariff: snap.activeTariff,
        dataQualityPercent: snap.dataQualityPercent,
        warning: snap.warning,
      },
      today,
      month,
      year,
      teruglevering: terug,
      saldering,
      sources: snap.sources,
    };
    const hash = JSON.stringify(summary);
    // Für schnelle P1-Werte immer schreiben; Hash wird nur für teure Debuglogs vorgehalten.
    this._lastHash = hash;

    const set = async (id, val) => { try { await a.setStateAsync(id, { val, ack: true }); } catch (_e) {} };
    await set('nl.p1.enabled', !!snap.enabled);
    await set('nl.p1.status', String(snap.status || 'ok'));
    await set('nl.p1.country', String(snap.country || 'DE'));
    await set('nl.p1.lastUpdate', Date.now());
    await set('nl.p1.importPowerW', Math.round(snap.importPowerW));
    await set('nl.p1.exportPowerW', Math.round(snap.exportPowerW));
    await set('nl.p1.netPowerW', Math.round(snap.netPowerW));
    await set('nl.p1.importEnergyKwhTotal', round(snap.importEnergyKwhTotal, 3));
    await set('nl.p1.exportEnergyKwhTotal', round(snap.exportEnergyKwhTotal, 3));
    await set('nl.p1.gasM3Total', round(snap.gasM3Total, 3));
    await set('nl.p1.activeTariff', String(snap.activeTariff || ''));
    await set('nl.p1.dataQualityPercent', snap.dataQualityPercent);
    await set('nl.p1.warning', String(snap.warning || ''));
    await set('nl.p1.sourcesJson', JSON.stringify(snap.sources || {}));
    await set('nl.p1.summaryJson', JSON.stringify(summary));

    for (const [prefix, p] of [['nl.p1.today', today], ['nl.p1.month', month], ['nl.p1.year', year]]) {
      await set(`${prefix}.key`, p.key);
      await set(`${prefix}.importKwh`, p.importKwh);
      await set(`${prefix}.exportKwh`, p.exportKwh);
      await set(`${prefix}.returnValueEur`, p.returnValueEur);
      await set(`${prefix}.returnCostEur`, p.returnCostEur);
      await set(`${prefix}.salderingExitRiskEur`, p.salderingExitRiskEur);
    }

    await set('nl.teruglevering.returnValueEurPerKwh', round(terug.returnValueEurPerKwh, 4));
    await set('nl.teruglevering.returnCostEurPerKwh', round(terug.returnCostEurPerKwh, 4));
    await set('nl.teruglevering.valueTodayEur', terug.valueTodayEur);
    await set('nl.teruglevering.costTodayEur', terug.costTodayEur);
    await set('nl.teruglevering.netValueTodayEur', terug.netValueTodayEur);
    await set('nl.teruglevering.summaryJson', JSON.stringify(terug));

    await set('nl.saldering.status', String(saldering.status || 'ok'));
    await set('nl.saldering.directUseKwhToday', saldering.directUseKwhToday);
    await set('nl.saldering.returnedKwhToday', saldering.returnedKwhToday);
    await set('nl.saldering.netAfnameKwhToday', saldering.netAfnameKwhToday);
    await set('nl.saldering.localUsePotentialKwhToday', saldering.localUsePotentialKwhToday);
    await set('nl.saldering.exitRiskEurToday', saldering.exitRiskEurToday);
    await set('nl.saldering.note', saldering.note);
    await set('nl.saldering.summaryJson', JSON.stringify(saldering));

    try { a._nwNlP1Runtime = summary; } catch (_e) {}
  }
}

module.exports = { NlP1DsmrModule };
