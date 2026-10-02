// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/year-report.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/year-report.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: a62290c3a9f75dd14e9dca104f681192c7091565c8b49abeda76b23cf5dac4c6
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/year-report.ts
 * Quell-Hash: sha256:614da58753da321555e4a698e92692e31fdc736b6b1835a70f2aea2ef1bbe072
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/year-report.js.
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
 * Aufgabe: Bereitet jahresbezogene Energie- und Anlagenwerte für die Berichtsseite auf.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/year-report.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/year-report.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/year-report.js`.
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

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/year-report.js
 * Rolle im Projekt: Frontend-Skript.
 * Zweck: Browserseitiger Code für eine Kunden-/Installerseite; liest APIs und aktualisiert DOM/UI.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Frontend-Skript einer VIS-/Kundenseite oder eines Reports.
 * Zusammenhänge:
 * - Spricht mit APIs aus main.js und rendert Daten aus /api/state, /config oder Reports.
 * - Styles liegen in www/styles.css bzw. Report-CSS-Dateien.
 * Wartungshinweise:
 * - Feature-Sichtbarkeit und Rollen beachten; Kundenfrontend darf keine Installerfunktionen öffnen.
 */

(function(){
  /**
   * Code-Teil: el
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function el(id){ return document.getElementById(id); }
  /**
   * Code-Teil: q
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function q(name){
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get(name);
    } catch(_e){
      return null;
    }
  }
  /**
   * Code-Teil: clampInt
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function clampInt(v, min, max, def){
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    const i = Math.trunc(n);
    return Math.max(min, Math.min(max, i));
  }
  /**
   * Code-Teil: toIsoDate
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function toIsoDate(ms){
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }
  /**
   * Code-Teil: fmtKwh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtKwh(n){
    const x = Number(n);
    if (!Number.isFinite(x)) return '0.0';
    return x.toFixed(1);
  }
  /**
   * Code-Teil: fmtPct
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtPct(n){
    const x = Number(n);
    if (!Number.isFinite(x)) return '0.0';
    return x.toFixed(1);
  }
  /**
   * Code-Teil: isFiniteNum
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function isFiniteNum(n){
    return Number.isFinite(Number(n));
  }
  /**
   * Code-Teil: pickEnergyKwh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function pickEnergyKwh(counterVal, integratedVal){
    const counter = Number(counterVal);
    const integrated = Number(integratedVal);
    const counterOk = Number.isFinite(counter) && counter >= 0;
    const integratedOk = Number.isFinite(integrated) && integrated >= 0;
    if (!counterOk) return integratedOk ? integrated : 0;
    if (!integratedOk) return counter;

    // Robust fallback: if the kWh counter delta is 0 / near 0 but the integrated
    // power series clearly contains energy, trust the time series for the report.
    const counterTooSmall = counter <= Math.max(0.05, integrated * 0.1);
    if (integrated > 0.25 && counterTooSmall) return integrated;
    return counter;
  }

  // Integrate a power series (W) to energy (kWh).
  // Input: [[ts, W], ...] where ts can be ms/seconds/string.
  /**
   * Code-Teil: toTsMs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function toTsMs(t){
    if (t === null || t === undefined) return NaN;
    if (typeof t === 'number') {
      if (!Number.isFinite(t)) return NaN;
      return (t > 0 && t < 1e12) ? t * 1000 : t;
    }
    if (t instanceof Date) return t.getTime();
    if (typeof t === 'string') {
      const s = t.trim();
      if (!s) return NaN;
      const asNum = Number(s);
      if (Number.isFinite(asNum)) return (asNum > 0 && asNum < 1e12) ? asNum * 1000 : asNum;
      const parsed = Date.parse(s);
      return Number.isNaN(parsed) ? NaN : parsed;
    }
    const n = Number(t);
    return Number.isFinite(n) ? ((n > 0 && n < 1e12) ? n * 1000 : n) : NaN;
  }
  /**
   * Code-Teil: sumEnergyKWh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function sumEnergyKWh(vals){
    if(!Array.isArray(vals) || vals.length < 2) return 0;
    const pts = vals
      .map(p => [toTsMs(p && p[0]), p && p[1]])
      .map(([ts, v]) => ({ ts, v: Number(v) }))
      .filter(p => Number.isFinite(p.ts) && Number.isFinite(p.v))
      .sort((a,b) => a.ts - b.ts);
    if (pts.length < 2) return 0;

    let eWh = 0;
    for (let i=0; i<pts.length-1; i++){
      const t0 = pts[i].ts;
      const t1 = pts[i+1].ts;
      if (!(t1 > t0)) continue;
      const v0 = Math.abs(pts[i].v);
      const v1 = Math.abs(pts[i+1].v);
      const dt_s = (t1 - t0) / 1000;
      const avgW = (v0 + v1) / 2;
      eWh += avgW * dt_s / 3600;
    }
    return eWh / 1000;
  }

  // ------------------------------
  // Report state
  // ------------------------------
  // Default view: show everything in one table (overview).
  // The other tabs act as optional filters.
  let activeTab = 'all';
  let report = null; // computed data
  /**
   * Code-Teil: setError
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setError(msg){
    const err = el('err');
    if (!err) return;
    if (!msg){
      err.textContent = '';
      err.classList.add('hidden');
      return;
    }
    err.textContent = msg;
    err.classList.remove('hidden');
  }
  /**
   * Code-Teil: setHint
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setHint(html){
    const h = el('hint');
    if (!h) return;
    h.innerHTML = html || '';
  }
  /**
   * Code-Teil: setMeta
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setMeta(text){
    const m = el('rangeMeta');
    if (m) m.textContent = text || '';
  }
  /**
   * Code-Teil: setTableLoading
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setTableLoading(){
    const thead = el('thead');
    const tbody = el('tbody');
    if (thead) thead.innerHTML = '';
    if (tbody) tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Lade Daten…</td></tr>';
  }
  /**
   * Code-Teil: getYearsFromQuery
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getYearsFromQuery(){
    const now = new Date();
    const endYear = clampInt(q('y'), 2000, 2100, now.getFullYear());
    const span = clampInt(q('span'), 1, 10, 4);
    const years = [];
    for (let y = endYear - span + 1; y <= endYear; y++) years.push(y);
    return { endYear, span, years };
  }
  /**
   * Code-Teil: fetchYear
   * Zweck: Holt Daten über HTTP/API oder aus externen Quellen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function fetchYear(year){
    const nowMs = Date.now();
    const fromMs = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
    const endMs = new Date(year + 1, 0, 1, 0, 0, 0, 0).getTime();
    const toMs = Math.min(endMs, nowMs); // year-to-date for current year

    // Keep the year report lightweight: a coarse step is enough for kWh integration,
    // and prevents getHistory limits.
    const step = 21600; // 6h

    const url = `/api/history?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}&step=${encodeURIComponent(step)}`;
    const res = await fetch(url).then(r=>r.json()).catch(()=>null);
    if (!res || !res.ok) return { ok:false, year, fromMs, toMs, res };
    return { ok:true, year, fromMs, toMs, res };
  }
  /**
   * Code-Teil: computeYearTotals
   * Zweck: Berechnet abgeleitete Werte.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function computeYearTotals(item){
    const year = item.year;
    const res = item.res || {};
    const series = (res.series && typeof res.series === 'object') ? res.series : {};
    const extras = (res.extras && typeof res.extras === 'object') ? res.extras : { consumers: [], producers: [] };
    const energy = (res.energy && typeof res.energy === 'object') ? res.energy : {};

    const producers = (Array.isArray(extras.producers) ? extras.producers : [])
      .map(p => ({
        idx: Number(p && p.idx) || 0,
        name: (p && p.name) ? String(p.name) : 'Erzeuger',
        id: p && p.id,
        kwh: sumEnergyKWh(Array.isArray(p && p.values) ? p.values : [])
      }))
      .filter(p => p.idx > 0)
      .sort((a,b) => a.idx - b.idx);

    const consumers = (Array.isArray(extras.consumers) ? extras.consumers : [])
      .map(c => ({
        idx: Number(c && c.idx) || 0,
        name: (c && c.name) ? String(c.name) : 'Verbraucher',
        id: c && c.id,
        kwh: sumEnergyKWh(Array.isArray(c && c.values) ? c.values : [])
      }))
      .filter(c => c.idx > 0)
      .sort((a,b) => a.idx - b.idx);

    const integratedGridImportKwh = sumEnergyKWh(series.buy && series.buy.values);
    const integratedGridExportKwh = sumEnergyKWh(series.sell && series.sell.values);
    const integratedChargeKwh = sumEnergyKWh(series.chg && series.chg.values);
    const integratedDischargeKwh = sumEnergyKWh(series.dchg && series.dchg.values);
    const integratedEvKwh = sumEnergyKWh(series.evcs && series.evcs.values);
    const integratedPvKwh = sumEnergyKWh(series.pv && series.pv.values);
    const integratedLoadKwh = sumEnergyKWh(series.load && series.load.values);

    // Core totals (prefer counters, but fall back to the time series if the counter delta
    // is implausibly small for the selected year)
    const gridImportKwh = pickEnergyKwh(energy.gridImportKwh, integratedGridImportKwh);
    const gridExportKwh = pickEnergyKwh(energy.gridExportKwh, integratedGridExportKwh);

    const chargeKwh = pickEnergyKwh(energy.storageChargeKwh, integratedChargeKwh);
    const dischargeKwh = pickEnergyKwh(energy.storageDischargeKwh, integratedDischargeKwh);
    const batteryLossKwh = Math.max(0, (Number.isFinite(chargeKwh) ? chargeKwh : 0) - (Number.isFinite(dischargeKwh) ? dischargeKwh : 0));

    // EV energy (optional)
    const evKwh = pickEnergyKwh(energy.evKwh, integratedEvKwh);

    // Production: if producers are configured, prefer the breakdown sum so the totals match.
    const sumProducers = producers.reduce((s,p)=> s + (Number.isFinite(p.kwh) ? p.kwh : 0), 0);
    const productionRefKwh = sumProducers > 0.01 ? sumProducers : integratedPvKwh;
    const productionKwh = pickEnergyKwh(energy.productionKwh, productionRefKwh);

    // Consumption: prefer the measured yearly total, otherwise the integrated load history,
    // otherwise fall back to the physical energy balance (inkl. Batterie).
    const balanceConsumptionKwh = Math.max(0,
      (Number.isFinite(productionKwh) ? productionKwh : 0) +
      (Number.isFinite(gridImportKwh) ? gridImportKwh : 0) +
      (Number.isFinite(dischargeKwh) ? dischargeKwh : 0) -
      (Number.isFinite(chargeKwh) ? chargeKwh : 0) -
      (Number.isFinite(gridExportKwh) ? gridExportKwh : 0)
    );
    const consumptionRefKwh = integratedLoadKwh > 0.01 ? integratedLoadKwh : balanceConsumptionKwh;
    const consumptionKwh = pickEnergyKwh(energy.consumptionKwh, consumptionRefKwh);

    // Quotes
    const selfConsumedKwh = Math.max(0, productionKwh - (Number.isFinite(gridExportKwh) ? gridExportKwh : 0));
    const selfConsumptionPct = productionKwh > 0.0001 ? (selfConsumedKwh / productionKwh) * 100 : 0;
    const autarkyPct = consumptionKwh > 0.0001 ? (selfConsumedKwh / consumptionKwh) * 100 : 0;

    return {
      year,
      productionKwh,
      consumptionKwh,
      gridImportKwh,
      gridExportKwh,
      producers,
      consumers,
      evKwh,
      chargeKwh,
      dischargeKwh,
      batteryLossKwh,
      selfConsumptionPct,
      autarkyPct,
      _meta: {
        fromMs: item.fromMs,
        toMs: item.toMs,
        countersEndMs: (res.energy && res.energy.__endMs) ? Number(res.energy.__endMs) : null
      }
    };
  }
  /**
   * Code-Teil: collectDefs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function collectDefs(years, byYear, kind){
    // kind: 'producers' | 'consumers'
    const map = new Map(); // idx -> name
    years.forEach(y => {
      const yr = byYear[y];
      const arr = yr && Array.isArray(yr[kind]) ? yr[kind] : [];
      arr.forEach(it => {
        const idx = Number(it && it.idx) || 0;
        if (!idx) return;
        const name = (it && it.name) ? String(it.name) : '';
        if (!map.has(idx)) map.set(idx, name || (kind === 'producers' ? `Erzeuger ${idx}` : `Verbraucher ${idx}`));
      });
    });
    return Array.from(map.entries())
      .map(([idx, name]) => ({ idx, name }))
      .sort((a,b) => a.idx - b.idx);
  }
  /**
   * Code-Teil: getYearVal
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getYearVal(yearObj, key){
    const v = yearObj ? yearObj[key] : 0;
    return Number.isFinite(Number(v)) ? Number(v) : 0;
  }
  /**
   * Code-Teil: renderTable
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderTable(rows, years, byYear, { unit = 'kWh', decimals = 1 } = {}){
    const thead = el('thead');
    const tbody = el('tbody');
    if (!thead || !tbody) return;

    let h = '<tr>';
    h += '<th></th>';
    years.forEach(y => { h += `<th>${y}</th>`; });
    h += '</tr>';
    thead.innerHTML = h;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${years.length + 1}" style="text-align:left;color:#9aa4ad;">Keine Daten / keine Zuordnung.</td></tr>`;
      return;
    }

    /**
     * Code-Teil: Arrow-Funktion `fmt`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: fmt
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const fmt = (n) => {
      const x = Number(n);
      if (!Number.isFinite(x)) return (0).toFixed(decimals);
      return x.toFixed(decimals);
    };

    let html = '';
    rows.forEach(r => {
      html += '<tr>';
      html += `<td>${String(r.label || '').replace(/</g,'&lt;')}</td>`;
      years.forEach(y => {
        const yr = byYear[y];
        const raw = (typeof r.get === 'function') ? r.get(yr, y) : (yr ? yr[r.key] : 0);
        const val = Number.isFinite(Number(raw)) ? Number(raw) : 0;
        html += `<td>${fmt(val)}</td>`;
      });
      html += '</tr>';
    });
    tbody.innerHTML = html;

    // Hint for unit
    const u = unit ? String(unit) : '';
    const suffix = u ? ` <span style="opacity:.7">[${u}]</span>` : '';
    // (We put the unit into the hint below, to keep the table clean.)
  }
  /**
   * Code-Teil: renderGroupedTable
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderGroupedTable(sections, years, byYear){
    const thead = el('thead');
    const tbody = el('tbody');
    if (!thead || !tbody) return;

    let h = '<tr>';
    h += '<th></th>';
    years.forEach(y => { h += `<th>${y}</th>`; });
    h += '</tr>';
    thead.innerHTML = h;

    const colSpan = years.length + 1;
    /**
     * Code-Teil: Arrow-Funktion `esc`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: esc
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const esc = (s) => String(s || '').replace(/</g,'&lt;');

    if (!Array.isArray(sections) || sections.length === 0){
      tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:left;color:#9aa4ad;">Keine Daten.</td></tr>`;
      return;
    }

    let html = '';
    sections.forEach((sec, idx) => {
      const title = esc(sec && sec.title);
      const unit = sec && sec.unit ? String(sec.unit) : '';
      const decimals = Number.isFinite(Number(sec && sec.decimals)) ? Number(sec.decimals) : 1;
      const rows = Array.isArray(sec && sec.rows) ? sec.rows : [];

      html += `<tr class="group-row"><td colspan="${colSpan}">${title}${unit ? ` <span class="group-unit">[${esc(unit)}]</span>` : ''}</td></tr>`;

      if (!rows.length){
        html += `<tr class="empty-row"><td colspan="${colSpan}">Keine Daten / keine Zuordnung.</td></tr>`;
      } else {
        rows.forEach(r => {
          html += '<tr class="data-row">';
          html += `<td>${esc(r.label)}</td>`;
          years.forEach(y => {
            const yr = byYear[y];
            const raw = (typeof r.get === 'function') ? r.get(yr, y) : (yr ? yr[r.key] : 0);
            const val = Number.isFinite(Number(raw)) ? Number(raw) : 0;
            const d = (r && r.decimals !== undefined && r.decimals !== null) ? Number(r.decimals) : decimals;
            const dd = Number.isFinite(d) ? d : decimals;
            html += `<td>${val.toFixed(dd)}</td>`;
          });
          html += '</tr>';
        });
      }

      if (idx !== sections.length - 1){
        html += `<tr class="spacer-row"><td colspan="${colSpan}"></td></tr>`;
      }
    });

    tbody.innerHTML = html;
  }
  /**
   * Code-Teil: renderActiveTab
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderActiveTab(){
    if (!report) return;
    const years = report.years;
    const byYear = report.byYear;

    const defsP = report.producerDefs;
    const defsC = report.consumerDefs;

    const includeEvRow = !!report.hasEv && !report.consumerHasEvNamed;

    // --- build sections (rows + hints), used for both overview and optional tab filters ---
    const sectionSummary = {
      id: 'summary',
      title: 'Aufsummiert',
      unit: 'kWh',
      decimals: 1,
      rows: [
        { label: 'Erzeugung', key: 'productionKwh' },
        { label: 'Verbrauch', key: 'consumptionKwh' },
        { label: 'Netzbezug', key: 'gridImportKwh' },
        { label: 'Netzeinspeisung', key: 'gridExportKwh' }
      ],
      hint: 'Hinweis: Werte werden bevorzugt aus kWh‑Zählern (Differenz) berechnet. Falls keine kWh‑Zähler gemappt sind, erfolgt die Berechnung über die Integration der Leistung (W).'
    };

    const sectionProducers = {
      id: 'producers',
      title: 'Erzeuger',
      unit: 'kWh',
      decimals: 1,
      rows: defsP.map(d => ({
        label: d.name,
        get: (yr) => {
          const arr = yr && Array.isArray(yr.producers) ? yr.producers : [];
          const it = arr.find(p => Number(p.idx) === Number(d.idx));
          return it ? it.kwh : 0;
        }
      })),
      hint: 'Erzeuger‑Aufschlüsselung basiert auf den im Energiefluss‑Monitor gemappten Erzeuger‑Slots.'
    };
    const consumerRows = defsC.map(d => ({
      label: d.name,
      get: (yr) => {
        const arr = yr && Array.isArray(yr.consumers) ? yr.consumers : [];
        const it = arr.find(c => Number(c.idx) === Number(d.idx));
        return it ? it.kwh : 0;
      }
    }));

    if (includeEvRow) {
      consumerRows.push({ label: 'E‑Mobilität', key: '__ev', get: (yr) => getYearVal(yr, 'evKwh') });
    }

    // Optional: Rest/Unbekannt (wenn Gesamtverbrauch deutlich größer als Summe der Verbraucher + Batterieverluste)
    const restByYear = years.map(y => {
      const yr = byYear[y];
      const sumC = (yr && Array.isArray(yr.consumers)) ? yr.consumers.reduce((s,c)=> s + (Number.isFinite(c.kwh) ? c.kwh : 0), 0) : 0;
      const ev = includeEvRow ? getYearVal(yr, 'evKwh') : 0;
      const total = getYearVal(yr, 'consumptionKwh');
      return Math.max(0, total - sumC - ev);
    });
    const restMax = Math.max(...restByYear);
    if (Number.isFinite(restMax) && restMax > 1.0) {
      consumerRows.push({
        label: 'Sonstiges',
        get: (_yr, y) => {
          const idx = years.indexOf(y);
          return idx >= 0 ? restByYear[idx] : 0;
        }
      });
    }

    const sectionConsumers = {
      id: 'consumers',
      title: 'Verbraucher',
      unit: 'kWh',
      decimals: 1,
      rows: consumerRows,
      hint: 'Verbraucher‑Aufschlüsselung basiert auf den im Energiefluss‑Monitor gemappten Verbraucher‑Slots.' + (includeEvRow ? ' E‑Mobilität wird zusätzlich als Gesamtwert aus der EVCS‑Historie angezeigt.' : '')
    };

    const sectionBattery = {
      id: 'battery',
      title: 'Batterien',
      unit: 'kWh',
      decimals: 1,
      rows: [
        { label: 'Batterieladung', key: 'chargeKwh' },
        { label: 'Batterieentladung', key: 'dischargeKwh' },
        { label: 'Batterieeigenverbrauch', key: 'batteryLossKwh' }
      ],
      hint: 'Batterieeigenverbrauch = Batterieladung − Batterieentladung (Verluste).'
    };

    const sectionQuotes = {
      id: 'quotes',
      title: 'Quoten',
      unit: '%',
      decimals: 1,
      rows: [
        { label: 'Eigenverbrauch', key: 'selfConsumptionPct' },
        { label: 'Autarkie', key: 'autarkyPct' }
      ],
      hint: 'Eigenverbrauch = (Erzeugung − Einspeisung) / Erzeugung. Autarkie = (Erzeugung − Einspeisung) / Verbrauch.'
    };

    const sections = [sectionSummary, sectionProducers, sectionConsumers, sectionBattery, sectionQuotes];
    const byId = Object.create(null);
    sections.forEach(s => { byId[s.id] = s; });

    // Default: one-page overview
    if (activeTab === 'all') {
      renderGroupedTable(sections, years, byYear);
      setHint('Übersicht: Alle Bereiche werden auf einer Seite angezeigt. Tipp: Mit den Reitern oben kannst du optional einzelne Bereiche filtern. ' + sectionSummary.hint);
      return;
    }

    const sec = byId[activeTab];
    if (!sec) {
      // Fallback
      activeTab = 'all';
      renderGroupedTable(sections, years, byYear);
      setHint('Übersicht: Alle Bereiche werden auf einer Seite angezeigt. Tipp: Mit den Reitern oben kannst du optional einzelne Bereiche filtern. ' + sectionSummary.hint);
      return;
    }

    renderTable(sec.rows, years, byYear, { unit: sec.unit, decimals: sec.decimals });
    setHint(sec.hint || '');
  }
  /**
   * Code-Teil: setActiveTab
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setActiveTab(tab){
    activeTab = tab;
    const btns = Array.from(document.querySelectorAll('.rep-tab'));
    btns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    renderActiveTab();
  }
  /**
   * Code-Teil: buildCsv
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildCsv(){
    if (!report) return '';
    const years = report.years;
    const byYear = report.byYear;

    const lines = [];
    /**
     * Code-Teil: addSection
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function addSection(title, rows){
      lines.push(title);
      lines.push(['', ...years].join(';'));
      rows.forEach(r => {
        const row = [r.label];
        years.forEach(y => {
          const yr = byYear[y];
          const raw = (typeof r.get === 'function') ? r.get(yr, y) : (yr ? yr[r.key] : 0);
          const val = Number.isFinite(Number(raw)) ? Number(raw) : 0;
          row.push(val.toFixed(r.decimals ?? 1));
        });
        lines.push(row.join(';'));
      });
      lines.push('');
    }

    // Summary
    addSection('Aufsummiert [kWh]', [
      { label: 'Erzeugung', key: 'productionKwh', decimals: 1 },
      { label: 'Verbrauch', key: 'consumptionKwh', decimals: 1 },
      { label: 'Netzbezug', key: 'gridImportKwh', decimals: 1 },
      { label: 'Netzeinspeisung', key: 'gridExportKwh', decimals: 1 }
    ]);

    // Producers
    const pRows = report.producerDefs.map(d => ({
      label: d.name,
      decimals: 1,
      get: (yr) => {
        const arr = yr && Array.isArray(yr.producers) ? yr.producers : [];
        const it = arr.find(p => Number(p.idx) === Number(d.idx));
        return it ? it.kwh : 0;
      }
    }));
    addSection('Erzeuger [kWh]', pRows);

    // Consumers
    const cRows = report.consumerDefs.map(d => ({
      label: d.name,
      decimals: 1,
      get: (yr) => {
        const arr = yr && Array.isArray(yr.consumers) ? yr.consumers : [];
        const it = arr.find(c => Number(c.idx) === Number(d.idx));
        return it ? it.kwh : 0;
      }
    }));
    if (report.hasEv && !report.consumerHasEvNamed) {
      cRows.push({ label: 'E‑Mobilität', decimals: 1, get: (yr) => getYearVal(yr, 'evKwh') });
    }
    addSection('Verbraucher [kWh]', cRows);

    // Battery
    addSection('Batterien [kWh]', [
      { label: 'Batterieladung', key: 'chargeKwh', decimals: 1 },
      { label: 'Batterieentladung', key: 'dischargeKwh', decimals: 1 },
      { label: 'Batterieeigenverbrauch', key: 'batteryLossKwh', decimals: 1 }
    ]);

    // Quotes
    addSection('Quoten [%]', [
      { label: 'Eigenverbrauch', key: 'selfConsumptionPct', decimals: 1 },
      { label: 'Autarkie', key: 'autarkyPct', decimals: 1 }
    ]);

    return lines.join('\n');
  }
  /**
   * Code-Teil: downloadCsv
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function downloadCsv(){
    const csv = buildCsv();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexowatt-jahresreport.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(_e){} }, 2500);
  }
  /**
   * Code-Teil: load
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function load(){
    setError('');
    setTableLoading();

    const { years } = getYearsFromQuery();
    const now = new Date();
    const endYear = years[years.length - 1];
    setMeta(`${years[0]} – ${endYear} (Stand: ${toIsoDate(now.getTime())})`);

    // Fetch each year in parallel
    const results = await Promise.all(years.map(y => fetchYear(y)));
    const ok = results.filter(r => r && r.ok);

    if (!ok.length){
      setError('Jahresreport: Daten konnten nicht geladen werden (History API).');
      const tbody = el('tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Keine Daten.</td></tr>';
      return;
    }

    const byYear = {};
    years.forEach(y => { byYear[y] = null; });
    ok.forEach(item => {
      try { byYear[item.year] = computeYearTotals(item); } catch(_e) { byYear[item.year] = null; }
    });

    const producerDefs = collectDefs(years, byYear, 'producers');
    const consumerDefs = collectDefs(years, byYear, 'consumers');

    // EV row: only add if present, and not already represented by a consumer slot name
    const hasEv = years.some(y => {
      const yr = byYear[y];
      const v = yr ? yr.evKwh : 0;
      return Number.isFinite(Number(v)) && Number(v) > 0.01;
    });
    const consumerHasEvNamed = consumerDefs.some(d => {
      const n = String(d.name || '').toLowerCase();
      return n.includes('e-mobil') || n.includes('emobil') || n.includes('evcs') || n.includes('wallbox');
    });

    report = { years, byYear, producerDefs, consumerDefs, hasEv, consumerHasEvNamed };

    renderActiveTab();
  }
  /**
   * Code-Teil: init
   * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function init(){
    // Tabs
    Array.from(document.querySelectorAll('.rep-tab')).forEach(btn => {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', ()=> setActiveTab(btn.dataset.tab));
    });

    // Optional: allow deep-links into a specific section via ?tab=
    // (default stays on the one-page overview)
    (function(){
      const raw = (q('tab') || '').trim().toLowerCase();
      const allowed = new Set(['all','summary','producers','consumers','battery','quotes']);
      setActiveTab(allowed.has(raw) ? raw : 'all');
    })();

    // Reload / Print / CSV
    const reloadBtn = el('reloadBtn');
    const printBtn = el('printBtn');
    const exportBtn = el('exportBtn');
    if (reloadBtn) reloadBtn.addEventListener('click', load);
    if (printBtn) printBtn.addEventListener('click', async ()=>{
      await load();
      // give browser time to paint
      await new Promise(r => requestAnimationFrame(r));
      await new Promise(r => requestAnimationFrame(r));
      window.print();
    });
    if (exportBtn) exportBtn.addEventListener('click', downloadCsv);

    // Info
    const infoBtn = el('infoBtn');
    if (infoBtn) infoBtn.addEventListener('click', ()=>{
      const h = el('hint');
      if (!h) return;
      // Toggle via a small inline flag
      const isCollapsed = h.getAttribute('data-collapsed') === '1';
      if (isCollapsed) {
        h.setAttribute('data-collapsed', '0');
        h.style.display = '';
      } else {
        h.setAttribute('data-collapsed', '1');
        h.style.display = 'none';
      }
    });

    // Back button
    const backBtn = el('backBtn');
    if (backBtn) backBtn.addEventListener('click', () => {
      try{
        const ref = document.referrer || '';
        if (ref && ref.indexOf(window.location.origin) === 0 && window.history.length > 1){
          window.history.back();
          return;
        }
      }catch(_e){}
      window.location.href = '/history';
    });

    // Default meta from query
    const { years } = getYearsFromQuery();
    if (years && years.length){
      const now = new Date();
      setMeta(`${years[0]} – ${years[years.length-1]} (Stand: ${toIsoDate(now.getTime())})`);
    }

    // initial load
    load();

    // Live indicator (Status-Dot) via SSE
    (function(){
      const liveDot = document.getElementById('liveDot');
      if (!liveDot || typeof window.EventSource === 'undefined') return;
      try{
        const es = new EventSource('/events');
        es.onopen = () => { try{ liveDot.classList.add('live'); }catch(_e){} };
        es.onerror = () => { try{ liveDot.classList.remove('live'); }catch(_e){} };
      }catch(_e){}
    })();

    // ------------------------------
    // Header interactions (same behavior as other pages)
    // ------------------------------
    (function setupTopbar(){
      const menuBtn = document.getElementById('menuBtn');
      const menuDropdown = document.getElementById('menuDropdown');
      if (menuBtn && menuDropdown){
        if (menuBtn.dataset.nwMenuBound) return;
        // 0.8.21: Jahresreport setzt den gemeinsamen Menü-Guard, damit die Shell
        // nicht zusätzlich bindet und das Dropdown unmittelbar wieder schließt.
        menuBtn.dataset.nwMenuBound = 'year-report';
        menuBtn.dataset.nwAppMenu = '1';
        /**
         * Code-Teil: Arrow-Funktion `close`
         * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: close
         * Zweck: Schließt Dialoge/Seiten/Popovers.
         * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const close = () => menuDropdown.classList.add('hidden');
        /**
         * Code-Teil: toggle
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const toggle = () => menuDropdown.classList.toggle('hidden');
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menuBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        menuBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menuDropdown. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        menuDropdown.addEventListener('click', (e) => e.stopPropagation());
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        document.addEventListener('click', (e) => { const target = e && e.target; if (!menuBtn.contains(target) && !menuDropdown.contains(target)) close(); });
      }
    })();

    // EVCS / SmartHome / Speicherfarm visibility (same logic as History)
    (function(){
      fetch('/config', { cache: 'no-store' }).then(r=>r.json()).then(cfg=>{
        const sc = (cfg && cfg.settingsConfig) || {};
        const evcsAvailable = ((Number(sc.evcsConfiguredCount || 0) || (Array.isArray(sc.evcsList) ? sc.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
        const c = evcsAvailable ? Math.max(0, Math.round(Number(sc.evcsCount) || 0)) : 0;
        const showEvcs = evcsAvailable && c >= 2;
        const l = document.getElementById('menuEvcsLink');
        if (l) l.classList.toggle('hidden', !showEvcs);
        const t = document.getElementById('tabEvcs');
        if (t) t.classList.toggle('hidden', !showEvcs);

        const sh = !!(cfg.featureVisibility && cfg.featureVisibility.hasSmartHome === true);
        const sl = document.getElementById('menuSmartHomeLink');
        if (sl) sl.classList.toggle('hidden', !sh);
        const st = document.getElementById('tabSmartHome');
        if (st) st.classList.toggle('hidden', !sh);

        const sf = !!(cfg.featureVisibility && cfg.featureVisibility.hasStorageFarm === true);
        const sft = document.getElementById('tabStorageFarm');
        if (sft) sft.classList.toggle('hidden', !sf);
        const sfl = document.getElementById('menuStorageFarmLink');
        if (sfl) sfl.classList.toggle('hidden', !sf);
      }).catch(()=>{});
    })();
  }

  init();
})();
