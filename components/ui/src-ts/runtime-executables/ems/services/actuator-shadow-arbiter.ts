// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Erfasst konkurrierende Aktor-Anforderungen diagnostisch, damit widersprüchliche Schreibabsichten sichtbar werden.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/actuator-shadow-arbiter.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Datei: ems/services/actuator-shadow-arbiter.ts
 *
 * Rolle:
 * Zentraler Aktor-Arbiter für Stufe C1/C2.
 *
 * - `shadow`: beobachtet ausgehende Hardware-Schreibanforderungen, ohne sie zu
 *   verändern oder zu blockieren.
 * - `enforce-safety`: setzt ausschließlich die sicherheitskritische Steuerhoheit
 *   durch. Sicherheits-, Netzbetreiber-, Peak-/Anschlusslimit- und befristete
 *   manuelle Anforderungen können niedrigere konkurrierende Writes blockieren.
 *   Normale EMS-/Komfortpfade untereinander bleiben zunächst im Shadow-Modus.
 *
 * Ziel:
 * - konkurrierende Module auf demselben Aktor erkennen,
 * - Modul, Priorität, Grund, Lease und final ausgeführten Schreiber dokumentieren,
 * - sicherheitskritische Prioritäten verbindlich und feldkompatibel durchsetzen.
 */

declare const require: (id: string) => any;
declare const module: { exports: unknown };
const { AsyncLocalStorage } = require('node:async_hooks');

type AnyRecord = Record<string, any>;

export type ActuatorShadowContext = {
  owner?: string;
  module?: string;
  priority?: number;
  reason?: string;
  leaseMs?: number;
  cycleId?: number | string;
  requestId?: string;
  kind?: string;
  /** C2: Diese Anforderung darf eine verbindliche Steuerhoheit erzeugen. */
  enforceAuthority?: boolean;
  /** C2: Eine bestehende Steuerhoheit desselben Owners vor diesem Write freigeben. */
  releaseAuthority?: boolean;
};

type WriteStatus = 'requested' | 'accepted' | 'blocked' | 'failed';
type ActuatorArbiterMode = 'shadow' | 'enforce-safety';
type ArbiterAction = 'observe' | 'allow' | 'acquire' | 'renew' | 'release' | 'preempt' | 'allow-same-value' | 'block';
type ConflictResolution = 'blocked' | 'preempted' | 'unresolved';

type ShadowWriteEvent = {
  seq: number;
  ts: number;
  completedTs: number | null;
  targetId: string;
  method: string;
  owner: string;
  module: string;
  priority: number;
  reason: string;
  leaseMs: number;
  validUntil: number;
  cycleId: number | string | null;
  requestId: string;
  kind: string;
  ack: boolean | null;
  actuatorCandidate: boolean;
  mappedActuator: boolean;
  inferredOwner: boolean;
  valuePreview: unknown;
  valueFingerprint: string;
  status: WriteStatus;
  error: string;
  decision: ArbiterAction;
  decisionReason: string;
  authorityOwner: string;
  authorityPriority: number | null;
  blockedByOwner: string;
  enforceAuthority: boolean;
  authorityExplicit: boolean;
  releaseAuthority: boolean;
  /** true, wenn der reale Adapter-Write ausgeführt wurde. */
  writeExecuted: boolean;
};

type ShadowConflict = {
  objectId: string;
  targetId: string;
  firstTs: number;
  lastTs: number;
  owners: string[];
  priorities: Record<string, number>;
  values: Record<string, unknown>;
  cycleIds: Array<number | string>;
  writeSeqs: number[];
  reasons: Record<string, string>;
  count: number;
  lastWinner: string;
  blockedCount: number;
  preemptedCount: number;
  acceptedConflictCount: number;
  lastResolvedByArbiter: boolean;
  lastDecision: string;
};

type AuthorityLease = {
  targetId: string;
  owner: string;
  priority: number;
  acquiredTs: number;
  renewedTs: number;
  validUntil: number;
  reason: string;
  valuePreview: unknown;
  valueFingerprint: string;
  cycleId: number | string | null;
  requestId: string;
  kind: string;
  event: ShadowWriteEvent;
};

type ArbiterDecision = {
  action: ArbiterAction;
  reason: string;
  authority: AuthorityLease | null;
  updateAuthority: boolean;
  preempt: boolean;
};

type ShadowOptions = {
  historyWindowMs?: number;
  conflictWindowMs?: number;
  conflictRetentionMs?: number;
  maxEvents?: number;
  maxRecentWrites?: number;
  maxConflicts?: number;
  mode?: string;
  enforcePriorityFloor?: number;
  blockedLogIntervalMs?: number;
};

const SECRET_TARGET_PATTERN = /(password|passwd|secret|token|apikey|api_key|licensekey|trustedheadersecret)/i;
const SECRET_KEY_PATTERN = /(password|passwd|secret|token|apikey|api_key|licensekey|weatherapikey|email)/i;

export type ActuatorAuthorityBlockedResult = {
  __nexowattActuatorAuthorityBlocked: true;
  targetId: string;
  owner: string;
  blockedByOwner: string;
  blockedByPriority: number;
  reason: string;
};

export function isActuatorAuthorityBlockedResult(value: unknown): value is ActuatorAuthorityBlockedResult {
  return !!(value && typeof value === 'object' && (value as AnyRecord).__nexowattActuatorAuthorityBlocked === true);
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeArbiterMode(raw: unknown): ActuatorArbiterMode {
  const mode = text(raw).toLowerCase();
  if (mode === 'shadow' || mode === 'observe' || mode === 'shadow-read-only' || mode === 'off' || mode === 'disabled') return 'shadow';
  return 'enforce-safety';
}

function normalizeOwner(raw: unknown): string {
  const value = text(raw).replace(/[^a-zA-Z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '');
  return value || 'runtime.unscoped';
}

function isManualOwner(ownerRaw: unknown): boolean {
  return /(manual|api\.|frontend|operator|installer)/.test(normalizeOwner(ownerRaw).toLowerCase());
}

export function priorityForOwner(ownerRaw: unknown): number {
  const owner = normalizeOwner(ownerRaw).toLowerCase();
  if (/(emergency|safety|notstop|failsafe|hardware-stop)/.test(owner)) return 1000;
  if (/(para14a|netzbetreiber)/.test(owner)) return 950;
  if (/(gridconstraints|grid-constraints)/.test(owner)) return 920;
  if (/(peakshaving|peak-shaving|gridlimit|anschlusslimit)/.test(owner)) return 850;
  if (/(manual|api\.|frontend|operator|installer)/.test(owner)) return 750;
  if (/(charging|evcs|storage|speicher|thermal|heatingrod|heating-rod)/.test(owner)) return 600;
  if (/(multiuse|threshold|bhkw|generator|relay)/.test(owner)) return 500;
  if (/(nexologic|logic)/.test(owner)) return 400;
  if (/(runtime\.unscoped|mapping\.)/.test(owner)) return 250;
  return 300;
}

function ownerDefaultLeaseMs(ownerRaw: unknown): number {
  const owner = normalizeOwner(ownerRaw).toLowerCase();
  if (/(manual|api\.|frontend|operator|installer)/.test(owner)) return 5 * 60 * 1000;
  if (/(nexologic|logic|threshold|relay)/.test(owner)) return 60 * 1000;
  if (/(module\.|charging|evcs|storage|speicher|thermal|heatingrod|peak|para14a|multiuse)/.test(owner)) return 15 * 1000;
  return 10 * 1000;
}

function stableFingerprint(value: unknown, depth = 0): string {
  if (depth > 8) return '[depth]';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return `number:${String(value)}`;
    return `number:${Math.round(value * 1_000_000) / 1_000_000}`;
  }
  if (typeof value === 'boolean') return `boolean:${value ? '1' : '0'}`;
  if (typeof value === 'string') return `string:${value}`;
  if (Array.isArray(value)) return `[${value.map((entry) => stableFingerprint(entry, depth + 1)).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((key) => `${key}:${stableFingerprint(obj[key], depth + 1)}`).join(',')}}`;
  }
  return `${typeof value}:${String(value)}`;
}

function sanitizePreview(targetId: string, value: unknown, depth = 0): unknown {
  if (SECRET_TARGET_PATTERN.test(targetId)) return '[redacted]';
  if (depth > 5) return '[depth]';
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.length > 160 ? `${value.slice(0, 157)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 12).map((entry) => sanitizePreview(targetId, entry, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, 20)) {
      if (SECRET_KEY_PATTERN.test(key)) continue;
      out[key] = sanitizePreview(targetId, child, depth + 1);
    }
    return out;
  }
  return String(value);
}

function extractWritePayload(stateArg: unknown, ackArg: unknown): { value: unknown; ack: boolean | null } {
  if (stateArg && typeof stateArg === 'object' && Object.prototype.hasOwnProperty.call(stateArg, 'val')) {
    const state = stateArg as AnyRecord;
    return { value: state.val, ack: typeof state.ack === 'boolean' ? state.ack : (typeof ackArg === 'boolean' ? ackArg : null) };
  }
  return { value: stateArg, ack: typeof ackArg === 'boolean' ? ackArg : null };
}

function valuesDiffer(a: ShadowWriteEvent, b: ShadowWriteEvent): boolean {
  if (typeof a.valuePreview === 'number' && typeof b.valuePreview === 'number') {
    const av = Number(a.valuePreview);
    const bv = Number(b.valuePreview);
    const tolerance = Math.max(1, Math.min(Math.abs(av), Math.abs(bv)) * 0.001);
    return Math.abs(av - bv) > tolerance;
  }
  return a.valueFingerprint !== b.valueFingerprint;
}

function compactPath(raw: unknown): string {
  const value = text(raw).replace(/[?#].*$/, '');
  if (!value) return '';
  return value
    .split('/')
    .filter(Boolean)
    .slice(0, 5)
    .map((part) => (/^[0-9a-f]{8,}$/i.test(part) || /^\d+$/.test(part) ? ':id' : part.slice(0, 48)))
    .join('/');
}

export function buildHttpActuatorShadowContext(methodRaw: unknown, pathRaw: unknown): ActuatorShadowContext {
  const method = text(methodRaw).toUpperCase() || 'GET';
  const path = `/${compactPath(pathRaw)}`;
  let owner = 'api.manual';
  if (/^\/api\/(evcs|charging)/i.test(path)) owner = 'manual.evcs';
  else if (/^\/api\/smarthome/i.test(path)) owner = 'manual.smarthome';
  else if (/^\/api\/(ems|flow|storage)/i.test(path)) owner = 'manual.ems';
  else if (/^\/api\/mesh/i.test(path)) owner = 'manual.mesh';
  else if (/^\/api\/logic/i.test(path)) owner = 'manual.nexologic';
  else if (/^\/api\/(installer|config|set)/i.test(path)) owner = 'manual.installer';
  return {
    owner,
    module: 'http-api',
    priority: priorityForOwner(owner),
    reason: `${method} ${path}`,
    leaseMs: ownerDefaultLeaseMs(owner),
    kind: 'manual-api',
    enforceAuthority: true,
  };
}

export class ActuatorShadowArbiter {
  private readonly storage: { getStore: () => ActuatorShadowContext | undefined; run: <T>(store: ActuatorShadowContext, fn: () => T) => T } = new AsyncLocalStorage();
  private adapter: AnyRecord | null = null;
  private readonly events: ShadowWriteEvent[] = [];
  private readonly conflicts = new Map<string, ShadowConflict>();
  private readonly authorities = new Map<string, AuthorityLease>();
  private readonly blockedLogTs = new Map<string, number>();
  private seq = 0;
  private requestsTotal = 0;
  private blockedRequestsTotal = 0;
  private preemptionsTotal = 0;
  private allowedByArbiterTotal = 0;
  private lastDecision: AnyRecord | null = null;
  private stopped = false;
  private installed = false;
  private readonly historyWindowMs: number;
  private readonly conflictWindowMs: number;
  private readonly conflictRetentionMs: number;
  private readonly maxEvents: number;
  private readonly maxRecentWrites: number;
  private readonly maxConflicts: number;
  private readonly mode: ActuatorArbiterMode;
  private readonly enforcePriorityFloor: number;
  private readonly blockedLogIntervalMs: number;
  private originalSetForeignStateAsync: ((...args: any[]) => Promise<any>) | null = null;
  private originalSetForeignStateChangedAsync: ((...args: any[]) => Promise<any>) | null = null;

  constructor(adapterOrOptions: AnyRecord | ShadowOptions = {}, maybeOptions: ShadowOptions = {}) {
    const looksLikeAdapter = !!(adapterOrOptions && typeof adapterOrOptions === 'object' && typeof (adapterOrOptions as AnyRecord).setForeignStateAsync === 'function');
    const options = looksLikeAdapter ? maybeOptions : adapterOrOptions as ShadowOptions;
    this.adapter = looksLikeAdapter ? adapterOrOptions as AnyRecord : null;
    this.historyWindowMs = clampNumber(options.historyWindowMs, 5 * 60 * 1000, 15_000, 24 * 60 * 60 * 1000);
    this.conflictWindowMs = clampNumber(options.conflictWindowMs, 15_000, 500, 10 * 60 * 1000);
    this.conflictRetentionMs = clampNumber(options.conflictRetentionMs, 5 * 60 * 1000, 15_000, 24 * 60 * 60 * 1000);
    this.maxEvents = Math.round(clampNumber(options.maxEvents, 1500, 100, 20_000));
    this.maxRecentWrites = Math.round(clampNumber(options.maxRecentWrites, 80, 10, 500));
    this.maxConflicts = Math.round(clampNumber(options.maxConflicts, 80, 10, 500));
    this.mode = normalizeArbiterMode(options.mode);
    this.enforcePriorityFloor = Math.round(clampNumber(options.enforcePriorityFloor, 750, 600, 1000));
    this.blockedLogIntervalMs = Math.round(clampNumber(options.blockedLogIntervalMs, 60_000, 5_000, 60 * 60 * 1000));
  }

  async init(): Promise<void> {
    if (this.adapter) {
      this.adapter._actuatorShadowArbiter = this;
      this.adapter._actuatorShadowSnapshot = this.snapshot();
    }
  }

  install(adapterArg?: AnyRecord): ActuatorShadowArbiter {
    const adapter = adapterArg || this.adapter;
    if (!adapter || typeof adapter.setForeignStateAsync !== 'function') return this;
    this.adapter = adapter;
    adapter._actuatorShadowArbiter = this;
    if (this.installed) return this;
    this.installed = true;
    this.stopped = false;

    this.originalSetForeignStateAsync = adapter.setForeignStateAsync;
    const self = this;
    adapter.setForeignStateAsync = function shadowSetForeignStateAsync(...args: any[]): Promise<any> {
      return self.interceptAsync('setForeignStateAsync', self.originalSetForeignStateAsync!, args);
    };

    if (typeof adapter.setForeignStateChangedAsync === 'function') {
      this.originalSetForeignStateChangedAsync = adapter.setForeignStateChangedAsync;
      adapter.setForeignStateChangedAsync = function shadowSetForeignStateChangedAsync(...args: any[]): Promise<any> {
        return self.interceptAsync('setForeignStateChangedAsync', self.originalSetForeignStateChangedAsync!, args);
      };
    }
    return this;
  }

  uninstall(): void {
    if (!this.adapter || !this.installed) return;
    if (this.originalSetForeignStateAsync) this.adapter.setForeignStateAsync = this.originalSetForeignStateAsync;
    if (this.originalSetForeignStateChangedAsync) this.adapter.setForeignStateChangedAsync = this.originalSetForeignStateChangedAsync;
    this.installed = false;
  }

  stop(): void {
    this.stopped = true;
    this.authorities.clear();
    this.blockedLogTs.clear();
    this.uninstall();
  }

  runWithContext<T>(context: ActuatorShadowContext, fn: () => T): T {
    const parent = this.storage.getStore() || {};
    const merged: ActuatorShadowContext = {
      ...parent,
      ...context,
      owner: normalizeOwner(context.owner || parent.owner),
      module: text(context.module || parent.module),
      reason: text(context.reason || parent.reason),
    };
    const priority = Number.isFinite(Number(context.priority)) ? Number(context.priority) : (Number.isFinite(Number(parent.priority)) ? Number(parent.priority) : null);
    const leaseMs = Number.isFinite(Number(context.leaseMs)) ? Number(context.leaseMs) : (Number.isFinite(Number(parent.leaseMs)) ? Number(parent.leaseMs) : null);
    if (priority !== null) merged.priority = priority;
    if (leaseMs !== null) merged.leaseMs = leaseMs;
    if (typeof context.enforceAuthority === 'boolean') merged.enforceAuthority = context.enforceAuthority;
    else if (typeof parent.enforceAuthority === 'boolean') merged.enforceAuthority = parent.enforceAuthority;
    if (typeof context.releaseAuthority === 'boolean') merged.releaseAuthority = context.releaseAuthority;
    else if (typeof parent.releaseAuthority === 'boolean') merged.releaseAuthority = parent.releaseAuthority;
    return this.storage.run(merged, fn);
  }

  getContext(): ActuatorShadowContext {
    return this.storage.getStore() || {};
  }

  private inferOwner(targetId: string): { owner: string; inferred: boolean } {
    const context = this.getContext();
    if (context.owner && normalizeOwner(context.owner) !== 'runtime.unscoped') return { owner: normalizeOwner(context.owner), inferred: false };
    const ownerMap = this.adapter?._stageAActuatorOwnerById;
    const row = ownerMap && typeof ownerMap === 'object' ? ownerMap[targetId] : null;
    const activeOwners = Array.isArray(row?.activeOwners) ? row.activeOwners.map(normalizeOwner).filter(Boolean) : [];
    if (activeOwners.length === 1) return { owner: activeOwners[0]!, inferred: true };
    if (activeOwners.length > 1) return { owner: 'mapping.multiple-active', inferred: true };
    const owners = Array.isArray(row?.owners) ? row.owners.map(normalizeOwner).filter(Boolean) : [];
    if (owners.length === 1) return { owner: owners[0]!, inferred: true };
    return { owner: 'runtime.unscoped', inferred: false };
  }

  private resolveAuthorityIntent(ownerRaw: unknown, context: ActuatorShadowContext): { enforce: boolean; release: boolean } {
    if (typeof context.releaseAuthority === 'boolean' && context.releaseAuthority) return { enforce: false, release: true };
    if (typeof context.enforceAuthority === 'boolean') return { enforce: context.enforceAuthority, release: false };
    const owner = normalizeOwner(ownerRaw).toLowerCase();
    if (/(emergency|safety|notstop|failsafe|hardware-stop)/.test(owner)) return { enforce: true, release: false };
    if (/(manual|api\.|frontend|operator|installer)/.test(owner)) return { enforce: true, release: false };
    if (/(gridconstraints|grid-constraints)/.test(owner)) return { enforce: true, release: false };
    if (/para14a/.test(owner)) {
      return this.adapter?._para14a?.active === true
        ? { enforce: true, release: false }
        : { enforce: false, release: true };
    }
    if (/(peakshaving|peak-shaving)/.test(owner)) {
      return this.adapter?._peakShavingAuthorityActive === true
        ? { enforce: true, release: false }
        : { enforce: false, release: true };
    }
    return { enforce: false, release: false };
  }

  private createEvent(method: string, args: any[]): ShadowWriteEvent {
    const now = Date.now();
    const targetId = text(args[0]);
    const payload = extractWritePayload(args[1], args[2]);
    const context = this.getContext();
    const inferred = this.inferOwner(targetId);
    const owner = inferred.owner;
    const authorityIntent = this.resolveAuthorityIntent(owner, context);
    const priority = Number.isFinite(Number(context.priority)) ? Number(context.priority) : priorityForOwner(owner);
    const leaseMs = Math.round(clampNumber(context.leaseMs, ownerDefaultLeaseMs(owner), 0, 24 * 60 * 60 * 1000));
    const namespace = text(this.adapter?.namespace);
    const localTarget = !!(namespace && targetId.startsWith(`${namespace}.`));
    const actuatorCandidate = !!targetId && payload.ack !== true && !localTarget && !targetId.startsWith('system.adapter.');
    const ownerMap = this.adapter?._stageAActuatorOwnerById;
    const mappedActuator = !!(ownerMap && typeof ownerMap === 'object' && ownerMap[targetId]);
    const event: ShadowWriteEvent = {
      seq: ++this.seq,
      ts: now,
      completedTs: null,
      targetId,
      method,
      owner,
      module: text(context.module) || owner,
      priority,
      reason: text(context.reason),
      leaseMs,
      validUntil: now + leaseMs,
      cycleId: context.cycleId ?? null,
      requestId: text(context.requestId),
      kind: text(context.kind) || 'runtime-write',
      ack: payload.ack,
      actuatorCandidate,
      mappedActuator,
      inferredOwner: inferred.inferred,
      valuePreview: sanitizePreview(targetId, payload.value),
      valueFingerprint: stableFingerprint(payload.value),
      status: 'requested',
      error: '',
      decision: 'observe',
      decisionReason: '',
      authorityOwner: '',
      authorityPriority: null,
      blockedByOwner: '',
      enforceAuthority: authorityIntent.enforce,
      authorityExplicit: context.enforceAuthority === true,
      releaseAuthority: authorityIntent.release,
      writeExecuted: false,
    };
    this.requestsTotal += actuatorCandidate ? 1 : 0;
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
    return event;
  }

  private cleanupAuthorities(now = Date.now()): void {
    for (const [targetId, authority] of this.authorities.entries()) {
      if (authority.validUntil < now) this.authorities.delete(targetId);
    }
  }

  private authorityEligible(event: ShadowWriteEvent): boolean {
    // Initialisierungs-Writes bauen nur Startzustände auf. Sie dürfen keine
    // Lease gegen den ersten produktiven Regelzyklus erzeugen.
    if (event.cycleId === 'init' || event.reason === 'module-init') return false;
    return event.actuatorCandidate && event.mappedActuator && event.enforceAuthority && (event.priority >= this.enforcePriorityFloor || event.authorityExplicit);
  }

  /**
   * Sicherheitscontroller aus einem EMS-Modul besitzen ihre Steuerhoheit im
   * selben Regelzyklus. So kann ein früher §14a-/Peak-/Grid-Write einen späteren
   * Komfort-Write zuverlässig blockieren, ohne nach Ende der Sicherheitslage
   * weitere EMS-Ticks künstlich festzuhalten. Manuelle/API- und asynchrone
   * Safety-Leases bleiben dagegen bis zu ihrem Ablauf wirksam.
   */
  private authorityActiveForEvent(authority: AuthorityLease, event: ShadowWriteEvent): boolean {
    if (authority.validUntil < event.ts) return false;
    const authorityCycle = authority.cycleId;
    const incomingCycle = event.cycleId;

    if (authorityCycle !== null && authorityCycle !== 'init') {
      if (incomingCycle !== null && incomingCycle !== 'init') return authorityCycle === incomingCycle;
      // Zwischen zwei EMS-Ticks darf ein manueller/asynchroner Write einen noch
      // gültigen §14a-/Grid-/Peak-Owner nicht umgehen.
      return authority.priority >= 850;
    }

    // Manuelle/API-Overrides besitzen bewusst eine zeitlich begrenzte Lease.
    return true;
  }

  private decide(event: ShadowWriteEvent): ArbiterDecision {
    if (!event.actuatorCandidate || this.mode === 'shadow') {
      return { action: 'observe', reason: event.actuatorCandidate ? 'shadow-mode' : 'not-an-actuator', authority: null, updateAuthority: false, preempt: false };
    }
    const now = event.ts;
    this.cleanupAuthorities(now);
    let current = this.authorities.get(event.targetId) || null;
    if (current && !this.authorityActiveForEvent(current, event)) {
      this.authorities.delete(event.targetId);
      current = null;
    }
    if (event.releaseAuthority && current && current.owner === event.owner) {
      // Die Lease wird erst nach einem erfolgreich ausgeführten Restore-/Freigabe-
      // Write entfernt. Schlägt der Hardware-Write fehl, bleibt die bestehende
      // Steuerhoheit erhalten und ein niedrigerer Pfad kann den Aktor nicht auf
      // Basis eines nur vermeintlich wiederhergestellten Zustands übernehmen.
      return { action: 'release', reason: 'authority-release-requested', authority: current, updateAuthority: false, preempt: false };
    }
    if (!current) {
      if (this.authorityEligible(event)) {
        return { action: 'acquire', reason: 'safety-authority-acquired', authority: null, updateAuthority: true, preempt: false };
      }
      return { action: 'allow', reason: 'no-safety-authority', authority: null, updateAuthority: false, preempt: false };
    }
    event.authorityOwner = current.owner;
    event.authorityPriority = current.priority;
    if (current.owner === event.owner) {
      if (event.enforceAuthority) return { action: 'renew', reason: 'same-owner-renewal', authority: current, updateAuthority: true, preempt: false };
      return { action: 'allow', reason: 'same-owner-without-renewal', authority: current, updateAuthority: false, preempt: false };
    }
    if (event.enforceAuthority && event.priority > current.priority) {
      return { action: 'preempt', reason: 'higher-priority-preemption', authority: current, updateAuthority: true, preempt: true };
    }
    if (event.enforceAuthority && event.priority === current.priority && isManualOwner(event.owner) && isManualOwner(current.owner)) {
      return { action: 'preempt', reason: 'latest-manual-command-wins', authority: current, updateAuthority: true, preempt: true };
    }
    if (event.valueFingerprint === current.valueFingerprint) {
      return { action: 'allow-same-value', reason: 'same-value-under-authority', authority: current, updateAuthority: false, preempt: false };
    }
    if (event.priority === current.priority) {
      // Zwei unterschiedliche, gleichrangige Safety-Owner dürfen nicht im selben
      // Gültigkeitsfenster gegeneinander schreiben. Der bereits aktive Owner bleibt
      // deshalb stabil führend. Gleichrangige manuelle Befehle sind oben separat als
      // bewusste "letzter Kundenbefehl gewinnt"-Semantik behandelt.
      return {
        action: 'block',
        reason: 'equal-priority-authority-held',
        authority: current,
        updateAuthority: false,
        preempt: false,
      };
    }
    return {
      action: 'block',
      reason: 'lower-priority-authority-held',
      authority: current,
      updateAuthority: false,
      preempt: false,
    };
  }

  private updateAuthority(event: ShadowWriteEvent, decision: ArbiterDecision): void {
    if (decision.action === 'release') {
      const current = this.authorities.get(event.targetId);
      if (current && current.owner === event.owner) this.authorities.delete(event.targetId);
      return;
    }
    if (!decision.updateAuthority || !event.actuatorCandidate || !event.enforceAuthority) return;
    const previous = decision.authority;
    const acquiredTs = previous && previous.owner === event.owner ? previous.acquiredTs : event.ts;
    const authority: AuthorityLease = {
      targetId: event.targetId,
      owner: event.owner,
      priority: event.priority,
      acquiredTs,
      renewedTs: event.completedTs || event.ts,
      validUntil: event.validUntil,
      reason: event.reason,
      valuePreview: event.valuePreview,
      valueFingerprint: event.valueFingerprint,
      cycleId: event.cycleId,
      requestId: event.requestId,
      kind: event.kind,
      event,
    };
    this.authorities.set(event.targetId, authority);
    if (decision.preempt) this.preemptionsTotal += 1;
  }

  private blockedResult(event: ShadowWriteEvent, authority: AuthorityLease): ActuatorAuthorityBlockedResult {
    return {
      __nexowattActuatorAuthorityBlocked: true,
      targetId: event.targetId,
      owner: event.owner,
      blockedByOwner: authority.owner,
      blockedByPriority: authority.priority,
      reason: event.decisionReason,
    };
  }

  private logBlocked(event: ShadowWriteEvent, authority: AuthorityLease): void {
    const now = event.completedTs || Date.now();
    const signature = `${event.targetId}|${event.owner}|${authority.owner}`;
    const previous = this.blockedLogTs.get(signature) || 0;
    if (now - previous < this.blockedLogIntervalMs) return;
    this.blockedLogTs.set(signature, now);
    const target = SECRET_TARGET_PATTERN.test(event.targetId) ? '[redacted-target]' : event.targetId;
    const log = this.adapter?.log;
    const fn = log && typeof log.warn === 'function' ? log.warn : null;
    if (fn) {
      try {
        fn.call(log, `[Aktor-Arbiter] Write blockiert: ${event.owner} (${event.priority}) -> ${target}; Steuerhoheit ${authority.owner} (${authority.priority}) bis ${new Date(authority.validUntil).toISOString()}.`);
      } catch (_error) {}
    }
  }

  private async interceptAsync(method: string, original: (...args: any[]) => Promise<any>, args: any[]): Promise<any> {
    if (this.stopped) return original.apply(this.adapter, args);
    const event = this.createEvent(method, args);
    const decision = this.decide(event);
    event.decision = decision.action;
    event.decisionReason = decision.reason;
    if (decision.authority) {
      event.authorityOwner = decision.authority.owner;
      event.authorityPriority = decision.authority.priority;
    }
    this.lastDecision = {
      ts: event.ts,
      targetId: SECRET_TARGET_PATTERN.test(event.targetId) ? '[redacted-target]' : event.targetId,
      owner: event.owner,
      priority: event.priority,
      action: decision.action,
      reason: decision.reason,
      authorityOwner: decision.authority?.owner || '',
      authorityPriority: decision.authority?.priority ?? null,
    };
    if (decision.action === 'block' && decision.authority) {
      event.status = 'blocked';
      event.completedTs = Date.now();
      event.blockedByOwner = decision.authority.owner;
      this.blockedRequestsTotal += 1;
      this.registerConflict(decision.authority.event, event, decision.authority.owner, 'blocked');
      this.logBlocked(event, decision.authority);
      if (this.adapter) this.adapter._actuatorShadowSnapshot = this.snapshot(event.completedTs);
      return this.blockedResult(event, decision.authority);
    }
    try {
      const result = await original.apply(this.adapter, args);
      event.status = 'accepted';
      event.completedTs = Date.now();
      event.writeExecuted = true;
      if (event.actuatorCandidate) this.allowedByArbiterTotal += 1;
      this.updateAuthority(event, decision);
      this.detectConflict(event);
      if (this.adapter) this.adapter._actuatorShadowSnapshot = this.snapshot(event.completedTs);
      return result;
    } catch (error: unknown) {
      event.status = 'failed';
      event.completedTs = Date.now();
      event.error = error instanceof Error ? error.message.slice(0, 250) : String(error).slice(0, 250);
      if (this.adapter) this.adapter._actuatorShadowSnapshot = this.snapshot(event.completedTs);
      throw error;
    }
  }

  /**
   * Registriert eine fachlich weiterhin aktive Schreibanforderung, die von der
   * Datapoint-Registry nur wegen Deadband/Idempotenz nicht erneut an die
   * Hardware gesendet wird. Sicherheitscontroller behalten damit im aktuellen
   * EMS-Zyklus ihre Steuerhoheit, ohne unnötige Bus-/Geräte-Writes zu erzeugen.
   */
  guardSkippedWrite(targetId: string, value: unknown, ack = false): ActuatorAuthorityBlockedResult | null {
    if (this.stopped) return null;
    const event = this.createEvent('write-intent-skipped', [targetId, value, ack]);
    const decision = this.decide(event);
    event.decision = decision.action;
    event.decisionReason = decision.reason;
    if (decision.authority) {
      event.authorityOwner = decision.authority.owner;
      event.authorityPriority = decision.authority.priority;
    }
    this.lastDecision = {
      ts: event.ts,
      targetId: SECRET_TARGET_PATTERN.test(event.targetId) ? '[redacted-target]' : event.targetId,
      owner: event.owner,
      priority: event.priority,
      action: decision.action,
      reason: `${decision.reason}:deadband-intent`,
      authorityOwner: decision.authority?.owner || '',
      authorityPriority: decision.authority?.priority ?? null,
    };
    event.completedTs = Date.now();
    if (decision.action === 'block' && decision.authority) {
      event.status = 'blocked';
      event.blockedByOwner = decision.authority.owner;
      this.blockedRequestsTotal += 1;
      this.registerConflict(decision.authority.event, event, decision.authority.owner, 'blocked');
      this.logBlocked(event, decision.authority);
      if (this.adapter) this.adapter._actuatorShadowSnapshot = this.snapshot(event.completedTs);
      return this.blockedResult(event, decision.authority);
    }
    event.status = 'accepted';
    this.updateAuthority(event, decision);
    if (this.adapter) this.adapter._actuatorShadowSnapshot = this.snapshot(event.completedTs);
    return null;
  }

  private detectConflict(current: ShadowWriteEvent): void {
    if (!current.actuatorCandidate || current.status !== 'accepted') return;
    const cutoff = current.ts - this.conflictWindowMs;
    for (let index = this.events.length - 2; index >= 0; index -= 1) {
      const previous = this.events[index]!;
      if (previous.ts < cutoff && previous.validUntil < current.ts) break;
      if (!previous.actuatorCandidate || previous.status !== 'accepted') continue;
      if (previous.targetId !== current.targetId) continue;
      if (previous.owner === current.owner) continue;
      const sameCycle = current.cycleId !== null && previous.cycleId !== null && current.cycleId === previous.cycleId;
      const leaseOverlap = previous.validUntil >= current.ts || current.validUntil >= previous.ts;
      if (!sameCycle && !leaseOverlap && (current.ts - previous.ts) > this.conflictWindowMs) continue;
      if (!valuesDiffer(previous, current)) continue;
      const resolvedByArbiter = this.mode === 'enforce-safety'
        && current.priority >= this.enforcePriorityFloor
        && current.priority >= previous.priority
        && (current.decision === 'acquire' || current.decision === 'preempt' || current.decision === 'renew');
      this.registerConflict(previous, current, current.owner, resolvedByArbiter ? 'preempted' : 'unresolved');
    }
  }

  private registerConflict(a: ShadowWriteEvent, b: ShadowWriteEvent, winnerOwner: string, resolution: ConflictResolution): void {
    const owners = Array.from(new Set([a.owner, b.owner])).sort();
    const key = `${a.targetId}|${owners.join('|')}`;
    const existing = this.conflicts.get(key);
    const conflict: ShadowConflict = existing || {
      objectId: a.targetId,
      targetId: a.targetId,
      firstTs: Math.min(a.ts, b.ts),
      lastTs: Math.max(a.ts, b.ts),
      owners,
      priorities: {},
      values: {},
      cycleIds: [],
      writeSeqs: [],
      reasons: {},
      count: 0,
      lastWinner: winnerOwner,
      blockedCount: 0,
      preemptedCount: 0,
      acceptedConflictCount: 0,
      lastResolvedByArbiter: resolution !== 'unresolved',
      lastDecision: resolution,
    };
    conflict.lastTs = Math.max(conflict.lastTs, a.ts, b.ts);
    conflict.count += 1;
    conflict.lastWinner = winnerOwner;
    conflict.lastResolvedByArbiter = resolution !== 'unresolved';
    conflict.lastDecision = resolution;
    if (resolution === 'blocked') conflict.blockedCount += 1;
    else if (resolution === 'preempted') conflict.preemptedCount += 1;
    else conflict.acceptedConflictCount += 1;
    for (const event of [a, b]) {
      conflict.priorities[event.owner] = event.priority;
      conflict.values[event.owner] = event.valuePreview;
      if (event.reason) conflict.reasons[event.owner] = event.reason;
      if (event.cycleId !== null && !conflict.cycleIds.includes(event.cycleId)) conflict.cycleIds.push(event.cycleId);
      if (!conflict.writeSeqs.includes(event.seq)) conflict.writeSeqs.push(event.seq);
    }
    conflict.writeSeqs = conflict.writeSeqs.slice(-20);
    conflict.cycleIds = conflict.cycleIds.slice(-10);
    this.conflicts.set(key, conflict);
    if (this.conflicts.size > this.maxConflicts) {
      const oldest = Array.from(this.conflicts.entries()).sort((left, right) => left[1].lastTs - right[1].lastTs)[0];
      if (oldest) this.conflicts.delete(oldest[0]);
    }
  }

  snapshot(now = Date.now()): AnyRecord {
    this.cleanupAuthorities(now);
    const historyCutoff = now - this.historyWindowMs;
    const conflictCutoff = now - this.conflictRetentionMs;
    const events = this.events.filter((event) => event.ts >= historyCutoff);
    const accepted = events.filter((event) => event.status === 'accepted');
    const blocked = events.filter((event) => event.status === 'blocked' && event.actuatorCandidate);
    const actuatorWrites = accepted.filter((event) => event.actuatorCandidate && event.writeExecuted);
    const skippedWriteIntents = accepted.filter((event) => event.actuatorCandidate && !event.writeExecuted);
    const activeConflicts = Array.from(this.conflicts.values())
      .filter((conflict) => conflict.lastTs >= conflictCutoff)
      .sort((a, b) => b.lastTs - a.lastTs)
      .slice(0, this.maxConflicts);
    const preventedConflicts = activeConflicts.filter((conflict) => conflict.lastResolvedByArbiter === true);
    const unresolvedConflicts = activeConflicts.filter((conflict) => conflict.lastResolvedByArbiter !== true);
    const activeAuthorities = Array.from(this.authorities.values())
      .filter((authority) => authority.validUntil >= now)
      .sort((a, b) => b.priority - a.priority || b.renewedTs - a.renewedTs)
      .map((authority) => ({
        targetId: SECRET_TARGET_PATTERN.test(authority.targetId) ? '[redacted-target]' : authority.targetId,
        owner: authority.owner,
        priority: authority.priority,
        acquiredTs: authority.acquiredTs,
        renewedTs: authority.renewedTs,
        validUntil: authority.validUntil,
        remainingMs: Math.max(0, authority.validUntil - now),
        reason: authority.reason,
        value: sanitizePreview(authority.targetId, authority.valuePreview),
        cycleId: authority.cycleId,
        kind: authority.kind,
      }));
    const targets = new Map<string, ShadowWriteEvent[]>();
    for (const event of actuatorWrites) {
      if (!targets.has(event.targetId)) targets.set(event.targetId, []);
      targets.get(event.targetId)!.push(event);
    }
    const targetSummaries = Array.from(targets.entries()).map(([targetId, rows]) => {
      const last = rows[rows.length - 1]!;
      const owners = Array.from(new Set(rows.map((row) => row.owner)));
      return {
        objectId: targetId,
        targetId,
        writeCount: rows.length,
        owners,
        lastOwner: last.owner,
        lastPriority: last.priority,
        lastValue: last.valuePreview,
        lastTs: last.ts,
        lastReason: last.reason,
        finalExecutedWriter: last.owner,
      };
    }).sort((a, b) => b.lastTs - a.lastTs);
    const ownerStats: Record<string, { writes: number; targets: number; failures: number }> = {};
    for (const event of events) {
      if (!ownerStats[event.owner]) ownerStats[event.owner] = { writes: 0, targets: 0, failures: 0 };
      ownerStats[event.owner]!.writes += event.status === 'accepted' && event.actuatorCandidate ? 1 : 0;
      ownerStats[event.owner]!.failures += event.status === 'failed' ? 1 : 0;
    }
    for (const [owner, stats] of Object.entries(ownerStats)) {
      stats.targets = new Set(actuatorWrites.filter((event) => event.owner === owner).map((event) => event.targetId)).size;
    }
    const lastWrite = actuatorWrites.length ? actuatorWrites[actuatorWrites.length - 1]! : null;
    return {
      active: !this.stopped,
      mode: this.mode,
      behaviorChanged: this.mode === 'enforce-safety',
      enforcePriorityFloor: this.enforcePriorityFloor,
      requestsTotal: this.requestsTotal,
      blockedRequestsTotal: this.blockedRequestsTotal,
      preemptionsTotal: this.preemptionsTotal,
      allowedByArbiterTotal: this.allowedByArbiterTotal,
      recentWriteCount: actuatorWrites.length,
      acceptedWriteCount: actuatorWrites.length,
      skippedWriteIntentCount: skippedWriteIntents.length,
      blockedWriteCount: blocked.length,
      failedWriteCount: events.filter((event) => event.status === 'failed').length,
      observedTargetCount: targets.size,
      activeAuthorityCount: activeAuthorities.length,
      activeAuthorities,
      activeConflictCount: activeConflicts.length,
      preventedConflictCount: preventedConflicts.length,
      unresolvedConflictCount: unresolvedConflicts.length,
      activeConflicts,
      lastDecision: this.lastDecision,
      unscopedWriteCount: actuatorWrites.filter((event) => event.owner === 'runtime.unscoped' || event.owner === 'mapping.multiple-active').length,
      lastWriteTs: lastWrite?.ts || 0,
      lastExecutedWriter: lastWrite?.owner || '',
      lastWrite: lastWrite ? {
        seq: lastWrite.seq,
        ts: lastWrite.ts,
        objectId: lastWrite.targetId,
        targetId: lastWrite.targetId,
        owner: lastWrite.owner,
        module: lastWrite.module,
        priority: lastWrite.priority,
        reason: lastWrite.reason,
        value: lastWrite.valuePreview,
        status: lastWrite.status,
        mappedActuator: lastWrite.mappedActuator,
        finalExecutedWriter: lastWrite.owner,
      } : null,
      ownerStats,
      targets: targetSummaries.slice(0, 100),
      recentWrites: actuatorWrites.slice(-this.maxRecentWrites).reverse().map((event) => ({
        seq: event.seq,
        ts: event.ts,
        objectId: event.targetId,
        targetId: event.targetId,
        owner: event.owner,
        module: event.module,
        priority: event.priority,
        reason: event.reason,
        leaseMs: event.leaseMs,
        cycleId: event.cycleId,
        value: event.valuePreview,
        status: event.status,
        decision: event.decision,
        decisionReason: event.decisionReason,
        authorityOwner: event.authorityOwner,
        authorityPriority: event.authorityPriority,
        blockedByOwner: event.blockedByOwner,
        mappedActuator: event.mappedActuator,
        inferredOwner: event.inferredOwner,
        finalExecutedWriter: event.owner,
      })),
      blockedWrites: blocked.slice(-this.maxRecentWrites).reverse().map((event) => ({
        seq: event.seq,
        ts: event.ts,
        targetId: SECRET_TARGET_PATTERN.test(event.targetId) ? '[redacted-target]' : event.targetId,
        owner: event.owner,
        priority: event.priority,
        reason: event.reason,
        value: event.valuePreview,
        blockedByOwner: event.blockedByOwner,
        authorityPriority: event.authorityPriority,
        decisionReason: event.decisionReason,
      })),
    };
  }
}

export function installActuatorShadowArbiter(adapter: AnyRecord): ActuatorShadowArbiter {
  if (adapter?._actuatorShadowArbiter instanceof ActuatorShadowArbiter) {
    adapter._actuatorShadowArbiter.install(adapter);
    return adapter._actuatorShadowArbiter;
  }
  const cfg = adapter?.config?.diagnostics || {};
  const arbiter = new ActuatorShadowArbiter({
    historyWindowMs: cfg.actuatorShadowHistoryMs,
    conflictWindowMs: cfg.actuatorShadowConflictWindowMs,
    conflictRetentionMs: cfg.actuatorShadowConflictRetentionMs,
    maxEvents: cfg.actuatorShadowMaxEvents,
    maxRecentWrites: cfg.actuatorShadowMaxRecentWrites,
    maxConflicts: cfg.actuatorShadowMaxConflicts,
    mode: cfg.actuatorArbiterMode,
    enforcePriorityFloor: cfg.actuatorArbiterEnforcePriorityFloor,
    blockedLogIntervalMs: cfg.actuatorArbiterBlockedLogIntervalMs,
  });
  arbiter.install(adapter);
  adapter._actuatorShadowArbiter = arbiter;
  return arbiter;
}

export function withActuatorShadowContext<T>(adapter: AnyRecord, context: ActuatorShadowContext, fn: () => T): T {
  const arbiter = adapter?._actuatorShadowArbiter;
  if (arbiter && typeof arbiter.runWithContext === 'function') return arbiter.runWithContext(context, fn);
  return fn();
}

module.exports = {
  ActuatorShadowArbiter,
  installActuatorShadowArbiter,
  withActuatorShadowContext,
  priorityForOwner,
  buildHttpActuatorShadowContext,
  isActuatorAuthorityBlockedResult,
};
