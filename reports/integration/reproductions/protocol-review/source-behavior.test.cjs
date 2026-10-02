'use strict';
// Source-behavior reproductions only. No real socket, adapter, controller or hardware is started.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { stripTypeScriptTypes } = require('node:module');
const sourceRoot = path.resolve(process.env.EOS_COMPONENT_SOURCES || path.join(__dirname, '../../../../../component-sources'));
function loadTs(file, mocks = {}) {
  let text = stripTypeScriptTypes(fs.readFileSync(file, 'utf8'), { mode: 'transform' });
  const names = [];
  text = text.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g, (_, names, spec) => `const {${names}} = require(${JSON.stringify(spec)});`);
  text = text.replace(/export (class|function|const) (\w+)/g, (_, kind, name) => { names.push(name); return `${kind} ${name}`; });
  text += `\nmodule.exports = {${names.join(',')}};`;
  const mod = { exports: {} };
  const localRequire = spec => {
    if (Object.hasOwn(mocks, spec)) return mocks[spec];
    if (spec.startsWith('node:')) return require(spec);
    if (spec.startsWith('./')) return loadTs(path.resolve(path.dirname(file), spec+'.ts'), mocks);
    throw new Error('Unexpected dependency in isolated source loader');
  };
  vm.runInNewContext(text, { module: mod, exports: mod.exports, require: localRequire, Buffer, console }, { filename: file, timeout: 5000 });
  return mod.exports;
}
function endpointFixture(extra = {}) {
  let peerCertificateReads = 0;
  let wsOptions;
  class FakeWebSocket extends EventEmitter {
    constructor(_url, _protocol, options) {
      super(); wsOptions = options; this.readyState = 1;
      this._socket = { getPeerCertificate: () => { peerCertificateReads++; return { fingerprint256: 'UNRELATED-PEER' }; } };
      queueMicrotask(() => this.emit('open'));
    }
    send() {}
  }
  const { ShipEndpoint } = loadTs(path.join(sourceRoot, 'eebus/src/lib/shipEndpoint.ts'), { ws: FakeWebSocket });
  const received = []; const exchanges = [];
  const endpoint = new ShipEndpoint({ log: { info(){}, warn(){}, debug(){} } },
    { autoConnectEnabled: true, autoAcceptNewDevices: false, pairingPin: '', ...extra },
    { privateKey: 'TEST-PLACEHOLDER', certificate: 'TEST-PLACEHOLDER', localSki: 'OWN', shipId: 'OWN' },
    async (id, message) => received.push({ id, message }), async () => {}, async () => {},
    async id => exchanges.push(id), async () => {}, async () => false);
  return { endpoint, received, exchanges, peerReads: () => peerCertificateReads, options: () => wsOptions };
}
test('EEBUS source reproduction: outbound identity comes from discovery without reading peer certificate', async () => {
  const f = endpointFixture();
  assert.equal(await f.endpoint.connectToNode({ host: '192.0.2.1', port: 4712, safeId: 'CLAIMED', ski: 'CLAIMED', id: 'CLAIMED', path: '/ship/' }), true);
  assert.equal(f.options().rejectUnauthorized, false);
  assert.equal(f.peerReads(), 0);
  assert.equal(f.endpoint.sessions.get('CLAIMED').remoteSki, 'CLAIMED');
});
test('EEBUS source reproduction: data is forwarded before trust and data exchange readiness', async () => {
  const f = endpointFixture();
  const session = { deviceId: 'UNTRUSTED', dataExchangeReady: false };
  const payload = { measurement: 'TEST-MARKER' };
  await f.endpoint.handleFrame(session, { type: 'data', value: payload });
  assert.equal(f.received.length, 2);
  assert.equal(f.received[1].message, payload);
  assert.equal(session.dataExchangeReady, false);
});
test('EEBUS source reproduction: unsolicited pin-none control enters data exchange without trust', async () => {
  const f = endpointFixture();
  const session = { deviceId: 'UNTRUSTED', dataExchangeReady: false, localHelloReady: false, remoteHelloReady: false, protocolSelected: false };
  await f.endpoint.handleControl(session, { connectionPinState: { pinState: 'none' } });
  assert.equal(session.dataExchangeReady, true);
  assert.equal(f.exchanges[0], 'UNTRUSTED');
});
function ocppFixture(allowlist) {
  class FakeRpcServer {
    constructor(opts) { this.opts = opts; }
    on() {}
    auth(fn) { this.authenticate = fn; }
    async listen(...args) { this.listenArgs = args; }
  }
  const mod = { exports: {} };
  const src = fs.readFileSync(path.join(sourceRoot, 'ocpp21/ocpp/server.js'), 'utf8');
  vm.runInNewContext(src, { module: mod, require: spec => spec === 'ocpp-rpc' ? { RPCServer: FakeRpcServer } : { registerHandlers(){} }, Date }, { timeout: 5000 });
  return new mod.exports.OcppRpcServer({ config: { identityAllowlist: allowlist }, log: { info(){},error(){} } }, { port: 9220, protocols: ['ocpp2.1'], strictMode: false });
}
function authDecision(server, handshake) {
  let result;
  server.server.authenticate(() => { result = 'accepted'; }, code => { result = code; }, handshake);
  return result;
}
test('OCPP source reproduction: empty allowlist accepts URL identity without credentials', () => {
  assert.equal(authDecision(ocppFixture([]), { identity: 'TEST-STATION' }), 'accepted');
});
test('OCPP source reproduction: allowlisted identity is accepted without proof of identity', () => {
  assert.equal(authDecision(ocppFixture(['TEST-STATION']), { identity: 'TEST-STATION' }), 'accepted');
});
test('OCPP baseline control: absent or disallowed identity is rejected', () => {
  const server = ocppFixture(['TEST-STATION']);
  assert.equal(authDecision(server, {}), 401);
  assert.equal(authDecision(server, { identity: 'DIFFERENT' }), 403);
});
test('OCPP source reproduction: options bind all IPv4 interfaces and do not configure TLS', async () => {
  const server = ocppFixture([]); await server.listen();
  assert.equal(server.server.listenArgs[1], '0.0.0.0');
  assert.equal(server.server.opts.strictMode, false);
  assert.equal(Object.hasOwn(server.server.opts, 'cert'), false);
  assert.equal(Object.hasOwn(server.server.opts, 'key'), false);
});
