'use strict';
// Reproduction helper: sources and expected lock hashes are explicit CLI inputs.
// Only a new laboratory directory is created. No PostgreSQL server is contacted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { stageLaboratory } = require('../../../../runtime/postgresql/integration.cjs');
const [baseApp, pgClientRoot, directory, expectedBaseLockSha256, expectedPgLockSha256] = process.argv.slice(2);
assert.equal(process.version, 'v24.21.0');
const result = stageLaboratory({ baseApp, pgClientRoot, directory, expectedBaseLockSha256, expectedPgLockSha256, packageRoot: path.resolve(__dirname, '../../../../runtime/postgresql/packages') });
fs.writeFileSync(path.join(result.data, 'iobroker.json'), JSON.stringify({ objects: { type: 'postgresql' }, states: { type: 'postgresql' } }), { mode: 0o600, flag: 'wx' });
const check = spawnSync(process.execPath, ['--input-type=module', '-e', `
import assert from 'node:assert/strict';
const common = await import('@iobroker/js-controller-common');
for (const domain of ['objects', 'states']) {
  const plugin = await import('@iobroker/db-' + domain + '-postgresql');
  assert.equal(await common[domain === 'objects' ? 'getObjectsConstructor' : 'getStatesConstructor'](), plugin.Client);
  assert.equal(await common[domain === 'objects' ? 'objectsDbHasServer' : 'statesDbHasServer']('postgresql'), false);
}
console.log(JSON.stringify({ actualControllerDynamicLoader: 'PASS', postgresClientConstructors: 2, embeddedServers: false, networkConnectionsAttempted: false }));
`], { cwd: result.app, env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '', IOBROKER_DATA_DIR: result.data }, encoding: 'utf8', timeout: 10000, maxBuffer: 100000 });
assert.equal(check.status, 0, check.stderr);
const loader = JSON.parse(check.stdout);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
console.log(JSON.stringify({ schemaVersion: 1, status: 'offline-assembly-and-actual-loader-passed', nodeVersion: process.version, platform: `${process.platform}/${process.arch}`, generatedAt: new Date().toISOString(),
  ...loader, baseFiles: result.manifest.baseManifest.length, driverFiles: result.manifest.driverManifest.length,
  assemblyManifestSha256: sha(fs.readFileSync(path.join(directory, 'assembly.json'))),
  baseManifestSha256: sha(JSON.stringify(result.manifest.baseManifest)), driverManifestSha256: sha(JSON.stringify(result.manifest.driverManifest)),
  expectedBaseLockSha256, expectedPgLockSha256, omittedOptionalPackages: result.manifest.omittedOptionalPackages,
  overlays: result.manifest.overlays, realPostgreSQLConnection: false, controllerProcessStarted: false, adminUiStarted: false,
  productionAcceptance: false, independentAuthenticityVerification: false }, null, 2));
