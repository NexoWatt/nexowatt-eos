'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { configFor, validateConfig, render, downloadFunction, commandFor, validateRecoveryBinding, ARCHIVE, OUTPUT, SUPERVISOR, BASELINES, HISTORICAL_TARGETS, SCOPE } =
    require('../../tools/bootstrap/build-public-r7-recovery-entry.cjs');
const root = path.resolve(__dirname, '../..');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const key = Buffer.from(crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'pem', type: 'spki' }));
function metadata() {
    return { schemaVersion: 1, runtimeVersion: '0.2.0-test.3', deliveryRevision: 7, releaseSequence: 10,
        platform: 'linux-arm64', archive: ARCHIVE, bytes: 321, sha256: 'a'.repeat(64), releaseId: 'b'.repeat(64),
        signingPublicKeySha256: digest(key), productionReleaseApproved: false, physicalControlEnabled: false };
}
function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-public-r7-recovery-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return directory;
}
function helpers() {
    return [fs.readFileSync(path.join(root, 'tools/system/extract-test-bundle.py')),
        fs.readFileSync(path.join(root, 'tools/integration/test-archive.py'))];
}
test('R7 recovery transport binds immutable commit, key, archive and exact test scope', () => {
    const value = metadata(), config = configFor('c'.repeat(40), value, key);
    assert.equal(validateConfig(config), config);
    assert.equal(config.key.sha256, value.signingPublicKeySha256);
    assert.equal(config.archive.sha256, value.sha256);
    assert.match(config.baseUrl, /\/cccccccccccccccccccccccccccccccccccccccc\/delivery\/test-pi-0\.2\.0-test\.3-r7$/);
    assert.equal(config.recoveryScope, SCOPE);
    for (const badRef of ['main', '', 'A'.repeat(40), '../main', '$(id)'])
        assert.throws(() => configFor(badRef, value, key), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
});
test('malformed metadata, key substitution, old release and broad admission are rejected', () => {
    for (const mutate of [m => { m.releaseSequence = 7; }, m => { m.deliveryRevision = 4; },
        m => { m.archive = '../eos.tar.gz'; }, m => { m.bytes = 101 * 1024 ** 2; }, m => { m.bytes = '321'; },
        m => { m.platform = 'linux-x64'; }, m => { m.productionReleaseApproved = true; },
        m => { m.physicalControlEnabled = true; }, m => { m.signingPublicKeySha256 = 'd'.repeat(64); },
        m => { m.sha256 = 'invalid'; }, m => { m.releaseId = '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8'; }]) {
        const value = metadata(); mutate(value);
        assert.throws(() => configFor('c'.repeat(40), value, key), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
    }
    const config = configFor('c'.repeat(40), metadata(), key);
    config.baseUrl += '/../../other';
    assert.throws(() => render(config, ...helpers()), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
});
test('entry embeds exact reviewed extractors, authenticates assets, and supervises updater', () => {
    const bytes = helpers(), script = render(configFor('c'.repeat(40), metadata(), key), ...bytes).toString();
    for (const [index, name] of [[0, 'EXTRACTOR'], [1, 'ARCHIVE']]) {
        const encoded = script.split(`<<'EOS_${name}_BASE64'\n`)[1].split(`\nEOS_${name}_BASE64`)[0];
        assert.deepEqual(Buffer.from(encoded, 'base64'), bytes[index]);
    }
    const encoded = script.split("<<'EOS_SUPERVISOR_BASE64'\n")[1].split('\nEOS_SUPERVISOR_BASE64')[0];
    assert.deepEqual(Buffer.from(encoded, 'base64'), SUPERVISOR);
    assert.ok(script.indexOf("eos_download 'https:") < script.indexOf('/usr/bin/python3 -I -B "$eos_stage/tools/system/'));
    assert.ok(script.indexOf("--sha256 '") < script.indexOf('/usr/bin/node -e'));
    assert.match(script, /if \(!toolTrust\(tool\)\.trusted\)/);
    assert.match(script, /systemd-run --unit=nexowatt-eos-first-start-recovery-r7 --wait --pipe --collect --service-type=oneshot/);
    assert.match(script, /ExecStopPost=.*--quiesce-incomplete/);
    assert.match(script, /--expected-release-id 'b{64}'/);
    assert.match(script, /--expected-key-sha256 '[a-f0-9]{64}'/);
    assert.doesNotMatch(script, /--insecure|--location|curl[^\n]*\|[^\n]*bash|rm -rf|chown|apt-get|install-host/);
    assert.equal(spawnSync('/bin/bash', ['-n'], { input: script, encoding: 'utf8' }).status, 0);
});
test('outer one-line command checks protected root, complete size and digest before execution', () => {
    const script = Buffer.from('#!/bin/bash\nexit 0\n'), command = commandFor('c'.repeat(40), script);
    assert.equal(command.trim().split('\n').length, 1);
    assert.match(command, /^\/usr\/bin\/sudo \/usr\/bin\/env -i PATH=/);
    assert.ok(command.includes(`/cccccccccccccccccccccccccccccccccccccccc/${OUTPUT}/recover.sh`));
    assert.match(command, /--max-time 120 --max-filesize 19/);
    assert.match(command, /stat -c %h/); assert.match(command, /! -L/);
    assert.ok(command.indexOf('sha256sum --check --status') < command.indexOf('/bin/bash "$d/recover.sh"'));
    assert.equal(spawnSync('/bin/bash', ['-n'], { input: command, encoding: 'utf8' }).status, 0);
    assert.throws(() => commandFor('main', script), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
});

// Boundary tests substitute only curl's executable in the generated function.
// They run real Bash/stat/sha256sum against temporary files, with no network or
// privileged service operation. Production has no fixture path/CLI override.
function downloadHarness(t, { mode = 'valid', existing = false } = {}) {
    const directory = fixture(t), source = path.join(directory, 'source'), destination = path.join(directory, 'download');
    const stub = path.join(directory, 'curl-fixture'), sentinel = path.join(directory, 'executed');
    const body = Buffer.from('reviewed fixture bytes\n'); fs.writeFileSync(source, body);
    if (existing) fs.writeFileSync(destination, 'preserve');
    fs.writeFileSync(stub, '#!/bin/bash\nset -eu\nwhile [[ $# -gt 0 ]]; do if [[ "$1" == -o ]]; then target="$2"; break; fi; shift; done\n' +
        (mode === 'failure' ? 'exit 28\n' : mode === 'symlink' ? `ln -s '${source}' "$target"\n` :
            mode === 'hardlink' ? `ln '${source}' "$target"\n` : `cp '${source}' "$target"\n`), { mode: 0o755 });
    const size = mode === 'size' ? body.length + 1 : body.length;
    const hash = mode === 'hash' ? digest(Buffer.from('different')) : digest(body);
    const script = 'set -euo pipefail\n' + downloadFunction().replace('/usr/bin/curl', `'${stub}'`) +
        `eos_download 'https://example.invalid/pinned' '${destination}' '${size}' '${hash}'\n` +
        `printf accepted > '${sentinel}'\n`;
    const result = spawnSync('/bin/bash', ['-c', script], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' } });
    return { result, destination, sentinel };
}
test('only a complete hash-matching download reaches the execution boundary', t => {
    const value = downloadHarness(t);
    assert.equal(value.result.status, 0, value.result.stderr);
    assert.equal(fs.readFileSync(value.sentinel, 'utf8'), 'accepted');
});
for (const mode of ['hash', 'size', 'failure', 'symlink', 'hardlink']) {
    test(`download ${mode} failure never reaches the execution boundary`, t => {
        const value = downloadHarness(t, { mode });
        assert.notEqual(value.result.status, 0); assert.equal(fs.existsSync(value.sentinel), false);
    });
}
test('download refuses to overwrite existing data', t => {
    const value = downloadHarness(t, { existing: true });
    assert.notEqual(value.result.status, 0); assert.equal(fs.existsSync(value.sentinel), false);
    assert.equal(fs.readFileSync(value.destination, 'utf8'), 'preserve');
});
test('embedded extractor works as packaged and rejects hash, traversal, links and existing output', t => {
    const directory = fixture(t), extract = path.join(directory, 'tools/system/extract-test-bundle.py');
    const [extractor, archiveHelper] = helpers();
    fs.mkdirSync(path.dirname(extract), { recursive: true }); fs.mkdirSync(path.join(directory, 'tools/integration'));
    fs.writeFileSync(extract, extractor); fs.writeFileSync(path.join(directory, 'tools/integration/test-archive.py'), archiveHelper);
    for (const mode of ['valid', 'hash', 'traversal', 'link', 'exists']) {
        const archive = path.join(directory, mode + '.tar.gz'), destination = path.join(directory, 'out-' + mode);
        const make = spawnSync('/usr/bin/python3', ['-I', '-B', '-c', `import io,sys,tarfile
with tarfile.open(sys.argv[1],'w:gz') as tar:
    for name in ['bundle/manifest.json','bundle/manifest.sig','bundle/payload/example.txt']:
        info=tarfile.TarInfo(name); info.mode=0o644; info.size=2; tar.addfile(info,io.BytesIO(b'{}'))
    if sys.argv[2]=='traversal':
        info=tarfile.TarInfo('bundle/payload/../../escape'); info.mode=0o644; tar.addfile(info,io.BytesIO(b''))
    if sys.argv[2]=='link':
        info=tarfile.TarInfo('bundle/payload/link'); info.mode=0o644; info.type=tarfile.SYMTYPE; info.linkname='/etc'; tar.addfile(info)
`, archive, mode], { encoding: 'utf8' });
        assert.equal(make.status, 0, make.stderr);
        if (mode === 'exists') fs.mkdirSync(destination);
        const run = spawnSync('/usr/bin/python3', ['-I', '-B', extract, '--archive', archive, '--destination', destination,
            '--sha256', mode === 'hash' ? 'a'.repeat(64) : digest(fs.readFileSync(archive))], { encoding: 'utf8' });
        if (mode === 'valid') {
            assert.equal(run.status, 0, run.stdout + run.stderr);
            assert.equal(JSON.parse(run.stdout).codeExecuted, false);
            assert.equal(fs.readFileSync(path.join(destination, 'bundle/payload/example.txt'), 'utf8'), '{}');
        } else {
            assert.notEqual(run.status, 0, mode);
            assert.equal(fs.existsSync(path.join(destination, 'bundle')), false, mode);
        }
    }
});
test('supervisor rejects absent/malformed invocation and clears inherited Node/Python options', t => {
    const directory = fixture(t), supervisor = path.join(directory, 'supervisor.py'); fs.writeFileSync(supervisor, SUPERVISOR);
    for (const invocation of ['', 'xyz', 'a'.repeat(31)]) {
        const run = spawnSync('/usr/bin/python3', ['-I', '-B', supervisor, '-e', 'process.exit(99)'],
            { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', INVOCATION_ID: invocation } });
        assert.equal(run.status, 1); assert.match(run.stderr, /R7_RECOVERY_SUPERVISOR_REQUIRED/);
    }
    // This interpreter harness captures execve; it never launches a target updater.
    const run = spawnSync('/usr/bin/python3', ['-I', '-B', '-c', `import json,os,runpy,sys
os.geteuid=lambda:0
def capture(file,args,env):
    print(json.dumps({'file':file,'args':args,'env':env})); raise SystemExit(0)
os.execve=capture
sys.argv=[sys.argv[1],'/root/pinned-updater.cjs','--quiesce-incomplete']
runpy.run_path(sys.argv[0],run_name='__main__')
`, supervisor], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', INVOCATION_ID: 'a'.repeat(32),
        NODE_OPTIONS: '--require /untrusted.cjs', PYTHONPATH: '/untrusted' } });
    assert.equal(run.status, 0, run.stderr);
    const captured = JSON.parse(run.stdout);
    assert.equal(captured.file, '/usr/bin/node');
    assert.deepEqual(captured.args, ['/usr/bin/node', '/root/pinned-updater.cjs', '--quiesce-incomplete']);
    assert.deepEqual(captured.env, { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LC_ALL: 'C', INVOCATION_ID: 'a'.repeat(32) });
});

test('all R4/R5/R6 release and key pins are forbidden as R7 target; only R4 is an accepted starting baseline', () => {
    const value = metadata();
    for (const base of HISTORICAL_TARGETS) {
        assert.throws(() => configFor('c'.repeat(40), { ...value, releaseId: base.releaseId }, key), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
        const config = configFor('c'.repeat(40), value, key);
        assert.throws(() => validateConfig({ ...config, releaseId: base.releaseId }), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
        assert.throws(() => validateConfig({ ...config, publicKeySha256: base.publicKeySha256, key: { ...config.key, sha256: base.publicKeySha256 } }), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
    }
    assert.deepEqual(BASELINES.map(row => [row.revision, row.sequence]), [[4, 7]]);
});
test('R7 recovery script selects only the new updater/output and preserves bounded checked TLS downloads', () => {
    const script = render(configFor('c'.repeat(40), metadata(), key), ...helpers()).toString();
    assert.match(script, /tools\/system\/recover-r4-first-start-to-r7\.cjs/);
    assert.match(script, /RECOVERY_ENTRY_VERSION=2026-10-04/);
    assert.match(script, /mktemp -d \/root\/eos-recovery-r7-/);
    assert.match(script, /--connect-timeout 20 --max-time 300 --max-filesize/);
    assert.match(script, /--proto =https --tlsv1\.2 --fail/);
    assert.doesNotMatch(script, /update-test-r4-to-r5\.cjs|update-test-to-r6\.cjs|public-repair-test3-r5|UPDATE_COMMAND|--location|--insecure/);
});

test('entry refuses broad recovery scope and requires the actual signed helper bytes', () => {
    const config = configFor('c'.repeat(40), metadata(), key);
    assert.throws(() => validateConfig({ ...config, recoveryScope: 'all-existing-installations' }), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
    const updater = fs.readFileSync(path.join(root, 'tools/system/recover-r4-first-start-to-r7.cjs'));
    const checked = { manifest: { files: [{ path: 'tools/system/recover-r4-first-start-to-r7.cjs', sha256: digest(updater), size: updater.length }] } };
    assert.equal(validateRecoveryBinding(checked, updater), true);
    for (const mutate of [value => { value.manifest.files = []; }, value => { value.manifest.files[0].path = 'tools/system/update-test-to-r6.cjs'; },
        value => { value.manifest.files[0].sha256 = 'a'.repeat(64); }, value => { value.manifest.files[0].size++; }]) {
        const changed = structuredClone(checked); mutate(changed);
        assert.throws(() => validateRecoveryBinding(changed, updater), /PUBLIC_R7_RECOVERY_ENTRY_REJECTED/);
    }
});
