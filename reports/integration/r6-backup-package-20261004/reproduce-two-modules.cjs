'use strict';
// Manufacturer-only reproduction; no lifecycle scripts and no source-tree writes.
// Usage: node reproduce-two-modules.cjs /absolute/typescript-package /absolute/fresh-output
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../../..');
const component = path.join(repo, 'components/backitup');
const [compiler, output] = process.argv.slice(2);
if (process.argv.length !== 4 || !path.isAbsolute(compiler || '') || !path.isAbsolute(output || '')) throw new Error('ABSOLUTE_COMPILER_AND_OUTPUT_REQUIRED');
const ts = require(path.join(compiler, 'lib/typescript.js'));
const lock = JSON.parse(fs.readFileSync(path.join(component, 'package-lock.json'))).packages['node_modules/typescript'];
if (ts.version !== lock.version || ts.version !== '6.0.3') throw new Error('LOCKED_COMPILER_REQUIRED');
const config = ts.readConfigFile(path.join(component, 'tsconfig.build.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, component);
if (config.error || parsed.errors.length) throw new Error('INVALID_TYPESCRIPT_CONFIG');
fs.mkdirSync(output, { recursive: false });
const hashes = [];
for (const name of ['sdCard', 'influxDbCli']) {
    const sourcePath = path.join(component, 'src/lib', name + '.ts');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: parsed.options, fileName: sourcePath, reportDiagnostics: true });
    if (compiled.diagnostics?.some(row => row.category === ts.DiagnosticCategory.Error)) throw new Error('COMPILER_DIAGNOSTIC');
    // The release deliberately excludes source maps; omit only the compiler's
    // final, otherwise dangling sourceMappingURL. All executable bytes stay intact.
    const mapReference = `//# sourceMappingURL=${name}.js.map`;
    if (!compiled.outputText.endsWith(mapReference)) throw new Error('EXPECTED_SOURCE_MAP_REFERENCE');
    const bytes = Buffer.from(compiled.outputText.slice(0, -mapReference.length));
    fs.writeFileSync(path.join(output, name + '.js'), bytes, { flag: 'wx' });
    hashes.push({ source: 'src/lib/' + name + '.ts', sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
        output: 'build/lib/' + name + '.js', bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
process.stdout.write(JSON.stringify({ compilerVersion: ts.version, compilerOptions: parsed.options,
    method: 'TypeScript transpileModule with actual tsconfig.build.json; omit final excluded sourcemap reference; no whole-project semantic typecheck', outputs: hashes }, null, 2) + '\n');
