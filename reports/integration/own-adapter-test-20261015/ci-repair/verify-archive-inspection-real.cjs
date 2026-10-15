'use strict';
// Local reproduction against tar from the authenticated R9 application tree.
// This is an archive/parser check, not a PostgreSQL or target-host backup test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const app = process.env.EOS_ARCHIVE_TEST_APP;
assert.ok(app && path.isAbsolute(app), 'EOS_ARCHIVE_TEST_APP must name the authenticated application');
const fromApp = createRequire(path.join(app, 'package.json')), tar = fromApp('tar');
const { inspectArchive } = require(path.join(root, 'tests/integration-own-adapters/archive-inspection.cjs'));
const baseline = '3d3aaf8e4c7f81e9465a202558716980b34c0615';
const canaryId = '0_userdata.0.archive-canary', canaryValue = 'Prüfung 🔋 中文';
const config = { objects: { type: 'postgresql' }, states: { type: 'postgresql' }, label: canaryValue };
const options = { requiredObjects: ['system.config'], canaryId, canaryValue,
    configSha256: crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex') };
async function archive(t, modify = () => {}, duplicate = false) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-archive-real-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.mkdirSync(path.join(dir, 'backup'));
    const rows = {
        'objects.jsonl': [{ _id: 'system.config' }, { _id: canaryId, type: 'state', common: { type: 'string' } }].map(JSON.stringify).join('\n') + '\n',
        'states.jsonl': JSON.stringify({ id: canaryId, state: { val: canaryValue, ack: true } }) + '\n',
        'config.json': JSON.stringify(config),
    };
    modify(rows);
    for (const [name, content] of Object.entries(rows)) fs.writeFileSync(path.join(dir, 'backup', name), content);
    const file = path.join(dir, 'fixture.tar.gz');
    await tar.c({ file, cwd: dir, gzip: true, portable: true }, duplicate ? ['backup', 'backup/states.jsonl'] : ['backup']);
    return { dir, file };
}
test('historical parser fails with the shipped tar 7.5.22 / minipass 7.1.3 encoding contract', async t => {
    assert.equal(fromApp('tar/package.json').version, '7.5.22');
    assert.equal(fromApp('minipass/package.json').version, '7.1.3');
    const f = await archive(t), oldParser = path.join(f.dir, 'old-parser.cjs');
    fs.writeFileSync(oldParser, cp.execFileSync('git', ['show', baseline + ':tests/integration-own-adapters/archive-inspection.cjs'], { cwd: root }));
    const script = "require(process.argv[1]).inspectArchive(require(process.argv[2]),process.argv[3],JSON.parse(process.argv[4])).then(()=>process.exit(0)).catch(()=>process.exit(2))";
    const result = cp.spawnSync(process.execPath, ['-e', script, oldParser, fromApp.resolve('tar'), f.file, JSON.stringify(options)],
        { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Encoding must be set at instantiation time/);
});
test('corrected parser accepts a genuine compressed archive through single-byte compressed reads', async t => {
    const f = await archive(t), boundedReads = { t: opts => tar.t({ ...opts, maxReadSize: 1 }) };
    const result = await inspectArchive(boundedReads, f.file, options);
    assert.equal(result.canaryObjectAndStatePresent, true);
    assert.equal(result.exactRuntimeConfigPresent, true);
    assert.equal(result.objectCount, 2); assert.equal(result.stateCount, 1);
});
test('real tar preserves canary, duplicate, invalid UTF-8, truncation and record-size rejection', async t => {
    for (const modify of [
        rows => { rows['states.jsonl'] = rows['states.jsonl'].replace(canaryValue, 'wrong'); },
        rows => { rows['states.jsonl'] = Buffer.concat([Buffer.from(rows['states.jsonl']), Buffer.from([0xff])]); },
        rows => { rows['states.jsonl'] = Buffer.concat([Buffer.from(rows['states.jsonl']), Buffer.from([0xe2, 0x82])]); },
        rows => { rows['states.jsonl'] = JSON.stringify({ id: canaryId, state: { val: canaryValue, ack: true }, data: 'x'.repeat(1048576) }) + '\n'; },
    ]) {
        const f = await archive(t, modify);
        await assert.rejects(inspectArchive(tar, f.file, options), error => error.message === 'OWN_NATIVE_BACKUP_CONTENT');
    }
    const duplicate = await archive(t, undefined, true);
    await assert.rejects(inspectArchive(tar, duplicate.file, options), /OWN_NATIVE_BACKUP_CONTENT/);
});
