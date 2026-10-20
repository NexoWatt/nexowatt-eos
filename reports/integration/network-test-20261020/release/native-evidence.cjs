'use strict';
// R11 combines exact current-app native evidence with independently executed
// kernel packet tests. Host installer fault fixtures do not become systemd proof.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {isDeepStrictEqual:equal}=require('node:util');
const ROOT=path.resolve(__dirname,'../../../..');
const bundle=require(path.join(ROOT,'runtime/release/bundle.cjs'));
const own=require('../../own-adapter-test-20261015/release/native-evidence.cjs');
const BASE_RELEASE='9073b20a1c9f54eb4870b3b37a4a8ef59c6916feb379234aa6d14986a3fc26f0';
const PACKET_CHECKS=Object.freeze([
  'fixture_ipv4_route_positive','fixture_ipv6_route_positive','fixture_customer_route_positive','fixture_dns_route_positive',
  'internet_closed_initially','dns_closed_initially','ipv6_forwarding_blocked','technical_admin_blocked',
  'management_admin_preserved','explicit_device_listener_allowed','eos_initiated_device_connection_preserved',
  'technical_dhcp_dora_and_explicit_options','management_receives_no_dhcp_offer',
  'reservation_survives_daemon_restart_and_changed_client_id','customer_lan_blocked_during_grant',
  'ipv6_blocked_during_ipv4_grant','dns_forwarded_during_grant','established_tcp_stream_expires_in_kernel',
  'new_connections_blocked_after_expiry','dns_blocked_after_expiry','wrong_mac_cannot_use_ip_grant',
  'reload_without_grants_is_closed','unrelated_firewall_table_preserved',
]);
const fail=()=>{throw Object.assign(new Error('R11_NATIVE_EVIDENCE_REJECTED'),{code:'R11_NATIVE_EVIDENCE_REJECTED'});};
function git(...args){return cp.execFileSync('git',args,{cwd:ROOT,encoding:'utf8',timeout:10000,maxBuffer:16*1024*1024}).trim();}
function sourceBinding(){
  const roots=['runtime/network','system/network','components/admin','tests/network','tools/system/install-network-host.py','tools/system/update-test-to-r11.cjs'];
  const names=git('ls-files','--',...roots).split('\n').filter(Boolean).sort();
  if(!names.length || git('ls-files','--others','--exclude-standard','--',...roots))fail();
  const rows=names.map(name=>{const data=bundle.readFileLimited(path.join(ROOT,name),32*1024*1024).bytes;return {path:name,bytes:data.length,sha256:bundle.sha256(data)};});
  return {files:rows.length,sha256:bundle.sha256(Buffer.from(JSON.stringify(rows)))};
}
function validatePacketProof(proof){
  if(proof?.status!=='PASS'||proof.scope!=='isolated Linux network namespaces; no systemd or Pi acceptance'||
    proof.hostNamespaceUntouched!==true||!Array.isArray(proof.tests)||proof.tests.length!==PACKET_CHECKS.length||
    !equal(proof.tests.map(row=>row.name).sort(),[...PACKET_CHECKS].sort())||proof.tests.some(row=>row.status!=='PASS')||
    !proof.versions||['nft','dnsmasq'].some(key=>typeof proof.versions[key]!=='string'||!proof.versions[key].length||proof.versions[key].length>4096))fail();
  return true;
}
function bindPackets(raw,sourceCommit,source=sourceBinding()){
  validatePacketProof(raw);
  if(!/^[a-f0-9]{40}$/.test(sourceCommit||'')||!Number.isSafeInteger(source?.files)||source.files<1||!/^[a-f0-9]{64}$/.test(source.sha256||''))fail();
  return {schemaVersion:1,kind:'eos-r11-native-packet-evidence',sourceCommit,sourceBinding:source,packetProof:raw,
    actualSystemdInstallTested:false,piTested:false,productionReleaseApproved:false};
}
function validateNetwork(record,sourceCommit,source=sourceBinding()){
  if(record?.schemaVersion!==1||record.kind!=='eos-r11-native-packet-evidence'||record.sourceCommit!==sourceCommit||
    !equal(record.sourceBinding,source)||record.actualSystemdInstallTested!==false||record.piTested!==false||record.productionReleaseApproved!==false)fail();
  validatePacketProof(record.packetProof);return {ok:true,sourceCommit,sourceBinding:source,checks:[...PACKET_CHECKS],
    scope:'native Linux namespace packet and DHCP proof; systemd and Pi remain open'};
}
function verifyNativeEvidence(options){
  const component=own.verifyNativeEvidence(options);
  const file=path.join(options.directory,'network-native-evidence.json'),data=bundle.readFileLimited(file,4*1024*1024).bytes;
  const network=validateNetwork(JSON.parse(data),options.sourceCommit);
  return {ok:true,sourceCommit:options.sourceCommit,component,network,
    evidenceFiles:[...component.evidenceFiles,{file:'network-native-evidence.json',bytes:data.length,sha256:bundle.sha256(data)}],
    actualSystemdInstallTested:false,hardwareTested:false,productionReleaseApproved:false};
}
module.exports={BASE_RELEASE,PACKET_CHECKS,sourceBinding,validatePacketProof,bindPackets,validateNetwork,verifyNativeEvidence};
if(require.main===module){try{
  if(process.argv.length!==5||process.argv[2]!=='--bind-packets')fail();
  const sourceCommit=git('rev-parse','HEAD');if(git('status','--porcelain','--untracked-files=normal'))fail();
  const raw=JSON.parse(bundle.readFileLimited(path.resolve(process.argv[3]),4*1024*1024).bytes);
  fs.writeFileSync(path.resolve(process.argv[4]),JSON.stringify(bindPackets(raw,sourceCommit),null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('R11_NATIVE_PACKET_EVIDENCE_BOUND');
}catch{console.error('R11_NATIVE_EVIDENCE_REJECTED');process.exitCode=1;}}
