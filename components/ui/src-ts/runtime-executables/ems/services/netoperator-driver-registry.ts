// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Ordnet freigegebene Netzbetreiber-/Parkregler-Treiber ihren Profilen und Fähigkeiten zu.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/netoperator-driver-registry.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

import fs = require('node:fs');
import path = require('node:path');
import { CANONICAL_FIELDS, CANONICAL_KEYS, REQUIRED_READ_KEYS } from './netoperator-canonical-model';

declare const __dirname: string;

export type NetOperatorProtocol = 'modbus-tcp' | 'state-map' | 'modbus-rtu' | 'opc-ua' | 'iec-104' | 'iec-61850';

export interface NetOperatorReadDescriptor {
  area?: 'coil' | 'discrete' | 'holding' | 'input' | undefined;
  functionCode?: number | undefined;
  address?: number | null | undefined;
  addressBase?: 0 | 1 | undefined;
  dataType?: string | undefined;
  registers?: number | undefined;
  bit?: number | undefined;
  scale?: number | undefined;
  offset?: number | undefined;
  byteOrder?: string | undefined;
  enumMap?: Record<string, string | number> | undefined;
  objectId?: string | undefined;
}

export interface NetOperatorQualityDescriptor extends NetOperatorReadDescriptor {
  goodValues?: unknown[] | undefined;
  staleValues?: unknown[] | undefined;
  badValues?: unknown[] | undefined;
}

export interface NetOperatorSignalMapping extends NetOperatorReadDescriptor {
  access?: 'read' | 'write' | undefined;
  required?: boolean | undefined;
  quality?: NetOperatorQualityDescriptor | undefined;
  timestamp?: NetOperatorReadDescriptor | undefined;
}

export interface NetOperatorDriverProfile {
  schema: 'nexowatt.netoperator-driver.v1';
  id: string;
  manufacturer: string;
  model: string;
  label?: string | undefined;
  status?: 'ready' | 'mapping-required' | 'experimental' | undefined;
  mappingVersion: string;
  protocols: NetOperatorProtocol[];
  defaultProtocol?: NetOperatorProtocol | undefined;
  addressBase?: 0 | 1 | undefined;
  commandSemantics?: Record<string, unknown> | undefined;
  watchdog?: {
    maxAgeMs?: number | undefined;
    policy?: 'project-specific' | 'last-valid' | 'release' | 'block' | undefined;
    notes?: string[] | undefined;
  };
  signals: Record<string, NetOperatorSignalMapping>;
  notes?: string[] | undefined;
}

export interface DriverValidationResult {
  ok: boolean;
  ready: boolean;
  errors: string[];
  warnings: string[];
  mappedKeys: string[];
  missingRequired: string[];
}

export const NETOPERATOR_DRIVER_SCHEMA = 'nexowatt.netoperator-driver.v1';
export const SUPPORTED_PROTOCOL_SLOTS: ReadonlyArray<NetOperatorProtocol> = Object.freeze([
  'modbus-tcp',
  'state-map',
  'modbus-rtu',
  'opc-ua',
  'iec-104',
  'iec-61850',
]);
export const IMPLEMENTED_PROTOCOLS: ReadonlyArray<NetOperatorProtocol> = Object.freeze(['modbus-tcp', 'state-map']);

const SUPPORTED_DATA_TYPES = new Set([
  'boolean', 'bool', 'int16', 'uint16', 'int32', 'uint32', 'int64', 'uint64',
  'float32', 'float64', 'enum', 'string', 'datetime',
]);
const SUPPORTED_BYTE_ORDERS = new Set(['AB', 'BA', 'ABCD', 'BADC', 'CDAB', 'DCBA']);

function safeText(value: unknown): string {
  return String(value === null || value === undefined ? '' : value).trim();
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDescriptor(raw: NetOperatorReadDescriptor | null | undefined, profileAddressBase: 0 | 1): NetOperatorReadDescriptor | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const dataType = safeText(raw.dataType || 'uint16').toLowerCase();
  return {
    area: raw.area || 'holding',
    functionCode: finiteOrNull(raw.functionCode) === null ? undefined : Math.round(Number(raw.functionCode)),
    address: finiteOrNull(raw.address),
    addressBase: raw.addressBase === 1 ? 1 : profileAddressBase,
    dataType,
    registers: finiteOrNull(raw.registers) === null ? undefined : Math.max(1, Math.round(Number(raw.registers))),
    bit: finiteOrNull(raw.bit) === null ? undefined : Math.round(Number(raw.bit)),
    scale: finiteOrNull(raw.scale) === null ? 1 : Number(raw.scale),
    offset: finiteOrNull(raw.offset) === null ? 0 : Number(raw.offset),
    byteOrder: safeText(raw.byteOrder || (['boolean', 'bool', 'int16', 'uint16', 'enum'].includes(dataType) ? 'AB' : 'ABCD')).toUpperCase(),
    enumMap: raw.enumMap && typeof raw.enumMap === 'object' ? raw.enumMap : undefined,
    objectId: safeText(raw.objectId),
  };
}

function descriptorMapped(mapping: NetOperatorReadDescriptor | null | undefined): boolean {
  return !!(mapping && (safeText(mapping.objectId) || finiteOrNull(mapping.address) !== null));
}

function validateDescriptor(
  key: string,
  descriptor: NetOperatorReadDescriptor | null | undefined,
  suffix: string,
  errors: string[],
  warnings: string[],
): void {
  if (!descriptor || typeof descriptor !== 'object') return;
  const prefix = suffix ? `${key}:${suffix}` : key;
  const objectId = safeText(descriptor.objectId);
  const address = finiteOrNull(descriptor.address);
  if (objectId && address !== null) warnings.push(`dual-source-mapping:${prefix}`);
  if (address !== null && (address < 0 || address > 65535)) errors.push(`address-invalid:${prefix}`);
  const functionCode = finiteOrNull(descriptor.functionCode);
  if (functionCode !== null && ![1, 2, 3, 4].includes(Math.round(functionCode))) errors.push(`function-code-invalid:${prefix}`);
  const bit = finiteOrNull(descriptor.bit);
  if (bit !== null && (bit < 0 || bit > 15 || !Number.isInteger(bit))) errors.push(`bit-invalid:${prefix}`);
  const registers = finiteOrNull(descriptor.registers);
  if (registers !== null && (registers < 1 || registers > 125 || !Number.isInteger(registers))) errors.push(`register-count-invalid:${prefix}`);
  const dataType = safeText(descriptor.dataType || 'uint16').toLowerCase();
  if (!SUPPORTED_DATA_TYPES.has(dataType)) errors.push(`data-type-unsupported:${prefix}:${dataType}`);
  const byteOrder = safeText(descriptor.byteOrder || (['boolean', 'bool', 'int16', 'uint16', 'enum'].includes(dataType) ? 'AB' : 'ABCD')).toUpperCase();
  if (!SUPPORTED_BYTE_ORDERS.has(byteOrder)) errors.push(`byte-order-unsupported:${prefix}:${byteOrder}`);
}

export function validateDriverProfile(profile: unknown): DriverValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const row = profile && typeof profile === 'object' ? profile as Partial<NetOperatorDriverProfile> : {};
  if (row.schema !== NETOPERATOR_DRIVER_SCHEMA) errors.push('schema-invalid');
  if (!safeText(row.id)) errors.push('id-missing');
  if (!safeText(row.manufacturer)) errors.push('manufacturer-missing');
  if (!safeText(row.model)) errors.push('model-missing');
  if (!safeText(row.mappingVersion)) errors.push('mapping-version-missing');

  const protocols = Array.isArray(row.protocols) ? row.protocols.map((entry) => safeText(entry) as NetOperatorProtocol) : [];
  if (!protocols.length) errors.push('protocols-missing');
  for (const protocol of protocols) {
    if (!SUPPORTED_PROTOCOL_SLOTS.includes(protocol)) errors.push(`protocol-unknown:${protocol}`);
    else if (!IMPLEMENTED_PROTOCOLS.includes(protocol)) warnings.push(`protocol-slot-not-implemented:${protocol}`);
  }
  const defaultProtocol = safeText(row.defaultProtocol || protocols[0]);
  if (defaultProtocol && !protocols.includes(defaultProtocol as NetOperatorProtocol)) errors.push('default-protocol-not-listed');

  const signals = row.signals && typeof row.signals === 'object' ? row.signals : {};
  const mappedKeys: string[] = [];
  for (const [key, mapping] of Object.entries(signals)) {
    if (!CANONICAL_FIELDS[key]) {
      warnings.push(`unknown-canonical-key:${key}`);
      continue;
    }
    if (!mapping || typeof mapping !== 'object') {
      errors.push(`mapping-invalid:${key}`);
      continue;
    }
    const access = safeText(mapping.access || CANONICAL_FIELDS[key].access).toLowerCase();
    if (access !== CANONICAL_FIELDS[key].access) warnings.push(`access-mismatch:${key}`);
    validateDescriptor(key, mapping, '', errors, warnings);
    validateDescriptor(key, mapping.quality, 'quality', errors, warnings);
    validateDescriptor(key, mapping.timestamp, 'timestamp', errors, warnings);
    if (descriptorMapped(mapping)) mappedKeys.push(key);
    if (!descriptorMapped(mapping) && mapping.required === true) errors.push(`required-address-missing:${key}`);
    if (mapping.quality && !descriptorMapped(mapping.quality)) warnings.push(`quality-mapping-empty:${key}`);
    if (mapping.timestamp && !descriptorMapped(mapping.timestamp)) warnings.push(`timestamp-mapping-empty:${key}`);
  }

  const missingRequired = REQUIRED_READ_KEYS.filter((key) => !mappedKeys.includes(key));
  if (missingRequired.length) warnings.push(...missingRequired.map((key) => `required-signal-unmapped:${key}`));
  const hasPCommand = ['grid.p.limit_kw', 'grid.p.target_kw', 'grid.p.target_pct'].some((key) => mappedKeys.includes(key));
  if (!hasPCommand) warnings.push('active-power-command-unmapped');
  const ready = errors.length === 0 && missingRequired.length === 0 && hasPCommand;
  if (row.status === 'ready' && !ready) warnings.push('profile-status-ready-but-contract-incomplete');
  return { ok: errors.length === 0, ready, errors: Array.from(new Set(errors)), warnings: Array.from(new Set(warnings)), mappedKeys, missingRequired };
}

export function normalizeDriverProfile(profile: NetOperatorDriverProfile): NetOperatorDriverProfile {
  const profileAddressBase: 0 | 1 = profile.addressBase === 1 ? 1 : 0;
  const signals: Record<string, NetOperatorSignalMapping> = {};
  for (const key of CANONICAL_KEYS) {
    if (!profile.signals || !profile.signals[key]) continue;
    const raw = profile.signals[key]!;
    const primary = normalizeDescriptor(raw, profileAddressBase) || {};
    const qualityBase = normalizeDescriptor(raw.quality, profileAddressBase);
    const timestamp = normalizeDescriptor(raw.timestamp, profileAddressBase);
    const quality: NetOperatorQualityDescriptor | undefined = qualityBase ? {
      ...qualityBase,
      goodValues: Array.isArray(raw.quality?.goodValues) ? raw.quality?.goodValues : undefined,
      staleValues: Array.isArray(raw.quality?.staleValues) ? raw.quality?.staleValues : undefined,
      badValues: Array.isArray(raw.quality?.badValues) ? raw.quality?.badValues : undefined,
    } : undefined;
    signals[key] = {
      ...primary,
      access: (raw.access || CANONICAL_FIELDS[key]!.access) as 'read' | 'write',
      required: raw.required === true,
      quality,
      timestamp,
    };
  }

  const rawProtocols = Array.isArray(profile.protocols) ? profile.protocols.map((entry) => safeText(entry) as NetOperatorProtocol) : ['modbus-tcp'];
  const protocols = rawProtocols.filter((entry, index): entry is NetOperatorProtocol => !!entry && rawProtocols.indexOf(entry) === index) as NetOperatorProtocol[];
  const watchdogRaw = profile.watchdog && typeof profile.watchdog === 'object' ? profile.watchdog : {};
  const watchdogPolicy = ['project-specific', 'last-valid', 'release', 'block'].includes(safeText(watchdogRaw.policy))
    ? safeText(watchdogRaw.policy) as 'project-specific' | 'last-valid' | 'release' | 'block'
    : 'project-specific';

  return {
    schema: NETOPERATOR_DRIVER_SCHEMA,
    id: safeText(profile.id),
    manufacturer: safeText(profile.manufacturer),
    model: safeText(profile.model),
    label: safeText(profile.label || `${profile.manufacturer} ${profile.model}`),
    status: profile.status || 'mapping-required',
    mappingVersion: safeText(profile.mappingVersion || '0'),
    protocols,
    defaultProtocol: (profile.defaultProtocol || protocols[0] || 'modbus-tcp') as NetOperatorProtocol,
    addressBase: profileAddressBase,
    commandSemantics: profile.commandSemantics && typeof profile.commandSemantics === 'object' ? profile.commandSemantics : {},
    watchdog: {
      maxAgeMs: finiteOrNull(watchdogRaw.maxAgeMs) === null ? undefined : Math.max(250, Math.round(Number(watchdogRaw.maxAgeMs))),
      policy: watchdogPolicy,
      notes: Array.isArray(watchdogRaw.notes) ? watchdogRaw.notes.map((entry) => safeText(entry)).filter(Boolean) : [],
    },
    signals,
    notes: Array.isArray(profile.notes) ? profile.notes.map((entry) => safeText(entry)).filter(Boolean) : [],
  };
}

export class NetOperatorDriverRegistry {
  readonly driverDir: string;
  private profiles = new Map<string, NetOperatorDriverProfile>();
  private diagnostics: string[] = [];

  constructor(driverDir?: string) {
    this.driverDir = driverDir || path.resolve(__dirname, '..', 'netoperator', 'drivers');
  }

  load(): void {
    this.profiles.clear();
    this.diagnostics = [];
    if (!fs.existsSync(this.driverDir)) {
      this.diagnostics.push(`driver-directory-missing:${this.driverDir}`);
      return;
    }
    const files = fs.readdirSync(this.driverDir).filter((name) => name.endsWith('.json')).sort();
    for (const file of files) {
      const absolute = path.join(this.driverDir, file);
      try {
        const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8')) as NetOperatorDriverProfile;
        const normalized = normalizeDriverProfile(parsed);
        const validation = validateDriverProfile(normalized);
        if (!validation.ok) {
          this.diagnostics.push(`${file}:${validation.errors.join(',')}`);
          continue;
        }
        if (this.profiles.has(normalized.id)) {
          this.diagnostics.push(`${file}:duplicate-id:${normalized.id}`);
          continue;
        }
        this.profiles.set(normalized.id, normalized);
      } catch (error) {
        this.diagnostics.push(`${file}:${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  list(): Array<Record<string, unknown>> {
    return Array.from(this.profiles.values()).map((profile) => {
      const validation = validateDriverProfile(profile);
      return {
        id: profile.id,
        manufacturer: profile.manufacturer,
        model: profile.model,
        label: profile.label || `${profile.manufacturer} ${profile.model}`,
        mappingVersion: profile.mappingVersion,
        status: validation.ready ? 'ready' : (profile.status || 'mapping-required'),
        ready: validation.ready,
        protocols: profile.protocols,
        implementedProtocols: profile.protocols.filter((protocol) => IMPLEMENTED_PROTOCOLS.includes(protocol)),
        mappedSignalCount: validation.mappedKeys.length,
        missingRequired: validation.missingRequired,
        warnings: validation.warnings,
      };
    });
  }

  get(id: unknown): NetOperatorDriverProfile | null {
    return this.profiles.get(safeText(id)) || null;
  }

  parseCustom(jsonText: unknown): { profile: NetOperatorDriverProfile | null; validation: DriverValidationResult; error: string } {
    try {
      const parsed = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
      const profile = normalizeDriverProfile(parsed as NetOperatorDriverProfile);
      const validation = validateDriverProfile(profile);
      return { profile: validation.ok ? profile : null, validation, error: validation.ok ? '' : validation.errors.join(',') };
    } catch (error) {
      const validation: DriverValidationResult = { ok: false, ready: false, errors: ['custom-profile-json-invalid'], warnings: [], mappedKeys: [], missingRequired: [...REQUIRED_READ_KEYS] };
      return { profile: null, validation, error: error instanceof Error ? error.message : String(error) };
    }
  }

  resolve(config: Record<string, unknown> = {}): { profile: NetOperatorDriverProfile | null; validation: DriverValidationResult; source: string; error: string } {
    const profileSource = safeText(config.profileSource || 'builtin').toLowerCase();
    if (profileSource === 'custom') {
      const result = this.parseCustom(config.customProfileJson || '');
      return { profile: result.profile, validation: result.validation, source: 'custom', error: result.error };
    }
    const profile = this.get(config.driverId || '');
    const validation = validateDriverProfile(profile || {});
    return { profile, validation, source: 'builtin', error: profile ? '' : 'driver-profile-not-found' };
  }

  getDiagnostics(): string[] {
    return this.diagnostics.slice();
  }
}
