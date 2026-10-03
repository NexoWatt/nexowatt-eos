'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const c = require('../../runtime/onboarding/configuration.cjs');
const policy = require('../../runtime/onboarding/policy.cjs');
const { settings, configuredSettings, license } = require('./fixtures.cjs');

test('shipped template choices are exact, hash-bound projections of the existing Devices source', () => {
    const bytes = fs.readFileSync(path.join(__dirname, '../..', c.catalog.source));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), c.catalog.sourceSha256);
    assert.deepEqual(c.catalog.templates, JSON.parse(bytes).templates.map(({ id, name, protocols }) => ({ id, name: name || id, protocols })));
    assert.equal(new Set(c.catalog.templates.map(t => t.id)).size, c.catalog.templates.length);
});
test('configured plant persists sourced limits and input-only mappings without enabling control', () => {
    assert.deepEqual(policy.validateSettings(configuredSettings), configuredSettings);
    const n = c.applyPlant({ peakShaving: { enabled: false }, chargingManagement: { enabled: false } }, configuredSettings.plant);
    assert.equal(n.installerConfig.gridConnectionPower, 43000); assert.equal(n.installerConfig.gridPhaseCount, 3);
    assert.equal(n.peakShaving.maxPhaseA, 63); assert.equal(n.peakShaving.safetyMarginW, 1000);
    assert.equal(n.peakShaving.l3CurrentId, 'nexowatt-devices.0.meter.l3'); assert.equal(n.peakShaving.enabled, false);
    assert.equal(n.chargingManagement.enabled, false); assert.equal(n.chargingManagement.nominalVoltageV, 230);
    assert.equal(n.datapoints.gridPointPower, configuredSettings.plant.measurements.gridPointPower);
    assert.deepEqual(c.summarize(settings, license), { plantConfigurationComplete: false, devicesConfigurationComplete: false,
        deviceCount: 0, licenseConfigured: false, liveMeasurementsVerified: false, physicalControlEnabled: false });
});
test('explicit missing site data stays incomplete, while signed/split phases and §14a EMS are validated', () => {
    assert.deepEqual(policy.validateSettings(settings), settings);
    const p = structuredClone(configuredSettings.plant);
    p.gridPhaseCount = 1; p.measurements.phaseCurrents = [p.measurements.phaseCurrents[0]];
    p.measurements = { ...p.measurements, mode: 'split', gridPointPower: '', gridBuyPower: 'meter.0.buy', gridSellPower: 'meter.0.sell' };
    p.para14a = { enabled: true, mode: 'ems', signalStateId: 'gpio.0.input1', emsSetpointStateId: 'gpio.0.setpoint' };
    assert.deepEqual(c.plant(p), p); assert.equal(c.applyPlant({}, p).installerConfig.para14aEmsSetpointWId, 'gpio.0.setpoint');
    for (const mutate of [p => p.gridConnectionPowerW = 0, p => p.gridConnectionPowerW = 1e12 + 1,
        p => p.gridPhaseCount = 4, p => p.nominalVoltageV = 199, p => p.nominalVoltageV = 261,
        p => p.maxPhaseCurrentA = 0, p => p.maxPhaseCurrentA = 20001, p => p.safetyMarginW = p.gridConnectionPowerW,
        p => p.safetyMeterTimeoutSec = 4, p => p.safetyEnvelopeMaxAgeSec = 31, p => p.valuesConfirmed = false,
        p => p.measurements.gridPointPower = 'https://evil.test/write', p => p.measurements.phaseCurrents[0] = 'system.user.admin',
        p => p.measurements.phaseCurrents[1] = p.measurements.phaseCurrents[0], p => p.measurements.role = 'out',
        p => p.para14a = { enabled: true, mode: 'ems', signalStateId: 'gpio.0.input1', emsSetpointStateId: '' }]) {
        const candidate = structuredClone(configuredSettings.plant); mutate(candidate); assert.throws(() => c.plant(candidate), /SETUP_CONFIGURATION/);
    }
});
test('real model restrictions, serial fields, template/role mismatch and unknown fields fail closed', () => {
    const tcp = configuredSettings.devicePlan.devices[0]; assert.deepEqual(c.device(tcp), tcp);
    const serial = { id: 'battery2', name: 'DEYE fixture', role: 'storage', templateId: 'ess.deye.threePhaseLv.modbusRtu', protocol: 'modbusRtu',
        connection: { path: '/dev/serial/by-id/usb-fixture', baudRate: 9600, parity: 'none', dataBits: 8, stopBits: 1,
            unitId: 1, pollIntervalMs: 1000, timeoutMs: 3000, addressOffset: 0, wordOrder: 'be', byteOrder: 'be' } };
    assert.deepEqual(c.device(serial), serial);
    for (const mutate of [r => r.role = 'charger', r => r.templateId = 'invented.model', r => r.protocol = 'http',
        r => r.connection.host = 'https://evil.test/path', r => r.connection.port = 65536, r => r.connection.pollIntervalMs = 999, r => r.connection.addressOffset = 1,
        r => r.connection.writeEnabled = true]) { const row = structuredClone(tcp); mutate(row); assert.throws(() => c.device(row)); }
    for (const mutate of [r => r.connection.path = '/etc/shadow', r => r.connection.unitId = 248, r => r.connection.addressOffset = 1,
        r => r.connection.baudRate = 115200, r => r.connection.parity = 'arbitrary']) { const row = structuredClone(serial); mutate(row); assert.throws(() => c.device(row)); }
    const link = structuredClone(tcp); link.templateId = 'ess.varta.link.modbusTcpV14'; assert.throws(() => c.device(link));
    link.connection.pollIntervalMs = 5000; assert.doesNotThrow(() => c.device(link));
});
test('EEBUS/OCPP identities and source-backed limits are captured with no connections or commands', () => {
    const eebus = { id: 'peer1', name: 'EEBUS fixture', role: 'meter', templateId: '', protocol: 'eebus', connection: { ski: 'ab'.repeat(20), host: '192.0.2.4', port: 4712 } };
    const ocpp = { id: 'evse1', name: 'OCPP fixture', role: 'charger', templateId: '', protocol: 'ocpp21', connection: { chargePointId: 'EVSE_1', connectorId: 1, minimumChargingCurrentA: 6 } };
    assert.deepEqual(c.device(eebus), eebus); assert.deepEqual(c.device(ocpp), ocpp);
    for (const row of [{ ...eebus, connection: { ...eebus.connection, ski: 'auto-accept' } },
        { ...ocpp, role: 'other' }, { ...ocpp, connection: { ...ocpp.connection, connectorId: 65 } },
        { ...ocpp, connection: { ...ocpp.connection, minimumChargingCurrentA: 33 } }]) assert.throws(() => c.device(row));
});
test('planned device counts and canonical product adapter names must fit the authenticated license', () => {
    const plan = configuredSettings.devicePlan;
    assert.equal(c.licenseCapacity(plan, { valid: true, limits: { chargePoints: 3, batteries: 1 }, adapters: ['nexowatt-devices'] }), true);
    for (const claims of [{ valid: false }, { valid: true, limits: { chargePoints: 3, batteries: 0 }, adapters: ['nexowatt-devices'] },
        { valid: true, limits: { chargePoints: 3, batteries: 1 }, adapters: ['eos-devices'] }]) assert.throws(() => c.licenseCapacity(plan, claims));
    assert.throws(() => c.devicePlan({ ...plan, devices: [plan.devices[0], plan.devices[0]] }));
    assert.throws(() => c.devicePlan({ ...plan, devices: [] }));
    assert.throws(() => c.devicePlan({ ...plan, status: 'none' }));
    assert.throws(() => policy.validateConfiguration({ settings, license: { mode: 'activate', token: 'NWL2.fake' } }));
});
