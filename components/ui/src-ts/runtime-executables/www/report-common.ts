// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt gemeinsame Datums-, Darstellungs- und Bedienhilfen für Berichtsseiten.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/report-common.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/report-common.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/report-common.js`.
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
 * Datei: www/report-common.js
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

  const nwReportLocaleTag = () => { const lang = String((window.NexoWattI18n && window.NexoWattI18n.localeTag && window.NexoWattI18n.localeTag()) || document.documentElement.lang || navigator.language || 'de').toLowerCase(); return lang.startsWith('nl') ? 'nl-NL' : (lang.startsWith('en') ? 'en-GB' : 'de-DE'); }; const nfCache = new Map();
  /**
   * Code-Teil: getNf
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getNf(decimals){
    const key = nwReportLocaleTag() + ':' + String(decimals);
    let nf = nfCache.get(key);
    if (!nf){
      nf = new Intl.NumberFormat(nwReportLocaleTag(), {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      nfCache.set(key, nf);
    }
    return nf;
  }
  /**
   * Code-Teil: fmtNum
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtNum(value, decimals, fallback = '—'){
    const n = Number(value);
    return Number.isFinite(n) ? getNf(decimals).format(n) : fallback;
  }
  /**
   * Code-Teil: fmtMoney
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtMoney(value, fallback = '—'){
    const n = Number(value);
    return Number.isFinite(n) ? (getNf(2).format(n) + ' €') : fallback;
  }
  /**
   * Code-Teil: fmtPrice
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtPrice(value, fallback = '—'){
    const n = Number(value);
    return Number.isFinite(n) ? (getNf(2).format(n) + ' €/kWh') : fallback;
  }
  /**
   * Code-Teil: fmtKwh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtKwh(value, fallback = '—'){
    const n = Number(value);
    return Number.isFinite(n) ? (getNf(2).format(n) + ' kWh') : fallback;
  }
  /**
   * Code-Teil: fmtPower
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtPower(value, fallback = '—'){
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    if (Math.abs(n) >= 1000) return getNf(1).format(n / 1000) + ' kW';
    return getNf(0).format(n) + ' W';
  }
  /**
   * Code-Teil: pad2
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function pad2(n){ return String(n).padStart(2, '0'); }
  /**
   * Code-Teil: toInputValue
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function toInputValue(ms){
    const ts = Number(ms);
    const d = Number.isFinite(ts) ? new Date(ts) : new Date();
    const local = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 16);
  }
  /**
   * Code-Teil: parseInputValue
   * Zweck: Parst Rohdaten in ein sicheres internes Format.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function parseInputValue(raw, fallbackMs){
    if (raw == null || raw === '') return Number(fallbackMs) || Date.now();
    const s = String(raw).trim();
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) return parsed;
    const n = Number(s);
    if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
    return Number(fallbackMs) || Date.now();
  }
  /**
   * Code-Teil: fmtDateTime
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtDateTime(ms, fallback = '—'){
    const ts = Number(ms);
    if (!Number.isFinite(ts) || ts <= 0) return fallback;
    try { return new Date(ts).toLocaleString(nwReportLocaleTag()); } catch (_e) { return fallback; }
  }
  /**
   * Code-Teil: fmtDate
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtDate(ms, fallback = '—'){
    const ts = Number(ms);
    if (!Number.isFinite(ts) || ts <= 0) return fallback;
    try { return new Date(ts).toLocaleDateString(nwReportLocaleTag()); } catch (_e) { return fallback; }
  }
  /**
   * Code-Teil: fmtTime
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtTime(ms, fallback = '—'){
    const ts = Number(ms);
    if (!Number.isFinite(ts) || ts <= 0) return fallback;
    try { return new Date(ts).toLocaleTimeString(nwReportLocaleTag(), { hour:'2-digit', minute:'2-digit' }); } catch (_e) { return fallback; }
  }
  /**
   * Code-Teil: setUrlParams
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setUrlParams(params){
    try {
      const url = new URL(window.location.href);
      Object.keys(params || {}).forEach((key) => {
        const value = params[key];
        if (value === undefined || value === null || value === '') url.searchParams.delete(key);
        else url.searchParams.set(key, String(value));
      });
      window.history.replaceState({}, '', url.toString());
    } catch (_e) {}
  }
  /**
   * Code-Teil: getQuery
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getQuery(name){
    try { return new URL(window.location.href).searchParams.get(name); } catch (_e) { return null; }
  }
  /**
   * Code-Teil: downloadText
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function downloadText(filename, text, type = 'text/plain;charset=utf-8'){
    const blob = new Blob([text == null ? '' : String(text)], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }
  /**
   * Code-Teil: escapeHtml
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  /**
   * Code-Teil: setupTopbar
   * Zweck: Bereitet Konfiguration/Eventbindung für diesen Bereich vor.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setupTopbar(activeTab = 'history'){
    const menuBtn = el('menuBtn');
    const menuDropdown = el('menuDropdown');
    if (menuBtn && menuDropdown && !menuBtn.dataset.nwMenuBound){
      // 0.8.21: Reports binden das Burger-Menü mit demselben Guard wie die App-Seiten,
      // damit nw-shell.js nicht zusätzlich toggelt. Das Dropdown schließt nur bei echten
      // Außenklicks, nicht bei Klicks auf Button-Kindelemente oder Menüeinträge.
      menuBtn.dataset.nwMenuBound = 'report-common';
      menuBtn.dataset.nwAppMenu = '1';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menuBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menuDropdown.classList.toggle('hidden');
      });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      document.addEventListener('click', (e) => { const target = e && e.target; if (!menuBtn.contains(target) && !menuDropdown.contains(target)) menuDropdown.classList.add('hidden'); });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menuDropdown. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      menuDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    ['liveTabBtn', 'historyTabBtn'].forEach((id) => {
      const btn = el(id);
      if (!btn) return;
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });

    const liveDot = el('liveDot');
    try {
      const es = new EventSource('/events');
      es.onopen = () => { if (liveDot) liveDot.classList.add('live'); };
      es.onerror = () => { if (liveDot) liveDot.classList.remove('live'); };
    } catch (_e) {}

    (async () => {
      try {
        const res = await fetch('/config');
        const cfg = await res.json();
        const settingsConfig = (cfg && cfg.settingsConfig) || {};
        const smartHomeEnabled = !!(cfg && cfg.featureVisibility && cfg.featureVisibility.hasSmartHome === true);
        const storageFarmEnabled = !!(cfg && cfg.featureVisibility && cfg.featureVisibility.hasStorageFarm === true);
        const evcsAvailable = ((Number(settingsConfig.evcsConfiguredCount || 0) || (Array.isArray(settingsConfig.evcsList) ? settingsConfig.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
        const evcsCount = evcsAvailable ? Math.max(0, Math.round(Number(settingsConfig.evcsCount) || 0)) : 0;
        const showEvcs = evcsAvailable && evcsCount >= 2;

        const map = [
          ['tabEvcs', 'menuEvcsLink', showEvcs],
          ['tabSmartHome', 'menuSmartHomeLink', smartHomeEnabled],
          ['tabStorageFarm', 'menuStorageFarmLink', storageFarmEnabled],
        ];
        map.forEach(([tabId, menuId, visible]) => {
          const tab = el(tabId);
          const menu = el(menuId);
          if (tab) tab.classList.toggle('hidden', !visible);
          if (menu) menu.classList.toggle('hidden', !visible);
        });
      } catch (_e) {}
    })();
  }

  window.NWReportCommon = {
    el,
    fmtNum,
    fmtMoney,
    fmtPrice,
    fmtKwh,
    fmtPower,
    fmtDateTime,
    fmtDate,
    fmtTime,
    toInputValue,
    parseInputValue,
    setUrlParams,
    getQuery,
    downloadText,
    escapeHtml,
    setupTopbar,
  };
})();
