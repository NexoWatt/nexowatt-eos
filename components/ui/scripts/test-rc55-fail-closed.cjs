#!/usr/bin/env node
"use strict";
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {arbitrate}=require('./rc55-auto-arbitration-reference.cjs');
const now=1700000000000;
const c={nowMs:now,appInstalled:true,appEnabled:true,profileActive:true,resourceId:'cp1',resourceEnabled:true,strategyParticipationEnabled:true,operatingMode:'Auto',autoSource:'strategy',controlStage:'active',commissioningConfirmed:true,online:true,alarmActive:false,telemetryFresh:true,fallback:'standardAuto'};
const e={minPowerW:0,maxPowerW:11000};
const r=(x={})=>({id:'r',resourceId:'cp1',requirementClass:'should',priority:50,issuedAtMs:now-1000,expiresAtMs:now+15000,targetPowerW:8000,reason:'test',...x});
assert.equal(arbitrate([r()],{...c,operatingMode:'Boost'},e).reason,'mode-not-auto');
assert.equal(arbitrate([r()],{...c,autoSource:'standard'},e).reason,'standard-auto-selected');
assert.equal(arbitrate([r()],{...c,controlStage:'shadow'},e).handoverPermitted,false);
assert.equal(arbitrate([r()],{...c,controlStage:'commissioning'},e).handoverPermitted,false);
assert.equal(arbitrate([r()],{...c,commissioningConfirmed:false},e).handoverPermitted,false);
assert.equal(arbitrate([r({expiresAtMs:now})],c,e).reason,'no-fresh-request');
assert.equal(arbitrate([r({id:'may',requirementClass:'may',priority:100}),r({id:'must',requirementClass:'must',priority:1})],c,e).selectedRequestId,'must');
assert.equal(arbitrate([r({targetPowerW:16000})],c,{minPowerW:0,maxPowerW:4200}).finalPlannerPowerW,4200);
assert.equal(arbitrate([r()],c,{...e,forceStop:true}).finalPlannerPowerW,0);
const src=fs.readFileSync(path.join(__dirname,'..','src','lib','operatingStrategies','autoArbitration.ts'),'utf8');
for(const token of ["defaultAutoSource: 'standard'","stage: 'shadow'","requirePerResourceOptIn: true","requireCommissioningConfirmation: true","isAutoOperatingMode(context.operatingMode)","request.expiresAtMs > context.nowMs"]){assert.ok(src.includes(token),token);}
assert.ok(!src.includes('setState('));
console.log('RC55 focused fail-closed arbitration tests passed.');
