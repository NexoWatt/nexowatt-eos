#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { cleanLegacyRuntime } = require('./nexowatt-clean-legacy-runtime.cjs');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-runtime-cleanup-'));
try {
  fs.mkdirSync(path.join(temp, 'adminWww', 'assets'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'adminWww', 'js'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'adminWww', 'css'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'src-admin', 'public', 'js'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'src-admin', 'public', 'static', 'js'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'adminWww', 'static', 'js'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'build', 'lib'), { recursive: true });
  fs.mkdirSync(path.join(temp, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(temp, 'NEXOWATT_EOS_BUILD_INFO.json'), JSON.stringify({ runtimeEntry: 'v82', shellCacheVersion: 98 }));
  fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({
    name: 'iobroker.eos-admin', version: '7.10.10',
    files: ['tools/nexowatt-v7109-clean-core-selftest.cjs'],
    scripts: {
      regression: 'node ./tools/nexowatt-v7108-script-kept-selftest.cjs && node "tools/nexowatt-v7107-quoted-kept-selftest.cjs"',
      windows: 'node .\\tools\\nexowatt-v7106-windows-kept-selftest.cjs',
      unrelated: 'node tools/nexowatt-v7105-ghost-selftest.cjs.backup',
    },
  }));

  const keep = [
    'adminWww/assets/bootstrap-current-v82.js',
    'adminWww/assets/Objects-current-v82.js',
    'adminWww/remoteEntry-v82.js',
    'adminWww/remoteEntry.js',
    'adminWww/static/js/nexowatt-stable-v98.js',
    'src-admin/public/static/js/nexowatt-stable-v98.js',
    'adminWww/static/js/nexowatt-stable-login.js',
    'tools/nexowatt-v7109-clean-core-selftest.cjs',
    'tools/nexowatt-v71010-current-selftest.cjs',
    'tools/nexowatt-v7108-script-kept-selftest.cjs',
    'tools/nexowatt-v7107-quoted-kept-selftest.cjs',
    'tools/nexowatt-v7106-windows-kept-selftest.cjs',
  ];
  const remove = [
    'adminWww/assets/bootstrap-old-v54.js',
    'adminWww/assets/Objects-old-v79.js',
    'adminWww/assets/index-DPWrite53.js',
    'adminWww/remoteEntry-v61.js',
    'adminWww/js/eos-branding.js',
    'adminWww/css/eos-branding.css',
    'src-admin/public/js/eos-security-ui.js',
    'adminWww/static/js/nexowatt-stable-v97.js',
    'src-admin/public/static/js/nexowatt-stable-v95.js',
    'adminWww/nexowatt-role-security.js',
    'src-admin/nexowatt-role-security.js',
    'build/lib/eosRoleSecurity.js',
    'tools/nexowatt-v7108-ui-foundation-selftest.cjs',
    'tools/nexowatt-v7105-ghost-selftest.cjs',
  ];
  for (const rel of [...keep, ...remove]) {
    const file = path.join(temp, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '// fixture');
  }

  const result = cleanLegacyRuntime({ root: temp, quiet: true, silent: true });
  assert.strictEqual(result.activeRuntime, 82);
  assert.strictEqual(result.activeShell, 98);
  assert.strictEqual(result.activeRelease, 71010);
  assert.strictEqual(result.removed.length, remove.length);
  for (const rel of keep) assert.ok(fs.existsSync(path.join(temp, rel)), `current runtime removed: ${rel}`);
  for (const rel of remove) assert.ok(!fs.existsSync(path.join(temp, rel)), `legacy file remained: ${rel}`);
  assert.strictEqual(cleanLegacyRuntime({ root: temp, quiet: true, silent: true }).removed.length, 0, 'cleanup must remain idempotent');
  console.log('[NexoWatt EOS runtime cleanup selftest] OK');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
