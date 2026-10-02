#!/usr/bin/env node
'use strict';

/*
 * Isolated fallback emitter for the security change when npm dependencies and
 * tsc are unavailable. NOT the release build and NOT a TypeScript type checker.
 * Node >=24 transforms TypeScript; a locally installed Playwright Babel bundle
 * emits CommonJS with noInterop:true to match this repository's tsc imports.
 * Nothing from this development helper is needed by the adapter at runtime.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { Module, stripTypeScriptTypes } = require('node:module');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const INPUTS = ['src/main.ts', 'src/lib/web.ts', 'src/lib/eosRequestSecurity.ts', 'src/lib/eosAutoUpdate.ts'];

function locateBundle() {
    const override = process.env.NEXOWATT_BABEL_BUNDLE;
    const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
    const candidates = [override, runtimeModules && path.join(runtimeModules, 'playwright/lib/transform/babelBundle.js')].filter(Boolean);
    for (const candidate of candidates) if (fs.existsSync(candidate)) return path.resolve(candidate);
    throw new Error('Local Babel bundle unavailable. Use normal npm ci/build, or set NEXOWATT_BABEL_BUNDLE to an installed Playwright babelBundle.js.');
}

function loadCommonJSTransformer(bundlePath) {
    const source = fs.readFileSync(bundlePath, 'utf8');
    const match = /\/\/ node_modules\/@babel\/plugin-transform-modules-commonjs\/lib\/index\.js\r?\nvar (require_[A-Za-z0-9_]+) =/.exec(source);
    if (!match || !source.includes('function babelTransformOptions(') || !source.includes('var babel = ')) {
        throw new Error('Unrecognized Babel bundle structure; refusing fallback emission.');
    }
    // This in-memory extension exposes the existing bundled compiler. The
    // installed bundle is never modified; input ASTs and source are not evaluated.
    const extension = `\nmodule.exports.nexowattCommonJS = function(code, filename, sourceFileName) {
        const opts = babelTransformOptions(false, false, [], []);
        const commonjs = ${match[1]}();
        let count = 0;
        opts.plugins = opts.plugins.map(function(entry) {
            if (Array.isArray(entry) && entry[0] === commonjs) {
                count++;
                return [entry[0], Object.assign({}, entry[1] || {}, { noInterop: true })];
            }
            return entry;
        });
        if (count !== 1) throw new Error('Cannot establish CommonJS noInterop policy');
        opts.sourceMaps = true;
        opts.filename = filename;
        opts.sourceFileName = sourceFileName;
        return babel.transform(code, opts);
    };\n`;
    const compiled = new Module(bundlePath, module);
    compiled.filename = bundlePath;
    compiled.paths = Module._nodeModulePaths(path.dirname(bundlePath));
    compiled._compile(source + extension, bundlePath);
    return { transform: compiled.exports.nexowattCommonJS, bundleSha256: hash(source) };
}

function transpile(source, inputPath, outputPath, transformer) {
    if (typeof stripTypeScriptTypes !== 'function' || Number(process.versions.node.split('.')[0]) < 24) {
        throw new Error('Fallback emission requires Node >=24 with stripTypeScriptTypes');
    }
    // Node's transformer keeps modern JS/class fields. Babel only converts module
    // syntax. Explicit type imports are required; semantic checking stays open.
    const relativeSource = path.relative(path.dirname(outputPath), inputPath).split(path.sep).join('/');
    const stripped = stripTypeScriptTypes(source, { mode: 'transform', sourceMap: true, sourceUrl: relativeSource });
    const result = transformer.transform(stripped, inputPath.replace(/\.ts$/, '.js'), relativeSource);
    if (!result || !result.map) throw new Error('Compiler did not return source map');
    const code = result.code.replace(/\n?\/\/[#@] sourceMappingURL=.*$/gm, '') + `\n//# sourceMappingURL=${path.basename(outputPath)}.map\n`;
    new vm.Script(code, { filename: outputPath });
    if (result.map.sources.length !== 1 || result.map.sources[0] !== relativeSource) {
        throw new Error('Unexpected source-map chain');
    }
    const map = { ...result.map, file: path.basename(outputPath), sourcesContent: [source] };
    return { code, map };
}

function run(options = {}) {
    const root = options.root || path.resolve(__dirname, '..');
    const write = Boolean(options.write);
    const bundlePath = options.bundlePath || locateBundle();
    const transformer = loadCommonJSTransformer(bundlePath);
    const outputs = [];
    for (const input of INPUTS) {
        const inputPath = path.join(root, input);
        const output = input.replace(/^src\//, 'build/').replace(/\.ts$/, '.js');
        const outputPath = path.join(root, output);
        const source = fs.readFileSync(inputPath, 'utf8');
        const result = transpile(source, inputPath, outputPath, transformer);
        const map = `${JSON.stringify(result.map)}\n`;
        outputs.push({ input, inputSha256: hash(source), output, outputSha256: hash(result.code), mapSha256: hash(map), code: result.code, map });
    }
    const securityInputs = fs.readdirSync(path.join(root, 'src/lib')).filter(name => /^eos[A-Za-z0-9]+\.js$/.test(name)).sort();
    for (const name of securityInputs) {
        const input = `src/lib/${name}`;
        const code = fs.readFileSync(path.join(root, input), 'utf8');
        new vm.Script(code, { filename: input });
        outputs.push({ input, inputSha256: hash(code), output: `build/lib/${name}`, outputSha256: hash(code), code });
    }
    const report = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        mode: write ? 'fallback-emitted' : 'dry-run-only',
        node: process.version,
        compiler: 'Node stripTypeScriptTypes transform + local Playwright Babel CommonJS noInterop',
        babelBundleSha256: transformer.bundleSha256,
        limitations: ['No TypeScript semantic type checking', 'No npm dependency installation', 'No full frontend/backend release build', 'No ioBroker integration or device test', 'Local fallback does not establish equivalence with a complete tsc build'],
        outputs: outputs.map(({ code, map, ...metadata }) => metadata),
    };
    if (write) {
        // Prepare/parse every output first; failed compilation never writes a
        // partial batch. Atomic rename protects each individual output file.
        for (const output of outputs) {
            const destination = path.join(root, output.output);
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            const temporary = `${destination}.tmp-${process.pid}`;
            fs.writeFileSync(temporary, output.code);
            fs.renameSync(temporary, destination);
            if (output.map) {
                fs.writeFileSync(`${temporary}.map`, output.map);
                fs.renameSync(`${temporary}.map`, `${destination}.map`);
            }
        }
        const reportDirectory = path.join(root, 'reports/security');
        fs.mkdirSync(reportDirectory, { recursive: true });
        fs.writeFileSync(path.join(reportDirectory, 'fallback-build-provenance.json'), `${JSON.stringify(report, null, 2)}\n`);
    }
    return report;
}

if (require.main === module) {
    const unknown = process.argv.slice(2).filter(arg => arg !== '--write');
    if (unknown.length) { console.error('Usage: node tools/nexowatt-transpile-security-backend.cjs [--write]'); process.exitCode = 1; }
    else {
        try {
            const report = run({ write: process.argv.includes('--write') });
            console.log(`${report.mode}: ${report.outputs.length} scoped outputs; CommonJS noInterop; Node ${report.node}`);
            console.log('Full TypeScript check, normal build and live integration remain open.');
        } catch (error) { console.error(`Fallback emit failed: ${error.message}`); process.exitCode = 1; }
    }
}

module.exports = { loadCommonJSTransformer, run, transpile };
