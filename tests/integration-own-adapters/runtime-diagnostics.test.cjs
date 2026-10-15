'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { RuntimeDiagnostics, recordScan } = require('./runtime-diagnostics.cjs');
const { RuntimeLog, indicators } = require('../integration-management/runtime-log.cjs');
test('runtime diagnostics publish fixed scopes and classes without log payloads or arbitrary codes', () => {
    const diagnostics = new RuntimeDiagnostics();
    diagnostics.observe('\x1b[31merror:\x1b[0m eebus.0 Unload cleanup failed: private-password=secret\n' +
        'error: nexowatt-backup.0 EOS_BACKUP_STATUS_WRITE_FAILED /private/token\n' +
        'error: host.private Cannot stop unknown-adapter.9: private-secret\n' +
        'error: private-adapter.0 EOS_UNKNOWN_PRIVATE_CODE private-database\n');
    assert.deepEqual(diagnostics.snapshot(), [
        { scope: 'eebus', indicators: ['ADAPTER_UNLOAD_FAILED', 'RUNTIME_ERROR_LOGGED'] },
        { scope: 'nexowatt-backup', indicators: ['BACKUP_STATUS_WRITE_FAILED', 'RUNTIME_ERROR_LOGGED'] },
        { scope: 'controller', indicators: ['CONTROLLER_STOP_FAILED', 'RUNTIME_ERROR_LOGGED'] },
        { scope: 'unscoped', indicators: ['RUNTIME_ERROR_LOGGED'] },
    ]);
    assert.doesNotMatch(JSON.stringify(diagnostics.snapshot()), /private|secret|password|unknown|token|database/i);
    // A known adapter name inside an unrelated adapter identifier is not a scope.
    const unknown = new RuntimeDiagnostics(); unknown.observe('error: private-eebus.0 EOS_UNKNOWN_PRIVATE_CODE');
    assert.deepEqual(unknown.snapshot(), [{ scope: 'unscoped', indicators: ['RUNTIME_ERROR_LOGGED'] }]);
});
test('bounded private file scans retain distinct before/after-stop evidence and exclude old log data', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-runtime-diagnostics-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const file = path.join(directory, 'runtime.2026-10-15.log');
    fs.writeFileSync(file, 'error: eebus.0 private-old-error\n', { mode: 0o600 });
    const diagnostics = new RuntimeDiagnostics(), log = new RuntimeLog(directory, text => diagnostics.observe(text)), boot = {};
    recordScan(boot, 'cleanup-before-stop', log.scan(), diagnostics);
    fs.appendFileSync(file, 'error: eebus.0 Cannot set alive state to false: private-secret\n');
    recordScan(boot, 'cleanup-after-stop', log.scan(), diagnostics);
    assert.deepEqual(boot.runtimeScans[0], { phase: 'cleanup-before-stop', bytesRead: 0, indicators: [], processDiagnostics: [] });
    assert.deepEqual(boot.runtimeScans[1].processDiagnostics, [{ scope: 'eebus', indicators: ['ALIVE_SHUTDOWN_WRITE_FAILED', 'RUNTIME_ERROR_LOGGED'] }]);
    assert.deepEqual(boot.runtimeLog.indicators, ['RUNTIME_ERROR_LOGGED']);
    assert.doesNotMatch(JSON.stringify(boot), /private|secret/);
    assert.throws(() => recordScan(boot, 'private-phase', log.scan(), diagnostics), /MANAGEMENT_RUNTIME_DIAGNOSTIC_PHASE/);
    while (boot.runtimeScans.length < 32) recordScan(boot, 'cleanup-after-stop', log.scan(), diagnostics);
    assert.throws(() => recordScan(boot, 'cleanup-after-stop', log.scan(), diagnostics), /MANAGEMENT_RUNTIME_DIAGNOSTIC_LIMIT/);
});
test('actual adapter-core rejection spellings stay fatal without exposing their payload', () => {
    for (const text of ['UnhandledPromiseRejection private-secret', 'Unhandled promise rejection. private-secret',
        'unhandled promise rejection: private-secret']) {
        assert.ok(indicators(text).has('UNHANDLED_REJECTION'));
        assert.doesNotMatch(JSON.stringify([...indicators(text)]), /private|secret/);
    }
});
