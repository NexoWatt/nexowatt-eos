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
function streams(rows, { chunkSize, declaredSize } = {}) {
    return { async t({ onentry }) {
        for (const [file, text, type = 'File'] of rows) {
            const raw = Buffer.isBuffer(text) ? text : Buffer.from(text), chunks = [];
            for (let offset = 0; offset < raw.length; offset += chunkSize || raw.length) chunks.push(raw.subarray(offset, offset + (chunkSize || raw.length)));
            const entry = Readable.from(chunks);
            // Match the shipped minipass contract, which Node Readable lacks.
            entry.setEncoding = () => { throw new Error('Encoding must be set at instantiation time'); };
            Object.assign(entry, { path: file, size: declaredSize ?? raw.length, type });
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
test('split multibyte UTF-8 is decoded across raw chunks without changing entry encoding', async () => {
    const value = 'Prüfung 🔋 中文', cfg = { ...config, label: value };
    const rows = records().map(([name, text]) => [name, name.endsWith('config.json') ? JSON.stringify(cfg) : text.replace(canaryValue, value)]);
    for (const chunkSize of [1, 2, 3, 5]) {
        const result = await inspectArchive(streams(rows, { chunkSize }), '/unused-stream-fixture', { ...options, canaryValue: value,
            configSha256: crypto.createHash('sha256').update(JSON.stringify(cfg)).digest('hex') });
        assert.equal(result.canaryObjectAndStatePresent, true);
        assert.equal(result.exactRuntimeConfigPresent, true);
    }
});
test('malformed and truncated UTF-8 rejects with the fixed content code, including final decoder flush', async () => {
    for (const suffix of [Buffer.from([0xff]), Buffer.from([0xe2, 0x82]), Buffer.from([0xc0, 0xaf])]) {
        const rows = records().map(([name, text]) => [name, name.endsWith('states.jsonl') ? Buffer.concat([Buffer.from(text), suffix]) : text]);
        await assert.rejects(inspectArchive(streams(rows, { chunkSize: 1 }), '/unused-stream-fixture', options),
            error => error.message === 'OWN_NATIVE_BACKUP_CONTENT');
    }
    const bom = records().map(([name, text]) => [name, name.endsWith('config.json') ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]) : text]);
    await assert.rejects(inspectArchive(streams(bom, { chunkSize: 1 }), '/unused-stream-fixture', options), /OWN_NATIVE_BACKUP_CONTENT/);
});
test('raw-byte file, config and per-record limits hold for terminated lines and multibyte content', async () => {
    const bigConfig = JSON.stringify({ data: 'é'.repeat(65537) });
    await assert.rejects(inspectArchive(streams(records().map(([name, text]) => [name, name.endsWith('config.json') ? bigConfig : text])),
        '/unused-stream-fixture', { ...options, configSha256: crypto.createHash('sha256').update(bigConfig).digest('hex') }),
    /OWN_NATIVE_BACKUP_CONTENT/);
    for (const rows of [
        records().map(([name, text]) => [name, name.endsWith('states.jsonl') ? JSON.stringify({ id: canaryId, state: { val: canaryValue, ack: true }, data: 'x'.repeat(1048576) }) + '\n' : text]),
        records().map(([name, text]) => [name, name.endsWith('objects.jsonl') ? text + ' '.repeat(1048577) : text]),
    ]) await assert.rejects(inspectArchive(streams(rows), '/unused-stream-fixture', options), /OWN_NATIVE_BACKUP_CONTENT/);
    await assert.rejects(inspectArchive(streams(records(), { declaredSize: 32 * 1024 * 1024 + 1 }), '/unused-stream-fixture', options),
        /OWN_NATIVE_BACKUP_CONTENT/);
});
