'use strict';
// Root-only disposable GitHub fixture. It installs NO service and grants NO runtime sudo rights.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { copyVerifiedTree } = require('../../runtime/postgresql/integration.cjs');
const { NODE, STATE, MARKER, CURRENT, RELEASES, sha, contentRows, validatePreparation } = require('./fixture.cjs');
const fail = () => { throw new Error('R9_NATIVE_ROOT_FIXTURE_REJECTED'); };
function absent(file) { try { fs.lstatSync(file); fail(); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
function protectTree(directory) {
    for (const name of fs.readdirSync(directory)) {
        const file = path.join(directory, name), st = fs.lstatSync(file);
        if (st.isDirectory()) protectTree(file);
        else if (st.isFile() && st.nlink === 1) { fs.chownSync(file, 0, 0); fs.chmodSync(file, st.mode & 0o111 ? 0o555 : 0o444); }
        else fail();
    }
    fs.chownSync(directory, 0, 0); fs.chmodSync(directory, 0o555);
}
function prepare(root, uidText, gidText) {
    if (process.getuid?.() !== 0 || process.env.GITHUB_ACTIONS !== 'true' || process.env.EOS_DISPOSABLE_R9_LAB !== '1'
        || process.env.EOS_DISPOSABLE_MANAGEMENT_LAB !== '1' || process.versions.node !== NODE) fail();
    if (!/^[1-9][0-9]{0,8}$/.test(uidText || '') || !/^[1-9][0-9]{0,8}$/.test(gidText || '')
        || !path.isAbsolute(root || '') || fs.realpathSync(root) !== root) fail();
    const st = fs.lstatSync(root), uid = Number(uidText), gid = Number(gidText);
    if (!st.isDirectory() || st.uid !== uid || st.gid !== gid || (st.mode & 0o777) !== 0o700) fail();
    absent('/opt/nexowatt'); absent('/etc/nexowatt-eos'); absent('/var/lib/nexowatt-eos');
    const opt = fs.lstatSync('/opt');
    if (!opt.isDirectory() || opt.isSymbolicLink() || opt.uid !== 0 || (opt.mode & 0o022)) fail();
    const input = path.join(root, 'r9-native-prepared.json'), inputStat = fs.lstatSync(input);
    if (!inputStat.isFile() || inputStat.uid !== uid || inputStat.nlink !== 1 || (inputStat.mode & 0o777) !== 0o600) fail();
    const prepared = validatePreparation(JSON.parse(fs.readFileSync(input)), root);
    if (sha(JSON.stringify(contentRows(prepared.app))) !== prepared.appContentSha256) fail();
    // Only fixed fresh directories and ephemeral trust are provisioned by the existing helper.
    require('../integration-management/prepare-fixed-root.cjs').prepare(root, uidText, gidText);
    const previousUmask = process.umask(0o022);
    try {
        const releaseId = crypto.randomBytes(32).toString('hex'); // Deliberately NOT a signed release identity.
        const release = path.join(RELEASES, releaseId), app = path.join(release, 'app');
        fs.mkdirSync(release, { recursive: true, mode: 0o755 });
        copyVerifiedTree(prepared.app, app);
        fs.mkdirSync(path.join(app, 'node_modules/iobroker.js-controller/tmp'), { recursive: true, mode: 0o755 });
        protectTree(app);
        if (sha(JSON.stringify(contentRows(app))) !== prepared.appContentSha256) fail();
        const trustBytes = fs.readFileSync('/etc/nexowatt-eos/license-trust.json');
        fs.writeFileSync(STATE, JSON.stringify({ schemaVersion: 1, releaseId, sequence: 12, nodeVersion: NODE,
            publicKeySha256: sha(trustBytes), profile: 'test' }) + '\n', { flag: 'wx', mode: 0o644 });
        fs.symlinkSync(release, CURRENT, 'dir');
        fs.writeFileSync(MARKER, JSON.stringify({ ...prepared, app: undefined,
            kind: 'unsigned-r9-native-fixed-fixture', root, uid, gid, releaseId,
            rootOwnedApp: true, signed: false, physicalAdaptersStarted: false }) + '\n', { flag: 'wx', mode: 0o644 });
        process.stdout.write('R9_NATIVE_UNSIGNED_FIXED_FIXTURE_READY\n');
    } finally { process.umask(previousUmask); }
}
module.exports = { prepare };
if (require.main === module) {
    try { if (process.argv.length !== 5) fail(); prepare(...process.argv.slice(2)); }
    catch { process.stderr.write('R9_NATIVE_ROOT_FIXTURE_REJECTED\n'); process.exitCode = 1; }
}
