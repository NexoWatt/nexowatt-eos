/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Kapselt die Verbindung zur Adapter-Instanz und die geschützten Anmelde-, Konfigurations- und SMTP-API-Aufrufe.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-admin-tab/src/lib/adminConnection.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: src-admin-tab/src/lib/adminConnection.ts
 * Rolle im Projekt: Admin-React-Quelle.
 * Zweck: React-Quellcode für ioBroker-Admin-Tab und Installer-Einstiegsseiten.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Status: Diese Admin-Quelle ist auf .ts/.tsx umgestellt; der Browser erhält weiterhin ein gebautes JS-Bundle.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Quellcode der React-Admin-Tab-Oberfläche.
 * Zusammenhänge:
 * - Baut nach admin/react/ und öffnet Installer-/Lizenz-/Redirect-Seiten.
 * - Kommuniziert über AdminConnection/ioBroker Admin APIs.
 * Wartungshinweise:
 * - Bei UI-Änderungen anschließend admin:build ausführen.
 */

const ADAPTER_NAME = 'nexowatt-ui';
const DEFAULT_PORT = 8188;
const ADMIN_CALL_TIMEOUT_MS = 5000;
const RUNTIME_FETCH_TIMEOUT_MS = 1500;
/**
 * Code-Teil: withTimeout
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function withTimeout(promise, ms, label) {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label || 'Aufruf'} Timeout`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
/**
 * Code-Teil: callbackPromise
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function callbackPromise(fn, label, ms = ADMIN_CALL_TIMEOUT_MS) {
  return withTimeout(new Promise((resolve, reject) => {
    try {
      fn((err, value) => (err ? reject(err) : resolve(value || null)));
    } catch (error) {
      reject(error);
    }
  }), ms, label);
}

/**
 * Code-Teil: getInstance
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export function getInstance() {
  try {
    return new URLSearchParams(window.location.search || '').get('instance') || '0';
  } catch {
    return '0';
  }
}

/**
 * Code-Teil: getAdapterObjectId
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export function getAdapterObjectId(instance = getInstance()) {
  return `system.adapter.${ADAPTER_NAME}.${instance}`;
}

/**
 * Code-Teil: buildRuntimeBaseUrl
 * Zweck: Erzeugt UI-/Konfigurations- oder Datenstruktur.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export function buildRuntimeBaseUrl(port = DEFAULT_PORT) {
  const protocol = window.location.protocol || 'http:';
  const host = window.location.hostname || 'localhost';
  return `${protocol}//${host}:${port}`;
}
/**
 * Code-Teil: safeWindowAccess
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function safeWindowAccess(getter) {
  try {
    return getter();
  } catch {
    return null;
  }
}
/**
 * Code-Teil: isErrorLike
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function isErrorLike(value) {
  if (!value) return false;
  if (value instanceof Error) return true;
  if (typeof value === 'string') return true;
  if (typeof value !== 'object') return false;

  // ioBroker objects/states can contain "message" in common/native data.
  // Treat an object as error only if it does NOT look like a normal object/state.
  const looksLikeIoBrokerObject = value._id || value.type || value.common || value.native;
  const looksLikeState = Object.prototype.hasOwnProperty.call(value, 'val') || Object.prototype.hasOwnProperty.call(value, 'ack');
  if (looksLikeIoBrokerObject || looksLikeState) return false;

  return !!(value.error || value.err || value.message);
}
/**
 * Code-Teil: normalizeIoBrokerCallback
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function normalizeIoBrokerCallback(cb) {
  return (arg1, arg2) => {
    // ioBroker admin APIs are inconsistent across versions:
    //   callback(obj) / callback(state)
    //   callback(err, obj) / callback(err, state)
    // Support both, otherwise the license page can hang or misread the UUID.
    if (arg2 !== undefined) {
      cb(isErrorLike(arg1) ? arg1 : null, arg2 || null);
      return;
    }
    if (isErrorLike(arg1)) {
      cb(arg1, null);
      return;
    }
    cb(null, arg1 || null);
  };
}
/**
 * Code-Teil: pickServConn
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function pickServConn() {
  return (
    safeWindowAccess(() => window.servConn)
    || safeWindowAccess(() => window.parent && window.parent.servConn)
    || safeWindowAccess(() => window.top && window.top.servConn)
    || null
  );
}
/**
 * Code-Teil: pickSocket
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function pickSocket() {
  return (
    safeWindowAccess(() => window.socket)
    || safeWindowAccess(() => window.parent && window.parent.socket)
    || safeWindowAccess(() => window.top && window.top.socket)
    || safeWindowAccess(() => window.__nwAdminSocket)
    || null
  );
}
/**
 * Code-Teil: ensureSocketIo
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function ensureSocketIo() {
  if (window.io || pickSocket()) {
    return true;
  }

  if (typeof window.__nwSocketLoader === 'function') {
    try {
      await window.__nwSocketLoader();
    } catch {
      return false;
    }
  }

  return !!window.io || !!pickSocket();
}
/**
 * Code-Teil: wrapServConn
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function wrapServConn(servConn) {
  return {
    type: 'servConn',
    /**
     * Code-Teil: getObject
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    getObject(id, cb) {
      try {
        servConn.getObject(id, normalizeIoBrokerCallback(cb));
      } catch (error) {
        cb(error, null);
      }
    },
    /**
     * Code-Teil: Methode `getState`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt an Admin-/JSONConfig-Bridge und Installer-Weiterleitungen; Änderungen müssen mit admin/* und main.js kompatibel bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: getState
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    getState(id, cb) {
      if (typeof servConn.getState !== 'function') {
        cb(null, null);
        return;
      }
      try {
        servConn.getState(id, normalizeIoBrokerCallback(cb));
      } catch (error) {
        cb(error, null);
      }
    },
    /**
     * Code-Teil: Methode `setObject`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an Admin-/JSONConfig-Bridge und Installer-Weiterleitungen; Änderungen müssen mit admin/* und main.js kompatibel bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setObject
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    setObject(id, obj, cb) {
      try {
        servConn.setObject(id, obj, err => cb(err || null));
      } catch (error) {
        cb(error);
      }
    },
  };
}
/**
 * Code-Teil: wrapSocket
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function wrapSocket(socket) {
  return {
    type: 'socket',
    /**
     * Code-Teil: getObject
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    getObject(id, cb) {
      try {
        socket.emit('getObject', id, normalizeIoBrokerCallback(cb));
      } catch (error) {
        cb(error, null);
      }
    },
    /**
     * Code-Teil: Methode `getState`
     * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
     * Zusammenhang: Hängt an Admin-/JSONConfig-Bridge und Installer-Weiterleitungen; Änderungen müssen mit admin/* und main.js kompatibel bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: getState
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    getState(id, cb) {
      try {
        socket.emit('getState', id, normalizeIoBrokerCallback(cb));
      } catch (error) {
        cb(error, null);
      }
    },
    /**
     * Code-Teil: Methode `setObject`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an Admin-/JSONConfig-Bridge und Installer-Weiterleitungen; Änderungen müssen mit admin/* und main.js kompatibel bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setObject
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    setObject(id, obj, cb) {
      try {
        socket.emit('setObject', id, obj, result => {
          if (!result || result === true) {
            cb(null);
            return;
          }
          if (typeof result === 'string') {
            cb(result);
            return;
          }
          if (typeof result === 'object' && result.error) {
            cb(result.error);
            return;
          }
          cb(null);
        });
      } catch (error) {
        cb(error);
      }
    },
  };
}

/**
 * Code-Teil: getAdminConnection
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export async function getAdminConnection() {
  const servConn = pickServConn();
  if (servConn && typeof servConn.getObject === 'function' && typeof servConn.setObject === 'function') {
    return wrapServConn(servConn);
  }

  const socketAlreadyThere = pickSocket();
  if (socketAlreadyThere?.emit) {
    return wrapSocket(socketAlreadyThere);
  }

  const socketIoLoaded = await withTimeout(ensureSocketIo(), 3000, 'socket.io Laden');
  if (!socketIoLoaded) {
    return null;
  }

  let socket = pickSocket();
  if (!socket && window.io && typeof window.io.connect === 'function') {
    window.__nwAdminSocket = window.__nwAdminSocket || window.io.connect();
    socket = window.__nwAdminSocket;
  }

  if (socket?.emit) {
    return wrapSocket(socket);
  }

  return null;
}

/**
 * Code-Teil: extractUuid
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export function extractUuid(obj) {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const seen = new Set();

  /**
   * Code-Teil: Arrow-Funktion `scan`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an Admin-/JSONConfig-Bridge und Installer-Weiterleitungen; Änderungen müssen mit admin/* und main.js kompatibel bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  const scan = (value, key = '') => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') {
      const v = value.trim();
      if (!v) return '';
      if (/uuid/i.test(key) || uuidRe.test(v)) return v;
      return '';
    }
    if (typeof value !== 'object') return '';
    if (seen.has(value)) return '';
    seen.add(value);

    const preferredKeys = ['uuid', 'UUID', '_uuid', 'systemUuid', 'systemUUID', 'val', 'value'];
    for (const k of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, k)) {
        const found = scan(value[k], k);
        if (found) return found;
      }
    }
    for (const [k, v] of Object.entries(value)) {
      const found = scan(v, k);
      if (found) return found;
    }
    return '';
  };

  return scan(obj);
}

/**
 * Code-Teil: getObject
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export async function getObject(id, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn) {
    throw new Error('Admin-Verbindung nicht verfügbar');
  }
  return callbackPromise(cb => resolvedConn.getObject(id, cb), `getObject ${id}`);
}

/**
 * Code-Teil: getState
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export async function getState(id, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn || typeof resolvedConn.getState !== 'function') {
    return null;
  }
  return callbackPromise(cb => resolvedConn.getState(id, cb), `getState ${id}`);
}

/**
 * Code-Teil: setObject
 * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export async function setObject(id, obj, conn = null) {
  const resolvedConn = conn || (await getAdminConnection());
  if (!resolvedConn) {
    throw new Error('Admin-Verbindung nicht verfügbar');
  }
  await callbackPromise(cb => resolvedConn.setObject(id, obj, cb), `setObject ${id}`);
}

/**
 * Code-Teil: readAdapterPort
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export async function readAdapterPort(instance = getInstance(), conn = null) {
  try {
    const adapterObj = await getObject(getAdapterObjectId(instance), conn);
    const port = Number(adapterObj?.native?.port);
    return Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

/**
 * Code-Teil: readSystemUuid
 * Zweck: Liest Werte mit Fallbacks aus Cache/State/Config.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export async function readSystemUuid(conn = null, instance = getInstance()) {
  const adapterBase = `${ADAPTER_NAME}.${instance}.license.uuid`;

  try {
    const metaObject = await getObject('system.meta.uuid', conn);
    const fromObject = extractUuid(metaObject);
    if (fromObject) return String(fromObject).trim();
  } catch {
    // ignore and continue with state fallback
  }

  try {
    const state = await getState('system.meta.uuid', conn);
    if (state?.val !== undefined && state?.val !== null && String(state.val).trim()) {
      return String(state.val).trim();
    }
  } catch {
    // ignore and continue with system.config fallback
  }

  try {
    const systemConfig = await getObject('system.config', conn);
    const nativeUuid = systemConfig?.native?.uuid || systemConfig?.native?.UUID || systemConfig?.common?.uuid || systemConfig?.common?.UUID;
    if (nativeUuid) return String(nativeUuid).trim();
  } catch {
    // ignore and continue with adapter-published fallback
  }

  try {
    const adapterUuidState = await getState(adapterBase, conn);
    if (adapterUuidState?.val !== undefined && adapterUuidState?.val !== null && String(adapterUuidState.val).trim()) {
      return String(adapterUuidState.val).trim();
    }
  } catch {
    // ignore
  }

  return '';
}
/**
 * Code-Teil: fetchJsonWithTimeout
 * Zweck: Holt Daten über HTTP/API oder aus externen Quellen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function fetchJsonWithTimeout(url, ms = RUNTIME_FETCH_TIMEOUT_MS, options = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  try {
    if (controller) timer = setTimeout(() => controller.abort(), ms);
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      credentials: options.credentials || 'omit',
      headers: options.headers || undefined,
      signal: controller ? controller.signal : undefined,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.ok === false) {
      const error = new Error(json?.message || json?.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = json;
      throw error;
    }
    return json;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
/**
 * Code-Teil: postJsonWithTimeout
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function postJsonWithTimeout(url, payload, ms = RUNTIME_FETCH_TIMEOUT_MS, options = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  try {
    if (controller) timer = setTimeout(() => controller.abort(), ms);
    const response = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      credentials: options.credentials || 'omit',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: JSON.stringify(payload || {}),
      signal: controller ? controller.signal : undefined,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.ok === false) {
      const error = new Error(json?.message || json?.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.payload = json;
      throw error;
    }
    return json;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Liefert die möglichen Runtime-Ports in stabiler Reihenfolge. Der Standardport
 * wird zuerst probiert, damit die EOS-Anmeldung nicht von einer langsamen
 * Admin-Socket-Verbindung abhängt.
 */
async function getRuntimePorts(instance = getInstance(), conn = null) {
  if ((window.location.pathname.startsWith('/mail-setup') || window.location.pathname.startsWith('/mesh-setup') || window.location.pathname.startsWith('/ems/microgrid'))) return [Number(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80)];
  const ports = [DEFAULT_PORT];
  try {
    const configuredPort = await withTimeout(readAdapterPort(instance, conn), 1200, 'Adapter-Port lesen');
    if (configuredPort) ports.push(configuredPort);
  } catch {
    // Der Standardport bleibt als fail-closed Versuch erhalten.
  }
  return ports.filter((port, index, rows) => port && rows.indexOf(port) === index);
}

/** Prüft die strikt rollenpflichtige EOS-Session für geschützte Admin-Seiten. */
export async function readRuntimeAuthStatus(instance = getInstance(), conn = null) {
  let lastError = null;
  for (const port of await getRuntimePorts(instance, conn)) {
    try {
      return await fetchJsonWithTimeout(
        `${buildRuntimeBaseUrl(port)}/api/strict-auth/status?instance=${encodeURIComponent(instance)}&t=${Date.now()}`,
        3500,
        { credentials: 'include' }
      );
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  throw new Error('EOS-Authentifizierung nicht erreichbar.');
}

/** Meldet einen Installer/Admin über den strikt rollenpflichtigen EOS-Endpunkt an. */
export async function loginRuntimeAuth(instance = getInstance(), user = '', password = '', conn = null) {
  let lastError = null;
  for (const port of await getRuntimePorts(instance, conn)) {
    try {
      return await postJsonWithTimeout(
        `${buildRuntimeBaseUrl(port)}/api/strict-auth/login?instance=${encodeURIComponent(instance)}&t=${Date.now()}`,
        { user: String(user || '').trim(), password: String(password || '') },
        6000,
        { credentials: 'include' }
      );
    } catch (error) {
      lastError = error;
      if (Number(error && error.status) === 401 || Number(error && error.status) === 403 || Number(error && error.status) === 429) throw error;
    }
  }
  if (lastError) throw lastError;
  throw new Error('EOS-Anmeldung nicht erreichbar.');
}

/** Beendet die Adapter-eigene EOS-Session auf allen erreichbaren Runtime-Ports. */
export async function logoutRuntimeAuth(instance = getInstance(), conn = null) {
  let succeeded = false;
  let lastError = null;
  for (const port of await getRuntimePorts(instance, conn)) {
    try {
      await postJsonWithTimeout(
        `${buildRuntimeBaseUrl(port)}/api/strict-auth/logout?instance=${encodeURIComponent(instance)}&t=${Date.now()}`,
        {},
        3500,
        { credentials: 'include' }
      );
      succeeded = true;
    } catch (error) {
      lastError = error;
    }
  }
  if (!succeeded && lastError) throw lastError;
  return { ok: true };
}

/**
 * Code-Teil: openExternal
 * Zweck: Öffnet Dialoge/Seiten/Popovers.
 * Zusammenhang: Teil von React-Admin-Quelle; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
export function openExternal(url) {
  try {
    window.top.location.href = url;
  } catch {
    window.location.href = url;
  }
}

/** Dedicated mail endpoint never returns the password to the browser. */
/**
 * Ablauf und Zusammenhang: Ruft den dedizierten Mail-Endpunkt der Adapter-Runtime mit EOS-Sitzung auf. Ohne Payload wird gelesen, mit Payload gespeichert; 400/401/403 werden sofort weitergegeben, statt durch einen anderen Port eine Autorisierung zu umgehen.
 */
export async function notificationMailRequest(payload = null) {
  const ports = await getRuntimePorts();
  let lastError = null;
  for (const port of ports) {
    try {
      const url = `${buildRuntimeBaseUrl(port)}/api/installer/notification-mail`;
      return payload === null
        ? await fetchJsonWithTimeout(url, 10000, { credentials: 'include' })
        : await postJsonWithTimeout(url, payload, 10000, { credentials: 'include' });
    } catch (error) {
      lastError = error;
      if ([400, 401, 403].includes(Number(error.status))) throw error;
    }
  }
  throw lastError || new Error('EOS-Mailkonfiguration nicht erreichbar.');
}

/** Geschützte Mesh-API; Schlüssel weder in URLs noch im Browser-Speicher ablegen. */
export async function meshCoordinatorRequest(suffix = '', payload = null) {
  const ports = await getRuntimePorts();
  let lastError = null;
  for (const port of ports) {
    try {
      const url = `${buildRuntimeBaseUrl(port)}/api/mesh/coordinator${suffix}`;
      return payload === null ? await fetchJsonWithTimeout(url, 10000, { credentials: 'include' })
        : await postJsonWithTimeout(url, payload, 10000, { credentials: 'include' });
    } catch (error) { lastError = error; if ([400, 401, 403, 404, 409, 422].includes(Number(error.status))) throw error; }
  }
  throw lastError || new Error('Microgrid nicht erreichbar.');
}
