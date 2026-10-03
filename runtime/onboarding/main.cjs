#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createSetupServer } = require('./server.cjs');
const { exact, fail, validateOrigin } = require('./policy.cjs');
const { rootOwned } = require('../release/installed-check.cjs');
const { readFileLimited } = require('../release/bundle.cjs');
function loadConfiguration(file) {
    rootOwned(file);
    const config = JSON.parse(readFileLimited(file, 8192).bytes);
    if (!exact(config, ['schemaVersion', 'origin', 'bind', 'port', 'stateDirectory', 'completionFile', 'releaseId', 'tls', 'license']) ||
        config.schemaVersion !== 2 || !['0.0.0.0', '127.0.0.1', '::'].includes(config.bind) || config.port !== 8443 ||
        config.stateDirectory !== '/var/lib/nexowatt-eos/onboarding' || config.completionFile !== '/etc/nexowatt-eos/first-start-complete.json' ||
        !/^[a-f0-9]{64}$/.test(config.releaseId) || !exact(config.tls, ['certificatePath', 'privateKeyPath', 'caPath']) ||
        validateOrigin(config.origin).port !== '8443' || !exact(config.license, ['uuid', 'trustFile']) ||
        typeof config.license.uuid !== 'string' || !/^(?:[a-z]{2})?[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(config.license.uuid) ||
        config.license.trustFile !== '/etc/nexowatt-eos/license-trust.json') fail('SETUP_CONFIG');
    const tls = {};
    for (const [key, name] of [['cert', 'certificatePath'], ['key', 'privateKeyPath'], ['ca', 'caPath']]) {
        rootOwned(config.tls[name]);
        tls[key] = readFileLimited(config.tls[name], 16384).bytes;
    }
    return { ...config, tls };
}
function installShutdown(server, config, { signals = process,
    cleanup = require('./cleanup.cjs').cleanupCompleted, report = code => process.stderr.write(JSON.stringify({ code }) + '\n') } = {}) {
    let closing = false;
    function stop() {
        if (closing) return;
        closing = true;
        signals.removeListener('SIGTERM', stop); signals.removeListener('SIGINT', stop);
        server.closeAllConnections();
        server.close(() => {
            try { cleanup(config); }
            catch { signals.exitCode = 1; report('SETUP_CLEANUP_FAILED'); }
        });
    }
    signals.once('SIGTERM', stop); signals.once('SIGINT', stop);
    return stop;
}
async function main(argv = process.argv.slice(2)) {
    if (argv.length !== 2 || argv[0] !== '--config' || argv[1] !== '/etc/nexowatt-eos/onboarding.json') fail('SETUP_USAGE');
    const config = loadConfiguration(argv[1]);
    if (fs.existsSync(config.completionFile)) fail('SETUP_CLOSED');
    const app = path.resolve(__dirname, '../../app');
    const { core, publicKeys } = await require('../bootstrap/first-start-configuration.cjs').loadInstalledLicense(app);
    const server = createSetupServer({ ...config, licenseContext: { uuid: config.license.uuid, core, publicKeys } });
    installShutdown(server, config);
    server.on('error', () => { process.stderr.write('{"code":"SETUP_LISTENER_FAILED"}\n'); process.exitCode = 1; });
    server.listen(config.port, config.bind);
    return server;
}
if (require.main === module) {
    main().catch(() => { process.stderr.write('{"code":"SETUP_START_FAILED"}\n'); process.exitCode = 1; });
}
module.exports = { main, loadConfiguration, installShutdown };
