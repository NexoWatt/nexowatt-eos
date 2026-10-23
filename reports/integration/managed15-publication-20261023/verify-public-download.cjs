'use strict';
// Fixed public release readback. Uses reviewed repository code, never payload code.
// Local reproduction: node <this-file> --local-assets /absolute/release-assets
// CI/public reproduction: node <this-file> --download
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { verifyTestArchive } = require('../../../tools/integration/create-test-archive.cjs');
const ROOT = path.resolve(__dirname, '../../..');
const SOURCE = 'f353dd08bf8ac5897e9b1c357994d4047a82ed6d';
const RELEASE = '95a87d5dad4d7c29b5b4e849bef5451ff113388e6ee07da6bd9e36bd9178d534';
const BASE_URL = `https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-15-${RELEASE}/`;
const ASSETS = Object.freeze([
    { name: 'delivery.json', bytes: 2632, sha256: 'bd16e1cd02cf5816c869030686d5aec2a7d9f796a30aa4fd3c2d0d1048675d43' },
    { name: 'eos-linux-arm64.tar.gz', bytes: 134278673, sha256: 'dee6181281241c04c9f1a1526685c45a0d4de347d088312a1ce9fe647d82ac44' },
    { name: 'release-public.pem', bytes: 113, sha256: '518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40' },
    { name: 'runtime.cdx.json', bytes: 762025, sha256: 'c1fafdd8fd833cf31ddb182d7e73719f6844cb743d4a8f935ff1f1256f5f2924' },
    { name: 'SHA256SUMS', bytes: 337, sha256: '3355d68badfae04c8bb9f7a42a61b4cc39a1a34a7c1f4ff0b3c1999be14fe115' },
]);
const CLEAN_ENV = Object.freeze({ PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' });
const CHUNK = 1024 * 1024;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const requireValue = (value, code) => { if (!value) fail(code); };

function identity(file, expected) {
    const stat = fs.lstatSync(file);
    requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size === expected.bytes, 'PUBLIC_ASSET_FILE');
    const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const digest = crypto.createHash('sha256'), buffer = Buffer.alloc(65536);
    let count = 0;
    try {
        let size;
        while ((size = fs.readSync(fd, buffer, 0, buffer.length, null)) !== 0) {
            count += size;
            requireValue(count <= expected.bytes, 'PUBLIC_ASSET_SIZE');
            digest.update(buffer.subarray(0, size));
        }
    } finally { fs.closeSync(fd); }
    requireValue(count === expected.bytes && digest.digest('hex') === expected.sha256, 'PUBLIC_ASSET_HASH');
    return { ...expected, url: BASE_URL + expected.name };
}

function download(directory, asset) {
    const output = path.join(directory, asset.name), part = output + '.part';
    const fd = fs.openSync(output, 'wx', 0o600);
    let requests = 0;
    try {
        for (let start = 0; start < asset.bytes; start += CHUNK) {
            const end = Math.min(start + CHUNK, asset.bytes) - 1, length = end - start + 1;
            // curl -q disables config; the allowlisted environment contains no
            // token, proxy, HOME, cookie, netrc or other ambient credential path.
            // Each bounded range has one 5-second budget including redirects.
            const result = spawnSync('/usr/bin/curl', ['-q', '--fail', '--silent', '--show-error',
                '--proto', '=https', '--proto-redir', '=https', '--tlsv1.2', '--location', '--max-redirs', '3',
                '--connect-timeout', '5', '--max-time', '5', '--max-filesize', String(length),
                '--range', `${start}-${end}`, '--output', part,
                '--write-out', '%{http_code}\n%header{content-range}\n%{url_effective}\n', BASE_URL + asset.name],
            { env: CLEAN_ENV, encoding: 'utf8', timeout: 6000, maxBuffer: 16384, shell: false });
            requireValue(!result.error && result.status === 0, 'PUBLIC_DOWNLOAD_FAILED');
            const [status, range, effective] = result.stdout.trimEnd().split('\n');
            const url = new URL(effective);
            requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.port
                && ['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(url.hostname), 'PUBLIC_DOWNLOAD_URL');
            requireValue(status === '206' && range === `bytes ${start}-${end}/${asset.bytes}`, 'PUBLIC_DOWNLOAD_RANGE');
            const stat = fs.lstatSync(part);
            requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size === length, 'PUBLIC_DOWNLOAD_SIZE');
            const bytes = fs.readFileSync(part);
            let written = 0;
            while (written < bytes.length) written += fs.writeSync(fd, bytes, written, bytes.length - written);
            fs.unlinkSync(part);
            requests++;
        }
    } finally { fs.closeSync(fd); }
    return requests;
}

function verify(directory, publicDownload, requests) {
    const assets = ASSETS.map(asset => identity(path.join(directory, asset.name), asset));
    const read = name => fs.readFileSync(path.join(directory, name));
    const delivery = JSON.parse(read('delivery.json'));
    requireValue(delivery.releaseId === RELEASE && delivery.sourceCommit === SOURCE && delivery.releaseSequence === 15
        && delivery.deliveryRevision === 12 && delivery.runtimeVersion === '0.2.0-test.3' && delivery.platform === 'linux-arm64'
        && delivery.archive === ASSETS[1].name && delivery.bytes === ASSETS[1].bytes && delivery.sha256 === ASSETS[1].sha256
        && delivery.signingPublicKeySha256 === ASSETS[2].sha256 && delivery.productionReleaseApproved === false, 'PUBLIC_DELIVERY_BINDING');
    requireValue(read('SHA256SUMS').toString('utf8') === ASSETS.slice(0, 4).map(a => `${a.sha256}  ${a.name}\n`).join(''), 'PUBLIC_SUMS_BINDING');
    const checked = verifyTestArchive({ archivePath: path.join(directory, ASSETS[1].name), publicKey: read('release-public.pem'),
        expectedReleaseId: RELEASE, platform: 'linux-arm64', nodeVersion: '24.22.1' });
    requireValue(checked.archiveBytes === ASSETS[1].bytes && checked.archiveSha256 === ASSETS[1].sha256
        && checked.manifest.sequence === 15 && checked.manifest.profile === 'test' && checked.manifest.releaseVersion === '0.2.0-test.3'
        && JSON.stringify(checked.manifest.platforms) === '["linux-arm64"]' && checked.manifest.files.length === 22606, 'PUBLIC_ARCHIVE_BINDING');
    const sbom = checked.manifest.files.find(row => row.path === 'sbom.cdx.json');
    requireValue(sbom?.size === ASSETS[3].bytes && sbom.sha256 === ASSETS[3].sha256, 'PUBLIC_SBOM_BINDING');
    const git = spawnSync('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: ROOT, env: CLEAN_ENV, encoding: 'utf8', timeout: 5000 });
    const commit = git.stdout?.trim();
    requireValue(git.status === 0 && /^[a-f0-9]{40}$/.test(commit), 'PUBLIC_VERIFIER_COMMIT');
    const ci = process.env.GITHUB_ACTIONS === 'true';
    requireValue(!ci || process.env.GITHUB_REPOSITORY === 'NexoWatt/nexowatt-eos' && process.env.GITHUB_SHA === commit
        && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID || '') && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT || ''), 'PUBLIC_CI_BINDING');
    return {
        schemaVersion: 1, kind: 'eos-managed15-public-release-readback', checkedAt: new Date().toISOString(),
        mode: publicDownload ? 'unauthenticated-public-download' : 'local-assets-validation',
        unauthenticatedDownload: publicDownload, publicReadbackPerformed: publicDownload,
        sourceCommit: SOURCE, verifierCommit: commit, verifierNode: process.version,
        githubRunId: ci ? process.env.GITHUB_RUN_ID : null, githubRunAttempt: ci ? process.env.GITHUB_RUN_ATTEMPT : null,
        githubRunUrl: ci ? `https://github.com/NexoWatt/nexowatt-eos/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
        releaseId: RELEASE, releaseSequence: 15, nodeVersion: '24.22.1', platform: 'linux-arm64', profile: 'test',
        assets, httpRangeRequests: requests, requestDeadlineSeconds: publicDownload ? 5 : null,
        manifestSignatureVerified: true, fullArchiveReadbackVerified: true, manifestFiles: checked.manifest.files.length,
        payloadBytes: checked.manifest.files.reduce((sum, row) => sum + row.size, 0), sbomAssetBoundToManifest: true,
        payloadExecuted: false, activeFeedVerified: false, piUpdateExecuted: false, productionReleaseApproved: false,
    };
}

let temporary;
try {
    requireValue(process.platform === 'linux' && Number(process.versions.node.split('.')[0]) >= 20, 'PUBLIC_RUNTIME');
    const args = process.argv.slice(2), publicDownload = args.length === 1 && args[0] === '--download';
    requireValue(publicDownload || args.length === 2 && args[0] === '--local-assets' && path.isAbsolute(args[1]), 'PUBLIC_USAGE');
    const directory = publicDownload ? (temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-managed15-public-'))) : args[1];
    let requests = 0;
    if (publicDownload) for (const asset of ASSETS) requests += download(directory, asset);
    process.stdout.write(JSON.stringify(verify(directory, publicDownload, requests), null, 2) + '\n');
} catch (error) {
    // Never print curl stderr/redirect URLs, downloaded content or environment.
    process.stderr.write((/^PUBLIC_[A-Z_]+$/.test(error?.code || '') ? error.code : 'PUBLIC_READBACK_FAILED') + '\n');
    process.exitCode = 1;
} finally {
    if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
