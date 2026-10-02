// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet RFID-bezogene Ladevorgänge und Zuordnungen für die Berichtsanzeige auf.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/rfid-report.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/rfid-report.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/rfid-report.js`.
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
 * Datei: www/rfid-report.js
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

/* NexoWatt – RFID/Ladekarten Abrechnung (Print/PDF view) */
(function () {
  'use strict';

  const qs = new URLSearchParams(window.location.search || '');
  const rfid = String(qs.get('rfid') || '').trim();
  const from = String(qs.get('from') || '').trim();
  const to = String(qs.get('to') || '').trim();

  const elMeta = document.getElementById('metaText');
  const elMetaPrint = document.getElementById('metaTextPrint');
  const tbody = document.querySelector('#reportTable tbody');

  const elSumSessions = document.getElementById('sumSessions');
  const elSumKwh = document.getElementById('sumKwh');
  const elSumPeakKw = document.getElementById('sumPeakKw');

  const btnReload = document.getElementById('reloadBtn');
  const btnCsv = document.getElementById('csvBtn');
  const btnCsvSessions = document.getElementById('csvSessionsBtn');
  const btnPrint = document.getElementById('printBtn');

  const nwReportLocaleTag = () => { const lang = String((window.NexoWattI18n && window.NexoWattI18n.localeTag && window.NexoWattI18n.localeTag()) || document.documentElement.lang || navigator.language || 'de').toLowerCase(); return lang.startsWith('nl') ? 'nl-NL' : (lang.startsWith('en') ? 'en-GB' : 'de-DE'); }; const nfKwh = { format: (value) => new Intl.NumberFormat(nwReportLocaleTag(), { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value) };
  const nfKw = { format: (value) => new Intl.NumberFormat(nwReportLocaleTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) };
  const nfInt = { format: (value) => new Intl.NumberFormat(nwReportLocaleTag(), { maximumFractionDigits: 0 }).format(value) };
  /**
   * Code-Teil: fmtDateRange
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtDateRange(fromMs, toMs) {
    const f = Number(fromMs);
    const t = Number(toMs);
    const df = Number.isFinite(f) ? new Date(f) : null;
    const dt = Number.isFinite(t) ? new Date(t) : null;
    const sF = df ? df.toLocaleDateString(nwReportLocaleTag()) : '--';
    const sT = dt ? dt.toLocaleDateString(nwReportLocaleTag()) : '--';
    return sF + ' – ' + sT;
  }
  /**
   * Code-Teil: setMeta
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setMeta(text) {
    if (elMeta) elMeta.textContent = text || '';
    if (elMetaPrint) elMetaPrint.textContent = text || '';
  }
  /**
   * Code-Teil: setError
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setError(msg) {
    setMeta(msg || 'Fehler');
    if (tbody) {
      tbody.innerHTML = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = msg || 'Fehler';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }
  /**
   * Code-Teil: render
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function render(report) {
    if (!report || !tbody) return;

    const name = String(report.name || '').trim();
    const r = String(report.rfid || rfid || '').trim();
    const rangeText = fmtDateRange(report.start, report.end);

    const cardText = (r && r !== 'ALL')
      ? ('Karte: ' + (name ? (name + ' (' + r + ')') : r))
      : 'Alle Karten';

    setMeta(cardText + ' | Zeitraum: ' + rangeText);

    tbody.innerHTML = '';

    const days = Array.isArray(report.days) ? report.days : [];
    for (const d of days) {
      const tr = document.createElement('tr');

      const tdDate = document.createElement('td');
      tdDate.textContent = String(d.date || '');
      tr.appendChild(tdDate);

      const tdSess = document.createElement('td');
      tdSess.style.textAlign = 'right';
      tdSess.textContent = nfInt.format(Number(d.sessions) || 0);
      tr.appendChild(tdSess);

      const tdKwh = document.createElement('td');
      tdKwh.style.textAlign = 'right';
      tdKwh.textContent = nfKwh.format(Number(d.kwh) || 0);
      tr.appendChild(tdKwh);

      const tdMax = document.createElement('td');
      tdMax.style.textAlign = 'right';
      tdMax.textContent = nfKw.format(Number(d.maxKw) || 0);
      tr.appendChild(tdMax);

      tbody.appendChild(tr);
    }

    if (elSumSessions) elSumSessions.textContent = nfInt.format(Number(report.totalSessions) || 0);
    if (elSumKwh) elSumKwh.textContent = nfKwh.format(Number(report.totalKwh) || 0);
    if (elSumPeakKw) elSumPeakKw.textContent = nfKw.format(Number(report.peakKw) || 0);
  }
  /**
   * Code-Teil: load
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function load() {
    if (!rfid) {
      setError('RFID fehlt. Bitte Bericht über die Einstellungen öffnen.');
      return;
    }

    const url = '/api/evcs/rfid/report?rfid=' + encodeURIComponent(rfid)
      + (from ? ('&from=' + encodeURIComponent(from)) : '')
      + (to ? ('&to=' + encodeURIComponent(to)) : '');

    try {
      setMeta('Lade Daten…');
      const r = await fetch(url, { cache: 'no-store' });
      const j = await r.json();
      if (!j || j.ok !== true) {
        setError('Fehler beim Laden des Reports.');
        return;
      }
      render(j);
    } catch (e) {
      setError('Fehler beim Laden des Reports.');
    }
  }
  /**
   * Code-Teil: openCsv
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function openCsv() {
    if (!rfid) return;
    const url = '/api/evcs/rfid/report.csv?rfid=' + encodeURIComponent(rfid)
      + (from ? ('&from=' + encodeURIComponent(from)) : '')
      + (to ? ('&to=' + encodeURIComponent(to)) : '');
    window.open(url, '_blank');
  }
  /**
   * Code-Teil: openCsvSessions
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function openCsvSessions() {
    if (!rfid) return;
    const url = '/api/evcs/sessions.csv?rfid=' + encodeURIComponent(rfid)
      + (from ? ('&from=' + encodeURIComponent(from)) : '')
      + (to ? ('&to=' + encodeURIComponent(to)) : '');
    window.open(url, '_blank');
  }

  if (btnReload) btnReload.addEventListener('click', load);
  if (btnCsv) btnCsv.addEventListener('click', openCsv);
  if (btnCsvSessions) btnCsvSessions.addEventListener('click', openCsvSessions);
  if (btnPrint) btnPrint.addEventListener('click', () => window.print());

  // Auto-load
  load();
})();
