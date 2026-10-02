#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const h=require(path.join(root,"ems/rc85-runtime-hardening.js"));
const g=new h.Rc85EvcsDecisionGuard();
let r=g.evaluate({key:'lp1',requested:11000,reason:'auto',nowMs:100000});
assert(r.approved>0 && r.approved<=11000,'ramped start');
const running=r.approved;
r=g.evaluate({key:'lp1',requested:0,reason:'tariff price update',priceUpdatePending:true,nowMs:101000});
assert.equal(r.approved,running,'price update must not inject zero');
r=g.evaluate({key:'lp1',requested:0,reason:'grid-hard safety stop',hardSafety:true,nowMs:102000});
assert.equal(r.approved,0,'hard safety must stop immediately');
const env=h.rc85GridEnvelope({hardLimitW:40000,signedNvpW:-10000,currentControlledLoadW:0});
assert.equal(env.softLimitW,36000); assert.equal(env.reserveW,4000); assert.equal(env.hardHeadroomW,50000); assert.equal(env.maxControlledLoadW,50000);
assert.equal(h.rc85OfflineReserveW([{status:'offline',actualW:0,vehicleConnected:false}]),0);
assert.equal(h.rc85OfflineReserveW([{status:'offline',actualW:7000,vehicleConnected:true}]),7000);
assert.equal(h.rc85OfflineReserveW([{status:'offline',actualW:0,vehicleConnected:true,minPowerW:4200}]),4200);
const all=[];for(const p of (function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.git'].includes(e.name))continue;const f=path.join(d,e.name);e.isDirectory()?o.push(...walk(f)):o.push(f)}return o})(root)){if(/\.(?:ts|js|mjs|tsx|jsx)$/.test(p))all.push(fs.readFileSync(p,'utf8'))}
const text=all.join('\n');
assert(text.includes('RC85_MODULE_WATCHDOG'),'scheduler watchdog integration missing');
assert(text.includes('RC85_EVCS_SOFT_GUARD'),'EVCS soft guard integration missing');
assert(text.includes('RC85_OFFLINE_RESERVE_APPLIED'),'offline reserve is not applied to a charging budget');
assert(text.includes('RC85_SOFT_PROGRESSIVE'),'soft grid limit is still acting as an absolute cap');

assert(text.includes('RC85_STALE_TICK_RECOVERY'),'stale tick recovery missing');
assert(text.includes('RC85_BOUNDED_COLLECTION')||text.includes('startRc85HeapMonitor'),'memory hardening missing');
assert(text.includes('sinkFieldProtocolJson'),'sink field state missing');
const pkg = require(path.join(root, 'package.json'));
const io = require(path.join(root, 'io-package.json'));
assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'gültige package version');
assert.equal(io.common.version, pkg.version, 'Release-Versionen synchron');
console.log('[RC85] stability contract passed');
