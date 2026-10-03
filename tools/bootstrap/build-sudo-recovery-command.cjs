'use strict';
// Separate, narrowly scoped recovery entry. Published r3 installer bytes stay fixed.
const fs = require('node:fs');
const path = require('node:path');
const { identity, installCommand } = require('./build-github-download.cjs');
const { readFileLimited, trustedDirectory } = require('../../runtime/release/bundle.cjs');
const ROOT = path.resolve(__dirname, '../..');
const OUTPUT = 'delivery/recovery-sudo-r2-20261003';
const DRIVER = Object.freeze({ blob: 'ea168948332e365f59c1798a79d8439863b8e098',
    sha256: '89194c388e023bad6dca7347a132d24f45927d3710a635cf7ba9e4ea491177c6', bytes: 14631 });
const MANIFEST = Object.freeze({ blob: '03a04702f31571814021f3de5ebd0586859c1404',
    sha256: '3fe525dbcca620709e7767e6d474842650b50406d3a0ae8ae2a4aedd82b7ad2b', bytes: 1059 });
function reject(code) { throw Object.assign(new Error(code), { code }); }
function renderRecoveryCommand(helper) {
    if (!helper || !/^[a-f0-9]{40}$/.test(helper.blob || '') ||
        !/^[a-f0-9]{64}$/.test(helper.sha256 || '') || !Number.isSafeInteger(helper.bytes) ||
        helper.bytes < 1 || helper.bytes > 1024 * 1024) reject('RECOVERY_COMMAND_PIN');
    const base = installCommand(DRIVER, MANIFEST);
    const marker = 'exec 3< <(printf';
    if (base.split(marker).length !== 2) reject('RECOVERY_COMMAND_BASE');
    const block = `printf 'header = "Authorization: Bearer %s"\\n' "$eos_token" | /usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/curl -q --config - --proto =https --tlsv1.2 --fail --silent --show-error --connect-timeout 20 --max-time 120 --max-filesize ${helper.bytes} --header 'Accept: application/vnd.github.raw+json' --header 'X-GitHub-Api-Version: 2022-11-28' 'https://api.github.com/repos/NexoWatt/nexowatt-eos/git/blobs/${helper.blob}' -o "$eos_stage/recover-sudo-abort.py"
printf '%s  %s\\n' '${helper.sha256}' "$eos_stage/recover-sudo-abort.py" | /usr/bin/sha256sum --check --status
/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/python3 -I -B "$eos_stage/recover-sudo-abort.py" --recover
`;
    return base.replace('# EOS_GITHUB_BOOTSTRAP_VERSION=2026-10-03',
        '# EOS_GITHUB_BOOTSTRAP_VERSION=2026-10-03\n# EOS_SUDO_ABORT_RECOVERY_VERSION=2026-10-03')
        .replace(marker, block + marker) + '\n';
}
function build() {
    const output = path.join(ROOT, OUTPUT);
    trustedDirectory(path.dirname(output));
    if (fs.existsSync(output)) reject('RECOVERY_COMMAND_FRESH_OUTPUT');
    const base = path.join(ROOT, 'delivery/bootstrap-test3-r3');
    for (const [name, pin] of [['github-download.py', DRIVER], ['github-manifest.json', MANIFEST]]) {
        if (JSON.stringify(identity(readFileLimited(path.join(base, name)).bytes)) !== JSON.stringify(pin))
            reject('RECOVERY_COMMAND_BASE_CHANGED');
    }
    if (readFileLimited(path.join(base, 'INSTALL_COMMAND.txt')).bytes.toString() !== installCommand(DRIVER, MANIFEST) + '\n')
        reject('RECOVERY_COMMAND_BASE_CHANGED');
    const bytes = readFileLimited(path.join(ROOT, 'tools/bootstrap/recover-sudo-abort.py'), 1024 * 1024).bytes;
    const helper = identity(bytes), command = Buffer.from(renderRecoveryCommand(helper));
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, 'recover-sudo-abort.py'), bytes, { flag: 'wx' });
    fs.writeFileSync(path.join(output, 'INSTALL_COMMAND.txt'), command, { flag: 'wx' });
    const report = { schemaVersion: 1, kind: 'eos-r2-sudo-abort-recovery-entry', helper,
        command: identity(command), driver: DRIVER, manifest: MANIFEST,
        source: 'tools/bootstrap/recover-sudo-abort.py', nextBootstrap: 'delivery/bootstrap-test3-r3',
        originalReleaseId: 'f8791884897defb86c07bd58114ef3df4abf5c9bda053694e4406d6ac7e779ef',
        preservedUid: 999, preservedGid: 985, automaticRollback: false,
        tokenStored: false, targetRecoveryExecuted: false, targetInstallationExecuted: false,
        hardwareAcceptance: 'OPEN', published: false };
    fs.writeFileSync(path.join(output, 'preparation.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    return report;
}
module.exports = { renderRecoveryCommand, build, OUTPUT, DRIVER, MANIFEST };
if (require.main === module) {
    try {
        if (process.argv.length !== 2) reject('RECOVERY_COMMAND_USAGE');
        console.log(JSON.stringify(build(), null, 2));
    } catch (error) {
        console.error(JSON.stringify({ ok: false, code: /^RECOVERY_COMMAND_[A-Z_]+$/.test(error.code || '') ?
            error.code : 'RECOVERY_COMMAND_BUILD_FAILED' }));
        process.exitCode = 1;
    }
}
