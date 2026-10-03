#!/usr/bin/env node
'use strict';
// Local administrator supplies public host/trust data only. User passwords are
// entered exclusively in the HTTPS first-start frontend.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { createRequire } = require('node:module');
const { rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited, sha256 } = require('../../runtime/release/bundle.cjs');
const { normalizeHosts } = require('../../runtime/transport/web-certificates.cjs');
const { privateWrite } = require('./install-host.cjs');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function validatePublicInput(input) {
    if (!input || input.schemaVersion !== 1 || Object.keys(input).sort().join(',') !== 'hosts,licenseTrustFile,licenseTrustSha256,origin,schemaVersion') fail('SETUP_INPUT_FIELDS');
    const hosts = normalizeHosts(input.hosts);
    let origin; try { origin = new URL(input.origin); } catch { fail('SETUP_INPUT_ORIGIN'); }
    const hostname = origin.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (origin.protocol !== 'https:' || origin.port !== '8443' || origin.origin !== input.origin || origin.username || origin.password ||
        !hosts.includes(hostname) || origin.pathname !== '/' || origin.search || origin.hash || !net.isIP(hostname) && !hosts.includes(hostname)) fail('SETUP_INPUT_ORIGIN');
    if (typeof input.licenseTrustFile !== 'string' || !path.isAbsolute(input.licenseTrustFile) || path.resolve(input.licenseTrustFile) !== input.licenseTrustFile ||
        !/^[a-f0-9]{64}$/.test(input.licenseTrustSha256 || '')) fail('SETUP_INPUT_TRUST');
    return input;
}
function readSetupInput(file, app) {
    rootOwned(file);
    const input = validatePublicInput(JSON.parse(readFileLimited(file, 32768).bytes));
    rootOwned(input.licenseTrustFile);
    const bytes = readFileLimited(input.licenseTrustFile, 32768).bytes;
    if (sha256(bytes) !== input.licenseTrustSha256 || /PRIVATE KEY/.test(bytes.toString('utf8'))) fail('SETUP_TRUST_PIN_MISMATCH');
    const { validatePublicKeys } = createRequire(path.join(app, 'package.json'))('iobroker.eos-admin/build/lib/eosLicenseCore.js');
    return { ...input, trust: validatePublicKeys(JSON.parse(bytes)), trustSha256: sha256(bytes) };
}
function main(argv) {
    if (process.getuid?.() !== 0) fail('SETUP_INPUT_ROOT_REQUIRED');
    const args = {};
    if (argv.length !== 10) fail('SETUP_INPUT_USAGE');
    for (let i = 0; i < argv.length; i += 2) {
        if (!['--hosts-file', '--origin', '--license-trust', '--license-trust-sha256', '--output'].includes(argv[i]) || args[argv[i]]) fail('SETUP_INPUT_USAGE');
        args[argv[i]] = argv[i + 1];
    }
    rootOwned(args['--hosts-file']); rootOwned(args['--license-trust']); rootOwned(path.dirname(path.resolve(args['--output'])));
    const input = validatePublicInput({ schemaVersion: 1, hosts: JSON.parse(readFileLimited(args['--hosts-file'], 16384).bytes),
        origin: args['--origin'], licenseTrustFile: args['--license-trust'], licenseTrustSha256: args['--license-trust-sha256'] });
    const trust = readFileLimited(input.licenseTrustFile, 32768).bytes;
    if (sha256(trust) !== input.licenseTrustSha256 || /PRIVATE KEY/.test(trust.toString('utf8'))) fail('SETUP_TRUST_PIN_MISMATCH');
    privateWrite(path.resolve(args['--output']), JSON.stringify(input, null, 2) + '\n', 0o600);
    return { ok: true, status: 'PUBLIC_SETUP_INPUT_PREPARED', userPasswordsRequested: false };
}
module.exports = { validatePublicInput, readSetupInput, main };
if (require.main === module) {
    try { process.stdout.write(JSON.stringify(main(process.argv.slice(2))) + '\n'); }
    catch (error) { process.stderr.write(JSON.stringify({ ok: false, code: /^SETUP_[A-Z_]+$/.test(error.code || '') ? error.code : 'SETUP_INPUT_FAILED' }) + '\n'); process.exitCode = 1; }
}
