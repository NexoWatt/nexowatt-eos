'use strict';
// Test against the actual assembled controller/loader dependency resolution, not
// a mock of transformSync. The TS syntax stripper is disabled to prove the hook.
const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const cp = require('node:child_process'); const http = require('node:http'); const { createRequire } = require('node:module');
const policy = require('../../tools/integration/runtime-dependency-policy.cjs');
const app = process.env.EOS_TEST_DEPENDENCY_APP;
if (!app || !path.isAbsolute(app)) throw Error('EOS_TEST_DEPENDENCY_APP must name the assembled application root');
const verified = policy.verifyInstalledTree(app);
const request = createRequire(path.join(app, verified.resolution.controller));
const register = request.resolve('@alcalzone/esbuild-register');
const esbuild = createRequire(register)('esbuild');
const tools = request('@iobroker/js-controller-common-db').tools;
function temporary(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eos-loader-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; }
function execute(dir, file) {
    const env = { PATH: process.env.PATH };
    return cp.spawnSync(process.execPath, ['--no-experimental-strip-types', '-r', register, path.join(dir, file)], {
        cwd: dir, encoding: 'utf8', timeout: 5000, maxBuffer: 65536, env, shell: false,
    });
}
test('actual controller resolves reviewed loader and native esbuild without install hooks', () => {
    assert.equal(verified.controller, '7.2.2'); assert.equal(verified.loader, '2.5.1-1'); assert.equal(esbuild.version, '0.28.2');
    assert.deepEqual(tools.getDefaultNodeArgs('/tmp/nonexistent-contract-fixture.ts'), ['-r', '@alcalzone/esbuild-register']);
    assert.deepEqual(tools.getDefaultNodeArgs('/tmp/nonexistent-contract-fixture.js'), []);
});
test('controller require hook compiles TS interface/enum/CommonJS with native stripping disabled', t => {
    const dir = temporary(t); fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
    fs.writeFileSync(path.join(dir, 'main.ts'), 'interface Reading { watts: number }; enum Mode { Safe = 7 }; const data: Reading = { watts: 321 }; console.log(JSON.stringify([data.watts,Mode.Safe]));');
    const result = execute(dir, 'main.ts'); assert.equal(result.status, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), [321, 7]);
});
test('JSX and TSX tsconfig factory still execute through actual loader', t => {
    const dir = temporary(t); fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ type: 'commonjs' }));
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { jsxFactory: 'h' } }));
    for (const [file, input, expected] of [
        ['main.jsx', 'const h=(tag,props,...children)=>({tag,children}); console.log(JSON.stringify(<meter>valid</meter>));', { tag: 'meter', children: ['valid'] }],
        ['main.tsx', 'const h=(tag: string,props:unknown,...children:unknown[])=>({tag,children});const value:number=4;console.log(JSON.stringify(<meter>{value}</meter>));', { tag: 'meter', children: [4] }],
    ]) { fs.writeFileSync(path.join(dir, file), input); const result = execute(dir, file); assert.equal(result.status, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout), expected); }
});
test('invalid TypeScript is rejected instead of being silently executed', t => {
    const dir = temporary(t); fs.writeFileSync(path.join(dir, 'bad.ts'), 'const value: = ;');
    const result = execute(dir, 'bad.ts'); assert.notEqual(result.status, 0); assert.match(result.stderr, /Transform failed|Expected/);
});
test('source-map support keeps original TypeScript source location', t => {
    const dir = temporary(t); fs.writeFileSync(path.join(dir, 'error.ts'), 'const value: number = 1;\nfunction fail(): never {\n throw new Error("EOS_PUBLIC_FIXTURE");\n}\nfail();\n');
    const result = execute(dir, 'error.ts'); assert.notEqual(result.status, 0); assert.match(result.stderr, /error\.ts:3:/);
});
test('patched development server does not grant arbitrary web origins and rejects unknown Host', async t => {
    const dir = temporary(t); fs.writeFileSync(path.join(dir, 'fixture.js'), 'console.log("eos public test fixture");');
    const context = await esbuild.context({ entryPoints: [path.join(dir, 'fixture.js')], outfile: path.join(dir, 'out.js') });
    t.after(() => context.dispose()); const server = await context.serve({ host: '127.0.0.1', port: 0, servedir: dir });
    const read = headers => new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port: server.port, path: '/out.js', headers, timeout: 2000 }, response => {
            response.resume(); response.once('end', () => resolve({ status: response.statusCode, headers: response.headers }));
        }); req.once('timeout', () => req.destroy(Error('local test deadline'))); req.once('error', reject);
    });
    assert.equal((await read({})).status, 200);
    assert.equal((await read({ Origin: 'http://attacker.invalid' })).headers['access-control-allow-origin'], undefined);
    assert.equal((await read({ Host: 'attacker.invalid' })).status, 403);
});
