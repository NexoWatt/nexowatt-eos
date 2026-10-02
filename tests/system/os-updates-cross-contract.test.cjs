'use strict';
// Exercise the real Python producer and real JS consumer together. No APT,
// systemd, network, status-file writes or installed application are invoked.
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { sanitizeStatus } = require('../../components/ui/lib/os-update-status.js');
const runner = path.resolve(__dirname, '../../runtime/os-updates/runner.py');
function produce(profile) {
    const code = `import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('eos_update_contract',sys.argv[1])
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
s=m.initial_status()
if sys.argv[2]!='initial':
    now=m.timestamp()
    s.update(generatedAt=now,lastAttemptAt=now,lastSuccessAt=now)
    s['policy']['debianMajor']='13'
    s['timers'].update(enabled=True,active=True,checkedAt=now)
    s['pending'].update(securityCount=0,heldSecurityCount=0,blockedSecurityCount=0,availableCount=0,vendorCount=0)
    s['activation'].update(state='not-required',serviceRestartCount=0,sessionRestartCount=0)
    s['reboot']['state']='not-required'
    s['coverage'].update(state='complete-for-configured-origins',gaps=[])
    if sys.argv[2]=='gap':
        s['coverage'].update(state='gap',gaps=['independent-distro-update-timer-active'])
    if sys.argv[2]=='disabled':
        s['policy']['automatic']=False
    if sys.argv[2]=='pending':
        s['pending'].update(securityCount=1,blockedSecurityCount=1,availableCount=1)
    s['state']=m.classify(s)
print(json.dumps(s))
`;
    const result = spawnSync('/usr/bin/python3', ['-I', '-B', '-c', code, runner, profile], {
        encoding: 'utf8', timeout: 5000, maxBuffer: 65536,
        env: { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8' },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
}
test('real Python initial status remains explicitly never-run in JS reader', () => {
    const value = sanitizeStatus(produce('initial'));
    assert.equal(value.health, 'warning');
    assert.equal(value.summary.state, 'never-run');
    assert.equal(value.summary.lastSuccessAt, null);
});
test('real producer and consumer agree on successful, pending, gap and disabled states', () => {
    for (const profile of ['ok', 'pending', 'gap', 'disabled']) {
        const produced = produce(profile);
        const value = sanitizeStatus(produced);
        assert.equal(value.availability, 'available', profile);
        assert.equal(value.summary.state, produced.state, profile);
        assert.equal(value.health, profile === 'ok' ? 'ok' : 'warning', profile);
        assert.equal('packages' in value.summary.pending, false);
    }
});
