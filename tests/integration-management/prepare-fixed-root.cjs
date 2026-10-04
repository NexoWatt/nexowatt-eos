'use strict';
// Only for a new disposable GitHub runner. Production paths are required by the
// signed appliance profile; no path override or permission bypass is installed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { provisionWeb } = require('../../runtime/transport/web-certificates.cjs');
const fail = () => { throw new Error('MANAGEMENT_FIXED_FIXTURE_REJECTED'); };
function prepare(root, uidText, gidText) {
    if (process.getuid?.() !== 0 || process.env.GITHUB_ACTIONS !== 'true' || process.env.EOS_DISPOSABLE_MANAGEMENT_LAB !== '1') fail();
    if (!/^[1-9][0-9]{0,8}$/.test(uidText || '') || !/^[1-9][0-9]{0,8}$/.test(gidText || '')) fail();
    const uid = Number(uidText), gid = Number(gidText);
    if (!path.isAbsolute(root) || fs.realpathSync(root) !== root) fail();
    const st = fs.lstatSync(root);
    if (!st.isDirectory() || st.uid !== uid || st.gid !== gid || (st.mode & 0o777) !== 0o700) fail();
    for (const directory of ['/etc/nexowatt-eos', '/var/lib/nexowatt-eos']) {
        try { fs.lstatSync(directory); fail(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    // The caller deliberately uses 0077. Public root-managed traversal and
    // trust files must remain readable by the runtime; private material below
    // retains its explicit 0700/0600 (or root:runtime 0640) modes.
    const previousUmask = process.umask(0o022);
    try {
    fs.mkdirSync('/etc/nexowatt-eos', { mode: 0o755 });
    fs.mkdirSync('/var/lib/nexowatt-eos', { mode: 0o755 });
    for (const name of ['iobroker-data', 'home']) {
        const directory = '/var/lib/nexowatt-eos/' + name;
        fs.mkdirSync(directory, { mode: 0o700 }); fs.chownSync(directory, uid, gid);
    }
    provisionWeb({ directory: '/etc/nexowatt-eos/web', hosts: ['localhost'] });
    for (const scope of ['admin', 'ui']) {
        const file = '/etc/nexowatt-eos/web/' + scope + '.key'; fs.chownSync(file, 0, gid); fs.chmodSync(file, 0o640);
    }
    // Ephemeral test issuer, trusted only on this disposable host. Actual NWL2
    // validation and encrypted storage execute with a real signature and UUID.
    const issuer = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync('/etc/nexowatt-eos/license-trust.json', JSON.stringify({ nativeManagementLab: issuer.publicKey.export({ format: 'pem', type: 'spki' }).toString() }) + '\n', { flag: 'wx', mode: 0o644 });
    const privateFile = path.join(root, 'ephemeral-license-issuer.pem');
    fs.writeFileSync(privateFile, issuer.privateKey.export({ format: 'pem', type: 'pkcs8' }), { flag: 'wx', mode: 0o600 });
    fs.chownSync(privateFile, uid, gid);
    fs.writeFileSync('/etc/nexowatt-eos/management-lab.json', JSON.stringify({ kind: 'disposable-native-management-lab', uid, gid, root }) + '\n', { flag: 'wx', mode: 0o644 });
    process.stdout.write('MANAGEMENT_FIXED_FIXTURE_READY\n');
    } finally { process.umask(previousUmask); }
}
module.exports = { prepare };
if (require.main === module) {
    try { if (process.argv.length !== 5) fail(); prepare(...process.argv.slice(2)); }
    catch { process.stderr.write('MANAGEMENT_FIXED_FIXTURE_REJECTED\n'); process.exitCode = 1; }
}
