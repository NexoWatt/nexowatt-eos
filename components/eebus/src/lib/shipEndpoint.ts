import { createServer } from 'node:https';
import { AddressInfo } from 'node:net';
import { peerIdentity, matchesDiscoveredIdentity } from './shipSecurity';
import { EebusConfig } from './config';
import { DiscoveredShipNode, EebusIdentity, ShipConnectionState } from './eebusTypes';
import { safeId } from './sanitizer';
import {
    DecodedShipFrame,
    decodeShipFrame,
    encodeCmiFrame,
    encodeControlFrame,
    encodeDataFrame,
    encodeEndFrame,
    makeHello,
    makePinError,
    makePinInput,
    makePinState,
    makeProtocolHandshake,
} from './shipFrames';

const SHIP_WEBSOCKET_PROTOCOL = 'ship';
export const SHIP_SECURITY_LIMITS = Object.freeze({ handshakeMs: 5000, pairingMs: 120000,
    maxConnections: 64, maxPendingFrames: 32, maxPayloadBytes: 262144 });

type MessageCallback = (deviceId: string, message: unknown) => void | Promise<void>;
type NodeCallback = (node: DiscoveredShipNode) => void | Promise<void>;
type StateCallback = (deviceId: string, state: ShipConnectionState, role: 'client' | 'server', connected: boolean, error?: string) => void | Promise<void>;
type DataExchangeCallback = (deviceId: string) => void | Promise<void>;
type PairingRequestCallback = (deviceId: string, request: unknown) => void | Promise<void>;
type TrustCallback = (deviceId: string) => Promise<boolean>;
type PinState = 'required' | 'optional' | 'pinOk' | 'none';
type PinStateCallback = (deviceId: string, state: PinState) => void | Promise<void>;

interface ShipSession {
    deviceId: string;
    socket: any;
    role: 'client' | 'server';
    state: ShipConnectionState;
    node?: DiscoveredShipNode;
    remoteSki: string;
    remoteFingerprint: string;
    remoteAddress: string;
    protocolSelected: boolean;
    remoteHelloReady: boolean;
    localHelloReady: boolean;
    dataExchangeReady: boolean;
}

export class ShipEndpoint {
    private server: any;
    private wss: any;
    private bonjour: any;
    private advertisement: any;
    private sockets = new Map<string, any>();
    private sessions = new Map<string, ShipSession>();
    private pendingConnections = new Map<string, { socket: any; promise: Promise<boolean>; finish: (ok: boolean) => void }>();
    private registeringSockets = new Set<any>();
    private pairingTimers = new Map<any, any>();
    private preUpgradeTimers = new Map<any, any>();
    private transportSockets = new Set<any>();
    private droppedSockets = new WeakSet<object>();
    private stopping = false;

    public constructor(
        private readonly adapter: any,
        private readonly config: EebusConfig,
        private readonly identity: EebusIdentity,
        private readonly onMessage: MessageCallback,
        private readonly onNode: NodeCallback,
        private readonly onState: StateCallback,
        private readonly onDataExchange: DataExchangeCallback,
        private readonly onPairingRequest: PairingRequestCallback,
        private readonly isTrusted: TrustCallback,
        private readonly onPinState: PinStateCallback = async () => {},
    ) {}

    public async start(): Promise<boolean> {
        if (this.stopping) return false;
        if (!this.config.shipServerEnabled) {
            this.adapter.log.info('Local EOS/HEMS SHIP endpoint is disabled. Wallboxes cannot pair with EOS through EEBUS.');
            return false;
        }

        let WebSocketServer: any;
        try {
            ({ WebSocketServer } = require('ws'));
        } catch (error) {
            this.adapter.log.warn(`ws is not available. Local SHIP endpoint cannot start until dependencies are installed: ${String(error)}`);
            return false;
        }

        return new Promise(resolve => {
            try {
                this.server = createServer({
                    key: this.identity.privateKey,
                    cert: this.identity.certificate,
                    requestCert: true,
                    rejectUnauthorized: false,
                    minVersion: 'TLSv1.3',
                    handshakeTimeout: SHIP_SECURITY_LIMITS.handshakeMs,
                });

                this.server.maxConnections = SHIP_SECURITY_LIMITS.maxConnections;
                this.server.headersTimeout = SHIP_SECURITY_LIMITS.handshakeMs;
                this.server.requestTimeout = SHIP_SECURITY_LIMITS.handshakeMs;
                this.server.on('connection', (socket: any) => {
                    this.transportSockets.add(socket);
                    socket.once('close', () => this.transportSockets.delete(socket));
                });
                this.server.on('secureConnection', (socket: any) => {
                    // Bound a valid TLS peer that never completes the HTTP/WebSocket upgrade.
                    const timer = this.adapter.setTimeout(() => socket.destroy(), SHIP_SECURITY_LIMITS.handshakeMs);
                    timer?.unref?.(); this.preUpgradeTimers.set(socket, timer);
                    socket.once('close', () => this.clearUpgradeTimer(socket));
                });
                this.server.on('upgrade', (request: any) => this.clearUpgradeTimer(request.socket));

                this.wss = new WebSocketServer({
                    server: this.server,
                    path: this.config.shipPath,
                    perMessageDeflate: false,
                    maxPayload: SHIP_SECURITY_LIMITS.maxPayloadBytes,
                    handleProtocols: (protocols: any) => (protocols.has(SHIP_WEBSOCKET_PROTOCOL) ? SHIP_WEBSOCKET_PROTOCOL : false),
                });

                this.wss.on('connection', (socket: any, request: any) => {
                    void this.registerSocket(socket, request, 'server').catch(() => this.dropSocket(socket));
                });

                this.server.on('error', (error: Error) => {
                    this.adapter.log.warn(`Local EOS/HEMS SHIP endpoint could not listen on port ${this.config.shipPort}: ${error.message}`);
                    resolve(false);
                });

                this.server.listen(this.config.shipPort, () => {
                    const address = this.server.address() as AddressInfo;
                    this.adapter.log.info(`Local EOS/HEMS SHIP endpoint listening on port ${address.port}${this.config.shipPath}`);
                    this.publishMdnsIfEnabled(address.port);
                    resolve(true);
                });
            } catch (error) {
                this.adapter.log.warn(`Local EOS/HEMS SHIP endpoint could not start: ${String(error)}`);
                resolve(false);
            }
        });
    }

    public async connectToNode(node: DiscoveredShipNode): Promise<boolean> {
        if (this.stopping || !this.config.autoConnectEnabled || !node.host || !Number.isInteger(node.port)
            || node.port < 1 || node.port > 65535) return false;
        const ski = typeof node.ski === 'string' ? node.ski.replace(/:/g, '').toUpperCase() : '';
        if (!/^[A-F0-9]{40}$/.test(ski) || ski === this.identity.localSki || node.id === this.identity.shipId) return false;
        const key = safeId(ski);
        if (this.sessions.has(key)) return true;
        const existing = this.pendingConnections.get(key);
        if (existing) return existing.promise;
        if (this.connectionCount() >= SHIP_SECURITY_LIMITS.maxConnections) return false;
        const requestPath = node.path || '/ship/';
        if (typeof node.host !== 'string' || node.host.length > 253 || /[\s\/@?#]/.test(node.host)
            || typeof requestPath !== 'string' || !requestPath.startsWith('/') || requestPath.length > 256
            || /[\s?#\\]/.test(requestPath)) return false;
        let WebSocket: any;
        try { WebSocket = require('ws'); } catch { return false; }

        let resolveResult: (value: boolean) => void;
        const promise = new Promise<boolean>(resolve => { resolveResult = resolve; });
        let settled = false;
        let handshakeTimer: any;
        const pending = { socket: null as any, promise, finish: (ok: boolean) => {
            if (settled) return;
            settled = true;
            if (handshakeTimer !== undefined) this.adapter.clearTimeout(handshakeTimer);
            if (this.pendingConnections.get(key) === pending) this.pendingConnections.delete(key);
            if (!ok && pending.socket) this.dropSocket(pending.socket);
            resolveResult(ok);
        } };
        // Reserve before any await/callback, so repeated discovery cannot multiply connections.
        this.pendingConnections.set(key, pending);
        handshakeTimer = this.adapter.setTimeout(() => pending.finish(false), SHIP_SECURITY_LIMITS.handshakeMs);
        try {
            const url = `wss://${addressForUrl(node.host)}:${node.port}${requestPath}`;
            const socket = new WebSocket(url, SHIP_WEBSOCKET_PROTOCOL, {
                rejectUnauthorized: false, cert: this.identity.certificate, key: this.identity.privateKey,
                minVersion: 'TLSv1.3', perMessageDeflate: false, maxPayload: SHIP_SECURITY_LIMITS.maxPayloadBytes,
                handshakeTimeout: SHIP_SECURITY_LIMITS.handshakeMs,
            });
            pending.socket = socket;
            // Error handling exists before callbacks or asynchronous registration can yield.
            socket.on('error', () => pending.finish(false));
            socket.once('close', () => { this.clearPairingTimeout(socket); pending.finish(false); });
            this.armPairingTimeout(socket);
            socket.once('open', () => {
                if (settled || this.stopping || !this.isSocketOpen(socket)) { this.dropSocket(socket); return; }
                try {
                    const peer = peerIdentity(socket._socket);
                    if (!matchesDiscoveredIdentity(peer, node)) throw new Error('SHIP_IDENTITY_MISMATCH');
                    // Replace the reserved pending slot atomically with the established session.
                    this.pendingConnections.delete(key);
                    const session: ShipSession = { deviceId: safeId(peer.ski), socket, role: 'client', state: 'tls-connected',
                        node, remoteSki: peer.ski, remoteFingerprint: peer.fingerprint, remoteAddress: `${node.host}:${node.port}`,
                        protocolSelected: false, remoteHelloReady: false, localHelloReady: false, dataExchangeReady: false };
                    this.attachSession(session);
                    this.sendFrame(session, encodeCmiFrame());
                    void this.setSessionState(session, 'tls-connected', true).catch(() => this.dropSocket(socket));
                    pending.finish(true);
                } catch { pending.finish(false); }
            });
            Promise.resolve(this.onState(key, 'connecting', 'client', false)).catch(() => pending.finish(false));
        } catch { pending.finish(false); }
        return promise;
    }

    public send(deviceId: string, payload: unknown): boolean {
        return this.sendSpine(deviceId, payload);
    }

    public sendSpine(deviceId: string, payload: unknown): boolean {
        const session = this.sessions.get(deviceId);
        if (!session || !this.isSocketOpen(session.socket) || !session.dataExchangeReady) {
            return false;
        }

        this.sendFrame(session, encodeDataFrame(payload));
        return true;
    }

    public disconnect(deviceId: string): boolean {
        const session = this.sessions.get(deviceId);
        if (!session) return false;
        session.dataExchangeReady = false;
        session.localHelloReady = false;
        try {
            if (this.isSocketOpen(session.socket)) this.sendFrame(session, encodeEndFrame('unspecific'));
            session.socket.close?.();
            return true;
        } catch (error) {
            this.adapter.log.debug(`Could not disconnect ${deviceId}: ${String(error)}`);
            return false;
        }
    }

    public async approveDevice(deviceId: string): Promise<void> {
        const session = this.sessions.get(deviceId);
        if (!session) return;
        await this.sendHelloForTrust(session);
    }

    public rejectDevice(deviceId: string): void {
        const session = this.sessions.get(deviceId);
        if (!session) return;
        this.sendFrame(session, encodeControlFrame(makeHello('aborted')));
        this.disconnect(deviceId);
    }

    public async stop(): Promise<void> {
        this.stopping = true;
        for (const pending of [...this.pendingConnections.values()]) pending.finish(false);
        for (const socket of [...this.registeringSockets]) this.dropSocket(socket);
        for (const session of [...this.sessions.values()]) this.dropSocket(session.socket);
        for (const socket of [...this.pairingTimers.keys()]) this.clearPairingTimeout(socket);
        for (const socket of [...this.preUpgradeTimers.keys()]) this.clearUpgradeTimer(socket);
        for (const socket of [...this.transportSockets]) socket.destroy();
        this.transportSockets.clear(); this.pendingConnections.clear(); this.registeringSockets.clear();
        this.sessions.clear(); this.sockets.clear();

        try {
            this.advertisement?.stop?.();
        } catch (error) {
            this.adapter.log.debug(`Could not stop SHIP mDNS advertisement: ${String(error)}`);
        }

        try {
            this.bonjour?.destroy?.();
        } catch (error) {
            this.adapter.log.debug(`Could not destroy SHIP mDNS advertiser: ${String(error)}`);
        }

        if (this.wss) {
            await new Promise<void>(resolve => this.wss.close(() => resolve()));
            this.wss = undefined;
        }

        if (this.server) {
            await new Promise<void>(resolve => this.server.close(() => resolve()));
            this.server = undefined;
        }
    }

    private async registerSocket(socket: any, request: any, role: 'server'): Promise<void> {
        // A malformed frame can emit 'error' while onNode awaits the object DB.
        // Never leave an EventEmitter error unhandled in that interval.
        const provisionalError = () => this.dropSocket(socket);
        socket.on('error', provisionalError);
        socket.once('close', () => { this.registeringSockets.delete(socket); this.clearPairingTimeout(socket); });
        if (this.stopping || this.connectionCount() >= SHIP_SECURITY_LIMITS.maxConnections) { this.dropSocket(socket); return; }
        this.registeringSockets.add(socket);
        this.armPairingTimeout(socket);
        let attached = false;
        try {
        const peer = peerIdentity(request.socket);
        const safe = safeId(peer.ski || peer.fingerprint || peer.remoteAddress || 'incoming');
        const node: DiscoveredShipNode = {
            id: peer.ski || peer.fingerprint || peer.remoteAddress || safe,
            safeId: safe,
            name: `EEBUS ${safe.slice(0, 12)}`,
            host: peer.remoteAddress,
            port: 0,
            path: this.config.shipPath,
            ski: peer.ski,
            brand: '',
            type: '',
            model: '',
            serial: '',
            categories: [],
            register: true,
            ecc: false,
            txt: {},
            serviceType: 'incoming',
            lastSeen: new Date().toISOString(),
            fingerprint: peer.fingerprint,
        };

        if (this.sessions.has(safe) || this.pendingConnections.has(safe)) { this.dropSocket(socket); return; }
        await this.onNode(node);
        if (this.stopping || !this.registeringSockets.has(socket) || !this.isSocketOpen(socket)) { this.dropSocket(socket); return; }
        this.registeringSockets.delete(socket);

        const session: ShipSession = {
            deviceId: safe,
            socket,
            role,
            state: 'tls-connected',
            node,
            remoteSki: peer.ski,
            remoteFingerprint: peer.fingerprint,
            remoteAddress: peer.remoteAddress,
            protocolSelected: false,
            remoteHelloReady: false,
            localHelloReady: false,
            dataExchangeReady: false,
        };
        this.attachSession(session);
        attached = true;
        socket.removeListener('error', provisionalError);
        await this.setSessionState(session, 'tls-connected', true);
        } catch (error) { this.dropSocket(socket); throw error; }
        finally { if (!attached) this.registeringSockets.delete(socket); }
    }

    private attachSession(session: ShipSession): void {
        // A second socket may not steal an existing trusted session or its close handler.
        if (this.stopping || this.connectionCount() >= SHIP_SECURITY_LIMITS.maxConnections || this.sessions.has(session.deviceId)) {
            session.socket.close(1008, 'SHIP duplicate session');
            throw new Error('SHIP_DUPLICATE_SESSION');
        }
        this.sessions.set(session.deviceId, session);
        if (!session.dataExchangeReady) this.armPairingTimeout(session.socket);
        this.sockets.set(session.deviceId, session.socket);
        if (session.remoteSki) this.sockets.set(safeId(session.remoteSki), session.socket);
        if (session.remoteFingerprint) this.sockets.set(safeId(session.remoteFingerprint), session.socket);

        // Serialize frames: asynchronous trust checks must not reorder protocol transitions.
        let pending = Promise.resolve();
        let queued = 0;
        session.socket.on('message', (data: any) => {
            if (++queued > SHIP_SECURITY_LIMITS.maxPendingFrames) {
                queued--;
                session.socket.close(1008, 'SHIP input limit');
                return;
            }
            pending = pending.then(() => this.handleFrame(session, decodeShipFrame(data)))
                .catch(() => { session.dataExchangeReady = false; session.socket.close(1008, 'SHIP frame rejected'); })
                .finally(() => { queued--; });
        });
        session.socket.on('close', () => {
            session.dataExchangeReady = false;
            this.clearPairingTimeout(session.socket);
            // Delayed events from a retired transport must not remove a newer
            // session or publish a stale disconnected state for the same peer.
            const current = this.sessions.get(session.deviceId);
            if (current === session) this.sessions.delete(session.deviceId);
            for (const [key, value] of this.sockets) if (value === session.socket) this.sockets.delete(key);
            if (!current || current === session) void this.setSessionState(session, 'closed', false).catch(() => {});
            this.adapter.log.info(`SHIP WebSocket disconnected from ${session.deviceId}`);
        });
        session.socket.on('error', (error: Error) => {
            const current = this.sessions.get(session.deviceId);
            this.dropSocket(session.socket);
            if (!current || current === session) void this.setSessionState(session, 'error', false, 'SHIP_SOCKET_ERROR').catch(() => {});
            this.adapter.log.warn(`SHIP WebSocket error from ${session.deviceId}: ${error.message}`);
        });

        this.adapter.log.info(`SHIP WebSocket ${session.role} connected with ${session.deviceId}`);
    }

    private async handleFrame(session: ShipSession, frame: DecodedShipFrame): Promise<void> {
        if (!this.isSocketOpen(session.socket)) return;
        // Raw unauthenticated frames must not reach state/CLS handlers either.
        if (frame.type === 'data') {
            if (!session.dataExchangeReady || !session.localHelloReady || !session.remoteHelloReady
                || !session.protocolSelected || !await this.isTrusted(session.deviceId)) {
                session.dataExchangeReady = false;
                session.socket.close(1008, 'SHIP data before trust');
                return;
            }
            await this.onMessage(session.deviceId, frame.value);
            return;
        }

        if (frame.type === 'init') {
            if (session.role === 'server') this.sendFrame(session, encodeCmiFrame());
            await this.setSessionState(session, 'cmi-ok', true);
            await this.sendHelloForTrust(session);
            return;
        }

        if (frame.type === 'control' || frame.type === 'json') {
            await this.handleControl(session, frame.value);
            return;
        }

        if (frame.type === 'end') {
            this.disconnect(session.deviceId);
        }
    }

    private async handleControl(session: ShipSession, value: unknown): Promise<void> {
        if (!this.isSocketOpen(session.socket)) return;
        const rec = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
        const keys = Object.keys(rec);
        const types = ['connectionHello', 'messageProtocolHandshake', 'connectionPinState', 'connectionPinInput', 'connectionPinError'];
        if (keys.length !== 1 || !types.includes(keys[0]) || !rec[keys[0]] || typeof rec[keys[0]] !== 'object' || Array.isArray(rec[keys[0]])) {
            session.dataExchangeReady = false;
            session.socket.close(1008, 'SHIP unsupported control');
            return;
        }
        if (keys[0].startsWith('connectionPin') && (!session.localHelloReady || !session.remoteHelloReady
            || !session.protocolSelected || !await this.isTrusted(session.deviceId))) {
            session.dataExchangeReady = false;
            session.socket.close(1008, 'SHIP PIN before trusted protocol');
            return;
        }

        if (rec.connectionHello) {
            const phase = rec.connectionHello.phase;
            if (!['pending', 'ready', 'aborted'].includes(phase)) {
                session.dataExchangeReady = false; session.socket.close(1008, 'SHIP invalid hello'); return;
            }
            session.remoteHelloReady = phase === 'ready';
            if (phase !== 'ready') { session.dataExchangeReady = false; session.protocolSelected = false; }
            await this.setSessionState(session, phase === 'ready' ? 'hello-ready' : 'hello-pending', true);
            if (phase !== 'ready') await this.onPairingRequest(session.deviceId, { remoteHello: rec.connectionHello, deviceId: session.deviceId });
            if (!session.localHelloReady) await this.sendHelloForTrust(session);
            if (session.remoteHelloReady && session.localHelloReady) await this.startProtocolHandshake(session);
            return;
        }

        if (rec.messageProtocolHandshake) {
            if (!session.localHelloReady || !session.remoteHelloReady || !await this.isTrusted(session.deviceId)) {
                session.socket.close(1008, 'SHIP handshake before trust');
                return;
            }
            const handshakeType = String(rec.messageProtocolHandshake.handshakeType || '');
            if (session.role === 'server' && handshakeType === 'announceMax') {
                this.sendFrame(session, encodeControlFrame(makeProtocolHandshake('select')));
                return;
            }
            if (session.role === 'client' && handshakeType === 'select') {
                this.sendFrame(session, encodeControlFrame(rec));
                await this.protocolHandshakeOk(session);
                return;
            }
            if (session.role === 'server' && handshakeType === 'select') {
                await this.protocolHandshakeOk(session);
                return;
            }
        }

        if (rec.connectionPinState) {
            const pinState = rec.connectionPinState.pinState;
            if (!['required', 'optional', 'pinOk', 'none'].includes(pinState)
                || Object.keys(rec.connectionPinState).some(key => !['pinState', 'inputPermission'].includes(key))
                || (rec.connectionPinState.inputPermission !== undefined && !['busy', 'ok'].includes(rec.connectionPinState.inputPermission))) {
                session.socket.close(1008, 'SHIP invalid PIN state'); return;
            }
            // Typed diagnostics are separate from the recursively parsed SPINE/CLS input.
            await this.onPinState(session.deviceId, pinState);
            if (pinState === 'required') {
                await this.setSessionState(session, 'pin-required', true);
                if (this.config.pairingPin) {
                    this.sendFrame(session, encodeControlFrame(makePinInput(this.config.pairingPin)));
                }
                return;
            }
            if (pinState === 'optional' && this.config.pairingPin && rec.connectionPinState.inputPermission === 'ok') {
                this.sendFrame(session, encodeControlFrame(makePinInput(this.config.pairingPin)));
                return;
            }
            if (pinState === 'pinOk' || pinState === 'none' || pinState === 'optional') {
                await this.enterDataExchange(session);
                return;
            }
        }

        if (rec.connectionPinInput) {
            const pin = rec.connectionPinInput.pin;
            if (typeof pin !== 'string' || pin.length > 64 || Object.keys(rec.connectionPinInput).some(key => key !== 'pin')) {
                session.socket.close(1008, 'SHIP invalid PIN input'); return;
            }
            if (!this.config.pairingPin || pin === this.config.pairingPin) {
                this.sendFrame(session, encodeControlFrame(makePinState('pinOk')));
                await this.enterDataExchange(session);
            } else {
                this.sendFrame(session, encodeControlFrame(makePinError(1)));
            }
            return;
        }

        if (rec.connectionPinError) {
            await this.setSessionState(session, 'error', true, 'SHIP remote PIN error');
            return;
        }

        // The control channel must never become a fallback transport for SPINE.
        session.dataExchangeReady = false;
        session.socket.close(1008, 'SHIP unsupported control transition');
    }

    private async sendHelloForTrust(session: ShipSession): Promise<void> {
        const trusted = await this.isTrusted(session.deviceId);
        if (trusted) {
            session.localHelloReady = true;
            this.sendFrame(session, encodeControlFrame(makeHello('ready')));
            await this.setSessionState(session, 'hello-ready', true);
            if (session.remoteHelloReady) await this.startProtocolHandshake(session);
        } else {
            this.sendFrame(session, encodeControlFrame(makeHello('pending', 120000)));
            await this.setSessionState(session, 'hello-pending', true);
            await this.onPairingRequest(session.deviceId, {
                deviceId: session.deviceId,
                remoteSki: session.remoteSki,
                remoteFingerprint: session.remoteFingerprint,
                message: 'Set devices.<id>.pairing.trusted=true or press approve to continue SHIP hello.',
            });
        }
    }

    private async startProtocolHandshake(session: ShipSession): Promise<void> {
        if (session.protocolSelected) return;
        if (session.role === 'client') {
            this.sendFrame(session, encodeControlFrame(makeProtocolHandshake('announceMax')));
        }
        // The server waits for the client's announceMax according to the SHIP protocol.
    }

    private async protocolHandshakeOk(session: ShipSession): Promise<void> {
        session.protocolSelected = true;
        await this.setSessionState(session, 'protocol-handshake-ok', true);
        this.sendFrame(session, encodeControlFrame(makePinState(this.config.pairingPin ? 'optional' : 'none', this.config.pairingPin ? 'ok' : undefined)));
        if (!this.config.pairingPin) await this.enterDataExchange(session);
    }

    private async enterDataExchange(session: ShipSession): Promise<void> {
        if (session.dataExchangeReady) return;
        if (!session.localHelloReady || !session.remoteHelloReady || !session.protocolSelected
            || !await this.isTrusted(session.deviceId)) {
            session.socket.close(1008, 'SHIP incomplete trusted handshake');
            return;
        }
        if (this.stopping || !this.isSocketOpen(session.socket)) return;
        session.dataExchangeReady = true;
        this.clearPairingTimeout(session.socket);
        await this.setSessionState(session, 'data-exchange', true);
        await this.onDataExchange(session.deviceId);
    }

    private async setSessionState(session: ShipSession, state: ShipConnectionState, connected: boolean, error = ''): Promise<void> {
        session.state = state;
        await this.onState(session.deviceId, state, session.role, connected, error);
    }

    private sendFrame(session: ShipSession, frame: any): void {
        if (!this.isSocketOpen(session.socket)) return;
        session.socket.send(frame);
    }

    private connectionCount(): number {
        return this.sessions.size + this.pendingConnections.size + this.registeringSockets.size;
    }

    private clearUpgradeTimer(socket: any): void {
        const timer = this.preUpgradeTimers.get(socket);
        if (timer !== undefined) this.adapter.clearTimeout(timer);
        this.preUpgradeTimers.delete(socket);
    }

    private armPairingTimeout(socket: any): void {
        if (this.pairingTimers.has(socket) || this.stopping) return;
        const timer = this.adapter.setTimeout(() => this.dropSocket(socket), SHIP_SECURITY_LIMITS.pairingMs);
        timer?.unref?.(); this.pairingTimers.set(socket, timer);
    }

    private clearPairingTimeout(socket: any): void {
        const timer = this.pairingTimers.get(socket);
        if (timer !== undefined) this.adapter.clearTimeout(timer);
        this.pairingTimers.delete(socket);
    }

    private dropSocket(socket: any): void {
        if (!socket || this.droppedSockets.has(socket)) return;
        this.droppedSockets.add(socket);
        this.clearPairingTimeout(socket); this.registeringSockets.delete(socket);
        for (const pending of [...this.pendingConnections.values()]) if (pending.socket === socket) pending.finish(false);
        for (const [key, session] of this.sessions) if (session.socket === socket) {
            session.dataExchangeReady = false; session.localHelloReady = false;
            this.sessions.delete(key);
        }
        for (const [key, value] of this.sockets) if (value === socket) this.sockets.delete(key);
        try { if (typeof socket.terminate === 'function') socket.terminate(); else socket.close?.(1008, 'SHIP connection rejected'); }
        catch { /* Dropped sessions can never regain permission even if transport cleanup fails. */ }
    }

    private isSocketOpen(socket: any): boolean {
        return socket && socket.readyState === 1;
    }

    private publishMdnsIfEnabled(port: number): void {
        if (!this.config.announceShipService) {
            this.adapter.log.warn('Local EOS/HEMS SHIP mDNS announcement is disabled. Remote EEBUS wallboxes cannot discover EOS automatically.');
            return;
        }

        try {
            const { Bonjour } = require('bonjour-service');
            this.bonjour = new Bonjour();
            this.advertisement = this.bonjour.publish({
                name: this.config.serviceName,
                type: 'ship',
                protocol: 'tcp',
                port,
                txt: {
                    txtvers: '1',
                    id: this.identity.shipId,
                    path: this.config.shipPath,
                    ski: this.identity.localSki,
                    register: 'true',
                    ecc: 'false',
                    brand: this.config.brand,
                    type: this.config.deviceType,
                    model: this.config.model,
                    serial: this.identity.shipId.slice(-32),
                    cat: this.config.deviceCategories.join(','),
                },
            });

            this.adapter.log.info(
                `Local EOS/HEMS SHIP service announced as "${this.config.serviceName}" via _ship._tcp ` +
                    `(brand=${this.config.brand}, model=${this.config.model}, type=${this.config.deviceType}, ski=${this.identity.localSki}).`,
            );
        } catch (error) {
            this.adapter.log.warn(`Could not announce local EOS/HEMS SHIP service via mDNS: ${String(error)}`);
        }
    }
}

function addressForUrl(host: string): string {
    return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}
