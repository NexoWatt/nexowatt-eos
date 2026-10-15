'use strict';
// R10 SBOM is reconstructed from authenticated R9 plus exact reviewed deltas.
// Installed dependency resolution is unchanged; this is not a fresh audit.
const path = require('node:path');
const { isDeepStrictEqual: equal } = require('node:util');
const ROOT = path.resolve(__dirname, '../../../..');
const bundle = require(path.join(ROOT, 'runtime/release/bundle.cjs'));
const product = require(path.join(ROOT, 'runtime/product/scope.cjs'));
const { EMBEDDED } = require(path.join(ROOT, 'runtime/release/sbom-binding.cjs'));
const { verifyBuildProfile } = require(path.join(ROOT, 'runtime/controller-profile/transform.cjs'));
const backup = require(path.join(ROOT, 'runtime/controller-profile/backup-state.cjs'));
const shutdown = require(path.join(ROOT, 'runtime/controller-profile/adapter-shutdown.cjs'));
const TRANSFORMS = Object.freeze([...backup.FILES, ...shutdown.FILES]);
const { BASE_RELEASE } = require('./native-evidence.cjs');
const ASSEMBLY = 'authenticated-r9-tree-with-six-own-adapters-backup-state-and-adapter-shutdown-transforms';
const OWN = product.SPECS.filter(s => s.source);
const PROFILE_FILE = 'node_modules/iobroker.js-controller/eos-test-profile.json';
const SHUTDOWN_SOURCE = 'runtime/controller-profile/adapter-shutdown.cjs';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const sorted = rows => [...rows].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const contentRows = rows => rows.map(({ path, size, sha256 }) => ({ path, size, sha256 }));
const digest = rows => bundle.sha256(Buffer.from(JSON.stringify(sorted(rows))));
const props = c => Object.fromEntries((c.properties || []).map(p => [p.name, p.value]));
function setProps(component, additions) {
  component.properties = (component.properties || []).filter(p => !Object.hasOwn(additions, p.name));
  component.properties.push(...Object.entries(additions).map(([name, value]) => ({ name, value: String(value) })));
}
function ancestor(component) {
  return Object.fromEntries(['type', 'name', 'version', 'purl', 'hashes', 'properties', 'pedigree', 'modified']
    .filter(k => Object.hasOwn(component, k)).map(k => [k, structuredClone(component[k])]));
}
function ownedPath(relative) {
  const spec = OWN.find(s => relative.startsWith('node_modules/' + s.package + '/'));
  return !!spec && !relative.slice(('node_modules/' + spec.package + '/').length).split('/').includes('node_modules');
}
function assertDelta(before, after) {
  const old = new Map(before.map(r => [r.path, r])), now = new Map(after.map(r => [r.path, r]));
  if (old.size !== before.length || now.size !== after.length) fail('R10_SBOM_DUPLICATE');
  const changes = sorted([...new Set([...old.keys(), ...now.keys()])].flatMap(name => equal(old.get(name), now.get(name)) ? [] :
    [{ path: name, before: old.get(name) || null, after: now.get(name) || null }]));
  for (const row of changes) {
    if (ownedPath(row.path)) {
      if (Object.entries(EMBEDDED).some(([relative, name]) => name !== '@nexowatt/eos-license-client' && row.path.startsWith(relative + '/')))
        fail('R10_SBOM_EMBEDDED_THIRD_PARTY_CHANGE');
    } else if (row.path === PROFILE_FILE) {
      if (!row.before || !row.after) fail('R10_SBOM_PROFILE_REMOVED');
    } else {
      const spec = TRANSFORMS.find(f => f.relativePath === row.path);
      if (!spec || row.before?.sha256 !== spec.originalSha256 || row.after?.sha256 !== spec.sha256 ||
          row.before.mode !== row.after.mode) fail('R10_SBOM_UNDECLARED_APP_CHANGE');
    }
  }
  if (!changes.some(r => r.path === PROFILE_FILE) || TRANSFORMS.some(f => !changes.some(r => r.path === f.relativePath))) fail('R10_SBOM_REQUIRED_TRANSFORM');
  return changes;
}
function packageContract(before, after, spec) {
  if (before.name !== spec.package || after.name !== spec.package || before.version !== spec.version || after.version !== spec.version ||
      before.main !== spec.main || after.main !== spec.main) fail('R10_SBOM_PACKAGE_IDENTITY');
  const a = structuredClone(before), b = structuredClone(after), changes = [];
  for (const k of ['files', 'scripts']) { delete a[k]; delete b[k]; }
  const repository = { type: 'git', url: 'git+https://github.com/NexoWatt/nexowatt-eos.git', directory: 'components/backitup' };
  if (spec.source === 'backitup' && a.repository === undefined && equal(b.repository, repository)) {
    delete b.repository; changes.push('backup-public-repository-provenance-added');
  }
  if (!equal(a, b)) fail('R10_SBOM_PACKAGE_CONTRACT');
  return changes;
}
function bindDerivative({ app, previousApp, previousManifest, previousSbom, sourceCommit, timestamp }) {
  if (previousManifest?.sequence !== 12 || bundle.sha256(Buffer.from(JSON.stringify(previousManifest) + '\n')) !== BASE_RELEASE ||
      !/^[a-f0-9]{40}$/.test(sourceCommit || '') || !Number.isFinite(Date.parse(timestamp)) ||
      previousSbom?.bomFormat !== 'CycloneDX' || previousSbom.specVersion !== '1.5') fail('R10_SBOM_INPUT');
  const before = previousManifest.files.filter(r => r.path.startsWith('app/')).map(r => ({ ...r, path: r.path.slice(4) }));
  if (!equal(before, bundle.inventory(previousApp))) fail('R10_SBOM_BASE_CHANGED');
  const sbomBytes = bundle.readFileLimited(path.join(path.dirname(previousApp), 'sbom.cdx.json'), 16 * 1024 * 1024).bytes;
  if (bundle.sha256(sbomBytes) !== previousManifest.files.find(r => r.path === 'sbom.cdx.json')?.sha256 || !equal(JSON.parse(sbomBytes), previousSbom)) fail('R10_SBOM_BASE_CHANGED');
  const after = bundle.inventory(app), changes = assertDelta(before, after);
  const oldRows = new Map(before.map(r => [r.path, r])), newRows = new Map(after.map(r => [r.path, r]));
  const load = (root, rows, name) => {
    const bytes = bundle.readFileLimited(path.join(root, name), 16 * 1024 * 1024).bytes;
    if (!rows.has(name) || bytes.length !== rows.get(name).size || bundle.sha256(bytes) !== rows.get(name).sha256) fail('R10_SBOM_FILE_CHANGED');
    return JSON.parse(bytes);
  };
  for (const name of ['package.json', 'package-lock.json']) if (!equal(oldRows.get(name), newRows.get(name))) fail('R10_SBOM_DEPENDENCY_CHANGE');
  const bom = structuredClone(previousSbom), derivatives = [];
  delete bom.serialNumber; bom.version = 1; bom.metadata.timestamp = timestamp;
  setProps(bom.metadata, { 'eos:sbom:base-release-id': BASE_RELEASE, 'eos:sbom:previous-release-id': BASE_RELEASE,
    'eos:sbom:source-commit': sourceCommit, 'eos:sbom:assembly': ASSEMBLY, 'eos:sbom:execution-scope': product.OWN_ADAPTER_TEST,
    'eos:sbom:actual-app-file-table-sha256': digest(contentRows(after)), 'eos:sbom:actual-app-mode-table-sha256': digest(after),
    'eos:sbom:application-unchanged': 'false', 'eos:sbom:fresh-npm-resolution': 'false', 'eos:sbom:fresh-vulnerability-scan': 'false' });
  const owners = [...OWN, { package: 'iobroker.js-controller', version: '7.2.2' }, { package: '@iobroker/js-controller-cli', version: '7.2.2' }, { package: shutdown.PACKAGE, version: '7.2.2' }];
  for (const spec of owners) {
    const relative = 'node_modules/' + spec.package, prefix = relative + '/';
    const manifest = load(app, newRows, prefix + 'package.json');
    const metadataExceptions = spec.source ? packageContract(load(previousApp, oldRows, prefix + 'package.json'), manifest, spec) : [];
    const matches = bom.components.filter(c => c.name === spec.package && c.version === spec.version && !props(c)['eos:scope']);
    if (matches.length !== 1 || manifest.name !== spec.package || manifest.version !== spec.version) fail('R10_SBOM_COMPONENT');
    const component = matches[0], previous = ancestor(component), tree = after.filter(r => r.path.startsWith(prefix));
    if (spec.package === shutdown.PACKAGE) setProps(component, { 'eos:transform:source-path': SHUTDOWN_SOURCE,
      'eos:transform:source-sha256': bundle.sha256(bundle.readFileLimited(path.join(ROOT, SHUTDOWN_SOURCE)).bytes) });
    delete component.hashes; component.modified = true;
    component.pedigree = { ancestors: [previous], notes: 'R10 TEST derivative of authenticated R9. Current signed inventory and derivative digests bind installed bytes, not ancestor archive hashes.' };
    const treeSha256 = digest(contentRows(tree)), modeTreeSha256 = digest(tree), ownerChanges = changes.filter(r => r.path.startsWith(prefix));
    setProps(component, { 'eos:derivative:base-release-id': BASE_RELEASE, 'eos:derivative:source-commit': sourceCommit,
      'eos:derivative:installed-path': relative, 'eos:derivative:tree-sha256': treeSha256,
      'eos:derivative:mode-tree-sha256': modeTreeSha256, 'eos:derivative:change-table-sha256': digest(ownerChanges),
      'eos:derivative:local-archive-integrity': 'not-claimed; authenticated signed-file-table is authoritative' });
    derivatives.push({ package: spec.package, version: spec.version, treeSha256, modeTreeSha256, changedFiles: ownerChanges.length, metadataExceptions });
  }
  for (const [relative, name] of Object.entries(EMBEDDED)) {
    const tree = after.filter(r => r.path.startsWith(relative + '/'));
    if (!tree.length) continue;
    const matches = bom.components.filter(c => props(c)['eos:installed-path'] === relative && props(c)['eos:scope'] === 'embedded-package-files-observed-in-runtime-tree');
    const pkg = load(app, newRows, relative + '/package.json');
    if (matches.length !== 1 || matches[0].name !== name || matches[0].version !== pkg.version) fail('R10_SBOM_EMBEDDED_IDENTITY');
    const component = matches[0], treeSha256 = digest(contentRows(tree).map(r => ({ ...r, path: r.path.slice(relative.length + 1) })));
    if (props(component)['eos:tree-sha256'] !== treeSha256) {
      const previous = ancestor(component); delete component.hashes; component.modified = true;
      component.pedigree = { ancestors: [previous], notes: 'R10 reviewed embedded own-source derivative; exact installed tree is authoritative.' };
    }
    setProps(component, { 'eos:manifest-sha256': newRows.get(relative + '/package.json').sha256, 'eos:tree-sha256': treeSha256 });
  }
  const profile = verifyBuildProfile(app, product.admittedAdapters(product.OWN_ADAPTER_TEST));
  profile.files.push({ relativePath: 'node_modules/iobroker.js-controller/package.json', sha256: newRows.get('node_modules/iobroker.js-controller/package.json').sha256 });
  const backupEvidence = backup.verifyBuild(app), shutdownEvidence = shutdown.verifyBuild(app);
  profile.files.push(...[...backupEvidence.files, ...shutdownEvidence.files].map(({ relativePath, sha256 }) => ({ relativePath, sha256 })));
  for (const name of ['iobroker.js-controller', '@iobroker/js-controller-cli', '@iobroker/ws-server', shutdown.PACKAGE]) {
    const table = profile.files.filter(r => r.relativePath.startsWith('node_modules/' + name + '/')).sort((a, b) => a.relativePath < b.relativePath ? -1 : 1);
    if (!table.length) continue;
    const component = bom.components.find(c => c.name === name && !props(c)['eos:scope']);
    if (!component || !component.modified || component.hashes) fail('R10_SBOM_TRANSFORM_COMPONENT');
    setProps(component, { 'eos:transform:file-table-sha256': bundle.sha256(Buffer.from(JSON.stringify(table))) });
  }
  return { bom, evidence: { schemaVersion: 1, kind: 'eos-r10-authenticated-own-adapter-derivative-sbom', previousReleaseId: BASE_RELEASE,
    sourceCommit, timestamp, actualAppFileTableSha256: digest(contentRows(after)), actualAppModeTableSha256: digest(after),
    previousSbomExactBytesSha256: bundle.sha256(sbomBytes), changes, derivatives, backupTransform: backupEvidence, adapterShutdownTransform: shutdownEvidence,
    adapterShutdownSource: { path: SHUTDOWN_SOURCE, sha256: bundle.sha256(bundle.readFileLimited(path.join(ROOT, SHUTDOWN_SOURCE)).bytes) },
    dependencyLockUnchanged: true, thirdPartyChangesLimitedToExactBackupAndShutdownTransforms: true, npmResolutionPerformed: false,
    vulnerabilityScanPerformed: false, operatingSystemInventoryIncluded: false, hardwareTested: false, productionReleaseApproved: false } };
}
module.exports = { ASSEMBLY, PROFILE_FILE, SHUTDOWN_SOURCE, OWN, TRANSFORMS, assertDelta, packageContract, bindDerivative, digest, contentRows };
