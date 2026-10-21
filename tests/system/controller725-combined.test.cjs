'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const transform = require('../../runtime/controller-profile/transform.cjs');
const current = require('../../runtime/controller-profile/v7.2.5/transform.cjs');
const helpers = ['pid-state', 'backup-state', 'adapter-shutdown'].map(name => require(`../../runtime/controller-profile/v7.2.5/${name}.cjs`));
function build(t) {
    const app = fs.mkdtempSync(path.join(os.tmpdir(), 'eos725-combined-'));
    t.after(() => fs.rmSync(app, { recursive: true, force: true }));
    const write = (relative, bytes) => { const file = path.join(app, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); };
    const files = [...Object.keys(current.HASHES), ...helpers.flatMap(helper => helper.FILES.map(row => row.relativePath))];
    for (const relative of files) {
        const flavor = relative.includes('/cjs/') ? 'cjs' : 'esm';
        const name = relative.endsWith('/tools.js') ? 'common-db-tools' : path.basename(relative, '.js');
        write(relative, fs.readFileSync(path.join(__dirname, 'controller-profile-fixtures/7.2.5', `${flavor}-${name}.original.txt`)));
    }
    for (const name of ['iobroker.js-controller', '@iobroker/js-controller-cli', '@iobroker/js-controller-adapter', '@iobroker/js-controller-common', '@iobroker/js-controller-common-db']) {
        write(`node_modules/${name}/package.json`, JSON.stringify({ name, version: '7.2.5', type: 'module', exports: {
            '.': { require: './build/cjs/index.js', import: './build/esm/index.js' },
            './tools': { require: './build/cjs/lib/common/tools.js', import: './build/esm/lib/common/tools.js' } } }));
        write(`node_modules/${name}/build/cjs/index.js`, '');
    }
    return app;
}
test('fresh combined transform and generic release verifier cover all twelve upstream files', t => {
    const app = build(t); const result = transform.applySecurityRefreshToBuild(app);
    assert.equal(result.controllerVersion, '7.2.5'); assert.equal(result.productionApproved, false);
    assert.equal(result.files.length, 15); assert.equal(new Set(result.files.map(row => row.relativePath)).size, 15);
    assert.equal(transform.verifyBuildProfile(app).files.length, 15);
    fs.appendFileSync(path.join(app, helpers[0].FILES[0].relativePath), '\n');
    assert.throws(() => transform.verifyBuildProfile(app), /EOS_PID_BUILD_HASH/);
});
test('a bad later helper input prevents every primary transform write', t => {
    const app = build(t), primary = path.join(app, Object.keys(current.HASHES)[0]);
    const before = fs.readFileSync(primary);
    fs.appendFileSync(path.join(app, helpers[1].FILES[1].relativePath), '\n');
    assert.throws(() => transform.applySecurityRefreshToBuild(app), /EOS_BACKUP_TRANSFORM_SOURCE_HASH/);
    assert.deepEqual(fs.readFileSync(primary), before);
    assert.equal(fs.existsSync(path.join(app, 'node_modules/iobroker.js-controller/eos-test-profile.json')), false);
});
