'use strict';
const { createGunzip } = require('node:zlib');
const { execFile } = require('node:child_process');
const { totalmem } = require('node:os');
const { performance } = require('node:perf_hooks');
function safeWebBind(settings) {
    if (settings.secure === true)
        return settings.bind || '0.0.0.0';
    // Literal addresses only: a hostname could change resolution at a later restart.
    return settings.bind === '::1' ? '::1' : '127.0.0.1';
}
function loopbackHttpGuard(secure) {
    return (req, res, next) => {
        if (secure === true) {
            next();
            return;
        }
        let host;
        try {
            host = new URL(`http://${req.headers.host}`).hostname;
        }
        catch { /* denied below */ }
        const remote = req.socket?.remoteAddress;
        if (!['127.0.0.1', 'localhost', '[::1]'].includes(host) ||
            !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) ||
            req.headers['sec-fetch-site'] === 'cross-site') {
            res.status(403).json({ error: 'localHttpOnly' });
            return;
        }
        next();
    };
}
let activeInflations = 0;
function inflateLog(data) {
    return new Promise((resolve, reject) => {
        const input = Buffer.isBuffer(data) ? data : Buffer.from(data, 'binary');
        if (input.length > 1024 * 1024 || activeInflations >= 2) {
            reject(new Error('EOS_LOG_LIMIT'));
            return;
        }
        activeInflations++;
        const stream = createGunzip();
        const chunks = [];
        let bytes = 0;
        let complete = false;
        const timer = setTimeout(() => finish(new Error('EOS_LOG_DEADLINE')), 1000);
        function finish(error, output) {
            if (complete)
                return;
            complete = true;
            clearTimeout(timer);
            stream.destroy();
            activeInflations--;
            error ? reject(error) : resolve(output);
        }
        stream.on('data', chunk => {
            bytes += chunk.length;
            if (bytes > 4 * 1024 * 1024) {
                finish(new Error('EOS_LOG_LIMIT'));
                return;
            }
            chunks.push(chunk);
        });
        stream.once('error', () => finish(new Error('EOS_LOG_INVALID')));
        stream.once('end', () => finish(null, Buffer.concat(chunks, bytes).toString('utf8')));
        stream.end(input);
    });
}
let systemInfo;
let systemInfoAt = -Infinity;
let inFlight;
function readSystemInfo() {
    if (systemInfo && performance.now() - systemInfoAt < 300000)
        return Promise.resolve({ ...systemInfo });
    if (inFlight)
        return inFlight.then(value => ({ ...value }));
    inFlight = new Promise(resolve => {
        const base = { platform: process.platform, ramMb: Math.round(totalmem() / 1024 / 1024), nodejs: process.version, npm: '--', active: true };
        // execFile never invokes a shell; Windows .cmd is intentionally not executed via cmd.exe.
        execFile('npm', ['-v'], { encoding: 'utf8', timeout: 1500, killSignal: 'SIGKILL', maxBuffer: 1024, windowsHide: true }, (error, stdout) => {
            if (!error && /^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(stdout.trim()))
                base.npm = stdout.trim();
            systemInfo = base;
            systemInfoAt = performance.now();
            inFlight = null;
            resolve({ ...base });
        });
    });
    return inFlight;
}
module.exports = { safeWebBind, loopbackHttpGuard, inflateLog, readSystemInfo };
//# sourceMappingURL=eosWebResources.js.map