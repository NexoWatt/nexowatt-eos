'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const filename = path.resolve(__dirname, '../../tools/integration/create-test-archive.cjs');
const actual = require(filename);
const { checkRuntimeArchitecture } = require('../../tools/integration/check-runtime-architecture.cjs');
const python = process.platform === 'win32' ? 'python' : '/usr/bin/python3';

// Archive mechanism tests use a tiny static architecture fixture, not an EOS
// release. Only the separate product/SBOM validator is replaced and its call is
// asserted; the real architecture, crypto, Python writer and readback run.
function archiveModule(afterValidation = () => {}) {
    const calls = [];
    const loaded = new Module(filename, module);
    const normalRequire = Module.createRequire(filename);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    loaded.require = id => id === '../system/build-bundle.cjs' ? {
        validatePayload: (payload, manifest) => {
            const report = checkRuntimeArchitecture({ app: path.join(payload, 'app'),
                platform: manifest.platforms[0], nodeVersion: manifest.nodeVersion });
            calls.push({ payload, manifest, report });
            if (!report.passed) throw Object.assign(new Error('BUILD_ARCHITECTURE'), { code: 'BUILD_ARCHITECTURE' });
            const result = { architectureReports: [report] };
            afterValidation(result, payload);
            return result;
        },
    } : id === 'node:crypto' ? { ...crypto,
        generateKeyPairSync: (...args) => {
            const keys = crypto.generateKeyPairSync(...args);
            keys.privateKey.export = () => { throw new Error('PRIVATE_KEY_MUST_NOT_BE_EXPORTED'); };
            return keys;
        },
    } : normalRequire(id);
    loaded._compile(fs.readFileSync(filename, 'utf8'), filename);
    return { ...loaded.exports, calls };
}
function fixture(t, { binary = true, afterValidation } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-test-archive-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const payload = path.join(root, 'payload'); fs.mkdirSync(payload);
    const write = (name, value) => {
        const file = path.join(payload, name); fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value));
    };
    const rootPackage = { name: 'archive-contract-fixture', version: '1.0.0' };
    const packages = { '': rootPackage };
    write('app/package.json', rootPackage);
    write('app/script.cjs', '#!/usr/bin/env node\nmodule.exports = true;\n');
    // More than USTAR's path limit, and Unicode: PAX path-only records survive.
    write('app/' + 'long/'.repeat(40) + 'unicode-\u00e4-\u6d4b\u8bd5.txt', 'unicode fixture\n');
    if (binary) {
        const name = '@esbuild/linux-arm64';
        write(`app/node_modules/${name}/package.json`, { name, version: '0.28.2', os: ['linux'], cpu: ['arm64'] });
        packages[`node_modules/${name}`] = { version: '0.28.2' };
        const elf = Buffer.alloc(512);
        Buffer.from([127, 69, 76, 70, 2, 1, 1, 0]).copy(elf);
        elf.writeUInt16LE(2, 16); elf.writeUInt16LE(183, 18); elf.writeUInt32LE(1, 20);
        elf.writeBigUInt64LE(64n, 32); elf.writeUInt16LE(64, 52); elf.writeUInt16LE(56, 54); elf.writeUInt16LE(1, 56); elf.writeUInt32LE(1, 64);
        write(`app/node_modules/${name}/bin/esbuild`, elf);
    }
    write('app/package-lock.json', { lockfileVersion: 3, packages });
    const metadata = { schemaVersion: 1, product: 'nexowatt-eos', releaseVersion: '0.2.0-test.3', sequence: 4,
        profile: 'test', nodeVersion: '24.21.0', platforms: ['linux-arm64'] };
    const archive = path.join(root, 'bundle.tar.gz'), publicFile = path.join(root, 'release-public.pem');
    const api = archiveModule(afterValidation);
    const create = () => api.createTestArchive({ payloadDirectory: payload, archivePath: archive, publicKeyPath: publicFile, metadata });
    const verify = extra => actual.verifyTestArchive({ archivePath: archive,
        publicKey: fs.readFileSync(publicFile), platform: 'linux-arm64', ...extra });
    return { root, payload, archive, publicFile, metadata, api, create, verify, write };
}
function tamper(file, kind) {
    const script = `import gzip,io,sys,tarfile\np,k=sys.argv[1:]\nrows=[]\nwith tarfile.open(p,'r:gz') as t:\n for m in t:\n  data=t.extractfile(m).read() if m.isfile() else None\n  rows.append((m,data))\ntarget=next(i for i,(m,d) in enumerate(rows) if m.name=='bundle/payload/app/script.cjs')\nm,d=rows[target]\nif k=='bytes':\n d=b'x'*len(d); rows[target]=(m,d)\nelif k=='mode': m.mode=493\nelif k=='owner': m.uid=1\nelif k=='link': m.type=tarfile.SYMTYPE; m.linkname='/etc/passwd'; m.size=0; rows[target]=(m,None)\nelif k=='extra':\n x=tarfile.TarInfo('bundle/payload/unlisted'); x.mode=420; x.mtime=1790899200; x.size=1; rows.append((x,b'x'))\nelif k=='duplicate': rows.append((m,d))\nelif k=='traversal': m.name='bundle/payload/../escape'\nelif k=='signature':\n i=next(i for i,(m,d) in enumerate(rows) if m.name=='bundle/manifest.sig'); m,d=rows[i]; rows[i]=(m,bytes([d[0]^1])+d[1:])\nwith open(p,'wb') as raw, gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0) as g,tarfile.open(fileobj=g,mode='w|',format=tarfile.PAX_FORMAT) as out:\n for m,d in rows: out.addfile(m,io.BytesIO(d) if d is not None else None)\n`;
    const result = spawnSync(python, ['-I', '-B', '-c', script, file, kind], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
}

test('canonical archive signs in-memory keys, validates payload and verifies all readback members', t => {
    const f = fixture(t), result = f.create(), verified = f.verify({ expectedReleaseId: result.releaseId });
    assert.equal(f.api.calls.length, 1);
    assert.equal(f.api.calls[0].report.passed, true);
    assert.equal(f.api.calls[0].payload, f.payload);
    assert.equal(result.archiveReadbackVerified, true);
    assert.equal(result.privateKeyPersisted, false);
    assert.equal(result.targetExecutionPerformed, false);
    assert.equal(result.archiveSha256, crypto.createHash('sha256').update(fs.readFileSync(f.archive)).digest('hex'));
    assert.equal(verified.releaseId, result.releaseId);
    assert.deepEqual(result.executablePaths, ['app/node_modules/@esbuild/linux-arm64/bin/esbuild']);
    assert.equal(verified.manifest.files.find(row => row.path === result.executablePaths[0]).mode, 0o755);
    assert.equal(verified.manifest.files.find(row => row.path === 'app/script.cjs').mode, 0o644);
    assert.deepEqual(fs.readdirSync(f.root).sort(), ['bundle.tar.gz', 'payload', 'release-public.pem']);
    assert.match(fs.readFileSync(f.publicFile, 'utf8'), /^-----BEGIN PUBLIC KEY-----/);
});
test('actual product validation cannot be skipped by the public archive API', t => {
    const f = fixture(t);
    assert.throws(() => actual.createTestArchive({ payloadDirectory: f.payload, archivePath: f.archive,
        publicKeyPath: f.publicFile, metadata: f.metadata }));
    assert.equal(fs.existsSync(f.archive), false);
    assert.equal(fs.existsSync(f.publicFile), false);
});
test('test-only profile, exact Node contract and single platform are mandatory', t => {
    for (const change of [{ profile: 'production' }, { nodeVersion: '22.0.0' }, { platforms: ['linux-arm64', 'linux-x64'] }]) {
        const f = fixture(t); Object.assign(f.metadata, change);
        assert.throws(() => f.create(), /TEST_ARCHIVE_PROFILE/);
        assert.equal(fs.existsSync(f.archive), false);
    }
});
test('wrong architecture cannot become executable through a manifest mode', t => {
    const f = fixture(t); f.metadata.platforms = ['linux-x64'];
    assert.throws(() => f.create(), /BUILD_ARCHITECTURE/);
    assert.equal(fs.existsSync(f.archive), false);
});
test('unknown native addon prevents signing', t => {
    const f = fixture(t); f.write('app/unknown.node', 'unreviewed');
    assert.throws(() => f.create(), /BUILD_ARCHITECTURE/);
});
test('outputs cannot overwrite files or reside inside the authenticated payload', t => {
    const f = fixture(t); f.create();
    assert.throws(() => f.create(), /TEST_ARCHIVE_OUTPUT/);
    const g = fixture(t);
    assert.throws(() => g.api.createTestArchive({ payloadDirectory: g.payload,
        archivePath: path.join(g.payload, 'archive.tar.gz'), publicKeyPath: g.publicFile, metadata: g.metadata }), /TEST_ARCHIVE_OUTPUT/);
});
test('readback rejects changed payload, modes, owners, links, extras, duplicates and traversal', t => {
    for (const kind of ['bytes', 'mode', 'owner', 'link', 'extra', 'duplicate', 'traversal']) {
        const f = fixture(t); f.create(); tamper(f.archive, kind);
        assert.throws(() => f.verify(), /TEST_ARCHIVE_IO/, kind);
    }
});
test('signature and out-of-band signer fingerprint remain independent trust checks', t => {
    const f = fixture(t); f.create();
    const wrong = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
    assert.throws(() => f.verify({ publicKey: wrong }), /TEST_ARCHIVE_SIGNATURE/);
    assert.throws(() => f.verify({ expectedReleaseId: '0'.repeat(64) }), /TEST_ARCHIVE_BINDING/);
    tamper(f.archive, 'signature');
    assert.throws(() => f.verify(), /TEST_ARCHIVE_SIGNATURE/);
});
test('truncated gzip and unconsumed trailing archive content are rejected', t => {
    const f = fixture(t); f.create(); fs.truncateSync(f.archive, fs.statSync(f.archive).size - 8);
    assert.throws(() => f.verify(), /TEST_ARCHIVE_IO/);
    const g = fixture(t); g.create(); fs.appendFileSync(g.archive, Buffer.from('unexpected trailer'));
    assert.throws(() => g.verify(), /TEST_ARCHIVE_IO/);
});
test('oversized hidden PAX extension is rejected before tarfile parses its body', t => {
    const f = fixture(t); f.create();
    const script = "import gzip,sys,tarfile\nh=tarfile.TarInfo('PaxHeader');h.type=tarfile.XHDTYPE;h.size=1000000000\nwith gzip.open(sys.argv[1],'wb') as g:g.write(h.tobuf(format=tarfile.USTAR_FORMAT))\n";
    const changed = spawnSync(python, ['-I', '-B', '-c', script, f.archive], { encoding: 'utf8', windowsHide: true });
    assert.equal(changed.status, 0, changed.stderr);
    assert.throws(() => f.verify(), /TEST_ARCHIVE_IO/);
});
test('canonical archive bytes repeat for identical payload, manifest and signature', t => {
    const f = fixture(t); f.create();
    const script = "import json,runpy,sys\nm=runpy.run_path(sys.argv[1]);r=m['verify'](sys.argv[2]);p=sys.argv[4];open(p,'w').write(json.dumps({'schemaVersion':1,'manifestBase64':r['manifestBase64'],'signatureBase64':r['signatureBase64']}));m['create'](sys.argv[3],p,sys.argv[5])\n";
    const repeated = path.join(f.root, 'repeat.tar.gz');
    const run = spawnSync(python, ['-I', '-B', '-c', script, path.resolve(__dirname, '../../tools/integration/test-archive.py'),
        f.archive, f.payload, path.join(f.root, 'public-input.json'), repeated], { encoding: 'utf8', windowsHide: true });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(fs.readFileSync(repeated), fs.readFileSync(f.archive));
});
test('source hardlink and directory junction cannot feed bytes outside the payload', t => {
    const f = fixture(t); fs.linkSync(path.join(f.payload, 'app/script.cjs'), path.join(f.payload, 'app/hardlink.cjs'));
    assert.throws(() => f.create(), /BUNDLE_FILE/);
    const g = fixture(t), other = path.join(g.root, 'outside'); fs.mkdirSync(other);
    fs.symlinkSync(other, path.join(g.payload, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => g.create(), /BUNDLE_FILE/);
});
test('signing requires the validator report for the exact platform and original native bytes', t => {
    for (const change of [
        result => { delete result.architectureReports; },
        result => { result.architectureReports.push(result.architectureReports[0]); },
        result => { result.architectureReports[0].platform = 'linux-x64'; },
        result => { result.architectureReports[0].target.nodeVersion = '22.0.0'; },
        result => { result.architectureReports[0].packageLockSha256 = '0'.repeat(64); },
        result => { result.architectureReports[0].nativeFiles[0].sha256 = '0'.repeat(64); },
    ]) {
        const f = fixture(t, { afterValidation: change });
        assert.throws(() => f.create(), /TEST_ARCHIVE_(ARCHITECTURE|CHANGED)/);
        assert.equal(f.api.calls.length, 1);
        assert.equal(fs.existsSync(f.archive), false);
        assert.equal(fs.existsSync(f.publicFile), false);
    }
});
test('second byte inventory rejects ordinary and native mutations after validation', t => {
    for (const relative of ['app/script.cjs', 'app/node_modules/@esbuild/linux-arm64/bin/esbuild']) {
        const f = fixture(t, { afterValidation: (_result, payload) => {
            const file = path.join(payload, relative), bytes = fs.readFileSync(file);
            bytes[bytes.length - 1] ^= 1;
            fs.writeFileSync(file, bytes);
        } });
        assert.throws(() => f.create(), /TEST_ARCHIVE_CHANGED/);
        assert.equal(f.api.calls.length, 1);
        assert.equal(fs.existsSync(f.archive), false);
        assert.equal(fs.existsSync(f.publicFile), false);
    }
});
