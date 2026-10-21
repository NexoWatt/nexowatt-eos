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
        fetchFeed = () => transport.request(channel.FEED_URL), launch, readResult = load, now = Date.now } = {}) {
        Object.assign(this, { directory, trust, state, fetchFeed, launch, readResult, now });
        this.status = { phase: 'IDLE', candidate: null, checkedAt: null, error: null, operationId: null };
        this.envelope = null; this.pending = false; this.lastCheck = 0;
    }
    restore() {
        const file = path.join(this.directory, 'status.json');
        if (fs.existsSync(file)) {
            this.status = JSON.parse(this.readResult(file));
            if (BUSY.has(this.status.phase)) this.status = { phase: 'RECOVERY_REQUIRED', candidate: null,
                checkedAt: null, error: 'UPDATE_INTERRUPTED', operationId: this.status.operationId };
            // Never reuse an on-disk candidate as installation authority.
            this.status.candidate = null; this.persist();
        }
    }
    persist() { atomicWrite(path.join(this.directory, 'status.json'), JSON.stringify(this.status) + '\n'); }
    view() {
        return { ok: true, installed: this.state(), ...this.status, busy: this.pending || BUSY.has(this.status.phase) };
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
        if (fs.readdirSync(path.join(this.directory, 'jobs')).length >= 5) channel.fail('UPDATE_STAGING_FULL');
        const operationId = crypto.randomUUID(), job = path.join(this.directory, 'jobs', operationId);
        fs.mkdirSync(job, { mode: 0o700 });
        fs.writeFileSync(path.join(job, 'feed.json'), this.envelope, { mode: 0o600, flag: 'wx' });
        fs.writeFileSync(path.join(job, 'request.json'), JSON.stringify({ operationId, releaseId: candidate.releaseId }), { mode: 0o600, flag: 'wx' });
        this.status = { ...this.status, phase: 'QUEUED', operationId, error: null }; this.persist();
        this.pending = true;
        try { this.launch(operationId, () => {
            this.pending = false;
            try { this.refreshWorker(); } catch { this.status.phase = 'RECOVERY_REQUIRED'; this.status.error = 'UPDATE_JOB'; }
            if (BUSY.has(this.status.phase)) { this.status.phase = 'RECOVERY_REQUIRED'; this.status.error = 'UPDATE_INTERRUPTED'; }
            this.persist();
            // Successful work is fully represented by durable status + installed
            // release evidence. Do not exhaust staging after five normal updates.
            if (this.status.phase === 'SUCCEEDED') {
                try { fs.rmSync(job, { recursive: true }); } catch { /* bounded, explicitly visible staging quota */ }
            }
        }); } catch { this.pending = false; this.status.phase = 'FAILED'; this.status.error = 'UPDATE_START_FAILED'; this.persist(); }
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
function main() {
    if (process.getuid?.() !== 0 || process.argv.length !== 2 || process.versions.node !== '24.21.0'
        || !/^[a-f0-9]{32}$/.test(process.env.INVOCATION_ID || '')) channel.fail('UPDATE_SERVICE_ONLY');
    const releasePath = path.resolve(__dirname, '../..');
    checkInstalled({ releasePath, evidencePath: '/opt/nexowatt/eos/verified/' + path.basename(releasePath) });
    rootOwned(DIRECTORY); rootOwned(path.join(DIRECTORY, 'jobs')); channel.publicKey(load(TRUST, 16384));
    const groups = fs.readFileSync('/etc/group', 'utf8').split('\n').filter(row => row.startsWith('eos-runtime:'));
    const gid = Number(groups[0]?.split(':')[2]);
    if (groups.length !== 1 || !Number.isSafeInteger(gid) || gid < 1) channel.fail('UPDATE_GROUP');
    const manager = new Manager({ launch: (id, done) => {
        const child = spawn('/usr/bin/node', [path.join(__dirname, 'worker.cjs'), id], { stdio: 'ignore',
            env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LC_ALL: 'C', INVOCATION_ID: process.env.INVOCATION_ID } });
        let ended = false; const finish = () => { if (!ended) { ended = true; done(); } };
        child.once('error', finish); child.once('exit', finish);
    } });
    manager.restore(); serve(manager, { gid });
    const check = () => { try { manager.dispatch({ operation: 'check' }); } catch { /* busy or recovery remains visible */ } };
    setTimeout(check, 10000); setInterval(check, 6 * 60 * 60 * 1000).unref();
}
module.exports = { Manager, validRequest, serve, DIRECTORY, SOCKET, TRUST, STATE, load, readState, code };
if (require.main === module) { try { main(); } catch (error) { process.stderr.write(code(error) + '\n'); process.exitCode = 1; } }
