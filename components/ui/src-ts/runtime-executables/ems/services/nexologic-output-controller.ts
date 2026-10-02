// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verbindet NexoLogic-Ausgangsanforderungen mit dem kontrollierten Aktor-Schreibpfad.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/nexologic-output-controller.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Datei: ems/services/nexologic-output-controller.ts
 *
 * Stufe C3.4: Typisierter Schreib-, Budget- und Rueckmeldevertrag fuer
 * NexoLogic-Ausgangsknoten. Bestehende Ausgaenge bleiben ohne aktivierte
 * Budgetoption abwaertskompatibel. Budgetierte Ausgaenge werden dagegen erst
 * nach einem zentralen EMS-Grant geschrieben und im selben Tick reserviert.
 */

declare const require: (id: string) => any;
declare const module: { exports: unknown };

const { ActuatorCommandContract } = require('./actuator-command-contract');
const {
  withActuatorShadowContext,
  priorityForOwner,
  isActuatorAuthorityBlockedResult,
} = require('./actuator-shadow-arbiter');

type AnyRecord = Record<string, any>;

type TimerApi = {
  setTimeout: (handler: () => void, timeoutMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const timerApi = globalThis as unknown as TimerApi;


type ReadbackSample = {
  id: string;
  value: unknown;
  ageMs: number | null;
  fresh: boolean;
};

type BudgetMode = 'none' | 'pv' | 'total';
type BudgetAction = 'gate' | 'clamp';

type OutputMeta = {
  graphId: string;
  graphName?: string;
  nodeId: string;
  nodeLabel?: string;
  targetId: string;
  ack?: boolean;
  params?: AnyRecord;
  reason?: string;
  kind?: string;
};

type OutputIntent = {
  key: string;
  graphId: string;
  nodeId: string;
  owner: string;
  targetId: string;
  requestedValue: unknown;
  requestedW: number;
  budgetMode: BudgetMode;
  budgetAction: BudgetAction;
  budgetPriority: number;
  active: boolean;
  releasePending: boolean;
  updatedTs: number;
  currentReservedW: number;
  meta: OutputMeta;
};

type OutputRuntime = {
  key: string;
  owner: string;
  stateBase: string;
  meta: OutputMeta;
  lastRequestedValue: unknown;
  lastEffectiveValue: unknown;
  lastAcceptedValue: unknown;
  lastActualValue: unknown;
  lastWriteTs: number;
  budgetGrantW: number;
  budgetReservedW: number;
  retryTimer: any;
  stopped: boolean;
  generation: number;
  writeChain: Promise<NexoLogicWriteResult | null>;
};

export type NexoLogicWriteResult = {
  key: string;
  owner: string;
  targetId: string;
  requestedValue: unknown;
  effectiveValue: unknown;
  accepted: boolean;
  confirmed: boolean;
  pending: boolean;
  readbackOk: boolean | null;
  readbackFresh: boolean;
  readbackAgeMs: number | null;
  retryCount: number;
  faultLocked: boolean;
  faultUntil: number;
  status: string;
  blockedByOwner: string;
  actual: unknown;
  budgetMode: BudgetMode;
  budgetRequestedW: number;
  budgetGrantW: number;
  budgetReservedW: number;
  deferred: boolean;
};

function text(value: unknown): string {
  return String(value === undefined || value === null ? '' : value).trim();
}

function safePart(value: unknown, fallback = 'node'): string {
  const out = text(value).replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  return out || fallback;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function bool(value: unknown, fallback = false): boolean {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  const s = text(value).toLowerCase();
  if (['true', 'yes', 'ja', 'on', 'an'].includes(s)) return true;
  if (['false', 'no', 'nein', 'off', 'aus'].includes(s)) return false;
  return fallback;
}

function normalizeBudgetMode(value: unknown): BudgetMode {
  const s = text(value).toLowerCase();
  if (s === 'pv' || s === 'solar') return 'pv';
  if (s === 'total' || s === 'grid' || s === 'gesamt') return 'total';
  return 'none';
}

function normalizeBudgetAction(value: unknown, requestedValue: unknown, fixedPowerW: number): BudgetAction {
  const s = text(value).toLowerCase();
  if (s === 'clamp' && typeof requestedValue === 'number' && fixedPowerW <= 0) return 'clamp';
  return 'gate';
}

function valueIsActive(value: unknown, tolerance = 0.0001): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) > tolerance;
  if (value === null || value === undefined) return false;
  const s = text(value).toLowerCase();
  if (!s || ['false', 'off', 'aus', '0', 'null', 'undefined'].includes(s)) return false;
  const n = Number(s.replace(',', '.'));
  if (Number.isFinite(n)) return Math.abs(n) > tolerance;
  return true;
}

function idleValueFor(value: unknown): unknown {
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return 0;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (['true', 'false'].includes(s)) return 'false';
    if (Number.isFinite(Number(s.replace(',', '.')))) return '0';
    return '';
  }
  return false;
}

function stable(value: unknown, depth = 0): string {
  if (depth > 6) return '[depth]';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return Number.isFinite(value) ? `n:${Math.round(value * 1e6) / 1e6}` : `n:${String(value)}`;
  if (typeof value === 'boolean') return value ? 'b:1' : 'b:0';
  if (typeof value === 'string') return `s:${value}`;
  if (Array.isArray(value)) return `[${value.map((entry) => stable(entry, depth + 1)).join(',')}]`;
  if (typeof value === 'object') {
    const row = value as AnyRecord;
    return `{${Object.keys(row).sort().map((key) => `${key}:${stable(row[key], depth + 1)}`).join(',')}}`;
  }
  return `${typeof value}:${String(value)}`;
}

function valuesMatch(actual: unknown, requested: unknown, tolerance: number): boolean | null {
  if (actual === null || actual === undefined) return null;
  if (typeof requested === 'boolean') return bool(actual, !requested) === requested;
  if (typeof requested === 'number') {
    const a = Number(actual);
    return Number.isFinite(a) ? Math.abs(a - requested) <= tolerance : false;
  }
  return stable(actual) === stable(requested);
}

export class NexoLogicOutputController {
  private readonly adapter: AnyRecord;
  private readonly contract: any;
  private readonly runtimes = new Map<string, OutputRuntime>();
  private readonly intents = new Map<string, OutputIntent>();
  private stopped = false;

  constructor(adapter: AnyRecord) {
    this.adapter = adapter;
    this.contract = new ActuatorCommandContract();
  }

  outputKey(meta: OutputMeta): string {
    return `${safePart(meta.graphId, 'graph')}.${safePart(meta.nodeId, 'node')}`;
  }

  ownerFor(meta: OutputMeta): string {
    return `nexoLogic.${safePart(meta.graphId, 'graph')}.${safePart(meta.nodeId, 'node')}`;
  }

  private runtime(meta: OutputMeta): OutputRuntime {
    const key = this.outputKey(meta);
    let row = this.runtimes.get(key);
    if (!row) {
      row = {
        key,
        owner: this.ownerFor(meta),
        stateBase: `nexoLogic.outputs.${safePart(meta.graphId, 'graph')}.${safePart(meta.nodeId, 'node')}`,
        meta,
        lastRequestedValue: undefined,
        lastEffectiveValue: undefined,
        lastAcceptedValue: undefined,
        lastActualValue: undefined,
        lastWriteTs: 0,
        budgetGrantW: 0,
        budgetReservedW: 0,
        retryTimer: null,
        stopped: false,
        generation: 0,
        writeChain: Promise.resolve(null),
      };
      this.runtimes.set(key, row);
    } else {
      row.meta = meta;
      row.owner = this.ownerFor(meta);
    }
    return row;
  }

  private stopValue(row: OutputRuntime): unknown {
    const params = row.meta.params || {};
    if (Object.prototype.hasOwnProperty.call(params, 'stopValue')) {
      const raw = params.stopValue;
      const reference = row.lastRequestedValue !== undefined ? row.lastRequestedValue : row.lastEffectiveValue;
      if (typeof reference === 'boolean') return bool(raw, false);
      if (typeof reference === 'number') return num(raw, 0, -1_000_000_000, 1_000_000_000);
      if (typeof reference === 'string') return String(raw === undefined || raw === null ? '' : raw);
      if (raw === true || raw === false || typeof raw === 'number') return raw;
      const textRaw = text(raw);
      if (['true', 'false', 'on', 'off', 'ein', 'aus'].includes(textRaw.toLowerCase())) return bool(textRaw, false);
      const parsed = Number(textRaw.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : textRaw;
    }
    const reference = row.lastRequestedValue !== undefined
      ? row.lastRequestedValue
      : (row.lastEffectiveValue !== undefined ? row.lastEffectiveValue : row.lastAcceptedValue);
    return idleValueFor(reference);
  }

  private enqueue(row: OutputRuntime, task: () => Promise<NexoLogicWriteResult>): Promise<NexoLogicWriteResult> {
    const next = row.writeChain
      .catch(() => null)
      .then(() => task());
    row.writeChain = next.catch(() => null);
    return next;
  }

  async safeStop(meta: OutputMeta, reasonRaw: unknown = 'safe-stop'): Promise<NexoLogicWriteResult> {
    const row = this.runtime(meta);
    const mode = text(meta.params?.deactivateMode).toLowerCase();
    if (mode === 'hold' || meta.ack === true) {
      const held = { ...this.baseResult(row, row.lastEffectiveValue), status: 'deactivated-hold', accepted: true, confirmed: true };
      await this.publish(row, held);
      return held;
    }
    const generation = ++row.generation;
    const value = this.stopValue(row);
    const safeMeta: OutputMeta = {
      ...meta,
      params: {
        ...(meta.params || {}),
        releaseAuthority: true,
        releaseOnIdle: true,
        autoRetry: false,
        maxRetries: 0,
      },
      reason: text(reasonRaw) || 'safe-stop',
    };
    return this.enqueue(row, () => this.executeWrite(safeMeta, value, text(reasonRaw) || 'safe-stop', generation));
  }

  async registerOutput(meta: OutputMeta): Promise<void> {
    const row = this.runtime(meta);
    const states: Record<string, readonly [string, string, string]> = {
      owner: ['string', 'text', 'NexoLogic Aktor-Owner'],
      targetId: ['string', 'text', 'NexoLogic Ziel-Datenpunkt'],
      requestedJson: ['string', 'json', 'NexoLogic angeforderter Wert'],
      effectiveJson: ['string', 'json', 'NexoLogic effektiver Wert'],
      actualJson: ['string', 'json', 'NexoLogic Rueckmeldewert'],
      writeAccepted: ['boolean', 'indicator', 'NexoLogic Write akzeptiert'],
      writeConfirmed: ['boolean', 'indicator', 'NexoLogic Write bestaetigt'],
      readbackOk: ['boolean', 'indicator', 'NexoLogic Readback passend'],
      readbackFresh: ['boolean', 'indicator', 'NexoLogic Readback aktuell'],
      readbackAgeMs: ['number', 'value.interval', 'NexoLogic Readback-Alter'],
      writePending: ['boolean', 'indicator', 'NexoLogic Write ausstehend'],
      retryCount: ['number', 'value', 'NexoLogic Write-Wiederholungen'],
      faultLocked: ['boolean', 'indicator', 'NexoLogic Fehlerverriegelung'],
      faultUntil: ['number', 'value.time', 'NexoLogic Fehlerverriegelung bis'],
      status: ['string', 'text', 'NexoLogic Aktorstatus'],
      lastWriteTs: ['number', 'value.time', 'NexoLogic letzter Write'],
      budgetMode: ['string', 'text', 'NexoLogic Budgetmodus'],
      budgetRequestedW: ['number', 'value.power', 'NexoLogic Budgetbedarf'],
      budgetGrantW: ['number', 'value.power', 'NexoLogic zentraler Grant'],
      budgetReservedW: ['number', 'value.power', 'NexoLogic zentrale Reservierung'],
    };
    if (typeof this.adapter?.setObjectNotExistsAsync === 'function') {
      for (const [name, spec] of Object.entries(states)) {
        try {
          await this.adapter.setObjectNotExistsAsync(`${row.stateBase}.${name}`, {
            type: 'state',
            common: { name: spec[2], type: spec[0], role: spec[1], read: true, write: false, unit: name.endsWith('W') ? 'W' : undefined },
            native: {},
          });
        } catch (_error) {}
      }
    }
    await this.publish(row, {
      key: row.key,
      owner: row.owner,
      targetId: text(meta.targetId),
      requestedValue: null,
      effectiveValue: null,
      accepted: false,
      confirmed: false,
      pending: false,
      readbackOk: null,
      readbackFresh: false,
      readbackAgeMs: null,
      retryCount: 0,
      faultLocked: false,
      faultUntil: 0,
      status: 'registered',
      blockedByOwner: '',
      actual: null,
      budgetMode: normalizeBudgetMode(meta.params?.budgetMode),
      budgetRequestedW: 0,
      budgetGrantW: 0,
      budgetReservedW: 0,
      deferred: false,
    });
  }

  private async setState(id: string, value: unknown): Promise<void> {
    if (this.stopped || this.adapter?._nwShuttingDown || typeof this.adapter?.setStateAsync !== 'function') return;
    try {
      const current = typeof this.adapter.getStateAsync === 'function' ? await this.adapter.getStateAsync(id) : null;
      if (current && stable(current.val) === stable(value)) return;
      await this.adapter.setStateAsync(id, { val: value, ack: true });
    } catch (_error) {}
  }

  private async publish(row: OutputRuntime, result: NexoLogicWriteResult): Promise<void> {
    const pairs: Array<[string, unknown]> = [
      ['owner', result.owner],
      ['targetId', result.targetId],
      ['requestedJson', JSON.stringify(result.requestedValue === undefined ? null : result.requestedValue)],
      ['effectiveJson', JSON.stringify(result.effectiveValue === undefined ? null : result.effectiveValue)],
      ['actualJson', JSON.stringify(result.actual === undefined ? null : result.actual)],
      ['writeAccepted', result.accepted],
      ['writeConfirmed', result.confirmed],
      ['readbackOk', result.readbackOk === true],
      ['readbackFresh', result.readbackFresh],
      ['readbackAgeMs', result.readbackAgeMs],
      ['writePending', result.pending],
      ['retryCount', result.retryCount],
      ['faultLocked', result.faultLocked],
      ['faultUntil', result.faultUntil],
      ['status', result.status],
      ['lastWriteTs', row.lastWriteTs],
      ['budgetMode', result.budgetMode],
      ['budgetRequestedW', Math.round(result.budgetRequestedW)],
      ['budgetGrantW', Math.round(result.budgetGrantW)],
      ['budgetReservedW', Math.round(result.budgetReservedW)],
    ];
    await Promise.all(pairs.map(([name, value]) => this.setState(`${row.stateBase}.${name}`, value)));
  }

  private contractCfg(params: AnyRecord): AnyRecord {
    return {
      requireReadback: bool(params.requireReadback, false),
      ackTimeoutMs: Math.round(num(params.ackTimeoutMs, 5000, 250, 120000)),
      retryDelayMs: Math.round(num(params.retryDelayMs, 3000, 250, 120000)),
      maxRetries: Math.round(num(params.maxRetries, 3, 0, 20)),
      faultLockMs: Math.round(num(params.faultLockMs, 60000, 1000, 24 * 60 * 60 * 1000)),
    };
  }

  private readbackId(meta: OutputMeta): string {
    const configured = text(meta.params?.readbackId);
    if (configured) return configured;
    return bool(meta.params?.requireReadback, false) ? text(meta.targetId) : '';
  }

  private readbackTolerance(meta: OutputMeta): number {
    return num(meta.params?.readbackTolerance, 1, 0, 1_000_000);
  }

  private async readActual(meta: OutputMeta): Promise<ReadbackSample> {
    const id = this.readbackId(meta);
    if (!id || typeof this.adapter?.getForeignStateAsync !== 'function') return { id, value: null, ageMs: null, fresh: false };
    try {
      const state = await this.adapter.getForeignStateAsync(id);
      if (!state || state.val === undefined) return { id, value: null, ageMs: null, fresh: false };
      const ts = Number.isFinite(Number(state.ts)) ? Number(state.ts) : (Number.isFinite(Number(state.lc)) ? Number(state.lc) : 0);
      const ageMs = ts > 0 ? Math.max(0, Date.now() - ts) : null;
      const maxAgeMs = Math.round(num(meta.params?.readbackMaxAgeMs, 15000, 250, 24 * 60 * 60 * 1000));
      return { id, value: state.val, ageMs, fresh: ageMs !== null && ageMs <= maxAgeMs };
    } catch (_error) {
      return { id, value: null, ageMs: null, fresh: false };
    }
  }

  private exclusiveAuthority(targetId: string, owner: string): boolean {
    const matrix = this.adapter?._stageAActuatorOwnerById;
    const row = matrix && typeof matrix === 'object' ? matrix[targetId] : null;
    const activeOwners = Array.isArray(row?.activeOwners) ? row.activeOwners.map((item: unknown) => text(item)).filter(Boolean) : [];
    return activeOwners.length === 1 && activeOwners[0] === owner;
  }

  private clearRetry(row: OutputRuntime): void {
    if (!row.retryTimer) return;
    try {
      if (typeof this.adapter?._nwClearTimeout === 'function') this.adapter._nwClearTimeout(row.retryTimer);
      else timerApi.clearTimeout(row.retryTimer);
    } catch (_error) {}
    row.retryTimer = null;
  }

  private scheduleRetry(row: OutputRuntime, value: unknown, delayMs: number, reason: string, generation: number): void {
    this.clearRetry(row);
    if (this.stopped || row.stopped || bool(row.meta.params?.autoRetry, true) === false) return;
    const delay = Math.max(250, Math.min(24 * 60 * 60 * 1000, Math.round(delayMs)));
    const run = () => {
      row.retryTimer = null;
      if (this.stopped || row.stopped || this.adapter?._nwShuttingDown || row.generation !== generation) return;
      this.enqueue(row, () => this.executeWrite(row.meta, value, `${reason}:retry`, generation)).catch(() => {});
    };
    try {
      row.retryTimer = typeof this.adapter?._nwSetTimeout === 'function'
        ? this.adapter._nwSetTimeout(run, delay)
        : timerApi.setTimeout(run, delay);
    } catch (_error) {}
  }

  private baseResult(row: OutputRuntime, value: unknown): NexoLogicWriteResult {
    const params = row.meta.params || {};
    const budgetMode = normalizeBudgetMode(params.budgetMode);
    const fixedW = Math.max(0, num(params.budgetPowerW, 0, 0, 10_000_000));
    const requestedW = budgetMode === 'none' ? 0 : (fixedW > 0 ? fixedW : (typeof value === 'number' ? Math.abs(value) : 0));
    return {
      key: row.key,
      owner: row.owner,
      targetId: text(row.meta.targetId),
      requestedValue: value,
      effectiveValue: value,
      accepted: false,
      confirmed: false,
      pending: false,
      readbackOk: null,
      readbackFresh: false,
      readbackAgeMs: null,
      retryCount: 0,
      faultLocked: false,
      faultUntil: 0,
      status: 'idle',
      blockedByOwner: '',
      actual: null,
      budgetMode,
      budgetRequestedW: requestedW,
      budgetGrantW: row.budgetGrantW,
      budgetReservedW: row.budgetReservedW,
      deferred: false,
    };
  }

  async request(meta: OutputMeta, value: unknown): Promise<NexoLogicWriteResult> {
    const row = this.runtime(meta);
    row.lastRequestedValue = value;
    const generation = ++row.generation;
    const params = meta.params || {};
    const budgetMode = normalizeBudgetMode(params.budgetMode);
    const base = this.baseResult(row, value);
    if (meta.ack === true || budgetMode === 'none') {
      return this.enqueue(row, () => this.executeWrite(meta, value, meta.reason || 'nexologic-write', generation));
    }

    const fixedW = Math.max(0, num(params.budgetPowerW, 0, 0, 10_000_000));
    const requestedW = fixedW > 0 ? fixedW : (typeof value === 'number' ? Math.abs(value) : 0);
    const active = valueIsActive(value);
    if (!active) {
      const previousIntent = this.intents.get(row.key);
      row.budgetGrantW = 0;
      const stopMeta = { ...meta, params: { ...params, releaseAuthority: bool(params.releaseOnIdle, true) } };
      const stopResult = await this.enqueue(row, () => this.executeWrite(stopMeta, idleValueFor(value), 'nexologic-budget-idle', generation));
      const stopSettled = stopResult.confirmed || (stopResult.accepted && bool(params.requireReadback, false) !== true) || (stopResult.readbackFresh && !valueIsActive(stopResult.actual));
      if (stopSettled || !previousIntent) {
        this.intents.delete(row.key);
        row.budgetReservedW = 0;
      } else {
        this.intents.set(row.key, {
          ...previousIntent,
          active: false,
          releasePending: true,
          requestedValue: idleValueFor(value),
          updatedTs: Date.now(),
          meta: { ...meta, params: { ...params, releaseAuthority: bool(params.releaseOnIdle, true) } },
        });
      }
      stopResult.budgetMode = budgetMode;
      stopResult.budgetRequestedW = previousIntent ? previousIntent.requestedW : 0;
      stopResult.budgetGrantW = 0;
      stopResult.budgetReservedW = row.budgetReservedW;
      await this.publish(row, stopResult);
      return stopResult;
    }
    if (requestedW <= 0) {
      const invalid = { ...base, effectiveValue: idleValueFor(value), status: 'budget-power-missing', budgetRequestedW: 0, deferred: true };
      await this.publish(row, invalid);
      return invalid;
    }
    const intent: OutputIntent = {
      key: row.key,
      graphId: meta.graphId,
      nodeId: meta.nodeId,
      owner: row.owner,
      targetId: text(meta.targetId),
      requestedValue: value,
      requestedW,
      budgetMode,
      budgetAction: normalizeBudgetAction(params.budgetAction, value, fixedW),
      budgetPriority: Math.round(num(params.budgetPriority, 900, 0, 9999)),
      active: true,
      releasePending: false,
      updatedTs: Date.now(),
      currentReservedW: Math.max(0, row.budgetReservedW),
      meta,
    };
    this.intents.set(row.key, intent);
    const deferred = { ...base, status: 'central-budget-pending', budgetRequestedW: requestedW, deferred: true };
    await this.publish(row, deferred);
    return deferred;
  }

  getBudgetIntents(): OutputIntent[] {
    return Array.from(this.intents.values())
      .filter((intent) => intent.active || intent.releasePending)
      .map((intent) => {
        const runtime = this.runtimes.get(intent.key);
        return {
          ...intent,
          currentReservedW: Math.max(0, Number(runtime?.budgetReservedW) || 0),
          meta: { ...intent.meta, params: { ...(intent.meta.params || {}) } },
        };
      });
  }

  async applyBudgetGrant(keyRaw: unknown, grantRaw: unknown): Promise<NexoLogicWriteResult | null> {
    const key = text(keyRaw);
    const intent = this.intents.get(key);
    if (!intent) return null;
    const row = this.runtimes.get(key);
    if (!row) return null;
    const grantW = intent.active ? Math.max(0, Number(grantRaw) || 0) : 0;
    const generation = ++row.generation;
    row.budgetGrantW = grantW;
    const previousReservedW = row.budgetReservedW;
    let effectiveValue: unknown = intent.active ? intent.requestedValue : idleValueFor(intent.requestedValue);
    let effectiveW = intent.active ? intent.requestedW : 0;
    if (intent.active && intent.budgetAction === 'clamp' && typeof intent.requestedValue === 'number') {
      const sign = intent.requestedValue < 0 ? -1 : 1;
      effectiveW = Math.min(intent.requestedW, grantW);
      effectiveValue = sign * effectiveW;
    } else if (intent.active && grantW + 0.5 < intent.requestedW) {
      effectiveW = 0;
      effectiveValue = idleValueFor(intent.requestedValue);
    }
    const grantReason = effectiveW > 0 ? 'nexologic-central-grant' : (intent.active ? 'nexologic-central-budget-zero' : 'nexologic-release-pending');
    const result = await this.enqueue(row, () => this.executeWrite(intent.meta, effectiveValue, grantReason, generation));
    const fixedW = Math.max(0, num(intent.meta.params?.budgetPowerW, 0, 0, 10_000_000));
    const actualNumericW = typeof result.actual === 'number' && Number.isFinite(result.actual) ? Math.abs(result.actual) : 0;
    const actualEstimateW = fixedW > 0 ? fixedW : (actualNumericW > 0 ? actualNumericW : intent.requestedW);
    const actualActive = result.readbackFresh && valueIsActive(result.actual);
    const acceptedActive = effectiveW > 0 && (result.accepted || result.confirmed || result.pending);
    const stopFailed = effectiveW <= 0 && (!result.accepted || result.pending || result.faultLocked || result.status === 'authority-blocked');
    row.budgetReservedW = acceptedActive ? effectiveW : (actualActive ? actualEstimateW : (stopFailed ? previousReservedW : 0));
    const stopSettled = !intent.active && (result.confirmed || (result.accepted && bool(intent.meta.params?.requireReadback, false) !== true) || (result.readbackFresh && !valueIsActive(result.actual)));
    if (stopSettled) this.intents.delete(key);
    result.budgetMode = intent.budgetMode;
    result.budgetRequestedW = intent.active ? intent.requestedW : 0;
    result.budgetGrantW = grantW;
    result.budgetReservedW = row.budgetReservedW;
    await this.publish(row, result);
    return result;
  }

  async executeWrite(meta: OutputMeta, value: unknown, reasonRaw: unknown, expectedGeneration?: number): Promise<NexoLogicWriteResult> {
    const row = this.runtime(meta);
    const generation = Number.isFinite(Number(expectedGeneration)) ? Number(expectedGeneration) : row.generation;
    if (generation !== row.generation) {
      const superseded = { ...this.baseResult(row, value), status: 'superseded', effectiveValue: row.lastEffectiveValue, deferred: true };
      await this.publish(row, superseded);
      return superseded;
    }
    const params = meta.params || {};
    const base = this.baseResult(row, value);
    const cfg = this.contractCfg(params);
    const now = Date.now();
    const actualBeforeSample = await this.readActual(meta);
    const actualBefore = actualBeforeSample.value;
    const readbackBefore = actualBeforeSample.fresh ? valuesMatch(actualBefore, value, this.readbackTolerance(meta)) : null;
    const confirmedBefore = this.contract.confirmFromReadback(row.key, value, actualBefore, readbackBefore === true, now);
    if (confirmedBefore) {
      this.clearRetry(row);
      row.lastEffectiveValue = value;
      row.lastAcceptedValue = value;
      row.lastActualValue = actualBefore;
      const result = {
        ...base,
        accepted: true,
        confirmed: true,
        readbackOk: true,
        readbackFresh: actualBeforeSample.fresh,
        readbackAgeMs: actualBeforeSample.ageMs,
        actual: actualBefore,
        status: confirmedBefore.status,
        retryCount: confirmedBefore.retryCount,
        pending: false,
        faultLocked: false,
        faultUntil: 0,
      };
      await this.publish(row, result);
      return result;
    }
    const decision = this.contract.prepare(row.key, value, now, cfg);
    if (!decision.allowed) {
      const current = this.contract.result(row.key, now, decision.targetChanged);
      const result = {
        ...base,
        accepted: current.accepted,
        confirmed: current.confirmed,
        pending: current.pending,
        readbackOk: current.readbackOk,
        readbackFresh: actualBeforeSample.fresh,
        readbackAgeMs: actualBeforeSample.ageMs,
        retryCount: current.retryCount,
        faultLocked: current.faultLocked,
        faultUntil: current.faultUntil,
        status: current.status,
        actual: current.actual,
      };
      const retryDelay = current.faultLocked ? Math.max(250, current.faultUntil - now) : (current.pending ? cfg.ackTimeoutMs : cfg.retryDelayMs);
      this.scheduleRetry(row, value, retryDelay, text(reasonRaw), generation);
      await this.publish(row, result);
      return result;
    }

    if (generation !== row.generation) {
      const superseded = { ...base, status: 'superseded-before-write', deferred: true };
      await this.publish(row, superseded);
      return superseded;
    }

    const targetId = text(meta.targetId);
    const owner = row.owner;
    const releaseAuthority = bool(params.releaseAuthority, false) || (bool(params.releaseOnIdle, true) && !valueIsActive(value));
    let writeResult: unknown = null;
    let writeError = '';
    try {
      writeResult = await withActuatorShadowContext(this.adapter, {
        owner,
        module: 'nexoLogic',
        priority: priorityForOwner(owner),
        reason: text(reasonRaw) || 'nexologic-write',
        leaseMs: Math.round(num(params.leaseMs, 60000, 0, 24 * 60 * 60 * 1000)),
        kind: text(meta.kind) || 'nexologic',
        enforceAuthority: this.exclusiveAuthority(targetId, owner),
        releaseAuthority,
      }, () => this.adapter.setForeignStateAsync(targetId, { val: value, ack: meta.ack === true }));
    } catch (error: unknown) {
      writeError = error instanceof Error ? error.message : String(error);
    }
    if (isActuatorAuthorityBlockedResult(writeResult)) {
      const result = {
        ...base,
        effectiveValue: value,
        accepted: false,
        confirmed: false,
        pending: false,
        status: 'authority-blocked',
        readbackFresh: actualBeforeSample.fresh,
        readbackAgeMs: actualBeforeSample.ageMs,
        blockedByOwner: text((writeResult as { blockedByOwner?: unknown }).blockedByOwner),
        actual: actualBefore,
      };
      this.scheduleRetry(row, value, Math.round(num(params.retryDelayMs, 3000, 250, 120000)), text(reasonRaw), generation);
      await this.publish(row, result);
      return result;
    }

    const accepted = !writeError;
    const actualAfterSample = await this.readActual(meta);
    const actualAfter = actualAfterSample.value;
    const readbackOk = actualAfterSample.fresh ? valuesMatch(actualAfter, value, this.readbackTolerance(meta)) : null;
    const contract = this.contract.complete(row.key, value, accepted, readbackOk, actualAfter, Date.now(), cfg);
    if (accepted) row.lastWriteTs = Date.now();
    if (contract.confirmed || (accepted && cfg.requireReadback !== true)) {
      row.lastEffectiveValue = value;
      row.lastAcceptedValue = value;
      row.lastActualValue = actualAfter;
      this.clearRetry(row);
    } else {
      const retryDelay = contract.faultLocked ? Math.max(250, contract.faultUntil - Date.now()) : (contract.pending ? cfg.ackTimeoutMs : cfg.retryDelayMs);
      this.scheduleRetry(row, value, retryDelay, text(reasonRaw), generation);
    }
    const result: NexoLogicWriteResult = {
      ...base,
      effectiveValue: value,
      accepted,
      confirmed: contract.confirmed,
      pending: contract.pending,
      readbackOk,
      readbackFresh: actualAfterSample.fresh,
      readbackAgeMs: actualAfterSample.ageMs,
      retryCount: contract.retryCount,
      faultLocked: contract.faultLocked,
      faultUntil: contract.faultUntil,
      status: writeError ? `write-error:${writeError}` : contract.status,
      actual: actualAfter,
    };
    await this.publish(row, result);
    return result;
  }

  async stop(options?: { safe?: boolean; reason?: string }): Promise<void> {
    const safe = options?.safe !== false;
    const reason = text(options?.reason) || 'controller-stop';
    if (safe) {
      for (const row of this.runtimes.values()) {
        this.clearRetry(row);
        try { await this.safeStop(row.meta, reason); } catch (_error) {}
      }
    }
    this.stopped = true;
    for (const row of this.runtimes.values()) {
      row.stopped = true;
      row.generation += 1;
      this.clearRetry(row);
      try { await row.writeChain.catch(() => null); } catch (_error) {}
      this.contract.release(row.key);
    }
    this.intents.clear();
  }
}

module.exports = { NexoLogicOutputController };
