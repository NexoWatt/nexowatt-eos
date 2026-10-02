const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('node:fs');
const Stream = require('node:stream');
const { createHash, timingSafeEqual } = require('node:crypto');

const dist = `${__dirname}/dist/`;

const SFTP_HOST = process.env.SFTP_HOST;
const SFTP_PORT = process.env.SFTP_PORT;
const SFTP_USER = process.env.SFTP_USER;
const SFTP_PASS = process.env.SFTP_PASS;
const DEBUG     = process.env.DEBUG     === 'true' || process.env.DEBUG     === true;
const FAST_TEST = process.env.FAST_TEST === 'true' || process.env.FAST_TEST === true;

function createSftpConfig() {
    // OpenSSH SHA256 fingerprints contain 32 bytes in unpadded, canonical Base64.
    // Validate only on deployment: local builds must not need deployment secrets.
    const fingerprint = process.env.SFTP_HOST_KEY_SHA256;
    if (typeof fingerprint !== 'string' || fingerprint.length !== 50 || !/^SHA256:[A-Za-z0-9+/]{43}$/.test(fingerprint)) {
        throw new Error('SFTP_HOST_KEY_SHA256 must be an OpenSSH SHA256 fingerprint without padding.');
    }
    const encoded = fingerprint.slice('SHA256:'.length);
    const expectedHash = Buffer.from(encoded, 'base64');
    if (expectedHash.length !== 32 || expectedHash.toString('base64').replace(/=+$/, '') !== encoded) {
        throw new Error('SFTP_HOST_KEY_SHA256 is not a canonical SHA256 fingerprint.');
    }
    if (typeof SFTP_HOST !== 'string' || !SFTP_HOST || /[\s\x00-\x1f\x7f]/.test(SFTP_HOST) ||
        typeof SFTP_USER !== 'string' || !SFTP_USER || /[\x00-\x1f\x7f]/.test(SFTP_USER) ||
        typeof SFTP_PASS !== 'string' || !SFTP_PASS) {
        throw new Error('SFTP_HOST, SFTP_USER and SFTP_PASS must be configured for deployment.');
    }
    if (typeof SFTP_PORT !== 'string' || !SFTP_PORT || SFTP_PORT.length > 5 || /[^0-9]/.test(SFTP_PORT) ||
        Number(SFTP_PORT) < 1 || Number(SFTP_PORT) > 65535) {
        throw new Error('SFTP_PORT must be an integer between 1 and 65535.');
    }
    return {
        host: SFTP_HOST,
        port: Number(SFTP_PORT),
        username: SFTP_USER,
        password: SFTP_PASS,
        // ssh2 passes the raw host key as a Buffer when hostHash is not set.
        // Returning false rejects the handshake before user authentication.
        hostVerifier(key) {
            if (!Buffer.isBuffer(key) || key.length === 0) {
                return false;
            }
            const actualHash = createHash('sha256').update(key).digest();
            return timingSafeEqual(expectedHash, actualHash);
        },
    };
}

function writeSftp(sftp, fileName, data, cb) {
    const readStream = new Stream.PassThrough();

    readStream.end(Buffer.from(data));

    const writeStream = sftp.createWriteStream(fileName);

    writeStream.on('close', () => {
        DEBUG && console.log(`${new Date().toISOString()} ${fileName} - file transferred successfully`);
        readStream.end();
        if (cb) {
            cb();
            cb = null;
        }
    });

    writeStream.on('end', () => {
        DEBUG && console.log('sftp connection closed');
        readStream.close();
        if (cb) {
            cb();
            cb = null;
        }
    });

    // initiate transfer of a file
    readStream.pipe(writeStream);
}

function uploadOneFile(fileName, data, config) {
    // Required lazily: only the deploy path needs ssh2, so "node tasks --create"
    // works in a fresh checkout without installing the dev dependencies.
    const { Client } = require('ssh2');

    return new Promise((resolve, reject) => {
        const conn = new Client();
        // Do not expose server-controlled error text or deployment credentials.
        const rejectConnection = () => {
            conn.end();
            reject(new Error('SFTP connection failed: verify server identity, authentication and transport.'));
        };
        conn.on('error', rejectConnection);
        conn.on('ready', () =>
            conn.sftp((err, sftp) => {
                if (err) {
                    conn.end();
                    return reject(new Error('SFTP session could not be opened.'));
                }

                if (FAST_TEST) {
                    console.log(`Simulate upload of ${fileName}`);
                    sftp.end();
                    conn.end();
                    return resolve();
                }

                // The file must be deleted, because of the new file smaller; the rest of the old file will stay.
                checkAndDeleteIfExist(sftp, fileName, () =>
                    writeSftp(sftp, fileName, data, () => {
                        sftp.end();
                        conn.end();
                        resolve();
                    }));
            }));
        try {
            conn.connect(config);
        } catch {
            rejectConnection();
        }
    });
}

function checkAndDeleteIfExist(sftp, fileName, cb) {
    sftp.exists(fileName, doExist => {
        if (doExist) {
            sftp.unlink(fileName, cb);
        } else {
            cb();
        }
    });
}

function replaceLib(text, lib) {
    const lines = text.split('\n');
    const newLines = [];
    let ignore = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('# get and load the LIB => START')) {
            ignore = true;
            newLines.push(lib);
        } else if (lines[i].includes('# get and load the LIB => END')) {
            ignore = false;
        } else if (!ignore) {
            newLines.push(lines[i]);
        }
    }
    return newLines.join('\n');
}

async function deploy() {
    const config = createSftpConfig();
    const install = readFileSync(`${dist}install.sh`);
    const fix = readFileSync(`${dist}fix.sh`);
    const diag = readFileSync(`${dist}diag.sh`);
    const nodeUpdate = readFileSync(`${dist}node-update.sh`);

    return uploadOneFile('/install.sh', install, config)
        .then(() => uploadOneFile('/fix.sh', fix, config))
        .then(() => uploadOneFile('/diag.sh', diag, config))
        .then(() => uploadOneFile('/node-update.sh', nodeUpdate, config));
}

function create() {
    if (!existsSync(dist)) {
        mkdirSync(dist);
    }

    const install  = readFileSync(`${__dirname}/installer.sh`).toString('utf8');
    const fix      = readFileSync(`${__dirname}/fix_installation.sh`).toString('utf8');
    const lib      = readFileSync(`${__dirname}/installer_library.sh`).toString('utf8');
    const diag     = readFileSync(`${__dirname}/diag.sh`).toString('utf8');
    const nodeUpdate = readFileSync(`${__dirname}/node-update.sh`).toString('utf8');
    // Reviewed local inputs travel with the built installer. No upstream library
    // or mutable maintenance script is downloaded when the bundle executes.
    const embed = (name, file) => {
        const contents = readFileSync(`${__dirname}/${file}`, 'utf8').toString('utf8');
        const delimiter = `EOS_EMBED_${name}_END`;
        if (contents.split('\n').includes(delimiter)) {
            throw new Error('Build input collides with shell data delimiter.');
        }
        return `${name}=$(cat <<'${delimiter}'\n${contents}\n${delimiter}\n)\n`;
    };
    const cliInstaller = readFileSync(`${__dirname}/security/install-cli.sh`, 'utf8');
    const profile = readFileSync(`${__dirname}/security/profile-common.sh`, 'utf8');
    const bundled = embed('EOS_VERSIONS_JSON', 'versions.json') + lib + '\n' +
        embed('EOS_CLI_INSTALLER_SOURCE', 'security/install-cli.sh') +
        embed('EOS_CLI_TEMPLATE', 'security/eos-cli.sh') +
        embed('EOS_PROFILE_SOURCE', 'security/profile-common.sh') +
        embed('EOS_TLS_VALIDATOR_SOURCE', 'security/verify-runtime-tls.cjs') +
        cliInstaller + '\n' + profile;

    writeFileSync(`${dist}install.sh`, replaceLib(install, bundled));
    writeFileSync(`${dist}fix.sh`, replaceLib(fix, bundled));
    writeFileSync(`${dist}diag.sh`, diag);
    writeFileSync(`${dist}node-update.sh`, nodeUpdate);
}

function fix() {
    const pack = require('./package.json');
    pack.name = '@iobroker/fix';
    writeFileSync(`${__dirname}/package.json`, JSON.stringify(pack, null, 2));
}

if (process.argv.includes('--deploy')) {
    deploy()
        .catch(e => {
            console.error(`Cannot deploy: ${e}`);
            process.exit(1);
        });
} else if (process.argv.includes('--create')) {
    create();
} else if (process.argv.includes('--fix')) {
    fix();
} else {
    create();
    deploy()
        .catch(e => {
            console.error(`Cannot deploy: ${e}`);
            process.exit(1);
        });
}
