// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: ems/modules/charge-kiosk.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * ems/modules/charge-kiosk.js
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
 * Original-Hash: 6da7ab2d1c28a0cae3d3282318482f6ada2cc0ef506f895486c1870dfcb28fa6
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
 * Quelle: src-ts/runtime-executables/ems/modules/charge-kiosk.ts
 * Quell-Hash: sha256:ea257b3d3c7347eee8a10b60fa75ff4fb3b0d7346bbad7bab4e1566e861d1a17
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/modules/charge-kiosk.js.
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
 * Aufgabe: Stellt den Laufzeitbereich für die Lade-Kiosk-Funktion und dessen Konfigurations-/Statusbezug bereit.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/modules/charge-kiosk.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: ems/modules/charge-kiosk.js
 *
 * Zweck:
 * EOS DC Station Display / Charge Kiosk.
 * Dieses Modul stellt Runtime-/Diagnose-States für angelegte DC-Stationen bereit.
 * Die eigentliche Bedienung läuft über tokenisierte Display-APIs in main.ts.
 * Einstellungen und LP-Zuordnungen bleiben ausschließlich im Installer-/App-Center.
 *
 * 0.8.19:
 * - Betreiber-/Session-Grundlage für DC-Displays.
 * - Hersteller-offene Steuerbasis: Das Display erzeugt neutrale NexoWatt-Ladepunktkommandos.
 *   Die spätere Hardwareausführung darf über OCPP, Modbus, MQTT, REST, Herstelleradapter
 *   oder normale ioBroker-Datenpunkte erfolgen. Dieses Modul kennt bewusst kein OCPP-only Ziel.
 *
 * 0.8.22:
 * - Persistente Betreiber-/Sessionzustände pro Station: Tageskennzeichen,
 *   letzte Session je LP und CSV-Export-URL. Diese States sind bewusst kompakt,
 *   damit ioBroker nicht mit einzelnen Ledger-Einträgen geflutet wird.
 */
'use strict';

const { BaseModule } = require('./base');

const DEFAULT_WATCHDOG_TIMEOUT_SEC = 45;

/**
 * Code-Teil: toSafeId
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function toSafeId(input) {
  const s = String(input || '').trim().toLowerCase();
  return (s || 'station')
    .replace(/[^a-z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'station';
}

/**
 * Code-Teil: normalizeAssignedChargepoints
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeAssignedChargepoints(raw) {
  const arr = Array.isArray(raw)
    ? raw
    : String(raw || '').split(/[;,\s]+/g);
  const out = [];
  for (const item of arr) {
    const s = String(item || '').trim().toLowerCase();
    if (!s) continue;
    const m = s.match(/^(?:lp|ladepunkt|connector|evcs)?\s*([0-9]+)$/i) || s.match(/^lp([0-9]+)$/i);
    const key = m ? `lp${Math.max(1, Math.round(Number(m[1]) || 1))}` : toSafeId(s);
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/**
 * Code-Teil: normalizeAllowedModes
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeAllowedModes(raw) {
  const input = Array.isArray(raw) ? raw : String(raw || 'solar,fast').split(/[;,\s]+/g);
  const out = [];
  for (const item of input) {
    let m = String(item || '').trim().toLowerCase();
    if (!m) continue;
    if (m === 'pv' || m === 'solaronly' || m === 'solar-only') m = 'solar';
    if (m === 'boost' || m === 'speed' || m === 'schnell') m = 'fast';
    if (!['solar', 'fast', 'auto'].includes(m)) continue;
    if (!out.includes(m)) out.push(m);
  }
  return out.length ? out : ['solar', 'fast'];
}

/**
 * Code-Teil: normalizeBool
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeBool(raw, fallback) {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const s = String(raw === null || raw === undefined ? '' : raw).trim().toLowerCase();
  if (['true', '1', 'yes', 'ja', 'on', 'active', 'aktiv', 'enabled'].includes(s)) return true;
  if (['false', '0', 'no', 'nein', 'off', 'inactive', 'inaktiv', 'disabled'].includes(s)) return false;
  return !!fallback;
}

/**
 * Code-Teil: normalizeTimeoutSec
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeTimeoutSec(raw, fallback = DEFAULT_WATCHDOG_TIMEOUT_SEC) {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(10, Math.min(600, Math.round(n))) : fallback;
}

/**
 * Code-Teil: normalizeRefreshSec
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeRefreshSec(raw, fallback = 3) {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(1, Math.min(30, Math.round(n))) : fallback;
}

/**
 * Code-Teil: normalizeLayoutMode
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeLayoutMode(raw, connectorCount = 0) {
  const s = String(raw || 'auto').trim().toLowerCase();
  if (['auto', 'single', 'dual', 'quad', 'compact'].includes(s)) return s;
  if (s === '1' || s === 'one') return 'single';
  if (s === '2' || s === 'two') return 'dual';
  if (s === '4' || s === 'four') return 'quad';
  if (connectorCount <= 1) return 'single';
  if (connectorCount === 2) return 'dual';
  if (connectorCount >= 4) return 'quad';
  return 'auto';
}

/**
 * Herstellerneutrale Steuerbrücke für das Stationsdisplay.
 *
 * Wichtig für EOS: Das Display darf nicht auf ein einzelnes Protokoll wie OCPP
 * fest verdrahtet werden. Die physischen Ladepunkte können später per OCPP,
 * Modbus, MQTT, Herstelleradapter, NexoWatt-Devices oder ioBroker-Alias angebunden
 * sein. Das Display schreibt deshalb nur in die generische EMS-/Charging-Schicht.
 */
function normalizeControlBridge(raw) {
  const s = String(raw || 'charging-management').trim().toLowerCase();
  if (['charging-management', 'chargingmanagement', 'ems', 'ems-intent', 'generic-ems'].includes(s)) return 'charging-management';
  if (['generic', 'command-state', 'commandstate', 'json'].includes(s)) return 'generic';
  // Reserviert für spätere Spezialbrücken. Noch nicht produktiv direkt schreiben.
  if (['ocpp', 'modbus', 'mqtt', 'vendor', 'nexowatt-devices'].includes(s)) return s;
  return 'charging-management';
}

/**
 * Code-Teil: normalizeProtocolHint
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeProtocolHint(raw) {
  const s = String(raw || 'manufacturer-open').trim().toLowerCase();
  return (s || 'manufacturer-open').slice(0, 64);
}

/**
 * Code-Teil: normalizeStation
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeStation(row, index, globalCfg) {
  const r = row && typeof row === 'object' ? row : {};
  const fallbackId = `dc_station_${Math.max(1, Number(index) + 1)}`;
  const id = toSafeId(r.id || r.key || r.stationId || fallbackId);
  const name = String(r.name || r.label || `DC Ladestation ${Number(index) + 1}`).trim();
  const typeRaw = String(r.type || r.stationType || 'dc').trim().toLowerCase();
  const type = typeRaw === 'ac' ? 'ac' : 'dc';
  const token = String(r.token || r.displayToken || '').trim();
  const enabled = r.enabled !== false;
  const maintenanceMode = normalizeBool(r.maintenanceMode ?? r.serviceMode ?? r.locked, false);
  const assignedChargepoints = normalizeAssignedChargepoints(r.assignedChargepoints || r.chargepoints || r.lps || r.connectors || []);
  const allowedModes = normalizeAllowedModes(r.allowedModes || r.modes || ['solar', 'fast']);
  const timeoutSec = normalizeTimeoutSec(
    r.watchdogTimeoutSec ?? r.heartbeatTimeoutSec ?? r.displayWatchdogTimeoutSec ?? globalCfg.watchdogTimeoutSec ?? globalCfg.heartbeatTimeoutSec,
    normalizeTimeoutSec(globalCfg.watchdogTimeoutSec ?? globalCfg.heartbeatTimeoutSec, DEFAULT_WATCHDOG_TIMEOUT_SEC)
  );
  return {
    id,
    name,
    type,
    token,
    enabled,
    maintenanceMode,
    displayMode: 'station',
    assignedChargepoints,
    allowedModes,
    showPrice: r.showPrice !== false,
    showSolarShare: r.showSolarShare !== false,
    allowStartStop: r.allowStartStop !== false,
    languageMode: String(r.languageMode || r.defaultLanguage || 'system'),
    theme: String(r.theme || 'nexowatt-dark-touch'),
    watchdogTimeoutSec: timeoutSec,
    displayRefreshSec: normalizeRefreshSec(r.displayRefreshSec ?? globalCfg.displayRefreshSec, normalizeRefreshSec(globalCfg.displayRefreshSec, 3)),
    // 0.8.18 nutzte im App-Center teilweise displayLayout; 0.8.19 akzeptiert beide Namen.
    layoutMode: normalizeLayoutMode(r.layoutMode ?? r.displayLayout, assignedChargepoints.length),
    showLanguageSwitch: normalizeBool(r.showLanguageSwitch ?? globalCfg.showLanguageSwitch, false),
    showSessionDetails: r.showSessionDetails !== false && r.showSessionValues !== false,
    // 0.8.19: bewusst herstellerneutral. Default bleibt die generische EMS-Schicht;
    // dahinter können OCPP, Modbus, MQTT, NexoWatt-Devices oder Herstelleradapter arbeiten.
    controlBridge: normalizeControlBridge(r.controlBridge ?? r.controlProvider ?? globalCfg.controlBridge),
    protocolHint: normalizeProtocolHint(r.protocolHint ?? r.protocol ?? globalCfg.protocolHint),
    // Optionaler Hersteller-/Gateway-Ausgang: frei mappbarer JSON-Command-State.
    // Damit kann ein externer Adapter die Display-Intents in OCPP, Modbus, MQTT, REST
    // oder eine Hersteller-API uebersetzen, ohne dass dieses Modul selbst OCPP spricht.
    commandStateId: String(r.commandStateId || r.commandObjectId || '').trim(),
  };
}

/**
 * Code-Teil: normalizeChargeKioskStations
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function normalizeChargeKioskStations(cfg) {
  const ck = cfg && typeof cfg === 'object' ? cfg : {};
  const rows = Array.isArray(ck.stations) ? ck.stations : [];
  return rows.map((r, idx) => normalizeStation(r, idx, ck)).filter((s) => s && s.id);
}

/**
 * Code-Teil: ChargeKioskModule
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class ChargeKioskModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);
    this._known = new Set();
  }

  _config() {
    const cfg = this.adapter && this.adapter.config && this.adapter.config.chargeKiosk && typeof this.adapter.config.chargeKiosk === 'object'
      ? this.adapter.config.chargeKiosk
      : {};
    return cfg;
  }

  _stations() {
    return normalizeChargeKioskStations(this._config());
  }

  async init() {
    await this._ensureBaseStates();
    await this._publish('init');
  }

  async tick() {
    await this._publish('tick');
  }

  async _ensureBaseStates() {
    const a = this.adapter;
    if (!a || typeof a.setObjectNotExistsAsync !== 'function') return;
    await a.setObjectNotExistsAsync('chargeKiosk', { type: 'channel', common: { name: 'EOS DC Station Display' }, native: {} });
    await a.setObjectNotExistsAsync('chargeKiosk.stations', { type: 'channel', common: { name: 'Display-Stationen' }, native: {} });
    await a.setObjectNotExistsAsync('chargeKiosk.watchdog', { type: 'channel', common: { name: 'Display-Watchdog' }, native: {} });
/**
 * Code-Teil: mk
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const mk = async (id, name, type, role, unit, def) => {
      const common = { name, type, role, read: true, write: false };
      if (unit) common.unit = unit;
      if (def !== undefined) common.def = def;
      await a.setObjectNotExistsAsync(id, { type: 'state', common, native: {} });
    };
    await mk('chargeKiosk.enabled', 'Charge Kiosk / DC Station Display aktiv', 'boolean', 'indicator', '', false);
    await mk('chargeKiosk.stationCount', 'Anzahl Display-Stationen', 'number', 'value', '', 0);
    await mk('chargeKiosk.displayOnlineCount', 'Displays online', 'number', 'value', '', 0);
    await mk('chargeKiosk.displayOfflineCount', 'Displays offline', 'number', 'value', '', 0);
    await mk('chargeKiosk.maintenanceCount', 'Stationen im Wartungsmodus', 'number', 'value', '', 0);
    await mk('chargeKiosk.displayBasePath', 'Display-Basisroute', 'string', 'text', '', '/display/station/');
    await mk('chargeKiosk.stationsJson', 'Stationen JSON ohne Token', 'string', 'json', '', '[]');
    await mk('chargeKiosk.watchdog.status', 'Watchdog-Status', 'string', 'text', '', 'init');
    await mk('chargeKiosk.watchdog.summaryJson', 'Watchdog-Zusammenfassung JSON', 'string', 'json', '', '{}');
    await mk('chargeKiosk.sessionSummaryJson', 'Betreiber-/Session-Übersicht JSON', 'string', 'json', '', '{}');
    await mk('chargeKiosk.backendSummaryJson', 'Hersteller-offene Steuerbackend-Übersicht JSON', 'string', 'json', '', '{}');
    await mk('chargeKiosk.lastNeutralCommandJson', 'Letztes neutrales Display-Kommando JSON', 'string', 'json', '', '{}');
    await mk('chargeKiosk.lastUpdate', 'Letzte Aktualisierung', 'number', 'value.time', '', 0);
    await mk('chargeKiosk.status', 'Status', 'string', 'text', '', 'init');
  }

  async _ensureStationStates(station) {
    const a = this.adapter;
    if (!a || !station) return null;
    const id = toSafeId(station.id);
    const base = `chargeKiosk.stations.${id}`;
    if (!this._known.has(base)) {
      await a.setObjectNotExistsAsync(base, { type: 'channel', common: { name: station.name || id }, native: {} });
/**
 * Code-Teil: mk
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
      const mk = async (suffix, name, type, role, unit, def) => {
        const common = { name, type, role, read: true, write: false };
        if (unit) common.unit = unit;
        if (def !== undefined) common.def = def;
        await a.setObjectNotExistsAsync(`${base}.${suffix}`, { type: 'state', common, native: {} });
      };
      await mk('name', 'Stationsname', 'string', 'text', '', '');
      await mk('enabled', 'Station aktiv', 'boolean', 'indicator', '', false);
      await mk('type', 'Stationstyp', 'string', 'text', '', 'dc');
      await mk('tokenPresent', 'Display-Token vorhanden', 'boolean', 'indicator', '', false);
      await mk('assignedChargepointsJson', 'Zugeordnete Ladepunkte JSON', 'string', 'json', '', '[]');
      await mk('allowedModesJson', 'Erlaubte Display-Modi JSON', 'string', 'json', '', '["solar","fast"]');
      await mk('displayUrl', 'Display-URL', 'string', 'text', '', '');
      await mk('connectorCount', 'Zugeordnete Connectoren', 'number', 'value', '', 0);
      await mk('layoutMode', 'Display-Layoutmodus', 'string', 'text', '', 'auto');
      await mk('maintenanceMode', 'Wartungsmodus', 'boolean', 'indicator.maintenance', '', false);
      await mk('displayOnline', 'Display online', 'boolean', 'indicator', '', false);
      await mk('displayStatus', 'Display-Status', 'string', 'text', '', 'unknown');
      await mk('displayWarning', 'Display-Warnung', 'string', 'text', '', '');
      await mk('watchdogAgeSec', 'Watchdog Alter', 'number', 'value.interval', 's', 0);
      await mk('watchdogTimeoutSec', 'Watchdog Timeout', 'number', 'value.interval', 's', DEFAULT_WATCHDOG_TIMEOUT_SEC);
      await mk('displayRefreshSec', 'Display Refresh', 'number', 'value.interval', 's', 3);
      await mk('showLanguageSwitch', 'Sprachwahl am Display sichtbar', 'boolean', 'indicator', '', false);
      await mk('controlBridge', 'Herstellerneutrale Steuerbrücke', 'string', 'text', '', 'charging-management');
      await mk('protocolHint', 'Protokoll-Hinweis der Station', 'string', 'text', '', 'manufacturer-open');
      await mk('commandStatePresent', 'Generischer Command-State vorhanden', 'boolean', 'indicator', '', false);
      await mk('commandStateIdMasked', 'Generischer Command-State maskiert', 'string', 'text', '', '');
      await mk('lastHeartbeat', 'Letzter Display Heartbeat', 'number', 'value.time', '', 0);
      await mk('lastTouch', 'Letzter Touch', 'number', 'value.time', '', 0);
      await mk('lastPayloadAt', 'Letzte Display-Payload', 'number', 'value.time', '', 0);
      await mk('lastDisplayInfoJson', 'Letzte Display-Info JSON', 'string', 'json', '', '{}');
      await mk('lastCommand', 'Letzter Display-Befehl', 'string', 'text', '', '');
      await mk('lastCommandJson', 'Letzter Display-Befehl JSON', 'string', 'json', '', '{}');
      await mk('lastCommandPlanJson', 'Letzter herstellerneutraler Befehlsplan JSON', 'string', 'json', '', '{}');
      await mk('lastCommandResult', 'Letztes Display-Befehlsergebnis', 'string', 'text', '', '');
      await mk('operatorDayKey', 'Betreiber Tageskennung', 'string', 'text', '', '');
      await mk('sessionSummaryJson', 'Session-Zusammenfassung JSON', 'string', 'json', '', '{}');
      await mk('sessionSnapshotsJson', 'Aktuelle Session-Snapshots JSON', 'string', 'json', '', '[]');
      await mk('lastSessionJson', 'Letzte abgeschlossene/gestoppte Session JSON', 'string', 'json', '', '{}');
      await mk('lastSessionsByLpJson', 'Letzte Session je LP JSON', 'string', 'json', '', '{}');
      await mk('sessionExportJson', 'Session-/CSV-Exportbasis JSON', 'string', 'json', '', '{}');
      await mk('csvExportUrl', 'CSV-Export URL', 'string', 'text', '', '');
      await mk('operatorSummaryJson', 'Betreiber-Zusammenfassung JSON', 'string', 'json', '', '{}');
      await mk('operatorSessionsToday', 'Betreiber Sessions heute', 'number', 'value', '', 0);
      await mk('operatorKwhToday', 'Betreiber Energie heute', 'number', 'value.energy', 'kWh', 0);
      await mk('operatorSolarKwhToday', 'Betreiber Solarenergie heute', 'number', 'value.energy', 'kWh', 0);
      await mk('operatorGridKwhToday', 'Betreiber Netzenergie heute', 'number', 'value.energy', 'kWh', 0);
      await mk('operatorSolarShareTodayPercent', 'Betreiber Solaranteil heute', 'number', 'value', '%', 0);
      await mk('operatorCompletedRevenueToday', 'Betreiber Umsatz abgeschlossene Sessions heute', 'number', 'value.currency', '€', 0);
      await mk('operatorRevenueToday', 'Betreiber Umsatz heute', 'number', 'value.currency', '€', 0);
      await mk('operatorMaxKwToday', 'Betreiber Tagesmaximum', 'number', 'value.power', 'kW', 0);
      await mk('operatorExportReady', 'Betreiber CSV-Export bereit', 'boolean', 'indicator', '', false);
      await mk('operatorLastSessionCount', 'Letzte Sessions je LP Anzahl', 'number', 'value', '', 0);
      await mk('operatorLastSessionUpdatedAt', 'Letzte Session-Aktualisierung', 'number', 'value.time', '', 0);
      await mk('csvExportReady', 'CSV-Export bereit', 'boolean', 'indicator', '', false);
      await mk('sessionDiagnosticsJson', 'Session-Diagnose JSON', 'string', 'json', '', '{}');
      this._known.add(base);
    }
    const now = Date.now();
    const hb = await this._readNumber(`${base}.lastHeartbeat`, 0);
    const timeoutSec = normalizeTimeoutSec(station.watchdogTimeoutSec, DEFAULT_WATCHDOG_TIMEOUT_SEC);
    const ageSec = hb > 0 ? Math.max(0, Math.round((now - hb) / 1000)) : 0;
    const online = hb > 0 && ageSec <= timeoutSec;
    let displayStatus = 'offline';
    if (!station.enabled) displayStatus = 'disabled';
    else if (station.maintenanceMode) displayStatus = 'maintenance';
    else if (!station.token) displayStatus = 'missing-token';
    else if (!station.assignedChargepoints || !station.assignedChargepoints.length) displayStatus = 'missing-lp';
    else if (online) displayStatus = 'online';
    const displayWarning = displayStatus === 'offline'
      ? `Display seit ${ageSec}s ohne Heartbeat.`
      : (displayStatus === 'maintenance'
        ? 'Station im Wartungsmodus.'
        : (displayStatus === 'missing-token'
          ? 'Display-Token fehlt.'
          : (displayStatus === 'missing-lp' ? 'Keine LPs/Connectoren zugeordnet.' : '')));
    await a.setStateAsync(`${base}.name`, { val: station.name || id, ack: true });
    await a.setStateAsync(`${base}.enabled`, { val: !!station.enabled, ack: true });
    await a.setStateAsync(`${base}.type`, { val: station.type || 'dc', ack: true });
    await a.setStateAsync(`${base}.tokenPresent`, { val: !!station.token, ack: true });
    await a.setStateAsync(`${base}.assignedChargepointsJson`, { val: JSON.stringify(station.assignedChargepoints || []), ack: true });
    await a.setStateAsync(`${base}.allowedModesJson`, { val: JSON.stringify(station.allowedModes || []), ack: true });
    await a.setStateAsync(`${base}.displayUrl`, { val: station.token ? `/display/station/${encodeURIComponent(station.token)}` : '', ack: true });
    await a.setStateAsync(`${base}.connectorCount`, { val: Array.isArray(station.assignedChargepoints) ? station.assignedChargepoints.length : 0, ack: true });
    await a.setStateAsync(`${base}.layoutMode`, { val: station.layoutMode || normalizeLayoutMode('auto', (station.assignedChargepoints || []).length), ack: true });
    await a.setStateAsync(`${base}.maintenanceMode`, { val: !!station.maintenanceMode, ack: true });
    await a.setStateAsync(`${base}.watchdogTimeoutSec`, { val: timeoutSec, ack: true });
    await a.setStateAsync(`${base}.displayRefreshSec`, { val: normalizeRefreshSec(station.displayRefreshSec, 3), ack: true });
    await a.setStateAsync(`${base}.showLanguageSwitch`, { val: !!station.showLanguageSwitch, ack: true });
    await a.setStateAsync(`${base}.controlBridge`, { val: station.controlBridge || 'charging-management', ack: true });
    await a.setStateAsync(`${base}.protocolHint`, { val: station.protocolHint || 'manufacturer-open', ack: true });
    await a.setStateAsync(`${base}.commandStatePresent`, { val: !!station.commandStateId, ack: true });
    await a.setStateAsync(`${base}.commandStateIdMasked`, { val: station.commandStateId ? station.commandStateId.replace(/[^.]+$/, '***') : '', ack: true });
    await a.setStateAsync(`${base}.watchdogAgeSec`, { val: ageSec, ack: true });
    await a.setStateAsync(`${base}.displayOnline`, { val: !!online, ack: true });
    await a.setStateAsync(`${base}.displayStatus`, { val: displayStatus, ack: true });
    await a.setStateAsync(`${base}.displayWarning`, { val: displayWarning, ack: true });

    // 0.8.19 Betreiberbasis: Die Display-API schreibt sessionSummaryJson.
    // Dieses Modul spiegelt daraus kleine, leicht lesbare Betreiberstates, ohne
    // selbst Ladeprotokolle auszuwerten oder an OCPP gebunden zu sein.
    try {
      const rawSummary = this._state(`${base}.sessionSummaryJson`, '{}');
      const parsed = JSON.parse(String(rawSummary || '{}'));
      const connectors = Array.isArray(parsed.connectors) ? parsed.connectors : [];
      const snapshots = connectors.filter((c) => c && (Number(c.energyKwh) > 0 || c.status === 'charging'));
      const last = connectors.slice().reverse().find((c) => c && c.lastSession) || null;
      const operator = parsed.operator && typeof parsed.operator === 'object' ? parsed.operator : {};
      const dayKey = String(parsed.dayKey || operator.dayKey || '').trim();
      const lastByLp = operator.lastSessionsByLp && typeof operator.lastSessionsByLp === 'object'
        ? operator.lastSessionsByLp
        : {};
      await a.setStateAsync(`${base}.operatorDayKey`, { val: dayKey, ack: true });
      await a.setStateAsync(`${base}.sessionSnapshotsJson`, { val: JSON.stringify(snapshots), ack: true });
      await a.setStateAsync(`${base}.lastSessionJson`, { val: JSON.stringify(last ? last.lastSession : {}), ack: true });
      await a.setStateAsync(`${base}.lastSessionsByLpJson`, { val: JSON.stringify(lastByLp), ack: true });
      await a.setStateAsync(`${base}.sessionExportJson`, { val: JSON.stringify({ ts: Date.now(), dayKey, stationId: id, operator, snapshots, lastSessionsByLp: lastByLp }), ack: true });
      await a.setStateAsync(`${base}.csvExportUrl`, { val: station.token ? `/api/display/station/${encodeURIComponent(station.token)}/operator.csv` : '', ack: true });
      await a.setStateAsync(`${base}.operatorSummaryJson`, { val: JSON.stringify(operator), ack: true });
      await a.setStateAsync(`${base}.operatorSessionsToday`, { val: Number(operator.completedSessionsToday) || 0, ack: true });
      await a.setStateAsync(`${base}.operatorKwhToday`, { val: Number(operator.energyTodayKwh) || 0, ack: true });
      await a.setStateAsync(`${base}.operatorSolarKwhToday`, { val: Number(operator.solarEnergyTodayKwh) || 0, ack: true });
      await a.setStateAsync(`${base}.operatorGridKwhToday`, { val: Number(operator.gridEnergyTodayKwh) || 0, ack: true });
      await a.setStateAsync(`${base}.operatorSolarShareTodayPercent`, { val: Number(operator.solarShareTodayPercent) || 0, ack: true });
      await a.setStateAsync(`${base}.operatorCompletedRevenueToday`, { val: Number(operator.completedRevenueTodayEur) || 0, ack: true });
      await a.setStateAsync(`${base}.operatorRevenueToday`, { val: Number(operator.currentRevenueEur || operator.revenueEur) || 0, ack: true });
      await a.setStateAsync(`${base}.operatorMaxKwToday`, { val: Number(operator.maxKwToday) || 0, ack: true });
      await a.setStateAsync(`${base}.operatorExportReady`, { val: !!station.token, ack: true });
      await a.setStateAsync(`${base}.operatorLastSessionCount`, { val: Object.keys(lastByLp || {}).length, ack: true });
      await a.setStateAsync(`${base}.operatorLastSessionUpdatedAt`, { val: Date.now(), ack: true });
      await a.setStateAsync(`${base}.csvExportReady`, { val: !!station.token, ack: true });
      await a.setStateAsync(`${base}.sessionDiagnosticsJson`, { val: JSON.stringify({ ts: Date.now(), dayKey, lastSessionCount: Object.keys(lastByLp || {}).length, exportReady: !!station.token, schema: 'nexowatt.dc.operator-export.v2' }), ack: true });
    } catch (_e) {
      await a.setStateAsync(`${base}.sessionSnapshotsJson`, { val: '[]', ack: true });
      await a.setStateAsync(`${base}.lastSessionJson`, { val: '{}', ack: true });
      await a.setStateAsync(`${base}.lastSessionsByLpJson`, { val: '{}', ack: true });
      await a.setStateAsync(`${base}.sessionExportJson`, { val: '{}', ack: true });
      await a.setStateAsync(`${base}.operatorSummaryJson`, { val: '{}', ack: true });
      await a.setStateAsync(`${base}.operatorSessionsToday`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorKwhToday`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorSolarKwhToday`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorGridKwhToday`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorSolarShareTodayPercent`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorCompletedRevenueToday`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorRevenueToday`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorMaxKwToday`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorExportReady`, { val: false, ack: true });
      await a.setStateAsync(`${base}.operatorLastSessionCount`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.operatorLastSessionUpdatedAt`, { val: 0, ack: true });
      await a.setStateAsync(`${base}.csvExportReady`, { val: false, ack: true });
      await a.setStateAsync(`${base}.sessionDiagnosticsJson`, { val: '{}', ack: true });
    }
    return { id, base, hb, timeoutSec, ageSec, online, displayStatus, displayWarning };
  }

  async _readNumber(id, fallback) {
    try {
      const st = await this.adapter.getStateAsync(id);
      const n = Number(st && st.val);
      return Number.isFinite(n) ? n : fallback;
    } catch (_e) {
      return fallback;
    }
  }

  async _publish(reason) {
    const a = this.adapter;
    if (!a) return;
    const cfg = this._config();
    const stations = this._stations();
    const enabled = cfg.enabled === true || stations.some((s) => s.enabled && s.token && s.assignedChargepoints.length);
    const now = Date.now();
    try {
      await this._ensureBaseStates();
      const diagById = {};
      for (const station of stations) {
        const d = await this._ensureStationStates(station);
        if (d) diagById[station.id] = d;
      }
      const onlineCount = stations.filter((s) => diagById[s.id] && diagById[s.id].online).length;
      const actionableStations = stations.filter((s) => s.enabled && !s.maintenanceMode && s.token && s.assignedChargepoints.length);
      const offlineCount = actionableStations.filter((s) => !(diagById[s.id] && diagById[s.id].online)).length;
      const maintenanceCount = stations.filter((s) => s.maintenanceMode).length;
      let watchdogStatus = 'ok';
      if (!enabled) watchdogStatus = 'disabled';
      else if (offlineCount > 0) watchdogStatus = 'warn-offline';
      else if (maintenanceCount > 0) watchdogStatus = 'maintenance';
      const publicStations = stations.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        enabled: !!s.enabled,
        maintenanceMode: !!s.maintenanceMode,
        tokenPresent: !!s.token,
        assignedChargepoints: s.assignedChargepoints,
        allowedModes: s.allowedModes,
        showPrice: !!s.showPrice,
        showSolarShare: !!s.showSolarShare,
        allowStartStop: !!s.allowStartStop,
        watchdogTimeoutSec: s.watchdogTimeoutSec,
        displayRefreshSec: s.displayRefreshSec,
        layoutMode: s.layoutMode || 'auto',
        showLanguageSwitch: !!s.showLanguageSwitch,
        controlBridge: s.controlBridge || 'charging-management',
        protocolHint: s.protocolHint || 'manufacturer-open',
        commandStatePresent: !!s.commandStateId,
        connectorCount: Array.isArray(s.assignedChargepoints) ? s.assignedChargepoints.length : 0,
        displayUrl: s.token ? `/display/station/${encodeURIComponent(s.token)}` : '',
        displayOnline: !!(diagById[s.id] && diagById[s.id].online),
        displayStatus: (diagById[s.id] && diagById[s.id].displayStatus) || 'unknown',
        displayWarning: (diagById[s.id] && diagById[s.id].displayWarning) || '',
        watchdogAgeSec: (diagById[s.id] && diagById[s.id].ageSec) || 0,
      }));
      const summary = {
        generatedAt: now,
        enabled: !!enabled,
        stationCount: stations.length,
        onlineCount,
        offlineCount,
        maintenanceCount,
        status: watchdogStatus,
        stations: publicStations,
      };
      const backendSummary = {
        generatedAt: now,
        principle: 'manufacturer-open',
        note: 'Display commands are neutral NexoWatt intents; OCPP/Modbus/MQTT/REST/vendor adapters are downstream execution backends.',
        stations: publicStations.map((station) => ({
          id: station.id,
          name: station.name,
          controlBridge: station.controlBridge || 'charging-management',
          protocolHint: station.protocolHint || 'manufacturer-open',
        })),
      };
      await a.setStateAsync('chargeKiosk.enabled', { val: !!enabled, ack: true });
      await a.setStateAsync('chargeKiosk.stationCount', { val: stations.length, ack: true });
      await a.setStateAsync('chargeKiosk.displayOnlineCount', { val: onlineCount, ack: true });
      await a.setStateAsync('chargeKiosk.displayOfflineCount', { val: offlineCount, ack: true });
      await a.setStateAsync('chargeKiosk.maintenanceCount', { val: maintenanceCount, ack: true });
      await a.setStateAsync('chargeKiosk.stationsJson', { val: JSON.stringify(publicStations), ack: true });
      await a.setStateAsync('chargeKiosk.watchdog.status', { val: watchdogStatus, ack: true });
      await a.setStateAsync('chargeKiosk.watchdog.summaryJson', { val: JSON.stringify(summary), ack: true });
      await a.setStateAsync('chargeKiosk.backendSummaryJson', { val: JSON.stringify(backendSummary), ack: true });
      await a.setStateAsync('chargeKiosk.lastUpdate', { val: now, ack: true });
      await a.setStateAsync('chargeKiosk.status', { val: reason || 'ok', ack: true });
    } catch (e) {
      try { await a.setStateAsync('chargeKiosk.status', { val: `error: ${e && e.message ? e.message : e}`, ack: true }); } catch (_e) {}
    }
  }
}

module.exports = { ChargeKioskModule, normalizeChargeKioskStations };
