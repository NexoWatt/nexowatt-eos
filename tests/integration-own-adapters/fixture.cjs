'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inventoryTree } = require('../../runtime/postgresql/integration.cjs');
const NODE = '24.21.0';
const BASE_RELEASE_ID = '97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000';
const STATE = '/etc/nexowatt-eos/release-state.json';
const MARKER = '/etc/nexowatt-eos/own-adapters-native-lab.json';
const CURRENT = '/opt/nexowatt/eos/current';
const RELEASES = '/opt/nexowatt/eos/releases';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const contentRows = app => inventoryTree(app).map(row => {
    if (row.type !== 'file') fail('OWN_NATIVE_APP_FILE');
    return { path: row.path, size: row.size, sha256: row.sha256 };
}).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
function validatePreparation(value, root) {
    if (!value || value.schemaVersion !== 1 || value.kind !== 'unsigned-own-adapters-native-preparation' || value.signed !== false || value.unsignedFixture !== true
        || value.sequence !== 13 || value.nodeVersion !== NODE || value.app !== path.join(root, 'own-adapters-build/app')
        || !/^[a-f0-9]{40}$/.test(value.sourceCommit || '') || !/^[a-f0-9]{64}$/.test(value.appContentSha256 || '')
        || value.baselineApp !== path.join(root, 'own-adapters-build/baseline') || !/^[a-f0-9]{64}$/.test(value.baselineContentSha256 || '')
        || value.previousSignatureVerified !== true || value.previousReleaseId !== BASE_RELEASE_ID) fail('OWN_NATIVE_PREPARATION');
    return value;
}
function protectedJson(file) {
    const st = fs.lstatSync(file);
    if (!st.isFile() || st.isSymbolicLink() || st.uid !== 0 || st.nlink !== 1 || (st.mode & 0o022) || st.size > 65536) fail('OWN_NATIVE_PROTECTED_METADATA');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function loadFixture(root, uid) {
    const marker = protectedJson(MARKER), state = protectedJson(STATE);
    if (marker.kind !== 'unsigned-own-adapters-native-fixed-fixture' || marker.signed !== false || marker.unsignedFixture !== true || marker.root !== root
        || marker.uid !== uid || marker.sequence !== 13 || marker.nodeVersion !== NODE
        || !/^[a-f0-9]{64}$/.test(marker.releaseId || '') || !/^[a-f0-9]{64}$/.test(marker.appContentSha256 || '')
        || !/^[a-f0-9]{40}$/.test(marker.sourceCommit || '')) fail('OWN_NATIVE_FIXED_FIXTURE');
    const release = path.join(RELEASES, marker.releaseId), app = path.join(release, 'app');
    const pointer = fs.lstatSync(CURRENT);
    if (!pointer.isSymbolicLink() || pointer.uid !== 0 || fs.readlinkSync(CURRENT) !== release
        || state.releaseId !== marker.releaseId || state.sequence !== 13 || state.nodeVersion !== NODE || state.profile !== 'test') fail('OWN_NATIVE_FIXED_FIXTURE');
    if (sha(JSON.stringify(contentRows(app))) !== marker.appContentSha256) fail('OWN_NATIVE_APP_CHANGED');
    const baselineApp = path.join(release, 'baseline');
    if (sha(JSON.stringify(contentRows(baselineApp))) !== marker.baselineContentSha256) fail('OWN_NATIVE_BASELINE_CHANGED');
    return { ...marker, app, baselineApp };
}
module.exports = { NODE, BASE_RELEASE_ID, STATE, MARKER, CURRENT, RELEASES, sha, contentRows, validatePreparation, loadFixture };
