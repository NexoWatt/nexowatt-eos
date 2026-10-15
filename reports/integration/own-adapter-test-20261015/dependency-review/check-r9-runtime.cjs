'use strict';
// Manufacturer-side, read-only inspection of the immutable R9 artifact.
// No adapter entry point, listener, installation, CA, or dependency update.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const RELEASE = '97780e881765e2c9854e81ac7187b3ed120eccc8cc0dea0821492c9a54e23000';
const PINS = Object.freeze({
  'node_modules/@iobroker/js-controller-common-db/build/cjs/lib/common/tools.js': 'f7499955dc5a935e8eea9eff7afab20c9c8d4b86b5098a58121c44605a776ad3',
  'node_modules/@iobroker/js-controller-common-db/build/esm/lib/common/tools.js': 'c32efa42a0bdd94dd035dbdb9c1b47b715f475d37beb28034c20aeb3bead4a86',
  'node_modules/ocpp-rpc/lib/validator.js': '70206398cc7cac726cbae1ec22f2a594a05f1fa05f7cea3f01767c9a9e20c293',
  'node_modules/ocpp-rpc/lib/standard-validators.js': '57d04ee9af23755ebfe0e8d45cc25e26ee952ac17f2d7f2ee2c9ae9184eebf9e',
  'node_modules/ocpp-rpc/lib/client.js': '2d4d9252e4db7daf495b05d58f073daf30719ca4b724b40d9911821109b13da1',
  'node_modules/node-forge/lib/rsa.js': 'fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50'
});
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length, 3, 'Usage: node check-r9-runtime.cjs /absolute/authenticated-r9/bundle/payload/app');
const app = process.argv[2];
assert(path.isAbsolute(app) && fs.realpathSync(app) === app, 'Use an absolute, non-symlink app path');
const bundle = path.dirname(path.dirname(app));
assert.equal(path.basename(app), 'app');
assert.equal(path.basename(path.dirname(app)), 'payload');
const manifestBytes = fs.readFileSync(path.join(bundle, 'manifest.json'));
assert.equal(hash(manifestBytes), RELEASE, 'Not the independently authenticated R9 manifest');
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.sequence, 12);
const inventory = new Map(manifest.files.map(row => [row.path, row]));
let verifiedFiles = 0, codeFiles = 0, codeBytes = 0, manifestFiles = 0;
const forgeReferences = [], forgeDependencyManifests = [], packages = [];
const pins = [];

function authenticatedBytes(relative) {
  assert(!relative.split('/').some(p => !p || p === '.' || p === '..'));
  const filename = path.join(app, relative);
  const stat = fs.lstatSync(filename);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'No symlink/special-file input');
  const row = inventory.get('app/' + relative);
  assert(row, 'File missing from pinned inventory: ' + relative);
  const bytes = fs.readFileSync(filename);
  assert.equal(bytes.length, row.size, 'Size drift: ' + relative);
  assert.equal(hash(bytes), row.sha256, 'Content drift: ' + relative);
  verifiedFiles++;
  return bytes;
}

for (const [relative, expected] of Object.entries(PINS)) {
  assert.equal(hash(authenticatedBytes(relative)), expected);
  pins.push({ path: relative, sha256: expected });
}
// Lexical consumer inventory is deliberately not called a complete call graph.
// The signed table bounds the scan and every inspected byte is hash-checked.
for (const row of manifest.files) {
  if (!row.path.startsWith('app/node_modules/')) continue;
  const relative = row.path.slice(4);
  if (relative.endsWith('/package.json')) {
    const pkg = JSON.parse(authenticatedBytes(relative));
    manifestFiles++;
    if (pkg.name === 'node-forge' || pkg.name === 'ajv' || pkg.name === 'ocpp-rpc')
      packages.push({ path: relative, name: pkg.name, version: pkg.version });
    for (const kind of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      if (pkg[kind]?.['node-forge']) forgeDependencyManifests.push({ path: relative, name: pkg.name, version: pkg.version, kind, declared: pkg[kind]['node-forge'] });
    }
  }
  if (!/\.(?:[cm]?js|jsx|tsx?)$/.test(relative)) continue;
  const bytes = authenticatedBytes(relative);
  codeFiles++; codeBytes += bytes.length;
  if (!relative.startsWith('node_modules/node-forge/') && bytes.includes(Buffer.from('node-forge')))
    forgeReferences.push({ path: relative, sha256: row.sha256 });
}
assert.deepEqual(forgeReferences.map(x => x.path).sort(), [
  'node_modules/@iobroker/js-controller-common-db/build/cjs/lib/common/tools.js',
  'node_modules/@iobroker/js-controller-common-db/build/esm/lib/common/tools.js'
]);
const cjs = authenticatedBytes(forgeReferences.find(x => x.path.includes('/cjs/')).path).toString('utf8');
assert(cjs.includes('const crt = pki.certificateFromPem(cert);'));
assert(cjs.includes('pki.rsa.generateKeyPair({ bits: 2048, e: 65537 })'));
assert(cjs.includes('cert.sign(keys.privateKey, import_node_forge.default.md.sha256.create());'));
assert(!/\.verify\s*\(|verifyCertificateChain/.test(cjs));
const fromCommonDb = createRequire(path.join(app, 'node_modules/@iobroker/js-controller-common-db/package.json'));
const fromOcpp = createRequire(path.join(app, 'node_modules/ocpp-rpc/package.json'));
const relativeResolution = (r, spec) => path.relative(app, r.resolve(spec)).split(path.sep).join('/');
const resolution = {
  forgeFromCommonDb: relativeResolution(fromCommonDb, 'node-forge'),
  ajvFromOcpp: relativeResolution(fromOcpp, 'ajv'),
  ajvMetadataFromOcpp: relativeResolution(fromOcpp, 'ajv/package.json')
};
assert.equal(resolution.forgeFromCommonDb, 'node_modules/node-forge/lib/index.js');
assert.equal(resolution.ajvMetadataFromOcpp, 'node_modules/ocpp-rpc/node_modules/ajv/package.json');
assert.equal(JSON.parse(authenticatedBytes(resolution.ajvMetadataFromOcpp)).version, '8.14.0');
// Hard process deadline also bounds synchronous schema compilation; a timer alone would not.
const boundedChecks = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'schema-check-worker.cjs'), app], {
  encoding: 'utf8', timeout: 5000, maxBuffer: 32768, windowsHide: true,
  env: { PATH: process.env.PATH || '', LC_ALL: 'C' }
}));
assert.equal(boundedChecks.ok, true);
process.stdout.write(JSON.stringify({
  schemaVersion: 1, kind: 'eos-r9-runtime-dependency-reachability-review',
  evaluatedAt: new Date().toISOString(), sourceReleaseId: RELEASE, sequence: 12,
  reviewImplementation: {
    baseRepositoryCommit: 'e4616fec2a56cd7c6c013df090bdda00a0c37f54',
    checkerSha256: hash(fs.readFileSync(__filename)),
    workerSha256: hash(fs.readFileSync(path.join(__dirname, 'schema-check-worker.cjs')))
  },
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  authentication: { manifestSha256Matched: true, inspectedFilesMatchedSignedInventory: true,
    note: 'Independent archive/signature/full inventory verification is a prerequisite; this check does not repeat signature verification.' },
  inventory: { verifiedFileReadOperations: verifiedFiles, codeFiles, codeBytes, packageManifests: manifestFiles,
    codeExtensions: ['js', 'cjs', 'mjs', 'jsx', 'ts', 'tsx'], includeMinifiedCode: true, sourceMapsInspected: false },
  packages, pins, forgeReferences, forgeDependencyManifests, resolution, boundedChecks,
  assessment: {
    forge: 'Affected package present. Examined literal-name consumers parse/sign certificates, not RSA signature verification. No complete dynamic call-graph or exploitability conclusion.',
    ajv: 'Affected package present. Exact ocpp-rpc validator does not enable $data; that advisory precondition is not active in the tested factory and bundled validators. Not a blanket statement about regex safety.',
    upgrade: 'Blind AJV override breaks legacy URN schema loading; preserve this expected-failure regression until validator/schema migration is validated.',
    status: 'open_scoped_reachability_review',
    productionApproval: false, hardwareTested: false, dependencyUpdatesApplied: false,
    vulnerabilityScanPerformed: false, completeSecurityAssessment: false,
    limitations: ['Lexical literal-name search can miss bundled/renamed or dynamically constructed imports.',
      'Read-only isolated artifact checks do not prove runtime OS/DB isolation or live configuration.',
      'No adapter entry point, live system, certificate authority, or physical command was executed.',
      'Existing findings and audit results are not suppressed or closed by this report.']
  }
}, null, 2) + '\n');
