'use strict';
// Manufacturer build host only. Prepares a fixed TEST download; never publishes.
// Public trust exports must be authenticated by the manufacturer before use.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { inventory, readFileLimited, sha256, trustedDirectory } = require('../../runtime/release/bundle.cjs');
const { verifyTestArchive } = require('../integration/create-test-archive.cjs');
const { digestArchive, deliveryIdentity, DELIVERY_DIRECTORY, DELIVERY_REVISION, RELEASE_SEQUENCE } = require('../system/install-from-checkout.cjs');
const { validatePublicKeys } = require('../../components/admin/build/lib/eosLicenseCore.js');
const ROOT = path.resolve(__dirname, '../..');
const NODE_ARCHIVE = 'node-v24.21.0-linux-arm64.tar.xz';
const NODE_SHA256 = '6ad1325edbdb5649c379b75a237147a666c95d4f9ae8d340fef2d1575d289ad2';
const FLAGS = ['--base-url', '--license-trust', '--license-trust-sha256', '--release-public-key-sha256', '--output'];
const fail = code => { throw Object.assign(new Error(code), { code }); };
function baseUrl(value) {
    // No credentials, redirects, query tokens, escapes or shell metacharacters.
    if (typeof value !== 'string' || value.length > 512 ||
        !/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?:\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)*$/.test(value)) fail('DOWNLOAD_HTTPS_URL');
    const url = new URL(value);
    if (url.href !== value + '/' && url.href !== value || !url.hostname.includes('.') || url.port ||
        url.username || url.password || url.search || url.hash) fail('DOWNLOAD_HTTPS_URL');
    return value;
}
function parse(argv) {
    if (argv.length !== FLAGS.length * 2) fail('DOWNLOAD_USAGE');
    const args = {};
    for (let i = 0; i < argv.length; i += 2) {
        if (!FLAGS.includes(argv[i]) || Object.hasOwn(args, argv[i]) || !argv[i + 1]) fail('DOWNLOAD_USAGE');
        args[argv[i]] = argv[i + 1];
    }
    baseUrl(args['--base-url']);
    for (const key of ['--license-trust-sha256', '--release-public-key-sha256'])
        if (!/^[a-f0-9]{64}$/.test(args[key] || '')) fail('DOWNLOAD_TRUST_PIN');
    for (const key of ['--license-trust', '--output'])
        if (!path.isAbsolute(args[key]) || path.resolve(args[key]) !== args[key]) fail('DOWNLOAD_PATH');
    return args;
}
function licenseTrust(bytes, expectedHash) {
    if (!Buffer.isBuffer(bytes) || bytes.length > 32768 || !/^[a-f0-9]{64}$/.test(expectedHash || '') ||
        sha256(bytes) !== expectedHash || /PRIVATE KEY/.test(bytes.toString('utf8'))) fail('DOWNLOAD_LICENSE_TRUST');
    try { validatePublicKeys(JSON.parse(bytes)); } catch { fail('DOWNLOAD_LICENSE_TRUST'); }
    return bytes;
}
function sourceBinding(manifest, rows) {
    const signed = new Map(manifest.files.map(row => [row.path, row]));
    const expected = manifest.files.filter(row => row.path.startsWith('runtime/') || row.path.startsWith('tools/system/') ||
        row.path === 'tools/integration/check-runtime-architecture.cjs' || row.path === 'security/verify-runtime-tls.cjs');
    const kit = new Map(rows.map(row => [row.name, row]));
    for (const row of expected) {
        const source = kit.get(row.path);
        if (!source || source.bytes !== row.size || source.sha256 !== row.sha256) fail('DOWNLOAD_SOURCE_BINDING');
    }
    for (const row of rows.filter(row => row.name.startsWith('runtime/')))
        if (!signed.has(row.name)) fail('DOWNLOAD_SOURCE_BINDING');
    return expected.length;
}
function renderScript(config, pythonSource) {
    const encode = bytes => Buffer.from(bytes).toString('base64').match(/.{1,76}/g).join('\n');
    return `#!/bin/bash
# NexoWatt EOS TEST bootstrap. Generated from reviewed sources; complete download required.
BOOTSTRAP_VERSION=2026-10-03
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C
umask 077
[[ $EUID -eq 0 && $# -eq 0 ]] || { echo 'EOS: Als root ohne Zusatzargumente starten.' >&2; exit 1; }
[[ -x /usr/bin/python3 && -x /usr/bin/curl ]] || { echo 'EOS: Das Debian-13-Basisabbild benoetigt python3 und curl.' >&2; exit 1; }
[[ -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1
(( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1
eos_stage=$(/usr/bin/mktemp -d /root/eos-download-XXXXXXXX)
/usr/bin/base64 --decode > "$eos_stage/prepare-host.py" <<'EOS_PYTHON_BASE64'
${encode(pythonSource)}
EOS_PYTHON_BASE64
/usr/bin/base64 --decode > "$eos_stage/download.json" <<'EOS_CONFIG_BASE64'
${encode(JSON.stringify(config) + '\n')}
EOS_CONFIG_BASE64
echo "EOS: Installationsbelege verbleiben unter $eos_stage"
exec /usr/bin/env -i PATH="$PATH" LC_ALL=C SSH_CONNECTION="${'$'}{SSH_CONNECTION-}" /usr/bin/python3 -I -B "$eos_stage/prepare-host.py" "$eos_stage/download.json"
`;
}
function installCommand(url, scriptBytes) {
    baseUrl(url);
    const digest = sha256(scriptBytes);
    // One pasteable command. The entire script must pass its separately delivered
    // pin before Bash executes it. No streamed/truncated script execution.
    const body = `set -eu; umask 077; d=$(mktemp -d /root/eos-installer-XXXXXXXX); /usr/bin/curl -q --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize ${scriptBytes.length} '${url}/install.sh' -o "$d/install.sh"; printf '%s  %s\\n' '${digest}' "$d/install.sh" | /usr/bin/sha256sum --check --status; /bin/bash "$d/install.sh"`;
    return '/bin/bash -c ' + "'" + body.replace(/'/g, "'\\''") + "'";
}
function build(args) {
    const url = baseUrl(args['--base-url']);
    const trust = licenseTrust(readFileLimited(args['--license-trust'], 32768).bytes, args['--license-trust-sha256']);
    const deliveryDir = path.join(ROOT, DELIVERY_DIRECTORY);
    const keyBytes = readFileLimited(path.join(deliveryDir, 'release-public.pem'), 16384).bytes;
    const delivery = deliveryIdentity(JSON.parse(readFileLimited(path.join(deliveryDir, 'delivery.json'), 65536).bytes),
        keyBytes, args['--release-public-key-sha256'], 'linux-arm64');
    const archiveFile = path.join(deliveryDir, delivery.archive);
    const checked = verifyTestArchive({ archivePath: archiveFile, publicKey: keyBytes, expectedReleaseId: delivery.releaseId, platform: 'linux-arm64' });
    if (checked.manifest.sequence !== RELEASE_SEQUENCE || checked.archiveSha256 !== delivery.sha256 || checked.archiveBytes !== delivery.bytes)
        fail('DOWNLOAD_RELEASE_BINDING');
    const nodeFile = path.join(ROOT, 'delivery/test-pi-0.2.0-test.1', NODE_ARCHIVE);
    if (digestArchive(nodeFile) !== NODE_SHA256) fail('DOWNLOAD_NODE_HASH');
    const output = path.resolve(args['--output']); trustedDirectory(path.dirname(output));
    if (fs.existsSync(output)) fail('DOWNLOAD_FRESH_OUTPUT');
    const rows = [];
    function add(name, source) {
        const bytes = readFileLimited(source, 16 * 1024 ** 2).bytes;
        rows.push({ name, source, bytes: bytes.length, sha256: sha256(bytes) });
    }
    for (const dir of ['runtime', 'tools/system', 'licenses'])
        for (const row of inventory(path.join(ROOT, dir))) add(dir + '/' + row.path, path.join(ROOT, dir, row.path));
    for (const name of ['tools/bootstrap/first-start.cjs', 'tools/integration/test-archive.py',
        'tools/integration/check-runtime-architecture.cjs', 'security/verify-runtime-tls.cjs', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
        'docs/history/UPSTREAM_README.md']) add(name, path.join(ROOT, name));
    for (const name of ['delivery.json', 'release-public.pem']) add(DELIVERY_DIRECTORY + '/' + name, path.join(deliveryDir, name));
    const sourceFilesBound = sourceBinding(checked.manifest, rows);
    fs.mkdirSync(output);
    const work = path.join(output, 'build-record'); fs.mkdirSync(work);
    const save = (name, value) => fs.writeFileSync(path.join(work, name), value, { flag: 'wx' });
    save('license-public-trust.json', trust);
    save('bootstrap.json', JSON.stringify({ schemaVersion: 1, releasePublicKeySha256: delivery.signingPublicKeySha256,
        licenseTrustSha256: sha256(trust) }) + '\n');
    for (const name of ['license-public-trust.json', 'bootstrap.json']) add(name, path.join(work, name));
    rows.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    save('kit-inputs.json', JSON.stringify(rows, null, 2) + '\n');
    const zip = path.join(output, 'installer-kit.zip');
    const packed = cp.spawnSync(process.platform === 'win32' ? 'python' : '/usr/bin/python3',
        ['-I', '-B', path.join(__dirname, 'build-kit.py'), path.join(work, 'kit-inputs.json'), zip],
        { encoding: 'utf8', shell: false, windowsHide: true, timeout: 120000, maxBuffer: 65536 });
    if (packed.error || packed.status !== 0) fail('DOWNLOAD_KIT_BUILD');
    const kit = JSON.parse(packed.stdout);
    const assets = [];
    for (const [name, source, expected] of [['installer-kit.zip', zip, digestArchive(zip)],
        [NODE_ARCHIVE, nodeFile, NODE_SHA256], [delivery.archive, archiveFile, checked.archiveSha256]]) {
        const destination = path.join(output, name);
        if (source !== destination) fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
        if (digestArchive(destination) !== expected) fail('DOWNLOAD_COPY_CHANGED');
        assets.push({ name, sha256: expected, bytes: fs.statSync(destination).size });
    }
    const config = { schemaVersion: 1, baseUrl: url, assets, deliveryDirectory: DELIVERY_DIRECTORY };
    const script = Buffer.from(renderScript(config, readFileLimited(path.join(__dirname, 'prepare-host.py')).bytes));
    fs.writeFileSync(path.join(output, 'install.sh'), script, { flag: 'wx' });
    const command = installCommand(url, script);
    fs.writeFileSync(path.join(output, 'INSTALL_COMMAND.txt'), command + '\n', { flag: 'wx' });
    const report = { schemaVersion: 1, kind: 'eos-test-download-preparation', baseUrl: url,
        releaseId: checked.releaseId, releaseSequence: RELEASE_SEQUENCE, deliveryRevision: DELIVERY_REVISION, assets,
        bootstrapSha256: sha256(script), sourceFilesBound, kit,
        licenseTrustSha256: sha256(trust), releasePublicKeySha256: delivery.signingPublicKeySha256,
        published: false, targetInstallationExecuted: false, hardwareAcceptance: 'OPEN',
        browserCertificateTrust: 'Local device CA must be authenticated and trusted by the client.',
        productionReleaseApproved: false, fleetUpdaterImplemented: false };
    fs.writeFileSync(path.join(output, 'download-preparation.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    return report;
}
module.exports = { baseUrl, parse, licenseTrust, sourceBinding, renderScript, installCommand, build };
if (require.main === module) {
    try { process.stdout.write(JSON.stringify(build(parse(process.argv.slice(2))), null, 2) + '\n'); }
    catch (error) { process.stderr.write(JSON.stringify({ ok: false,
        code: /^DOWNLOAD_[A-Z_]+$/.test(error.code || '') ? error.code : 'DOWNLOAD_BUILD_FAILED' }) + '\n'); process.exitCode = 1; }
}
