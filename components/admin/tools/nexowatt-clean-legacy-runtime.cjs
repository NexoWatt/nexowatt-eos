#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_ROOT = path.resolve(__dirname, '..');
const LEGACY_OVERLAYS = [
  'adminWww/js/eos-branding.js',
  'adminWww/js/eos-security-ui.js',
  'adminWww/js/eos-console-quiet.js',
  'adminWww/js/eos-objects-state-tools.js',
  'adminWww/js/eos-performance-guard.js',
  'adminWww/js/eos-runtime-fixes.js',
  'adminWww/js/eos-hard-logout.js',
  'adminWww/css/eos-branding.css',
  'src-admin/public/js/eos-branding.js',
  'src-admin/public/js/eos-security-ui.js',
  'src-admin/public/js/eos-console-quiet.js',
  'src-admin/public/js/eos-objects-state-tools.js',
  'src-admin/public/js/eos-performance-guard.js',
  'src-admin/public/js/eos-runtime-fixes.js',
  'src-admin/public/js/eos-hard-logout.js',
  'src-admin/public/css/eos-branding.css',
  // Removed 7.10.4 role-security overlays. These files must be deleted when
  // a complete repository ZIP is accidentally extracted over an older tree;
  // otherwise the sealed-release check correctly rejects them as stale input.
  'adminWww/nexowatt-role-security.js',
  'src-admin/nexowatt-role-security.js',
  'build/lib/eosRoleSecurity.js',
];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function runtimeNumber(root) {
  const info = readJson(path.join(root, 'NEXOWATT_EOS_BUILD_INFO.json'));
  const value = Number(String(info.runtimeEntry || '').replace(/^v/, ''));
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid runtimeEntry in NEXOWATT_EOS_BUILD_INFO.json: ${info.runtimeEntry}`);
  }
  return value;
}

function shellNumber(root) {
  const info = readJson(path.join(root, 'NEXOWATT_EOS_BUILD_INFO.json'));
  const candidates = [info.shellCacheVersion, info.shellCacheTag, info.label];
  for (const candidate of candidates) {
    const value = Number(String(candidate ?? '').replace(/^v/i, ''));
    if (Number.isFinite(value) && value > 0) return value;
  }
  try {
    const pkg = readJson(path.join(root, 'package.json'));
    const patch = Number(String(pkg.version || '').split('.')[2]);
    if (Number.isFinite(patch) && patch > 0) return patch;
  } catch (_) {
    // The build info remains the canonical source. The package fallback is
    // only used for isolated cleanup fixtures.
  }
  throw new Error('Invalid shellCacheVersion in NEXOWATT_EOS_BUILD_INFO.json');
}

function releaseNumber(root) {
  const pkg = readJson(path.join(root, 'package.json'));
  const parts = String(pkg.version || '').split('.').slice(0, 3).map(part => {
    const match = part.match(/^\d+/);
    return match ? match[0] : '';
  });
  if (parts.length !== 3 || parts.some(part => !part)) {
    throw new Error(`Invalid package version for release cleanup: ${pkg.version}`);
  }
  const value = Number(parts.join(''));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid package version for release cleanup: ${pkg.version}`);
  }
  return value;
}

function isLegacyVersionedTool(file, activeRelease) {
  const name = path.basename(file);
  const match = name.match(/^nexowatt-v(\d+)-.+-selftest\.cjs$/i);
  return !!match && Number(match[1]) !== activeRelease;
}

function referencedVersionedTools(root) {
  const pkg = readJson(path.join(root, 'package.json'));
  const references = new Set();
  // A retained regression may intentionally keep the version where a bug was
  // introduced. Release-number changes do not make that test obsolete.
  for (const item of pkg.files || []) {
    const relative = String(item).replace(/\\/g, '/').replace(/^\.\//, '');
    if (/^tools\/nexowatt-v\d+-.+-selftest\.cjs$/i.test(relative)) references.add(relative);
  }
  for (const command of Object.values(pkg.scripts || {})) {
    const normalized = String(command).replace(/\\/g, '/');
    const pattern = /(?:^|[\s"'=])(?:\.\/)?(tools\/nexowatt-v\d+-[A-Za-z0-9_-]+-selftest\.cjs)(?=$|[\s"';&|)])/gi;
    let match;
    while ((match = pattern.exec(normalized))) references.add(match[1]);
  }
  return references;
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile()) result.push(absolute);
    }
  }
  return result;
}

function isLegacyVersionedRuntime(file, activeRuntime, activeShell) {
  const name = path.basename(file);
  // Stable product overlays use the product release number in their filename,
  // while the compiled React runtime can intentionally remain on v84. Keep
  // only the active stable overlay and remove stale release assets left behind
  // by a flat ZIP update (for example v96 when installing v97).
  const stableMatch = name.match(/^nexowatt-stable-v(\d+)\.js$/i);
  if (stableMatch) return Number(stableMatch[1]) !== activeShell;
  const versionMatch = name.match(/-v(\d+)\.(?:js|js\.map|css|css\.map)$/i);
  if (versionMatch) return Number(versionMatch[1]) !== activeRuntime;
  const remoteMatch = name.match(/^remoteEntry-v(\d+)\.(?:js|js\.map)$/i);
  if (remoteMatch) return Number(remoteMatch[1]) !== activeRuntime;

  // Remove historical emergency bundles which predate the consolidated runtime
  // naming and must never survive in a current EOS Admin source tree.
  return /(?:DPWrite|DPAdapter|DPw\d+|NoLock|Unrestricted|force-version|delete-services-hardfix)/i.test(name) && /\.(?:js|js\.map)$/i.test(name);
}

function collectLegacyRuntimeFiles(root = DEFAULT_ROOT) {
  const activeRuntime = runtimeNumber(root);
  const activeShell = shellNumber(root);
  const activeRelease = releaseNumber(root);
  const referencedTools = referencedVersionedTools(root);
  const scanRoots = [
    path.join(root, 'adminWww', 'assets'),
    path.join(root, 'adminWww'),
    path.join(root, 'src-admin', 'build', 'assets'),
    path.join(root, 'src-admin', 'build'),
    path.join(root, 'src-admin', 'public'),
  ];
  const files = new Set();
  for (const scanRoot of scanRoots) {
    for (const file of walkFiles(scanRoot)) {
      if (isLegacyVersionedRuntime(file, activeRuntime, activeShell)) files.add(file);
    }
  }
  for (const file of walkFiles(path.join(root, 'tools'))) {
    const relative = path.relative(root, file).replace(/\\/g, '/');
    if (isLegacyVersionedTool(file, activeRelease) && !referencedTools.has(relative)) files.add(file);
  }
  for (const rel of LEGACY_OVERLAYS) {
    const file = path.join(root, rel);
    if (fs.existsSync(file)) files.add(file);
  }
  return { activeRuntime, activeShell, activeRelease, files: [...files].sort() };
}

function cleanLegacyRuntime(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const dryRun = options.dryRun === true;
  const quiet = options.quiet === true;
  const silent = options.silent === true;
  const { activeRuntime, activeShell, activeRelease, files } = collectLegacyRuntimeFiles(root);
  const removed = [];
  const failed = [];

  for (const file of files) {
    if (dryRun) {
      removed.push(file);
      continue;
    }
    try {
      try {
        fs.rmSync(file, { force: true });
      } catch (firstError) {
        // ZIP extraction tools on Windows may preserve a read-only bit. Make a
        // single controlled retry before reporting a real cleanup failure.
        try { fs.chmodSync(file, 0o666); } catch (_) { /* best effort */ }
        fs.rmSync(file, { force: true });
      }
      if (!fs.existsSync(file)) removed.push(file);
      else failed.push({ file, error: 'file still exists after removal' });
    } catch (error) {
      failed.push({ file, error: error?.message || String(error) });
    }
  }

  if (failed.length) {
    const details = failed.map(item => `${path.relative(root, item.file)}: ${item.error}`).join(os.EOL);
    throw new Error(`Could not remove ${failed.length} legacy runtime file(s):${os.EOL}${details}`);
  }

  if (!silent) {
    if (!quiet) {
      console.log(`[NexoWatt EOS runtime cleanup] OK (runtime v${activeRuntime}, shell v${activeShell}, removed ${removed.length} legacy file${removed.length === 1 ? '' : 's'})`);
    } else if (removed.length) {
      console.log(`[NexoWatt EOS runtime cleanup] removed ${removed.length} legacy runtime files before validation`);
    }
  }

  return { activeRuntime, activeShell, activeRelease, removed };
}

if (require.main === module) {
  try {
    cleanLegacyRuntime({ dryRun: process.argv.includes('--dry-run'), quiet: process.argv.includes('--quiet') });
  } catch (error) {
    console.error(`[NexoWatt EOS runtime cleanup] ERROR: ${error?.stack || error}`);
    process.exit(1);
  }
}

module.exports = {
  LEGACY_OVERLAYS,
  collectLegacyRuntimeFiles,
  cleanLegacyRuntime,
  isLegacyVersionedRuntime,
  isLegacyVersionedTool,
  releaseNumber,
  referencedVersionedTools,
  shellNumber,
};
