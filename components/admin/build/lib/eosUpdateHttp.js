'use strict';

const { isEosSameOriginRequest } = require('./eosRequestSecurity');
const { requestUpdate: defaultRequest } = require('./eosUpdateClient');
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key));
function validBody(operation, body) {
    if (['status', 'check'].includes(operation)) return exact(body, []);
    return operation === 'install' && exact(body, ['releaseId', 'maintenanceConfirmed'])
        && typeof body.releaseId === 'string' && /^[a-f0-9]{64}$/.test(body.releaseId)
        && body.maintenanceConfirmed === true;
}

function registerUpdateRoutes(app, { authorize, secure, jsonParser, requestUpdate = defaultRequest }) {
    const rates = new Map();
    const guard = write => async (req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        try {
            if (secure !== true) return res.status(403).json({ error: 'UPDATE_HTTPS_REQUIRED' });
            const access = await authorize(req);
            if (!access?.userId || !['admin', 'installer'].includes(access.role)) {
                return res.status(403).json({ error: 'UPDATE_PERMISSION' });
            }
            // A browser's ambient cookie is never sufficient authority for a mutation.
            if (write && (req.headers['x-nexowatt-eos-updates'] !== '1'
                || !isEosSameOriginRequest(req.headers, 'https:'))) {
                return res.status(403).json({ error: 'UPDATE_ORIGIN' });
            }
            const now = Date.now();
            for (const [key, rate] of rates) if (now - rate.start >= 60000) rates.delete(key);
            const key = `${write ? 'w' : 'r'}:${access.userId}`;
            if (!rates.has(key)) {
                if (rates.size >= 128) return res.status(429).json({ error: 'UPDATE_RATE_LIMIT' });
                rates.set(key, { start: now, count: 0 });
            }
            if (++rates.get(key).count > (write ? 30 : 60)) return res.status(429).json({ error: 'UPDATE_RATE_LIMIT' });
            next();
        } catch { res.status(503).json({ error: 'UPDATE_AUTH_UNAVAILABLE' }); }
    };
    const handle = operation => async (req, res) => {
        try {
            const body = operation === 'status' ? {} : req.body;
            if (!validBody(operation, body)) return res.status(400).json({ error: 'UPDATE_REQUEST' });
            // Recheck current authority after parsing, immediately before host mutation.
            const access = await authorize(req);
            if (!access?.userId || !['admin', 'installer'].includes(access.role)) {
                return res.status(403).json({ error: 'UPDATE_PERMISSION' });
            }
            res.status(200).json(await requestUpdate(operation, body));
        } catch (error) {
            const code = typeof error?.code === 'string' && /^UPDATE_[A-Z0-9_]{1,72}$/.test(error.code)
                ? error.code : 'UPDATE_UNAVAILABLE';
            res.status(code === 'UPDATE_BUSY' ? 429 : ['UPDATE_UNAVAILABLE', 'UPDATE_TIMEOUT', 'UPDATE_RESPONSE'].includes(code) ? 503 : 400)
                .json({ error: code });
        }
    };
    app.get('/nexowatt/managed-updates/status', guard(false), handle('status'));
    for (const operation of ['check', 'install']) {
        app.post(`/nexowatt/managed-updates/${operation}`, guard(true), jsonParser, handle(operation));
    }
    app.use('/nexowatt/managed-updates', (error, _req, res, _next) => {
        res.status(error?.type === 'entity.too.large' ? 413 : 400).json({ error: 'UPDATE_REQUEST' });
    });
}

module.exports = { registerUpdateRoutes, validBody };
