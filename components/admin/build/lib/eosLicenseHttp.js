'use strict';

const { safeCode } = require('./eosLicenseService');

function isLocal(address) {
    return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function sameOrigin(req, secure) {
    // Neither forwarded-host nor forwarded-proto is a trust source here.
    try {
        const origin = new URL(req.headers.origin);
        return origin.origin === `${secure ? 'https' : 'http'}://${req.headers.host}`
            && req.headers['x-eos-license'] === '1'
            && (!req.headers['sec-fetch-site'] || req.headers['sec-fetch-site'] === 'same-origin');
    } catch { return false; }
}

function registerLicenseRoutes(app, { service, authorize, secure, jsonParser, pagePath, scriptPath }) {
    const rates = new Map();
    const guard = (write = false) => async (req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        try {
            if (!await authorize(req)) return res.status(403).json({ error: 'LICENSE_ADMIN_REQUIRED' });
            // UUIDs and activation tokens must not travel over plaintext LAN.
            if (!secure && !isLocal(req.socket?.remoteAddress)) return res.status(403).json({ error: 'LICENSE_HTTPS_REQUIRED' });
            if (write && !sameOrigin(req, secure)) return res.status(403).json({ error: 'LICENSE_ORIGIN' });
            const now = Date.now();
            for (const [key, value] of rates) if (now - value.start >= 60000) rates.delete(key);
            const key = `${write ? 'w' : 'r'}:${req.socket?.remoteAddress || 'unknown'}`;
            let rate = rates.get(key);
            if (!rate) {
                if (rates.size >= 128) return res.status(429).json({ error: 'LICENSE_RATE_LIMIT' });
                rate = { start: now, count: 0 };
                rates.set(key, rate);
            }
            if (++rate.count > (write ? 10 : 60)) return res.status(429).json({ error: 'LICENSE_RATE_LIMIT' });
            next();
        } catch { res.status(503).json({ error: 'SERVICE_UNAVAILABLE' }); }
    };
    const handle = operation => (req, res) => {
        void Promise.resolve().then(() => operation(req)).then(result => res.status(200).json(result)).catch(error => {
            res.status(400).json({ error: safeCode(error) });
        });
    };
    app.get('/nexowatt/license', guard(), (_req, res) => {
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
        res.sendFile(pagePath);
    });
    app.get('/nexowatt/license/app.js', guard(), (_req, res) => res.sendFile(scriptPath));
    app.get('/nexowatt/license/status', guard(), handle(() => service.status()));
    app.post('/nexowatt/license/activate', guard(true), jsonParser, handle(req => {
        if (!req.body || Array.isArray(req.body) || Object.keys(req.body).length !== 1 || typeof req.body.token !== 'string' || req.body.token.length > 16384) {
            throw Object.assign(new Error('LICENSE_FORMAT'), { code: 'LICENSE_FORMAT' });
        }
        return service.activate(req.body.token.trim());
    }));
    app.post('/nexowatt/license/remove', guard(true), jsonParser, handle(req => {
        if (!req.body || Array.isArray(req.body) || Object.keys(req.body).length !== 0) throw Object.assign(new Error('LICENSE_FORMAT'), { code: 'LICENSE_FORMAT' });
        return service.remove();
    }));
    // Body parser errors must never serialize input or stack traces.
    app.use('/nexowatt/license', (error, _req, res, _next) => {
        res.status(error?.type === 'entity.too.large' ? 413 : 400).json({ error: 'LICENSE_REQUEST' });
    });
}

module.exports = { registerLicenseRoutes, sameOrigin, isLocal };
