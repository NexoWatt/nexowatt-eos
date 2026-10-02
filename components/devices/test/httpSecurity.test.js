'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createHttpSecurity, requestWithDeadline, MAX_BODY_BYTES } = require('../lib/httpSecurity');

test('HTTP profile cannot disable peer verification and bounds resources', () => {
  for (const connection of [{ insecureTls: true }, { insecureTLS: true }, { allowInsecureTls: true }, { rejectUnauthorized: false }]) {
    assert.throws(() => createHttpSecurity(connection), /TLS_VERIFICATION_REQUIRED/);
  }
  const profile = createHttpSecurity({ timeoutMs: 90000 });
  assert.equal(profile.timeout, 5000);
  assert.equal(profile.httpsAgent.options.rejectUnauthorized, true);
  assert.equal(profile.httpsAgent.options.minVersion, 'TLSv1.3');
  assert.equal(profile.maxRedirects, 0);
  assert.equal(profile.maxContentLength, 1024 * 1024);
  assert.equal(profile.proxy, false);
  profile.httpsAgent.destroy();
});

test('private keys and excessive CA material are rejected', () => {
  assert.throws(() => createHttpSecurity({ caCertificate: 'PRIVATE KEY' }), /CA_INVALID/);
  assert.throws(() => createHttpSecurity({ caCertificate: 'x'.repeat(65537) }), /CA_INVALID/);
});

test('deadline aborts the underlying pending request and returns only a fixed diagnostic', async () => {
  let aborted = false;
  const client = { request(options) {
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('https://user:private@example.invalid/?token=private'));
    }, { once: true }));
  } };
  await assert.rejects(requestWithDeadline(client, { url: '/read' }, 20), error => error.message === 'EOS_HTTP_DEADLINE');
  assert.equal(aborted, true);
});

test('failed request cannot propagate credential URLs or response data', async () => {
  const client = { request() { throw new Error('private-response-and-token'); } };
  await assert.rejects(requestWithDeadline(client, {}), error => error.message === 'EOS_HTTP_REQUEST_FAILED' && !error.cause);
});

// Explicitly execute with installed axios; a skipped transport test is not an acceptance result.
let axios;
try { axios = require('axios'); } catch { /* dependency availability is reported below */ }
test('real HTTP transport accepts a complete response, blocks redirects and enforces body bound',
  { skip: !axios && 'axios dependency must be installed for transport acceptance' }, async t => {
    let redirected = 0;
    const server = http.createServer((request, response) => {
      if (request.url === '/redirect') { response.writeHead(302, { Location: '/target' }); response.end(); }
      else if (request.url === '/target') { redirected++; response.end('{}'); }
      else if (request.url === '/large') response.end('x'.repeat(MAX_BODY_BYTES + 1));
      else { response.setHeader('Content-Type', 'application/json'); response.end('{"powerW":42}'); }
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const profile = createHttpSecurity();
    t.after(async () => { profile.httpsAgent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    const client = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}`, ...profile });
    assert.equal((await requestWithDeadline(client, { url: '/' })).data.powerW, 42);
    await assert.rejects(requestWithDeadline(client, { url: '/redirect' }), /EOS_HTTP_REQUEST_FAILED/);
    assert.equal(redirected, 0);
    await assert.rejects(requestWithDeadline(client, { url: '/large' }), /EOS_HTTP_REQUEST_FAILED/);
  });

test('real trickling HTTP body is actively aborted by the total deadline',
  { skip: !axios && 'axios dependency must be installed for transport acceptance' }, async t => {
    let closed = false;
    const server = http.createServer((request, response) => {
      response.writeHead(200); response.write('[');
      const trickle = setInterval(() => response.write(' '), 10);
      response.on('close', () => { closed = true; clearInterval(trickle); });
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const profile = createHttpSecurity();
    t.after(async () => { profile.httpsAgent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
    const client = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}`, ...profile });
    const start = performance.now();
    await assert.rejects(requestWithDeadline(client, { url: '/' }, 75), /EOS_HTTP_DEADLINE/);
    assert.ok(performance.now() - start < 1500);
    for (let count = 0; count < 50 && !closed; count++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(closed, true);
  });
