#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const main = read('src-ts/runtime-executables/main.ts');
const ui = read('src-ts/runtime-executables/www/ems-apps.ts');
const html = read('www/ems-apps.html');
const contract = JSON.parse(read('scripts/fixtures/nexowatt-device-alias-contract-v1.snapshot.json'));

assert.equal(contract.contractId, 'nexowatt-device-alias-contract');
assert.equal(contract.schemaVersion, 1);
assert.equal(contract.namespace, 'v1');
assert.equal(contract.standardPath, 'aliases.v1');
assert.equal(contract.categoryToDeviceClass.CHARGER, 'solarCharger');
assert.equal(contract.categoryToDeviceClass.DC_CHARGER, 'solarCharger');
assert.equal(contract.categoryToDeviceClass.EVCS, 'evCharger');
for (const aliases of Object.values(contract.requiredCanonicalAliases)) {
  for (const alias of aliases) assert.match(alias, /^(r|ctrl|comm|alarm)\./);
}

assert.ok(main.includes("'/api/nwdevices/discover'"), 'discovery route missing');
assert.ok(main.includes('aliases.meta.manifest'), 'manifest state missing');
assert.ok(main.includes('aliases.v1.'), 'canonical aliases.v1 missing');
assert.ok(main.includes("contractId: 'nexowatt-device-alias-contract'"));
assert.ok(main.includes("schemaVersion: 1"));
assert.ok(main.includes("if (c === 'CHARGER' || c === 'DC_CHARGER' || c === 'SOLAR_CHARGER') return 'solarCharger'"));
assert.ok(main.includes('meta && meta.write === true'), 'write metadata gate missing');
assert.ok(main.includes('scanOnly: true'));
assert.ok(main.includes('hardwareWrites: 0'));
assert.ok(main.includes("typeof this.getForeignStatesAsync === 'function'"), 'foreign-state discovery guard missing');

assert.ok(html.includes('id="nwDevicesQuickSetup"'));
assert.ok(html.includes('Schnell‑Inbetriebnahme (Geräte + DPs)'));
assert.ok(ui.includes("return dc ? dc === 'evCharger'"));
assert.ok(ui.includes("_nwDeviceClass(d) === 'solarCharger'"));
assert.ok(ui.includes('Es werden nur leere Felder ergänzt. Apps/Geräte werden nicht aktiviert und es werden keine Hardwarebefehle geschrieben.'));
assert.ok(ui.includes('Zuordnungsvorschlag übernehmen?'));
assert.ok(ui.includes("if (onlyEmpty)"));
assert.ok(ui.includes("meta && meta.write === true"));
assert.ok(ui.includes("'targetPowerObjectId','targetChargePowerObjectId','targetDischargePowerObjectId'"));
assert.ok(ui.includes("'e3dcSetPowerModeObjectId','e3dcSetPowerValueObjectId','feneconGridSetpointObjectId'"));
assert.ok(ui.includes('if (charge && discharge)'));
assert.ok(ui.includes('else if (signed && !String(dps.targetPowerObjectId'));
assert.ok(ui.includes('Mehrere Speicher: keine automatische Einzel-Speicherwahl'));
assert.ok(ui.includes('Mehrere Zähler: NVP-Zähler wird nur bei eindeutiger Bewertung gesetzt.'));

assert.ok(ui.includes("_nwGetAlias(dev, 'r.essActivePower')"), 'FENECON auto mapping must prefer the real AC ESS feedback alias');
assert.ok(ui.includes("_nwGetWritableAlias(dev, 'ctrl.gridSetpointW')"), 'FENECON auto mapping must only use a genuine grid-target alias for native FEMS control');
assert.ok(ui.includes("_nwGetWritableAlias(dev, 'ctrl.napSetpointW')"), 'FENECON NAP target alias fallback missing');
assert.ok(ui.includes("_nwGetAlias(dev, 'r.pvPowerDc')"), 'FENECON internal DC-PV alias mapping missing');
assert.ok(ui.includes("_nwGetAlias(dev, 'r.pvPowerAc')"), 'FENECON external AC-PV alias mapping missing');
assert.ok(ui.includes("_nwGetAlias(dev, 'r.pvPowerTotal')"), 'FENECON total PV alias mapping missing');
assert.ok(ui.includes('FENECON/OpenEMS Hybrid'), 'FENECON-specific auto-mapping path missing');
const storageMapStart = ui.indexOf('function _nwAutoMapStorageAppFromDevices');
const storageMapEnd = ui.indexOf('function _nwScoreGridMeter', storageMapStart);
const storageMapFn = ui.slice(storageMapStart, storageMapEnd > storageMapStart ? storageMapEnd : storageMapStart + 18000);
assert.equal(/r\.powerBalance/.test(storageMapFn), false, 'FENECON auto mapping must never use powerBalance as ESS actuator feedback');
assert.equal(/ctrl\.powerSetpointW[^\r\n]{0,200}feneconGridSetpoint/i.test(storageMapFn), false, 'Direct ESS powerSetpointW must never be mapped as FEMS grid target');

const evcsStart = ui.indexOf('function _applyNwDeviceToEvcsRow');
const evcsEnd = ui.indexOf('function _nwScoreGridMeter', evcsStart);
const evcsFn = ui.slice(evcsStart, evcsEnd > evcsStart ? evcsEnd : evcsStart + 12000);
assert.ok(evcsFn.includes("setIf('setCurrentAId'"));
assert.ok(evcsFn.includes("setIf('enableWriteId'"));
assert.equal(/\bout\.enabled\s*=\s*true\b/.test(evcsFn), false, 'auto mapping must not activate EVCS');
assert.equal(/setForeignState|setStateAsync|\/api\/state\/set/.test(evcsFn), false, 'auto mapping must not issue hardware/state writes');

console.log('[device-auto-mapping] OK: aliases.v1 inventory, class safety, writeability gate, preview, manual precedence and exclusive storage command family verified.');
