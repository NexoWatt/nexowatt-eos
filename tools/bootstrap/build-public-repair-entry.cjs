'use strict';
// Build-only transport for the explicitly pinned R4 -> R5 TEST repair.
// A downloaded archive is authenticated before any extracted code is loaded.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readFileLimited, trustedDirectory, validatePublicKey } = require('../../runtime/release/bundle.cjs');
const { verifyTestArchive } = require('../integration/create-test-archive.cjs');
const ROOT = path.resolve(__dirname, '../..');
const DELIVERY = 'delivery/test-pi-0.2.0-test.3-r5';
const OUTPUT = 'delivery/public-repair-test3-r5';
const ARCHIVE = 'eos-0.2.0-test.3-linux-arm64.tar.gz';
const BASE_RELEASE = '15d65328b06e5d4d3a72b2ee440159aa36e07ce300d45888762519b66652ffa8';
const BASE_KEY = 'd35d09a005703eecf1b5a8843b553064c5ab90758cfc71a634599459cda6e8b3';
const SUPERVISOR = Buffer.from(`import os
import re
import sys
invocation = os.environ.get('INVOCATION_ID', '')
if os.geteuid() != 0 or not re.fullmatch('[a-f0-9]{32}', invocation) or len(sys.argv) < 3:
    raise SystemExit('REPAIR_SUPERVISOR_REQUIRED')
os.execve('/usr/bin/node', ['/usr/bin/node', *sys.argv[1:]],
          {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LC_ALL': 'C', 'INVOCATION_ID': invocation})
`);
const fail = () => { throw new Error('PUBLIC_REPAIR_ENTRY_REJECTED'); };
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha256(bytes) });
function commit(value) { if (!/^[a-f0-9]{40}$/.test(value || '')) fail(); return value; }
function configFor(assetCommit, delivery, key) {
    commit(assetCommit);
    if (!Buffer.isBuffer(key) || key.length > 16384 || key.length < 1) fail();
    validatePublicKey(key);
    if (delivery?.schemaVersion !== 1 || delivery.runtimeVersion !== '0.2.0-test.3' ||
        delivery.deliveryRevision !== 5 || delivery.releaseSequence !== 8 || delivery.platform !== 'linux-arm64' ||
        delivery.archive !== ARCHIVE || delivery.productionReleaseApproved !== false || delivery.physicalControlEnabled !== false ||
        !/^[a-f0-9]{64}$/.test(delivery.releaseId || '') || delivery.releaseId === BASE_RELEASE ||
        delivery.signingPublicKeySha256 !== sha256(key) || delivery.signingPublicKeySha256 === BASE_KEY ||
        !/^[a-f0-9]{64}$/.test(delivery.sha256 || '') || !Number.isSafeInteger(delivery.bytes) ||
        delivery.bytes < 1 || delivery.bytes > 100 * 1024 ** 2) fail();
    return { schemaVersion: 1, assetCommit,
        baseUrl: `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${assetCommit}/${DELIVERY}`,
        releaseId: delivery.releaseId, publicKeySha256: sha256(key),
        archive: { name: ARCHIVE, bytes: delivery.bytes, sha256: delivery.sha256 },
        key: { name: 'release-public.pem', ...identity(key) } };
}
function validateConfig(config) {
    const expected = `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${commit(config?.assetCommit)}/${DELIVERY}`;
    if (config.schemaVersion !== 1 || config.baseUrl !== expected ||
        !/^[a-f0-9]{64}$/.test(config.releaseId || '') || config.releaseId === BASE_RELEASE ||
        !/^[a-f0-9]{64}$/.test(config.publicKeySha256 || '') || config.publicKeySha256 === BASE_KEY ||
        config.key?.sha256 !== config.publicKeySha256) fail();
    for (const [row, name, maximum] of [[config.archive, ARCHIVE, 100 * 1024 ** 2], [config.key, 'release-public.pem', 16384]]) {
        if (row?.name !== name || !/^[a-f0-9]{64}$/.test(row.sha256 || '') ||
            !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > maximum) fail();
    }
    return config;
}
function downloadFunction() {
    return `eos_download() {
  local eos_url="$1" eos_file="$2" eos_size="$3" eos_hash="$4"
  [[ ! -e "$eos_file" && ! -L "$eos_file" ]] || return 1
  /usr/bin/curl -q --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 300 --max-filesize "$eos_size" "$eos_url" -o "$eos_file" || return 1
  [[ -f "$eos_file" && ! -L "$eos_file" && $(/usr/bin/stat -c %h "$eos_file") == 1 && $(/usr/bin/stat -c %u "$eos_file") == "$EUID" && $(/usr/bin/stat -c %s "$eos_file") == "$eos_size" ]] || return 1
  printf '%s  %s\\n' "$eos_hash" "$eos_file" | /usr/bin/sha256sum --check --status || return 1
}
`;
}
function render(config, extractor, archiveHelper) {
    validateConfig(config);
    for (const bytes of [extractor, archiveHelper]) if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 256 * 1024) fail();
    const encoded = bytes => bytes.toString('base64').match(/.{1,76}/g).join('\n');
    return Buffer.from(`#!/bin/bash
# NexoWatt EOS R4 -> R5 TEST repair, generated from reviewed sources.
# 2026-10-03: pinned transport for an already completed R4 first start.
REPAIR_ENTRY_VERSION=2026-10-03
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C
umask 077
[[ $EUID -eq 0 && $# -eq 0 ]] || { echo 'EOS: Reparatur als root ohne Zusatzargumente starten.' >&2; exit 1; }
[[ -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1
(( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1
for eos_tool in /usr/bin/python3 /usr/bin/curl /usr/bin/node /usr/bin/sha256sum /usr/bin/systemd-run; do
  [[ -x "$eos_tool" ]] || { echo 'EOS: Ein benoetigtes Basiswerkzeug fehlt.' >&2; exit 1; }
done
eos_stage=$(/usr/bin/mktemp -d /root/eos-repair-XXXXXXXX)
trap 'echo "EOS: Reparatur angehalten. Belege verbleiben unter $eos_stage" >&2' ERR
echo "EOS: Reparaturbelege verbleiben unter $eos_stage"
${downloadFunction()}
eos_download '${config.baseUrl}/${config.archive.name}' "$eos_stage/${ARCHIVE}" '${config.archive.bytes}' '${config.archive.sha256}'
eos_download '${config.baseUrl}/release-public.pem' "$eos_stage/release-public.pem" '${config.key.bytes}' '${config.key.sha256}'
/usr/bin/mkdir -m 0700 "$eos_stage/tools" "$eos_stage/tools/system" "$eos_stage/tools/integration"
/usr/bin/base64 --decode > "$eos_stage/tools/system/extract-test-bundle.py" <<'EOS_EXTRACTOR_BASE64'
${encoded(extractor)}
EOS_EXTRACTOR_BASE64
/usr/bin/base64 --decode > "$eos_stage/tools/integration/test-archive.py" <<'EOS_ARCHIVE_BASE64'
${encoded(archiveHelper)}
EOS_ARCHIVE_BASE64
/usr/bin/base64 --decode > "$eos_stage/supervisor.py" <<'EOS_SUPERVISOR_BASE64'
${encoded(SUPERVISOR)}
EOS_SUPERVISOR_BASE64
# No extracted code runs before the complete archive passes the outer hash pin.
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/python3 -I -B "$eos_stage/tools/system/extract-test-bundle.py" --archive "$eos_stage/${ARCHIVE}" --destination "$eos_stage/extracted" --sha256 '${config.archive.sha256}'
# This updater verifies both release signatures, every payload hash, ownership,
# exact R4 baseline and the explicit new key/release pins before changing state.
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/node -e 'const { toolTrust } = require(process.argv[1]); for (const tool of ["/usr/bin/node", "/usr/bin/python3", "/usr/bin/systemctl", "/usr/bin/systemd-run"]) { if (!toolTrust(tool).trusted) throw new Error("REPAIR_UNTRUSTED_TOOL"); }' "$eos_stage/extracted/bundle/payload/tools/system/host-preflight.cjs"
eos_updater="$eos_stage/extracted/bundle/payload/tools/system/update-test-r4-to-r5.cjs"
# systemd also invokes cleanup if the updater is killed abruptly. The updater's
# operation/INVOCATION_ID guards prevent cleanup from touching another repair.
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/systemd-run --unit=nexowatt-eos-test-repair --wait --pipe --collect --service-type=oneshot --property=User=root --property=UMask=0077 --property=WorkingDirectory=/ --property=TimeoutStartSec=15min --property=TimeoutStopSec=120s --property="ExecStopPost=/usr/bin/python3 -I -B $eos_stage/supervisor.py $eos_updater --quiesce-incomplete" /usr/bin/python3 -I -B "$eos_stage/supervisor.py" "$eos_updater" --bundle "$eos_stage/extracted/bundle" --public-key "$eos_stage/release-public.pem" --expected-release-id '${config.releaseId}' --expected-key-sha256 '${config.publicKeySha256}'
echo 'EOS: Test-Reparatur abgeschlossen. Bitte den Admin-Login erneut pruefen.'
`);
}
function commandFor(entryCommit, script) {
    commit(entryCommit);
    if (!Buffer.isBuffer(script) || script.length < 1 || script.length > 1024 ** 2) fail();
    const pin = identity(script);
    const body = `set -euo pipefail; umask 077; [[ $EUID -eq 0 && -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1; (( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1; d=$(/usr/bin/mktemp -d /root/eos-repair-entry-XXXXXXXX); /usr/bin/curl -q --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize ${pin.bytes} https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${entryCommit}/${OUTPUT}/repair.sh -o "$d/repair.sh"; [[ -f "$d/repair.sh" && ! -L "$d/repair.sh" && $(/usr/bin/stat -c %h "$d/repair.sh") == 1 && $(/usr/bin/stat -c %u "$d/repair.sh") == 0 && $(/usr/bin/stat -c %s "$d/repair.sh") == ${pin.bytes} ]] || exit 1; printf '%s  %s\\n' '${pin.sha256}' "$d/repair.sh" | /usr/bin/sha256sum --check --status; /bin/bash "$d/repair.sh"`;
    return '/usr/bin/sudo /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C /bin/bash -c ' +
        "'" + body.replaceAll("'", "'\\''") + "'\n";
}
function build(assetCommit) {
    commit(assetCommit);
    const source = path.join(ROOT, DELIVERY);
    const deliveryBytes = readFileLimited(path.join(source, 'delivery.json'), 65536).bytes;
    const delivery = JSON.parse(deliveryBytes);
    const key = readFileLimited(path.join(source, 'release-public.pem'), 16384).bytes;
    const config = configFor(assetCommit, delivery, key);
    const checked = verifyTestArchive({ archivePath: path.join(source, ARCHIVE), publicKey: key,
        expectedReleaseId: config.releaseId, platform: 'linux-arm64' });
    if (checked.manifest.sequence !== 8 || checked.manifest.profile !== 'test' || checked.manifest.releaseVersion !== '0.2.0-test.3' ||
        checked.archiveSha256 !== config.archive.sha256 || checked.archiveBytes !== config.archive.bytes) fail();
    const updaterPath = 'tools/system/update-test-r4-to-r5.cjs';
    const updater = readFileLimited(path.join(ROOT, updaterPath), 1024 ** 2).bytes;
    const updaterRow = checked.manifest.files.find(row => row.path === updaterPath);
    if (!updaterRow || updaterRow.sha256 !== sha256(updater) || updaterRow.size !== updater.length) fail();
    const extractor = readFileLimited(path.join(ROOT, 'tools/system/extract-test-bundle.py'), 256 * 1024).bytes;
    const archiveHelper = readFileLimited(path.join(ROOT, 'tools/integration/test-archive.py'), 256 * 1024).bytes;
    const script = render(config, extractor, archiveHelper);
    const destination = path.join(ROOT, OUTPUT); trustedDirectory(path.dirname(destination));
    fs.mkdirSync(destination); // Exclusive; preserve any previously prepared/published repair entry.
    fs.writeFileSync(path.join(destination, 'repair.sh'), script, { flag: 'wx', mode: 0o644 });
    const report = { schemaVersion: 1, kind: 'eos-public-test-repair-entry', assetCommit, config,
        baseReleaseId: BASE_RELEASE, releaseId: config.releaseId, releaseSequence: 8, deliveryRevision: 5,
        deliveryMetadata: identity(deliveryBytes), installer: identity(script), updater: identity(updater),
        extractor: identity(extractor), archiveHelper: identity(archiveHelper), supervisor: identity(SUPERVISOR),
        archiveSignatureVerified: true, archiveReadbackVerified: true,
        immutableArchiveRebuilt: false, targetRepairExecuted: false, hardwareAcceptance: 'OPEN',
        productionReleaseApproved: false };
    fs.writeFileSync(path.join(destination, 'preparation.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    return report;
}
module.exports = { configFor, validateConfig, render, downloadFunction, commandFor, build, DELIVERY, OUTPUT, ARCHIVE, SUPERVISOR };
if (require.main === module) {
    try {
        if (process.argv.length !== 4) fail();
        if (process.argv[2] === '--asset-commit') console.log(JSON.stringify(build(process.argv[3])));
        else if (process.argv[2] === '--entry-commit') {
            const script = readFileLimited(path.join(ROOT, OUTPUT, 'repair.sh'), 1024 ** 2).bytes;
            const expected = JSON.parse(readFileLimited(path.join(ROOT, OUTPUT, 'preparation.json'), 65536).bytes).installer;
            if (expected?.bytes !== script.length || expected.sha256 !== sha256(script)) fail();
            fs.writeFileSync(path.join(ROOT, OUTPUT, 'REPAIR_COMMAND.txt'), commandFor(process.argv[3], script), { flag: 'wx' });
        } else fail();
    } catch { console.error('PUBLIC_REPAIR_ENTRY_REJECTED'); process.exitCode = 1; }
}
