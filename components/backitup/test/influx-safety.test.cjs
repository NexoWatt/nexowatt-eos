'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { createRequire } = require('node:module');
const cli = require('../build/lib/influxDbCli');
const TOKEN = 'fixture-influx-token-PRIVATE';
function writeManifest(directory, version = '2.x', name = 'metering') {
    fs.writeFileSync(path.join(directory, 'backup.manifest'), JSON.stringify(version === '1.x'
        ? { files: [{ database: name }] } : { manifestVersion: 2, buckets: [{ bucketName: name }] }));
}
function writeDropManifest(directory, missing) {
    const meta = { fileName: 'backup.meta', size: 4 };
    const data = { fileName: 'backup.tar.gz', size: 4, database: 'metering' };
    fs.writeFileSync(path.join(directory, 'backup.manifest'), JSON.stringify({ meta, files: [data] }));
    if (missing !== 'metadata') fs.writeFileSync(path.join(directory, meta.fileName), 'meta');
    if (missing !== 'data') fs.writeFileSync(path.join(directory, data.fileName), 'data');
}

function options(overrides = {}) {
    return { host: 'influx.example', port: 8086, dbName: 'metering', token: TOKEN, protocol: 'https',
        dbversion: '2.x', dbType: 'remote', influxDBEvents: [], ...overrides };
}
function fixture(t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-influx-test-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const logs = [];
    const ctx = { backupDir: directory, fileNames: [], done: [], types: [], errors: {},
        log: Object.fromEntries(['debug', 'warn', 'error'].map(level => [level, value => logs.push(String(value))])),
        adapter: { async getObjectViewAsync() { return { rows: [] }; } } };
    return { directory, ctx, logs, target: path.join(directory, 'influxDB_fixed_backupiobroker.tar.gz') };
}
function load(kind, overrides = {}) {
    const file = path.join(__dirname, '../build/lib', kind === 'backup' ? 'scripts/12-influxDB.js' : 'restore/influxDB.js');
    const realRequire = createRequire(file), module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
        module, exports: module.exports, process, console, Error, Buffer,
        require(name) {
            if (name === 'node:child_process') return { execFile: overrides.execFile || ((_file, _args, _options, callback) => callback(null, '', '')) };
            if (name === '../tools') return { getDate: () => 'fixed' };
            if (name === '../targz') return {
                compressAsync: overrides.compressAsync || (async ({ src, dest }) => {
                    assert.equal(fs.statSync(src).mode & 0o777, 0o700);
                    fs.writeFileSync(dest, 'synthetic compressed archive');
                }),
                decompressAsync: overrides.decompressAsync || (async ({ dest, tar }) => {
                    assert.equal(fs.statSync(dest).mode & 0o777, 0o700);
                    assert.equal(tar.map({ type: 'directory', mode: 0o777 }).mode, 0o700);
                    assert.equal(tar.map({ type: 'file', mode: 0o777 }).mode, 0o600);
                    writeManifest(dest);
                }),
            };
            return realRequire(name);
        },
    }, { filename: file });
    return module.exports;
}

for (const operation of ['Backup', 'Restore']) {
    test(`${operation} local pins loopback despite inherited remote host and CLI profile`, () => {
        const priorHost = process.env.INFLUX_HOST, priorProfile = process.env.INFLUX_ACTIVE_CONFIG;
        process.env.INFLUX_HOST = 'https://untrusted.invalid:8086';
        process.env.INFLUX_ACTIVE_CONFIG = 'untrusted';
        try {
            const invocation = cli[`buildInflux${operation}Invocation`](options({ dbType: 'local' }), '/private/dir');
            assert.equal(invocation.args[invocation.args.indexOf('--host') + 1], 'http://127.0.0.1:8086');
            assert.equal(invocation.args.some(arg => arg.includes('untrusted')), false);
            assert.equal(process.env.INFLUX_HOST, 'https://untrusted.invalid:8086');
        } finally {
            if (priorHost === undefined) delete process.env.INFLUX_HOST;
            else process.env.INFLUX_HOST = priorHost;
            if (priorProfile === undefined) delete process.env.INFLUX_ACTIVE_CONFIG;
            else process.env.INFLUX_ACTIVE_CONFIG = priorProfile;
        }
    });
    for (const dbType of ['local', 'remote']) {
        test(`${operation} ${dbType} explicitly defeats inherited disabled TLS verification`, () => {
            const prior = process.env.INFLUX_SKIP_VERIFY;
            process.env.INFLUX_SKIP_VERIFY = 'true';
            try {
                const invocation = cli[`buildInflux${operation}Invocation`](options({ dbType }), '/private/dir');
                assert.ok(invocation.args.includes('--skip-verify=false'));
                assert.ok(!invocation.args.includes('--skip-verify'));
                assert.equal(invocation.env.INFLUX_SKIP_VERIFY, 'false');
                assert.equal(process.env.INFLUX_SKIP_VERIFY, 'true');
                assert.equal(invocation.args.some(arg => arg.includes(TOKEN)), false);
            } finally {
                if (prior === undefined) delete process.env.INFLUX_SKIP_VERIFY;
                else process.env.INFLUX_SKIP_VERIFY = prior;
            }
        });
    }
}

test('token masking covers normalized and URL-encoded CLI echoes', () => {
    const token = ' a+secret/token ';
    assert.equal(cli.maskInfluxToken(`${token}|${token.trim()}|${encodeURIComponent(token.trim())}`, token), '****|****|****');
});

for (const failure of ['cli', 'compress', 'missing', 'empty']) {
    test(`backup ${failure} failure cannot report success or publish a filename`, async t => {
        const f = fixture(t);
        const subject = load('backup', {
            execFile: (_file, _args, _opts, callback) => failure === 'cli'
                ? callback(new Error(TOKEN), TOKEN, TOKEN) : callback(null, '', ''),
            compressAsync: async ({ dest }) => {
                if (failure === 'compress') throw new Error(TOKEN);
                if (failure === 'empty') fs.writeFileSync(dest, '');
            },
        });
        await assert.rejects(subject.run({ context: f.ctx, options: options() }));
        assert.deepEqual(f.ctx.done, []);
        assert.deepEqual(f.ctx.types, []);
        assert.deepEqual(f.ctx.fileNames, []);
        assert.equal(fs.existsSync(f.target), false);
        assert.equal(fs.readdirSync(f.directory).length, 0);
        assert.equal(JSON.stringify([f.ctx.errors, f.logs]).includes(TOKEN), false);
    });
}

for (const collision of ['regular', 'symlink', 'race']) {
    test(`backup ${collision} collision preserves the existing target`, async t => {
        const f = fixture(t); let children = 0;
        if (collision === 'regular') fs.writeFileSync(f.target, 'previous');
        if (collision === 'symlink') fs.symlinkSync(path.join(f.directory, 'absent'), f.target);
        const subject = load('backup', {
            execFile: (_file, _args, _opts, cb) => { children++; cb(null, '', ''); },
            compressAsync: async ({ dest }) => { fs.writeFileSync(dest, 'candidate'); fs.writeFileSync(f.target, 'concurrent'); },
        });
        await assert.rejects(subject.run({ context: f.ctx, options: options() }));
        assert.deepEqual(f.ctx.fileNames, []);
        assert.equal(children, collision === 'race' ? 1 : 0);
        if (collision === 'symlink') assert.ok(fs.lstatSync(f.target).isSymbolicLink());
        else assert.equal(fs.readFileSync(f.target, 'utf8'), collision === 'race' ? 'concurrent' : 'previous');
    });
}

test('successful backup publishes one private archive and cleans its unique temporary tree', async t => {
    const f = fixture(t);
    await load('backup').run({ context: f.ctx, options: options() });
    assert.deepEqual(f.ctx.done, ['influxDB']);
    assert.deepEqual(f.ctx.fileNames, [f.target]);
    assert.equal(fs.statSync(f.target).mode & 0o777, 0o600);
    assert.deepEqual(fs.readdirSync(f.directory), [path.basename(f.target)]);
});

test('multi backup retains successful individual archives but reports partial failure', async t => {
    const f = fixture(t);
    let count = 0;
    const original = options({ influxDBMulti: true, influxDBEvents: [options({ nameSuffix: 'one' }), options({ nameSuffix: 'two' })] });
    await assert.rejects(load('backup', { execFile: (_a, _b, _c, cb) => { count++; cb(count === 2 ? new Error('failed') : null, '', ''); } }).run({ context: f.ctx, options: original }));
    assert.equal(count, 2); assert.deepEqual(f.ctx.done, []); assert.equal(f.ctx.fileNames.length, 1);
    assert.equal(original.nameSuffix, undefined);
});

test('empty multi targets and unsafe suffix rejected before a CLI invocation', async t => {
    const f = fixture(t); let calls = 0;
    const subject = load('backup', { execFile: () => { calls++; } });
    await assert.rejects(subject.run({ context: f.ctx, options: options({ influxDBMulti: true }) }), /TARGETS_INVALID/);
    await assert.rejects(subject.run({ context: f.ctx, options: options({ nameSuffix: '../../escape' }) }), /SUFFIX_INVALID/);
    assert.equal(calls, 0);
});

for (const failure of ['cli', 'extract', 'validation']) {
    test(`restore ${failure} failure rejects and cleans only its private temp directory`, async t => {
        const f = fixture(t);
        const prior = path.join(f.directory, 'influxDBtmp'); fs.mkdirSync(prior); fs.writeFileSync(path.join(prior, 'old'), 'keep');
        const subject = load('restore', {
            execFile: (_a, _b, _c, cb) => cb(new Error(TOKEN), TOKEN, TOKEN),
            decompressAsync: async ({ dest }) => { if (failure === 'extract') throw new Error(TOKEN); writeManifest(dest); },
        });
        await assert.rejects(subject.restore({ context: f.ctx, options: options({ backupDir: f.directory, ...(failure === 'validation' ? { token: '' } : {}) }), fileName: 'fixture.tar.gz' }));
        assert.equal(fs.readFileSync(path.join(prior, 'old'), 'utf8'), 'keep');
        assert.deepEqual(fs.readdirSync(f.directory), ['influxDBtmp']);
        assert.equal(JSON.stringify([f.ctx.errors, f.logs]).includes(TOKEN), false);
        assert.equal(f.logs.some(row => row.includes('completed successfully')), false);
    });
}

test('restore succeeds only after successful CLI and preserves disabled writer settings', async t => {
    const f = fixture(t);
    f.ctx.adapter = {
        async getObjectViewAsync() { return { rows: [{ value: { _id: 'system.adapter.influxdb.0' } }] }; },
        async getForeignObjectAsync() { return { common: { enabled: false } }; },
        async getForeignStateAsync() { return { val: false, ack: true }; },
    };
    assert.equal(await load('restore').restore({ context: f.ctx, options: options({ backupDir: f.directory }), fileName: 'fixture.tar.gz' }), 'influxDB restore done');
    assert.equal(fs.readdirSync(f.directory).length, 0);
});

for (const enabled of [true, false]) {
    test(`restore refuses ${enabled ? 'enabled' : 'still running'} writers before extraction`, async t => {
        const f = fixture(t); let extracts = 0;
        f.ctx.adapter = {
            async getObjectViewAsync() { return { rows: [{ value: { _id: 'system.adapter.influxdb.0' } }] }; },
            async getForeignObjectAsync() { return { common: { enabled } }; },
            async getForeignStateAsync() { return { val: true, ack: true }; },
        };
        await assert.rejects(load('restore', { decompressAsync: async () => { extracts++; } }).restore({ context: f.ctx, options: options({ backupDir: f.directory }), fileName: 'fixture' }), /STOP_WRITERS_REQUIRED/);
        assert.equal(extracts, 0);
    });
}

test('local destructive drop failure prevents restore and surfaces error', async t => {
    const f = fixture(t); const commands = [];
    await assert.rejects(load('restore', {
        decompressAsync: async ({ dest }) => writeDropManifest(dest),
        execFile: (file, args, _opts, cb) => { commands.push([file, args]); cb(new Error('drop failed'), '', ''); },
    }).restore({
        context: f.ctx, options: options({ backupDir: f.directory, dbversion: '1.x', dbType: 'local', deleteDatabase: true }), fileName: 'fixture',
    }), /drop failed/);
    assert.equal(commands.length, 1);
    assert.equal(commands[0][0], 'influx');
});

for (const mismatch of ['name', 'version', 'missing']) {
    test(`single-target ${mismatch} manifest mismatch prevents destructive drop`, async t => {
        const f = fixture(t); let commands = 0;
        const subject = load('restore', {
            execFile: () => { commands++; },
            decompressAsync: async ({ dest }) => {
                if (mismatch === 'name') {
                    writeDropManifest(dest);
                    const manifestPath = path.join(dest, 'backup.manifest');
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    manifest.files[0].database = 'other-database';
                    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
                } else if (mismatch === 'version') writeManifest(dest);
            },
        });
        await assert.rejects(subject.restore({ context: f.ctx, options: options({
            backupDir: f.directory, dbversion: '1.x', dbType: 'local', deleteDatabase: true,
        }), fileName: 'fixture' }), /MANIFEST/);
        assert.equal(commands, 0);
    });
}

for (const missing of ['metadata', 'data']) {
    test(`local destructive drop requires the manifest's regular ${missing} file`, async t => {
        const f = fixture(t); let commands = 0;
        await assert.rejects(load('restore', {
            decompressAsync: async ({ dest }) => writeDropManifest(dest, missing),
            execFile: () => { commands++; },
        }).restore({ context: f.ctx, options: options({
            backupDir: f.directory, dbversion: '1.x', dbType: 'local', deleteDatabase: true,
        }), fileName: 'fixture' }), /DROP_ARCHIVE_INCOMPLETE/);
        assert.equal(commands, 0);
    });
}

test('writer reactivation during extraction prevents replay', async t => {
    const f = fixture(t); let queries = 0; let commands = 0;
    f.ctx.adapter = {
        async getObjectViewAsync() { queries++; return { rows: [{ value: { _id: 'system.adapter.influxdb.0' } }] }; },
        async getForeignObjectAsync() { return { common: { enabled: queries > 1 } }; },
        async getForeignStateAsync() { return { val: false, ack: true }; },
    };
    await assert.rejects(load('restore', { execFile: () => { commands++; } }).restore({
        context: f.ctx, options: options({ backupDir: f.directory }), fileName: 'fixture',
    }), /STOP_WRITERS_REQUIRED/);
    assert.equal(queries, 2); assert.equal(commands, 0);
});

for (const manifest of ['malformed', 'missing', 'ambiguous', 'unconfigured']) {
    test(`multi restore ${manifest} manifest cannot guess a target`, async t => {
        const f = fixture(t); let calls = 0;
        const subject = load('restore', {
            execFile: () => { calls++; },
            decompressAsync: async ({ dest }) => {
                if (manifest === 'missing') return;
                fs.writeFileSync(path.join(dest, 'backup.manifest'), manifest === 'malformed' ? '{broken' : JSON.stringify({ buckets: manifest === 'ambiguous' ? [{ bucketName: 'a' }, { bucketName: 'b' }] : [{ bucketName: 'unknown' }] }));
            },
        });
        await assert.rejects(subject.restore({ context: f.ctx, options: options({ backupDir: f.directory, influxDBMulti: true }), fileName: 'fixture' }));
        assert.equal(calls, 0);
    });
}
