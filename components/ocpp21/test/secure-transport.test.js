'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { execFileSync } = require('node:child_process');
const { RPCServer } = require('ocpp-rpc');
const WebSocket = require('ws');
const { loadTransportProfile, validateSettings, createTransport, authenticateHandshake } = require('../ocpp/secure-transport');

const settings = () => ({ schemaVersion: 1, profile: 'eos-ocpp-mtls-v1', host: '127.0.0.1', port: 9220,
  identities: [{ identity: 'stationA', dnsName: 'station-a.ocpp.invalid' }, { identity: 'stationB', dnsName: 'station-b.ocpp.invalid' }] });

test('transport profile denies absent settings, plaintext flags, invalid and duplicate mappings', () => {
  assert.equal(validateSettings(settings()).identities.get('stationA'), 'station-a.ocpp.invalid');
  for (const value of [{}, { ...settings(), allowPlaintext: true }, { ...settings(), port: 0 },
    { ...settings(), identities: [{ identity: 'stationA', dnsName: '*.ocpp.invalid' }] },
    { ...settings(), identities: [settings().identities[0], settings().identities[0]] }]) {
    assert.throws(() => validateSettings(value), /EOS_OCPP_/);
  }
});

test('actual TLS1.3 OCPP upgrades require trusted mTLS and the enrolled DNS SAN', { timeout: 60000 }, async t => {
  // Run this file alone as root on a disposable Linux test host. The real
  // profile reader requires root-owned, non-writable ancestors, so /tmp or
  // pretending a runner-owned file belongs to root would not test that contract.
  // The test creates only its own random directory and a loopback TLS endpoint;
  // no adapter main or physical station runs. Service UID/Pi acceptance is separate.
  assert.equal(typeof process.getuid === 'function' && process.getuid(), 0,
    'OCPP protected-file fixture requires UID 0; see README.de.md. Do not run the adapter as root.');
  const directory = fs.mkdtempSync('/root/eos-ocpp-security-');
  const openssl = args => execFileSync('openssl', args, { cwd: directory, stdio: 'pipe', timeout: 5000 });
  function certificate(name, san, issuer = 'ca') {
    openssl(['req', '-new', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-subj',
      `/CN=${name === 'cn-only' ? 'station-a.ocpp.invalid' : name}`, '-keyout', `${name}.key`, '-out', `${name}.csr`]);
    fs.writeFileSync(path.join(directory, `${name}.ext`), `basicConstraints=CA:FALSE\nkeyUsage=digitalSignature\nextendedKeyUsage=${name === 'server' ? 'serverAuth' : 'clientAuth'}\n${san ? `subjectAltName=${san}\n` : ''}`);
    openssl(['x509', '-req', '-in', `${name}.csr`, '-CA', `${issuer}.crt`, '-CAkey', `${issuer}.key`, '-CAcreateserial',
      '-days', '1', '-sha256', '-extfile', `${name}.ext`, '-out', `${name}.crt`]);
    fs.chmodSync(path.join(directory, `${name}.key`), 0o600);
  }
  let server, rpc;
  t.after(async () => {
    if (rpc) await rpc.close({ force: true });
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    fs.rmSync(directory, { recursive: true, force: true });
  });
  for (const name of ['ca', 'rogue']) openssl(['req', '-new', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256',
    '-nodes', '-subj', `/CN=${name}`, '-days', '1', '-sha256', '-addext', 'basicConstraints=critical,CA:TRUE',
    '-keyout', `${name}.key`, '-out', `${name}.crt`]);
  certificate('server', 'DNS:localhost,IP:127.0.0.1');
  certificate('stationA', 'DNS:station-a.ocpp.invalid');
  certificate('wrong-san', 'DNS:station-c.ocpp.invalid');
  certificate('cn-only', '');
  certificate('rogue-client', 'DNS:station-a.ocpp.invalid', 'rogue');
  fs.copyFileSync(path.join(directory, 'ca.crt'), path.join(directory, 'client-ca.crt'));
  fs.writeFileSync(path.join(directory, 'transport.json'), JSON.stringify(settings()));
  const profile = loadTransportProfile(directory);
  assert.equal(profile.tls.minVersion, 'TLSv1.3');
  assert.equal(profile.tls.rejectUnauthorized, true);
  await t.test('mutable and symlink profile files are rejected', () => {
    const config = path.join(directory, 'transport.json');
    fs.chmodSync(config, 0o666);
    assert.throws(() => loadTransportProfile(directory), /FILE_UNSAFE/);
    fs.chmodSync(config, 0o644);
    fs.renameSync(config, path.join(directory, 'saved.json'));
    fs.symlinkSync('saved.json', config);
    assert.throws(() => loadTransportProfile(directory));
    fs.unlinkSync(config); fs.renameSync(path.join(directory, 'saved.json'), config);
  });
  rpc = new RPCServer({ protocols: ['ocpp1.6'], wssOptions: { maxPayload: 262144, perMessageDeflate: false } });
  rpc.auth((accept, reject, handshake) => authenticateHandshake(profile, handshake) ? accept() : reject(403));
  let admitted = 0;
  rpc.on('client', client => { admitted++; client.handle('Heartbeat', async () => ({ currentTime: new Date().toISOString() })); });
  server = createTransport(rpc, profile);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port;
  async function connect(name, identity = 'stationA', extra = {}) {
    return new Promise((resolve, reject) => {
      const credentials = name ? { key: fs.readFileSync(path.join(directory, `${name}.key`)), cert: fs.readFileSync(path.join(directory, `${name}.crt`)) } : {};
      const socket = new WebSocket(`wss://127.0.0.1:${port}/ocpp/${identity}`, 'ocpp1.6', {
        ca: fs.readFileSync(path.join(directory, 'ca.crt')), ...credentials, handshakeTimeout: 2000, ...extra,
      });
      socket.once('open', () => resolve(socket)); socket.once('error', reject);
    });
  }
  await t.test('valid enrolled station exchanges an actual OCPP frame', async () => {
    const socket = await connect('stationA');
    assert.equal(socket._socket.getProtocol(), 'TLSv1.3');
    const response = once(socket, 'message');
    socket.send(JSON.stringify([2, 'test-1', 'Heartbeat', {}]));
    assert.equal(JSON.parse(String((await response)[0]))[0], 3);
    socket.close(); await once(socket, 'close');
  });
  for (const [label, name, identity, extra] of [
    ['missing client certificate', null], ['untrusted issuer', 'rogue-client'], ['wrong SAN', 'wrong-san'],
    ['CN-only certificate', 'cn-only'], ['other enrolled station identifier', 'stationA', 'stationB'],
    ['unenrolled station', 'stationA', 'unknown'], ['TLS1.2 downgrade', 'stationA', 'stationA', { maxVersion: 'TLSv1.2' }],
    ['ambiguous URL/query', 'stationA', 'stationA?token=ignored'],
  ]) await t.test(label, async () => { await assert.rejects(connect(name, identity || 'stationA', extra || {})); });
  await t.test('plaintext HTTP cannot reach the OCPP endpoint', async () => {
    await new Promise((resolve, reject) => {
      const request = http.get(`http://127.0.0.1:${port}/ocpp/stationA`, () => reject(new Error('Plaintext response must not be accepted')));
      request.setTimeout(1000, () => request.destroy()); request.once('error', resolve);
    });
  });
  assert.equal(admitted, 1);
});
