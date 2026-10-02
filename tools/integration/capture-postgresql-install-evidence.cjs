'use strict';
// Executes tests and binds raw output; never changes a failed result into pass.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const REPO=path.resolve(__dirname,'../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function run(app, python, pglite, output) {
    if(process.versions.node!=='24.21.0'||fs.existsSync(output))throw Error('FRESH_EVIDENCE_AND_PINNED_NODE_REQUIRED');
    fs.mkdirSync(output,{recursive:true,mode:0o755}); fs.mkdirSync(path.join(output,'raw'));
    const env={...process.env,PYTHONDONTWRITEBYTECODE:'1',NODE_PATH:[path.join(app,'node_modules/iobroker.nexowatt-ui/node_modules'),path.join(app,'node_modules'),path.join(app,'node_modules/@nexowatt/eos-postgresql-store/node_modules')].join(path.delimiter),EOS_PGLITE_MODULE_DIRECTORY:pglite};
    delete env.NODE_OPTIONS; delete env.NODE_TLS_REJECT_UNAUTHORIZED;
    const system=fs.readdirSync(path.join(REPO,'tests/system')).filter(n=>n.endsWith('.test.cjs')).map(n=>'tests/system/'+n);
    const cases=[
        {id:'system-installer',binary:process.execPath,args:['--test','--test-reporter=tap',...system,'tests/integration/onboard-ui.test.cjs','tests/postgresql/host-install.test.cjs','tests/postgresql/acceptance.test.cjs'],scope:'Unit/contract/command doubles, actual crypto; not systemd installation'},
        {id:'pg-contracts',binary:process.execPath,args:['--test','--test-reporter=tap',...['store','store-review','objects','states','controller-profile','tls-lab'].map(n=>`tests/postgresql/${n}.test.cjs`)],scope:'Contract doubles plus actual upstream Objects/pg code; native TLS lab explicitly skipped in root-only environment'},
        {id:'sql-wasm',binary:process.execPath,args:['--test','--test-reporter=tap','tests/postgresql/schema-wasm.test.cjs'],scope:'PGlite PostgreSQL WASM SQL/RLS; not native target17 or network TLS'},
        {id:'ui-regressions',binary:process.execPath,args:['--test','--test-reporter=tap',...['eos-os-update-status','eos-account-roles','eos-sse-authorization','eos-service-worker-auth'].map(n=>`components/ui/test/${n}.test.cjs`)],scope:'Selected affected UI unit regressions; not complete browser/device run'},
        ...['tests/postgresql/prepare-inputs.test.py','tests/system/os-updates.test.py','tests/system/sbom-test-base.test.py','tests/integration/embedded-sbom.test.py'].map((file,i)=>({id:`python-${i+1}`,binary:python,args:[file],scope:'Local policy/input/SBOM tests; no target package transaction'})),
    ];
    const records=[];
    for(const entry of cases){
        const startedAt=new Date().toISOString();
        const r=cp.spawnSync(entry.binary,entry.args,{cwd:REPO,env,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024,shell:false});
        const text=(r.stdout||'')+(r.stderr||'');const raw=`raw/${entry.id}.log`;fs.writeFileSync(path.join(output,raw),text,{flag:'wx'});
        const counts={};for(const name of ['tests','pass','fail','skipped']){const m=new RegExp(`^# ${name} (\\d+)$`,'m').exec(text);if(m)counts[name]=Number(m[1]);}
        const py=/Ran (\d+) tests? in/.exec(text);if(py)counts.tests=Number(py[1]);
        records.push({...entry,startedAt,finishedAt:new Date().toISOString(),exitCode:r.status,error:r.error?.code||null,passed:r.status===0&&!r.error,counts,raw,rawSha256:sha(text)});
        process.stdout.write(JSON.stringify({id:entry.id,exitCode:r.status,counts})+'\n');
    }
    const tracked=cp.spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:REPO,encoding:'utf8',maxBuffer:8*1024*1024});
    if(tracked.status!==0)throw Error('SOURCE_INVENTORY_FAILED');
    const sourcePaths=[...new Set(tracked.stdout.split('\0').filter(Boolean))].filter(p=>/^(runtime\/|tools\/system\/|tools\/integration\/(?:assemble-postgresql|package-postgresql|capture-postgresql)|system\/postgresql-test\/|tests\/postgresql\/)/.test(p)).sort();
    const sources=sourcePaths.map(relative=>({path:relative,sha256:sha(fs.readFileSync(path.join(REPO,relative)))}));
    const report={schemaVersion:1,kind:'eos-postgresql-test-installation-verification',sourceVersion:'0.2.0-dev.7',runtimeVersion:'0.2.0-test.2',generatedAt:new Date().toISOString(),
        environment:{node:process.versions.node,platform:process.platform,arch:process.arch,uid:process.getuid?.(),uidMap:fs.readFileSync('/proc/self/uid_map','utf8').trim()},
        tests:records,automatedAvailableChecksPassed:records.every(row=>row.passed),sources,
        nativePostgresqlServerTested:false,nativeTlsHandshakeTested:false,systemdHostInstalledHere:false,targetHardwareAccepted:false,
        independentPenetrationTestPerformed:false,craConformityEstablished:false,iecConformityEstablished:false,productionReleaseApproved:false,
        nativeBlocker:'Only UID/GID0 mapped; native PostgreSQL root refusal respected. Run signed target acceptance on fresh Pi.',
        recoveredBaseline:{originalCommit:'96a0854321a02a3afe6abef3e97ef8d6b5b970ab',fullZipSha256:'bac0a3f9ee205326c72cb24a0a48d6d6ab51a1515a6b2c5ad0e18f0e27085f3e',originalGitHistoryPresent:false},
        openFindings:['EOS-PG-INTEGRATION-20261001','EOS-PG-ISOLATION-20261002','EOS-PG-LIFECYCLE-20261002','EOS-PG-RECOVERY-20261002','EOS-PG-ADAPTERS-20261002','EOS-PG-ASSESSMENT-20261002','EOS-OS-UPDATES-RUNTIME-PIN-20261001']};
    fs.writeFileSync(path.join(output,'verification-summary.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    return report.automatedAvailableChecksPassed;
}
module.exports={run};
if(require.main===module){if(process.argv.length!==6)throw Error('USAGE_APP_PYTHON_PGLITE_OUTPUT');if(!run(...process.argv.slice(2)))process.exitCode=1;}
