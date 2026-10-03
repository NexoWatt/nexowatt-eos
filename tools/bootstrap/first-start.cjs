#!/usr/bin/env node
'use strict';
// Entry inside an authenticated bootstrap kit. Download authentication belongs
// to the outer bootstrap; this runner never accepts CLI trust/path overrides.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const tty = require('node:tty');
const crypto = require('node:crypto');
const { readFileLimited, sha256, validatePublicKey } = require('../../runtime/release/bundle.cjs');
const { rootOwned } = require('../../runtime/release/installed-check.cjs');
const { privateWrite } = require('../system/install-host.cjs');
const { validatePublicInput } = require('../system/prepare-onboarding.cjs');
const { ACCOUNTS, REQUIRED, FRESH_PATHS } = require('../system/postgresql-host-preflight.cjs');
const { OS_UPDATE_PACKAGES } = require('../system/host-preflight.cjs');
const checkout = require('../system/install-from-checkout.cjs');
const ROOT = path.resolve(__dirname, '../..');
const CODE_FILE = '/etc/nexowatt-eos/setup-code.txt';
const CA_FILE = '/etc/nexowatt-eos/web/ca.crt';
const fail = code => { throw Object.assign(new Error(code), { code }); };
// Only fixed installer stages may reach the terminal. Never forward downstream
// command lines, stderr, paths or exception messages to diagnose a host failure.
const INSTALL_PHASES = new Set(['accounts', 'directories', 'certificates', 'first-start-security',
    'initdb', 'release-state', 'units', 'schema', 'live-database-gate', 'controller',
    'first-start-identity-context']);
const CHECK_IDS = new Set(['os', 'root', 'architecture', 'systemd-running', 'hostname', 'node-exact-version',
    'systemd-manager', 'no-distribution-clusters', 'openssl-tls13', 'ports-free', 'fresh-unit-namespace', 'free-space',
    ...REQUIRED.map(file => `tool:${file}`), ...FRESH_PATHS.map(file => `fresh-path:${file}`),
    ...ACCOUNTS.flatMap(account => ['passwd', 'group'].map(table => `fresh-${table}:${account}`)),
    ...['postgres', 'psql'].map(name => `postgresql:${name}`),
    ...[...OS_UPDATE_PACKAGES, 'postgresql-17', 'postgresql-client-17', 'raspberrypi-archive-keyring'].map(name => `package:${name}`),
    ...['debian', 'raspberrypi'].map(name => `keyring:/usr/share/keyrings/${name}-archive-keyring.gpg`),
    ...['/usr/bin/node', '/usr/lib/postgresql/17/bin/postgres'].map(file => `no-capabilities:${file}`)]);
function publicFailedChecks(preflight) {
    if (preflight?.kind !== 'eos-postgresql-test-host-preflight' || !Array.isArray(preflight.checks) || preflight.checks.length > 256) return [];
    return [...new Set(preflight.checks.filter(row => row?.status === 'fail' && CHECK_IDS.has(row.id)).map(row => row.id))].slice(0, 32);
}

function parseBootstrap(bytes) {
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { fail('BOOTSTRAP_CONFIG'); }
    if (!value || Array.isArray(value) || value.schemaVersion !== 1 ||
        Object.keys(value).sort().join(',') !== 'licenseTrustSha256,releasePublicKeySha256,schemaVersion' ||
        !/^[a-f0-9]{64}$/.test(value.releasePublicKeySha256 || '') ||
        !/^[a-f0-9]{64}$/.test(value.licenseTrustSha256 || '')) fail('BOOTSTRAP_CONFIG');
    return value;
}
function validateLicenseTrust(bytes, expectedHash) {
    if (sha256(bytes) !== expectedHash) fail('BOOTSTRAP_LICENSE_TRUST');
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        const keys = JSON.parse(text);
        if (!keys || Array.isArray(keys) || /PRIVATE KEY/.test(text)) fail('BOOTSTRAP_LICENSE_TRUST');
        const entries = Object.entries(keys);
        if (!entries.length || entries.length > 32) fail('BOOTSTRAP_LICENSE_TRUST');
        for (const [kid, pem] of entries) {
            if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(kid) || typeof pem !== 'string' || pem.length > 1024 ||
                !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END PUBLIC KEY-----\s*$/.test(pem) ||
                crypto.createPublicKey(pem).asymmetricKeyType !== 'ed25519') fail('BOOTSTRAP_LICENSE_TRUST');
        }
    } catch { fail('BOOTSTRAP_LICENSE_TRUST'); }
}
function routableIPv4(address) {
    if (!net.isIPv4(address)) return false;
    const [a, b] = address.split('.').map(Number);
    return a !== 0 && a !== 127 && !(a === 169 && b === 254) && a < 224;
}
function selectIPv4(interfaces, sshConnection) {
    const addresses = new Set();
    for (const rows of Object.values(interfaces || {})) for (const row of rows || []) {
        if (row && row.internal === false && ['IPv4', 4].includes(row.family) && routableIPv4(row.address)) addresses.add(row.address);
    }
    if (typeof sshConnection === 'string' && sshConnection.length <= 512) {
        const parts = sshConnection.trim().split(/\s+/);
        const port = value => /^[0-9]{1,5}$/.test(value || '') && Number(value) >= 1 && Number(value) <= 65535;
        if (parts.length === 4 && net.isIP(parts[0]) && port(parts[1]) && net.isIPv4(parts[2]) && port(parts[3]) &&
            addresses.has(parts[2])) return parts[2];
    }
    if (!addresses.size) fail('BOOTSTRAP_IPV4_REQUIRED');
    if (addresses.size !== 1) fail('BOOTSTRAP_IPV4_AMBIGUOUS');
    return [...addresses][0];
}
function openPossessionTty({ fileSystem = fs, isatty = tty.isatty } = {}) {
    let fd;
    try {
        fd = fileSystem.openSync('/dev/tty', fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NOCTTY);
        if (!fileSystem.fstatSync(fd).isCharacterDevice() || !isatty(fd)) fail('BOOTSTRAP_TTY_REQUIRED');
    } catch {
        if (fd !== undefined) fileSystem.closeSync(fd);
        fail('BOOTSTRAP_TTY_REQUIRED');
    }
    return { write(value) {
        if (!fileSystem.fstatSync(fd).isCharacterDevice() || !isatty(fd)) fail('BOOTSTRAP_TTY_REQUIRED');
        const bytes = Buffer.from(value); let offset = 0;
        try { while (offset < bytes.length) {
            const written = fileSystem.writeSync(fd, bytes, offset, bytes.length - offset);
            if (!written) fail('BOOTSTRAP_TTY_WRITE');
            offset += written;
        } } finally { bytes.fill(0); }
    }, close() { fileSystem.closeSync(fd); } };
}
function main(argv = process.argv.slice(2), dependencies = {}) {
    // Alternate dependencies exist for isolated fixtures, never as CLI/env flags.
    if (argv.length) fail('BOOTSTRAP_USAGE');
    const platform = dependencies.platform ?? process.platform;
    const uid = dependencies.uid ?? process.getuid?.();
    if (platform !== 'linux' || uid !== 0) fail('BOOTSTRAP_LINUX_ROOT_REQUIRED');
    const root = dependencies.root ?? ROOT;
    const ownerCheck = dependencies.ownerCheck ?? rootOwned;
    const read = dependencies.read ?? readFileLimited;
    const install = dependencies.install ?? checkout.main;
    const interfaces = dependencies.interfaces ?? os.networkInterfaces();
    const sshConnection = dependencies.sshConnection ?? process.env.SSH_CONNECTION;
    ownerCheck(root);
    const configFile = path.join(root, 'bootstrap.json'); ownerCheck(configFile);
    const config = parseBootstrap(read(configFile, 4096).bytes);
    const trustFile = path.join(root, 'license-public-trust.json'); ownerCheck(trustFile);
    validateLicenseTrust(read(trustFile, 32768).bytes, config.licenseTrustSha256);
    const publicKey = path.join(root, checkout.DELIVERY_DIRECTORY, 'release-public.pem'); ownerCheck(publicKey);
    const key = read(publicKey, 16384).bytes; validatePublicKey(key);
    if (sha256(key) !== config.releasePublicKeySha256) fail('BOOTSTRAP_RELEASE_TRUST');
    const address = selectIPv4(interfaces, sshConnection);
    const origin = `https://${address}:8443`;
    const setup = validatePublicInput({ schemaVersion: 1, hosts: [address], origin,
        licenseTrustFile: trustFile, licenseTrustSha256: config.licenseTrustSha256 });
    // Establish a usable controlling TTY before any host installation begins.
    const terminal = (dependencies.openTty ?? openPossessionTty)();
    try {
        const inputs = path.join(root, 'inputs'); fs.mkdirSync(inputs, { mode: 0o700 });
        const hostsFile = path.join(inputs, 'hosts.json');
        privateWrite(hostsFile, JSON.stringify(setup.hosts) + '\n', 0o600);
        privateWrite(path.join(inputs, 'setup.json'), JSON.stringify(setup) + '\n', 0o600);
        const result = install(['install', '--release-public-key-sha256', config.releasePublicKeySha256,
            '--origin', origin, '--hosts-file', hostsFile, '--license-trust', trustFile,
            '--license-trust-sha256', config.licenseTrustSha256]);
        if (result?.ok === false && result.code === 'CHECKOUT_HOST_PREFLIGHT_REJECTED') {
            throw Object.assign(new Error(result.code), { code: result.code, failedChecks: publicFailedChecks(result.preflight) });
        }
        if (result?.ok !== true || result.installed !== true || result.phase !== 'HTTPS_FIRST_START_READY' ||
            result.setupOrigin !== origin || result.physicalControlEnabled !== false ||
            !/^[a-f0-9]{64}$/.test(result.releaseId || '')) fail('BOOTSTRAP_INSTALL_FAILED');
        ownerCheck(CA_FILE);
        let fingerprint;
        try {
            const certificate = new crypto.X509Certificate(read(CA_FILE, 16384).bytes);
            if (!certificate.ca) fail('BOOTSTRAP_CA_INVALID');
            fingerprint = certificate.fingerprint256;
        } catch { fail('BOOTSTRAP_CA_INVALID'); }
        ownerCheck(CODE_FILE);
        const code = read(CODE_FILE, 128);
        try {
            if (code.mode & 0o077 || !/^[A-Za-z0-9_-]{32}\n?$/.test(code.bytes.toString('utf8'))) fail('BOOTSTRAP_CODE_INVALID');
            terminal.write(`NexoWatt EOS Einrichtungscode (nur lokal, nicht weitergeben): ${code.bytes.toString('utf8').trim()}\n`);
        } finally { code.bytes.fill(0); }
        // Explicit allowlist: do not forward arbitrary downstream result fields.
        return { ok: true, phase: 'HTTPS_FIRST_START_READY', releaseId: result.releaseId, setupUrl: origin,
            caCertificateFile: CA_FILE, caFingerprint256: fingerprint,
            browserTrustRequired: true,
            browserInstruction: 'Geraete-CA vertrauenswuerdig im Browser bereitstellen; Zertifikatswarnungen nicht uebergehen.',
            possessionCodeDelivery: 'controlling-tty-only', hardwareAcceptance: 'OPEN', physicalControlEnabled: false,
            productionReleaseApproved: false };
    } finally { terminal.close(); }
}
function safeFailure(error) {
    const code = /^(?:BOOTSTRAP|CHECKOUT|HOST|PG|EOS|SETUP)_[A-Z0-9_]{1,80}$/.test(error?.code || '') ? error.code : 'BOOTSTRAP_FAILED';
    const message = code === 'BOOTSTRAP_IPV4_AMBIGUOUS' ?
        'Mehrere lokale IPv4-Adressen: ueber SSH mit der gewuenschten lokalen IPv4-Adresse verbinden.' :
        code === 'BOOTSTRAP_IPV4_REQUIRED' ? 'Eine erreichbare lokale IPv4-Adresse ist erforderlich.' :
        code === 'BOOTSTRAP_TTY_REQUIRED' ? 'Eine lokale oder SSH-Terminalsitzung mit TTY ist erforderlich.' :
        'Installation angehalten; bestehende Daten und Fehlernachweise erhalten.';
    const failedChecks = code === 'CHECKOUT_HOST_PREFLIGHT_REJECTED' && Array.isArray(error?.failedChecks) ?
        [...new Set(error.failedChecks.filter(id => CHECK_IDS.has(id)))].slice(0, 32) : [];
    const phase = typeof error?.phase === 'string' && INSTALL_PHASES.has(error.phase) ? error.phase : null;
    return { ok: false, code, message, ...(phase ? { phase } : {}), ...(failedChecks.length ? { failedChecks } : {}) };
}
function formatSuccess(result) {
    return `EOS: Geschuetzter Erststart ist bereit.\nIm Browser oeffnen: ${result.setupUrl}\n` +
        `Vorher die Geraete-CA vertrauenswuerdig im Browser bereitstellen; Zertifikatswarnungen nicht uebergehen.\n` +
        `CA-Zertifikat auf dem Pi: ${result.caCertificateFile}\nSHA-256-Fingerabdruck: ${result.caFingerprint256}\n` +
        'Der Einrichtungscode wurde ausschliesslich im lokalen Terminal angezeigt.\nHardwareabnahme: OFFEN.\n';
}
function formatFailure(error) {
    const failure = safeFailure(error);
    return `EOS: ${failure.message}\nFehlercode: ${failure.code}\n` +
        (failure.phase ? `Installationsphase: ${failure.phase}\n` : '') +
        (failure.failedChecks ? `Nicht erfuellte Pruefungen: ${failure.failedChecks.join(', ')}\n` : '');
}
module.exports = { parseBootstrap, validateLicenseTrust, routableIPv4, selectIPv4, openPossessionTty, main,
    publicFailedChecks, safeFailure, formatSuccess, formatFailure };
if (require.main === module) {
    try { process.stdout.write(formatSuccess(main())); }
    catch (error) { process.stderr.write(formatFailure(error)); process.exitCode = 1; }
}
