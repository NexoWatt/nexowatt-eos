'use strict';

// Exercise the production trust reader with a deterministic filesystem boundary.
// This harness checks policy/races; installer ownership remains a target-system test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const filename = '/etc/nexowatt/license-trust.json';
const key = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
const raw = Buffer.from(JSON.stringify({ unit: key }));

function fixture(options = {}) {
    const visited = [];
    let closed = false;
    let opened = false;
    let offset = 0;
    const stat = (directory = false, change = {}) => ({
        uid: 0, mode: directory ? 0o755 : 0o644, nlink: 1, dev: 1, ino: 11,
        size: raw.length, isDirectory: () => directory, isFile: () => !directory,
        isSymbolicLink: () => false, ...change,
    });
    const filesystem = {
        lstat: async name => { visited.push(name); return stat(name !== filename, options.stats?.[name]); },
        open: async () => {
            opened = true;
            return {
                stat: async () => stat(false, options.openStat),
                read: async (buffer, start, length) => {
                    const input = options.raw || raw;
                    const count = Math.min(length, input.length - offset, options.chunk || Infinity);
                    if (count > 0) input.copy(buffer, start, offset, offset + count);
                    offset += count;
                    return { bytesRead: count };
                },
                close: async () => { closed = true; },
            };
        },
    };
    const module = { exports: {} };
    const sourcePath = path.resolve(__dirname, '../src/lib/eosLicenseService.js');
    const realRequire = require('node:module').createRequire(sourcePath);
    const context = { module, exports: module.exports, Buffer, JSON, setTimeout, clearTimeout, setInterval, clearInterval,
        process: { platform: options.platform || 'linux' },
        require: name => name === 'node:fs/promises' ? filesystem : realRequire(name) };
    vm.runInNewContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: sourcePath });
    return { read: module.exports.readTrustFile, visited, closed: () => closed, opened: () => opened };
}

test('trusted root-owned complete directory chain accepts bounded public keys', async () => {
    const f = fixture({ chunk: 7 });
    const result = await f.read(filename);
    assert.equal(result.unit, key);
    assert.ok(Object.isFrozen(result));
    assert.deepEqual(f.visited, ['/', '/etc', '/etc/nexowatt', filename]);
    assert.ok(f.closed());
});

test('writable, foreign-owned or symbolic-link ancestor is denied before file open', async () => {
    for (const change of [{ mode: 0o775 }, { mode: 0o1777 }, { uid: 1000 }, { isSymbolicLink: () => true }, { isDirectory: () => false }]) {
        const f = fixture({ stats: { '/etc/nexowatt': change } });
        await assert.rejects(f.read(filename), { code: 'TRUST_PERMISSIONS' });
        assert.equal(f.opened(), false);
    }
});

test('unsafe trust file and inode swap fail closed', async () => {
    for (const change of [{ mode: 0o666 }, { uid: 1000 }, { nlink: 2 }, { isSymbolicLink: () => true }]) {
        const f = fixture({ stats: { [filename]: change } });
        await assert.rejects(f.read(filename), { code: 'TRUST_PERMISSIONS' });
        assert.equal(f.opened(), false);
    }
    for (const openStat of [{ ino: 12 }, { dev: 2 }, { uid: 1000 }, { mode: 0o664 }, { nlink: 2 }]) {
        const f = fixture({ openStat });
        await assert.rejects(f.read(filename), { code: 'TRUST_PERMISSIONS' });
        assert.ok(f.closed());
    }
});

test('read remains bounded after growth and rejects malformed contents with close', async () => {
    for (const options of [
        { raw: Buffer.alloc(32769, 32) },
        { raw: Buffer.from([0xff]) },
        { raw: Buffer.from('{}') },
        { raw: Buffer.from('[]') },
        { openStat: { size: 32769 } },
    ]) {
        const f = fixture(options);
        await assert.rejects(f.read(filename));
        assert.ok(f.closed());
    }
});

test('Windows and noncanonical paths require explicit supported provisioning', async () => {
    await assert.rejects(fixture({ platform: 'win32' }).read(filename), { code: 'TRUST_PLATFORM_UNSUPPORTED' });
    for (const name of [null, '', 'relative.json', '/etc/../etc/nexowatt/license-trust.json', '/etc/\0trust.json']) {
        await assert.rejects(fixture().read(name), { code: 'TRUST_PATH' });
    }
});
