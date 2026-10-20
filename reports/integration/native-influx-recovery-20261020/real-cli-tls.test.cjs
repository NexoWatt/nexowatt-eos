'use strict';
// Manual loopback probe; requires an independently obtained official Influx CLI
// in INFLUX_TEST_CLI and OpenSSL on PATH. Does not start an InfluxDB database.
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const cli = require('../../../components/backitup/build/lib/influxDbCli');
const executable = process.env.INFLUX_TEST_CLI;
if (!executable || !path.isAbsolute(executable)) throw new Error('INFLUX_TEST_CLI must be an absolute executable path');
console.log(`# Binary: ${cp.execFileSync(executable, ['version'], { encoding: 'utf8' }).trim()}`);
console.log(`# SHA256: ${crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex')}`);

for (const operation of ['Backup', 'Restore']) {
    for (const scenario of ['untrusted-ca', 'wrong-hostname', 'trusted-ca']) {
        test(`real CLI ${operation}: ${scenario} with inherited INFLUX_SKIP_VERIFY=true`, async t => {
            const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-influx-tls-'));
            t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
            const key = path.join(directory, 'key.pem'), certificate = path.join(directory, 'cert.pem');
            cp.execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
                '-keyout', key, '-out', certificate, '-days', '1', '-subj', '/CN=localhost',
                '-addext', scenario === 'wrong-hostname' ? 'subjectAltName=DNS:localhost' : 'subjectAltName=IP:127.0.0.1'],
            { stdio: 'ignore', timeout: 15000 });
            const requests = [];
            const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(certificate) }, (req, res) => {
                requests.push({ method: req.method, path: req.url, authenticated: req.headers.authorization === 'Token fixture-tls-token' });
                res.setHeader('Content-Type', 'application/json');
                if (req.url === '/health') {
                    res.writeHead(200);
                    res.end(JSON.stringify({ name: 'influxdb', status: 'pass', version: 'v2.7.10', checks: [] }));
                } else {
                    res.writeHead(503);
                    res.end(JSON.stringify({ code: 'unavailable', message: 'TLS_AUTHENTICATED_FIXTURE_REACHED' }));
                }
            });
            await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
            t.after(() => new Promise(resolve => server.close(resolve)));
            const dump = path.join(directory, 'dump');
            fs.mkdirSync(dump, { mode: 0o700 });
            if (operation === 'Restore') {
                // A synthetic current-format manifest reaches TLS without a live
                // data store. The fixture refuses the first data API operation.
                fs.writeFileSync(path.join(dump, '20261020T000000Z.manifest'), JSON.stringify({
                    manifestVersion: 2, kv: { fileName: 'unused.bolt' }, buckets: [{
                        bucketID: '0000000000000001', bucketName: 'metering', organizationID: '0000000000000002',
                        organizationName: 'fixture', retentionPolicies: [],
                    }],
                }));
            }
            const prior = process.env.INFLUX_SKIP_VERIFY;
            process.env.INFLUX_SKIP_VERIFY = 'true';
            let invocation;
            try {
                invocation = cli[`buildInflux${operation}Invocation`]({
                    exe: executable, dbType: 'remote', dbversion: '2.x', protocol: 'https', host: '127.0.0.1',
                    port: server.address().port, dbName: 'metering', token: 'fixture-tls-token',
                }, dump);
            } finally {
                if (prior === undefined) delete process.env.INFLUX_SKIP_VERIFY;
                else process.env.INFLUX_SKIP_VERIFY = prior;
            }
            assert.equal(invocation.env.INFLUX_SKIP_VERIFY, 'false');
            assert.ok(invocation.args.includes('--skip-verify=false'));
            invocation.env.INFLUX_CONFIGS_PATH = path.join(directory, 'no-config');
            delete invocation.env.INFLUX_ACTIVE_CONFIG;
            if (scenario === 'untrusted-ca') delete invocation.env.SSL_CERT_FILE;
            else invocation.env.SSL_CERT_FILE = certificate;
            const result = await new Promise(resolve => cp.execFile(invocation.executable, invocation.args,
                { env: invocation.env, timeout: 10000, maxBuffer: 1024 * 1024 },
                (error, stdout, stderr) => resolve({ error, text: `${stdout}\n${stderr}` })));
            assert.ok(result.error, 'fixture always terminates before any real backup/restore');
            assert.equal(result.error.killed, false, 'command must terminate without timeout');
            assert.equal(result.text.includes('fixture-tls-token'), false);
            if (scenario === 'untrusted-ca') {
                assert.match(result.text, /certificate signed by unknown authority/);
                assert.equal(requests.length, 0, 'no HTTP request or token before trusted TLS');
            } else if (scenario === 'wrong-hostname') {
                assert.match(result.text, /doesn.t contain any IP SANs|certificate is valid for|cannot validate certificate for/);
                assert.equal(requests.length, 0, 'no HTTP request or token for wrong hostname');
            } else {
                assert.match(result.text, /TLS_AUTHENTICATED_FIXTURE_REACHED/);
                assert.ok(requests.some(req => req.authenticated && req.path.startsWith('/api/v2/')));
            }
        });
    }
}
