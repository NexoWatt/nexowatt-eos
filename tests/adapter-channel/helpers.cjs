'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { X509Certificate, createHash } = require('node:crypto');
function certificates() {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-channel-test-')); fs.chmodSync(directory, 0o700);
    const file = name => path.join(directory, name);
    const run = args => { const r = spawnSync('openssl', args, { stdio: 'pipe', timeout: 5000 }); if (r.error || r.status) throw new Error('TEST_CERTIFICATE_GENERATION_FAILED'); };
    const read = name => fs.readFileSync(file(name), 'utf8');
    run(['req', '-new', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-days', '1', '-subj', '/CN=Temporary EOS channel test CA',
        '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-keyout', file('ca.key'), '-out', file('ca.crt')]);
    const material = {};
    for (const name of ['server', 'sensor.0', 'javascript.0', 'unknown.0', 'expired.0']) {
        const ext = 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n' +
            `extendedKeyUsage=${name === 'server' ? 'serverAuth' : 'clientAuth'}\n` + (name === 'server' ? 'subjectAltName=DNS:localhost,IP:127.0.0.1\n' : '');
        fs.writeFileSync(file(`${name}.ext`), ext);
        run(['req', '-new', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-subj', `/CN=${name === 'server' ? 'localhost' : name}`, '-keyout', file(`${name}.key`), '-out', file(`${name}.csr`)]);
        run(['x509', '-req', '-in', file(`${name}.csr`), '-CA', file('ca.crt'), '-CAkey', file('ca.key'), '-CAcreateserial', '-days', name === 'expired.0' ? '-1' : '1', '-extfile', file(`${name}.ext`), '-out', file(`${name}.crt`)]);
        const cert = read(`${name}.crt`);
        material[name] = { ca: read('ca.crt'), cert, key: read(`${name}.key`), fingerprint256: createHash('sha256').update(new X509Certificate(cert).raw).digest('hex') };
    }
    return { material, close: () => fs.rmSync(directory, { recursive: true, force: true }) };
}
const tlsFor = material => ({ ca: material.ca, cert: material.cert, key: material.key });
function policy(material) {
    return { schemaVersion: 1, revision: 1, peers: [
        { id: 'sensor.0', fingerprint256: material['sensor.0'].fingerprint256, read: ['eos.requests.javascript.0.setpoint'],
            write: [{ id: 'sensor.0.power', type: 'number', mode: 'telemetry', min: -20000, max: 20000 }], send: [{ to: 'javascript.0', command: 'sample' }] },
        { id: 'javascript.0', fingerprint256: material['javascript.0'].fingerprint256, read: ['sensor.0.power'],
            write: [{ id: 'eos.requests.javascript.0.setpoint', type: 'number', mode: 'request', min: 0, max: 4200 }], send: [] },
    ] };
}
module.exports = { certificates, tlsFor, policy };
