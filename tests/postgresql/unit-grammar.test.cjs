'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {UNITS}=require('../../tools/system/postgresql-host-preflight.cjs');
test('actual systemd-analyze accepts new PostgreSQL unit grammar in inert fixture; no services executed',t=>{
    if(!fs.existsSync('/usr/bin/systemd-analyze'))return t.skip('systemd-analyze unavailable');
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'eos-pg-unit-grammar-'));
    t.after(()=>fs.rmSync(root,{recursive:true,force:false}));
    const write=(name,body,mode=0o644)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body,{mode});};
    write('/etc/os-release','ID=debian\nVERSION_ID=13\n');
    for(const file of ['/usr/bin/node','/usr/bin/python3','/usr/lib/postgresql/17/bin/postgres'])write(file,'#!/bin/sh\nexit 0\n',0o755);
    for(const name of ['sysinit','basic','shutdown','network','network-online','timers','time-sync','multi-user'])write(`/etc/systemd/system/${name}.target`,'[Unit]\nDescription=Fixture target\n');
    for(const name of UNITS)write(`/etc/systemd/system/${name}`,fs.readFileSync(path.resolve(__dirname,'../../system/postgresql-test/systemd',name)));
    const result=cp.spawnSync('/usr/bin/systemd-analyze',['verify','--man=no','--generators=no',`--root=${root}`,...UNITS],{encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,result.stdout+result.stderr);
});
