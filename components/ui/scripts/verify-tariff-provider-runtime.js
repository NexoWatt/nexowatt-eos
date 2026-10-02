#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const registry = require(path.join(root, 'ems/services/tariff-provider-registry.js'));
const { TariffProviderModule } = require(path.join(root, 'ems/modules/tariff-provider.js'));

const providerIds = registry.publicRegistry().providers.map(row => row.id);
for (const id of ['manual-dp','tibber','energyzero','entsoe','ostrom','custom-rest','market-profile']) assert.ok(providerIds.includes(id), `provider ${id} missing`);
assert.equal(registry.priceToEurKwh(100, 'EUR/MWh'), 0.1);
assert.equal(registry.priceToEurKwh(30, 'ct/kWh'), 0.3);

const tibber = registry.normalizeTibber({data:{viewer:{homes:[{id:'home-1',currentSubscription:{priceInfo:{today:[
  {startsAt:'2026-08-01T10:00:00Z',total:0.31,energy:0.20,tax:0.11,currency:'EUR'},
  {startsAt:'2026-08-01T10:15:00Z',total:0.29,energy:0.18,tax:0.11,currency:'EUR'}
],tomorrow:[{startsAt:'2026-08-02T00:00:00Z',total:0.24,currency:'EUR'}]}}}]}}},{resolutionMinutes:15});
assert.equal(tibber.homeId, 'home-1');
assert.equal(tibber.intervals.length, 3);
assert.equal(tibber.intervals[0].quality, 'provider-all-in');

const energyzero = registry.normalizeEnergyZero({Prices:[
  {readingDate:'2026-08-01T10:00:00Z',allInPriceIncludingVat:0.28},
  {readingDate:'2026-08-01T10:15:00Z',allInPriceIncludingVat:0.27}
]}, {resolutionMinutes:15,priceComponent:'allInPriceIncludingVat'});
assert.equal(energyzero.intervals.length, 2);
assert.equal(energyzero.intervals[0].total, 0.28);

const xml = '<Publication_MarketDocument><TimeSeries><Period><timeInterval><start>2026-08-01T10:00Z</start></timeInterval><resolution>PT15M</resolution><Point><position>1</position><price.amount>100</price.amount></Point><Point><position>2</position><price.amount>-50</price.amount></Point></Period></TimeSeries></Publication_MarketDocument>';
const entsoe = registry.normalizeEntsoe(xml,{resolutionMinutes:15});
assert.equal(entsoe.intervals.length, 2);
assert.equal(entsoe.intervals[0].total, 0.1);
assert.equal(entsoe.intervals[1].total, -0.05);

const custom = registry.normalizeCustomRest({data:{items:[
  {from:'2026-08-01T10:00:00Z',to:'2026-08-01T11:00:00Z',ct:10}
]}},{arrayPath:'data.items',startPath:'from',endPath:'to',pricePath:'ct',unit:'ct/kWh',resolutionMinutes:60,formula:{supplierMarkupEurPerKwh:0.02,gridVariableEurPerKwh:0.03,taxEurPerKwh:0.04,vatPct:0,priceIncludesVat:true}});
assert.equal(custom.intervals.length,1);
assert.equal(custom.intervals[0].total,0.19);

const split = registry.splitTodayTomorrow([
  {startsAt:'2026-08-01T10:00:00Z',endsAt:'2026-08-01T11:00:00Z',total:0.2},
  {startsAt:'2026-08-02T10:00:00Z',endsAt:'2026-08-02T11:00:00Z',total:0.3}
], Date.parse('2026-08-01T12:00:00Z'), 'UTC');
assert.equal(split.today.length,1);
assert.equal(split.tomorrow.length,1);

const registrySource = fs.readFileSync(path.join(root,'src-ts/runtime-executables/ems/services/tariff-provider-registry.ts'),'utf8');
assert.ok(registrySource.includes('https://public.api.energyzero.nl/public/v1/prices'));
assert.ok(registrySource.includes('INTERVAL_QUARTER'));
assert.ok(registrySource.includes('documentType'));
assert.ok(registrySource.includes("url.searchParams.set('documentType', 'A44')"));
assert.ok(registrySource.includes('YYYYMMDDHHmm'));
assert.ok(registrySource.includes('https://api.tibber.com/v1-beta/gql'));
assert.ok(registrySource.includes("'User-Agent'"));
const moduleSource = fs.readFileSync(path.join(root,'src-ts/runtime-executables/ems/modules/tariff-provider.ts'),'utf8');
assert.ok(moduleSource.includes('_stableJitterFactor'), 'provider jitter missing');
assert.ok(moduleSource.includes('_consecutiveErrors'), 'provider backoff counter missing');
assert.ok(moduleSource.includes('Math.pow(2'), 'exponential backoff missing');

(async () => {
  const states = new Map();
  const foreign = new Map();
  const adapter = {
    namespace:'nexowatt-ui.0', instance:0,
    config:{tariffProvider:{enabled:true,providerId:'entsoe',sourceId:'entsoe',maxStaleMinutes:30,timeZone:'UTC',activateTariffLogic:true,automaticMode:true}},
    log:{debug(){},warn(){}},
    async setObjectNotExistsAsync(){},
    async setStateAsync(id,obj){states.set(id,obj.val);},
    async getForeignStateAsync(id){return foreign.has(id)?{val:foreign.get(id)}:null;},
    async setForeignStateAsync(id,val){foreign.set(id,val);},
  };
  const mod = new TariffProviderModule(adapter,null);
  await mod.init();
  const now=Date.parse('2026-08-01T10:05:00Z');
  mod._intervals=[{startsAt:'2026-08-01T10:00:00Z',endsAt:'2026-08-01T10:15:00Z',total:0.22,market:0.1,quality:'market-only'}];
  mod._lastSuccessMs=now;
  await mod._publish(mod._cfg(),now,'ok');
  assert.equal(states.get('tariffProvider.fresh'),true);
  assert.equal(states.get('tariffProvider.currentPriceEurPerKwh'),0.22);
  assert.notEqual(states.get('tariffProvider.pricesTodayJson'),'[]');
  mod._lastSuccessMs=now-31*60*1000;
  await mod._publish(mod._cfg(),now,'stale');
  assert.equal(states.get('tariffProvider.fresh'),false);
  assert.equal(states.get('tariffProvider.currentPriceEurPerKwh'),null);
  assert.equal(states.get('tariffProvider.pricesTodayJson'),'[]');
  await mod._setTariffSettings(mod._cfg());
  assert.equal(foreign.get('nexowatt-ui.0.settings.dynamicTariff'),true);
  assert.equal(foreign.get('nexowatt-ui.0.settings.tariffMode'),2);

  const tibberCfg = {...mod._cfg(),providerId:'tibber',sourceId:'tibber',refreshMinutes:15,timeZone:'UTC'};
  mod._intervals=[
    {startsAt:'2026-08-01T10:00:00Z',endsAt:'2026-08-01T10:15:00Z',total:0.2},
    {startsAt:'2026-08-02T10:00:00Z',endsAt:'2026-08-02T10:15:00Z',total:0.3}
  ];
  mod._consecutiveErrors=0;
  mod._scheduleNextFetch(tibberCfg,now,true);
  assert.equal(mod._effectiveRefreshMinutes,360, 'Tibber with tomorrow prices must be cached for six hours');
  const tibberDelayMinutes=(mod._nextFetchMs-now)/60000;
  assert.ok(tibberDelayMinutes>=324 && tibberDelayMinutes<=396, 'Tibber jitter must stay within +/-10%');

  mod._intervals=[];
  const publicationWindow=Date.parse('2026-08-01T14:00:00Z');
  mod._scheduleNextFetch(tibberCfg,publicationWindow,true);
  assert.equal(mod._effectiveRefreshMinutes,60, 'Tibber missing tomorrow prices should retry hourly in publication window');

  const entsoeCfg={...mod._cfg(),providerId:'entsoe',sourceId:'entsoe',refreshMinutes:15,timeZone:'UTC'};
  mod._consecutiveErrors=2;
  mod._scheduleNextFetch(entsoeCfg,now,false);
  assert.equal(mod._effectiveRefreshMinutes,120, 'ENTSO-E errors must use exponential backoff from the 30 minute floor');

  console.log('[tariff-provider-runtime] OK: provider normalization, EUR/kWh model, today/tomorrow curves, stale fail-safe, settings coupling, caching, jitter and exponential backoff verified.');
})().catch(err=>{console.error(err);process.exit(1);});
