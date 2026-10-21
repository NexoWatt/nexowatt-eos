'use strict';
const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { randomBytes } = require('node:crypto');
const MAX_FILE = 200 * 1024 * 1024;
const MAX_POOL = 400 * 1024 * 1024;
const MIN_FREE = 64 * 1024 * 1024;
const DEADLINE = 60000;
const RETENTION = 60 * 60 * 1000;
const leaseSymbol = Symbol('eos-upload-lease');
// Shared by both routes and every Web instance in this Node process.
let active = 0;
let serialized = Promise.resolve();
const live = new Set();
const root = path.join(tmpdir(), `nexowatt-admin-uploads-${typeof process.getuid === 'function' ? process.getuid() : 'service'}`);
function exclusive(fn) {
    const value = serialized.then(fn, fn);
    serialized = value.catch(() => undefined);
    return value;
}
async function ensureRoot() {
    await fs.mkdir(root, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const stat = await fs.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink() ||
        (process.platform !== 'win32' && ((stat.mode & 0o077) || stat.uid !== process.getuid()))) throw new Error('EOS_UPLOAD_STORAGE');
}
async function poolSize() {
    let size = 0;
    const entries = await fs.readdir(root, { withFileTypes: true });
    if (entries.length > 32) throw new Error('EOS_UPLOAD_QUOTA');
    for (const entry of entries) {
        if (!/^request-[a-f0-9]{32}$/.test(entry.name) || !entry.isDirectory()) throw new Error('EOS_UPLOAD_STORAGE');
        const dir = path.join(root, entry.name);
        const stat = await fs.lstat(dir);
        if (stat.isSymbolicLink()) throw new Error('EOS_UPLOAD_STORAGE');
        if (!live.has(dir) && Date.now() - stat.mtimeMs >= RETENTION) {
            await fs.rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 });
            continue;
        }
        let retainedBytes = 0;
        for (const file of await fs.readdir(dir, { withFileTypes: true })) {
            if (!file.isFile()) throw new Error('EOS_UPLOAD_STORAGE');
            const item = await fs.lstat(path.join(dir, file.name));
            if (!item.isFile() || item.isSymbolicLink() || item.nlink !== 1) throw new Error('EOS_UPLOAD_STORAGE');
            if (!live.has(dir)) retainedBytes += item.size;
        }
        if (!live.has(dir)) size += Math.max(retainedBytes, 16 * 1024 * 1024);
    }
    return size;
}
async function acquire() {
    return exclusive(async () => {
        await ensureRoot();
        if (active >= 2) throw new Error('EOS_UPLOAD_BUSY');
        const retained = await poolSize();
        if (retained + (active + 1) * MAX_FILE > MAX_POOL) throw new Error('EOS_UPLOAD_QUOTA');
        const free = await fs.statfs(root);
        if (Number(free.bavail) * Number(free.bsize) < MIN_FREE + (active + 1) * 2 * MAX_FILE) throw new Error('EOS_UPLOAD_SPACE');
        const dir = path.join(root, `request-${randomBytes(16).toString('hex')}`);
        await fs.mkdir(dir, { mode: 0o700 });
        active++;
        live.add(dir);
        let released = false;
        let keep = false;
        let cancelled = false;
        return {
            directory: dir,
            keep() { if (cancelled) throw new Error('EOS_UPLOAD_ABORTED'); keep = true; },
            cancel() { cancelled = true; },
            isCancelled() { return cancelled; },
            async release(aborted) {
                return exclusive(async () => {
                if (released) return;
                released = true;
                try {
                    if (!keep || aborted) await fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
                    live.delete(dir);
                    active--;
                } catch {
                    // Fail closed: retain this reservation if cleanup did not complete.
                    throw new Error('EOS_UPLOAD_CLEANUP');
                }
                });
            },
        };
    });
}
function createUploadMiddleware(parserFactory, logger) {
    return (req, res, next) => {
        void acquire().then(lease => {
            if (req.aborted || res.destroyed || res.writableEnded) { void lease.release(true).catch(() => logger?.warn('EOS upload cleanup failed')); return; }
            req[leaseSymbol] = lease;
            let done = false;
            const finish = aborted => {
                if (done) return;
                done = true;
                if (aborted) lease.cancel();
                clearTimeout(timer);
                void lease.release(aborted).catch(() => logger?.warn('EOS upload cleanup failed'));
            };
            const timer = setTimeout(() => {
                lease.cancel();
                if (!res.headersSent && !res.writableEnded) res.status(408).json({ error: 'uploadDeadlineExceeded' });
                req.destroy();
                finish(true);
            }, DEADLINE);
            req.once('aborted', () => finish(true));
            res.once('finish', () => finish(false));
            res.once('close', () => finish(!res.writableFinished));
            try {
            parserFactory({
                useTempFiles: true, tempFileDir: lease.directory, abortOnLimit: true,
                limits: { fileSize: MAX_FILE, files: 1, fields: 4, parts: 5, fieldSize: 64 * 1024 },
                uploadTimeout: 30000,
            })(req, res, error => {
                if (done) return;
                if (error) { finish(true); next(error); return; }
                next();
            });
            } catch (error) { finish(true); next(error); }
        }).catch(() => {
            if (!res.headersSent && !res.writableEnded) res.status(503).json({ error: 'uploadCapacityUnavailable' });
        });
    };
}
function getUploadDirectory(req) {
    const lease = req[leaseSymbol];
    if (!lease) throw new Error('EOS_UPLOAD_NOT_ADMITTED');
    return lease.directory;
}
function retainUpload(req) {
    if (!req[leaseSymbol]) throw new Error('EOS_UPLOAD_NOT_ADMITTED');
    req[leaseSymbol].keep();
}
async function storeRestoreUpload(req, source, destination) {
    const lease = req[leaseSymbol];
    if (!lease || lease.isCancelled() || req.aborted || path.dirname(source) !== lease.directory) throw new Error('EOS_UPLOAD_ABORTED');
    const stat = await fs.lstat(source);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > MAX_FILE) throw new Error('EOS_UPLOAD_STORAGE');
    // The unpredictable, exclusive destination is created in the final filesystem.
    // rename replaces a pre-existing restore.iob symlink instead of following it.
    const temporary = path.join(path.dirname(destination), `.eos-restore-${randomBytes(16).toString('hex')}`);
    try {
        await fs.chmod(source, 0o600);
        await fs.copyFile(source, temporary, constants.COPYFILE_EXCL);
        if (lease.isCancelled() || req.aborted) throw new Error('EOS_UPLOAD_ABORTED');
        await fs.rename(temporary, destination);
    } finally {
        await fs.rm(temporary, { force: true }).catch(() => undefined);
    }
}
module.exports = { createUploadMiddleware, getUploadDirectory, retainUpload, storeRestoreUpload };
