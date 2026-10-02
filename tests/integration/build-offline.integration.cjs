'use strict';
// Integration check: an empty package cache must stop a private EOS build before
// registry resolution, even if a caller explicitly asks npm to go online.
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const cp = require('node:child_process');
test('private assembly remains offline and fails explicitly for an empty cache', t => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-offline-build-'));
    t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
    const builder = path.resolve(__dirname, '../../tools/integration/build-runtime.cjs');
    const source = 'try { require(process.argv[1]).build({output:process.argv[2],components:["ui"],platform:"linux-x64"}); process.exitCode=1; } catch(error) { if(error.code!=="BUILD_OFFLINE_CACHE_MISS") { console.error(error.code); process.exitCode=1; } else console.log("BUILD_OFFLINE_CACHE_MISS"); }';
    const output = path.join(temporary, 'output');
    const result = cp.spawnSync(process.execPath, ['-e', source, builder, output], { env: { ...process.env,
        // Deliberately remove the invoking Node/npm directory from PATH.
        // The build must still invoke its bound CLI, never a PATH executable.
        PATH: path.join(temporary, 'untrusted-path'),
        npm_config_cache: path.join(temporary, 'empty-cache'), npm_config_offline: 'false',
        npm_config_fetch_timeout: '1000', npm_config_fetch_retries: '0' }, encoding: 'utf8', timeout: 45000, maxBuffer: 65536, shell: false });
    assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /BUILD_OFFLINE_CACHE_MISS/);
    const log = fs.readFileSync(path.join(output, 'logs/install.log'), 'utf8');
    assert.match(log, /ENOTCACHED/); assert.match(log, /cache mode is 'only-if-cached'/);
});
