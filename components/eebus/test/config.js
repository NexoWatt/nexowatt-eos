const assert = require('node:assert/strict');
const { getConfig, migrateLegacyNativeConfig, NEXOWATT_EEBUS_IDENTITY } = require('../build/lib/config');

const legacy = {
    serviceName: 'NexoWatt EEBUS Adapter',
    brand: 'Nexowatt',
    model: 'EEBUS Adapter',
    deviceType: 'EnergyOperationSystem',
    deviceCategories: '4',
    announceShipService: false,
    certificate: 'unchanged-certificate',
    privateKey: 'unchanged-private-key',
};

const migration = migrateLegacyNativeConfig(legacy);
assert.equal(migration.native.serviceName, NEXOWATT_EEBUS_IDENTITY.serviceName);
assert.equal(migration.native.brand, NEXOWATT_EEBUS_IDENTITY.brand);
assert.equal(migration.native.model, NEXOWATT_EEBUS_IDENTITY.model);
assert.equal(migration.native.deviceType, NEXOWATT_EEBUS_IDENTITY.deviceType);
assert.equal(migration.native.deviceCategories, NEXOWATT_EEBUS_IDENTITY.deviceCategories);
assert.equal(migration.native.announceShipService, true);
assert.equal(migration.native.certificate, legacy.certificate);
assert.equal(migration.native.privateKey, legacy.privateKey);
assert.ok(migration.changes.length >= 5);

const config = getConfig(migration.native);
assert.equal(config.serviceName, 'NexoWatt EOS');
assert.equal(config.brand, 'NexoWatt');
assert.equal(config.model, 'EOS');
assert.equal(config.deviceType, 'EnergyManagementSystem');
assert.deepEqual(config.deviceCategories, ['2']);
assert.equal(config.announceShipService, true);

const custom = migrateLegacyNativeConfig({
    serviceName: 'EOS Werk 2',
    brand: 'NexoWatt',
    model: 'EOS-Pro',
    deviceType: 'EnergyManagementSystem',
    deviceCategories: '2',
    announceShipService: true,
});
assert.equal(custom.native.serviceName, 'EOS Werk 2');
assert.equal(custom.native.model, 'EOS-Pro');
assert.equal(custom.native.deviceType, 'EnergyManagementSystem');


const directDefaults = getConfig({});
assert.equal(directDefaults.nexowattBridgeEnabled, true);
assert.equal(directDefaults.nexowattUiInstance, 'nexowatt-ui.0');
assert.equal(directDefaults.nexowattBridgeHeartbeatSec, 5);
assert.equal(directDefaults.nexowattBridgeRequestTimeoutMs, 2000);
assert.equal(directDefaults.nexowattAcceptanceTargetMs, 250);
assert.equal(directDefaults.nexowattControlTargetMs, 1000);
assert.equal(directDefaults.nexowattFeedbackTargetMs, 1500);
assert.equal(directDefaults.nexowattImplementationTimeoutMs, 5000);
assert.equal(directDefaults.clsHeartbeatTimeoutSec, 120);
assert.equal(directDefaults.autoApplyClsLimits, true);
assert.equal(directDefaults.sendImplementationResultToCls, true);

console.log('Config migration tests passed.');
