'use strict';
// Root-only disposable GitHub fixture. It installs NO service and grants NO runtime sudo rights.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { copyVerifiedTree } = require('../../runtime/postgresql/integration.cjs');
const { NODE, STATE, MARKER, CURRENT, RELEASES, sha, contentRows, validatePreparation } = require('./fixture.cjs');
const REASONS = new Set(['ARGUMENTS', 'ROOT_UID', 'CI_CONTEXT', 'NODE_VERSION', 'LAB_ARGUMENTS', 'LAB_OWNER', 'LAB_MODE',
    'EXISTING_EOS_PATH', 'OPT_OWNER', 'OPT_MODE', 'PREPARATION_FILE', 'PREPARATION_DIGEST', 'APP_FILE', 'COPIED_APP_DIGEST']);
const fail = reason => { throw Object.assign(new Error('R9_NATIVE_ROOT_FIXTURE_REJECTED'), { reason }); };
// Do not print arbitrary exception messages, paths, environment or prepared data.
const failureLine = error => `R9_NATIVE_ROOT_FIXTURE_REJECTED:${REASONS.has(error?.reason) ? error.reason : 'UNEXPECTED'}\n`;
function absent(file) { try { fs.lstatSync(file); fail('EXISTING_EOS_PATH'); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
function protectTree(directory) {
    for (const name of fs.readdirSync(directory)) {
        const file = path.join(directory, name), st = fs.lstatSync(file);
        if (st.isDirectory()) protectTree(file);
        else if (st.isFile() && st.nlink === 1) { fs.chownSync(file, 0, 0); fs.chmodSync(file, st.mode & 0o111 ? 0o555 : 0o444); }
        else fail('APP_FILE');
    }
    fs.chownSync(directory, 0, 0); fs.chmodSync(directory, 0o555);
}
function prepare(root, uidText, gidText) {
    if (process.getuid?.() !== 0) fail('ROOT_UID');
    if (process.env.GITHUB_ACTIONS !== 'true' || process.env.EOS_DISPOSABLE_R9_LAB !== '1'
        || process.env.EOS_DISPOSABLE_MANAGEMENT_LAB !== '1') fail('CI_CONTEXT');
    if (process.versions.node !== NODE) fail('NODE_VERSION');
    if (!/^[1-9][0-9]{0,8}$/.test(uidText || '') || !/^[1-9][0-9]{0,8}$/.test(gidText || '')
        || !path.isAbsolute(root || '') || fs.realpathSync(root) !== root) fail('LAB_ARGUMENTS');
    const st = fs.lstatSync(root), uid = Number(uidText), gid = Number(gidText);
    if (!st.isDirectory() || st.uid !== uid || st.gid !== gid) fail('LAB_OWNER');
    if ((st.mode & 0o777) !== 0o700) fail('LAB_MODE');
    absent('/opt/nexowatt'); absent('/etc/nexowatt-eos'); absent('/var/lib/nexowatt-eos');
    const opt = fs.lstatSync('/opt');
    if (!opt.isDirectory() || opt.isSymbolicLink() || opt.uid !== 0) fail('OPT_OWNER');
    if (opt.mode & 0o022) fail('OPT_MODE');
    const input = path.join(root, 'r9-native-prepared.json'), inputStat = fs.lstatSync(input);
    if (!inputStat.isFile() || inputStat.uid !== uid || inputStat.nlink !== 1 || (inputStat.mode & 0o777) !== 0o600) fail('PREPARATION_FILE');
    const prepared = validatePreparation(JSON.parse(fs.readFileSync(input)), root);
    if (sha(JSON.stringify(contentRows(prepared.app))) !== prepared.appContentSha256) fail('PREPARATION_DIGEST');
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
        if (sha(JSON.stringify(contentRows(app))) !== prepared.appContentSha256) fail('COPIED_APP_DIGEST');
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
module.exports = { prepare, failureLine };
if (require.main === module) {
    try { if (process.argv.length !== 5) fail('ARGUMENTS'); prepare(...process.argv.slice(2)); }
    catch (error) { process.stderr.write(failureLine(error)); process.exitCode = 1; }
}
