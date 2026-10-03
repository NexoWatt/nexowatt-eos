'use strict';
// A root-owned lock blocks unattended restart during incomplete maintenance.
// A temporary trial permit is tied to the coordinator's boot ID and process
// start time; a crash or reused PID cannot silently turn it into a boot permit.
const fs = require('node:fs');
const path = require('node:path');
const { rootOwned } = require('./installed-check.cjs');
const { readFileLimited } = require('./bundle.cjs');
const DEFAULT_DIRECTORY = '/etc/nexowatt-eos';
const LOCK = '.activation.lock', PERMIT = 'maintenance-start.json';
const OPERATIONS = new Set(['ui-onboarding', 'additive-release', 'certificate-rotation', 'web-certificate-rotation', 'test-release-repair']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
function processIdentity(pid) {
    if (pid !== undefined && (!Number.isSafeInteger(pid) || pid < 2)) fail('MAINTENANCE_PID');
    const bootId = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
    // /proc may be mounted from a containing PID namespace. Record the PID
    // actually exposed by that filesystem, so readers resolve the same process.
    const text = fs.readFileSync(pid === undefined ? '/proc/self/stat' : `/proc/${pid}/stat`, 'utf8');
    const observedPid = Number(text.slice(0, text.indexOf(' ')));
    if (!Number.isSafeInteger(observedPid) || observedPid < 2 || pid !== undefined && observedPid !== pid) fail('MAINTENANCE_PROCESS');
    if (text.length > 8192 || !/^[a-f0-9-]{36}$/.test(bootId)) fail('MAINTENANCE_PROCESS');
    const end = text.lastIndexOf(')'); const columns = text.slice(end + 2).trim().split(/\s+/);
    if (end < 0 || columns[0] === 'Z' || columns[0] === 'X' || !/^[0-9]+$/.test(columns[19] || '')) fail('MAINTENANCE_PROCESS');
    return { pid: observedPid, startTicks: columns[19], bootId };
}
function sync(directory) { const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
function checkLock(directory) {
    rootOwned(directory); const lock = path.join(directory, LOCK);
    try { const stat = fs.lstatSync(lock); if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0 || stat.nlink !== 1 || stat.mode & 0o022) fail('MAINTENANCE_LOCK'); return true; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
function authorizeStart(directory = DEFAULT_DIRECTORY, operation) {
    if (process.getuid?.() !== 0 || !OPERATIONS.has(operation) || !checkLock(directory)) fail('MAINTENANCE_AUTHORIZATION');
    const permit = { version: 1, operation, ...processIdentity() };
    const temporary = path.join(directory, `.maintenance-start-${process.pid}.tmp`);
    const fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o644);
    try { fs.writeFileSync(fd, JSON.stringify(permit) + '\n'); fs.fchmodSync(fd, 0o644); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temporary, path.join(directory, PERMIT)); sync(directory);
    return permit;
}
function blockStart(directory = DEFAULT_DIRECTORY) {
    if (process.getuid?.() !== 0) fail('MAINTENANCE_AUTHORIZATION'); rootOwned(directory);
    const permit = path.join(directory, PERMIT);
    try { rootOwned(permit); fs.unlinkSync(permit); sync(directory); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
function checkStart(directory = DEFAULT_DIRECTORY) {
    if (!checkLock(directory)) {
        if (fs.existsSync(path.join(directory, PERMIT))) fail('MAINTENANCE_ORPHAN_PERMIT');
        return { status: 'NORMAL_START_ALLOWED' };
    }
    const file = path.join(directory, PERMIT); rootOwned(file);
    const record = JSON.parse(readFileLimited(file, 4096).bytes);
    if (Object.keys(record).sort().join('|') !== 'bootId|operation|pid|startTicks|version' || record.version !== 1 || !OPERATIONS.has(record.operation)) fail('MAINTENANCE_PERMIT');
    const current = processIdentity(record.pid);
    if (current.startTicks !== record.startTicks || current.bootId !== record.bootId) fail('MAINTENANCE_STALE_PERMIT');
    return { status: 'CONTROLLED_TRIAL_ALLOWED', operation: record.operation };
}
module.exports = { DEFAULT_DIRECTORY, LOCK, PERMIT, processIdentity, authorizeStart, blockStart, checkStart };
if (require.main === module) {
    try { if (process.argv.length !== 2) fail('MAINTENANCE_USAGE'); process.stdout.write(JSON.stringify(checkStart()) + '\n'); }
    catch { process.stderr.write('{"status":"START_BLOCKED","code":"MAINTENANCE_INCOMPLETE"}\n'); process.exitCode = 1; }
}
