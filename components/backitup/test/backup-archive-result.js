'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const { run } = require('../build/lib/scripts/10-iobroker');

for (const scenario of ['valid', 'failed', 'missing', 'empty']) {
    test(`CLI result ${scenario}: only exit zero plus nonempty archive reports success`, { timeout: 5000 }, async t => {
        const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-backup-result-'));
        t.after(() => fs.rmSync(backupDir, { recursive: true, force: true }));
        const context = {
            backupDir, fileNames: [], done: [], types: [], errors: {},
            log: { debug() {}, warn() {}, error() {} },
        };
        const result = await run({ context, options: {
            workDir: path.join(__dirname, 'helpers/backup-result-child.cjs'), nameSuffix: scenario,
        } });
        if (scenario === 'valid') {
            assert.equal(result, 0);
            assert.deepEqual(context.done, ['iobroker']);
            assert.deepEqual(context.types, ['iobroker']);
            assert.equal(context.fileNames.length, 1);
            assert.ok(fs.statSync(context.fileNames[0]).size > 0);
        } else {
            assert.notEqual(result, 0);
            assert.equal(context.errors.iobroker, 'EOS_BACKUP_ARCHIVE_NOT_CREATED');
            assert.deepEqual(context.done, []);
            assert.deepEqual(context.types, []);
            assert.deepEqual(context.fileNames, []);
        }
    });
}

test('EOS instance depends on actual eos-admin, not absent upstream admin', () => {
    const dependencies = require('../io-package.json').common.globalDependencies;
    assert.deepEqual(dependencies, [{ 'eos-admin': '>=7.0.0' }]);
});

for (const kind of ['regular', 'dangling-symlink']) {
    test(`existing ${kind} archive rejected before CLI starts`, async t => {
        const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-backup-stale-'));
        t.after(() => fs.rmSync(backupDir, { recursive: true, force: true }));
        const destination = path.join(backupDir, 'iobroker_fixed_backupiobroker.tar.gz');
        if (kind === 'regular') fs.writeFileSync(destination, 'existing archive');
        else fs.symlinkSync(path.join(backupDir, 'absent'), destination);
        let children = 0;
        const module = { exports: {} };
        vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../build/lib/scripts/10-iobroker.js'), 'utf8'), {
            exports: module.exports, module, console,
            require: name => name === 'node:child_process' ? { fork() { children++; throw Error('must not start'); } }
                : name === '../tools' ? { getDate: () => 'fixed' } : require(name),
        });
        const context = { backupDir, fileNames: [], done: [], types: [], errors: {}, log: { debug() {}, warn() {}, error() {} } };
        assert.equal(await module.exports.run({ context, options: { workDir: 'unused' } }), 1);
        assert.equal(children, 0);
        assert.equal(context.errors.iobroker, 'EOS_BACKUP_TARGET_EXISTS');
        assert.deepEqual(context.fileNames, []);
        assert.deepEqual(context.done, []);
        assert.deepEqual(context.types, []);
        if (kind === 'regular') assert.equal(fs.readFileSync(destination, 'utf8'), 'existing archive');
        else assert.ok(fs.lstatSync(destination).isSymbolicLink());
    });
}
