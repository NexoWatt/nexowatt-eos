#!/usr/bin/env node
'use strict';

// EOS-BASE-TRANSPORT-01: provision fresh, local TLS-only object/state stores.
// This does not migrate data, install Redis, start a service or grant privileges.
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { validateConfig, readConfig } = require('../../security/verify-runtime-tls.cjs');
const PROFILE = 'eos-test-base-redis-tls13-v1';
const SCOPES = ['objects', 'states'];

function fail(code) { const e = new Error(code); e.code = code; throw e; }
function absolute(value) {
    if (typeof value !== 'string' || !path.isAbsolute(value) || /[\x00-\x1f\x7f]/u.test(value)) fail('INVALID_PATH');
    return path.resolve(value);
}
function safeNewDirectory(value) {
    const directory = absolute(value);
    const parent = path.dirname(directory);
    if (fs.realpathSync(parent) !== parent) fail('SYMLINK_PARENT_FORBIDDEN');
    fs.mkdirSync(directory, { mode: 0o700 }); // EEXIST is intentional: no overwrite/migration.
    return directory;
}
function write(file, text) {
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL |
        (fs.constants.O_NOFOLLOW || 0), 0o600);
    try { fs.writeFileSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function quote(value) { return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
function execute(openssl, args) {
    const r = spawnSync(openssl, args, { shell: false, timeout: 15000, maxBuffer: 131072,
        stdio: ['ignore', 'pipe', 'pipe'] });
    if (r.error || r.status !== 0) fail('CERTIFICATE_PROVISIONING_FAILED');
}
function port(value) {
    if (!Number.isInteger(value) || value < 1024 || value > 65535) fail('INVALID_PORT');
    return value;
}

function provision({ directory, dataDirectory, ports = { objects: 16379, states: 16380 },
    opensslPath = '/usr/bin/openssl' } = {}) {
    if (!ports || Object.keys(ports).sort().join(',') !== 'objects,states') fail('INVALID_PORTS');
    SCOPES.forEach(scope => port(ports[scope]));
    if (ports.objects === ports.states) fail('DUPLICATE_PORT');
    absolute(opensslPath);
    if (!fs.statSync(opensslPath).isFile()) fail('INVALID_OPENSSL');
    if (dataDirectory !== undefined) absolute(dataDirectory);
    directory = safeNewDirectory(directory);
    const data = dataDirectory ? absolute(dataDirectory) : path.join(directory, 'data');
    try {
        for (const name of ['certs', 'redis', 'credentials', 'authority']) fs.mkdirSync(path.join(directory, name), { mode: 0o700 });
        if (!dataDirectory) {
            fs.mkdirSync(data, { mode: 0o700 });
            SCOPES.forEach(scope => fs.mkdirSync(path.join(data, scope), { mode: 0o700 }));
        }
        const caKey = path.join(directory, 'authority', 'ca.key');
        const caCert = path.join(directory, 'certs', 'ca.crt');
        // A unique CA is created per installation. Never use a distributed private CA key.
        execute(opensslPath, ['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-out', caKey]);
        fs.chmodSync(caKey, 0o600);
        execute(opensslPath, ['req', '-new', '-x509', '-key', caKey, '-sha256', '-days', '365',
            '-subj', '/CN=NexoWatt EOS installation transport CA', '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0',
            '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-out', caCert]);
        fs.chmodSync(caCert, 0o600);
        const databases = {};
        const fingerprints = {};
        for (const scope of SCOPES) {
            const servername = `eos-${scope}.internal`;
            const key = path.join(directory, 'certs', `${scope}.key`);
            const cert = path.join(directory, 'certs', `${scope}.crt`);
            const csr = path.join(directory, 'authority', `${scope}.csr`);
            const extensions = path.join(directory, 'authority', `${scope}.ext`);
            write(extensions, `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:${servername}\n`);
            execute(opensslPath, ['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256', '-out', key]);
            fs.chmodSync(key, 0o600);
            execute(opensslPath, ['req', '-new', '-key', key, '-subj', `/CN=${servername}`, '-out', csr]);
            execute(opensslPath, ['x509', '-req', '-in', csr, '-CA', caCert, '-CAkey', caKey, '-set_serial',
                `0x${crypto.randomBytes(16).toString('hex')}`, '-days', '90', '-sha256', '-extfile', extensions, '-out', cert]);
            fs.chmodSync(cert, 0o600);
            const password = crypto.randomBytes(32).toString('hex');
            const hash = crypto.createHash('sha256').update(password).digest('hex');
            // CONFIG is denied; matching notification/Lua values are fixed here instead.
            // Shared DB account is a controller trust zone, not per-adapter authorization.
            const lines = [
                'bind 127.0.0.1', 'protected-mode yes', 'port 0', `tls-port ${ports[scope]}`,
                `tls-cert-file ${quote(cert)}`, `tls-key-file ${quote(key)}`, `tls-ca-cert-file ${quote(caCert)}`,
                'tls-protocols "TLSv1.3"', 'tls-auth-clients no', 'tls-session-caching no',
                'daemonize no', 'supervised no', 'logfile ""', 'loglevel notice',
                `dir ${quote(path.join(data, scope))}`, 'appendonly yes', 'appendfsync everysec',
                'save ""', 'maxmemory 256mb', 'maxmemory-policy noeviction', 'maxclients 1024',
                'tcp-keepalive 60', 'notify-keyspace-events Exe', 'lua-time-limit 10000',
                'user default off',
                `user eos-runtime on #${hash} ~* &* +@all -@dangerous +info +keys +client|setname +script|load +script|exists`,
            ];
            write(path.join(directory, 'redis', `${scope}.conf`), lines.join('\n') + '\n');
            databases[scope] = { type: 'redis', host: '127.0.0.1', port: ports[scope], options: {
                username: 'eos-runtime', auth_pass: password, db: 0, connectTimeout: 3000,
                maxRetriesPerRequest: 1, enableOfflineQueue: false, commandTimeout: 5000,
                retry_max_delay: 5000, retry_max_count: 19,
                tls: { ca: fs.readFileSync(caCert, 'utf8'), servername, rejectUnauthorized: true,
                    minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3' },
            } };
            fingerprints[scope] = new crypto.X509Certificate(fs.readFileSync(cert)).fingerprint256;
        }
        if (!validateConfig(databases).configurationMatchesProfile) fail('GENERATED_CONFIG_REJECTED');
        write(path.join(directory, 'credentials', 'iobroker-databases.json'), JSON.stringify(databases, null, 2) + '\n');
        // No online signing key is needed by controller or Redis. The separate
        // root-operator lifecycle replaces CA and leaves together while stopped.
        fs.rmSync(path.join(directory, 'authority'), { recursive: true });
        const manifest = { profile: PROFILE, generatedAt: new Date().toISOString(),
            status: 'PROVISIONED_NOT_STARTED', ports, bind: '127.0.0.1', tls: 'TLSv1.3',
            serverCertificateLifetimeDays: 90, clientAuthentication: 'unique-per-store-password',
            adapterIsolation: false, caKeyRetained: false, fingerprints,
            config: 'credentials/iobroker-databases.json', redis: { objects: 'redis/objects.conf', states: 'redis/states.conf' },
            dataDirectory: data };
        write(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
        return manifest;
    } catch (error) {
        fs.rmSync(directory, { recursive: true, force: true });
        // Do not forward OpenSSL/path diagnostics containing private values.
        fail(error.code === 'GENERATED_CONFIG_REJECTED' ? error.code : 'PROVISIONING_FAILED');
    }
}

function encodeCommand(args) {
    return Buffer.concat([Buffer.from(`*${args.length}\r\n`), ...args.flatMap(arg => {
        const b = Buffer.from(arg); return [Buffer.from(`$${b.length}\r\n`), b, Buffer.from('\r\n')];
    })]);
}

function probe({ connection, timeoutMs = 5000 } = {}) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 5000) return Promise.reject(new Error('INVALID_TIMEOUT'));
    // Re-use strict profile: no overrides such as checkServerIdentity or rejectUnauthorized:false.
    if (!validateConfig({ objects: connection, states: connection }).configurationMatchesProfile) {
        return Promise.reject(new Error('CONNECTION_PROFILE_REJECTED'));
    }
    return new Promise((resolve, reject) => {
        let done = false;
        let phase = 'auth';
        let buffer = Buffer.alloc(0);
        const socket = tls.connect({ host: connection.host, port: connection.port, ...connection.options.tls });
        const finish = (error, value) => {
            if (done) return; done = true; clearTimeout(timer); socket.destroy();
            error ? reject(new Error(error)) : resolve(value);
        };
        const timer = setTimeout(() => finish('TRANSPORT_TIMEOUT'), timeoutMs);
        socket.once('error', () => finish('TLS_OR_CONNECTION_REJECTED'));
        socket.once('end', () => finish('UNEXPECTED_TRANSPORT_END'));
        socket.once('secureConnect', () => {
            if (!socket.authorized || socket.getProtocol() !== 'TLSv1.3') return finish('TLS_POLICY_REJECTED');
            socket.write(encodeCommand(['AUTH', connection.options.username || 'default', connection.options.auth_pass]));
        });
        socket.on('data', chunk => {
            if (buffer.length + chunk.length > 32768) return finish('RESPONSE_TOO_LARGE');
            buffer = Buffer.concat([buffer, chunk]);
            const end = buffer.indexOf('\r\n');
            if (end < 0) return;
            const response = buffer.subarray(0, end).toString('utf8');
            if (end + 2 !== buffer.length) return finish('UNEXPECTED_RESPONSE');
            buffer = Buffer.alloc(0);
            if (phase === 'auth') {
                if (response !== '+OK') return finish('AUTHENTICATION_REJECTED');
                phase = 'ping'; socket.write(encodeCommand(['PING']));
            } else if (response !== '+PONG') finish('PING_REJECTED');
            else finish(null, { status: 'AUTHENTICATED_TLS_PING_OK', tls: socket.getProtocol(), peerVerified: true });
        });
    });
}

async function probeConfig(config, { timeoutMs = 5000 } = {}) {
    if (!validateConfig(config).configurationMatchesProfile) fail('CONNECTION_PROFILE_REJECTED');
    const results = {};
    await Promise.all(SCOPES.map(async scope => { results[scope] = await probe({ connection: config[scope], timeoutMs }); }));
    return { profile: PROFILE, status: 'BOTH_STORES_AUTHENTICATED_TLS_OK', results };
}

async function main(argv = process.argv.slice(2)) {
    try {
        const command = argv.shift();
        const options = Object.create(null);
        const allowed = command === 'provision' ? ['directory', 'data-directory', 'objects-port', 'states-port'] : ['config'];
        while (argv.length) {
            const key = argv.shift(); const value = argv.shift();
            if (!key?.startsWith('--') || !allowed.includes(key.slice(2)) || value === undefined || Object.hasOwn(options, key.slice(2))) fail('USAGE');
            options[key.slice(2)] = value;
        }
        let result;
        if (command === 'provision' && options.directory) result = provision({ directory: options.directory,
            dataDirectory: options['data-directory'], ports: { objects: options['objects-port'] === undefined ? 16379 : Number(options['objects-port']),
                states: options['states-port'] === undefined ? 16380 : Number(options['states-port']) } });
        else if (command === 'probe' && options.config) result = await probeConfig(readConfig(options.config));
        else fail('USAGE');
        process.stdout.write(JSON.stringify(result, null, 2) + '\n'); return 0;
    } catch (error) {
        const known = /^(USAGE|INVALID_[A-Z_]+|DUPLICATE_PORT|SYMLINK_PARENT_FORBIDDEN|PROVISIONING_FAILED|GENERATED_CONFIG_REJECTED|CONNECTION_PROFILE_REJECTED|TRANSPORT_TIMEOUT|TLS_OR_CONNECTION_REJECTED|UNEXPECTED_TRANSPORT_END|TLS_POLICY_REJECTED|RESPONSE_TOO_LARGE|UNEXPECTED_RESPONSE|AUTHENTICATION_REJECTED|PING_REJECTED)$/;
        const code = known.test(error.message) ? error.message : 'TRANSPORT_OPERATION_FAILED';
        process.stdout.write(JSON.stringify({ profile: PROFILE, status: 'REJECTED', code }) + '\n'); return 1;
    }
}
if (require.main === module) main().then(code => { process.exitCode = code; });
module.exports = { PROFILE, provision, probe, probeConfig, encodeCommand, main };
