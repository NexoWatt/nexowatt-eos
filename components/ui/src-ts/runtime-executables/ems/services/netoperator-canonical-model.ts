// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Normalisiert externe Netzbetreiber-Vorgaben in ein einheitliches, herstellerunabhängiges Datenmodell.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/netoperator-canonical-model.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * NexoWatt EOS Netzbetreiber-Schnittstelle – kanonisches Datenmodell.
 *
 * Die herstellerspezifischen Treiber liefern ausschließlich Werte für dieses
 * Modell. Der EOS-Core muss deshalb keine Register, Variablennamen, Skalierungen
 * oder Endianness einzelner Regler kennen.
 */

export type CanonicalDataType = 'boolean' | 'number' | 'string' | 'enum' | 'datetime';
export type CanonicalAccess = 'read' | 'write';

export interface CanonicalFieldDefinition {
  key: string;
  type: CanonicalDataType;
  access: CanonicalAccess;
  unit?: string;
  priority: number;
  label: string;
  required?: boolean;
}

export interface CanonicalValue {
  key: string;
  value: unknown;
  valid: boolean;
  timestamp: number;
  quality: string;
  source: string;
  reason: string;
}

export interface CanonicalSnapshot {
  schema: 'nexowatt.netoperator-canonical.v1';
  generatedAt: number;
  receivedAt: number;
  fresh: boolean;
  valid: boolean;
  commOk: boolean;
  source: string;
  driverId: string;
  mappingVersion: string;
  values: Record<string, CanonicalValue>;
  command: {
    priority: number;
    action: string;
    binding: boolean;
    reason: string;
    commandId: string;
  };
  errors: string[];
}

export const CANONICAL_FIELDS: Readonly<Record<string, CanonicalFieldDefinition>> = Object.freeze({
  'grid.command.enable': { key: 'grid.command.enable', type: 'boolean', access: 'read', priority: 2, label: 'Externe Vorgaben aktiv', required: true },
  'grid.command.trip': { key: 'grid.command.trip', type: 'boolean', access: 'read', priority: 1, label: 'Harte Abschaltung / Trip', required: true },
  'grid.command.release': { key: 'grid.command.release', type: 'boolean', access: 'read', priority: 2, label: 'Freigabe der Anlage', required: true },
  'grid.p.limit_kw': { key: 'grid.p.limit_kw', type: 'number', access: 'read', unit: 'kW', priority: 3, label: 'Maximal zulässige Einspeiseleistung am NAP (nicht-negative kW)' },
  'grid.p.target_kw': { key: 'grid.p.target_kw', type: 'number', access: 'read', unit: 'kW', priority: 3, label: 'Einspeise-Sollwert am NAP (positive kW = Einspeisung)' },
  'grid.p.target_pct': { key: 'grid.p.target_pct', type: 'number', access: 'read', unit: '%', priority: 3, label: 'Zulässige Einspeisung in Prozent der installierten PV-Leistung' },
  'grid.q.target_kvar': { key: 'grid.q.target_kvar', type: 'number', access: 'read', unit: 'kvar', priority: 4, label: 'Blindleistungs-Sollwert' },
  'grid.cosphi.target': { key: 'grid.cosphi.target', type: 'number', access: 'read', priority: 4, label: 'cos phi Sollwert' },
  'grid.mode.p': { key: 'grid.mode.p', type: 'enum', access: 'read', priority: 3, label: 'Aktiver P-Regelmodus' },
  'grid.mode.q': { key: 'grid.mode.q', type: 'enum', access: 'read', priority: 4, label: 'Aktiver Q-Regelmodus' },
  'pcc.p.actual_kw': { key: 'pcc.p.actual_kw', type: 'number', access: 'read', unit: 'kW', priority: 5, label: 'Ist-Wirkleistung am NAP' },
  'pcc.q.actual_kvar': { key: 'pcc.q.actual_kvar', type: 'number', access: 'read', unit: 'kvar', priority: 5, label: 'Ist-Blindleistung am NAP' },
  'pcc.u.actual_v': { key: 'pcc.u.actual_v', type: 'number', access: 'read', unit: 'V', priority: 5, label: 'Spannung am NAP' },
  'controller.status': { key: 'controller.status', type: 'enum', access: 'read', priority: 2, label: 'Betriebszustand EZA-/Parkregler', required: true },
  'controller.comm_ok': { key: 'controller.comm_ok', type: 'boolean', access: 'read', priority: 1, label: 'Kommunikationsstatus', required: true },
  'controller.fault_code': { key: 'controller.fault_code', type: 'string', access: 'read', priority: 2, label: 'Fehlercode' },
  'controller.timestamp': { key: 'controller.timestamp', type: 'datetime', access: 'read', priority: 2, label: 'Zeitstempel der Vorgabe' },
  'controller.source': { key: 'controller.source', type: 'string', access: 'read', priority: 5, label: 'Quelle Netzbetreiber/Fernwirktechnik' },
  'eos.ack.command_id': { key: 'eos.ack.command_id', type: 'string', access: 'write', priority: 6, label: 'Quittierung verarbeiteter Vorgabe' },
  'eos.status.ready': { key: 'eos.status.ready', type: 'boolean', access: 'write', priority: 6, label: 'EOS bereit zur Umsetzung' },
});

export const CANONICAL_KEYS = Object.freeze(Object.keys(CANONICAL_FIELDS));
export const REQUIRED_READ_KEYS = Object.freeze(Object.values(CANONICAL_FIELDS)
  .filter((field) => field.access === 'read' && field.required === true)
  .map((field) => field.key));

export function strictFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function strictBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'on', 'yes', 'ja', 'active', 'enabled', 'release', 'released', 'trip', 'tripped', 'shutdown'].includes(normalized)) return true;
    if (['false', 'off', 'no', 'nein', 'inactive', 'disabled', 'blocked', 'inhibit', 'inhibited'].includes(normalized)) return false;
  }
  return null;
}

export function strictTimestamp(value: unknown): number | null {
  const numberValue = strictFinite(value);
  if (numberValue !== null) {
    if (numberValue > 1e12) return Math.round(numberValue);
    if (numberValue > 1e9) return Math.round(numberValue * 1000);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeCanonicalValue(
  key: string,
  rawValue: unknown,
  options: { timestamp?: number; quality?: string; source?: string; enumMap?: Record<string, string | number> } = {},
): CanonicalValue {
  const definition = CANONICAL_FIELDS[key];
  const timestamp = strictTimestamp(options.timestamp) || Date.now();
  const quality = String(options.quality || 'good').trim().toLowerCase() || 'good';
  const source = String(options.source || '').trim();
  if (!definition) {
    return { key, value: null, valid: false, timestamp, quality: 'bad', source, reason: 'unknown-canonical-key' };
  }

  let value: unknown = null;
  let valid = false;
  if (definition.type === 'boolean') {
    value = strictBoolean(rawValue);
    valid = typeof value === 'boolean';
  } else if (definition.type === 'number') {
    value = strictFinite(rawValue);
    valid = typeof value === 'number' && Number.isFinite(value);
  } else if (definition.type === 'datetime') {
    value = strictTimestamp(rawValue);
    valid = typeof value === 'number' && Number.isFinite(value);
  } else if (definition.type === 'enum') {
    const mapped = options.enumMap && Object.prototype.hasOwnProperty.call(options.enumMap, String(rawValue))
      ? options.enumMap[String(rawValue)]
      : rawValue;
    if (mapped !== null && mapped !== undefined && String(mapped).trim() !== '') {
      value = String(mapped).trim();
      valid = true;
    }
  } else {
    if (rawValue !== null && rawValue !== undefined) {
      value = String(rawValue).trim();
      valid = String(value).length > 0;
    }
  }

  if (quality === 'bad' || quality === 'invalid' || quality === 'stale') valid = false;
  return {
    key,
    value: valid ? value : null,
    valid,
    timestamp,
    quality,
    source,
    reason: valid ? 'valid' : (quality === 'good' ? 'invalid-value' : `quality-${quality}`),
  };
}

function valueOf(values: Record<string, CanonicalValue>, key: string): unknown {
  const entry = values[key];
  return entry && entry.valid ? entry.value : null;
}

export function evaluateCanonicalCommand(values: Record<string, CanonicalValue>): CanonicalSnapshot['command'] {
  const enabled = strictBoolean(valueOf(values, 'grid.command.enable'));
  const trip = strictBoolean(valueOf(values, 'grid.command.trip'));
  const release = strictBoolean(valueOf(values, 'grid.command.release'));
  const controllerTimestamp = strictTimestamp(valueOf(values, 'controller.timestamp')) || Date.now();
  const source = String(valueOf(values, 'controller.source') || 'netoperator').trim();

  let priority = 6;
  let action = 'monitor';
  let binding = false;
  let reason = 'no-binding-command';

  if (trip === true) {
    priority = 1;
    action = 'trip';
    binding = true;
    reason = 'grid-command-trip';
  } else if (release === false) {
    priority = 2;
    action = 'inhibit';
    binding = true;
    reason = 'grid-command-release-false';
  } else if (enabled === true) {
    const hasP = ['grid.p.limit_kw', 'grid.p.target_kw', 'grid.p.target_pct']
      .some((key) => values[key] && values[key].valid);
    const hasQ = ['grid.q.target_kvar', 'grid.cosphi.target']
      .some((key) => values[key] && values[key].valid);
    if (hasP) {
      priority = 3;
      action = 'active-power-constraint';
      binding = true;
      reason = 'grid-active-power-command';
    } else if (hasQ) {
      priority = 4;
      action = 'reactive-power-constraint';
      binding = true;
      reason = 'grid-reactive-power-command';
    } else {
      priority = 5;
      action = 'enabled-without-setpoint';
      reason = 'external-command-enabled-no-setpoint';
    }
  } else if (enabled === false) {
    action = 'released';
    reason = 'external-command-disabled';
  }

  const commandId = `${source}:${controllerTimestamp}:${action}`;
  return { priority, action, binding, reason, commandId };
}

export function buildCanonicalSnapshot(input: {
  rawValues?: Record<string, unknown>;
  metadata?: Record<string, { timestamp?: number; quality?: string; source?: string; enumMap?: Record<string, string | number> }>;
  receivedAt?: number;
  maxAgeMs?: number;
  maxFutureSkewMs?: number;
  commOk?: boolean;
  source?: string;
  driverId?: string;
  mappingVersion?: string;
  errors?: string[];
} = {}): CanonicalSnapshot {
  const receivedAt = strictTimestamp(input.receivedAt) || Date.now();
  const maxAgeMs = Math.max(250, strictFinite(input.maxAgeMs) || 5000);
  const rawValues = input.rawValues && typeof input.rawValues === 'object' ? input.rawValues : {};
  const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const values: Record<string, CanonicalValue> = {};
  for (const key of CANONICAL_KEYS) {
    const definition = CANONICAL_FIELDS[key];
    if (!definition || definition.access !== 'read') continue;
    values[key] = normalizeCanonicalValue(key, rawValues[key], {
      ...(metadata[key] || {}),
      timestamp: metadata[key]?.timestamp || receivedAt,
      source: metadata[key]?.source || input.source || '',
    });
  }

  const commValue = values['controller.comm_ok'];
  const transportOk = input.commOk === true;
  const controllerComm = commValue && commValue.valid && typeof commValue.value === 'boolean'
    ? commValue.value
    : null;
  // Eine erfolgreich aufgebaute TCP-/State-Verbindung darf einen vom Regler
  // gemeldeten Kommunikationsfehler niemals überstimmen. Fehlt der kanonische
  // Wert, bleibt der Snapshot wegen des Pflichtsignals ohnehin ungültig.
  const commOk = transportOk && controllerComm !== false;
  const controllerTs = values['controller.timestamp'] && values['controller.timestamp'].valid
    ? strictTimestamp(values['controller.timestamp'].value)
    : null;
  const maxFutureSkewMs = Math.max(0, strictFinite(input.maxFutureSkewMs) ?? 5000);
  const timestampNotFuture = controllerTs === null || controllerTs <= receivedAt + maxFutureSkewMs;
  const freshnessTs = controllerTs || receivedAt;
  const fresh = commOk && timestampNotFuture && receivedAt - freshnessTs <= maxAgeMs;
  const missingRequired = REQUIRED_READ_KEYS.filter((key) => !values[key] || !values[key].valid);
  const errors = Array.isArray(input.errors) ? input.errors.map((entry) => String(entry || '')).filter(Boolean) : [];
  for (const key of missingRequired) errors.push(`missing-required:${key}`);
  if (!timestampNotFuture) errors.push('controller-timestamp-in-future');
  if (!fresh) errors.push('controller-data-stale');
  const valid = commOk && fresh && missingRequired.length === 0;

  return {
    schema: 'nexowatt.netoperator-canonical.v1',
    generatedAt: Date.now(),
    receivedAt,
    fresh,
    valid,
    commOk,
    source: String(input.source || valueOf(values, 'controller.source') || '').trim(),
    driverId: String(input.driverId || '').trim(),
    mappingVersion: String(input.mappingVersion || '').trim(),
    values,
    command: evaluateCanonicalCommand(values),
    errors: Array.from(new Set(errors)),
  };
}

export function canonicalValue(snapshot: CanonicalSnapshot | null | undefined, key: string): unknown {
  const entry = snapshot && snapshot.values ? snapshot.values[key] : null;
  return entry && entry.valid ? entry.value : null;
}
