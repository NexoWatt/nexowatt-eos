'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { spawnSync } = require('node:child_process');
const transform = require('../../runtime/controller-profile/v7.2.5/transform.cjs');

// The actual pinned NT handler is executed with the real EOS States + Store
// classes. Only PostgreSQL I/O is doubled; this is no native database/Pi test.
function source(version, flavor, patched) {
    const dir = path.join(__dirname, 'controller-profile-fixtures', version === '7.2.5' ? '7.2.5' : '');
    const original = fs.readFileSync(path.join(dir, `${flavor}-main.original.txt`));
    return patched ? transform.transformFile(`node_modules/iobroker.js-controller/build/${flavor}/main.js`, original).content : original.toString();
}
function handler(version, flavor, patched) {
    const text = source(version, flavor, patched);
    const start = text.indexOf('const ts = logger.transports.find(');
    const end = text.indexOf('if (!compactGroupController)', start);
    assert.ok(start > 0 && end > start);
    return text.slice(start, end);
}
const child = String.raw`
    const { EventEmitter } = require('node:events');
    const vm = require('node:vm');
    const options = JSON.parse(process.argv[1]);
    const code = Buffer.from(process.argv[2], 'base64').toString();
    const { Store } = require(options.store);
    const { Client } = require(options.states);
    const store = new Store({host:'db.example.invalid', database:'eos', user:'eos_states',
        options:{ssl:{ca:'fixture',cert:'fixture',key:'fixture'}}}, {domain:'states'});
    store.connected = true;
    let published = 0, releases = 0;
    const sqlClient = {
        async query(sql) {
            if (options.failure === 'transaction' && sql === 'BEGIN') throw new Error('PRIVATE_PG_ERROR_CANARY');
            if (sql.startsWith('INSERT INTO eos_store.events')) { published++; return {rows:[{id:'1'}],rowCount:1}; }
            return {rows:[],rowCount:0};
        },
        release() { releases++; }, async end() {}
    };
    store.pool = {async connect() {
        if (options.failure === 'pool') throw new Error('PRIVATE_CONNECTION_ERROR_CANARY');
        return sqlClient;
    }};
    const states = new Client({autoConnect:false}, {store,controllerAdapter:{name:'@iobroker/js-controller-adapter',version:options.version}});
    states._ready = true;
    const transport = new EventEmitter(); transport.name = 'NT';
    const logger = {transports:[transport]};
    vm.runInNewContext(code, {states,logger,console,hostLogPrefix:'host.fixture',logList:['system.adapter.eos-admin.0'],Promise}, {timeout:1000});
    transport.emit('logged', {message:'PRIVATE_LOG_CANARY',severity:'info'});
    transport.emit('logged', {message:'PRIVATE_LOG_CANARY',severity:'warn'});
    setTimeout(async () => {
        // The caller-facing States promises must still reject DB write failures.
        const forwarded = published;
        let explicitRejected = false;
        try { await states.setState('unchanged.control.write', {val:42}); }
        catch { explicitRejected = true; }
        console.log(JSON.stringify({alive:true,published:forwarded,releases,explicitRejected}));
    }, 30);
`;
function processResult(version, flavor, patched, failure) {
    const options = {version,failure,
        store:path.resolve(__dirname,'../../runtime/postgresql/packages/store/index.cjs'),
        states:path.resolve(__dirname,'../../runtime/postgresql/packages/db-states-postgresql/index.cjs')};
    return spawnSync(process.execPath, ['--unhandled-rejections=strict','-e',child,JSON.stringify(options),Buffer.from(handler(version,flavor,patched)).toString('base64')],
        {encoding:'utf8',timeout:5000,env:{PATH:process.env.PATH}});
}
for (const version of ['7.2.2','7.2.5']) for (const flavor of ['cjs','esm']) for (const failure of ['pool','transaction']) {
    test(`original ${version} ${flavor}: real States/Store ${failure} error escapes the NT handler`, () => {
        const result = processResult(version,flavor,false,failure);
        assert.equal(result.error, undefined);
        assert.notEqual(result.status,0);
        assert.match(result.stderr,failure === 'pool' ? /EOS_PG_UNAVAILABLE/ : /EOS_PG_TRANSACTION_FAILED/);
        assert.doesNotMatch(result.stdout,/"alive":true/);
    });
}
for (const flavor of ['cjs','esm']) for (const failure of ['pool','transaction']) {
    test(`protected 7.2.5 ${flavor}: ${failure} failure cannot recursively kill the controller`, () => {
        const result = processResult('7.2.5',flavor,true,failure);
        assert.equal(result.error, undefined);
        assert.equal(result.status,0,result.stderr);
        const summary = JSON.parse(result.stdout);
        assert.equal(summary.alive,true);
        assert.equal(summary.published,0);
        assert.equal(summary.explicitRejected,true,'control-write failure must remain visible to its caller');
        assert.equal(result.stderr.trim(),'EOS_CONTROLLER_LOG_FORWARD_FAILED','one fixed nonrecursive diagnostic for repeated failed log forwards');
        assert.doesNotMatch(result.stderr,/PRIVATE_|EOS_PG_/,'no error text or log payload exported by failure handler');
    });
}
for (const flavor of ['cjs','esm']) test(`protected ${flavor}: successful logs retain delivery and do not emit a diagnostic`, () => {
    const result = processResult('7.2.5',flavor,true,'none');
    assert.equal(result.error,undefined);
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).published,2);
    assert.equal(result.stderr,'');
});

function runtime(flavor, pushLog, diagnostic = () => {}) {
    const transport = new EventEmitter(); transport.name = 'NT';
    const context = {states:{pushLog},logger:{transports:[transport]},console:{error:diagnostic},
        hostLogPrefix:'host.fixture',logList:['reader'],Promise};
    vm.runInNewContext(handler('7.2.5',flavor,true),context,{timeout:1000});
    return (message = 'fixture') => transport.emit('logged',{message});
}
const turn = () => new Promise(resolve => setImmediate(resolve));
for (const flavor of ['cjs','esm']) {
    test(`protected ${flavor}: forward queue is bounded and frees capacity after settlement`, async () => {
        const held = []; const payloads = []; const diagnostics = [];
        const emit = runtime(flavor,(id,info) => { payloads.push({id,...info}); return new Promise(resolve => held.push(resolve)); },code => diagnostics.push(code));
        for (let i=0;i<1000;i++) emit(`message-${i}`);
        assert.equal(held.length,64);
        assert.equal(diagnostics.length,1);
        assert.equal(payloads[0].message,'message-0');
        assert.equal(payloads[0].from,'host.fixture');
        held.splice(0).forEach(resolve=>resolve()); await turn();
        emit('after-recovery');
        assert.equal(held.length,1);
        assert.equal(payloads.at(-1).message,'after-recovery');
        held.splice(0).forEach(resolve=>resolve()); await turn();
    });
    test(`protected ${flavor}: synchronous throw and diagnostic sink failure remain contained`, async () => {
        let calls=0, diagnostics=0;
        const emit = runtime(flavor,()=>{calls++;throw new Error('PRIVATE_SYNC_CANARY');},()=>{diagnostics++;throw new Error('PRIVATE_SINK_CANARY');});
        for(let i=0;i<100;i++) emit();
        await turn();
        assert.equal(calls,100,'synchronous errors must release outstanding capacity');
        assert.equal(diagnostics,1);
    });
    test(`protected ${flavor}: unrelated transport errors are not hidden`, () => {
        const transport = new EventEmitter(); transport.name = 'NT';
        vm.runInNewContext(handler('7.2.5',flavor,true),{states:{pushLog:()=>Promise.resolve()},
            logger:{transports:[transport]},console,hostLogPrefix:'host.fixture',logList:['reader'],Promise},{timeout:1000});
        // Malformed event input fails outside the narrow pushLog boundary.
        assert.throws(()=>transport.emit('logged',null),/Cannot set properties of null/);
    });
}
