'use strict';
// CI-only public transport readback and narrow publication guards. No push,
// token access, signing, Pi installation or runtime mutation occurs here.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { readFileLimited } = require('../../runtime/release/bundle.cjs');
const { configFor, commandFor, DELIVERY, OUTPUT, ARCHIVE } = require('./build-public-repair-entry.cjs');
const ROOT = path.resolve(__dirname, '../..');
const LIMIT = 100 * 1024 ** 2;
const STAGES = Object.freeze({ entry: ['repair.sh', 'preparation.json', 'remote-readback.json'],
    command: ['REPAIR_COMMAND.txt', 'command-verification.json'] });
const fail = () => { throw new Error('PUBLIC_REPAIR_PUBLICATION_REJECTED'); };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ bytes: bytes.length, sha256: sha(bytes) });
function commit(value) { if (!/^[a-f0-9]{40}$/.test(value || '')) fail(); return value; }
function git(root, args, maximum = 1024 ** 2) {
    const result = spawnSync('git', ['-C', root, ...args], { shell: false, timeout: 30000, maxBuffer: maximum, encoding: 'utf8' });
    if (result.error || result.status !== 0) fail();
    return result.stdout;
}
function compare(localFile, remoteFile, expected) {
    if (!expected || !Number.isSafeInteger(expected.bytes) || expected.bytes < 1 || expected.bytes > LIMIT ||
        !/^[a-f0-9]{64}$/.test(expected.sha256 || '')) fail();
    const local = readFileLimited(localFile, expected.bytes).bytes;
    const remote = readFileLimited(remoteFile, expected.bytes).bytes;
    if (local.length !== expected.bytes || remote.length !== expected.bytes || sha(local) !== expected.sha256 ||
        sha(remote) !== expected.sha256 || !local.equals(remote)) fail();
    return identity(remote);
}
function checkStage(root, stage, expectedHead) {
    commit(expectedHead);
    if (!Object.hasOwn(STAGES, stage) || git(root, ['rev-parse', 'HEAD']).trim() !== expectedHead) fail();
    const allowed = STAGES[stage].map(name => `${OUTPUT}/${name}`).sort();
    const rows = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).split('\0').filter(Boolean);
    if (rows.length !== allowed.length || rows.some(row => !row.startsWith('A  ')) ||
        JSON.stringify(rows.map(row => row.slice(3)).sort()) !== JSON.stringify(allowed)) fail();
    for (const file of allowed) {
        const index = git(root, ['ls-files', '--stage', '--', file]);
        if (!/^100644 [a-f0-9]{40} 0\t[^\n]+\n$/.test(index)) fail();
        readFileLimited(path.join(root, file), 1024 ** 2);
    }
    return { ok: true, stage, expectedHead, onlyNewFiles: allowed };
}
function readback(root, assetCommit) {
    commit(assetCommit);
    if (git(root, ['rev-parse', 'HEAD']).trim() !== assetCommit || git(root, ['diff', '--name-only']).trim() ||
        git(root, ['diff', '--cached', '--name-only']).trim()) fail();
    const delivery = path.join(root, DELIVERY);
    const metadata = readFileLimited(path.join(delivery, 'delivery.json'), 65536).bytes;
    const key = readFileLimited(path.join(delivery, 'release-public.pem'), 16384).bytes;
    const config = configFor(assetCommit, JSON.parse(metadata), key);
    const assets = [config.archive, config.key, { name: 'delivery.json', ...identity(metadata) }];
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r5-public-readback-'));
    const results = [];
    try {
        for (const asset of assets) {
            const output = path.join(scratch, asset.name);
            const url = `${config.baseUrl}/${asset.name}`;
            const result = spawnSync('/usr/bin/curl', ['-q', '--proto', '=https', '--tlsv1.2', '--fail', '--silent', '--show-error',
                '--connect-timeout', '20', '--max-time', '300', '--max-filesize', String(asset.bytes), url, '-o', output],
            { shell: false, timeout: 310000, maxBuffer: 65536, encoding: 'utf8' });
            if (result.error || result.status !== 0) fail();
            results.push({ name: asset.name, url, ...compare(path.join(delivery, asset.name), output, asset), exactBytesEqual: true });
        }
        const report = { schemaVersion: 1, kind: 'eos-r5-public-asset-readback', assetCommit,
            repository: 'NexoWatt/nexowatt-eos', checkedAt: new Date().toISOString(),
            releaseId: config.releaseId, assets: results, allExactBytesEqual: true,
            publicHttpsDownloadExecuted: true, redirectsAllowed: false,
            targetRepairExecuted: false, productionReleaseApproved: false };
        fs.writeFileSync(path.join(root, OUTPUT, 'remote-readback.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
        return report;
    } finally {
        if (path.dirname(scratch) !== os.tmpdir() || !path.basename(scratch).startsWith('eos-r5-public-readback-')) fail();
        fs.rmSync(scratch, { recursive: true, force: true });
    }
}
function commandReport(root, entryCommit) {
    commit(entryCommit);
    if (git(root, ['rev-parse', 'HEAD']).trim() !== entryCommit || git(root, ['diff', '--name-only']).trim() ||
        git(root, ['diff', '--cached', '--name-only']).trim()) fail();
    const script = readFileLimited(path.join(root, OUTPUT, 'repair.sh'), 1024 ** 2).bytes;
    const committed = Buffer.from(git(root, ['show', `${entryCommit}:${OUTPUT}/repair.sh`]));
    const preparation = JSON.parse(readFileLimited(path.join(root, OUTPUT, 'preparation.json'), 65536).bytes);
    const remote = JSON.parse(readFileLimited(path.join(root, OUTPUT, 'remote-readback.json'), 65536).bytes);
    const command = readFileLimited(path.join(root, OUTPUT, 'REPAIR_COMMAND.txt'), 65536).bytes;
    if (!script.equals(committed) || preparation.installer?.sha256 !== sha(script) || preparation.installer?.bytes !== script.length ||
        remote.assetCommit !== preparation.assetCommit || remote.releaseId !== preparation.releaseId || remote.allExactBytesEqual !== true ||
        !command.equals(Buffer.from(commandFor(entryCommit, script)))) fail();
    const report = { schemaVersion: 1, kind: 'eos-public-repair-command-verification',
        entryCommit, assetCommit: preparation.assetCommit, releaseId: preparation.releaseId,
        script: identity(script), command: identity(command), commandMatchesPinnedEntry: true,
        assetReadback: identity(readFileLimited(path.join(root, OUTPUT, 'remote-readback.json'), 65536).bytes),
        sourceAndHistoricalFilesChanged: false, targetRepairExecuted: false, productionReleaseApproved: false };
    fs.writeFileSync(path.join(root, OUTPUT, 'command-verification.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    return report;
}
module.exports = { compare, checkStage, readback, commandReport, STAGES };
if (require.main === module) {
    try {
        const args = process.argv.slice(2); let result;
        if (args.length === 2 && args[0] === '--readback') result = readback(ROOT, args[1]);
        else if (args.length === 2 && args[0] === '--command-report') result = commandReport(ROOT, args[1]);
        else if (args.length === 3 && args[0] === '--check-stage') result = checkStage(ROOT, args[1], args[2]);
        else fail();
        console.log(JSON.stringify(result));
    } catch { console.error('PUBLIC_REPAIR_PUBLICATION_REJECTED'); process.exitCode = 1; }
}
