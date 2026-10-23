'use strict';
// Manufacturer-only preparation: one authenticated R8 -> managed15 transition.
// Does not sign, publish, install prerequisites or execute the target update.
const fs = require('node:fs');
const path = require('node:path');
const { readFileLimited, sha256, trustedDirectory, validatePublicKey } = require('../../runtime/release/bundle.cjs');
const { verifyTestArchive } = require('../integration/create-test-archive.cjs');
const ROOT = path.resolve(__dirname, '../..');
const DELIVERY = 'delivery/managed-test-15';
const ARCHIVE = 'eos-linux-arm64.tar.gz';
const PUBLIC_KEY_SHA256 = '518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40';
const BASELINE = Object.freeze({ revision: 8, sequence: 11,
    releaseId: 'eb3d1747c35988bdf8785e7a5cdfc786ab356fa87149054767d7c0ed211b7ea7',
    publicKeySha256: 'bc104daef9346ef31fe7b51d447bc8d3c5103aa5e6cf532e7a83ea17551280c5' });
const SOURCE_PATHS = Object.freeze(['tools/system/update-r8-to-managed.cjs', 'tools/system/migrate-r8-host.cjs',
    'tools/system/migrate-r8-os-maintenance.cjs', 'runtime/bootstrap/r8-managed-enrollment.cjs']);
const HELPERS = Object.freeze({ extractor: 'tools/system/extract-test-bundle.py', archiveHelper: 'tools/integration/test-archive.py',
    transport: 'tools/bootstrap/prepare-managed-host.py', downloader: 'tools/bootstrap/download-r8-managed.py' });
const SUPERVISOR = Buffer.from(`import os
import re
import sys
invocation = os.environ.get('INVOCATION_ID', '')
if os.geteuid() != 0 or not re.fullmatch('[a-f0-9]{32}', invocation) or len(sys.argv) < 3:
    raise SystemExit('R8_MANAGED_SUPERVISOR_REQUIRED')
os.execve('/usr/bin/node', ['/usr/bin/node', *sys.argv[1:]],
          {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'LC_ALL': 'C', 'INVOCATION_ID': invocation})
`);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const identity = bytes => ({ bytes: bytes.length, sha256: sha256(bytes) });
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
function absolute(value) {
    if (typeof value !== 'string' || !path.isAbsolute(value) || path.resolve(value) !== value) fail('R8_ENTRY_PATH');
    return value;
}
function configFor(delivery, key) {
    validatePublicKey(key);
    if (sha256(key) !== PUBLIC_KEY_SHA256 || delivery?.schemaVersion !== 1 || delivery.runtimeVersion !== '0.2.0-test.3'
        || delivery.deliveryRevision !== 12 || delivery.releaseSequence !== 15 || delivery.platform !== 'linux-arm64'
        || delivery.archive !== ARCHIVE || delivery.productionReleaseApproved !== false
        || !hash(delivery.releaseId) || delivery.releaseId === BASELINE.releaseId || !hash(delivery.sha256)
        || delivery.signingPublicKeySha256 !== PUBLIC_KEY_SHA256 || !Number.isSafeInteger(delivery.bytes)
        || delivery.bytes < 1 || delivery.bytes > 256 * 1024 ** 2) fail('R8_ENTRY_DELIVERY');
    return { schemaVersion: 1, releaseId: delivery.releaseId, publicKeySha256: PUBLIC_KEY_SHA256,
        url: `https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-${delivery.releaseId}/${ARCHIVE}`,
        bytes: delivery.bytes, sha256: delivery.sha256, key: identity(key) };
}
function validateConfig(value) {
    if (!value || Object.keys(value).sort().join('|') !== ['schemaVersion', 'releaseId', 'publicKeySha256', 'url', 'bytes', 'sha256', 'key'].sort().join('|')
        || value.schemaVersion !== 1 || !hash(value.releaseId) || value.releaseId === BASELINE.releaseId
        || value.publicKeySha256 !== PUBLIC_KEY_SHA256 || !hash(value.sha256)
        || value.url !== `https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-${value.releaseId}/${ARCHIVE}`
        || !Number.isSafeInteger(value.bytes) || value.bytes < 1 || value.bytes > 256 * 1024 ** 2
        || !value.key || Object.keys(value.key).sort().join('|') !== 'bytes|sha256'
        || value.key.sha256 !== PUBLIC_KEY_SHA256 || !Number.isSafeInteger(value.key.bytes) || value.key.bytes < 1 || value.key.bytes > 16384)
        fail('R8_ENTRY_CONFIG');
    return value;
}
function render(config, key, helpers) {
    validateConfig(config);
    if (!Buffer.isBuffer(key) || sha256(key) !== PUBLIC_KEY_SHA256 || key.length !== config.key.bytes) fail('R8_ENTRY_KEY');
    for (const name of Object.keys(HELPERS)) if (!Buffer.isBuffer(helpers?.[name]) || !helpers[name].length || helpers[name].length > 256 * 1024)
        fail('R8_ENTRY_HELPER');
    const encoded = bytes => Buffer.from(bytes).toString('base64').match(/.{1,76}/g).join('\n');
    const input = { schemaVersion: 1, releaseId: config.releaseId, url: config.url, bytes: config.bytes, sha256: config.sha256 };
    return Buffer.from(`#!/bin/bash
# NexoWatt EOS completed R8 -> managed15 TEST update, no intermediate revisions.
UPDATE_ENTRY_VERSION=2026-10-22-r8-managed15
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C
umask 077
[[ $EUID -eq 0 && $# -eq 0 ]] || { echo 'EOS: Update als root ohne Zusatzargumente starten.' >&2; exit 1; }
[[ -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1
(( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1
for eos_tool in /usr/bin/python3 /usr/bin/curl /usr/bin/node /usr/bin/sha256sum /usr/bin/systemd-run /usr/bin/systemctl /usr/sbin/nft /usr/sbin/ip /usr/sbin/dnsmasq; do
  [[ -x "$eos_tool" ]] || { echo 'EOS: Ein benoetigtes Basiswerkzeug fehlt. Vor dem Update die dokumentierte Hostvorbereitung abschliessen.' >&2; exit 1; }
done
[[ $(/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/node --version) == v24.21.0 ]] || { echo 'EOS: Der R8-Ausgangsstand benoetigt Node 24.21.0.' >&2; exit 1; }
eos_stage=$(/usr/bin/mktemp -d /root/eos-r8-managed-XXXXXXXX)
trap 'echo "EOS: Update angehalten. Belege verbleiben unter $eos_stage" >&2' ERR
echo "EOS: Updatebelege verbleiben unter $eos_stage"
/usr/bin/mkdir -m 0700 "$eos_stage/tools" "$eos_stage/tools/system" "$eos_stage/tools/integration"
/usr/bin/base64 --decode > "$eos_stage/release-public.pem" <<'EOS_KEY_BASE64'
${encoded(key)}
EOS_KEY_BASE64
/usr/bin/base64 --decode > "$eos_stage/download.json" <<'EOS_CONFIG_BASE64'
${encoded(JSON.stringify(input) + '\n')}
EOS_CONFIG_BASE64
/usr/bin/base64 --decode > "$eos_stage/prepare-managed-host.py" <<'EOS_TRANSPORT_BASE64'
${encoded(helpers.transport)}
EOS_TRANSPORT_BASE64
/usr/bin/base64 --decode > "$eos_stage/download-r8-managed.py" <<'EOS_DOWNLOAD_BASE64'
${encoded(helpers.downloader)}
EOS_DOWNLOAD_BASE64
/usr/bin/base64 --decode > "$eos_stage/tools/system/extract-test-bundle.py" <<'EOS_EXTRACTOR_BASE64'
${encoded(helpers.extractor)}
EOS_EXTRACTOR_BASE64
/usr/bin/base64 --decode > "$eos_stage/tools/integration/test-archive.py" <<'EOS_ARCHIVE_BASE64'
${encoded(helpers.archiveHelper)}
EOS_ARCHIVE_BASE64
/usr/bin/base64 --decode > "$eos_stage/supervisor.py" <<'EOS_SUPERVISOR_BASE64'
${encoded(SUPERVISOR)}
EOS_SUPERVISOR_BASE64
# Transport only: this import never invokes fresh-host admission or APT.
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/python3 -I -B "$eos_stage/download-r8-managed.py" "$eos_stage/download.json"
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/python3 -I -B "$eos_stage/tools/system/extract-test-bundle.py" --archive "$eos_stage/${ARCHIVE}" --destination "$eos_stage/extracted" --sha256 '${config.sha256}'
# The complete archive is hash-authenticated before loading any extracted source.
# The coordinator rechecks signatures, R8 authority, data and host invariants.
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/node -e 'const { toolTrust } = require(process.argv[1]); for (const tool of ["/usr/bin/node", "/usr/bin/python3", "/usr/bin/systemctl", "/usr/bin/systemd-run", "/usr/sbin/nft", "/usr/sbin/ip", "/usr/sbin/dnsmasq"]) { if (!toolTrust(tool).trusted) throw new Error("R8_ENTRY_UNTRUSTED_TOOL"); }' "$eos_stage/extracted/bundle/payload/tools/system/host-preflight.cjs"
eos_updater="$eos_stage/extracted/bundle/payload/tools/system/update-r8-to-managed.cjs"
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/systemd-run --unit=nexowatt-eos-r8-managed-update --wait --pipe --collect --service-type=oneshot --property=User=root --property=UMask=0077 --property=WorkingDirectory=/ --property=TimeoutStartSec=20min --property=TimeoutStopSec=120s --property="ExecStopPost=/usr/bin/python3 -I -B $eos_stage/supervisor.py $eos_updater --quiesce-incomplete" /usr/bin/python3 -I -B "$eos_stage/supervisor.py" "$eos_updater" --bundle "$eos_stage/extracted/bundle" --public-key "$eos_stage/release-public.pem" --expected-release-id '${config.releaseId}' --expected-key-sha256 '${PUBLIC_KEY_SHA256}'
echo 'EOS: Direkter R8-Testumstieg abgeschlossen. Bitte Admin, Lizenzstatus und Updateautomatik pruefen.'
`);
}
function commandFor(entryBaseUrl, script) {
    if (typeof entryBaseUrl !== 'string' || !/^https:\/\/raw\.githubusercontent\.com\/NexoWatt\/nexowatt-eos\/[a-f0-9]{40}\/delivery\/[A-Za-z0-9_-]+$/.test(entryBaseUrl)
        || !Buffer.isBuffer(script) || !script.length || script.length > 1024 ** 2) fail('R8_ENTRY_COMMAND');
    const pin = identity(script);
    const body = `set -euo pipefail; umask 077; [[ $EUID -eq 0 && -d /root && ! -L /root && $(/usr/bin/stat -c %u /root) == 0 ]] || exit 1; (( (8#$(/usr/bin/stat -c %a /root) & 0022) == 0 )) || exit 1; d=$(/usr/bin/mktemp -d /root/eos-r8-entry-XXXXXXXX); /usr/bin/curl -q --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 5 --max-time 5 --max-filesize ${pin.bytes} '${entryBaseUrl}/update.sh' -o "$d/update.sh"; [[ -f "$d/update.sh" && ! -L "$d/update.sh" && $(/usr/bin/stat -c %h "$d/update.sh") == 1 && $(/usr/bin/stat -c %u "$d/update.sh") == 0 && $(/usr/bin/stat -c %s "$d/update.sh") == ${pin.bytes} ]] || exit 1; printf '%s  %s\\n' '${pin.sha256}' "$d/update.sh" | /usr/bin/sha256sum --check --status; /bin/bash "$d/update.sh"`;
    return '/usr/bin/sudo /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin LC_ALL=C /bin/bash -c ' + "'" + body.replaceAll("'", "'\\''") + "'\n";
}
function build(output) {
    absolute(output); trustedDirectory(path.dirname(output));
    if (fs.existsSync(output)) fail('R8_ENTRY_OUTPUT_EXISTS');
    const directory = path.join(ROOT, DELIVERY);
    const deliveryBytes = readFileLimited(path.join(directory, 'delivery.json'), 65536).bytes;
    const key = readFileLimited(path.join(directory, 'release-public.pem'), 16384).bytes;
    const config = configFor(JSON.parse(deliveryBytes), key);
    const checked = verifyTestArchive({ archivePath: path.join(directory, ARCHIVE), publicKey: key,
        expectedReleaseId: config.releaseId, platform: 'linux-arm64', nodeVersion: '24.22.1' });
    if (checked.manifest.sequence !== 15 || checked.manifest.profile !== 'test' || checked.manifest.releaseVersion !== '0.2.0-test.3'
        || checked.archiveSha256 !== config.sha256 || checked.archiveBytes !== config.bytes) fail('R8_ENTRY_ARCHIVE_BINDING');
    const sources = {};
    for (const name of SOURCE_PATHS) {
        const bytes = readFileLimited(path.join(ROOT, name), 1024 ** 2).bytes;
        const row = checked.manifest.files.find(item => item.path === name);
        if (!row || row.size !== bytes.length || row.sha256 !== sha256(bytes)) fail('R8_ENTRY_SOURCE_BINDING');
        sources[name] = identity(bytes);
    }
    const helpers = Object.fromEntries(Object.entries(HELPERS).map(([name, file]) => [name, readFileLimited(path.join(ROOT, file), 256 * 1024).bytes]));
    const script = render(config, key, helpers);
    const report = { schemaVersion: 1, kind: 'eos-r8-managed-entry-preparation', config, baseline: BASELINE,
        releaseSequence: 15, nodeVersion: '24.22.1', sources, helpers: Object.fromEntries(Object.entries(helpers).map(([name, bytes]) => [name, identity(bytes)])),
        supervisor: identity(SUPERVISOR), deliveryMetadata: identity(deliveryBytes), installer: identity(script),
        archiveSignatureVerified: true, archiveReadbackVerified: true, commandReady: false,
        published: false, publicReadbackPerformed: false, targetUpdateExecuted: false, hardwareAcceptance: 'OPEN', productionReleaseApproved: false };
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'update.sh'), script, { flag: 'wx', mode: 0o644 });
    fs.writeFileSync(path.join(output, 'preparation.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
    return report;
}
function finalize({ directory, entryBaseUrl }) {
    absolute(directory); trustedDirectory(directory);
    const script = readFileLimited(path.join(directory, 'update.sh'), 1024 ** 2).bytes;
    const prepared = JSON.parse(readFileLimited(path.join(directory, 'preparation.json'), 65536).bytes);
    if (prepared.schemaVersion !== 1 || prepared.kind !== 'eos-r8-managed-entry-preparation' || prepared.releaseSequence !== 15
        || prepared.commandReady !== false || prepared.archiveSignatureVerified !== true || prepared.archiveReadbackVerified !== true
        || prepared.nodeVersion !== '24.22.1' || prepared.installer?.bytes !== script.length || prepared.installer?.sha256 !== sha256(script))
        fail('R8_ENTRY_PREPARATION_BINDING');
    validateConfig(prepared.config);
    const command = commandFor(entryBaseUrl, script);
    if (fs.existsSync(path.join(directory, 'R8_UPDATE_COMMAND.txt')) || fs.existsSync(path.join(directory, 'command-preparation.json')))
        fail('R8_ENTRY_OUTPUT_EXISTS');
    const report = { schemaVersion: 1, kind: 'eos-r8-managed-command-preparation', entryBaseUrl, releaseSequence: 15,
        releaseId: prepared.config.releaseId, installer: identity(script), commandReady: true,
        publicReadbackPerformed: false, targetUpdateExecuted: false, productionReleaseApproved: false };
    fs.writeFileSync(path.join(directory, 'R8_UPDATE_COMMAND.txt'), command, { flag: 'wx' });
    fs.writeFileSync(path.join(directory, 'command-preparation.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    return report;
}
module.exports = { build, finalize, configFor, validateConfig, render, commandFor, BASELINE, PUBLIC_KEY_SHA256, ARCHIVE, SOURCE_PATHS, HELPERS, SUPERVISOR };
if (require.main === module) {
    try {
        const args = process.argv.slice(2);
        const result = args.length === 2 && args[0] === '--output' ? build(args[1])
            : args.length === 4 && args[0] === '--finalize-command' && args[2] === '--entry-base-url'
                ? finalize({ directory: args[1], entryBaseUrl: args[3] }) : fail('R8_ENTRY_USAGE');
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } catch (error) { process.stderr.write((/^R8_ENTRY_[A-Z_]+$/.test(error?.code || '') ? error.code : 'R8_ENTRY_BUILD_FAILED') + '\n'); process.exitCode = 1; }
}
