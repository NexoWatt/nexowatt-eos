'use strict';
// Node is part of the signed release payload. Version ranges below constrain
// manufacturer-authorized packages; they never authorize a download by themselves.
const fs = require('node:fs');
const path = require('node:path');
const { readFileLimited, sha256 } = require('../release/bundle.cjs');
const BASELINE_VERSION = '24.22.1';
const MINIMUM_VERSION = BASELINE_VERSION;
const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const BINARY = 'node-runtime/bin/node';
const DESCRIPTOR = 'node-runtime/runtime.json';
const LICENSE = 'node-runtime/LICENSE';
const fail = code => { throw Object.assign(new Error(code), { code }); };
function versionParts(version) {
    if (typeof version !== 'string' || !/^24\.(0|[1-9][0-9]{0,3})\.(0|[1-9][0-9]{0,3})$/.test(version)) return null;
    return version.split('.').map(Number);
}
function compareVersions(a, b) {
    const left = versionParts(a), right = versionParts(b);
    if (!left || !right) fail('UPDATE_RUNTIME_VERSION');
    for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
    return 0;
}
function supportedVersion(version) {
    return versionParts(version) !== null && compareVersions(version, MINIMUM_VERSION) >= 0;
}
function validateVersion(version) {
    if (!supportedVersion(version)) fail('UPDATE_RUNTIME_VERSION');
    return version;
}
function assertTransition(previous, next) {
    validateVersion(previous); validateVersion(next);
    if (compareVersions(next, previous) < 0) fail('UPDATE_RUNTIME_DOWNGRADE');
    return next;
}
function validateRuntime(payloadDirectory, manifest) {
    validateVersion(manifest?.nodeVersion);
    const rows = manifest?.files;
    if (!Array.isArray(rows)) fail('UPDATE_RUNTIME_BINDING');
    const runtimeRows = rows.filter(row => row.path.startsWith('node-runtime/'));
    if (runtimeRows.length !== 3 || runtimeRows.map(row => row.path).sort().join('|') !== [BINARY, DESCRIPTOR, LICENSE].sort().join('|')) fail('UPDATE_RUNTIME_BINDING');
    const descriptorRow = runtimeRows.find(row => row.path === DESCRIPTOR), binaryRow = runtimeRows.find(row => row.path === BINARY);
    const descriptorBytes = readFileLimited(path.join(payloadDirectory, DESCRIPTOR), 4096).bytes;
    let descriptor;
    try { descriptor = JSON.parse(descriptorBytes); } catch { fail('UPDATE_RUNTIME_DESCRIPTOR'); }
    if (!descriptor || Array.isArray(descriptor) || Object.keys(descriptor).sort().join('|') !==
        ['schemaVersion', 'version', 'platform', 'archiveSha256', 'binarySha256', 'licenseSha256'].sort().join('|') ||
        descriptor.schemaVersion !== 1 || descriptor.version !== manifest.nodeVersion || descriptor.platform !== 'linux-arm64' ||
        !/^[a-f0-9]{64}$/.test(descriptor.archiveSha256 || '') || !/^[a-f0-9]{64}$/.test(descriptor.binarySha256 || '') || !/^[a-f0-9]{64}$/.test(descriptor.licenseSha256 || '') ||
        descriptorRow.mode !== 0o644 || descriptorRow.size !== descriptorBytes.length || descriptorRow.sha256 !== sha256(descriptorBytes)) fail('UPDATE_RUNTIME_DESCRIPTOR');
    const file = path.join(payloadDirectory, BINARY), binary = readFileLimited(file, 128 * 1024 * 1024).bytes;
    const stat = fs.lstatSync(file);
    if ((stat.mode & 0o7777) !== 0o755 || binaryRow.mode !== 0o755 || binaryRow.size !== binary.length ||
        binaryRow.sha256 !== descriptor.binarySha256 || sha256(binary) !== descriptor.binarySha256 ||
        binary.length < 64 || binary.subarray(0, 4).toString('hex') !== '7f454c46' || binary[4] !== 2 || binary[5] !== 1 ||
        ![2, 3].includes(binary.readUInt16LE(16)) || binary.readUInt16LE(18) !== 183) fail('UPDATE_RUNTIME_BINARY');
    const license = readFileLimited(path.join(payloadDirectory, LICENSE), 2 * 1024 * 1024).bytes;
    const licenseRow = runtimeRows.find(row => row.path === LICENSE);
    if (!license.length || licenseRow.mode !== 0o644 || licenseRow.size !== license.length ||
        licenseRow.sha256 !== descriptor.licenseSha256 || sha256(license) !== descriptor.licenseSha256) fail('UPDATE_RUNTIME_LICENSE');
    return descriptor;
}
module.exports = { BASELINE_VERSION, MINIMUM_VERSION, MAX_ARCHIVE_BYTES, BINARY, DESCRIPTOR, LICENSE,
    supportedVersion, validateVersion, compareVersions, assertTransition, validateRuntime };
