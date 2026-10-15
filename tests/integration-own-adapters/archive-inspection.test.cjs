'use strict';
// Isolated stream-parser tests only: these synthetic archive records are not a
// substitute for the separate real-CLI/native-PostgreSQL archive qualification.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const crypto = require('node:crypto');
const { inspectArchive } = require('./archive-inspection.cjs');
const canaryId = '0_userdata.0.canary', canaryValue = 'native-test-record';
const config = { objects: { type: 'postgresql' }, states: { type: 'postgresql' } };
const options = { requiredObjects: ['system.config', 'system.adapter.eebus.0'], canaryId, canaryValue,
    configSha256: crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex') };
function records() {
    return [
        ['backup/objects.jsonl', [{ _id: 'system.config' }, { _id: 'system.adapter.eebus.0' }, { _id: canaryId, type: 'state', common: { type: 'string' } }].map(JSON.stringify).join('\n') + '\n'],
        ['backup/states.jsonl', JSON.stringify({ id: canaryId, state: { val: canaryValue, ack: true } }) + '\n'],
        ['backup/config.json', JSON.stringify(config)],
    ];
}
function streams(rows) {
    return { async t({ onentry }) {
        for (const [file, text, type = 'File'] of rows) {
            const entry = Readable.from([Buffer.from(text)]);
            Object.assign(entry, { path: file, size: Buffer.byteLength(text), type });
            onentry(entry);
            await new Promise((resolve, reject) => { entry.once('end', resolve); entry.once('error', reject); entry.resume(); });
        }
    } };
}
test('archive inspection requires real logical content including canary and all exact object IDs', async () => {
    const result = await inspectArchive(streams(records()), '/unused-stream-fixture', options);
    assert.equal(result.objectCount, 3); assert.equal(result.stateCount, 1);
    assert.equal(result.canaryObjectAndStatePresent, true); assert.equal(result.exactRuntimeConfigPresent, true);
    assert.equal(JSON.stringify(result).includes(canaryValue), false);
});
test('readable archive with missing/empty exports cannot qualify', async () => {
    for (const rows of [records().slice(1), records().map(([name, value]) => [name, name.endsWith('states.jsonl') ? '' : value]),
        records().map(([name, value]) => [name, name.endsWith('objects.jsonl') ? '{}' : value])])
        await assert.rejects(inspectArchive(streams(rows), '/unused-stream-fixture', options), /OWN_NATIVE_BACKUP_CONTENT/);
});
test('wrong canary/config or malformed exported JSON fails without exposing the value', async () => {
    for (const rows of [records().map(([name, value]) => [name, value.replace(canaryValue, 'different-value')]),
        records().map(([name, value]) => [name, name.endsWith('config.json') ? '{}' : value]),
        records().map(([name, value]) => [name, name.endsWith('states.jsonl') ? 'private malformed content' : value])])
        await assert.rejects(inspectArchive(streams(rows), '/unused-stream-fixture', options), error =>
            error.message === 'OWN_NATIVE_BACKUP_CONTENT' && !error.message.includes('private'));
});
test('recursive backups, traversal, duplicate required objects and links fail', async () => {
    const invalid = [
        [...records(), ['backup/nexowatt-backup/backups/old.tar.gz', 'archive']],
        [...records(), ['backup/../outside', 'data']],
        [...records(), ['backup/link', '', 'SymbolicLink']],
        records().map(([name, value]) => [name, name.endsWith('objects.jsonl') ? value + '{"_id":"system.config"}\n' : value]),
    ];
    for (const rows of invalid) await assert.rejects(inspectArchive(streams(rows), '/unused-stream-fixture', options), /OWN_NATIVE_BACKUP_CONTENT/);
});
test('later empty or corrupt duplicate exports cannot replace previously verified content', async () => {
    for (const file of ['backup/objects.jsonl', 'backup/states.jsonl', 'backup/config.json']) {
        for (const value of ['', 'corrupt replacement'])
            await assert.rejects(inspectArchive(streams([...records(), [file, value]]), '/unused-stream-fixture', options), /OWN_NATIVE_BACKUP_CONTENT/);
    }
    await assert.rejects(inspectArchive(streams([...records(), ['backup/objects.jsonl', ''], ['backup/states.jsonl', '']]),
        '/unused-stream-fixture', options), /OWN_NATIVE_BACKUP_CONTENT/);
});
test('equivalent archive aliases fail instead of bypassing duplicate detection', async () => {
    for (const file of ['./backup/objects.jsonl', 'backup/./objects.jsonl', 'backup//objects.jsonl',
        'backup/sub/../objects.jsonl', 'backup\\objects.jsonl', '/backup/objects.jsonl'])
        await assert.rejects(inspectArchive(streams([...records(), [file, '']]), '/unused-stream-fixture', options), /OWN_NATIVE_BACKUP_CONTENT/);
});
test('required exports must be files and cannot become directories or overwrite ancestor directories', async () => {
    for (const rows of [
        records().map(([name, value]) => [name, value, name.endsWith('config.json') ? 'Directory' : 'File']),
        [...records(), ['backup/config.json/', '', 'Directory']],
        [...records(), ['backup', '', 'File']],
        [['backup', '', 'File'], ...records()],
    ]) await assert.rejects(inspectArchive(streams(rows), '/unused-stream-fixture', options), /OWN_NATIVE_BACKUP_CONTENT/);
});
test('ordinary canonical tar directory entries remain valid', async () => {
    const result = await inspectArchive(streams([['backup/', '', 'Directory'], ['backup/files/', '', 'Directory'], ...records()]),
        '/unused-stream-fixture', options);
    assert.equal(result.requiredObjectsPresent, true);
});
