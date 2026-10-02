'use strict';
// Reproducible review fixture: execute the actual candidate dispatcher and the
// current EOS session/policy source. No real server, account or secret is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const dependencies = process.env.EOS_REVIEW_DEPENDENCIES;
assert.ok(dependencies && path.isAbsolute(dependencies), 'absolute isolated candidate dependency directory required');
const dependency = path.join(dependencies, '@iobroker/socket-classes');
const pkg = JSON.parse(fs.readFileSync(path.join(dependency, 'package.json')));
assert.equal(pkg.name, '@iobroker/socket-classes');
assert.equal(pkg.version, '2.6.0');
const commonTools = require(path.join(dependencies, '@iobroker/js-controller-common-db')).tools;
assert.equal(typeof commonTools.pattern2RegEx, 'function');
const load = Module._load;
let SocketCommandsAdmin;
try {
    Module._load = function(name, parent, main) {
        if (name === '@iobroker/adapter-core') return { commonTools };
        return load.call(this, name, parent, main);
    };
    ({ SocketCommandsAdmin } = require(path.join(dependency, 'build/lib/socketCommandsAdmin')));
} finally { Module._load = load; }
const policyFile = 'components/admin/src/lib/eosApplianceProfile.js';
const sessionFile = 'components/admin/src/lib/eosSessionSecurity.js';
const policy = require(path.join(root, policyFile));
const { EosSessionSecurity } = require(path.join(root, sessionFile));
const objects = {
    'system.config': { _id: 'system.config', type: 'config', common: {}, native: { secret: 'NON_SECRET_REVIEW_FIXTURE' },
        acl: { owner: 'system.user.admin', ownerGroup: 'system.group.administrator', object: 0x664 } },
    'system.user.service': { _id: 'system.user.service', type: 'user', common: { password: 'NON_SECRET_REVIEW_FIXTURE' }, native: {} },
};
const checks = [];
const adapter = { name: 'admin', config: {}, log: { debug() {}, info() {}, warn() {}, error() {} },
    subscribeForeignObjectsAsync: async () => {}, subscribeForeignStatesAsync: async () => {},
    subscribeForeignFiles: async () => {}, getSession() {}, setSession() {} };
const makeSocket = () => ({ id: 'review-fixture', _acl: { user: 'system.user.test_installer', groups: ['system.group.installateur'],
    object: { list: true, read: true }, users: { list: true, read: true } }, events: [], emit(...event) { this.events.push(event); }, on() {} });
const baseline = new SocketCommandsAdmin(adapter, () => true, {}, objects, {});
let baselineOutput;
baseline.commands.getAllObjects(makeSocket(), (error, output) => { assert.equal(error, null); baselineOutput = output; });
assert.equal(baselineOutput['system.config'].native.secret, 'NON_SECRET_REVIEW_FIXTURE');
assert.equal(baselineOutput['system.user.service'].common.password, 'NON_SECRET_REVIEW_FIXTURE');

for (const role of ['installer', 'enduser']) {
    const commands = new SocketCommandsAdmin(adapter, () => true, {}, objects, {});
    policy.installSocketBoundary(commands, (_socket, command, args) => policy.roleSocketCommandAllowed(role, command, args), () => objects);
    const socket = makeSocket();
    for (const command of ['getAllObjects', 'getObjects', 'getObject']) {
        let result, output;
        const callback = (error, data) => { result = error; output = data; };
        commands.commands[command](socket, ...(command === 'getObject' ? ['system.user.service'] : []), callback);
        assert.equal(result, policy.ERROR); assert.equal(output, undefined);
        checks.push({ role, command, result: 'denied-before-upstream-read' });
    }
    // Admin's global database subscription uses a null socket. It does not
    // subscribe individual connected browsers or publish to them implicitly.
    commands.subscribe(null, 'objectChange', '*');
    assert.equal(socket.subscribe, undefined);
    assert.equal(commands.publish(socket, 'objectChange', 'system.user.service', objects['system.user.service']), false);
    assert.equal(socket.events.length, 0);
    checks.push({ role, command: 'global-object-publication', result: 'no-implicit-browser-subscription-or-publication' });
    for (const command of ['subscribeObjects', 'subscribe', 'subscribeFiles', 'clientSubscribe']) {
        let result;
        assert.equal(typeof commands.commands[command], 'function');
        commands.commands[command](socket, '*', '*', error => { result = error; });
        assert.equal(result, policy.ERROR);
        assert.equal(socket.subscribe, undefined);
        checks.push({ role, command, result: 'denied-before-subscription' });
    }
    assert.equal(commands.publish(socket, 'objectChange', 'system.user.service', objects['system.user.service']), false);
    assert.equal(commands.publish(socket, 'stateChange', 'fixture.state', { val: 'NON_SECRET_REVIEW_FIXTURE' }), false);
    assert.equal(commands.publishFile(socket, 'fixture', 'file.json', 1), false);
    assert.equal(socket.events.length, 0);
    checks.push({ role, command: 'post-denial-publication', result: 'no-object-state-file-events' });
}

// Deliberately leave the transport and its wildcard subscription alive after
// revocation. The actual EOS session guard must independently deny publication.
const security = new EosSessionSecurity(adapter);
const handlers = new Map();
const socketAdmin = { addEventHandler(name, callback) { handlers.set(name, callback); },
    __updateSession() { return true; }, __getUserFromSocket() {}, unsubscribeSocket() {} };
security.bindSockets(socketAdmin);
try {
    const socket = makeSocket(); handlers.get('connect')(socket);
    const commands = new SocketCommandsAdmin(adapter, item => socketAdmin.__updateSession(item), {}, objects, {});
    commands.subscribe(socket, 'objectChange', '*');
    assert.equal(commands.publish(socket, 'objectChange', 'system.config', objects['system.config']), true);
    const before = socket.events.filter(event => event[0] === 'objectChange').length;
    security.handleObjectChange('system.group.administrator', { type: 'group', common: { members: [] } },
        { type: 'group', common: { members: ['system.user.admin'] } });
    assert.equal(security.isSocketAllowed(socket), false);
    assert.equal(commands.publish(socket, 'objectChange', 'system.user.service', objects['system.user.service']), false);
    assert.equal(socket.events.filter(event => event[0] === 'objectChange').length, before);
    checks.push({ role: 'previously-privileged', command: 'publication-after-security-object-change',
        result: 'actual-session-guard-denies-even-if-transport-and-subscription-remain' });
} finally { security.stop(); }
const sha = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const files = [policyFile, sessionFile, 'reports/integration/raw/branding-roles-review-socket.cjs']
    .map(filename => ({ path: filename, sha256: sha(path.join(root, filename)) }));
for (const filename of ['package.json', 'build/lib/socketCommandsAdmin.js', 'build/lib/socketCommands.js', 'build/lib/socketAdmin.js']) {
    files.push({ path: `${pkg.name}/${filename}`, sha256: sha(path.join(dependency, filename)) });
}
for (const filename of ['package.json', 'build/cjs/lib/common/tools.js']) {
    const relative = `@iobroker/js-controller-common-db/${filename}`;
    files.push({ path: relative, sha256: sha(path.join(dependencies, relative)) });
}
process.stdout.write(JSON.stringify({ schemaVersion: 2, createdAt: new Date().toISOString(),
    test: 'real-candidate-socket-read-subscription-publication-boundaries', status: 'passed',
    scope: 'Actual SocketCommandsAdmin 2.6.0 and EOS policy/session source, with database, adapter-core discovery and transport fixtures; no network or hardware test.',
    correction: 'Supersedes earlier review JSON whose version label said 2.3.4 incorrectly; that earlier fixture also loaded this candidate path (2.6.0). Version is now asserted from actual package metadata.',
    environment: { node: process.version, platform: process.platform, arch: process.arch, dependencyVersion: pkg.version },
    command: 'EOS_REVIEW_DEPENDENCIES=<isolated-candidate>/app/node_modules node reports/integration/raw/branding-roles-review-socket.cjs',
    baseline: { configSecretExposed: true, unacledUserPasswordExposed: true, valuesAreNonSecretFixtureMarkers: true },
    checkCount: checks.length, checks, files,
    limits: ['The upstream publish primitive does not apply object ACLs itself; this EOS boundary relies on denying non-Service subscription commands and revoking existing sessions.',
        'Missed database-change events rely additionally on the existing five-second watchdog; this fixture checks the ordinary synchronous event path.',
        'No full product penetration test, live browser, hardware or cross-process atomicity claim.'] }, null, 2) + '\n');
