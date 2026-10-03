'use strict';
// Real manufacturer build with public fixture trust only. No publication,
// private-key export, target installation or hardware execution takes place.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const builder = require('../../tools/bootstrap/build-github-download.cjs');
const { DELIVERY_DIRECTORY } = require('../../tools/system/install-from-checkout.cjs');
const ROOT = path.resolve(__dirname, '../..');
const PYTHON = process.platform === 'win32' ? 'python' : '/usr/bin/python3';
const BASH = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function identity(file) {
    const size = fs.statSync(file).size;
    const git = crypto.createHash('sha1').update(`blob ${size}\0`);
    const digest = crypto.createHash('sha256');
    const descriptor = fs.openSync(file, 'r');
    const buffer = Buffer.alloc(1024 * 1024);
    try {
        let length;
        while ((length = fs.readSync(descriptor, buffer, 0, buffer.length, null))) {
            git.update(buffer.subarray(0, length));
            digest.update(buffer.subarray(0, length));
        }
    } finally { fs.closeSync(descriptor); }
    return { blob: git.digest('hex'), sha256: digest.digest('hex'), bytes: size };
}

function removeCreatedDirectory(directory, parent, basename) {
    // A cleanup failure must retain data rather than broaden its deletion scope.
    assert.equal(path.resolve(directory), path.join(path.resolve(parent), basename));
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(parent));
    if (!fs.existsSync(directory)) return;
    const info = fs.lstatSync(directory);
    assert.ok(info.isDirectory() && !info.isSymbolicLink());
    assert.equal(fs.realpathSync(directory), path.join(fs.realpathSync(parent), basename));
    fs.rmSync(directory, { recursive: true, force: false });
}

// Read ZIP data only: compare every member to its source and relevant signed
// manifest entries. Neither ZIP nor tar members are extracted or executed.
const READBACK = String.raw`
import hashlib,json,stat,sys,tarfile,zipfile
from pathlib import Path,PurePosixPath
root,kit,trust,release,delivery=Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]),Path(sys.argv[4]),sys.argv[5]
expected={}
for folder in ['runtime','tools/system','licenses']:
    for source in (root/folder).rglob('*'):
        assert not source.is_symlink()
        if source.is_file(): expected[source.relative_to(root).as_posix()]=source.read_bytes()
for name in ['tools/bootstrap/first-start.cjs','tools/integration/test-archive.py',
             'tools/integration/check-runtime-architecture.cjs','security/verify-runtime-tls.cjs',
             'LICENSE','THIRD_PARTY_NOTICES.md','docs/history/UPSTREAM_README.md',
             delivery+'/delivery.json',delivery+'/release-public.pem']:
    expected[name]=(root/name).read_bytes()
expected['license-public-trust.json']=trust.read_bytes()
metadata=json.loads(expected[delivery+'/delivery.json'])
expected_config={'schemaVersion':1,'releasePublicKeySha256':metadata['signingPublicKeySha256'],
                 'licenseTrustSha256':hashlib.sha256(trust.read_bytes()).hexdigest()}
with tarfile.open(release,'r|gz') as archive:
    manifest=None
    for entry in archive:
        if entry.name=='bundle/manifest.json':
            assert entry.isfile() and 0<entry.size<=16*1024**2
            manifest=json.loads(archive.extractfile(entry).read(16*1024**2+1))
            break
    assert manifest is not None
signed=[row for row in manifest['files'] if row['path'].startswith(('runtime/','tools/system/'))
        or row['path'] in ('tools/integration/check-runtime-architecture.cjs','security/verify-runtime-tls.cjs')]
with zipfile.ZipFile(kit) as archive:
    rows=archive.infolist()
    assert 0<len(rows)<=4000 and len({row.filename for row in rows})==len(rows)
    assert set(archive.namelist())==set(expected)|{'bootstrap.json'}
    values={}; total=0
    for row in rows:
        name=PurePosixPath(row.filename)
        assert row.orig_filename==row.filename and not name.is_absolute() and '..' not in name.parts
        assert str(name)==row.filename and '\\' not in row.filename
        assert stat.S_ISREG(row.external_attr>>16) and (row.external_attr>>16)&0o7777==0o644
        assert row.date_time==(1980,1,1,0,0,0) and row.flag_bits&1==0
        assert row.file_size<=16*1024**2
        data=archive.read(row)
        assert len(data)==row.file_size
        total+=len(data); assert total<=64*1024**2
        values[row.filename]=data
        if row.filename=='bootstrap.json': assert json.loads(data)==expected_config
        else: assert data==expected[row.filename],row.filename
    for row in signed:
        data=values[row['path']]
        assert len(data)==row['size'] and hashlib.sha256(data).hexdigest()==row['sha256'],row['path']
    assert all(name in {row['path'] for row in signed} for name in values if name.startswith('runtime/'))
print(json.dumps({'files':len(rows),'bytes':total,'readbackVerified':True,'sourceFilesBound':len(signed),
                  'licenseTrustSha256':expected_config['licenseTrustSha256'],'sequence':manifest['sequence']}))
`;

test('real private GitHub publication builder binds r3, all assets and complete source kit with ephemeral public fixture trust',
    { timeout: 300000 }, t => {
        assert.equal(DELIVERY_DIRECTORY, 'delivery/test-pi-0.2.0-test.3-r3');
        assert.ok(fs.existsSync(BASH), 'real Bash is required; syntax checks must not be claimed from string matching');
        const suffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        const name = `github-fixture-${suffix}`;
        const parent = path.join(ROOT, 'delivery');
        const output = path.join(parent, name);
        assert.equal(fs.existsSync(output), false);
        const tempParent = os.tmpdir();
        const temp = fs.mkdtempSync(path.join(tempParent, 'eos-github-publication-'));
        t.after(() => removeCreatedDirectory(temp, tempParent, path.basename(temp)));
        t.after(() => removeCreatedDirectory(output, parent, name));

        // Only a public SPKI leaves the in-memory key generation operation.
        const { publicKey } = crypto.generateKeyPairSync('ed25519');
        const trust = Buffer.from(JSON.stringify({ 'github-publication-test-only': publicKey.export({ format: 'pem', type: 'spki' }) }) + '\n');
        const trustFile = path.join(temp, 'public-fixture-trust.json');
        fs.writeFileSync(trustFile, trust, { flag: 'wx' });
        assert.doesNotMatch(trust.toString(), /PRIVATE KEY/);

        const deliveryPath = path.join(ROOT, DELIVERY_DIRECTORY);
        const delivery = JSON.parse(fs.readFileSync(path.join(deliveryPath, 'delivery.json')));
        const releaseArchive = path.join(deliveryPath, delivery.archive);
        const nodeArchive = path.join(ROOT, 'delivery/test-pi-0.2.0-test.1/node-v24.21.0-linux-arm64.tar.xz');
        const preserved = new Map([nodeArchive, ...fs.readdirSync(deliveryPath).map(file => path.join(deliveryPath, file))]
            .filter(file => fs.lstatSync(file).isFile()).map(file => [file, identity(file)]));
        const report = builder.build(builder.parse(['--license-trust', trustFile, '--license-trust-sha256', sha256(trust),
            '--release-public-key-sha256', delivery.signingPublicKeySha256, '--output', output]));

        const manifestFile = path.join(output, 'github-manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestFile));
        assert.deepEqual(Object.keys(manifest).sort(), ['schemaVersion', 'kind', 'repository', 'ready', 'deliveryDirectory', 'prepareHost', 'assets'].sort());
        assert.equal(manifest.schemaVersion, 1);
        assert.equal(manifest.kind, 'eos-private-github-test-install');
        assert.equal(manifest.repository, 'NexoWatt/nexowatt-eos');
        assert.equal(manifest.ready, true);
        assert.equal(manifest.deliveryDirectory, DELIVERY_DIRECTORY);
        assert.equal(manifest.assets.length, 3);
        const sources = new Map([['installer-kit.zip', path.join(output, 'installer-kit.zip')],
            [path.basename(nodeArchive), nodeArchive], [delivery.archive, releaseArchive]]);
        assert.deepEqual(new Set(manifest.assets.map(asset => asset.name)), new Set(sources.keys()));
        for (const asset of manifest.assets) {
            assert.deepEqual(Object.keys(asset).sort(), ['name', 'blob', 'sha256', 'bytes'].sort());
            assert.deepEqual(asset, { name: asset.name, ...identity(sources.get(asset.name)) });
            assert.ok(asset.bytes < 100 * 1024**2, 'every actual blob must fit the selected GitHub transport');
        }
        for (const name of ['github-download.py', 'prepare-host.py'])
            assert.deepEqual(fs.readFileSync(path.join(output, name)), fs.readFileSync(path.join(ROOT, 'tools/bootstrap', name)));
        assert.deepEqual(manifest.prepareHost, identity(path.join(output, 'prepare-host.py')));
        assert.deepEqual(report.manifest, identity(manifestFile));
        assert.deepEqual(report.driver, identity(path.join(output, 'github-download.py')));
        assert.deepEqual(report.prepareHost, manifest.prepareHost);
        assert.deepEqual(report.assets, manifest.assets);
        assert.equal(report.releaseId, delivery.releaseId);
        assert.equal(report.releaseSequence, 6);
        assert.equal(report.licenseTrustSha256, sha256(trust));
        assert.deepEqual(fs.readFileSync(path.join(output, 'license-public-trust.json')), trust);
        for (const flag of ['tokenStored', 'published', 'targetInstallationExecuted', 'productionReleaseApproved', 'fleetUpdaterImplemented'])
            assert.equal(report[flag], false, flag);
        assert.equal(report.hardwareAcceptance, 'OPEN');
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'preparation.json'))), report);

        const readback = cp.spawnSync(PYTHON, ['-I', '-B', '-c', READBACK, ROOT, path.join(output, 'installer-kit.zip'),
            trustFile, releaseArchive, DELIVERY_DIRECTORY], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 120000, maxBuffer: 65536 });
        assert.equal(readback.status, 0, readback.stderr || String(readback.error || ''));
        const verified = JSON.parse(readback.stdout);
        assert.deepEqual(report.kit, { files: verified.files, bytes: verified.bytes, readbackVerified: true });
        assert.equal(report.sourceFilesBound, verified.sourceFilesBound);
        assert.ok(verified.sourceFilesBound > 0);
        assert.equal(verified.licenseTrustSha256, sha256(trust));
        assert.equal(verified.sequence, 6);

        const command = fs.readFileSync(path.join(output, 'INSTALL_COMMAND.txt'), 'utf8').trimEnd();
        assert.equal(command, builder.installCommand(report.driver, report.manifest));
        assert.equal((command.match(/GitHub-Token/g) || []).length, 1);
        assert.ok(command.includes(report.driver.sha256) && command.includes(report.manifest.sha256));
        assert.doesNotMatch(command, /PRIVATE KEY|--insecure|--location|credential\.helper/);
        for (const [name, text] of [['outer.sh', command], ['body.sh', command.split('\n').slice(1, -1).join('\n')]]) {
            const script = path.join(temp, name);
            fs.writeFileSync(script, text + '\n', { flag: 'wx' });
            const result = cp.spawnSync(BASH, ['-n', script], { encoding: 'utf8', shell: false, windowsHide: true, timeout: 15000 });
            assert.equal(result.status, 0, result.stderr || String(result.error || ''));
        }
        for (const [file, before] of preserved) assert.deepEqual(identity(file), before, `preserve ${path.basename(file)}`);
        t.diagnostic(`${verified.files} kit files read back; ${verified.sourceFilesBound} signed source bindings; three actual assets checked; no publication or target execution.`);
    });
