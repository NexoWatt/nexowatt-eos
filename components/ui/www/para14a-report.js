/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/para14a-report.ts
 * Quell-Hash: sha256:2fabec44c8571e26c28d0998f45e22a3b58ed6b503658595b7a6dfc7b521de25
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/para14a-report.js.
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
 * Aufgabe: Bereitet §14a-Zustände und Ereignisse für die Berichtsanzeige auf.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/para14a-report.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/para14a-report.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/para14a-report.js`.
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
 * Datei: www/para14a-report.js
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
  const C = window.NWReportCommon;
  if (!C) return;

  const state = { data: null };
  /**
   * Code-Teil: defaultFromMs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function defaultFromMs(){
    const q = C.getQuery('from');
    if (q) return C.parseInputValue(q, Date.now() - 30 * 24 * 3600 * 1000);
    return Date.now() - 30 * 24 * 3600 * 1000;
  }
  /**
   * Code-Teil: defaultToMs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function defaultToMs(){
    const q = C.getQuery('to');
    if (q) return C.parseInputValue(q, Date.now());
    return Date.now();
  }
  /**
   * Code-Teil: fillInputs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fillInputs(){
    const fromInput = C.el('fromInput');
    const toInput = C.el('toInput');
    if (fromInput) fromInput.value = C.toInputValue(defaultFromMs());
    if (toInput) toInput.value = C.toInputValue(defaultToMs());
  }
  /**
   * Code-Teil: getRange
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getRange(){
    const fromInput = C.el('fromInput');
    const toInput = C.el('toInput');
    const fromMs = C.parseInputValue(fromInput && fromInput.value, defaultFromMs());
    const toMs = C.parseInputValue(toInput && toInput.value, defaultToMs());
    return {
      fromMs,
      toMs: Math.max(fromMs + 60000, toMs),
    };
  }
  /**
   * Code-Teil: renderFlags
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderFlags(meta){
    const wrap = C.el('reportFlags');
    if (!wrap) return;
    wrap.innerHTML = '';
    const items = [];
    items.push('Ereignisnachweis mit exakten Zeitstempeln');
    if (meta && meta.historyInstance) items.push('Historie ' + meta.historyInstance);
    if (meta && meta.retentionTargetDays) items.push('Retention-Ziel ' + C.fmtNum(meta.retentionTargetDays, 0) + ' Tage');
    if (meta && meta.historyReady) items.push('Historie aktiv');
    items.forEach((txt) => {
      const el = document.createElement('span');
      el.className = 'report-pill';
      el.textContent = txt;
      wrap.appendChild(el);
    });
  }
  /**
   * Code-Teil: renderSummary
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderSummary(summary, meta){
    const grid = C.el('summaryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const items = [
      ['Ereignisse', C.fmtNum(summary && summary.totalEvents, 0)],
      ['Aktivierungen', C.fmtNum(summary && summary.activations, 0)],
      ['Updates', C.fmtNum(summary && summary.updates, 0)],
      ['Freigaben', C.fmtNum(summary && summary.releases, 0)],
      ['Schreibfehler', C.fmtNum(summary && summary.writeFailedEvents, 0)],
      ['Erster Eintrag', summary && summary.firstTs ? C.fmtDateTime(summary.firstTs) : '—'],
      ['Letzter Eintrag', summary && summary.lastTs ? C.fmtDateTime(summary.lastTs) : '—'],
      ['Historie', meta && meta.historyInstance ? meta.historyInstance : '—'],
    ];
    items.forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'report-card';
      card.innerHTML = `<small>${C.escapeHtml(label)}</small><b>${C.escapeHtml(value)}</b>`;
      grid.appendChild(card);
    });
  }
  /**
   * Code-Teil: renderMeta
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderMeta(meta){
    const rangeMeta = C.el('rangeMeta');
    const note = C.el('reportNote');
    if (rangeMeta && meta) {
      const parts = [
        `${C.fmtDateTime(meta.start)} – ${C.fmtDateTime(meta.end)}`,
        '§14a Ereignisnachweis',
      ];
      if (meta.historyInstance) parts.push(`Historie ${meta.historyInstance}`);
      rangeMeta.textContent = parts.join(' · ');
    }
    if (note) {
      note.textContent = 'Der Ausdruck basiert auf den historisierten §14a-Ereignissnapshots. Für jeden Schaltvorgang werden Datum, Uhrzeit, Quelle, Modus, Budget, EVCS-Limit, EV-/Netzleistung und Ergebnis ausgegeben. Die 730-Tage-Aufbewahrung muss in der gemeinsamen Historie/Influx sichergestellt sein.';
    }
    renderFlags(meta || {});
  }
  /**
   * Code-Teil: renderTable
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderTable(events){
    const tbody = C.el('tbody');
    const empty = C.el('emptyState');
    if (!tbody) return;
    tbody.innerHTML = '';
    const rows = Array.isArray(events) ? events : [];
    if (empty) empty.classList.toggle('hidden', rows.length > 0);
    if (!rows.length) return;

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td class="report-mono">${C.escapeHtml(C.fmtDateTime(row.ts))}</td>`,
        `<td>${C.escapeHtml(row.eventType || '—')}</td>`,
        `<td>${C.escapeHtml(row.result || '—')}</td>`,
        `<td>${C.escapeHtml(row.source || '—')}</td>`,
        `<td>${C.escapeHtml(row.mode || '—')}</td>`,
        `<td class="report-mono">${C.escapeHtml(row.sessionId || '—')}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.requestedTotalBudgetW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.effectiveEvcsCapW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.pMinW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.evPowerW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPower(row.gridPowerW))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtNum(row.consumerAppliedCount, 0))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtNum(row.consumerFailedCount, 0))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtNum(row.consumerSkippedCount, 0))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtNum(row.consumerWriteFailedCount, 0))}</td>`,
        `<td class="wrap">${C.escapeHtml(row.reason || '—')}</td>`
      ].join('');
      tbody.appendChild(tr);
    });
  }
  /**
   * Code-Teil: load
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function load(){
    const { fromMs, toMs } = getRange();
    C.setUrlParams({ from: fromMs, to: toMs });
    const tbody = C.el('tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="16" class="report-empty">Lade §14a Nachweisdaten…</td></tr>';

    const url = `/api/para14a/report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
    const res = await fetch(url).then((r) => r.json()).catch(() => null);
    if (!res || !res.ok) {
      state.data = null;
      renderMeta(null);
      renderSummary(null, null);
      if (tbody) tbody.innerHTML = '';
      const empty = C.el('emptyState');
      if (empty) {
        empty.textContent = '§14a Nachweis konnte nicht geladen werden.';
        empty.classList.remove('hidden');
      }
      return false;
    }

    state.data = res;
    renderMeta(res.meta || {});
    renderSummary(res.summary || {}, res.meta || {});
    renderTable(res.events || []);
    return true;
  }
  /**
   * Code-Teil: loadAndPrint
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function loadAndPrint(){
    const ok = await load();
    if (!ok) return;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 80));
    window.print();
  }
  /**
   * Code-Teil: exportCsv
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function exportCsv(){
    const rows = Array.isArray(state.data && state.data.events) ? state.data.events : [];
    if (!rows.length) return;
    const lines = [
      ['Zeitstempel', 'Ereignis', 'Ergebnis', 'Quelle', 'Modus', 'Sitzung', 'Budget_W', 'EVCS_Limit_W', 'Pmin14a_W', 'EV_Leistung_W', 'Netzleistung_W', 'Applied', 'Failed', 'Skipped', 'WriteFailed', 'Grund'].join(';')
    ];
    rows.forEach((row) => {
      lines.push([
        C.fmtDateTime(row.ts),
        row.eventType || '',
        row.result || '',
        row.source || '',
        row.mode || '',
        row.sessionId || '',
        Number(row.requestedTotalBudgetW || 0).toFixed(0),
        Number(row.effectiveEvcsCapW || 0).toFixed(0),
        Number(row.pMinW || 0).toFixed(0),
        Number(row.evPowerW || 0).toFixed(0),
        Number(row.gridPowerW || 0).toFixed(0),
        Number(row.consumerAppliedCount || 0).toFixed(0),
        Number(row.consumerFailedCount || 0).toFixed(0),
        Number(row.consumerSkippedCount || 0).toFixed(0),
        Number(row.consumerWriteFailedCount || 0).toFixed(0),
        String(row.reason || '').replace(/;/g, ','),
      ].join(';'));
    });
    const start = state.data && state.data.meta ? new Date(state.data.meta.start) : new Date();
    const file = `nexowatt-para14a-nachweis-${start.getFullYear()}${String(start.getMonth()+1).padStart(2,'0')}${String(start.getDate()).padStart(2,'0')}.csv`;
    C.downloadText(file, lines.join('\n'), 'text/csv;charset=utf-8');
  }
  /**
   * Code-Teil: init
   * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function init(){
    fillInputs();
    C.setupTopbar('history');

    const reloadBtn = C.el('reloadBtn');
    const printBtn = C.el('printBtn');
    const exportBtn = C.el('exportBtn');
    const backBtn = C.el('backBtn');
    const fromInput = C.el('fromInput');
    const toInput = C.el('toInput');

    if (reloadBtn) reloadBtn.addEventListener('click', load);
    if (printBtn) printBtn.addEventListener('click', loadAndPrint);
    if (exportBtn) exportBtn.addEventListener('click', exportCsv);
    if (fromInput) fromInput.addEventListener('change', load);
    if (toInput) toInput.addEventListener('change', load);
    if (backBtn) backBtn.addEventListener('click', () => {
      try {
        const ref = document.referrer || '';
        if (ref && ref.indexOf(window.location.origin) === 0 && window.history.length > 1) {
          window.history.back();
          return;
        }
      } catch (_e) {}
      window.location.href = '/settings';
    });

    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
