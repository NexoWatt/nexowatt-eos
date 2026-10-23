'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const entry = require('../../tools/bootstrap/build-public-r8-managed-entry.cjs');
const root = path.resolve(__dirname, '../..');
const key = fs.readFileSync(path.join(root, 'docs/security/release-trust/manufacturer-20261023-2.pem'));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const metadata = () => ({ schemaVersion: 1, runtimeVersion: '0.2.0-test.3', deliveryRevision: 12, releaseSequence: 15,
    platform: 'linux-arm64', archive: entry.ARCHIVE, bytes: 134040451, sha256: 'a'.repeat(64), releaseId: 'b'.repeat(64),
    signingPublicKeySha256: entry.PUBLIC_KEY_SHA256, productionReleaseApproved: false });
const helpers = () => Object.fromEntries(Object.entries(entry.HELPERS).map(([name, file]) => [name, fs.readFileSync(path.join(root, file))]));
const fixture = t => { const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r8-entry-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true })); return directory; };

test('R8 entry binds replacement manufacturer public key, exact managed15 target and GitHub asset path', () => {
    assert.equal(entry.PUBLIC_KEY_SHA256, '518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40');
    assert.equal(digest(key), entry.PUBLIC_KEY_SHA256);
    const config = entry.configFor(metadata(), key);
    assert.equal(entry.validateConfig(config), config);
    assert.equal(config.url, `https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-${'b'.repeat(64)}/eos-linux-arm64.tar.gz`);
    assert.deepEqual([entry.BASELINE.revision, entry.BASELINE.sequence], [8, 11]);
    assert.equal(entry.BASELINE.publicKeySha256, 'bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5');
    assert.equal(entry.BASELINE.releaseId, 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7');
    assert.equal(config.key.bytes, key.length);
});
for (const [name, expectedHash] of [
    ['manufacturer-20261021.pem', '95151b5f26aa09a95c2f0cb5215fdfc7a7fc3066da9e670937d1e8b50c701248'],
    ['manufacturer-20261023.pem', 'd8808e00b958f476684005a95f543d9dfb3d4532bd54f31552a701d1e6aabdf6']
]) test(`replacement entry rejects ${name} trust in metadata, configuration and rendered key`, () => {
    const formerKey = fs.readFileSync(path.join(root, 'docs/security/release-trust', name));
    const formerHash = digest(formerKey);
    assert.equal(formerHash, expectedHash);
    assert.throws(() => entry.configFor(metadata(), formerKey), /R8_ENTRY_DELIVERY/);
    assert.throws(() => entry.configFor({ ...metadata(), signingPublicKeySha256: formerHash }, key), /R8_ENTRY_DELIVERY/);
    assert.throws(() => entry.configFor({ ...metadata(), signingPublicKeySha256: formerHash }, formerKey), /R8_ENTRY_DELIVERY/);
    const config = entry.configFor(metadata(), key);
    assert.throws(() => entry.validateConfig({ ...config, publicKeySha256: formerHash,
        key: { bytes: formerKey.length, sha256: formerHash } }), /R8_ENTRY_CONFIG/);
    assert.throws(() => entry.render(config, formerKey, helpers()), /R8_ENTRY_KEY/);
});
test('R8 preparation rejects wrong key, sequence, Node platform, archive, production scope and unbounded sizes', () => {
    const differentKey = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    assert.throws(() => entry.configFor(metadata(), differentKey), /R8_ENTRY_DELIVERY/);
    for (const change of [{ releaseSequence: 14 }, { deliveryRevision: 11 }, { platform: 'linux-x64' },
        { archive: '../archive' }, { releaseId: entry.BASELINE.releaseId }, { signingPublicKeySha256: entry.BASELINE.publicKeySha256 },
        { productionReleaseApproved: true }, { bytes: 0 }, { bytes: '123' }, { bytes: 257 * 1024 ** 2 }, { sha256: 'invalid' }]) {
        assert.throws(() => entry.configFor({ ...metadata(), ...change }, key), /R8_ENTRY_DELIVERY/);
    }
});
test('R8 transport configuration rejects alternative origins, main refs, redirects and injected fields', () => {
    const config = entry.configFor(metadata(), key);
    for (const change of [{ url: config.url.replace('github.com', 'evil.test') }, { url: config.url + '?token=x' },
        { url: config.url.replace('managed-test-15-', 'managed-test-16-') }, { url: 'https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/main/archive' },
        { arbitrary: true }, { publicKeySha256: entry.BASELINE.publicKeySha256 }, { key: { ...config.key, bytes: 16385 } }]) {
        assert.throws(() => entry.validateConfig({ ...config, ...change }), /R8_ENTRY_CONFIG/);
    }
});
test('rendered R8 entry has valid Bash, all embedded helpers match and no intermediate updater or APT command', t => {
    const config = entry.configFor(metadata(), key), sources = helpers(), script = entry.render(config, key, sources);
    const file = path.join(fixture(t), 'update.sh'); fs.writeFileSync(file, script);
    const checked = spawnSync('/bin/bash', ['-n', file], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
    const text = script.toString();
    for (const [marker, bytes] of [['EOS_KEY_BASE64', key], ['EOS_EXTRACTOR_BASE64', sources.extractor], ['EOS_ARCHIVE_BASE64', sources.archiveHelper],
        ['EOS_TRANSPORT_BASE64', sources.transport], ['EOS_DOWNLOAD_BASE64', sources.downloader], ['EOS_SUPERVISOR_BASE64', entry.SUPERVISOR]]) {
        const match = new RegExp("<<'" + marker + "'\\n([A-Za-z0-9+/=\\n]+)\\n" + marker).exec(text);
        assert.ok(match, marker); assert.deepEqual(Buffer.from(match[1], 'base64'), bytes, marker);
    }
    assert.match(text, /node --version\) == v24\.21\.0/);
    assert.ok(text.indexOf('node --version') < text.indexOf('eos_stage='));
    assert.match(text, /\/usr\/sbin\/nft \/usr\/sbin\/ip \/usr\/sbin\/dnsmasq/);
    assert.match(text, /update-r8-to-managed\.cjs/);
    assert.match(text, /ExecStopPost=.*--quiesce-incomplete/);
    assert.match(text, /--unit=nexowatt-eos-r8-managed-update/);
    assert.match(text, /--expected-key-sha256 '518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40'/);
    assert.doesNotMatch(text, /update-test-to-r9|update-test-to-r10|update-test-to-r11|apt-get|curl[^\n]*--location|--insecure/);
    assert.ok(text.indexOf('--destination "$eos_stage/extracted" --sha256') < text.indexOf('/usr/bin/node -e'));
    assert.throws(() => entry.render(config, Buffer.from('bad'), sources), /R8_ENTRY_KEY/);
});
test('entry command requires immutable Raw URL and authenticates complete script before execution', t => {
    const script = entry.render(entry.configFor(metadata(), key), key, helpers());
    const base = `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${'c'.repeat(40)}/delivery/public-r8-managed`;
    const command = entry.commandFor(base, script);
    assert.match(command, new RegExp(digest(script)));
    assert.ok(command.includes('--max-filesize ' + script.length));
    assert.match(command, /--connect-timeout 5 --max-time 5/);
    assert.ok(command.indexOf('sha256sum --check --status') < command.indexOf('/bin/bash "$d/update.sh"'));
    const file = path.join(fixture(t), 'command.sh'); fs.writeFileSync(file, command);
    assert.equal(spawnSync('/bin/bash', ['-n', file]).status, 0);
    for (const bad of [base.replace('c'.repeat(40), 'main'), base + '?x=1', base + '/..', base.replace('raw.githubusercontent.com', 'evil.test')])
        assert.throws(() => entry.commandFor(bad, script), /R8_ENTRY_COMMAND/);
});
test('finalization verifies preparation bytes, never overwrites and does not claim public readback', t => {
    const directory = fixture(t), config = entry.configFor(metadata(), key), script = entry.render(config, key, helpers());
    const record = { schemaVersion: 1, kind: 'eos-r8-managed-entry-preparation', releaseSequence: 15,
        commandReady: false, archiveSignatureVerified: true, archiveReadbackVerified: true, nodeVersion: '24.22.1',
        installer: { bytes: script.length, sha256: digest(script) }, config };
    fs.writeFileSync(path.join(directory, 'update.sh'), script);
    fs.writeFileSync(path.join(directory, 'preparation.json'), JSON.stringify(record));
    const entryBaseUrl = `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${'c'.repeat(40)}/delivery/public-r8-managed`;
    fs.appendFileSync(path.join(directory, 'update.sh'), '\n# changed');
    assert.throws(() => entry.finalize({ directory, entryBaseUrl }), /R8_ENTRY_PREPARATION_BINDING/);
    assert.equal(fs.existsSync(path.join(directory, 'R8_UPDATE_COMMAND.txt')), false);
    fs.writeFileSync(path.join(directory, 'update.sh'), script);
    const report = entry.finalize({ directory, entryBaseUrl });
    assert.equal(report.commandReady, true); assert.equal(report.publicReadbackPerformed, false); assert.equal(report.targetUpdateExecuted, false);
    assert.throws(() => entry.finalize({ directory, entryBaseUrl }), /R8_ENTRY_OUTPUT_EXISTS/);
});
test('supervisor rejects absent invocation and strips inherited Node/Python options', t => {
    const file = path.join(fixture(t), 'supervisor.py'); fs.writeFileSync(file, entry.SUPERVISOR);
    const denied = spawnSync('/usr/bin/python3', ['-I', '-B', file, '-e', 'process.exit(99)'], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin' } });
    assert.equal(denied.status, 1); assert.match(denied.stderr, /R8_MANAGED_SUPERVISOR_REQUIRED/);
    const run = spawnSync('/usr/bin/python3', ['-I', '-B', '-c', `import json,os,runpy,sys
os.geteuid=lambda:0
def capture(file,args,env):
    print(json.dumps({'file':file,'args':args,'env':env})); raise SystemExit(0)
os.execve=capture
sys.argv=[sys.argv[1],'/root/pinned-updater.cjs','--quiesce-incomplete']
runpy.run_path(sys.argv[0],run_name='__main__')
`, file], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', INVOCATION_ID: 'a'.repeat(32), NODE_OPTIONS: 'private', PYTHONPATH: 'private' } });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(run.stdout), { file: '/usr/bin/node', args: ['/usr/bin/node', '/root/pinned-updater.cjs', '--quiesce-incomplete'],
        env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LC_ALL: 'C', INVOCATION_ID: 'a'.repeat(32) } });
});
