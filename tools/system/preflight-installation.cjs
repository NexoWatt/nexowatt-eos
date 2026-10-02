#!/usr/bin/env node
'use strict';
// Read-only target gate. Never creates accounts, certificates, directories or
// services. A successful result permits the separate signed test installation;
// it is not a target acceptance or vulnerability-clearance certificate.
const path = require('node:path');
const { verifyBundle, sha256 } = require('../../runtime/release/bundle.cjs');
const { rootOwned } = require('../../runtime/release/installed-check.cjs');
const { trustedImport, publicKeyFrom } = require('./eos-base.cjs');
const { validatePayload } = require('./build-bundle.cjs');
const { inspectHost, webPortsForCatalog } = require('./host-preflight.cjs');
const { inspectPostgresqlHost } = require('./postgresql-host-preflight.cjs');
const { readOnboardingInputs, parseArgs: parseOnboardingArgs } = require('./onboard-ui.cjs');
const { pinnedAdapters } = require('../../runtime/bootstrap/enrollment.cjs');
const KEYS = ['--bundle', '--public-key', '--password-file', '--accounts-file', '--license-trust', '--hosts-file'];
const fail = code => { throw Object.assign(new Error(code), { code }); };
function parseArgs(argv) {
    if (!Array.isArray(argv) || argv.length !== KEYS.length * 2) fail('PREFLIGHT_INSTALLATION_USAGE');
    const result = Object.create(null);
    for (let i = 0; i < argv.length; i += 2) {
        const key = argv[i], value = argv[i + 1];
        if (!KEYS.includes(key) || Object.hasOwn(result, key) || typeof value !== 'string'
            || !path.isAbsolute(value) || path.resolve(value) !== value) fail('PREFLIGHT_INSTALLATION_USAGE');
        result[key] = value;
    }
    parseOnboardingArgs(KEYS.slice(2).flatMap(key => [key, result[key]]));
    return result;
}
function inspectInstallation(options, dependencies = {}) {
    if ((dependencies.uid ?? process.getuid?.()) !== 0) fail('PREFLIGHT_ROOT_REQUIRED');
    // The import is root-owned and immutable to other users before a privileged
    // process parses it. The signing key must be authenticated out of band.
    trustedImport(options['--bundle']); rootOwned(options['--public-key']);
    const publicKey = publicKeyFrom(options['--public-key']);
    const verified = verifyBundle({ bundleDirectory: options['--bundle'], publicKey, minimumSequence: 0,
        nodeVersion: process.versions.node, platform: `${process.platform}-${process.arch}` });
    const { catalog, databaseBackend } = validatePayload(verified.payloadPath, verified.manifest);
    const app = path.join(verified.payloadPath, 'app');
    pinnedAdapters(app); // This command prepares the exact integrated Admin/UI profile.
    const adapters = catalog.entries.filter(entry => entry.kind === 'adapter').map(entry => entry.package).sort();
    if (JSON.stringify(adapters) !== JSON.stringify(['iobroker.eos-admin', 'iobroker.nexowatt-ui'])) fail('PREFLIGHT_INTEGRATED_PROFILE_REQUIRED');
    // Reuse exactly the commissioning readers, bounds and validators. Signed
    // Admin's public-key validator is loaded only after verification above.
    let input;
    let credentials;
    try {
        input = readOnboardingInputs(options, app);
        credentials = { serviceCredential: 'individual-protected-input-validated',
            installerAccounts: input.accounts.accounts.filter(row => row.role === 'installer').length,
            enduserAccounts: input.accounts.accounts.filter(row => row.role === 'enduser').length,
            temporaryCredentialsDistinct: true, firstPasswordChangeRequired: true,
            licenseTrustKeys: Object.keys(input.trust).length, configuredCertificateHosts: input.hosts.length };
    } finally { input = undefined; }
    const host = (databaseBackend === 'postgresql' ? inspectPostgresqlHost : inspectHost)({ ...dependencies.hostFixture, expectedNodeVersion: verified.manifest.nodeVersion,
        platform: process.arch, webPorts: webPortsForCatalog(catalog) });
    return { schemaVersion: 1, kind: 'eos-integrated-test-installation-preflight', ready: host.ready,
        changesPerformed: false, releaseId: verified.releaseId, releaseVersion: verified.manifest.releaseVersion,
        sequence: verified.manifest.sequence, signingPublicKeySha256: sha256(publicKey),
        nodeVersion: verified.manifest.nodeVersion, platform: `${process.platform}-${process.arch}`,
        selectedAdapters: adapters, commissioningInputs: credentials, host,
        nextSteps: host.ready ? ['signed-fresh-install', 'root-local-ui-onboarding', 'target-acceptance-tests'] : [],
        databaseBackend, databaseTlsVerified: false, redisTlsVerified: false, productionReleaseApproved: false, hardwareAcceptance: false,
        scope: 'Verified signed integrated test profile and protected commissioning input; database TLS1.3 handshake is still enforced before controller activation. No service or target configuration was changed.' };
}
module.exports = { parseArgs, inspectInstallation };
if (require.main === module) {
    try {
        const result = inspectInstallation(parseArgs(process.argv.slice(2)));
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        if (!result.ready) process.exitCode = 1;
    } catch (error) {
        // Parser/crypto errors may contain input bytes; expose only bounded codes.
        process.stderr.write(`${JSON.stringify({ ready: false, changesPerformed: false,
            code: /^[A-Z_]{1,96}$/.test(error.code || '') ? error.code : 'PREFLIGHT_INSTALLATION_FAILED' })}\n`);
        process.exitCode = 1;
    }
}
