#!/usr/bin/env node
'use strict';
// Run from an authenticated, root-controlled checkout on a fresh test host.
// No downloads, npm hooks, secret arguments or implicit system package changes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readFileLimited, sha256, validatePublicKey } = require('../../runtime/release/bundle.cjs');
const { rootOwned } = require('../../runtime/release/installed-check.cjs');
const { assertNoSymlinkAncestors, privateWrite } = require('./install-host.cjs');
const { inspectPostgresqlHost } = require('./postgresql-host-preflight.cjs');
const { validatePublicInput } = require('./prepare-onboarding.cjs');
const { command } = require('./host-preflight.cjs');
const eos = require('./eos-base.cjs');
const ROOT = path.resolve(__dirname, '../..');
const FLAGS = ['--release-public-key-sha256', '--origin', '--hosts-file', '--license-trust', '--license-trust-sha256'];
const fail = code => { throw Object.assign(new Error(code), { code }); };
function parse(argv) {
    if (argv.length === 1 && argv[0] === 'preflight') return { action: 'preflight' };
    if (argv[0] !== 'install' || argv.length !== 1 + FLAGS.length * 2) fail('CHECKOUT_USAGE');
    const out = { action: 'install' };
    for (let n = 1; n < argv.length; n += 2) {
        const flag = argv[n];
        if (!FLAGS.includes(flag) || Object.hasOwn(out, flag) || !argv[n + 1]) fail('CHECKOUT_USAGE');
        out[flag] = argv[n + 1];
    }
    for (const key of ['--release-public-key-sha256', '--license-trust-sha256'])
        if (!/^[a-f0-9]{64}$/.test(out[key])) fail('CHECKOUT_TRUST_PIN_REQUIRED');
    for (const key of ['--hosts-file', '--license-trust'])
        if (!path.isAbsolute(out[key]) || path.resolve(out[key]) !== out[key]) fail('CHECKOUT_INPUT_PATH');
    return out;
}
function digestArchive(file) {
    const before = fs.lstatSync(file);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || before.size > 1024 ** 3) fail('CHECKOUT_ARCHIVE');
    const descriptor = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
        const opened = fs.fstatSync(descriptor), digest = crypto.createHash('sha256'), buffer = Buffer.alloc(1024 * 1024);
        if (opened.dev !== before.dev || opened.ino !== before.ino || opened.size !== before.size) fail('CHECKOUT_ARCHIVE');
        let length; while ((length = fs.readSync(descriptor, buffer, 0, buffer.length, null))) digest.update(buffer.subarray(0, length));
        const after = fs.fstatSync(descriptor);
        if (opened.size !== after.size || opened.mtimeMs !== after.mtimeMs || opened.ctimeMs !== after.ctimeMs) fail('CHECKOUT_ARCHIVE');
        return digest.digest('hex');
    } finally { fs.closeSync(descriptor); }
}
function deliveryIdentity(delivery, keyBytes, expectedKey, platform) {
    validatePublicKey(keyBytes);
    if (!['linux-arm64', 'linux-x64'].includes(platform) || delivery?.runtimeVersion !== '0.2.0-test.3' ||
        delivery.platform !== platform || delivery.archive !== `eos-0.2.0-test.3-${platform}.tar.gz` ||
        !/^[a-f0-9]{64}$/.test(delivery.releaseId || '') || !/^[a-f0-9]{64}$/.test(delivery.sha256 || '') ||
        delivery.productionReleaseApproved !== false) fail('CHECKOUT_DELIVERY');
    if (!/^[a-f0-9]{64}$/.test(expectedKey || '') || sha256(keyBytes) !== expectedKey || delivery.signingPublicKeySha256 !== expectedKey)
        fail('CHECKOUT_RELEASE_TRUST_MISMATCH');
    return delivery;
}
function main(argv) {
    const args = parse(argv);
    if (process.platform !== 'linux' || process.getuid?.() !== 0) fail('CHECKOUT_LINUX_ROOT_REQUIRED');
    assertNoSymlinkAncestors(ROOT);
    const preflight = inspectPostgresqlHost({ expectedNodeVersion: '24.21.0', platform: process.arch });
    if (args.action === 'preflight') return preflight;
    if (!preflight.ready) return { ok: false, code: 'CHECKOUT_HOST_PREFLIGHT_REJECTED', preflight, changesPerformed: false };
    const directory = path.join(ROOT, 'delivery/test-pi-0.2.0-test.3');
    const metadata = path.join(directory, 'delivery.json'), key = path.join(directory, 'release-public.pem');
    rootOwned(metadata); rootOwned(key);
    const keyBytes = readFileLimited(key, 16384).bytes;
    const delivery = deliveryIdentity(JSON.parse(readFileLimited(metadata, 65536).bytes), keyBytes,
        args['--release-public-key-sha256'], `linux-${process.arch}`);
    const archive = path.join(directory, delivery.archive); rootOwned(archive);
    if (digestArchive(archive) !== delivery.sha256) fail('CHECKOUT_ARCHIVE_HASH');
    rootOwned(args['--hosts-file']); rootOwned(args['--license-trust']);
    const setup = validatePublicInput({ schemaVersion: 1, hosts: JSON.parse(readFileLimited(args['--hosts-file'], 16384).bytes),
        origin: args['--origin'], licenseTrustFile: args['--license-trust'], licenseTrustSha256: args['--license-trust-sha256'] });
    const trust = readFileLimited(setup.licenseTrustFile, 32768).bytes;
    if (sha256(trust) !== setup.licenseTrustSha256 || /PRIVATE KEY/.test(trust.toString('utf8'))) fail('SETUP_TRUST_PIN_MISMATCH');
    // All caller-controlled inputs and archive hash are checked before staging.
    assertNoSymlinkAncestors('/root');
    const staging = fs.mkdtempSync('/root/eos-test3-install-'); fs.chmodSync(staging, 0o700);
    const unpacked = path.join(staging, 'unpacked');
    const extracted = command('/usr/bin/python3', ['-I', '-B', path.join(__dirname, 'extract-test-bundle.py'), '--archive', archive,
        '--destination', unpacked, '--sha256', delivery.sha256], { timeout: 300000 });
    if (extracted.status !== 0 || extracted.error) fail('CHECKOUT_EXTRACT_FAILED');
    const bundle = path.join(unpacked, 'bundle');
    const verification = eos.main(['verify', '--bundle', bundle, '--public-key', key]);
    if (!verification.ok || verification.releaseId !== delivery.releaseId) fail('CHECKOUT_RELEASE_CHANGED');
    const setupFile = path.join(staging, 'setup.json'); privateWrite(setupFile, JSON.stringify(setup) + '\n', 0o600);
    const installed = eos.main(['install', '--bundle', bundle, '--public-key', key, '--start', 'yes', '--setup-input', setupFile]);
    return { ...installed, source: 'authenticated-git-checkout', stagingDirectory: staging,
        setupOrigin: setup.origin, passwordEntry: 'https-frontend-only', uuidLocation: 'first-start-license-step',
        setupCodeFile: '/etc/nexowatt-eos/setup-code.txt', hardwareAcceptance: 'OPEN', productionReleaseApproved: false };
}
module.exports = { parse, digestArchive, deliveryIdentity, main };
if (require.main === module) {
    try { const result = main(process.argv.slice(2)); process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        if (result.ok === false || result.ready === false) process.exitCode = 1; }
    catch (error) { process.stderr.write(JSON.stringify({ ok: false,
        code: /^[A-Z_]+$/.test(error.code || '') ? error.code : 'CHECKOUT_INSTALL_FAILED',
        ...(/^[a-z-]{1,64}$/.test(error.phase || '') ? { phase: error.phase } : {}) }) + '\n'); process.exitCode = 1; }
}
