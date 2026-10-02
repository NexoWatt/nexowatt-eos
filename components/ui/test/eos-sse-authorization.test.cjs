'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');
const {SseRuntimeGuard}=require('../lib/sse-runtime-guard');
function fixture(guard,authorize){
  const req=new EventEmitter();req.socket={setKeepAlive(){}};
  const res=new EventEmitter();const writes=[];res.write=x=>{writes.push(x);return true;};res.end=()=>{res.writableEnded=true;};
  return {client:guard.addClient({req,res,authorize}),writes,res};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('EOS-SSE each frame rechecks authorization and revocation prevents queued payload',async()=>{
  const g=new SseRuntimeGuard({log:{warn(){}}});let allowed=true;let release;
  const f=fixture(g,async()=>allowed);g.write(f.client,'first');await tick();assert.deepEqual(f.writes,['first']);
  f.client.authorize=()=>new Promise(resolve=>{release=resolve;});g.write(f.client,'must-never-leak');await tick();
  release(false);await tick();assert.deepEqual(f.writes,['first']);assert.equal(f.res.writableEnded,true);g.closeAll();
});

test('EOS-SSE global pending cap survives closed clients until actual authorization settles',async()=>{
  const g=new SseRuntimeGuard({maxClients:8,log:{warn(){}}});const releases=[];
  try{
    for(let i=0;i<8;i++){const f=fixture(g,()=>new Promise(resolve=>releases.push(resolve)));g.write(f.client,'bounded');await tick();g.close(f.client,'fixture-disconnected');}
    const f=fixture(g,async()=>true);g.write(f.client,'refused');await tick();assert.equal(f.res.writableEnded,true);assert.deepEqual(f.writes,[]);assert.equal(g._authorizationPending,8);
    releases.forEach(resolve=>resolve(false));await tick();assert.equal(g._authorizationPending,0);
    const restored=fixture(g,async()=>true);g.write(restored.client,'restored');await tick();assert.deepEqual(restored.writes,['restored']);
  }finally{releases.forEach(resolve=>resolve(false));g.closeAll();}
});
