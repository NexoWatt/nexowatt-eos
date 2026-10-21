'use strict';
// Test harness only: prove which actual published domain implementation the
// source PostgreSQL backend will load before running its shared contract suite.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const BACKEND = path.resolve(__dirname, '../../runtime/postgresql/packages/db-objects-postgresql/index.cjs');
const fail = code => { throw Object.assign(new Error(code), { code }); };
function assertRuntime(app, backendEntry = BACKEND) {
    if (!path.isAbsolute(app || '') || fs.realpathSync(app) !== app) fail('OBJECTS725_APP_PATH');
    function check(name, anchor) {
        const directory = path.join(app, 'node_modules', name);
        if (fs.realpathSync(directory) !== directory) fail('OBJECTS725_CANONICAL_PACKAGE');
        const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
        if (manifest.name !== name || manifest.version !== '7.2.5') fail('OBJECTS725_VERSION');
        const entry = fs.realpathSync(createRequire(anchor).resolve(name));
        if (!entry.startsWith(directory + path.sep)) fail('OBJECTS725_RESOLUTION');
        return entry;
    }
    const objects = check('@iobroker/db-objects-redis', backendEntry);
    const base = check('@iobroker/db-base', objects);
    const common = check('@iobroker/js-controller-common-db', base);
    check('iobroker.js-controller', common);
    return { controllerVersion: '7.2.5', canonicalPackages: 4 };
}
module.exports = { assertRuntime };
