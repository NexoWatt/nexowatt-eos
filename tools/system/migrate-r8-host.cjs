'use strict';
// One-time R8 host adoption. The caller authenticates both complete releases,
// persists this plan in its private journal, owns the activation gate, and has
// stopped every runtime process before apply/rollback. No fresh installation,
// account/database recreation, package download or configuration reset occurs.
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual: equal } = require('node:util');
const { rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited, sha256, validatePublicKey } = require('../../runtime/release/bundle.cjs');
const crypto = require('node:crypto');
const { installManagedUpdates, UNIT: UPDATE_UNIT } = require('./install-managed-updates.cjs');
const { command, toolTrust } = require('./host-preflight.cjs');
const { UNITS } = require('./postgresql-host-preflight.cjs');
const R8 = 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7';
const NETWORK = 'tools/system/install-network-host.py';
const OS_TIMER = 'nexowatt-eos-os-updates.timer';
const CERT_TIMER = 'nexowatt-eos-pg-certificates.timer';
const CERT_SERVICE = 'nexowatt-eos-pg-certificates.service';
const TRUST = '/etc/nexowatt-eos/update-trust.pem';
const DATA = '/var/lib/nexowatt-eos-updates';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && equal(Object.keys(value).sort(), [...keys].sort());
function sync(directory) {
    const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function replaceUnit(file, bytes) {
    const directory = path.dirname(file), temporary = path.join(directory, '.eos-r8-unit-' + crypto.randomBytes(12).toString('hex'));
    let descriptor;
    try {
        descriptor = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
        // Set the final signed mode before rename, independently of root's
        // umask; even a later directory-fsync failure leaves rollback-readable bytes.
        fs.fchmodSync(descriptor, 0o644); fs.writeFileSync(descriptor, bytes); fs.fsyncSync(descriptor);
        fs.closeSync(descriptor); descriptor = undefined;
        fs.renameSync(temporary, file); sync(directory);
    } finally {
        if (descriptor !== undefined) fs.closeSync(descriptor);
        try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
}
const exists = file => { try { fs.lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
function context(dependencies = {}) {
    const { root = '/', owner = rootOwned, exec = command, trust = toolTrust, write = replaceUnit } = dependencies;
    if ((dependencies.uid ?? process.getuid?.()) !== 0) fail('R8_HOST_ROOT_REQUIRED');
    const at = name => path.join(root, name);
    const read = (name, max = 65536) => {
        const file = at(name); owner(file);
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || (stat.mode & 0o7777) !== 0o644) fail('R8_HOST_FILE');
        return readFileLimited(file, max).bytes;
    };
    const run = (binary, args) => {
        if (!trust(binary, root)?.trusted) fail('R8_HOST_TOOL');
        const result = exec(binary, args, { timeout: 90000 });
        if (result.error || result.status !== 0) fail('R8_HOST_COMMAND');
        return result.stdout || '';
    };
    const network = (operation, releaseId) => {
        const stdout = run('/usr/bin/python3', ['-I', at('/opt/nexowatt/eos/releases/' + releaseId + '/' + NETWORK), '--' + operation, releaseId]);
        let value; try { value = JSON.parse(stdout); } catch { fail('R8_HOST_NETWORK'); }
        if (value?.ok !== true || value.operation !== operation || value.releaseId !== releaseId || value.configured !== false) fail('R8_HOST_NETWORK');
    };
    return { root, owner, at, read, run, network, write };
}
function sourcePlan(options, c) {
    if (!options || !hash(options.releaseId) || options.releaseId === R8 || !hash(options.publicKeySha256) ||
        options.previousReleasePath !== '/opt/nexowatt/eos/releases/' + R8 ||
        options.targetReleasePath !== '/opt/nexowatt/eos/releases/' + options.releaseId) fail('R8_HOST_INPUT');
    const old = options.previousReleasePath, target = options.targetReleasePath;
    const key = c.read('/opt/nexowatt/eos/verified/' + options.releaseId + '/release-public.pem', 16384);
    validatePublicKey(key);
    if (sha256(key) !== options.publicKeySha256) fail('R8_HOST_TRUST');
    const template = c.read(target + '/system/managed-test/' + UPDATE_UNIT, 16384).toString('utf8');
    if (template.split('@RELEASE_ID@').length !== 3) fail('R8_HOST_TEMPLATE');
    return {
        schemaVersion: 1, kind: 'eos-r8-managed-host-plan', previousReleaseId: R8,
        releaseId: options.releaseId, publicKeySha256: options.publicKeySha256,
        units: UNITS.map(unit => ({ unit, beforeSha256: sha256(c.read(old + '/system/postgresql-test/systemd/' + unit)),
            afterSha256: sha256(c.read(target + '/system/postgresql-test/systemd/' + unit)) })),
        updateUnitSha256: sha256(Buffer.from(template.replaceAll('@RELEASE_ID@', options.releaseId))),
        networkInstallerSha256: sha256(c.read(target + '/' + NETWORK)),
    };
}
function timerState(c) {
    const output = c.run('/usr/bin/systemctl', ['show', CERT_TIMER, '--property=UnitFileState', '--property=ActiveState']);
    const rows = output.trim().split(/\r?\n/), fields = {};
    for (const row of rows) {
        const match = /^(UnitFileState|ActiveState)=([a-z]+)$/.exec(row);
        if (!match || Object.hasOwn(fields, match[1])) fail('R8_HOST_CERTIFICATE_TIMER');
        fields[match[1]] = match[2];
    }
    if (!exact(fields, ['UnitFileState', 'ActiveState']) || !['enabled', 'disabled'].includes(fields.UnitFileState) ||
        !['active', 'inactive'].includes(fields.ActiveState)) fail('R8_HOST_CERTIFICATE_TIMER');
    return { unitFileState: fields.UnitFileState, activeState: fields.ActiveState };
}
function certificateIdle(c) {
    if (c.run('/usr/bin/systemctl', ['show', CERT_SERVICE, '--property=ActiveState', '--value']).trim() !== 'inactive')
        fail('R8_HOST_CERTIFICATE_BUSY');
}
function pauseCertificateTimer(plan, c) {
    const before = timerState(c);
    if (before.unitFileState !== plan.certificateTimer.unitFileState) fail('R8_HOST_CERTIFICATE_TIMER');
    certificateIdle(c);
    c.run('/usr/bin/systemctl', ['stop', CERT_TIMER]);
    certificateIdle(c); // A trigger racing the timer stop is never killed.
    const after = timerState(c);
    if (after.activeState !== 'inactive' || after.unitFileState !== plan.certificateTimer.unitFileState) fail('R8_HOST_CERTIFICATE_TIMER');
}
function checked(plan, c) {
    if (!exact(plan, ['schemaVersion', 'kind', 'previousReleaseId', 'releaseId', 'publicKeySha256', 'units', 'updateUnitSha256', 'networkInstallerSha256', 'certificateTimer'])) fail('R8_HOST_PLAN');
    const expected = sourcePlan({ releaseId: plan.releaseId, publicKeySha256: plan.publicKeySha256,
        previousReleasePath: '/opt/nexowatt/eos/releases/' + R8, targetReleasePath: '/opt/nexowatt/eos/releases/' + plan.releaseId }, c);
    if (!exact(plan.certificateTimer, ['unitFileState', 'activeState']) ||
        !['enabled', 'disabled'].includes(plan.certificateTimer.unitFileState) ||
        !['active', 'inactive'].includes(plan.certificateTimer.activeState)) fail('R8_HOST_PLAN');
    expected.certificateTimer = plan.certificateTimer;
    if (!equal(plan, expected)) fail('R8_HOST_PLAN');
    return expected;
}
function assertUnits(plan, c, expected) {
    for (const row of plan.units) {
        const digest = sha256(c.read('/etc/systemd/system/' + row.unit));
        if (!(Array.isArray(expected) ? expected : [expected]).some(key => row[key] === digest)) fail('R8_HOST_UNIT_CHANGED');
    }
}
function prepare(options, dependencies = {}) {
    const c = context(dependencies), plan = sourcePlan(options, c);
    for (const name of ['/etc/systemd/system', '/etc/nexowatt-eos', '/var/lib']) c.owner(c.at(name));
    assertUnits(plan, c, 'beforeSha256');
    for (const name of [TRUST, DATA, '/etc/systemd/system/' + UPDATE_UNIT]) if (exists(c.at(name))) fail('R8_HOST_EXISTS');
    c.network('check', plan.releaseId);
    plan.certificateTimer = timerState(c); certificateIdle(c);
    return plan;
}
function apply(plan, dependencies = {}) {
    const c = context(dependencies); checked(plan, c); assertUnits(plan, c, 'beforeSha256');
    for (const name of [TRUST, DATA, '/etc/systemd/system/' + UPDATE_UNIT]) if (exists(c.at(name))) fail('R8_HOST_EXISTS');
    pauseCertificateTimer(plan, c);
    // Caller marks this stage attempted before entry; even a partial network
    // install is recoverable through its durable, release-bound private journal.
    c.network('install', plan.releaseId);
    for (const row of plan.units) {
        if (sha256(c.read('/etc/systemd/system/' + row.unit)) !== row.beforeSha256) fail('R8_HOST_UNIT_CHANGED');
        c.write(c.at('/etc/systemd/system/' + row.unit), c.read('/opt/nexowatt/eos/releases/' + plan.releaseId + '/system/postgresql-test/systemd/' + row.unit));
    }
    (dependencies.installUpdates || installManagedUpdates)({ releaseId: plan.releaseId, publicKeySha256: plan.publicKeySha256 }, { root: c.root, owner: c.owner });
    c.run('/usr/bin/systemctl', ['daemon-reload']);
    assertUnits(plan, c, 'afterSha256');
    return { applied: true, updateServiceStarted: false };
}
function activate(plan, dependencies = {}) {
    const c = context(dependencies); checked(plan, c); assertUnits(plan, c, 'afterSha256');
    if (sha256(c.read(TRUST, 16384)) !== plan.publicKeySha256 ||
        sha256(c.read('/etc/systemd/system/' + UPDATE_UNIT, 16384)) !== plan.updateUnitSha256) fail('R8_HOST_UPDATE_CHANGED');
    const current = c.at('/opt/nexowatt/eos/current');
    c.owner(path.dirname(current));
    const pointer = fs.lstatSync(current);
    let state; try { state = JSON.parse(c.read('/etc/nexowatt-eos/release-state.json')); } catch { fail('R8_HOST_ACTIVE_STATE'); }
    if (!pointer.isSymbolicLink() || pointer.uid !== (dependencies.ownerUid ?? 0) ||
        fs.readlinkSync(current) !== '/opt/nexowatt/eos/releases/' + plan.releaseId ||
        state?.releaseId !== plan.releaseId || state.publicKeySha256 !== plan.publicKeySha256 || state.profile !== 'test' ||
        !Number.isSafeInteger(state.sequence) || state.sequence < 15 ||
        !require('../../runtime/updates/node-policy.cjs').supportedVersion(state.nodeVersion)) fail('R8_HOST_ACTIVE_STATE');
    c.run('/usr/bin/systemctl', ['enable', '--now', OS_TIMER, UPDATE_UNIT]);
    c.run('/usr/bin/systemctl', ['is-active', '--quiet', OS_TIMER, UPDATE_UNIT]);
    restoreCertificateTimer(plan, dependencies);
    return { activated: true };
}
function rollback(plan, dependencies = {}) {
    const c = context(dependencies); checked(plan, c);
    // Validate every owned replacement before stopping services or restoring any
    // bytes. A foreign edit means the parent must retain its startup gate.
    assertUnits(plan, c, ['beforeSha256', 'afterSha256']);
    const update = '/etc/systemd/system/' + UPDATE_UNIT;
    for (const [file, digest] of [[TRUST, plan.publicKeySha256], [update, plan.updateUnitSha256]])
        if (exists(c.at(file)) && sha256(c.read(file, 16384)) !== digest) fail('R8_HOST_UPDATE_CHANGED');
    pauseCertificateTimer(plan, c);
    if (exists(c.at(update))) c.run('/usr/bin/systemctl', ['disable', '--now', UPDATE_UNIT]);
    c.network('rollback', plan.releaseId);
    for (const row of plan.units) {
        const file = '/etc/systemd/system/' + row.unit, digest = sha256(c.read(file));
        if (digest !== row.beforeSha256 && digest !== row.afterSha256) fail('R8_HOST_UNIT_CHANGED');
        if (digest !== row.beforeSha256) c.write(c.at(file), c.read('/opt/nexowatt/eos/releases/' + R8 + '/system/postgresql-test/systemd/' + row.unit));
    }
    for (const [file, digest] of [[TRUST, plan.publicKeySha256], [update, plan.updateUnitSha256]]) {
        if (!exists(c.at(file))) continue;
        if (sha256(c.read(file, 16384)) !== digest) fail('R8_HOST_UPDATE_CHANGED');
        fs.unlinkSync(c.at(file)); sync(path.dirname(c.at(file)));
    }
    // An activated updater may have durable status/job evidence. Preserve it;
    // never recursively erase unknown data merely to make a retry pass.
    for (const name of [DATA + '/jobs', DATA]) {
        if (!exists(c.at(name))) continue;
        c.owner(c.at(name));
        const stat = fs.lstatSync(c.at(name));
        if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o7777) !== 0o700) fail('R8_HOST_UPDATE_CHANGED');
        if (fs.readdirSync(c.at(name)).length === 0) { fs.rmdirSync(c.at(name)); sync(path.dirname(c.at(name))); }
    }
    c.run('/usr/bin/systemctl', ['daemon-reload']);
    assertUnits(plan, c, 'beforeSha256');
    return { restored: true, updateEvidenceRetained: exists(c.at(DATA)), networkEvidenceRetained: exists(c.at('/var/lib/nexowatt-eos-network-install/install.json')), certificateTimerPaused: true };
}
function restoreCertificateTimer(plan, dependencies = {}) {
    const c = context(dependencies); checked(plan, c);
    // Called only after the target is ready, or after the coordinator has
    // restored R8's units, pointer, state and readiness. No enable-state change.
    const current = c.at('/opt/nexowatt/eos/current'); c.owner(path.dirname(current));
    const pointer = fs.lstatSync(current);
    const target = pointer.isSymbolicLink() && fs.readlinkSync(current);
    if (pointer.uid !== (dependencies.ownerUid ?? 0) ||
        !['/opt/nexowatt/eos/releases/' + R8, '/opt/nexowatt/eos/releases/' + plan.releaseId].includes(target)) fail('R8_HOST_ACTIVE_STATE');
    assertUnits(plan, c, target.endsWith('/' + R8) ? 'beforeSha256' : 'afterSha256');
    const before = timerState(c);
    if (before.unitFileState !== plan.certificateTimer.unitFileState) fail('R8_HOST_CERTIFICATE_TIMER');
    certificateIdle(c);
    if (before.activeState !== plan.certificateTimer.activeState)
        c.run('/usr/bin/systemctl', [plan.certificateTimer.activeState === 'active' ? 'start' : 'stop', CERT_TIMER]);
    if (!equal(timerState(c), plan.certificateTimer)) fail('R8_HOST_CERTIFICATE_TIMER');
    return { restored: true, ...plan.certificateTimer };
}
module.exports = { R8, UNITS, UPDATE_UNIT, OS_TIMER, CERT_TIMER, CERT_SERVICE, prepare, apply, activate, rollback, restoreCertificateTimer };
