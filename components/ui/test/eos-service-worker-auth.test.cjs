'use strict';
// Executes the actual worker event handlers with a browser CacheStorage fixture.
// This proves response selection and cache policy, not browser installation/UI.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const worker = process.env.EOS_SW_SOURCE === '1'
  ? '../src-ts/runtime-executables/www/sw.ts' : '../www/sw.js';
const source = fs.readFileSync(path.join(__dirname, worker), 'utf8');

function fixture() {
  const handlers = new Map(); const calls = [];
  const cache = { async match(request) { calls.push(['cacheMatch', request.url]); return new Response('public asset'); },
    async put(request) { calls.push(['cachePut', request.url]); } };
  let mode = 'offline';
  const response = () => ({ ok: mode === 'asset', type: 'basic', redirected: mode === 'redirect',
    status: mode === 'denied' ? 401 : 200, clone() { return this; } });
  vm.runInNewContext(source, { URL, Response,
    self: { location: { origin: 'https://eos.test' },
      addEventListener(name, handler) { handlers.set(name, handler); },
      async skipWaiting() { calls.push(['skipWaiting']); },
      clients: { async claim() { calls.push(['claim']); } } },
    caches: { async open(name) { calls.push(['cacheOpen', name]); return cache; },
      async keys() { return ['nexowatt-cache-v519', 'nexowatt-cache-v520', 'unrelated-cache']; },
      async delete(name) { calls.push(['cacheDelete', name]); } },
    async fetch(request, options) { calls.push(['fetch', request.url, options]);
      if (mode === 'offline') throw new Error('offline'); return response(); },
  }, { filename: worker });
  return { calls, setMode(value) { mode = value; },
    async dispatch(name, url = '/', method = 'GET') {
      let task; handlers.get(name)({ request: { url: new URL(url, 'https://eos.test').href, method },
        waitUntil(value) { task = value; }, respondWith(value) { task = value; } });
      return await task;
    } };
}

test('worker installs without prefetching login-protected content', async () => {
  const f = fixture(); await f.dispatch('install');
  assert.deepEqual(f.calls, [['skipWaiting']]);
});
test('activation deletes legacy EOS caches before controlling clients', async () => {
  const f = fixture(); await f.dispatch('activate');
  assert.deepEqual(f.calls, [['cacheDelete', 'nexowatt-cache-v519'], ['claim']]);
});
for (const route of ['/', '/index.html', '/static/index.html', '/api/state', '/api/export.json', '/config', '/state/live', '/static/auth.js?token=fixture']) {
  test(`offline protected route cannot use a previous session cache: ${route}`, async () => {
    const f = fixture(); const result = await f.dispatch('fetch', route);
    assert.equal(result.status, 503); assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0][0], 'fetch');
    assert.equal(f.calls[0][2].cache, 'no-store');
  });
}
test('authentication denial is returned directly without cache fallback', async () => {
  const f = fixture(); f.setMode('denied'); const result = await f.dispatch('fetch', '/index.html');
  assert.equal(result.status, 401); assert.equal(f.calls.length, 1);
});
test('only successful public same-origin assets are cached', async () => {
  const f = fixture(); f.setMode('asset'); const result = await f.dispatch('fetch', '/static/auth.js');
  assert.equal(result.status, 200); assert.equal(f.calls.filter(x => x[0] === 'cachePut').length, 1);
  assert.equal(f.calls[0][1], 'nexowatt-cache-v520');
});
for (const mode of ['denied', 'redirect']) test(`public asset ${mode} response never enters cache`, async () => {
  const f = fixture(); f.setMode(mode); await f.dispatch('fetch', '/assets/logo.png');
  assert.equal(f.calls.some(x => x[0] === 'cachePut' || x[0] === 'cacheMatch'), false);
});
test('public asset offline fallback is confined to current cache', async () => {
  const f = fixture(); const result = await f.dispatch('fetch', '/assets/logo.png');
  assert.equal(await result.text(), 'public asset');
  assert.equal(f.calls[0][1], 'nexowatt-cache-v520');
});
for (const [url, method] of [['https://other.test/asset.js', 'GET'], ['/events', 'GET'], ['/api/account/password', 'POST']]) {
  test(`worker does not intercept native transport: ${method} ${url}`, async () => {
    const f = fixture(); assert.equal(await f.dispatch('fetch', url, method), undefined);
    assert.deepEqual(f.calls, []);
  });
}
