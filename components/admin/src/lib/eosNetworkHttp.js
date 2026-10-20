'use strict';

const { isEosSameOriginRequest } = require('./eosRequestSecurity');
const { requestNetwork: defaultRequest } = require('./eosNetworkClient');
const LISTENERS = new Set(['tcp:1883', 'tcp:8883', 'tcp:4712', 'tcp:9220', 'udp:5353']);
const plain = value => !!value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key));
const mac = value => typeof value === 'string' && /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i.test(value);
const ipv4 = value => typeof value === 'string' && /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value)
    && value.split('.').every(part => Number(part) <= 255);

function validBody(operation, body) {
    if (operation === 'status') return exact(body, []);
    if (['preview', 'apply'].includes(operation)) {
        const config = body?.config;
        return exact(body, ['config']) && exact(config, ['interface', 'mac', 'address', 'prefixLength', 'dhcpStart', 'dhcpEnd', 'dnsServers', 'reservations', 'listeners'])
            && typeof config.interface === 'string' && /^[a-zA-Z0-9_.:-]{1,15}$/.test(config.interface)
            && mac(config.mac) && ipv4(config.address) && config.prefixLength === 24
            && ipv4(config.dhcpStart) && ipv4(config.dhcpEnd)
            && Array.isArray(config.dnsServers) && config.dnsServers.length >= 1 && config.dnsServers.length <= 3 && config.dnsServers.every(ipv4)
            && Array.isArray(config.reservations) && config.reservations.length <= 253
            && config.reservations.every(row => exact(row, ['mac', 'ip']) && mac(row.mac) && ipv4(row.ip))
            && Array.isArray(config.listeners) && config.listeners.length <= 5
            && config.listeners.every(row => exact(row, ['protocol', 'port']) && ['tcp', 'udp'].includes(row.protocol)
                && Number.isInteger(row.port) && LISTENERS.has(`${row.protocol}:${row.port}`));
    }
    if (operation === 'confirm') return exact(body, ['transactionId'])
        && typeof body.transactionId === 'string' && /^[a-zA-Z0-9_-]{16,128}$/.test(body.transactionId);
    const fields = operation === 'reservation' ? ['mac', 'ip', 'reserved']
        : operation === 'grant' ? ['mac', 'ip', 'durationSeconds'] : ['mac', 'ip'];
    return ['reservation', 'grant', 'revoke'].includes(operation) && exact(body, fields) && mac(body.mac) && ipv4(body.ip)
        && (operation !== 'reservation' || typeof body.reserved === 'boolean')
        && (operation !== 'grant' || Number.isInteger(body.durationSeconds) && body.durationSeconds >= 60 && body.durationSeconds <= 3600);
}

function registerNetworkRoutes(app, { authorize, secure, jsonParser, requestNetwork = defaultRequest }) {
    const rates = new Map();
    const guard = write => async (req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        try {
            if (secure !== true) return res.status(403).json({ error: 'NETWORK_HTTPS_REQUIRED' });
            const access = await authorize(req);
            if (!access?.userId || !['admin', 'installer'].includes(access.role)) {
                return res.status(403).json({ error: 'NETWORK_PERMISSION' });
            }
            // A browser's ambient cookie is never sufficient authority for a mutation.
            if (write && (req.headers['x-nexowatt-eos-network'] !== '1'
                || !isEosSameOriginRequest(req.headers, 'https:'))) {
                return res.status(403).json({ error: 'NETWORK_ORIGIN' });
            }
            const now = Date.now();
            for (const [key, rate] of rates) if (now - rate.start >= 60000) rates.delete(key);
            const key = `${write ? 'w' : 'r'}:${access.userId}`;
            if (!rates.has(key)) {
                if (rates.size >= 128) return res.status(429).json({ error: 'NETWORK_RATE_LIMIT' });
                rates.set(key, { start: now, count: 0 });
            }
            if (++rates.get(key).count > (write ? 30 : 60)) return res.status(429).json({ error: 'NETWORK_RATE_LIMIT' });
            next();
        } catch { res.status(503).json({ error: 'NETWORK_AUTH_UNAVAILABLE' }); }
    };
    const handle = operation => async (req, res) => {
        try {
            const body = operation === 'status' ? {} : req.body;
            if (!validBody(operation, body)) return res.status(400).json({ error: 'NETWORK_REQUEST' });
            // Recheck current authority after parsing, immediately before host mutation.
            const access = await authorize(req);
            if (!access?.userId || !['admin', 'installer'].includes(access.role)) {
                return res.status(403).json({ error: 'NETWORK_PERMISSION' });
            }
            res.status(200).json(await requestNetwork(operation, body));
        } catch (error) {
            const code = typeof error?.code === 'string' && /^NETWORK_[A-Z0-9_]{1,72}$/.test(error.code)
                ? error.code : 'NETWORK_UNAVAILABLE';
            res.status(code === 'NETWORK_BUSY' ? 429 : ['NETWORK_UNAVAILABLE', 'NETWORK_TIMEOUT', 'NETWORK_RESPONSE'].includes(code) ? 503 : 400)
                .json({ error: code });
        }
    };
    app.get('/nexowatt/network/status', guard(false), handle('status'));
    for (const operation of ['preview', 'apply', 'confirm', 'reservation', 'grant', 'revoke']) {
        app.post(`/nexowatt/network/${operation}`, guard(true), jsonParser, handle(operation));
    }
    app.use('/nexowatt/network', (error, _req, res, _next) => {
        res.status(error?.type === 'entity.too.large' ? 413 : 400).json({ error: 'NETWORK_REQUEST' });
    });
}

module.exports = { registerNetworkRoutes, validBody };
