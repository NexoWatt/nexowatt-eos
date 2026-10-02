/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/smarthome-config.ts
 * Quell-Hash: sha256:f47ceb1807bed50ae25712727b13bfc48330133b3af00b9203705bbd1ce85fd0
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/smarthome-config.js.
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
 * Aufgabe: Ermöglicht Installern und Admins die Einrichtung von Etagen, Räumen, Geräten, Seiten und Szenen und speichert den gemeinsamen SmartHome-Vertrag.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/smarthome-config.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/smarthome-config.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/smarthome-config.js`.
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
 * Datei: www/smarthome-config.js
 * Rolle im Projekt: SmartHome-Installer.
 * Zweck: Konfiguriert Gebäude, Räume, Geräte, Funktionen und Auto-Erkennung für SmartHome.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Installer-Konfiguration für SmartHome: Gebäude, Räume, Geräte, Kacheln, Funktionen und DP-Zuordnung.
 * Zusammenhänge:
 * - Schreibt Konfiguration über /api/smarthome/config und DP-Such-/Setz-Endpunkte.
 * - Die Kundenansicht www/smarthome.js rendert die hier konfigurierte Struktur.
 * Wartungshinweise:
 * - IDs/Funktionsnamen nicht unbedacht ändern, weil gespeicherte Kundenkonfigurationen darauf referenzieren.
 */

/* SmartHomeConfig VIS-Konfig-Seite (A10, Editor)
 * Bearbeiten von Räumen, Funktionen und Geräten inkl. Datenpunkt-Picker.
 */

const nwShcState = {
  config: { rooms: [], functions: [], devices: [], scenes: [], pages: [], meta: {} },
  originalJson: null,
  dirty: false,
  validation: null,

  // Sidebar pages editor (raw JSON)
  pagesJsonText: '',
  pagesJsonValid: true,

  // Builder UI State für Pages
  pagesDraft: [],
  pagesUi: {
    tab: 'builder',
    selectedId: null,
    isNew: false,
    idManuallyEdited: false,
  },

  // UI shell (Home tiles / Drag&Drop Editor / Classic editor)
  ui: null,

  // Zeitschaltuhren (Endkunde / pro Gerät)
  timers: {
    loaded: false,
    loading: false,
    dirty: false,
    devices: [],
    config: { version: 1, updatedAt: 0, timers: [] },
    map: {},
  },

  // Logik-Uhren (Installer): erzeugen boolean DP smarthome.logicClocks.<id>.active
  logicClocks: {
    loaded: false,
    loading: false,
    dirty: false,
    config: { version: 1, updatedAt: 0, clocks: [] },
    map: {},
  },

  // ioBroker Type-Detector Vorschläge (assistierte Auto-Erkennung, kein Autosave)
  detector: {
    loaded: false,
    loading: false,
    error: '',
    filterText: '',
    showConfigured: false,
    stats: null,
    scannedAt: 0,
    results: [],
    assignments: {},
  },
};


const NW_SHCFG_SENSOR_UNIT_OPTIONS = [
  { value: '', label: '— keine Einheit / automatisch' },
  { value: '°C', label: '°C' },
  { value: 'W', label: 'W' },
  { value: 'kW', label: 'kW' },
  { value: 'kWh', label: 'kWh' },
  { value: 'Lux', label: 'Lux' },
  { value: 'CO₂', label: 'CO₂' },
  { value: 'V', label: 'V' },
  { value: 'A', label: 'A' },
  { value: 'Wh', label: 'Wh' },
  { value: '%', label: '%' },
  { value: 'K', label: 'K' },
  { value: 'm/s', label: 'm/s' },
  { value: 'km/h', label: 'km/h' },
  { value: 'ppm', label: 'ppm' },
];

const NW_SHCFG_SENSOR_PRECISION_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];
/**
 * Code-Teil: nwShcfgDefaultSensorUiFromTemplate
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgDefaultSensorUiFromTemplate(tpl) {
  const meta = String((tpl && tpl.meta) || '').trim().toLowerCase();
  const name = String((tpl && tpl.name) || '').trim().toLowerCase();
  const hay = `${meta} ${name}`;

  if (meta === '°c' || /temperatur|temperature|sauna/.test(hay)) return { unit: '°C', precision: 1 };
  if (meta.includes('0…100') || meta.includes('0...100') || /prozent|percent/.test(hay)) return { unit: '%', precision: 0 };
  if (/\b0\/1\b|binär|binaer|binary/.test(hay)) return { unit: '', precision: 0 };
  return { unit: '', precision: 1 };
}


// Small DOM helper (used by new modules). Intentionally tiny and local to this file.
/**
 * Code-Teil: byId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function byId(id) {
  return document.getElementById(id);
}
/**
 * Code-Teil: nwEnsureShcfgUiState
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureShcfgUiState() {
  if (!nwShcState.ui) {
    // Default always to the new home screen. Migrate older stored values.
    let mode = 'home';
    try {
      const stored = localStorage.getItem('nw-shcfg-ui-mode');

      // Never force users back into legacy UI
      if (stored === 'home' || stored === 'builder' || stored === 'backup' || stored === 'timers' || stored === 'scenes' || stored === 'detect') {
        mode = stored;
      }
    } catch (_) {}

    nwShcState.ui = {
      mode,
      builder: {
        tab: 'building',
        view: 'rooms',
        currentRoomId: null,
        selected: null, // { kind: 'floor'|'room'|'device', id }
        dragPayload: null,
        dragging: false,
        lib: {
          filter: '',
          collapsed: {},
        },
      },
    };
  }
  if (!nwShcState.ui.builder) {
    nwShcState.ui.builder = {
      tab: 'building',
      view: 'rooms',
      currentRoomId: null,
      selected: null,
      dragPayload: null,
      dragging: false,
      lib: { filter: '', collapsed: {} },
    };
  }

  // Ensure nested defaults (older localStorage states)
  if (!nwShcState.ui.builder.lib) nwShcState.ui.builder.lib = { filter: '', collapsed: {} };
  if (!nwShcState.ui.builder.lib.collapsed) nwShcState.ui.builder.lib.collapsed = {};
  if (typeof nwShcState.ui.builder.lib.filter !== 'string') nwShcState.ui.builder.lib.filter = '';

  // Load persisted collapsed groups (best-effort)
  try {
    const raw = localStorage.getItem('nw-shcfg-lib-collapsed');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        nwShcState.ui.builder.lib.collapsed = Object.assign({}, parsed);
      }
    }
  } catch (_) {}

  // Clamp to supported tabs (Visual-Tab ist entfernt)
  if (!['building', 'devices'].includes(nwShcState.ui.builder.tab)) {
    nwShcState.ui.builder.tab = 'building';
  }
}
/**
 * Code-Teil: nwShcfgPersistLibCollapsed
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgPersistLibCollapsed() {
  try {
    nwEnsureShcfgUiState();
    const collapsed = (nwShcState.ui && nwShcState.ui.builder && nwShcState.ui.builder.lib && nwShcState.ui.builder.lib.collapsed) ? nwShcState.ui.builder.lib.collapsed : {};
    localStorage.setItem('nw-shcfg-lib-collapsed', JSON.stringify(collapsed || {}));
  } catch (_) {}
}
/**
 * Code-Teil: nwShcfgGetTargetRoomIdForAdd
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgGetTargetRoomIdForAdd() {
  try {
    nwEnsureShcfgUiState();
    const builderUi = nwShcState.ui.builder;
    if (!builderUi) return null;
    if (builderUi.view === 'roomDevices') return builderUi.currentRoomId || null;
    if (builderUi.selected && builderUi.selected.kind === 'room') return builderUi.selected.id || null;
    return null;
  } catch (_) {
    return null;
  }
}
/**
 * Code-Teil: nwShcfgGetRoomById
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgGetRoomById(roomId) {
  const cfg = nwShcState.config || {};
  const rooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];
  return rooms.find(r => r && r.id === roomId) || null;
}
/**
 * Code-Teil: nwShcfgGetSelectedFloorIdForAddRoom
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgGetSelectedFloorIdForAddRoom() {
  try {
    nwEnsureShcfgUiState();
    const builderUi = nwShcState.ui.builder;
    if (!builderUi || !builderUi.selected) return null;
    const cfg = nwShcState.config || {};
    const floors = Array.isArray(cfg.floors) ? cfg.floors : [];
    const rooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];

    if (builderUi.selected.kind === 'floor') {
      const f = floors.find(fl => fl && fl.id === builderUi.selected.id);
      if (!f) return null;
      // virtual "Ohne Geschoss" => null
      if (builderUi.selected.id === '__unassigned__') return null;
      return f.id;
    }
    if (builderUi.selected.kind === 'room') {
      const r = rooms.find(ro => ro && ro.id === builderUi.selected.id);
      return r ? (r.floorId || null) : null;
    }
    return null;
  } catch (_) {
    return null;
  }
}
/**
 * Code-Teil: nwNormalizeSmartHomeConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeSmartHomeConfig(cfg) {
  const c = (cfg && typeof cfg === 'object') ? cfg : {};
  c.floors = Array.isArray(c.floors) ? c.floors : [];
  c.rooms = Array.isArray(c.rooms) ? c.rooms : [];
  c.functions = Array.isArray(c.functions) ? c.functions : [];
  c.devices = Array.isArray(c.devices) ? c.devices : [];
  c.pages = Array.isArray(c.pages) ? c.pages : [];
  c.meta = (c.meta && typeof c.meta === 'object') ? c.meta : {};
  return c;
}


// --- Helpers -----------------------------------------------------------------
// HTML-escaping for safe rendering (config UI is fed by user-entered text).
/**
 * Code-Teil: nwEscapeHtml
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEscapeHtml(value) {
  const s = (value === null || value === undefined) ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generic sort helper: order ASC, then name/alias/id ASC.
/**
 * Code-Teil: nwSortByOrder
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSortByOrder(a, b) {
  const aoRaw = (a && (a.order ?? a.sortOrder ?? a.idx)) ?? null;
  const boRaw = (b && (b.order ?? b.sortOrder ?? b.idx)) ?? null;

  const ao = Number.isFinite(Number(aoRaw)) ? Number(aoRaw) : 999999;
  const bo = Number.isFinite(Number(boRaw)) ? Number(boRaw) : 999999;

  if (ao !== bo) return ao - bo;

  const aKey = String((a && (a.name ?? a.title ?? a.alias ?? a.id)) ?? '').toLowerCase();
  const bKey = String((b && (b.name ?? b.title ?? b.alias ?? b.id)) ?? '').toLowerCase();
  return aKey.localeCompare(bKey, 'de', { numeric: true, sensitivity: 'base' });
}

const NW_PAGE_ICON_OPTIONS = [
  { value: '', label: '(kein Icon)' },
  { value: '🏠', label: '🏠 Home' },
  { value: '🛋️', label: '🛋️ Wohnzimmer' },
  { value: '🛏️', label: '🛏️ Schlafzimmer' },
  { value: '🍽️', label: '🍽️ Küche' },
  { value: '🛁', label: '🛁 Bad' },
  { value: '🌳', label: '🌳 Garten' },
  { value: '🚗', label: '🚗 Garage/Carport' },
  { value: '⚡', label: '⚡ Energie' },
  { value: '🔋', label: '🔋 Speicher' },
  { value: '🚘', label: '🚘 Laden' },
  { value: '🌡️', label: '🌡️ Heizung' },
  { value: '🪟', label: '🪟 Fenster/Türen' },
  { value: '📷', label: '📷 Kameras' },
  { value: '☀️', label: '☀️ Wetter' },
  { value: '⏱️', label: '⏱️ Automationen' },
  { value: '⚙️', label: '⚙️ Einstellungen' },
];

// Drag&Drop ordering (devices)
let nwDragDeviceFromIndex = null;


/* --- Icon Picker (A11): kleine Vorschau + Standard-Icons --- */

const NW_SH_ICON_PREVIEW_SVGS = {
  bulb: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  plug: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 9h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 9v3a3 3 0 0 0 6 0V9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 15v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  thermostat: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 18a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 12 18Z" fill="currentColor"/></svg>`,
  blinds: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 4h14v16H5V4Z" stroke="currentColor" stroke-width="2"/><path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  tv: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 7h16v10H4V7Z" stroke="currentColor" stroke-width="2"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9h4l5-4v18l-5-4H6V9Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M18 10c1 .9 1 3.1 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" stroke-width="2"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 4h7v7H4V4Z" stroke="currentColor" stroke-width="2"/><path d="M13 4h7v7h-7V4Z" stroke="currentColor" stroke-width="2"/><path d="M4 13h7v7H4v-7Z" stroke="currentColor" stroke-width="2"/><path d="M13 13h7v7h-7v-7Z" stroke="currentColor" stroke-width="2"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2s4 4 4 8a4 4 0 1 1-8 0c0-4 4-8 4-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 22a6 6 0 0 0 6-6c0-3-2-5-3-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  scene: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2l1.1 3.4L16.5 6.5l-3.4 1.1L12 11l-1.1-3.4L7.5 6.5l3.4-1.1L12 2Z" fill="currentColor"/><path d="M19 13l.7 2.1 2.1.7-2.1.7L19 18.6l-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" fill="currentColor"/><path d="M5 13l.7 2.1 2.1.7-2.1.7L5 18.6l-.7-2.1-2.1-.7 2.1-.7L5 13Z" fill="currentColor"/></svg>`,
  thermometer: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 18a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 12 18Z" fill="currentColor"/></svg>`,
  sensor: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 3a7 7 0 0 0-7 7c0 5 7 11 7 11s7-6 7-11a7 7 0 0 0-7-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor"/></svg>`,
  toggle: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="4" y="8" width="16" height="8" rx="4" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/><path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4c2.8 2.8 2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M12 4c-2.8 2.8-2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/></svg>`,
  motion: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="7.5" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/><path d="M12 9c2 2 2 4 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 7c3 3 3 7 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/></svg>`,
  alarm: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 4h6l2 4v5H7V8l2-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 13h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 6l2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 6l-2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  smoke: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="6" y="4" width="12" height="6" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 14c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 18c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/></svg>`,
  meter: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 14a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 14l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 18h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/></svg>`,
  generic: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 6h12v12H6V6Z" stroke="currentColor" stroke-width="2"/></svg>`,

  // Extra icons (Config usability)
  home: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10v10h14V10" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20v-6h4v6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 3h12v18H6V3Z" stroke="currentColor" stroke-width="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  door: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7 3h10v18H7V3Z" stroke="currentColor" stroke-width="2"/><path d="M14.5 12h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
  window: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 4h14v16H5V4Z" stroke="currentColor" stroke-width="2"/><path d="M12 4v16" stroke="currentColor" stroke-width="2"/><path d="M5 12h14" stroke="currentColor" stroke-width="2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 11h12v10H6V11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 16v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 3 20 7v6c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  wifi: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 8c5-4 15-4 20 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 12c3.5-3 10.5-3 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8.5 15.5c2-1.7 5-1.7 7 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 19h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 8h16v8H3V8Z" stroke="currentColor" stroke-width="2"/><path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  solar: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6.2 6.2l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.4 16.4l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17.8 6.2l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.6 16.4 6.2 17.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" stroke="currentColor" stroke-width="2"/></svg>`,
  car: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 16l1-5c.2-1 1-2 2.2-2h7.6c1.2 0 2 .9 2.2 2l1 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 16h16v4H4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 20h.01M17 20h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
  charger: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 9h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 9v3a3 3 0 0 0 6 0V9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 14l-2 4h3l-1 4 4-6h-3l1-2Z" fill="currentColor"/></svg>`,
  water: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  fan: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/><path d="M12 12c6-4 9-2 9 1 0 3-3 5-6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 12c-6-4-9-2-9 1 0 3 3 5 6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 12c0 7-3 9-5 7-2-2-2-6 1-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 16H6l1-2v-4a5 5 0 0 1 10 0v4l1 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/><path d="M12 10v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 6h7l2 2h9v12H3V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,

  // Geschosse / Etagen / Bereiche
  floors: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/></svg>`,
  basement: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><path d="M12 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 14.5 12 17l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  ground: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2" opacity="0.55"/><rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2" opacity="0.55"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2"/><path d="M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/></svg>`,
  upper: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><path d="M12 17V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 9.5 12 7l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  attic: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 11 12 5l7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="11" width="10" height="9" rx="2" stroke="currentColor" stroke-width="2"/><path d="M10 20v-4h4v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/></svg>`,
  garage: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 10 12 4l8 6v10H4V10Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 20v-7h10v7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/></svg>`,
  garden: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="9" r="5" stroke="currentColor" stroke-width="2"/><path d="M12 14v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/></svg>`,
  terrace: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="13" width="14" height="7" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/><circle cx="18" cy="6" r="2" stroke="currentColor" stroke-width="2"/><path d="M18 2v1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/><path d="M21.2 3.8l-1.1 1.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/></svg>`,
  pool: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="5" y="5" width="14" height="9" rx="2" stroke="currentColor" stroke-width="2"/><path d="M6 17c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 20c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/></svg>`,
  panel: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M11 10l-2.2 4h3l-1 4 4.4-6h-3l.8-2Z" fill="currentColor" fill-opacity="0.18"/><path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/></svg>`,
  server: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="6" y="4" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="6" y="10" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="6" y="16" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/><path d="M9 6h.01M9 12h.01M9 18h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
  storage: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7 8l5-3 5 3v10l-5 3-5-3V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 8l5 3 5-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M12 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/></svg>`,
  office: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="9" y="4" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/><path d="M12 8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="6" y="11" width="12" height="6" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 17v3M16 17v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  laundry: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M9 6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="14" r="3.5" stroke="currentColor" stroke-width="2"/></svg>`,

  // 3D Geschosse / Bereiche (NexoWatt Dark‑Style)
  "3d-floors": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_floors_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-basement": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_basement_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2"/><path d="M12 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 14.5 12 17l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-upper": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_upper_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M12 17V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 9.5 12 7l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-attic": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_attic_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M5 11 12 5l7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="11" width="10" height="9" rx="2" fill="url(#nw3d_attic_g)" stroke="currentColor" stroke-width="2"/><path d="M10 20v-4h4v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M7.6 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-garage": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_garage_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M4 10 12 4l8 6v10H4V10Z" fill="url(#nw3d_garage_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 20v-7h10v7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/><path d="M7.5 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-garden": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_garden_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 8) rotate(45) scale(10)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="9" r="5" fill="url(#nw3d_garden_g)" stroke="currentColor" stroke-width="2"/><path d="M12 14v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/><path d="M10 6.5c.8-.7 1.6-1.1 2-1.3" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-panel": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_panel_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="6" y="4" width="12" height="16" rx="2" fill="url(#nw3d_panel_g)" stroke="currentColor" stroke-width="2"/><path d="M9 7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.80"/><path d="M11 10l-2.2 4h3l-1 4 4.4-6h-3l.8-2Z" fill="currentColor" fill-opacity="0.20"/><path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M8.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-server": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_server_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="6" y="4" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2"/><rect x="6" y="10" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><rect x="6" y="16" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M9 6h.01M9 12h.01M9 18h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M7.5 6h4" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-storage": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_storage_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M7 8l5-3 5 3v10l-5 3-5-3V8Z" fill="url(#nw3d_storage_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 8l5 3 5-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M12 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M8.2 8.4h4.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-office": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_office_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="9" y="4" width="6" height="4" rx="1" fill="url(#nw3d_office_g)" stroke="currentColor" stroke-width="2"/><path d="M12 8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="6" y="11" width="12" height="6" rx="2" fill="url(#nw3d_office_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><path d="M8 17v3M16 17v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-laundry": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_laundry_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="6" y="4" width="12" height="16" rx="2" fill="url(#nw3d_laundry_g)" stroke="currentColor" stroke-width="2"/><path d="M8 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M9 6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="14" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M8.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-terrace": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_terrace_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="5" y="13" width="14" height="7" rx="2" fill="url(#nw3d_terrace_g)" stroke="currentColor" stroke-width="2"/><path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/><circle cx="18" cy="6" r="2" fill="url(#nw3d_terrace_g)" stroke="currentColor" stroke-width="2"/><path d="M18 2v1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/></svg>`,
  "3d-pool": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_pool_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="5" y="5" width="14" height="9" rx="2" fill="url(#nw3d_pool_g)" stroke="currentColor" stroke-width="2"/><path d="M6 17c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 20c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/><path d="M7.5 6.2h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,

  "3d-kids": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_kids_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 7.5) rotate(45) scale(11)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="10" r="4" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2"/><circle cx="8.3" cy="7.3" r="1.6" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><circle cx="15.7" cy="7.3" r="1.6" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><path d="M10.2 10.8h.01M13.8 10.8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M12 12.6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.75"/><path d="M8 21c1.4-3 6.6-3 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.2 7.2c.6-.6 1.4-.9 2.3-.9" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-guest": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_guest_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 12h16v6H4v-6Z" fill="url(#nw3d_guest_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.6 4.2l.5 1.4 1.5.1-1.2.9.4 1.5-1.2-.7-1.2.7.3-1.5-1.1-.9 1.5-.1.5-1.4Z" fill="currentColor" fill-opacity="0.22"/><path d="M6.2 13.2h8" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-fireplace": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_fireplace_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="6" y="8" width="12" height="12" rx="2" fill="url(#nw3d_fireplace_g)" stroke="currentColor" stroke-width="2"/><path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 11c-1 1.2-2 2.4-2 4a2 2 0 1 0 4 0c0-1.6-1-2.8-2-4Z" fill="currentColor" fill-opacity="0.10" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 20h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M7.2 9.6h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-gym": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_gym_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="3" y="9" width="3" height="6" rx="1.2" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2"/><rect x="6.5" y="10" width="2.5" height="4" rx="1" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2" opacity="0.9"/><path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="15" y="10" width="2.5" height="4" rx="1" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2" opacity="0.9"/><rect x="18" y="9" width="3" height="6" rx="1.2" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2"/><path d="M4.2 10.2h1.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-sauna": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_sauna_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="6" y="10" width="12" height="10" rx="2" fill="url(#nw3d_sauna_g)" stroke="currentColor" stroke-width="2"/><path d="M8 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M12 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M15 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M7.2 11.6h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-workshop": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_workshop_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M14.8 4.8 19.2 9.2l-2.1 2.1-4.4-4.4 2.1-2.1Z" fill="url(#nw3d_workshop_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.8 7.2 5.5 14.5l4 4 7.3-7.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.2 15.8 3 17l4 4 1.2-1.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.2 6.2l2.4 2.4" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-tech": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_tech_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(10)"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="12" r="6" fill="url(#nw3d_tech_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M7 7l1.4 1.4M15.6 15.6 17 17M17 7l-1.4 1.4M7 17l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 7.2c.6-.6 1.4-.9 2.3-.9" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-carport": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_carport_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M4 10 12 4l8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 15l2-2h6l2 2v4H7v-4Z" fill="url(#nw3d_carport_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="10" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/><circle cx="14" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/><path d="M8.2 16.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-shed": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_shed_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M6 11 12 6l6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="11" width="10" height="9" rx="2" fill="url(#nw3d_shed_g)" stroke="currentColor" stroke-width="2"/><path d="M11 20v-4h2v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M8.2 12.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,

  // Room / area icons
  sofa: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 11a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 13h16v5H4v-5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 18v2M17 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  bed: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 12h16v6H4v-6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  kitchen: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 7h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 3v10c0 2 1 3 3 3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  bath: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M7 7V5a2 2 0 0 1 2-2h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 12h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 12h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 7a4 4 0 0 0 5 5l-4.5 4.5a2 2 0 0 1-2.8 0L7 21l-4-4 4.5-4.7a2 2 0 0 1 0-2.8L12 5a4 4 0 0 0 2 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  stairs: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 20h6v-4h4v-4h4V6h2v14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,

  kids: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="10" r="4" stroke="currentColor" stroke-width="2"/><circle cx="8.3" cy="7.3" r="1.6" stroke="currentColor" stroke-width="2"/><circle cx="15.7" cy="7.3" r="1.6" stroke="currentColor" stroke-width="2"/><path d="M10.2 10.8h.01M13.8 10.8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M12 12.6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.75"/><path d="M8 21c1.4-3 6.6-3 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  guest: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 12h16v6H4v-6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.6 4.2l.5 1.4 1.5.1-1.2.9.4 1.5-1.2-.7-1.2.7.3-1.5-1.1-.9 1.5-.1.5-1.4Z" fill="currentColor" fill-opacity="0.22"/></svg>`,
  fireplace: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 8h12v12H6V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 11c-1 1.2-2 2.4-2 4a2 2 0 1 0 4 0c0-1.6-1-2.8-2-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 20h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/></svg>`,
  gym: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="9" width="3" height="6" rx="1.2" stroke="currentColor" stroke-width="2"/><rect x="6.5" y="10" width="2.5" height="4" rx="1" stroke="currentColor" stroke-width="2"/><path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="15" y="10" width="2.5" height="4" rx="1" stroke="currentColor" stroke-width="2"/><rect x="18" y="9" width="3" height="6" rx="1.2" stroke="currentColor" stroke-width="2"/></svg>`,
  sauna: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M12 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M15 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/></svg>`,
  workshop: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14.8 4.8 19.2 9.2l-2.1 2.1-4.4-4.4 2.1-2.1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.8 7.2 5.5 14.5l4 4 7.3-7.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.2 15.8 3 17l4 4 1.2-1.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  tech: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" opacity="0.9"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M7 7l1.4 1.4M15.6 15.6 17 17M17 7l-1.4 1.4M7 17l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  carport: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 10 12 4l8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 15l2-2h6l2 2v4H7v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="10" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/><circle cx="14" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/></svg>`,
  shed: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 11 12 6l6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="11" width="10" height="9" rx="2" stroke="currentColor" stroke-width="2"/><path d="M11 20v-4h2v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.8"/></svg>`,

  // 3D-style icons
  "3d-bulb": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_bulb_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" fill="url(#nw3d_bulb_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.2 6.2c.6-1.2 1.8-2 3.2-2" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-plug": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_plug_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" fill="url(#nw3d_plug_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 10h6" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-thermostat": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_thermo_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" fill="url(#nw3d_thermo_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M11 6h2" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-blinds": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_blinds_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.45"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_blinds_g)" stroke="currentColor" stroke-width="2"/><path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/><path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/><path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/></svg>`,
  "3d-camera": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_cam_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" fill="url(#nw3d_cam_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/><path d="M9 9h3" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-speaker": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_spk_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.52"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M11 5 7 9H4v6h3l4 4V5Z" fill="url(#nw3d_spk_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M6 12h.01" stroke="#ffffff" stroke-opacity="0.16" stroke-width="3" stroke-linecap="round"/></svg>`,
  "3d-scene": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_scene_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.14"/></linearGradient></defs><path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" fill="url(#nw3d_scene_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 5.5h4" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-sensor": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_sensor_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(10)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="12" r="7" fill="url(#nw3d_sensor_g)" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  "3d-grid": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_grid_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.45"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/><rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/><rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/><rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/></svg>`,
  "3d-toggle": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_toggle_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.45"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="4" y="8" width="16" height="8" rx="4" fill="url(#nw3d_toggle_g)" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="12" r="3" fill="currentColor" fill-opacity="0.20" stroke="currentColor" stroke-width="2"/><path d="M6 10c2-2 10-2 12 0" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-globe": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_globe_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(9 8) rotate(45) scale(12)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="12" r="8" fill="url(#nw3d_globe_g)" stroke="currentColor" stroke-width="2"/><path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M12 4c2.8 2.8 2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/><path d="M12 4c-2.8 2.8-2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/><path d="M8 6.5c1-.6 2.3-1 4-1" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-battery": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_batt_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.52"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="3" y="8" width="18" height="8" rx="2" fill="url(#nw3d_batt_g)" stroke="currentColor" stroke-width="2"/><path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 10h6" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-solar": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_solar_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.45"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M5 10h14l-2 10H3l2-10Z" fill="url(#nw3d_solar_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7.5 12h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/><path d="M6.5 16h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/><path d="M10 10.2l-1.2 9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/><path d="M14 10.2l-1.2 9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/><circle cx="18" cy="6" r="2" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="2"/><path d="M17.3 5.3c.4-.4.9-.6 1.4-.6" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-charger": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_chg_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="7" y="4" width="10" height="16" rx="2" fill="url(#nw3d_chg_g)" stroke="currentColor" stroke-width="2"/><path d="M12 8l-2 4h3l-1 4 4-6h-3l1-2Z" fill="currentColor" fill-opacity="0.22"/><path d="M17 12h2c1 0 2 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 6h6" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-door": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_door_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M7 3h10v18H7V3Z" fill="url(#nw3d_door_g)" stroke="currentColor" stroke-width="2"/><path d="M15 12h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M8.5 5h7" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-window": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_win_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.44"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_win_g)" stroke="currentColor" stroke-width="2"/><path d="M12 4v16" stroke="currentColor" stroke-width="2" opacity="0.75"/><path d="M5 12h14" stroke="currentColor" stroke-width="2" opacity="0.75"/><path d="M7 6h5" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-lock": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_lock_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 11h12v10H6V11Z" fill="url(#nw3d_lock_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 16v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 13h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-motion": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_motion_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(8 10) rotate(45) scale(10)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="7.5" cy="12" r="2.5" fill="url(#nw3d_motion_g)" stroke="currentColor" stroke-width="2"/><path d="M12 9c2 2 2 4 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M15 7c3 3 3 7 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M13 10c1.2 1.2 1.2 2.8 0 4" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-alarm": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_alarm_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.52"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M9 4h6l2 4v5H7V8l2-4Z" fill="url(#nw3d_alarm_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 13h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 6l2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 6l-2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-smoke": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_smoke_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="6" y="4" width="12" height="6" rx="2" fill="url(#nw3d_smoke_g)" stroke="currentColor" stroke-width="2"/><path d="M8 14c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 18c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M8 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-water": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_water_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(12)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><path d="M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" fill="url(#nw3d_water_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 6.5c.8-1.2 1.6-2 2-2.4" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-fan": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_fan_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 10) rotate(45) scale(12)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="12" r="7" fill="url(#nw3d_fan_g)" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.2" fill="currentColor" fill-opacity="0.25"/><path d="M12 11c5-3 7-1 7 1 0 2-2 4-5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M11 12c-3 5-5 4-6 3-1-1-1-4 1-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/><path d="M13 12c-2-5 0-7 2-7 2 0 4 2 3 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/></svg>`,
  "3d-meter": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_meter_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.45"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M6 14a6 6 0 0 1 12 0" fill="url(#nw3d_meter_g)" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 14l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 18h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/><path d="M8 12.2c1.2-.9 2.6-1.2 4-1.2" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-inverter": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_inv_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_inv_g)" stroke="currentColor" stroke-width="2"/><path d="M8 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M8 11h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.45"/><path d="M8 14h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/><circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" fill-opacity="0.18"/><path d="M7.5 6h7" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  "3d-wallbox": `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_wb_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="7" y="3" width="10" height="18" rx="3" fill="url(#nw3d_wb_g)" stroke="currentColor" stroke-width="2"/><path d="M12 7l-1.5 3h2.2l-0.7 3 3-4.6h-2l0.6-1.4Z" fill="currentColor" fill-opacity="0.20"/><path d="M17 10h2c1 0 2 1 2 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 5.8h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,

};
/**
 * Code-Teil: nwShcNormalizeIconName
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcNormalizeIconName(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const key = s.toLowerCase();

  // Light normalization for common german terms (helps when user types e.g. "Keller")
  const map = {
    geschoss: 'floors',
    etage: 'floors',
    etagen: 'floors',

    keller: 'basement',
    untergeschoss: 'basement',
    ug: 'basement',

    erdgeschoss: 'ground',
    eg: 'ground',

    obergeschoss: 'upper',
    og: 'upper',

    dachgeschoss: 'attic',
    dg: 'attic',

    aussenbereich: 'garden',
    außenbereich: 'garden',
    garten: 'garden',

    garage: 'garage',
    terrasse: 'terrace',
    pool: 'pool',

    schaltschrank: 'panel',
    elektro: 'panel',
    verteilung: 'panel',

    server: 'server',
    netzwerk: 'server',

    lager: 'storage',
    abstellraum: 'storage',

    buero: 'office',
    büro: 'office',
    office: 'office',

    waschkueche: 'laundry',
    waschküche: 'laundry',
    waesche: 'laundry',
    wäsche: 'laundry',
    laundry: 'laundry',
    // Räume
    wohnzimmer: 'sofa',
    sofa: 'sofa',
    living: 'sofa',
    schlafzimmer: 'bed',
    bett: 'bed',
    schlafen: 'bed',
    kueche: 'kitchen',
    küche: 'kitchen',
    bad: 'bath',
    badezimmer: 'bath',
    kinderzimmer: 'kids',
    kinder: 'kids',
    kind: 'kids',
    kids: 'kids',
    gaestezimmer: 'guest',
    gästezimmer: 'guest',
    gast: 'guest',
    kaminzimmer: 'fireplace',
    fitness: 'gym',
    sport: 'gym',
    gym: 'gym',
    sauna: 'sauna',
    werkstatt: 'workshop',
    technikraum: 'tech',
    haustechnik: 'tech',
    carport: 'carport',
    gartenhaus: 'shed',
    schuppen: 'shed',
  };

  return map[key] || key;
}
/**
 * Code-Teil: nwShcSafeBadgeText
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcSafeBadgeText(value) {
  let s = String(value || '').trim();
  if (!s) return '';
  // allow only simple chars (prevents SVG/HTML injection)
  s = s.replace(/[^a-zA-Z0-9 \-_.+]/g, '').trim();
  if (s.length > 10) s = s.slice(0, 10);
  return s;
}
/**
 * Code-Teil: nwShcParseDynamicIcon
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcParseDynamicIcon(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  const prefixes = [
    { kind: 'inverter', keys: ['inv:', 'inverter:', 'wechselrichter:'] },
    { kind: 'wallbox', keys: ['wb:', 'wallbox:', 'charger:', 'laden:'] },
  ];

  for (const p of prefixes) {
    for (const k of p.keys) {
      if (lower.startsWith(k)) {
        const label = raw.slice(k.length).trim();
        return { kind: p.kind, label };
      }
    }
  }

  return null;
}
/**
 * Code-Teil: nwShcDynamicDeviceIconSvg
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcDynamicDeviceIconSvg(kind, labelRaw) {
  const label = nwShcSafeBadgeText(labelRaw || '');
  const txt = nwEscapeHtml(label || '');

  if (kind === 'inverter') {
    return `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_inv_badge_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_inv_badge_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M8 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
        <path d="M8 11h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
        <path d="M8 14h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
        <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" fill-opacity="0.18"/>
        <rect x="7" y="15" width="10" height="4" rx="1.2" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>
        <text x="12" y="17.85" text-anchor="middle" font-size="3" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="700" fill="currentColor" fill-opacity="0.85" style="letter-spacing:0.25px">${txt}</text>
        <path d="M7.5 6h7" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  if (kind === 'wallbox') {
    return `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_wb_badge_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect x="7" y="3" width="10" height="18" rx="3" fill="url(#nw3d_wb_badge_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7l-1.5 3h2.2l-0.7 3 3-4.6h-2l0.6-1.4Z" fill="currentColor" fill-opacity="0.20"/>
        <path d="M17 10h2c1 0 2 1 2 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <rect x="7.2" y="15.1" width="9.6" height="4" rx="1.2" fill="currentColor" fill-opacity="0.08" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>
        <text x="12" y="17.95" text-anchor="middle" font-size="3" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="700" fill="currentColor" fill-opacity="0.85" style="letter-spacing:0.25px">${txt}</text>
        <path d="M9 5.8h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  return '';
}
/**
 * Code-Teil: nwShcRenderIconPreview
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcRenderIconPreview(previewEl, iconValue) {
  if (!previewEl) return;
  const raw = String(iconValue || '').trim();

  // Dynamic brand/model icons (e.g. "inv:SMA", "wb:Tesla")
  const dyn = nwShcParseDynamicIcon(raw);
  if (dyn) {
    const svg = nwShcDynamicDeviceIconSvg(dyn.kind, dyn.label);
    if (svg) {
      previewEl.innerHTML = svg;
      previewEl.style.fontSize = '';
      return;
    }
  }

  const key = nwShcNormalizeIconName(raw);
  if (key && NW_SH_ICON_PREVIEW_SVGS[key]) {
    previewEl.innerHTML = NW_SH_ICON_PREVIEW_SVGS[key];
    previewEl.style.fontSize = '';
    return;
  }
  // Emoji / short text fallback
  previewEl.innerHTML = '';
  // Note: some emojis use variation selectors / multi-codepoint sequences.
  // We still want a preview even if the string is a bit longer.
  if (raw && raw.length <= 10) {
    previewEl.textContent = raw;
    previewEl.style.fontSize = '0.9rem';
  } else {
    previewEl.textContent = '';
  }
}



/* --- SmartHome Config Builder: Icon-Auswahl (für Geschosse/Räume/Geräte) --- */

const NW_SHCFG_ICON_OPTIONS = [
  { id: '', label: '(kein Icon)' },

  // SVG Icons (NexoWatt Style)
  { id: 'home', label: 'Home' },
  { id: 'building', label: 'Gebäude' },
  { id: 'folder', label: 'Ordner / Bereich' },
  { id: 'floors', label: 'Etagen / Geschosse' },
  { id: 'basement', label: 'Keller / Untergeschoss' },
  { id: 'ground', label: 'Erdgeschoss' },
  { id: 'upper', label: 'Obergeschoss' },
  { id: 'attic', label: 'Dachgeschoss' },
  { id: 'garage', label: 'Garage' },
  { id: 'garden', label: 'Garten / Außenbereich' },
  { id: 'terrace', label: 'Terrasse' },
  { id: 'pool', label: 'Pool' },
  { id: 'panel', label: 'Schaltschrank / Elektro' },
  { id: 'server', label: 'Server / Netzwerk' },
  { id: 'storage', label: 'Lager / Abstellraum' },
  { id: 'office', label: 'Büro' },
  { id: 'laundry', label: 'Waschküche' },
  { id: 'grid', label: 'Raster' },
  { id: 'toggle', label: 'Schalter / Toggle' },
  { id: 'globe', label: 'Internet / URL' },
  { id: 'meter', label: 'Zähler / Gauge' },

  // Räume / Bereiche
  { id: 'sofa', label: 'Wohnzimmer / Sofa' },
  { id: 'bed', label: 'Schlafzimmer / Bett' },
  { id: 'kitchen', label: 'Küche' },
  { id: 'bath', label: 'Bad' },
  { id: 'stairs', label: 'Treppe' },
  { id: 'wrench', label: 'Technik / Werkzeug' },
  { id: 'kids', label: 'Kinderzimmer' },
  { id: 'guest', label: 'Gästezimmer' },
  { id: 'fireplace', label: 'Kaminzimmer' },
  { id: 'gym', label: 'Fitness' },
  { id: 'sauna', label: 'Sauna' },
  { id: 'workshop', label: 'Werkstatt' },
  { id: 'tech', label: 'Technikraum' },
  { id: 'shed', label: 'Gartenhaus / Schuppen' },
  { id: 'carport', label: 'Carport' },

  // 3D Icons (optisch "plastischer", passend zum Dark‑Design)
  { id: '3d-bulb', label: '3D Licht / Lampe' },
  { id: '3d-plug', label: '3D Steckdose' },
  { id: '3d-thermostat', label: '3D Thermostat' },
  { id: '3d-blinds', label: '3D Rollo / Jalousie' },
  { id: '3d-camera', label: '3D Kamera' },
  { id: '3d-speaker', label: '3D Audio' },
  { id: '3d-scene', label: '3D Szene' },
  { id: '3d-sensor', label: '3D Sensor' },
  { id: '3d-grid', label: '3D Raster' },
  { id: '3d-toggle', label: '3D Schalter / Toggle' },
  { id: '3d-globe', label: '3D Internet / URL' },
  { id: '3d-floors', label: '3D Etagen / Geschosse' },
  { id: '3d-basement', label: '3D Keller / Untergeschoss' },
  { id: '3d-upper', label: '3D Obergeschoss' },
  { id: '3d-attic', label: '3D Dachgeschoss' },
  { id: '3d-garage', label: '3D Garage' },
  { id: '3d-garden', label: '3D Außenbereich / Garten' },
  { id: '3d-panel', label: '3D Schaltschrank / Elektro' },
  { id: '3d-server', label: '3D Server / Netzwerk' },
  { id: '3d-storage', label: '3D Lager / Abstellraum' },
  { id: '3d-office', label: '3D Büro' },
  { id: '3d-laundry', label: '3D Waschküche' },
  { id: '3d-terrace', label: '3D Terrasse' },
  { id: '3d-pool', label: '3D Pool' },
  { id: '3d-kids', label: '3D Kinderzimmer' },
  { id: '3d-guest', label: '3D Gästezimmer' },
  { id: '3d-fireplace', label: '3D Kaminzimmer' },
  { id: '3d-gym', label: '3D Fitness' },
  { id: '3d-sauna', label: '3D Sauna' },
  { id: '3d-workshop', label: '3D Werkstatt' },
  { id: '3d-tech', label: '3D Technikraum' },
  { id: '3d-shed', label: '3D Gartenhaus' },
  { id: '3d-carport', label: '3D Carport' },

  { id: '3d-solar', label: '3D PV / Solar' },
  { id: '3d-battery', label: '3D Batterie' },
  { id: '3d-charger', label: '3D Wallbox / Laden' },
  { id: '3d-inverter', label: '3D Wechselrichter' },
  { id: '3d-wallbox', label: '3D Wallbox (Gerät)' },

  // Marken / Modelle (Text-Badge im Icon)
  { id: 'inv:SMA', label: 'Wechselrichter: SMA' },
  { id: 'inv:Fronius', label: 'Wechselrichter: Fronius' },
  { id: 'inv:SolarEdge', label: 'Wechselrichter: SolarEdge' },
  { id: 'inv:Huawei', label: 'Wechselrichter: Huawei' },
  { id: 'inv:Victron', label: 'Wechselrichter: Victron' },
  { id: 'inv:Kostal', label: 'Wechselrichter: Kostal' },
  { id: 'inv:Sungrow', label: 'Wechselrichter: Sungrow' },
  { id: 'inv:GoodWe', label: 'Wechselrichter: GoodWe' },
  { id: 'inv:Growatt', label: 'Wechselrichter: Growatt' },
  { id: 'inv:Enphase', label: 'Wechselrichter: Enphase' },

  { id: 'wb:Tesla', label: 'Wallbox: Tesla' },
  { id: 'wb:Easee', label: 'Wallbox: Easee' },
  { id: 'wb:go-e', label: 'Wallbox: go-e' },
  { id: 'wb:KEBA', label: 'Wallbox: KEBA' },
  { id: 'wb:ABB', label: 'Wallbox: ABB' },
  { id: 'wb:Mennekes', label: 'Wallbox: Mennekes' },
  { id: 'wb:Heidelberg', label: 'Wallbox: Heidelberg' },
  { id: 'wb:Wallbox', label: 'Wallbox: Wallbox' },
  { id: 'wb:openWB', label: 'Wallbox: openWB' },


  { id: '3d-door', label: '3D Tür' },
  { id: '3d-window', label: '3D Fenster' },
  { id: '3d-lock', label: '3D Schloss' },
  { id: '3d-motion', label: '3D Bewegung' },
  { id: '3d-alarm', label: '3D Alarm / Sirene' },
  { id: '3d-smoke', label: '3D Rauchmelder' },

  { id: '3d-water', label: '3D Wasser' },
  { id: '3d-fan', label: '3D Lüfter / Klima' },
  { id: '3d-meter', label: '3D Zähler' },

  { id: 'bulb', label: 'Licht / Lampe' },
  { id: 'plug', label: 'Steckdose' },
  { id: 'thermostat', label: 'Thermostat' },
  { id: 'thermometer', label: 'Temperatur' },
  { id: 'blinds', label: 'Rollo / Jalousie' },
  { id: 'fan', label: 'Lüfter' },
  { id: 'water', label: 'Wasser' },

  { id: 'camera', label: 'Kamera' },
  { id: 'tv', label: 'TV' },
  { id: 'speaker', label: 'Audio' },

  { id: 'lock', label: 'Schloss' },
  { id: 'door', label: 'Tür' },
  { id: 'window', label: 'Fenster' },
  { id: 'shield', label: 'Sicherheit' },
  { id: 'bell', label: 'Klingel' },
  { id: 'motion', label: 'Bewegung' },
  { id: 'alarm', label: 'Alarm / Sirene' },
  { id: 'smoke', label: 'Rauchmelder' },
  { id: 'wifi', label: 'WLAN' },

  { id: 'bolt', label: 'Energie' },
  { id: 'battery', label: 'Batterie' },
  { id: 'solar', label: 'PV / Sonne' },
  { id: 'car', label: 'Auto' },
  { id: 'charger', label: 'Laden' },

  { id: 'fire', label: 'Heizen' },
  { id: 'scene', label: 'Szene' },
  { id: 'sensor', label: 'Sensor' },
  { id: 'info', label: 'Info' },
  { id: 'star', label: 'Favorit' },
  { id: 'generic', label: 'Allgemein' },

  // Emoji Vorschläge
  { id: '🏠', label: '🏠 Haus' },
  { id: '🛋️', label: '🛋️ Wohnen' },
  { id: '🛏️', label: '🛏️ Schlafen' },
  { id: '🍽️', label: '🍽️ Essen' },
  { id: '🛁', label: '🛁 Bad' },
  { id: '🚪', label: '🚪 Flur' },
  { id: '🧰', label: '🧰 Technik' },
  { id: '🌳', label: '🌳 Außenbereich' },
  { id: '🚗', label: '🚗 Garage' },
  { id: '📷', label: '📷 Kamera' },
  { id: '🎥', label: '🎥 Video' },
  { id: '🔒', label: '🔒 Schloss' },
  { id: '🪟', label: '🪟 Fenster' },
  { id: '🧯', label: '🧯 Sicherheit' },
  { id: '🔔', label: '🔔 Klingel' },
  { id: '📡', label: '📡 Netzwerk' },
  { id: '⚡', label: '⚡ Energie' },
  { id: '🔋', label: '🔋 Batterie' },
  { id: '☀️', label: '☀️ Sonne/PV' },
  { id: '🌡️', label: '🌡️ Klima' },
  { id: '💧', label: '💧 Wasser' },
  { id: '🌀', label: '🌀 Lüfter' },
  { id: '🎛️', label: '🎛️ Steuerung' },
  { id: '⭐', label: '⭐ Favorit' },
  { id: '❓', label: '❓ Sonstiges' },
];
/**
 * Code-Teil: nwShcfgRenderIconPickerRow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgRenderIconPickerRow(currentValue, onCommit, { showLabel = true, labelText = 'Icon' } = {}) {
  const iconLine = document.createElement('div');
  iconLine.className = 'nw-config-icon-row';

  const iconTop = document.createElement('div');
  iconTop.className = 'nw-config-icon-row__top';
  iconLine.appendChild(iconTop);  if (showLabel) {
    const iconLabel = document.createElement('span');
    iconLabel.className = 'nw-config-icon-row__label';
    iconLabel.textContent = labelText;
    iconTop.appendChild(iconLabel);
  }

  const iconPreview = document.createElement('div');
  iconPreview.className = 'nw-config-icon-row__preview';
  iconTop.appendChild(iconPreview);

  const iconSelect = document.createElement('select');
  iconSelect.className = 'nw-select';
  iconTop.appendChild(iconSelect);

  const iconCustom = document.createElement('input');
  iconCustom.type = 'text';
  iconCustom.className = 'nw-input nw-config-icon-row__custom';
  iconCustom.placeholder = 'Emoji oder Icon-Key…';
  iconLine.appendChild(iconCustom);

  // Build options
  const customId = '__custom__';
  const options = [...NW_SHCFG_ICON_OPTIONS, { id: customId, label: 'Eigene Eingabe…' }];
  options.forEach((o) => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = o.label;
    iconSelect.appendChild(opt);
  });
  const optionIds = new Set(options.map((o) => String(o.id)));
  /**
   * Code-Teil: commitIcon
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function commitIcon(value) {
    const v = String(value || '').trim();
    if (typeof onCommit === 'function') onCommit(v);
  }
  /**
   * Code-Teil: setPreview
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setPreview(value) {
    nwShcRenderIconPreview(iconPreview, value);
  }
  /**
   * Code-Teil: syncUiFromValue
   * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function syncUiFromValue(value) {
    const v = String(value || '').trim();
    setPreview(v);

    if (v && optionIds.has(v)) {
      iconSelect.value = v;
      iconCustom.value = '';
      iconCustom.disabled = true;
      return;
    }

    // Fall back to custom
    iconSelect.value = customId;
    iconCustom.disabled = false;
    iconCustom.value = v;
  }

  // Init
  syncUiFromValue(currentValue);

  // Change via dropdown
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an iconSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  iconSelect.addEventListener('change', () => {
    if (iconSelect.value === customId) {
      iconCustom.disabled = false;
      iconCustom.focus();
      // Don't commit yet – user types custom
      setPreview(iconCustom.value);
      return;
    }

    iconCustom.disabled = true;
    iconCustom.value = '';
    setPreview(iconSelect.value);
    commitIcon(iconSelect.value);
  });

  // Live preview while typing custom
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an iconCustom. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  iconCustom.addEventListener('input', () => {
    iconSelect.value = customId;
    iconCustom.disabled = false;
    setPreview(iconCustom.value);
  });

  // Commit custom on blur/change
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an iconCustom. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  iconCustom.addEventListener('change', () => {
    iconSelect.value = customId;
    iconCustom.disabled = false;
    commitIcon(iconCustom.value);
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an iconCustom. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  iconCustom.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      iconCustom.blur();
    }
  });

  return iconLine;
}
/* --- Validator (A10): Fehlerliste für stabile Einrichtung --- */

let nwValidateTimer = null;
/**
 * Code-Teil: nwScheduleValidation
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwScheduleValidation() {
  if (nwValidateTimer) clearTimeout(nwValidateTimer);
  nwValidateTimer = setTimeout(() => {
    nwValidateTimer = null;
    nwRunValidationNow();
  }, 180);
}
/**
 * Code-Teil: nwCssEscape
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCssEscape(value) {
  const s = String(value || '');
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
  return s.replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch);
}
/**
 * Code-Teil: nwEntityKey
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEntityKey(entity) {
  if (!entity || !entity.kind) return 'global';
  const idx = (typeof entity.index === 'number') ? entity.index : -1;
  const id = (typeof entity.id === 'string' && entity.id) ? entity.id : '';
  return entity.kind + ':' + idx + ':' + id;
}
/**
 * Code-Teil: nwPushIssue
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPushIssue(out, severity, title, message, entity) {
  const item = {
    severity,
    title: title || (severity === 'error' ? 'Fehler' : 'Warnung'),
    message: message || '',
    entity: entity || { kind: 'global' },
  };
  if (severity === 'error') out.errors.push(item);
  else out.warnings.push(item);

  const key = nwEntityKey(item.entity);
  const prev = out.byEntity[key] || { kind: item.entity.kind, index: item.entity.index, id: item.entity.id, errorCount: 0, warnCount: 0, maxSeverity: null };
  if (severity === 'error') prev.errorCount += 1;
  else prev.warnCount += 1;
  if (!prev.maxSeverity || prev.maxSeverity === 'warn') {
    prev.maxSeverity = severity;
  }
  out.byEntity[key] = prev;
}
/**
 * Code-Teil: nwLooksLikeDpId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLooksLikeDpId(id) {
  const s = String(id || '').trim();
  if (!s) return false;
  if (/\s/.test(s)) return false;
  // ioBroker ids typically contain at least one dot
  return s.includes('.');
}
/**
 * Code-Teil: nwValidateConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwValidateConfig(cfg) {
  const out = { errors: [], warnings: [], byEntity: {} };
  const safe = cfg || {};

  const rooms = Array.isArray(safe.rooms) ? safe.rooms : [];
  const fns = Array.isArray(safe.functions) ? safe.functions : [];
  const devices = Array.isArray(safe.devices) ? safe.devices : [];

  const seenRoomIds = new Map();
  rooms.forEach((r, idx) => {
    const id = (r && typeof r.id === 'string') ? r.id.trim() : '';
    if (!id) {
      nwPushIssue(out, 'error', 'Raum', 'Raum ohne ID (bitte eine eindeutige ID vergeben).', { kind: 'room', index: idx, id: '' });
    } else {
      if (seenRoomIds.has(id)) {
        nwPushIssue(out, 'error', 'Raum', 'Doppelte Raum-ID: „' + id + '“', { kind: 'room', index: idx, id });
      } else {
        seenRoomIds.set(id, idx);
      }
    }
    const name = (r && typeof r.name === 'string') ? r.name.trim() : '';
    if (!name) {
      nwPushIssue(out, 'warn', 'Raum', 'Raum ohne Namen (UI wird unübersichtlich).', { kind: 'room', index: idx, id });
    }
  });

  const seenFnIds = new Map();
  fns.forEach((f, idx) => {
    const id = (f && typeof f.id === 'string') ? f.id.trim() : '';
    if (!id) {
      nwPushIssue(out, 'error', 'Funktion', 'Funktion ohne ID (bitte eine eindeutige ID vergeben).', { kind: 'function', index: idx, id: '' });
    } else {
      if (seenFnIds.has(id)) {
        nwPushIssue(out, 'error', 'Funktion', 'Doppelte Funktions-ID: „' + id + '“', { kind: 'function', index: idx, id });
      } else {
        seenFnIds.set(id, idx);
      }
    }
    const name = (f && typeof f.name === 'string') ? f.name.trim() : '';
    if (!name) {
      nwPushIssue(out, 'warn', 'Funktion', 'Funktion ohne Namen (UI wird unübersichtlich).', { kind: 'function', index: idx, id });
    }
  });

  const seenDeviceIds = new Map();
  devices.forEach((d, idx) => {
    const id = (d && typeof d.id === 'string') ? d.id.trim() : '';
    const ent = { kind: 'device', index: idx, id };

    if (!id) {
      nwPushIssue(out, 'error', 'Gerät', 'Gerät ohne ID (muss eindeutig sein).', ent);
    } else {
      if (seenDeviceIds.has(id)) {
        nwPushIssue(out, 'error', 'Gerät', 'Doppelte Geräte-ID: „' + id + '“', ent);
      } else {
        seenDeviceIds.set(id, idx);
      }
    }

    const alias = (d && typeof d.alias === 'string') ? d.alias.trim() : '';
    if (!alias) {
      nwPushIssue(out, 'warn', 'Gerät', 'Gerät ohne Alias (Kachel-Titel wirkt leer).', ent);
    }

    const type = (d && typeof d.type === 'string') ? d.type.trim() : '';
    if (!type) {
      nwPushIssue(out, 'error', 'Gerät', 'Gerät ohne Typ.', ent);
    }

    // Room / Function mapping
    const roomId = (d && typeof d.roomId === 'string') ? d.roomId.trim() : '';
    if (!roomId) {
      nwPushIssue(out, 'warn', 'Gerät', 'Kein Raum zugewiesen (Filter/Struktur leidet).', ent);
    } else if (!seenRoomIds.has(roomId)) {
      nwPushIssue(out, 'error', 'Gerät', 'Zugewiesener Raum existiert nicht: „' + roomId + '“', ent);
    }
    const fnId = (d && typeof d.functionId === 'string') ? d.functionId.trim() : '';
    if (!fnId) {
      nwPushIssue(out, 'warn', 'Gerät', 'Keine Funktion zugewiesen (Filter/Struktur leidet).', ent);
    } else if (!seenFnIds.has(fnId)) {
      nwPushIssue(out, 'error', 'Gerät', 'Zugewiesene Funktion existiert nicht: „' + fnId + '“', ent);
    }

    const beh = (d && typeof d.behavior === 'object' && d.behavior) ? d.behavior : {};
    const readOnly = !!beh.readOnly;

    // IO validation by type (lightweight, no DB reads)
    const io = (d && typeof d.io === 'object' && d.io) ? d.io : {};

    /**
     * Code-Teil: Arrow-Funktion `chkDp`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: chkDp
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const chkDp = (label, dp) => {
      const v = String(dp || '').trim();
      if (!v) return;
      if (!nwLooksLikeDpId(v)) {
        nwPushIssue(out, 'warn', 'Datenpunkt', label + ': sieht nicht wie eine Datenpunkt-ID aus („' + v + '“).', ent);
      }
    };

    if (type === 'switch' || type === 'scene') {
      const sw = (io && io.switch) ? io.switch : {};
      const readId = (sw && typeof sw.readId === 'string') ? sw.readId.trim() : '';
      const writeId = (sw && typeof sw.writeId === 'string') ? sw.writeId.trim() : '';
      chkDp('Schalter lesen (readId)', readId);
      chkDp('Schalter schreiben (writeId)', writeId);
      if (!readId && !writeId) {
        nwPushIssue(out, 'error', 'Gerät', 'Schalter/Szene ohne Datenpunkt (readId/writeId fehlt).', ent);
      } else if (readOnly && !readId) {
        nwPushIssue(out, 'error', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber Schalter readId fehlt.', ent);
      }
    } else if (type === 'color') {
      // Farblicht: Farb-DP ist Pflicht, Schalter ist optional.
      const sw = (io && io.switch) ? io.switch : {};
      const swReadId = (sw && typeof sw.readId === 'string') ? sw.readId.trim() : '';
      const swWriteId = (sw && typeof sw.writeId === 'string') ? sw.writeId.trim() : '';
      chkDp('Schalter lesen (readId)', swReadId);
      chkDp('Schalter schreiben (writeId)', swWriteId);

      const col = (io && io.color) ? io.color : {};
      const cReadId = (col && typeof col.readId === 'string') ? col.readId.trim() : '';
      const cWriteId = (col && typeof col.writeId === 'string') ? col.writeId.trim() : '';
      const fmt = (col && typeof col.format === 'string') ? col.format.trim().toLowerCase() : 'hex';

      chkDp('Farbe lesen (readId)', cReadId);
      chkDp('Farbe schreiben (writeId)', cWriteId);

      if (!cReadId && !cWriteId) {
        nwPushIssue(out, 'error', 'Gerät', 'Farb‑Licht ohne Farb‑Datenpunkt (readId/writeId fehlt).', ent);
      } else if (readOnly && !cReadId) {
        nwPushIssue(out, 'error', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber Farbe readId fehlt.', ent);
      }

      if (fmt && !['hex', 'rgb', 'int', 'integer', 'number'].includes(fmt)) {
        nwPushIssue(out, 'warn', 'Gerät', 'Unbekanntes Farbformat: „' + fmt + '“. (Empfohlen: hex / rgb / int)', ent);
      }
    } else if (type === 'dimmer') {
      const lvl = (io && io.level) ? io.level : {};
      const readId = (lvl && typeof lvl.readId === 'string') ? lvl.readId.trim() : '';
      const writeId = (lvl && typeof lvl.writeId === 'string') ? lvl.writeId.trim() : '';
      chkDp('Wert/Position lesen (readId)', readId);
      chkDp('Wert/Position schreiben (writeId)', writeId);
      if (!readId && !writeId) {
        nwPushIssue(out, 'error', 'Gerät', 'Dimmer ohne Wert/Position-Datenpunkt (readId/writeId fehlt).', ent);
      } else if (readOnly && !readId) {
        nwPushIssue(out, 'error', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber Wert/Position readId fehlt.', ent);
      }
    } else if (type === 'blind') {
      const lvl = (io && io.level) ? io.level : {};
      const cover = (io && io.cover) ? io.cover : {};
      const legacyBlind = (io && io.blind) ? io.blind : {};
      const posRead = (lvl && typeof lvl.readId === 'string' && lvl.readId.trim())
        ? lvl.readId.trim()
        : ((cover && typeof cover.positionId === 'string' && cover.positionId.trim())
          ? cover.positionId.trim()
          : ((legacyBlind && typeof legacyBlind.posId === 'string') ? legacyBlind.posId.trim() : ''));
      const posWrite = (lvl && typeof lvl.writeId === 'string' && lvl.writeId.trim())
        ? lvl.writeId.trim()
        : ((cover && typeof cover.writeId === 'string' && cover.writeId.trim())
          ? cover.writeId.trim()
          : ((legacyBlind && typeof legacyBlind.posId === 'string') ? legacyBlind.posId.trim() : ''));
      const upId = (cover && typeof cover.upId === 'string' && cover.upId.trim())
        ? cover.upId.trim()
        : ((legacyBlind && typeof legacyBlind.upId === 'string') ? legacyBlind.upId.trim() : '');
      const downId = (cover && typeof cover.downId === 'string' && cover.downId.trim())
        ? cover.downId.trim()
        : ((legacyBlind && typeof legacyBlind.downId === 'string') ? legacyBlind.downId.trim() : '');
      const stopId = (cover && typeof cover.stopId === 'string' && cover.stopId.trim())
        ? cover.stopId.trim()
        : ((legacyBlind && typeof legacyBlind.stopId === 'string') ? legacyBlind.stopId.trim() : '');
      chkDp('Position lesen / Status (readId)', posRead);
      chkDp('Position schreiben (writeId)', posWrite);
      chkDp('Taster Auf / Richtung 0 (upId)', upId);
      chkDp('Taster Ab / Richtung 1 (downId)', downId);
      chkDp('Taster Stop (stopId)', stopId);
      if (!posRead && !posWrite && !upId && !downId && !stopId) {
        nwPushIssue(out, 'error', 'Gerät', 'Jalousie/Rollladen ohne Datenpunkte (Position oder up/down/stop fehlt).', ent);
      }
      if (readOnly && !posRead && !upId && !downId && !stopId) {
        nwPushIssue(out, 'error', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber kein Read-DP (Position/Status) und keine Tasten-DPs gesetzt.', ent);
      }
    } else if (type === 'rtr') {
      const cl = (io && io.climate) ? io.climate : {};
      const cur = (cl && typeof cl.currentTempId === 'string') ? cl.currentTempId.trim() : '';
      const sp = (cl && typeof cl.setpointId === 'string') ? cl.setpointId.trim() : '';
      const mode = (cl && typeof cl.modeId === 'string') ? cl.modeId.trim() : '';
      const hum = (cl && typeof cl.humidityId === 'string') ? cl.humidityId.trim() : '';
      chkDp('Klima Ist-Temperatur (currentTempId)', cur);
      chkDp('Klima Sollwert (setpointId)', sp);
      chkDp('Klima Modus (modeId)', mode);
      chkDp('Klima Luftfeuchte (humidityId)', hum);
      if (!cur && !sp) {
        nwPushIssue(out, 'error', 'Gerät', 'RTR ohne currentTempId und ohne setpointId (keine Anzeige/Regelung möglich).', ent);
      }
      if (!readOnly && !sp) {
        nwPushIssue(out, 'warn', 'Gerät', 'RTR ohne setpointId (nur Anzeige möglich).', ent);
      }
    } else if (type === 'player') {
      const pl = (io && io.player) ? io.player : {};
      const playingId = (pl && typeof pl.playingId === 'string') ? pl.playingId.trim() : '';
      const titleId = (pl && typeof pl.titleId === 'string') ? pl.titleId.trim() : '';
      const artistId = (pl && typeof pl.artistId === 'string') ? pl.artistId.trim() : '';
      const sourceId = (pl && typeof pl.sourceId === 'string') ? pl.sourceId.trim() : '';
      const coverId = (pl && typeof pl.coverId === 'string') ? pl.coverId.trim() : '';
      const volR = (pl && typeof pl.volumeReadId === 'string') ? pl.volumeReadId.trim() : '';
      const volW = (pl && typeof pl.volumeWriteId === 'string') ? pl.volumeWriteId.trim() : '';
      const playId = (pl && typeof pl.playId === 'string') ? pl.playId.trim() : '';
      const pauseId = (pl && typeof pl.pauseId === 'string') ? pl.pauseId.trim() : '';
      const stopId = (pl && typeof pl.stopId === 'string') ? pl.stopId.trim() : '';
      const nextId = (pl && typeof pl.nextId === 'string') ? pl.nextId.trim() : '';
      const prevId = (pl && typeof pl.prevId === 'string') ? pl.prevId.trim() : '';
      const toggleId = (pl && typeof pl.toggleId === 'string') ? pl.toggleId.trim() : '';
      const stationWriteId = (pl && typeof pl.stationId === 'string') ? pl.stationId.trim() : '';
      const playlistWriteId = (pl && typeof pl.playlistId === 'string') ? pl.playlistId.trim() : '';
      const muteReadId = (pl && typeof pl.muteReadId === 'string') ? pl.muteReadId.trim() : '';
      const muteWriteId = (pl && typeof pl.muteWriteId === 'string') ? pl.muteWriteId.trim() : '';
      const powerReadId = (pl && typeof pl.powerReadId === 'string') ? pl.powerReadId.trim() : '';
      const powerWriteId = (pl && typeof pl.powerWriteId === 'string') ? pl.powerWriteId.trim() : '';
      const seekReadId = (pl && typeof pl.seekReadId === 'string') ? pl.seekReadId.trim() : '';
      const seekWriteId = (pl && typeof pl.seekWriteId === 'string') ? pl.seekWriteId.trim() : '';
      const shuffleId = (pl && typeof pl.shuffleId === 'string') ? pl.shuffleId.trim() : '';
      const repeatId = (pl && typeof pl.repeatId === 'string') ? pl.repeatId.trim() : '';
      const ttsWriteId = (pl && typeof pl.ttsWriteId === 'string') ? pl.ttsWriteId.trim() : '';

      chkDp('Player Status (playingId)', playingId);
      chkDp('Titel (titleId)', titleId);
      chkDp('Interpret (artistId)', artistId);
      chkDp('Quelle (sourceId)', sourceId);
      chkDp('Cover URL (coverId)', coverId);
      chkDp('Lautstärke lesen (volumeReadId)', volR);
      chkDp('Lautstärke schreiben (volumeWriteId)', volW);
      chkDp('Play (playId)', playId);
      chkDp('Pause (pauseId)', pauseId);
      chkDp('Stop (stopId)', stopId);
      chkDp('Nächster Titel (nextId)', nextId);
      chkDp('Vorheriger Titel (prevId)', prevId);
      chkDp('Toggle (toggleId)', toggleId);
      chkDp('Radiosender setzen (stationId)', stationWriteId);
      chkDp('Playlist wählen (playlistId)', playlistWriteId);
      chkDp('Mute lesen (muteReadId)', muteReadId);
      chkDp('Mute schreiben (muteWriteId)', muteWriteId);
      chkDp('Power lesen (powerReadId)', powerReadId);
      chkDp('Power schreiben (powerWriteId)', powerWriteId);
      chkDp('Position lesen (seekReadId)', seekReadId);
      chkDp('Position schreiben (seekWriteId)', seekWriteId);
      chkDp('Shuffle (shuffleId)', shuffleId);
      chkDp('Repeat (repeatId)', repeatId);
      chkDp('Text-to-Speech (ttsWriteId)', ttsWriteId);

      const hasAny = !!(playingId || titleId || artistId || sourceId || coverId || volR || volW || playId || pauseId || stopId || nextId || prevId || toggleId || stationWriteId || playlistWriteId
        || muteReadId || muteWriteId || powerReadId || powerWriteId || seekReadId || seekWriteId || shuffleId || repeatId || ttsWriteId);
      if (!hasAny) {
        nwPushIssue(out, 'error', 'Gerät', 'Audio-Player ohne Datenpunkte (mind. 1 DP muss gesetzt sein).', ent);
      }
      if (readOnly && !(playingId || titleId || artistId || sourceId || coverId || volR || muteReadId || powerReadId || seekReadId || shuffleId || repeatId)) {
        nwPushIssue(out, 'warn', 'Gerät', 'Nur Anzeige (readOnly) aktiv, aber es ist kein Read-DP gesetzt (playingId/titleId/volumeReadId).', ent);
      }
      const seekMin = Number(pl.seekMin);
      const seekMax = Number(pl.seekMax);
      const seekStep = Number(pl.seekStep);
      if (seekReadId || seekWriteId) {
        if (!Number.isFinite(seekMin) || !Number.isFinite(seekMax) || seekMax <= seekMin) {
          nwPushIssue(out, 'error', 'Gerät', 'Ungültiger Positionsbereich: Maximum muss größer als Minimum sein.', ent);
        }
        if (!Number.isFinite(seekStep) || seekStep <= 0) {
          nwPushIssue(out, 'error', 'Gerät', 'Ungültige Positions-Schrittweite.', ent);
        }
      }

      const stList = (d && Array.isArray(d.stations)) ? d.stations : [];
      stList.forEach((s, sIdx) => {
        const nm = (s && typeof s.name === 'string') ? s.name.trim() : '';
        const val = (s && (typeof s.value === 'string' || typeof s.value === 'number')) ? String(s.value).trim() : '';
        if (!nm) nwPushIssue(out, 'warn', 'Radiosender', 'Radiosender ohne Namen (Index ' + (sIdx + 1) + ').', ent);
        if (!val) nwPushIssue(out, 'warn', 'Radiosender', 'Radiosender ohne Wert/URL (Index ' + (sIdx + 1) + ').', ent);
      });

      const plList = (d && Array.isArray(d.playlists)) ? d.playlists : [];
      if (plList.length && !playlistWriteId) {
        nwPushIssue(out, 'warn', 'Playlists', 'Playlists sind konfiguriert, aber playlistId fehlt (Auswahl in der VIS kann nicht schreiben).', ent);
      }
      plList.forEach((s, sIdx) => {
        const nm = (s && typeof s.name === 'string') ? s.name.trim() : '';
        const val = (s && (typeof s.value === 'string' || typeof s.value === 'number')) ? String(s.value).trim() : '';
        if (!nm) nwPushIssue(out, 'warn', 'Playlists', 'Playlist ohne Namen (Index ' + (sIdx + 1) + ').', ent);
        if (!val) nwPushIssue(out, 'warn', 'Playlists', 'Playlist ohne Wert/URI/ID (Index ' + (sIdx + 1) + ').', ent);
      });
    } else if (type === 'sensor') {
      const se = (io && io.sensor) ? io.sensor : {};
      const readId = (se && typeof se.readId === 'string') ? se.readId.trim() : '';
      chkDp('Sensor lesen (readId)', readId);
      if (!readId) {
        nwPushIssue(out, 'error', 'Gerät', 'Sensor ohne readId.', ent);
      }
    } else if (type === 'logicStatus') {
      nwPushIssue(out, 'warn', 'Gerät', 'Typ „logicStatus“ ist (noch) nicht vollständig implementiert.', ent);
    } else if (type) {
      nwPushIssue(out, 'warn', 'Gerät', 'Unbekannter Typ: „' + type + '“', ent);
    }
  });

  return out;
}
/**
 * Code-Teil: nwRenderValidationPanel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderValidationPanel(result) {
  const host = document.getElementById('nw-config-validation');
  if (!host) return;

  const v = result || { errors: [], warnings: [] };
  const errCount = v.errors ? v.errors.length : 0;
  const warnCount = v.warnings ? v.warnings.length : 0;

  host.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'nw-validation__head';

  const title = document.createElement('div');
  title.className = 'nw-validation__title';
  title.textContent = 'Validator (SmartHomeConfig)';

  const badges = document.createElement('div');
  badges.className = 'nw-validation__badges';

  const bErr = document.createElement('span');
  bErr.className = 'nw-config-badge ' + (errCount ? 'nw-config-badge--error' : 'nw-config-badge--ok');
  bErr.textContent = 'Fehler: ' + errCount;

  const bWarn = document.createElement('span');
  bWarn.className = 'nw-config-badge ' + (warnCount ? 'nw-config-badge--warn' : 'nw-config-badge--idle');
  bWarn.textContent = 'Warnungen: ' + warnCount;

  badges.appendChild(bErr);
  badges.appendChild(bWarn);

  head.appendChild(title);
  head.appendChild(badges);

  const hint = document.createElement('div');
  hint.className = 'nw-validation__hint';
  hint.textContent = errCount
    ? 'Bitte die Fehler beheben, damit die SmartHome-Seite stabil funktioniert. Warnungen sind Hinweise (z.B. fehlende Namen oder DPs).'
    : (warnCount ? 'Keine Fehler. Bitte Warnungen prüfen (Qualität/Übersichtlichkeit).' : '✅ Keine Fehler oder Warnungen.');

  host.appendChild(head);
  host.appendChild(hint);

  const items = [];
  (v.errors || []).forEach(it => items.push(it));
  (v.warnings || []).forEach(it => items.push(it));
  if (!items.length) return;

  const list = document.createElement('div');
  list.className = 'nw-validation__list';

  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'nw-validation-item';

    const sev = document.createElement('div');
    sev.className = 'nw-validation-item__sev ' + (it.severity === 'error' ? 'nw-validation-item__sev--error' : 'nw-validation-item__sev--warn');
    sev.textContent = it.severity === 'error' ? '⛔' : '⚠️';

    const text = document.createElement('div');
    text.className = 'nw-validation-item__text';

    const t = document.createElement('div');
    t.className = 'nw-validation-item__title';

    const kind = (it.entity && it.entity.kind) ? it.entity.kind : 'global';
    const idx = (it.entity && typeof it.entity.index === 'number') ? it.entity.index : null;
    const id = (it.entity && it.entity.id) ? it.entity.id : '';

    let where = '';
    if (kind === 'room') where = 'Raum' + (id ? ' „' + id + '“' : (idx !== null ? ' #' + (idx + 1) : ''));
    else if (kind === 'function') where = 'Funktion' + (id ? ' „' + id + '“' : (idx !== null ? ' #' + (idx + 1) : ''));
    else if (kind === 'device') where = 'Gerät' + (id ? ' „' + id + '“' : (idx !== null ? ' #' + (idx + 1) : ''));
    else where = 'Global';

    t.textContent = (it.title ? it.title + ' · ' : '') + where;

    const msg = document.createElement('div');
    msg.className = 'nw-validation-item__msg';
    msg.textContent = it.message || '';

    text.appendChild(t);
    text.appendChild(msg);

    row.appendChild(sev);
    row.appendChild(text);

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an row. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    row.addEventListener('click', () => {
      nwFocusEntity(it.entity);
    });

    list.appendChild(row);
  });

  host.appendChild(list);
}
/**
 * Code-Teil: nwFocusEntity
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFocusEntity(entity) {
  if (!entity || !entity.kind) return;
  const kind = entity.kind;
  const idx = (typeof entity.index === 'number') ? entity.index : null;
  const id = (typeof entity.id === 'string') ? entity.id : '';

  let selector = '';
  if (idx !== null) {
    selector = '[data-nw-entity="' + nwCssEscape(kind) + '"][data-nw-index="' + idx + '"]';
  } else if (id) {
    selector = '[data-nw-entity="' + nwCssEscape(kind) + '"][data-nw-id="' + nwCssEscape(id) + '"]';
  }
  if (!selector) return;
  const el = document.querySelector(selector);
  if (!el) return;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('nw-issue-attention');
  // force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('nw-issue-attention');
  setTimeout(() => {
    el.classList.remove('nw-issue-attention');
  }, 1300);
}
/**
 * Code-Teil: nwApplyValidationToDom
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwApplyValidationToDom(result) {
  // clear previous marks
  document.querySelectorAll('.nw-issue--error, .nw-issue--warn').forEach((el) => {
    el.classList.remove('nw-issue--error', 'nw-issue--warn');
  });

  const v = result || {};
  const byEntity = v.byEntity || {};
  Object.keys(byEntity).forEach((k) => {
    const info = byEntity[k];
    if (!info || !info.kind || typeof info.index !== 'number') return;
    const el = document.querySelector('[data-nw-entity="' + nwCssEscape(info.kind) + '"][data-nw-index="' + info.index + '"]');
    if (!el) return;
    if (info.maxSeverity === 'error') el.classList.add('nw-issue--error');
    else if (info.maxSeverity === 'warn') el.classList.add('nw-issue--warn');
  });
}
/**
 * Code-Teil: nwRunValidationNow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRunValidationNow() {
  const cfg = nwShcState.config || { rooms: [], functions: [], devices: [] };
  const v = nwValidateConfig(cfg);
  nwShcState.validation = v;
  nwRenderValidationPanel(v);
  nwApplyValidationToDom(v);
}
/**
 * Code-Teil: nwGetRoomLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetRoomLabel(room) {
  if (!room) return '';
  return room.name || room.id || '';
}
/**
 * Code-Teil: nwGetFunctionLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetFunctionLabel(fn) {
  if (!fn) return '';
  return fn.name || fn.id || '';
}
/**
 * Code-Teil: nwGetTypeLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetTypeLabel(type) {
  const t = (type || '').trim();
  const map = {
    switch: 'Schalter',
    color: 'Farb‑Licht (RGB)',
    dimmer: 'Dimmer',
    blind: 'Jalousie / Rollladen',
    rtr: 'Heizung (RTR)',
    player: 'Audio-Player',
    sensor: 'Sensor',
    scene: 'Szene',
    logicStatus: 'Logik-Status',
  };
  return map[t] || (t || 'Typ?');
}
/**
 * Code-Teil: nwSetStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetStatus(text, variant) {
  const el = document.getElementById('nw-config-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  if (variant) el.classList.add('nw-config-status--' + variant);
}
/**
 * Code-Teil: nwMarkDirty
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwMarkDirty(dirty) {
  nwShcState.dirty = !!dirty;
  const saveBtn = document.getElementById('nw-config-save-btn');
  if (saveBtn) {
    saveBtn.disabled = !dirty;
  }
  if (dirty) {
    nwSetStatus('Nicht gespeicherte Änderungen', 'dirty');
  } else {
    nwSetStatus('', null);
  }

  // Run validator (debounced) so installer sees issues immediately.
  nwScheduleValidation();
}
/**
 * Code-Teil: nwFetchSmartHomeConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwFetchSmartHomeConfig() {
  try {
    const res = await fetch('/api/smarthome/config');
    if (!res.ok) {
      console.error('SmartHomeConfig request failed:', res.status, res.statusText);
      nwSetStatus('Fehler beim Laden der Konfiguration', 'error');
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok || !data.config) {
      console.warn('SmartHomeConfig payload invalid', data);
      nwSetStatus('Ungültige Konfigurationsdaten', 'error');
      return null;
    }
    return data.config;
  } catch (e) {
    console.error('SmartHomeConfig fetch error:', e);
    nwSetStatus('Ausnahme beim Laden der Konfiguration', 'error');
    return null;
  }
}


/* --- Import / Export (Rollout & Support) --- */
/**
 * Code-Teil: nwDownloadTextFile
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDownloadTextFile(filename, text, mimeType) {
  try {
    const blob = new Blob([text], { type: mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (_e) {}
      try { a.remove(); } catch (_e) {}
    }, 0);
  } catch (e) {
    console.error('Download failed:', e);
  }
}
/**
 * Code-Teil: nwNormalizeImportedSmartHomeConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeImportedSmartHomeConfig(rawCfg) {
  const cfgIn = (rawCfg && typeof rawCfg === 'object') ? rawCfg : {};
  // preserve any future top-level fields, but guarantee the core structure
  const cfg = Object.assign({}, cfgIn);
  cfg.version = (typeof cfg.version === 'number') ? cfg.version : 2;
  cfg.floors = Array.isArray(cfg.floors) ? cfg.floors : [];
  cfg.rooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];
  cfg.functions = Array.isArray(cfg.functions) ? cfg.functions : [];
  cfg.devices = Array.isArray(cfg.devices) ? cfg.devices : [];
  cfg.scenes = Array.isArray(cfg.scenes) ? cfg.scenes : [];
  cfg.pages = Array.isArray(cfg.pages) ? cfg.pages : [];
  cfg.meta = (cfg.meta && typeof cfg.meta === 'object') ? cfg.meta : {};
  return cfg;
}


/* --- Pages (Sidebar Navigation) --- */
/**
 * Code-Teil: nwSetPagesStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetPagesStatus(msg, type) {
  const el = document.getElementById('nw-pages-status');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  const cls = (type === 'ok') ? 'nw-config-status--ok' : (type === 'error') ? 'nw-config-status--error' : 'nw-config-status--dirty';
  el.classList.add(cls);
}
/**
 * Code-Teil: nwNormalizePageObject
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizePageObject(p, idx) {
  const id = String((p && p.id) ? p.id : `page_${idx + 1}`).trim();
  const title = String((p && (p.title || p.name || p.id)) ? (p.title || p.name || p.id) : `Seite ${idx + 1}`).trim();
  const icon = String((p && p.icon) ? p.icon : '').trim();
  const viewModeRaw = String((p && p.viewMode) ? p.viewMode : '').trim();
  const viewMode = (viewModeRaw === 'rooms' || viewModeRaw === 'functions') ? viewModeRaw : '';
  const roomIds = Array.isArray(p && p.roomIds) ? p.roomIds.map(x => String(x).trim()).filter(Boolean) : [];
  const funcIds = Array.isArray(p && p.funcIds) ? p.funcIds.map(x => String(x).trim()).filter(Boolean) : [];
  const types = Array.isArray(p && p.types) ? p.types.map(x => String(x).trim()).filter(Boolean) : [];
  const favoritesOnly = !!(p && p.favoritesOnly);
  const href = String((p && p.href) ? p.href : '').trim();
  const order = Number.isFinite(+((p && p.order) ?? idx)) ? +((p && p.order) ?? idx) : idx;

  // Multi-Level + Layout-Regeln
  const parentId = String((p && p.parentId) ? p.parentId : '').trim();
  const cardSizeRaw = String((p && (p.cardSize ?? (p.layout && p.layout.cardSize))) ? (p.cardSize ?? (p.layout && p.layout.cardSize)) : '').trim();
  const cardSize = ['auto','s','m','l','xl'].includes(cardSizeRaw) ? cardSizeRaw : 'auto';
  const sortByRaw = String((p && (p.sortBy ?? (p.layout && p.layout.sortBy))) ? (p.sortBy ?? (p.layout && p.layout.sortBy)) : '').trim();
  const sortBy = ['order','name','type'].includes(sortByRaw) ? sortByRaw : 'order';
  const groupByType = !!(p && (p.groupByType ?? (p.layout && p.layout.groupByType)));

  return { id, title, icon, viewMode, roomIds, funcIds, types, favoritesOnly, href, order, parentId, cardSize, sortBy, groupByType };
}
/**
 * Code-Teil: nwParsePagesJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwParsePagesJson(text) {
  try {
    const raw = (text || '').trim();
    if (!raw) return { ok: true, pages: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'JSON muss ein Array sein: [ {..}, {..} ]' };
    }
    const pages = parsed.map((p, idx) => nwNormalizePageObject(p, idx)).filter(p => p.id && p.title);
    const seen = new Set();
    for (const p of pages) {
      if (seen.has(p.id)) {
        return { ok: false, error: `Doppelte id: ${p.id}` };
      }
      seen.add(p.id);
    }
    // sort by order for deterministic navigation
    pages.sort((a, b) => (a.order || 0) - (b.order || 0));
    return { ok: true, pages };
  } catch (e) {
    return { ok: false, error: 'Parse-Fehler: ' + (e && e.message ? e.message : String(e)) };
  }
}
/**
 * Code-Teil: nwBuildDefaultPages
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwBuildDefaultPages(cfg) {
  const floors = (cfg && Array.isArray(cfg.floors)) ? cfg.floors : [];
  const rooms = (cfg && Array.isArray(cfg.rooms)) ? cfg.rooms : [];

  const pages = [{
    id: 'home',
    title: 'Home',
    icon: '🏠',
    viewMode: 'rooms',
    roomIds: [],
    funcIds: [],
    types: [],
    favoritesOnly: false,
    order: 0,
  }];

  // If there are no floors configured yet, keep the legacy flat room navigation.
  if (!floors.length) {
    rooms
      .slice()
      .sort((a, b) => {
        const oa = Number.isFinite(+a.order) ? +a.order : 0;
        const ob = Number.isFinite(+b.order) ? +b.order : 0;
        if (oa !== ob) return oa - ob;
        return String(a.name || '').localeCompare(String(b.name || ''), 'de');
      })
      .forEach((r, idx) => {
        const id = String(r.id || '').trim();
        const title = String(r.name || '').trim();
        if (!id || !title) return;
        pages.push({
          id: `room_${id}`,
          title,
          icon: String(r.icon || '🏷️'),
          viewMode: 'rooms',
          roomIds: [id],
          funcIds: [],
          types: [],
          favoritesOnly: false,
          order: 10 + idx,
        });
      });

    return pages;
  }

  const roomsByFloor = new Map();
  const unassignedRooms = [];

  for (const r of rooms) {
    const rid = String((r && r.id) || '').trim();
    const rname = String((r && r.name) || '').trim();
    if (!rid || !rname) continue;
    const fid = String((r && r.floorId) || '').trim();
    if (fid) {
      if (!roomsByFloor.has(fid)) roomsByFloor.set(fid, []);
      roomsByFloor.get(fid).push(r);
    } else {
      unassignedRooms.push(r);
    }
  }

  const sortedFloors = floors
    .slice()
    .map((f, idx) => ({
      id: String((f && f.id) || '').trim(),
      name: String((f && (f.name || f.title || f.id)) || '').trim(),
      icon: String((f && f.icon) || '').trim() || '🏢',
      order: Number.isFinite(+((f && f.order) ?? idx)) ? +((f && f.order) ?? idx) : idx,
    }))
    .filter((f) => f && f.id)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.name || '').localeCompare(String(b.name || ''), 'de');
    });

  const NO_MATCH = '__nw_no_match__';

  sortedFloors.forEach((f, fIdx) => {
    const floorPageId = `floor_${f.id}`;

    const roomsInFloor = (roomsByFloor.get(f.id) || [])
      .slice()
      .sort((a, b) => {
        const oa = Number.isFinite(+a.order) ? +a.order : 0;
        const ob = Number.isFinite(+b.order) ? +b.order : 0;
        if (oa !== ob) return oa - ob;
        return String(a.name || '').localeCompare(String(b.name || ''), 'de');
      });
    const roomIds = roomsInFloor.map((r) => String(r.id || '').trim()).filter(Boolean);

    pages.push({
      id: floorPageId,
      title: f.name || f.id,
      icon: f.icon || '🏢',
      viewMode: 'rooms',
      roomIds: roomIds.length ? roomIds : [NO_MATCH],
      funcIds: [],
      types: [],
      favoritesOnly: false,
      order: 10 + fIdx,
    });

    roomsInFloor.forEach((r, rIdx) => {
      const id = String(r.id || '').trim();
      const title = String(r.name || '').trim();
      if (!id || !title) return;
      pages.push({
        id: `room_${id}`,
        title,
        icon: String(r.icon || '🏷️'),
        viewMode: 'rooms',
        roomIds: [id],
        funcIds: [],
        types: [],
        favoritesOnly: false,
        parentId: floorPageId,
        order: Number.isFinite(+r.order) ? +r.order : rIdx,
      });
    });
  });

  if (unassignedRooms.length) {
    const floorPageId = 'floor_unassigned';

    const roomsSorted = unassignedRooms
      .slice()
      .sort((a, b) => {
        const oa = Number.isFinite(+a.order) ? +a.order : 0;
        const ob = Number.isFinite(+b.order) ? +b.order : 0;
        if (oa !== ob) return oa - ob;
        return String(a.name || '').localeCompare(String(b.name || ''), 'de');
      });
    const roomIds = roomsSorted.map((r) => String(r.id || '').trim()).filter(Boolean);

    pages.push({
      id: floorPageId,
      title: 'Ohne Geschoss',
      icon: '🧩',
      viewMode: 'rooms',
      roomIds: roomIds.length ? roomIds : [NO_MATCH],
      funcIds: [],
      types: [],
      favoritesOnly: false,
      order: 9999,
    });

    roomsSorted.forEach((r, rIdx) => {
      const id = String(r.id || '').trim();
      const title = String(r.name || '').trim();
      if (!id || !title) return;
      pages.push({
        id: `room_${id}`,
        title,
        icon: String(r.icon || '🏷️'),
        viewMode: 'rooms',
        roomIds: [id],
        funcIds: [],
        types: [],
        favoritesOnly: false,
        parentId: floorPageId,
        order: Number.isFinite(+r.order) ? +r.order : rIdx,
      });
    });
  }

  return pages;
}
/**
 * Code-Teil: nwRenderPagesEditor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderPagesEditor(force = false) {
  const ta = document.getElementById('nw-pages-json');
  if (!ta) return;

  // Sync textarea from state only when explicitly requested (e.g. after Builder save)
  if (force) {
    ta.value = nwShcState.pagesJsonText || '';
  }

  // Parse the current text to keep Builder in sync (without rewriting user formatting)
  const parsed = nwParsePagesJson(ta.value);
  nwShcState.pagesJsonText = ta.value;
  nwShcState.pagesJsonValid = parsed.ok;

  if (parsed.ok) {
    // IMPORTANT: keep config.pages in sync with the Builder/JSON editor.
    // Otherwise pages exist only in the editor draft and will not be saved
    // to the adapter – the SmartHome VIS would stay empty.
    nwShcState.pagesDraft = parsed.pages;
    if (nwShcState.config) nwShcState.config.pages = parsed.pages;

    // Keep selection if possible
    if (!nwShcState.pagesUi.selectedId && nwShcState.pagesDraft.length) {
      nwShcState.pagesUi.selectedId = nwShcState.pagesDraft[0].id;
      nwShcState.pagesUi.isNew = false;
    }

    if (nwShcState.pagesUi.selectedId && !nwShcState.pagesDraft.some((p) => p.id === nwShcState.pagesUi.selectedId)) {
      nwShcState.pagesUi.selectedId = nwShcState.pagesDraft.length ? nwShcState.pagesDraft[0].id : null;
      nwShcState.pagesUi.isNew = false;
    }
  }

  nwPagesRenderStatus(parsed);
  nwPagesRenderTabs();
  nwPagesRenderList();
  nwPagesRenderEditor();
}
/**
 * Code-Teil: nwPagesRenderStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesRenderStatus(parsed) {
  const st = document.getElementById('nw-pages-status');
  if (!st) return;

  // Always show parser errors
  if (!parsed || !parsed.ok) {
    st.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
    st.classList.add('nw-config-status--error');
    st.textContent = parsed && parsed.error ? parsed.error : 'Ungültiges JSON';
    return;
  }

  // If user explicitly set a message (dirty/ok), keep it.
  if (st.classList.contains('nw-config-status--dirty') || st.classList.contains('nw-config-status--ok')) {
    return;
  }

  // Otherwise show a compact OK hint
  st.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  st.classList.add('nw-config-status--ok');
  st.textContent = `OK ✅ (${(parsed.pages || []).length} Seiten)`;
}
/**
 * Code-Teil: nwPagesRenderTabs
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesRenderTabs() {
  const tabs = document.getElementById('nw-pages-tabs');
  const wrapBuilder = document.getElementById('nw-pages-builder');
  const wrapJson = document.getElementById('nw-pages-json-wrap');

  if (tabs) {
    tabs.querySelectorAll('button[data-tab]').forEach((btn) => {
      const tab = btn.getAttribute('data-tab');
      if (tab === nwShcState.pagesUi.tab) btn.classList.add('nw-tab--active');
      else btn.classList.remove('nw-tab--active');
    });
  }

  if (wrapBuilder) wrapBuilder.style.display = (nwShcState.pagesUi.tab === 'builder') ? '' : 'none';
  if (wrapJson) wrapJson.style.display = (nwShcState.pagesUi.tab === 'json') ? '' : 'none';
}
/**
 * Code-Teil: nwPagesBuildTree
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesBuildTree(pages) {
  const byId = new Map((pages || []).map((p) => [p.id, p]));
  const children = new Map();
  const roots = [];

  for (const p of pages || []) {
    const pid = p.parentId && byId.has(p.parentId) && p.parentId !== p.id ? p.parentId : '';
    if (pid) {
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid).push(p);
    } else {
      roots.push(p);
    }
  }

  /**
   * Code-Teil: Arrow-Funktion `sortFn`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: sortFn
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const sortFn = (a, b) => (a.order || 0) - (b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'de');
  roots.sort(sortFn);
  for (const [k, arr] of children.entries()) arr.sort(sortFn);

  return { byId, children, roots };
}
/**
 * Code-Teil: nwPagesFormatFilterSummary
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesFormatFilterSummary(p) {
  if (!p) return '';
  const parts = [];
  if (Array.isArray(p.roomIds) && p.roomIds.length) parts.push(`Rooms:${p.roomIds.length}`);
  if (Array.isArray(p.funcIds) && p.funcIds.length) parts.push(`Functions:${p.funcIds.length}`);
  if (Array.isArray(p.types) && p.types.length) parts.push(`Types:${p.types.length}`);
  if (p.favoritesOnly) parts.push('⭐');
  parts.push(`Mode:${p.viewMode || 'rooms'}`);
  if (p.parentId) parts.push(`Parent:${p.parentId}`);
  return parts.join(' • ');
}
/**
 * Code-Teil: nwPagesRenderList
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesRenderList() {
  const listEl = document.getElementById('nw-pages-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft : [];
  if (!pages.length) {
    const empty = document.createElement('div');
    empty.className = 'nw-config-hint';
    empty.textContent = 'Keine Seiten definiert. Klicke auf „+ Neu“ oder nutze „Standard-Seiten“. '; 
    listEl.appendChild(empty);
    return;
  }

  const { children, roots } = nwPagesBuildTree(pages);

  /**
   * Code-Teil: Arrow-Funktion `render`
   * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: render
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const render = (arr, depth) => {
    for (const p of arr) {
      const row = document.createElement('div');
      row.className = 'nw-page-row' + (nwShcState.pagesUi.selectedId === p.id && !nwShcState.pagesUi.isNew ? ' nw-page-row--active' : '');
      row.style.paddingLeft = `${10 + Math.max(0, depth) * 14}px`;

      const icon = document.createElement('div');
      icon.className = 'nw-page-row__icon';
      icon.textContent = p.icon || '•';

      const meta = document.createElement('div');
      meta.className = 'nw-page-row__meta';
      meta.innerHTML = `<div class="nw-page-row__title">${p.title || p.id}</div><div class="nw-page-row__sub">${p.id} • ${nwPagesFormatFilterSummary(p)}</div>`;

      const badge = document.createElement('div');
      badge.className = 'nw-page-row__badge';
      badge.textContent = String(p.order ?? 0);
      badge.title = 'Order';

      row.appendChild(icon);
      row.appendChild(meta);
      row.appendChild(badge);

      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an row. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      row.addEventListener('click', () => {
        nwShcState.pagesUi.selectedId = p.id;
        nwShcState.pagesUi.isNew = false;
        nwShcState.pagesUi.idManuallyEdited = false;
        nwPagesRenderList();
        nwPagesRenderEditor();
      });

      listEl.appendChild(row);

      if (children.has(p.id)) {
        render(children.get(p.id), depth + 1);
      }
    }
  };

  render(roots, 0);
}
/**
 * Code-Teil: nwSetSelectOptions
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetSelectOptions(selectEl, options, selectedValues, includeEmpty = false, emptyLabel = '(keiner)') {
  if (!selectEl) return;
  const sel = new Set((selectedValues || []).map(String));

  selectEl.innerHTML = '';

  if (includeEmpty) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = emptyLabel;
    selectEl.appendChild(opt);
  }

  (options || []).forEach((o) => {
    const opt = document.createElement('option');
    opt.value = String(o.value);
    opt.textContent = String(o.label);
    if (sel.has(opt.value)) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
/**
 * Code-Teil: nwGetMultiSelectValues
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetMultiSelectValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.options).filter((o) => o.selected).map((o) => o.value);
}
/**
 * Code-Teil: nwPagesGetSelectedPage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesGetSelectedPage() {
  if (nwShcState.pagesUi.isNew) return null;
  return (nwShcState.pagesDraft || []).find((p) => p.id === nwShcState.pagesUi.selectedId) || null;
}
/**
 * Code-Teil: nwPagesGetNewSeed
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesGetNewSeed() {
  // If user clicked “+ Neu” while a page is selected, use that as a starting point
  const base = nwShcState.pagesUi.newSeed;
  if (base && typeof base === 'object') return base;
  return null;
}
/**
 * Code-Teil: nwPagesBuildEditorModel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesBuildEditorModel() {
  if (nwShcState.pagesUi.isNew) {
    const seed = nwPagesGetNewSeed();
    return nwNormalizePageObject(seed || { id: '', title: '', icon: '', viewMode: 'rooms', order: 0 }, 0, '');
  }

  const p = nwPagesGetSelectedPage();
  return p ? nwNormalizePageObject(p, 0, p.id) : nwNormalizePageObject({ id: '', title: '', icon: '', viewMode: 'rooms', order: 0 }, 0, '');
}
/**
 * Code-Teil: nwPagesRenderEditor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesRenderEditor() {
  const titleEl = document.getElementById('nw-page-title');
  const iconEl = document.getElementById('nw-page-icon');
  const idEl = document.getElementById('nw-page-id');
  const parentEl = document.getElementById('nw-page-parent');
  const viewModeEl = document.getElementById('nw-page-viewmode');
  const orderEl = document.getElementById('nw-page-order');
  const roomsEl = document.getElementById('nw-page-rooms');
  const funcsEl = document.getElementById('nw-page-functions');
  const typesEl = document.getElementById('nw-page-types');
  const sortByEl = document.getElementById('nw-page-sortby');
  const cardSizeEl = document.getElementById('nw-page-cardsize');
  const groupByTypeEl = document.getElementById('nw-page-groupbytype');
  const favOnlyEl = document.getElementById('nw-page-favonly');
  const hrefEl = document.getElementById('nw-page-href');
  const delBtn = document.getElementById('nw-page-delete');
  const editorTitle = document.getElementById('nw-page-editor-title');

  if (!titleEl || !idEl) return;

  const model = nwPagesBuildEditorModel();

  if (editorTitle) {
    editorTitle.textContent = nwShcState.pagesUi.isNew ? 'Neue Seite' : `Seite: ${model.title || model.id}`;
  }

  // Parent options
  const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft : [];
  const flat = [];
  const { children, roots } = nwPagesBuildTree(pages);
  /**
   * Code-Teil: Arrow-Funktion `walk`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: walk
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const walk = (arr, depth) => {
    for (const p of arr) {
      if (!nwShcState.pagesUi.isNew && p.id === nwShcState.pagesUi.selectedId) {
        // exclude self
      } else {
        flat.push({ value: p.id, label: `${'—'.repeat(depth)} ${p.title || p.id} (${p.id})` });
      }
      if (children.has(p.id)) walk(children.get(p.id), depth + 1);
    }
  };
  walk(roots, 0);
  nwSetSelectOptions(parentEl, flat, [model.parentId || ''], true, '(keiner)');

  // Rooms / Functions options
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms.slice() : [];
  rooms.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'de'));
  nwSetSelectOptions(roomsEl, rooms.map((r) => ({ value: r.id, label: `${r.title || r.id} (${r.id})` })), model.roomIds || []);

  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions.slice() : [];
  funcs.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'de'));
  nwSetSelectOptions(funcsEl, funcs.map((f) => ({ value: f.id, label: `${f.title || f.id} (${f.id})` })), model.funcIds || []);

  // Types options
  const typeSet = new Set();
  const common = ['light', 'shutter', 'rtr', 'plug', 'switch', 'sensor', 'camera', 'meter'];
  common.forEach((t) => typeSet.add(t));

  (nwShcState.config.devices || []).forEach((d) => {
    if (d && d.type) typeSet.add(String(d.type));
  });

  (pages || []).forEach((p) => {
    (p.types || []).forEach((t) => typeSet.add(String(t)));
  });
  const typeList = Array.from(typeSet).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'de'));
  nwSetSelectOptions(typesEl, typeList.map((t) => ({ value: t, label: t })), model.types || []);

  // Set primitive fields
  titleEl.value = model.title || '';

  // Icon select options
  if (iconEl && iconEl.tagName === 'SELECT') {
    nwSetSelectOptions(iconEl, NW_PAGE_ICON_OPTIONS, [model.icon || ''], false);
  }
  // If config contains a custom icon, keep it selectable
  if (iconEl && iconEl.tagName === 'SELECT' && model.icon && !Array.from(iconEl.options).some(o => o.value === model.icon)) {
    const opt = document.createElement('option');
    opt.value = model.icon;
    opt.textContent = `${model.icon} (Custom)`;
    iconEl.appendChild(opt);
  }
  iconEl.value = model.icon || '';
  idEl.value = model.id || '';
  if (viewModeEl) viewModeEl.value = model.viewMode || 'rooms';
  if (orderEl) orderEl.value = String(model.order ?? 0);

  if (sortByEl) sortByEl.value = model.sortBy || 'order';
  if (cardSizeEl) cardSizeEl.value = model.cardSize || 'auto';
  if (groupByTypeEl) groupByTypeEl.checked = !!model.groupByType;
  if (favOnlyEl) favOnlyEl.checked = !!model.favoritesOnly;
  if (hrefEl) hrefEl.value = model.href || '';

  if (delBtn) delBtn.disabled = nwShcState.pagesUi.isNew || !nwShcState.pagesUi.selectedId;
}
/**
 * Code-Teil: nwPagesSlugify
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesSlugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}
/**
 * Code-Teil: nwPagesSetEditorStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesSetEditorStatus(msg, kind = 'dirty') {
  const el = document.getElementById('nw-page-editor-status');
  if (!el) return;
  el.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  if (kind === 'ok') el.classList.add('nw-config-status--ok');
  else if (kind === 'error') el.classList.add('nw-config-status--error');
  else el.classList.add('nw-config-status--dirty');
  el.textContent = msg || '';
}
/**
 * Code-Teil: nwPagesSaveFromEditor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesSaveFromEditor() {
  const titleEl = document.getElementById('nw-page-title');
  const iconEl = document.getElementById('nw-page-icon');
  const idEl = document.getElementById('nw-page-id');
  const parentEl = document.getElementById('nw-page-parent');
  const viewModeEl = document.getElementById('nw-page-viewmode');
  const orderEl = document.getElementById('nw-page-order');
  const roomsEl = document.getElementById('nw-page-rooms');
  const funcsEl = document.getElementById('nw-page-functions');
  const typesEl = document.getElementById('nw-page-types');
  const sortByEl = document.getElementById('nw-page-sortby');
  const cardSizeEl = document.getElementById('nw-page-cardsize');
  const groupByTypeEl = document.getElementById('nw-page-groupbytype');
  const favOnlyEl = document.getElementById('nw-page-favonly');
  const hrefEl = document.getElementById('nw-page-href');

  const raw = {
    id: String(idEl ? idEl.value : '').trim(),
    title: String(titleEl ? titleEl.value : '').trim(),
    icon: String(iconEl ? iconEl.value : '').trim(),
    parentId: String(parentEl ? parentEl.value : '').trim(),
    viewMode: String(viewModeEl ? viewModeEl.value : 'rooms').trim(),
    order: Number.isFinite(+String(orderEl ? orderEl.value : '0')) ? +String(orderEl ? orderEl.value : '0') : 0,
    roomIds: nwGetMultiSelectValues(roomsEl),
    funcIds: nwGetMultiSelectValues(funcsEl),
    types: nwGetMultiSelectValues(typesEl),
    favoritesOnly: !!(favOnlyEl && favOnlyEl.checked),
    href: String(hrefEl ? hrefEl.value : '').trim(),
    sortBy: String(sortByEl ? sortByEl.value : 'order').trim(),
    cardSize: String(cardSizeEl ? cardSizeEl.value : 'auto').trim(),
    groupByType: !!(groupByTypeEl && groupByTypeEl.checked),
  };

  if (!raw.id) {
    nwPagesSetEditorStatus('ID fehlt 🙈', 'error');
    return;
  }

  const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft.slice() : [];
  const prevId = nwShcState.pagesUi.isNew ? null : nwShcState.pagesUi.selectedId;

  // Unique ID
  const idExists = pages.some((p) => p.id === raw.id && p.id !== prevId);
  if (idExists) {
    nwPagesSetEditorStatus('ID ist bereits vergeben.', 'error');
    return;
  }

  // Parent validation
  if (raw.parentId && raw.parentId === raw.id) {
    nwPagesSetEditorStatus('Parent darf nicht die eigene ID sein.', 'error');
    return;
  }

  if (raw.parentId && !pages.some((p) => p.id === raw.parentId)) {
    nwPagesSetEditorStatus('Parent-ID existiert nicht.', 'error');
    return;
  }

  // Cycle check
  if (raw.parentId) {
    const byId = new Map(pages.map((p) => [p.id, p]));
    let cur = byId.get(raw.parentId);
    let safety = 50;
    while (cur && safety-- > 0) {
      if (cur.parentId === raw.id) {
        nwPagesSetEditorStatus('Cycle erkannt (Parent-Kette führt zurück).', 'error');
        return;
      }
      cur = cur.parentId ? byId.get(cur.parentId) : null;
    }
  }

  const normalized = nwNormalizePageObject(raw, 0, raw.id);

  // Upsert
  let next = pages.filter((p) => p.id !== prevId);

  // If ID changed: update children parentId references
  if (prevId && prevId !== raw.id) {
    next = next.map((p) => (p.parentId === prevId ? { ...p, parentId: raw.id } : p));
  }

  next.push(normalized);

  // Sort for stable JSON
  next.sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'de'));

  nwShcState.pagesDraft = next;
  nwShcState.pagesUi.selectedId = normalized.id;
  nwShcState.pagesUi.isNew = false;
  nwShcState.pagesUi.newSeed = null;

  // Update JSON text
  nwShcState.pagesJsonText = JSON.stringify(nwShcState.pagesDraft, null, 2);
  const ta = document.getElementById('nw-pages-json');
  if (ta) ta.value = nwShcState.pagesJsonText;

  nwMarkDirty(true);
  nwPagesSetEditorStatus('Gespeichert ✅ (noch nicht in Adapter übernommen)', 'ok');
  nwRenderPagesEditor(true);
}
/**
 * Code-Teil: nwPagesDeleteSelected
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPagesDeleteSelected() {
  const id = nwShcState.pagesUi.selectedId;
  if (!id) return;

  if (!confirm(`Seite „${id}“ wirklich löschen?

Kinder werden automatisch auf Root gehoben.`)) return;

  const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft.slice() : [];
  const next = pages
    .filter((p) => p.id !== id)
    .map((p) => (p.parentId === id ? { ...p, parentId: '' } : p));

  nwShcState.pagesDraft = next;
  nwShcState.pagesUi.selectedId = next.length ? next[0].id : null;
  nwShcState.pagesUi.isNew = false;

  nwShcState.pagesJsonText = JSON.stringify(nwShcState.pagesDraft, null, 2);
  const ta = document.getElementById('nw-pages-json');
  if (ta) ta.value = nwShcState.pagesJsonText;

  nwMarkDirty(true);
  nwPagesSetEditorStatus('Gelöscht ✅ (noch nicht in Adapter übernommen)', 'ok');
  nwRenderPagesEditor(true);
}

/* --- Datensicherung (wie App-Center) --- */
/**
 * Code-Teil: nwSetBackupStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetBackupStatus(msg, type) {
  const el = document.getElementById('nw-backup-status');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--error', 'nw-config-status--dirty');
  const cls = (type === 'ok') ? 'nw-config-status--ok' : (type === 'error') ? 'nw-config-status--error' : 'nw-config-status--dirty';
  el.classList.add(cls);
}
/**
 * Code-Teil: nwBackupExport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwBackupExport() {
  nwSetBackupStatus('Exportiere Backup …', null);
  const res = await fetch('/api/installer/backup/export', { cache: 'no-store' });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : 'Backup export fehlgeschlagen');
  const payload = data.payload || {};
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  nwDownloadTextFile(`nexowatt_backup_${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json');
  nwSetBackupStatus('Backup exportiert ✅', 'ok');
}
/**
 * Code-Teil: nwBackupImport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwBackupImport(file, mode) {
  if (!file) return;
  nwSetBackupStatus('Importiere Backup …', null);
  const txt = await file.text();
  const payload = JSON.parse(txt);

  const res = await fetch('/api/installer/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: mode || 'merge', payload }),
  });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : 'Backup import fehlgeschlagen');
  nwSetBackupStatus('Backup importiert ✅ (bitte Seite neu laden)', 'ok');
}
/**
 * Code-Teil: nwBackupRestoreFromUserdata
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwBackupRestoreFromUserdata() {
  if (!confirm('Wirklich Restore aus 0_userdata durchführen? (überschreibt die aktuelle Konfiguration)')) return;
  nwSetBackupStatus('Lade Backup aus 0_userdata …', null);
  const res = await fetch('/api/installer/backup/userdata', { cache: 'no-store' });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : '0_userdata Restore fehlgeschlagen');

  const payload = data.payload || {};
  const res2 = await fetch('/api/installer/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'replace', payload }),
  });
  const data2 = await res2.json();
  if (!data2 || !data2.ok) throw new Error((data2 && data2.error) ? data2.error : 'Restore import fehlgeschlagen');
  nwSetBackupStatus('Restore durchgeführt ✅ (bitte Seite neu laden)', 'ok');
}
/**
 * Code-Teil: nwExportSmartHomeConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwExportSmartHomeConfig() {
  const cfg = nwShcState.config;
  if (!cfg) {
    nwSetStatus('Keine Konfiguration zum Exportieren geladen.', 'error');
    return;
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const v = (typeof cfg.version === 'number') ? ('_cfg' + cfg.version) : '';
  const filename = 'nexowatt-smarthome-config' + v + '_' + stamp + '.json';

  const out = nwNormalizeImportedSmartHomeConfig(cfg);
  const text = JSON.stringify(out, null, 2);
  nwDownloadTextFile(filename, text, 'application/json');
  nwSetStatus('Export erstellt: ' + filename, 'ok');
}
/**
 * Code-Teil: nwImportSmartHomeConfigFromFile
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwImportSmartHomeConfigFromFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    if (!text || !text.trim()) {
      nwSetStatus('Import fehlgeschlagen: Datei ist leer.', 'error');
      return;
    }
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      nwSetStatus('Import fehlgeschlagen: ungültiges JSON.', 'error');
      return;
    }

    // Accept either raw config or wrapper {config: {...}}
    const cfgRaw = (obj && obj.config && typeof obj.config === 'object') ? obj.config : obj;
    const normalized = nwNormalizeImportedSmartHomeConfig(cfgRaw);

    const summary =
      'Räume: ' + normalized.rooms.length + '\n' +
      'Funktionen: ' + normalized.functions.length + '\n' +
      'Geräte: ' + normalized.devices.length + '\n\n' +
      'Import anwenden? (bestehende Konfig wird im Editor ersetzt – erst nach „Speichern“ wird es aktiv)';
    const ok = confirm(summary);
    if (!ok) {
      nwSetStatus('Import abgebrochen.', 'error');
      return;
    }

    nwShcState.config = normalized;
    // sync pages editor
    try {
      nwShcState.pagesJsonText = JSON.stringify(nwShcState.config.pages || [], null, 2);
      nwShcState.pagesJsonValid = true;
    } catch (_e) {
      nwShcState.pagesJsonText = '[]';
      nwShcState.pagesJsonValid = false;
    }
    nwNormalizeRoomFunctionOrder();
    nwNormalizeDeviceOrder();
    nwMarkDirty(true);
    nwRenderAll();
    nwRenderPagesEditor();

    nwSetStatus('Import geladen. Bitte speichern, um ihn zu übernehmen.', 'ok');

    // Optional: offer immediate save for fast rollout
    const saveNow = confirm('Jetzt direkt speichern und anwenden?');
    if (saveNow) {
      await nwSaveSmartHomeConfig();
    }
  } catch (e) {
    console.error('Import error:', e);
    nwSetStatus('Import fehlgeschlagen: Ausnahme.', 'error');
  }
}
/**
 * Code-Teil: nwSaveSmartHomeConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwSaveSmartHomeConfig() {
  if (!nwShcState.config) return;

  // Pages JSON must be valid (otherwise SmartHome navigation can break)
  const pagesRes = nwParsePagesJson(nwShcState.pagesJsonText);
  if (!pagesRes.ok) {
    nwShcState.pagesJsonValid = false;
    nwRenderPagesEditor();
    nwSetStatus('Speichern abgebrochen: Pages JSON ungültig – ' + pagesRes.error, 'error');
    return;
  }
  nwShcState.pagesJsonValid = true;
  nwShcState.config.pages = pagesRes.pages;

  // Validate immediately before saving (installer feedback)
  nwRunValidationNow();
  const v = nwShcState.validation || { errors: [], warnings: [] };
  const errCount = Array.isArray(v.errors) ? v.errors.length : 0;
  if (errCount > 0) {
    const ok = confirm(
      'Es gibt ' + errCount + ' Fehler in der SmartHomeConfig.\n' +
      'Das kann dazu führen, dass Kacheln nicht funktionieren oder fehlen.\n\n' +
      'Trotzdem speichern?'
    );
    if (!ok) {
      nwSetStatus('Speichern abgebrochen (bitte Fehler beheben)', 'error');
      return;
    }
  }
  try {
    const payload = { config: nwShcState.config };
    const res = await fetch('/api/smarthome/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('SmartHomeConfig save failed:', res.status, res.statusText);
      nwSetStatus('Speichern fehlgeschlagen (' + res.status + ')', 'error');
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!data || !data.ok || !data.config) {
      console.error('SmartHomeConfig save payload invalid', data);
      nwSetStatus('Speichern fehlgeschlagen (Antwort ungültig)', 'error');
      return;
    }
    nwShcState.config = data.config;
    nwShcState.originalJson = JSON.stringify(data.config);
    // sync pages editor with stored config
    try {
      nwShcState.pagesJsonText = JSON.stringify(nwShcState.config.pages || [], null, 2);
      nwShcState.pagesJsonValid = true;
    } catch (_e) {}
    nwMarkDirty(false);
    if (data.persisted) {
      nwSetStatus('Konfiguration gespeichert', 'ok');
    } else {
      nwSetStatus('Konfiguration im Adapter aktualisiert (Persistenz ggf. nicht verfügbar)', 'ok');
    }
    // Nach dem Speichern neu rendern, um evtl. Normalisierungen abzubilden
    nwRenderAll();
    nwRenderPagesEditor();
  } catch (e) {
    console.error('SmartHomeConfig save error:', e);
    nwSetStatus('Ausnahme beim Speichern', 'error');
  }
}
/**
 * Code-Teil: nwReloadSmartHomeConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwReloadSmartHomeConfig() {
  nwSetStatus('Lade Konfiguration …', null);
  const cfg = await nwFetchSmartHomeConfig();
  if (!cfg) return;
  nwShcState.config = {
    // version 2 adds optional "pages" for SmartHome VIS sidebar
    version: typeof cfg.version === 'number' ? cfg.version : 2,
    floors: Array.isArray(cfg.floors) ? cfg.floors.map(f => Object.assign({}, f)) : [],
    rooms: Array.isArray(cfg.rooms) ? cfg.rooms.map(r => Object.assign({}, r)) : [],
    functions: Array.isArray(cfg.functions) ? cfg.functions.map(f => Object.assign({}, f)) : [],
    devices: Array.isArray(cfg.devices) ? cfg.devices.map(d => Object.assign({}, d)) : [],
    scenes: Array.isArray(cfg.scenes) ? cfg.scenes.map(s => Object.assign({}, s)) : [],
    pages: Array.isArray(cfg.pages) ? cfg.pages.map(p => Object.assign({}, p)) : [],
    meta: (cfg.meta && typeof cfg.meta === 'object') ? Object.assign({}, cfg.meta) : {},
  };

  // Initialize pages JSON editor
  try {
    nwShcState.pagesJsonText = JSON.stringify(nwShcState.config.pages || [], null, 2);
    nwShcState.pagesJsonValid = true;
  } catch (_e) {
    nwShcState.pagesJsonText = '[]';
    nwShcState.pagesJsonValid = false;
  }

  nwNormalizeFloorOrder();
  nwNormalizeRoomFunctionOrder();
  nwNormalizeDeviceOrder();
  nwShcState.originalJson = JSON.stringify(nwShcState.config);
  nwMarkDirty(false);
  nwRenderAll();
  nwRenderPagesEditor();
  nwRunValidationNow();
  nwSetStatus('Konfiguration geladen', 'ok');
}
/**
 * Code-Teil: nwRenderAll
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderAll() {
  const cfg = nwShcState.config || { rooms: [], functions: [], devices: [] };
  nwRenderRoomsEditor(cfg.rooms || []);
  nwRenderFunctionsEditor(cfg.functions || []);
  nwRenderDevicesEditor(cfg.devices || [], cfg.rooms || [], cfg.functions || []);

  // Home tiles / editor rendering (non-destructive)
  nwRenderShcfgShell();

  // After re-rendering, re-apply validation highlights / list
  nwScheduleValidation();
}


/* ============================================================ */
/* SmartHome Config – UI Shell (Home tiles / Drag&Drop / Classic) */
/* ============================================================ */
/**
 * Code-Teil: nwShcfgSetMode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgSetMode(mode, opts = {}) {
  nwEnsureShcfgUiState();
  const allowed = ['home', 'builder', 'timers', 'scenes', 'detect', 'classic'];
  if (!allowed.includes(mode)) return;

  nwShcState.ui.mode = mode;
  // Persist only the modern modes. Classic is intentionally not persisted.
  try {
    if (mode === 'home' || mode === 'builder' || mode === 'timers' || mode === 'scenes' || mode === 'detect') {
      localStorage.setItem('nw-shcfg-ui-mode', mode);
    }
  } catch (_) {}

  // Optional scroll target for Classic
  if (mode === 'classic' && opts.scrollToId) {
    // delay to ensure it's visible
    setTimeout(() => {
      const el = document.getElementById(opts.scrollToId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  nwRenderShcfgShell();
}
/**
 * Code-Teil: nwShcfgEnterBuilder
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgEnterBuilder(opts = {}) {
  nwEnsureShcfgUiState();
  const builder = nwShcState.ui.builder;
  builder.view = opts.view || 'rooms';
  builder.currentRoomId = opts.currentRoomId || null;
  builder.tab = opts.tab || (builder.view === 'roomDevices' ? 'devices' : 'building');

  // default selection
  const cfg = nwShcState.config || { rooms: [], devices: [] };
  const rooms = cfg.rooms || [];
  const devices = cfg.devices || [];
  if (builder.view === 'rooms') {
    if (!builder.selected || builder.selected.kind !== 'room') {
      if (rooms.length) builder.selected = { kind: 'room', id: rooms[0].id };
    }
  } else if (builder.view === 'roomDevices') {
    const roomId = builder.currentRoomId || (rooms[0] && rooms[0].id) || null;
    builder.currentRoomId = roomId;
    const roomDevs = devices.filter(d => d.roomId === roomId);
    if (!builder.selected || builder.selected.kind !== 'device') {
      if (roomDevs.length) builder.selected = { kind: 'device', id: roomDevs[0].id };
      else builder.selected = roomId ? { kind: 'room', id: roomId } : null;
    }
  }

  nwShcfgSetMode('builder');
}
/**
 * Code-Teil: nwInitShcfgShellUi
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwInitShcfgShellUi() {
  nwEnsureShcfgUiState();

  const btnBuilding = document.getElementById('nw-shcfg-tile-building');
  const btnDetect = document.getElementById('nw-shcfg-tile-detect');
  const btnLogic = document.getElementById('nw-shcfg-tile-logic');
  const btnTimers = document.getElementById('nw-shcfg-tile-timers');
  const btnScenes = document.getElementById('nw-shcfg-tile-scenes');
  const btnBackup = document.getElementById('nw-shcfg-tile-backup');
  const btnClassic = document.getElementById('nw-shcfg-tile-classic');

  if (btnBuilding) btnBuilding.addEventListener('click', () => nwShcfgEnterBuilder({ view: 'rooms', tab: 'building' }));
  if (btnDetect) btnDetect.addEventListener('click', async () => {
    nwShcfgSetMode('detect');
    if (!nwShcState.detector.loaded && !nwShcState.detector.loading) {
      await nwLoadTypeDetectorSuggestions(false);
      nwRenderShcfgShell();
    }
  });
  if (btnLogic) btnLogic.addEventListener('click', () => window.location.href = '/logic.html');
  if (btnTimers) btnTimers.addEventListener('click', () => nwShcfgSetMode('timers'));
  if (btnScenes) btnScenes.addEventListener('click', () => nwShcfgSetMode('scenes'));
  if (btnBackup) btnBackup.addEventListener('click', () => nwShcfgSetMode('backup'));
  if (btnClassic) btnClassic.addEventListener('click', () => nwShcfgSetMode('classic'));

  const builderBack = document.getElementById('nw-shcfg-builder-back');
  const builderSave = document.getElementById('nw-shcfg-builder-save');
  const builderOpenClassic = document.getElementById('nw-shcfg-builder-open-classic');
  if (builderBack) builderBack.addEventListener('click', () => nwShcfgSetMode('home'));
  if (builderOpenClassic) builderOpenClassic.addEventListener('click', () => nwShcfgSetMode('classic'));
  if (builderSave) builderSave.addEventListener('click', () => nwSaveSmartHomeConfig());

  const backupBack = document.getElementById('nw-shcfg-backup-back');
  const backupOpenClassic = document.getElementById('nw-shcfg-backup-open-classic');
  if (backupBack) backupBack.addEventListener('click', () => nwShcfgSetMode('home'));
  if (backupOpenClassic) backupOpenClassic.addEventListener('click', () => nwShcfgSetMode('classic'));

  const detectBack = document.getElementById('nw-shcfg-detect-back');
  const detectReload = document.getElementById('nw-shcfg-detect-reload');
  const detectSave = document.getElementById('nw-shcfg-detect-save');
  const detectOpenClassic = document.getElementById('nw-shcfg-detect-open-classic');
  if (detectBack) detectBack.addEventListener('click', () => nwShcfgSetMode('home'));
  if (detectOpenClassic) detectOpenClassic.addEventListener('click', () => nwShcfgSetMode('classic'));
  if (detectReload) detectReload.addEventListener('click', async () => {
    await nwLoadTypeDetectorSuggestions(true);
    nwRenderShcfgShell();
  });
  if (detectSave) detectSave.addEventListener('click', async () => {
    await nwSaveSmartHomeConfig();
    nwRenderShcfgShell();
  });

  const timersBack = document.getElementById('nw-shcfg-timers-back');
  const timersOpenLogic = document.getElementById('nw-shcfg-timers-open-logic');
  const timersReload = document.getElementById('nw-shcfg-timers-reload');
  const timersSave = document.getElementById('nw-shcfg-timers-save');
  if (timersBack) timersBack.addEventListener('click', () => nwShcfgSetMode('home'));
  if (timersOpenLogic) timersOpenLogic.addEventListener('click', () => window.location.href = '/logic.html');
  if (timersReload) timersReload.addEventListener('click', async () => {
    await nwLoadTimersModule(true);
    await nwLoadLogicClocksModule(true);
    nwRenderShcfgShell();
  });
  if (timersSave) timersSave.addEventListener('click', async () => {
    await nwSaveTimersModule();
    await nwSaveLogicClocksModule();
    nwRenderShcfgShell();
  });

  const clocksAdd = document.getElementById('nw-shcfg-clocks-add');
  if (clocksAdd) clocksAdd.addEventListener('click', () => {
    nwAddLogicClock();
    nwRenderShcfgShell();
  });

  const scenesBack = document.getElementById('nw-shcfg-scenes-back');
  const scenesOpenLogic = document.getElementById('nw-shcfg-scenes-open-logic');
  const scenesAdd = document.getElementById('nw-shcfg-scenes-add');
  const scenesSave = document.getElementById('nw-shcfg-scenes-save');
  if (scenesBack) scenesBack.addEventListener('click', () => nwShcfgSetMode('home'));
  if (scenesOpenLogic) scenesOpenLogic.addEventListener('click', () => window.location.href = '/logic.html');
  if (scenesAdd) scenesAdd.addEventListener('click', () => {
    nwAddScene();
    nwRenderShcfgShell();
  });
  if (scenesSave) scenesSave.addEventListener('click', async () => {
    await nwSaveSmartHomeConfig();
    nwRenderShcfgShell();
  });

  // Tabs in editor sidebar
  const tabBtns = document.querySelectorAll('#nw-shcfg-builder .nw-shcfg-builder__tab');
  tabBtns.forEach(btn => {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', () => {
      nwEnsureShcfgUiState();
      nwShcState.ui.builder.tab = btn.dataset.nwTab || btn.getAttribute('data-nw-tab') || 'building';
      nwRenderShcfgShell();
    });
  });

  // Initial visibility
  nwRenderShcfgShell();

  // Keep builder layout usable when viewport changes (resizes, devtools, mobile address bar)
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'resize' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('resize', () => {
    try { nwShcfgApplyBuilderSizing(); } catch (_) {}
  });
}
/**
 * Code-Teil: nwShcfgApplyBuilderSizing
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgApplyBuilderSizing() {
  const builder = document.getElementById('nw-shcfg-builder');
  if (!builder || builder.style.display === 'none') return;
  const layout = builder.querySelector('.nw-shcfg-builder__layout');
  if (!layout) return;

  const rect = layout.getBoundingClientRect();
  // Extra breathing room at the bottom of the page (matches .content padding)
  const bottomPad = 16;
  const h = Math.max(360, Math.floor(window.innerHeight - rect.top - bottomPad));
  layout.style.setProperty('--nw-shcfg-layout-h', `${h}px`);
}
/**
 * Code-Teil: nwRenderShcfgShell
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgShell() {
  nwEnsureShcfgUiState();

  const home = document.getElementById('nw-shcfg-home');
  const builder = document.getElementById('nw-shcfg-builder');
  const backup = document.getElementById('nw-shcfg-backup');
  const detect = document.getElementById('nw-shcfg-detect');
  const timers = document.getElementById('nw-shcfg-timers');
  const scenes = document.getElementById('nw-shcfg-scenes');
  const classic = document.getElementById('nw-shcfg-classic');

  if (!home || !builder || !backup || !detect || !timers || !scenes || !classic) return;

  const mode = nwShcState.ui.mode;
  home.style.display = (mode === 'home') ? '' : 'none';
  builder.style.display = (mode === 'builder') ? '' : 'none';
  backup.style.display = (mode === 'backup') ? '' : 'none';
  detect.style.display = (mode === 'detect') ? '' : 'none';
  timers.style.display = (mode === 'timers') ? '' : 'none';
  scenes.style.display = (mode === 'scenes') ? '' : 'none';
  classic.style.display = (mode === 'classic') ? '' : 'none';

  if (mode === 'builder') {
    nwRenderShcfgBuilder();
    // Apply sizing after render so the panels become scrollable (no page scroll needed)
    setTimeout(() => {
      try { nwShcfgApplyBuilderSizing(); } catch (_) {}
    }, 0);
  }

  if (mode === 'detect') {
    nwRenderShcfgDetector();
    if (!nwShcState.detector.loaded && !nwShcState.detector.loading) {
      nwLoadTypeDetectorSuggestions(false)
        .then(() => nwRenderShcfgShell())
        .catch(() => {});
    }
  }

  if (mode === 'timers') {
    nwRenderShcfgTimers();
  }

  if (mode === 'scenes') {
    nwRenderShcfgScenes();
  }
}


/* --- Module: Auto-Erkennung / Vorschläge --- */
/**
 * Code-Teil: nwSetDetectorStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetDetectorStatus(text, kind) {
  const el = byId('nw-shcfg-detect-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--warn', 'nw-config-status--error');
  if (kind === 'ok') el.classList.add('nw-config-status--ok');
  if (kind === 'warn') el.classList.add('nw-config-status--warn');
  if (kind === 'error') el.classList.add('nw-config-status--error');
}
/**
 * Code-Teil: nwLoadTypeDetectorSuggestions
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwLoadTypeDetectorSuggestions(force = false) {
  const det = nwShcState.detector || (nwShcState.detector = {});
  det.loading = true;
  det.error = '';
  nwSetDetectorStatus('Gerätevorschläge werden gelesen…', null);
  try {
    const url = '/api/smarthome/type-detect' + (force ? '?force=1' : '');
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data || data.ok !== true) {
      throw new Error((data && data.error) ? data.error : ('HTTP ' + res.status));
    }
    det.results = Array.isArray(data.suggestions) ? data.suggestions : [];
    det.stats = (data && data.stats && typeof data.stats === 'object') ? data.stats : null;
    det.scannedAt = Number(data && data.scannedAt) || Date.now();
    det.loaded = true;
    det.loading = false;
    const total = (det.stats && Number.isFinite(Number(det.stats.total))) ? Number(det.stats.total) : det.results.length;
    if (total > 0) {
      nwSetDetectorStatus(`${total} Vorschläge geladen. Bitte prüfen und gezielt übernehmen.`, 'ok');
    } else {
      nwSetDetectorStatus('Keine passenden Vorschläge gefunden.', 'warn');
    }
    return det.results;
  } catch (e) {
    det.loading = false;
    det.loaded = true;
    det.error = (e && e.message) ? e.message : String(e);
    nwSetDetectorStatus('Fehler bei der Auto-Erkennung: ' + det.error, 'error');
    return [];
  }
}
/**
 * Code-Teil: nwShcfgGetDetectorAssignment
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgGetDetectorAssignment(suggestionId) {
  const det = nwShcState.detector || (nwShcState.detector = {});
  det.assignments = det.assignments || {};
  if (!det.assignments[suggestionId]) {
    const cfg = nwShcState.config || {};
    const rooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];
    const functions = Array.isArray(cfg.functions) ? cfg.functions : [];
    det.assignments[suggestionId] = {
      roomId: (rooms.length === 1 && rooms[0] && rooms[0].id) ? rooms[0].id : '',
      functionId: (functions.length === 1 && functions[0] && functions[0].id) ? functions[0].id : '',
    };
  }
  return det.assignments[suggestionId];
}
/**
 * Code-Teil: nwShcfgCloneJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgCloneJson(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_e) {
    return fallback;
  }
}
/**
 * Code-Teil: nwShcfgDetectorMatchesFilter
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgDetectorMatchesFilter(suggestion, term) {
  const q = String(term || '').trim().toLowerCase();
  if (!q) return true;
  const parts = [];
  if (suggestion) {
    parts.push(String(suggestion.displayName || ''));
    parts.push(String(suggestion.sourceId || ''));
    parts.push(String(suggestion.sourceName || ''));
    parts.push(String(suggestion.detectorType || ''));
    parts.push(String(suggestion.targetType || ''));
    const states = Array.isArray(suggestion.states) ? suggestion.states : [];
    states.forEach((st) => {
      parts.push(String(st && st.key ? st.key : ''));
      parts.push(String(st && st.id ? st.id : ''));
      parts.push(String(st && st.label ? st.label : ''));
      parts.push(String(st && st.role ? st.role : ''));
    });
  }
  return parts.join(' ').toLowerCase().includes(q);
}
/**
 * Code-Teil: nwImportTypeDetectedSuggestion
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwImportTypeDetectedSuggestion(suggestionId) {
  const det = nwShcState.detector || {};
  const suggestion = Array.isArray(det.results) ? det.results.find((x) => x && x.id === suggestionId) : null;
  if (!suggestion) return;
  if (suggestion.imported) {
    nwSetDetectorStatus('Der Vorschlag wurde bereits übernommen.', 'warn');
    return;
  }
  if (suggestion.alreadyConfigured) {
    nwSetDetectorStatus('Dieser Vorschlag ist bereits im Projekt vorhanden.', 'warn');
    return;
  }
  if (!suggestion.importable || !suggestion.proposal || !suggestion.proposal.type) {
    nwSetDetectorStatus('Dieser Vorschlag kann nicht automatisch übernommen werden und sollte manuell geprüft werden.', 'warn');
    return;
  }

  const assignment = nwShcfgGetDetectorAssignment(suggestionId);
  const proposal = nwShcfgCloneJson(suggestion.proposal || {}, {});
  const type = String(proposal.type || '').trim();
  if (!type) {
    nwSetDetectorStatus('Vorschlag enthält keinen unterstützten Zieltyp.', 'error');
    return;
  }

  const dev = nwAddDeviceFromTemplate(type, {
    roomId: assignment.roomId || '',
    functionId: assignment.functionId || '',
    silent: true,
  });
  if (!dev) {
    nwSetDetectorStatus('Gerät konnte nicht angelegt werden.', 'error');
    return;
  }

  dev.alias = proposal.alias || suggestion.displayName || dev.alias || dev.id;
  dev.roomId = assignment.roomId || null;
  dev.functionId = assignment.functionId || null;
  if (proposal.icon) dev.icon = proposal.icon;
  if (proposal.behavior && typeof proposal.behavior === 'object') {
    dev.behavior = Object.assign({}, dev.behavior || {}, proposal.behavior);
  }
  if (proposal.ui && typeof proposal.ui === 'object') {
    dev.ui = Object.assign({}, dev.ui || {}, proposal.ui);
  }
  if (proposal.io && typeof proposal.io === 'object') {
    dev.io = proposal.io;
  }
  if (Array.isArray(proposal.stations)) dev.stations = proposal.stations;
  if (Array.isArray(proposal.playlists)) dev.playlists = proposal.playlists;

  suggestion.imported = true;
  suggestion.alreadyConfigured = true;
  nwNormalizeDeviceOrder();
  nwMarkDirty(true);
  nwSetDetectorStatus(`„${dev.alias || dev.id}“ als Vorschlag übernommen – bitte speichern.`, 'ok');
  nwRenderAll();
}
/**
 * Code-Teil: nwRenderShcfgDetector
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgDetector() {
  const root = byId('nw-shcfg-detect-root');
  if (!root) return;

  const det = nwShcState.detector || (nwShcState.detector = {});
  const cfg = nwShcState.config || {};
  const rooms = (Array.isArray(cfg.rooms) ? cfg.rooms.slice() : []).sort(nwSortByOrder);
  const functions = (Array.isArray(cfg.functions) ? cfg.functions.slice() : []).sort(nwSortByOrder);
  const results = Array.isArray(det.results) ? det.results.slice() : [];

  root.innerHTML = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'nw-shcfg-detect__toolbar';

  const filterInput = document.createElement('input');
  filterInput.type = 'text';
  filterInput.className = 'nw-config-input';
  filterInput.placeholder = 'Nach Name, Pfad oder Datenpunkt suchen…';
  filterInput.value = det.filterText || '';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an filterInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  filterInput.addEventListener('input', () => {
    det.filterText = filterInput.value || '';
    nwRenderShcfgDetector();
  });
  toolbar.appendChild(filterInput);

  const showConfiguredLabel = document.createElement('label');
  showConfiguredLabel.className = 'nw-shcfg-detect__toggle';
  const showConfigured = document.createElement('input');
  showConfigured.type = 'checkbox';
  showConfigured.checked = !!det.showConfigured;
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an showConfigured. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  showConfigured.addEventListener('change', () => {
    det.showConfigured = !!showConfigured.checked;
    nwRenderShcfgDetector();
  });
  const showConfiguredText = document.createElement('span');
  showConfiguredText.textContent = 'Bereits zugeordnete Vorschläge anzeigen';
  showConfiguredLabel.appendChild(showConfigured);
  showConfiguredLabel.appendChild(showConfiguredText);
  toolbar.appendChild(showConfiguredLabel);

  root.appendChild(toolbar);

  const summary = document.createElement('div');
  summary.className = 'nw-shcfg-detect__summary';
  const stats = det.stats || {};
  const total = Number.isFinite(Number(stats.total)) ? Number(stats.total) : results.length;
  const importable = Number.isFinite(Number(stats.importable)) ? Number(stats.importable) : results.filter((r) => r && r.importable).length;
  const configured = Number.isFinite(Number(stats.configured)) ? Number(stats.configured) : results.filter((r) => r && r.alreadyConfigured).length;
  const filteredResults = results.filter((r) => {
    if (!r) return false;
    if (!det.showConfigured && (r.alreadyConfigured || r.imported)) return false;
    return nwShcfgDetectorMatchesFilter(r, det.filterText || '');
  });

  /**
   * Code-Teil: Arrow-Funktion `mkBadge`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkBadge
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkBadge = (cls, text) => {
    const span = document.createElement('span');
    span.className = 'nw-config-badge ' + cls;
    span.textContent = text;
    return span;
  };
  summary.appendChild(mkBadge('nw-config-badge--auto', `${total} Vorschläge`));
  summary.appendChild(mkBadge('nw-config-badge--ok', `${importable} direkt übernehmbar`));
  if (configured > 0) summary.appendChild(mkBadge('nw-config-badge--warn', `${configured} bereits zugeordnet`));
  if (det.scannedAt) {
    const stamp = new Date(det.scannedAt);
    summary.appendChild(mkBadge('nw-config-badge--idle', `Scan: ${stamp.toLocaleDateString('de-DE')} ${stamp.toLocaleTimeString('de-DE')}`));
  }
  root.appendChild(summary);

  if (det.loading && !results.length) {
    const loading = document.createElement('div');
    loading.className = 'nw-config-empty';
    loading.textContent = 'Gerätevorschläge werden geladen…';
    root.appendChild(loading);
    return;
  }

  if (!filteredResults.length) {
    const empty = document.createElement('div');
    empty.className = 'nw-config-empty';
    empty.textContent = results.length
      ? 'Keine Vorschläge für den aktuellen Filter.'
      : (det.error ? ('Fehler: ' + det.error) : 'Keine passenden Vorschläge gefunden.');
    root.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'nw-shcfg-detect__list';

  filteredResults
    .sort((a, b) => {
      const aConfigured = (a.alreadyConfigured || a.imported) ? 1 : 0;
      const bConfigured = (b.alreadyConfigured || b.imported) ? 1 : 0;
      if (aConfigured !== bConfigured) return aConfigured - bConfigured;
      const aImportable = a.importable ? 1 : 0;
      const bImportable = b.importable ? 1 : 0;
      if (aImportable !== bImportable) return bImportable - aImportable;
      const aCount = Number(a.matchCount || 0);
      const bCount = Number(b.matchCount || 0);
      if (aCount !== bCount) return bCount - aCount;
      return String(a.displayName || '').localeCompare(String(b.displayName || ''), 'de', { sensitivity: 'base', numeric: true });
    })
    .forEach((suggestion) => {
      const card = document.createElement('div');
      card.className = 'nw-config-card nw-shcfg-detect-card';

      const head = document.createElement('div');
      head.className = 'nw-shcfg-detect-card__head';

      const headLeft = document.createElement('div');
      headLeft.className = 'nw-shcfg-detect-card__head-left';

      const title = document.createElement('div');
      title.className = 'nw-config-card__title';
      title.textContent = suggestion.displayName || suggestion.sourceName || suggestion.sourceId || 'Vorschlag';
      headLeft.appendChild(title);

      const path = document.createElement('div');
      path.className = 'nw-shcfg-detect-card__path';
      path.textContent = suggestion.sourceId || '';
      headLeft.appendChild(path);

      const headRight = document.createElement('div');
      headRight.className = 'nw-shcfg-detect-card__badges';
      headRight.appendChild(mkBadge('nw-config-badge--auto', `${nwGetTypeLabel(suggestion.targetType || '')} · ${suggestion.detectorType || '?'}`));
      if (suggestion.imported) headRight.appendChild(mkBadge('nw-config-badge--ok', 'übernommen'));
      else if (suggestion.alreadyConfigured) headRight.appendChild(mkBadge('nw-config-badge--warn', 'bereits im Projekt'));
      else if (!suggestion.importable) headRight.appendChild(mkBadge('nw-config-badge--warn', 'manuell prüfen'));
      if (suggestion.confidence) {
        const confText = suggestion.confidence === 'high' ? 'Passung hoch' : (suggestion.confidence === 'medium' ? 'Passung mittel' : 'Passung basis');
        headRight.appendChild(mkBadge('nw-config-badge--idle', confText));
      }

      head.appendChild(headLeft);
      head.appendChild(headRight);
      card.appendChild(head);

      const meta = document.createElement('div');
      meta.className = 'nw-shcfg-detect-card__meta';
      meta.textContent = `Quelle: ${suggestion.sourceType || 'objekt'} • Gemappte Zustände: ${Number(suggestion.matchCount || 0)}`;
      card.appendChild(meta);

      if (Array.isArray(suggestion.notes) && suggestion.notes.length) {
        const notes = document.createElement('div');
        notes.className = 'nw-shcfg-detect-card__notes';
        suggestion.notes.forEach((note) => {
          const row = document.createElement('div');
          row.className = 'nw-shcfg-detect-card__note';
          row.textContent = '• ' + String(note || '');
          notes.appendChild(row);
        });
        card.appendChild(notes);
      }

      const stateGrid = document.createElement('div');
      stateGrid.className = 'nw-shcfg-detect-card__states';
      (Array.isArray(suggestion.states) ? suggestion.states : []).forEach((st) => {
        if (!st || !st.id) return;
        const cell = document.createElement('div');
        cell.className = 'nw-shcfg-detect-state';

        const k = document.createElement('div');
        k.className = 'nw-shcfg-detect-state__key';
        k.textContent = st.key || 'STATE';
        cell.appendChild(k);

        const sid = document.createElement('div');
        sid.className = 'nw-shcfg-detect-state__id';
        sid.textContent = st.id || '';
        cell.appendChild(sid);

        const smeta = document.createElement('div');
        smeta.className = 'nw-shcfg-detect-state__meta';
        const bits = [];
        if (st.label) bits.push(String(st.label));
        if (st.role) bits.push(String(st.role));
        if (st.type) bits.push(String(st.type));
        if (st.unit) bits.push('[' + String(st.unit) + ']');
        smeta.textContent = bits.join(' • ');
        cell.appendChild(smeta);

        stateGrid.appendChild(cell);
      });
      if (stateGrid.childElementCount) card.appendChild(stateGrid);

      const actions = document.createElement('div');
      actions.className = 'nw-shcfg-detect-card__actions';

      const assignment = nwShcfgGetDetectorAssignment(suggestion.id);

      /**
       * Code-Teil: Arrow-Funktion `mkSelect`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mkSelect
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mkSelect = (labelText, items, value, onChange) => {
        const wrap = document.createElement('label');
        wrap.className = 'nw-shcfg-detect-card__select';

        const label = document.createElement('span');
        label.textContent = labelText;
        wrap.appendChild(label);

        const sel = document.createElement('select');
        sel.className = 'nw-config-select';
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '(später zuordnen)';
        sel.appendChild(emptyOpt);
        items.forEach((it) => {
          if (!it || !it.id) return;
          const opt = document.createElement('option');
          opt.value = it.id;
          opt.textContent = it.name || it.alias || it.id;
          sel.appendChild(opt);
        });
        sel.value = value || '';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        sel.addEventListener('change', () => onChange(sel.value || ''));
        wrap.appendChild(sel);
        return wrap;
      };

      actions.appendChild(mkSelect('Raum', rooms, assignment.roomId || '', (next) => {
        assignment.roomId = next || '';
      }));
      actions.appendChild(mkSelect('Funktion', functions, assignment.functionId || '', (next) => {
        assignment.functionId = next || '';
      }));

      const importBtn = document.createElement('button');
      importBtn.type = 'button';
      importBtn.className = 'nw-config-btn';
      if (suggestion.imported) {
        importBtn.textContent = 'Übernommen';
        importBtn.disabled = true;
      } else if (suggestion.alreadyConfigured) {
        importBtn.textContent = 'Bereits im Projekt';
        importBtn.disabled = true;
      } else if (!suggestion.importable) {
        importBtn.textContent = 'Manuell prüfen';
        importBtn.disabled = true;
      } else {
        importBtn.textContent = 'Übernehmen';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an importBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        importBtn.addEventListener('click', () => nwImportTypeDetectedSuggestion(suggestion.id));
      }
      actions.appendChild(importBtn);

      card.appendChild(actions);
      list.appendChild(card);
    });

  root.appendChild(list);
}


// --- Module: Zeitschaltuhren ---
/**
 * Code-Teil: nwSetTimersStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetTimersStatus(text, kind) {
  const el = byId('nw-shcfg-timers-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--warn', 'nw-config-status--error');
  if (kind === 'ok') el.classList.add('nw-config-status--ok');
  if (kind === 'warn') el.classList.add('nw-config-status--warn');
  if (kind === 'error') el.classList.add('nw-config-status--error');
}

// Timer-Geräteliste: im Installer-Konfigurator soll das auch funktionieren,
// wenn SmartHome im Adapter noch deaktiviert ist ("/api/smarthome/devices" wäre dann leer).
// Daher leiten wir die Geräte direkt aus der SmartHome-Konfiguration ab.
/**
 * Code-Teil: nwShcfgCollectTimerDevicesFromConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgCollectTimerDevicesFromConfig(cfg) {
  const c = cfg || nwShcState.config || {};
  const rooms = Array.isArray(c.rooms) ? c.rooms : [];
  const fns = Array.isArray(c.functions) ? c.functions : [];
  const devicesIn = Array.isArray(c.devices) ? c.devices : [];
  const scenesIn = Array.isArray(c.scenes) ? c.scenes : [];

  const roomById = Object.create(null);
  for (const r of rooms) {
    const id = r && r.id ? String(r.id) : '';
    if (!id) continue;
    roomById[id] = r.name || r.alias || id;
  }

  const fnById = Object.create(null);
  for (const f of fns) {
    const id = f && f.id ? String(f.id) : '';
    if (!id) continue;
    fnById[id] = f.name || f.alias || id;
  }

  const out = [];
  const idSet = new Set();

  for (const d of devicesIn) {
    if (!d || !d.id) continue;
    const id = String(d.id).trim();
    if (!id) continue;
    idSet.add(id);
    const roomName = d.room || roomById[String(d.roomId || '').trim()] || '';
    const fnName = d.function || fnById[String(d.functionId || '').trim()] || '';

    out.push({
      id,
      type: String(d.type || '').trim() || 'switch',
      alias: String(d.alias || d.name || d.title || id).trim() || id,
      room: roomName,
      function: fnName,
      io: (d.io && typeof d.io === 'object') ? d.io : {},
      ui: (d.ui && typeof d.ui === 'object') ? d.ui : {},
      behavior: (d.behavior && typeof d.behavior === 'object') ? d.behavior : {},
    });
  }

  // Szenen (virtuelle Geräte). Achtung: Device-ID kollidiert ggf. mit echten Geräten → Prefix wie im Backend.
  for (const sc of scenesIn) {
    if (!sc || !sc.id) continue;
    const rawId = String(sc.id).trim();
    if (!rawId) continue;
    const id = idSet.has(rawId) ? `scene_${rawId}` : rawId;

    const roomName = sc.room || roomById[String(sc.roomId || '').trim()] || '';
    const fnName = sc.function || fnById[String(sc.functionId || '').trim()] || '';

    out.push({
      id,
      type: 'scene',
      alias: String(sc.alias || sc.name || sc.title || rawId).trim() || rawId,
      room: roomName,
      function: fnName,
      io: {},
      ui: (sc.ui && typeof sc.ui === 'object') ? sc.ui : {},
      behavior: (sc.behavior && typeof sc.behavior === 'object') ? sc.behavior : {},
      sceneId: rawId,
    });
  }

  return out;
}
/**
 * Code-Teil: nwLoadTimersModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwLoadTimersModule(force = false) {
  if (nwShcState.timers.loading) return;
  if (!force && nwShcState.timers.loaded) return;

  nwShcState.timers.loading = true;
  nwSetTimersStatus('Lade Zeitschaltuhren …');
  try {
    // Ensure config is available (even if SmartHome in adapter is still disabled)
    if (!nwShcState.config) {
      const c = await nwFetchSmartHomeConfig();
      if (c) {
        nwShcState.config = nwNormalizeImportedSmartHomeConfig(c);
      }
    }

    const tRes = await fetch('/api/smarthome/timers');
    const tJson = tRes.ok ? await tRes.json() : null;
    const cfg = (tJson && tJson.ok && tJson.config && typeof tJson.config === 'object') ? tJson.config : { version: 1, updatedAt: 0, timers: [] };

    const devices = nwShcfgCollectTimerDevicesFromConfig(nwShcState.config);

    // Only show devices that support timers
    const supported = devices.filter((d) => {
      const type = String((d && d.type) || '').toLowerCase();
      if (!d || !d.id) return false;
      if (d.behavior && d.behavior.readOnly) return false;
      // Added: Jalousie/Rollladen (blind)
      return ['switch', 'dimmer', 'color', 'scene', 'blind'].includes(type);
    });

    const map = {};
    const arr = (cfg && Array.isArray(cfg.timers)) ? cfg.timers : [];
    for (const t of arr) {
      if (!t || !t.deviceId) continue;
      map[String(t.deviceId)] = Object.assign({}, t);
    }

    nwShcState.timers.devices = supported;
    nwShcState.timers.config = cfg;
    nwShcState.timers.map = map;
    nwShcState.timers.loaded = true;
    nwShcState.timers.dirty = false;
    nwSetTimersStatus('Bereit');
  } catch (e) {
    console.warn('Timers load error', e);
    nwSetTimersStatus('Fehler beim Laden der Zeitschaltuhren.', 'error');
  } finally {
    nwShcState.timers.loading = false;
  }
}
/**
 * Code-Teil: nwSaveTimersModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwSaveTimersModule() {
  if (nwShcState.timers.loading) return;
  if (!nwShcState.timers.loaded) await nwLoadTimersModule(true);

  nwSetTimersStatus('Speichere …');
  try {
    const map = nwShcState.timers.map || {};
    const timers = Object.keys(map)
      .map((k) => map[k])
      .filter((t) => t && t.deviceId)
      .map((t) => {
        const out = Object.assign({}, t);
        // normalize
        if (!Array.isArray(out.days) || !out.days.length) out.days = [0, 1, 2, 3, 4, 5, 6];
        out.enabled = !!out.enabled;
        out.onTime = out.onTime ? String(out.onTime) : '';
        out.offTime = out.offTime ? String(out.offTime) : '';
        if (Object.prototype.hasOwnProperty.call(out, 'onLevel')) {
          const v = parseFloat(out.onLevel);
          out.onLevel = Number.isFinite(v) ? v : 100;
        }
        return out;
      });

    const outCfg = {
      version: 1,
      updatedAt: 0,
      timers,
    };

    const res = await fetch('/api/smarthome/timers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: outCfg }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || !data.ok) throw new Error('API error');

    nwShcState.timers.config = data.config || outCfg;
    // re-map
    const newMap = {};
    const arr = (nwShcState.timers.config && Array.isArray(nwShcState.timers.config.timers)) ? nwShcState.timers.config.timers : [];
    for (const t of arr) {
      if (!t || !t.deviceId) continue;
      newMap[String(t.deviceId)] = Object.assign({}, t);
    }
    nwShcState.timers.map = newMap;
    nwShcState.timers.dirty = false;
    nwSetTimersStatus('Gespeichert ✓', 'ok');
  } catch (e) {
    console.warn('Timers save error', e);
    nwSetTimersStatus('Fehler beim Speichern.', 'error');
  }
}
/**
 * Code-Teil: nwRenderShcfgTimers
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgTimers() {
  // 2nd section inside the same tab
  try { nwRenderShcfgLogicClocks(); } catch (_e) {}

  const root = byId('nw-shcfg-timers-root');
  if (!root) return;

  // lazy load
  if (!nwShcState.timers.loaded && !nwShcState.timers.loading) {
    nwLoadTimersModule(false).then(() => {
      nwRenderShcfgShell();
    });
  }

  root.innerHTML = '';

  if (nwShcState.timers.loading && !nwShcState.timers.loaded) {
    const div = document.createElement('div');
    div.className = 'nw-config-hint';
    div.textContent = 'Lade …';
    root.appendChild(div);
    return;
  }

  const devices = nwShcState.timers.devices || [];
  if (!devices.length) {
    const div = document.createElement('div');
    div.className = 'nw-config-hint';
    div.textContent = 'Keine passenden Geräte gefunden (Timer unterstützt: Schalter/Dimmer/Farbe/Szene/Jalousie).';
    root.appendChild(div);
    return;
  }

  // Sort by room + alias
  const sorted = devices.slice().sort((a, b) => {
    const ra = String(a.room || '').localeCompare(String(b.room || ''));
    if (ra !== 0) return ra;
    return String(a.alias || a.id).localeCompare(String(b.alias || b.id));
  });

  for (const dev of sorted) {
    const card = document.createElement('div');
    card.className = 'nw-config-card';

    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = `${dev.alias || dev.id}`;

    const sub = document.createElement('div');
    sub.className = 'nw-config-card__hint';
    const room = dev.room ? ` • ${dev.room}` : '';
    const fn = dev.function ? ` • ${dev.function}` : '';
    sub.textContent = `${String(dev.type || '').toUpperCase()}${room}${fn}`;

    card.appendChild(title);
    card.appendChild(sub);

    // current timer or defaults
    const existing = (nwShcState.timers.map && nwShcState.timers.map[dev.id]) ? Object.assign({}, nwShcState.timers.map[dev.id]) : null;
    const type = String(dev.type || '').toLowerCase();
    const isDimmer = type === 'dimmer';
    const lvlMin = (isDimmer && dev.io && dev.io.level && typeof dev.io.level.min === 'number') ? dev.io.level.min : 0;
    const lvlMax = (isDimmer && dev.io && dev.io.level && typeof dev.io.level.max === 'number') ? dev.io.level.max : 100;

    const timer = existing || {
      deviceId: dev.id,
      enabled: false,
      days: [0, 1, 2, 3, 4, 5, 6],
      onTime: '',
      offTime: '',
      ...(isDimmer ? { onLevel: lvlMax } : {}),
    };

    /**
     * Code-Teil: Arrow-Funktion `markDirty`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: markDirty
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const markDirty = () => {
      nwShcState.timers.map[dev.id] = Object.assign({}, timer);
      nwShcState.timers.dirty = true;
      nwSetTimersStatus('Änderungen nicht gespeichert', 'warn');
    };

    // Enabled
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Aktiv';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const lab = document.createElement('label');
      lab.className = 'nw-config-checklabel';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'nw-config-checkbox';
      cb.checked = !!timer.enabled;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => { timer.enabled = cb.checked; markDirty(); });
      const span = document.createElement('span');
      span.textContent = cb.checked ? 'Ein' : 'Aus';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => { span.textContent = cb.checked ? 'Ein' : 'Aus'; });
      lab.appendChild(cb);
      lab.appendChild(span);
      ctrl.appendChild(lab);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Days
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Tage';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const wrap = document.createElement('div');
      wrap.className = 'nw-sh-timer-days';
      const dayLabels = [
        { d: 1, t: 'Mo' },
        { d: 2, t: 'Di' },
        { d: 3, t: 'Mi' },
        { d: 4, t: 'Do' },
        { d: 5, t: 'Fr' },
        { d: 6, t: 'Sa' },
        { d: 0, t: 'So' },
      ];
      const set = new Set(Array.isArray(timer.days) ? timer.days : []);
      /**
       * Code-Teil: Arrow-Funktion `sync`
       * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: sync
       * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const sync = () => {
        timer.days = Array.from(set);
        timer.days.sort((a, b) => a - b);
      };
      for (const dl of dayLabels) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nw-sh-chip nw-sh-chip--sm' + (set.has(dl.d) ? ' nw-sh-chip--active' : '');
        b.textContent = dl.t;
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        b.addEventListener('click', () => {
          if (set.has(dl.d)) set.delete(dl.d);
          else set.add(dl.d);
          b.classList.toggle('nw-sh-chip--active', set.has(dl.d));
          sync();
          markDirty();
        });
        wrap.appendChild(b);
      }
      sync();
      ctrl.appendChild(wrap);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Times
    {
      const grid = document.createElement('div');
      grid.className = 'nw-sh-timer-grid';

      /**
       * Code-Teil: Arrow-Funktion `mk`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mk
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mk = (labelText, value, onChange) => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-sh-timer-field';
        const l = document.createElement('div');
        l.className = 'nw-sh-timer-field__label';
        l.textContent = labelText;
        const inp = document.createElement('input');
        inp.type = 'time';
        inp.className = 'nw-config-input';
        inp.value = value || '';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        inp.addEventListener('change', () => { onChange(inp.value); markDirty(); });
        wrap.appendChild(l);
        wrap.appendChild(inp);
        return wrap;
      };
      const isBlind = type === 'blind';
      grid.appendChild(mk(isBlind ? 'AUF um' : 'EIN um', timer.onTime, (v) => { timer.onTime = String(v || ''); }));
      grid.appendChild(mk(isBlind ? 'ZU um' : 'AUS um', timer.offTime, (v) => { timer.offTime = String(v || ''); }));
      card.appendChild(grid);
    }

    // Dimmer level
    if (isDimmer) {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Helligkeit (EIN)';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'nw-config-input';
      inp.min = String(lvlMin);
      inp.max = String(lvlMax);
      inp.step = '1';
      inp.value = String(typeof timer.onLevel === 'number' ? timer.onLevel : lvlMax);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      inp.addEventListener('change', () => {
        const v = parseFloat(inp.value);
        timer.onLevel = Number.isFinite(v) ? Math.max(lvlMin, Math.min(lvlMax, v)) : lvlMax;
        inp.value = String(timer.onLevel);
        markDirty();
      });
      ctrl.appendChild(inp);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Delete entry
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = '';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Eintrag löschen';
      del.disabled = !existing;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      del.addEventListener('click', () => {
        delete nwShcState.timers.map[dev.id];
        nwShcState.timers.dirty = true;
        nwSetTimersStatus('Änderungen nicht gespeichert', 'warn');
        nwRenderShcfgShell();
      });
      ctrl.appendChild(del);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    root.appendChild(card);
  }
}


// --- Module: Logik-Uhren (Installer) ---
/**
 * Code-Teil: nwSetLogicClocksStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetLogicClocksStatus(text, kind) {
  const el = byId('nw-shcfg-clocks-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--warn', 'nw-config-status--error');
  if (kind === 'ok') el.classList.add('nw-config-status--ok');
  if (kind === 'warn') el.classList.add('nw-config-status--warn');
  if (kind === 'error') el.classList.add('nw-config-status--error');
}
/**
 * Code-Teil: nwAddLogicClock
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddLogicClock() {
  // Ensure module data exists
  if (!nwShcState.logicClocks) {
    nwShcState.logicClocks = { loaded: true, loading: false, dirty: false, config: { version: 1, updatedAt: 0, clocks: [] }, map: {} };
  }
  if (!nwShcState.logicClocks.map) nwShcState.logicClocks.map = {};

  const id = `clock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  nwShcState.logicClocks.map[id] = {
    id,
    name: 'Neue Uhr',
    enabled: true,
    days: [0, 1, 2, 3, 4, 5, 6],
    fromTime: '06:00',
    toTime: '22:00',
  };
  nwShcState.logicClocks.dirty = true;
  nwSetLogicClocksStatus('Änderungen nicht gespeichert', 'warn');
}
/**
 * Code-Teil: nwLoadLogicClocksModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwLoadLogicClocksModule(force = false) {
  if (nwShcState.logicClocks.loading) return;
  if (!force && nwShcState.logicClocks.loaded) return;

  nwShcState.logicClocks.loading = true;
  nwSetLogicClocksStatus('Lade Logik‑Uhren …');
  try {
    const res = await fetch('/api/smarthome/logic-clocks');
    const json = res.ok ? await res.json() : null;
    const cfg = (json && json.ok && json.config && typeof json.config === 'object') ? json.config : { version: 1, updatedAt: 0, clocks: [] };

    const map = {};
    const arr = (cfg && Array.isArray(cfg.clocks)) ? cfg.clocks : [];
    for (const c of arr) {
      if (!c || !c.id) continue;
      map[String(c.id)] = Object.assign({}, c);
    }

    nwShcState.logicClocks.config = cfg;
    nwShcState.logicClocks.map = map;
    nwShcState.logicClocks.loaded = true;
    nwShcState.logicClocks.dirty = false;
    nwSetLogicClocksStatus('Bereit');
  } catch (e) {
    console.warn('Logic clocks load error', e);
    nwSetLogicClocksStatus('Fehler beim Laden der Logik‑Uhren.', 'error');
  } finally {
    nwShcState.logicClocks.loading = false;
  }
}
/**
 * Code-Teil: nwSaveLogicClocksModule
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwSaveLogicClocksModule() {
  if (nwShcState.logicClocks.loading) return;
  if (!nwShcState.logicClocks.loaded) await nwLoadLogicClocksModule(true);

  nwSetLogicClocksStatus('Speichere …');
  try {
    const map = nwShcState.logicClocks.map || {};
    const clocks = Object.keys(map)
      .map((k) => map[k])
      .filter((c) => c && c.id)
      .map((c) => {
        const out = Object.assign({}, c);
        out.id = String(out.id);
        out.name = String(out.name || out.id);
        out.enabled = !!out.enabled;
        if (!Array.isArray(out.days) || !out.days.length) out.days = [0, 1, 2, 3, 4, 5, 6];
        out.fromTime = out.fromTime ? String(out.fromTime) : '';
        out.toTime = out.toTime ? String(out.toTime) : '';
        return out;
      });

    const outCfg = { version: 1, updatedAt: 0, clocks };
    const res = await fetch('/api/smarthome/logic-clocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: outCfg }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || !data.ok) throw new Error('API error');

    nwShcState.logicClocks.config = data.config || outCfg;
    const newMap = {};
    const arr = (nwShcState.logicClocks.config && Array.isArray(nwShcState.logicClocks.config.clocks)) ? nwShcState.logicClocks.config.clocks : [];
    for (const c of arr) {
      if (!c || !c.id) continue;
      newMap[String(c.id)] = Object.assign({}, c);
    }
    nwShcState.logicClocks.map = newMap;
    nwShcState.logicClocks.dirty = false;
    nwSetLogicClocksStatus('Gespeichert ✓', 'ok');
  } catch (e) {
    console.warn('Logic clocks save error', e);
    nwSetLogicClocksStatus('Fehler beim Speichern.', 'error');
  }
}
/**
 * Code-Teil: nwRenderShcfgLogicClocks
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgLogicClocks() {
  const root = byId('nw-shcfg-clocks-root');
  if (!root) return;

  // lazy load
  if (!nwShcState.logicClocks.loaded && !nwShcState.logicClocks.loading) {
    nwLoadLogicClocksModule(false).then(() => nwRenderShcfgShell());
  }

  root.innerHTML = '';

  if (nwShcState.logicClocks.loading && !nwShcState.logicClocks.loaded) {
    const div = document.createElement('div');
    div.className = 'nw-config-hint';
    div.textContent = 'Lade …';
    root.appendChild(div);
    return;
  }

  const map = nwShcState.logicClocks.map || {};
  const ids = Object.keys(map).sort((a, b) => a.localeCompare(b));

  if (!ids.length) {
    const div = document.createElement('div');
    div.className = 'nw-config-hint';
    div.textContent = 'Noch keine Logik‑Uhr angelegt. Klicke oben auf "+ Neue Uhr".';
    root.appendChild(div);
    return;
  }

  /**
   * Code-Teil: Arrow-Funktion `markDirty`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: markDirty
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const markDirty = () => {
    nwShcState.logicClocks.dirty = true;
    nwSetLogicClocksStatus('Änderungen nicht gespeichert', 'warn');
  };

  const dayLabels = [
    { d: 1, t: 'Mo' },
    { d: 2, t: 'Di' },
    { d: 3, t: 'Mi' },
    { d: 4, t: 'Do' },
    { d: 5, t: 'Fr' },
    { d: 6, t: 'Sa' },
    { d: 0, t: 'So' },
  ];

  for (const id of ids) {
    const clock = map[id];
    if (!clock) continue;

    const card = document.createElement('div');
    card.className = 'nw-config-card';

    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = clock.name || clock.id || id;

    const hint = document.createElement('div');
    hint.className = 'nw-config-card__hint';
    hint.textContent = `ID: ${clock.id || id} • DP: …smarthome.logicClocks.${clock.id || id}.active`;

    card.appendChild(title);
    card.appendChild(hint);

    // Name
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Name';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'nw-config-input';
      inp.value = clock.name || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      inp.addEventListener('input', () => {
        clock.name = inp.value;
        title.textContent = clock.name || clock.id || id;
        markDirty();
      });
      ctrl.appendChild(inp);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Enabled
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Aktiv';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const lab = document.createElement('label');
      lab.className = 'nw-config-checklabel';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'nw-config-checkbox';
      cb.checked = (clock.enabled !== false);
      const span = document.createElement('span');
      span.textContent = cb.checked ? 'Ein' : 'Aus';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => {
        clock.enabled = cb.checked;
        span.textContent = cb.checked ? 'Ein' : 'Aus';
        markDirty();
      });
      lab.appendChild(cb);
      lab.appendChild(span);
      ctrl.appendChild(lab);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Days
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Tage';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const wrap = document.createElement('div');
      wrap.className = 'nw-sh-timer-days';
      const set = new Set(Array.isArray(clock.days) ? clock.days : []);
      /**
       * Code-Teil: Arrow-Funktion `sync`
       * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: sync
       * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const sync = () => {
        clock.days = Array.from(set);
        clock.days.sort((a, b) => a - b);
      };
      for (const dl of dayLabels) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nw-sh-chip nw-sh-chip--sm' + (set.has(dl.d) ? ' nw-sh-chip--active' : '');
        b.textContent = dl.t;
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        b.addEventListener('click', () => {
          if (set.has(dl.d)) set.delete(dl.d);
          else set.add(dl.d);
          b.classList.toggle('nw-sh-chip--active', set.has(dl.d));
          sync();
          markDirty();
        });
        wrap.appendChild(b);
      }
      sync();
      ctrl.appendChild(wrap);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Time window
    {
      const grid = document.createElement('div');
      grid.className = 'nw-sh-timer-grid';
      /**
       * Code-Teil: Arrow-Funktion `mk`
       * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: mk
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const mk = (labelText, value, onChange) => {
        const wrap = document.createElement('div');
        wrap.className = 'nw-sh-timer-field';
        const l = document.createElement('div');
        l.className = 'nw-sh-timer-field__label';
        l.textContent = labelText;
        const inp = document.createElement('input');
        inp.type = 'time';
        inp.className = 'nw-config-input';
        inp.value = value || '';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        inp.addEventListener('change', () => { onChange(inp.value); markDirty(); });
        wrap.appendChild(l);
        wrap.appendChild(inp);
        return wrap;
      };

      grid.appendChild(mk('Ein ab', clock.fromTime, (v) => { clock.fromTime = String(v || ''); }));
      grid.appendChild(mk('Aus ab', clock.toTime, (v) => { clock.toTime = String(v || ''); }));
      card.appendChild(grid);
    }

    // Delete
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = '';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Eintrag löschen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      del.addEventListener('click', () => {
        delete nwShcState.logicClocks.map[id];
        nwShcState.logicClocks.dirty = true;
        nwSetLogicClocksStatus('Änderungen nicht gespeichert', 'warn');
        nwRenderShcfgShell();
      });
      ctrl.appendChild(del);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    root.appendChild(card);
  }
}


// --- Module: Szenen ---
/**
 * Code-Teil: nwSetScenesStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetScenesStatus(text, kind) {
  const el = byId('nw-shcfg-scenes-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.remove('nw-config-status--ok', 'nw-config-status--warn', 'nw-config-status--error');
  if (kind === 'ok') el.classList.add('nw-config-status--ok');
  if (kind === 'warn') el.classList.add('nw-config-status--warn');
  if (kind === 'error') el.classList.add('nw-config-status--error');
}
/**
 * Code-Teil: nwAddScene
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddScene() {
  const cfg = nwShcState.config || (nwShcState.config = { rooms: [], functions: [], devices: [], scenes: [], pages: [], meta: {} });
  cfg.scenes = Array.isArray(cfg.scenes) ? cfg.scenes : [];

  const id = `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const order = cfg.scenes.length;
  cfg.scenes.push({
    id,
    alias: 'Neue Szene',
    icon: '🎬',
    roomId: '',
    functionId: '',
    floorId: '',
    order,
    ui: { size: 'm' },
    behavior: { favorite: false },
    actions: [],
  });
  nwSetScenesStatus('Änderungen nicht gespeichert', 'warn');
}
/**
 * Code-Teil: nwRenderShcfgScenes
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgScenes() {
  const root = byId('nw-shcfg-scenes-root');
  if (!root) return;

  const cfg = nwShcState.config || {};
  const rooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];
  const funcs = Array.isArray(cfg.functions) ? cfg.functions : [];
  const devices = Array.isArray(cfg.devices) ? cfg.devices : [];
  const scenes = Array.isArray(cfg.scenes) ? cfg.scenes : [];

  root.innerHTML = '';

  if (!scenes.length) {
    const div = document.createElement('div');
    div.className = 'nw-config-hint';
    div.textContent = 'Noch keine Szene angelegt. Klicke oben auf "+ Neue Szene".';
    root.appendChild(div);
    return;
  }
  const sorted = scenes.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const sc of sorted) {
    const card = document.createElement('div');
    card.className = 'nw-config-card';

    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = sc.alias || sc.id;
    const hint = document.createElement('div');
    hint.className = 'nw-config-card__hint';
    hint.textContent = `ID: ${sc.id}`;
    card.appendChild(title);
    card.appendChild(hint);

    /**
     * Code-Teil: Arrow-Funktion `markDirty`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: markDirty
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const markDirty = () => {
      nwSetScenesStatus('Änderungen nicht gespeichert', 'warn');
    };

    // Alias
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Name';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'nw-config-input';
      inp.value = sc.alias || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      inp.addEventListener('input', () => {
        sc.alias = inp.value;
        title.textContent = sc.alias || sc.id;
        markDirty();
      });
      ctrl.appendChild(inp);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Icon
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Icon';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'nw-config-input';
      inp.value = sc.icon || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      inp.addEventListener('input', () => { sc.icon = inp.value; markDirty(); });
      ctrl.appendChild(inp);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Room
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Raum';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const sel = document.createElement('select');
      sel.className = 'nw-config-select';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = '—';
      sel.appendChild(opt0);
      for (const r of rooms) {
        const o = document.createElement('option');
        o.value = r.id;
        o.textContent = r.name || r.id;
        sel.appendChild(o);
      }
      sel.value = sc.roomId || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      sel.addEventListener('change', () => { sc.roomId = sel.value; markDirty(); });
      ctrl.appendChild(sel);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Function
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Funktion';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const sel = document.createElement('select');
      sel.className = 'nw-config-select';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = '—';
      sel.appendChild(opt0);
      for (const f of funcs) {
        const o = document.createElement('option');
        o.value = f.id;
        o.textContent = f.name || f.id;
        sel.appendChild(o);
      }
      sel.value = sc.functionId || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      sel.addEventListener('change', () => { sc.functionId = sel.value; markDirty(); });
      ctrl.appendChild(sel);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Favorite
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = 'Favorit';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const lab = document.createElement('label');
      lab.className = 'nw-config-checklabel';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'nw-config-checkbox';
      cb.checked = !!(sc.behavior && sc.behavior.favorite);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => {
        sc.behavior = sc.behavior || {};
        sc.behavior.favorite = cb.checked;
        markDirty();
      });
      const span = document.createElement('span');
      span.textContent = cb.checked ? 'Ja' : 'Nein';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an cb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      cb.addEventListener('change', () => { span.textContent = cb.checked ? 'Ja' : 'Nein'; });
      lab.appendChild(cb);
      lab.appendChild(span);
      ctrl.appendChild(lab);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    // Actions
    {
      const actionsTitle = document.createElement('div');
      actionsTitle.className = 'nw-config-card__title';
      actionsTitle.style.marginTop = '10px';
      actionsTitle.textContent = 'Aktionen';
      card.appendChild(actionsTitle);

      const wrap = document.createElement('div');
      wrap.className = 'nw-shcfg-actions';

      sc.actions = Array.isArray(sc.actions) ? sc.actions : [];

      /**
       * Code-Teil: Arrow-Funktion `renderActionRow`
       * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: renderActionRow
       * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const renderActionRow = (a, idx) => {
        const row = document.createElement('div');
        row.className = 'nw-shcfg-actionrow';

        const currentKind = String(a.kind || 'switch');
        const isNestedScene = currentKind === 'scene';
        const devSel = document.createElement('select');
        devSel.className = 'nw-config-select';
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = isNestedScene ? 'Kein Gerät nötig' : 'Gerät…';
        devSel.appendChild(opt0);
        for (const d of devices) {
          const o = document.createElement('option');
          o.value = d.id;
          o.textContent = d.alias || d.id;
          devSel.appendChild(o);
        }
        devSel.value = isNestedScene ? '' : (a.deviceId || '');
        devSel.disabled = isNestedScene;
        devSel.title = isNestedScene ? 'Verschachtelte Szenen benötigen kein Zielgerät.' : 'Zielgerät der Aktion';
        devSel.addEventListener('change', () => { a.deviceId = devSel.value; markDirty(); });

        const kindSel = document.createElement('select');
        kindSel.className = 'nw-config-select';
        const kinds = [
          { v: 'switch', t: 'Schalten (Ein/Aus)' },
          { v: 'level', t: 'Helligkeit / Position' },
          { v: 'color', t: 'RGB-Farbe (#RRGGBB)' },
          { v: 'white', t: 'Weißkanal' },
          { v: 'colorTemperature', t: 'Farbtemperatur (K)' },
          { v: 'cover', t: 'Rollladen Auf/Ab/Stop/Position' },
          { v: 'coverTilt', t: 'Lamellenposition' },
          { v: 'rtrSetpoint', t: 'Klima Solltemperatur' },
          { v: 'climatePower', t: 'Klima Ein/Aus' },
          { v: 'climateMode', t: 'Klima Betriebsart' },
          { v: 'climateFan', t: 'Klima Lüfterstufe' },
          { v: 'climateSwing', t: 'Klima Swing' },
          { v: 'player', t: 'Player Transport' },
          { v: 'playerVolume', t: 'Player Lautstärke' },
          { v: 'playerSeek', t: 'Player Position' },
          { v: 'playerMute', t: 'Player Mute' },
          { v: 'playerPower', t: 'Player Power' },
          { v: 'playerShuffle', t: 'Player Shuffle' },
          { v: 'playerRepeat', t: 'Player Repeat' },
          { v: 'playerStation', t: 'Player Sender' },
          { v: 'playerPlaylist', t: 'Player Playlist' },
          { v: 'playerTts', t: 'Player Sprachausgabe' },
          { v: 'value', t: 'Wertgeber schreiben' },
          { v: 'scene', t: 'Weitere Szene ausführen' },
        ];
        for (const k of kinds) {
          const o = document.createElement('option');
          o.value = k.v;
          o.textContent = k.t;
          kindSel.appendChild(o);
        }
        kindSel.value = currentKind;
        kindSel.addEventListener('change', () => {
          a.kind = kindSel.value;
          if (a.kind === 'scene') {
            a.deviceId = '';
            const first = scenes.find((candidate) => candidate && candidate.id !== sc.id);
            a.value = first ? first.id : '';
          } else if (a.kind === 'switch' || a.kind === 'climatePower' || a.kind === 'playerMute' || a.kind === 'playerPower') {
            a.value = true;
          } else if (a.kind === 'cover') a.value = 'up';
          else if (a.kind === 'player') a.value = 'play';
          else if (a.value === undefined || a.value === null) a.value = '';
          markDirty();
          nwRenderShcfgShell();
        });

        let valueControl;
        if (currentKind === 'scene') {
          const sceneSel = document.createElement('select');
          sceneSel.className = 'nw-config-select';
          const empty = document.createElement('option');
          empty.value = '';
          empty.textContent = 'Zielszene…';
          sceneSel.appendChild(empty);
          for (const candidate of scenes) {
            if (!candidate || candidate.id === sc.id) continue;
            const option = document.createElement('option');
            option.value = candidate.id;
            option.textContent = candidate.alias || candidate.id;
            sceneSel.appendChild(option);
          }
          sceneSel.value = (a.value === undefined || a.value === null) ? '' : String(a.value);
          sceneSel.addEventListener('change', () => { a.value = sceneSel.value; markDirty(); });
          valueControl = sceneSel;
        } else if (['switch', 'climatePower', 'playerMute', 'playerPower'].includes(currentKind)) {
          const boolSel = document.createElement('select');
          boolSel.className = 'nw-config-select';
          for (const [value, text] of [['true', 'Ein / Ja'], ['false', 'Aus / Nein']]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            boolSel.appendChild(option);
          }
          boolSel.value = String(a.value === false || String(a.value).toLowerCase() === 'false' ? 'false' : 'true');
          boolSel.addEventListener('change', () => { a.value = boolSel.value === 'true'; markDirty(); });
          valueControl = boolSel;
        } else if (currentKind === 'cover') {
          const coverSel = document.createElement('select');
          coverSel.className = 'nw-config-select';
          for (const [value, text] of [['up', 'Auf'], ['down', 'Ab'], ['stop', 'Stop'], ['0', 'Position 0 %'], ['100', 'Position 100 %']]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            coverSel.appendChild(option);
          }
          coverSel.value = String(a.value ?? 'up');
          coverSel.addEventListener('change', () => {
            const raw = coverSel.value;
            a.value = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : raw;
            markDirty();
          });
          valueControl = coverSel;
        } else if (currentKind === 'player') {
          const playerSel = document.createElement('select');
          playerSel.className = 'nw-config-select';
          for (const [value, text] of [['play', 'Play'], ['pause', 'Pause'], ['stop', 'Stop'], ['next', 'Nächster Titel'], ['prev', 'Vorheriger Titel']]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            playerSel.appendChild(option);
          }
          playerSel.value = String(a.value ?? 'play');
          playerSel.addEventListener('change', () => { a.value = playerSel.value; markDirty(); });
          valueControl = playerSel;
        } else {
          const input = document.createElement(currentKind === 'playerTts' ? 'textarea' : 'input');
          if (input.tagName === 'INPUT') input.type = 'text';
          input.className = 'nw-config-input';
          input.placeholder = currentKind === 'color'
            ? '#RRGGBB'
            : (currentKind === 'rtrSetpoint' ? 'z. B. 21,5' : 'Wert');
          input.value = (a.value === undefined || a.value === null) ? '' : String(a.value);
          input.addEventListener('input', () => { a.value = input.value; markDirty(); });
          valueControl = input;
        }

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'nw-config-btn nw-config-btn--ghost';
        delBtn.textContent = '✕';
        delBtn.title = 'Entfernen';
        delBtn.addEventListener('click', () => {
          sc.actions.splice(idx, 1);
          markDirty();
          nwRenderShcfgShell();
        });

        row.appendChild(devSel);
        row.appendChild(kindSel);
        row.appendChild(valueControl);
        row.appendChild(delBtn);
        return row;
      };

      for (let i = 0; i < sc.actions.length; i++) {
        wrap.appendChild(renderActionRow(sc.actions[i], i));
      }

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'nw-config-btn nw-config-btn--ghost';
      addBtn.textContent = '+ Aktion';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an addBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      addBtn.addEventListener('click', () => {
        sc.actions.push({ deviceId: '', kind: 'switch', value: true });
        markDirty();
        nwRenderShcfgShell();
      });

      const testBtn = document.createElement('button');
      testBtn.type = 'button';
      testBtn.className = 'nw-config-btn nw-config-btn--ghost';
      testBtn.textContent = '▶ Test';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an testBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      testBtn.addEventListener('click', async () => {
        try {
          nwSetScenesStatus('Führe Szene aus …');
          const res = await fetch('/api/smarthome/scene/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sc.id }),
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          if (!data || !data.ok) throw new Error('API');
          const ok = data.result && data.result.ok;
          nwSetScenesStatus(ok ? 'Szene ausgeführt ✓' : 'Szene ausgeführt (mit Fehlern)', ok ? 'ok' : 'warn');
        } catch (e) {
          console.warn('Scene test error', e);
          nwSetScenesStatus('Fehler beim Ausführen.', 'error');
        }
      });

      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '10px';
      btnRow.style.marginTop = '10px';
      btnRow.appendChild(addBtn);
      btnRow.appendChild(testBtn);

      card.appendChild(wrap);
      card.appendChild(btnRow);
    }

    // Delete scene
    {
      const row = document.createElement('div');
      row.className = 'nw-config-row';
      const lbl = document.createElement('div');
      lbl.className = 'nw-config-row__label';
      lbl.textContent = '';
      const ctrl = document.createElement('div');
      ctrl.className = 'nw-config-row__ctrl';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'nw-config-btn nw-config-btn--ghost';
      del.textContent = 'Szene löschen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      del.addEventListener('click', () => {
        const idx = cfg.scenes.indexOf(sc);
        if (idx >= 0) cfg.scenes.splice(idx, 1);
        markDirty();
        nwRenderShcfgShell();
      });
      ctrl.appendChild(del);
      row.appendChild(lbl);
      row.appendChild(ctrl);
      card.appendChild(row);
    }

    root.appendChild(card);
  }
}

const NW_SHCFG_BUILDER_DEVICE_TEMPLATES = [
  // Licht
  { id: 'dimmer', type: 'dimmer', group: 'Licht', name: 'Dimmer', icon: '3d-bulb', meta: 'Helligkeit' },
  { id: 'dimmer_rgb', type: 'color', group: 'Licht', name: 'Dimmer (RGB / RGBW)', icon: '3d-bulb', meta: 'Farbe + Helligkeit', capabilities: { brightness: true, rgb: true, white: true, colorTemperature: true } },
  { id: 'dimmer_tw', type: 'dimmer', group: 'Licht', name: 'Dimmer (Tunable White)', icon: '3d-bulb', meta: 'Weißton + Helligkeit', capabilities: { brightness: true, colorTemperature: true } },
  { id: 'hue_lights', type: 'color', group: 'Licht', name: 'Hue Leuchten', icon: '3d-bulb', meta: 'Farbe + Helligkeit', capabilities: { brightness: true, rgb: true, white: true, colorTemperature: true } },

  // System
  { id: 'switch', type: 'switch', group: 'System', name: 'Schalter', icon: '3d-toggle', meta: 'Ein/Aus' },
  { id: 'button_press_release', type: 'switch', group: 'System', name: 'Taster (Drücken/Loslassen)', icon: '3d-toggle', meta: 'Momentary', behavior: { commandMode: 'momentary', pulseMs: 250 }, capabilities: { momentary: true } },
  { id: 'button_toggle', type: 'switch', group: 'System', name: 'Taster (Ein/Aus)', icon: '3d-toggle', meta: 'Toggle', behavior: { commandMode: 'toggle' } },
  { id: 'url_call', type: 'widget', group: 'System', name: 'URL-Aufruf', icon: '3d-globe', meta: 'URL öffnen', behavior: { readOnly: true }, capabilities: { openUrl: true } },
  { id: 'iot_trigger', type: 'switch', group: 'System', name: 'Auslöser für IoT', icon: 'bolt', meta: 'Trigger / Event', behavior: { commandMode: 'momentary', pulseMs: 250 }, capabilities: { momentary: true } },
  { id: 'widget', type: 'widget', group: 'System', name: 'Widget', icon: '3d-grid', meta: 'Freies Element' },

  // Kamera
  { id: 'ip_camera', type: 'camera', group: 'Kamera', name: 'IP Kamera', icon: '3d-camera', meta: 'Stream / Snapshot' },

  // Audio
  { id: 'audio', type: 'player', group: 'Audio', name: 'Audiosteuerung', icon: '3d-speaker', meta: 'Play/Pause/Lautstärke' },
  { id: 'audio_sonos', type: 'player', group: 'Audio', name: 'Audiosteuerung (Sonos)', icon: '3d-speaker', meta: 'Sonos Player' },
  { id: 'audio_tts', type: 'player', group: 'Audio', name: 'Audiosteuerung mit TTS', icon: '3d-speaker', meta: 'Text-to-Speech', capabilities: { tts: true } },

  // Beschattung
  { id: 'blind', type: 'blind', group: 'Beschattung', name: 'Rollladen / Jalousie', icon: '3d-blinds', meta: 'Hoch/Runter/Stop' },

  // Klima
  { id: 'heat_cool', type: 'rtr', group: 'Klima', name: 'Heizen und Kühlen', icon: '3d-thermostat', meta: 'Soll/Ist' },
  { id: 'aircon', type: 'rtr', group: 'Klima', name: 'Klimaanlage', icon: '3d-fan', meta: 'Kühlen/Heizen' },
  { id: 'sauna_temp', type: 'sensor', group: 'Klima', name: 'Saunatemperatur', icon: '3d-thermostat', meta: 'Temperatur' },

  // Szenen
  { id: 'scene_remote', type: 'scene', group: 'Szenen', name: 'Szenennebenstelle', icon: '3d-scene', meta: 'Scene Remote' },
  { id: 'scene_set', type: 'scene', group: 'Szenen', name: 'Szenenset', icon: '3d-scene', meta: 'Mehrere Szenen' },
  { id: 'scene_template', type: 'scene', group: 'Szenen', name: 'Szenenvorlage', icon: '3d-scene', meta: 'Vorlage / Button' },

  // Status / Messwerte
  { id: 'status_binary', type: 'sensor', group: 'Status / Messwerte', name: 'Statusanzeige Binär', icon: '3d-sensor', meta: '0/1' },
  { id: 'status_decimal', type: 'sensor', group: 'Status / Messwerte', name: 'Statusanzeige Dezimal', icon: '3d-sensor', meta: 'Zahl' },
  { id: 'status_signed', type: 'sensor', group: 'Status / Messwerte', name: 'Statusanzeige mit Vorzeichen', icon: '3d-sensor', meta: 'Signed' },
  { id: 'status_unsigned', type: 'sensor', group: 'Status / Messwerte', name: 'Statusanzeige ohne Vorzeichen', icon: '3d-sensor', meta: 'Unsigned' },
  { id: 'status_text', type: 'sensor', group: 'Status / Messwerte', name: 'Statusanzeige Text', icon: '3d-sensor', meta: 'Text' },
  { id: 'value_32bit_signed', type: 'sensor', writableValue: true, group: 'Status / Messwerte', name: '32-Bit Wertgeber mit Vorzeichen', icon: '3d-meter', meta: 'int32' },
  { id: 'value_32bit_unsigned', type: 'sensor', writableValue: true, group: 'Status / Messwerte', name: '32-Bit Wertgeber ohne Vorzeichen', icon: '3d-meter', meta: 'uint32' },
  { id: 'value_8bit_unsigned', type: 'sensor', writableValue: true, group: 'Status / Messwerte', name: '8-Bit Wertgeber 0…255', icon: '3d-meter', meta: 'uint8' },
  { id: 'value_8bit_signed', type: 'sensor', writableValue: true, group: 'Status / Messwerte', name: '8-Bit Wertgeber -128…127', icon: '3d-meter', meta: 'int8' },
  { id: 'value_decimal', type: 'sensor', writableValue: true, group: 'Status / Messwerte', name: 'Dezimalwertgeber', icon: '3d-meter', meta: 'float' },
  { id: 'value_percent', type: 'sensor', writableValue: true, group: 'Status / Messwerte', name: 'Prozentwertgeber', icon: '3d-meter', meta: '0…100' },
  { id: 'value_temperature', type: 'sensor', writableValue: true, group: 'Status / Messwerte', name: 'Temperaturwertgeber', icon: '3d-thermostat', meta: '°C' },
];

const NW_SHCFG_DND_MARKER = 'nw-shcfg:';
/**
 * Code-Teil: nwShcfgDragSet
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgDragSet(e, payload) {
  // Store payload in-memory as fallback because some browsers don't expose getData() during dragover.
  try {
    nwEnsureShcfgUiState();
    if (nwShcState.ui.builder) {
      nwShcState.ui.builder.dragPayload = payload;
      nwShcState.ui.builder.dragging = true;
    }
  } catch (_) {}

  const dt = e.dataTransfer;
  if (!dt) return;

  dt.effectAllowed = 'copyMove';

  const raw = NW_SHCFG_DND_MARKER + JSON.stringify(payload);
  try { dt.setData('text/plain', raw); } catch (_) {}
  try { dt.setData('application/json', raw); } catch (_) {}
}
/**
 * Code-Teil: nwShcfgDragClear
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgDragClear() {
  try {
    nwEnsureShcfgUiState();
    if (nwShcState.ui.builder) {
      nwShcState.ui.builder.dragPayload = null;
      nwShcState.ui.builder.dragging = false;
    }
  } catch (_) {}
}
/**
 * Code-Teil: nwShcfgDragGet
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgDragGet(e) {
  const dt = e.dataTransfer;
  let raw = '';

  if (dt) {
    try {
      raw = dt.getData('application/json') || dt.getData('text/plain') || '';
    } catch (_) {
      raw = '';
    }
  }

  if (raw) {
    if (raw.startsWith(NW_SHCFG_DND_MARKER)) raw = raw.slice(NW_SHCFG_DND_MARKER.length);
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object' && p.kind) return p;
    } catch (_) {}
  }

  // Fallback: in-memory payload (needed for dragover in some browsers)
  try {
    nwEnsureShcfgUiState();
    return (nwShcState.ui.builder && nwShcState.ui.builder.dragPayload) ? nwShcState.ui.builder.dragPayload : null;
  } catch (_) {
    return null;
  }
}
/**
 * Code-Teil: nwRenderShcfgBuilder
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgBuilder() {
  nwEnsureShcfgUiState();
  const cfg = nwShcState.config;

  const lib = document.getElementById('nw-shcfg-builder-lib');
  const work = document.getElementById('nw-shcfg-builder-work');
  const props = document.getElementById('nw-shcfg-builder-props');
  if (!lib || !work || !props) return;

  // Tabs active state
  const builderUi = nwShcState.ui.builder;
  const tabBtns = document.querySelectorAll('#nw-shcfg-builder .nw-shcfg-builder__tab');
  tabBtns.forEach(btn => {
    const key = btn.dataset.nwTab || btn.getAttribute('data-nw-tab');
    btn.classList.toggle('is-active', key === builderUi.tab);
  });

  if (!cfg) {
    lib.textContent = 'Lade Konfiguration…';
    work.textContent = 'Lade Konfiguration…';
    props.textContent = 'Lade Konfiguration…';
    return;
  }

  nwRenderShcfgBuilderLib(lib);
  nwRenderShcfgBuilderWorkspace(work);
  nwRenderShcfgBuilderProps(props);
}
/**
 * Code-Teil: nwShcfgLibGroup
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgLibGroup(titleText, items, { forceOpen = false } = {}) {
  nwEnsureShcfgUiState();

  const details = document.createElement('details');
  details.className = 'nw-shcfg-libgroup';

  const collapsed = !!(nwShcState.ui && nwShcState.ui.builder && nwShcState.ui.builder.lib && nwShcState.ui.builder.lib.collapsed && nwShcState.ui.builder.lib.collapsed[titleText]);
  details.open = forceOpen ? true : !collapsed;

  const summary = document.createElement('summary');
  summary.className = 'nw-shcfg-libgroup__summary';

  const sumLeft = document.createElement('div');
  sumLeft.className = 'nw-shcfg-libgroup__sum-left';

  const chev = document.createElement('span');
  chev.className = 'nw-shcfg-libgroup__chev';
  chev.textContent = '▶';

  const label = document.createElement('span');
  label.className = 'nw-shcfg-libgroup__label';
  label.textContent = titleText;

  sumLeft.appendChild(chev);
  sumLeft.appendChild(label);

  const count = document.createElement('span');
  count.className = 'nw-shcfg-libgroup__count';
  count.textContent = `${items.length}`;

  summary.appendChild(sumLeft);
  summary.appendChild(count);

  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'nw-shcfg-libgroup__body';
  items.forEach(it => body.appendChild(it));
  details.appendChild(body);

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'toggle' an details. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  details.addEventListener('toggle', () => {
    try {
      nwEnsureShcfgUiState();
      if (!nwShcState.ui.builder.lib) nwShcState.ui.builder.lib = { filter: '', collapsed: {} };
      if (!nwShcState.ui.builder.lib.collapsed) nwShcState.ui.builder.lib.collapsed = {};
      nwShcState.ui.builder.lib.collapsed[titleText] = !details.open;
      nwShcfgPersistLibCollapsed();
    } catch (_) {}
  });

  return details;
}
/**
 * Code-Teil: nwShcfgLibItem
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgLibItem({ icon, name, meta, payload }) {
  const item = document.createElement('div');
  item.className = 'nw-shcfg-libitem';
  item.draggable = true;

  const left = document.createElement('div');
  left.className = 'nw-shcfg-libitem__left';

  const ico = document.createElement('div');
  ico.className = 'nw-shcfg-libitem__icon';
  nwShcRenderIconPreview(ico, icon || '➕');

  const textWrap = document.createElement('div');
  const n = document.createElement('div');
  n.className = 'nw-shcfg-libitem__name';
  n.textContent = name;
  const m = document.createElement('div');
  m.className = 'nw-shcfg-libitem__meta';
  m.textContent = meta || '';

  textWrap.appendChild(n);
  textWrap.appendChild(m);
  left.appendChild(ico);
  left.appendChild(textWrap);

  const hint = document.createElement('div');
  hint.className = 'nw-shcfg-libitem__meta';
  hint.textContent = '↗ ziehen';

  item.appendChild(left);
  item.appendChild(hint);

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragstart' an item. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  item.addEventListener('dragstart', (e) => nwShcfgDragSet(e, payload));
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragend' an item. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  item.addEventListener('dragend', nwShcfgDragClear);

  // Optional: click-to-add (no drag needed)
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an item. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  item.addEventListener('click', (e) => {
    try {
      nwEnsureShcfgUiState();
      const builderUi = nwShcState.ui.builder;
      if (!builderUi || !payload) return;
      // Avoid click after drag
      if (builderUi.dragging) return;

      // Floors
      if (payload.kind === 'create-floor') {
        const f = nwShcfgAddFloor(payload.preset || 'floor');
        if (f) {
          builderUi.view = 'rooms';
          builderUi.tab = 'building';
          builderUi.selected = { kind: 'floor', id: f.id };
          nwRenderAll();
        }
        return;
      }

      // Rooms
      if (payload.kind === 'create-room') {
        const floorId = nwShcfgGetSelectedFloorIdForAddRoom();
        const preset = (payload && payload.preset && NW_SHCFG_ROOM_PRESETS[payload.preset]) ? NW_SHCFG_ROOM_PRESETS[payload.preset] : NW_SHCFG_ROOM_PRESETS.room;
        const r = nwShcfgAddRoom({ name: (preset && preset.name) || 'Neuer Raum', icon: (preset && preset.icon) || 'generic', floorId });
        if (r) {
          builderUi.view = 'rooms';
          builderUi.tab = 'building';
          builderUi.selected = { kind: 'room', id: r.id };
          nwRenderAll();
        }
        return;
      }

      // Devices
      if (payload.kind === 'device-template' && payload.templateId) {
        const roomId = nwShcfgGetTargetRoomIdForAdd();
        if (!roomId) {
          const msg = 'Bitte zuerst einen Raum auswählen (oder Raum öffnen), dann Vorlage klicken.';
          try { nwSetStatus(msg, 'warn'); } catch (_) {}
          return;
        }
        const dev = nwAddDeviceFromTemplate(payload.templateId, { roomId, silent: true });
        if (dev) {
          builderUi.view = 'roomDevices';
          builderUi.currentRoomId = roomId;
          builderUi.tab = 'devices';
          builderUi.selected = { kind: 'device', id: dev.id };
          nwRenderShcfgShell();
        }
        return;
      }
    } catch (_err) {
      // ignore
    }
  });

  return item;
}
/**
 * Code-Teil: nwRenderShcfgBuilderLib
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgBuilderLib(container) {
  container.innerHTML = '';
  const builderUi = nwShcState.ui.builder;

  if (builderUi.tab === 'building') {
    const floorItems = [
      // Geschosse / Bereiche
      nwShcfgLibItem({ icon: '3d-floors', name: 'Geschoss', meta: 'In den Arbeitsbereich ziehen', payload: { kind: 'create-floor', preset: 'floor' } }),
      nwShcfgLibItem({ icon: '3d-basement', name: 'Keller', meta: 'In den Arbeitsbereich ziehen', payload: { kind: 'create-floor', preset: 'keller' } }),
      nwShcfgLibItem({ icon: '3d-ground', name: 'Erdgeschoss', meta: 'In den Arbeitsbereich ziehen', payload: { kind: 'create-floor', preset: 'eg' } }),
      nwShcfgLibItem({ icon: '3d-upper', name: 'Obergeschoss', meta: 'In den Arbeitsbereich ziehen', payload: { kind: 'create-floor', preset: 'og' } }),
      nwShcfgLibItem({ icon: '3d-attic', name: 'Dachgeschoss', meta: 'In den Arbeitsbereich ziehen', payload: { kind: 'create-floor', preset: 'dg' } }),
      nwShcfgLibItem({ icon: '3d-garden', name: 'Außenbereich', meta: 'In den Arbeitsbereich ziehen', payload: { kind: 'create-floor', preset: 'outdoor' } }),
      nwShcfgLibItem({ icon: '3d-panel', name: 'Schaltschrank', meta: 'In den Arbeitsbereich ziehen', payload: { kind: 'create-floor', preset: 'cabinet' } }),
    ];

    const roomItems = [
      // Räume
      nwShcfgLibItem({ icon: 'door', name: 'Raum', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'room' } }),
      nwShcfgLibItem({ icon: 'sofa', name: 'Wohnen', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'living' } }),
      nwShcfgLibItem({ icon: 'bed', name: 'Schlafen', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'sleep' } }),
      nwShcfgLibItem({ icon: 'kitchen', name: 'Küche', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'kitchen' } }),
      nwShcfgLibItem({ icon: 'bath', name: 'Bad', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'bath' } }),
      nwShcfgLibItem({ icon: 'kids', name: 'Kinderzimmer', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'kids' } }),
      nwShcfgLibItem({ icon: 'guest', name: 'Gästezimmer', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'guest' } }),
      nwShcfgLibItem({ icon: 'office', name: 'Büro', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'office' } }),
      nwShcfgLibItem({ icon: 'gym', name: 'Fitness', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'fitness' } }),
      nwShcfgLibItem({ icon: 'sauna', name: 'Sauna', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'sauna' } }),
      nwShcfgLibItem({ icon: 'workshop', name: 'Werkstatt', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'workshop' } }),
      nwShcfgLibItem({ icon: 'tech', name: 'Technikraum', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'tech' } }),
      nwShcfgLibItem({ icon: 'fireplace', name: 'Kaminzimmer', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'fireplace' } }),
      nwShcfgLibItem({ icon: 'storage', name: 'Abstellraum', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'storage' } }),
      nwShcfgLibItem({ icon: 'laundry', name: 'Waschküche', meta: 'In ein Geschoss ziehen', payload: { kind: 'create-room', preset: 'laundry' } }),
    ];

    container.appendChild(nwShcfgLibGroup('Geschosse / Bereiche', floorItems, { forceOpen: true }));
    container.appendChild(nwShcfgLibGroup('Räume', roomItems, { forceOpen: true }));
    return;
  }

  if (builderUi.tab === 'devices') {
    // Search + collapsible groups
    if (!builderUi.lib) builderUi.lib = { filter: '', collapsed: {} };
    const libUi = builderUi.lib;

    const searchWrap = document.createElement('div');
    searchWrap.className = 'nw-shcfg-libsearch';

    const row = document.createElement('div');
    row.className = 'nw-shcfg-libsearch__row';

    const input = document.createElement('input');
    input.className = 'nw-config-input nw-shcfg-libsearch__input';
    input.type = 'search';
    input.placeholder = 'Geräte suchen…';
    input.value = libUi.filter || '';

    row.appendChild(input);
    searchWrap.appendChild(row);

    const mini = document.createElement('div');
    mini.className = 'nw-shcfg-libsearch__mini';
    searchWrap.appendChild(mini);

    container.appendChild(searchWrap);

    const groupsWrap = document.createElement('div');
    container.appendChild(groupsWrap);

    /**
     * Code-Teil: Arrow-Funktion `renderGroups`
     * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: renderGroups
     * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const renderGroups = () => {
      const filterRaw = String(input.value || '');
      libUi.filter = filterRaw;

      const roomId = nwShcfgGetTargetRoomIdForAdd();
      const room = roomId ? nwShcfgGetRoomById(roomId) : null;
      if (room) mini.textContent = `Tipp: Klick fügt das Gerät in „${room.name}“ ein (oder per Drag & Drop).`;
      else mini.textContent = 'Tipp: Raum auswählen oder Raum öffnen → dann Vorlage klicken (oder Drag & Drop).';

      groupsWrap.innerHTML = '';

      const preferredOrder = [
        'Licht',
        'Beschattung',
        'Klima',
        'Kamera',
        'Audio',
        'Szenen',
        'Status / Messwerte',
        'System',
      ];

      const filter = filterRaw.trim().toLowerCase();
      const byGroup = new Map();
      for (const tpl of NW_SHCFG_BUILDER_DEVICE_TEMPLATES) {
        const g = (tpl.group || 'Weitere').trim();
        const hay = `${tpl.name || ''} ${tpl.meta || ''} ${tpl.type || ''} ${tpl.id || ''} ${tpl.group || ''}`.toLowerCase();
        if (filter && !hay.includes(filter)) continue;
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g).push(tpl);
      }

      const groups = [
        ...preferredOrder.filter(g => byGroup.has(g)),
        ...[...byGroup.keys()].filter(g => !preferredOrder.includes(g)),
      ];

      if (!groups.length) {
        const empty = document.createElement('div');
        empty.className = 'nw-config-hint';
        empty.textContent = filter ? 'Keine Treffer. Tipp: Suche z.B. nach "dimmer", "kamera" oder "status".' : 'Keine Geräte-Vorlagen verfügbar.';
        groupsWrap.appendChild(empty);
        return;
      }

      groups.forEach(gName => {
        const items = (byGroup.get(gName) || []).map(tpl =>
          nwShcfgLibItem({
            icon: tpl.icon,
            name: tpl.name,
            meta: tpl.meta,
            payload: { kind: 'device-template', templateId: tpl.id },
          })
        );
        // While searching: always show results (open groups)
        groupsWrap.appendChild(nwShcfgLibGroup(gName, items, { forceOpen: !!filter }));
      });
    };

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    input.addEventListener('input', () => renderGroups());
    renderGroups();
    return;
  }

  // Fallback
  const p = document.createElement('div');
  p.className = 'nw-config-hint';
  p.textContent = 'Wähle links eine Bibliothek aus.';
  container.appendChild(p);
}
/**
 * Code-Teil: nwShcfgAddRoom
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgAddRoom({ name = 'Neuer Raum', floorId = null, icon = 'generic' } = {}) {
  const cfg = nwShcState.config;
  if (!cfg) return null;

  const rooms = cfg.rooms || (cfg.rooms = []);
  const label = (name || '').trim() || 'Neuer Raum';
  const fid = (floorId || '').trim() || null;

  const id = nwEnsureUniqueId(rooms, nwPagesSlugify(label), null);
  const nextOrder = 1 + rooms
    .filter(r => ((r.floorId || null) === fid))
    .reduce((m, r) => Math.max(m, Number(r.order) || 0), 0);

  const room = {
    id,
    name: label,
    floorId: fid || undefined,
    icon: icon || 'generic',
    order: nextOrder,
  };
  rooms.push(room);
  nwNormalizeRoomOrder();
  nwMarkDirty(true);
  return room;
}

const NW_SHCFG_FLOOR_PRESETS = {
  floor: { name: 'Neues Geschoss', icon: '3d-floors' },
  keller: { name: 'Keller', icon: '3d-basement' },
  eg: { name: 'Erdgeschoss', icon: 'ground' },
  og: { name: 'Obergeschoss', icon: '3d-upper' },
  dg: { name: 'Dachgeschoss', icon: '3d-attic' },
  outdoor: { name: 'Außenbereich', icon: '3d-garden' },
  cabinet: { name: 'Schaltschrank', icon: '3d-panel' },
};
const NW_SHCFG_ROOM_PRESETS = {
  room: { name: 'Neuer Raum', icon: 'generic' },
  living: { name: 'Wohnen', icon: 'sofa' },
  sleep: { name: 'Schlafen', icon: 'bed' },
  kitchen: { name: 'Küche', icon: 'kitchen' },
  bath: { name: 'Bad', icon: 'bath' },
  kids: { name: 'Kinderzimmer', icon: 'kids' },
  guest: { name: 'Gästezimmer', icon: 'guest' },
  office: { name: 'Büro', icon: '3d-office' },
  fitness: { name: 'Fitness', icon: 'gym' },
  sauna: { name: 'Sauna', icon: 'sauna' },
  workshop: { name: 'Werkstatt', icon: 'workshop' },
  tech: { name: 'Technikraum', icon: 'tech' },
  fireplace: { name: 'Kaminzimmer', icon: 'fireplace' },
  storage: { name: 'Abstellraum', icon: 'storage' },
  laundry: { name: 'Waschküche', icon: 'laundry' },
};
/**
 * Code-Teil: nwShcfgAddFloor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgAddFloor(presetId = 'floor') {
  const cfg = nwShcState.config;
  if (!cfg) return null;

  const floors = cfg.floors || (cfg.floors = []);
  const preset = NW_SHCFG_FLOOR_PRESETS[presetId] || NW_SHCFG_FLOOR_PRESETS.floor;
  const label = (preset.name || '').trim() || `Geschoss ${floors.length + 1}`;

  const id = nwEnsureUniqueId(floors, nwPagesSlugify(label), null);
  const nextOrder = 1 + floors.reduce((m, f) => Math.max(m, Number(f.order) || 0), 0);

  const floor = {
    id,
    name: label,
    icon: preset.icon || '🏢',
    order: nextOrder,
  };
  floors.push(floor);
  nwNormalizeFloorOrder();
  nwMarkDirty(true);
  return floor;
}
/**
 * Code-Teil: nwShcfgMoveRoomToFloor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgMoveRoomToFloor(roomId, floorId) {
  const cfg = nwShcState.config;
  if (!cfg) return;

  const rooms = cfg.rooms || [];
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;

  const fid = (floorId || '').trim() || null;
  room.floorId = fid || undefined;

  // Re-order within target floor
  const nextOrder = 1 + rooms
    .filter(r => r.id !== roomId && ((r.floorId || null) === fid))
    .reduce((m, r) => Math.max(m, Number(r.order) || 0), 0);
  room.order = nextOrder;

  nwNormalizeRoomOrder();
  nwMarkDirty(true);
}
/**
 * Code-Teil: nwRenderShcfgBuilderWorkspace
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgBuilderWorkspace(container) {
  container.innerHTML = '';
  const cfg = nwShcState.config;
  const builderUi = nwShcState.ui.builder;

  // Make the whole workspace a drop area for device templates.
  // Target room:
  //  - roomDevices view: currentRoomId
  //  - rooms view: selected room (single click)
  // This removes the "tiny drop field" problem when users scrolled down.
  try {
    container.classList.remove('is-work-over');
    container._nwWorkDragCnt = 0;

    container.ondragenter = (e) => {
      const payload = nwShcfgDragGet(e);
      if (!payload || payload.kind !== 'device-template' || !payload.templateId) return;
      const roomId = nwShcfgGetTargetRoomIdForAdd();
      if (!roomId) return;
      // If a child dropzone already handled, don't show global highlight.
      if (e.defaultPrevented && e.target !== container) return;
      container._nwWorkDragCnt = (container._nwWorkDragCnt || 0) + 1;
      container.classList.add('is-work-over');
    };

    container.ondragover = (e) => {
      const payload = nwShcfgDragGet(e);
      if (!payload || payload.kind !== 'device-template' || !payload.templateId) return;
      const roomId = nwShcfgGetTargetRoomIdForAdd();
      if (!roomId) return;
      if (e.defaultPrevented && e.target !== container) return;
      e.preventDefault();
      container.classList.add('is-work-over');
    };

    container.ondragleave = (e) => {
      const payload = nwShcfgDragGet(e);
      if (!payload || payload.kind !== 'device-template') {
        // Still clear highlight if user leaves the container entirely.
        container._nwWorkDragCnt = Math.max(0, (container._nwWorkDragCnt || 0) - 1);
        if ((container._nwWorkDragCnt || 0) === 0) container.classList.remove('is-work-over');
        return;
      }
      container._nwWorkDragCnt = Math.max(0, (container._nwWorkDragCnt || 0) - 1);
      if ((container._nwWorkDragCnt || 0) === 0) container.classList.remove('is-work-over');
    };

    container.ondrop = (e) => {
      const alreadyHandled = (e.defaultPrevented && e.target !== container);
      container._nwWorkDragCnt = 0;
      container.classList.remove('is-work-over');
      if (alreadyHandled) return;

      const payload = nwShcfgDragGet(e);
      if (!payload || payload.kind !== 'device-template' || !payload.templateId) return;
      const roomId = nwShcfgGetTargetRoomIdForAdd();
      if (!roomId) return;
      e.preventDefault();

      const dev = nwAddDeviceFromTemplate(payload.templateId, { roomId, silent: true });
      if (dev) {
        builderUi.view = 'roomDevices';
        builderUi.currentRoomId = roomId;
        builderUi.tab = 'devices';
        builderUi.selected = { kind: 'device', id: dev.id };
        nwRenderShcfgShell();
      }
    };
  } catch (_) {}

  const rooms = cfg.rooms || [];
  const devices = cfg.devices || [];

  const crumbs = document.createElement('div');
  crumbs.className = 'nw-shcfg-work__crumbs';

  const left = document.createElement('div');
  const right = document.createElement('div');

  if (builderUi.view === 'roomDevices') {
    const room = rooms.find(r => r.id === builderUi.currentRoomId) || rooms[0] || null;
    if (!room) {
      builderUi.view = 'rooms';
      builderUi.currentRoomId = null;
      return nwRenderShcfgBuilderWorkspace(container);
    }

    const backBtn = document.createElement('button');
    backBtn.className = 'nw-config-btn nw-config-btn--ghost';
    backBtn.type = 'button';
    backBtn.textContent = '← Gebäude';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an backBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    backBtn.addEventListener('click', () => {
      builderUi.view = 'rooms';
      builderUi.currentRoomId = null;
      builderUi.tab = 'building';
      builderUi.selected = { kind: 'room', id: room.id };
      nwRenderShcfgShell();
    });

    left.appendChild(backBtn);
    const title = document.createElement('strong');
    title.textContent = room.name;
    left.appendChild(title);

    const hint = document.createElement('div');
    hint.className = 'nw-config-hint';
    hint.textContent = 'Ziehe Geräte aus der Bibliothek hier rein.';
    right.appendChild(hint);

    crumbs.appendChild(left);
    crumbs.appendChild(right);
    container.appendChild(crumbs);

    const drop = document.createElement('div');
    drop.className = 'nw-shcfg-dropzone nw-shcfg-dropzone--sticky';
    drop.textContent = 'Gerät hier ablegen (oder irgendwo im Arbeitsbereich)';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragover' an drop. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragleave' an drop. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'drop' an drop. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-over');
      const payload = nwShcfgDragGet(e);
      if (!payload) return;
      if (payload.kind === 'device-template' && payload.templateId) {
        const dev = nwAddDeviceFromTemplate(payload.templateId, { roomId: room.id, silent: true });
        if (dev) {
          builderUi.selected = { kind: 'device', id: dev.id };
          builderUi.tab = 'devices';
          // refresh only editor shell (device was already added + rendered)
          nwRenderShcfgShell();
        }
      }
    });
    container.appendChild(drop);

    const grid = document.createElement('div');
    grid.className = 'nw-shcfg-grid';
    const roomDevices = devices.filter(d => d.roomId === room.id);
    if (!roomDevices.length) {
      const empty = document.createElement('div');
      empty.className = 'nw-config-hint';
      empty.textContent = 'Noch keine Geräte in diesem Raum.';
      container.appendChild(empty);
    }

    roomDevices.forEach(dev => {
      const card = document.createElement('div');
      card.className = 'nw-shcfg-card';
      if (builderUi.selected && builderUi.selected.kind === 'device' && builderUi.selected.id === dev.id) card.classList.add('is-selected');

      const titleRow = document.createElement('div');
      titleRow.className = 'nw-shcfg-card__title';
      const ico = document.createElement('span');
      ico.textContent = (
        (dev.templateId && NW_SHCFG_BUILDER_DEVICE_TEMPLATES.find(t => t.id === dev.templateId)?.icon) ||
        (NW_SHCFG_BUILDER_DEVICE_TEMPLATES.find(t => t.type === dev.type)?.icon) ||
        '🧩'
      );
      const t = document.createElement('span');
      t.textContent = dev.alias || dev.id;
      titleRow.appendChild(ico);
      titleRow.appendChild(t);

      const sub = document.createElement('div');
      sub.className = 'nw-shcfg-card__subtitle';
      const fn = (cfg.functions || []).find(f => f.id === dev.functionId);
      sub.textContent = `${dev.type}${fn ? ' • ' + fn.name : ''}`;

      card.appendChild(titleRow);
      card.appendChild(sub);

      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      card.addEventListener('click', () => {
        builderUi.selected = { kind: 'device', id: dev.id };
        nwRenderShcfgShell();
      });

      grid.appendChild(card);
    });

    container.appendChild(grid);
    return;
  }

  // rooms view (Gebäude -> Geschosse -> Räume)
  left.innerHTML = '';
  const title = document.createElement('strong');
  title.textContent = 'Gebäude';
  left.appendChild(title);

  const addFloorBtn = document.createElement('button');
  addFloorBtn.className = 'nw-config-btn';
  addFloorBtn.type = 'button';
  addFloorBtn.textContent = '+ Geschoss';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an addFloorBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  addFloorBtn.addEventListener('click', () => {
    const f = nwShcfgAddFloor('floor');
    if (f) {
      builderUi.selected = { kind: 'floor', id: f.id };
      nwRenderAll();
    }
  });
  right.appendChild(addFloorBtn);

  crumbs.appendChild(left);
  crumbs.appendChild(right);
  container.appendChild(crumbs);

  // Dropzone: Geschoss erstellen
  const drop = document.createElement('div');
  drop.className = 'nw-shcfg-dropzone';
  drop.textContent = 'Geschoss aus der Bibliothek hier ablegen';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragover' an drop. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  drop.addEventListener('dragover', (e) => {
    const payload = nwShcfgDragGet(e);
    if (!payload || payload.kind !== 'create-floor') return;
    e.preventDefault();
    drop.classList.add('is-over');
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragleave' an drop. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'drop' an drop. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-over');
    const payload = nwShcfgDragGet(e);
    if (!payload || payload.kind !== 'create-floor') return;
    const f = nwShcfgAddFloor(payload.preset || 'floor');
    if (f) {
      builderUi.selected = { kind: 'floor', id: f.id };
      nwRenderAll();
    }
  });
  container.appendChild(drop);

  const grid = document.createElement('div');
  grid.className = 'nw-shcfg-grid';
  const floors = (cfg.floors || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const roomsAll = (cfg.rooms || []).slice();
  const hasUnassigned = roomsAll.some(r => r && !r.floorId);
  const floorList = floors.map(f => Object.assign({ _virtual: false }, f));
  if (hasUnassigned || floorList.length === 0) {
    floorList.push({ id: '__unassigned__', name: 'Ohne Geschoss', icon: '🧩', order: 9999, _virtual: true });
  }

  if (!floors.length) {
    const empty = document.createElement('div');
    empty.className = 'nw-config-hint';
    empty.textContent = 'Noch keine Geschosse. Ziehe „Erdgeschoss/Obergeschoss…“ aus der Bibliothek oder nutze „+ Geschoss“.';
    container.appendChild(empty);
  }

  floorList.forEach(floor => {
    const fCard = document.createElement('div');
    fCard.className = 'nw-shcfg-card nw-shcfg-floor';
    if (builderUi.selected && builderUi.selected.kind === 'floor' && builderUi.selected.id === floor.id) fCard.classList.add('is-selected');

    const roomsInFloor = roomsAll
      .filter(r => {
        if (!r) return false;
        if (floor._virtual) return !r.floorId;
        return r.floorId === floor.id;
      })
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const floorDeviceCount = devices.filter(d => {
      if (!d) return false;
      if (d.roomId) return false;
      if (floor._virtual) return !d.floorId;
      return d.floorId === floor.id;
    }).length;
    const devCount = devices.filter(d => roomsInFloor.some(r => r.id === d.roomId)).length + floorDeviceCount;

    fCard.innerHTML = `
      <div class="nw-shcfg-floor__head">
        <div class="nw-shcfg-floor__title">
          <span class="nw-shcfg-floor__icon"></span>
          <span class="nw-shcfg-floor__name">${nwEscapeHtml(floor.name || floor.id)}</span>
        </div>
        <div class="nw-shcfg-floor__meta">${roomsInFloor.length} Raum(e) • ${devCount} Gerät(e)</div>
        <button class="nw-config-btn nw-shcfg-floor__add" type="button">+ Raum</button>
      </div>
      <div class="nw-shcfg-dropzone nw-shcfg-floor__drop">Raum aus der Bibliothek hier ablegen</div>
      <div class="nw-shcfg-floor__rooms"></div>

      <div class="nw-shcfg-floor__devhead">
        <div class="nw-shcfg-floor__devtitle">Geräte (direkt im Geschoss)</div>
        <div class="nw-shcfg-floor__devmeta">${floorDeviceCount} Gerät(e)</div>
      </div>
      <div class="nw-shcfg-dropzone nw-shcfg-floor__devdrop">Gerät aus der Bibliothek hier ablegen</div>
      <div class="nw-shcfg-floor__devices"></div>
    `;

    const floorIconEl = fCard.querySelector('.nw-shcfg-floor__icon');
    if (floorIconEl) nwShcRenderIconPreview(floorIconEl, floor.icon || '🏢');

    // Select floor
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an fCard. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    fCard.addEventListener('click', () => {
      builderUi.selected = { kind: 'floor', id: floor.id };
      nwRenderShcfgShell();
    });

    // + Raum
    const addRoomBtn = fCard.querySelector('.nw-shcfg-floor__add');
    addRoomBtn?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = nwShcfgAddRoom({ name: 'Neuer Raum', floorId: floor._virtual ? null : floor.id });
      if (r) {
        builderUi.selected = { kind: 'room', id: r.id };
        nwRenderAll();
      }
    });

    // Dropzone (Raum erstellen / Raum verschieben)
    const fDrop = fCard.querySelector('.nw-shcfg-floor__drop');
    fDrop?.addEventListener('dragover', (e) => {
      const payload = nwShcfgDragGet(e);
      if (!payload) return;
      if (payload.kind !== 'create-room' && payload.kind !== 'move-room') return;
      e.preventDefault();
      fDrop.classList.add('is-over');
    });
    fDrop?.addEventListener('dragleave', () => fDrop.classList.remove('is-over'));
    fDrop?.addEventListener('drop', (e) => {
      e.preventDefault();
      fDrop.classList.remove('is-over');
      const payload = nwShcfgDragGet(e);
      if (!payload) return;
      if (payload.kind === 'create-room') {
        const preset = (payload && payload.preset && NW_SHCFG_ROOM_PRESETS[payload.preset]) ? NW_SHCFG_ROOM_PRESETS[payload.preset] : NW_SHCFG_ROOM_PRESETS.room;
        const r = nwShcfgAddRoom({ name: (preset && preset.name) || 'Neuer Raum', icon: (preset && preset.icon) || 'generic', floorId: floor._virtual ? null : floor.id });
        if (r) builderUi.selected = { kind: 'room', id: r.id };
        nwRenderAll();
      }
      if (payload.kind === 'move-room' && payload.roomId) {
        nwShcfgMoveRoomToFloor(payload.roomId, floor._virtual ? null : floor.id);
        builderUi.selected = { kind: 'room', id: payload.roomId };
        nwRenderAll();
      }
    });

    const roomsWrap = fCard.querySelector('.nw-shcfg-floor__rooms');

    // Dropzone (Gerät direkt ins Geschoss)
    const fDevDrop = fCard.querySelector('.nw-shcfg-floor__devdrop');
    fDevDrop?.addEventListener('dragover', (e) => {
      const payload = nwShcfgDragGet(e);
      if (!payload || payload.kind !== 'device-template' || !payload.templateId) return;
      e.preventDefault();
      fDevDrop.classList.add('is-over');
    });
    fDevDrop?.addEventListener('dragleave', () => fDevDrop.classList.remove('is-over'));
    fDevDrop?.addEventListener('drop', (e) => {
      e.preventDefault();
      fDevDrop.classList.remove('is-over');
      const payload = nwShcfgDragGet(e);
      if (!payload || payload.kind !== 'device-template' || !payload.templateId) return;
      const dev = nwAddDeviceFromTemplate(payload.templateId, { floorId: floor._virtual ? null : floor.id, silent: true });
      if (dev) {
        builderUi.selected = { kind: 'device', id: dev.id };
        // Keep the building view – properties panel will show the device mapping
        nwRenderAll();
      }
    });

    // Floor-level devices list
    const devWrap = fCard.querySelector('.nw-shcfg-floor__devices');
    const floorDevs = devices
      .filter(d => {
        if (!d) return false;
        if (d.roomId) return false;
        if (floor._virtual) return !d.floorId;
        return d.floorId === floor.id;
      })
      .slice()
      .sort(nwSortByOrder);

    floorDevs.forEach((dev) => {
      const dChip = document.createElement('div');
      dChip.className = 'nw-shcfg-devchip';
      if (builderUi.selected && builderUi.selected.kind === 'device' && builderUi.selected.id === dev.id) dChip.classList.add('is-selected');

      const typeLabel = String(dev.type || 'device').toUpperCase();
      dChip.innerHTML = `
        <div class="nw-shcfg-devchip__title"><span class="nw-shcfg-devchip__icon"></span>${nwEscapeHtml(dev.alias || dev.name || dev.id)}</div>
        <div class="nw-shcfg-devchip__meta">${nwEscapeHtml(typeLabel)}</div>
      `;

      const devIconEl = dChip.querySelector('.nw-shcfg-devchip__icon');
      if (devIconEl) nwShcRenderIconPreview(devIconEl, dev.icon || 'generic');

      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an dChip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      dChip.addEventListener('click', (ev) => {
        ev.stopPropagation();
        builderUi.selected = { kind: 'device', id: dev.id };
        nwRenderShcfgShell();
      });

      devWrap?.appendChild(dChip);
    });

    roomsInFloor.forEach(room => {
      const rChip = document.createElement('div');
      rChip.className = 'nw-shcfg-roomchip';
      if (builderUi.selected && builderUi.selected.kind === 'room' && builderUi.selected.id === room.id) rChip.classList.add('is-selected');
      const cnt = devices.filter(d => d.roomId === room.id).length;
      rChip.innerHTML = `
        <div class="nw-shcfg-roomchip__title"><span class="nw-shcfg-roomchip__icon"></span>${nwEscapeHtml(room.name || room.id)}</div>
        <div class="nw-shcfg-roomchip__meta">${cnt} Gerät(e)</div>
      `;

      const roomIconEl = rChip.querySelector('.nw-shcfg-roomchip__icon');
      if (roomIconEl) nwShcRenderIconPreview(roomIconEl, room.icon || 'generic');

      // Select room
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an rChip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      rChip.addEventListener('click', (ev) => {
        ev.stopPropagation();
        builderUi.selected = { kind: 'room', id: room.id };
        nwRenderShcfgShell();
      });

      // Open room (devices)
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'dblclick' an rChip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      rChip.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        builderUi.view = 'roomDevices';
        builderUi.currentRoomId = room.id;
        builderUi.tab = 'devices';
        const roomDevs = devices.filter(d => d.roomId === room.id);
        builderUi.selected = roomDevs.length ? { kind: 'device', id: roomDevs[0].id } : { kind: 'room', id: room.id };
        nwRenderShcfgShell();
      });

      // Drag room (move)
      rChip.setAttribute('draggable', 'true');
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragstart' an rChip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      rChip.addEventListener('dragstart', (e) => {
        nwShcfgDragSet(e, { kind: 'move-room', roomId: room.id });
      });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragend' an rChip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      rChip.addEventListener('dragend', nwShcfgDragClear);

      // Drop a device template onto a room
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragover' an rChip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      rChip.addEventListener('dragover', (e) => {
        const payload = nwShcfgDragGet(e);
        if (!payload || payload.kind !== 'device-template' || !payload.templateId) return;
        e.preventDefault();
        rChip.classList.add('is-over');
      });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragleave' an rChip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      rChip.addEventListener('dragleave', () => rChip.classList.remove('is-over'));
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'drop' an rChip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      rChip.addEventListener('drop', (e) => {
        e.preventDefault();
        rChip.classList.remove('is-over');
        const payload = nwShcfgDragGet(e);
        if (!payload) return;
        if (payload.kind === 'device-template' && payload.templateId) {
          const dev = nwAddDeviceFromTemplate(payload.templateId, { roomId: room.id, silent: true });
          if (dev) {
            builderUi.view = 'roomDevices';
            builderUi.currentRoomId = room.id;
            builderUi.tab = 'devices';
            builderUi.selected = { kind: 'device', id: dev.id };
            nwRenderShcfgShell();
          }
        }
      });

      roomsWrap?.appendChild(rChip);
    });

    grid.appendChild(fCard);
  });

  container.appendChild(grid);
}
/**
 * Code-Teil: nwShcfgCreateSelect
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgCreateSelect(options, value, onChange) {
  const sel = document.createElement('select');
  sel.className = 'nw-config-select';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    sel.appendChild(o);
  });
  sel.value = value ?? '';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  sel.addEventListener('change', () => onChange(sel.value));
  return sel;
}
/**
 * Code-Teil: nwShcfgCreateTextInput
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgCreateTextInput(value, onChange, { placeholder = '' } = {}) {
  const input = document.createElement('input');
  input.className = 'nw-config-input';
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value ?? '';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  input.addEventListener('change', () => onChange(input.value));
  return input;
}
/**
 * Code-Teil: nwShcfgNullIfEmpty
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShcfgNullIfEmpty(v) {
  const s = (v ?? '').trim();
  return s ? s : null;
}
/**
 * Code-Teil: nwRenderShcfgBuilderProps
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderShcfgBuilderProps(container) {
  container.innerHTML = '';
  const cfg = nwShcState.config;
  const builderUi = nwShcState.ui.builder;
  const sel = builderUi.selected;

  const rooms = cfg.rooms || [];
  const funcs = cfg.functions || [];
  const devices = cfg.devices || [];

  if (!sel) {
    const h = document.createElement('div');
    h.className = 'nw-config-hint';
    h.textContent = 'Wähle links im Arbeitsbereich ein Geschoss, einen Raum oder ein Gerät aus.';
    container.appendChild(h);
    return;
  }

  if (sel.kind === 'floor') {
    const floor = (cfg.floors || []).find(f => f.id === sel.id) || (sel.id === '__unassigned__' ? { id: '__unassigned__', name: 'Ohne Geschoss', icon: '🧩', _virtual: true } : null);
    if (!floor) {
      container.textContent = 'Auswahl nicht gefunden.';
      return;
    }

    const head = document.createElement('div');
    head.className = 'nw-config-card__head';
    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = `Geschoss: ${floor.name || floor.id}`;
    head.appendChild(title);

    if (!floor._virtual) {
      const del = document.createElement('button');
      del.className = 'nw-config-btn nw-config-btn--danger';
      del.type = 'button';
      del.textContent = 'Löschen';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      del.addEventListener('click', () => {
        if (!confirm(`Geschoss „${floor.name || floor.id}“ wirklich löschen? Räume werden in „Ohne Geschoss“ verschoben.`)) return;
        const idx = (cfg.floors || []).findIndex(f => f.id === floor.id);
        if (idx >= 0) {
          (cfg.floors || []).splice(idx, 1);
          (cfg.rooms || []).forEach(r => {
            if (r && r.floorId === floor.id) delete r.floorId;
          });
          nwNormalizeFloorOrder();
          nwNormalizeRoomOrder();
          nwMarkDirty(true);
          builderUi.selected = null;
          nwRenderAll();
        }
      });
      head.appendChild(del);
    }

    container.appendChild(head);

    // Name
    container.appendChild(
      nwCreateFieldRow('Name', nwShcfgCreateTextInput(floor.name || '', (v) => {
        if (floor._virtual) return;
        floor.name = v;
        nwMarkDirty(true);
        nwRenderAll();
      }, { placeholder: 'z.B. Erdgeschoss' }))
    );

    // ID (read-only for now)
    const idInput = nwShcfgCreateTextInput(floor.id, () => {}, {});
    idInput.readOnly = true;
    container.appendChild(nwCreateFieldRow('ID', idInput));

    // Icon
    container.appendChild(
      nwCreateFieldRow('Icon', nwShcfgRenderIconPickerRow(floor.icon || '', (v) => {
        if (floor._virtual) return;
        floor.icon = v;
        nwMarkDirty(true);
        nwRenderAll();
      }, { showLabel: false }))
    );

    return;
  }

  if (sel.kind === 'room') {
    const room = rooms.find(r => r.id === sel.id);
    if (!room) {
      container.textContent = 'Auswahl nicht gefunden.';
      return;
    }

    const head = document.createElement('div');
    head.className = 'nw-config-card__head';
    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = `Raum: ${room.name}`;
    head.appendChild(title);

    const del = document.createElement('button');
    del.className = 'nw-config-btn nw-config-btn--danger';
    del.type = 'button';
    del.textContent = 'Löschen';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    del.addEventListener('click', () => {
      if (!confirm(`Raum „${room.name}“ wirklich löschen?`)) return;
      const idx = rooms.findIndex(r => r.id === room.id);
      if (idx >= 0) {
        rooms.splice(idx, 1);
        nwNormalizeRoomOrder();
        nwMarkDirty(true);
        // Keep selection sane
        builderUi.selected = rooms.length ? { kind: 'room', id: rooms[0].id } : null;
        builderUi.view = 'rooms';
        builderUi.currentRoomId = null;
        nwRenderAll();
      }
    });

    head.appendChild(del);
    container.appendChild(head);

    // Name
    container.appendChild(
      nwCreateFieldRow('Name', nwShcfgCreateTextInput(room.name, (v) => {
        room.name = v;
        nwMarkDirty(true);
        nwRenderShcfgShell();
      }))
    );

    // Icon
    container.appendChild(
      nwCreateFieldRow('Icon', nwShcfgRenderIconPickerRow(room.icon || '', (v) => {
        room.icon = v;
        nwMarkDirty(true);
        nwRenderAll();
      }, { showLabel: false }))
    );

    // Geschoss-Zuordnung
    const floorOptions = [
      { value: '', label: 'Ohne Geschoss' },
      ...(cfg.floors || []).slice().sort(nwSortByOrder).map(f => ({ value: f.id, label: f.name || f.id })),
    ];
    container.appendChild(
      nwCreateFieldRow('Geschoss', nwShcfgCreateSelect(floorOptions, room.floorId || '', (v) => {
        room.floorId = v || undefined;
        nwNormalizeRoomOrder();
        nwMarkDirty(true);
        nwRenderAll();
      }))
    );

    // ID
    const idInput = nwShcfgCreateTextInput(room.id, () => {}, {});
    idInput.readOnly = true;
    container.appendChild(nwCreateFieldRow('ID', idInput));

    // Shortcut: open room
    const openBtn = document.createElement('button');
    openBtn.className = 'nw-config-btn';
    openBtn.type = 'button';
    openBtn.textContent = 'Raum öffnen';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an openBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    openBtn.addEventListener('click', () => {
      builderUi.view = 'roomDevices';
      builderUi.currentRoomId = room.id;
      builderUi.tab = 'devices';
      const roomDevs = devices.filter(d => d.roomId === room.id);
      builderUi.selected = roomDevs.length ? { kind: 'device', id: roomDevs[0].id } : { kind: 'room', id: room.id };
      nwRenderShcfgShell();
    });
    container.appendChild(openBtn);
    return;
  }

  if (sel.kind === 'device') {
    const dev = devices.find(d => d.id === sel.id);
    if (!dev) {
      container.textContent = 'Gerät nicht gefunden.';
      return;
    }

    const head = document.createElement('div');
    head.className = 'nw-config-card__head';
    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = `Gerät: ${dev.alias || dev.id}`;
    head.appendChild(title);

    const del = document.createElement('button');
    del.className = 'nw-config-btn nw-config-btn--danger';
    del.type = 'button';
    del.textContent = 'Löschen';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    del.addEventListener('click', () => {
      if (!confirm(`Gerät „${dev.alias || dev.id}“ wirklich löschen?`)) return;
      const idx = devices.findIndex(d => d.id === dev.id);
      if (idx >= 0) {
        devices.splice(idx, 1);
        nwNormalizeDeviceOrder();
        nwMarkDirty(true);
        // selection fallback
        const roomId = dev.roomId;
        const floorId = dev.floorId;
        if (roomId) {
          const roomDevs = devices.filter(d => d.roomId === roomId);
          if (roomDevs.length) builderUi.selected = { kind: 'device', id: roomDevs[0].id };
          else builderUi.selected = { kind: 'room', id: roomId };
        } else {
          const sameFloorDevs = devices.filter(d => !d.roomId && ((d.floorId || null) === (floorId || null)));
          if (sameFloorDevs.length) builderUi.selected = { kind: 'device', id: sameFloorDevs[0].id };
          else if (floorId) builderUi.selected = { kind: 'floor', id: floorId };
          else builderUi.selected = rooms.length ? { kind: 'room', id: rooms[0].id } : ((cfg.floors && cfg.floors.length) ? { kind: 'floor', id: cfg.floors[0].id } : null);
        }
        nwRenderAll();
      }
    });

    head.appendChild(del);
    container.appendChild(head);

    // Alias
    container.appendChild(
      nwCreateFieldRow('Name', nwShcfgCreateTextInput(dev.alias || '', (v) => {
        dev.alias = v;
        nwMarkDirty(true);
        nwRenderShcfgShell();
      }, { placeholder: 'z.B. Deckenlicht' }))
    );

    // Icon
    container.appendChild(
      nwCreateFieldRow('Icon', nwShcfgRenderIconPickerRow(dev.icon || '', (v) => {
        dev.icon = v;
        nwMarkDirty(true);
        nwRenderAll();
      }, { showLabel: false }))
    );

    // ID
    const idInput = nwShcfgCreateTextInput(dev.id, () => {}, {});
    idInput.readOnly = true;
    container.appendChild(nwCreateFieldRow('ID', idInput));

    // Type (read-only for safety)
    const typeInput = nwShcfgCreateTextInput(dev.type, () => {}, {});
    typeInput.readOnly = true;
    container.appendChild(nwCreateFieldRow('Typ', typeInput));

    // Placement (room vs floor)
    const floors = Array.isArray(cfg.floors) ? cfg.floors.slice().sort(nwSortByOrder) : [];
    const hasFloorProp = Object.prototype.hasOwnProperty.call(dev, 'floorId');
    const placement = dev.roomId ? 'room' : (hasFloorProp ? 'floor' : 'none');
    const placementOptions = [
      { value: 'room', label: 'In Raum' },
      { value: 'floor', label: 'Direkt im Geschoss' },
      { value: 'none', label: '— (nicht zugeordnet)' },
    ];

    container.appendChild(
      nwCreateFieldRow('Zuordnung', nwShcfgCreateSelect(placementOptions, placement, (v) => {
        const mode = String(v || 'room');
        const prevRoomId = dev.roomId;
        if (mode === 'room') {
          dev.floorId = null;
          if (!dev.roomId) dev.roomId = rooms.length ? (rooms[0] && rooms[0].id) : null;
        } else if (mode === 'floor') {
          let desiredFloorId = dev.floorId;
          if (!desiredFloorId && prevRoomId) {
            const r = rooms.find(x => x && x.id === prevRoomId);
            desiredFloorId = (r && r.floorId) ? r.floorId : null;
          }
          if (!desiredFloorId && floors.length) desiredFloorId = floors[0].id;
          dev.roomId = null;
          dev.floorId = desiredFloorId || null;
        } else {
          dev.roomId = null;
          // Remove the property entirely so it is treated as truly "unassigned".
          delete dev.floorId;
        }
        nwMarkDirty(true);
        nwRenderAll();
      }))
    );

    if (placement === 'room') {
      const roomOptions = [{ value: '', label: '—' }, ...rooms.map(r => ({ value: r.id, label: r.name }))];
      container.appendChild(
        nwCreateFieldRow('Raum', nwShcfgCreateSelect(roomOptions, dev.roomId || '', (v) => {
          dev.roomId = v || null;
          dev.floorId = null;
          nwMarkDirty(true);
          nwRenderAll();
        }))
      );
    } else if (placement === 'floor') {
      const floorOptions = [{ value: '', label: 'Ohne Geschoss' }, ...floors.map(f => ({ value: f.id, label: f.name }))];
      container.appendChild(
        nwCreateFieldRow('Geschoss', nwShcfgCreateSelect(floorOptions, dev.floorId || '', (v) => {
          dev.floorId = v || null;
          dev.roomId = null;
          nwMarkDirty(true);
          nwRenderAll();
        }))
      );
    }

    // Function
    const fnOptions = [{ value: '', label: '—' }, ...funcs.map(f => ({ value: f.id, label: f.name }))];
    container.appendChild(
      nwCreateFieldRow('Funktion', nwShcfgCreateSelect(fnOptions, dev.functionId || '', (v) => {
        dev.functionId = v || null;
        nwMarkDirty(true);
        nwRenderShcfgShell();
      }))
    );

    // IO mappings depending on type
    const ioTitle = document.createElement('div');
    ioTitle.className = 'nw-config-card__subtitle';
    ioTitle.style.marginTop = '10px';
    ioTitle.textContent = 'Datenpunkte (NexoWatt EOS)';
    container.appendChild(ioTitle);

    dev.io = dev.io || {};
    dev.behavior = dev.behavior || {};

    const ensureObject = (parent, key, defaults = {}) => {
      if (!parent[key] || typeof parent[key] !== 'object' || Array.isArray(parent[key])) parent[key] = { ...defaults };
      else Object.keys(defaults).forEach((name) => {
        if (typeof parent[key][name] === 'undefined') parent[key][name] = defaults[name];
      });
      return parent[key];
    };
    const addDp = (label, owner, key) => {
      container.appendChild(nwCreateDpInput(label, owner[key] || '', (value) => {
        owner[key] = nwShcfgNullIfEmpty(value);
        nwMarkDirty(true);
      }));
    };
    const addNumber = (label, owner, key, fallback, min, max, step = 1) => {
      const input = document.createElement('input');
      input.className = 'nw-config-input';
      input.type = 'number';
      if (Number.isFinite(Number(min))) input.min = String(min);
      if (Number.isFinite(Number(max))) input.max = String(max);
      input.step = String(step);
      const current = Number(owner[key]);
      input.value = String(Number.isFinite(current) ? current : fallback);
      input.addEventListener('change', () => {
        let value = Number(input.value);
        if (!Number.isFinite(value)) value = fallback;
        if (Number.isFinite(Number(min))) value = Math.max(Number(min), value);
        if (Number.isFinite(Number(max))) value = Math.min(Number(max), value);
        owner[key] = value;
        input.value = String(value);
        nwMarkDirty(true);
      });
      container.appendChild(nwCreateFieldRow(label, input));
    };
    const addSelect = (label, owner, key, options, fallback) => {
      container.appendChild(nwCreateFieldRow(label, nwShcfgCreateSelect(options, String(owner[key] ?? fallback ?? ''), (value) => {
        owner[key] = value;
        nwMarkDirty(true);
      })));
    };
    const addText = (label, owner, key, placeholder = '') => {
      container.appendChild(nwCreateFieldRow(label, nwShcfgCreateTextInput(owner[key] || '', (value) => {
        owner[key] = value;
        nwMarkDirty(true);
      }, { placeholder })));
    };
    const addBehavior = () => {
      dev.behavior = dev.behavior || {};
      addNumber('Status gilt nach (s) als veraltet · 0 = aus', dev.behavior, 'staleAfterSec', 0, 0, 604800, 1);
    };

    if (dev.type === 'switch' || dev.type === 'scene') {
      const sw = ensureObject(dev.io, 'switch', { readId: null, writeId: null });
      addDp('Status lesen (readId)', sw, 'readId');
      addDp(dev.type === 'scene' ? 'Szene auslösen (writeId)' : 'Schalten (writeId)', sw, 'writeId');
      addSelect('Befehlsart', dev.behavior, 'commandMode', [
        { value: 'toggle', label: 'Umschalten' },
        { value: 'set', label: 'Explizit Ein/Aus' },
        { value: 'momentary', label: 'Taster/Impuls' },
      ], dev.type === 'scene' ? 'momentary' : 'toggle');
      if (dev.behavior.commandMode === 'momentary' || dev.type === 'scene') {
        addNumber('Impulsdauer (ms)', dev.behavior, 'pulseMs', 250, 50, 60000, 50);
      }
      addBehavior();
    } else if (dev.type === 'dimmer' || dev.type === 'color') {
      const sw = ensureObject(dev.io, 'switch', { readId: null, writeId: null });
      const level = ensureObject(dev.io, 'level', { readId: null, writeId: null, min: 0, max: 100, step: 1 });
      addDp('Schalten lesen (readId)', sw, 'readId');
      addDp('Schalten schreiben (writeId)', sw, 'writeId');
      addDp('Helligkeit lesen (readId)', level, 'readId');
      addDp('Helligkeit schreiben (writeId)', level, 'writeId');
      addNumber('Helligkeit Minimum', level, 'min', 0, -1000000, 1000000, 1);
      addNumber('Helligkeit Maximum', level, 'max', 100, -1000000, 1000000, 1);
      addNumber('Helligkeit Schritt', level, 'step', 1, 0.000001, 1000000, 0.1);

      if (dev.type === 'color') {
        const color = ensureObject(dev.io, 'color', { readId: null, writeId: null, format: 'hex' });
        addDp('RGB/Farbe lesen (readId)', color, 'readId');
        addDp('RGB/Farbe schreiben (writeId)', color, 'writeId');
        addSelect('Farbformat', color, 'format', [
          { value: 'hex', label: 'HEX (#RRGGBB)' },
          { value: 'rgb', label: 'RGB (r,g,b)' },
          { value: 'int', label: 'Integer 0…16777215' },
        ], 'hex');
        const white = ensureObject(dev.io, 'white', { readId: null, writeId: null, min: 0, max: 100, step: 1 });
        addDp('Weißkanal lesen (readId, optional)', white, 'readId');
        addDp('Weißkanal schreiben (writeId, optional)', white, 'writeId');
      }

      const ct = ensureObject(dev.io, 'colorTemperature', { readId: null, writeId: null, min: 2000, max: 6500, step: 100 });
      addDp('Farbtemperatur lesen (K, optional)', ct, 'readId');
      addDp('Farbtemperatur schreiben (K, optional)', ct, 'writeId');
      addNumber('Farbtemperatur Minimum (K)', ct, 'min', 2000, 1000, 20000, 100);
      addNumber('Farbtemperatur Maximum (K)', ct, 'max', 6500, 1000, 20000, 100);
      addNumber('Farbtemperatur Schritt (K)', ct, 'step', 100, 1, 5000, 10);
      addBehavior();
    } else if (dev.type === 'blind') {
      const level = ensureObject(dev.io, 'level', { readId: null, writeId: null, min: 0, max: 100, step: 1 });
      level.min = 0;
      level.max = 100;
      const cover = ensureObject(dev.io, 'cover', {
        positionId: null, upId: null, downId: null, stopId: null,
        tiltReadId: null, tiltWriteId: null, movingId: null, directionId: null,
        lockId: null, windAlarmId: null, rainAlarmId: null, frostAlarmId: null,
      });
      addDp('Position lesen (0…100)', level, 'readId');
      addDp('Position schreiben (0…100)', level, 'writeId');
      addDp('Auf / Richtung 0', cover, 'upId');
      addDp('Ab / Richtung 1', cover, 'downId');
      addDp('Stop', cover, 'stopId');
      addDp('Lamellenwinkel lesen (optional)', cover, 'tiltReadId');
      addDp('Lamellenwinkel schreiben (optional)', cover, 'tiltWriteId');
      addDp('Fährt (optional)', cover, 'movingId');
      addDp('Fahrtrichtung (optional)', cover, 'directionId');
      addDp('Sperre (optional)', cover, 'lockId');
      addDp('Windalarm (optional)', cover, 'windAlarmId');
      addDp('Regenalarm (optional)', cover, 'rainAlarmId');
      addDp('Frostalarm (optional)', cover, 'frostAlarmId');
      addBehavior();
      const hint = document.createElement('div');
      hint.className = 'nw-config-help';
      hint.textContent = '0 % = oben/offen, 100 % = unten/geschlossen. Bei aktiver Sperre, Wind-, Regen- oder Frostalarm blockiert die Bedienung außer Stop.';
      container.appendChild(nwCreateFieldRow('Sicherheit', hint));
    } else if (dev.type === 'rtr') {
      const climate = ensureObject(dev.io, 'climate', {
        currentTempId: null, setpointId: null, modeId: null, humidityId: null,
        powerId: null, fanSpeedId: null, swingId: null, demandId: null,
        windowId: null, errorId: null, minSetpoint: 15, maxSetpoint: 30, step: 0.5,
      });
      addDp('Ist-Temperatur', climate, 'currentTempId');
      addDp('Solltemperatur lesen/schreiben', climate, 'setpointId');
      addDp('Modus lesen/schreiben', climate, 'modeId');
      addDp('Luftfeuchtigkeit', climate, 'humidityId');
      addDp('Ein/Aus lesen/schreiben', climate, 'powerId');
      addDp('Lüfterstufe lesen/schreiben', climate, 'fanSpeedId');
      addDp('Swing lesen/schreiben', climate, 'swingId');
      addDp('Heiz-/Kühlanforderung', climate, 'demandId');
      addDp('Fenster offen / Sperre', climate, 'windowId');
      addDp('Fehlerstatus', climate, 'errorId');
      addNumber('Minimaler Sollwert (°C)', climate, 'minSetpoint', 15, -50, 100, 0.5);
      addNumber('Maximaler Sollwert (°C)', climate, 'maxSetpoint', 30, -50, 100, 0.5);
      addNumber('Sollwert-Schritt (°C)', climate, 'step', 0.5, 0.1, 10, 0.1);
      addBehavior();
    } else if (dev.type === 'sensor') {
      const sensor = ensureObject(dev.io, 'sensor', { readId: null, writeId: null, valueType: 'number', min: -1000000000, max: 1000000000, step: 1 });
      dev.ui = dev.ui || {};
      if (typeof dev.ui.unit !== 'string') dev.ui.unit = '';
      if (!Number.isFinite(Number(dev.ui.precision))) dev.ui.precision = 1;
      addDp('Wert lesen (readId)', sensor, 'readId');
      if ((dev.capabilities && dev.capabilities.writableValue) || !dev.behavior.readOnly || sensor.writeId) {
        dev.behavior.readOnly = false;
        addDp('Wert schreiben (writeId)', sensor, 'writeId');
        addSelect('Werttyp', sensor, 'valueType', [
          { value: 'number', label: 'Dezimalzahl' },
          { value: 'integer', label: 'Ganzzahl' },
          { value: 'boolean', label: 'Boolesch' },
          { value: 'string', label: 'Text' },
        ], 'number');
        if (!['boolean', 'string'].includes(String(sensor.valueType))) {
          addNumber('Minimum', sensor, 'min', -1000000000, -1000000000000, 1000000000000, 0.1);
          addNumber('Maximum', sensor, 'max', 1000000000, -1000000000000, 1000000000000, 0.1);
          addNumber('Schrittweite', sensor, 'step', 1, 0.000001, 1000000000000, 0.1);
        }
      }
      addSelect('Einheit', dev.ui, 'unit', NW_SHCFG_SENSOR_UNIT_OPTIONS, '');
      addSelect('Nachkommastellen', dev.ui, 'precision', NW_SHCFG_SENSOR_PRECISION_OPTIONS, '1');
      addBehavior();
    } else if (dev.type === 'player') {
      const player = ensureObject(dev.io, 'player', {
        playingId: null, titleId: null, artistId: null, sourceId: null, coverId: null,
        volumeReadId: null, volumeWriteId: null, volumeMin: 0, volumeMax: 100,
        toggleId: null, playId: null, pauseId: null, stopId: null, nextId: null, prevId: null,
        stationId: null, playlistId: null, muteReadId: null, muteWriteId: null,
        powerReadId: null, powerWriteId: null, seekReadId: null, seekWriteId: null,
        seekMin: 0, seekMax: 100, seekStep: 1,
        shuffleId: null, repeatId: null, ttsWriteId: null,
      });
      [
        ['Playing-Status', 'playingId'], ['Titel', 'titleId'], ['Interpret', 'artistId'], ['Quelle', 'sourceId'], ['Cover-URL', 'coverId'],
        ['Lautstärke lesen', 'volumeReadId'], ['Lautstärke schreiben', 'volumeWriteId'],
        ['Play/Pause umschalten', 'toggleId'], ['Play', 'playId'], ['Pause', 'pauseId'], ['Stop', 'stopId'],
        ['Nächster Titel', 'nextId'], ['Vorheriger Titel', 'prevId'], ['Sender wählen', 'stationId'], ['Playlist wählen', 'playlistId'],
        ['Mute lesen', 'muteReadId'], ['Mute schreiben', 'muteWriteId'], ['Power lesen', 'powerReadId'], ['Power schreiben', 'powerWriteId'],
        ['Position lesen', 'seekReadId'], ['Position schreiben', 'seekWriteId'], ['Shuffle', 'shuffleId'], ['Repeat', 'repeatId'],
        ['Text-to-Speech schreiben', 'ttsWriteId'],
      ].forEach(([label, key]) => addDp(label, player, key));
      addNumber('Lautstärke Minimum', player, 'volumeMin', 0, -1000000, 1000000, 1);
      addNumber('Lautstärke Maximum', player, 'volumeMax', 100, -1000000, 1000000, 1);
      addNumber('Position Minimum', player, 'seekMin', 0, -1000000, 1000000, 1);
      addNumber('Position Maximum', player, 'seekMax', 100, -1000000, 1000000, 1);
      addNumber('Position Schritt', player, 'seekStep', 1, 0.000001, 1000000, 0.1);
      addBehavior();
    } else if (dev.type === 'camera') {
      const camera = ensureObject(dev.io, 'camera', { snapshotUrl: '', liveUrl: '', refreshMs: 5000 });
      addText('Snapshot URL', camera, 'snapshotUrl', 'https://…');
      addText('Live URL', camera, 'liveUrl', 'https://…');
      addNumber('Aktualisierung (ms)', camera, 'refreshMs', 5000, 250, 3600000, 250);
    } else if (dev.type === 'widget') {
      const widget = ensureObject(dev.io, 'widget', { kind: 'iframe', url: '', openUrl: '', embed: true, height: 260, label: '' });
      addText('Bezeichnung', widget, 'label');
      addSelect('Darstellung', widget, 'kind', [
        { value: 'iframe', label: 'Eingebettetes Widget' },
        { value: 'url', label: 'URL in neuem Fenster öffnen' },
      ], 'iframe');
      addText('Widget-/Iframe-URL', widget, 'url', 'https://…');
      addText('URL öffnen', widget, 'openUrl', 'https://…');
      addNumber('Höhe (px)', widget, 'height', 260, 120, 2000, 10);
    }

    // Apply changes without full rerender on every dp change; user can press save.
    const note = document.createElement('div');
    note.className = 'nw-config-hint';
    note.style.marginTop = '8px';
    note.textContent = 'Hinweis: Änderungen werden lokal gespeichert. Nutze „Speichern“ oben, um sie dauerhaft zu übernehmen.';
    container.appendChild(note);
    return;
  }
}

/* --- Räume & Funktionen Editor (B7) --- */
/**
 * Code-Teil: nwSanitizeId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSanitizeId(raw) {
  if (raw === null || typeof raw === 'undefined') return '';
  let s = String(raw).trim().toLowerCase();
  const map = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
  s = s.replace(/[äöüß]/g, ch => map[ch] || ch);
  s = s.replace(/\s+/g, '-');
  s = s.replace(/[^a-z0-9_-]/g, '');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^[-_]+|[-_]+$/g, '');
  return s;
}
/**
 * Code-Teil: nwEnsureUniqueId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureUniqueId(items, desiredId, skipItem) {
  const list = Array.isArray(items) ? items : [];
  /**
   * Code-Teil: exists
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const exists = (candidate) => list.some(it => it && it.id === candidate && it !== skipItem);

  let base = nwSanitizeId(desiredId);
  if (!base) base = 'id';
  let out = base;

  let n = 2;
  while (!out || exists(out)) {
    out = base + '-' + n;
    n += 1;
  }
  return out;
}
/**
 * Code-Teil: nwNormalizeRoomFunctionOrder
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeRoomFunctionOrder() {
  if (!nwShcState.config) return;
  /**
   * Code-Teil: normalize
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const normalize = (arr, labelFn) => {
    const source = Array.isArray(arr) ? arr.slice() : [];
    const withIdx = source.map((it, idx) => ({ it, idx }));
    withIdx.sort((a, b) => {
      const ao = (a.it && typeof a.it.order === 'number') ? a.it.order : 999999;
      const bo = (b.it && typeof b.it.order === 'number') ? b.it.order : 999999;
      if (ao !== bo) return ao - bo;
      const al = labelFn(a.it) || '';
      const bl = labelFn(b.it) || '';
      if (al !== bl) return al.localeCompare(bl);
      return a.idx - b.idx;
    });
    const out = withIdx.map(x => x.it);
    out.forEach((it, i) => {
      if (it) it.order = i + 1;
    });
    return out;
  };

  // Räume werden pro Geschoss normalisiert (nicht global), damit "Kachel-in-Kachel" sauber bleibt.
  nwNormalizeRoomOrder();
  nwShcState.config.functions = normalize(nwShcState.config.functions, nwGetFunctionLabel);
}
/**
 * Code-Teil: nwMoveItem
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwMoveItem(arr, index, dir) {
  if (!Array.isArray(arr)) return;
  const to = index + dir;
  if (to < 0 || to >= arr.length) return;
  const item = arr.splice(index, 1)[0];
  arr.splice(to, 0, item);
  arr.forEach((it, i) => {
    if (it) it.order = i + 1;
  });
}
/**
 * Code-Teil: nwMoveItemTo
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwMoveItemTo(arr, fromIndex, toIndex) {
  if (!Array.isArray(arr)) return;
  const len = arr.length;
  if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return;
  let from = Math.trunc(fromIndex);
  let to = Math.trunc(toIndex);
  if (from < 0 || from >= len) return;
  if (to < 0) to = 0;
  if (to >= len) to = len - 1;
  if (from === to) return;

  const item = arr.splice(from, 1)[0];
  // If moved downwards, the target index shifts after removal.
  if (from < to) to -= 1;
  arr.splice(to, 0, item);
  arr.forEach((it, i) => {
    if (it) it.order = i + 1;
  });
}
/**
 * Code-Teil: nwReplaceRoomIdInDevices
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwReplaceRoomIdInDevices(oldId, newId) {
  if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
  nwShcState.config.devices.forEach(d => {
    if (d && d.roomId === oldId) d.roomId = newId;
  });
}
/**
 * Code-Teil: nwReplaceFunctionIdInDevices
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwReplaceFunctionIdInDevices(oldId, newId) {
  if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
  nwShcState.config.devices.forEach(d => {
    if (d && d.functionId === oldId) d.functionId = newId;
  });
}
/**
 * Code-Teil: nwAddRoom
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddRoom() {
  if (!nwShcState.config) return;
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];
  const desiredId = nwEnsureUniqueId(rooms, 'raum', null);
  const room = { id: desiredId, name: 'Neuer Raum', order: rooms.length + 1 };
  rooms.push(room);
  nwShcState.config.rooms = rooms;
  nwMarkDirty(true);
  nwRenderAll();
}
/**
 * Code-Teil: nwAddFunction
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddFunction() {
  if (!nwShcState.config) return;
  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];
  const desiredId = nwEnsureUniqueId(funcs, 'funktion', null);
  const fn = { id: desiredId, name: 'Neue Funktion', order: funcs.length + 1 };
  funcs.push(fn);
  nwShcState.config.functions = funcs;
  nwMarkDirty(true);
  nwRenderAll();
}
/**
 * Code-Teil: nwRenderRoomsEditor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderRoomsEditor(rooms) {
  const list = document.getElementById('nw-config-rooms');
  const empty = document.getElementById('nw-config-rooms-empty');
  if (!list || !empty) return;

  if (!nwShcState.config) return;

  const arr = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];

  list.innerHTML = '';

  if (!arr.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  arr.forEach((room, idx) => {
    if (!room) return;

    const row = document.createElement('div');
    row.className = 'nw-config-row';
    // used by validator focus/highlight
    row.dataset.nwEntity = 'room';
    row.dataset.nwIndex = String(idx);
    row.dataset.nwId = (room.id || '');

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'nw-config-input';
    idInput.value = room.id || '';
    idInput.placeholder = 'id (z.B. wohnzimmer)';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'nw-config-input';
    nameInput.value = room.name || '';
    nameInput.placeholder = 'Name (z.B. Wohnzimmer)';

    const actions = document.createElement('div');
    actions.className = 'nw-config-row__actions';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'nw-config-mini-btn';
    btnUp.textContent = '↑';
    btnUp.disabled = idx === 0;

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'nw-config-mini-btn';
    btnDown.textContent = '↓';
    btnDown.disabled = idx === arr.length - 1;

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'nw-config-mini-btn';
    btnDel.textContent = '✕';

    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDel);

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'blur' an idInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    idInput.addEventListener('blur', () => {
      const oldId = room.id || '';
      const desired = nwSanitizeId(idInput.value);
      if (!desired) {
        idInput.value = oldId;
        return;
      }
      const unique = nwEnsureUniqueId(arr, desired, room);
      if (unique !== desired) {
        nwSetStatus('Raum-ID existiert bereits. Bitte eine eindeutige ID vergeben.', 'error');
        idInput.value = oldId;
        return;
      }
      if (oldId !== desired) {
        room.id = desired;
        nwReplaceRoomIdInDevices(oldId, desired);
        nwMarkDirty(true);
        nwRenderAll();
      }
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an nameInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    nameInput.addEventListener('input', () => {
      room.name = nameInput.value;
      nwMarkDirty(true);
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnUp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnUp.addEventListener('click', () => {
      nwMoveItem(arr, idx, -1);
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnDown. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDown.addEventListener('click', () => {
      nwMoveItem(arr, idx, +1);
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnDel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDel.addEventListener('click', () => {
      const label = (room.name || room.id || 'Raum');
      if (!confirm('Raum „' + label + '“ löschen? Zugewiesene Geräte verlieren die Raumzuordnung.')) return;
      const oldId = room.id;
      arr.splice(idx, 1);
      arr.forEach((it, i) => { if (it) it.order = i + 1; });
      if (oldId) {
        nwReplaceRoomIdInDevices(oldId, null);
      }
      nwMarkDirty(true);
      nwRenderAll();
    });

    row.appendChild(idInput);
    row.appendChild(nameInput);
    row.appendChild(actions);

    list.appendChild(row);
  });
}
/**
 * Code-Teil: nwRenderFunctionsEditor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderFunctionsEditor(functions) {
  const list = document.getElementById('nw-config-functions');
  const empty = document.getElementById('nw-config-functions-empty');
  if (!list || !empty) return;

  if (!nwShcState.config) return;

  const arr = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];

  list.innerHTML = '';

  if (!arr.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  arr.forEach((fn, idx) => {
    if (!fn) return;

    const row = document.createElement('div');
    row.className = 'nw-config-row';
    // used by validator focus/highlight
    row.dataset.nwEntity = 'function';
    row.dataset.nwIndex = String(idx);
    row.dataset.nwId = (fn.id || '');

    const idInput = document.createElement('input');
    idInput.type = 'text';
    idInput.className = 'nw-config-input';
    idInput.value = fn.id || '';
    idInput.placeholder = 'id (z.B. licht)';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'nw-config-input';
    nameInput.value = fn.name || '';
    nameInput.placeholder = 'Name (z.B. Licht)';

    const actions = document.createElement('div');
    actions.className = 'nw-config-row__actions';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'nw-config-mini-btn';
    btnUp.textContent = '↑';
    btnUp.disabled = idx === 0;

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'nw-config-mini-btn';
    btnDown.textContent = '↓';
    btnDown.disabled = idx === arr.length - 1;

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'nw-config-mini-btn';
    btnDel.textContent = '✕';

    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDel);

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'blur' an idInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    idInput.addEventListener('blur', () => {
      const oldId = fn.id || '';
      const desired = nwSanitizeId(idInput.value);
      if (!desired) {
        idInput.value = oldId;
        return;
      }
      const unique = nwEnsureUniqueId(arr, desired, fn);
      if (unique !== desired) {
        nwSetStatus('Funktions-ID existiert bereits. Bitte eine eindeutige ID vergeben.', 'error');
        idInput.value = oldId;
        return;
      }
      if (oldId !== desired) {
        fn.id = desired;
        nwReplaceFunctionIdInDevices(oldId, desired);
        nwMarkDirty(true);
        nwRenderAll();
      }
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an nameInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    nameInput.addEventListener('input', () => {
      fn.name = nameInput.value;
      nwMarkDirty(true);
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnUp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnUp.addEventListener('click', () => {
      nwMoveItem(arr, idx, -1);
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnDown. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDown.addEventListener('click', () => {
      nwMoveItem(arr, idx, +1);
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnDel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDel.addEventListener('click', () => {
      const label = (fn.name || fn.id || 'Funktion');
      if (!confirm('Funktion „' + label + '“ löschen? Zugewiesene Geräte verlieren die Funktionszuordnung.')) return;
      const oldId = fn.id;
      arr.splice(idx, 1);
      arr.forEach((it, i) => { if (it) it.order = i + 1; });
      if (oldId) {
        nwReplaceFunctionIdInDevices(oldId, null);
      }
      nwMarkDirty(true);
      nwRenderAll();
    });

    row.appendChild(idInput);
    row.appendChild(nameInput);
    row.appendChild(actions);

    list.appendChild(row);
  });
}




/* --- Geräte/Kacheln Verwaltung (B8) --- */
/**
 * Code-Teil: nwNormalizeFloorOrder
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeFloorOrder() {
  if (!nwShcState.config) return;
  const floors = Array.isArray(nwShcState.config.floors) ? nwShcState.config.floors : (nwShcState.config.floors = []);

  // Ensure IDs + names
  floors.forEach((f, idx) => {
    if (!f) return;
    if (!f.id) {
      const seed = nwPagesSlugify(String(f.name || `floor-${idx + 1}`));
      f.id = nwEnsureUniqueId(floors, seed, f);
    }
    if (typeof f.name !== 'string' || !f.name.trim()) {
      f.name = f.id;
    }
    if (typeof f.icon !== 'string') {
      f.icon = '🏢';
    }
  });

  floors.sort(nwSortByOrder);
  floors.forEach((f, idx) => {
    if (f) f.order = idx + 1;
  });
}
/**
 * Code-Teil: nwNormalizeRoomOrder
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeRoomOrder() {
  if (!nwShcState.config) return;
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : (nwShcState.config.rooms = []);

  // Ensure IDs + names
  rooms.forEach((r, idx) => {
    if (!r) return;
    if (!r.id) {
      const seed = nwPagesSlugify(String(nwGetRoomLabel(r) || `room-${idx + 1}`));
      r.id = nwEnsureUniqueId(rooms, seed, r);
    }
    if (typeof r.name !== 'string' || !r.name.trim()) {
      r.name = r.id;
    }
  });

  // Group rooms by floorId (null = ohne Geschoss)
  const buckets = new Map();
  for (const r of rooms) {
    if (!r) continue;
    const fid = r.floorId || null;
    if (!buckets.has(fid)) buckets.set(fid, []);
    buckets.get(fid).push(r);
  }

  const orderedFloorIds = (Array.isArray(nwShcState.config.floors) ? nwShcState.config.floors : [])
    .slice()
    .sort(nwSortByOrder)
    .map(f => f.id);
  const floorOrder = [...orderedFloorIds, null];

  // Normalize per floor
  for (const fid of floorOrder) {
    const list = (buckets.get(fid) || []).sort(nwSortByOrder);
    list.forEach((r, idx) => r.order = idx + 1);
  }
}
/**
 * Code-Teil: nwNormalizeDeviceOrder
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeDeviceOrder() {
  if (!nwShcState.config) return;
  const arr = Array.isArray(nwShcState.config.devices) ? nwShcState.config.devices : [];
  arr.forEach((d, i) => {
    if (d) d.order = i + 1;
  });
}
/**
 * Code-Teil: nwEnsureUniqueDeviceId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureUniqueDeviceId(devices, desiredId) {
  const list = Array.isArray(devices) ? devices : [];
  let base = (desiredId === null || typeof desiredId === 'undefined') ? '' : String(desiredId);
  base = base.trim();
  if (!base) base = 'geraet';
  let out = base;
  let n = 2;
  while (list.some(d => d && d.id === out)) {
    out = base + '-' + n;
    n += 1;
  }
  return out;
}
/**
 * Code-Teil: nwAddDevice
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddDevice() {
  if (!nwShcState.config) return;
  const devices = Array.isArray(nwShcState.config.devices) ? nwShcState.config.devices : [];
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];
  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];

  const id = nwEnsureUniqueDeviceId(devices, 'geraet');
  const roomId = rooms.length ? (rooms[0] && rooms[0].id) : null;
  const functionId = funcs.length ? (funcs[0] && funcs[0].id) : null;

  const dev = {
    id,
    alias: 'Neues Gerät',
    type: 'switch',
    roomId: roomId || null,
    functionId: functionId || null,
    icon: '',
    size: 'm',
    behavior: { favorite: false, readOnly: false },
    io: { switch: { readId: null, writeId: null } },
  };

  devices.push(dev);
  nwShcState.config.devices = devices;
  nwNormalizeDeviceOrder();
  nwMarkDirty(true);
  nwRenderAll();
}


// Quick templates (installer speed): create a pre-filled device skeleton so the
// installer only needs to pick the datapoints.
/**
 * Code-Teil: nwAddDeviceFromTemplate
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddDeviceFromTemplate(templateId, opts = {}) {
  if (!nwShcState.config) return;

  const tid = String(templateId || '').trim();
  if (!tid) {
    nwSetStatus('Bitte zuerst eine Vorlage auswählen.', 'error');
    return;
  }

  const tpl = NW_SHCFG_BUILDER_DEVICE_TEMPLATES.find((row) => row.id === tid)
    || NW_SHCFG_BUILDER_DEVICE_TEMPLATES.find((row) => row.type === tid);
  let type = (tpl && tpl.type) ? String(tpl.type) : tid;
  if (!['switch', 'dimmer', 'color', 'blind', 'rtr', 'scene', 'sensor', 'player', 'camera', 'widget'].includes(type)) {
    type = 'switch';
  }

  const devices = Array.isArray(nwShcState.config.devices) ? nwShcState.config.devices : [];
  const rooms = Array.isArray(nwShcState.config.rooms) ? nwShcState.config.rooms : [];
  const funcs = Array.isArray(nwShcState.config.functions) ? nwShcState.config.functions : [];

  const explicitRoomId = (opts && typeof opts.roomId === 'string') ? opts.roomId : null;
  const hasFloorOpt = !!(opts && Object.prototype.hasOwnProperty.call(opts, 'floorId'));
  const explicitFloorId = hasFloorOpt ? opts.floorId : null;
  const roomId = explicitRoomId !== null
    ? nwShcfgNullIfEmpty(explicitRoomId)
    : (hasFloorOpt ? null : (rooms.length ? rooms[0].id : null));
  const floorId = !roomId ? nwShcfgNullIfEmpty(explicitFloorId) : null;
  const functionId = (opts && typeof opts.functionId === 'string')
    ? opts.functionId
    : (funcs.length ? funcs[0].id : null);

  const baseIdMap = {
    switch: 'schalter', color: 'farblicht', dimmer: 'dimmer', blind: 'jalousie',
    rtr: 'klima', player: 'player', sensor: 'wert', scene: 'szene', camera: 'kamera', widget: 'widget',
  };
  const aliasMap = {
    switch: 'Neuer Schalter', color: 'Neues Farb-Licht', dimmer: 'Neuer Dimmer', blind: 'Neue Jalousie',
    rtr: 'Neue Klimasteuerung', player: 'Audio-Player', sensor: 'Neuer Wert', scene: 'Neue Szene',
    camera: 'Neue Kamera', widget: 'Neues Widget',
  };
  const iconMap = {
    switch: '3d-toggle', color: '3d-bulb', dimmer: '3d-bulb', blind: '3d-blinds',
    rtr: '3d-thermostat', player: '3d-speaker', sensor: '3d-sensor', scene: '3d-scene',
    camera: '3d-camera', widget: '3d-grid',
  };

  const behavior = Object.assign({
    favorite: false,
    readOnly: false,
    invert: false,
    commandMode: type === 'scene' ? 'momentary' : 'toggle',
    pulseMs: 250,
    staleAfterSec: 0,
  }, (tpl && tpl.behavior) || {});
  const capabilities = Object.assign({}, (tpl && tpl.capabilities) || {});
  const dev = {
    id: nwEnsureUniqueDeviceId(devices, baseIdMap[type] || 'geraet'),
    alias: (tpl && tpl.name) ? tpl.name : (aliasMap[type] || 'Neues Gerät'),
    type,
    roomId: roomId || null,
    ...(hasFloorOpt ? { floorId: floorId || null } : {}),
    functionId: functionId || null,
    icon: (tpl && tpl.icon) ? tpl.icon : (iconMap[type] || ''),
    templateId: (tpl && tpl.id) ? tpl.id : undefined,
    size: (type === 'rtr' || type === 'camera' || type === 'widget') ? 'xl' : (type === 'player' ? 'l' : 'm'),
    behavior,
    capabilities,
    ui: {},
    io: {},
  };

  if (type === 'switch' || type === 'scene') {
    dev.io.switch = { readId: null, writeId: null };
  } else if (type === 'color') {
    dev.io.switch = { readId: null, writeId: null };
    dev.io.level = { readId: null, writeId: null, min: 0, max: 100, step: 1 };
    dev.io.color = { readId: null, writeId: null, format: 'hex' };
    if (capabilities.white) dev.io.white = { readId: null, writeId: null, min: 0, max: 100, step: 1 };
    if (capabilities.colorTemperature) {
      dev.io.colorTemperature = { readId: null, writeId: null, min: 2000, max: 6500, step: 100 };
    }
  } else if (type === 'dimmer') {
    dev.io.switch = { readId: null, writeId: null };
    dev.io.level = { readId: null, writeId: null, min: 0, max: 100, step: 1 };
    if (capabilities.colorTemperature) {
      dev.io.colorTemperature = { readId: null, writeId: null, min: 2000, max: 6500, step: 100 };
    }
  } else if (type === 'blind') {
    dev.io.level = { readId: null, writeId: null, min: 0, max: 100, step: 1 };
    dev.io.cover = {
      positionId: null,
      upId: null,
      downId: null,
      stopId: null,
      tiltReadId: null,
      tiltWriteId: null,
      movingId: null,
      directionId: null,
      lockId: null,
      windAlarmId: null,
      rainAlarmId: null,
      frostAlarmId: null,
    };
  } else if (type === 'rtr') {
    dev.io.climate = {
      currentTempId: null,
      setpointId: null,
      modeId: null,
      humidityId: null,
      powerId: null,
      fanSpeedId: null,
      swingId: null,
      demandId: null,
      windowId: null,
      errorId: null,
      minSetpoint: 15,
      maxSetpoint: 30,
      step: 0.5,
    };
  } else if (type === 'player') {
    dev.io.player = {
      playingId: null, titleId: null, artistId: null, sourceId: null, coverId: null,
      volumeReadId: null, volumeWriteId: null, volumeMin: 0, volumeMax: 100,
      toggleId: null, playId: null, pauseId: null, stopId: null, nextId: null, prevId: null,
      stationId: null, playlistId: null,
      muteReadId: null, muteWriteId: null,
      powerReadId: null, powerWriteId: null,
      seekReadId: null, seekWriteId: null, seekMin: 0, seekMax: 100, seekStep: 1,
      shuffleId: null, repeatId: null,
      ttsWriteId: null,
    };
    dev.stations = [];
    dev.playlists = [];
  } else if (type === 'camera') {
    dev.io.camera = { snapshotUrl: '', liveUrl: '', refreshMs: 5000 };
    dev.behavior.readOnly = true;
  } else if (type === 'widget') {
    dev.io.widget = {
      kind: tid === 'url_call' ? 'url' : 'iframe',
      url: '', openUrl: '', embed: tid === 'url_call' ? false : true, height: 260, label: '',
    };
    dev.behavior.readOnly = true;
  } else if (type === 'sensor') {
    const writableSpecs = {
      value_32bit_signed: { valueType: 'integer', min: -2147483648, max: 2147483647, step: 1 },
      value_32bit_unsigned: { valueType: 'integer', min: 0, max: 4294967295, step: 1 },
      value_8bit_unsigned: { valueType: 'integer', min: 0, max: 255, step: 1 },
      value_8bit_signed: { valueType: 'integer', min: -128, max: 127, step: 1 },
      value_decimal: { valueType: 'number', min: -1000000000, max: 1000000000, step: 0.1 },
      value_percent: { valueType: 'number', min: 0, max: 100, step: 1 },
      value_temperature: { valueType: 'number', min: -50, max: 100, step: 0.1 },
    };
    const spec = writableSpecs[tid] || { valueType: /text/i.test(String((tpl && tpl.meta) || '')) ? 'string' : 'number', min: -1000000000, max: 1000000000, step: 1 };
    const writable = !!(tpl && tpl.writableValue);
    dev.io.sensor = { readId: null, writeId: writable ? null : undefined, ...spec };
    dev.ui = Object.assign({}, nwShcfgDefaultSensorUiFromTemplate(tpl));
    dev.behavior.readOnly = !writable;
    dev.capabilities.writableValue = writable;
  }

  devices.push(dev);
  nwShcState.config.devices = devices;
  nwNormalizeDeviceOrder();
  nwMarkDirty(true);
  nwRenderAll();

  if (!opts || !opts.silent) {
    const sel = document.getElementById('nw-config-template-select');
    if (sel) sel.value = '';
  }
  return dev;
}
/**
 * Code-Teil: nwCreateFieldRow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateFieldRow(labelText, controlElem) {
  const row = document.createElement('div');
  row.className = 'nw-config-card__row nw-config-field-row';

  const label = document.createElement('div');
  label.className = 'nw-config-field-label';
  label.textContent = labelText;

  const ctlWrap = document.createElement('div');
  ctlWrap.className = 'nw-config-field-control';
  ctlWrap.appendChild(controlElem);

  row.appendChild(label);
  row.appendChild(ctlWrap);
  return row;
}


/* --- DP-Test (Installer) --- */
/**
 * Code-Teil: nwDpFormatValueShort
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDpFormatValueShort(val) {
  try {
    if (typeof val === 'undefined') return '—';
    if (val === null) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') {
      if (!Number.isFinite(val)) return String(val);
      // keep it compact: 0.00–99.99 => 2 decimals, otherwise round
      if (Math.abs(val) < 100) return (Math.round(val * 100) / 100).toString();
      return Math.round(val).toString();
    }
    if (typeof val === 'object') {
      const s = JSON.stringify(val);
      return s.length > 22 ? (s.slice(0, 21) + '…') : s;
    }
    const s = String(val);
    return s.length > 22 ? (s.slice(0, 21) + '…') : s;
  } catch (_e) {
    return String(val);
  }
}
/**
 * Code-Teil: nwDpGetState
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwDpGetState(dpId) {
  const id = String(dpId || '').trim();
  if (!id) return { ok: false, error: 'missing id' };
  try {
    const res = await fetch('/api/smarthome/dpget?id=' + encodeURIComponent(id), { cache: 'no-store' });
    if (!res.ok) return { ok: false, error: 'http_' + res.status };
    return await res.json().catch(() => ({ ok: false, error: 'invalid json' }));
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}
/**
 * Code-Teil: nwDpSetState
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwDpSetState(dpId, val) {
  const id = String(dpId || '').trim();
  if (!id) return { ok: false, error: 'missing id' };
  try {
    const res = await fetch('/api/smarthome/dpset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, val }),
    });
    if (!res.ok) return { ok: false, error: 'http_' + res.status };
    return await res.json().catch(() => ({ ok: false, error: 'invalid json' }));
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}
/**
 * Code-Teil: nwCreateDpInput
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateDpInput(labelText, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'nw-config-dp-input-wrapper';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'nw-config-input nw-config-dp-input';
  input.value = value || '';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  input.addEventListener('change', () => {
    onChange(input.value.trim());
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  input.addEventListener('input', () => {
    onChange(input.value.trim());
    nwMarkDirty(true);
  });

  const btnPick = document.createElement('button');
  btnPick.type = 'button';
  btnPick.className = 'nw-config-dp-button';
  btnPick.textContent = '…';
  btnPick.title = 'Datenpunkt auswählen';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPick. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnPick.addEventListener('click', () => {
    nwOpenDatapointDialog({
      title: labelText,
      initial: input.value,
      onSelect: (id) => {
        input.value = id || '';
        onChange(input.value.trim());
        nwMarkDirty(true);
      },
    });
  });

  const badge = document.createElement('span');
  badge.className = 'nw-config-badge nw-config-badge--idle';
  badge.textContent = '—';

  /**
   * Code-Teil: Arrow-Funktion `setBadge`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: setBadge
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setBadge = (kind, text) => {
    badge.classList.remove('nw-config-badge--ok', 'nw-config-badge--warn', 'nw-config-badge--error', 'nw-config-badge--idle');
    badge.classList.add('nw-config-badge--' + (kind || 'idle'));
    badge.textContent = text || '';
  };

  const btnTest = document.createElement('button');
  btnTest.type = 'button';
  btnTest.className = 'nw-config-dp-button';
  btnTest.textContent = 'Lesen';
  btnTest.title = 'Datenpunkt lesen';

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnTest. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnTest.addEventListener('click', async () => {
    const id = input.value.trim();
    if (!id) {
      setBadge('warn', 'kein DP');
      return;
    }
    setBadge('idle', 'Lese…');
    const data = await nwDpGetState(id);
    if (!data || !data.ok) {
      setBadge('error', 'Fehler');
      return;
    }
    const st = data.state;
    if (!st) {
      setBadge('warn', 'kein State');
      return;
    }
    const txt = nwDpFormatValueShort(st.val) + (st.ack ? ' ack' : '');
    setBadge('ok', txt);
  });

  const labelLower = String(labelText || '').toLowerCase();
  const allowWrite = (
    labelLower.includes('writeid') ||
    labelLower.includes('setpointid') ||
    labelLower.includes('upid') ||
    labelLower.includes('downid') ||
    labelLower.includes('stopid') ||
    labelLower.includes('modeid') ||
    labelLower.includes('playid') ||
    labelLower.includes('pauseid') ||
    labelLower.includes('toggleid') ||
    labelLower.includes('nextid') ||
    labelLower.includes('previd') ||
    labelLower.includes('stationid')
  );

  let btnSet = null;
  const canTestWrite = !!(window.NW_AUTH && typeof window.NW_AUTH.hasCapability === 'function' && window.NW_AUTH.hasCapability('smarthome.configure'));
  if (allowWrite && canTestWrite) {
    btnSet = document.createElement('button');
    btnSet.type = 'button';
    btnSet.className = 'nw-config-dp-button';
    btnSet.textContent = 'Schreiben';
    btnSet.title = 'Datenpunkt-Schreibtest (geschützter Expertenmodus)';

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnSet. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnSet.addEventListener('click', async () => {
      const id = input.value.trim();
      if (!id) {
        setBadge('warn', 'kein DP');
        return;
      }

      let val;
      // Jalousie/Rollladen: KNX/OpenKNX Richtung AUF=0, AB=1; Stop bleibt ein Trigger.
      if (labelLower.includes('upid') || labelLower.includes('downid') || labelLower.includes('stopid')) {
        if (labelLower.includes('upid')) val = 0;
        else if (labelLower.includes('downid')) val = 1;
        else val = true;
        const ok = confirm('Befehl an ' + id + ' senden?\n\nWert: ' + String(val));
        if (!ok) return;
      } else {
        const raw = prompt('Wert für ' + id + ' setzen:', '');
        if (raw === null) return;
        const t = String(raw).trim();
        if (t.toLowerCase() === 'true') val = true;
        else if (t.toLowerCase() === 'false') val = false;
        else {
          const num = parseFloat(t.replace(',', '.'));
          if (Number.isFinite(num) && t !== '') val = num;
          else val = t;
        }

        const ok = confirm('DP setzen?\n\n' + id + ' = ' + String(val));
        if (!ok) return;
      }

      setBadge('idle', 'Schreibe…');
      const wr = await nwDpSetState(id, val);
      if (!wr || !wr.ok) {
        setBadge('error', 'Fehler');
        return;
      }
      // re-read to show result (best-effort)
      const data = await nwDpGetState(id);
      if (data && data.ok && data.state) {
        const st = data.state;
        const txt = nwDpFormatValueShort(st.val) + (st.ack ? ' ack' : '');
        setBadge('ok', txt);
      } else {
        setBadge('ok', 'gesetzt');
      }
    });
  }

  wrapper.appendChild(input);
  wrapper.appendChild(btnPick);
  wrapper.appendChild(btnTest);
  if (btnSet) wrapper.appendChild(btnSet);
  wrapper.appendChild(badge);

  return nwCreateFieldRow(labelText, wrapper);
}
/**
 * Code-Teil: nwRenderDevicesEditor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderDevicesEditor(devices, rooms, functions) {
  const grid = document.getElementById('nw-config-devices');
  const empty = document.getElementById('nw-config-devices-empty');
  if (!grid || !empty) return;

  grid.innerHTML = '';

  if (!devices || !devices.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const roomMap = {};
  rooms.forEach(r => {
    if (r && r.id) roomMap[r.id] = r;
  });
  const fnMap = {};
  functions.forEach(f => {
    if (f && f.id) fnMap[f.id] = f;
  });

  devices.forEach((dev, index) => {
    const card = document.createElement('div');
    card.className = 'nw-config-card';
    card.dataset.nwEntity = 'device';
    card.dataset.nwIndex = String(index);
    card.dataset.nwId = (dev && dev.id) ? String(dev.id) : '';

    const header = document.createElement('div');
    header.className = 'nw-config-card__header';

    const title = document.createElement('div');
    title.className = 'nw-config-card__title';
    title.textContent = dev.alias || dev.id || 'Gerät';

    const headerTop = document.createElement('div');
    headerTop.className = 'nw-config-card__header-top';

    const actions = document.createElement('div');
    actions.className = 'nw-config-card__header-actions';

    // Drag handle (Drag&Drop ordering)
    const btnDrag = document.createElement('button');
    btnDrag.type = 'button';
    btnDrag.className = 'nw-config-mini-btn nw-config-drag-handle';
    btnDrag.textContent = '⠿';
    btnDrag.title = 'Reihenfolge ändern (Drag&Drop)';
    btnDrag.setAttribute('draggable', 'true');

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'nw-config-mini-btn';
    btnUp.textContent = '↑';
    btnUp.disabled = index === 0;

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'nw-config-mini-btn';
    btnDown.textContent = '↓';
    btnDown.disabled = index === devices.length - 1;

    const btnDup = document.createElement('button');
    btnDup.type = 'button';
    btnDup.className = 'nw-config-mini-btn';
    btnDup.textContent = '⧉';
    btnDup.title = 'Duplizieren';

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'nw-config-mini-btn';
    btnDel.textContent = '✕';
    btnDel.title = 'Löschen';

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnUp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnUp.addEventListener('click', () => {
      nwMoveItem(nwShcState.config.devices, index, -1);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnDown. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDown.addEventListener('click', () => {
      nwMoveItem(nwShcState.config.devices, index, +1);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnDup. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDup.addEventListener('click', () => {
      if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
      const src = nwShcState.config.devices[index];
      const clone = JSON.parse(JSON.stringify(src || {}));
      const baseId = (clone && clone.id) ? (String(clone.id) + '-copy') : 'geraet-copy';
      clone.id = nwEnsureUniqueDeviceId(nwShcState.config.devices, baseId);
      if (clone.alias) clone.alias = String(clone.alias) + ' (Kopie)';
      nwShcState.config.devices.splice(index + 1, 0, clone);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnDel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDel.addEventListener('click', () => {
      const label = dev.alias || dev.id || 'Gerät';
      if (!confirm('Gerät „' + label + '“ löschen?')) return;
      if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
      nwShcState.config.devices.splice(index, 1);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    // Drag&Drop: start drag from handle, drop on cards
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragstart' an btnDrag. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDrag.addEventListener('dragstart', (ev) => {
      nwDragDeviceFromIndex = index;
      try {
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', String(index));
      } catch (_e) {}
      card.classList.add('nw-drag-src');
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragend' an btnDrag. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnDrag.addEventListener('dragend', () => {
      nwDragDeviceFromIndex = null;
      card.classList.remove('nw-drag-src');
      // cleanup potential hover states
      document.querySelectorAll('.nw-drag-over').forEach(el => el.classList.remove('nw-drag-over'));
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragover' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    card.addEventListener('dragover', (ev) => {
      // allow drop
      ev.preventDefault();
      card.classList.add('nw-drag-over');
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragleave' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    card.addEventListener('dragleave', () => {
      card.classList.remove('nw-drag-over');
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'drop' an card. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    card.addEventListener('drop', (ev) => {
      ev.preventDefault();
      card.classList.remove('nw-drag-over');

      // Determine source index
      let from = (typeof nwDragDeviceFromIndex === 'number') ? nwDragDeviceFromIndex : null;
      if (from === null) {
        try {
          const raw = ev.dataTransfer.getData('text/plain');
          const n = parseInt(String(raw || ''), 10);
          if (Number.isFinite(n)) from = n;
        } catch (_e) {}
      }
      const to = index;
      if (from === null || !Number.isFinite(from)) return;
      if (from === to) return;

      if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
      nwMoveItemTo(nwShcState.config.devices, from, to);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });

    actions.appendChild(btnDrag);
    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDup);
    actions.appendChild(btnDel);

    headerTop.appendChild(title);
    headerTop.appendChild(actions);

    const subtitle = document.createElement('div');
    subtitle.className = 'nw-config-card__subtitle';
    const room = roomMap[dev.roomId];
    const fn = fnMap[dev.functionId];
    const roomLabel = room ? nwGetRoomLabel(room) : (dev.roomId || 'Raum?');
    const fnLabel = fn ? nwGetFunctionLabel(fn) : (dev.functionId || 'Funktion?');
    const typeLabel = nwGetTypeLabel(dev.type);
    subtitle.textContent = roomLabel + ' · ' + fnLabel + ' · ' + typeLabel;

    header.appendChild(headerTop);
    header.appendChild(subtitle);
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'nw-config-card__body';

    // ID (read-only)
    const idRow = document.createElement('div');
    idRow.className = 'nw-config-card__row';
    idRow.textContent = 'ID: ' + (dev.id || '(ohne ID)');
    body.appendChild(idRow);

    // Reihenfolge (Sortier-Index) – moves the card to the desired position
    const orderInput = document.createElement('input');
    orderInput.type = 'number';
    orderInput.className = 'nw-config-input';
    orderInput.min = '1';
    orderInput.max = String(devices.length);
    orderInput.step = '1';
    orderInput.value = String((typeof dev.order === 'number') ? dev.order : (index + 1));
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an orderInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    orderInput.addEventListener('change', () => {
      const raw = parseInt(String(orderInput.value || ''), 10);
      if (!Number.isFinite(raw)) {
        orderInput.value = String(index + 1);
        return;
      }
      const targetPos = Math.max(1, Math.min(devices.length, raw));
      const toIdx = targetPos - 1;
      if (toIdx === index) return;
      if (!nwShcState.config || !Array.isArray(nwShcState.config.devices)) return;
      nwMoveItemTo(nwShcState.config.devices, index, toIdx);
      nwNormalizeDeviceOrder();
      nwMarkDirty(true);
      nwRenderAll();
    });
    body.appendChild(nwCreateFieldRow('Reihenfolge', orderInput));

    // Alias
    const aliasInput = document.createElement('input');
    aliasInput.type = 'text';
    aliasInput.className = 'nw-config-input';
    aliasInput.value = dev.alias || '';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an aliasInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    aliasInput.addEventListener('input', () => {
      nwShcState.config.devices[index].alias = aliasInput.value;
      title.textContent = aliasInput.value || dev.id || 'Gerät';
      nwMarkDirty(true);
    });
    body.appendChild(nwCreateFieldRow('Alias', aliasInput));

    // Typ
    const typeSelect = document.createElement('select');
    typeSelect.className = 'nw-config-select';
    const typeOptions = [
      { value: '', label: '(kein Typ)' },
      { value: 'switch', label: 'Schalter' },
      { value: 'color', label: 'Farb‑Licht (RGB)' },
      { value: 'dimmer', label: 'Dimmer' },
      { value: 'blind', label: 'Jalousie / Rollladen' },
      { value: 'rtr', label: 'Heizung (RTR)' },
      { value: 'player', label: 'Audio-Player' },
      { value: 'camera', label: 'Kamera' },
      { value: 'widget', label: 'Widget (Universal)' },
      { value: 'sensor', label: 'Sensor' },
      { value: 'scene', label: 'Szene' },
      { value: 'logicStatus', label: 'Logik-Status' },
    ];
    typeOptions.forEach(optDef => {
      const opt = document.createElement('option');
      opt.value = optDef.value;
      opt.textContent = optDef.label;
      if ((dev.type || '') === optDef.value) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an typeSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    typeSelect.addEventListener('change', () => {
      const t = typeSelect.value || null;
      const d = nwShcState.config.devices[index];
      d.type = t;
      d.io = d.io || {};
      // Beim Typwechsel passende IO-Struktur anlegen (damit Felder sofort erscheinen)
      if (t === 'switch' || t === 'scene' || t === 'logicStatus') {
        d.io.switch = d.io.switch || { readId: null, writeId: null };
      } else if (t === 'color') {
        d.io.switch = d.io.switch || { readId: null, writeId: null };
        d.io.level = d.io.level || { readId: null, writeId: null, min: 0, max: 100, step: 1 };
        d.io.color = d.io.color || { readId: null, writeId: null, format: 'hex' };
        d.io.white = d.io.white || { readId: null, writeId: null, min: 0, max: 100, step: 1 };
        d.io.colorTemperature = d.io.colorTemperature || { readId: null, writeId: null, min: 2000, max: 6500, step: 100 };
      } else if (t === 'dimmer') {
        d.io.switch = d.io.switch || { readId: null, writeId: null };
        d.io.level = d.io.level || { readId: null, writeId: null, min: 0, max: 100, step: 1 };
        d.io.colorTemperature = d.io.colorTemperature || { readId: null, writeId: null, min: 2000, max: 6500, step: 100 };
      } else if (t === 'blind') {
        d.io.level = d.io.level || { readId: null, writeId: null, min: 0, max: 100, step: 1 };
        d.io.level.min = 0;
        d.io.level.max = 100;
        d.io.cover = d.io.cover || {
          positionId: null, upId: null, downId: null, stopId: null,
          tiltReadId: null, tiltWriteId: null, movingId: null, directionId: null,
          lockId: null, windAlarmId: null, rainAlarmId: null, frostAlarmId: null,
        };
      } else if (t === 'rtr') {
        d.io.climate = d.io.climate || {
          currentTempId: null, setpointId: null, modeId: null, humidityId: null,
          powerId: null, fanSpeedId: null, swingId: null, demandId: null,
          windowId: null, errorId: null, minSetpoint: 15, maxSetpoint: 30, step: 0.5,
        };
      } else if (t === 'camera') {
        d.io.camera = d.io.camera || { snapshotUrl: '', liveUrl: '', refreshMs: 5000 };
        d.behavior = d.behavior || {};
        d.behavior.readOnly = true;
      } else if (t === 'widget') {
        d.io.widget = d.io.widget || { kind: 'iframe', url: '', openUrl: '', embed: true, height: 260, label: '' };
        d.behavior = d.behavior || {};
        d.behavior.readOnly = true;
      } else if (t === 'sensor') {
        d.io.sensor = d.io.sensor || { readId: null, writeId: null, valueType: 'number', min: -1000000000, max: 1000000000, step: 1 };
        d.ui = d.ui || {};
        if (typeof d.ui.unit !== 'string') d.ui.unit = '';
        if (typeof d.ui.precision !== 'number') d.ui.precision = 1;
        d.behavior = d.behavior || {};
        d.behavior.readOnly = true;
      } else if (t === 'player') {
        d.io.player = d.io.player || {
          playingId: null, titleId: null, artistId: null, sourceId: null, coverId: null,
          volumeReadId: null, volumeWriteId: null, volumeMin: 0, volumeMax: 100,
          toggleId: null, playId: null, pauseId: null, stopId: null, nextId: null, prevId: null,
          stationId: null, playlistId: null,
          muteReadId: null, muteWriteId: null, powerReadId: null, powerWriteId: null,
          seekReadId: null, seekWriteId: null, seekMin: 0, seekMax: 100, seekStep: 1, shuffleId: null, repeatId: null, ttsWriteId: null,
        };
        d.stations = Array.isArray(d.stations) ? d.stations : [];
        d.playlists = Array.isArray(d.playlists) ? d.playlists : [];
      }
      nwMarkDirty(true);
      nwRenderAll(); // Neu rendern, damit IO-Zeilen ggf. angepasst werden
    });
    body.appendChild(nwCreateFieldRow('Typ', typeSelect));

    // Raum
    const roomSelect = document.createElement('select');
    roomSelect.className = 'nw-config-select';
    const roomOptNone = document.createElement('option');
    roomOptNone.value = '';
    roomOptNone.textContent = '(kein Raum)';
    roomSelect.appendChild(roomOptNone);
    rooms
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id || '';
        opt.textContent = nwGetRoomLabel(r) || r.id || '(ohne ID)';
        if (dev.roomId && dev.roomId === opt.value) opt.selected = true;
        roomSelect.appendChild(opt);
      });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an roomSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    roomSelect.addEventListener('change', () => {
      const val = roomSelect.value || null;
      nwShcState.config.devices[index].roomId = val;
      nwMarkDirty(true);
      nwRenderAll();
    });
    body.appendChild(nwCreateFieldRow('Raum', roomSelect));

    // Funktion
    const fnSelect = document.createElement('select');
    fnSelect.className = 'nw-config-select';
    const fnOptNone = document.createElement('option');
    fnOptNone.value = '';
    fnOptNone.textContent = '(keine Funktion)';
    fnSelect.appendChild(fnOptNone);
    functions
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id || '';
        opt.textContent = nwGetFunctionLabel(f) || f.id || '(ohne ID)';
        if (dev.functionId && dev.functionId === opt.value) opt.selected = true;
        fnSelect.appendChild(opt);
      });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an fnSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    fnSelect.addEventListener('change', () => {
      const val = fnSelect.value || null;
      nwShcState.config.devices[index].functionId = val;
      nwMarkDirty(true);
      nwRenderAll();
    });
    body.appendChild(nwCreateFieldRow('Funktion', fnSelect));

    // Kachelgröße (Layout)
    const sizeSelect = document.createElement('select');
    sizeSelect.className = 'nw-config-select';
    const sizeOptions = [
      { value: 's', label: 'S (klein)' },
      { value: 'm', label: 'M (normal)' },
      { value: 'l', label: 'L (breit)' },
      { value: 'xl', label: 'XL (groß)' },
    ];
    sizeOptions.forEach(def => {
      const opt = document.createElement('option');
      opt.value = def.value;
      opt.textContent = def.label;
      if ((dev.size || 'm') === def.value) opt.selected = true;
      sizeSelect.appendChild(opt);
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an sizeSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    sizeSelect.addEventListener('change', () => {
      nwShcState.config.devices[index].size = sizeSelect.value || 'm';
      nwMarkDirty(true);
    });
    body.appendChild(nwCreateFieldRow('Kachelgröße', sizeSelect));

    // Icon (Dropdown + Vorschau, optional benutzerdefiniert)
    const iconSelect = document.createElement('select');
    iconSelect.className = 'nw-config-select';

    const iconOptions = [
      { value: '', label: '(leer / automatisch)' },
      { value: 'bulb', label: '💡 Licht (bulb)' },
      { value: 'plug', label: '🔌 Steckdose (plug)' },
      { value: 'fire', label: '🔥 Kamin (fire)' },
      { value: 'thermostat', label: '🌡️ Heizung (thermostat)' },
      { value: 'thermometer', label: '🌡️ Temperatur (thermometer)' },
      { value: 'blinds', label: '🪟 Jalousie (blinds)' },
      { value: 'tv', label: '📺 Fernseher (tv)' },
      { value: 'speaker', label: '🔊 Audio (speaker)' },
      { value: 'camera', label: '📷 Kamera (camera)' },
      { value: 'grid', label: '🧩 Widget (grid)' },
      { value: 'scene', label: '✨ Szene (scene)' },
      { value: 'sensor', label: '📍 Sensor (sensor)' },
      { value: 'generic', label: '⬜ Allgemein (generic)' },
      { value: '__custom__', label: 'Benutzerdefiniert…' },
    ];

    iconOptions.forEach(def => {
      const opt = document.createElement('option');
      opt.value = def.value;
      opt.textContent = def.label;
      iconSelect.appendChild(opt);
    });

    const iconCustomInput = document.createElement('input');
    iconCustomInput.type = 'text';
    iconCustomInput.className = 'nw-config-input';
    iconCustomInput.placeholder = 'Benutzerdefiniert: Icon-Name (z. B. bulb) oder Emoji';
    iconCustomInput.autocomplete = 'off';
    iconCustomInput.style.display = 'none';

    const iconPreview = document.createElement('div');
    iconPreview.className = 'nw-config-icon-preview';

    /**
     * Code-Teil: Arrow-Funktion `setCustomVisible`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setCustomVisible
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setCustomVisible = (on) => {
      iconCustomInput.style.display = on ? 'block' : 'none';
    };
    /**
     * Code-Teil: syncIconUi
     * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const syncIconUi = () => {
      const raw = String((nwShcState.config.devices[index] && nwShcState.config.devices[index].icon) || '').trim();
      const key = nwShcNormalizeIconName(raw);
      const known = !!(key && iconOptions.some(o => o.value === key && o.value !== '__custom__'));

      if (!raw) {
        iconSelect.value = '';
        iconCustomInput.value = '';
        setCustomVisible(false);
      } else if (known) {
        iconSelect.value = key;
        iconCustomInput.value = raw;
        setCustomVisible(false);
      } else {
        iconSelect.value = '__custom__';
        iconCustomInput.value = raw;
        setCustomVisible(true);
      }

      nwShcRenderIconPreview(iconPreview, raw);
    };

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an iconSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    iconSelect.addEventListener('change', () => {
      const val = String(iconSelect.value || '');
      if (val === '__custom__') {
        setCustomVisible(true);
        const raw = String((nwShcState.config.devices[index] && nwShcState.config.devices[index].icon) || '').trim();
        iconCustomInput.value = raw;
        nwShcState.config.devices[index].icon = raw || null;
      } else {
        setCustomVisible(false);
        iconCustomInput.value = val;
        nwShcState.config.devices[index].icon = val || null;
      }
      nwMarkDirty(true);
      syncIconUi();
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an iconCustomInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    iconCustomInput.addEventListener('input', () => {
      const v = String(iconCustomInput.value || '').trim();
      nwShcState.config.devices[index].icon = v || null;
      nwMarkDirty(true);
      syncIconUi();
    });

    // Initial
    syncIconUi();

    const iconWrap = document.createElement('div');
    iconWrap.className = 'nw-config-icon-row';

    const iconTop = document.createElement('div');
    iconTop.className = 'nw-config-icon-row__top';
    iconTop.appendChild(iconSelect);
    iconTop.appendChild(iconPreview);

    iconWrap.appendChild(iconTop);
    iconWrap.appendChild(iconCustomInput);

    body.appendChild(nwCreateFieldRow('Icon', iconWrap));

    // Verhalten: readOnly / favorite
    const behRow = document.createElement('div');
    behRow.className = 'nw-config-card__row nw-config-field-row';

    const behLabel = document.createElement('div');
    behLabel.className = 'nw-config-field-label';
    behLabel.textContent = 'Verhalten';
    behRow.appendChild(behLabel);

    const behCtl = document.createElement('div');
    behCtl.className = 'nw-config-field-control';

    const readOnlyLabel = document.createElement('label');
    readOnlyLabel.style.display = 'flex';
    readOnlyLabel.style.alignItems = 'center';
    readOnlyLabel.style.gap = '4px';
    const roCb = document.createElement('input');
    roCb.type = 'checkbox';
    roCb.className = 'nw-config-checkbox';
    roCb.checked = !!(dev.behavior && dev.behavior.readOnly);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an roCb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    roCb.addEventListener('change', () => {
      const beh = nwShcState.config.devices[index].behavior || {};
      beh.readOnly = !!roCb.checked;
      nwShcState.config.devices[index].behavior = beh;
      nwMarkDirty(true);
    });
    const roText = document.createElement('span');
    roText.textContent = 'Nur Anzeige';

    readOnlyLabel.appendChild(roCb);
    readOnlyLabel.appendChild(roText);

    const favLabel = document.createElement('label');
    favLabel.style.display = 'flex';
    favLabel.style.alignItems = 'center';
    favLabel.style.gap = '4px';
    const favCb = document.createElement('input');
    favCb.type = 'checkbox';
    favCb.className = 'nw-config-checkbox';
    favCb.checked = !!(dev.behavior && dev.behavior.favorite);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an favCb. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    favCb.addEventListener('change', () => {
      const beh = nwShcState.config.devices[index].behavior || {};
      beh.favorite = !!favCb.checked;
      nwShcState.config.devices[index].behavior = beh;
      nwMarkDirty(true);
    });
    const favText = document.createElement('span');
    favText.textContent = 'Favorit';

    favLabel.appendChild(favCb);
    favLabel.appendChild(favText);

    behCtl.appendChild(readOnlyLabel);
    behCtl.appendChild(favLabel);
    behRow.appendChild(behCtl);
    body.appendChild(behRow);

    // Einheitlicher Bedien- und Qualitätsvertrag für alle Kacheln.
    dev.behavior = dev.behavior || {};
    if (['switch', 'scene'].includes(String(dev.type || '').toLowerCase())) {
      const commandMode = document.createElement('select');
      commandMode.className = 'nw-config-select';
      [
        ['toggle', 'Umschalten'],
        ['set', 'Explizit Ein/Aus'],
        ['momentary', 'Taster/Impuls'],
      ].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        commandMode.appendChild(option);
      });
      commandMode.value = ['toggle', 'set', 'momentary'].includes(String(dev.behavior.commandMode || ''))
        ? String(dev.behavior.commandMode)
        : (String(dev.type).toLowerCase() === 'scene' ? 'momentary' : 'toggle');
      commandMode.addEventListener('change', () => {
        nwShcState.config.devices[index].behavior = nwShcState.config.devices[index].behavior || {};
        nwShcState.config.devices[index].behavior.commandMode = commandMode.value;
        nwMarkDirty(true);
        nwRenderAll();
      });
      body.appendChild(nwCreateFieldRow('Befehlsart', commandMode));

      if (commandMode.value === 'momentary' || String(dev.type).toLowerCase() === 'scene') {
        const pulse = document.createElement('input');
        pulse.type = 'number';
        pulse.className = 'nw-config-input';
        pulse.min = '50';
        pulse.max = '60000';
        pulse.step = '50';
        pulse.value = String(Number.isFinite(Number(dev.behavior.pulseMs)) ? Number(dev.behavior.pulseMs) : 250);
        pulse.addEventListener('change', () => {
          const value = Math.max(50, Math.min(60000, Number(pulse.value) || 250));
          nwShcState.config.devices[index].behavior = nwShcState.config.devices[index].behavior || {};
          nwShcState.config.devices[index].behavior.pulseMs = value;
          pulse.value = String(value);
          nwMarkDirty(true);
        });
        body.appendChild(nwCreateFieldRow('Impulsdauer (ms)', pulse));
      }
    }

    const stale = document.createElement('input');
    stale.type = 'number';
    stale.className = 'nw-config-input';
    stale.min = '0';
    stale.max = '604800';
    stale.step = '1';
    stale.value = String(Number.isFinite(Number(dev.behavior.staleAfterSec)) ? Number(dev.behavior.staleAfterSec) : 0);
    stale.addEventListener('change', () => {
      const value = Math.max(0, Math.min(604800, Number(stale.value) || 0));
      nwShcState.config.devices[index].behavior = nwShcState.config.devices[index].behavior || {};
      nwShcState.config.devices[index].behavior.staleAfterSec = value;
      stale.value = String(value);
      nwMarkDirty(true);
    });
    body.appendChild(nwCreateFieldRow('Veraltet nach (s) · 0 = aus', stale));

    // IO-Konfigurationen
    const io = dev.io || {};

    if (io.switch) {
      const s = io.switch;
      const readRow = nwCreateDpInput('Schalter lesen (readId)', s.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.switch = nwShcState.config.devices[index].io.switch || {};
        nwShcState.config.devices[index].io.switch.readId = val || null;
      });
      const writeRow = nwCreateDpInput('Schalter schreiben (writeId)', s.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.switch = nwShcState.config.devices[index].io.switch || {};
        nwShcState.config.devices[index].io.switch.writeId = val || null;
      });
      body.appendChild(readRow);
      body.appendChild(writeRow);
    }

    if (io.level) {
      const l = io.level;
      const isBlindLevel = String(dev.type || '').toLowerCase() === 'blind';
      if (isBlindLevel) {
        l.min = 0;
        l.max = 100;
      }
      const readRow = nwCreateDpInput(isBlindLevel ? 'Position lesen / Status (readId)' : 'Wert/Position lesen (readId)', l.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.readId = val || null;
        if (isBlindLevel) {
          nwShcState.config.devices[index].io.level.min = 0;
          nwShcState.config.devices[index].io.level.max = 100;
        }
      });
      const writeRow = nwCreateDpInput(isBlindLevel ? 'Position schreiben (writeId)' : 'Wert/Position schreiben (writeId)', l.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.writeId = val || null;
        if (isBlindLevel) {
          nwShcState.config.devices[index].io.level.min = 0;
          nwShcState.config.devices[index].io.level.max = 100;
        }
      });

      const minMaxCtl = document.createElement('div');
      minMaxCtl.style.display = 'flex';
      minMaxCtl.style.gap = '4px';
      minMaxCtl.style.width = '100%';

      const minInput = document.createElement('input');
      minInput.type = 'number';
      minInput.className = 'nw-config-input';
      minInput.placeholder = 'Min';
      if (typeof l.min === 'number') minInput.value = String(l.min);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an minInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      minInput.addEventListener('change', () => {
        const v = minInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.min = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.className = 'nw-config-input';
      maxInput.placeholder = 'Max';
      if (typeof l.max === 'number') maxInput.value = String(l.max);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an maxInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      maxInput.addEventListener('change', () => {
        const v = maxInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.level = nwShcState.config.devices[index].io.level || {};
        nwShcState.config.devices[index].io.level.max = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      minMaxCtl.appendChild(minInput);
      minMaxCtl.appendChild(maxInput);

      const minMaxRow = nwCreateFieldRow('Bereich min/max', minMaxCtl);

      body.appendChild(readRow);
      body.appendChild(writeRow);
      if (isBlindLevel) {
        const rangeHint = document.createElement('div');
        rangeHint.className = 'nw-config-help';
        rangeHint.textContent = 'Jalousie/Rollladen: Bereich ist fest 0–100 %. 0 = oben/offen, 100 = unten/geschlossen bzw. passend zur Aktor-Rückmeldung.';
        body.appendChild(nwCreateFieldRow('Bereich', rangeHint));
      } else {
        body.appendChild(minMaxRow);
      }
    }

    if (io.cover) {
      const c = io.cover;
      const upRow = nwCreateDpInput('Taster Auf / Richtung 0 (upId)', c.upId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
        nwShcState.config.devices[index].io.cover.upId = val || null;
      });
      const downRow = nwCreateDpInput('Taster Ab / Richtung 1 (downId)', c.downId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
        nwShcState.config.devices[index].io.cover.downId = val || null;
      });
      const stopRow = nwCreateDpInput('Taster Stop (stopId)', c.stopId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
        nwShcState.config.devices[index].io.cover.stopId = val || null;
      });
      body.appendChild(upRow);
      body.appendChild(downRow);
      body.appendChild(stopRow);
      [
        ['Lamellenwinkel lesen (tiltReadId)', 'tiltReadId'],
        ['Lamellenwinkel schreiben (tiltWriteId)', 'tiltWriteId'],
        ['Fährt (movingId)', 'movingId'],
        ['Fahrtrichtung (directionId)', 'directionId'],
        ['Sperre (lockId)', 'lockId'],
        ['Windalarm (windAlarmId)', 'windAlarmId'],
        ['Regenalarm (rainAlarmId)', 'rainAlarmId'],
        ['Frostalarm (frostAlarmId)', 'frostAlarmId'],
      ].forEach(([label, key]) => {
        body.appendChild(nwCreateDpInput(label, c[key] || '', (val) => {
          nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
          nwShcState.config.devices[index].io.cover = nwShcState.config.devices[index].io.cover || {};
          nwShcState.config.devices[index].io.cover[key] = val || null;
        }));
      });
      if (String(dev.type || '').toLowerCase() === 'blind') {
        const hint = document.createElement('div');
        hint.className = 'nw-config-help';
        hint.textContent = 'Jalousie: Positions-Slider/Status immer 0–100 %. Auf schreibt 0/false, Ab schreibt 1/true. Bei einem KNX-Richtungs-DP denselben DP bei Auf und Ab eintragen.';
        body.appendChild(hint);
      }
    }

    if (io.climate) {
      const cl = io.climate;
      const curRow = nwCreateDpInput('Klima Ist-Temperatur (currentTempId)', cl.currentTempId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.currentTempId = val || null;
      });
      const spRow = nwCreateDpInput('Klima Sollwert (setpointId)', cl.setpointId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.setpointId = val || null;
      });
      const modeRow = nwCreateDpInput('Klima Modus (modeId)', cl.modeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.modeId = val || null;
      });
      const humRow = nwCreateDpInput('Klima Luftfeuchte (humidityId)', cl.humidityId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.humidityId = val || null;
      });

      const minMaxCtl = document.createElement('div');
      minMaxCtl.style.display = 'flex';
      minMaxCtl.style.gap = '4px';
      minMaxCtl.style.width = '100%';

      const minSpInput = document.createElement('input');
      minSpInput.type = 'number';
      minSpInput.className = 'nw-config-input';
      minSpInput.placeholder = 'Min. °C';
      if (typeof cl.minSetpoint === 'number') minSpInput.value = String(cl.minSetpoint);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an minSpInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      minSpInput.addEventListener('change', () => {
        const v = minSpInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.minSetpoint = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      const maxSpInput = document.createElement('input');
      maxSpInput.type = 'number';
      maxSpInput.className = 'nw-config-input';
      maxSpInput.placeholder = 'Max. °C';
      if (typeof cl.maxSetpoint === 'number') maxSpInput.value = String(cl.maxSetpoint);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an maxSpInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      maxSpInput.addEventListener('change', () => {
        const v = maxSpInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.maxSetpoint = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      minMaxCtl.appendChild(minSpInput);
      minMaxCtl.appendChild(maxSpInput);

      const minMaxRow = nwCreateFieldRow('Sollwert min/max', minMaxCtl);

      body.appendChild(curRow);
      body.appendChild(spRow);
      body.appendChild(modeRow);
      body.appendChild(humRow);
      [
        ['Klima Ein/Aus (powerId)', 'powerId'],
        ['Lüfterstufe (fanSpeedId)', 'fanSpeedId'],
        ['Swing (swingId)', 'swingId'],
        ['Heiz-/Kühlanforderung (demandId)', 'demandId'],
        ['Fensterkontakt/Sperre (windowId)', 'windowId'],
        ['Fehlerstatus (errorId)', 'errorId'],
      ].forEach(([label, key]) => {
        body.appendChild(nwCreateDpInput(label, cl[key] || '', (val) => {
          nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
          nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
          nwShcState.config.devices[index].io.climate[key] = val || null;
        }));
      });
      body.appendChild(minMaxRow);

      const stepInput = document.createElement('input');
      stepInput.type = 'number';
      stepInput.className = 'nw-config-input';
      stepInput.min = '0.1';
      stepInput.max = '10';
      stepInput.step = '0.1';
      stepInput.value = String(Number.isFinite(Number(cl.step)) ? Number(cl.step) : 0.5);
      stepInput.addEventListener('change', () => {
        const value = Math.max(0.1, Math.min(10, Number(stepInput.value) || 0.5));
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.climate = nwShcState.config.devices[index].io.climate || {};
        nwShcState.config.devices[index].io.climate.step = value;
        stepInput.value = String(value);
        nwMarkDirty(true);
      });
      body.appendChild(nwCreateFieldRow('Sollwert-Schritt (°C)', stepInput));
    }

    if (io.camera) {
      const c = io.camera;

      const snapInput = document.createElement('input');
      snapInput.type = 'text';
      snapInput.className = 'nw-config-input';
      snapInput.placeholder = 'http://... (Snapshot/MJPEG)';
      snapInput.value = (typeof c.snapshotUrl === 'string') ? c.snapshotUrl : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an snapInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      snapInput.addEventListener('input', () => {
        const v = snapInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.camera = nwShcState.config.devices[index].io.camera || {};
        nwShcState.config.devices[index].io.camera.snapshotUrl = v || '';
        nwMarkDirty(true);
      });
      const snapRow = nwCreateFieldRow('Kamera Snapshot URL', snapInput);

      const liveInput = document.createElement('input');
      liveInput.type = 'text';
      liveInput.className = 'nw-config-input';
      liveInput.placeholder = 'http://... (Live öffnen)';
      liveInput.value = (typeof c.liveUrl === 'string') ? c.liveUrl : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an liveInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      liveInput.addEventListener('input', () => {
        const v = liveInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.camera = nwShcState.config.devices[index].io.camera || {};
        nwShcState.config.devices[index].io.camera.liveUrl = v || '';
        nwMarkDirty(true);
      });
      const liveRow = nwCreateFieldRow('Kamera Live URL', liveInput);

      const refreshInput = document.createElement('input');
      refreshInput.type = 'number';
      refreshInput.className = 'nw-config-input';
      refreshInput.placeholder = 'Sek.';
      if (typeof c.refreshSec === 'number') refreshInput.value = String(c.refreshSec);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an refreshInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      refreshInput.addEventListener('change', () => {
        const v = refreshInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.camera = nwShcState.config.devices[index].io.camera || {};
        nwShcState.config.devices[index].io.camera.refreshSec = (Number.isFinite(num) && num > 0) ? num : 5;
        nwMarkDirty(true);
      });
      const refreshRow = nwCreateFieldRow('Snapshot Refresh (Sek.)', refreshInput);

      body.appendChild(snapRow);
      body.appendChild(liveRow);
      body.appendChild(refreshRow);
    }

    if (io.widget) {
      const w = io.widget;

      const kindSelect = document.createElement('select');
      kindSelect.className = 'nw-config-select';
      const kindOptions = [
        { value: 'iframe', label: 'Iframe' },
        { value: 'link', label: 'Link' },
      ];
      nwSetSelectOptions(kindSelect, kindOptions, [w.kind || 'iframe']);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an kindSelect. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      kindSelect.addEventListener('change', () => {
        const v = kindSelect.value || 'iframe';
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.kind = v;
        nwMarkDirty(true);
      });
      const kindRow = nwCreateFieldRow('Widget Typ', kindSelect);

      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.className = 'nw-config-input';
      urlInput.placeholder = 'https://...';
      urlInput.value = (typeof w.url === 'string') ? w.url : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an urlInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      urlInput.addEventListener('input', () => {
        const v = urlInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.url = v || '';
        nwMarkDirty(true);
      });
      const urlRow = nwCreateFieldRow('Widget URL', urlInput);

      const openInput = document.createElement('input');
      openInput.type = 'text';
      openInput.className = 'nw-config-input';
      openInput.placeholder = 'optional (abweichende Öffnen-URL)';
      openInput.value = (typeof w.openUrl === 'string') ? w.openUrl : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an openInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      openInput.addEventListener('input', () => {
        const v = openInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.openUrl = v || '';
        nwMarkDirty(true);
      });
      const openRow = nwCreateFieldRow('Öffnen URL', openInput);

      const embedWrap = document.createElement('div');
      embedWrap.style.display = 'flex';
      embedWrap.style.alignItems = 'center';
      embedWrap.style.gap = '8px';

      const embedChk = document.createElement('input');
      embedChk.type = 'checkbox';
      embedChk.checked = !!w.embed;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an embedChk. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      embedChk.addEventListener('change', () => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.embed = !!embedChk.checked;
        nwMarkDirty(true);
      });

      const embedLbl = document.createElement('span');
      embedLbl.textContent = 'Einbetten (Iframe)';

      embedWrap.appendChild(embedChk);
      embedWrap.appendChild(embedLbl);
      const embedRow = nwCreateFieldRow('Einbettung', embedWrap);

      const heightInput = document.createElement('input');
      heightInput.type = 'number';
      heightInput.className = 'nw-config-input';
      heightInput.placeholder = 'px';
      if (typeof w.height === 'number') heightInput.value = String(w.height);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an heightInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      heightInput.addEventListener('change', () => {
        const v = heightInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.height = (Number.isFinite(num) && num > 0) ? num : 260;
        nwMarkDirty(true);
      });
      const heightRow = nwCreateFieldRow('Iframe Höhe', heightInput);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.className = 'nw-config-input';
      labelInput.placeholder = 'optional (Text im Tile)';
      labelInput.value = (typeof w.label === 'string') ? w.label : '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an labelInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      labelInput.addEventListener('input', () => {
        const v = labelInput.value;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.widget = nwShcState.config.devices[index].io.widget || {};
        nwShcState.config.devices[index].io.widget.label = v || '';
        nwMarkDirty(true);
      });
      const labelRow = nwCreateFieldRow('Widget Label', labelInput);

      body.appendChild(kindRow);
      body.appendChild(urlRow);
      body.appendChild(openRow);
      body.appendChild(embedRow);
      body.appendChild(heightRow);
      body.appendChild(labelRow);
    }

    if (io.player) {
      const p = io.player;
      const playingRow = nwCreateDpInput('Status (playingId)', p.playingId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.playingId = val || null;
      });
      const titleRow = nwCreateDpInput('Titel (titleId)', p.titleId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.titleId = val || null;
      });
      const artistRow = nwCreateDpInput('Interpret (artistId)', p.artistId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.artistId = val || null;
      });
      const sourceRow = nwCreateDpInput('Quelle (sourceId)', p.sourceId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.sourceId = val || null;
      });
      const coverRow = nwCreateDpInput('Cover-URL (coverId)', p.coverId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.coverId = val || null;
      });
      const volReadRow = nwCreateDpInput('Lautstärke lesen (volumeReadId)', p.volumeReadId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.volumeReadId = val || null;
      });
      const volWriteRow = nwCreateDpInput('Lautstärke schreiben (volumeWriteId)', p.volumeWriteId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.volumeWriteId = val || null;
      });

      const minMaxCtl = document.createElement('div');
      minMaxCtl.style.display = 'flex';
      minMaxCtl.style.gap = '4px';
      minMaxCtl.style.width = '100%';

      const minInput = document.createElement('input');
      minInput.type = 'number';
      minInput.className = 'nw-config-input';
      minInput.placeholder = 'Min.';
      if (typeof p.volumeMin === 'number') minInput.value = String(p.volumeMin);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an minInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      minInput.addEventListener('change', () => {
        const v = minInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.volumeMin = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.className = 'nw-config-input';
      maxInput.placeholder = 'Max.';
      if (typeof p.volumeMax === 'number') maxInput.value = String(p.volumeMax);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an maxInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      maxInput.addEventListener('change', () => {
        const v = maxInput.value.trim();
        const num = v ? parseFloat(v) : null;
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.volumeMax = Number.isFinite(num) ? num : null;
        nwMarkDirty(true);
      });

      minMaxCtl.appendChild(minInput);
      minMaxCtl.appendChild(maxInput);

      const minMaxRow = nwCreateFieldRow('Lautstärke min/max', minMaxCtl);

      const seekRangeCtl = document.createElement('div');
      seekRangeCtl.style.display = 'grid';
      seekRangeCtl.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
      seekRangeCtl.style.gap = '4px';
      [
        ['seekMin', 0, 'Min.'],
        ['seekMax', 100, 'Max.'],
        ['seekStep', 1, 'Schritt'],
      ].forEach(([key, fallback, placeholder]) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'nw-config-input';
        input.placeholder = String(placeholder);
        input.step = key === 'seekStep' ? '0.000001' : 'any';
        input.value = String(Number.isFinite(Number(p[key])) ? Number(p[key]) : fallback);
        input.addEventListener('change', () => {
          let value = Number(input.value);
          if (!Number.isFinite(value)) value = Number(fallback);
          if (key === 'seekStep') value = Math.max(0.000001, value);
          nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
          nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
          nwShcState.config.devices[index].io.player[key] = value;
          input.value = String(value);
          nwMarkDirty(true);
        });
        seekRangeCtl.appendChild(input);
      });
      const seekRangeRow = nwCreateFieldRow('Position min/max/Schritt', seekRangeCtl);
      const toggleRow = nwCreateDpInput('Toggle Play/Pause (toggleId)', p.toggleId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.toggleId = val || null;
      });
      const playRow = nwCreateDpInput('Play (playId)', p.playId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.playId = val || null;
      });
      const pauseRow = nwCreateDpInput('Pause (pauseId)', p.pauseId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.pauseId = val || null;
      });
      const stopRow = nwCreateDpInput('Stop (stopId)', p.stopId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.stopId = val || null;
      });
      const nextRow = nwCreateDpInput('Nächster Titel (nextId)', p.nextId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.nextId = val || null;
      });
      const prevRow = nwCreateDpInput('Vorheriger Titel (prevId)', p.prevId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.prevId = val || null;
      });
      const stationRow = nwCreateDpInput('Sender wählen (stationId)', p.stationId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.stationId = val || null;
      });
      const playlistRow = nwCreateDpInput('Playlist wählen (playlistId)', p.playlistId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player.playlistId = val || null;
      });

      const advancedPlayerRows = [
        ['Mute lesen (muteReadId)', 'muteReadId'],
        ['Mute schreiben (muteWriteId)', 'muteWriteId'],
        ['Power lesen (powerReadId)', 'powerReadId'],
        ['Power schreiben (powerWriteId)', 'powerWriteId'],
        ['Position lesen (seekReadId)', 'seekReadId'],
        ['Position schreiben (seekWriteId)', 'seekWriteId'],
        ['Shuffle (shuffleId)', 'shuffleId'],
        ['Repeat (repeatId)', 'repeatId'],
        ['Text-to-Speech (ttsWriteId)', 'ttsWriteId'],
      ].map(([label, key]) => nwCreateDpInput(label, p[key] || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.player = nwShcState.config.devices[index].io.player || {};
        nwShcState.config.devices[index].io.player[key] = val || null;
      }));

      // Radiosender-Liste (optional)
      const stationsWrap = document.createElement('div');
      stationsWrap.className = 'nw-player-stations';

      const stationsHeader = document.createElement('div');
      stationsHeader.className = 'nw-player-stations__head';

      const stationsTitle = document.createElement('div');
      stationsTitle.className = 'nw-player-stations__title';
      stationsTitle.textContent = 'Radiosender (optional)';

      const addBtn = document.createElement('button');
      addBtn.className = 'nw-btn nw-btn--mini';
      addBtn.textContent = '+ Sender';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an addBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      addBtn.addEventListener('click', () => {
        nwShcState.config.devices[index].stations = Array.isArray(nwShcState.config.devices[index].stations) ? nwShcState.config.devices[index].stations : [];
        nwShcState.config.devices[index].stations.push({ name: 'Neuer Sender', value: '' });
        nwMarkDirty(true);
        nwScheduleValidation();
        renderStations();
      });

      stationsHeader.appendChild(stationsTitle);
      stationsHeader.appendChild(addBtn);
      stationsWrap.appendChild(stationsHeader);

      const stationsList = document.createElement('div');
      stationsList.className = 'nw-player-stations__list';
      stationsWrap.appendChild(stationsList);

      /**
       * Code-Teil: Arrow-Funktion `renderStations`
       * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: renderStations
       * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const renderStations = () => {
        stationsList.innerHTML = '';
        const stations = Array.isArray(nwShcState.config.devices[index].stations) ? nwShcState.config.devices[index].stations : [];
        stations.forEach((st, si) => {
          const row = document.createElement('div');
          row.className = 'nw-player-stations__row';

          const nameIn = document.createElement('input');
          nameIn.className = 'nw-config-input';
          nameIn.placeholder = 'Name';
          nameIn.value = (st && typeof st.name === 'string') ? st.name : '';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an nameIn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          nameIn.addEventListener('input', () => {
            stations[si].name = nameIn.value;
            nwMarkDirty(true);
            nwScheduleValidation();
          });

          const valIn = document.createElement('input');
          valIn.className = 'nw-config-input';
          valIn.placeholder = 'Wert / URL / Preset';
          valIn.value = (st && typeof st.value === 'string') ? st.value : '';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an valIn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          valIn.addEventListener('input', () => {
            stations[si].value = valIn.value;
            nwMarkDirty(true);
            nwScheduleValidation();
          });

          const del = document.createElement('button');
          del.className = 'nw-btn nw-btn--mini';
          del.textContent = '✕';
          del.title = 'Entfernen';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          del.addEventListener('click', () => {
            stations.splice(si, 1);
            nwShcState.config.devices[index].stations = stations;
            nwMarkDirty(true);
            nwScheduleValidation();
            renderStations();
          });

          row.appendChild(nameIn);
          row.appendChild(valIn);
          row.appendChild(del);
          stationsList.appendChild(row);
        });
      };

      renderStations();

      const stationsRow = nwCreateFieldRow('Radiosender', stationsWrap);

      // Playlists-Liste (optional)
      const playlistsWrap = document.createElement('div');
      playlistsWrap.className = 'nw-player-stations';

      const playlistsHeader = document.createElement('div');
      playlistsHeader.className = 'nw-player-stations__head';

      const playlistsTitle = document.createElement('div');
      playlistsTitle.className = 'nw-player-stations__title';
      playlistsTitle.textContent = 'Playlists (optional)';

      const addPlBtn = document.createElement('button');
      addPlBtn.className = 'nw-btn nw-btn--mini';
      addPlBtn.textContent = '+ Playlist';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an addPlBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      addPlBtn.addEventListener('click', () => {
        nwShcState.config.devices[index].playlists = Array.isArray(nwShcState.config.devices[index].playlists) ? nwShcState.config.devices[index].playlists : [];
        nwShcState.config.devices[index].playlists.push({ name: 'Neue Playlist', value: '' });
        nwMarkDirty(true);
        nwScheduleValidation();
        renderPlaylists();
      });

      playlistsHeader.appendChild(playlistsTitle);
      playlistsHeader.appendChild(addPlBtn);
      playlistsWrap.appendChild(playlistsHeader);

      const playlistsList = document.createElement('div');
      playlistsList.className = 'nw-player-stations__list';
      playlistsWrap.appendChild(playlistsList);

      /**
       * Code-Teil: Arrow-Funktion `renderPlaylists`
       * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: renderPlaylists
       * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const renderPlaylists = () => {
        playlistsList.innerHTML = '';
        const playlists = Array.isArray(nwShcState.config.devices[index].playlists) ? nwShcState.config.devices[index].playlists : [];
        playlists.forEach((plItem, pi) => {
          const row = document.createElement('div');
          row.className = 'nw-player-stations__row';

          const nameIn = document.createElement('input');
          nameIn.className = 'nw-config-input';
          nameIn.placeholder = 'Name';
          nameIn.value = (plItem && typeof plItem.name === 'string') ? plItem.name : '';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an nameIn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          nameIn.addEventListener('input', () => {
            playlists[pi].name = nameIn.value;
            nwMarkDirty(true);
            nwScheduleValidation();
          });

          const valIn = document.createElement('input');
          valIn.className = 'nw-config-input';
          valIn.placeholder = 'Wert / URI / ID';
          valIn.value = (plItem && typeof plItem.value === 'string') ? plItem.value : '';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an valIn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          valIn.addEventListener('input', () => {
            playlists[pi].value = valIn.value;
            nwMarkDirty(true);
            nwScheduleValidation();
          });

          const del = document.createElement('button');
          del.className = 'nw-btn nw-btn--mini';
          del.textContent = '✕';
          del.title = 'Entfernen';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          del.addEventListener('click', () => {
            playlists.splice(pi, 1);
            nwShcState.config.devices[index].playlists = playlists;
            nwMarkDirty(true);
            nwScheduleValidation();
            renderPlaylists();
          });

          row.appendChild(nameIn);
          row.appendChild(valIn);
          row.appendChild(del);
          playlistsList.appendChild(row);
        });
      };

      renderPlaylists();

      const playlistsRow = nwCreateFieldRow('Playlists', playlistsWrap);

      body.appendChild(playingRow);
      body.appendChild(titleRow);
      body.appendChild(artistRow);
      body.appendChild(sourceRow);
      body.appendChild(coverRow);
      body.appendChild(volReadRow);
      body.appendChild(volWriteRow);
      body.appendChild(minMaxRow);
      body.appendChild(seekRangeRow);
      body.appendChild(toggleRow);
      body.appendChild(playRow);
      body.appendChild(pauseRow);
      body.appendChild(stopRow);
      body.appendChild(nextRow);
      body.appendChild(prevRow);
      body.appendChild(stationRow);
      body.appendChild(playlistRow);
      advancedPlayerRows.forEach((row) => body.appendChild(row));
      body.appendChild(stationsRow);
      body.appendChild(playlistsRow);
    }

    if (io.sensor) {
      const se = io.sensor;
      const readRow = nwCreateDpInput('Sensor lesen (readId)', se.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.sensor = nwShcState.config.devices[index].io.sensor || {};
        nwShcState.config.devices[index].io.sensor.readId = val || null;
      });
      body.appendChild(readRow);

      const writableSensor = !!((dev.capabilities && dev.capabilities.writableValue) || (dev.behavior && !dev.behavior.readOnly) || se.writeId);
      if (writableSensor) {
        const writeRow = nwCreateDpInput('Wert schreiben (writeId)', se.writeId || '', (val) => {
          nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
          nwShcState.config.devices[index].io.sensor = nwShcState.config.devices[index].io.sensor || {};
          nwShcState.config.devices[index].io.sensor.writeId = val || null;
          nwShcState.config.devices[index].behavior = nwShcState.config.devices[index].behavior || {};
          nwShcState.config.devices[index].behavior.readOnly = false;
        });
        body.appendChild(writeRow);

        const valueType = document.createElement('select');
        valueType.className = 'nw-config-select';
        [
          ['number', 'Dezimalzahl'], ['integer', 'Ganzzahl'], ['boolean', 'Boolesch'], ['string', 'Text'],
        ].forEach(([value, label]) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          valueType.appendChild(option);
        });
        valueType.value = ['number', 'integer', 'boolean', 'string'].includes(String(se.valueType || '')) ? String(se.valueType) : 'number';
        valueType.addEventListener('change', () => {
          nwShcState.config.devices[index].io.sensor.valueType = valueType.value;
          nwMarkDirty(true);
          nwRenderAll();
        });
        body.appendChild(nwCreateFieldRow('Werttyp', valueType));

        if (!['boolean', 'string'].includes(valueType.value)) {
          const range = document.createElement('div');
          range.style.display = 'grid';
          range.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
          range.style.gap = '6px';
          [['min', -1000000000, 'Min'], ['max', 1000000000, 'Max'], ['step', 1, 'Schritt']].forEach(([key, fallback, placeholder]) => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'nw-config-input';
            input.placeholder = placeholder;
            input.step = key === 'step' ? '0.000001' : 'any';
            input.value = String(Number.isFinite(Number(se[key])) ? Number(se[key]) : fallback);
            input.addEventListener('change', () => {
              let value = Number(input.value);
              if (!Number.isFinite(value)) value = fallback;
              if (key === 'step') value = Math.max(0.000001, value);
              nwShcState.config.devices[index].io.sensor[key] = value;
              input.value = String(value);
              nwMarkDirty(true);
            });
            range.appendChild(input);
          });
          body.appendChild(nwCreateFieldRow('Bereich / Schritt', range));
        }
      }

      dev.ui = dev.ui || {};
      if (typeof dev.ui.unit !== 'string') dev.ui.unit = '';
      if (typeof dev.ui.precision !== 'number') dev.ui.precision = 1;
      const unitRow = nwCreateFieldRow('Einheit', nwShcfgCreateSelect(NW_SHCFG_SENSOR_UNIT_OPTIONS, dev.ui.unit || '', (val) => {
        nwShcState.config.devices[index].ui = nwShcState.config.devices[index].ui || {};
        nwShcState.config.devices[index].ui.unit = String(val || '');
        nwMarkDirty(true);
      }));
      const precisionRow = nwCreateFieldRow('Nachkommastellen', nwShcfgCreateSelect(NW_SHCFG_SENSOR_PRECISION_OPTIONS, String(dev.ui.precision ?? 1), (val) => {
        const n = Number(val);
        nwShcState.config.devices[index].ui = nwShcState.config.devices[index].ui || {};
        nwShcState.config.devices[index].ui.precision = Number.isFinite(n) ? n : 1;
        nwMarkDirty(true);
      }));
      body.appendChild(unitRow);
      body.appendChild(precisionRow);
    }

    if (io.color) {
      const c = io.color;
      const readRow = nwCreateDpInput('Farbe lesen (readId)', c.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.color = nwShcState.config.devices[index].io.color || {};
        nwShcState.config.devices[index].io.color.readId = val || null;
      });
      const writeRow = nwCreateDpInput('Farbe schreiben (writeId)', c.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.color = nwShcState.config.devices[index].io.color || {};
        nwShcState.config.devices[index].io.color.writeId = val || null;
      });

      const fmtSel = document.createElement('select');
      fmtSel.className = 'nw-config-select';
      const fmtOpts = [
        { value: 'hex', label: 'HEX (#RRGGBB)' },
        { value: 'rgb', label: 'RGB (r,g,b)' },
        { value: 'int', label: 'Integer (0..16777215)' },
      ];
      fmtOpts.forEach(def => {
        const opt = document.createElement('option');
        opt.value = def.value;
        opt.textContent = def.label;
        fmtSel.appendChild(opt);
      });
      fmtSel.value = (typeof c.format === 'string' && c.format) ? c.format : 'hex';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an fmtSel. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      fmtSel.addEventListener('change', () => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.color = nwShcState.config.devices[index].io.color || {};
        nwShcState.config.devices[index].io.color.format = fmtSel.value || 'hex';
        nwMarkDirty(true);
      });

      const fmtRow = nwCreateFieldRow('Farbformat', fmtSel);

      body.appendChild(readRow);
      body.appendChild(writeRow);
      body.appendChild(fmtRow);
    }

    if (io.white) {
      const white = io.white;
      body.appendChild(nwCreateDpInput('Weißkanal lesen (readId)', white.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.white = nwShcState.config.devices[index].io.white || {};
        nwShcState.config.devices[index].io.white.readId = val || null;
      }));
      body.appendChild(nwCreateDpInput('Weißkanal schreiben (writeId)', white.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.white = nwShcState.config.devices[index].io.white || {};
        nwShcState.config.devices[index].io.white.writeId = val || null;
      }));
    }

    if (io.colorTemperature) {
      const temp = io.colorTemperature;
      body.appendChild(nwCreateDpInput('Farbtemperatur lesen (readId)', temp.readId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.colorTemperature = nwShcState.config.devices[index].io.colorTemperature || {};
        nwShcState.config.devices[index].io.colorTemperature.readId = val || null;
      }));
      body.appendChild(nwCreateDpInput('Farbtemperatur schreiben (writeId)', temp.writeId || '', (val) => {
        nwShcState.config.devices[index].io = nwShcState.config.devices[index].io || {};
        nwShcState.config.devices[index].io.colorTemperature = nwShcState.config.devices[index].io.colorTemperature || {};
        nwShcState.config.devices[index].io.colorTemperature.writeId = val || null;
      }));
      const range = document.createElement('div');
      range.style.display = 'grid';
      range.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
      range.style.gap = '6px';
      [['min', 2000, 'Min K'], ['max', 6500, 'Max K'], ['step', 100, 'Schritt K']].forEach(([key, fallback, placeholder]) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'nw-config-input';
        input.placeholder = placeholder;
        input.value = String(Number.isFinite(Number(temp[key])) ? Number(temp[key]) : fallback);
        input.addEventListener('change', () => {
          let value = Number(input.value);
          if (!Number.isFinite(value)) value = fallback;
          if (key === 'step') value = Math.max(1, value);
          else value = Math.max(1000, Math.min(20000, value));
          nwShcState.config.devices[index].io.colorTemperature[key] = value;
          input.value = String(value);
          nwMarkDirty(true);
        });
        range.appendChild(input);
      });
      body.appendChild(nwCreateFieldRow('Farbtemperatur-Bereich', range));
    }

    card.appendChild(body);
    grid.appendChild(card);
  });
}

/* --- Datapoint-Picker-Dialog --- */

let nwDpDialogEl = null;
let nwDpDialogCurrent = null;
/**
 * Code-Teil: nwDpSafeStr
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDpSafeStr(value) {
  return String(value == null ? '' : value).trim();
}
/**
 * Code-Teil: nwDpFetchJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwDpFetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.ok !== true) {
    throw new Error((json && json.error) ? json.error : ('HTTP ' + res.status));
  }
  return json;
}
/**
 * Code-Teil: nwDpSearch
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwDpSearch(q) {
  const qs = encodeURIComponent(nwDpSafeStr(q));
  const json = await nwDpFetchJson('/api/smarthome/dpsearch?q=' + qs + '&limit=500');
  return Array.isArray(json.results) ? json.results : [];
}
/**
 * Code-Teil: nwDpTree
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwDpTree(prefix) {
  const pre = encodeURIComponent(nwDpSafeStr(prefix));
  const json = await nwDpFetchJson('/api/object/tree?prefix=' + pre);
  return Array.isArray(json.children) ? json.children : [];
}
/**
 * Code-Teil: nwDpParentPrefix
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDpParentPrefix(id) {
  const parts = nwDpSafeStr(id).split('.').filter(Boolean);
  if (parts.length <= 1) return '';
  parts.pop();
  return parts.join('.');
}
/**
 * Code-Teil: nwDpMetaText
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDpMetaText(it) {
  const parts = [];
  if (it && it.name) parts.push(String(it.name));
  if (it && it.role) parts.push(String(it.role));
  if (it && it.type) parts.push(String(it.type));
  if (it && it.unit) parts.push(String(it.unit));
  return parts.join(' • ');
}
/**
 * Code-Teil: nwCreateDpResultRow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateDpResultRow(primary, meta, onActivate) {
  const row = document.createElement('div');
  row.className = 'nw-dp-result';
  row.tabIndex = (typeof onActivate === 'function') ? 0 : -1;

  const idEl = document.createElement('div');
  idEl.className = 'nw-dp-result__id';
  idEl.textContent = nwDpSafeStr(primary);
  row.appendChild(idEl);

  const metaEl = document.createElement('div');
  metaEl.className = 'nw-dp-result__meta';
  metaEl.textContent = nwDpSafeStr(meta || '');
  row.appendChild(metaEl);

  if (typeof onActivate === 'function') {
    /**
     * Code-Teil: Arrow-Funktion `activate`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: activate
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const activate = (ev) => {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      onActivate();
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an row. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    row.addEventListener('click', activate);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an row. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    row.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') activate(ev);
    });
  }

  return row;
}
/**
 * Code-Teil: nwRenderDpBreadcrumb
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderDpBreadcrumb(prefix, wrap, onNavigate) {
  if (!wrap) return;
  wrap.innerHTML = '';

  const parts = nwDpSafeStr(prefix).split('.').filter(Boolean);
  /**
   * Code-Teil: mkCrumb
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkCrumb = (label, nextPrefix, clickable) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-dp-crumb' + (clickable ? '' : ' nw-dp-crumb--active');
    btn.textContent = label;
    if (!clickable) {
      btn.disabled = true;
      return btn;
    }
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', () => onNavigate(nextPrefix));
    return btn;
  };

  /**
   * Code-Teil: Arrow-Funktion `mkSep`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkSep
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkSep = () => {
    const sep = document.createElement('span');
    sep.className = 'nw-dp-sep';
    sep.textContent = '›';
    return sep;
  };

  wrap.appendChild(mkCrumb('Start', '', parts.length > 0));

  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    acc = acc ? (acc + '.' + part) : part;
    wrap.appendChild(mkSep());
    wrap.appendChild(mkCrumb(part, acc, i < (parts.length - 1)));
  }
}
/**
 * Code-Teil: nwEnsureDpDialog
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureDpDialog() {
  if (nwDpDialogEl) return nwDpDialogEl;

  const backdrop = document.createElement('div');
  backdrop.className = 'nw-dp-dialog-backdrop';
  backdrop.style.display = 'none';

  const dlg = document.createElement('div');
  dlg.className = 'nw-dp-dialog';

  const header = document.createElement('div');
  header.className = 'nw-dp-dialog__header';

  const title = document.createElement('div');
  title.className = 'nw-dp-dialog__title';

  const btnClose = document.createElement('button');
  btnClose.type = 'button';
  btnClose.className = 'nw-dp-dialog__close';
  btnClose.textContent = 'Schließen';

  header.appendChild(title);
  header.appendChild(btnClose);

  const body = document.createElement('div');
  body.className = 'nw-dp-dialog__body';

  const searchRow = document.createElement('div');
  searchRow.className = 'nw-dp-dialog__search';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'nw-config-input';
  input.placeholder = 'Nach ID oder Name suchen…';

  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'nw-config-btn nw-config-btn--ghost';
  searchBtn.textContent = 'Suchen';

  searchRow.appendChild(input);
  searchRow.appendChild(searchBtn);

  const toolsRow = document.createElement('div');
  toolsRow.className = 'nw-dp-dialog__tools';

  const rootBtn = document.createElement('button');
  rootBtn.type = 'button';
  rootBtn.className = 'nw-config-btn nw-config-btn--ghost';
  rootBtn.textContent = 'Start';

  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = 'nw-config-btn nw-config-btn--ghost';
  upBtn.textContent = 'Zurück';

  toolsRow.appendChild(rootBtn);
  toolsRow.appendChild(upBtn);

  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'nw-dp-breadcrumb';

  const columns = document.createElement('div');
  columns.className = 'nw-dp-dialog__columns';

  const treeCol = document.createElement('div');
  treeCol.className = 'nw-dp-dialog__col';
  const treeTitle = document.createElement('div');
  treeTitle.className = 'nw-dp-col-title';
  treeTitle.textContent = 'Objektstruktur';
  const treeWrap = document.createElement('div');
  treeWrap.className = 'nw-dp-dialog__results';
  treeCol.appendChild(treeTitle);
  treeCol.appendChild(treeWrap);

  const resultsCol = document.createElement('div');
  resultsCol.className = 'nw-dp-dialog__col';
  const resultsTitle = document.createElement('div');
  resultsTitle.className = 'nw-dp-col-title';
  resultsTitle.textContent = 'Suche';
  const resultsWrap = document.createElement('div');
  resultsWrap.className = 'nw-dp-dialog__results';
  resultsCol.appendChild(resultsTitle);
  resultsCol.appendChild(resultsWrap);

  columns.appendChild(treeCol);
  columns.appendChild(resultsCol);

  body.appendChild(searchRow);
  body.appendChild(toolsRow);
  body.appendChild(breadcrumb);
  body.appendChild(columns);

  dlg.appendChild(header);
  dlg.appendChild(body);
  backdrop.appendChild(dlg);
  document.body.appendChild(backdrop);

  nwDpDialogEl = {
    backdrop,
    dialog: dlg,
    title,
    closeBtn: btnClose,
    input,
    searchBtn,
    rootBtn,
    upBtn,
    breadcrumb,
    treeWrap,
    resultsWrap,
    searchTimer: null,
    treePrefix: '',
    token: 0,
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnClose. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnClose.addEventListener('click', () => nwCloseDatapointDialog());
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an searchBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  searchBtn.addEventListener('click', () => { nwRunDatapointDialogSearch().catch(() => {}); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an rootBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  rootBtn.addEventListener('click', () => { nwOpenDpDialogPrefix(''); });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an upBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  upBtn.addEventListener('click', () => {
    const state = nwEnsureDpDialog();
    nwOpenDpDialogPrefix(nwDpParentPrefix(state.treePrefix || ''));
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      nwRunDatapointDialogSearch().catch(() => {});
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      nwCloseDatapointDialog();
    }
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an input. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  input.addEventListener('input', () => {
    const state = nwEnsureDpDialog();
    if (state.searchTimer) clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => {
      nwRunDatapointDialogSearch().catch(() => {});
    }, 220);
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an backdrop. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) nwCloseDatapointDialog();
  });

  return nwDpDialogEl;
}
/**
 * Code-Teil: nwSetDpDialogTreeMessage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetDpDialogTreeMessage(text, kind) {
  const state = nwEnsureDpDialog();
  if (!state.treeWrap) return;
  const color = kind === 'error' ? '#ff6b6b' : '';
  state.treeWrap.innerHTML = '<div class="nw-config-empty"' + (color ? (' style="color:' + color + ';"') : '') + '>' + String(text || '') + '</div>';
}
/**
 * Code-Teil: nwSetDpDialogResultsMessage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetDpDialogResultsMessage(text, kind) {
  const state = nwEnsureDpDialog();
  if (!state.resultsWrap) return;
  const color = kind === 'error' ? '#ff6b6b' : '';
  state.resultsWrap.innerHTML = '<div class="nw-config-empty"' + (color ? (' style="color:' + color + ';"') : '') + '>' + String(text || '') + '</div>';
}
/**
 * Code-Teil: nwDpDialogPick
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDpDialogPick(id) {
  const value = nwDpSafeStr(id);
  if (!value) return;
  if (nwDpDialogCurrent && typeof nwDpDialogCurrent.onSelect === 'function') {
    nwDpDialogCurrent.onSelect(value);
  }
  nwCloseDatapointDialog();
}
/**
 * Code-Teil: nwRenderDpDialogTree
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderDpDialogTree(children) {
  const state = nwEnsureDpDialog();
  const wrap = state.treeWrap;
  if (!wrap) return;
  wrap.innerHTML = '';

  state.upBtn.disabled = !state.treePrefix;
  state.rootBtn.disabled = !state.treePrefix;

  if (state.treePrefix) {
    wrap.appendChild(nwCreateDpResultRow('..', 'Eine Ebene zurück', () => {
      nwOpenDpDialogPrefix(nwDpParentPrefix(state.treePrefix || ''));
    }));
  }

  if (!Array.isArray(children) || !children.length) {
    if (!wrap.children.length) wrap.innerHTML = '<div class="nw-config-empty">Keine Einträge.</div>';
    return;
  }

  children.forEach((child) => {
    if (!child) return;
    const id = nwDpSafeStr(child.id || child.label);
    if (!id) return;

    if (child.hasChildren) {
      const metaParts = [];
      metaParts.push(child.isState ? 'Ordner + Datenpunkt' : 'Ordner');
      if (child.name) metaParts.push(String(child.name));
      wrap.appendChild(nwCreateDpResultRow(id, metaParts.join(' • '), () => nwOpenDpDialogPrefix(id)));
      return;
    }

    if (child.isState) {
      wrap.appendChild(nwCreateDpResultRow(id, nwDpMetaText(child) || 'Datenpunkt', () => nwDpDialogPick(id)));
      return;
    }

    wrap.appendChild(nwCreateDpResultRow(id, '', null));
  });

  if (!wrap.children.length) {
    wrap.innerHTML = '<div class="nw-config-empty">Keine Einträge.</div>';
  }
}
/**
 * Code-Teil: nwRenderDpDialogResults
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderDpDialogResults(list) {
  const state = nwEnsureDpDialog();
  const wrap = state.resultsWrap;
  if (!wrap) return;
  wrap.innerHTML = '';

  if (!Array.isArray(list) || !list.length) {
    wrap.innerHTML = '<div class="nw-config-empty">Keine Treffer.</div>';
    return;
  }

  list.forEach((it) => {
    const id = nwDpSafeStr(it && it.id);
    if (!id) return;
    wrap.appendChild(nwCreateDpResultRow(id, nwDpMetaText(it), () => nwDpDialogPick(id)));
  });

  if (!wrap.children.length) {
    wrap.innerHTML = '<div class="nw-config-empty">Keine Treffer.</div>';
  }
}
/**
 * Code-Teil: nwRefreshDpDialogTree
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwRefreshDpDialogTree() {
  const state = nwEnsureDpDialog();
  const token = state.token;
  nwRenderDpBreadcrumb(state.treePrefix || '', state.breadcrumb, nwOpenDpDialogPrefix);
  nwSetDpDialogTreeMessage('Ordner werden geladen…');
  try {
    const children = await nwDpTree(state.treePrefix || '');
    if (!nwDpDialogEl || nwDpDialogEl.token !== token || nwDpDialogEl.backdrop.style.display === 'none') return;
    nwRenderDpBreadcrumb(state.treePrefix || '', state.breadcrumb, nwOpenDpDialogPrefix);
    nwRenderDpDialogTree(children);
  } catch (e) {
    if (!nwDpDialogEl || nwDpDialogEl.token !== token || nwDpDialogEl.backdrop.style.display === 'none') return;
    nwRenderDpBreadcrumb(state.treePrefix || '', state.breadcrumb, nwOpenDpDialogPrefix);
    nwSetDpDialogTreeMessage('Fehler: ' + (e && e.message ? e.message : e), 'error');
    state.upBtn.disabled = !state.treePrefix;
    state.rootBtn.disabled = !state.treePrefix;
  }
}
/**
 * Code-Teil: nwRunDatapointDialogSearch
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwRunDatapointDialogSearch() {
  const state = nwEnsureDpDialog();
  const token = state.token;
  const q = nwDpSafeStr(state.input.value || '');
  if (!q) {
    nwSetDpDialogResultsMessage('Suchbegriff eingeben…');
    return;
  }
  nwSetDpDialogResultsMessage('Suche läuft…');
  try {
    const list = await nwDpSearch(q);
    if (!nwDpDialogEl || nwDpDialogEl.token !== token || nwDpDialogEl.backdrop.style.display === 'none') return;
    nwRenderDpDialogResults(list);
  } catch (e) {
    if (!nwDpDialogEl || nwDpDialogEl.token !== token || nwDpDialogEl.backdrop.style.display === 'none') return;
    nwSetDpDialogResultsMessage('Fehler: ' + (e && e.message ? e.message : e), 'error');
  }
}
/**
 * Code-Teil: nwOpenDpDialogPrefix
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenDpDialogPrefix(prefix) {
  const state = nwEnsureDpDialog();
  state.treePrefix = nwDpSafeStr(prefix || '');
  nwRefreshDpDialogTree().catch(() => {});
}
/**
 * Code-Teil: nwOpenDatapointDialog
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenDatapointDialog(options) {
  const state = nwEnsureDpDialog();
  state.token += 1;
  nwDpDialogCurrent = {
    onSelect: options && options.onSelect,
  };

  state.title.textContent = (options && options.title) ? options.title : 'Datenpunkt auswählen';
  state.input.value = (options && options.initial) ? String(options.initial) : '';
  state.treePrefix = nwDpParentPrefix(state.input.value || '');
  state.backdrop.style.display = 'flex';

  nwRenderDpBreadcrumb(state.treePrefix || '', state.breadcrumb, nwOpenDpDialogPrefix);
  nwSetDpDialogTreeMessage('Ordner werden geladen…');
  if (state.input.value.trim()) nwSetDpDialogResultsMessage('Suche wird vorbereitet…');
  else nwSetDpDialogResultsMessage('Suchbegriff eingeben…');

  nwRefreshDpDialogTree().catch(() => {});
  if (state.input.value.trim().length >= 2) {
    nwRunDatapointDialogSearch().catch(() => {});
  }

  setTimeout(() => {
    try {
      state.input.focus();
      state.input.select();
    } catch (_e) {}
  }, 0);
}
/**
 * Code-Teil: nwCloseDatapointDialog
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCloseDatapointDialog() {
  if (!nwDpDialogEl) return;
  nwDpDialogEl.token += 1;
  nwDpDialogEl.backdrop.style.display = 'none';
  nwDpDialogCurrent = null;
}

/* --- Toolbar-Buttons --- */
/**
 * Code-Teil: nwAttachToolbarHandlers
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAttachToolbarHandlers() {
  const saveBtn = document.getElementById('nw-config-save-btn');
  const reloadBtn = document.getElementById('nw-config-reload-btn');

  const exportBtn = document.getElementById('nw-config-export-btn');
  const importBtn = document.getElementById('nw-config-import-btn');
  const importFile = document.getElementById('nw-config-import-file');

  const addRoomBtn = document.getElementById('nw-config-add-room-btn');
  const addFnBtn = document.getElementById('nw-config-add-function-btn');
  const addDeviceBtn = document.getElementById('nw-config-add-device-btn');

  const tplSelect = document.getElementById('nw-config-template-select');
  const addTplBtn = document.getElementById('nw-config-add-template-btn');
  if (saveBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an saveBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    saveBtn.addEventListener('click', () => {
      nwSaveSmartHomeConfig();
    });
  }
  if (reloadBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an reloadBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    reloadBtn.addEventListener('click', () => {
      nwReloadSmartHomeConfig();
    });
  }

  if (exportBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an exportBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    exportBtn.addEventListener('click', () => {
      nwExportSmartHomeConfig();
    });
  }

  if (importBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an importBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    importBtn.addEventListener('click', () => {
      if (importFile) {
        // reset so same file can be re-imported
        importFile.value = '';
        importFile.click();
      }
    });
  }

  if (importFile) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an importFile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    importFile.addEventListener('change', (ev) => {
      const file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
      if (file) {
        nwImportSmartHomeConfigFromFile(file);
      }
    });
  }

  if (addRoomBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an addRoomBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    addRoomBtn.addEventListener('click', () => {
      nwAddRoom();
    });
  }
  if (addFnBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an addFnBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    addFnBtn.addEventListener('click', () => {
      nwAddFunction();
    });
  }

  if (addDeviceBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an addDeviceBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    addDeviceBtn.addEventListener('click', () => {
      nwAddDevice();
    });
  }

  if (addTplBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an addTplBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    addTplBtn.addEventListener('click', () => {
      const t = tplSelect ? tplSelect.value : '';
      nwAddDeviceFromTemplate(t);
    });
  }

  // --- Pages (Sidebar Navigation) ---
  const pagesTa = document.getElementById('nw-pages-json');
  if (pagesTa) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an pagesTa. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    pagesTa.addEventListener('input', () => {
      nwShcState.pagesJsonText = pagesTa.value;
      nwSetPagesStatus('Änderungen nicht geprüft', 'dirty');
      nwMarkDirty(true);
      nwRenderPagesEditor();
    });
    // initial sync
    nwRenderPagesEditor(true);
  }

  const btnPagesDefault = document.getElementById('nw-pages-default-btn');
  if (btnPagesDefault) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPagesDefault. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnPagesDefault.addEventListener('click', () => {
      if (!nwShcState.config) return;
      const pages = nwBuildDefaultPages(nwShcState.config);
      nwShcState.config.pages = pages;
      nwShcState.pagesJsonText = JSON.stringify(pages, null, 2);
      nwShcState.pagesJsonValid = true;
      nwMarkDirty(true);
      nwRenderPagesEditor(true);
      nwSetPagesStatus('Standard-Seiten erzeugt ✅', 'ok');
    });
  }

  const btnPagesClear = document.getElementById('nw-pages-clear-btn');
  if (btnPagesClear) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPagesClear. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnPagesClear.addEventListener('click', () => {
      if (!nwShcState.config) return;
      nwShcState.config.pages = [];
      nwShcState.pagesJsonText = '[]';
      nwShcState.pagesJsonValid = true;
      nwMarkDirty(true);
      nwRenderPagesEditor(true);
      nwSetPagesStatus('Seiten geleert', 'ok');
    });
  }

  const btnPagesValidate = document.getElementById('nw-pages-validate-btn');
  if (btnPagesValidate) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPagesValidate. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnPagesValidate.addEventListener('click', () => {
      const res = nwParsePagesJson(nwShcState.pagesJsonText);
      if (!res.ok) {
        nwShcState.pagesJsonValid = false;
        nwRenderPagesEditor();
        nwSetPagesStatus('Fehler: ' + res.error, 'error');
        return;
      }
      nwShcState.pagesJsonValid = true;
      if (nwShcState.config) nwShcState.config.pages = res.pages;
      nwShcState.pagesJsonText = JSON.stringify(res.pages, null, 2);
      nwMarkDirty(true);
      nwRenderPagesEditor(true);
      nwSetPagesStatus('Pages JSON ist gültig ✅', 'ok');
    });
  }



  // --- Pages Builder UI ---
  const pagesTabs = document.getElementById('nw-pages-tabs');
  if (pagesTabs) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an pagesTabs. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    pagesTabs.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[data-tab]') : null;
      if (!btn) return;
      const tab = btn.getAttribute('data-tab');
      if (!tab) return;
      nwShcState.pagesUi.tab = tab;
      nwRenderPagesEditor();
    });
  }

  const pageAddBtn = document.getElementById('nw-page-add');
  if (pageAddBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an pageAddBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    pageAddBtn.addEventListener('click', () => {
      const prev = nwShcState.pagesUi.selectedId;
      const pages = Array.isArray(nwShcState.pagesDraft) ? nwShcState.pagesDraft : [];
      const maxOrder = pages.reduce((m, p) => Math.max(m, Number.isFinite(+p.order) ? +p.order : 0), 0);
      const base = (pages || []).find((p) => p.id === prev) || null;

      nwShcState.pagesUi.prevSelectedId = prev;
      nwShcState.pagesUi.isNew = true;
      nwShcState.pagesUi.selectedId = null;
      nwShcState.pagesUi.idManuallyEdited = false;
      nwShcState.pagesUi.newSeed = {
        id: '',
        title: '',
        icon: base ? base.icon : '',
        parentId: base ? base.id : '',
        viewMode: base ? base.viewMode : 'rooms',
        order: maxOrder + 1,
        roomIds: [],
        funcIds: [],
        types: [],
        favoritesOnly: false,
        href: '',
        cardSize: base ? base.cardSize : 'auto',
        sortBy: base ? base.sortBy : 'order',
        groupByType: base ? base.groupByType : false,
      };

      nwPagesSetEditorStatus('Neue Seite …', 'dirty');
      nwPagesRenderList();
      nwPagesRenderEditor();
    });
  }

  const pageSaveBtn = document.getElementById('nw-page-save');
  if (pageSaveBtn) pageSaveBtn.addEventListener('click', () => nwPagesSaveFromEditor());

  const pageCancelBtn = document.getElementById('nw-page-cancel');
  if (pageCancelBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an pageCancelBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    pageCancelBtn.addEventListener('click', () => {
      if (nwShcState.pagesUi.isNew) {
        nwShcState.pagesUi.isNew = false;
        nwShcState.pagesUi.newSeed = null;
        nwShcState.pagesUi.selectedId = nwShcState.pagesUi.prevSelectedId || (nwShcState.pagesDraft[0] ? nwShcState.pagesDraft[0].id : null);
      }
      nwShcState.pagesUi.idManuallyEdited = false;
      nwPagesSetEditorStatus('', 'dirty');
      nwPagesRenderList();
      nwPagesRenderEditor();
    });
  }

  const pageDelBtn = document.getElementById('nw-page-delete');
  if (pageDelBtn) pageDelBtn.addEventListener('click', () => nwPagesDeleteSelected());

  const pageTitleInput = document.getElementById('nw-page-title');
  const pageIdInput = document.getElementById('nw-page-id');
  if (pageIdInput) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an pageIdInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    pageIdInput.addEventListener('input', () => {
      nwShcState.pagesUi.idManuallyEdited = true;
    });
  }
  if (pageTitleInput && pageIdInput) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an pageTitleInput. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    pageTitleInput.addEventListener('input', () => {
      if (!nwShcState.pagesUi.isNew) return;
      if (nwShcState.pagesUi.idManuallyEdited) return;
      const slug = nwPagesSlugify(pageTitleInput.value);
      if (slug) pageIdInput.value = slug;
    });
  }

  const typeAddBtn = document.getElementById('nw-page-type-add-btn');
  if (typeAddBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an typeAddBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    typeAddBtn.addEventListener('click', () => {
      const inp = document.getElementById('nw-page-type-add');
      const sel = document.getElementById('nw-page-types');
      if (!inp || !sel) return;
      const v = String(inp.value || '').trim();
      if (!v) return;

      // add option if missing
      const exists = Array.from(sel.options).some((o) => o.value === v);
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        opt.selected = true;
        sel.appendChild(opt);
      } else {
        Array.from(sel.options).forEach((o) => { if (o.value === v) o.selected = true; });
      }

      inp.value = '';
    });
  }

  const syncFromJsonBtn = document.getElementById('nw-pages-sync-from-json');
  if (syncFromJsonBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an syncFromJsonBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    syncFromJsonBtn.addEventListener('click', () => {
      const ta2 = document.getElementById('nw-pages-json');
      if (!ta2) return;
      const parsed = nwParsePagesJson(ta2.value);
      if (!parsed.ok) {
        nwPagesSetEditorStatus(parsed.error || 'Ungültiges JSON', 'error');
        return;
      }
      nwShcState.pagesDraft = parsed.pages;
      nwShcState.pagesJsonText = JSON.stringify(parsed.pages, null, 2);
      ta2.value = nwShcState.pagesJsonText;
      nwShcState.pagesUi.tab = 'builder';
      nwRenderPagesEditor(true);
      nwPagesSetEditorStatus('JSON übernommen ✅', 'ok');
    });
  }

  const syncToJsonBtn = document.getElementById('nw-pages-sync-to-json');
  if (syncToJsonBtn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an syncToJsonBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    syncToJsonBtn.addEventListener('click', () => {
      const ta2 = document.getElementById('nw-pages-json');
      if (!ta2) return;
      nwShcState.pagesJsonText = JSON.stringify(nwShcState.pagesDraft || [], null, 2);
      ta2.value = nwShcState.pagesJsonText;
      nwRenderPagesEditor(true);
      nwPagesSetEditorStatus('JSON aktualisiert ✅', 'ok');
    });
  }
  // --- Datensicherung (wie App‑Center) ---
  const btnBackupExport = document.getElementById('nw-backup-export-btn');
  if (btnBackupExport) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnBackupExport. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnBackupExport.addEventListener('click', async () => {
      try {
        await nwBackupExport();
      } catch (e) {
        nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
      }
    });
  }

  const backupImportFile = document.getElementById('nw-backup-import-file');
  if (backupImportFile) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an backupImportFile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    backupImportFile.addEventListener('change', async (ev) => {
      const file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
      ev.target.value = '';
      if (!file) return;
      const modeEl = document.getElementById('nw-backup-import-mode');
      const mode = modeEl ? modeEl.value : 'merge';
      try {
        await nwBackupImport(file, mode);
      } catch (e) {
        nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
      }
    });
  }

  const btnRestoreUserdata = document.getElementById('nw-backup-restore-userdata-btn');
  if (btnRestoreUserdata) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnRestoreUserdata. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btnRestoreUserdata.addEventListener('click', async () => {
      try {
        await nwBackupRestoreFromUserdata();
      } catch (e) {
        nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
      }
    });
  }
}
/**
 * Code-Teil: nwInitSmartHomeConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwInitSmartHomeConfig() {
  nwAttachToolbarHandlers();
  nwInitShcfgShellUi();
  // Hint: SmartHome must be enabled in the adapter settings, otherwise the VIS page stays empty.
  try {
    const hint = document.getElementById('nw-config-enabled-hint');
    if (hint) {
      const cfg = await fetch('/config', { cache: 'no-store' }).then(r => r.json());
      const enabled = !!(cfg && cfg.smartHome && cfg.smartHome.enabled);
      if (!enabled) {
        hint.style.display = 'block';
        hint.innerHTML = '⚠️ SmartHome ist deaktiviert – die VIS-Seite bleibt leer. Bitte im NexoWatt EOS Admin unter <strong>NexoWatt EOS → SmartHome → „SmartHome aktivieren“</strong> einschalten.';
      } else {
        hint.style.display = 'none';
        hint.innerHTML = '';
      }
    }
  } catch (_e) {
    // ignore
  }
  await nwReloadSmartHomeConfig();
}

// Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
document.addEventListener('DOMContentLoaded', () => {
  nwInitSmartHomeConfig();
});
