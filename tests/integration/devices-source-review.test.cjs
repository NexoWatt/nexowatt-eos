'use strict';
// Read-only review harness. Passing reproductions document gaps, not security fixes.
// Sources must be acquired independently at the commit recorded in observations.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const crypto = require('node:crypto');
const root = process.env.EOS_DEVICES_SOURCE;
if (!root) throw new Error('EOS_DEVICES_SOURCE is required; use the reviewed source snapshot');
const source = path.resolve(root);
const observations = JSON.parse(fs.readFileSync(path.join(__dirname, '../../system/integration/devices-observations.json'), 'utf8'));
// Fail closed before executing any source when the baseline differs.
for (const f of observations.sourceFiles) {
  const bytes = fs.readFileSync(path.join(source, f.path));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), f.sha256, `source mismatch: ${f.path}`);
}

function load(relative, imports = {}) {
  const filename = path.join(source, relative);
  const mod = { exports: {}, parent: {} };
  const wrapper = vm.runInNewContext(`(function(require,module,exports,__dirname){${fs.readFileSync(filename, 'utf8')}\n})`, {
    Buffer, URL, setTimeout, clearTimeout, setInterval, clearInterval,
    process: { platform: process.platform },
  }, { filename, timeout: 2000 });
  wrapper((id) => {
    if (Object.hasOwn(imports, id)) return imports[id];
    throw new Error(`Unstubbed import blocked: ${id}`);
  }, mod, mod.exports, path.dirname(filename));
  return mod.exports;
}
const utils = load('lib/utils.js');
function adapter() {
  const logs = [];
  return { namespace: 'nexowatt-devices.0', instance: 0, logs,
    log: Object.fromEntries(['info', 'warn', 'error', 'debug'].map(k => [k, m => logs.push(String(m))])),
    setStateAsync: async () => {}, setObjectNotExistsAsync: async () => {} };
}
function http(connection = {}, response = { data: {} }, failure = null) {
  let options, request;
  const { HttpDriver } = load('lib/drivers/http.js', {
    axios: { create: x => { options = x; return { request: async x => { request = x; if (failure) throw failure; return response; } }; } },
    https: { Agent: class { constructor(x) { this.options = x; } } }, '../utils': utils,
  });
  const a = adapter(); const driver = new HttpDriver(a, { id: 'review', connection }, {}, {});
  return { driver, a, options, get request() { return request; } };
}
function mqtt(connection = {}) {
  let options, url; const client = new EventEmitter();
  const { MqttDriver } = load('lib/drivers/mqtt.js', {
    'node:fs': { readFileSync: () => { throw new Error('File reads blocked'); } },
    mqtt: { connect: (u, o) => { url = u; options = o; return client; } },
    '../utils': utils, '../../package.json': { version: observations.version },
  });
  const a = adapter(); const driver = new MqttDriver(a, { id: 'review', connection }, {}, {}, x => x, () => 2);
  return { driver, a, client, get options() { return options; }, get url() { return url; } };
}

test('baseline manifests agree on version and do not declare per-adapter secret fields', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(source, 'package.json')));
  const io = JSON.parse(fs.readFileSync(path.join(source, 'io-package.json')));
  assert.equal(pkg.version, observations.version); assert.equal(io.common.version, observations.version);
  assert.equal(io.encryptedNative, undefined); assert.equal(io.protectedNative, undefined);
});
test('HTTP default preserves TLS verification settings', () => {
  const h = http({ baseUrl: 'https://gateway.invalid' });
  assert.equal(h.options.httpsAgent, undefined);
});
test('REPRO DEV-001: HTTP config can disable peer verification', () => {
  assert.equal(http({ baseUrl: 'https://gateway.invalid', insecureTls: true }).options.httpsAgent.options.rejectUnauthorized, false);
});
test('REPRO DEV-001: HTTP accepts cleartext with Basic credentials', () => {
  const h = http({ baseUrl: 'http://gateway.invalid', username: 'synthetic-user', password: 'synthetic-value' });
  assert.equal(h.options.baseURL, 'http://gateway.invalid'); assert.ok(h.options.auth);
});
test('REPRO DEV-002: HTTP timeout defaults to 8s and is not capped to 5s', () => {
  assert.equal(http().options.timeout, 8000); assert.equal(http({ timeoutMs: 120000 }).options.timeout, 120000);
});
test('REPRO DEV-002: request supplies no explicit body/redirect/abort limits', async () => {
  const h = http(); await h.driver.readDatapoints([{ id: 'p', source: { kind: 'http', path: '/p' } }]);
  for (const k of ['maxContentLength', 'maxBodyLength', 'maxRedirects', 'signal']) {
    assert.equal(h.options[k], undefined); assert.equal(h.request[k], undefined);
  }
});
test('REPRO DEV-003: HTTP error log retains synthetic query credential', async () => {
  const marker = 'review-only-token'; const h = http({}, {}, new Error('synthetic transport error'));
  await h.driver.readDatapoints([{ id: 'p', source: { kind: 'http', path: `/value?token=${marker}` } }]);
  assert.ok(h.a.logs.some(x => x.includes(marker)));
});
test('REPRO DEV-004: HTTP numeric datapoint can return object/null before runtime processing', async () => {
  const h = http({}, { data: { p: { unexpected: true }, q: null } });
  const out = await h.driver.readDatapoints(['p', 'q'].map(id => ({ id, type: 'number', source: { kind: 'http', path: '/', jsonPath: id } })));
  assert.equal(out.p.unexpected, true); assert.equal(out.q, null);
});
test('REPRO DEV-005: MQTT plaintext transport passes configuration unchanged', async () => {
  const m = mqtt({ url: 'mqtt://gateway.invalid', password: 'synthetic-value' }); await m.driver.connect();
  assert.equal(m.url, 'mqtt://gateway.invalid'); assert.equal(m.options.password, 'synthetic-value');
});
test('REPRO DEV-005: MQTT permits TLS peer verification to be disabled', async () => {
  const m = mqtt({ url: 'mqtts://gateway.invalid', rejectUnauthorized: false }); await m.driver.connect();
  assert.equal(m.options.rejectUnauthorized, false);
});
test('MQTT secure URL preserves explicit peer verification', async () => {
  const m = mqtt({ url: 'mqtts://gateway.invalid', rejectUnauthorized: true }); await m.driver.connect();
  assert.equal(m.options.rejectUnauthorized, true);
});
test('REPRO DEV-006: incoming topic diagnostic retains all 200 distinct topics', async () => {
  const m = mqtt(); m.driver._setDiagnostic = async () => {};
  for (let i = 0; i < 200; i++) await m.driver._recordIncomingTopic(`synthetic/${i}`);
  assert.equal(m.driver.discoveredTopics.size, 200);
});
test('REPRO DEV-007: startup migration changes an unrelated adapter object', async () => {
  const changed = [];
  class Adapter {
    constructor() { Object.assign(this, adapter()); this.config = {}; this.name = 'nexowatt-devices'; }
    on() {}
    async getForeignObjectsAsync() { return { 'system.adapter.synthetic-thirdparty': { type: 'adapter', common: { adminUI: 'materialize' } } }; }
    async extendForeignObjectAsync(id, value) { changed.push({ id, value }); }
  }
  const start = load('main.js', { fs: { readFileSync: () => { throw new Error('No templates in review stub'); } }, path,
    '@iobroker/adapter-core': { Adapter }, './lib/deviceRuntime': { DeviceRuntime: class {} } });
  const instance = start({}); await instance.onReady();
  assert.ok(changed.some(x => x.id === 'system.adapter.synthetic-thirdparty' && x.value.common.adminUI.config === 'materialize'));
});
