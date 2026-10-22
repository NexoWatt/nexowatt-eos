'use strict';
// Filesystem and command contracts only: no APT package or systemd job runs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { installOSMaintenance, LOCK, POLICY, APT_CONFIG } = require('../../tools/system/install-os-maintenance.cjs');
const REPO = path.resolve(__dirname, '../..');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-os-maintenance-install-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const releaseId = 'a'.repeat(64), release = path.join(root, 'opt/nexowatt/eos/releases', releaseId);
    for (const name of [LOCK, POLICY, APT_CONFIG]) fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    for (const name of ['runtime/os-updates/policy-rc.d', 'system/managed-test/apt-managed.conf']) {
        fs.mkdirSync(path.dirname(path.join(release, name)), { recursive: true });
        fs.copyFileSync(path.join(REPO, name), path.join(release, name));
    }
    const calls = [], state = { apt: 'inactive', timer: 'masked', periodic: '0' };
    const dependencies = { root, owner: () => {}, trust: () => ({ trusted: true }), exec: (binary, args) => {
        calls.push([binary, args]);
        let stdout = '';
        if (args.includes('apt-daily-upgrade.service')) stdout = state.apt + '\n';
        else if (binary === '/usr/bin/apt-config') stdout = ['Update-Package-Lists', 'Unattended-Upgrade'].map(n => `APT::Periodic::${n} "${state.periodic}";`).join('\n') + '\n';
        else if (args[0] === 'show') stdout = `ActiveState=inactive\nUnitFileState=${state.timer}\n`;
        return { status: 0, error: null, stdout };
    } };
    return { root, releaseId, calls, dependencies, state };
}
test('fresh host installs scoped service guard, protected shared lease and sole automatic scheduler', t => {
    const f = fixture(t), result = installOSMaintenance({ releaseId: f.releaseId }, f.dependencies);
    assert.equal(result.installed, true); assert.equal(result.automaticReboot, false);
    assert.equal(fs.statSync(path.join(f.root, LOCK)).mode & 0o777, 0o600);
    assert.equal(fs.statSync(path.join(f.root, POLICY)).mode & 0o777, 0o755);
    assert.deepEqual(fs.readFileSync(path.join(f.root, POLICY)), fs.readFileSync(path.join(REPO, 'runtime/os-updates/policy-rc.d')));
    assert.ok(f.calls.some(([, args]) => JSON.stringify(args) === JSON.stringify(['mask', 'apt-daily-upgrade.timer'])));
    assert.equal(f.calls.some(([binary]) => /apt-get|dpkg|unattended-upgrade$/.test(binary)), false);
});
test('foreign service policy or symlink is never replaced', t => {
    for (const kind of ['file', 'symlink']) {
        const f = fixture(t), policy = path.join(f.root, POLICY);
        if (kind === 'file') fs.writeFileSync(policy, 'existing operator policy');
        else fs.symlinkSync('/missing/foreign-policy', policy);
        assert.throws(() => installOSMaintenance({ releaseId: f.releaseId }, f.dependencies), { code: 'OS_MAINTENANCE_EXISTS' });
        assert.deepEqual(f.calls, []);
        assert.equal(fs.existsSync(path.join(f.root, LOCK)), false);
    }
});
test('running APT maintenance aborts before disabling scheduler or writing helper', t => {
    const f = fixture(t); f.state.apt = 'active';
    assert.throws(() => installOSMaintenance({ releaseId: f.releaseId }, f.dependencies), { code: 'OS_MAINTENANCE_APT_BUSY' });
    assert.equal(f.calls.length, 1); assert.equal(fs.existsSync(path.join(f.root, POLICY)), false);
});
test('untrusted system tool is refused before any subprocess', t => {
    const f = fixture(t); f.dependencies.trust = () => ({ trusted: false });
    assert.throws(() => installOSMaintenance({ releaseId: f.releaseId }, f.dependencies), { code: 'OS_MAINTENANCE_TOOL' });
    assert.deepEqual(f.calls, []);
});
test('unknown periodic override or unmasked distro timer fails closed instead of claiming installed coverage', t => {
    for (const [key, value, code] of [['periodic', '1', 'OS_MAINTENANCE_PERIODIC_POLICY'], ['timer', 'enabled', 'OS_MAINTENANCE_TIMER_POLICY']]) {
        const f = fixture(t); f.state[key] = value;
        assert.throws(() => installOSMaintenance({ releaseId: f.releaseId }, f.dependencies), { code });
    }
});
