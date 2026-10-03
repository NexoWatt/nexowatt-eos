#!/usr/bin/env node
'use strict';
// Fixed root-only post-initialization step. The setup UID never opens the DB.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { checkInstalled, rootOwned } = require('../../runtime/release/installed-check.cjs');
const { readFileLimited } = require('../../runtime/release/bundle.cjs');
const { readConfig } = require('../../security/verify-runtime-tls.cjs');
const { assertRuntimeConfig, MARKER } = require('../../runtime/bootstrap/initialize.cjs');
const databases = require('../../runtime/transport/databases.cjs');
const { exact, validateOrigin } = require('../../runtime/onboarding/policy.cjs');
const { privateWrite } = require('./install-host.cjs');
const DIRECTORY = '/etc/nexowatt-eos';
const fail = code => { throw Object.assign(new Error(code), { code }); };
const silent = Object.fromEntries(['silly', 'debug', 'info', 'warn', 'error'].map(key => [key, () => {}]));
function publicContext({ draft, releaseId, record, normalizeUuid }) {
    if (!exact(draft, ['schemaVersion', 'origin', 'bind', 'port', 'stateDirectory', 'completionFile', 'releaseId', 'tls']) ||
        draft.schemaVersion !== 1 || draft.releaseId !== releaseId || !/^[a-f0-9]{64}$/.test(releaseId) ||
        draft.bind !== '0.0.0.0' || draft.port !== 8443 || validateOrigin(draft.origin).port !== '8443' ||
        draft.stateDirectory !== '/var/lib/nexowatt-eos/onboarding' || draft.completionFile !== DIRECTORY + '/first-start-complete.json' ||
        !exact(draft.tls, ['certificatePath', 'privateKeyPath', 'caPath']) ||
        draft.tls.certificatePath !== DIRECTORY + '/web/setup.crt' || draft.tls.privateKeyPath !== DIRECTORY + '/web/setup.key' ||
        draft.tls.caPath !== DIRECTORY + '/web/ca.crt') fail('SETUP_CONTEXT_CONFIG');
    if (record?._id !== 'system.meta.uuid' || record.type !== 'meta') fail('SETUP_CONTEXT_IDENTITY');
    const uuid = normalizeUuid(record.native?.uuid);
    return { ...draft, schemaVersion: 2, license: { uuid, trustFile: DIRECTORY + '/license-trust.json' } };
}
async function prepareContext() {
    if (process.getuid?.() !== 0) fail('SETUP_CONTEXT_ROOT_REQUIRED');
    const releasePath = fs.realpathSync('/opt/nexowatt/eos/current');
    if (path.resolve(__dirname, '../..') !== releasePath) fail('SETUP_CONTEXT_RELEASE_CHANGED');
    const evidencePath = path.join('/opt/nexowatt/eos/verified', path.basename(releasePath));
    const installed = checkInstalled({ releasePath, evidencePath });
    const draftFile = DIRECTORY + '/onboarding.pending.json';
    for (const file of [draftFile, DIRECTORY + '/iobroker.json', DIRECTORY + '/license-trust.json',
        '/var/lib/nexowatt-eos/.initialized']) rootOwned(file);
    if (JSON.parse(readFileLimited('/var/lib/nexowatt-eos/.initialized', 16384).bytes).releaseId !== installed.releaseId ||
        fs.existsSync(DIRECTORY + '/onboarding.json') || fs.existsSync(DIRECTORY + '/license-device.json') ||
        fs.existsSync(DIRECTORY + '/first-start-complete.json')) fail('SETUP_CONTEXT_STATE');
    const draft = JSON.parse(readFileLimited(draftFile, 8192).bytes);
    const config = assertRuntimeConfig(readConfig(DIRECTORY + '/iobroker.json'));
    const requireApp = createRequire(path.join(releasePath, 'app/package.json'));
    const { normalizeUuid, validatePublicKeys } = requireApp('iobroker.eos-admin/build/lib/eosLicenseCore.js');
    validatePublicKeys(JSON.parse(readFileLimited(DIRECTORY + '/license-trust.json', 32768).bytes));
    const { Objects } = databases.clients(requireApp, config);
    let objects;
    try {
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Object.assign(new Error('SETUP_CONTEXT_DATABASE_TIMEOUT'), { code: 'SETUP_CONTEXT_DATABASE_TIMEOUT' })), 5000);
            try { objects = new Objects({ connection: structuredClone(config.objects), logger: silent,
                connected: () => { clearTimeout(timer); resolve(); }, disconnected: () => {}, change: () => {} }); }
            catch { clearTimeout(timer); reject(Object.assign(new Error('SETUP_CONTEXT_DATABASE_FAILED'), { code: 'SETUP_CONTEXT_DATABASE_FAILED' })); }
        });
        const marker = await objects.getObjectAsync(MARKER);
        if (marker?.native?.state !== 'complete') fail('SETUP_CONTEXT_BOOTSTRAP_REQUIRED');
        const final = publicContext({ draft, releaseId: installed.releaseId,
            record: await objects.getObjectAsync('system.meta.uuid'), normalizeUuid });
        if (fs.realpathSync('/opt/nexowatt/eos/current') !== releasePath ||
            JSON.stringify(readConfig(DIRECTORY + '/iobroker.json')) !== JSON.stringify(config)) fail('SETUP_CONTEXT_RELEASE_CHANGED');
        checkInstalled({ releasePath, evidencePath });
        privateWrite(DIRECTORY + '/license-device.json', JSON.stringify({ schemaVersion: 1, uuid: final.license.uuid, releaseId: installed.releaseId }) + '\n', 0o644);
        // Installer grants only the setup group read access after this completes.
        privateWrite(DIRECTORY + '/onboarding.json', JSON.stringify(final) + '\n', 0o600);
        fs.unlinkSync(draftFile);
        const fd = fs.openSync(DIRECTORY, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
        try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        return { ok: true, status: 'FIRST_START_IDENTITY_CONTEXT_READY', releaseId: installed.releaseId };
    } finally { if (objects) await objects.destroy(); }
}
module.exports = { publicContext, prepareContext };
if (require.main === module) {
    const timer = setTimeout(() => { process.stderr.write('{"ok":false,"code":"SETUP_CONTEXT_TIMEOUT"}\n'); process.exit(1); }, 30000);
    Promise.resolve().then(() => { if (process.argv.length !== 2) fail('SETUP_CONTEXT_USAGE'); return prepareContext(); }).then(
        result => process.stdout.write(JSON.stringify(result) + '\n'),
        error => { process.stderr.write(JSON.stringify({ ok: false, code: /^SETUP_CONTEXT_[A-Z_]+$/.test(error.code || '') ? error.code : 'SETUP_CONTEXT_FAILED' }) + '\n'); process.exitCode = 1; },
    ).finally(() => clearTimeout(timer));
}
