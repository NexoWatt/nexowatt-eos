'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { render } = require('../../tools/bootstrap/build-stability-entry.cjs');
const pin = letter => ({ blob: letter.repeat(40), sha256: letter.repeat(64), bytes: 1234 });
test('one pasteable command validates downloaded code before execution and keeps recovery conditional', () => {
    const command = render(pin('a'), pin('b'), pin('c'));
    const syntax = spawnSync('/bin/bash', ['-n'], { input: command, encoding: 'utf8' });
    assert.equal(syntax.status, 0, 'shell syntax rejected');
    assert.match(command, /^sudo \/bin\/bash <<'EOS_INSTALL'\n/);
    assert.ok(command.indexOf("'a" + 'a'.repeat(63) + "'") < command.indexOf('exec /usr/bin/env'));
    const condition = command.indexOf('if [[ -e /opt/nexowatt/eos || -L /opt/nexowatt/eos ]]; then');
    const verification = command.indexOf("'" + 'c'.repeat(64) + "'");
    const recovery = command.indexOf('"$eos_stage/recover-sudo-abort.py" --recover');
    const fd = command.indexOf('exec 3< <(printf');
    assert.ok(condition > 0 && condition < verification && verification < recovery && recovery < fd);
    assert.match(command.slice(recovery, fd), /\nfi\n/);
    assert.match(command, /read -r -s -p 'GitHub-Token: ' eos_token <\/dev\/tty/);
    assert.match(command, /unset eos_token\nexec \/usr\/bin\/env -i/);
    assert.equal(command.includes('--force'), false);
    assert.equal(command.includes('--insecure'), false);
    assert.equal(command.includes('rm -rf'), false);
    assert.equal(command.includes('curl |'), false);
});
test('invalid or injected recovery pins are refused before generating a command', () => {
    for (const invalid of [null, {}, { ...pin('c'), blob: '$(id)' }, { ...pin('c'), sha256: '\n' },
        { ...pin('c'), bytes: 0 }, { ...pin('c'), bytes: 1024 * 1024 + 1 }])
        assert.throws(() => render(pin('a'), pin('b'), invalid), { code: 'STABILITY_ENTRY_PIN' });
});
