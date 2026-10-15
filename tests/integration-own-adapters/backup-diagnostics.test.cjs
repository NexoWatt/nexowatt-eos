'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { cliSummary, databaseCapacity, readDatabaseCapacity, assertSuccessfulBackup } = require('./backup-diagnostics.cjs');
test('failed backup diagnostics retain exit/phase and fixed connection classification without secrets', () => {
    const result = cliSummary('No connection to objects private-host:15432[postgresql]\nEOS_PG_OBJECTS_CONNECT_FAILED password=secret\nremaining connection slots are reserved', 22, null);
    assert.equal(result.exitCode, 22);
    assert.deepEqual(result.failureCodes, ['DATABASE_CONNECTION_CAPACITY', 'DATABASE_CONNECTION_FAILED']);
    assert.ok(Object.values(result.phases).every(value => value === false));
    assert.doesNotMatch(JSON.stringify(result), /private-host|15432|secret|password/);
});
test('backup export, validation and archive creation phases remain separate', () => {
    const result = cliSummary('host.private 100 objects saved\n120 states saved\nValidating backup ...\nThe backup is valid!\nCannot create backup: private path', 26, 'private-signal');
    assert.deepEqual(result.phases, { objectsSaved: true, statesSaved: true, validationStarted: true, validated: true, archiveCreated: false });
    assert.deepEqual(result.failureCodes, ['CLI_BACKUP_FAILED']); assert.equal(result.signal, null);
    assert.doesNotMatch(JSON.stringify(result), /private|100|120/);
    assert.equal(cliSummary('Backup created: /private/archive', 0, null).phases.archiveCreated, true);
    assert.equal(cliSummary('EOS_PRIVATE_SECRET', 'secret', null).exitCode, null);
});
test('database capacity exports only validated fixed numeric fields, rejecting malformed or private values', () => {
    assert.deepEqual(databaseCapacity({ maximum: 40, superuserReserved: 3, roleReserved: 0, currentDatabaseConnections: 34, secret: 'private' }),
        { available: true, maximum: 40, superuserReserved: 3, roleReserved: 0, currentDatabaseConnections: 34, ordinarySlots: 37 });
    for (const row of [null, { maximum: 'secret' }, { maximum: 3, superuserReserved: 3, roleReserved: 0, currentDatabaseConnections: 0 },
        { maximum: 40, superuserReserved: 3, roleReserved: 0, currentDatabaseConnections: Infinity },
        { maximum: 40, superuserReserved: 3, roleReserved: 0, connections: 16 }]) assert.deepEqual(databaseCapacity(row), { available: false });
});
test('capacity reads the current database aggregate once through the existing least-privilege store', async () => {
    let queries = 0;
    const result = await readDatabaseCapacity({ async _query(sql) {
        queries++;
        assert.match(sql, /SELECT numbackends FROM pg_stat_database WHERE datname = current_database\(\)/);
        assert.doesNotMatch(sql, /pg_stat_activity|backend_type|\b(?:GRANT|CREATE|CONNECT)\b|;/i);
        return { rows: [{ maximum: 128, superuserReserved: 3, roleReserved: 0, currentDatabaseConnections: 34,
            database: 'private-database', roles: 'private-roles' }] };
    } });
    assert.equal(queries, 1);
    assert.equal(result.currentDatabaseConnections, 34);
    assert.equal(result.ordinarySlots, 125);
    assert.doesNotMatch(JSON.stringify(result), /private|database|roles/);
});
test('runtime file diagnostics classify fixed PostgreSQL/backup failures without returning messages', () => {
    const { indicators } = require('../integration-management/runtime-log.cjs');
    assert.deepEqual([...indicators('error: private-host EOS_PG_OBJECTS_CONNECT_FAILED password=secret')].sort(),
        ['PG_OBJECTS_CONNECT_FAILED', 'RUNTIME_ERROR_LOGGED']);
    assert.deepEqual([...indicators('EOS_BACKUP_PRIVATE_PATH /private/key')], ['BACKUP_PRIVATE_PATH']);
    assert.deepEqual([...indicators('EOS_UNRECOGNIZED_PRIVATE_TOKEN')], []);
});
test('exit zero and success phases cannot accept a partially failed object or state export', () => {
    const success = '100 objects saved\n120 states saved\nValidating backup ...\nThe backup is valid!\nBackup created: /private/archive';
    assert.doesNotThrow(() => assertSuccessfulBackup(cliSummary(success, 0, null)));
    for (const error of ['Cannot get objects: private secret', 'Cannot get states: private secret']) {
        const summary = cliSummary(`${error}\n${success}`, 0, null);
        assert.ok(summary.phases.validated && summary.phases.archiveCreated);
        assert.throws(() => assertSuccessfulBackup(summary), error => error.message === 'MANAGEMENT_CLI_FAILED');
    }
    assert.throws(() => assertSuccessfulBackup(cliSummary(success, 1, null)), /MANAGEMENT_CLI_FAILED/);
    assert.throws(() => assertSuccessfulBackup(cliSummary(success, null, 'SIGTERM')), /MANAGEMENT_CLI_FAILED/);
    // Phases are informational: acceptance is not dependent on stdio timing.
    assert.doesNotThrow(() => assertSuccessfulBackup(cliSummary('', 0, null)));
});
