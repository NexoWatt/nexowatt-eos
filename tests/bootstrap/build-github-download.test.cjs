'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const builder = require('../../tools/bootstrap/build-github-download.cjs');
const driver = builder.identity(Buffer.from('# fixture\n'));
const manifest = builder.identity(Buffer.from('{"fixture":true}\n'));

test('Git blob identity hashes the canonical Git header as well as exact bytes', () => {
    // Well-known empty-blob Git object ID is tested independently of the helper.
    assert.throws(() => builder.identity(Buffer.alloc(0)), /GITHUB_BUILD_BLOB_SIZE/);
    const bytes = Buffer.from('test content\n');
    assert.equal(builder.identity(bytes).blob, 'd670460b4b4aece5915caf5c68d12f560a9fe3e4');
    assert.equal(builder.identity(bytes).sha256, crypto.createHash('sha256').update(bytes).digest('hex'));
    assert.equal(builder.identity(bytes).bytes, bytes.length);
    assert.notEqual(builder.identity(Buffer.from('test content\r\n')).blob, builder.identity(bytes).blob);
});

test('manufacturer inputs require authentic public trust and pins; arbitrary repository credentials are not CLI options', () => {
    const args = ['--license-trust', path.resolve('public.json'), '--license-trust-sha256', 'a'.repeat(64),
        '--release-public-key-sha256', 'b'.repeat(64), '--output', path.resolve('delivery/new-kit')];
    assert.equal(builder.parse(args)['--license-trust'], path.resolve('public.json'));
    for (const bad of [[], args.slice(0, -2), [...args, '--token', 'fixture'],
        args.map(x => x === '--output' ? '--repository' : x), args.map(x => x === 'a'.repeat(64) ? 'bad' : x)])
        assert.throws(() => builder.parse(bad));
});

test('target command keeps token out of argv, history, URLs, disk and child environment', () => {
    const command = builder.installCommand(driver, manifest);
    assert.match(command, /read -r -s .*eos_token <\/dev\/tty/);
    assert.match(command, /printf 'header = "Authorization: Bearer %s"/);
    assert.match(command, /curl -q --config -/);
    assert.match(command, /exec 3< <\(printf '%s\\n' "\$eos_token"\)/);
    assert.ok(command.indexOf('set +x') < command.indexOf('read -r -s'));
    assert.ok(command.indexOf('unset eos_token') < command.lastIndexOf('/usr/bin/python3'));
    assert.match(command, /\/usr\/bin\/env -i PATH=/);
    assert.doesNotMatch(command, /--insecure|--location|export eos_token|credential.helper|\|\s*(?:sudo\s+)?bash|https:\/\/[^\s]*\$eos_token/);
    assert.equal((command.match(/GitHub-Token/g) || []).length, 1);
});

test('only pinned fixed-repository code executes, after complete bounded HTTPS download and SHA256 check', () => {
    const command = builder.installCommand(driver, manifest);
    assert.match(command, new RegExp(`https://api.github.com/repos/NexoWatt/nexowatt-eos/git/blobs/${driver.blob}`));
    assert.ok(command.indexOf('sha256sum --check --status') < command.lastIndexOf('/usr/bin/python3'));
    assert.ok(command.includes(driver.sha256));
    assert.ok(command.includes(`--max-filesize ${driver.bytes}`));
    assert.ok(command.includes(`--manifest-blob ${manifest.blob} --manifest-sha256 ${manifest.sha256}`));
    for (const change of [{ blob: 'main' }, { sha256: 'a;exit' }, { bytes: -1 }, { bytes: 2 ** 31 }])
        assert.throws(() => builder.installCommand({ ...driver, ...change }, manifest), /GITHUB_BUILD_COMMAND_PIN/);
});

test('copyable here-document parses in real Bash including protected token descriptor handoff', t => {
    const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
    assert.ok(fs.existsSync(bash), 'real Bash required for this verification');
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-github-shell-'));
    t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
    const text = builder.installCommand(driver, manifest);
    for (const [name, bytes] of [['copy-command.sh', text], ['command-body.sh', text.split('\n').slice(1, -1).join('\n')]]) {
        const file = path.join(folder, name); fs.writeFileSync(file, bytes + '\n');
        const run = cp.spawnSync(bash, ['-n', file], { encoding: 'utf8', windowsHide: true, shell: false });
        assert.equal(run.status, 0, run.stderr);
    }
});

test('inherited export and allexport cannot copy the new token into child environments; FD3 survives exec', () => {
    const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
    const command = builder.installCommand(driver, manifest);
    const reset = /set \+a\nunset eos_token\n/.exec(command);
    assert.ok(reset && command.indexOf(reset[0]) < command.indexOf('read -r -s'));
    const handoff = /exec 3< <\(printf '%s\\n' "\$eos_token"\)\nunset eos_token\n/.exec(command);
    assert.ok(handoff);
    const script = `set -a\nexport eos_token=old_exported_value\n${reset[0]}read -r eos_token <<'FIXTURE'\npublic_fixture_1234567890\nFIXTURE\n/bin/bash -c '[[ ! \${eos_token+x} ]]' || exit 71\n${handoff[0]}exec /bin/bash -c '[[ ! \${eos_token+x} ]] || exit 72; IFS= read -r received <&3; [[ $received == public_fixture_1234567890 ]]'\n`;
    const result = cp.spawnSync(bash, ['-c', script], { encoding: 'utf8', windowsHide: true, shell: false });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
});
