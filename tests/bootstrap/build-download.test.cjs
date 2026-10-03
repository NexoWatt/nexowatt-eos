'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const builder = require('../../tools/bootstrap/build-download.cjs');
const { sha256 } = require('../../runtime/release/bundle.cjs');
const ROOT = path.resolve(__dirname, '../..');
const python = process.platform === 'win32' ? 'python' : '/usr/bin/python3';

test('download endpoint excludes shell, auth, query, redirect and path injection syntax', () => {
    for (const value of ['https://install.example.com', 'https://install.example.com/test/0.2.0-test.3-r3'])
        assert.equal(builder.baseUrl(value), value);
    for (const value of ['', 'http://install.example.com', 'https://user:pass@install.example.com',
        'https://install.example.com?a=b', 'https://install.example.com/#x', 'https://install.example.com:8443',
        'https://install.example.com/a/../b', 'https://install.example.com/%2e', 'https://install.example.com/$x',
        'https://install.example.com/`id`', 'https://install.example.com/\na', 'https://install.example.com/'])
        assert.throws(() => builder.baseUrl(value), /DOWNLOAD_/);
});

test('manufacturer must supply real-shaped Ed25519 public trust with separate exact pin', () => {
    const keys = crypto.generateKeyPairSync('ed25519');
    const bytes = Buffer.from(JSON.stringify({ fixture: keys.publicKey.export({ format: 'pem', type: 'spki' }) }));
    assert.equal(builder.licenseTrust(bytes, sha256(bytes)), bytes);
    for (const value of [Buffer.from('{}'), Buffer.from('{"keys":[]}'),
        Buffer.from(JSON.stringify({ fixture: keys.privateKey.export({ format: 'pem', type: 'pkcs8' }) })),
        Buffer.from(JSON.stringify({ fixture: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'pem', type: 'spki' }) }))])
        assert.throws(() => builder.licenseTrust(value, sha256(value)), /DOWNLOAD_LICENSE_TRUST/);
    assert.throws(() => builder.licenseTrust(bytes, 'a'.repeat(64)), /DOWNLOAD_LICENSE_TRUST/);
});

test('kit cannot ship changed or omitted signed helpers or extra runtime code', () => {
    const manifest = { files: [{ path: 'runtime/a.cjs', size: 3, sha256: 'a'.repeat(64) },
        { path: 'tools/system/postgresql-host-preflight.cjs', size: 4, sha256: 'b'.repeat(64) }] };
    const rows = manifest.files.map(row => ({ name: row.path, bytes: row.size, sha256: row.sha256 }));
    assert.equal(builder.sourceBinding(manifest, rows), 2);
    assert.throws(() => builder.sourceBinding(manifest, rows.slice(1)), /DOWNLOAD_SOURCE_BINDING/);
    assert.throws(() => builder.sourceBinding(manifest, [{ ...rows[0], sha256: 'c'.repeat(64) }, rows[1]]), /DOWNLOAD_SOURCE_BINDING/);
    assert.throws(() => builder.sourceBinding(manifest, [...rows, { name: 'runtime/extra.cjs', bytes: 1, sha256: 'd'.repeat(64) }]), /DOWNLOAD_SOURCE_BINDING/);
});

test('one command checks a separately delivered script pin before execution; script data survive exact embedding', () => {
    const config = { schemaVersion: 1, baseUrl: 'https://install.example.com/test', assets: [] };
    const code = Buffer.from('print("fixture only")\n');
    const script = builder.renderScript(config, code);
    const embedded = /<<'EOS_PYTHON_BASE64'\n([A-Za-z0-9+/=\n]+)\nEOS_PYTHON_BASE64/.exec(script)[1];
    assert.deepEqual(Buffer.from(embedded.replace(/\n/g, ''), 'base64'), code);
    const metadata = /<<'EOS_CONFIG_BASE64'\n([A-Za-z0-9+/=\n]+)\nEOS_CONFIG_BASE64/.exec(script)[1];
    assert.deepEqual(JSON.parse(Buffer.from(metadata.replace(/\n/g, ''), 'base64')), config);
    const command = builder.installCommand(config.baseUrl, Buffer.from(script));
    assert.ok(command.includes(sha256(script)));
    assert.ok(command.indexOf('sha256sum --check --status') < command.indexOf('/bin/bash "$d/install.sh"'));
    assert.match(command, /--max-filesize \d+/);
    assert.doesNotMatch(command, /--insecure|\|\s*(sudo\s+)?bash|--location/);
    assert.match(script, /\/usr\/bin\/env -i/);
});

test('canonical ZIP builder reads back bytes and refuses changed source before it can become a valid kit', t => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-download-kit-'));
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    const source = path.join(temp, 'fixture.cjs'), spec = path.join(temp, 'spec.json');
    fs.writeFileSync(source, 'fixture\n');
    const row = { name: 'runtime/fixture.cjs', source, bytes: 8, sha256: sha256('fixture\n') };
    fs.writeFileSync(spec, JSON.stringify([row]));
    const run = out => cp.spawnSync(python, ['-I', '-B', path.join(ROOT, 'tools/bootstrap/build-kit.py'), spec, out],
        { encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000 });
    const a = path.join(temp, 'a.zip'), b = path.join(temp, 'b.zip');
    assert.equal(run(a).status, 0); assert.equal(run(b).status, 0);
    assert.deepEqual(fs.readFileSync(a), fs.readFileSync(b));
    fs.writeFileSync(source, 'mutated\n');
    assert.notEqual(run(path.join(temp, 'changed.zip')).status, 0);
    fs.writeFileSync(spec, JSON.stringify([{ ...row, name: '../escape' }]));
    assert.notEqual(run(path.join(temp, 'escape.zip')).status, 0);
});

test('build CLI accepts only explicit manufacturer inputs, never private signing keys or target passwords', () => {
    const args = ['--base-url', 'https://install.example.com/test', '--license-trust', path.resolve('public.json'),
        '--license-trust-sha256', 'a'.repeat(64), '--release-public-key-sha256', 'b'.repeat(64), '--output', path.resolve('output')];
    assert.equal(builder.parse(args)['--base-url'], 'https://install.example.com/test');
    for (const bad of [[], args.slice(0, -2), [...args, '--password', 'never'],
        args.map(x => x === '--license-trust' ? '--private-key' : x), args.map(x => x === 'a'.repeat(64) ? '' : x)])
        assert.throws(() => builder.parse(bad), /DOWNLOAD_/);
});
