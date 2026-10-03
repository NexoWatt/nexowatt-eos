'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openOwnedState, restoreStateOwner } = require('../../runtime/onboarding/issue-code.cjs');
const storage = require('../../runtime/onboarding/state.cjs');
function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-code-owner-')); fs.chmodSync(directory, 0o700);
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'state.json');
    fs.writeFileSync(file, '{}', { mode: 0o600 });
    const calls = [];
    // Only POSIX identity/mode metadata is simulated on Windows. Names, file
    // descriptors and inode comparisons below use real local file operations.
    const metadata = stat => Object.assign(Object.create(stat), { uid: 0, gid: 0, mode: 0o100600 });
    const io = { ...fs, lstatSync: target => metadata(fs.lstatSync(target)), fstatSync: fd => metadata(fs.fstatSync(fd)),
        fchownSync: (fd, uid, gid) => { calls.push({ fd, uid, gid, inode: fs.fstatSync(fd).ino }); },
        fsyncSync: fd => { if (process.platform !== 'win32') fs.fsyncSync(fd); },
        chownSync: () => { throw new Error('PATH_CHOWN_FORBIDDEN'); } };
    return { directory, file, io, calls };
}
test('local reissue engine produces new state; owner restoration uses only its validated open descriptor', t => {
    const f = fixture(t); fs.unlinkSync(f.file);
    const params = { directory: f.directory, releaseId: 'a'.repeat(64), origin: 'https://eos.test:8443' };
    const before = storage.prepare(params), after = storage.reissue(params);
    assert.notEqual(before.setupId, after.setupId); assert.notEqual(before.code, after.code);
    const expectedInode = fs.statSync(f.file).ino;
    restoreStateOwner(f.file, { uid: 1234, gid: 1234 }, f.io);
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0].inode, expectedInode);
    assert.equal(f.calls[0].uid, 1234); assert.equal(f.calls[0].gid, 1234);
});
test('previous state must be regular, singly linked, private and owned by the expected setup identity', t => {
    const f = fixture(t);
    assert.throws(() => openOwnedState(f.file, { uid: 1234, gid: 1234 }, f.io), /SETUP_OWNER/);
    for (const patch of [{ nlink: 2 }, { mode: 0o100644 }, { isSymbolicLink: () => true }, { isFile: () => false }]) {
        const unsafe = { ...f.io, lstatSync: target => Object.assign(Object.create(f.io.lstatSync(target)), patch) };
        assert.throws(() => restoreStateOwner(f.file, { uid: 1234, gid: 1234 }, unsafe), /SETUP_OWNER/);
    }
    assert.equal(f.calls.length, 0);
});
test('replacement between lstat and open is rejected before any ownership change', t => {
    const f = fixture(t);
    const io = { ...f.io, openSync: (target, flags) => {
        assert.equal(flags & (fs.constants.O_NOFOLLOW || 0), fs.constants.O_NOFOLLOW || 0);
        fs.renameSync(target, path.join(f.directory, 'old-state.json'));
        fs.writeFileSync(target, 'replacement', { mode: 0o600 });
        return fs.openSync(target, flags);
    } };
    assert.throws(() => restoreStateOwner(f.file, { uid: 1234, gid: 1234 }, io), /SETUP_OWNER/);
    assert.equal(f.calls.length, 0);
});
test('symlink-follow result from a path race is rejected by descriptor identity even if the OS open were permissive', t => {
    const f = fixture(t); const other = path.join(f.directory, 'protected-target');
    fs.writeFileSync(other, 'protected');
    const io = { ...f.io, openSync: () => fs.openSync(other, 'r') };
    assert.throws(() => restoreStateOwner(f.file, { uid: 1234, gid: 1234 }, io), /SETUP_OWNER/);
    assert.equal(f.calls.length, 0); assert.equal(fs.readFileSync(other, 'utf8'), 'protected');
});
test('replacement after descriptor validation cannot redirect fchown to the new path', t => {
    const f = fixture(t); const originalInode = fs.statSync(f.file).ino;
    const io = { ...f.io, fchownSync: (fd, uid, gid) => {
        fs.renameSync(f.file, path.join(f.directory, 'old-state.json'));
        fs.writeFileSync(f.file, 'new target', { mode: 0o600 });
        assert.notEqual(fs.statSync(f.file).ino, originalInode);
        f.io.fchownSync(fd, uid, gid);
    } };
    restoreStateOwner(f.file, { uid: 1234, gid: 1234 }, io);
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0].inode, originalInode);
});
