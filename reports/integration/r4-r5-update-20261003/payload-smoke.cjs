'use strict';
// Reproducible unsigned working-tree gate, never a release build/publication.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const B = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
const build = require(path.join(ROOT, 'tools/system/build-bundle.cjs'));
const C = require(path.join(ROOT, 'reports/integration/installable-test3-r5-20261003/build-revision.cjs'));
const { bindDerivative } = require(path.join(ROOT, 'tools/integration/bind-r5-derivative-sbom.cjs'));
const { verifyTestArchive } = require(path.join(ROOT, 'tools/integration/create-test-archive.cjs'));
const work = fs.mkdtempSync('/tmp/eos-r5-payload-smoke-');
try {
    const archive = path.join(ROOT, C.BASE.directory, C.BASE.archive);
    const key = fs.readFileSync(path.join(ROOT, C.BASE.directory, 'release-public.pem'));
    const checked = verifyTestArchive({ archivePath: archive, publicKey: key, expectedReleaseId: C.BASE.releaseId, platform: 'linux-arm64' });
    const result = cp.spawnSync('/usr/bin/python3', ['-I', '-B', 'tools/system/extract-test-bundle.py', '--archive', archive,
        '--destination', path.join(work, 'base'), '--sha256', C.BASE.sha256], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
    if (result.status !== 0) throw new Error('EXTRACT_FAILED');
    const old = path.join(work, 'base/bundle/payload'), app = path.join(work, 'app');
    build.copyDirectory(path.join(old, 'app'), app);
    for (const name of C.OVERLAYS) {
        const dst = path.join(app, 'node_modules/iobroker.eos-admin', name);
        fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(path.join(ROOT, 'components/admin', name), dst);
    }
    fs.copyFileSync(path.join(ROOT, 'runtime/postgresql/packages/db-objects-postgresql/index.cjs'),
        path.join(app, 'node_modules/@iobroker/db-objects-postgresql/index.cjs'));
    // This is deliberately a marked syntactic fixture, not source provenance.
    // The actual release builder requires a clean checkout and real Git HEAD.
    const derivative = bindDerivative({ app, previousManifest: checked.manifest,
        previousSbom: JSON.parse(fs.readFileSync(path.join(old, 'sbom.cdx.json'))), previousReleaseId: C.BASE.releaseId,
        sourceCommit: '0'.repeat(40), timestamp: '2026-10-03T00:00:00Z' });
    const sbom = path.join(work, 'sbom.json'), catfile = path.join(work, 'catalog.json'), payload = path.join(work, 'payload');
    fs.writeFileSync(sbom, JSON.stringify(derivative.bom));
    const cat = JSON.parse(fs.readFileSync(path.join(old, 'catalog.json'))); cat.catalogRevision = 4;
    fs.writeFileSync(catfile, JSON.stringify(cat));
    const files = build.preparePayload({ appDirectory: app, destination: payload, catalogFile: catfile, sbomFile: sbom });
    const { componentTreeDigest } = require(path.join(ROOT, 'runtime/policy/admission.cjs'));
    for (const entry of cat.entries) entry.sha256 = componentTreeDigest(build.componentRows(files, entry.package));
    fs.writeFileSync(path.join(payload, 'catalog.json'), JSON.stringify(cat));
    const observed = build.validatePayload(payload, { ...checked.manifest, sequence: 8, files: B.inventory(payload) });
    const report = { schemaVersion: 1, kind: 'unsigned-working-tree-full-payload-smoke', passed: true,
        baseSignatureVerified: true, baseReleaseId: C.BASE.releaseId, derivatives: derivative.evidence.derivatives,
        installedPackages: observed.sbom.installedPackages, embeddedPackages: observed.sbom.embeddedPackages,
        architectureReports: observed.architectureReports, sourceCommitFieldWasSyntacticFixture: true, fixtureSourceCommit: '0'.repeat(40),
        artifactSigned: false, piUpdatePerformed: false, hardwareTested: false, productionReleaseApproved: false };
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally { fs.rmSync(work, { recursive: true, force: true }); }
