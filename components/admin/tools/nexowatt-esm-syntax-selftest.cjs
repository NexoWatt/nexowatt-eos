#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const buildInfo = JSON.parse(fs.readFileSync(path.join(root, 'NEXOWATT_EOS_BUILD_INFO.json'), 'utf8'));
const runtime = buildInfo.runtimeEntry;
const assetsDir = path.join(root, 'adminWww', 'assets');
const classicDir = path.join(root, 'adminWww', 'js');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt-esm-check-'));
const failures = [];

try {
  const files = fs.readdirSync(assetsDir)
    .filter(name => name.endsWith('.js'))
    .map(name => ({ type: 'module', file: path.join(assetsDir, name) }));

  for (const file of [
    path.join(root, 'adminWww', `remoteEntry-${runtime}.js`),
    path.join(root, 'adminWww', 'remoteEntry.js'),
  ]) {
    if (!fs.existsSync(file)) failures.push(`missing module ${path.relative(root, file)}`);
    else files.push({ type: 'module', file });
  }

  for (const name of fs.readdirSync(classicDir).filter(name => name.endsWith('.js'))) {
    files.push({ type: 'classic', file: path.join(classicDir, name) });
  }

  const activeBootstrap = path.join(assetsDir, `bootstrap-COulQZax-${runtime}.js`);
  if (!fs.existsSync(activeBootstrap)) failures.push(`missing active bootstrap ${path.relative(root, activeBootstrap)}`);
  else {
    const text = fs.readFileSync(activeBootstrap, 'utf8');
    if (/},\s*const\s+NEXOWATT_NATIVE_SHELL_VERSION/.test(text)) {
      failures.push(`${path.relative(root, activeBootstrap)} contains the invalid "},const" statement boundary`);
    }
  }

  const listPath = path.join(tempDir, 'files.json');
  const checkerPath = path.join(tempDir, 'checker.cjs');
  fs.writeFileSync(listPath, JSON.stringify(files));
  fs.writeFileSync(checkerPath, `
'use strict';
const fs = require('fs');
const vm = require('vm');
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const errors = [];
for (const row of rows) {
  try {
    const source = fs.readFileSync(row.file, 'utf8');
    if (row.type === 'module') new vm.SourceTextModule(source, { identifier: row.file });
    else new vm.Script(source, { filename: row.file });
  } catch (error) {
    errors.push(row.file + '\\n' + (error && error.stack ? error.stack : String(error)));
  }
}
if (errors.length) {
  console.error(errors.join('\\n\\n'));
  process.exit(1);
}
`);

  const checked = spawnSync(process.execPath, ['--experimental-vm-modules', checkerPath, listPath], {
    encoding: 'utf8',
    timeout: 90_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (checked.error) failures.push(`syntax checker failed: ${checked.error.message}`);
  if (checked.status !== 0) failures.push((checked.stderr || checked.stdout || 'syntax checker failed').trim());
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`[NexoWatt EOS ESM syntax] ${failures.length} failure(s):\n${failures.join('\n\n')}`);
  process.exit(1);
}
console.log('[NexoWatt EOS ESM syntax] OK');
