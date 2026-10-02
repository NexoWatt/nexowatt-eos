// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet Ladehistorie und Ladeenergie für die EVCS-Berichtsanzeige auf.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/evcs-report.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/evcs-report.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/evcs-report.js`.
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
 * Datei: www/evcs-report.js
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
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }
  /**
   * Code-Teil: fmtDate
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtDate(iso){ return iso || ''; } const nwReportLocaleTag = () => { const lang = String((window.NexoWattI18n && window.NexoWattI18n.localeTag && window.NexoWattI18n.localeTag()) || document.documentElement.lang || navigator.language || 'de').toLowerCase(); return lang.startsWith('nl') ? 'nl-NL' : (lang.startsWith('en') ? 'en-GB' : 'de-DE'); };

  // Numeric formatting for UI + PDF (German locale, fixed decimals, tabular numbers in CSS).
  const _nfCache = new Map();
  /**
   * Code-Teil: _getNf
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _getNf(d){
    const key = nwReportLocaleTag() + ':' + String(d);
    let nf = _nfCache.get(key);
    if (!nf){
      nf = new Intl.NumberFormat(nwReportLocaleTag(), { minimumFractionDigits: d, maximumFractionDigits: d });
      _nfCache.set(key, nf);
    }
    return nf;
  }
  /**
   * Code-Teil: fmtNum
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmtNum(n, d, { emptyZero = true } = {}){
    if (n === null || n === undefined || n === '') {
      return emptyZero ? _getNf(d).format(0) : '';
    }
    const x = Number(n);
    if (!isFinite(x)) return emptyZero ? _getNf(d).format(0) : '';
    return _getNf(d).format(x);
  }
/**
 * Code-Teil: toISODate
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function toISODate(ms){
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd= String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }
  /**
   * Code-Teil: load
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function load(){
    const rangeMeta = el('rangeMeta');
    const errEl = el('err');
    const thead = el('thead');
    const tbody = el('tbody');
    const tfoot = el('tfoot');

    if (rangeMeta){
      const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
      const toMs   = Number(q('to')   || Date.now());
      rangeMeta.textContent = `${toISODate(fromMs)} – ${toISODate(toMs)}`;
    }

    if (!thead || !tbody){
      if (errEl) errEl.textContent = 'EVCS Bericht: Tabelle konnte nicht initialisiert werden (thead/tbody fehlt).';
      return false;
    }

    if (errEl) errEl.textContent = '';
    thead.innerHTML = '';
    if (tfoot) tfoot.innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Lade Daten…</td></tr>';

    try{
      const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
      const toMs   = Number(q('to')   || Date.now());

      const url = `/api/evcs/report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
      const res = await fetch(url).then(r => r.json()).catch(() => null);

      if (!res || !res.ok){
        tbody.innerHTML = '';
        if (errEl) errEl.textContent = 'Bericht konnte nicht geladen werden.';
        return false;
      }

      const wbs = Array.isArray(res.wallboxes) ? res.wallboxes : [];
      const days = Array.isArray(res.days) ? res.days : [];

      // Stable sorting: wallboxes by index, days by date (ascending)
      wbs.sort((a,b) => (Number(a?.index) || 0) - (Number(b?.index) || 0));
      days.sort((a,b) => String(a?.date || '').localeCompare(String(b?.date || '')));

      // Null handling: ensure totals are present (fallback = sum of wallboxes kWh)
      days.forEach(d => {
        const total = Number(d && d.totalKwh);
        if (!isFinite(total)){
          let s = 0;
          if (d && d.wallboxes){
            wbs.forEach(wb => {
              const idx = String(wb.index);
              const cell = (d.wallboxes[idx] || d.wallboxes[wb.index]) || {};
              const v = Number(cell && cell.kwh);
              if (isFinite(v)) s += v;
            });
          }
          d.totalKwh = s;
        }
      });

      // Period totals (sum kWh + peak max kW per wallbox)
      const periodTotals = { totalKwh: 0, wallboxes: {} };
      wbs.forEach(wb => {
        periodTotals.wallboxes[String(wb.index)] = { kwh: 0, maxKw: 0 };
      });
      days.forEach(d => {
        const dayTotal = Number(d && d.totalKwh);
        if (isFinite(dayTotal)) periodTotals.totalKwh += dayTotal;
        wbs.forEach(wb => {
          const idx = String(wb.index);
          const cell = (d && d.wallboxes && (d.wallboxes[idx] || d.wallboxes[wb.index])) || {};
          const kwh = Number(cell && cell.kwh);
          if (isFinite(kwh)) periodTotals.wallboxes[idx].kwh += kwh;
          const mx = Number(cell && cell.maxKw);
          if (isFinite(mx)) periodTotals.wallboxes[idx].maxKw = Math.max(periodTotals.wallboxes[idx].maxKw || 0, mx);
        });
      });

      // Header: Date + Total + per wallbox (kWh / max kW)
      let h = '<tr>';
      h += '<th>Datum</th>';
      h += '<th>Summe kWh</th>';
      wbs.forEach(wb => {
        const name = (wb && (wb.name || `Wallbox ${wb.index}`) || 'Wallbox').replace(/</g,'&lt;');
        h += `<th>${name}<div class="subhead">kWh</div></th>`;
        h += `<th>${name}<div class="subhead">max kW</div></th>`;
      });
      h += '</tr>';
      thead.innerHTML = h;

      // Rows (set innerHTML once to avoid any insertAdjacentHTML quirks)
      if (days.length === 0){
        if (tfoot) tfoot.innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="99" style="text-align:left;color:#9aa4ad;">Keine Daten im Zeitraum.</td></tr>';
        return true;
      }

      let rowsHtml = '';
      days.forEach(d => {
        rowsHtml += '<tr>';
        rowsHtml += `<td>${fmtDate(d && d.date)}</td>`;
        rowsHtml += `<td>${fmtNum(d && d.totalKwh, 2)}</td>`;
        wbs.forEach(wb => {
          const idx = String(wb.index);
          const cell = (d && d.wallboxes && (d.wallboxes[idx] || d.wallboxes[wb.index])) || {};
          rowsHtml += `<td>${fmtNum(cell && cell.kwh, 2)}</td>`;
          rowsHtml += `<td>${fmtNum(cell && cell.maxKw, 2)}</td>`;
        });
        rowsHtml += '</tr>';
      });
      tbody.innerHTML = rowsHtml;

      // Footer (period sum row)
      if (tfoot){
        let f = '<tr class="total-row">';
        f += '<th>Summe Zeitraum</th>';
        f += `<th>${fmtNum(periodTotals.totalKwh, 2)}</th>`;
        wbs.forEach(wb => {
          const idx = String(wb.index);
          const t = periodTotals.wallboxes[idx] || { kwh: 0, maxKw: 0 };
          f += `<td>${fmtNum(t.kwh, 2)}</td>`;
          f += `<td>${fmtNum(t.maxKw, 2)}</td>`;
        });
        f += '</tr>';
        tfoot.innerHTML = f;
      }

      return true;
    }catch(e){
      tbody.innerHTML = '';
      if (errEl) errEl.textContent = 'EVCS Bericht: Unerwarteter Fehler beim Rendern.';
      try{ console.error(e); }catch(_){}
      return false;
    }
  }
  /**
   * Code-Teil: loadAndPrint
   * Zweck: Lädt Daten aus API, States oder Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function loadAndPrint(){
    // Ensure data is fully loaded BEFORE opening the print dialog.
    const ok = await load();
    if(!ok) return;

    // Give the browser a moment to paint the updated table before snapshotting for print.
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 80));

    window.print();
  }
  /**
   * Code-Teil: downloadCsv
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function downloadCsv(){
    const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
    const toMs   = Number(q('to')   || Date.now());
    const url = `/api/evcs/report.csv?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;

    // Trigger a download without navigating away from the report page.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  /**
   * Code-Teil: downloadSessionsCsv
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function downloadSessionsCsv(){
    const fromMs = Number(q('from') || (Date.now() - 7*24*3600*1000));
    const toMs   = Number(q('to')   || Date.now());
    const url = `/api/evcs/sessions.csv?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  /**
   * Code-Teil: init
   * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function init(){
    const reloadBtn = el('reloadBtn');
    const printBtn = el('printBtn');
    // Button-IDs wurden mit dem Standard-Header vereinheitlicht.
    const csvBtn = el('exportBtn');
    const csvSessionsBtn = el('exportSessionsBtn');
    const backBtn = el('backBtn');

    if (reloadBtn) reloadBtn.addEventListener('click', load);
    if (printBtn) printBtn.addEventListener('click', loadAndPrint);
    if (csvBtn) csvBtn.addEventListener('click', downloadCsv);
    if (csvSessionsBtn) csvSessionsBtn.addEventListener('click', downloadSessionsCsv);

    // Zurück zur vorherigen Seite (typisch: Historie). Falls kein Referrer vorhanden ist,
    // geht es auf die Historie.
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

    load();


// ------------------------------
// Topbar / Navigation (same behavior as other pages)
// ------------------------------

(function setupTopbar(){
  // Menu toggle
  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  if (menuBtn && menuDropdown && !menuBtn.dataset.nwMenuBound){
    // 0.8.21: EVCS-Report nutzt denselben Guard wie die Kundenseiten. Ein Klick
    // auf den Burger öffnet genau einmal; Shell-/Fallback-Handler bleiben aus.
    menuBtn.dataset.nwMenuBound = 'evcs-report';
    menuBtn.dataset.nwAppMenu = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menuBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      menuDropdown.classList.toggle('hidden');
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('click', (e) => {
      const target = e && e.target;
      if (!menuBtn.contains(target) && !menuDropdown.contains(target)) menuDropdown.classList.add('hidden');
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menuDropdown. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    menuDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  // Live indicator
  const liveDot = document.getElementById('liveDot');
  try {
    const es = new EventSource('/events');
    // In styles.css heißt der "grün"-Status bewusst .live (wie auf allen anderen Seiten).
    es.onopen = () => { if(liveDot) liveDot.classList.add('live'); };
    es.onerror = () => { if(liveDot) liveDot.classList.remove('live'); };
  } catch(_e) {
    // ignore
  }

  // Tabs visibility (EVCS / SmartHome / Speicherfarm)
  (async ()=>{
    try {
      const res = await fetch('/config');
      const cfg = await res.json();
      const settingsConfig = (cfg && cfg.settingsConfig) || {};
      const smartHomeEnabled = !!(cfg && cfg.featureVisibility && cfg.featureVisibility.hasSmartHome === true);
      const storageFarmEnabled = !!(cfg && cfg.featureVisibility && cfg.featureVisibility.hasStorageFarm === true);
      const evcsAvailable = ((Number(settingsConfig.evcsConfiguredCount || 0) || (Array.isArray(settingsConfig.evcsList) ? settingsConfig.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
      const evcsCount = evcsAvailable ? Math.max(0, Math.round(Number(settingsConfig.evcsCount) || 0)) : 0;

      const tabEvcs = document.getElementById('tabEvcs');
      const menuEvcs = document.getElementById('menuEvcsLink');
      const showEvcs = evcsAvailable && evcsCount >= 2;
      if(tabEvcs) tabEvcs.classList.toggle('hidden', !showEvcs);
      if(menuEvcs) menuEvcs.classList.toggle('hidden', !showEvcs);

      const tabSmartHome = document.getElementById('tabSmartHome');
      const menuSmartHome = document.getElementById('menuSmartHomeLink');
      if(tabSmartHome) tabSmartHome.classList.toggle('hidden', !smartHomeEnabled);
      if(menuSmartHome) menuSmartHome.classList.toggle('hidden', !smartHomeEnabled);

      const tabStorageFarm = document.getElementById('tabStorageFarm');
      const menuStorageFarm = document.getElementById('menuStorageFarmLink');
      if(tabStorageFarm) tabStorageFarm.classList.toggle('hidden', !storageFarmEnabled);
      if(menuStorageFarm) menuStorageFarm.classList.toggle('hidden', !storageFarmEnabled);
    } catch(_e) {
      // ignore
    }
  })();
})();
  }

  if (document.readyState === 'loading'){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
