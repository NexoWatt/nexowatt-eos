// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Zeigt aggregierte Speicherfarm-Werte und die zugeordneten Einzelspeicher im Browser an.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/storagefarm.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/storagefarm.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/storagefarm.js`.
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
 * Datei: www/storagefarm.js
 * Rolle im Projekt: Speicherfarm-Kundenseite.
 * Zweck: Zeigt reine read-only Status-Tabelle der Speicherfarm ohne Installer-Konfiguration.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Kundenansicht der Speicherfarm: zeigt nur Status-/Tabellenwerte, keine Installer-Konfiguration.
 * Zusammenhänge:
 * - Liest storageFarm.* States über /api/state und Config über /config.
 * - Die eigentliche Speicherfarm-Konfiguration liegt im App-Center.
 * Wartungshinweise:
 * - Diese Seite muss ausgeblendet oder leer bleiben, wenn keine Speicherfarm konfiguriert ist.
 */

(function () {
  'use strict';

  var state = {};
  var pollTimer = null;
  /**
   * Code-Teil: el
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function el(id) { return document.getElementById(id); }
  /**
   * Code-Teil: stateVal
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function stateVal(key) {
    var it = state && state[key];
    return it && Object.prototype.hasOwnProperty.call(it, 'value') ? it.value : undefined;
  }
  /**
   * Code-Teil: num
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function num(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  /**
   * Code-Teil: formatPower
   * Zweck: Formatiert Daten für Anzeige oder Logs.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function formatPower(v) {
    var n = num(v);
    if (n === null) return '--';
    var sign = n < 0 ? '-' : '';
    var a = Math.abs(n);
    if (a >= 1000000) return sign + (a / 1000000).toFixed(2) + ' MW';
    if (a >= 1000) return sign + (a / 1000).toFixed(1) + ' kW';
    return sign + Math.round(a) + ' W';
  }
  /**
   * Code-Teil: parseJsonSafe
   * Zweck: Parst Rohdaten in ein sicheres internes Format.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function parseJsonSafe(raw, fallback) {
    try {
      if (raw === null || raw === undefined || raw === '') return fallback;
      if (Array.isArray(raw)) return raw;
      return JSON.parse(String(raw));
    } catch (_e) {
      return fallback;
    }
  }
  /**
   * Code-Teil: statusList
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function statusList() {
    var list = parseJsonSafe(stateVal('storageFarm.storagesStatusJson'), []);
    return Array.isArray(list) ? list : [];
  }
  /**
   * Code-Teil: setLive
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setLive(ok) {
    var dot = el('liveDot');
    if (dot) dot.classList.toggle('live', !!ok);
  }
  /**
   * Code-Teil: setMsg
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setMsg(text) {
    var m = el('sf_msg');
    if (m) m.textContent = text || '';
  }
  /**
   * Code-Teil: statusText
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function statusText(row) {
    if (row && row.licenseBlocked === true) return 'Gesperrt: Lizenzgrenze';
    var online = !!(row && (row.online === true || row.displayOnline === true || row.dispatchAvailable === true));
    var degraded = !!(row && (row.degraded === true || row.state === 'degraded'));
    var reasons = []
      .concat(row && Array.isArray(row.dispatchBlockedReasons) ? row.dispatchBlockedReasons : [])
      .concat(row && Array.isArray(row.chargeBlockedReasons) ? row.chargeBlockedReasons : [])
      .concat(row && Array.isArray(row.dischargeBlockedReasons) ? row.dischargeBlockedReasons : []);
    var hardLock = reasons.some(function (x) {
      return ['available_false', 'fault_active', 'device_offline', 'charge_not_allowed', 'discharge_not_allowed'].indexOf(String(x || '')) >= 0;
    });
    var chg = num(row && row.chargePowerW) || 0;
    var dchg = num(row && row.dischargePowerW) || 0;
    var idle = Math.abs(chg) + Math.abs(dchg) < 20;

    if (online && row && row.dispatchAvailable === true) return degraded ? 'Degraded / Bereit' : (idle ? 'Online / Standby' : 'Online / Bereit');
    if (online && hardLock) return 'Gesperrt';
    if (online) return degraded ? 'Degraded / prüfen' : 'Online / prüfen';
    if (row && row.dispatchAvailable) return 'Regelbar';
    return 'Offline';
  }
  /**
   * Code-Teil: cell
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function cell(rowEl, text, label) {
    var d = document.createElement('div');
    d.setAttribute('role', 'cell');
    d.setAttribute('data-label', label);
    d.textContent = (text === undefined || text === null || text === '') ? '--' : String(text);
    rowEl.appendChild(d);
  }
  /**
   * Code-Teil: renderRows
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderRows(list) {
    var wrap = el('sf_status_rows');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'nw-storagefarm-row nw-storagefarm-row--empty';
      empty.textContent = 'Keine Speicher konfiguriert oder noch keine Statusdaten vorhanden.';
      wrap.appendChild(empty);
      setMsg('');
      return;
    }
    setMsg(list.length + ' Speicher in der Übersicht.');
    list.forEach(function (row) {
      var r = document.createElement('div');
      r.className = 'nw-storagefarm-row';
      r.setAttribute('role', 'row');
      var socN = num(row && row.soc);
      cell(r, (row && row.name) ? row.name : 'Speicher', 'Speicher');
      cell(r, socN === null ? '--' : socN.toFixed(1), 'SoC (%)');
      cell(r, formatPower(row && row.chargePowerW), 'Laden');
      cell(r, formatPower(row && row.dischargePowerW), 'Entladen');
      cell(r, statusText(row), 'Status');
      wrap.appendChild(r);
    });
  }
  /**
   * Code-Teil: renderSummary
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderSummary() {
    var modeLabel = el('sf_mode_label');
    var mode = String(stateVal('storageFarm.mode') || 'pool').toLowerCase();
    if (modeLabel) modeLabel.textContent = 'Modus: ' + (mode === 'groups' ? 'Gruppen' : 'Pool');

    var soc = stateVal('storageFarm.totalSoc');
    var net = stateVal('storageFarm.totalPowerW');
    var chg = stateVal('storageFarm.totalChargePowerW');
    var dchg = stateVal('storageFarm.totalDischargePowerW');
    var pv = stateVal('storageFarm.totalPvPowerW');
    var on = stateVal('storageFarm.storagesOnline');
    var disp = stateVal('storageFarm.storagesDispatchAvailable');
    var deg = stateVal('storageFarm.storagesDegraded');
    var tot = stateVal('storageFarm.storagesTotal');
    var socText = num(soc) === null ? '--' : num(soc).toFixed(1);
    var netN = num(net);
    if (netN === null) {
      var chgN = num(chg);
      var dchgN = num(dchg);
      if (chgN !== null || dchgN !== null) netN = Math.max(0, dchgN || 0) - Math.max(0, chgN || 0);
    }
    var netText = netN === null ? '--' : (netN > 0 ? 'Entladen ' : (netN < 0 ? 'Laden ' : 'Neutral ')) + formatPower(Math.abs(netN));
    var text = 'SoC Ø: ' + socText + ' % | Farm netto: ' + netText + ' | PV/WR: ' + formatPower(pv) + ' | Brutto Laden: ' + formatPower(chg) + ' | Brutto Entladen: ' + formatPower(dchg) + ' | Online: ' + (on !== undefined ? on : '--') + '/' + (tot !== undefined ? tot : '--') + ' | Regelbar: ' + (disp !== undefined ? disp : '--') + '/' + (tot !== undefined ? tot : '--');
    if (deg !== undefined && Number(deg) > 0) text += ' | Degraded: ' + deg;
    var summary = el('sf_summary');
    if (summary) summary.textContent = text;
  }
  /**
   * Code-Teil: render
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function render() {
    renderSummary();
    renderRows(statusList());
  }
  /**
   * Code-Teil: loadConfig
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function loadConfig() {
    try {
      var cfg = await fetch('/config', { cache: 'no-store' }).then(function (r) { return r.json(); });
      var ems = (cfg && cfg.ems) || {};
      var settingsConfig = (cfg && cfg.settingsConfig) || {};
      var evcsCount = Math.max(0, Math.round(Number(settingsConfig.evcsCount) || 0));
      var smartHomeEnabled = !!(cfg && cfg.featureVisibility && cfg.featureVisibility.hasSmartHome === true);
      var storageFarmEnabled = !!(cfg && cfg.featureVisibility && cfg.featureVisibility.hasStorageFarm === true);
      var evcsAvailable = ((Number(settingsConfig.evcsConfiguredCount || 0) || (Array.isArray(settingsConfig.evcsList) ? settingsConfig.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
      var evcsTab = el('tabEvcs');
      var evcsMenu = el('menuEvcsLink');
      var shTab = el('tabSmartHome');
      var shMenu = el('menuSmartHomeLink');
      var sfTab = el('tabStorageFarm');
      var sfMenu = el('menuStorageFarmLink');
      if (evcsTab) evcsTab.classList.toggle('hidden', !(evcsAvailable && evcsCount >= 2));
      if (evcsMenu) evcsMenu.classList.toggle('hidden', !(evcsAvailable && evcsCount >= 2));
      if (shTab) shTab.classList.toggle('hidden', !smartHomeEnabled);
      if (shMenu) shMenu.classList.toggle('hidden', !smartHomeEnabled);
      if (sfTab) sfTab.classList.toggle('hidden', !storageFarmEnabled);
      if (sfMenu) sfMenu.classList.toggle('hidden', !storageFarmEnabled);
      if (!storageFarmEnabled) {
        setMsg('Speicherfarm ist in dieser Kundenanlage nicht aktiviert.');
        try { window.location.replace('./'); } catch (_e2) {}
      }
    } catch (_e) {}
  }
  /**
   * Code-Teil: loadState
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function loadState() {
    try {
      var snap = await fetch('/api/state', { cache: 'no-store' }).then(function (r) { return r.json(); });
      state = snap || {};
      window.latestState = state;
      render();
      setLive(true);
    } catch (_e) {
      setLive(false);
      setMsg('Statusdaten konnten nicht geladen werden.');
    }
  }
  /**
   * Code-Teil: startEvents
   * Zweck: Startet Prozess, Timer, Engine oder Verbindung.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function startEvents() {
    try {
      var es = new EventSource('/events');
      es.onopen = function () { setLive(true); };
      es.onerror = function () {
        setLive(false);
        try { es.close(); } catch (_e) {}
        if (!pollTimer) pollTimer = window.setInterval(loadState, 5000);
        window.setTimeout(startEvents, 5000);
      };
      es.onmessage = function (ev) {
        try {
          var msg = JSON.parse(ev.data || '{}');
          if (msg.type === 'init' && msg.payload) state = msg.payload || {};
          else if (msg.type === 'update' && msg.payload) Object.assign(state, msg.payload);
          window.latestState = state;
          render();
        } catch (_e) {}
      };
    } catch (_e) {
      if (!pollTimer) pollTimer = window.setInterval(loadState, 5000);
    }
  }
  /**
   * Code-Teil: bind
   * Zweck: Verbindet Event-Handler mit DOM oder Runtime-Objekten.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function bind() {
    var reload = el('sf_reload');
    if (reload) reload.addEventListener('click', function (e) { e.preventDefault(); loadState(); });
  }
  /**
   * Code-Teil: ready
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  /**
   * Code-Teil: Methode `ready`
   * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: ready
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  ready(function () {
    bind();
    loadConfig();
    loadState();
    startEvents();
  });
})();
