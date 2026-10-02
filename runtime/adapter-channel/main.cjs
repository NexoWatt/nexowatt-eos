'use strict';
// Optional, separately provisioned service; not auto-enabled by the dev7 installer.
const fs = require('node:fs');
const path = require('node:path');
const { rootOwned } = require('../release/installed-check.cjs');
const { readFileLimited } = require('../release/bundle.cjs');
const { createGateway } = require('./server.cjs');
const { createPostgresqlBackend } = require('./postgresql-backend.cjs');
const { ensure } = require('./policy.cjs');
const { parseBoundedJson } = require('../policy/admission.cjs');
const DIRECTORY = '/etc/nexowatt-eos/adapter-channel';
function protectedRead(name, secret = false) {
    const file = path.join(DIRECTORY, name); rootOwned(DIRECTORY); rootOwned(file);
    const stat = fs.lstatSync(file); ensure(stat.isFile() && !stat.isSymbolicLink() && !(stat.mode & (secret ? 0o027 : 0o022)), 'EOS_CHANNEL_FILE');
    return readFileLimited(file, 1024 * 1024).bytes.toString('utf8');
}
async function main() {
    ensure(process.getuid?.() !== 0, 'EOS_CHANNEL_NONROOT');
    const tls = { ca: protectedRead('ca.crt'), cert: protectedRead('server.crt'), key: protectedRead('server.key', true) };
    const policy = parseBoundedJson(protectedRead('policy.json'));
    const config = JSON.parse(protectedRead('states.json', true));
    const backend = await createPostgresqlBackend({ app: '/opt/nexowatt/eos/current/app', connection: config });
    let gateway;
    try {
        gateway = createGateway({ tls, policy, backend });
        await new Promise((resolve, reject) => { gateway.server.once('error', reject); gateway.server.listen(19443, '127.0.0.1', resolve); });
    } catch (error) { await backend.close(); throw error; }
    process.on('SIGHUP', () => {
        try { gateway.replacePolicy(parseBoundedJson(protectedRead('policy.json'))); process.stdout.write('EOS_CHANNEL_POLICY_RELOADED\n'); }
        catch { process.stderr.write('EOS_CHANNEL_POLICY_RELOAD_FAILED\n'); }
    });
    let stopping = false;
    const stop = async () => {
        if (stopping) return; stopping = true;
        const watchdog = setTimeout(() => process.exit(1), 10000);
        gateway.server.close(); gateway.server.closeAllConnections();
        try { await backend.close(); clearTimeout(watchdog); process.exitCode = 0; } catch { process.exitCode = 1; }
    };
    process.once('SIGTERM', stop); process.once('SIGINT', stop);
    process.stdout.write('EOS_CHANNEL_LISTENING\n');
}
if (require.main === module) main().catch(() => { process.stderr.write('EOS_CHANNEL_START_FAILED\n'); process.exitCode = 1; });
module.exports = { protectedRead };
