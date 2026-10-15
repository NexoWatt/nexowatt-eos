'use strict';
// Diagnostics only: no classification suppresses the runtime failure gate.
const { NAMES } = require('./readiness-diagnostics.cjs');
const { indicators } = require('../integration-management/runtime-log.cjs');
const PHASES = Object.freeze(['boot-ready', 'lease-unlicensed', 'lease-home', 'lease-pro',
    'backup-first', 'backup-second', 'backup-inspected', 'rollback-before-stop', 'rollback-after-stop',
    'final-before-stop', 'final-after-stop', 'cleanup-before-stop', 'cleanup-after-stop']);
const CLASSES = Object.freeze({
    MODULE_NOT_FOUND: /\b(?:MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND)\b|Cannot find module/,
    NATIVE_CONTRACT_REJECTED: /\bNATIVE_(?:HOST_CONTRACT|UNTRUSTED_PATH|CONTENT)\b/,
    BACKUP_STATUS_WRITE_FAILED: /\bEOS_BACKUP_STATUS_WRITE_FAILED\b/,
    OCPP_STATUS_UNAVAILABLE: /\bEOS_OCPP_STATUS_UNAVAILABLE\b/,
    DATABASE_UNAVAILABLE: /\bEOS_PG_(?:UNAVAILABLE|QUERY_FAILED|OBJECTS_CONNECT_FAILED|STATES_CONNECT_FAILED)\b|connection is closed|Connection is closed/,
    ADAPTER_UNLOAD_FAILED: /Unload cleanup failed:|Error during unload:/,
    ALIVE_SHUTDOWN_WRITE_FAILED: /Cannot set alive state to false:/,
    CONTROLLER_STOP_FAILED: /Cannot stop /,
    PROCESS_TERMINATED: /terminated with code:/,
    PROCESS_STOP_TIMEOUT: /did not terminate in time|force terminating|force terminated/i,
    OBJECT_EXPORT_FAILED: /Cannot get objects:/,
    STATE_EXPORT_FAILED: /Cannot get states:/,
    REPOSITORY_CHECK_FAILED: /Cannot check revoked versions:|Cannot update repository:/,
});
class RuntimeDiagnostics {
    constructor() { this.rows = new Map([...NAMES, 'controller', 'unscoped'].map(scope => [scope, new Set()])); }
    observe(text) {
        const clean = String(text).slice(-1048576).replace(/\x1b\[[0-9;]*m/g, '');
        for (const line of clean.split('\n')) {
            const codes = indicators(line);
            for (const [code, pattern] of Object.entries(CLASSES)) if (pattern.test(line)) codes.add(code);
            const scopes = NAMES.filter(name => new RegExp(`(?:^|[^a-z0-9_-])${name}\\.0(?:[^0-9]|$)`).test(line));
            if (!scopes.length) scopes.push(/\bhost\./.test(line) ? 'controller' : 'unscoped');
            for (const scope of scopes) for (const code of codes) this.rows.get(scope).add(code);
        }
    }
    snapshot() { return [...this.rows].filter(([, codes]) => codes.size).map(([scope, codes]) => ({ scope, indicators: [...codes].sort() })); }
}
function recordScan(boot, phase, runtimeLog, diagnostics) {
    if (!PHASES.includes(phase)) throw new Error('MANAGEMENT_RUNTIME_DIAGNOSTIC_PHASE');
    boot.runtimeScans ||= [];
    if (boot.runtimeScans.length >= 32) throw new Error('MANAGEMENT_RUNTIME_DIAGNOSTIC_LIMIT');
    boot.runtimeLog = runtimeLog;
    boot.runtimeScans.push({ phase, ...runtimeLog, processDiagnostics: diagnostics.snapshot() });
}
module.exports = { RuntimeDiagnostics, recordScan };
