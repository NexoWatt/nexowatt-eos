#!/usr/bin/env node
'use strict';
// Fixed sequence-16 entry inside the independently authenticated managed kit.
// No caller-controlled installer, trust path, version or target-root selection.
const shared = require('./first-start.cjs');
const checkout = require('../system/install-managed-from-checkout.cjs');
function main(argv = process.argv.slice(2), dependencies = {}) {
    return shared.main(argv, { ...dependencies, checkout });
}
module.exports = { main };
if (require.main === module) {
    try { process.stdout.write(shared.formatSuccess(main())); }
    catch (error) { process.stderr.write(shared.formatFailure(error)); process.exitCode = 1; }
}
