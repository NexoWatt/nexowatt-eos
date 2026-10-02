'use strict';
// Syntaxprüfung ohne Hunderte einzelne Node-Starts (insbesondere unter Windows).
// CommonJS wird nur kompiliert, niemals ausgeführt. ESM behält Node --check.
const fs = require('node:fs');
const vm = require('node:vm');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
function checkJavaScriptSyntax(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/^#![^\n]*(?:\n|$)/, '\n');
  try {
    if (/\.mjs$/i.test(file)) throw new Error('esm');
    new vm.Script(Module.wrap(source), { filename: file });
    return { status: 0, stderr: '' };
  } catch (_error) {
    // Browser-Bundles mit import/export sowie mögliche Syntaxfehler erhalten
    // weiterhin die originale Node-Diagnose. Die sichere Prüfung entfällt nie.
    return spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  }
}
module.exports = { checkJavaScriptSyntax };
