'use strict';
// Build-only TEST signing. The ephemeral Ed25519 private KeyObject never leaves
// memory. POSIX modes belong to the authenticated archive, not the Windows host.
// The Linux installer and its strict filesystem verification are unchanged.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const bundle = require('../../runtime/release/bundle.cjs');
const { validatePayload } = require('../system/build-bundle.cjs');
const PYTHON = process.platform === 'win32' ? 'python' : '/usr/bin/python3';
const HELPER = path.join(__dirname, 'test-archive.py');
const MODE_POLICY = 'eos-test-static-executables-755-others-644-v1';
const fail = code => { throw Object.assign(new Error(code), { code }); };

function validateArchiveProfile(metadata) {
    if (metadata.profile !== 'test' || metadata.nodeVersion !== '24.21.0' ||
        !Array.isArray(metadata.platforms) || metadata.platforms.length !== 1 ||
        !['linux-arm64', 'linux-x64'].includes(metadata.platforms[0])) fail('TEST_ARCHIVE_PROFILE');
}
function canonicalInventory(files, metadata, architectureReports) {
    validateArchiveProfile(metadata);
    if (!Array.isArray(architectureReports) || architectureReports.length !== 1) fail('TEST_ARCHIVE_ARCHITECTURE');
    const report = architectureReports[0];
    if (!report || report.schemaVersion !== 1 || report.kind !== 'eos-runtime-architecture-static-check' ||
        report.platform !== metadata.platforms[0] || report.target?.nodeVersion !== metadata.nodeVersion ||
        report.passed !== true || report.executedTargetCode !== false || report.hardwareQualified !== false ||
        !Array.isArray(report.nativeFiles)) fail('TEST_ARCHIVE_ARCHITECTURE');
    const byPath = new Map(files.map(row => [row.path, row]));
    if (report.packageJsonSha256 !== byPath.get('app/package.json')?.sha256 ||
        report.packageLockSha256 !== byPath.get('app/package-lock.json')?.sha256) fail('TEST_ARCHIVE_CHANGED');
    const executablePaths = [];
    for (const native of report.nativeFiles) {
        const relative = `app/${bundle.safeRelative(native.path)}`, file = byPath.get(relative);
        if (!file || file.size !== native.bytes || file.sha256 !== native.sha256) fail('TEST_ARCHIVE_CHANGED');
        if (native.disposition === 'target-static-native-executable') executablePaths.push(relative);
    }
    const executables = new Set(executablePaths);
    // Script entry points use fixed /usr/bin/node or /usr/bin/python3 commands.
    // .node libraries and other-runtime assets do not receive execute bits.
    return { files: files.map(row => ({ ...row, mode: executables.has(row.path) ? 0o755 : 0o644 })),
        executablePaths: executablePaths.sort(), modePolicy: MODE_POLICY };
}
function python(args) {
    const result = spawnSync(PYTHON, ['-I', '-B', HELPER, ...args], { shell: false, encoding: 'utf8',
        timeout: 20 * 60 * 1000, maxBuffer: 3 * bundle.LIMITS.manifestBytes, windowsHide: true });
    if (result.error?.code === 'ETIMEDOUT') fail('TEST_ARCHIVE_TIMEOUT');
    if (result.error || result.status !== 0) fail('TEST_ARCHIVE_IO');
    try { return JSON.parse(result.stdout); } catch { fail('TEST_ARCHIVE_RESPONSE'); }
}
function verifyTestArchive({ archivePath, publicKey, expectedReleaseId, platform, nodeVersion = '24.21.0' }) {
    bundle.validatePublicKey(publicKey);
    const observed = python(['verify', path.resolve(archivePath)]);
    if (observed.schemaVersion !== 1 || observed.kind !== 'eos-test-archive-readback' || observed.passed !== true ||
        observed.regularFiles < 3 || !/^[a-f0-9]{64}$/.test(observed.archiveSha256 || '')) fail('TEST_ARCHIVE_RESPONSE');
    const bytes = Buffer.from(observed.manifestBase64 || '', 'base64');
    const signature = Buffer.from(observed.signatureBase64 || '', 'base64');
    if (bytes.length > bundle.LIMITS.manifestBytes || signature.length !== 64 ||
        !crypto.verify(null, bytes, crypto.createPublicKey(publicKey), signature)) fail('TEST_ARCHIVE_SIGNATURE');
    let manifest;
    try { manifest = JSON.parse(bytes); } catch { fail('TEST_ARCHIVE_MANIFEST'); }
    bundle.validateManifest(manifest);
    const releaseId = bundle.sha256(bytes);
    if ((expectedReleaseId && releaseId !== expectedReleaseId) ||
        (platform && !manifest.platforms.includes(platform)) || manifest.nodeVersion !== nodeVersion ||
        observed.regularFiles !== manifest.files.length + 2) fail('TEST_ARCHIVE_BINDING');
    return { releaseId, manifest, archiveSha256: observed.archiveSha256, archiveBytes: observed.archiveBytes,
        archiveReadbackVerified: true, targetExecutionPerformed: false };
}
function createTestArchive({ payloadDirectory, archivePath, publicKeyPath, metadata }) {
    const payload = bundle.trustedDirectory(payloadDirectory);
    const archive = path.resolve(archivePath), publicFile = path.resolve(publicKeyPath);
    const parent = bundle.trustedDirectory(path.dirname(archive));
    bundle.trustedDirectory(path.dirname(publicFile));
    if (archive === publicFile || archive === payload || archive.startsWith(payload + path.sep) ||
        publicFile.startsWith(payload + path.sep) || fs.existsSync(archive) || fs.existsSync(publicFile)) fail('TEST_ARCHIVE_OUTPUT');
    validateArchiveProfile(metadata);
    const files = bundle.inventory(payload);
    const provisional = bundle.validateManifest({ ...metadata, files });
    // validatePayload performs its own mandatory native scan once per platform.
    // Reports are produced inside that validator, never supplied by the caller.
    const validated = validatePayload(payload, provisional);
    const canonical = canonicalInventory(files, metadata, validated?.architectureReports);
    const manifest = bundle.validateManifest({ ...metadata, files: canonical.files });
    // Re-read every byte and reject changes during validation. Native headers do
    // not need another scan: report digests bind them to this same inventory.
    const content = rows => rows.map(({ path, size, sha256 }) => ({ path, size, sha256 }));
    if (JSON.stringify(content(bundle.inventory(payload))) !== JSON.stringify(content(files))) fail('TEST_ARCHIVE_CHANGED');
    const bytes = Buffer.from(JSON.stringify(manifest) + '\n');
    if (bytes.length > bundle.LIMITS.manifestBytes) fail('TEST_ARCHIVE_SIZE');
    let signing = crypto.generateKeyPairSync('ed25519');
    const publicKey = signing.publicKey.export({ type: 'spki', format: 'pem' });
    const signature = crypto.sign(null, bytes, signing.privateKey);
    signing = undefined; // JS/OS memory erasure is not claimed.
    const scratch = fs.mkdtempSync(path.join(parent, '.eos-test-archive-'));
    try {
        // Only public manifest and signature are exchanged with Python.
        const input = path.join(scratch, 'public-archive-input.json');
        fs.writeFileSync(input, JSON.stringify({ schemaVersion: 1,
            manifestBase64: bytes.toString('base64'), signatureBase64: signature.toString('base64') }), { flag: 'wx' });
        python(['create', payload, input, archive]);
        const result = verifyTestArchive({ archivePath: archive, publicKey,
            expectedReleaseId: bundle.sha256(bytes), platform: metadata.platforms[0], nodeVersion: metadata.nodeVersion });
        fs.writeFileSync(publicFile, publicKey, { flag: 'wx', mode: 0o644 });
        return { ...result, signingPublicKeySha256: bundle.sha256(publicKey),
            modePolicy: canonical.modePolicy, executablePaths: canonical.executablePaths,
            signing: 'ephemeral-ed25519-keyobject-memory-only', privateKeyPersisted: false };
    } finally {
        const resolvedScratch = path.resolve(scratch);
        if (path.dirname(resolvedScratch) !== parent || !path.basename(resolvedScratch).startsWith('.eos-test-archive-')) fail('TEST_ARCHIVE_CLEANUP');
        fs.rmSync(resolvedScratch, { recursive: true, force: true });
    }
}
module.exports = { MODE_POLICY, canonicalInventory, verifyTestArchive, createTestArchive };
