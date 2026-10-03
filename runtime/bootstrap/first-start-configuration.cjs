#!/usr/bin/env node
'use strict';
// The browser can propose only a signed token or an explicit unlicensed mode.
// Root selects identity/trust and stages the token; this fixed runtime-UID helper
// alone writes the existing Admin encrypted store. Neither step grants control.
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { rootOwned, checkInstalled } = require('../release/installed-check.cjs');
const TRANSFER = '/etc/nexowatt-eos/first-start-license.json';
const IDENTITY = '/etc/nexowatt-eos/license-device.json';
const TRUST = '/etc/nexowatt-eos/license-trust.json';
const DATA = '/var/lib/nexowatt-eos/iobroker-data';
const STORE = DATA + '/eos-admin.0/licensing';
const MAX_TRANSFER = 20000;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function selectionShape(selection) {
    if (!exact(selection, ['mode', 'token']) || !['activate', 'unlicensed'].includes(selection.mode) ||
        typeof selection.token !== 'string' || Buffer.byteLength(selection.token, 'utf8') > 16384 ||
        (selection.mode === 'unlicensed' ? selection.token !== '' : !selection.token)) fail('FIRST_START_LICENSE_SELECTION');
}

function validateLicenseSelection(selection, { uuid, publicKeys, now = Date.now(), core } = {}) {
    selectionShape(selection);
    const normalized = core.normalizeUuid(uuid);
    if (selection.mode === 'unlicensed') return Object.freeze({ mode: 'unlicensed', valid: false,
        code: 'LICENSE_MISSING', uuid: normalized, edition: null, scope: null, expiresAt: null,
        limits: null, features: Object.freeze([]), adapters: Object.freeze([]) });
    const claims = core.verifyLicense(selection.token, { uuid: normalized, publicKeys, now });
    if (!['system', 'adapters'].includes(claims.scope)) fail('FIRST_START_LICENSE_SCOPE');
    return Object.freeze({ mode: 'activate', valid: true, code: 'LICENSE_VALID', uuid: normalized,
        edition: claims.edition, scope: claims.scope, expiresAt: claims.expiresAt, limits: Object.freeze({ ...claims.limits }),
        features: Object.freeze([...claims.features]), adapters: Object.freeze([...claims.adapters]) });
}

async function loadInstalledLicense(app) {
    if (typeof app !== 'string' || !path.isAbsolute(app) || fs.realpathSync(app) !== app) fail('FIRST_START_LICENSE_MODULE');
    const directory = path.join(app, 'node_modules/iobroker.eos-admin/build/lib');
    const coreFile = path.join(directory, 'eosLicenseCore.js'), serviceFile = path.join(directory, 'eosLicenseService.js');
    rootOwned(coreFile); rootOwned(serviceFile);
    const core = require(coreFile), service = require(serviceFile);
    return { core, publicKeys: await service.readTrustFile(TRUST) };
}

function runtimeIdentity() {
    if (process.platform !== 'linux') fail('FIRST_START_LICENSE_PLATFORM');
    const users = fs.readFileSync('/etc/passwd', 'utf8').split('\n').filter(line => line.startsWith('eos-runtime:'));
    const groups = fs.readFileSync('/etc/group', 'utf8').split('\n').filter(line => line.startsWith('eos-runtime:'));
    if (users.length !== 1 || groups.length !== 1) fail('FIRST_START_LICENSE_OWNER');
    const fields = users[0].split(':'), group = groups[0].split(':');
    if (![fields[2], fields[3], group[2]].every(value => /^[1-9][0-9]*$/.test(value))) fail('FIRST_START_LICENSE_OWNER');
    const uid = Number(fields[2]), gid = Number(fields[3]);
    if (!Number.isSafeInteger(uid) || !Number.isSafeInteger(gid) || gid !== Number(group[2])) fail('FIRST_START_LICENSE_OWNER');
    return { uid, gid };
}

function assertTransferStat(stat, gid) {
    if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0 || stat.gid !== gid ||
        stat.nlink !== 1 || (stat.mode & 0o7777) !== 0o640 || stat.size > MAX_TRANSFER) fail('FIRST_START_LICENSE_TRANSFER');
}

function transferDescriptor(flags) {
    const { gid } = runtimeIdentity();
    rootOwned(path.dirname(TRANSFER));
    const before = fs.lstatSync(TRANSFER); assertTransferStat(before, gid);
    const fd = fs.openSync(TRANSFER, flags | fs.constants.O_NOFOLLOW);
    try {
        const current = fs.fstatSync(fd); assertTransferStat(current, gid);
        if (before.dev !== current.dev || before.ino !== current.ino) fail('FIRST_START_LICENSE_TRANSFER');
        return fd;
    } catch (error) { fs.closeSync(fd); throw error; }
}

function writeLicenseTransfer(selection, uuid) {
    if (process.getuid?.() !== 0) fail('FIRST_START_LICENSE_ROOT_REQUIRED');
    selectionShape(selection);
    // Identity is normalized by the verified installed Core before this call.
    if (selection.mode !== 'activate' || typeof uuid !== 'string' ||
        !/^(?:[a-z]{2})?[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(uuid)) fail('FIRST_START_LICENSE_TRANSFER');
    const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, uuid, license: selection }) + '\n');
    if (bytes.length > MAX_TRANSFER) fail('FIRST_START_LICENSE_TRANSFER');
    let fd;
    try {
        // Validate the existing installer-provisioned inode before truncating.
        fd = transferDescriptor(fs.constants.O_WRONLY);
        fs.ftruncateSync(fd, 0); fs.writeFileSync(fd, bytes); fs.fsyncSync(fd);
    } finally { bytes.fill(0); if (fd !== undefined) fs.closeSync(fd); }
}

function readLicenseTransfer() {
    const fd = transferDescriptor(fs.constants.O_RDONLY), bytes = Buffer.alloc(MAX_TRANSFER + 1);
    try {
        let total = 0;
        while (total < bytes.length) {
            const count = fs.readSync(fd, bytes, total, bytes.length - total, null);
            if (!count) break;
            total += count;
        }
        if (total > MAX_TRANSFER) fail('FIRST_START_LICENSE_TRANSFER');
        let record;
        try { record = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, total))); }
        catch { fail('FIRST_START_LICENSE_TRANSFER'); }
        if (!exact(record, ['schemaVersion', 'uuid', 'license']) || record.schemaVersion !== 1 ||
            typeof record.uuid !== 'string') fail('FIRST_START_LICENSE_TRANSFER');
        selectionShape(record.license);
        if (record.license.mode !== 'activate') fail('FIRST_START_LICENSE_TRANSFER');
        return record;
    } finally { bytes.fill(0); fs.closeSync(fd); }
}

async function persistLicense(selection, { uuid, publicKeys, core, directory = STORE, now = Date.now() } = {}) {
    const result = validateLicenseSelection(selection, { uuid, publicKeys, core, now });
    if (!result.valid) return result;
    const store = new core.EncryptedLicenseStore({ directory, uuid: result.uuid });
    await store.save({ token: selection.token, highWaterMark: now });
    const readback = await store.load();
    if (!readback || readback.token !== selection.token || readback.highWaterMark !== now) fail('FIRST_START_LICENSE_READBACK');
    return validateLicenseSelection({ mode: 'activate', token: readback.token }, { uuid, publicKeys, core, now });
}

async function main(argv = process.argv.slice(2)) {
    if (argv.length !== 1 || argv[0] !== '--import-license') fail('FIRST_START_LICENSE_USAGE');
    const owner = runtimeIdentity();
    if (process.getuid?.() !== owner.uid || process.getgid?.() !== owner.gid || process.env.IOBROKER_DATA_DIR !== DATA) fail('FIRST_START_LICENSE_OWNER');
    const releasePath = path.resolve(__dirname, '../..');
    if (fs.realpathSync('/opt/nexowatt/eos/current') !== releasePath) fail('FIRST_START_LICENSE_RELEASE');
    const installed = checkInstalled({ releasePath, evidencePath: path.join('/opt/nexowatt/eos/verified', path.basename(releasePath)) });
    rootOwned(IDENTITY);
    const { readFileLimited } = require('../release/bundle.cjs');
    const identity = JSON.parse(readFileLimited(IDENTITY, 1024).bytes);
    if (!exact(identity, ['schemaVersion', 'uuid', 'releaseId']) || identity.schemaVersion !== 1 ||
        identity.releaseId !== installed.releaseId) fail('FIRST_START_LICENSE_IDENTITY');
    const { core, publicKeys } = await loadInstalledLicense(path.join(releasePath, 'app'));
    const record = readLicenseTransfer();
    try {
        if (core.normalizeUuid(identity.uuid) !== identity.uuid || record.uuid !== identity.uuid) fail('FIRST_START_LICENSE_IDENTITY');
        const result = await persistLicense(record.license, { uuid: identity.uuid, publicKeys, core });
        // Exit success requires authenticated readback. Never log claims or token.
        return { ok: true, code: result.code, physicalControlEnabled: false };
    } finally { record.license.token = ''; }
}

module.exports = { validateLicenseSelection, loadInstalledLicense, writeLicenseTransfer, persistLicense,
    assertTransferStat, main, TRANSFER, IDENTITY, TRUST, STORE };
if (require.main === module) main().then(result => process.stdout.write(JSON.stringify(result) + '\n')).catch(() => {
    process.stderr.write('{"ok":false,"code":"FIRST_START_LICENSE_FAILED"}\n'); process.exitCode = 1;
});
