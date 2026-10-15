'use strict';
// The CLI output may contain private paths/configuration. Publish only these
// fixed classes and phase Booleans, never captured text or arbitrary codes.
const FAILURE_PATTERNS = Object.freeze({
    DATABASE_CONNECTION_FAILED: /No connection to (?:objects|states)|No connection to databases possible|\bEOS_PG_(?:CONNECTION_FAILED|OBJECTS_CONNECT_FAILED|STATES_CONNECT_FAILED)\b/,
    DATABASE_CONNECTION_CAPACITY: /remaining connection slots are reserved|too many clients already/,
    DATABASE_READ_FAILED: /\bEOS_PG_(?:QUERY_FAILED|READ_LIMIT|BATCH_LIMIT|KEY_LIMIT|STATES_INVALID_KEYS|UNAVAILABLE)\b/,
    PRIVATE_PATH_REJECTED: /\bEOS_BACKUP_PRIVATE_PATH\b/,
    SOURCE_PATH_REJECTED: /\bEOS_BACKUP_SOURCE_PATH\b/,
    CONFIG_READ_FAILED: /Cannot read config file:/,
    OBJECT_EXPORT_FAILED: /Cannot get objects:/,
    STATE_EXPORT_FAILED: /Cannot get states:/,
    DATA_COPY_FAILED: /Could not backup .* directory:/,
    VALIDATION_FAILED: /Backup not created:|Backup does not contain valid (?:objects|states)|file is corrupted:/,
    ARCHIVE_PACK_FAILED: /Cannot pack directory/,
    CLI_BACKUP_FAILED: /Cannot create backup:/,
    API_MISSING: /is not a function/,
});
function cliSummary(text, exitCode, signal) {
    const clean = String(text).slice(-1048576).replace(/\x1b\[[0-9;]*m/g, '');
    return {
        exitCode: Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 255 ? exitCode : null,
        signal: ['SIGTERM', 'SIGKILL'].includes(signal) ? signal : null,
        failureCodes: Object.entries(FAILURE_PATTERNS).filter(([, pattern]) => pattern.test(clean)).map(([code]) => code).sort(),
        phases: { objectsSaved: /\b(?:[0-9]+|no) objects saved/.test(clean), statesSaved: /\b[0-9]+ states saved/.test(clean),
            validationStarted: /Validating backup \.\.\./.test(clean), validated: /The backup is valid!/.test(clean), archiveCreated: /Backup created:/.test(clean) },
    };
}
function databaseCapacity(row) {
    const keys = ['maximum', 'superuserReserved', 'roleReserved', 'currentDatabaseConnections'];
    if (!row || keys.some(key => !Number.isSafeInteger(row[key]) || row[key] < 0 || row[key] > 100000) ||
        row.maximum <= row.superuserReserved + row.roleReserved) return { available: false };
    return { available: true, ...Object.fromEntries(keys.map(key => [key, row[key]])),
        ordinarySlots: row.maximum - row.superuserReserved - row.roleReserved };
}
async function readDatabaseCapacity(store) {
    // numbackends includes the current database's other roles. Filtering
    // pg_stat_activity.backend_type would hide their rows without extra grants.
    const capacity = await store._query(`SELECT current_setting('max_connections')::int AS maximum,
        current_setting('superuser_reserved_connections')::int AS "superuserReserved",
        current_setting('reserved_connections')::int AS "roleReserved",
        (SELECT numbackends FROM pg_stat_database WHERE datname = current_database()) AS "currentDatabaseConnections"`);
    return databaseCapacity(capacity.rows[0]);
}
function assertSuccessfulBackup(summary) {
    // Upstream catches some export errors, logs them and can still exit zero.
    // A readable/validated archive must not hide a partial logical export.
    if (summary.exitCode !== 0 || summary.signal !== null || summary.failureCodes.length !== 0) {
        throw new Error('MANAGEMENT_CLI_FAILED');
    }
}
module.exports = { cliSummary, databaseCapacity, readDatabaseCapacity, assertSuccessfulBackup };
