/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/sse-runtime-guard.ts
 * Quell-Hash: sha256:dd502d68a28c3370efbe31d4fe0cf2fbb46f3269302bc6f2e04cd5c265a531b6
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/sse-runtime-guard.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Begrenzt überlastete SSE-Verbindungen, ohne gesunde Browserverbindungen wegen anderer Clients zu trennen.
 * Daten und Wirkung: Verarbeitet die über Signaturen, Konfiguration und direkte Imports zugeführten Werte. Funktionsverzeichnis und Aufrufstellen zeigen, wo Ergebnisse zurückgegeben, Zustände veröffentlicht oder Befehle weitergereicht werden.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/sse-runtime-guard.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
/**
 * RC88: memory-safe Server-Sent Events transport.
 *
 * Node.js accepts data into the HTTP response buffer even when the browser,
 * VPN or reverse proxy no longer consumes it. Continuing to call res.write()
 * after backpressure therefore retains every live update in the V8 heap. This
 * guard stops further writes, waits only for a bounded drain interval and
 * closes/resynchronizes unhealthy clients instead of buffering indefinitely.
 */
class SseRuntimeGuard {
    constructor(options = {}) {
        this.log = options.log || console;
        this.maxClients = this._clamp(options.maxClients, 24, 2, 64);
        this.maxBufferedBytes = this._clamp(options.maxBufferedBytes, 4 * 1024 * 1024, 256 * 1024, 16 * 1024 * 1024);
        this.backpressureTimeoutMs = this._clamp(options.backpressureTimeoutMs, 8000, 1000, 60000);
        this.heartbeatMs = this._clamp(options.heartbeatMs, 15000, 5000, 60000);
        this.maxFrameBytes = this._clamp(options.maxFrameBytes, 8 * 1024 * 1024, 256 * 1024, 32 * 1024 * 1024);
        this.pressureBufferBytes = this._clamp(options.pressureBufferBytes, Math.max(256 * 1024, Math.round(this.maxBufferedBytes / 2)), 64 * 1024, this.maxBufferedBytes);
        // Keep a real critical-pressure reconnect pause safely below the admin
        // overview's 20-second freshness window. Normal pressure sets no lockout.
        this.criticalReconnectCooldownMs = this._clamp(options.criticalReconnectCooldownMs, 10000, 1000, 10000);
        this.getSnapshotChunk = typeof options.getSnapshotChunk === 'function' ? options.getSnapshotChunk : null;
        this.clients = new Set();
        this._seq = 0;
        this._authorizationPending = 0;
        this._heartbeatTimer = null;
        this._pressureUntil = 0;
        this._lastWarnAt = new Map();
        this._stats = {
            accepted: 0,
            closed: 0,
            writeErrors: 0,
            backpressureEvents: 0,
            droppedUpdates: 0,
            closedBackpressure: 0,
            closedBufferLimit: 0,
            closedClientLimit: 0,
            rejectedPressure: 0,
            resyncs: 0,
            maxObservedClients: 0,
            maxObservedWritableBytes: 0,
            lastCloseReason: '',
            lastCloseAt: 0,
        };
    }
    _clamp(value, fallback, min, max) {
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
    }
    _warnOnce(key, message, intervalMs = 60000) {
        const now = Date.now();
        const last = this._lastWarnAt.get(key) || 0;
        if (now - last < intervalMs)
            return;
        this._lastWarnAt.set(key, now);
        while (this._lastWarnAt.size > 64) {
            const oldest = this._lastWarnAt.keys().next().value;
            if (oldest === undefined)
                break;
            this._lastWarnAt.delete(oldest);
        }
        try {
            this.log.warn?.(`[sse-guard] ${message}`);
        }
        catch (_error) { }
    }
    _writableBytes(client) {
        try {
            const resBytes = Number(client?.res?.writableLength) || 0;
            const socket = client?.res?.socket || client?.req?.socket;
            const socketBytes = Number(socket?.writableLength) || 0;
            const bytes = Math.max(0, resBytes, socketBytes);
            this._stats.maxObservedWritableBytes = Math.max(this._stats.maxObservedWritableBytes, bytes);
            return bytes;
        }
        catch (_error) {
            return 0;
        }
    }
    _isDead(client) {
        const res = client?.res;
        const req = client?.req;
        const socket = res?.socket || req?.socket;
        return !client || client.closed === true || !res || res.destroyed === true || res.writableEnded === true
            || req?.destroyed === true || req?.aborted === true || socket?.destroyed === true;
    }
    _bind(client, emitter, event, handler) {
        if (!emitter || typeof emitter.once !== 'function')
            return;
        const row = { emitter, event, handler: null };
        const wrapped = (...args) => {
            try {
                const index = client.listeners.indexOf(row);
                if (index >= 0)
                    client.listeners.splice(index, 1);
            }
            catch (_error) { }
            return handler(...args);
        };
        row.handler = wrapped;
        emitter.once(event, wrapped);
        client.listeners.push(row);
    }
    _detach(client) {
        for (const row of client?.listeners || []) {
            try {
                row.emitter?.removeListener?.(row.event, row.handler);
            }
            catch (_error) { }
        }
        if (client)
            client.listeners = [];
    }
    addClient(input = {}) {
        const req = input.req;
        const res = input.res;
        if (!req || !res || res.destroyed || res.writableEnded)
            return null;
        if (Date.now() < this._pressureUntil) {
            this._stats.rejectedPressure += 1;
            return null;
        }
        while (this.clients.size >= this.maxClients) {
            let oldest = null;
            for (const candidate of this.clients) {
                if (!oldest || (candidate.connectedAt || 0) < (oldest.connectedAt || 0))
                    oldest = candidate;
            }
            if (!oldest)
                break;
            this._stats.closedClientLimit += 1;
            this.close(oldest, 'client-limit');
        }
        const now = Date.now();
        const client = {
            id: ++this._seq,
            req,
            res,
            internal: input.internal === true,
            authorize: typeof input.authorize === 'function' ? input.authorize : null,
            authorizationPending: false,
            connectedAt: now,
            lastWriteAt: now,
            lastSuccessfulWriteAt: now,
            backpressuredAt: 0,
            backpressureKind: '',
            needsResync: false,
            drainBound: false,
            closed: false,
            listeners: [],
        };
        const close = (reason) => () => this.close(client, reason);
        this._bind(client, req, 'close', close('request-close'));
        this._bind(client, req, 'aborted', close('request-aborted'));
        this._bind(client, req, 'error', close('request-error'));
        this._bind(client, res, 'close', close('response-close'));
        this._bind(client, res, 'finish', close('response-finish'));
        this._bind(client, res, 'error', close('response-error'));
        const socket = res.socket || req.socket;
        this._bind(client, socket, 'close', close('socket-close'));
        this._bind(client, socket, 'error', close('socket-error'));
        try {
            res?.setTimeout?.(0);
        }
        catch (_error) { }
        try {
            socket?.setKeepAlive?.(true, this.heartbeatMs);
        }
        catch (_error) { }
        try {
            socket?.setNoDelay?.(true);
        }
        catch (_error) { }
        this.clients.add(client);
        this._stats.accepted += 1;
        this._stats.maxObservedClients = Math.max(this._stats.maxObservedClients, this.clients.size);
        this._ensureHeartbeat();
        return client;
    }
    _bindDrain(client) {
        if (!client || client.drainBound || this._isDead(client))
            return;
        client.drainBound = true;
        const onDrain = () => {
            client.drainBound = false;
            if (this._isDead(client) || !this.clients.has(client))
                return;
            client.backpressuredAt = 0;
            client.backpressureKind = '';
            if (client.needsResync) {
                client.needsResync = false;
                this._resync(client);
            }
        };
        this._bind(client, client.res, 'drain', onDrain);
    }
    _resync(client) {
        if (!this.getSnapshotChunk || this._isDead(client))
            return;
        try {
            const chunk = this.getSnapshotChunk(client);
            if (!chunk)
                return;
            this._stats.resyncs += 1;
            this.write(client, chunk, { kind: 'resync' });
        }
        catch (error) {
            this._stats.writeErrors += 1;
            this._warnOnce('resync', `snapshot resync failed: ${error instanceof Error ? error.message : String(error)}`);
            this.close(client, 'resync-error');
        }
    }
    write(client, chunk, meta = {}) {
        if (!client || !this.clients.has(client) || this._isDead(client)) {
            if (client)
                this.close(client, 'dead-before-write');
            return false;
        }
        const now = Date.now();
        const text = typeof chunk === 'string' ? chunk : String(chunk ?? '');
        const bytes = Buffer.byteLength(text);
        if (bytes > this.maxFrameBytes) {
            this._warnOnce('frame-limit', `closing SSE client ${client.id}: frame ${bytes} bytes exceeds ${this.maxFrameBytes}`);
            this.close(client, 'frame-limit');
            return false;
        }
        // Each frame revalidates its current session. At most one bounded frame is
        // retained while authorization is pending; updates request a later resync.
        if (client.authorize && !meta.authorizationVerified) {
            if (client.authorizationPending) {
                if (meta.kind === 'update') {
                    client.needsResync = true;
                    this._stats.droppedUpdates += 1;
                }
                return false;
            }
            if (this._authorizationPending >= this.maxClients) {
                this.close(client, 'authorization-limit');
                return false;
            }
            this._authorizationPending++;
            client.authorizationPending = true;
            const timer = setTimeout(() => this.close(client, 'authorization-timeout'), 2000);
            Promise.resolve().then(() => client.authorize()).then(allowed => {
                clearTimeout(timer);
                client.authorizationPending = false;
                this._authorizationPending--;
                if (!this.clients.has(client) || client.closed)
                    return;
                if (!allowed) {
                    this.close(client, 'authorization-revoked');
                    return;
                }
                this.write(client, text, { ...meta, authorizationVerified: true });
            }, () => { clearTimeout(timer); client.authorizationPending = false; this._authorizationPending--; this.close(client, 'authorization-error'); });
            return false;
        }
        const writableBytes = this._writableBytes(client);
        if (writableBytes > this.maxBufferedBytes) {
            this._stats.closedBufferLimit += 1;
            this._warnOnce('buffer-limit', `closing SSE client ${client.id}: writable buffer ${writableBytes} bytes`);
            this.close(client, 'buffer-limit');
            return false;
        }
        if (client.backpressuredAt > 0) {
            if (meta.kind === 'update') {
                client.needsResync = true;
                this._stats.droppedUpdates += 1;
            }
            if (now - client.backpressuredAt >= this.backpressureTimeoutMs) {
                this._stats.closedBackpressure += 1;
                this._warnOnce('backpressure-timeout', `closing SSE client ${client.id}: backpressure for ${now - client.backpressuredAt} ms`);
                this.close(client, 'backpressure-timeout');
            }
            return false;
        }
        try {
            client.lastWriteAt = now;
            const accepted = client.res.write(text);
            if (accepted === false) {
                client.backpressuredAt = now;
                client.backpressureKind = String(meta.kind || 'unknown');
                client.needsResync = meta.kind === 'update' || client.needsResync;
                this._stats.backpressureEvents += 1;
                this._bindDrain(client);
                return false;
            }
            client.lastSuccessfulWriteAt = now;
            const bufferedAfter = this._writableBytes(client);
            if (bufferedAfter > this.maxBufferedBytes) {
                this._stats.closedBufferLimit += 1;
                this._warnOnce('buffer-limit-after-write', `closing SSE client ${client.id}: writable buffer ${bufferedAfter} bytes after write`);
                this.close(client, 'buffer-limit-after-write');
                return false;
            }
            return true;
        }
        catch (error) {
            this._stats.writeErrors += 1;
            this._warnOnce('write-error', `closing SSE client ${client.id}: ${error instanceof Error ? error.message : String(error)}`);
            this.close(client, 'write-error');
            return false;
        }
    }
    broadcast(input = {}) {
        const internalChunk = input.internalChunk || '';
        const publicChunk = input.publicChunk || '';
        for (const client of Array.from(this.clients)) {
            const chunk = client.internal ? internalChunk : publicChunk;
            if (!chunk)
                continue;
            this.write(client, chunk, { kind: 'update' });
        }
    }
    close(client, reason = 'closed') {
        if (!client || client.closed)
            return;
        client.closed = true;
        this.clients.delete(client);
        this._detach(client);
        this._stats.closed += 1;
        this._stats.lastCloseReason = String(reason || 'closed').slice(0, 120);
        this._stats.lastCloseAt = Date.now();
        try {
            client.res?.end?.();
        }
        catch (_error) { }
        try {
            const socket = client.res?.socket || client.req?.socket;
            if (socket && !socket.destroyed && /(?:backpressure|buffer|pressure|error|limit|unload)/.test(String(reason)))
                socket.destroy();
        }
        catch (_error) { }
        if (!this.clients.size)
            this._stopHeartbeat();
    }
    closeAll(reason = 'close-all') {
        for (const client of Array.from(this.clients))
            this.close(client, reason);
        this.clients.clear();
        this._stopHeartbeat();
    }
    mitigatePressure(level = 'pressure') {
        let closed = 0;
        const closeAll = level === 'critical';
        const now = Date.now();
        // EventSource reconnects automatically. Only a genuinely critical heap
        // situation needs a short global pause; normal pressure must not create a
        // 30-second data gap that makes an otherwise healthy plant look offline.
        if (closeAll) {
            this._pressureUntil = Math.max(this._pressureUntil, now + this.criticalReconnectCooldownMs);
        }
        for (const client of Array.from(this.clients)) {
            const writableBytes = this._writableBytes(client);
            const freshSnapshotBackpressure = client.backpressuredAt > 0
                && /^(?:init|resync)$/.test(String(client.backpressureKind || ''))
                && now - client.backpressuredAt < this.backpressureTimeoutMs;
            const blocked = client.backpressuredAt > 0 && !freshSnapshotBackpressure;
            const stronglyBuffered = writableBytes >= this.pressureBufferBytes;
            const unhealthy = blocked || stronglyBuffered;
            if (closeAll || unhealthy) {
                this.close(client, closeAll ? 'critical-memory-pressure' : 'memory-pressure');
                closed += 1;
            }
        }
        return closed;
    }
    _ensureHeartbeat() {
        if (this._heartbeatTimer || !this.clients.size)
            return;
        this._heartbeatTimer = setInterval(() => {
            const now = Date.now();
            for (const client of Array.from(this.clients)) {
                if (this._isDead(client)) {
                    this.close(client, 'heartbeat-dead');
                    continue;
                }
                if (client.backpressuredAt > 0) {
                    if (now - client.backpressuredAt >= this.backpressureTimeoutMs) {
                        this._stats.closedBackpressure += 1;
                        this.close(client, 'heartbeat-backpressure-timeout');
                    }
                    continue;
                }
                if (this._writableBytes(client) > this.maxBufferedBytes) {
                    this._stats.closedBufferLimit += 1;
                    this.close(client, 'heartbeat-buffer-limit');
                    continue;
                }
                if (client.needsResync) {
                    client.needsResync = false;
                    this._resync(client);
                }
                else if (now - client.lastWriteAt >= this.heartbeatMs) {
                    this.write(client, `: heartbeat ${now}\n\n`, { kind: 'heartbeat' });
                }
            }
        }, Math.max(1000, Math.min(5000, Math.round(this.heartbeatMs / 3))));
        this._heartbeatTimer.unref?.();
    }
    _stopHeartbeat() {
        if (this._heartbeatTimer)
            clearInterval(this._heartbeatTimer);
        this._heartbeatTimer = null;
    }
    getStats() {
        let backpressured = 0;
        let writableBytes = 0;
        let oldestClientAgeMs = 0;
        const now = Date.now();
        for (const client of this.clients) {
            if (client.backpressuredAt > 0)
                backpressured += 1;
            writableBytes += this._writableBytes(client);
            oldestClientAgeMs = Math.max(oldestClientAgeMs, now - (client.connectedAt || now));
        }
        return {
            clients: this.clients.size,
            backpressured,
            writableBytes,
            oldestClientAgeMs,
            maxClients: this.maxClients,
            maxBufferedBytes: this.maxBufferedBytes,
            pressureBufferBytes: this.pressureBufferBytes,
            criticalReconnectCooldownMs: this.criticalReconnectCooldownMs,
            pressureCooldownMs: Math.max(0, this._pressureUntil - now),
            ...this._stats,
        };
    }
}
module.exports = { SseRuntimeGuard };
