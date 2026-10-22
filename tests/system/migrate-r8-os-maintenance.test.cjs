'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const migration = require('../../tools/system/migrate-r8-os-maintenance.cjs');
const { LOCK, POLICY, APT_CONFIG } = require('../../tools/system/install-os-maintenance.cjs');
const REPO = path.resolve(__dirname, '../..');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r8-os-migration-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name), releaseId = 'a'.repeat(64);
    const input = { releaseId, previousReleasePath: '/opt/nexowatt/eos/releases/' + migration.R8,
        targetReleasePath: '/opt/nexowatt/eos/releases/' + releaseId };
    function put(name, contents, mode = 0o644) {
        fs.mkdirSync(path.dirname(at(name)), { recursive: true }); fs.writeFileSync(at(name), contents, { mode }); fs.chmodSync(at(name), mode);
    }
    const oldPolicy = '{"schemaVersion":1,"enabled":true}\n';
    put(input.previousReleasePath + '/system/test-base/os-updates/policy.json', oldPolicy);
    put(migration.OS_POLICY, oldPolicy);
    for (const source of ['runtime/os-updates/policy-rc.d', 'system/managed-test/apt-managed.conf']) put(input.targetReleasePath + '/' + source, fs.readFileSync(path.join(REPO, source)));
    for (const file of [LOCK, POLICY, APT_CONFIG]) fs.mkdirSync(path.dirname(at(file)), { recursive: true });
    fs.chmodSync(path.dirname(at(LOCK)), 0o711);
    const timers = { [migration.OS_TIMER]: { active: 'active', enabled: 'enabled' }, [migration.APT_TIMER]: { active: 'active', enabled: 'enabled' } };
    const state = { os: 'inactive', apt: 'inactive', periodic: '0', race: false }, calls = [];
    const dependencies = { root, owner: () => {}, trust: () => ({ trusted: true }), exec: (binary, args) => {
        calls.push([binary, [...args]]);
        if (binary === '/usr/bin/apt-config') return { status: 0, stdout: ['Update-Package-Lists', 'Unattended-Upgrade'].map(n => `APT::Periodic::${n} "${state.periodic}";`).join('\n') + '\n' };
        const [verb, ...rest] = args, unit = rest.find(x => !x.startsWith('-'));
        if (verb === 'show') {
            if (unit.endsWith('.service')) return { status: 0, stdout: (unit.startsWith('apt-') ? state.apt : state.os) + '\n' };
            return { status: 0, stdout: `ActiveState=${timers[unit].active}\nUnitFileState=${timers[unit].enabled}\n` };
        }
        if (verb === 'stop') { timers[unit].active = 'inactive'; if (state.race && unit === migration.OS_TIMER) state.os = 'active'; }
        if (verb === 'start') timers[unit].active = 'active';
        if (verb === 'disable') { timers[unit].enabled = 'disabled'; if (args.includes('--now')) timers[unit].active = 'inactive'; }
        if (verb === 'enable') timers[unit].enabled = 'enabled';
        if (verb === 'mask') timers[unit].enabled = 'masked';
        if (verb === 'unmask' && timers[unit].enabled === 'masked') timers[unit].enabled = 'disabled';
        return { status: 0, stdout: '' };
    } };
    return { root, at, input, put, state, timers, calls, dependencies };
}
test('R8 adoption journals before writes, enables sole scheduler policy and restores exact original timers', t => {
    const f = fixture(t), plan = migration.prepare(f.input, f.dependencies);
    assert.equal(f.calls.every(([, args]) => args[0] === 'show'), true);
    assert.equal(fs.existsSync(f.at(POLICY)), false);
    const before = structuredClone(f.timers);
    const result = migration.apply(JSON.parse(JSON.stringify(plan)), f.dependencies);
    assert.deepEqual(result, { installed: true, lockCreated: true, timerRequiresCoordinatorActivation: true });
    assert.deepEqual(f.timers[migration.APT_TIMER], { active: 'inactive', enabled: 'masked' });
    assert.equal(f.timers[migration.OS_TIMER].active, 'inactive');
    assert.equal(fs.statSync(f.at(LOCK)).mode & 0o777, 0o600);
    assert.deepEqual(fs.readFileSync(f.at(POLICY)), fs.readFileSync(path.join(REPO, 'runtime/os-updates/policy-rc.d')));
    assert.equal(migration.rollback(plan, f.dependencies).retainedEmptyLock, true);
    assert.deepEqual(f.timers, before);
    assert.equal(fs.existsSync(f.at(POLICY)), false); assert.equal(fs.existsSync(f.at(APT_CONFIG)), false);
    assert.equal(fs.existsSync(f.at(LOCK)), true);
    assert.equal(f.calls.some(([binary, args]) => /apt-get|dpkg|unattended-upgrade$/.test(binary) || args[0] === 'stop' && args.some(x => x.endsWith('.service'))), false);
});
test('existing empty shared lock inode is preserved through apply and rollback', t => {
    const f = fixture(t); f.put(LOCK, '', 0o600); const ino = fs.statSync(f.at(LOCK)).ino;
    const plan = migration.prepare(f.input, f.dependencies);
    migration.apply(plan, f.dependencies); migration.rollback(plan, f.dependencies);
    assert.equal(fs.statSync(f.at(LOCK)).ino, ino);
});
test('foreign helpers, nonempty locks, symlinks and disabled operator policy are refused before mutation', t => {
    for (const kind of ['policy', 'apt', 'lock', 'symlink', 'disabled']) {
        const f = fixture(t);
        if (kind === 'policy') f.put(POLICY, 'foreign', 0o755);
        if (kind === 'apt') f.put(APT_CONFIG, 'foreign');
        if (kind === 'lock') f.put(LOCK, 'owner-pid', 0o600);
        if (kind === 'symlink') fs.symlinkSync('/absent', f.at(POLICY));
        if (kind === 'disabled') f.put(migration.OS_POLICY, '{"schemaVersion":1,"enabled":false}');
        assert.throws(() => migration.prepare(f.input, f.dependencies));
        assert.equal(f.calls.every(([, args]) => args[0] === 'show'), true);
    }
});
test('live OS or distro maintenance is never killed and inhibits adoption', t => {
    for (const service of ['os', 'apt']) {
        const f = fixture(t); f.state[service] = 'active';
        assert.throws(() => migration.prepare(f.input, f.dependencies), { code: 'R8_OS_BUSY' });
        assert.equal(f.calls.every(([, args]) => args[0] === 'show'), true);
    }
});
test('timer/service start race after read-only prepare aborts before helper installation', t => {
    const f = fixture(t), plan = migration.prepare(f.input, f.dependencies); f.state.race = true;
    assert.throws(() => migration.apply(plan, f.dependencies), { code: 'R8_OS_BUSY' });
    assert.equal(fs.existsSync(f.at(POLICY)), false);
    assert.throws(() => migration.rollback(plan, f.dependencies), { code: 'R8_OS_BUSY' });
});
test('plan cannot retarget a path or substitute content; changed target source is refused', t => {
    for (const mutation of ['path', 'bytes', 'source']) {
        const f = fixture(t), plan = migration.prepare(f.input, f.dependencies);
        if (mutation === 'path') plan.files[0].path = '/etc/sudoers';
        if (mutation === 'bytes') plan.files[0].after.bytes = Buffer.from('arbitrary').toString('base64');
        if (mutation === 'source') f.put(f.input.targetReleasePath + '/runtime/os-updates/policy-rc.d', 'changed');
        assert.throws(() => migration.apply(plan, f.dependencies), { code: 'R8_OS_PLAN' });
        assert.equal(fs.existsSync(f.at(POLICY)), false);
    }
});
test('partial apply can rollback without replacing foreign files; empty lock remains stable', t => {
    const f = fixture(t), plan = migration.prepare(f.input, f.dependencies); f.state.periodic = '1';
    assert.throws(() => migration.apply(plan, f.dependencies), { code: 'R8_OS_PERIODIC_POLICY' });
    f.put(POLICY, 'changed-after-install', 0o755);
    assert.throws(() => migration.rollback(plan, f.dependencies), { code: 'R8_OS_CHANGED' });
    assert.equal(fs.readFileSync(f.at(POLICY), 'utf8'), 'changed-after-install');
    f.put(POLICY, Buffer.from(plan.files[0].after.bytes, 'base64'), 0o755);
    assert.equal(migration.rollback(plan, f.dependencies).restored, true);
});
test('wrong lock directory rights and untrusted tools fail closed', t => {
    const f = fixture(t); fs.chmodSync(path.dirname(f.at(LOCK)), 0o777);
    assert.throws(() => migration.prepare(f.input, f.dependencies), { code: 'R8_OS_LOCK_PARENT' });
    fs.chmodSync(path.dirname(f.at(LOCK)), 0o711); f.dependencies.trust = () => ({ trusted: false }); f.calls.length = 0;
    assert.throws(() => migration.prepare(f.input, f.dependencies), { code: 'R8_OS_TOOL' }); assert.deepEqual(f.calls, []);
});
