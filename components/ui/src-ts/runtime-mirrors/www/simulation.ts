// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/simulation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/simulation.js
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
 * Original-Hash: 69182f93a765f1776eff111e9feabb5fa1323df11657ab9bae6c64ecf9d3b74e
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
 * Quelle: src-ts/runtime-executables/www/simulation.ts
 * Quell-Hash: sha256:03621702da50d9d6ef0c72d57ed9572c1d8b4cecfe4bdad0d7491e92af0e96b9
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/simulation.js.
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
 * Aufgabe: Verbindet Simulations-Eingaben und Auswertung mit dem dafür vorgesehenen Backend-Bereich.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/simulation.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/simulation.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/simulation.js`.
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
 * Datei: www/simulation.js
 * Rolle im Projekt: Simulation-Frontend.
 * Zweck: Stellt Test-/Simulationswerte bereit, damit EMS-Funktionen ohne echte Anlage geprüft werden können.
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

(function () {
  /**
   * Code-Teil: Arrow-Funktion `$`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: $
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const $ = (id) => document.getElementById(id);

  const elStatus = $('nw-sim-status');
  const elStatusLine = $('nw-sim-statusline');
  const elInstance = $('nw-sim-instance');
  const btnRefresh = $('nw-sim-refresh');
  const btnEnable = $('nw-sim-enable');
  const btnDisable = $('nw-sim-disable');

  // Scenario UI (optional; only present in newer versions)
  const elScenStatus = $('nw-sim-scen-status');
  const elScenSelect = $('nw-sim-scen-select');
  const elScenDesc = $('nw-sim-scen-desc');
  const btnScenRefresh = $('nw-sim-scen-refresh');
  const btnScenStart = $('nw-sim-scen-start');
  const btnScenStop = $('nw-sim-scen-stop');
  const btnScenReset = $('nw-sim-scen-reset');

  let _instances = [];
  let _status = null;
  let _scenarios = [];
  let _scenariosById = {};

  /**
   * Code-Teil: Arrow-Funktion `sleep`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: sleep
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /**
   * Code-Teil: esc
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  /**
   * Code-Teil: setBusy
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setBusy(busy) {
    const b = !!busy;
    if (btnRefresh) btnRefresh.disabled = b;
    if (btnEnable) btnEnable.disabled = b;
    if (btnDisable) btnDisable.disabled = b;
    if (elInstance) elInstance.disabled = b;

    if (btnScenRefresh) btnScenRefresh.disabled = b;
    if (btnScenStart) btnScenStart.disabled = b;
    if (btnScenStop) btnScenStop.disabled = b;
    if (btnScenReset) btnScenReset.disabled = b;
    if (elScenSelect) elScenSelect.disabled = b;
  }
  /**
   * Code-Teil: badge
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function badge(cls, text) {
    return `<span class="nw-config-badge ${cls}">${esc(text)}</span>`;
  }
  /**
   * Code-Teil: api
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function api(path, opts) {
    const o = opts || {};
    const res = await fetch(path, {
      method: o.method || 'GET',
      headers: {
        'content-type': 'application/json',
        ...(o.headers || {}),
      },
      body: o.body ? JSON.stringify(o.body) : undefined,
      credentials: 'include',
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : {}; } catch (_e) { data = { ok: false, error: text || 'invalid json' }; }
    if (!res.ok || (data && data.ok === false)) {
      const msg = (data && data.error) ? data.error : (`HTTP ${res.status}`);
      throw new Error(msg);
    }
    return data;
  }
  /**
   * Code-Teil: renderInstances
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderInstances(defaultId) {
    if (!elInstance) return;
    const prev = elInstance.value;
    elInstance.innerHTML = '';
    for (const it of _instances) {
      const opt = document.createElement('option');
      opt.value = it.instanceId;
      const suffix = it.enabled ? '' : ' (deaktiviert)';
      opt.textContent = `${it.instanceId}${suffix}`;
      elInstance.appendChild(opt);
    }

    const candidates = [prev, defaultId, (_instances[0] && _instances[0].instanceId) || ''].filter(Boolean);
    for (const c of candidates) {
      if (_instances.some((x) => x.instanceId === c)) {
        elInstance.value = c;
        break;
      }
    }
  }
  /**
   * Code-Teil: renderStatus
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderStatus(st) {
    const active = !!st.active;
    const backupExists = !!st.backupExists;
    const inst = st.instanceId || '';

    const parts = [];
    parts.push(active ? badge('nw-config-badge--ok', 'Aktiv') : badge('nw-config-badge--idle', 'Inaktiv'));
    parts.push(backupExists ? badge('nw-config-badge--ok', 'Backup vorhanden') : badge('nw-config-badge--warn', 'Kein Backup'));
    if (inst) parts.push(badge('nw-config-badge--auto', `Instanz: ${inst}`));
    if (elStatus) elStatus.innerHTML = parts.join(' ');

    const msgLines = [];
    if (st.lastAction) msgLines.push(`<div>Letzte Aktion: <b>${esc(st.lastAction)}</b></div>`);
    if (st.lastTs) {
      try {
        const d = new Date(st.lastTs);
        msgLines.push(`<div>Zeit: ${esc(d.toLocaleString())}</div>`);
      } catch (_e) {}
    }
    if (st.lastError) msgLines.push(`<div style="margin-top:6px;">${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(st.lastError)}</div>`);
    if (elStatusLine) elStatusLine.innerHTML = msgLines.join('');
  }
  /**
   * Code-Teil: currentInstanceId
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function currentInstanceId() {
    // Prefer active instance from status; fallback to dropdown selection.
    if (_status && _status.instanceId) return String(_status.instanceId);
    if (elInstance && elInstance.value) return String(elInstance.value);
    return '';
  }
  /**
   * Code-Teil: renderScenarioCatalog
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderScenarioCatalog(catalog, preferredSelectedId) {
    if (!elScenSelect) return;

    _scenarios = Array.isArray(catalog) ? catalog : [];
    _scenariosById = {};
    for (const s of _scenarios) {
      if (s && s.id) _scenariosById[String(s.id)] = s;
    }

    const prev = elScenSelect.value;
    elScenSelect.innerHTML = '';

    for (const s of _scenarios) {
      const opt = document.createElement('option');
      opt.value = s.id;
      const kind = s.kind ? ` – ${s.kind}` : '';
      opt.textContent = `${s.title || s.id}${kind}`;
      elScenSelect.appendChild(opt);
    }

    const candidates = [preferredSelectedId, prev, (_scenarios[0] && _scenarios[0].id) || ''].filter(Boolean);
    for (const c of candidates) {
      if (_scenarios.some((x) => x && x.id === c)) {
        elScenSelect.value = c;
        break;
      }
    }

    renderScenarioDesc();
  }
  /**
   * Code-Teil: renderScenarioDesc
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderScenarioDesc() {
    if (!elScenDesc || !elScenSelect) return;
    const id = elScenSelect.value ? String(elScenSelect.value) : '';
    const s = id && _scenariosById[id] ? _scenariosById[id] : null;

    const lines = [];
    if (id) lines.push(`<div><b>${esc(id)}</b></div>`);
    if (s && s.description) lines.push(`<div style="margin-top:6px;">${esc(s.description)}</div>`);
    elScenDesc.innerHTML = lines.join('');
  }
  /**
   * Code-Teil: renderScenarioStatus
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderScenarioStatus(st) {
    if (!elScenStatus) return;

    const parts = [];
    parts.push(st && st.active ? badge('nw-config-badge--ok', 'Aktiv') : badge('nw-config-badge--idle', 'Idle'));
    parts.push(st && st.running ? badge('nw-config-badge--ok', 'Running') : badge('nw-config-badge--idle', 'Stopped'));

    if (st && st.phase) parts.push(badge('nw-config-badge--auto', `Phase: ${st.phase}`));
    if (st && st.selected) parts.push(badge('nw-config-badge--auto', `Selected: ${st.selected}`));

    const extra = [];
    if (st && st.elapsed_s && Number(st.elapsed_s) > 0) extra.push(`Elapsed: ${Math.round(Number(st.elapsed_s))}s`);
    if (st && st.remaining_s && Number(st.remaining_s) > 0) extra.push(`Remaining: ${Math.round(Number(st.remaining_s))}s`);

    const html = [
      parts.join(' '),
      (st && st.statusText) ? `<div class="nw-muted" style="margin-top:8px; line-height:1.35;">${esc(st.statusText)}</div>` : '',
      (extra.length ? `<div class="nw-muted" style="margin-top:6px;">${esc(extra.join(' • '))}</div>` : ''),
    ].join('');

    elScenStatus.innerHTML = html;
  }
  /**
   * Code-Teil: refreshDiscover
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshDiscover() {
    const data = await api('/api/sim/discover');
    _instances = Array.isArray(data.instances) ? data.instances : [];
    renderInstances(data.defaultInstanceId || '');
  }
  /**
   * Code-Teil: refreshStatus
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshStatus() {
    const st = await api('/api/sim/status');
    _status = st;
    renderStatus(st);
  }
  /**
   * Code-Teil: refreshScenarios
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshScenarios(forceCatalog = false) {
    if (!elScenStatus && !elScenSelect) return;

    const inst = currentInstanceId();
    if (!inst) {
      renderScenarioStatus({ active: false, running: false, phase: '', selected: '', statusText: 'Keine Sim-Instanz ausgewählt.' });
      return;
    }

    const data = await api(`/api/sim/scenarios?instanceId=${encodeURIComponent(inst)}`);
    const catalog = Array.isArray(data.catalog) ? data.catalog : [];
    const st = data.status || {};
    renderScenarioStatus(st);

    // Refresh catalog (select options) if forced or if empty
    if (forceCatalog || !_scenarios.length) {
      renderScenarioCatalog(catalog, st && st.selected ? String(st.selected) : '');
    } else {
      // Still update description based on selected id
      if (st && st.selected && elScenSelect) {
        const sel = String(st.selected);
        if (_scenariosById[sel]) elScenSelect.value = sel;
      }
      renderScenarioDesc();
    }
  }
  /**
   * Code-Teil: refreshAll
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshAll() {
    setBusy(true);
    try {
      await refreshDiscover();
      await refreshStatus();
      await refreshScenarios(true);
    } finally {
      setBusy(false);
    }
  }
  /**
   * Code-Teil: enable
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function enable() {
    setBusy(true);
    try {
      const instanceId = elInstance && elInstance.value ? elInstance.value : '';
      await api('/api/sim/enable', { method: 'POST', body: { instanceId } });
      await sleep(400);
      await refreshStatus();
      await refreshScenarios(true);
    } finally {
      setBusy(false);
    }
  }
  /**
   * Code-Teil: disable
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function disable() {
    setBusy(true);
    try {
      await api('/api/sim/disable', { method: 'POST', body: {} });
      await sleep(400);
      await refreshStatus();
      await refreshScenarios(true);
    } finally {
      setBusy(false);
    }
  }
  /**
   * Code-Teil: startScenario
   * Zweck: Startet Prozess, Timer, Engine oder Verbindung.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function startScenario() {
    if (!elScenSelect) return;
    const inst = currentInstanceId();
    const id = elScenSelect.value ? String(elScenSelect.value) : '';
    if (!inst || !id) return;

    await api('/api/sim/scenario/start', { method: 'POST', body: { instanceId: inst, id } });
    await sleep(250);
    await refreshScenarios(false);
  }
  /**
   * Code-Teil: stopScenario
   * Zweck: Stoppt Prozess, Timer, Engine oder Verbindung.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function stopScenario() {
    const inst = currentInstanceId();
    if (!inst) return;

    await api('/api/sim/scenario/stop', { method: 'POST', body: { instanceId: inst } });
    await sleep(250);
    await refreshScenarios(false);
  }
  /**
   * Code-Teil: resetScenario
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function resetScenario() {
    const inst = currentInstanceId();
    if (!inst) return;

    await api('/api/sim/scenario/reset', { method: 'POST', body: { instanceId: inst } });
    await sleep(250);
    await refreshScenarios(false);
  }

  if (btnRefresh) btnRefresh.addEventListener('click', () => refreshAll().catch((e) => {
    if (elStatusLine) elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnEnable) btnEnable.addEventListener('click', () => enable().catch((e) => {
    if (elStatusLine) elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnDisable) btnDisable.addEventListener('click', () => disable().catch((e) => {
    if (elStatusLine) elStatusLine.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));

  if (btnScenRefresh) btnScenRefresh.addEventListener('click', () => refreshScenarios(true).catch((e) => {
    if (elScenStatus) elScenStatus.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (elScenSelect) elScenSelect.addEventListener('change', () => renderScenarioDesc());
  if (btnScenStart) btnScenStart.addEventListener('click', () => startScenario().catch((e) => {
    if (elScenStatus) elScenStatus.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnScenStop) btnScenStop.addEventListener('click', () => stopScenario().catch((e) => {
    if (elScenStatus) elScenStatus.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));
  if (btnScenReset) btnScenReset.addEventListener('click', () => resetScenario().catch((e) => {
    if (elScenStatus) elScenStatus.innerHTML = `${badge('nw-config-badge--error', 'Fehler')}&nbsp;${esc(e && e.message ? e.message : e)}`;
  }));

  // Initial load
  refreshAll().catch((e) => {
    if (elStatus) elStatus.innerHTML = badge('nw-config-badge--error', 'Fehler');
    if (elStatusLine) elStatusLine.innerHTML = esc(e && e.message ? e.message : e);
  });

  // Keep status fresh
  setInterval(() => {
    refreshStatus().catch(() => {});
    refreshScenarios(false).catch(() => {});
  }, 5000);
})();
