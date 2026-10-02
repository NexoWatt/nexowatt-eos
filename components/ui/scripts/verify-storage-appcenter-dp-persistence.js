#!/usr/bin/env node
'use strict';

/**
 * Regression 0.8.135 / RC11:
 * Manuelle Speicher-DP-Zuordnungen dürfen durch Runtime-Fallbacks aus dem
 * allgemeinen Energiefluss weder verkürzt noch überschrieben oder zurück in
 * das AppCenter gespiegelt werden.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configHelper = require(path.join(root, 'ems/services/storage-datapoint-config.js'));
const bridge = require(path.join(root, 'ems/services/storage-override-bridge.js'));
const { SpeicherMappingModule } = require(path.join(root, 'ems/modules/storage-mapping.js'));

const FULL_ACTUAL = 'nexowatt-devices.0.devices.ess1.aliases.r.power';
const FULL_SOC = 'nexowatt-devices.0.devices.ess1.aliases.r.soc';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

(async () => {
  // 1. Der reale Feldfall: manuelle vollständige ID, globaler Runtime-Wert `r`.
  const adapter = {
    config: {
      settings: {},
      storage: { datapoints: { socObjectId: FULL_SOC, batteryPowerObjectId: FULL_ACTUAL } },
      datapoints: { storageSoc: 'r', batteryPower: 'r' },
    },
    async getForeignObjectAsync() { return null; },
  };
  const before = clone(adapter.config);
  const result = await bridge.applyStorageMeasurementOverrides(adapter, adapter.config.datapoints);
  assert.deepStrictEqual(adapter.config, before, 'Runtime-Bridge darf adapter.config nicht mutieren');
  assert.strictEqual(result.socId, FULL_SOC, 'manueller SoC-DP muss globalen Fragment-Fallback schlagen');
  assert.strictEqual(result.signedPowerId, FULL_ACTUAL, 'manueller Istleistungs-DP muss vollständig erhalten bleiben');
  assert.strictEqual(adapter._nwStorageMeasurementFallback.datapoints.batteryPowerObjectId, 'r', 'globaler Wert bleibt nur privater Runtime-Fallback');

  const mapping = new SpeicherMappingModule(adapter, null);
  const mapped = mapping._getCfg();
  assert.strictEqual(mapped.dp.socObjectId, FULL_SOC);
  assert.strictEqual(mapped.dp.batteryPowerObjectId, FULL_ACTUAL);

  // 2. Ohne manuelle Zuordnung darf der globale Messwert weiterhin zur Laufzeit helfen,
  //    aber nie in storage.datapoints geschrieben werden.
  const fallbackAdapter = {
    config: {
      settings: {},
      storage: { datapoints: {} },
      datapoints: { storageSoc: 'meter.global.soc', batteryPower: 'meter.global.power' },
    },
    async getForeignObjectAsync(id) {
      return id === 'meter.global.power' ? { common: { unit: 'kW' } } : null;
    },
  };
  const fallbackBefore = clone(fallbackAdapter.config);
  const fallbackResult = await bridge.applyStorageMeasurementOverrides(fallbackAdapter, fallbackAdapter.config.datapoints);
  assert.deepStrictEqual(fallbackAdapter.config, fallbackBefore, 'globaler Fallback darf nicht persistierbar werden');
  assert.strictEqual(fallbackResult.signedPowerId, 'meter.global.power');
  assert.strictEqual(fallbackAdapter._nwStorageMeasurementFallback.datapoints.batteryPowerScale, 1000, 'kW-Fallback muss zur Laufzeit korrekt skaliert werden');
  assert.strictEqual(new SpeicherMappingModule(fallbackAdapter, null)._getCfg().dp.batteryPowerObjectId, 'meter.global.power');
  assert.strictEqual(fallbackAdapter.config.storage.datapoints.batteryPowerObjectId, undefined);

  // 3. Normalisierung: aktuelle kanonische Felder sind autoritativ; globale Werte
  //    sind ausdrücklich kein Persistenz-Fallback.
  let normalized = configHelper.normalizeStorageDatapointsConfig({
    datapoints: { batteryPowerObjectId: FULL_ACTUAL },
    powerId: 'r',
  });
  assert.strictEqual(normalized.batteryPowerObjectId, FULL_ACTUAL);

  normalized = configHelper.normalizeStorageDatapointsConfig({
    datapoints: { batteryPowerObjectId: '' },
    batteryPowerObjectId: 'legacy.should.not.return',
  });
  assert.strictEqual(normalized.batteryPowerObjectId, '', 'bewusst geleertes kanonisches Feld darf nicht wieder aufgefüllt werden');

  normalized = configHelper.normalizeStorageDatapointsConfig({
    powerObjectId: FULL_ACTUAL,
  });
  assert.strictEqual(normalized.batteryPowerObjectId, FULL_ACTUAL, 'vollständige Legacy-ID muss einmalig migriert werden');

  normalized = configHelper.normalizeStorageDatapointsConfig({
    datapoints: { batteryPowerObjectId: 'r', powerObjectId: FULL_ACTUAL },
  });
  assert.strictEqual(normalized.batteryPowerObjectId, FULL_ACTUAL, 'verkürzter kanonischer Wert muss aus vollständiger lokaler Legacy-ID repariert werden');

  normalized = configHelper.normalizeStorageDatapointsConfig({
    powerId: 'r',
  });
  assert.strictEqual(normalized.batteryPowerObjectId, '', 'generisches Fragment `r` darf nicht als Speicher-Istleistungs-DP migriert werden');

  // 4. Strukturverträge: Config-API liest den persistierten Installer-Patch,
  //    Browser übernimmt Texteingaben sofort, Bridge mutiert keine Persistenz.
  const mainTs = read('src-ts/runtime-executables/main.ts');
  const uiTs = read('src-ts/runtime-executables/www/ems-apps.ts');
  const bridgeTs = read('src-ts/runtime-executables/ems/services/storage-override-bridge.ts');
  assert.ok(mainTs.includes('const _nwPickPersistedInstallerConfig = () =>'), 'Config-API braucht persistierte Installer-SoT');
  assert.ok(mainTs.includes('_nwHydrateStorageFarmConfigFromRuntimeStates(_nwPickPersistedInstallerConfig())'), 'GET/POST-Antwort muss persistierte Config verwenden');
  assert.ok(mainTs.includes('return nwNormalizeStorageDatapointsConfig(storageIn);'), 'main-Normalisierung muss zentralen lokalen Helper nutzen');
  assert.ok(uiTs.includes("input.addEventListener('input', () => {\n        commitDpValue();"), 'DP-Eingabe muss bereits beim input-Ereignis gespeichert werden');
  assert.ok(uiTs.includes("input.addEventListener('blur', () => {\n        commitDpValue();\n        input.scrollLeft = 0;"), 'DP-Feld muss vollständigen Wert beim Verlassen sichern und sichtbar zurücksetzen');
  assert.ok(uiTs.includes('flushDpInputsToConfig();\n    const patch = applyAppCenterRegressionSafetyGate(collectPatchFromUI());'), 'Save muss alle DP-Eingaben vor dem Payload synchronisieren');
  assert.ok(!bridgeTs.includes('target.batteryPowerObjectId ='), 'Runtime-Bridge darf storage.datapoints nicht mehr überschreiben');
  assert.ok(bridgeTs.includes('adapter._nwStorageMeasurementFallback ='), 'globaler Messwert muss in privaten Runtime-Snapshot');

  console.log('[storage-appcenter-dp-persistence] OK: vollständige manuelle Speicher-DPs bleiben nach Save/Restart autoritativ; globale Fallbacks sind runtime-only.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
