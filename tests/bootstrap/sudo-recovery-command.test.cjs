'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { renderRecoveryCommand, DRIVER, MANIFEST } = require('../../tools/bootstrap/build-sudo-recovery-command.cjs');
const { identity, installCommand } = require('../../tools/bootstrap/build-github-download.cjs');
const pin = identity(Buffer.from('# fixture only\n'));
test('recovery is hash checked before execution, before token FD, and gates the unchanged installer', () => {
    const command = renderRecoveryCommand(pin);
    const recovery = '/usr/bin/env -i PATH="$PATH" LC_ALL=C /usr/bin/python3 -I -B "$eos_stage/recover-sudo-abort.py" --recover';
    const hash = `printf '%s  %s\\n' '${pin.sha256}' "$eos_stage/recover-sudo-abort.py" | /usr/bin/sha256sum --check --status`;
    assert.ok(command.includes(hash));
    assert.ok(command.indexOf(hash) < command.indexOf(recovery));
    assert.ok(command.indexOf(recovery) < command.indexOf('exec 3<'));
    assert.match(command, /set -euo pipefail/);
    assert.ok(command.endsWith(installCommand(DRIVER, MANIFEST).slice(installCommand(DRIVER, MANIFEST).indexOf('exec 3<')) + '\n'));
    assert.equal((command.match(/read -r -s -p/g) || []).length, 1);
    assert.ok(command.indexOf('unset eos_token', command.indexOf('exec 3<')) < command.lastIndexOf('exec /usr/bin/env'));
});
test('both downloads keep fixed HTTPS API host, no redirects and authorization only via stdin', () => {
    const lines = renderRecoveryCommand(pin).split('\n').filter(line => line.includes('/usr/bin/curl'));
    assert.equal(lines.length, 3); // executable prerequisite plus two invocations
    for (const line of lines.slice(1)) {
        assert.match(line, /\| \/usr\/bin\/env -i PATH="\$PATH" LC_ALL=C \/usr\/bin\/curl -q --config - --proto =https --tlsv1\.2 --fail/);
        assert.match(line, /https:\/\/api\.github\.com\/repos\/NexoWatt\/nexowatt-eos\/git\/blobs\/[a-f0-9]{40}'/);
        assert.doesNotMatch(line, /--location|--insecure| -k | -L |--user /);
    }
});
for (const value of [null, { ...pin, blob: "'$(id)" }, { ...pin, sha256: 'z'.repeat(64) },
    { ...pin, bytes: 0 }, { ...pin, bytes: -1 }, { ...pin, bytes: 1.5 }, { ...pin, bytes: 1024 * 1024 + 1 }]) {
    test(`reject unsafe recovery pin ${JSON.stringify(value)}`, () => {
        assert.throws(() => renderRecoveryCommand(value), { code: 'RECOVERY_COMMAND_PIN' });
    });
}
test('continuation pins still identify the actual published r3 files and exact copy command', () => {
    const root = path.resolve(__dirname, '../../delivery/bootstrap-test3-r3');
    assert.deepEqual(identity(fs.readFileSync(path.join(root, 'github-download.py'))), DRIVER);
    assert.deepEqual(identity(fs.readFileSync(path.join(root, 'github-manifest.json'))), MANIFEST);
    assert.equal(fs.readFileSync(path.join(root, 'INSTALL_COMMAND.txt'), 'utf8'), installCommand(DRIVER, MANIFEST) + '\n');
});
