// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Hält bestätigte Leistungsanforderungen fest, damit nachfolgende Budgets mit angenommenen Stellwirkungen rechnen können.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/accepted-power-effects.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Same-cycle ledger for physical actuator power changes.
 *
 * The NVP meter normally represents the plant state at the beginning of an EMS
 * cycle. Flexible loads and local generators can receive a different target
 * later in the same cycle. Before PV/WR curtailment runs, the NVP coordinator
 * may project only changes whose hardware command was accepted and whose
 * baseline is trustworthy.
 *
 * Sign convention for `netLoadDeltaW`:
 * - positive: the NVP moves towards import (load rises / generation falls)
 * - negative: the NVP moves towards export (load falls / generation rises)
 *
 * Unknown-power transitions are deliberately not estimated. They are marked as
 * uncertain so the PV controller can wait for a fresh NVP measurement instead
 * of curtailing against a value measured before the actuator transition.
 */

declare const module: { exports: unknown };

type AnyRecord = Record<string, any>;

type RecordInput = {
  key: string;
  targetW?: number | null;
  baselineW?: number | null;
  baselineFresh?: boolean;
  accepted?: boolean;
  commandChanged?: boolean;
  kind?: 'load' | 'generation';
  source?: string;
  reason?: string;
  uncertain?: boolean;
};

const finiteOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const rounded = (value: unknown, fallback = 0): number => {
  const n = finiteOrNull(value);
  return n === null ? fallback : Math.round(n);
};

function emptySnapshot(): AnyRecord {
  return {
    schema: 'nexowatt.accepted-power-effects.v2',
    cycleId: '',
    ts: 0,
    netLoadDeltaW: 0,
    loadDeltaW: 0,
    generationDeltaW: 0,
    creditedEffectCount: 0,
    uncertainEffectCount: 0,
    rejectedEffectCount: 0,
    entries: [],
  };
}

function ensureRememberedTargets(adapter: AnyRecord): Map<string, number> {
  if (!(adapter._nwAcceptedPowerTargets instanceof Map)) adapter._nwAcceptedPowerTargets = new Map();
  return adapter._nwAcceptedPowerTargets;
}

function beginAcceptedPowerEffectCycle(adapter: AnyRecord, cycleId: unknown, now = Date.now()): AnyRecord {
  const ledger = {
    ...emptySnapshot(),
    cycleId: String(cycleId ?? ''),
    ts: Math.max(0, rounded(now, Date.now())),
    entries: [] as AnyRecord[],
    entryIndexByKey: new Map<string, number>(),
  };
  if (adapter && typeof adapter === 'object') {
    ensureRememberedTargets(adapter);
    adapter._nwAcceptedPowerEffects = ledger;
  }
  return ledger;
}

function ensureLedger(adapter: AnyRecord): AnyRecord {
  let ledger = adapter && adapter._nwAcceptedPowerEffects;
  if (!ledger || typeof ledger !== 'object' || !Array.isArray(ledger.entries)) {
    ledger = beginAcceptedPowerEffectCycle(adapter, 'standalone', Date.now());
  }
  if (!(ledger.entryIndexByKey instanceof Map)) {
    ledger.entryIndexByKey = new Map();
    ledger.entries.forEach((entry: AnyRecord, index: number) => {
      const key = String(entry && entry.key || '').trim();
      if (key) ledger.entryIndexByKey.set(key, index);
    });
  }
  return ledger;
}

function removeContribution(ledger: AnyRecord, entry: AnyRecord | null): void {
  if (!entry) return;
  ledger.netLoadDeltaW = rounded((Number(ledger.netLoadDeltaW) || 0) - (Number(entry.netLoadDeltaW) || 0));
  if (entry.kind === 'generation') {
    ledger.generationDeltaW = rounded((Number(ledger.generationDeltaW) || 0) - (Number(entry.deltaW) || 0));
  } else {
    ledger.loadDeltaW = rounded((Number(ledger.loadDeltaW) || 0) - (Number(entry.deltaW) || 0));
  }
  if (entry.credited === true) ledger.creditedEffectCount = Math.max(0, rounded(ledger.creditedEffectCount) - 1);
  if (entry.uncertain === true) ledger.uncertainEffectCount = Math.max(0, rounded(ledger.uncertainEffectCount) - 1);
  if (entry.accepted !== true) ledger.rejectedEffectCount = Math.max(0, rounded(ledger.rejectedEffectCount) - 1);
}

function putEntry(ledger: AnyRecord, entry: AnyRecord): AnyRecord {
  const key = String(entry.key || '').trim();
  const existingIndex = ledger.entryIndexByKey.get(key);
  if (Number.isInteger(existingIndex) && existingIndex >= 0 && existingIndex < ledger.entries.length) {
    removeContribution(ledger, ledger.entries[existingIndex]);
    ledger.entries[existingIndex] = entry;
  } else {
    ledger.entryIndexByKey.set(key, ledger.entries.length);
    ledger.entries.push(entry);
  }

  ledger.netLoadDeltaW = rounded((Number(ledger.netLoadDeltaW) || 0) + (Number(entry.netLoadDeltaW) || 0));
  if (entry.kind === 'generation') {
    ledger.generationDeltaW = rounded((Number(ledger.generationDeltaW) || 0) + (Number(entry.deltaW) || 0));
  } else {
    ledger.loadDeltaW = rounded((Number(ledger.loadDeltaW) || 0) + (Number(entry.deltaW) || 0));
  }
  if (entry.credited === true) ledger.creditedEffectCount = rounded(ledger.creditedEffectCount) + 1;
  if (entry.uncertain === true) ledger.uncertainEffectCount = rounded(ledger.uncertainEffectCount) + 1;
  if (entry.accepted !== true) ledger.rejectedEffectCount = rounded(ledger.rejectedEffectCount) + 1;
  return entry;
}

/**
 * Record a target whose physical writer has already returned its acceptance.
 * A delta is credited only when the command changed and a fresh physical
 * baseline is supplied. Otherwise the transition is marked uncertain.
 */
function recordAcceptedPowerTarget(adapter: AnyRecord, input: RecordInput): AnyRecord | null {
  if (!adapter || typeof adapter !== 'object' || !input) return null;
  const key = String(input.key || '').trim();
  const targetW = finiteOrNull(input.targetW);
  if (!key || targetW === null) return null;

  const targetMap = ensureRememberedTargets(adapter);
  const ledger = ensureLedger(adapter);
  const explicitBaselineW = finiteOrNull(input.baselineW);
  const rememberedTargetW = finiteOrNull(targetMap.get(key));
  const baselineW = explicitBaselineW !== null ? explicitBaselineW : rememberedTargetW;
  const baselineSource = explicitBaselineW !== null ? 'measurement' : (rememberedTargetW !== null ? 'remembered-target' : 'unknown');
  const accepted = input.accepted === true;
  const changed = typeof input.commandChanged === 'boolean'
    ? input.commandChanged
    : (baselineW === null || Math.abs(targetW - baselineW) >= 0.5);
  const freshBaseline = explicitBaselineW !== null && input.baselineFresh !== false;
  const uncertain = accepted && changed && (input.uncertain === true || !freshBaseline);
  const credited = accepted && changed && !uncertain;
  const deltaW = credited && baselineW !== null ? rounded(targetW - baselineW) : 0;
  const kind = input.kind === 'generation' ? 'generation' : 'load';
  const netLoadDeltaW = kind === 'generation' ? -deltaW : deltaW;

  if (accepted) targetMap.set(key, targetW);

  return putEntry(ledger, {
    key,
    kind,
    source: String(input.source || ''),
    reason: String(input.reason || ''),
    accepted,
    commandChanged: changed,
    baselineW: baselineW === null ? null : rounded(baselineW),
    baselineSource,
    targetW: rounded(targetW),
    deltaW,
    netLoadDeltaW,
    credited,
    uncertain,
    ts: Date.now(),
  });
}

/** Record an accepted start/stop transition with no safe immediate watt model. */
function recordAcceptedActuatorTransition(adapter: AnyRecord, input: RecordInput): AnyRecord | null {
  if (!adapter || typeof adapter !== 'object' || !input) return null;
  const key = String(input.key || '').trim();
  if (!key) return null;
  const accepted = input.accepted === true;
  const changed = input.commandChanged !== false;
  const ledger = ensureLedger(adapter);
  return putEntry(ledger, {
    key,
    kind: input.kind === 'generation' ? 'generation' : 'load',
    source: String(input.source || ''),
    reason: String(input.reason || ''),
    accepted,
    commandChanged: changed,
    baselineW: null,
    baselineSource: 'unknown',
    targetW: null,
    deltaW: 0,
    netLoadDeltaW: 0,
    credited: false,
    uncertain: accepted && changed,
    ts: Date.now(),
  });
}

function getAcceptedPowerEffectSnapshot(adapter: AnyRecord): AnyRecord {
  const ledger = adapter && adapter._nwAcceptedPowerEffects;
  if (!ledger || typeof ledger !== 'object') return emptySnapshot();
  return {
    schema: String(ledger.schema || 'nexowatt.accepted-power-effects.v2'),
    cycleId: String(ledger.cycleId || ''),
    ts: Math.max(0, rounded(ledger.ts)),
    netLoadDeltaW: rounded(ledger.netLoadDeltaW),
    loadDeltaW: rounded(ledger.loadDeltaW),
    generationDeltaW: rounded(ledger.generationDeltaW),
    creditedEffectCount: Math.max(0, rounded(ledger.creditedEffectCount)),
    uncertainEffectCount: Math.max(0, rounded(ledger.uncertainEffectCount)),
    rejectedEffectCount: Math.max(0, rounded(ledger.rejectedEffectCount)),
    entries: Array.isArray(ledger.entries)
      ? ledger.entries.map((entry: AnyRecord) => ({ ...entry }))
      : [],
  };
}

module.exports = {
  beginAcceptedPowerEffectCycle,
  recordAcceptedPowerTarget,
  recordAcceptedActuatorTransition,
  getAcceptedPowerEffectSnapshot,
};
