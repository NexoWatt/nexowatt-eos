'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { assetConfig, render, commandFor, OUTPUT } = require('../../tools/bootstrap/build-public-entry.cjs');
const pinnedCommit = 'a'.repeat(40);
function manifest() {
    return { schemaVersion: 1, kind: 'eos-private-github-test-install', repository: 'NexoWatt/nexowatt-eos',
        ready: true, deliveryDirectory: 'delivery/test-pi-0.2.0-test.3-r4',
        assets: ['installer-kit.zip', 'node-v24.21.0-linux-arm64.tar.xz', 'eos-0.2.0-test.3-linux-arm64.tar.gz']
            .map(name => ({ name, blob: 'b'.repeat(40), sha256: 'c'.repeat(64), bytes: 123 })) };
}
test('public transport retains all three pinned assets and a fixed repository commit', () => {
    const value = manifest(), config = assetConfig(pinnedCommit, value);
    assert.equal(config.baseUrl, `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${pinnedCommit}/delivery/public-assets-test3-r4`);
    assert.deepEqual(config.assets, value.assets.map(({ name, sha256, bytes }) => ({ name, sha256, bytes })));
    assert.equal(config.deliveryDirectory, value.deliveryDirectory);
});
test('public transport rejects mutable refs, foreign repositories and malformed asset sets', () => {
    for (const ref of ['main', 'A'.repeat(40), '../main', '$(id)', '', null])
        assert.throws(() => assetConfig(ref, manifest()), /PUBLIC_ENTRY_REJECTED/);
    for (const mutate of [m => { m.ready = false; }, m => { m.repository = 'other/repo'; },
        m => { m.assets[0].name = '../installer-kit.zip'; }, m => { m.assets[0].sha256 = 'x'.repeat(64); },
        m => { m.assets[1] = m.assets[0]; }, m => { m.assets[0].bytes = 101 * 1024 ** 2; },
        m => { m.assets[0].bytes = '123'; }, m => { m.deliveryDirectory = 'delivery/old'; }]) {
        const value = manifest(); mutate(value);
        assert.throws(() => assetConfig(pinnedCommit, value), /PUBLIC_ENTRY_REJECTED/);
    }
});
test('generated entry contains exact preparer bytes and bounded R2 recovery before normal preparation', () => {
    const preparer = Buffer.from('# isolated preparer fixture\n'), recovery = Buffer.from('# isolated recovery fixture\n');
    const script = render(assetConfig(pinnedCommit, manifest()), preparer, recovery).toString();
    const encoded = script.split("<<'EOS_PYTHON_BASE64'\n")[1].split('\nEOS_PYTHON_BASE64')[0];
    assert.deepEqual(Buffer.from(encoded, 'base64'), preparer);
    const encodedRecovery = script.split("<<'EOS_RECOVERY_BASE64'\n")[1].split('\nEOS_RECOVERY_BASE64')[0];
    assert.deepEqual(Buffer.from(encodedRecovery, 'base64'), recovery);
    assert.match(script, /if \[\[ -e \/opt\/nexowatt\/eos \|\| -L \/opt\/nexowatt\/eos \]\]; then/);
    assert.ok(script.indexOf('sha256sum --check --status') < script.indexOf('recover-sudo-abort.py" --recover'));
    assert.ok(script.indexOf('recover-sudo-abort.py" --recover') < script.lastIndexOf('prepare-host.py" "$eos_stage/download.json"'));
    assert.doesNotMatch(script, /--force|--insecure|Authorization|GitHub-Token/);
    const checked = spawnSync('/bin/bash', ['-n'], { input: script, encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr || checked.error?.code);
    assert.throws(() => render({}, Buffer.alloc(0), recovery), /PUBLIC_ENTRY_REJECTED/);
});
test('one-line curl entry verifies full size and hash in a protected directory before execution', () => {
    const bytes = Buffer.from('#!/bin/bash\nexit 0\n'), value = commandFor(pinnedCommit, bytes);
    assert.equal(value.trim().split('\n').length, 1);
    assert.match(value, /^\/usr\/bin\/sudo \/usr\/bin\/env -i PATH=/);
    assert.match(value, /\/usr\/bin\/mktemp -d \/root\/eos-installer-XXXXXXXX/);
    assert.match(value, /\/usr\/bin\/curl -q --proto =https --tlsv1.2 --fail/);
    assert.match(value, /--max-time 120 --max-filesize 19/);
    assert.equal(OUTPUT, 'delivery/public-entry-test3-r4-recovery2');
    assert.ok(value.includes(`/${pinnedCommit}/${OUTPUT}/install.sh`));
    assert.ok(value.indexOf('sha256sum --check --status') < value.indexOf('/bin/bash "$d/install.sh"'));
    assert.doesNotMatch(value, /--location|--insecure|Authorization|Bearer|GitHub-Token|curl[^;]*\|[^;]*bash/);
    assert.throws(() => commandFor('main', bytes), /PUBLIC_ENTRY_REJECTED/);
    const checked = spawnSync('/bin/bash', ['-n'], { input: value, encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr || checked.error?.code);
});
