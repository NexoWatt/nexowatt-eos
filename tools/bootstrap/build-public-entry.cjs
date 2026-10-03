'use strict';
// Public TEST transport for the already signed R4 delivery. No new signing,
// dependency resolution, target installation or authentication bypass occurs.
const fs = require('node:fs');
const path = require('node:path');
const { identity } = require('./build-github-download.cjs');
const { renderScript } = require('./build-download.cjs');
const { verifyTestArchive } = require('../integration/create-test-archive.cjs');
const ROOT = path.resolve(__dirname, '../..');
const DELIVERY = 'delivery/test-pi-0.2.0-test.3-r4';
const BOOTSTRAP = 'delivery/bootstrap-test3-r4';
const ASSETS = 'delivery/public-assets-test3-r4';
const OUTPUT = 'delivery/public-entry-test3-r4';
const NAMES = ['installer-kit.zip', 'node-v24.21.0-linux-arm64.tar.xz', 'eos-0.2.0-test.3-linux-arm64.tar.gz'];
const fail = () => { throw new Error('PUBLIC_ENTRY_REJECTED'); };
function commit(value) { if (!/^[a-f0-9]{40}$/.test(value || '')) fail(); return value; }
function assetConfig(sourceCommit, manifest) {
    commit(sourceCommit);
    if (manifest?.schemaVersion !== 1 || manifest.kind !== 'eos-private-github-test-install' ||
        manifest.repository !== 'NexoWatt/nexowatt-eos' || manifest.ready !== true || manifest.deliveryDirectory !== DELIVERY ||
        !Array.isArray(manifest.assets) || manifest.assets.length !== 3) fail();
    const seen = new Set();
    for (const row of manifest.assets) {
        if (!NAMES.includes(row?.name) || seen.has(row.name) || !/^[a-f0-9]{40}$/.test(row.blob || '') ||
            !/^[a-f0-9]{64}$/.test(row.sha256 || '') || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > 100 * 1024 ** 2) fail();
        seen.add(row.name);
    }
    return { schemaVersion: 1,
        baseUrl: `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${sourceCommit}/${ASSETS}`,
        deliveryDirectory: DELIVERY,
        assets: manifest.assets.map(({ name, sha256, bytes }) => ({ name, sha256, bytes })) };
}
function render(config, preparer, recovery) {
    if (!Buffer.isBuffer(preparer) || !preparer.length || preparer.length > 256 * 1024 ||
        !Buffer.isBuffer(recovery) || !recovery.length || recovery.length > 256 * 1024) fail();
    const base = renderScript(config, preparer);
    const marker = 'echo "EOS: Installationsbelege verbleiben unter $eos_stage"';
    if (base.split(marker).length !== 2) fail();
    const encoded = recovery.toString('base64').match(/.{1,76}/g).join('\n');
    const guard = `# Preserve only the diagnosed R2 sudo-abort state; all other existing hosts fail closed.
if [[ -e /opt/nexowatt/eos || -L /opt/nexowatt/eos ]]; then
  /usr/bin/base64 --decode > "$eos_stage/recover-sudo-abort.py" <<'EOS_RECOVERY_BASE64'
${encoded}
EOS_RECOVERY_BASE64
  printf '%s  %s\\n' '${identity(recovery).sha256}' "$eos_stage/recover-sudo-abort.py" | /usr/bin/sha256sum --check --status
  /usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/python3 -I -B "$eos_stage/recover-sudo-abort.py" --recover
fi
`;
    return Buffer.from(base.replace(marker, guard + marker));
}
function commandFor(installerCommit, script) {
    commit(installerCommit);
    if (!Buffer.isBuffer(script) || !script.length || script.length > 1024 ** 2) fail();
    const pin = identity(script);
    const body = `set -euo pipefail; umask 077; [[ $EUID -eq 0 && -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1; (( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1; d=$(/usr/bin/mktemp -d /root/eos-installer-XXXXXXXX); /usr/bin/curl -q --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize ${pin.bytes} https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${installerCommit}/${OUTPUT}/install.sh -o "$d/install.sh"; [[ $(/usr/bin/stat -c %s "$d/install.sh") == ${pin.bytes} ]] || exit 1; printf '%s  %s\\n' '${pin.sha256}' "$d/install.sh" | /usr/bin/sha256sum --check --status; /bin/bash "$d/install.sh"`;
    return '/usr/bin/sudo /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C SSH_CONNECTION="${SSH_CONNECTION-}" /bin/bash -c ' +
        "'" + body.replaceAll("'", "'\\''") + "'\n";
}
function checkedBytes(file, expected) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    const observed = identity(bytes);
    if (observed.blob !== expected?.blob || observed.sha256 !== expected?.sha256 || observed.bytes !== expected?.bytes) fail();
    return bytes;
}
function build(assetCommit) {
    commit(assetCommit);
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, BOOTSTRAP, 'github-manifest.json')));
    const config = assetConfig(assetCommit, manifest);
    const delivery = JSON.parse(fs.readFileSync(path.join(ROOT, DELIVERY, 'delivery.json')));
    const key = fs.readFileSync(path.join(ROOT, DELIVERY, 'release-public.pem'));
    if (delivery.deliveryRevision !== 4 || delivery.releaseSequence !== 7 || delivery.productionReleaseApproved !== false ||
        delivery.physicalControlEnabled !== false || identity(key).sha256 !== delivery.signingPublicKeySha256) fail();
    for (const asset of manifest.assets) checkedBytes(`${ASSETS}/${asset.name}`, asset);
    const archive = verifyTestArchive({ archivePath: path.join(ROOT, ASSETS, NAMES[2]), publicKey: key,
        expectedReleaseId: delivery.releaseId, platform: 'linux-arm64' });
    if (archive.archiveSha256 !== delivery.sha256 || archive.manifest.sequence !== 7 || archive.manifest.profile !== 'test') fail();
    const preparer = checkedBytes(`${BOOTSTRAP}/prepare-host.py`, manifest.prepareHost);
    const recovery = fs.readFileSync(path.join(ROOT, 'tools/bootstrap/recover-sudo-abort.py'));
    const recoveryPin = identity(recovery);
    // The recovery helper was already reviewed and published with the R2 guard.
    if (recoveryPin.sha256 !== '66104780fda7c92368e21d5baf88528ba7788a8055ccfc091d919c3a161efce4') fail();
    const script = render(config, preparer, recovery);
    const destination = path.join(ROOT, OUTPUT);
    fs.mkdirSync(destination); // Exclusive; published entries are never rewritten.
    fs.writeFileSync(path.join(destination, 'install.sh'), script, { flag: 'wx' });
    const report = { schemaVersion: 1, kind: 'eos-public-test-entry', assetCommit, config,
        sourceManifest: identity(fs.readFileSync(path.join(ROOT, BOOTSTRAP, 'github-manifest.json'))),
        preparer: identity(preparer), recovery: recoveryPin, installer: identity(script),
        releaseId: delivery.releaseId, deliveryRevision: 4, releaseSequence: 7,
        signedArchiveSha256: archive.archiveSha256, archiveSignatureVerified: true,
        runtimeArchiveRebuilt: false, appSbomChanged: false, tokenRequired: false,
        targetInstallationExecuted: false, productionReleaseApproved: false };
    fs.writeFileSync(path.join(destination, 'preparation.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    return report;
}
module.exports = { assetConfig, render, commandFor, build, ASSETS, OUTPUT };
if (require.main === module) {
    try {
        if (process.argv.length !== 4) fail();
        if (process.argv[2] === '--asset-commit') console.log(JSON.stringify(build(process.argv[3])));
        else if (process.argv[2] === '--installer-commit') {
            const script = fs.readFileSync(path.join(ROOT, OUTPUT, 'install.sh'));
            const expected = JSON.parse(fs.readFileSync(path.join(ROOT, OUTPUT, 'preparation.json'))).installer;
            if (JSON.stringify(identity(script)) !== JSON.stringify(expected)) fail();
            fs.writeFileSync(path.join(ROOT, OUTPUT, 'INSTALL_COMMAND.txt'), commandFor(process.argv[3], script), { flag: 'wx' });
        } else fail();
    } catch { console.error('PUBLIC_ENTRY_REJECTED'); process.exitCode = 1; }
}
