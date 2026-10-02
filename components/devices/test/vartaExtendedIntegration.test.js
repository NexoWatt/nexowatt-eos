'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const helper = require('./helpers/compatibilityHarness.cjs');
const root = path.resolve(__dirname, '..');
const DeviceRuntime = helper.loadDeviceRuntime(path.join(root, 'lib/deviceRuntime.js'));
const templates = require('../lib/templates.json').templates.filter(t => t.manufacturer === 'VARTA');
const template = key => templates.find(t => t.id === `ess.varta.${key}.modbusTcpV14`);

function runtime(key, cfg = {}) {
  const r = helper.buildRuntime(DeviceRuntime, template(key), 'extended');
  Object.assign(r.cfg, cfg);
  r.adapter.namespace = 'nexowatt-devices.0';
  const defs = r._buildAliasDefinitions();
  for (const def of defs) r.aliasByStateRelId.set(def.relId, def);
  const ack = [];
  const errors = [];
  r._setStateCached = async (id, val, acknowledged) => { ack.push({id,val,ack:acknowledged}); };
  r._setError = async e => { errors.push(e); };
  return {r,defs,ack,errors};
}
const rel = path => `devices.extended.aliases.${path}`;

test('VARTA canonical limit alias writes negative native UG and acknowledges the positive EOS limit', async () => {
  const x = runtime('pulseNeo', {vartaAllowControlWrites:true,vartaLimitClass:'residential'});
  const writes=[];
  x.r.driver={async writeDatapoint(dp,value) {writes.push({dp,value});}};
  await x.r.handleStateChange('nexowatt-devices.0.'+rel('v1.ctrl.maxDischargePowerW'), {val:4200,ack:false});
  assert.equal(x.errors.length,0);
  assert.equal(writes.length,1);
  assert.equal(writes[0].dp.id,'dISCHARGE_LIMIT');
  assert.equal(writes[0].value,-4200);
  assert.deepEqual(x.ack.find(s=>s.id===rel('v1.ctrl.maxDischargePowerW')), {id:rel('v1.ctrl.maxDischargePowerW'),val:4200,ack:true});
  assert.ok(x.ack.some(s=>s.id==='devices.extended.dISCHARGE_LIMIT'&&s.val===-4200));
  assert.ok(x.r.aliasContractInfo.capabilities.includes('write.maxDischargePowerW'));
  assert.ok(!x.r.aliasContractInfo.capabilities.includes('write.powerSetpointW'));
  assert.ok(!x.defs.some(d=>/\.ctrl\.(powerSetpointW|power|run)$/.test(d.relId)));
});

test('VARTA rejected control and invalid limit alias values cannot acquire a successful runtime acknowledgement', async () => {
  const x=runtime('pulseNeo',{vartaAllowControlWrites:true});
  let writes=0;
  x.r.driver={async writeDatapoint() {writes++;throw Object.assign(new Error('VARTA limit countdown inactive'),{code:'E_VARTA_LIMIT_INACTIVE'});}};
  await x.r.handleStateChange(rel('v1.ctrl.maxChargePowerW'),{val:4200,ack:false});
  assert.equal(writes,1);
  assert.equal(x.errors[0].code,'E_VARTA_LIMIT_INACTIVE');
  assert.equal(x.ack.length,0);
  await x.r.handleStateChange(rel('v1.ctrl.maxDischargePowerW'),{val:-4200,ack:false});
  assert.equal(writes,1);
  assert.equal(x.errors.length,2);
  assert.equal(x.ack.length,0);
});

test('VARTA special controls retain native semantics; absolute EOS capabilities remain absent', async () => {
  const x=runtime('pulseNeo',{vartaAllowControlWrites:true,vartaFrequencyControlEnabled:true});
  const writes=[];
  x.r.driver={async writeDatapoint(dp,value){writes.push([dp.id,value]);}};
  for(const [p,val] of [['ctrl.additionalPowerW',-1234],['ctrl.frequencyPowerW',2500],['ctrl.frequencyActive',true],['ctrl.frequencyAlive',7]]) {
    await x.r.handleStateChange(rel(p),{val,ack:false});
  }
  assert.deepEqual(writes,[['aDDITIONAL_POWER',-1234],['fREQUENCY_POWER',2500],['fREQUENCY_ACTIVE',1],['fREQUENCY_ALIVE',7]]);
  assert.equal(x.errors.length,0);
  assert.equal(runtime('pulseNeo').defs.some(d=>d.rw==='rw'),false);
  assert.equal(runtime('link',{vartaAllowControlWrites:true,vartaFrequencyControlEnabled:true}).defs.some(d=>/additionalPower|frequency|powerFraction/.test(d.relId)),false);
});

test('VARTA template wire descriptions retain exact extended units and never add automatic control sequences', () => {
  for(const t of templates) {
    const ids=t.datapoints.map(d=>d.id);
    assert.equal(new Set(ids).size,ids.length,t.id);
    const energy=t.datapoints.find(d=>d.id==='eXTERNAL_PV_ENERGY');
    assert.equal(energy.unit,'Wh');
    assert.equal(energy.source.read.address,1101);
    assert.equal(energy.source.read.scaleFactor,1);
    const pextra=t.datapoints.find(d=>d.id==='pEXTRA_TOKEN');
    if(pextra){assert.equal(pextra.rw,'ro');assert.equal(pextra.source.write,undefined);}
    const cipher=t.datapoints.find(d=>d.id==='eNCRYPTED_DISCHARGE_ENERGY');
    if(cipher){assert.equal(cipher.unit,undefined);assert.equal(cipher.source.read.wordOrder,'le');assert.equal(cipher.source.read.length,2);}
    for(const dp of t.datapoints.filter(d=>d.source.vartaExtended&&d.source.write))assert.equal(dp.source.write.fc,6);
    assert.equal(t.driverHints.modbus.setpointKeepalive.enabled,false);
    assert.equal(t.driverHints.modbus.restoreSetpointsOnStart.enabled,false);
    assert.equal(t.driverHints.modbus.autoWatchdog,undefined);
    assert.equal(t.driverHints.modbus.preWrites,undefined);
    assert.equal(t.driverHints.modbus.tcpUnitIdDefault,255);
  }
  const psp=template('pulse').datapoints.find(d=>d.id==='pOWER_FRACTION');
  assert.equal(psp.unit,'%');assert.equal(psp.min,-100);assert.equal(psp.max,100);assert.equal(psp.source.read.scaleFactor,-1);
  const power=template('pulseNeo').datapoints.find(d=>d.id==='fREQUENCY_POWER');
  assert.equal(power.source.read.vartaScaleFactorDpId,'sF_FREQUENCY_POWER');
});

test('VARTA Admin exposes and resets extended permissions with explicit frequency and token model gates', () => {
  const fields=require('../admin/jsonConfig.json').items.devicesTab.items.devices.items;
  const attrs=['vartaExtendedEnabled','vartaAllowControlWrites','vartaLimitClass','vartaLegacyUnpaddedToken','vartaFrequencyControlEnabled'];
  for(const attr of attrs)assert.equal(fields.filter(f=>f.attr===attr).length,1,attr);
  assert.equal(fields.find(f=>f.attr==='vartaExtendedEnabled').default,true);
  assert.equal(fields.find(f=>f.attr==='vartaAllowControlWrites').default,false);
  assert.equal(fields.find(f=>f.attr==='vartaFrequencyControlEnabled').default,false);
  const source=fs.readFileSync(path.join(root,'admin/index_m.js'),'utf8');
  const block=source.slice(source.indexOf('function renderVartaOptions('),source.indexOf('function renderDeyeOptions('));
  const states=new Map();
  const single=selector=>{
    if(!states.has(selector))states.set(selector,{data:{},props:{}});
    return states.get(selector);
  };
  const $=selector=>({
    data(k,v){const s=single(selector);if(arguments.length===1)return s.data[k];s.data[k]=v;return this;},
    prop(k,v){for(const part of selector.split(',').map(s=>s.trim()))single(part).props[k]=v;return this;},
    val(v){single(selector).value=v;return this;},
    toggle(v){single(selector).visible=v;return this;},
    text(v){single(selector).text=v;return this;},
  });
  const context=vm.createContext({$});vm.runInContext(block,context);
  context.renderVartaOptions(template('pulseNeo'));
  $('#varta_allow_control_writes,#varta_frequency_enabled,#varta_legacy_token').prop('checked',true);
  context.renderVartaOptions(template('link'));
  for(const sel of ['#varta_allow_control_writes','#varta_frequency_enabled','#varta_legacy_token'])assert.equal(single(sel).props.checked,false);
  assert.equal(single('#varta_frequency_enabled').props.disabled,true);
  assert.equal(single('#varta_token_option').visible,false);
  assert.equal(single('#varta_extended_enabled').props.checked,true);
});
