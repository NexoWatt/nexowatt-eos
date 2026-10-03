#!/usr/bin/env node
'use strict';
// Root-local physical-possession recovery. No user password enters this CLI.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { reissue, syncDirectory } = require('./state.cjs');
const { loadConfiguration } = require('./main.cjs');
const { rootOwned } = require('../release/installed-check.cjs');
const { fail } = require('./policy.cjs');
function setupIdentity() {
    rootOwned('/usr/bin/id');
    const identity = {};
    for (const [name, option] of [['uid', '-u'], ['gid', '-g']]) {
        const result = spawnSync('/usr/bin/id', [option, 'eos-setup'], { encoding: 'utf8', shell: false,
            timeout: 5000, maxBuffer: 128, env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' }, stdio: ['ignore', 'pipe', 'pipe'] });
        if (result.error || result.status !== 0 || !/^[1-9][0-9]{0,9}\n$/.test(result.stdout || '')) fail('SETUP_OWNER');
        identity[name] = Number(result.stdout.trim());
        if (!Number.isSafeInteger(identity[name]) || identity[name] > 0xfffffffe) fail('SETUP_OWNER');
    }
    return identity;
}
// The filesystem parameter only exercises OS races on an unprivileged test
// runner. The CLI always uses the real filesystem and fixed service identity.
function openOwnedState(file, expected, io = fs) {
    const before = io.lstatSync(file);
    const valid = stat => stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size <= 4096 &&
        stat.uid === expected.uid && (expected.gid === undefined || stat.gid === expected.gid) && !(stat.mode & 0o077);
    if (!valid(before)) fail('SETUP_OWNER');
    const fd = io.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | (fs.constants.O_NONBLOCK || 0));
    try {
        const after = io.fstatSync(fd);
        if (!valid(after) || after.dev !== before.dev || after.ino !== before.ino || after.gid !== before.gid) fail('SETUP_OWNER');
        return fd;
    } catch (error) { io.closeSync(fd); throw error; }
}
function restoreStateOwner(file, identity, io = fs) {
    const fd = openOwnedState(file, { uid: 0 }, io);
    try {
        // Never call chown(path): eos-setup can replace names in its directory.
        // Replacing the path after open cannot redirect this descriptor change.
        io.fchownSync(fd, identity.uid, identity.gid);
        io.fsyncSync(fd);
    } finally { io.closeSync(fd); }
}
function main(argv = process.argv.slice(2)) {
    if (process.getuid?.() !== 0) fail('SETUP_ROOT_REQUIRED');
    if (argv.length !== 0) fail('SETUP_USAGE');
    const config = loadConfiguration('/etc/nexowatt-eos/onboarding.json');
    if (fs.existsSync(config.completionFile)) fail('SETUP_CLOSED');
    const directory = config.stateDirectory, stateFile = path.join(directory, 'state.json');
    const identity = setupIdentity();
    rootOwned(path.dirname(directory));
    const directoryStat = fs.lstatSync(directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== identity.uid ||
        directoryStat.gid !== identity.gid || directoryStat.mode & 0o077) fail('SETUP_OWNER');
    const previous = openOwnedState(stateFile, identity); fs.closeSync(previous);
    const output = '/etc/nexowatt-eos/setup-code.txt'; rootOwned('/etc/nexowatt-eos');
    if (fs.existsSync(output)) rootOwned(output);
    const result = reissue({ directory, releaseId: config.releaseId, origin: config.origin });
    // Preserve the dedicated setup UID after root replaces the state atomically.
    restoreStateOwner(stateFile, identity);
    const temporary = output + '.new';
    const fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    try { fs.writeFileSync(fd, `NexoWatt EOS Einrichtungscode\n${result.code}\nGültig bis: ${new Date(result.expiresAt).toISOString()}\nAdresse: ${config.origin}\n`); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temporary, output); syncDirectory('/etc/nexowatt-eos');
    return { status: 'SETUP_CODE_REISSUED', codeFile: output, expiresAt: new Date(result.expiresAt).toISOString() };
}
if (require.main === module) {
    try { process.stdout.write(JSON.stringify(main()) + '\n'); }
    catch { process.stderr.write('{"code":"SETUP_CODE_REISSUE_FAILED"}\n'); process.exitCode = 1; }
}
module.exports = { main, openOwnedState, restoreStateOwner };
