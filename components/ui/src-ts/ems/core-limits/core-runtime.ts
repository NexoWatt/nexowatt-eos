/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verbindet die typisierten Core-Budget-Ergebnisse mit dem vom Laufzeitmodul verwendeten Kontext.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/ems/core-limits/core-runtime.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import { resolvePara14aAppCap, type Para14aAppCaps } from '../para14a/para14a-constraint';

/**
 * Code-Teil: Typisierte Core-Limits Runtime Phase 1
 *
 * Datei: src-ts/ems/core-limits/core-runtime.ts
 *
 * Zweck:
 * Typisierte, seiteneffektfreie Rechenquelle für den zentralen EMS-Kern. Die
 * produktive ioBroker-Runtime sammelt weiterhin Messwerte und schreibt States;
 * sämtliche kritischen Budget-, Grant-, PV- und Headroom-Berechnungen werden
 * dagegen hier mit expliziten Verträgen ausgeführt.
 *
 * Sicherheitsprinzip:
 * - 0 W ist ein gültiger Wert und darf nicht als fehlend ersetzt werden.
 * - Fehlende oder nicht endliche Eingaben erzeugen keine künstliche Leistung.
 * - Die Funktionen schreiben keine Datenpunkte und verändern keine Runtime.
 * - Die bisherige JavaScript-Rechnung bleibt in der Runtime als harter Fallback,
 *   falls Spiegel, Vergleich oder Ergebnisvalidierung fehlschlagen.
 */

export type CoreRuntimePvSource =
  | 'direct-pv+nvp-flow-confirmed'
  | 'direct-pv-fresh'
  | 'nvp-export-flow-fallback'
  | 'trusted-pv-hold-with-active-sink'
  | 'nvp-export-minimum-despite-zero-pv'
  | 'no-physical-pv-evidence';

export type CorePvAllocationMode = 'storage' | 'emobility' | 'both' | 'dynamic';

export interface CorePvFlowInput {
  gridW?: unknown;
  flexUsedW?: unknown;
  storageChargeW?: unknown;
  storageDischargeW?: unknown;
}

export interface CorePvPhysicalCapInput {
  measuredPvW?: unknown;
  measuredPvFresh?: unknown;
  flowRawW?: unknown;
  gridExportW?: unknown;
  gridImportW?: unknown;
  activePvSinkW?: unknown;
  lastTrustedW?: unknown;
  lastTrustedAgeMs?: unknown;
  holdMs?: unknown;
  exportEvidenceThresholdW?: unknown;
  importToleranceW?: unknown;
}

export interface CorePvPhysicalCapResult {
  capW: number;
  source: CoreRuntimePvSource;
  trusted: boolean;
  held: boolean;
}

export interface CoreRuntimePvAllocationInput {
  totalW?: unknown;
  mode?: unknown;
  evcsSharePct?: unknown;
  allocationEnabled?: unknown;
  storageEligible?: unknown;
  storageMaxChargeW?: unknown;
  storageSocPct?: unknown;
  storageMaxSocPct?: unknown;
}

export interface CoreRuntimePvAllocation {
  mode: CorePvAllocationMode;
  allocationEnabled: boolean;
  evcsSharePct: number;
  totalW: number;
  evcsCapW: number;
  storageGuaranteedW: number;
  storageEligible: boolean;
  storageMaxChargeW: number | null;
  reason: string;
  storageSocPct: number | null;
  storageMaxSocPct: number;
}

export interface CoreRuntimeGrantRequest {
  requestedW?: unknown;
  pvOnly?: unknown;
  maxW?: unknown;
  key?: unknown;
  consumer?: unknown;
  app?: unknown;
  applyEvcsAllocationCap?: unknown;
}

export interface CoreRuntimeGrantGates {
  grid?: Record<string, unknown> | null;
  pv?: Record<string, unknown> | null;
  storage?: Record<string, unknown> | null;
  total?: Record<string, unknown> | null;
  forecast?: Record<string, unknown> | null;
  tariff?: Record<string, unknown> | null;
  pvAllocation?: Partial<CoreRuntimePvAllocation> | null;
  para14a?: {
    active?: unknown;
    appCapsW?: Para14aAppCaps | Record<string, unknown> | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface CoreRuntimeGrantState {
  remainingTotalW?: unknown;
  remainingPvW?: unknown;
  gates?: CoreRuntimeGrantGates | null;
}

export interface CoreRuntimeGrantResult {
  requestedW: number | null;
  grantW: number;
  availableW: number | null;
  remainingTotalW: number | null;
  remainingPvW: number;
  allocationMode: string;
  allocationEvcsCapW: number | null;
  allocationCapApplied: boolean;
  para14aCapW: number | null;
  para14aLocalPvGrantW: number;
  para14aCapApplied: boolean;
  pvOnly: boolean;
  key: string;
  source: 'ts-core-runtime-grant';
}

export interface CoreRuntimeGridInput {
  netW?: unknown;
  usable?: unknown;
  status?: unknown;
  source?: unknown;
  reason?: unknown;
  measurementAgeMs?: unknown;
  importLimitW?: unknown;
  planningImportLimitW?: unknown;
  hardImportLimitW?: unknown;
  limitStage?: unknown;
  requiredReductionW?: unknown;
  highLevelCapW?: unknown;
  highLevelBinding?: unknown;
}

export interface CoreRuntimePvInput {
  /** Gemessene, noch exklusiv gebundene Prüflast; kein gemeinsam verfügbares PV-Budget. */
  unconfirmedProbeW?: unknown;
  measuredW?: unknown;
  measuredFresh?: unknown;
  measuredSource?: unknown;
  reserveW?: unknown;
  lastTrustedW?: unknown;
  lastTrustedAgeMs?: unknown;
  holdMs?: unknown;
  exportEvidenceThresholdW?: unknown;
  importToleranceW?: unknown;
}

export interface CoreRuntimeStorageInput {
  chargeW?: unknown;
  dischargeW?: unknown;
  eligible?: unknown;
  maxChargeW?: unknown;
  socPct?: unknown;
  maxSocPct?: unknown;
  topology?: unknown;
  writerActive?: unknown;
  authorityReason?: unknown;
}

export interface CoreRuntimeConsumerInput {
  evcsUsedW?: unknown;
  evcsActualW?: unknown;
  evcsPvUsedW?: unknown;
  thermalUsedW?: unknown;
  thermalActualW?: unknown;
  heatingRodUsedW?: unknown;
  heatingRodActualW?: unknown;
}

export interface CoreRuntimeSnapshotInput {
  ts?: unknown;
  grid?: CoreRuntimeGridInput | null;
  pv?: CoreRuntimePvInput | null;
  storage?: CoreRuntimeStorageInput | null;
  consumers?: CoreRuntimeConsumerInput | null;
  allocation?: {
    enabled?: unknown;
    mode?: unknown;
    evcsSharePct?: unknown;
  } | null;
  forecast?: Record<string, unknown> | null;
  tariff?: Record<string, unknown> | null;
  para14a?: Record<string, unknown> | null;
}

export interface CoreRuntimeBudgetConsumer {
  priority: number;
  usedW: number;
  pvUsedW: number;
  mode: string;
}

export interface CoreRuntimeBudgetSnapshot {
  ts: number;
  active: true;
  mode: 'central-background-ts-runtime';
  source: 'ts-core-runtime';
  raw: {
    gridW: number;
    gridMeasurementUsable: boolean;
    gridMeasurementStatus: string;
    gridMeasurementSource: string;
    gridMeasurementReason: string;
    gridMeasurementAgeMs: number | null;
    gridImportW: number;
    gridExportW: number;
    pvPowerW: number;
    storageChargeW: number;
    storageDischargeW: number;
    evcsUsedW: number;
    evcsActualW: number;
    evcsPvUsedW: number;
    thermalUsedW: number;
    thermalActualW: number;
    heatingRodUsedW: number;
    heatingRodActualW: number;
    flexUsedW: number;
    flexActualW: number;
    storageControlledChargeW: number;
    currentControlledLoadW: number;
    pvFlexUsedW: number;
    pvReserveW: number;
    pvBudgetFlowRawW: number;
    pvBudgetPhysicalCapW: number;
    pvBudgetPhysicalSource: CoreRuntimePvSource;
    pvBudgetPhysicalHeld: boolean;
    pvBudgetDirectSource: string;
    pvBudgetDirectFresh: boolean;
    pvBudgetClampedW: number;
  };
  gates: {
    grid: {
      importLimitW: number;
      planningImportLimitW: number;
      hardImportLimitW: number;
      limitStage: string;
      importW: number;
      exportW: number;
      measurementUsable: boolean;
      measurementStatus: string;
      measurementSource: string;
      measurementReason: string;
      incrementHeadroomW: number | null;
      currentControlledLoadW: number;
      headroomW: number | null;
      headroomRawW: number | null;
    };
    pv: {
      available: boolean;
      rawW: number;
      flowRawW: number;
      physicalCapW: number;
      clampedW: number;
      reserveW: number;
      effectiveW: number;
      source: CoreRuntimePvSource;
      directPvSource: string;
      directPvFresh: boolean;
      physicalHeld: boolean;
      clampReason: string;
    };
    storage: {
      chargeW: number;
      dischargeW: number;
      topology: string;
      writerActive: boolean;
      authorityReason: string;
    };
    pvAllocation: CoreRuntimePvAllocation;
    forecast: Record<string, unknown>;
    tariff: Record<string, unknown>;
    para14a: Record<string, unknown>;
    total: {
      effectiveW: number | null;
      binding: string;
    };
  };
  consumers: Record<string, CoreRuntimeBudgetConsumer>;
  typedRuntime: {
    productive: true;
    fallback: false;
    contractVersion: 'core-runtime-v2';
  };
}

export interface CoreRuntimeMismatch {
  field: string;
  legacy: unknown;
  typed: unknown;
  tolerance?: number;
}

/**
 * Datenvertrag: CoreRuntimePreparedSnapshotInput
 *
 * Zweck:
 * Übergibt die bereits fachlich aufgelösten Messwerte aus der ioBroker-Hülle
 * in einen vollständig normalisierten TypeScript-Vertrag. Phase 2 zieht damit
 * die Quellenübergabe aus der großen Runtime-Datei in eine reine Funktion.
 *
 * Sicherheitsregel:
 * - `0 W` bleibt ein gültiger Messwert.
 * - Fehlende Werte werden nicht durch alte Cachewerte ergänzt.
 * - Frische/Usability wird nicht neu erfunden, sondern explizit übernommen.
 */
export interface CoreRuntimePreparedSnapshotInput {
  ok: true;
  source: 'ts-core-runtime-input-v2';
  contractVersion: 'core-runtime-input-v2';
  input: CoreRuntimeSnapshotInput;
  diagnostics: {
    gridUsable: boolean;
    gridSource: string;
    gridStatus: string;
    gridAgeMs: number | null;
    pvFresh: boolean;
    pvSource: string;
    storageChargeW: number;
    storageDischargeW: number;
    storageTopology: string;
    storageWriterActive: boolean;
    storageAuthorityReason: string;
    consumerCount: number;
  };
}

export interface CoreRuntimeReservationRequest extends CoreRuntimeGrantRequest {
  label?: unknown;
  priority?: unknown;
  reserveW?: unknown;
  pvReserveW?: unknown;
  actualW?: unknown;
  mode?: unknown;
}

export interface CoreRuntimeReservationEntry {
  key: string;
  app: string;
  label: string;
  priority: number;
  requestedW: number;
  grantW: number;
  usedW: number;
  pvUsedW: number;
  reserveW: number;
  pvReserveW: number;
  actualW: number;
  pvOnly: boolean;
  mode: string;
  ts: number;
  sequence: number;
  remainingTotalW: number | null;
  remainingPvW: number;
}

export interface CoreRuntimeReservationState extends CoreRuntimeGrantState {
  remainingTotalW: number | null;
  remainingPvW: number;
  gates: CoreRuntimeGrantGates;
  consumers: Record<string, CoreRuntimeReservationEntry | Record<string, unknown>>;
  order: string[];
  sequence: number;
}

export interface CoreRuntimeReservationResult {
  ok: true;
  source: 'ts-core-runtime-reservation-v2';
  entry: CoreRuntimeReservationEntry;
  state: CoreRuntimeReservationState;
  nextRemainingTotalW: number | null;
  nextRemainingPvW: number;
  consumers: Record<string, CoreRuntimeReservationEntry | Record<string, unknown>>;
  order: string[];
  flexUsedW: number;
}

export interface CoreRuntimeReservationSequenceResult {
  ok: true;
  source: 'ts-core-runtime-sequence-v2';
  entries: CoreRuntimeReservationEntry[];
  state: CoreRuntimeReservationState;
  flexUsedW: number;
}

export type CoreRuntimePublishValue = string | number | boolean | null;

export interface CoreRuntimePublicationInput {
  snapshot?: Record<string, unknown> | CoreRuntimeBudgetSnapshot | null;
  runtime?: Partial<CoreRuntimeReservationState> | null;
  tsReservation?: Record<string, unknown> | null;
  tsRestGates?: Record<string, unknown> | null;
  tsShadow?: Record<string, unknown> | null;
  tsProductive?: Record<string, unknown> | null;
  coreRuntimeStatus?: Record<string, unknown> | null;
}

export interface CoreRuntimePublicationPlan {
  ok: true;
  source: 'ts-core-runtime-publication-v2';
  contractVersion: 'core-runtime-publication-v2';
  ts: number;
  states: Record<string, CoreRuntimePublishValue>;
  cache: Record<string, CoreRuntimePublishValue>;
  consumerKeys: string[];
}

/** Phase 3: ein einziger typisierter Laufzeitvertrag fuer Snapshot, Reservierungen und Publikation. */
export interface CoreRuntimePhase3State {
  ok: true;
  source: 'ts-core-runtime-phase3';
  contractVersion: 'core-runtime-phase3';
  snapshot: CoreRuntimeBudgetSnapshot | Record<string, unknown>;
  reservationState: CoreRuntimeReservationState;
  revision: number;
  lastReservation: CoreRuntimeReservationResult | null;
}

export interface CoreRuntimePhase3ReservationResult {
  ok: true;
  source: 'ts-core-runtime-phase3-reservation';
  runtime: CoreRuntimePhase3State;
  reservation: CoreRuntimeReservationResult;
}

export interface CoreRuntimePhase3SequenceResult {
  ok: true;
  source: 'ts-core-runtime-phase3-sequence';
  runtime: CoreRuntimePhase3State;
  sequence: CoreRuntimeReservationSequenceResult;
}

export interface CoreRuntimePhase3PublicationInput extends Omit<CoreRuntimePublicationInput, 'snapshot' | 'runtime' | 'tsReservation'> {
  runtime?: CoreRuntimePhase3State | null;
}

export interface CoreRuntimePhase3PublicationPlan extends Omit<CoreRuntimePublicationPlan, 'source' | 'contractVersion'> {
  source: 'ts-core-runtime-publication-v3';
  contractVersion: 'core-runtime-publication-v3';
  runtimeRevision: number;
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positive(value: unknown): number {
  const n = finiteOrNull(value);
  return n === null ? 0 : Math.max(0, n);
}

function round(value: unknown): number {
  const n = finiteOrNull(value);
  return n === null ? 0 : Math.round(n);
}

function roundNullable(value: unknown): number | null {
  const n = finiteOrNull(value);
  return n === null ? null : Math.round(n);
}

function bool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'ja', 'on', 'active'].includes(text)) return true;
    if (['false', '0', 'no', 'nein', 'off', 'inactive', ''].includes(text)) return false;
  }
  return fallback;
}

function text(value: unknown, fallback = ''): string {
  const result = String(value ?? '').trim();
  return result || fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = finiteOrNull(value);
  if (n === null) return fallback;
  return Math.max(min, Math.min(max, n));
}

/**
 * Normalisiert die bereits aufgelösten Mess-/Quellenwerte für den Core.
 * Die Funktion liest keine States und besitzt keinen Cache-Fallback. Damit ist
 * eindeutig nachvollziehbar, welche Werte in den zentralen Snapshot eingehen.
 */
export function prepareCoreRuntimeSnapshotInput(
  rawInput: CoreRuntimeSnapshotInput = {},
): CoreRuntimePreparedSnapshotInput {
  const gridRaw = rawInput.grid && typeof rawInput.grid === 'object' ? rawInput.grid : {};
  const pvRaw = rawInput.pv && typeof rawInput.pv === 'object' ? rawInput.pv : {};
  const storageRaw = rawInput.storage && typeof rawInput.storage === 'object' ? rawInput.storage : {};
  const consumersRaw = rawInput.consumers && typeof rawInput.consumers === 'object' ? rawInput.consumers : {};
  const allocationRaw = rawInput.allocation && typeof rawInput.allocation === 'object' ? rawInput.allocation : {};

  const gridAgeMs = finiteOrNull(gridRaw.measurementAgeMs);
  const gridUsable = bool(gridRaw.usable, false);
  const gridSource = text(gridRaw.source);
  const gridStatus = text(gridRaw.status);
  const pvFresh = bool(pvRaw.measuredFresh, false);
  const pvSource = text(pvRaw.measuredSource);
  const storageChargeW = positive(storageRaw.chargeW);
  const storageDischargeW = positive(storageRaw.dischargeW);
  const evcsUsedW = positive(consumersRaw.evcsUsedW);
  const evcsActualW = positive(consumersRaw.evcsActualW);
  const evcsPvUsedW = positive(consumersRaw.evcsPvUsedW);
  const thermalUsedW = positive(consumersRaw.thermalUsedW);
  const thermalActualW = positive(consumersRaw.thermalActualW);
  const heatingRodUsedW = positive(consumersRaw.heatingRodUsedW);
  const heatingRodActualW = positive(consumersRaw.heatingRodActualW);

  const input: CoreRuntimeSnapshotInput = {
    ts: finiteOrNull(rawInput.ts) ?? Date.now(),
    grid: {
      netW: finiteOrNull(gridRaw.netW) ?? 0,
      usable: gridUsable,
      status: gridStatus,
      source: gridSource,
      reason: text(gridRaw.reason),
      measurementAgeMs: gridAgeMs,
      importLimitW: finiteOrNull(gridRaw.importLimitW),
      hardImportLimitW: finiteOrNull(gridRaw.hardImportLimitW),
      limitStage: text(gridRaw.limitStage),
      highLevelCapW: finiteOrNull(gridRaw.highLevelCapW),
      highLevelBinding: text(gridRaw.highLevelBinding),
    },
    pv: {
      measuredW: positive(pvRaw.measuredW),
      measuredFresh: pvFresh,
      measuredSource: pvSource,
      reserveW: positive(pvRaw.reserveW),
      unconfirmedProbeW: positive(pvRaw.unconfirmedProbeW),
      lastTrustedW: positive(pvRaw.lastTrustedW),
      lastTrustedAgeMs: finiteOrNull(pvRaw.lastTrustedAgeMs),
      holdMs: positive(pvRaw.holdMs ?? 30000),
      exportEvidenceThresholdW: positive(pvRaw.exportEvidenceThresholdW ?? 250),
      importToleranceW: positive(pvRaw.importToleranceW ?? 250),
    },
    storage: {
      chargeW: storageChargeW,
      dischargeW: storageDischargeW,
      eligible: storageRaw.eligible !== false,
      maxChargeW: finiteOrNull(storageRaw.maxChargeW),
      socPct: finiteOrNull(storageRaw.socPct),
      maxSocPct: finiteOrNull(storageRaw.maxSocPct),
      topology: text(storageRaw.topology, 'none'),
      writerActive: bool(storageRaw.writerActive, false),
      authorityReason: text(storageRaw.authorityReason),
    },
    consumers: {
      evcsUsedW,
      evcsActualW,
      evcsPvUsedW,
      thermalUsedW,
      thermalActualW,
      heatingRodUsedW,
      heatingRodActualW,
    },
    allocation: {
      enabled: allocationRaw.enabled !== false,
      mode: text(allocationRaw.mode, 'both'),
      evcsSharePct: clamp(allocationRaw.evcsSharePct, 0, 100, 50),
    },
    forecast: rawInput.forecast && typeof rawInput.forecast === 'object' ? { ...rawInput.forecast } : {},
    tariff: rawInput.tariff && typeof rawInput.tariff === 'object' ? { ...rawInput.tariff } : {},
    para14a: rawInput.para14a && typeof rawInput.para14a === 'object'
      ? { ...rawInput.para14a }
      : { active: false, appCapsW: {} },
  };

  return {
    ok: true,
    source: 'ts-core-runtime-input-v2',
    contractVersion: 'core-runtime-input-v2',
    input,
    diagnostics: {
      gridUsable,
      gridSource,
      gridStatus,
      gridAgeMs,
      pvFresh,
      pvSource,
      storageChargeW: round(storageChargeW),
      storageDischargeW: round(storageDischargeW),
      storageTopology: text(storageRaw.topology, 'none'),
      storageWriterActive: bool(storageRaw.writerActive, false),
      storageAuthorityReason: text(storageRaw.authorityReason),
      consumerCount: [
        evcsUsedW > 0 || evcsActualW > 0 || evcsPvUsedW > 0,
        thermalUsedW > 0 || thermalActualW > 0,
        heatingRodUsedW > 0 || heatingRodActualW > 0,
      ].filter(Boolean).length,
    },
  };
}

/**
 * Berechnet das physikalisch rekonstruierte PV-Potential aus signiertem NVP,
 * bereits laufenden flexiblen PV-Lasten und Speicherfluss.
 */
export function computeCorePvBudgetFlowRawW(input: CorePvFlowInput = {}): number {
  const gridW = finiteOrNull(input.gridW) ?? 0;
  return Math.max(
    0,
    -gridW
      + positive(input.flexUsedW)
      + positive(input.storageChargeW)
      - positive(input.storageDischargeW),
  );
}

/**
 * Ermittelt die physikalisch belegte PV-Obergrenze. Die Regeln entsprechen der
 * produktiven 0.8.118-Runtime, sind hier aber vollständig typisiert und rein.
 */
export function resolveCorePvBudgetPhysicalCap(input: CorePvPhysicalCapInput = {}): CorePvPhysicalCapResult {
  const measuredW = positive(input.measuredPvW);
  const measuredFresh = bool(input.measuredPvFresh, false);
  const flowW = positive(input.flowRawW);
  const exportW = positive(input.gridExportW);
  const importW = positive(input.gridImportW);
  const sinkW = positive(input.activePvSinkW);
  const lastW = positive(input.lastTrustedW);
  const ageMs = finiteOrNull(input.lastTrustedAgeMs);
  const holdMs = positive(input.holdMs ?? 30000);
  const exportThresholdW = positive(input.exportEvidenceThresholdW ?? 250);
  const importToleranceW = positive(input.importToleranceW ?? 250);
  const trustedAgeOk = ageMs !== null && ageMs >= 0 && ageMs <= holdMs;

  if (measuredFresh && measuredW > 0) {
    const flowConfirmed = exportW >= exportThresholdW && flowW > 0;
    return {
      capW: flowConfirmed ? Math.max(measuredW, flowW) : measuredW,
      source: flowConfirmed && flowW > measuredW
        ? 'direct-pv+nvp-flow-confirmed'
        : 'direct-pv-fresh',
      trusted: true,
      held: false,
    };
  }

  if (!measuredFresh && exportW >= exportThresholdW && flowW > 0) {
    return {
      capW: flowW,
      source: 'nvp-export-flow-fallback',
      trusted: true,
      held: false,
    };
  }

  if (trustedAgeOk && lastW > 0 && flowW > 0 && sinkW > 0 && importW <= importToleranceW) {
    return {
      capW: Math.min(lastW, flowW),
      source: 'trusted-pv-hold-with-active-sink',
      trusted: true,
      held: true,
    };
  }

  if (measuredFresh && measuredW <= 0 && exportW >= exportThresholdW) {
    return {
      capW: exportW,
      source: 'nvp-export-minimum-despite-zero-pv',
      trusted: true,
      held: false,
    };
  }

  return {
    capW: 0,
    source: 'no-physical-pv-evidence',
    trusted: false,
    held: false,
  };
}

/** Normalisiert die Kundenpriorität für PV-Überschuss. */
export function normalizeCorePvAllocationMode(value: unknown): CorePvAllocationMode {
  const mode = text(value).toLowerCase();
  if (mode === 'storage' || mode === 'speicher') return 'storage';
  if (['emobility', 'e-mobility', 'evcs', 'wallbox'].includes(mode)) return 'emobility';
  if (['dynamic', 'auto', 'none', 'off', 'disabled'].includes(mode)) return 'dynamic';
  return 'both';
}

/** Baut die zentrale Speicher-/EVCS-PV-Aufteilung typisiert nach. */
export function buildCorePvAllocation(input: CoreRuntimePvAllocationInput = {}): CoreRuntimePvAllocation {
  const totalW = positive(input.totalW);
  const allocationEnabled = input.allocationEnabled !== false;
  const mode = allocationEnabled ? normalizeCorePvAllocationMode(input.mode) : 'dynamic';
  const evcsSharePct = Math.round(clamp(input.evcsSharePct, 0, 100, 50));
  const storageEligible = input.storageEligible !== false;
  const storageMaxRaw = finiteOrNull(input.storageMaxChargeW);
  const storageMaxChargeW = storageMaxRaw !== null && storageMaxRaw > 0
    ? storageMaxRaw
    : Number.POSITIVE_INFINITY;
  let storageWantedW = 0;
  let reason = 'shared';

  if (!storageEligible) reason = 'storage-not-eligible';
  else if (mode === 'storage') {
    storageWantedW = totalW;
    reason = 'storage-first';
  } else if (mode === 'emobility') reason = 'emobility-first';
  else if (mode === 'dynamic') reason = allocationEnabled ? 'dynamic-demand-remainder' : 'fixed-allocation-disabled';
  else storageWantedW = totalW * (1 - evcsSharePct / 100);

  const storageGuaranteedW = storageEligible
    ? Math.max(0, Math.min(totalW, storageWantedW, storageMaxChargeW))
    : 0;

  return {
    mode,
    allocationEnabled,
    evcsSharePct,
    totalW: round(totalW),
    evcsCapW: round(Math.max(0, totalW - storageGuaranteedW)),
    storageGuaranteedW: round(storageGuaranteedW),
    storageEligible,
    storageMaxChargeW: Number.isFinite(storageMaxChargeW) ? round(storageMaxChargeW) : null,
    reason,
    storageSocPct: (() => {
      const value = finiteOrNull(input.storageSocPct);
      return value === null ? null : Math.max(0, Math.min(100, value));
    })(),
    storageMaxSocPct: clamp(input.storageMaxSocPct, 0, 100, 100),
  };
}

/**
 * Berechnet einen unverbindlichen Grant aus zentralem Gesamt-/PV-Restbudget.
 * §14a und die Kunden-PV-Aufteilung werden ausschließlich hier angewendet.
 */
export function computeCoreCentralBudgetGrant(
  runtime: CoreRuntimeGrantState = {},
  request: CoreRuntimeGrantRequest = {},
): CoreRuntimeGrantResult {
  const requestedRawW = finiteOrNull(request.requestedW);
  const requestedW = requestedRawW === null ? Number.MAX_SAFE_INTEGER : Math.max(0, requestedRawW);
  const pvOnly = request.pvOnly === true;
  const applyEvcsAllocationCap = request.applyEvcsAllocationCap !== false;
  const key = text(request.key ?? request.consumer ?? request.app).toLowerCase();
  const remainingTotalRaw = finiteOrNull(runtime.remainingTotalW);
  const remainingTotalW = remainingTotalRaw === null ? Number.POSITIVE_INFINITY : Math.max(0, remainingTotalRaw);
  const remainingPvW = positive(runtime.remainingPvW);
  const requestCapRaw = finiteOrNull(request.maxW);
  let requestCapW = requestCapRaw === null ? Number.POSITIVE_INFINITY : Math.max(0, requestCapRaw);

  const allocation = runtime.gates?.pvAllocation && typeof runtime.gates.pvAllocation === 'object'
    ? runtime.gates.pvAllocation
    : null;
  const allocationEvcsCapRaw = allocation ? finiteOrNull(allocation.evcsCapW) : null;
  const allocationCapApplied = pvOnly && key === 'evcs' && applyEvcsAllocationCap && allocationEvcsCapRaw !== null;
  if (allocationCapApplied) requestCapW = Math.min(requestCapW, Math.max(0, allocationEvcsCapRaw));

  const para14a = runtime.gates?.para14a && typeof runtime.gates.para14a === 'object'
    ? runtime.gates.para14a
    : null;
  const para14aCapRaw = para14a && para14a.active === true
    ? resolvePara14aAppCap(para14a.appCapsW, key, request.app)
    : null;
  const para14aLocalPvGrantW = para14a && para14a.active === true
    ? positive(para14a.localPvGrantW)
    : 0;
  const para14aCapApplied = para14aCapRaw !== null && Number.isFinite(para14aCapRaw);
  if (para14aCapApplied) {
    requestCapW = Math.min(requestCapW, Math.max(0, para14aCapRaw) + para14aLocalPvGrantW);
  }

  const availableW = pvOnly
    ? Math.min(remainingTotalW, remainingPvW, requestCapW)
    : Math.min(remainingTotalW, requestCapW);
  const grantW = Math.max(0, Math.min(requestedW, availableW));

  return {
    requestedW: requestedRawW === null ? null : round(requestedW),
    grantW: round(grantW),
    availableW: Number.isFinite(availableW) ? round(availableW) : null,
    remainingTotalW: Number.isFinite(remainingTotalW) ? round(remainingTotalW) : null,
    remainingPvW: round(remainingPvW),
    allocationMode: allocation ? text(allocation.mode) : '',
    allocationEvcsCapW: allocationEvcsCapRaw === null ? null : round(Math.max(0, allocationEvcsCapRaw)),
    allocationCapApplied,
    para14aCapW: para14aCapApplied ? round(Math.max(0, para14aCapRaw)) : null,
    para14aLocalPvGrantW: round(para14aLocalPvGrantW),
    para14aCapApplied,
    pvOnly,
    key,
    source: 'ts-core-runtime-grant',
  };
}

/**
 * Baut den produktiven zentralen Budget-Snapshot aus bereits aufgelösten,
 * zeitlich geprüften Messwerten. Adapter-/Datenpunkt-I/O bleibt außerhalb.
 */
export function buildCoreRuntimeBudgetSnapshot(rawInput: CoreRuntimeSnapshotInput = {}): CoreRuntimeBudgetSnapshot {
  const prepared = prepareCoreRuntimeSnapshotInput(rawInput);
  const input = prepared.input;
  const ts = finiteOrNull(input.ts) ?? Date.now();
  const grid = input.grid && typeof input.grid === 'object' ? input.grid : {};
  const pv = input.pv && typeof input.pv === 'object' ? input.pv : {};
  const storage = input.storage && typeof input.storage === 'object' ? input.storage : {};
  const consumers = input.consumers && typeof input.consumers === 'object' ? input.consumers : {};
  const allocation = input.allocation && typeof input.allocation === 'object' ? input.allocation : {};

  const gridUsable = bool(grid.usable, false);
  const gridW = gridUsable ? (finiteOrNull(grid.netW) ?? 0) : 0;
  const gridImportW = Math.max(0, gridW);
  const gridExportW = Math.max(0, -gridW);
  const storageChargeW = positive(storage.chargeW);
  const storageDischargeW = positive(storage.dischargeW);
  const storageWriterActive = bool(storage.writerActive, false);
  const evcsUsedW = positive(consumers.evcsUsedW);
  const evcsActualW = positive(consumers.evcsActualW);
  const evcsPvUsedW = positive(consumers.evcsPvUsedW);
  const thermalUsedW = positive(consumers.thermalUsedW);
  const thermalActualW = positive(consumers.thermalActualW);
  const heatingRodUsedW = positive(consumers.heatingRodUsedW);
  const heatingRodActualW = positive(consumers.heatingRodActualW);
  const flexUsedW = Math.max(0, evcsUsedW + thermalUsedW + heatingRodUsedW);
  const flexActualW = Math.max(0, evcsActualW + thermalActualW + heatingRodActualW);
  const storageControlledChargeW = storageWriterActive ? storageChargeW : 0;
  const currentControlledLoadW = Math.max(0, flexActualW + storageControlledChargeW);
  const pvFlexUsedW = Math.max(0, evcsPvUsedW + thermalUsedW + heatingRodUsedW);
  const pvPowerW = positive(pv.measuredW);
  const pvReserveW = positive(pv.reserveW);

  const pvBudgetFlowRawW = Math.max(0, computeCorePvBudgetFlowRawW({
    gridW,
    flexUsedW: pvFlexUsedW,
    storageChargeW,
    storageDischargeW,
  }) - positive(pv.unconfirmedProbeW));
  const pvPhysical = resolveCorePvBudgetPhysicalCap({
    measuredPvW: pvPowerW,
    measuredPvFresh: pv.measuredFresh,
    flowRawW: pvBudgetFlowRawW,
    gridExportW,
    gridImportW,
    activePvSinkW: pvFlexUsedW + storageChargeW,
    lastTrustedW: pv.lastTrustedW,
    lastTrustedAgeMs: pv.lastTrustedAgeMs,
    holdMs: pv.holdMs,
    exportEvidenceThresholdW: pv.exportEvidenceThresholdW,
    importToleranceW: pv.importToleranceW,
  });
  const pvBudgetRawW = gridUsable ? Math.min(pvBudgetFlowRawW, pvPhysical.capW) : 0;
  const pvBudgetClampedW = Math.max(0, pvBudgetFlowRawW - pvBudgetRawW);
  const pvBudgetEffectiveW = Math.max(0, pvBudgetRawW - pvReserveW);

  const pvAllocation = buildCorePvAllocation({
    totalW: pvBudgetEffectiveW,
    mode: allocation.mode,
    evcsSharePct: allocation.evcsSharePct,
    allocationEnabled: allocation.enabled !== false,
    storageEligible: storage.eligible !== false,
    storageMaxChargeW: storage.maxChargeW,
    storageSocPct: storage.socPct,
    storageMaxSocPct: storage.maxSocPct,
  });

  const gridConfiguredLimitW = positive(grid.importLimitW);
  const gridHardLimitW = positive(grid.hardImportLimitW);
  const gridLimitW = gridHardLimitW > 0 ? gridHardLimitW : gridConfiguredLimitW;
  const gridPlanningLimitW = positive(grid.planningImportLimitW) || gridConfiguredLimitW || gridLimitW;
  const gridLimitStage = text(grid.limitStage);
  const gridRequiredReductionW = Math.max(0, finiteOrNull(grid.requiredReductionW) ?? 0);
  // RC78 / 0.8.203: Die Anschlussgrenze gilt ausschließlich für Bezug.
  // `gridW` bleibt deshalb signiert. Das Gesamtziel-Budget besteht aus der
  // bereits real laufenden, EMS-gesteuerten Last plus der noch möglichen
  // Änderung bis zur Importgrenze. Einspeisung (gridW < 0) erhöht folgerichtig
  // die nutzbare Lastfreigabe; Überbezug erzeugt einen negativen Inkrementwert
  // und reduziert bestehende flexible Lasten.
  const gridIncrementHeadroomW = gridUsable
    ? (gridLimitW > 0 ? gridLimitW - gridW : Number.POSITIVE_INFINITY)
    : 0;
  const gridHeadroomRawW = gridUsable
    ? (gridLimitW > 0 ? Math.max(0, currentControlledLoadW + gridIncrementHeadroomW) : Number.POSITIVE_INFINITY)
    : 0;
  const gridHeadroomW = gridHeadroomRawW;
  const highLevelRaw = finiteOrNull(grid.highLevelCapW);
  const highLevelCapW = highLevelRaw === null ? Number.POSITIVE_INFINITY : Math.max(0, highLevelRaw);
  const totalBudgetW = gridUsable ? Math.max(0, Math.min(gridHeadroomW, highLevelCapW)) : 0;
  const bindings: string[] = [];
  if (!gridUsable) bindings.push(`nvp_${text(grid.status, 'stale')}`);
  if (gridUsable && Number.isFinite(highLevelCapW) && Math.abs(totalBudgetW - highLevelCapW) <= 1) {
    bindings.push(text(grid.highLevelBinding, 'highLevel'));
  } else if (gridUsable && gridLimitW > 0 && Math.abs(totalBudgetW - gridHeadroomW) <= 1) {
    bindings.push(gridRequiredReductionW > 0
      ? (gridLimitStage === 'hard' ? 'grid-hard' : 'grid-soft')
      : 'grid-monitor');
  }
  if (!bindings.length) bindings.push('unlimited');

  const outConsumers: Record<string, CoreRuntimeBudgetConsumer> = {};
  if (evcsUsedW > 0 || evcsActualW > 0 || evcsPvUsedW > 0) {
    outConsumers.evcs = { priority: 100, usedW: round(evcsUsedW), pvUsedW: round(evcsPvUsedW), mode: 'charging' };
  }
  if (thermalUsedW > 0 || thermalActualW > 0) {
    outConsumers.thermal = { priority: 200, usedW: round(thermalUsedW), pvUsedW: round(thermalUsedW), mode: 'pvAuto' };
  }
  if (heatingRodUsedW > 0 || heatingRodActualW > 0) {
    outConsumers.heatingRod = { priority: 300, usedW: round(heatingRodUsedW), pvUsedW: round(heatingRodUsedW), mode: 'pvAuto' };
  }

  return {
    ts: Math.round(ts),
    active: true,
    mode: 'central-background-ts-runtime',
    source: 'ts-core-runtime',
    raw: {
      gridW: round(gridW),
      gridMeasurementUsable: gridUsable,
      gridMeasurementStatus: text(grid.status),
      gridMeasurementSource: text(grid.source),
      gridMeasurementReason: text(grid.reason),
      gridMeasurementAgeMs: roundNullable(grid.measurementAgeMs),
      gridImportW: round(gridImportW),
      gridExportW: round(gridExportW),
      pvPowerW: round(pvPowerW),
      storageChargeW: round(storageChargeW),
      storageDischargeW: round(storageDischargeW),
      evcsUsedW: round(evcsUsedW),
      evcsActualW: round(evcsActualW),
      evcsPvUsedW: round(evcsPvUsedW),
      thermalUsedW: round(thermalUsedW),
      thermalActualW: round(thermalActualW),
      heatingRodUsedW: round(heatingRodUsedW),
      heatingRodActualW: round(heatingRodActualW),
      flexUsedW: round(flexUsedW),
      flexActualW: round(flexActualW),
      storageControlledChargeW: round(storageControlledChargeW),
      currentControlledLoadW: round(currentControlledLoadW),
      pvFlexUsedW: round(pvFlexUsedW),
      pvReserveW: round(pvReserveW),
      pvBudgetFlowRawW: round(pvBudgetFlowRawW),
      pvBudgetPhysicalCapW: round(pvPhysical.capW),
      pvBudgetPhysicalSource: pvPhysical.source,
      pvBudgetPhysicalHeld: pvPhysical.held,
      pvBudgetDirectSource: text(pv.measuredSource),
      pvBudgetDirectFresh: bool(pv.measuredFresh, false),
      pvBudgetClampedW: round(pvBudgetClampedW),
    },
    gates: {
      grid: {
        importLimitW: round(gridLimitW),
        planningImportLimitW: round(gridPlanningLimitW),
        hardImportLimitW: round(gridHardLimitW),
        limitStage: gridLimitStage,
        importW: round(gridImportW),
        exportW: round(gridExportW),
        measurementUsable: gridUsable,
        measurementStatus: text(grid.status),
        measurementSource: text(grid.source),
        measurementReason: text(grid.reason),
        incrementHeadroomW: Number.isFinite(gridIncrementHeadroomW) ? round(gridIncrementHeadroomW) : null,
        currentControlledLoadW: round(currentControlledLoadW),
        headroomW: Number.isFinite(gridHeadroomW) ? round(gridHeadroomW) : null,
        headroomRawW: Number.isFinite(gridHeadroomRawW) ? round(gridHeadroomRawW) : null,
      },
      pv: {
        available: pvBudgetEffectiveW > 0,
        rawW: round(pvBudgetRawW),
        flowRawW: round(pvBudgetFlowRawW),
        physicalCapW: round(pvPhysical.capW),
        clampedW: round(pvBudgetClampedW),
        reserveW: round(pvReserveW),
        effectiveW: round(pvBudgetEffectiveW),
        source: pvPhysical.source,
        directPvSource: text(pv.measuredSource),
        directPvFresh: bool(pv.measuredFresh, false),
        physicalHeld: pvPhysical.held,
        clampReason: pvBudgetClampedW > 0 ? 'physical_pv_cap' : '',
      },
      storage: {
        chargeW: round(storageChargeW),
        dischargeW: round(storageDischargeW),
        topology: text(storage.topology, 'none'),
        writerActive: storageWriterActive,
        authorityReason: text(storage.authorityReason),
      },
      pvAllocation,
      forecast: input.forecast && typeof input.forecast === 'object' ? { ...input.forecast } : {},
      tariff: input.tariff && typeof input.tariff === 'object' ? { ...input.tariff } : {},
      para14a: input.para14a && typeof input.para14a === 'object'
        ? {
            ...input.para14a,
            localPvGrantW: round(pvBudgetEffectiveW),
            totalAllowanceW: (() => {
              const active = input.para14a?.active === true;
              const netCap = finiteOrNull(input.para14a?.totalCapW);
              return active && netCap !== null ? round(Math.max(0, netCap) + pvBudgetEffectiveW) : null;
            })(),
          }
        : { active: false, appCapsW: {}, localPvGrantW: 0, totalAllowanceW: null },
      total: {
        effectiveW: Number.isFinite(totalBudgetW) ? round(totalBudgetW) : null,
        binding: bindings.join('+'),
      },
    },
    consumers: outConsumers,
    typedRuntime: {
      productive: true,
      fallback: false,
      contractVersion: 'core-runtime-v2',
    },
  };
}

/** Baut den mutierbaren, aber weiterhin rein berechneten Budget-Laufzeitstand. */
export function createCoreRuntimeReservationState(
  snapshot: CoreRuntimeBudgetSnapshot | Record<string, unknown> | null | undefined,
): CoreRuntimeReservationState {
  const root = snapshot && typeof snapshot === 'object' ? snapshot as Record<string, unknown> : {};
  const gatesRaw = root.gates && typeof root.gates === 'object'
    ? root.gates as Record<string, unknown>
    : {};
  const totalRaw = gatesRaw.total && typeof gatesRaw.total === 'object'
    ? gatesRaw.total as Record<string, unknown>
    : {};
  const pvRaw = gatesRaw.pv && typeof gatesRaw.pv === 'object'
    ? gatesRaw.pv as Record<string, unknown>
    : {};
  const total = finiteOrNull(totalRaw.effectiveW);

  return {
    remainingTotalW: total === null ? null : Math.max(0, total),
    remainingPvW: positive(pvRaw.effectiveW),
    // Phase 2 darf die bestehende Gate-Struktur nicht verkleinern. EVCS,
    // Speicher und weitere Fachmodule lesen weiterhin `gates.pv`, `gates.total`
    // und Diagnosen direkt aus derselben Runtime. Deshalb werden alle Gates
    // flach kopiert; nur verschachtelte, regelrelevante Objekte erhalten eigene
    // Kopien, damit Reservierungen den Snapshot nicht versehentlich mutieren.
    gates: {
      ...(gatesRaw as CoreRuntimeGrantGates),
      grid: gatesRaw.grid && typeof gatesRaw.grid === 'object'
        ? { ...(gatesRaw.grid as Record<string, unknown>) }
        : null,
      pv: gatesRaw.pv && typeof gatesRaw.pv === 'object'
        ? { ...(gatesRaw.pv as Record<string, unknown>) }
        : null,
      storage: gatesRaw.storage && typeof gatesRaw.storage === 'object'
        ? { ...(gatesRaw.storage as Record<string, unknown>) }
        : null,
      total: gatesRaw.total && typeof gatesRaw.total === 'object'
        ? { ...(gatesRaw.total as Record<string, unknown>) }
        : null,
      forecast: gatesRaw.forecast && typeof gatesRaw.forecast === 'object'
        ? { ...(gatesRaw.forecast as Record<string, unknown>) }
        : null,
      tariff: gatesRaw.tariff && typeof gatesRaw.tariff === 'object'
        ? { ...(gatesRaw.tariff as Record<string, unknown>) }
        : null,
      pvAllocation: gatesRaw.pvAllocation && typeof gatesRaw.pvAllocation === 'object'
        ? { ...(gatesRaw.pvAllocation as Record<string, unknown>) }
        : null,
      para14a: gatesRaw.para14a && typeof gatesRaw.para14a === 'object'
        ? { ...(gatesRaw.para14a as Record<string, unknown>) }
        : null,
    },
    consumers: {},
    order: [],
    sequence: 0,
  };
}

function cloneReservationConsumers(
  consumers: Record<string, CoreRuntimeReservationEntry | Record<string, unknown>> | undefined,
): Record<string, CoreRuntimeReservationEntry | Record<string, unknown>> {
  const result: Record<string, CoreRuntimeReservationEntry | Record<string, unknown>> = {};
  for (const key of Object.keys(consumers || {})) {
    const entry = consumers?.[key];
    if (entry && typeof entry === 'object') result[key] = { ...entry };
  }
  return result;
}

/** Summiert die aktuell reservierte flexible Leistung in stabiler Reihenfolge. */
export function calculateCoreRuntimeFlexUsedW(
  consumers: Record<string, CoreRuntimeReservationEntry | Record<string, unknown>> = {},
  order: readonly string[] = [],
): number {
  const keys = order.length ? Array.from(order) : Object.keys(consumers);
  return round(keys.reduce((sum, key) => {
    const entry = consumers[key] as Record<string, unknown> | undefined;
    return sum + positive(entry?.usedW ?? entry?.reserveW);
  }, 0));
}

/** Baut die geordnete, veröffentlichbare Verbraucher-Liste. */
export function buildCoreRuntimeConsumersList(
  consumers: Record<string, CoreRuntimeReservationEntry | Record<string, unknown>> = {},
  order: readonly string[] = [],
): Array<Record<string, unknown>> {
  const keys = order.length ? Array.from(order) : Object.keys(consumers);
  const result: Array<Record<string, unknown>> = [];
  for (const key of keys) {
    const entry = consumers[key];
    if (entry && typeof entry === 'object') result.push({ ...entry, key });
  }
  return result;
}

/**
 * Wendet eine Verbraucherreservierung auf den zentralen Laufzeitstand an.
 * Grant, §14a- und PV-Aufteilung kommen aus derselben typisierten Core-Runtime.
 */
export function applyCoreRuntimeReservation(
  runtime: CoreRuntimeReservationState,
  request: CoreRuntimeReservationRequest = {},
  tsInput?: unknown,
): CoreRuntimeReservationResult {
  const ts = finiteOrNull(tsInput) ?? Date.now();
  const key = text(request.key ?? request.consumer ?? request.app, 'unknown');
  const app = text(request.app, key);
  const priority = finiteOrNull(request.priority) ?? 999;
  const requestedW = positive(request.requestedW);
  const reserveRaw = finiteOrNull(request.reserveW);
  const reserveW = reserveRaw === null ? requestedW : Math.max(0, reserveRaw);
  const pvOnly = request.pvOnly === true;
  const pvReserveRaw = finiteOrNull(request.pvReserveW);
  const pvReserveW = pvReserveRaw === null ? (pvOnly ? reserveW : 0) : Math.max(0, pvReserveRaw);
  const actualRaw = finiteOrNull(request.actualW);
  const actualW = actualRaw === null ? reserveW : Math.max(0, actualRaw);
  const grant = computeCoreCentralBudgetGrant(runtime, { ...request, requestedW });
  const currentTotal = runtime.remainingTotalW === null
    ? null
    : Math.max(0, finiteOrNull(runtime.remainingTotalW) ?? 0);
  const nextRemainingTotalW = currentTotal === null ? null : Math.max(0, round(currentTotal - reserveW));
  const nextRemainingPvW = Math.max(0, round(positive(runtime.remainingPvW) - pvReserveW));
  const sequence = Math.max(0, Math.floor(finiteOrNull(runtime.sequence) ?? 0)) + 1;

  const entry: CoreRuntimeReservationEntry = {
    key,
    app,
    label: text(request.label, key),
    priority,
    requestedW: round(requestedW),
    grantW: round(grant.grantW),
    usedW: round(reserveW),
    pvUsedW: round(pvReserveW),
    reserveW: round(reserveW),
    pvReserveW: round(pvReserveW),
    actualW: round(actualW),
    pvOnly,
    mode: text(request.mode),
    ts: Math.round(ts),
    sequence,
    remainingTotalW: nextRemainingTotalW,
    remainingPvW: nextRemainingPvW,
  };

  const consumers = cloneReservationConsumers(runtime.consumers);
  consumers[key] = entry;
  const order = Array.isArray(runtime.order) ? Array.from(runtime.order) : [];
  if (!order.includes(key)) order.push(key);
  const state: CoreRuntimeReservationState = {
    remainingTotalW: nextRemainingTotalW,
    remainingPvW: nextRemainingPvW,
    gates: runtime.gates && typeof runtime.gates === 'object' ? runtime.gates : {},
    consumers,
    order,
    sequence,
  };

  return {
    ok: true,
    source: 'ts-core-runtime-reservation-v2',
    entry,
    state,
    nextRemainingTotalW,
    nextRemainingPvW,
    consumers,
    order,
    flexUsedW: calculateCoreRuntimeFlexUsedW(consumers, order),
  };
}

/** Führt mehrere Grants/Reservierungen deterministisch in der übergebenen Reihenfolge aus. */
export function applyCoreRuntimeReservationSequence(
  initial: CoreRuntimeReservationState,
  requests: readonly CoreRuntimeReservationRequest[] = [],
  tsInput?: unknown,
): CoreRuntimeReservationSequenceResult {
  let state: CoreRuntimeReservationState = {
    remainingTotalW: initial.remainingTotalW,
    remainingPvW: positive(initial.remainingPvW),
    gates: initial.gates && typeof initial.gates === 'object' ? initial.gates : {},
    consumers: cloneReservationConsumers(initial.consumers),
    order: Array.isArray(initial.order) ? Array.from(initial.order) : [],
    sequence: Math.max(0, Math.floor(finiteOrNull(initial.sequence) ?? 0)),
  };
  const entries: CoreRuntimeReservationEntry[] = [];
  const baseTs = finiteOrNull(tsInput) ?? Date.now();
  for (let index = 0; index < requests.length; index++) {
    const result = applyCoreRuntimeReservation(state, requests[index] || {}, baseTs + index);
    entries.push(result.entry);
    state = result.state;
  }
  return {
    ok: true,
    source: 'ts-core-runtime-sequence-v2',
    entries,
    state,
    flexUsedW: calculateCoreRuntimeFlexUsedW(state.consumers, state.order),
  };
}

/** Erstellt den kanonischen Phase-3-Laufzeitstand aus genau einem Budget-Snapshot. */
export function createCoreRuntimePhase3State(
  snapshot: CoreRuntimeBudgetSnapshot | Record<string, unknown> | null | undefined,
): CoreRuntimePhase3State {
  const root = snapshot && typeof snapshot === 'object'
    ? snapshot as CoreRuntimeBudgetSnapshot | Record<string, unknown>
    : {};
  return {
    ok: true,
    source: 'ts-core-runtime-phase3',
    contractVersion: 'core-runtime-phase3',
    snapshot: root,
    reservationState: createCoreRuntimeReservationState(root),
    revision: 0,
    lastReservation: null,
  };
}

/** Wendet genau eine Reservierung auf den kanonischen Phase-3-Stand an. */
export function applyCoreRuntimePhase3Reservation(
  runtime: CoreRuntimePhase3State,
  request: CoreRuntimeReservationRequest = {},
  tsInput?: unknown,
): CoreRuntimePhase3ReservationResult {
  const base = runtime && runtime.ok === true
    ? runtime
    : createCoreRuntimePhase3State(null);
  const reservation = applyCoreRuntimeReservation(base.reservationState, request, tsInput);
  return {
    ok: true,
    source: 'ts-core-runtime-phase3-reservation',
    reservation,
    runtime: {
      ...base,
      reservationState: reservation.state,
      revision: Math.max(0, Math.floor(finiteOrNull(base.revision) ?? 0)) + 1,
      lastReservation: reservation,
    },
  };
}

/** Fuehrt eine geordnete Reservierungsfolge auf demselben Phase-3-Stand aus. */
export function applyCoreRuntimePhase3Sequence(
  runtime: CoreRuntimePhase3State,
  requests: readonly CoreRuntimeReservationRequest[] = [],
  tsInput?: unknown,
): CoreRuntimePhase3SequenceResult {
  const base = runtime && runtime.ok === true
    ? runtime
    : createCoreRuntimePhase3State(null);
  const sequence = applyCoreRuntimeReservationSequence(base.reservationState, requests, tsInput);
  return {
    ok: true,
    source: 'ts-core-runtime-phase3-sequence',
    sequence,
    runtime: {
      ...base,
      reservationState: sequence.state,
      revision: Math.max(0, Math.floor(finiteOrNull(base.revision) ?? 0)) + Math.max(1, requests.length),
      // Die Sequenz selbst ist die kanonische Wahrheit. Für die Diagnose bleibt
      // die letzte Einzelreservierung erhalten; es wird kein künstlicher 0-W-Consumer
      // in den Laufzeitstand eingefügt.
      lastReservation: base.lastReservation,
    },
  };
}

/**
 * Baut State- und Cache-Publikation aus demselben typisierten Laufzeitstand, der
 * zuvor die Grants und Reservierungen gefuehrt hat. Damit existiert keine zweite
 * unabhaengige Restbudgetreferenz mehr.
 */
export function buildCoreRuntimePhase3PublicationPlan(
  input: CoreRuntimePhase3PublicationInput = {},
): CoreRuntimePhase3PublicationPlan {
  const runtime = input.runtime && input.runtime.ok === true
    ? input.runtime
    : createCoreRuntimePhase3State(null);
  const plan = buildCoreRuntimePublicationPlan({
    ...input,
    snapshot: runtime.snapshot,
    runtime: runtime.reservationState,
    tsReservation: runtime.lastReservation as unknown as Record<string, unknown> | null,
  });
  const states = {
    ...plan.states,
    'ems.budget.phase3RuntimeMode': 'typed-core-runtime-v3',
    'ems.budget.phase3RuntimeFallback': false,
    'ems.budget.phase3RuntimeRevision': runtime.revision,
    'ems.budget.phase3RuntimeReason': 'single-typed-runtime-state',
    'ems.budget.phase2PublicationMode': 'typed-core-runtime-publication-v3',
  };
  const cache = {
    ...plan.cache,
    'ems.budget.phase3RuntimeMode': states['ems.budget.phase3RuntimeMode'],
    'ems.budget.phase3RuntimeFallback': states['ems.budget.phase3RuntimeFallback'],
    'ems.budget.phase3RuntimeRevision': states['ems.budget.phase3RuntimeRevision'],
    'ems.budget.phase3RuntimeReason': states['ems.budget.phase3RuntimeReason'],
    'ems.budget.phase2PublicationMode': states['ems.budget.phase2PublicationMode'],
  };
  return {
    ...plan,
    source: 'ts-core-runtime-publication-v3',
    contractVersion: 'core-runtime-publication-v3',
    runtimeRevision: runtime.revision,
    states,
    cache,
  };
}

function publicationJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

/**
 * Baut den vollständigen State-/Cache-Publikationsplan für den Budget-Snapshot.
 * Adapter-I/O bleibt außerhalb; dadurch ist die Veröffentlichung testbar und
 * kann bei einer Abweichung vollständig auf den bisherigen JS-Pfad zurückfallen.
 */
export function buildCoreRuntimePublicationPlan(
  input: CoreRuntimePublicationInput = {},
): CoreRuntimePublicationPlan {
  const snapshot = input.snapshot && typeof input.snapshot === 'object'
    ? input.snapshot as Record<string, unknown>
    : {};
  const raw = snapshot.raw && typeof snapshot.raw === 'object'
    ? snapshot.raw as Record<string, unknown>
    : {};
  const gates = snapshot.gates && typeof snapshot.gates === 'object'
    ? snapshot.gates as Record<string, unknown>
    : {};
  const grid = gates.grid && typeof gates.grid === 'object' ? gates.grid as Record<string, unknown> : {};
  const pv = gates.pv && typeof gates.pv === 'object' ? gates.pv as Record<string, unknown> : {};
  const total = gates.total && typeof gates.total === 'object' ? gates.total as Record<string, unknown> : {};
  const allocation = gates.pvAllocation && typeof gates.pvAllocation === 'object'
    ? gates.pvAllocation as Record<string, unknown>
    : {};
  const para14a = gates.para14a && typeof gates.para14a === 'object'
    ? gates.para14a as Record<string, unknown>
    : {};
  const forecast = gates.forecast && typeof gates.forecast === 'object'
    ? gates.forecast as Record<string, unknown>
    : {};
  const tariff = gates.tariff && typeof gates.tariff === 'object'
    ? gates.tariff as Record<string, unknown>
    : {};
  const runtime = input.runtime && typeof input.runtime === 'object' ? input.runtime : {};
  const consumers = runtime.consumers && typeof runtime.consumers === 'object'
    ? runtime.consumers as Record<string, CoreRuntimeReservationEntry | Record<string, unknown>>
    : {};
  const order = Array.isArray(runtime.order) ? Array.from(runtime.order) : [];
  const consumerList = buildCoreRuntimeConsumersList(consumers, order);
  const ts = Math.round(finiteOrNull(snapshot.ts) ?? Date.now());
  const remainingTotalRaw = finiteOrNull(runtime.remainingTotalW);
  const remainingTotalW = remainingTotalRaw === null ? 0 : Math.max(0, round(remainingTotalRaw));
  const remainingPvW = round(positive(runtime.remainingPvW));
  const coreStatus = input.coreRuntimeStatus && typeof input.coreRuntimeStatus === 'object'
    ? input.coreRuntimeStatus
    : {};
  const sourceParts: string[] = [];
  if (bool(coreStatus.active, false)) sourceParts.push('ts-core-runtime');
  if (input.tsProductive && bool(input.tsProductive.active, false)) sourceParts.push('ts-core-budget');
  if (input.tsRestGates && bool(input.tsRestGates.active, false)) sourceParts.push('rest-gates');
  if (!sourceParts.length) sourceParts.push('js-runtime');

  const states: Record<string, CoreRuntimePublishValue> = {
    'ems.budget.active': true,
    'ems.budget.lastUpdate': ts,
    'ems.budget.mode': text(snapshot.mode, 'central-background'),
    'ems.budget.source': sourceParts.join('+'),
    'ems.budget.totalBudgetW': round(total.effectiveW),
    'ems.budget.remainingTotalW': remainingTotalW,
    'ems.budget.pvBudgetRawW': round(pv.rawW),
    'ems.budget.pvBudgetW': round(pv.effectiveW),
    'ems.budget.remainingPvW': remainingPvW,
    'ems.budget.gridW': round(raw.gridW),
    'ems.budget.gridExportW': round(raw.gridExportW),
    'ems.budget.gridImportW': round(raw.gridImportW),
    'ems.budget.storageChargeW': round(raw.storageChargeW),
    'ems.budget.storageDischargeW': round(raw.storageDischargeW),
    'ems.budget.pvPowerW': round(raw.pvPowerW),
    'ems.budget.pvBudgetFlowRawW': round(raw.pvBudgetFlowRawW),
    'ems.budget.pvBudgetPhysicalCapW': round(raw.pvBudgetPhysicalCapW),
    'ems.budget.pvBudgetPhysicalSource': text(raw.pvBudgetPhysicalSource),
    'ems.budget.pvBudgetPhysicalHeld': bool(raw.pvBudgetPhysicalHeld, false),
    'ems.budget.pvBudgetDirectSource': text(raw.pvBudgetDirectSource),
    'ems.budget.pvBudgetDirectFresh': bool(raw.pvBudgetDirectFresh, false),
    'ems.budget.pvBudgetPvFlexUsedW': round(raw.pvFlexUsedW),
    'ems.budget.pvBudgetClampedW': round(raw.pvBudgetClampedW),
    'ems.budget.flexUsedW': calculateCoreRuntimeFlexUsedW(consumers, order),
    'ems.budget.binding': text(total.binding),
    'ems.budget.snapshot': publicationJson(snapshot),
    'ems.budget.consumersJson': publicationJson(consumerList),
    'ems.budget.tsShadowJson': publicationJson(input.tsShadow),
    'ems.budget.tsProductiveJson': publicationJson(input.tsProductive),
    'ems.budget.tsReservationJson': publicationJson(input.tsReservation),
    'ems.budget.tsRestGatesJson': publicationJson(input.tsRestGates),
    'ems.budget.tsCoreRuntimeMode': text(coreStatus.mode, 'legacy-js-fallback'),
    'ems.budget.tsCoreRuntimeFallback': bool(coreStatus.fallback, true),
    'ems.budget.tsCoreRuntimeMismatchCount': round(coreStatus.mismatchCount),
    'ems.budget.tsCoreRuntimeJson': publicationJson(coreStatus),
    'ems.budget.pvAllocationEnabled': allocation.allocationEnabled !== false,
    'ems.budget.pvAllocationMode': text(allocation.mode, 'both'),
    'ems.budget.pvAllocationEvcsSharePct': round(allocation.evcsSharePct),
    'ems.budget.pvAllocationEvcsCapW': round(allocation.evcsCapW),
    'ems.budget.pvAllocationStorageGuaranteedW': round(allocation.storageGuaranteedW),
    'ems.budget.pvAllocationStorageEligible': bool(allocation.storageEligible, false),
    'ems.budget.pvAllocationStorageMaxChargeW': round(allocation.storageMaxChargeW),
    'ems.budget.pvAllocationReason': text(allocation.reason),
    'ems.budget.para14aActive': bool(para14a.active, false),
    'ems.budget.para14aMode': text(para14a.mode),
    'ems.budget.para14aEvcsCapW': round(para14a.evcsCapW),
    'ems.budget.para14aTotalCapW': round(para14a.totalCapW),
    'ems.budget.para14aAppCapsJson': publicationJson(para14a.appCapsW),
    'ems.budget.para14aSignalFresh': bool(para14a.signalFresh, false),
    'ems.budget.para14aSignalStatus': text(para14a.signalStatus),
    'ems.budget.para14aConstraintOnly': bool(para14a.constraintOnly, false),
    'ems.budget.forecast.valid': bool(forecast.valid, false),
    'ems.budget.forecast.usable': bool(forecast.usable, false),
    'ems.budget.forecast.ageMs': roundNullable(forecast.ageMs),
    'ems.budget.forecast.points': round(forecast.points),
    'ems.budget.forecast.confidencePct': round(forecast.confidencePct),
    'ems.budget.forecast.nowW': round(forecast.nowW),
    'ems.budget.forecast.avgNext1hW': round(forecast.avgNext1hW),
    'ems.budget.forecast.avgNext3hW': round(forecast.avgNext3hW),
    'ems.budget.forecast.peakNext6hW': round(forecast.peakNext6hW),
    'ems.budget.forecast.peakNext24hW': round(forecast.peakNext24hW),
    'ems.budget.forecast.kwhNext1h': finiteOrNull(forecast.kwhNext1h) ?? 0,
    'ems.budget.forecast.kwhNext3h': finiteOrNull(forecast.kwhNext3h) ?? 0,
    'ems.budget.forecast.kwhNext6h': finiteOrNull(forecast.kwhNext6h) ?? 0,
    'ems.budget.forecast.kwhNext12h': finiteOrNull(forecast.kwhNext12h) ?? 0,
    'ems.budget.forecast.kwhNext24h': finiteOrNull(forecast.kwhNext24h) ?? 0,
    'ems.budget.forecast.status': text(forecast.status),
    'ems.budget.forecast.source': text(forecast.source),
    'ems.budget.forecast.snapshotJson': publicationJson(forecast),
    'ems.budget.tariff.active': bool(tariff.active, false),
    'ems.budget.tariff.state': text(tariff.state),
    'ems.budget.tariff.currentPriceEurKwh': finiteOrNull(tariff.currentPriceEurKwh),
    'ems.budget.tariff.negativeActive': bool(tariff.negativeActive, false),
    'ems.budget.tariff.gridImportPreferred': bool(tariff.gridImportPreferred, false),
    'ems.budget.tariff.storageGridChargeAllowed': bool(tariff.storageGridChargeAllowed, false),
    'ems.budget.tariff.evcsGridChargeAllowed': bool(tariff.evcsGridChargeAllowed, false),
    'ems.budget.tariff.dischargeAllowed': tariff.dischargeAllowed !== false,
    'ems.budget.tariff.pvCurtailRecommended': bool(tariff.pvCurtailRecommended, false),
    'ems.budget.tariff.negativeMinPriceEurKwh': finiteOrNull(tariff.negativeMinPriceEurKwh),
    'ems.budget.tariff.nextNegativeFrom': text(tariff.nextNegativeFrom),
    'ems.budget.tariff.nextNegativeTo': text(tariff.nextNegativeTo),
    'ems.budget.tariff.status': text(tariff.status),
    'ems.budget.tariff.snapshotJson': publicationJson(tariff),
    'ems.budget.phase2PublicationMode': 'typed-core-runtime-publication-v2',
  };

  const consumerKeys = Array.from(new Set([...order, 'evcs', 'storage', 'thermal', 'heatingRod']));
  for (const key of consumerKeys) {
    const entry = consumers[key] as Record<string, unknown> | undefined;
    states[`ems.budget.consumers.${key}.usedW`] = round(entry?.usedW ?? entry?.reserveW);
    states[`ems.budget.consumers.${key}.pvUsedW`] = round(entry?.pvUsedW ?? entry?.pvReserveW);
    states[`ems.budget.consumers.${key}.actualW`] = round(entry?.actualW);
    states[`ems.budget.consumers.${key}.priority`] = round(entry?.priority);
    states[`ems.budget.consumers.${key}.mode`] = text(entry?.mode);
  }

  const cacheKeys = [
    'ems.budget.remainingTotalW',
    'ems.budget.remainingPvW',
    'ems.budget.pvBudgetW',
    'ems.budget.pvBudgetRawW',
    'ems.budget.gridW',
    'ems.budget.flexUsedW',
    'ems.budget.consumersJson',
    'ems.budget.tsReservationJson',
    'ems.budget.tsRestGatesJson',
    'ems.budget.tsCoreRuntimeMode',
    'ems.budget.tsCoreRuntimeFallback',
    'ems.budget.tsCoreRuntimeMismatchCount',
    'ems.budget.tsCoreRuntimeJson',
    'ems.budget.pvAllocationEnabled',
    'ems.budget.pvAllocationMode',
    'ems.budget.pvAllocationEvcsSharePct',
    'ems.budget.pvAllocationEvcsCapW',
    'ems.budget.pvAllocationStorageGuaranteedW',
    'ems.budget.pvAllocationStorageEligible',
    'ems.budget.pvAllocationStorageMaxChargeW',
    'ems.budget.pvAllocationReason',
    'ems.budget.pvBudgetFlowRawW',
    'ems.budget.pvBudgetPhysicalCapW',
    'ems.budget.pvBudgetPhysicalSource',
    'ems.budget.pvBudgetPhysicalHeld',
    'ems.budget.pvBudgetDirectSource',
    'ems.budget.pvBudgetDirectFresh',
    'ems.budget.pvBudgetPvFlexUsedW',
    'ems.budget.pvBudgetClampedW',
    'ems.budget.forecast.nowW',
    'ems.budget.forecast.avgNext1hW',
    'ems.budget.forecast.kwhNext6h',
    'ems.budget.forecast.usable',
    'ems.budget.tariff.negativeActive',
    'ems.budget.tariff.gridImportPreferred',
    'ems.budget.tariff.currentPriceEurKwh',
    'ems.budget.tariff.status',
    'ems.budget.phase2PublicationMode',
  ];
  const cache: Record<string, CoreRuntimePublishValue> = {};
  for (const key of cacheKeys) cache[key] = states[key] ?? null;
  for (const key of consumerKeys) {
    for (const field of ['usedW', 'pvUsedW', 'actualW']) {
      const id = `ems.budget.consumers.${key}.${field}`;
      cache[id] = states[id] ?? 0;
    }
  }

  return {
    ok: true,
    source: 'ts-core-runtime-publication-v2',
    contractVersion: 'core-runtime-publication-v2',
    ts,
    states,
    cache,
    consumerKeys,
  };
}

/** Vergleicht die zentralen, regelrelevanten Felder eines Legacy- und TS-Snapshots. */
export function compareCoreRuntimeBudgetSnapshots(
  legacy: Record<string, unknown> | null | undefined,
  typed: CoreRuntimeBudgetSnapshot,
  toleranceW = 1,
): CoreRuntimeMismatch[] {
  const mismatches: CoreRuntimeMismatch[] = [];
  const legacyRoot = legacy && typeof legacy === 'object' ? legacy : {};

  const readPath = (root: Record<string, unknown>, path: string): unknown => {
    let current: unknown = root;
    for (const part of path.split('.')) {
      if (!current || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  };

  const compareNumber = (path: string, tolerance = toleranceW): void => {
    const legacyValue = finiteOrNull(readPath(legacyRoot, path));
    const typedValue = finiteOrNull(readPath(typed as unknown as Record<string, unknown>, path));
    if (legacyValue === null && typedValue === null) return;
    if (legacyValue === null || typedValue === null || Math.abs(legacyValue - typedValue) > tolerance) {
      mismatches.push({ field: path, legacy: legacyValue, typed: typedValue, tolerance });
    }
  };
  const compareBool = (path: string): void => {
    const legacyValue = bool(readPath(legacyRoot, path), false);
    const typedValue = bool(readPath(typed as unknown as Record<string, unknown>, path), false);
    if (legacyValue !== typedValue) mismatches.push({ field: path, legacy: legacyValue, typed: typedValue });
  };
  const compareText = (path: string): void => {
    const legacyValue = text(readPath(legacyRoot, path));
    const typedValue = text(readPath(typed as unknown as Record<string, unknown>, path));
    if (legacyValue !== typedValue) mismatches.push({ field: path, legacy: legacyValue, typed: typedValue });
  };

  for (const path of [
    'raw.gridW',
    'raw.gridImportW',
    'raw.gridExportW',
    'raw.pvPowerW',
    'raw.storageChargeW',
    'raw.storageDischargeW',
    'raw.evcsUsedW',
    'raw.evcsActualW',
    'raw.evcsPvUsedW',
    'raw.thermalUsedW',
    'raw.thermalActualW',
    'raw.heatingRodUsedW',
    'raw.heatingRodActualW',
    'raw.flexUsedW',
    'raw.flexActualW',
    'raw.storageControlledChargeW',
    'raw.currentControlledLoadW',
    'raw.pvFlexUsedW',
    'raw.pvReserveW',
    'raw.pvBudgetFlowRawW',
    'raw.pvBudgetPhysicalCapW',
    'raw.pvBudgetClampedW',
    'gates.grid.importLimitW',
    'gates.grid.importW',
    'gates.grid.exportW',
    'gates.grid.incrementHeadroomW',
    'gates.grid.currentControlledLoadW',
    'gates.grid.headroomW',
    'gates.grid.headroomRawW',
    'gates.pv.rawW',
    'gates.pv.flowRawW',
    'gates.pv.physicalCapW',
    'gates.pv.clampedW',
    'gates.pv.reserveW',
    'gates.pv.effectiveW',
    'gates.storage.chargeW',
    'gates.storage.dischargeW',
    'gates.pvAllocation.evcsCapW',
    'gates.pvAllocation.storageGuaranteedW',
    'gates.total.effectiveW',
  ]) compareNumber(path);

  for (const path of [
    'raw.gridMeasurementUsable',
    'raw.pvBudgetPhysicalHeld',
    'raw.pvBudgetDirectFresh',
    'gates.grid.measurementUsable',
    'gates.pv.available',
    'gates.pv.directPvFresh',
    'gates.pv.physicalHeld',
    'gates.pvAllocation.allocationEnabled',
    'gates.pvAllocation.storageEligible',
    'gates.storage.writerActive',
  ]) compareBool(path);

  for (const path of [
    'raw.gridMeasurementStatus',
    'raw.gridMeasurementSource',
    'raw.gridMeasurementReason',
    'raw.pvBudgetPhysicalSource',
    'raw.pvBudgetDirectSource',
    'gates.grid.measurementStatus',
    'gates.grid.measurementSource',
    'gates.grid.measurementReason',
    'gates.pv.source',
    'gates.pv.directPvSource',
    'gates.pv.clampReason',
    'gates.pvAllocation.mode',
    'gates.pvAllocation.reason',
    'gates.storage.topology',
    'gates.storage.authorityReason',
    'gates.total.binding',
  ]) compareText(path);

  return mismatches;
}
