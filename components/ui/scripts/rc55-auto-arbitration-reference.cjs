"use strict";
const rank={must:3,should:2,may:1};
const norm=m=>String(m??'').trim().toLowerCase().replace(/[\s_-]+/g,'');
const isAuto=m=>['auto','automatik','automatic'].includes(norm(m));
function eligible(c){
 if(!c.appInstalled)return[false,false,false,'app-not-installed'];
 if(!c.appEnabled)return[false,false,false,'app-disabled'];
 if(!c.profileActive)return[false,false,false,'profile-inactive'];
 if(!c.resourceEnabled)return[false,false,false,'resource-disabled'];
 if(!c.strategyParticipationEnabled)return[false,false,false,'resource-not-opted-in'];
 if(!isAuto(c.operatingMode))return[false,false,false,'mode-not-auto'];
 if(c.autoSource!=='strategy')return[false,false,false,'standard-auto-selected'];
 if(!c.online)return[false,false,false,'resource-offline'];
 if(c.alarmActive)return[false,false,false,'resource-alarm'];
 if(!c.telemetryFresh)return[false,false,false,'telemetry-stale'];
 if(c.controlStage==='shadow')return[true,false,true,'shadow-stage'];
 if(c.controlStage==='commissioning')return[true,false,true,'commissioning-stage'];
 if(!c.commissioningConfirmed)return[true,false,true,'commissioning-not-confirmed'];
 return[true,true,false,'eligible'];
}
function arbitrate(reqs,c,e){
 const fb=c.fallback==='pause'?'pause':'standardAuto';
 if(e.forceStop)return{owner:'pause',handoverPermitted:false,reason:'safety-stop',finalPlannerPowerW:0};
 const [ok,hand,shadow,reason]=eligible(c);
 if(!ok)return{owner:fb,handoverPermitted:false,shadowEvaluation:false,reason};
 const fresh=reqs.filter(r=>r.resourceId===c.resourceId&&Number.isFinite(r.targetPowerW)&&r.issuedAtMs<=c.nowMs&&r.expiresAtMs>c.nowMs).sort((a,b)=>(rank[b.requirementClass]-rank[a.requirementClass])||((b.priority||0)-(a.priority||0))||((b.issuedAtMs||0)-(a.issuedAtMs||0))||a.id.localeCompare(b.id));
 if(!fresh.length)return{owner:fb,handoverPermitted:false,shadowEvaluation:shadow,reason:'no-fresh-request'};
 const r=fresh[0], emin=Math.max(0,Number.isFinite(e.minPowerW)?e.minPowerW:0), emax=Math.max(emin,Number.isFinite(e.maxPowerW)?e.maxPowerW:emin), rmin=Math.max(emin,Number.isFinite(r.minPowerW)?r.minPowerW:emin), rmax=Math.min(emax,Math.max(rmin,Number.isFinite(r.maxPowerW)?r.maxPowerW:emax));
 const p=Math.min(Math.max(Math.max(0,r.targetPowerW),rmin),rmax);
 return{owner:hand?'strategy':fb,handoverPermitted:hand,shadowEvaluation:shadow,reason,selectedRequestId:r.id,requestedPowerW:r.targetPowerW,finalPlannerPowerW:p};
}
module.exports={eligible,arbitrate,isAuto};
