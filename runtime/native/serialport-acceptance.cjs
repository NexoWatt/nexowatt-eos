#!/usr/bin/env node
'use strict';
// Target-only dlopen/export probe. Never enumerate, open or modify a device.
const fs = require('node:fs');
const path = require('node:path');
const { rootOwned } = require('../release/installed-check.cjs');
const { policy, assertNativeHost, hostIdentity, assertPackage } = require('./serialport-contract.cjs');
const EXPECTED = Object.freeze(['Poller', 'close', 'drain', 'flush', 'get', 'getBaudRate', 'open', 'set', 'update']);
function probe(app) {
    const host = hostIdentity(); assertNativeHost(host);
    if (!path.isAbsolute(app) || fs.realpathSync(app) !== app) throw new Error('NATIVE_APP_PATH');
    rootOwned(app);
    const lock = JSON.parse(fs.readFileSync(path.join(app, 'package-lock.json'), 'utf8')), bindings = [];
    for (const pin of policy.packages) {
        const checked = assertPackage({ app, pin, lockEntry: lock.packages[pin.packagePath], platform: 'linux-arm64', nodeVersion: host.node });
        // Caller must first verify the signed release. The generated loader
        // independently checks root ownership, target identity and binary hash.
        const binding = require(path.join(app, pin.packagePath, 'eos-native-loader.cjs'));
        if (JSON.stringify(Object.getOwnPropertyNames(binding).sort()) !== JSON.stringify(EXPECTED) ||
            EXPECTED.some(name => typeof binding[name] !== 'function')) throw new Error('NATIVE_EXPORT_CONTRACT');
        bindings.push({ version: pin.version, sha256: pin.nativeSha256, exports: EXPECTED, ...checked, targetProbePassed: true });
    }
    return { schemaVersion: 1, kind: 'eos-serialport-native-target-probe', passed: true,
        platform: 'linux-arm64', node: host.node, napi: host.napi, uv: host.uv, glibc: host.glibc,
        bindings, deviceIoPerformed: false, hardwareAccepted: false };
}
module.exports = { probe, EXPECTED };
if (require.main === module) {
    try { if (process.argv.length !== 4 || process.argv[2] !== '--app') throw new Error('NATIVE_PROBE_USAGE');
        process.stdout.write(JSON.stringify(probe(process.argv[3])) + '\n'); }
    catch { process.stderr.write('{"passed":false,"code":"NATIVE_TARGET_PROBE_FAILED"}\n'); process.exitCode = 1; }
}
