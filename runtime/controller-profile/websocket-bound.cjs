'use strict';
// Reviewed build-time change to the exact published ws-server input. It is
// verified again by the signed-release gate, before any application starts.
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const path = require('node:path');
const FILE = 'node_modules/@iobroker/ws-server/build/index.js';
const ORIGINAL = 'ad8e5d744cdc85ed2670312c528a4222ce3bc4872a8cfb7abe09b113b35096ae';
const OUTPUT = 'f88d1bcf2344c1c3e404b47abc8f03fceffc8b236ca97f008bd2bbac635ba9e0';
const BOUND_BYTES = 1048576;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw Object.assign(new Error('EOS_WEBSOCKET_BUILD_PROFILE'), { code: 'EOS_WEBSOCKET_BUILD_PROFILE' }); };
function needed(adapters) { return adapters.some(row => row.package === 'iobroker.eos-admin'); }
function identity(app, read) {
    const info = JSON.parse(read('node_modules/@iobroker/ws-server/package.json'));
    if (info.name !== '@iobroker/ws-server' || info.version !== '4.5.1') fail();
    // Reject alternate/nested resolution: transforming an unused copy would
    // leave the real transport with the upstream 500 MiB inbound limit.
    const resolved = createRequire(path.resolve(app, 'node_modules/iobroker.eos-admin/package.json')).resolve('@iobroker/ws-server');
    if (resolved !== path.resolve(app, FILE)) fail();
}
function transform(input) {
    if (sha(input) !== ORIGINAL) fail();
    const content = input.toString('utf8').replace('const MAX_PAYLOAD = 524_288_000;',
        '// EOS-WS-BOUND-01: cap decompressed inbound messages before command parsing.\nconst MAX_PAYLOAD = 1_048_576;');
    if (sha(content) !== OUTPUT) fail();
    return { relativePath: FILE, originalSha256: ORIGINAL, sha256: sha(content), content };
}
module.exports = { FILE, ORIGINAL, OUTPUT, BOUND_BYTES, needed, identity, transform };
