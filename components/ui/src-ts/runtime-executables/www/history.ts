// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Lädt historische Anlagenwerte und steuert Diagramme, Zeitraumwahl, Zoom sowie die zugehörigen Berichte.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/history.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/history.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/history.js`.
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
 * Datenvertrag: HistorySeries
 * Zweck: Beschreibt Zeitreihen, die für Diagramme und Reports verwendet werden.
 * Zusammenhang: History muss dieselbe Semantik wie LIVE-Dashboard verwenden, damit keine falschen historischen Werte entstehen.
 * TypeScript-Ziel: Zeitstempel, Wert, Einheit und Quelle typisieren.
 */

/**
 * Vertragsstelle: Featureabhängige History-Anzeige
 * Zweck: EVCS- und Speicherfarm-Reihen dürfen nur sichtbar sein, wenn diese Features in der Anlage vorhanden sind.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/history.js
 * Rolle im Projekt: Historie-Frontend.
 * Zweck: Lädt und visualisiert historische Messwerte, Reports und Legenden für PC/Tablet/Smartphone.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Historien-Frontend: lädt Zeitreihen über /api/history, zeichnet Charts und öffnet Reports/Exports.
 * Zusammenhänge:
 * - Nutzen dieselben Flow-/KPI-State-Namen wie LIVE-Dashboard und Backend-History-API.
 * - Feature-Sichtbarkeit für EVCS/Farm muss mit /config übereinstimmen.
 * Wartungshinweise:
 * - Keine abgeleiteten Werte anders interpretieren als app.js oder main.js, sonst entstehen widersprüchliche Verläufe.
 */

(function(){
  // simple line chart renderer on canvas
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const priceCanvas = document.getElementById('priceChart');
  const priceCtx = priceCanvas ? priceCanvas.getContext('2d') : null;
  /**
   * Code-Teil: resize
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  let historyRenderFrame = 0;
  let historyRenderSettleTimer = null;
  let historyResizeSettleTimer = null;

  /**
   * RC92 – Canvas-Größe nur bei einer echten Layoutänderung aktualisieren.
   *
   * Das erneute Setzen von width/height löscht den gesamten Canvas. Mobile
   * Browser senden beim Ein-/Ausblenden ihrer Adressleiste mehrere Resize-
   * Ereignisse. Ohne diese Prüfung entstanden dadurch unnötige Vollzeichnungen
   * und kurze Blockaden des Hauptthreads während des Scrollens.
   */
  function resize(){
    let changed = false;
    const chartWidth = Math.max(1, Math.round(canvas.clientWidth || 1));
    const chartHeight = Math.max(1, Math.round(canvas.clientHeight || 1));
    if (canvas.width !== chartWidth) { canvas.width = chartWidth; changed = true; }
    if (canvas.height !== chartHeight) { canvas.height = chartHeight; changed = true; }
    if (priceCanvas) {
      const priceWidth = Math.max(1, Math.round(priceCanvas.clientWidth || 1));
      const priceHeight = Math.max(1, Math.round(priceCanvas.clientHeight || 1));
      if (priceCanvas.width !== priceWidth) { priceCanvas.width = priceWidth; changed = true; }
      if (priceCanvas.height !== priceHeight) { priceCanvas.height = priceHeight; changed = true; }
    }
    return changed;
  }

  /**
   * RC92 – Mehrere Renderanforderungen eines Frames zusammenfassen.
   *
   * Fachliche Daten werden nicht gedrosselt oder verändert. Es wird lediglich
   * verhindert, dass dieselben Canvas-Daten innerhalb eines Browserframes
   * mehrfach vollständig gezeichnet werden.
   */
  function scheduleHistoryFrame(){
    if (historyRenderFrame) return;
    const render = ()=>{
      historyRenderFrame = 0;
      try { resize(); } catch(_e){}
      try { draw(); } catch(_e){}
      try { drawPricingHistoryChart(); } catch(_e){}
    };
    if (typeof window.requestAnimationFrame === 'function') {
      historyRenderFrame = window.requestAnimationFrame(render);
    } else {
      historyRenderFrame = window.setTimeout(render, 16);
    }
  }

  // Mobile Viewport-Änderungen werden pro Frame zusammengefasst. Ein später
  // Settle-Render übernimmt die endgültige Größe nach der Browserleisten-Animation.
  window.addEventListener('resize', ()=>{
    scheduleHistoryFrame();
    if (historyResizeSettleTimer) clearTimeout(historyResizeSettleTimer);
    historyResizeSettleTimer = setTimeout(scheduleHistoryFrame, 140);
  }, { passive: true });
  window.addEventListener('orientationchange', ()=>{
    scheduleHistoryFrame();
    if (historyResizeSettleTimer) clearTimeout(historyResizeSettleTimer);
    historyResizeSettleTimer = setTimeout(scheduleHistoryFrame, 220);
  }, { passive: true });
  /**
   * Code-Teil: fmt
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fmt(ts){ const d=new Date(ts); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }


  /**
   * RC92 – Maus- und Touchkoordinaten einheitlich lesen.
   *
   * `clientX/clientY` bleiben im Viewport-System. Für die Auswertung des
   * Canvas werden sie separat in dessen interne Pixelkoordinaten umgerechnet.
   * So stimmt der ausgewählte Zeitpunkt auch bei responsiver Skalierung.
   */
  function eventClientPoint(ev){
    const touch = (ev && ev.touches && ev.touches[0])
      ? ev.touches[0]
      : (ev && ev.changedTouches && ev.changedTouches[0])
        ? ev.changedTouches[0]
        : null;
    const clientX = Number(touch ? touch.clientX : ev && ev.clientX);
    const clientY = Number(touch ? touch.clientY : ev && ev.clientY);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    return { clientX, clientY };
  }

  function canvasPointFromEvent(targetCanvas, ev){
    const point = eventClientPoint(ev);
    if (!point || !targetCanvas) return null;
    const rect = targetCanvas.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return null;
    const scaleX = Number(targetCanvas.width || 0) / rect.width || 1;
    const scaleY = Number(targetCanvas.height || 0) / rect.height || 1;
    return {
      clientX: point.clientX,
      clientY: point.clientY,
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top) * scaleY,
    };
  }

  function isMobileHistorySurface(){
    const narrow = Number(window.innerWidth || 0) <= 720;
    const coarse = Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    return narrow || coarse;
  }

  /**
   * RC92 – Wertefenster garantiert im sichtbaren Viewport platzieren.
   *
   * Der alte Tooltip war absolut im langen <main>-Container positioniert, seine
   * Koordinaten stammten jedoch vom Canvas. Nach dem Herunterscrollen lag er auf
   * Smartphones deshalb häufig außerhalb des sichtbaren Bereichs. Mobile Geräte
   * erhalten nun eine feste Wertekarte am unteren Viewportrand; Desktop bleibt
   * bei der vertrauten Position neben dem Mauszeiger.
   */
  function showFloatingTip(tip, html, clientX, clientY){
    if (!tip) return;
    const mobile = isMobileHistorySurface();
    tip.innerHTML = html;
    tip.classList.toggle('nx-tip--mobile', mobile);
    tip.style.display = 'block';
    tip.style.visibility = 'hidden';

    if (mobile) {
      // Die konkrete Position kommt aus der mobilen CSS-Klasse. Alte Desktop-
      // Inlinewerte müssen vorher gelöscht werden, damit kein versteckter Restwert gewinnt.
      tip.style.left = '12px';
      tip.style.right = '12px';
      tip.style.top = 'auto';
      tip.style.bottom = 'calc(12px + env(safe-area-inset-bottom, 0px))';
      tip.style.width = 'auto';
      tip.style.maxWidth = 'none';
      // Viele optionale Verbraucher/Erzeuger können die Wertekarte verlängern.
      // Sie bleibt im Viewport und darf intern scrollen, ohne die Seite zu blockieren.
      tip.style.maxHeight = 'min(62dvh, 480px)';
      tip.style.overflowY = 'auto';
      tip.style.overscrollBehavior = 'contain';
      tip.style.touchAction = 'pan-y';
      tip.style.pointerEvents = 'auto';
      tip.style.visibility = 'visible';
      return;
    }

    tip.style.right = 'auto';
    tip.style.bottom = 'auto';
    tip.style.width = 'max-content';
    tip.style.maxWidth = 'min(320px, calc(100vw - 20px))';
    tip.style.maxHeight = 'none';
    tip.style.overflowY = 'visible';
    tip.style.overscrollBehavior = 'auto';
    tip.style.touchAction = 'auto';
    tip.style.pointerEvents = 'none';
    tip.style.left = '0px';
    tip.style.top = '0px';

    const viewportWidth = Math.max(1, Number(window.innerWidth || document.documentElement.clientWidth || 1));
    const viewportHeight = Math.max(1, Number(window.innerHeight || document.documentElement.clientHeight || 1));
    const bounds = tip.getBoundingClientRect();
    const width = Math.min(bounds.width || 240, Math.max(1, viewportWidth - 20));
    const height = Math.min(bounds.height || 120, Math.max(1, viewportHeight - 20));
    const margin = 10;
    const gap = 16;
    let left = clientX + gap;
    if (left + width > viewportWidth - margin) left = clientX - width - gap;
    let top = clientY - height / 2;
    left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - height - margin));
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
    tip.style.visibility = 'visible';
  }

  let data=null;
  let chartMode='day'; // 'day' | 'week' | 'month' | 'year'
  let historyBooted = false;
  let historyRetryTimer = null;
  let historyRetryCount = 0;
  let historyInFlightKey = '';
  let historyInFlightPromise = null;
  let historyLastLoadedKey = '';
  let historyLastLoadedAt = 0;
  /**
   * Code-Teil: scheduleHistoryRenderBurst
   * Zweck: Rendert im nächsten Animationsframe und genau einmal nach dem Layout-Settle.
   * Zusammenhang: Ersetzt den früheren Drei-Zeichnungen-Burst, der auf Smartphones
   *               beim Scrollen unnötig Hauptthread-Zeit beanspruchte.
   * RC92-Invariante: Mehrere Aufrufer innerhalb desselben Frames erzeugen nur eine Vollzeichnung.
   */
  function scheduleHistoryRenderBurst(){
    scheduleHistoryFrame();
    if (historyRenderSettleTimer) clearTimeout(historyRenderSettleTimer);
    historyRenderSettleTimer = setTimeout(scheduleHistoryFrame, 180);
  }
  /**
   * Code-Teil: countRenderableHistoryPoints
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function countRenderableHistoryPoints(res){
    let count = 0;
    /**
     * Code-Teil: scan
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const scan = (arr)=>{
      if (!Array.isArray(arr)) return;
      for (const p of arr){
        const ts = toTsMs(p && p[0]);
        const val = Number(p && p[1]);
        if (Number.isFinite(ts) && Number.isFinite(val)) {
          count += 1;
          if (count >= 2) return;
        }
      }
    };
    const core = (res && res.series && typeof res.series === 'object') ? res.series : {};
    Object.keys(core).forEach((k)=>{ if (count < 2) scan(core[k] && core[k].values); });
    const ex = (res && res.extras && typeof res.extras === 'object') ? res.extras : null;
    ['consumers','producers'].forEach((kind)=>{
      if (count >= 2) return;
      const list = Array.isArray(ex && ex[kind]) ? ex[kind] : [];
      list.forEach((entry)=>{ if (count < 2) scan(entry && entry.values); });
    });
    return count;
  }
  /**
   * Code-Teil: scheduleHistoryRetry
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function scheduleHistoryRetry(delayMs = 900){
    if (historyRetryTimer || historyRetryCount >= 2) return;
    historyRetryCount += 1;
    historyRetryTimer = setTimeout(()=>{
      historyRetryTimer = null;
      load();
    }, Math.max(250, Number(delayMs) || 900));
  }
  /**
   * Code-Teil: bootHistoryOnce
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function bootHistoryOnce(){
    if (historyBooted) return;
    historyBooted = true;
    try { resize(); } catch(_e){}
    load();
    scheduleHistoryRenderBurst();
  }

  // Day chart rendering style
  // - true  => stacked area (OpenEMS-like) on dark background
  // - false => classic line chart
  let stackMode = true;

  
  let barState = null;
  let pricingState = { visible:false, ready:false, rawIntervals:[], points:[], summary:null, note:'', meta:{} };
  let pricingChartState = null;
  let priceCrossX = null;
  const hiddenPriceSeries = new Set();
  /**
   * Code-Teil: isPriceSeriesVisible
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function isPriceSeriesVisible(key){ return !hiddenPriceSeries.has(String(key || '')); }
  /**
   * Code-Teil: setPriceSeriesVisible
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setPriceSeriesVisible(key, visible){
    const k = String(key || '');
    if (!k) return;
    if (visible) hiddenPriceSeries.delete(k); else hiddenPriceSeries.add(k);
  }
  /**
   * Code-Teil: applyPriceLegendState
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function applyPriceLegendState(){
    const items = Array.from(document.querySelectorAll('#priceLegend .lg[data-series]'));
    items.forEach((el)=>{
      const key = String(el.dataset.series || '');
      const visible = isPriceSeriesVisible(key);
      el.classList.toggle('inactive', !visible);
      el.setAttribute('aria-pressed', visible ? 'true' : 'false');
      const label = String(el.dataset.label || (el.textContent || '').trim() || key);
      el.title = `${label}: ${visible ? 'sichtbar' : 'ausgeblendet'} — klicken zum Umschalten`;
    });
  }
  /**
   * Code-Teil: bindPriceLegendItem
   * Zweck: Verbindet Event-Handler mit DOM oder Runtime-Objekten.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function bindPriceLegendItem(el){
    if (!el || el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    el.setAttribute('role', 'button');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('click', (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      const key = String(el.dataset.series || '');
      if (!key) return;
      setPriceSeriesVisible(key, hiddenPriceSeries.has(key));
      try { if (typeof window.__nxHistoryHidePriceTip === 'function') window.__nxHistoryHidePriceTip(true); } catch(_e){}
      applyPriceLegendState();
      drawPricingHistoryChart();
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('keydown', (ev)=>{
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      el.click();
    });
  }

  // --- Legend / series visibility ---
  const hiddenSeries = new Set();
  /**
   * Code-Teil: isSeriesVisible
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function isSeriesVisible(key){ return !hiddenSeries.has(String(key || '')); }
  /**
   * Code-Teil: setSeriesVisible
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setSeriesVisible(key, visible){
    const k = String(key || '');
    if (!k) return;
    if (visible) hiddenSeries.delete(k); else hiddenSeries.add(k);
  }
  /**
   * Code-Teil: applyLegendState
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function applyLegendState(){
    const items = Array.from(document.querySelectorAll('#mainLegend .lg[data-series]'));
    items.forEach((el)=>{
      const key = String(el.dataset.series || '');
      const visible = isSeriesVisible(key);
      el.classList.toggle('inactive', !visible);
      el.setAttribute('aria-pressed', visible ? 'true' : 'false');
      const label = String(el.dataset.label || (el.textContent || '').trim() || key);
      el.title = `${label}: ${visible ? 'sichtbar' : 'ausgeblendet'} — klicken zum Umschalten`;
    });
  }
  /**
   * Code-Teil: bindLegendItem
   * Zweck: Verbindet Event-Handler mit DOM oder Runtime-Objekten.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function bindLegendItem(el){
    if (!el || el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    el.setAttribute('role', 'button');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('click', (ev)=>{
      ev.preventDefault();
      ev.stopPropagation();
      const key = String(el.dataset.series || '');
      if (!key) return;
      setSeriesVisible(key, hiddenSeries.has(key));
      try { if (typeof window.__nxHistoryHideTip === 'function') window.__nxHistoryHideTip(true); } catch(_e){}
      applyLegendState();
      draw();
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('keydown', (ev)=>{
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      el.click();
    });
  }

  // --- Zoom & Navigation (History) ---
  // Zoom is implemented for the day chart (line mode) via drag-selection.
  // The date inputs remain as a detailed search tool.
  let zoomStack = []; // stack of {fromMs,toMs}
  let zoomSel = null; // {x0,x1} while dragging
  let zoomDragging = false;
  let zoomDragStartX = 0;
  let zoomSuppressClickUntil = 0;
  /**
   * Code-Teil: getChartMargins
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getChartMargins(){
    const W = canvas.width;
    const L = (W < 520) ? 54 : 64;
    const R = (W < 520) ? 48 : 56;
    const T = (W < 520) ? 20 : 24;
    const B = 42;
    return { L, R, T, B };
  }

  // --- Optional Energiefluss series (Verbraucher/Erzeuger) ---
  /**
   * Code-Teil: getExtras
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getExtras(){
    const ex = (data && data.extras && typeof data.extras === 'object') ? data.extras : null;
    return {
      consumers: Array.isArray(ex && ex.consumers) ? ex.consumers : [],
      producers: Array.isArray(ex && ex.producers) ? ex.producers : []
    };
  }
  /**
   * Code-Teil: buildSeriesAll
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildSeriesAll(){
    const base = (data && data.series && typeof data.series === 'object') ? data.series : {};
    const ex = getExtras();
    const out = Object.assign({}, base);
    // attach extras as distinct keys (c1..c10, p1..p5)
    ex.consumers.forEach((c)=>{
      const key = 'c' + String(c && c.idx || '');
      if (!key || key==='c') return;
      out[key] = { id: c.id, name: c.name, kind: 'consumer', values: Array.isArray(c.values) ? c.values : [] };
    });
    ex.producers.forEach((p)=>{
      const key = 'p' + String(p && p.idx || '');
      if (!key || key==='p') return;
      out[key] = { id: p.id, name: p.name, kind: 'producer', values: Array.isArray(p.values) ? p.values : [] };
    });
    return out;
  }

  const EXTRA_COLORS = {
    // 10 Verbraucher
    consumer: ['#22d3ee','#f472b6','#bef264','#c084fc','#fb7185','#2dd4bf','#fde047','#818cf8','#fda4af','#34d399'],
    // 5 Erzeuger
    producer: ['#a3e635','#84cc16','#22c55e','#10b981','#14b8a6']
  };
  /**
   * Code-Teil: colorForExtra
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function colorForExtra(kind, idx){
    const list = EXTRA_COLORS[kind] || [];
    const i = Math.max(0, Math.min(list.length-1, (Number(idx)||1)-1));
    return list[i] || '#cbd3db';
  }
  /**
   * Code-Teil: updateLegend
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateLegend(){
    const legend = document.getElementById('mainLegend');
    if (!legend) return;
    Array.from(legend.querySelectorAll('.lg-extra')).forEach(el=>{ try{ el.remove(); }catch(_e){} });
    Array.from(legend.querySelectorAll('.lg[data-series]')).forEach(bindLegendItem);

    if (chartMode === 'day') {
      const ex = getExtras();
      /**
       * Code-Teil: addItem
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      function addItem(label, color, key){
        const el = document.createElement('div');
        el.className = 'lg lg-extra';
        el.dataset.series = key;
        el.dataset.label = label;
        const sw = document.createElement('div');
        sw.className = 'sw';
        sw.style.background = color;
        const sp = document.createElement('span');
        sp.textContent = label;
        el.appendChild(sw);
        el.appendChild(sp);
        legend.appendChild(el);
        bindLegendItem(el);
      }

      ex.producers.forEach(p=>{
        const idx = Number(p && p.idx) || 0;
        if (!idx) return;
        const name = (p && p.name) ? String(p.name) : `Erzeuger ${idx}`;
        addItem(name, colorForExtra('producer', idx), `p${idx}`);
      });
      ex.consumers.forEach(c=>{
        const idx = Number(c && c.idx) || 0;
        if (!idx) return;
        const name = (c && c.name) ? String(c.name) : `Verbraucher ${idx}`;
        addItem(name, colorForExtra('consumer', idx), `c${idx}`);
      });
    }

    applyLegendState();
  }
  /**
   * Code-Teil: drawBars
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function drawBars(){
      const {start, end} = data;
      const series = buildSeriesAll();
    const W=canvas.width, H=canvas.height, L=50, R=40, T=10, B=42;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#0e1216'; ctx.fillRect(0,0,W,H);

    const buckets = bucketizeRange(start, end, chartMode);
    const allKeys=['pv','chg','dchg','sell','buy','evcs','load'];
    const keys = allKeys.filter(isSeriesVisible);
    const colors={'pv':'#f1c40f','chg':'#27ae60','dchg':'#e67e22','sell':'#3498db','buy':'#e74c3c','evcs':'#ff6bd6','load':'#9b59b6'};
    const seriesAgg = {};
    allKeys.forEach(k=>{ seriesAgg[k] = aggregateEnergyKWh(series[k]?.values||[], buckets); });
    const totals = buckets.map((_,i)=> keys.reduce((sum,k)=> sum + (seriesAgg[k][i]?.kwh||0), 0));
    let maxKWh = Math.max(1, ...totals);
    const pad = Math.max(0.05, maxKWh*0.1);
    /**
     * Code-Teil: Arrow-Funktion `y`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: y
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const y = (val)=> T + (H-B-T) * (1 - ((val)/(maxKWh+pad)));

    const n = buckets.length;
    const innerW = (W - L - R);
    const groupW = innerW / Math.max(1,n);
    const barW = Math.max(8, groupW * 0.5);

    ctx.fillStyle='#cbd3db'; ctx.font='12px system-ui, sans-serif';
    ctx.textAlign='right'; ctx.fillText('kWh', L-6, T+12);
    ctx.textAlign='center';

    for(let i=0;i<n;i++){
      const b = buckets[i];
      let lbl='';
      const d = new Date(b.start);
      if(chartMode==='week' || chartMode==='month') lbl = d.toLocaleDateString([], {day:'2-digit', month:'2-digit'});
      else if(chartMode==='year') lbl = d.toLocaleDateString([], {month:'short'});
      const xx = L + i*groupW + groupW/2;
      ctx.fillText(lbl, xx, H-6);
    }

    for(let i=0;i<n;i++){
      const xCenter = L + i*groupW + groupW/2;
      const x0 = xCenter - barW/2;
      let acc = 0;
      for (const k of keys){
        const v = seriesAgg[k][i]?.kwh || 0;
        if (v<=0) continue;
        const yTop = y(acc + v);
        const yBottom = y(acc);
        ctx.fillStyle = colors[k];
        ctx.fillRect(x0, yTop, barW-1, Math.max(1, yBottom - yTop));
        acc += v;
      }
    }

    barState = { buckets, chartMode, L, R, T, B, groupW, barW, seriesAgg, visibleKeys: keys.slice() };
  }
/**
 * Code-Teil: draw
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function draw(){
    if(!data){ ctx.clearRect(0,0,canvas.width,canvas.height); return; }
    if(chartMode!=='day'){ return drawBars(); }
    const {start, end} = data;
    const series = buildSeriesAll();
    const W = canvas.width;
    const H = canvas.height;
    // Leave enough room for axis labels (rounded canvas corners clip text near the edges).
    // On small screens we keep margins compact.
    const { L, R, T, B } = getChartMargins();
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#0e1216'; ctx.fillRect(0,0,W,H);

    // build unified time axis
    const times = new Set();
    Object.values(series).forEach(s=>s.values.forEach(p=>times.add(p[0])));
    const xs = Array.from(times).sort((a,b)=>a-b);
    if(xs.length<2) return;

    // Y scales
    // compute max power (kW)
    // X scale
    /**
     * Code-Teil: Arrow-Funktion `x`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: x
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const x = t => L + (t-start)/(end-start)*(W-L-R);

    // compute min/max (kW) across power series using mapped signs
    const ex = getExtras();
    const keysBase=['pv','chg','dchg','sell','buy','evcs','load'];
    const visibleBaseKeys = keysBase.filter(isSeriesVisible);
    const keysExtraProd = ex.producers.map(p=> 'p' + String(p && p.idx || '')).filter(k=>k && k!=='p' && series[k] && isSeriesVisible(k));
    const keysExtraCons = ex.consumers.map(c=> 'c' + String(c && c.idx || '')).filter(k=>k && k!=='c' && series[k] && isSeriesVisible(k));
    const keys = visibleBaseKeys.concat(keysExtraProd, keysExtraCons);
    let minKW=0, maxKW=0;

    // When enabled, render the day chart as a stacked area chart (OpenEMS-like).
    // Important: We stack only the *core* flows to avoid double-counting optional
    // consumer/producer series (those are shown as dashed overlay lines).
    let stackCtx = null;
    if (stackMode) {
      const stackKeys = visibleBaseKeys.slice();
      const valMap = {};
      stackKeys.forEach(k=>{
        const m = new Map();
        const vals = (series[k]?.values)||[];
        vals.forEach(p=>{ m.set(p[0], mapKW(k, p[1])); });
        valMap[k] = m;
      });

      /**
       * Code-Teil: Arrow-Funktion `isNeg`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: isNeg
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const isNeg = (k)=> (k === 'load' || k === 'evcs' || k === 'chg' || k === 'sell');
      const posKeys = stackKeys.filter(k=>!isNeg(k));
      const negKeys = stackKeys.filter(isNeg);

      xs.forEach(ts=>{
        let pos = 0;
        let neg = 0;
        for (const k of posKeys) {
          const v = valMap[k].get(ts);
          if (Number.isFinite(v) && v > 0) pos += v;
        }
        for (const k of negKeys) {
          const v = valMap[k].get(ts);
          if (Number.isFinite(v) && v < 0) neg += v;
        }
        if (pos > maxKW) maxKW = pos;
        if (neg < minKW) minKW = neg;
      });

      const overlayKeys = keysExtraProd.concat(keysExtraCons);
      overlayKeys.forEach(k=>{ const vals=(series[k]?.values)||[]; vals.forEach(p=>{ const v=mapKW(k, p[1]); if(v<minKW) minKW=v; if(v>maxKW) maxKW=v; }); });
      if (minKW===0 && maxKW===0) { maxKW = 1; }
      stackCtx = { stackKeys, valMap, posKeys, negKeys };
    } else {
      keys.forEach(k=>{ const vals=(series[k]?.values)||[]; vals.forEach(p=>{ const v=mapKW(k, p[1]); if(v<minKW) minKW=v; if(v>maxKW) maxKW=v; }); });
      if (minKW===0 && maxKW===0) { maxKW = 1; }
    }
    const pad = Math.max(0.05, (maxKW-minKW)*0.08);
    minKW -= pad; maxKW += pad;
    /**
     * Code-Teil: Arrow-Funktion `yPow`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: yPow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const yPow = (kw)=> T + (H-B-T)*(1 - ((kw - minKW)/((maxKW-minKW)||1)));
    const y0 = yPow(0);

    // SoC axis: map the full 0..100% range to the full plot height.
    // 0% is always at the bottom of the chart; 100% is always at the top.
    // (This is independent from the power 0‑line.)
    const ySocTop = T;
    const ySocBottom = H - B;
    /**
     * Code-Teil: Arrow-Funktion `ySoc`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: ySoc
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const ySoc = (pct)=> {
      const p = Math.max(0, Math.min(100, Number(pct) || 0));
      return ySocBottom - (p / 100) * (ySocBottom - ySocTop);
    };

    // grid
    ctx.strokeStyle='#1d242b'; ctx.lineWidth=1;
    for(let i=0;i<=5;i++){ const yy = T + i*(H-B-T)/5; ctx.beginPath(); ctx.moveTo(L,yy); ctx.lineTo(W-R,yy); ctx.stroke(); }
    // zero axis for power (emphasized)
    ctx.save(); ctx.strokeStyle='#2a323b'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(L,y0); ctx.lineTo(W-R,y0); ctx.stroke(); ctx.restore();

    // value mapping for sign conventions
    /**
     * Code-Teil: mapKW
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function mapKW(k, w){
      // w in Watts -> return kW with desired sign
      const val = Number(w)||0;
      // dynamic Energiefluss series
      if (String(k||'').startsWith('c')) return -Math.abs(val)/1000; // Verbraucher
      if (String(k||'').startsWith('p')) return  Math.abs(val)/1000; // Erzeuger
      switch(k){
        case 'load':   return -Math.abs(val)/1000;          // Verbrauch negativ unter 0
        case 'evcs':   return -Math.abs(val)/1000;          // E‑Mobilität Verbrauch negativ
        case 'chg':    return -Math.abs(val)/1000;          // Beladung negativ (unter 0)
        case 'dchg':   return  Math.abs(val)/1000;          // Entladung positiv (über 0)
        case 'sell':   return -Math.abs(val)/1000;          // Einspeisung negativ
        case 'buy':    return Math.abs(val)/1000;           // Bezug positiv
        default:       return (val)/1000;                   // PV etc. nativ (meist positiv)
      }
    }

    // small helpers for stacked fills
    /**
     * Code-Teil: hexToRgba
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function hexToRgba(hex, a){
      const h = String(hex || '').trim();
      const m = h.match(/^#?([0-9a-f]{6})$/i);
      if (!m) return `rgba(255,255,255,${a})`;
      const n = parseInt(m[1], 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return `rgba(${r},${g},${b},${a})`;
    }

    const CORE_COLORS = {
      pv:  '#f1c40f',
      chg: '#27ae60',
      dchg:'#e67e22',
      sell:'#3498db',
      buy: '#e74c3c',
      evcs:'#ff6bd6',
      load:'#9b59b6'
    };

    // helpers
    /**
     * Code-Teil: line
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function line(k, color, accessor='val', dash, width){
      const vals = (series[k] && series[k].values) || [];
      if(!vals.length) return;
      ctx.save(); ctx.beginPath();
      if (dash) ctx.setLineDash(dash);
      ctx.lineWidth = Number.isFinite(Number(width)) ? Number(width) : 2;
      ctx.strokeStyle = color;
      if (k==='soc'){
        let idx=0; let last=null;
        xs.forEach((ts,i)=>{
          while(idx<vals.length && vals[idx][0] <= ts){ last = vals[idx][1]; idx++; }
          if(last==null) return;
          const xx = x(ts); const yy = ySoc(last);
          if (i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
        });
      } else {
        vals.forEach((p,i)=>{ const xx=x(p[0]); const yy = yPow(mapKW(k, p[1])); if (i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy); });
      }
      ctx.stroke(); ctx.restore();
    }
    /**
     * Code-Teil: drawStackedAreas
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function drawStackedAreas(){
      if (!stackCtx) return;
      const { posKeys, negKeys, valMap } = stackCtx;
      const all = posKeys.concat(negKeys);
      const stack = {};
      all.forEach(k=>{ stack[k] = { lower: new Array(xs.length), upper: new Array(xs.length) }; });

      for (let i = 0; i < xs.length; i++) {
        const ts = xs[i];
        let pos = 0;
        let neg = 0;

        for (const k of posKeys) {
          const v = valMap[k].get(ts);
          const vv = Number.isFinite(v) ? v : 0;
          stack[k].lower[i] = pos;
          pos += (vv > 0 ? vv : 0);
          stack[k].upper[i] = pos;
        }
        for (const k of negKeys) {
          const v = valMap[k].get(ts);
          const vv = Number.isFinite(v) ? v : 0;
          stack[k].lower[i] = neg;
          neg += (vv < 0 ? vv : 0);
          stack[k].upper[i] = neg;
        }
      }

      /**
       * Code-Teil: Arrow-Funktion `drawArea`
       * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: drawArea
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const drawArea = (k) => {
        const seg = stack[k];
        if (!seg) return;
        let has = false;
        for (let i = 0; i < xs.length; i++) {
          const a = (seg.upper[i] ?? 0) - (seg.lower[i] ?? 0);
          if (Math.abs(a) > 1e-6) { has = true; break; }
        }
        if (!has) return;

        const col = CORE_COLORS[k] || '#9aa4ad';
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < xs.length; i++) {
          const xx = x(xs[i]);
          const yy = yPow(seg.upper[i]);
          if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        for (let i = xs.length - 1; i >= 0; i--) {
          const xx = x(xs[i]);
          const yy = yPow(seg.lower[i]);
          ctx.lineTo(xx, yy);
        }
        ctx.closePath();
        ctx.fillStyle = hexToRgba(col, 0.32);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(col, 0.85);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      };

      // Draw sinks first, then sources.
      negKeys.forEach(drawArea);
      posKeys.forEach(drawArea);
    }

    if (stackMode && stackCtx) {
      drawStackedAreas();
    } else {
      if (isSeriesVisible('pv')) line('pv',  CORE_COLORS.pv);
      if (isSeriesVisible('chg')) line('chg', CORE_COLORS.chg);
      if (isSeriesVisible('dchg')) line('dchg',CORE_COLORS.dchg);
      if (isSeriesVisible('sell')) line('sell',CORE_COLORS.sell);
      if (isSeriesVisible('buy')) line('buy', CORE_COLORS.buy);
      if (isSeriesVisible('evcs')) line('evcs',CORE_COLORS.evcs);
      if (isSeriesVisible('load')) line('load',CORE_COLORS.load);
    }

    // Extras (Energiefluss-Monitor): Erzeuger/Verbraucher
    ex.producers.forEach(p=>{
      const idx = Number(p && p.idx) || 0;
      if (!idx) return;
      const key = 'p' + idx;
      if (!isSeriesVisible(key)) return;
      line(key, colorForExtra('producer', idx), 'val', [4,4], 1.6);
    });
    ex.consumers.forEach(c=>{
      const idx = Number(c && c.idx) || 0;
      if (!idx) return;
      const key = 'c' + idx;
      if (!isSeriesVisible(key)) return;
      line(key, colorForExtra('consumer', idx), 'val', [4,4], 1.6);
    });

    if (isSeriesVisible('soc')) line('soc', '#95a5a6', 'val', [6,6]);

    // ------------------------------
    // Axes: labels + tick values
    // ------------------------------
    /**
     * Code-Teil: Arrow-Funktion `fmtKWAxis`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: fmtKWAxis
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const fmtKWAxis = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return '';
      if (Math.abs(n) < 0.05) return '0';
      return n.toLocaleString([], { maximumFractionDigits: 1, minimumFractionDigits: 0 });
    };

    ctx.fillStyle = '#cbd3db';
    ctx.font = '12px system-ui, sans-serif';

    // Y (Power) tick labels at grid lines
    ctx.save();
    ctx.fillStyle = '#aeb7bf';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 5; i++) {
      const yy = T + i * (H - B - T) / 5;
      const val = maxKW - i * (maxKW - minKW) / 5;
      ctx.fillText(fmtKWAxis(val), L - 8, yy);
    }
    ctx.restore();

    // Y (SoC) tick labels 0..100% on the right
    ctx.save();
    ctx.fillStyle = '#aeb7bf';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    [0, 20, 40, 60, 80, 100].forEach(p => {
      ctx.fillText(String(p), W - R + 8, ySoc(p));
    });
    ctx.restore();

    // Axis titles (units): render in the top padding area, above the tick labels
    // (matches the reference chart and avoids the previous "stacked" look).
    ctx.save();
    ctx.fillStyle = '#aeb7bf';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    const yTitle = Math.max(12, T - 8);
    // align with tick label columns
    ctx.textAlign = 'right';
    ctx.fillText('kW', L - 8, yTitle);
    ctx.textAlign = 'left';
    ctx.fillText('%', W - R + 8, yTitle);
    ctx.restore();

    // x ticks
    ctx.textAlign='center';
    for(let i=0;i<6;i++){
      const tt = start + i*(end-start)/5;
      ctx.fillText(fmt(tt), x(tt), H-6);
    }
  }
  /**
   * Code-Teil: bucketizeRange
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function bucketizeRange(fromMs, toMs, mode){
    const start = new Date(fromMs);
    const end = new Date(toMs);
    let buckets = [];
    /**
     * Code-Teil: pushBucket
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function pushBucket(s, e){ buckets.push({start:+s, end:+e}); }

    if (mode==='week' || mode==='month'){
      // Daily buckets between [fromMs,toMs)
      let cur = new Date(start);
      cur.setHours(0,0,0,0);
      while (cur.getTime() < toMs){
        const s = new Date(cur);
        const e = new Date(cur);
        e.setDate(e.getDate()+1);
        pushBucket(s, e);
        cur = e;
      }
    } else if (mode==='year'){
      // Monthly buckets between [fromMs,toMs)
      let cur = new Date(start.getFullYear(), start.getMonth(), 1);
      cur.setHours(0,0,0,0);
      while (cur.getTime() < toMs){
        const s = new Date(cur);
        const e = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
        pushBucket(s, e);
        cur = e;
      }
    } else {
      buckets = [{start: fromMs, end: toMs}];
    }
    // clip to requested range
    buckets = buckets.filter(b => b.end>fromMs && b.start<toMs).map(b=>({start:Math.max(b.start, fromMs), end:Math.min(b.end,toMs)}));
    return buckets;
  }
  /**
   * Code-Teil: aggregateEnergyKWh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function aggregateEnergyKWh(vals, buckets){
    // vals: [ [ts, W], ... ], buckets: [{start,end}]
    const out = buckets.map(b=>({mid: (b.start+b.end)/2, kwh:0}));
    if(!vals || vals.length<2) return out;
    let i=0;
    for(let j=0;j<vals.length-1;j++){
      let t0=+vals[j][0], v0=+vals[j][1];
      let t1=+vals[j+1][0], v1=+vals[j+1][1];
      if(!(t1>t0)) continue;
      // walk across buckets
      let segStart=t0, segV0=v0;
      while(segStart < t1){
        // current bucket index
        while(i<out.length && !(segStart < buckets[i].end)) i++;
        if(i>=out.length) break;
        const segEnd = Math.min(t1, buckets[i].end);
        const dt = (segEnd - segStart)/1000;
        const v1interp = v0 + (v1 - v0) * ((segEnd - t0)/(t1 - t0));
        const avgW = (Math.abs(segV0) + Math.abs(v1interp)) / 2;
        out[i].kwh += avgW * dt / 3600 / 1000;
        // next
        segStart = segEnd;
        segV0 = v1interp;
      }
    }
    return out;
  }
    /**
     * Code-Teil: toTsMs
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function toTsMs(t){
    if(t === null || t === undefined) return NaN;
    if(typeof t === 'number'){
      if(!Number.isFinite(t)) return NaN;
      // Heuristic: influxdb can return seconds; we need ms
      return (t > 0 && t < 1e12) ? t * 1000 : t;
    }
    if(t instanceof Date) return t.getTime();
    if(typeof t === 'string'){
      const s = t.trim();
      if(!s) return NaN;
      const asNum = Number(s);
      if(Number.isFinite(asNum)) return (asNum > 0 && asNum < 1e12) ? asNum * 1000 : asNum;
      const parsed = Date.parse(s);
      return Number.isNaN(parsed) ? NaN : parsed;
    }
    const n = Number(t);
    if(Number.isFinite(n)) return (n > 0 && n < 1e12) ? n * 1000 : n;
    return NaN;
  }
  /**
   * Code-Teil: sumEnergyKWh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function sumEnergyKWh(vals){
    if(!Array.isArray(vals) || vals.length < 2) return 0;
    const points = vals
      .map(p => [toTsMs(p[0]), Number(p[1])])
      .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .sort((a, b) => a[0] - b[0]);
    if(points.length < 2) return 0;

    let eWh = 0;
    for(let i=0; i<points.length-1; i++){
      const t0 = points[i][0], v0 = Math.abs(points[i][1]);
      const t1 = points[i+1][0], v1 = Math.abs(points[i+1][1]);
      if(t1 <= t0) continue;

      const dt_s = (t1 - t0) / 1000;
      const avgW = (v0 + v1) / 2;
      eWh += avgW * dt_s / 3600;
    }
    return eWh / 1000;
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
    const counterTooSmall = counter <= Math.max(0.05, integrated * 0.1);
    if (integrated > 0.25 && counterTooSmall) return integrated;
    return counter;
  }
  /**
   * Code-Teil: formatMoney2
   * Zweck: Formatiert Daten für Anzeige oder Logs.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function formatMoney2(v){ return Number.isFinite(Number(v)) ? (Number(v).toFixed(2) + ' €') : '--'; }
  /**
   * Code-Teil: formatPrice2
   * Zweck: Formatiert Daten für Anzeige oder Logs.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function formatPrice2(v){ return Number.isFinite(Number(v)) ? (Number(v).toFixed(2) + ' €/kWh') : '--'; }
  /**
   * Code-Teil: formatKwh2
   * Zweck: Formatiert Daten für Anzeige oder Logs.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function formatKwh2(v){ return Number.isFinite(Number(v)) ? (Number(v).toFixed(2) + ' kWh') : '--'; }
  /**
   * Code-Teil: normalizeNumericSeries
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function normalizeNumericSeries(vals){
    const arr = (Array.isArray(vals) ? vals : [])
      .map(p => [toTsMs(p && p[0]), Number(p && p[1])])
      .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .sort((a, b) => a[0] - b[0]);
    const out = [];
    for (const p of arr){
      if (out.length && out[out.length - 1][0] === p[0]) out[out.length - 1] = p;
      else out.push(p);
    }
    return out;
  }
  /**
   * Code-Teil: valueAtHold
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function valueAtHold(points, ts){
    if (!Array.isArray(points) || !points.length || !Number.isFinite(ts)) return NaN;
    if (ts <= points[0][0]) return Number(points[0][1]);
    let lo = 0, hi = points.length - 1;
    while (lo < hi){
      const mid = Math.floor((lo + hi + 1) / 2);
      if (points[mid][0] <= ts) lo = mid; else hi = mid - 1;
    }
    return Number(points[lo] && points[lo][1]);
  }
  /**
   * Code-Teil: buildPricingIntervals
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildPricingIntervals(res){
    const start = Number(res && res.start);
    const end = Number(res && res.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || !(end > start)) return [];

    const pricing = (res && res.pricing && typeof res.pricing === 'object') ? res.pricing : {};
    const series = (pricing && pricing.series && typeof pricing.series === 'object') ? pricing.series : {};
    const baseVals = normalizeNumericSeries(series.base && series.base.values);
    const netFeeVals = normalizeNumericSeries(series.netFee && series.netFee.values);
    const totalVals = normalizeNumericSeries(series.total && series.total.values);
    const buyVals = normalizeNumericSeries(res && res.series && res.series.buy && res.series.buy.values);

    if (!baseVals.length && !netFeeVals.length && !totalVals.length && !buyVals.length) return [];

    const tset = new Set([start, end]);
    [baseVals, netFeeVals, totalVals, buyVals].forEach(arr => {
      arr.forEach(p => {
        const ts = Number(p && p[0]);
        if (Number.isFinite(ts) && ts > start && ts < end) tset.add(ts);
      });
    });
    const times = Array.from(tset).filter(Number.isFinite).sort((a, b) => a - b);
    if (times.length < 2) return [];

    const buckets = [];
    for (let i = 0; i < times.length - 1; i++){
      const s = Number(times[i]);
      const e = Number(times[i + 1]);
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) buckets.push({ start: s, end: e });
    }
    if (!buckets.length) return [];

    const importAgg = aggregateEnergyKWh(buyVals, buckets);
    return buckets.map((b, idx) => {
      const mid = (b.start + b.end) / 2;
      let base = valueAtHold(baseVals, mid);
      let netFee = valueAtHold(netFeeVals, mid);
      let total = valueAtHold(totalVals, mid);
      if (!Number.isFinite(total)) {
        const safeBase = Number.isFinite(base) ? base : 0;
        const safeNet = Number.isFinite(netFee) ? netFee : 0;
        total = safeBase + safeNet;
      }
      if (!Number.isFinite(base)) base = Math.max(0, total - (Number.isFinite(netFee) ? netFee : 0));
      if (!Number.isFinite(netFee)) netFee = Math.max(0, total - (Number.isFinite(base) ? base : total));
      const importKwh = Math.max(0, Number(importAgg[idx] && importAgg[idx].kwh) || 0);
      const costEur = importKwh * Math.max(0, Number(total) || 0);
      return {
        start: b.start,
        end: b.end,
        ts: mid,
        base: Math.max(0, Number(base) || 0),
        netFee: Math.max(0, Number(netFee) || 0),
        total: Math.max(0, Number(total) || 0),
        importKwh,
        costEur,
      };
    });
  }
  /**
   * Code-Teil: aggregatePricingIntervals
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function aggregatePricingIntervals(intervals, fromMs, toMs, mode){
    const src = Array.isArray(intervals) ? intervals : [];
    if (!src.length) return [];
    if (mode === 'day') return src.map(iv => Object.assign({}, iv));
    const buckets = bucketizeRange(fromMs, toMs, mode);
    return buckets.map((b) => {
      let durAcc = 0;
      let baseAcc = 0;
      let netAcc = 0;
      let totalAcc = 0;
      let importKwh = 0;
      let costEur = 0;
      src.forEach((iv) => {
        const overlap = Math.min(b.end, iv.end) - Math.max(b.start, iv.start);
        const ivDur = iv.end - iv.start;
        if (!(overlap > 0) || !(ivDur > 0)) return;
        const factor = overlap / ivDur;
        durAcc += overlap;
        baseAcc += Number(iv.base || 0) * overlap;
        netAcc += Number(iv.netFee || 0) * overlap;
        totalAcc += Number(iv.total || 0) * overlap;
        importKwh += Number(iv.importKwh || 0) * factor;
        costEur += Number(iv.costEur || 0) * factor;
      });
      const ts = (b.start + b.end) / 2;
      return {
        start: b.start,
        end: b.end,
        ts,
        base: durAcc > 0 ? (baseAcc / durAcc) : 0,
        netFee: durAcc > 0 ? (netAcc / durAcc) : 0,
        total: durAcc > 0 ? (totalAcc / durAcc) : 0,
        importKwh: Math.max(0, importKwh),
        costEur: Math.max(0, costEur),
      };
    });
  }
  /**
   * Code-Teil: summarizePricingIntervals
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function summarizePricingIntervals(intervals){
    const src = Array.isArray(intervals) ? intervals : [];
    if (!src.length) {
      return {
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        importKwh: null,
        totalCost: null,
        netFeeCost: null,
      };
    }
    const prices = src.map(iv => Number(iv.total)).filter(Number.isFinite);
    const importKwh = src.reduce((sum, iv) => sum + (Number(iv.importKwh) || 0), 0);
    const totalCost = src.reduce((sum, iv) => sum + (Number(iv.costEur) || 0), 0);
    const netFeeCost = src.reduce((sum, iv) => sum + ((Number(iv.importKwh) || 0) * (Number(iv.netFee) || 0)), 0);
    let avgPrice = null;
    if (importKwh > 0.0001) avgPrice = totalCost / importKwh;
    else if (prices.length) avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    return {
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      avgPrice,
      importKwh,
      totalCost,
      netFeeCost,
    };
  }
  /**
   * Code-Teil: renderPricingCards
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderPricingCards(summary){
    const cards = document.getElementById('priceCards');
    if (!cards) return;
    cards.innerHTML = '';
    /**
     * Code-Teil: card
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function card(title, val){
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `<small>${title}</small><b>${val}</b>`;
      cards.appendChild(el);
    }
    const s = summary || {};
    card('Preis min', formatPrice2(s.minPrice));
    card('Preis max', formatPrice2(s.maxPrice));
    card('Ø Preis', formatPrice2(s.avgPrice));
    card('Bezug', formatKwh2(s.importKwh));
    card('Kosten', formatMoney2(s.totalCost));
    card('Netzentgelt-Anteil', formatMoney2(s.netFeeCost));
  }
  /**
   * Code-Teil: buildPricingNote
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function buildPricingNote(pricing, intervals){
    const src = (pricing && typeof pricing === 'object') ? pricing : {};
    const parts = [];
    if (src.dynamicTariff) parts.push('dynamischer Strompreis aktiv');
    else parts.push('Basispreis aus Einstellungen');
    if (src.netFeeEnabled) parts.push('variables Netzentgelt aktiv');
    if (Array.isArray(intervals) && intervals.length) parts.push('Kosten werden aus historischem Preis × Bezug berechnet');
    else parts.push('Preis-Historie füllt sich ab diesem Update und dient später zum Gegenprüfen der Abrechnung');
    return parts.join(' · ');
  }
  /**
   * Code-Teil: syncPricingLegend
   * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function syncPricingLegend(){
    Array.from(document.querySelectorAll('#priceLegend .lg[data-series]')).forEach(bindPriceLegendItem);
    applyPriceLegendState();
  }
  /**
   * Code-Teil: renderPricingHistory
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderPricingHistory(res){
    const section = document.getElementById('pricingSection');
    const noticeEl = document.getElementById('pricingNotice');
    const legendEl = document.getElementById('priceLegend');
    if (!section) return;

    const pricing = (res && res.pricing && typeof res.pricing === 'object') ? res.pricing : {};
    const rawIntervals = buildPricingIntervals(res);
    // Preis-/Netzentgelt-Historie nur anzeigen, wenn aktuell mindestens eine der beiden Funktionen aktiv ist.
    // Bereits historisierte Basispreis-Punkte allein dürfen den Bereich nicht einblenden.
    const shouldShow = !!(pricing && (pricing.active || pricing.dynamicTariff || pricing.netFeeEnabled));

    if (!shouldShow) {
      pricingState = { visible:false, ready:false, rawIntervals:[], points:[], summary:null, note:'', meta:{} };
      section.classList.add('hidden');
      if (legendEl) legendEl.style.display = 'none';
      renderPricingCards(null);
      try { if (typeof window.__nxHistoryHidePriceTip === 'function') window.__nxHistoryHidePriceTip(true); } catch(_e){}
      drawPricingHistoryChart();
      return;
    }

    const points = aggregatePricingIntervals(rawIntervals, Number(res.start), Number(res.end), chartMode);
    const summary = summarizePricingIntervals(rawIntervals);
    const note = buildPricingNote(pricing, rawIntervals);
    pricingState = {
      visible: true,
      ready: rawIntervals.length > 0,
      rawIntervals,
      points,
      summary,
      note,
      meta: {
        start: Number(res.start),
        end: Number(res.end),
        dynamicTariff: !!pricing.dynamicTariff,
        netFeeEnabled: !!pricing.netFeeEnabled,
      }
    };

    section.classList.remove('hidden');
    if (noticeEl) noticeEl.textContent = note;
    if (legendEl) legendEl.style.display = rawIntervals.length ? '' : 'none';
    renderPricingCards(summary);
    syncPricingLegend();
    resize();
    try { if (typeof window.__nxHistoryHidePriceTip === 'function') window.__nxHistoryHidePriceTip(true); } catch(_e){}
    drawPricingHistoryChart();
  }
  /**
   * Code-Teil: drawPricingHistoryChart
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function drawPricingHistoryChart(){
    if (!priceCanvas || !priceCtx) return;
    const W = priceCanvas.width || 0;
    const H = priceCanvas.height || 0;
    priceCtx.clearRect(0, 0, W, H);
    if (!W || !H) return;

    priceCtx.fillStyle = '#0e1216';
    priceCtx.fillRect(0, 0, W, H);

    const section = document.getElementById('pricingSection');
    if (!section || section.classList.contains('hidden') || !pricingState || !pricingState.visible) {
      pricingChartState = null;
      return;
    }

    const points = Array.isArray(pricingState.points) ? pricingState.points : [];
    if (!points.length) {
      priceCtx.save();
      priceCtx.fillStyle = '#9aa4ad';
      priceCtx.font = '13px system-ui, sans-serif';
      priceCtx.textAlign = 'center';
      priceCtx.fillText('Preis-Historie wird mit diesem Update aufgebaut.', W / 2, Math.max(24, H / 2));
      priceCtx.restore();
      pricingChartState = null;
      return;
    }

    const start = Number(pricingState.meta && pricingState.meta.start);
    const end = Number(pricingState.meta && pricingState.meta.end);
    const L = (W < 520) ? 56 : 68;
    const R = (W < 520) ? 58 : 72;
    const T = 24;
    const B = 42;

    const leftVals = [];
    if (isPriceSeriesVisible('total')) leftVals.push(...points.map(p => Number(p.total)).filter(Number.isFinite));
    if (isPriceSeriesVisible('base')) leftVals.push(...points.map(p => Number(p.base)).filter(Number.isFinite));
    if (isPriceSeriesVisible('netfee')) leftVals.push(...points.map(p => Number(p.netFee)).filter(Number.isFinite));
    let leftMin = leftVals.length ? Math.min(...leftVals) : 0;
    let leftMax = leftVals.length ? Math.max(...leftVals) : 1;
    if (!(leftMax > leftMin)) {
      leftMin = Math.max(0, leftMin - 0.05);
      leftMax = leftMin + 0.10;
    } else {
      const pad = Math.max(0.01, (leftMax - leftMin) * 0.12);
      leftMin = Math.max(0, leftMin - pad);
      leftMax += pad;
    }

    const rightVals = [];
    if (isPriceSeriesVisible('import')) rightVals.push(...points.map(p => Number(p.importKwh)).filter(Number.isFinite));
    if (isPriceSeriesVisible('cost')) rightVals.push(...points.map(p => Number(p.costEur)).filter(Number.isFinite));
    let rightMax = rightVals.length ? Math.max(...rightVals) : 1;
    rightMax = Math.max(0.05, rightMax * 1.15);

    /**
     * Code-Teil: Arrow-Funktion `x`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: x
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const x = (ts) => {
      const frac = (ts - start) / Math.max(1, (end - start));
      return L + Math.max(0, Math.min(1, frac)) * (W - L - R);
    };
    /**
     * Code-Teil: yLeft
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const yLeft = (val) => T + (H - B - T) * (1 - ((Number(val) - leftMin) / Math.max(0.00001, (leftMax - leftMin))));
    /**
     * Code-Teil: yRight
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const yRight = (val) => T + (H - B - T) * (1 - (Math.max(0, Number(val) || 0) / rightMax));

    // grid
    priceCtx.save();
    priceCtx.strokeStyle = 'rgba(255,255,255,.08)';
    priceCtx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = T + i * (H - B - T) / 4;
      priceCtx.beginPath();
      priceCtx.moveTo(L, yy);
      priceCtx.lineTo(W - R, yy);
      priceCtx.stroke();
    }
    priceCtx.restore();

    // left axis labels
    priceCtx.save();
    priceCtx.fillStyle = '#aeb7bf';
    priceCtx.font = '11px system-ui, sans-serif';
    priceCtx.textAlign = 'right';
    for (let i = 0; i < 5; i++) {
      const frac = 1 - (i / 4);
      const yy = T + i * (H - B - T) / 4 + 4;
      const val = leftMin + (leftMax - leftMin) * frac;
      priceCtx.fillText(val.toFixed(2), L - 8, yy);
    }
    priceCtx.textAlign = 'left';
    for (let i = 0; i < 5; i++) {
      const frac = 1 - (i / 4);
      const yy = T + i * (H - B - T) / 4 + 4;
      const val = rightMax * frac;
      priceCtx.fillText(val.toFixed(2), W - R + 8, yy);
    }
    priceCtx.textAlign = 'right';
    priceCtx.fillText('€/kWh', L - 8, Math.max(12, T - 8));
    priceCtx.textAlign = 'left';
    priceCtx.fillText('kWh / €', W - R + 8, Math.max(12, T - 8));
    priceCtx.restore();

    // x labels
    priceCtx.save();
    priceCtx.fillStyle = '#cbd3db';
    priceCtx.font = '12px system-ui, sans-serif';
    priceCtx.textAlign = 'center';
    if (chartMode === 'day') {
      for (let i = 0; i < 6; i++) {
        const ts = start + i * (end - start) / 5;
        priceCtx.fillText(fmt(ts), x(ts), H - 6);
      }
    } else {
      points.forEach((p, idx) => {
        if (points.length > 12 && (idx % Math.ceil(points.length / 8) !== 0) && idx !== points.length - 1) return;
        const d = new Date(p.ts);
        const lbl = (chartMode === 'year') ? d.toLocaleDateString([], { month:'short' }) : d.toLocaleDateString([], { day:'2-digit', month:'2-digit' });
        priceCtx.fillText(lbl, x(p.ts), H - 6);
      });
    }
    priceCtx.restore();

    // import bars (right axis)
    if (isPriceSeriesVisible('import')) {
      const barW = Math.max(4, Math.min(26, (W - L - R) / Math.max(1, points.length) * (chartMode === 'day' ? 0.75 : 0.55)));
      priceCtx.save();
      priceCtx.fillStyle = 'rgba(52, 152, 219, 0.35)';
      points.forEach((p) => {
        const xx = x(p.ts);
        const y0 = yRight(0);
        const yv = yRight(p.importKwh);
        priceCtx.fillRect(xx - barW / 2, yv, barW, Math.max(1, y0 - yv));
      });
      priceCtx.restore();
    }
    /**
     * Code-Teil: drawLine
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function drawLine(key, accessor, color, dash){
      if (!isPriceSeriesVisible(key)) return;
      const vals = points.map(accessor).filter(Number.isFinite);
      if (!vals.length) return;
      priceCtx.save();
      priceCtx.strokeStyle = color;
      priceCtx.lineWidth = (key === 'total') ? 2.2 : 1.7;
      priceCtx.setLineDash(Array.isArray(dash) ? dash : []);
      priceCtx.beginPath();
      let started = false;
      points.forEach((p) => {
        const val = Number(accessor(p));
        if (!Number.isFinite(val)) return;
        const xx = x(p.ts);
        const yy = (key === 'cost') ? yRight(val) : yLeft(val);
        if (!started) {
          priceCtx.moveTo(xx, yy);
          started = true;
        } else {
          priceCtx.lineTo(xx, yy);
        }
      });
      priceCtx.stroke();
      priceCtx.restore();
    }

    drawLine('cost', p => p.costEur, '#ef4444', []);
    drawLine('base', p => p.base, '#cbd5e1', [5, 4]);
    drawLine('netfee', p => p.netFee, '#10b981', [3, 4]);
    drawLine('total', p => p.total, '#f59e0b', []);

    if (priceCrossX != null) {
      priceCtx.save();
      priceCtx.strokeStyle = 'rgba(200,200,200,.35)';
      priceCtx.lineWidth = 1;
      priceCtx.beginPath();
      priceCtx.moveTo(priceCrossX, 0);
      priceCtx.lineTo(priceCrossX, H - B);
      priceCtx.stroke();
      priceCtx.restore();
    }

    pricingChartState = { points, start, end, L, R, T, B, x, yLeft, yRight, leftMin, leftMax, rightMax };
  }

  (function initPricingTooltip(){
    if (!priceCanvas || !priceCtx) return;
    let tip = document.createElement('div');
    tip.className = 'nx-tip nx-price-tip';
    tip.style.position = 'fixed';
    tip.style.pointerEvents = 'none';
    tip.style.background = 'rgba(20,24,28,.95)';
    tip.style.border = '1px solid #2a323b';
    tip.style.borderRadius = '10px';
    tip.style.padding = '8px 10px';
    tip.style.fontSize = '12px';
    tip.style.color = '#c8d1d9';
    tip.style.boxShadow = '0 8px 22px rgba(0,0,0,.35)';
    tip.style.display = 'none';
    tip.style.zIndex = '10000';
    tip.style.maxWidth = 'min(320px, calc(100vw - 20px))';
    tip.style.width = 'max-content';
    tip.style.boxSizing = 'border-box';
    tip.dataset.historyTip = 'price';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    document.body.appendChild(tip);
    /**
     * Code-Teil: hidePriceTip
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function hidePriceTip(silent){
      const wasVisible = tip.style.display !== 'none';
      tip.style.display = 'none';
      tip.style.visibility = 'hidden';
      priceCrossX = null;
      if (!silent && wasVisible) drawPricingHistoryChart();
    }
    window.__nxHistoryHidePriceTip = hidePriceTip;
    /**
     * Code-Teil: formatHeader
     * Zweck: Formatiert Daten für Anzeige oder Logs.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function formatHeader(ts){
      const d = new Date(ts);
      if (chartMode === 'day') return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      if (chartMode === 'year') return d.toLocaleDateString([], { month:'long' });
      return d.toLocaleDateString([], { day:'2-digit', month:'2-digit' });
    }
    /**
     * Code-Teil: row
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function row(label, val){
      return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${label}</span><b>${val}</b></div>`;
    }
    /**
     * Code-Teil: showPriceTipFromEvent
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function showPriceTipFromEvent(ev){
      if (!pricingChartState || !Array.isArray(pricingChartState.points) || !pricingChartState.points.length) return;
      const point = canvasPointFromEvent(priceCanvas, ev);
      if (!point) return;
      const { clientX: cx, clientY: cy, x: xPos, y: yPos } = point;
      const state = pricingChartState;
      if (xPos < state.L || xPos > (priceCanvas.width - state.R) || yPos < state.T || yPos > (priceCanvas.height - state.B)) {
        hidePriceTip();
        return;
      }
      const targetTs = state.start + ((xPos - state.L) / Math.max(1, (priceCanvas.width - state.L - state.R))) * (state.end - state.start);
      let best = state.points[0];
      let minDist = Math.abs((best && best.ts) - targetTs);
      state.points.forEach((p) => {
        const d = Math.abs(Number(p && p.ts) - targetTs);
        if (d < minDist) { minDist = d; best = p; }
      });
      if (!best) return;
      const rows = [];
      if (isPriceSeriesVisible('total')) rows.push(row('Gesamtpreis', formatPrice2(best.total)));
      if (isPriceSeriesVisible('base')) rows.push(row('Basispreis', formatPrice2(best.base)));
      if (isPriceSeriesVisible('netfee')) rows.push(row('Netzentgelt', formatPrice2(best.netFee)));
      if (isPriceSeriesVisible('import')) rows.push(row('Bezug', formatKwh2(best.importKwh)));
      if (isPriceSeriesVisible('cost')) rows.push(row('Kosten', formatMoney2(best.costEur)));
      if (!rows.length) { hidePriceTip(); return; }
      const html = `<div style="margin-bottom:6px;opacity:.9">${formatHeader(best.ts)}</div>` + rows.join('');
      priceCrossX = state.x(best.ts);
      showFloatingTip(tip, html, cx, cy);
      drawPricingHistoryChart();
    }

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('pointerdown', (ev)=>{
      if (tip.style.display === 'none') return;
      const target = ev.target;
      if (target === priceCanvas || tip.contains(target)) return;
      hidePriceTip();
    }, true);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('keydown', (ev)=>{ if (ev.key === 'Escape') hidePriceTip(); });
    // Desktop-Mauszeiger darf das Wertefenster schließen. Auf Touch-Geräten
    // erzeugte synthetische mouseleave-Ereignisse dürfen einen gerade geöffneten
    // Tooltip dagegen nicht sofort wieder verstecken.
    priceCanvas.addEventListener('mouseleave', ()=>{
      if (!isMobileHistorySurface()) hidePriceTip();
    });
    window.addEventListener('scroll', ()=>{
      if (tip.style.display !== 'none') hidePriceTip();
    }, { passive: true });

    let priceTouchGesture = null;
    let priceSuppressClickUntil = 0;
    priceCanvas.addEventListener('touchstart', (ev)=>{
      if (!ev.touches || ev.touches.length !== 1) { priceTouchGesture = null; return; }
      const point = eventClientPoint(ev);
      priceTouchGesture = point ? { startX: point.clientX, startY: point.clientY, moved: false } : null;
    }, { passive: true });
    priceCanvas.addEventListener('touchmove', (ev)=>{
      if (!priceTouchGesture) return;
      const point = eventClientPoint(ev);
      if (!point) return;
      const dx = point.clientX - priceTouchGesture.startX;
      const dy = point.clientY - priceTouchGesture.startY;
      if (Math.hypot(dx, dy) >= 12) priceTouchGesture.moved = true;
    }, { passive: true });
    priceCanvas.addEventListener('touchend', (ev)=>{
      const gesture = priceTouchGesture;
      priceTouchGesture = null;
      if (!gesture || gesture.moved) return;
      priceSuppressClickUntil = Date.now() + 600;
      showPriceTipFromEvent(ev);
    }, { passive: true });
    priceCanvas.addEventListener('touchcancel', ()=>{ priceTouchGesture = null; }, { passive: true });
    // Desktop-Klick bleibt unverändert. Den nach einem Touch-Tap synthetisierten
    // Klick unterdrücken wir, damit das Wertefenster nur einmal aktualisiert wird.
    priceCanvas.addEventListener('click', (ev)=>{
      if (Date.now() < priceSuppressClickUntil) return;
      showPriceTipFromEvent(ev);
    });
  })();
/**
 * Code-Teil: load
 * Zweck: Lädt Daten aus API, States oder Konfiguration.
 * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function load(force = false){
    const from = new Date(document.getElementById('from').value || new Date(Date.now()-24*3600*1000).toISOString().slice(0,16));
    const to   = new Date(document.getElementById('to').value   || new Date().toISOString().slice(0,16));
    const fromMs = from.getTime();
    const toMs   = to.getTime();
    const nowMs  = Date.now();
    // Performance-tuned sampling per range:
    // - Tag: 10 Minuten für den Detailverlauf
    // - Woche: 30 Minuten reichen für Tagestrends
    // - Monat: 1 Stunde hält Tagesbalken sauber und spart viel Last
    // - Jahr: 1 Tag reicht für Monatsbalken und bleibt sehr schnell
    let step = 600;
    if (chartMode === 'week') step = 1800;
    else if (chartMode === 'month') step = 3600;
    else if (chartMode === 'year') step = 86400;
    const url = `/api/history?from=${fromMs}&to=${toMs}&step=${step}`;
    const requestKey = `${chartMode}|${fromMs}|${toMs}|${step}`;

    if (!force && historyInFlightPromise && historyInFlightKey === requestKey) {
      return historyInFlightPromise;
    }
    if (!force && data && historyLastLoadedKey === requestKey && (Date.now() - historyLastLoadedAt) < 1200) {
      scheduleHistoryRenderBurst();
      return data;
    }

    /**
     * Code-Teil: Arrow-Funktion `reqPromise`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: reqPromise
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const reqPromise = (async()=>{
      const res = await fetch(url).then(r=>r.json()).catch(()=>null);
      if(!res || !res.ok){ alert('History kann nicht geladen werden'); return null; }

    // capture backend-aligned start/end before we normalize the UI range
    const backendInfo = { start: res.start, end: res.end, step: res.step };

    // Make sure the display range exactly matches what the UI selected.
    // (Some backends return slightly different 'start/end' depending on bucket alignment.)
    res.start = fromMs;
    res.end   = toMs;

    // If the selected range includes "future" (typical: today 00:00..24:00), some backends
    // fill empty buckets using the last known value. That creates the impression that
    // values exist in hours that haven't happened yet and inflates the kWh cards.
    //
    // Desired behavior:
    // - The chart builds up over the day
    // - Beyond "now" there is simply no data (blank)
    // Week/Month/Year request full ranges (e.g. month 01..31 / year Jan..Dec).
    // Some backends (e.g. InfluxDB with fill=previous) repeat the last known value into the
    // future. That produces fake bars for days/months that haven't happened yet and inflates
    // the kWh cards.
    //
    // Desired behavior:
    // - Past buckets show real data
    // - Current bucket (today / this month) builds up over time
    // - Future buckets are empty/0
    const clipFuture = (fromMs <= nowMs && toMs > nowMs);
    if (clipFuture) {
      const cutoff = nowMs;
      /**
       * Code-Teil: Arrow-Funktion `clipArr`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: clipArr
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const clipArr = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.filter(p => {
          const ts = toTsMs(p && p[0]);
          return Number.isFinite(ts) && ts <= cutoff;
        });
      };

      // core series
      if (res.series && typeof res.series === 'object') {
        Object.keys(res.series).forEach(k => {
          const s = res.series[k];
          if (s && Array.isArray(s.values)) s.values = clipArr(s.values);
        });
      }

      // extras
      if (res.extras && typeof res.extras === 'object') {
        ['consumers', 'producers'].forEach(kind => {
          const list = Array.isArray(res.extras[kind]) ? res.extras[kind] : [];
          list.forEach(item => {
            if (item && Array.isArray(item.values)) item.values = clipArr(item.values);
          });
        });
      }

      // pricing series
      if (res.pricing && typeof res.pricing === 'object' && res.pricing.series && typeof res.pricing.series === 'object') {
        Object.keys(res.pricing.series).forEach(k => {
          const s = res.pricing.series[k];
          if (s && Array.isArray(s.values)) s.values = clipArr(s.values);
        });
      }
      res.__cutoffNowMs = cutoff;
    }

    // Live-Day Progressive Zoom:
    // In der Tagesansicht (heute) soll sich der Chart Stück für Stück mit jedem 10‑Minuten‑Bucket aufbauen.
    // Dazu setzen wir die X‑Achse dynamisch auf den letzten verfügbaren Datenpunkt,
    // statt den restlichen Tag bis 24:00 leer anzuzeigen.
    if (chartMode === 'day' && clipFuture && (!zoomStack || zoomStack.length === 0)) {
      let maxTs = NaN;
      /**
       * Code-Teil: Arrow-Funktion `scan`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: scan
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const scan = (arr) => {
        if (!Array.isArray(arr)) return;
        for (const p of arr) {
          const ts = toTsMs(p && p[0]);
          if (Number.isFinite(ts) && (!Number.isFinite(maxTs) || ts > maxTs)) maxTs = ts;
        }
      };

      if (res.series && typeof res.series === 'object') {
        Object.keys(res.series).forEach(k => {
          const s = res.series[k];
          if (s && Array.isArray(s.values)) scan(s.values);
        });
      }
      if (res.extras && typeof res.extras === 'object') {
        ['consumers', 'producers'].forEach(kind => {
          const list = Array.isArray(res.extras[kind]) ? res.extras[kind] : [];
          list.forEach(item => {
            if (item && Array.isArray(item.values)) scan(item.values);
          });
        });
      }

      const minEnd = fromMs + step * 1000; // avoid zero-width x-axis
      if (Number.isFinite(maxTs) && maxTs > fromMs) {
        res.end = Math.max(minEnd, Math.min(maxTs, toMs));
      } else {
        res.end = Math.max(minEnd, Math.min(nowMs, toMs));
      }
    }


    data = res;
    // Backward compatible default (older backends won't include extras)
    if (!data.extras) data.extras = { consumers: [], producers: [] };
    updateLegend();
    try { if (typeof window.__nxHistoryHideTip === 'function') window.__nxHistoryHideTip(true); } catch(_e){}
    draw();
    // cards
    const stepSec = res.step; // legacy info
    const s = res.series;
    // If we clipped "future" buckets, ignore backend totals (they may still include
    // fill=previous artefacts) and sum only from the clipped series.
    const e = (!res.__cutoffNowMs && res && res.energy && typeof res.energy === 'object') ? res.energy : {};
    const exact = (res && res.energyExact && typeof res.energyExact === 'object') ? res.energyExact : {};
    /**
     * Code-Teil: Arrow-Funktion `exactNum`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: exactNum
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const exactNum = (key) => {
      const n = Number(exact && exact[key]);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const cards = document.getElementById('cards');
    /**
     * Code-Teil: card
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function card(title, val){ const el=document.createElement('div'); el.className='card'; el.innerHTML = `<small>${title}</small><b>${val}</b>`; cards.appendChild(el); }
    cards.innerHTML='';
    const pvKwh = exactNum('productionKwh') ?? pickEnergyKwh(e.productionKwh, sumEnergyKWh(s.pv && s.pv.values));
    const chargeKwh = exactNum('storageChargeKwh') ?? pickEnergyKwh(e.storageChargeKwh, sumEnergyKWh(s.chg && s.chg.values));
    const dischargeKwh = exactNum('storageDischargeKwh') ?? pickEnergyKwh(e.storageDischargeKwh, sumEnergyKWh(s.dchg && s.dchg.values));
    const exportKwh = exactNum('gridExportKwh') ?? pickEnergyKwh(e.gridExportKwh, sumEnergyKWh(s.sell && s.sell.values));
    const importKwh = exactNum('gridImportKwh') ?? pickEnergyKwh(e.gridImportKwh, sumEnergyKWh(s.buy && s.buy.values));
    const evKwh = exactNum('evKwh') ?? pickEnergyKwh(e.evKwh, sumEnergyKWh(s.evcs && s.evcs.values));
    const loadIntegratedKwh = sumEnergyKWh(s.load && s.load.values);
    const loadBalanceKwh = Math.max(0, pvKwh + importKwh + dischargeKwh - chargeKwh - exportKwh);
    const loadKwh = exactNum('consumptionKwh') ?? pickEnergyKwh(e.consumptionKwh, loadIntegratedKwh > 0.01 ? loadIntegratedKwh : loadBalanceKwh);
    const autarkyLocalKwh = Math.max(0, loadKwh - importKwh);
    const autarkyPct = loadKwh > 0.0001 ? Math.max(0, Math.min(100, (autarkyLocalKwh / loadKwh) * 100)) : null;

    card('Erzeugung',  pvKwh.toFixed(1) + ' kWh');
    card('Beladung',   chargeKwh.toFixed(1) + ' kWh');
    card('Entladung',  dischargeKwh.toFixed(1) + ' kWh');
    card('Einspeisung',exportKwh.toFixed(1) + ' kWh');
    card('Bezug',      importKwh.toFixed(1) + ' kWh');
    if (s.evcs) card('E‑Mobilität', evKwh.toFixed(1) + ' kWh');
    card('Verbrauch',  loadKwh.toFixed(1) + ' kWh');
    card('Autarkie', autarkyPct == null ? '-- %' : (autarkyPct.toFixed(1) + ' %'));

    // Extras (optional): Verbraucher/Erzeuger aus Energiefluss
    const ex = (res.extras && typeof res.extras === 'object') ? res.extras : { consumers: [], producers: [] };
    (Array.isArray(ex.producers) ? ex.producers : []).forEach(p=>{
      const idx = Number(p && p.idx) || 0;
      const name = (p && p.name) ? String(p.name) : (idx ? `Erzeuger ${idx}` : 'Erzeuger');
      const kwh = sumEnergyKWh(Array.isArray(p.values) ? p.values : []);
      // Show if configured (backend filters configured slots). Even if empty, show 0.0 for visibility.
      card(`Erzeuger: ${name}`, kwh.toFixed(1) + ' kWh');
    });
    (Array.isArray(ex.consumers) ? ex.consumers : []).forEach(c=>{
      const idx = Number(c && c.idx) || 0;
      const name = (c && c.name) ? String(c.name) : (idx ? `Verbraucher ${idx}` : 'Verbraucher');
      const kwh = sumEnergyKWh(Array.isArray(c.values) ? c.values : []);
      card(`Verbraucher: ${name}`, kwh.toFixed(1) + ' kWh');
    });

    renderPricingHistory(res);
    scheduleHistoryRenderBurst();
    if (countRenderableHistoryPoints(res) >= 2) {
      historyRetryCount = 0;
    } else {
      scheduleHistoryRetry(1100);
    }
    historyLastLoadedKey = requestKey;
    historyLastLoadedAt = Date.now();
    return res;
  })();

    historyInFlightKey = requestKey;
    historyInFlightPromise = reqPromise.finally(()=>{
      if (historyInFlightKey === requestKey) {
        historyInFlightKey = '';
        historyInFlightPromise = null;
      }
    });
    return historyInFlightPromise;
  }

  // --- Date handling ---
  // We keep the existing datetime-local inputs internally (used by zoom/reset and for API calls),
  // but the UI now exposes only a date selector. Ranges always cover whole days.
  const now = new Date();
  const today = new Date();
  today.setHours(0,0,0,0);
  /**
   * Code-Teil: toLocal
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function toLocal(dt){
    const z = dt.getTimezoneOffset();
    const d = new Date(dt.getTime() - z*60000);
    return d.toISOString().slice(0,16);
  }
  /**
   * Code-Teil: pad2
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function pad2(n){ return String(n).padStart(2,'0'); }
  /**
   * Code-Teil: toDateInput
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function toDateInput(dt){
    const d = new Date(dt);
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }
  /**
   * Code-Teil: fromDateInput
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function fromDateInput(str){
    if (!str || typeof str !== 'string') return null;
    const m = String(str).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    if (!y || !mo || !da) return null;
    const d = new Date(y, mo - 1, da, 0,0,0,0);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  /**
   * Code-Teil: getAnchorDate
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getAnchorDate(){
    const el = document.getElementById('day');
    const d = el && el.value ? fromDateInput(el.value) : null;
    return d || new Date();
  }
  /**
   * Code-Teil: setAnchorDate
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setAnchorDate(d){
    const el = document.getElementById('day');
    if (!el) return;
    el.value = toDateInput(d);
  }
  /**
   * Code-Teil: applyRangeForMode
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function applyRangeForMode(mode){
    const fromEl = document.getElementById('from');
    const toEl = document.getElementById('to');
    if (!fromEl || !toEl) return;

    const anchor = getAnchorDate();
    let from = null;
    let to = null;

    if (mode === 'day') {
      from = new Date(anchor); from.setHours(0,0,0,0);
      to = new Date(from); to.setDate(to.getDate() + 1);
    } else if (mode === 'week') {
      const endDay = new Date(anchor); endDay.setHours(0,0,0,0);
      from = new Date(endDay); from.setDate(from.getDate() - 6);
      to = new Date(endDay); to.setDate(to.getDate() + 1);
    } else if (mode === 'month') {
      from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    } else if (mode === 'year') {
      from = new Date(anchor.getFullYear(), 0, 1);
      to = new Date(anchor.getFullYear() + 1, 0, 1);
    } else {
      from = new Date(anchor); from.setHours(0,0,0,0);
      to = new Date(from); to.setDate(to.getDate() + 1);
    }

    fromEl.value = toLocal(from);
    toEl.value = toLocal(to);
  }

  // init date selector (today)
  setAnchorDate(today);
  applyRangeForMode(chartMode);

  const dayEl = document.getElementById('day');
  if (dayEl) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an dayEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    dayEl.addEventListener('change', ()=>{
      // Date switch resets zoom (day view) and refreshes.
      zoomStack = [];
      zoomSel = null;
      zoomDragging = false;
      try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}
      applyRangeForMode(chartMode);
      load();
    });
  }

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document.getElementById('loadBtn'). Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.getElementById('loadBtn').addEventListener('click', load);

  // stacked/line toggle (day view)
  const stackBtn = document.getElementById('stackToggle');
  if (stackBtn) {
    /**
     * Code-Teil: Arrow-Funktion `apply`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: apply
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const apply = ()=> stackBtn.classList.toggle('active', !!stackMode);
    apply();
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an stackBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    stackBtn.addEventListener('click', ()=>{
      stackMode = !stackMode;
      apply();
      draw();
    });
  }

  const evcsReportBtn = document.getElementById('evcsReportBtn');
  if (evcsReportBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an evcsReportBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    evcsReportBtn.addEventListener('click', ()=>{
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      const fromMs = fromEl && fromEl.value ? +new Date(fromEl.value) : (Date.now() - 7*24*3600*1000);
      const toMs = toEl && toEl.value ? +new Date(toEl.value) : Date.now();
      // Open in the same tab (so the user can navigate back via the shared header)
      const url = `/evcs-report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
      window.location.href = url;
    });
  }

  const tariffReportBtn = document.getElementById('tariffReportBtn');
  if (tariffReportBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an tariffReportBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    tariffReportBtn.addEventListener('click', ()=>{
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      const fromMs = fromEl && fromEl.value ? +new Date(fromEl.value) : (Date.now() - 24*3600*1000);
      const toMs = toEl && toEl.value ? +new Date(toEl.value) : Date.now();
      const url = `/tariff-report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
      window.location.href = url;
    });
  }

  // Jahresreport (Mehrjahresübersicht) – öffnet eine Tabelle ähnlich EVCS-Abrechnung
  const yearReportBtn = document.getElementById('yearReportBtn');
  if (yearReportBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an yearReportBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    yearReportBtn.addEventListener('click', ()=>{
      const anchor = getAnchorDate();
      const y = (anchor && Number.isFinite(anchor.getTime())) ? anchor.getFullYear() : (new Date()).getFullYear();
      // Default: aktuelles Jahr + die 3 Vorjahre (wie im Screenshot)
      const url = `/year-report?y=${encodeURIComponent(y)}&span=4`;
      window.location.href = url;
    });
  }
// range buttons
  (function(){
    const btns = Array.from(document.querySelectorAll('.range-btn'));
    /**
     * Code-Teil: setActive
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function setActive(mode){
      chartMode = mode;
      btns.forEach(b=> b.classList.toggle('active', b.dataset.range===mode));

      // Any explicit mode switch is a manual action -> stop auto live.
      try { __stopAuto(); } catch(_e){}

      // Reset zoom stack when switching modes (zoom is only for day view).
      zoomStack = [];
      zoomSel = null;
      zoomDragging = false;
      try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}

      // always show whole-day ranges derived from the selected date
      applyRangeForMode(mode);
      load();
    }
    btns.forEach(b=> b.addEventListener('click', ()=> setActive(b.dataset.range)));
    // keep initial "Tag" active
  })();


  // === click-to-inspect tooltip (inside main scope) ===
  (function(){
    let tip = document.createElement('div');
    tip.className = 'nx-tip';
    tip.style.position = 'fixed';
    tip.style.pointerEvents = 'none';
    tip.style.background = 'rgba(20,24,28,.95)';
    tip.style.border = '1px solid #2a323b';
    tip.style.borderRadius = '10px';
    tip.style.padding = '8px 10px';
    tip.style.fontSize = '12px';
    tip.style.color = '#c8d1d9';
    tip.style.boxShadow = '0 8px 22px rgba(0,0,0,.35)';
    tip.style.display = 'none';
    tip.style.zIndex = '10000';
    tip.style.maxWidth = 'min(320px, calc(100vw - 20px))';
    tip.style.width = 'max-content';
    tip.style.boxSizing = 'border-box';
    tip.dataset.historyTip = 'main';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    tip.innerHTML = '';
    document.body.appendChild(tip);

    let crossX = null;
    /**
     * Code-Teil: hideTip
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function hideTip(silent){
      const wasVisible = tip.style.display !== 'none';
      tip.style.display = 'none';
      tip.style.visibility = 'hidden';
      crossX = null;
      if (!silent && wasVisible) draw();
    }
    window.__nxHistoryHideTip = hideTip;
    /**
     * Code-Teil: xToTs
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function xToTs(x, start, end, L, R, W){
      const frac = (x - L) / (W - L - R);
      return start + Math.max(0, Math.min(1, frac)) * (end - start);
    }
    /**
     * Code-Teil: tsToX
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function tsToX(ts, start, end, L, R, W){
      const frac = (ts - start) / (end - start);
      return L + frac * (W - L - R);
    }
    /**
     * Code-Teil: showTipFromEvent
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function showTipFromEvent(ev){
      if (!data) return;
      const point = canvasPointFromEvent(canvas, ev);
      if (!point) return;
      const { clientX: cx, clientY: cy, x, y } = point;

      const {start, end} = data;
      const series = buildSeriesAll();
      const W = canvas.width, H = canvas.height;
      // Use the same margins as the renderer so click-to-inspect aligns with the chart.
      let L = 50, R = 40, T = 10, B = 42;
      if (chartMode === 'day') {
        const m = getChartMargins();
        L = m.L; R = m.R; T = m.T; B = m.B;
      } else if (typeof barState === 'object' && barState) {
        L = Number.isFinite(Number(barState.L)) ? Number(barState.L) : L;
        R = Number.isFinite(Number(barState.R)) ? Number(barState.R) : R;
        T = Number.isFinite(Number(barState.T)) ? Number(barState.T) : T;
        B = Number.isFinite(Number(barState.B)) ? Number(barState.B) : B;
      }

      // Nur der echte Plotbereich liefert einen Messpunkt. Ein Tap auf Achsen,
      // Beschriftungen oder leere Ränder schließt den Tooltip nachvollziehbar.
      if (x < L || x > (W - R) || y < T || y > (H - B)) {
        hideTip();
        return;
      }

      // --- BAR TOOLTIP (week/month/year) ---
      if (chartMode !== 'day' && typeof barState === 'object' && barState){
        const visibleKeys = Array.isArray(barState.visibleKeys) ? barState.visibleKeys : ['pv','chg','dchg','sell','buy','evcs','load'].filter(isSeriesVisible);
        if (!visibleKeys.length) { hideTip(true); draw(); return; }
        const buckets = barState.buckets || [];
        if (!buckets.length) { hideTip(true); draw(); return; }
        const n = buckets.length;
        const groupW = barState.groupW || ( (W-L-R)/n );
        let idx = Math.floor((x - L) / groupW);
        if (idx < 0) idx = 0;
        if (idx > n-1) idx = n-1;

        const d = new Date(buckets[idx].start);
        let header = (chartMode==='year') ? d.toLocaleDateString([], {month:'long'}) : d.toLocaleDateString([], {day:'2-digit', month:'2-digit'});
        /**
         * Code-Teil: kv
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        function kv(label, val, unit='kWh'){ 
          const v = Number(val||0).toFixed(2);
          return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${label}</span><b>${v} ${unit}</b></div>`; 
        }
        const agg = barState.seriesAgg || {};
        const pv   = agg.pv?.[idx]?.kwh ?? 0;
        const chg  = agg.chg?.[idx]?.kwh ?? 0;
        const dchg = agg.dchg?.[idx]?.kwh ?? 0;
        const buy  = agg.buy?.[idx]?.kwh ?? 0;
        const sell = agg.sell?.[idx]?.kwh ?? 0;
        const load = agg.load?.[idx]?.kwh ?? 0;
        const evcs = agg.evcs?.[idx]?.kwh ?? 0;

        const rows = [];
        if (isSeriesVisible('pv')) rows.push(kv('Erzeugung', pv));
        if (isSeriesVisible('chg')) rows.push(kv('Beladung', chg));
        if (isSeriesVisible('dchg')) rows.push(kv('Entladung', dchg));
        if (isSeriesVisible('buy')) rows.push(kv('Bezug', buy));
        if (isSeriesVisible('sell')) rows.push(kv('Einspeisung', sell));
        if (isSeriesVisible('evcs')) rows.push(kv('E‑Mobilität', evcs));
        if (isSeriesVisible('load')) rows.push(kv('Verbrauch', load));
        if (!rows.length) { hideTip(true); draw(); return; }
        const html = `<div style="margin-bottom:6px;opacity:.9"><b>Energie</b> · ${header}</div>` + rows.join('');
        const px = L + idx*groupW + groupW/2;
        showFloatingTip(tip, html, cx, cy);
        crossX = px;
        draw();
        return;
      }

      // --- LINE TOOLTIP (day) ---
      let nearTs = null, minDist = 1e15;
      const collect = {};
      const targetTs = xToTs(x, start, end, L, R, W);
      for (const [key, s] of Object.entries(series)){
        if (!s.values || !s.values.length) continue;
        let lo=0, hi=s.values.length-1;
        while (lo<hi){
          const mid = Math.floor((lo+hi)/2);
          if (s.values[mid][0] < targetTs) lo = mid+1; else hi = mid;
        }
        const candIdx = Math.max(0, Math.min(s.values.length-1, lo));
        const cand = s.values[candIdx];
        const prev = s.values[Math.max(0, candIdx-1)];
        const best = (Math.abs(prev[0]-targetTs) < Math.abs(cand[0]-targetTs)) ? prev : cand;
        collect[key] = best;
        const d = Math.abs(best[0]-targetTs);
        if (d < minDist){ minDist = d; nearTs = best[0]; }
      }

      if (nearTs==null) return;

      const dt = new Date(nearTs);
      const hh = dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      /**
       * Code-Teil: kv2
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      function kv2(label, val, unit='kW'){ 
        const v = Number(val||0).toFixed(2);
        return `<div style="display:flex;justify-content:space-between;gap:8px"><span>${label}</span><b>${v} ${unit}</b></div>`; 
      }
      const pv = collect.pv?.[1] ?? 0;
      const chg = collect.chg?.[1] ?? 0;
      const dchg = collect.dchg?.[1] ?? 0;
      const buy = collect.buy?.[1] ?? 0;
      const sell = collect.sell?.[1] ?? 0;
      const load = collect.load?.[1] ?? 0;
      const evcs = collect.evcs?.[1] ?? 0;
      const soc = collect.soc?.[1] ?? null;

      const rows = [];
      if (isSeriesVisible('pv')) rows.push(kv2('Erzeugung', pv/1000));
      if (isSeriesVisible('chg')) rows.push(kv2('Beladung', -(Math.abs(chg)||0)/1000));
      if (isSeriesVisible('dchg')) rows.push(kv2('Entladung', (Math.abs(dchg)||0)/1000));
      if (isSeriesVisible('buy')) rows.push(kv2('Bezug', buy/1000));
      if (isSeriesVisible('sell')) rows.push(kv2('Einspeisung', sell/1000));
      if (isSeriesVisible('evcs')) rows.push(kv2('E‑Mobilität', (Math.abs(evcs)||0)/1000));
      if (isSeriesVisible('load')) rows.push(kv2('Verbrauch', load/1000));
      let html = `<div style="margin-bottom:6px;opacity:.9"><b>Leistung</b> · ${hh}</div>` + rows.join('');

      // Optional: Energiefluss Verbraucher/Erzeuger (nur anzeigen wenn vorhanden)
      const ex = getExtras();
      const extraLines = [];
      (Array.isArray(ex.producers) ? ex.producers : []).forEach(p=>{
        const idx = Number(p && p.idx) || 0;
        if (!idx) return;
        const key = 'p' + idx;
        if (!isSeriesVisible(key)) return;
        const raw = collect[key]?.[1];
        if (raw==null) return;
        const kw = (Math.abs(raw)||0) / 1000;
        if (kw < 0.001) return;
        extraLines.push({ label: (p && p.name) ? String(p.name) : `Erzeuger ${idx}`, kw });
      });
      (Array.isArray(ex.consumers) ? ex.consumers : []).forEach(c=>{
        const idx = Number(c && c.idx) || 0;
        if (!idx) return;
        const key = 'c' + idx;
        if (!isSeriesVisible(key)) return;
        const raw = collect[key]?.[1];
        if (raw==null) return;
        const kw = (Math.abs(raw)||0) / 1000;
        if (kw < 0.001) return;
        extraLines.push({ label: (c && c.name) ? String(c.name) : `Verbraucher ${idx}`, kw });
      });
      if (extraLines.length){
        html += `<div style="margin-top:6px;border-top:1px dashed #2a323b;padding-top:6px;opacity:.9">Energiefluss</div>`;
        extraLines.forEach(it=>{ html += kv2(it.label, it.kw); });
      }
      if (soc!=null && isSeriesVisible('soc')) html += `<div style="margin-top:6px;border-top:1px dashed #2a323b;padding-top:6px">SoC <b>${soc.toFixed(0)} %</b></div>`;
      if (!rows.length && !extraLines.length && !(soc!=null && isSeriesVisible('soc'))) { hideTip(true); draw(); return; }

      const px = tsToX(nearTs, start, end, L, R, W);
      showFloatingTip(tip, html, cx, cy);
      crossX = px;
      draw(); // redraw to show crosshair
    }



    // Zentraler Einstieg für Desktop-Klick, Touch-Tap und den RC92-Browsertest.
    // Die fachliche Werteermittlung bleibt dadurch für alle Eingabegeräte identisch.
    window.__nxHistoryShowTipFromEvent = showTipFromEvent;
    window.__nxHistoryShowTipAtPoint = (clientX, clientY)=> showTipFromEvent({ clientX, clientY });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('pointerdown', (ev)=>{
      if (tip.style.display === 'none') return;
      const target = ev.target;
      if (target === canvas || tip.contains(target)) return;
      hideTip();
    }, true);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('keydown', (ev)=>{
      if (ev.key === 'Escape') hideTip();
    });

    // Synthetische mouseleave-Ereignisse nach einem Touch-Tap dürfen den mobilen
    // Tooltip nicht direkt wieder schließen. Auf Desktop bleibt das Verhalten gleich.
    canvas.addEventListener('mouseleave', ()=>{
      if (!isMobileHistorySurface()) hideTip();
    });
    window.addEventListener('scroll', ()=>{
      if (tip.style.display !== 'none') hideTip();
    }, { passive: true });
    canvas.addEventListener('click', (ev)=>{
      if (Date.now() < zoomSuppressClickUntil) return;
      showTipFromEvent(ev);
    });
    // Touch-Taps aller Chart-Modi werden ausschließlich im Gesten-Handler
    // verarbeitet. Dadurch öffnet eine Scrollbewegung kein falsches Wertefenster.

    // draw crosshair over chart
    const _draw = draw;
    draw = function(){
      _draw();
      if (!data) return;

      // Zoom selection overlay (day chart only)
      if (chartMode === 'day' && zoomSel && Number.isFinite(zoomSel.x0) && Number.isFinite(zoomSel.x1)){
        const { L, R, T, B } = getChartMargins();
        const W = canvas.width;
        const H = canvas.height;
        const x0 = Math.max(L, Math.min(W - R, zoomSel.x0));
        const x1 = Math.max(L, Math.min(W - R, zoomSel.x1));
        const a = Math.min(x0, x1);
        const b = Math.max(x0, x1);
        if (b - a >= 2){
          ctx.save();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 1;
          ctx.fillRect(a, T, b - a, (H - B - T));
          ctx.strokeRect(a + 0.5, T + 0.5, (b - a) - 1, (H - B - T) - 1);
          ctx.restore();
        }
      }

      if (crossX==null) return;
      const W=canvas.width, H=canvas.height;
      ctx.save();
      ctx.strokeStyle = 'rgba(200,200,200,.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crossX, 0);
      ctx.lineTo(crossX, H-42);
      ctx.stroke();
      ctx.restore();
    };
  })();

  // --- History navigation (◀/▶) + zoom reset button ---
  (function(){
    const prevBtn = document.getElementById('navPrev');
    const nextBtn = document.getElementById('navNext');
    const resetBtn = document.getElementById('resetZoomBtn');
    /**
     * Code-Teil: showReset
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function showReset(){
      if (!resetBtn) return;
      resetBtn.classList.toggle('hidden', zoomStack.length === 0);
    }
    showReset();
    /**
     * Code-Teil: addMonths
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function addMonths(date, delta){
      const d = new Date(date);
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
      const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, maxDay));
      return d;
    }
    /**
     * Code-Teil: shiftRange
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function shiftRange(dir){
      // Navigation is based on the selected anchor date (no time tweaking in the UI).
      let anchor = getAnchorDate();
      if (!anchor || !isFinite(anchor.getTime())) anchor = new Date();
      let next = new Date(anchor);

      if (chartMode === 'day') {
        next.setDate(next.getDate() + dir);
      } else if (chartMode === 'week') {
        next.setDate(next.getDate() + (dir * 7));
      } else if (chartMode === 'month') {
        next = addMonths(next, dir);
      } else if (chartMode === 'year') {
        next.setFullYear(next.getFullYear() + dir);
      }

      // Prevent moving into the future (anchor date > today).
      const today = new Date(); today.setHours(0,0,0,0);
      if (next.getTime() > today.getTime()) next = today;

      setAnchorDate(next);
      applyRangeForMode(chartMode);

      // stop auto-live mode on manual navigation
      try { __stopAuto(); } catch(_e){}
      load();
    }

    if (prevBtn) prevBtn.addEventListener('click', ()=> shiftRange(-1));
    if (nextBtn) nextBtn.addEventListener('click', ()=> shiftRange(+1));
    if (resetBtn) resetBtn.addEventListener('click', ()=>{
      if (!zoomStack.length) return;
      const last = zoomStack.pop();
      showReset();
      if (!last) return;
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      if (!fromEl || !toEl) return;
      fromEl.value = toLocal(new Date(last.fromMs));
      toEl.value = toLocal(new Date(last.toMs));
      try { __stopAuto(); } catch(_e){}
      load();
    });

    // expose helper for other parts (mode switch)
    window.__nxHistoryShowZoomReset = showReset;
  })();

  // --- Drag-to-zoom (day chart) ---
  (function(){
    /**
     * Code-Teil: xToTs
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function xToTs(x, start, end){
      const { L, R } = getChartMargins();
      const W = canvas.width;
      const frac = (x - L) / (W - L - R);
      return start + Math.max(0, Math.min(1, frac)) * (end - start);
    }
    /**
     * Code-Teil: setInputs
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function setInputs(fromMs, toMs){
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      if (!fromEl || !toEl) return;
      fromEl.value = toLocal(new Date(fromMs));
      toEl.value = toLocal(new Date(toMs));
    }
    /**
     * Code-Teil: clearSel
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function clearSel(redraw = true){
      zoomSel = null;
      zoomDragging = false;
      if (redraw) draw();
    }

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an canvas. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    canvas.addEventListener('mousedown', (ev)=>{
      if (chartMode !== 'day') return;
      if (!data) return;
      if (ev.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      zoomDragging = true;
      zoomDragStartX = x;
      zoomSel = { x0: x, x1: x };
      draw();
    });


    // RC92 – Mobile Gestensteuerung:
    // - vertikal: natives Seitenscrollen,
    // - kurzer Tap: Werte des ausgewählten Zeitpunkts/Zeitraums anzeigen,
    // - klar horizontal in der Tagesansicht: vorhandenen Chart-Zoom verwenden.
    // Erst nach erkannter horizontaler Zoomgeste wird preventDefault() aufgerufen.
    let historyTouchGesture = null;
    let historyTouchDrawFrame = 0;
    const TOUCH_DIRECTION_LOCK_PX = 10;
    const TOUCH_TAP_MAX_MOVE_PX = 12;
    const TOUCH_ZOOM_MIN_PX = 18;
    const TOUCH_TAP_MAX_DURATION_MS = 900;

    function scheduleHistoryTouchDraw(){
      if (historyTouchDrawFrame) return;
      const run = ()=>{ historyTouchDrawFrame = 0; draw(); };
      if (typeof window.requestAnimationFrame === 'function') {
        historyTouchDrawFrame = window.requestAnimationFrame(run);
      } else {
        historyTouchDrawFrame = window.setTimeout(run, 16);
      }
    }

    canvas.addEventListener('touchstart', (ev)=>{
      if (!data || !ev.touches || ev.touches.length !== 1) {
        historyTouchGesture = null;
        return;
      }
      const point = canvasPointFromEvent(canvas, ev);
      if (!point) { historyTouchGesture = null; return; }
      historyTouchGesture = {
        mode: 'pending',
        startedAt: Date.now(),
        startX: point.x,
        startY: point.y,
        startClientX: point.clientX,
        startClientY: point.clientY,
        lastX: point.x,
        lastY: point.y,
      };
      zoomDragging = false;
      zoomSel = null;
      // Kein preventDefault(): Ein vertikaler Wisch muss sofort nativ scrollen können.
    }, { passive: true });

    canvas.addEventListener('touchmove', (ev)=>{
      if (!historyTouchGesture || !ev.touches || ev.touches.length !== 1) return;
      const point = canvasPointFromEvent(canvas, ev);
      if (!point) return;
      const gesture = historyTouchGesture;
      gesture.lastX = point.x;
      gesture.lastY = point.y;
      const dx = point.clientX - gesture.startClientX;
      const dy = point.clientY - gesture.startClientY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (gesture.mode === 'pending' && Math.max(absX, absY) >= TOUCH_DIRECTION_LOCK_PX) {
        if (chartMode === 'day' && absX > absY * 1.2) {
          gesture.mode = 'zoom';
          zoomDragging = true;
          zoomDragStartX = gesture.startX;
          zoomSel = { x0: gesture.startX, x1: point.x };
          try { if (typeof window.__nxHistoryHideTip === 'function') window.__nxHistoryHideTip(); } catch(_e){}
        } else {
          // Vertikale Bewegungen und alle Wischbewegungen in Woche/Monat/Jahr
          // gehören dem Browser. Dort gibt es bewusst keinen Drag-Zoom.
          gesture.mode = 'scroll';
          zoomDragging = false;
          zoomSel = null;
          return;
        }
      }

      if (gesture.mode !== 'zoom') return;
      if (ev.cancelable) ev.preventDefault();
      if (!zoomSel) zoomSel = { x0: gesture.startX, x1: point.x };
      zoomSel.x1 = point.x;
      scheduleHistoryTouchDraw();
    }, { passive: false });

    canvas.addEventListener('touchend', (ev)=>{
      const gesture = historyTouchGesture;
      historyTouchGesture = null;
      if (!gesture || !data) return;
      const point = canvasPointFromEvent(canvas, ev);
      if (point) {
        gesture.lastX = point.x;
        gesture.lastY = point.y;
      }
      const endClient = eventClientPoint(ev);
      const dxClient = endClient ? endClient.clientX - gesture.startClientX : 0;
      const dyClient = endClient ? endClient.clientY - gesture.startClientY : 0;
      const movement = Math.hypot(dxClient, dyClient);
      const durationMs = Date.now() - gesture.startedAt;

      // Einige Browser bündeln eine kurze Bewegung und senden kein touchmove.
      // Deshalb wird die Richtung beim Ende nochmals belastbar klassifiziert.
      if (gesture.mode === 'pending' && movement > TOUCH_TAP_MAX_MOVE_PX) {
        gesture.mode = (chartMode === 'day' && Math.abs(dxClient) > Math.abs(dyClient) * 1.2)
          ? 'zoom'
          : 'scroll';
      }

      if (gesture.mode === 'scroll') {
        clearSel(false);
        return;
      }

      const a = Math.min(gesture.startX, gesture.lastX);
      const b = Math.max(gesture.startX, gesture.lastX);
      const selectedWidth = b - a;
      const isTap = gesture.mode === 'pending'
        && movement <= TOUCH_TAP_MAX_MOVE_PX
        && durationMs <= TOUCH_TAP_MAX_DURATION_MS;

      if (isTap) {
        clearSel(false);
        zoomSuppressClickUntil = Date.now() + 600;
        try {
          if (typeof window.__nxHistoryShowTipFromEvent === 'function') {
            window.__nxHistoryShowTipFromEvent(ev);
          }
        } catch(_e){}
        return;
      }

      if (gesture.mode !== 'zoom' || chartMode !== 'day' || selectedWidth < TOUCH_ZOOM_MIN_PX) {
        clearSel(false);
        return;
      }

      if (ev.cancelable) ev.preventDefault();
      const { start, end } = data;
      const fromMs = xToTs(a, start, end);
      const toMs = xToTs(b, start, end);

      // Vorherigen Bereich für „Zoom zurück“ sichern.
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      const prevFromMs = fromEl ? new Date(fromEl.value).getTime() : start;
      const prevToMs = toEl ? new Date(toEl.value).getTime() : end;
      if (isFinite(prevFromMs) && isFinite(prevToMs)) {
        zoomStack.push({ fromMs: prevFromMs, toMs: prevToMs });
      }

      try { __stopAuto(); } catch(_e){}
      setInputs(fromMs, toMs);
      zoomSuppressClickUntil = Date.now() + 600;
      clearSel();
      try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}
      load();
    }, { passive: false });

    canvas.addEventListener('touchcancel', ()=>{
      const hadZoom = Boolean(historyTouchGesture && historyTouchGesture.mode === 'zoom');
      historyTouchGesture = null;
      if (hadZoom || zoomDragging) clearSel();
      else clearSel(false);
    }, { passive: true });

    // Optional: Ctrl/⌘ + Wheel zoom (Tag) – allows trackpad pinch (ctrlKey) without breaking normal page scroll.
    let __wheelTimer = null;
    let __wheelLast = 0;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'wheel' an canvas. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    canvas.addEventListener('wheel', (ev)=>{
      if (chartMode !== 'day') return;
      if (!data) return;
      if (!(ev.ctrlKey || ev.metaKey)) return;
      try { ev.preventDefault(); } catch(_e){}

      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      let start = fromEl ? new Date(fromEl.value).getTime() : data.start;
      let end   = toEl ? new Date(toEl.value).getTime() : data.end;
      if (!isFinite(start) || !isFinite(end) || end <= start) return;

      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const ts = xToTs(x, start, end);
      const r = (ts - start) / (end - start);

      const factor = (ev.deltaY < 0) ? 0.85 : 1.18;
      let newRange = (end - start) * factor;
      const minRange = 10 * 60 * 1000; // 10min
      const maxRange = 7 * 24 * 60 * 60 * 1000; // 7d (still ok in day mode)
      if (newRange < minRange) newRange = minRange;
      if (newRange > maxRange) newRange = maxRange;

      const now = Date.now();
      if (now - __wheelLast > 800){
        zoomStack.push({ fromMs: start, toMs: end });
        try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}
      }
      __wheelLast = now;

      let fromMs = ts - r * newRange;
      let toMs = fromMs + newRange;
      try { __stopAuto(); } catch(_e){}
      setInputs(fromMs, toMs);
      zoomSuppressClickUntil = Date.now() + 250;

      if (__wheelTimer) clearTimeout(__wheelTimer);
      __wheelTimer = setTimeout(()=>{ load(); }, 200);
    }, {passive:false});

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousemove' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    window.addEventListener('mousemove', (ev)=>{
      if (!zoomDragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      if (!zoomSel) zoomSel = { x0: zoomDragStartX, x1: x };
      zoomSel.x1 = x;
      draw();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseup' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    window.addEventListener('mouseup', (ev)=>{
      if (!zoomDragging) return;
      if (!data){ clearSel(); return; }
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const a = Math.min(zoomDragStartX, x);
      const b = Math.max(zoomDragStartX, x);
      const px = b - a;

      // selection too small -> treat as click, no zoom
      if (px < 18){
        clearSel();
        return;
      }

      const { start, end } = data;
      const fromMs = xToTs(a, start, end);
      const toMs = xToTs(b, start, end);

      // push previous range for reset
      const fromEl = document.getElementById('from');
      const toEl = document.getElementById('to');
      const prevFromMs = fromEl ? new Date(fromEl.value).getTime() : start;
      const prevToMs = toEl ? new Date(toEl.value).getTime() : end;
      if (isFinite(prevFromMs) && isFinite(prevToMs)){
        zoomStack.push({ fromMs: prevFromMs, toMs: prevToMs });
      }

      // stop auto-live on zoom
      try { __stopAuto(); } catch(_e){}

      setInputs(fromMs, toMs);
      zoomSuppressClickUntil = Date.now() + 400;
      clearSel();

      // show reset button
      try { if (typeof window.__nxHistoryShowZoomReset === 'function') window.__nxHistoryShowZoomReset(); } catch(_e){}
      load();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'dblclick' an canvas. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    canvas.addEventListener('dblclick', ()=>{
      if (!zoomStack.length) return;
      const resetBtn = document.getElementById('resetZoomBtn');
      if (resetBtn && !resetBtn.classList.contains('hidden')) resetBtn.click();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseleave' an canvas. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    canvas.addEventListener('mouseleave', ()=>{ if (zoomDragging) clearSel(); });
  })();
  bootHistoryOnce();
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'load' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('load', ()=>{ scheduleHistoryRenderBurst(); if (!data) load(); }, { once: true });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pageshow' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('pageshow', ()=>{ scheduleHistoryRenderBurst(); if (!data) load(); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'visibilitychange' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('visibilitychange', ()=>{
    if (document.hidden) return;
    scheduleHistoryRenderBurst();
    if (!data) load();
  });
  // --- Auto-advance when 'Bis'≈Jetzt (no UI) ---
  let __autoTimer = null;
  let __autoLive = false;
  /**
   * Code-Teil: __toLocal
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function __toLocal(dt){ const z=dt.getTimezoneOffset(); const d=new Date(dt.getTime()-z*60000); return d.toISOString().slice(0,16); }
  /**
   * Code-Teil: __setToNow
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function __setToNow(){ const toEl = document.getElementById('to'); if (toEl) toEl.value = __toLocal(new Date()); }
  /**
   * Code-Teil: __startAuto
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function __startAuto(){ __stopAuto(); __autoLive=true; __setToNow(); __autoTimer=setInterval(()=>{ if(__autoLive){ __setToNow(); load(); } }, 15000); }
  /**
   * Code-Teil: __stopAuto
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function __stopAuto(){ __autoLive=false; if(__autoTimer){ clearInterval(__autoTimer); __autoTimer=null; } }
  (function(){
    const toEl=document.getElementById('to'); const fromEl=document.getElementById('from'); const btn=document.getElementById('loadBtn');
    /**
     * Code-Teil: isNearNow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function isNearNow(){ try{ const t=new Date(toEl.value).getTime(); return isFinite(t) && Math.abs(Date.now()-t)<5*60*1000; }catch(_){ return true; } }
    if (isNearNow()) __startAuto();
    ['input','change'].forEach(ev=>{ toEl.addEventListener(ev,__stopAuto); fromEl.addEventListener(ev,__stopAuto); });
    if (btn) btn.addEventListener('click', ()=> setTimeout(()=>{ if(isNearNow()) __startAuto(); else __stopAuto(); }, 0));
  })();
})();

  // --- live dot via SSE (like LIVE) ---
  (function(){
    const dot = document.getElementById('liveDot');
    if (!dot) return;
    /**
     * Code-Teil: connect
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function connect(){
      try{
        const es = new EventSource('/events');
        dot.classList.remove('live');
        es.onopen = ()=>{ dot.classList.add('live'); };
        es.onerror = ()=>{ dot.classList.remove('live'); try{ es.close(); }catch(_){ }; setTimeout(connect, 5000); };
        es.onmessage = ()=>{};
      }catch(e){ dot.classList.remove('live'); setTimeout(connect, 5000); }
    }
    connect();
  })();

  // --- header interactions (same as index) ---
  (function(){
    const menuBtn = document.getElementById('menuBtn');
    const menu = document.getElementById('menuDropdown');
    if (menuBtn && menu) {
      if (menuBtn.dataset.nwMenuBound) return;
      // 0.8.21: History-Seite markiert das Burger-Menü als gebunden, damit die
      // nachgeladene Shell keinen zweiten Toggle-Handler setzt.
      menuBtn.dataset.nwMenuBound = 'history';
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
      const close = ()=> menu.classList.add('hidden');
      /**
       * Code-Teil: toggle
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von History/Reports: Charts, Zeiträume, Exporte; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const toggle = ()=> menu.classList.toggle('hidden');
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menuBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      menuBtn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); toggle(); });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menu. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      menu.addEventListener('click', (e)=> e.stopPropagation());
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      document.addEventListener('click', (e)=>{ const target = e && e.target; if (!menuBtn.contains(target) && !menu.contains(target)) close(); });
    }
    const liveBtn = document.getElementById('liveTabBtn');
    if (liveBtn) liveBtn.addEventListener('click', (e)=>{ /* fallback */ if(!liveBtn.getAttribute('onclick')) { e.preventDefault(); window.location.href = './'; } });
    const histBtn = document.getElementById('historyTabBtn');
    if (histBtn) histBtn.addEventListener('click', (e)=>{ /* already here */ });
    // Installateur-/Admin-Zugriff wird im Endkunden-Dashboard nicht angeboten.
  })();


  
  // menu: open settings by redirecting to live with query
  (function(){
    const settingsBtn = document.getElementById('menuOpenSettings');
    if (settingsBtn) settingsBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      window.location.href = '/?settings=1';
    });
  })();


// EVCS menu visibility
(function(){
  fetch('/config', { cache: 'no-store' }).then(r=>r.json()).then(cfg=>{
    const sc = (cfg && cfg.settingsConfig) || {};
    const evcsAvailable = ((Number(sc.evcsConfiguredCount || 0) || (Array.isArray(sc.evcsList) ? sc.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
    const c = evcsAvailable ? Math.max(0, Math.round(Number(sc.evcsCount) || 0)) : 0;
    const showEvcs = evcsAvailable && c >= 2;
    const showEvcsHistory = evcsAvailable && c >= 1;
    const l = document.getElementById('menuEvcsLink');
    if (l) l.classList.toggle('hidden', !showEvcs);
    const t = document.getElementById('tabEvcs');
    if (t) t.classList.toggle('hidden', !showEvcs);
    const n = document.getElementById('nav-evcs');
    if (n) n.classList.toggle('hidden', !showEvcs);
    document.querySelectorAll('[data-feature="evcs"]').forEach(function(el){
      el.classList.toggle('hidden', !showEvcsHistory);
    });
    const sh = !!(cfg.featureVisibility && cfg.featureVisibility.hasSmartHome === true);
    const sl = document.getElementById('menuSmartHomeLink');
    if (sl) sl.classList.toggle('hidden', !sh);
    const st = document.getElementById('tabSmartHome');
    if (st) st.classList.toggle('hidden', !sh);

    // Speicherfarm Tab/Link nur anzeigen, wenn eine Farm wirklich konfiguriert ist.
    const sf = !!(cfg.featureVisibility && cfg.featureVisibility.hasStorageFarm === true);
    const sft = document.getElementById('tabStorageFarm');
    if (sft) sft.classList.toggle('hidden', !sf);
    const sfl = document.getElementById('menuStorageFarmLink');
    if (sfl) sfl.classList.toggle('hidden', !sf);
}).catch(()=>{});
})();
