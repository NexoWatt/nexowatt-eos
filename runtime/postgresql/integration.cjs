'use strict';
// Experimental laboratory assembly only. No installer, release admission,
// production bootstrap or existing application is changed by this module.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

const PACKAGES = Object.freeze([
  ['store', '@nexowatt/eos-postgresql-store'],
  ['db-objects-postgresql', '@iobroker/db-objects-postgresql'],
  ['db-states-postgresql', '@iobroker/db-states-postgresql'],
]);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = code => { const error = new Error(code); error.code = code; throw error; };
const inside = (root, target) => target === root || target.startsWith(root + path.sep);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function directoryPath(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || path.resolve(value) !== value ||
      !fs.lstatSync(value).isDirectory() || fs.realpathSync(value) !== value) fail('PG_LAB_DIRECTORY_REQUIRED');
  return value;
}

function inventoryTree(input) {
  const root = directoryPath(input), entries = []; let total = 0;
  function visit(relative) {
    for (const name of fs.readdirSync(path.join(root, relative)).sort()) {
      const entry = relative ? `${relative}/${name}` : name;
      const absolute = path.join(root, entry), stat = fs.lstatSync(absolute);
      if (stat.isDirectory()) visit(entry);
      else if (stat.isSymbolicLink()) {
        const link = fs.readlinkSync(absolute);
        if (path.isAbsolute(link) || !inside(root, path.resolve(path.dirname(absolute), link)) ||
            !inside(root, fs.realpathSync(absolute))) fail('PG_LAB_SYMLINK_ESCAPE');
        entries.push({ path: entry, type: 'symlink', target: link });
      } else if (stat.isFile()) {
        total += stat.size;
        if (stat.size > 128 * 1024 * 1024 || total > 2 * 1024 * 1024 * 1024) fail('PG_LAB_SIZE_LIMIT');
        entries.push({ path: entry, type: 'file', mode: stat.mode & 0o777, size: stat.size, sha256: digest(fs.readFileSync(absolute)) });
      } else fail('PG_LAB_SPECIAL_FILE');
      if (entries.length > 60000) fail('PG_LAB_FILE_LIMIT');
    }
  }
  visit(''); return entries;
}

function verifyLock(root, expectedHash) {
  if (typeof expectedHash !== 'string' || !/^[a-f0-9]{64}$/.test(expectedHash)) fail('PG_LAB_EXPECTED_LOCK_HASH_REQUIRED');
  const bytes = fs.readFileSync(path.join(root, 'package-lock.json'));
  if (digest(bytes) !== expectedHash) fail('PG_LAB_LOCK_HASH_MISMATCH');
  return JSON.parse(bytes);
}

function copyVerifiedTree(source, destination) {
  const before = inventoryTree(source);
  fs.cpSync(source, destination, { recursive: true, dereference: false, verbatimSymlinks: true, errorOnExist: true, force: false });
  const after = inventoryTree(destination);
  if (JSON.stringify(before) !== JSON.stringify(after) || JSON.stringify(before) !== JSON.stringify(inventoryTree(source))) fail('PG_LAB_COPY_INTEGRITY');
  return before;
}

function validateExperimentalProfile(config, validateConnection) {
  if (!plain(config) || !plain(config.system) || config.system.compact !== false ||
      config.system.allowShellCommands !== false || config.multihostService?.enabled !== false ||
      config.system.hostname !== 'eos-postgresql-lab' || config.plugins?.sentry?.enabled !== false ||
      Object.keys(config.plugins).some(key => key !== 'sentry')) fail('PG_LAB_PROFILE');
  if (typeof validateConnection !== 'function') fail('PG_LAB_VALIDATOR_REQUIRED');
  for (const domain of ['objects', 'states']) {
    if (!plain(config[domain]) || config[domain].type !== 'postgresql') fail('PG_LAB_DATABASE_TYPE');
    validateConnection(config[domain], domain);
  }
  return { kind: 'eos-postgresql-experimental-laboratory', configurationMatchesProfile: true,
    installerEnabled: false, releaseApproved: false, hardwareVerified: false, encryptedConnectionVerified: false };
}

function stageLaboratory({ baseApp, pgClientRoot, packageRoot, directory, expectedBaseLockSha256, expectedPgLockSha256 }) {
  baseApp = directoryPath(baseApp); pgClientRoot = directoryPath(pgClientRoot); packageRoot = directoryPath(packageRoot);
  if (typeof directory !== 'string' || !path.isAbsolute(directory) || path.resolve(directory) !== directory ||
      [baseApp, pgClientRoot, packageRoot].some(root => inside(root, directory) || inside(directory, root)) ||
      fs.existsSync(directory) || fs.realpathSync(path.dirname(directory)) !== path.dirname(directory)) fail('PG_LAB_FRESH_DESTINATION_REQUIRED');
  const parent = fs.lstatSync(path.dirname(directory));
  if (!parent.isDirectory() || typeof process.getuid !== 'function' || parent.uid !== process.getuid() ||
      (parent.mode & 0o022) !== 0) fail('PG_LAB_TRUSTED_PARENT_REQUIRED');
  verifyLock(baseApp, expectedBaseLockSha256);
  const pgLock = verifyLock(pgClientRoot, expectedPgLockSha256);
  const baseController = JSON.parse(fs.readFileSync(path.join(baseApp, 'node_modules/iobroker.js-controller/package.json')));
  if (baseController.name !== 'iobroker.js-controller' || baseController.version !== '7.2.2') fail('PG_LAB_CONTROLLER_VERSION');
  if (pgLock.packages?.['node_modules/pg']?.version !== '8.23.1') fail('PG_LAB_DRIVER_VERSION');
  // Check the actual installed public package versions against the isolated lock.
  // Platform/optional packages omitted by the original offline installation are
  // recorded as absent, never silently represented as installed components.
  const omittedOptionalPackages = [];
  for (const [relative, spec] of Object.entries(pgLock.packages || {})) {
    if (!relative) continue;
    if (!/^node_modules\/(?:@[a-z0-9_-]+\/)?[a-z0-9_-]+$/.test(relative) || !spec.integrity?.startsWith('sha512-')) fail('PG_LAB_DRIVER_LOCK');
    const metadataPath = path.join(pgClientRoot, relative, 'package.json');
    if (!fs.existsSync(metadataPath) && spec.optional === true) { omittedOptionalPackages.push(relative); continue; }
    const actual = JSON.parse(fs.readFileSync(metadataPath));
    if (actual.name !== relative.slice('node_modules/'.length) || actual.version !== spec.version) fail('PG_LAB_DRIVER_TREE_MISMATCH');
  }
  for (const name of fs.readdirSync(path.join(pgClientRoot, 'node_modules'))) {
    if (name === '.package-lock.json') continue;
    if (name.startsWith('@')) {
      for (const child of fs.readdirSync(path.join(pgClientRoot, 'node_modules', name))) {
        if (!Object.hasOwn(pgLock.packages, `node_modules/${name}/${child}`)) fail('PG_LAB_UNTRACKED_DRIVER_PACKAGE');
      }
    } else if (!Object.hasOwn(pgLock.packages, `node_modules/${name}`)) fail('PG_LAB_UNTRACKED_DRIVER_PACKAGE');
  }
  fs.mkdirSync(directory, { mode: 0o700 });
  try {
    const app = path.join(directory, 'app');
    const baseManifest = copyVerifiedTree(baseApp, app);
    const overlays = [];
    for (const [folder, name] of PACKAGES) {
      const source = path.join(packageRoot, folder), destination = path.join(app, 'node_modules', name);
      const metadata = JSON.parse(fs.readFileSync(path.join(source, 'package.json')));
      if (metadata.name !== name || !/^0\.1\.0-dev\.\d+$/.test(metadata.version) || metadata.private !== true ||
          metadata.scripts && Object.keys(metadata.scripts).length || fs.existsSync(destination)) fail('PG_LAB_PACKAGE_IDENTITY');
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      overlays.push({ name, version: metadata.version, files: copyVerifiedTree(source, destination) });
    }
    const storeDirectory = path.join(app, 'node_modules/@nexowatt/eos-postgresql-store');
    const driverManifest = copyVerifiedTree(path.join(pgClientRoot, 'node_modules'), path.join(storeDirectory, 'node_modules'));
    fs.copyFileSync(path.join(pgClientRoot, 'package-lock.json'), path.join(directory, 'pg-package-lock.json'), fs.constants.COPYFILE_EXCL);
    const appRequire = createRequire(path.join(app, 'package.json'));
    for (const [, name] of PACKAGES.slice(1)) {
      const loaded = appRequire(name);
      if (typeof loaded.Client !== 'function' || loaded.Server != null) fail('PG_LAB_PLUGIN_EXPORTS');
    }
    const manifest = { schemaVersion: 1, kind: 'eos-postgresql-experimental-laboratory', controllerVersion: '7.2.2',
      pgVersion: '8.23.1', copiedAt: new Date().toISOString(), expectedBaseLockSha256, expectedPgLockSha256,
      networkAccessUsed: false, lifecycleScriptsExecuted: false, productionTreeModified: false, releaseApproved: false,
      upstreamAuthenticityProvenByThisCopy: false, omittedOptionalPackages, baseManifest, overlays, driverManifest };
    fs.writeFileSync(path.join(directory, 'assembly.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    fs.mkdirSync(path.join(directory, 'data'), { mode: 0o700 });
    return { app, data: path.join(directory, 'data'), manifest };
  } catch (error) {
    // Only the exclusively created laboratory directory is eligible for cleanup.
    fs.rmSync(directory, { recursive: true, force: true }); throw error;
  }
}

module.exports = { inventoryTree, copyVerifiedTree, validateExperimentalProfile, stageLaboratory };
