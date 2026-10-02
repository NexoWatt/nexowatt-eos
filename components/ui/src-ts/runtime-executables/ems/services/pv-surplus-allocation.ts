// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Teilt verfügbaren PV-Überschuss und reservierten Ladebedarf zwischen den freigegebenen Nutzungen auf.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/pv-surplus-allocation.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

declare const module: { exports: unknown };

type AllocationOptions = {
  allocationEnabled?: boolean;
  storageEligible?: boolean;
  storageMaxChargeW?: number | null;
};

type AllocationResult = {
  mode: 'storage' | 'emobility' | 'both' | 'dynamic';
  allocationEnabled: boolean;
  evcsSharePct: number;
  totalW: number;
  evcsCapW: number;
  storageGuaranteedW: number;
  storageEligible: boolean;
  storageMaxChargeW: number | null;
  reason: string;
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function roundW(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function normalizePvSurplusPriority(value: unknown): AllocationResult['mode'] {
  const mode = String(value ?? '').trim().toLowerCase();
  if (mode === 'storage' || mode === 'speicher') return 'storage';
  if (mode === 'emobility' || mode === 'e-mobility' || mode === 'evcs' || mode === 'wallbox') return 'emobility';
  if (mode === 'dynamic' || mode === 'auto' || mode === 'none' || mode === 'off' || mode === 'disabled') return 'dynamic';
  return 'both';
}

export function buildPvSurplusAllocation(
  totalW: unknown,
  modeRaw: unknown,
  evcsSharePctRaw: unknown,
  options: AllocationOptions = {},
): AllocationResult {
  const total = Math.max(0, Number(totalW) || 0);
  const allocationEnabled = options.allocationEnabled !== false;
  const mode = allocationEnabled ? normalizePvSurplusPriority(modeRaw) : 'dynamic';
  const evcsSharePct = clamp(evcsSharePctRaw, 0, 100, 50);
  const storageEligible = options.storageEligible !== false;
  const storageMaxRaw = Number(options.storageMaxChargeW);
  const storageMaxChargeW = Number.isFinite(storageMaxRaw) && storageMaxRaw > 0 ? storageMaxRaw : Number.POSITIVE_INFINITY;

  let storageWantedW = 0;
  let reason = 'shared';
  if (!storageEligible) reason = 'storage-not-eligible';
  else if (mode === 'storage') { storageWantedW = total; reason = 'storage-first'; }
  else if (mode === 'emobility') reason = 'emobility-first';
  else if (mode === 'dynamic') reason = allocationEnabled ? 'dynamic-demand-remainder' : 'fixed-allocation-disabled';
  else storageWantedW = total * (1 - evcsSharePct / 100);

  const storageGuaranteedW = storageEligible ? Math.max(0, Math.min(total, storageWantedW, storageMaxChargeW)) : 0;
  return {
    mode,
    allocationEnabled,
    evcsSharePct: Math.round(evcsSharePct),
    totalW: roundW(total),
    evcsCapW: roundW(Math.max(0, total - storageGuaranteedW)),
    storageGuaranteedW: roundW(storageGuaranteedW),
    storageEligible,
    storageMaxChargeW: Number.isFinite(storageMaxChargeW) ? roundW(storageMaxChargeW) : null,
    reason,
  };
}


export type AutoPvPriorityPoint = {
  safe: string;
  userMode: string;
  effectiveMode: string;
  enabled: boolean;
  online: boolean;
  demandConfirmed: boolean;
  startProbeActive: boolean;
  actualFresh: boolean;
  actualW: number;
  finalTargetW: number;
  technicalMinimumW: number;
  phaseTransition: boolean;
};

/**
 * Attribution only: never creates a charging command or a grid permission.
 * PV-driven Auto is already effectiveMode=pv and uses the existing phase-aware
 * PV allocator. Grid-enabled Auto may use a partial PV share, but only after
 * the final safety/phase/minimum guard has approved a runnable target.
 * No provisional Auto start or rated charger power is reserved here.
 */
export function buildAutoPvPriorityReservation(input: {
  points: readonly AutoPvPriorityPoint[];
  priorityCapW: number;
  physicalCapW: number;
  otherPriorityReservedW: number;
  otherPhysicalReservedW: number;
}): { reservedW: number; remainingPriorityW: number; rows: { safe: string; reservedW: number; minimumW: number; reason: string }[] } {
  const positiveW = (v: unknown): number => Math.max(0, Number.isFinite(Number(v)) ? Number(v) : 0);
  let priorityRemainingW = Math.max(0, positiveW(input.priorityCapW) - positiveW(input.otherPriorityReservedW));
  let physicalRemainingW = Math.max(0, positiveW(input.physicalCapW) - positiveW(input.otherPhysicalReservedW));
  let reservedW = 0;
  const rows: { safe: string; reservedW: number; minimumW: number; reason: string }[] = [];
  for (const point of input.points) {
    const mode = String(point.effectiveMode || '').toLowerCase();
    const userMode = String(point.userMode || 'auto').toLowerCase();
    const minimumW = positiveW(point.technicalMinimumW);
    let claimW = 0;
    let reason = 'not-auto-grid-mode';
    if (userMode === 'auto' && (mode === 'auto' || mode === 'normal')) {
      reason = 'no-runnable-demand';
      if (point.enabled && point.online) {
        // Real, fresh power continues to occupy PV during a controlled stop.
        // A switch request cannot make an actually flowing load disappear.
        const actualW = point.actualFresh ? positiveW(point.actualW) : 0;
        const targetW = !point.phaseTransition && (point.demandConfirmed || point.startProbeActive)
          ? positiveW(point.finalTargetW) : 0;
        const runnableTargetW = targetW > 0 && targetW + 1e-6 >= minimumW ? targetW : 0;
        const demandW = Math.max(actualW, runnableTargetW);
        claimW = Math.min(demandW, priorityRemainingW, physicalRemainingW);
        if (claimW > 0) reason = 'auto-pv-share-of-approved-load';
        else if (point.phaseTransition) reason = 'phase-transition-no-start-reservation';
        else if (targetW > 0 && runnableTargetW === 0) reason = 'below-technical-minimum';
        else if (demandW > 0) reason = 'no-pv-priority-remainder';
      } else reason = 'not-available';
    }
    // Round down so neither the physical nor the customer cap can be exceeded.
    claimW = Math.floor(Math.max(0, claimW));
    priorityRemainingW = Math.max(0, priorityRemainingW - claimW);
    physicalRemainingW = Math.max(0, physicalRemainingW - claimW);
    reservedW += claimW;
    rows.push({ safe: point.safe, reservedW: claimW, minimumW, reason });
  }
  return { reservedW, remainingPriorityW: priorityRemainingW, rows };
}

module.exports = { normalizePvSurplusPriority, buildPvSurplusAllocation, buildAutoPvPriorityReservation };

