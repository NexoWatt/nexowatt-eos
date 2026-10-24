'use strict';
// Real file, crypto, ZIP and process-syntax checks. Installer/TTY effects are
// explicit fixtures: no APT, target-host installation or release signing here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const managed = require('../../tools/bootstrap/first-start-managed.cjs');
const shared = require('../../tools/bootstrap/first-start.cjs');
const builder = require('../../tools/bootstrap/build-managed-download.cjs');
const checkout = require('../../tools/system/install-managed-from-checkout.cjs');
const bundle = require('../../runtime/release/bundle.cjs');
const ROOT = path.resolve(__dirname, '../..');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-managed-bootstrap-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const pair = crypto.generateKeyPairSync('ed25519');
    const pub = pair.publicKey.export({ type: 'spki', format: 'pem' });
    const trust = Buffer.from(JSON.stringify({ fixture: pub }));
    fs.writeFileSync(path.join(root, 'bootstrap.json'), JSON.stringify({ schemaVersion: 1,
        releasePublicKeySha256: bundle.sha256(pub), licenseTrustSha256: bundle.sha256(trust) }));
    fs.writeFileSync(path.join(root, 'license-public-trust.json'), trust);
    fs.mkdirSync(path.join(root, checkout.DELIVERY_DIRECTORY), { recursive: true });
    fs.writeFileSync(path.join(root, checkout.DELIVERY_DIRECTORY, 'release-public.pem'), pub);
    const calls = [];
    const deps = { root, platform: 'linux', uid: 0, ownerCheck() {},
        interfaces: { fixture: [{ address: '192.0.2.15', family: 'IPv4', internal: false }] },
        openTty: () => { calls.push('tty'); return { write() { calls.push('disclosure'); }, close() { calls.push('close'); } }; },
        install: args => { calls.push(args); throw Object.assign(new Error('private fixture message'), { code: 'CHECKOUT_HOST_PREFLIGHT_REJECTED' }); } };
    return { root, calls, deps, pub, trust };
}
test('managed first-start selects only the fixed sequence-16 checkout and retains normal installer flags', t => {
    assert.equal(checkout.DELIVERY_DIRECTORY, 'delivery/managed-test-16');
    assert.equal(checkout.DELIVERY_REVISION, 13);
    assert.equal(checkout.RELEASE_SEQUENCE, 16);
    const f = fixture(t);
    assert.throws(() => managed.main([], f.deps), /private fixture message/);
    assert.equal(f.calls[0], 'tty');
    assert.deepEqual(f.calls[1], ['install', '--release-public-key-sha256', bundle.sha256(f.pub),
        '--origin', 'https://192.0.2.15:8443', '--hosts-file', path.join(f.root, 'inputs/hosts.json'),
        '--license-trust', path.join(f.root, 'license-public-trust.json'), '--license-trust-sha256', bundle.sha256(f.trust)]);
    assert.equal(f.calls.includes('disclosure'), false);
    assert.equal(f.calls.at(-1), 'close');
    assert.equal(fs.existsSync(path.join(f.root, 'delivery/test-pi-0.2.0-test.3-r4')), false);
    assert.equal(fs.existsSync(path.join(f.root, 'delivery/managed-test-15')), false);
});
test('managed entry cannot be directed to a historical or arbitrary checkout adapter', t => {
    const f = fixture(t);
    f.deps.checkout = { DELIVERY_DIRECTORY: '../unexpected', main() { throw Error('wrong adapter'); } };
    assert.throws(() => managed.main([], f.deps), /private fixture message/);
    assert.ok(f.calls.some(Array.isArray));
    const g = fixture(t);
    for (const args of [['--controller', '8'], ['--root', '/tmp'], ['--skip-signature'], ['install']]) {
        assert.throws(() => managed.main(args, g.deps), /BOOTSTRAP_USAGE/);
    }
    assert.deepEqual(g.calls, []);
});
test('new trust changes stop before an installer or secret-disclosure call', t => {
    const f = fixture(t);
    fs.appendFileSync(path.join(f.root, checkout.DELIVERY_DIRECTORY, 'release-public.pem'), '\n');
    assert.throws(() => managed.main([], f.deps), /BOOTSTRAP_RELEASE_TRUST/);
    assert.deepEqual(f.calls, []);
    assert.equal(fs.existsSync(path.join(f.root, 'inputs')), false);
});
test('managed install diagnostics permit only the two additional fixed phases', () => {
    for (const phase of ['managed-update-service', 'technical-network-service'])
        assert.equal(shared.safeFailure({ code: 'PG_FAILED', phase, message: 'private' }).phase, phase);
    assert.equal(shared.safeFailure({ code: 'PG_FAILED', phase: 'private arbitrary detail' }).phase, undefined);
});
test('managed generator retains independent public pins and rejects secret, URL and selector inputs', () => {
    const args = ['--base-url', 'https://downloads.example.com/eos/managed-16', '--license-trust', '/public/trust.json',
        '--license-trust-sha256', 'a'.repeat(64), '--release-public-key-sha256', 'b'.repeat(64), '--output', '/new-output', '--node-archive', '/public/node.tar.xz'];
    assert.equal(builder.parse(args)['--base-url'], args[1]);
    for (const bad of [[...args, '--private-key', '/secret'], [...args, '--sequence', '16'],
        args.map(x => x === args[1] ? 'https://user:secret@example.com/x' : x), args.slice(0, -2)])
        assert.throws(() => builder.parse(bad), /DOWNLOAD_/);
    const pair = crypto.generateKeyPairSync('ed25519');
    const privateBytes = Buffer.from(JSON.stringify({ fixture: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) }));
    assert.throws(() => builder.licenseTrust(privateBytes, bundle.sha256(privateBytes)), /DOWNLOAD_LICENSE_TRUST/);
});
test('new generator binds every signed runtime and installer helper byte before kit creation', () => {
    const signed = { files: [{ path: 'runtime/controller-profile/v7.2.5/guard.cjs', size: 5, sha256: 'a'.repeat(64) },
        { path: 'tools/system/install-managed-from-checkout.cjs', size: 6, sha256: 'b'.repeat(64) },
        { path: 'tools/integration/test-archive.py', size: 7, sha256: 'e'.repeat(64) },
        { path: 'tools/integration/check-runtime-architecture.cjs', size: 8, sha256: 'f'.repeat(64) },
        { path: 'tools/integration/bare-refresh-policy.json', size: 9, sha256: '1'.repeat(64) }] };
    const rows = signed.files.map(row => ({ name: row.path, bytes: row.size, sha256: row.sha256 }));
    assert.equal(builder.sourceBinding(signed, rows), 5);
    for (const altered of [rows.slice(1), rows.slice(0, 2), [{ ...rows[0], sha256: 'c'.repeat(64) }, ...rows.slice(1)],
        [...rows.slice(0, 2), { ...rows[2], sha256: 'f'.repeat(64) }],
        [...rows, { name: 'runtime/unbound.cjs', bytes: 1, sha256: 'd'.repeat(64) }]])
        assert.throws(() => builder.sourceBinding(signed, altered), /DOWNLOAD_SOURCE_BINDING/);
    for (const name of ['tools/integration/check-runtime-architecture.cjs', 'tools/integration/bare-refresh-policy.json']) {
        assert.throws(() => builder.sourceBinding({ files: signed.files.filter(row => row.path !== name) }, rows),
            /DOWNLOAD_SOURCE_BINDING/, 'an unsigned dependency cannot be supplied only by the installer kit');
        assert.throws(() => builder.sourceBinding(signed, rows.filter(row => row.name !== name)), /DOWNLOAD_SOURCE_BINDING/);
        assert.throws(() => builder.sourceBinding(signed, rows.map(row => row.name === name ? { ...row, sha256: '0'.repeat(64) } : row)),
            /DOWNLOAD_SOURCE_BINDING/);
    }
});
test('actual payload copy and fixture-signed bundle authenticate the adjacent architecture policy', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-policy-payload-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const app = path.join(directory, 'app'), payload = path.join(directory, 'payload'), target = path.join(directory, 'bundle');
    fs.mkdirSync(app); fs.mkdirSync(path.join(app, 'node_modules'));
    fs.writeFileSync(path.join(app, 'package.json'), '{}\n');
    fs.writeFileSync(path.join(app, 'package-lock.json'), '{}\n');
    const catalogFile = path.join(directory, 'catalog.json'), sbomFile = path.join(directory, 'sbom.cdx.json');
    fs.writeFileSync(catalogFile, '{}\n');
    fs.writeFileSync(sbomFile, JSON.stringify({ bomFormat: 'CycloneDX', components: [] }));
    const nodeRuntimeDirectory = path.join(directory, 'node-runtime');
    fs.mkdirSync(path.join(nodeRuntimeDirectory, 'bin'), { recursive: true });
    const nodeBytes = Buffer.alloc(64); nodeBytes.write('7f454c46020101', 'hex'); nodeBytes.writeUInt16LE(3, 16); nodeBytes.writeUInt16LE(183, 18);
    fs.writeFileSync(path.join(nodeRuntimeDirectory, 'bin/node'), nodeBytes, { mode: 0o755 });
    fs.writeFileSync(path.join(nodeRuntimeDirectory, 'LICENSE'), 'Synthetic license fixture\n');
    fs.writeFileSync(path.join(nodeRuntimeDirectory, 'runtime.json'), JSON.stringify({ schemaVersion: 1, version: '24.22.1', platform: 'linux-arm64',
        archiveSha256: 'a'.repeat(64), binarySha256: bundle.sha256(nodeBytes), licenseSha256: bundle.sha256('Synthetic license fixture\n') }) + '\n');
    // Exercise the production copy/inventory boundary with a deliberately tiny
    // app. This is not validatePayload, a product build or a native/Pi test.
    const { preparePayload } = require('../../tools/system/build-bundle.cjs');
    const { SECURITY_REFRESH_TEST } = require('../../runtime/product/scope.cjs');
    const files = preparePayload({ appDirectory: app, destination: payload, catalogFile, sbomFile, nodeRuntimeDirectory,
        releaseScope: SECURITY_REFRESH_TEST, networkProfile: true, managedProfile: true });
    const policy = 'tools/integration/bare-refresh-policy.json';
    const bytes = fs.readFileSync(path.join(ROOT, policy));
    assert.deepEqual(fs.readFileSync(path.join(payload, policy)), bytes);
    assert.ok(files.some(row => row.path === policy && row.size === bytes.length && row.sha256 === bundle.sha256(bytes)));
    assert.equal(typeof require(path.join(payload, 'tools/system/build-bundle.cjs')).validatePayload, 'function');
    // Only an ephemeral in-memory fixture key signs these synthetic files.
    const pair = crypto.generateKeyPairSync('ed25519');
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 15,
        profile: 'test', nodeVersion: process.versions.node, platforms: [`${process.platform}-${process.arch}`] };
    const signed = bundle.createBundle({ sourceDirectory: payload, bundleDirectory: target, metadata,
        privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) });
    const verify = () => bundle.verifyBundle({ bundleDirectory: target,
        publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }) });
    const verified = verify();
    assert.equal(verified.releaseId, signed.releaseId);
    assert.ok(verified.manifest.files.some(row => row.path === policy && row.sha256 === bundle.sha256(bytes)));
    assert.ok(builder.sourceBinding(verified.manifest, builder.collectKitSources()) > 2);
    fs.appendFileSync(path.join(target, 'payload', policy), ' ');
    assert.throws(verify, error => error instanceof bundle.BundleError && error.code === 'BUNDLE_CONTENT');
});
test('actual public kit excludes untracked private inputs and loads its fixed managed entry with complete dependencies', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-managed-kit-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const source = path.join(directory, 'source'), output = path.join(directory, 'public'), extracted = path.join(directory, 'extracted');
    fs.mkdirSync(source); fs.mkdirSync(output);
    for (const name of ['runtime', 'tools/system', 'licenses', ...builder.FIXED_KIT_SOURCES]) {
        const destination = path.join(source, name); fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.cpSync(path.join(ROOT, name), destination, { recursive: true, errorOnExist: true, force: false });
    }
    for (const args of [['init', '-q'], ['add', '--', '.']]) {
        const git = spawnSync('git', args, { cwd: source, encoding: 'utf8', shell: false, timeout: 10000 });
        assert.equal(git.status, 0, git.stderr);
    }
    // These are inert, non-sensitive marker fixtures, never real private inputs.
    for (const name of ['runtime/local-private.txt', 'tools/system/local-private.txt', 'licenses/local-private.txt'])
        fs.writeFileSync(path.join(source, name), 'PRIVATE_FIXTURE_MUST_NOT_SHIP');
    const rows = builder.collectKitSources(source);
    assert.equal(rows.some(row => row.name.endsWith('local-private.txt')), false);
    assert.ok(rows.some(row => row.name === 'tools/system/install-managed-from-checkout.cjs'));
    assert.ok(rows.some(row => row.name === 'tools/bootstrap/first-start-managed.cjs'));
    assert.ok(rows.some(row => row.name === 'tools/integration/bare-refresh-policy.json'));
    const before = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('eos-managed-download-build-')).sort();
    const packed = builder.buildKit(rows, output, Buffer.from('{}\n'), { schemaVersion: 1,
        releasePublicKeySha256: 'a'.repeat(64), licenseTrustSha256: 'b'.repeat(64) });
    assert.equal(packed.readbackVerified, true);
    assert.deepEqual(fs.readdirSync(output), ['installer-kit.zip']);
    assert.deepEqual(fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('eos-managed-download-build-')).sort(), before);
    const unpack = spawnSync('/usr/bin/python3', ['-I', '-B', '-c',
        'import pathlib,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert all(not n.startswith("/") and ".." not in pathlib.PurePosixPath(n).parts for n in z.namelist())\n assert not any(b"PRIVATE_FIXTURE_MUST_NOT_SHIP" in z.read(n) or sys.argv[3].encode() in z.read(n) for n in z.namelist())\n z.extractall(sys.argv[2])',
        path.join(output, 'installer-kit.zip'), extracted, source], { encoding: 'utf8', timeout: 10000 });
    assert.equal(unpack.status, 0, unpack.stderr);
    assert.deepEqual(fs.readFileSync(path.join(extracted, 'tools/integration/bare-refresh-policy.json')),
        fs.readFileSync(path.join(ROOT, 'tools/integration/bare-refresh-policy.json')));
    // Real module loading from the extracted ZIP: the invalid CLI argument must
    // reach the fixed entry parser, before any root/TTY/APT/install operation.
    const loaded = spawnSync(process.execPath, [path.join(extracted, 'tools/bootstrap/first-start-managed.cjs'), '--invalid'],
        { encoding: 'utf8', timeout: 10000, cwd: extracted, env: { PATH: process.env.PATH, LC_ALL: 'C' } });
    assert.equal(loaded.status, 1);
    assert.equal(loaded.stdout, '');
    assert.equal(loaded.stderr, shared.formatFailure({ code: 'BOOTSTRAP_USAGE' }));
    assert.doesNotMatch(loaded.stderr, /MODULE_NOT_FOUND|PRIVATE_FIXTURE|eos-managed-kit-/);
    // On a failed ZIP build the private build record is also removed.
    assert.throws(() => builder.buildKit([{ ...rows[0], sha256: '0'.repeat(64) }], directory,
        Buffer.from('{}\n'), {}), /DOWNLOAD_KIT_BUILD/);
    assert.deepEqual(fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('eos-managed-download-build-')).sort(), before);
});
test('complete embedded managed preparer and command parse and verify exact bytes before execution', () => {
    const code = fs.readFileSync(path.join(ROOT, 'tools/bootstrap/prepare-managed16-host.py'));
    const config = { schemaVersion: 1, baseUrl: 'https://downloads.example.com/eos/managed-16',
        deliveryDirectory: checkout.DELIVERY_DIRECTORY, assets: [] };
    const script = builder.renderScript(config, code);
    const embedded = /<<'EOS_PYTHON_BASE64'\n([A-Za-z0-9+/=\n]+)\nEOS_PYTHON_BASE64/.exec(script)[1];
    assert.deepEqual(Buffer.from(embedded.replace(/\n/g, ''), 'base64'), code);
    const command = builder.installCommand(config.baseUrl, Buffer.from(script));
    assert.match(command, /^\/usr\/bin\/sudo \/usr\/bin\/env -i /);
    assert.ok(command.includes(bundle.sha256(script)));
    assert.ok(command.indexOf('sha256sum --check --status') < command.indexOf('/bin/bash "$d/install.sh"'));
    assert.doesNotMatch(command, /--insecure|--location|\|\s*(?:sudo\s+)?bash/);
    assert.equal(spawnSync('/bin/bash', ['-n'], { input: script, encoding: 'utf8', timeout: 5000 }).status, 0);
    assert.equal(spawnSync('/bin/bash', ['-n'], { input: command, encoding: 'utf8', timeout: 5000 }).status, 0);
});
test('GitHub asset publication requires its exact release id and a separate immutable entry command', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-entry-command-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const releaseId = 'a'.repeat(64), baseUrl = `https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-16-${releaseId}`;
    assert.equal(builder.entryPublicationRequired(baseUrl, releaseId), true);
    assert.equal(builder.entryPublicationRequired('https://downloads.example.com/eos/managed-16', releaseId), false);
    for (const url of [baseUrl.replace('16-', '15-'), baseUrl.replace('16-', '17-'), baseUrl.replace('NexoWatt', 'other'), baseUrl.replace(releaseId, 'b'.repeat(64))])
        assert.throws(() => builder.entryPublicationRequired(url, releaseId), /DOWNLOAD_RELEASE_ASSET_URL/);
    const script = Buffer.from('#!/bin/bash\nexit 0\n');
    fs.writeFileSync(path.join(directory, 'install.sh'), script);
    fs.writeFileSync(path.join(directory, 'download-preparation.json'), JSON.stringify({ schemaVersion: 1,
        kind: 'eos-managed-test-download-preparation', releaseSequence: 16, releaseId, baseUrl,
        bootstrapSha256: bundle.sha256(script), commandReady: false, entryPublicationRequired: true }));
    const entryBaseUrl = `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${'b'.repeat(40)}/delivery/managed-public-16`;
    for (const url of [entryBaseUrl.replace('b'.repeat(40), 'main'), entryBaseUrl.replace('NexoWatt', 'other'), baseUrl])
        assert.throws(() => builder.finalizeCommand({ directory, entryBaseUrl: url }), /DOWNLOAD_PINNED_ENTRY_URL/);
    assert.equal(fs.existsSync(path.join(directory, 'INSTALL_COMMAND.txt')), false);
    fs.appendFileSync(path.join(directory, 'install.sh'), '# changed\n');
    assert.throws(() => builder.finalizeCommand({ directory, entryBaseUrl }), /DOWNLOAD_ENTRY_BINDING/);
    assert.equal(fs.existsSync(path.join(directory, 'INSTALL_COMMAND.txt')), false);
    fs.writeFileSync(path.join(directory, 'install.sh'), script);
    const preparation = JSON.parse(fs.readFileSync(path.join(directory, 'download-preparation.json')));
    fs.writeFileSync(path.join(directory, 'download-preparation.json'), JSON.stringify({ ...preparation, releaseSequence: 15 }));
    assert.throws(() => builder.finalizeCommand({ directory, entryBaseUrl }), /DOWNLOAD_ENTRY_BINDING/);
    assert.equal(fs.existsSync(path.join(directory, 'INSTALL_COMMAND.txt')), false);
    fs.writeFileSync(path.join(directory, 'download-preparation.json'), JSON.stringify(preparation));
    const report = builder.finalizeCommand({ directory, entryBaseUrl });
    assert.equal(report.commandReady, true);
    assert.equal(report.publicReadbackPerformed, false);
    const command = fs.readFileSync(path.join(directory, 'INSTALL_COMMAND.txt'), 'utf8');
    assert.ok(command.includes(entryBaseUrl + '/install.sh'));
    assert.ok(command.includes(bundle.sha256(script)));
    assert.doesNotMatch(command, /--location|github\.com\/NexoWatt\/nexowatt-eos\/releases/);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'command-preparation.json'))), report);
    assert.throws(() => builder.finalizeCommand({ directory, entryBaseUrl }), /DOWNLOAD_COMMAND_EXISTS/);
});
