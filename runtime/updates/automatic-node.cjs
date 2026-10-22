'use strict';
// This policy authorizes only signed Node-only updates on the managed TEST
// baseline. It is not a forged operator maintenance/backup confirmation.
const { isDeepStrictEqual: equal } = require('node:util');
const nodePolicy = require('./node-policy.cjs');
const SCHEDULE = Object.freeze({ timeZone: 'Europe/Berlin', start: '02:30', end: '03:00', catchUp: false });
const STATES = new Set(['SCHEDULED', 'CHECKING', 'NO_UPDATE', 'MANUAL_RELEASE', 'QUEUED', 'SUCCEEDED', 'DEFERRED', 'FAILED', 'RECOVERY_REQUIRED']);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: SCHEDULE.timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function windowAt(now) {
    if (!Number.isFinite(now)) fail('UPDATE_AUTOMATIC_CLOCK');
    const parts = Object.fromEntries(formatter.formatToParts(new Date(now)).map(row => [row.type, row.value]));
    const minute = Number(parts.hour) * 60 + Number(parts.minute);
    return { date: `${parts.year}-${parts.month}-${parts.day}`, open: minute >= 150 && minute < 180 };
}
function initialRecord() { return { schemaVersion: 1, lastAttemptDate: null, lastAttempt: null, state: 'SCHEDULED', reason: null }; }
function validateRecord(record) {
    if (!record || Object.keys(record).sort().join('|') !== ['schemaVersion', 'lastAttemptDate', 'lastAttempt', 'state', 'reason'].sort().join('|')
        || record.schemaVersion !== 1 || !STATES.has(record.state)
        || !(record.reason === null || typeof record.reason === 'string' && /^(?:UPDATE|REPAIR)_[A-Z_]{1,70}$/.test(record.reason))) fail('UPDATE_AUTOMATIC_STATE');
    if (record.lastAttemptDate === null && record.lastAttempt === null) {
        if (record.state !== 'SCHEDULED' || record.reason !== null) fail('UPDATE_AUTOMATIC_STATE');
    } else if (typeof record.lastAttempt !== 'string' || !Number.isFinite(Date.parse(record.lastAttempt))
        || new Date(record.lastAttempt).toISOString() !== record.lastAttempt
        || windowAt(Date.parse(record.lastAttempt)).date !== record.lastAttemptDate) fail('UPDATE_AUTOMATIC_STATE');
    return record;
}
function view(record) {
    validateRecord(record);
    return { enabled: true, mode: 'signed-node-only', major: 24, schedule: { ...SCHEDULE },
        state: record.state, reason: record.reason, lastAttempt: record.lastAttempt };
}
function assertTransition(previous, next) {
    if (!nodePolicy.supportedVersion(previous?.manifest?.nodeVersion) || !nodePolicy.supportedVersion(next?.manifest?.nodeVersion)
        || nodePolicy.compareVersions(next.manifest.nodeVersion, previous.manifest.nodeVersion) <= 0) fail('UPDATE_AUTOMATIC_NODE_REQUIRED');
    if (!equal(previous.catalog, next.catalog)) fail('UPDATE_AUTOMATIC_PAYLOAD');
    const oldRows = new Map(previous.manifest.files.map(row => [row.path, row]));
    const nextRows = new Map(next.manifest.files.map(row => [row.path, row]));
    const allowed = new Set([nodePolicy.BINARY, nodePolicy.DESCRIPTOR, nodePolicy.LICENSE, 'sbom.cdx.json', 'runtime-build.json']);
    for (const name of new Set([...oldRows.keys(), ...nextRows.keys()])) {
        if (equal(oldRows.get(name), nextRows.get(name))) continue;
        // No additions/deletions, even under the derived metadata allowlist.
        if (!allowed.has(name) || !oldRows.has(name) || !nextRows.has(name)) fail('UPDATE_AUTOMATIC_PAYLOAD');
    }
    return true;
}
module.exports = { SCHEDULE, STATES, windowAt, initialRecord, validateRecord, view, assertTransition };
