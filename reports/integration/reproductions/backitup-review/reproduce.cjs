'use strict';
// Isolated review of committed TypeScript (Node 24 stripping) and JavaScript. No adapter start, real network, process spawn or host writes.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.BACKUP_SOURCE || '/workspace/scratch/6383b3161c96/component-sources/backitup';
const cli = require(path.join(root, 'src/lib/influxDbCli.ts'));
const options = {host:'example.invalid',port:8086,dbName:'fixture',token:'synthetic-test-only',protocol:'https',dbversion:'2.x',dbType:'remote',exe:''};
for (const operation of ['Backup', 'Restore']) {
  test(`observed issue: remote HTTPS ${operation} disables verification`, () => {
    const result = cli[`buildInflux${operation}Invocation`](options, '/fixture/backup');
    assert.ok(result.args.includes('--skip-verify'));
    assert.equal(result.env.INFLUX_TOKEN, options.token);
    assert.ok(!result.args.includes(options.token));
  });
}
test('positive control: local backup keeps token out of argv', () => {
  const result = cli.buildInfluxBackupInvocation({...options,dbType:'local'}, '/fixture/backup');
  assert.ok(!result.args.includes('--skip-verify'));
  assert.ok(!result.args.includes(options.token));
});
function inspect(method, protocol) {
  const source = fs.readFileSync(path.join(root,'build/main.js'),'utf8');
  const start=source.indexOf('    dlFileServer(protocol) {');
  const end=source.indexOf('    async renewOnedriveToken()',start);
  assert.ok(start>0 && end>start);
  const calls={applications:[],servers:[],multer:[]};
  const express=()=>{const app={middleware:[],routes:[],use(x){this.middleware.push(x)},post(...x){this.routes.push(x)}};calls.applications.push(app);return app};
  express.static=root=>({type:'static',root});
  const multer=config=>{calls.multer.push(config);return {single:field=>({type:'upload',field})}};
  multer.diskStorage=config=>config;
  const modules={express,multer,cors:()=>({type:'cors'})};
  for (const name of ['http','https']) modules[`node:${name}`]={createServer(...args){const s={protocol:name,options:args.length===2?args[0]:null,app:args.at(-1),listen(...listenArgs){this.listenArgs=listenArgs;return this},address(){return {port:9999}}};calls.servers.push(s);return s}};
  const context={require:name=>{assert.ok(Object.hasOwn(modules,name),`Unexpected dependency ${name}`);return modules[name]},node_path_1:path,node_fs_1:{existsSync:()=>false},tools:{getIobDir:()=>'/fixture/iobroker'},serverPort:s=>s.address().port,http:undefined,https:undefined};
  const Subject=vm.runInNewContext(`(class Subject {${source.slice(start,end)}})`,context,{timeout:1000});
  const subject=new Subject();subject.log={debug:()=>{}};subject.readServerCerts=()=>({key:'synthetic-key',cert:'synthetic-cert'});
  subject[method](protocol);
  return calls;
}
test('observed issue: download HTTP registers only static handler and unspecified listen host',()=>{
  const calls=inspect('dlFileServer','http:');
  assert.equal(calls.servers[0].protocol,'http');
  assert.deepEqual(Array.from(calls.servers[0].listenArgs),[0]);
  assert.equal(calls.applications[0].middleware.length,1);
  assert.equal(calls.applications[0].middleware[0].type,'static');
});
test('observed issue: upload HTTP has no auth middleware, size limits or server-generated name',()=>{
  const calls=inspect('ulFileServer','http:');
  assert.deepEqual(Array.from(calls.servers[0].listenArgs),[0]);
  assert.equal(calls.applications[0].middleware.length,1);
  assert.equal(calls.applications[0].middleware[0].type,'cors');
  assert.equal(calls.applications[0].routes[0][1].type,'upload');
  assert.equal(calls.multer[0].limits,undefined);
  let name;calls.multer[0].storage.filename({}, {originalname:'fixture.tar.gz'},(_,n)=>{name=n});
  assert.equal(name,'fixture.tar.gz');
});
test('observed issue: HTTPS upload config has server cert but no mutual TLS',()=>{
  const calls=inspect('ulFileServer','https:');
  assert.equal(calls.servers[0].protocol,'https');
  assert.equal(calls.servers[0].options.requestCert,undefined);
  assert.equal(calls.servers[0].options.minVersion,undefined);
});
