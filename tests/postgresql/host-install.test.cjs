'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const vm = require('node:vm');
const pg = require('../../runtime/postgresql/host.cjs');
const { backend, validatePostgresql, clients } = require('../../runtime/transport/databases.cjs');
const { assertRuntimeConfig } = require('../../runtime/bootstrap/initialize.cjs');
const { mergeControllerConfig } = require('../../tools/system/install-host.cjs');
const { inspectPostgresqlHost, REQUIRED, UNITS, FRESH_PATHS } = require('../../tools/system/postgresql-host-preflight.cjs');
const { installPostgresqlHost } = require('../../tools/system/install-postgresql-host.cjs');
const product = require('../../runtime/product/scope.cjs');
const REPO = path.resolve(__dirname, '../..');
function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-pg-installer-')); fs.chmodSync(root, 0o755);
    t.after(() => fs.rmSync(root, { recursive: true, force: false }));
    const at = name => path.join(root, name);
    const write = (name, data = '', mode = 0o644) => { fs.mkdirSync(path.dirname(at(name)), { recursive: true }); fs.writeFileSync(at(name), data, { mode }); };
    return { root, at, write };
}
function goodExec(file, args) {
    let stdout = '', status = 0;
    if (file.endsWith('/node')) stdout = 'v24.21.0\n';
    if (file.endsWith('/systemctl') && args[0] === 'show') stdout = 'Version=257.13\nSystemState=running\n';
    if (file.endsWith('/systemctl') && args[0] === 'list-unit-files') stdout = 'ssh.service enabled enabled\nsystemd-journald.service static -\n';
    if (file.endsWith('/postgres')) stdout = 'postgres (PostgreSQL) 17.11 (Debian 17.11-1)\n';
    if (file.endsWith('/psql')) stdout = 'psql (PostgreSQL) 17.11 (Debian 17.11-1)\n';
    if (file.endsWith('/getent')) status = 2;
    if (file.endsWith('/openssl')) stdout = 'TLS_AES_256_GCM_SHA384\n';
    if (file.endsWith('/dpkg-query')) stdout = 'install ok installed\t17.11-fixture\n';
    return { status, stdout, stderr: '' };
}
function host(t) {
    const f = fixture(t); f.write('/etc/os-release', 'ID=debian\nVERSION_ID="13"\n');
    fs.mkdirSync(f.at('/run/systemd/system'), { recursive: true });
    REQUIRED.forEach(file => f.write(file, '', 0o755));
    f.write('/usr/share/keyrings/debian-archive-keyring.gpg', 'fixture');
    return { ...f, inspect: exec => inspectPostgresqlHost({ root: f.root, uid: 0, expectedNodeVersion: '24.21.0', platform: 'arm64', exec: exec || goodExec }) };
}
function unitNamespaceHost(t) {
    const f = host(t), fixtureModule = { exports: {} };
    // Command-double regression, runnable on Windows as well as POSIX. Model
    // only the already-checked tool trust boundary; execute the real preflight
    // source, command selection and table parser. This does not prove Linux
    // ownership/modes or a native systemd invocation. Production is unchanged.
    const source = fs.readFileSync(path.join(REPO, 'tools/system/postgresql-host-preflight.cjs'), 'utf8');
    const fixtureRequire = name => name === './host-preflight.cjs' ? {
        ...require('../../tools/system/host-preflight.cjs'),
        toolTrust: file => ({ trusted: true, resolved: file }),
    } : require(name);
    vm.runInThisContext(`(function(require,module){${source}\n})`, { filename: 'postgresql-host-preflight-command-fixture.cjs' })(fixtureRequire, fixtureModule);
    return { ...f, inspect: exec => fixtureModule.exports.inspectPostgresqlHost({ root: f.root, uid: 0,
        expectedNodeVersion: '24.21.0', platform: 'arm64', exec }) };
}
test('PostgreSQL prerequisite fixture passes independently of preserved Redis hold', t => {
    const f = host(t), r = f.inspect();
    assert.equal(r.ready, true, JSON.stringify(r.checks.filter(row => row.status === 'fail')));
    assert.equal(r.targetHardwareAccepted, false); assert.equal(r.redisRequired, false);
    assert.equal(r.changesPerformed, false);
});
test('fresh unit namespace uses a successful complete list, independent of systemd257 empty-pattern exit 1', t => {
    const f = unitNamespaceHost(t), calls = [];
    const report = f.inspect((file, args) => {
        if (file.endsWith('/systemctl') && args[0] === 'list-unit-files') {
            calls.push(args);
            if (args.some(arg => arg.includes('*'))) return { status: 1, stdout: '', stderr: '' };
        }
        return goodExec(file, args);
    });
    assert.equal(report.ready, true);
    assert.deepEqual(calls, [['list-unit-files', '--no-legend', '--no-pager', '--full']]);
    const check = report.checks.find(row => row.id === 'fresh-unit-namespace');
    assert.equal(check.status, 'pass'); assert.equal(check.detail.queryStatus, 0);
    assert.deepEqual(check.detail.conflictingUnits, []);
});
test('unit namespace rejects any existing EOS or ioBroker state even when protected paths are absent', t => {
    const f = unitNamespaceHost(t);
    const states = ['enabled', 'enabled-runtime', 'linked', 'linked-runtime', 'alias', 'masked', 'masked-runtime',
        'static', 'disabled', 'indirect', 'generated', 'transient', 'bad'];
    for (const name of ['nexowatt-eos-old.service', 'nexowatt-eos-redis@.service', 'iobroker.service', 'iobroker-backup.timer']) {
        for (const state of states) {
            const report = f.inspect((p, a) => p.endsWith('/systemctl') && a[0] === 'list-unit-files' ?
                { status: 0, stdout: `ssh.service enabled enabled\n${name} ${state} -\n`, stderr: '' } : goodExec(p, a));
            assert.equal(report.ready, false, `${name} ${state}`);
            const check = report.checks.find(row => row.id === 'fresh-unit-namespace');
            assert.equal(check.status, 'fail'); assert.equal(check.detail.outputValid, true);
            assert.deepEqual(check.detail.conflictingUnits, [name]);
            assert.equal(report.checks.filter(row => row.id.startsWith('fresh-path:')).every(row => row.status === 'pass'), true);
            assert.equal(report.changesPerformed, false);
        }
    }
});
test('unit namespace accepts full names, instances, escaped names and known C-locale table columns', t => {
    const f = unitNamespaceHost(t);
    const stdout = ['ssh.service enabled enabled', 'getty@.service enabled enabled',
        'dev-disk-by\\x2duuid-abcd.device static -', '-.mount generated -', 'system.slice static -',
        'a'.repeat(180) + '.service disabled disabled', 'custom.path indirect ignored',
        'custom.socket linked n/a', 'custom.target alias -', 'custom.timer static unknown'].join('\n') + '\n';
    const report = f.inspect((p, a) => p.endsWith('/systemctl') && a[0] === 'list-unit-files' ?
        { status: 0, stdout, stderr: '' } : goodExec(p, a));
    assert.equal(report.ready, true);
});
test('unit namespace rejects empty, malformed, incomplete or failed unit listings', t => {
    const f = unitNamespaceHost(t), good = 'ssh.service enabled enabled\n';
    const failures = [
        { status: 1, stdout: '', stderr: '' },
        { status: 1, stdout: good, stderr: '' },
        { status: 0, stdout: good, stderr: 'Failed to list all unit files.' },
        { status: null, stdout: good, stderr: '', error: 'ETIMEDOUT' },
        { status: 0, stdout: good, stderr: '', error: 'ENOBUFS' },
        ...['', ' \n', 'UNIT FILE STATE PRESET\n', '0 unit files listed.\n',
            'nexowatt-eos-old.service disabled\n', 'ssh.service unexpected enabled\n',
            'ssh.service enabled unexpected\n', 'ssh.service enabled enabled extra\n',
            'nexowatt-eos-old…service disabled enabled\n', 'ssh.service enabled enabled\ntruncated',
            '\u001b[31mssh.service enabled enabled\n', 'a'.repeat(256) + '.service static -\n']
            .map(stdout => ({ status: 0, stdout, stderr: '' })),
    ];
    for (const result of failures) {
        const report = f.inspect((p, a) => p.endsWith('/systemctl') && a[0] === 'list-unit-files' ? result : goodExec(p, a));
        assert.equal(report.ready, false, JSON.stringify(result));
        assert.equal(report.checks.find(row => row.id === 'fresh-unit-namespace').status, 'fail');
        assert.equal(report.changesPerformed, false);
    }
});
for (const version of ['17.10', '16.11', '18.1']) test(`unsupported PostgreSQL ${version} rejected`, t => {
    const f = host(t); assert.equal(f.inspect((p,a) => p.endsWith('/postgres') ? { status: 0, stdout: `postgres (PostgreSQL) ${version}\n` } : goodExec(p,a)).ready, false);
});
test('every protected existing path, including old standalone EOS, rejects without mutations', t => {
    const f = host(t);
    for (const file of FRESH_PATHS) {
        f.write(file, 'preserve-me'); assert.equal(f.inspect().ready, false, file);
        assert.equal(fs.readFileSync(f.at(file), 'utf8'), 'preserve-me'); fs.unlinkSync(f.at(file));
    }
});
test('malformed listeners, occupied IPv6 port, mutable executable and timeout fail closed', t => {
    const f = host(t);
    for (const stdout of ['broken', 'LISTEN 0 511 [::]:8188 [::]:*\n', 'LISTEN 0 128 127.0.0.1:15432 0.0.0.0:*\n']) {
        assert.equal(f.inspect((p,a) => p.endsWith('/ss') ? { status: 0, stdout } : goodExec(p,a)).ready, false);
    }
    assert.equal(f.inspect((p,a) => ({ ...goodExec(p,a), error: 'ETIMEDOUT' })).ready, false);
    fs.chmodSync(f.at('/usr/lib/postgresql/17/bin/postgres'), 0o777);
    let executed = false;
    assert.equal(f.inspect((p,a) => { if(p.endsWith('/postgres')) executed=true; return goodExec(p,a); }).ready, false);
    assert.equal(executed, false);
});
test('real OpenSSL provisioning, distinct identities, bootstrap profile and private key permissions', { skip: process.getuid?.() !== 0 }, t => {
    // rootOwned deliberately rejects world-writable /tmp ancestors. Use this
    // root-owned workspace; no production account/certificate is involved.
    const parent = fs.mkdtempSync('/root/eos-pg-certificate-test-');
    t.after(() => fs.rmSync(parent, { recursive: true, force: false }));
    const directory = path.join(parent, 'postgresql');
    const result = pg.provision({ directory }); assert.equal(result.status, 'VALID'); assert.equal(result.certificates.length, 3);
    const config = JSON.parse(fs.readFileSync(path.join(directory, 'databases.json')));
    assert.equal(validatePostgresql(config), config);
    assert.equal(backend(config), 'postgresql');
    assert.equal(assertRuntimeConfig(mergeControllerConfig({}, config, 'eos-test')).objects.type, 'postgresql');
    assert.equal(fs.statSync(path.join(directory, 'objects.key')).mode & 0o777, 0o600);
    assert.throws(() => pg.provision({ directory }), /PG_FRESH_CONFIG_REQUIRED/);
    assert.equal(pg.inspect({ directory, now: Date.now() + 61 * 86400000 }).status, 'RENEWAL_REQUIRED');
    fs.chmodSync(path.join(directory, 'objects.key'), 0o644);
    assert.throws(() => pg.inspect({ directory }), /PG_PRIVATE_KEY_INVALID/);
});
test('backend rejects mixtures, injected loader names and TLS downgrade', () => {
    for (const value of [{}, { objects: { type: '../evil' }, states: { type: '../evil' } }, { objects: { type: 'postgresql' }, states: { type: 'redis' } }]) assert.throws(() => backend(value), /DATABASE_BACKEND_REJECTED/);
    const names=[]; const loaded=clients(name => { names.push(name); return { Client: name }; }, { objects: { type: 'postgresql' }, states: { type: 'postgresql' } });
    assert.deepEqual(names, ['@iobroker/db-objects-postgresql', '@iobroker/db-states-postgresql']); assert.match(loaded.Objects,/postgresql/);
    assert.throws(() => validatePostgresql({objects:{type:'postgresql'},states:{type:'postgresql'}}));
});
test('database and runtime service boundaries retain network discovery without root privileges', () => {
    const unit = name => fs.readFileSync(path.join(REPO, 'system/postgresql-test/systemd', name), 'utf8');
    const server=unit('nexowatt-eos-postgresql.service'), controller=unit('nexowatt-eos-controller.service');
    assert.match(server,/User=eos-postgres/); assert.match(controller,/User=eos-runtime/);
    for (const body of [server,controller]) { assert.match(body,/NoNewPrivileges=yes/); assert.match(body,/ProtectSystem=strict/); assert.doesNotMatch(body,/redis@/); }
    assert.match(controller,/AF_NETLINK/); assert.match(server,/RuntimeDirectoryMode=0700/);
    assert.match(pg.clusterConfig(),/ssl_min_protocol_version='TLSv1.3'/); assert.match(pg.clusterConfig(),/listen_addresses='127.0.0.1'/);
    assert.doesNotMatch(pg.hbaConfig(),/\btrust\b/); assert.match(pg.hbaConfig(),/host all all 0.0.0.0\/0 reject/);
    assert.match(unit('nexowatt-eos-pg-certificates.service'),/no automatic renewal/);
});
function installFixture(t) {
    const f = fixture(t), releaseId='a'.repeat(64), releasePath=`/opt/nexowatt/eos/releases/${releaseId}`;
    const required=['app/package.json','app/node_modules/iobroker.js-controller/controller.js','runtime/bootstrap/initialize.cjs',
        'runtime/postgresql/schema.sql','runtime/postgresql/host.cjs','runtime/postgresql/acceptance.cjs','runtime/release/installed-check.cjs','runtime/os-updates/runner.py',
        'system/test-base/os-updates/policy.json','system/test-base/os-updates/initial-status.json'];
    for (const name of required) f.write(`${releasePath}/${name}`, '{}');
    f.write(`${releasePath}/app/node_modules/iobroker.js-controller/conf/iobroker-dist.json`, '{}');
    for (const unit of UNITS) f.write(`${releasePath}/system/postgresql-test/systemd/${unit}`, fs.readFileSync(path.join(REPO,'system/postgresql-test/systemd',unit)));
    fs.mkdirSync(f.at('/etc/systemd/system'),{recursive:true});
    const commands=[];
    const exec=(p,a) => { commands.push([p,a]); let stdout='';
        if(p.endsWith('/id')) stdout=a[1];
        if(p.endsWith('/systemctl') && a[0]==='show') stdout='success\n';
        if(p.endsWith('/node') && a[0].endsWith('/acceptance.cjs')) stdout=JSON.stringify({kind:'eos-postgresql-target-acceptance',passed:true});
        return { status:0, stdout, stderr:'' }; };
    const provision=({directory}) => { fs.mkdirSync(directory,{recursive:true}); fs.writeFileSync(path.join(directory,'server.key'),'fixture');
        fs.writeFileSync(path.join(directory,'databases.json'),JSON.stringify({objects:{type:'postgresql'},states:{type:'postgresql'}})); };
    return { ...f, commands, options:{profile:'test',releaseId,releasePath,start:true,expectedNodeVersion:'24.21.0',publicKeySha256:'b'.repeat(64),sequence:3,platform:'arm64'},
        deps:{root:f.root,uid:0,exec,provision,preflight:()=>({ready:true}),skipOwnershipFixture:true} };
}
test('installer command-double starts schema and live gate before controller; never invokes Redis/npm', t => {
    const f=installFixture(t), result=installPostgresqlHost(f.options,f.deps); assert.equal(result.phase,'TEST_SERVICES_STARTED');
    const index = predicate => f.commands.findIndex(([p,a])=>predicate(p,a));
    assert.ok(index((p,a)=>a.includes('initdb')||a.some(s=>s.endsWith('/initdb'))) < index((p,a)=>a.includes('CREATE DATABASE eos TEMPLATE template0;')));
    assert.ok(index((p,a)=>a.some(s=>s.endsWith('/acceptance.cjs'))) < index((p,a)=>a[0]==='start' && a.includes('nexowatt-eos-initialize.service')));
    assert.equal(f.commands.some(([p,a])=>/npm|redis/.test(JSON.stringify([p,a]))),false);
    assert.equal(fs.statSync(f.at('/etc/nexowatt-eos/iobroker.json')).mode & 0o777,0o640);
    assert.equal(result.hardwareAcceptance,false);
});
test('failed live gate preserves data and stops owned services without killing apt', t => {
    const f=installFixture(t), exec=f.deps.exec;
    f.deps.exec=(p,a)=> { const r=exec(p,a); return p.endsWith('/node') && a[0].endsWith('/acceptance.cjs') ? {status:1,stdout:'',stderr:''}:r; };
    assert.throws(()=>installPostgresqlHost(f.options,f.deps),/PG_LIVE_DATABASE_GATE_FAILED/);
    assert.equal(fs.existsSync(f.at('/var/lib/nexowatt-eos/postgresql')),true);
    assert.equal(f.commands.some(([p,a])=>a[0]==='start' && a.includes('nexowatt-eos-initialize.service')),false);
    const stopped=f.commands.find(([p,a])=>a[0]==='stop')[1]; assert.ok(stopped.includes('nexowatt-eos-postgresql.service'));
    assert.equal(stopped.includes('nexowatt-eos-os-updates.service'),false);
});
test('failed admission or implicit start performs no command or persistent write', t => {
    const f=installFixture(t);
    assert.throws(()=>installPostgresqlHost({...f.options,start:false},f.deps),/PG_EXPLICIT_START_REQUIRED/);
    assert.throws(()=>installPostgresqlHost(f.options,{...f.deps,preflight:()=>({ready:false})}),/PG_HOST_PREFLIGHT_REJECTED/);
    assert.equal(f.commands.length,0); assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos')),false);
});
test('failed structured target checks are retained before fail-closed cleanup', t => {
    const f=installFixture(t),exec=f.deps.exec;
    f.deps.exec=(p,a)=>{const r=exec(p,a);return p.endsWith('/node')&&a[0].endsWith('/acceptance.cjs')?
        {status:1,stdout:JSON.stringify({kind:'eos-postgresql-target-acceptance',passed:false,checks:[{id:'tls13-objects',status:'fail'}]}),stderr:''}:r;};
    assert.throws(()=>installPostgresqlHost(f.options,f.deps),/PG_LIVE_DATABASE_GATE_FAILED/);
    assert.equal(JSON.parse(fs.readFileSync(f.at('/etc/nexowatt-eos/postgresql-acceptance.json'))).passed,false);
});
test('existing distribution database cluster is never adopted or deleted', t => {
    const f=host(t); const report=f.inspect((p,a)=>p.endsWith('/pg_lsclusters')?{status:0,stdout:'17 main 5432 online postgres /var/lib/postgresql/17/main /log\n'}:goodExec(p,a));
    assert.equal(report.ready,false);assert.equal(report.checks.find(r=>r.id==='no-distribution-clusters').status,'fail');
});

function managedFixture(t) {
    const f = installFixture(t);
    f.options.sequence = 15; f.options.releaseVersion = '0.2.0-test.3'; f.options.expectedNodeVersion = '24.22.1';
    f.write(`${f.options.releasePath}/node-runtime/bin/node`, 'modeled signed Node binary; not executed', 0o755);
    for (const name of ['runtime.json', 'LICENSE']) f.write(`${f.options.releasePath}/node-runtime/${name}`, 'fixture');
    const render = require('../../tools/system/build-bundle.cjs').renderManagedNodeUnit;
    for (const unit of UNITS) {
        const name = `${f.options.releasePath}/system/postgresql-test/systemd/${unit}`;
        f.write(name, render(fs.readFileSync(f.at(name), 'utf8')));
    }
    f.options.setup = { schemaVersion: 1, hosts: ['eos.test'], origin: 'https://eos.test:8443',
        licenseTrustFile: '/root/public-trust.json', licenseTrustSha256: 'c'.repeat(64), trust: {}, trustSha256: 'c'.repeat(64) };
    for (const name of ['runtime/onboarding/main.cjs', 'runtime/onboarding/state.cjs', 'runtime/onboarding/server.cjs',
        'runtime/onboarding/policy.cjs', 'runtime/bootstrap/first-start-configuration.cjs',
        'tools/system/finalize-onboarding.cjs', 'tools/system/prepare-first-start-context.cjs']) f.write(`${f.options.releasePath}/${name}`, '{}');
    f.deps.toolTrust = () => ({ trusted: true });
    const app = `${f.options.releasePath}/app`, specs = product.specsFor(product.SECURITY_REFRESH_TEST);
    assert.equal(specs.find(spec => spec.kind === 'core').version, '7.2.5');
    const dependencies = Object.fromEntries(specs.map(spec => [spec.package, spec.version]));
    const lock = { lockfileVersion: 3, packages: { '': { dependencies } } };
    for (const spec of specs) {
        const directory = `${app}/node_modules/${spec.package}`;
        f.write(`${directory}/package.json`, JSON.stringify({ name: spec.package, version: spec.version, main: spec.main }));
        f.write(`${directory}/io-package.json`, JSON.stringify({ common: { name: spec.package.slice('iobroker.'.length), version: spec.version } }));
        f.write(`${directory}/${spec.main}`, 'fixture');
        lock.packages[`node_modules/${spec.package}`] = { version: spec.version };
    }
    f.write(`${app}/package.json`, JSON.stringify({ dependencies }));
    f.write(`${app}/package-lock.json`, JSON.stringify(lock));
    f.deps.inspectProduct = (directory, scope) => {
        assert.equal(scope, product.SECURITY_REFRESH_TEST);
        return product.inspectApp(directory, scope);
    };
    f.deps.provisionWeb = ({ directory }) => { fs.mkdirSync(directory, { recursive: true }); for (const name of ['admin.key', 'ui.key', 'setup.key']) fs.writeFileSync(path.join(directory, name), 'fixture'); };
    f.deps.provisionSetupWeb = () => {};
    f.deps.prepareOnboarding = () => ({ code: 'fixture-only', expiresAt: '2026-10-22T00:00:00.000Z', setupId: 'd'.repeat(32) });
    f.deps.installOSMaintenance = () => ({ installed: true });
    f.deps.installManagedUpdates = () => { f.commands.push(['fixture-updater-install', []]); };
    const exec = f.deps.exec;
    f.deps.exec = (p, a) => {
        if (p.endsWith('/node') && a[0].endsWith('/prepare-first-start-context.cjs')) f.write('/etc/nexowatt-eos/onboarding.json', '{}');
        return exec(p, a);
    };
    return f;
}
test('fresh managed host installs independent updater and unconfigured network before HTTPS first start', t => {
    const f = managedFixture(t), result = installPostgresqlHost(f.options, f.deps);
    assert.equal(result.phase, 'HTTPS_FIRST_START_READY');
    const update = f.commands.findIndex(([p]) => p === 'fixture-updater-install');
    const network = f.commands.findIndex(([, a]) => a.includes('--install'));
    const setup = f.commands.findIndex(([, a]) => a.includes('nexowatt-eos-setup.target'));
    assert.ok(update >= 0 && network > update && setup > network);
    assert.equal(f.commands.some(([, a]) => a.includes('nexowatt-eos-updates.service')), false, 'updater starts only after finalization');
    const nodeCalls = f.commands.filter(([p]) => p.endsWith('/node'));
    assert.ok(nodeCalls.length >= 2);
    assert.ok(nodeCalls.every(([p]) => p === f.at(`${f.options.releasePath}/node-runtime/bin/node`)));
    const unit = fs.readFileSync(f.at('/etc/systemd/system/nexowatt-eos-controller.service'), 'utf8');
    assert.match(unit, /ExecStart=\/opt\/nexowatt\/eos\/current\/node-runtime\/bin\/node /);
    assert.doesNotMatch(unit, /\/usr\/bin\/node/);
});
for (const version of ['7.2.2', '8.0.0']) test(`fresh managed host rejects coherently declared controller ${version} before commands or host writes`, t => {
    const f = managedFixture(t), app = `${f.options.releasePath}/app`, name = 'iobroker.js-controller';
    const update = (relative, change) => {
        const value = JSON.parse(fs.readFileSync(f.at(`${app}/${relative}`), 'utf8'));
        change(value); f.write(`${app}/${relative}`, JSON.stringify(value));
    };
    update('package.json', value => { value.dependencies[name] = version; });
    update('package-lock.json', value => {
        value.packages[''].dependencies[name] = version;
        value.packages[`node_modules/${name}`].version = version;
    });
    update(`node_modules/${name}/package.json`, value => { value.version = version; });
    update(`node_modules/${name}/io-package.json`, value => { value.common.version = version; });
    assert.throws(() => installPostgresqlHost(f.options, f.deps), { code: 'PRODUCT_LOCK_SCOPE' });
    assert.equal(f.commands.length, 0);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos')), false);
    assert.equal(fs.existsSync(f.at('/var/lib/nexowatt-eos')), false);
});
test('fresh managed host rejects installed controller identity inconsistent with the 7.2.5 lock before mutation', t => {
    const f = managedFixture(t);
    f.write(`${f.options.releasePath}/app/node_modules/iobroker.js-controller/package.json`,
        JSON.stringify({ name: 'iobroker.js-controller', version: '7.2.2', main: 'controller.js' }));
    assert.throws(() => installPostgresqlHost(f.options, f.deps), { code: 'PRODUCT_PACKAGE_IDENTITY' });
    assert.equal(f.commands.length, 0);
    assert.equal(fs.existsSync(f.at('/etc/nexowatt-eos')), false);
    assert.equal(fs.existsSync(f.at('/var/lib/nexowatt-eos')), false);
});
test('missing network tools abort fresh managed host before changes; later failure disables addon boot scheduling', t => {
    const a = managedFixture(t); a.deps.toolTrust = () => ({ trusted: false });
    assert.throws(() => installPostgresqlHost(a.options, a.deps), /PG_MANAGED_HOST_TOOLS_REQUIRED/); assert.equal(a.commands.length, 0);
    const f = managedFixture(t), exec = f.deps.exec;
    f.deps.exec = (p, args) => { const r = exec(p, args); return args.includes('--install') ? { status: 1, stdout: '' } : r; };
    assert.throws(() => installPostgresqlHost(f.options, f.deps), /PG_HOST_COMMAND_FAILED/);
    for (const action of ['disable', 'stop']) {
        const args = f.commands.find(([p, a]) => p.endsWith('/systemctl') && a[0] === action)[1];
        for (const unit of ['nexowatt-eos-updates.service', 'nexowatt-eos-network.service', 'nexowatt-eos-network-guard.timer']) assert.ok(args.includes(unit));
    }
});
