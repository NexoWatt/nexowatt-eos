'use strict';
const license = { mode: 'unlicensed', token: '' };
const settings = { siteName: 'Erststart Teststand', language: 'de', timeZone: 'Europe/Berlin',
    licenseMode: 'unlicensed', deviceMode: 'disabled-pending-acceptance', safetyAcknowledged: true,
    plant: { mode: 'deferred', reason: 'site-data-unavailable' }, devicePlan: { status: 'deferred', devices: [], confirmed: true } };
const configuredSettings = { ...settings, plant: { mode: 'configured', gridConnectionPowerW: 43000, gridPhaseCount: 3,
    nominalVoltageV: 230, maxPhaseCurrentA: 63, safetyMarginW: 1000, safetyMeterTimeoutSec: 30, safetyEnvelopeMaxAgeSec: 5,
    measurements: { mode: 'signed', gridPointPower: 'nexowatt-devices.0.meter.power', gridBuyPower: '', gridSellPower: '',
        phaseCurrents: ['nexowatt-devices.0.meter.l1', 'nexowatt-devices.0.meter.l2', 'nexowatt-devices.0.meter.l3'] },
    para14a: { enabled: false, mode: 'disabled', signalStateId: '', emsSetpointStateId: '' }, valuesConfirmed: true },
    devicePlan: { status: 'configured', confirmed: true, devices: [{ id: 'battery1', name: 'Fixture storage', role: 'storage',
        templateId: 'ess.varta.element.modbusTcpV14', protocol: 'modbusTcp', connection: { host: '192.0.2.2', port: 502,
            unitId: 255, pollIntervalMs: 1000, timeoutMs: 3000, addressOffset: 0, wordOrder: 'be', byteOrder: 'be' } }] } };
module.exports = { license, settings, deferredSettings: settings, configuredSettings };
