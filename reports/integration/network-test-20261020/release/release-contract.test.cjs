'use strict';
// Synthetic contract records only: these tests do not claim native packet execution.
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const native=require('./native-evidence.cjs'),builder=require('./build-revision.cjs'),verifier=require('./verify-candidate.cjs');
const root=path.resolve(__dirname,'../../../..');
const sourceCommit='a'.repeat(40),source={files:4,sha256:'b'.repeat(64)};
const proof=()=>({status:'PASS',scope:'isolated Linux network namespaces; no systemd or Pi acceptance',hostNamespaceUntouched:true,
  versions:{nft:'synthetic-nft-version',dnsmasq:'synthetic-dnsmasq-version'},tests:native.PACKET_CHECKS.map(name=>({name,status:'PASS'}))});
const bad=fn=>assert.throws(fn,e=>/^R11_/.test(e.code||''));
test('synthetic network record binds source and explicitly keeps systemd/Pi/production untested',()=>{
  const record=native.bindPackets(proof(),sourceCommit,source);
  assert.equal(native.validateNetwork(record,sourceCommit,source).ok,true);
  for(const key of ['actualSystemdInstallTested','piTested','productionReleaseApproved'])assert.equal(record[key],false);
});
test('every missing, failed or skipped packet check blocks native evidence',()=>{
  for(const name of native.PACKET_CHECKS)for(const status of ['missing','FAIL','SKIP']){
    const value=proof();if(status==='missing')value.tests=value.tests.filter(row=>row.name!==name);else value.tests.find(row=>row.name===name).status=status;
    bad(()=>native.validatePacketProof(value));
  }
});
test('duplicate, unknown checks and forged test scope cannot satisfy native packet contract',()=>{
  for(const change of [v=>v.tests[1]=v.tests[0],v=>v.tests[0].name='unknown',v=>v.hostNamespaceUntouched=false,
    v=>v.scope='systemd and Raspberry Pi tested',v=>v.status='SKIP',v=>v.versions.nft='',v=>v.versions.dnsmasq=4]){
    const value=proof();change(value);bad(()=>native.validatePacketProof(value));
  }
});
test('source drift and unperformed hardware/install/production claims reject network evidence',()=>{
  for(const change of [v=>v.sourceCommit='c'.repeat(40),v=>v.sourceBinding.sha256='c'.repeat(64),v=>v.sourceBinding.files++,
    v=>v.actualSystemdInstallTested=true,v=>v.piTested=true,v=>v.productionReleaseApproved=true]){
    const value=native.bindPackets(proof(),sourceCommit,{...source});change(value);bad(()=>native.validateNetwork(value,sourceCommit,source));
  }
});
function unitRows(){return require(path.join(root,builder.REQUIRED_UPDATER)).NETWORK_FILES.filter(name=>name.startsWith('system/')).map(name=>{
  const bytes=fs.readFileSync(path.join(root,name));return {path:name,size:bytes.length,mode:0o644,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
});}
test('R11 host gate admits only all exact source units and controller dependency and preserves other host files',()=>{
  const old={path:'system/existing.service',size:1,mode:0o644,sha256:'a'.repeat(64)},units=unitRows();
  assert.equal(builder.validateHostDelta([old],[old,...units]).technicalNetworkInitiallyConfigured,false);
  for(const next of [[old,...units.slice(1)],[{...old,sha256:'b'.repeat(64)},...units],[old,...units,{...old,path:'system/extra.service'}],
    [old,...units.map((row,i)=>i?row:{...row,mode:0o755})]])bad(()=>builder.validateHostDelta([old],next));
  bad(()=>builder.validateHostDelta([old,units[0]],[old,...units]));
});
test('source binding distinguishes assembly baseline R9 from installed transition R10',()=>{
  const record=builder.sourceBinding({sourceCommit,coverage:[],overlays:[],changes:[],backupTransform:{},adapterShutdownTransform:{}},
    {releaseId:'d'.repeat(64),manifest:{files:[]}});
  assert.equal(record.previousReleaseId,native.BASE_RELEASE);assert.notEqual(record.assemblyBaseReleaseId,record.previousReleaseId);
});
test('no evidence-free, bypass or relative CLI is accepted',()=>{
  assert.deepEqual(builder.parseArgs(['--native-evidence','/evidence']),{nativeEvidenceDirectory:'/evidence'});
  for(const args of [[],['--force','/evidence'],['--base-directory','/base'],['--native-evidence','relative'],['--native-evidence','/a','--native-evidence','/b']])bad(()=>builder.parseArgs(args));
  assert.deepEqual(verifier.parseArgs(['/candidate',sourceCommit,'--native-evidence','/evidence']),{candidate:'/candidate',sourceCommit,nativeEvidenceDirectory:'/evidence'});
  bad(()=>verifier.parseArgs(['/candidate',sourceCommit]));
});
test('delivery metadata pins R11 sequence14 while preserving honest open target scope',()=>{
  const release={releaseId:'d'.repeat(64),archiveSha256:'e'.repeat(64),archiveBytes:123,signingPublicKeySha256:'f'.repeat(64),manifest:{files:[]}};
  const delivery=builder.deliveryMetadata({previousDelivery:{historical:'preserved'},release,sourceCommit,installedComponents:[]});
  assert.equal(delivery.releaseSequence,14);assert.equal(delivery.deliveryRevision,11);assert.equal(delivery.historical,'preserved');
  for(const key of ['productionReleaseApproved','hardwareTested','physicalControlEnabled','privateKeyPersisted'])assert.equal(delivery[key],false);
  const verification=builder.verificationMetadata({sourceCommit,timestamp:'2026-10-20T00:00:00Z',release,historicalCount:1,nativeEvidence:{ok:true},transition:{passed:true},prebuilt:{verified:true}});
  const input={delivery,reportDelivery:delivery,buildVerification:verification,expectedDelivery:delivery,expectedVerification:verification,
    checksumText:`${release.archiveSha256}  ${builder.BASE.archive}\n${release.signingPublicKeySha256}  release-public.pem\n`};
  verifier.assertReports(input);
  for(const key of ['delivery','reportDelivery','buildVerification'])bad(()=>verifier.assertReports({...input,[key]:{...input[key],productionReleaseApproved:true}}));
});

test('R11 SBOM profile preserves actual component and app hashes while separating assembly and installed baselines',()=>{
  const previous=require('../../own-adapter-test-20261015/release/build-revision.cjs');
  const derivative=require('../../own-adapter-test-20261015/release/bind-derivative-sbom.cjs');
  const bom={metadata:{properties:Object.entries({'eos:sbom:assembly':derivative.ASSEMBLY,'eos:sbom:base-release-id':previous.BASE.releaseId,
    'eos:sbom:previous-release-id':previous.BASE.releaseId,'eos:sbom:execution-scope':'own-adapter-test','eos:sbom:actual-app-file-table-sha256':'d'.repeat(64)})
    .map(([name,value])=>({name,value}))},components:[{name:'synthetic-identity',modified:true}],dependencies:[]};
  const original=structuredClone(bom),result=builder.networkSbom(bom),props=Object.fromEntries(result.metadata.properties.map(r=>[r.name,r.value]));
  assert.deepEqual(bom,original);assert.deepEqual(result.components,bom.components);assert.deepEqual(result.dependencies,bom.dependencies);
  assert.equal(props['eos:sbom:assembly'],builder.NETWORK_ASSEMBLY);assert.equal(props['eos:sbom:base-release-id'],previous.BASE.releaseId);
  assert.equal(props['eos:sbom:previous-release-id'],builder.BASE.releaseId);assert.equal(props['eos:sbom:target-sequence'],'14');
  assert.equal(props['eos:sbom:actual-app-file-table-sha256'],'d'.repeat(64));
  for(const key of ['eos:sbom:assembly','eos:sbom:base-release-id','eos:sbom:previous-release-id','eos:sbom:execution-scope']){
    const badBom=structuredClone(bom);badBom.metadata.properties.find(r=>r.name===key).value='unreviewed';bad(()=>builder.networkSbom(badBom));
  }
  bom.metadata.properties.push(bom.metadata.properties[0]);bad(()=>builder.networkSbom(bom));
});
