'use strict';
// The only privileged entry point. This tool never evaluates unsigned package
// bytes. It has no remote API and exposes no sudo rule to EOS runtime accounts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifyBundle, stageBundle, readFileLimited, trustedDirectory, sha256, validatePublicKey } = require('../../runtime/release/bundle.cjs');
const { validatePayload } = require('./build-bundle.cjs');
const { installHost, assertNoSymlinkAncestors, privateWrite } = require('./install-host.cjs');
const { inspectHost, webPortsForCatalog } = require('./host-preflight.cjs');
const { inspectPostgresqlHost } = require('./postgresql-host-preflight.cjs');
const { installPostgresqlHost } = require('./install-postgresql-host.cjs');
const { activateRelease } = require('./activate-release.cjs');
const { checkInstalled, rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readSetupInput } = require('./prepare-onboarding.cjs');
function reject(code) { const error = new Error(code); error.code = code; throw error; }
function parseArgs(argv, required) {
    if (argv.length !== required.length * 2) reject('EOS_USAGE');
    const args = Object.create(null);
    for (let i = 0; i < argv.length; i += 2) {
        const key = argv[i];
        if (!required.includes(key) || Object.hasOwn(args, key) || !argv[i + 1]) reject('EOS_USAGE');
        args[key] = argv[i + 1];
    }
    return args;
}
function trustedImport(root) {
    // Imported bundles must first be copied by the root operator into a private
    // staging directory. Do not inspect user-writable archives as a privileged
    // process: O_NOFOLLOW alone cannot prevent a parent-directory swap race.
    assertNoSymlinkAncestors(root);
    let count = 0;
    function visit(file) {
        if (++count > 120010) reject('EOS_IMPORT_SIZE');
        const st = fs.lstatSync(file);
        if (st.uid !== 0 || st.mode & 0o022 || st.isSymbolicLink() || (!st.isDirectory() && !st.isFile())) reject('EOS_UNTRUSTED_IMPORT');
        if (st.isDirectory()) {
            const dir = fs.opendirSync(file);
            try { for (let entry; (entry = dir.readSync()) !== null;) visit(path.join(file, entry.name)); }
            finally { dir.closeSync(); }
        }
    }
    visit(root);
}
function validateVerified(verified) {
    return validatePayload(verified.payloadPath, verified.manifest);
}
function publicKeyFrom(file) {
    const { bytes } = readFileLimited(path.resolve(file), 16384);
    return validatePublicKey(bytes);
}
function keygen(directory) {
    const target = path.resolve(directory); trustedDirectory(path.dirname(target));
    fs.mkdirSync(target, { mode: 0o700 });
    const pair = crypto.generateKeyPairSync('ed25519');
    const privateKey = pair.privateKey.export({ format: 'pem', type: 'pkcs8' });
    const publicKey = pair.publicKey.export({ format: 'pem', type: 'spki' });
    privateWrite(path.join(target, 'release-private.pem'), privateKey, 0o600);
    privateWrite(path.join(target, 'release-public.pem'), publicKey, 0o644);
    return { ok: true, kind: 'test-signing-key', publicKeySha256: sha256(publicKey), productionKey: false };
}
function install({ bundleDirectory, keyFile, start, setupInput }) {
    if (process.getuid?.() !== 0) reject('ROOT_OPERATOR_REQUIRED');
    if (typeof start !== 'boolean') reject('EXPLICIT_START_FLAG_REQUIRED');
    const bundle = path.resolve(bundleDirectory), keyPath = path.resolve(keyFile);
    trustedImport(bundle); assertNoSymlinkAncestors(keyPath);
    const publicKey = publicKeyFrom(keyPath);
    const verified = verifyBundle({ bundleDirectory: bundle, publicKey, minimumSequence: 0,
        nodeVersion: process.versions.node, platform: `${process.platform}-${process.arch}` });
    const { catalog, databaseBackend } = validateVerified(verified);
    const fullProduct = verified.manifest.releaseVersion === '0.2.0-test.3';
    if (fullProduct && !setupInput || !fullProduct && setupInput) reject('EOS_SETUP_INPUT_REQUIRED');
    const setup = fullProduct ? readSetupInput(path.resolve(setupInput), path.join(verified.payloadPath, 'app')) : undefined;
    const webPorts = webPortsForCatalog(catalog);
    const preflight = (databaseBackend === 'postgresql' ? inspectPostgresqlHost : inspectHost)({ expectedNodeVersion: verified.manifest.nodeVersion, platform: process.arch, webPorts });
    if (!preflight.ready) reject('HOST_PREFLIGHT_REJECTED');
    if (databaseBackend === 'postgresql' && start !== true) reject('PG_EXPLICIT_START_REQUIRED');
    assertNoSymlinkAncestors('/opt/nexowatt/eos');
    fs.mkdirSync('/opt/nexowatt/eos/releases', { recursive: true, mode: 0o755 });
    fs.mkdirSync('/opt/nexowatt/eos/verified', { mode: 0o755 });
    const staged = stageBundle({ bundleDirectory: bundle, publicKey, minimumSequence: 0,
        nodeVersion: process.versions.node, platform: `${process.platform}-${process.arch}`,
        releasesDirectory: '/opt/nexowatt/eos/releases' });
    const evidence = `/opt/nexowatt/eos/verified/${staged.releaseId}`;
    fs.mkdirSync(evidence, { mode: 0o755 });
    for (const name of ['manifest.json', 'manifest.sig']) privateWrite(path.join(evidence, name), readFileLimited(path.join(bundle, name)).bytes, 0o644);
    privateWrite(path.join(evidence, 'release-public.pem'), publicKey, 0o644);
    const status = (databaseBackend === 'postgresql' ? installPostgresqlHost : installHost)({ profile: 'test', releaseId: staged.releaseId, releasePath: staged.releasePath,
        start, expectedNodeVersion: staged.manifest.nodeVersion, platform: process.arch, webPorts,
        releaseVersion: staged.manifest.releaseVersion, setup,
        sequence: staged.manifest.sequence, publicKeySha256: sha256(publicKey) });
    return { ok: true, ...status };
}
function extend({ bundleDirectory, keyFile }) {
    if (process.getuid?.() !== 0) reject('ROOT_OPERATOR_REQUIRED');
    const bundle = path.resolve(bundleDirectory), keyPath = path.resolve(keyFile);
    trustedImport(bundle); assertNoSymlinkAncestors(keyPath);
    const publicKey = publicKeyFrom(keyPath);
    const stateFile = '/etc/nexowatt-eos/release-state.json'; rootOwned(stateFile);
    const state = JSON.parse(readFileLimited(stateFile, 65536).bytes);
    if (state.schemaVersion !== 1 || state.profile !== 'test' || state.publicKeySha256 !== sha256(publicKey) ||
        !Number.isSafeInteger(state.sequence) || state.sequence < 1 || state.nodeVersion !== process.versions.node) reject('EOS_EXISTING_RELEASE_STATE');
    const options = { bundleDirectory: bundle, publicKey, minimumSequence: state.sequence,
        nodeVersion: process.versions.node, platform: `${process.platform}-${process.arch}` };
    const verified = verifyBundle(options); validateVerified(verified);
    rootOwned('/opt/nexowatt/eos/releases'); rootOwned('/opt/nexowatt/eos/verified');
    const releasePath = `/opt/nexowatt/eos/releases/${verified.releaseId}`;
    const evidencePath = `/opt/nexowatt/eos/verified/${verified.releaseId}`;
    if (fs.existsSync(releasePath)) {
        // A failed additive trial may already have staged this exact immutable
        // release. Reuse it only with its independently checked retained proof.
        checkInstalled({ releasePath, evidencePath });
        if (sha256(readFileLimited(path.join(evidencePath, 'release-public.pem'), 16384).bytes) !== state.publicKeySha256) reject('EOS_EXISTING_KEY_CHANGED');
    } else {
        stageBundle({ ...options, releasesDirectory: '/opt/nexowatt/eos/releases' });
        fs.mkdirSync(evidencePath, { mode: 0o755 });
        for (const name of ['manifest.json', 'manifest.sig']) privateWrite(path.join(evidencePath, name), readFileLimited(path.join(bundle, name)).bytes, 0o644);
        privateWrite(path.join(evidencePath, 'release-public.pem'), publicKey, 0o644);
    }
    return activateRelease({ releaseId: verified.releaseId, releasePath, publicKeySha256: state.publicKeySha256 });
}
function main(argv) {
    const [command, ...rest] = argv;
    if (command === 'keygen') { const a = parseArgs(rest, ['--directory']); return keygen(a['--directory']); }
    if (command === 'verify') {
        const a = parseArgs(rest, ['--bundle', '--public-key']);
        const v = verifyBundle({ bundleDirectory: a['--bundle'], publicKey: publicKeyFrom(a['--public-key']),
            minimumSequence: 0, platform: `${process.platform}-${process.arch}`, nodeVersion: process.versions.node });
        const { plan, productInventory } = validateVerified(v);
        return { ok: true, releaseId: v.releaseId, sequence: v.manifest.sequence,
            profile: v.manifest.profile, selected: plan.selected, productInventory,
            inventoryScope: 'signed-bundle-content-not-host-installation', productionReleaseApproved: false };
    }
    if (command === 'preflight') {
        const a = parseArgs(rest, ['--node-version']);
        return inspectHost({ expectedNodeVersion: a['--node-version'], platform: process.arch });
    }
    if (command === 'preflight-postgresql') {
        const a = parseArgs(rest, ['--node-version']);
        return inspectPostgresqlHost({ expectedNodeVersion: a['--node-version'], platform: process.arch });
    }
    if (command === 'install') {
        const a = parseArgs(rest, ['--bundle', '--public-key', '--start', ...(rest.includes('--setup-input') ? ['--setup-input'] : [])]);
        if (!['yes', 'no'].includes(a['--start'])) reject('EXPLICIT_START_FLAG_REQUIRED');
        return install({ bundleDirectory: a['--bundle'], keyFile: a['--public-key'], start: a['--start'] === 'yes', setupInput: a['--setup-input'] });
    }
    if (command === 'extend') {
        const a = parseArgs(rest, ['--bundle', '--public-key']);
        return extend({ bundleDirectory: a['--bundle'], keyFile: a['--public-key'] });
    }
    reject('EOS_USAGE');
}
module.exports = { parseArgs, trustedImport, validateVerified, publicKeyFrom, keygen, install, extend, main };
if (require.main === module) {
    try { const result = main(process.argv.slice(2)); process.stdout.write(`${JSON.stringify(result)}\n`); if (result.ready === false) process.exitCode = 1; }
    catch (error) { process.stderr.write(`${JSON.stringify({ ok: false, code: /^[A-Z_]+$/.test(error.code || '') ? error.code : 'EOS_FAILED',
        ...(/^[a-z-]{1,64}$/.test(error.phase || '') ? { phase: error.phase } : {}) })}\n`); process.exitCode = 1; }
}
