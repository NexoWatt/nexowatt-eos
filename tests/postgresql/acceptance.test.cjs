'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
// Explicit command/client doubles: verifies the acceptance program's decision
// logic, NOT actual PostgreSQL authentication, SQL, TLS or RLS.
function harness(failMode) {
    const stores=[], connections=[], config={objects:{},states:{}};
    const rows=new Map();
    class Client {
        constructor(settings){this.settings=settings;this.connection={stream:{authorized:true,getProtocol:()=> 'TLSv1.3'}};}
        on(){}
        async connect(){connections.push(this.settings);const s=this.settings;
            if(failMode==='offline')throw Object.assign(Error('offline'),{code:'ECONNREFUSED'});
            let code=s.ssl===false||!s.ssl.cert||s.user!==s.ssl.cert?'28000':s.ssl.minVersion==='TLSv1.2'?'EPROTO':null;
            if(code && failMode!=='accept-insecure')throw Object.assign(Error('denied'),{code});
        }
        async query(sql,params){if(sql.startsWith('INSERT'))throw Object.assign(Error('denied'),{code:'42501'});
            if(sql.startsWith('SELECT has_database'))return{rowCount:1,rows:[{create_db:false,temp:false,create_schema:false}]};
            return{rowCount:failMode==='rls-leak'?1:0,rows:[]};}
        async end(){}
    }
    class Store {
        constructor(c,{domain}){this.domain=domain;stores.push(this);}
        async connect(){this.connected=true;}
        async set(id,value){rows.set(this.domain+id,Buffer.from(value));}
        async get(id){return rows.get(this.domain+id);}
        async delete(id){if(failMode==='cleanup')throw Error('failed');rows.delete(this.domain+id);}
        async close(){}
    }
    function requireApp(name){return name==='pg'?{Client}:{Store};} requireApp.resolve=()=>'/fixture/store/index.cjs';
    const dependencies={
        'node:fs':fs,'node:path':path,'node:crypto':require('node:crypto'),
        'node:module':{createRequire:()=>requireApp},
        '../transport/databases.cjs':{validatePostgresql:()=>{}},
        './packages/store/index.cjs':{validateConnection:(c,domain)=>({user:domain,ssl:{cert:domain,key:domain,minVersion:'TLSv1.3'}})},
    };
    const module={exports:{}};
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../runtime/postgresql/acceptance.cjs'),'utf8'),{module,exports:module.exports,
        require:name=>{assert.ok(dependencies[name],name);return dependencies[name];},process,Buffer,Date,setTimeout,clearTimeout});
    return{run:()=>module.exports.acceptance(config,'/fixture'),rows,connections};
}
test('acceptance decision requires all18 cases, records cleanup and does not claim controller/hardware acceptance',async()=>{
    const f=harness();const report=await f.run();assert.equal(report.passed,true);assert.equal(report.checks.length,18);assert.equal(f.rows.size,0);
    assert.equal(report.controllerCompatibilityVerified,false);assert.equal(report.productionApproved,false);
});
for(const mode of ['offline','accept-insecure','rls-leak','cleanup'])test(`acceptance refuses ${mode}`,async()=>{assert.equal((await harness(mode).run()).passed,false);});
