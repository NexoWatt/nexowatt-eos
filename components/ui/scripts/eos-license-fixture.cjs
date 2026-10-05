'use strict';
// Actual generated modules; only root-protected EOS platform admission is
// substituted for isolated HTTPS/controller fixtures. Production modules have
// no option/environment switch to bypass EOS admission.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
function loadLicenseModule(file) {
  const originalRequire = createRequire(file);
  const load = name => /(?:^|\/)eos-platform$/.test(name) ? { assertEosPlatform: () => true } : originalRequire(name);
  return compile(file, load);
}
function compile(file, load) {
  const fixture = { exports: {} };
  vm.runInThisContext(`(function(require, module, exports, __filename, __dirname) {\n${fs.readFileSync(file, 'utf8')}\n})`, { filename: file })(load, fixture, fixture.exports, file, path.dirname(file));
  return fixture.exports;
}
const file = path.join(__dirname, '../lib/eos-integrated.js');
const originalRequire = createRequire(file);
const integrated = compile(file, name => name === '../packages/eos-license-client'
  ? loadLicenseModule(path.join(__dirname, '../packages/eos-license-client/index.js'))
  : originalRequire(name));
module.exports = { integrated, loadLicenseModule };
