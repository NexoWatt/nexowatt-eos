'use strict';
// Manufacturer-only preparation of a pinned private-repository TEST download.
// Authentication belongs to the target terminal, never to generated files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const publicBuilder = require('./build-download.cjs');
const { sha256, readFileLimited, trustedDirectory } = require('../../runtime/release/bundle.cjs');
const { DELIVERY_DIRECTORY } = require('../system/install-from-checkout.cjs');
const ROOT = path.resolve(__dirname, '../..');
const REPOSITORY = 'NexoWatt/nexowatt-eos';
const FLAGS = ['--license-trust', '--license-trust-sha256', '--release-public-key-sha256', '--output'];
const fail = code => { throw Object.assign(new Error(code), { code }); };
function parse(argv) {
    if (argv.length !== FLAGS.length * 2) fail('GITHUB_BUILD_USAGE');
    const args = {};
    for (let i = 0; i < argv.length; i += 2) {
        if (!FLAGS.includes(argv[i]) || Object.hasOwn(args, argv[i]) || !argv[i + 1]) fail('GITHUB_BUILD_USAGE');
        args[argv[i]] = argv[i + 1];
    }
    publicBuilder.parse(['--base-url', 'https://api.github.com', ...argv]);
    return args;
}
function identity(bytes) {
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 100 * 1024 ** 2) fail('GITHUB_BUILD_BLOB_SIZE');
    return { blob: crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
        sha256: sha256(bytes), bytes: bytes.length };
}
function pin(value) {
    if (!value || !/^[a-f0-9]{40}$/.test(value.blob || '') || !/^[a-f0-9]{64}$/.test(value.sha256 || '') ||
        !Number.isSafeInteger(value.bytes) || value.bytes <= 0 || value.bytes > 1024 * 1024) fail('GITHUB_BUILD_COMMAND_PIN');
}
function installCommand(driver, manifest) {
    pin(driver); pin(manifest);
    // The quoted here-document is one pasteable command. Secrets come only from
    // /dev/tty, never from the command line, shell history, URL, environment or disk.
    return `/bin/bash <<'EOS_INSTALL'
# EOS_GITHUB_BOOTSTRAP_VERSION=2026-10-03
set +x
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C
umask 077
[[ $EUID -eq 0 ]] || { echo 'EOS: Bitte zuerst sudo -i ausfuehren.' >&2; exit 1; }
[[ -x /usr/bin/curl && -x /usr/bin/python3 ]] || { echo 'EOS: curl und python3 werden im Basisabbild benoetigt.' >&2; exit 1; }
[[ -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1
(( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1
set +a
unset eos_token
read -r -s -p 'GitHub-Token: ' eos_token </dev/tty
printf '\\n' >/dev/tty
[[ $eos_token =~ ^[A-Za-z0-9_]{20,512}$ ]] || { echo 'EOS: Tokenformat ungueltig.' >&2; exit 1; }
eos_stage=$(/usr/bin/mktemp -d /root/eos-download-XXXXXXXX)
printf 'header = "Authorization: Bearer %s"\\n' "$eos_token" | /usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/curl -q --config - --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize ${driver.bytes} --header 'Accept: application/vnd.github.raw+json' --header 'X-GitHub-Api-Version: 2022-11-28' 'https://api.github.com/repos/${REPOSITORY}/git/blobs/${driver.blob}' -o "$eos_stage/github-download.py"
printf '%s  %s\\n' '${driver.sha256}' "$eos_stage/github-download.py" | /usr/bin/sha256sum --check --status
exec 3< <(printf '%s\\n' "$eos_token")
unset eos_token
exec /usr/bin/env -i PATH="$PATH" LC_ALL=C SSH_CONNECTION="\${SSH_CONNECTION-}" /usr/bin/python3 -I -B "$eos_stage/github-download.py" --manifest-blob ${manifest.blob} --manifest-sha256 ${manifest.sha256}
EOS_INSTALL`;
}
function build(args) {
    const output = path.resolve(args['--output']);
    const parent = path.join(ROOT, 'delivery');
    if (path.dirname(output) !== parent || !/^[a-z0-9-]+$/.test(path.basename(output))) fail('GITHUB_BUILD_OUTPUT_SCOPE');
    trustedDirectory(parent);
    if (fs.existsSync(output)) fail('GITHUB_BUILD_FRESH_OUTPUT');
    const workRoot = path.join(ROOT, '.work');
    fs.mkdirSync(workRoot, { recursive: true });
    const work = fs.mkdtempSync(path.join(workRoot, 'github-bootstrap-'));
    const prepared = path.join(work, 'prepared');
    const checked = publicBuilder.build({ ...args, '--base-url': 'https://api.github.com', '--output': prepared });
    const driver = readFileLimited(path.join(__dirname, 'github-download.py'), 1024 ** 2).bytes;
    const helper = readFileLimited(path.join(__dirname, 'prepare-host.py'), 1024 ** 2).bytes;
    const assets = checked.assets.map(row => {
        const source = row.name === 'installer-kit.zip' ? path.join(prepared, row.name) :
            path.join(ROOT, row.name.startsWith('node-') ? 'delivery/test-pi-0.2.0-test.1' : DELIVERY_DIRECTORY, row.name);
        const bytes = fs.readFileSync(source);
        const pinned = identity(bytes);
        if (pinned.sha256 !== row.sha256 || pinned.bytes !== row.bytes) fail('GITHUB_BUILD_CHANGED_ASSET');
        return { name: row.name, ...pinned };
    });
    const manifest = { schemaVersion: 1, kind: 'eos-private-github-test-install', repository: REPOSITORY,
        ready: true, deliveryDirectory: DELIVERY_DIRECTORY, prepareHost: identity(helper), assets };
    const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
    const command = installCommand(identity(driver), identity(manifestBytes));
    fs.mkdirSync(output);
    for (const [name, bytes] of [['github-download.py', driver], ['prepare-host.py', helper],
        ['github-manifest.json', manifestBytes], ['INSTALL_COMMAND.txt', Buffer.from(command + '\n')],
        ['installer-kit.zip', fs.readFileSync(path.join(prepared, 'installer-kit.zip'))],
        ['license-public-trust.json', fs.readFileSync(path.join(prepared, 'build-record/license-public-trust.json'))]])
        fs.writeFileSync(path.join(output, name), bytes, { flag: 'wx' });
    const report = { schemaVersion: 1, kind: 'eos-private-github-test-download-preparation', repository: REPOSITORY,
        manifest: identity(manifestBytes), driver: identity(driver), prepareHost: identity(helper), assets,
        releaseId: checked.releaseId, releaseSequence: checked.releaseSequence,
        licenseTrustSha256: checked.licenseTrustSha256, releasePublicKeySha256: checked.releasePublicKeySha256,
        kit: checked.kit, sourceFilesBound: checked.sourceFilesBound,
        tokenStored: false, published: false, targetInstallationExecuted: false, hardwareAcceptance: 'OPEN',
        productionReleaseApproved: false, fleetUpdaterImplemented: false };
    fs.writeFileSync(path.join(output, 'preparation.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    return report;
}
function prepareBlocked(output) {
    // Reviewable download entry while the manufacturer-key identity is pending.
    // No fixture/replacement key is ever shipped as an installation trust anchor.
    if (!path.isAbsolute(output) || path.dirname(output) !== path.join(ROOT, 'delivery') ||
        !/^[a-z0-9-]+$/.test(path.basename(output)) || fs.existsSync(output)) fail('GITHUB_BUILD_FRESH_OUTPUT');
    trustedDirectory(path.dirname(output));
    const driver = readFileLimited(path.join(__dirname, 'github-download.py'), 1024 ** 2).bytes;
    const manifest = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'eos-private-github-test-install',
        repository: REPOSITORY, ready: false, reason: 'manufacturer-license-trust-missing' }, null, 2) + '\n');
    const command = installCommand(identity(driver), identity(manifest));
    fs.mkdirSync(output);
    for (const [name, bytes] of [['github-download.py', driver], ['github-manifest.json', manifest],
        ['INSTALL_COMMAND.txt', Buffer.from(command + '\n')]])
        fs.writeFileSync(path.join(output, name), bytes, { flag: 'wx' });
    return { ready: false, reason: 'manufacturer-license-trust-missing', driver: identity(driver), manifest: identity(manifest) };
}
module.exports = { REPOSITORY, parse, identity, installCommand, build, prepareBlocked };
if (require.main === module) {
    try { process.stdout.write(JSON.stringify(build(parse(process.argv.slice(2))), null, 2) + '\n'); }
    catch (error) { process.stderr.write(JSON.stringify({ ok: false,
        code: /^(?:GITHUB_BUILD|DOWNLOAD)_[A-Z_]+$/.test(error.code || '') ? error.code : 'GITHUB_BUILD_FAILED' }) + '\n'); process.exitCode = 1; }
}
