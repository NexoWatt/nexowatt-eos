// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Beschreibt und normalisiert gemeinsame Eigenschaften von Aktor-Befehlen und deren Bestätigungszustand.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/actuator-command-contract.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';

/**
 * Datei: ems/services/actuator-command-contract.ts
 *
 * Stufe C3.2: kleine, typisierte Zustandsmaschine für Hardware-Schreibverträge.
 * Sie ändert keine fachlichen Sollwerte. Sie verhindert lediglich, dass ein
 * blockierter/fehlgeschlagener Write als umgesetzt gilt und begrenzt Wiederholungen.
 */

declare const module: { exports: unknown };

type ContractConfig = {
  requireReadback?: boolean;
  ackTimeoutMs?: number;
  retryDelayMs?: number;
  maxRetries?: number;
  faultLockMs?: number;
};

type ContractState = {
  fingerprint: string;
  requested: unknown;
  firstRequestTs: number;
  lastAttemptTs: number;
  nextAttemptTs: number;
  retryCount: number;
  pending: boolean;
  faultUntil: number;
  accepted: boolean;
  confirmed: boolean;
  readbackOk: boolean | null;
  actual: unknown;
  status: string;
};

export type ActuatorContractDecision = {
  allowed: boolean;
  targetChanged: boolean;
  status: string;
  retryCount: number;
  pending: boolean;
  faultLocked: boolean;
  faultUntil: number;
};

export type ActuatorContractResult = ActuatorContractDecision & {
  accepted: boolean;
  confirmed: boolean;
  readbackOk: boolean | null;
  actual: unknown;
  requested: unknown;
};

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function stable(value: unknown, depth = 0): string {
  if (depth > 8) return '[depth]';
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return Number.isFinite(value) ? `n:${Math.round(value * 1e6) / 1e6}` : `n:${String(value)}`;
  if (typeof value === 'boolean') return value ? 'b:1' : 'b:0';
  if (typeof value === 'string') return `s:${value}`;
  if (Array.isArray(value)) return `[${value.map((entry) => stable(entry, depth + 1)).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((key) => `${key}:${stable(obj[key], depth + 1)}`).join(',')}}`;
  }
  return `${typeof value}:${String(value)}`;
}

function normalized(cfg: ContractConfig = {}): Required<ContractConfig> {
  return {
    requireReadback: cfg.requireReadback === true,
    ackTimeoutMs: Math.round(num(cfg.ackTimeoutMs, 5000, 250, 120000)),
    retryDelayMs: Math.round(num(cfg.retryDelayMs, 3000, 250, 120000)),
    maxRetries: Math.round(num(cfg.maxRetries, 3, 0, 20)),
    faultLockMs: Math.round(num(cfg.faultLockMs, 60000, 1000, 24 * 60 * 60 * 1000)),
  };
}

export class ActuatorCommandContract {
  private readonly states = new Map<string, ContractState>();

  prepare(keyRaw: unknown, requested: unknown, nowRaw: unknown, cfgRaw: ContractConfig = {}): ActuatorContractDecision {
    const key = String(keyRaw || '').trim();
    const now = Number.isFinite(Number(nowRaw)) ? Number(nowRaw) : Date.now();
    const fp = stable(requested);
    let state = this.states.get(key);
    const targetChanged = !state || state.fingerprint !== fp;
    if (targetChanged) {
      state = {
        fingerprint: fp,
        requested,
        firstRequestTs: now,
        lastAttemptTs: 0,
        nextAttemptTs: 0,
        retryCount: 0,
        pending: false,
        faultUntil: 0,
        accepted: false,
        confirmed: false,
        readbackOk: null,
        actual: null,
        status: 'new-request',
      };
      this.states.set(key, state);
    }
    if (!state) throw new Error('actuator contract state missing');
    if (state.faultUntil > now) {
      return { allowed: false, targetChanged, status: 'fault-locked', retryCount: state.retryCount, pending: state.pending, faultLocked: true, faultUntil: state.faultUntil };
    }
    if (state.nextAttemptTs > now) {
      return { allowed: false, targetChanged, status: state.pending ? 'readback-pending' : 'retry-wait', retryCount: state.retryCount, pending: state.pending, faultLocked: false, faultUntil: 0 };
    }
    return { allowed: true, targetChanged, status: 'write-allowed', retryCount: state.retryCount, pending: state.pending, faultLocked: false, faultUntil: 0 };
  }

  complete(keyRaw: unknown, requested: unknown, acceptedRaw: unknown, readbackOk: boolean | null, actual: unknown, nowRaw: unknown, cfgRaw: ContractConfig = {}): ActuatorContractResult {
    const key = String(keyRaw || '').trim();
    const now = Number.isFinite(Number(nowRaw)) ? Number(nowRaw) : Date.now();
    const cfg = normalized(cfgRaw);
    const fp = stable(requested);
    let state = this.states.get(key);
    if (!state || state.fingerprint !== fp) {
      this.prepare(key, requested, now, cfg);
      state = this.states.get(key)!;
    }
    state.lastAttemptTs = now;
    state.requested = requested;
    state.actual = actual;
    state.accepted = acceptedRaw === true;
    state.readbackOk = readbackOk;

    if (state.accepted && (!cfg.requireReadback || readbackOk === true)) {
      state.confirmed = true;
      state.pending = false;
      state.retryCount = 0;
      state.nextAttemptTs = 0;
      state.faultUntil = 0;
      state.status = cfg.requireReadback ? 'applied-readback-confirmed' : 'applied-write-accepted';
    } else {
      state.confirmed = false;
      state.pending = state.accepted && cfg.requireReadback;
      state.retryCount += 1;
      const exhausted = state.retryCount > cfg.maxRetries;
      if (exhausted) {
        state.faultUntil = now + cfg.faultLockMs;
        state.nextAttemptTs = state.faultUntil;
        state.status = state.pending ? 'readback-failed-locked' : 'write-failed-locked';
      } else {
        state.nextAttemptTs = now + (state.pending ? cfg.ackTimeoutMs : cfg.retryDelayMs);
        state.status = state.pending ? 'readback-pending' : 'write-failed-retry';
      }
    }
    return this.result(key, now, false);
  }

  defer(keyRaw: unknown, requested: unknown, nowRaw: unknown, delayMsRaw: unknown, statusRaw: unknown = 'deferred'): ActuatorContractResult {
    const key = String(keyRaw || '').trim();
    const now = Number.isFinite(Number(nowRaw)) ? Number(nowRaw) : Date.now();
    const delayMs = Math.max(250, Math.min(120000, Number(delayMsRaw) || 1000));
    const fp = stable(requested);
    let state = this.states.get(key);
    if (!state || state.fingerprint !== fp) {
      this.prepare(key, requested, now, {});
      state = this.states.get(key)!;
    }
    state.requested = requested;
    state.accepted = false;
    state.confirmed = false;
    state.pending = false;
    state.nextAttemptTs = now + delayMs;
    state.status = String(statusRaw || 'deferred');
    return this.result(key, now, false);
  }

  confirmFromReadback(keyRaw: unknown, requested: unknown, actual: unknown, matches: boolean, nowRaw: unknown): ActuatorContractResult | null {
    const key = String(keyRaw || '').trim();
    const now = Number.isFinite(Number(nowRaw)) ? Number(nowRaw) : Date.now();
    const state = this.states.get(key);
    if (!state || state.fingerprint !== stable(requested) || matches !== true) return null;
    state.actual = actual;
    state.accepted = true;
    state.confirmed = true;
    state.readbackOk = true;
    state.pending = false;
    state.retryCount = 0;
    state.nextAttemptTs = 0;
    state.faultUntil = 0;
    state.status = 'applied-readback-confirmed';
    return this.result(key, now, false);
  }

  result(keyRaw: unknown, nowRaw: unknown = Date.now(), targetChanged = false): ActuatorContractResult {
    const key = String(keyRaw || '').trim();
    const now = Number.isFinite(Number(nowRaw)) ? Number(nowRaw) : Date.now();
    const state = this.states.get(key);
    if (!state) {
      return { allowed: true, targetChanged, status: 'idle', retryCount: 0, pending: false, faultLocked: false, faultUntil: 0, accepted: false, confirmed: false, readbackOk: null, actual: null, requested: null };
    }
    const faultLocked = state.faultUntil > now;
    return {
      allowed: !faultLocked && state.nextAttemptTs <= now,
      targetChanged,
      status: state.status,
      retryCount: state.retryCount,
      pending: state.pending,
      faultLocked,
      faultUntil: faultLocked ? state.faultUntil : 0,
      accepted: state.accepted,
      confirmed: state.confirmed,
      readbackOk: state.readbackOk,
      actual: state.actual,
      requested: state.requested,
    };
  }

  release(keyRaw: unknown): void {
    this.states.delete(String(keyRaw || '').trim());
  }
}

module.exports = { ActuatorCommandContract };
