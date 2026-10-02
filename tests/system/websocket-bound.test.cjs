'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const crypto = require('node:crypto');
const bound = require('../../runtime/controller-profile/websocket-bound.cjs');
const original = fs.readFileSync(path.join(__dirname, 'controller-profile-fixtures/ws-server-4.5.1.original.txt'));
test('only the pinned upstream transport can be transformed', () => {
    assert.equal(crypto.createHash('sha256').update(original).digest('hex'), bound.ORIGINAL);
    const transformed = bound.transform(original);
    assert.equal(transformed.sha256, bound.OUTPUT);
    assert.throws(() => bound.transform(Buffer.concat([original, Buffer.from('\n')])), /EOS_WEBSOCKET_BUILD_PROFILE/);
    assert.throws(() => bound.transform(Buffer.from(transformed.content)), /EOS_WEBSOCKET_BUILD_PROFILE/);
});
test('real transformed SocketIO passes 1 MiB decompressed-message cap to ws parser before dispatch', () => {
    let options;
    class WebSocketServer { constructor(value) { options = value; } on() {} }
    const module = { exports: {} };
    vm.runInNewContext(bound.transform(original).content, { exports: module.exports, module,
        require: name => name === 'ws' ? { WebSocketServer } : require(name), console, setTimeout, clearTimeout });
    const server = {}; new module.exports.SocketIO(server);
    assert.equal(options.server, server);
    assert.equal(options.maxPayload, 1048576);
});
test('resource bound is mandatory only when the Admin transport is admitted', () => {
    assert.equal(bound.needed([]), false);
    assert.equal(bound.needed([{ package: 'iobroker.nexowatt-ui' }]), false);
    assert.equal(bound.needed([{ package: 'iobroker.eos-admin' }]), true);
});
test('nested or wrong-version transport cannot satisfy top-level transformation', t => {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-ws-resolution-'));
    t.after(() => fs.rmSync(app, { force: true, recursive: true }));
    const admin = path.join(app, 'node_modules/iobroker.eos-admin'); fs.mkdirSync(admin, { recursive: true });
    fs.writeFileSync(path.join(admin, 'package.json'), JSON.stringify({ name: 'iobroker.eos-admin', version: '7.10.11' }));
    const ws = path.join(app, 'node_modules/@iobroker/ws-server'); fs.mkdirSync(path.join(ws, 'build'), { recursive: true });
    fs.writeFileSync(path.join(ws, 'package.json'), JSON.stringify({ name: '@iobroker/ws-server', version: '4.5.1', main: 'build/index.js' }));
    fs.writeFileSync(path.join(ws, 'build/index.js'), original);
    const read = relative => fs.readFileSync(path.join(app, relative));
    bound.identity(app, read);
    fs.writeFileSync(path.join(ws, 'package.json'), JSON.stringify({ name: '@iobroker/ws-server', version: '4.5.2', main: 'build/index.js' }));
    assert.throws(() => bound.identity(app, read), /EOS_WEBSOCKET_BUILD_PROFILE/);
});
test('an unpatched admitted Admin cannot pass the signed-build verification gate', t => {
    const transform = require('../../runtime/controller-profile/transform.cjs');
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-ws-gate-'));
    t.after(() => fs.rmSync(app, { force: true, recursive: true }));
    for (const [relative, expectedHash] of Object.entries(transform.HASHES)) {
        const file = fs.readdirSync(path.join(__dirname, 'controller-profile-fixtures')).find(name => {
            const candidate = path.join(__dirname, 'controller-profile-fixtures', name);
            return fs.statSync(candidate).isFile() && crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex') === expectedHash;
        });
        assert.ok(file, relative);
        fs.mkdirSync(path.dirname(path.join(app, relative)), { recursive: true });
        fs.copyFileSync(path.join(__dirname, 'controller-profile-fixtures', file), path.join(app, relative));
    }
    for (const [name, version, main] of [['iobroker.js-controller', '7.2.2', 'controller.js'],
        ['@iobroker/js-controller-cli', '7.2.2', 'build/cjs/lib/setup.js'],
        ['@iobroker/ws-server', '4.5.1', 'build/index.js'], ['iobroker.eos-admin', '7.10.11', 'build/main.js']]) {
        const dir = path.join(app, 'node_modules', name); fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, version, main }));
    }
    fs.mkdirSync(path.dirname(path.join(app, bound.FILE)), { recursive: true }); fs.writeFileSync(path.join(app, bound.FILE), original);
    const adapters = [{ package: 'iobroker.eos-admin', version: '7.10.11', main: 'build/main.js' }];
    const evidence = transform.applyToBuild(app, adapters);
    assert.ok(evidence.files.some(row => row.relativePath === bound.FILE && row.sha256 === bound.OUTPUT));
    assert.ok(transform.verifyBuildProfile(app, adapters).files.some(row => row.relativePath === bound.FILE));
    fs.writeFileSync(path.join(app, bound.FILE), original);
    assert.throws(() => transform.verifyBuildProfile(app, adapters), /EOS_WEBSOCKET_BUILD_PROFILE/);
});
