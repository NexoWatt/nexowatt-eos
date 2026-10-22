'use strict';
// Narrow OS-policy adoption inside the authenticated R8 -> managed migration.
// The caller verifies both signed releases and journals prepare() before apply().
// No package transaction is started/stopped, and no existing state/SBOM is reset.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited } = require('../../runtime/release/bundle.cjs');
const { privateWrite } = require('./install-host.cjs');
const { command, toolTrust } = require('./host-preflight.cjs');
const { LOCK, POLICY, APT_CONFIG } = require('./install-os-maintenance.cjs');
const R8 = 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7';
const OS_POLICY = '/etc/nexowatt-eos-os-updates/policy.json';
const OS_TIMER = 'nexowatt-eos-os-updates.timer';
const APT_TIMER = 'apt-daily-upgrade.timer';
const SPECS = Object.freeze([
    { path: POLICY, source: 'runtime/os-updates/policy-rc.d', mode: 0o755 },
    { path: APT_CONFIG, source: 'system/managed-test/apt-managed.conf', mode: 0o644 },
    { path: LOCK, source: null, mode: 0o600 },
]);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (x, keys) => x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).sort().join('|') === [...keys].sort().join('|');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function context({ root = '/', owner = rootOwned, exec = command, trust = toolTrust } = {}) {
    if (process.getuid?.() !== 0) fail('R8_OS_ROOT_REQUIRED');
    const at = name => path.join(root, name);
    for (const binary of ['/usr/bin/systemctl', '/usr/bin/apt-config'])
        if (!trust(binary, root).trusted) fail('R8_OS_TOOL');
    const run = (binary, args) => {
        const result = exec(binary, args);
        if (result.error || result.status !== 0 || typeof result.stdout !== 'string') fail('R8_OS_COMMAND');
        return result.stdout;
    };
    function read(name, limit = 16384) {
        owner(path.dirname(at(name)));
        let stat;
        try { stat = fs.lstatSync(at(name)); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
        owner(at(name));
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.uid !== 0 || stat.gid !== 0 || (stat.mode & 0o022)) fail('R8_OS_FILE');
        const bytes = readFileLimited(at(name), limit).bytes;
        return { mode: stat.mode & 0o7777, bytes: bytes.toString('base64'), sha256: digest(bytes) };
    }
    const timer = unit => {
        const out = run('/usr/bin/systemctl', ['show', unit, '--property=ActiveState', '--property=UnitFileState']);
        const rows = out.trim().split('\n');
        if (rows.length !== 2) fail('R8_OS_TIMER');
        const fields = Object.fromEntries(rows.map(row => row.split('=')));
        if (!['active', 'inactive'].includes(fields.ActiveState) || !['enabled', 'disabled', 'masked'].includes(fields.UnitFileState) ||
            fields.UnitFileState === 'masked' && fields.ActiveState !== 'inactive') fail('R8_OS_TIMER');
        return { active: fields.ActiveState, enabled: fields.UnitFileState };
    };
    const inactive = () => {
        for (const unit of ['nexowatt-eos-os-updates.service', 'apt-daily-upgrade.service'])
            if (run('/usr/bin/systemctl', ['show', unit, '--property=ActiveState', '--value']).trim() !== 'inactive') fail('R8_OS_BUSY');
    };
    return { at, owner, read, run, timer, inactive };
}
function assertPlan(plan, c) {
    if (!exact(plan, ['schemaVersion', 'kind', 'previousReleasePath', 'targetReleasePath', 'releaseId', 'policy', 'files', 'timers']) ||
        plan.schemaVersion !== 1 || plan.kind !== 'eos-r8-os-maintenance-migration' ||
        plan.previousReleasePath !== '/opt/nexowatt/eos/releases/' + R8 || !/^[a-f0-9]{64}$/.test(plan.releaseId || '') ||
        plan.releaseId === R8 || plan.targetReleasePath !== '/opt/nexowatt/eos/releases/' + plan.releaseId ||
        !Array.isArray(plan.files) || plan.files.length !== SPECS.length || !exact(plan.timers, [OS_TIMER, APT_TIMER])) fail('R8_OS_PLAN');
    c.owner(c.at(plan.previousReleasePath)); c.owner(c.at(plan.targetReleasePath));
    const oldPolicy = c.read(plan.previousReleasePath + '/system/test-base/os-updates/policy.json');
    if (!oldPolicy || !same(plan.policy, oldPolicy) || !same(c.read(OS_POLICY), oldPolicy)) fail('R8_OS_POLICY_CHANGED');
    let parsed;
    try { parsed = JSON.parse(Buffer.from(oldPolicy.bytes, 'base64')); } catch { fail('R8_OS_POLICY_CHANGED'); }
    if (!exact(parsed, ['schemaVersion', 'enabled']) || parsed.schemaVersion !== 1 || parsed.enabled !== true || oldPolicy.mode !== 0o644) fail('R8_OS_POLICY_CHANGED');
    const parent = fs.lstatSync(c.at(path.dirname(LOCK))); c.owner(c.at(path.dirname(LOCK)));
    if (!parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== 0 || parent.gid !== 0 || (parent.mode & 0o7777) !== 0o711) fail('R8_OS_LOCK_PARENT');
    for (let n = 0; n < SPECS.length; n++) {
        const spec = SPECS[n], row = plan.files[n];
        const source = spec.source ? c.read(plan.targetReleasePath + '/' + spec.source) : { bytes: '', sha256: digest(Buffer.alloc(0)) };
        const after = source && { mode: spec.mode, bytes: source.bytes, sha256: source.sha256 };
        if (!exact(row, ['path', 'before', 'after']) || row.path !== spec.path || !after || !same(row.after, after) ||
            (spec.path !== LOCK && row.before !== null) || (spec.path === LOCK && row.before !== null && !same(row.before, after))) fail('R8_OS_PLAN');
    }
    for (const unit of [OS_TIMER, APT_TIMER]) {
        const timer = plan.timers[unit];
        if (!exact(timer, ['active', 'enabled']) || !['active', 'inactive'].includes(timer.active) ||
            !['enabled', 'disabled', 'masked'].includes(timer.enabled) || timer.enabled === 'masked' && timer.active !== 'inactive' ||
            unit === OS_TIMER && timer.enabled === 'masked') fail('R8_OS_PLAN');
    }
}
function prepare({ releaseId, previousReleasePath, targetReleasePath }, dependencies) {
    const c = context(dependencies);
    if (previousReleasePath !== '/opt/nexowatt/eos/releases/' + R8 || !/^[a-f0-9]{64}$/.test(releaseId || '') || targetReleasePath !== '/opt/nexowatt/eos/releases/' + releaseId) fail('R8_OS_INPUT');
    const plan = { schemaVersion: 1, kind: 'eos-r8-os-maintenance-migration', previousReleasePath, targetReleasePath, releaseId,
        policy: c.read(OS_POLICY), files: SPECS.map(spec => {
            const source = spec.source ? c.read(targetReleasePath + '/' + spec.source) : { bytes: '', sha256: digest(Buffer.alloc(0)) };
            return { path: spec.path, before: c.read(spec.path), after: source && { mode: spec.mode, bytes: source.bytes, sha256: source.sha256 } };
        }), timers: { [OS_TIMER]: c.timer(OS_TIMER), [APT_TIMER]: c.timer(APT_TIMER) } };
    assertPlan(plan, c);
    c.inactive();
    return plan;
}
function apply(plan, dependencies) {
    const c = context(dependencies); assertPlan(plan, c);
    for (const row of plan.files) if (!same(c.read(row.path), row.before)) fail('R8_OS_CHANGED');
    for (const unit of [OS_TIMER, APT_TIMER]) if (!same(c.timer(unit), plan.timers[unit])) fail('R8_OS_CHANGED');
    c.inactive();
    // Stop scheduling only; never stop an APT/dpkg or EOS maintenance service.
    c.run('/usr/bin/systemctl', ['stop', OS_TIMER]);
    c.run('/usr/bin/systemctl', ['disable', '--now', APT_TIMER]);
    c.run('/usr/bin/systemctl', ['mask', APT_TIMER]);
    c.inactive();
    if (c.timer(OS_TIMER).active !== 'inactive' || !same(c.timer(APT_TIMER), { active: 'inactive', enabled: 'masked' })) fail('R8_OS_TIMER');
    for (const row of plan.files) {
        if (!same(c.read(row.path), row.before)) fail('R8_OS_CHANGED');
        if (row.before === null) privateWrite(c.at(row.path), Buffer.from(row.after.bytes, 'base64'), row.after.mode);
    }
    const periodic = c.run('/usr/bin/apt-config', ['dump']);
    for (const name of ['Update-Package-Lists', 'Unattended-Upgrade'])
        if (!new RegExp('^APT::Periodic::' + name + ' "0";$', 'm').test(periodic)) fail('R8_OS_PERIODIC_POLICY');
    for (const row of plan.files) if (!same(c.read(row.path), row.after)) fail('R8_OS_CHANGED');
    return { installed: true, lockCreated: plan.files[2].before === null, timerRequiresCoordinatorActivation: true };
}
function rollback(plan, dependencies) {
    const c = context(dependencies); assertPlan(plan, c);
    c.inactive();
    for (const unit of [OS_TIMER, APT_TIMER]) {
        const current = c.timer(unit), original = plan.timers[unit];
        const allowed = [original, { ...original, active: 'inactive' },
            { active: 'inactive', enabled: 'disabled' },
            unit === APT_TIMER ? { active: 'inactive', enabled: 'masked' } : { active: 'active', enabled: 'enabled' }];
        if (!allowed.some(state => same(current, state))) fail('R8_OS_CHANGED');
    }
    // Check the complete file set before removing anything. A third state is
    // never overwritten, even when recovery would otherwise be convenient.
    for (const row of plan.files) {
        const current = c.read(row.path);
        if (!same(current, row.before) && !same(current, row.after)) fail('R8_OS_CHANGED');
    }
    c.run('/usr/bin/systemctl', ['stop', OS_TIMER]);
    c.run('/usr/bin/systemctl', ['stop', APT_TIMER]);
    c.inactive();
    for (const row of plan.files) {
        // Keep the new empty lock inode while the coordinator may still hold
        // flock. It grants no scheduling/authority and prevents split locks.
        if (row.path === LOCK || row.before !== null || c.read(row.path) === null) continue;
        if (!same(c.read(row.path), row.after)) fail('R8_OS_CHANGED');
        fs.unlinkSync(c.at(row.path));
        const fd = fs.openSync(path.dirname(c.at(row.path)), fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    }
    for (const unit of [APT_TIMER, OS_TIMER]) {
        const original = plan.timers[unit];
        c.run('/usr/bin/systemctl', ['unmask', unit]);
        c.run('/usr/bin/systemctl', [original.enabled === 'enabled' ? 'enable' : 'disable', unit]);
        if (original.enabled === 'masked') c.run('/usr/bin/systemctl', ['mask', unit]);
        if (original.active === 'active') c.run('/usr/bin/systemctl', ['start', unit]);
        if (!same(c.timer(unit), original)) fail('R8_OS_RESTORE_TIMER');
    }
    return { restored: true, retainedEmptyLock: plan.files[2].before === null && c.read(LOCK) !== null };
}
module.exports = { prepare, apply, rollback, R8, OS_POLICY, OS_TIMER, APT_TIMER };
