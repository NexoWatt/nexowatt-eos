'use strict';

// Explicit isolated-test dependency substitution; there is no production
// environment variable, adapter option or configuration bypass for EOS admission.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
module.exports = function loadLicenseModule(file, assertEosPlatform = () => true) {
    const originalRequire = createRequire(file);
    const load = name => /(?:^|\/)eos-platform$/.test(name) ? { assertEosPlatform } : originalRequire(name);
    const module = { exports: {} };
    const wrapper = vm.runInThisContext(`(function(require, module, exports, __filename, __dirname) {\n${fs.readFileSync(file, 'utf8')}\n})`, { filename: file });
    wrapper(load, module, module.exports, file, path.dirname(file));
    return module.exports;
};
