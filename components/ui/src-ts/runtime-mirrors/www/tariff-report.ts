// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/tariff-report.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/tariff-report.js
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
 * Original-Hash: cbbad787a527367247d1f18ff739322ccc359434eff03530cd924ee3028019ec
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
 * Quelle: src-ts/runtime-executables/www/tariff-report.ts
 * Quell-Hash: sha256:57b429c550055a8883633759b979e7b60df768ceb094daf1851b1399c2eea8e6
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/tariff-report.js.
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
 * Aufgabe: Bereitet Tarifverläufe und tarifbezogene Auswertungen für die Berichtsseite auf.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/tariff-report.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/tariff-report.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/tariff-report.js`.
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
 * Datei: www/tariff-report.js
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
  const INTERVAL_MINUTES = 15;
  /**
   * Code-Teil: defaultFromMs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function defaultFromMs(){
    const q = C.getQuery('from');
    if (q) return C.parseInputValue(q, Date.now() - 24 * 3600 * 1000);
    return Date.now() - 24 * 3600 * 1000;
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
    if (meta && meta.dynamicTariff) items.push('dynamischer Tarif aktiv');
    if (meta && meta.netFeeEnabled) items.push('variables Netzentgelt aktiv');
    if (meta && meta.historyInstance) items.push('Historie ' + meta.historyInstance);
    items.push(INTERVAL_MINUTES + '-Minuten-Raster');
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
      ['Preis min', C.fmtPrice(summary && summary.minPrice)],
      ['Preis max', C.fmtPrice(summary && summary.maxPrice)],
      ['Ø Preis', C.fmtPrice(summary && summary.avgPrice)],
      ['Bezug', C.fmtKwh(summary && summary.importKwh)],
      ['Basis-Kosten', C.fmtMoney(summary && summary.baseCost)],
      ['Netzentgelt', C.fmtMoney(summary && summary.netFeeCost)],
      ['Gesamtkosten', C.fmtMoney(summary && summary.totalCost)],
      ['Intervalle', C.fmtNum(summary && summary.intervals, 0)],
    ];
    if (meta && meta.retentionTargetDays) {
      items.push(['Retention-Ziel', C.fmtNum(meta.retentionTargetDays, 0) + ' Tage']);
    }
    items.forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'report-card';
      card.innerHTML = `<small>${C.escapeHtml(label)}</small><b>${C.escapeHtml(value)}</b>`;
      grid.appendChild(card);
    });
  }
  /**
   * Code-Teil: renderTable
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderTable(intervals){
    const tbody = C.el('tbody');
    const empty = C.el('emptyState');
    if (!tbody) return;
    tbody.innerHTML = '';
    const rows = Array.isArray(intervals) ? intervals : [];
    if (empty) empty.classList.toggle('hidden', rows.length > 0);
    if (!rows.length) return;

    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td class="report-mono">${C.escapeHtml(C.fmtDateTime(row.startTs))}</td>`,
        `<td class="report-mono">${C.escapeHtml(C.fmtDateTime(row.endTs))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPrice(row.baseEurPerKwh))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPrice(row.netFeeEurPerKwh))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtPrice(row.totalEurPerKwh))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtKwh(row.importKwh))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtMoney(row.baseCostEur))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtMoney(row.netFeeCostEur))}</td>`,
        `<td class="num">${C.escapeHtml(C.fmtMoney(row.totalCostEur))}</td>`
      ].join('');
      tbody.appendChild(tr);
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
        `${INTERVAL_MINUTES}-Minuten-Intervalle`,
      ];
      if (meta.historyInstance) parts.push(`Historie ${meta.historyInstance}`);
      rangeMeta.textContent = parts.join(' · ');
    }
    if (note) {
      note.textContent = 'Der Bericht nutzt 15-Minuten-Intervalle mit Datum/Uhrzeit. Kosten = Gesamtpreis × Netzbezug je Intervall und dienen als Nachweis zur Gegenprüfung der Stromanbieter-Abrechnung.';
    }
    renderFlags(meta);
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
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="report-empty">Lade Nachweisdaten…</td></tr>';

    const url = `/api/tariff/report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
    const res = await fetch(url).then((r) => r.json()).catch(() => null);
    if (!res || !res.ok) {
      state.data = null;
      renderMeta(null);
      renderSummary(null, null);
      if (tbody) tbody.innerHTML = '';
      const empty = C.el('emptyState');
      if (empty) {
        empty.textContent = 'Tarif-/Netzentgelt-Nachweis konnte nicht geladen werden.';
        empty.classList.remove('hidden');
      }
      return false;
    }

    state.data = res;
    renderMeta(res.meta || {});
    renderSummary(res.summary || {}, res.meta || {});
    renderTable(res.intervals || []);
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
    const rows = Array.isArray(state.data && state.data.intervals) ? state.data.intervals : [];
    if (!rows.length) return;
    const lines = [
      ['Start', 'Ende', 'Basispreis_EUR_pro_kWh', 'Netzentgelt_EUR_pro_kWh', 'Gesamtpreis_EUR_pro_kWh', 'Bezug_kWh', 'Basis_Kosten_EUR', 'Netzentgelt_Kosten_EUR', 'Gesamtkosten_EUR'].join(';')
    ];
    rows.forEach((row) => {
      lines.push([
        C.fmtDateTime(row.startTs),
        C.fmtDateTime(row.endTs),
        Number(row.baseEurPerKwh || 0).toFixed(4).replace('.', ','),
        Number(row.netFeeEurPerKwh || 0).toFixed(4).replace('.', ','),
        Number(row.totalEurPerKwh || 0).toFixed(4).replace('.', ','),
        Number(row.importKwh || 0).toFixed(4).replace('.', ','),
        Number(row.baseCostEur || 0).toFixed(4).replace('.', ','),
        Number(row.netFeeCostEur || 0).toFixed(4).replace('.', ','),
        Number(row.totalCostEur || 0).toFixed(4).replace('.', ','),
      ].join(';'));
    });
    const start = state.data && state.data.meta ? new Date(state.data.meta.start) : new Date();
    const file = `nexowatt-tarif-nachweis-${start.getFullYear()}${String(start.getMonth()+1).padStart(2,'0')}${String(start.getDate()).padStart(2,'0')}.csv`;
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
      window.location.href = '/history';
    });

    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
