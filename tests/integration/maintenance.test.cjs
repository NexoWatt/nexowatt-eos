'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const gate = require('../../runtime/release/maintenance.cjs');
function fixture(t) {
    const directory = fs.mkdtempSync('/root/eos-maintenance-test-');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true })); return directory;
}
test('normal start, incomplete maintenance blocked, live trial and cleanup', t => {
    const d = fixture(t); assert.equal(gate.checkStart(d).status, 'NORMAL_START_ALLOWED');
    fs.writeFileSync(path.join(d, gate.LOCK), '{}', { mode: 0o600 });
    assert.throws(() => gate.checkStart(d)); gate.authorizeStart(d, 'ui-onboarding');
    assert.equal(gate.checkStart(d).status, 'CONTROLLED_TRIAL_ALLOWED');
    gate.blockStart(d); assert.throws(() => gate.checkStart(d));
    fs.unlinkSync(path.join(d, gate.LOCK)); assert.equal(gate.checkStart(d).status, 'NORMAL_START_ALLOWED');
});
test('exited coordinator cannot grant later reboot/start through its old permit', t => {
    const d = fixture(t); fs.writeFileSync(path.join(d, gate.LOCK), '{}', { mode: 0o600 });
    const file = path.resolve(__dirname, '../../runtime/release/maintenance.cjs');
    const child = spawnSync(process.execPath, ['-e', 'require(process.argv[1]).authorizeStart(process.argv[2],"ui-onboarding")', file, d], { timeout: 5000 });
    assert.equal(child.status, 0); assert.throws(() => gate.checkStart(d));
});
for (const [field, value] of [['startTicks', '0'], ['bootId', '00000000-0000-0000-0000-000000000000'], ['operation', 'arbitrary'], ['version', 2]]) {
    test(`stale or invalid permit ${field}`, t => {
        const d = fixture(t); fs.writeFileSync(path.join(d, gate.LOCK), '{}', { mode: 0o600 });
        const permit = gate.authorizeStart(d, 'additive-release'); permit[field] = value;
        fs.writeFileSync(path.join(d, gate.PERMIT), JSON.stringify(permit)); assert.throws(() => gate.checkStart(d));
    });
}
test('orphan permit cannot bypass absent lock', t => {
    const d = fixture(t); fs.writeFileSync(path.join(d, gate.LOCK), '{}', { mode: 0o600 });
    gate.authorizeStart(d, 'additive-release'); fs.unlinkSync(path.join(d, gate.LOCK));
    assert.throws(() => gate.checkStart(d), /MAINTENANCE_ORPHAN_PERMIT/);
});
test('writable lock and symlinked permit rejected', t => {
    const d = fixture(t), lock = path.join(d, gate.LOCK); fs.writeFileSync(lock, '{}', { mode: 0o600 });
    fs.chmodSync(lock, 0o666); assert.throws(() => gate.authorizeStart(d, 'additive-release'));
    fs.chmodSync(lock, 0o600); fs.symlinkSync(lock, path.join(d, gate.PERMIT)); assert.throws(() => gate.checkStart(d));
});
