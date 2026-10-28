'use strict';
// Fixed release evidence only. Execute validators from a clean qualified source
// checkout; downloaded installer, ARM64 runtime and application are read as data.
// node <this-file> --download --qualified-source /absolute/qualified-source [--entry-commit <40hex>]
// node <this-file> --local-assets /absolute/assets --qualified-source /absolute/qualified-source [--entry-commit <40hex>]
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const SOURCE = 'f2ea9a7ba67ef46a7de8a4f0ef05eaa672ca38f4';
const RELEASE = '06f8e06f923b180c0bcbb03f6f853f402cf5a8649a1e6b8172d34262aca63e3d';
const BASE_URL = `https://github.com/NexoWatt/nexowatt-eos/releases/download/managed-test-16-${RELEASE}/`;
const ASSETS = Object.freeze([
    { name: 'delivery.json', bytes: 2679, sha256: '11219270f0933d89bafbe82dcca4d6bb0b107595baa92d97ac3ce1d542fabdbf' },
    { name: 'eos-linux-arm64.tar.gz', bytes: 134278495, sha256: '39681c4618546607df0c6e648620baa6285441301564c583fe3fbffd47d0fdfe' },
    { name: 'installer-kit.zip', bytes: 499177, sha256: 'bdb384346194a2c4837f08aba88699360d583baf0a973d2539e5a89980890af5' },
    { name: 'node-v24.22.1-linux-arm64.tar.xz', bytes: 30978868, sha256: 'dbabf7a1cbf947e6059ffad2c27b80041db97dea1e553b62afdee7f13fca336e' },
    { name: 'release-public.pem', bytes: 113, sha256: '518f89debdb0b396d2abe7be8136b7ea5670c2a1f043705ed5d5528124067a40' },
    { name: 'runtime.cdx.json', bytes: 762025, sha256: '4e8806b2ee83e2b2ffb89b4ffbb542f59a50136594f23c43792b30f5d9ceee13' },
    { name: 'SHA256SUMS', bytes: 520, sha256: '35a7bca9267e71054b5ea1d2cf78b26d5e267823f4a77a90292c4c0f512164f4' },
]);
const ENTRY = Object.freeze({ name: 'install.sh', bytes: 49985, sha256: 'cf930e26fb6d45235017e0bba55bd43ef74214d06cb465719ecdbf4a1515431f' });
const FEED = Object.freeze({ name: 'test.json', bytes: 322, sha256: '8c6dd3d316e397dda4a388e80865f637b142160a3b430d6ab52409b3c6c92acf' });
const FEED_URL = 'https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/main/delivery/update-channel/test.json';
const TRUST = '470dce1dec8f4a5da87339e9166aed025789ea86ab85613f2c508f5e9d434b6f';
const CLEAN_ENV = Object.freeze({ PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' });
const CHUNK = 1024 * 1024;
const fail = code => { throw Object.assign(new Error(code), { code }); };
const requireValue = (value, code) => { if (!value) fail(code); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const asset = name => ASSETS.find(row => row.name === name);

function parse(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        requireValue(['--download', '--local-assets', '--qualified-source', '--entry-commit'].includes(flag)
            && !Object.hasOwn(options, flag), 'PUBLIC_USAGE');
        options[flag] = flag === '--download' ? true : args[++i];
        requireValue(options[flag], 'PUBLIC_USAGE');
    }
    requireValue(Boolean(options['--download']) !== Boolean(options['--local-assets']), 'PUBLIC_USAGE');
    for (const flag of ['--local-assets', '--qualified-source']) if (options[flag])
        requireValue(path.isAbsolute(options[flag]) && path.resolve(options[flag]) === options[flag], 'PUBLIC_USAGE');
    if (options['--entry-commit']) requireValue(/^[a-f0-9]{40}$/.test(options['--entry-commit']), 'PUBLIC_ENTRY_COMMIT');
    return options;
}

function identity(file, expected) {
    const before = fs.lstatSync(file);
    requireValue(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size === expected.bytes, 'PUBLIC_ASSET_FILE');
    const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const digest = crypto.createHash('sha256'), buffer = Buffer.alloc(65536);
    let count = 0;
    try {
        const opened = fs.fstatSync(fd);
        requireValue(opened.dev === before.dev && opened.ino === before.ino && opened.size === before.size, 'PUBLIC_ASSET_CHANGED');
        let size;
        while ((size = fs.readSync(fd, buffer, 0, buffer.length, null)) !== 0) {
            count += size;
            requireValue(count <= expected.bytes, 'PUBLIC_ASSET_SIZE');
            digest.update(buffer.subarray(0, size));
        }
        const after = fs.fstatSync(fd);
        requireValue(opened.size === after.size && opened.mtimeMs === after.mtimeMs && opened.ctimeMs === after.ctimeMs, 'PUBLIC_ASSET_CHANGED');
    } finally { fs.closeSync(fd); }
    requireValue(count === expected.bytes && digest.digest('hex') === expected.sha256, 'PUBLIC_ASSET_HASH');
    return { ...expected };
}

function checkedUrl(value, entry = false) {
    let url;
    try { url = new URL(value); } catch { fail('PUBLIC_DOWNLOAD_URL'); }
    const hosts = entry ? ['raw.githubusercontent.com'] : ['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'];
    requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash
        && hosts.includes(url.hostname), 'PUBLIC_DOWNLOAD_URL');
    return url.href;
}

function download(directory, expected, initialUrl, entry = false) {
    const output = path.join(directory, expected.name), part = output + '.part';
    const fd = fs.openSync(output, 'wx', 0o600);
    let requests = 0;
    try {
        for (let start = 0; start < expected.bytes; start += CHUNK) {
            const end = Math.min(start + CHUNK, expected.bytes) - 1, length = end - start + 1;
            const deadline = performance.now() + 5000;
            let url = checkedUrl(initialUrl, entry), complete = false;
            for (let redirects = 0; redirects <= 3; redirects++) {
                const remaining = deadline - performance.now();
                requireValue(remaining > 0, 'PUBLIC_DOWNLOAD_DEADLINE');
                // No automatic redirects: validate every target BEFORE a request.
                // All redirect hops share this range's five-second deadline.
                // -q and a minimal environment exclude ambient config/credentials.
                const seconds = (remaining / 1000).toFixed(3);
                const result = spawnSync('/usr/bin/curl', ['-q', '--fail', '--silent', '--show-error',
                    '--proto', '=https', '--tlsv1.2', '--connect-timeout', seconds, '--max-time', seconds,
                    // Redirect error bodies may exceed a very small asset. Keep
                    // those bounded too; final data still requires exact length.
                    '--max-filesize', String(Math.max(length, 16384)), '--range', `${start}-${end}`, '--output', part,
                    '--write-out', '%{http_code}\n%header{content-range}\n%header{location}\n', url],
                { env: CLEAN_ENV, encoding: 'utf8', timeout: Math.ceil(remaining) + 100, maxBuffer: 16384, shell: false });
                requests++;
                requireValue(!result.error && result.status === 0, 'PUBLIC_DOWNLOAD_FAILED');
                requireValue(performance.now() <= deadline, 'PUBLIC_DOWNLOAD_DEADLINE');
                const [status, range, location] = result.stdout.split('\n');
                if (['301', '302', '303', '307', '308'].includes(status)) {
                    requireValue(redirects < 3 && typeof location === 'string' && location.length > 0, 'PUBLIC_DOWNLOAD_REDIRECT');
                    let target;
                    try { target = new URL(location, url).href; } catch { fail('PUBLIC_DOWNLOAD_URL'); }
                    url = checkedUrl(target, entry);
                    fs.rmSync(part, { force: true });
                    continue;
                }
                // Raw entry may return the entire small document with 200.
                requireValue(status === '206' && range === `bytes ${start}-${end}/${expected.bytes}`
                    || entry && start === 0 && end + 1 === expected.bytes && status === '200' && !range, 'PUBLIC_DOWNLOAD_RANGE');
                const stat = fs.lstatSync(part);
                requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.size === length, 'PUBLIC_DOWNLOAD_SIZE');
                const bytes = fs.readFileSync(part);
                let written = 0;
                while (written < bytes.length) written += fs.writeSync(fd, bytes, written, bytes.length - written);
                fs.unlinkSync(part);
                complete = true;
                break;
            }
            requireValue(complete, 'PUBLIC_DOWNLOAD_REDIRECT');
        }
    } finally { fs.closeSync(fd); }
    identity(output, expected);
    return requests;
}

function git(directory, args) {
    const result = spawnSync('/usr/bin/git', args, { cwd: directory, env: CLEAN_ENV, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
    requireValue(!result.error && result.status === 0, 'PUBLIC_SOURCE_GIT');
    return result.stdout.trim();
}

const KIT_READER = String.raw`
import base64, hashlib, json, stat, sys, zipfile
from pathlib import PurePosixPath
generated = {'bootstrap.json', 'delivery/managed-test-16/delivery.json', 'delivery/managed-test-16/release-public.pem', 'license-public-trust.json'}
rows, data, seen, total = [], {}, set(), 0
with zipfile.ZipFile(sys.argv[1]) as archive:
    entries = archive.infolist()
    if len(entries) != 146: raise ValueError('inventory')
    for entry in entries:
        name = entry.filename
        parts = PurePosixPath(name).parts
        mode = entry.external_attr >> 16
        if (not name or name in seen or name.startswith('/') or '\\' in name or ':' in name
            or any(p in ('', '.', '..') for p in name.split('/')) or '/'.join(parts) != name
            or entry.is_dir() or entry.flag_bits & 1 or not stat.S_ISREG(mode)
            or entry.file_size < 0 or entry.file_size > 16 * 1024 * 1024): raise ValueError('member')
        seen.add(name)
        total += entry.file_size
        if total > 1536180: raise ValueError('size')
    if total != 1536180 or not generated.issubset(seen): raise ValueError('total')
    for entry in entries:
        body = archive.read(entry)
        if len(body) != entry.file_size: raise ValueError('changed')
        rows.append({'name': entry.filename, 'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()})
        if entry.filename in generated: data[entry.filename] = base64.b64encode(body).decode('ascii')
print(json.dumps({'rows': rows, 'data': data}))
`;

function inspectKit(file) {
    const result = spawnSync('/usr/bin/python3', ['-I', '-B', '-c', KIT_READER, file],
        { env: CLEAN_ENV, encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, shell: false });
    requireValue(!result.error && result.status === 0, 'PUBLIC_KIT_INVENTORY');
    return JSON.parse(result.stdout);
}

function verify(directory, qualified, scratch, entryCommit, publicDownload, requests) {
    requireValue(fs.realpathSync(qualified) === qualified && git(qualified, ['rev-parse', 'HEAD']) === SOURCE
        && git(qualified, ['status', '--porcelain', '--untracked-files=all']) === '', 'PUBLIC_QUALIFIED_SOURCE');
    // Only trusted checkout modules are required; no require/import from assets.
    const tool = require(path.join(qualified, 'tools/bootstrap/build-managed-download.cjs'));
    const bundle = require(path.join(qualified, 'runtime/release/bundle.cjs'));
    const build = require(path.join(qualified, 'tools/system/build-bundle.cjs'));
    const archiveTool = require(path.join(qualified, 'tools/integration/create-test-archive.cjs'));
    const nodeTool = require(path.join(qualified, 'tools/integration/prepare-node-runtime.cjs'));
    const channel = require(path.join(qualified, 'runtime/updates/channel.cjs'));
    const read = name => fs.readFileSync(path.join(directory, name));
    const assets = ASSETS.map(row => ({ ...identity(path.join(directory, row.name), row), url: BASE_URL + row.name }));
    const delivery = JSON.parse(read('delivery.json')), key = read('release-public.pem');
    requireValue(delivery.releaseId === RELEASE && delivery.sourceCommit === SOURCE && delivery.releaseSequence === 16
        && delivery.deliveryRevision === 13 && delivery.runtimeVersion === '0.2.0-test.3' && delivery.platform === 'linux-arm64'
        && delivery.archive === ASSETS[1].name && delivery.bytes === ASSETS[1].bytes && delivery.sha256 === ASSETS[1].sha256
        && delivery.signingPublicKeySha256 === asset('release-public.pem').sha256 && delivery.productionReleaseApproved === false, 'PUBLIC_DELIVERY_BINDING');
    requireValue(read('SHA256SUMS').toString('utf8') === ASSETS.slice(0, -1).map(a => `${a.sha256}  ${a.name}\n`).join(''), 'PUBLIC_SUMS_BINDING');
    const feedIdentity = { ...identity(path.join(directory, FEED.name), FEED), url: FEED_URL };
    const feed = channel.verifyFeed(read(FEED.name), key);
    requireValue(feed.releases.length === 0, 'PUBLIC_FEED_BINDING');
    const kit = inspectKit(path.join(directory, 'installer-kit.zip'));
    const sources = tool.collectKitSources(qualified), members = new Map(kit.rows.map(row => [row.name, row]));
    requireValue(sources.length === 142 && kit.rows.length === 146, 'PUBLIC_KIT_SOURCE_COUNT');
    for (const row of sources) requireValue(members.get(row.name)?.bytes === row.bytes
        && members.get(row.name)?.sha256 === row.sha256, 'PUBLIC_KIT_SOURCE_BINDING');
    const generated = name => Buffer.from(kit.data[name] || '', 'base64');
    requireValue(generated('delivery/managed-test-16/delivery.json').equals(read('delivery.json'))
        && generated('delivery/managed-test-16/release-public.pem').equals(key), 'PUBLIC_KIT_DELIVERY_BINDING');
    tool.licenseTrust(generated('license-public-trust.json'), TRUST);
    const bootstrap = JSON.parse(generated('bootstrap.json'));
    requireValue(JSON.stringify(bootstrap) === JSON.stringify({ schemaVersion: 1,
        releasePublicKeySha256: asset('release-public.pem').sha256, licenseTrustSha256: TRUST }), 'PUBLIC_KIT_BOOTSTRAP_BINDING');
    const checked = archiveTool.verifyTestArchive({ archivePath: path.join(directory, ASSETS[1].name), publicKey: key,
        expectedReleaseId: RELEASE, platform: 'linux-arm64', nodeVersion: '24.22.1' });
    requireValue(checked.archiveBytes === ASSETS[1].bytes && checked.archiveSha256 === ASSETS[1].sha256
        && checked.manifest.sequence === 16 && checked.manifest.profile === 'test' && checked.manifest.releaseVersion === '0.2.0-test.3'
        && JSON.stringify(checked.manifest.platforms) === '["linux-arm64"]' && checked.manifest.files.length === 22605
        && checked.manifest.files.reduce((sum, row) => sum + row.size, 0) === 437912699, 'PUBLIC_ARCHIVE_BINDING');
    requireValue(tool.sourceBinding(checked.manifest, kit.rows) === 131, 'PUBLIC_KIT_SIGNED_BINDING');
    const sbom = checked.manifest.files.find(row => row.path === 'sbom.cdx.json');
    requireValue(sbom?.size === asset('runtime.cdx.json').bytes && sbom.sha256 === asset('runtime.cdx.json').sha256, 'PUBLIC_SBOM_BINDING');
    const extracted = path.join(scratch, 'extracted');
    const extraction = spawnSync('/usr/bin/python3', ['-I', '-B', path.join(qualified, 'tools/system/extract-test-bundle.py'),
        '--archive', path.join(directory, ASSETS[1].name), '--destination', extracted, '--sha256', ASSETS[1].sha256],
    { env: CLEAN_ENV, encoding: 'utf8', timeout: 120000, maxBuffer: 16384, shell: false });
    requireValue(!extraction.error && extraction.status === 0 && JSON.parse(extraction.stdout).codeExecuted === false, 'PUBLIC_DATA_EXTRACTION');
    const verified = bundle.verifyBundle({ bundleDirectory: path.join(extracted, 'bundle'), publicKey: key,
        minimumSequence: 15, platform: 'linux-arm64', nodeVersion: '24.22.1' });
    requireValue(verified.releaseId === RELEASE, 'PUBLIC_EXTRACTED_BINDING');
    const validated = build.validatePayload(verified.payloadPath, verified.manifest);
    const recordBytes = fs.readFileSync(path.join(verified.payloadPath, 'runtime-build.json')), record = JSON.parse(recordBytes);
    requireValue(record.sourceCommit === SOURCE && record.nodeVersion === '24.22.1' && record.controllerVersion === '7.2.5'
        && hash(recordBytes) === '5fa3433b3e9903f0c86840a47fff060b8f80fd86b5cec8f1add65bc3dfe7a6e8'
        && record.appContentSha256 === 'e39b77825202a391c9a8cdacd818e6b3b326b0844d2167632acc0efcfa02c723', 'PUBLIC_RUNTIME_BUILD_BINDING');
    // Independently bind every non-app/non-Node payload file to qualified source,
    // including the two deterministic transformations performed by the builder.
    let sourceBindings = 0;
    for (const row of checked.manifest.files) {
        if (row.path.startsWith('app/') || row.path.startsWith('node-runtime/')
            || ['catalog.json', 'sbom.cdx.json', 'runtime-build.json'].includes(row.path)) continue;
        let sourcePath = row.path;
        if (sourcePath === 'licenses/upstream/README.ioBroker-Installer.md') sourcePath = 'docs/history/UPSTREAM_README.md';
        if (sourcePath === 'system/postgresql-test/systemd/nexowatt-eos-upload.service') sourcePath = 'system/own-adapter-test/systemd/nexowatt-eos-upload.service';
        let bytes = fs.readFileSync(path.join(qualified, sourcePath));
        if (row.path === 'THIRD_PARTY_NOTICES.md') bytes = Buffer.from(build.runtimeLicenseNotices(bytes.toString('utf8'), 'app/'));
        if (/^system\/(?:test-base|postgresql-test|own-adapter-test)\/systemd\/.+\.service$/.test(row.path))
            bytes = Buffer.from(build.renderManagedNodeUnit(bytes.toString('utf8')));
        requireValue(bytes.length === row.size && hash(bytes) === row.sha256, 'PUBLIC_PAYLOAD_SOURCE_BINDING');
        sourceBindings++;
    }
    const nodeArchive = path.join(directory, 'node-v24.22.1-linux-arm64.tar.xz');
    const officialNode = nodeTool.verifyArchive(nodeArchive, '24.22.1');
    fs.mkdirSync(path.join(scratch, 'official-node'), { mode: 0o700 });
    nodeTool.prepare({ archive: nodeArchive, destination: path.join(scratch, 'official-node/node-runtime'), version: '24.22.1' });
    const officialRows = bundle.inventory(path.join(scratch, 'official-node/node-runtime'));
    for (const row of officialRows) {
        const signed = checked.manifest.files.find(item => item.path === `node-runtime/${row.path}`);
        requireValue(signed && signed.size === row.size && signed.sha256 === row.sha256 && signed.mode === row.mode, 'PUBLIC_NODE_BINDING');
    }
    requireValue(officialNode.sha256 === asset('node-v24.22.1-linux-arm64.tar.xz').sha256
        && checked.manifest.files.filter(row => row.path.startsWith('node-runtime/')).length === officialRows.length, 'PUBLIC_NODE_BINDING');
    let entry = null;
    if (entryCommit) {
        entry = { ...identity(path.join(directory, ENTRY.name), ENTRY), commit: entryCommit,
            url: `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${entryCommit}/delivery/managed16/install.sh` };
        const config = { schemaVersion: 1, baseUrl: BASE_URL.slice(0, -1),
            assets: [asset('installer-kit.zip'), asset('node-v24.22.1-linux-arm64.tar.xz'), asset('eos-linux-arm64.tar.gz')]
                .map(row => ({ name: row.name, sha256: row.sha256, bytes: row.bytes })),
            deliveryDirectory: 'delivery/managed-test-16' };
        const expected = Buffer.from(tool.renderScript(config, fs.readFileSync(path.join(qualified, 'tools/bootstrap/prepare-managed16-host.py'))));
        requireValue(expected.equals(read(ENTRY.name)), 'PUBLIC_ENTRY_SOURCE_BINDING');
    }
    const commit = git(ROOT, ['rev-parse', 'HEAD']), ci = process.env.GITHUB_ACTIONS === 'true';
    requireValue(/^[a-f0-9]{40}$/.test(commit), 'PUBLIC_VERIFIER_COMMIT');
    requireValue(!ci || process.env.GITHUB_REPOSITORY === 'NexoWatt/nexowatt-eos' && process.env.GITHUB_SHA === commit
        && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID || '') && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT || ''), 'PUBLIC_CI_BINDING');
    return {
        schemaVersion: 1, kind: 'eos-managed16-public-release-readback', checkedAt: new Date().toISOString(),
        mode: publicDownload ? 'unauthenticated-public-download' : 'local-assets-validation',
        unauthenticatedDownload: publicDownload, publicReadbackPerformed: publicDownload,
        sourceCommit: SOURCE, verifierCommit: commit, verifierSha256: hash(fs.readFileSync(__filename)), verifierNode: process.version,
        githubRunId: ci ? process.env.GITHUB_RUN_ID : null, githubRunAttempt: ci ? process.env.GITHUB_RUN_ATTEMPT : null,
        githubRunUrl: ci ? `https://github.com/NexoWatt/nexowatt-eos/actions/runs/${process.env.GITHUB_RUN_ID}` : null,
        releaseId: RELEASE, releaseSequence: 16, deliveryRevision: 13, nodeVersion: '24.22.1', controllerVersion: '7.2.5',
        platform: 'linux-arm64', profile: 'test', assets, entry, entryPublicReadbackPerformed: publicDownload && Boolean(entry),
        httpRequests: requests, httpRangeBytes: CHUNK, requestDeadlineSeconds: publicDownload ? 5 : null,
        manifestSignatureVerified: true, fullArchiveReadbackVerified: true, manifestFiles: checked.manifest.files.length,
        payloadBytes: 437912699, extractedInventoryVerified: true, payloadValidationPassed: true,
        sbomAssetBoundToManifest: true, sbomActualContentBindingVerified: true, qualifiedSourcesMatch: true, sourceBindings,
        kitSourceFiles: sources.length, kitSignedSourceFiles: 131, licenseTrustSha256: TRUST,
        officialNodeArchiveAndPayloadMatch: true, architecture: validated.architectureReports,
        payloadExecuted: false, nativeTestsReexecuted: false, activeFeedVerified: true,
        activeFeedPublicReadbackPerformed: publicDownload, feed: { ...feedIdentity, ...feed }, piInstallationExecuted: false,
        piUpdateExecuted: false, productionReleaseApproved: false,
    };
}

function main(args) {
    let scratch;
    try {
        requireValue(process.platform === 'linux' && Number(process.versions.node.split('.')[0]) >= 20, 'PUBLIC_RUNTIME');
        const options = parse(args), publicDownload = Boolean(options['--download']);
        scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-managed16-public-'));
        const directory = publicDownload ? path.join(scratch, 'assets') : options['--local-assets'];
        if (publicDownload) fs.mkdirSync(directory, { mode: 0o700 });
        const qualified = options['--qualified-source'] || ROOT, entryCommit = options['--entry-commit'];
        let requests = 0;
        if (publicDownload) {
            for (const row of ASSETS) requests += download(directory, row, BASE_URL + row.name);
            requests += download(directory, FEED, FEED_URL, true);
            if (entryCommit) requests += download(directory, ENTRY,
                `https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/${entryCommit}/delivery/managed16/install.sh`, true);
        }
        process.stdout.write(JSON.stringify(verify(directory, qualified, scratch, entryCommit, publicDownload, requests), null, 2) + '\n');
    } catch (error) {
        // No downloaded content, curl stderr, signed redirect URLs or environment.
        process.stderr.write((/^PUBLIC_[A-Z_]+$/.test(error?.code || '') ? error.code : 'PUBLIC_READBACK_FAILED') + '\n');
        process.exitCode = 1;
    } finally {
        if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
    }
}
if (require.main === module) main(process.argv.slice(2));
module.exports = { parse, identity, checkedUrl, inspectKit, download, verify, ASSETS, ENTRY, FEED, SOURCE };
