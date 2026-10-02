'use strict';
// Root-local first provisioning for a NEW test cluster. No remote API, shell,
// existing-cluster migration or embedded credentials. Runtime never runs this.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { rootOwned } = require('../release/installed-check.cjs');
const { readFileLimited } = require('../release/bundle.cjs');
const { validatePostgresql } = require('../transport/databases.cjs');
const PORT = 15432;
const DATA = '/var/lib/nexowatt-eos/postgresql';
const CONFIG = '/etc/nexowatt-eos/postgresql';
const SOCKET = '/run/nexowatt-eos-postgresql';
const fail = code => { throw Object.assign(new Error(code), { code }); };
function execute(file, args, options = {}) {
    const result = spawnSync(file, args, { shell: false, timeout: 15000, maxBuffer: 65536,
        env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C', LC_ALL: 'C' }, ...options });
    if (result.error || result.status !== 0) fail('PG_HOST_COMMAND_FAILED');
    return result;
}
function write(file, data, mode = 0o600) {
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, mode);
    try { fs.writeFileSync(fd, data); fs.fchmodSync(fd, mode); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function clusterConfig() {
    return `# EOS owned cluster, no application-controlled settings\nlisten_addresses='127.0.0.1'\nport=${PORT}\n` +
        `data_directory='${DATA}'\nhba_file='${CONFIG}/pg_hba.conf'\nident_file='${CONFIG}/pg_ident.conf'\n` +
        `unix_socket_directories='${SOCKET}'\nunix_socket_permissions=0700\n` +
        `ssl=on\nssl_min_protocol_version='TLSv1.3'\nssl_max_protocol_version='TLSv1.3'\n` +
        `ssl_ca_file='${CONFIG}/ca.crt'\nssl_cert_file='${CONFIG}/server.crt'\nssl_key_file='${CONFIG}/server.key'\n` +
        "password_encryption='scram-sha-256'\nmax_connections=128\nshared_buffers='128MB'\nwork_mem='4MB'\njit=off\n" +
        "statement_timeout='5s'\nlock_timeout='2s'\nidle_in_transaction_session_timeout='5s'\nauthentication_timeout='5s'\n" +
        "log_statement='none'\nlog_min_error_statement='panic'\nlog_parameter_max_length_on_error=0\nlogging_collector=off\n";
}
function hbaConfig() {
    return '# First-match, fail-closed authentication; local administration is a separate OS boundary.\n' +
        'local all eos_bootstrap peer map=eos_bootstrap_map\nlocal all all reject\n' +
        `hostssl eos eos_objects 127.0.0.1/32 cert\nhostssl eos eos_states 127.0.0.1/32 cert\n` +
        'host all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n';
}
function provision({ directory = CONFIG } = {}) {
    if (process.getuid?.() !== 0) fail('PG_PROVISION_ROOT_REQUIRED');
    if (!path.isAbsolute(directory) || path.resolve(directory) !== directory || fs.existsSync(directory)) fail('PG_FRESH_CONFIG_REQUIRED');
    rootOwned(path.dirname(directory));
    fs.mkdirSync(directory, { mode: 0o755 });
    const authority = path.join(directory, 'authority'); fs.mkdirSync(authority, { mode: 0o700 });
    const openssl = args => execute('/usr/bin/openssl', args);
    const caKey = path.join(authority, 'ca.key'), ca = path.join(directory, 'ca.crt');
    openssl(['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-out', caKey]); fs.chmodSync(caKey, 0o600);
    openssl(['req', '-new', '-x509', '-sha256', '-days', '365', '-key', caKey, '-subj', '/CN=EOS PostgreSQL device CA',
        '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-out', ca]);
    fs.chmodSync(ca, 0o644);
    for (const scope of ['server', 'objects', 'states']) {
        const key = path.join(directory, `${scope}.key`), crt = path.join(directory, `${scope}.crt`);
        const csr = path.join(authority, `${scope}.csr`), ext = path.join(authority, `${scope}.ext`);
        const cn = scope === 'server' ? 'localhost' : `eos_${scope}`;
        write(ext, 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n' +
            `extendedKeyUsage=${scope === 'server' ? 'serverAuth' : 'clientAuth'}\n` +
            (scope === 'server' ? 'subjectAltName=DNS:localhost,IP:127.0.0.1\n' : ''));
        openssl(['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-out', key]); fs.chmodSync(key, 0o600);
        openssl(['req', '-new', '-key', key, '-subj', `/CN=${cn}`, '-out', csr]);
        openssl(['x509', '-req', '-in', csr, '-CA', ca, '-CAkey', caKey, '-set_serial', `0x${crypto.randomBytes(16).toString('hex')}`,
            '-days', '90', '-sha256', '-extfile', ext, '-out', crt]);
        fs.chmodSync(crt, 0o644); fs.unlinkSync(csr); fs.unlinkSync(ext);
    }
    write(path.join(directory, 'postgresql.conf'), clusterConfig(), 0o644);
    write(path.join(directory, 'pg_hba.conf'), hbaConfig(), 0o644);
    write(path.join(directory, 'pg_ident.conf'), 'eos_bootstrap_map eos-postgres eos_bootstrap\n', 0o644);
    // PEM values enter only a root-owned 0640 controller config; these separate
    // source key files remain 0600. There is no PGPASSWORD or pgpass fallback.
    const fragment = Object.fromEntries(['objects', 'states'].map(domain => [domain, {
        type: 'postgresql', host: '127.0.0.1', port: PORT, database: 'eos', user: `eos_${domain}`,
        options: { ssl: { ca: fs.readFileSync(ca, 'utf8'), cert: fs.readFileSync(path.join(directory, `${domain}.crt`), 'utf8'),
            key: fs.readFileSync(path.join(directory, `${domain}.key`), 'utf8') } },
    }]));
    validatePostgresql(fragment);
    write(path.join(directory, 'databases.json'), JSON.stringify(fragment) + '\n');
    write(path.join(directory, 'manifest.json'), JSON.stringify({ schemaVersion: 1, profile: 'eos-postgresql-mtls13-v1',
        port: PORT, database: 'eos', roles: ['eos_objects', 'eos_states'], certificateLifetimeDays: 90,
        automaticRotationImplemented: false, productionApproved: false }) + '\n', 0o644);
    return inspect({ directory });
}
function inspect({ directory = CONFIG, now = Date.now() } = {}) {
    rootOwned(directory);
    rootOwned(path.join(directory, 'ca.crt'));
    const ca = new crypto.X509Certificate(readFileLimited(path.join(directory, 'ca.crt'), 16384).bytes);
    if (!ca.ca || !ca.verify(ca.publicKey) || now < Date.parse(ca.validFrom) || now >= Date.parse(ca.validTo)) fail('PG_CA_INVALID');
    const certificates = [];
    for (const scope of ['server', 'objects', 'states']) {
        const crtPath = path.join(directory, `${scope}.crt`); rootOwned(crtPath);
        const cert = new crypto.X509Certificate(readFileLimited(crtPath, 16384).bytes);
        const keyPath = path.join(directory, `${scope}.key`); rootOwned(keyPath);
        const keyStat = fs.lstatSync(keyPath);
        if ((keyStat.mode & (scope === 'server' ? 0o027 : 0o077)) ||
            !cert.checkPrivateKey(crypto.createPrivateKey(readFileLimited(keyPath, 16384).bytes))) fail('PG_PRIVATE_KEY_INVALID');
        const usage = scope === 'server' ? '1.3.6.1.5.5.7.3.1' : '1.3.6.1.5.5.7.3.2';
        if (cert.ca || !cert.checkIssued(ca) || !cert.verify(ca.publicKey) || !cert.keyUsage?.includes(usage) ||
            cert.publicKey.asymmetricKeyType !== 'ec' || cert.publicKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1' ||
            now < Date.parse(cert.validFrom) || now >= Date.parse(cert.validTo) ||
            (scope === 'server' ? !cert.checkIP('127.0.0.1') : cert.subject !== `CN=eos_${scope}`)) fail('PG_CERTIFICATE_INVALID');
        certificates.push({ scope, fingerprint256: cert.fingerprint256, expiresAt: new Date(cert.validTo).toISOString(),
            daysRemaining: Math.floor((Date.parse(cert.validTo) - now) / 86400000) });
    }
    return { profile: 'eos-postgresql-mtls13-v1', status: certificates.some(c => c.daysRemaining <= 30) ? 'RENEWAL_REQUIRED' : 'VALID',
        caFingerprint256: ca.fingerprint256, certificates, automaticRotationImplemented: false };
}
async function probe(config, app) {
    validatePostgresql(config);
    const requireApp = createRequire(path.join(app, 'package.json'));
    const { Store } = requireApp('@nexowatt/eos-postgresql-store');
    const stores = ['objects', 'states'].map(domain => new Store(config[domain], { domain }));
    try {
        await Promise.all(stores.map(store => store.connect()));
        return { status: 'POSTGRESQL_MTLS_READY', domains: ['objects', 'states'], tls: 'TLSv1.3',
            schemaAdmissionVerified: true, controllerCompatibilityVerified: false, perAdapterIsolation: false };
    } finally { await Promise.allSettled(stores.map(store => store.close())); }
}
async function waitServer() {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        const result = spawnSync('/usr/lib/postgresql/17/bin/pg_isready', ['-q', '-h', SOCKET, '-p', String(PORT), '-U', 'eos_bootstrap', '-d', 'postgres', '-t', '1'],
            { timeout: 2000, env: { PATH: '/usr/bin:/bin', LANG: 'C' }, stdio: 'ignore' });
        if (!result.error && result.status === 0) return { status: 'POSTGRESQL_ACCEPTING_CONNECTIONS' };
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    fail('PG_READINESS_TIMEOUT');
}
module.exports = { PORT, DATA, CONFIG, SOCKET, write, clusterConfig, hbaConfig, provision, inspect, probe, waitServer };
if (require.main === module) {
    const deadline = setTimeout(() => { process.stderr.write('{"ok":false,"code":"PG_HOST_TIMEOUT"}\n'); process.exit(1); }, 15000);
    const args = process.argv.slice(2);
    Promise.resolve().then(async () => {
        if (args.length === 1 && args[0] === 'wait-server') return waitServer();
        if (args.length === 3 && args[0] === 'inspect' && args[1] === '--directory') return inspect({ directory: args[2] });
        if (args.length === 5 && args[0] === 'probe' && args[1] === '--config' && args[3] === '--app') {
            return probe(JSON.parse(readFileLimited(args[2], 1024 * 1024).bytes), args[4]);
        }
        fail('PG_HOST_USAGE');
    }).then(result => { process.stdout.write(JSON.stringify(result) + '\n'); if (result.status === 'RENEWAL_REQUIRED') process.exitCode = 1; },
        error => { process.stderr.write(JSON.stringify({ ok: false, code: /^PG_[A-Z_]+$/.test(error.code || '') ? error.code : 'PG_HOST_FAILED' }) + '\n'); process.exitCode = 1; })
        .finally(() => clearTimeout(deadline));
}
