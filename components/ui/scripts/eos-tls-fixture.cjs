'use strict';
// Ephemeral local TLS material. No private key is written into repository evidence.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const https = require('node:https');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-ui-tls-test-'));
const certPath = path.join(directory, 'leaf.crt');
const keyPath = path.join(directory, 'leaf.key');
execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-days', '2', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-addext', 'basicConstraints=critical,CA:FALSE', '-keyout', keyPath, '-out', certPath], { stdio: 'ignore' });
fs.chmodSync(keyPath, 0o600);
const cert = fs.readFileSync(certPath);
const key = fs.readFileSync(keyPath);
process.once('exit', () => fs.rmSync(directory, { recursive: true, force: true }));
function request(base, url, { token, method = 'GET', body, headers = {}, ...tlsOptions } = {}, hops = 0, deadline = Date.now() + 5000) {
  return new Promise((resolve, reject) => {
    const req = https.request(base + url, { method, ca: cert, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      headers: { ...(token ? { Cookie: `nw_session=${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...tlsOptions }, response => {
      const chunks = []; let bytes = 0;
      response.on('data', chunk => { bytes += chunk.length; if (bytes > 5 * 1024 * 1024) req.destroy(new Error('TEST_RESPONSE_LIMIT')); else chunks.push(chunk); });
      response.on('end', () => {
        if ([301,302,303,307,308].includes(response.statusCode) && response.headers.location) {
          const next = new URL(response.headers.location, base);
          if (next.origin !== new URL(base).origin || hops >= 4) return reject(new Error('TEST_REDIRECT_REJECTED'));
          return resolve(request(base, next.pathname + next.search, {token, method, body, headers, ...tlsOptions}, hops + 1, deadline));
        }
        const text = Buffer.concat(chunks).toString(); let data; try { data = JSON.parse(text); } catch (_) {}
        resolve({ status: response.statusCode, text, data, response: { headers: { get: name => {
          const value = response.headers[name.toLowerCase()]; return Array.isArray(value) ? value.join(',') : value;
        } } } });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
module.exports = { directory, certPath, keyPath, cert, key, request };
