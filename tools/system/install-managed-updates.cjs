'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited, sha256 } = require('../../runtime/release/bundle.cjs');
const { privateWrite } = require('./install-host.cjs');
const { publicKey, fail } = require('../../runtime/updates/channel.cjs');
const UNIT = 'nexowatt-eos-updates.service';
function installManagedUpdates({ releaseId, publicKeySha256 }, { root = '/', owner = rootOwned } = {}) {
    if (process.getuid?.() !== 0 || !/^[a-f0-9]{64}$/.test(releaseId || '') || !/^[a-f0-9]{64}$/.test(publicKeySha256 || '')) fail('UPDATE_INSTALL_INPUT');
    const at = name => path.join(root, name);
    const release = at('/opt/nexowatt/eos/releases/' + releaseId);
    for (const name of [release, at('/etc/nexowatt-eos'), at('/etc/systemd/system'), at('/var/lib')]) owner(name);
    for (const name of ['/var/lib/nexowatt-eos-updates', '/etc/nexowatt-eos/update-trust.pem', '/etc/systemd/system/' + UNIT])
        if (fs.existsSync(at(name)) || fs.existsSync(path.dirname(at(name))) && fs.lstatSync(path.dirname(at(name))).isSymbolicLink()) fail('UPDATE_INSTALL_EXISTS');
    const keyFile = at('/opt/nexowatt/eos/verified/' + releaseId + '/release-public.pem'); owner(keyFile);
    const key = readFileLimited(keyFile, 16384).bytes; publicKey(key);
    if (sha256(key) !== publicKeySha256) fail('UPDATE_TRUST');
    const templateFile = path.join(release, 'system/managed-test', UNIT); owner(templateFile);
    const template = readFileLimited(templateFile, 16384).bytes.toString('utf8');
    if (template.split('@RELEASE_ID@').length !== 3) fail('UPDATE_INSTALL_TEMPLATE');
    privateWrite(at('/etc/nexowatt-eos/update-trust.pem'), key, 0o644);
    fs.mkdirSync(at('/var/lib/nexowatt-eos-updates'), { mode: 0o700 });
    fs.mkdirSync(at('/var/lib/nexowatt-eos-updates/jobs'), { mode: 0o700 });
    privateWrite(at('/etc/systemd/system/' + UNIT), template.replaceAll('@RELEASE_ID@', releaseId), 0o644);
    return { installed: true, started: false, unit: UNIT };
}
module.exports = { installManagedUpdates, UNIT };
