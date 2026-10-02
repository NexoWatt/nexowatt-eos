#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const runtimePath = path.join(ROOT, 'ems', 'modules', 'charging-management.js');
const canonicalPath = path.join(ROOT, 'src-ts', 'runtime-executables', 'ems', 'modules', 'charging-management.ts');
const mainPath = path.join(ROOT, 'src-ts', 'runtime-executables', 'main.ts');
const auditServicePath = path.join(ROOT, 'src-ts', 'runtime-executables', 'ems', 'services', 'charging-management-audit.ts');
const auditApiPath = path.join(ROOT, 'src-ts', 'runtime-executables', 'lib', 'charging-diagnostics-api.ts');
const appTsPath = path.join(ROOT, 'src-ts', 'runtime-executables', 'www', 'charging-diagnostics-appcenter.ts');
const appHtmlPath = path.join(ROOT, 'www', 'ems-apps.html');
const stylesPath = path.join(ROOT, 'www', 'styles.css');

const {
    finiteChargingAuditNumber,
    deriveChargingAuditLimiter,
    deriveChargingAuditGlobalLimiter,
    buildChargingAuditSnapshot,
    chargingAuditEventSignature,
    buildChargingAuditEvents,
} = require(runtimePath);

assert.strictEqual(finiteChargingAuditNumber(null, null), null, 'null darf nicht zu 0 werden');
assert.strictEqual(finiteChargingAuditNumber('', null), null, 'leerer String darf nicht zu 0 werden');
assert.strictEqual(finiteChargingAuditNumber('4200', null), 4200, 'numerischer String muss lesbar sein');

const baseInput = {
    ts: 1_720_000_000_000,
    context: 'normal-allocation-write-plan',
    mode: 'auto',
    budgetMode: 'bounded',
    status: 'running',
    controlActive: true,
    pausedByPeakShaving: false,
    safetyStop: false,
    budgetW: 22_000,
    actualPowerW: 9_200,
    reservedPowerW: 11_000,
    targetPowerW: 12_000,
    remainingPowerW: 10_000,
    gridImportW: 7_500,
    gridImportLimitW: 40_000,
    gridImportLimitEffW: 40_000,
    gridCapEvcsW: 25_000,
    gridCapBinding: false,
    phaseCapEvcsW: 22_000,
    phaseCapBinding: false,
    para14aActive: true,
    para14aCapEvcsW: 10_500,
    para14aBinding: true,
    storageAssistActive: true,
    storageAssistRequestedW: 2_000,
    storageAssistAcceptedW: 1_500,
    safetyEnvelope: {
        valid: true,
        emergencyStop: false,
        generation: 77,
        timestamp: 1_720_000_000_000,
    },
    wallboxes: [
        {
            safe: 'lp1',
            name: 'Ladepunkt 1',
            online: true,
            enabled: true,
            controlAvailable: true,
            connected: true,
            vehicleDemandConfirmed: true,
            charging: true,
            actualPowerW: 4_100,
            meterStale: false,
        },
        {
            safe: 'lp2',
            name: 'DC Schnelllader',
            online: true,
            enabled: true,
            controlAvailable: true,
            connected: true,
            vehicleDemandConfirmed: true,
            charging: true,
            actualPowerW: 5_100,
            meterStale: false,
        },
    ],
    allocations: [
        {
            safe: 'lp1',
            name: 'Ladepunkt 1',
            effectiveMode: 'minpv',
            userMode: 'minpv',
            online: true,
            enabled: true,
            controlAvailable: true,
            connected: true,
            vehicleDemandConfirmed: true,
            charging: true,
            actualPowerW: 4_100,
            rawTargetW: 7_200,
            rawTargetA: 10.4,
            targetW: 6_200,
            targetA: 9.0,
            demandReserveW: 6_200,
            pvUsedW: 2_100,
            batteryContributionW: 500,
            stationKey: '',
            stationRemainingW: null,
            safetyRequestedW: 7_200,
            safetyAllowedW: 6_200,
            safetyBinding: 'para14a',
            safetyReason: 'LIMITED_BY_14A',
            reason: 'LIMITED_BY_14A',
            applied: true,
            applyStatus: 'applied',
            executorSetpointKey: 'cm.wb.lp1.setA',
        },
        {
            safe: 'lp2',
            name: 'DC Schnelllader',
            effectiveMode: 'boost',
            userMode: 'boost',
            chargerType: 'DC',
            connectorNo: 1,
            online: true,
            enabled: true,
            controlAvailable: true,
            connected: true,
            vehicleDemandConfirmed: true,
            charging: true,
            actualPowerW: 5_100,
            rawTargetW: 20_000,
            rawTargetA: 0,
            targetW: 5_800,
            targetA: 0,
            demandReserveW: 4_800,
            pvUsedW: 3_000,
            batteryContributionW: 1_000,
            stationKey: 'station-a',
            stationAllocatedW: 5_800,
            stationRemainingW: 200,
            safetyRequestedW: 20_000,
            safetyAllowedW: 5_800,
            safetyBinding: 'station',
            safetyReason: 'LIMITED_BY_STATION_CAP',
            reason: 'LIMITED_BY_STATION_CAP',
            applied: false,
            applyStatus: 'write_failed:no-readback',
            executorSetpointKey: 'cm.wb.lp2.setW',
        },
    ],
};

const snapshot = buildChargingAuditSnapshot(baseInput);
assert.strictEqual(snapshot.schemaVersion, 1);
assert.strictEqual(snapshot.wallboxes.length, 2, 'beide Ladepunkte müssen enthalten sein');
assert.strictEqual(snapshot.activeLimiter, 'para14a', 'globale §14a-Bindung muss sichtbar sein');
assert.strictEqual(snapshot.safetyStage, 'PARA14A-LIMIT', '§14a muss als Begrenzungsstufe sichtbar sein');
assert.strictEqual(snapshot.safetyActive, true, 'aktive §14a-Grenze muss als Safety-/Begrenzungsstufe markiert sein');
assert.strictEqual(snapshot.limitActive, true);
assert.strictEqual(snapshot.targetPowerW, 12_000, 'NexoWatt-Gesamtsoll muss sichtbar sein');
assert.strictEqual(snapshot.reservedPowerW, 11_000, 'Gesamtreserve muss sichtbar sein');
assert.strictEqual(snapshot.grid.importW, 7_500, 'NVP-/Importwert muss sichtbar sein');

const lp1 = snapshot.wallboxes.find((row) => row.safe === 'lp1');
const lp2 = snapshot.wallboxes.find((row) => row.safe === 'lp2');
assert(lp1 && lp2);
assert.strictEqual(lp1.requestedPowerW, 7_200, 'Anforderung vor finaler Klemmung muss sichtbar sein');
assert.strictEqual(lp1.targetPowerW, 6_200, 'finaler NexoWatt-Sollwert muss sichtbar sein');
assert.strictEqual(lp1.actualPowerW, 4_100, 'Istleistung muss sichtbar sein');
assert.strictEqual(lp1.reservedPowerW, 6_200, 'Reserve muss sichtbar sein');
assert.strictEqual(lp1.pvShareW, 2_100, 'PV-Anteil muss sichtbar sein');
assert.strictEqual(lp1.storageShareW, 500, 'Speicher-Anteil muss sichtbar sein');
assert.strictEqual(lp1.limiter, 'para14a');
assert.strictEqual(lp1.stationRemainingW, null, 'fehlende Station darf diagnostisch nicht als 0-W-Grenze erscheinen');
assert.strictEqual(lp1.setpointKey, 'cm.wb.lp1.setA');
assert.strictEqual(lp2.limiter, 'station', 'Stationslimit muss pro Ladepunkt sichtbar sein');
assert.strictEqual(lp2.stationRemainingW, 200);
assert.strictEqual(lp2.applyStatus, 'write_failed:no-readback', 'Write-Fehler muss sichtbar sein');

assert.strictEqual(deriveChargingAuditLimiter({ reason: 'NO_VEHICLE', connected: false, targetW: 0 }, {}), 'no-vehicle');
assert.strictEqual(deriveChargingAuditGlobalLimiter({ gridCapBinding: true }, []), 'grid-import');

const firstEvents = buildChargingAuditEvents(null, snapshot);
assert(firstEvents.some((event) => event.type === 'global'), 'Initialsnapshot braucht globales Ereignis');
assert(firstEvents.some((event) => event.safe === 'lp1'), 'LP1-Ereignis fehlt');
assert(firstEvents.some((event) => event.safe === 'lp2'), 'LP2-Ereignis fehlt');

const signature = chargingAuditEventSignature(snapshot);
const tinyInput = JSON.parse(JSON.stringify(baseInput));
tinyInput.ts += 2_000;
tinyInput.actualPowerW += 20;
tinyInput.allocations[0].actualPowerW += 20;
tinyInput.wallboxes[0].actualPowerW += 20;
const tinySnapshot = buildChargingAuditSnapshot(tinyInput);
assert.strictEqual(chargingAuditEventSignature(tinySnapshot), signature, 'kleine Leistungsschwankungen dürfen keine neue Signatur erzeugen');
assert.strictEqual(buildChargingAuditEvents(tinySnapshot, tinySnapshot, { heartbeat: false }).length, 0, 'gleicher Snapshot darf kein Ereignis erzeugen');
const heartbeat = buildChargingAuditEvents(tinySnapshot, tinySnapshot, { heartbeat: true });
assert.strictEqual(heartbeat.length, 1, 'Heartbeat muss genau ein Ereignis erzeugen');
assert.strictEqual(heartbeat[0].type, 'heartbeat');

const idleSnapshot = buildChargingAuditSnapshot({
    ts: baseInput.ts,
    mode: 'auto',
    status: 'idle',
    safetyEnvelope: { valid: true, emergencyStop: false },
    wallboxes: [{ safe: 'idle', name: 'Idle', online: true, enabled: true, connected: false, vehicleDemandConfirmed: false }],
    allocations: [{ safe: 'idle', name: 'Idle', online: true, enabled: true, connected: false, vehicleDemandConfirmed: false, targetW: 0, targetA: 0, reason: 'NO_VEHICLE' }],
});
assert.strictEqual(idleSnapshot.activeLimiter, 'none', 'Kein Fahrzeug ist ein Informationszustand, keine globale Begrenzung');
assert.strictEqual(idleSnapshot.wallboxes[0].limiter, 'no-vehicle');
assert.strictEqual(idleSnapshot.limitActive, false);
assert.strictEqual(idleSnapshot.safetyStage, 'NORMAL', 'Kein Fahrzeug ist keine Sicherungsstufe');
assert.strictEqual(idleSnapshot.safetyActive, false);

const runtimeSource = fs.readFileSync(canonicalPath, 'utf8');
const mainSource = fs.readFileSync(mainPath, 'utf8');
const auditServiceSource = fs.readFileSync(auditServicePath, 'utf8');
const auditApiSource = fs.readFileSync(auditApiPath, 'utf8');
const appSource = fs.readFileSync(appTsPath, 'utf8');
const htmlSource = fs.readFileSync(appHtmlPath, 'utf8');
const stylesSource = fs.readFileSync(stylesPath, 'utf8');

for (const marker of [
    'chargingManagement.audit.snapshotJson',
    'chargingManagement.audit.recentEventsJson',
    'chargingManagement.audit.activeLimiter',
    'chargingManagement.audit.safetyStage',
    'adapter._nwChargingManagementAudit',
]) assert(auditServiceSource.includes(marker), `Audit-Service-Marker fehlt: ${marker}`);
for (const marker of [
    "context: 'stale-meter-safety-fallback'", "context: 'mode-off'",
    "context: 'peak-shaving-safety-fallback'", "context: 'normal-allocation-write-plan'",
]) assert(runtimeSource.includes(marker), `Runtime-Marker fehlt: ${marker}`);
for (const forbidden of ['applySetpoint(', '.writeNumber(', '.writeBoolean(', '_forceWriteNumber(', '_forceWriteBoolean(']) {
    assert(!auditServiceSource.includes(forbidden), `Auditservice darf keinen Hardwarewrite enthalten: ${forbidden}`);
}
assert(mainSource.includes('registerChargingDiagnosticsAuditApi(app, this, requireInstaller)'), 'Audit-API-Registrierung fehlt');
assert(auditApiSource.includes("app.get('/api/ems/charging/audit', requireInstaller"), 'geschützte Audit-GET-Route fehlt');
assert(auditApiSource.includes("app.post('/api/ems/charging/audit/clear', requireInstaller"), 'geschützte Clear-Route fehlt');
assert(auditApiSource.includes('safetyEnvelope'), 'SafetyEnvelope fehlt in Audit-API');

for (const id of [
    'chargingAuditSummary', 'chargingAuditWallboxes', 'chargingAuditEvents', 'chargingAuditStatus',
    'refreshChargingAudit', 'chargingAuditAutoRefresh', 'chargingAuditOnlyProblems', 'chargingAuditFilter',
    'exportChargingAuditJson', 'exportChargingAuditCsv', 'clearChargingAudit',
]) {
    assert(htmlSource.includes(`id="${id}"`), `AppCenter-DOM-ID fehlt: ${id}`);
    assert(appSource.includes(id), `AppCenter-JS-Referenz fehlt: ${id}`);
}
for (const label of ['NexoWatt Soll', 'Anforderung', 'Sicherungsstufe', 'Aktive Begrenzung', 'Stationsrest', 'Write']) {
    assert(appSource.includes(label) || htmlSource.includes(label), `sichtbares Diagnosefeld fehlt: ${label}`);
}
assert(stylesSource.includes('.nw-charging-audit'), 'AppCenter-Diagnose-CSS fehlt');
assert(appSource.includes('window.setInterval') && appSource.includes('evcsVisible()'), '2-s-Live-Aktualisierung im Ladepunkte-Tab fehlt');
assert(appSource.includes("'/api/ems/charging/audit?limit=240'"), 'Audit-API-Aufruf fehlt');
assert(appSource.includes("'/api/ems/charging/audit/clear'"), 'Clear-API-Aufruf fehlt');

console.log('[rc52-charging-diagnostics-log] OK: read-only Live-Snapshot, 2 Ladepunkte, Limiter/Sicherungsstufe, Soll/Ist/Reserve/PV, Write-Status, Ringpuffer und AppCenter-UI geprüft.');
