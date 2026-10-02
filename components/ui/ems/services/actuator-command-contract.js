/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/ems/services/actuator-command-contract.ts
 * Quell-Hash: sha256:e7a9429dff4c1dda85414eb9f523729711bdc0188c5b6f5924f43e4229685a60
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für ems/services/actuator-command-contract.js.
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
 * Aufgabe: Beschreibt und normalisiert gemeinsame Eigenschaften von Aktor-Befehlen und deren Bestätigungszustand.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/ems/services/actuator-command-contract.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActuatorCommandContract = void 0;
function num(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, n));
}
function stable(value, depth = 0) {
    if (depth > 8)
        return '[depth]';
    if (value === null)
        return 'null';
    if (value === undefined)
        return 'undefined';
    if (typeof value === 'number')
        return Number.isFinite(value) ? `n:${Math.round(value * 1e6) / 1e6}` : `n:${String(value)}`;
    if (typeof value === 'boolean')
        return value ? 'b:1' : 'b:0';
    if (typeof value === 'string')
        return `s:${value}`;
    if (Array.isArray(value))
        return `[${value.map((entry) => stable(entry, depth + 1)).join(',')}]`;
    if (typeof value === 'object') {
        const obj = value;
        return `{${Object.keys(obj).sort().map((key) => `${key}:${stable(obj[key], depth + 1)}`).join(',')}}`;
    }
    return `${typeof value}:${String(value)}`;
}
function normalized(cfg = {}) {
    return {
        requireReadback: cfg.requireReadback === true,
        ackTimeoutMs: Math.round(num(cfg.ackTimeoutMs, 5000, 250, 120000)),
        retryDelayMs: Math.round(num(cfg.retryDelayMs, 3000, 250, 120000)),
        maxRetries: Math.round(num(cfg.maxRetries, 3, 0, 20)),
        faultLockMs: Math.round(num(cfg.faultLockMs, 60000, 1000, 24 * 60 * 60 * 1000)),
    };
}
class ActuatorCommandContract {
    constructor() {
        this.states = new Map();
    }
    prepare(keyRaw, requested, nowRaw, cfgRaw = {}) {
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
        if (!state)
            throw new Error('actuator contract state missing');
        if (state.faultUntil > now) {
            return { allowed: false, targetChanged, status: 'fault-locked', retryCount: state.retryCount, pending: state.pending, faultLocked: true, faultUntil: state.faultUntil };
        }
        if (state.nextAttemptTs > now) {
            return { allowed: false, targetChanged, status: state.pending ? 'readback-pending' : 'retry-wait', retryCount: state.retryCount, pending: state.pending, faultLocked: false, faultUntil: 0 };
        }
        return { allowed: true, targetChanged, status: 'write-allowed', retryCount: state.retryCount, pending: state.pending, faultLocked: false, faultUntil: 0 };
    }
    complete(keyRaw, requested, acceptedRaw, readbackOk, actual, nowRaw, cfgRaw = {}) {
        const key = String(keyRaw || '').trim();
        const now = Number.isFinite(Number(nowRaw)) ? Number(nowRaw) : Date.now();
        const cfg = normalized(cfgRaw);
        const fp = stable(requested);
        let state = this.states.get(key);
        if (!state || state.fingerprint !== fp) {
            this.prepare(key, requested, now, cfg);
            state = this.states.get(key);
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
        }
        else {
            state.confirmed = false;
            state.pending = state.accepted && cfg.requireReadback;
            state.retryCount += 1;
            const exhausted = state.retryCount > cfg.maxRetries;
            if (exhausted) {
                state.faultUntil = now + cfg.faultLockMs;
                state.nextAttemptTs = state.faultUntil;
                state.status = state.pending ? 'readback-failed-locked' : 'write-failed-locked';
            }
            else {
                state.nextAttemptTs = now + (state.pending ? cfg.ackTimeoutMs : cfg.retryDelayMs);
                state.status = state.pending ? 'readback-pending' : 'write-failed-retry';
            }
        }
        return this.result(key, now, false);
    }
    defer(keyRaw, requested, nowRaw, delayMsRaw, statusRaw = 'deferred') {
        const key = String(keyRaw || '').trim();
        const now = Number.isFinite(Number(nowRaw)) ? Number(nowRaw) : Date.now();
        const delayMs = Math.max(250, Math.min(120000, Number(delayMsRaw) || 1000));
        const fp = stable(requested);
        let state = this.states.get(key);
        if (!state || state.fingerprint !== fp) {
            this.prepare(key, requested, now, {});
            state = this.states.get(key);
        }
        state.requested = requested;
        state.accepted = false;
        state.confirmed = false;
        state.pending = false;
        state.nextAttemptTs = now + delayMs;
        state.status = String(statusRaw || 'deferred');
        return this.result(key, now, false);
    }
    confirmFromReadback(keyRaw, requested, actual, matches, nowRaw) {
        const key = String(keyRaw || '').trim();
        const now = Number.isFinite(Number(nowRaw)) ? Number(nowRaw) : Date.now();
        const state = this.states.get(key);
        if (!state || state.fingerprint !== stable(requested) || matches !== true)
            return null;
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
    result(keyRaw, nowRaw = Date.now(), targetChanged = false) {
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
    release(keyRaw) {
        this.states.delete(String(keyRaw || '').trim());
    }
}
exports.ActuatorCommandContract = ActuatorCommandContract;
module.exports = { ActuatorCommandContract };
