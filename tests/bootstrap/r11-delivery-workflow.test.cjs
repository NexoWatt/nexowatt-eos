'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { evaluate, MARKER, qualify, selectRun, WORKFLOWS } = require('../../tools/bootstrap/check-r11-delivery-request.cjs');
const workflow = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/eos-r11-test-delivery.yml'), 'utf8');
function git(root, ...args) { const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); }
function commit(root) { git(root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'isolated request fixture'); return git(root, 'rev-parse', 'HEAD'); }
function fixture(t, transform = value => JSON.stringify(value, null, 2)) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-r11-request-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    git(root, 'init', '-q'); fs.writeFileSync(path.join(root, 'source'), 'reviewed'); git(root, 'add', 'source'); const parent = commit(root);
    fs.mkdirSync(path.dirname(path.join(root, MARKER)), { recursive: true });
    fs.writeFileSync(path.join(root, MARKER), transform({ schemaVersion: 1, deliveryRevision: 11, sourceCommit: parent }));
    git(root, 'add', MARKER); const head = commit(root); return { root, parent, head };
}
function event(head) { return { repository: { full_name: 'NexoWatt/nexowatt-eos' }, workflow_run: { id: 123, run_attempt: 1,
    repository: { full_name: 'NexoWatt/nexowatt-eos' }, head_repository: { full_name: 'NexoWatt/nexowatt-eos' },
    head_branch: 'main', head_sha: head, event: 'push', conclusion: 'success', status: 'completed', path: '.github/workflows/security-review.yml' } }; }
test('marker-only push requests and a qualifying workflow event still waits for both source runs', async t => {
    const { root, head } = fixture(t);
    assert.equal(evaluate(root, 'push', event(head), head).eligible, false);
    const result = evaluate(root, 'workflow_run', event(head), head);
    assert.equal(result.eligible, false); assert.equal(result.sourceCommit, head); assert.equal(result.queryRuns, true);
    const ready = await qualify(result, 'fixture-only', async kind => ({ total_count: 1, workflow_runs: [{...event(head).workflow_run, path: WORKFLOWS[kind], id: kind === 'security' ? 123 : 124}] }));
    assert.equal(ready.eligible, true); assert.equal(ready.securityRunId, '123'); assert.equal(ready.networkRunId, '124');
});
test('ordinary source and generated delivery commits never request another R11', t => {
    const { root, head } = fixture(t); fs.writeFileSync(path.join(root, 'source'), 'new source'); git(root, 'add', 'source'); const next = commit(root);
    assert.equal(evaluate(root, 'workflow_run', event(next), next).eligible, false);
    assert.throws(() => evaluate(root, 'workflow_run', event(head), next));
});
test('wrong source parent, duplicate marker keys, extra fields and wrong revision are refused', t => {
    for (const change of [v => JSON.stringify({ ...v, sourceCommit: 'a'.repeat(40) }, null, 2),
        v => JSON.stringify({ ...v, deliveryRevision: 8 }, null, 2), v => JSON.stringify({ ...v, extra: true }, null, 2),
        v => JSON.stringify(v, null, 2).replace('"schemaVersion": 1', '"schemaVersion": 1, "schemaVersion": 1')]) {
        const { root, head } = fixture(t, change); assert.throws(() => evaluate(root, 'workflow_run', event(head), head));
    }
});
test('foreign repo, wrong workflow, run type, branch, result or tested source cannot approve delivery', t => {
    const { root, head } = fixture(t);
    for (const change of [e => { e.workflow_run.repository.full_name = 'other/repo'; }, e => { e.workflow_run.head_repository.full_name = 'fork/repo'; },
        e => { e.workflow_run.path = '.github/workflows/other.yml'; }, e => { e.workflow_run.event = 'pull_request'; },
        e => { e.workflow_run.conclusion = 'failure'; }, e => { e.workflow_run.status = 'in_progress'; },
        e => { e.workflow_run.head_sha = 'b'.repeat(40); }, e => { e.workflow_run.head_branch = 'work'; }, e => { e.workflow_run.id = '123'; }]) {
        const value = event(head); change(value); assert.throws(() => evaluate(root, 'workflow_run', value, head));
    }
});
test('dispatch is limited to an already tracked immutable complete four-file R11 delivery', t => {
    const { root, head } = fixture(t); assert.throws(() => evaluate(root, 'workflow_dispatch', event(head), head));
    const delivery = path.join(root, 'delivery/test-pi-0.2.0-test.3-r11'); fs.mkdirSync(delivery, { recursive: true });
    for (const name of ['eos-0.2.0-test.3-linux-arm64.tar.gz', 'release-public.pem', 'delivery.json', 'bundle.sha256']) fs.writeFileSync(path.join(delivery, name), 'inert presence fixture');
    git(root, 'add', 'delivery'); const next = commit(root); assert.equal(evaluate(root, 'workflow_dispatch', event(next), next).build, false);
});
test('workflow only downloads a pinned-run digest artifact and signs after mandatory native comparison', () => {
    assert.match(workflow, /workflows: \[EOS security regression, EOS technical network qualification\]/);
    assert.match(workflow, /paths: \[\.github\/eos-r11-build-request\.json\]/);
    assert.match(workflow, /run-id: \$\{\{ needs.request.outputs.security_run_id \}\}/);
    assert.match(workflow, /artifact-ids: \$\{\{ steps.native-artifact.outputs.artifact_id \}\}/);
    assert.match(workflow, /digest-mismatch: error/); assert.match(workflow, /build-revision.cjs --native-evidence/);
    assert.match(workflow, /fetch-depth: 0/); assert.doesNotMatch(workflow, /recover-r4|--force|refs\/heads\/(?!main)/);
});

test('R11 pipeline preserves the four native files and uses only its own reviewed builder and updater', () => {
    for (const name of ['own-adapters-native.tap', 'own-adapters-native-evidence.json',
        'own-adapters-native-prepared.json', 'own-adapters-source-binding.json', 'network-native-evidence.json', 'network-workflow.json']) assert.ok(workflow.includes("'" + name + "'"));
    assert.match(workflow, /reports\/integration\/network-test-20261020\/release\/build-revision\.cjs/);
    assert.match(workflow, /publish-r11-candidate\.py/);
    assert.match(workflow, /tests\/system\/update-test-to-r11\.test\.cjs/);
    assert.doesNotMatch(workflow, /publish-r9-candidate|test-pi-0\.2\.0-test\.3-r9\//);
    assert.match(workflow, /contents: read[\s\S]*actions: read/);
    assert.equal((workflow.match(/contents: write/g) || []).length, 2);
    assert.doesNotMatch(workflow, /persist-credentials: true|--force|pull_request_target|secrets\./);
    assert.match(workflow, /test "\$eos_remote" = "\$EOS_SOURCE_COMMIT"/);
    assert.match(workflow, /test "\$eos_remote" = "\$EOS_ASSET_COMMIT"/);
});

test('missing, pending or failed latest run never falls back to an older successful run', async () => {
    const head='a'.repeat(40), good=event(head).workflow_run;
    for(const kind of ['security','network']) {
        const row={...good,path:WORKFLOWS[kind]};
        assert.equal(selectRun({total_count:0,workflow_runs:[]},head,kind),null);
        for(const state of [{status:'in_progress',conclusion:null},{status:'completed',conclusion:'failure'}]) {
            assert.equal(selectRun({total_count:2,workflow_runs:[row,{...row,id:124,...state}]},head,kind),null);
        }
        for(const mutation of [{head_sha:'b'.repeat(40)},{path:'.github/workflows/other.yml'},{head_branch:'other'},{event:'pull_request'},{id:'123'}]) {
            assert.throws(()=>selectRun({total_count:1,workflow_runs:[{...row,...mutation}]},head,kind));
        }
    }
    const pending=await qualify({queryRuns:true,sourceCommit:head,eligible:false},'fixture',async kind=>kind==='network'?{total_count:0,workflow_runs:[]}:{total_count:1,workflow_runs:[good]});
    assert.equal(pending.eligible,false);
});

test('dual-workflow HTTPS lookups abort live requests and reject redirects within one deadline', async () => {
    const vm=require('node:vm'),{EventEmitter}=require('node:events');
    const source=fs.readFileSync(path.resolve(__dirname,'../../tools/bootstrap/check-r11-delivery-request.cjs'),'utf8');
    for(const mode of ['timeout','oversize','redirect']){
        const request=new EventEmitter();let destroyed=false,responseDestroyed=false,requestedTimeout;
        request.destroy=()=>{destroyed=true;};const module={exports:{}};
        vm.runInNewContext(source,{module,exports:module.exports,Buffer,setTimeout(callback,ms){requestedTimeout=ms;return setTimeout(callback,5);},clearTimeout,
          require(name){
            if(name==='node:fs')return{};if(name==='node:child_process')return{};assert.equal(name,'node:https');
            return{get(options,callback){
              assert.equal(options.hostname,'api.github.com');assert.equal(options.rejectUnauthorized,true);assert.equal(options.agent,false);
              assert.match(options.path,/security-review.yml\/runs\?head_sha=a{40}&branch=main&event=push&per_page=100$/);
              if(mode!=='timeout')queueMicrotask(()=>{const response=new EventEmitter();response.statusCode=mode==='redirect'?302:200;
                response.headers={'content-type':'application/json'};response.destroy=()=>{responseDestroyed=true;};callback(response);
                if(mode==='oversize')response.emit('data',Buffer.alloc(1024*1024+1));});return request;
            }};
          }});
        await assert.rejects(module.exports.requestRuns('security','a'.repeat(40),'non-secret-fixture'),/R11_BUILD_REQUEST_REJECTED/);
        assert.equal(destroyed,true);assert.equal(requestedTimeout,5000);if(mode!=='timeout')assert.equal(responseDestroyed,true);
    }
});
