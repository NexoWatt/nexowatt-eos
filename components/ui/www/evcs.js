/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/evcs.ts
 * Quell-Hash: sha256:771c6b562da6780d0dfdf471bd971c720894a932a9b3ea3ddce062791e56a17e
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/evcs.js.
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
 * Aufgabe: Verbindet Ladepunkt-Anzeige, Moduswahl und Kundenvorgaben mit den freigegebenen Lade-APIs.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/evcs.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/evcs.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/evcs.js`.
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
 * Datei: www/evcs.js
 * Rolle im Projekt: EVCS-Frontend.
 * Zweck: Zeigt Ladepunkte, Lademodi und EV-Zielladeinformationen.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: EVCS-Kundenansicht: zeigt Ladepunkte, Modi, Leistung, Ziel-/RFID-Informationen und einfache Bedienung.
 * Zusammenhänge:
 * - Hängt an chargingManagement.* States und /api/ems/charging/diagnostics.
 * - Sichtbarkeit wird über die Installer-Konfiguration gesteuert.
 * Wartungshinweise:
 * - Bei Anlagen ohne Wallbox darf diese Ansicht im Kundenfrontend nicht prominent erscheinen.
 */

/**
 * NexoWatt UI – EVCS Seite
 * Ziel: skalierbar bis 50 Ladepunkte, Übersicht als Kacheln, Details/Bedienung im Tooltip-Dialog.
 */

let state = {};
let cfg = null;
let _renderScheduled = false;
let _renderTimer = null;
let _lastRenderTs = 0;
// EVCS can have up to 50 Ladepunkte; avoid re-rendering the whole grid on every tiny update.
const _RENDER_MIN_INTERVAL_MS = 120;

// UI reliability: keep optimistic user actions stable while SSE updates stream in.
const _pendingWrites = Object.create(null); // key -> { value: string, expires: number }
/**
 * Code-Teil: _setPendingWrite
 * Zweck: Schreibt interne States oder veröffentlichte Runtime-Werte.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _setPendingWrite(key, value, ttlMs = 1500) {
  try {
    _pendingWrites[String(key)] = { value: String(value), expires: Date.now() + ttlMs };
  } catch (_e) {}
}
/**
 * Code-Teil: _clearPendingWrite
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _clearPendingWrite(key, expectedValue) {
  try {
    const k = String(key);
    const p = _pendingWrites[k];
    if (!p) return;
    if (expectedValue === undefined || expectedValue === null) {
      delete _pendingWrites[k];
      return;
    }
    if (String(p.value) === String(expectedValue)) delete _pendingWrites[k];
  } catch (_e) {}
}
/**
 * Code-Teil: _mergeUpdatePayload
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _mergeUpdatePayload(payload) {
  const now = Date.now();
  const merged = Object.assign({}, state);

  for (const [k, v] of Object.entries(payload || {})) {
    const pend = _pendingWrites[k];

    if (pend && pend.expires > now) {
      const incomingVal = (v && typeof v === 'object' && 'value' in v) ? String(v.value) : String(v);
      if (incomingVal !== pend.value) {
        // Ignore transient snap-back while we wait for confirmation.
        continue;
      }
      delete _pendingWrites[k];
    } else if (pend && pend.expires <= now) {
      delete _pendingWrites[k];
    }

    merged[k] = v;
  }

  state = merged;
}
/**
 * Code-Teil: _isEvcsRelevantPayload
 * Zweck: Verarbeitet Wallbox-/Ladepunktdaten und Feature-Sichtbarkeit.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _isEvcsRelevantPayload(payload) {
  try {
    for (const k of Object.keys(payload || {})) {
      if (k.startsWith('evcs.') || k.startsWith('chargingManagement.')) return true;
    }
  } catch (_e) {}
  return false;
}
/**
 * Code-Teil: scheduleRender
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function scheduleRender() {
  if (_renderScheduled) return;
  _renderScheduled = true;

  const now = Date.now();
  const wait = Math.max(0, _RENDER_MIN_INTERVAL_MS - (now - _lastRenderTs));

  if (_renderTimer) {
    try { clearTimeout(_renderTimer); } catch (_e) {}
    _renderTimer = null;
  }

  _renderTimer = setTimeout(() => {
    _renderScheduled = false;
    _lastRenderTs = Date.now();
    try { render(); } catch (_e) {}
  }, wait);
}
/**
 * Code-Teil: d
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function d(key) {
  try {
    return (state && Object.prototype.hasOwnProperty.call(state, key)) ? state[key].value : undefined;
  } catch (_e) {
    return undefined;
  }
}
/**
 * Code-Teil: fmtW
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function fmtW(w) {
  if (w == null || isNaN(w)) return '--';
  const v = Number(w);
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(2) + ' kW';
  return Math.round(v) + ' W';
}
/**
 * Code-Teil: fmtPct
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function fmtPct(v) {
  const n = Number(v);
  if (!isFinite(n)) return '--';
  return Math.round(n) + ' %';
}
/**
 * Code-Teil: fmtKwh
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function fmtKwh(v) {
  if (v == null || isNaN(v)) return '--';
  return Number(v).toFixed(2) + ' kWh';
}
/**
 * Code-Teil: fmtMin
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function fmtMin(v) {
  const n = Number(v);
  if (!isFinite(n)) return '--';
  if (n <= 0) return '0 min';
  return Math.round(n) + ' min';
}
/**
 * Code-Teil: fmtClock
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function fmtClock(ts) {
  const n = Number(ts);
  if (!isFinite(n) || n <= 0) return '';
  try {
    const dt = new Date(n);
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch (_e) {
    return '';
  }
}
/**
 * Code-Teil: nextTsFromTimeInput
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nextTsFromTimeInput(hhmm) {
  const snapped = snapHhmmTo15Min(hhmm);
  const s = String(snapped ?? '').trim();
  if (!s || !/^\d{2}:\d{2}$/.test(s)) return 0;
  const parts = s.split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!isFinite(hh) || !isFinite(mm)) return 0;

  const now = new Date();
  const dt = new Date(now);
  dt.setHours(hh, mm, 0, 0);

  // If the selected time is in the past (or within 1 minute), schedule for the next day.
  if (dt.getTime() <= now.getTime() + 60000) dt.setDate(dt.getDate() + 1);
  return dt.getTime();
}

// Snap a HH:MM time string to a 15‑minute grid (00/15/30/45).
// Returns '' on invalid input.
/**
 * Code-Teil: snapHhmmTo15Min
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function snapHhmmTo15Min(hhmm) {
  const s = String(hhmm ?? '').trim();
  if (!s || !/^\d{2}:\d{2}$/.test(s)) return '';
  const parts = s.split(':');
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!isFinite(hh) || !isFinite(mm)) return '';

  const total = ((Math.max(0, Math.min(23, Math.round(hh))) * 60) + Math.max(0, Math.min(59, Math.round(mm))));
  let snapped = Math.round(total / 15) * 15;
  // wrap around 24:00 -> 00:00
  snapped = ((snapped % 1440) + 1440) % 1440;

  const sh = Math.floor(snapped / 60);
  const sm = snapped % 60;
  return String(sh).padStart(2, '0') + ':' + String(sm).padStart(2, '0');
}
/**
 * Code-Teil: esc
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Keep adapter-safe id formatting in sync with EMS module (toSafeIdPart)
/**
 * Code-Teil: safeIdPart
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function safeIdPart(input) {
  const s = String(input ?? '').trim();
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}
/**
 * Code-Teil: rfidLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function rfidLabel(i) {
  const enabled = d('evcs.rfid.enabled');
  const reason = d(`evcs.${i}.rfidReason`);
  const user = d(`evcs.${i}.rfidUser`);
  const last = d(`evcs.${i}.rfidLast`);
  const enforced = d(`evcs.${i}.rfidEnforced`);
  const authorized = d(`evcs.${i}.rfidAuthorized`);

  const titleParts = [];
  if (last) titleParts.push('RFID: ' + last);
  if (enforced === false) titleParts.push('Hinweis: Keine Sperr-/Freigabe-DPs konfiguriert');

  if (enabled === false) {
    return { text: 'Aus', cls: 'off', title: titleParts.join(' • ') };
  }

  if (reason === 'no_rfid_dp') return { text: 'Kein RFID-DP', cls: 'warn', title: titleParts.join(' • ') };
  if (reason === 'no_card') return { text: 'Warte auf Karte', cls: 'wait', title: titleParts.join(' • ') };
  if (reason === 'whitelisted') return { text: 'Freigegeben' + (user ? (': ' + user) : ''), cls: 'ok', title: titleParts.join(' • ') };
  if (reason === 'not_whitelisted') return { text: 'Gesperrt' + (user ? (': ' + user) : ''), cls: 'lock', title: titleParts.join(' • ') };
  if (reason === 'rfid_disabled') return { text: 'Aus', cls: 'off', title: titleParts.join(' • ') };

  if (authorized === true) return { text: 'Freigegeben' + (user ? (': ' + user) : ''), cls: 'ok', title: titleParts.join(' • ') };
  if (authorized === false) return { text: 'Gesperrt', cls: 'lock', title: titleParts.join(' • ') };

  if (enabled == null) return null;
  return { text: '--', cls: 'muted', title: titleParts.join(' • ') };
}
/**
 * Code-Teil: reasonHint
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function reasonHint(reason, applyStatus) {
  const r = String(reason ?? '').trim().toUpperCase();
  const a = String(applyStatus ?? '').trim().toLowerCase();

  // Do not spam the UI for normal states
  if (!r && !a) return null;
  if (r === 'OK' || r === 'ALLOCATED' || r === 'UNLIMITED') return null;

  // Apply-layer errors (DP write)
  if (a === 'no_dp_registry') return { level: 'err', text: 'Steuerung nicht möglich: Datenpunkt-Registry nicht bereit.' };
  if (a === 'write_failed') return { level: 'err', text: 'Steuerung fehlgeschlagen: Schreiben auf Setpoint nicht möglich.' };
  if (a === 'control_disabled' && !r) return { level: 'warn', text: 'Steuerung deaktiviert.' };

  // Canonical EMS reasons (German)
  if (r === 'NO_SETPOINT') return { level: 'err', text: 'Steuerung nicht möglich: Setpoint (A oder W) fehlt.' };
  if (r === 'OFFLINE') return { level: 'warn', text: 'Ladepunkt offline.' };
  if (r === 'CONTROL_DISABLED') return { level: 'warn', text: 'Regelung deaktiviert.' };
  if (r === 'DISABLED') return { level: 'warn', text: 'Ladepunkt deaktiviert.' };
  if (r === 'STALE_METER') return { level: 'warn', text: 'Messwerte zu alt (Failsafe).' };
  if (r === 'PAUSED_BY_PEAK_SHAVING') return { level: 'warn', text: 'Lastspitzenkappung aktiv.' };

  if (r === 'LIMITED_BY_GRID_IMPORT') return { level: 'info', text: 'Begrenzt durch Netzanschluss (Import-Limit).' };
  if (r === 'LIMITED_BY_PHASE_CAP') return { level: 'info', text: 'Begrenzt durch Phasen-/Strom-Limit.' };
  if (r === 'LIMITED_BY_BUDGET') return { level: 'info', text: 'Begrenzt durch Leistungsbudget.' };
  if (r === 'NO_PV_SURPLUS') return { level: 'info', text: 'Kein PV-Überschuss verfügbar.' };
  if (r === 'BELOW_MIN') return { level: 'info', text: 'Unter Mindestleistung – Ladepunkt pausiert.' };

  if (r === 'NO_VEHICLE') return { level: 'info', text: 'Kein Fahrzeug verbunden – Sollwert wird auf 0 gesetzt.' };

  if (r === 'BOOST_TIMEOUT') return { level: 'info', text: 'Boost beendet (Timeout).' };
  if (r === 'BOOST_NOT_ALLOWED') return { level: 'warn', text: 'Boost für diesen Ladepunkt nicht erlaubt.' };

  // Fallback
  if (r) return { level: 'info', text: 'Status: ' + r };
  return null;
}

// --- EMS mode mapping (runtime): auto | boost | minpv | pv -------------------
/**
 * Code-Teil: emsModeToUi
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function emsModeToUi(mode) {
  const s = String(mode ?? '').trim().toLowerCase();
  if (s === 'boost') return 2;
  if (s === 'minpv' || s === 'min+pv') return 3;
  if (s === 'pv') return 4;
  return 1; // auto
}
/**
 * Code-Teil: clampEmsUi
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clampEmsUi(v) {
  const n = Number(v);
  if (!isFinite(n)) return 1;
  return Math.max(1, Math.min(4, Math.round(n)));
}

function normalizeEvcsPhaseMode(raw) {
  const compact = String(raw ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (compact === 'autopv' || compact === 'pvauto' || compact === 'auto13' || compact === 'auto1p3p' || compact === 'auto') return 'auto-pv';
  if (compact === 'fixed1p' || compact === '1p' || compact === 'onephase' || compact === 'fixed1') return 'fixed-1p';
  if (compact === 'fixed3p' || compact === '3p' || compact === 'threephase' || compact === 'fixed3') return 'fixed-3p';
  return 'auto-pv';
}

function phaseModeLabel(mode) {
  const m = normalizeEvcsPhaseMode(mode);
  if (m === 'fixed-1p') return 'Fest 1p';
  if (m === 'fixed-3p') return 'Fest 3p';
  return 'Auto PV';
}

// Legacy (direct DP) mode mapping
/**
 * Code-Teil: clampUiMode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function clampUiMode(v) {
  const n = Number(v);
  if (!isFinite(n)) return 1;
  return Math.max(1, Math.min(3, Math.round(n)));
}

// --- Runtime vars ------------------------------------------------------------
let _boostQueueRank = {};
let _evcsCount = 1;
let _evcsMeta = [];

function evcsMetaRow(index) {
  const meta = Array.isArray(_evcsMeta) ? _evcsMeta : [];
  return meta[Math.max(0, Math.round(Number(index) || 1) - 1)] || {};
}

function evcsPhaseSwitchDpAssigned(index) {
  const row = evcsMetaRow(index);
  return !!String((row && (row.phaseSwitchId || row.phaseSwitchKey || row.phaseModeWriteId)) || '').trim();
}

function evcsStorageAssistCustomerAllowed(index) {
  const row = evcsMetaRow(index);
  return !!(row && row.storageAssistCustomerAllowed === true);
}

function evcsGlobalStorageAssistCustomerAllowed() {
  const sc = cfg && cfg.settingsConfig && typeof cfg.settingsConfig === 'object' ? cfg.settingsConfig : {};
  return sc.evcsGlobalStorageAssistCustomerAllowed === true && evcsGlobalStorageAssistIndices().length >= 2;
}

function evcsGlobalStorageAssistIndices() {
  const rows = Array.isArray(_evcsMeta) ? _evcsMeta : [];
  const out = [];
  for (let index = 1; index <= _evcsCount; index += 1) {
    const row = rows[index - 1] || {};
    if (row.enabled === false) continue;
    out.push(index);
  }
  return out;
}

function renderEvcsGlobalStorageAssistControl() {
  const wrap = document.getElementById('evcsGlobalStorageAssist');
  if (!wrap) return;
  const allowed = evcsGlobalStorageAssistCustomerAllowed();
  wrap.classList.toggle('hidden', !allowed);
  if (!allowed) return;

  const indices = evcsGlobalStorageAssistIndices();
  const values = indices.map((index) => !!d(`chargingManagement.wallboxes.lp${index}.userStorageAssistEnabled`));
  const allEnabled = values.length > 0 && values.every(Boolean);
  const allProtected = values.length === 0 || values.every((value) => !value);
  const mixed = !allEnabled && !allProtected;
  wrap.querySelectorAll('button[data-global-storage-assist]').forEach((button) => {
    const enabled = String(button.getAttribute('data-global-storage-assist')) === 'true';
    button.classList.toggle('active', !mixed && (enabled ? allEnabled : allProtected));
    button.classList.toggle('nw-evcs-mixed', mixed);
  });
  const hint = document.getElementById('evcsGlobalStorageAssistHint');
  if (hint) {
    hint.textContent = mixed
      ? `Uneinheitlicher Altstand bei ${indices.length} Ladepunkten – bitte zentral neu wählen.`
      : `${indices.length} aktive Ladepunkte · ${allEnabled ? 'Speicher-Mitnutzung freigegeben' : 'Speicher geschützt'}`;
  }
}

function storageAssistLabel(enabled) {
  return enabled ? 'Speicher mitnutzen' : 'Speicher schützen';
}

function evcsConfiguredPhaseMode(index, fallbackPhases) {
  const row = evcsMetaRow(index);
  const raw = row && row.phaseMode;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') return normalizeEvcsPhaseMode(raw);
  return Number(fallbackPhases) === 1 ? 'fixed-1p' : 'fixed-3p';
}

// Modal state
let _modalOpenIdx = 0;
let _modalLocked = false;
let _modalInteractionUntil = 0;
let _modalRerenderTimer = null;
/**
 * Code-Teil: _touchModalInteraction
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _touchModalInteraction(ttlMs = 900) {
  const t = Date.now() + ttlMs;
  if (t > _modalInteractionUntil) _modalInteractionUntil = t;
}
/**
 * Code-Teil: _scheduleModalRerenderRetry
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _scheduleModalRerenderRetry(delayMs) {
  // When the modal is "interaction-locked" we skip body re-rendering (to keep
  // native pickers stable). This helper makes sure the UI updates again once
  // the lock expires, without requiring the user to close & reopen the modal.
  try {
    if (_modalRerenderTimer) return;
    const ms = Math.max(120, Math.min(20000, Math.round(Number(delayMs) || 0)));
    _modalRerenderTimer = setTimeout(() => {
      _modalRerenderTimer = null;
      scheduleRender(true);
    }, ms);
  } catch (_e) {
    // ignore
  }
}
/**
 * Code-Teil: _isModalLocked
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _isModalLocked(modalEl) {
  const now = Date.now();

  // Explicit lock flags (timeout + focus tracking)
  //
  // IMPORTANT: `_modalLocked` must never stay TRUE forever.
  // In earlier hotfixes the flag was set on `focusin` and only cleared when focus left the modal.
  // That prevented the modal body from ever re-rendering while it was open (e.g. when enabling
  // Ziel‑Laden, the fields appeared only after closing/reopening).
  //
  // We therefore treat `_modalLocked` as *time‑based*: once the interaction window is over,
  // we automatically release the lock.
  if (_modalLocked && (now >= _modalInteractionUntil)) {
    _modalLocked = false;
  }

  if (_modalLocked || (now < _modalInteractionUntil)) return true;

  // Robust fallback: If the active element is inside the modal, we avoid re-rendering
  // the modal body. This prevents native pickers (type=time/date) from closing
  // due to DOM replacement.
  try {
    const ae = document.activeElement;
    if (modalEl && ae && modalEl.contains(ae)) {
      const tag = (ae.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
      // Also lock for any custom control that sets aria roles.
      const role = ae.getAttribute && ae.getAttribute('role');
      if (role === 'listbox' || role === 'combobox') return true;
    }
  } catch (_e) { /* ignore */ }

  return false;
}

// --- EVCS helpers ------------------------------------------------------------
/**
 * Code-Teil: _hasEms
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _hasEms() {
  return !!((cfg && cfg.ems && cfg.ems.chargingEnabled) || d('chargingManagement.wallboxCount') != null);
}
/**
 * Code-Teil: _computeBoostQueueRank
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _computeBoostQueueRank(count) {
  const boostQueueRank = {};
  try {
    const boostArr = [];
    for (let i = 1; i <= count; i++) {
      const base = `chargingManagement.wallboxes.lp${i}`;
      const eff = String(d(`${base}.effectiveMode`) ?? '').trim().toLowerCase();
      const um = String(d(`${base}.userMode`) ?? '').trim().toLowerCase();
      const isBoost = (eff === 'boost') || (um === 'boost');
      if (!isBoost) continue;

      const charging = !!d(`${base}.charging`);
      const since = Number(d(`${base}.chargingSince`) || 0);
      boostArr.push({ i, charging, since: (isFinite(since) && since > 0) ? since : 0 });
    }

    boostArr.sort((a, b) => {
      if (!!a.charging !== !!b.charging) return (a.charging ? -1 : 1);
      const as = (a.since && a.since > 0) ? a.since : Number.POSITIVE_INFINITY;
      const bs = (b.since && b.since > 0) ? b.since : Number.POSITIVE_INFINITY;
      if (as !== bs) return as - bs;
      return a.i - b.i;
    });

    for (let k = 0; k < boostArr.length; k++) boostQueueRank[boostArr[k].i] = k + 1;
  } catch (_e) {}
  return boostQueueRank;
}
/**
 * Code-Teil: _modeBadge
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _modeBadge(emsUserMode) {
  const m = String(emsUserMode ?? '').trim().toLowerCase();
  if (m === 'boost') return 'BOOST';
  if (m === 'minpv' || m === 'min+pv') return 'MIN+PV';
  if (m === 'pv') return 'PV';
  if (m === 'auto') return 'AUTO';
  return '';
}
/**
 * Code-Teil: _tileStateClass
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function _evcsBoolOrNull(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['true', '1', 'on', 'yes', 'ja', 'online', 'connected', 'available', 'reachable', 'ready'].includes(s)) return true;
  if (['false', '0', 'off', 'no', 'nein', 'offline', 'disconnected', 'unreachable'].includes(s)) return false;
  // Faulted/Unavailable sind Betriebszustände, keine belastbaren Online-Werte.
  return null;
}

/** Liefert ausschließlich die vom EMS bestätigte Connector-Wahrheit für die UI. */
function _resolveEvcsDisplayStatus({
  hasEms = false,
  rawStatus = '',
  effectiveStatus = '',
  statusClass = '',
  statusFresh = false,
  statusIgnoredReason = '',
  faultActive = false,
  unavailableActive = false,
  online = null,
  reason = '',
} = {}) {
  const onlineState = _evcsBoolOrNull(online);
  const r = String(reason ?? '').trim().toUpperCase();
  const cls = String(statusClass ?? '').trim().toLowerCase();
  const raw = String(rawStatus ?? '').trim();
  const effective = String(effectiveStatus ?? '').trim();
  const ignored = String(statusIgnoredReason ?? '').trim();

  if (onlineState === false || r === 'OFFLINE' || cls === 'offline') {
    return { text: 'Offline', status: 'offline', confirmed: true, diagnostic: raw };
  }
  if (faultActive === true || r === 'FAULTED' || cls === 'faulted') {
    return { text: effective || 'Störung', status: 'faulted', confirmed: true, diagnostic: raw };
  }
  if (unavailableActive === true || r === 'UNAVAILABLE' || cls === 'unavailable') {
    return { text: effective || 'Nicht verfügbar', status: 'unavailable', confirmed: true, diagnostic: raw };
  }
  if (hasEms) {
    if (statusFresh === true && effective) {
      return { text: effective, status: cls || 'status', confirmed: true, diagnostic: raw };
    }
    if (raw && (ignored || cls === 'stale' || cls.startsWith('ignored-'))) {
      return {
        text: cls === 'stale' ? 'Status veraltet' : 'Status nicht bestätigt',
        status: 'unconfirmed',
        confirmed: false,
        diagnostic: raw,
      };
    }
    if (r === 'DISABLED') return { text: 'Deaktiviert', status: 'disabled', confirmed: true, diagnostic: raw };
    if (r === 'CONTROL_DISABLED') return { text: 'Regelung aus', status: 'disabled', confirmed: true, diagnostic: raw };
    if (r && r !== 'SKIPPED') return { text: r, status: 'status', confirmed: true, diagnostic: raw };
    return { text: '--', status: 'unknown', confirmed: false, diagnostic: raw };
  }
  return { text: raw || '--', status: raw ? raw.toLowerCase() : 'unknown', confirmed: !!raw, diagnostic: raw };
}

function _tileStateClass({ powerW, reason, regEnabled, online, statusClass, faultActive, unavailableActive }) {
  const p = Number(powerW);
  const r = String(reason ?? '').trim().toUpperCase();
  const cls = String(statusClass ?? '').trim().toLowerCase();
  const onlineState = _evcsBoolOrNull(online);

  // Faulted/Unavailable bedeutet erreichbar, aber betrieblich blockiert – nicht offline.
  if (onlineState === false || r === 'OFFLINE' || cls === 'offline') return 'nw-tile--state-disabled nw-tile--state-offline';
  if (faultActive === true || unavailableActive === true || r === 'FAULTED' || r === 'UNAVAILABLE' || cls === 'faulted' || cls === 'unavailable') return 'nw-tile--state-warning';
  if (r === 'NO_SETPOINT' || r === 'STALE_METER' || cls === 'stale' || cls.startsWith('ignored-')) return 'nw-tile--state-warning';
  if (regEnabled === false) return 'nw-tile--state-disabled';
  if (isFinite(p) && Math.abs(p) >= 80) return 'nw-tile--state-on';
  return 'nw-tile--state-off';
}

function _shortStatusText(statusInfo, reason, online) {
  const info = statusInfo && typeof statusInfo === 'object'
    ? statusInfo
    : _resolveEvcsDisplayStatus({ rawStatus: statusInfo, reason, online });
  return String(info.text || '--');
}


function _evcsStatusInfoForIndex(i, hasEms = _hasEms()) {
  const cm = `chargingManagement.wallboxes.lp${i}`;
  const localOnline = d(`evcs.${i}.online`);
  const emsOnline = hasEms ? d(`${cm}.online`) : null;
  const online = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;
  const rawStatus = hasEms
    ? String(d(`${cm}.statusRaw`) ?? '').trim()
    : String(d(`evcs.${i}.status`) ?? '').trim();
  return _resolveEvcsDisplayStatus({
    hasEms,
    rawStatus: rawStatus || String(d(`evcs.${i}.status`) ?? '').trim(),
    effectiveStatus: hasEms ? String(d(`${cm}.statusEffective`) ?? '').trim() : '',
    statusClass: hasEms ? String(d(`${cm}.statusClass`) ?? '').trim() : '',
    statusFresh: hasEms ? _evcsBoolOrNull(d(`${cm}.statusFresh`)) === true : !!rawStatus,
    statusIgnoredReason: hasEms ? String(d(`${cm}.statusIgnoredReason`) ?? '').trim() : '',
    faultActive: hasEms ? _evcsBoolOrNull(d(`${cm}.faultActive`)) === true : false,
    unavailableActive: hasEms ? _evcsBoolOrNull(d(`${cm}.unavailableActive`)) === true : false,
    online,
    reason: hasEms ? d(`${cm}.reason`) : '',
  });
}

// --- Modal -------------------------------------------------------------------
/**
 * Code-Teil: openEvcsModal
 * Zweck: Öffnet Dialoge/Seiten/Popovers.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function openEvcsModal(idx) {
  const i = Number(idx);
  if (!Number.isFinite(i) || i <= 0) return;

  const modal = document.getElementById('evcsModal');
  const body = document.getElementById('evcsModalBody');
  const title = document.getElementById('evcsModalTitle');
  const sub = document.getElementById('evcsModalSubTitle');
  if (!modal || !body || !title) return;

  _modalOpenIdx = i;
  _modalLocked = false;
  _touchModalInteraction(600);

  const m = _evcsMeta[i - 1] || {};
  const name = m.name || ('Ladepunkt ' + i);

  const p = d(`evcs.${i}.powerW`);
  const soc = d(`evcs.${i}.vehicleSoc`);
  const statusInfo = _evcsStatusInfoForIndex(i, _hasEms());

  title.textContent = name;
  if (sub) {
    const parts = [];
    parts.push('Leistung: ' + fmtW(p));
    if (soc != null) parts.push('SoC: ' + fmtPct(soc));
    if (statusInfo && statusInfo.text && statusInfo.text !== '--') parts.push(String(statusInfo.text));
    sub.textContent = parts.join(' • ');
  }

  body.innerHTML = buildEvcsModalBodyHtml(i);

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  // Focus close button for keyboard navigation
  try { document.getElementById('evcsModalClose')?.focus(); } catch (_e) {}
}
/**
 * Code-Teil: closeEvcsModal
 * Zweck: Schließt Dialoge/Seiten/Popovers.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function closeEvcsModal() {
  const modal = document.getElementById('evcsModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  _modalOpenIdx = 0;
  _modalLocked = false;
  _modalInteractionUntil = 0;
  try {
    if (_modalRerenderTimer) {
      clearTimeout(_modalRerenderTimer);
      _modalRerenderTimer = null;
    }
  } catch (_e) {}
}
/**
 * Code-Teil: buildEvcsModalBodyHtml
 * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function buildEvcsModalBodyHtml(i) {
  const count = Math.max(0, Math.round(Number(_evcsCount) || 0));
  const meta = Array.isArray(_evcsMeta) ? _evcsMeta : [];
  const m = meta[i - 1] || {};

  const name = m.name || ('Ladepunkt ' + i);
  const note = m.note || '';

  const hasEms = _hasEms();
  const cm = `chargingManagement.wallboxes.lp${i}`;
  const emsStationEnabledRaw = hasEms ? d(`${cm}.userStationEnabled`) : null;
  const stationEnabled = hasEms
    ? (_evcsBoolOrNull(emsStationEnabledRaw) ?? true)
    : (_evcsBoolOrNull(d(`evcs.${i}.active`)) ?? false);
  const canActive = hasEms || !!m.activeId;

  const emsUserMode = d(`${cm}.userMode`);
  const emsEffectiveMode = d(`${cm}.effectiveMode`);
  const emsUserAutoSource = String(d(`${cm}.userAutoSource`) || 'standard').trim().toLowerCase() === 'strategy' ? 'strategy' : 'standard';
  const emsStrategyEligible = _evcsBoolOrNull(d(`${cm}.strategyEligible`)) === true;
  const emsStrategyActive = _evcsBoolOrNull(d(`${cm}.strategyActive`)) === true;
  const emsStrategyFallbackActive = _evcsBoolOrNull(d(`${cm}.strategyFallbackActive`)) === true;
  const emsStrategyStatus = String(d(`${cm}.strategyStatus`) || '').trim();
  const emsStrategyReason = String(d(`${cm}.strategyReason`) || '').trim();
  const emsStrategyRequestedPowerW = Number(d(`${cm}.strategyRequestedPowerW`) ?? 0);
  const emsChargerType = d(`${cm}.chargerType`);
  const emsTargetW = d(`${cm}.targetPowerW`);
  const emsStationKey = d(`${cm}.stationKey`);
  const emsStationMaxW = d(`${cm}.stationMaxPowerW`);
  const emsBoostActive = d(`${cm}.boostActive`);
  const emsBoostRemainingMin = d(`${cm}.boostRemainingMin`);
  const emsBoostUntil = d(`${cm}.boostUntil`);
  const emsBoostTimeoutMin = d(`${cm}.boostTimeoutMin`);
  const emsReason = d(`${cm}.reason`);
  const emsApplyStatus = d(`${cm}.applyStatus`);
  const emsAllowBoost = d(`${cm}.allowBoost`);
  const emsRegEnabled = d(`${cm}.userEnabled`);
  const emsPhaseUserMode = d(`${cm}.userPhaseMode`);
  const emsPhaseMode = d(`${cm}.phaseMode`);
  const emsPhaseSupported = d(`${cm}.phaseSwitchSupported`);
  const emsCurrentPhaseCount = Number(d(`${cm}.currentPhaseCount`) ?? 0);
  const emsTargetPhaseCount = Number(d(`${cm}.targetPhaseCount`) ?? 0);
  const emsPhaseSwitchState = String(d(`${cm}.phaseSwitchState`) || '');
  const emsPhaseSwitchReason = String(d(`${cm}.phaseSwitchReason`) || '');
  const emsPhaseCooldownMs = Number(d(`${cm}.phaseCooldownRemainingMs`) ?? 0);
  const emsStorageAssistCustomerAllowed = d(`${cm}.storageAssistCustomerAllowed`);
  const emsUserStorageAssistEnabled = d(`${cm}.userStorageAssistEnabled`);
  const emsEffectiveStorageAssist = d(`${cm}.effectiveStorageAssist`);
  const emsStorageAssistReason = String(d(`${cm}.storageAssistBlockedReason`) || '');
  const emsBatteryContributionW = Number(d(`${cm}.batteryContributionW`) ?? 0);
  const emsStatusRaw = String(d(`${cm}.statusRaw`) ?? '').trim();
  const emsStatusEffective = String(d(`${cm}.statusEffective`) ?? '').trim();
  const emsStatusClass = String(d(`${cm}.statusClass`) ?? '').trim();
  const emsStatusFresh = _evcsBoolOrNull(d(`${cm}.statusFresh`)) === true;
  const emsStatusIgnoredReason = String(d(`${cm}.statusIgnoredReason`) ?? '').trim();
  const emsStatusSourceId = String(d(`${cm}.statusSourceId`) ?? '').trim();
  const emsStatusAgeMs = Number(d(`${cm}.statusAgeMs`) ?? 0);
  const emsStatusStale = _evcsBoolOrNull(d(`${cm}.statusStale`)) === true;
  const emsFaultActive = _evcsBoolOrNull(d(`${cm}.faultActive`)) === true;
  const emsFaultReason = String(d(`${cm}.faultReason`) ?? '').trim();
  const emsUnavailableActive = _evcsBoolOrNull(d(`${cm}.unavailableActive`)) === true;
  const emsUnavailableReason = String(d(`${cm}.unavailableReason`) ?? '').trim();
  const emsOnline = d(`${cm}.online`);

  const regAvail = hasEms && (emsRegEnabled !== null && emsRegEnabled !== undefined);
  const regOn = regAvail ? !!emsRegEnabled : true;
  const regOff = regAvail && !regOn;

  // Zeit-Ziel Laden (Depot-/Deadline-Laden)
  const emsGoalEnabled = hasEms ? !!d(`${cm}.goalEnabled`) : false;
  const emsGoalTargetSoc = Number.isFinite(Number(d(`${cm}.goalTargetSocPct`))) ? Math.round(Number(d(`${cm}.goalTargetSocPct`))) : 100;
  const emsGoalFinishTs = Number.isFinite(Number(d(`${cm}.goalFinishTs`))) ? Math.round(Number(d(`${cm}.goalFinishTs`))) : 0;
  const emsGoalBatteryKwh = Number.isFinite(Number(d(`${cm}.goalBatteryKwh`))) ? Number(d(`${cm}.goalBatteryKwh`)) : 0;
  const emsGoalStatus = String(d(`${cm}.goalStatus`) || '');
  const emsGoalSocAvail = hasEms ? d(`${cm}.goalSocAvailable`) : null;
  const emsGoalActive = hasEms ? !!d(`${cm}.goalActive`) : false;
  const emsGoalRemainingMin = Number.isFinite(Number(d(`${cm}.goalRemainingMin`))) ? Math.round(Number(d(`${cm}.goalRemainingMin`))) : 0;
  const emsGoalDesiredW = Number.isFinite(Number(d(`${cm}.goalDesiredPowerW`))) ? Math.round(Number(d(`${cm}.goalDesiredPowerW`))) : 0;
  const emsGoalShortfallW = Number.isFinite(Number(d(`${cm}.goalShortfallW`))) ? Math.round(Number(d(`${cm}.goalShortfallW`))) : 0;

  /**
   * Code-Teil: Arrow-Funktion `emsGoalTimeValue`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: emsGoalTimeValue
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const emsGoalTimeValue = (() => {
    if (!emsGoalFinishTs || emsGoalFinishTs <= 0) return '';
    try {
      const dt = new Date(emsGoalFinishTs);
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    } catch (_e) { return ''; }
  })();

  let emsGoalHint = '';
  if (!emsGoalEnabled) {
    emsGoalHint = 'Aus';
  } else if (emsGoalStatus === 'no_vehicle') {
    emsGoalHint = 'Fahrzeug nicht verbunden – Zielladen pausiert.';
  } else if (emsGoalStatus === 'waiting_soc') {
    emsGoalHint = 'Warte auf SoC‑Aktualisierung (nach Einstecken).';
  } else if (emsGoalStatus === 'soc_stale') {
    emsGoalHint = 'SoC‑Wert veraltet – warte auf neue SoC‑Daten.';
  } else if (emsGoalStatus === 'no_soc') {
    emsGoalHint = 'SoC nicht verfügbar – Zielladen läuft im Fallback (Worst-Case) über Akkukapazität.';
  } else if (emsGoalStatus === 'no_deadline') {
    emsGoalHint = 'Uhrzeit fehlt – bitte setzen.';
  } else if (emsGoalStatus === 'reached') {
    emsGoalHint = `Ziel erreicht (${emsGoalTargetSoc}%).`;
  } else if (emsGoalStatus === 'shortfall') {
    emsGoalHint = `Unterversorgung: ${fmtW(emsGoalShortfallW)} fehlen • Rest ${fmtMin(emsGoalRemainingMin)}.`;
  } else if (emsGoalStatus === 'overdue') {
    emsGoalHint = `Überfällig • Unterversorgung: ${fmtW(emsGoalShortfallW)}.`;
  } else if (emsGoalStatus === 'active' || emsGoalActive) {
    if (emsGoalSocAvail === false) {
      emsGoalHint = `Rest ${fmtMin(emsGoalRemainingMin)} • Ziel ${emsGoalTargetSoc}% (Schätzung) • Ø ${fmtW(emsGoalDesiredW)}.`;
    } else {
      emsGoalHint = `Rest ${fmtMin(emsGoalRemainingMin)} • Ziel ${emsGoalTargetSoc}% • Ø ${fmtW(emsGoalDesiredW)}.`;
    }
  } else {
    emsGoalHint = 'Konfiguriert';
  }

  const stationSafe = emsStationKey ? safeIdPart(emsStationKey) : '';
  const stationRemainingW = stationSafe ? d(`chargingManagement.stations.${stationSafe}.remainingW`) : undefined;
  const stationCapW = stationSafe ? d(`chargingManagement.stations.${stationSafe}.maxPowerW`) : undefined;

  const p = d(`evcs.${i}.powerW`);
  const day = d(`evcs.${i}.energyDayKwh`);
  const tot = d(`evcs.${i}.energyTotalKwh`);
  const st = d(`evcs.${i}.status`);
  const soc = d(`evcs.${i}.vehicleSoc`);
  const rawStatusText = emsStatusRaw || String(st ?? '').trim();
  const localOnline = d(`evcs.${i}.online`);
  const effectiveOnline = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;
  const modalStatusInfo = _resolveEvcsDisplayStatus({
    hasEms,
    rawStatus: rawStatusText,
    effectiveStatus: emsStatusEffective,
    statusClass: emsStatusClass,
    statusFresh: emsStatusFresh,
    statusIgnoredReason: emsStatusIgnoredReason,
    faultActive: emsFaultActive,
    unavailableActive: emsUnavailableActive,
    online: effectiveOnline,
    reason: emsReason,
  });
  const statusDisplayText = modalStatusInfo.text || '--';
  const statusAgeText = Number.isFinite(emsStatusAgeMs) && emsStatusAgeMs > 0
    ? (emsStatusAgeMs < 60000 ? `${Math.ceil(emsStatusAgeMs / 1000)} s` : `${Math.ceil(emsStatusAgeMs / 60000)} min`)
    : '';
  let statusTruthHint = '';
  if (emsFaultActive) {
    statusTruthHint = `Die erreichbare Wallbox bzw. das angebundene Backend meldet aktuell eine Störung${emsFaultReason ? ` (${emsFaultReason})` : ''}.`;
  } else if (emsUnavailableActive) {
    statusTruthHint = `Der erreichbare Connector meldet aktuell „nicht verfügbar“${emsUnavailableReason ? ` (${emsUnavailableReason})` : ''}.`;
  } else if ((emsStatusStale || emsStatusIgnoredReason) && rawStatusText) {
    const why = emsStatusIgnoredReason ? ` Grund: ${emsStatusIgnoredReason}.` : '';
    statusTruthHint = `Der Rohstatus „${rawStatusText}“ ist${statusAgeText ? ` seit ${statusAgeText}` : ''} nicht als aktueller, connectorbezogener Status bestätigt.${why}`;
  }

  const ct = String(emsChargerType ?? m.chargerType ?? '').toUpperCase();
  const ctBadge = (ct === 'DC' || ct === 'AC') ? ct : '';
  const userModeLower = String(emsUserMode || 'auto').trim().toLowerCase();
  const showAutoSourceUi = hasEms && userModeLower === 'auto';
  const strategyRequestedText = Number.isFinite(emsStrategyRequestedPowerW) && emsStrategyRequestedPowerW > 0
    ? ` · Wunsch ${fmtW(emsStrategyRequestedPowerW)}`
    : '';
  const strategyStateText = emsUserAutoSource !== 'strategy'
    ? 'Standard-Automatik aktiv. Die Betriebsstrategien-App beobachtet diesen Ladepunkt nur.'
    : (emsStrategyActive
      ? `Betriebsstrategie aktiv${strategyRequestedText}${emsStrategyReason ? ` · ${emsStrategyReason}` : ''}`
      : (emsStrategyFallbackActive
        ? `Betriebsstrategie nicht verfügbar – sicherer Rückfall aktiv${emsStrategyReason ? ` · ${emsStrategyReason}` : ''}`
        : (emsStrategyEligible
          ? `Betriebsstrategie ausgewählt, wartet auf eine gültige Anforderung${emsStrategyReason ? ` · ${emsStrategyReason}` : ''}`
          : `Betriebsstrategie ausgewählt, aber noch nicht freigegeben${emsStrategyReason ? ` · ${emsStrategyReason}` : ''}`)));
  // Bedienregel: Keine Haupt-DP-Zuordnung = keine Bedienung. Die Phasenwahl wird
  // auf der EVCS-Seite angezeigt, sobald der Installer den Phasen-Schalt-Haupt-DP
  // zugeordnet hat. Runtime-State phaseSwitchSupported ist nur zusätzlicher Fallback,
  // weil er erst nach dem nächsten EMS-Tick im /api/state-Snapshot stehen kann.
  const phaseSwitchMapped = evcsPhaseSwitchDpAssigned(i);
  const phaseSupported = phaseSwitchMapped || emsPhaseSupported === true;
  const showPhaseUi = hasEms && phaseSupported;
  const configuredPhases = Number(m.phases || d(`${cm}.phases`) || 0);
  const phaseModeValue = normalizeEvcsPhaseMode(emsPhaseUserMode ?? emsPhaseMode ?? evcsConfiguredPhaseMode(i, configuredPhases));
  const phaseCur = (emsCurrentPhaseCount === 1 || emsCurrentPhaseCount === 3) ? emsCurrentPhaseCount : (configuredPhases === 1 || configuredPhases === 3 ? configuredPhases : 0);
  const phaseTarget = (emsTargetPhaseCount === 1 || emsTargetPhaseCount === 3) ? emsTargetPhaseCount : phaseCur;
  const phaseCurTxt = (phaseCur === 1 || phaseCur === 3) ? `${phaseCur}p` : '—';
  const phaseTargetTxt = (phaseTarget === 1 || phaseTarget === 3) ? `${phaseTarget}p` : '—';
  let phaseHintTxt = '';
  if (emsPhaseSwitchState && emsPhaseSwitchState !== 'idle') phaseHintTxt = `Umschaltung: ${emsPhaseSwitchState}${emsPhaseSwitchReason ? ' · ' + emsPhaseSwitchReason : ''}`;
  else if (emsPhaseCooldownMs > 0) phaseHintTxt = `Cooldown aktiv: ${Math.ceil(emsPhaseCooldownMs / 1000)} s`;
  else phaseHintTxt = phaseModeValue === 'auto-pv' ? 'Auto PV schaltet 1p/3p nach Überschuss, Hysterese und Cooldown.' : 'Fester AC-Phasenmodus aktiv.';

  const globalStorageAssistControl = evcsGlobalStorageAssistCustomerAllowed();
  const storageAssistAllowed = hasEms && (evcsStorageAssistCustomerAllowed(i) || emsStorageAssistCustomerAllowed === true);
  const storageAssistEnabled = !!emsUserStorageAssistEnabled;
  const storageAssistEffective = !!emsEffectiveStorageAssist;
  let storageAssistHint = '';
  if (!storageAssistEnabled) storageAssistHint = 'Speicher wird für diesen Ladepunkt geschützt.';
  else if (storageAssistEffective) storageAssistHint = `Speicher darf unterstützen${Number.isFinite(emsBatteryContributionW) && emsBatteryContributionW > 0 ? ' · Anteil ' + Math.round(emsBatteryContributionW) + ' W' : ''}.`;
  else storageAssistHint = emsStorageAssistReason ? `Freigegeben, aktuell nicht aktiv: ${emsStorageAssistReason}` : 'Freigegeben, aktuell nicht aktiv.';

  const emsUiVal = clampEmsUi(emsModeToUi(emsUserMode ?? 'auto'));
  const effTxt = String(emsEffectiveMode ?? '').trim();
  const effLower = effTxt.toLowerCase();
  const userLower = String(emsUserMode ?? 'auto').trim().toLowerCase();

  const hint = reasonHint(emsReason, emsApplyStatus);
  const allowBoost = (emsAllowBoost !== false);
  const boostDisabled = (!allowBoost && userLower !== 'boost');

  const regBtnAttr = regOff ? 'disabled title="Regelung deaktiviert"' : '';
  const showEff = !!effTxt && ((userLower === 'auto' && effLower !== 'normal') || (userLower !== 'auto' && userLower !== effLower && !(userLower === 'minpv' && effLower === 'minpv')));

  const bq = _boostQueueRank[i] || 0;
  const rfid = rfidLabel(i);

  return `
    <div class="card" style="margin:0">
      <div style="display:grid; gap:10px; padding:12px;">
        ${note ? `<div class="muted" style="opacity:.8">${esc(note)}</div>` : ''}

        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Leistung</span><strong>${fmtW(p)}</strong>
        </div>
        ${hasEms && emsTargetW != null ? `<div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Soll (EMS)</span><strong>${fmtW(emsTargetW)}</strong>
        </div>` : ''}

        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Status</span><strong>${esc(statusDisplayText)}</strong>
        </div>
        ${statusTruthHint ? `<div class="muted" style="font-size:12px; line-height:1.35; padding:7px 9px; border:1px solid rgba(255,180,70,.24); border-radius:8px;">${esc(statusTruthHint)}${emsStatusSourceId ? `<br><span style="opacity:.75">Quelle: ${esc(emsStatusSourceId)}</span>` : ''}</div>` : ''}
        ${soc != null ? `<div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Fahrzeug SoC</span><strong>${fmtPct(soc)}</strong>
        </div>` : ''}

        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Heute</span><strong>${fmtKwh(day)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; gap:12px;">
          <span>Gesamt</span><strong>${fmtKwh(tot)}</strong>
        </div>

        ${rfid ? `<div style="display:flex; justify-content:space-between; gap:12px;">
          <span>RFID</span><strong class="nw-evcs-rfid ${esc(rfid.cls)}" ${rfid.title ? `title="${esc(rfid.title)}"` : ''}>${esc(rfid.text)}</strong>
        </div>` : ''}

        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding-top:6px; border-top:1px solid rgba(255,255,255,.06);">
          <span>Ladestation</span>
          ${canActive ? `
            <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-2 nw-toggle" data-toggle-for="evcsActive_${i}" title="Ladepunkt aktivieren/deaktivieren">
              <button type="button" data-value="false" class="${stationEnabled ? '' : 'active'}">Aus</button>
              <button type="button" data-value="true" class="${stationEnabled ? 'active' : ''}">An</button>
            </div>
            <input type="checkbox" class="nw-toggle-hidden" id="evcsActive_${i}" data-evcs-active="${i}" ${stationEnabled ? 'checked' : ''}>
          ` : `<strong>${stationEnabled ? 'Ja' : 'Nein'}</strong>`}
        </div>

        ${regAvail ? `<div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <span>Regelung</span>
          <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-2 nw-toggle" data-toggle-for="evcsReg_${i}" title="Regelung aktivieren/deaktivieren">
            <button type="button" data-value="false" class="${regOn ? '' : 'active'}">Aus</button>
            <button type="button" data-value="true" class="${regOn ? 'active' : ''}">An</button>
          </div>
          <input type="checkbox" class="nw-toggle-hidden" id="evcsReg_${i}" data-ems-reg="${i}" ${regOn ? 'checked' : ''}>
        </div>` : ''}

        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
          <span>Lade‑Modus</span>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
            <div class="nw-evcs-mode">
              <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-4" role="group" aria-label="Lade-Modus">
                <button type="button" class="${emsUiVal === 1 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="auto" ${regBtnAttr}>Auto</button>
                <button type="button" class="${emsUiVal === 2 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="boost" ${regBtnAttr} ${boostDisabled ? 'disabled title="Boost für diesen Ladepunkt nicht erlaubt"' : ''}>Boost</button>
                <button type="button" class="${emsUiVal === 3 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="minpv" ${regBtnAttr}>Min+PV</button>
                <button type="button" class="${emsUiVal === 4 ? 'active' : ''}" data-ems-mode-btn="${i}" data-mode="pv" ${regBtnAttr}>PV</button>
              </div>
            </div>

            ${showEff ? `<div class="muted" style="font-size:12px; opacity:.85">Effektiv: ${esc(effTxt)}</div>` : ''}
            ${regOff ? `<div class="nw-hint nw-hint-warn">Regelung aus – Automatik inaktiv.</div>` : ''}
            ${hint ? `<div class="nw-hint nw-hint-${hint.level}">${esc(hint.text)}</div>` : ''}
          </div>
        </div>

        ${showAutoSourceUi ? `
          <div style="margin-top:4px; padding-top:10px; border-top:1px solid rgba(255,255,255,.06);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <span>Auto-Steuerung</span>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-2" role="group" aria-label="Auto-Steuerquelle">
                  <button type="button" class="${emsUserAutoSource === 'standard' ? 'active' : ''}" data-ems-auto-source-btn="${i}" data-auto-source="standard" ${regBtnAttr}>Standard</button>
                  <button type="button" class="${emsUserAutoSource === 'strategy' ? 'active' : ''}" data-ems-auto-source-btn="${i}" data-auto-source="strategy" ${regBtnAttr}>Betriebsstrategie</button>
                </div>
                <div class="muted" style="font-size:12px; opacity:.88; text-align:right; max-width:390px;">${esc(strategyStateText)}</div>
                ${emsStrategyStatus ? `<div class="muted" style="font-size:11px; opacity:.68; text-align:right;">Status: ${esc(emsStrategyStatus)}</div>` : ''}
              </div>
            </div>
          </div>
        ` : ''}

        ${showPhaseUi ? `
          <div style="margin-top:4px; padding-top:10px; border-top:1px solid rgba(255,255,255,.06);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <span>AC‑Phasenmodus</span>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                <strong>${esc(phaseModeLabel(phaseModeValue))} · ${esc(phaseCurTxt)} → ${esc(phaseTargetTxt)}</strong>
                <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-3" role="group" aria-label="AC-Phasenmodus">
                  <button type="button" class="${phaseModeValue === 'fixed-1p' ? 'active' : ''}" data-ems-phase-mode-btn="${i}" data-phase-mode="fixed-1p">1p</button>
                  <button type="button" class="${phaseModeValue === 'fixed-3p' ? 'active' : ''}" data-ems-phase-mode-btn="${i}" data-phase-mode="fixed-3p">3p</button>
                  <button type="button" class="${phaseModeValue === 'auto-pv' ? 'active' : ''}" data-ems-phase-mode-btn="${i}" data-phase-mode="auto-pv">Auto PV</button>
                </div>
                <div class="muted" style="font-size:12px; opacity:.85; text-align:right; max-width:320px;">${esc(phaseHintTxt)}</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${storageAssistAllowed && !globalStorageAssistControl ? `
          <div style="margin-top:4px; padding-top:10px; border-top:1px solid rgba(255,255,255,.06);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <span>Speicher</span>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                <strong>${esc(storageAssistLabel(storageAssistEnabled))}</strong>
                <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-2" role="group" aria-label="Speicher-Mitnutzung">
                  <button type="button" class="${!storageAssistEnabled ? 'active' : ''}" data-ems-storage-assist-btn="${i}" data-storage-assist="false">Schützen</button>
                  <button type="button" class="${storageAssistEnabled ? 'active' : ''}" data-ems-storage-assist-btn="${i}" data-storage-assist="true">Mitnutzen</button>
                </div>
                <div class="muted" style="font-size:12px; opacity:.85; text-align:right; max-width:320px;">${esc(storageAssistHint)}</div>
              </div>
            </div>
          </div>
        ` : ''}

        ${storageAssistAllowed && globalStorageAssistControl ? `
          <div style="margin-top:4px; padding-top:10px; border-top:1px solid rgba(255,255,255,.06); display:flex;justify-content:space-between;gap:12px;">
            <span>Speicher</span>
            <strong>${esc(storageAssistLabel(storageAssistEnabled))} · zentral für alle Ladepunkte</strong>
          </div>
        ` : ''}

        <!-- Ziel-Laden (Depot-/Zeit-Ziel) -->
        <div style="margin-top:4px; padding-top:10px; border-top:1px solid rgba(255,255,255,.06);">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <span>Ziel‑Laden</span>
            <div class="nw-evcs-mode-buttons nw-evcs-mode-buttons-2 nw-toggle" data-toggle-for="emsGoalEn_${i}">
              <button type="button" data-value="false" class="${!emsGoalEnabled ? 'active' : ''}">Aus</button>
              <button type="button" data-value="true" class="${emsGoalEnabled ? 'active' : ''}">An</button>
            </div>
            <input type="checkbox" class="nw-toggle-hidden" id="emsGoalEn_${i}" data-ems-goal-enabled="${i}" ${emsGoalEnabled ? 'checked' : ''}>
          </div>

          ${emsGoalEnabled ? `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
              <div>
                <div class="muted" style="font-size:12px; opacity:.85; margin-bottom:4px;">Ziel SoC (%)</div>
                <input class="nw-input" type="number" min="0" max="100" step="1" data-ems-goal-soc="${i}" value="${emsGoalTargetSoc}">
              </div>
              <div>
                <div class="muted" style="font-size:12px; opacity:.85; margin-bottom:4px;">Fertig um</div>
                <input class="nw-input" type="time" step="900" data-ems-goal-time="${i}" value="${emsGoalTimeValue}">
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:8px;">
              <span class="muted" style="font-size:12px; opacity:.85;">Akkukapazität (kWh)</span>
              <input class="nw-input" style="max-width:140px; text-align:right;" type="number" min="0" max="2000" step="0.1" data-ems-goal-kwh="${i}" value="${emsGoalBatteryKwh > 0 ? emsGoalBatteryKwh : ''}" placeholder="auto">
            </div>

            <div class="muted" style="font-size:12px; opacity:.85; margin-top:6px;">${esc(emsGoalHint)}</div>
          ` : `
            <div class="muted" style="font-size:12px; opacity:.85; margin-top:6px;">
              Optional: Ziel-SoC + Uhrzeit setzen (Depot-/Zeit‑Ziel‑Laden).
            </div>
          `}
        </div>

        ${hasEms && (String(emsUserMode || '').toLowerCase() === 'boost' || emsBoostActive === true) ? `
          <div style="display:flex; justify-content:space-between; gap:12px; margin-top:6px;">
            <span>Boost</span>
            <strong title="Boost endet ${fmtClock(emsBoostUntil) ? ('um ' + fmtClock(emsBoostUntil)) : ''} • Timeout ${fmtMin(emsBoostTimeoutMin)}">
              ${emsBoostActive ? `Aktiv (${fmtMin(emsBoostRemainingMin)})` : `Aktivierung wartet`}
              ${bq ? ` <span class="muted" style="font-weight:600; opacity:.85">#${bq}</span>` : ''}
            </strong>
          </div>
        ` : ''}

        ${hasEms && emsStationKey ? `
          <div style="display:flex; justify-content:space-between; gap:12px; margin-top:6px;">
            <span>Station</span>
            <strong title="Station-Limit: ${fmtW(emsStationMaxW || stationCapW)} • Verfügbar: ${fmtW(stationRemainingW)}">
              ${esc(emsStationKey)}${stationCapW ? ` (${fmtW(stationCapW)})` : (emsStationMaxW ? ` (${fmtW(emsStationMaxW)})` : '')}
            </strong>
          </div>
        ` : ''}

        ${ctBadge ? `<div class="muted" style="font-size:12px; opacity:.85; margin-top:8px;">Connector: ${esc(ctBadge)}</div>` : ''}
      </div>
    </div>
  `;
}

// --- Render ------------------------------------------------------------------
/**
 * Code-Teil: render
 * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function render() {
  const list = document.getElementById('evcsList');
  if (!list) return;

  const sc = (cfg && cfg.settingsConfig) || {};
  const evcsAvailable = ((Number(sc.evcsConfiguredCount || 0) || (Array.isArray(sc.evcsList) ? sc.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','phaseSwitchId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
  const count = evcsAvailable ? Math.max(0, Math.round(Number(sc.evcsCount) || 0)) : 0;
  const meta = evcsAvailable && Array.isArray(sc.evcsList) ? sc.evcsList : [];

  _evcsCount = count;
  _evcsMeta = meta;
  renderEvcsGlobalStorageAssistControl();

  _boostQueueRank = _computeBoostQueueRank(count);

  const hasEms = _hasEms();

  // Aggregate tile (always show)
  const totalP = d('evcs.totalPowerW');
  let chargingCount = 0;
  for (let i = 1; i <= count; i++) {
    const p = Number(d(`evcs.${i}.powerW`) || 0);
    if (isFinite(p) && Math.abs(p) >= 80) chargingCount++;
  }

  let html = `
    <div class="nw-tile nw-tile--size-m nw-tile--type-sensor" style="cursor:default">
      <div class="nw-tile__top">
        <div class="nw-tile__icon-circle">Σ</div>
        <div style="flex:1; margin-left:8px; min-width:0;">
          <div class="nw-tile__alias">Gesamt</div>
          <div class="nw-tile__room">${count} Ladepunkte • ${chargingCount} aktiv</div>
        </div>
        <div class="nw-tile__badge">EVCS</div>
      </div>
      <div class="nw-tile__middle">
        <div class="nw-tile__value">${fmtW(totalP)}</div>
        <div class="nw-tile__unit">Leistung</div>
      </div>
      <div class="nw-tile__bottom">
        <span class="muted">Übersicht</span>
        <span class="muted">${hasEms ? 'EMS aktiv' : 'Monitoring'}</span>
      </div>
    </div>
  `;

  for (let i = 1; i <= count; i++) {
    const m = meta[i - 1] || {};
    const name = m.name || ('Ladepunkt ' + i);

    const cm = `chargingManagement.wallboxes.lp${i}`;
    const powerW = d(`evcs.${i}.powerW`);
    const soc = d(`evcs.${i}.vehicleSoc`);
    const status = d(`evcs.${i}.status`);
    const active = d(`evcs.${i}.active`);
    const localOnline = d(`evcs.${i}.online`);
    const emsOnline = hasEms ? d(`${cm}.online`) : null;
    // Explicit EVCS onlineId mirror wins over EMS/status fallback.
    const online = (_evcsBoolOrNull(localOnline) !== null) ? localOnline : emsOnline;

    const regEnabled = hasEms ? d(`${cm}.userEnabled`) : null;
    const emsReason = hasEms ? d(`${cm}.reason`) : null;
    const emsStatusClass = hasEms ? String(d(`${cm}.statusClass`) ?? '').trim() : '';
    const emsFaultActive = hasEms ? _evcsBoolOrNull(d(`${cm}.faultActive`)) === true : false;
    const emsUnavailableActive = hasEms ? _evcsBoolOrNull(d(`${cm}.unavailableActive`)) === true : false;

    const emsUserMode = hasEms ? d(`${cm}.userMode`) : null;
    const emsChargerType = hasEms ? d(`${cm}.chargerType`) : null;
    const ct = String(emsChargerType ?? m.chargerType ?? '').toUpperCase();
    const ctBadge = (ct === 'DC' || ct === 'AC') ? ct : '';

    const badge = ctBadge || _modeBadge(emsUserMode) || 'EV';
    const statusInfo = _evcsStatusInfoForIndex(i, hasEms);
    const statusTxt = _shortStatusText(statusInfo, emsReason, online);

    const tileCls = _tileStateClass({
      powerW,
      reason: emsReason,
      active,
      regEnabled,
      online,
      statusClass: emsStatusClass || statusInfo.status,
      faultActive: emsFaultActive,
      unavailableActive: emsUnavailableActive,
    });

    const socTxt = (soc != null) ? ('SoC ' + fmtPct(soc)) : 'SoC --';
    const modeTxt = hasEms ? (_modeBadge(emsUserMode) || 'AUTO') : '—';

    html += `
      <div class="nw-tile nw-tile--size-m ${tileCls}" style="cursor:pointer" data-evcs-tile="${i}" tabindex="0" role="button" aria-label="${esc(name)}">
        <div class="nw-tile__top">
          <div class="nw-tile__icon-circle">⚡</div>
          <div style="flex:1; margin-left:8px; min-width:0;">
            <div class="nw-tile__alias" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(name)}</div>
            <div class="nw-tile__room" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(statusTxt)}</div>
          </div>
          <div class="nw-tile__badge">${esc(badge)}</div>
        </div>

        <div class="nw-tile__middle">
          <div class="nw-tile__value">${fmtW(powerW)}</div>
          <div class="nw-tile__unit">${soc != null ? 'Leistung' : 'Leistung'}</div>
        </div>

        <div class="nw-tile__bottom">
          <span>${esc(socTxt)}</span>
          <span>${esc(modeTxt)}</span>
        </div>
      </div>
    `;
  }

  list.innerHTML = html;

  // Keep modal content updated, but never rebuild while the user interacts (esp. time picker).
  if (_modalOpenIdx > 0) {
    const modal = document.getElementById('evcsModal');
    const body = document.getElementById('evcsModalBody');
    const sub = document.getElementById('evcsModalSubTitle');

    if (modal && !modal.classList.contains('hidden')) {
      // subtitle update is safe (does not replace inputs)
      try {
        const i = _modalOpenIdx;
        const p = d(`evcs.${i}.powerW`);
        const soc = d(`evcs.${i}.vehicleSoc`);
        const statusInfo = _evcsStatusInfoForIndex(i, hasEms);
        if (sub) {
          const parts = [];
          parts.push('Leistung: ' + fmtW(p));
          if (soc != null) parts.push('SoC: ' + fmtPct(soc));
          if (statusInfo && statusInfo.text && statusInfo.text !== '--') parts.push(String(statusInfo.text));
          sub.textContent = parts.join(' • ');
        }
      } catch (_e) {}

      if (body) {
        if (!_isModalLocked(modal)) {
          // re-render modal body for live updates (safe when not interacting)
          body.innerHTML = buildEvcsModalBodyHtml(_modalOpenIdx);

          // If a retry was scheduled while the user was interacting, drop it.
          try {
            if (_modalRerenderTimer) {
              clearTimeout(_modalRerenderTimer);
              _modalRerenderTimer = null;
            }
          } catch (_e) {}
        } else {
          // While locked we skip DOM replacement. Ensure we refresh right after the
          // lock window expires (otherwise users would need to close/reopen).
          const now = Date.now();
          const delay = (_modalInteractionUntil > now) ? (_modalInteractionUntil - now + 80) : 320;
          _scheduleModalRerenderRetry(delay);
        }
      }
    }
  }
}

// --- Menu --------------------------------------------------------------------
/**
 * Code-Teil: initMenu
 * Zweck: Initialisiert diesen Bereich und verbindet abhängige Startlogik.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function initMenu() {
  const btn = document.getElementById('menuBtn');
  const dd = document.getElementById('menuDropdown');
  if (btn && dd) {
    if (btn.dataset.nwMenuBound) return;
    // 0.8.21: EVCS bindet das Burger-Menü exakt einmal und markiert den Button,
    // damit `nw-shell.js` keinen zweiten Toggle-Handler ergänzt. Klicks auf ein
    // Icon/Kind im Button bleiben über btn.contains(...) offen.
    btn.dataset.nwMenuBound = 'evcs';
    btn.dataset.nwAppMenu = '1';
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); dd.classList.toggle('hidden'); });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    document.addEventListener('click', (e) => { const target = e && e.target; if (!dd.contains(target) && !btn.contains(target)) dd.classList.add('hidden'); });
    dd.addEventListener('click', (e) => e.stopPropagation());
  }
}

// --- Controls (tiles + modal) ------------------------------------------------
/**
 * Code-Teil: bindControls
 * Zweck: Verbindet Event-Handler mit DOM oder Runtime-Objekten.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function bindControls() {
  const list = document.getElementById('evcsList');
  const modal = document.getElementById('evcsModal');
  const closeBtn = document.getElementById('evcsModalClose');
  const globalStorageAssist = document.getElementById('evcsGlobalStorageAssist');

  if (globalStorageAssist && !globalStorageAssist.dataset.nwBound) {
    globalStorageAssist.dataset.nwBound = '1';
    globalStorageAssist.addEventListener('click', async (event) => {
      const button = event && event.target && event.target.closest
        ? event.target.closest('button[data-global-storage-assist]')
        : null;
      if (!button || !evcsGlobalStorageAssistCustomerAllowed()) return;
      const enabled = String(button.getAttribute('data-global-storage-assist')) === 'true';
      const indices = evcsGlobalStorageAssistIndices();
      try {
        for (const index of indices) {
          const key = `chargingManagement.wallboxes.lp${index}.userStorageAssistEnabled`;
          _setPendingWrite(key, enabled, 3500);
          state[key] = { value: enabled, ts: Date.now() };
        }
        renderEvcsGlobalStorageAssistControl();
        scheduleRender();
        const response = await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'ems', key: 'evcs.global.storageAssistEnabled', value: enabled })
        });
        if (!response.ok) throw new Error('global_storage_assist_write_failed');
      } catch (_e) {
        for (const index of indices) {
          _clearPendingWrite(`chargingManagement.wallboxes.lp${index}.userStorageAssistEnabled`);
        }
        try { state = await fetch('/api/state', { cache: 'no-store' }).then((response) => response.json()); } catch (_e2) {}
        scheduleRender();
      }
    });
  }

  if (list) {
    // With many EVCS tiles the UI may re-render frequently (SSE). A click can be
    // lost if the DOM changes between pointerdown and click. Open the modal on
    // pointerdown (mouse) to guarantee single-click behaviour.
    let _ignoreTileClickUntil = 0;
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an list. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    list.addEventListener('pointerdown', (e) => {
      try {
        if (Date.now() < _ignoreTileClickUntil) return;
        if (e && e.pointerType && e.pointerType !== 'mouse') return;
        if (typeof e.button === 'number' && e.button !== 0) return;
        const tile = e.target && e.target.closest ? e.target.closest('.nw-tile[data-evcs-tile]') : null;
        if (!tile) return;
        const idx = Number(tile.getAttribute('data-evcs-tile'));
        if (!Number.isFinite(idx) || idx <= 0) return;
        _ignoreTileClickUntil = Date.now() + 450;
        try { e.preventDefault(); } catch (_e) {}
        openEvcsModal(idx);
      } catch (_e) {
        // ignore
      }
    }, { passive: false, capture: true });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an list. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    list.addEventListener('click', (e) => {
      if (Date.now() < _ignoreTileClickUntil) return;
      const tile = e.target && e.target.closest ? e.target.closest('.nw-tile[data-evcs-tile]') : null;
      if (!tile) return;
      const idx = Number(tile.getAttribute('data-evcs-tile'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      openEvcsModal(idx);
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an list. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    list.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const tile = e.target && e.target.closest ? e.target.closest('.nw-tile[data-evcs-tile]') : null;
      if (!tile) return;
      try { e.preventDefault(); } catch (_e) {}
      const idx = Number(tile.getAttribute('data-evcs-tile'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      openEvcsModal(idx);
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', () => closeEvcsModal());
  if (modal) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeEvcsModal();
    });
    // Lock modal during interactions to keep native pickers stable (especially <input type="time">).
    // Note: On some mobile browsers (iOS Safari) pointer events for native pickers are unreliable.
    // Therefore we also listen to touchstart/mousedown in capture phase.
    /**
     * Code-Teil: Arrow-Funktion `bumpLock`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: bumpLock
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const bumpLock = (ev) => {
      try {
        const t = ev && ev.target;
        if (!t) return;
        // Only apply if the event is inside the modal.
        const m = document.getElementById('evcsModal');
        if (!m || !m.contains(t)) return;

        const tag = String(t.tagName || '').toUpperCase();
        const type = (tag === 'INPUT') ? String(t.type || '').toLowerCase() : '';

        const isTime = (tag === 'INPUT') && (type === 'time' || type === 'datetime-local');
        const isToggleBtn = (tag === 'BUTTON') && !!(t.closest && t.closest('.nw-toggle'));
        const isModeBtn = (tag === 'BUTTON') && !!(t.closest && t.closest('.nw-evcs-mode-buttons'));

        const isTextLikeInput = (tag === 'INPUT') && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
        const isEdit = isTextLikeInput || tag === 'SELECT' || tag === 'TEXTAREA';

        // Keep native pickers stable, but keep toggles snappy.
        if (isTime) _touchModalInteraction(20000);
        else if (isToggleBtn || isModeBtn) _touchModalInteraction(450);
        else if (isEdit) _touchModalInteraction(8000);
        else if (tag === 'BUTTON') _touchModalInteraction(1200);
        else _touchModalInteraction(2500);
      } catch (_e) {
        _touchModalInteraction(2500);
      }
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    modal.addEventListener('pointerdown', bumpLock, { passive: true, capture: true });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    modal.addEventListener('mousedown', bumpLock, { capture: true });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'touchstart' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    modal.addEventListener('touchstart', bumpLock, { passive: true, capture: true });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'focusin' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    modal.addEventListener('focusin', (ev) => {
      _modalLocked = true;
      try {
        const t = ev && ev.target;
        const tag = String(t && t.tagName || '').toUpperCase();
        const type = (tag === 'INPUT') ? String(t.type || '').toLowerCase() : '';
        const isTime = (tag === 'INPUT') && (type === 'time' || type === 'datetime-local');
        const isTextLikeInput = (tag === 'INPUT') && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
        const isEdit = isTextLikeInput || tag === 'SELECT' || tag === 'TEXTAREA';
        // Long for native time picker, medium for free-text inputs, short otherwise.
        _touchModalInteraction(isTime ? 20000 : (isEdit ? 8000 : 1500));
      } catch (_e) {
        _touchModalInteraction(1500);
      }
    });
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'focusout' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    modal.addEventListener('focusout', () => {
      _touchModalInteraction(2000);
      setTimeout(() => {
        try {
          const m = document.getElementById('evcsModal');
          if (m && m.contains(document.activeElement)) return;
        } catch (_e) {}
        _modalLocked = false;
      }, 80);
    });
  }

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = document.getElementById('evcsModal');
    if (m && !m.classList.contains('hidden')) closeEvcsModal();
  });

  // Toggle-Buttons (An/Aus) steuern versteckte Checkbox-Inputs
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('click', (e) => {
    const btn = e && e.target && e.target.closest ? e.target.closest('.nw-toggle button[data-value]') : null;
    if (!btn) return;

    const grp = btn.closest('.nw-toggle');
    const targetId = grp ? grp.getAttribute('data-toggle-for') : null;
    if (!targetId) return;

    const inp = document.getElementById(targetId);
    if (!inp || inp.disabled) return;

    const raw = String(btn.getAttribute('data-value') || '').trim().toLowerCase();
    const desired = (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes' || raw === 'ja');

    if (!!inp.checked !== desired) {
      inp.checked = desired;
      try { inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (_e) {}
    }

    // Visual sync
    try {
      const bs = Array.from(grp.querySelectorAll('button[data-value]'));
      bs.forEach(b => {
        const v = String(b.getAttribute('data-value') || '').trim().toLowerCase();
        const isTrue = (v === '1' || v === 'true' || v === 'on' || v === 'yes' || v === 'ja');
        b.classList.toggle('active', desired ? isTrue : !isTrue);
      });
    } catch (_e) {}
  }, true);

  // Input changes (Active/Regelung/Ziel-Laden Werte)
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (!t) return;

    // Legacy: direct wallbox datapoint
    if (t.matches('input[type="checkbox"][data-evcs-active]')) {
      const idx = Number(t.getAttribute('data-evcs-active'));

      const hasEms = _hasEms();
      const stationKey = `chargingManagement.wallboxes.lp${idx}.userStationEnabled`;

      // Optimistisch im UI aktualisieren. activeId remains read-only connector/session status.
      try {
        if (hasEms) state[stationKey] = { value: !!t.checked, ts: Date.now() };
        else state[`evcs.${idx}.active`] = { value: !!t.checked, ts: Date.now() };
      } catch (_e) {}
      scheduleRender();

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hasEms
            ? { scope: 'ems', key: `evcs.${idx}.stationEnabled`, value: !!t.checked }
            : { scope: 'evcs', key: `${idx}.active`, value: !!t.checked })
        });
      } catch (_e) {}
      return;
    }

    // EMS: enable/disable regulation per chargepoint
    if (t.matches('input[type="checkbox"][data-ems-reg]')) {
      const idx = Number(t.getAttribute('data-ems-reg'));
      const b = !!t.checked;
      const k = `chargingManagement.wallboxes.lp${idx}.userEnabled`;

      try {
        _setPendingWrite(k, b, 1800);
        state[k] = { value: b, ts: Date.now() };
        scheduleRender();
      } catch (_e) {}

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.regEnabled`, value: b })
        });
      } catch (_e) {}
      return;
    }

    // EMS: Ziel-Laden enable
    if (t.matches('input[type="checkbox"][data-ems-goal-enabled]')) {
      const idx = Number(t.getAttribute('data-ems-goal-enabled'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      const b = !!t.checked;
      const k = `chargingManagement.wallboxes.lp${idx}.goalEnabled`;

      _setPendingWrite(k, b, 2000);
      state[k] = { value: b, ts: Date.now() };
      scheduleRender();

      fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.goalEnabled`, value: b })
      }).then(() => {
        setTimeout(() => _clearPendingWrite(k, b), 2600);
      }).catch(() => {
        _clearPendingWrite(k);
        scheduleRender();
      });

      return;
    }

    // Ziel-SoC
    if (t.matches('input[data-ems-goal-soc]')) {
      const idx = Number(t.getAttribute('data-ems-goal-soc'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      const n = Number(t.value);
      if (!Number.isFinite(n)) return;

      const v = Math.max(0, Math.min(100, Math.round(n)));
      const k = `chargingManagement.wallboxes.lp${idx}.goalTargetSocPct`;

      _setPendingWrite(k, v, 2500);
      state[k] = { value: v, ts: Date.now() };
      scheduleRender();

      fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.goalTargetSocPct`, value: v })
      }).then(() => {
        setTimeout(() => _clearPendingWrite(k, v), 2600);
      }).catch(() => {
        _clearPendingWrite(k);
        scheduleRender();
      });

      return;
    }

    // Ziel-Uhrzeit
    if (t.matches('input[type="time"][data-ems-goal-time]')) {
      const idx = Number(t.getAttribute('data-ems-goal-time'));
      if (!Number.isFinite(idx) || idx <= 0) return;

      // Enforce 15‑minute raster even if the browser allows free typing.
      const snapped = snapHhmmTo15Min(t.value) || t.value;
      try { if (snapped && snapped !== t.value) t.value = snapped; } catch (_e) {}

      const ts = nextTsFromTimeInput(snapped);
      const k = `chargingManagement.wallboxes.lp${idx}.goalFinishTs`;

      _setPendingWrite(k, ts, 2500);
      state[k] = { value: ts, ts: Date.now() };
      scheduleRender();

      fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.goalFinishTs`, value: ts })
      }).then(() => {
        setTimeout(() => _clearPendingWrite(k, ts), 2600);
      }).catch(() => {
        _clearPendingWrite(k);
        scheduleRender();
      });

      return;
    }

    // Batterie kWh
    if (t.matches('input[data-ems-goal-kwh]')) {
      const idx = Number(t.getAttribute('data-ems-goal-kwh'));
      if (!Number.isFinite(idx) || idx <= 0) return;

      const n = Number(t.value);
      const v = Number.isFinite(n) ? Math.max(0, Math.min(2000, Math.round(n * 10) / 10)) : 0;
      const k = `chargingManagement.wallboxes.lp${idx}.goalBatteryKwh`;

      _setPendingWrite(k, v, 2500);
      state[k] = { value: v, ts: Date.now() };
      scheduleRender();

      fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.goalBatteryKwh`, value: v })
      }).then(() => {
        setTimeout(() => _clearPendingWrite(k, v), 2600);
      }).catch(() => {
        _clearPendingWrite(k);
        scheduleRender();
      });

      return;
    }
  });

  // Mode buttons (EMS)
  // Trigger on pointerdown to avoid lost clicks during SSE renders.
  let _ignoreClickUntil = 0;
  /**
   * Code-Teil: _syncModeButtonsUi
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  function _syncModeButtonsUi(idx, mode) {
    try {
      const m = String(mode || 'auto').trim().toLowerCase();
      const bs = Array.from(document.querySelectorAll(`button[data-ems-mode-btn="${idx}"]`));
      bs.forEach(b => {
        let bm = String(b.getAttribute('data-mode') || 'auto').trim().toLowerCase();
        if (bm === 'min+pv') bm = 'minpv';
        b.classList.toggle('active', bm === m);
      });
    } catch (_e) {}
  }
  function _syncAutoSourceButtonsUi(idx, source) {
    try {
      const normalized = String(source || 'standard').trim().toLowerCase() === 'strategy' ? 'strategy' : 'standard';
      const buttons = Array.from(document.querySelectorAll(`button[data-ems-auto-source-btn="${idx}"]`));
      buttons.forEach((button) => {
        const candidate = String(button.getAttribute('data-auto-source') || 'standard').trim().toLowerCase() === 'strategy' ? 'strategy' : 'standard';
        button.classList.toggle('active', candidate === normalized);
      });
    } catch (_e) {}
  }
  /**
   * Code-Teil: handleModeButton
   * Zweck: Verarbeitet Events oder API-/Benutzeraktionen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  async function handleModeButton(btn) {
    if (!btn) return;

    if (btn.matches('button[data-ems-mode-btn]')) {
      const idx = Number(btn.getAttribute('data-ems-mode-btn'));
      let mode = String(btn.getAttribute('data-mode') || 'auto').trim().toLowerCase();
      if (mode === 'min+pv') mode = 'minpv';
      if (!['auto', 'boost', 'minpv', 'pv'].includes(mode)) mode = 'auto';

      // UX: allow manual boost cancel by clicking the active Boost button again.
      try {
        let cur = String(d(`chargingManagement.wallboxes.lp${idx}.userMode`) ?? 'auto').trim().toLowerCase();
        if (cur === 'min+pv') cur = 'minpv';
        if (!['auto', 'boost', 'minpv', 'pv'].includes(cur)) cur = 'auto';
        if (mode === 'boost' && cur === 'boost') mode = 'auto';
      } catch (_e) {}

      const k = `chargingManagement.wallboxes.lp${idx}.userMode`;
      try {
        _setPendingWrite(k, mode, 1800);
        state[k] = { value: mode, ts: Date.now() };
        _syncModeButtonsUi(idx, mode);
        scheduleRender();
      } catch (_e) {}

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.userMode`, value: mode })
        });
      } catch (_e) {}

      return;
    }

    if (btn.matches('button[data-ems-auto-source-btn]')) {
      const idx = Number(btn.getAttribute('data-ems-auto-source-btn'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      const source = String(btn.getAttribute('data-auto-source') || 'standard').trim().toLowerCase() === 'strategy' ? 'strategy' : 'standard';
      const k = `chargingManagement.wallboxes.lp${idx}.userAutoSource`;

      try {
        _setPendingWrite(k, source, 2500);
        state[k] = { value: source, ts: Date.now() };
        _syncAutoSourceButtonsUi(idx, source);
        scheduleRender();
      } catch (_e) {}

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.autoSource`, value: source })
        });
      } catch (_e) {}

      return;
    }

    if (btn.matches('button[data-ems-phase-mode-btn]')) {
      const idx = Number(btn.getAttribute('data-ems-phase-mode-btn'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      const mode = normalizeEvcsPhaseMode(btn.getAttribute('data-phase-mode') || 'auto-pv');
      const k = `chargingManagement.wallboxes.lp${idx}.userPhaseMode`;

      try {
        _setPendingWrite(k, mode, 2500);
        state[k] = { value: mode, ts: Date.now() };
        scheduleRender();
      } catch (_e) {}

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.phaseMode`, value: mode })
        });
      } catch (_e) {}

      return;
    }

    if (btn.matches('button[data-ems-storage-assist-btn]')) {
      const idx = Number(btn.getAttribute('data-ems-storage-assist-btn'));
      if (!Number.isFinite(idx) || idx <= 0) return;
      const raw = String(btn.getAttribute('data-storage-assist') || 'false').trim().toLowerCase();
      const enabled = raw === 'true' || raw === '1' || raw === 'yes';
      const k = `chargingManagement.wallboxes.lp${idx}.userStorageAssistEnabled`;

      try {
        _setPendingWrite(k, enabled, 2500);
        state[k] = { value: enabled, ts: Date.now() };
        scheduleRender();
      } catch (_e) {}

      try {
        await fetch('/api/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'ems', key: `evcs.${idx}.storageAssistEnabled`, value: enabled })
        });
      } catch (_e) {}

      return;
    }
  }

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'pointerdown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('pointerdown', (e) => {
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn],button[data-ems-auto-source-btn],button[data-ems-phase-mode-btn],button[data-ems-storage-assist-btn]');
    if (!btn) return;
    _ignoreClickUntil = Date.now() + 450;
    try { e.preventDefault(); } catch (_e) {}
    _touchModalInteraction(600);
    handleModeButton(btn);
  }, { passive: false });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn],button[data-ems-auto-source-btn],button[data-ems-phase-mode-btn],button[data-ems-storage-assist-btn]');
    if (!btn) return;
    try { e.preventDefault(); } catch (_e) {}
    _touchModalInteraction(600);
    handleModeButton(btn);
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('click', (e) => {
    if (Date.now() < _ignoreClickUntil) return;
    const target = e.target;
    if (!target || !target.closest) return;
    const btn = target.closest('button[data-ems-mode-btn],button[data-ems-auto-source-btn],button[data-ems-phase-mode-btn],button[data-ems-storage-assist-btn]');
    if (!btn) return;
    _touchModalInteraction(600);
    handleModeButton(btn);
  });
}

// --- Boot --------------------------------------------------------------------
/**
 * Code-Teil: bootstrap
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function bootstrap() {
  initMenu();
  bindControls();

  try {
    cfg = await fetch('/config', { cache: 'no-store' }).then(r => r.json());
    const sc = (cfg && cfg.settingsConfig) || {};
    const evcsAvailable = ((Number(sc.evcsConfiguredCount || 0) || (Array.isArray(sc.evcsList) ? sc.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','phaseSwitchId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
    const c = evcsAvailable ? Math.max(0, Math.round(Number(sc.evcsCount) || 0)) : 0;
    const showEvcsPage = evcsAvailable && c >= 2;
    if (!showEvcsPage) {
      try { window.location.replace('./'); } catch (_e) { window.location.href = './'; }
      return;
    }
    const l = document.getElementById('menuEvcsLink');
    if (l) l.classList.toggle('hidden', !showEvcsPage);
    const t = document.getElementById('tabEvcs');
    if (t) t.classList.toggle('hidden', !showEvcsPage);
    const n = document.getElementById('nav-evcs');
    if (n) n.classList.toggle('hidden', !showEvcsPage);
    const sh = !!(cfg.featureVisibility && cfg.featureVisibility.hasSmartHome === true);
    const sl = document.getElementById('menuSmartHomeLink');
    if (sl) sl.classList.toggle('hidden', !sh);
    const st = document.getElementById('tabSmartHome');
    if (st) st.classList.toggle('hidden', !sh);
    const sf = !!(cfg.featureVisibility && cfg.featureVisibility.hasStorageFarm === true);
    const sfMenu = document.getElementById('menuStorageFarmLink');
    if (sfMenu) sfMenu.classList.toggle('hidden', !sf);
    const sfTab = document.getElementById('tabStorageFarm');
    if (sfTab) sfTab.classList.toggle('hidden', !sf);
  } catch (_e) {}

  try {
    state = await fetch('/api/state').then(r => r.json());
  } catch (_e) {
    state = {};
  }

  scheduleRender();

  // live updates
  try {
    const es = new EventSource('/events');
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init' && msg.payload) {
          state = msg.payload;
          scheduleRender();
          return;
        }
        if (msg.type === 'update' && msg.payload) {
          _mergeUpdatePayload(msg.payload);
          if (_isEvcsRelevantPayload(msg.payload) || _modalOpenIdx > 0) {
            scheduleRender();
          }
        }
      } catch (_e) {}
    };
  } catch (_e) {}
}

// Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
document.addEventListener('DOMContentLoaded', bootstrap);
