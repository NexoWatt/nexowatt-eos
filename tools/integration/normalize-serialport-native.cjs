'use strict';
// Only use on a fresh offline build. Historical app trees are not rewritten.
const fs = require('node:fs');
const path = require('node:path');
const { policy, sha, assertPackage, patchedLoader, loaderSource, normalizationEvidence } = require('../../runtime/native/serialport-contract.cjs');
function normalize({ app, platform, nodeVersion }) {
    app = path.resolve(app);
    const lock = JSON.parse(fs.readFileSync(path.join(app, 'package-lock.json'), 'utf8'));
    // Verify every original package before mutating any one of them. Only exact
    // upstream files may be removed, and only the selected target binary stays.
    for (const pin of policy.packages) assertPackage({ app, pin, lockEntry: lock.packages[pin.packagePath], platform, nodeVersion, normalized: false });
    for (const pin of policy.packages) {
        const directory = path.join(app, pin.packagePath), removed = pin.originalFiles.filter(row => row.path.endsWith('.node') && row.path !== pin.native);
        const source = fs.readFileSync(path.join(directory, pin.loader), 'utf8'), transformed = patchedLoader(source, pin);
        if (sha(Buffer.from(transformed)) !== pin.patchedLoaderSha256) throw Object.assign(new Error('NATIVE_TRANSFORM_POLICY'), { code: 'NATIVE_TRANSFORM_POLICY' });
        for (const row of removed) {
            const target = path.resolve(directory, row.path);
            if (!target.startsWith(directory + path.sep)) throw new Error('NATIVE_PRUNING_PATH');
            fs.unlinkSync(target);
        }
        fs.writeFileSync(path.join(directory, pin.loader), transformed);
        fs.writeFileSync(path.join(directory, 'eos-native-loader.cjs'), loaderSource(pin), { flag: 'wx', mode: 0o644 });
        assertPackage({ app, pin, lockEntry: lock.packages[pin.packagePath], platform, nodeVersion });
    }
    return normalizationEvidence();
}
module.exports = { normalize };
