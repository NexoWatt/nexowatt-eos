'use strict';
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { rootOwned, checkInstalled } = require('../release/installed-check.cjs');
const { readFileLimited } = require('../release/bundle.cjs');
const { atomicWrite } = require('../../tools/system/activate-release.cjs');
const channel = require('./channel.cjs');
const transport = require('./transport.cjs');
const nodePolicy = require('./node-policy.cjs');
const automaticNode = require('./automatic-node.cjs');
const DIRECTORY = '/var/lib/nexowatt-eos-updates';
const SOCKET = '/run/nexowatt-eos-updates/control.sock';
const TRUST = '/etc/nexowatt-eos/update-trust.pem';
const STATE = '/etc/nexowatt-eos/release-state.json';
const BUSY = new Set(['CHECKING', 'QUEUED', 'DOWNLOADING', 'VERIFYING', 'INSTALLING']);
const code = error => /^UPDATE_[A-Z_]{1,70}$/.test(error?.code || '') ? error.code : 'UPDATE_FAILED';
const load = (file, max = 65536) => { rootOwned(file); return readFileLimited(file, max).bytes; };
const readState = () => JSON.parse(load(STATE));
function validRequest(request) {
    return request?.operation === 'install'
        ? channel.exact(request, ['operation', 'releaseId', 'maintenanceConfirmed']) && channel.hash(request.releaseId) && request.maintenanceConfirmed === true
        : channel.exact(request, ['operation']) && ['status', 'check'].includes(request.operation);
}
class Manager {
    constructor({ directory = DIRECTORY, trust = () => load(TRUST, 16384), state = readState,
        fetchFeed = () => transport.request(channel.FEED_URL), launch, readResult = load, now = Date.now,
        runningNodeVersion = process.versions.node, restartAfterRuntimeChange = () => {} } = {}) {
        Object.assign(this, { directory, trust, state, fetchFeed, launch, readResult, now, runningNodeVersion, restartAfterRuntimeChange });
        this.status = { phase: 'IDLE', candidate: null, checkedAt: null, error: null, operationId: null };
        this.envelope = null; this.pending = false; this.lastCheck = 0;
        this.automatic = automaticNode.initialRecord();
    }
    restore() {
        const automaticFile = path.join(this.directory, 'automatic-node.json');
        if (fs.existsSync(automaticFile)) this.automatic = automaticNode.validateRecord(JSON.parse(this.readResult(automaticFile, 8192)));
        const file = path.join(this.directory, 'status.json');
        if (fs.existsSync(file)) {
            this.status = JSON.parse(this.readResult(file));
            if (this.status.phase === 'CHECKING' && this.status.operationId === null) {
                // Interrupted network checks never acquired activation gates or
                // launched a worker; retain the daily attempt without inventing
                // a host recovery requirement.
                this.status.phase = 'FAILED'; this.status.error = 'UPDATE_INTERRUPTED';
            }
            if (BUSY.has(this.status.phase) && this.status.operationId) {
                // The worker result is durable before its exit. A service restart
                // in the tiny gap before the manager callback must retain it.
                try { this.refreshWorker(); } catch { /* retain fail-closed recovery */ }
            }
            if (BUSY.has(this.status.phase)) this.status = { phase: 'RECOVERY_REQUIRED', candidate: null,
                checkedAt: null, error: 'UPDATE_INTERRUPTED', operationId: this.status.operationId };
            // Never reuse an on-disk candidate as installation authority.
            this.status.candidate = null; this.persist();
        }
        if (this.automatic.state === 'CHECKING') this.automaticResult(this.status.phase === 'RECOVERY_REQUIRED' ? 'RECOVERY_REQUIRED' : 'FAILED', 'UPDATE_INTERRUPTED');
        if (this.automatic.state === 'QUEUED') this.automaticFinished();
    }
    persist() { atomicWrite(path.join(this.directory, 'status.json'), JSON.stringify(this.status) + '\n'); }
    persistAutomatic() { automaticNode.validateRecord(this.automatic); atomicWrite(path.join(this.directory, 'automatic-node.json'), JSON.stringify(this.automatic) + '\n'); }
    automaticResult(state, reason = null) { this.automatic = { ...this.automatic, state, reason }; this.persistAutomatic(); }
    automaticFinished() {
        const phase = this.status.phase;
        const state = phase === 'SUCCEEDED' ? 'SUCCEEDED' : phase === 'RECOVERY_REQUIRED' || BUSY.has(phase) ? 'RECOVERY_REQUIRED'
            : ['REPAIR_MAINTENANCE_IN_PROGRESS', 'UPDATE_AUTOMATIC_WINDOW'].includes(this.status.error) ? 'DEFERRED' : 'FAILED';
        const reason = /^(?:UPDATE|REPAIR)_[A-Z_]{1,70}$/.test(this.status.error || '') ? this.status.error : null;
        this.automaticResult(state, reason);
    }
    view() {
        return { ok: true, installed: this.state(), ...this.status, busy: this.pending || BUSY.has(this.status.phase), automaticNode: automaticNode.view(this.automatic) };
    }
    refreshWorker() {
        if (!this.status.operationId) return;
        const file = path.join(this.directory, 'jobs', this.status.operationId, 'result.json');
        if (!fs.existsSync(file)) return;
        const result = JSON.parse(this.readResult(file, 8192));
        if (result.operationId !== this.status.operationId || !['DOWNLOADING', 'VERIFYING', 'INSTALLING', 'SUCCEEDED', 'ROLLED_BACK', 'FAILED', 'RECOVERY_REQUIRED'].includes(result.phase)) channel.fail('UPDATE_JOB');
        this.status = { ...this.status, phase: result.phase, error: result.error,
            downloadedBytes: result.downloadedBytes || 0, totalBytes: result.totalBytes || 0 };
    }
    dispatch(request) {
        if (!validRequest(request)) channel.fail('UPDATE_REQUEST');
        if (request.operation === 'status') { this.refreshWorker(); return this.view(); }
        if (this.pending || BUSY.has(this.status.phase)) channel.fail('UPDATE_BUSY');
        if (this.status.phase === 'RECOVERY_REQUIRED') channel.fail('UPDATE_RECOVERY_REQUIRED');
        if (request.operation === 'check') {
            if (this.now() - this.lastCheck < 30000) channel.fail('UPDATE_RATE_LIMIT');
            this.lastCheck = this.now(); this.pending = true;
            this.status = { phase: 'CHECKING', candidate: null, checkedAt: null, error: null, operationId: null };
            this.envelope = null; this.persist();
            this.checkPromise = Promise.resolve().then(() => this.fetchFeed()).then(bytes => {
                const feed = channel.verifyFeed(bytes, this.trust(), { now: this.now() });
                const candidate = channel.selectRelease(feed, this.state());
                this.envelope = bytes;
                this.status = { ...this.status, phase: candidate ? 'AVAILABLE' : 'UP_TO_DATE', candidate,
                    checkedAt: new Date(this.now()).toISOString() };
            }).catch(error => { this.status = { ...this.status, phase: 'FAILED', candidate: null, error: code(error) }; })
                .finally(() => { this.pending = false; this.persist(); });
            return this.view();
        }
        if (!this.envelope) channel.fail('UPDATE_CHECK_REQUIRED');
        const candidate = channel.selectRelease(channel.verifyFeed(this.envelope, this.trust(), { now: this.now() }), this.state());
        if (!candidate || candidate.releaseId !== request.releaseId) channel.fail('UPDATE_CANDIDATE_CHANGED');
        return this.queue(candidate, 'manual');
    }
    // Called only by the installed scheduler. No socket request can select this
    // mode, supply an URL, bypass the window or invent operator confirmation.
    async tickAutomatic() {
        const window = automaticNode.windowAt(this.now());
        if (!window.open || this.automatic.lastAttemptDate !== null && window.date <= this.automatic.lastAttemptDate
            || this.pending || BUSY.has(this.status.phase) || this.status.phase === 'RECOVERY_REQUIRED') return false;
        // Persist before network/effects: daemon restart and the repeated DST
        // hour cannot create additional same-day installation attempts.
        this.automatic = { schemaVersion: 1, lastAttemptDate: window.date, lastAttempt: new Date(this.now()).toISOString(), state: 'CHECKING', reason: null };
        this.persistAutomatic();
        this.pending = true; this.envelope = null;
        this.status = { phase: 'CHECKING', candidate: null, checkedAt: null, error: null, operationId: null }; this.persist();
        try {
            const bytes = await this.fetchFeed();
            const feed = channel.verifyFeed(bytes, this.trust(), { now: this.now() });
            const state = this.state();
            const candidate = channel.selectRelease(feed, state, { automaticNodeUpdate: true });
            this.envelope = bytes;
            this.status = { ...this.status, phase: 'UP_TO_DATE', candidate: null, checkedAt: new Date(this.now()).toISOString() };
            if (!candidate) {
                const manual = channel.selectRelease(feed, state);
                this.status = { ...this.status, phase: manual ? 'AVAILABLE' : 'UP_TO_DATE', candidate: manual };
                this.automaticResult(manual ? 'MANUAL_RELEASE' : 'NO_UPDATE');
            } else if (!automaticNode.windowAt(this.now()).open || automaticNode.windowAt(this.now()).date !== window.date) {
                this.status = { ...this.status, phase: 'AVAILABLE', candidate };
                this.automaticResult('DEFERRED', 'UPDATE_AUTOMATIC_WINDOW');
            } else {
                this.pending = false;
                this.status.candidate = candidate;
                this.queue(candidate, 'automatic-node');
                return true;
            }
        } catch (error) {
            this.status = { ...this.status, phase: 'FAILED', candidate: null, error: code(error) };
            this.automaticResult('FAILED', code(error));
        }
        this.pending = false; this.persist(); return false;
    }
    queue(candidate, mode) {
        if (fs.readdirSync(path.join(this.directory, 'jobs')).length >= 5) channel.fail('UPDATE_STAGING_FULL');
        const operationId = crypto.randomUUID(), job = path.join(this.directory, 'jobs', operationId);
        fs.mkdirSync(job, { mode: 0o700 });
        fs.writeFileSync(path.join(job, 'feed.json'), this.envelope, { mode: 0o600, flag: 'wx' });
        fs.writeFileSync(path.join(job, 'request.json'), JSON.stringify({ operationId, releaseId: candidate.releaseId, mode }), { mode: 0o600, flag: 'wx' });
        this.status = { ...this.status, phase: 'QUEUED', operationId, error: null }; this.persist();
        if (mode === 'automatic-node') this.automaticResult('QUEUED');
        this.pending = true;
        try { this.launch(operationId, () => {
            this.pending = false;
            try { this.refreshWorker(); } catch { this.status.phase = 'RECOVERY_REQUIRED'; this.status.error = 'UPDATE_JOB'; }
            if (BUSY.has(this.status.phase)) { this.status.phase = 'RECOVERY_REQUIRED'; this.status.error = 'UPDATE_INTERRUPTED'; }
            this.persist();
            if (mode === 'automatic-node') this.automaticFinished();
            // Terminal success, pretrial failure and proven active rollback are
            // represented by durable status/evidence. Repeated harmless lock
            // contention must not fill staging; uncertain recovery is retained.
            if (['SUCCEEDED', 'FAILED', 'ROLLED_BACK'].includes(this.status.phase)) {
                try { fs.rmSync(job, { recursive: true }); } catch { /* bounded, explicitly visible staging quota */ }
            }
            // A result write can fail after activation has already committed.
            // The installed pair, not only the last job label, decides whether
            // this daemon must retire its old interpreter. Recovery status and
            // durable gates survive this restart; main verifies the pair first.
            if (this.state().nodeVersion !== this.runningNodeVersion) this.restartAfterRuntimeChange();
        }); } catch { this.pending = false; this.status.phase = 'FAILED'; this.status.error = 'UPDATE_START_FAILED'; this.persist();
            if (mode === 'automatic-node') this.automaticFinished(); }
        return this.view();
    }
}
function serve(manager, { socketPath = SOCKET, gid } = {}) {
    rootOwned(path.dirname(socketPath));
    if (fs.existsSync(socketPath)) {
        const stat = fs.lstatSync(socketPath);
        if (!stat.isSocket() || stat.uid !== 0) channel.fail('UPDATE_SOCKET');
        fs.unlinkSync(socketPath);
    }
    let connections = 0;
    const server = net.createServer({ allowHalfOpen: true }, socket => {
        if (++connections > 8) { socket.destroy(); connections--; return; }
        const timer = setTimeout(() => socket.destroy(), 2000); let bytes = 0, chunks = [], done = false;
        socket.once('close', () => { clearTimeout(timer); connections--; });
        socket.on('error', () => {});
        socket.on('data', chunk => { bytes += chunk.length; if (bytes > 1024) socket.destroy(); else chunks.push(chunk); });
        socket.once('end', () => {
            if (done || socket.destroyed) return; done = true;
            let result;
            try {
                const text = Buffer.concat(chunks).toString('utf8');
                if (!text.endsWith('\n') || text.slice(0, -1).includes('\n')) channel.fail('UPDATE_REQUEST');
                result = manager.dispatch(JSON.parse(text));
            } catch (error) { result = { ok: false, error: code(error) }; }
            socket.end(JSON.stringify(result) + '\n');
        });
    });
    server.listen(socketPath, () => { fs.chownSync(socketPath, 0, gid); fs.chmodSync(socketPath, 0o660); });
    return server;
}
function verifyActiveRuntime(requireRunning = false) {
    const state = readState();
    if (!channel.hash(state?.releaseId) || !nodePolicy.supportedVersion(state?.nodeVersion)) channel.fail('UPDATE_BASELINE');
    const activePath = '/opt/nexowatt/eos/releases/' + state.releaseId;
    rootOwned('/opt/nexowatt/eos');
    const pointer = fs.lstatSync('/opt/nexowatt/eos/current');
    if (!pointer.isSymbolicLink() || pointer.uid !== 0 || fs.realpathSync('/opt/nexowatt/eos/current') !== activePath) channel.fail('UPDATE_BASELINE');
    checkInstalled({ releasePath: activePath, evidencePath: '/opt/nexowatt/eos/verified/' + state.releaseId,
        expectedNodeVersion: state.nodeVersion });
    const activeManifest = JSON.parse(load('/opt/nexowatt/eos/verified/' + state.releaseId + '/manifest.json', 16 * 1024 * 1024));
    nodePolicy.validateRuntime(activePath, activeManifest);
    if (requireRunning && (state.nodeVersion !== process.versions.node || fs.realpathSync(process.execPath) !== path.join(activePath, nodePolicy.BINARY))) channel.fail('UPDATE_RUNTIME_BINDING');
    return state;
}
function main() {
    if (process.getuid?.() !== 0 || process.argv.length !== 2 || !nodePolicy.supportedVersion(process.versions.node)
        || !/^[a-f0-9]{32}$/.test(process.env.INVOCATION_ID || '')) channel.fail('UPDATE_SERVICE_ONLY');
    const releasePath = path.resolve(__dirname, '../..');
    const evidencePath = '/opt/nexowatt/eos/verified/' + path.basename(releasePath);
    const manifest = JSON.parse(load(path.join(evidencePath, 'manifest.json'), 16 * 1024 * 1024));
    nodePolicy.validateVersion(manifest.nodeVersion);
    checkInstalled({ releasePath, evidencePath, expectedNodeVersion: manifest.nodeVersion });
    verifyActiveRuntime(true);
    rootOwned(DIRECTORY); rootOwned(path.join(DIRECTORY, 'jobs')); channel.publicKey(load(TRUST, 16384));
    const groups = fs.readFileSync('/etc/group', 'utf8').split('\n').filter(row => row.startsWith('eos-runtime:'));
    const gid = Number(groups[0]?.split(':')[2]);
    if (groups.length !== 1 || !Number.isSafeInteger(gid) || gid < 1) channel.fail('UPDATE_GROUP');
    const manager = new Manager({ restartAfterRuntimeChange: () => {
        verifyActiveRuntime(false); setImmediate(() => process.exit(0));
    }, launch: (id, done) => {
        const child = spawn('/opt/nexowatt/eos/current/' + nodePolicy.BINARY, [path.join(__dirname, 'worker.cjs'), id], { stdio: 'ignore',
            env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LC_ALL: 'C', INVOCATION_ID: process.env.INVOCATION_ID } });
        let ended = false; const finish = () => { if (!ended) { ended = true; done(); } };
        child.once('error', finish); child.once('exit', finish);
    } });
    manager.restore(); serve(manager, { gid });
    const check = () => { try { manager.dispatch({ operation: 'check' }); } catch { /* busy or recovery remains visible */ } };
    setTimeout(check, 10000); setInterval(check, 6 * 60 * 60 * 1000).unref();
    const automatic = () => { manager.tickAutomatic().catch(() => { /* durable attempt prevents restart loops; status stays inspectable */ }); };
    setTimeout(automatic, 15000); setInterval(automatic, 60000).unref();
}
module.exports = { Manager, validRequest, serve, DIRECTORY, SOCKET, TRUST, STATE, load, readState, code };
if (require.main === module) { try { main(); } catch (error) { process.stderr.write(code(error) + '\n'); process.exitCode = 1; } }
