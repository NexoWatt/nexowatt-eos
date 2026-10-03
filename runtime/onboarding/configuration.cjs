'use strict';
// Technical input bounds trace to the existing product implementation; they are
// not a certified electrical design or a release of physical control.
const net = require('node:net');
const catalog = require('./device-catalog.json');
const product = require('../product/scope.cjs');
const fail = () => { throw Object.assign(new Error('SETUP_CONFIGURATION'), { code: 'SETUP_CONFIGURATION' }); };
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).sort().join(',') === [...keys].sort().join(',');
const number = (v, min, max, integer = false) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
const text = (v, max = 120) => typeof v === 'string' && v.trim() === v && v.length >= 1 && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
const stateId = v => text(v, 256) && /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_\-]+)+$/.test(v) && !v.startsWith('system.');
const host = v => text(v, 253) && (net.isIP(v) !== 0 || /^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(v));
function plant(value) {
    if (exact(value, ['mode', 'reason']) && value.mode === 'deferred' && ['site-data-unavailable', 'no-plant-connected'].includes(value.reason)) return structuredClone(value);
    if (!exact(value, ['mode', 'gridConnectionPowerW', 'gridPhaseCount', 'nominalVoltageV', 'maxPhaseCurrentA', 'safetyMarginW',
        'safetyMeterTimeoutSec', 'safetyEnvelopeMaxAgeSec', 'measurements', 'para14a', 'valuesConfirmed']) || value.mode !== 'configured' ||
        !number(value.gridConnectionPowerW, 1, 1e12, true) || !number(value.gridPhaseCount, 1, 3, true) ||
        !number(value.nominalVoltageV, 200, 260) || !number(value.maxPhaseCurrentA, Number.MIN_VALUE, 20000) ||
        !number(value.safetyMarginW, 0, value.gridConnectionPowerW - 1, true) ||
        !number(value.safetyMeterTimeoutSec, 5, 120, true) || !number(value.safetyEnvelopeMaxAgeSec, 1, 30, true) || value.valuesConfirmed !== true) fail();
    const m = value.measurements;
    if (!exact(m, ['mode', 'gridPointPower', 'gridBuyPower', 'gridSellPower', 'phaseCurrents']) || !['signed', 'split'].includes(m.mode) ||
        !Array.isArray(m.phaseCurrents) || m.phaseCurrents.length !== value.gridPhaseCount || !m.phaseCurrents.every(stateId) ||
        new Set(m.phaseCurrents).size !== m.phaseCurrents.length ||
        (m.mode === 'signed' ? !stateId(m.gridPointPower) || m.gridBuyPower !== '' || m.gridSellPower !== '' :
            m.gridPointPower !== '' || !stateId(m.gridBuyPower) || !stateId(m.gridSellPower) || m.gridBuyPower === m.gridSellPower)) fail();
    const para = value.para14a;
    if (!exact(para, ['enabled', 'mode', 'signalStateId', 'emsSetpointStateId']) || typeof para.enabled !== 'boolean' ||
        (para.enabled ? !['ems', 'direct'].includes(para.mode) || !stateId(para.signalStateId) ||
            (para.mode === 'ems' ? !stateId(para.emsSetpointStateId) : para.emsSetpointStateId !== '') :
            para.mode !== 'disabled' || para.signalStateId !== '' || para.emsSetpointStateId !== '')) fail();
    return structuredClone(value);
}
function device(row) {
    if (!exact(row, ['id', 'name', 'role', 'templateId', 'protocol', 'connection']) || !/^[a-z][a-z0-9_-]{2,31}$/.test(row.id || '') ||
        !text(row.name) || !['meter', 'storage', 'charger', 'other'].includes(row.role)) fail();
    const c = row.connection;
    if (['eebus', 'ocpp21'].includes(row.protocol)) {
        if (row.templateId !== '' || row.protocol === 'ocpp21' && row.role !== 'charger') fail();
        if (row.protocol === 'eebus' && (!exact(c, ['ski', 'host', 'port']) || !/^[a-fA-F0-9]{40}$/.test(c.ski || '') || !host(c.host) || !number(c.port, 1, 65535, true))) fail();
        if (row.protocol === 'ocpp21' && (!exact(c, ['chargePointId', 'connectorId', 'minimumChargingCurrentA']) ||
            !/^[a-zA-Z0-9_-]{1,64}$/.test(c.chargePointId || '') || !number(c.connectorId, 0, 64, true) || !number(c.minimumChargingCurrentA, 1, 32))) fail();
        return structuredClone(row);
    }
    const template = catalog.templates.find(t => t.id === row.templateId);
    if (!template || !template.protocols.includes(row.protocol) || !['modbusTcp', 'modbusRtu', 'modbusAscii'].includes(row.protocol)) fail();
    if (row.role !== templateRole(template.id)) fail();
    const common = ['unitId', 'pollIntervalMs', 'timeoutMs', 'addressOffset', 'wordOrder', 'byteOrder'];
    const fields = row.protocol === 'modbusTcp' ? ['host', 'port', ...common] : ['path', 'baudRate', 'parity', 'dataBits', 'stopBits', ...common];
    if (!exact(c, fields) || !number(c.unitId, 1, row.templateId.startsWith('ess.deye.') ? 247 : 255, true) ||
        !number(c.pollIntervalMs, 250, 600000, true) || !number(c.timeoutMs, 100, 60000, true) ||
        !number(c.addressOffset, -100000, 100000, true) || !['be', 'le'].includes(c.wordOrder) || !['be', 'le'].includes(c.byteOrder)) fail();
    if (row.templateId.startsWith('ess.varta.') && c.pollIntervalMs < (row.templateId.includes('.link.') ? 5000 : 1000)) fail();
    if ((row.templateId.startsWith('ess.deye.') || row.templateId.startsWith('ess.varta.')) && c.addressOffset !== 0) fail();
    if (row.protocol === 'modbusTcp' ? !host(c.host) || !number(c.port, 1, 65535, true) :
        !text(c.path, 128) || !/^\/dev\/(?:tty[A-Za-z0-9_-]+|serial\/by-id\/[A-Za-z0-9_.:-]+)$/.test(c.path) ||
        ![9600, 38400].includes(c.baudRate) || !['none', 'even', 'odd'].includes(c.parity) || !number(c.dataBits, 5, 8, true) || ![1, 2].includes(c.stopBits)) fail();
    return structuredClone(row);
}
function devicePlan(value) {
    if (!exact(value, ['status', 'devices', 'confirmed']) || !['configured', 'none', 'deferred'].includes(value.status) ||
        value.confirmed !== true || !Array.isArray(value.devices) || value.devices.length > 16 ||
        (value.status === 'configured' ? value.devices.length < 1 : value.devices.length !== 0)) fail();
    value.devices.forEach(device);
    if (new Set(value.devices.map(row => row.id)).size !== value.devices.length) fail();
    return structuredClone(value);
}
function licenseInput(value) {
    if (!exact(value, ['mode', 'token']) || !['activate', 'unlicensed'].includes(value.mode) || typeof value.token !== 'string' ||
        (value.mode === 'activate' ? !value.token.startsWith('NWL2.') || value.token.length > 16384 : value.token !== '')) fail();
    return structuredClone(value);
}
function summarize(settings, license) {
    return { plantConfigurationComplete: settings.plant.mode === 'configured',
        devicesConfigurationComplete: settings.devicePlan.status !== 'deferred', deviceCount: settings.devicePlan.devices.length,
        licenseConfigured: license.mode === 'activate', liveMeasurementsVerified: false, physicalControlEnabled: false };
}
function templateRole(id) {
    const family = id.split('.')[0];
    return family === 'meter' ? 'meter' : ['ess', 'battery', 'battery_inverter'].includes(family) ? 'storage' :
        ['evcs', 'evse'].includes(family) ? 'charger' : 'other';
}
function licenseCapacity(plan, claims) {
    devicePlan(plan);
    if (claims.valid !== true || plan.devices.filter(d => d.role === 'charger').length > claims.limits.chargePoints ||
        plan.devices.filter(d => d.role === 'storage').length > claims.limits.batteries) fail();
    const required = new Set(plan.devices.map(row => product.SPECS.find(s => s.source ===
        (row.protocol === 'eebus' ? 'eebus' : row.protocol === 'ocpp21' ? 'ocpp21' : 'devices')).id));
    if (![...required].every(id => claims.adapters.includes(id))) fail();
    return true;
}
// Only known read-side mappings and existing envelope fields are copied. All
// executable device instances remain absent until their separate admission.
function applyPlant(native, value) {
    plant(value);
    if (value.mode !== 'configured') return native;
    const p = value;
    native.installerConfig = { ...native.installerConfig, gridConnectionPower: p.gridConnectionPowerW,
        gridPhaseCount: p.gridPhaseCount, safetyMeterTimeoutSec: p.safetyMeterTimeoutSec,
        para14a: p.para14a.enabled, para14aMode: p.para14a.mode, para14aActiveId: p.para14a.signalStateId,
        para14aEmsSetpointWId: p.para14a.emsSetpointStateId };
    native.chargingManagement = { ...native.chargingManagement, nominalVoltageV: p.nominalVoltageV,
        safetyEnvelopeMaxAgeSec: p.safetyEnvelopeMaxAgeSec };
    native.peakShaving = { ...native.peakShaving, maxPhaseA: p.maxPhaseCurrentA, safetyMarginW: p.safetyMarginW,
        l1CurrentId: p.measurements.phaseCurrents[0], l2CurrentId: p.measurements.phaseCurrents[1] || '', l3CurrentId: p.measurements.phaseCurrents[2] || '' };
    native.datapoints = { ...native.datapoints, gridPointPower: p.measurements.gridPointPower,
        gridBuyPower: p.measurements.gridBuyPower, gridSellPower: p.measurements.gridSellPower };
    return native;
}
module.exports = { plant, device, devicePlan, licenseInput, summarize, catalog, templateRole, licenseCapacity, applyPlant };
