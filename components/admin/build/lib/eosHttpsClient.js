'use strict';
const https = require('node:https');
const { performance } = require('node:perf_hooks');
/** External JSON GET with one total budget, including DNS, TLS and body. No redirects/retries. */
function requestHttpsJson(input, options = {}) {
    const started = performance.now();
    return new Promise((resolve, reject) => {
        let request;
        let response;
        let settled = false;
        let timer;
        const budget = Math.min(5000, options.budgetMs === undefined ? 5000 : options.budgetMs);
        const maximum = options.maxBytes === undefined ? 1024 * 1024 : options.maxBytes;
        const finish = (error, result) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            if (error) {
                // Never propagate URL, header, response content or upstream error messages.
                response?.destroy();
                request?.destroy();
                reject(Object.assign(new Error(error), { code: error }));
            }
            else
                resolve(result);
        };
        let url;
        try {
            url = new URL(input);
            if (url.protocol !== 'https:' || url.username || url.password || url.hash ||
                (url.port && url.port !== '443') || !Array.isArray(options.allowedHosts) ||
                !options.allowedHosts.includes(url.hostname) || !Number.isInteger(budget) || budget < 1 ||
                !Number.isInteger(maximum) || maximum < 1 || maximum > 4 * 1024 * 1024)
                throw new Error();
        }
        catch {
            finish('EOS_HTTPS_INVALID_OPTIONS');
            return;
        }
        timer = setTimeout(() => finish('EOS_HTTPS_DEADLINE'), budget);
        // Test transport injection is deliberately absent from this public runtime API.
        try {
            request = https.request(url, {
                method: 'GET', rejectUnauthorized: true, minVersion: 'TLSv1.2', agent: false,
                headers: { Accept: 'application/json', 'Accept-Encoding': 'identity' },
                maxHeaderSize: 16 * 1024,
            }, incoming => {
                response = incoming;
                if (settled) {
                    incoming.destroy();
                    return;
                }
                if (incoming.statusCode !== 200) {
                    finish('EOS_HTTPS_STATUS');
                    return;
                }
                const encoding = incoming.headers['content-encoding'];
                if (encoding && encoding !== 'identity') {
                    finish('EOS_HTTPS_ENCODING');
                    return;
                }
                const length = incoming.headers['content-length'];
                if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) {
                    finish('EOS_HTTPS_TOO_LARGE');
                    return;
                }
                let bytes = 0;
                const chunks = [];
                incoming.on('data', chunk => {
                    if (settled)
                        return;
                    if (performance.now() - started >= budget) {
                        finish('EOS_HTTPS_DEADLINE');
                        return;
                    }
                    bytes += chunk.length;
                    if (bytes > maximum) {
                        finish('EOS_HTTPS_TOO_LARGE');
                        return;
                    }
                    chunks.push(chunk);
                });
                incoming.once('error', () => finish('EOS_HTTPS_RESPONSE'));
                incoming.once('aborted', () => finish('EOS_HTTPS_RESPONSE'));
                incoming.once('end', () => {
                    if (settled)
                        return;
                    try {
                        if (performance.now() - started >= budget) {
                            finish('EOS_HTTPS_DEADLINE');
                            return;
                        }
                        const value = JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'));
                        if (!value || typeof value !== 'object') {
                            finish('EOS_HTTPS_JSON');
                            return;
                        }
                        if (performance.now() - started >= budget) {
                            finish('EOS_HTTPS_DEADLINE');
                            return;
                        }
                        finish(null, value);
                    }
                    catch {
                        finish('EOS_HTTPS_JSON');
                    }
                });
            });
            request.once('error', () => finish('EOS_HTTPS_REQUEST'));
            request.end();
        }
        catch {
            finish('EOS_HTTPS_REQUEST');
        }
    });
}
module.exports = { requestHttpsJson };
//# sourceMappingURL=eosHttpsClient.js.map