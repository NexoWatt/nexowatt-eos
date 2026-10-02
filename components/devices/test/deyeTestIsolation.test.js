'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('DEYE register tests run in a fresh checkout with real transport-module loading blocked', { timeout: 30000 }, () => {
  // Use a separate process and a path with spaces. No dependency on the
  // parent's require cache, installed node_modules or Windows shell quoting.
  const root = path.resolve(__dirname, '..');
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'nexowatt DEYE test '));
  try {
    for (const dir of ['lib', 'admin']) fs.cpSync(path.join(root, dir), path.join(isolated, dir), { recursive: true });
    fs.mkdirSync(path.join(isolated, 'test', 'helpers'), { recursive: true });
    for (const file of ['deyeModbus.test.js', 'helpers/compatibilityHarness.cjs']) {
      fs.copyFileSync(path.join(root, 'test', file), path.join(isolated, 'test', file));
    }
    fs.copyFileSync(path.join(root, 'package.json'), path.join(isolated, 'package.json'));
    const blocker = path.join(isolated, 'block-real-transports.cjs');
    fs.writeFileSync(blocker, `
'use strict';
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (['modbus-serial', 'serialport', 'mqtt', 'axios'].includes(request)) {
    const error = new Error('Real transport unavailable in isolated DEYE test: ' + request);
    error.code = 'MODULE_NOT_FOUND';
    throw error;
  }
  return originalLoad.call(this, request, parent, isMain);
};
`);
    const env = { ...process.env };
    // This is a separate test runner, not another file in the parent's worker.
    // Inheriting Node's worker marker can silently skip all nested tests.
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--require', blocker, '--test', '--test-reporter=tap', path.join(isolated, 'test', 'deyeModbus.test.js')], {
      cwd: isolated,
      env,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 20000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;
    assert.equal(result.status, 0, `Isolated DEYE test failed: ${result.error?.message || result.signal || ''}\n${output}`);
    assert.match(output, /# tests 22\b/);
    assert.match(output, /# pass 22\b/);
    assert.match(output, /# fail 0\b/);
    assert.match(output, /# skipped 0\b/);
    assert.doesNotMatch(output, /Real transport unavailable/);
  } finally {
    fs.rmSync(isolated, { recursive: true, force: true });
  }
});
