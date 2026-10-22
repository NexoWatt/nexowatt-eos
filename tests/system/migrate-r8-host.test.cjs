'use strict';
// Filesystem transactions with stubbed host commands; no systemd, network or Pi.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const host = require('../../tools/system/migrate-r8-host.cjs');
const REPO = path.resolve(__dirname, '../..');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r8-host-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const at = name => path.join(root, name), releaseId = 'a'.repeat(64);
    const previousReleasePath = '/opt/nexowatt/eos/releases/' + host.R8;
    const targetReleasePath = '/opt/nexowatt/eos/releases/' + releaseId;
    const save = (name, bytes) => { fs.mkdirSync(path.dirname(at(name)), { recursive: true }); fs.writeFileSync(at(name), bytes, { mode: 0o644 }); };
    for (const unit of host.UNITS) {
        const bytes = '[Unit]\nDescription=R8 ' + unit + '\n';
        save(previousReleasePath + '/system/postgresql-test/systemd/' + unit, bytes);
        save('/etc/systemd/system/' + unit, bytes);
        save(targetReleasePath + '/system/postgresql-test/systemd/' + unit, bytes.replace('R8 ', 'managed '));
    }
    const key = fs.readFileSync(path.join(REPO, 'docs/security/release-trust/manufacturer-20261021.pem'));
    save('/opt/nexowatt/eos/verified/' + releaseId + '/release-public.pem', key);
    save(targetReleasePath + '/system/managed-test/' + host.UPDATE_UNIT,
        fs.readFileSync(path.join(REPO, 'system/managed-test/' + host.UPDATE_UNIT)));
    save(targetReleasePath + '/tools/system/install-network-host.py', '# network installer fixture\n');
    for (const name of ['/etc/nexowatt-eos', '/var/lib']) fs.mkdirSync(at(name), { recursive: true });
    const calls = [], state = { failNetwork: null, failSystem: null, certTimer: 'active', certEnabled: 'enabled', certService: 'inactive', certRace: false };
    const dependencies = { root, uid: 0, owner: () => {}, trust: () => ({ trusted: true }), exec: (binary, args) => {
        calls.push({ binary, args });
        if (binary === '/usr/bin/python3') {
            const operation = args[2].slice(2);
            if (operation === state.failNetwork) return { status: 1, stdout: '' };
            return { status: 0, stdout: JSON.stringify({ ok: true, operation, releaseId, configured: false }) };
        }
        if (args.includes(host.CERT_TIMER)) {
            if (args[0] === 'show') return { status: 0, stdout: `UnitFileState=${state.certEnabled}\nActiveState=${state.certTimer}\n` };
            if (args[0] === 'stop') { state.certTimer = 'inactive'; if (state.certRace) state.certService = 'activating'; }
            if (args[0] === 'start') state.certTimer = 'active';
        }
        if (args[0] === 'show' && args.includes(host.CERT_SERVICE)) return { status: 0, stdout: state.certService + '\n' };
        return { status: args[0] === state.failSystem ? 1 : 0, stdout: '' };
    } };
    const options = { releaseId, publicKeySha256: crypto.createHash('sha256').update(key).digest('hex'), previousReleasePath, targetReleasePath };
    return { root, at, options, dependencies, calls, state, save };
}
test('exact R8 directly adopts all target units and permanent updater without any intermediate release', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies);
    assert.equal(plan.units.length, host.UNITS.length);
    assert.equal(JSON.stringify(plan).includes('PRIVATE KEY'), false);
    assert.equal(host.apply(plan, f.dependencies).updateServiceStarted, false);
    for (const unit of host.UNITS) assert.equal(fs.readFileSync(f.at('/etc/systemd/system/' + unit), 'utf8').includes('managed '), true);
    assert.equal(fs.readFileSync(f.at('/etc/systemd/system/' + host.UPDATE_UNIT), 'utf8').includes('@RELEASE_ID@'), false);
    assert.equal(f.calls.some(call => call.args[0] === 'enable'), false);
    fs.symlinkSync(f.options.targetReleasePath, f.at('/opt/nexowatt/eos/current'));
    f.save('/etc/nexowatt-eos/release-state.json', JSON.stringify({ schemaVersion: 1, releaseId: f.options.releaseId,
        publicKeySha256: f.options.publicKeySha256, profile: 'test', sequence: 15, nodeVersion: '24.22.1' }));
    host.activate(plan, f.dependencies);
    assert.deepEqual(f.calls.find(call => call.args[0] === 'enable').args, ['enable', '--now', host.OS_TIMER, host.UPDATE_UNIT]);
    assert.equal(f.calls.some(call => /apt|npm|dpkg/.test(call.binary)), false);
});
test('rollback restores each authenticated R8 unit and removes only new empty updater paths', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies);
    host.apply(plan, f.dependencies);
    const result = host.rollback(plan, f.dependencies);
    assert.equal(result.restored, true); assert.equal(result.updateEvidenceRetained, false);
    for (const unit of host.UNITS) assert.equal(fs.readFileSync(f.at('/etc/systemd/system/' + unit), 'utf8').includes('Description=R8 '), true);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos/update-trust.pem')), false);
    assert.equal(fs.existsSync(f.at('/etc/systemd/system/' + host.UPDATE_UNIT)), false);
    assert.ok(f.calls.some(call => call.args[2] === '--rollback'));
});
test('preparation rejects changed baseline units, existing updater paths, foreign baselines and symlinks before host mutation', t => {
    for (const kind of ['unit', 'trust', 'baseline', 'symlink']) {
        const f = fixture(t);
        if (kind === 'unit') f.save('/etc/systemd/system/' + host.UNITS[0], 'foreign unit\n');
        if (kind === 'trust') f.save('/etc/nexowatt-eos/update-trust.pem', 'foreign authority\n');
        if (kind === 'baseline') f.options.previousReleasePath = '/opt/nexowatt/eos/releases/' + 'b'.repeat(64);
        if (kind === 'symlink') fs.symlinkSync('/missing', f.at('/etc/nexowatt-eos/update-trust.pem'));
        assert.throws(() => host.prepare(f.options, f.dependencies), error => /^R8_HOST_/.test(error.code));
        assert.equal(f.calls.length, 0);
    }
});
test('modified plan or target files cannot introduce arbitrary service paths', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies);
    const changed = structuredClone(plan); changed.units[0].unit = '../ssh.service';
    assert.throws(() => host.apply(changed, f.dependencies), { code: 'R8_HOST_PLAN' });
    f.save(f.options.targetReleasePath + '/system/postgresql-test/systemd/' + host.UNITS[0], 'changed target');
    assert.throws(() => host.apply(plan, f.dependencies), { code: 'R8_HOST_PLAN' });
    assert.equal(f.calls.filter(call => call.args[2] === '--install').length, 0);
});
test('partial unit replacement is rolled back after a failed write, preserving customer configuration', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies);
    f.save('/etc/nexowatt-eos/iobroker.json', '{"unchanged":true}\n');
    const real = require('../../tools/system/activate-release.cjs').atomicWrite;
    let writes = 0;
    assert.throws(() => host.apply(plan, { ...f.dependencies, write: (file, bytes) => { if (++writes === 4) throw new Error('injected write failure'); real(file, bytes); } }));
    host.rollback(plan, f.dependencies);
    for (const unit of host.UNITS) assert.equal(fs.readFileSync(f.at('/etc/systemd/system/' + unit), 'utf8').includes('Description=R8 '), true);
    assert.equal(fs.readFileSync(f.at('/etc/nexowatt-eos/iobroker.json'), 'utf8'), '{"unchanged":true}\n');
});
test('foreign edit blocks rollback instead of overwriting a changed host or claiming a healthy fallback', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies); host.apply(plan, f.dependencies);
    f.save('/etc/systemd/system/' + host.UNITS[0], 'foreign post-migration edit\n');
    const calls = f.calls.length;
    assert.throws(() => host.rollback(plan, f.dependencies), { code: 'R8_HOST_UNIT_CHANGED' });
    assert.equal(f.calls.length, calls);
    assert.equal(fs.readFileSync(f.at('/etc/systemd/system/' + host.UNITS[0]), 'utf8'), 'foreign post-migration edit\n');
});
test('rollback retains updater status evidence rather than recursively deleting it', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies); host.apply(plan, f.dependencies);
    const file = f.at('/var/lib/nexowatt-eos-updates/status.json'); fs.writeFileSync(file, '{"phase":"CHECKED"}\n', { mode: 0o600 });
    assert.equal(host.rollback(plan, f.dependencies).updateEvidenceRetained, true);
    assert.equal(fs.readFileSync(file, 'utf8'), '{"phase":"CHECKED"}\n');
});
test('network failure and untrusted host tools fail closed, activation never starts early', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies); f.state.failNetwork = 'install';
    assert.throws(() => host.apply(plan, f.dependencies), { code: 'R8_HOST_COMMAND' });
    assert.equal(f.calls.some(call => call.args[0] === 'enable'), false);
    for (const unit of host.UNITS) assert.equal(fs.readFileSync(f.at('/etc/systemd/system/' + unit), 'utf8').includes('Description=R8 '), true);
    assert.throws(() => host.prepare(f.options, { ...f.dependencies, trust: () => ({ trusted: false }) }), { code: 'R8_HOST_TOOL' });
});

test('activation refuses a pointer still on R8 before starting automatic services', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies); host.apply(plan, f.dependencies);
    fs.symlinkSync(f.options.previousReleasePath, f.at('/opt/nexowatt/eos/current'));
    f.save('/etc/nexowatt-eos/release-state.json', JSON.stringify({ releaseId: host.R8, sequence: 11 }));
    assert.throws(() => host.activate(plan, f.dependencies), { code: 'R8_HOST_ACTIVE_STATE' });
    assert.equal(f.calls.some(call => call.args[0] === 'enable'), false);
});

test('certificate checker timer is paused without killing an active checker and original enabled state is preserved', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies);
    assert.deepEqual(plan.certificateTimer, { unitFileState: 'enabled', activeState: 'active' });
    host.apply(plan, f.dependencies); assert.equal(f.state.certTimer, 'inactive');
    host.rollback(plan, f.dependencies); assert.equal(f.state.certTimer, 'inactive');
    fs.symlinkSync(f.options.previousReleasePath, f.at('/opt/nexowatt/eos/current'));
    host.restoreCertificateTimer(plan, f.dependencies); assert.equal(f.state.certTimer, 'active');
    assert.equal(f.calls.some(call => call.args.includes(host.CERT_SERVICE) && call.args[0] !== 'show'), false);
    assert.equal(f.calls.some(call => ['enable', 'disable'].includes(call.args[0]) && call.args.includes(host.CERT_TIMER)), false);
});
test('disabled inactive certificate timer remains disabled and inactive after restoration', t => {
    const f = fixture(t); f.state.certEnabled = 'disabled'; f.state.certTimer = 'inactive';
    const plan = host.prepare(f.options, f.dependencies); host.apply(plan, f.dependencies); host.rollback(plan, f.dependencies);
    fs.symlinkSync(f.options.previousReleasePath, f.at('/opt/nexowatt/eos/current'));
    host.restoreCertificateTimer(plan, f.dependencies);
    assert.equal(f.state.certEnabled, 'disabled'); assert.equal(f.state.certTimer, 'inactive');
    assert.equal(f.calls.some(call => call.args[0] === 'start' && call.args.includes(host.CERT_TIMER)), false);
});
test('busy or racing certificate check blocks host changes and is never stopped', t => {
    const busy = fixture(t); busy.state.certService = 'activating';
    assert.throws(() => host.prepare(busy.options, busy.dependencies), { code: 'R8_HOST_CERTIFICATE_BUSY' });
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies); f.state.certRace = true;
    assert.throws(() => host.apply(plan, f.dependencies), { code: 'R8_HOST_CERTIFICATE_BUSY' });
    assert.equal(f.calls.some(call => call.args[2] === '--install'), false);
    assert.equal(f.calls.some(call => call.args[0] === 'stop' && call.args.includes(host.CERT_SERVICE)), false);
    for (const unit of host.UNITS) assert.equal(fs.readFileSync(f.at('/etc/systemd/system/' + unit), 'utf8').includes('Description=R8 '), true);
});
test('foreign certificate timer enable-state change and malformed snapshot are refused', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies);
    f.state.certEnabled = 'disabled';
    assert.throws(() => host.apply(plan, f.dependencies), { code: 'R8_HOST_CERTIFICATE_TIMER' });
    plan.certificateTimer.activeState = 'failed';
    assert.throws(() => host.apply(plan, f.dependencies), { code: 'R8_HOST_PLAN' });
});

test('unit replacement and rollback preserve signed 0644 modes under restrictive root umask', t => {
    const f = fixture(t), plan = host.prepare(f.options, f.dependencies);
    const previousUmask = process.umask(0o077);
    try {
        host.apply(plan, f.dependencies);
        for (const unit of [...host.UNITS, host.UPDATE_UNIT]) assert.equal(fs.statSync(f.at('/etc/systemd/system/' + unit)).mode & 0o7777, 0o644);
        host.rollback(plan, f.dependencies);
        for (const unit of host.UNITS) assert.equal(fs.statSync(f.at('/etc/systemd/system/' + unit)).mode & 0o7777, 0o644);
    } finally { process.umask(previousUmask); }
});
