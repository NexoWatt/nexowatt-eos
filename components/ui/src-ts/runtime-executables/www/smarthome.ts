// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Stellt die konfigurierte SmartHome-Oberfläche dar und übermittelt freigegebene Geräte-/Szenenaktionen.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/smarthome.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/smarthome.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/smarthome.js`.
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
 * Datenvertrag: SmartHomeDeviceView
 * Zweck: Beschreibt Räume, Geräte, Funktionen und Kacheldaten in der Kundenansicht.
 * Zusammenhang: smarthome-config.js erzeugt Struktur; smarthome.js rendert und steuert sie.
 * TypeScript-Ziel: Gebäude, Raum, Gerät und Funktion als getrennte Interfaces modellieren.
 */

/**
 * Vertragsstelle: Kundenansicht vs. Konfiguration
 * Zweck: smarthome.js darf nur Bedienung anzeigen; Installer-/Konfigurationslogik bleibt in smarthome-config.js.
 */

/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/smarthome.js
 * Rolle im Projekt: SmartHome-Kundenfrontend.
 * Zweck: Rendert Räume, Geräte, Kacheln, Popover-Steuerungen und SmartHome-Gerätewerte.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: SmartHome-Kundenansicht: rendert Gebäude-/Raumstruktur, Gerätekacheln, Popover-Steuerungen, Szenen und Timer.
 * Zusammenhänge:
 * - Liest Geräte und Räume über /api/smarthome/* aus main.js.
 * - Gerätekonfiguration entsteht in www/smarthome-config.js und wird serverseitig gespeichert.
 * Wartungshinweise:
 * - UI-Änderungen müssen Touch-Bedienung, Drawer-Navigation und Rollen/Authentifizierung berücksichtigen.
 */

/*
  NexoWatt SmartHome VIS
  - Raum-Sektionen (Apple Home ähnlich)
  - Glassmorphism-Kacheln
  - Dynamische Icons (An/Aus)

  NOTE: bewusst ohne externe Icon-Libraries.
*/

let nwAllDevices = [];
let nwLastDevicesSignature = '';
let nwReloadInFlight = false;
let nwAutoRefreshTimer = null;
let nwRefreshDevicesTimer = null;

// Endkunden-Favoriten: pro Browser (LocalStorage) – überschreibt optionale Installer-Defaults.
// Map: { [deviceId]: boolean }
let nwFavoriteOverrides = {};

// --- Player (Audio) UX state in Browser-LocalStorage ---
// Multiroom: welche Zonen werden gemeinsam gesteuert?
const NW_LS_SH_AUDIO_ZONES = 'nw_sh_audio_zones_sel';
// Favoriten / Zuletzt pro Player
const NW_LS_SH_PLAYER_FAVS_PREFIX = 'nw_sh_player_favs_'; // + kind + '_' + devId
const NW_LS_SH_PLAYER_RECENT_PREFIX = 'nw_sh_player_recent_'; // + devId
/**
 * Code-Teil: nwLsReadJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLsReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
/**
 * Code-Teil: nwLsWriteJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLsWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}
/**
 * Code-Teil: nwGetAllPlayerZones
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetAllPlayerZones() {
  return Array.isArray(nwAllDevices)
    ? nwAllDevices.filter((d) => d && d.type === 'player')
    : [];
}
/**
 * Code-Teil: nwLoadAudioZoneSelection
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadAudioZoneSelection() {
  const ids = nwLsReadJson(NW_LS_SH_AUDIO_ZONES, []);
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
}
/**
 * Code-Teil: nwSaveAudioZoneSelection
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSaveAudioZoneSelection(ids) {
  const arr = Array.isArray(ids) ? ids.filter(Boolean) : [];
  nwLsWriteJson(NW_LS_SH_AUDIO_ZONES, arr);
}
/**
 * Code-Teil: nwGetSelectedAudioZones
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetSelectedAudioZones(primaryId) {
  const all = nwGetAllPlayerZones().map((d) => d.id);
  let sel = nwLoadAudioZoneSelection().filter((id) => all.includes(id));
  if (!sel.length) sel = primaryId ? [primaryId] : [];
  if (primaryId && !sel.includes(primaryId)) sel.unshift(primaryId);
  return sel;
}
/**
 * Code-Teil: nwSetSelectedAudioZones
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetSelectedAudioZones(ids, primaryId) {
  let arr = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!arr.length && primaryId) arr = [primaryId];
  if (primaryId && !arr.includes(primaryId)) arr.unshift(primaryId);
  nwSaveAudioZoneSelection(arr);
  return arr;
}
/**
 * Code-Teil: nwPlayerFavKey
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPlayerFavKey(devId, kind) {
  return NW_LS_SH_PLAYER_FAVS_PREFIX + String(kind || 'station') + '_' + String(devId || '');
}
/**
 * Code-Teil: nwLoadPlayerFavs
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadPlayerFavs(devId, kind) {
  const arr = nwLsReadJson(nwPlayerFavKey(devId, kind), []);
  return Array.isArray(arr) ? arr.map((v) => String(v)) : [];
}
/**
 * Code-Teil: nwSavePlayerFavs
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSavePlayerFavs(devId, kind, favs) {
  const arr = Array.isArray(favs) ? favs.map((v) => String(v)) : [];
  nwLsWriteJson(nwPlayerFavKey(devId, kind), arr);
}
/**
 * Code-Teil: nwTogglePlayerFav
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwTogglePlayerFav(devId, kind, value) {
  const v = String(value);
  const favs = nwLoadPlayerFavs(devId, kind);
  const idx = favs.indexOf(v);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(v);
  }
  nwSavePlayerFavs(devId, kind, favs);
  return favs;
}
/**
 * Code-Teil: nwMovePlayerFav
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwMovePlayerFav(devId, kind, value, dir) {
  const v = String(value);
  const favs = nwLoadPlayerFavs(devId, kind);
  const i = favs.indexOf(v);
  if (i < 0) return favs;
  const j = i + (dir === 'up' ? -1 : 1);
  if (j < 0 || j >= favs.length) return favs;
  const tmp = favs[i];
  favs[i] = favs[j];
  favs[j] = tmp;
  nwSavePlayerFavs(devId, kind, favs);
  return favs;
}
/**
 * Code-Teil: nwPlayerRecentKey
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPlayerRecentKey(devId) {
  return NW_LS_SH_PLAYER_RECENT_PREFIX + String(devId || '');
}
/**
 * Code-Teil: nwLoadPlayerRecent
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadPlayerRecent(devId) {
  const arr = nwLsReadJson(nwPlayerRecentKey(devId), []);
  return Array.isArray(arr) ? arr : [];
}
/**
 * Code-Teil: nwAddPlayerRecent
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddPlayerRecent(devId, item) {
  const list = nwLoadPlayerRecent(devId);
  const entry = {
    kind: item && item.kind ? String(item.kind) : 'station',
    name: item && item.name ? String(item.name) : '',
    value: item && (typeof item.value === 'string' || typeof item.value === 'number') ? String(item.value) : '',
    ts: Date.now(),
  };
  // de-duplicate by kind+value
  const key = entry.kind + '::' + entry.value;
  const filtered = list.filter((e) => (e && (String(e.kind) + '::' + String(e.value))) !== key);
  filtered.unshift(entry);
  const max = 10;
  const out = filtered.slice(0, max);
  nwLsWriteJson(nwPlayerRecentKey(devId), out);
  return out;
}

let nwSmartHomeEnabled = null;
let nwEvcsCount = 1;

// Ansicht (persistiert pro Browser)
// - rooms: Standard (wie bisher)
// - functions: gruppiert nach "Funktionen" statt nach Räumen
const NW_SH_VIEW_MODE_LS_KEY = 'nw_sh_view_mode';
const nwViewState = {
  mode: 'rooms',

  // Page-spezifische Layout-Optionen (werden beim Wechsel der Sidebar-Seite gesetzt)
  cardSizeOverride: 'auto', // auto|s|m|l|xl
  sortBy: 'order',          // order|name|type
  groupByType: false,
};

// SmartHome VIS: Filter-/Chip-Leiste optional.
// Wenn im HTML nicht vorhanden, wird die Endkunden-UI ohne Filter gerendert (cleaner).
let nwShFiltersUiEnabled = true;

// Textgröße (Endkunde, persistiert pro Browser)
// - compact | normal | large
// Wird als CSS‑Klasse auf #nw-smarthome-root gesetzt.
const NW_SH_TEXT_SIZE_LS_KEY = 'nw_sh_text_size';
const nwTextSizeState = {
  size: 'normal',
};

// Aktive Sidebar-Seite (SmartHome VIS Navigation)
// Wird pro Browser gespeichert.
const NW_SH_ACTIVE_PAGE_LS_KEY = 'nw_sh_active_page';
const NW_SH_NAV_EXPANDED_LS_KEY = 'nw_sh_nav_expanded';

// SmartHome Konfiguration (Räume/Funktionen/Pages) – wird separat geladen
let nwShConfig = null;
const nwShMeta = {
  floorsById: {},
  floorIdByName: {},
  roomsById: {},
  funcsById: {},
  roomIdByName: {},
  funcIdByName: {},
};

const nwPageState = {
  pages: [],
  activeId: null,

  // Sidebar UI-State
  expandedIds: new Set(),

  // Live Counts pro Seite (id -> number)
  countsById: {},
};

const nwFilterState = {
  func: null,        // string | null
  favoritesOnly: false,
  favoritesFirst: false, // Favoriten in Räumen nach oben sortieren

  // Basis-Filter aus der aktiven Sidebar-Seite (IDs / Types)
  page: {
    roomIds: [],   // string[]
    funcIds: [],   // string[]
    types: [],     // string[]
    favoritesOnly: false,
  },
};

// ---------- Icons (inline SVG) ----------

const NW_ICON_SVGS = {
  bulb: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4.2 4.2l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M19.8 4.2l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M3 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M19 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },

  plug: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 10l-1 2h2l-1 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },

  thermostat: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 10c0 1.2-1 2.2-2.2 2.2S13.6 11.2 13.6 10c0-1.5 1.2-2.2 2.2-3.6 1 1.4 2.2 2.1 2.2 3.6Z" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  blinds: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 20v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },

  tv: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 20h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 20h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 10l4 2-4 2v-4Z" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  speaker: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M11 5 7 9H4v6h3l4 4V5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M11 5 7 9H4v6h3l4 4V5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M15 9a3 3 0 0 1 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17.5 7a6 6 0 0 1 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      </svg>`,
  },

  fire: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2c2 3 4 4.5 4 7.5S13.8 14 12 14 8 12.5 8 9.5C8 6.8 10 5 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 13.5C6 18 9 22 12 22s6-4 6-8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2c2 3 4 4.5 4 7.5S13.8 14 12 14 8 12.5 8 9.5C8 6.8 10 5 12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 13.5C6 18 9 22 12 22s6-4 6-8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 16c1.2 1 2 1.8 2 3.2A2.2 2.2 0 0 1 12 21a2.2 2.2 0 0 1-2-1.8c0-1.4.8-2.2 2-3.2Z" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  scene: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M19 13l.6 2.1L22 16l-2.4.9L19 19l-.6-2.1L16 16l2.4-.9L19 13Z" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  sensor: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="2" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },

  generic: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" stroke-width="2"/>
        <path d="M8 12l2.2 2.2L16 8.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },

  // Extra icons (used by floors/rooms & custom device icons)
  home: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 10v10h14V10" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 20v-6h4v6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 10v10h14V10" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 20v-6h4v6" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  building: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 3h12v18H6V3Z" stroke="currentColor" stroke-width="2"/>
        <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 3h12v18H6V3Z" stroke="currentColor" stroke-width="2"/>
        <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  folder: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 6h7l2 2h9v12H3V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 6h7l2 2h9v12H3V6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  floors: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
      </svg>`,
  },
  basement: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.5 14.5 12 17l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.5 14.5 12 17l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },
  ground: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2" opacity="0.55"/>
        <rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2" opacity="0.55"/>
        <rect x="5" y="16" width="14" height="4" rx="1.5" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2"/>
        <path d="M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2" opacity="0.55"/>
        <rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2" opacity="0.55"/>
        <rect x="5" y="16" width="14" height="4" rx="1.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="2"/>
        <path d="M4 21h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/>
      </svg>`,
  },
  upper: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 17V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.5 9.5 12 7l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="4" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="10" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="16" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 17V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.5 9.5 12 7l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },
  attic: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 11 12 5l7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="7" y="11" width="10" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M10 20v-4h4v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 11 12 5l7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="7" y="11" width="10" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M10 20v-4h4v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/>
      </svg>`,
  },
  garage: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 10 12 4l8 6v10H4V10Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 20v-7h10v7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 10 12 4l8 6v10H4V10Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 20v-7h10v7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
      </svg>`,
  },
  garden: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="9" r="5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 14v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="9" r="5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 14v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/>
      </svg>`,
  },
  terrace: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="13" width="14" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <circle cx="18" cy="6" r="2" stroke="currentColor" stroke-width="2"/>
        <path d="M18 2v1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/>
        <path d="M21.2 3.8l-1.1 1.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="13" width="14" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <circle cx="18" cy="6" r="2" stroke="currentColor" stroke-width="2"/>
        <path d="M18 2v1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/>
        <path d="M21.2 3.8l-1.1 1.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/>
      </svg>`,
  },
  pool: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="5" width="14" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M6 17c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 20c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="5" width="14" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M6 17c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 20c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
      </svg>`,
  },
  panel: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M9 7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M11 10l-2.2 4h3l-1 4 4.4-6h-3l.8-2Z" fill="currentColor" fill-opacity="0.18"/>
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M9 7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M11 10l-2.2 4h3l-1 4 4.4-6h-3l.8-2Z" fill="currentColor" fill-opacity="0.20"/>
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
  },
  server: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="4" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="6" y="10" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="6" y="16" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <path d="M9 6h.01M9 12h.01M9 18h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="4" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="6" y="10" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <rect x="6" y="16" width="12" height="4" rx="1.5" stroke="currentColor" stroke-width="2"/>
        <path d="M9 6h.01M9 12h.01M9 18h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  storage: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 8l5-3 5 3v10l-5 3-5-3V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 8l5 3 5-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/>
        <path d="M12 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 8l5-3 5 3v10l-5 3-5-3V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 8l5 3 5-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/>
        <path d="M12 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
  },
  office: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="9" y="4" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <rect x="6" y="11" width="12" height="6" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 17v3M16 17v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="9" y="4" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <rect x="6" y="11" width="12" height="6" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 17v3M16 17v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  laundry: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M9 6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="12" cy="14" r="3.5" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M9 6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="12" cy="14" r="3.5" stroke="currentColor" stroke-width="2"/>
      </svg>`,
  },
  door: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 3h10v18H7V3Z" stroke="currentColor" stroke-width="2"/>
        <path d="M14.5 12h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 3h10v18H7V3Z" stroke="currentColor" stroke-width="2"/>
        <path d="M14.5 12h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  window: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 4h14v16H5V4Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 4v16" stroke="currentColor" stroke-width="2"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 4h14v16H5V4Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 4v16" stroke="currentColor" stroke-width="2"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2"/>
      </svg>`,
  },
  lock: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 11h12v10H6V11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 16v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 11h12v10H6V11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 16v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  shield: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 3 20 7v6c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 3 20 7v6c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  wifi: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 8c5-4 15-4 20 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12c3.5-3 10.5-3 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8.5 15.5c2-1.7 5-1.7 7 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 19h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 8c5-4 15-4 20 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12c3.5-3 10.5-3 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8.5 15.5c2-1.7 5-1.7 7 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 19h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  bolt: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  battery: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 8h16v8H3V8Z" stroke="currentColor" stroke-width="2"/>
        <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 8h16v8H3V8Z" stroke="currentColor" stroke-width="2"/>
        <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  solar: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.2 6.2l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16.4 16.4l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17.8 6.2l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7.6 16.4 6.2 17.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6.2 6.2l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16.4 16.4l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17.8 6.2l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7.6 16.4 6.2 17.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" stroke="currentColor" stroke-width="2"/>
      </svg>`,
  },
  car: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 16l1-5c.2-1 1-2 2.2-2h7.6c1.2 0 2 .9 2.2 2l1 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 16h16v4H4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 20h.01M17 20h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 16l1-5c.2-1 1-2 2.2-2h7.6c1.2 0 2 .9 2.2 2l1 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 16h16v4H4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 20h.01M17 20h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  charger: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 9h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 9v3a3 3 0 0 0 6 0V9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 14l-2 4h3l-1 4 4-6h-3l1-2Z" fill="currentColor"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 3v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 9h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 9v3a3 3 0 0 0 6 0V9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 14l-2 4h3l-1 4 4-6h-3l1-2Z" fill="currentColor"/>
      </svg>`,
  },
  water: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },
  fan: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>
        <path d="M12 12c6-4 9-2 9 1 0 3-3 5-6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 12c-6-4-9-2-9 1 0 3 3 5 6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 12c0 7-3 9-5 7-2-2-2-6 1-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor"/>
        <path d="M12 12c6-4 9-2 9 1 0 3-3 5-6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 12c-6-4-9-2-9 1 0 3 3 5 6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 12c0 7-3 9-5 7-2-2-2-6 1-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  bell: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 16H6l1-2v-4a5 5 0 0 1 10 0v4l1 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 16H6l1-2v-4a5 5 0 0 1 10 0v4l1 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },

  toggle: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="8" width="16" height="8" rx="4" stroke="currentColor" stroke-width="2"/>
        <circle cx="9" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="8" width="16" height="8" rx="4" stroke="currentColor" stroke-width="2"/>
        <circle cx="15" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
        <path d="M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },
  globe: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 4c2.8 2.8 2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M12 4c-2.8 2.8-2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 4c2.8 2.8 2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M12 4c-2.8 2.8-2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },
  motion: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="7.5" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 9c2 2 2 4 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 7c3 3 3 7 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="7.5" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 9c2 2 2 4 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 7c3 3 3 7 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 5c4 4 4 10 0 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      </svg>`,
  },
  alarm: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 4h6l2 4v5H7V8l2-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 13h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M9 4h6l2 4v5H7V8l2-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 13h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 6l2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M20 6l-2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  smoke: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="4" width="12" height="6" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 14c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 18c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="4" width="12" height="6" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 14c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 18c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 16c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
  },
  meter: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 14a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 14l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 18h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 14a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 14l4-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 18h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      </svg>`,
  },
  info: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 10v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="2"/>
        <path d="M12 10v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 7h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
  },
  star: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
  },

  // Missing basic icons (used by templates / config icon picker)
  camera: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="13" r="1.6" fill="currentColor" fill-opacity="0.25"/>
      </svg>`,
  },
  grid: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.18"/>
        <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  thermometer: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 8h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 11h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 14h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 8h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 11h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 14h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M12 18a1.3 1.3 0 1 0 0-2.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="18" r="2" fill="currentColor" fill-opacity="0.14"/>
      </svg>`,
  },

  // Room / area icons (optional)
  sofa: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 11a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 13h16v5H4v-5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 18v2M17 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 11a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 13h16v5H4v-5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 18v2M17 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 13h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      </svg>`,
  },
  bed: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4 12h16v6H4v-6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4 12h16v6H4v-6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 15h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },
  kitchen: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 7h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 3v10c0 2 1 3 3 3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 3v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 7h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 3v10c0 2 1 3 3 3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M13 8h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },
  bath: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 7V5a2 2 0 0 1 2-2h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M3 12h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M7 7V5a2 2 0 0 1 2-2h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 12h14v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M3 12h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 9h.01M12 9h.01M15 9h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },
  wrench: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 7a4 4 0 0 0 5 5l-4.5 4.5a2 2 0 0 1-2.8 0L7 21l-4-4 4.5-4.7a2 2 0 0 1 0-2.8L12 5a4 4 0 0 0 2 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 7a4 4 0 0 0 5 5l-4.5 4.5a2 2 0 0 1-2.8 0L7 21l-4-4 4.5-4.7a2 2 0 0 1 0-2.8L12 5a4 4 0 0 0 2 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 18l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
      </svg>`,
  },
  stairs: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 20h6v-4h4v-4h4V6h2v14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 20h6v-4h4v-4h4V6h2v14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },

  kids: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="10" r="4" stroke="currentColor" stroke-width="2"/>
        <circle cx="8.3" cy="7.3" r="1.6" stroke="currentColor" stroke-width="2"/>
        <circle cx="15.7" cy="7.3" r="1.6" stroke="currentColor" stroke-width="2"/>
        <path d="M10.2 10.8h.01M13.8 10.8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M12 12.6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
        <path d="M8 21c1.4-3 6.6-3 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="10" r="4" stroke="currentColor" stroke-width="2"/>
        <circle cx="8.3" cy="7.3" r="1.6" stroke="currentColor" stroke-width="2"/>
        <circle cx="15.7" cy="7.3" r="1.6" stroke="currentColor" stroke-width="2"/>
        <path d="M10.2 10.8h.01M13.8 10.8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M12 12.6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
        <path d="M8 21c1.4-3 6.6-3 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  guest: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4 12h16v6H4v-6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18.6 4.2l.5 1.4 1.5.1-1.2.9.4 1.5-1.2-.7-1.2.7.3-1.5-1.1-.9 1.5-.1.5-1.4Z" fill="currentColor" fill-opacity="0.22"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M4 12h16v6H4v-6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18.6 4.2l.5 1.4 1.5.1-1.2.9.4 1.5-1.2-.7-1.2.7.3-1.5-1.1-.9 1.5-.1.5-1.4Z" fill="currentColor" fill-opacity="0.22"/>
      </svg>`,
  },
  fireplace: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 8h12v12H6V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 11c-1 1.2-2 2.4-2 4a2 2 0 1 0 4 0c0-1.6-1-2.8-2-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 20h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 8h12v12H6V8Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 11c-1 1.2-2 2.4-2 4a2 2 0 1 0 4 0c0-1.6-1-2.8-2-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 20h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
  },
  gym: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="9" width="3" height="6" rx="1.2" stroke="currentColor" stroke-width="2"/>
        <rect x="6.5" y="10" width="2.5" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
        <path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <rect x="15" y="10" width="2.5" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
        <rect x="18" y="9" width="3" height="6" rx="1.2" stroke="currentColor" stroke-width="2"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="3" y="9" width="3" height="6" rx="1.2" stroke="currentColor" stroke-width="2"/>
        <rect x="6.5" y="10" width="2.5" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
        <path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <rect x="15" y="10" width="2.5" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
        <rect x="18" y="9" width="3" height="6" rx="1.2" stroke="currentColor" stroke-width="2"/>
      </svg>`,
  },
  sauna: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M12 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M15 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="6" y="10" width="12" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M8 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M12 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M15 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      </svg>`,
  },
  workshop: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14.8 4.8 19.2 9.2l-2.1 2.1-4.4-4.4 2.1-2.1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12.8 7.2 5.5 14.5l4 4 7.3-7.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4.2 15.8 3 17l4 4 1.2-1.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14.8 4.8 19.2 9.2l-2.1 2.1-4.4-4.4 2.1-2.1Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12.8 7.2 5.5 14.5l4 4 7.3-7.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4.2 15.8 3 17l4 4 1.2-1.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },
  tech: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" opacity="0.9"/>
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M7 7l1.4 1.4M15.6 15.6 17 17M17 7l-1.4 1.4M7 17l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" opacity="0.9"/>
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/>
        <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M7 7l1.4 1.4M15.6 15.6 17 17M17 7l-1.4 1.4M7 17l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  carport: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 10 12 4l8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 15l2-2h6l2 2v4H7v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="10" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="14" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 10 12 4l8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 15l2-2h6l2 2v4H7v-4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="10" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/>
        <circle cx="14" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/>
      </svg>`,
  },
  shed: {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 11 12 6l6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="7" y="11" width="10" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M11 20v-4h2v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.8"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 11 12 6l6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="7" y="11" width="10" height="9" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M11 20v-4h2v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.8"/>
      </svg>`,
  },

  // 3D-style icons (subtle gradient + shine) – selectable via icon key (e.g. "3d-bulb")
  '3d-bulb': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_bulb_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" fill="url(#nw3d_bulb_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.2 6.2c.6-1.2 1.8-2 3.2-2" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_bulb_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M12 2a7 7 0 0 0-4 12c.8.7 1.3 1.6 1.5 2.6l.1.4h4.8l.1-.4c.2-1 .7-1.9 1.5-2.6A7 7 0 0 0 12 2Z" fill="url(#nw3d_bulb_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4.5 4.5l1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M19.5 4.5l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 22h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.2 6.2c.6-1.2 1.8-2 3.2-2" stroke="#ffffff" stroke-opacity="0.20" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-plug': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_plug_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" fill="url(#nw3d_plug_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 10h6" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_plug_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.60"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M9 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 2v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 8h10v4a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8Z" fill="url(#nw3d_plug_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 10l-1 2h2l-1 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  },
  '3d-thermostat': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_thermo_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" fill="url(#nw3d_thermo_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 6h2" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_thermo_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.60"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0Z" fill="url(#nw3d_thermo_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 17a1 1 0 1 0 0-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 10c0 1.2-1 2.2-2.2 2.2S13.6 11.2 13.6 10c0-1.5 1.2-2.2 2.2-3.6 1 1.4 2.2 2.1 2.2 3.6Z" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  '3d-blinds': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_blinds_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.45"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_blinds_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_blinds_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_blinds_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M5 16h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
        <path d="M12 20v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-camera': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_cam_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" fill="url(#nw3d_cam_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
        <path d="M9 9h3" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_cam_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.60"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M4 7h4l2-2h4l2 2h4v12H4V7Z" fill="url(#nw3d_cam_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="13" r="1.6" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  '3d-speaker': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_spk_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M11 5 7 9H4v6h3l4 4V5Z" fill="url(#nw3d_spk_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 12h.01" stroke="#ffffff" stroke-opacity="0.16" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_spk_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.62"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.16"/>
          </linearGradient>
        </defs>
        <path d="M11 5 7 9H4v6h3l4 4V5Z" fill="url(#nw3d_spk_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M15 9a3 3 0 0 1 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M17.5 7a6 6 0 0 1 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      </svg>`,
  },
  '3d-scene': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_scene_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" fill="url(#nw3d_scene_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 5.5h4" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_scene_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.18"/>
          </linearGradient>
        </defs>
        <path d="M12 2l1.2 4.2L17.5 8l-4.3 1.8L12 14l-1.2-4.2L6.5 8l4.3-1.8L12 2Z" fill="url(#nw3d_scene_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M19 13l.6 2.1L22 16l-2.4.9L19 19l-.6-2.1L16 16l2.4-.9L19 13Z" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  '3d-sensor': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_sensor_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(10)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="7" fill="url(#nw3d_sensor_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_sensor_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(10)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="7" fill="url(#nw3d_sensor_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8v4l2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="2" fill="currentColor" fill-opacity="0.18"/>
      </svg>`,
  },
  '3d-grid': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_grid_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.45"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
        <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
        <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
        <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_grid_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
        <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
        <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2" fill="url(#nw3d_grid_g)"/>
      </svg>`,
  },

  '3d-toggle': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_toggle_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.45"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <rect x="4" y="8" width="16" height="8" rx="4" fill="url(#nw3d_toggle_g)" stroke="currentColor" stroke-width="2"/>
        <circle cx="9" cy="12" r="3" fill="currentColor" fill-opacity="0.20" stroke="currentColor" stroke-width="2"/>
        <path d="M6 10c2-2 10-2 12 0" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_toggle_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="4" y="8" width="16" height="8" rx="4" fill="url(#nw3d_toggle_g)" stroke="currentColor" stroke-width="2"/>
        <circle cx="15" cy="12" r="3" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="2"/>
        <path d="M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.25"/>
        <path d="M6 10c2-2 10-2 12 0" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-globe': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_globe_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(9 8) rotate(45) scale(12)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="8" fill="url(#nw3d_globe_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
        <path d="M12 4c2.8 2.8 2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M12 4c-2.8 2.8-2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M8 6.5c1-.6 2.3-1 4-1" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_globe_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(9 8) rotate(45) scale(12)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="8" fill="url(#nw3d_globe_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        <path d="M12 4c2.8 2.8 2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
        <path d="M12 4c-2.8 2.8-2.8 13.2 0 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" fill-opacity="0.25"/>
        <path d="M8 6.5c1-.6 2.3-1 4-1" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-battery': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_batt_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect x="3" y="8" width="18" height="8" rx="2" fill="url(#nw3d_batt_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 10h6" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_batt_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="3" y="8" width="18" height="8" rx="2" fill="url(#nw3d_batt_g)" stroke="currentColor" stroke-width="2"/>
        <rect x="5" y="10" width="11" height="4" rx="1" fill="currentColor" fill-opacity="0.18"/>
        <path d="M21 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 10h6" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
    '3d-floors': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_floors_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_floors_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_floors_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-basement': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_basement_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2"/><path d="M12 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 14.5 12 17l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_basement_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_basement_g)" stroke="currentColor" stroke-width="2"/><path d="M12 7v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 14.5 12 17l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-upper': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_upper_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M12 17V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 9.5 12 7l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_upper_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="5" y="4" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2"/><rect x="5" y="10" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2" opacity="0.92"/><rect x="5" y="16" width="14" height="4" rx="1.5" fill="url(#nw3d_upper_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M12 17V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 9.5 12 7l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-attic': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_attic_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M5 11 12 5l7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="11" width="10" height="9" rx="2" fill="url(#nw3d_attic_g)" stroke="currentColor" stroke-width="2"/><path d="M10 20v-4h4v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M7.6 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_attic_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M5 11 12 5l7 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="11" width="10" height="9" rx="2" fill="url(#nw3d_attic_g)" stroke="currentColor" stroke-width="2"/><path d="M10 20v-4h4v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M7.6 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-garage': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_garage_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M4 10 12 4l8 6v10H4V10Z" fill="url(#nw3d_garage_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 20v-7h10v7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/><path d="M7.5 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_garage_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M4 10 12 4l8 6v10H4V10Z" fill="url(#nw3d_garage_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 20v-7h10v7" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/><path d="M7.5 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-garden': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_garden_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 8) rotate(45) scale(10)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="9" r="5" fill="url(#nw3d_garden_g)" stroke="currentColor" stroke-width="2"/><path d="M12 14v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/><path d="M10 6.5c.8-.7 1.6-1.1 2-1.3" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_garden_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 8) rotate(45) scale(10)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="9" r="5" fill="url(#nw3d_garden_g)" stroke="currentColor" stroke-width="2"/><path d="M12 14v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/><path d="M10 6.5c.8-.7 1.6-1.1 2-1.3" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-panel': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_panel_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="6" y="4" width="12" height="16" rx="2" fill="url(#nw3d_panel_g)" stroke="currentColor" stroke-width="2"/><path d="M9 7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.80"/><path d="M11 10l-2.2 4h3l-1 4 4.4-6h-3l.8-2Z" fill="currentColor" fill-opacity="0.20"/><path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M8.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_panel_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="6" y="4" width="12" height="16" rx="2" fill="url(#nw3d_panel_g)" stroke="currentColor" stroke-width="2"/><path d="M9 7h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.80"/><path d="M11 10l-2.2 4h3l-1 4 4.4-6h-3l.8-2Z" fill="currentColor" fill-opacity="0.20"/><path d="M9 18h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M8.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-server': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_server_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="6" y="4" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2"/><rect x="6" y="10" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><rect x="6" y="16" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M9 6h.01M9 12h.01M9 18h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M7.5 6h4" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_server_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="6" y="4" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2"/><rect x="6" y="10" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><rect x="6" y="16" width="12" height="4" rx="1.5" fill="url(#nw3d_server_g)" stroke="currentColor" stroke-width="2" opacity="0.90"/><path d="M9 6h.01M9 12h.01M9 18h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M7.5 6h4" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-storage': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_storage_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M7 8l5-3 5 3v10l-5 3-5-3V8Z" fill="url(#nw3d_storage_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 8l5 3 5-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M12 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M8.2 8.4h4.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_storage_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M7 8l5-3 5 3v10l-5 3-5-3V8Z" fill="url(#nw3d_storage_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 8l5 3 5-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M12 11v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M8.2 8.4h4.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-office': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_office_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="9" y="4" width="6" height="4" rx="1" fill="url(#nw3d_office_g)" stroke="currentColor" stroke-width="2"/><path d="M12 8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="6" y="11" width="12" height="6" rx="2" fill="url(#nw3d_office_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><path d="M8 17v3M16 17v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_office_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="9" y="4" width="6" height="4" rx="1" fill="url(#nw3d_office_g)" stroke="currentColor" stroke-width="2"/><path d="M12 8v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="6" y="11" width="12" height="6" rx="2" fill="url(#nw3d_office_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><path d="M8 17v3M16 17v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7.5 12h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-laundry': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_laundry_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="6" y="4" width="12" height="16" rx="2" fill="url(#nw3d_laundry_g)" stroke="currentColor" stroke-width="2"/><path d="M8 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M9 6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="14" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M8.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_laundry_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="6" y="4" width="12" height="16" rx="2" fill="url(#nw3d_laundry_g)" stroke="currentColor" stroke-width="2"/><path d="M8 7h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/><path d="M9 6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="14" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M8.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-terrace': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_terrace_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="5" y="13" width="14" height="7" rx="2" fill="url(#nw3d_terrace_g)" stroke="currentColor" stroke-width="2"/><path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/><circle cx="18" cy="6" r="2" fill="url(#nw3d_terrace_g)" stroke="currentColor" stroke-width="2"/><path d="M18 2v1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_terrace_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="5" y="13" width="14" height="7" rx="2" fill="url(#nw3d_terrace_g)" stroke="currentColor" stroke-width="2"/><path d="M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/><circle cx="18" cy="6" r="2" fill="url(#nw3d_terrace_g)" stroke="currentColor" stroke-width="2"/><path d="M18 2v1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.70"/></svg>`,
  },
  '3d-pool': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_pool_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="5" y="5" width="14" height="9" rx="2" fill="url(#nw3d_pool_g)" stroke="currentColor" stroke-width="2"/><path d="M6 17c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 20c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/><path d="M7.5 6.2h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_pool_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="5" y="5" width="14" height="9" rx="2" fill="url(#nw3d_pool_g)" stroke="currentColor" stroke-width="2"/><path d="M6 17c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 20c2-1 4-1 6 0s4 1 6 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/><path d="M7.5 6.2h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },

  '3d-kids': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_kids_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 7.5) rotate(45) scale(11)"><stop offset="0" stop-color="currentColor" stop-opacity="0.55"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="10" r="4" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2"/><circle cx="8.3" cy="7.3" r="1.6" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><circle cx="15.7" cy="7.3" r="1.6" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><path d="M10.2 10.8h.01M13.8 10.8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M12 12.6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.75"/><path d="M8 21c1.4-3 6.6-3 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.2 7.2c.6-.6 1.4-.9 2.3-.9" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_kids_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 7.5) rotate(45) scale(11)"><stop offset="0" stop-color="currentColor" stop-opacity="0.60"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></radialGradient></defs><circle cx="12" cy="10" r="4" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2"/><circle cx="8.3" cy="7.3" r="1.6" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><circle cx="15.7" cy="7.3" r="1.6" fill="url(#nw3d_kids_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><path d="M10.2 10.8h.01M13.8 10.8h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M12 12.6h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.75"/><path d="M8 21c1.4-3 6.6-3 8 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.2 7.2c.6-.6 1.4-.9 2.3-.9" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-guest': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_guest_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 12h16v6H4v-6Z" fill="url(#nw3d_guest_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.6 4.2l.5 1.4 1.5.1-1.2.9.4 1.5-1.2-.7-1.2.7.3-1.5-1.1-.9 1.5-.1.5-1.4Z" fill="currentColor" fill-opacity="0.22"/><path d="M6.2 13.2h8" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_guest_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.52"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 12h16v6H4v-6Z" fill="url(#nw3d_guest_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 10h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 18v2M18 18v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.6 4.2l.5 1.4 1.5.1-1.2.9.4 1.5-1.2-.7-1.2.7.3-1.5-1.1-.9 1.5-.1.5-1.4Z" fill="currentColor" fill-opacity="0.22"/><path d="M6.2 13.2h8" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-fireplace': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_fireplace_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="6" y="8" width="12" height="12" rx="2" fill="url(#nw3d_fireplace_g)" stroke="currentColor" stroke-width="2"/><path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 11c-1 1.2-2 2.4-2 4a2 2 0 1 0 4 0c0-1.6-1-2.8-2-4Z" fill="currentColor" fill-opacity="0.10" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 20h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M7.2 9.6h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_fireplace_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="6" y="8" width="12" height="12" rx="2" fill="url(#nw3d_fireplace_g)" stroke="currentColor" stroke-width="2"/><path d="M5 8h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 11c-1 1.2-2 2.4-2 4a2 2 0 1 0 4 0c0-1.6-1-2.8-2-4Z" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 20h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/><path d="M7.2 9.6h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-gym': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_gym_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="3" y="9" width="3" height="6" rx="1.2" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2"/><rect x="6.5" y="10" width="2.5" height="4" rx="1" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2" opacity="0.9"/><path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="15" y="10" width="2.5" height="4" rx="1" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2" opacity="0.9"/><rect x="18" y="9" width="3" height="6" rx="1.2" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2"/><path d="M4.2 10.2h1.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_gym_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.52"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="3" y="9" width="3" height="6" rx="1.2" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2"/><rect x="6.5" y="10" width="2.5" height="4" rx="1" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2" opacity="0.9"/><path d="M9 12h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="15" y="10" width="2.5" height="4" rx="1" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2" opacity="0.9"/><rect x="18" y="9" width="3" height="6" rx="1.2" fill="url(#nw3d_gym_g)" stroke="currentColor" stroke-width="2"/><path d="M4.2 10.2h1.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-sauna': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_sauna_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><rect x="6" y="10" width="12" height="10" rx="2" fill="url(#nw3d_sauna_g)" stroke="currentColor" stroke-width="2"/><path d="M8 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M12 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M15 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M7.2 11.6h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_sauna_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><rect x="6" y="10" width="12" height="10" rx="2" fill="url(#nw3d_sauna_g)" stroke="currentColor" stroke-width="2"/><path d="M8 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M12 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M15 4c1.2 1.2 1.2 2.8 0 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M7.2 11.6h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-workshop': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_workshop_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.48"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M14.8 4.8 19.2 9.2l-2.1 2.1-4.4-4.4 2.1-2.1Z" fill="url(#nw3d_workshop_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.8 7.2 5.5 14.5l4 4 7.3-7.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.2 15.8 3 17l4 4 1.2-1.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.2 6.2l2.4 2.4" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_workshop_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.52"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M14.8 4.8 19.2 9.2l-2.1 2.1-4.4-4.4 2.1-2.1Z" fill="url(#nw3d_workshop_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12.8 7.2 5.5 14.5l4 4 7.3-7.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.2 15.8 3 17l4 4 1.2-1.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.2 6.2l2.4 2.4" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-tech': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_tech_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(10)"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></radialGradient></defs><circle cx="12" cy="12" r="6" fill="url(#nw3d_tech_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M7 7l1.4 1.4M15.6 15.6 17 17M17 7l-1.4 1.4M7 17l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 7.2c.6-.6 1.4-.9 2.3-.9" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="nw3d_tech_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(10)"><stop offset="0" stop-color="currentColor" stop-opacity="0.56"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></radialGradient></defs><circle cx="12" cy="12" r="6" fill="url(#nw3d_tech_g)" stroke="currentColor" stroke-width="2" opacity="0.95"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="2"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M7 7l1.4 1.4M15.6 15.6 17 17M17 7l-1.4 1.4M7 17l1.4-1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 7.2c.6-.6 1.4-.9 2.3-.9" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-carport': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_carport_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M4 10 12 4l8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 15l2-2h6l2 2v4H7v-4Z" fill="url(#nw3d_carport_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="10" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/><circle cx="14" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/><path d="M8.2 16.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_carport_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M4 10 12 4l8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 15l2-2h6l2 2v4H7v-4Z" fill="url(#nw3d_carport_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="10" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/><circle cx="14" cy="19" r="1" fill="currentColor" fill-opacity="0.22"/><path d="M8.2 16.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  '3d-shed': {
    off: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_shed_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.46"/><stop offset="1" stop-color="currentColor" stop-opacity="0.10"/></linearGradient></defs><path d="M6 11 12 6l6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="11" width="10" height="9" rx="2" fill="url(#nw3d_shed_g)" stroke="currentColor" stroke-width="2"/><path d="M11 20v-4h2v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M8.2 12.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
    on: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nw3d_shed_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0.50"/><stop offset="1" stop-color="currentColor" stop-opacity="0.12"/></linearGradient></defs><path d="M6 11 12 6l6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="7" y="11" width="10" height="9" rx="2" fill="url(#nw3d_shed_g)" stroke="currentColor" stroke-width="2"/><path d="M11 20v-4h2v4" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity="0.85"/><path d="M8.2 12.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
'3d-solar': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_solar_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.45"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <path d="M5 10h14l-2 10H3l2-10Z" fill="url(#nw3d_solar_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7.5 12h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
        <path d="M6.5 16h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        <path d="M10 10.2l-1.2 9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
        <path d="M14 10.2l-1.2 9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
        <circle cx="18" cy="6" r="2" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="2"/>
        <path d="M17.3 5.3c.4-.4.9-.6 1.4-.6" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_solar_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M5 10h14l-2 10H3l2-10Z" fill="url(#nw3d_solar_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7.5 12h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
        <path d="M6.5 16h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
        <path d="M10 10.2l-1.2 9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        <path d="M14 10.2l-1.2 9.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        <circle cx="18" cy="6" r="2" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2"/>
        <path d="M18 2.5v1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M15.6 3.3l1.1 1.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M20.4 3.3l-1.1 1.1" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M17.3 5.3c.4-.4.9-.6 1.4-.6" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-charger': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_chg_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect x="7" y="4" width="10" height="16" rx="2" fill="url(#nw3d_chg_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8l-2 4h3l-1 4 4-6h-3l1-2Z" fill="currentColor" fill-opacity="0.18"/>
        <path d="M17 12h2c1 0 2 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 6h6" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_chg_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="7" y="4" width="10" height="16" rx="2" fill="url(#nw3d_chg_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 8l-2 4h3l-1 4 4-6h-3l1-2Z" fill="currentColor" fill-opacity="0.24"/>
        <path d="M17 12h2c1 0 2 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="currentColor" fill-opacity="0.25"/>
        <path d="M9 6h6" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-door': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_door_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.46"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <path d="M7 3h10v18H7V3Z" fill="url(#nw3d_door_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M15 12h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M8.5 5h7" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_door_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M7 3h10v18H7V3Z" fill="url(#nw3d_door_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M15 12h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <path d="M8.5 5h7" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
        <path d="M10 3v18" stroke="currentColor" stroke-width="2" opacity="0.25"/>
      </svg>`,
  },
  '3d-window': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_win_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.44"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_win_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 4v16" stroke="currentColor" stroke-width="2" opacity="0.75"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" opacity="0.75"/>
        <path d="M7 6h5" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_win_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_win_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 4v16" stroke="currentColor" stroke-width="2" opacity="0.85"/>
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" opacity="0.85"/>
        <path d="M7 6h5" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 5c1.2 1.2 1.2 12.8 0 14" stroke="currentColor" stroke-width="2" opacity="0.2"/>
      </svg>`,
  },
  '3d-lock': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_lock_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.50"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 11h12v10H6V11Z" fill="url(#nw3d_lock_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 16v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 13h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_lock_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 11h12v10H6V11Z" fill="url(#nw3d_lock_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 15.5v2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="15" r="1.1" fill="currentColor" fill-opacity="0.22"/>
        <path d="M8 13h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-motion': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_motion_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(8 10) rotate(45) scale(10)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </radialGradient>
        </defs>
        <circle cx="7.5" cy="12" r="2.5" fill="url(#nw3d_motion_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 9c2 2 2 4 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 7c3 3 3 7 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
        <path d="M13 10c1.2 1.2 1.2 2.8 0 4" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_motion_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(8 10) rotate(45) scale(10)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </radialGradient>
        </defs>
        <circle cx="7.5" cy="12" r="2.5" fill="url(#nw3d_motion_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 9c2 2 2 4 0 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M15 7c3 3 3 7 0 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 5c4 4 4 10 0 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        <path d="M13 10c1.2 1.2 1.2 2.8 0 4" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-alarm': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_alarm_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M9 4h6l2 4v5H7V8l2-4Z" fill="url(#nw3d_alarm_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 13h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M9.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_alarm_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.58"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <path d="M9 4h6l2 4v5H7V8l2-4Z" fill="url(#nw3d_alarm_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M7 13h10v3a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M4 6l2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M20 6l-2 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9.2 6.2h5.6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-smoke': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_smoke_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.48"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <rect x="6" y="4" width="12" height="6" rx="2" fill="url(#nw3d_smoke_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M8 14c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 18c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
        <path d="M8 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_smoke_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect x="6" y="4" width="12" height="6" rx="2" fill="url(#nw3d_smoke_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M8 14c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 18c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 16c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
        <path d="M8 6h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-water': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_water_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(12)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </radialGradient>
        </defs>
        <path d="M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" fill="url(#nw3d_water_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 6.5c.8-1.2 1.6-2 2-2.4" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_water_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 9) rotate(45) scale(12)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </radialGradient>
        </defs>
        <path d="M12 2s6 6 6 11a6 6 0 1 1-12 0c0-5 6-11 6-11Z" fill="url(#nw3d_water_g)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M10 6.5c.8-1.2 1.6-2 2-2.4" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 18c1.5-1 3.5-1 5 0s3.5 1 5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      </svg>`,
  },
  '3d-fan': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_fan_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 10) rotate(45) scale(12)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.55"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="7" fill="url(#nw3d_fan_g)" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="12" r="1.2" fill="currentColor" fill-opacity="0.25"/>
        <path d="M12 11c5-3 7-1 7 1 0 2-2 4-5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 12c-3 5-5 4-6 3-1-1-1-4 1-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        <path d="M13 12c-2-5 0-7 2-7 2 0 4 2 3 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="nw3d_fan_g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 10) rotate(45) scale(12)">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.65"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="7" fill="url(#nw3d_fan_g)" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="12" r="1.2" fill="currentColor" fill-opacity="0.25"/>
        <path d="M12 11c5-3 7-1 7 1 0 2-2 4-5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M11 12c-3 5-5 4-6 3-1-1-1-4 1-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        <path d="M13 12c-2-5 0-7 2-7 2 0 4 2 3 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
        <path d="M7 7c4-2 8-2 10 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.25"/>
      </svg>`,
  },
  '3d-meter': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_meter_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.45"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.10"/>
          </linearGradient>
        </defs>
        <path d="M6 14a6 6 0 0 1 12 0" fill="url(#nw3d_meter_g)" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 14l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 18h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M8 12.2c1.2-.9 2.6-1.2 4-1.2" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_meter_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <path d="M6 14a6 6 0 0 1 12 0" fill="url(#nw3d_meter_g)" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 14l4-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 18h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <path d="M8 12.2c1.2-.9 2.6-1.2 4-1.2" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },
  '3d-inverter': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_inv_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_inv_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M8 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
        <path d="M8 11h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
        <path d="M8 14h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
        <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" fill-opacity="0.14"/>
        <path d="M7.5 6h7" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_inv_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.62"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_inv_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M8 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.60"/>
        <path d="M8 11h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.50"/>
        <path d="M8 14h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.40"/>
        <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" fill-opacity="0.26"/>
        <path d="M7.5 6h7" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },

  '3d-wallbox': {
    off: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_wb_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.52"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.12"/>
          </linearGradient>
        </defs>
        <rect x="7" y="3" width="10" height="18" rx="3" fill="url(#nw3d_wb_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7l-1.5 3h2.2l-0.7 3 3-4.6h-2l0.6-1.4Z" fill="currentColor" fill-opacity="0.16"/>
        <path d="M17 10h2c1 0 2 1 2 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 5.8h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
    on: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_wb_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="0.62"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="0.14"/>
          </linearGradient>
        </defs>
        <rect x="7" y="3" width="10" height="18" rx="3" fill="url(#nw3d_wb_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7l-1.5 3h2.2l-0.7 3 3-4.6h-2l0.6-1.4Z" fill="currentColor" fill-opacity="0.26"/>
        <path d="M17 10h2c1 0 2 1 2 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M9 5.8h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
  },

};

// Helper: return the raw SVG string for a given icon name.
// Used for filter chips and section headers (no external icon libs).
/**
 * Code-Teil: nwGetIconSvg
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetIconSvg(name, isOn) {
  const n = String(name || '').trim().toLowerCase();
  const variant = isOn ? 'on' : 'off';

  if (n && NW_ICON_SVGS[n] && NW_ICON_SVGS[n][variant]) return NW_ICON_SVGS[n][variant];
  if (NW_ICON_SVGS.generic && NW_ICON_SVGS.generic[variant]) return NW_ICON_SVGS.generic[variant];
  return '';
}
/**
 * Code-Teil: nwIsEmojiLike
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwIsEmojiLike(str) {
  if (!str) return false;
  const s = String(str).trim();
  // emoji are typically > 1 byte, but we accept any short string
  return s.length > 0 && s.length <= 10;
}
/**
 * Code-Teil: nwEscapeHtml
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEscapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
/**
 * Code-Teil: nwSafeBadgeText
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSafeBadgeText(value) {
  let s = String(value || '').trim();
  if (!s) return '';
  // allow only simple chars (prevents SVG/HTML injection)
  s = s.replace(/[^a-zA-Z0-9 \-_.+]/g, '').trim();
  if (s.length > 10) s = s.slice(0, 10);
  return s;
}
/**
 * Code-Teil: nwParseDynamicIcon
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwParseDynamicIcon(rawValue) {
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
 * Code-Teil: nwDynamicDeviceIconSvg
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDynamicDeviceIconSvg(kind, labelRaw, isOn) {
  const label = nwSafeBadgeText(labelRaw || '');
  const txt = nwEscapeHtml(label || '');
  const on = !!isOn;

  if (kind === 'inverter') {
    return `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="nw3d_inv_badge_g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="currentColor" stop-opacity="${on ? '0.62' : '0.52'}"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="${on ? '0.14' : '0.12'}"/>
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="14" height="16" rx="2" fill="url(#nw3d_inv_badge_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M8 8h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="${on ? '0.60' : '0.55'}"/>
        <path d="M8 11h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="${on ? '0.50' : '0.45'}"/>
        <path d="M8 14h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="${on ? '0.40' : '0.35'}"/>
        <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" fill-opacity="${on ? '0.26' : '0.14'}"/>
        <rect x="7" y="15" width="10" height="4" rx="1.2" fill="currentColor" fill-opacity="${on ? '0.10' : '0.08'}" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>
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
            <stop offset="0" stop-color="currentColor" stop-opacity="${on ? '0.62' : '0.52'}"/>
            <stop offset="1" stop-color="currentColor" stop-opacity="${on ? '0.14' : '0.12'}"/>
          </linearGradient>
        </defs>
        <rect x="7" y="3" width="10" height="18" rx="3" fill="url(#nw3d_wb_badge_g)" stroke="currentColor" stroke-width="2"/>
        <path d="M12 7l-1.5 3h2.2l-0.7 3 3-4.6h-2l0.6-1.4Z" fill="currentColor" fill-opacity="${on ? '0.26' : '0.16'}"/>
        <path d="M17 10h2c1 0 2 1 2 2v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <rect x="7.2" y="15.1" width="9.6" height="4" rx="1.2" fill="currentColor" fill-opacity="${on ? '0.10' : '0.08'}" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>
        <text x="12" y="17.95" text-anchor="middle" font-size="3" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-weight="700" fill="currentColor" fill-opacity="0.85" style="letter-spacing:0.25px">${txt}</text>
        <path d="M9 5.8h6" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  return '';
}
/**
 * Code-Teil: nwStaticIconHtml
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwStaticIconHtml(iconValue) {
  const raw = String(iconValue || '').trim();
  if (!raw) return '';

  // Dynamic brand/model icons (e.g. "inv:SMA", "wb:Tesla")
  const dyn = nwParseDynamicIcon(raw);
  if (dyn) {
    const svg = nwDynamicDeviceIconSvg(dyn.kind, dyn.label, false);
    if (svg) return svg;
  }

  const key = nwNormalizeIconName(raw);
  if (key && NW_ICON_SVGS[key]) return NW_ICON_SVGS[key].off;
  return nwEscapeHtml(raw);
}
/**
 * Code-Teil: nwNormalizeIconName
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeIconName(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  // normalize common german terms
  const map = {
    // Struktur / Bereiche
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
    waschkueche: 'laundry',
    waschküche: 'laundry',
    waesche: 'laundry',
    wäsche: 'laundry',

    // Räume
    kinderzimmer: 'kids',
    kinder: 'kids',
    kind: 'kids',
    kids: 'kids',
    gaestezimmer: 'guest',
    gästezimmer: 'guest',
    gast: 'guest',
    guest: 'guest',
    kaminzimmer: 'fireplace',
    fireplace: 'fireplace',
    fitness: 'gym',
    sport: 'gym',
    gym: 'gym',
    sauna: 'sauna',
    werkstatt: 'workshop',
    workshop: 'workshop',
    technikraum: 'tech',
    haustechnik: 'tech',
    carport: 'carport',
    gartenhaus: 'shed',
    schuppen: 'shed',

    licht: 'bulb',
    lampe: 'bulb',
    beleuchtung: 'bulb',
    bulb: 'bulb',
    light: 'bulb',
    steckdose: 'plug',
    stecker: 'plug',
    plug: 'plug',
    tv: 'tv',
    fernseher: 'tv',
    speaker: 'speaker',
    lautsprecher: 'speaker',
    heizung: 'thermostat',
    klima: 'thermostat',
    thermostat: 'thermostat',
    rtr: 'thermostat',
    jalousie: 'blinds',
    rollladen: 'blinds',
    blinds: 'blinds',
    szene: 'scene',
    scene: 'scene',
    sensor: 'sensor',
    uhr: 'sensor',
    kamin: 'fire',
    fire: 'fire',
    kamera: 'camera',
    camera: 'camera',
    cam: 'camera',
    thermometer: 'thermometer',
    temperatur: 'thermometer',
    temp: 'thermometer',
    grid: 'grid',
    widget: 'grid',

    schalter: 'toggle',
    taster: 'toggle',
    toggle: 'toggle',

    url: 'globe',
    internet: 'globe',
    web: 'globe',
    globe: 'globe',

    bewegung: 'motion',
    motion: 'motion',

    alarm: 'alarm',
    sirene: 'alarm',

    rauch: 'smoke',
    rauchmelder: 'smoke',
    smoke: 'smoke',

    zaehler: 'meter',
    zähler: 'meter',
    meter: 'meter',

    pv: 'solar',

    wechselrichter: '3d-inverter',
    inverter: '3d-inverter',
    pvwechselrichter: '3d-inverter',
    wallbox3d: '3d-wallbox',

    wallbox: 'charger',
    laden: 'charger',

    batterie: 'battery',
    akku: 'battery',
  };
  return map[s] || s;
}
/**
 * Code-Teil: nwLooksLikeTemperatureDevice
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLooksLikeTemperatureDevice(dev) {
  if (!dev) return false;
  const type = String(dev.type || '').toLowerCase();
  if (type === 'rtr') return true;
  if (type !== 'sensor') return false;

  const ui = dev.ui || {};
  const unit = String(ui.unit || '').trim().toLowerCase().replace(/\s+/g, '');
  const hay = [
    dev.alias,
    dev.id,
    dev.title,
    dev.name,
    dev.function,
    dev.room,
    ui.label,
    ui.role,
    ui.unit,
  ].filter(v => typeof v !== 'undefined' && v !== null).join(' ').toLowerCase();

  if (unit === '°c' || unit === 'c' || unit.includes('celsius') || unit.includes('gradc')) return true;
  if (/temp|temperatur|temperature|speicher\s*(oben|mitte|unten|top|mid|bottom)|puffer|boiler|warmwasser|vorlauf|rücklauf|ruecklauf|thermo|klima/.test(hay)) return true;

  // Numeric sensor values without a unit are not automatically treated as temperature.
  // The alias/function must indicate it, otherwise e.g. power/energy sensors would get °C.
  return false;
}
/**
 * Code-Teil: nwNormalizeTemperatureUnit
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeTemperatureUnit(dev, unit) {
  const raw = String(unit || '').trim();
  if (!nwLooksLikeTemperatureDevice(dev)) return raw;

  const compact = raw.toLowerCase().replace(/\s+/g, '');
  if (!compact || compact === 'c' || compact === '°c' || compact === 'gradc' || compact === 'celsius') {
    return '°C';
  }
  return raw;
}
/**
 * Code-Teil: nwGuessIconName
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGuessIconName(dev) {
  const type = String(dev.type || '').toLowerCase();
  const fn = String(dev.function || '').toLowerCase();
  const alias = String(dev.alias || dev.id || '').toLowerCase();

  // type-based defaults
  if (type === 'blind') return 'blinds';
  if (type === 'rtr') return 'thermostat';
  if (type === 'camera') return 'camera';
  if (type === 'widget') return 'grid';
  if (type === 'scene') return 'scene';
  if (type === 'player') return 'speaker';
  if (type === 'color') return 'bulb';
  if (type === 'sensor') {
    if (nwLooksLikeTemperatureDevice(dev)) return 'thermometer';
    return 'sensor';
  }

  // keyword based
  const hay = fn + ' ' + alias;
  if (hay.match(/licht|lampe|leuchte|beleucht|decke|wand|spiegel/)) return 'bulb';
  if (hay.match(/steck|dose|plug|socket/)) return 'plug';
  if (hay.match(/jalous|rolllad|blind|beschatt/)) return 'blinds';
  if (hay.match(/heiz|rtr|therm|klima/)) return 'thermostat';
  if (hay.match(/tv|fernseh|apple tv/)) return 'tv';
  if (hay.match(/sonos|speaker|lautsprech/)) return 'speaker';
  if (hay.match(/kamera|camera|cam\b/)) return 'camera';
  if (hay.match(/kamin|ofen|fire/)) return 'fire';
  if (hay.match(/szene|scene/)) return 'scene';
  if (hay.match(/widget|dashboard|grid/)) return 'grid';
  if (hay.match(/temp|temperatur|°c/)) return 'thermometer';

  return 'generic';
}
/**
 * Code-Teil: nwGetIconSpec
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetIconSpec(dev) {
  const raw = (dev && typeof dev.icon !== 'undefined') ? dev.icon : '';
  const iconStr = String(raw || '').trim();

  // Dynamic brand/model icons (e.g. "inv:SMA", "wb:Tesla")
  const dyn = nwParseDynamicIcon(iconStr);
  if (dyn) {
    return { kind: 'dynamic', base: dyn.kind, label: dyn.label };
  }

  // If config contains a known icon keyword -> use it
  const normalized = nwNormalizeIconName(iconStr);
  if (NW_ICON_SVGS[normalized]) {
    return { kind: 'svg', name: normalized };
  }

  // If user entered an emoji/short string -> use as text icon
  if (iconStr && nwIsEmojiLike(iconStr)) {
    return { kind: 'text', text: iconStr };
  }

  // auto
  return { kind: 'svg', name: nwGuessIconName(dev) };
}
/**
 * Code-Teil: nwGetAccentColor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetAccentColor(dev, iconName) {
  const type = String(dev.type || '').toLowerCase();
  const fn = String(dev.function || '').toLowerCase();

  // 3D icon variants share the same palette as their base icon
  let iconKey = String(iconName || '').toLowerCase();
  if (iconKey.startsWith('3d-')) iconKey = iconKey.slice(3);

  // keep palette small and "calm" (works in dark UI)
  if (iconKey === 'bulb') return '#fbbf24';     // amber
  if (iconKey === 'fire') return '#fb7185';     // rose
  if (iconKey === 'plug') return '#60a5fa';     // blue
  if (iconKey === 'thermostat' || iconKey === 'thermometer') return '#fb923c'; // orange
  if (iconKey === 'blinds') return '#a78bfa';   // violet
  if (iconKey === 'tv' || iconKey === 'speaker') return '#38bdf8'; // sky
  if (iconKey === 'camera') return '#22d3ee';   // cyan
  if (iconKey === 'grid') return '#34d399';     // emerald
  if (iconKey === 'scene') return '#f472b6';    // pink
  if (iconKey === 'solar') return '#22c55e';    // green (PV)
  if (iconKey === 'battery') return '#34d399';  // emerald
  if (iconKey === 'charger' || iconKey === 'car') return '#60a5fa'; // blue
  if (iconKey === 'water' || iconKey === 'fan') return '#38bdf8';   // sky/cyan
  if (iconKey === 'alarm' || iconKey === 'smoke') return '#fb7185'; // rose
  if (iconKey === 'door' || iconKey === 'window' || iconKey === 'lock') return '#a3a3a3'; // neutral
  if (iconKey === 'meter') return '#34d399';    // emerald
  if (iconKey === 'globe') return '#60a5fa';    // blue
  if (iconKey === 'toggle') return '#fbbf24';   // amber
  if (iconKey === 'motion') return '#22c55e';   // green
  if (type === 'sensor' || iconKey === 'sensor') return '#22c55e'; // green

  if (fn.includes('pv') || fn.includes('energie')) return '#22c55e';
  return '#00e676';
}
/**
 * Liefert den vom Backend ermittelten Qualitätszustand. Die UI darf fehlende,
 * veraltete oder fehlerhafte Rückmeldungen niemals als echten AUS-/0-Wert
 * darstellen.
 */
function nwGetQualityStatus(dev) {
  const status = String(dev && dev.quality && dev.quality.status ? dev.quality.status : '').trim().toLowerCase();
  if (['ready', 'online', 'unknown', 'stale', 'offline', 'error', 'invalid'].includes(status)) return status;
  return 'unknown';
}

function nwGetQualityLabel(dev) {
  const status = nwGetQualityStatus(dev);
  if (status === 'offline') return 'Offline';
  if (status === 'stale') return 'Veraltet';
  if (status === 'error') return 'Fehler';
  if (status === 'invalid') return 'Ungültiger Wert';
  if (status === 'unknown') return 'Unbekannt';
  return '';
}

function nwHasPrimaryState(dev) {
  const st = dev && dev.state ? dev.state : {};
  const type = String(dev && dev.type ? dev.type : '').toLowerCase();
  if (['offline', 'stale', 'error', 'invalid'].includes(nwGetQualityStatus(dev))) return false;
  if (type === 'switch' || type === 'scene') return typeof st.on === 'boolean' || typeof st.active === 'boolean';
  if (type === 'dimmer' || type === 'color') return typeof st.on === 'boolean' || typeof st.level === 'number' || !!st.color;
  if (type === 'blind') return typeof st.position === 'number' || typeof st.level === 'number' || typeof st.moving === 'boolean';
  if (type === 'rtr') return typeof st.currentTemp === 'number' || typeof st.setpoint === 'number' || typeof st.mode !== 'undefined' || typeof st.power === 'boolean';
  if (type === 'player') return typeof st.playing === 'boolean' || typeof st.power === 'boolean' || !!st.title || !!st.source;
  if (type === 'sensor') return typeof st.value !== 'undefined' && st.value !== null;
  return nwGetQualityStatus(dev) === 'ready';
}

function nwIsMomentaryDevice(dev) {
  const mode = String(dev && dev.behavior && dev.behavior.commandMode ? dev.behavior.commandMode : '').toLowerCase();
  return mode === 'momentary' || String(dev && dev.type ? dev.type : '').toLowerCase() === 'scene';
}

/**
 * Code-Teil: nwIsOn
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwIsOn(dev) {
  const st = dev && dev.state ? dev.state : {};
  const type = String(dev && dev.type ? dev.type : '').toLowerCase();
  if (!nwHasPrimaryState(dev)) return false;

  if (type === 'switch') return typeof st.on === 'boolean' ? st.on : false;
  if (type === 'color') {
    if (typeof st.on === 'boolean') return st.on;
    if (typeof st.level === 'number') {
      const min = dev.io && dev.io.level && typeof dev.io.level.min === 'number' ? dev.io.level.min : 0;
      return st.level > min;
    }
    return !!st.color;
  }
  if (type === 'scene') return typeof st.active === 'boolean' ? st.active : (typeof st.on === 'boolean' ? st.on : false);
  if (type === 'dimmer') {
    if (typeof st.on === 'boolean') return st.on;
    if (typeof st.level !== 'number') return false;
    const min = dev.io && dev.io.level && typeof dev.io.level.min === 'number' ? dev.io.level.min : 0;
    return st.level > min;
  }
  if (type === 'player') {
    if (typeof st.playing === 'boolean') return st.playing;
    if (typeof st.power === 'boolean') return st.power;
    return false;
  }
  if (type === 'rtr') {
    if (typeof st.power === 'boolean') return st.power;
    if (typeof st.demand === 'boolean') return st.demand;
    if (typeof st.demand === 'number') return st.demand > 0;
    return true;
  }
  return false;
}
/**
 * Code-Teil: nwSupportsTimer
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSupportsTimer(dev) {
  if (!dev) return false;
  if (dev.behavior && dev.behavior.readOnly) return false;
  const type = String(dev.type || '').toLowerCase();
  // Timer support is intentionally limited to "simple" actuator types.
  // Added: blinds/jalousie (open/close schedule)
  return ['switch', 'dimmer', 'color', 'scene', 'blind'].includes(type);
}
/**
 * Code-Teil: nwGetStateText
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetStateText(dev) {
  const st = dev && dev.state ? dev.state : {};
  const type = String(dev && dev.type ? dev.type : '').toLowerCase();
  const qualityLabel = nwGetQualityLabel(dev);
  const qualityStatus = nwGetQualityStatus(dev);

  if (['offline', 'stale', 'error', 'invalid'].includes(qualityStatus)) return qualityLabel;
  if (qualityStatus === 'unknown' && !nwHasPrimaryState(dev)) return 'Unbekannt';

  if (type === 'switch') {
    if (nwIsMomentaryDevice(dev) && typeof st.on !== 'boolean') return 'Bereit';
    if (typeof st.on === 'boolean') return st.on ? 'Ein' : 'Aus';
    return nwIsMomentaryDevice(dev) ? 'Bereit' : 'Keine Rückmeldung';
  }
  if (type === 'color') {
    if (typeof st.on === 'boolean') return st.on ? 'Ein' : 'Aus';
    if (typeof st.level === 'number') return Math.round(st.level) + ' %';
    if (st && st.color) return String(st.color).toUpperCase();
    return 'Keine Rückmeldung';
  }
  if (type === 'scene') {
    if (typeof st.active === 'boolean') return st.active ? 'Aktiv' : 'Bereit';
    if (typeof st.on === 'boolean') return st.on ? 'Aktiv' : 'Bereit';
    return 'Bereit';
  }
  if (type === 'dimmer') {
    if (typeof st.level !== 'number') return 'Keine Rückmeldung';
    const pct = Math.round(st.level);
    return pct > 0 ? (pct + ' %') : 'Aus';
  }
  if (type === 'blind') {
    if (st.locked) return 'Gesperrt';
    if (st.windAlarm) return 'Windalarm';
    if (st.rainAlarm) return 'Regenalarm';
    if (st.frostAlarm) return 'Frostalarm';
    const pos = typeof st.position === 'number' ? st.position : (typeof st.level === 'number' ? st.level : null);
    const movement = st.moving ? (st.direction ? String(st.direction) : 'fährt') : '';
    if (typeof pos === 'number') return Math.round(nwClampNumber(pos, 0, 100)) + ' %' + (movement ? ' · ' + movement : '');
    return movement || 'Keine Rückmeldung';
  }
  if (type === 'player') {
    const title = String(st.title || '').trim();
    const artist = String(st.artist || '').trim();
    const source = String(st.source || '').trim();
    let line = '';
    if (title && artist) line = title + ' – ' + artist;
    else if (title) line = title;
    else if (artist) line = artist;
    else if (typeof st.playing === 'boolean') line = st.playing ? 'Spielt' : 'Pausiert';
    else if (typeof st.power === 'boolean') line = st.power ? 'Ein' : 'Aus';
    else line = 'Keine Rückmeldung';
    if (source) line = line ? (line + ' · ' + source) : source;
    if (st.muted) line += ' · Stumm';
    return line;
  }
  if (type === 'rtr') {
    if (st.climateError === true || (typeof st.climateError === 'string' && st.climateError.trim() && st.climateError !== '0')) return 'Störung';
    if (st.windowOpen === true) return 'Fenster offen · gesperrt';
    const mode = (typeof st.mode !== 'undefined' && st.mode !== null && String(st.mode).trim() !== '') ? String(st.mode).trim() : '';
    const ct = typeof st.currentTemp === 'number' ? st.currentTemp.toFixed(1).replace('.', ',') + '°C' : '';
    const sp = typeof st.setpoint === 'number' ? st.setpoint.toFixed(1).replace('.', ',') + '°C' : '';
    const tempLine = ct && sp ? (ct + ' → ' + sp) : (sp ? ('Soll ' + sp) : (ct ? ('Ist ' + ct) : ''));
    const fan = typeof st.fanSpeed !== 'undefined' && st.fanSpeed !== null && String(st.fanSpeed).trim() ? ('Lüfter ' + st.fanSpeed) : '';
    const out = [mode, tempLine, fan].filter(Boolean).join(' · ');
    return out || 'Keine Rückmeldung';
  }
  if (type === 'sensor') {
    if (typeof st.value !== 'undefined' && st.value !== null) {
      const ui = dev.ui || {};
      if (typeof st.value === 'number') {
        const prec = typeof ui.precision === 'number' ? ui.precision : 1;
        const unit = nwNormalizeTemperatureUnit(dev, ui.unit || '');
        return st.value.toFixed(prec).replace('.', ',') + (unit ? ' ' + unit : '');
      }
      if (typeof st.value === 'boolean') return st.value ? 'Ein' : 'Aus';
      return String(st.value);
    }
    return 'Keine Rückmeldung';
  }
  return qualityStatus === 'ready' ? 'Bereit' : '';
}
/**
 * Code-Teil: nwGetTileHint
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetTileHint(dev) {
  const type = String(dev && dev.type ? dev.type : '').toLowerCase();
  const canWrite = nwHasWriteAccess(dev);

  // Wenn ReadOnly: kurze Info (keine Bedienhinweise)
  if (!canWrite) return 'Nur Anzeige';

  if (type === 'switch') return 'Klicken: Ein/Aus';
  if (type === 'color') return 'Klicken: große Farbsteuerung · Schalter: Ein/Aus';
  if (type === 'scene') return 'Klicken: Szene auslösen';
  if (type === 'dimmer') return 'Klicken: große Bedienung · Schalter: Ein/Aus · +/-: Feinregelung';
  if (type === 'blind') return 'Klicken: große Bedienung · Tasten: Auf/Stop/Ab';
  if (type === 'rtr') return 'Klicken: große Temperatursteuerung';
  return '';
}
/**
 * Code-Teil: nwFormatBigValue
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFormatBigValue(dev) {
  const st = dev && dev.state ? dev.state : {};
  const ui = dev.ui || {};
  const type = String(dev.type || '').toLowerCase();
  /**
   * Code-Teil: formatUnit
   * Zweck: Formatiert Daten für Anzeige oder Logs.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const formatUnit = (unit) => nwNormalizeTemperatureUnit(dev, unit || '');

  if (type === 'rtr') {
    if (typeof st.currentTemp === 'number') {
      const prec = (typeof ui.precision === 'number') ? ui.precision : 1;
      return {
        value: st.currentTemp.toFixed(prec).replace('.', ','),
        unit: formatUnit(ui.unit || '°C'),
        hasValue: true,
      };
    }
    if (typeof st.setpoint === 'number') {
      const prec = (typeof ui.precision === 'number') ? ui.precision : 1;
      return {
        value: st.setpoint.toFixed(prec).replace('.', ','),
        unit: formatUnit(ui.unit || '°C'),
        hasValue: true,
      };
    }
  }

  if (type === 'sensor') {
    if (typeof st.value === 'number' && !Number.isNaN(st.value)) {
      const prec = (typeof ui.precision === 'number') ? ui.precision : 1;
      return {
        value: st.value.toFixed(prec).replace('.', ','),
        unit: formatUnit(ui.unit || ''),
        hasValue: true,
      };
    }
    if (typeof st.value === 'boolean') {
      return {
        value: st.value ? 'Ein' : 'Aus',
        unit: formatUnit(ui.unit || ''),
        hasValue: true,
      };
    }
    if (typeof st.value !== 'undefined' && st.value !== null) {
      const txt = String(st.value).trim();
      if (txt) {
        return {
          value: txt,
          unit: formatUnit(ui.unit || ''),
          hasValue: true,
        };
      }
    }
  }

  return { value: '', unit: '', hasValue: false };
}
/**
 * Code-Teil: nwGetTileSize
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetTileSize(dev) {
  // v0.6.189+: Uniform tiles for a cleaner overview.
  // We keep the size API/classes for backwards compatibility, but the default UI
  // renders all device tiles in the same size.
  return 'm';
}
/**
 * Code-Teil: nwHasWriteAccess
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwHasWriteAccess(dev) {
  const beh = dev && dev.behavior ? dev.behavior : {};
  if (beh.readOnly) return false;
  const type = String(dev && dev.type ? dev.type : '').toLowerCase();
  const io = dev && dev.io ? dev.io : {};
  if (type === 'switch' || type === 'scene') return !!(io.switch && io.switch.writeId);
  if (type === 'dimmer') {
    return !!((io.switch && io.switch.writeId)
      || (io.level && io.level.writeId)
      || (io.colorTemperature && io.colorTemperature.writeId));
  }
  if (type === 'color') {
    return !!((io.switch && io.switch.writeId)
      || (io.level && io.level.writeId)
      || (io.color && io.color.writeId)
      || (io.white && io.white.writeId)
      || (io.colorTemperature && io.colorTemperature.writeId));
  }
  if (type === 'blind') {
    const cover = io.cover || {};
    return !!((io.level && io.level.writeId)
      || cover.positionWriteId
      || cover.upId || cover.downId || cover.stopId || cover.actionId || cover.tiltWriteId);
  }
  if (type === 'rtr') {
    const climate = io.climate || {};
    return !!(climate.setpointId || climate.powerId || climate.modeId || climate.fanSpeedId || climate.swingId);
  }
  if (type === 'player') {
    const player = io.player || {};
    return !!(player.toggleId || player.playId || player.pauseId || player.stopId || player.nextId || player.prevId
      || player.volumeWriteId || player.stationId || player.playlistId || player.muteWriteId || player.powerWriteId
      || player.seekWriteId || player.shuffleId || player.repeatId || player.ttsWriteId);
  }
  if (type === 'sensor') return !!(io.sensor && io.sensor.writeId);
  return false;
}
/**
 * Code-Teil: nwCreateIconElement
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateIconElement(dev, isOn, iconSpec, accent) {
  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-icon';

  const type = String(dev && dev.type ? dev.type : '').toLowerCase();
  const st = dev && dev.state ? dev.state : {};
  const colorHex = (type === 'color' && st && st.color) ? String(st.color).trim() : '';

  if (iconSpec.kind === 'text') {
    const t = document.createElement('span');
    t.className = 'nw-sh-icon__text';
    t.textContent = iconSpec.text;
    wrap.appendChild(t);
  } else if (iconSpec.kind === 'dynamic') {
    const svgWrap = document.createElement('div');
    svgWrap.className = 'nw-sh-icon__svg';
    wrap.classList.add('nw-sh-icon--3d');

    const svg = nwDynamicDeviceIconSvg(iconSpec.base, iconSpec.label, isOn);
    const fallback = (NW_ICON_SVGS.generic && NW_ICON_SVGS.generic[isOn ? 'on' : 'off']) || '';
    svgWrap.innerHTML = svg || fallback;

    wrap.appendChild(svgWrap);
  } else {
    const svgWrap = document.createElement('div');
    svgWrap.className = 'nw-sh-icon__svg';

    const name = iconSpec.name;
    if (typeof name === 'string' && name.startsWith('3d-')) {
      wrap.classList.add('nw-sh-icon--3d');
    }

    const variant = isOn ? 'on' : 'off';
    const svg = (NW_ICON_SVGS[name] && NW_ICON_SVGS[name][variant])
      ? NW_ICON_SVGS[name][variant]
      : (NW_ICON_SVGS.generic && NW_ICON_SVGS.generic[variant]);

    svgWrap.innerHTML = svg;
    wrap.appendChild(svgWrap);
  }

  // set accent as CSS var so SVG uses currentColor
  wrap.style.color = isOn ? accent : 'rgba(203, 213, 225, 0.85)';

  // Color dot overlay (for color-lights)
  if (type === 'color') {
    const dot = document.createElement('span');
    dot.className = 'nw-sh-icon__dot';
    dot.style.background = colorHex || (isOn ? 'rgba(226,232,240,0.75)' : 'rgba(148,163,184,0.45)');
    wrap.appendChild(dot);
  }

  return wrap;
}

// ---------- Networking ----------
/**
 * Code-Teil: nwFetchDevices
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwFetchDevices() {
  const res = await fetch('/api/smarthome/devices', { cache: 'no-store' });
  if (!res.ok) throw new Error('devices fetch failed');
  const data = await res.json();
  if (!data || !data.ok) throw new Error('devices fetch not ok');
  return Array.isArray(data.devices) ? data.devices : [];
}
/**
 * Code-Teil: nwToggleDevice
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwToggleDevice(id, value) {
  const body = { id };
  if (typeof value === 'boolean') body.value = value;
  const res = await fetch('/api/smarthome/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || !data.ok) return null;
  return data.state || { ok: true };
}
/**
 * Code-Teil: nwSetLevel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwSetLevel(id, level) {
  const res = await fetch('/api/smarthome/level', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, level }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.state || null;
}
/**
 * Code-Teil: nwSetColor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwSetColor(id, colorOrPayload) {
  const payload = (colorOrPayload && typeof colorOrPayload === 'object' && !Array.isArray(colorOrPayload))
    ? { ...colorOrPayload }
    : { color: colorOrPayload };
  const res = await fetch('/api/smarthome/color', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...payload }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || !data.ok) return null;
  return data.state || { ok: true };
}
/**
 * Code-Teil: nwCoverAction
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwCoverAction(id, action, value) {
  const body = { id, action };
  if (typeof value !== 'undefined') body.value = value;
  const res = await fetch('/api/smarthome/cover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  return !!(data && data.ok);
}
/**
 * Code-Teil: nwPlayerAction
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwPlayerAction(id, action, value) {
  const body = { id, action };
  if (typeof value !== 'undefined') body.value = value;

  const res = await fetch('/api/smarthome/player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.state || null;
}

// Multiroom (UI-seitig): dieselbe Aktion auf mehrere Player-Zonen anwenden
/**
 * Code-Teil: nwPlayerActionMulti
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwPlayerActionMulti(primaryId, action, value) {
  const zones = nwGetSelectedAudioZones(primaryId);
  const unique = Array.from(new Set(zones));
  let lastState = null;
  for (const zid of unique) {
    try {
      lastState = await nwPlayerAction(zid, action, value);
    } catch (e) {
      // ignore individual zone errors
    }
  }
  return lastState;
}
/**
 * Code-Teil: nwSetRtrSetpoint
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwSetRtrSetpoint(id, setpoint) {
  const res = await fetch('/api/smarthome/rtrSetpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, setpoint }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.state || null;
}


async function nwClimateAction(id, action, value) {
  const body = { id, action };
  if (typeof value !== 'undefined') body.value = value;
  const res = await fetch('/api/smarthome/climate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data && data.ok ? (data.state || { ok: true }) : null;
}

async function nwSetSmartHomeValue(id, value) {
  const res = await fetch('/api/smarthome/value', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, value }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data && data.ok ? (data.state || { ok: true }) : null;
}

// --- Zeitschaltuhren (Endkunde) ---
/**
 * Code-Teil: nwSaveDeviceTimer
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwSaveDeviceTimer(deviceId, timer) {
  const res = await fetch('/api/smarthome/timers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, timer }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.config || null;
}
/**
 * Code-Teil: nwDeleteDeviceTimer
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwDeleteDeviceTimer(deviceId) {
  const res = await fetch('/api/smarthome/timers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, delete: true }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.ok) return null;
  return data.config || null;
}
/**
 * Code-Teil: nwAdjustRtrSetpoint
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwAdjustRtrSetpoint(dev, delta) {
  const st = dev.state || {};
  const cl = dev.io && dev.io.climate ? dev.io.climate : {};

  const min = typeof cl.minSetpoint === 'number' ? cl.minSetpoint : 15;
  const max = typeof cl.maxSetpoint === 'number' ? cl.maxSetpoint : 30;

  const current = (typeof st.setpoint === 'number') ? st.setpoint : min;
  let target = current + delta;
  if (target < min) target = min;
  if (target > max) target = max;

  await nwSetRtrSetpoint(dev.id, target);
  await nwReloadDevices({ force: true });
}

// ---------- Rendering ----------
/**
 * Code-Teil: nwClear
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwClear(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}
/**
 * Code-Teil: nwSortBy
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSortBy(a, b) {
  const sa = String(a || '').toLowerCase();
  const sb = String(b || '').toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}
/**
 * Code-Teil: nwGetDeviceOrder
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetDeviceOrder(dev) {
  const o = (dev && typeof dev.order === 'number')
    ? dev.order
    : (dev && dev.ui && typeof dev.ui.order === 'number' ? dev.ui.order : 0);
  return Number.isFinite(o) ? o : 0;
}


const NW_SH_TYPE_LABELS = {
  light: 'Licht',
  lamp: 'Licht',
  dimmer: 'Licht',
  shutter: 'Rollos',
  blind: 'Rollos',
  rtr: 'Heizung',
  thermostat: 'Heizung',
  heating: 'Heizung',
  plug: 'Steckdose',
  socket: 'Steckdose',
  switch: 'Schalter',
  relay: 'Schalter',
  sensor: 'Sensor',
  camera: 'Kamera',
  door: 'Tür',
  window: 'Fenster',
  presence: 'Präsenz',
  motion: 'Bewegung',
  energy: 'Energie',
  meter: 'Zähler',
  player: 'Audio',
  media: 'Audio',
};
const NW_SH_TYPE_ICONS = {
  light: '💡', lamp: '💡', dimmer: '💡',
  shutter: '🪟', blind: '🪟',
  rtr: '🌡️', thermostat: '🌡️', heating: '♨️',
  plug: '🔌', socket: '🔌', switch: '⏻', relay: '⏻',
  sensor: '◉', camera: '📷', door: '🚪', window: '🪟',
  presence: '👤', motion: '🏃', energy: '⚡', meter: '⚡',
  player: '🔊', media: '🔊',
};
/**
 * Code-Teil: nwTypeLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwTypeLabel(type) {
  const t = String(type || '').trim().toLowerCase();
  if (!t) return 'Unbekannt';
  return NW_SH_TYPE_LABELS[t] || (t.charAt(0).toUpperCase() + t.slice(1));
}
/**
 * Code-Teil: nwCompareDevices
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCompareDevices(a, b) {
  // optional: favorites first
  if (nwFilterState && nwFilterState.favoritesFirst) {
    const fa = nwIsFavorite(a);
    const fb = nwIsFavorite(b);
    if (fa !== fb) return fa ? -1 : 1;
  }

  const sortBy = (nwViewState && nwViewState.sortBy) ? nwViewState.sortBy : 'order';

  if (sortBy === 'name') {
    return nwSortBy(a.alias || a.id, b.alias || b.id);
  }

  if (sortBy === 'type') {
    const t = nwSortBy(nwTypeLabel(a.type), nwTypeLabel(b.type));
    if (t) return t;
    return nwSortBy(a.alias || a.id, b.alias || b.id);
  }

  // default: order
  const oa = nwGetDeviceOrder(a);
  const ob = nwGetDeviceOrder(b);
  if (oa !== ob) return oa - ob;
  return nwSortBy(a.alias || a.id, b.alias || b.id);
}
/**
 * Code-Teil: nwGroupDevicesByType
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGroupDevicesByType(devices) {
  const map = new Map();
  (devices || []).forEach((d) => {
    const key = String(d && d.type ? d.type : '').trim().toLowerCase() || 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(d);
  });
  const groups = Array.from(map.entries()).map(([type, list]) => ({
    type,
    title: nwTypeLabel(type),
    icon: NW_SH_TYPE_ICONS[type] || null,
    devices: list,
  }));

  groups.sort((a, b) => String(a.title).localeCompare(String(b.title), 'de'));
  return groups;
}
/**
 * Code-Teil: nwFormatNumberDE
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFormatNumberDE(value, precision) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '';
  const p = (typeof precision === 'number' && precision >= 0 && precision <= 6) ? precision : 1;
  return v.toFixed(p).replace('.', ',');
}
/**
 * Code-Teil: nwComputeRoomSummary
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwComputeRoomSummary(roomId, allDevices) {
  const rid = nwNormalizeId(roomId);
  if (!rid) return '';

  const devs = Array.isArray(allDevices)
    ? allDevices.filter(d => nwNormalizeId(d && d.roomId) === rid)
    : [];
  if (!devs.length) return '';

  const tempCandidates = [];
  const humCandidates = [];

  devs.forEach(d => {
    if (!d) return;
    const type = String(d.type || '').toLowerCase();
    const st = d.state || {};
    const ui = d.ui || {};
    const order = nwGetDeviceOrder(d);
    const alias = String(d.alias || d.id || '').toLowerCase();
    const unit = String(ui.unit || '').toLowerCase();

    if (type === 'rtr') {
      if (typeof st.currentTemp === 'number') {
        tempCandidates.push({ prio: 0, order, value: st.currentTemp, precision: (typeof ui.precision === 'number' ? ui.precision : 1), unit: ui.unit || '°C' });
      }
      if (typeof st.humidity === 'number') {
        humCandidates.push({ prio: 0, order, value: st.humidity, precision: 0, unit: '%' });
      }
    }

    if (type === 'sensor') {
      if (typeof st.value === 'number') {
        const looksTemp = unit.includes('°c') || unit.includes('c') || alias.includes('temp') || alias.includes('temperatur');
        const looksHum = unit.includes('%') || alias.includes('feuchte') || alias.includes('humidity') || alias.includes('luft');

        if (looksTemp) {
          tempCandidates.push({ prio: 1, order, value: st.value, precision: (typeof ui.precision === 'number' ? ui.precision : 1), unit: ui.unit || '°C' });
        }
        if (looksHum) {
          humCandidates.push({ prio: 1, order, value: st.value, precision: 0, unit: '%' });
        }
      }
    }
  });

  /**
   * Code-Teil: Arrow-Funktion `pick`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: pick
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const pick = (arr) => {
    if (!arr.length) return null;
    arr.sort((a, b) => (a.prio - b.prio) || (a.order - b.order));
    return arr[0];
  };

  const t = pick(tempCandidates);
  const h = pick(humCandidates);

  const parts = [];
  if (t) {
    const val = nwFormatNumberDE(t.value, t.precision);
    if (val) parts.push(val + (t.unit ? String(t.unit).replace(/\s+/g, '') : ''));
  }
  if (h) {
    const v = Number(h.value);
    if (Number.isFinite(v)) parts.push(Math.round(v) + '%');
  }

  return parts.join(' · ');
}
/**
 * Code-Teil: nwApplyFilters
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwApplyFilters(devices) {
  const arr = Array.isArray(devices) ? devices.slice() : [];

  let out = arr;

  // favorites
  if (nwFilterState.favoritesOnly) {
    out = out.filter(d => nwIsFavorite(d));
  }

  // function filter
  if (nwFilterState.func) {
    out = out.filter(d => String(d.function || '') === String(nwFilterState.func));
  }

  return out;
}
/**
 * Code-Teil: nwGetAllFunctions
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetAllFunctions(devices) {
  const set = new Set();
  (devices || []).forEach(d => {
    const fn = String(d.function || '').trim();
    if (fn) set.add(fn);
  });
  return Array.from(set).sort(nwSortBy);
}
/**
 * Code-Teil: nwGuessIconForFunctionLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGuessIconForFunctionLabel(label) {
  const s = String(label || '').toLowerCase();
  if (!s) return null;

  if (s.includes('licht') || s.includes('beleuchtung') || s.includes('lampe') || s.includes('leuchte')) return 'bulb';
  if (s.includes('jalous') || s.includes('roll') || s.includes('blind') || s.includes('raff')) return 'blinds';
  if (s.includes('temp') || s.includes('heiz') || s.includes('klima') || s.includes('thermost')) return 'thermostat';
  if (s.includes('steck') || s.includes('schalt') || s.includes('dose') || s.includes('strom') || s.includes('power')) return 'plug';
  if (s.includes('tv') || s.includes('fernseh')) return 'tv';
  if (s.includes('audio') || s.includes('musik') || s.includes('laut')) return 'speaker';
  return null;
}
/**
 * Code-Teil: nwRenderViewChips
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderViewChips() {
  const wrap = document.getElementById('nw-filter-view');
  if (!wrap) return;
  nwClear(wrap);
  /**
   * Code-Teil: mkChip
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkChip = (label, active, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-sh-chip' + (active ? ' nw-sh-chip--active' : '');
    btn.textContent = label;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', () => {
      onClick();
      nwApplyFiltersAndRender();
    });
    wrap.appendChild(btn);
  };

  mkChip('Räume', nwViewState.mode === 'rooms', () => {
    nwViewState.mode = 'rooms';
    nwSaveViewMode(nwViewState.mode);
  });

  mkChip('Funktionen', nwViewState.mode === 'functions', () => {
    nwViewState.mode = 'functions';
    nwSaveViewMode(nwViewState.mode);
  });
}
/**
 * Code-Teil: nwRenderTextSizeChips
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderTextSizeChips() {
  const wrap = document.getElementById('nw-filter-textsize');
  if (!wrap) return;
  nwClear(wrap);
  /**
   * Code-Teil: mkChip
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkChip = (label, active, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-sh-chip' + (active ? ' nw-sh-chip--active' : '');
    btn.textContent = label;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', () => {
      onClick();
      // Kein kompletter Re-Render nötig (nur CSS), aber Chips sollen sofort aktualisiert werden.
      nwRenderTextSizeChips();
    });
    wrap.appendChild(btn);
  };

  const cur = nwNormTextSize(nwTextSizeState.size);

  mkChip('Kompakt', cur === 'compact', () => {
    nwTextSizeState.size = 'compact';
    nwSaveTextSize(nwTextSizeState.size);
    nwApplyTextSizeClass(nwTextSizeState.size);
  });

  mkChip('Normal', cur === 'normal', () => {
    nwTextSizeState.size = 'normal';
    nwSaveTextSize(nwTextSizeState.size);
    nwApplyTextSizeClass(nwTextSizeState.size);
  });

  mkChip('Groß', cur === 'large', () => {
    nwTextSizeState.size = 'large';
    nwSaveTextSize(nwTextSizeState.size);
    nwApplyTextSizeClass(nwTextSizeState.size);
  });
}
/**
 * Code-Teil: nwRenderFunctionChips
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderFunctionChips(devices) {
  const wrap = document.getElementById('nw-filter-functions');
  if (!wrap) return;
  nwClear(wrap);

  const allFns = nwGetAllFunctions(devices);
  const hasFav = (devices || []).some(d => nwIsFavorite(d));
  const baseFavOnly = !!(nwFilterState.page && nwFilterState.page.favoritesOnly);
  const effectiveFavOnly = baseFavOnly || !!nwFilterState.favoritesOnly;

  /**
   * Code-Teil: Arrow-Funktion `mkChip`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkChip
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkChip = (label, active, onClick, extraClass, disabled, title, iconName) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-sh-chip' + (active ? ' nw-sh-chip--active' : '') + (extraClass ? ' ' + extraClass : '');
    if (iconName) {
      btn.innerHTML = `<span class="nw-sh-chip__icon">${nwGetIconSvg(iconName, false)}</span><span class="nw-sh-chip__label"></span>`;
      const lbl = btn.querySelector('.nw-sh-chip__label');
      if (lbl) lbl.textContent = label;
    } else {
      btn.textContent = label;
    }
    if (title) btn.title = title;
    if (disabled) btn.disabled = true;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      onClick();
      nwApplyFiltersAndRender();
    });
    wrap.appendChild(btn);
  };

  mkChip('Alle', !nwFilterState.func && !effectiveFavOnly, () => {
    nwFilterState.func = null;
    nwFilterState.favoritesOnly = false;
  });

  // Favoriten (Schnellzugriff)
  mkChip('★ Favoriten', !!effectiveFavOnly, () => {
    if (!hasFav) return;
    if (baseFavOnly) return; // Seite erzwingt Favoriten
    nwFilterState.favoritesOnly = !nwFilterState.favoritesOnly;
    if (nwFilterState.favoritesOnly) nwFilterState.func = null;
  }, null, !hasFav || baseFavOnly, baseFavOnly
    ? 'Diese Seite zeigt nur Favoriten.'
    : (hasFav
      ? 'Nur Favoriten anzeigen'
      : 'Keine Favoriten gesetzt. Tipp: Stern ★ in einer Kachel anklicken.'));

  mkChip('★ zuerst', !!nwFilterState.favoritesFirst, () => {
    if (!hasFav) return;
    nwFilterState.favoritesFirst = !nwFilterState.favoritesFirst;
    nwSaveBoolLS(NW_SH_FAVORITES_FIRST_LS_KEY, nwFilterState.favoritesFirst);
  }, 'nw-sh-chip--mini', !hasFav, hasFav
    ? 'Favoriten in Räumen nach oben sortieren'
    : 'Keine Favoriten gesetzt.');


  allFns.forEach(fn => {
    const ic = nwGuessIconForFunctionLabel(fn);
    mkChip(fn, nwFilterState.func === fn, () => {
      if (nwFilterState.func === fn) nwFilterState.func = null;
      else nwFilterState.func = fn;
      nwFilterState.favoritesOnly = false;
    }, null, false, null, ic);
  });
}
/**
 * Code-Teil: nwGroupByRoom
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGroupByRoom(devices) {
  const map = new Map();
  (devices || []).forEach((d) => {
    const rid = nwGetDeviceRoomId(d);
    // Devices can also live directly on a floor (no roomId) – group them under the
    // corresponding floor so the visual structure matches the editor.
    let key = rid;
    if (!key) {
      const fid = nwGetDeviceFloorId(d);
      key = fid ? `__floor__${fid}` : '__no_room__';
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(d);
  });

  const keys = Array.from(map.keys());
  keys.sort((a, b) => {
    // put "no room" at the end
    if (a === '__no_room__' && b !== '__no_room__') return 1;
    if (b === '__no_room__' && a !== '__no_room__') return -1;

    const ra = nwShMeta.roomsById[a];
    const rb = nwShMeta.roomsById[b];
    const oa = (ra && Number.isFinite(+ra.order)) ? +ra.order : 999999;
    const ob = (rb && Number.isFinite(+rb.order)) ? +rb.order : 999999;
    if (oa !== ob) return oa - ob;

    const na = (ra && ra.name) ? ra.name : (map.get(a)?.[0]?.room || a);
    const nb = (rb && rb.name) ? rb.name : (map.get(b)?.[0]?.room || b);
    return String(na || '').toLowerCase().localeCompare(String(nb || '').toLowerCase());
  });

  return keys.map((key) => {
    // Floor device groups
    if (key.startsWith('__floor__')) {
      const fid = key.slice('__floor__'.length);
      return {
        roomId: key, // virtual group id
        room: 'Allgemein',
        floorId: fid,
        icon: 'folder',
        order: -1,
        isFloorDevicesGroup: true,
        devices: map.get(key) || [],
      };
    }

    const meta = nwShMeta.roomsById[key];
    const name = (meta && meta.name)
      ? meta.name
      : (key === '__no_room__'
        ? 'Ohne Raum'
        : String(map.get(key)?.[0]?.room || key).trim() || key);

    return {
      roomId: key === '__no_room__' ? '' : key,
      room: name,
      floorId: meta && meta.floorId ? String(meta.floorId).trim() : '',
      icon: meta && meta.icon ? String(meta.icon) : '',
      order: (meta && Number.isFinite(+meta.order)) ? +meta.order : undefined,
      isFloorDevicesGroup: false,
      devices: map.get(key) || [],
    };
  });
}
/**
 * Code-Teil: nwGroupByFunction
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGroupByFunction(devices) {
  const map = new Map();
  (devices || []).forEach(d => {
    const fn = String(d.function || '').trim() || 'Ohne Funktion';
    if (!map.has(fn)) map.set(fn, []);
    map.get(fn).push(d);
  });

  const fns = Array.from(map.keys()).sort(nwSortBy);
  return fns.map(fn => ({ func: fn, devices: map.get(fn) || [] }));
}
/**
 * Code-Teil: nwShowEmptyState
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShowEmptyState(show, ctx) {
  const empty = document.getElementById('nw-smarthome-empty');
  const rooms = document.getElementById('nw-smarthome-rooms');
  if (rooms) rooms.style.display = show ? 'none' : '';
  if (!empty) return;

  if (!show) {
    empty.classList.remove('nw-sh-empty--loading');
    empty.style.display = 'none';
    empty.textContent = '';
    return;
  }

  empty.classList.remove('nw-sh-empty--loading');

  const enabled = (typeof ctx?.enabled === 'boolean')
    ? ctx.enabled
    : (typeof nwSmartHomeEnabled === 'boolean' ? nwSmartHomeEnabled : null);

  empty.style.display = '';

  if (enabled === false) {
    empty.innerHTML = [
      '⚠️ <b>SmartHome ist deaktiviert</b> – deshalb bleibt diese Seite leer.<br/>',
      'Aktiviere SmartHome im <b>Admin → SmartHome</b> und lade die Seite neu.<br/>',
      '<span style="opacity:0.85">Tipp: Wenn du gerade konfiguriert hast, bitte einmal Hard‑Reload (Strg+F5).</span>'
    ].join('');
    return;
  }

  if (ctx && ctx.reason === 'filtered') {
    empty.innerHTML = 'Keine Treffer für die aktuellen Filter. <span style="opacity:0.85">(„Alle“ wählen oder Filter zurücksetzen)</span>';
    return;
  }

  empty.innerHTML = [
    'Noch keine SmartHome‑Kacheln konfiguriert.<br/>',
    '<span style="opacity:0.85">Die Einrichtung von Räumen und Geräten erfolgt durch Installer oder Admin.</span>'
  ].join('');
}

// ---- Long‑Press Info‑Toast (Mobile UX) ----
let nwShToastEl = null;
let nwShToastHideTimer = null;
/**
 * Code-Teil: nwEnsureShToast
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureShToast() {
  if (nwShToastEl) return nwShToastEl;
  const el = document.createElement('div');
  el.className = 'nw-sh-toast';
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  nwShToastEl = el;
  return el;
}
/**
 * Code-Teil: nwHideShToast
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwHideShToast() {
  if (!nwShToastEl) return;
  nwShToastEl.classList.remove('nw-sh-toast--show');
  if (nwShToastHideTimer) {
    clearTimeout(nwShToastHideTimer);
    nwShToastHideTimer = null;
  }
}
/**
 * Code-Teil: nwShowShToastForTile
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwShowShToastForTile(dev) {
  const toast = nwEnsureShToast();
  if (nwShToastHideTimer) {
    clearTimeout(nwShToastHideTimer);
    nwShToastHideTimer = null;
  }

  // Build content with text nodes to avoid injection.
  nwClear(toast);
  const name = document.createElement('div');
  name.className = 'nw-sh-toast__name';
  name.textContent = String(dev.alias || dev.id || '');

  const meta = document.createElement('div');
  meta.className = 'nw-sh-toast__meta';
  const parts = [];
  if (dev.room) parts.push(String(dev.room));
  if (dev.function) parts.push(String(dev.function));
  const st = nwGetStateText(dev);
  if (st) parts.push(st);
  meta.textContent = parts.join(' · ');

  toast.appendChild(name);
  toast.appendChild(meta);

  // show
  toast.classList.add('nw-sh-toast--show');
  nwShToastHideTimer = setTimeout(() => {
    toast.classList.remove('nw-sh-toast--show');
    nwShToastHideTimer = null;
  }, 2300);
}
/**
 * Code-Teil: nwCreateTile
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateTile(dev, opts) {
  const type = String(dev.type || '').toLowerCase();
  const bigValue = nwFormatBigValue(dev);
  const hasBigValue = !!(bigValue && bigValue.hasValue);
  const isTemperatureTile = nwLooksLikeTemperatureDevice(dev) && hasBigValue;
  const isSensorValueTile = (type === 'sensor') && hasBigValue;
  const showCenteredValue = isSensorValueTile || (isTemperatureTile && type === 'rtr');
  const size = nwGetTileSize(dev);
  const qualityStatus = nwGetQualityStatus(dev);
  const stateKnown = nwHasPrimaryState(dev);
  const isOn = nwIsOn(dev);
  const canWrite = nwHasWriteAccess(dev);
  const isFav = nwIsFavorite(dev);
  const isMomentary = nwIsMomentaryDevice(dev);
  const isWritableValue = type === 'sensor'
    && canWrite
    && !!(dev.io && dev.io.sensor && (dev.io.sensor.writeId || (dev.capabilities && dev.capabilities.writableValue)));

  // Device types that have an extra detail button in the header (⋯)
  const hasDetails = (type === 'dimmer' || type === 'blind' || type === 'rtr' || type === 'player' || type === 'color' || isWritableValue);
  const hasTimer = nwSupportsTimer(dev);
  const actionsCount = 1 + (hasTimer ? 1 : 0) + (hasDetails ? 1 : 0);

  const iconSpec = nwGetIconSpec(dev);
  const iconName = (iconSpec.kind === 'svg')
    ? iconSpec.name
    : (iconSpec.kind === 'dynamic' && iconSpec.base === 'wallbox')
      ? 'charger'
      : (iconSpec.kind === 'dynamic' && iconSpec.base === 'inverter')
        ? 'solar'
        : 'generic';
  const accent = nwGetAccentColor(dev, iconName);

  const tile = document.createElement('div');
  tile.className = [
    'nw-sh-tile',
    'nw-sh-tile--type-' + (type || 'unknown'),
    isTemperatureTile ? 'nw-sh-tile--temperature' : '',
    showCenteredValue ? 'nw-sh-tile--value-large' : '',
    'nw-sh-tile--size-' + size,
    stateKnown ? (isOn ? 'nw-sh-tile--on' : 'nw-sh-tile--off') : 'nw-sh-tile--unknown',
    'nw-sh-tile--quality-' + qualityStatus,
    canWrite ? '' : 'nw-sh-tile--readonly',
    isFav ? 'nw-sh-tile--favorite' : '',
    ['error', 'offline', 'invalid'].includes(qualityStatus) ? 'nw-sh-tile--error' : '',
    qualityStatus === 'stale' ? 'nw-sh-tile--stale' : '',
    'nw-sh-tile--actions-' + actionsCount,
  ].filter(Boolean).join(' ');

  tile.style.setProperty('--sh-accent', accent);

  // Tooltip: always include the full device name first (prevents confusion when the title wraps)
  const fullName = String(dev.alias || dev.id || '');
  const hint = nwGetTileHint(dev);
  tile.title = hint ? `${fullName}\n${hint}` : fullName;

  // Header: Icon + Name + State
  const header = document.createElement('div');
  header.className = 'nw-sh-tile__header';

  const icon = nwCreateIconElement(dev, isOn, iconSpec, accent);

  const titleWrap = document.createElement('div');
  titleWrap.className = 'nw-sh-tile__title';

  const name = document.createElement('div');
  name.className = 'nw-sh-tile__name';
  name.textContent = dev.alias || dev.id;
  name.title = fullName;

  const state = document.createElement('div');
  state.className = 'nw-sh-tile__state';
  const baseStateText = nwGetStateText(dev);
  const roomLabel = (opts && opts.showRoom) ? String(dev.room || '').trim() : '';
  let stateText = '';
  if (showCenteredValue) {
    // Sensor-/Messwerte werden groß und zentriert in der Kachel gezeigt.
    // In Übersichten mit Raumanzeige bleibt der Raum als Kontext erhalten.
    stateText = roomLabel || '';
  } else {
    stateText = roomLabel ? `${roomLabel} · ${baseStateText}` : baseStateText;
  }
  state.textContent = stateText;
  if (!stateText) state.classList.add('nw-sh-tile__state--empty');

  titleWrap.appendChild(name);
  titleWrap.appendChild(state);

  header.appendChild(icon);
  header.appendChild(titleWrap);

  // Actions (top-right): Favorite (Endkunde) + optional details
  const actions = document.createElement('div');
  actions.className = 'nw-sh-tile__actions';

  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = 'nw-sh-favbtn' + (isFav ? ' nw-sh-favbtn--active' : '');
  favBtn.textContent = isFav ? '★' : '☆';
  favBtn.title = isFav ? 'Favorit entfernen' : 'Als Favorit markieren';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an favBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  favBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    nwToggleFavorite(dev);
    nwApplyFiltersAndRender();
  });
  actions.appendChild(favBtn);

  // Zeitschaltuhr (Endkunde)
  if (hasTimer) {
    const tbtn = document.createElement('button');
    tbtn.type = 'button';
    tbtn.className = 'nw-sh-timerbtn' + ((dev.timer && dev.timer.enabled) ? ' nw-sh-timerbtn--active' : '');
    tbtn.textContent = '⏲';
    tbtn.title = 'Zeitschaltuhr';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an tbtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    tbtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      nwOpenTimerPopover(dev, tbtn);
    });
    actions.appendChild(tbtn);
  }

  // Detail/Tooltip-Popover (für Dimmer/Jalousie/RTR)
  if (hasDetails) {
    // Klick auf Icon öffnet das Bedienpanel (Tooltip)
    icon.title = 'Bedienung';
    icon.style.cursor = 'pointer';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an icon. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    icon.addEventListener('click', (ev) => {
      ev.stopPropagation();
      nwOpenDevicePopover(dev, tile);
    });

    // Optionaler "Mehr"-Button (⋯)
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'nw-sh-detailbtn';
    more.textContent = '⋯';
    more.title = 'Bedienung';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an more. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    more.addEventListener('click', (ev) => {
      ev.stopPropagation();
      nwOpenDevicePopover(dev, tile);
    });
    actions.appendChild(more);
  }

  header.appendChild(actions);

  tile.appendChild(header);

  // Big content: explicit XL tiles keep their rich content; sensor/status tiles
  // always get a compact, centered value so readings are readable at a glance.
  if (size === 'xl' || showCenteredValue) {
    const big = document.createElement('div');
    big.className = 'nw-sh-tile__big' + (showCenteredValue ? ' nw-sh-tile__big--value' : '');

    if (size === 'xl' && type === 'camera') {
      tile.classList.add('nw-sh-tile--media');
      const cam = (dev.io && dev.io.camera) ? dev.io.camera : {};
      const snapshotUrl = (typeof cam.snapshotUrl === 'string') ? cam.snapshotUrl : '';
      const liveUrl = (typeof cam.liveUrl === 'string') ? cam.liveUrl : '';

      const media = document.createElement('div');
      media.className = 'nw-sh-media';

      const img = document.createElement('img');
      img.className = 'nw-sh-media__img';
      img.alt = dev.title || 'Kamera';

      if (snapshotUrl) {
        const bust = (snapshotUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        img.src = snapshotUrl + bust;
      }

      media.appendChild(img);
      big.appendChild(media);

      if (liveUrl || snapshotUrl) {
        const btnRow = document.createElement('div');
        btnRow.className = 'nw-sh-media__actions';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nw-sh-btn';
        btn.textContent = 'Live öffnen';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const url = liveUrl || snapshotUrl;
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        });

        btnRow.appendChild(btn);
        big.appendChild(btnRow);

        // Click on preview also opens
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an media. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        media.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const url = liveUrl || snapshotUrl;
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        });
      }
    } else if (size === 'xl' && type === 'widget') {
      tile.classList.add('nw-sh-tile--media');
      const w = (dev.io && dev.io.widget) ? dev.io.widget : {};
      const kind = (typeof w.kind === 'string' && w.kind.trim()) ? w.kind.trim() : 'iframe';
      const url = (typeof w.url === 'string') ? w.url : '';
      const openUrl = (typeof w.openUrl === 'string') ? w.openUrl : '';
      const embed = !!w.embed;
      const height = (typeof w.height === 'number' && w.height > 0) ? w.height : 260;

      if (kind === 'iframe' && url && embed) {
        const frame = document.createElement('iframe');
        frame.className = 'nw-sh-media__iframe';
        frame.src = url;
        frame.loading = 'lazy';
        frame.referrerPolicy = 'no-referrer';
        frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
        frame.style.height = height + 'px';
        big.appendChild(frame);
      } else {
        const info = document.createElement('div');
        info.className = 'nw-sh-media__placeholder';
        info.textContent = (typeof w.label === 'string' && w.label.trim()) ? w.label.trim() : (url || 'Widget');
        big.appendChild(info);
      }

      if (openUrl || url) {
        const btnRow = document.createElement('div');
        btnRow.className = 'nw-sh-media__actions';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nw-sh-btn';
        btn.textContent = 'Öffnen';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const u = openUrl || url;
          if (u) window.open(u, '_blank', 'noopener,noreferrer');
        });

        btnRow.appendChild(btn);
        big.appendChild(btnRow);
      }
    } else {
      const { value, unit } = bigValue || nwFormatBigValue(dev);
      if (typeof value !== 'undefined' && value !== null && String(value) !== '') {
        const val = document.createElement('div');
        val.className = 'nw-sh-tile__value';
        val.textContent = value;

        const u = document.createElement('span');
        u.className = 'nw-sh-tile__unit';
        u.textContent = unit || '';

        val.appendChild(u);
        big.appendChild(val);
      }

      // Secondary line for RTR: setpoint/humidity
      if (size === 'xl' && type === 'rtr') {
        const st = dev.state || {};
        const meta = document.createElement('div');
        meta.className = 'nw-sh-tile__meta';

        const parts = [];
        if (typeof st.setpoint === 'number') {
          parts.push('Soll ' + st.setpoint.toFixed(1).replace('.', ',') + '°C');
        }
        if (typeof st.humidity === 'number') {
          parts.push('RH ' + Math.round(st.humidity) + '%');
        }
        meta.textContent = parts.join(' · ') || '';
        big.appendChild(meta);

        if (canWrite && dev.io && dev.io.climate && dev.io.climate.setpointId) {
          const controls = document.createElement('div');
          controls.className = 'nw-sh-controls nw-sh-controls--rtr';

          const btnMinus = document.createElement('button');
          btnMinus.type = 'button';
          btnMinus.className = 'nw-sh-btn';
          btnMinus.textContent = '−';

          const btnPlus = document.createElement('button');
          btnPlus.type = 'button';
          btnPlus.className = 'nw-sh-btn';
          btnPlus.textContent = '+';

          /**
           * Code-Teil: Arrow-Funktion `stop`
           * Zweck: verwaltet Lifecycle/Ressourcen wie Server, Timer oder SSE-Verbindungen.
           * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
           * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
           */
          /**
           * Code-Teil: stop
           * Zweck: Stoppt Prozess, Timer, Engine oder Verbindung.
           * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
           * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
           */
          const stop = (ev) => ev.stopPropagation();
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnMinus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          btnMinus.addEventListener('click', stop);
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPlus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          btnPlus.addEventListener('click', stop);

          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnMinus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          btnMinus.addEventListener('click', async () => {
            await nwAdjustRtrSetpoint(dev, -0.5);
          });

          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPlus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          btnPlus.addEventListener('click', async () => {
            await nwAdjustRtrSetpoint(dev, 0.5);
          });

          controls.appendChild(btnMinus);
          controls.appendChild(btnPlus);
          big.appendChild(controls);
        }
      }
    }

    tile.appendChild(big);
  }

  // Premium mini dial inside control tiles (visual half-circle).
  // Click/tap on the tile opens the large control popover; this dial gives an immediate, clean status preview.
  if ((type === 'dimmer' || type === 'blind' || type === 'color') && dev.io && dev.io.level && (dev.io.level.readId || dev.io.level.writeId)) {
    const lvlCfg = dev.io.level || {};
    const min = type === 'blind' ? 0 : (typeof lvlCfg.min === 'number' ? lvlCfg.min : 0);
    const max = type === 'blind' ? 100 : (typeof lvlCfg.max === 'number' ? lvlCfg.max : 100);
    const st = dev.state || {};
    const raw = type === 'blind'
      ? ((typeof st.position === 'number') ? st.position : (typeof st.level === 'number' ? st.level : null))
      : ((typeof st.level === 'number') ? st.level : (typeof st.position === 'number' ? st.position : null));
    const hasDialValue = typeof raw === 'number' && Number.isFinite(raw) && stateKnown;
    const value = hasDialValue ? nwClampNumber(raw, min, max) : min;
    const pct = hasDialValue && (max - min) > 0 ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
    const dial = document.createElement('div');
    dial.className = 'nw-sh-tile-dial' + (hasDialValue ? '' : ' nw-sh-tile-dial--unknown');
    dial.style.setProperty('--nw-sh-arc-deg', Math.round(pct * 1.8) + 'deg');
    dial.title = 'Große Bedienung öffnen';

    const arc = document.createElement('div');
    arc.className = 'nw-sh-tile-dial__arc';
    const valueEl = document.createElement('div');
    valueEl.className = 'nw-sh-tile-dial__value';
    valueEl.textContent = hasDialValue ? (Math.round(value) + '%') : '—';
    arc.appendChild(valueEl);

    const meta = document.createElement('div');
    meta.className = 'nw-sh-tile-dial__meta';
    const label = document.createElement('div');
    label.className = 'nw-sh-tile-dial__label';
    label.textContent = type === 'blind' ? 'Position' : (type === 'color' ? 'Helligkeit' : 'Dimmer');
    const hint = document.createElement('div');
    hint.className = 'nw-sh-tile-dial__hint';
    hint.textContent = 'Tippen für große Steuerung';
    meta.appendChild(label);
    meta.appendChild(hint);

    dial.appendChild(arc);
    dial.appendChild(meta);
    tile.appendChild(dial);
  }

  // Dimmer/Blind: optional slider (if level mapping exists)
  // We only show the slider on extra-large tiles to keep the default grid close to the standard tile UX.
  if (size === 'xl' && (type === 'dimmer' || type === 'blind') && dev.io && dev.io.level && (dev.io.level.readId || dev.io.level.writeId)) {
    const lvlCfg = dev.io.level;
    const min = type === 'blind' ? 0 : (typeof lvlCfg.min === 'number' ? lvlCfg.min : 0);
    const max = type === 'blind' ? 100 : (typeof lvlCfg.max === 'number' ? lvlCfg.max : 100);
    const st = dev.state || {};
    const current = type === 'blind'
      ? ((typeof st.position === 'number') ? st.position : (typeof st.level === 'number' ? st.level : 0))
      : ((typeof st.level === 'number') ? st.level : (typeof st.position === 'number' ? st.position : 0));
    const hasLevelWrite = canWrite && !!(lvlCfg.writeId || lvlCfg.readId);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(Math.max(min, Math.min(max, current)));
    slider.className = 'nw-sh-slider nw-sh-slider--tilebig';
    slider.disabled = !hasLevelWrite;

    // Visual progress fill (accent track)
    try { nwUpdateRangeFill(slider); } catch (_e) {}
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    slider.addEventListener('input', () => {
      try { nwUpdateRangeFill(slider); } catch (_e) {}
    }, { passive: true });

    /**
     * Code-Teil: Arrow-Funktion `stop`
     * Zweck: verwaltet Lifecycle/Ressourcen wie Server, Timer oder SSE-Verbindungen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: stop
     * Zweck: Stoppt Prozess, Timer, Engine oder Verbindung.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const stop = (ev) => ev.stopPropagation();
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    slider.addEventListener('mousedown', stop);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchstart' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    slider.addEventListener('touchstart', stop);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    slider.addEventListener('click', stop);

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    slider.addEventListener('change', async (ev) => {
      if (!hasLevelWrite) return;
      const raw = Number(ev.target.value);
      if (!Number.isFinite(raw)) return;
      const target = type === 'blind' ? nwClampNumber(raw, 0, 100) : raw;
      await nwSetLevel(dev.id, target);
      await nwReloadDevices({ force: true });
    });

    tile.appendChild(slider);
  }

  // In-tile quick controls (explicit toggles / +/- inside the tile)
  // Note: tile click still acts as a fast action; these controls are for clarity & UX.
  const footer = document.createElement('div');
  footer.className = 'nw-sh-tile__footer';

  /**
   * Code-Teil: Arrow-Funktion `addMiniToggle`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: addMiniToggle
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const addMiniToggle = () => {
    const t = document.createElement('button');
    t.type = 'button';
    const commandAllowed = canWrite && (isMomentary || stateKnown);
    t.className = 'nw-sh-mini-toggle'
      + (isMomentary ? ' nw-sh-mini-toggle--momentary' : '')
      + (stateKnown && isOn ? ' nw-sh-mini-toggle--on' : '');
    t.setAttribute('aria-pressed', (!isMomentary && stateKnown && isOn) ? 'true' : 'false');
    t.title = isMomentary
      ? 'Impuls auslösen'
      : (stateKnown ? (isOn ? 'Ausschalten' : 'Einschalten') : 'Keine gültige Rückmeldung – Umschalten gesperrt');
    t.disabled = !commandAllowed;
    t.addEventListener('click', (ev) => ev.stopPropagation());
    t.addEventListener('click', async () => {
      if (!commandAllowed) return;
      const result = isMomentary
        ? await nwToggleDevice(dev.id)
        : await nwToggleDevice(dev.id, !isOn);
      if (!result) return;
      await nwReloadDevices({ force: true });
    });
    footer.appendChild(t);
  };

  /**
   * Code-Teil: Arrow-Funktion `addMiniBtn`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: addMiniBtn
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const addMiniBtn = (label, title, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-mini-btn';
    b.textContent = label;
    if (title) b.title = title;
    b.disabled = !canWrite;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', (ev) => ev.stopPropagation());
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', async () => {
      if (!canWrite) return;
      await onClick();
    });
    footer.appendChild(b);
  };

  if (type === 'switch' || type === 'color' || type === 'dimmer') {
    addMiniToggle();
  }

  if (type === 'dimmer' && dev.io && dev.io.level && (dev.io.level.writeId || dev.io.level.readId)) {
    const lvlCfg = dev.io.level;
    const min = typeof lvlCfg.min === 'number' ? lvlCfg.min : 0;
    const max = typeof lvlCfg.max === 'number' ? lvlCfg.max : 100;
    const step = typeof lvlCfg.step === 'number' ? lvlCfg.step : 5;
    const st = dev.state || {};
    const current = (typeof st.level === 'number') ? st.level : null;

    if (typeof current === 'number') addMiniBtn('−', 'Dimmen −', async () => {
      const next = Math.max(min, Math.min(max, current - step));
      await nwSetLevel(dev.id, next);
      await nwReloadDevices({ force: true });
    });
    if (typeof current === 'number') addMiniBtn('+', 'Dimmen +', async () => {
      const next = Math.max(min, Math.min(max, current + step));
      await nwSetLevel(dev.id, next);
      await nwReloadDevices({ force: true });
    });
  }

  if (type === 'scene') {
    addMiniBtn('▶', 'Szene ausführen', async () => {
      const st = await nwToggleDevice(dev.id);
      if (!st) return;
      await nwReloadDevices({ force: true });
    });
  }

  if (footer.childNodes && footer.childNodes.length) {
    tile.appendChild(footer);
  }

  // Blind buttons (up/stop/down)
  if (type === 'blind') {
    const cover = dev.io && dev.io.cover ? dev.io.cover : {};
    const blindState = dev.state || {};
    const safetyActive = blindState.locked === true || blindState.windAlarm === true || blindState.rainAlarm === true || blindState.frostAlarm === true;
    const safetyUnknown = [
      ['locked', cover.lockId],
      ['windAlarm', cover.windAlarmId],
      ['rainAlarm', cover.rainAlarmId],
      ['frostAlarm', cover.frostAlarmId],
    ].some(([field, dpId]) => !!dpId && typeof blindState[field] !== 'boolean');
    const movementAllowed = canWrite && !safetyActive && !safetyUnknown;
    const controls = document.createElement('div');
    controls.className = 'nw-sh-controls';

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
    const mk = (label, action, mapped, allowed) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-sh-btn';
      b.textContent = label;
      b.disabled = !mapped || !allowed;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      b.addEventListener('click', (ev) => ev.stopPropagation());
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      b.addEventListener('click', async () => {
        if (b.disabled) return;
        const ok = await nwCoverAction(dev.id, action);
        if (ok) await nwReloadDevices({ force: true });
      });
      return b;
    };

    const upMapped = !!(cover.upId || cover.actionId);
    const stopMapped = !!cover.stopId;
    const downMapped = !!(cover.downId || cover.actionId);
    if (upMapped) controls.appendChild(mk('▲', 'up', true, movementAllowed));
    if (stopMapped) controls.appendChild(mk('■', 'stop', true, canWrite));
    if (downMapped) controls.appendChild(mk('▼', 'down', true, movementAllowed));

    if (controls.childNodes.length) tile.appendChild(controls);
  }

  // Long‑Press (Touch)
  // - Kacheln mit Bedienpanel: Long‑Press öffnet das Tooltip/Panel
  // - Sonst: zeigt vollen Namen + Raum/Funktion (hilft auf Smartphones bei gekürzten Titeln)
  let lpTimer = null;
  let lpStartX = 0;
  let lpStartY = 0;

  /**
   * Code-Teil: Arrow-Funktion `lpCancel`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: lpCancel
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const lpCancel = () => {
    if (lpTimer) {
      clearTimeout(lpTimer);
      lpTimer = null;
    }
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  tile.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'touch') return;
    // In Controls/Buttons/Inputs keinen Long‑Press starten
    if (ev.target && (ev.target.closest('button') || ev.target.closest('input'))) return;

    lpCancel();
    lpStartX = ev.clientX;
    lpStartY = ev.clientY;
    lpTimer = setTimeout(() => {
      lpTimer = null;
      tile.__nwIgnoreNextClick = true;
      if (hasDetails) {
        nwOpenDevicePopover(dev, tile);
      } else {
        nwShowShToastForTile(dev);
      }
    }, 520);
  }, { passive: true });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointermove' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  tile.addEventListener('pointermove', (ev) => {
    if (!lpTimer || ev.pointerType !== 'touch') return;
    const dx = ev.clientX - lpStartX;
    const dy = ev.clientY - lpStartY;
    if (Math.abs(dx) + Math.abs(dy) > 14) {
      // Finger bewegt -> Long‑Press abbrechen
      lpCancel();
    }
  }, { passive: true });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerup' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  tile.addEventListener('pointerup', lpCancel, { passive: true });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointercancel' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  tile.addEventListener('pointercancel', lpCancel, { passive: true });

  // Tap actions
  // - Jalousie & Raumtemperatur: Tap öffnet das Bedienpanel (Tooltip)
  // - Schalter/Dimmer/Szene/Player: Tap = Schnellaktion, Long‑Press = Tooltip
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  tile.addEventListener('click', async () => {
    if (tile.__nwIgnoreNextClick) {
      tile.__nwIgnoreNextClick = false;
      return;
    }
    if (type === 'blind' || type === 'rtr' || type === 'dimmer' || type === 'color' || type === 'player' || isWritableValue) {
      nwOpenDevicePopover(dev, tile);
      return;
    }

    if (type === 'camera') {
      const cam = (dev.io && dev.io.camera) ? dev.io.camera : {};
      const snapshotUrl = (typeof cam.snapshotUrl === 'string') ? cam.snapshotUrl : '';
      const liveUrl = (typeof cam.liveUrl === 'string') ? cam.liveUrl : '';
      const url = liveUrl || snapshotUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (type === 'widget') {
      const w = (dev.io && dev.io.widget) ? dev.io.widget : {};
      const url = (typeof w.openUrl === 'string' && w.openUrl) ? w.openUrl : ((typeof w.url === 'string') ? w.url : '');
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!canWrite) {
      // Read‑Only: bei Modulen mit Panel trotzdem öffnen
      if (hasDetails) nwOpenDevicePopover(dev, tile);
      return;
    }
    if (type === 'color') {
      const hasSwitch = !!(dev.io && dev.io.switch && (dev.io.switch.writeId || dev.io.switch.readId));
      if (!hasSwitch) {
        // Ohne Schalt-DP: Klick öffnet direkt das Farb-Panel
        nwOpenDevicePopover(dev, tile);
        return;
      }
      if (!stateKnown) {
        nwOpenDevicePopover(dev, tile);
        return;
      }
      const st = await nwToggleDevice(dev.id, !isOn);
      if (!st) return;
      await nwReloadDevices({ force: true });
      return;
    }

    if (type !== 'switch' && type !== 'scene') return;
    if (!isMomentary && !stateKnown) {
      nwShowShToastForTile(dev);
      return;
    }
    const result = isMomentary
      ? await nwToggleDevice(dev.id)
      : await nwToggleDevice(dev.id, !isOn);
    if (!result) return;
    await nwReloadDevices({ force: true });
  });

  return tile;
}


/* -------------------------------------------------------------------------- */
/* Tooltip/Bedienpanel (Popover)                                              */
/* -------------------------------------------------------------------------- */

let nwPopoverBackdropEl = null;
let nwPopoverEl = null;
let nwPopoverOpenId = null;
let nwPopoverAnchorEl = null;
let nwPopoverDev = null;
let nwPopoverDragging = false;

// Prevent background scrolling while a SmartHome popover is open.
// (Especially important on mobile/touch devices.)
let nwBodyScrollLocked = false;
let nwBodyScrollY = 0;
/**
 * Code-Teil: nwLockBodyScroll
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLockBodyScroll() {
  if (nwBodyScrollLocked) return;
  nwBodyScrollLocked = true;

  nwBodyScrollY = window.scrollY || window.pageYOffset || 0;

  // Prevent layout jump when the scrollbar disappears (desktop).
  const sbW = Math.max(0, (window.innerWidth || 0) - (document.documentElement?.clientWidth || 0));
  if (sbW > 0) document.body.style.paddingRight = sbW + 'px';

  // Lock both <html> and <body> (some browsers only honor one of them).
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // iOS/Safari: overflow hidden is not always enough.
  document.body.style.position = 'fixed';
  document.body.style.top = (-nwBodyScrollY) + 'px';
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.classList.add('nw-scroll-locked');
}
/**
 * Code-Teil: nwUnlockBodyScroll
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwUnlockBodyScroll() {
  if (!nwBodyScrollLocked) return;
  nwBodyScrollLocked = false;

  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.body.style.paddingRight = '';
  document.body.classList.remove('nw-scroll-locked');

  // Restore scroll position after removing fixed positioning.
  const y = nwBodyScrollY || 0;
  nwBodyScrollY = 0;
  try { window.scrollTo(0, y); } catch (_e) {}
}
/**
 * Code-Teil: nwEnsurePopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsurePopover() {
  if (nwPopoverBackdropEl && nwPopoverEl) return;

  nwPopoverBackdropEl = document.createElement('div');
  nwPopoverBackdropEl.id = 'nw-sh-popover-backdrop';
  nwPopoverBackdropEl.className = 'nw-sh-popover-backdrop hidden';

  nwPopoverEl = document.createElement('div');
  nwPopoverEl.id = 'nw-sh-popover';
  nwPopoverEl.className = 'nw-sh-popover hidden';

  document.body.appendChild(nwPopoverBackdropEl);
  document.body.appendChild(nwPopoverEl);

  // clicks inside should not close
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an nwPopoverEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  nwPopoverEl.addEventListener('click', (ev) => ev.stopPropagation());

  /**
   * Code-Teil: Arrow-Funktion `close`
   * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: close
   * Zweck: Schließt Dialoge/Seiten/Popovers.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const close = () => nwClosePopover();
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an nwPopoverBackdropEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  nwPopoverBackdropEl.addEventListener('click', close);

  // Block scroll gestures on the backdrop itself (extra safety).
  // (Body is locked as well, but this prevents "rubber band" scrolling.)
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'wheel' an nwPopoverBackdropEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  nwPopoverBackdropEl.addEventListener('wheel', (ev) => ev.preventDefault(), { passive: false });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchmove' an nwPopoverBackdropEl. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  nwPopoverBackdropEl.addEventListener('touchmove', (ev) => ev.preventDefault(), { passive: false });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'resize' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('resize', () => {
    if (nwPopoverOpenId) nwPositionPopover(nwPopoverAnchorEl);
  }, { passive: true });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'scroll' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('scroll', () => {
    if (nwPopoverOpenId) nwPositionPopover(nwPopoverAnchorEl);
  }, { passive: true, capture: true });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') close();
  }, { passive: true });
}
/**
 * Code-Teil: nwClosePopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwClosePopover() {
  if (!nwPopoverEl || !nwPopoverBackdropEl) return;
  nwPopoverEl.classList.add('hidden');
  nwPopoverBackdropEl.classList.add('hidden');
  nwPopoverEl.innerHTML = '';
  nwPopoverOpenId = null;
  nwPopoverAnchorEl = null;
  nwPopoverDragging = false;
  nwUnlockBodyScroll();
}
/**
 * Code-Teil: nwOpenDevicePopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenDevicePopover(dev, anchorEl) {
  if (!dev || !dev.id) return;
  nwEnsurePopover();

  // if same device is open -> close (toggle)
  if (nwPopoverOpenId && nwPopoverOpenId === dev.id && !nwPopoverEl.classList.contains('hidden')) {
    nwClosePopover();
    return;
  }

  nwPopoverOpenId = dev.id;
  nwPopoverAnchorEl = anchorEl || null;
  nwPopoverDragging = false;

  nwPopoverBackdropEl.classList.remove('hidden');
  nwPopoverEl.classList.remove('hidden');
  nwPopoverEl.innerHTML = '';

  // Lock background scrolling while the popover is visible.
  nwLockBodyScroll();

  nwBuildPopoverContent(dev);

  // Position after layout
  requestAnimationFrame(() => nwPositionPopover(nwPopoverAnchorEl));
}


// --- Zeitschaltuhr-Popover (pro Gerät) ---
/**
 * Code-Teil: nwOpenTimerPopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenTimerPopover(dev, anchorEl) {
  if (!dev || !dev.id) return;
  nwEnsurePopover();

  const openId = `timer:${dev.id}`;
  if (nwPopoverOpenId && nwPopoverOpenId === openId && !nwPopoverEl.classList.contains('hidden')) {
    nwClosePopover();
    return;
  }

  nwPopoverOpenId = openId;
  nwPopoverAnchorEl = anchorEl || null;
  nwPopoverDev = dev;

  nwPopoverEl.classList.remove('hidden');
  nwPopoverEl.innerHTML = '';
  nwBuildTimerPopoverContent(dev);

  requestAnimationFrame(() => nwPositionPopover(anchorEl));
}
/**
 * Code-Teil: nwBuildTimerPopoverContent
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwBuildTimerPopoverContent(dev) {
  // Header
  const hdr = document.createElement('div');
  hdr.className = 'nw-sh-popover__hdr';
  const left = document.createElement('div');
  left.className = 'nw-sh-popover__hdrleft';

  const icon = document.createElement('div');
  icon.className = 'nw-sh-popover__icon';
  icon.textContent = (dev.icon && String(dev.icon).trim()) ? String(dev.icon).trim() : '⏲';
  left.appendChild(icon);

  const titleWrap = document.createElement('div');
  titleWrap.className = 'nw-sh-popover__titles';
  const title = document.createElement('div');
  title.className = 'nw-sh-popover__title';
  title.textContent = String(dev.alias || dev.name || dev.id || 'Gerät');
  const state = document.createElement('div');
  state.className = 'nw-sh-popover__state';
  titleWrap.appendChild(title);
  titleWrap.appendChild(state);
  left.appendChild(titleWrap);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'nw-sh-popover__close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Schließen';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an closeBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); nwClosePopover(); });
  hdr.appendChild(left);
  hdr.appendChild(closeBtn);
  nwPopoverEl.appendChild(hdr);

  // Body
  const body = document.createElement('div');
  body.className = 'nw-sh-popover__body';

  const t = (dev.timer && typeof dev.timer === 'object') ? dev.timer : null;
  let enabled = !!(t && t.enabled);
  let days = Array.isArray(t && t.days) ? t.days.slice() : [0, 1, 2, 3, 4, 5, 6];
  let onTime = (t && t.onTime) ? String(t.onTime) : '';
  let offTime = (t && t.offTime) ? String(t.offTime) : '';

  // For dimmer: optional on level
  const type = String(dev.type || '').toLowerCase();
  const isBlind = type === 'blind';
  const labelOn = isBlind ? 'AUF' : 'EIN';
  const labelOff = isBlind ? 'ZU' : 'AUS';
  const labelOnTime = isBlind ? 'AUF um' : 'EIN um';
  const labelOffTime = isBlind ? 'ZU um' : 'AUS um';
  const hasLevel = (type === 'dimmer') && dev.io && dev.io.level;
  const minLvl = (hasLevel && typeof dev.io.level.min === 'number') ? dev.io.level.min : 0;
  const maxLvl = (hasLevel && typeof dev.io.level.max === 'number') ? dev.io.level.max : 100;
  let onLevel = (t && typeof t.onLevel === 'number') ? t.onLevel : maxLvl;
  if (typeof onLevel !== 'number' || Number.isNaN(onLevel)) onLevel = maxLvl;
  onLevel = Math.max(minLvl, Math.min(maxLvl, onLevel));

  /**
   * Code-Teil: Arrow-Funktion `fmtNext`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: fmtNext
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const fmtNext = () => {
    if (!enabled) return 'Zeitschaltuhr: Aus';
    const nextAt = t && t.nextAt ? Number(t.nextAt) : null;
    const nextKind = t && t.nextKind ? String(t.nextKind) : '';
    if (nextAt && Number.isFinite(nextAt) && nextAt > Date.now()) {
      const d = new Date(nextAt);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const label = (nextKind === 'on') ? labelOn : (nextKind === 'off' ? labelOff : '');
      return `Nächstes Event: ${label} ${hh}:${mm}`.trim();
    }
    return 'Zeitschaltuhr aktiv';
  };

  /**
   * Code-Teil: Arrow-Funktion `updateHeaderState`
   * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: updateHeaderState
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const updateHeaderState = () => { state.textContent = fmtNext(); };
  updateHeaderState();

  // Enable toggle row
  {
    const row = document.createElement('div');
    row.className = 'nw-sh-popover__row';
    const label = document.createElement('div');
    label.className = 'nw-sh-popover__label';
    label.textContent = 'Aktiv';
    const right = document.createElement('div');
    right.className = 'nw-sh-popover__ctrl';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-sh-chip' + (enabled ? ' nw-sh-chip--active' : '');
    btn.textContent = enabled ? 'Ein' : 'Aus';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', () => {
      enabled = !enabled;
      btn.classList.toggle('nw-sh-chip--active', enabled);
      btn.textContent = enabled ? 'Ein' : 'Aus';
      updateHeaderState();
    });
    right.appendChild(btn);
    row.appendChild(label);
    row.appendChild(right);
    body.appendChild(row);
  }

  // Days row
  {
    const row = document.createElement('div');
    row.className = 'nw-sh-popover__row';
    const label = document.createElement('div');
    label.className = 'nw-sh-popover__label';
    label.textContent = 'Tage';
    const right = document.createElement('div');
    right.className = 'nw-sh-popover__ctrl nw-sh-timer-days';

    const dayLabels = [
      { d: 1, t: 'Mo' },
      { d: 2, t: 'Di' },
      { d: 3, t: 'Mi' },
      { d: 4, t: 'Do' },
      { d: 5, t: 'Fr' },
      { d: 6, t: 'Sa' },
      { d: 0, t: 'So' },
    ];

    const set = new Set(days);
    /**
     * Code-Teil: Arrow-Funktion `rebuildDays`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: rebuildDays
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const rebuildDays = () => {
      days = Array.from(set);
      days.sort((a, b) => a - b);
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
        rebuildDays();
      });
      right.appendChild(b);
    }
    rebuildDays();

    row.appendChild(label);
    row.appendChild(right);
    body.appendChild(row);
  }

  // On/Off time
  {
    const grid = document.createElement('div');
    grid.className = 'nw-sh-timer-grid';

    /**
     * Code-Teil: Arrow-Funktion `mkTime`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkTime
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkTime = (lbl, val, onChange) => {
      const wrap = document.createElement('div');
      wrap.className = 'nw-sh-timer-field';
      const l = document.createElement('div');
      l.className = 'nw-sh-timer-field__label';
      l.textContent = lbl;
      const inp = document.createElement('input');
      inp.type = 'time';
      inp.className = 'nw-sh-time';
      inp.value = val || '';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      inp.addEventListener('change', () => onChange(inp.value));
      wrap.appendChild(l);
      wrap.appendChild(inp);
      return wrap;
    };

    grid.appendChild(mkTime(labelOnTime, onTime, (v) => { onTime = String(v || ''); }));
    grid.appendChild(mkTime(labelOffTime, offTime, (v) => { offTime = String(v || ''); }));

    body.appendChild(grid);
  }

  // Dimmer level
  if (hasLevel) {
    const row = document.createElement('div');
    row.className = 'nw-sh-popover__row';
    const label = document.createElement('div');
    label.className = 'nw-sh-popover__label';
    label.textContent = 'Helligkeit (EIN)';
    const right = document.createElement('div');
    right.className = 'nw-sh-popover__ctrl';
    const val = document.createElement('div');
    val.className = 'nw-sh-timer-levelval';
    val.textContent = `${Math.round(onLevel)}%`;
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(minLvl);
    range.max = String(maxLvl);
    range.value = String(onLevel);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an range. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    range.addEventListener('input', () => {
      onLevel = parseFloat(range.value);
      if (!Number.isFinite(onLevel)) onLevel = maxLvl;
      onLevel = Math.max(minLvl, Math.min(maxLvl, onLevel));
      val.textContent = `${Math.round(onLevel)}%`;
    });
    right.appendChild(range);
    right.appendChild(val);
    row.appendChild(label);
    row.appendChild(right);
    body.appendChild(row);
  }

  // Footer buttons
  {
    const footer = document.createElement('div');
    footer.className = 'nw-sh-popover__footer';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'nw-sh-btn nw-sh-btn--primary';
    saveBtn.textContent = 'Speichern';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an saveBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      try {
        const timer = {
          enabled: !!enabled,
          days: Array.isArray(days) && days.length ? days : [0, 1, 2, 3, 4, 5, 6],
          onTime: String(onTime || ''),
          offTime: String(offTime || ''),
          ...(hasLevel ? { onLevel } : {}),
        };
        const cfg = await nwSaveDeviceTimer(dev.id, timer);
        if (cfg) {
          await nwReloadDevices({ force: true });
          nwClosePopover();
        }
      } finally {
        saveBtn.disabled = false;
      }
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'nw-sh-btn';
    delBtn.textContent = 'Löschen';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an delBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    delBtn.addEventListener('click', async () => {
      delBtn.disabled = true;
      try {
        const cfg = await nwDeleteDeviceTimer(dev.id);
        if (cfg) {
          await nwReloadDevices({ force: true });
          nwClosePopover();
        }
      } finally {
        delBtn.disabled = false;
      }
    });

    footer.appendChild(delBtn);
    footer.appendChild(saveBtn);
    body.appendChild(footer);
  }

  nwPopoverEl.appendChild(body);
}
/**
 * Code-Teil: nwPositionPopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwPositionPopover(anchorEl) {
  if (!nwPopoverEl || nwPopoverEl.classList.contains('hidden')) return;

  const vpW = window.innerWidth || 0;
  const vpH = window.innerHeight || 0;
  const pad = 12;

  const w = nwPopoverEl.offsetWidth || 360;
  const h = nwPopoverEl.offsetHeight || 260;

  // default: centered
  let left = (vpW - w) / 2;
  let top = (vpH - h) / 2;

  if (anchorEl && anchorEl.getBoundingClientRect) {
    const r = anchorEl.getBoundingClientRect();

    left = r.left + (r.width / 2) - (w / 2);
    left = Math.max(pad, Math.min(vpW - w - pad, left));

    const below = r.bottom + 10;
    const above = r.top - h - 10;

    if (below + h + pad <= vpH) top = below;
    else if (above >= pad) top = above;
    else top = Math.max(pad, Math.min(vpH - h - pad, top));
  } else {
    left = Math.max(pad, Math.min(vpW - w - pad, left));
    top = Math.max(pad, Math.min(vpH - h - pad, top));
  }

  nwPopoverEl.style.left = Math.round(left) + 'px';
  nwPopoverEl.style.top = Math.round(top) + 'px';
}
/**
 * Code-Teil: nwClampNumber
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwClampNumber(v, min, max) {
  const x = Number(v);
  if (!Number.isFinite(x)) return Number.isFinite(min) ? min : 0;
  return Math.max(min, Math.min(max, x));
}
/**
 * Code-Teil: nwRoundToStep
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRoundToStep(v, step) {
  const x = Number(v);
  const s = Number(step);
  if (!Number.isFinite(x) || !Number.isFinite(s) || s <= 0) return x;
  return Math.round(x / s) * s;
}

// Visual fill for <input type="range"> sliders (Premium UX).
// We write a CSS variable (--nw-range-fill) with the percentage.
// CSS then renders an accent-colored progress track.
/**
 * Code-Teil: nwUpdateRangeFill
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwUpdateRangeFill(rangeEl) {
  if (!rangeEl) return;
  const min = Number(rangeEl.min);
  const max = Number(rangeEl.max);
  const val = Number(rangeEl.value);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(val) || max <= min) return;
  const pct = ((val - min) / (max - min)) * 100;
  const clamped = Math.max(0, Math.min(100, pct));
  rangeEl.style.setProperty('--nw-range-fill', clamped.toFixed(2) + '%');
}

// Live-preview toggle (Dimmer/Jalousie): write while dragging (throttled).
// This is optional and can be enabled/disabled by the user in the popover.
const NW_SH_LIVE_PREVIEW_LS_KEY = 'nw_sh_live_preview';
const NW_SH_LIVE_PREVIEW_DEFAULT = true;
const NW_SH_LIVE_PREVIEW_THROTTLE_MS = 200; // max ~5 writes/s while dragging

// SmartHome Tooltip/Popover: step controls for sliders (Dimmer/Jalousie)
const NW_SH_STEP_DIMMER_LS_KEY = 'nw_sh_step_dimmer';
const NW_SH_STEP_BLIND_LS_KEY = 'nw_sh_step_blind';
const NW_SH_STEP_DEFAULT = 5;

// SmartHome: Favoriten (Schnellzugriff)
const NW_SH_FAVORITES_FIRST_LS_KEY = 'nw_sh_favorites_first';
const NW_SH_FAVORITES_FIRST_DEFAULT = false;

// SmartHome: Favoriten pro Endkunde (LocalStorage Overrides)
// - Key enthält nur Overrides (Abweichungen) gegenüber dem Installer-Default.
// - Kunde kann in der Kachel per Stern ★ umschalten.
const NW_SH_FAVORITES_OVERRIDES_LS_KEY = 'nw_sh_favorites_overrides_v1';
/**
 * Code-Teil: nwLoadJsonLS
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadJsonLS(key, defVal) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defVal;
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj;
    return defVal;
  } catch (_e) {
    return defVal;
  }
}
/**
 * Code-Teil: nwSaveJsonLS
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSaveJsonLS(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj || {}));
  } catch (_e) {}
}
/**
 * Code-Teil: nwLoadFavoriteOverrides
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadFavoriteOverrides() {
  const obj = nwLoadJsonLS(NW_SH_FAVORITES_OVERRIDES_LS_KEY, {});
  // sanitize to {string:boolean}
  const out = {};
  try {
    Object.keys(obj || {}).forEach((k) => {
      const v = obj[k];
      if (typeof v === 'boolean') out[String(k)] = v;
    });
  } catch (_e) {}
  return out;
}
/**
 * Code-Teil: nwSaveFavoriteOverrides
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSaveFavoriteOverrides(map) {
  nwSaveJsonLS(NW_SH_FAVORITES_OVERRIDES_LS_KEY, map || {});
}
/**
 * Code-Teil: nwGetInstallerFavorite
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetInstallerFavorite(dev) {
  return !!(dev && dev.behavior && dev.behavior.favorite);
}
/**
 * Code-Teil: nwIsFavorite
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwIsFavorite(dev) {
  const id = String(dev && dev.id || '');
  if (!id) return false;
  const ov = nwFavoriteOverrides && Object.prototype.hasOwnProperty.call(nwFavoriteOverrides, id)
    ? nwFavoriteOverrides[id]
    : undefined;
  if (typeof ov === 'boolean') return ov;
  return nwGetInstallerFavorite(dev);
}
/**
 * Code-Teil: nwToggleFavorite
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwToggleFavorite(dev) {
  if (!dev || !dev.id) return;
  const id = String(dev.id);
  const base = nwGetInstallerFavorite(dev);
  const next = !nwIsFavorite(dev);

  // Store only the delta to keep the overrides small.
  if (next === base) {
    if (nwFavoriteOverrides && Object.prototype.hasOwnProperty.call(nwFavoriteOverrides, id)) {
      delete nwFavoriteOverrides[id];
    }
  } else {
    nwFavoriteOverrides[id] = next;
  }
  nwSaveFavoriteOverrides(nwFavoriteOverrides);
}
/**
 * Code-Teil: nwLoadNumberLS
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadNumberLS(key, defVal) {
  try {
    const v = localStorage.getItem(key);
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    return Number(defVal);
  } catch (_e) {
    return Number(defVal);
  }
}
/**
 * Code-Teil: nwSaveNumberLS
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSaveNumberLS(key, val) {
  try {
    localStorage.setItem(key, String(val));
  } catch (_e) {}
}
/**
 * Code-Teil: nwCreateStatusBadge
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateStatusBadge() {
  const el = document.createElement('div');
  el.className = 'nw-sh-popover__status hidden';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  return el;
}
/**
 * Code-Teil: nwSetStatusBadge
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetStatusBadge(el, kind, text) {
  if (!el) return;
  el.classList.remove('hidden', 'nw-sh-popover__status--busy', 'nw-sh-popover__status--ok', 'nw-sh-popover__status--err');
  if (!kind) {
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.textContent = text || '';
  if (kind === 'busy') el.classList.add('nw-sh-popover__status--busy');
  if (kind === 'ok') el.classList.add('nw-sh-popover__status--ok');
  if (kind === 'err') el.classList.add('nw-sh-popover__status--err');
}
/**
 * Code-Teil: nwLoadBoolLS
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadBoolLS(key, defVal) {
  try {
    const v = localStorage.getItem(key);
    if (v === null || v === undefined) return !!defVal;
    if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
    if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
    return !!defVal;
  } catch (_e) {
    return !!defVal;
  }
}
/**
 * Code-Teil: nwSaveBoolLS
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSaveBoolLS(key, val) {
  try {
    localStorage.setItem(key, val ? '1' : '0');
  } catch (_e) {}
}
/**
 * Code-Teil: nwLoadViewMode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadViewMode(defMode) {
  try {
    const v = String(localStorage.getItem(NW_SH_VIEW_MODE_LS_KEY) || '').trim().toLowerCase();
    if (v === 'functions' || v === 'funktion' || v === 'funktionen') return 'functions';
    if (v === 'rooms' || v === 'room' || v === 'raeume' || v === 'räume') return 'rooms';
  } catch (_e) {}
  return (defMode === 'functions') ? 'functions' : 'rooms';
}
/**
 * Code-Teil: nwSaveViewMode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSaveViewMode(mode) {
  try {
    localStorage.setItem(NW_SH_VIEW_MODE_LS_KEY, (mode === 'functions') ? 'functions' : 'rooms');
  } catch (_e) {}
}
/**
 * Code-Teil: nwNormTextSize
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormTextSize(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return 'normal';
  if (s === 'compact' || s === 'kompakt' || s === 'small' || s === 'klein') return 'compact';
  if (s === 'large' || s === 'gross' || s === 'groß' || s === 'big') return 'large';
  return 'normal';
}
/**
 * Code-Teil: nwLoadTextSize
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadTextSize(defSize) {
  try {
    const v = localStorage.getItem(NW_SH_TEXT_SIZE_LS_KEY);
    if (v) return nwNormTextSize(v);
  } catch (_e) {}
  return nwNormTextSize(defSize);
}
/**
 * Code-Teil: nwSaveTextSize
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSaveTextSize(size) {
  try {
    localStorage.setItem(NW_SH_TEXT_SIZE_LS_KEY, nwNormTextSize(size));
  } catch (_e) {}
}
/**
 * Code-Teil: nwApplyTextSizeClass
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwApplyTextSizeClass(size) {
  const root = document.getElementById('nw-smarthome-root');
  if (!root) return;
  const normalized = nwNormTextSize(size);
  root.classList.remove('nw-sh-text-compact', 'nw-sh-text-normal', 'nw-sh-text-large');
  if (normalized === 'compact') root.classList.add('nw-sh-text-compact');
  else if (normalized === 'large') root.classList.add('nw-sh-text-large');
  else root.classList.add('nw-sh-text-normal');
}

// Create a throttled sender for live-preview updates.
// - max one send every `intervalMs` (leading+trailing)
// - avoids overlapping requests: keeps only the last pending value
/**
 * Code-Teil: nwCreateLivePreviewSender
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateLivePreviewSender(sendFn, intervalMs) {
  let lastSentAt = 0;
  let lastSentVal = null;
  let pendingVal = null;
  let timer = null;
  let inFlight = false;
  let forceNext = false;
  /**
   * Code-Teil: schedule
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function schedule() {
    if (inFlight) return;
    if (pendingVal === null || pendingVal === undefined) return;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    const now = Date.now();
    const wait = forceNext ? 0 : Math.max(0, intervalMs - (now - lastSentAt));

    timer = setTimeout(async () => {
      timer = null;
      if (inFlight) return;
      if (pendingVal === null || pendingVal === undefined) return;

      const val = pendingVal;
      pendingVal = null;
      const doForce = forceNext;
      forceNext = false;

      // Skip duplicate writes.
      if (val === lastSentVal) {
        schedule();
        return;
      }

      lastSentAt = Date.now();
      lastSentVal = val;
      inFlight = true;
      try {
        await sendFn(val);
      } catch (_e) {}
      inFlight = false;

      // If new pending value arrived during the request, send it next.
      if (pendingVal !== null && pendingVal !== undefined && pendingVal !== lastSentVal) {
        schedule();
      }
    }, wait);
  }
  /**
   * Code-Teil: trigger
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function trigger(val, force) {
    pendingVal = val;
    if (force) forceNext = true;
    schedule();
  }

  return { trigger };
}
/**
 * Kleine, qualitätsbewusste Bereichssteuerung für SmartHome-Popover.
 * Ein fehlender Istwert wird als „—“ dargestellt und niemals als 0 ausgegeben.
 */
function nwCreateSmartHomeRangeControl(options) {
  const opts = options || {};
  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-range-control';

  const min = Number.isFinite(Number(opts.min)) ? Number(opts.min) : 0;
  const max = Number.isFinite(Number(opts.max)) ? Number(opts.max) : 100;
  const step = Number.isFinite(Number(opts.step)) && Number(opts.step) > 0 ? Number(opts.step) : 1;
  const rawValue = Number(opts.value);
  const hasValue = Number.isFinite(rawValue);
  const initial = hasValue
    ? nwClampNumber(rawValue, Math.min(min, max), Math.max(min, max))
    : nwClampNumber(Number.isFinite(Number(opts.fallback)) ? Number(opts.fallback) : min, Math.min(min, max), Math.max(min, max));
  const canWrite = !!opts.canWrite;
  const unit = typeof opts.unit === 'string' ? opts.unit : '';
  const decimals = Number.isFinite(Number(opts.decimals)) ? Math.max(0, Math.min(3, Number(opts.decimals))) : (step < 1 ? 1 : 0);
  const format = typeof opts.formatter === 'function'
    ? opts.formatter
    : (value) => nwFormatNumberDE(value, decimals) + (unit ? (' ' + unit) : '');

  const header = document.createElement('div');
  header.className = 'nw-sh-popover__row';
  const label = document.createElement('div');
  label.className = 'nw-sh-popover__label';
  label.textContent = String(opts.label || 'Wert');
  const right = document.createElement('div');
  right.className = 'nw-sh-popover__right';
  const valueEl = document.createElement('div');
  valueEl.className = 'nw-sh-popover__value';
  valueEl.textContent = hasValue ? format(initial) : '—';
  const status = nwCreateStatusBadge();
  right.appendChild(valueEl);
  right.appendChild(status);
  header.appendChild(label);
  header.appendChild(right);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'nw-sh-slider nw-sh-slider--big';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(initial);
  slider.disabled = !canWrite;
  nwUpdateRangeFill(slider);

  slider.addEventListener('click', (event) => event.stopPropagation());
  slider.addEventListener('input', () => {
    const value = Number(slider.value);
    if (!Number.isFinite(value)) return;
    valueEl.textContent = format(value);
    nwUpdateRangeFill(slider);
    if (typeof opts.onInput === 'function') opts.onInput(value);
  });
  slider.addEventListener('change', async () => {
    if (!canWrite || typeof opts.onCommit !== 'function') return;
    const value = Number(slider.value);
    if (!Number.isFinite(value)) return;
    nwSetStatusBadge(status, 'busy', 'Senden…');
    let result = null;
    try { result = await opts.onCommit(value); } catch (_error) { result = null; }
    if (result === null || result === false) nwSetStatusBadge(status, 'err', 'Fehler');
    else nwSetStatusBadge(status, 'ok', 'OK');
  });

  wrap.appendChild(header);
  wrap.appendChild(slider);
  if (opts.hint) {
    const hint = document.createElement('div');
    hint.className = 'nw-sh-popover__hint';
    hint.textContent = String(opts.hint);
    wrap.appendChild(hint);
  }
  return wrap;
}

/**
 * Code-Teil: nwBuildPopoverContent
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwBuildPopoverContent(dev) {
  if (!nwPopoverEl) return;

  const type = String(dev.type || '').toLowerCase();
  const isOn = nwIsOn(dev);
  const canWrite = nwHasWriteAccess(dev);

  const iconSpec = nwGetIconSpec(dev);
  const iconName = (iconSpec.kind === 'svg')
    ? iconSpec.name
    : (iconSpec.kind === 'dynamic' && iconSpec.base === 'wallbox')
      ? 'charger'
      : (iconSpec.kind === 'dynamic' && iconSpec.base === 'inverter')
        ? 'solar'
        : 'generic';
  const accent = nwGetAccentColor(dev, iconName);

  nwPopoverEl.style.setProperty('--sh-accent', accent);

  const hdr = document.createElement('div');
  hdr.className = 'nw-sh-popover__hdr';

  const left = document.createElement('div');
  left.className = 'nw-sh-popover__hdr-left';

  const icon = nwCreateIconElement(dev, isOn, iconSpec, accent);

  const txt = document.createElement('div');
  txt.style.minWidth = '0';

  const title = document.createElement('div');
  title.className = 'nw-sh-popover__title';
  title.textContent = dev.alias || dev.id;

  const st = document.createElement('div');
  st.className = 'nw-sh-popover__state';
  st.textContent = nwGetStateText(dev);

  txt.appendChild(title);
  txt.appendChild(st);

  left.appendChild(icon);
  left.appendChild(txt);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nw-sh-popover__close';
  close.textContent = '✕';
  close.title = 'Schließen';
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an close. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  close.addEventListener('click', (ev) => {
    ev.stopPropagation();
    nwClosePopover();
  });

  hdr.appendChild(left);
  hdr.appendChild(close);

  const body = document.createElement('div');
  body.className = 'nw-sh-popover__body';

  if (type === 'dimmer') {
    body.appendChild(nwCreateLevelPopover(dev, canWrite, { label: 'Helligkeit' }));
  } else if (type === 'color') {
    body.appendChild(nwCreateColorPopover(dev, canWrite));
  } else if (type === 'blind') {
    body.appendChild(nwCreateBlindPopover(dev, canWrite));
  } else if (type === 'rtr') {
    body.appendChild(nwCreateRtrPopover(dev, canWrite));
  } else if (type === 'player') {
    body.appendChild(nwCreatePlayerPopover(dev, canWrite));
  } else if (type === 'sensor' && dev.io && dev.io.sensor && (dev.io.sensor.writeId || (dev.capabilities && dev.capabilities.writableValue))) {
    body.appendChild(nwCreateValuePopover(dev, canWrite));
  } else {
    const hint = document.createElement('div');
    hint.className = 'nw-sh-popover__hint';
    hint.textContent = 'Keine erweiterten Bedienelemente für diesen Gerätetyp.';
    body.appendChild(hint);
  }

  nwPopoverEl.appendChild(hdr);
  nwPopoverEl.appendChild(body);
}
/**
 * Code-Teil: nwCreateLevelPopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateLevelPopover(dev, canWrite, opts) {
  const wrap = document.createElement('div');

  const label = (opts && opts.label) ? String(opts.label) : 'Wert';

  const lvlCfg = (dev.io && dev.io.level) ? dev.io.level : {};
  const hasWrite = canWrite && (typeof lvlCfg.writeId === 'string') && (String(lvlCfg.writeId).trim() !== '');
  const min = (typeof lvlCfg.min === 'number') ? lvlCfg.min : 0;
  const max = (typeof lvlCfg.max === 'number') ? lvlCfg.max : 100;

  const st = dev.state || {};
  const hasCurrent = typeof st.level === 'number' && Number.isFinite(st.level);
  const current = hasCurrent ? st.level : min;

  // Live-preview toggle (throttled writes while dragging)
  let livePreview = nwLoadBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, NW_SH_LIVE_PREVIEW_DEFAULT);
  const liveSender = (hasWrite)
    ? nwCreateLivePreviewSender(async (val) => { await nwSetLevel(dev.id, val); }, NW_SH_LIVE_PREVIEW_THROTTLE_MS)
    : null;

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';

  const l = document.createElement('div');
  l.className = 'nw-sh-popover__label';
  l.textContent = label;

  const v = document.createElement('div');
  v.className = 'nw-sh-popover__value';
  v.textContent = hasCurrent ? (Math.round(current) + ' %') : '—';

  const right = document.createElement('div');
  right.className = 'nw-sh-popover__right';
  right.appendChild(v);

  // Write feedback (Senden/OK/Fehler) – small and non-intrusive.
  const status = nwCreateStatusBadge();
  right.appendChild(status);

  let statusTimer = null;
  /**
   * Code-Teil: clearStatusTimer
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function clearStatusTimer() {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
  }
  /**
   * Code-Teil: flashStatus
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function flashStatus(kind, text, ms) {
    clearStatusTimer();
    nwSetStatusBadge(status, kind, text);
    if (ms && ms > 0) {
      statusTimer = setTimeout(() => {
        nwSetStatusBadge(status, null, '');
        statusTimer = null;
      }, ms);
    }
  }
  /**
   * Code-Teil: setBusy
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setBusy() { flashStatus('busy', 'Senden…'); }
  /**
   * Code-Teil: setOk
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setOk() { flashStatus('ok', 'OK', 1100); }
  /**
   * Code-Teil: setErr
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setErr() { flashStatus('err', 'Fehler', 1600); }

  let liveBtn = null;
  if (hasWrite) {
    liveBtn = document.createElement('button');
    liveBtn.type = 'button';
    liveBtn.className = 'nw-sh-chip nw-sh-chip--mini' + (livePreview ? ' nw-sh-chip--active' : '');
    liveBtn.textContent = 'Live';
    liveBtn.title = 'Live-Vorschau beim Ziehen (gedrosselt)';
    liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an liveBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    liveBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      livePreview = !livePreview;
      nwSaveBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, livePreview);
      liveBtn.classList.toggle('nw-sh-chip--active', livePreview);
      liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
      updateHint();
    });
    right.appendChild(liveBtn);
  }

  row.appendChild(l);
  row.appendChild(right);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(nwClampNumber(current, min, max));
  slider.className = 'nw-sh-slider nw-sh-slider--big';
  slider.disabled = !hasWrite;

  // Premium: colored progress track.
  nwUpdateRangeFill(slider);

  let dial = null;

  // Helper: commit a new value (writes once + reload) with feedback.
  /**
   * Code-Teil: commitLevel
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function commitLevel(nextVal, opts) {
    const options = opts || {};
    const showStatus = (options.showStatus !== false);
    const reload = (options.reload !== false);

    const clamped = nwClampNumber(nextVal, min, max);
    slider.value = String(clamped);
    v.textContent = Math.round(clamped) + ' %';
    nwUpdateRangeFill(slider);
    if (dial && typeof dial.nwSetValue === 'function') dial.nwSetValue(clamped);

    if (!hasWrite) return clamped;

    if (showStatus) setBusy();
    const res = await nwSetLevel(dev.id, clamped);
    if (showStatus) {
      if (res === null) setErr();
      else setOk();
    }
    if (reload) await nwReloadDevices({ force: true });
    return clamped;
  }

  dial = nwCreateValueGauge({
    value: current,
    hasValue: hasCurrent,
    min,
    max,
    step: 1,
    unit: '%',
    label,
    sub2: 'Halbkreis ziehen oder +/− tippen',
    canWrite: hasWrite,
    formatter: (val) => Math.round(val) + '%',
    minmaxFormatter: (val) => Math.round(val) + '%',
    onInput: (val) => {
      slider.value = String(val);
      v.textContent = Math.round(val) + ' %';
      nwUpdateRangeFill(slider);
      if (hasWrite && livePreview && liveSender) liveSender.trigger(val, false);
    },
    onCommit: async (val) => { await commitLevel(val); },
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  slider.addEventListener('click', (ev) => ev.stopPropagation());

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  slider.addEventListener('input', (ev) => {
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    v.textContent = Math.round(raw) + ' %';
    nwUpdateRangeFill(slider);
    if (dial && typeof dial.nwSetValue === 'function') dial.nwSetValue(raw);

    // Optional: live-preview (throttled) while dragging.
    if (hasWrite && livePreview && liveSender) {
      liveSender.trigger(raw, false);
    }
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  slider.addEventListener('change', async (ev) => {
    if (!hasWrite) return;
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    await commitLevel(raw);
  });

  // Presets (quick set): 0/25/50/75/100
  const presets = document.createElement('div');
  presets.className = 'nw-sh-popover__presets';
  const presetVals = [0, 25, 50, 75, 100];
  presetVals.forEach((pv) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-chip nw-sh-chip--mini';
    b.textContent = pv + '%';
    b.disabled = !hasWrite;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', (ev) => ev.stopPropagation());
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', async () => {
      if (!hasWrite) return;
      await commitLevel(pv);
    });
    presets.appendChild(b);
  });

  // Step controls: step size (1/5/10) + +/-
  let step = nwLoadNumberLS(NW_SH_STEP_DIMMER_LS_KEY, NW_SH_STEP_DEFAULT);
  if (![1, 5, 10].includes(step)) step = NW_SH_STEP_DEFAULT;

  const stepRow = document.createElement('div');
  stepRow.className = 'nw-sh-popover__steprow';

  const stepLabel = document.createElement('div');
  stepLabel.className = 'nw-sh-popover__label';
  stepLabel.textContent = 'Schritt';

  const stepTools = document.createElement('div');
  stepTools.className = 'nw-sh-popover__steptools';

  const stepChoices = [1, 5, 10];
  const stepBtns = new Map();
  /**
   * Code-Teil: syncStepBtns
   * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function syncStepBtns() {
    stepChoices.forEach((s) => {
      const btn = stepBtns.get(s);
      if (!btn) return;
      btn.classList.toggle('nw-sh-chip--active', s === step);
      btn.setAttribute('aria-pressed', s === step ? 'true' : 'false');
    });
  }

  const stepChoiceWrap = document.createElement('div');
  stepChoiceWrap.className = 'nw-sh-popover__stepchoices';
  stepChoices.forEach((s) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'nw-sh-chip nw-sh-chip--mini';
    c.textContent = String(s);
    c.title = 'Schrittweite ' + s;
    c.disabled = !hasWrite;
    c.setAttribute('aria-pressed', 'false');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an c. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    c.addEventListener('click', (ev) => ev.stopPropagation());
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an c. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    c.addEventListener('click', () => {
      if (!hasWrite) return;
      step = s;
      nwSaveNumberLS(NW_SH_STEP_DIMMER_LS_KEY, step);
      syncStepBtns();
    });
    stepBtns.set(s, c);
    stepChoiceWrap.appendChild(c);
  });
  syncStepBtns();

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'nw-sh-btn nw-sh-btn--mini';
  minus.textContent = '−';
  minus.title = 'Wert verringern';
  minus.disabled = !hasWrite;
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an minus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  minus.addEventListener('click', (ev) => ev.stopPropagation());
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an minus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  minus.addEventListener('click', async () => {
    if (!hasWrite) return;
    const cur = Number(slider.value);
    await commitLevel(cur - step);
  });

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'nw-sh-btn nw-sh-btn--mini';
  plus.textContent = '+';
  plus.title = 'Wert erhöhen';
  plus.disabled = !hasWrite;
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an plus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  plus.addEventListener('click', (ev) => ev.stopPropagation());
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an plus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  plus.addEventListener('click', async () => {
    if (!hasWrite) return;
    const cur = Number(slider.value);
    await commitLevel(cur + step);
  });

  stepTools.appendChild(stepChoiceWrap);
  stepTools.appendChild(minus);
  stepTools.appendChild(plus);

  stepRow.appendChild(stepLabel);
  stepRow.appendChild(stepTools);

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';
  /**
   * Code-Teil: updateHint
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateHint() {
    if (!hasWrite) {
      hint.textContent = 'Nur Anzeige (keine Schreib‑DP / writeId konfiguriert).';
      return;
    }
    hint.textContent = livePreview
      ? 'Live-Vorschau: AN (gedrosselt). Beim Loslassen wird der Wert final übernommen.'
      : 'Tipp: Regler ziehen – Wert wird beim Loslassen übernommen.';
  }

  updateHint();

  wrap.appendChild(row);
  wrap.appendChild(dial);
  wrap.appendChild(slider);
  wrap.appendChild(presets);
  wrap.appendChild(stepRow);
  wrap.appendChild(hint);

  const cctCfg = dev.io && dev.io.colorTemperature ? dev.io.colorTemperature : null;
  if (cctCfg && (cctCfg.readId || cctCfg.writeId)) {
    wrap.appendChild(nwCreateSmartHomeRangeControl({
      label: 'Farbtemperatur',
      min: typeof cctCfg.min === 'number' ? cctCfg.min : 2000,
      max: typeof cctCfg.max === 'number' ? cctCfg.max : 6500,
      step: typeof cctCfg.step === 'number' ? cctCfg.step : 100,
      value: st.colorTemperature,
      unit: 'K',
      canWrite: canWrite && !!(cctCfg.writeId || cctCfg.readId),
      onCommit: async (value) => {
        const result = await nwSetColor(dev.id, { temperatureK: value });
        if (result) await nwReloadDevices({ force: true });
        return result;
      },
    }));
  }

  // Optional: Ein/Aus nur mit eindeutigem Schalt-Datenpunkt und gültiger Rückmeldung.
  const swCfg = dev.io && dev.io.switch ? dev.io.switch : null;
  if (swCfg && (swCfg.writeId || swCfg.readId)) {
    const stateKnown = nwHasPrimaryState(dev) && typeof st.on === 'boolean';
    const btnRow = document.createElement('div');
    btnRow.className = 'nw-sh-popover__row';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nw-sh-btn';
    toggle.textContent = stateKnown ? (nwIsOn(dev) ? 'Ausschalten' : 'Einschalten') : 'Schaltzustand unbekannt';
    toggle.disabled = !canWrite || !stateKnown;
    toggle.addEventListener('click', (ev) => ev.stopPropagation());
    toggle.addEventListener('click', async () => {
      if (!canWrite || !stateKnown) return;
      setBusy();
      const res = await nwToggleDevice(dev.id, !nwIsOn(dev));
      if (res === null) setErr();
      else setOk();
      await nwReloadDevices({ force: true });
    });

    btnRow.appendChild(document.createElement('div'));
    btnRow.appendChild(toggle);
    wrap.appendChild(btnRow);
  }

  return wrap;
}
/**
 * Code-Teil: nwCreateColorPopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateColorPopover(dev, canWrite) {
  const wrap = document.createElement('div');

  const cCfg = (dev.io && dev.io.color) ? dev.io.color : {};
  const hasWrite = canWrite && !!(cCfg && (cCfg.writeId || cCfg.readId));

  const st = dev.state || {};

  /**
   * Code-Teil: Arrow-Funktion `normHex`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: normHex
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const normHex = (val) => {
    if (val === null || typeof val === 'undefined') return null;
    let s = String(val).trim();
    if (!s) return null;
    if (s.startsWith('#')) s = s.slice(1);
    if (s.startsWith('0x') || s.startsWith('0X')) s = s.slice(2);
    if (/^[0-9a-fA-F]{6}$/.test(s)) return '#' + s.toLowerCase();
    return null;
  };

  const hasCurrentColor = !!normHex(st.color);
  let current = normHex(st.color) || '#ffffff';

  /* --------------------------- HSV helpers (UI) --------------------------- */
  /**
   * Code-Teil: Arrow-Funktion `clamp01`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: clamp01
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const clamp01 = (n) => Math.max(0, Math.min(1, Number(n)));
  /**
   * Code-Teil: clamp
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n)));
  /**
   * Code-Teil: hexToRgb
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function hexToRgb(hex) {
    const h = normHex(hex);
    if (!h) return { r: 255, g: 255, b: 255 };
    const s = h.slice(1);
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    return { r, g, b };
  }
  /**
   * Code-Teil: rgbToHex
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function rgbToHex(r, g, b) {
    const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0');
    const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0');
    const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0');
    return ('#' + rr + gg + bb).toLowerCase();
  }
  /**
   * Code-Teil: rgbToHsv
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function rgbToHsv(r, g, b) {
    const rr = clamp01(r / 255);
    const gg = clamp01(g / 255);
    const bb = clamp01(b / 255);
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === rr) h = ((gg - bb) / d) % 6;
      else if (max === gg) h = (bb - rr) / d + 2;
      else h = (rr - gg) / d + 4;
      h = h * 60;
      if (h < 0) h += 360;
    }
    const s = (max === 0) ? 0 : (d / max);
    const v = max;
    return { h, s, v };
  }
  /**
   * Code-Teil: hsvToRgb
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function hsvToRgb(h, s, v) {
    const hh = ((Number(h) % 360) + 360) % 360;
    const ss = clamp01(s);
    const vv = clamp01(v);
    const c = vv * ss;
    const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
    const m = vv - c;
    let rr = 0, gg = 0, bb = 0;
    if (hh < 60) { rr = c; gg = x; bb = 0; }
    else if (hh < 120) { rr = x; gg = c; bb = 0; }
    else if (hh < 180) { rr = 0; gg = c; bb = x; }
    else if (hh < 240) { rr = 0; gg = x; bb = c; }
    else if (hh < 300) { rr = x; gg = 0; bb = c; }
    else { rr = c; gg = 0; bb = x; }
    return {
      r: Math.round((rr + m) * 255),
      g: Math.round((gg + m) * 255),
      b: Math.round((bb + m) * 255)
    };
  }

  let hsv = { h: 0, s: 0, v: 1 };
  /**
   * Code-Teil: setHsvFromHex
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setHsvFromHex(hex) {
    const rgb = hexToRgb(hex);
    const next = rgbToHsv(rgb.r, rgb.g, rgb.b);
    // Keep hue when saturation is 0 (gray), so the wheel stays stable.
    if (next.s === 0 && hsv && typeof hsv.h === 'number') next.h = hsv.h;
    hsv = next;
  }

  // Initialize HSV from current color
  setHsvFromHex(current);

  // Live-preview toggle (throttled writes while dragging/selecting)
  let livePreview = nwLoadBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, NW_SH_LIVE_PREVIEW_DEFAULT);
  const liveSender = (hasWrite)
    ? nwCreateLivePreviewSender(async (val) => { await nwSetColor(dev.id, val); }, NW_SH_LIVE_PREVIEW_THROTTLE_MS)
    : null;

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';

  const l = document.createElement('div');
  l.className = 'nw-sh-popover__label';
  l.textContent = 'Farbe';

  const v = document.createElement('div');
  v.className = 'nw-sh-popover__value';
  v.textContent = hasCurrentColor ? current.toUpperCase() : '—';

  const right = document.createElement('div');
  right.className = 'nw-sh-popover__right';

  const preview = document.createElement('div');
  preview.className = 'nw-sh-colorpreview nw-sh-colorpreview--mini';
  preview.style.background = current;
  right.appendChild(preview);

  right.appendChild(v);

  const status = nwCreateStatusBadge();
  right.appendChild(status);

  let statusTimer = null;
  /**
   * Code-Teil: clearStatusTimer
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function clearStatusTimer() {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
  }
  /**
   * Code-Teil: flashStatus
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function flashStatus(kind, text, ms) {
    clearStatusTimer();
    nwSetStatusBadge(status, kind, text);
    if (ms && ms > 0) {
      statusTimer = setTimeout(() => {
        nwSetStatusBadge(status, null, '');
        statusTimer = null;
      }, ms);
    }
  }
  /**
   * Code-Teil: setBusy
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setBusy() { flashStatus('busy', 'Senden…'); }
  /**
   * Code-Teil: setOk
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setOk() { flashStatus('ok', 'OK', 1100); }
  /**
   * Code-Teil: setErr
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setErr() { flashStatus('err', 'Fehler', 1600); }

  let liveBtn = null;
  if (hasWrite) {
    liveBtn = document.createElement('button');
    liveBtn.type = 'button';
    liveBtn.className = 'nw-sh-chip nw-sh-chip--mini' + (livePreview ? ' nw-sh-chip--active' : '');
    liveBtn.textContent = 'Live';
    liveBtn.title = 'Live-Vorschau beim Auswählen (gedrosselt)';
    liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an liveBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    liveBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      livePreview = !livePreview;
      nwSaveBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, livePreview);
      liveBtn.classList.toggle('nw-sh-chip--active', livePreview);
      liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
      updateHint();
    });
    right.appendChild(liveBtn);
  }

  row.appendChild(l);
  row.appendChild(right);

  const picker = document.createElement('div');
  picker.className = 'nw-sh-colorwheelbox';

  const wheelWrap = document.createElement('div');
  wheelWrap.className = 'nw-sh-colorwheel-wrap' + (!hasWrite ? ' nw-disabled' : '');

  const wheelCanvas = document.createElement('canvas');
  wheelCanvas.className = 'nw-sh-colorwheel-canvas';
  wheelWrap.appendChild(wheelCanvas);

  const wheelMarker = document.createElement('div');
  wheelMarker.className = 'nw-sh-colorwheel-marker';
  wheelWrap.appendChild(wheelMarker);

  const valueSlider = document.createElement('input');
  valueSlider.type = 'range';
  valueSlider.min = '0';
  valueSlider.max = '100';
  valueSlider.step = '1';
  valueSlider.value = String(Math.round(clamp01(hsv.v) * 100));
  valueSlider.className = 'nw-sh-slider nw-sh-slider--big nw-sh-slider--colorvalue';
  valueSlider.disabled = !hasWrite;
  /**
   * Code-Teil: hsvToHex
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function hsvToHex(h, s, vVal) {
    const rgb = hsvToRgb(h, s, vVal);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
  /**
   * Code-Teil: updateValueSliderGradient
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateValueSliderGradient() {
    // Gradient: black -> full brightness of current hue/sat
    const full = hsvToHex(hsv.h, hsv.s, 1);
    valueSlider.style.setProperty('--nw-colorvalue', `linear-gradient(90deg, #000000, ${full})`);
  }
  /**
   * Code-Teil: updateWheelMarker
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateWheelMarker() {
    const size = wheelWrap.clientWidth || 240;
    const radius = size / 2;
    const r = radius - 10; // keep marker within circle
    const rad = (hsv.h * Math.PI) / 180;
    const dist = clamp01(hsv.s) * r;
    const x = radius + Math.cos(rad) * dist;
    const y = radius + Math.sin(rad) * dist;
    wheelMarker.style.left = `${x}px`;
    wheelMarker.style.top = `${y}px`;
    wheelMarker.style.background = current;
  }
  /**
   * Code-Teil: setUi
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setUi(hex) {
    const h = normHex(hex) || '#ffffff';
    current = h;
    preview.style.background = h;
    v.textContent = h.toUpperCase();
    setHsvFromHex(h);
    valueSlider.value = String(Math.round(clamp01(hsv.v) * 100));
    updateValueSliderGradient();
    updateWheelMarker();
  }
  /**
   * Code-Teil: drawWheel
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function drawWheel() {
    // IMPORTANT (Mobile/Retina): We must render the wheel in *canvas pixels*,
    // not CSS pixels. Otherwise the wheel only fills the top-left corner on
    // high-DPR devices (e.g. iPhone).
    const sizeCss = wheelWrap.clientWidth || 240;
    const size = Math.max(160, Math.min(300, Math.round(sizeCss)));
    const dpr = (window.devicePixelRatio || 1);
    const px = Math.max(1, Math.round(size * dpr));

    wheelCanvas.width = px;
    wheelCanvas.height = px;
    wheelCanvas.style.width = `${size}px`;
    wheelCanvas.style.height = `${size}px`;

    const ctx = wheelCanvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);

    const cx = px / 2;
    const cy = px / 2;
    const R = (px / 2) - 1;

    const img = ctx.createImageData(px, px);
    const data = img.data;

    for (let y = 0; y < px; y++) {
      for (let x = 0; x < px; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * px + x) * 4;

        if (dist > R) {
          data[idx + 3] = 0;
          continue;
        }

        const sat = dist / R;
        let ang = Math.atan2(dy, dx) * 180 / Math.PI;
        if (ang < 0) ang += 360;
        const rgb = hsvToRgb(ang, sat, 1);
        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }
  /**
   * Code-Teil: commitColor
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function commitColor(hex, opts) {
    const options = opts || {};
    const showStatus = (options.showStatus !== false);
    const reload = (options.reload !== false);
    const h = normHex(hex) || '#ffffff';
    setUi(h);
    if (!hasWrite) return h;
    if (showStatus) setBusy();
    const res = await nwSetColor(dev.id, h);
    if (showStatus) {
      if (res === null) setErr();
      else setOk();
    }
    if (reload) await nwReloadDevices({ force: true });
    return h;
  }

  // Render wheel once the element has a size
  requestAnimationFrame(() => {
    drawWheel();
    updateValueSliderGradient();
    updateWheelMarker();
  });

  // Wheel interaction (hue/sat)
  let wheelDragging = false;
  /**
   * Code-Teil: updateFromWheelEvent
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateFromWheelEvent(ev, opts) {
    const options = opts || {};
    const commit = options.commit === true;
    const rect = wheelWrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = (ev.clientX != null) ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : 0);
    const y = (ev.clientY != null) ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0);
    const dx = x - cx;
    const dy = y - cy;
    const R = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sat = clamp01(dist / R);
    let ang = Math.atan2(dy, dx) * 180 / Math.PI;
    if (ang < 0) ang += 360;
    hsv.h = ang;
    hsv.s = sat;
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    setUi(hex);
    if (hasWrite && livePreview && liveSender && !commit) {
      liveSender.trigger(String(hex), false);
    }
  }

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an wheelWrap. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  wheelWrap.addEventListener('pointerdown', (ev) => {
    if (!hasWrite) return;
    ev.preventDefault();
    ev.stopPropagation();
    wheelDragging = true;
    try { wheelWrap.setPointerCapture(ev.pointerId); } catch (_e) {}
    updateFromWheelEvent(ev, { commit: false });
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointermove' an wheelWrap. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  wheelWrap.addEventListener('pointermove', (ev) => {
    if (!wheelDragging) return;
    if (!hasWrite) return;
    ev.preventDefault();
    updateFromWheelEvent(ev, { commit: false });
  });
  /**
   * Code-Teil: endWheel
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function endWheel(ev) {
    if (!wheelDragging) return;
    wheelDragging = false;
    if (!hasWrite) return;
    ev.preventDefault();
    updateFromWheelEvent(ev, { commit: true });
    await commitColor(current);
  }
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerup' an wheelWrap. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  wheelWrap.addEventListener('pointerup', endWheel);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointercancel' an wheelWrap. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  wheelWrap.addEventListener('pointercancel', () => { wheelDragging = false; });

  // Brightness (V) slider
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an valueSlider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  valueSlider.addEventListener('input', (ev) => {
    const val = ev && ev.target ? Number(ev.target.value) : 0;
    hsv.v = clamp01(val / 100);
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    setUi(hex);
    if (hasWrite && livePreview && liveSender) {
      liveSender.trigger(String(hex), false);
    }
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an valueSlider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  valueSlider.addEventListener('change', async () => {
    if (!hasWrite) return;
    await commitColor(current);
  });

  picker.appendChild(wheelWrap);
  picker.appendChild(valueSlider);

  const presets = document.createElement('div');
  presets.className = 'nw-sh-popover__presets';
  const presetList = [
    { label: 'Warmweiß', value: '#ffd79a' },
    { label: 'Kaltweiß', value: '#dbeafe' },
    { label: 'Rot', value: '#ef4444' },
    { label: 'Grün', value: '#22c55e' },
    { label: 'Blau', value: '#3b82f6' },
  ];
  presetList.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-chip nw-sh-chip--mini';
    b.textContent = p.label;
    b.disabled = !hasWrite;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', (ev) => ev.stopPropagation());
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', async () => {
      if (!hasWrite) return;
      await commitColor(p.value);
    });
    presets.appendChild(b);
  });

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';
  /**
   * Code-Teil: updateHint
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateHint() {
    if (!hasWrite) {
      hint.textContent = 'RGB-Farbe nur Anzeige. Weitere Lichtkanäle können unten separat bedient werden.';
      return;
    }
    hint.textContent = livePreview
      ? 'Live-Vorschau: AN (gedrosselt). Beim Loslassen wird die RGB-Farbe final übernommen.'
      : 'Tipp: RGB-Farbe wählen – wird beim Loslassen übernommen.';
  }
  updateHint();

  wrap.appendChild(row);
  wrap.appendChild(picker);
  wrap.appendChild(presets);
  wrap.appendChild(hint);

  const levelCfg = dev.io && dev.io.level ? dev.io.level : null;
  if (levelCfg && (levelCfg.readId || levelCfg.writeId)) {
    wrap.appendChild(nwCreateSmartHomeRangeControl({
      label: 'Helligkeit',
      min: typeof levelCfg.min === 'number' ? levelCfg.min : 0,
      max: typeof levelCfg.max === 'number' ? levelCfg.max : 100,
      step: typeof levelCfg.step === 'number' ? levelCfg.step : 1,
      value: st.level,
      unit: '%',
      canWrite: canWrite && !!(levelCfg.writeId || levelCfg.readId),
      onCommit: async (value) => {
        const result = await nwSetColor(dev.id, { brightness: value });
        if (result) await nwReloadDevices({ force: true });
        return result;
      },
    }));
  }

  const whiteCfg = dev.io && dev.io.white ? dev.io.white : null;
  if (whiteCfg && (whiteCfg.readId || whiteCfg.writeId)) {
    wrap.appendChild(nwCreateSmartHomeRangeControl({
      label: 'Weißkanal',
      min: typeof whiteCfg.min === 'number' ? whiteCfg.min : 0,
      max: typeof whiteCfg.max === 'number' ? whiteCfg.max : 100,
      step: typeof whiteCfg.step === 'number' ? whiteCfg.step : 1,
      value: st.white,
      unit: '%',
      canWrite: canWrite && !!(whiteCfg.writeId || whiteCfg.readId),
      onCommit: async (value) => {
        const result = await nwSetColor(dev.id, { white: value });
        if (result) await nwReloadDevices({ force: true });
        return result;
      },
    }));
  }

  const tempCfg = dev.io && dev.io.colorTemperature ? dev.io.colorTemperature : null;
  if (tempCfg && (tempCfg.readId || tempCfg.writeId)) {
    wrap.appendChild(nwCreateSmartHomeRangeControl({
      label: 'Farbtemperatur',
      min: typeof tempCfg.min === 'number' ? tempCfg.min : 2000,
      max: typeof tempCfg.max === 'number' ? tempCfg.max : 6500,
      step: typeof tempCfg.step === 'number' ? tempCfg.step : 100,
      value: st.colorTemperature,
      unit: 'K',
      canWrite: canWrite && !!(tempCfg.writeId || tempCfg.readId),
      onCommit: async (value) => {
        const result = await nwSetColor(dev.id, { temperatureK: value });
        if (result) await nwReloadDevices({ force: true });
        return result;
      },
    }));
  }

  // Optional: Ein/Aus nur bei gültiger Rückmeldung; niemals aus „unbekannt“ toggeln.
  const sw = (dev.io && dev.io.switch) ? dev.io.switch : null;
  const hasSwitch = canWrite && !!(sw && (sw.writeId || sw.readId));
  if (hasSwitch) {
    const stateKnown = nwHasPrimaryState(dev) && typeof st.on === 'boolean';
    const btnRow = document.createElement('div');
    btnRow.className = 'nw-sh-popover__row';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nw-sh-btn';
    toggle.textContent = stateKnown ? (nwIsOn(dev) ? 'Ausschalten' : 'Einschalten') : 'Schaltzustand unbekannt';
    toggle.disabled = !canWrite || !stateKnown;
    toggle.addEventListener('click', (ev) => ev.stopPropagation());
    toggle.addEventListener('click', async () => {
      if (!canWrite || !stateKnown) return;
      setBusy();
      const res = await nwToggleDevice(dev.id, !nwIsOn(dev));
      if (res === null) setErr();
      else setOk();
      await nwReloadDevices({ force: true });
    });

    btnRow.appendChild(document.createElement('div'));
    btnRow.appendChild(toggle);
    wrap.appendChild(btnRow);
  }

  return wrap;
}
/**
 * Code-Teil: nwCreateBlindPopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateBlindPopover(dev, canWrite) {
  const wrap = document.createElement('div');

  const lvlCfg = (dev.io && dev.io.level) ? dev.io.level : {};
  const coverCfg = (dev.io && dev.io.cover) ? dev.io.cover : {};
  const hasWrite = canWrite && !!(
    ((typeof lvlCfg.writeId === 'string') && (String(lvlCfg.writeId).trim() !== '')) ||
    ((typeof lvlCfg.readId === 'string') && (String(lvlCfg.readId).trim() !== ''))
  );
  const min = 0;
  const max = 100;

  const st = dev.state || {};
  const fieldQuality = dev.fieldQuality || {};
  const hasCurrent = (typeof st.position === 'number' && Number.isFinite(st.position)) || (typeof st.level === 'number' && Number.isFinite(st.level));
  const current = nwClampNumber((typeof st.position === 'number') ? st.position : (typeof st.level === 'number' ? st.level : 0), min, max);
  const activeProtection = [];
  if (st.locked === true) activeProtection.push('Sperre aktiv');
  if (st.windAlarm === true) activeProtection.push('Windalarm');
  if (st.rainAlarm === true) activeProtection.push('Regenalarm');
  if (st.frostAlarm === true) activeProtection.push('Frostalarm');
  const safetyFields = [
    ['locked', coverCfg.lockId, 'Sperrstatus'],
    ['windAlarm', coverCfg.windAlarmId, 'Windschutz'],
    ['rainAlarm', coverCfg.rainAlarmId, 'Regenschutz'],
    ['frostAlarm', coverCfg.frostAlarmId, 'Frostschutz'],
  ];
  const unavailableProtection = safetyFields
    .filter((entry) => entry[1] && (!fieldQuality[entry[0]] || fieldQuality[entry[0]].valid !== true))
    .map((entry) => entry[2]);
  const movementBlocked = activeProtection.length > 0 || unavailableProtection.length > 0;
  const blockReason = activeProtection.length
    ? activeProtection.join(' · ')
    : (unavailableProtection.length ? ('Schutzstatus nicht verfügbar: ' + unavailableProtection.join(', ')) : '');
  const canMove = hasWrite && !movementBlocked;

  // Live-preview toggle (throttled writes while dragging)
  let livePreview = nwLoadBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, NW_SH_LIVE_PREVIEW_DEFAULT);
  const liveSender = (canMove)
    ? nwCreateLivePreviewSender(async (val) => { await nwSetLevel(dev.id, val); }, NW_SH_LIVE_PREVIEW_THROTTLE_MS)
    : null;

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';

  const l = document.createElement('div');
  l.className = 'nw-sh-popover__label';
  l.textContent = 'Position';

  const v = document.createElement('div');
  v.className = 'nw-sh-popover__value';
  v.textContent = hasCurrent ? (Math.round(current) + ' %') : '—';

  const right = document.createElement('div');
  right.className = 'nw-sh-popover__right';
  right.appendChild(v);

  // Write feedback (Senden/OK/Fehler)
  const status = nwCreateStatusBadge();
  right.appendChild(status);
  let statusTimer = null;
  /**
   * Code-Teil: clearStatusTimer
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function clearStatusTimer() {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
  }
  /**
   * Code-Teil: flashStatus
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function flashStatus(kind, text, ms) {
    clearStatusTimer();
    nwSetStatusBadge(status, kind, text);
    if (ms && ms > 0) {
      statusTimer = setTimeout(() => {
        nwSetStatusBadge(status, null, '');
        statusTimer = null;
      }, ms);
    }
  }
  /**
   * Code-Teil: setBusy
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setBusy() { flashStatus('busy', 'Senden…'); }
  /**
   * Code-Teil: setOk
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setOk() { flashStatus('ok', 'OK', 1100); }
  /**
   * Code-Teil: setErr
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setErr() { flashStatus('err', 'Fehler', 1600); }

  if (canMove) {
    const liveBtn = document.createElement('button');
    liveBtn.type = 'button';
    liveBtn.className = 'nw-sh-chip nw-sh-chip--mini' + (livePreview ? ' nw-sh-chip--active' : '');
    liveBtn.textContent = 'Live';
    liveBtn.title = 'Live-Vorschau beim Ziehen (gedrosselt)';
    liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an liveBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    liveBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      livePreview = !livePreview;
      nwSaveBoolLS(NW_SH_LIVE_PREVIEW_LS_KEY, livePreview);
      liveBtn.classList.toggle('nw-sh-chip--active', livePreview);
      liveBtn.setAttribute('aria-pressed', livePreview ? 'true' : 'false');
      updateHint();
    });
    right.appendChild(liveBtn);
  }

  row.appendChild(l);
  row.appendChild(right);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(nwClampNumber(current, min, max));
  slider.className = 'nw-sh-slider nw-sh-slider--big';
  slider.disabled = !canMove;

  // Premium: colored progress track.
  nwUpdateRangeFill(slider);

  let dial = null;

  // Helper: commit a new value (writes once + reload) with feedback.
  /**
   * Code-Teil: commitPos
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function commitPos(nextVal, opts) {
    const options = opts || {};
    const showStatus = (options.showStatus !== false);
    const reload = (options.reload !== false);

    const clamped = nwClampNumber(nextVal, min, max);
    slider.value = String(clamped);
    v.textContent = Math.round(clamped) + ' %';
    nwUpdateRangeFill(slider);
    if (dial && typeof dial.nwSetValue === 'function') dial.nwSetValue(clamped);

    if (!canMove) { if (movementBlocked) setErr(); return null; }

    if (showStatus) setBusy();
    const res = await nwSetLevel(dev.id, clamped);
    if (showStatus) {
      if (res === null) setErr();
      else setOk();
    }
    if (reload) await nwReloadDevices({ force: true });
    return clamped;
  }

  dial = nwCreateValueGauge({
    value: current,
    hasValue: hasCurrent,
    min,
    max,
    step: 1,
    unit: '%',
    label: 'Position',
    sub2: '0 % auf · 100 % ab',
    canWrite: canMove,
    formatter: (val) => Math.round(val) + '%',
    minmaxFormatter: (val) => Math.round(val) + '%',
    stops: [['0%', '#27b8ff'], ['55%', '#00e676'], ['100%', '#ffd31a']],
    onInput: (val) => {
      slider.value = String(val);
      v.textContent = Math.round(val) + ' %';
      nwUpdateRangeFill(slider);
      if (canMove && livePreview && liveSender) liveSender.trigger(val, false);
    },
    onCommit: async (val) => { await commitPos(val); },
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  slider.addEventListener('click', (ev) => ev.stopPropagation());

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  slider.addEventListener('input', (ev) => {
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    v.textContent = Math.round(raw) + ' %';
    nwUpdateRangeFill(slider);
    if (dial && typeof dial.nwSetValue === 'function') dial.nwSetValue(raw);

    // Optional: live-preview (throttled) while dragging.
    if (canMove && livePreview && liveSender) {
      liveSender.trigger(raw, false);
    }
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an slider. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  slider.addEventListener('change', async (ev) => {
    if (!canMove) return;
    const raw = Number(ev.target.value);
    if (!Number.isFinite(raw)) return;
    await commitPos(raw);
  });

  // Presets (quick set): 0/50/100
  const presets = document.createElement('div');
  presets.className = 'nw-sh-popover__presets';
  const presetVals = [0, 50, 100];
  presetVals.forEach((pv) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-chip nw-sh-chip--mini';
    b.textContent = pv + '%';
    b.disabled = !canMove;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', (ev) => ev.stopPropagation());
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', async () => {
      if (!canMove) return;
      await commitPos(pv);
    });
    presets.appendChild(b);
  });

  // Step controls: step size (1/5/10) + +/-
  let step = nwLoadNumberLS(NW_SH_STEP_BLIND_LS_KEY, NW_SH_STEP_DEFAULT);
  if (![1, 5, 10].includes(step)) step = NW_SH_STEP_DEFAULT;

  const stepRow = document.createElement('div');
  stepRow.className = 'nw-sh-popover__steprow';

  const stepLabel = document.createElement('div');
  stepLabel.className = 'nw-sh-popover__label';
  stepLabel.textContent = 'Schritt';

  const stepTools = document.createElement('div');
  stepTools.className = 'nw-sh-popover__steptools';

  const stepChoices = [1, 5, 10];
  const stepBtns = new Map();
  /**
   * Code-Teil: syncStepBtns
   * Zweck: Synchronisiert zwei Datenquellen bzw. UI und State.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function syncStepBtns() {
    stepChoices.forEach((s) => {
      const btn = stepBtns.get(s);
      if (!btn) return;
      btn.classList.toggle('nw-sh-chip--active', s === step);
      btn.setAttribute('aria-pressed', s === step ? 'true' : 'false');
    });
  }

  const stepChoiceWrap = document.createElement('div');
  stepChoiceWrap.className = 'nw-sh-popover__stepchoices';
  stepChoices.forEach((s) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'nw-sh-chip nw-sh-chip--mini';
    c.textContent = String(s);
    c.title = 'Schrittweite ' + s;
    c.disabled = !canMove;
    c.setAttribute('aria-pressed', 'false');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an c. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    c.addEventListener('click', (ev) => ev.stopPropagation());
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an c. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    c.addEventListener('click', () => {
      if (!canMove) return;
      step = s;
      nwSaveNumberLS(NW_SH_STEP_BLIND_LS_KEY, step);
      syncStepBtns();
    });
    stepBtns.set(s, c);
    stepChoiceWrap.appendChild(c);
  });
  syncStepBtns();

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'nw-sh-btn nw-sh-btn--mini';
  minus.textContent = '−';
  minus.title = 'Position verringern';
  minus.disabled = !canMove;
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an minus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  minus.addEventListener('click', (ev) => ev.stopPropagation());
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an minus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  minus.addEventListener('click', async () => {
    if (!canMove) return;
    const cur = Number(slider.value);
    await commitPos(cur - step);
  });

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'nw-sh-btn nw-sh-btn--mini';
  plus.textContent = '+';
  plus.title = 'Position erhöhen';
  plus.disabled = !canMove;
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an plus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  plus.addEventListener('click', (ev) => ev.stopPropagation());
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an plus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  plus.addEventListener('click', async () => {
    if (!canMove) return;
    const cur = Number(slider.value);
    await commitPos(cur + step);
  });

  stepTools.appendChild(stepChoiceWrap);
  stepTools.appendChild(minus);
  stepTools.appendChild(plus);

  stepRow.appendChild(stepLabel);
  stepRow.appendChild(stepTools);

  const hint = document.createElement('div');
  hint.className = 'nw-sh-popover__hint';
  /**
   * Code-Teil: updateHint
   * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function updateHint() {
    if (movementBlocked) {
      hint.textContent = 'Bewegung gesperrt: ' + blockReason + '. Stop bleibt verfügbar.';
      return;
    }
    if (!canWrite) {
      hint.textContent = 'Nur Anzeige (keine Schreib‑DP konfiguriert).';
      return;
    }
    if (!hasWrite) {
      hint.textContent = 'Tipp: Tasten nutzen (kein Positions‑Schreibwert konfiguriert).';
      return;
    }
    hint.textContent = livePreview
      ? 'Live-Vorschau: AN (gedrosselt). Beim Loslassen wird der Wert final übernommen. Auf=0, Ab=1.'
      : 'Tipp: Regler 0–100 % ziehen oder Tasten nutzen. Auf=0, Ab=1.';
  }

  updateHint();

  if (movementBlocked) {
    const protection = document.createElement('div');
    protection.className = 'nw-sh-protection nw-sh-protection--blocked';
    protection.textContent = '🛡 ' + blockReason;
    wrap.appendChild(protection);
  } else if (safetyFields.some((entry) => !!entry[1])) {
    const protection = document.createElement('div');
    protection.className = 'nw-sh-protection nw-sh-protection--ok';
    protection.textContent = '🛡 Schutzkontakte frei';
    wrap.appendChild(protection);
  }

  if (coverCfg.tiltReadId || coverCfg.tiltWriteId) {
    wrap.appendChild(nwCreateSmartHomeRangeControl({
      label: 'Lamellenwinkel',
      min: 0,
      max: 100,
      step: 1,
      value: st.tilt,
      unit: '%',
      canWrite: canWrite && !movementBlocked && !!(coverCfg.tiltWriteId || coverCfg.tiltReadId),
      hint: movementBlocked ? ('Gesperrt: ' + blockReason) : '',
      onCommit: async (value) => {
        const result = await nwCoverAction(dev.id, 'tilt', value);
        if (result) await nwReloadDevices({ force: true });
        return result;
      },
    }));
  }

  const controls = document.createElement('div');
  controls.className = 'nw-sh-controls';

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
  const mk = (label, action) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-btn';
    b.textContent = label;
    const actionAllowed = canWrite && (action === 'stop' || !movementBlocked);
    b.disabled = !actionAllowed;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', (ev) => ev.stopPropagation());
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    b.addEventListener('click', async () => {
      if (!actionAllowed) return;
      setBusy();
      const ok = await nwCoverAction(dev.id, action);
      if (!ok) setErr();
      else setOk();
      await nwReloadDevices({ force: true });
    });
    return b;
  };

  controls.appendChild(mk('▲', 'up'));
  controls.appendChild(mk('■', 'stop'));
  controls.appendChild(mk('▼', 'down'));

  wrap.appendChild(row);
  wrap.appendChild(dial);
  wrap.appendChild(slider);
  wrap.appendChild(presets);
  wrap.appendChild(stepRow);
  wrap.appendChild(controls);
  wrap.appendChild(hint);

  return wrap;
}
/**
 * Code-Teil: nwGetRtrRange
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetRtrRange(dev) {
  const c = (dev.io && dev.io.climate) ? dev.io.climate : {};
  const min = (typeof c.minSetpoint === 'number') ? c.minSetpoint : 15;
  const max = (typeof c.maxSetpoint === 'number') ? c.maxSetpoint : 30;
  return { min, max };
}
/**
 * Code-Teil: nwCreateRtrPopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateRtrPopover(dev, canWrite) {
  const wrap = document.createElement('div');
  const st = dev.state || {};
  const climate = (dev.io && dev.io.climate) ? dev.io.climate : {};
  const range = nwGetRtrRange(dev);
  const step = (typeof climate.step === 'number' && climate.step > 0) ? climate.step : 0.5;

  const errorActive = st.climateError === true
    || (typeof st.climateError === 'string' && !['', '0', 'false', 'off', 'ok', 'none'].includes(st.climateError.trim().toLowerCase()));
  const windowOpen = st.windowOpen === true;
  const controlBlocked = errorActive || windowOpen;
  const blockReason = errorActive ? 'Gerät meldet einen Fehler' : (windowOpen ? 'Fensterkontakt ist geöffnet' : '');

  const overview = document.createElement('div');
  overview.className = 'nw-sh-climate-overview';
  const overviewRows = [
    ['Isttemperatur', typeof st.currentTemp === 'number' ? (nwFormatNumberDE(st.currentTemp, 1) + ' °C') : '—'],
    ['Luftfeuchte', typeof st.humidity === 'number' ? (Math.round(st.humidity) + ' %') : '—'],
    ['Modus', st.mode !== undefined && st.mode !== null && String(st.mode).trim() ? String(st.mode) : '—'],
    ['Anforderung', st.demand !== undefined && st.demand !== null ? String(st.demand) : '—'],
  ];
  overviewRows.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'nw-sh-climate-overview__row';
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('strong');
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    overview.appendChild(row);
  });
  wrap.appendChild(overview);

  if (controlBlocked) {
    const protection = document.createElement('div');
    protection.className = 'nw-sh-protection nw-sh-protection--blocked';
    protection.textContent = '🛡 Bedienung eingeschränkt: ' + blockReason;
    wrap.appendChild(protection);
  }

  if (climate.setpointId) {
    wrap.appendChild(nwCreateSmartHomeRangeControl({
      label: 'Solltemperatur',
      min: range.min,
      max: range.max,
      step,
      value: st.setpoint,
      fallback: typeof st.currentTemp === 'number' ? st.currentTemp : ((range.min + range.max) / 2),
      unit: '°C',
      decimals: step < 1 ? 1 : 0,
      canWrite: canWrite && !controlBlocked,
      hint: controlBlocked ? blockReason : '',
      onCommit: async (value) => {
        const result = await nwSetRtrSetpoint(dev.id, value);
        if (result) await nwReloadDevices({ force: true });
        return result;
      },
    }));
  }

  const status = nwCreateStatusBadge();
  const setStatus = (kind, text) => nwSetStatusBadge(status, kind, text);
  const controls = document.createElement('div');
  controls.className = 'nw-sh-climate-controls';

  const sendAction = async (action, value) => {
    setStatus('busy', 'Senden…');
    const result = await nwClimateAction(dev.id, action, value);
    if (!result) {
      setStatus('err', 'Fehler');
      return false;
    }
    setStatus('ok', 'OK');
    await nwReloadDevices({ force: true });
    return true;
  };

  if (climate.powerId) {
    const row = document.createElement('div');
    row.className = 'nw-sh-command-row';
    const label = document.createElement('div');
    label.className = 'nw-sh-popover__label';
    label.textContent = 'Ein/Aus';
    const buttons = document.createElement('div');
    buttons.className = 'nw-sh-command-row__actions';
    const off = document.createElement('button');
    off.type = 'button';
    off.className = 'nw-sh-btn';
    off.textContent = 'Aus';
    off.disabled = !canWrite;
    off.addEventListener('click', async (event) => { event.stopPropagation(); if (canWrite) await sendAction('power', false); });
    const on = document.createElement('button');
    on.type = 'button';
    on.className = 'nw-sh-btn';
    on.textContent = 'Ein';
    on.disabled = !canWrite || controlBlocked;
    on.addEventListener('click', async (event) => { event.stopPropagation(); if (canWrite && !controlBlocked) await sendAction('power', true); });
    buttons.appendChild(off);
    buttons.appendChild(on);
    row.appendChild(label);
    row.appendChild(buttons);
    controls.appendChild(row);
  }

  const appendRawCommand = (labelText, action, dpId, currentValue, disabledBySafety) => {
    if (!dpId) return;
    const row = document.createElement('div');
    row.className = 'nw-sh-command-row';
    const label = document.createElement('label');
    label.className = 'nw-sh-popover__label';
    label.textContent = labelText;
    const input = document.createElement('input');
    input.className = 'nw-input nw-sh-command-row__input';
    input.type = 'text';
    input.value = currentValue === undefined || currentValue === null ? '' : String(currentValue);
    input.placeholder = 'Wert wie im Datenpunkt erwartet';
    input.disabled = !canWrite || disabledBySafety;
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'nw-sh-btn';
    send.textContent = 'Übernehmen';
    send.disabled = input.disabled;
    send.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (send.disabled || !String(input.value).trim()) return;
      await sendAction(action, input.value);
    });
    const actions = document.createElement('div');
    actions.className = 'nw-sh-command-row__actions';
    actions.appendChild(input);
    actions.appendChild(send);
    row.appendChild(label);
    row.appendChild(actions);
    controls.appendChild(row);
  };

  appendRawCommand('Betriebsmodus', 'mode', climate.modeId, st.mode, controlBlocked);
  appendRawCommand('Lüfterstufe', 'fan', climate.fanSpeedId, st.fanSpeed, controlBlocked);

  if (climate.swingId) {
    const row = document.createElement('div');
    row.className = 'nw-sh-command-row';
    const label = document.createElement('div');
    label.className = 'nw-sh-popover__label';
    label.textContent = 'Swing';
    const actions = document.createElement('div');
    actions.className = 'nw-sh-command-row__actions';
    if (typeof st.swing === 'boolean') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nw-sh-btn';
      button.textContent = st.swing ? 'Ausschalten' : 'Einschalten';
      button.disabled = !canWrite || controlBlocked;
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!button.disabled) await sendAction('swing', !st.swing);
      });
      actions.appendChild(button);
    } else {
      const input = document.createElement('input');
      input.className = 'nw-input nw-sh-command-row__input';
      input.type = 'text';
      input.value = st.swing === undefined || st.swing === null ? '' : String(st.swing);
      input.placeholder = 'Swing-Wert';
      input.disabled = !canWrite || controlBlocked;
      const send = document.createElement('button');
      send.type = 'button';
      send.className = 'nw-sh-btn';
      send.textContent = 'Übernehmen';
      send.disabled = input.disabled;
      send.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!send.disabled && String(input.value).trim()) await sendAction('swing', input.value);
      });
      actions.appendChild(input);
      actions.appendChild(send);
    }
    row.appendChild(label);
    row.appendChild(actions);
    controls.appendChild(row);
  }

  if (controls.childNodes.length) {
    controls.appendChild(status);
    wrap.appendChild(controls);
  }

  if (!climate.setpointId && !climate.powerId && !climate.modeId && !climate.fanSpeedId && !climate.swingId) {
    const hint = document.createElement('div');
    hint.className = 'nw-sh-popover__hint';
    hint.textContent = 'Nur Anzeige – keine beschreibbare Klimafunktion zugeordnet.';
    wrap.appendChild(hint);
  }

  return wrap;
}
/**
 * Code-Teil: nwCreateValueGauge
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateValueGauge(opts) {
  const min = Number(opts && opts.min);
  const max = Number(opts && opts.max);
  const step = Number(opts && opts.step) || 1;
  const unit = (opts && typeof opts.unit === 'string') ? opts.unit : '';
  const label = (opts && typeof opts.label === 'string') ? opts.label : '';
  const sub2 = (opts && typeof opts.sub2 === 'string') ? opts.sub2 : '';
  const canWrite = !!(opts && opts.canWrite);
  const onInput = (opts && typeof opts.onInput === 'function') ? opts.onInput : null;
  const onCommit = (opts && typeof opts.onCommit === 'function') ? opts.onCommit : null;
  const formatter = (opts && typeof opts.formatter === 'function') ? opts.formatter : ((v) => Math.round(v) + (unit ? ' ' + unit : ''));
  const minmaxFormatter = (opts && typeof opts.minmaxFormatter === 'function') ? opts.minmaxFormatter : ((v) => Math.round(v) + (unit ? ' ' + unit : ''));
  let valueKnown = !(opts && opts.hasValue === false);

  let value = Number(opts && opts.value);
  if (!Number.isFinite(value)) {
    value = Number.isFinite(min) ? min : 0;
    valueKnown = false;
  }
  value = nwRoundToStep(nwClampNumber(value, min, max), step);

  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-gauge nw-sh-gauge--level' + (valueKnown ? '' : ' nw-sh-gauge--unknown');

  const canvas = document.createElement('div');
  canvas.className = 'nw-sh-gauge__canvas';
  wrap.appendChild(canvas);

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('nw-sh-gauge__svg');
  svg.setAttribute('viewBox', '0 0 200 140');
  svg.setAttribute('role', 'img');

  const cx = 100;
  const cy = 110;
  const r = 80;
  const gradId = 'nwShValueGaugeGrad' + Math.random().toString(36).slice(2, 9);

  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', gradId);
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', String(cx - r));
  grad.setAttribute('y1', String(cy));
  grad.setAttribute('x2', String(cx + r));
  grad.setAttribute('y2', String(cy));
  const stops = (opts && Array.isArray(opts.stops) && opts.stops.length) ? opts.stops : [
    ['0%', '#27b8ff'], ['50%', '#00e676'], ['100%', '#ffd31a']
  ];
  stops.forEach((pair) => {
    const s = document.createElementNS(NS, 'stop');
    s.setAttribute('offset', String(pair[0]));
    s.setAttribute('stop-color', String(pair[1]));
    grad.appendChild(s);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  const base = document.createElementNS(NS, 'path');
  base.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
  base.setAttribute('fill', 'none');
  base.classList.add('nw-sh-gauge__track');

  const active = document.createElementNS(NS, 'path');
  active.setAttribute('fill', 'none');
  active.classList.add('nw-sh-gauge__active');
  active.style.stroke = `url(#${gradId})`;

  const ticks = document.createElementNS(NS, 'g');
  ticks.classList.add('nw-sh-gauge__ticks');
  const tickCount = 10;
  for (let i = 0; i <= tickCount; i++) {
    const f = i / tickCount;
    const ang = Math.PI - f * Math.PI;
    const outer = r + 4;
    const inner = r - (i % 5 === 0 ? 12 : 7);
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', (cx + outer * Math.cos(ang)).toFixed(2));
    line.setAttribute('y1', (cy - outer * Math.sin(ang)).toFixed(2));
    line.setAttribute('x2', (cx + inner * Math.cos(ang)).toFixed(2));
    line.setAttribute('y2', (cy - inner * Math.sin(ang)).toFixed(2));
    line.classList.add('nw-sh-gauge__tick');
    if (i % 5 === 0) line.classList.add('nw-sh-gauge__tick--major');
    ticks.appendChild(line);
  }

  const knob = document.createElementNS(NS, 'circle');
  knob.classList.add('nw-sh-gauge__knob');
  knob.setAttribute('r', '7');

  const hit = document.createElementNS(NS, 'path');
  hit.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
  hit.setAttribute('fill', 'none');
  hit.classList.add('nw-sh-gauge__hit');

  svg.appendChild(base);
  svg.appendChild(active);
  svg.appendChild(ticks);
  svg.appendChild(knob);
  svg.appendChild(hit);
  canvas.appendChild(svg);

  const overlay = document.createElement('div');
  overlay.className = 'nw-sh-gauge__overlay';

  const btnMinus = document.createElement('button');
  btnMinus.type = 'button';
  btnMinus.className = 'nw-sh-gauge__btn';
  btnMinus.textContent = '−';

  const btnPlus = document.createElement('button');
  btnPlus.type = 'button';
  btnPlus.className = 'nw-sh-gauge__btn';
  btnPlus.textContent = '+';

  const center = document.createElement('div');
  center.className = 'nw-sh-gauge__center';

  const valEl = document.createElement('div');
  valEl.className = 'nw-sh-gauge__value';

  const labEl = document.createElement('div');
  labEl.className = 'nw-sh-gauge__label';
  labEl.textContent = label;

  const sub2El = document.createElement('div');
  sub2El.className = 'nw-sh-gauge__sub';
  sub2El.textContent = sub2;

  center.appendChild(valEl);
  if (label) center.appendChild(labEl);
  if (sub2) center.appendChild(sub2El);

  const btnRow = document.createElement('div');
  btnRow.className = 'nw-sh-gauge__btnrow';
  btnRow.appendChild(btnMinus);
  btnRow.appendChild(btnPlus);
  overlay.appendChild(center);
  overlay.appendChild(btnRow);
  canvas.appendChild(overlay);

  const minmax = document.createElement('div');
  minmax.className = 'nw-sh-gauge__minmax';
  const minEl = document.createElement('span');
  const maxEl = document.createElement('span');
  minEl.textContent = minmaxFormatter(min);
  maxEl.textContent = minmaxFormatter(max);
  minmax.appendChild(minEl);
  minmax.appendChild(maxEl);
  wrap.appendChild(minmax);
  /**
   * Code-Teil: setValue
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function setValue(v, silent, markKnown) {
    value = nwRoundToStep(nwClampNumber(v, min, max), step);
    if (markKnown !== false) valueKnown = true;
    wrap.classList.toggle('nw-sh-gauge--unknown', !valueKnown);
    valEl.textContent = valueKnown ? formatter(value) : '—';
    const f = (max > min) ? ((value - min) / (max - min)) : 0;
    const ang = Math.PI - f * Math.PI;
    const x = cx + r * Math.cos(ang);
    const y = cy - r * Math.sin(ang);
    if (f <= 0.001) active.setAttribute('d', '');
    else active.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`);
    knob.setAttribute('cx', x.toFixed(2));
    knob.setAttribute('cy', y.toFixed(2));
    if (!silent && onInput) onInput(value);
  }
  /**
   * Code-Teil: commit
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function commit() {
    if (!canWrite || !onCommit) return;
    await onCommit(value);
  }

  setValue(value, true, valueKnown);

  /**
   * Code-Teil: Arrow-Funktion `stop`
   * Zweck: verwaltet Lifecycle/Ressourcen wie Server, Timer oder SSE-Verbindungen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: stop
   * Zweck: Stoppt Prozess, Timer, Engine oder Verbindung.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const stop = (ev) => ev.stopPropagation();
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnMinus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnMinus.addEventListener('click', stop);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPlus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnPlus.addEventListener('click', stop);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnMinus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnMinus.addEventListener('click', async () => {
    if (!canWrite) return;
    setValue(value - step);
    await commit();
  });
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPlus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnPlus.addEventListener('click', async () => {
    if (!canWrite) return;
    setValue(value + step);
    await commit();
  });

  if (!canWrite) {
    btnMinus.disabled = true;
    btnPlus.disabled = true;
    btnMinus.style.opacity = '0.5';
    btnPlus.style.opacity = '0.5';
    btnMinus.style.cursor = 'default';
    btnPlus.style.cursor = 'default';
  }

  /**
   * Code-Teil: Arrow-Funktion `pickFromClient`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: pickFromClient
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const pickFromClient = (clientX, clientY) => {
    const rect = svg.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const px = (clientX - rect.left) / rect.width * 200;
    const py = (clientY - rect.top) / rect.height * 140;
    const dx = px - cx;
    const dy = cy - py;
    let ang = Math.atan2(dy, dx);
    if (ang < 0) ang = 0;
    if (ang > Math.PI) ang = Math.PI;
    const f = (Math.PI - ang) / Math.PI;
    setValue(min + f * (max - min));
  };

  /**
   * Code-Teil: Arrow-Funktion `onMouseDown`
   * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: onMouseDown
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const onMouseDown = (ev) => {
    if (!canWrite) return;
    ev.preventDefault();
    ev.stopPropagation();
    nwPopoverDragging = true;
    pickFromClient(ev.clientX, ev.clientY);
    /**
     * Code-Teil: move
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const move = (e) => pickFromClient(e.clientX, e.clientY);
    /**
     * Code-Teil: Arrow-Funktion `up`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: up
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const up = async () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      nwPopoverDragging = false;
      await commit();
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousemove' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('mousemove', move);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseup' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('mouseup', up);
  };

  /**
   * Code-Teil: Arrow-Funktion `onTouchStart`
   * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: onTouchStart
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const onTouchStart = (ev) => {
    if (!canWrite) return;
    if (!ev.touches || !ev.touches.length) return;
    ev.preventDefault();
    ev.stopPropagation();
    nwPopoverDragging = true;
    pickFromClient(ev.touches[0].clientX, ev.touches[0].clientY);
    /**
     * Code-Teil: Arrow-Funktion `move`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: move
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const move = (e) => {
      if (!e.touches || !e.touches.length) return;
      pickFromClient(e.touches[0].clientX, e.touches[0].clientY);
    };
    /**
     * Code-Teil: end
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const end = async () => {
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      nwPopoverDragging = false;
      await commit();
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchmove' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('touchmove', move, { passive: false });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchend' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('touchend', end);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchcancel' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('touchcancel', end);
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an hit. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  hit.addEventListener('mousedown', onMouseDown);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchstart' an hit. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  hit.addEventListener('touchstart', onTouchStart, { passive: false });

  wrap.nwSetValue = (next, known = true) => setValue(next, true, known);
  return wrap;
}
/**
 * Code-Teil: nwCreateThermostatGauge
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateThermostatGauge(opts) {
  const min = Number(opts && opts.min);
  const max = Number(opts && opts.max);
  const step = Number(opts && opts.step) || 0.5;
  const canWrite = !!(opts && opts.canWrite);
  const subtitle = (opts && typeof opts.subtitle === 'string') ? opts.subtitle : '';
  const sub2 = (opts && typeof opts.sub2 === 'string') ? opts.sub2 : '';
  const onCommit = (opts && typeof opts.onCommit === 'function') ? opts.onCommit : null;

  let value = Number(opts && opts.value);
  if (!Number.isFinite(value)) value = min;
  value = nwClampNumber(value, min, max);
  value = nwRoundToStep(value, step);

  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-gauge';

  const canvas = document.createElement('div');
  canvas.className = 'nw-sh-gauge__canvas';
  wrap.appendChild(canvas);

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('nw-sh-gauge__svg');
  svg.setAttribute('viewBox', '0 0 200 140');
  svg.setAttribute('role', 'img');

  const cx = 100;
  const cy = 110;
  const r = 80;

  const gradId = 'nwShGaugeGrad' + Math.random().toString(36).slice(2, 9);

  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', gradId);
  // IMPORTANT: Use absolute coordinates in the SVG viewBox.
  // Without this, the gradient uses objectBoundingBox units and collapses
  // visually (dial looks like a single flat color).
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', String(cx - r));
  grad.setAttribute('y1', String(cy));
  grad.setAttribute('x2', String(cx + r));
  grad.setAttribute('y2', String(cy));

  /**
   * Code-Teil: Arrow-Funktion `mkStop`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkStop
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkStop = (off, col) => {
    const s = document.createElementNS(NS, 'stop');
    s.setAttribute('offset', off);
    s.setAttribute('stop-color', col);
    return s;
  };
  // More "Apple-like" gradient: cyan -> green -> yellow -> orange/red.
  grad.appendChild(mkStop('0%', '#1dddf2'));
  grad.appendChild(mkStop('40%', '#00e676'));
  grad.appendChild(mkStop('70%', '#ffd54f'));
  grad.appendChild(mkStop('100%', '#ff7043'));
  defs.appendChild(grad);
  svg.appendChild(defs);

  const base = document.createElementNS(NS, 'path');
  // Upper arc (matches tick marks). sweep=1 draws the arc "over" the value.
  base.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
  base.setAttribute('fill', 'none');
  base.classList.add('nw-sh-gauge__track');

  const active = document.createElementNS(NS, 'path');
  active.setAttribute('fill', 'none');
  active.classList.add('nw-sh-gauge__active');
  active.style.stroke = `url(#${gradId})`;

  // Tick marks around the arc (1°C steps, clamped)
  const ticks = document.createElementNS(NS, 'g');
  ticks.classList.add('nw-sh-gauge__ticks');
  const tickCount = Math.max(6, Math.min(24, Math.round((max - min) / 1)));
  for (let i = 0; i <= tickCount; i++) {
    const f = i / tickCount;
    const ang = Math.PI - f * Math.PI;
    const outer = r + 4;
    const inner = r - (i % 2 === 0 ? 10 : 6);

    const x1 = cx + outer * Math.cos(ang);
    const y1 = cy - outer * Math.sin(ang);
    const x2 = cx + inner * Math.cos(ang);
    const y2 = cy - inner * Math.sin(ang);

    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.classList.add('nw-sh-gauge__tick');
    if (i % 2 === 0) line.classList.add('nw-sh-gauge__tick--major');
    ticks.appendChild(line);
  }

  const knob = document.createElementNS(NS, 'circle');
  knob.classList.add('nw-sh-gauge__knob');
  knob.setAttribute('r', '7');

  // Invisible hit area for dragging/clicking on the arc
  const hit = document.createElementNS(NS, 'path');
  hit.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`);
  hit.setAttribute('fill', 'none');
  hit.classList.add('nw-sh-gauge__hit');

  svg.appendChild(base);
  svg.appendChild(active);
  svg.appendChild(ticks);
  svg.appendChild(knob);
  svg.appendChild(hit);

  canvas.appendChild(svg);

  // Overlay: value + +/- buttons (Apple‑ähnlich)
  const overlay = document.createElement('div');
  overlay.className = 'nw-sh-gauge__overlay';

  const btnMinus = document.createElement('button');
  btnMinus.type = 'button';
  btnMinus.className = 'nw-sh-gauge__btn';
  btnMinus.textContent = '−';

  const btnPlus = document.createElement('button');
  btnPlus.type = 'button';
  btnPlus.className = 'nw-sh-gauge__btn';
  btnPlus.textContent = '+';

  const center = document.createElement('div');
  center.className = 'nw-sh-gauge__center';

  const valEl = document.createElement('div');
  valEl.className = 'nw-sh-gauge__value';

  const labEl = document.createElement('div');
  labEl.className = 'nw-sh-gauge__label';
  labEl.textContent = subtitle || '';

  const sub2El = document.createElement('div');
  sub2El.className = 'nw-sh-gauge__sub';
  sub2El.textContent = sub2 || '';

  center.appendChild(valEl);
  if (subtitle) center.appendChild(labEl);
  if (sub2) center.appendChild(sub2El);

  // Buttons are placed BELOW the value for a cleaner, more readable layout
  // (especially on touch devices).
  const btnRow = document.createElement('div');
  btnRow.className = 'nw-sh-gauge__btnrow';
  btnRow.appendChild(btnMinus);
  btnRow.appendChild(btnPlus);

  overlay.appendChild(center);
  overlay.appendChild(btnRow);

  canvas.appendChild(overlay);

  const minmax = document.createElement('div');
  minmax.className = 'nw-sh-gauge__minmax';
  const minEl = document.createElement('span');
  const maxEl = document.createElement('span');
  minEl.textContent = nwFormatNumberDE(min, 0);
  maxEl.textContent = nwFormatNumberDE(max, 0);
  minmax.appendChild(minEl);
  minmax.appendChild(maxEl);
  wrap.appendChild(minmax);

  /**
   * Code-Teil: Arrow-Funktion `setValue`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: setValue
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setValue = (v) => {
    value = nwClampNumber(v, min, max);
    value = nwRoundToStep(value, step);

    valEl.textContent = nwFormatNumberDE(value, 1) + '°C';

    const f = (max > min) ? ((value - min) / (max - min)) : 0;
    const ang = Math.PI - f * Math.PI;
    const x = cx + r * Math.cos(ang);
    const y = cy - r * Math.sin(ang);

    if (f <= 0.001) {
      active.setAttribute('d', '');
    } else {
      active.setAttribute('d', `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`);
    }

    knob.setAttribute('cx', x.toFixed(2));
    knob.setAttribute('cy', y.toFixed(2));
  };

  /**
   * Code-Teil: Arrow-Funktion `commit`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: commit
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const commit = async () => {
    if (!canWrite || !onCommit) return;
    await onCommit(value);
  };

  setValue(value);

  /**
   * Code-Teil: Arrow-Funktion `stop`
   * Zweck: verwaltet Lifecycle/Ressourcen wie Server, Timer oder SSE-Verbindungen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: stop
   * Zweck: Stoppt Prozess, Timer, Engine oder Verbindung.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const stop = (ev) => ev.stopPropagation();

  // Buttons
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnMinus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnMinus.addEventListener('click', stop);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPlus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnPlus.addEventListener('click', stop);

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnMinus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnMinus.addEventListener('click', async () => {
    if (!canWrite) return;
    setValue(value - step);
    await commit();
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btnPlus. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  btnPlus.addEventListener('click', async () => {
    if (!canWrite) return;
    setValue(value + step);
    await commit();
  });

  if (!canWrite) {
    btnMinus.disabled = true;
    btnPlus.disabled = true;
    btnMinus.style.opacity = '0.5';
    btnPlus.style.opacity = '0.5';
    btnMinus.style.cursor = 'default';
    btnPlus.style.cursor = 'default';
  }

  /**
   * Code-Teil: Arrow-Funktion `pickFromClient`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: pickFromClient
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const pickFromClient = (clientX, clientY) => {
    const rect = svg.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const px = (clientX - rect.left) / rect.width * 200;
    const py = (clientY - rect.top) / rect.height * 140;

    const dx = px - cx;
    const dy = cy - py; // invert y
    let ang = Math.atan2(dy, dx); // 0 right, pi left (upper half)
    if (ang < 0) ang = 0;
    if (ang > Math.PI) ang = Math.PI;

    const f = (Math.PI - ang) / Math.PI;
    const v = min + f * (max - min);
    setValue(v);
  };

  /**
   * Code-Teil: Arrow-Funktion `onMouseDown`
   * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: onMouseDown
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const onMouseDown = (ev) => {
    if (!canWrite) return;
    ev.preventDefault();
    ev.stopPropagation();
    nwPopoverDragging = true;

    pickFromClient(ev.clientX, ev.clientY);

    /**
     * Code-Teil: Arrow-Funktion `move`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: move
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const move = (e) => pickFromClient(e.clientX, e.clientY);
    /**
     * Code-Teil: up
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const up = async () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      nwPopoverDragging = false;
      await commit();
    };

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousemove' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('mousemove', move);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseup' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('mouseup', up);
  };

  /**
   * Code-Teil: Arrow-Funktion `onTouchStart`
   * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: onTouchStart
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const onTouchStart = (ev) => {
    if (!canWrite) return;
    if (!ev.touches || !ev.touches.length) return;

    ev.preventDefault();
    ev.stopPropagation();
    nwPopoverDragging = true;

    pickFromClient(ev.touches[0].clientX, ev.touches[0].clientY);

    /**
     * Code-Teil: Arrow-Funktion `move`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: move
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const move = (e) => {
      if (!e.touches || !e.touches.length) return;
      pickFromClient(e.touches[0].clientX, e.touches[0].clientY);
    };
    /**
     * Code-Teil: end
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const end = async () => {
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      nwPopoverDragging = false;
      await commit();
    };

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchmove' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('touchmove', move, { passive: false });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchend' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('touchend', end);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchcancel' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('touchcancel', end);
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an hit. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  hit.addEventListener('mousedown', onMouseDown);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchstart' an hit. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  hit.addEventListener('touchstart', onTouchStart, { passive: false });

  return wrap;
}
/**
 * Schreibbarer generischer Wertgeber (Zahl, Integer, Boolean oder Text).
 * Fehlende Rückmeldungen bleiben sichtbar unbekannt; ein Wert wird nur nach
 * ausdrücklicher Benutzeraktion geschrieben.
 */
function nwCreateValuePopover(dev, canWrite) {
  const wrap = document.createElement('div');
  const sensor = dev && dev.io && dev.io.sensor ? dev.io.sensor : {};
  const valueType = String(sensor.valueType || 'number').toLowerCase();
  const hasWrite = canWrite && !!(sensor.writeId || sensor.readId);
  const state = dev && dev.state ? dev.state : {};

  const row = document.createElement('div');
  row.className = 'nw-sh-popover__row';
  const label = document.createElement('div');
  label.className = 'nw-sh-popover__label';
  label.textContent = 'Wert';
  const status = nwCreateStatusBadge();
  row.appendChild(label);
  row.appendChild(status);
  wrap.appendChild(row);

  let input;
  if (valueType === 'boolean') {
    input = document.createElement('select');
    input.className = 'nw-config-select';
    [['true', 'Ein / true'], ['false', 'Aus / false']].forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      input.appendChild(option);
    });
    if (typeof state.value === 'boolean') input.value = state.value ? 'true' : 'false';
  } else {
    input = document.createElement('input');
    input.className = 'nw-config-input';
    input.type = valueType === 'string' ? 'text' : 'number';
    if (valueType !== 'string') {
      if (Number.isFinite(Number(sensor.min))) input.min = String(sensor.min);
      if (Number.isFinite(Number(sensor.max))) input.max = String(sensor.max);
      input.step = String(Number.isFinite(Number(sensor.step)) && Number(sensor.step) > 0 ? sensor.step : (valueType === 'integer' ? 1 : 0.1));
    }
    if (typeof state.value !== 'undefined' && state.value !== null) input.value = String(state.value);
    else input.placeholder = 'Neuen Wert eingeben';
  }
  input.disabled = !hasWrite;
  wrap.appendChild(input);

  const actions = document.createElement('div');
  actions.className = 'nw-sh-popover__actions';
  const send = document.createElement('button');
  send.type = 'button';
  send.className = 'nw-sh-btn nw-sh-btn--primary';
  send.textContent = 'Übernehmen';
  send.disabled = !hasWrite;
  send.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (!hasWrite) return;
    let value;
    if (valueType === 'boolean') value = input.value === 'true';
    else if (valueType === 'string') value = String(input.value || '');
    else {
      value = Number(String(input.value || '').replace(',', '.'));
      if (!Number.isFinite(value)) {
        nwSetStatusBadge(status, 'err', 'Ungültiger Wert');
        return;
      }
      if (valueType === 'integer') value = Math.round(value);
    }
    nwSetStatusBadge(status, 'busy', 'Senden…');
    const result = await nwSetSmartHomeValue(dev.id, value);
    if (!result) {
      nwSetStatusBadge(status, 'err', 'Fehler');
      return;
    }
    nwSetStatusBadge(status, 'ok', 'OK');
    await nwReloadDevices({ force: true });
  });
  actions.appendChild(send);
  wrap.appendChild(actions);

  if (!hasWrite) {
    const hint = document.createElement('div');
    hint.className = 'nw-sh-popover__hint';
    hint.textContent = 'Kein beschreibbarer Datenpunkt zugeordnet.';
    wrap.appendChild(hint);
  }
  return wrap;
}

/**
 * Code-Teil: nwCreatePlayerPopover
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreatePlayerPopover(dev, canWrite) {
  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-player';

  const st = dev.state || {};
  const io = (dev.io && dev.io.player) ? dev.io.player : {};

  // Ensure current zone is always part of the multiroom selection
  nwSetSelectedAudioZones(nwGetSelectedAudioZones(dev.id), dev.id);

  // Now playing / quality-aware metadata
  const qualityStatus = nwGetQualityStatus(dev);
  const qualityLabel = nwGetQualityLabel(dev);
  const playingKnown = typeof st.playing === 'boolean';
  const powerKnown = typeof st.power === 'boolean';

  const now = document.createElement('div');
  now.className = 'nw-sh-player__now';

  const coverUrl = String(st.coverUrl || st.cover || '').trim();
  if (coverUrl) {
    const img = document.createElement('img');
    img.className = 'nw-sh-player__cover';
    img.alt = '';
    img.src = coverUrl;
    img.loading = 'lazy';
    now.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'nw-sh-player__meta';

  const line1 = document.createElement('div');
  line1.className = 'nw-sh-player__title';
  const title = String(st.title || '').trim();
  if (title) line1.textContent = title;
  else if (playingKnown) line1.textContent = st.playing ? 'Wiedergabe läuft' : 'Wiedergabe pausiert';
  else if (powerKnown) line1.textContent = st.power ? 'Player eingeschaltet' : 'Player ausgeschaltet';
  else line1.textContent = 'Playerstatus unbekannt';

  const line2 = document.createElement('div');
  line2.className = 'nw-sh-player__sub nw-sh-player__subtitle';
  const artist = String(st.artist || '').trim();
  const source = String(st.source || '').trim();
  const subParts = [];
  if (artist) subParts.push(artist);
  if (source) subParts.push(source);
  if (qualityLabel && qualityStatus !== 'online') subParts.push(qualityLabel);
  line2.textContent = subParts.join(' · ');

  meta.appendChild(line1);
  if (line2.textContent) meta.appendChild(line2);
  now.appendChild(meta);
  wrap.appendChild(now);

  // Multiroom / Zonen (UI-seitig)
  const zones = nwGetAllPlayerZones();
  if (zones.length > 1) {
    const zWrap = document.createElement('div');
    zWrap.className = 'nw-sh-player__zones';

    const head = document.createElement('div');
    head.className = 'nw-sh-player__zoneshead nw-sh-player__zones-head';
    const zTitle = document.createElement('div');
    zTitle.className = 'nw-sh-player__zonestitle nw-sh-player__zones-title';
    zTitle.textContent = 'Multiroom';

    const zActions = document.createElement('div');
    zActions.className = 'nw-sh-player__zonesactions nw-sh-player__zones-actions';

    const partyBtn = document.createElement('button');
    partyBtn.type = 'button';
    partyBtn.className = 'nw-sh-chip nw-sh-chip--mini';
    partyBtn.textContent = 'Party';
    partyBtn.title = 'Alle Zonen gemeinsam steuern';

    const soloBtn = document.createElement('button');
    soloBtn.type = 'button';
    soloBtn.className = 'nw-sh-chip nw-sh-chip--mini';
    soloBtn.textContent = 'Nur diese';
    soloBtn.title = 'Nur diese Zone steuern';

    zActions.appendChild(partyBtn);
    zActions.appendChild(soloBtn);

    head.appendChild(zTitle);
    head.appendChild(zActions);
    zWrap.appendChild(head);

    const chips = document.createElement('div');
    chips.className = 'nw-sh-player__chips';
    zWrap.appendChild(chips);

    const hint = document.createElement('div');
    hint.className = 'nw-sh-player__zoneshint nw-sh-player__zones-hint';
    zWrap.appendChild(hint);

    const renderZones = () => {
      const sel = nwGetSelectedAudioZones(dev.id);
      const selSet = new Set(sel);
      nwClear(chips);

      zones.forEach((z) => {
        const name = String(z.alias || z.name || z.room || z.id || '').trim() || 'Zone';
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nw-sh-chip nw-sh-chip--mini' + (selSet.has(z.id) ? ' nw-sh-chip--active' : '');
        b.textContent = name;
        b.title = 'Zone hinzufügen/entfernen';
        b.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const cur = nwGetSelectedAudioZones(dev.id);
          const idx = cur.indexOf(z.id);
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(z.id);
          nwSetSelectedAudioZones(cur, dev.id);
          renderZones();
        });
        chips.appendChild(b);
      });

      const allIds = zones.map((z) => z.id);
      const isParty = sel.length > 0 && allIds.every((id) => selSet.has(id));
      partyBtn.classList.toggle('nw-sh-chip--active', isParty);
      soloBtn.classList.toggle('nw-sh-chip--active', sel.length === 1 && sel[0] === dev.id);
      hint.textContent = sel.length > 1 ? `Steuert ${sel.length} Zonen gleichzeitig.` : 'Nur diese Zone.';
    };

    partyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      nwSetSelectedAudioZones(zones.map((z) => z.id), dev.id);
      renderZones();
    });
    soloBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      nwSetSelectedAudioZones([dev.id], dev.id);
      renderZones();
    });

    renderZones();
    wrap.appendChild(zWrap);
  }

  const status = nwCreateStatusBadge();
  const setStatus = (kind, text) => nwSetStatusBadge(status, kind, text);
  const runPlayerAction = async (action, value, refreshDelay = 120) => {
    setStatus('busy', 'Senden…');
    const result = await nwPlayerActionMulti(dev.id, action, value);
    if (!result) {
      setStatus('err', 'Befehl nicht übernommen');
      return false;
    }
    setStatus('ok', 'OK');
    nwRefreshDevicesSoon(refreshDelay);
    return true;
  };

  // Transport controls are only exposed when a corresponding datapoint exists.
  // A blind Play/Pause toggle is never issued while the playback state is unknown.
  const controls = document.createElement('div');
  controls.className = 'nw-sh-player__controls';

  const mkBtn = (label, text, action, enabled, extraClass) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nw-sh-btn nw-sh-btn--mini nw-sh-player__btn' + (extraClass ? (' ' + extraClass) : '');
    b.textContent = text;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.disabled = !canWrite || !enabled;
    b.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (b.disabled) return;
      await action();
    });
    return b;
  };

  if (io.prevId) controls.appendChild(mkBtn('Zurück', '⏮', async () => runPlayerAction('prev'), true));

  if (playingKnown) {
    if (st.playing && (io.pauseId || io.toggleId)) {
      controls.appendChild(mkBtn('Pause', '⏸', async () => runPlayerAction(io.pauseId ? 'pause' : 'toggle'), true, 'nw-sh-player__btn--primary'));
    } else if (!st.playing && (io.playId || io.toggleId)) {
      controls.appendChild(mkBtn('Play', '▶', async () => runPlayerAction(io.playId ? 'play' : 'toggle'), true, 'nw-sh-player__btn--primary'));
    }
  } else {
    if (io.playId) controls.appendChild(mkBtn('Play', '▶', async () => runPlayerAction('play'), true, 'nw-sh-player__btn--primary'));
    if (io.pauseId) controls.appendChild(mkBtn('Pause', '⏸', async () => runPlayerAction('pause'), true));
    if (!io.playId && !io.pauseId && io.toggleId) {
      controls.appendChild(mkBtn('Status unbekannt – Toggle gesperrt', '▶/⏸', async () => false, false, 'nw-sh-player__btn--primary'));
    }
  }

  if (io.nextId) controls.appendChild(mkBtn('Weiter', '⏭', async () => runPlayerAction('next'), true));
  if (io.stopId) controls.appendChild(mkBtn('Stopp', '⏹', async () => runPlayerAction('stop'), true));
  if (controls.childNodes.length) wrap.appendChild(controls);

  const explicitToggles = document.createElement('div');
  explicitToggles.className = 'nw-sh-player__toggles';

  const appendBooleanCommand = (labelText, action, stateValue, readId, writeId, onText, offText) => {
    if (!readId && !writeId) return;
    const row = document.createElement('div');
    row.className = 'nw-sh-command-row';
    const label = document.createElement('div');
    label.className = 'nw-sh-popover__label';
    label.textContent = labelText + (typeof stateValue === 'boolean' ? `: ${stateValue ? onText : offText}` : ': —');
    const actions = document.createElement('div');
    actions.className = 'nw-sh-command-row__actions';
    const off = document.createElement('button');
    off.type = 'button';
    off.className = 'nw-sh-btn';
    off.textContent = offText;
    off.disabled = !canWrite;
    off.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!off.disabled) await runPlayerAction(action, false);
    });
    const on = document.createElement('button');
    on.type = 'button';
    on.className = 'nw-sh-btn';
    on.textContent = onText;
    on.disabled = !canWrite;
    on.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!on.disabled) await runPlayerAction(action, true);
    });
    actions.appendChild(off);
    actions.appendChild(on);
    row.appendChild(label);
    row.appendChild(actions);
    explicitToggles.appendChild(row);
  };

  appendBooleanCommand('Power', 'power', st.power, io.powerReadId, io.powerWriteId, 'Ein', 'Aus');
  appendBooleanCommand('Stummschaltung', 'mute', st.muted, io.muteReadId, io.muteWriteId, 'Stumm', 'Ton');
  if (explicitToggles.childNodes.length) wrap.appendChild(explicitToggles);

  // Volume: an unknown feedback value is shown as "—", never as a real 0 %.
  if (io.volumeReadId || io.volumeWriteId) {
    const volMin = Number.isFinite(Number(io.volumeMin)) ? Number(io.volumeMin) : 0;
    const volMax = Number.isFinite(Number(io.volumeMax)) ? Number(io.volumeMax) : 100;
    const volKnown = typeof st.volume === 'number' && Number.isFinite(st.volume);
    const volFallback = volMin + ((volMax - volMin) / 2);
    const vol = nwClampNumber(volKnown ? st.volume : volFallback, volMin, volMax);

    const volWrap = document.createElement('div');
    volWrap.className = 'nw-sh-player__vol';
    const volHeader = document.createElement('div');
    volHeader.className = 'nw-sh-player__volhdr nw-sh-player__volhead';
    const volLabel = document.createElement('div');
    volLabel.className = 'nw-sh-player__vollabel nw-sh-player__vlabel';
    volLabel.textContent = 'Lautstärke';
    const volVal = document.createElement('div');
    volVal.className = 'nw-sh-player__volval nw-sh-player__vval';
    volVal.textContent = volKnown
      ? String(Math.round(((vol - volMin) / Math.max(1, (volMax - volMin))) * 100)) + ' %'
      : '—';
    volHeader.appendChild(volLabel);
    volHeader.appendChild(volVal);
    volWrap.appendChild(volHeader);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(volMin);
    slider.max = String(volMax);
    slider.step = '1';
    slider.value = String(vol);
    slider.className = 'nw-sh-slider nw-sh-slider--big';
    slider.disabled = !canWrite || !io.volumeWriteId;
    slider.addEventListener('input', () => {
      const value = Number(slider.value);
      const pct = Math.round(((value - volMin) / Math.max(1, (volMax - volMin))) * 100);
      volVal.textContent = String(pct) + ' %';
    });
    slider.addEventListener('change', async () => {
      if (slider.disabled) return;
      await runPlayerAction('volume', Number(slider.value), 160);
    });
    volWrap.appendChild(slider);
    wrap.appendChild(volWrap);
  }

  if (io.seekReadId || io.seekWriteId) {
    const seekMin = Number.isFinite(Number(io.seekMin)) ? Number(io.seekMin) : 0;
    const seekMax = Number.isFinite(Number(io.seekMax)) ? Number(io.seekMax) : 100;
    const seekStep = Number.isFinite(Number(io.seekStep)) && Number(io.seekStep) > 0 ? Number(io.seekStep) : 1;
    wrap.appendChild(nwCreateSmartHomeRangeControl({
      label: 'Wiedergabeposition',
      min: seekMin,
      max: seekMax,
      step: seekStep,
      value: st.seek,
      fallback: seekMin,
      unit: '',
      decimals: seekStep < 1 ? 1 : 0,
      canWrite: canWrite && !!io.seekWriteId,
      onCommit: async (value) => runPlayerAction('seek', value, 160),
    }));
  }

  const appendRawOrBooleanCommand = (labelText, action, stateValue, dpId) => {
    if (!dpId) return;
    const row = document.createElement('div');
    row.className = 'nw-sh-command-row';
    const label = document.createElement('div');
    label.className = 'nw-sh-popover__label';
    label.textContent = labelText;
    const actions = document.createElement('div');
    actions.className = 'nw-sh-command-row__actions';
    if (typeof stateValue === 'boolean') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nw-sh-btn';
      button.textContent = stateValue ? 'Ausschalten' : 'Einschalten';
      button.disabled = !canWrite;
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!button.disabled) await runPlayerAction(action, !stateValue);
      });
      actions.appendChild(button);
    } else {
      const input = document.createElement('input');
      input.className = 'nw-input nw-sh-command-row__input';
      input.type = 'text';
      input.value = stateValue === undefined || stateValue === null ? '' : String(stateValue);
      input.placeholder = 'Wert wie im Datenpunkt erwartet';
      input.disabled = !canWrite;
      const send = document.createElement('button');
      send.type = 'button';
      send.className = 'nw-sh-btn';
      send.textContent = 'Übernehmen';
      send.disabled = !canWrite;
      send.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!send.disabled && String(input.value).trim()) await runPlayerAction(action, input.value);
      });
      actions.appendChild(input);
      actions.appendChild(send);
    }
    row.appendChild(label);
    row.appendChild(actions);
    wrap.appendChild(row);
  };

  appendRawOrBooleanCommand('Shuffle', 'shuffle', st.shuffle, io.shuffleId);
  appendRawOrBooleanCommand('Repeat', 'repeat', st.repeat, io.repeatId);

  if (io.ttsWriteId) {
    const tts = document.createElement('div');
    tts.className = 'nw-sh-player__tts';
    const label = document.createElement('label');
    label.className = 'nw-sh-popover__label';
    label.textContent = 'Text-to-Speech';
    const input = document.createElement('textarea');
    input.className = 'nw-input nw-sh-player__tts-input';
    input.rows = 3;
    input.maxLength = 1000;
    input.placeholder = 'Text eingeben…';
    input.disabled = !canWrite;
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'nw-sh-btn';
    send.textContent = 'Sprechen';
    send.disabled = !canWrite;
    send.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = String(input.value || '').trim();
      if (!text || send.disabled) return;
      if (await runPlayerAction('tts', text, 200)) input.value = '';
    });
    tts.appendChild(label);
    tts.appendChild(input);
    tts.appendChild(send);
    wrap.appendChild(tts);
  }

  const hasWritablePlayerFunction = !!(
    io.toggleId || io.playId || io.pauseId || io.stopId || io.nextId || io.prevId
    || io.volumeWriteId || io.stationId || io.playlistId || io.muteWriteId || io.powerWriteId
    || io.seekWriteId || io.shuffleId || io.repeatId || io.ttsWriteId
  );
  if (!hasWritablePlayerFunction) {
    const hint = document.createElement('div');
    hint.className = 'nw-sh-popover__hint';
    hint.textContent = 'Nur Anzeige – keine beschreibbare Playerfunktion zugeordnet.';
    wrap.appendChild(hint);
  }
  wrap.appendChild(status);

  // Library: Radiosender / Playlists (mit Favoriten + Zuletzt)
  const stations = Array.isArray(dev.stations) ? dev.stations : [];
  const playlists = Array.isArray(dev.playlists) ? dev.playlists : [];
  const hasStations = stations.length && io.stationId;
  const hasPlaylists = playlists.length && io.playlistId;

  if (hasStations || hasPlaylists) {
    let tab = hasStations ? 'station' : 'playlist';
    let favOnly = false;
    let query = '';

    const lib = document.createElement('div');
    lib.className = 'nw-sh-player__library';

    const head = document.createElement('div');
    head.className = 'nw-sh-player__libhead';

    const tabs = document.createElement('div');
    tabs.className = 'nw-sh-player__libtabs';

    /**
     * Code-Teil: Arrow-Funktion `mkTab`
     * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: mkTab
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const mkTab = (kind, label) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nw-sh-chip nw-sh-chip--mini';
      b.textContent = label;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tab = kind;
        favOnly = false;
        query = '';
        search.value = '';
        render();
      });
      return b;
    };

    const tabStations = hasStations ? mkTab('station', 'Sender') : null;
    const tabPlaylists = hasPlaylists ? mkTab('playlist', 'Playlists') : null;
    if (tabStations) tabs.appendChild(tabStations);
    if (tabPlaylists) tabs.appendChild(tabPlaylists);

    const filters = document.createElement('div');
    filters.className = 'nw-sh-player__libfilters';

    const favBtn = document.createElement('button');
    favBtn.type = 'button';
    favBtn.className = 'nw-sh-chip nw-sh-chip--mini';
    favBtn.textContent = '★ Favoriten';
    favBtn.title = 'Nur Favoriten anzeigen / Reihenfolge anpassen';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an favBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    favBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      favOnly = !favOnly;
      render();
    });

    filters.appendChild(favBtn);

    head.appendChild(tabs);
    head.appendChild(filters);
    lib.appendChild(head);

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'nw-input nw-sh-player__search';
    search.placeholder = 'Suchen…';
    search.autocomplete = 'off';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an search. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    search.addEventListener('input', () => {
      query = String(search.value || '').trim();
      renderList();
    });
    lib.appendChild(search);

    const list = document.createElement('div');
    list.className = 'nw-sh-player__list';
    lib.appendChild(list);

    const recentWrap = document.createElement('div');
    recentWrap.className = 'nw-sh-player__recent';
    lib.appendChild(recentWrap);

    /**
     * Code-Teil: Arrow-Funktion `getItems`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: getItems
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const getItems = () => {
      const arr = (tab === 'playlist') ? playlists : stations;
      return arr
        .map((x) => {
          const name = String((x && x.name) || '').trim();
          const val = (x && Object.prototype.hasOwnProperty.call(x, 'value')) ? x.value : null;
          if (!name) return null;
          return { name, value: val, valueStr: String(val) };
        })
        .filter(Boolean);
    };

    /**
     * Code-Teil: Arrow-Funktion `renderRecent`
     * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: renderRecent
     * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const renderRecent = () => {
      nwClear(recentWrap);
      const recent = nwLoadPlayerRecent(dev.id);
      if (!recent.length) return;

      const titleEl = document.createElement('div');
      titleEl.className = 'nw-sh-player__recenttitle';
      titleEl.textContent = 'Zuletzt gehört';
      recentWrap.appendChild(titleEl);

      const chips = document.createElement('div');
      chips.className = 'nw-sh-player__chips';
      recent.slice(0, 6).forEach((r) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nw-sh-chip nw-sh-chip--mini';
        b.textContent = String(r.name || '').trim() || '—';
        b.title = 'Erneut starten';
        b.disabled = !canWrite;
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an b. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        b.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canWrite) return;
          const kind = String(r.kind || '').trim();
          if (kind === 'playlist') {
            await nwPlayerActionMulti(dev.id, 'playlist', r.value);
          } else {
            await nwPlayerActionMulti(dev.id, 'station', r.value);
          }
          nwRefreshDevicesSoon(200);
        });
        chips.appendChild(b);
      });
      recentWrap.appendChild(chips);
    };

    /**
     * Code-Teil: Arrow-Funktion `renderList`
     * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: renderList
     * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const renderList = () => {
      const items = getItems();
      const q = String(query || '').trim().toLowerCase();

      const favs = nwLoadPlayerFavs(dev.id, tab);
      const favSet = new Set(favs);

      const map = new Map();
      items.forEach((it) => map.set(it.valueStr, it));

      /**
       * Code-Teil: Arrow-Funktion `matchesQuery`
       * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
       * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
       * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
       */
      /**
       * Code-Teil: matchesQuery
       * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
       * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
       * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
       */
      const matchesQuery = (it) => !q || String(it.name || '').toLowerCase().includes(q);

      let shown;
      if (favOnly) {
        shown = favs
          .map((v) => map.get(String(v)))
          .filter(Boolean)
          .filter(matchesQuery);
      } else {
        const favItems = favs
          .map((v) => map.get(String(v)))
          .filter(Boolean)
          .filter(matchesQuery);
        const otherItems = items
          .filter((it) => !favSet.has(it.valueStr))
          .filter(matchesQuery);
        shown = [...favItems, ...otherItems];
      }

      nwClear(list);

      if (!shown.length) {
        const empty = document.createElement('div');
        empty.className = 'nw-sh-empty';
        empty.textContent = favOnly ? 'Keine Favoriten gefunden.' : 'Keine Treffer.';
        list.appendChild(empty);
        return;
      }

      shown.forEach((it) => {
        const row = document.createElement('div');
        row.className = 'nw-sh-player__row';

        const fav = document.createElement('button');
        fav.type = 'button';
        fav.className = 'nw-sh-player__iconbtn';
        fav.textContent = favSet.has(it.valueStr) ? '★' : '☆';
        fav.title = 'Favorit umschalten';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an fav. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        fav.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          nwTogglePlayerFav(dev.id, tab, it.valueStr);
          render();
        });

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nw-sh-player__rowbtn';
        btn.textContent = it.name;
        btn.disabled = !canWrite;
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canWrite) return;
          if (tab === 'playlist') {
            await nwPlayerActionMulti(dev.id, 'playlist', it.value);
          } else {
            await nwPlayerActionMulti(dev.id, 'station', it.value);
          }
          nwAddPlayerRecent(dev.id, { kind: tab, name: it.name, value: it.value });
          nwRefreshDevicesSoon(200);
          renderRecent();
        });

        row.appendChild(fav);
        row.appendChild(btn);

        if (favOnly && favSet.has(it.valueStr)) {
          const up = document.createElement('button');
          up.type = 'button';
          up.className = 'nw-sh-player__iconbtn';
          up.textContent = '↑';
          up.title = 'Nach oben';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an up. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          up.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            nwMovePlayerFav(dev.id, tab, it.valueStr, -1);
            render();
          });

          const down = document.createElement('button');
          down.type = 'button';
          down.className = 'nw-sh-player__iconbtn';
          down.textContent = '↓';
          down.title = 'Nach unten';
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an down. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          down.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            nwMovePlayerFav(dev.id, tab, it.valueStr, +1);
            render();
          });

          row.appendChild(up);
          row.appendChild(down);
        }

        list.appendChild(row);
      });
    };

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
    const render = () => {
      if (tabStations) tabStations.classList.toggle('nw-sh-chip--active', tab === 'station');
      if (tabPlaylists) tabPlaylists.classList.toggle('nw-sh-chip--active', tab === 'playlist');
      favBtn.classList.toggle('nw-sh-chip--active', favOnly);

      search.placeholder = tab === 'playlist' ? 'Playlist suchen…' : 'Sender suchen…';
      renderList();
      renderRecent();
    };

    render();
    wrap.appendChild(lib);
  }

  return wrap;
}
/**
 * Code-Teil: nwCreateHalfDial
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateHalfDial(opts) {
  const min = Number(opts && opts.min);
  const max = Number(opts && opts.max);
  const step = Number(opts && opts.step) || 0.5;
  const canWrite = !!(opts && opts.canWrite);
  const subtitle = (opts && typeof opts.subtitle === 'string') ? opts.subtitle : '';
  const sub2 = (opts && typeof opts.sub2 === 'string') ? opts.sub2 : '';
  const onCommit = (opts && typeof opts.onCommit === 'function') ? opts.onCommit : null;

  let value = Number(opts && opts.value);
  if (!Number.isFinite(value)) value = min;
  value = nwClampNumber(value, min, max);
  value = nwRoundToStep(value, step);

  const wrap = document.createElement('div');
  wrap.className = 'nw-sh-dial';

  const valEl = document.createElement('div');
  valEl.className = 'nw-sh-dial__value';

  const subEl = document.createElement('div');
  subEl.className = 'nw-sh-dial__sub';
  subEl.textContent = subtitle || '';

  const sub2El = document.createElement('div');
  sub2El.className = 'nw-sh-dial__sub';
  sub2El.style.opacity = '0.85';
  sub2El.textContent = sub2 || '';

  // SVG dial
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 120');
  svg.setAttribute('role', 'img');

  const base = document.createElementNS(NS, 'path');
  base.setAttribute('d', 'M 20 100 A 80 80 0 0 0 180 100');
  base.setAttribute('fill', 'none');
  base.setAttribute('stroke', 'rgba(148,163,184,0.28)');
  base.setAttribute('stroke-width', '12');
  base.setAttribute('stroke-linecap', 'round');

  const active = document.createElementNS(NS, 'path');
  active.setAttribute('fill', 'none');
  active.setAttribute('stroke', 'var(--sh-accent)');
  active.setAttribute('stroke-width', '12');
  active.setAttribute('stroke-linecap', 'round');

  const knob = document.createElementNS(NS, 'circle');
  knob.setAttribute('r', '10');
  knob.setAttribute('fill', 'var(--sh-accent)');
  knob.setAttribute('stroke', 'rgba(2,6,23,0.65)');
  knob.setAttribute('stroke-width', '3');

  svg.appendChild(base);
  svg.appendChild(active);
  svg.appendChild(knob);

  const minMax = document.createElement('div');
  minMax.className = 'nw-sh-dial__minmax';
  minMax.innerHTML = `<span>${nwFormatNumberDE(min, 1)}°C</span><span>${nwFormatNumberDE(max, 1)}°C</span>`;

  const cx = 100;
  const cy = 100;
  const r = 80;

  /**
   * Code-Teil: Arrow-Funktion `setValue`
   * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: setValue
   * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const setValue = (v) => {
    value = nwClampNumber(nwRoundToStep(v, step), min, max);
    valEl.textContent = nwFormatNumberDE(value, 1) + '°C';

    const f = (max - min) > 0 ? ((value - min) / (max - min)) : 0;
    const angle = Math.PI * (1 - f); // pi (links) -> 0 (rechts)

    const x = cx + r * Math.cos(angle);
    const y = cy - r * Math.sin(angle);

    active.setAttribute('d', `M 20 100 A 80 80 0 0 0 ${x.toFixed(2)} ${y.toFixed(2)}`);
    knob.setAttribute('cx', x.toFixed(2));
    knob.setAttribute('cy', y.toFixed(2));
  };

  setValue(value);

  // Pointer events
  /**
   * Code-Teil: Arrow-Funktion `posToValue`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: posToValue
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const posToValue = (ev) => {
    const rect = svg.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return value;

    const px = (ev.clientX - rect.left) / rect.width * 200;
    const py = (ev.clientY - rect.top) / rect.height * 120;

    const dx = px - cx;
    const dy = cy - py; // nach oben positiv

    let ang = Math.atan2(dy, dx); // 0..pi für oberen Halbkreis
    if (!Number.isFinite(ang)) ang = 0;

    // clamp to [0, pi]
    ang = Math.max(0, Math.min(Math.PI, ang));

    const f = 1 - (ang / Math.PI);
    const v = min + f * (max - min);
    return v;
  };

  /**
   * Code-Teil: Arrow-Funktion `onDown`
   * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: onDown
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const onDown = (ev) => {
    if (!canWrite) return;
    nwPopoverDragging = true;
    svg.setPointerCapture(ev.pointerId);
    setValue(posToValue(ev));
    ev.preventDefault();
    ev.stopPropagation();
  };

  /**
   * Code-Teil: Arrow-Funktion `onMove`
   * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: onMove
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const onMove = (ev) => {
    if (!canWrite) return;
    if (!nwPopoverDragging) return;
    setValue(posToValue(ev));
    ev.preventDefault();
    ev.stopPropagation();
  };

  /**
   * Code-Teil: Arrow-Funktion `onUp`
   * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: onUp
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const onUp = async (ev) => {
    if (!canWrite) return;
    if (!nwPopoverDragging) return;
    nwPopoverDragging = false;
    try { svg.releasePointerCapture(ev.pointerId); } catch (_e) {}
    setValue(posToValue(ev));

    if (onCommit) {
      const v = value;
      await onCommit(v);
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an svg. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  svg.addEventListener('pointerdown', onDown);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointermove' an svg. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  svg.addEventListener('pointermove', onMove);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerup' an svg. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  svg.addEventListener('pointerup', onUp);
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointercancel' an svg. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  svg.addEventListener('pointercancel', () => { nwPopoverDragging = false; });

  // Accessibility hint
  if (!canWrite) svg.style.opacity = '0.6';

  wrap.appendChild(valEl);
  if (subtitle) wrap.appendChild(subEl);
  if (sub2) wrap.appendChild(sub2El);
  wrap.appendChild(svg);
  wrap.appendChild(minMax);

  return wrap;
}
/**
 * Code-Teil: nwRenderRooms
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderRooms(devices) {
  const wrap = document.getElementById('nw-smarthome-rooms');
  if (!wrap) return;
  nwClear(wrap);

  const roomGroups = nwGroupByRoom(devices);

  // Group rooms by floorId (so the runtime matches the editor structure)
  const floorMap = new Map();
  roomGroups.forEach((rg) => {
    const fid = String(rg && rg.floorId ? rg.floorId : '').trim();
    const key = fid || '__no_floor__';
    if (!floorMap.has(key)) floorMap.set(key, []);
    floorMap.get(key).push(rg);
  });

  const floorsById = nwShMeta.floorsById || {};
  const floorKeys = Array.from(floorMap.keys());
  floorKeys.sort((a, b) => {
    // "no floor" at the end
    if (a === '__no_floor__' && b !== '__no_floor__') return 1;
    if (b === '__no_floor__' && a !== '__no_floor__') return -1;

    const fa = floorsById[a];
    const fb = floorsById[b];
    const oa = (fa && Number.isFinite(+fa.order)) ? +fa.order : 999998;
    const ob = (fb && Number.isFinite(+fb.order)) ? +fb.order : 999998;
    if (oa !== ob) return oa - ob;

    const na = (fa && fa.name) ? fa.name : a;
    const nb = (fb && fb.name) ? fb.name : b;
    return String(na || '').toLowerCase().localeCompare(String(nb || '').toLowerCase());
  });

  /**
   * Code-Teil: Arrow-Funktion `renderRoomSection`
   * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: renderRoomSection
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const renderRoomSection = (g) => {
    const section = document.createElement('section');
    section.className = 'nw-sh-room';

    const header = document.createElement('div');
    header.className = 'nw-sh-room__header';

    const title = document.createElement('div');
    title.className = 'nw-sh-room__title';

    const roomIcon = String(g && g.icon ? g.icon : '').trim();
    const roomIconHtml = nwStaticIconHtml(roomIcon);
    if (roomIconHtml) {
      title.innerHTML = `<span class="nw-sh-room__icon">${roomIconHtml}</span><span class="nw-sh-room__label"></span>`;
      const lbl = title.querySelector('.nw-sh-room__label');
      if (lbl) lbl.textContent = g.room;
    } else {
      title.textContent = g.room;
    }

    header.appendChild(title);

    // Small room summary (e.g. temperature / humidity) based on all devices in that room.
    const summaryText = (g && g.isFloorDevicesGroup) ? '' : nwComputeRoomSummary(g.roomId, nwAllDevices);
    if (summaryText) {
      const summary = document.createElement('div');
      summary.className = 'nw-sh-room__summary';
      summary.textContent = summaryText;
      header.appendChild(summary);
    }
    section.appendChild(header);

    // stable ordering inside room
    const arr = (g.devices || []).slice();
    arr.sort(nwCompareDevices);

    if (nwViewState && nwViewState.groupByType) {
      const typeGroups = nwGroupDevicesByType(arr);
      typeGroups.forEach((tg) => {
        const tgWrap = document.createElement('div');
        tgWrap.className = 'nw-sh-type-group';

        const tgHead = document.createElement('div');
        tgHead.className = 'nw-sh-type-group__head';
        tgHead.innerHTML = `${tg.icon ? `<span class=\"nw-sh-type-group__icon\">${tg.icon}</span>` : ''}<span class=\"nw-sh-type-group__title\">${tg.title}</span><span class=\"nw-sh-type-group__count\">${tg.devices.length}</span>`;

        const tgGrid = document.createElement('div');
        tgGrid.className = 'nw-sh-grid';
        tg.devices.forEach((dev) => tgGrid.appendChild(nwCreateTile(dev)));

        tgWrap.appendChild(tgHead);
        tgWrap.appendChild(tgGrid);
        section.appendChild(tgWrap);
      });
    } else {
      const grid = document.createElement('div');
      grid.className = 'nw-sh-grid';
      arr.forEach((dev) => grid.appendChild(nwCreateTile(dev)));
      section.appendChild(grid);
    }
    return section;
  };

  floorKeys.forEach((floorId) => {
    const isUnassigned = floorId === '__no_floor__';
    const f = isUnassigned ? null : floorsById[floorId];
    const floorName = isUnassigned ? 'Ohne Geschoss' : (f && (f.name || f.title) ? (f.name || f.title) : floorId);
    const floorIcon = isUnassigned ? '🧩' : String((f && f.icon) ? f.icon : '🏢');
    const floorIconHtml = nwStaticIconHtml(floorIcon);

    const floorSection = document.createElement('section');
    floorSection.className = 'nw-sh-floor' + (isUnassigned ? ' nw-sh-floor--unassigned' : '');

    const header = document.createElement('div');
    header.className = 'nw-sh-floor__header';

    const title = document.createElement('div');
    title.className = 'nw-sh-floor__title';
    title.innerHTML = `${floorIconHtml ? `<span class=\"nw-sh-floor__icon\">${floorIconHtml}</span>` : ''}<span class=\"nw-sh-floor__label\"></span>`;
    const lbl = title.querySelector('.nw-sh-floor__label');
    if (lbl) lbl.textContent = floorName;
    header.appendChild(title);

    // Optional quick summary (rooms + device count)
    const roomsInFloor = floorMap.get(floorId) || [];
    const devCount = roomsInFloor.reduce((acc, rg) => acc + ((rg && Array.isArray(rg.devices)) ? rg.devices.length : 0), 0);
    const roomCount = roomsInFloor.filter(rg => rg && rg.roomId && !String(rg.roomId).startsWith('__floor__')).length;
    const sum = document.createElement('div');
    sum.className = 'nw-sh-floor__summary';
    sum.textContent = `${roomCount} Räume · ${devCount} Geräte`;
    header.appendChild(sum);

    floorSection.appendChild(header);

    const roomsWrap = document.createElement('div');
    roomsWrap.className = 'nw-sh-floor__rooms';

    roomsInFloor.sort((a, b) => {
      const oa = (a && Number.isFinite(+a.order)) ? +a.order : 999999;
      const ob = (b && Number.isFinite(+b.order)) ? +b.order : 999999;
      if (oa !== ob) return oa - ob;
      return String(a && a.room ? a.room : '').toLowerCase().localeCompare(String(b && b.room ? b.room : '').toLowerCase());
    });

    roomsInFloor.forEach((rg) => roomsWrap.appendChild(renderRoomSection(rg)));
    floorSection.appendChild(roomsWrap);
    wrap.appendChild(floorSection);
  });
}
/**
 * Code-Teil: nwComputeFunctionSummary
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwComputeFunctionSummary(funcName, funcDevices) {
  const name = String(funcName || '').trim();
  const devs = Array.isArray(funcDevices) ? funcDevices : [];
  if (!name || !devs.length) return '';

  const total = devs.length;
  // "aktiv" = typische An/Aus‑Geräte mit state.on === true
  let onCount = 0;
  devs.forEach(d => {
    const st = d && d.state;
    if (st && st.on === true) onCount++;
  });

  if (onCount > 0) return `${total} Geräte · ${onCount} an`;
  return `${total} Geräte`;
}
/**
 * Code-Teil: nwRenderFunctions
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderFunctions(devices) {
  const wrap = document.getElementById('nw-smarthome-rooms');
  if (!wrap) return;
  nwClear(wrap);

  const groups = nwGroupByFunction(devices);

  groups.forEach(g => {
    const section = document.createElement('section');
    section.className = 'nw-sh-room nw-sh-room--function';

    const header = document.createElement('div');
    header.className = 'nw-sh-room__header';

    const title = document.createElement('div');
    title.className = 'nw-sh-room__title';
    const fnIcon = nwGuessIconForFunctionLabel(g.func);
    if (fnIcon) {
      title.innerHTML = `<span class="nw-sh-fn__icon">${nwGetIconSvg(fnIcon, false)}</span><span class="nw-sh-fn__label"></span>`;
      const lbl = title.querySelector('.nw-sh-fn__label');
      if (lbl) lbl.textContent = g.func;
    } else {
      title.textContent = g.func;
    }
    header.appendChild(title);

    const summaryText = nwComputeFunctionSummary(g.func, g.devices);
    if (summaryText) {
      const summary = document.createElement('div');
      summary.className = 'nw-sh-room__summary';
      summary.textContent = summaryText;
      header.appendChild(summary);
    }

    section.appendChild(header);

    // stable ordering inside function
    const arr = (g.devices || []).slice();
    arr.sort(nwCompareDevices);

    if (nwViewState && nwViewState.groupByType) {
      const typeGroups = nwGroupDevicesByType(arr);
      typeGroups.forEach((tg) => {
        const tgWrap = document.createElement('div');
        tgWrap.className = 'nw-sh-type-group';

        const tgHead = document.createElement('div');
        tgHead.className = 'nw-sh-type-group__head';
        tgHead.innerHTML = `${tg.icon ? `<span class=\"nw-sh-type-group__icon\">${tg.icon}</span>` : ''}<span class=\"nw-sh-type-group__title\">${tg.title}</span><span class=\"nw-sh-type-group__count\">${tg.devices.length}</span>`;

        const tgGrid = document.createElement('div');
        tgGrid.className = 'nw-sh-grid';
        tg.devices.forEach((dev) => tgGrid.appendChild(nwCreateTile(dev, { showRoom: true })));

        tgWrap.appendChild(tgHead);
        tgWrap.appendChild(tgGrid);
        section.appendChild(tgWrap);
      });
    } else {
      const grid = document.createElement('div');
      grid.className = 'nw-sh-grid';
      arr.forEach((dev) => grid.appendChild(nwCreateTile(dev, { showRoom: true })));
      section.appendChild(grid);
    }
    wrap.appendChild(section);
  });
}
/**
 * Code-Teil: nwFindFloorPageId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFindFloorPageId(floorId) {
  const fid = nwNormalizeId(floorId);
  const directId = fid ? `floor_${fid}` : 'floor_unassigned';
  const pages = Array.isArray(nwPageState.pages) ? nwPageState.pages : [];
  if (pages.some(p => p && p.id === directId)) return directId;

  // Fallback: try to locate a floor page by its derived floor id
  const match = pages.find(p => p && nwIsFloorPage(p) && nwGetFloorIdFromPage(p) === fid);
  return match ? match.id : directId;
}
/**
 * Code-Teil: nwFindRoomPageId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFindRoomPageId(roomId) {
  const rid = nwNormalizeId(roomId);
  const directId = rid ? `room_${rid}` : '';
  const pages = Array.isArray(nwPageState.pages) ? nwPageState.pages : [];
  if (directId && pages.some(p => p && p.id === directId)) return directId;
  const match = pages.find(p => p && Array.isArray(p.roomIds) && p.roomIds.length === 1 && nwNormalizeId(p.roomIds[0]) === rid);
  return match ? match.id : directId;
}
/**
 * Code-Teil: nwRenderHome
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderHome(devices) {
  const wrap = document.getElementById('nw-smarthome-rooms');
  if (!wrap) return;
  nwClear(wrap);

  const root = document.createElement('div');
  root.className = 'nw-sh-home';

  const all = Array.isArray(devices) ? devices.slice() : [];
  const favs = all.filter(d => nwIsFavorite(d));
  const onCount = all.filter(d => nwIsOn(d)).length;

  // --- Info / Summary ---
  const info = document.createElement('section');
  info.className = 'nw-sh-home__info';
  info.innerHTML = `
    <div class="nw-sh-home__info-title">Übersicht</div>
    <div class="nw-sh-home__info-grid">
      <div class="nw-sh-home__stat"><div class="nw-sh-home__stat-val">${all.length}</div><div class="nw-sh-home__stat-lbl">Geräte</div></div>
      <div class="nw-sh-home__stat"><div class="nw-sh-home__stat-val">${favs.length}</div><div class="nw-sh-home__stat-lbl">Favoriten</div></div>
      <div class="nw-sh-home__stat"><div class="nw-sh-home__stat-val">${onCount}</div><div class="nw-sh-home__stat-lbl">Aktiv</div></div>
    </div>
  `;
  root.appendChild(info);

  // --- Favorites ---
  const favSec = document.createElement('section');
  favSec.className = 'nw-sh-home__section';
  const favHead = document.createElement('div');
  favHead.className = 'nw-sh-home__section-head';
  favHead.textContent = 'Favoriten';
  favSec.appendChild(favHead);

  if (favs.length) {
    const grid = document.createElement('div');
    grid.className = 'nw-sh-grid nw-sh-grid--home';
    const arr = favs.slice().sort(nwCompareDevices);
    arr.forEach((dev) => grid.appendChild(nwCreateTile(dev, { showRoom: true })));
    favSec.appendChild(grid);
  } else {
    const empty = document.createElement('div');
    empty.className = 'nw-sh-home__muted';
    empty.textContent = 'Noch keine Favoriten gesetzt.';
    favSec.appendChild(empty);
  }
  root.appendChild(favSec);

  // --- Floors overview (tiles) ---
  const floorSec = document.createElement('section');
  floorSec.className = 'nw-sh-home__section';
  const floorHead = document.createElement('div');
  floorHead.className = 'nw-sh-home__section-head';
  floorHead.textContent = 'Geschosse';
  floorSec.appendChild(floorHead);

  const floorsWrap = document.createElement('div');
  floorsWrap.className = 'nw-sh-home__floors';

  const cfg = nwShConfig || {};
  const floors = Array.isArray(cfg.floors) ? cfg.floors.slice() : [];
  const rooms = Array.isArray(cfg.rooms) ? cfg.rooms.slice() : [];

  /**
   * Code-Teil: Arrow-Funktion `sortByOrderName`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: sortByOrderName
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const sortByOrderName = (a, b) => {
    const oa = Number.isFinite(+a.order) ? +a.order : 0;
    const ob = Number.isFinite(+b.order) ? +b.order : 0;
    if (oa !== ob) return oa - ob;
    return String(a.name || a.title || a.id || '').toLowerCase().localeCompare(String(b.name || b.title || b.id || '').toLowerCase(), 'de');
  };

  const sortedFloors = floors
    .map((f, idx) => ({ ...f, order: (typeof f.order === 'number') ? f.order : (idx + 1) }))
    .slice()
    .sort(sortByOrderName);
  const unassignedRooms = rooms.filter(r => !nwNormalizeId(r && r.floorId));
  const hasUnassignedDevices = all.some(d => nwGetDeviceFloorId(d) === '');

  const floorTiles = [];
  sortedFloors.forEach((f) => {
    const fid = nwNormalizeId(f && f.id);
    if (!fid) return;
    floorTiles.push({
      id: fid,
      name: String(f.name || f.title || f.id || fid),
      icon: String(f.icon || '🏢'),
      order: (typeof f.order === 'number') ? f.order : 0,
    });
  });

  if (unassignedRooms.length || hasUnassignedDevices) {
    floorTiles.push({
      id: '',
      name: 'Ohne Geschoss',
      icon: '🧩',
      order: 99999,
      _virtual: true,
    });
  }

  floorTiles.forEach((fl) => {
    const fid = nwNormalizeId(fl.id);
    const roomsInFloor = rooms
      .filter(r => (fid ? (nwNormalizeId(r && r.floorId) === fid) : !nwNormalizeId(r && r.floorId)))
      .slice()
      .sort(sortByOrderName);
    const devCount = all.filter(d => nwGetDeviceFloorId(d) === fid).length;
    const roomCount = roomsInFloor.length;

    const tile = document.createElement('div');
    tile.className = 'nw-sh-floor-tile';
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');

    const head = document.createElement('div');
    head.className = 'nw-sh-floor-tile__head';

    const icon = document.createElement('div');
    icon.className = 'nw-sh-floor-tile__icon';
    icon.innerHTML = nwStaticIconHtml(fl.icon);

    const name = document.createElement('div');
    name.className = 'nw-sh-floor-tile__name';
    name.textContent = fl.name;

    head.appendChild(icon);
    head.appendChild(name);
    tile.appendChild(head);

    const meta = document.createElement('div');
    meta.className = 'nw-sh-floor-tile__meta';
    meta.textContent = `${roomCount} Räume · ${devCount} Geräte`;
    tile.appendChild(meta);

    const roomsRow = document.createElement('div');
    roomsRow.className = 'nw-sh-floor-tile__rooms';

    const maxChips = 6;
    roomsInFloor.slice(0, maxChips).forEach((r) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'nw-sh-room-chip';
      chip.innerHTML = `${r.icon ? `<span class="nw-sh-room-chip__icon">${nwStaticIconHtml(r.icon)}</span>` : ''}<span class="nw-sh-room-chip__label"></span>`;
      const lbl = chip.querySelector('.nw-sh-room-chip__label');
      if (lbl) lbl.textContent = String(r.name || r.id);
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an chip. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      chip.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const pid = nwFindRoomPageId(r.id);
        if (pid) nwActivatePage(pid);
      });
      roomsRow.appendChild(chip);
    });

    if (roomsInFloor.length > maxChips) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'nw-sh-room-chip nw-sh-room-chip--more';
      more.textContent = `+${roomsInFloor.length - maxChips}`;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an more. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      more.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const pid = nwFindFloorPageId(fid);
        if (pid) nwActivatePage(pid);
      });
      roomsRow.appendChild(more);
    }

    tile.appendChild(roomsRow);

    /**
     * Code-Teil: Arrow-Funktion `go`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: go
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const go = () => {
      const pid = nwFindFloorPageId(fid);
      if (pid) nwActivatePage(pid);
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    tile.addEventListener('click', go);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an tile. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });

    floorsWrap.appendChild(tile);
  });

  if (!floorTiles.length) {
    const empty = document.createElement('div');
    empty.className = 'nw-sh-home__muted';
    empty.textContent = 'Noch keine Geschosse angelegt. (Bitte im SmartHome-Editor konfigurieren.)';
    floorsWrap.appendChild(empty);
  }

  floorSec.appendChild(floorsWrap);
  root.appendChild(floorSec);

  wrap.appendChild(root);
}

// ---------- Sidebar Pages (Navigation Presets) ----------
/**
 * Code-Teil: nwNormalizeId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwNormalizeId(s) {
  return String(s || '').trim();
}
/**
 * Code-Teil: nwBuildMetaFromConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwBuildMetaFromConfig(cfg) {
  nwShMeta.floorsById = {};
  nwShMeta.floorIdByName = {};
  nwShMeta.roomsById = {};
  nwShMeta.funcsById = {};
  nwShMeta.roomIdByName = {};
  nwShMeta.funcIdByName = {};

  const floors = Array.isArray(cfg && cfg.floors) ? cfg.floors : [];
  const rooms = Array.isArray(cfg && cfg.rooms) ? cfg.rooms : [];
  const funcs = Array.isArray(cfg && cfg.functions) ? cfg.functions : [];

  floors.forEach(fl => {
    const id = nwNormalizeId(fl && fl.id);
    const name = nwNormalizeId(fl && (fl.name || fl.title || fl.id));
    if (!id) return;
    nwShMeta.floorsById[id] = { ...fl, id, name: name || id };
    if (name) nwShMeta.floorIdByName[name] = id;
  });

  rooms.forEach(r => {
    const id = nwNormalizeId(r.id);
    const name = nwNormalizeId(r.name);
    if (!id || !name) return;
    nwShMeta.roomsById[id] = { ...r, id, name };
    nwShMeta.roomIdByName[name] = id;
  });

  funcs.forEach(f => {
    const id = nwNormalizeId(f.id);
    const name = nwNormalizeId(f.name);
    if (!id || !name) return;
    nwShMeta.funcsById[id] = { ...f, id, name };
    nwShMeta.funcIdByName[name] = id;
  });
}
/**
 * Code-Teil: nwBuildDefaultPagesFromConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwBuildDefaultPagesFromConfig(cfg) {
  const pages = [];

  // Home = Overview (alle Geschosse + Räume)
  pages.push({
    id: 'home',
    title: 'Home',
    icon: '🏠',
    viewMode: 'rooms',
    roomIds: [],
    funcIds: [],
    types: [],
    favoritesOnly: false,
    order: 0,
  });

  const floors = Array.isArray(cfg && cfg.floors) ? cfg.floors : [];
  const rooms = Array.isArray(cfg && cfg.rooms) ? cfg.rooms : [];

  // If no floors exist, keep the legacy flat room navigation.
  if (!floors.length) {
    rooms
      .slice()
      .sort((a, b) => {
        const oa = (typeof a.order === 'number') ? a.order : 0;
        const ob = (typeof b.order === 'number') ? b.order : 0;
        if (oa !== ob) return oa - ob;
        return nwSortBy(String(a.name || ''), String(b.name || ''));
      })
      .forEach((r, idx) => {
        const id = nwNormalizeId(r.id);
        const name = nwNormalizeId(r.name);
        if (!id || !name) return;
        pages.push({
          id: `room_${id}`,
          title: name,
          icon: r.icon || '🏷️',
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

  // Rooms by floor
  const roomsByFloor = new Map();
  const unassignedRooms = [];

  for (const r of rooms) {
    const rid = nwNormalizeId(r && r.id);
    const rname = nwNormalizeId(r && r.name);
    if (!rid || !rname) continue;

    const fid = nwNormalizeId(r && r.floorId);
    if (fid) {
      if (!roomsByFloor.has(fid)) roomsByFloor.set(fid, []);
      roomsByFloor.get(fid).push(r);
    } else {
      unassignedRooms.push(r);
    }
  }

  // Sort floors by configured order/name
  const sortedFloors = floors
    .slice()
    .map((f, idx) => ({
      id: nwNormalizeId(f && f.id),
      name: nwNormalizeId(f && (f.name || f.title || f.id)) || nwNormalizeId(f && f.id),
      icon: nwNormalizeId(f && f.icon) || '🏢',
      order: (typeof (f && f.order) === 'number') ? f.order : idx + 1,
    }))
    .filter((f) => f && f.id)
    .sort((a, b) => {
      const oa = (typeof a.order === 'number') ? a.order : 0;
      const ob = (typeof b.order === 'number') ? b.order : 0;
      if (oa !== ob) return oa - ob;
      return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase(), 'de');
    });

  const NO_MATCH = '__nw_no_match__';

  // Floors as nav parents + rooms as children (hierarchical: Räume nach Etage)
  sortedFloors.forEach((f, fIdx) => {
    const floorPageId = `floor_${f.id}`;
    const roomsInFloor = (roomsByFloor.get(f.id) || [])
      .slice()
      .sort((a, b) => {
        const oa = (typeof a.order === 'number') ? a.order : 0;
        const ob = (typeof b.order === 'number') ? b.order : 0;
        if (oa !== ob) return oa - ob;
        return nwSortBy(String(a.name || ''), String(b.name || ''));
      });

    const roomIds = roomsInFloor
      .map((r) => nwNormalizeId(r && r.id))
      .filter(Boolean);

    pages.push({
      id: floorPageId,
      title: f.name || f.id,
      icon: f.icon || '🏢',
      viewMode: 'rooms',
      // If there are currently no rooms in that floor, avoid showing "all devices".
      roomIds: roomIds.length ? roomIds : [NO_MATCH],
      funcIds: [],
      types: [],
      favoritesOnly: false,
      order: 10 + fIdx,
    });

    roomsInFloor.forEach((r, rIdx) => {
      const rid = nwNormalizeId(r && r.id);
      const rname = nwNormalizeId(r && r.name);
      if (!rid || !rname) return;
      pages.push({
        id: `room_${rid}`,
        title: rname,
        icon: r.icon || '🏷️',
        viewMode: 'rooms',
        roomIds: [rid],
        funcIds: [],
        types: [],
        favoritesOnly: false,
        parentId: floorPageId,
        order: (typeof r.order === 'number') ? r.order : rIdx,
      });
    });
  });

  // Unassigned rooms (no floorId) → own group at the end
  if (unassignedRooms.length) {
    const floorPageId = 'floor_unassigned';
    const roomsSorted = unassignedRooms
      .slice()
      .sort((a, b) => {
        const oa = (typeof a.order === 'number') ? a.order : 0;
        const ob = (typeof b.order === 'number') ? b.order : 0;
        if (oa !== ob) return oa - ob;
        return nwSortBy(String(a.name || ''), String(b.name || ''));
      });
    const roomIds = roomsSorted.map((r) => nwNormalizeId(r && r.id)).filter(Boolean);

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
      const rid = nwNormalizeId(r && r.id);
      const rname = nwNormalizeId(r && r.name);
      if (!rid || !rname) return;
      pages.push({
        id: `room_${rid}`,
        title: rname,
        icon: r.icon || '🏷️',
        viewMode: 'rooms',
        roomIds: [rid],
        funcIds: [],
        types: [],
        favoritesOnly: false,
        parentId: floorPageId,
        order: (typeof r.order === 'number') ? r.order : rIdx,
      });
    });
  }

  return pages;
}
/**
 * Code-Teil: nwIsHomePage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwIsHomePage(page) {
  if (!page) return false;
  const id = String(page.id || '').trim().toLowerCase();
  if (id === 'home') return true;
  const title = String(page.title || '').trim().toLowerCase();
  if (title === 'home' || title === 'übersicht' || title === 'uebersicht') return true;
  return false;
}
/**
 * Code-Teil: nwIsLegacyFlatRoomPages
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwIsLegacyFlatRoomPages(pages, cfg) {
  // Legacy auto-default: Home + one page per room, all at root level.
  const arr = Array.isArray(pages) ? pages : [];
  const rooms = Array.isArray(cfg && cfg.rooms) ? cfg.rooms : [];
  if (!arr.length || !rooms.length) return false;
  const hasHome = arr.some((p) => nwIsHomePage(p));
  if (!hasHome) return false;

  // No nesting, no floors, no other filter presets.
  if (arr.some((p) => p && p.parentId)) return false;
  if (arr.some((p) => p && String(p.id || '').startsWith('floor_'))) return false;
  const others = arr.filter((p) => p && !nwIsHomePage(p));
  if (!others.length) return false;

  // All others look like simple "one room per page" entries.
  // (Older versions used ids like room_<id>, but some configs used custom ids.
  // We therefore validate via roomIds and known room IDs.)
  const roomIdSet = new Set(rooms.map((r) => nwNormalizeId(r && r.id || '')).filter(Boolean));
  const usedRoomIds = new Set();
  for (const p of others) {
    if (!p) return false;
    if (!Array.isArray(p.roomIds) || p.roomIds.length !== 1) return false;
    const rid = nwNormalizeId(p.roomIds[0]);
    if (!rid || !roomIdSet.has(rid)) return false;
    if (usedRoomIds.has(rid)) return false;
    usedRoomIds.add(rid);
    if (Array.isArray(p.funcIds) && p.funcIds.length) return false;
    if (Array.isArray(p.types) && p.types.length) return false;
    if (p.favoritesOnly) return false;
  }

  // Heuristic: if we have floors or rooms reference floorId, we can upgrade safely.
  const floors = Array.isArray(cfg && cfg.floors) ? cfg.floors : [];
  const roomsHaveFloors = rooms.some((r) => r && String(r.floorId || '').trim());

  return (floors && floors.length) || roomsHaveFloors;
}
/**
 * Code-Teil: nwGetPagesFromConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetPagesFromConfig(cfg) {
  const pages = Array.isArray(cfg && cfg.pages) ? cfg.pages : [];

  // Auto-upgrade: older configs often saved the legacy flat room navigation.
  // If floors exist (hierarchical mode), regenerate the default pages to reflect
  // Geschoss → Raum in the sidebar, matching the editor structure.
  if (pages && pages.length && nwIsLegacyFlatRoomPages(pages, cfg)) {
    return nwBuildDefaultPagesFromConfig(cfg);
  }

  if (pages && pages.length) {
    return pages
      .map((p, idx) => ({
        id: nwNormalizeId(p.id || `page_${idx + 1}`),
        title: nwNormalizeId(p.title || p.name || p.id || `Seite ${idx + 1}`),
        icon: nwNormalizeId(p.icon || ''),
        viewMode: nwNormalizeId(p.viewMode || ''),
        roomIds: Array.isArray(p.roomIds) ? p.roomIds.map(nwNormalizeId).filter(Boolean) : [],
        funcIds: Array.isArray(p.funcIds) ? p.funcIds.map(nwNormalizeId).filter(Boolean) : [],
        types: Array.isArray(p.types) ? p.types.map(nwNormalizeId).filter(Boolean) : [],
        favoritesOnly: !!p.favoritesOnly,
        order: (typeof p.order === 'number') ? p.order : idx,
        href: nwNormalizeId(p.href || ''),
        parentId: nwNormalizeId(p.parentId || ''),
        cardSize: (() => { const v = String((p.cardSize ?? (p.layout && p.layout.cardSize)) || '').trim(); return ['auto','s','m','l','xl'].includes(v) ? v : 'auto'; })(),
        sortBy: (() => { const v = String((p.sortBy ?? (p.layout && p.layout.sortBy)) || '').trim(); return ['order','name','type'].includes(v) ? v : 'order'; })(),
        groupByType: !!(p.groupByType ?? (p.layout && p.layout.groupByType)),
      }))
      .filter(p => p.id && p.title)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  return nwBuildDefaultPagesFromConfig(cfg);
}
/**
 * Code-Teil: nwSetSidebarOpen
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetSidebarOpen(open) {
  const sidebar = document.getElementById('nwShSidebar');
  const overlay = document.getElementById('nwShOverlay');
  if (!sidebar || !overlay) return;

  const isOpen = !!open;
  sidebar.classList.toggle('nw-sh-sidebar--open', isOpen);
  overlay.style.display = isOpen ? 'block' : 'none';
}
/**
 * Code-Teil: nwInitSidebarUi
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwInitSidebarUi() {
  const btn = document.getElementById('nwShNavToggle');
  const overlay = document.getElementById('nwShOverlay');
  if (btn) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sidebar = document.getElementById('nwShSidebar');
      const isOpen = sidebar ? sidebar.classList.contains('nw-sh-sidebar--open') : false;
      nwSetSidebarOpen(!isOpen);
    });
  }
  if (overlay) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an overlay. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    overlay.addEventListener('click', () => nwSetSidebarOpen(false));
  }
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') nwSetSidebarOpen(false);
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'resize' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('resize', () => {
    // If we leave mobile breakpoint, ensure overlay/drawer state is reset
    if (window.innerWidth > 900) nwSetSidebarOpen(false);
  });
}

// ---------------------------------------------------------------------------
// UI helpers (defensive)
//
// The SmartHome VIS must never crash due to missing helpers. Earlier builds
// referenced these functions but did not ship them, which prevented the whole
// page from rendering.
/**
 * Code-Teil: nwUpdatePageTitle
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwUpdatePageTitle() {
  const el = document.getElementById('nwShPageTitle');
  const subEl = document.getElementById('nwShPageSubTitle');
  const pages = Array.isArray(nwPageState.pages) ? nwPageState.pages : [];
  const activeId = nwPageState.activeId;
  const page = pages.find((p) => p && p.id === activeId) || pages[0] || null;
  const title = (page && page.title) ? String(page.title) : 'SmartHome';

  // Breadcrumb subtitle (hierarchy-aware): show parent page label (e.g. floor name when a room is active)
  let subtitle = '';
  try {
    if (page && page.id) {
      const byId = new Map(pages.map((p) => [p.id, p]));
      const chain = [];
      let cur = page;
      let safety = 50;
      while (cur && safety-- > 0) {
        chain.unshift(cur);
        if (!cur.parentId) break;
        const next = byId.get(cur.parentId);
        if (!next || next.id === cur.id) break;
        cur = next;
      }
      if (chain.length >= 2) {
        subtitle = String(chain[chain.length - 2].title || '').trim();
      }
    }
  } catch (_e) {
    subtitle = '';
  }

  if (el) el.textContent = title;

  if (subEl) {
    subEl.textContent = subtitle;
    subEl.style.display = subtitle ? 'block' : 'none';
  }

  // Best-effort browser-tab title update.
  try {
    document.title = subtitle
      ? `NexoWatt EOS – ${title} – ${subtitle}`
      : `NexoWatt EOS – ${title}`;
  } catch (_) {
    // ignore
  }
}
/**
 * Code-Teil: nwCloseSidebar
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCloseSidebar() {
  nwSetSidebarOpen(false);
}
/**
 * Code-Teil: nwLoadExpandedIdsFromLs
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLoadExpandedIdsFromLs() {
  if (nwPageState.__expandedLoaded) return;
  nwPageState.__expandedLoaded = true;

  let loaded = false;
  try {
    const raw = localStorage.getItem(NW_SH_NAV_EXPANDED_LS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        nwPageState.expandedIds = new Set(arr.filter((x) => typeof x === 'string' && x.trim()));
        loaded = true;
      }
    }
  } catch (e) {
    // ignore
  }

  // Default (hierarchy mode): show rooms nested under floors without forcing the user
  // to click "expand" for every floor. We only apply this when no valid state
  // was loaded OR when the stored state is clearly from an older nav layout.
  try {
    const { children, roots } = nwBuildPageTree(nwPageState.pages || []);
    const rootWithChildren = roots.filter((p) => children.has(p.id) && (children.get(p.id) || []).length);

    // Determine if the stored expandedIds look stale (e.g. upgrade from older version)
    const hasAnyCurrentRootExpanded = rootWithChildren.some((p) => nwPageState.expandedIds.has(p.id));

    if (!loaded || (!hasAnyCurrentRootExpanded && rootWithChildren.length)) {
      nwPageState.expandedIds = new Set(rootWithChildren.map((p) => p.id));
      nwSaveExpandedIdsToLs();
    }
  } catch (_e) {
    // ignore
  }
}
/**
 * Code-Teil: nwSaveExpandedIdsToLs
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSaveExpandedIdsToLs() {
  try {
    localStorage.setItem(NW_SH_NAV_EXPANDED_LS_KEY, JSON.stringify(Array.from(nwPageState.expandedIds || [])));
  } catch (e) {
    // ignore
  }
}
/**
 * Code-Teil: nwEnsureAncestorsExpanded
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureAncestorsExpanded(pageId) {
  const byId = new Map((nwPageState.pages || []).map((p) => [p.id, p]));
  let cur = byId.get(pageId);
  const safety = 50;
  let i = 0;
  while (cur && cur.parentId && i < safety) {
    const pid = cur.parentId;
    if (!pid || pid === cur.id) break;
    nwPageState.expandedIds.add(pid);
    cur = byId.get(pid);
    i++;
  }
  nwSaveExpandedIdsToLs();
}
/**
 * Code-Teil: nwToggleNavExpanded
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwToggleNavExpanded(pageId) {
  nwLoadExpandedIdsFromLs();
  if (!pageId) return;
  if (nwPageState.expandedIds.has(pageId)) nwPageState.expandedIds.delete(pageId);
  else nwPageState.expandedIds.add(pageId);
  nwSaveExpandedIdsToLs();
  nwRenderSidebarNav();
}
/**
 * Code-Teil: nwResolvePageFilters
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwResolvePageFilters(page) {
  if (!page) return { roomIds: [], funcIds: [], types: [], favoritesOnly: false };
  const byId = new Map((nwPageState.pages || []).map((p) => [p.id, p]));
  const chain = [];
  let cur = page;
  let safety = 50;

  while (cur && safety-- > 0) {
    chain.unshift(cur); // root -> child
    if (!cur.parentId) break;
    const next = byId.get(cur.parentId);
    if (!next || next.id === cur.id) break;
    cur = next;
  }

  const res = { roomIds: [], funcIds: [], types: [], favoritesOnly: false };
  for (const p of chain) {
    if (Array.isArray(p.roomIds) && p.roomIds.length) res.roomIds = p.roomIds.slice();
    if (Array.isArray(p.funcIds) && p.funcIds.length) res.funcIds = p.funcIds.slice();
    if (Array.isArray(p.types) && p.types.length) res.types = p.types.slice();
    if (p.favoritesOnly) res.favoritesOnly = true;
  }

  return res;
}
/**
 * Code-Teil: nwIsFloorPage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwIsFloorPage(page) {
  const id = page && typeof page.id === 'string' ? page.id : '';
  return id.startsWith('floor_');
}
/**
 * Code-Teil: nwGetFloorIdFromPage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetFloorIdFromPage(page) {
  const id = page && typeof page.id === 'string' ? page.id : '';
  if (!id.startsWith('floor_')) return '';
  if (id === 'floor_unassigned') return '';
  return id.slice('floor_'.length);
}
/**
 * Code-Teil: nwFilterDevicesForPage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFilterDevicesForPage(allDevices, page) {
  const list = Array.isArray(allDevices) ? allDevices.slice() : [];
  if (!page) return list;

  const eff = nwResolvePageFilters(page);
  const funcIds = Array.isArray(eff.funcIds) ? eff.funcIds.map(nwNormalizeId).filter(Boolean) : [];
  const types = Array.isArray(eff.types) ? eff.types.map(nwNormalizeId).filter(Boolean) : [];

  let out = list;

  if (eff.favoritesOnly) {
    out = out.filter(d => nwIsFavorite(d));
  }

  // Special case: floor pages should show everything inside the floor,
  // including devices that live directly on the floor (no roomId).
  if (nwIsFloorPage(page)) {
    const fid = nwGetFloorIdFromPage(page);
    out = out.filter(d => nwGetDeviceFloorId(d) === fid);
  } else {
    const roomIds = Array.isArray(eff.roomIds) ? eff.roomIds.map(nwNormalizeId).filter(Boolean) : [];
    if (roomIds.length) {
      const set = new Set(roomIds);
      out = out.filter(d => set.has(nwGetDeviceRoomId(d)));
    }
  }

  if (funcIds.length) {
    const set = new Set(funcIds);
    out = out.filter(d => set.has(nwGetDeviceFuncId(d)));
  }

  if (types.length) {
    const set = new Set(types);
    out = out.filter(d => set.has(nwNormalizeId(d && d.type)));
  }

  return out;
}
/**
 * Code-Teil: nwGetDevicesForPage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetDevicesForPage(page) {
  return nwFilterDevicesForPage(nwAllDevices, page);
}
/**
 * Code-Teil: nwUpdatePageCounts
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwUpdatePageCounts() {
  const counts = {};
  for (const p of nwPageState.pages || []) {
    // External href pages may still show counts if they have filters – harmless.
    counts[p.id] = nwGetDevicesForPage(p).length;
  }
  nwPageState.countsById = counts;
}
/**
 * Code-Teil: nwBuildPageTree
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwBuildPageTree(pages) {
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
 * Code-Teil: nwRenderSidebarNav
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderSidebarNav() {
  // Backwards compatibility: HTML uses id="nwShNav" while some early page-nav
  // prototypes referenced id="nw-sh-nav". Render into whichever exists.
  const el = document.getElementById('nwShNav') || document.getElementById('nw-sh-nav');
  if (!el) return;

  nwLoadExpandedIdsFromLs();
  nwUpdatePageCounts();

  el.innerHTML = '';

  const { children, roots } = nwBuildPageTree(nwPageState.pages || []);

  /**
   * Code-Teil: Arrow-Funktion `renderList`
   * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: renderList
   * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
   * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const renderList = (list, depth) => {
    for (const p of list) {
      const hasChildren = children.has(p.id) && (children.get(p.id) || []).length > 0;
      const isExpanded = hasChildren && nwPageState.expandedIds.has(p.id);
      const isActive = nwPageState.activeId === p.id;

      const btn = document.createElement('button');
      btn.type = 'button';
      const roleClass = (nwIsHomePage(p))
        ? ' nw-sh-nav-item--home'
        : (depth === 0 && hasChildren)
          ? ' nw-sh-nav-item--floor'
          : (depth > 0)
            ? ' nw-sh-nav-item--room'
            : ' nw-sh-nav-item--page';
      btn.className = 'nw-sh-nav-item' + roleClass + (isActive ? ' nw-sh-nav-item--active' : '');
      btn.style.paddingLeft = `${12 + Math.max(0, depth) * 14}px`;
      btn.dataset.depth = String(depth || 0);

      const caret = document.createElement('span');
      caret.className = hasChildren
        ? 'nw-sh-nav-item__caret' + (isExpanded ? ' nw-sh-nav-item__caret--open' : '')
        : 'nw-sh-nav-item__caret--spacer';
      caret.textContent = '›';
      if (hasChildren) {
        caret.title = isExpanded ? 'Zuklappen' : 'Aufklappen';
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an caret. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        caret.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          nwToggleNavExpanded(p.id);
        });
      }

      const icon = document.createElement('span');
      icon.className = 'nw-sh-nav-item__icon';
    icon.innerHTML = nwStaticIconHtml(p.icon || '•');

      const label = document.createElement('span');
      label.className = 'nw-sh-nav-item__label nw-sh-nav-label';
      label.textContent = p.title || p.id;

      const count = typeof nwPageState.countsById[p.id] === 'number' ? nwPageState.countsById[p.id] : 0;
      const badge = document.createElement('span');
      badge.className = 'nw-sh-nav-item__badge';
      badge.textContent = String(count);
      badge.title = `${count} Geräte`;

      btn.appendChild(caret);
      btn.appendChild(icon);
      btn.appendChild(label);
      btn.appendChild(badge);

      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', () => {
        if (p.href) {
          window.location.href = p.href;
          return;
        }
        // Auto-expand parents so the active item stays visible in nested navigation
        nwEnsureAncestorsExpanded(p.id);
        nwActivatePage(p.id);
        // In mobile mode, close drawer on selection
        if (document.body.classList.contains('nw-sh-sidebar-open')) {
          nwCloseSidebar();
        }
      });

      el.appendChild(btn);

      if (hasChildren && isExpanded) {
        renderList(children.get(p.id) || [], depth + 1);
      }
    }
  };

  renderList(roots, 0);
}
/**
 * Code-Teil: nwActivatePage
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwActivatePage(pageId) {
  const id = nwNormalizeId(pageId);
  const page = nwPageState.pages.find(p => p.id === id);
  if (!page) return;

  nwPageState.activeId = page.id;
  try { localStorage.setItem(NW_SH_ACTIVE_PAGE_LS_KEY, page.id); } catch (_e) {}

  // Apply page base filters (inkl. Parent-Inheritance, z.B. Wohnzimmer → Licht)
  const eff = nwResolvePageFilters(page);
  nwFilterState.page.roomIds = Array.isArray(eff.roomIds) ? eff.roomIds.slice() : [];
  nwFilterState.page.funcIds = Array.isArray(eff.funcIds) ? eff.funcIds.slice() : [];
  nwFilterState.page.types = Array.isArray(eff.types) ? eff.types.slice() : [];
  nwFilterState.page.favoritesOnly = !!eff.favoritesOnly;

  // Reset user filters on page change (prevents confusing empty screens)
  nwFilterState.func = null;
  nwFilterState.favoritesOnly = false;

  // Optional default grouping
  if (page.viewMode === 'rooms' || page.viewMode === 'functions') {
    nwViewState.mode = page.viewMode;
  } else {
    // Default (fallback)
    nwViewState.mode = 'rooms';
  }

  // Page-spezifische Layout-Regeln
  nwViewState.cardSizeOverride = page.cardSize || 'auto';
  nwViewState.sortBy = page.sortBy || 'order';
  nwViewState.groupByType = !!page.groupByType;

  // In verschachtelter Navigation: Eltern automatisch aufklappen
  nwEnsureAncestorsExpanded(page.id);

  nwUpdatePageTitle();
  nwRenderSidebarNav();
  nwApplyFiltersAndRender();
}
/**
 * Code-Teil: nwLoadSmartHomeConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwLoadSmartHomeConfig() {
  try {
    const data = await fetch('/api/smarthome/layout', { cache: 'no-store' }).then(r => r.json());
    // Das Lesemodell liefert Räume/Etagen/Seiten ohne technische DP-Zuordnung.
    const cfg = (data && typeof data === 'object' && data.ok && data.config) ? data.config : data;
    nwShConfig = cfg && typeof cfg === 'object' ? cfg : null;
  } catch (_e) {
    nwShConfig = null;
  }

  nwBuildMetaFromConfig(nwShConfig);
  nwPageState.pages = nwGetPagesFromConfig(nwShConfig);

  // Restore active page
  let wanted = null;
  try { wanted = localStorage.getItem(NW_SH_ACTIVE_PAGE_LS_KEY); } catch (_e) {}
  if (wanted && nwPageState.pages.some(p => p.id === wanted)) {
    nwPageState.activeId = wanted;
  } else {
    nwPageState.activeId = nwPageState.pages[0] ? nwPageState.pages[0].id : null;
  }

  nwInitSidebarUi();
  nwUpdatePageTitle();
  nwRenderSidebarNav();

  // Apply initial page filters (without forcing a device reload)
  if (nwPageState.activeId) {
    const p = nwPageState.pages.find(x => x.id === nwPageState.activeId);
    if (p) {
      const eff0 = nwResolvePageFilters(p);
      nwFilterState.page.roomIds = Array.isArray(eff0.roomIds) ? eff0.roomIds.slice() : [];
      nwFilterState.page.funcIds = Array.isArray(eff0.funcIds) ? eff0.funcIds.slice() : [];
      nwFilterState.page.types = Array.isArray(eff0.types) ? eff0.types.slice() : [];
      nwFilterState.page.favoritesOnly = !!eff0.favoritesOnly;
      if (p.viewMode === 'rooms' || p.viewMode === 'functions') {
        nwViewState.mode = p.viewMode;
      } else {
        nwViewState.mode = 'rooms';
      }

      // Page-spezifische Layout-Regeln
      nwViewState.cardSizeOverride = p.cardSize || 'auto';
      nwViewState.sortBy = p.sortBy || 'order';
      nwViewState.groupByType = !!p.groupByType;

      // In verschachtelter Navigation: Eltern automatisch aufklappen
      nwEnsureAncestorsExpanded(p.id);
    }
  }
}
/**
 * Code-Teil: nwGetDeviceRoomId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetDeviceRoomId(dev) {
  const id = nwNormalizeId(dev && dev.roomId);
  if (id) return id;
  const name = nwNormalizeId(dev && dev.room);
  return nwShMeta.roomIdByName[name] || '';
}
/**
 * Code-Teil: nwGetDeviceFloorId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetDeviceFloorId(dev) {
  const direct = nwNormalizeId(dev && dev.floorId);
  if (direct) return direct;

  const rid = nwGetDeviceRoomId(dev);
  if (!rid) return '';
  const rm = nwShMeta && nwShMeta.roomsById ? nwShMeta.roomsById[rid] : null;
  return rm && rm.floorId ? nwNormalizeId(rm.floorId) : '';
}
/**
 * Code-Teil: nwGetDeviceFuncId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetDeviceFuncId(dev) {
  const id = nwNormalizeId(dev && dev.functionId);
  if (id) return id;
  const name = nwNormalizeId(dev && dev.function);
  return nwShMeta.funcIdByName[name] || '';
}
/**
 * Code-Teil: nwApplyPageFilters
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwApplyPageFilters(devices) {
  let out = devices.slice();
  const p = nwFilterState.page || {};

  if (p.favoritesOnly) {
    out = out.filter(d => nwIsFavorite(d));
  }

  // Floor pages show everything inside a floor, including floor-level devices.
  const activePage = (nwPageState.pages || []).find(x => x && x.id === nwPageState.activeId) || null;
  if (activePage && nwIsFloorPage(activePage)) {
    const fid = nwGetFloorIdFromPage(activePage);
    out = out.filter(d => nwGetDeviceFloorId(d) === fid);
  } else if (Array.isArray(p.roomIds) && p.roomIds.length) {
    const set = new Set(p.roomIds.map(nwNormalizeId));
    out = out.filter(d => set.has(nwGetDeviceRoomId(d)));
  }

  if (Array.isArray(p.funcIds) && p.funcIds.length) {
    const set = new Set(p.funcIds.map(nwNormalizeId));
    out = out.filter(d => set.has(nwGetDeviceFuncId(d)));
  }

  if (Array.isArray(p.types) && p.types.length) {
    const set = new Set(p.types.map(nwNormalizeId));
    out = out.filter(d => set.has(nwNormalizeId(d && d.type)));
  }

  return out;
}
/**
 * Code-Teil: nwApplyFiltersAndRender
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwApplyFiltersAndRender() {
  const activePage = (nwPageState.pages || []).find(p => p && p.id === nwPageState.activeId) || null;

  // 1) Apply base filters from the active page
  const base = nwApplyPageFilters(nwAllDevices);
  // 2) Apply user filters (favorites + function chip)
  const filtered = nwApplyFilters(base);

  // Home uses its own overview layout (floors + favorites). No chip UI here.
  if (nwIsHomePage(activePage)) {
    if (!nwAllDevices.length) {
      nwShowEmptyState(true, { enabled: nwSmartHomeEnabled, reason: 'empty' });
      return;
    }
    nwShowEmptyState(false);
    nwRenderHome(nwAllDevices);
    return;
  }

  // chips based on the base list (page preset), so chips stay relevant in the current section
  if (nwShFiltersUiEnabled) {
    nwRenderViewChips();
    nwRenderFunctionChips(base);
    nwRenderTextSizeChips();
  }

  if (!filtered.length) {
    if (!nwAllDevices.length) {
      nwShowEmptyState(true, { enabled: nwSmartHomeEnabled, reason: 'empty' });
    } else {
      nwShowEmptyState(true, { reason: 'filtered' });
    }
    return;
  }

  nwShowEmptyState(false);
  if (nwShFiltersUiEnabled && nwViewState.mode === 'functions') nwRenderFunctions(filtered);
  else nwRenderRooms(filtered);
}

// ---------- Auto refresh + bootstrap ----------
/**
 * Code-Teil: nwReloadDevices
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwReloadDevices(opts) {
  if (nwReloadInFlight) return;
  nwReloadInFlight = true;
  try {
    const devices = await nwFetchDevices();
    const arr = Array.isArray(devices) ? devices : [];
    const sig = JSON.stringify(arr) + '|' + String(nwSmartHomeEnabled);
    const force = !!(opts && opts.force);

    if (!force && sig === nwLastDevicesSignature) return;

    nwLastDevicesSignature = sig;
    nwAllDevices = arr;

    // Sidebar Badges/Counts aktualisieren
    nwRenderSidebarNav();
    nwApplyFiltersAndRender();
  } catch (e) {
    console.error('SmartHome reload error:', e);
    nwShowEmptyState(true, { enabled: nwSmartHomeEnabled, reason: 'load-error' });
    const empty = document.getElementById('nw-smarthome-empty');
    if (empty) {
      empty.innerHTML = [
        '⚠️ <b>SmartHome-Daten konnten nicht geladen werden.</b><br/>',
        '<span style="opacity:0.85">Bitte Verbindung/API prüfen und die Seite neu laden.</span>'
      ].join('');
    }
  } finally {
    nwReloadInFlight = false;
  }
}

function nwRefreshDevicesSoon(delayMs = 150) {
  const delay = Math.max(0, Number(delayMs) || 0);
  if (nwRefreshDevicesTimer) {
    try { clearTimeout(nwRefreshDevicesTimer); } catch (_e) {}
  }
  nwRefreshDevicesTimer = setTimeout(() => {
    nwRefreshDevicesTimer = null;
    nwReloadDevices({ force: true }).catch((error) => {
      console.warn('SmartHome delayed refresh failed:', error);
    });
  }, delay);
}

/**
 * Code-Teil: nwStartAutoRefresh
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwStartAutoRefresh(intervalMs) {
  const ms = (typeof intervalMs === 'number' && intervalMs > 1000) ? intervalMs : 5000;
  if (nwAutoRefreshTimer) return;
  nwAutoRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    nwReloadDevices();
  }, ms);
}
/**
 * Code-Teil: nwStopAutoRefresh
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwStopAutoRefresh() {
  if (!nwAutoRefreshTimer) return;
  try { clearInterval(nwAutoRefreshTimer); } catch (_e) {}
  nwAutoRefreshTimer = null;
}
/**
 * Code-Teil: nwInitMenu
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwInitMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('menuDropdown');
  if (menuBtn && menu) {
    if (menuBtn.dataset.nwMenuBound) return;
    // 0.8.21: SmartHome bindet das Burger-Menü nur einmal. Der gemeinsame Guard
    // verhindert einen zweiten Shell-Handler und schützt die mobile Navigation.
    menuBtn.dataset.nwMenuBound = 'smarthome';
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
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const close = () => menu.classList.add('hidden');
    /**
     * Code-Teil: toggle
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const toggle = () => menu.classList.toggle('hidden');
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menuBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    menuBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an menu. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    menu.addEventListener('click', (e) => e.stopPropagation());
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('click', (e) => { const target = e && e.target; if (!menuBtn.contains(target) && !menu.contains(target)) close(); });
  }
}
/**
 * Code-Teil: nwLoadUiConfigFlags
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwLoadUiConfigFlags() {
  try {
    const cfg = await fetch('/config', { cache: 'no-store' }).then(r => r.json());

    const sc = (cfg && cfg.settingsConfig) || {};
    const evcsAvailable = ((Number(sc.evcsConfiguredCount || 0) || (Array.isArray(sc.evcsList) ? sc.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
    nwEvcsCount = evcsAvailable ? Math.max(0, Math.round(Number(sc.evcsCount) || 0)) : 0;
    nwSmartHomeEnabled = !!(cfg.featureVisibility && cfg.featureVisibility.hasSmartHome === true);
    const storageFarmEnabled = !!(cfg.featureVisibility && cfg.featureVisibility.hasStorageFarm === true);

    // EVCS visibility
    const showEvcs = evcsAvailable && nwEvcsCount >= 2;
    const l = document.getElementById('menuEvcsLink');
    if (l) l.classList.toggle('hidden', !showEvcs);
    const t = document.getElementById('tabEvcs');
    if (t) t.classList.toggle('hidden', !showEvcs);

    // SmartHome menu item
    const sl = document.getElementById('menuSmartHomeLink');
    if (sl) sl.classList.toggle('hidden', !nwSmartHomeEnabled);
    const sfMenu = document.getElementById('menuStorageFarmLink');
    if (sfMenu) sfMenu.classList.toggle('hidden', !storageFarmEnabled);
    const sfTab = document.getElementById('tabStorageFarm');
    if (sfTab) sfTab.classList.toggle('hidden', !storageFarmEnabled);
  } catch (_e) {
    // ignore
  }
}
/**
 * Code-Teil: nwBootstrap
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von SmartHome: Räume, Geräte, Kacheln, Popover; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwBootstrap() {
  nwInitMenu();

  // Detect if the filter UI exists in the DOM. If not, we intentionally run in "clean" mode.
  // (No chips, always rooms view, no hidden/remembered user filters.)
  nwShFiltersUiEnabled = !!(
    document.getElementById('nw-filter-view') ||
    document.getElementById('nw-filter-functions') ||
    document.getElementById('nw-filter-textsize')
  );

  // UI‑Prefs (persistiert pro Browser)
  if (nwShFiltersUiEnabled) {
    nwViewState.mode = nwLoadViewMode(nwViewState.mode);
    nwTextSizeState.size = nwLoadTextSize(nwTextSizeState.size);
    nwApplyTextSizeClass(nwTextSizeState.size);
    nwFilterState.favoritesFirst = nwLoadBoolLS(NW_SH_FAVORITES_FIRST_LS_KEY, NW_SH_FAVORITES_FIRST_DEFAULT);
  } else {
    // Clean mode: do not apply remembered chip settings (otherwise user can get "stuck" in filters)
    nwViewState.mode = 'rooms';
    nwTextSizeState.size = 'normal';
    nwApplyTextSizeClass(nwTextSizeState.size);
    nwFilterState.favoritesFirst = false;
    try {
      localStorage.removeItem(NW_SH_VIEW_MODE_LS_KEY);
      localStorage.removeItem(NW_SH_TEXT_SIZE_LS_KEY);
      localStorage.removeItem(NW_SH_FAVORITES_FIRST_LS_KEY);
    } catch (_e) {}
  }
  nwFavoriteOverrides = nwLoadFavoriteOverrides();

  // SmartHome Konfiguration (Räume/Funktionen/Seiten) + Sidebar Navigation
  await nwLoadSmartHomeConfig();
  await nwLoadUiConfigFlags();

  // The views container starts hidden in HTML (avoid a blank SmartHome screen)
  try {
    const viewsEl = document.getElementById('nwSmarthomeViews');
    if (viewsEl) viewsEl.classList.remove('nw-hidden');
  } catch (_e) {
    // ignore
  }

  await nwReloadDevices({ force: true });
  nwStartAutoRefresh(5000);

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'visibilitychange' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      nwStopAutoRefresh();
      return;
    }
    nwLoadUiConfigFlags().then(() => {
      nwReloadDevices({ force: true });
      nwStartAutoRefresh(5000);
    });
  });
}

// Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
document.addEventListener('DOMContentLoaded', nwBootstrap);
