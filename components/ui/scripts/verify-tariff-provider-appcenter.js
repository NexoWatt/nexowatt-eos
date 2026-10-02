#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');
const html=read('www/ems-apps.html');
const ui=read('src-ts/runtime-executables/www/ems-apps.ts');
const main=read('src-ts/runtime-executables/main.ts');
const mm=read('src-ts/runtime-executables/ems/module-manager.ts');
const tariff=read('src-ts/runtime-executables/ems/modules/tarif-vis.ts');

for(const id of ['tariffProviderEnabled','tariffProviderId','tariffProviderProfileId','tariffProviderSourceId','tariffProviderTest','tariffProviderCouple','tariffProviderAccessToken','tariffProviderSecurityToken','tariffProviderRestUrl']) assert.ok(html.includes(`id="${id}"`), `${id} missing`);
for(const provider of ['Tibber API','EnergyZero','ENTSO-E','Ostrom','Allgemeine REST/JSON-API']) assert.ok(html.includes(provider), `${provider} missing`);
assert.ok(html.includes('Preis-DPs automatisch koppeln'));
assert.ok(ui.includes('/api/installer/tariff-provider/providers'));
assert.ok(ui.includes('/api/installer/tariff-provider/test'));
assert.ok(ui.includes('coupleTariffProviderDatapoints'));
for(const key of ['priceCurrent','priceAverage','priceTodayJson','priceTomorrowJson']) {
  assert.ok(ui.includes(key), `frontend mapping ${key} missing`);
  assert.ok(main.includes(key), `backend mapping ${key} missing`);
  assert.ok(tariff.includes(`datapoints.${key}`) || tariff.includes(`dp.${key}`), `tarif-vis consumption ${key} missing`);
}
assert.ok(main.includes("`${ns}.tariffProvider.currentPriceEurPerKwh`"));
assert.ok(main.includes("`${ns}.tariffProvider.pricesTodayJson`"));
assert.ok(main.includes("`${ns}.tariffProvider.pricesTomorrowJson`"));
assert.ok(main.includes("'/api/installer/tariff-provider/providers'"));
assert.ok(main.includes("'/api/installer/tariff-provider/test'"));
assert.ok(main.includes("'__KEEP__'"));
assert.ok(main.includes('_nwMaskTariffProviderForUi'));
assert.ok(main.includes('_nwMergeTariffProviderSecrets'));
assert.ok(main.includes("'accessToken','securityToken','clientSecret','bearerToken','apiKey','password','refreshToken'"));
assert.ok(main.includes("'tariffProvider'"));
assert.ok(mm.indexOf("key: 'tariffProvider'") < mm.indexOf("key: 'tarifVis'"), 'provider must publish before tariff-vis');
assert.ok(mm.includes('new TariffProviderModule'));
assert.ok(ui.includes('autoCoupleDatapoints'));
assert.ok(ui.includes('activateTariffLogic'));
assert.ok(ui.includes('automaticMode'));
assert.ok(html.includes('kein externer Tarifadapter'));
console.log('[tariff-provider-appcenter] OK: AppCenter provider registry, protected credentials, internal current/average/today/tomorrow mappings and tariff-vis coupling verified.');
