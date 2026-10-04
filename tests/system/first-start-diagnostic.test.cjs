'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspect, main, RELEASES } = require('../../tools/system/diagnose-first-start.cjs');
const R4 = Object.keys(RELEASES)[0];
const SECRET = 'DO_NOT_PUBLISH_PASSWORD_LICENSE_OR_ERROR_TEXT';
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-files-diagnostic-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const name of ['etc/nexowatt-eos', 'var/lib/nexowatt-eos/onboarding', 'opt/nexowatt/eos']) fs.mkdirSync(path.join(root, name), { recursive: true, mode: 0o700 });
    const file = name => path.join(root, name);
    const write = (name, value) => fs.writeFileSync(file(name), typeof value === 'string' ? value : JSON.stringify(value), { mode: 0o600 });
    write('etc/nexowatt-eos/release-state.json', { schemaVersion: 1, releaseId: R4, sequence: 7, profile: 'test' });
    write('etc/nexowatt-eos/.activation.lock', { operation: 'ui-onboarding', pid: 123, invocationId: 'a'.repeat(32), releaseId: R4 });
    write('var/lib/nexowatt-eos/.initialized', { releaseId: R4, profile: 'test' });
    write('var/lib/nexowatt-eos/onboarding/state.json', { schemaVersion: 1, releaseId: R4, setupId: 'b'.repeat(32), state: 'committing', codeHash: null });
    write('var/lib/nexowatt-eos/onboarding/handoff.json', { schemaVersion: 3, releaseId: R4, setupId: 'b'.repeat(32), passwordHash: SECRET,
        settings: { schemaVersion: 3 }, license: { mode: 'activate', token: SECRET }, ignoredSecret: SECRET });
    fs.symlinkSync('/opt/nexowatt/eos/releases/' + R4, file('opt/nexowatt/eos/current'));
    const options = { root, rootUid: process.getuid(), setupUid: process.getuid(), uid: 0 };
    return { root, file, write, options, run: () => inspect(options) };
}
function snapshot(root) {
    const rows = [];
    function walk(directory) {
        for (const name of fs.readdirSync(directory).sort()) {
            const file = path.join(directory, name), st = fs.lstatSync(file);
            rows.push([file.slice(root.length), st.mode, st.uid, st.gid, st.nlink,
                st.isFile() ? fs.readFileSync(file).toString('base64') : st.isSymbolicLink() ? fs.readlinkSync(file) : null]);
            if (st.isDirectory()) walk(file);
        }
    }
    walk(root); return rows;
}
test('failed R4 first-start summary is useful and does not change bytes, ownership, mode, links or directories', t => {
    const f = fixture(t), before = snapshot(f.root), out = f.run();
    assert.equal(out.ok, true); assert.equal(out.readOnly, true); assert.equal(out.recoveryAuthorized, false);
    assert.equal(out.releaseState.release, 'R4'); assert.equal(out.current.matchesReleaseState, true);
    assert.equal(out.activationLock.operation, 'ui-onboarding'); assert.equal(out.completion.status, 'absent');
    assert.equal(out.maintenancePermit.status, 'absent'); assert.equal(out.r6Update.status, 'absent');
    assert.equal(out.onboardingState.state, 'committing'); assert.equal(out.handoff.matchesSetupId, true);
    assert.equal(out.handoff.passwordHashPresent, true); assert.equal(out.handoff.licenseTokenPresent, true);
    assert.equal(JSON.stringify(out).includes(SECRET), false);
    assert.equal(JSON.stringify(out).includes(R4), false);
    assert.deepEqual(snapshot(f.root), before);
});
test('hostile strings in every displayed field never enter output', t => {
    const f = fixture(t);
    for (const [name, value] of [
        ['etc/nexowatt-eos/release-state.json', { schemaVersion: SECRET, releaseId: SECRET, sequence: SECRET, profile: SECRET }],
        ['etc/nexowatt-eos/.activation.lock', { operation: SECRET, pid: SECRET, invocationId: SECRET, releaseId: SECRET }],
        ['etc/nexowatt-eos/first-start-complete.json', { schemaVersion: SECRET, releaseId: SECRET, licenseConfigured: SECRET, physicalControlEnabled: SECRET }],
        ['etc/nexowatt-eos/test-update-r6-status.json', { phase: SECRET }],
        ['var/lib/nexowatt-eos/onboarding/state.json', { schemaVersion: SECRET, releaseId: SECRET, state: SECRET, setupId: SECRET }],
        ['var/lib/nexowatt-eos/onboarding/handoff.json', { schemaVersion: SECRET, releaseId: SECRET, setupId: SECRET, settings: { schemaVersion: SECRET }, license: { mode: SECRET, token: SECRET }, passwordHash: SECRET }],
    ]) f.write(name, value);
    const out = f.run();
    assert.equal(JSON.stringify(out).includes(SECRET), false);
    assert.equal(out.activationLock.operation, 'OTHER'); assert.equal(out.handoff.matchesSetupId, null);
    assert.equal(out.completion.physicalControlEnabled, null);
});
test('even well-shaped unknown hex identifiers and signed-looking hashes are not echoed', t => {
    const f = fixture(t), unknown = 'c'.repeat(64);
    f.write('etc/nexowatt-eos/release-state.json', { releaseId: unknown, publicKeySha256: unknown });
    const out = f.run();
    assert.equal(out.releaseState.release, 'OTHER'); assert.equal(JSON.stringify(out).includes(unknown), false);
});
test('release and setup binding differences remain visible only as booleans', t => {
    const f = fixture(t);
    f.write('var/lib/nexowatt-eos/onboarding/handoff.json', { releaseId: 'c'.repeat(64), setupId: 'd'.repeat(32) });
    const out = f.run();
    assert.equal(out.handoff.matchesReleaseState, false); assert.equal(out.handoff.matchesSetupId, false);
});
test('final symlink and hardlink are rejected before parsing their contents', t => {
    const f = fixture(t), handoff = f.file('var/lib/nexowatt-eos/onboarding/handoff.json');
    fs.renameSync(handoff, handoff + '.secret'); fs.symlinkSync(handoff + '.secret', handoff);
    assert.equal(f.run().handoff.status, 'unsafe');
    fs.unlinkSync(handoff); fs.linkSync(handoff + '.secret', handoff);
    const out = f.run(); assert.equal(out.handoff.status, 'unsafe'); assert.equal(out.ok, false);
    assert.equal(JSON.stringify(out).includes(SECRET), false);
});
test('symlinked onboarding ancestor is rejected without following it', t => {
    const f = fixture(t), directory = f.file('var/lib/nexowatt-eos/onboarding');
    fs.renameSync(directory, directory + '-old'); fs.symlinkSync(directory + '-old', directory);
    const out = f.run(); assert.notEqual(out.handoff.status, 'present'); assert.equal(out.ok, false);
});
test('private-file and parent-directory permission boundaries are enforced', t => {
    const f = fixture(t), handoff = f.file('var/lib/nexowatt-eos/onboarding/handoff.json');
    fs.chmodSync(handoff, 0o644); assert.equal(f.run().handoff.status, 'unsafe');
    fs.chmodSync(handoff, 0o600); fs.chmodSync(path.dirname(handoff), 0o755);
    assert.equal(f.run().handoff.status, 'unsafe');
});
test('oversized, nonregular and invalid JSON records are bounded safe failures', t => {
    const f = fixture(t), name = 'var/lib/nexowatt-eos/onboarding/handoff.json';
    f.write(name, SECRET.repeat(2000)); assert.equal(f.run().handoff.status, 'unsafe');
    f.write(name, '{"secret":"' + SECRET); assert.equal(f.run().handoff.status, 'invalid');
    f.write(name, '[]'); assert.equal(f.run().handoff.status, 'invalid');
    fs.unlinkSync(f.file(name)); fs.mkdirSync(f.file(name));
    const out = f.run(); assert.equal(out.handoff.status, 'unsafe'); assert.equal(JSON.stringify(out).includes(SECRET), false);
});
test('malformed UTF-8 is rejected without an error detail or partial content', t => {
    const f = fixture(t); fs.writeFileSync(f.file('etc/nexowatt-eos/.activation.lock'), Buffer.from([0xc3, 0x28]));
    assert.equal(f.run().activationLock.status, 'unreadable');
});
test('unsafe current pointer never leaks its target', t => {
    const f = fixture(t), current = f.file('opt/nexowatt/eos/current');
    fs.unlinkSync(current); fs.symlinkSync('/' + SECRET, current);
    const out = f.run(); assert.equal(out.current.status, 'unsafe'); assert.equal(JSON.stringify(out).includes(SECRET), false);
});
test('untrusted owner and missing setup identity do not admit onboarding records', t => {
    const f = fixture(t);
    assert.equal(inspect({ ...f.options, rootUid: process.getuid() + 1 }).handoff.status, 'unsafe');
    const out = inspect({ ...f.options, setupUid: undefined });
    assert.equal(out.setupAccount.status, 'absent'); assert.equal(out.handoff.status, 'unsafe');
});
test('CLI rejects any input/root/bypass flag; privilege errors have constant output', t => {
    const f = fixture(t);
    assert.equal(main(['--root', SECRET], f.options).code, 'DIAGNOSTIC_USAGE');
    const out = main([], { ...f.options, uid: 999 });
    assert.deepEqual(out, { schemaVersion: 1, ok: false, code: 'DIAGNOSTIC_UNAVAILABLE', readOnly: true, recoveryAuthorized: false });
});
