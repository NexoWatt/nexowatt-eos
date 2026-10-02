'use strict';
// Real HTTPS/Express/Webserver1.4.0 + maintained OAuth5.3.0 and EOS session
// binding. The ioBroker database adapter is an explicit in-memory fixture.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const https = require('node:https');
const { spawnSync } = require('node:child_process');
const deps = process.env.EOS_ADMIN_DEPENDENCIES;
if (!deps || !path.isAbsolute(deps)) throw new Error('EOS_ADMIN_DEPENDENCIES required');
const express = require(path.join(deps, 'express'));
const webserverRoot = path.join(deps, '@iobroker/webserver');
const resolvedOAuth = require.resolve('oauth2-server', { paths: [webserverRoot] });
const oauthPackage = JSON.parse(fs.readFileSync(path.join(path.dirname(resolvedOAuth), 'package.json')));
assert.equal(oauthPackage.name, '@node-oauth/oauth2-server'); assert.equal(oauthPackage.version, '5.3.0');
const { createOAuth2Server } = require(path.join(webserverRoot, 'build/lib/oauth2'));
const { EosSessionSecurity } = require('../build/lib/eosSessionSecurity');
const { validateTlsMaterial } = require('../build/lib/eosApplianceProfile');
test('maintained OAuth serves TLS password login, refresh, revocation and denied alternate grants', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-oauth-test-'));
    let server, security;
    try {
        assert.equal(spawnSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1',
            '-nodes', '-keyout', path.join(directory, 'key'), '-out', path.join(directory, 'cert'), '-days', '1',
            '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost', '-addext', 'basicConstraints=critical,CA:FALSE'], { stdio: 'ignore' }).status, 0);
        const cert = fs.readFileSync(path.join(directory, 'cert')); const key = fs.readFileSync(path.join(directory, 'key'));
        const sessions = new Map(); const user = { type: 'user', common: { enabled: true, password: 'test-revision-a' }, native: {} };
        const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
        const adapter = { config: {}, log: { warn() {}, info() {}, debug() {}, error() {} },
            getSession(id, cb) { cb(clone(sessions.get(id))); },
            setSession(id, _ttl, value, cb) { sessions.set(id, clone(value)); cb?.(null); },
            async destroySession(id) { sessions.delete(id); },
            async getForeignObjectAsync(id) { return id === 'system.user.admin' ? clone(user) : null; },
            async getObjectViewAsync() { return { rows: [{ id: { en: 'Administrator', de: 'Administrator' }, value: { _id: 'system.group.administrator', type: 'group', common: { members: ['system.user.admin'], acl: {} } } }] }; },
            checkPassword(name, password, cb) { cb(name === 'admin' && password === 'ephemeral-only-test-password', 'system.user.admin'); },
        };
        security = new EosSessionSecurity(adapter);
        const app = express(); app.use(express.urlencoded({ extended: false, limit: '16kb' }));
        app.all(['/sso', '/sso-callback'], (_req, res) => res.status(403).json({ error: 'ssoUnavailableInLocalSecurityProfile' }));
        const model = createOAuth2Server(adapter, { app, secure: true, noBasicAuth: true, accessLifetime: 120, refreshLifetime: 600 });
        security.bindOAuthModel(model);
        app.get('/private', async (req, res) => {
            const token = req.headers.authorization?.replace(/^Bearer /, '');
            const proof = token && await model.getAccessToken(token);
            res.status(proof ? 200 : 401).json({ allowed: !!proof });
        });
        server = https.createServer(validateTlsMaterial(cert, key), app);
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const request = (route, body, token) => new Promise((resolve, reject) => {
            const data = body ? new URLSearchParams(body).toString() : '';
            const req = https.request({ host: '127.0.0.1', servername: 'localhost', port: server.address().port,
                path: route, method: body ? 'POST' : 'GET', ca: cert, rejectUnauthorized: true, minVersion: 'TLSv1.3', agent: false,
                headers: { ...(body ? { 'content-type': 'application/x-www-form-urlencoded', 'content-length': Buffer.byteLength(data) } : {}),
                    ...(token ? { authorization: `Bearer ${token}` } : {}) } }, res => {
                let data = ''; res.on('data', chunk => { data += chunk; if (data.length > 16384) req.destroy(new Error('reply limit')); });
                res.on('end', () => { let body; try { body = JSON.parse(data); } catch { body = { error: 'non-json-response' }; } resolve({ status: res.statusCode, headers: res.headers, body }); });
            });
            req.setTimeout(3000, () => req.destroy(new Error('timeout'))); req.on('error', reject); req.end(data);
        });
        let token, refreshed;
        await t.test('password login issues cookie flags and usable access token', async () => {
            const response = await request('/oauth/token', { grant_type: 'password', client_id: 'ioBroker', username: 'admin', password: 'ephemeral-only-test-password' });
            assert.equal(response.status, 200); assert.equal(typeof response.body.access_token, 'string');
            assert.match(response.headers['set-cookie'][0], /HttpOnly/); assert.match(response.headers['set-cookie'][0], /Secure/);
            assert.match(response.headers['set-cookie'][0], /SameSite=Strict/); token = response.body;
            assert.equal((await request('/private', null, token.access_token)).status, 200);
        });
        await t.test('invalid credentials cannot issue a token', async () => {
            const response = await request('/oauth/token', { grant_type: 'password', client_id: 'ioBroker', username: 'admin', password: 'incorrect-ephemeral-password' });
            assert.equal(response.status, 400); assert.equal(response.body.access_token, undefined);
        });
        await t.test('refresh retains proof and issues usable successor token', async () => {
            const response = await request('/oauth/token', { grant_type: 'refresh_token', client_id: 'ioBroker', refresh_token: token.refresh_token });
            assert.equal(response.status, 200); refreshed = response.body;
            assert.equal((await request('/private', null, refreshed.access_token)).status, 200);
        });
        await t.test('credential change invalidates access and refresh token', async () => {
            user.common.password = 'test-revision-b';
            assert.equal((await request('/private', null, refreshed.access_token)).status, 401);
            const response = await request('/oauth/token', { grant_type: 'refresh_token', client_id: 'ioBroker', refresh_token: refreshed.refresh_token });
            assert.equal(response.status, 400); assert.equal(response.body.access_token, undefined);
        });
        await t.test('SSO and authorization-code grants remain unavailable', async () => {
            assert.equal((await request('/sso?redirectUrl=https://example.invalid')).status, 403);
            const response = await request('/oauth/token', { grant_type: 'authorization_code', client_id: 'ioBroker', code: 'invalid' });
            assert.ok(response.status >= 400); assert.equal(response.body.access_token, undefined);
        });
    } finally {
        security?.stop(); if (server) await new Promise(resolve => server.close(resolve));
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
