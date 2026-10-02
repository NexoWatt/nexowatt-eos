'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildInfluxBackupInvocation,
    buildInfluxRestoreInvocation,
    formatInfluxCliError,
    resolveInfluxExecutable,
} = require('../build/lib/influxDbCli.js');

function localV2(overrides = {}) {
    return {
        host: '127.0.0.1',
        port: 8086,
        dbName: 'NexoWatt',
        token: 'super-secret-token',
        protocol: 'http',
        dbversion: '2.x',
        dbType: 'local',
        exe: '',
        ...overrides,
    };
}

test('ignores a bucket or directory name entered as CLI path and falls back to influx', () => {
    const resolved = resolveInfluxExecutable('NexoWatt_Historie', '2.x');
    assert.equal(resolved.executable, 'influx');
    assert.match(resolved.warning, /kein Sicherungsverzeichnis/);
});

test('accepts an absolute CLI path', () => {
    const resolved = resolveInfluxExecutable('/usr/local/bin/influx', '2.x');
    assert.equal(resolved.executable, '/usr/local/bin/influx');
    assert.equal(resolved.warning, undefined);
});

test('builds a local InfluxDB 2 backup without putting the token on the command line', () => {
    const invocation = buildInfluxBackupInvocation(localV2(), '/opt/iobroker/backups/influx-tmp');
    assert.equal(invocation.executable, 'influx');
    assert.deepEqual(invocation.args, [
        'backup',
        '--bucket',
        'NexoWatt',
        '/opt/iobroker/backups/influx-tmp',
    ]);
    assert.equal(invocation.env.INFLUX_TOKEN, 'super-secret-token');
    assert.equal(invocation.args.includes('super-secret-token'), false);
    assert.equal(invocation.args.includes('-t'), false);
    assert.equal(invocation.args.includes('--token'), false);
});

test('builds a remote HTTPS backup with host and TLS skip flag', () => {
    const invocation = buildInfluxBackupInvocation(
        localV2({ dbType: 'remote', host: 'influx.local', protocol: 'https', port: 8086 }),
        '/tmp/influx-backup',
    );
    assert.deepEqual(invocation.args, [
        'backup',
        '--bucket',
        'NexoWatt',
        '--host',
        'https://influx.local:8086',
        '--skip-verify',
        '/tmp/influx-backup',
    ]);
});

test('requires a token for InfluxDB 2.x', () => {
    assert.throws(
        () => buildInfluxBackupInvocation(localV2({ token: '' }), '/tmp/influx-backup'),
        /Token fehlt/,
    );
});

test('builds restore invocation without exposing the token', () => {
    const invocation = buildInfluxRestoreInvocation(localV2(), '/tmp/influx-restore');
    assert.deepEqual(invocation.args, [
        'restore',
        '--bucket',
        'NexoWatt',
        '/tmp/influx-restore',
    ]);
    assert.equal(invocation.env.INFLUX_TOKEN, 'super-secret-token');
    assert.equal(invocation.args.includes('super-secret-token'), false);
});

test('formats a missing CLI error with a clear installation hint', () => {
    const error = Object.assign(new Error('spawn influx ENOENT'), { code: 'ENOENT' });
    assert.match(formatInfluxCliError(error, 'influx', '2.x'), /wurde nicht gefunden/);
    assert.match(formatInfluxCliError(error, 'influx', '2.x'), /absoluten Pfad/);
});
