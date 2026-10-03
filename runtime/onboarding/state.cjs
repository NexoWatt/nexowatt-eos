'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fail, validateOrigin, validateHandoff } = require('./policy.cjs');
const CODE_TTL = 10 * 60 * 1000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function directorySafe(directory) {
    if (!path.isAbsolute(directory) || path.resolve(directory) !== directory) fail('SETUP_STORAGE');
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || process.platform !== 'win32' && stat.mode & 0o077) fail('SETUP_STORAGE');
}
function read(directory, name, limit = 32768) {
    directorySafe(directory);
    const file = path.join(directory, name);
    const before = fs.lstatSync(file);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > limit ||
        process.platform !== 'win32' && before.mode & 0o077) fail('SETUP_STORAGE');
    const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try {
        const stat = fs.fstatSync(fd);
        if (stat.dev !== before.dev || stat.ino !== before.ino || stat.size > limit) fail('SETUP_STORAGE');
        const bytes = Buffer.alloc(limit + 1); const size = fs.readSync(fd, bytes, 0, bytes.length, 0);
        if (size > limit) fail('SETUP_STORAGE');
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size)));
    } finally { fs.closeSync(fd); }
}
function syncDirectory(directory) {
    if (process.platform === 'win32') return;
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function write(directory, name, value) {
    directorySafe(directory);
    const temporary = path.join(directory, `.pending-${crypto.randomBytes(12).toString('hex')}`);
    const fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    try { fs.renameSync(temporary, path.join(directory, name)); syncDirectory(directory); }
    finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function validateState(state) {
    if (state?.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(state.releaseId || '') ||
        !/^[a-f0-9]{32}$/.test(state.setupId || '') || !['awaiting-code', 'claimed', 'committing', 'blocked'].includes(state.state) ||
        !Number.isSafeInteger(state.expiresAt) || !Number.isSafeInteger(state.attempts) || state.attempts < 0 || state.attempts > 8 ||
        !(state.codeHash === null || /^[a-f0-9]{64}$/.test(state.codeHash || ''))) fail('SETUP_STATE');
    validateOrigin(state.origin);
    return state;
}
function prepare({ directory, releaseId, origin, now = Date.now() }) {
    validateOrigin(origin);
    if (!/^[a-f0-9]{64}$/.test(releaseId) || !Number.isSafeInteger(now) || now < 0) fail('SETUP_INPUT');
    directorySafe(directory);
    const unlock = lock(directory);
    try {
        if (fs.existsSync(path.join(directory, 'state.json'))) fail('SETUP_ALREADY_PREPARED');
        return issue(directory, { releaseId, origin }, now);
    } finally { unlock(); }
}
function lock(directory) {
    directorySafe(directory);
    const file = path.join(directory, 'mutation.lock');
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600);
    fs.fsyncSync(fd); syncDirectory(directory);
    return () => { fs.closeSync(fd); fs.unlinkSync(file); syncDirectory(directory); };
}
function issue(directory, { releaseId, origin }, now) {
    const code = crypto.randomBytes(24).toString('base64url');
    const state = { schemaVersion: 1, releaseId, setupId: crypto.randomBytes(16).toString('hex'), origin,
        state: 'awaiting-code', codeHash: hash(code), expiresAt: now + CODE_TTL, attempts: 0 };
    write(directory, 'state.json', state);
    return { code, expiresAt: state.expiresAt, setupId: state.setupId };
}
function reissue({ directory, releaseId, origin, now = Date.now() }) {
    validateOrigin(origin);
    if (!Number.isSafeInteger(now) || now < 0) fail('SETUP_INPUT');
    const unlock = lock(directory);
    try {
        const previous = readState(directory);
        if (previous.releaseId !== releaseId || previous.origin !== origin || !['awaiting-code', 'claimed'].includes(previous.state) ||
            fs.existsSync(path.join(directory, 'handoff.json')) || fs.existsSync(path.join(directory, 'commit.lock'))) fail('SETUP_REISSUE_BLOCKED');
        return issue(directory, { releaseId, origin }, now);
    } finally { unlock(); }
}
function readState(directory) { return validateState(read(directory, 'state.json', 4096)); }
function readHandoff(directory, releaseId) {
    const state = readState(directory);
    const handoff = validateHandoff(read(directory, 'handoff.json', 65536), releaseId);
    if (state.state !== 'committing' || state.releaseId !== releaseId || state.setupId !== handoff.setupId || state.codeHash !== null) fail('SETUP_HANDOFF');
    return handoff;
}
module.exports = { CODE_TTL, hash, read, write, readState, readHandoff, prepare, reissue, lock, directorySafe, syncDirectory };
