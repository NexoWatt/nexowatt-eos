/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/app.ts
 * Quell-Hash: sha256:33c252819b17639b93a88d80aeba391074579fee7613e2819d5e0f668633dfc3
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/app.js.
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
 * Aufgabe: Verbindet das Kunden-Dashboard mit Livewerten, Energieflussanzeige, Bedienaktionen und Kundeneinstellungen.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/app.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/app.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/app.js`.
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
 * Datenvertrag: LiveDashboardState
 * Zweck: Beschreibt die Werte, die www/app.js aus /api/state für das LIVE-Dashboard erwartet.
 * Zusammenhang: Diese Struktur wird durch main.js und EMS-Module gefüllt und im DOM von index.html angezeigt.
 * TypeScript-Ziel:
 * interface LiveDashboardState { productionTotal?: number; gridBuyPower?: number; gridSellPower?: number; storageSoc?: number; storageChargePower?: number; storageDischargePower?: number; }
 */

/**
 * Vertragsstelle: Feature-Sichtbarkeit im Kundenfrontend
 * Zweck: EVCS, Speicherfarm und SmartHome dürfen nur angezeigt werden, wenn /config echte aktivierte Hardware/Funktionen meldet.
 * Zusammenhang: Verhindert falsche Tabs/Kacheln bei Anlagen ohne Wallbox oder Speicherfarm.
 * TypeScript-Ziel: FeatureVisibility-Interface aus docs/CODE_CONTRACTS_DE.md übernehmen.
 */

/**
 * Vertragsstelle: Energiefluss-Anzeige
 * Zweck: Frontend darf Speicher-/Netz-/PV-Werte nur so darstellen, wie Backend/EMS sie normalisiert haben.
 * Wichtig: Keine eigenständige aggressive Ersatzrechnung einbauen, sonst laufen LIVE und History auseinander.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/app.js
 * Rolle im Projekt: LIVE-Frontend.
 * Zweck: Rendert Dashboard, Energiefluss, Schnellsteuerungen, KI-Berater und Kundeneinstellungen aus /api/state.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Hauptlogik des Kunden-Frontends: LIVE-Dashboard, Energiefluss, Einstellungen, SSE-Liveupdates, Feature-Sichtbarkeit und Schnellsteuerungen.
 * Zusammenhänge:
 * - Liest States über /api/state und Live-Events über /events aus main.js.
 * - Verwendet Config aus /config, um EVCS, Speicherfarm, SmartHome und optionale Flussknoten ein- oder auszublenden.
 * - Schreibt Einstellungen/Kommandos über /api/set und spezielle API-Endpunkte zurück.
 * Wartungshinweise:
 * - Die Energieflusswerte müssen mit den Backend-Resolvern in main.js/ems/modules konsistent bleiben.
 * - DP-Fallbacks nur sehr vorsichtig ändern, weil sonst Live-Anzeige und Historie auseinanderlaufen.
 */

/**
 * Code-Teil: nxLiveDashboardTsFormat
 *
 * Zweck:
 * Lädt produktiv den TypeScript-Spiegel für die reine Anzeigeformatierung des
 * LIVE-Dashboards.
 *
 * Zusammenhang:
 * Die alte `formatPower`-/`formatEnergyKwh`-Logik bleibt als Fallback im selben File.
 * Sobald der MJS-Spiegel geladen ist, werden Leistungs-/Energiefluss-/Energiewerte über
 * `src-ts/frontend/live-dashboard-format.ts` formatiert.
 *
 * Sicherheitsregel:
 * Wenn der Browser den MJS-Spiegel nicht laden kann, bleibt die alte JS-Formatierung
 * unverändert aktiv. Keine EMS-Werte und keine States werden dadurch geändert.
 */
const nwUiLocaleTag = () => { const lang = String((window.NexoWattI18n && window.NexoWattI18n.localeTag && window.NexoWattI18n.localeTag()) || (window.__nwLocale && (window.__nwLocale.localeTag || window.__nwLocale.htmlLang || window.__nwLocale.language)) || document.documentElement.lang || 'de').toLowerCase(); return lang.startsWith('nl') ? 'nl-NL' : (lang.startsWith('en') ? 'en-GB' : 'de-DE'); }; let nxLiveDashboardTsFormat = null;
let nxLiveDashboardTsFormatLoadState = 'pending';
(function loadLiveDashboardTsFormat(){
  try {
    import('./static/ts-mirrors/frontend/live-dashboard-format.mjs')
      .then((mod) => {
        nxLiveDashboardTsFormat = mod || null;
        nxLiveDashboardTsFormatLoadState = nxLiveDashboardTsFormat ? 'ready' : 'missing';
        try { if (typeof scheduleRender === 'function') scheduleRender(true); } catch(_e) {}
      })
      .catch(() => { nxLiveDashboardTsFormatLoadState = 'fallback'; });
  } catch(_e) {
    nxLiveDashboardTsFormatLoadState = 'fallback';
  }
})();

/**
 * Code-Teil: nxTryTsDashboardFormat
 * Zweck: Ruft einen TS-Formatter auf und liefert bei Fehlern `null`, damit die alte
 * JS-Fallbacklogik unverändert weiterlaufen kann.
 */
function nxTryTsDashboardFormat(name, ...args){
  try {
    const mod = nxLiveDashboardTsFormat;
    const fn = mod && mod[name];
    if (typeof fn !== 'function') return null;
    const text = fn(...args);
    return (typeof text === 'string' && text.length) ? text : null;
  } catch(_e) { return null; }
}


/**
 * Code-Teil: nwNormalizeBrandHeader
 * Zweck: Entfernt den alten sichtbaren EMS-Zusatz aus der Topbar-Marke.
 * Zusammenhang: Die UI zeigt als Produktmarke oben nur noch „NexoWatt“. Fachliche
 * EMS-Bezeichnungen in Modulen, Statuskarten und App-Center bleiben unverändert.
 */
function nwNormalizeBrandHeader(){
  try {
    const topbarTitles = Array.prototype.slice.call(document.querySelectorAll('.topbar h1, header.topbar h1'));
    topbarTitles.forEach((el) => {
      const text = String(el && el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text === 'NexoWatt EMS' || text === 'NexoWatt') el.textContent = 'NexoWatt EOS';
    });
    const pwaTitles = Array.prototype.slice.call(document.querySelectorAll('meta[name="apple-mobile-web-app-title"]'));
    pwaTitles.forEach((el) => {
      if (el && ['NexoWatt EMS','NexoWatt'].includes(el.getAttribute('content'))) el.setAttribute('content', 'NexoWatt EOS');
    });
    if (typeof document.title === 'string' && /^NexoWatt(?: EMS)?\b/.test(document.title) && !/^NexoWatt EOS\b/.test(document.title)) {
      document.title = document.title.replace(/^NexoWatt(?: EMS)?\b/, 'NexoWatt EOS');
    }
  } catch(_e) {}
}


// --- Precise donut placement (anchor angles like a reference UI) ---
/**
 * Code-Teil: arcLenFromDeg
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function arcLenFromDeg(r, deg){ return 2 * Math.PI * r * (deg/360); }
/**
 * Code-Teil: setArcAtAngle
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setArcAtAngle(selector, r, angleDeg, arcDeg){
  const C = 2 * Math.PI * r;
  const Ldeg = Math.max(0, Math.min(359.9, arcDeg));
  const dash = arcLenFromDeg(r, Ldeg);
  const offset = arcLenFromDeg(r, angleDeg) - dash/2; // center arc
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + (C - dash).toFixed(1));
  el.setAttribute('stroke-dashoffset', offset.toFixed(1));
}
/**
 * Code-Teil: placeIconAtAngle
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function placeIconAtAngle(sel, angleDeg){
  const wrap = document.querySelector('.card.energy-donut .donut-wrap');
  const el = document.querySelector(sel);
  const svg = document.querySelector('.card.energy-donut .donut');
  if (!wrap || !el || !svg) return;
  const size = wrap.getBoundingClientRect().width;
  const R = size/2; 
  const nudge = Math.max(8, size/28);
  const a = (angleDeg - 90) * Math.PI / 180;
  const cx = size/2 + (R + nudge) * Math.cos(a);
  const cy = size/2 + (R + nudge) * Math.sin(a);
  el.style.left = cx + 'px';
  el.style.top  = cy + 'px';
  el.style.position='absolute';
  el.style.transform = 'translate(-50%, -50%)';
}

// Draw an arc inside a quadrant slot with small gaps between quadrants
/**
 * Code-Teil: setArcInSlot
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setArcInSlot(selector, r, slotIndex, slotFillPct){
  const C = 2 * Math.PI * r;
  const Q = C / 4;               // quarter length
  const gap = 4;                 // pixels gap in each slot
  const slotMax = Q - gap;       // usable track
  const fill = Math.max(0, Math.min(100, slotFillPct||0));
  const L = (fill/100) * slotMax;
  const start = slotIndex * Q + gap/2 + (slotMax - L)/2; // center arc in slot
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('stroke-dasharray', L.toFixed(1) + ' ' + (C-L).toFixed(1));
  el.setAttribute('stroke-dashoffset', start.toFixed(1));
}
/**
 * Code-Teil: setArc
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setArc(selector, r, valuePct){
  const max = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, valuePct||0));
  const dash = (v/100)*max, rest = max-dash;
  const el=document.querySelector(selector);
  if(!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1)+' '+rest.toFixed(1));
}
/**
 * Code-Teil: setDonut
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setDonut(cls, pct, inner=false) {
  const r = inner ? 34 : 42;
  const max = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct || 0));
  const dash = (v / 100) * max;
  const rest = max - dash;
  const q = '.donut .seg.' + cls;
  const el = document.querySelector(q);
  if (!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + rest.toFixed(1));
}

// Format hours to "h:mm"
/**
 * Code-Teil: formatHours
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatHours(h) {
  if (!h || !isFinite(h) || h <= 0) return '--';
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh + 'h ' + (mm<10?'0':'') + mm + 'm';
}

let state = {};
let units = { power: 'W', energy: 'kWh' };

// Energiefluss-Monitor: optionale Verbraucher/Erzeuger (Slots)
let flowSlotsCfg = null; // comes from /config
let flowExtras = { consumers: [], producers: [], special: [], meta: { evcsAvailable: false } };
let _flowResponsiveCfg = { consumers: 0, producers: 0, special: 0, evcsVisible: false };
let _flowResponsiveRaf = 0;
/**
 * Code-Teil: applyEnergyWebResponsiveLayout
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function applyEnergyWebResponsiveLayout(nextCfg) {
  if (nextCfg && typeof nextCfg === 'object') {
    _flowResponsiveCfg = Object.assign({}, _flowResponsiveCfg, nextCfg);
  }

  const wrap = document.querySelector('.card.energy-web .web-wrap');
  if (!wrap) return;

  const nCons = Math.max(0, Math.floor(_flowUiNum(_flowResponsiveCfg.consumers, 0)));
  const nProd = Math.max(0, Math.floor(_flowUiNum(_flowResponsiveCfg.producers, 0)));
  const nSpec = Math.max(0, Math.floor(_flowUiNum(_flowResponsiveCfg.special, 0)));
  const evcsVisible = _flowResponsiveCfg.evcsVisible !== false;
  const visibleSlots = nCons + nProd + nSpec + (evcsVisible ? 1 : 0);

  const viewportW = Math.max(
    _flowUiNum(window.innerWidth, 0),
    _flowUiNum(document.documentElement && document.documentElement.clientWidth, 0),
    _flowUiNum(wrap.clientWidth, 0)
  );
  const wrapW = Math.max(0, _flowUiNum(wrap.clientWidth, 0));

  let svgMaxW = null;
  if (viewportW >= 820) {
    const base = (viewportW >= 1500) ? 940 : (viewportW >= 1260) ? 900 : 840;
    const penalty = (visibleSlots * 22)
      + (Math.max(0, nCons - 4) * 8)
      + (Math.max(0, nProd - 2) * 10)
      + (Math.max(0, nSpec - 1) * 10);

    svgMaxW = Math.max(760, Math.round(base - penalty));
    wrap.style.setProperty('--flowSvgMaxW', `${svgMaxW}px`);
    wrap.style.setProperty('--flowStatusMaxW', `${Math.max(640, svgMaxW - 36)}px`);
  } else {
    wrap.style.removeProperty('--flowSvgMaxW');
    wrap.style.removeProperty('--flowStatusMaxW');
  }

  const fallbackW = wrapW || Math.min(Math.max(0, viewportW - 32), 900);
  const effectiveSvgW = Math.max(0, Math.min(svgMaxW || fallbackW || 760, wrapW || svgMaxW || fallbackW || 760));
  const estSvgH = Math.round(effectiveSvgW * (520 / 760));

  let minH = Math.max(360, estSvgH + 54);
  if (viewportW < 680) minH = Math.max(360, Math.min(460, estSvgH + 72));
  if (visibleSlots >= 6) minH += 16;
  if (visibleSlots >= 9) minH += 24;
  wrap.style.setProperty('--flowMinH', `${Math.round(minH)}px`);
}
/**
 * Code-Teil: scheduleEnergyWebResponsiveLayout
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function scheduleEnergyWebResponsiveLayout(nextCfg) {
  if (nextCfg && typeof nextCfg === 'object') {
    _flowResponsiveCfg = Object.assign({}, _flowResponsiveCfg, nextCfg);
  }

  try { if (_flowResponsiveRaf) cancelAnimationFrame(_flowResponsiveRaf); } catch (_e) {}
  _flowResponsiveRaf = requestAnimationFrame(() => {
    _flowResponsiveRaf = 0;
    applyEnergyWebResponsiveLayout();
  });
}

// Ereignis-Kommentar: Bindet das UI-Ereignis 'resize' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
window.addEventListener('resize', () => scheduleEnergyWebResponsiveLayout(), { passive: true });

// Energiefluss-Anzeige: leichte Hysterese nur für die VIS.
// Ziel: kleine Messwertsprünge und Richtungsflackern beruhigen,
// ohne die eigentliche Regelung oder Backend-Performance zu beeinflussen.
const FLOW_UI_STABILITY = Object.freeze({
  decimals: 1,
  zeroOnW: 120,
  zeroOffW: 60,
  deltaHoldW: 60,
  signSwitchW: 180,
});
const _flowUiStable = Object.create(null);
/**
 * Code-Teil: _flowUiNum
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _flowUiNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
/**
 * Code-Teil: stabilizeFlowSigned
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function stabilizeFlowSigned(key, rawW, opts) {
  const cfg = {
    zeroOnW: _flowUiNum(opts && opts.zeroOnW, FLOW_UI_STABILITY.zeroOnW),
    zeroOffW: _flowUiNum(opts && opts.zeroOffW, FLOW_UI_STABILITY.zeroOffW),
    deltaHoldW: _flowUiNum(opts && opts.deltaHoldW, FLOW_UI_STABILITY.deltaHoldW),
    signSwitchW: _flowUiNum(opts && opts.signSwitchW, FLOW_UI_STABILITY.signSwitchW),
  };

  const raw = _flowUiNum(rawW, 0);
  const prevValue = _flowUiNum(_flowUiStable[key] && _flowUiStable[key].value, 0);
  const prevAbs = Math.abs(prevValue);
  const rawAbs = Math.abs(raw);

  let next = raw;

  // Zero-Hysterese: kleine Werte nicht sofort ein-/ausblenden.
  if (prevAbs > cfg.zeroOffW) {
    if (rawAbs <= cfg.zeroOffW) next = 0;
  } else if (rawAbs < cfg.zeroOnW) {
    next = 0;
  }

  if (next !== 0 && prevValue !== 0) {
    const prevSign = Math.sign(prevValue);
    const nextSign = Math.sign(next);

    // Richtungswechsel erst zulassen, wenn der Gegenfluss wirklich klar ist.
    if (prevSign !== 0 && nextSign !== 0 && prevSign !== nextSign && Math.abs(next) < cfg.signSwitchW) {
      next = prevValue;
    }

    // Kleine Änderungen innerhalb des Deadbands halten wir bewusst fest.
    if (Math.sign(next) === Math.sign(prevValue) && Math.abs(next - prevValue) < cfg.deltaHoldW) {
      next = prevValue;
    }
  }

  _flowUiStable[key] = { value: next, ts: Date.now() };
  return next;
}
/**
 * Code-Teil: stabilizeFlowAbs
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function stabilizeFlowAbs(key, rawW, opts) {
  const absRaw = Math.max(0, _flowUiNum(rawW, 0));
  const absOpts = Object.assign({}, opts, { signSwitchW: Number.MAX_SAFE_INTEGER });
  return Math.max(0, Math.abs(stabilizeFlowSigned(`abs:${key}`, absRaw, absOpts)));
}
/**
 * Code-Teil: applyFlowCoreLabels
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function applyFlowCoreLabels() {
  // Optional PV name override from App-Center (Energiefluss-Monitor -> Basis).
  // If not provided, we keep the default label "PV".
  const pvNameRaw = flowSlotsCfg && flowSlotsCfg.core && typeof flowSlotsCfg.core.pvName === 'string' ? flowSlotsCfg.core.pvName : '';
  const pvName = (pvNameRaw || '').trim();
  const label = pvName ? pvName : 'PV';
  const el = document.getElementById('pvLabel');
  if (el) el.textContent = label;
}

let _renderScheduled = false;
let _renderTimer = null;
let _lastRenderTs = 0;

// UI performance: throttle expensive full-page renders a bit.
// (SSE/state updates can arrive very frequently and would otherwise make the UI feel laggy.)
const _RENDER_MIN_INTERVAL_MS = 120;
/**
 * Code-Teil: scheduleRender
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function scheduleRender(force = false){
  if (_renderScheduled && !force) return;
  _renderScheduled = true;

  const now = Date.now();
  const wait = force ? 0 : Math.max(0, _RENDER_MIN_INTERVAL_MS - (now - _lastRenderTs));

  if (_renderTimer) {
    try { clearTimeout(_renderTimer); } catch(_e) {}
    _renderTimer = null;
  }

  _renderTimer = setTimeout(() => {
    _renderScheduled = false;
    _lastRenderTs = Date.now();
    try{ render(); }catch(_e){}
  }, wait);
}

// Kundenanzeige: Messwerte des Energieflussmonitors werden bewusst nur alle 15 Sekunden
// neu gerendert. Die Backend-Messung und sämtliche EMS-Regelkreise bleiben unverändert
// schnell; gedrosselt wird ausschließlich die sichtbare LIVE-Darstellung, damit kurze
// NVP-/Speicher-Messversätze nicht als hektisches Springen erscheinen.
const LIVE_TELEMETRY_RENDER_INTERVAL_MS = 5000;
let _liveTelemetryRenderTimer = null;
let _lastLiveTelemetryRenderTs = 0;

/**
 * Code-Teil: scheduleLiveTelemetryRender
 * Zweck: Bündelt häufige SSE-Messwertupdates auf einen festen 15-Sekunden-Anzeigetakt.
 * Zusammenhang: Verändert keine Statewerte und keine Regelung; nur render() im LIVE-Frontend
 * wird verzögert. Initialdaten, Konfigurationsänderungen und bewusste UI-Aktionen dürfen
 * weiterhin sofort gerendert werden.
 */
function scheduleLiveTelemetryRender(force = false){
  const now = Date.now();
  const elapsed = now - (_lastLiveTelemetryRenderTs || 0);

  if (force || !_lastLiveTelemetryRenderTs || elapsed >= LIVE_TELEMETRY_RENDER_INTERVAL_MS) {
    if (_liveTelemetryRenderTimer) {
      try { clearTimeout(_liveTelemetryRenderTimer); } catch(_e) {}
      _liveTelemetryRenderTimer = null;
    }
    _lastLiveTelemetryRenderTs = now;
    scheduleRender(true);
    return;
  }

  if (_liveTelemetryRenderTimer) return;
  const wait = Math.max(0, LIVE_TELEMETRY_RENDER_INTERVAL_MS - elapsed);
  _liveTelemetryRenderTimer = setTimeout(() => {
    _liveTelemetryRenderTimer = null;
    _lastLiveTelemetryRenderTs = Date.now();
    scheduleRender(true);
  }, wait);
}

// Nach Rückkehr in einen sichtbaren Tab sofort den neuesten gepufferten Stand zeigen.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleLiveTelemetryRender(true);
});
/**
 * Code-Teil: formatPower
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatPower(v) {
  const ts = nxTryTsDashboardFormat('formatDashboardPower', v, units.power);
  if (ts !== null) return ts;
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  // If configured for kW, convert automatically from W
  if (units.power === 'kW') {
    return (n / 1000).toFixed(2) + ' kW';
  }
  return n.toFixed(0) + ' W';
}

// Energy formatting for KPI tiles (keep values readable on mobile)
/**
 * Code-Teil: formatEnergyKwh
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatEnergyKwh(v){
  const ts = nxTryTsDashboardFormat('formatDashboardEnergyKwh', v);
  if (ts !== null) return ts;
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  if (!isFinite(n)) return '--';
  const abs = Math.abs(n);
  if (abs >= 1000000) return (n/1000000).toFixed(2) + ' GWh';
  if (abs >= 1000) return (n/1000).toFixed(2) + ' MWh';
  return n.toFixed(2) + ' kWh';
}

function formatCurrencyEur(v){
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  if (!isFinite(n)) return '--';
  return n.toFixed(2).replace('.', ',') + ' €';
}
/**
 * Code-Teil: formatPowerSigned
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatPowerSigned(v){
  const ts = nxTryTsDashboardFormat('formatDashboardPowerSigned', v, units.power);
  if (ts !== null) return ts;
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  const sign = n>0?'+':(n<0?'-':'');
  const abs = Math.abs(n);
  if (units.power === 'kW') return sign + (abs/1000).toFixed(2) + ' kW';
  return sign + abs.toFixed(0) + ' W';
}
/**
 * Code-Teil: formatFlowPower
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatFlowPower(v, decimals){
  const d = (decimals === undefined || decimals === null || isNaN(decimals)) ? FLOW_UI_STABILITY.decimals : Number(decimals);
  const ts = nxTryTsDashboardFormat('formatDashboardFlowPower', v, d);
  if (ts !== null) return ts;
  // Energy-flow monitor: always show power values in kW (input is expected in W)
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  return (n / 1000).toFixed(d) + ' kW';
}
/**
 * Code-Teil: formatNum
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatNum(v, suffix='') {

  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  // If configured for kW, convert automatically from W
  if (units.power === 'kW') {
    return (n / 1000).toFixed(2) + ' kW';
  }
  return n.toFixed(0) + ' W';
}
/**
 * Code-Teil: formatNum
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatNum(v, suffix='') {

  if (v === undefined || v === null || isNaN(v)) return '--';
  return Number(v).toFixed(1) + (suffix || '');
}
/**
 * Code-Teil: formatPricePerKwh
 * Zweck: Formatiert Daten für Anzeige oder Logs.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function formatPricePerKwh(v){
  if (v===undefined || v===null || isNaN(v)) return '--';
  const n = Number(v);
  // assume €/kWh if v < 10, else probably ct/kWh
  if (n < 10) return n.toFixed(3) + ' €/kWh';
  return (n/100).toFixed(2) + ' €/kWh'; // if provided in ct
}

// ------------------------------
// Tarif-Preis-Forecast Tooltip (Chart)
// ------------------------------

// Parse tibber-like (or similar) price curves from JSON.
// Expected schema (examples):
//  - [{ total: 0.318, startsAt: "2026-01-21T00:00:00.000Z", endsAt: "..." }, ...]
//  - { prices: [ ... ] }
/**
 * Code-Teil: nwParsePriceCurve
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwParsePriceCurve(raw) {
  if (raw === null || raw === undefined) return [];

  let data = raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try { data = JSON.parse(s); } catch (_e) { return []; }
  }

  // Some adapters wrap the array
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const arr = data.prices || data.data || data.items || data.values || null;
    if (Array.isArray(arr)) data = arr;
    else return [];
  }

  if (!Array.isArray(data)) return [];
  /**
   * Code-Teil: normalizePriceEurPerKwh
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function normalizePriceEurPerKwh(v){
    if (v === null || v === undefined) return null;
    let n = Number(v);
    if (!Number.isFinite(n)) return null;
    // auto convert ct/kWh -> €/kWh (same heuristic as backend: values >=10 are assumed to be ct)
    if (Math.abs(n) >= 10) n = n / 100;
    if (!Number.isFinite(n)) return null;
    return n;
  }

  const out = [];
  for (const it of data) {
    if (!it || typeof it !== 'object') continue;

    // price heuristics
    let pRaw = null;
    if (it.total !== undefined) pRaw = it.total;
    else if (it.price !== undefined) pRaw = it.price;
    else if (it.value !== undefined) pRaw = it.value;
    else if (it.marketprice !== undefined) pRaw = it.marketprice;
    else if (it.marketPrice !== undefined) pRaw = it.marketPrice;
    else if (it.energyPrice !== undefined) pRaw = it.energyPrice;
    if (pRaw === null && it.price && typeof it.price === 'object') {
      if (it.price.total !== undefined) pRaw = it.price.total;
      else if (it.price.value !== undefined) pRaw = it.price.value;
    }
    const priceEurKwh = normalizePriceEurPerKwh(pRaw);
    if (!Number.isFinite(priceEurKwh)) continue;

    // time heuristics
    const startRaw = (it.startsAt !== undefined) ? it.startsAt
      : (it.start !== undefined) ? it.start
      : (it.startTime !== undefined) ? it.startTime
      : (it.from !== undefined) ? it.from
      : (it.begin !== undefined) ? it.begin
      : (it.timestamp !== undefined) ? it.timestamp
      : (it.time !== undefined) ? it.time
      : null;

    let startMs = null;
    if (typeof startRaw === 'number' && Number.isFinite(startRaw)) {
      startMs = (startRaw < 1e12) ? startRaw * 1000 : startRaw;
    } else if (typeof startRaw === 'string') {
      const t = Date.parse(startRaw);
      if (Number.isFinite(t)) startMs = t;
    }
    if (!startMs) continue;

    const endRaw = (it.endsAt !== undefined) ? it.endsAt
      : (it.end !== undefined) ? it.end
      : (it.endTime !== undefined) ? it.endTime
      : (it.to !== undefined) ? it.to
      : (it.until !== undefined) ? it.until
      : null;

    let endMs = null;
    if (typeof endRaw === 'number' && Number.isFinite(endRaw)) {
      endMs = (endRaw < 1e12) ? endRaw * 1000 : endRaw;
    } else if (typeof endRaw === 'string') {
      const t = Date.parse(endRaw);
      if (Number.isFinite(t)) endMs = t;
    }
    if (!endMs) endMs = startMs + 60 * 60 * 1000;
    if (endMs <= startMs) endMs = startMs + 60 * 60 * 1000;

    out.push({ startMs, endMs, priceEurKwh });
  }
  out.sort((a,b)=> a.startMs - b.startMs);
  return out;
}
/**
 * Code-Teil: nwNiceStep
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNiceStep(range, targetTicks){
  const r = Math.max(1e-9, Number(range) || 0);
  const t = Math.max(2, Number(targetTicks) || 6);
  const rough = r / (t - 1);
  const pow10 = Math.pow(10, Math.floor(Math.log10(Math.max(1e-9, rough))));
  const err = rough / pow10;
  let step = pow10;
  if (err >= 7.5) step = 10 * pow10;
  else if (err >= 3.5) step = 5 * pow10;
  else if (err >= 1.5) step = 2 * pow10;
  return step;
}
/**
 * Code-Teil: nwClamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwClamp(v, lo, hi){
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
/**
 * Code-Teil: nwQuantile
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwQuantile(arr, q){
  try {
    const a = (Array.isArray(arr) ? arr : []).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
    if (a.length === 0) return null;
    const qq = Math.max(0, Math.min(1, Number(q) || 0));
    const pos = (a.length - 1) * qq;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (a[base + 1] === undefined) return a[base];
    return a[base] + rest * (a[base + 1] - a[base]);
  } catch(_e) { return null; }
}
/**
 * Code-Teil: nwMedian
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwMedian(arr){
  return nwQuantile(arr, 0.5);
}
/**
 * Code-Teil: nwResolveTariffThresholds
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwResolveTariffThresholds(pricesEur, cheapCandidate, expensiveCandidate){
  // Validate optional thresholds and compute sensible fallbacks from the day's distribution.
  const prices = (Array.isArray(pricesEur) ? pricesEur : []).map(Number).filter(Number.isFinite);
  if (prices.length === 0) return { cheapThr: null, expensiveThr: null };

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  /**
   * Code-Teil: Arrow-Funktion `isValid`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: isValid
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const isValid = (v) => Number.isFinite(v) && v > 0 && v >= (min - 1e-12) && v <= (max + 1e-12);

  let cheapThr = Number(cheapCandidate);
  let expensiveThr = Number(expensiveCandidate);

  if (!isValid(cheapThr)) cheapThr = null;
  if (!isValid(expensiveThr)) expensiveThr = null;

  if (cheapThr !== null && expensiveThr !== null && cheapThr >= expensiveThr) {
    cheapThr = null;
    expensiveThr = null;
  }

  // Fallbacks: use quantiles so we always get visible color differences.
  if (cheapThr === null) cheapThr = nwQuantile(prices, 0.30);
  if (expensiveThr === null) expensiveThr = nwQuantile(prices, 0.70);

  if (!Number.isFinite(cheapThr) || !Number.isFinite(expensiveThr) || cheapThr >= expensiveThr) {
    // Last resort: split the range.
    cheapThr = min + (max - min) * 0.33;
    expensiveThr = min + (max - min) * 0.66;
  }

  return { cheapThr, expensiveThr };
}
/**
 * Code-Teil: nwAggregateCurve
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAggregateCurve(curve, dayStartMs, dayEndMs, targetIntervalMs){
  // Aggregate (e.g. 15-min) curves into cleaner slots (e.g. 60-min) using weighted average.
  const src = (Array.isArray(curve) ? curve : [])
    .filter(x => x && Number.isFinite(x.startMs) && Number.isFinite(x.endMs) && Number.isFinite(x.priceEurKwh))
    .map(x => ({ startMs: Number(x.startMs), endMs: Number(x.endMs), priceEurKwh: Number(x.priceEurKwh) }))
    .sort((a,b)=>a.startMs - b.startMs);

  const start = Number(dayStartMs);
  const end = Number(dayEndMs);
  const step = Math.max(5 * 60 * 1000, Number(targetIntervalMs) || 0); // >= 5 min
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(step) || step <= 0) return src;

  let i = 0;
  const out = [];
  for (let t = start; t < end; t += step) {
    const slotStart = t;
    const slotEnd = Math.min(end, t + step);

    // Advance pointer to first relevant item
    while (i < src.length && src[i].endMs <= slotStart) i++;

    let sum = 0;
    let dur = 0;
    let j = i;

    while (j < src.length && src[j].startMs < slotEnd) {
      const it = src[j];
      const ovStart = Math.max(slotStart, it.startMs);
      const ovEnd = Math.min(slotEnd, it.endMs);
      const ov = ovEnd - ovStart;
      if (ov > 0) {
        sum += it.priceEurKwh * ov;
        dur += ov;
      }
      if (it.endMs <= slotEnd) j++;
      else break;
    }

    if (dur > 0) {
      out.push({ startMs: slotStart, endMs: slotEnd, priceEurKwh: sum / dur });
    }
  }
  return out.length ? out : src;
}
/**
 * Code-Teil: nwFormatCt
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFormatCt(vEurKwh){
  if (vEurKwh === undefined || vEurKwh === null || isNaN(Number(vEurKwh))) return '--';
  return (Number(vEurKwh) * 100).toFixed(1) + ' ct/kWh';
}
/**
 * Code-Teil: nwTariffColorForPrice
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwTariffColorForPrice(priceEurKwh, cheapThr, expensiveThr){
  const p = Number(priceEurKwh);
  const cheap = Number(cheapThr);
  const expensive = Number(expensiveThr);
  if (Number.isFinite(cheap) && p <= cheap + 1e-12) return '#22c55e'; // green
  if (Number.isFinite(expensive) && p >= expensive - 1e-12) return '#f97316'; // orange
  // neutral
  return '#facc15'; // yellow
}
/**
 * Code-Teil: nwDrawTariffForecastChart
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDrawTariffForecastChart(canvas, curve, opts){
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = (window.devicePixelRatio || 1);
  const cssW = Math.max(260, canvas.clientWidth || 360);
  const cssH = Math.max(140, canvas.clientHeight || 180);
  const needW = Math.round(cssW * dpr);
  const needH = Math.round(cssH * dpr);
  if (canvas.width !== needW || canvas.height !== needH) {
    canvas.width = needW;
    canvas.height = needH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = cssW;
  const H = cssH;

  // Background
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
  ctx.fillRect(0,0,W,H);

  const m = { L: 42, R: 12, T: 14, B: 26 };
  const plotW = W - m.L - m.R;
  const plotH = H - m.T - m.B;
  if (plotW <= 10 || plotH <= 10) return;

  const dayStartMs = opts && Number.isFinite(opts.dayStartMs) ? Number(opts.dayStartMs) : null;
  const dayEndMs = opts && Number.isFinite(opts.dayEndMs) ? Number(opts.dayEndMs) : null;
  if (!dayStartMs || !dayEndMs || dayEndMs <= dayStartMs) return;

  const cheapThr = opts ? opts.cheapThr : null;
  const expensiveThr = opts ? opts.expensiveThr : null;
  const nowMs = opts && Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();

  // Filter/clamp curve to plot range
  const items = (Array.isArray(curve) ? curve : [])
    .filter(x => x && Number.isFinite(x.startMs) && Number.isFinite(x.endMs) && Number.isFinite(x.priceEurKwh))
    .map(x => ({
      startMs: Math.max(dayStartMs, Number(x.startMs)),
      endMs: Math.min(dayEndMs, Number(x.endMs)),
      priceEurKwh: Number(x.priceEurKwh)
    }))
    .filter(x => x.endMs > x.startMs);

  if (items.length === 0) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Keine Preisdaten', W/2, H/2);
    return;
  }
  const pricesCt = items.map(x => x.priceEurKwh * 100);
  let minCt = Math.min(...pricesCt);
  let maxCt = Math.max(...pricesCt);
  if (!Number.isFinite(minCt) || !Number.isFinite(maxCt)) { minCt = 0; maxCt = 1; }
  if (Math.abs(maxCt - minCt) < 1e-9) { maxCt = minCt + 1; }

  // Nice ticks
  const targetTicks = 6;
  const step = nwNiceStep(maxCt - minCt, targetTicks);
  const tickMin = Math.floor(minCt / step) * step;
  const tickMax = Math.ceil(maxCt / step) * step;
  const yDigits = (step < 1) ? 1 : 0;

  /**
   * Code-Teil: Arrow-Funktion `xOf`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: xOf
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const xOf = (tMs) => {
    const frac = (tMs - dayStartMs) / (dayEndMs - dayStartMs);
    return m.L + nwClamp(frac, 0, 1) * plotW;
  };
  /**
   * Code-Teil: yOf
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const yOf = (pCt) => {
    const frac = (pCt - tickMin) / (tickMax - tickMin);
    return m.T + (1 - nwClamp(frac, 0, 1)) * plotH;
  };

  // Grid + Y labels
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 1;
  ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Arial';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = tickMin; v <= tickMax + 1e-9; v += step) {
    const y = yOf(v);
    ctx.beginPath();
    ctx.moveTo(m.L, y);
    ctx.lineTo(W - m.R, y);
    ctx.stroke();
    const lab = yDigits ? Number(v).toFixed(yDigits) : String(Math.round(v));
    ctx.fillText(lab, m.L - 6, y);
  }

  // X labels at 00/06/12/18
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xHours = [0, 6, 12, 18];
  xHours.forEach(h => {
    const t = dayStartMs + h * 60 * 60 * 1000;
    const x = xOf(t);
    const lab = String(h).padStart(2,'0') + ':00';
    ctx.fillText(lab, x, H - m.B + 6);
  });

  // Current time marker (subtle)
  if (nowMs >= dayStartMs && nowMs <= dayEndMs) {
    const xN = xOf(nowMs);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xN, m.T);
    ctx.lineTo(xN, m.T + plotH);
    ctx.stroke();
  }

  // Price curve (step line, colored by thresholds)
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const next = items[i + 1] || null;
    const pCt = it.priceEurKwh * 100;
    const x0 = xOf(it.startMs);
    const x1 = xOf(it.endMs);
    const y0 = yOf(pCt);
    const c0 = nwTariffColorForPrice(it.priceEurKwh, cheapThr, expensiveThr);

    // horizontal
    ctx.strokeStyle = c0;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y0);
    ctx.stroke();

    // vertical to next
    if (next && Number.isFinite(next.startMs) && next.startMs <= it.endMs + 2e3) {
      const pNextCt = next.priceEurKwh * 100;
      const y1 = yOf(pNextCt);
      const c1 = nwTariffColorForPrice(next.priceEurKwh, cheapThr, expensiveThr);
      ctx.strokeStyle = c1;
      ctx.beginPath();
      ctx.moveTo(x1, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
}
/**
 * Code-Teil: initTariffForecastTooltip
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initTariffForecastTooltip(){
  const card = document.getElementById('tariffCard');
  const btn = document.getElementById('tariffForecastBtn');
  if (!card || !btn) return;

  // Build tooltip DOM once
  let tip = document.getElementById('tariffForecastTip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'tariffForecastTip';
    tip.className = 'nw-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.innerHTML = `
      <div class="nw-tooltip__header">
        <div class="nw-tooltip__title">Preisverlauf heute</div>
        <div class="nw-tooltip__meta" id="tariffForecastMeta">—</div>
      </div>
      <canvas class="nw-tooltip__chart" id="tariffForecastCanvas"></canvas>
      <div class="nw-tooltip__footer">
        <span id="tariffForecastMin">Min —</span>
        <span id="tariffForecastAvg">Ø —</span>
        <span id="tariffForecastMax">Max —</span>
      </div>
    `;
    document.body.appendChild(tip);
  }

  const canvas = tip.querySelector('#tariffForecastCanvas');
  const metaEl = tip.querySelector('#tariffForecastMeta');
  const minEl = tip.querySelector('#tariffForecastMin');
  const avgEl = tip.querySelector('#tariffForecastAvg');
  const maxEl = tip.querySelector('#tariffForecastMax');

  let open = false;
  let hoverTimer = null;
  let poll = null;

  /**
   * Code-Teil: Arrow-Funktion `v`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: v
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const v = (k) => {
    const st = window.latestState || {};
    return (st && st[k] && st[k].value !== undefined) ? st[k].value : null;
  };
  /**
   * Code-Teil: tsOf
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const tsOf = (k) => {
    const st = window.latestState || {};
    return (st && st[k] && st[k].ts !== undefined) ? Number(st[k].ts) : null;
  };
  /**
   * Code-Teil: getTodayRange
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getTodayRange(){
    const d0 = new Date();
    d0.setHours(0,0,0,0);
    const d1 = new Date(d0.getTime() + 24*60*60*1000);
    return { startMs: d0.getTime(), endMs: d1.getTime() };
  }
  /**
   * Code-Teil: update
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function update(){
    const { startMs, endMs } = getTodayRange();
    const rawToday = v('priceTodayJson') || v('tarif.pricesTodayJson') || v('pricesTodayJson');
    const rawTomorrow = v('priceTomorrowJson') || v('tarif.pricesTomorrowJson') || v('pricesTomorrowJson');

    let curve = nwParsePriceCurve(rawToday);
    // Fallback: if today is missing (some providers update late), try tomorrow and filter for today.
    if ((!curve || curve.length === 0) && rawTomorrow) {
      curve = nwParsePriceCurve(rawTomorrow);
    }
    const curveToday = (Array.isArray(curve) ? curve : []).filter(x => {
      if (!x || !Number.isFinite(x.startMs) || !Number.isFinite(x.endMs)) return false;
      // any overlap with today
      return x.endMs > startMs && x.startMs < endMs;
    });

    let cheapThr = v('tarif.preisSchwelleGuensigEurProKwh');
    let expThr = v('tarif.preisGrenzeEurProKwh');

    // Meta: show last update time if possible
    const ts = tsOf('priceTodayJson') || tsOf('tarif.preisAktuellEurProKwh') || tsOf('priceCurrent');
    const tsTxt = ts ? ('aktualisiert ' + _fmtTimeHHmm(ts)) : '';
    // Current price
    const pNow = v('priceCurrent') ?? v('tarif.preisAktuellEurProKwh');
    const pNowTxt = (pNow !== null && pNow !== undefined && Number.isFinite(Number(pNow))) ? nwFormatCt(Number(pNow)) : '';
    const meta = [pNowTxt ? ('Aktuell ' + pNowTxt) : '', tsTxt].filter(Boolean).join(' • ');
    if (metaEl) metaEl.textContent = meta || '—';

    // min/avg/max
    const ps = curveToday.map(x => x.priceEurKwh).filter(n => Number.isFinite(Number(n)));
    // Downsample very fine-grained curves (e.g. 15-min) to keep the chart visually clean.
    // Many providers deliver 15-minute slots; aggregating to 60 minutes makes the forecast easier to read.
    let curvePlot = curveToday;
    const intMs = curveToday.map(x => (Number(x.endMs) - Number(x.startMs))).filter(n => Number.isFinite(n) && n > 0);
    const medMs = nwMedian(intMs);
    if (Number.isFinite(medMs) && medMs < 30 * 60 * 1000) {
      curvePlot = nwAggregateCurve(curveToday, startMs, endMs, 60 * 60 * 1000);
    }

    if (ps.length > 0) {
      const min = Math.min(...ps);
      const max = Math.max(...ps);
      const avg = ps.reduce((s,n)=>s+Number(n),0) / ps.length;

      // Resolve thresholds (günstig/teuer) from config if present,
      // otherwise derive them from the day's distribution so we always get visible color differences.
      const thr = nwResolveTariffThresholds(ps, cheapThr, expThr);
      cheapThr = thr.cheapThr;
      expThr = thr.expensiveThr;

      if (minEl) minEl.textContent = 'Min ' + nwFormatCt(min);
      if (avgEl) avgEl.textContent = 'Ø ' + nwFormatCt(avg);
      if (maxEl) maxEl.textContent = 'Max ' + nwFormatCt(max);
    } else {
      if (minEl) minEl.textContent = 'Min —';
      if (avgEl) avgEl.textContent = 'Ø —';
      if (maxEl) maxEl.textContent = 'Max —';
    }

    // Draw
    nwDrawTariffForecastChart(canvas, curvePlot, {
      dayStartMs: startMs,
      dayEndMs: endMs,
      cheapThr,
      expensiveThr: expThr,
      nowMs: Date.now(),
    });
  }
  /**
   * Code-Teil: place
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function place(){
    if (!tip) return;
    const anchor = anchorEl || card || btn;
    if (!anchor || !anchor.getBoundingClientRect) return;
    const rA = anchor.getBoundingClientRect();
    const margin = 10;

    tip.style.left = '0px';
    tip.style.top = '0px';
    const wasShown = tip.classList.contains('nw-tooltip--show');
    tip.classList.add('nw-tooltip--show');
    const rTip = tip.getBoundingClientRect();
    if (!wasShown) tip.classList.remove('nw-tooltip--show');

    const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;

    // Prefer aligning with the tile's left edge; if space is tight, align to the right.
    let left = rA.left;
    if (left + rTip.width > vw - margin) left = rA.right - rTip.width;
    left = nwClamp(left, margin, vw - rTip.width - margin);

    let top = rA.top - rTip.height - 8;
    const fitsAbove = (top >= margin);
    if (!fitsAbove) {
      top = rA.bottom + 8;
      if (top + rTip.height > vh - margin) {
        // last resort: center-ish
        top = nwClamp(vh/2 - rTip.height/2, margin, vh - rTip.height - margin);
      }
    }

    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
  }

  let anchorEl = null;
  /**
   * Code-Teil: show
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function show(anchor){
    if (open) return;
    open = true;
    anchorEl = anchor || btn || card || null;
    // Make visible first so the canvas has a real clientWidth/clientHeight.
    tip.classList.add('nw-tooltip--show');
    place();
    update();
    try { requestAnimationFrame(()=>{ if (open) update(); }); } catch(_e) {}
    // lightweight refresh while open (time marker + live price)
    if (poll) clearInterval(poll);
    poll = setInterval(()=>{ try{ if (open) update(); } catch(_e){} }, 15000);
  }
  /**
   * Code-Teil: hide
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function hide(){
    open = false;
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    if (poll) { clearInterval(poll); poll = null; }
    if (tip) tip.classList.remove('nw-tooltip--show');
  }
  /**
   * Code-Teil: toggle
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function toggle(anchor){ if (open) hide(); else show(anchor); }

  // Tooltip controls (icon + whole tile click)
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    toggle(btn);
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btn.addEventListener('mousedown', (e)=>{ e.stopPropagation(); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchstart' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btn.addEventListener('touchstart', (e)=>{ try{ e.stopPropagation(); }catch(_e){} }, { passive: true });


  // Click on the whole tile toggles the forecast when tariff is active.
  // EMS modal is opened via the EMS badge button.
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  card.addEventListener('click', (e)=>{
    const t = e && e.target;
    try {
      if (t && (t === btn || (t.closest && t.closest('#tariffForecastBtn')))) return;
      if (t && (t.closest && t.closest('#tariffEmsBtn'))) return;
    } catch(_e) {}

    const raw = v('priceTodayJson') || v('tarif.pricesTodayJson') || v('pricesTodayJson') ||
                v('priceTomorrowJson') || v('tarif.pricesTomorrowJson') || v('pricesTomorrowJson');
    const tariffOn = !!v('settings.dynamicTariff') || !!raw;
    if (!tariffOn) return;

    try { if (e) e.preventDefault(); } catch(_e) {}
    toggle(card);
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  card.addEventListener('keydown', (e)=>{
    if (!e) return;
    if (e.key === 'Enter' || e.key === ' ') {
      const raw = v('priceTodayJson') || v('tarif.pricesTodayJson') || v('pricesTodayJson') ||
                  v('priceTomorrowJson') || v('tarif.pricesTomorrowJson') || v('pricesTomorrowJson');
      const tariffOn = !!v('settings.dynamicTariff') || !!raw;
      if (!tariffOn) return;
      try { e.preventDefault(); } catch(_e) {}
      toggle(card);
    }
  });

  // Desktop hover support (optional)
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseenter' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btn.addEventListener('mouseenter', ()=>{
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    show(btn);
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseleave' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btn.addEventListener('mouseleave', ()=>{
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(()=>{ if (!tip.matches(':hover')) hide(); }, 250);
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseenter' an tip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  tip.addEventListener('mouseenter', ()=>{
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseleave' an tip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  tip.addEventListener('mouseleave', ()=>{
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(()=> hide(), 250);
  });

  // Close on outside click / Esc
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('click', (e)=>{
    if (!open) return;
    const t = e && e.target;
    if (t && (t === btn || tip.contains(t) || card.contains(t))) return;
    hide();
  }, true);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e)=>{
    if (!open) return;
    if (e && (e.key === 'Escape' || e.key === 'Esc')) hide();
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'resize' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('resize', ()=>{ if (open) { try{ place(); update(); } catch(_e){} } });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'scroll' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('scroll', ()=>{ if (open) { try{ place(); } catch(_e){} } }, true);
}

// ------------------------------
// Wetter (optional)
// ------------------------------
/**
 * Code-Teil: _fmtTempC
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _fmtTempC(v){
  if (v === undefined || v === null || isNaN(v)) return '-- °C';
  return Number(v).toFixed(1) + ' °C';
}
/**
 * Code-Teil: _fmtPct
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _fmtPct(v){
  if (v === undefined || v === null || isNaN(v)) return '-- %';
  return Number(v).toFixed(0) + ' %';
}
/**
 * Code-Teil: _fmtKmh
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _fmtKmh(v){
  if (v === undefined || v === null || isNaN(v)) return '-- km/h';
  return Number(v).toFixed(0) + ' km/h';
}
/**
 * Code-Teil: _fmtNumLocal
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _fmtNumLocal(v, digits=1){
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  const d = (digits === undefined || digits === null || isNaN(digits)) ? 1 : Number(digits);
  try {
    return n.toLocaleString(nwUiLocaleTag(), { minimumFractionDigits: d, maximumFractionDigits: d });
  } catch (_e) {
    return n.toFixed(d).replace('.', ',');
  }
}
/**
 * Code-Teil: _fmtTimeHHmm
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _fmtTimeHHmm(ts){
  if (!ts || isNaN(Number(ts))) return '—';
  const d = new Date(Number(ts));
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return hh + ':' + mm;
}
/**
 * Code-Teil: _pickWeatherIcon
 * Zweck: Verarbeitet Wetter-/Prognosedaten für Anzeige oder KI-Beratung.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _pickWeatherIcon(code, text){
  const t = (text == null ? '' : String(text)).toLowerCase();
  const c = (code == null || isNaN(Number(code))) ? null : Number(code);

  // Open‑Meteo/WMO style codes (optional)
  if (c != null) {
    if (c === 0) return '☀️';
    if (c >= 1 && c <= 3) return '⛅';
    if (c === 45 || c === 48) return '🌫️';
    if (c >= 51 && c <= 57) return '🌦️';
    if (c >= 61 && c <= 67) return '🌧️';
    if (c >= 71 && c <= 77) return '🌨️';
    if (c >= 80 && c <= 82) return '🌧️';
    if (c >= 95 && c <= 99) return '⛈️';
  }

  // Text heuristics (DE/EN)
  if (t.includes('sonn') || t.includes('sun') || t.includes('klar') || t.includes('clear')) return '☀️';
  if (t.includes('wol') || t.includes('cloud') || t.includes('overcast')) return '☁️';
  if (t.includes('regen') || t.includes('rain') || t.includes('shower')) return '🌧️';
  if (t.includes('schnee') || t.includes('snow')) return '🌨️';
  if (t.includes('nebel') || t.includes('fog') || t.includes('mist')) return '🌫️';
  if (t.includes('gewitter') || t.includes('thunder') || t.includes('storm')) return '⛈️';
  return '🌤️';
}
/**
 * Code-Teil: setWidth
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
}
/**
 * Code-Teil: setText
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
}
/**
 * Code-Teil: nwSetDisplay
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetDisplay(id, visible, displayValue) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = visible ? (displayValue || '') : 'none';
}
/**
 * Code-Teil: nwSetElementVisible
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetElementVisible(el, visible, displayValue) {
  if (!el) return;
  try { el.classList.toggle('hidden', !visible); } catch (_e) {}
  el.style.display = visible ? (displayValue || '') : 'none';
}
/**
 * Code-Teil: nwAsBool
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAsBool(v, def) {
  if (typeof v === 'boolean') return v;
  if (v === undefined || v === null || v === '') return !!def;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'yes', 'ja', 'on', 'an'].includes(s)) return true;
  if (['false', '0', 'no', 'nein', 'off', 'aus'].includes(s)) return false;
  return !!def;
}
/**
 * Code-Teil: nwFeatureMappedRow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFeatureMappedRow(row) {
  if (!row || row.enabled === false) return false;
  // Nur echte Ladepunkt-Zuordnungen zählen. Legacy-Aggregate wie consumptionEvcs
  // oder alte boolesche Flags dürfen eine Kundenanlage ohne Wallbox nicht sichtbar machen.
  const fields = ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'];
  return fields.some((key) => String(row[key] || '').trim());
}
/**
 * Code-Teil: nwConfiguredEvcsRows
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwConfiguredEvcsRows(inputCfg) {
  const c = inputCfg || window.__nwCfg || {};
  try {
    const sc = (c.settingsConfig && typeof c.settingsConfig === 'object') ? c.settingsConfig : {};
    const fromSettings = Array.isArray(sc.evcsList) ? sc.evcsList : [];
    const fromRuntime = Array.isArray(c.evcsList) ? c.evcsList : [];
    const list = fromSettings.length ? fromSettings : fromRuntime;
    return list.filter(nwFeatureMappedRow);
  } catch (_e) {
    return [];
  }
}
/**
 * Code-Teil: nwEvcsFeatureFromConfig
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEvcsFeatureFromConfig(inputCfg) {
  const c = inputCfg || window.__nwCfg || {};
  try {
    const rows = nwConfiguredEvcsRows(c);
    const sc = (c.settingsConfig && typeof c.settingsConfig === 'object') ? c.settingsConfig : {};
    const configuredCount = Number(sc.evcsConfiguredCount ?? (c.flowSlots && c.flowSlots.meta && c.flowSlots.meta.evcsConfiguredCount) ?? rows.length);
    const count = Number(sc.evcsCount ?? window.__nwEvcsCount ?? configuredCount ?? 0);
    // Strikte Regel: Sichtbar erst ab realem Ladepunkt. Ein altes evcsAvailable=true
    // ohne gemappte Ladepunkt-Zeile wird bewusst ignoriert.
    return rows.length > 0 || (Number.isFinite(configuredCount) && configuredCount > 0 && Number.isFinite(count) && count > 0);
  } catch (_e) {
    return false;
  }
}
/**
 * Code-Teil: nwEvcsCountFromConfig
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEvcsCountFromConfig(inputCfg) {
  const c = inputCfg || window.__nwCfg || {};
  try {
    const sc = (c.settingsConfig && typeof c.settingsConfig === 'object') ? c.settingsConfig : {};
    const n = Number(sc.evcsCount ?? sc.evcsConfiguredCount ?? window.__nwEvcsCount ?? 0);
    return Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
  } catch (_e) {
    return 0;
  }
}
/**
 * Code-Teil: nwStorageFarmFeatureFromConfig
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOptionalFeatureFromConfig(inputCfg, key, fallback) {
  const c = inputCfg || window.__nwCfg || {};
  try {
    const fv = (c.featureVisibility && typeof c.featureVisibility === 'object') ? c.featureVisibility : null;
    if (fv && typeof fv[key] === 'boolean') return fv[key] === true;
  } catch (_e) {}
  return !!fallback;
}
function nwSmartHomeFeatureFromConfig(inputCfg) {
  const c = inputCfg || window.__nwCfg || {};
  return nwOptionalFeatureFromConfig(c, 'hasSmartHome', !!(c && c.smartHome && c.smartHome.enabled));
}
function nwStorageFarmAppCenterActiveFromConfig(inputCfg) {
  const c = inputCfg || window.__nwCfg || {};
  try {
    const appsRoot = (c.emsApps && typeof c.emsApps === 'object') ? c.emsApps : {};
    const apps = (appsRoot.apps && typeof appsRoot.apps === 'object') ? appsRoot.apps : {};
    const app = (apps.storagefarm && typeof apps.storagefarm === 'object')
      ? apps.storagefarm
      : ((apps.storageFarm && typeof apps.storageFarm === 'object') ? apps.storageFarm : null);
    if (!app) return false;
    return app.installed === true && app.enabled === true;
  } catch (_e) {
    return false;
  }
}
function nwStorageFarmHasRealRowsFromConfig(inputCfg) {
  const c = inputCfg || window.__nwCfg || {};
  try {
    const sf = (c.storageFarm && typeof c.storageFarm === 'object') ? c.storageFarm : {};
    const rows = Array.isArray(sf.storages) ? sf.storages : [];
    const realCount = rows.filter((row) => {
      const r = row && typeof row === 'object' ? row : null;
      if (!r || r.enabled === false) return false;
      return [
        'socId','socDp','chargePowerId','chargeDp','dischargePowerId','dischargeDp',
        'signedPowerId','signedPowerDp','powerId','setChargePowerId','setDischargePowerId',
        'setSignedPowerId','availableId','faultId','chargeAllowedId','dischargeAllowedId',
      ].some((key) => String(r[key] || '').trim());
    }).length;
    return realCount >= 2;
  } catch (_e) {
    return false;
  }
}
function nwStorageFarmFeatureFromConfig(inputCfg, stateSnapshot) {
  const c = inputCfg || window.__nwCfg || {};

  // `/config.featureVisibility` ist bereits serverseitig gegen AppCenter installed +
  // enabled und mindestens zwei echte Farm-Zeilen geprüft. Die Kundenantwort enthält
  // aus Sicherheitsgründen nicht zwingend die vollständigen Farm-DPs; deshalb darf das
  // Frontend die autoritative Freigabe nicht nochmals an versteckten Zeilen ablehnen.
  if (c.featureVisibility && typeof c.featureVisibility.hasStorageFarm === 'boolean') {
    return c.featureVisibility.hasStorageFarm === true;
  }
  if (c.storageFarmSummary && typeof c.storageFarmSummary.active === 'boolean') {
    return c.storageFarmSummary.active === true;
  }

  // Kompatibilitätsfallback für ältere Backends ohne featureVisibility.
  const appCenterActive = nwStorageFarmAppCenterActiveFromConfig(c);
  if (!appCenterActive) return false;
  if (nwStorageFarmHasRealRowsFromConfig(c)) return true;
  try {
    const st = stateSnapshot || window.latestState || state || {};
    const enabled = nwAsBool(st['storageFarm.enabled'] && st['storageFarm.enabled'].value, false);
    const total = Number(st['storageFarm.storagesTotal'] && st['storageFarm.storagesTotal'].value);
    return enabled && Number.isFinite(total) && total >= 2;
  } catch (_e) {
    return false;
  }
}

/**
 * Code-Teil: nwTsFeatureVisibilityShadowEnabled
 *
 * Zweck:
 * Aktiviert einen rein diagnostischen Vergleich zwischen der alten JS-Sichtbarkeit
 * und dem neuen TypeScript-MJS-Spiegel.
 *
 * Zusammenhang:
 * Das ist der erste vorsichtige Runtime-Kontakt mit einem TypeScript-Spiegel im
 * Kundenfrontend. Die Anzeige wird dadurch nicht verändert. Der Vergleich läuft
 * nur, wenn im Browser explizit `?nwTsFeatureVisibilityShadow=1` gesetzt ist oder
 * `localStorage.nwTsFeatureVisibilityShadow = "1"` gespeichert wurde.
 *
 * Wichtig:
 * Diese Funktion darf niemals produktive Feature-Sichtbarkeit umschalten. Sie ist
 * nur ein Sicherheitsgurt vor der späteren echten Migration von EVCS/Farm/SmartHome-
 * Sichtbarkeit auf TypeScript.
 */
function nwTsFeatureVisibilityShadowEnabled() {
  try {
    const qs = new URLSearchParams(window.location.search || '');
    if (qs.get('nwTsFeatureVisibilityShadow') === '1') return true;
    return String(window.localStorage && window.localStorage.getItem('nwTsFeatureVisibilityShadow') || '') === '1';
  } catch (_e) {
    return false;
  }
}

/**
 * Code-Teil: nwBuildTsFeatureVisibilityInput
 *
 * Zweck:
 * Baut aus der vorhandenen `/config`-Struktur und dem aktuellen State-Snapshot die
 * Eingabeform, die der TypeScript-Feature-Visibility-Spiegel erwartet.
 *
 * Zusammenhang:
 * Diese Funktion verbindet die alte JS-Welt (`nwConfiguredEvcsRows`,
 * `nwStorageFarmFeatureFromConfig`) mit dem neuen MJS-Spiegel unter
 * `www/static/ts-mirrors/frontend/customer-feature-visibility.mjs`.
 *
 * Wichtig:
 * Die Funktion darf keine DOM-Elemente ändern. Sie bereitet nur Diagnosedaten vor.
 */
function nwBuildTsFeatureVisibilityInput(inputCfg, stateSnapshot) {
  const c = inputCfg || window.__nwCfg || {};
  const st = stateSnapshot || window.latestState || state || {};
  const rows = nwConfiguredEvcsRows(c);
  const storageFarmCfg = (c.storageFarm && typeof c.storageFarm === 'object') ? c.storageFarm : {};
  const storageFarmStorages = Array.isArray(storageFarmCfg.storages) ? storageFarmCfg.storages : [];

  const evcsProofs = rows.map((row, idx) => ({
    index: idx + 1,
    name: String(row.name || row.label || `Ladepunkt ${idx + 1}`),
    measuredPowerDp: String(row.powerId || row.measuredPowerDp || row.actualPowerId || '').trim() || undefined,
    controlDp: String(row.enableWriteId || row.setCurrentAId || row.setPowerWId || row.controlDp || '').trim() || undefined,
    hasAnyRealDatapoint: nwFeatureMappedRow(row),
  }));

  const storageFarmProofs = storageFarmStorages.map((row, idx) => ({
    index: idx + 1,
    name: String(row.name || row.label || `Speicher ${idx + 1}`),
    socDp: String(row.socId || row.socDp || row.soc || '').trim() || undefined,
    chargeDp: String(row.chargePowerId || row.chargeDp || row.powerChargeId || '').trim() || undefined,
    dischargeDp: String(row.dischargePowerId || row.dischargeDp || row.powerDischargeId || '').trim() || undefined,
    signedPowerDp: String(row.signedPowerId || row.powerId || row.signedPowerDp || '').trim() || undefined,
    hasAnyRealDatapoint: !!(String(row.socId || row.socDp || row.chargePowerId || row.dischargePowerId || row.signedPowerId || row.powerId || '').trim()),
  }));

  const weatherTemp = st.weatherTempC && st.weatherTempC.value;
  const weatherText = st.weatherText && st.weatherText.value;
  const aiEnabled = st['aiAdvisor.enabled'] && st['aiAdvisor.enabled'].value;
  const aiCustomer = st['settings.aiAdvisorEnabled'] && st['settings.aiAdvisorEnabled'].value;

  return {
    evcsProofs,
    storageFarmEnabled: nwStorageFarmFeatureFromConfig(c, st),
    storageFarmProofs,
    smartHomeEnabled: nwSmartHomeFeatureFromConfig(c),
    weatherEnabled: nwAsBool(st['settings.weatherEnabled'] && st['settings.weatherEnabled'].value, !!(c && c.settings && c.settings.weatherEnabled)),
    weatherHasData: (weatherTemp !== undefined && weatherTemp !== null && weatherTemp !== '') || !!String(weatherText || '').trim(),
    aiAdvisorInstalled: nwAsBool(aiEnabled, !!(c && c.aiAdvisor && c.aiAdvisor.enabled !== false)),
    aiAdvisorCustomerEnabled: nwAsBool(aiCustomer, true),
  };
}

/**
 * Code-Teil: nwRunTsFeatureVisibilityShadowCheck
 *
 * Zweck:
 * Importiert den TypeScript-MJS-Spiegel und vergleicht dessen Ergebnis mit der alten
 * JS-Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Das ist der sichere Zwischenschritt vor einer späteren produktiven Umstellung.
 * Wenn es Abweichungen gibt, werden sie nur in die Konsole geschrieben. Das LIVE-
 * Dashboard bleibt unverändert und nutzt weiterhin die alte JS-Logik.
 */
async function nwRunTsFeatureVisibilityShadowCheck(inputCfg, stateSnapshot, legacyVisibility) {
  if (!nwTsFeatureVisibilityShadowEnabled()) return;
  try {
    if (!window.__nwTsFeatureVisibilityMirrorPromise) {
      window.__nwTsFeatureVisibilityMirrorPromise = import('/static/ts-mirrors/frontend/customer-feature-visibility.mjs');
    }
    const mod = await window.__nwTsFeatureVisibilityMirrorPromise;
    if (!mod || typeof mod.buildCustomerFeatureVisibility !== 'function') return;
    const tsVisibility = mod.buildCustomerFeatureVisibility(nwBuildTsFeatureVisibilityInput(inputCfg, stateSnapshot));
    const keys = ['hasEvcs', 'hasStorageFarm', 'hasSmartHome', 'hasWeather', 'hasAiAdvisor'];
    const diffs = keys.filter((key) => !!(legacyVisibility && legacyVisibility[key]) !== !!(tsVisibility && tsVisibility[key]));
    if (diffs.length) {
      console.warn('[nw-ts-shadow] Feature-Visibility-Abweichung', { diffs, legacyVisibility, tsVisibility });
    } else {
      console.debug('[nw-ts-shadow] Feature-Visibility OK', tsVisibility);
    }
  } catch (e) {
    console.warn('[nw-ts-shadow] Feature-Visibility-Shadowcheck fehlgeschlagen', e && e.message ? e.message : e);
  }
}
/**
 * Code-Teil: nwApplyCustomerFeatureVisibility
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwApplyCustomerFeatureVisibility(inputCfg, stateSnapshot) {
  const c = inputCfg || window.__nwCfg || {};
  const evcsAvailable = nwEvcsFeatureFromConfig(c);
  const evcsCount = evcsAvailable ? nwEvcsCountFromConfig(c) : 0;
  const showEvcsPage = evcsAvailable && evcsCount >= 2;
  const storageFarmAvailable = nwStorageFarmFeatureFromConfig(c, stateSnapshot);

  try { window.__nwEvcsAvailable = evcsAvailable; window.__nwEvcsCount = evcsCount; window.__nwStorageFarmEnabled = storageFarmAvailable; } catch (_e) {}

  const menuEvcsLink = document.getElementById('menuEvcsLink');
  const tabEvcs = document.getElementById('tabEvcs');
  if (menuEvcsLink) menuEvcsLink.classList.toggle('hidden', !showEvcsPage);
  if (tabEvcs) tabEvcs.classList.toggle('hidden', !showEvcsPage);

  const evcsCard = document.getElementById('evcsCard');
  if (evcsCard) evcsCard.classList.toggle('hidden', !evcsAvailable);
  const evSide = document.getElementById('sideEvcsPower');
  if (evSide) nwSetElementVisible(evSide.closest('.nw-value-row'), evcsAvailable);

  const evcsNode = document.getElementById('nodeEvcs');
  if (evcsNode) evcsNode.style.display = evcsAvailable ? '' : 'none';
  const evcsLine = document.getElementById('lineC2');
  if (evcsLine) evcsLine.style.display = evcsAvailable ? '' : 'none';

  try {
    const evVal = document.getElementById('consumptionEvcs');
    const evBox = evVal && evVal.parentElement;
    if (evBox) nwSetElementVisible(evBox, evcsAvailable);
    const tile = document.getElementById('consumptionBuilding') && document.getElementById('consumptionBuilding').closest('.nw-tile');
    const room = tile && tile.querySelector('.nw-tile__room');
    if (room) room.textContent = evcsAvailable ? 'EVCS & Gebäude' : 'Gebäude';
  } catch (_e) {}

  const menuStorageFarmLink = document.getElementById('menuStorageFarmLink');
  const tabStorageFarm = document.getElementById('tabStorageFarm');
  if (menuStorageFarmLink) menuStorageFarmLink.classList.toggle('hidden', !storageFarmAvailable);
  if (tabStorageFarm) tabStorageFarm.classList.toggle('hidden', !storageFarmAvailable);

  // TS-Migrationsschritt 0.7.73:
  // Optionaler Shadow-Vergleich mit dem TypeScript-MJS-Spiegel. Der Vergleich ist
  // standardmäßig aus und verändert keine Anzeige. Aktivieren nur zur Diagnose über
  // ?nwTsFeatureVisibilityShadow=1 oder localStorage.nwTsFeatureVisibilityShadow='1'.
  try {
    nwRunTsFeatureVisibilityShadowCheck(c, stateSnapshot, {
      hasEvcs: evcsAvailable,
      hasStorageFarm: storageFarmAvailable,
      hasSmartHome: nwSmartHomeFeatureFromConfig(c),
      hasWeather: true,
      hasAiAdvisor: true,
    });
  } catch (_e) {}
}
/**
 * Code-Teil: nwFormatDashboardTimestamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFormatDashboardTimestamp(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return '--';
  const d = new Date(n);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${mi}:${ss}`;
}
/**
 * Code-Teil: nwLatestStateTimestamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLatestStateTimestamp(keys) {
  const st = window.latestState || state || {};
  let best = 0;
  /**
   * Code-Teil: scanKey
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const scanKey = (k) => {
    const rec = st && st[k];
    const ts = rec && Number(rec.ts);
    if (Number.isFinite(ts) && ts > best) best = ts;
  };
  if (Array.isArray(keys)) keys.forEach(scanKey);
  if (!best) {
    try {
      Object.keys(st || {}).forEach((k) => {
        const ts = Number(st[k] && st[k].ts);
        if (Number.isFinite(ts) && ts > best) best = ts;
      });
    } catch (_e) {}
  }
  return best || Date.now();
}
/**
 * Code-Teil: nwSetLiveOnline
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetLiveOnline(isOnline) {
  const online = !!isOnline;
  setText('sideConnection', online ? 'Online' : 'Offline');
  setText('sideStatusText', online ? 'Alle Systeme normal' : 'Verbindung wird aufgebaut');
  const dot = document.getElementById('sideLiveDot');
  if (dot) dot.classList.toggle('is-offline', !online);
}
/**
 * Code-Teil: updateDashboardShellUi
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateDashboardShellUi(data) {
  const snap = data || {};
  const d = typeof snap.d === 'function' ? snap.d : ((k) => (window.latestState || state || {})[k]?.value);

  const liveDot = document.getElementById('liveDot');
  nwSetLiveOnline(!liveDot || liveDot.classList.contains('live'));

  const pv = Number(snap.pv ?? d('pvPower') ?? d('productionTotal') ?? 0) || 0;
  const buy = Number(snap.buy ?? 0) || 0;
  const sell = Number(snap.sell ?? 0) || 0;
  const load = Number(snap.load ?? d('consumptionTotal') ?? 0) || 0;
  const charge = Math.max(0, Number(snap.charge ?? 0) || 0);
  const discharge = Math.max(0, Number(snap.discharge ?? 0) || 0);
  const batterySigned = discharge - charge;
  const evcsAvailable = nwEvcsFeatureFromConfig();
  const evcsPower = evcsAvailable ? (Number(snap.evcsPower ?? d('consumptionEvcs') ?? d('evcsPower') ?? 0) || 0) : 0;
  try { nwApplyCustomerFeatureVisibility(window.__nwCfg || {}, window.latestState || state || {}); } catch (_e) {}

  const soc = (snap.socN !== undefined && snap.socN !== null) ? Number(snap.socN) : coerceNumber(d('storageSoc'));
  const autarky = (snap.autarkyN !== undefined && snap.autarkyN !== null) ? Number(snap.autarkyN) : coerceNumber(d('autarky'));
  const selfc = (snap.selfcN !== undefined && snap.selfcN !== null) ? Number(snap.selfcN) : coerceNumber(d('selfConsumption'));

  setText('sideStorage', Number.isFinite(soc) ? `${Math.round(soc)} %` : '-- %');
  setText('sideBatterySoc', Number.isFinite(soc) ? `${Math.round(soc)} %` : '-- %');
  const p14 = !!d('ems.core.para14aActive') || !!d('para14a.active'), peak = String(d('peakShaving.control.status') || '').trim(), safety = String(d('chargingManagement.audit.safetyStage') || '').trim(), p14Fallback = d('para14a.communicationFallbackActive') === true;
  setText('sideEms', safety === 'EOS-SAFETY-STOP' ? 'Safety aktiv' : 'Aktiv');
  setText('sideGridStatus', p14Fallback ? '§14a Fallback' : (p14 ? '§14a aktiv' : (peak === 'active' ? 'Peak aktiv' : 'Stabil')));
  try { window.NexoWattLpStatusPresenter?.render(d, evcsAvailable); } catch (_eChargingStatus) {}

  setText('sideConsumptionTotal', formatFlowPower(Math.max(0, load)));
  setText('sideSelfConsumption', Number.isFinite(selfc) ? `${Math.round(selfc)} %` : '-- %');
  setText('sideAutarky', Number.isFinite(autarky) ? `${Math.round(autarky)} %` : '-- %');
  setText('sideCo2Savings', snap.co2Text || '--');

  setText('sidePvPower', formatFlowPower(Math.abs(pv)));
  setText('sideBuildingPower', formatFlowPower(Math.max(0, load)));
  setText('sideGridBuyPower', formatFlowPower(Math.max(0, buy)));
  setText('sideGridSellPower', formatFlowPower(Math.max(0, sell)));
  setText('sideBatteryPower', (batterySigned < 0 ? '-' : '') + formatFlowPower(Math.abs(batterySigned)));
  if (evcsAvailable) setText('sideEvcsPower', formatFlowPower(Math.abs(evcsPower)));

  const ts = nwLatestStateTimestamp([
    'pvPower', 'productionTotal', 'consumptionTotal', 'gridPower', 'gridBuyPower',
    'gridSellPower', 'storageSoc', 'storagePower', 'consumptionEvcs'
  ]);
  setText('sideTimestamp', nwFormatDashboardTimestamp(ts));
}

// ------------------------------
// Energiefluss: dynamische Extra-Kreise (Verbraucher/Erzeuger)
// ------------------------------
/**
 * Code-Teil: _svgEl
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _svgEl(tag, attrs){
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) {
    for (const [k,v] of Object.entries(attrs)) {
      if (v === undefined || v === null) continue;
      el.setAttribute(k, String(v));
    }
  }
  return el;
}
/**
 * Code-Teil: initEnergyWebExtras
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initEnergyWebExtras(flowSlots){
  // Optional additional producers/consumers for the Energy-Flow monitor.
  // They are configured in the App-Center (Energiefluss-Monitor -> Verbraucher/Erzeuger).
  // Only mapped items (a datapoint is selected) will be rendered.

  const maxConsumers = 9;
  const maxProducers = 5;

  // Backward compatible: older builds used flowOptionalConsumers/flowOptionalProducers
  const consumersAll = (flowSlots && (flowSlots.consumers || flowSlots.flowOptionalConsumers)) ? (flowSlots.consumers || flowSlots.flowOptionalConsumers) : [];
  const producersAll = (flowSlots && (flowSlots.producers || flowSlots.flowOptionalProducers)) ? (flowSlots.producers || flowSlots.flowOptionalProducers) : [];
  const consumers = consumersAll.filter(x => x && x.mapped).slice(0, maxConsumers);
  const producers = producersAll.filter(x => x && x.mapped).slice(0, maxProducers);

  // keep meta information (e.g. EVCS availability)
  // (newer builds expose this as flowSlots.meta.evcsAvailable)
  flowExtras = {
    consumers: [],
    producers: [],
    special: [],
    meta: {
      evcsAvailable: !!(flowSlots && ((flowSlots.meta && flowSlots.meta.evcsAvailable) || flowSlots.evcsAvailable)) && nwEvcsFeatureFromConfig(Object.assign({}, window.__nwCfg || {}, { flowSlots: flowSlots }))
    }
  };

  const gNodes = document.getElementById('flowExtraNodes');
  const gLines = document.getElementById('flowExtraLines');
  if (!gNodes || !gLines) return;

  // reset existing
  gNodes.innerHTML = '';
  gLines.innerHTML = '';

  // --- dynamic sizing to keep everything inside the tile ---
  const nCons = consumers.length;
  const nProd = producers.length;

  // The monitor should use more of the tile when only a few nodes are visible,
  // but scale down step by step once additional consumers/producers are added.
  // The actual CSS vars are applied at the end after specials + EVCS visibility are known.

  // Circle sizing:
  // Keep optional nodes readable while reserving more whitespace for labels.
  // Producers in particular tend to have longer labels (e.g. "Erzeuger X").
  const optionalDensity = Math.max(nCons, nProd);
  const rConsumer = (optionalDensity >= 9) ? 22 : (optionalDensity >= 7) ? 24 : (optionalDensity >= 5) ? 28 : 34;
  const rProducer = rConsumer; // same size as consumers (optically consistent)

  // anchor points (must match SVG positions)
  const ANCHOR_BUILDING = { x: 300, y: 300 };
  const ANCHOR_PV = { x: 300, y: 160 };

  // Respect the SVG viewBox (the energy-flow tile can be widened without changing Y-space).
  // This keeps the placement logic robust if the viewBox is adjusted in the markup.
  const svg = document.getElementById('energyWebSvg');
  const vb = (svg && svg.viewBox && svg.viewBox.baseVal) ? svg.viewBox.baseVal : null;

  let VB_MIN_X = 0;
  let VB_MIN_Y = 0;
  let VB_W = 600;
  let VB_H = 600;

  // Prefer the parsed viewBox (fast path), but fall back to the raw attribute if needed.
  if (
    vb &&
    Number.isFinite(vb.x) &&
    Number.isFinite(vb.y) &&
    Number.isFinite(vb.width) &&
    Number.isFinite(vb.height) &&
    vb.width > 0 &&
    vb.height > 0
  ) {
    VB_MIN_X = vb.x;
    VB_MIN_Y = vb.y;
    VB_W = vb.width;
    VB_H = vb.height;
  } else if (svg) {
    const vbStr = svg.getAttribute('viewBox') || svg.getAttribute('viewbox') || '';
    const parts = vbStr.trim().split(/[ ,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      VB_MIN_X = parts[0];
      VB_MIN_Y = parts[1];
      VB_W = parts[2];
      VB_H = parts[3];
    }
  }
  const VB_MAX_X = VB_MIN_X + VB_W;
  const VB_MAX_Y = VB_MIN_Y + VB_H;

  /**
   * Code-Teil: Arrow-Funktion `placeItem`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: placeItem
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const placeItem = (item, x, y, kind, idx, rNode) => {
    const isProducer = kind === 'producer';
    const idBase = `${kind}${idx + 1}`;
    const nodeId = `node_${idBase}`;
    const lineId = `line_${idBase}`;
    const valId = `val_${idBase}`;

    // stateKey is the key used in the /api/state payload
    // (e.g. 'consumer1Power', 'producer2Power', 'consumptionHeating' ...)
    const stateKey = (item && (item.stateKey || item.dpKey || item.key)) ? String(item.stateKey || item.dpKey || item.key) : '';

    const lineClass = isProducer ? 'flow pv extra' : 'flow consumer extra';

    // Flow direction:
    // - producers: from producer -> PV (incoming to PV)
    // - consumers: from building -> consumer (outgoing from building)
    const x1 = isProducer ? x : ANCHOR_BUILDING.x;
    const y1 = isProducer ? y : ANCHOR_BUILDING.y;
    const x2 = isProducer ? ANCHOR_PV.x : x;
    const y2 = isProducer ? ANCHOR_PV.y : y;

    // line (created with coordinates right away; updateEnergyWebExtras only updates opacity)
    const line = _svgEl('line', {
      id: lineId,
      class: lineClass,
      x1,
      y1,
      x2,
      y2
    });
    gLines.appendChild(line);

    // node
    const g = _svgEl('g', { id: nodeId, class: `node extra ${kind}` });
    g.setAttribute('transform', `translate(${x},${y})`);

    // Label (truncate very long names to avoid overlaps; full name on hover via <title>)
    const rawLabel = (item && item.name) ? String(item.name) : (isProducer ? `PV${idx + 1}` : `Verbrauch${idx + 1}`);
    const maxLabelLen = isProducer ? 14 : 14;
    const shortLabel = (rawLabel.length > maxLabelLen) ? (rawLabel.slice(0, Math.max(0, maxLabelLen - 1)) + '…') : rawLabel;
    if (shortLabel !== rawLabel) {
      const titleEl = _svgEl('title');
      titleEl.textContent = rawLabel;
      g.appendChild(titleEl);
    }

    const ring = _svgEl('circle', { class: `ring ${kind}`, r: rNode });
    g.appendChild(ring);

    // watermark icon (emoji)
    const icoVal = (item && item.icon) ? String(item.icon) : '';
    const ico = icoVal || (isProducer ? '⚡' : '🔌');
    const icoText = _svgEl('text', { class: 'ico', y: 6, 'text-anchor': 'middle' });
    const tspan = _svgEl('tspan', { class: 'icoTxt' });
    tspan.textContent = ico;
    icoText.appendChild(tspan);
    g.appendChild(icoText);

    // value above
    const valEl = _svgEl('text', { id: valId, class: 'val', y: -(rNode + 8), 'text-anchor': 'middle' });
    valEl.textContent = formatFlowPower(0);
    g.appendChild(valEl);

    // label below
    const lblEl = _svgEl('text', { class: 'lbl', y: (rNode + 16), 'text-anchor': 'middle' });
    lblEl.textContent = shortLabel;
    g.appendChild(lblEl);

    gNodes.appendChild(g);

    // Enable click-to-open control modal for steerable (QC-enabled) slots.
    // This matches the UX of the EVCS node and makes *all* steerable devices accessible
    // directly from the Energiefluss view.
    try {
      if (item && item.qc && item.qc.enabled) {
        g.classList.add('clickable');
        g.style.cursor = 'pointer';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an g. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        g.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const openKind = (kind === 'producers' || kind === 'producer') ? 'producer' : 'consumer';
      const openIdx = (item && item.idx != null) ? Number(item.idx) : (idx + 1);
      openFlowQc(openKind, openIdx);
        });
      }
    } catch(_e) {}

    const slot = {
      idx: (item && item.idx != null) ? Number(item.idx) : (idx + 1),
      key: item && item.key != null ? item.key : undefined,
      stateKey,
      name: item && item.name != null ? item.name : undefined,
      icon: item && item.icon != null ? item.icon : undefined,
      consumerType: item && item.consumerType != null ? item.consumerType : undefined,
      qc: item && item.qc ? item.qc : undefined,
      nodeId,
      valId,
      lineId,
      kind
    };

    if (isProducer) flowExtras.producers.push(slot);
    else flowExtras.consumers.push(slot);
  };



// --- Special producers (BHKW / Generator) ---
// Reserved lower-left area between grid and battery.
/**
 * Code-Teil: Arrow-Funktion `_readTranslate`
 * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: _readTranslate
 * Zweck: Liest interne Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const _readTranslate = (id, fallback) => {
  try {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const tr = el.getAttribute('transform') || '';
    const m = tr.match(/translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
    if (m) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    }
  } catch(_e) {}
  return fallback;
};

/**
 * Code-Teil: Arrow-Funktion `placeSpecialProducer`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: placeSpecialProducer
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const placeSpecialProducer = (item, x, y, role, rNode) => {
  const safeRole = String(role || 'special').replace(/[^a-zA-Z0-9_-]/g, '');
  const nodeId = `node_special_${safeRole}`;
  const lineId = `line_special_${safeRole}`;
  const valId  = `val_special_${safeRole}`;

  // line: from special producer -> building
  const line = _svgEl('line', {
    id: lineId,
    class: 'flow battery extra',
    x1: x,
    y1: y,
    x2: ANCHOR_BUILDING.x,
    y2: ANCHOR_BUILDING.y
  });
  gLines.appendChild(line);

  const g = _svgEl('g', { id: nodeId, class: `node extra producer special ${safeRole}` });
  g.setAttribute('transform', `translate(${x},${y})`);

  // label (truncate very long names; full name on hover via <title>)
  const rawLabel = (item && item.name) ? String(item.name) : (safeRole === 'bhkw' ? 'BHKW' : (safeRole === 'generator' ? 'Generator' : 'Erzeuger'));
  const maxLabelLen = 14;
  const shortLabel = (rawLabel.length > maxLabelLen) ? (rawLabel.slice(0, Math.max(0, maxLabelLen - 1)) + '…') : rawLabel;
  if (shortLabel !== rawLabel) {
    const titleEl = _svgEl('title');
    titleEl.textContent = rawLabel;
    g.appendChild(titleEl);
  }

  const ring = _svgEl('circle', { class: 'ring battery', r: rNode });
  g.appendChild(ring);

  // watermark icon (emoji)
  const icoVal = (item && item.icon) ? String(item.icon) : '';
  const ico = icoVal || (safeRole === 'bhkw' ? '🏭' : (safeRole === 'generator' ? '⚙️' : '⚡'));
  const icoText = _svgEl('text', { class: 'ico', y: 6, 'text-anchor': 'middle' });
  const tspan = _svgEl('tspan', { class: 'icoTxt' });
  tspan.textContent = ico;
  icoText.appendChild(tspan);
  g.appendChild(icoText);

  // value above
  const valEl = _svgEl('text', { id: valId, class: 'val', y: -(rNode + 8), 'text-anchor': 'middle' });
  valEl.textContent = formatFlowPower(0);
  g.appendChild(valEl);

  // label below
  const lblEl = _svgEl('text', { class: 'lbl', y: (rNode + 16), 'text-anchor': 'middle' });
  lblEl.textContent = shortLabel;
  g.appendChild(lblEl);

  gNodes.appendChild(g);

  flowExtras.special.push({
    role: safeRole,
    devices: (item && Array.isArray(item.devices)) ? item.devices : [],
    nodeId,
    valId,
    lineId
  });
};

/**
 * Code-Teil: Arrow-Funktion `placeSpecialLowerLeftArc`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: placeSpecialLowerLeftArc
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const placeSpecialLowerLeftArc = (items) => {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return;

  // Place specials (BHKW / Generator) on the lower-left arc of the same ellipse ring.
  // This keeps the outer circle "clean" and avoids crowding between grid and battery.
  const n = list.length;

  // Angles (deg) in SVG coordinates (0° = right, 90° = down).
  // Two nodes: one slightly more "left" (BHKW), one slightly more "down" (Generator).
  const preset = (n === 1)
    ? [150]
    : (n === 2)
      ? [155, 140]
      : null;

  const loDeg = 165; // closer to grid/left
  const hiDeg = 120; // closer to battery/down

  // Clamp so labels never clip the viewBox
  const pad = 14;
  const xMin = VB_MIN_X + pad + rConsumer;
  const xMax = VB_MAX_X - pad - rConsumer;
  const yMin = VB_MIN_Y + pad + rConsumer + 26;
  const yMax = VB_MAX_Y - pad - rConsumer - 34;

  for (let i = 0; i < n; i++) {
    const it = list[i] || {};
    const role = it.role || (i === 0 ? 'bhkw' : 'generator');

    const aDeg = preset
      ? preset[Math.min(preset.length - 1, i)]
      : (n <= 1 ? 150 : (loDeg + (hiDeg - loDeg) * (i / (n - 1))));

    const a = aDeg * Math.PI / 180;
    let x = ringCx + rx * Math.cos(a);
    let y = ringCy + ry * Math.sin(a);

    if (Number.isFinite(xMin) && Number.isFinite(xMax)) x = Math.max(xMin, Math.min(xMax, x));
    if (Number.isFinite(yMin) && Number.isFinite(yMax)) y = Math.max(yMin, Math.min(yMax, y));

    placeSpecialProducer(it, x, y, role, rProducer);
  }
};


  // --- optional ring placement (symmetrical) ---
  // User request: producers should mirror consumers in spacing.
  // If both sides are populated, the optional nodes form a clean circle/ellipse around the center.
  const margin = 14;
  const ringCx = ANCHOR_BUILDING.x;
  const ringCy = ANCHOR_BUILDING.y;

  // Use the largest node radius so *both* producers and consumers stay within the SVG viewBox.
  const rMaxNode = Math.max(rConsumer, rProducer);

  // Ellipse radii, clamped so every node stays inside the SVG viewBox.
  const rxMaxRight = (VB_MAX_X - margin - rMaxNode) - ringCx;
  const rxMaxLeft = ringCx - (VB_MIN_X + margin + rMaxNode);
  const rx = Math.max(0, Math.min(rxMaxRight, rxMaxLeft));

  const ryMaxTop = ringCy - (VB_MIN_Y + margin + rMaxNode);
  const ryMaxBottom = (VB_MAX_Y - margin - rMaxNode) - ringCy;
  const ry = Math.max(0, Math.min(ryMaxTop, ryMaxBottom));

  // Avoid the very top/bottom so the value/label texts never clip.
  const spanDeg = 80;

  // --- responsive collision-safe placement for optional consumers ---
  // The fixed EVCS / PV / battery nodes already occupy parts of the ring.
  // Optional consumers are therefore not simply spread from -80° to +80° anymore,
  // because that can put a consumer directly above PV or close to EVCS/battery when
  // the energy-flow tile is wide.
  const xMinNode = VB_MIN_X + margin + rMaxNode;
  const xMaxNode = VB_MAX_X - margin - rMaxNode;
  const yMinNode = VB_MIN_Y + margin + rMaxNode + 26; // room for value text above
  const yMaxNode = VB_MAX_Y - margin - rMaxNode - 34; // room for label text below

  /**
   * Code-Teil: Arrow-Funktion `clampFlowPoint`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: clampFlowPoint
   * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const clampFlowPoint = (pt) => ({
    x: Math.max(xMinNode, Math.min(xMaxNode, pt.x)),
    y: Math.max(yMinNode, Math.min(yMaxNode, pt.y))
  });
  /**
   * Code-Teil: sampleAngles
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const sampleAngles = (startDeg, endDeg, count) => {
    if (count <= 0) return [];
    if (count === 1) return [Math.round((startDeg + endDeg) / 2)];
    const step = (endDeg - startDeg) / (count - 1);
    return Array.from({ length: count }, (_, i) => startDeg + step * i);
  };

  /**
   * Code-Teil: Arrow-Funktion `buildConsumerAngles`
   * Zweck: baut aus Rohdaten eine strukturierte Konfiguration, Liste oder Empfehlung.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: buildConsumerAngles
   * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const buildConsumerAngles = (count) => {
    if (count <= 0) return [];
    const evcsVisibleNow = !!(flowExtras && flowExtras.meta && flowExtras.meta.evcsAvailable);

    if (!evcsVisibleNow) {
      // If the EVCS node is hidden, the right side can be used more evenly.
      return sampleAngles(-66, 68, count);
    }

    // Keep a free corridor around the fixed EVCS node at 0° and avoid the very
    // top/bottom zones close to PV/battery. The split keeps 1..9 consumers readable.
    if (count === 1) return [-46];
    const upperCount = Math.ceil(count / 2);
    const lowerCount = count - upperCount;
    const upper = sampleAngles(-62, -30, upperCount);
    const lower = sampleAngles(30, 68, lowerCount);
    return upper.concat(lower);
  };

  /**
   * Code-Teil: Arrow-Funktion `nudgeAway`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: nudgeAway
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const nudgeAway = (pt, blocker, minDist) => {
    let dx = pt.x - blocker.x;
    let dy = pt.y - blocker.y;
    let dist = Math.hypot(dx, dy);
    if (!Number.isFinite(dist) || dist < 0.001) {
      dx = blocker.x <= ringCx ? 1 : -1;
      dy = 0;
      dist = 1;
    }
    if (dist >= minDist) return false;
    const push = minDist - dist;
    pt.x += (dx / dist) * push;
    pt.y += (dy / dist) * push;
    return true;
  };

  /**
   * Code-Teil: Arrow-Funktion `resolveExtraNodePoint`
   * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: resolveExtraNodePoint
   * Zweck: Wählt die richtige Datenquelle/Fallback-Logik aus.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const resolveExtraNodePoint = (kind, x, y, rNode, placed) => {
    const pt = clampFlowPoint({ x, y });
    const fixedBlockers = [
      { x: ANCHOR_BUILDING.x, y: ANCHOR_BUILDING.y, r: 44, name: 'building' },
      { x: ANCHOR_PV.x, y: ANCHOR_PV.y, r: 44, name: 'pv' },
      { x: 300, y: 460, r: 44, name: 'battery' }
    ];
    if (flowExtras && flowExtras.meta && flowExtras.meta.evcsAvailable) {
      fixedBlockers.push({ x: 440, y: 300, r: 44, name: 'evcs' });
    }

    const blockers = fixedBlockers.concat(Array.isArray(placed) ? placed : []);
    for (let iter = 0; iter < 10; iter++) {
      let moved = false;
      for (const blocker of blockers) {
        const minDist = (blocker.r || 0) + rNode + (kind === 'consumer' ? 24 : 18);
        if (nudgeAway(pt, blocker, minDist)) moved = true;
      }
      const clamped = clampFlowPoint(pt);
      if (clamped.x !== pt.x || clamped.y !== pt.y) {
        pt.x = clamped.x;
        pt.y = clamped.y;
        moved = true;
      }
      if (!moved) break;
    }
    return pt;
  };

  // Consumers: right side, collision-safe.
  /**
   * Code-Teil: Arrow-Funktion `placeConsumersRightArc`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: placeConsumersRightArc
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const placeConsumersRightArc = (items) => {
    const n = items.length;
    if (!n) return;

    const placed = [];
    const angles = buildConsumerAngles(n);
    for (let i = 0; i < n; i++) {
      const aDeg = angles[Math.min(i, angles.length - 1)];
      const a = aDeg * Math.PI / 180;
      const baseX = ringCx + rx * Math.cos(a);
      const baseY = ringCy + ry * Math.sin(a);
      const pt = resolveExtraNodePoint('consumer', baseX, baseY, rConsumer, placed);
      placed.push({ x: pt.x, y: pt.y, r: rConsumer, name: `consumer${i + 1}` });
      placeItem(items[i], pt.x, pt.y, 'consumer', i, rConsumer);
    }
  };

  // Producers: upper-left arc (top-left -> left-middle)
  // Lower-left is reserved for future Generator/BHKW nodes.
  /**
   * Code-Teil: Arrow-Funktion `placeProducersLeftArc`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: placeProducersLeftArc
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const placeProducersLeftArc = (items) => {
    const n = items.length;
    if (!n) return;

    const startDeg = 180 + spanDeg; // top-left
    const endDeg = 180;             // left-middle (keep producers in upper area)
    const stepDeg = (n <= 1) ? 0 : ((endDeg - startDeg) / (n - 1));

    for (let i = 0; i < n; i++) {
      const aDeg = (n <= 1) ? (180 + spanDeg/2) : (startDeg + stepDeg * i);
      const a = aDeg * Math.PI / 180;
      const x = ringCx + rx * Math.cos(a);
      const y = ringCy + ry * Math.sin(a);
      placeItem(items[i], x, y, 'producer', i, rProducer);
    }
  };

  placeProducersLeftArc(producers);
  placeConsumersRightArc(consumers);


// --- BHKW / Generator (lower-left) ---
try {
  const bhkwAll = Array.isArray(window.__nwBhkwDevices) ? window.__nwBhkwDevices : [];
  const genAll  = Array.isArray(window.__nwGeneratorDevices) ? window.__nwGeneratorDevices : [];

  // For Energiefluss display we only require a valid power datapoint.
  // Start/Stop mappings are needed for control, but not for monitoring/visualization.
  const bhkwVisible = bhkwAll.filter(d => d && d.showInLive !== false && d.enabled !== false && d.hasPower);
  const genVisible  = genAll.filter(d => d && d.showInLive !== false && d.enabled !== false && d.hasPower);

  const specials = [];
  if (bhkwVisible.length) {
    specials.push({
      role: 'bhkw',
      name: (bhkwVisible.length === 1 && bhkwVisible[0] && bhkwVisible[0].name) ? String(bhkwVisible[0].name) : 'BHKW',
      icon: '🏭',
      devices: bhkwVisible
    });
  }
  if (genVisible.length) {
    specials.push({
      role: 'generator',
      name: (genVisible.length === 1 && genVisible[0] && genVisible[0].name) ? String(genVisible[0].name) : 'Generator',
      icon: '⚙️',
      devices: genVisible
    });
  }

  placeSpecialLowerLeftArc(specials);
} catch(_e) {}

  // Hide EVCS visuals if not available
  const nodeEvcs = document.getElementById('nodeEvcs');
  if (nodeEvcs) nodeEvcs.style.display = flowExtras.meta.evcsAvailable ? '' : 'none';
  const lineEvcs = document.getElementById('lineC2');
  if (lineEvcs) lineEvcs.style.display = flowExtras.meta.evcsAvailable ? '' : 'none';

  scheduleEnergyWebResponsiveLayout({
    consumers: nCons,
    producers: nProd,
    special: Array.isArray(flowExtras.special) ? flowExtras.special.length : 0,
    evcsVisible: !!flowExtras.meta.evcsAvailable
  });
}
/**
 * Code-Teil: isHeatingRodFlowItem
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isHeatingRodFlowItem(it){
  try {
    const t = String((it && (it.consumerType || it.type || it.category)) || '').toLowerCase();
    const ck = String((it && it.qc && it.qc.controlKind) || '').toLowerCase();
    return t === 'heatingrod' || t === 'heating_rod' || t === 'heating-rod' || t === 'heizstab' || ck === 'heatingrod' || ck === 'heating_rod' || ck === 'heating-rod';
  } catch(_e) { return false; }
}
/**
 * Code-Teil: resolveHeatingRodFlowPower
 * Zweck: Wählt die richtige Datenquelle/Fallback-Logik aus.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function resolveHeatingRodFlowPower(it, d, fallbackRaw){
  const idx = Math.max(1, Math.round(Number(it && it.idx) || 0));
  /**
   * Code-Teil: readN
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const readN = (key) => {
    try {
      const n = Number(d(key));
      return Number.isFinite(n) ? n : NaN;
    } catch(_e) { return NaN; }
  };
  const measured = readN(`heatingRod.devices.c${idx}.measuredW`);
  const applied = readN(`heatingRod.devices.c${idx}.appliedW`);
  const target = readN(`heatingRod.devices.c${idx}.targetW`);
  const maxPower = readN(`heatingRod.devices.c${idx}.maxPowerW`);
  let valueW = NaN;

  // Der im Energiefluss manuell zugeordnete Verbraucher-DP ist die primaere
  // Anzeigequelle. Insbesondere ist ein gueltiger Messwert 0 W eine echte
  // Messung und darf nicht durch nominale Stufen-/Sollleistungen ersetzt werden.
  if (Number.isFinite(fallbackRaw)) valueW = Math.abs(fallbackRaw);
  else if (Number.isFinite(measured)) valueW = Math.abs(measured);
  else if (Number.isFinite(applied) && applied > 0) valueW = applied;
  else if (Number.isFinite(target) && target > 0) valueW = target;
  else valueW = 0;

  return {
    valueW: Math.max(0, valueW),
    maxPowerW: Number.isFinite(maxPower) && maxPower > 0 ? maxPower : 0
  };
}
/**
 * Code-Teil: updateEnergyWebExtras
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateEnergyWebExtras(d){
  let consumersSum = 0;
  /**
   * Code-Teil: show
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const show = (id, abs) => {
    const el = document.getElementById(id);
    if (!el) return;
    const a = Math.max(0, Number(abs) || 0);
    // ähnliche Skala wie Hauptlinien, aber etwas feiner für kleine Verbraucher
    const v = Math.min(1, a / 2000);
    el.style.opacity = (a > 1) ? String(0.15 + 0.85 * v) : '0.15';
  };
  /**
   * Code-Teil: Arrow-Funktion `setRev`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: setRev
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setRev = (id, rev) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('rev', !!rev);
  };
  /**
   * Code-Teil: setNodeActive
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setNodeActive = (nodeId, active) => {
    const el = document.getElementById(nodeId);
    if (!el) return;
    el.style.opacity = active ? '1' : '0.45';
  };

  // Produzenten
  if (flowExtras && Array.isArray(flowExtras.producers)) {
    for (const it of flowExtras.producers) {
      const raw = Number(d(it.stateKey)) || 0;
      const abs = stabilizeFlowAbs(`extra:producer:${it.stateKey || it.lineId || it.nodeId}`, Math.abs(raw));
      setText(it.valId, formatFlowPower(abs));
      show(it.lineId, abs);
      // Erzeugung soll optisch immer "zum Gebäude" laufen (keine Richtungsumschaltung).
      // Das verhindert Flackern durch Vorzeichen-Schwankungen um 0W oder uneinheitliche Vorzeichenkonventionen.
      setRev(it.lineId, false);
      setNodeActive(it.nodeId, abs > 0);
    }
  }



// BHKW / Generator (special producers)
/**
 * Code-Teil: Arrow-Funktion `sumSpecialPower`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: sumSpecialPower
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const sumSpecialPower = (role, devices) => {
  const r = String(role || '').toLowerCase();
  const pre = (r === 'bhkw') ? 'bhkw.devices.b' : (r === 'generator') ? 'generator.devices.g' : '';
  if (!pre || !Array.isArray(devices)) return 0;
  let sum = 0;
  for (const dev of devices) {
    const idx = Number(dev && dev.idx);
    if (!idx) continue;
    const v0 = Number(d(`${pre}${idx}.powerW`));
    if (Number.isFinite(v0)) sum += v0;
  }
  return sum;
};

if (flowExtras && Array.isArray(flowExtras.special)) {
  for (const it of flowExtras.special) {
    const raw = sumSpecialPower(it.role, it.devices);
    const abs = stabilizeFlowAbs(`extra:special:${it.role}:${it.lineId || it.nodeId}`, Math.abs(raw));
    setText(it.valId, formatFlowPower(abs));
    show(it.lineId, abs);
    // BHKW/Generator: Erzeugung immer zum Gebäude (keine Richtungsumschaltung)
    setRev(it.lineId, false);
    setNodeActive(it.nodeId, abs > 0);
  }
}

  // Verbraucher
  if (flowExtras && Array.isArray(flowExtras.consumers)) {
    for (const it of flowExtras.consumers) {
      const rawCandidate = d(it.stateKey);
      const rawBase = (rawCandidate === null || rawCandidate === undefined || rawCandidate === '')
        ? NaN
        : Number(rawCandidate);
      if (isHeatingRodFlowItem(it)) {
        const rodPower = resolveHeatingRodFlowPower(it, d, rawBase);
        const abs = stabilizeFlowAbs(`extra:consumer:heatingRod:c${it.idx || it.stateKey || it.lineId || it.nodeId}`, Math.abs(rodPower.valueW));
        consumersSum += abs;
        setText(it.valId, formatFlowPower(abs));
        show(it.lineId, abs);
        // Heizstab ist immer Verbraucher: Richtung stabil Gebäude -> Heizstab.
        setRev(it.lineId, false);
        setNodeActive(it.nodeId, abs > 0);
        continue;
      }

      const raw = rawBase;
      const val = stabilizeFlowSigned(`extra:consumer:${it.stateKey || it.lineId || it.nodeId}`, raw);
      const abs = Math.abs(val);
      consumersSum += abs;
      setText(it.valId, formatFlowPower(abs));
      show(it.lineId, abs);
      setRev(it.lineId, val < 0);
      setNodeActive(it.nodeId, abs > 0);
    }
  }

  return consumersSum;
}
/**
 * Code-Teil: setRingSegment
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setRingSegment(cls, pct) {
  const max = 2 * Math.PI * 42; // circumference
  const v = Math.max(0, Math.min(100, pct || 0));
  const dash = (v / 100) * max;
  const rest = max - dash;
  const el = document.querySelector?.('.ring .seg.' + cls);
  if (el) el.setAttribute('stroke-dasharray', `${dash} ${rest}`);
}

// Abschnitt: Ableitung der zentralen LIVE-Werte. Hier werden PV, Netz, Speicher, Verbrauch und KPIs für das Dashboard zusammengeführt.
/**
 * Code-Teil: computeDerived
 * Zweck: Berechnet abgeleitete Werte.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function computeDerived() {
  // derive some percentages if not provided
  const pv = pick('pvPower', 'productionTotal');
  const load = pick('consumptionTotal');
  const batteryFlow = getNormalizedBatteryFlow();
  const charge = Number(batteryFlow.chargeW) || 0;
  const discharge = Number(batteryFlow.dischargeW) || 0;
  const gridMeta = getGridImportExport((k) => get(k));
  const rawBuy = gridMeta.rawBuy;
  const rawSell = gridMeta.rawSell;
  const rawNet = gridMeta.rawNet;
  const haveGridInfo = !!gridMeta.hasGridInfo;
  const { buy, sell } = gridMeta;


  const res = {};
  if (load != null) {
    let pct = null;
    if (haveGridInfo) {
      // Live-Autarkie physikalisch aus Verbrauch vs. Netzbezug ableiten.
      // Dadurch läuft die Kachel korrekt mit, wenn Batterie oder PV den
      // Verbrauch decken und am Netzanschlusspunkt 0 W Bezug anliegt.
      const localSupply = Math.max(0, load - Math.max(0, buy || 0));
      pct = load > 0 ? (localSupply / load) * 100 : 0;
    } else {
      // Fallback nur dann verwenden, wenn noch kein Netz-DP eingetroffen ist.
      const localPv = pv != null ? Math.max(0, pv - Math.max(0, sell || 0)) : 0;
      const batterySupport = Math.max(0, (discharge || 0) - (charge || 0));
      const localSupply = Math.max(0, Math.min(load, localPv + batterySupport));
      pct = load > 0 ? (localSupply / load) * 100 : 0;
    }
    res.autarky = Math.max(0, Math.min(100, pct || 0));
  }
  if (pv != null) {
    // share of production used locally (pv - sell)/pv
    const local = Math.max(0, pv - (sell || 0));
    const pct = pv > 0 ? (local / pv) * 100 : 0;
    res.selfConsumption = Math.max(0, Math.min(100, pct));
  }
  return res;
  /**
   * Code-Teil: get
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function get(k){ return state[k]?.value; }
  /**
   * Code-Teil: pick
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function pick(...keys){
    for (const k of keys) {
      const n = coerceNumber(get(k));
      if (n != null) return n;
    }
    return null;
  }
}
/**
 * Code-Teil: coerceNumber
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function coerceNumber(v){
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  // allow "19", "19.5", "19,5", "19 %"
  const cleaned = s.replace(/%/g, '').replace(/\s+/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}
/**
 * Code-Teil: clamp01
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clamp01(v, lo, hi){
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  return Math.max(lo, Math.min(hi, v));
}
/**
 * Code-Teil: isMappedDatapoint
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isMappedDatapoint(key) {
  try {
    const cfg = window.__nwCfg || {};
    const flags = (cfg && cfg.datapointFlags && typeof cfg.datapointFlags === 'object') ? cfg.datapointFlags : null;
    if (flags && Object.prototype.hasOwnProperty.call(flags, key)) {
      return !!flags[key];
    }
    const dps = (cfg && cfg.datapoints && typeof cfg.datapoints === 'object') ? cfg.datapoints : null;
    if (dps && Object.prototype.hasOwnProperty.call(dps, key)) {
      return !!String(dps[key] == null ? '' : dps[key]).trim();
    }
  } catch (_e) {}
  return false;
}
/**
 * Code-Teil: getGridImportExport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getGridImportExport(read) {
  const getter = (typeof read === 'function') ? read : (k) => read?.[k]?.value;
  const buyMapped = isMappedDatapoint('gridBuyPower');
  const sellMapped = isMappedDatapoint('gridSellPower');
  const netMapped = isMappedDatapoint('gridPointPower');

  // IMPORTANT:
  // gridBuyPower/gridSellPower can be mirrored fallback values from a previous tick.
  // When only the signed NVP datapoint is configured, prefer the current signed net
  // value. Also ignore stale gridPointPower state values when the NVP override is not
  // mapped anymore.
  let buy = buyMapped ? coerceNumber(getter('gridBuyPower')) : null;
  let sell = sellMapped ? coerceNumber(getter('gridSellPower')) : null;
  const net = netMapped ? coerceNumber(getter('gridPointPower')) : null;

  if (net !== null) {
    if (!buyMapped || buy === null) buy = Math.max(0, net);
    if (!sellMapped || sell === null) sell = Math.max(0, -net);
  }

  return {
    rawBuy: buy,
    rawSell: sell,
    rawNet: net,
    hasGridInfo: (buy !== null) || (sell !== null) || (net !== null) || buyMapped || sellMapped || netMapped,
    buy: Math.max(0, buy ?? 0),
    sell: Math.max(0, sell ?? 0),
    net: net !== null ? net : (Math.max(0, buy ?? 0) - Math.max(0, sell ?? 0)),
  };
}
/**
 * Code-Teil: getStateAgeMs
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getStateAgeMs(key) {
  try {
    const rec = state && state[key];
    const ts = Number(rec && rec.ts);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    return Math.max(0, Date.now() - ts);
  } catch (_e) {
    return null;
  }
}
/**
 * Code-Teil: getFlowFreshMaxAgeMs
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getFlowFreshMaxAgeMs() {
  try {
    const stateVal = coerceNumber(state && state['settings.deviceStaleTimeoutSec'] && state['settings.deviceStaleTimeoutSec'].value);
    const cfgVal = coerceNumber(window.__nwCfg && window.__nwCfg.settings && window.__nwCfg.settings.deviceStaleTimeoutSec);
    const sec = stateVal != null && stateVal > 0 ? stateVal : (cfgVal != null && cfgVal > 0 ? cfgVal : 300);
    return Math.max(10000, Math.round(sec * 1000));
  } catch (_e) {
    return 300000;
  }
}
/**
 * Code-Teil: getFreshFlowNumber
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getFreshFlowNumber(key, opts = {}) {
  if (opts.onlyIfMapped && !isMappedDatapoint(key)) return null;
  const rec = state && state[key];
  if (!rec) return null;
  const n = coerceNumber(rec.value);
  if (n === null) return null;
  const maxAgeMs = opts.maxAgeMs === undefined ? getFlowFreshMaxAgeMs() : opts.maxAgeMs;
  const age = getStateAgeMs(key);
  if (Number.isFinite(Number(maxAgeMs)) && Number(maxAgeMs) > 0 && age !== null && age > Number(maxAgeMs)) return null;
  return n;
}
/**
 * Code-Teil: getStableFlowNumber
 * Zweck: Verarbeitet Energiefluss-/Budgetwerte und beeinflusst Live-Anzeige sowie History.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getStableFlowNumber(key, opts = {}) {
  // Kern-Energiefluss-DPs dürfen nicht als fehlend gelten, nur weil ein konstanter
  // Wert (typisch 0 W bei Speicher Laden/Entladen) lange nicht geändert wurde.
  return getFreshFlowNumber(key, Object.assign({}, opts, { maxAgeMs: null }));
}
/**
 * Code-Teil: getConfiguredDatapointId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getConfiguredDatapointId(key) {
  try {
    const cfg = window.__nwCfg || {};
    const dps = cfg && cfg.datapoints && typeof cfg.datapoints === 'object' ? cfg.datapoints : {};
    return String(dps[key] || '').trim();
  } catch (_e) {
    return '';
  }
}
/**
 * Code-Teil: getBalanceDerivedBatteryFlow
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getBalanceDerivedBatteryFlow(opts = {}) {
  try {
    const deadbandW = Number.isFinite(Number(opts.deadbandW)) ? Math.max(0, Number(opts.deadbandW)) : 180;
    const st = state || window.latestState || {};
    /**
     * Code-Teil: read
     * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const read = (k) => st && st[k] ? st[k].value : undefined;

    // In Speicherfarm-Anlagen sind die Farm-Summen die Quelle der Wahrheit.
    if (nwStorageFarmFeatureFromConfig(window.__nwCfg || {}, st)) return null;

    const soc = coerceNumber(read('storageSoc') ?? read('batterySOC'));
    if (soc === null) return null;

    // Nur aus der Bilanz ableiten, wenn eine echte Verbrauchsleistung gemappt ist.
    // Sonst würden wir aus einem bereits abgeleiteten consumptionTotal wieder zurückrechnen.
    const hasDirectLoad = isMappedDatapoint('consumptionTotal') || isMappedDatapoint('housePower');
    if (!hasDirectLoad) return null;

    const load = coerceNumber(read('consumptionTotal') ?? read('housePower'));
    if (load === null) return null;

    const grid = getGridImportExport(read);
    if (!grid || !grid.hasGridInfo) return null;

    let pv = coerceNumber(read('pvPower'));
    if (pv === null && isMappedDatapoint('productionTotal')) pv = coerceNumber(read('productionTotal'));
    if (pv === null) return null;

    let production = Math.max(0, Math.abs(Number(pv) || 0));
    for (let i = 1; i <= 5; i++) {
      const p = coerceNumber(read(`producer${i}Power`));
      if (p !== null) production += Math.max(0, Math.abs(p));
    }

    const signed = Math.round((Math.max(0, load) - production - Math.max(0, grid.buy || 0) + Math.max(0, grid.sell || 0)));
    if (!Number.isFinite(signed) || Math.abs(signed) <= deadbandW) return null;

    // Plausibilitätsbremsen gegen kurze Messversätze oder unbekannte Verbraucher.
    const activity = production + Math.max(0, load) + Math.max(0, grid.buy || 0) + Math.max(0, grid.sell || 0);
    if (activity < 500) return null;
    if (Math.abs(signed) > Math.max(3000, activity * 1.15)) return null;
    if (signed < 0 && soc >= 99.5) return null;
    if (signed > 0 && soc <= 0.5) return null;

    return {
      chargeW: signed < 0 ? Math.abs(signed) : 0,
      dischargeW: signed > 0 ? signed : 0,
      signedW: signed,
      src: 'balanceDerived',
      inverted: false,
      derived: true
    };
  } catch (_e) {
    return null;
  }
}
/**
 * Code-Teil: preferBalanceDerivedBatteryFlow
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function preferBalanceDerivedBatteryFlow(current, opts = {}) {
  try {
    const deadbandW = Number.isFinite(Number(opts.deadbandW)) ? Math.max(180, Number(opts.deadbandW)) : 180;
    const src = String(current && current.src || '');
    const missingLike = !current || src === 'missing' || src === 'stale-or-missing' || current.incomplete === true;
    if (!missingLike) return current;
    const derived = getBalanceDerivedBatteryFlow({ deadbandW });
    if (!derived) return current;
    return Object.assign({}, derived, {
      src: String(derived.src || 'balanceDerived') + (current && current.incomplete ? '+missing-side' : ''),
      fallbackFor: src || 'missing'
    });
  } catch (_e) {
    return current;
  }
}

// Abschnitt: Speicher-DP-Auflösung im Frontend. Unterstützt signed DP, getrennte Lade-/Entlade-DPs und Fallbacks; muss mit Backend-Resolvern konsistent bleiben.
/**
 * Code-Teil: getNormalizedBatteryFlow
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function getNormalizedBatteryFlow() {
  const deadbandW = 25;
  const inv = !!(state && state['settings.flowInvertBattery'] && state['settings.flowInvertBattery'].value);
  const chargeId = getConfiguredDatapointId('storageChargePower');
  const dischargeId = getConfiguredDatapointId('storageDischargePower');
  const batteryId = getConfiguredDatapointId('batteryPower');
  const chargeMapped = !!chargeId;
  const dischargeMapped = !!dischargeId;
  const batteryMapped = !!batteryId;
  const anyStorageMapped = chargeMapped || dischargeMapped || batteryMapped;
  const samePair = !!(chargeMapped && dischargeMapped && chargeId === dischargeId);

  /**
   * Code-Teil: Arrow-Funktion `fromSigned`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: fromSigned
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const fromSigned = (raw, src) => {
    let signed = Number(raw);
    if (!Number.isFinite(signed)) signed = 0;
    if (inv) signed = -signed;
    if (Math.abs(signed) <= deadbandW) signed = 0;
    return {
      chargeW: signed < 0 ? Math.abs(signed) : 0,
      dischargeW: signed > 0 ? signed : 0,
      signedW: signed,
      src,
      inverted: inv,
      fromSigned: true,
      derived: false,
    };
  };

  const sfEnabled = nwStorageFarmFeatureFromConfig(window.__nwCfg || {}, state || window.latestState || {});
  if (sfEnabled) {
    const signedFarm = getStableFlowNumber('storageFarm.totalPowerW');
    if (signedFarm !== null) {
      // Die Farm ist im Backend bereits pro Speicher auf +Entladen/-Laden normalisiert.
      // Ein globales Einzel-Speicher-Invert würde den Gesamtfluss hier doppelt drehen.
      let signed = Number(signedFarm);
      if (!Number.isFinite(signed)) signed = 0;
      if (Math.abs(signed) <= deadbandW) signed = 0;
      return {
        chargeW: signed < 0 ? Math.abs(signed) : 0,
        dischargeW: signed > 0 ? signed : 0,
        signedW: signed,
        src: 'storageFarmNet',
        inverted: false,
        fromSigned: true,
        derived: false,
      };
    }

    // Rückwärtskompatibilität für alte Adapterstände ohne totalPowerW. Auch diese
    // Brutto-States sind bereits in der Farmzeile normalisiert und werden nicht erneut
    // mit settings.flowInvertBattery vertauscht.
    const fc = getStableFlowNumber('storageFarm.totalChargePowerW');
    const fd = getStableFlowNumber('storageFarm.totalDischargePowerW');
    if (fc !== null || fd !== null) {
      let c = Math.max(0, Math.abs(Number(fc || 0)));
      let d = Math.max(0, Math.abs(Number(fd || 0)));
      if (c <= deadbandW) c = 0;
      if (d <= deadbandW) d = 0;
      return { chargeW: c, dischargeW: d, signedW: d - c, src: 'storageFarmGross', inverted: false, fromSigned: false, derived: false };
    }
  }

  // Gemappte Speicher-DPs stabil lesen: ein unveränderter 0-Wert darf nicht wegen
  // seines Alters verworfen und durch eine Bilanzrechnung ersetzt werden.
  const signedBattery = batteryMapped ? getStableFlowNumber('batteryPower') : null;
  const charge = chargeMapped ? getStableFlowNumber('storageChargePower') : null;
  const discharge = dischargeMapped ? getStableFlowNumber('storageDischargePower') : null;

  if (samePair && charge !== null) return fromSigned(charge, 'sameChargeDischargeSigned');

  if (charge !== null || discharge !== null) {
    let c = Math.max(0, Math.abs(Number(charge || 0)));
    let d = Math.max(0, Math.abs(Number(discharge || 0)));
    if (c <= deadbandW) c = 0;
    if (d <= deadbandW) d = 0;
    if (inv) { const t = c; c = d; d = t; }
    return { chargeW: c, dischargeW: d, signedW: d - c, src: inv ? 'chargeDischarge(inv)' : 'chargeDischarge', inverted: inv, fromSigned: false, derived: false };
  }

  if (signedBattery !== null) return fromSigned(signedBattery, 'batterySigned');

  // Rechen-Fallback nur bei wirklich nicht konfiguriertem Speicher-DP.
  if (!anyStorageMapped) {
    const derived = getBalanceDerivedBatteryFlow({ deadbandW: Math.max(180, deadbandW) });
    if (derived) return derived;
  }

  return { chargeW: 0, dischargeW: 0, signedW: 0, src: anyStorageMapped ? 'mapped-missing' : 'missing', inverted: inv, fromSigned: false, derived: false };
}

/**
 * Code-Teil: getCanonicalPvPowerW
 * Zweck: Nutzt bevorzugt den vom Backend zusammengeführten PV-Gesamtwert. Nur für
 * ältere Backends wird Anlagen-PV mit der Farm-PV lokal und konservativ verbunden.
 * AC-Farmwerte sind bei vorhandener Anlagen-PV ein Fallback; DC-/Hybrid-PV darf
 * addiert werden, solange sie nicht offensichtlich bereits enthalten ist.
 */
function getCanonicalPvPowerW(readValue) {
  const d = typeof readValue === 'function' ? readValue : ((key) => state[key]?.value);
  const derived = Number(d('derived.core.pv.totalW'));
  if (Number.isFinite(derived) && derived >= 0) return derived;

  let base = Number(d('pvPower') ?? d('productionTotal') ?? 0);
  if (!Number.isFinite(base)) base = 0;
  const baseAbs = Math.abs(base);
  if (!nwStorageFarmFeatureFromConfig(window.__nwCfg || {}, state || window.latestState || {})) return baseAbs;

  const farmTotal = Math.max(0, Math.abs(Number(d('storageFarm.totalPvPowerW')) || 0));
  const farmAc = Math.max(0, Math.abs(Number(d('storageFarm.totalPvAcPowerW')) || 0));
  const farmDc = Math.max(0, Math.abs(Number(d('storageFarm.totalPvDcPowerW')) || 0));
  const farmUnknown = Math.max(0, Math.abs(Number(d('storageFarm.totalPvUnknownPowerW')) || 0));
  const farmAcLike = farmAc + farmUnknown;
  if (baseAbs <= 0) return farmTotal;
  if (farmTotal <= 0) return baseAbs;

  // Kompatibilitätsfallback für alte Backends: AC-/WR-Summen und Anlagen-PV sind
  // alternative Sichten auf dieselbe Erzeugung, reine DC-/Hybrid-PV wird nur bei
  // eindeutig zusätzlichem Anteil addiert. Neue Backends liefern ohnehin derived.*.
  if (farmAcLike > 0) return Math.max(baseAbs, farmTotal);
  const relDiff = Math.abs(baseAbs - farmDc) / Math.max(1, farmDc);
  return (baseAbs >= farmDc || relDiff < 0.05) ? baseAbs : (baseAbs + farmDc);
}
// Abschnitt: Haupt-Renderlauf des LIVE-Dashboards. Alle DOM-Werte für Energiefluss, KPIs, KI-Berater und Schnellzugriffe werden hier aktualisiert.
/**
 * Code-Teil: render
 * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function render() {
  const s = state;
  /**
   * Code-Teil: d
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const d = (k) => s[k]?.value;

  // Top ring values: map PV, Grid, Load, Bat flows to percent of max for visualization
  const sfEnabled = nwStorageFarmFeatureFromConfig(window.__nwCfg || {}, s || state || {});

  // Der sichtbare PV-Wert kommt aus dem zentralen Backend-Energiefluss. Damit zeigen
  // LIVE, Historie und EMS dieselbe Farm-/Wechselrichter-Gesamtleistung.
  let pv = getCanonicalPvPowerW(d);

  const load = d('consumptionTotal');
  const { buy, sell } = getGridImportExport(d);
  const batteryFlow = getNormalizedBatteryFlow();
  let charge = Number(batteryFlow.chargeW) || 0;
  let discharge = Number(batteryFlow.dischargeW) || 0;
  let soc = d('storageSoc');

  if (sfEnabled) {
    const socAvg = d('storageFarm.totalSoc');
    const socMedian = d('storageFarm.medianSoc');
    // Im Farm‑Modus bevorzugen wir den Durchschnitt (Ø), Median bleibt als Fallback.
    if (socAvg != null && !isNaN(Number(socAvg))) soc = socAvg;
    else if (socMedian != null && !isNaN(Number(socMedian))) soc = socMedian;
  }
  const maxVal = Math.max(1, ...[pv, load, buy, sell, charge, discharge].filter(x => typeof x === 'number').map(Math.abs));
  /**
   * Code-Teil: Arrow-Funktion `pct`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: pct
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const pct = (v) => typeof v === 'number' ? (Math.abs(v) / maxVal) * 100 : 0;

  setRingSegment('pv', pct(pv));
  setRingSegment('grid', pct((buy||0)+(sell||0)));
  setRingSegment('load', pct(load));
  setRingSegment('bat', pct((charge||0)+(discharge||0)));

  setText('pvPower', formatPower(pv ?? 0));
  setText('gridBuyPower', formatPower(buy ?? 0));
  setText('gridSellPower', formatPower(sell ?? 0));
  const batPower = (charge||0) - (discharge||0);
  setText('storagePower', formatPower(batPower));
  setText('consumptionTotal', formatPower(load ?? 0));

  // Cards
  const derived = computeDerived();
  const autarky = derived.autarky ?? d('autarky');
  const selfc = derived.selfConsumption ?? d('selfConsumption');

  const autarkyN = clamp01(coerceNumber(autarky), 0, 100);
  const selfcN = clamp01(coerceNumber(selfc), 0, 100);
  const socN = clamp01(coerceNumber(soc), 0, 100);

  setWidth('autarkyBar', autarkyN ?? 0);
  setText('autarkyValue', (autarkyN != null ? autarkyN.toFixed(0) : '--') + ' %');

  setWidth('selfConsumptionBar', selfcN ?? 0);
  setWidth('selfVerbrauchBar', selfcN ?? 0);
  setText('selfConsumptionValue', (selfcN != null ? selfcN.toFixed(0) : '--') + ' %');
  setText('selfVerbrauchValue', (selfcN != null ? selfcN.toFixed(0) : '--') + ' %');

  setWidth('storageSocBar', socN ?? 0);
  setText('storageSocValue', (socN != null ? socN.toFixed(0) : '--') + ' %');

  setText('storageChargePower', formatPower(charge ?? 0));
  setText('storageLadenPower', formatPower(charge ?? 0));
  setText('storageDischargePower', formatPower(discharge ?? 0));
  setText('storageEntladenPower', formatPower(discharge ?? 0));

  setText('gridBuyPowerCard', formatPower(buy ?? 0));
  setText('gridSellPowerCard', formatPower(sell ?? 0));
  setText('gridEnergyKwh', formatEnergyKwh(d('gridEnergyKwh')));
  setText('productionEnergyKwh', formatEnergyKwh(d('productionEnergyKwh')));
  const pvEnergyKwh = coerceNumber(d('productionEnergyKwh'));
  const co2FromPvT = pvEnergyKwh != null ? (pvEnergyKwh * 0.00049) : null; // 0.49 kg CO₂ / kWh -> t CO₂ (default, configurable via DP override)
  const co2Dp = d('co2Savings');
  setText('co2Savings', (co2Dp != null ? (isNaN(Number(co2Dp)) ? String(co2Dp) : Number(co2Dp).toFixed(1) + ' t') : (co2FromPvT != null ? co2FromPvT.toFixed(1) + ' t' : '--')));


  setText('productionTotal', formatPower(d('productionTotal') ?? pv ?? 0));
  const gfN = coerceNumber(d('gridFrequency'));
  setText('gridFrequency', gfN != null ? gfN.toFixed(2) + ' Hz' : '--');

  // Energie-Wertkonto wird über updateEnergyWalletLiveUi() als Nutzerkarte gerendert.


  const evcsAvailableNow = nwEvcsFeatureFromConfig();
  setText('consumptionEvcs', evcsAvailableNow ? formatPower(d('consumptionEvcs') ?? 0) : '');
  setText('consumptionEnergyKwh', formatEnergyKwh(d('consumptionEnergyKwh')));
  setText('consumptionBuilding', formatPower(d('consumptionTotal') ?? 0));

  // EVCS status: prefer per-connector status (single wallbox) and fall back to legacy dp
  if (evcsAvailableNow) {
    const evcsSt = d('evcsStatus') ?? d('evcs.1.status') ?? d('chargingManagement.wallboxes.lp1.status') ?? '--';
    setText('evcsStatus', evcsSt);
    const lastChargeN = coerceNumber(d('evcsLastChargeKwh'));
    setText('evcsLastChargeKwh', lastChargeN != null ? lastChargeN.toFixed(2) + ' kWh' : '--');
    if (window.__evcsApply) window.__evcsApply(d, state);
  }


  // Wetter (optional) – aktiviert in FIS → Einstellungen (Wetter-App)
  try {
    const weatherEnabled = !!d('settings.weatherEnabled');
    const tileEl = document.getElementById('weatherTile');
    if (tileEl) tileEl.style.display = weatherEnabled ? '' : 'none';

    const pvRow = document.getElementById('pvForecastRow');
    const pvLineEl = document.getElementById('pvForecastLine');

    if (!weatherEnabled) {
      nwSetDisplay('sideWeatherCard', false);
      // Weather-App ist aus -> komplette Kachel ausblenden, keine UI-Hinweise
      setText('weatherTomorrow', '');
      setText('weatherUpdated', '—');
      if (pvRow) pvRow.style.display = 'none';
      if (pvLineEl) pvLineEl.textContent = '';
    } else {
      const wTemp = coerceNumber(d('weatherTempC'));
      const wText = d('weatherText');
      const wCode = coerceNumber(d('weatherCode'));
      const wWind = coerceNumber(d('weatherWindKmh'));
      const wCloud = coerceNumber(d('weatherCloudPct'));
      const wLoc = d('weatherLocation');

      // Forecast (tomorrow)
      const wTMin = coerceNumber(d('weatherTomorrowMinC'));
      const wTMax = coerceNumber(d('weatherTomorrowMaxC'));
      const wTPre = coerceNumber(d('weatherTomorrowPrecipPct'));
      const wTText = d('weatherTomorrowText');
      const wTCode = coerceNumber(d('weatherTomorrowCode'));

      // Icon
      const iconEl = document.getElementById('weatherIconCircle');
      if (iconEl) iconEl.textContent = _pickWeatherIcon(wCode, wText);

      // Location
      setText('weatherLocation', (wLoc != null && String(wLoc).trim() ? String(wLoc) : 'Standort'));

      // Values
      setText('weatherTemp', _fmtTempC(wTemp));
      const cond = (wText != null && String(wText).trim() !== '') ? String(wText) : (wCode != null ? ('Code ' + Number(wCode)) : '—');
      setText('weatherCondition', cond);
      setText('weatherWind', _fmtKmh(wWind));
      setText('weatherCloud', _fmtPct(wCloud));

      nwSetDisplay('sideWeatherCard', true);
      setText('sideWeatherIcon', _pickWeatherIcon(wCode, wText));
      setText('sideWeatherTemp', _fmtTempC(wTemp));
      setText('sideWeatherCondition', cond);
      setText('sideWeatherFeels', _fmtTempC(wTemp));
      setText('sideWeatherCloud', _fmtPct(wCloud));
      setText('sideWeatherWind', _fmtKmh(wWind));

      // Tomorrow line
      let tomorrowLine = '';
      if (wTMin != null && wTMax != null) {
        const tIcon = _pickWeatherIcon(wTCode, wTText);
        tomorrowLine = `Morgen: ${tIcon} ${Math.round(wTMin)}–${Math.round(wTMax)} °C`;
        if (wTPre != null) tomorrowLine += ` • ${Math.round(wTPre)}%`;
      }
      setText('weatherTomorrow', tomorrowLine || '');

      // Timestamp (prefer temperature, else any other weather dp)
      const wTs = s.weatherTempC?.ts || s.weatherText?.ts || s.weatherCode?.ts || s.weatherWindKmh?.ts || s.weatherCloudPct?.ts;
      setText('weatherUpdated', wTs ? ('aktualisiert ' + _fmtTimeHHmm(wTs)) : '—');

      // PV Forecast (optional): next-24h solar forecast from NexoWatt PV-Forecast manager
      try {
        const pvValidRaw = d('forecast.pv.valid');
        const pvValid = !!pvValidRaw;
        const pvKwh24 = coerceNumber(d('forecast.pv.kwhNext24h'));
        const pvPeakW = coerceNumber(d('forecast.pv.peakWNext24h'));
        const pvAgeMs = coerceNumber(d('forecast.pv.ageMs'));
        const pvStatus = d('forecast.pv.statusText');

        const pvKnown = (pvValidRaw !== undefined) || (pvStatus !== undefined);

        if (!pvKnown) {
          if (pvLineEl) pvLineEl.textContent = '';
          if (pvRow) pvRow.style.display = 'none';
        } else {
          let line = '';
          if (pvValid) {
            const kwhTxt = (pvKwh24 != null) ? (_fmtNumLocal(pvKwh24, 1) + ' kWh') : '--';
            const peakTxt = (pvPeakW != null && pvPeakW > 0) ? (_fmtNumLocal(pvPeakW / 1000, 1) + ' kW') : '';
            const ageTxt = (pvAgeMs != null && pvAgeMs > 0) ? (Math.round(pvAgeMs / 60000) + ' min') : '';
            line = '☀️ PV 24h: ' + kwhTxt;
            if (peakTxt) line += ' • Peak ' + peakTxt;
            if (ageTxt) line += ' • ' + ageTxt;
          } else {
            let st = (pvStatus != null && String(pvStatus).trim() !== '') ? String(pvStatus).trim() : 'nicht verfügbar';
            if (st.length > 80) st = st.slice(0, 77) + '…';
            line = '☀️ PV Forecast: ' + st;
          }
          if (pvLineEl) pvLineEl.textContent = line;
          if (pvRow) pvRow.style.display = '';
        }
      } catch (_e2) {
        if (pvLineEl) pvLineEl.textContent = '';
        if (pvRow) pvRow.style.display = 'none';
      }
    }
  } catch (_e) {}

  try {
    const co2TextDash = (co2Dp != null)
      ? (isNaN(Number(co2Dp)) ? String(co2Dp) : Number(co2Dp).toFixed(1) + ' t')
      : (co2FromPvT != null ? co2FromPvT.toFixed(1) + ' t' : '--');
    updateDashboardShellUi({
      d,
      pv,
      buy,
      sell,
      load,
      charge,
      discharge,
      socN,
      autarkyN,
      selfcN,
      evcsPower: nwEvcsFeatureFromConfig() ? (d('consumptionEvcs') ?? 0) : 0,
      co2Text: co2TextDash
    });
  } catch (_e) {}

  // Settings: RFID learning UI state (if present)
  try {
    if (typeof window.__nwApplyRfidLearningUi === 'function') window.__nwApplyRfidLearningUi();
  } catch (_e) {}

  try { renderSettingsLogPanel(); } catch (_e) {}

  // Speicherfarm Übersicht (read-only, Endnutzer)
  try { if (typeof storageFarmApply === 'function') storageFarmApply(); } catch (_e) {}
}

// Abschnitt: Frontend-Bootstrap. Lädt Config/States, setzt Feature-Sichtbarkeit und startet Live-Events.
/**
 * Code-Teil: bootstrap
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function bootstrap() {
  let cfg = {};
  try {
    const cfgRes = await fetch('/config');
    cfg = await cfgRes.json();
    units = cfg.units || units;

    // ioBroker-Systemsprache übernehmen: Backend liefert /config.locale aus system.config.common.language.
    try {
      const loc = cfg && cfg.locale && typeof cfg.locale === 'object' ? cfg.locale : {};
      const lang = String(loc.htmlLang || loc.language || '').trim().toLowerCase();
      if (lang) document.documentElement.setAttribute('lang', lang);
      window.__nwLocale = loc || {};
    } catch (_e) {}

    // Global config snapshot for UI helpers
    try { window.__nwCfg = cfg || {}; } catch(_e) { window.__nwCfg = {}; }
    // EMS-App Installations-/Aktiv-Status (nur Flags) – steuert dynamische Sichtbarkeit in der VIS
    try { window.__nwEmsApps = (cfg && cfg.emsApps && typeof cfg.emsApps === 'object') ? cfg.emsApps : { apps: {} }; } catch(_e) { window.__nwEmsApps = { apps: {} }; }
    try { window.__nwThresholdRules = (cfg && cfg.thresholdRules) ? cfg.thresholdRules : []; } catch(_e) { window.__nwThresholdRules = []; }
    try { window.__nwRelayControls = (cfg && cfg.relayControls) ? cfg.relayControls : []; } catch(_e) { window.__nwRelayControls = []; }
    try { window.__nwBhkwDevices = (cfg && cfg.bhkwDevices) ? cfg.bhkwDevices : []; } catch(_e) { window.__nwBhkwDevices = []; }
    try { window.__nwGeneratorDevices = (cfg && cfg.generatorDevices) ? cfg.generatorDevices : []; } catch(_e) { window.__nwGeneratorDevices = []; }

    // EMS UI flags (Phase 4.7)
    try { window.__nwEmsCfg = (cfg && cfg.ems) ? cfg.ems : {}; } catch(_e) { window.__nwEmsCfg = {}; }

    // Energiefluss: optionale Verbraucher/Erzeuger (Slots) initialisieren
    flowSlotsCfg = cfg.flowSlots || null;
    applyFlowCoreLabels();
    initEnergyWebExtras(flowSlotsCfg);
    try{
      const evcsAvailable = nwEvcsFeatureFromConfig(cfg);
      const c = evcsAvailable ? nwEvcsCountFromConfig(cfg) : 0;
      window.__nwEvcsCount = c;
      window.__nwEvcsAvailable = evcsAvailable;
      const l = document.getElementById('menuEvcsLink');
      if (l) l.classList.toggle('hidden', !(evcsAvailable && c >= 2));
      const t = document.getElementById('tabEvcs');
      if (t) t.classList.toggle('hidden', !(evcsAvailable && c >= 2));
      const sh = nwSmartHomeFeatureFromConfig(cfg);
      window.__nwSmartHomeEnabled = sh;
      const sl = document.getElementById('menuSmartHomeLink');
      if (sl) sl.classList.toggle('hidden', !sh);
      const st = document.getElementById('tabSmartHome');
      if (st) st.classList.toggle('hidden', !sh);

      // Speicherfarm Tab/Link
      const sf = nwStorageFarmFeatureFromConfig(cfg, window.latestState || state || {});
      const sft = document.getElementById('tabStorageFarm');
      if (sft) {
        sft.classList.toggle('hidden', !sf);
        sft.removeAttribute('data-tab');
        sft.onclick = function(){ window.location.href = 'storagefarm.html'; };
      }
      try { if ((new URLSearchParams(window.location.search || '')).get('tab') === 'storagefarm' && sf) window.location.replace('storagefarm.html'); } catch(_e) {}
      const sfl = document.getElementById('menuStorageFarmLink');
      if (sfl) {
        sfl.classList.toggle('hidden', !sf);
        sfl.setAttribute('href', 'storagefarm.html');
        sfl.onclick = null;
      }
      nwApplyCustomerFeatureVisibility(cfg, window.latestState || state || {});
    }catch(_e){}
  } catch (e) {
    console.warn('[config]', e);
  }
// --- Config hot-reload ----------------------------------------------------
// If the App-Center changes "installed" flags, the backend updates installer.configJson.
// We refresh /config once so tiles + Energyflow slots update without a page reload.
let lastInstallerConfigJson = null;
let cfgReloadInFlight = false;
let cfgReloadPending = false;

/**
 * Code-Teil: Arrow-Funktion `applyConfigSnapshot`
 * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: applyConfigSnapshot
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const applyConfigSnapshot = (nextCfg) => {
  cfg = nextCfg || {};
  try { window.__nwCfg = cfg || {}; } catch (_e) { window.__nwCfg = {}; }
  try { units = cfg.units || units; } catch (_e) {}

  // App-Center config
  window.__nwEmsApps = cfg.emsApps || { apps: {} };
  window.__nwThresholdRules = cfg.thresholdRules || [];
  window.__nwRelayControls = cfg.relayControls || [];
  window.__nwBhkwDevices = cfg.bhkwDevices || [];
  window.__nwGeneratorDevices = cfg.generatorDevices || [];

  // EMS config flags (used by tiles + menu visibility)
  try {
    window.__nwEmsCfg = (cfg && cfg.ems) ? cfg.ems : {};
  } catch (_e) {
    window.__nwEmsCfg = {};
  }

  // Energyflow slot mapping
    flowSlotsCfg = cfg.flowSlots || null;
    applyFlowCoreLabels();
    initEnergyWebExtras(flowSlotsCfg);

  // Dynamic menu/tab visibility
  try {
    const emsCfg = (cfg && cfg.ems) ? cfg.ems : {};

    // EVCS count lives in settingsConfig in /config (not in cfg.ems).
    // Keep __nwEvcsCount stable so the UI can reliably switch between
    // single-wallbox modal and multi-wallbox page.
    const evcsCountRaw = (cfg && cfg.settingsConfig && cfg.settingsConfig.evcsCount !== undefined && cfg.settingsConfig.evcsCount !== null)
      ? Number(cfg.settingsConfig.evcsCount)
      : Number(window.__nwEvcsCount);
    const evcsAvailable = nwEvcsFeatureFromConfig(cfg);
    const evcsCount = evcsAvailable ? Math.max(0, Math.round(Number.isFinite(evcsCountRaw) ? evcsCountRaw : 0)) : 0;
    window.__nwEvcsCount = evcsCount;
    window.__nwEvcsAvailable = evcsAvailable;

    // EVCS page/tab is only relevant for multiple configured Ladepunkte.
    const showEvcsPage = evcsAvailable && evcsCount >= 2;
    const menuEvcsLink = document.getElementById('menuEvcsLink');
    const tabEvcs = document.getElementById('tabEvcs');
    if (menuEvcsLink) menuEvcsLink.classList.toggle('hidden', !showEvcsPage);
    if (tabEvcs) tabEvcs.classList.toggle('hidden', !showEvcsPage);

    // SmartHome enabled flag is part of cfg.smartHome
    window.__nwSmartHomeEnabled = nwSmartHomeFeatureFromConfig(cfg);
    const menuSmartHomeLink = document.getElementById('menuSmartHomeLink');
    const tabSmartHome = document.getElementById('tabSmartHome');
    if (menuSmartHomeLink) menuSmartHomeLink.classList.toggle('hidden', !window.__nwSmartHomeEnabled);
    if (tabSmartHome) tabSmartHome.classList.toggle('hidden', !window.__nwSmartHomeEnabled);

    window.__nwStorageFarmEnabled = nwStorageFarmFeatureFromConfig(cfg, window.latestState || state || {});
    const menuStorageFarmLink = document.getElementById('menuStorageFarmLink');
    const tabStorageFarm = document.getElementById('tabStorageFarm');
    if (menuStorageFarmLink) menuStorageFarmLink.classList.toggle('hidden', !window.__nwStorageFarmEnabled);
    if (tabStorageFarm) tabStorageFarm.classList.toggle('hidden', !window.__nwStorageFarmEnabled);
    nwApplyCustomerFeatureVisibility(cfg, window.latestState || state || {});
    try { if ((new URLSearchParams(window.location.search || '')).get('tab') === 'storagefarm' && window.__nwStorageFarmEnabled) window.location.replace('storagefarm.html'); } catch(_e) {}
  } catch (e) {
    console.warn('[config-apply]', e);
  }
};

/**
 * Code-Teil: Arrow-Funktion `refreshConfig`
 * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: refreshConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const refreshConfig = async () => {
  if (cfgReloadInFlight) { cfgReloadPending = true; return; }
  cfgReloadInFlight = true;
  try {
    const nextCfg = await fetch('/config', { cache: 'no-store' }).then(r => r.json());
    applyConfigSnapshot(nextCfg);
    scheduleRender();
  } catch (e) {
    console.warn('[config-refresh]', e);
  } finally {
    cfgReloadInFlight = false;
    if (cfgReloadPending) {
      cfgReloadPending = false;
      refreshConfig();
    }
  }
};
  const snap = await fetch('/api/state').then(r => r.json());
  state = snap || {};
  try { lastInstallerConfigJson = (state && state['installer.configJson'] && state['installer.configJson'].value) || null; } catch (_e) {}
  // merge cfg.settings into state if missing (for initial checkbox values)
  try{
    if (cfg && cfg.settings){
      Object.keys(cfg.settings).forEach(k=>{
        const sk = 'settings.'+k;
        if (!state[sk]) state[sk] = { value: cfg.settings[k] };
      });
    }
  } catch(e){}

  window.latestState = state;
  // RFID-Whitelist und Lerncode liegen aus Datenschutzgründen nicht mehr im
  // globalen /api/state-Snapshot. Sie werden nur für die Kunden-Einstellseite
  // über den kontrollierten RFID-Endpunkt nachgeladen.
  try { await loadRfidCustomerState(); } catch (_e) {}
  _lastLiveTelemetryRenderTs = Date.now();
  scheduleRender(true);

  try { if (typeof setupSettings === 'function') setupSettings(); } catch (e) {}
  // Settings-UI muss nach dem Hydrate der Inputs erneut aktualisiert werden
  // (Labels/Sichtbarkeit reagieren nicht automatisch auf programmatic value changes)
  try { if (typeof initSettingsPanel === 'function') initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {} } catch (e) {}

  // Optional modals (initialized once; visibility controlled by update*Ui)
  try { if (typeof initThresholdModal === 'function') initThresholdModal(); } catch (_e) {}
  try { if (typeof initRelayModal === 'function') initRelayModal(); } catch (_e) {}
  try { if (typeof initBhkwModal === 'function') initBhkwModal(); } catch (_e) {}
  try { if (typeof initGeneratorModal === 'function') initGeneratorModal(); } catch (_e) {}
  /**
   * Code-Teil: startEvents
   * Zweck: Startet Prozess, Timer, Engine oder Verbindung.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function startEvents(){
  try{
    const es = new EventSource('/events');
    const dot = document.getElementById('liveDot');
    if (dot) dot.classList.remove('live');
    es.onopen = () => { if (dot) dot.classList.add('live'); try{ nwSetLiveOnline(true); }catch(_e){} };
    es.onerror = () => { if (dot) dot.classList.remove('live'); try{ nwSetLiveOnline(false); }catch(_e){} try{ es.close(); }catch(_){ } setTimeout(startEvents, 3000); };
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const isInitMessage = msg.type === 'init' && msg.payload;
        const isUpdateMessage = msg.type === 'update' && msg.payload;
        if (isInitMessage) { state = msg.payload; window.latestState = state; }
        else if (isUpdateMessage) { Object.assign(state, msg.payload); window.latestState = state; }

        // App-Center config changed? Refresh /config so tiles + slot layout update without reload.
        try {
          const cfgJson = (state && state['installer.configJson'] && state['installer.configJson'].value);
          if (typeof cfgJson === 'string' && cfgJson !== lastInstallerConfigJson) {
            lastInstallerConfigJson = cfgJson;
            refreshConfig();
          }
        } catch (_e) {}

        if (isInitMessage) scheduleLiveTelemetryRender(true);
        else if (isUpdateMessage) scheduleLiveTelemetryRender(false);
      } catch (e) { console.warn(e); }
    };
  } catch(e){ console.warn('events', e); setTimeout(startEvents, 3000); }
}
startEvents();

}


// --- Menu & Settings ---
/**
 * Code-Teil: initMenu
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initMenu(){
  const btn = document.getElementById('menuBtn');
  const menu = document.getElementById('menuDropdown');
  if (!btn || !menu) return;

  // Burger-Menü-Härtung 0.8.21:
  // LIVE/Settings bindet das Menü fachlich selbst. Die globale `nw-shell.ts` ist
  // auf vielen Seiten zusätzlich geladen und nutzt einen Capture-Fallback. Diese
  // Markierung verhindert, dass app.js denselben Button mehrfach bindet oder mit
  // der Shell doppelt toggelt.
  if (btn.dataset.nwAppMenu === '1') return;
  if (btn.dataset.nwShellBound === '1' && btn.dataset.nwMenuBound !== 'app') return;
  btn.dataset.nwAppMenu = '1';
  btn.dataset.nwMenuBound = 'app';
  btn.dataset.nwShellBound = '1';
  /**
   * Code-Teil: open
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const open = ()=> menu.classList.toggle('hidden');
  /**
   * Code-Teil: close
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const close = ()=> menu.classList.add('hidden');
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); open(); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menu. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  menu.addEventListener('click', (e)=> e.stopPropagation());
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('click', ()=> close());
  const settingsBtn = document.getElementById('menuOpenSettings');
  const installerBtn = document.getElementById('menuOpenInstaller');
  if (settingsBtn) settingsBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    close();
    // show settings section
    hideAllPanels();
    document.querySelector('.content').style.display = 'none';
    const sec = document.querySelector('[data-tab-content="settings"]');
    if (sec) sec.classList.remove('hidden');
      try{ if (typeof initSettingsPanel==='function') initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {} }catch(_e){}
      try{ if (typeof setupSettings==='function') setupSettings(); }catch(_e){}
    // deactivate tab buttons
    document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
    // initialize settings UI
    // - First bind & load values
    // - Then normalize slider ranges + labels
    setupSettings();
    initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {}
  try { initEmsControlModal(); } catch(_e) {}
  });
  }
/**
 * Code-Teil: initSettingsPanel
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initSettingsPanel(){
  // Wichtig: diese Funktion wird an mehreren Stellen aufgerufen
  // (Menü, initial, ggf. nach State-Updates). Sie muss daher idempotent sein.

  // Force sliders to emit only discrete values.
  // - Tarif-Modus: 1..2 (Manuell/Automatisch)
  // - Priorität: 1..3 (Speicher/Auto/Ladestation)
  const p = document.getElementById('s_priority');
  const t = document.getElementById('s_tariffMode');

  const prLabel = document.getElementById('s_priority_label');
  const tmLabel = document.getElementById('s_tariffMode_label');

  const dynToggle = document.getElementById('s_dyn_toggle');
  const dynBlock = document.getElementById('dyn_settings_block');
  const energyWalletToggle = document.getElementById('s_energyWalletEnabled');
  const energyWalletPriceBlock = document.getElementById('energyWalletCustomerPriceBlock');

  /**
   * Code-Teil: Arrow-Funktion `updatePriorityLabel`
   * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: updatePriorityLabel
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const updatePriorityLabel = ()=>{
    if (!p || !prLabel) return;
    const v = Number(p.value || 2);
    prLabel.textContent = (v === 1) ? 'Speicher' : (v === 3) ? 'Ladestation' : 'Auto';
  };
  /**
   * Code-Teil: updateTariffModeLabel
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const updateTariffModeLabel = ()=>{
    if (!t || !tmLabel) return;
    const v = Number(t.value || 1);
    tmLabel.textContent = (v === 2) ? 'Automatisch' : 'Manuell';
  };
  /**
   * Code-Teil: Arrow-Funktion `updateDynVisibility`
   * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: updateDynVisibility
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const updateDynVisibility = ()=>{
    if (!dynBlock) return;
    // Netzentgelt / Tarifhistorie must remain configurable even if the dynamic tariff toggle is off.
    // Therefore we keep the shared settings block visible and only sync the custom toggle buttons.
    dynBlock.hidden = false;
    try { if (dynToggle) syncToggleButtonsForInputId('s_dyn_toggle'); } catch (_e) {}
  };

  const updateEnergyWalletSettingsVisibility = ()=>{
    // Kundenfreiheit: Das Energie-Wertkonto ist eine freiwillige Anzeige.
    // Wenn der Nutzer es ausschaltet, bleiben die Preisfelder technisch erhalten, werden
    // aber ausgeblendet; das EMS-Modul wertet denselben State `settings.energyWalletEnabled` aus.
    const enabled = !energyWalletToggle || !!energyWalletToggle.checked;
    if (energyWalletPriceBlock) energyWalletPriceBlock.style.display = enabled ? '' : 'none';
    try { if (energyWalletToggle) syncToggleButtonsForInputId('s_energyWalletEnabled'); } catch (_e) {}
  };

  /**
   * Code-Teil: Arrow-Funktion `normalizePriorityValue`
   * Zweck: normalisiert Eingaben/Anzeigeformate und schützt gegen ungültige Werte.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: normalizePriorityValue
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const normalizePriorityValue = ()=>{
    if (!p) return;
    let v = Number(p.value);
    if (!Number.isFinite(v)) v = 2;
    // Legacy: früher 0..100 (Slider-Mitte ~50). Wir mappen grob:
    //   >= 67 => Speicher, <= 33 => Ladestation, sonst => Auto.
    if (v > 3) {
      if (v >= 67) v = 1;
      else if (v <= 33) v = 3;
      else v = 2;
    }
    if (v < 1) v = 2;
    if (v > 3) v = 2;
    p.value = String(v);
  };
  /**
   * Code-Teil: Arrow-Funktion `snapPriority`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: snapPriority
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const snapPriority = ()=>{
    if (!p) return;
    let v = Number(p.value);
    if (!Number.isFinite(v)) v = 2;
    if (v < 1.5) v = 1;
    else if (v < 2.5) v = 2;
    else v = 3;
    p.value = String(v);
    updatePriorityLabel();
  };
  /**
   * Code-Teil: Arrow-Funktion `snapTariffMode`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: snapTariffMode
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const snapTariffMode = ()=>{
    if (!t) return;
    let v = Number(t.value);
    if (!Number.isFinite(v)) v = 1;
    t.value = String(v < 1.5 ? 1 : 2);
    updateTariffModeLabel();
  };

  // UI-Update immer ausführen (falls Werte programmgesteuert gesetzt wurden)
  updatePriorityLabel();
  updateTariffModeLabel();
  updateDynVisibility();
  updateEnergyWalletSettingsVisibility();

  // Zeitvariables Netzentgelt (HT/NT) – UI
  const netFeeToggle = document.getElementById('s_netFeeEnabled');
  const netFeeModelSel = document.getElementById('s_netFeeModel');
  const netFeeTabs = document.getElementById('dynTariffSubtabs');
  const dynTariffPanel = document.getElementById('dynTariffPanel');
  const dynNetFeePanel = document.getElementById('dynNetFeePanel');
  const netFeeSimpleBlock = document.getElementById('netFeeSimpleBlock');
  const netFeeQuarterBlock = document.getElementById('netFeeQuarterBlock');

  /**
   * Code-Teil: Arrow-Funktion `setDynSubTab`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: setDynSubTab
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setDynSubTab = (tab) => {
    const t = (tab === 'netfee') ? 'netfee' : 'tariff';
    if (netFeeTabs) netFeeTabs.dataset.active = t;
    if (dynTariffPanel) dynTariffPanel.style.display = (t === 'tariff') ? '' : 'none';
    if (dynNetFeePanel) dynNetFeePanel.style.display = (t === 'netfee') ? '' : 'none';
    if (netFeeTabs) {
      [...netFeeTabs.querySelectorAll('button[data-dyntab]')].forEach(btn => {
        const isActive = (btn.dataset.dyntab || 'tariff') === t;
        btn.classList.toggle('nw-tab--active', isActive);
      });
    }
  };

  /**
   * Code-Teil: Arrow-Funktion `updateNetFeeUi`
   * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  const updateNetFeeUi = (opts = {}) => {
    const enabled = netFeeToggle ? !!netFeeToggle.checked : false;

    // Tabs nur anzeigen, wenn Feature aktiv ist
    if (netFeeTabs) netFeeTabs.style.display = enabled ? '' : 'none';

    if (!enabled) {
      setDynSubTab('tariff');
    } else {
      if (opts.openNetFee) {
        setDynSubTab('netfee');
      } else {
        const current = (netFeeTabs && netFeeTabs.dataset.active);
        setDynSubTab(current || 'netfee');
      }
    }

    // keep custom toggle buttons in sync
    try { syncToggleButtonsForInputId('s_netFeeEnabled'); } catch (_e) {}

    // Modell (Einfach vs. Quartale)
    try {
      const model = netFeeModelSel ? String(netFeeModelSel.value || '1').trim() : '1';
      const isQuarter = model === '2';
      if (netFeeSimpleBlock) netFeeSimpleBlock.style.display = isQuarter ? 'none' : '';
      if (netFeeQuarterBlock) netFeeQuarterBlock.style.display = isQuarter ? '' : 'none';
    } catch (_e) {}
  };

  // UI-Update immer ausführen
  updateNetFeeUi();

  // PV Saisonprofil (Quartale) – steuert die PV-Reserve im Tarifmodus
  // KI ist immer aktiv; manuelle Basisfaktoren sind optional (Feintuning).
  const pvSeasonToggle = document.getElementById('s_tariffPvSeasonEnabled');
  const pvSeasonBlock = document.getElementById('tariffPvSeasonBlock');
  const pvSeasonAiToggle = document.getElementById('s_tariffPvSeasonAiEnabled'); // hidden, always ON
  const pvSeasonManualBlock = document.getElementById('tariffPvSeasonManualBlock');
  const pvSeasonAiHint = document.getElementById('tariffPvSeasonAiHint');
  const pvSeasonManualBtn = document.getElementById('pvSeasonManualBtn');

  let pvSeasonManualOpen = false;

  /**
   * Code-Teil: Arrow-Funktion `updatePvSeasonUi`
   * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: updatePvSeasonUi
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const updatePvSeasonUi = () => {
    if (!pvSeasonToggle || !pvSeasonBlock) return;

    const enabled = !!pvSeasonToggle.checked;
    pvSeasonBlock.style.display = enabled ? '' : 'none';

    // keep custom toggle buttons in sync
    try { syncToggleButtonsForInputId('s_tariffPvSeasonEnabled'); } catch (_e) {}

    if (!enabled) {
      pvSeasonManualOpen = false;
      if (pvSeasonManualBlock) pvSeasonManualBlock.style.display = 'none';
      if (pvSeasonAiHint) pvSeasonAiHint.style.display = 'none';
      return;
    }

    // Force KI to ON (hidden control) to keep behaviour stable for end customers.
    try {
      if (pvSeasonAiToggle && !pvSeasonAiToggle.checked) {
        pvSeasonAiToggle.checked = true;
        // Persist to backend (older installs may still have it off)
        pvSeasonAiToggle.dispatchEvent(new Event('change'));
      }
    } catch (_e) {}

    if (pvSeasonAiHint) pvSeasonAiHint.style.display = 'block';

    if (pvSeasonManualBtn) {
      pvSeasonManualBtn.textContent = pvSeasonManualOpen ? 'Manuell schließen' : 'Manuell (optional)';
    }
    if (pvSeasonManualBlock) {
      pvSeasonManualBlock.style.display = pvSeasonManualOpen ? '' : 'none';
    }
  };

  try { if (pvSeasonToggle) pvSeasonToggle.addEventListener('change', updatePvSeasonUi); } catch (_e) {}
  try { if (pvSeasonManualBtn) pvSeasonManualBtn.addEventListener('click', () => { pvSeasonManualOpen = !pvSeasonManualOpen; updatePvSeasonUi(); }); } catch (_e) {}

  // UI-Update immer ausführen
  updatePvSeasonUi();

  // Weather App (Plug&Play)
  const weatherToggle = document.getElementById('s_weather_enabled');
  const weatherBlock = document.getElementById('weather_settings_block');
  const weatherUsageInput = document.getElementById('s_weather_usage');
  const weatherBtns = document.getElementById('weatherUsageButtons');
  const weatherHintPrivate = document.getElementById('weatherHintPrivate');
  const weatherHintCommercial = document.getElementById('weatherHintCommercial');
  const weatherApiRow = document.getElementById('weatherApiKeyRow');
  const weatherApiKey = document.getElementById('s_weather_apiKey');
  const weatherApiMissing = document.getElementById('weatherApiKeyMissing');


  /**
   * Code-Teil: Arrow-Funktion `_nwBool`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: _nwBool
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const _nwBool = (v) => {
    if (v === true || v === 1 || v === '1') return true;
    const s = String(v || '').toLowerCase().trim();
    return s === 'true' || s === 'yes' || s === 'on';
  };
  /**
   * Code-Teil: updateWeatherVisibility
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const updateWeatherVisibility = () => {
    if (!weatherBlock || !weatherToggle) return;
    // IMPORTANT:
    // Do *not* derive visibility from window.latestState here.
    // latestState lags behind user interactions (async /api/set) and caused the UI
    // to immediately flip back to OFF after clicking ON.
    const enabled = _nwBool(weatherToggle.checked);
    weatherBlock.style.display = enabled ? '' : 'none';

    // keep custom toggle buttons in sync
    try { syncToggleButtonsForInputId('s_weather_enabled'); } catch (_e) {}
  };

  /**
   * Code-Teil: Arrow-Funktion `updateWeatherModeUi`
   * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: updateWeatherModeUi
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const updateWeatherModeUi = () => {
    if (!weatherUsageInput) return;

    // Same rationale as updateWeatherVisibility():
    // Always trust the current input value to avoid UI reverts while /api/set is in-flight.
    let mode = String(weatherUsageInput.value || '').trim().toLowerCase();
    if (mode !== 'commercial' && mode !== 'private') mode = 'private';
    if (weatherUsageInput.value !== mode) weatherUsageInput.value = mode;

    const keyVal = (weatherApiKey && String(weatherApiKey.value || '').trim()) || '';
    const stateNow = window.latestState || {};
    const cfgNow = window.__nwCfg || SERVER_CFG || {};
    const keyConfigured = !!(
      (stateNow['settings.weatherApiKeyConfigured'] && stateNow['settings.weatherApiKeyConfigured'].value === true) ||
      (cfgNow.settings && cfgNow.settings.weatherApiKeyConfigured === true)
    );
    if (weatherApiKey && keyConfigured && !keyVal) {
      weatherApiKey.placeholder = 'Gespeichert – nur zum Ändern neu eingeben';
    }

    if (weatherBtns) {
      [...weatherBtns.querySelectorAll('button')].forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === mode);
      });
    }

    const isCommercial = mode === 'commercial';
    if (weatherHintPrivate) weatherHintPrivate.style.display = isCommercial ? 'none' : 'block';
    if (weatherHintCommercial) weatherHintCommercial.style.display = isCommercial ? 'block' : 'none';
    if (weatherApiRow) weatherApiRow.style.display = isCommercial ? 'block' : 'none';

    const missing = isCommercial && !keyVal && !keyConfigured;
    if (weatherApiMissing) weatherApiMissing.style.display = missing ? 'block' : 'none';
  };

  // UI-Update immer ausführen
  try { syncToggleButtonsForInputId('s_aiAdvisorEnabled'); } catch (_e) {}
  updateWeatherVisibility();
  updateWeatherModeUi();


  // Listener nur einmal binden
  if (window.__nwSettingsPanelInit) return;
  window.__nwSettingsPanelInit = true;

  if (p) {
    p.min = 1; p.max = 3; p.step = 1;
    normalizePriorityValue();
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an p. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    p.addEventListener('input', snapPriority);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an p. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    p.addEventListener('change', snapPriority);
  }
  if (t) {
    t.min = 1; t.max = 2; t.step = 1;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an t. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    t.addEventListener('input', snapTariffMode);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an t. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    t.addEventListener('change', snapTariffMode);
  }
  if (dynToggle) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an dynToggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    dynToggle.addEventListener('change', updateDynVisibility);
  }
  if (energyWalletToggle) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an energyWalletToggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    energyWalletToggle.addEventListener('change', updateEnergyWalletSettingsVisibility);
  }

  // PV Saisonprofil
  if (pvSeasonToggle) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an pvSeasonToggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    pvSeasonToggle.addEventListener('change', updatePvSeasonUi);
  }
  if (pvSeasonAiToggle) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an pvSeasonAiToggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    pvSeasonAiToggle.addEventListener('change', updatePvSeasonUi);
  }

  // Netzentgelt: Aktivierung & Tabs
  if (netFeeToggle) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an netFeeToggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    netFeeToggle.addEventListener('change', () => updateNetFeeUi({ openNetFee: !!netFeeToggle.checked }));
  }
  if (netFeeModelSel) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an netFeeModelSel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    netFeeModelSel.addEventListener('change', () => updateNetFeeUi({}));
  }
  if (netFeeTabs) {
    [...netFeeTabs.querySelectorAll('button[data-dyntab]')].forEach(btn => {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => {
        const t = btn.dataset.dyntab || 'tariff';
        setDynSubTab(t);
      });
    });
  }

  // Wetter: Aktivierung & Nutzungsart
  if (weatherToggle) weatherToggle.addEventListener('change', updateWeatherVisibility);
  if (weatherBtns && weatherUsageInput) {
    [...weatherBtns.querySelectorAll('button')].forEach(btn => {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => {
        const v = btn.dataset.value || 'private';
        weatherUsageInput.value = v;
        // Trigger persistence via bindInputValue()
        weatherUsageInput.dispatchEvent(new Event('change'));
        updateWeatherModeUi();
      });
    });
  }
  if (weatherUsageInput) weatherUsageInput.addEventListener('change', updateWeatherModeUi);
  if (weatherApiKey) weatherApiKey.addEventListener('input', updateWeatherModeUi);

  // Geheimnisse werden vom Backend nicht mehr im Klartext ausgeliefert. Die
  // Platzhalter bestätigen eine bestehende Konfiguration, ohne sie preiszugeben.
  try {
    const emailInput = document.getElementById('s_email');
    const stNow = window.latestState || {};
    const cfgNow = window.__nwCfg || SERVER_CFG || {};
    const masked = String(
      (stNow['settings.emailMasked'] && stNow['settings.emailMasked'].value) ||
      (cfgNow.settings && cfgNow.settings.emailMasked) ||
      ''
    ).trim();
    if (emailInput && masked && !String(emailInput.value || '').trim()) emailInput.placeholder = `Gespeichert: ${masked}`;
  } catch (_e) {}

  // Test-Mail für Benachrichtigungen
  const notifyTestBtn = document.getElementById('notifyTestBtn');
  const notifyTestMsg = document.getElementById('notifyTestMsg');
  if (notifyTestBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an notifyTestBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    notifyTestBtn.addEventListener('click', async ()=>{
      try {
        notifyTestBtn.disabled = true;
        if (notifyTestMsg) notifyTestMsg.textContent = 'Sende Test-Mail...';
        const r = await fetch('/api/notify/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const j = await r.json().catch(()=>({ ok: false }));
        if (j && j.ok) {
          if (notifyTestMsg) notifyTestMsg.textContent = 'OK: Der Mailserver hat die Test-Mail angenommen. Bitte den Posteingang prüfen.';
        } else {
          const err = (j && j.error) ? j.error : (`HTTP ${r.status}`);
          if (notifyTestMsg) notifyTestMsg.textContent = 'Fehler: ' + err;
        }
      } catch (e) {
        if (notifyTestMsg) notifyTestMsg.textContent = 'Fehler: ' + (e && e.message ? e.message : String(e));
      } finally {
        try { notifyTestBtn.disabled = false; } catch (_e) {}
      }
    });
  }

  const LS_KEY = 'nexowatt.settings';
  let opts;
  try { opts = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch(_) { opts = {}; }

  const elSoc = document.getElementById('optShowSocBadge');
  if (elSoc) {
    if (typeof opts.showSocBadge === 'undefined') opts.showSocBadge = true;
    elSoc.checked = !!opts.showSocBadge;
    /**
     * Code-Teil: Arrow-Funktion `applySoc`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: applySoc
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const applySoc = ()=> {
      const t = document.getElementById('batterySocIn');
      if (t) t.style.display = elSoc.checked ? '' : 'none';
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an elSoc. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    elSoc.addEventListener('change', ()=>{
      opts.showSocBadge = elSoc.checked;
      localStorage.setItem(LS_KEY, JSON.stringify(opts));
      applySoc();
    });
    applySoc();
  }

  const elRef = document.getElementById('optRefreshSec');
  if (elRef) {
    if (typeof opts.refreshSec === 'undefined') opts.refreshSec = 1;
    elRef.value = opts.refreshSec;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an elRef. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    elRef.addEventListener('change', ()=>{
      const v = Math.max(1, parseInt(elRef.value||'1', 10));
      opts.refreshSec = v;
      localStorage.setItem(LS_KEY, JSON.stringify(opts));
    });
  }
}
/**
 * Code-Teil: applyInitialTabFromUrl
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function applyInitialTabFromUrl(){
  try {
    const params = new URLSearchParams(window.location.search || '');
    const tab = String(params.get('tab') || '').trim().toLowerCase();
    if (!tab) return;
    // Legacy links: Speicherfarm is now a dedicated table-only page.
    if (tab === 'storagefarm') {
      window.location.replace('storagefarm.html');
      return;
    }

    let tries = 0;
    const maxTries = 20;
    /**
     * Code-Teil: Arrow-Funktion `tryActivate`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: tryActivate
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const tryActivate = () => {
      tries++;
      const btn = document.querySelector(`.tabs .tab[data-tab="${tab}"]`);
      if (btn && !btn.classList.contains('hidden')) {
        try { btn.click(); } catch (_e) {}
        return;
      }
      if (tries < maxTries) {
        setTimeout(tryActivate, 200);
      }
    };
    tryActivate();
  } catch (_e) {}
}
/**
 * Code-Teil: _nwCssEscapeIdent
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwCssEscapeIdent(s){
  try{
    if (window && typeof window.CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') return CSS.escape(String(s));
  }catch(_e){}
  // minimal escape fallback
  return String(s).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
}
/**
 * Code-Teil: syncToggleGroup
 * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function syncToggleGroup(groupEl, checked){
  if (!groupEl) return;
  const btns = Array.from(groupEl.querySelectorAll('button[data-value]'));
  btns.forEach(b=>{
    const v = String(b.getAttribute('data-value')||'').toLowerCase();
    const isTrue = (v === '1' || v === 'true' || v === 'on' || v === 'yes' || v === 'ja');
    b.classList.toggle('active', checked ? isTrue : !isTrue);
  });
}
/**
 * Code-Teil: syncToggleButtonsForInputId
 * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function syncToggleButtonsForInputId(inputId){
  if (!inputId) return;
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const sel = '.nw-toggle[data-toggle-for="' + _nwCssEscapeIdent(inputId) + '"]';
  document.querySelectorAll(sel).forEach(g => syncToggleGroup(g, !!inp.checked));
}
/**
 * Code-Teil: syncAllToggleButtons
 * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function syncAllToggleButtons(){
  document.querySelectorAll('.nw-toggle[data-toggle-for]').forEach(g=>{
    const id = g.getAttribute('data-toggle-for');
    const inp = id ? document.getElementById(id) : null;
    syncToggleGroup(g, !!(inp && inp.checked));
  });
}

/**
 * VIS UI: Toggle-Buttons (An/Aus) ersetzen Checkboxen.
 * Implementierung: Wir behalten die zugrunde liegenden Checkbox-Inputs (API-Bindings bleiben stabil),
 * blenden sie aber aus und steuern sie über Button-Gruppen.
 */
/**
 * Code-Teil: bindToggleButtonGroups
 * Zweck: Verbindet Event-Handler mit DOM oder Runtime-Objekten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function bindToggleButtonGroups(){
  if (window.__nwToggleButtonsBound) {
    try{ syncAllToggleButtons(); }catch(_e){}
    return;
  }
  window.__nwToggleButtonsBound = true;

  // Expose helpers for programmatic UI updates (ohne change-Event → keine Writes).
  window.nwSyncToggleButtons = syncToggleButtonsForInputId;
  window.nwSyncAllToggleButtons = syncAllToggleButtons;

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('click', (e)=>{
    const btn = e && e.target ? e.target.closest('.nw-toggle button[data-value]') : null;
    if (!btn) return;
    const grp = btn.closest('.nw-toggle');
    if (!grp) return;
    const targetId = grp.getAttribute('data-toggle-for');
    if (!targetId) return;
    const inp = document.getElementById(targetId);
    if (!inp) return;

    const raw = String(btn.getAttribute('data-value') || '').trim().toLowerCase();
    const desired = (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes' || raw === 'ja');

    if (inp.disabled) return;

    // Update + trigger existing change bindings
    if (!!inp.checked !== desired) {
      inp.checked = desired;
      try{ inp.dispatchEvent(new Event('change', { bubbles: true })); }catch(_e){}
    }
    syncToggleGroup(grp, desired);
  }, true);

  // Initial sync
  try{ syncAllToggleButtons(); }catch(_e){}
}


// Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
window.addEventListener('DOMContentLoaded', ()=> {
  nwNormalizeBrandHeader();
  bootstrap();
  initMenu();
  initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {}
  try { initStorageFarmPanel(); } catch(_e) {}
  initTabs();
  hideAllPanels();
  applyInitialTabFromUrl();
  try { initTariffForecastTooltip(); } catch(_e) {}
  try { initEmsControlModal(); } catch(_e) {}

  // If opened directly as standalone Settings page, show settings panel by default
  try {
    const p = (location && location.pathname) ? String(location.pathname) : '';
    const isSettings = p.endsWith('/settings.html') || p.endsWith('settings.html');
    if (isSettings) {
      const live = document.querySelector('.content');
      if (live) live.style.display = 'none';
      const sec = document.querySelector('[data-tab-content="settings"]');
      if (sec) sec.classList.remove('hidden');
      try { setupSettings(); } catch(_e) {}
    }
  } catch(_e) {}
});


 // --- Settings & Installer logic ---
/**
 * Code-Teil: hideAllPanels
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function hideAllPanels(){
  document.body && document.body.classList.remove('nw-storagefarm-only');
  document.querySelectorAll('[data-tab-content]').forEach(el=> el.classList.add('hidden'));
  const c = document.querySelector('.content.nw-dashboard') || document.querySelector('.content');
  if(c) c.style.display = 'grid';
}
/**
 * Code-Teil: showDashboardTab
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function showDashboardTab(tab){
  tab = String(tab || 'live').trim().toLowerCase() || 'live';
  const live = document.querySelector('.content.nw-dashboard') || document.querySelector('main.content') || document.querySelector('.content');
  const isLive = tab === 'live';
  if (live) live.style.display = isLive ? 'grid' : 'none';

  document.querySelectorAll('[data-tab-content]').forEach(el => {
    el.classList.toggle('hidden', el.getAttribute('data-tab-content') !== tab);
  });

  document.body && document.body.classList.toggle('nw-storagefarm-only', tab === 'storagefarm');

  document.querySelectorAll('.tabs .tab').forEach(b => {
    const active = (b.getAttribute('data-tab') || '').toLowerCase() === tab;
    b.classList.toggle('active', active);
    b.classList.toggle('tab-active', active);
  });

  if (tab === 'storagefarm') {
    window.location.href = 'storagefarm.html';
    return;
  }
}
try { window.nwShowDashboardTab = showDashboardTab; } catch(_e) {}

let SERVER_CFG = { adminUrl: null, installerLocked: false };
/**
 * Code-Teil: loadConfig
 * Zweck: Lädt Daten aus API, States oder Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function loadConfig() {
  try {
    const r = await fetch('/config');
    const j = await r.json();
    SERVER_CFG = j || {};
    try { window.__nwEmsCfg = (SERVER_CFG && SERVER_CFG.ems) ? SERVER_CFG.ems : (window.__nwEmsCfg || {}); } catch(_e) {}
  } catch(e) { console.warn('cfg', e); }
}
/**
 * Code-Teil: bindInputValue
 * Zweck: Verbindet Event-Handler mit DOM oder Runtime-Objekten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function bindInputValue(el, stateKey) {
  // Always refresh the input from the latest snapshot first
  const st = window.latestState || {};
  const info = st[stateKey] || st['settings.' + el.dataset.key] || st['installer.' + el.dataset.key];
  if (info && info.value !== undefined) {
    const v = info.value;
    if (el.type === 'checkbox') {
      // Be robust against boolean/number/string representations
      if (v === true) el.checked = true;
      else if (v === false) el.checked = false;
      else if (typeof v === 'number') el.checked = v !== 0;
      else if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        el.checked = (s === '1' || s === 'true' || s === 'on' || s === 'yes' || s === 'ja');
      } else {
        el.checked = !!v;
      }
    } else {
      el.value = v;
    }
  }

  // Derive API scope+key from stateKey ('settings.<key>' / 'installer.<key>' / 'evcs.<idx>.<prop>')
  const sk = String(stateKey || '');
  let scope = 'settings';
  let key = sk;
  if (sk.startsWith('settings.')) { scope = 'settings'; key = sk.slice(9); }
  else if (sk.startsWith('installer.')) { scope = 'installer'; key = sk.slice(10); }
  else if (sk.startsWith('evcs.rfid.')) { scope = 'rfid'; key = sk.slice(10); }
  else if (sk.startsWith('rfid.')) { scope = 'rfid'; key = sk.slice(5); }
  else if (sk.startsWith('storageFarm.')) { scope = 'storageFarm'; key = sk.slice(12); }
  else if (sk.startsWith('evcs.')) { scope = 'evcs'; key = sk; }

  // Prevent duplicate listeners when setupSettings() is called multiple times
  if (el.dataset.nwBound === '1') return;
  el.dataset.nwBound = '1';

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  el.addEventListener('change', async () => {
    let val;
    if (el.type === 'checkbox') val = !!el.checked;
    else if (el.type === 'number' || el.type === 'range') {
      val = Number(el.value);
      if (!Number.isFinite(val)) val = 0;
    } else val = el.value;

    try {
      if (stateKey) {
        if (!state || typeof state !== 'object') state = {};
        const prev = state[stateKey] && typeof state[stateKey] === 'object' ? state[stateKey] : {};
        state[stateKey] = Object.assign({}, prev, { value: val, ts: Date.now(), ack: false });
        window.latestState = state;
      }
      if (scope === 'settings' && key === 'aiAdvisorEnabled') {
        try { updateAiAdvisorLiveUi(); } catch (_e) {}
      }
      if (scope === 'settings' && key === 'pvSurplusPriority') {
        try { updatePvSurplusSettingsUi(); } catch (_e) {}
      }
    } catch (_e) {}

    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, key, value: val })
      });
    } catch (e) { /* ignore */ }
  });
}

/**
 * Code-Teil: updatePvSurplusSettingsUi
 * Zweck: Zeigt den prozentualen EVCS-Anteil nur bei der gemeinsamen
 * PV-Ueberschuss-Verteilung an. Speicher- oder E-Mobilitaets-Prioritaet
 * benoetigen keinen zusaetzlichen Prozentwert.
 * Zusammenhang: Die Werte werden als settings.* States gespeichert und vom
 * zentralen EMS-Budget in Core-Limits ausgewertet.
 */
function updatePvSurplusSettingsUi(){
  const enabled = document.getElementById('s_pvSurplusAllocationEnabled');
  const block = document.getElementById('pvSurplusFixedAllocationBlock');
  const select = document.getElementById('s_pvSurplusPriority');
  const row = document.getElementById('pvSurplusEvcsShareRow');
  const fixed = !enabled || enabled.checked;
  if (block) block.classList.toggle('hidden', !fixed);
  if (select && row) row.classList.toggle('hidden', !fixed || String(select.value || 'both').trim().toLowerCase() !== 'both');
}

/**
 * Code-Teil: setupPvSurplusSettingsUi
 * Zweck: Bindet die lokale Sichtbarkeitslogik einmalig und aktualisiert sie
 * nach dem Laden der gespeicherten Kundeneinstellung.
 * Zusammenhang: bindInputValue schreibt weiterhin ueber /api/set; diese
 * Funktion veraendert ausschliesslich die Darstellung des Einstellungsreiters.
 */
function setupPvSurplusSettingsUi(){
  const enabled = document.getElementById('s_pvSurplusAllocationEnabled');
  const select = document.getElementById('s_pvSurplusPriority');
  if (!select && !enabled) return;
  if (select && select.dataset.nwPvSurplusBound !== '1') {
    select.dataset.nwPvSurplusBound = '1';
    select.addEventListener('change', updatePvSurplusSettingsUi);
  }
  if (enabled && enabled.dataset.nwPvSurplusBound !== '1') { enabled.dataset.nwPvSurplusBound = '1'; enabled.addEventListener('change', updatePvSurplusSettingsUi); }
  updatePvSurplusSettingsUi();
}
/**
 * Code-Teil: initSettingsPageTabs
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initSettingsPageTabs(){
  const wrap = document.querySelector('.settings-wrap[data-tab-content="settings"]');
  if (!wrap) return;
  const buttons = Array.from(wrap.querySelectorAll('[data-settings-page-target]'));
  if (!buttons.length) return;
  /**
   * Code-Teil: normalizePage
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const normalizePage = (value) => {
    const wanted = String(value || '').trim().toLowerCase();
    const allowed = buttons.map(btn => String(btn.dataset.settingsPageTarget || '').trim().toLowerCase()).filter(Boolean);
    if (wanted && allowed.includes(wanted)) return wanted;
    return allowed[0] || 'general';
  };

  /**
   * Code-Teil: Arrow-Funktion `activatePage`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: activatePage
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const activatePage = (value) => {
    const page = normalizePage(value);
    wrap.dataset.settingsPage = page;
    buttons.forEach((btn) => {
      const target = String(btn.dataset.settingsPageTarget || '').trim().toLowerCase();
      btn.classList.toggle('is-active', target === page);
    });
    wrap.querySelectorAll('[data-settings-panel]').forEach((panel) => {
      const target = String(panel.dataset.settingsPanel || '').trim().toLowerCase();
      panel.classList.toggle('hidden', target !== page);
    });
    try { sessionStorage.setItem('nexowatt.settings.page', page); } catch (_e) {}
    try { renderSettingsLogPanel(); } catch (_e) {}
  };

  buttons.forEach((btn) => {
    if (btn.dataset.nwPageBound === '1') return;
    btn.dataset.nwPageBound = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', () => activatePage(btn.dataset.settingsPageTarget));
  });

  try { window.__nwActivateSettingsPage = activatePage; } catch (_e) {}
  activatePage(wrap.dataset.settingsPage || (() => {
    try { return sessionStorage.getItem('nexowatt.settings.page') || 'general'; } catch (_e) { return 'general'; }
  })());
}
/**
 * Code-Teil: _nwSettingsStateValue
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwSettingsStateValue(key){
  const st = window.latestState || {};
  return st[key] ? st[key].value : undefined;
}
/**
 * Code-Teil: _nwSettingsText
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwSettingsText(value, fallback = '—'){
  if (value === undefined || value === null) return fallback;
  const txt = String(value).trim();
  return txt ? txt : fallback;
}
/**
 * Code-Teil: _nwSettingsBool
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwSettingsBool(value){
  if (value === undefined || value === null) return '—';
  if (value === true || value === 1 || value === '1') return 'Ja';
  const txt = String(value).trim().toLowerCase();
  if (txt === 'true' || txt === 'on' || txt === 'yes' || txt === 'ja') return 'Ja';
  if (txt === 'false' || txt === 'off' || txt === 'no' || txt === 'nein' || txt === '0') return 'Nein';
  return value ? 'Ja' : 'Nein';
}
/**
 * Code-Teil: _nwSettingsCount
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwSettingsCount(value){
  const num = Number(value);
  return Number.isFinite(num) ? String(Math.round(num)) : '—';
}
/**
 * Code-Teil: _nwSettingsTs
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwSettingsTs(value){
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '—';
  try { return new Date(num).toLocaleString(nwUiLocaleTag()); } catch (_e) { return '—'; }
}
/**
 * Code-Teil: _nwSettingsPower
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwSettingsPower(value){
  const num = Number(value);
  return Number.isFinite(num) ? formatPower(num) : '—';
}
/**
 * Code-Teil: _nwSettingsDays
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwSettingsDays(value){
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? (Math.round(num) + ' Tage') : '—';
}
/**
 * Code-Teil: _nwSettingsJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwSettingsJson(value){
  const raw = _nwSettingsText(value, '');
  if (!raw) return '—';
  try { return JSON.stringify(JSON.parse(raw), null, 2); } catch (_e) { return raw; }
}
/**
 * Code-Teil: renderSettingsLogPanel
 * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function renderSettingsLogPanel(){
  const panel = document.querySelector('[data-settings-panel="log"]');
  if (!panel) return;

  const emsCfg = window.__nwEmsCfg || {};
  const hasData = [
    'para14a.active',
    'para14a.audit.eventSeq',
    'para14a.trace.seq',
    'para14a.audit.lastJson'
  ].some((key) => _nwSettingsStateValue(key) !== undefined);
  const installed = !!emsCfg.para14aEnabled;
  const missing = document.getElementById('settingsPara14aMissing');
  if (missing) missing.style.display = (!installed && !hasData) ? '' : 'none';

  /**
   * Code-Teil: Arrow-Funktion `set`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: set
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
  };

  set('settingsPara14aStatusActive', _nwSettingsBool(_nwSettingsStateValue('para14a.active')));
  set('settingsPara14aStatusMode', _nwSettingsText(_nwSettingsStateValue('para14a.mode')));
  set('settingsPara14aStatusSource', _nwSettingsText(_nwSettingsStateValue('para14a.controlSource')));
  set('settingsPara14aStatusMinPerDevice', _nwSettingsPower(_nwSettingsStateValue('para14a.minPerDeviceW')));
  set('settingsPara14aStatusPmin', _nwSettingsPower(_nwSettingsStateValue('para14a.pMinW')));
  set('settingsPara14aStatusEvcsCap', _nwSettingsPower(_nwSettingsStateValue('para14a.evcsTotalCapW')));
  set('settingsPara14aStatusEmsSetpoint', _nwSettingsPower(_nwSettingsStateValue('para14a.emsSetpointW')));
  set('settingsPara14aStatusNSteuVE', _nwSettingsCount(_nwSettingsStateValue('para14a.nSteuVE')));

  set('settingsPara14aHistoryEnabled', _nwSettingsBool(_nwSettingsStateValue('para14a.audit.historyEnabled')));
  set('settingsPara14aHistoryInstance', _nwSettingsText(_nwSettingsStateValue('para14a.audit.historyInstance')));
  set('settingsPara14aHistoryDedicated', _nwSettingsBool(_nwSettingsStateValue('para14a.audit.historyDedicated')));
  set('settingsPara14aHistoryAutoProvisioned', _nwSettingsBool(_nwSettingsStateValue('para14a.audit.historyAutoProvisioned')));
  const rawHistoryProvisionState = String(_nwSettingsStateValue('para14a.audit.historyProvisionState') ?? '').trim();
  const historyProvisionStateText = ({
    shared_influxdb_0: 'gemeinsame Historie (influxdb.0)',
    shared_detected: 'gemeinsame Historie (erkannte Influx-Instanz)',
    shared_configured: 'gemeinsame Historie (konfiguriert)',
    shared_configured_external: 'gemeinsame Historie (konfigurierte History-Instanz)',
    configured_missing_fallback_shared: 'Fallback auf gemeinsame Historie',
    configured_missing: 'konfigurierte Historie fehlt',
    missing: 'keine Historie erkannt',
    error: 'Fehler',
  }[rawHistoryProvisionState] || _nwSettingsText(rawHistoryProvisionState));
  set('settingsPara14aHistoryProvisionState', historyProvisionStateText);
  set('settingsPara14aRetentionDays', _nwSettingsDays(_nwSettingsStateValue('para14a.audit.retentionTargetDays')));
  set('settingsPara14aSessionActive', _nwSettingsBool(_nwSettingsStateValue('para14a.audit.sessionActive')));
  set('settingsPara14aSessionId', _nwSettingsText(_nwSettingsStateValue('para14a.audit.currentSessionId')));
  set('settingsPara14aEventSeq', _nwSettingsCount(_nwSettingsStateValue('para14a.audit.eventSeq')));
  set('settingsPara14aLastEventTs', _nwSettingsTs(_nwSettingsStateValue('para14a.audit.lastEventTs')));

  set('settingsPara14aLastEventType', _nwSettingsText(_nwSettingsStateValue('para14a.audit.lastEventType')));
  set('settingsPara14aLastResult', _nwSettingsText(_nwSettingsStateValue('para14a.audit.lastResult')));
  set('settingsPara14aLastReason', _nwSettingsText(_nwSettingsStateValue('para14a.audit.lastReason')));
  set('settingsPara14aLastSource', _nwSettingsText(_nwSettingsStateValue('para14a.audit.lastSource')));
  set('settingsPara14aLastMode', _nwSettingsText(_nwSettingsStateValue('para14a.audit.lastMode')));
  set('settingsPara14aLastBudget', _nwSettingsPower(_nwSettingsStateValue('para14a.audit.lastRequestedTotalBudgetW')));
  set('settingsPara14aLastCap', _nwSettingsPower(_nwSettingsStateValue('para14a.audit.lastEffectiveEvcsCapW')));
  set('settingsPara14aLastPmin', _nwSettingsPower(_nwSettingsStateValue('para14a.audit.lastPMinW')));
  set('settingsPara14aLastEvPower', _nwSettingsPower(_nwSettingsStateValue('para14a.audit.lastEvPowerW')));
  set('settingsPara14aLastGridPower', _nwSettingsPower(_nwSettingsStateValue('para14a.audit.lastGridPowerW')));
  set('settingsPara14aLastApplied', _nwSettingsCount(_nwSettingsStateValue('para14a.audit.lastConsumerAppliedCount')));
  const failTxt = [
    'Fehler ' + _nwSettingsCount(_nwSettingsStateValue('para14a.audit.lastConsumerFailedCount')),
    'Übersprungen ' + _nwSettingsCount(_nwSettingsStateValue('para14a.audit.lastConsumerSkippedCount')),
    'Schreibfehler ' + _nwSettingsCount(_nwSettingsStateValue('para14a.audit.lastConsumerWriteFailedCount'))
  ].join(' • ');
  set('settingsPara14aLastFailed', failTxt);

  set('settingsPara14aTraceTs', _nwSettingsTs(_nwSettingsStateValue('para14a.trace.sampleTs')));
  set('settingsPara14aTraceActive', _nwSettingsBool(_nwSettingsStateValue('para14a.trace.active')));
  set('settingsPara14aTraceSession', _nwSettingsText(_nwSettingsStateValue('para14a.trace.sessionId')));
  set('settingsPara14aTraceSource', _nwSettingsText(_nwSettingsStateValue('para14a.trace.source')));
  set('settingsPara14aTraceMode', _nwSettingsText(_nwSettingsStateValue('para14a.trace.mode')));
  set('settingsPara14aTraceBudget', _nwSettingsPower(_nwSettingsStateValue('para14a.trace.requestedTotalBudgetW')));
  set('settingsPara14aTraceCap', _nwSettingsPower(_nwSettingsStateValue('para14a.trace.effectiveEvcsCapW')));
  set('settingsPara14aTraceMinPerDevice', _nwSettingsPower(_nwSettingsStateValue('para14a.trace.minPerDeviceW')));
  set('settingsPara14aTracePmin', _nwSettingsPower(_nwSettingsStateValue('para14a.trace.pMinW')));
  set('settingsPara14aTraceEvcsCount', _nwSettingsCount(_nwSettingsStateValue('para14a.trace.evcsCount')));
  set('settingsPara14aTraceEvPower', _nwSettingsPower(_nwSettingsStateValue('para14a.trace.evPowerW')));
  set('settingsPara14aTraceGridPower', _nwSettingsPower(_nwSettingsStateValue('para14a.trace.gridPowerW')));

  const historyErrorEl = document.getElementById('settingsPara14aHistoryProvisionError');
  if (historyErrorEl) {
    const errTxt = _nwSettingsText(_nwSettingsStateValue('para14a.audit.historyProvisionError'), '');
    historyErrorEl.textContent = errTxt ? ('Historienhinweis: ' + errTxt) : '';
    historyErrorEl.style.display = errTxt ? '' : 'none';
  }

  const jsonEl = document.getElementById('settingsPara14aLastJson');
  if (jsonEl) jsonEl.textContent = _nwSettingsJson(_nwSettingsStateValue('para14a.audit.lastJson'));
}
/**
 * Code-Teil: setupSettingsReportButtons
 * Zweck: Bereitet Konfiguration/Eventbindung für diesen Bereich vor.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setupSettingsReportButtons(){
  const btn = document.getElementById('settingsPara14aReportBtn');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btn.addEventListener('click', () => {
    const toMs = Date.now();
    const fromMs = toMs - (30 * 24 * 3600 * 1000);
    window.location.href = `/para14a-report?from=${encodeURIComponent(fromMs)}&to=${encodeURIComponent(toMs)}`;
  });
}

// Abschnitt: Kunden-Einstellungen. data-scope/data-key-Felder werden an /api/set gebunden; nur kundenverständliche Optionen gehören hierher.
/**
 * Code-Teil: setupSettings
 * Zweck: Bereitet Konfiguration/Eventbindung für diesen Bereich vor.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setupSettings(){
  document.querySelectorAll('[data-scope="settings"]').forEach(el=> bindInputValue(el, 'settings.'+el.dataset.key));
  document.querySelectorAll('[data-scope="rfid"]').forEach(el=> bindInputValue(el, 'evcs.rfid.'+el.dataset.key));
  try { setupPvSurplusSettingsUi(); } catch (e) {}
  try { setupRfidWhitelistUi(); } catch (e) {}
  try { setupRfidLearningUi(); } catch (e) {}
  try { setupRfidBillingUi(); } catch (e) {}
  try { initSettingsPageTabs(); } catch (e) {}
  try { renderSettingsLogPanel(); } catch (e) {}
  try { setupSettingsReportButtons(); } catch (e) {}
}

// --- Speicherfarm (VIS read-only) ---
//
// WICHTIG: Die Konfiguration der Speicherfarm (Speicher hinzufügen, DP-Zuordnung, Gruppen)
// erfolgt ausschließlich im Installateur-/Admin-Bereich.
// In der VIS zeigen wir nur Status/Übersicht für Endverbraucher an.
/**
 * Code-Teil: parseJsonSafe
 * Zweck: Parst Rohdaten in ein sicheres internes Format.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function parseJsonSafe(raw, fallback){
  try{
    if (raw === null || raw === undefined) return fallback;
    const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return s ? JSON.parse(s) : fallback;
  } catch(_e){ return fallback; }
}
/**
 * Code-Teil: storageFarmGetStatusList
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function storageFarmGetStatusList(){
  const st = window.latestState || {};
  const raw = st['storageFarm.storagesStatusJson'] && st['storageFarm.storagesStatusJson'].value;
  const list = parseJsonSafe(raw, []);
  return Array.isArray(list) ? list : [];
}
/**
 * Code-Teil: storageFarmUpdateModeLabel
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function storageFarmUpdateModeLabel(){
  const el = document.getElementById('sf_mode_label');
  if (!el) return;
  const st = window.latestState || {};
  const mode = st['storageFarm.mode'] && st['storageFarm.mode'].value;
  el.textContent = 'Modus: ' + (String(mode||'pool').toLowerCase() === 'groups' ? 'Gruppen' : 'Pool');
}
/**
 * Code-Teil: storageFarmUpdateSummary
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function storageFarmUpdateSummary(){
  const sum = document.getElementById('sf_summary');
  if (!sum) return;
  const st = window.latestState || {};
  const soc = st['storageFarm.totalSoc'] && st['storageFarm.totalSoc'].value;
  const chg = st['storageFarm.totalChargePowerW'] && st['storageFarm.totalChargePowerW'].value;
  const dchg = st['storageFarm.totalDischargePowerW'] && st['storageFarm.totalDischargePowerW'].value;
  const on = st['storageFarm.storagesOnline'] && st['storageFarm.storagesOnline'].value;
  const disp = st['storageFarm.storagesDispatchAvailable'] && st['storageFarm.storagesDispatchAvailable'].value;
  const deg = st['storageFarm.storagesDegraded'] && st['storageFarm.storagesDegraded'].value;
  const tot = st['storageFarm.storagesTotal'] && st['storageFarm.storagesTotal'].value;
  sum.textContent = `SoC Ø: ${soc!==undefined?soc:'--'} % | Laden: ${chg!==undefined?formatPower(chg):'--'} | Entladen: ${dchg!==undefined?formatPower(dchg):'--'} | Online: ${on!==undefined?on:'--'}/${tot!==undefined?tot:'--'} | Regelbar: ${disp!==undefined?disp:'--'}/${tot!==undefined?tot:'--'}${(deg!==undefined && Number(deg)>0) ? (' | Degraded: ' + deg) : ''}`;
}
/**
 * Code-Teil: storageFarmRenderStatusRows
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function storageFarmRenderStatusRows(list){
  const wrap = document.getElementById('sf_status_rows');
  const msg = document.getElementById('sf_msg');
  if (!wrap) return;

  wrap.innerHTML = '';

  if (!Array.isArray(list) || list.length === 0){
    if (msg) msg.textContent = 'Keine Speicher konfiguriert.';
    return;
  }
  if (msg) msg.textContent = '';

  /**
   * Code-Teil: Arrow-Funktion `mkCell`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkCell
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkCell = (txt, label) => {
    const d = document.createElement('div');
    d.className = 'sf-cell';
    if (label) d.setAttribute('data-label', String(label));
    d.textContent = (txt === undefined || txt === null || txt === '') ? '--' : String(txt);
    return d;
  };

  list.forEach((row) => {
    const r = document.createElement('div');
    r.className = 'rfid-whitelist-row';
    r.style.gridTemplateColumns = '1.6fr 1fr 1fr 1fr 0.8fr';

    const name = (row && row.name) ? String(row.name) : 'Speicher';
    const soc = (row && row.soc !== undefined && row.soc !== null && !isNaN(Number(row.soc))) ? (Number(row.soc).toFixed(1)) : '--';
    const chg = (row && row.chargePowerW !== undefined && row.chargePowerW !== null && !isNaN(Number(row.chargePowerW))) ? formatPower(Number(row.chargePowerW)) : '--';
    const dchg = (row && row.dischargePowerW !== undefined && row.dischargePowerW !== null && !isNaN(Number(row.dischargePowerW))) ? formatPower(Number(row.dischargePowerW)) : '--';
    let online = 'Offline';
    const rowIsOnline = !!(row && (row.online === true || row.displayOnline === true || row.dispatchAvailable === true));
    const rowIsDegraded = !!(row && (row.degraded === true || row.state === 'degraded'));
    const reasons = []
      .concat(row && Array.isArray(row.dispatchBlockedReasons) ? row.dispatchBlockedReasons : [])
      .concat(row && Array.isArray(row.chargeBlockedReasons) ? row.chargeBlockedReasons : [])
      .concat(row && Array.isArray(row.dischargeBlockedReasons) ? row.dischargeBlockedReasons : []);
    const hasHardLock = reasons.some((x) => [
      'available_false',
      'fault_active',
      'device_offline',
      'charge_not_allowed',
      'discharge_not_allowed'
    ].includes(String(x || '')));
    const isIdle = ((row && row.chargePowerW !== undefined && row.chargePowerW !== null && !isNaN(Number(row.chargePowerW))) ? Math.abs(Number(row.chargePowerW)) : 0)
      + ((row && row.dischargePowerW !== undefined && row.dischargePowerW !== null && !isNaN(Number(row.dischargePowerW))) ? Math.abs(Number(row.dischargePowerW)) : 0) < 20;

    if (rowIsOnline && row && row.dispatchAvailable === true) {
      online = rowIsDegraded ? 'Degraded / Bereit' : (isIdle ? 'Online / Standby' : 'Online / Bereit');
    } else if (rowIsOnline && hasHardLock) {
      online = 'Gesperrt';
    } else if (rowIsOnline) {
      online = rowIsDegraded ? 'Degraded / prüfen' : 'Online / prüfen';
    } else if (row && row.dispatchAvailable) {
      online = 'Regelbar';
    }

    r.appendChild(mkCell(name, 'Speicher'));
    
    r.appendChild(mkCell(soc, 'SoC (%)'));
    
    r.appendChild(mkCell(chg, 'Laden'));
    
    r.appendChild(mkCell(dchg, 'Entladen'));
    
    r.appendChild(mkCell(online, 'Status'));
    
    wrap.appendChild(r);
  });
}
/**
 * Code-Teil: storageFarmApply
 * Zweck: Verarbeitet Speicherwerte; signed DP, Split-DPs und Fallbacks müssen konsistent bleiben.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function storageFarmApply(){
  try { storageFarmUpdateModeLabel(); } catch(_e) {}
  try { storageFarmUpdateSummary(); } catch(_e) {}
  try {
    const list = storageFarmGetStatusList();
    storageFarmRenderStatusRows(list);
  } catch(_e) {}
}
/**
 * Code-Teil: initStorageFarmPanel
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initStorageFarmPanel(){
  const btnReload = document.getElementById('sf_reload');
  if (btnReload && !btnReload.dataset.bound){
    btnReload.dataset.bound='1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnReload. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnReload.addEventListener('click', (e)=>{ e.preventDefault(); storageFarmApply(); });
  }
  // Initial render
  storageFarmApply();
}
/**
 * Code-Teil: loadRfidCustomerState
 * Zweck: Lädt Whitelist und Lernstatus über den datensparsamen RFID-Endpunkt.
 * Zusammenhang: Die Rohdaten werden bewusst nicht über /api/state oder SSE verteilt;
 * der bestehende Editor erhält weiterhin dieselben lokalen State-Schlüssel.
 */
async function loadRfidCustomerState(){
  const response = await fetch('/api/rfid/customer', { cache: 'no-store' });
  if (!response.ok) throw new Error(`RFID HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload || payload.ok === false) throw new Error((payload && payload.error) || 'RFID-Daten konnten nicht geladen werden.');
  const now = Date.now();
  window.latestState = window.latestState || {};
  const target = window.latestState;
  target['evcs.rfid.enabled'] = { value: payload.enabled === true, ts: now };
  target['evcs.rfid.whitelistJson'] = { value: String(payload.whitelistJson || JSON.stringify(Array.isArray(payload.whitelist) ? payload.whitelist : [])), ts: now };
  const learning = payload.learning && typeof payload.learning === 'object' ? payload.learning : {};
  target['evcs.rfid.learning.active'] = { value: learning.active === true, ts: now };
  target['evcs.rfid.learning.lastCaptured'] = { value: String(learning.lastCaptured || ''), ts: Number(learning.lastCapturedTs || now) || now };
  target['evcs.rfid.learning.lastCapturedTs'] = { value: Number(learning.lastCapturedTs || 0) || 0, ts: now };
  try { if (typeof state === 'object' && state) Object.assign(state, target); } catch (_e) {}
  return payload;
}
try { window.__nwLoadRfidCustomerState = loadRfidCustomerState; } catch (_e) {}

/**
 * Code-Teil: setupRfidWhitelistUi
 * Zweck: Bereitet Konfiguration/Eventbindung für diesen Bereich vor.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setupRfidWhitelistUi(){
  const rowsEl = document.getElementById('rfidWhitelistRows');
  if (!rowsEl) return;
  const msgEl = document.getElementById('rfidWhitelistMsg');
  const btnAdd = document.getElementById('rfidAddRow');
  const btnSave = document.getElementById('rfidSaveWhitelist');
  const btnReload = document.getElementById('rfidReloadWhitelist');
  /**
   * Code-Teil: normRfid
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function normRfid(v){ return String(v||'').trim().replace(/\s+/g,'').toUpperCase(); }
  /**
   * Code-Teil: safeText
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function safeText(v){ return String(v||'').trim(); }
  /**
   * Code-Teil: readWhitelistFromState
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function readWhitelistFromState(){
    try {
      const st = window.latestState || {};
      const info = st['evcs.rfid.whitelistJson'];
      const raw = (info && info.value !== undefined) ? String(info.value || '') : '';
      const parsed = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      return arr.map(x => {
        if (typeof x === 'string') return { rfid: normRfid(x), name: '', comment: '' };
        const r = normRfid(x.rfid ?? x.id ?? x.uid ?? x.card ?? '');
        const n = safeText(x.name ?? x.user ?? x.label ?? '');
        const c = safeText(x.comment ?? x.note ?? '');
        return { rfid: r, name: n, comment: c };
      });
    } catch (e) {
      return [];
    }
  }

  let list = readWhitelistFromState();
  /**
   * Code-Teil: setMsg
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setMsg(t){ if (msgEl) msgEl.textContent = t || ''; }
  /**
   * Code-Teil: render
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function render(){
    rowsEl.innerHTML = '';
    (list || []).forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'rfid-whitelist-row';

      const inRfid = document.createElement('input');
      inRfid.type = 'text';
      inRfid.placeholder = 'z.B. 04A1B2C3';
      inRfid.value = it.rfid || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inRfid. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      inRfid.addEventListener('input', () => { it.rfid = normRfid(inRfid.value); });

      const inName = document.createElement('input');
      inName.type = 'text';
      inName.placeholder = 'Name / Person';
      inName.value = it.name || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inName. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      inName.addEventListener('input', () => { it.name = safeText(inName.value); });

      const inComment = document.createElement('input');
      inComment.type = 'text';
      inComment.placeholder = 'Kommentar (optional)';
      inComment.value = it.comment || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inComment. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      inComment.addEventListener('input', () => { it.comment = safeText(inComment.value); });

      const del = document.createElement('button');
      del.className = 'rfid-del';
      del.type = 'button';
      del.textContent = '✕';
      del.title = 'Entfernen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      del.addEventListener('click', () => { list.splice(idx, 1); render(); });

      row.appendChild(inRfid);
      row.appendChild(inName);
      row.appendChild(inComment);
      row.appendChild(del);
      rowsEl.appendChild(row);
    });

    setMsg((list && list.length ? (list.length + ' Einträge in der Whitelist') : 'Whitelist ist leer') );
  }
  /**
   * Code-Teil: save
   * Zweck: Speichert Benutzereingaben oder Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function save(){
    const cleaned = [];
    const seen = new Set();
    for (const it of (list || [])) {
      const r = normRfid(it.rfid);
      if (!r) continue;
      if (seen.has(r)) continue;
      seen.add(r);
      cleaned.push({ rfid: r, name: safeText(it.name), comment: safeText(it.comment) });
    }
    const json = JSON.stringify(cleaned);
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'rfid', key: 'whitelistJson', value: json })
      });
      // update local snapshot so other UI reads consistent data
      window.latestState = window.latestState || {};
      window.latestState['evcs.rfid.whitelistJson'] = { value: json };
      list = cleaned;
      render();
      setMsg('Whitelist gespeichert (' + cleaned.length + ' Einträge).');
    } catch (e) {
      setMsg('Fehler beim Speichern der Whitelist.');
    }
  }
  /**
   * Code-Teil: reload
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function reload(){
    try {
      await loadRfidCustomerState();
      list = readWhitelistFromState();
      render();
      setMsg('Whitelist neu geladen.');
    } catch (e) {
      setMsg('Fehler beim Neuladen der Whitelist.');
    }
  }

  if (btnAdd && btnAdd.dataset.nwBound !== '1') {
    btnAdd.dataset.nwBound = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnAdd. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnAdd.addEventListener('click', () => {
      list.push({ rfid: '', name: '', comment: '' });
      render();
      try {
        const last = rowsEl.querySelector('.rfid-whitelist-row:last-child input');
        if (last) last.focus();
      } catch (e) {}
    });
  }
  if (btnSave && btnSave.dataset.nwBound !== '1') {
    btnSave.dataset.nwBound = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnSave. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnSave.addEventListener('click', save);
  }
  if (btnReload && btnReload.dataset.nwBound !== '1') {
    btnReload.dataset.nwBound = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnReload. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnReload.addEventListener('click', reload);
  }

  // Expose minimal API for other UI parts (e.g., RFID learning) to reuse the same list + save.
  window.__nwRfidWhitelist = window.__nwRfidWhitelist || {};
  window.__nwRfidWhitelist.get = () => (list || []).slice();
  window.__nwRfidWhitelist.addOrUpdate = (rfid, name, comment, { autoSave = true } = {}) => {
    const r = normRfid(rfid);
    if (!r) return false;
    const n = safeText(name);
    const c = safeText(comment);
    let found = false;
    for (const it of (list || [])) {
      if (normRfid(it.rfid) === r) {
        found = true;
        if (n) it.name = n;
        if (c) it.comment = c;
        break;
      }
    }
    if (!found) {
      list.push({ rfid: r, name: n, comment: c });
    }
    render();
    if (autoSave) {
      save();
    } else {
      setMsg('Eintrag übernommen. Bitte Whitelist speichern.');
    }
    return true;
  };
  window.__nwRfidWhitelist.reload = () => reload();
  window.__nwRfidWhitelist.save = () => save();

  render();
}
/**
 * Code-Teil: setupRfidLearningUi
 * Zweck: Bereitet Konfiguration/Eventbindung für diesen Bereich vor.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setupRfidLearningUi(){
  const btnLearn = document.getElementById('rfidLearnBtn');
  if (!btnLearn) return;
  const lastText = document.getElementById('rfidLastCapturedText');
  const inName = document.getElementById('rfidLearnName');
  const inComment = document.getElementById('rfidLearnComment');
  const btnAdd = document.getElementById('rfidLearnAdd');
  const msgEl = document.getElementById('rfidLearnMsg');
  /**
   * Code-Teil: setMsg
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setMsg(t){ if (msgEl) msgEl.textContent = t || ''; }
  /**
   * Code-Teil: setLearningActive
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function setLearningActive(active){
    try{
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'rfid', key: 'learning.active', value: !!active })
      });
      window.latestState = window.latestState || {};
      window.latestState['evcs.rfid.learning.active'] = { value: !!active };
    }catch(_e){}
  }
  /**
   * Code-Teil: readStateVal
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function readStateVal(key){
    const st = window.latestState || {};
    return st[key] ? st[key].value : undefined;
  }
  let learningPollTimer = null;
  let learningPollUntil = 0;
  const stopLearningPoll = () => {
    if (learningPollTimer) clearTimeout(learningPollTimer);
    learningPollTimer = null;
  };
  const pollLearningState = async () => {
    stopLearningPoll();
    try { await loadRfidCustomerState(); } catch (_e) {}
    applyUi();
    const active = !!readStateVal('evcs.rfid.learning.active');
    if (active && Date.now() < learningPollUntil) {
      learningPollTimer = setTimeout(pollLearningState, 1000);
    }
  };
  const startLearningPoll = () => {
    learningPollUntil = Date.now() + 90 * 1000;
    pollLearningState();
  };
  /**
   * Code-Teil: applyUi
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function applyUi(){
    const active = !!readStateVal('evcs.rfid.learning.active');
    const last = readStateVal('evcs.rfid.learning.lastCaptured');
    const ts = readStateVal('evcs.rfid.learning.lastCapturedTs');

    if (btnLearn) btnLearn.textContent = active ? 'Warte auf Karte… (Stop)' : 'Karte anlernen';
    if (lastText) {
      const t = (last != null && String(last).trim()) ? String(last).trim() : '--';
      lastText.textContent = t;
      if (t !== '--' && ts) {
        try{ lastText.title = new Date(Number(ts)).toLocaleString(nwUiLocaleTag()); }catch(_e){}
      }
    }
    if (active) {
      setMsg('Anlernen aktiv – halte eine RFID-Karte vor die Wallbox.');
    } else {
      // do not overwrite explicit messages unless empty
      if (msgEl && !msgEl.textContent) setMsg('');
    }
  }

  // Prevent duplicate listeners
  if (btnLearn && btnLearn.dataset.nwBound !== '1') {
    btnLearn.dataset.nwBound = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnLearn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnLearn.addEventListener('click', async () => {
      const active = !!readStateVal('evcs.rfid.learning.active');
      setMsg('');
      await setLearningActive(!active);
      // RFID-Rohdaten laufen nicht über SSE; während des Lernens wird deshalb
      // gezielt der kleine RFID-Endpunkt abgefragt.
      if (!active) startLearningPoll();
      else stopLearningPoll();
      applyUi();
    });
  }

  if (btnAdd && btnAdd.dataset.nwBound !== '1') {
    btnAdd.dataset.nwBound = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnAdd. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnAdd.addEventListener('click', () => {
      const last = readStateVal('evcs.rfid.learning.lastCaptured');
      const rfid = String(last || '').trim();
      if (!rfid) {
        setMsg('Keine Karte erkannt. Bitte zuerst „Karte anlernen“ starten.');
        return;
      }
      const api = window.__nwRfidWhitelist;
      if (!api || typeof api.addOrUpdate !== 'function') {
        setMsg('Whitelist-Editor nicht verfügbar. Seite neu laden.');
        return;
      }
      const name = inName ? inName.value : '';
      const comment = inComment ? inComment.value : '';
      api.addOrUpdate(rfid, name, comment, { autoSave: true });
      if (inName) inName.value = '';
      if (inComment) inComment.value = '';
      setMsg('Karte übernommen und gespeichert.');
    });
  }

  // Make applyUi accessible for render() updates
  window.__nwApplyRfidLearningUi = applyUi;

  applyUi();
  loadRfidCustomerState().then(() => applyUi()).catch(() => {});
}
/**
 * Code-Teil: setupRfidBillingUi
 * Zweck: Bereitet Konfiguration/Eventbindung für diesen Bereich vor.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setupRfidBillingUi(){
  const btnOpen = document.getElementById('rfidBillingOpen');
  const sel = document.getElementById('rfidBillingCard');
  const modeWrap = document.getElementById('rfidBillingMode');
  const monthRow = document.getElementById('rfidBillingMonthRow');
  const yearRow = document.getElementById('rfidBillingYearRow');
  const inMonth = document.getElementById('rfidBillingMonth');
  const inYear = document.getElementById('rfidBillingYear');
  const msgEl = document.getElementById('rfidBillingMsg');

  if (!btnOpen || !sel) return;
  /**
   * Code-Teil: pad2
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function pad2(n){ return String(Number(n)||0).padStart(2,'0'); }
  /**
   * Code-Teil: setMsg
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setMsg(t){ if (msgEl) msgEl.textContent = t || ''; }
  /**
   * Code-Teil: getWhitelist
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function getWhitelist(){
    // Prefer the editor API (keeps same parsing logic)
    try{
      if (window.__nwRfidWhitelist && typeof window.__nwRfidWhitelist.get === 'function') {
        const a = window.__nwRfidWhitelist.get();
        if (Array.isArray(a)) return a;
      }
    }catch(_e){}

    // Fallback: parse state snapshot
    try{
      const st = window.latestState || {};
      const raw = st['evcs.rfid.whitelistJson'] && st['evcs.rfid.whitelistJson'].value;
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    }catch(_e){}
    return [];
  }
  /**
   * Code-Teil: renderOptions
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function renderOptions(){
    const list = getWhitelist();
    const prev = String(sel.value || '');

    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = list && list.length ? 'Bitte wählen…' : 'Keine Karten in Whitelist';
    sel.appendChild(opt0);

    if (Array.isArray(list)) {
      for (const it of list) {
        let rfid = '';
        let name = '';
        let comment = '';

        if (typeof it === 'string') {
          rfid = it;
        } else if (it && typeof it === 'object') {
          rfid = it.rfid || it.id || it.uid || it.card || '';
          name = it.name || it.user || it.label || '';
          comment = it.comment || it.note || '';
        }

        rfid = String(rfid || '').trim();
        if (!rfid) continue;

        const o = document.createElement('option');
        o.value = rfid;

        const n = String(name || '').trim();
        const c = String(comment || '').trim();
        let label = n ? (n + ' (' + rfid + ')') : rfid;
        if (c) label += ' – ' + c;

        o.textContent = label;
        sel.appendChild(o);
      }
    }

    if (prev) sel.value = prev;
  }

  let mode = 'month';
  /**
   * Code-Teil: applyMode
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function applyMode(m){
    mode = (m === 'year') ? 'year' : 'month';

    if (modeWrap) {
      modeWrap.querySelectorAll('button[data-value]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === mode);
      });
    }

    if (monthRow) monthRow.classList.toggle('hidden', mode !== 'month');
    if (yearRow) yearRow.classList.toggle('hidden', mode !== 'year');

    setMsg('');
  }

  // Bind mode buttons
  if (modeWrap && modeWrap.dataset.nwBound !== '1') {
    modeWrap.dataset.nwBound = '1';
    modeWrap.querySelectorAll('button[data-value]').forEach(btn => {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => applyMode(btn.dataset.value));
    });
  }

  // Default month/year
  const now = new Date();
  try{
    if (inMonth && !inMonth.value) inMonth.value = now.getFullYear() + '-' + pad2(now.getMonth() + 1);
    if (inYear && !inYear.value) inYear.value = String(now.getFullYear());
  }catch(_e){}

  renderOptions();
  applyMode('month');

  // Bind open button
  if (btnOpen && btnOpen.dataset.nwBound !== '1') {
    btnOpen.dataset.nwBound = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnOpen. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnOpen.addEventListener('click', () => {
      try{ renderOptions(); } catch(_e){}
      const rfid = String(sel.value || '').trim();
      if (!rfid) {
        setMsg('Bitte eine Karte auswählen.');
        return;
      }

      let fromMs = 0;
      let toMs = Date.now();

      if (mode === 'year') {
        const y = Number(inYear && inYear.value) || now.getFullYear();
        const start = new Date(y, 0, 1, 0, 0, 0, 0);
        const end = new Date(y, 11, 31, 23, 59, 59, 999);
        fromMs = start.getTime();
        toMs = end.getTime();
      } else {
        const v = String((inMonth && inMonth.value) || '');
        const parts = v.split('-');
        const y = Number(parts[0]) || now.getFullYear();
        const m = (Number(parts[1]) || (now.getMonth() + 1)) - 1;
        const start = new Date(y, m, 1, 0, 0, 0, 0);
        const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
        fromMs = start.getTime();
        toMs = end.getTime();
      }

      const url = '/static/rfid-report.html'
        + '?rfid=' + encodeURIComponent(rfid)
        + '&from=' + encodeURIComponent(String(fromMs))
        + '&to=' + encodeURIComponent(String(toMs));

      try{
        window.open(url, '_blank', 'noopener');
        setMsg('');
      }catch(_e){
        // fallback
        window.location.href = url;
      }
    });
  }
}
/**
 * Code-Teil: setupInstaller
 * Zweck: Bereitet Konfiguration/Eventbindung für diesen Bereich vor.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setupInstaller(){
  const loginBox = document.getElementById('installerLoginBox');
  const formBox  = document.getElementById('installerForm');
  const form     = document.getElementById('installerLoginForm');
  const btn      = document.getElementById('inst_login');
  const cancel   = document.getElementById('inst_cancel');
  const pw       = document.getElementById('inst_pw');
  /**
   * Code-Teil: refreshLock
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function refreshLock(){
    try {
      const r = await fetch('/config', { cache:'no-store', credentials:'same-origin' });
      const j = await r.json();
      const locked = !!j.installerLocked;
      if (loginBox) loginBox.classList.toggle('hidden', !locked);
      if (formBox)  formBox.classList.toggle('hidden',  locked);
      if (formBox) {
        formBox.querySelectorAll('input,select,button,textarea').forEach(el => {
          if (el.id !== 'inst_cancel') el.disabled = locked;
        });
      }
    } catch(_) {}
  }
  /**
   * Code-Teil: doLogin
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function doLogin(){
    try{
      const pass = String((pw && pw.value) || '');
      if (!pass){ alert('Bitte Passwort eingeben'); return; }
      const r = await fetch('/api/installer/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body: JSON.stringify({ password: pass })
      });
      if (r.ok){
        if (pw) pw.value='';
        await refreshLock();
      } else {
        alert('Passwort falsch');
      }
    }catch(_){ alert('Login fehlgeschlagen'); }
  }

  if (btn && !btn.dataset.bound){ btn.dataset.bound='1'; btn.addEventListener('click', (e)=>{ e.preventDefault(); doLogin(); }); }
  if (form && !form.dataset.bound){ form.dataset.bound='1'; form.addEventListener('submit', (e)=>{ e.preventDefault(); doLogin(); }); }
  if (cancel && !cancel.dataset.bound){
    cancel.dataset.bound = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an cancel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    cancel.addEventListener('click', (e)=>{
      e.preventDefault();
      const installerSec = document.querySelector('[data-tab-content="installer"]');
      if (installerSec) installerSec.classList.add('hidden');
      const live = document.querySelector('.content');
      if (live) live.style.display = 'grid';
      document.querySelectorAll('.tabs .tab').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === 'live');
      });
    });
  }

  refreshLock();
}
/**
 * Code-Teil: initInstallerPanel
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initInstallerPanel(){
  if (SERVER_CFG && SERVER_CFG.installerLocked && !null) return;
  document.querySelectorAll('#installerForm [data-scope="installer"]').forEach(el=>{
    const key = el.dataset.key; bindInputValue(el, 'installer.' + key);
  });
  const a = document.getElementById('openAdminBtn');
  if (a){ const url = (SERVER_CFG && SERVER_CFG.adminUrl) || '/'; a.href = url || '/'; }
}

// Simple tab switching
/**
 * Code-Teil: initTabs
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initTabs(){
  const buttons = document.querySelectorAll('.tabs .tab[data-tab]');
  buttons.forEach(btn => btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab') || 'live';

    // Standalone pages are handled through normal navigation.
    if (tab === 'history') { window.location.href = '/history.html'; return; }
    if (tab === 'smarthome') { window.location.href = '/smarthome.html'; return; }
    if (tab === 'storagefarm') { window.location.href = '/storagefarm.html'; return; }

    showDashboardTab(tab);
  }));
}
/**
 * Code-Teil: renderSmartHome
 * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function renderSmartHome(){
  /**
   * Code-Teil: onTxt
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const onTxt = (v)=> v ? 'AN' : 'AUS';
  /**
   * Code-Teil: d
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const d = (k)=> state[k]?.value;
  /**
   * Code-Teil: get
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const get = (path) => {
    // allow mapping from smartHome.datapoints.* in the future
    return d(path);
  };
  const hp = get('smartHome_heatPumpOn');
  const rt = get('smartHome_roomTemp');
  const wl = get('smartHome_wallboxLock');
  const hpEl = document.getElementById('smhHeatPump');
  const rtEl = document.getElementById('smhRoomTemp');
  const wlEl = document.getElementById('smhWallboxLock');
  if (hpEl) hpEl.textContent = (hp===undefined?'--':onTxt(!!hp));
  if (rtEl) rtEl.textContent = (rt===undefined?'--':Number(rt).toFixed(1)+' °C');
  if (wlEl) wlEl.textContent = (wl===undefined?'--':(wl?'Gesperrt':'Freigabe'));
}

const _renderOrig = render;
render = function(){

  // ---- Energy donut update ----
  try {
    /**
     * Code-Teil: Arrow-Funktion `d`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: d
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const { buy } = getGridImportExport(d);
    const batteryFlow = getNormalizedBatteryFlow();
    const chg = Number(batteryFlow.chargeW) || 0;
    const dchg = Number(batteryFlow.dischargeW) || 0;
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    const A = { pv: 330, load: 30, bat: 180, grid: 210 };
    const MAX = { pv: 110, load: 45, bat: 60, grid: 45 };
    const total = Math.max(1, pv + buy + load + (chg + dchg));
    /**
     * Code-Teil: Arrow-Funktion `pctDeg`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: pctDeg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const pctDeg = (val, maxDeg) => Math.max(2, Math.min(maxDeg, (val/total) * maxDeg));

    setArcAtAngle('.donut .arc.pv',   42, A.pv,   pctDeg(pv,   MAX.pv));
    setArcAtAngle('.donut .arc.load', 42, A.load, pctDeg(load, MAX.load));
    setArcAtAngle('.donut .arc.bat',  42, A.bat,  pctDeg(chg + dchg, MAX.bat));
    setArcAtAngle('.donut .arc.grid', 42, A.grid, pctDeg(buy,  MAX.grid));

    /**
     * Code-Teil: Arrow-Funktion `setText`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setText
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvLbl', formatPower(pv));
    setText('gridLbl', formatPower(buy));
    setText('loadLbl', formatPower(load));
    setText('centerLbl', formatPower(0));

    if (soc !== undefined && !isNaN(Number(soc))) {
      setText('socLbl', Number(soc).toFixed(0)+' %');
      setText('batterySocIn', Number(soc).toFixed(0)+' %');
      setArc('.donut .arc.soc', 34, Math.max(0, Math.min(100, Number(soc))));
    }
    if (cap && soc !== undefined) {
      const socPct = Number(soc)/100;
      const tFull = chg>0 ? ((cap*(1-socPct))*1000)/chg : null;
      const tEmpty= dchg>0 ? ((cap*socPct)*1000)/dchg : null;
      setText('tFull', 'Voll '+(tFull?formatHours(tFull):'--'));
      setText('tEmpty','Leer '+(tEmpty?formatHours(tEmpty):'--'));
    }

    placeIconAtAngle('.energy-donut .icon-block.pv',   A.pv);
    placeIconAtAngle('.energy-donut .icon-block.grid', A.grid);
    placeIconAtAngle('.energy-donut .icon-block.load', A.load);
  } catch(e){ console.warn('donut update', e); }

  /* DONUT-HOOK */

  // --- Runde Energieanzeige ---
  try {
    /**
     * Code-Teil: Arrow-Funktion `d`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: d
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const { buy, sell } = getGridImportExport(d);
    const batteryFlow = getNormalizedBatteryFlow();
    const charge = Number(batteryFlow.chargeW) || 0;
    const discharge = Number(batteryFlow.dischargeW) || 0;
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    // Values
    /**
     * Code-Teil: Arrow-Funktion `setText`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setText
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvVal', formatPower(pv));
    setText('gridBuyVal', formatPower(buy));
    setText('gridSellVal', formatPower(sell));
    setText('chargeVal', formatPower(charge));
    setText('dischargeVal', formatPower(discharge));
    setText('centerLoad', formatPower(load));
    if (soc !== undefined && !isNaN(Number(soc))) { setText('socText', 'SoC ' + Number(soc).toFixed(0) + ' %'); setText('batterySocIn', Number(soc).toFixed(0)+' %'); }

    // Times
    if (cap && soc !== undefined) {
      const socPct = Number(soc) / 100;
      const remToFull_kWh = cap * (1 - socPct);
      const remToEmpty_kWh = cap * (socPct);
      // using outer 'charge'/'discharge'
      // using outer 'charge'/'discharge'
      const tFull_h = charge > 0 ? (remToFull_kWh * 1000) / charge : null;
      const tEmpty_h = discharge > 0 ? (remToEmpty_kWh * 1000) / discharge : null;
      setText('tFull', 'Voll ' + (tFull_h?formatHours(tFull_h):'--'));
      setText('tEmpty', 'Leer ' + (tEmpty_h?formatHours(tEmpty_h):'--'));
      // SoC ring
      setDonut('soc', Math.max(0, Math.min(100, Number(soc))), true);
    }

    // Arcs relative to max flow
    const totalFlow = Math.max(1, pv + buy + load + (charge + discharge));
    /**
     * Code-Teil: Arrow-Funktion `pct`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: pct
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const pct = (v) => Math.min(100, Math.max(0, (v / totalFlow) * 100));
    setDonut('pv', pct(pv));
    setDonut('gridbuy', pct(buy));
    setDonut('gridsell', pct(sell));
    setDonut('load', pct(load));
    setDonut('storage', pct(charge + discharge));
  } catch(e) { console.warn('donut render error', e); }

  _renderOrig();
  renderSmartHome();
}


// Zusätzliche Anzeige-Updates für Energiefluss
const _renderEF = render;
render = function(){

  // ---- Energy donut update ----
  try {
    /**
     * Code-Teil: Arrow-Funktion `d`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: d
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const { buy } = getGridImportExport(d);
    const batteryFlow = getNormalizedBatteryFlow();
    const chg = Number(batteryFlow.chargeW) || 0;
    const dchg = Number(batteryFlow.dischargeW) || 0;
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    const A = { pv: 330, load: 30, bat: 180, grid: 210 };
    const MAX = { pv: 110, load: 45, bat: 60, grid: 45 };
    const total = Math.max(1, pv + buy + load + (chg + dchg));
    /**
     * Code-Teil: Arrow-Funktion `pctDeg`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: pctDeg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const pctDeg = (val, maxDeg) => Math.max(2, Math.min(maxDeg, (val/total) * maxDeg));

    setArcAtAngle('.donut .arc.pv',   42, A.pv,   pctDeg(pv,   MAX.pv));
    setArcAtAngle('.donut .arc.load', 42, A.load, pctDeg(load, MAX.load));
    setArcAtAngle('.donut .arc.bat',  42, A.bat,  pctDeg(chg + dchg, MAX.bat));
    setArcAtAngle('.donut .arc.grid', 42, A.grid, pctDeg(buy,  MAX.grid));

    /**
     * Code-Teil: Arrow-Funktion `setText`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setText
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvLbl', formatPower(pv));
    setText('gridLbl', formatPower(buy));
    setText('loadLbl', formatPower(load));
    setText('centerLbl', formatPower(0));

    if (soc !== undefined && !isNaN(Number(soc))) {
      setText('socLbl', Number(soc).toFixed(0)+' %');
      setText('batterySocIn', Number(soc).toFixed(0)+' %');
      setArc('.donut .arc.soc', 34, Math.max(0, Math.min(100, Number(soc))));
    }
    if (cap && soc !== undefined) {
      const socPct = Number(soc)/100;
      const tFull = chg>0 ? ((cap*(1-socPct))*1000)/chg : null;
      const tEmpty= dchg>0 ? ((cap*socPct)*1000)/dchg : null;
      setText('tFull', 'Voll '+(tFull?formatHours(tFull):'--'));
      setText('tEmpty','Leer '+(tEmpty?formatHours(tEmpty):'--'));
    }

    placeIconAtAngle('.energy-donut .icon-block.pv',   A.pv);
    placeIconAtAngle('.energy-donut .icon-block.grid', A.grid);
    placeIconAtAngle('.energy-donut .icon-block.load', A.load);
  } catch(e){ console.warn('donut update', e); }

  /* DONUT-HOOK */

  // --- Runde Energieanzeige ---
  try {
    /**
     * Code-Teil: Arrow-Funktion `d`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: d
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const { buy, sell } = getGridImportExport(d);
    const batteryFlow = getNormalizedBatteryFlow();
    const charge = Number(batteryFlow.chargeW) || 0;
    const discharge = Number(batteryFlow.dischargeW) || 0;
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    // Values
    /**
     * Code-Teil: Arrow-Funktion `setText`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setText
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvVal', formatPower(pv));
    setText('gridBuyVal', formatPower(buy));
    setText('gridSellVal', formatPower(sell));
    setText('chargeVal', formatPower(charge));
    setText('dischargeVal', formatPower(discharge));
    setText('centerLoad', formatPower(load));
    if (soc !== undefined && !isNaN(Number(soc))) { setText('socText', 'SoC ' + Number(soc).toFixed(0) + ' %'); setText('batterySocIn', Number(soc).toFixed(0)+' %'); }

    // Times
    if (cap && soc !== undefined) {
      const socPct = Number(soc) / 100;
      const remToFull_kWh = cap * (1 - socPct);
      const remToEmpty_kWh = cap * (socPct);
      // using outer 'charge'/'discharge'
      // using outer 'charge'/'discharge'
      const tFull_h = charge > 0 ? (remToFull_kWh * 1000) / charge : null;
      const tEmpty_h = discharge > 0 ? (remToEmpty_kWh * 1000) / discharge : null;
      setText('tFull', 'Voll ' + (tFull_h?formatHours(tFull_h):'--'));
      setText('tEmpty', 'Leer ' + (tEmpty_h?formatHours(tEmpty_h):'--'));
      // SoC ring
      setDonut('soc', Math.max(0, Math.min(100, Number(soc))), true);
    }

    // Arcs relative to max flow
    const totalFlow = Math.max(1, pv + buy + load + (charge + discharge));
    /**
     * Code-Teil: Arrow-Funktion `pct`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: pct
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const pct = (v) => Math.min(100, Math.max(0, (v / totalFlow) * 100));
    setDonut('pv', pct(pv));
    setDonut('gridbuy', pct(buy));
    setDonut('gridsell', pct(sell));
    setDonut('load', pct(load));
    setDonut('storage', pct(charge + discharge));
  } catch(e) { console.warn('donut render error', e); }

  _renderEF();
  try {
    const s = state;
    /**
     * Code-Teil: Arrow-Funktion `d`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: d
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const d = (k) => s[k]?.value;
    const pv = d('pvPower') ?? d('productionTotal');
    const load = d('consumptionTotal');
    /**
     * Code-Teil: setText
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    function setText(id, txt){ const el = document.getElementById(id); if (el) el.textContent = txt; }
    setText('pvPowerBig', (pv===undefined?'--':formatPower(pv)));
    setText('consumptionTotalBig', (load===undefined?'--':formatPower(load)));
  } catch(e) { console.warn(e); }

  try { storageFarmUpdateSummary(); } catch(_e) {}
}

// SIDE-VALUES
/**
 * Code-Teil: setSideValue
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function setSideValue(id, val){ const el=document.getElementById(id); if(el) el.textContent = val; }


// ---- EMS Control UI (Optimierung) ----
/**
 * Code-Teil: updateEmsControlUi
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateEmsControlUi() {
  try {
    const st = window.latestState || {};
    /**
     * Code-Teil: Arrow-Funktion `v`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: v
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const v = (k) => (st && st[k] && st[k].value !== undefined) ? st[k].value : null;

    const emsCfg = (window.__nwEmsCfg && typeof window.__nwEmsCfg === 'object') ? window.__nwEmsCfg : {};
    const peakInstalled = !!emsCfg.peakShavingEnabled;
    const para14aInstalled = !!emsCfg.para14aEnabled;

    const tariffOn = !!v('settings.dynamicTariff');

    // Card (Optimierung)
    const showCard = true; // Always show the entry point for end-customer control
    const card = document.getElementById('tariffCard');
    if (card) card.classList.toggle('hidden', !showCard);

    const priceNow = v('priceCurrent');
    const priceAvg = v('priceAverage');

    /**
     * Code-Teil: Arrow-Funktion `setText`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setText
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    // Price display
    if (!tariffOn) {
      setText('priceCurrent', 'Aus');
      setText('priceAverage', '--');
    } else {
      setText('priceCurrent', formatPricePerKwh(priceNow));
      setText('priceAverage', formatPricePerKwh(priceAvg));
    }

    // Peak short status (Netzschutz – nur Installateur konfigurierbar)
    const peakStatus = String(v('peakShaving.control.status') || '').trim();

    let peakShort = '--';
    if (!peakInstalled) peakShort = '—';
    else {
      const s = peakStatus || 'inactive';
      if (s === 'active') peakShort = 'Aktiv';
      else if (s === 'pending_on') peakShort = 'Anlauf';
      else if (s === 'pending_off') peakShort = 'Abkling';
      else peakShort = 'Bereit';
    }
    setText('peakShort', peakShort);


    // §14a short status
    let p14Short = '--';
    if (!para14aInstalled) p14Short = '—';
    else {
      const active = !!v('ems.core.para14aActive');
      p14Short = active ? 'Aktiv' : 'Inaktiv';
    }
    setText('para14aShort', p14Short);

    // PV‑Reserve Indikator (Tarif-Netzladen wird bewusst begrenzt)
    try {
      const pvWrap = document.getElementById('pvReserveWrap');
      const pvShortEl = document.getElementById('pvReserveShort');
      const pvBlocked = !!v('speicher.regelung.tarifPvBlock');
      const pvReason = v('speicher.regelung.tarifPvBlockGrund');
      const show = !!(tariffOn && pvBlocked);

      if (pvWrap) {
        pvWrap.style.display = show ? '' : 'none';
        pvWrap.title = (show && pvReason) ? String(pvReason) : '';
      }
      if (pvShortEl) pvShortEl.textContent = show ? '⛔' : '⛔';
    } catch (_e) {}

    // Modal
    const modal = document.getElementById('emsModal');
    const modalOpen = modal && !modal.classList.contains('hidden');
    if (modalOpen) {
      const tglTariff = document.getElementById('emsTariffToggle');
      if (tglTariff) tglTariff.checked = !!tariffOn;
      try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('emsTariffToggle'); } catch(_e) {}

      // Tariff status in modal
      const tariffMode = Number(v('settings.tariffMode') || 1);
      const tariffPriority = Number(v('settings.priority') || 2);

      const stTariff = document.getElementById('emsTariffStatus');
      const hintTariff = document.getElementById('emsTariffHint');
      if (stTariff) stTariff.textContent = tariffOn ? ((tariffMode === 2) ? 'Automatik' : 'Manuell') : 'Aus';
      if (hintTariff) {
        if (!tariffOn) {
          hintTariff.textContent = 'Optimierung deaktiviert';
          hintTariff.title = '';
        } else {
          const statusText = v('tarif.statusText');
          const pvBlocked = !!v('speicher.regelung.tarifPvBlock');
          const pvReason = v('speicher.regelung.tarifPvBlockGrund');
          const pvCapSoc = v('speicher.regelung.tarifPvCapSocPct');

          let hint = (statusText !== null && statusText !== undefined && String(statusText).trim())
            ? String(statusText)
            : 'Optimierung aktiv';

          if (pvBlocked) {
            const capTxt = (pvCapSoc !== null && pvCapSoc !== undefined && Number.isFinite(Number(pvCapSoc)))
              ? ` (max ${Number(pvCapSoc).toFixed(1)}%)`
              : '';
            hint += ` — Netzladen aktiv, aber durch PV‑Reserve geblockt${capTxt}`;
            hintTariff.title = (pvReason !== null && pvReason !== undefined && String(pvReason).trim()) ? String(pvReason) : '';
          } else {
            hintTariff.title = '';
          }

          hintTariff.textContent = hint;
        }
      }

      setText('emsPriceCurrent', tariffOn ? formatPricePerKwh(priceNow) : '--');
      setText('emsPriceAvg', tariffOn ? formatPricePerKwh(priceAvg) : '--');

      // Priority buttons
      const prioWrap = document.getElementById('emsTariffPriorityButtons');
      if (prioWrap) {
        prioWrap.querySelectorAll('button').forEach(b => {
          const p = Number(b.getAttribute('data-prio') || 0);
          b.classList.toggle('active', p === tariffPriority);
        });
      }

      // Mode buttons
      const modeWrap = document.getElementById('emsTariffModeButtons');
      if (modeWrap) {
        modeWrap.querySelectorAll('button').forEach(b => {
          const m = Number(b.getAttribute('data-mode') || 0);
          b.classList.toggle('active', m === tariffMode);
        });
      }

      // Peak row visibility + details
      const peakRow = document.getElementById('emsPeakRow');
      const peakNums = document.getElementById('emsPeakNumbers');
      if (peakRow) peakRow.style.display = peakInstalled ? '' : 'none';
      if (peakNums) peakNums.style.display = peakInstalled ? '' : 'none';

      const stPeak = document.getElementById('emsPeakStatus');
      const hintPeak = document.getElementById('emsPeakHint');
      const peakLimitW = v('peakShaving.control.effectiveLimitW') ?? v('peakShaving.control.limitW');
      const peakOverW = v('peakShaving.control.overW');
      if (stPeak) stPeak.textContent = (!peakInstalled) ? '—' : (peakShort || 'Bereit');
      if (hintPeak) {
        if (!peakInstalled) hintPeak.textContent = 'Nicht aktiv';
        else {
          const rt = v('peakShaving.control.reasonText');
          hintPeak.textContent = (rt !== null && rt !== undefined && String(rt).trim())
            ? String(rt)
            : 'Automatisch (Netzschutz) – nur Installateur konfigurierbar.';
        }
      }
      setText('emsPeakLimit', (peakLimitW != null ? formatPower(Number(peakLimitW)) : '--'));
      setText('emsPeakOver', (peakOverW != null ? formatPower(Number(peakOverW)) : '--'));

      // §14a row visibility + details
      const row14 = document.getElementById('ems14aRow');
      if (row14) row14.style.display = para14aInstalled ? '' : 'none';

      const st14 = document.getElementById('ems14aStatus');
      const cap14 = document.getElementById('ems14aCap');
      const hint14 = document.getElementById('ems14aHint');

      if (para14aInstalled) {
        const a = !!v('ems.core.para14aActive');
        const cap = v('ems.core.para14aEvcsCapW') ?? v('ems.core.para14aCapW');
        if (st14) st14.textContent = a ? 'Aktiv' : 'Inaktiv';
        if (cap14) cap14.textContent = (cap != null && Number(cap) > 0) ? formatPower(Number(cap)) : '--';
        if (hint14) hint14.textContent = 'Wird automatisch berücksichtigt.';
      } else {
        if (st14) st14.textContent = '—';
        if (cap14) cap14.textContent = '--';
        if (hint14) hint14.textContent = 'Nicht konfiguriert.';
      }
    }
  } catch (_e) {}
}
/**
 * Code-Teil: initEmsControlModal
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initEmsControlModal() {
  if (window.__nwEmsControlModalInit) return;
  const card = document.getElementById('tariffCard');
  const modal = document.getElementById('emsModal');
  if (!card || !modal) return;

  const closeBtn = document.getElementById('emsClose');
  const openSettingsBtn = document.getElementById('emsModalOpenSettings');

  /**
   * Code-Teil: Arrow-Funktion `setSetting`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: setSetting
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setSetting = async (key, value) => {
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'settings', key, value })
      });
    } catch (_e) {}
  };

  /**
   * Code-Teil: Arrow-Funktion `open`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: open
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    try { updateEmsControlUi(); } catch(_e) {}
  };
  /**
   * Code-Teil: close
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const close = () => modal.classList.add('hidden');

  // Expose for other UI handlers (e.g. tariff tile click routing)
  try { window.__nwEmsControlModal = { open, close }; } catch(_e) {}

  const openBtn = document.getElementById('tariffEmsBtn') || card;
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an openBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  openBtn.addEventListener('click', (e)=>{ try{ if (e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} open(e); });
  const energyDetailsBtn = document.getElementById('energyTariffDetailsBtn');
  if (energyDetailsBtn) energyDetailsBtn.addEventListener('click', (e)=>{ try{ if (e){ e.preventDefault(); e.stopPropagation(); } }catch(_e){} open(e); });

  if (closeBtn) closeBtn.addEventListener('click', close);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });

  // Tariff toggle
  const tariffToggle = document.getElementById('emsTariffToggle');
  if (tariffToggle) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an tariffToggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    tariffToggle.addEventListener('change', () => setSetting('dynamicTariff', !!tariffToggle.checked));
  }

  
// Tariff priority buttons
  const prioWrap = document.getElementById('emsTariffPriorityButtons');
  if (prioWrap) {
    prioWrap.querySelectorAll('button').forEach(btn => {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => {
        const p = Number(btn.getAttribute('data-prio') || '');
        if (Number.isFinite(p) && p > 0) setSetting('priority', p);
      });
    });
  }

  // Tariff mode buttons
  const modeWrap = document.getElementById('emsTariffModeButtons');
  if (modeWrap) {
    modeWrap.querySelectorAll('button').forEach(btn => {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => {
        const m = Number(btn.getAttribute('data-mode') || '');
        if (Number.isFinite(m) && m > 0) setSetting('tariffMode', m);
      });
    });
  }

  if (openSettingsBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an openSettingsBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    openSettingsBtn.addEventListener('click', () => { window.location.href = '/settings.html'; });
  }

  window.__nwEmsControlModalInit = true;
}
/**
 * Code-Teil: initThresholdModal
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initThresholdModal() {
  if (window.__nwThresholdModalInit) return;

  const card = document.getElementById('thresholdCard');
  const modal = document.getElementById('thresholdModal');
  const closeBtn = document.getElementById('thrClose');
  const listEl = document.getElementById('thrList');
  const hintEl = document.getElementById('thrHint');

  if (!card || !modal || !closeBtn || !listEl) return;

  /**
   * Code-Teil: Arrow-Funktion `setHint`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  const setHint = (msg, isError = false) => {
    if (!hintEl) return;
    hintEl.textContent = String(msg || '');
    hintEl.style.color = isError ? '#fca5a5' : '';
  };
  /**
   * Code-Teil: apiSet
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const apiSet = async (key, value) => {
    try {
      const resp = await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'threshold', key, value })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error((j && j.error) ? j.error : ('HTTP ' + resp.status));
      }
      setHint('Gespeichert.', false);
      return true;
    } catch (e) {
      setHint('Schreiben fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'), true);
      return false;
    }
  };

  /**
   * Code-Teil: Arrow-Funktion `renderModal`
   * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: renderModal
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const renderModal = () => {
    const cfg = window.__nwCfg || {};
    const rules = Array.isArray(cfg.thresholdRules) ? cfg.thresholdRules : (Array.isArray(window.__nwThresholdRules) ? window.__nwThresholdRules : []);

    const s = window.latestState || {};
    /**
     * Code-Teil: v
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const v = (k) => (s && s[k]) ? s[k].value : undefined;

    listEl.innerHTML = '';
    const configured = (rules || []).filter(r => r && r.configured);
    if (!configured.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.85';
      empty.style.padding = '6px 0';
      empty.textContent = 'Keine Regeln konfiguriert.';
      listEl.appendChild(empty);
      setHint('Regeln werden im App‑Center (Installateur) angelegt.', false);
      return;
    }

    setHint('Alle sichtbaren Felder sind im Frontend bedienbar.', false);

    /**
     * Code-Teil: Arrow-Funktion `mkRow`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkRow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkRow = (r) => {
      const idx = Number(r.idx);
      const row = document.createElement('div');
      row.style.border = '1px solid rgba(255,255,255,0.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px';
      row.style.marginBottom = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '10px';

      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = r.name || ('Regel ' + idx);

      const badge = document.createElement('div');
      badge.style.fontSize = '0.85rem';
      badge.style.opacity = '0.9';
      const active = !!v(`threshold.rules.r${idx}.active`);
      const status = String(v(`threshold.rules.r${idx}.status`) || '').trim();
      /**
       * Code-Teil: Arrow-Funktion `prettyStatus`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: prettyStatus
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const prettyStatus = (raw) => {
        const t = String(raw || '').trim().toLowerCase();
        if (!t) return '';
        const map = {
          inactive: 'INAKTIV',
          active: 'AKTIV',
          pending_on: 'WARTET (EIN)',
          pending_off: 'WARTET (AUS)',
          stale: 'STALE',
          disabled: 'AUS',
          unconfigured: 'NICHT KONFIGURIERT',
          write_fail: 'SCHREIBFEHLER',
          manual_on: 'MANUELL AN',
          manual_off: 'MANUELL AUS',
        };
        return map[t] || String(raw);
      };

      if (status && String(status).toLowerCase().startsWith('manual_')) {
        badge.textContent = prettyStatus(status);
      } else {
        badge.textContent = active ? 'AKTIV' : (prettyStatus(status) || 'INAKTIV');
      }

      head.appendChild(name);
      head.appendChild(badge);

      const body = document.createElement('div');
      body.style.marginTop = '8px';
      body.style.display = 'grid';
      body.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
      body.style.gap = '10px';

      /**
       * Code-Teil: Arrow-Funktion `mkKpi`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkKpi
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkKpi = (label, valueText) => {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = label;
        const vEl = document.createElement('div');
        vEl.style.fontWeight = '700';
        vEl.textContent = valueText;
        box.appendChild(l);
        box.appendChild(vEl);
        return box;
      };

      const inputVal = v(`threshold.rules.r${idx}.input`);
      const thrEff = v(`threshold.rules.r${idx}.thresholdEff`);
      body.appendChild(mkKpi('Input', (inputVal === undefined || inputVal === null) ? '—' : String(inputVal)));
      body.appendChild(mkKpi('Schwellwert', (thrEff === undefined || thrEff === null) ? '—' : String(thrEff)));

      // User controls
      const ctl = document.createElement('div');
      ctl.style.display = 'flex';
      ctl.style.flexDirection = 'column';
      ctl.style.gap = '8px';
      // Regel ein/aus (Buttons) – fallback auf enabled, falls mode-State noch fehlt
      const modeState = v(`threshold.user.r${idx}.mode`);
      const enabledState = v(`threshold.user.r${idx}.enabled`);
      let curMode = Number.isFinite(Number(modeState))
        ? Math.round(Number(modeState))
        : ((enabledState === undefined || enabledState === null) ? 1 : (enabledState ? 1 : 0));
      curMode = Math.max(0, Math.min(2, curMode));
      let curModeUi = (curMode === 0) ? 0 : 1;

      const canToggle = true;
      if (canToggle) {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'Regel ein/aus';

        const btnWrap = document.createElement('div');
        btnWrap.className = 'nw-evcs-mode-buttons';
        btnWrap.style.width = '100%';

        /**
         * Code-Teil: Arrow-Funktion `setActive`
         * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: setActive
         * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
         * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const setActive = (uiVal) => {
          curModeUi = uiVal;
          Array.from(btnWrap.querySelectorAll('button')).forEach((b) => {
            b.classList.toggle('active', Number(b.dataset.mode) === curModeUi);
          });
        };

        /**
         * Code-Teil: Arrow-Funktion `mkBtn`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: mkBtn
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const mkBtn = (label, uiVal, sendMode) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = label;
          b.dataset.mode = String(uiVal);
          if (curModeUi === uiVal) b.classList.add('active');
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          b.addEventListener('click', async () => {
            if (curModeUi === uiVal) return;
            const ok = await apiSet(`r${idx}.mode`, sendMode);
            if (ok) {
              setActive(uiVal);
              renderModal();
            }
          });
          return b;
        };

        btnWrap.appendChild(mkBtn('Aus', 0, 0));
        btnWrap.appendChild(mkBtn('An', 1, 1));

        box.appendChild(l);
        box.appendChild(btnWrap);
        ctl.appendChild(box);
      } else {
        ctl.appendChild(mkKpi('Regel ein/aus', 'gesperrt'));
      }

      const canSetThreshold = true;
      if (canSetThreshold) {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'Schwellwert setzen';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'input';
        inp.style.width = '100%';
        const current = v(`threshold.user.r${idx}.threshold`);
        inp.value = (current === undefined || current === null) ? '' : String(current);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        inp.addEventListener('change', () => {
          const n = Number(inp.value);
          if (!Number.isFinite(n)) {
            setHint('Ungültiger Schwellwert.', true);
            return;
          }
          (async () => { const ok = await apiSet(`r${idx}.threshold`, n); if (ok) renderModal(); })();
        });
        box.appendChild(l);
        box.appendChild(inp);
        ctl.appendChild(box);
      } else {
        ctl.appendChild(mkKpi('Schwellwert', 'gesperrt'));
      }

      // Optional timing parameters: allow Endkunde to adjust MinOn/MinOff (if enabled in App-Center)
      const canMinOn = true;
      const canMinOff = true;

      if (canMinOn) {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'MinOn (s)';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.step = '1';
        inp.className = 'input';
        inp.style.width = '100%';
        const current = v(`threshold.user.r${idx}.minOnSec`);
        inp.value = (current === undefined || current === null) ? '' : String(current);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        inp.addEventListener('change', () => {
          const n = Number(inp.value);
          if (!Number.isFinite(n) || n < 0) {
            setHint('Ungültiger MinOn-Wert.', true);
            return;
          }
          (async () => { const ok = await apiSet(`r${idx}.minOnSec`, Math.floor(n)); if (ok) renderModal(); })();
        });
        box.appendChild(l);
        box.appendChild(inp);
        ctl.appendChild(box);
      } else {
        ctl.appendChild(mkKpi('MinOn', 'gesperrt'));
      }

      if (canMinOff) {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'MinOff (s)';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.step = '1';
        inp.className = 'input';
        inp.style.width = '100%';
        const current = v(`threshold.user.r${idx}.minOffSec`);
        inp.value = (current === undefined || current === null) ? '' : String(current);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        inp.addEventListener('change', () => {
          const n = Number(inp.value);
          if (!Number.isFinite(n) || n < 0) {
            setHint('Ungültiger MinOff-Wert.', true);
            return;
          }
          (async () => { const ok = await apiSet(`r${idx}.minOffSec`, Math.floor(n)); if (ok) renderModal(); })();
        });
        box.appendChild(l);
        box.appendChild(inp);
        ctl.appendChild(box);
      } else {
        ctl.appendChild(mkKpi('MinOff', 'gesperrt'));
      }

      body.appendChild(ctl);

      row.appendChild(head);
      row.appendChild(body);
      return row;
    };

    configured.forEach(r => listEl.appendChild(mkRow(r)));
  };

  /**
   * Code-Teil: Arrow-Funktion `open`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: open
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    renderModal();
  };
  /**
   * Code-Teil: close
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const close = () => modal.classList.add('hidden');

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  card.addEventListener('click', open);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an closeBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  closeBtn.addEventListener('click', close);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e) => { if (e && e.key === 'Escape') close(); });

  window.__thrApply = () => {
    try {
      if (!modal.classList.contains('hidden')) renderModal();
    } catch (_e) {}
  };

  window.__nwThresholdModalInit = true;
}
/**
 * Code-Teil: initRelayModal
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initRelayModal() {
  if (window.__nwRelayModalInit) return;

  const card = document.getElementById('relayCard');
  const modal = document.getElementById('relayModal');
  const closeBtn = document.getElementById('relayClose');
  const listEl = document.getElementById('relayList');
  const hintEl = document.getElementById('relayHint');

  if (!card || !modal || !closeBtn || !listEl) return;

  let pollTimer = null;

  /**
   * Code-Teil: Arrow-Funktion `setHint`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  const setHint = (msg, isError = false) => {
    if (!hintEl) return;
    hintEl.textContent = String(msg || '');
    hintEl.style.color = isError ? '#fca5a5' : '';
  };
  /**
   * Code-Teil: apiSet
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const apiSet = async (idx, prop, value) => {
    try {
      const resp = await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'relay', key: `r${idx}.${prop}`, value })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error((j && j.error) ? j.error : ('HTTP ' + resp.status));
      }
      setHint('Gespeichert.', false);
      return true;
    } catch (e) {
      setHint('Schreiben fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'), true);
      return false;
    }
  };

  /**
   * Code-Teil: Arrow-Funktion `fetchSnapshot`
   * Zweck: lädt Daten aus API, State-Cache oder Konfiguration und stößt danach Rendering an.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: fetchSnapshot
   * Zweck: Holt Daten über HTTP/API oder aus externen Quellen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const fetchSnapshot = async () => {
    try {
      const r = await fetch('/api/relay/snapshot', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return (j && j.relays) ? j.relays : [];
    } catch (_e) {
      return null;
    }
  };

  /**
   * Code-Teil: Arrow-Funktion `renderModal`
   * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: renderModal
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const renderModal = async () => {
    const relays = await fetchSnapshot();
    listEl.innerHTML = '';

    if (!Array.isArray(relays)) {
      const err = document.createElement('div');
      err.style.opacity = '0.85';
      err.style.padding = '6px 0';
      err.textContent = 'Status konnte nicht geladen werden.';
      listEl.appendChild(err);
      setHint('Verbindung prüfen.', true);
      return;
    }
    const shown = relays.filter(r => r && r.enabled !== false && r.showInLive !== false && r.configured);

    if (!shown.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.85';
      empty.style.padding = '6px 0';
      empty.textContent = 'Keine Ausgänge konfiguriert.';
      listEl.appendChild(empty);
      setHint('Ausgänge werden im App‑Center (Installateur) zugeordnet.', false);
      return;
    }

    setHint('Alle sichtbaren Ausgänge sind im Frontend steuerbar.', false);

    /**
     * Code-Teil: Arrow-Funktion `mkRow`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkRow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkRow = (r) => {
      const idx = Number(r.idx);
      const row = document.createElement('div');
      row.style.border = '1px solid rgba(255,255,255,0.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px';
      row.style.marginBottom = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '10px';

      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = r.name || ('Ausgang ' + idx);

      const badge = document.createElement('div');
      badge.style.fontSize = '0.85rem';
      badge.style.opacity = '0.9';
      if (r.type === 'boolean') badge.textContent = (r.val === true) ? 'EIN' : ((r.val === false) ? 'AUS' : '—');
      else badge.textContent = (r.val === null || r.val === undefined) ? '—' : String(r.val) + (r.unit ? (' ' + r.unit) : '');
      head.appendChild(name);
      head.appendChild(badge);

      const body = document.createElement('div');
      body.style.marginTop = '8px';
      body.style.display = 'grid';
      body.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      body.style.gap = '10px';

      /**
       * Code-Teil: Arrow-Funktion `mkKpi`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkKpi
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkKpi = (label, valueText) => {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = label;
        const vEl = document.createElement('div');
        vEl.style.fontWeight = '700';
        vEl.textContent = valueText;
        box.appendChild(l);
        box.appendChild(vEl);
        return box;
      };

      // Readback meta
      const ts = Number(r.ts || 0);
      const tsTxt = ts ? (new Date(ts).toLocaleString()) : '—';
      body.appendChild(mkKpi('Zeitpunkt', tsTxt));

      const ctl = document.createElement('div');
      ctl.style.display = 'flex';
      ctl.style.flexDirection = 'column';
      ctl.style.gap = '8px';

      if (r.type === 'boolean') {
        const can = true;

        // Use the same button style as other VIS controls (Aus/An) instead of a checkbox
        const btnWrap = document.createElement('div');
        btnWrap.className = 'nw-evcs-mode-buttons';
        btnWrap.style.alignSelf = 'flex-start';

        const curBool = !!r.val;
        /**
         * Code-Teil: Arrow-Funktion `mkBtn`
         * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: mkBtn
         * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
         * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const mkBtn = (label, val) => {
          const b = document.createElement('button');
          b.className = 'nw-evcs-mode-btn' + ((curBool === val) ? ' nw-active' : '');
          b.textContent = label;
          b.disabled = !can;
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          b.addEventListener('click', async () => {
            if (!can) return;
            if ((!!r.val) === val) return;
            const ok = await apiSet(idx, 'switch', val);
            if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 200);
          });
          return b;
        };

        btnWrap.appendChild(mkBtn('Aus', false));
        btnWrap.appendChild(mkBtn('An', true));
        ctl.appendChild(btnWrap);

        if (!can) {
          const lock = document.createElement('div');
          lock.style.fontSize = '0.78rem';
          lock.style.opacity = '0.75';
          lock.textContent = 'gesperrt';
          ctl.appendChild(lock);
        }
      } else {
        const can = true;
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'Wert setzen';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'input';
        inp.style.width = '100%';
        if (Number.isFinite(Number(r.min))) inp.min = String(r.min);
        if (Number.isFinite(Number(r.max))) inp.max = String(r.max);
        if (Number.isFinite(Number(r.step))) inp.step = String(r.step);
        inp.disabled = !can;
        inp.value = (r.val === undefined || r.val === null) ? '' : String(r.val);
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        inp.addEventListener('change', async () => {
          const n = Number(inp.value);
          if (!Number.isFinite(n)) {
            setHint('Ungültiger Wert.', true);
            return;
          }
          const ok = await apiSet(idx, 'value', n);
          if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 200);
        });
        box.appendChild(l);
        box.appendChild(inp);
        ctl.appendChild(box);
      }

      body.appendChild(ctl);

      row.appendChild(head);
      row.appendChild(body);
      return row;
    };

    shown.forEach(r => listEl.appendChild(mkRow(r)));
  };

  /**
   * Code-Teil: Arrow-Funktion `open`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: open
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    renderModal();
    // Poll while open
    try {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { if (!modal.classList.contains('hidden')) renderModal(); }, 1500);
    } catch (_e) {}
  };

  /**
   * Code-Teil: Arrow-Funktion `close`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: close
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const close = () => {
    modal.classList.add('hidden');
    try { if (pollTimer) clearInterval(pollTimer); } catch(_e) {}
    pollTimer = null;
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  card.addEventListener('click', open);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an closeBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  closeBtn.addEventListener('click', close);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e) => { if (e && e.key === 'Escape') close(); });

  window.__relayApply = () => {
    try { if (!modal.classList.contains('hidden')) renderModal(); } catch (_e) {}
  };

  window.__nwRelayModalInit = true;
}
/**
 * Code-Teil: initBhkwModal
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initBhkwModal() {
  if (window.__nwBhkwModalInit) return;

  const card = document.getElementById('bhkwCard');
  const modal = document.getElementById('bhkwModal');
  const closeBtn = document.getElementById('bhkwClose');
  const listEl = document.getElementById('bhkwList');
  const hintEl = document.getElementById('bhkwHint');

  if (!card || !modal || !closeBtn || !listEl) return;

  let pollTimer = null;

  /**
   * Code-Teil: Arrow-Funktion `setHint`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  const setHint = (msg, isError = false) => {
    if (!hintEl) return;
    hintEl.textContent = String(msg || '');
    hintEl.style.color = isError ? '#fca5a5' : '';
  };
  /**
   * Code-Teil: apiSet
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const apiSet = async (idx, prop, value) => {
    try {
      const resp = await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'bhkw', key: `b${idx}.${prop}`, value })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error((j && j.error) ? j.error : ('HTTP ' + resp.status));
      }
      setHint('Gespeichert.', false);
      return true;
    } catch (e) {
      setHint('Schreiben fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'), true);
      return false;
    }
  };

  /**
   * Code-Teil: Arrow-Funktion `fetchSnapshot`
   * Zweck: lädt Daten aus API, State-Cache oder Konfiguration und stößt danach Rendering an.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: fetchSnapshot
   * Zweck: Holt Daten über HTTP/API oder aus externen Quellen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const fetchSnapshot = async () => {
    try {
      const r = await fetch('/api/bhkw/snapshot', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return (j && j.devices) ? j.devices : [];
    } catch (_e) {
      return null;
    }
  };

  /**
   * Code-Teil: Arrow-Funktion `renderModal`
   * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: renderModal
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const renderModal = async () => {
    const devices = await fetchSnapshot();
    listEl.innerHTML = '';

    if (!Array.isArray(devices)) {
      const err = document.createElement('div');
      err.style.opacity = '0.85';
      err.style.padding = '6px 0';
      err.textContent = 'Status konnte nicht geladen werden.';
      listEl.appendChild(err);
      setHint('Verbindung prüfen.', true);
      return;
    }

    const isInstaller = !!(window.__nwCfg && window.__nwCfg.session && window.__nwCfg.session.isInstaller);
    const shown = devices.filter(d => d && d.enabled !== false && d.showInLive !== false && d.configured);

    if (!shown.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.85';
      empty.style.padding = '6px 0';
      empty.textContent = 'Kein BHKW konfiguriert.';
      listEl.appendChild(empty);
      setHint('BHKW wird im App‑Center (Installateur) zugeordnet.', false);
      return;
    }

    setHint('Modus: Auto/Manuell/Aus. Start/Stop ist nur im Modus „Manuell“ aktiv.', false);

    /**
     * Code-Teil: Arrow-Funktion `mkKpi`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkKpi
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkKpi = (label, valueText) => {
      const box = document.createElement('div');
      const l = document.createElement('div');
      l.style.fontSize = '0.78rem';
      l.style.opacity = '0.85';
      l.textContent = label;
      const vEl = document.createElement('div');
      vEl.style.fontWeight = '700';
      vEl.textContent = valueText;
      box.appendChild(l);
      box.appendChild(vEl);
      return box;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkRow`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkRow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkRow = (d) => {
      const idx = Number(d.idx);
      const row = document.createElement('div');
      row.style.border = '1px solid rgba(255,255,255,0.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px';
      row.style.marginBottom = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '10px';

      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = d.name || ('BHKW ' + idx);

      const badge = document.createElement('div');
      badge.style.fontSize = '0.85rem';
      badge.style.opacity = '0.9';
      if (d.running === true) badge.textContent = 'LÄUFT';
      else if (d.running === false) badge.textContent = 'AUS';
      else badge.textContent = '—';

      head.appendChild(name);
      head.appendChild(badge);

      const body = document.createElement('div');
      body.style.marginTop = '8px';
      body.style.display = 'grid';
      body.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      body.style.gap = '10px';

      const socTxt = (d.socPct === null || d.socPct === undefined || Number.isNaN(Number(d.socPct))) ? '—' : (String(Math.round(Number(d.socPct) * 10) / 10) + ' %');
      const pwrTxt = (d.powerW === null || d.powerW === undefined || Number.isNaN(Number(d.powerW))) ? '—' : (Math.round(Number(d.powerW)) >= 1000 ? (String(Math.round(Number(d.powerW) / 10) / 100) + ' kW') : (String(Math.round(Number(d.powerW))) + ' W'));
      body.appendChild(mkKpi('SoC', socTxt));
      body.appendChild(mkKpi('Leistung', pwrTxt));

      const statusTxt = (d.status === null || d.status === undefined) ? '—' : String(d.status);
      body.appendChild(mkKpi('Status', statusTxt));

      const mode = String(d.mode || 'auto').toLowerCase();
      const canControl = true;

      const ctl = document.createElement('div');
      ctl.style.display = 'flex';
      ctl.style.flexDirection = 'column';
      ctl.style.gap = '8px';

      // Mode buttons
      const modeBox = document.createElement('div');
      const l = document.createElement('div');
      l.style.fontSize = '0.78rem';
      l.style.opacity = '0.85';
      l.textContent = 'Modus';
      const grp = document.createElement('div');
      grp.className = 'nw-evcs-mode-buttons nw-evcs-mode-buttons-3';

      /**
       * Code-Teil: Arrow-Funktion `addBtn`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: addBtn
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const addBtn = (val, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.classList.toggle('active', mode === val);
        b.disabled = !canControl;
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        b.addEventListener('click', async () => {
          const ok = await apiSet(idx, 'mode', val);
          if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
        });
        grp.appendChild(b);
      };

      addBtn('auto', 'Auto');
      addBtn('manual', 'Manuell');
      addBtn('off', 'Aus');

      modeBox.appendChild(l);
      modeBox.appendChild(grp);
      ctl.appendChild(modeBox);

      // Start/Stop only in manual mode
      const cmdRow = document.createElement('div');
      cmdRow.style.display = (mode === 'manual') ? 'flex' : 'none';
      cmdRow.style.gap = '8px';
      cmdRow.style.flexWrap = 'wrap';

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'btn';
      startBtn.textContent = 'Start';
      startBtn.disabled = !canControl;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an startBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      startBtn.addEventListener('click', async () => {
        const ok = await apiSet(idx, 'command', 'start');
        if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
      });

      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'btn';
      stopBtn.textContent = 'Stop';
      stopBtn.disabled = !canControl;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an stopBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      stopBtn.addEventListener('click', async () => {
        const ok = await apiSet(idx, 'command', 'stop');
        if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
      });

      cmdRow.appendChild(startBtn);
      cmdRow.appendChild(stopBtn);
      ctl.appendChild(cmdRow);

      body.appendChild(ctl);

      row.appendChild(head);
      row.appendChild(body);
      return row;
    };

    shown.forEach(d => listEl.appendChild(mkRow(d)));
  };

  /**
   * Code-Teil: Arrow-Funktion `open`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: open
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    renderModal();
    try {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { if (!modal.classList.contains('hidden')) renderModal(); }, 1500);
    } catch (_e) {}
  };

  /**
   * Code-Teil: Arrow-Funktion `close`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: close
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const close = () => {
    modal.classList.add('hidden');
    try { if (pollTimer) clearInterval(pollTimer); } catch(_e) {}
    pollTimer = null;
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  card.addEventListener('click', open);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an closeBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  closeBtn.addEventListener('click', close);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e) => { if (e && e.key === 'Escape') close(); });

  window.__nwBhkwModalInit = true;
}
/**
 * Code-Teil: initGeneratorModal
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initGeneratorModal() {
  if (window.__nwGeneratorModalInit) return;

  const card = document.getElementById('generatorCard');
  const modal = document.getElementById('generatorModal');
  const closeBtn = document.getElementById('generatorClose');
  const listEl = document.getElementById('generatorList');
  const hintEl = document.getElementById('generatorHint');

  if (!card || !modal || !closeBtn || !listEl) return;

  let pollTimer = null;

  /**
   * Code-Teil: Arrow-Funktion `setHint`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  const setHint = (msg, isError = false) => {
    if (!hintEl) return;
    hintEl.textContent = String(msg || '');
    hintEl.style.color = isError ? '#fca5a5' : '';
  };
  /**
   * Code-Teil: apiSet
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const apiSet = async (idx, prop, value) => {
    try {
      const resp = await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'generator', key: `g${idx}.${prop}`, value })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error((j && j.error) ? j.error : ('HTTP ' + resp.status));
      }
      setHint('Gespeichert.', false);
      return true;
    } catch (e) {
      setHint('Schreiben fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'), true);
      return false;
    }
  };

  /**
   * Code-Teil: Arrow-Funktion `fetchSnapshot`
   * Zweck: lädt Daten aus API, State-Cache oder Konfiguration und stößt danach Rendering an.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: fetchSnapshot
   * Zweck: Holt Daten über HTTP/API oder aus externen Quellen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const fetchSnapshot = async () => {
    try {
      const r = await fetch('/api/generator/snapshot', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return (j && j.devices) ? j.devices : [];
    } catch (_e) {
      return null;
    }
  };

  /**
   * Code-Teil: Arrow-Funktion `renderModal`
   * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: renderModal
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const renderModal = async () => {
    const devices = await fetchSnapshot();
    listEl.innerHTML = '';

    if (!Array.isArray(devices)) {
      const err = document.createElement('div');
      err.style.opacity = '0.85';
      err.style.padding = '6px 0';
      err.textContent = 'Status konnte nicht geladen werden.';
      listEl.appendChild(err);
      setHint('Verbindung prüfen.', true);
      return;
    }

    const isInstaller = !!(window.__nwCfg && window.__nwCfg.session && window.__nwCfg.session.isInstaller);
    const shown = devices.filter(d => d && d.enabled !== false && d.showInLive !== false && d.configured);

    if (!shown.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.85';
      empty.style.padding = '6px 0';
      empty.textContent = 'Kein Generator konfiguriert.';
      listEl.appendChild(empty);
      setHint('Generator wird im App‑Center (Installateur) zugeordnet.', false);
      return;
    }

    setHint('Modus: Auto/Manuell/Aus. Start/Stop ist nur im Modus „Manuell“ aktiv.', false);

    /**
     * Code-Teil: Arrow-Funktion `mkKpi`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkKpi
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkKpi = (label, valueText) => {
      const box = document.createElement('div');
      const l = document.createElement('div');
      l.style.fontSize = '0.78rem';
      l.style.opacity = '0.85';
      l.textContent = label;
      const vEl = document.createElement('div');
      vEl.style.fontWeight = '700';
      vEl.textContent = valueText;
      box.appendChild(l);
      box.appendChild(vEl);
      return box;
    };

    /**
     * Code-Teil: Arrow-Funktion `mkRow`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkRow
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkRow = (d) => {
      const idx = Number(d.idx);
      const row = document.createElement('div');
      row.style.border = '1px solid rgba(255,255,255,0.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px';
      row.style.marginBottom = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '10px';

      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = d.name || ('Generator ' + idx);

      const badge = document.createElement('div');
      badge.style.fontSize = '0.85rem';
      badge.style.opacity = '0.9';
      if (d.running === true) badge.textContent = 'LÄUFT';
      else if (d.running === false) badge.textContent = 'AUS';
      else badge.textContent = '—';

      head.appendChild(name);
      head.appendChild(badge);

      const body = document.createElement('div');
      body.style.marginTop = '8px';
      body.style.display = 'grid';
      body.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      body.style.gap = '10px';

      const socTxt = (d.socPct === null || d.socPct === undefined || Number.isNaN(Number(d.socPct))) ? '—' : (String(Math.round(Number(d.socPct) * 10) / 10) + ' %');
      const pwrTxt = (d.powerW === null || d.powerW === undefined || Number.isNaN(Number(d.powerW))) ? '—' : (Math.round(Number(d.powerW)) >= 1000 ? (String(Math.round(Number(d.powerW) / 10) / 100) + ' kW') : (String(Math.round(Number(d.powerW))) + ' W'));
      body.appendChild(mkKpi('SoC', socTxt));
      body.appendChild(mkKpi('Leistung', pwrTxt));

      const statusTxt = (d.status === null || d.status === undefined) ? '—' : String(d.status);
      body.appendChild(mkKpi('Status', statusTxt));

      const mode = String(d.mode || 'auto').toLowerCase();
      const canControl = true;

      const ctl = document.createElement('div');
      ctl.style.display = 'flex';
      ctl.style.flexDirection = 'column';
      ctl.style.gap = '8px';

      // Mode buttons
      const modeBox = document.createElement('div');
      const l = document.createElement('div');
      l.style.fontSize = '0.78rem';
      l.style.opacity = '0.85';
      l.textContent = 'Modus';
      const grp = document.createElement('div');
      grp.className = 'nw-evcs-mode-buttons nw-evcs-mode-buttons-3';

      /**
       * Code-Teil: Arrow-Funktion `addBtn`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: addBtn
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const addBtn = (val, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.classList.toggle('active', mode === val);
        b.disabled = !canControl;
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        b.addEventListener('click', async () => {
          const ok = await apiSet(idx, 'mode', val);
          if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
        });
        grp.appendChild(b);
      };

      addBtn('auto', 'Auto');
      addBtn('manual', 'Manuell');
      addBtn('off', 'Aus');

      modeBox.appendChild(l);
      modeBox.appendChild(grp);
      ctl.appendChild(modeBox);

      // Start/Stop only in manual mode
      const cmdRow = document.createElement('div');
      cmdRow.style.display = (mode === 'manual') ? 'flex' : 'none';
      cmdRow.style.gap = '8px';
      cmdRow.style.flexWrap = 'wrap';

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'btn';
      startBtn.textContent = 'Start';
      startBtn.disabled = !canControl;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an startBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      startBtn.addEventListener('click', async () => {
        const ok = await apiSet(idx, 'command', 'start');
        if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
      });

      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'btn';
      stopBtn.textContent = 'Stop';
      stopBtn.disabled = !canControl;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an stopBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      stopBtn.addEventListener('click', async () => {
        const ok = await apiSet(idx, 'command', 'stop');
        if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
      });

      cmdRow.appendChild(startBtn);
      cmdRow.appendChild(stopBtn);
      ctl.appendChild(cmdRow);

      body.appendChild(ctl);

      row.appendChild(head);
      row.appendChild(body);
      return row;
    };

    shown.forEach(d => listEl.appendChild(mkRow(d)));
  };

  /**
   * Code-Teil: Arrow-Funktion `open`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: open
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    renderModal();
    try {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { if (!modal.classList.contains('hidden')) renderModal(); }, 1500);
    } catch (_e) {}
  };

  /**
   * Code-Teil: Arrow-Funktion `close`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: close
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const close = () => {
    modal.classList.add('hidden');
    try { if (pollTimer) clearInterval(pollTimer); } catch(_e) {}
    pollTimer = null;
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  card.addEventListener('click', open);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an closeBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  closeBtn.addEventListener('click', close);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e) => { if (e && e.key === 'Escape') close(); });

  window.__nwGeneratorModalInit = true;
}
/**
 * Code-Teil: updateRelayUi
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateRelayUi(){
  const cfg = window.__nwCfg || {};
  const apps = window.__nwEmsApps || { apps: {} };

  // Prefer App-Center flags (installed + enabled). Fallback: legacy cfg.ems.* flags.
  const hasAppObj = !!(apps && apps.apps && apps.apps.relay && typeof apps.apps.relay === 'object');
  const app = hasAppObj ? apps.apps.relay : {};
  const legacyEnabled = !!(cfg && cfg.ems && cfg.ems.relayEnabled);

  const installed = hasAppObj ? (app.installed === true) : legacyEnabled;
  const enabled = hasAppObj ? (app.enabled === true) : legacyEnabled;

  const card = document.getElementById('relayCard');
  if (!card) return;

  // Nur anzeigen, wenn App installiert + aktiv + mind. ein Relais konfiguriert ist
  const relays = Array.isArray(window.__nwRelayControls) ? window.__nwRelayControls : [];
  const visible = relays.filter(r => r && r.configured);

  if (!installed) {
    card.classList.add('hidden');
    // defensive: inline display can override .hidden without !important
    card.style.display = 'none';
    return;
  }

  card.classList.remove('hidden');
  card.style.display = '';
  const onCount = visible.filter(r => r.on).length;
  setText('relayOnCount', String(onCount));
  setText('relayCount', String(visible.length));
  setText('relayStatusShort', enabled ? (visible.length ? 'aktiv' : 'bereit') : 'aus');
}
/**
 * Code-Teil: updateThresholdUi
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateThresholdUi(){
  const cfg = window.__nwCfg || {};
  const apps = window.__nwEmsApps || { apps: {} };

  // Prefer App-Center flags (installed + enabled). Fallback: legacy cfg.ems.* flags.
  const hasAppObj = !!(apps && apps.apps && apps.apps.threshold && typeof apps.apps.threshold === 'object');
  const app = hasAppObj ? apps.apps.threshold : {};
  const legacyEnabled = !!(cfg && cfg.ems && cfg.ems.thresholdEnabled);

  const installed = hasAppObj ? (app.installed === true) : legacyEnabled;
  const enabled = hasAppObj ? (app.enabled === true) : legacyEnabled;

  const card = document.getElementById('thresholdCard');
  if (!card) return;

  // Nur anzeigen, wenn App installiert + aktiv + mind. eine Regel konfiguriert ist
  const rules = Array.isArray(window.__nwThresholdRules) ? window.__nwThresholdRules : [];
  const configured = rules.filter(r => r && r.configured);

  if (!installed) {
    card.classList.add('hidden');
    // defensive: inline display can override .hidden without !important
    card.style.display = 'none';
    return;
  }

  card.classList.remove('hidden');
  card.style.display = '';
  const activeCount = configured.filter(r => r.active).length;
  setText('thrActiveCount', String(activeCount));
  setText('thrRuleCount', String(configured.length));
  setText('thrStatusShort', enabled ? (configured.length ? 'aktiv' : 'bereit') : 'aus');
}
/**
 * Code-Teil: updateBhkwUi
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateBhkwUi(){
  const cfg = window.__nwCfg || {};
  const apps = window.__nwEmsApps || { apps: {} };

  // Prefer App-Center flags (installed + enabled). Fallback: legacy cfg.ems.* flags.
  const hasAppObj = !!(apps && apps.apps && apps.apps.bhkw && typeof apps.apps.bhkw === 'object');
  const app = hasAppObj ? apps.apps.bhkw : {};
  const legacyEnabled = !!(cfg && cfg.ems && cfg.ems.bhkwEnabled);

  const installed = hasAppObj ? (app.installed === true) : legacyEnabled;
  const enabled = hasAppObj ? (app.enabled === true) : legacyEnabled;

  const card = document.getElementById('bhkwCard');
  if (!card) return;

  const devs = Array.isArray(window.__nwBhkwDevices) ? window.__nwBhkwDevices : [];
  const visible = devs.filter(d => d && d.showInLive !== false && d.enabled !== false);

  // Nur anzeigen, wenn App installiert + aktiv + mind. ein Gerät konfiguriert ist
  if (!installed) {
    card.classList.add('hidden');
    // defensive: inline display can override .hidden without !important
    card.style.display = 'none';
    return;
  }

  card.classList.remove('hidden');
  card.style.display = '';

  // Running count from live states
  const st = window.latestState || {};
  /**
   * Code-Teil: Arrow-Funktion `sv`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: sv
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const sv = (k) => (st && st[k] && st[k].value !== undefined) ? st[k].value : undefined;

  let runCount = 0;
  for (const d of visible){
    const idx = Number(d.idx);
    if (!idx) continue;
    const r = sv(`bhkw.devices.b${idx}.running`);
    if (r === true) runCount++;
  }

  setText('bhkwRunningCount', String(runCount));
  setText('bhkwCount', String(visible.length));
  setText('bhkwStatusShort', enabled ? (visible.length ? 'aktiv' : 'bereit') : 'aus');
}
/**
 * Code-Teil: updateGeneratorUi
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateGeneratorUi(){
  const cfg = window.__nwCfg || {};
  const apps = window.__nwEmsApps || { apps: {} };

  // Prefer App-Center flags (installed + enabled). Fallback: legacy cfg.ems.* flags.
  const hasAppObj = !!(apps && apps.apps && apps.apps.generator && typeof apps.apps.generator === 'object');
  const app = hasAppObj ? apps.apps.generator : {};
  const legacyEnabled = !!(cfg && cfg.ems && cfg.ems.generatorEnabled);

  const installed = hasAppObj ? (app.installed === true) : legacyEnabled;
  const enabled = hasAppObj ? (app.enabled === true) : legacyEnabled;

  const card = document.getElementById('generatorCard');
  if (!card) return;

  const devs = Array.isArray(window.__nwGeneratorDevices) ? window.__nwGeneratorDevices : [];
  const visible = devs.filter(d => d && d.showInLive !== false && d.enabled !== false);

  // Nur anzeigen, wenn App installiert + aktiv + mind. ein Gerät konfiguriert ist
  if (!installed) {
    card.classList.add('hidden');
    // defensive: inline display can override .hidden without !important
    card.style.display = 'none';
    return;
  }

  card.classList.remove('hidden');
  card.style.display = '';

  const st = window.latestState || {};
  /**
   * Code-Teil: Arrow-Funktion `sv`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: sv
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const sv = (k) => (st && st[k] && st[k].value !== undefined) ? st[k].value : undefined;

  let runCount = 0;
  for (const d of visible){
    const idx = Number(d.idx);
    if (!idx) continue;
    const r = sv(`generator.devices.g${idx}.running`);
    if (r === true) runCount++;
  }

  setText('generatorRunningCount', String(runCount));
  setText('generatorCount', String(visible.length));
  setText('generatorStatusShort', enabled ? (visible.length ? 'aktiv' : 'bereit') : 'aus');
}



// ---- Thermik / Verbraucher Quick-Tiles (dynamisch je Slot) ----
const _thermalConsTiles = new Map();
/**
 * Code-Teil: _ensureThermalConsumerTiles
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _ensureThermalConsumerTiles(){
  const grid = document.getElementById('liveQuickTiles');
  if (!grid) return;

  // Wir erstellen feste Platzhalter für bis zu 9 Verbraucher-Slots.
  for (let idx = 1; idx <= 9; idx++) {
    const id = `thermalConsumerCard${idx}`;
    if (document.getElementById(id)) continue;

    const tile = document.createElement('div');
    tile.id = id;
    tile.className = 'nw-tile nw-tile--size-m nw-tile--type-scene';
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
    tile.style.display = 'none'; // wird in updateThermalConsumerUi() gesetzt

    tile.innerHTML = `
      <div class="nw-tile-h">
        <div class="nw-tile__icon-circle" id="thermalConsumerIcon${idx}">♨</div>
        <div>
          <div class="nw-tile-title" id="thermalConsumerTitle${idx}">Verbraucher ${idx}</div>
          <div class="nw-tile-sub" id="thermalConsumerSub${idx}">Thermik</div>
        </div>
        <div class="nw-badge nw-badge--app" id="thermalConsumerBadge${idx}">APP</div>
      </div>
      <div class="nw-tile-kpi">
        <div class="nw-kpi-val" id="thermalConsumerPower${idx}">0 W</div>
        <div class="nw-kpi-label" id="thermalConsumerMode${idx}">—</div>
      </div>
      <div class="nw-tile-meta">
        <span class="nw-meta" id="thermalConsumerMetaL${idx}">—</span>
        <span class="nw-meta" id="thermalConsumerMetaM${idx}">Slot ${idx}</span>
        <span class="nw-meta nw-meta-right" id="thermalConsumerMetaR${idx}">—</span>
      </div>
    `;

    /**
     * Code-Teil: Arrow-Funktion `open`
     * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: open
     * Zweck: Öffnet Dialoge/Seiten/Popovers.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const open = () => {
      // Re-use der bestehenden Flow-QuickControl (Modal)
      try { openFlowQc('consumers', idx); } catch (e) { console.warn('openFlowQc failed', e); }
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    tile.addEventListener('click', open);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    tile.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        open();
      }
    });

    grid.appendChild(tile);

    _thermalConsTiles.set(idx, {
      tile,
      title: document.getElementById(`thermalConsumerTitle${idx}`),
      sub: document.getElementById(`thermalConsumerSub${idx}`),
      power: document.getElementById(`thermalConsumerPower${idx}`),
      mode: document.getElementById(`thermalConsumerMode${idx}`),
      metaL: document.getElementById(`thermalConsumerMetaL${idx}`),
      metaM: document.getElementById(`thermalConsumerMetaM${idx}`),
      metaR: document.getElementById(`thermalConsumerMetaR${idx}`),
    });
  }
}
/**
 * Code-Teil: _labelThermalMode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _labelThermalMode(mode){
  const m = String(mode || '').trim();
  const k = m.toLowerCase();
  if (!m) return '—';
  if (k === 'inherit') return 'Auto';
  if (k === 'pvauto') return 'Auto';
  if (k === 'sgready') return 'SG‑Ready';
  if (k === 'manual') return 'Manuell';
  if (k === 'manual1') return 'Stufe 1';
  if (k === 'manual2') return 'Stufe 2';
  if (k === 'manual3') return 'Stufe 3';
  if (k === 'boost') return 'Boost';
  if (k === 'off') return 'Aus';
  return m;
}
/**
 * Code-Teil: updateThermalConsumerUi
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateThermalConsumerUi(){
  _ensureThermalConsumerTiles();

  const apps = (window.__nwEmsApps && window.__nwEmsApps.apps) ? window.__nwEmsApps.apps : {};
  const thermApp = apps.thermal || {};
  const rodApp = apps.heatingRod || apps.heatingrod || {};
  const thermActive = (thermApp.installed === true) && (thermApp.enabled === true);
  const rodActive = ((rodApp.installed === true) && (rodApp.enabled === true)) || !!(window.__nwCfg && window.__nwCfg.ems && window.__nwCfg.ems.heatingRodEnabled);

  const slots = (flowSlotsCfg && Array.isArray(flowSlotsCfg.consumers)) ? flowSlotsCfg.consumers : [];
  const thermalCfg = (window.__nwEmsApps && window.__nwEmsApps.thermal) ? window.__nwEmsApps.thermal : {};
  const rodCfg = (window.__nwEmsApps && window.__nwEmsApps.heatingRod) ? window.__nwEmsApps.heatingRod : {};
  const thermalDevices = Array.isArray(thermalCfg.devices) ? thermalCfg.devices : [];
  const rodDevices = Array.isArray(rodCfg.devices) ? rodCfg.devices : [];

  /**
   * Code-Teil: Arrow-Funktion `normalizeConsumerType`
   * Zweck: normalisiert Eingaben/Anzeigeformate und schützt gegen ungültige Werte.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: normalizeConsumerType
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const normalizeConsumerType = (raw) => {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return 'generic';
    if (s === 'heatingrod' || s === 'heating_rod' || s === 'heating-rod' || s === 'heizstab' || s === 'rod' || s === 'immersion') return 'heatingRod';
    if (s === 'heatpump' || s === 'heat_pump' || s === 'heat-pump' || s === 'waermepumpe' || s === 'wärmepumpe' || s === 'hvac' || s === 'klima') return 'heatPump';
    return 'generic';
  };

  const st = window.latestState || {};
  /**
   * Code-Teil: Arrow-Funktion `sv`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: sv
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const sv = (k) => (st && st[k] && st[k].value !== undefined) ? st[k].value : undefined;

  for (let idx = 1; idx <= 9; idx++) {
    const refs = _thermalConsTiles.get(idx);
    if (!refs) continue;

    const slot = slots[idx - 1];
    const slotType = normalizeConsumerType(slot && (slot.consumerType || slot.type || slot.category));
    const qcKind = String(slot && slot.qc && slot.qc.controlKind ? slot.qc.controlKind : '').trim().toLowerCase();
    const isRod = slotType === 'heatingRod' || qcKind === 'heatingrod';
    const qcEnabled = !!(slot && slot.qc && slot.qc.enabled);
    const show = qcEnabled && ((isRod && rodActive) || (!isRod && thermActive));

    refs.tile.style.display = show ? '' : 'none';
    if (!show) continue;

    const dev = isRod ? (rodDevices[idx - 1] || {}) : (thermalDevices[idx - 1] || {});
    const name = (dev && dev.name) ? String(dev.name) : (slot && slot.name ? String(slot.name) : `Verbraucher ${idx}`);

    if (refs.title) refs.title.textContent = name;
    if (refs.sub) refs.sub.textContent = isRod ? 'Heizstab' : 'Thermik';
    const iconEl = document.getElementById(`thermalConsumerIcon${idx}`);
    if (iconEl) iconEl.textContent = isRod ? '🔥' : '♨';

    const pKey = (slot && slot.stateKey) ? String(slot.stateKey) : `consumer${idx}Power`;
    let pW = Number(sv(pKey));
    if (!Number.isFinite(pW) && isRod) {
      pW = Number(sv(`heatingRod.devices.c${idx}.appliedW`) ?? sv(`heatingRod.devices.c${idx}.targetW`) ?? 0);
    }
    if (!Number.isFinite(pW)) pW = 0;
    if (refs.power) refs.power.textContent = formatPower(Math.abs(pW));

    if (refs.metaM) refs.metaM.textContent = `Slot ${idx}`;

    if (isRod) {
      const effMode = String(sv(`heatingRod.devices.c${idx}.effectiveMode`) || 'pvAuto');
      const boost = !!sv(`heatingRod.devices.c${idx}.boostActive`);
      const currentStage = Number(sv(`heatingRod.devices.c${idx}.currentStage`) ?? 0);
      const stageCount = Number(sv(`heatingRod.devices.c${idx}.stageCount`) ?? dev.stageCount ?? 0);
      const wiredStages = Number(sv(`heatingRod.devices.c${idx}.wiredStages`) ?? 0);
      const effectiveEnabled = !!sv(`heatingRod.devices.c${idx}.effectiveEnabled`);

      if (refs.mode) refs.mode.textContent = boost ? 'Boost' : _labelThermalMode(effMode);
      if (refs.metaL) {
        if (boost) refs.metaL.textContent = 'Volllast';
        else if ((wiredStages || stageCount) > 0) refs.metaL.textContent = `${Math.max(0, currentStage)}/${Math.max(wiredStages || 0, stageCount || 0)} Stufen`;
        else refs.metaL.textContent = 'Heizstab';
      }
      if (refs.metaR) refs.metaR.textContent = effectiveEnabled ? 'aktiv' : 'aus';
      continue;
    }

    const userMode = sv(`th.user.c${idx}.mode`);
    const effMode = (!userMode || userMode === 'inherit') ? 'pvAuto' : userMode;
    if (refs.mode) refs.mode.textContent = _labelThermalMode(effMode);

    let cap = '—';
    if (slot && slot.qc){
      if (slot.qc.hasSgReady) cap = 'SG‑Ready';
      else if (slot.qc.hasSetpoint) cap = 'Setpoint';
      else if (slot.qc.hasSwitch) cap = 'Schalten';
    }
    if (refs.metaL) refs.metaL.textContent = cap;

    const userReg = sv(`th.user.c${idx}.regEnabled`);
    const regEnabled = (typeof userReg === 'boolean') ? userReg : true;
    const cfgEnabled = (typeof dev.enabled === 'boolean') ? dev.enabled : true;
    const isActive = cfgEnabled && regEnabled;
    if (refs.metaR) refs.metaR.textContent = isActive ? 'aktiv' : 'aus';
  }
}





// ---- Energy Web update ----
/**
 * Code-Teil: updateEnergyWeb
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateEnergyWeb() {
  /**
   * Code-Teil: d
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const d = (k) => state[k]?.value;
  const s = window.latestState || {};

  // Raw datapoints (1:1)
  const sfEnabled = nwStorageFarmFeatureFromConfig(window.__nwCfg || {}, s || state || {});

  // Backend-konsolidierte Anlagen-/Farm-PV verwenden; lokaler Fallback nur für
  // ältere Adapterstände ohne derived.core.pv.totalW.
  let pv = getCanonicalPvPowerW(d);
  let { buy, sell } = getGridImportExport(d);
  let load = +(d('consumptionTotal') ?? 0);
  let c2 = +(d('evcs.totalPowerW') ?? d('consumptionEvcs') ?? 0); // Wallbox (sum)

  // Batterie: zentral normalisieren wie den NVP.
  // Signed batteryPower-Konvention: -W = Laden, +W = Entladen;
  // die Option "Batterie-Vorzeichen invertieren" wird vor dem Split angewendet.
  const batteryFlow = getNormalizedBatteryFlow();
  let batCharge = Number(batteryFlow.chargeW) || 0;
  let batDischarge = Number(batteryFlow.dischargeW) || 0;
  let soc = d('storageSoc');

  if (sfEnabled) {
    const socAvg = d('storageFarm.totalSoc');
    const socMedian = d('storageFarm.medianSoc');
    // Im Farm‑Modus bevorzugen wir den Durchschnitt (Ø), Median bleibt als Fallback.
    if (socAvg != null && !isNaN(Number(socAvg))) soc = socAvg;
    else if (socMedian != null && !isNaN(Number(socMedian))) soc = socMedian;
  }

  // Invert toggles (Batterie ist bereits im Normalizer enthalten)
  const invPv   = !!(s['settings.flowInvertPv']?.value);
  const invGrid = !!(s['settings.flowInvertGrid']?.value);
  const invEv   = !!(s['settings.flowInvertEv']?.value);
  const subEvFromLoad = (s['settings.flowSubtractEvFromBuilding']?.value ?? true) ? true : false;
  const evAvail = nwEvcsFeatureFromConfig() && ((flowExtras && flowExtras.meta) ? !!flowExtras.meta.evcsAvailable : false);

  if (invPv) pv = -pv;
  if (invEv) c2 = -c2;
  if (!evAvail) c2 = 0;
  if (invGrid) { const t=buy; buy = sell; sell = t; } // swap semantics if inverted grid

  // Optionale Extra-Kreise aktualisieren (Rückgabe = Summe der optionalen Verbraucher)
  const extrasConsumersSum = updateEnergyWebExtras(d);

  // Gebäudeanzeige: EV (optional) + optionale Verbraucher abziehen, damit der Energiefluss optisch sauber aufgeht
  const evAbs = Math.max(0, Math.abs(c2));
  const loadDisplayBase = Math.max(0, subEvFromLoad ? (load - evAbs) : load);
  let loadDisplay = Math.max(0, loadDisplayBase - extrasConsumersSum);

  // Anti-glitch: if the building load temporarily drops to 0 W while there is clear activity,
  // hold the last plausible value for a short time to avoid confusing UI spikes.
  try {
    const sysActivityW = Math.abs(pv) + Math.abs(buy) + Math.abs(sell) + Math.abs(batCharge) + Math.abs(batDischarge) + Math.abs(c2) + Math.abs(extrasConsumersSum);
    if (sysActivityW > 300 && loadDisplay === 0) {
      const lastW = Number(window.__nwLastGoodLoadDisplayW);
      const lastTs = Number(window.__nwLastGoodLoadDisplayTs);
      if (Number.isFinite(lastW) && Number.isFinite(lastTs) && (Date.now() - lastTs) < 60 * 1000 && lastW > 0) {
        loadDisplay = lastW;
      } else {
        loadDisplay = 100;
      }
    }
    if (loadDisplay > 0) {
      window.__nwLastGoodLoadDisplayW = loadDisplay;
      window.__nwLastGoodLoadDisplayTs = Date.now();
    }
  } catch (_e) {}

  // -------- Anzeige-Werte & Richtungen (ohne Netto-Berechnung) --------
  // PV: immer Richtung Gebäude (keine Richtungsumschaltung); Wert = |pv|
  // Hintergrund: Einige Zähler/Adapter liefern Vorzeichen-Schwankungen um 0W oder invertierte Vorzeichen.
  // Für die VIS soll die Erzeugung optisch immer "zum Gebäude" laufen.
  const pvValNum = stabilizeFlowAbs('pv', Math.abs(pv));
  const pvRev = false;

  // GRID: bevorzugt Bezug (buy). Nur wenn buy==0 und sell>0, zeige Einspeisung.
  let gridSignedRaw = 0;
  if (buy > 0) gridSignedRaw = Math.abs(buy);
  else if (sell !== 0 && !isNaN(sell)) gridSignedRaw = -Math.abs(sell);

  const gridSigned = stabilizeFlowSigned('grid', gridSignedRaw, { signSwitchW: 220 });
  let gridShowVal = Math.abs(gridSigned);
  let gridRev = gridSigned < 0; // rev = vom Gebäude weg
  let gridSellMode = gridSigned < 0;
// removed stray block
// removed stray block
// removed stray block
// removed stray block

  // BATTERIE:
  // Standard (Einzel‑Speicher): wähle vorhandenen Strom (kein Netto)
  // Farm‑Modus: wenn gleichzeitig Laden & Entladen vorkommt, zeigen wir den dominanten Netto‑Fluss
  //             (|Entladen − Laden|) und bestimmen die Richtung über den höheren Wert.
  let batShowVal = 0;
  let batRev = false;

  if (sfEnabled) {
    const ch = Math.max(0, Number(batCharge) || 0);
    const dch = Math.max(0, Number(batDischarge) || 0);
    if (ch > 0 || dch > 0) {
      if (dch >= ch) { batShowVal = dch - ch; batRev = false; }
      else { batShowVal = ch - dch; batRev = true; }
    }
  } else {
    // - Entladen (batDischarge>0) -> zur Mitte; Anzeige +batDischarge
    // - Laden (batCharge>0) -> von Mitte zur Batterie; Anzeige -batCharge
    if (batDischarge > 0 && batCharge <= 0) { batShowVal = batDischarge; batRev = false; }
    else if (batCharge > 0 && batDischarge <= 0) { batShowVal = batCharge; batRev = true; }
    else if (batCharge > 0 || batDischarge > 0) {
      if (batCharge >= batDischarge) { batShowVal = batCharge; batRev = true; }
      else { batShowVal = batDischarge; batRev = false; }
    }
  }

  const evSigned = stabilizeFlowSigned('ev', evAvail ? c2 : 0, { signSwitchW: 220 });
  const evShowVal = Math.abs(evSigned);

  const batSignedRaw = batRev ? -Math.abs(batShowVal) : Math.abs(batShowVal);
  const batSigned = stabilizeFlowSigned('battery', batSignedRaw, { signSwitchW: 220 });
  batShowVal = Math.abs(batSigned);
  batRev = batSigned < 0;

  loadDisplay = stabilizeFlowAbs('building', Math.max(0, loadDisplay));


// ---------- Ausgabe ----------
  /**
   * Code-Teil: Arrow-Funktion `T`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: T
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const T = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };

  T('pvVal', formatFlowPower(pvValNum));
  // grid text: +Bezug, -Einspeisung
  T('gridVal', gridShowVal ? (gridSellMode ? ('-'+formatFlowPower(gridShowVal)) : formatFlowPower(gridShowVal)) : formatFlowPower(0));
  // EV & Batterie Texte
  T('c2Val', formatFlowPower(evShowVal));
  T('restVal', batShowVal ? (batRev ? ('-'+formatFlowPower(batShowVal)) : formatFlowPower(batShowVal)) : formatFlowPower(0));
  T('centerPower', formatFlowPower(Math.max(0, loadDisplay)));
  if (soc===undefined || isNaN(Number(soc))) { T('batterySocIn','-- %'); } else { T('batterySocIn', Number(soc).toFixed(0)+' %'); }

  // Sichtbarkeit
  /**
   * Code-Teil: Arrow-Funktion `show`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: show
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const show = (id, on)=>{ const el=document.getElementById(id); if(el) el.style.opacity = on ? 1 : 0.15; };
  const evcsNode = document.getElementById('nodeEvcs');
  if (evcsNode) evcsNode.style.display = evAvail ? '' : 'none';
  const evcsLine = document.getElementById('lineC2');
  if (evcsLine) evcsLine.style.display = evAvail ? '' : 'none';
  show('linePV', pvValNum>0);
  show('lineGrid', gridShowVal>0);
  show('lineC2', evAvail && evShowVal>0);
  show('lineRest', batShowVal>0);

  // Richtung
  /**
   * Code-Teil: Arrow-Funktion `toggleRev`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: toggleRev
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const toggleRev = (id, on)=>{ const el=document.getElementById(id); if (el) el.classList.toggle('rev', !!on); };
  toggleRev('linePV', pvRev);
  toggleRev('lineGrid', gridRev);
  toggleRev('lineC2', evShowVal>0 ? (evSigned < 0) : false);
  toggleRev('lineRest', !batRev);

  // Grid Farbe (Einspeisung grün)
  const lg = document.getElementById('lineGrid');
  if (lg) {
    if (gridSellMode) lg.classList.add('sell'); else lg.classList.remove('sell');
  }
  // Optimierung (Tarife / Peak / §14a) UI
  try { updateEmsControlUi(); } catch(_e) {}
  try { updateThresholdUi(); } catch(_e) {}
  try { updateRelayUi(); } catch(_e) {}
  try { updateBhkwUi(); } catch(_e) {}
  try { updateGeneratorUi(); } catch(_e) {}
  try { updateThermalConsumerUi(); } catch(_e) {}

  // Statusmeldung direkt in der Energiefluss-Kachel (VIS)
  // z.B. "Tarif günstig: Speicher lädt" / "Tarif teuer: Speicher entlädt"
  const statusEl = document.getElementById('emsStatusText');
  if (statusEl) {
    // Prefer the explicit status text computed by the Tarife/Optimierung app.
    let msg = (s['tarif.statusText'] && s['tarif.statusText'].value !== undefined && s['tarif.statusText'].value !== null)
      ? String(s['tarif.statusText'].value)
      : '';

    // Fallback: If Tarife/Optimierung has not produced a message yet, do NOT show a placeholder.
    // The status line should only appear when there is actually something meaningful to show.
    if (!msg) {
      const st = (s['tarif.state'] && s['tarif.state'].value !== undefined && s['tarif.state'].value !== null)
        ? String(s['tarif.state'].value)
        : '';
      const pRaw = (s['tarif.preisAktuellEurProKwh'] && s['tarif.preisAktuellEurProKwh'].value !== undefined && s['tarif.preisAktuellEurProKwh'].value !== null)
        ? Number(s['tarif.preisAktuellEurProKwh'].value)
        : NaN;
      const pTxt = Number.isFinite(pRaw) ? (pRaw.toFixed(3) + ' €/kWh') : '';
      // Only show fallback text if the tariff logic is actually active.
      // If tarif.state is "aus" (or empty), we hide the line.
      if (st && st !== 'aus') msg = `Tarif ${st}${pTxt ? ` (${pTxt})` : ''}`;
      else msg = '';
    }

    // PV‑Reserve (Forecast) kann das Netzladen bewusst blockieren.
    // Damit der Kunde nicht "Speicher lädt" liest, obwohl das Netzladen
    // wegen erwarteter PV-Erzeugung absichtlich gestoppt wurde, ergänzen
    // wir die Statuszeile entsprechend.
    try {
      const pvBlocked = !!(s['speicher.regelung.tarifPvBlock'] && s['speicher.regelung.tarifPvBlock'].value);
      if (pvBlocked) {
        const pvCapSocRaw = (s['speicher.regelung.tarifPvCapSocPct'] && s['speicher.regelung.tarifPvCapSocPct'].value !== undefined)
          ? Number(s['speicher.regelung.tarifPvCapSocPct'].value)
          : NaN;
        const capTxt = Number.isFinite(pvCapSocRaw) ? ` (max ${pvCapSocRaw.toFixed(1)}%)` : '';
        msg = msg ? `${msg} — PV‑Reserve: Netzladen gesperrt${capTxt}` : `PV‑Reserve: Netzladen gesperrt${capTxt}`;

        const pvReason = (s['speicher.regelung.tarifPvBlockGrund'] && s['speicher.regelung.tarifPvBlockGrund'].value !== undefined && s['speicher.regelung.tarifPvBlockGrund'].value !== null)
          ? String(s['speicher.regelung.tarifPvBlockGrund'].value)
          : '';
        statusEl.title = pvReason;
      } else {
        statusEl.title = '';
      }
    } catch(_e) {
      statusEl.title = '';
    }

    

    // Tariff UX: Make it immediately visible when the tariff logic runs in MANUAL mode.
    // This prevents confusion when charging is blocked by a manually set price limit.
    try {
      const dyn = !!(s['settings.dynamicTariff'] && s['settings.dynamicTariff'].value);
      const tm = (s['settings.tariffMode'] && s['settings.tariffMode'].value !== undefined && s['settings.tariffMode'].value !== null)
        ? Number(s['settings.tariffMode'].value)
        : NaN;
      const isManual = !Number.isFinite(tm) ? true : (tm !== 2);
      if (dyn && isManual) {
        msg = msg ? `${msg} — Modus: Manuell` : 'Tarif Modus: Manuell';
      }
    } catch(_e) {
      // ignore
    }
statusEl.textContent = msg;
    statusEl.classList.toggle('hidden', !msg);
    const statusWrap = document.getElementById('emsStatusWrap');
    if (statusWrap) statusWrap.classList.toggle('hidden', !msg);
  }

}




// KI‑Energieberater: beratende Optimierungsvorschläge auf der LIVE-Seite
/**
 * Code-Teil: _nwAiAdvisorStateValue
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwAiAdvisorStateValue(key, fallback = null) {
  try {
    const rec = state && state[key];
    if (!rec || rec.value === undefined || rec.value === null) return fallback;
    return rec.value;
  } catch (_e) {
    return fallback;
  }
}
/**
 * Code-Teil: _nwAiAdvisorBool
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwAiAdvisorBool(key, fallback = false) {
  const v = _nwAiAdvisorStateValue(key, fallback);
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v || '').trim().toLowerCase();
  if (['true','1','on','yes','ja','active','aktiv'].includes(s)) return true;
  if (['false','0','off','no','nein','inactive','inaktiv'].includes(s)) return false;
  return !!fallback;
}
/**
 * Code-Teil: _nwAiAdvisorPriorityLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwAiAdvisorPriorityLabel(p) {
  const s = String(p || 'info').toLowerCase();
  if (s === 'critical') return 'Kritisch';
  if (s === 'success') return 'Chance';
  if (s === 'action') return 'Empfehlung';
  if (s === 'warning') return 'Hinweis';
  if (Number.isFinite(Number(s))) {
    const n = Number(s);
    if (n >= 90) return 'Kritisch';
    if (n >= 75) return 'Empfehlung';
    if (n >= 60) return 'Hinweis';
  }
  return 'Info';
}
/**
 * Code-Teil: _nwAiAdvisorCategoryLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _nwAiAdvisorCategoryLabel(c) {
  const s = String(c || '').toLowerCase();
  if (s === 'tariff') return 'Tarif';
  if (s === 'pv') return 'PV';
  if (s === 'forecast') return 'Forecast';
  if (s === 'storage') return 'Speicher';
  if (s === 'evcs') return 'Wallbox';
  if (s === 'peak') return 'Lastspitze';
  if (s === 'weather') return 'Wetter';
  if (s === 'grid') return 'Netz';
  if (s === 'setup') return 'Setup';
  if (s === 'heating') return 'Thermik';
  if (s === 'dailyplan' || s === 'daily-plan' || s === 'plan') return 'Tagesfahrplan';
  if (s === 'anomaly') return 'Anomalie';
  if (s === 'comfort') return 'Komfort';
  if (s === 'learning') return 'Lernen';
  if (s === 'co2' || s === 'co₂') return 'CO₂';
  return 'System';
}
/**
 * Code-Teil: _nwAiAdvisorParseSuggestions
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */

function _nwEnergyWalletStateValue(key, fallback) {
  try {
    const entry = state && Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
    if (entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, 'value')) return entry.value;
    if (entry !== undefined && entry !== null) return entry;
  } catch (_e) {}
  return fallback;
}

function _nwEnergyWalletNum(key, fallback = 0) {
  const n = Number(_nwEnergyWalletStateValue(key, fallback));
  return Number.isFinite(n) ? n : fallback;
}

function _nwEnergyWalletMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0,00 €';
  try { return n.toLocaleString(nwUiLocaleTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; } catch (_e) { return n.toFixed(2).replace('.', ',') + ' €'; }
}


function _nwEnergyWalletKwh(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0,000 kWh';
  try { return n.toLocaleString(nwUiLocaleTag(), { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kWh'; } catch (_e) { return n.toFixed(3).replace('.', ',') + ' kWh'; }
}

function _nwEnergyWalletPricePerKwh(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  try { return n.toLocaleString(nwUiLocaleTag(), { minimumFractionDigits: 3, maximumFractionDigits: 4 }) + ' €/kWh'; } catch (_e) { return n.toFixed(3).replace('.', ',') + ' €/kWh'; }
}

function _nwEnergyWalletAgeLabel(seconds) {
  const sec = Math.max(0, Math.round(Number(seconds) || 0));
  if (sec < 60) return `${sec}s alt`;
  const min = Math.round(sec / 60);
  if (min < 120) return `${min}min alt`;
  const h = Math.round(min / 60);
  return `${h}h alt`;
}

function _nwEnergyWalletEnsureExtendedUi(card) {
  try {
    if (!card || document.getElementById('energyWalletPeriodGrid')) return;
    const period = document.createElement('div');
    period.className = 'nw-energy-wallet-periods';
    period.id = 'energyWalletPeriodGrid';
    period.innerHTML = `
      <div><strong id="energyWalletMonthValue">0,00 €</strong><span>Monat</span></div>
      <div><strong id="energyWalletYearValue">0,00 €</strong><span>Jahr</span></div>
      <div><strong id="energyWalletQualityValue">0 %</strong><span>Datenqualität</span></div>
    `;
    card.appendChild(period);

    const exportGuard = document.createElement('div');
    exportGuard.className = 'nw-energy-wallet-periods nw-energy-wallet-exportguard hidden';
    exportGuard.id = 'energyWalletExportGuardGrid';
    exportGuard.innerHTML = `
      <div><strong id="energyWalletCurtailedValue">0,00 €</strong><span>Abregelung</span></div>
      <div><strong id="energyWalletUnusedPvValue">0,00 €</strong><span>nicht lokal genutzt</span></div>
      <div><strong id="energyWalletCurtailedKwh">0,000 kWh</strong><span>abgeregelt</span></div>
    `;
    card.appendChild(exportGuard);

    const price = document.createElement('div');
    price.className = 'nw-energy-wallet-price-source hidden';
    price.id = 'energyWalletPriceSourceText';
    price.textContent = '';
    card.appendChild(price);

    const warn = document.createElement('div');
    warn.className = 'nw-energy-wallet-warning hidden';
    warn.id = 'energyWalletWarningText';
    warn.textContent = '';
    card.appendChild(warn);
  } catch (_e) {}
}

function updateEnergyWalletLiveUi() {
  const card = document.getElementById('energyWalletLiveCard');
  if (!card) return;
  _nwEnergyWalletEnsureExtendedUi(card);
  const walletCfg = window.__nwCfg && window.__nwCfg.energyWallet && typeof window.__nwCfg.energyWallet === 'object' ? window.__nwCfg.energyWallet : {};
  const enabled = walletCfg.showOnLive !== false && (_nwEnergyWalletStateValue('energyWallet.enabled', false) === true || String(_nwEnergyWalletStateValue('energyWallet.enabled', '')).toLowerCase() === 'true');
  const value = _nwEnergyWalletNum('energyWallet.today.valueEur', 0);
  const monthValue = _nwEnergyWalletNum('energyWallet.month.valueEur', 0);
  const yearValue = _nwEnergyWalletNum('energyWallet.year.valueEur', 0);
  const pvKwh = _nwEnergyWalletNum('energyWallet.today.pvKwh', 0);
  const status = String(_nwEnergyWalletStateValue('energyWallet.diagnostics.status', _nwEnergyWalletStateValue('energyWallet.status', '')) || '').toLowerCase();
  const hasData = enabled && (pvKwh > 0.001 || value > 0.001 || monthValue > 0.001 || yearValue > 0.001 || status === 'warn');
  card.classList.toggle('hidden', !hasData);
  if (!hasData) return;

  const setText = (id, text) => { try { const el = document.getElementById(id); if (el) el.textContent = text; } catch (_e) {} };
  const pct = _nwEnergyWalletNum('energyWallet.today.localUsePercent', 0);
  const quality = _nwEnergyWalletNum('energyWallet.diagnostics.dataQualityPercent', 0);
  const warning = String(_nwEnergyWalletStateValue('energyWallet.diagnostics.customerWarning', _nwEnergyWalletStateValue('energyWallet.diagnostics.warning', '')) || '');
  const showPriceSource = String(_nwEnergyWalletStateValue('settings.energyWalletShowPriceSource', 'false')).toLowerCase() === 'true'
    || _nwEnergyWalletStateValue('settings.energyWalletShowPriceSource', false) === true;
  const priceSource = String(_nwEnergyWalletStateValue('energyWallet.configuredPrices.priceSource', '') || '');
  const priceSourceLabel = String(_nwEnergyWalletStateValue('energyWallet.configuredPrices.priceSourceLabel', '') || priceSource || 'Preisquelle');
  const activePrice = _nwEnergyWalletNum('energyWallet.configuredPrices.gridImportEurPerKwh', 0);
  const dynAge = _nwEnergyWalletNum('energyWallet.configuredPrices.currentDynamicPriceAgeSec', 0);
  const dynSource = String(_nwEnergyWalletStateValue('energyWallet.configuredPrices.currentDynamicPriceSource', '') || '');
  setText('energyWalletTodayValue', _nwEnergyWalletMoney(value));
  setText('energyWalletLocalUseBadge', `${Math.round(pct)} % lokal`);
  setText('energyWalletExplanation', String(_nwEnergyWalletStateValue('energyWallet.explanation', '') || 'Deine Anlage erzeugt heute messbaren Energiewert.'));
  setText('energyWalletAvoidedGrid', _nwEnergyWalletMoney(_nwEnergyWalletNum('energyWallet.today.avoidedGridCostEur', 0)));
  setText('energyWalletFeedIn', _nwEnergyWalletMoney(_nwEnergyWalletNum('energyWallet.today.feedInValueEur', 0)));
  setText('energyWalletStorage', _nwEnergyWalletMoney(_nwEnergyWalletNum('energyWallet.today.storageValueEur', 0)));
  setText('energyWalletEvcs', _nwEnergyWalletMoney(_nwEnergyWalletNum('energyWallet.today.evcsValueEur', 0)));
  setText('energyWalletMonthValue', _nwEnergyWalletMoney(monthValue));
  setText('energyWalletYearValue', _nwEnergyWalletMoney(yearValue));
  setText('energyWalletQualityValue', `${Math.round(quality)} %`);
  const curtailedKwh = _nwEnergyWalletNum('energyWallet.today.curtailedKwh', 0);
  const curtailedValue = _nwEnergyWalletNum('energyWallet.today.curtailedValueEur', 0);
  const unusedValue = _nwEnergyWalletNum('energyWallet.today.unusedPvValueEur', 0);
  setText('energyWalletCurtailedValue', _nwEnergyWalletMoney(curtailedValue));
  setText('energyWalletUnusedPvValue', _nwEnergyWalletMoney(unusedValue));
  setText('energyWalletCurtailedKwh', _nwEnergyWalletKwh(curtailedKwh));
  try {
    const eg = document.getElementById('energyWalletExportGuardGrid');
    if (eg) eg.classList.toggle('hidden', !(curtailedKwh > 0.0001 || curtailedValue > 0.001 || unusedValue > 0.001));
  } catch (_e) {}
  try {
    const priceEl = document.getElementById('energyWalletPriceSourceText');
    if (priceEl) {
      let txt = `Preisquelle: ${priceSourceLabel}`;
      if (activePrice) txt += ` · ${_nwEnergyWalletPricePerKwh(activePrice)}`;
      if (priceSource === 'dynamicTariff' && dynAge >= 0) txt += ` · ${_nwEnergyWalletAgeLabel(dynAge)}`;
      if (priceSource === 'dynamicTariff' && dynSource) txt += ` · ${dynSource}`;
      priceEl.textContent = txt;
      priceEl.classList.toggle('hidden', !showPriceSource);
    }
  } catch (_e) {}
  try {
    const warnEl = document.getElementById('energyWalletWarningText');
    if (warnEl) {
      warnEl.textContent = warning;
      warnEl.classList.toggle('hidden', !(warning && (status === 'warn' || status === 'waiting-data')));
    }
  } catch (_e) {}
}

function _nwAiAdvisorParseSuggestions() {
  const raw = _nwAiAdvisorStateValue('aiAdvisor.suggestionsJson', '[]');
  try {
    const arr = JSON.parse(String(raw || '[]'));
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch (_e) {
    return [];
  }
}
/**
 * Code-Teil: updateAiAdvisorLiveUi
 * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function updateAiAdvisorLiveUi() {
  const card = document.getElementById('aiAdvisorLiveCard');
  if (!card) return;

  // Endkunden-Schalter aus den Einstellungen: Der Kunde entscheidet,
  // ob der KI-Energieberater im Kundencockpit aktiv/sichtbar ist.
  const customerEnabled = _nwAiAdvisorBool('settings.aiAdvisorEnabled', true);
  const emsCfg = (window.__nwEmsCfg && typeof window.__nwEmsCfg === 'object') ? window.__nwEmsCfg : {};
  const appCenterEnabled = (emsCfg.aiAdvisorEnabled === undefined || emsCfg.aiAdvisorEnabled === null)
    ? true
    : !(emsCfg.aiAdvisorEnabled === false || emsCfg.aiAdvisorEnabled === 0 || String(emsCfg.aiAdvisorEnabled).toLowerCase() === 'false');
  const enabled = _nwAiAdvisorBool('aiAdvisor.enabled', false);
  const showInLive = _nwAiAdvisorBool('aiAdvisor.showInLive', _nwAiAdvisorBool('aiAdvisor.showOnLive', true));
  const status = String(_nwAiAdvisorStateValue('aiAdvisor.status', '') || '');
  const suggestions = (customerEnabled && appCenterEnabled) ? _nwAiAdvisorParseSuggestions() : [];
  const top = suggestions[0] || null;

  const shouldShow = !!(appCenterEnabled && customerEnabled && enabled && showInLive && (top || status));
  card.classList.toggle('hidden', !shouldShow);
  if (!shouldShow) return;

  const titleEl = document.getElementById('aiAdvisorLiveTitle');
  const msgEl = document.getElementById('aiAdvisorLiveMessage');
  const actionEl = document.getElementById('aiAdvisorLiveAction');
  const badgeEl = document.getElementById('aiAdvisorLiveBadge');
  const listEl = document.getElementById('aiAdvisorLiveList');
  const toggleBtn = document.getElementById('aiAdvisorToggleDetails');

  const topTitle = top ? String(top.title || '') : String(_nwAiAdvisorStateValue('aiAdvisor.topTitle', '') || '');
  const topMsg = top ? String(top.text || top.message || '') : String(_nwAiAdvisorStateValue('aiAdvisor.topText', '') || '');
  const topAction = top ? String(top.action || top.actionText || '') : String(_nwAiAdvisorStateValue('aiAdvisor.topAction', '') || '');
  const topPriority = top ? String(top.severity || top.priority || 'info') : String(_nwAiAdvisorStateValue('aiAdvisor.severity', 'info') || 'info');
  const topCat = top ? String(top.category || 'system') : String(_nwAiAdvisorStateValue('aiAdvisor.topCategory', 'system') || 'system');

  if (titleEl) titleEl.textContent = topTitle || 'System läuft unauffällig';
  if (msgEl) msgEl.textContent = topMsg || 'Aktuell erkennt der KI‑Energieberater keinen dringenden Optimierungsbedarf.';
  if (actionEl) {
    actionEl.textContent = topAction || '';
    actionEl.style.display = topAction ? '' : 'none';
  }
  if (badgeEl) {
    badgeEl.textContent = `${_nwAiAdvisorPriorityLabel(topPriority)} · ${_nwAiAdvisorCategoryLabel(topCat)}`;
    badgeEl.setAttribute('data-priority', topPriority);
  }

  if (listEl) {
    listEl.innerHTML = '';
    const rest = suggestions.slice(0, 6);
    for (const it of rest) {
      const item = document.createElement('div');
      item.className = 'nw-ai-advisor-item';

      const topRow = document.createElement('div');
      topRow.className = 'nw-ai-advisor-item__top';
      const t = document.createElement('div');
      t.className = 'nw-ai-advisor-item__title';
      t.textContent = String(it.title || 'Vorschlag');
      const meta = document.createElement('div');
      meta.className = 'nw-ai-advisor-item__meta';
      meta.textContent = `${_nwAiAdvisorPriorityLabel(it.severity || it.priority)} · ${_nwAiAdvisorCategoryLabel(it.category)}`;
      topRow.appendChild(t);
      topRow.appendChild(meta);

      const msg = document.createElement('div');
      msg.className = 'nw-ai-advisor-item__msg';
      msg.textContent = String(it.text || it.message || '');
      item.appendChild(topRow);
      item.appendChild(msg);

      const actionTxt = String(it.action || it.actionText || '');
      if (actionTxt) {
        const act = document.createElement('div');
        act.className = 'nw-ai-advisor-item__action';
        act.textContent = actionTxt;
        item.appendChild(act);
      }
      listEl.appendChild(item);
    }
  }

  try {
    if (toggleBtn && !toggleBtn.dataset.boundAiAdvisor) {
      toggleBtn.dataset.boundAiAdvisor = '1';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an toggleBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      toggleBtn.addEventListener('click', () => {
        const l = document.getElementById('aiAdvisorLiveList');
        if (!l) return;
        const open = l.classList.toggle('hidden') === false;
        toggleBtn.textContent = open ? 'Weniger anzeigen' : 'Details ansehen ›';
      });
    }
  } catch (_e) {}
}

// Patch render to also update energy web
const _renderOld = render;
render = function(){ try{ _renderOld(); }catch(e){ console.warn('render', e); } try{ updateEnergyWeb(); }catch(e){ console.warn('energy web', e); } try{ updateAiAdvisorLiveUi(); }catch(e){ console.warn('ai advisor', e); } try{ updateEnergyWalletLiveUi(); }catch(e){ console.warn('energy wallet', e); } }

  // open history page via header tab
  const hbtn = document.getElementById('historyTabBtn');
  if (hbtn) hbtn.addEventListener('click', ()=>{ window.location.href = '/history.html'; });

  // open live page via header tab when on a standalone page (e.g. settings)
  const lbtn = document.querySelector('.tabs .tab[data-tab="live"]');
  if (lbtn) lbtn.addEventListener('click', ()=>{
    const p = (window.location && window.location.pathname) || '';
    if (p.endsWith('/settings.html') || p.endsWith('settings.html')) window.location.href = '/';
  });

  // open SmartHome page via header tab
  const shbtn = document.getElementById('tabSmartHome');
  if (shbtn) shbtn.addEventListener('click', ()=>{ window.location.href = '/smarthome.html'; });


// open settings automatically if '?settings=1' is present
(function(){
  /**
   * Code-Teil: openSettings
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function openSettings(){
    try{
      const sbtn = document.getElementById('menuOpenSettings');
      if (sbtn) {
        sbtn.click();
        return;
      }
      // fallback: show settings section explicitly
      const content = document.querySelector('.content');
      if (content) content.style.display = 'none';
      const sec = document.querySelector('[data-tab-content="settings"]');
      if (sec) sec.classList.remove('hidden');
      try{ if (typeof initSettingsPanel==='function') initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {} }catch(_e){}
      try{ if (typeof setupSettings==='function') setupSettings(); }catch(_e){}
    } catch(e){}
  }
  try{
    const params = new URLSearchParams(window.location.search);
    const isSettingsPage = /settings\.html$/i.test(window.location.pathname || '');
    if (isSettingsPage || params.get('settings') === '1') {
      if (document.readyState === 'loading') {
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        document.addEventListener('DOMContentLoaded', openSettings);
      } else {
        openSettings();
      }
    }
  }catch(e){}
})();

// --- EVCS modal ---
(function(){
  /**
   * Code-Teil: qs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function qs(id){ return document.getElementById(id); }
  const card = qs('evcsCard');
  const modal = qs('evcsModal');
  const close = qs('evcsClose');
  const toggle = qs('evcsActiveToggle');
  const buttons = qs('evcsModeButtons');
  const regRow = qs('evcsRegRow');
  const regToggle = qs('evcsRegToggle');
  const regStatus = qs('evcsRegStatus');
  const regHint = qs('evcsRegHint');
  const goalRow = qs('evcsGoalRow');
  const goalToggle = qs('evcsGoalToggle');
  const goalCfgRow = qs('evcsGoalCfgRow');
  const goalCfgRow2 = qs('evcsGoalCfgRow2');
  const goalSoc = qs('evcsGoalSoc');
  const goalTime = qs('evcsGoalTime');
  const goalKwh = qs('evcsGoalKwh');
  const goalStatus = qs('evcsGoalStatus');
  const goalHint = qs('evcsGoalHint');
  const phaseRow = qs('evcsPhaseRow');
  const phaseButtons = qs('evcsPhaseButtons');
  const phaseStatus = qs('evcsPhaseStatus');
  const phaseHint = qs('evcsPhaseHint');
  const storageAssistRow = qs('evcsStorageAssistRow');
  const storageAssistButtons = qs('evcsStorageAssistButtons');
  const storageAssistStatus = qs('evcsStorageAssistStatus');
  const storageAssistHint = qs('evcsStorageAssistHint');

  // Unified /api/set helper for the EVCS modal (single wallbox)
  /**
   * Code-Teil: apiSet
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const apiSet = async (scope, key, value) => {
    const r = await fetch('/api/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, key, value })
    });
    if (!r || !r.ok) {
      let txt = '';
      try { txt = await r.text(); } catch (_e) {}
      const err = new Error('api_set_failed');
      err.status = r ? r.status : 0;
      err.body = txt;
      throw err;
    }
    return true;
  };

  // Keep native pickers stable: lock UI refresh briefly on interaction.
  // (Functions are declared further below; function declarations are hoisted.)
  bindGoalLock(goalSoc, 15000);
  bindGoalLock(goalTime, 20000);
  bindGoalLock(goalKwh, 15000);


  // Per-wallbox mode remains backward compatible. The customer station permission is
  // deliberately separate from evcs.1.active: activeId is a connector/session status,
  // not the durable customer enable/disable decision.
  let hasPerBoxMode = false;
  let hasStationPermissionState = false;

  // EMS present? (chargingManagement states exist)
  let modalHasEms = false;

  // Prevent UI "jumping" while an update is still in-flight
  let pendingMode = null;
  let pendingModeUntil = 0;
  let pendingActive = null;
  let pendingActiveUntil = 0;

  let pendingReg = null;
  let pendingRegUntil = 0;
  let pendingPhaseMode = null;
  let pendingPhaseModeUntil = 0;
  let pendingStorageAssist = null;
  let pendingStorageAssistUntil = 0;
  let pendingGoalEnabled = null;
  let pendingGoalEnabledUntil = 0;
  let pendingGoalSoc = null;
  let pendingGoalSocUntil = 0;
  let pendingGoalFinishTs = null;
  let pendingGoalFinishUntil = 0;
  let pendingGoalKwh = null;
  let pendingGoalKwhUntil = 0;

  // --- UI lock for goal inputs ---
  // Native time pickers can lose focus (especially on mobile) while the picker is open.
  // If we overwrite the input value during that window, the picker closes.
  // We therefore lock UI updates for a short period after user interaction.
  let goalEditUntil = 0;
  /**
   * Code-Teil: touchGoalEdit
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function touchGoalEdit(ms){
    const until = Date.now() + (ms || 12000);
    if (until > goalEditUntil) goalEditUntil = until;
  }
  /**
   * Code-Teil: goalEditLocked
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function goalEditLocked(){
    return Date.now() < goalEditUntil;
  }
  /**
   * Code-Teil: bindGoalLock
   * Zweck: Verbindet Event-Handler mit DOM oder Runtime-Objekten.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function bindGoalLock(el, ms){
    if (!el) return;
    /**
     * Code-Teil: bump
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const bump = () => touchGoalEdit(ms);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'focusin' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('focusin', bump);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('click', bump);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('pointerdown', bump, { passive: true });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('mousedown', bump, { passive: true });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchstart' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    el.addEventListener('touchstart', bump, { passive: true });
  }
  /**
   * Code-Teil: clampUiMode
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function clampUiMode(v){
    const n = Number(v);
    if (!isFinite(n)) return 1;
    return Math.max(1, Math.min(3, Math.round(n)));
  }
  /**
   * Code-Teil: normalizeEmsMode
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function normalizeEmsMode(raw){
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === 'min+pv') return 'minpv';
    if (s === 'auto' || s === 'boost' || s === 'minpv' || s === 'pv') return s;
    return 'auto';
  }
  /**
   * Code-Teil: normalizeEvcsPhaseMode
   * Zweck: normalisiert den AC-Phasenmodus für die LIVE-Schnellsteuerung.
   * Zusammenhang: Teil der EVCS-TS-Phasenumschaltung; schreibt nur den User-Override, die Safety-Sequenz bleibt im Backend.
   */
  function normalizeEvcsPhaseMode(raw){
    const s = String(raw ?? '').trim().toLowerCase().replace(/_/g, '-');
    const compact = s.replace(/[^a-z0-9]+/g, '');
    if (compact === 'autopv' || compact === 'pvauto' || compact === 'auto13' || compact === 'auto1p3p' || compact === 'auto') return 'auto-pv';
    if (compact === 'fixed1p' || compact === '1p' || compact === 'onephase' || compact === 'fixed1') return 'fixed-1p';
    if (compact === 'fixed3p' || compact === '3p' || compact === 'threephase' || compact === 'fixed3') return 'fixed-3p';
    return 'auto-pv';
  }

  function phaseModeLabel(mode){
    const m = normalizeEvcsPhaseMode(mode);
    if (m === 'fixed-1p') return 'Fest 1p';
    if (m === 'fixed-3p') return 'Fest 3p';
    return 'Auto PV';
  }

  /**
   * Code-Teil: evcsConfigRow
   * Zweck: liest die Ladepunkt-Konfiguration aus /config, damit die LIVE-UI
   *        Phasenbedienung sofort nach einer DP-Zuordnung anzeigen kann.
   * Zusammenhang: Backend-States wie phaseSwitchSupported können erst nach dem nächsten
   *        EMS-Tick im /api/state-Snapshot auftauchen. Die Sichtbarkeitsregel soll aber
   *        direkt an der Haupt-DP-Zuordnung hängen: DP vorhanden => Bedienung sichtbar.
   */
  function evcsConfigRow(index){
    try{
      const cfg = window.__nwCfg || {};
      const sc = cfg && cfg.settingsConfig ? cfg.settingsConfig : {};
      const list = Array.isArray(sc.evcsList) ? sc.evcsList : [];
      return (list[Math.max(0, Math.round(Number(index) || 1) - 1)] || {});
    }catch(_e){
      return {};
    }
  }

  function evcsPhaseSwitchDpAssigned(index){
    const row = evcsConfigRow(index);
    return !!String((row && (row.phaseSwitchId || row.phaseSwitchKey || row.phaseModeWriteId)) || '').trim();
  }

  function evcsStorageAssistCustomerAllowed(index){
    const row = evcsConfigRow(index);
    return !!(row && row.storageAssistCustomerAllowed === true);
  }

  function applyStorageAssistUi(enabled){
    if (!storageAssistButtons) return;
    const want = !!enabled;
    const btns = storageAssistButtons.querySelectorAll('button[data-storage-assist]');
    btns.forEach(b => {
      const raw = String(b.getAttribute('data-storage-assist') || 'false').trim().toLowerCase();
      const val = raw === 'true' || raw === '1' || raw === 'yes';
      b.classList.toggle('active', val === want);
    });
  }

  function evcsConfiguredPhaseMode(index, fallbackPhases){
    const row = evcsConfigRow(index);
    const raw = row && row.phaseMode;
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') return normalizeEvcsPhaseMode(raw);
    return Number(fallbackPhases) === 1 ? 'fixed-1p' : 'fixed-3p';
  }

  function applyPhaseModeUi(mode){
    if (!phaseButtons) return;
    const m = normalizeEvcsPhaseMode(mode);
    const btns = phaseButtons.querySelectorAll('button[data-phase-mode]');
    btns.forEach(b => b.classList.toggle('active', normalizeEvcsPhaseMode(b.getAttribute('data-phase-mode') || 'auto-pv') === m));
  }
  /**
   * Code-Teil: legacyNumToMode
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function legacyNumToMode(n){
    const v = clampUiMode(n);
    if (v === 2) return 'minpv';
    if (v === 3) return 'pv';
    return 'boost';
  }
  /**
   * Code-Teil: nextTsFromTimeInput
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function nextTsFromTimeInput(hhmm){
    const snapped = snapHhmmTo15Min(hhmm);
    const s = String(snapped ?? '').trim();
    if (!s || !/^\d{2}:\d{2}$/.test(s)) return 0;
    const parts = s.split(':');
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (!isFinite(hh) || !isFinite(mm)) return 0;
    const now = new Date();
    const d = new Date(now);
    d.setHours(hh, mm, 0, 0);
    // If the selected time is in the past (or within 1 minute), schedule for the next day.
    if (d.getTime() <= now.getTime() + 60000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  // Snap a HH:MM time string to a 15‑minute grid (00/15/30/45).
  // Returns '' on invalid input.
  /**
   * Code-Teil: snapHhmmTo15Min
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function snapHhmmTo15Min(hhmm){
    const s = String(hhmm ?? '').trim();
    if (!s || !/^\d{2}:\d{2}$/.test(s)) return '';
    const parts = s.split(':');
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (!isFinite(hh) || !isFinite(mm)) return '';

    const total = ((Math.max(0, Math.min(23, Math.round(hh))) * 60) + Math.max(0, Math.min(59, Math.round(mm))));
    let snapped = Math.round(total / 15) * 15;
    snapped = ((snapped % 1440) + 1440) % 1440;
    const sh = Math.floor(snapped / 60);
    const sm = snapped % 60;
    return String(sh).padStart(2,'0') + ':' + String(sm).padStart(2,'0');
  }
  /**
   * Code-Teil: clockValueFromTs
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function clockValueFromTs(ts){
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return '';
    try{
      const dt = new Date(n);
      const hh = String(dt.getHours()).padStart(2,'0');
      const mm = String(dt.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    }catch(_e){
      return '';
    }
  }
  /**
   * Code-Teil: modeToLegacyNum
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function modeToLegacyNum(mode){
    const s = normalizeEmsMode(mode);
    if (s === 'minpv') return 2;
    if (s === 'pv') return 3;
    return 1; // boost (auto -> boost fallback for legacy)
  }
  /**
   * Code-Teil: ensureAutoVisibility
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function ensureAutoVisibility(){
    if (!buttons) return;
    const autoBtn = buttons.querySelector('button[data-mode="auto"]');
    if (autoBtn) autoBtn.classList.toggle('hidden', !modalHasEms);
  }
  /**
   * Code-Teil: applyModeUi
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function applyModeUi(mode){
    if (!buttons) return;
    const m = normalizeEmsMode(mode);
    const btns = buttons.querySelectorAll('button[data-mode]');
    btns.forEach(b => b.classList.toggle('active', String(b.getAttribute('data-mode')||'').toLowerCase() === m));
  }

  if (card){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    card.addEventListener('click', ()=>{
      const c = Number(window.__nwEvcsCount || 0) || 0;
      if (!nwEvcsFeatureFromConfig()) return;
      if (c >= 2) { window.location.href = '/evcs.html'; return; }
      if (modal) modal.classList.remove('hidden');
    });
  }
  if (close){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an close. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    close.addEventListener('click', ()=> modal && modal.classList.add('hidden'));
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal) modal.classList.add('hidden'); });
  }

  if (toggle){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an toggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    toggle.addEventListener('change', async ()=>{
      const desired = !!toggle.checked;
      pendingActive = desired;
      pendingActiveUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      const scope = modalHasEms ? 'ems' : 'settings';
      const key = modalHasEms ? 'evcs.1.stationEnabled' : 'evcsActive';
      try{
        await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope, key, value: desired})});
      }catch(e){}
    });
  }


  if (regToggle){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an regToggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    regToggle.addEventListener('change', async ()=>{
      const desired = !!regToggle.checked;
      pendingReg = desired;
      pendingRegUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}
      try{
        await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'ems', key:'evcs.1.regEnabled', value: desired})});
      }catch(e){}
    });
  }

  if (goalToggle){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an goalToggle. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    goalToggle.addEventListener('change', async ()=>{
      const b = !!goalToggle.checked;
      pendingGoalEnabled = b;
      pendingGoalEnabledUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      try{
        await apiSet('ems', 'evcs.1.goalEnabled', b);
      }catch(_e){
        pendingGoalEnabled = null;
        pendingGoalEnabledUntil = 0;
        try { scheduleRender(); } catch(_e2) {}
      }
    });
  }

  if (goalSoc){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an goalSoc. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    goalSoc.addEventListener('change', async ()=>{
      const n = Number(goalSoc.value);
      if (!Number.isFinite(n)) return;
      const v = Math.max(0, Math.min(100, Math.round(n)));
      pendingGoalSoc = v;
      pendingGoalSocUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      try{
        await apiSet('ems', 'evcs.1.goalTargetSocPct', v);
      }catch(_e){
        pendingGoalSoc = null;
        pendingGoalSocUntil = 0;
      }
    });
  }

  if (goalTime){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an goalTime. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    goalTime.addEventListener('change', async ()=>{
      // Enforce 15‑minute raster even if the browser allows free typing.
      const snapped = snapHhmmTo15Min(goalTime.value) || goalTime.value;
      try { if (snapped && snapped !== goalTime.value) goalTime.value = snapped; } catch(_e) {}

      const ts = nextTsFromTimeInput(snapped);
      pendingGoalFinishTs = ts;
      pendingGoalFinishUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      try{
        await apiSet('ems', 'evcs.1.goalFinishTs', ts);
      }catch(_e){
        pendingGoalFinishTs = null;
        pendingGoalFinishUntil = 0;
      }
    });
  }

  if (goalKwh){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an goalKwh. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    goalKwh.addEventListener('change', async ()=>{
      const n = Number(goalKwh.value);
      const v = Number.isFinite(n) ? Math.max(0, Math.min(2000, Math.round(n * 10) / 10)) : 0;
      pendingGoalKwh = v;
      pendingGoalKwhUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      try{
        await apiSet('ems', 'evcs.1.goalBatteryKwh', v);
      }catch(_e){
        pendingGoalKwh = null;
        pendingGoalKwhUntil = 0;
      }
    });
  }

  if (buttons){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an buttons. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    buttons.addEventListener('click', async (e)=>{
      const b = e.target && e.target.closest ? e.target.closest('button[data-mode]') : null;
      if (!b) return;

      let desired = normalizeEmsMode(b.getAttribute('data-mode') || 'auto');
      // Legacy UI: no "Auto" → map to Boost
      if (!modalHasEms && desired === 'auto') desired = 'boost';

      // UX: allow manual boost cancel by clicking the active Boost button again
      // (instead of waiting for the timeout).
      if (modalHasEms) {
        try {
          const curBtn = buttons.querySelector('button[data-mode].active');
          const cur = curBtn ? normalizeEmsMode(curBtn.getAttribute('data-mode') || 'auto') : 'auto';
          if (desired === 'boost' && cur === 'boost') desired = 'auto';
        } catch(_e) {}
      }

      pendingMode = desired;
      pendingModeUntil = Date.now() + 2500;
      applyModeUi(desired);

      try{
        if (modalHasEms){
          await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'ems', key:'evcs.1.userMode', value: desired})});
        } else {
          const u = modeToLegacyNum(desired);
          const scope = hasPerBoxMode ? 'evcs' : 'settings';
          const key = hasPerBoxMode ? '1.mode' : 'evcsMode';
          await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope, key, value: Number(u)})});
        }
      }catch(_e){}
    });
  }


  if (phaseButtons){
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an phaseButtons. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    phaseButtons.addEventListener('click', async (e)=>{
      const b = e.target && e.target.closest ? e.target.closest('button[data-phase-mode]') : null;
      if (!b || b.disabled) return;
      const desired = normalizeEvcsPhaseMode(b.getAttribute('data-phase-mode') || 'auto-pv');
      pendingPhaseMode = desired;
      pendingPhaseModeUntil = Date.now() + 3000;
      applyPhaseModeUi(desired);
      try { scheduleRender(); } catch(_e) {}
      try{
        await apiSet('ems', 'evcs.1.phaseMode', desired);
      }catch(_e){
        pendingPhaseMode = null;
        pendingPhaseModeUntil = 0;
        try { scheduleRender(); } catch(_e2) {}
      }
    });
  }

  if (storageAssistButtons){
    storageAssistButtons.addEventListener('click', async (e)=>{
      const b = e.target && e.target.closest ? e.target.closest('button[data-storage-assist]') : null;
      if (!b || b.disabled) return;
      const raw = String(b.getAttribute('data-storage-assist') || 'false').trim().toLowerCase();
      const desired = raw === 'true' || raw === '1' || raw === 'yes';
      pendingStorageAssist = desired;
      pendingStorageAssistUntil = Date.now() + 3000;
      applyStorageAssistUi(desired);
      try { scheduleRender(); } catch(_e) {}
      try{
        await apiSet('ems', 'evcs.1.storageAssistEnabled', desired);
      }catch(_e){
        pendingStorageAssist = null;
        pendingStorageAssistUntil = 0;
        try { scheduleRender(); } catch(_e2) {}
      }
    });
  }

  // Update values from state inside global render()
  window.__evcsApply = function(d, s){
    const p = d('evcs.totalPowerW') ?? d('consumptionEvcs') ?? 0;
    const st = d('evcs.1.status') ?? d('evcsStatus') ?? '--';

    // EMS available?
    modalHasEms = d('chargingManagement.wallboxCount') != null;
    const hasEms = !!modalHasEms; // local alias for UI gating
    ensureAutoVisibility();

    // Regelung (Automatik) – nur verfügbar, wenn EMS-Lademanagement aktiv ist
    let regAvail = false;
    let regEnabled = true;
    if (modalHasEms){
      const r = d('chargingManagement.wallboxes.lp1.userEnabled');
      regAvail = (r !== null && r !== undefined);
      regEnabled = (r !== null && r !== undefined) ? !!r : true;
    }
    if (regRow) regRow.style.display = regAvail ? '' : 'none';


    const stationPermission = d('chargingManagement.wallboxes.lp1.userStationEnabled');
    const settingsActive = s && s['settings.evcsActive'] ? s['settings.evcsActive'].value : null;
    hasStationPermissionState = stationPermission !== null && stationPermission !== undefined;
    // EMS default is deliberately enabled. PV mode with 0 W means waiting, not disabled.
    const activeVal = modalHasEms
      ? (hasStationPermissionState ? nwAsBool(stationPermission, true) : true)
      : ((settingsActive != null) ? nwAsBool(settingsActive, true) : true);

    // Mode source: EMS userMode (preferred) or legacy EVCS mode
    let modeStrFromState = 'boost';
    if (modalHasEms){
      modeStrFromState = normalizeEmsMode(d('chargingManagement.wallboxes.lp1.userMode') ?? 'auto');
    } else {
      const evcsMode = d('evcs.1.mode');
      const settingsMode = s && s['settings.evcsMode'] ? s['settings.evcsMode'].value : null;
      hasPerBoxMode = evcsMode != null;
      const modeRaw = (evcsMode != null) ? evcsMode : ((settingsMode != null) ? settingsMode : 1);
      const uiFromState = clampUiMode(modeRaw);
      modeStrFromState = legacyNumToMode(uiFromState);
    }
    /**
     * Code-Teil: fmtP
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const fmtP = (val)=> {
      const u = (window.units && window.units.power) || 'W';
      const n = Number(val) || 0;
      if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + ' kW';
      return n.toFixed(0) + ' ' + u;
    };

    // Ring fill based on current power vs configured max power
    let ratedSingle = Number(s && s['settings.evcsMaxPower'] ? s['settings.evcsMaxPower'].value : 11000); // W
    if (!isFinite(ratedSingle) || ratedSingle <= 0) ratedSingle = 11000;

    const rated = ratedSingle * (Number(window.__nwEvcsCount || 1) || 1);
    const pct = Math.max(0, Math.min(1, rated > 0 ? (Math.abs(Number(p) || 0) / rated) : 0));

    const g = document.querySelector('.evcs-gauge');
    if (g) {
      const deg = (pct * 100).toFixed(1) + '%';
      g.style.background = 'radial-gradient(#0c0f12 60%, transparent 61%),' +
                           'conic-gradient(#6c5ce7 0% ' + deg + ', #2a2f35 ' + deg + ' 100%)';
    }

    const pb = qs('evcsPowerBig'); if (pb) pb.textContent = fmtP(p);
    const sm = qs('evcsStatusModal'); if (sm) sm.textContent = st;

    // Optional: Fahrzeug-SoC anzeigen, falls vorhanden
    try{
      const soc = d('evcs.1.vehicleSoc');
      const row = qs('evcsSocRow');
      const el = qs('evcsVehicleSoc');
      if (soc != null && isFinite(Number(soc))) {
        if (row) row.style.display = '';
        if (el) el.textContent = Math.round(Number(soc)) + ' %';
      } else {
        if (row) row.style.display = 'none';
        if (el) el.textContent = '--';
      }
    }catch(_e){}


    const now = Date.now();

    if (toggle != null){
      if (pendingActive !== null && now < pendingActiveUntil){
        toggle.checked = !!pendingActive;
        if (!!activeVal === !!pendingActive) pendingActive = null;
      } else {
        pendingActive = null;
        toggle.checked = !!activeVal;
      }
      try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('evcsActiveToggle'); } catch(_e) {}
    }


    // Regelung toggle
    if (regToggle != null && regAvail){
      if (pendingReg !== null && now < pendingRegUntil){
        regToggle.checked = !!pendingReg;
        if (!!regEnabled === !!pendingReg) pendingReg = null;
      } else {
        pendingReg = null;
        regToggle.checked = !!regEnabled;
      }
      try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('evcsRegToggle'); } catch(_e) {}
      if (regStatus) regStatus.textContent = regToggle.checked ? 'Aktiv' : 'Aus';
      if (regHint) regHint.textContent = regToggle.checked
        ? 'Automatik aktiv (PV/Netz/§14a/Station/Peak).'
        : 'Regelung deaktiviert – die Automatik greift nicht ein.';
    } else {
      if (regStatus) regStatus.textContent = '—';
      if (regHint) regHint.textContent = '—';
    }

    // AC-Phasenmodus (1p/3p/Auto PV) – LIVE-Schnellsteuerung
    if (phaseRow != null){
      const chargerType = String(d('chargingManagement.wallboxes.lp1.chargerType') ?? '').trim().toUpperCase();
      const configuredPhases = Number(d('chargingManagement.wallboxes.lp1.phases') ?? 0);
      const supported = d('chargingManagement.wallboxes.lp1.phaseSwitchSupported');
      const hasPhaseSwitchDp = evcsPhaseSwitchDpAssigned(1) || supported === true;
      const phaseStateExists = d('chargingManagement.wallboxes.lp1.phaseMode') != null || d('chargingManagement.wallboxes.lp1.userPhaseMode') != null;
      const isAc = hasPhaseSwitchDp || chargerType === 'AC' || (!!hasEms && configuredPhases > 1) || (!!hasEms && phaseStateExists);
      // Bedienregel: Keine Haupt-DP-Zuordnung = keine Bedienung. Nicht deaktiviert anzeigen,
      // sondern komplett ausblenden, damit die Nutzer-UI nur konfigurierte Funktionen zeigt.
      // Wichtig: Sichtbarkeit hängt an der Installer-DP-Zuordnung aus /config, nicht nur
      // an phaseSwitchSupported aus /api/state. Dadurch erscheinen die drei Buttons direkt
      // nach DP-Zuordnung/Neustart und nicht erst nach einem späteren EMS-Diagnose-Tick.
      phaseRow.style.display = (!!hasEms && isAc && hasPhaseSwitchDp) ? '' : 'none';

      if (!!hasEms && isAc && hasPhaseSwitchDp){
        const stMode = d('chargingManagement.wallboxes.lp1.userPhaseMode') ?? d('chargingManagement.wallboxes.lp1.phaseMode') ?? evcsConfiguredPhaseMode(1, configuredPhases);
        const phaseMode = (pendingPhaseMode !== null && now < pendingPhaseModeUntil) ? pendingPhaseMode : normalizeEvcsPhaseMode(stMode);
        const effectivePhaseMode = normalizeEvcsPhaseMode(d('chargingManagement.wallboxes.lp1.phaseMode') ?? phaseMode);
        const currentPhase = Number(d('chargingManagement.wallboxes.lp1.currentPhaseCount') ?? configuredPhases ?? 0);
        const targetPhase = Number(d('chargingManagement.wallboxes.lp1.targetPhaseCount') ?? d('chargingManagement.wallboxes.lp1.currentPhaseCount') ?? configuredPhases ?? 0);
        const switchState = String(d('chargingManagement.wallboxes.lp1.phaseSwitchState') ?? '').trim();
        const reason = String(d('chargingManagement.wallboxes.lp1.phaseSwitchReason') ?? '').trim();
        const cooldownMs = Number(d('chargingManagement.wallboxes.lp1.phaseCooldownRemainingMs') ?? 0);

        if (phaseButtons != null){
          const btns = phaseButtons.querySelectorAll('button[data-phase-mode]');
          btns.forEach(b => {
            b.disabled = false;
            b.style.opacity = 1;
          });
          if (pendingPhaseMode !== null){
            if (normalizeEvcsPhaseMode(stMode) === pendingPhaseMode){
              pendingPhaseMode = null;
              pendingPhaseModeUntil = 0;
            } else if (now < pendingPhaseModeUntil){
              applyPhaseModeUi(pendingPhaseMode);
            } else {
              pendingPhaseMode = null;
              pendingPhaseModeUntil = 0;
              applyPhaseModeUi(phaseMode);
            }
          } else {
            applyPhaseModeUi(phaseMode);
          }
        }

        if (phaseStatus != null){
          const curTxt = (currentPhase === 1 || currentPhase === 3) ? `${currentPhase}p` : '—';
          const targetTxt = (targetPhase === 1 || targetPhase === 3) ? `${targetPhase}p` : '—';
          phaseStatus.textContent = `${phaseModeLabel(phaseMode)} · aktuell ${curTxt} → Ziel ${targetTxt}`;
        }
        if (phaseHint != null){
          let txt = '';
          if (switchState && switchState !== 'idle') txt = `Umschaltung: ${switchState}${reason ? ' · ' + reason : ''}`;
          else if (cooldownMs > 0) txt = `Cooldown aktiv: ${Math.ceil(cooldownMs / 1000)} s`;
          else txt = effectivePhaseMode === 'auto-pv' ? 'Auto PV schaltet 1p/3p nach Überschuss, Hysterese und Cooldown.' : 'Fester AC-Phasenmodus aktiv.';
          phaseHint.textContent = txt;
        }
      }
    }

    // Speicher-Mitnutzung: Installer-Freigabe pro Ladepunkt steuert Sichtbarkeit.
    if (storageAssistRow != null){
      const allowed = evcsStorageAssistCustomerAllowed(1) || d('chargingManagement.wallboxes.lp1.storageAssistCustomerAllowed') === true;
      storageAssistRow.style.display = (!!hasEms && allowed) ? '' : 'none';
      if (!!hasEms && allowed){
        const userEnabledState = !!d('chargingManagement.wallboxes.lp1.userStorageAssistEnabled');
        const effective = !!d('chargingManagement.wallboxes.lp1.effectiveStorageAssist');
        const reason = String(d('chargingManagement.wallboxes.lp1.storageAssistBlockedReason') || '').trim();
        const batteryW = Number(d('chargingManagement.wallboxes.lp1.batteryContributionW') ?? 0);
        const val = (pendingStorageAssist !== null && now < pendingStorageAssistUntil) ? !!pendingStorageAssist : userEnabledState;
        if (pendingStorageAssist !== null){
          if (!!userEnabledState === !!pendingStorageAssist){
            pendingStorageAssist = null;
            pendingStorageAssistUntil = 0;
          } else if (now >= pendingStorageAssistUntil){
            pendingStorageAssist = null;
            pendingStorageAssistUntil = 0;
          }
        }
        applyStorageAssistUi(val);
        if (storageAssistStatus != null){
          storageAssistStatus.textContent = val ? 'Speicher mitnutzen' : 'Speicher schützen';
        }
        if (storageAssistHint != null){
          if (!val) storageAssistHint.textContent = 'Der Speicher wird für diesen Ladepunkt geschützt.';
          else if (effective) storageAssistHint.textContent = `Speicher darf unterstützen${batteryW > 0 ? ' · Anteil ' + Math.round(batteryW) + ' W' : ''}.`;
          else storageAssistHint.textContent = reason ? `Freigegeben, aktuell nicht aktiv: ${reason}` : 'Freigegeben, aktuell nicht aktiv.';
        }
      }
    }

    // EMS: Ziel-Laden (Depot-/Deadline-Laden)
    // Zielladen is only available in AUTO mode.
    const modeOnUi = (pendingMode !== null && now < pendingModeUntil) ? pendingMode : modeStrFromState;
    const goalAllowed = !!hasEms && (modeOnUi === 'auto');
    if (goalRow != null) goalRow.style.display = goalAllowed ? '' : 'none';

    if (!goalAllowed){
      if (goalCfgRow != null) goalCfgRow.style.display = 'none';
      if (goalCfgRow2 != null) goalCfgRow2.style.display = 'none';
      if (goalStatus != null) goalStatus.textContent = '—';
      if (goalHint != null) goalHint.textContent = '';
    } else {
      const gEnabledState = !!d('chargingManagement.wallboxes.lp1.goalEnabled');
      const gTargetState = Number(d('chargingManagement.wallboxes.lp1.goalTargetSocPct'));
      const gFinishState = Number(d('chargingManagement.wallboxes.lp1.goalFinishTs'));
      const gKwhState = Number(d('chargingManagement.wallboxes.lp1.goalBatteryKwh'));
      const gStatusCode = String(d('chargingManagement.wallboxes.lp1.goalStatus') || '');
      const gSocAvail = d('chargingManagement.wallboxes.lp1.goalSocAvailable');
      const gActive = !!d('chargingManagement.wallboxes.lp1.goalActive');
      const gRemaining = Number(d('chargingManagement.wallboxes.lp1.goalRemainingMin'));
      const gDesiredW = Number(d('chargingManagement.wallboxes.lp1.goalDesiredPowerW'));
      const gShortfallW = Number(d('chargingManagement.wallboxes.lp1.goalShortfallW'));

      const goalEnabled = (pendingGoalEnabled !== null && now < pendingGoalEnabledUntil) ? pendingGoalEnabled : gEnabledState;
      const goalTarget = (pendingGoalSoc !== null && now < pendingGoalSocUntil) ? pendingGoalSoc : (Number.isFinite(gTargetState) ? Math.round(gTargetState) : 100);
      const goalFinishTs = (pendingGoalFinishTs !== null && now < pendingGoalFinishUntil) ? pendingGoalFinishTs : (Number.isFinite(gFinishState) ? Math.round(gFinishState) : 0);
      const goalKwhVal = (pendingGoalKwh !== null && now < pendingGoalKwhUntil) ? pendingGoalKwh : (Number.isFinite(gKwhState) ? gKwhState : 0);

      if (goalToggle != null){
        if (pendingGoalEnabled !== null && now < pendingGoalEnabledUntil){
          goalToggle.checked = !!pendingGoalEnabled;
          if (!!gEnabledState === !!pendingGoalEnabled){
            pendingGoalEnabled = null;
            pendingGoalEnabledUntil = 0;
          }
        } else {
          pendingGoalEnabled = null;
          pendingGoalEnabledUntil = 0;
          goalToggle.checked = !!gEnabledState;
        }
        try{ window.nwSyncToggleButtons(goalToggle.id); }catch(_e){}
      }

      const showCfg = !!goalEnabled;
      if (goalCfgRow != null) goalCfgRow.style.display = showCfg ? '' : 'none';
      if (goalCfgRow2 != null) goalCfgRow2.style.display = showCfg ? '' : 'none';

      // Inputs (avoid overwriting while user edits / while native pickers are open)
      if (!goalEditLocked()){
        if (goalSoc != null && document.activeElement !== goalSoc){
          goalSoc.value = String(goalTarget);
        }
        if (goalTime != null && document.activeElement !== goalTime){
          goalTime.value = clockValueFromTs(goalFinishTs);
        }
        if (goalKwh != null && document.activeElement !== goalKwh){
          goalKwh.value = (goalKwhVal > 0 ? String(goalKwhVal) : '');
        }
      }

      // Status / Hint text
      let label = '—';
      let hint = '';

      const remMin = Number.isFinite(gRemaining) ? Math.round(gRemaining) : 0;
      const desiredW = Number.isFinite(gDesiredW) ? Math.round(gDesiredW) : 0;
      const shortfallW = Number.isFinite(gShortfallW) ? Math.round(gShortfallW) : 0;

      if (!goalEnabled){
        label = 'Aus';
        hint = 'Zeit‑Ziel‑Laden deaktiviert.';
      } else if (gStatusCode === 'no_soc'){
        label = 'SoC n/a';
        hint = 'SoC nicht verfügbar – Zielladen läuft im Fallback (Worst‑Case) über Akkukapazität.';
      } else if (gStatusCode === 'no_deadline'){
        label = 'Uhrzeit fehlt';
        hint = 'Bitte „Fertig um“ setzen.';
      } else if (gStatusCode === 'reached'){
        label = 'Ziel erreicht';
        hint = `Ziel‑SoC ${goalTarget}% erreicht.`;
      } else if (gStatusCode === 'overdue'){
        label = 'Überfällig';
        hint = `Unterversorgung: ${shortfallW} W.`;
      } else if (gStatusCode === 'shortfall'){
        label = 'Unterversorgung';
        hint = `Fehlleistung: ${shortfallW} W.`;
      } else if (gStatusCode === 'active' || gActive){
        if (gSocAvail === false){
          label = 'Aktiv (ohne SoC)';
          hint = `Rest ${remMin} min • Ziel ${goalTarget}% (Schätzung) • Ø ${desiredW} W.`;
        } else {
          label = 'Aktiv';
          hint = `Rest ${remMin} min • Ziel ${goalTarget}% • Ø ${desiredW} W.`;
        }
      } else {
        label = 'Konfiguriert';
      }

      if (goalStatus != null) goalStatus.textContent = label;
      if (goalHint != null) goalHint.textContent = hint;
    }

    if (buttons != null){
      try {
        const dis = (regAvail && !regEnabled);
        const btns = buttons.querySelectorAll('button[data-mode]');
        btns.forEach(b => { b.disabled = !!dis; b.style.opacity = dis ? 0.45 : 1; });
      } catch(_e) {}

      if (pendingMode !== null){
        if (modeStrFromState === pendingMode){
          pendingMode = null;
        } else if (now < pendingModeUntil){
          applyModeUi(pendingMode);
          return;
        } else {
          pendingMode = null;
        }
      }
      applyModeUi(modeStrFromState);
    }
  };

})();


// Energiefluss: Schnellsteuerung (optionale Verbraucher/Erzeuger)
// - Kreis wird nur klickbar, wenn im App-Center (Installer) mindestens ein Write-Datenpunkt gesetzt ist
// - Readback ist optional (für Status/Feedback)
/**
 * Code-Teil: openFlowQc
 * Zweck: Öffnet Dialoge/Seiten/Popovers.
 * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function openFlowQc(kind, idx){
  try {
    if (typeof window.__nwFlowQcOpen === 'function') window.__nwFlowQcOpen(kind, idx);
  } catch(_e) {}
}

(function(){
  const modal = document.getElementById('flowQcModal');
  if (!modal) return;

  const title = document.getElementById('flowQcTitle');
  const subtitle = document.getElementById('flowQcSubtitle');
  const powerEl = document.getElementById('flowQcPower');
  const flowGauge = modal.querySelector('.flow-qc-gauge .evcs-gauge');
  const msgEl = document.getElementById('flowQcMsg');

  const swWrap = document.getElementById('flowQcSwitchWrap');
  const sw = document.getElementById('flowQcSwitch');
  const swStatus = document.getElementById('flowQcSwitchStatus');

  const spWrap = document.getElementById('flowQcSetpointWrap');
  const spLabel = document.getElementById('flowQcSetpointLabel');
  const spUnit = document.getElementById('flowQcSetpointUnit');
  const spRange = document.getElementById('flowQcSetpointRange');
  const spValue = document.getElementById('flowQcSetpointValue');
  const spApply = document.getElementById('flowQcSetpointApply');

  const boostWrap = document.getElementById('flowQcBoostWrap');
  const boostStatus = document.getElementById('flowQcBoostStatus');
  const boostHint = document.getElementById('flowQcBoostHint');
  const boostBtn = document.getElementById('flowQcBoostBtn');
  const boostStopBtn = document.getElementById('flowQcBoostStopBtn');

  const regWrap = document.getElementById('flowQcRegWrap');
  const regEnable = document.getElementById('flowQcRegEnable');
  const regStatus = document.getElementById('flowQcRegStatus');
  const regHint = document.getElementById('flowQcRegHint');

  const modeWrap = document.getElementById('flowQcModeWrap');
  const modeButtons = document.getElementById('flowQcModeButtons');
  const modeHint = document.getElementById('flowQcModeHint');

  const closeBtn = document.getElementById('flowQcClose');

  let ctx = null;
  let poll = null;
  let pendingSwitch = null;
  let pendingSetpoint = null;
  let pendingBoost = null;
  let pendingReg = null;
  let pendingMode = null;
  let gaugeDisplayW = 0;
  let gaugeDisplayMaxW = 0;
  let gaugeZeroConfirm = 0;
  let gaugeLastFillDeg = '';
  /**
   * Code-Teil: resetGaugeSmoothing
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const resetGaugeSmoothing = () => {
    gaugeDisplayW = 0;
    gaugeDisplayMaxW = 0;
    gaugeZeroConfirm = 0;
    gaugeLastFillDeg = '';
  };

  /**
   * Code-Teil: smoothGaugePower
   * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
   * Zusammenhang: Gehört zu Kunden-LIVE-Frontend (Dashboard, Energiefluss, Feature-Sichtbarkeit, Einstellungen und Schnellsteuerungen) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
   * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
   */
  const smoothGaugePower = (valueW, maxW, opts = {}) => {
    const raw = Math.max(0, Math.abs(Number(valueW) || 0));
    const max = Math.max(0, Number(maxW) || 0);
    const isRod = !!(opts && opts.isRod);
    const hardOff = !!(opts && opts.hardOff);
    let next = raw;

    if (isRod && !hardOff) {
      if (raw <= 1 && gaugeDisplayW > 50) {
        gaugeZeroConfirm += 1;
        if (gaugeZeroConfirm < 3) next = gaugeDisplayW;
      } else {
        gaugeZeroConfirm = 0;
      }

      if (gaugeDisplayW > 0 && next > 0) {
        const diff = Math.abs(next - gaugeDisplayW);
        if (diff < 50) next = gaugeDisplayW;
        else next = (gaugeDisplayW * 0.65) + (next * 0.35);
      }
    } else if (hardOff) {
      gaugeZeroConfirm = 0;
    }

    gaugeDisplayW = Math.max(0, Math.round(next));
    if (max > 0) gaugeDisplayMaxW = max;
    return { valueW: gaugeDisplayW, maxW: gaugeDisplayMaxW || max };
  };
  /**
   * Code-Teil: showMsg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const showMsg = (t, kind) => {
    if (!msgEl) return;
    msgEl.textContent = t || '';
    msgEl.style.color = (kind === 'error') ? '#fca5a5' : (kind === 'ok') ? '#6ee7b7' : 'var(--muted)';
  };
  /**
   * Code-Teil: modeLabel
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const modeLabel = (m) => {
    const s = String(m || '').trim();
    const k = s.toLowerCase();
    if (k === 'inherit' || k === 'system') return 'System';
    if (k === 'pvauto' || k === 'auto' || k === 'pv') return 'Auto';
    if (k === 'manual' || k === 'manuell') return 'Manuell';
    if (k === 'manual1') return 'Stufe 1';
    if (k === 'manual2') return 'Stufe 2';
    if (k === 'manual3') return 'Stufe 3';
    if (k === 'off' || k === 'aus') return 'Aus';
    if (k === 'boost') return 'Boost';
    return s || '—';
  };
  /**
   * Code-Teil: getSlotMeta
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const getSlotMeta = (k, i) => {
    const cfg = flowSlotsCfg || {};
    const arr = (k === 'producer') ? (cfg.producers || []) : (cfg.consumers || []);
    const n = Number(i) || 0;
    return arr.find(x => Number(x && x.idx) === n) || null;
  };
  /**
   * Code-Teil: getEntry
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const getEntry = (k, i) => {
    const arr = (k === 'producer') ? flowExtras.producers : flowExtras.consumers;
    const n = Number(i) || 0;
    return arr.find(x => Number(x && x.idx) === n) || null;
  };

  /**
   * Code-Teil: readStateNumber
   * Zweck: Liest einen Wert aus Cache, Konfiguration, DOM oder ioBroker-State mit passenden Fallbacks.
   * Zusammenhang: Gehört zu Kunden-LIVE-Frontend (Dashboard, Energiefluss, Feature-Sichtbarkeit, Einstellungen und Schnellsteuerungen) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
   * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
   */
  const readStateNumber = (key, fallback = NaN) => {
    if (!key) return fallback;
    const stores = [state, window.latestState || {}];
    for (const store of stores) {
      const rec = store ? store[key] : null;
      const raw = (rec && typeof rec === 'object' && rec.value !== undefined) ? rec.value : rec;
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  };
  /**
   * Code-Teil: getHeatingRodDeviceCfg
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const getHeatingRodDeviceCfg = (idx) => {
    const rodCfg = (window.__nwEmsApps && window.__nwEmsApps.heatingRod) ? window.__nwEmsApps.heatingRod : {};
    const devices = Array.isArray(rodCfg.devices) ? rodCfg.devices : [];
    const n = Number(idx) || 0;
    let dev = devices[n - 1] && typeof devices[n - 1] === 'object' ? devices[n - 1] : null;
    if (dev && Math.round(Number(dev.slot ?? dev.consumerSlot ?? n)) !== n) dev = null;
    if (!dev) dev = devices.find(d => d && Math.round(Number(d.slot ?? d.consumerSlot ?? 0)) === n) || null;
    return dev || {};
  };
  /**
   * Code-Teil: setFlowGaugeFill
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setFlowGaugeFill = (valueW, maxW) => {
    if (!flowGauge) return;
    const val = Math.max(0, Math.abs(Number(valueW) || 0));
    const max = Math.max(0, Number(maxW) || 0);
    const pct = Math.max(0, Math.min(1, max > 0 ? (val / max) : 0));
    const deg = (pct * 100).toFixed(1) + '%';
    if (deg !== gaugeLastFillDeg) {
      flowGauge.style.background = 'radial-gradient(closest-side, #121416 60%, transparent 61% 100%),' +
                                   'conic-gradient(#6c5ce7 0% ' + deg + ', #2a2f35 ' + deg + ' 100%)';
      gaugeLastFillDeg = deg;
    }
    flowGauge.title = max > 0 ? `${formatPower(val)} von ${formatPower(max)}` : formatPower(val);
  };

  /**
   * Code-Teil: resolveFlowPower
   * Zweck: Berechnet abgeleitete Energie-/Budget-/Flusswerte aus Datenpunkten und Fallbacks.
   * Zusammenhang: Gehört zu Kunden-LIVE-Frontend (Dashboard, Energiefluss, Feature-Sichtbarkeit, Einstellungen und Schnellsteuerungen) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
   * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
   */
  const resolveFlowPower = (readbackData = null) => {
    if (!ctx) return { valueW: 0, maxW: 0 };
    const entry = getEntry(ctx.kind, ctx.idx);
    const meta = getSlotMeta(ctx.kind, ctx.idx);
    const fallbackKey = (ctx.kind === 'producer') ? `producer${ctx.idx}Power` : `consumer${ctx.idx}Power`;
    const stateKey = (entry && entry.stateKey) || (meta && meta.stateKey) || fallbackKey;
    let n = readStateNumber(stateKey, NaN);
    let maxW = Number(ctx && ctx.qc && ctx.qc.max);

    const rod = (readbackData && readbackData.heatingRod && readbackData.heatingRod.available) ? readbackData.heatingRod : null;
    const isRod = !!(rod || (ctx && ctx.qc && String(ctx.qc.controlKind || '').toLowerCase() === 'heatingrod'));
    if (ctx.kind === 'consumer' && isRod) {
      const dev = getHeatingRodDeviceCfg(ctx.idx);
      const measured = rod ? Number(rod.measuredW) : readStateNumber(`heatingRod.devices.c${ctx.idx}.measuredW`, NaN);
      const applied = rod ? Number(rod.appliedW) : readStateNumber(`heatingRod.devices.c${ctx.idx}.appliedW`, NaN);
      const target = rod ? Number(rod.targetW) : readStateNumber(`heatingRod.devices.c${ctx.idx}.targetW`, NaN);
      if (Number.isFinite(measured) && measured > 0) n = measured;
      else if (Number.isFinite(applied) && applied > 0) n = applied;
      else if (Number.isFinite(target)) n = target;
      const maxFromReadback = rod ? Number(rod.maxPowerW) : NaN;
      const maxFromState = readStateNumber(`heatingRod.devices.c${ctx.idx}.maxPowerW`, NaN);
      const maxFromCfg = Number(dev && dev.maxPowerW);
      maxW = [maxFromReadback, maxFromState, maxFromCfg].find(v => Number.isFinite(v) && v > 0) || 0;
    }

    if (!Number.isFinite(n)) n = 0;
    if (!Number.isFinite(maxW) || maxW <= 0) {
      const metaMax = Number(meta && meta.qc && meta.qc.max);
      maxW = Number.isFinite(metaMax) && metaMax > 0 ? metaMax : Math.max(0, Math.abs(n));
    }
    return { valueW: n, maxW };
  };

  /**
   * Code-Teil: updatePower
   * Zweck: Synchronisiert vorhandene Daten mit UI, Runtime-State oder abhängigen Modulen.
   * Zusammenhang: Gehört zu Kunden-LIVE-Frontend (Dashboard, Energiefluss, Feature-Sichtbarkeit, Einstellungen und Schnellsteuerungen) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
   * Wartung/TypeScript: Änderungen können LIVE-Energiefluss, aktuelle Werte und History beeinflussen; DP-Fallbacks nur mit Regressionstest ändern. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
   */
  const updatePower = (readbackData = null) => {
    if (!ctx || !powerEl) return;
    const resolved = resolveFlowPower(readbackData);
    const rod = (readbackData && readbackData.heatingRod && readbackData.heatingRod.available) ? readbackData.heatingRod : null;
    const isRod = !!(ctx && ctx.kind === 'consumer' && ((ctx.qc && String(ctx.qc.controlKind || '').toLowerCase() === 'heatingrod') || rod));
    const modeRaw = rod ? String(rod.effectiveMode || rod.userMode || rod.mode || '').toLowerCase() : '';
    const hardOff = !!(isRod && modeRaw === 'off' && Number(resolved.valueW || 0) <= 1);
    const smoothed = smoothGaugePower(resolved.valueW, resolved.maxW, { isRod, hardOff });
    const n = Number(smoothed.valueW) || 0;
    powerEl.textContent = (ctx.kind === 'consumer') ? formatPower(Math.abs(n)) : formatPowerSigned(n);
    setFlowGaugeFill(n, smoothed.maxW);
  };
  /**
   * Code-Teil: renderModeButtons
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const renderModeButtons = (modes, activeMode) => {
    if (!modeButtons) return;
    const list = Array.isArray(modes) ? modes : [];
    modeButtons.innerHTML = '';
    const colsClass = list.length <= 2 ? 'nw-evcs-mode-buttons-2' : (list.length === 3 ? 'nw-evcs-mode-buttons-3' : (list.length >= 5 ? 'nw-evcs-mode-buttons-5' : 'nw-evcs-mode-buttons-4'));
    modeButtons.className = `nw-evcs-mode-buttons ${colsClass}`;
    list.forEach((it) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = String(it && it.label ? it.label : it && it.value ? it.value : '');
      btn.setAttribute('data-mode', String(it && it.value ? it.value : ''));
      btn.classList.toggle('active', String(it && it.value ? it.value : '') === String(activeMode || ''));
      btn.onclick = () => setMode(String(it && it.value ? it.value : ''));
      modeButtons.appendChild(btn);
    });
  };
  /**
   * Code-Teil: readback
   * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const readback = async () => {
    if (!ctx) return;
    try {
      const qp = new URLSearchParams({ kind: ctx.kind, idx: String(ctx.idx) });
      const r = await fetch('/api/flow/qc/read?' + qp.toString());
      const data = await r.json();
      if (!data || !data.ok) return;
      updatePower(data);

      if (ctx.qc && ctx.qc.hasSwitch && sw){
        if (data.switch !== null && data.switch !== undefined){
          const v = !!data.switch;
          if (pendingSwitch === null) sw.checked = v;
          try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('flowQcSwitch'); } catch(_e) {}
          if (swStatus) swStatus.textContent = v ? 'Ein' : 'Aus';
        } else {
          if (swStatus) swStatus.textContent = '--';
        }
      }

      if (ctx.qc && ctx.qc.hasSetpoint && spValue){
        if (data.setpoint !== null && data.setpoint !== undefined){
          const n = Number(data.setpoint);
          if (Number.isFinite(n) && pendingSetpoint === null){
            spValue.value = String(n);
            if (spRange && spRange.style.display !== 'none') spRange.value = String(n);
          }
        }
      }

      const rod = (data && data.heatingRod && data.heatingRod.available) ? data.heatingRod : null;
      const therm = (!rod && data && data.thermal && data.thermal.available) ? data.thermal : null;
      const ctl = rod || therm;
      const isRod = !!rod;

      if (regWrap) regWrap.style.display = ctl ? '' : 'none';
      if (modeWrap) modeWrap.style.display = ctl ? '' : 'none';

      if (ctl) {
        const uEn = (ctl.userEnabled !== undefined && ctl.userEnabled !== null) ? !!ctl.userEnabled : true;
        const rawUserMode = String(ctl.userMode || (isRod ? 'pvAuto' : 'inherit'));
        const effMode = String(ctl.effectiveMode || ctl.cfgMode || 'pvAuto');
        const activeButtonMode = (pendingMode !== null)
          ? pendingMode
          : ((rawUserMode && rawUserMode !== 'inherit') ? rawUserMode : (isRod ? ((effMode === 'boost') ? 'pvAuto' : effMode) : 'inherit'));

        if (regStatus) regStatus.textContent = uEn ? 'Aktiv' : 'Aus';
        if (regHint) {
          regHint.textContent = isRod
            ? (uEn
                ? `Regelung aktiv. Auto nutzt: ${String(ctl.autoModeLabel || 'PV-Überschuss')}. Manuelle Stufen und Boost bleiben zusätzlich verfügbar.`
                : 'Regelung aus. Der Adapter greift nicht automatisch ein; Stufen, Boost und Aus bleiben händisch verfügbar.')
            : (uEn
                ? 'Automatik aktiv. Manuelle Bedienung bleibt möglich.'
                : 'Regelung deaktiviert – manuelle Bedienung bleibt möglich.');
        }
        if (regEnable && pendingReg === null) regEnable.checked = uEn;
        try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('flowQcRegEnable'); } catch(_e) {}

        renderModeButtons(ctl.modes, activeButtonMode);

        if (modeHint) {
          if (isRod) {
            const stageMax = Math.max(Number(ctl.wiredStages || 0), Number(ctl.stageCount || 0));
            const maxPowerInfo = Number(ctl.maxPowerW || 0) > 0 ? ` • max. ${formatPower(Number(ctl.maxPowerW || 0))}` : '';
            const dupInfo = Array.isArray(ctl.duplicateWriteIds) && ctl.duplicateWriteIds.length ? ' • DP doppelt' : '';
            const stageInfo = stageMax > 0 ? ` • ${Number(ctl.currentStage || 0)}/${stageMax} Stufen${maxPowerInfo}${dupInfo}` : maxPowerInfo;
            const autoModeLabel = String(ctl.autoModeLabel || 'PV-Überschuss');
            const zeroReason = (String(ctl.autoMode || '') === 'zeroExportForecast' && ctl.zeroExportReason) ? ` · ${String(ctl.zeroExportReason)}` : '';
            const strategyInfo = ` • Auto-Betriebsart: ${autoModeLabel}${zeroReason}`;
            const backMode = (rawUserMode && rawUserMode !== 'inherit') ? rawUserMode : (String(ctl.cfgMode || 'pvAuto'));
            if (ctl.boostActive) {
              modeHint.textContent = `Boost aktiv (${Number(ctl.boostRemainingMin || 0)} min) – danach ${modeLabel(backMode)}${stageInfo}${strategyInfo}`;
            } else if (rawUserMode === 'inherit') {
              modeHint.textContent = `System: ${modeLabel(ctl.cfgMode)} (aktiv: ${modeLabel(effMode)})${stageInfo}${strategyInfo}`;
            } else {
              modeHint.textContent = `Aktiv: ${modeLabel(effMode)}${stageInfo}${strategyInfo}`;
            }
          } else {
            if (String(rawUserMode || '').toLowerCase() === 'inherit') {
              modeHint.textContent = `System: ${modeLabel(ctl.cfgMode)} (aktiv: ${modeLabel(effMode)})`;
            } else {
              modeHint.textContent = `Aktiv: ${modeLabel(effMode)}`;
            }
          }
        }
      }

      if (ctx.qc && ctx.qc.hasBoost && boostWrap) {
        const active = !!data.boostActive;
        const rem = Number(data.boostRemainingMin || 0);
        if (boostStatus) boostStatus.textContent = active ? `Aktiv (${rem} min)` : 'Inaktiv';
        if (boostBtn) {
          boostBtn.style.display = active ? 'none' : '';
          const minsCfg = Number(ctx.qc.boostMinutes || 0);
          const mins = Number.isFinite(minsCfg) && minsCfg > 0 ? minsCfg : (isRod ? 60 : 30);
          boostBtn.textContent = isRod ? `Boost ${mins} min` : 'Boost starten';
        }
        if (boostStopBtn) boostStopBtn.style.display = active ? '' : 'none';
        if (boostHint) {
          const minsCfg = Number(ctx.qc.boostMinutes || 0);
          const mins = Number.isFinite(minsCfg) && minsCfg > 0 ? minsCfg : (isRod ? 60 : 30);
          boostHint.textContent = active
            ? (isRod
                ? 'Boost läuft – der Heizstab arbeitet vorübergehend mit 100% und fällt danach auf den gewählten Modus zurück.'
                : 'Boost läuft – Automatik wird vorübergehend nicht überschrieben.')
            : (isRod
                ? `Boost schaltet den Heizstab für ${mins} Minuten auf 100% Leistung.`
                : `Boost startet für ${mins} Minuten (z.B. Schnellaufheizen/Kühlen).`);
        }

        if (!isRod && !!data.manualActive && data.manualUntil && msgEl && !msgEl.textContent) {
          const now = Date.now();
          const until = Number(data.manualUntil);
          const mRem = Number.isFinite(until) && until > now ? Math.max(0, Math.ceil((until - now) / 60000)) : 0;
          if (mRem > 0) showMsg(`Manuelle Vorgabe aktiv (noch ${mRem} min)`, '');
        }
      }
    } catch(_e) {}
  };
  /**
   * Code-Teil: setSwitch
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setSwitch = async (v) => {
    if (!ctx) return;
    pendingSwitch = !!v;
    showMsg('Sende…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.switch`, value: !!v })
      });
      showMsg('Gesendet', 'ok');
      setTimeout(() => showMsg('', ''), 1200);
    } catch(_e) {
      showMsg('Fehler beim Schreiben', 'error');
    } finally {
      setTimeout(() => { pendingSwitch = null; }, 900);
    }
  };
  /**
   * Code-Teil: setSetpoint
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setSetpoint = async (v) => {
    if (!ctx) return;
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    pendingSetpoint = n;
    showMsg('Sende…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.setpoint`, value: n })
      });
      showMsg('Gesendet', 'ok');
      setTimeout(() => showMsg('', ''), 1200);
    } catch(_e) {
      showMsg('Fehler beim Schreiben', 'error');
    } finally {
      setTimeout(() => { pendingSetpoint = null; }, 900);
    }
  };
  /**
   * Code-Teil: setRegEnabled
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setRegEnabled = async (enable) => {
    if (!ctx) return;
    pendingReg = !!enable;
    showMsg('Sende…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.regEnabled`, value: !!enable })
      });
      showMsg('OK', 'ok');
      setTimeout(() => showMsg('', ''), 900);
      setTimeout(() => readback(), 250);
    } catch(_e) {
      showMsg('Fehler beim Schreiben', 'error');
    } finally {
      setTimeout(() => { pendingReg = null; }, 900);
    }
  };
  /**
   * Code-Teil: setMode
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setMode = async (mode) => {
    if (!ctx) return;
    const m = String(mode || '').trim();
    if (!m) return;
    pendingMode = m;
    showMsg('Sende…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.mode`, value: m })
      });
      showMsg('OK', 'ok');
      setTimeout(() => showMsg('', ''), 900);
      setTimeout(() => readback(), 250);
    } catch(_e) {
      showMsg('Fehler beim Schreiben', 'error');
    } finally {
      setTimeout(() => { pendingMode = null; }, 900);
    }
  };
  /**
   * Code-Teil: setBoost
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setBoost = async (enable) => {
    if (!ctx) return;
    pendingBoost = !!enable;
    showMsg(enable ? 'Boost starte…' : 'Boost stoppe…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.boost`, value: !!enable })
      });
      showMsg(enable ? 'Boost aktiviert' : 'Boost beendet', 'ok');
      setTimeout(() => showMsg('', ''), 1400);
      setTimeout(() => readback(), 300);
    } catch(_e) {
      showMsg('Fehler beim Boost', 'error');
    } finally {
      setTimeout(() => { pendingBoost = null; }, 900);
    }
  };
  /**
   * Code-Teil: open
   * Zweck: Öffnet Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const open = (kind, idx) => {
    const k = (kind === 'producer' || kind === 'producers') ? 'producer' : 'consumer';
    const meta = getSlotMeta(k, idx);
    if (!meta) return;
    const qc = (meta && meta.qc) ? meta.qc : null;
    if (!qc || !qc.enabled) return;

    ctx = { kind: k, idx: Number(idx) || 0, name: String(meta.name || ''), qc };

    if (title) title.textContent = ctx.name || 'Schnellsteuerung';
    if (subtitle) {
      subtitle.textContent = (qc.controlKind === 'heatingRod')
        ? 'Heizstab'
        : ((k === 'producer') ? 'Erzeuger' : 'Verbraucher');
    }

    if (swWrap) swWrap.style.display = qc.hasSwitch ? '' : 'none';
    if (swStatus) swStatus.textContent = '--';
    if (sw) {
      sw.checked = false;
      try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('flowQcSwitch'); } catch(_e) {}
      sw.onchange = () => { setSwitch(sw.checked); };
    }

    if (spWrap) spWrap.style.display = qc.hasSetpoint ? '' : 'none';
    if (qc.hasSetpoint) {
      if (spLabel) spLabel.textContent = qc.label || 'Sollwert';
      if (spUnit) spUnit.textContent = qc.unit || 'W';

      const hasRange = qc.min !== null && qc.max !== null && isFinite(qc.min) && isFinite(qc.max) && Number(qc.max) > Number(qc.min);
      if (spRange) {
        spRange.style.display = hasRange ? '' : 'none';
        if (hasRange) {
          spRange.min = String(qc.min);
          spRange.max = String(qc.max);
          const st = (qc.step !== null && isFinite(qc.step) && Number(qc.step) > 0) ? Number(qc.step) : 1;
          spRange.step = String(st);
          spRange.oninput = () => { if (spValue) spValue.value = spRange.value; };
        }
      }

      if (spValue) spValue.value = '';
      if (spApply) spApply.onclick = () => { if (spValue) setSetpoint(spValue.value); };
    }

    if (regWrap) {
      regWrap.style.display = 'none';
      if (regStatus) regStatus.textContent = '—';
      if (regHint) regHint.textContent = '';
      if (regEnable) regEnable.onchange = () => setRegEnabled(!!regEnable.checked);
    }
    if (modeWrap) {
      modeWrap.style.display = 'none';
      if (modeHint) modeHint.textContent = '';
      if (qc.controlKind === 'heatingRod') {
        renderModeButtons([
          { value: 'pvAuto', label: 'Auto' },
          { value: 'manual1', label: 'Stufe 1' },
          { value: 'manual2', label: 'Stufe 2' },
          { value: 'manual3', label: 'Stufe 3' },
          { value: 'off', label: 'Aus' },
        ], 'pvAuto');
      } else {
        renderModeButtons([
          { value: 'pvAuto', label: 'Auto' },
          { value: 'manual', label: 'Manuell' },
          { value: 'off', label: 'Aus' },
          { value: 'inherit', label: 'System' },
        ], 'inherit');
      }
    }

    if (boostWrap) boostWrap.style.display = qc.hasBoost ? '' : 'none';
    if (qc.hasBoost) {
      if (boostStatus) boostStatus.textContent = '—';
      if (boostBtn) boostBtn.onclick = () => setBoost(true);
      if (boostStopBtn) boostStopBtn.onclick = () => setBoost(false);
      if (boostHint) boostHint.textContent = '';
    }

    showMsg('', '');
    resetGaugeSmoothing();
    updatePower();
    readback();

    if (poll) clearInterval(poll);
    poll = setInterval(() => { readback(); }, 1000);
    modal.classList.remove('hidden');
  };
  /**
   * Code-Teil: close
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von Kunden-LIVE-Frontend: Dashboard, Energiefluss, Schnellsteuerung; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const close = () => {
    if (poll) { clearInterval(poll); poll = null; }
    ctx = null;
    pendingSwitch = null;
    pendingSetpoint = null;
    pendingBoost = null;
    pendingReg = null;
    pendingMode = null;
    resetGaugeSmoothing();
    showMsg('', '');
    modal.classList.add('hidden');
  };

  if (closeBtn) closeBtn.addEventListener('click', close);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });

  window.__nwFlowQcOpen = open;
})();

// open EVCS on node click as well
(function(){
  const n = document.getElementById('nodeEvcs');
  const modal = document.getElementById('evcsModal');
  if (n && modal){
    // mark clickable
    n.classList.add('clickable');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an n. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    n.addEventListener('click', ()=>{
      const c = Number(window.__nwEvcsCount || 0) || 0;
      if (!nwEvcsFeatureFromConfig()) return;
      if (c >= 2) { window.location.href = '/evcs.html'; return; }
      modal.classList.remove('hidden');
    });
  }
})();
