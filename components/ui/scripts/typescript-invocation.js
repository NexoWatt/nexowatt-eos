#!/usr/bin/env node
'use strict';

/**
 * Code-Teil: TypeScript-Compiler-Aufruf für Publish-Checks
 *
 * Zweck:
 * Windows-/CI-sichere Auflösung des TypeScript-Compilers. Wenn TypeScript lokal
 * installiert ist, wird direkt `node node_modules/typescript/lib/tsc.js` genutzt.
 * Dadurch hängen die Runtime-Typisierungschecks nicht mehr von `tsc.cmd` im PATH ab.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

function resolveTypeScriptInvocation(repoRoot) {
  const root = path.resolve(repoRoot || path.join(__dirname, '..'));
  const localTscJs = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
  if (fs.existsSync(localTscJs)) {
    return {
      command: process.execPath,
      argsPrefix: [localTscJs],
      label: `node ${path.relative(root, localTscJs)}`
    };
  }

  const localBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  if (fs.existsSync(localBin)) {
    return {
      command: localBin,
      argsPrefix: [],
      label: path.relative(root, localBin)
    };
  }

  return {
    command: process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
    argsPrefix: [],
    label: 'tsc aus PATH'
  };
}

function spawnTypeScript(repoRoot, args, options) {
  const invocation = resolveTypeScriptInvocation(repoRoot);
  const spawnOptions = Object.assign({}, options || {});
  if (process.platform === 'win32' && /\.cmd$/i.test(String(invocation.command || '')) && spawnOptions.shell === undefined) {
    spawnOptions.shell = true;
  }
  const result = childProcess.spawnSync(invocation.command, [...invocation.argsPrefix, ...args], spawnOptions);
  result.typescriptInvocation = invocation;
  return result;
}

function writeTypeScriptSpawnDiagnostics(result) {
  if (result && result.stdout) process.stderr.write(result.stdout);
  if (result && result.stderr) process.stderr.write(result.stderr);
  if (result && result.error) {
    const invocation = result.typescriptInvocation && result.typescriptInvocation.label ? result.typescriptInvocation.label : 'tsc';
    process.stderr.write(`[typescript-invocation] Compiler konnte nicht gestartet werden (${invocation}): ${result.error.message || result.error}\n`);
  }
}

module.exports = {
  resolveTypeScriptInvocation,
  spawnTypeScript,
  writeTypeScriptSpawnDiagnostics
};
